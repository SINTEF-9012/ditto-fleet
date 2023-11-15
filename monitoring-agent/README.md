# Monitoring agent for Eclipse Ditto to be deployed at devices

Docker-ised monitoring agent built on top of Telegraf

# To build a new image

`docker image build --tag rdautov/ditto-monitoring-agent:0.1 --build-arg VERSION=0.1 .`

# To run the trust agent (public Mosquitto broker tcp://test.mosquitto.org:1883)

`docker run --name ditto-monitoring-agent -h=$HOSTNAME --rm -v /var/run/docker.sock:/var/run/docker.sock:ro -v /:/hostfs:ro -e IP_ADDRESS=$(ifconfig | grep 192.168 | awk '{print $2}') -e SYSTEM_VERSION="$(lsb_release -rs)" -e SYSTEM_NAME="$(lsb_release -is)" -e SYSTEM_DESCRIPTION="$(lsb_release -ds)" -e HOST_ETC=/hostfs/etc -e HOST_PROC=/hostfs/proc -e HOST_SYS=/hostfs/sys -e HOST_VAR=/hostfs/var -e HOST_RUN=/hostfs/run -e HOST_MOUNT_PREFIX=/hostfs --user telegraf:$(stat -c '%g' /var/run/docker.sock) rdautov/ditto-monitoring-agent:0.2`

# To run the trust agent together with a local Mosquitto broker container

`docker-compose up -d`
