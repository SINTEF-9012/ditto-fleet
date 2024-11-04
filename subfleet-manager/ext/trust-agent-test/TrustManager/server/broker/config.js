const tags = require('./tags');
const aedes = require('aedes')();
const server = require('net').createServer(aedes.handle)

let clients = new Array;
let topics = new Array;

// CLIENT CONNECTED
aedes.on('client',(client)=>{
    // Check if client is already connected
    if(!clients.includes(client.id) && (client.id != "RiskyAssessment")) {
        // IF NOT, publish a new message with the Broker's ID on the "<Client ID>" Topic
        aedes.publish({topic:client.id,payload:tags.tag + " " + aedes.id.bold.cyan,retain: true, qos:1})
        // Subscribe to the "<Client ID>" Topic and await for packets
        aedes.subscribe(client.id,(packet,cb)=>{
            if(packet.topic == "Assessment"){
                try{
                    data = JSON.parse(packet.payload);
                    aedes.publish({topic:"RiskyAssessment", payload:data});
                }catch(e){
                    aedes.publish({topic:"Assessment", payload:"Invalid data format!"});
                }
                // aedes.publish({topic:client.id, payload: assessRisk(JSON.parse(packet.payload))})
            }
            
            console.log(tags.tag,tags.cli(client.id),tags.top(packet.topic),tags.mes(packet.payload.toString()))
        })
    }
    clients.push(client.id)
    console.log(tags.tag,tags.cli(client.id),tags.con)
});

// CLIENT DISCONNECTED
aedes.on('clientDisconnect', (client)=>{
    clients.splice(clients.indexOf(client),1)
    console.log(tags.tag,tags.cli(client.id),tags.dis)
})

// CLIENT SUBSCRIBES TO TOPIC
aedes.on('subscribe',(subscriptions, client)=>{
    let topic = subscriptions[0].topic;
    topics.push(topic);
    console.log(tags.tag,tags.cli(client.id),tags.sub,tags.top(topic))
})

// CLIENT UNSUBSCRIBES FROM TOPIC
aedes.on('unsubscribe',(topic, client)=>{
    topics.splice(topics.indexOf(topic[0]),1);
    console.log(tags.tag,tags.cli(client.id),tags.unsub,tags.top(topic[0]))
})


module.exports = {
    clients: clients,
    topics: topics,
    start: function(port){
        server.listen(port, () =>{
            console.log("MQTT Broker started at".blue,port.bold.yellow)
            console.log("Broker ID: ".blue,aedes.id.bold.cyan)
        })
        return aedes;
    }
}