// E2 — one coordination run through the DT platform: assign the update to emulated
// gateways emu-0001..N, then wait for every device's "converged" event in the lifecycle log.
import fs from "node:fs";
import os from "node:os";
import { parseArgs } from "node:util";
import { assign } from "/app/src/assignment-engine.js";
import { NEW_VERSION, appendCsvRow } from "./lib/ditto.js";
import { convergenceSummary, tailLines } from "./lib/metrics.js";

const { values: args } = parseArgs({
  options: {
    count: { type: "string" },
    rep: { type: "string" },
    profile: { type: "string", default: "zero" },
    workflow: { type: "string" },
    warmup: { type: "boolean", default: false },
    events: { type: "string", default: "/results/e2-lifecycle.csv" },
    out: { type: "string", default: "/results/e2-coordination.csv" },
    experiment: { type: "string", default: "E2" },
    concurrency: { type: "string", default: "10" },
    metadata: { type: "string" },
    "timeout-ms": { type: "string", default: "900000" },
  },
});

const n = Number(args.count);
const workflow = args.workflow;
const readNewEvents = tailLines(args.events);
const startedAt = new Date().toISOString();

const result = await assign({
  dittoUrl: process.env.DITTO_URL ?? `http://${process.env.DITTO_SERVER}`,
  packageName: "openssl",
  fixedVersion: NEW_VERSION,
  debs: ["openssl", "libssl3"],
  metadata: args.metadata ? JSON.parse(args.metadata) : undefined,
  targetFilter: `and(eq(attributes/emulated,true),le(attributes/emuIndex,${n}))`,
  concurrency: Number(args.concurrency),
  workflowId: workflow,
});
if (result.targets !== n || result.failures > 0) {
  throw new Error(`expected ${n} successful assignments, got ${result.targets} targets and ${result.failures} failures`);
}

const converged = new Map();
let failedEvents = 0;
const deadline = Date.now() + Number(args["timeout-ms"]);
while (converged.size < n && Date.now() < deadline) {
  for (const line of readNewEvents()) {
    const [ts, , event, workflowId, thingId] = line.split(",");
    if (workflowId !== workflow) continue;
    if (event === "converged") converged.set(thingId, Number(ts));
    else if (event.endsWith("_failed")) failedEvents += 1;
  }
  if (converged.size < n) await new Promise((resolve) => setTimeout(resolve, 200));
}

const summary = convergenceSummary(result.writes, converged, n);
appendCsvRow(fs, args.out, {
  experiment: args.experiment,
  mode: "dt",
  profile: args.profile,
  devices: n,
  rep: Number(args.rep),
  warmup: args.warmup,
  workflowId: workflow,
  queryMs: result.queryMs.toFixed(2),
  requestMs: result.writeMs.toFixed(2),
  ...summary,
  failedEvents,
  startedAt,
  containerCpus: os.cpus().length,
  dittoVersion: process.env.DITTO_VERSION ?? "",
});
console.log(
  `${args.experiment} dt ${args.profile} N=${n} rep=${args.rep}: ${summary.completed}/${n} converged, ` +
    `fleet ${summary.fleet100Ms} ms, device p50 ${summary.deviceP50Ms} ms, p95 ${summary.deviceP95Ms} ms`,
);
if (!summary.complete) process.exitCode = 1;
