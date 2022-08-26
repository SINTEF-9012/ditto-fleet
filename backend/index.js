// server/index.js

import {
  DittoNodeClient,
  NodeWebSocketBasicAuth,
} from "@eclipse-ditto/ditto-javascript-client-node";
import WebSocket from "ws";

import express from "express";

const PORT = process.env.PORT || 3001;

const app = express();

const ditto_domain = "localhost:8080";
const ditto_username = "ditto";
const ditto_password = "ditto";

let socket = new WebSocket("ws://ditto:ditto@localhost:8080/ws/2");

socket.onopen = function (e) {
  console.info("[open] Connection established");
  console.info("Sending to server");
  socket.send("START-SEND-EVENTS");

  const ditto_client = DittoNodeClient.newWebSocketClient()
    .withoutTls()
    .withDomain(ditto_domain)
    .withAuthProvider(
      NodeWebSocketBasicAuth.newInstance(ditto_username, ditto_password)
    )
    .withBuffer(15)
    .twinChannel()
    .build();

  const events_handle = ditto_client.getEventsHandle();

  try {
    events_handle.requestEvents().then(() => {
      events_handle.subscribeToAllEvents((event) => {
        console.info(event);
      });
    });
  } catch (error) {
    console.log("That did not go well.");
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
