const colors = require('colors')

module.exports = {
    broad: "[PUBLISHED]".brightCyan,
    con: "[CONNECTED]".brightGreen,
    dis: "[DISCONNECTED]".brightRed,
    sub: "[SUBSCRIBED]".cyan,
    unsub: "[UNSUBSCRIBED]".red,
    tag: "[MQTT-BROKER]".brightBlue,
    risk: "[MQTT-RISK-ASSESSMENT]".brightRed,
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