// server/index.js

//import { DittoNodeClient } from "../build/node/src/ditto-node-client.js"
//import { NodeWebSocketBasicAuth, NodeHttpBasicAuth } from "@eclipse-ditto/ditto-javascript-client-node"
//import { DefaultSearchOptions } from "../build/api/src/options/request.options.js"
//import { Features, Thing } from "../build/model/things.model.js"

//import {
//  DittoNodeClient,
//  NodeWebSocketBasicAuth,
//  NodeHttpBasicAuth,
//  DefaultSearchOptions,
//  Features,
//  Thing,
//  connectionLostError
//} from "@eclipse-ditto/ditto-javascript-client-node";

//const DittoNodeClient = require("@eclipse-ditto/ditto-javascript-client-node").DittoNodeClient;

import {
  DittoNodeClient,
  NodeWebSocketBasicAuth,
  NodeHttpBasicAuth,
  DefaultSearchOptions,
  Features,
  Thing,
  connectionLostError,
} from "@eclipse-ditto/ditto-javascript-client-node";
//import {  } from "../dist/node/dist/node/src/node-auth.js";
//"@eclipse-ditto/ditto-javascript-client-dom";

import { logger as winston_logger } from "./logger.js";

import WebSocket from "ws";
import mqtt from "mqtt";

import express from "express";
//import { connectionLostError } from "@eclipse-ditto/ditto-javascript-client-node";

const PORT = process.env.PORT || 3001;

const app = express();

const logger = winston_logger.child({ source: 'Backend' });

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
  logger.info("[MQTT] Connected to MQTT broker!");
  mqtt_client.subscribe([upstream_mqtt_topic, request_mqtt_topic], () => {
    logger.info(
      `[MQTT] Subscribed to topics: '${upstream_mqtt_topic}', '${request_mqtt_topic}'`
    );
  });
});

mqtt_client.on("message", (topic, payload) => {
  logger.debug("[MQTT] Received MQTT message:", topic, payload.toString());
  if (topic === upstream_mqtt_topic) {
    //logger.debug("topic ok")
    //logger.debug(payload)
    //logger.debug(payload.toString())
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
  //logger.info(JSON.stringify(thing));
  logger.info("[Ditto] Reportted properties: ", thing.features.agent.properties);
  logger.info("[Ditto] Desired properties: ", thing.features.agent.desiredProperties);
  //TODO: this is an ugly fix
  if (
    thing.features.agent.desiredProperties.status !== "" &&
    thing.features.agent.properties.status !==
      thing.features.agent.desiredProperties.status
  ) {
    mqtt_client.publish(
      downstream_mqtt_topic,
      JSON.stringify(thing),
      { qos: 0, retain: false },
      (error) => {
        if (error) {
          logger.error(error.message);
        }
      }
    );
  } else {
    logger.info(
      "Trust agent already in sync or not assigned yet, not sending device twin to dowsntream channel."
    );
  }
}

async function updateDeviceTwinProperties(twin) {
  Object.entries(twin.features).forEach(([key, value]) => {
    logger.debug(JSON.stringify(key));
    logger.debug(JSON.stringify(value.properties));
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
  //searchHandle.search(options).then(result => logger.debug("returned",result.items))
  var devices = (await searchHandle.search(options)).items;
  logger.debug("[Ditto] All devices: ", devices);
  devices.forEach((device) => {
    //logger.info(JSON.stringify(device));
    mqtt_client.publish(
      downstream_mqtt_topic,
      JSON.stringify(device),
      { qos: 0, retain: false },
      (error) => {
        if (error) {
          logger.error(error.message);
        }
      }
    );
  });
}

socket.onopen = function (e) {
  logger.info("[WebSocket] Connected to Ditto server via WebSocket");
  logger.info("[WebSocket] Initiating WebSocket commun ication with START-SEND-EVENTS");
  socket.send("START-SEND-EVENTS");

  const events_handle = ws_ditto_client.getEventsHandle();

  try {
    events_handle.requestEvents().then(() => {
      events_handle.subscribeToAllEvents((event) => {
        logger.debug("Message received via Ditto event handler", event.message);
        //TODO: this is an ugly workaround, remove the hard-coded mentioning of "agent".
        if (
          event.action === "modified" &&
          (event.path.includes("desiredProperties") ||
            event.path.includes("agent/properties"))
        ) {
          const name_array = event.topic.split("/");
          logger.debug("Device Id: " + name_array[0] + ":" + name_array[1]);
          logger.debug("Feature changed: " + JSON.stringify(event.value));

          sendDeviceTwin(name_array[0] + ":" + name_array[1]);
        }
      });
    });
  } catch (error) {
    logger.error(error.message);
  }
};

socket.onmessage = function (event) {
  logger.debug(`[WebSocket] Data received from Ditto via WebSocket: ${event.data}`);
};

socket.onclose = function (event) {
  if (event.wasClean) {
    loger.info(
      `[WebSocket] Connection closed cleanly, code=${event.code} reason=${event.reason}`
    );
  } else {
    // e.g. server process killed or network down
    // event.code is usually 1006 in this case
    logger.warn("[WebSocket] Connection died");
  }
};

socket.onerror = function (error) {
  logger.error(error.message);
};

app.listen(PORT, () => {
  logger.info(`Server listening on ${PORT}`);
});
