# trudeplo
Trustworthy deployment for critical components on Edge  devices

This repo contains the adapters to different types of devices, and the local coordinator wrapping up the adapters. The fleet-level management based on the Ditto Digital Twin solution, together with a GUI, can be found in another repo [ditto-fleet](https://github.com/SINTEF-9012/ditto-fleet).

# Quickest start
One command to load the sample model and start uploading the device information every minute, and listen to updates from ditto-fleet:

```npm start dt all```

Without ditto, the reported device twins can be received here:

```mqtt sub -t 'trudeplo/device' -h 'test.mosquitto.org' -v```

To simulate the fleet management (e.g., installing agents), a mock up client can be used:

```npm start mqtt start```

# Quick start for the ERATOSTHENES POC v1

In the PoC, we can demonstrate the remote deployment of a sample trust agent (written in JavaScript and running on Node.js) on a mock up device, which is simualted by a container. The approach is shown by two containers running in the same network: 
- *trudeplo*, the deployment engine
- *mockdevice*, an Alpine-based linux container with OpenSSH server and Node.js

Build the images from source code:
```
npm run build
docker compose build
```

Launch the containers:
```
docker compose up
```

To check the deployment tool running, use a browser or other REST client for the following commands:

```
http://localhost:5000/api/devices
```

This will show all the specified devices, in different types.

```
http://localhost:5000/api/device?device=my_local_container_ssh
```

Show the runtime status of the device named "my_local_container_ssh", which is the mockup device simulated by the container

```
http://localhost:5000/api/deploy?device=my_local_container_ssh
```

Deploy the sample trust againt into the container. Details of the trust agent can be found in the sample file:

```yaml
ta_node_ssh:
    _from: software_artifact
    developer: songhui
    name: main.sh
    url: https://eratblob.blob.core.windows.net/newcontainer/TrustAgentNode.zip
    cmd: 'sh main'
    cwd: '/opt'
    remoteFile: TA.zip
```

The code is wrapped up as a zip file stored in an Azure Blob. It is signed by developer 'songhui', with signatures stored in the same blob. 
