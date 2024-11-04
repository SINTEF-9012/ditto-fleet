import { loadFromYaml } from "../src/model/model-handler"


describe.skip("test model handling",  ()=>{
    // Not working under WSL
    it("Load from Yaml file", async ()=>{
        let result = loadFromYaml('sample/models/sample-model.yaml')
        console.log(result.devices['my_local_machine'])
        

    })
})
