import { program } from "commander";
import { loadFromYaml } from "../model/model-handler";

program
    .name('model')

program
    .command('load')
    .description('load model from local yaml file')
    .argument('<string>')
    .action((str)=>{
        let model = loadFromYaml(str)
        console.log(JSON.stringify(model, null, ' '))
    })

program.parse(process.argv)