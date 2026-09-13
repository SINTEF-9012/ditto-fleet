// Deletes every twin matching an RQL filter (for example the registered-only twins of an earlier E1
// run) and waits until the search index no longer lists them.
import { parseArgs } from "node:util";
import { dittoRetrying, pool, waitForCount } from "./lib/ditto.js";

const { values: args } = parseArgs({
  options: {
    filter: { type: "string" },
    concurrency: { type: "string", default: "16" },
  },
});

const ids = [];
let cursor;
do {
  const option = cursor ? `size(200),cursor(${cursor})` : "size(200)";
  const response = await dittoRetrying(
    "GET",
    `/api/2/search/things?filter=${encodeURIComponent(args.filter)}&option=${encodeURIComponent(option)}&fields=thingId`,
  );
  if (!response.ok) throw new Error(`search failed: HTTP ${response.status} ${response.text}`);
  const page = JSON.parse(response.text);
  ids.push(...page.items.map((item) => item.thingId));
  cursor = page.cursor;
} while (cursor);

const started = Date.now();
await pool(ids, Number(args.concurrency), async (id) => {
  const response = await dittoRetrying("DELETE", `/api/2/things/${id}`);
  if (!response.ok && response.status !== 404) {
    throw new Error(`deleting ${id} failed: HTTP ${response.status} ${response.text}`);
  }
});
await waitForCount(args.filter, 0);
console.log(`deleted ${ids.length} twins matching ${args.filter} in ${Date.now() - started} ms`);
