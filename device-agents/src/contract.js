export const DEFAULT_TOPIC_PREFIX = "no.sintef.sct.giot.things";

export const Stage = Object.freeze({
  INSTALLATION: "installation",
  VERIFICATION: "verification",
  MONITORING: "monitoring",
});

export function downstreamTopic(thingId, prefix = DEFAULT_TOPIC_PREFIX) {
  return `${prefix}/downstream/${thingId}`;
}

export function statusTopic(thingId, prefix = DEFAULT_TOPIC_PREFIX) {
  return `${prefix}/software-status/${thingId}`;
}

/** Desired package states of a (partial) Ditto thing, keyed by software artefact name. */
export function desiredPackages(thing) {
  const packages =
    thing?.features?.softwareManagement?.desiredProperties?.packages;
  return packages !== null && typeof packages === "object" ? packages : {};
}

/** Debian binary packages that make up a software artefact (e.g. openssl + libssl3). */
export function debsOf(packageName, desired) {
  return Array.isArray(desired?.debs) && desired.debs.length > 0
    ? desired.debs
    : [packageName];
}

/**
 * A status message is the twin fragment a lifecycle component has updated:
 * the reported state it owns, plus the desired state it acted upon.
 */
export function buildStatus({
  thingId,
  packageName,
  stage,
  workflowId,
  desired,
  reported,
  timing,
}) {
  const feature = { properties: { packages: { [packageName]: reported } } };
  if (desired) {
    feature.desiredProperties = { packages: { [packageName]: desired } };
  }
  return {
    thingId,
    stage,
    workflowId,
    features: { softwareManagement: feature },
    timing,
  };
}

export function parseStatus(message) {
  const feature = message?.features?.softwareManagement;
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
