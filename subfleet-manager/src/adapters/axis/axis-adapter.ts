import { getPassword } from "../../fleet/local-credential";
import { AbstractAdapter } from "../abstract-adapter";
import { AxisClient } from "./axis-api-client";

export class AxisAdapter extends AbstractAdapter{
    axisClient: AxisClient

    constructor(deviceModel:any){
        super(deviceModel)
        let username = deviceModel.execEnv.username
        let password = getPassword(deviceModel)
        this.axisClient = new AxisClient(deviceModel.host, username, password)
    }

    async _ping(): Promise<boolean> {
        let res = await this.axisClient.ping()
        if (res.startsWith('got'))
            return true;
        else   
            return false;
    }

    async _info(): Promise<string> {
        const {data: {propertyList}} = await this.axisClient.getDeviceInfo()
        const {Architecture, Version, ProdFullName, SerialNumber} = propertyList
        const info = `${ProdFullName}, ${Version} on ${Architecture}. SerialNumber: ${SerialNumber}`
        this.getModel().attributes = {
            ...this.getModel().attributes,
            arch: Architecture,
            info: info
        }
        return info
    }
    
    async loadAgent(): Promise<any> {
        let file = this.getAgent().localFile
        let result = await this.axisClient.installApplication(file)
        console.log(result)
        return result
    }
    async runAgent(): Promise<any> {
        const appName = this.getAgent()['name']
        if(!appName)
            throw Error('Axis require a name its application (trust agent)')
        let result = await this.axisClient.controlApplication(appName, 'start')
        return result
    }
    async stopAgent(): Promise<any> {
        //do nothing
        return 'not supported';
    }
    async isAgentRunning(): Promise<boolean> {
        return false;
    }
    
}