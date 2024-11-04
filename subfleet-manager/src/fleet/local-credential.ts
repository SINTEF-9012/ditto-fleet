import { readFileSync } from "fs";
import { stringify } from "querystring";
import { parse } from "yaml";

function findWithName(dictionary: any, name: string, username:string){
    if(name in dictionary){
        return dictionary[name][username]
    }
}

export function getPassword(device: any){
    try{
        const text = readFileSync('./ext/local.credential', 'utf-8');
        const raw = parse(text);

        const username = device.execEnv.username

        let password = findWithName(raw.thingIds, device.thingId, username)
        if(! password){
            password = findWithName(raw.execEnvs, device.execEnv.name, username)
        }
        device.execEnv.password = password
        return password
    }
    catch(e){
        console.log(e)
        return ''
    }
}