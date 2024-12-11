import { program } from "commander";
import { DittoConnector } from "../ditto/ditto-conn";
import { loadFromYaml } from "../model/model-handler";

import { createLogger, transports, format } from "winston";

const MQTT_BROKER = process.env.MQTT_BROKER //"localhost:1883"
const DITTO_SERVER = process.env.DITTO_SERVER

const logger = createLogger({
    transports: [new transports.Console()],
    format: format.combine(
        format.colorize({ all: true }),
        format.timestamp({
          format: 'DD-MM-YYYY hh:mm:ss.SSS A',
        }),
        format.align(),
        format.printf((info) => `[${info.timestamp}] ${info.level}: ${info.message}`)
      ),    
  });

import * as fs from "fs"
// import dockertwin from "../../sample/message/physical_device_with_docker.json";
// import sshtwin from "../../sample/message/physical_device_with_ssh.json"

program
    .name('dt')

program
    .command('load')
    .description('load model from local yaml file, create adapters, and publish them to ditto')
    .option('-m, --model <string>', 'initial model in yaml file', 'sample/models/sample-model.yaml')
    .action(async (options)=>{
        let model = loadFromYaml(options.model)
        let dtConn = new DittoConnector({
            host: 'tcp://test.mosquitto.org:1883',
            rootTopic: 'trudeplo'
        });
        dtConn.loadLocalModels(model.devices)
        await dtConn.updateAllDeviceInfo()
    })

program
    .command('heartbeat')
    .description('load model from local yaml file, create adapters, and publish them to ditto')
    .option('-m, --model <string>', 'initial model in yaml file', 'sample/models/sample-model.yaml')
    .action(async (options)=>{
        let model = loadFromYaml(options.model)
        let dtConn = new DittoConnector({
            host: 'tcp://test.mosquitto.org:1883',
            rootTopic: 'trudeplo'
        });
        dtConn.loadLocalModels(model.devices)
        await dtConn.startHeartBeatForAll()
    })

program
    .command('sub')
    .action(async ()=>{
        let dtConn = new DittoConnector({
            host: 'tcp://test.mosquitto.org:1883',
            rootTopic: 'trudeplo'
        });
        await dtConn.startSubDownstream()
    })

program
    .command('all')
    .description('load model from local yaml file, start heart beat and listen to downstream')
    .option('-m, --model <string>', 'initial model in yaml file', 'sample/models/sample-model.yaml')
    .action(async (options)=>{
        let model = loadFromYaml(options.model)
        let dtConn = new DittoConnector({
            host: 'tcp://test.mosquitto.org:1883',
            rootTopic: 'no.sintef.sct.giot.things'
        });
        dtConn.loadLocalModels(model.devices)
        dtConn.startSubDownstream()
        await dtConn.startHeartBeatForAll()
    })

program
    .command('start')
    .description('start from scratch')
    .action(async (cmd)=>{
        logger.info("Starting Subfleet Manager")
        logger.info("[MQTT]" + MQTT_BROKER)
        let dtConn = new DittoConnector({
            host: String(MQTT_BROKER),
            rootTopic: 'no.sintef.sct.giot.things'
        });
        dtConn.startSubDownstream()
    })

program
    .command('test')
    .description('start from scrach for new dt')
    .action(async(options)=>{
        // let cmd = "docker run --name trust-agent --rm -v /var/run/docker.sock:/var/run/docker.sock:ro -v /var/lib/dpkg/:/var/lib/dpkg/ --user \"telegraf:$(stat -c '%g' /var/run/docker.sock)\" rdautov/trust-agent:0.1"
        // let parse =  require('yargs-parser')
        // console.log(parse(cmd))
        let dtConn = new DittoConnector({
            host: 'tcp://localhost:1883',
            rootTopic: 'no.sintef.sct.giot.things'
        });
        
        let twin = JSON.parse(fs.readFileSync('sample/message/physical_docker.json', 'utf8'))
        dtConn.receiveTwin(twin)
    })
program.parse(process.argv)