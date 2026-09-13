import fs from "node:fs";
import { parseArgs } from "node:util";
import { pathToFileURL } from "node:url";
import { compareVersions } from "./debian-version.js";

const FEATURE = "features/softwareManagement";

function basicAuth(username, password) {
  return "Basic " + Buffer.from(`${username}:${password}`).toString("base64");
}

async function searchAll({ dittoUrl, authorization, filter, fields, pageSize, fetchImpl }) {
  const items = [];
  let cursor;
  do {
    const option = cursor ? `size(${pageSize}),cursor(${cursor})` : `size(${pageSize})`;
    const url =
      `${dittoUrl}/api/2/search/things?filter=${encodeURIComponent(filter)}` +
      `&option=${encodeURIComponent(option)}&fields=${encodeURIComponent(fields)}`;
    const response = await fetchImpl(url, { headers: { Authorization: authorization } });
    if (!response.ok) {
      throw new Error(`search failed with HTTP ${response.status}: ${await response.text()}`);
    }
    const page = await response.json();
    items.push(...(page.items ?? []));
    cursor = page.cursor;
  } while (cursor);
  return items;
}

/** Devices whose reported version is below the fixed version and that are not assigned to it yet. */
export function selectTargets(items, packageName, fixedVersion) {
  const targets = [];
  let upToDate = 0;
  let alreadyAssigned = 0;
  for (const item of items) {
    const packages = item?.features?.softwareManagement;
    const reported = packages?.properties?.packages?.[packageName]?.version;
    const desired = packages?.desiredProperties?.packages?.[packageName]?.version;
    if (!reported || compareVersions(reported, fixedVersion) >= 0) {
      upToDate += 1;
    } else if (desired === fixedVersion) {
      alreadyAssigned += 1;
    } else {
      targets.push(item.thingId);
    }
  }
  return { targets, upToDate, alreadyAssigned };
}

async function runPool(items, concurrency, worker) {
  let next = 0;
  const runners = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (next < items.length) {
      const index = next;
      next += 1;
      await worker(items[index]);
    }
  });
  await Promise.all(runners);
}

/**
 * Context-aware software assignment: selects target twins with an RQL query plus a
 * Debian version comparison, then records the deployment intent as desired properties.
 */
export async function assign({
  dittoUrl,
  username = "ditto",
  password = "ditto",
  packageName,
  fixedVersion,
  debs = [packageName],
  repository,
  sha256,
  targetFilter = 'eq(attributes/type,"physical_device")',
  concurrency = 10,
  pageSize = 200,
  workflowId = `wf-${Date.now()}`,
  fetchImpl = fetch,
  clock = () => performance.now(),
}) {
  const authorization = basicAuth(username, password);
  const filter = `and(${targetFilter},exists(${FEATURE}/properties/packages/${packageName}/version))`;
  const fields = [
    "thingId",
    `${FEATURE}/properties/packages/${packageName}/version`,
    `${FEATURE}/desiredProperties/packages/${packageName}/version`,
  ].join(",");

  const started = clock();
  const items = await searchAll({ dittoUrl, authorization, filter, fields, pageSize, fetchImpl });
  const queried = clock();
  const { targets, upToDate, alreadyAssigned } = selectTargets(items, packageName, fixedVersion);

  const desired = { version: fixedVersion, debs, workflowId, assignedAt: new Date().toISOString() };
  if (repository) desired.repository = repository;
  if (sha256) desired.sha256 = sha256;
  const body = JSON.stringify(desired);

  const writes = [];
  await runPool(targets, concurrency, async (thingId) => {
    const startedAt = Date.now();
    const t0 = clock();
    const response = await fetchImpl(
      `${dittoUrl}/api/2/things/${thingId}/${FEATURE}/desiredProperties/packages/${packageName}`,
      {
        method: "PUT",
        headers: {
          Authorization: authorization,
          "Content-Type": "application/json",
          "correlation-id": workflowId,
        },
        body,
      },
    );
    await response.text();
    writes.push({
      thingId,
      startedAt,
      finishedAt: Date.now(),
      latencyMs: clock() - t0,
      status: response.status,
    });
  });
  const finished = clock();

  return {
    workflowId,
    candidates: items.length,
    targets: targets.length,
    upToDate,
    alreadyAssigned,
    failures: writes.filter((w) => w.status >= 300).length,
    queryMs: queried - started,
    writeMs: finished - queried,
    totalMs: finished - started,
    writes,
  };
}

function appendCsv(file, rows) {
  if (rows.length === 0) return;
  const columns = Object.keys(rows[0]);
  const isNew = !fs.existsSync(file) || fs.statSync(file).size === 0;
  const lines = rows.map((row) => columns.map((c) => row[c]).join(","));
  fs.appendFileSync(file, (isNew ? columns.join(",") + "\n" : "") + lines.join("\n") + "\n");
}

async function main() {
  const { values } = parseArgs({
    options: {
      package: { type: "string", default: "openssl" },
      version: { type: "string" },
      debs: { type: "string" },
      repository: { type: "string" },
      filter: { type: "string", default: 'eq(attributes/type,"physical_device")' },
      concurrency: { type: "string", default: "10" },
      workflow: { type: "string" },
      "summary-out": { type: "string" },
      "writes-out": { type: "string" },
    },
  });
  if (!values.version) {
    console.error("--version is required");
    process.exit(2);
  }
  const result = await assign({
    dittoUrl: process.env.DITTO_URL ?? `http://${process.env.DITTO_SERVER ?? "localhost:8080"}`,
    username: process.env.DITTO_USERNAME ?? "ditto",
    password: process.env.DITTO_PASSWORD ?? "ditto",
    packageName: values.package,
    fixedVersion: values.version,
    debs: values.debs ? values.debs.split(",") : undefined,
    repository: values.repository,
    targetFilter: values.filter,
    concurrency: Number(values.concurrency),
    workflowId: values.workflow,
  });
  const { writes, ...summary } = result;
  if (values["summary-out"]) appendCsv(values["summary-out"], [summary]);
  if (values["writes-out"]) {
    appendCsv(values["writes-out"], writes.map((w) => ({ workflowId: result.workflowId, ...w })));
  }
  console.log(JSON.stringify(summary));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    console.error(err.stack ?? String(err));
    process.exit(1);
  });
}
