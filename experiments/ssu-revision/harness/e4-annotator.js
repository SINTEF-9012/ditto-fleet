// E4 — a lifecycle component added without changing existing ones: annotates every emulated twin
// with the known vulnerabilities of its currently reported OpenSSL version. Its only interface to
// the rest of the system is the twin (Ditto events in, merge patches out).
import fs from "node:fs";
import { createRequire } from "node:module";
import { parseArgs } from "node:util";
import { compareVersions } from "/app/src/debian-version.js";
import { createEventLog } from "/app/src/TimestampLogger.js";
import { ditto } from "./lib/ditto.js";

const require = createRequire("/app/package.json");
const WebSocket = require("ws");

const { values: args } = parseArgs({
  options: {
    feed: { type: "string", default: "/harness/data/cve-feed.json" },
    log: { type: "string", default: "/results/e4-annotator.csv" },
  },
});

const feed = JSON.parse(fs.readFileSync(args.feed, "utf8"));
const eventLog = createEventLog(args.log);
const PACKAGES = "/features/softwareManagement/properties/packages";

function versionsIn(packages) {
  const versions = {};
  for (const [name, entry] of Object.entries(packages ?? {})) {
    if (typeof entry?.version === "string") versions[name] = entry.version;
  }
  return versions;
}

/** Reported package versions carried by a twin event, whatever level of the twin was written. */
export function reportedVersions(frame) {
  const path = frame.path || "/";
  const value = frame.value;
  if (path === "/") return versionsIn(value?.features?.softwareManagement?.properties?.packages);
  if (path === "/features") return versionsIn(value?.softwareManagement?.properties?.packages);
  if (path === "/features/softwareManagement") return versionsIn(value?.properties?.packages);
  if (path === "/features/softwareManagement/properties") return versionsIn(value?.packages);
  if (path === PACKAGES) return versionsIn(value);
  if (path.startsWith(`${PACKAGES}/`)) {
    const [name, field] = path.slice(PACKAGES.length + 1).split("/");
    if (field === undefined) return versionsIn({ [name]: value });
    if (field === "version" && typeof value === "string") return { [name]: value };
  }
  return {};
}

function knownVulnerabilities(packageName, version) {
  return (feed[packageName] ?? [])
    .filter((advisory) => compareVersions(version, advisory.fixedIn) < 0)
    .map((advisory) => advisory.id);
}

const tails = new Map();
function serialPerThing(thingId, task) {
  const next = (tails.get(thingId) ?? Promise.resolve()).then(task).catch((err) => console.error(err.message));
  tails.set(thingId, next);
  return next;
}

async function annotate(thingId, packageName, version) {
  const vulnerabilities = knownVulnerabilities(packageName, version);
  const started = performance.now();
  const response = await ditto("PATCH", `/api/2/things/${thingId}`, {
    contentType: "application/merge-patch+json",
    headers: { "correlation-id": "vulnerability-annotator" },
    body: {
      features: {
        softwareManagement: {
          properties: { packages: { [packageName]: { knownVulnerabilities: vulnerabilities } } },
        },
      },
    },
  });
  eventLog({
    component: "annotator",
    event: response.ok ? "annotated" : "annotation_failed",
    thingId,
    package: packageName,
    detail: { version, vulnerabilities, httpStatus: response.status, patchMs: Math.round(performance.now() - started) },
  });
}

function connect() {
  const authorization =
    "Basic " +
    Buffer.from(`${process.env.DITTO_USERNAME ?? "ditto"}:${process.env.DITTO_PASSWORD ?? "ditto"}`).toString("base64");
  const socket = new WebSocket(`ws://${process.env.DITTO_SERVER}/ws/2`, { headers: { Authorization: authorization } });
  socket.on("open", () => {
    const filter = encodeURIComponent("eq(attributes/emulated,true)");
    socket.send(`START-SEND-EVENTS?namespaces=no.sintef.sct.giot&extraFields=attributes/emulated&filter=${filter}`);
  });
  socket.on("message", (data) => {
    const text = data.toString();
    if (text.startsWith("START-SEND-EVENTS:ACK")) {
      console.log("vulnerability annotator subscribed to twin events");
      return;
    }
    let frame;
    try {
      frame = JSON.parse(text);
    } catch {
      return;
    }
    const parts = frame.topic?.split("/") ?? [];
    if (parts[2] !== "things" || parts[4] !== "events") return;
    const thingId = `${parts[0]}:${parts[1]}`;
    for (const [packageName, version] of Object.entries(reportedVersions(frame))) {
      serialPerThing(thingId, () => annotate(thingId, packageName, version));
    }
  });
  socket.on("close", () => setTimeout(connect, 2000));
  socket.on("error", (err) => console.warn(`event stream error: ${err.message}`));
}

connect();
