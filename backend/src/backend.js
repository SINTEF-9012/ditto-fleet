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

import schedule from "node-schedule";
import _ from "lodash";

const PORT = process.env.PORT || 3001;

const app = express();

const logger = winston_logger.child({ source: "backend.js" });

//MQTT connection config
const mqtt_host = "localhost";
const mqtt_port = "1883";
const clientId = "ditto-fleet-backend";

//const connectUrl = "mqtt://test.mosquitto.org:1883"; //test.mosquitto.org
const connectUrl = "mqtt://localhost:1883"; 
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
    //FIXME: this is not how the digital twin is supposed to be updated!
    updateTwinProperties(JSON.parse(payload));
    //TODO: receive the device twin json and send it to Ditto. Make sure that this does not trigger an event to interfer with the change made via GUI.
  }
  if (topic === request_mqtt_topic) {
    //TODO: send all twins at once
    //FIXME: this is not needed anymore?
    getAllDeviceTwins();
  }
  if (topic.includes("ditto-monitoring-agent")) {
    //console.debug("Topic name: " + topic);
    const obj = JSON.parse(payload.toString());
    if (topic.endsWith("docker_container_status")) {
      // logger.debug("Received from monitoring agent: ");
      // logger.debug(JSON.parse(payload.toString()))
      //const obj = JSON.parse(payload.toString());
      let ta = {
        container_image: obj.tags.container_image,
        container_status: obj.tags.container_status,
        container_version: obj.tags.container_version,
      };
      updateTwinProperty(obj.tags.host, "cyber", "trustAgent", ta);
    } else if (topic.endsWith("docker")) {
      //logger.debug("[Monitoring agent] Received Docker stats: " + payload.toString())
      let docker = {
        engine_host: obj.tags.engine_host,
        server_version: obj.tags.server_version,
      };
      updateTwinProperty(obj.tags.host, "cyber", "docker", docker);
    } else if (topic.endsWith("mem")) {
      //logger.debug("[Monitoring agent] Received memory stats: " + payload.toString());
      let mem = {
        active: obj.fields.usage_guest,
        available: obj.fields.usage_guest_nice,
        available_percent: obj.fields.usage_idle,
        buffered: obj.fields.usage_iowait,
        cached: obj.fields.usage_irq,
        commit_limit: obj.fields.usage_nice,
        committed_as: obj.fields.usage_softirq,
        dirty: obj.fields.usage_steal,
        free: obj.fields.usage_system,
        high_free: obj.fields.high_free,
        high_total: obj.fields.high_total,
        huge_page_size: obj.fields.huge_page_size,
        huge_pages_free: obj.fields.huge_pages_free,
        huge_pages_total: obj.fields.huge_pages_total,
        inactive: obj.fields.inactive,
        low_free: obj.fields.low_free,
        low_total: obj.fields.low_total,
        mapped: obj.fields.mapped,
        page_tables: obj.fields.page_tables,
        shared: obj.fields.shared,
        slab: obj.fields.slab,
        sreclaimable: obj.fields.sreclaimable,
        sunreclaim: obj.fields.sunreclaim,
        swap_cached: obj.fields.swap_cached,
        swap_free: obj.fields.swap_free,
        swap_total: obj.fields.swap_total,
        total: obj.fields.total,
        used: obj.fields.used,
        used_percent: obj.fields.used_percent,
        vmalloc_chunk: obj.fields.vmalloc_chunk,
        vmalloc_total: obj.fields.vmalloc_total,
        vmalloc_used: obj.fields.vmalloc_used,
        write_back: obj.fields.write_back,
        write_back_tmp: obj.fields.write_back_tmp,
      };
      updateTwinProperty(obj.tags.host, "cyber", "memory", mem);
    } else if (topic.endsWith("cpu")) {
      //logger.debug("[Monitroing agent] Received CPU stats: " + payload.toString());
      let cpu = {
        usage_guest: obj.fields.usage_guest,
        usage_guest_nice: obj.fields.usage_guest_nice,
        usage_idle: obj.fields.usage_idle,
        usage_iowait: obj.fields.usage_iowait,
        usage_irq: obj.fields.usage_irq,
        usage_nice: obj.fields.usage_nice,
        usage_softirq: obj.fields.usage_softirq,
        usage_steal: obj.fields.usage_steal,
        usage_system: obj.fields.usage_system,
        usage_user: obj.fields.usage_user,
      };
      updateTwinProperty(obj.tags.host, "cyber", "cpu", cpu);
    } else if (topic.endsWith("disk")) {
      logger.debug(
        "[Monitoring agent] Received disk stats: " + payload.toString()
      );
      let disk = {
        free: obj.fields.free,
        inodes_free: obj.fields.inodes_free,
        inodes_total: obj.fields.inodes_total,
        inodes_used: obj.fields.inodes_used,
        total: obj.fields.total,
        used: obj.fields.used,
        used_percent: obj.fields.used_percent,
      };
      updateTwinProperty(obj.tags.host, "cyber", "disk", disk);
    } else if (topic.endsWith("temp")) {
      //logger.debug("[Monitroing agent] Received temperature stats: " + payload.toString());
      //TODO: real fields from measurements
      let temp = {};
      updateTwinProperty(obj.tags.host, "physical", "temp", temp);
    } else if (topic.endsWith("internet_speed")) {
      //logger.debug("[Monitoring agent] Received internet_speed stats: " + payload.toString());
      let speed = {
        ip_address: obj.tags.ip_address,
        download: obj.fields.download,
        jitter: obj.fields.jitter,
        latency: obj.fields.latency,
        location: obj.fields.location,
        upload: obj.fields.upload,
      };
      updateTwinProperty(obj.tags.host, "cyber", "internet_speed", speed);
    } else if (topic.endsWith("procstat_lookup")) {
      // logger.debug(
      //   "[Monitoring agent] Received procstat_lookup stats: " +
      //     payload.toString()
      // );
      //TODO: finish when the ssh script is ready
      let ta = {
        name: "trust-agent.sh",
        status: obj.fields.running === 1 ? "running" : "stopped",
      };

      //updateTwinProperty(
      //  obj.tags.host,
      //  "cyber",
      //  "trust_agent",
      //  ta
      //);
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

const job = schedule.scheduleJob("*/1 * * * *", checkDesiredReportedTrustAgent);

/** Fully update the digital twin in Ditto (i.e. all its reported properties within features). */
async function updateTwinProperties(twin) {
  Object.entries(twin.features).forEach(([key, value]) => {
    logger.debug(JSON.stringify(key));
    logger.debug(JSON.stringify(value.properties));
    http_ditto_client
      .getFeaturesHandle(twin.thingId)
      .putProperties(key, value.properties);
  });
}

/** Update the value of a property in Ditto with a value reported from the monitoring agent. */
async function updateTwinProperty(
  thingId,
  feature,
  propertyPath,
  propertyValue
) {
  const thingsHandle = http_ditto_client.getThingsHandle();
  try {
    let thing = await thingsHandle.getThing(namespace + ":" + thingId);
    //logger.debug("Found matching device twin: " + thing.thingId);
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
  } catch (error) {
    logger.error(error.message);
  }
}

/** Fetch a device twin from Ditto and publish it to the downstream MQTT channel.*/
async function sendDeviceTwin(thingId) {
  const thing = await ws_ditto_client.getThingsHandle().getThing(thingId);
  logger.debug("[Ditto] Device twin: " + JSON.stringify(thing));
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

/** Fetch all device twins from Ditto and publish them to the downstream MQTT channel. */
async function getAllDeviceTwins() {
  //TODO: better structure the code! Use sendDeviceTwin function instead of repeating the same code!
  const searchHandle = http_ditto_client.getSearchHandle();
  var options = DefaultSearchOptions.getInstance()
    .withFilter('eq(attributes/type,"device")')
    .withSort("+thingId")
    .withLimit(0, 200);
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

/** Check if the desired and reported properties related to the Trust Agent are equal. */
async function checkDesiredReportedTrustAgent() {
  const searchHandle = http_ditto_client.getSearchHandle();

  var options = DefaultSearchOptions.getInstance()
    .withFilter('eq(attributes/type,"device")')
    .withSort("+thingId")
    .withLimit(0, 200);
  var devices = (await searchHandle.search(options)).items;
  devices.forEach((device) => {
    // iterate through cyber, physical, and social
    logger.debug("DESIRED VS REPORED" + JSON.stringify(device._features));
    let desiredTrustAgent =
      device._features.cyber._desiredProperties.trustAgent;
    let reportedTrustAgent = device._features.cyber._properties.trustAgent;
    //logger.debug("desiredTrustAgent: " + JSON.stringify(desiredTrustAgent));
    //logger.debug("reportedTrustAgent: " + JSON.stringify(reportedTrustAgent));
    //logger.debug(
    //  JSON.stringify(desiredTrustAgent) === JSON.stringify(reportedTrustAgent)
    //);
    //logger.debug(desiredTrustAgent === reportedTrustAgent);

    //FIXME: check that desied propoerty is not empty! Or maybe it is ok...
    logger.debug(_.isMatch(reportedTrustAgent, desiredTrustAgent));
  });
}

socket.onopen = function (event) {
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
