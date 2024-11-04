const colors = require('colors')

module.exports = {
    start: "[STARTUP]".brightGreen,
    tag: "[MQTT-CLIENT]".brightBlue,
    broad: "[PUBLISHED]".brightCyan,
    bro: "[BROKER]".yellow,
    con: "[CONNECTED]".brightGreen,
    dis: "[DISCONNECTED]".brightRed,
    sub: "[SUBSCRIBED]".cyan,
    cli: function(id){
        return "[CLIENT]".brightYellow + " " + id.yellow
    },
    top: function(top){
        return "[TOPIC]".brightMagenta + " " +  top.magenta
    },
    mes: function(mes){
        return "[MESSAGE]:".brightBlue + " " +  mes.cyan
    }
}