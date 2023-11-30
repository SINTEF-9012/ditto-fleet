#!/usr/bin/python

import paho.mqtt.client as mqtt

client = mqtt.Client("send_mspl")
client.connect(host="test.mosquitto.org", port=1883)

f = open("mspl.xml")
string = f.read()
byteArray = bytes(string,  encoding='utf-8')
client.publish("no.sintef.sct.giot.things/ta-update", payload=byteArray, qos=0, retain=False)

print("MESSAGE SENT")