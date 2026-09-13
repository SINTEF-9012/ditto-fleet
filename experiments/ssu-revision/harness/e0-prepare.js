// E0 — (re)registers the twin of the containerised gateway gw1 in the state a freshly created
// gateway starts in: OpenSSL 3.0.11 installed and no desired software state.
import { NAMESPACE, OLD_VERSION, ditto } from "./lib/ditto.js";

const THING = `${NAMESPACE}:gw1`;
const response = await ditto("PUT", `/api/2/things/${THING}`, {
  body: {
    policyId: `${NAMESPACE}:policy`,
    attributes: {
      type: "physical_device",
      emulated: false,
      platform: "linux/amd64",
      system_name: "Debian",
      system_version: "12",
    },
    features: {
      // The backend writes the monitoring agent's full package inventory to cyber/packages.
      cyber: { properties: {} },
      softwareManagement: { properties: { packages: { openssl: { version: OLD_VERSION } } } },
    },
  },
});
if (!response.ok) throw new Error(`registering ${THING} failed: HTTP ${response.status} ${response.text}`);
console.log(`${THING} registered with openssl ${OLD_VERSION}`);
