const {v4: uuid} = require('uuid')
//const webSocket = new require('ws');
const mqtt = require('mqtt');

function options(id, broker, port, protocol){
    return {
        clientId: id,
        host: broker,
        port: port,
        protocol: protocol,
        rejectUnauthorized: false
    }
}

function uuidOptions(broker, port, protocol){
    return {
        clientId: uuid(),
        host: broker,
        port: port,
        protocol: protocol,
        rejectUnauthorized: false
    }
}

function connect(options){
    protocol = options.protocol;
    if( protocol == "mqtt" ){
        return mqtt.connect('mqtt://'+options.host+':'+options.port, options);
    }else if( protocol == "mqtts" ){
        return mqtt.connect('mqtts://'+options.host+':'+options.port, options);
    }/*else if( protocol == "ws"){
        //return new webSocket("ws://"+options.host+':'+options.port);
    }*/else{
        return null;
    }
}

function connectClient(broker,port,id){
    if(id){
        return connect(options(id,broker,port,"mqtt"))
    }else{
        return connect(uuidOptions(broker,port,"mqtt"))
    }
}

module.exports = {
    options,
    uuidOptions,
    connect,
    connectClient
}
