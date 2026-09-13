# Digital Twin-based Secure Software Update Platform

This repository contains a proof-of-concept implementation of a **Digital Twin-based Secure Software Update (SSU) platform** for managing software throughout the operational lifecycle of connected IoT and edge devices.

The implementation is based on **Eclipse Ditto** and demonstrates how Web of Things (WoT) Digital Twins can act as a shared information model for coordinating software assignment, deployment, installation, verification, and operational monitoring across heterogeneous software management components.

Originally developed within the **ENTRUST** and **ERATOSTHENES** Horizon Europe projects, the platform focuses on secure and context-aware software management for connected medical devices, although the overall architecture is applicable to a much broader range of IoT and edge computing scenarios.

## Motivation

Managing software across large fleets of connected devices is challenging due to:

- heterogeneous hardware and software platforms;
- multiple independent lifecycle services developed by different vendors;
- intermittently connected devices;
- the need for secure and traceable software deployment;
- limited interoperability between software management components.

Rather than allowing every lifecycle component to maintain its own device state, this platform uses **Digital Twins as a continuously evolving software lifecycle representation** shared by all participating services.

## Main Concept

Each managed device is represented by a Digital Twin containing both its operational context and software lifecycle information.

The platform distinguishes between two complementary views of software:

- **Desired properties** represent the software version that a device should eventually run.
- **Reported properties** represent the software version currently installed and verified on the physical device.

Whenever these two states differ, the platform automatically initiates the software update workflow. Once installation and verification complete successfully, the reported properties are updated and the Digital Twin returns to a consistent state.

This desired/reported state synchronization enables a loosely coupled architecture in which different lifecycle components exchange information through the Digital Twin instead of relying on proprietary interfaces.

## Key Features

The current implementation demonstrates:

- Digital Twin-based software lifecycle management
- Context-aware software assignment
- Desired vs. reported state synchronization
- Automatic triggering of software deployment
- Continuous software monitoring
- Guaranteed delivery to intermittently connected devices
- One-to-one, one-to-many and fleet-wide deployments
- Horizontal scalability through parallel update execution
- Hierarchical software updates via gateway devices
- Extensible software lifecycle information model

## Architecture

The platform extends Eclipse Ditto with additional software management functionality. Together, the components below maintain a live, synchronized view of the software state across the managed fleet:

| Component | Folder | Tech | Port | Role |
|---|---|---|---|---|
| Fleet-manager GUI | `src/`, `public/` | React (CRA) | 3000 | Web UI for software assignment and monitoring: manage device twins, register software, create and enact deployments |
| Backend API | `backend/` | Node.js | 4000 | Bridge between Ditto and MQTT: ingests monitoring data into twins, watches desired-property changes, publishes device twins downstream, parses MSPL security policies. Its software lifecycle service dispatches desired software state of the `softwareManagement` feature to devices, writes their statuses back into the twins and detects convergence; `src/assignment-engine.js` assigns updates to the twins that need them |
| Device agents | `device-agents/` | Node.js | — | Installation and Verification Agents that apply apt package updates on Debian-based gateways and check the result; also an emulator of whole gateway fleets for experiments |
| Submanager | `submanager/` | Node.js | — | Edge-side deployment coordinator: receives twins via MQTT, relays to proxy (gateway) devices for hierarchical updates, or installs containers via the Docker Engine API |
| Monitoring agent | `monitoring-agent/` | Telegraf | — | Runs on devices; reports CPU/memory/disk/temperature/Docker/package metrics back to the Digital Twins via MQTT |
| Trust agent | `trust-agent/` | Python | — | Minimal containerized agent deployed to devices as the managed "software" |
| Eclipse Ditto | external | Java | 8080 | Digital Twin repository (things, policies, search, connectivity, history) |

Communication: the GUI talks to Ditto's HTTP API (port 8080); the backend uses Ditto's HTTP + WebSocket APIs and an MQTT broker (the authenticated Mosquitto of `docker-compose-ditto.yml`; the backend falls back to `test.mosquitto.org:1883` when `MQTT_BROKER` is unset); devices (device agents, submanager, monitoring agent) communicate over MQTT only.

The former TypeScript **Subfleet Manager** — which coordinated deployments through device-specific adapters (Docker, SSH, Axis camera API) — was superseded by the lighter `submanager/` component and removed from the working tree; it remains available in git history.

## Configuration

All connection settings are environment variables with development defaults (`ditto`/`ditto` against `localhost:8080`).

* GUI: `REACT_APP_DITTO_DOMAIN`, `REACT_APP_DITTO_USERNAME`, `REACT_APP_DITTO_PASSWORD`, `REACT_APP_DITTO_NAMESPACE` — defaults in [.env](.env), local overrides (and any real credentials) go in `.env.local`, which is git-ignored. CRA bakes these in at build time.
* Backend: `PORT`, `MQTT_BROKER`, `MQTT_USERNAME`, `MQTT_PASSWORD`, `DITTO_SERVER`, `DITTO_USERNAME`, `DITTO_PASSWORD`, the software lifecycle settings `SW_*` and `LEGACY_TRUST_AGENT` — see [backend/.env.example](backend/.env.example).
* Device agents: `AGENT_ROLE` (`installer`, `verifier` or `emulator`), `THING_ID`, `MQTT_BROKER_URL`, `MQTT_USERNAME`, `MQTT_PASSWORD` — see [device-agents/src/main.js](device-agents/src/main.js).
* Submanager: `MQTT_BROKER_URL`, `HOST_NAME`, `DOCKER_PORT`, `NAMESPACE_PREFIX` — see [submanager/.env](submanager/.env).

---

# Pre-requisites: Installing and running Eclipse Ditto

This platform builds upon and further extends the functionality of **Eclipse Ditto** — an open-source framework for building Digital Twins of Internet-connected devices. More information is available at https://eclipse.dev/ditto/.

Clone this repository:

```bash
git clone https://github.com/SINTEF-9012/ditto-fleet.git
```

Start Eclipse Ditto with the compose file included in this repository:

```bash
docker compose -f docker-compose-ditto.yml up -d
```

This runs Eclipse Ditto 3.9.7 (pinned by `DITTO_VERSION` in [.env](.env)) behind nginx on http://localhost:8080, with the Ditto UI at http://localhost:8080/ui/, plus a Mosquitto broker on port 1883 that accepts only the `MQTT_USERNAME`/`MQTT_PASSWORD` from `.env`. The things service keeps 30 days of twin history, including the `correlation-id` and `ditto-originator` of every change, so each step of a software update can be traced with Ditto's history API. The containers' memory limits add up to about 6.6 GB (raised above upstream's, which were exhausted by 10,000 twins), so give Docker about 8 GB of memory.

Alternatively, follow the upstream [Eclipse Ditto Docker deployment](https://github.com/eclipse-ditto/ditto/tree/master/deployment/docker).

The Ditto policy and example twins can be set up with the scripts and JSON files in `src/ditto-scripts/` (see its README).

---

# Running from source code

The platform consists of two main software components.

## Front-end GUI

From the repository root:

```bash
npm install
npm start
```

Open http://localhost:3000 to access the Fleet Manager interface.

## Back-end API

Open a separate terminal:

```bash
cd backend
npm install
npm start
```

The backend communicates with Eclipse Ditto and handles MQTT-based communication with downstream devices.

---

# Running as Docker containers

| File | Purpose |
|---|---|
| `docker-compose-ditto.yml` | Eclipse Ditto 3.9.7 stack (policies, things, things-search, connectivity, gateway, UI, MongoDB 7, nginx) plus an authenticated Mosquitto broker |
| `docker-compose-fleet.yml` | Full fleet stack: GUI + backend + submanager images on top of a running Ditto |
| `docker-compose-raspberry.yml` | Device-side stack for a Raspberry Pi: submanager + monitoring agent |
| `Dockerfile`, `backend/Dockerfile` | Images for the GUI (`rdautov/ditto-fleet-gui`) and backend (`rdautov/ditto-backend`) |
| `device-agents/Dockerfile` | Image for the Installation, Verification and emulator agents |

## Stand-alone GUI container

Pull and run the latest Docker image:

```bash
docker run -it -p 3000:3000 rdautov/ditto-fleet-gui
```

The container launches the React application on http://localhost:3000.

---

# Experiments

* [experiments/ssu-revision/](experiments/ssu-revision/README.md): evaluation of the software lifecycle model with a real Debian 12 gateway container updated through apt, emulated gateway fleets and registered-only twins (experiments E0–E4), including campaign scripts and analysis.
* [experiments/d6.2-scalability/](experiments/d6.2-scalability/README.md): the scripts and data used for the D6.2 scalability experiments (frozen submanager load-test variants, twin generator, the 100 generated twins).

---

# Research Background

This implementation accompanies research on Digital Twin-enabled software lifecycle management for IoT and edge systems.

The proposed approach demonstrates how Digital Twins can evolve beyond representing the physical state of devices to become interoperable software lifecycle artefacts shared between heterogeneous software management services.

The implementation has been evaluated using secure software update scenarios involving connected medical devices and demonstrates support for software assignment, deployment, verification, monitoring, hierarchical updates, and scalable fleet management.

---

# License

This repository is intended for research and experimental purposes. See [LICENSE](LICENSE) for usage terms.
