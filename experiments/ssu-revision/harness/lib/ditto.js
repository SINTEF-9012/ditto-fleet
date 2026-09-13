const DITTO_URL =
  process.env.DITTO_URL ?? `http://${process.env.DITTO_SERVER ?? "localhost:8080"}`;
const AUTHORIZATION =
  "Basic " +
  Buffer.from(
    `${process.env.DITTO_USERNAME ?? "ditto"}:${process.env.DITTO_PASSWORD ?? "ditto"}`,
  ).toString("base64");

export const NAMESPACE = "no.sintef.sct.giot";
export const OLD_VERSION = "3.0.11-1~deb12u2";
export const NEW_VERSION = "3.0.14-1~deb12u2";

export async function ditto(method, path, { body, contentType = "application/json", headers = {} } = {}) {
  const init = { method, headers: { Authorization: AUTHORIZATION, ...headers } };
  if (body !== undefined) {
    init.headers["Content-Type"] = contentType;
    init.body = typeof body === "string" ? body : JSON.stringify(body);
  }
  const response = await fetch(`${DITTO_URL}${path}`, init);
  const text = await response.text();
  return { ok: response.ok, status: response.status, text, headers: response.headers };
}

export async function pool(items, concurrency, worker) {
  let next = 0;
  const runners = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (next < items.length) {
      const index = next;
      next += 1;
      await worker(items[index], index);
    }
  });
  await Promise.all(runners);
}

/**
 * Like ditto(), but retries timeouts (HTTP 408), 5xx responses and network errors, which occur while the
 * platform catches up with bulk writes. Only for idempotent requests.
 */
export async function dittoRetrying(method, path, options = {}, { attempts = 20, retryDelayMs = 3000 } = {}) {
  for (let attempt = 1; ; attempt += 1) {
    const response = await ditto(method, path, options).catch((err) => ({ ok: false, status: 0, text: err.message }));
    const transient = response.status === 0 || response.status === 408 || response.status >= 500;
    if (response.ok || !transient || attempt >= attempts) return response;
    await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
  }
}

export async function count(filter) {
  const response = await dittoRetrying("GET", `/api/2/search/things/count?filter=${encodeURIComponent(filter)}`);
  if (!response.ok) throw new Error(`count failed: HTTP ${response.status} ${response.text}`);
  return Number(response.text);
}

/** Ditto's search index is eventually consistent: wait until it reflects the expected state. */
export async function waitForCount(filter, expected, { timeoutMs = 600000, intervalMs = 500 } = {}) {
  const deadline = Date.now() + timeoutMs;
  let last;
  while (Date.now() < deadline) {
    last = await count(filter);
    if (last === expected) return;
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  throw new Error(`search index did not reach ${expected} for ${filter} (last: ${last})`);
}

export function thingId(prefix, index, width = 5) {
  return `${NAMESPACE}:${prefix}${String(index).padStart(width, "0")}`;
}

export function mulberry32(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function summarize(values) {
  if (values.length === 0) return { mean: null, p95: null, max: null };
  const sorted = [...values].sort((a, b) => a - b);
  const mean = sorted.reduce((sum, v) => sum + v, 0) / sorted.length;
  return {
    mean,
    p95: sorted[Math.max(0, Math.ceil(0.95 * sorted.length) - 1)],
    max: sorted[sorted.length - 1],
  };
}

export function appendCsvRow(fs, file, row) {
  const columns = Object.keys(row);
  const isNew = !fs.existsSync(file) || fs.statSync(file).size === 0;
  const line = columns
    .map((column) => {
      const value = row[column];
      if (value === undefined || value === null) return "";
      const text = String(value);
      return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
    })
    .join(",");
  fs.appendFileSync(file, (isNew ? columns.join(",") + "\n" : "") + line + "\n");
}
