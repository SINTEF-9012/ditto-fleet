// server/index.js

//import { DittoNodeClient } from "../build/node/src/ditto-node-client.js"
//import { NodeWebSocketBasicAuth, NodeHttpBasicAuth } from "@eclipse-ditto/ditto-javascript-client-node"
//import { DefaultSearchOptions } from "../build/api/src/options/request.options.js"
//import { Features, Thing } from "../build/model/things.model.js"

import {
  DittoNodeClient,
  NodeWebSocketBasicAuth,
  NodeHttpBasicAuth,
  DefaultSearchOptions,
  Features,
  Thing,
  connectionLostError
} from "@eclipse-ditto/ditto-javascript-client-node";

import WebSocket from "ws";
import mqtt from "mqtt";

import express from "express";
//import { connectionLostError } from "@eclipse-ditto/ditto-javascript-client-node";

const PORT = process.env.PORT || 3001;

const app = express();

//MQTT connection config
const mqtt_host = "localhost";
const mqtt_port = "1883";
const clientId = "ditto-fleet-backend";

const connectUrl = "mqtt://test.mosquitto.org:1883"; //test.mosquitto.org
const downstream_mqtt_topic = "no.sintef.sct.giot.things/downstream";
const upstream_mqtt_topic = "no.sintef.sct.giot.things/upstream";
const request_mqtt_topic = "no.sintef.sct.giot.things/request";

const mqtt_client = mqtt.connect(connectUrl, {
  clientId,
  clean: true,
  connectTimeout: 4000,
  reconnectPeriod: 1000,
});

mqtt_client.on("connect", () => {
  console.log("Connected to MQTT broker!");
  mqtt_client.subscribe([upstream_mqtt_topic, request_mqtt_topic], () => {
    console.log(
      `Subscribed to topics: '${upstream_mqtt_topic}', '${request_mqtt_topic}'`
    );
  });
});

mqtt_client.on("message", (topic, payload) => {
  console.log("Received MQTT message:", topic, payload.toString());
  if (topic === upstream_mqtt_topic) {
    //console.log("topic ok")
    //console.log(payload)
    //console.log(payload.toString())
    updateDeviceTwinProperties(JSON.parse(payload));
    //TODO: receive the device twin json and send it to Ditto. Make sure that this does not trigger an event to interfer with the change made via GUI.
  }
  if (topic === request_mqtt_topic) {
    //TODO: send all twins at once
    getAllDeviceTwins();
  }
});

//Ditto connection config
const ditto_domain = "localhost:8080";
const ditto_username = "ditto";
const ditto_password = "ditto";

let socket = new WebSocket("ws://ditto:ditto@localhost:8080/ws/2");

const ws_ditto_client = DittoNodeClient.newWebSocketClient()
  .withoutTls()
  .withDomain(ditto_domain)
  .withAuthProvider(
    NodeWebSocketBasicAuth.newInstance(ditto_username, ditto_password)
  )
  .withBuffer(15)
  .twinChannel()
  .build();

const http_ditto_client = DittoNodeClient.newHttpClient()
  .withoutTls()
  .withDomain(ditto_domain)
  .withAuthProvider(
    NodeHttpBasicAuth.newInstance(ditto_username, ditto_password)
  )
  //.withBuffer(15)
  //.twinChannel()
  .build();

async function sendDeviceTwin(thingId) {
  const thing = await ws_ditto_client.getThingsHandle().getThing(thingId);
  //console.info(JSON.stringify(thing));
  console.log("REPORTED PROPERTIES: ", thing.features.agent.properties);
  console.log("DESIRED PROPERTIES: ", thing.features.agent.desiredProperties);
  //TODO: this is an ugly fix
  if ((thing.features.agent.desiredProperties.status !== "") && (thing.features.agent.properties.status !==
    thing.features.agent.desiredProperties.status)) {
    mqtt_client.publish(
      downstream_mqtt_topic,
      JSON.stringify(thing),
      { qos: 0, retain: false },
      (error) => {
        if (error) {
          console.error(error);
        }
      }
    );
  } else {
    console.log(
      "Trust agent already in sync or not assigned yet, not sending device twin to dowsntream channel."
    );
  }
}

async function updateDeviceTwinProperties(twin) {
  Object.entries(twin.features).forEach(([key, value]) => {
    console.log(JSON.stringify(key));
    console.log(JSON.stringify(value.properties));
    http_ditto_client
      .getFeaturesHandle(twin.thingId)
      .putProperties(key, value.properties); //value.properties
  });
}

async function getAllDeviceTwins() {
  //TODO: better structure the code!
  const searchHandle = http_ditto_client.getSearchHandle();

  var options = DefaultSearchOptions.getInstance()
    .withFilter('eq(attributes/type,"device")')
    .withSort("+thingId")
    .withLimit(0, 200);
  //searchHandle.search(options).then(result => console.log("returned",result.items))
  var devices = (await searchHandle.search(options)).items;
  console.info("DEVICES: ", devices);
  devices.forEach((device) => {
    //console.info(JSON.stringify(device));
    mqtt_client.publish(
      downstream_mqtt_topic,
      JSON.stringify(device),
      { qos: 0, retain: false },
      (error) => {
        if (error) {
          console.error(error);
        }
      }
    );
  });
}

socket.onopen = function (e) {
  console.info("[open] Connection established");
  console.info("Sending to server");
  socket.send("START-SEND-EVENTS");

  const events_handle = ws_ditto_client.getEventsHandle();

  try {
    events_handle.requestEvents().then(() => {
      events_handle.subscribeToAllEvents((event) => {
        console.info("Message received via Ditto event handler", event);
        //TODO: this is an ugly workaround, remove the hard-coded mentioning of "agent".
        if (
          event.action === "modified" &&
          (event.path.includes("desiredProperties") ||
            event.path.includes("agent/properties"))
        ) {
          const name_array = event.topic.split("/");
          console.info("Device Id: " + name_array[0] + ":" + name_array[1]);
          console.info("Feature changed: " + JSON.stringify(event.value));

          sendDeviceTwin(name_array[0] + ":" + name_array[1]);
        }
      });
    });
  } catch (error) {
    console.error("That did not go well.");
  }
};

socket.onmessage = function (event) {
  console.info(`[message] Data received from server: ${event.data}`);
};

socket.onclose = function (event) {
  if (event.wasClean) {
    console.info(
      `[close] Connection closed cleanly, code=${event.code} reason=${event.reason}`
    );
  } else {
    // e.g. server process killed or network down
    // event.code is usually 1006 in this case
    console.info("[close] Connection died");
  }
};

socket.onerror = function (error) {
  console.error(`[error] ${error.message}`);
};

app.listen(PORT, () => {
  console.log(`Server listening on ${PORT}`);
});
