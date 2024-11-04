import {request} from 'urllib'
import {parseString} from 'xml2js'
import {promisify} from 'util'
import fs from 'fs'
import { assert } from 'console';

const xml2json = promisify(parseString);

/**
 * https://www.axis.com/vapix-library/subjects/t10102231/section/t10036126/display?section=t10036126-t10176285
 */
const URIS = {
    morphean:{
        roxyurl:"/vms-portal/vms-api/v1/admin/cameras/proxyurl"
    },
    axis:{
        list:"axis-cgi/applications/list.cgi",
        upload:"axis-cgi/applications/upload.cgi",
        control:"axis-cgi/applications/control.cgi",
        basicdeviceinfo:"axis-cgi/basicdeviceinfo.cgi",
        lightcontrol:"axis-cgi/lightcontrol.cgi",
        firmware:"axis-cgi/firmwaremanagement.cgi",
        mqtt:{
            client:"axis-cgi/mqtt/client.cgi",
            event:"axis-cgi/mqtt/event.cgi"
        },
        ping:"axis-cgi/pingtest.cgi"
    }
}

export class AxisClient{
    
    deviceHost: string;
    username: string;
    password: string;

    constructor(deviceHost: string, username: string, password: string){
        if(!deviceHost.endsWith('/'))
            deviceHost = deviceHost + '/';
        if(!deviceHost.startsWith('http'))
            deviceHost = 'http://' + deviceHost;
        this.deviceHost = deviceHost;
        this.username = username
        this.password = password
    }

    public async ping(){
        const data = await this.requestAxisAPI('ping', {}, '?ip=127.0.0.1')
        return data
    }

    public async getDeviceInfo(){
        const data = await this.requestAxisAPI(
            'basicdeviceinfo',
            {
                content: JSON.stringify(
                {
                    apiVersion: '1.0',
                    method: 'getAllProperties'
                })
            }
        )
        return data
    }

    private async requestAxisAPI(
        operation: keyof typeof URIS.axis, 
        additionalOption: any, 
        param?: string 
    ){
        
        const res = await request(
            `${this.deviceHost}${URIS.axis[operation]}${param ?? ''}`,
            {
                method: operation == 'ping' ? 'GET' : 'POST',
                digestAuth: `${this.username}:${this.password}`,
                rejectUnauthorized: false,
                ...additionalOption
            }
        )

        //console.log(res)
        
        const {headers, status, data} = res
        
        if(status != 200){
            console.log(data.toString())
            throw Error (status.toString())
        }
        
        const contentType = headers['content-type']?.toString()
        if(contentType?.startsWith('application/json')){
            return JSON.parse(data.toString())
        }
        if(contentType?.startsWith('text/xml')){
            return await xml2json(data.toString())
        }
        else{
            return await data.toString()
        }
    }

    async listApplications(){
        let res = await this.requestAxisAPI('list', {})
        return res['reply']['application']
        return res;
    }

    async installApplication(filePath: string){
        assert(fs.lstatSync(filePath).isFile() )
        let res = await this.requestAxisAPI('upload', {
            files: filePath, 
            timeout: 30000
        })
        return res
    }

    async controlApplication(appName: string, action: 'start' | 'stop' | 'restart' | 'remove'){
        let params = `?action=${action}&package=${appName}`
        let res = await this.requestAxisAPI('control', {timeout:30000}, params)
        return res
    }

}