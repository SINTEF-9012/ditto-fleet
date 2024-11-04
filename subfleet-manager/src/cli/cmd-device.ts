import { program } from "commander";
import { createAdapter } from "../adapters/adapter-factory";
import { loadFromYaml } from "../model/model-handler";

program
    .name('device')

program
    .command('list')
    .alias('ls')
    .option('-m, --model <string>', 'initial model in yaml file', 'sample/models/sample-model.yaml')
    .option('-l, --long', 'show full model')
    .action(async (options)=>{
        const model = loadFromYaml(options.model)
        if(options.long){
            console.log(model['devices'])
        }
        else{
            console.log(Object.keys(model['devices']))
        }
    });


program
    .command('info')
    .description('show the core information of the remote device')
    .argument('<string>', 'device name')
    .option('-m, --model <string>', 'initial model in yaml file', 'sample/models/sample-model.yaml')
    .action(async (str, options)=>{
        const model = loadFromYaml(options.model)
        const device = model['devices'][str]
        if(!device){
            console.log(`device ${str} not found in the model`)
        }
        const adapter = createAdapter(device)

        let info = await adapter._info()
        console.log(info)
    });

    program
    .command('deploy')
    .description('load and run the agent into the device')
    .argument('<string>', 'device name')
    .option('-m, --model <string>', 'initial model in yaml file', 'sample/models/sample-model.yaml')
    .action(async (str, options)=>{
        const model = loadFromYaml(options.model)
        const device = model['devices'][str]
        const adapter = createAdapter(device)
        if(device.agent){
            adapter.setAgent(model['agents'][device.agent])
        }
        else{
            console.log('no agent specified')
        }
        let loaded = await adapter.loadAgent()
        console.log(loaded)
        let started = await adapter.runAgent()
        console.log(started)

    });



program.parse(process.argv)