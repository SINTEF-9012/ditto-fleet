#!/usr/bin/env bash
# E0 campaign: real apt updates of gw1 through the DT platform (alternating upgrade/downgrade),
# then derive the emulator profiles "calibrated" and "e3" from the measured upgrades.
#
#   RUNS=40 WARMUP=2 ./run-e0.sh
set -euo pipefail
cd "$(dirname "$0")/../lab"
. ../harness/lib/campaign.sh

require_fresh e0
lab up -d apt-repo
# A recreated gateway starts from OpenSSL 3.0.11, the state e0-prepare.js registers in its twin.
lab up -d --no-deps --force-recreate gw1 gw1-installer gw1-verifier gw1-monitoring
wait_log "gateway ready" lab logs gw1
wait_log "installer agent for" lab logs gw1-installer
wait_log "verifier agent for" lab logs gw1-verifier
start_backend e0
harness /harness/e0-prepare.js
record_environment e0

harness /harness/e0-walkthrough.js --runs "${RUNS:-40}" --warmup "${WARMUP:-2}"
finish_campaign e0
harness /harness/make-calibrated-profiles.js
echo "E0 campaign finished"
