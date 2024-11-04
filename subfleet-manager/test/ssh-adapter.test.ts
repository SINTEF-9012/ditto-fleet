import { NodeSSH } from 'node-ssh'
import { AbstractAdapter } from '../src/adapters/abstract-adapter'
import { SshAdapter } from '../src/adapters/ssh/ssh-adapter'
import { loadFromYaml } from '../src/model/model-handler'

describe.skip("Try SSH",  ()=>{
    it("Create ssh adapter, and ping it with success", async ()=>{
        let model = loadFromYaml('sample/models/sample-model.yaml')
        let device = model.devices['my_local_rpi4_ssh']
        // console.log(device)
        const adapter: AbstractAdapter = new SshAdapter(device);
        
        adapter.setAgent(model.agents['nonta_ssh'])
        await adapter.loadAgent()

        let result = await adapter.runAgent()
        console.log(result)
    })
})