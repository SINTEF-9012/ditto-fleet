import express from 'express'
import { AbstractAdapter } from '../adapters/abstract-adapter'
import { createAdapter } from '../adapters/adapter-factory'
import { SshAdapter } from '../adapters/ssh/ssh-adapter'
import { loadFromYaml } from '../model/model-handler'

const app = express()

app.get('/api/test', (req, res)=>{
    res.json({
        message: 'ok'
    })
})

app.get('/api/device', async (req, res)=>{
    let deviceName:string = req.query.device as string
    let model = loadFromYaml('sample/models/sample-model.yaml')
    let device = model.devices[deviceName]
    //let device = model.devices['my_local_container_ssh']
        // console.log(device)
    const adapter: AbstractAdapter = new SshAdapter(device);
    let info = await adapter.launchOperation('info')
    res.json(adapter.getTwinModel())
})

app.get('/api/devices', async (req, res)=>{
    let model = loadFromYaml('sample/models/sample-model.yaml')

    let resultPromise = Object.values(model.devices).map(async (x: any) => {
        try{
            let adapter = createAdapter(x)
            await adapter.launchOperation('info')
            return adapter.getTwinModel()
        }
        catch(e){
            console.log(`Device ${x.thingId} cannot be created`)
            console.log(e)
            return null
        }
    })
    let resultAll = await Promise.all(resultPromise)
    res.json(resultAll.filter(x => x != null))
})

app.get('/api/deploy', async (req, res)=>{
    let deviceName:string = req.query.device as string
    let model = loadFromYaml('sample/models/sample-model.yaml')
    let device = model.devices[deviceName]
    const adapter: AbstractAdapter = new SshAdapter(device)
    adapter.setAgent(model.agents[device.agent])
    let result = await adapter.beforeLoadAgent()
    console.log(result)
    result = await adapter.launchOperation('load_agent')
    adapter.launchOperation('start_agent') //no await at the moment
    res.json(adapter.getTwinModel())
})

const port = 5000
app.listen(port, ()=>{console.log(`TruDeplo REST API listening on ${port}`)})

