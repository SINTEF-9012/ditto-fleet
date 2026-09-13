#!/usr/bin/env bash
# E4 campaign: extensibility. A new lifecycle component (vulnerability annotator) is added next to the
# unchanged lifecycle service and agents, and assignments carry extra artefact metadata (CVE
# identifiers, SBOM reference). Every rep updates the same fleet twice, in alternating order:
# "baseline" without the annotator and the metadata, "extended" with both. Rep 0 is a warm-up.
#
#   N=100 REPS=10 PROFILE=calibrated ./run-e4.sh
set -euo pipefail
cd "$(dirname "$0")/../lab"
. ../harness/lib/campaign.sh

N="${N:-100}"
REPS="${REPS:-10}"
PROFILE="${PROFILE:-calibrated}"
METADATA='{"cveIds":["CVE-2024-4603"],"sbomRef":"http://apt-repo/sbom/openssl_3.0.14-1~deb12u2.spdx.json"}'

start_annotator() {
  docker rm -f ssu-e4-annotator >/dev/null 2>&1 || true
  lab --profile harness run -d --name ssu-e4-annotator harness /harness/e4-annotator.js >/dev/null
  wait_log "vulnerability annotator subscribed" docker logs ssu-e4-annotator
}

require_fresh e4
restart_platform
stop_gateway_monitoring
# The lab apt repository also publishes the SPDX document that METADATA's sbomRef points to.
lab up -d apt-repo
start_backend e4
record_environment e4
start_resource_sampler e4

for rep in $(seq 0 "$REPS"); do
  warmup=()
  [ "$rep" -eq 0 ] && warmup=(--warmup)
  variants="baseline extended"
  [ $((rep % 2)) -eq 1 ] && variants="extended baseline"
  for variant in $variants; do
    run="e4-${variant}-${PROFILE}-${N}-${rep}"
    extra=()
    if [ "$variant" = extended ]; then
      start_annotator
      extra=(--metadata "$METADATA")
    fi
    harness /harness/e2-prepare.js --count "$N"
    RUN_TAG="$run" EMU_COUNT="$N" EMU_PROFILE="$PROFILE" EMU_CLEAN_SESSION=true \
      lab --profile emulator up -d --force-recreate emulator >/dev/null
    wait_log "devices connected (run ${run})" lab --profile emulator logs emulator
    harness /harness/e2-run.js --experiment E4 --variant "$variant" --count "$N" --rep "$rep" \
      --profile "$PROFILE" --workflow "wf-${run}" --events /results/e4-lifecycle.csv \
      --out /results/e4-coordination.csv "${extra[@]}" "${warmup[@]}" || true
    if [ "$variant" = extended ]; then
      harness /harness/e4-check.js --count "$N" --rep "$rep" --workflow "wf-${run}" || true
      docker rm -f ssu-e4-annotator >/dev/null
    fi
    lab --profile emulator stop emulator >/dev/null
  done
done

finish_campaign e4
echo "E4 campaign finished"
