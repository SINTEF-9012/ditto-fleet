#!/usr/bin/env bash
# E3 campaign: injected installation/verification failures and devices that are offline when the
# update is assigned; the lifecycle service re-dispatches non-converged twins. After each run the
# Table 3 questions are answered with RQL and checked against the emulator's ground truth.
#
#   N=500 REPS=5 ./run-e3.sh
set -euo pipefail
cd "$(dirname "$0")/../lab"
. ../harness/lib/campaign.sh

N="${N:-500}"
REPS="${REPS:-5}"

require_fresh e3
stop_gateway_monitoring
start_backend e3 SW_RECONCILE_INTERVAL_MS="${SW_RECONCILE_INTERVAL_MS:-10000}" \
  SW_STALE_AFTER_MS="${SW_STALE_AFTER_MS:-120000}"
record_environment e3
start_resource_sampler e3

for rep in $(seq 1 "$REPS"); do
  run="e3-${N}-${rep}"
  harness /harness/e2-prepare.js --count "$N"
  # Persistent sessions: update requests for offline devices are queued by the broker.
  RUN_TAG="$run" EMU_COUNT="$N" EMU_PROFILE=e3 EMU_SEED="$rep" EMU_CLEAN_SESSION=false \
    lab --profile emulator up -d --force-recreate emulator >/dev/null
  wait_log "devices connected (run ${run})" lab --profile emulator logs emulator
  harness /harness/e3-run.js --count "$N" --rep "$rep" --run "$run" --workflow "wf-${run}" \
    --events /results/e3-lifecycle.csv --truth "/results/${run}-truth.csv" \
    --history-out "/results/${run}-history.json" || true
  lab --profile emulator stop emulator >/dev/null
  # The next rep's dispatches would otherwise be queued in this rep's stored sessions.
  harness /harness/purge-sessions.js --client-prefix "emu-${run}-" --count "$N"
done
finish_campaign e3
echo "E3 campaign finished"
