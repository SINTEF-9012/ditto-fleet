// server/index.js

import {
  DittoNodeClient,
  NodeWebSocketBasicAuth,
  Thing,
} from "@eclipse-ditto/ditto-javascript-client-node";
import WebSocket from "ws";

import fs from "fs";

//Ditto connection config
const ditto_domain = "localhost:8080";
const ditto_username = "ditto";
const ditto_password = "ditto";

let socket = new WebSocket("ws://ditto:ditto@localhost:8080/ws/2");

const ditto_client = DittoNodeClient.newHttpClient()
  .withoutTls()
  .withDomain(ditto_domain)
  .withAuthProvider(
    NodeWebSocketBasicAuth.newInstance(ditto_username, ditto_password)
  )
  .build();

const data = fs.readFileSync("../ditto-scripts/fleet_model.json", "utf8");
console.log(data);
//if (data.charCodeAt(0) === 0xFEFF) {
//  data = data.substr(1);
//}
const model = JSON.parse(data);

model.devices.forEach((device) => createTwin(device));
model.agents.forEach((agent) => createTwin(agent));

async function createTwin(json) {
  console.log(json)
  var twin = Thing.fromObject(json);
  console.log(twin);
  const thingsHandle = ditto_client.getThingsHandle();
  thingsHandle
    .putThing(twin)
    .then((result) =>
      console.log(
        `Finished putting the new twin with result: ${JSON.stringify(result)}`
      )
    );
}
