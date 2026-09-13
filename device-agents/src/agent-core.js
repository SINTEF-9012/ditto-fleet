import mqtt from "mqtt";

/**
 * Persistent MQTT session (clean: false, QoS 1) so that update requests published
 * while a device is offline are delivered once it reconnects.
 */
export function connect({
  brokerUrl,
  username,
  password,
  clientId,
  topics = [],
  onMessage,
  log = console,
}) {
  const client = mqtt.connect(brokerUrl, {
    clientId,
    username,
    password,
    clean: false,
    reconnectPeriod: 2000,
    connectTimeout: 30000,
  });
  client.on("connect", () => {
    if (topics.length === 0) return;
    const subscriptions = Object.fromEntries(
      topics.map((topic) => [topic, { qos: 1 }]),
    );
    client.subscribe(subscriptions, (err) => {
      if (err) log.error(`[${clientId}] subscribe failed: ${err.message}`);
    });
  });
  client.on("message", (topic, payload) => {
    let message;
    try {
      message = JSON.parse(payload.toString());
    } catch {
      log.warn(`[${clientId}] ignoring non-JSON message on ${topic}`);
      return;
    }
    onMessage?.(topic, message);
  });
  client.on("error", (err) =>
    log.error(`[${clientId}] MQTT error: ${err.message}`),
  );
  return client;
}

export function publishJson(client, topic, message) {
  return new Promise((resolve, reject) => {
    client.publish(topic, JSON.stringify(message), { qos: 1 }, (err) =>
      err ? reject(err) : resolve(),
    );
  });
}

/** Runs tasks one at a time, so a device never works on two updates concurrently. */
export function serialQueue(log = console) {
  let tail = Promise.resolve();
  return (task) => {
    tail = tail.then(task).catch((err) => log.error(err?.stack ?? String(err)));
    return tail;
  };
}
