const iqdb = require('@l2studio/iqdb-api');
const fs = require('fs');
const path = require("path");

async function search_iqdb(url){
    return iqdb.search(url)
}

async function search_best_match(url){
    let data_ = null
    await search_iqdb(url).then( data =>{
        if( data.results){
            data.results.forEach( match => {
                if( match.match == "best"){
                    data_ = data
                }
            })

            
        }else{
            console.log( "1. Não achou ", url)
        }
        
        if( ! data_ == null){
            addLogIQDBSearch(data, url)
        }
    })
    
    return data_
}

function addLogIQDBSearch(data, url){
    //console.log(data, " data_", url, " url");
    let directory = __dirname + path.sep + ".database" + path.sep + "log_iqdb_404"
    if( ! fs.existsSync(directory)) fs.mkdirSync( directory)
    
    var pathFile = directory + path.sep + url + ".json"
    if( fs.existsSync(pathFile) ) fs.unlinkSync(pathFile)
    
    const json_completo = {
        data: data,
        url: url
    }
    fs.writeFileSync(pathFile, JSON.stringify(json_completo));
}
module.exports = {
    search_iqdb,
    search_best_match
}
