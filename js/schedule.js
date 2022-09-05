
const schedule = require('node-schedule');
const fs = require('fs');
const path = require("path");

let job = null;

async function startJob( params, callback ){
    if( job ){
        job.cancel();
    }
    const config = {
        "rule": params
    }
    salvarConfigJob( config );

    job = schedule.scheduleJob(params, callback);
}

async function stopJob( ){
    return new Promise(function (resolve, reject) {
        if( job){
            job.cancel();    
            resolve();
        }else{
            resolve();
        }
    });    
}

function salvarConfigJob(config){
    let directory = __dirname + path.sep + ".database";
    if( ! fs.existsSync(directory)) fs.mkdirSync(directory);
    
    directory += path.sep + "job";
    if( ! fs.existsSync(directory)) fs.mkdirSync(directory);

    const filePath = directory + path.sep + "job.json";
    try {
        fs.writeFileSync(filePath, JSON.stringify(config));
    } catch (error) { 
        console.log(error);
        if( process.env.DEBUG_ERROR === "true"){
            console.error("readFileParseJson", error);
        }
    }
}

function getConfigJob(){
    let directory = __dirname + path.sep + ".database";
    if( ! fs.existsSync(directory)) fs.mkdirSync(directory);
    
    directory += path.sep + "job";
    if( ! fs.existsSync(directory)) fs.mkdirSync(directory);

    const filePath = directory + path.sep + "job.json";
    let rawdata = fs.readFileSync(filePath);
    return JSON.parse(rawdata);
}

module.exports = {
    startJob,
    stopJob,
    getConfigJob
}
