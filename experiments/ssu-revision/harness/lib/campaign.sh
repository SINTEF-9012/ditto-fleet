# Shared helpers of the run-*.sh campaign scripts; sourced with experiments/ssu-revision/lab as working directory.
export MSYS_NO_PATHCONV=1
export DITTO_VERSION="${DITTO_VERSION:-3.9.7}"
RAW=../results/raw
PLATFORM=../../../docker-compose-ditto.yml

lab() { docker compose -f docker-compose.lab.yml "$@"; }
harness() { lab --profile harness run --rm -T harness "$@"; }

# wait_log PATTERN COMMAND...: waits until the output of COMMAND contains PATTERN.
# grep reads the whole output (no -q), so COMMAND never dies of SIGPIPE under pipefail.
wait_log() {
  local pattern=$1 deadline=$((SECONDS + 600))
  shift
  until "$@" 2>&1 | grep -F "$pattern" >/dev/null; do
    if [ "$SECONDS" -ge "$deadline" ]; then
      echo "did not observe '${pattern}'" >&2
      return 1
    fi
    sleep 2
  done
}

# require_fresh ID: refuses to start while results/raw holds files of an earlier campaign with the
# same ID, so that runs of different campaigns never end up in the same raw files. CONTINUE=1
# deliberately appends to the files of an interrupted campaign instead.
require_fresh() {
  [ "${CONTINUE:-0}" = 1 ] && return 0
  local existing=("$RAW/$1"-*)
  if [ -e "${existing[0]}" ]; then
    echo "results/raw already contains $1-* files; move them away before starting the $1 campaign" >&2
    exit 1
  fi
}

healthy_ditto_services() {
  local service id healthy=0
  for service in policies things things-search connectivity gateway; do
    id=$(docker compose -f "$PLATFORM" ps -q "$service")
    if [ -n "$id" ] && [ "$(docker inspect --format '{{.State.Health.Status}}' "$id" 2>/dev/null)" = healthy ]; then
      healthy=$((healthy + 1))
    fi
  done
  echo "$healthy"
}

# restart_platform: restarts MongoDB, the Ditto services and nginx, so that no campaign inherits caches
# or memory state from an earlier one, and waits until every Ditto service is healthy and search answers.
# Every Ditto service is stopped before any starts, so that they form a fresh Pekko cluster (without
# automatic downing, members that vanished would block it); nginx starts last because it resolves the
# gateway's address only at startup.
restart_platform() {
  local ditto="policies things things-search connectivity gateway" deadline=$((SECONDS + 900))
  docker compose -f "$PLATFORM" stop nginx $ditto mongodb >/dev/null 2>&1
  docker compose -f "$PLATFORM" start mongodb $ditto >/dev/null 2>&1
  until [ "$(healthy_ditto_services)" -eq 5 ]; do
    if [ "$SECONDS" -ge "$deadline" ]; then
      echo "the Ditto services did not become healthy after the restart" >&2
      return 1
    fi
    sleep 5
  done
  docker compose -f "$PLATFORM" start nginx >/dev/null 2>&1
  until curl -sf -u "${DITTO_USERNAME:-ditto}:${DITTO_PASSWORD:-ditto}" \
    "http://localhost:${DITTO_EXTERNAL_PORT:-8080}/api/2/search/things/count" >/dev/null; do
    if [ "$SECONDS" -ge "$deadline" ]; then
      echo "Ditto does not answer through nginx after the restart" >&2
      return 1
    fi
    sleep 5
  done
}

# start_backend TAG [NAME=VALUE...]: (re)creates the lifecycle service, which then logs every event
# to results/raw/TAG-lifecycle.csv.
start_backend() {
  local tag=$1
  shift
  env RUN_TAG="$tag" "$@" docker compose -f docker-compose.lab.yml up -d --force-recreate backend
  wait_log "subscribed to Ditto twin events" lab logs backend
}

# gw1's monitoring agent makes the backend write gw1's package inventory to Ditto every 10 s;
# campaigns other than E0 keep that load out of their measurements.
stop_gateway_monitoring() {
  lab stop gw1-monitoring >/dev/null 2>&1 || true
}

host_cpu() {
  if command -v powershell.exe >/dev/null 2>&1; then
    powershell.exe -NoProfile -Command '(Get-CimInstance Win32_Processor).Name' | tr -d '\r'
  else
    grep -m1 'model name' /proc/cpuinfo | cut -d: -f2- | sed 's/^ //'
  fi
}

# Disconnected clients with persistent sessions make the broker queue messages for their topics.
broker_sessions() {
  local broker
  broker=$(docker ps -q --filter label=com.docker.compose.service=mosquitto | head -1)
  echo "broker at $(date -u +%H:%M:%SZ): $(docker exec "$broker" mosquitto_sub -u "${MQTT_USERNAME:-lab}" \
    -P "${MQTT_PASSWORD:-lab}" -v -C 2 -W 15 -t '$SYS/broker/clients/disconnected' \
    -t '$SYS/broker/store/messages/count' | tr '\n' ' ')"
}

# start_resource_sampler ID: records every container's CPU and memory use, about once per second and on
# the clock of the measurements, to results/raw/ID-resources.csv until the campaign finishes.
start_resource_sampler() {
  docker rm -f ssu-resource-sampler >/dev/null 2>&1 || true
  lab --profile harness run -d --rm --name ssu-resource-sampler \
    -v /var/run/docker.sock:/var/run/docker.sock:ro \
    harness /harness/resource-sampler.js --out "/results/$1-resources.csv" >/dev/null
  wait_log "resource sampler started" docker logs ssu-resource-sampler
}

# finish_campaign ID: stops the resource sampler and the lifecycle service, so that their records end
# with the campaign, and appends the end time and the broker state to the environment record.
finish_campaign() {
  docker stop ssu-resource-sampler >/dev/null 2>&1 || true
  lab stop backend >/dev/null 2>&1 || true
  {
    echo "finished: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
    broker_sessions
  } >> "$RAW/$1-environment.txt"
}

# record_environment ID: code version, container images and limits, Docker resources and broker state of a campaign.
record_environment() {
  {
    echo "campaign: $1$([ "${CONTINUE:-0}" = 1 ] && echo " (continued)")"
    echo "started: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
    echo "git commit: $(git rev-parse HEAD)"
    echo "modified tracked files: $(git status --porcelain --untracked-files=no | wc -l)"
    docker info --format 'docker: {{.ServerVersion}}, {{.NCPU}} CPUs, {{.MemTotal}} bytes memory, {{.OperatingSystem}}, kernel {{.KernelVersion}}'
    echo "host CPU: $(host_cpu)"
    echo "twins in Ditto: $(curl -s -u "${DITTO_USERNAME:-ditto}:${DITTO_PASSWORD:-ditto}" \
      "http://localhost:${DITTO_EXTERNAL_PORT:-8080}/api/2/search/things/count")"
    echo "containers (image, image digest, memory limit in bytes, start time):"
    docker ps --format '{{.Names}}' | sort | while read -r name; do
      docker inspect --format "  ${name} {{.Config.Image}} {{.Image}} memLimit={{.HostConfig.Memory}} started={{.State.StartedAt}}" "$name"
    done
    broker_sessions
  } >> "$RAW/$1-environment.txt"
}
