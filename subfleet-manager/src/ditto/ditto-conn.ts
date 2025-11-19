import { AbstractAdapter } from "../adapters/abstract-adapter"
import * as mqtt from "async-mqtt"
import { createAdapter } from "../adapters/adapter-factory";
import wait from 'wait'
import { watch } from "fs";

import { createLogger, transports, format } from "winston";

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

export interface MqttConnInfo {
    host: string;
    rootTopic: string;
}

export class DittoConnector{
    adapters: {[key:string]: AbstractAdapter} = {};
    adaptersByThingId: {[key:string]: AbstractAdapter} = {};
    client: mqtt.AsyncClient;
    connInfo: MqttConnInfo;
    constructor(connInfo: MqttConnInfo){
        this.client = mqtt.connect(connInfo.host)
        this.connInfo = connInfo
    }

    

    loadLocalModels(deviceModels: {[key:string]: any}){
        Object.keys(deviceModels).forEach(key =>{
            let device = deviceModels[key];
            let adapter = createAdapter(device); 
            this.adapters[key] =  adapter;
            if(device.thingId)
                this.adaptersByThingId[device.thingId] = adapter;
        })
        logger.debug(Object.keys(this.adapters))

    }

    async requestTwins(){
        return await this.client.publish(`${this.connInfo.rootTopic}/request`, 'FetchAll');
    }

    async startHeartBeatForAll(){
        Object.values(this.adapters).forEach(async (adapter)=>{
            this.heartbeat(adapter)
        })
        logger.debug('heart beat started')
    }

    async updateAllDeviceInfo(){
        let results = Object.values(this.adapters).map(async (adapter) => {
            let info = await adapter.launchOperation('info')
            await this.pubDevice(adapter)
            return info
        })
        let resolved = await Promise.all(results)
        logger.debug('All local devices')
        logger.debug(resolved)
        return;
    }

    async pubDevice(device: AbstractAdapter){
        let topic = `${this.connInfo.rootTopic}/upstream`;
        let twinString = device.getTwinString(' ');
        // console.log(twinString)
        return this.client.publish(topic, twinString)
    }

    async heartbeat(adapter: AbstractAdapter){
        let device = adapter.getModel();
        let state = device.meta.latestState;
        if(state == 'created'){
            await(adapter.launchOperation('info'))
        }
        else{
            await(adapter.launchOperation('ping'))
        }
        await this.pubDevice(adapter)
        await wait(30 * 1000) //wait a minute (half for testing purpose)
        await this.heartbeat(adapter)
    }

    async startSubDownstream(){
        logger.info(`Subscribing...`)
        await this.client.subscribe(`${this.connInfo.rootTopic}/downstream`)
        logger.info(`Subscribed to: ${this.connInfo.rootTopic}/downstream`)
        this.client.on('message', async (topic, payload, packet)=>{
            if(topic == `${this.connInfo.rootTopic}/downstream`){
                logger.debug(payload.toString())
                let twinModel = JSON.parse(payload.toString())
                logger.info("Downstream message received!")
                await this.receiveTwin(twinModel)
                //TODO: the monitoring agent config update
            }
        })
    }

    async receiveTwin(twinModel: any){
        
        /* logger.warn("###################### TIMESTAMP ######################")
        logger.warn("Subfleet Manager: instantiate adapter and launch container: start")
        logger.warn(Date.now())
        logger.warn(new Date().toISOString())
        logger.warn("###################### TIMESTAMP ######################") */
        
        twinModel = this.processTwinModel(twinModel)
        //logger.debug(twinModel)
        let adapter = this.locateAdapter(twinModel)
        logger.info("Found adapter for: " + twinModel._thingId)
        let twin = await adapter.receiveTwin(twinModel)
        logger.debug("twin in receiveTwin: --->", twin)

        /* logger.warn("###################### TIMESTAMP ######################")
        logger.warn("Subfleet Manager: instantiate adapter and launch container: finish")
        logger.warn(Date.now())
        logger.warn(new Date().toISOString())
        logger.warn("###################### TIMESTAMP ######################") */
    }

    private processTwinModel(model: any){
        let trustagent = model['_features']['cyber']['_desiredProperties']['trustAgent']
        let execEnv = {}
        if("container_image" in trustagent){
            execEnv = {
                _type: 'exec_env',
                name: 'docker_engine',
                port: '2375'
            }
        }
        else if("process_name" in trustagent){
            execEnv ={
                _type: 'exec_env',
                name: 'ssh',
                port: '22',
                username: 'pi',
                password: 'raspberry'
            }
        }
        model['execEnv'] = execEnv
        //let agent = model._features.cyber._desiredProperties.trustAgent

        model['tagent']={...trustagent.ta_meta}
        model['tagent']['status'] = trustagent['container_status'] ?? trustagent['process_status']

        logger.debug("processTwinModel parsed model: ---> " + JSON.stringify(model))
        logger.info("Desired software:")
        logger.info(JSON.stringify(trustagent, null, 2))

        return model
    }

    private locateAdapter(model: any){
        const downId = model._thingId;
        logger.debug(`finding device: ${downId}`)
        if(downId in this.adaptersByThingId) {
            return this.adaptersByThingId[downId]
        }
        // Thinking about other ways to match existing adapters
        logger.debug('creating adapter')
        // continue if a new adapter must be created


        let newModel = {
            thingId: downId,
            policyId: model._policyId,
            host: model._attributes.ip_address,
            attributes: model._attributes,
            meta: {} as any,
            execEnv: model.execEnv
        }
        newModel.meta['lastSeen'] = new Date('1995-12-17T03:24:00');
        newModel.meta['atestFailMessage'] = '';
        let adapter = createAdapter(newModel)

        this.adapters[downId] = adapter;
        this.adaptersByThingId[downId] = adapter;
        // git this.heartbeat(adapter)
        return adapter
    }

}