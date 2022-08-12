#!/usr/bin/env python3

import time
import json
import paho.mqtt.client as mqtt
import docker

# MQTT config
device_id = 'no.sintef.sct.giot:raspberry-c445'
username = 'ditto'
password = 'ditto'

broker = 'localhost'
port = 1883
topic = 'gateways/' + device_id

# Docker engine config 
docker_client = docker.from_env()

def connect_mqtt():
    
    def on_connect(client, userdata, flags, rc):
        if rc == 0:
            print("Connected to MQTT Broker!")
        else:
            print("Failed to connect, return code %d\n", rc)

    client = mqtt.Client(device_id)
    client.username_pw_set(username, password)
    client.on_connect = on_connect
    client.connect(broker, port)
    return client

def publish(client):
    
    while True:
        # containers = docker_client.containers.list()
        # print(json.dumps(containers))
        msg = '{"temperature": 125, "humidity": 100, "version": 10, "isRunning": 10, "thingId": "' + device_id + '"}'
        result = client.publish(topic, msg)
        # result: [0, 1]
        status = result[0]
        if status == 0:
            print(f"Send heart beat message to topic `{topic}`: " + msg)
        else:
            print(f"Failed to send message to topic {topic}")
        
        # send heart beat every 60 seconds
        time.sleep(60)

def get_running_containers():
    containers = docker_client.containers.list()
    container_json = []
    for container in containers:
        container_json = container.__dict__
        container_json.add

    return docker_client.containers.list()

def is_trust_agent_running():
    for container in docker_client.containers.list():
        if ('trust_agent' in container.name.lower()):
            return True
    return False

def get_container_info():
    pass

def run():

    #containers = docker_client.containers.list()
    #json_string = json.dumps([ob.__dict__ for ob in containers])
    #print(json_string)
    
    #for container in docker_client.containers.list():
        # print(container.__dict__)
    #    pass

    client = connect_mqtt()
    client.loop_start()
    publish(client)


if __name__ == '__main__':
    run()
