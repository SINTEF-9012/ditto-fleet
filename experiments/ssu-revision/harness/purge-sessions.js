// Removes the persistent MQTT sessions left behind by a stopped emulator run. Connecting with a clean
// session makes the broker discard the stored session (subscriptions and queued messages) of that client id.
import { createRequire } from "node:module";
import { parseArgs } from "node:util";
import { pool } from "./lib/ditto.js";

const require = createRequire("/app/package.json");
const mqtt = require("mqtt");

const { values: args } = parseArgs({
  options: {
    "client-prefix": { type: "string" },
    count: { type: "string" },
    "start-index": { type: "string", default: "1" },
    concurrency: { type: "string", default: "20" },
  },
});

const prefix = args["client-prefix"];
const first = Number(args["start-index"]);
const clientIds = Array.from({ length: Number(args.count) }, (_, i) => `${prefix}${first + i}`);

await pool(clientIds, Number(args.concurrency), (clientId) =>
  new Promise((resolve, reject) => {
    const client = mqtt.connect(process.env.MQTT_BROKER ?? "mqtt://mosquitto:1883", {
      clientId,
      username: process.env.MQTT_USERNAME,
      password: process.env.MQTT_PASSWORD,
      clean: true,
      reconnectPeriod: 0,
    });
    client.once("connect", () => client.end(false, {}, resolve));
    client.once("error", reject);
  }),
);
console.log(`purged the MQTT sessions of ${clientIds.length} clients ${prefix}${first}..${first + clientIds.length - 1}`);
