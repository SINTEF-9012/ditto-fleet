// server/index.js

import {
  DittoNodeClient,
  NodeWebSocketBasicAuth,
  Thing,
} from "@eclipse-ditto/ditto-javascript-client-node";
import WebSocket from "ws";
import mqtt from "mqtt";

import express from "express";

const PORT = process.env.PORT || 3001;

const app = express();

//MQTT connection config
const mqtt_host = "localhost";
const mqtt_port = "1883";
const clientId = "ditto-fleet-backend";

const connectUrl = "mqtt://test.mosquitto.org:1883"; //test.mosquitto.org
const downstream_mqtt_topic = "no.sintef.sct.giot.things/downstream";
const upstream_mqtt_topic = "no.sintef.sct.giot.things/upstream";

const mqtt_client = mqtt.connect(connectUrl, {
  clientId,
  clean: true,
  connectTimeout: 4000,
  reconnectPeriod: 1000,
});

mqtt_client.on("connect", () => {
  console.log("Connected to MQTT broker!");
  mqtt_client.subscribe([upstream_mqtt_topic], () => {
    console.log(`Subscribe to topic '${upstream_mqtt_topic}'`);
  });
});

mqtt_client.on("message", (topic, payload) => {
  console.log("Received MQTT message:", topic, payload.toString());
  updateDeviceTwin(JSON.parse(payload));
  //TODO: receive the device twin json and send it to Ditto. Make sure that this does not trigger an event to interfer with the change made via GUI.
});

//Ditto connection config
const ditto_domain = "localhost:8080";
const ditto_username = "ditto";
const ditto_password = "ditto";

let socket = new WebSocket("ws://ditto:ditto@localhost:8080/ws/2");

const ditto_client = DittoNodeClient.newWebSocketClient()
  .withoutTls()
  .withDomain(ditto_domain)
  .withAuthProvider(
    NodeWebSocketBasicAuth.newInstance(ditto_username, ditto_password)
  )
  .withBuffer(15)
  .twinChannel()
  .build();

async function sendDeviceTwin(thingId) {
  const thing = await ditto_client.getThingsHandle().getThing(thingId);
  console.info(JSON.stringify(thing));
  //TODO: send an MQTT message to Hui
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
}

async function updateDeviceTwin(twin) {
  
  console.log(twin);
  const thing = Thing.fromObject(twin);  
  await ditto_client.getThingsHandle().putThing(thing);
  //console.info(JSON.stringify(thing));
  //TODO: send an MQTT message to Hui
  //mqtt_client.publish(
  //  downstream_mqtt_topic,
  //  JSON.stringify(thing),
  //  { qos: 0, retain: false },
  //  (error) => {
  //    if (error) {
  //      console.error(error);
  //    }
  //  }
  //);
}

socket.onopen = function (e) {
  console.info("[open] Connection established");
  console.info("Sending to server");
  socket.send("START-SEND-EVENTS");

  const events_handle = ditto_client.getEventsHandle();

  try {
    events_handle.requestEvents().then(() => {
      events_handle.subscribeToAllEvents((event) => {
        console.info("Message received via Ditto event handler", event);
        if (event.action === "modified") {
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
