// E4 — checks, after a run, that every emulated twin carries the extra desired metadata and that
// the annotator's knownVulnerabilities are consistent with the twin's reported OpenSSL version.
import fs from "node:fs";
import { parseArgs } from "node:util";
import { compareVersions } from "/app/src/debian-version.js";
import { appendCsvRow, ditto } from "./lib/ditto.js";

const { values: args } = parseArgs({
  options: {
    count: { type: "string" },
    rep: { type: "string" },
    workflow: { type: "string" },
    feed: { type: "string", default: "/harness/data/cve-feed.json" },
    out: { type: "string", default: "/results/e4-checks.csv" },
    "settle-ms": { type: "string", default: "5000" },
  },
});

const n = Number(args.count);
const feed = JSON.parse(fs.readFileSync(args.feed, "utf8"));
const expectedVulnerabilities = (version) =>
  (feed.openssl ?? []).filter((advisory) => compareVersions(version, advisory.fixedIn) < 0).map((a) => a.id);

// Annotations follow version changes asynchronously; give the annotator time to catch up.
await new Promise((resolve) => setTimeout(resolve, Number(args["settle-ms"])));

const P = "features/softwareManagement";
const fields = `thingId,${P}/properties/packages/openssl,${P}/desiredProperties/packages/openssl`;
const filter = `and(eq(attributes/emulated,true),le(attributes/emuIndex,${n}))`;
const twins = [];
let cursor;
do {
  const option = cursor ? `size(200),cursor(${cursor})` : "size(200)";
  const response = await ditto(
    "GET",
    `/api/2/search/things?filter=${encodeURIComponent(filter)}&option=${encodeURIComponent(option)}&fields=${encodeURIComponent(fields)}`,
  );
  if (!response.ok) throw new Error(`search failed: HTTP ${response.status}`);
  const page = JSON.parse(response.text);
  twins.push(...page.items);
  cursor = page.cursor;
} while (cursor);

let metadataPresent = 0;
let annotated = 0;
let consistent = 0;
let assigned;
for (const twin of twins) {
  const reported = twin.features?.softwareManagement?.properties?.packages?.openssl ?? {};
  const desired = twin.features?.softwareManagement?.desiredProperties?.packages?.openssl ?? {};
  if (desired.workflowId === args.workflow && Array.isArray(desired.cveIds) && desired.sbomRef) {
    metadataPresent += 1;
    assigned ??= desired;
  }
  if (Array.isArray(reported.knownVulnerabilities)) {
    annotated += 1;
    const expected = expectedVulnerabilities(reported.version);
    if (JSON.stringify(expected) === JSON.stringify(reported.knownVulnerabilities)) consistent += 1;
  }
}

// The SBOM reference must resolve to an SPDX document describing the assigned version.
let sbomResolvable = false;
if (assigned) {
  const response = await fetch(assigned.sbomRef).catch(() => null);
  const sbom = response?.ok ? await response.json().catch(() => null) : null;
  sbomResolvable = (sbom?.packages ?? []).some((p) => p.name === "openssl" && p.versionInfo === assigned.version);
}

appendCsvRow(fs, args.out, {
  experiment: "E4",
  rep: Number(args.rep),
  workflowId: args.workflow,
  devices: n,
  twinsFound: twins.length,
  desiredMetadataPresent: metadataPresent,
  sbomResolvable,
  annotated,
  annotationsConsistentWithVersion: consistent,
});
console.log(
  `E4 check rep=${args.rep}: ${twins.length} twins, metadata on ${metadataPresent}, ` +
    `SBOM resolvable ${sbomResolvable}, annotated ${annotated}, consistent ${consistent}`,
);
