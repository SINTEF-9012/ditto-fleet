// Derives the emulator profiles used by E2 ("calibrated") and E3 ("e3") from the real
// installation and verification durations measured on gw1 in E0 (warm-up runs excluded).
import fs from "node:fs";
import { parseArgs } from "node:util";
import { OLD_VERSION } from "./lib/ditto.js";
import { readCsv } from "./lib/metrics.js";

const { values: args } = parseArgs({
  options: {
    runs: { type: "string", default: "/results/e0-runs.csv" },
    profiles: { type: "string", default: "/profiles" },
  },
});

const upgrades = readCsv(args.runs).filter(
  (row) => row.direction === "upgrade" && row.converged === "true" && row.warmup !== "true",
);
if (upgrades.length === 0) throw new Error(`no converged measured upgrade runs in ${args.runs}`);
const samples = (column) => upgrades.map((row) => Number(row[column])).filter(Number.isFinite);

const calibrated = {
  source: `E0: ${upgrades.length} converged upgrade runs of gw1, warm-up runs excluded (${args.runs})`,
  initialVersions: { openssl: OLD_VERSION, libssl3: OLD_VERSION },
  install: { type: "empirical", samplesMs: samples("installMs") },
  verify: { type: "empirical", samplesMs: samples("verifyMs") },
  installFailureRate: 0,
  verifyFailureRate: 0,
  monitoredPackages: ["openssl"],
  monitorIntervalMs: 0,
  offline: null,
};

const e3 = {
  ...calibrated,
  installFailureRate: 0.05,
  verifyFailureRate: 0.03,
  offline: { rate: 0.1, afterMs: 0, durationMs: 60000 },
};

fs.writeFileSync(`${args.profiles}/calibrated.json`, JSON.stringify(calibrated, null, 2) + "\n");
fs.writeFileSync(`${args.profiles}/e3.json`, JSON.stringify(e3, null, 2) + "\n");
console.log(
  `wrote calibrated.json and e3.json from ${upgrades.length} runs ` +
    `(install ${calibrated.install.samplesMs.length} samples, verify ${calibrated.verify.samplesMs.length} samples)`,
);
