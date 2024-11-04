#!/bin/bash

# install docker
curl -sSL https://get.docker.com | sh

# Enable Docker remote engine
sudo mkdir -p /etc/systemd/system/docker.service.d/
sudo printf "[Service]\nExecStart=\nExecStart=/usr/bin/dockerd -H tcp://0.0.0.0:2375 -H unix:///var/run/docker.sock" > /etc/systemd/system/docker.service.d/startup_options.conf

sudo systemctl daemon-reload
sudo systemctl restart docker.service

