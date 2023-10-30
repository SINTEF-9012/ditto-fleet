# Monitoring agent for Eclipse Ditto to be deployed at devices

Docker-ised monitoring agent built on top of Telegraf

# To build a new image

`docker image build --tag rdautov/ditto-monitoring-agent:0.1 --build-arg VERSION=0.1 .`

# To run the trust agent (public Mosquitto broker tcp://test.mosquitto.org:1883)

`docker run --name ditto-monitoring-agent -h=$HOSTNAME --rm -v /var/run/docker.sock:/var/run/docker.sock:ro --user telegraf:$(stat -c '%g' /var/run/docker.sock) rdautov/ditto-monitoring-agent:0.1`

# To run the trust agent together with a local Mosquitto broker container

`docker-compose up -d`
