# Results of the SSU revision experiments

`raw/` holds what the campaign scripts wrote, unmodified; `summary/` is generated from it by
`analysis/summarize.py`. All timestamps are epoch milliseconds from the clock of the Docker host
that ran every component. Durations end in `Ms`. Rows with `warmup=true` are excluded from all
summaries.

## Per campaign

**`<id>-environment.txt`**: git commit, count of modified tracked files, Docker resources, host CPU,
number of twins in Ditto, every container's image, image digest, memory limit and start time, and
the broker's stored sessions at the start. The end time and the final broker state are appended
when the campaign finishes (the lifecycle service is stopped then, so its event log ends with the
campaign). A campaign continued with `CONTINUE=1` after an interruption appends a further record,
marked "(continued)".

**`<id>-lifecycle.csv`**: event log of the lifecycle service (`backend/src/TimestampLogger.js`)
with columns `ts, component, event, workflowId, thingId, package, stage, detail` (`detail` is JSON).

| event | ts is | detail |
|---|---|---|
| `desired_event` | receipt of the Ditto event for a desired-state change | `action`, `revision`, `eventTimestamp` |
| `dispatched` | hand-off of the twin to MQTT | `reason` (event or reconcile), `fetchMs` (twin GET), `pubackMs` |
| `dispatch_failed` | failed twin GET | `reason`, `httpStatus` |
| `status_received` | receipt of a device status | the device's timing (`receivedAt`, `startedAt`, `finishedAt`, apt durations) and `status` |
| `status_stale` | status of a superseded workflow, ignored | `currentWorkflowId` |
| `status_applied`, `apply_failed` | end of the merge patch into the twin | `status`, `httpStatus`, `patchMs`, `sinceReceivedMs` |
| `converged` | twin reports the desired version, installed and verified, for the workflow | — |

**`<run>-truth.csv`** (E2–E4, no header): the emulator's ground truth, `ts, runId, thingId,
workflowId, event` with event `installed`, `installation_failed`, `verified`,
`verification_failed`, `offline_start` or `offline_end`.

**`<id>-resources.csv`**: `ts, container, cpuPercent, memBytes`, recorded by
`harness/resource-sampler.js` through the Docker Engine API about once per second per container.
`cpuPercent` is CPU use in percent of one core (computed as `docker stats` does), and `memBytes`
is memory use without the page cache.
- **Summary:** `summary/<id>-resources-by-condition.csv` takes, for each measured run, the samples
  within the run's time window. For each group of containers it reports the mean CPU (`…Cpu`), the
  mean memory (`…MemMiB`, averaged over runs) and the highest memory seen in any run
  (`…PeakMemMiB`).
- **Run windows:** from the run's start until convergence (E0), until the assignment finished (E1),
  until the last device completed (E2, E4), or until every device was terminal (E3).
- **Container groups:** `things`, `search` (things-search), `policies`, `gateway` (gateway and
  nginx), `mongodb`, `mosquitto`, `backend` (lifecycle service), `emulator`, `gw1` (gateway
  container and its agents), `harness` (assignment engine and other harness scripts) and
  `annotator` (E4).

## E0

**`e0-runs.csv`**: one row per update of `gw1`.
- **Run identity:** `run`, `warmup`, `direction` (upgrade/downgrade), `workflowId`, `converged`.
- **Stages:** `writeMs` (desired-state PUT), `eventMs`, `dispatchMs`, `pubackMs`, `deliveryMs`,
  `installMs` (of which `aptUpdateMs`, `aptInstallMs`), `installReportMs`, `verifyWaitMs`,
  `verifyMs`, `verifyReportMs`, `totalMs` (write to convergence), `monitorConfirmMs`
  (convergence until Telegraf's report shows the new version).
- **Definitions:** stages are defined at the top of `harness/e0-walkthrough.js`.

**`e0-history.json`**: the twin's revisions during the first measured upgrade, read with
`at-historical-revision`, each with the persisted `correlation-id` and `ditto-originator`.

## E1

**`e1-assignment.csv`**: one row per assignment over `registeredTwins` registered-only twins.
- **Counts:** `candidates` (twins reporting the package), `targets` (below the fixed version and
  not yet assigned to it), `upToDate` (at or above the fixed version), `alreadyAssigned` (below the
  fixed version, which is already their desired version), `failures` (writes without a 2xx status).
- **Timing:** `queryMs` (paged RQL search), `writeMs` (all desired-state writes at `concurrency`),
  `totalMs`, and per-write `writeMeanMs`, `writeP95Ms`, `writeMaxMs`.

## E2 and E4

**`e2-coordination.csv`**, **`e4-coordination.csv`**: one row per fleet update of `devices`
emulated gateways.
- **Condition:** `mode` is `dt` (through Ditto and the lifecycle service) or `direct` (MQTT only);
  `profile` is the emulator profile.
- **Request timing:** `queryMs` (dt only), `requestMs` (issuing all requests).
- **Completion:** `completed`, `complete`.
- **Fleet times:** `fleet50Ms`, `fleet95Ms`, `fleet100Ms`, measured from the first request until
  that share of the devices completed.
- **Device latencies:** `deviceMeanMs`, `deviceP50Ms`, `deviceP95Ms`, `deviceMaxMs`, from a
  device's acknowledged request (HTTP response or PUBACK) to its completion (`converged`, or the
  verification status in direct mode).
- **Errors:** `failedEvents` (dispatch or apply failures).

**`e4-checks.csv`**: per E4 run, `twinsFound`, `desiredMetadataPresent` (twins whose desired state
carries `cveIds` and `sbomRef`), `sbomResolvable` (the reference resolves to an SPDX document
describing the assigned version), `annotated` and `annotationsConsistentWithVersion`.

**`e4-annotator.csv`**: event log of the vulnerability annotator (same columns as the lifecycle
log; events `annotated` and `annotation_failed`).

## E3

**`e3-runs.csv`**: one row per run.
- **Outcomes:** `completed`, `failedInstallation`, `failedVerification`, `offline`,
  `offlineCompleted`, `allTerminal`.
- **Timing:** `startedAt`, `terminalMs` (first request until every device is terminal),
  `meanLatencyOnlineMs` and `meanLatencyOfflineMs` (converged devices that were online or offline
  at assignment), `fleet100Ms`, `queryMs`, `requestMs`.

**`e3-queries.csv`**: one row per query per run.
- **Query:** `query`, `question`, `rql`.
- **Correctness against ground truth:** `expected`, `returned`, `truePositives`, `falsePositives`,
  `falseNegatives`.
- **Timing:** `latencyMs`.

**`<run>-history.json`**: revision histories of sample devices (completed after being offline,
failed installation, failed verification).
