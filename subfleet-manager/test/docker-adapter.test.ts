import { AbstractAdapter } from "../src/adapters/abstract-adapter"
import { DockerAdapter } from "../src/adapters/docker/docker-adapter"
import { loadFromYaml } from "../src/model/model-handler"
import { streamToString } from "../src/util/stream"


describe.skip("toy tests",  ()=>{
    // Not working under WSL
    it("Create docker adapter, and ping it with success", async ()=>{
        const docker = new DockerAdapter({host:'localhost'})
        let result = await docker._ping()
        
        expect(result).toEqual(true)
    })
    it("Should create a hello-world", async ()=>{
        const docker = new DockerAdapter({host:'localhost'})
        let container = await docker.createAndRunContainer({image: 'hello-world'})
        let info = await container._instance?.inspect()
        expect(info?.Name).toEqual('/trust_agent')
    })
    it("Load image from local file", async () =>{
        const docker = new DockerAdapter({host: 'localhost'})
        let image = await docker.loadImage({
            localFile: 'ext/trust-agent-image.tar.gz',
            image: 'songhui/trust-agent:latest'
        })
        expect(image).toEqual('songhui/trust-agent:latest')
    })
    it("get model from yaml, load image, and run container", async()=>{
        let model = loadFromYaml('sample/models/sample-model.yaml')
        let device = model['devices']['my_local_machine']
        const adapter: AbstractAdapter = new DockerAdapter(device)
        expect(adapter._ping()).toBeTruthy()

        adapter.setAgent(model['agents']['ta_docker_amd64'])
        let afterload = await adapter.loadAgent()
        expect(afterload).toEqual(true)
        
        let afterrun = await adapter.runAgent()
        // console.log(afterrun)
        expect(await adapter.isAgentRunning()).toEqual(true)
    })
    it("try to deploy on raspberry pi 4", async ()=>{
        let model = loadFromYaml('sample/models/sample-model.yaml')
        let device = model['devices']['my_local_rpi4']
        
        const adapter: AbstractAdapter = new DockerAdapter(device)
        expect(adapter._ping()).toBeTruthy()
        
        let agentName = device['agent']
        adapter.setAgent(model['agents'][agentName])
        let afterload = await adapter.loadAgent()
        expect(afterload.image).toEqual('songhui/trust-agent:arm64')
        // console.log(afterload)

        let afterrun = await adapter.runAgent()
        // console.log(afterrun)
        expect(await adapter.isAgentRunning()).toEqual(true)

        let afterstop = await adapter.stopAgent()
        // console.log(await streamToString(afterstop))
        expect(await adapter.isAgentRunning()).toEqual(false)

    }, 20000)
    it.skip("try to inspect container", async() =>{
        const docker = new DockerAdapter({host: 'localhost'})
        await docker.isAgentRunning()
    })
    it.only("receive a twin", async()=>{
        let model = loadFromYaml('sample/models/sample-model.yaml')
        let device = model['devices']['my_local_machine']

        const adapter: AbstractAdapter = new DockerAdapter(device)
        let info = await adapter.launchOperation('info')
        let upstream = adapter.getTwinModel()
        let downstream = {
            ...upstream,
            features:{
                ...upstream.features,
                agent:{
                    desiredProperties:{
                        ...model['agents']['ta_docker_amd64'],
                        status: 'running'
                    }
                }
            }
        }
        let result = await adapter.receiveTwin(downstream)
        let updstream2 = adapter.getTwinModel()
        console.log(adapter.getTwinString(' '))
        expect(updstream2.features.agent.properties.status).toEqual('running')
    })
})

