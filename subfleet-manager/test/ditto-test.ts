import { DittoConnector } from "../src/ditto/ditto-conn"

describe.skip("test ditto",  ()=>{
    // Not working under WSL
    it("Create docker adapter, and ping it with success", async ()=>{
        let dtConn = new DittoConnector({
            host: 'tcp://test.mosquitto.org:1883',
            rootTopic: 'trudeplo'
        });
        await dtConn.startHeartBeatForAll()
    })
})