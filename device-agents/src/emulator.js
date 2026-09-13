import { serialQueue } from "./agent-core.js";
import {
  Stage,
  buildStatus,
  debsOf,
  desiredPackages,
  statusTopic,
} from "./contract.js";

function mix32(value) {
  let x = value >>> 0;
  x = Math.imul(x ^ (x >>> 16), 0x85ebca6b);
  x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35);
  return (x ^ (x >>> 16)) >>> 0;
}

/**
 * Random stream of one emulated device for one purpose. Run seed, device index and purpose are hashed
 * together: with a plain seed + index, run seed s + 1 would give device i the stream that run s gave
 * device i + 1, so injected failures would repeat, shifted by one device, in every repetition.
 */
export function deviceRng(seed, index, purpose = 0) {
  return mulberry32(mix32(mix32(mix32(seed) ^ index) ^ purpose));
}

/** Small seeded PRNG, so that injected delays and failures are reproducible per device. */
export function mulberry32(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function sampleDelay(spec, rng) {
  if (!spec || spec.type === "fixed") return spec?.ms ?? 0;
  if (spec.type === "uniform") return spec.minMs + rng() * (spec.maxMs - spec.minMs);
  if (spec.type === "empirical") {
    return spec.samplesMs[Math.floor(rng() * spec.samplesMs.length)];
  }
  throw new Error(`unknown delay type: ${spec.type}`);
}

/**
 * Emulated gateway: speaks exactly the same twin/status contract as the real
 * Installation and Verification Agents, but models apt and the checks with sampled
 * delays and injected failures instead of executing them.
 */
export function createVirtualDevice({
  thingId,
  profile,
  rng,
  publish,
  sleep,
  now = Date.now,
  log = console,
  topicPrefix,
  recordTruth = () => {},
}) {
  const installed = { ...(profile.initialVersions ?? {}) };
  const enqueue = serialQueue(log);
  return {
    installed,
    handleTwin: (thing) => enqueue(() => handle(thing)),
    reportMonitoring,
  };

  async function handle(thing) {
    const receivedAt = now();
    const topic = statusTopic(thingId, topicPrefix);
    for (const [packageName, desired] of Object.entries(desiredPackages(thing))) {
      if (!desired?.version) continue;
      const debs = debsOf(packageName, desired);
      const { workflowId } = desired;
      const startedAt = now();

      await publish(
        topic,
        buildStatus({
          thingId,
          packageName,
          stage: Stage.INSTALLATION,
          workflowId,
          desired,
          reported: {
            installationStatus: "installing",
            verificationStatus: "pending",
            workflowId,
          },
          timing: { receivedAt, startedAt, emulated: true },
        }),
      );

      const upToDate = debs.every((deb) => installed[deb] === desired.version);
      if (!upToDate) await sleep(sampleDelay(profile.install, rng));
      const installOk = upToDate || rng() >= (profile.installFailureRate ?? 0);
      if (installOk) {
        for (const deb of debs) installed[deb] = desired.version;
      }
      const installFinishedAt = now();
      recordTruth({
        thingId,
        workflowId,
        event: installOk ? "installed" : "installation_failed",
      });

      await publish(
        topic,
        buildStatus({
          thingId,
          packageName,
          stage: Stage.INSTALLATION,
          workflowId,
          desired,
          reported: {
            version: installed[packageName] ?? installed[debs[0]] ?? null,
            installationStatus: installOk ? "installed" : "failed",
            installationFinishedAt: new Date(installFinishedAt).toISOString(),
            installDurationMs: installFinishedAt - startedAt,
            lastError: installOk ? null : "emulated installation failure",
            workflowId,
          },
          timing: {
            receivedAt,
            startedAt,
            finishedAt: installFinishedAt,
            skipped: upToDate,
            emulated: true,
          },
        }),
      );
      if (!installOk) continue;

      const verifyStartedAt = now();
      await sleep(sampleDelay(profile.verify, rng));
      const verifyOk = rng() >= (profile.verifyFailureRate ?? 0);
      const verifyFinishedAt = now();
      recordTruth({
        thingId,
        workflowId,
        event: verifyOk ? "verified" : "verification_failed",
      });

      await publish(
        topic,
        buildStatus({
          thingId,
          packageName,
          stage: Stage.VERIFICATION,
          workflowId,
          desired,
          reported: {
            verificationStatus: verifyOk ? "passed" : "failed",
            verificationFinishedAt: new Date(verifyFinishedAt).toISOString(),
            verifyDurationMs: verifyFinishedAt - verifyStartedAt,
          },
          timing: {
            receivedAt: installFinishedAt,
            startedAt: verifyStartedAt,
            finishedAt: verifyFinishedAt,
            emulated: true,
          },
        }),
      );
    }
  }

  async function reportMonitoring() {
    const observedAt = now();
    for (const packageName of profile.monitoredPackages ?? []) {
      await publish(
        statusTopic(thingId, topicPrefix),
        buildStatus({
          thingId,
          packageName,
          stage: Stage.MONITORING,
          reported: {
            monitoredVersion: installed[packageName] ?? null,
            monitoredAt: new Date(observedAt).toISOString(),
          },
          timing: { observedAt, emulated: true },
        }),
      );
    }
  }
}
