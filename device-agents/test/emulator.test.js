import { test } from "node:test";
import assert from "node:assert/strict";
import { createVirtualDevice, mulberry32, sampleDelay } from "../src/emulator.js";

const THING_ID = "no.sintef.sct.giot:emu-0001";
const OLD = "3.0.11-1~deb12u2";
const NEW = "3.0.14-1~deb12u2";
const silent = { info() {}, warn() {}, error() {} };

const twin = {
  thingId: THING_ID,
  features: {
    softwareManagement: {
      desiredProperties: {
        packages: { openssl: { version: NEW, debs: ["openssl", "libssl3"], workflowId: "wf-1" } },
      },
    },
  },
};

function device(profileOverrides = {}) {
  const published = [];
  const truth = [];
  const profile = {
    install: { type: "fixed", ms: 0 },
    verify: { type: "fixed", ms: 0 },
    installFailureRate: 0,
    verifyFailureRate: 0,
    initialVersions: { openssl: OLD, libssl3: OLD },
    monitoredPackages: ["openssl"],
    ...profileOverrides,
  };
  const virtual = createVirtualDevice({
    thingId: THING_ID,
    profile,
    rng: mulberry32(7),
    sleep: async () => {},
    log: silent,
    recordTruth: (entry) => truth.push(entry.event),
    publish: async (topic, message) => published.push(message),
  });
  const reported = (i) => published[i].features.softwareManagement.properties.packages.openssl;
  return { virtual, published, truth, reported };
}

test("emulated device goes through installation and verification like the real agents", async () => {
  const d = device();
  await d.virtual.handleTwin(twin);

  assert.deepEqual(d.published.map((m) => m.stage), ["installation", "installation", "verification"]);
  assert.equal(d.reported(0).installationStatus, "installing");
  assert.equal(d.reported(1).installationStatus, "installed");
  assert.equal(d.reported(1).version, NEW);
  assert.equal(d.reported(2).verificationStatus, "passed");
  assert.deepEqual(d.truth, ["installed", "verified"]);
  assert.equal(d.virtual.installed.libssl3, NEW);
});

test("injected installation failures keep the old version and skip verification", async () => {
  const d = device({ installFailureRate: 1 });
  await d.virtual.handleTwin(twin);

  assert.deepEqual(d.published.map((m) => m.stage), ["installation", "installation"]);
  assert.equal(d.reported(1).installationStatus, "failed");
  assert.equal(d.reported(1).version, OLD);
  assert.deepEqual(d.truth, ["installation_failed"]);
});

test("injected verification failures are reported after a successful installation", async () => {
  const d = device({ verifyFailureRate: 1 });
  await d.virtual.handleTwin(twin);

  assert.equal(d.reported(2).verificationStatus, "failed");
  assert.deepEqual(d.truth, ["installed", "verification_failed"]);
});

test("monitoring reports the currently installed version", async () => {
  const d = device();
  await d.virtual.reportMonitoring();
  assert.equal(d.published[0].stage, "monitoring");
  assert.equal(d.reported(0).monitoredVersion, OLD);
});

test("delays and failures are reproducible for a given seed", () => {
  const a = mulberry32(42);
  const b = mulberry32(42);
  const spec = { type: "uniform", minMs: 1000, maxMs: 2000 };
  for (let i = 0; i < 5; i += 1) {
    assert.equal(sampleDelay(spec, a), sampleDelay(spec, b));
  }
  assert.equal(sampleDelay({ type: "empirical", samplesMs: [5] }, a), 5);
  assert.equal(sampleDelay(undefined, a), 0);
});
