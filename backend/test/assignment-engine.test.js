import { test } from "node:test";
import assert from "node:assert/strict";
import { assign, selectTargets } from "../src/assignment-engine.js";

const FIXED = "3.0.14-1~deb12u2";

function twin(name, reported, desired) {
  const feature = { properties: { packages: { openssl: { version: reported } } } };
  if (desired) feature.desiredProperties = { packages: { openssl: { version: desired } } };
  return { thingId: `ns:${name}`, features: { softwareManagement: feature } };
}

function reply(status, body) {
  return {
    ok: status < 300,
    status,
    json: async () => body,
    text: async () => (body === undefined ? "" : JSON.stringify(body)),
  };
}

test("targets only devices below the fixed version that are not yet assigned", () => {
  const items = [
    twin("a", "3.0.9-1"),
    twin("b", FIXED),
    twin("c", "3.0.11-1~deb12u2", FIXED),
    twin("d", "3.0.15-1~deb12u1"),
  ];
  const { targets, upToDate, alreadyAssigned } = selectTargets(items, "openssl", FIXED);
  assert.deepEqual(targets, ["ns:a"]);
  assert.equal(upToDate, 2);
  assert.equal(alreadyAssigned, 1);
});

test("pages through search results and writes desired state with the workflow as correlation id", async () => {
  const pages = [
    { items: [twin("a", "3.0.9-1"), twin("b", FIXED)], cursor: "page-2" },
    { items: [twin("d", "3.0.11-1~deb12u2")] },
  ];
  const requests = [];
  const fetchImpl = async (url, init = {}) => {
    requests.push({ url, init });
    if (url.includes("/search/things")) {
      return reply(200, url.includes("cursor") ? pages[1] : pages[0]);
    }
    return reply(204);
  };

  const result = await assign({
    dittoUrl: "http://ditto",
    packageName: "openssl",
    fixedVersion: FIXED,
    debs: ["openssl", "libssl3"],
    metadata: { cveIds: ["CVE-2024-4603"], version: "ignored" },
    workflowId: "wf-test",
    fetchImpl,
  });

  assert.equal(result.candidates, 3);
  assert.equal(result.targets, 2);
  assert.equal(result.failures, 0);
  const searches = requests.filter((r) => r.url.includes("/search/things"));
  assert.equal(searches.length, 2);
  assert.match(decodeURIComponent(searches[1].url), /cursor\(page-2\)/);

  const puts = requests.filter((r) => r.init.method === "PUT");
  assert.deepEqual(
    puts.map((r) => r.url).sort(),
    [
      "http://ditto/api/2/things/ns:a/features/softwareManagement/desiredProperties/packages/openssl",
      "http://ditto/api/2/things/ns:d/features/softwareManagement/desiredProperties/packages/openssl",
    ],
  );
  assert.equal(puts[0].init.headers["correlation-id"], "wf-test");
  const desired = JSON.parse(puts[0].init.body);
  assert.equal(desired.version, FIXED);
  assert.deepEqual(desired.debs, ["openssl", "libssl3"]);
  assert.equal(desired.workflowId, "wf-test");
  assert.deepEqual(desired.cveIds, ["CVE-2024-4603"]);
});

test("never exceeds the configured write concurrency", async () => {
  const items = Array.from({ length: 20 }, (_, i) => twin(`d${i}`, "3.0.11-1~deb12u2"));
  let inFlight = 0;
  let maxInFlight = 0;
  const fetchImpl = async (url, init = {}) => {
    if (url.includes("/search/things")) return reply(200, { items });
    inFlight += 1;
    maxInFlight = Math.max(maxInFlight, inFlight);
    await new Promise((resolve) => setTimeout(resolve, 5));
    inFlight -= 1;
    return reply(init.method === "PUT" ? 204 : 500);
  };

  const result = await assign({
    dittoUrl: "http://ditto",
    packageName: "openssl",
    fixedVersion: FIXED,
    concurrency: 3,
    fetchImpl,
  });

  assert.equal(result.targets, 20);
  assert.equal(result.writes.length, 20);
  assert.ok(maxInFlight <= 3, `max in flight was ${maxInFlight}`);
});
