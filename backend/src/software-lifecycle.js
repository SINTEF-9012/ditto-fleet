import WebSocket from "ws";

const FEATURE = "softwareManagement";
const DESIRED_PREFIX = `/features/${FEATURE}/desiredProperties`;

/** Reported fields each lifecycle stage owns, i.e. may write into the twin. */
export const STAGE_FIELDS = Object.freeze({
  installation: [
    "version",
    "installationStatus",
    "installationFinishedAt",
    "installDurationMs",
    "lastError",
    "workflowId",
    "verificationStatus",
  ],
  verification: [
    "verificationStatus",
    "verificationChecks",
    "restartRequired",
    "verificationFinishedAt",
    "verifyDurationMs",
  ],
  monitoring: ["monitoredVersion", "monitoredAt"],
});

/**
 * The subset of a status that its stage may write. Installation may only reset the
 * verification status to "pending": passing or failing it is the verification stage's call.
 */
export function ownedFields(stage, reported) {
  const allowed = STAGE_FIELDS[stage];
  if (!allowed || !reported) return {};
  const fields = {};
  for (const key of allowed) {
    if (reported[key] === undefined) continue;
    if (stage === "installation" && key === "verificationStatus" && reported[key] !== "pending") {
      continue;
    }
    fields[key] = reported[key];
  }
  return fields;
}

export function isConverged(desired, reported) {
  return (
    Boolean(desired?.version) &&
    reported?.version === desired.version &&
    reported?.installationStatus === "installed" &&
    reported?.verificationStatus === "passed" &&
    (!desired.workflowId || reported?.workflowId === desired.workflowId)
  );
}

/** Failed installation or verification of the current workflow: waits for a new assignment, not a retry. */
export function isTerminalFailure(desired, reported) {
  return (
    reported?.workflowId === desired?.workflowId &&
    (reported?.installationStatus === "failed" || reported?.verificationStatus === "failed")
  );
}

function desiredPackagesAt(path, value) {
  if (path === `${DESIRED_PREFIX}/packages`) return value;
  if (path === DESIRED_PREFIX) return value?.packages;
  if (path === `/features/${FEATURE}`) return value?.desiredProperties?.packages;
  if (path === "/features") return value?.[FEATURE]?.desiredProperties?.packages;
  if (path === "/") return value?.features?.[FEATURE]?.desiredProperties?.packages;
  return undefined;
}

/** Software artefacts whose desired state a Ditto twin event changed, or null for any other event. */
export function desiredChangesFromEvent(frame) {
  const parts = typeof frame?.topic === "string" ? frame.topic.split("/") : [];
  if (parts.length < 6 || parts[2] !== "things" || parts[4] !== "events") return null;
  const action = parts[5];
  if (!["created", "modified", "merged"].includes(action)) return null;

  const path = frame.path || "/";
  let packageNames;
  if (path.startsWith(`${DESIRED_PREFIX}/packages/`)) {
    packageNames = [path.slice(`${DESIRED_PREFIX}/packages/`.length).split("/")[0]];
  } else {
    const packages = desiredPackagesAt(path, frame.value);
    if (packages === null || typeof packages !== "object") return null;
    packageNames = Object.keys(packages);
  }
  if (packageNames.length === 0) return null;

  return {
    thingId: `${parts[0]}:${parts[1]}`,
    action,
    packageNames,
    revision: frame.revision,
    eventTimestamp: frame.timestamp,
    correlationId: frame.headers?.["correlation-id"],
  };
}

export function parseStatus(message) {
  const feature = message?.features?.[FEATURE];
  const packages = feature?.properties?.packages;
  if (!message?.thingId || !message?.stage) return null;
  if (packages === null || typeof packages !== "object") return null;
  const names = Object.keys(packages);
  if (names.length !== 1) return null;
  const [packageName] = names;
  return {
    thingId: message.thingId,
    stage: message.stage,
    workflowId: message.workflowId,
    packageName,
    reported: packages[packageName] ?? {},
    desired: feature.desiredProperties?.packages?.[packageName],
    timing: message.timing ?? {},
  };
}

function createLimiter(max) {
  let active = 0;
  const queue = [];
  const next = () => {
    while (active < max && queue.length > 0) {
      const { task, resolve, reject } = queue.shift();
      active += 1;
      task()
        .then(resolve, reject)
        .finally(() => {
          active -= 1;
          next();
        });
    }
  };
  return (task) =>
    new Promise((resolve, reject) => {
      queue.push({ task, resolve, reject });
      next();
    });
}

function createKeyedQueue() {
  const tails = new Map();
  return (key, task) => {
    const previous = tails.get(key) ?? Promise.resolve();
    const current = previous.then(task);
    const settled = current.catch(() => {});
    tails.set(key, settled);
    settled.then(() => {
      if (tails.get(key) === settled) tails.delete(key);
    });
    return current;
  };
}

/**
 * Lifecycle service of the DT platform: turns desired-state changes into per-device
 * dispatches of the twin, writes device statuses back into the twin, and detects
 * convergence of desired and reported software state.
 */
export function startSoftwareLifecycle({
  dittoUrl,
  wsUrl = dittoUrl ? `${dittoUrl.replace(/^http/, "ws")}/ws/2` : null,
  username = "ditto",
  password = "ditto",
  namespace = "no.sintef.sct.giot",
  mqttClient,
  topicPrefix = "no.sintef.sct.giot.things",
  eventLog = () => {},
  reconcileIntervalMs = 0,
  staleAfterMs = 30000,
  httpConcurrency = 32,
  logger = console,
  fetchImpl = fetch,
  WebSocketImpl = WebSocket,
}) {
  const authorization = "Basic " + Buffer.from(`${username}:${password}`).toString("base64");
  const limit = createLimiter(httpConcurrency);
  const serialPerThing = createKeyedQueue();
  const tracked = new Map();
  const statusPrefix = `${topicPrefix}/software-status/`;
  let socket;
  let reconcileTimer;
  let closed = false;

  function entryFor(thingId, packageName) {
    const key = `${thingId}|${packageName}`;
    if (!tracked.has(key)) {
      tracked.set(key, { desired: {}, reported: {}, dispatchedAt: 0, convergedWorkflowId: null });
    }
    return tracked.get(key);
  }

  function request(method, path, { body, contentType, correlationId } = {}) {
    return limit(async () => {
      const headers = { Authorization: authorization };
      if (contentType) headers["Content-Type"] = contentType;
      if (correlationId) headers["correlation-id"] = correlationId;
      const started = performance.now();
      const response = await fetchImpl(`${dittoUrl}${path}`, { method, headers, body });
      const text = await response.text();
      return { ok: response.ok, status: response.status, text, ms: performance.now() - started };
    });
  }

  function publish(topic, message) {
    return new Promise((resolve, reject) => {
      mqttClient.publish(topic, JSON.stringify(message), { qos: 1 }, (err) =>
        err ? reject(err) : resolve(),
      );
    });
  }

  async function dispatch(thingId, reason) {
    const fields = encodeURIComponent(`thingId,attributes,features/${FEATURE}`);
    const response = await request("GET", `/api/2/things/${thingId}?fields=${fields}`);
    if (!response.ok) {
      eventLog({
        component: "lifecycle",
        event: "dispatch_failed",
        thingId,
        detail: { reason, httpStatus: response.status },
      });
      return;
    }
    const thing = JSON.parse(response.text);
    const feature = thing?.features?.[FEATURE] ?? {};
    await publish(`${topicPrefix}/downstream/${thingId}`, thing);
    const dispatchedAt = Date.now();
    for (const [packageName, desired] of Object.entries(feature.desiredProperties?.packages ?? {})) {
      const entry = entryFor(thingId, packageName);
      entry.desired = desired ?? {};
      entry.reported = { ...(feature.properties?.packages?.[packageName] ?? {}) };
      entry.dispatchedAt = dispatchedAt;
      eventLog({
        component: "lifecycle",
        event: "dispatched",
        thingId,
        package: packageName,
        workflowId: desired?.workflowId,
        detail: { reason, fetchMs: Math.round(response.ms) },
      });
    }
  }

  function handleEventFrame(frame) {
    const change = desiredChangesFromEvent(frame);
    if (!change) return Promise.resolve();
    eventLog({
      component: "lifecycle",
      event: "desired_event",
      thingId: change.thingId,
      package: change.packageNames.join(" "),
      workflowId: change.correlationId,
      detail: { action: change.action, revision: change.revision, eventTimestamp: change.eventTimestamp },
    });
    return dispatch(change.thingId, "event").catch((err) =>
      logger.error(`dispatch of ${change.thingId} failed: ${err.message}`),
    );
  }

  async function applyStatus(status, receivedAt) {
    const { thingId, packageName, stage } = status;
    const entry = entryFor(thingId, packageName);
    if (!entry.desired.workflowId && status.desired?.workflowId) {
      entry.desired = status.desired;
    }
    const workflowId = status.workflowId ?? entry.desired.workflowId;
    eventLog({
      component: "lifecycle",
      event: "status_received",
      thingId,
      package: packageName,
      stage,
      workflowId,
      detail: status.timing,
    });

    if (
      stage !== "monitoring" &&
      status.workflowId &&
      entry.desired.workflowId &&
      status.workflowId !== entry.desired.workflowId
    ) {
      eventLog({
        component: "lifecycle",
        event: "status_stale",
        thingId,
        package: packageName,
        stage,
        workflowId,
        detail: { currentWorkflowId: entry.desired.workflowId },
      });
      return;
    }

    const fields = ownedFields(stage, status.reported);
    if (Object.keys(fields).length === 0) return;
    const patch = { features: { [FEATURE]: { properties: { packages: { [packageName]: fields } } } } };
    const response = await request("PATCH", `/api/2/things/${thingId}`, {
      body: JSON.stringify(patch),
      contentType: "application/merge-patch+json",
      correlationId: workflowId,
    });
    eventLog({
      component: "lifecycle",
      event: response.ok ? "status_applied" : "apply_failed",
      thingId,
      package: packageName,
      stage,
      workflowId,
      detail: {
        httpStatus: response.status,
        patchMs: Math.round(response.ms),
        sinceReceivedMs: Date.now() - receivedAt,
      },
    });
    if (!response.ok) return;

    for (const [key, value] of Object.entries(fields)) {
      if (value === null) delete entry.reported[key];
      else entry.reported[key] = value;
    }
    if (
      isConverged(entry.desired, entry.reported) &&
      entry.convergedWorkflowId !== entry.desired.workflowId
    ) {
      entry.convergedWorkflowId = entry.desired.workflowId;
      eventLog({
        component: "lifecycle",
        event: "converged",
        thingId,
        package: packageName,
        workflowId: entry.desired.workflowId,
      });
    }
  }

  function enqueueStatus(status) {
    const receivedAt = Date.now();
    return serialPerThing(status.thingId, () => applyStatus(status, receivedAt)).catch((err) =>
      logger.error(`applying ${status.stage} status of ${status.thingId} failed: ${err.message}`),
    );
  }

  function handleStatusMessage(topic, payload) {
    if (!topic.startsWith(statusPrefix)) return Promise.resolve();
    let message;
    try {
      message = JSON.parse(payload.toString());
    } catch {
      return Promise.resolve();
    }
    const status = parseStatus(message);
    // A device may only report about itself: the thing id must match its topic.
    if (!status || topic !== `${statusPrefix}${status.thingId}`) return Promise.resolve();
    return enqueueStatus(status);
  }

  function recordMonitoredPackages(host, packageList) {
    const thingId = `${namespace}:${host}`;
    // dpkg reports Multi-Arch: same packages with an architecture suffix, e.g. "libssl3:amd64".
    const versions = new Map((packageList ?? []).map((p) => [String(p.name).split(":")[0], p.version]));
    const monitoredAt = new Date().toISOString();
    for (const key of tracked.keys()) {
      const [trackedThing, packageName] = key.split("|");
      if (trackedThing !== thingId || !versions.has(packageName)) continue;
      enqueueStatus({
        thingId,
        packageName,
        stage: "monitoring",
        reported: { monitoredVersion: versions.get(packageName), monitoredAt },
        timing: { source: "telegraf" },
      });
    }
  }

  async function reconcile() {
    const filter = encodeURIComponent(
      `and(eq(attributes/type,"physical_device"),exists(features/${FEATURE}/desiredProperties/packages))`,
    );
    const fields = encodeURIComponent(`thingId,features/${FEATURE}`);
    const now = Date.now();
    let cursor;
    do {
      const option = encodeURIComponent(cursor ? `size(200),cursor(${cursor})` : "size(200)");
      const response = await request(
        "GET",
        `/api/2/search/things?filter=${filter}&option=${option}&fields=${fields}`,
      );
      if (!response.ok) {
        logger.warn(`reconciliation search failed: HTTP ${response.status}`);
        return;
      }
      const page = JSON.parse(response.text);
      for (const thing of page.items ?? []) {
        const feature = thing.features?.[FEATURE] ?? {};
        const pending = Object.entries(feature.desiredProperties?.packages ?? {}).some(
          ([packageName, desired]) => {
            const reported = feature.properties?.packages?.[packageName];
            const entry = tracked.get(`${thing.thingId}|${packageName}`);
            const recentlyDispatched = entry && now - entry.dispatchedAt < staleAfterMs;
            return (
              !isConverged(desired, reported) &&
              !isTerminalFailure(desired, reported) &&
              !recentlyDispatched
            );
          },
        );
        if (pending) await dispatch(thing.thingId, "reconcile");
      }
      cursor = page.cursor;
    } while (cursor);
  }

  function connectEvents() {
    if (!wsUrl || closed) return;
    socket = new WebSocketImpl(wsUrl, { headers: { Authorization: authorization } });
    socket.on("open", () => {
      const filter = encodeURIComponent('eq(attributes/type,"physical_device")');
      socket.send(
        `START-SEND-EVENTS?namespaces=${namespace}&extraFields=attributes/type&filter=${filter}`,
      );
    });
    socket.on("message", (data) => {
      const text = data.toString();
      if (text.startsWith("START-SEND-EVENTS:ACK")) {
        logger.info("subscribed to Ditto twin events for software lifecycle management");
        return;
      }
      let frame;
      try {
        frame = JSON.parse(text);
      } catch {
        return;
      }
      handleEventFrame(frame);
    });
    socket.on("close", () => {
      if (!closed) setTimeout(connectEvents, 2000);
    });
    socket.on("error", (err) => logger.warn(`Ditto event stream error: ${err.message}`));
  }

  const subscribe = () => mqttClient.subscribe(`${statusPrefix}+`, { qos: 1 });
  if (mqttClient.connected) subscribe();
  mqttClient.on("connect", subscribe);
  mqttClient.on("message", (topic, payload) => {
    handleStatusMessage(topic, payload);
  });

  connectEvents();
  if (reconcileIntervalMs > 0) {
    reconcileTimer = setInterval(() => {
      reconcile().catch((err) => logger.warn(`reconciliation failed: ${err.message}`));
    }, reconcileIntervalMs);
  }

  return {
    handleEventFrame,
    handleStatusMessage,
    recordMonitoredPackages,
    reconcile,
    close() {
      closed = true;
      clearInterval(reconcileTimer);
      socket?.close();
    },
  };
}
