import { serialQueue } from "./agent-core.js";
import { installPackageSet, queryPackages } from "./apt.js";
import {
  Stage,
  buildStatus,
  debsOf,
  desiredPackages,
  statusTopic,
} from "./contract.js";

/**
 * Installation Agent: consumes the twin, brings the package set to the desired
 * version with apt, and reports the installation state it owns back through the twin.
 */
export function createInstaller({
  thingId,
  publish,
  exec,
  now = Date.now,
  log = console,
  topicPrefix,
}) {
  const enqueue = serialQueue(log);
  return { handleTwin: (thing) => enqueue(() => handle(thing)) };

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
          timing: { receivedAt, startedAt },
        }),
      );

      let outcome;
      try {
        const current = await queryPackages(debs, exec);
        const upToDate = debs.every(
          (deb) =>
            current[deb]?.status === "installed" &&
            current[deb]?.version === desired.version,
        );
        outcome = upToDate
          ? { ok: true, error: null, updateMs: 0, installMs: 0, skipped: true }
          : await installPackageSet({ debs, version: desired.version }, exec);
      } catch (err) {
        outcome = { ok: false, error: err.message, updateMs: 0, installMs: 0 };
      }

      let versionAfter = null;
      try {
        const after = await queryPackages(debs, exec);
        versionAfter = after[packageName]?.version ?? after[debs[0]]?.version ?? null;
      } catch (err) {
        log.warn(`[${thingId}] could not read installed version: ${err.message}`);
      }

      const finishedAt = now();
      await publish(
        topic,
        buildStatus({
          thingId,
          packageName,
          stage: Stage.INSTALLATION,
          workflowId,
          desired,
          reported: {
            version: versionAfter,
            installationStatus: outcome.ok ? "installed" : "failed",
            installationFinishedAt: new Date(finishedAt).toISOString(),
            installDurationMs: finishedAt - startedAt,
            lastError: outcome.error,
            workflowId,
          },
          timing: {
            receivedAt,
            startedAt,
            finishedAt,
            aptUpdateMs: outcome.updateMs,
            aptInstallMs: outcome.installMs,
            skipped: Boolean(outcome.skipped),
          },
        }),
      );
    }
  }
}
