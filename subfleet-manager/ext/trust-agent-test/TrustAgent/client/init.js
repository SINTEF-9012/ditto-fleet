const tags = require('./tags');
const mqtt = require('./connection');
const client = mqtt.connectClient('localhost',4000);
const fs = require('fs');

if(process.argv.slice(2).length == 0){
    console.log("Device data is required!");
    process.exit();
}

const data = JSON.parse(fs.readFileSync(process.argv.slice(2)[0]));

client.on('connect', function () {
    client.subscribe(client.options.clientId);
    client.publish("RiskyAssessment",JSON.stringify(data))
    console.log(tags.tag,tags.cli(client.options.clientId),tags.con)
})

client.on('message', (topic, message) => {
    console.log(tags.tag,tags.top(topic),tags.mes(message.toString()));
});

client.on('close', function () {
    console.log(tags.tag,tags.cli(client.options.clientId),tags.dis)
})
