#!/usr/bin/env bash
# E1 campaign: assignment scalability over registered-only twins.
#
#   COUNTS=100,500,1000,2500,5000,10000 REPS=10 WARMUP=2 ./run-e1.sh
set -euo pipefail
cd "$(dirname "$0")/../lab"
. ../harness/lib/campaign.sh

require_fresh e1
stop_gateway_monitoring
if [ "${CONTINUE:-0}" != 1 ]; then
  # E1 grows the population from its smallest size, so registered-only twins of earlier runs must go.
  harness /harness/delete-twins.js --filter 'eq(attributes/registeredOnly,true)'
  restart_platform
fi
record_environment e1
start_resource_sampler e1

harness /harness/e1-assignment.js \
  --counts "${COUNTS:-100,500,1000,2500,5000,10000}" \
  --reps "${REPS:-10}" \
  --warmup "${WARMUP:-2}" \
  --vulnerable "${VULNERABLE:-0.2}" \
  --concurrency "${CONCURRENCY:-10}"
finish_campaign e1
echo "E1 campaign finished"
