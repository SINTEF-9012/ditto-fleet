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

The platform extends Eclipse Ditto with additional software management functionality.

The main components include:

- **Fleet Manager GUI** for software assignment and monitoring
- **Backend API** responsible for interacting with Eclipse Ditto
- **Assignment Engine** for evaluating deployment conditions
- **Subfleet Manager** coordinating software deployments
- **Adapters** implementing device-specific installation procedures
- **Monitoring components** reporting software status back to Digital Twins

Together these components maintain a live, synchronized view of the software state across the managed fleet.

---

# Pre-requisites: Installing and running Eclipse Ditto

This fleet management tool builds upon and further extends the functionality of **Eclipse Ditto**—an open-source framework for building Digital Twins of Internet-connected devices.

More information is available here:

https://eclipse.dev/ditto/

The recommended installation method is Docker Compose as described by the Eclipse Ditto project.

Clone this repository:

```bash
git clone https://github.com/SINTEF-9012/ditto-fleet.git
```

Start Eclipse Ditto:

```bash
cd ditto/deployment/docker
docker-compose up -d
```

---

# Running from source code

The platform consists of two main software components.

## Front-end GUI

From the repository root:

```bash
npm run start
```

## Back-end API

Open a separate terminal:

```bash
cd backend
npm run start
```

The backend communicates with Eclipse Ditto and handles MQTT-based communication with downstream devices.

---

# Running as Docker containers

## Stand-alone GUI container

Pull the latest Docker image:

```bash
docker run -it -p 3000:3000 rdautov/ditto-fleet-gui
```

The container launches the React application.

Open:

```
http://localhost:3000
```

to access the Fleet Manager interface.

---

# Research Background

This implementation accompanies research on Digital Twin-enabled software lifecycle management for IoT and edge systems.

The proposed approach demonstrates how Digital Twins can evolve beyond representing the physical state of devices to become interoperable software lifecycle artefacts shared between heterogeneous software management services.

The implementation has been evaluated using secure software update scenarios involving connected medical devices and demonstrates support for software assignment, deployment, verification, monitoring, hierarchical updates, and scalable fleet management.

---

# License

This repository is intended for research and experimental purposes. Please refer to the repository license for usage terms.
