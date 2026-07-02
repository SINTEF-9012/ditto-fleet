# ditto-fleet

A research prototype of a Digital Twin platform for software management on a fleet of devices within the IoT-Edge-Cloud continuum. The backbone of the platform is [Eclipse Ditto](https://www.eclipse.org/ditto/).

## Architecture

| Component | Folder | Tech | Port | Role |
|---|---|---|---|---|
| Fleet-manager GUI | `src/`, `public/` | React (CRA) | 3000 | Web UI to manage device twins, register software, create and enact deployments |
| Backend | `backend/` | Node.js | 4000 | Bridge between Ditto and MQTT: ingests monitoring data into twins, watches desired-property changes, publishes device twins downstream, parses MSPL security policies |
| Submanager | `submanager/` | Node.js | — | Edge-side deployment router: receives twins via MQTT, relays to proxy devices or deploys containers via the Docker Engine API |
| Monitoring agent | `monitoring-agent/` | Telegraf | — | Runs on devices; publishes CPU/memory/disk/temperature/Docker/package metrics via MQTT |
| Trust agent | `trust-agent/` | Python | — | Minimal containerized agent deployed to devices as the managed "software" |
| Eclipse Ditto | external | Java | 8080 | Digital twin repository (things, policies, search, connectivity) |

Communication: the GUI talks to Ditto's HTTP API (port 8080); the backend uses Ditto's HTTP + WebSocket APIs and an MQTT broker (default `test.mosquitto.org:1883`); devices (submanager, monitoring agent) communicate over MQTT only.

The former TypeScript `subfleet-manager/` component was superseded by `submanager/` and removed from the working tree; it remains available in git history.

## Configuration

All connection settings are environment variables with development defaults (`ditto`/`ditto` against `localhost:8080`).

* GUI: `REACT_APP_DITTO_DOMAIN`, `REACT_APP_DITTO_USERNAME`, `REACT_APP_DITTO_PASSWORD`, `REACT_APP_DITTO_NAMESPACE` — defaults in [.env](.env), local overrides (and any real credentials) go in `.env.local`, which is git-ignored. CRA bakes these in at build time.
* Backend: `PORT`, `MQTT_BROKER`, `DITTO_SERVER`, `DITTO_USERNAME`, `DITTO_PASSWORD` — see [backend/.env.example](backend/.env.example).
* Submanager: `MQTT_BROKER_URL`, `HOST_NAME`, `DOCKER_PORT`, `NAMESPACE_PREFIX` — see [submanager/.env](submanager/.env).

## Pre-requisites: Eclipse Ditto

Run Eclipse Ditto via docker compose, either from the [upstream deployment](https://github.com/eclipse-ditto/ditto/tree/master/deployment/docker) or with the compose file in this repo:

```bash
docker compose -f docker-compose-ditto.yml up -d
```

The Ditto policy and example twins can be set up with the scripts and JSON files in `src/ditto-scripts/` (see its README).

## Running from source

Front-end GUI (root folder):

```bash
npm install
npm start          # http://localhost:3000
```

Back-end (separate terminal):

```bash
cd backend
npm install
npm start
```

## Docker deployment

| File | Purpose |
|---|---|
| `docker-compose-ditto.yml` | Eclipse Ditto stack only (things, policies, search, gateway, MongoDB, Mosquitto, nginx, swagger) |
| `docker-compose-fleet.yml` | Full fleet stack: GUI + backend + submanager images on top of a running Ditto |
| `docker-compose-raspberry.yml` | Device-side stack for a Raspberry Pi: submanager + monitoring agent |
| `Dockerfile`, `backend/Dockerfile` | Images for the GUI (`rdautov/ditto-fleet-gui`) and backend (`rdautov/ditto-backend`) |

Stand-alone GUI container:

```bash
docker run -it -p 3000:3000 rdautov/ditto-fleet-gui
```

## Experiments

The scripts and data used for the D6.2 scalability experiments (frozen submanager load-test variants, twin generator, the 100 generated twins) live in [experiments/d6.2-scalability/](experiments/d6.2-scalability/README.md).
