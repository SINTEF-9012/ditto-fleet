import { AxisClient } from '../src/adapters/axis/axis-api-client'
import { AxisAdapter } from '../src/adapters/axis/axis-adapter'
import { loadFromYaml } from '../src/model/model-handler'
import {getPassword} from '../src/fleet/local-credential'



describe.skip("test axis connection",  ()=>{
    // Not working under WSL
    it("Ping axis", async ()=>{
        const adapter = new AxisAdapter({host:'192.168.32.4'})
        let res = await adapter.launchOperation('info')

        console.log(adapter.getModel())
    })
    it("list applications", async ()=>{
        // const client = new AxisClient('192.168.32.4')
        // console.log(await client.listApplications())
    })
    it.only("install application", async()=>{
        let model = loadFromYaml('sample/models/sample-model.yaml')
        let device = model['devices']['my_axis_cam1']

        let adapter = new AxisAdapter(device)
        adapter.setAgent(model.agents[device['agent']])
        await adapter.launchOperation('load_agent')
        console.log(adapter.getModel())
    }, 20000)
    it("control applications", async ()=>{
        // let client = new AxisClient('192.168.32.4')
        // let res = await client.controlApplication('heartbeatv2', 'remove')
        // console.log(res)
    }, 30000)
    it.only("get password", async ()=>{
        let model = loadFromYaml('sample/models/sample-model.yaml')
        let device = model['devices']['my_axis_cam1']
        let password = getPassword(device)
        console.log(password)
        console.log(device)
    })
})
