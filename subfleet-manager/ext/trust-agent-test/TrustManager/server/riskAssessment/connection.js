const {v4: uuid} = require('uuid')
const mqtt = require('mqtt');

module.exports.options = (broker,port,id,protocol) => {
    return {
        clientId: id,
        protocol: protocol,
        host: broker,
        port: port,
        rejectUnauthorized: false
    }
}

module.exports.uuidOptions = (broker,port,protocol) => {
    return {
        clientId: uuid(),
        protocol: protocol,
        host: broker,
        port: port,
        rejectUnauthorized: false
    }
}

module.exports.connect = (options) =>{
    return mqtt.connect('mqtt://'+options.host+":"+options.port,options)
}

