import fs from "node:fs";
import os from "node:os";
import { connect, publishJson } from "./agent-core.js";
import { DEFAULT_TOPIC_PREFIX, downstreamTopic, statusTopic } from "./contract.js";
import { createInstaller } from "./installer.js";
import { createVerifier } from "./verifier.js";
import { createVirtualDevice, mulberry32 } from "./emulator.js";
import { runInTarget } from "./system.js";

const env = process.env;
const log = console;
const brokerUrl = env.MQTT_BROKER_URL ?? "mqtt://mosquitto:1883";
const credentials = { username: env.MQTT_USERNAME, password: env.MQTT_PASSWORD };
const topicPrefix = env.TOPIC_PREFIX ?? DEFAULT_TOPIC_PREFIX;

const DEFAULT_PROFILE = {
  install: { type: "fixed", ms: 0 },
  verify: { type: "fixed", ms: 0 },
  installFailureRate: 0,
  verifyFailureRate: 0,
  initialVersions: {},
  monitoredPackages: [],
  monitorIntervalMs: 0,
  offline: null,
};

process.on("SIGTERM", () => process.exit(0));

switch (env.AGENT_ROLE) {
  case "installer":
  case "verifier":
    startRealAgent(env.AGENT_ROLE);
    break;
  case "emulator":
    await startEmulator();
    break;
  default:
    log.error(`AGENT_ROLE must be installer, verifier or emulator (got "${env.AGENT_ROLE}")`);
    process.exit(2);
}

function required(name) {
  if (!env[name]) {
    log.error(`${name} is required`);
    process.exit(2);
  }
  return env[name];
}

function integer(name, fallback) {
  return env[name] === undefined ? fallback : Number.parseInt(env[name], 10);
}

function startRealAgent(role) {
  const thingId = required("THING_ID");
  const exec = (command, options = {}) =>
    runInTarget(command, {
      mode: env.APT_EXEC ?? "nsenter",
      targetPid: env.TARGET_PID ?? "1",
      ...options,
    });
  let client;
  const publish = (topic, message) => publishJson(client, topic, message);

  if (role === "installer") {
    const installer = createInstaller({ thingId, publish, exec, log, topicPrefix });
    client = connect({
      brokerUrl,
      ...credentials,
      clientId: `installer-${thingId}`,
      topics: [downstreamTopic(thingId, topicPrefix)],
      onMessage: (_topic, thing) => installer.handleTwin(thing),
      log,
    });
  } else {
    const verifier = createVerifier({ thingId, publish, exec, log, topicPrefix });
    client = connect({
      brokerUrl,
      ...credentials,
      clientId: `verifier-${thingId}`,
      topics: [statusTopic(thingId, topicPrefix)],
      onMessage: (_topic, message) => verifier.handleStatus(message),
      log,
    });
  }
  client.on("connect", () => log.info(`${role} agent for ${thingId} connected to ${brokerUrl}`));
}

function loadProfile(value) {
  if (!value) return DEFAULT_PROFILE;
  const text = value.trim().startsWith("{") ? value : fs.readFileSync(value, "utf8");
  return { ...DEFAULT_PROFILE, ...JSON.parse(text) };
}

function goOfflineLater(client, offline, thingId, recordTruth) {
  setTimeout(() => {
    client.options.reconnectPeriod = 0;
    client.stream?.destroy();
    recordTruth({ thingId, event: "offline_start" });
    setTimeout(() => {
      client.options.reconnectPeriod = 2000;
      client.reconnect();
      recordTruth({ thingId, event: "offline_end" });
    }, offline.durationMs);
  }, offline.afterMs ?? 0);
}

async function startEmulator() {
  const count = integer("EMU_COUNT", 10);
  const startIndex = integer("EMU_START_INDEX", 1);
  const thingPrefix = env.EMU_THING_PREFIX ?? "no.sintef.sct.giot:emu-";
  const seed = integer("EMU_SEED", 42);
  const runId = env.EMU_RUN_ID ?? String(Date.now());
  const instance = env.EMU_INSTANCE ?? os.hostname();
  const profile = loadProfile(env.EMU_PROFILE);
  const truth = env.EMU_TRUTH_FILE
    ? fs.createWriteStream(env.EMU_TRUTH_FILE, { flags: "a" })
    : null;
  const recordTruth = ({ thingId, workflowId = "", event }) =>
    truth?.write(`${Date.now()},${runId},${thingId},${workflowId},${event}\n`);
  const sleep = (ms) =>
    ms > 0 ? new Promise((resolve) => setTimeout(resolve, ms)) : Promise.resolve();

  const devices = [];
  let batch = [];
  for (let i = 0; i < count; i += 1) {
    const index = startIndex + i;
    const thingId = `${thingPrefix}${String(index).padStart(4, "0")}`;
    const auxRng = mulberry32(seed * 7919 + index);
    let client;
    const device = createVirtualDevice({
      thingId,
      profile,
      rng: mulberry32(seed + index),
      sleep,
      log,
      topicPrefix,
      recordTruth,
      publish: (topic, message) => publishJson(client, topic, message),
    });
    client = connect({
      brokerUrl,
      ...credentials,
      clientId: `emu-${runId}-${index}`,
      topics: [downstreamTopic(thingId, topicPrefix)],
      onMessage: (_topic, thing) => device.handleTwin(thing),
      log,
    });
    const offline = profile.offline?.rate > 0 && auxRng() < profile.offline.rate;
    devices.push({ thingId, client, device, auxRng, offline });
    batch.push(new Promise((resolve) => client.once("connect", resolve)));
    if (batch.length === 50) {
      await Promise.all(batch);
      batch = [];
    }
  }
  await Promise.all(batch);

  for (const { thingId, client, device, auxRng, offline } of devices) {
    if (offline) goOfflineLater(client, profile.offline, thingId, recordTruth);
    if (profile.monitorIntervalMs > 0) {
      setTimeout(() => {
        device.reportMonitoring();
        setInterval(device.reportMonitoring, profile.monitorIntervalMs);
      }, auxRng() * profile.monitorIntervalMs);
    }
  }

  const control = connect({ brokerUrl, ...credentials, clientId: `emu-${runId}-control`, log });
  control.once("connect", () => {
    const readyTopic = `${topicPrefix}/emulator/${instance}/ready`;
    const announcement = {
      runId,
      count,
      startIndex,
      offline: devices.filter((d) => d.offline).map((d) => d.thingId),
      readyAt: Date.now(),
    };
    control.publish(readyTopic, JSON.stringify(announcement), { qos: 1, retain: true });
    log.info(`emulator ${instance}: ${count} devices connected (run ${runId})`);
  });
}
