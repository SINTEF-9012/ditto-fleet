import { AbstractAdapter } from "../src/adapters/abstract-adapter"
import { ProcessAdapter } from "../src/adapters/local/process-adapter"

describe.skip("test if general adapters work or not",  ()=>{
    // Not working under WSL
    it("Create process-based adapter, and get information", async ()=>{
        let adapter:AbstractAdapter = new ProcessAdapter({host: 'local'})
        
        console.log(await(adapter._info()))
        adapter.setAgent({remoteFile: 'test1'})

        await adapter.loadAgent()
        await adapter.runAgent()
        let running = await adapter.isAgentRunning()
        expect(running).toEqual(true)

        await adapter.stopAgent()
        running = await adapter.isAgentRunning()
        expect(running).toEqual(false)
    })
})