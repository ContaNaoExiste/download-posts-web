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
    })
    
    return data_
}

module.exports = {
    search_iqdb,
    search_best_match
}
