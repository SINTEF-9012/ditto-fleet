import { serialQueue } from "./agent-core.js";
import { verifyPackageSet } from "./apt.js";
import { Stage, buildStatus, debsOf, parseStatus, statusTopic } from "./contract.js";

/**
 * Verification Agent: reacts to the twin fragment published by the Installation
 * Agent and reports whether the installed software is the desired, intact and working one.
 */
export function createVerifier({
  thingId,
  publish,
  exec,
  now = Date.now,
  log = console,
  topicPrefix,
}) {
  const enqueue = serialQueue(log);
  return {
    handleStatus(message) {
      const status = parseStatus(message);
      if (
        !status ||
        status.thingId !== thingId ||
        status.stage !== Stage.INSTALLATION ||
        status.reported.installationStatus !== "installed"
      ) {
        return Promise.resolve();
      }
      return enqueue(() => verify(status));
    },
  };

  async function verify(status) {
    const receivedAt = now();
    const desired = status.desired ?? {};
    const version = desired.version ?? status.reported.version;
    const debs = debsOf(status.packageName, desired);
    const startedAt = now();

    let result;
    try {
      result = await verifyPackageSet({ debs, version }, exec);
    } catch (err) {
      result = { passed: false, checks: { error: err.message }, restartRequired: [] };
    }

    const finishedAt = now();
    await publish(
      statusTopic(thingId, topicPrefix),
      buildStatus({
        thingId,
        packageName: status.packageName,
        stage: Stage.VERIFICATION,
        workflowId: status.workflowId,
        desired: status.desired,
        reported: {
          verificationStatus: result.passed ? "passed" : "failed",
          verificationChecks: result.checks,
          restartRequired: result.restartRequired,
          verificationFinishedAt: new Date(finishedAt).toISOString(),
          verifyDurationMs: finishedAt - startedAt,
        },
        timing: { receivedAt, startedAt, finishedAt },
      }),
    );
  }
}
