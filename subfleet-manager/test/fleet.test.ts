import { DittoConnector } from "../src/ditto/ditto-conn"
import { loadFromYaml } from "../src/model/model-handler"
import { downloadArtifact } from "../src/fleet/downloader"
import { verifyArtifact } from "../src/verifier/verify-artifact"

describe.only("test fleet-level functions",  ()=>{
    // Not working under WSL
    it("Download file", async ()=>{
        let model = loadFromYaml('sample/models/sample-model.yaml')
        let artifact = model.agents['ta_axis_hb']
        await downloadArtifact(artifact)
        console.log(artifact)

        await verifyArtifact(artifact)
    })
})