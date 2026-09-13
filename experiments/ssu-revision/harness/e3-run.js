// E3 — failures, offline devices and lifecycle traceability. After an update campaign with injected
// installation/verification failures and devices that are offline when the update is assigned,
// the operational questions of Table 3 are answered with RQL over the twins and checked against
// the emulator's ground truth.
import fs from "node:fs";
import { parseArgs } from "node:util";
import { assign } from "/app/src/assignment-engine.js";
import { NEW_VERSION, OLD_VERSION, appendCsvRow, ditto, waitForCount } from "./lib/ditto.js";
import { convergenceSummary, parseCsvLine, parseLifecycleEvent, tailLines } from "./lib/metrics.js";

const { values: args } = parseArgs({
  options: {
    count: { type: "string" },
    rep: { type: "string" },
    run: { type: "string" },
    workflow: { type: "string" },
    events: { type: "string", default: "/results/e3-lifecycle.csv" },
    truth: { type: "string" },
    "runs-out": { type: "string", default: "/results/e3-runs.csv" },
    "queries-out": { type: "string", default: "/results/e3-queries.csv" },
    "history-out": { type: "string" },
    concurrency: { type: "string", default: "10" },
    "timeout-ms": { type: "string", default: "900000" },
  },
});

const n = Number(args.count);
const workflow = args.workflow;
const P = "features/softwareManagement/properties/packages/openssl";
const scope = `eq(attributes/emulated,true),le(attributes/emuIndex,${n})`;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const readEvents = tailLines(args.events);
const readTruth = tailLines(args.truth, { fromStart: true });

const result = await assign({
  dittoUrl: process.env.DITTO_URL ?? `http://${process.env.DITTO_SERVER}`,
  packageName: "openssl",
  fixedVersion: NEW_VERSION,
  debs: ["openssl", "libssl3"],
  targetFilter: `and(${scope})`,
  concurrency: Number(args.concurrency),
  workflowId: workflow,
});
if (result.targets !== n) throw new Error(`expected ${n} targets, got ${result.targets}`);
const assignedAt = Math.min(...result.writes.map((w) => w.startedAt));

const converged = new Map();
const failedInstall = new Set();
const failedVerify = new Set();
const offline = new Set();
const deadline = Date.now() + Number(args["timeout-ms"]);
while (converged.size + failedInstall.size + failedVerify.size < n && Date.now() < deadline) {
  for (const line of readEvents()) {
    const event = parseLifecycleEvent(line);
    if (event?.workflowId === workflow && event.event === "converged") converged.set(event.thingId, event.ts);
  }
  for (const line of readTruth()) {
    const [, , thingId, workflowId, event] = parseCsvLine(line);
    if (event === "offline_start") offline.add(thingId);
    if (workflowId !== workflow) continue;
    if (event === "installation_failed") failedInstall.add(thingId);
    if (event === "verification_failed") failedVerify.add(thingId);
  }
  await sleep(250);
}
const terminalAt = Date.now();
const terminalMs = terminalAt - assignedAt;
const completed = new Set(converged.keys());

// The search index follows twin updates asynchronously: record how long it takes to reflect the final state.
let indexSettled = true;
const notSettled = (err) => {
  indexSettled = false;
  console.warn(`search index not settled: ${err.message}`);
};
await waitForCount(
  `and(${scope},eq(${P}/workflowId,"${workflow}"),eq(${P}/verificationStatus,"passed"))`,
  completed.size,
  { timeoutMs: 120000, intervalMs: 100 },
).catch(notSettled);
await waitForCount(
  `and(${scope},eq(${P}/workflowId,"${workflow}"),or(eq(${P}/installationStatus,"failed"),eq(${P}/verificationStatus,"failed")))`,
  failedInstall.size + failedVerify.size,
  { timeoutMs: 120000, intervalMs: 100 },
).catch(notSettled);
const indexSettleMs = Date.now() - terminalAt;

async function searchIds(filter) {
  const ids = new Set();
  let cursor;
  const started = performance.now();
  do {
    const option = cursor ? `size(200),cursor(${cursor})` : "size(200)";
    const response = await ditto(
      "GET",
      `/api/2/search/things?filter=${encodeURIComponent(filter)}&option=${encodeURIComponent(option)}&fields=thingId`,
    );
    if (!response.ok) throw new Error(`query failed: HTTP ${response.status} ${response.text}`);
    const page = JSON.parse(response.text);
    for (const item of page.items) ids.add(item.thingId);
    cursor = page.cursor;
  } while (cursor);
  return { ids, latencyMs: performance.now() - started };
}

const queries = [
  {
    id: "Q1-still-vulnerable",
    question: "Which gateways still run the vulnerable OpenSSL version?",
    filter: `and(${scope},eq(${P}/version,"${OLD_VERSION}"))`,
    expected: failedInstall,
  },
  {
    id: "Q2-completed",
    question: "Which gateways have successfully completed the update?",
    filter: `and(${scope},eq(${P}/workflowId,"${workflow}"),eq(${P}/version,"${NEW_VERSION}"),eq(${P}/installationStatus,"installed"),eq(${P}/verificationStatus,"passed"))`,
    expected: completed,
  },
  {
    id: "Q3a-failed-installation",
    question: "Which gateways failed the update at the installation stage?",
    filter: `and(${scope},eq(${P}/workflowId,"${workflow}"),eq(${P}/installationStatus,"failed"))`,
    expected: failedInstall,
  },
  {
    id: "Q3b-failed-verification",
    question: "Which gateways failed the update at the verification stage?",
    filter: `and(${scope},eq(${P}/workflowId,"${workflow}"),eq(${P}/verificationStatus,"failed"))`,
    expected: failedVerify,
  },
];

for (const query of queries) {
  const { ids, latencyMs } = await searchIds(query.filter);
  const truePositives = [...ids].filter((id) => query.expected.has(id)).length;
  appendCsvRow(fs, args["queries-out"], {
    experiment: "E3",
    rep: Number(args.rep),
    workflowId: workflow,
    query: query.id,
    question: query.question,
    rql: query.filter,
    expected: query.expected.size,
    returned: ids.size,
    truePositives,
    falsePositives: ids.size - truePositives,
    falseNegatives: query.expected.size - truePositives,
    latencyMs: latencyMs.toFixed(2),
  });
  console.log(`${query.id}: expected ${query.expected.size}, returned ${ids.size}, correct ${truePositives}`);
}

const writeDone = new Map(result.writes.map((w) => [w.thingId, w.finishedAt]));
const meanLatency = (ids) => {
  const values = [...ids].filter((id) => converged.has(id)).map((id) => converged.get(id) - writeDone.get(id));
  return values.length ? Number((values.reduce((a, b) => a + b, 0) / values.length).toFixed(1)) : null;
};
const online = new Set([...completed].filter((id) => !offline.has(id)));
const summary = convergenceSummary(result.writes, converged, n - failedInstall.size - failedVerify.size);

appendCsvRow(fs, args["runs-out"], {
  experiment: "E3",
  run: args.run,
  rep: Number(args.rep),
  workflowId: workflow,
  devices: n,
  startedAt: new Date(assignedAt).toISOString(),
  completed: completed.size,
  failedInstallation: failedInstall.size,
  failedVerification: failedVerify.size,
  offline: offline.size,
  offlineCompleted: [...offline].filter((id) => completed.has(id)).length,
  allTerminal: completed.size + failedInstall.size + failedVerify.size === n,
  terminalMs,
  indexSettleMs,
  indexSettled,
  meanLatencyOnlineMs: meanLatency(online),
  meanLatencyOfflineMs: meanLatency(offline),
  fleet100Ms: summary.fleet100Ms,
  queryMs: result.queryMs.toFixed(2),
  requestMs: result.writeMs.toFixed(2),
});

if (args["history-out"]) {
  const samples = {
    completedAfterOffline: [...offline].find((id) => completed.has(id)),
    failedInstallation: [...failedInstall][0],
    failedVerification: [...failedVerify][0],
  };
  const histories = {};
  for (const [label, id] of Object.entries(samples)) {
    if (!id) continue;
    const latest = JSON.parse((await ditto("GET", `/api/2/things/${id}?fields=_revision`)).text)._revision;
    const revisions = [];
    for (let revision = Math.max(1, latest - 8); revision <= latest; revision += 1) {
      const response = await ditto("GET", `/api/2/things/${id}?fields=${P}`, {
        headers: { "at-historical-revision": String(revision) },
      });
      revisions.push({
        revision,
        historicalHeaders: JSON.parse(response.headers.get("historical-headers") ?? "null"),
        openssl: response.ok ? JSON.parse(response.text)?.features?.softwareManagement?.properties?.packages?.openssl : null,
      });
    }
    histories[label] = { thingId: id, revisions };
  }
  fs.writeFileSync(args["history-out"], JSON.stringify({ workflow, histories }, null, 2));
}

console.log(
  `E3 rep=${args.rep}: ${completed.size} completed, ${failedInstall.size} failed installation, ` +
    `${failedVerify.size} failed verification, ${offline.size} offline (terminal after ${terminalMs} ms)`,
);
