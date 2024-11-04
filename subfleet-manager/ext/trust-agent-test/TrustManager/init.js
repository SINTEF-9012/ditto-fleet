const broker = require("./server/broker/config").start("4000");
const tags = require("./server/broker/tags");
const risk = require('./server/riskAssessment/client');

let riskClient = risk.connectClient('localhost',4000,"RiskyAssessment")

riskClient.on('connect',()=>{
    riskClient.subscribe(riskClient.options.clientId);    
})

riskClient.on('message',(topic,message)=>{
    res = risk.assessRisk(JSON.parse(message))
    console.log(tags.risk,tags.top(topic),tags.mes(res));
})