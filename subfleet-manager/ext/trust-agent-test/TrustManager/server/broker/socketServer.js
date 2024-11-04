const { WebSocketServer } = require('ws');

module.exports = {
    openPort: function(port){
        let wss = new WebSocketServer({port:port});
        console.log("Socket Server created at port ",port);
        return wss;
    }
}