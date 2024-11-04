import { program } from "commander";
import * as mqtt from "async-mqtt";
import prompts from 'prompts';
import { loadFromYaml } from "../model/model-handler";

// const LISTEN_TO = "tellu_gw1"
const LISTEN_TO = "raspberrypi_1"
const SAMPLE_AGENT = "ta_docker_armv7"

program
    .name('mqtt')
    

program
    .command('ostart')
    .action(async (options)=>{
        const client = mqtt.connect('tcp://test.mosquitto.org:1883')
        let result = await client.subscribe('no.sintef.sct.giot.things/upstream')
        let result2 = await client.subscribe('no.sintef.sct.giot.things/request')
        const sampleModel =  loadFromYaml('sample/models/sample-model.yaml')
        let flagged = false
        client.on('message', async (topic, payload, packet)=>{
            if(topic == 'no.sintef.sct.giot.things/request'){
                let message = payload.toString()
                if(message == 'FetchAll'){
                    console.log('Sending downstream device models...');
                    let model = sampleModel
                    Object.values(model.devices).forEach( (dev: any) =>{
                        let payload = {
                            _thingId: dev.thingId,
                            _attributes: {
                                host: dev.host,
                                arch: dev.arch
                            },
                            _features:{
                                execEnv:{
                                    _properties: dev.execEnv
                                },
                                agent:{
                                    _properties: {}
                                },
                                meta:{
                                    _properties: {}
                                }
                            }
                        }
                        client.publish('no.sintef.sct.giot.things/downstream', JSON.stringify(payload))
                    })
                }
            }
            if(topic == 'no.sintef.sct.giot.things/upstream'){
                if(flagged)
                    return;
                let model = JSON.parse(payload.toString())
                if(model.thingId == `no.sintef.sct.giot:${LISTEN_TO}`){
                    console.log(JSON.stringify(model, null, ' '))
                    flagged = true
                    let input = await prompts({
                        type: 'text',
                        name: 'command',
                        message: 'What do you want?',
                        validate: value => value in ['start', 'stop'] ? 'invalid command' : true
                    });
                    flagged = false
                    if(input.command == 'start'){
                        console.log('create response...')
                        
                        let desired = {
                            ...sampleModel.agents[SAMPLE_AGENT],
                            status: 'running'
                        }
                        if(!model.features.agent){
                            model.features.agent = {}
                        }
                        model.features.agent._desiredProperties = desired
                        let newModel = {
                            _thingId: model.thingId,
                            _attributes: model.attributes,
                            _features: model.features
                        }

                        console.log(JSON.stringify(newModel, null, ' '))
                        await client.publish('no.sintef.sct.giot.things/downstream', JSON.stringify(newModel))
                        
                        console.log('response sent')
                    }
                    else if(input.command == 'stop'){
                        console.log('create response to stop the trust agent');
                        let desired = {...model.features.agent.properties}
                        desired.status = 'stopped'
                        model.features.agent.desiredProperties = desired;
                        await client.publish('no.sintef.sct.giot.things/downstream', JSON.stringify(model))
                        console.log('response sent')
                    }
                    
                }
            }
        })
        
    })

program
    .command('start')
    .action(async (options)=>{
        const client = mqtt.connect('tcp://test.mosquitto.org:1883')
        
        const twin = require('../../sample/message/physical_docker.json')
        client.publish('no.sintef.sct.giot.things/downstream', JSON.stringify(twin))
        
        
    })

program.parse(process.argv)