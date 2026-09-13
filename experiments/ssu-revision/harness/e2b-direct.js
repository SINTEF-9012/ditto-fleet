// E2b — baseline without the DT platform: the same update requests are sent straight to the
// emulated gateways over MQTT, and a device counts as done when its verification status arrives.
import fs from "node:fs";
import os from "node:os";
import { createRequire } from "node:module";
import { parseArgs } from "node:util";
import { NEW_VERSION, OLD_VERSION, appendCsvRow, pool, thingId } from "./lib/ditto.js";
import { convergenceSummary } from "./lib/metrics.js";

const require = createRequire("/app/package.json");
const mqtt = require("mqtt");

const { values: args } = parseArgs({
  options: {
    count: { type: "string" },
    rep: { type: "string" },
    profile: { type: "string", default: "zero" },
    workflow: { type: "string" },
    warmup: { type: "boolean", default: false },
    prefix: { type: "string", default: "baseline" },
    out: { type: "string", default: "/results/e2-coordination.csv" },
    experiment: { type: "string", default: "E2" },
    concurrency: { type: "string", default: "10" },
    "timeout-ms": { type: "string", default: "900000" },
  },
});

const n = Number(args.count);
const workflow = args.workflow;
const client = mqtt.connect(process.env.MQTT_BROKER ?? "mqtt://mosquitto:1883", {
  clientId: `baseline-${workflow}`,
  username: process.env.MQTT_USERNAME,
  password: process.env.MQTT_PASSWORD,
  clean: true,
});
await new Promise((resolve, reject) => {
  client.once("connect", resolve);
  client.once("error", reject);
});

const completions = new Map();
client.on("message", (_topic, payload) => {
  const message = JSON.parse(payload.toString());
  if (message.workflowId !== workflow || message.stage !== "verification") return;
  if (!completions.has(message.thingId)) completions.set(message.thingId, Date.now());
});
await new Promise((resolve, reject) =>
  client.subscribe(`${args.prefix}/software-status/+`, { qos: 1 }, (err) => (err ? reject(err) : resolve())),
);

const startedAt = new Date().toISOString();
const requestStart = performance.now();
const writes = [];
const devices = Array.from({ length: n }, (_, i) => thingId("emu-", i + 1, 4));
await pool(devices, Number(args.concurrency), async (id) => {
  const twin = {
    thingId: id,
    attributes: { type: "physical_device", emulated: true },
    features: {
      softwareManagement: {
        desiredProperties: {
          packages: { openssl: { version: NEW_VERSION, debs: ["openssl", "libssl3"], workflowId: workflow } },
        },
        properties: { packages: { openssl: { version: OLD_VERSION } } },
      },
    },
  };
  const requestStartedAt = Date.now();
  await new Promise((resolve, reject) =>
    client.publish(`${args.prefix}/downstream/${id}`, JSON.stringify(twin), { qos: 1 }, (err) =>
      err ? reject(err) : resolve(),
    ),
  );
  writes.push({ thingId: id, startedAt: requestStartedAt, finishedAt: Date.now() });
});
const requestMs = performance.now() - requestStart;

const deadline = Date.now() + Number(args["timeout-ms"]);
while (completions.size < n && Date.now() < deadline) {
  await new Promise((resolve) => setTimeout(resolve, 200));
}
client.end(true);

const summary = convergenceSummary(writes, completions, n);
appendCsvRow(fs, args.out, {
  experiment: args.experiment,
  mode: "direct",
  profile: args.profile,
  devices: n,
  rep: Number(args.rep),
  warmup: args.warmup,
  workflowId: workflow,
  queryMs: "",
  requestMs: requestMs.toFixed(2),
  ...summary,
  failedEvents: 0,
  startedAt,
  containerCpus: os.cpus().length,
  dittoVersion: "",
});
console.log(
  `${args.experiment} direct ${args.profile} N=${n} rep=${args.rep}: ${summary.completed}/${n} done, ` +
    `fleet ${summary.fleet100Ms} ms, device p50 ${summary.deviceP50Ms} ms, p95 ${summary.deviceP95Ms} ms`,
);
if (!summary.complete) process.exitCode = 1;
