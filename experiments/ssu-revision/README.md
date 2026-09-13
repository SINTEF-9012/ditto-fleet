# SSU revision experiments

Experiments evaluating the DT-based software lifecycle information model: the
`softwareManagement` feature of Eclipse Ditto twins, the software lifecycle service
(`backend/src/software-lifecycle.js`), the assignment engine
(`backend/src/assignment-engine.js`) and the device-side agents (`device-agents/`).

Everything runs on a single Docker host, so all timestamps come from one clock.

## What is real and what is emulated

| Part | In these experiments |
|---|---|
| Eclipse Ditto 3.9.7, MongoDB, Mosquitto 2, lifecycle service, assignment engine | real |
| Gateway `gw1` | a Debian 12 container (not a Raspberry Pi) whose only package source is a signed local apt repository with the archived Debian builds `openssl`/`libssl3` `3.0.11-1~deb12u2` and `3.0.14-1~deb12u2` |
| Installation and Verification Agents of `gw1` | real: apt runs inside the gateway via `nsenter`; verification checks dpkg state, `dpkg --verify`, `openssl version`, a local TLS handshake and processes still using the old library |
| Monitoring Agent of `gw1` | real Telegraf reading the gateway's dpkg database |
| Fleets in E2–E4 | emulated gateways (`device-agents`, role `emulator`) that use the same twin/MQTT contract as the real agents, but model installation and verification with sampled delays; the `calibrated` profile samples the durations measured on `gw1` in E0 |
| Registered-only twins in E1 | twins without any connected device |

## Prerequisites

- Docker with Compose v2 and about 6 GB of memory for Docker; bash (Git Bash on Windows);
  Python 3 for the analysis.
- Internet access when the lab starts: the repository builder downloads the archived OpenSSL
  packages from snapshot.debian.org and checks their hashes.
- The platform stack and the policy of the twins, from the repository root:

  ```bash
  docker compose -f docker-compose-ditto.yml up -d
  curl -u ditto:ditto -X PUT http://localhost:8080/api/2/policies/no.sintef.sct.giot:policy \
    -H 'Content-Type: application/json' --data-binary @src/ditto-scripts/policy.json
  ```

- The lab images, built from this repository:

  ```bash
  docker compose -f experiments/ssu-revision/lab/docker-compose.lab.yml build
  ```

The campaign scripts start the lab services they need: the signed apt repository, `gw1` and its
agents, the lifecycle backend and the emulators.

## Running the experiments

Each script lives in `harness/` and writes raw CSV files to `results/raw/`;
[results/README.md](results/README.md) describes their columns.

| ID | Question | Command | Raw output |
|---|---|---|---|
| E0 | How does a real update of `gw1` progress through the twin, and where does the time go? | `RUNS=40 WARMUP=2 harness/run-e0.sh` (also derives `lab/profiles/calibrated.json` and `e3.json`) | `e0-runs.csv`, `e0-history.json`, `e0-lifecycle.csv` |
| E1 | How does DT-based assignment scale with the number of registered twins? | `harness/run-e1.sh` | `e1-assignment.csv` |
| E2 | How long does a fleet update take through the DT platform, and what does the twin layer add compared with sending requests directly over MQTT? | `harness/run-e2.sh` | `e2-coordination.csv`, `e2-lifecycle.csv`, `e2-*-truth.csv` |
| E3 | Do the twins answer "which gateways are still vulnerable / completed / failed at which stage" correctly under failures and offline devices? | `harness/run-e3.sh` | `e3-runs.csv`, `e3-queries.csv`, `e3-*-history.json` |
| E4 | Can a new lifecycle component and new artefact metadata be added without changing existing components? | `harness/run-e4.sh` | `e4-coordination.csv`, `e4-checks.csv`, `e4-annotator.csv` |

Run the campaigns one after another, never in parallel, and E0 first: it derives the emulator
profiles used by E2–E4. Every script documents its parameters at the top. Warm-up runs are recorded
but excluded from the profiles and summaries: the first two E0 runs, the first two repetitions of
every E1 fleet size, and rep 0 of every E2/E4 condition.

A campaign refuses to start while `results/raw/` holds files of an earlier campaign with the same
ID (`e0-*` … `e4-*`). It writes `results/raw/<id>-environment.txt` with the git commit, the
container images, the Docker resources and the broker's stored sessions. To complete an interrupted
campaign, run it again with `CONTINUE=1` and parameters that cover only the missing part, for
example `CONTINUE=1 COUNTS=10000 harness/run-e1.sh`; its results and a second environment record
are appended to the same files.

Summaries and pgfplots tables:

```bash
python3 analysis/summarize.py   # "python" on Windows; writes results/summary/*.csv and *.dat
```

## Measurement notes

- **Search index:** Ditto's search index is eventually consistent. Harness scripts wait until
  it reflects the prepared state before timing an assignment.
- **Assignment:** the query and the desired-state writes (concurrency 10) are timed
  separately. Targets are selected with a Debian version comparison in code, because RQL
  compares version strings lexicographically.
- **E0 stages:** defined at the top of `harness/e0-walkthrough.js`. The lifecycle service
  timestamps a dispatch when it hands the message to MQTT. The broker's PUBACK can arrive
  after the device has already received the message, so `pubackMs` is recorded separately.
  Every status event in the lifecycle log carries the reported status value, so received and
  applied statuses are matched exactly.
- **Device completion time (E2/E4):** time from a device's desired-state write to the
  lifecycle service's `converged` event. In the direct baseline it is the time from the
  MQTT publish acknowledgement to the receipt of the verification status. *Fleet* times
  are measured from the first request.
- **E4 metadata:** assignments carry `cveIds` and an `sbomRef`. The SBOM is a minimal SPDX 2.3
  document that the repository builder generates for each OpenSSL version (package names,
  versions, SHA-256 checksums, purls). `harness/e4-check.js` checks that the reference resolves
  and describes the assigned version.
- **Background load:** `gw1`'s monitoring agent runs only during E0. In the other campaigns it
  would make the backend write `gw1`'s package inventory to Ditto every 10 s.
- **MQTT sessions:** E2 and E4 use clean sessions, so a stopped emulator leaves nothing behind.
  E3 uses persistent sessions so that the broker queues update requests for offline devices.
  After each rep, `harness/purge-sessions.js` removes the stored sessions so that later reps do not
  publish into them. The lifecycle service also re-dispatches non-converged twins
  (`SW_RECONCILE_INTERVAL_MS=10000`, `SW_STALE_AFTER_MS=120000`).
- **Resource use:** during E2–E4, `harness/resource-sampler.js` records every container's CPU and
  memory use about once per second through the Docker Engine API, on the clock of the
  measurements. The summary averages the samples over the time window of each run.
- **Host:** `<id>-environment.txt` records the Docker resources; report the host CPU and memory
  together with the results.

The frozen artefacts of the earlier D6.2 experiments are in `../d6.2-scalability/`.
