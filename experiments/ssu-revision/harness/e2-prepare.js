// E2/E3 — (re)registers the twins of emulated gateways emu-0001..N: vulnerable OpenSSL,
// no desired state. Replacing the whole thing emits no desired-state event, so nothing is dispatched.
import { parseArgs } from "node:util";
import { NAMESPACE, OLD_VERSION, ditto, pool, thingId, waitForCount } from "./lib/ditto.js";

const { values: args } = parseArgs({
  options: {
    count: { type: "string" },
    concurrency: { type: "string", default: "16" },
  },
});
const n = Number(args.count);

function emulatedTwin(index) {
  return {
    policyId: `${NAMESPACE}:policy`,
    attributes: {
      type: "physical_device",
      emulated: true,
      emuIndex: index,
      platform: "linux/arm64",
      system_name: "Debian",
      system_version: "12",
      site: `site-${index % 50}`,
    },
    features: {
      softwareManagement: {
        properties: { packages: { openssl: { version: OLD_VERSION } } },
      },
    },
  };
}

const started = Date.now();
await pool(
  Array.from({ length: n }, (_, i) => i + 1),
  Number(args.concurrency),
  async (index) => {
    const response = await ditto("PUT", `/api/2/things/${thingId("emu-", index, 4)}`, {
      body: emulatedTwin(index),
    });
    if (!response.ok) {
      throw new Error(`preparing emu-${index} failed: HTTP ${response.status} ${response.text}`);
    }
  },
);
await waitForCount(
  `and(eq(attributes/emulated,true),le(attributes/emuIndex,${n}),` +
    `eq(features/softwareManagement/properties/packages/openssl/version,"${OLD_VERSION}"),` +
    `not(exists(features/softwareManagement/desiredProperties)))`,
  n,
);
console.log(`prepared ${n} emulated twins in ${Date.now() - started} ms`);
