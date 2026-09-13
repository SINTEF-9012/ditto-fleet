// Deletes every twin matching an RQL filter (for example the registered-only twins of an earlier E1
// run) and waits until the search index no longer lists them. --id-prefix and --id-count also delete
// the twins <prefix>00001..<count> by id: after things-search restarted, its index can miss twins that
// its background synchronisation adds again later.
import { parseArgs } from "node:util";
import { dittoRetrying, pool, thingId, waitForCount } from "./lib/ditto.js";

const { values: args } = parseArgs({
  options: {
    filter: { type: "string" },
    "id-prefix": { type: "string" },
    "id-count": { type: "string", default: "0" },
    "id-width": { type: "string", default: "5" },
    concurrency: { type: "string", default: "16" },
  },
});

const ids = new Set();
if (args["id-prefix"]) {
  for (let index = 1; index <= Number(args["id-count"]); index += 1) {
    ids.add(thingId(args["id-prefix"], index, Number(args["id-width"])));
  }
}
let cursor;
do {
  const option = cursor ? `size(200),cursor(${cursor})` : "size(200)";
  const response = await dittoRetrying(
    "GET",
    `/api/2/search/things?filter=${encodeURIComponent(args.filter)}&option=${encodeURIComponent(option)}&fields=thingId`,
  );
  if (!response.ok) throw new Error(`search failed: HTTP ${response.status} ${response.text}`);
  const page = JSON.parse(response.text);
  for (const item of page.items) ids.add(item.thingId);
  cursor = page.cursor;
} while (cursor);

const started = Date.now();
let deleted = 0;
await pool([...ids], Number(args.concurrency), async (id) => {
  const response = await dittoRetrying("DELETE", `/api/2/things/${id}`);
  if (response.ok) deleted += 1;
  else if (response.status !== 404) throw new Error(`deleting ${id} failed: HTTP ${response.status} ${response.text}`);
});
await waitForCount(args.filter, 0);
console.log(`deleted ${deleted} of ${ids.size} candidate twins (${args.filter}) in ${Date.now() - started} ms`);
