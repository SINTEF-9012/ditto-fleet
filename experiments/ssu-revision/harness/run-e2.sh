#!/usr/bin/env bash
# E2 / E2b campaign: coordination latency of emulated gateways, with the DT platform ("dt")
# and without it ("direct"). Rep 0 of every condition is a warm-up run.
#
#   COUNTS="1 10 50 100 250 500 1000" REPS=5 PROFILES="zero calibrated" ./run-e2.sh
set -euo pipefail
cd "$(dirname "$0")/../lab"
. ../harness/lib/campaign.sh

COUNTS="${COUNTS:-1 10 50 100 250 500 1000}"
REPS="${REPS:-5}"
PROFILES="${PROFILES:-zero calibrated}"
MODES="${MODES:-dt direct}"

require_fresh e2
stop_gateway_monitoring
start_backend e2
record_environment e2

for profile in $PROFILES; do
  for n in $COUNTS; do
    for rep in $(seq 0 "$REPS"); do
      warmup=()
      [ "$rep" -eq 0 ] && warmup=(--warmup)
      for mode in $MODES; do
        run="e2-${mode}-${profile}-${n}-${rep}"
        if [ "$mode" = dt ]; then
          harness /harness/e2-prepare.js --count "$n"
          prefix=no.sintef.sct.giot.things
        else
          prefix=baseline
        fi
        # Clean sessions: a stopped emulator leaves nothing behind that could queue messages.
        RUN_TAG="$run" EMU_COUNT="$n" EMU_PROFILE="$profile" TOPIC_PREFIX="$prefix" EMU_CLEAN_SESSION=true \
          lab --profile emulator up -d --force-recreate emulator >/dev/null
        wait_log "devices connected (run ${run})" lab --profile emulator logs emulator
        if [ "$mode" = dt ]; then
          harness /harness/e2-run.js --count "$n" --rep "$rep" --profile "$profile" \
            --workflow "wf-${run}" --events /results/e2-lifecycle.csv "${warmup[@]}" || true
        else
          harness /harness/e2b-direct.js --count "$n" --rep "$rep" --profile "$profile" \
            --workflow "wf-${run}" "${warmup[@]}" || true
        fi
        lab --profile emulator stop emulator >/dev/null
      done
    done
  done
done
finish_campaign e2
echo "E2 campaign finished"
