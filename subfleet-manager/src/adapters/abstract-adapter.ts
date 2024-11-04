import { downloadArtifact } from "../fleet/downloader";
import { verifyArtifact } from "../verifier/verify-artifact";

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

type OperationName = 'ping' | 'info' | 'load_agent' | 'start_agent' | 'stop_agent' | 'ping_agent';
type DeviceState = 'created' | 'connected' | 'disconnected';
type AgentStatus = 'unloaded' | 'running' | 'stopped';

export interface BasicDeviceModel {
    thingId?: string;
    policyId?: string;
    _agent?: any;
    execEnv?: any;
    agent?: any;
    host?: string;
    meta:{
        lastOperation?: OperationName;
        lastTried?: Date;
        latestFailMessage?: string;
        latestState?: DeviceState;
        lastSeen?: Date;
    };
    attributes:{
        info?: string;
        arch?: string;
        type?: string;
    };
}

export interface BasicArtifactModel{
    _instance?: any;
    status?: AgentStatus;
}

export abstract class AbstractAdapter{
    model: BasicDeviceModel
    constructor(model: {agent?: any, attributes?:any}){
        this.model = {...model, meta:{}, attributes: {...model.attributes}}
        this.model.meta.latestState = 'created'

        logger.debug("abstract adapter constructor --------------",model)
    }
    

    abstract _ping(): Promise<boolean>
    abstract _info(): Promise<string>

    async launchOperation(operation: OperationName){
        logger.debug(`launch operation "${operation}"`)
        let model = this.getModel()
        logger.debug("abstract adapter model --------------",model)
        model.meta.lastOperation = operation;
        model.meta.lastTried = new Date();
        try{
            let result: any = undefined
            switch(operation){
                case 'info': {
                    result = await this._info();
                    model.attributes!.info = result;
                    break;
                }
                case 'ping': {
                    result = await this._ping();
                    break;
                }
                case 'load_agent': {
                    //FIXME: skipp the loading??
                    //await this.beforeLoadAgent()
                    result = await this.loadAgent();
                    //this.getAgent()['status'] = 'stopped'
                    break;
                }
                case 'start_agent': {
                    result = await this.runAgent();
                    this.getAgent()['status'] = 'started'                    
                    break;
                }
                case 'stop_agent':{
                    result = await this.stopAgent();
                    break;
                }
                case 'ping_agent':{
                    result = await this.isAgentRunning();
                    break;
                }
            }
            
            model.meta.lastSeen = new Date();
            model.meta.latestState = 'connected'
            model.meta.latestFailMessage = ''
            return result;
        }
        catch(e: any){
            logger.error(e.toString())
            model.meta.latestFailMessage = e.toString()
            if(operation == 'info' || operation == 'ping')
            model.meta.latestState = 'disconnected'
            return 'not connected'
        }

    }

    

    /**
     * assign an agent to the device
     * @param agent 
     */
    setAgent(agent:{}){
        this.model['_agent'] = {...agent, status:'unloaded'}

    }

    getAgent(){
        return this.model['_agent'] 
    }

    async beforeLoadAgent(){
        logger.debug('before loading')
        const agent = this.getAgent()
        try{ await downloadArtifact(agent) }
        catch(e){
            //if this is already a localFile, we can tolerate a failure of download
            if(agent.url || !agent.localFile) 
                throw e;
        }
        if(agent.developer && agent.signature){
            try{ 
                let verif = await verifyArtifact(agent) 
                if(verif == false)
                    throw Error ('not verified')
            }
            catch(e){
                throw e
            }
        }
    }

    /**
     * load the agent into device
     */
    abstract loadAgent(): Promise<any>;

    /**
     * start the agent
     */
    abstract runAgent(): Promise<any>;

    abstract stopAgent(): Promise<any>;

    /**
     * Check if the assigned agent is running or not
     */
    abstract isAgentRunning(): Promise<boolean>;

    getModel(){
        return this.model
    }

    getTwinModel(){
        let model = this.getModel()
        return {
            thingId: model.thingId,
            policyId: model.policyId,
            attributes: model.attributes,
            features:{
                execEnv:{
                    properties: model.execEnv
                },
                agent:{
                    properties: model._agent
                },
                meta:{
                    properties: model.meta
                }
            }
        }
    }

    getTwinString(space?: string){
        let model = this.getTwinModel()
        if(space){
            return JSON.stringify(model, null, space)
        }
        else{
            return JSON.stringify(model)
        }
    }

    /**
     * Update local device based on the received digital twin
     * Only support "adding an agent" at the moment
     * @param twin 
     */
    async receiveTwin(twin: any){
        // if(twin._features.agent && twin._features.agent._desiredProperties)
        await this.updateAgentFromTwin(
            twin.tagent
        );
    }


    private async updateAgentFromTwin(desiredAgent: any) {
        
        this.setAgent(desiredAgent)
        await this.launchOperation('start_agent');
        await this.isAgentRunning();
        
        /* let currentAgent = this.getAgent();
        // logger.debug(desiredAgent)
        if (!currentAgent) {
            this.setAgent(desiredAgent); //status will be set to 'unloaded'
            currentAgent = this.getAgent();
        }
        else if (
            (currentAgent.url != desiredAgent.url) ||
            (currentAgent.signature != desiredAgent.signature)
        ) { //when a different agent was required
            currentAgent.url = desiredAgent.url
            currentAgent.remoteFile = desiredAgent.remoteFile
            currentAgent.developer = desiredAgent.developer
            currentAgent.cmd = desiredAgent.cmd
            currentAgent.cwd = desiredAgent.cwd
            currentAgent.localFile = desiredAgent.localFile
            currentAgent.status = 'unloaded';
        }

        if (currentAgent.status == 'unloaded'
            && (desiredAgent.status == 'stopped'
                || desiredAgent.status == 'running')) {
            await this.launchOperation('load_agent');
            currentAgent = this.getAgent();
        }
        if (currentAgent.status == 'stopped' && desiredAgent.status == 'running') {
            await this.launchOperation('start_agent');
            await this.isAgentRunning();
            currentAgent = this.getAgent();
        }
        if (currentAgent.status == 'running' && desiredAgent.status == 'stopped') {
            await this.launchOperation('stop_agent');
            await this.isAgentRunning();
            currentAgent = this.getAgent();
        } */
    }
}

