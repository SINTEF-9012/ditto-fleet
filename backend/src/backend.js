// server/backend.js

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
import { TimePicker } from "antd";
//import { connectionLostError } from "@eclipse-ditto/ditto-javascript-client-node";

import schedule from 'node-schedule';
import _ from 'lodash';

const PORT = process.env.PORT || 3001;

const app = express();

const logger = winston_logger.child({ source: "backend.js" });

//MQTT connection config
const mqtt_host = "localhost";
const mqtt_port = "1883";
const clientId = "ditto-fleet-backend";

const connectUrl = "mqtt://test.mosquitto.org:1883"; //test.mosquitto.org
const downstream_mqtt_topic = "no.sintef.sct.giot.things/downstream";
const upstream_mqtt_topic = "no.sintef.sct.giot.things/upstream";
const request_mqtt_topic = "no.sintef.sct.giot.things/request";
const monitoring_agent_mqtt_topic = "ditto-monitoring-agent/+/+";
const namespace = "no.sintef.sct.giot";

const mqtt_client = mqtt.connect(connectUrl, {
  clientId,
  clean: true,
  connectTimeout: 4000,
  reconnectPeriod: 1000,
});


mqtt_client.on("connect", () => {
  logger.info("[MQTT] Connected to MQTT broker!");
  mqtt_client.subscribe(
    [upstream_mqtt_topic, request_mqtt_topic, monitoring_agent_mqtt_topic],
    () => {
      logger.info(
        `[MQTT] Subscribed to topics: '${upstream_mqtt_topic}', '${request_mqtt_topic}', '${monitoring_agent_mqtt_topic}'`
      );
    }
  );
});

mqtt_client.on("message", (topic, payload) => {
  logger.debug("[MQTT] Received via " + topic + ": " + payload.toString());
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
  if (topic.includes("ditto-monitoring-agent")) {
    //console.debug("Topic name: " + topic);
    const obj = JSON.parse(payload.toString());
    if (topic.includes("docker_container_status")) {
      // logger.debug("Received from monitoring agent: ");
      // logger.debug(JSON.parse(payload.toString()))
      //const obj = JSON.parse(payload.toString());
      updateReportedProperty(
        obj.tags.host,
        "cyber",
        "trustAgent/container_image",
        obj.tags.container_image
      );
      updateReportedProperty(
        obj.tags.host,
        "cyber",
        "trustAgent/container_status",
        obj.tags.container_status
      );
      updateReportedProperty(
        obj.tags.host,
        "cyber",
        "trustAgent/container_version",
        obj.tags.container_version
      );
    } else if (topic.includes("mem")) {
      //logger.debug("Received memory stats: " + payload.toString());
      updateReportedProperty(
        obj.tags.host,
        "cyber",
        "memory/used_percentage",
        obj.fields.used_percent
      );
    } else if (topic.includes("cpu")) {
      //logger.debug("Received CPU stats: " + payload.toString());
      updateReportedProperty(
        obj.tags.host,
        "cyber",
        "cpu/usage_system",
        obj.fields.usage_system
      );
      updateReportedProperty(
        obj.tags.host,
        "cyber",
        "cpu/usage_user",
        obj.fields.usage_user
      );
    } else if (topic.includes("temp")) {
      //logger.debug("Received temperature stats: " + payload.toString());
      updateReportedProperty(
        obj.tags.host,
        "physical",
        "temp/cpu_temp",
        obj.fields.temp
      );
    } else if (topic.includes("internet_speed")) {
      //logger.debug("Received internet_speed stats: " + payload.toString());
      updateReportedProperty(
        obj.tags.host,
        "cyber",
        "network/latency",
        obj.fields.latency
      );
      updateReportedProperty(
        obj.tags.host,
        "cyber",
        "network/download",
        obj.fields.download
      );
      updateReportedProperty(
        obj.tags.host,
        "cyber",
        "network/upload",
        obj.fields.upload
      );
    }
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

  const job = schedule.scheduleJob("*/1 * * * *", checkAllDesiredReportedProperties);
  

async function sendDeviceTwin(thingId) {
  const thing = await ws_ditto_client.getThingsHandle().getThing(thingId);
  //logger.info(JSON.stringify(thing));
  //logger.info("[Ditto] Reported properties: ", thing.features.agent.properties);
  //logger.info(
  //  "[Ditto] Desired properties: ",
  //  thing.features.agent.desiredProperties
  //);

  //TODO: this is an ugly fix - it is not needed?
  //if (
  //  thing.features.agent.desiredProperties.status !== "" &&
  //  thing.features.agent.properties.status !==
  //    thing.features.agent.desiredProperties.status
  //) {
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
  logger.info(
    "Device twin with updated desired properties sent to the dowsntream channel."
  );
  //} else {
  //  logger.info(
  //    "Trust agent already in sync or not assigned yet, not sending device twin to dowsntream channel."
  //  );
  //}
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

async function updateReportedProperty(
  thingId,
  feature,
  propertyPath,
  propertyValue
) {
  const thingsHandle = http_ditto_client.getThingsHandle();
  try {
    let thing = await thingsHandle.getThing(namespace + ":" + thingId);
    logger.debug("Found matching device twin: " + thing.thingId);
    //FIXME: think how to better implement this check for an existing unchanged value
    //if (
    //  propertyValue !==
    //  thing.features[feature].properties[propertyPath.split("/")[0]][
    //    propertyPath.split("/")[1]
    //  ]
    //) {
    await http_ditto_client
      .getFeaturesHandle(thing.thingId)
      .putProperty(feature, propertyPath, propertyValue);
    //} else {
    //  logger.debug(
    //    propertyPath +
    //      " of " +
    //      thing.thingId +
    //      " is already in the reported state: " +
    //      propertyValue
    //  );
    //}
  } catch (err) {
    logger.error(err.message);
  }
}

async function getDeviceTwin(id) {
  //logger.debug("Device twin id: " + id);
  const thingsHandle = http_ditto_client.getThingsHandle();

  try {
    return await thingsHandle.getThing(namespace + ":" + id);
  } catch (err) {
    logger.error("Device twin was not found!", err.message);
  }
  //TODO: check the twin syntax and update more fields!
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

async function checkAllDesiredReportedProperties() {

  //THIS IS
  logger.debug("STARTING CRONE JOB!");
  const searchHandle = http_ditto_client.getSearchHandle();

  var options = DefaultSearchOptions.getInstance()
    .withFilter('eq(attributes/type,"device")')
    .withSort("+thingId")
    .withLimit(0, 200);
  var devices = (await searchHandle.search(options)).items;
  devices.forEach((device) => {
    // iterate through cyber, physical, and social
    logger.debug(JSON.stringify(device._features))
    let desiredTrustAgent = device._features.cyber._desiredProperties.trustAgent
    let reportedTrustAgent = device._features.cyber._properties.trustAgent
    logger.debug("desiredTrustAgent: " + JSON.stringify(desiredTrustAgent));
    logger.debug("reportedTrustAgent: " + JSON.stringify(reportedTrustAgent));
    logger.debug(JSON.stringify(desiredTrustAgent) === JSON.stringify(reportedTrustAgent));
    logger.debug(desiredTrustAgent === reportedTrustAgent);
    logger.debug(_.isEqual(desiredTrustAgent, reportedTrustAgent))
  });
}

socket.onopen = function (e) {
  logger.info("[WebSocket] Connected to Ditto server via WebSocket");
  socket.send("START-SEND-EVENTS");
  logger.info(
    "[WebSocket] Initiating WebSocket communication with START-SEND-EVENTS"
  );

  const events_handle = ws_ditto_client.getEventsHandle();

  try {
    events_handle.requestEvents().then(() => {
      events_handle.subscribeToAllEvents((event) => {
        logger.debug("Message received via Ditto event handler", event.message);
        if (
          event.action === "modified" &&
          //event.path.includes("/features/cyber/desiredProperties/trustAgent")
          event.path.includes("desiredProperties")
        ) {
          const name_array = event.topic.split("/");
          logger.debug("Device Id: " + name_array[0] + ":" + name_array[1]);
          logger.debug(
            "Desired property " +
              JSON.stringify(event.value) +
              " changed to: " +
              JSON.stringify(event.value)
          );
          sendDeviceTwin(name_array[0] + ":" + name_array[1]);
        }
      });
    });
  } catch (error) {
    logger.error(error.message);
  }
};

socket.onmessage = function (event) {
  logger.debug(
    `[WebSocket] Data received from Ditto via WebSocket: ${event.data}`
  );
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
