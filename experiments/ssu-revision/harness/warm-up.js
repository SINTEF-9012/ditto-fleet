// Warms up a freshly restarted Ditto platform before a campaign measures it: the first requests after a
// restart are several times slower. Exercises the experiments' request types (twin creation, paged
// search with field selection, count, desired-state writes and deletions, merge patches and reads of
// reported state) on temporary twins, then deletes them.
import { parseArgs } from "node:util";
import { NAMESPACE, NEW_VERSION, OLD_VERSION, ditto, dittoRetrying, pool, thingId, waitForCount } from "./lib/ditto.js";

const { values: args } = parseArgs({
  options: {
    twins: { type: "string", default: "50" },
    rounds: { type: "string", default: "10" },
    concurrency: { type: "string", default: "10" },
  },
});

const FILTER = "eq(attributes/warmup,true)";
const FEATURE = "features/softwareManagement";
const ids = Array.from({ length: Number(args.twins) }, (_, i) => thingId("warmup-", i + 1, 3));
const concurrency = Number(args.concurrency);

function expectOk(response, what) {
  if (!response.ok) throw new Error(`${what} failed: HTTP ${response.status} ${response.text}`);
}

const started = Date.now();
await pool(ids, concurrency, async (id) => {
  const twin = {
    policyId: `${NAMESPACE}:policy`,
    attributes: { type: "virtual_device", warmup: true },
    features: { softwareManagement: { properties: { packages: { openssl: { version: OLD_VERSION } } } } },
  };
  expectOk(await dittoRetrying("PUT", `/api/2/things/${id}`, { body: twin }), `creating ${id}`);
});
await waitForCount(FILTER, ids.length);

for (let round = 1; round <= Number(args.rounds); round += 1) {
  const workflowId = `wf-warmup-${round}`;
  let cursor;
  do {
    const option = cursor ? `size(20),cursor(${cursor})` : "size(20)";
    const response = await ditto(
      "GET",
      `/api/2/search/things?filter=${encodeURIComponent(FILTER)}&option=${encodeURIComponent(option)}` +
        `&fields=${encodeURIComponent(`thingId,${FEATURE}`)}`,
    );
    expectOk(response, "search");
    cursor = JSON.parse(response.text).cursor;
  } while (cursor);
  expectOk(await ditto("GET", `/api/2/search/things/count?filter=${encodeURIComponent(FILTER)}`), "count");

  await pool(ids, concurrency, async (id) => {
    expectOk(
      await ditto("PUT", `/api/2/things/${id}/${FEATURE}/desiredProperties/packages/openssl`, {
        body: { version: NEW_VERSION, workflowId },
      }),
      `desired-state write to ${id}`,
    );
    expectOk(
      await ditto("PATCH", `/api/2/things/${id}`, {
        contentType: "application/merge-patch+json",
        body: { features: { softwareManagement: { properties: { packages: { openssl: { installationStatus: "installed", workflowId } } } } } },
      }),
      `merge patch of ${id}`,
    );
    expectOk(await ditto("GET", `/api/2/things/${id}?fields=${encodeURIComponent(`thingId,attributes,${FEATURE}`)}`), `read of ${id}`);
    expectOk(await ditto("DELETE", `/api/2/things/${id}/${FEATURE}/desiredProperties`), `desired-state deletion of ${id}`);
  });
}

await pool(ids, concurrency, async (id) => {
  const response = await dittoRetrying("DELETE", `/api/2/things/${id}`);
  if (!response.ok && response.status !== 404) throw new Error(`deleting ${id} failed: HTTP ${response.status}`);
});
await waitForCount(FILTER, 0);
console.log(`platform warmed up: ${args.rounds} rounds over ${ids.length} temporary twins in ${Date.now() - started} ms`);
