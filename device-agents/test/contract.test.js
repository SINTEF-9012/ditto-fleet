import { test } from "node:test";
import assert from "node:assert/strict";
import {
  Stage,
  buildStatus,
  debsOf,
  desiredPackages,
  downstreamTopic,
  parseStatus,
  statusTopic,
} from "../src/contract.js";

const THING_ID = "no.sintef.sct.giot:gw1";

test("derives per-device topics", () => {
  assert.equal(
    downstreamTopic(THING_ID),
    "no.sintef.sct.giot.things/downstream/no.sintef.sct.giot:gw1",
  );
  assert.equal(
    statusTopic(THING_ID, "lab"),
    "lab/software-status/no.sintef.sct.giot:gw1",
  );
});

test("reads desired packages from a partial twin", () => {
  const desired = { version: "3.0.14-1~deb12u2", debs: ["openssl", "libssl3"] };
  const thing = {
    thingId: THING_ID,
    features: { softwareManagement: { desiredProperties: { packages: { openssl: desired } } } },
  };
  assert.deepEqual(desiredPackages(thing), { openssl: desired });
  assert.deepEqual(desiredPackages({ thingId: THING_ID }), {});
  assert.deepEqual(debsOf("openssl", desired), ["openssl", "libssl3"]);
  assert.deepEqual(debsOf("curl", {}), ["curl"]);
});

test("status messages round-trip as twin fragments", () => {
  const desired = { version: "3.0.14-1~deb12u2", workflowId: "wf-1" };
  const message = buildStatus({
    thingId: THING_ID,
    packageName: "openssl",
    stage: Stage.INSTALLATION,
    workflowId: "wf-1",
    desired,
    reported: { installationStatus: "installed", version: "3.0.14-1~deb12u2" },
    timing: { startedAt: 1 },
  });
  const status = parseStatus(JSON.parse(JSON.stringify(message)));
  assert.equal(status.thingId, THING_ID);
  assert.equal(status.stage, "installation");
  assert.equal(status.packageName, "openssl");
  assert.equal(status.reported.installationStatus, "installed");
  assert.deepEqual(status.desired, desired);
});

test("rejects status messages that do not name exactly one package", () => {
  assert.equal(parseStatus({}), null);
  assert.equal(
    parseStatus({
      thingId: THING_ID,
      stage: "installation",
      features: { softwareManagement: { properties: { packages: { a: {}, b: {} } } } },
    }),
    null,
  );
});
