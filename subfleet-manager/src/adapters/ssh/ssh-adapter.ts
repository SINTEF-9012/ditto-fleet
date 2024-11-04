import { Agent } from "http";
import { NodeSSH } from "node-ssh";
import { AbstractAdapter } from "../abstract-adapter";

export interface SshDevice{
    host?: string;
    _agent?: SshAgent;
    agent?: any;
    execEnv?: any;
}

export interface SshAgent{
    localFile: string;
    remoteFile: string;
    cmd: string;
    cwd: string;
}

export class SshAdapter extends AbstractAdapter{
    ssh: NodeSSH;
    connPromise: Promise<NodeSSH> 
    conn: NodeSSH | undefined

    constructor(device: SshDevice){
        super(device)
        this.ssh = new NodeSSH()
        // console.log(device)
        this.connPromise = this.ssh.connect({
            host: device.host,
            port: device['execEnv']['port'],
            username: device['execEnv']['username'],
            password: device['execEnv']['password']
        })
        
    }
    getSshDevice(){
        return this.getModel() as SshDevice
    }
    async getConn(){
        if(! this.conn){
            this.conn = await this.connPromise
        }
        return this.conn
    }

    async _ping(): Promise<boolean> {
        let result = await this._info()
        return result.length > 0
    }

    async _info(): Promise<string> {
        const conn = await this.getConn()
        const result = await conn.execCommand('uname -a')
        const info = result.stdout
        const infoArray = info.split(' ')
        this.getModel().attributes.arch = infoArray[infoArray.length-2]
        return info
    }

    async loadAgent(): Promise<any>{
        const conn = await this.getConn()
        const agent = this.getAgent() as SshAgent
        const result = await conn.putFile(agent.localFile, `${agent.cwd}/${agent.remoteFile}`)
        console.log(result)
        if(agent.localFile.endsWith("zip")){
            const unzip = await conn.execCommand(
                `unzip -o ./${agent.remoteFile}`,
                {cwd:agent.cwd}
            )
            console.log(unzip)
            const chmod = await conn.execCommand(
                `chmod a+x ./${agent.cmd}`,
                {cwd:agent.cwd}
            )
            console.log(chmod.stdout)
        }
        else{
            const chmod = await conn.execCommand(
                `chmod a+x ./${agent.remoteFile}`,
                {cwd:agent.cwd}
            )
            console.log(chmod.stdout)
        }
        
    }
    async runAgent(): Promise<any> {
        const conn = await this.getConn();
        const agent = this.getAgent() as SshAgent
        let result = await conn.execCommand(
            agent.cmd,
            {cwd: agent.cwd}
        )
        return result.stdout
    }
    stopAgent(): Promise<any> {
        throw new Error("Method not implemented.");
    }
    isAgentRunning(): Promise<boolean> {
        throw new Error("Method not implemented.");
    }
}