const connection = require('./connection');
const riskTable = require('./riskTable.json');
let risk = 0;
function assessRisk(deviceData){
    let riskLevel = 0, versioning = deviceData.software.version.split(".");
    // ASSESSING DEVICE SOFTWARE 
    riskLevel += riskTable.software[deviceData.software.name][deviceData.software.distribution][versioning[0]][versioning[1]];
    // ASSESSING DEVICE HARDWARE
    riskLevel += riskTable.hardware.CPU[deviceData.hardware.cpu];
    riskLevel += riskTable.hardware.RAM[deviceData.hardware.ram];
    let hdReconfigEval = 0;
    let trustScore = 0;
    hdReconfigEval += riskTable.hardwareReconfig.authorized[deviceData.hardwareReconfig.authorized];
    let riskTrustScore = 0;
    //console.log(hdReconfigEval);
    if(!isNaN(riskLevel)){
             risk =  riskLevel / 3
        if( risk <= 1 ){
            riskTrustScore = 1;
            trustScore = riskTrustScore + hdReconfigEval;
            console.log(trustScore);
            return "low";
        }else if( risk <= 2 ){
            riskTrustScore = 0;
            trustScore = riskTrustScore + hdReconfigEval;
            //trustScore = computeTrustScore(risk, riskTrustScore, hdReconfigEval)
            console.log(trustScore);
            return "medium";
        }else if(risk <=3){
            riskTrustScore = - 1;
            console.log(risk);
            //trustScore = riskTrustScore + hdReconfigEval;
            trustScore = computeTrustScore(risk, riskTrustScore, hdReconfigEval)
            //trustScore = computeTrustScore(risk, riskTrustScore, hdReconfigEval)
            console.log('The devices trust score is', trustScore);
            return "high";
        }
    
    }else{
        // throw "invalid data";
        return "invalid data";
    }
}

function connectClient(broker,port,id){
    if(id){
        return connection.connect(connection.options(broker,port,id,"mqtt"))
    }else{
        return connection.connect(connection.uuidOptions(broker,port,"mqtt"))
    }
}

function computeTrustScore(risk, riskTrustScore, hdReconfigEval){
    trustScore = riskTrustScore + hdReconfigEval;
    return trustScore;
}

module.exports = {
    assessRisk,
    connectClient,
}