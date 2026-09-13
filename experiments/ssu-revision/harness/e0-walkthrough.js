// E0 — real software updates of the containerised gateway gw1 through the DT platform,
// alternating upgrades (3.0.11 -> 3.0.14) and downgrades (3.0.14 -> 3.0.11). Records a per-stage
// latency breakdown for every run and the twin's revision history of the first measured upgrade.
//
// Consecutive stages from the desired-state write to convergence (all timestamps from one clock):
//   eventMs       write request sent -> lifecycle service receives the Ditto event
//   dispatchMs    event -> twin fetched and handed to MQTT
//   deliveryMs    hand-off -> installation agent receives the twin
//   installMs     apt-get update + install on gw1
//   verifyWaitMs  installation finished -> verification agent receives the "installed" status
//   verifyMs      verification checks on gw1
//   verifyReportMs verification finished -> status written to the twin (convergence follows at once)
// installReportMs (installation finished -> status written to the twin) runs in parallel with verification.
import fs from "node:fs";
import { parseArgs } from "node:util";
import { NEW_VERSION, OLD_VERSION, appendCsvRow, ditto } from "./lib/ditto.js";
import { parseLifecycleEvent, tailLines } from "./lib/metrics.js";

const { values: args } = parseArgs({
  options: {
    runs: { type: "string", default: "40" },
    warmup: { type: "string", default: "2" },
    thing: { type: "string", default: "no.sintef.sct.giot:gw1" },
    events: { type: "string", default: "/results/e0-lifecycle.csv" },
    out: { type: "string", default: "/results/e0-runs.csv" },
    "history-out": { type: "string", default: "/results/e0-history.json" },
    "timeout-ms": { type: "string", default: "300000" },
    "monitor-timeout-ms": { type: "string", default: "60000" },
  },
});

const thing = args.thing;
const FEATURE_PATH = `/api/2/things/${thing}/features/softwareManagement`;
const PACKAGE_FIELDS =
  "features/softwareManagement/properties/packages/openssl,features/softwareManagement/desiredProperties/packages/openssl";
const warmupRuns = Number(args.warmup);
const totalRuns = warmupRuns + Number(args.runs);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const diff = (later, earlier) =>
  later === undefined || later === null || earlier === undefined || earlier === null ? null : later - earlier;

async function readJson(path, headers) {
  const response = await ditto("GET", path, { headers });
  return { response, body: response.ok ? JSON.parse(response.text) : null };
}

async function currentRevision() {
  return (await readJson(`/api/2/things/${thing}?fields=_revision`)).body._revision;
}

async function reportedField(field) {
  return (await readJson(`${FEATURE_PATH}/properties/packages/openssl/${field}`)).body;
}

let current = await reportedField("version");
let historySaved = false;

for (let run = 1; run <= totalRuns; run += 1) {
  const isWarmup = run <= warmupRuns;
  const target = current === NEW_VERSION ? OLD_VERSION : NEW_VERSION;
  const direction = target === NEW_VERSION ? "upgrade" : "downgrade";
  const workflowId = `wf-e0-${Date.now()}-${run}`;
  const readNewEvents = tailLines(args.events);
  const revisionBefore = await currentRevision();

  const writeStart = Date.now();
  const put = await ditto("PUT", `${FEATURE_PATH}/desiredProperties/packages/openssl`, {
    body: {
      version: target,
      debs: ["openssl", "libssl3"],
      repository: "http://apt-repo/ ./",
      workflowId,
      assignedAt: new Date(writeStart).toISOString(),
    },
    headers: { "correlation-id": workflowId },
  });
  const writeEnd = Date.now();
  if (!put.ok) throw new Error(`desired-state write failed: HTTP ${put.status} ${put.text}`);

  const events = [];
  let convergedAt = null;
  const deadline = Date.now() + Number(args["timeout-ms"]);
  while (convergedAt === null && Date.now() < deadline) {
    for (const line of readNewEvents()) {
      const event = parseLifecycleEvent(line);
      if (!event || event.workflowId !== workflowId || event.thingId !== thing) continue;
      events.push(event);
      if (event.event === "converged") convergedAt = event.ts;
    }
    if (convergedAt === null) await sleep(100);
  }

  const find = (predicate) => events.find(predicate);
  const status = (event, stage, value) =>
    find((e) => e.event === event && e.stage === stage && (value === undefined || e.detail?.status === value));
  const desiredEvent = find((e) => e.event === "desired_event");
  const dispatched = find((e) => e.event === "dispatched");
  const installing = status("status_received", "installation", "installing");
  const installed = status("status_received", "installation", "installed");
  const installedApplied = status("status_applied", "installation", "installed");
  const verified = status("status_received", "verification");
  const verifiedApplied = status("status_applied", "verification");

  let monitorConfirmMs = null;
  if (convergedAt !== null) {
    const monitorDeadline = Date.now() + Number(args["monitor-timeout-ms"]);
    while (Date.now() < monitorDeadline) {
      if ((await reportedField("monitoredVersion")) === target) {
        monitorConfirmMs = Date.now() - convergedAt;
        break;
      }
      await sleep(500);
    }
  }

  appendCsvRow(fs, args.out, {
    experiment: "E0",
    run,
    warmup: isWarmup,
    direction,
    workflowId,
    converged: convergedAt !== null,
    writeMs: writeEnd - writeStart,
    eventMs: diff(desiredEvent?.ts, writeStart),
    dispatchMs: diff(dispatched?.ts, desiredEvent?.ts),
    pubackMs: dispatched?.detail?.pubackMs ?? null,
    deliveryMs: diff(installing?.detail?.receivedAt, dispatched?.ts),
    installMs: diff(installed?.detail?.finishedAt, installed?.detail?.startedAt),
    aptUpdateMs: installed?.detail?.aptUpdateMs ?? null,
    aptInstallMs: installed?.detail?.aptInstallMs ?? null,
    installReportMs: diff(installedApplied?.ts, installed?.detail?.finishedAt),
    verifyWaitMs: diff(verified?.detail?.receivedAt, installed?.detail?.finishedAt),
    verifyMs: diff(verified?.detail?.finishedAt, verified?.detail?.startedAt),
    verifyReportMs: diff(verifiedApplied?.ts, verified?.detail?.finishedAt),
    totalMs: diff(convergedAt, writeStart),
    monitorConfirmMs,
    startedAt: new Date(writeStart).toISOString(),
  });

  if (!isWarmup && direction === "upgrade" && convergedAt !== null && !historySaved) {
    await sleep(1000);
    const revisionAfter = await currentRevision();
    const revisions = [];
    for (let revision = revisionBefore; revision <= revisionAfter; revision += 1) {
      const { response, body } = await readJson(`/api/2/things/${thing}?fields=${PACKAGE_FIELDS}`, {
        "at-historical-revision": String(revision),
      });
      revisions.push({
        revision,
        historicalHeaders: JSON.parse(response.headers.get("historical-headers") ?? "null"),
        twin: body,
      });
    }
    fs.writeFileSync(args["history-out"], JSON.stringify({ thing, workflowId, revisions }, null, 2));
    historySaved = true;
  }

  console.log(
    `E0 run ${run}${isWarmup ? " (warm-up)" : ""} ${direction}: ` +
      `${convergedAt !== null ? "converged" : "NOT converged"} in ${diff(convergedAt, writeStart)} ms ` +
      `(monitoring confirmed after ${monitorConfirmMs} ms)`,
  );
  if (convergedAt === null) {
    process.exitCode = 1;
    break;
  }
  current = target;
  await sleep(2000);
}
