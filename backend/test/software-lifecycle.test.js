import { test } from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import {
  desiredChangesFromEvent,
  isConverged,
  isTerminalFailure,
  ownedFields,
  startSoftwareLifecycle,
} from "../src/software-lifecycle.js";

const THING = "no.sintef.sct.giot:gw1";
const OLD = "3.0.11-1~deb12u2";
const NEW = "3.0.14-1~deb12u2";
const STATUS_TOPIC = `no.sintef.sct.giot.things/software-status/${THING}`;
const silent = { info() {}, warn() {}, error() {} };

// Shape of a frame received from Ditto 3.9.7 with extraFields=attributes/type.
const DESIRED_EVENT = {
  topic: "no.sintef.sct.giot/gw1/things/twin/events/modified",
  headers: { "correlation-id": "wf-1", "entity-revision": 4 },
  path: "/features/softwareManagement/desiredProperties/packages/openssl",
  value: { version: NEW, workflowId: "wf-1" },
  extra: { attributes: { type: "physical_device" } },
  revision: 4,
  timestamp: "2026-09-13T15:48:22.591092696Z",
};

test("recognises desired software changes in Ditto events", () => {
  assert.deepEqual(desiredChangesFromEvent(DESIRED_EVENT), {
    thingId: THING,
    action: "modified",
    packageNames: ["openssl"],
    revision: 4,
    eventTimestamp: DESIRED_EVENT.timestamp,
    correlationId: "wf-1",
  });

  const created = {
    topic: "no.sintef.sct.giot/gw1/things/twin/events/created",
    path: "/",
    value: { features: { softwareManagement: { desiredProperties: { packages: { openssl: {}, curl: {} } } } } },
  };
  assert.deepEqual(desiredChangesFromEvent(created).packageNames, ["openssl", "curl"]);

  const statusPatch = {
    topic: "no.sintef.sct.giot/gw1/things/twin/events/merged",
    path: "/",
    value: { features: { softwareManagement: { properties: { packages: { openssl: { installationStatus: "installed" } } } } } },
  };
  assert.equal(desiredChangesFromEvent(statusPatch), null);
  assert.equal(
    desiredChangesFromEvent({ ...DESIRED_EVENT, topic: "no.sintef.sct.giot/gw1/things/twin/events/deleted" }),
    null,
  );
  assert.equal(
    desiredChangesFromEvent({ ...DESIRED_EVENT, path: "/features/softwareManagement/properties/packages/openssl" }),
    null,
  );
});

test("stages can only write the reported fields they own", () => {
  assert.deepEqual(
    ownedFields("installation", { version: NEW, installationStatus: "installed", verificationStatus: "passed" }),
    { version: NEW, installationStatus: "installed" },
  );
  assert.deepEqual(
    ownedFields("installation", { installationStatus: "installing", verificationStatus: "pending" }),
    { installationStatus: "installing", verificationStatus: "pending" },
  );
  assert.deepEqual(ownedFields("verification", { verificationStatus: "passed", version: "9.9" }), {
    verificationStatus: "passed",
  });
  assert.deepEqual(ownedFields("monitoring", { monitoredVersion: OLD, installationStatus: "installed" }), {
    monitoredVersion: OLD,
  });
  assert.deepEqual(ownedFields("unknown", { version: NEW }), {});
});

test("convergence requires the desired version, installed and verified, for the current workflow", () => {
  const desired = { version: NEW, workflowId: "wf-2" };
  const done = { version: NEW, installationStatus: "installed", verificationStatus: "passed", workflowId: "wf-2" };
  assert.ok(isConverged(desired, done));
  assert.ok(!isConverged(desired, { ...done, verificationStatus: "pending" }));
  assert.ok(!isConverged(desired, { ...done, workflowId: "wf-1" }));
  assert.ok(!isConverged(desired, { ...done, version: OLD }));
  assert.ok(isTerminalFailure(desired, { ...done, installationStatus: "failed" }));
  assert.ok(!isTerminalFailure(desired, { ...done, installationStatus: "failed", workflowId: "wf-1" }));
});

function fakeMqtt({ ackDelayMs = 0 } = {}) {
  const client = new EventEmitter();
  client.connected = true;
  client.published = [];
  client.subscribe = () => {};
  client.publish = (topic, payload, options, callback) => {
    client.published.push({ topic, message: JSON.parse(payload), at: Date.now() });
    if (ackDelayMs > 0) setTimeout(() => callback?.(), ackDelayMs);
    else callback?.();
  };
  return client;
}

function fakeDitto(twin) {
  const patches = [];
  let slowFirstPatch = true;
  const fetchImpl = async (url, init = {}) => {
    const method = init.method ?? "GET";
    if (method === "GET") {
      return { ok: true, status: 200, text: async () => JSON.stringify(twin) };
    }
    if (method === "PATCH") {
      if (slowFirstPatch) {
        slowFirstPatch = false;
        await new Promise((resolve) => setTimeout(resolve, 30));
      }
      patches.push({ url, body: JSON.parse(init.body), correlationId: init.headers["correlation-id"] });
      return { ok: true, status: 204, text: async () => "" };
    }
    return { ok: false, status: 405, text: async () => "" };
  };
  return { fetchImpl, patches };
}

function twinWanting(workflowId) {
  return {
    thingId: THING,
    attributes: { type: "physical_device" },
    features: {
      softwareManagement: {
        desiredProperties: { packages: { openssl: { version: NEW, workflowId } } },
        properties: { packages: { openssl: { version: OLD } } },
      },
    },
  };
}

function statusPayload(stage, reported, workflowId = "wf-1", thingId = THING) {
  return Buffer.from(
    JSON.stringify({
      thingId,
      stage,
      workflowId,
      features: {
        softwareManagement: {
          desiredProperties: { packages: { openssl: { version: NEW, workflowId } } },
          properties: { packages: { openssl: reported } },
        },
      },
    }),
  );
}

test("dispatches the changed twin and applies device statuses in order until convergence", async () => {
  const twin = twinWanting("wf-1");
  const mqttClient = fakeMqtt();
  const ditto = fakeDitto(twin);
  const events = [];
  const lifecycle = startSoftwareLifecycle({
    dittoUrl: "http://ditto",
    wsUrl: null,
    mqttClient,
    fetchImpl: ditto.fetchImpl,
    eventLog: (entry) => events.push(entry),
    logger: silent,
  });

  await lifecycle.handleEventFrame(DESIRED_EVENT);
  assert.equal(mqttClient.published.length, 1);
  assert.equal(mqttClient.published[0].topic, `no.sintef.sct.giot.things/downstream/${THING}`);
  assert.deepEqual(mqttClient.published[0].message, twin);

  await Promise.all([
    lifecycle.handleStatusMessage(
      STATUS_TOPIC,
      statusPayload("installation", { installationStatus: "installing", verificationStatus: "pending", workflowId: "wf-1" }),
    ),
    lifecycle.handleStatusMessage(
      STATUS_TOPIC,
      statusPayload("installation", { version: NEW, installationStatus: "installed", workflowId: "wf-1" }),
    ),
    lifecycle.handleStatusMessage(STATUS_TOPIC, statusPayload("verification", { verificationStatus: "passed" })),
  ]);

  const applied = ditto.patches.map((p) => p.body.features.softwareManagement.properties.packages.openssl);
  assert.deepEqual(
    applied.map((fields) => fields.installationStatus ?? fields.verificationStatus),
    ["installing", "installed", "passed"],
  );
  assert.ok(ditto.patches.every((p) => p.correlationId === "wf-1"));
  assert.deepEqual(
    events.filter((e) => e.event === "status_applied").map((e) => e.detail.status),
    ["installing", "installed", "passed"],
  );
  assert.equal(events.filter((e) => e.event === "converged").length, 1);
  lifecycle.close();
});

test("timestamps a dispatch at hand-off and accepts statuses that arrive before the broker's PUBACK", async () => {
  const twin = twinWanting("wf-1");
  const mqttClient = fakeMqtt({ ackDelayMs: 40 });
  const ditto = fakeDitto(twin);
  const events = [];
  const lifecycle = startSoftwareLifecycle({
    dittoUrl: "http://ditto",
    wsUrl: null,
    mqttClient,
    fetchImpl: ditto.fetchImpl,
    eventLog: (entry) => events.push({ ts: Date.now(), ...entry }),
    logger: silent,
  });

  await lifecycle.handleEventFrame(DESIRED_EVENT);
  twin.features.softwareManagement.desiredProperties.packages.openssl.workflowId = "wf-2";
  const dispatching = lifecycle.handleEventFrame({ ...DESIRED_EVENT, headers: { "correlation-id": "wf-2" } });
  while (mqttClient.published.length < 2) await new Promise((resolve) => setTimeout(resolve, 1));
  await lifecycle.handleStatusMessage(
    STATUS_TOPIC,
    statusPayload("installation", { installationStatus: "installing", verificationStatus: "pending", workflowId: "wf-2" }, "wf-2"),
  );
  await dispatching;

  assert.equal(events.filter((e) => e.event === "status_stale").length, 0);
  assert.deepEqual(ditto.patches.map((p) => p.correlationId), ["wf-2"]);
  const dispatched = events.find((e) => e.event === "dispatched" && e.workflowId === "wf-2");
  assert.ok(dispatched.ts <= mqttClient.published[1].at);
  assert.ok(dispatched.detail.pubackMs >= 30);
  lifecycle.close();
});

test("ignores statuses from superseded workflows and statuses published for another device", async () => {
  const mqttClient = fakeMqtt();
  const ditto = fakeDitto(twinWanting("wf-2"));
  const events = [];
  const lifecycle = startSoftwareLifecycle({
    dittoUrl: "http://ditto",
    wsUrl: null,
    mqttClient,
    fetchImpl: ditto.fetchImpl,
    eventLog: (entry) => events.push(entry),
    logger: silent,
  });

  await lifecycle.handleEventFrame({ ...DESIRED_EVENT, headers: { "correlation-id": "wf-2" } });
  await lifecycle.handleStatusMessage(STATUS_TOPIC, statusPayload("verification", { verificationStatus: "passed" }, "wf-1"));
  await lifecycle.handleStatusMessage(
    STATUS_TOPIC,
    statusPayload("installation", { installationStatus: "installed", version: NEW }, "wf-2", "no.sintef.sct.giot:other"),
  );

  assert.equal(ditto.patches.length, 0);
  assert.equal(events.filter((e) => e.event === "status_stale").length, 1);
  lifecycle.close();
});
