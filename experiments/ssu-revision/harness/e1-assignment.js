// E1 — scalability of DT-based software assignment over registered-only twins
// (twins without a connected device). Runs inside the backend image:
//   docker compose -f lab/docker-compose.lab.yml run --rm --no-deps -T \
//     -v ../harness:/harness backend node /harness/e1-assignment.js --counts 100,500 --reps 10
import fs from "node:fs";
import os from "node:os";
import { parseArgs } from "node:util";
import { assign } from "/app/src/assignment-engine.js";
import {
  NAMESPACE,
  NEW_VERSION,
  OLD_VERSION,
  appendCsvRow,
  count,
  ditto,
  mulberry32,
  pool,
  summarize,
  thingId,
  waitForCount,
} from "./lib/ditto.js";

const { values: args } = parseArgs({
  options: {
    counts: { type: "string", default: "100,500,1000,2500,5000" },
    reps: { type: "string", default: "10" },
    warmup: { type: "string", default: "2" },
    vulnerable: { type: "string", default: "0.2" },
    concurrency: { type: "string", default: "10" },
    "seed-concurrency": { type: "string", default: "16" },
    seed: { type: "string", default: "1" },
    out: { type: "string", default: "/results/e1-assignment.csv" },
  },
});

const PREFIX = "reg-";
const REGISTERED = "eq(attributes/registeredOnly,true)";
const ASSIGNED = `and(${REGISTERED},exists(features/softwareManagement/desiredProperties/packages/openssl))`;
const vulnerableFraction = Number(args.vulnerable);
const seed = Number(args.seed);

function registeredTwin(index) {
  const vulnerable = mulberry32(seed * 100003 + index)() < vulnerableFraction;
  return {
    policyId: `${NAMESPACE}:policy`,
    attributes: {
      type: "virtual_device",
      registeredOnly: true,
      platform: "linux/arm64",
      system_name: "Debian",
      system_version: "12",
      site: `site-${index % 50}`,
    },
    features: {
      softwareManagement: {
        properties: { packages: { openssl: { version: vulnerable ? OLD_VERSION : NEW_VERSION } } },
      },
    },
  };
}

async function ensureRegisteredTwins(target) {
  const existing = await count(REGISTERED);
  if (existing > target) {
    throw new Error(`${existing} registered twins exist, more than ${target}; clean up first`);
  }
  const indices = Array.from({ length: target - existing }, (_, i) => existing + i + 1);
  const started = Date.now();
  await pool(indices, Number(args["seed-concurrency"]), async (index) => {
    const response = await ditto("PUT", `/api/2/things/${thingId(PREFIX, index)}`, {
      body: registeredTwin(index),
    });
    if (!response.ok) throw new Error(`seeding ${index} failed: HTTP ${response.status} ${response.text}`);
  });
  await waitForCount(REGISTERED, target);
  console.log(`E1: ${target} registered twins ready (${indices.length} created in ${Date.now() - started} ms)`);
}

async function resetAssignments(thingIds) {
  if (thingIds.length > 0) await waitForCount(ASSIGNED, thingIds.length);
  await pool(thingIds, Number(args["seed-concurrency"]), async (id) => {
    const response = await ditto(
      "DELETE",
      `/api/2/things/${id}/features/softwareManagement/desiredProperties`,
    );
    if (!response.ok && response.status !== 404) {
      throw new Error(`reset of ${id} failed: HTTP ${response.status}`);
    }
  });
  await waitForCount(ASSIGNED, 0);
}

const counts = args.counts.split(",").map(Number).sort((a, b) => a - b);
const reps = Number(args.reps);
const warmup = Number(args.warmup);

await waitForCount(ASSIGNED, 0).catch(async () => {
  const leftovers = await ditto(
    "GET",
    `/api/2/search/things?filter=${encodeURIComponent(ASSIGNED)}&option=size(200)&fields=thingId`,
  );
  await resetAssignments(JSON.parse(leftovers.text).items.map((item) => item.thingId));
});

for (const registeredTwins of counts) {
  await ensureRegisteredTwins(registeredTwins);
  for (let rep = 1; rep <= warmup + reps; rep += 1) {
    const isWarmup = rep <= warmup;
    const startedAt = new Date().toISOString();
    const result = await assign({
      dittoUrl: process.env.DITTO_URL ?? `http://${process.env.DITTO_SERVER}`,
      packageName: "openssl",
      fixedVersion: NEW_VERSION,
      debs: ["openssl", "libssl3"],
      targetFilter: REGISTERED,
      concurrency: Number(args.concurrency),
      workflowId: `wf-e1-${registeredTwins}-${rep}`,
    });
    const writes = summarize(result.writes.map((w) => w.latencyMs));
    appendCsvRow(fs, args.out, {
      experiment: "E1",
      registeredTwins,
      rep,
      warmup: isWarmup,
      candidates: result.candidates,
      targets: result.targets,
      upToDate: result.upToDate,
      alreadyAssigned: result.alreadyAssigned,
      failures: result.failures,
      queryMs: result.queryMs.toFixed(2),
      writeMs: result.writeMs.toFixed(2),
      totalMs: result.totalMs.toFixed(2),
      writeMeanMs: writes.mean?.toFixed(2),
      writeP95Ms: writes.p95?.toFixed(2),
      writeMaxMs: writes.max?.toFixed(2),
      concurrency: Number(args.concurrency),
      startedAt,
      containerCpus: os.cpus().length,
      dittoVersion: process.env.DITTO_VERSION ?? "",
    });
    console.log(
      `E1 N=${registeredTwins} rep=${rep}${isWarmup ? " (warm-up)" : ""}: ` +
        `${result.targets}/${result.candidates} targets, query ${result.queryMs.toFixed(0)} ms, ` +
        `writes ${result.writeMs.toFixed(0)} ms, total ${result.totalMs.toFixed(0)} ms`,
    );
    if (result.failures > 0) throw new Error(`${result.failures} desired-property writes failed`);
    await resetAssignments(result.writes.map((w) => w.thingId));
  }
}
console.log("E1 finished");
