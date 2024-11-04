import assert from 'assert';
import { Console } from 'console';
import download from 'download';
import fs from 'fs';

export interface BasicDownloadableArtifact{
    url?: string;
    localFile?: string;
    signature?: string;
}

export const DOWNLOAD_ROOT = './ext/download'

export async function downloadArtifact(model: BasicDownloadableArtifact){
    const url = model.url
    if(! url){
        throw Error('No url provided')
    }
    try{
        if (!fs.lstatSync(DOWNLOAD_ROOT).isDirectory()){
            fs.mkdirSync(DOWNLOAD_ROOT)
        }
    }
    catch(e){
        fs.mkdirSync(DOWNLOAD_ROOT)
    }
    const fileName = url.substring(url.lastIndexOf('/')+1)
    await download(url, DOWNLOAD_ROOT)
    const localFile = `${DOWNLOAD_ROOT}/${fileName}`
    assert( fs.lstatSync(localFile).isFile() )

    console.log('Artifact downloaded from ${url}')

    const sigurl = `${url}.sig`
    try{
        
        const sigBuff = await download(sigurl)
        const sig = sigBuff.toString()
        console.log(sig)
        model.signature = sig
        console.log(`Signature from ${sigurl}`)
    }
    catch(e){
        console.log(`Signature not found at ${sigurl}`)
    }



    model.localFile = localFile

    console.log('Artifact downloaded from ${url}')

}