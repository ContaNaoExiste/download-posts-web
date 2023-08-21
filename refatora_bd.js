const fs = require('fs');
const path = require("path");
const post = require('./js/download_posts_reddit');
const { func } = require('assert-plus');
const sizeOf = require('buffer-image-size');
const { mysqlInsertQuery, mysqlQuery } = require('./js/connection/mysql');
const FindFiles = require('file-regex')
const IQDB  = require("./js/iqdb");
const compressImages = require("compress-images")
const request = require('request').defaults({ encoding: null });

async function main(){
    sql = `select * from imagem where url like'%redd%' and url not like'%crop=smart%' order by idimagem asc limit 50;`
    result = await mysqlQuery(sql)

    for(const item of result){
        try {
            const iqdb = await IQDB.search_best_match(item.url)
            if(iqdb){
                const url = post.getOriginalURLIfExist("jpg", iqdb)
                const fileBuffer = await post.getBufferImageByURL(url)
                if( fileBuffer && fileBuffer.fileBuffer){
                    const hashsum = post.getHashSumFromBuffer(fileBuffer.fileBuffer)
                    if( hashsum == item.hashsum){
                        update =  `UPDATE imagem SET url = '${post.replaceAll(fileBuffer.url, "'", "\\'")}' WHERE idimagem = ${item.idimagem}`
                        await mysqlInsertQuery(update)
                        
                        if(iqdb.results && iqdb.results.length > 0){
                            try {
                                result = iqdb.results[0]
                                if( result.thumbnail && result.thumbnail.tags && result.thumbnail.tags.length > 0){
                                    for(let  tag of result.thumbnail.tags){
                                        tag = `'${post.replaceAll(tag, "'", "\\'")}'`
                                        let insert_tag = `INSERT INTO tag (\`descricao\`) SELECT ${tag} WHERE NOT EXISTS (SELECT idtag FROM tag WHERE descricao = ${tag});`
                                        await mysqlInsertQuery(insert_tag)
                                        insert_tag =  `INSERT INTO imagem_tag (\`idimagem\`, \`idtag\`) SELECT (SELECT idimagem FROM imagem WHERE hashsum = '${hashsum}' limit 1) as idimagem,  (SELECT idtag FROM tag WHERE descricao = ${tag}) as idtag;`
                                        await mysqlInsertQuery(insert_tag)
                                    }
                                }    
                            } catch (error) {}
                        }
                    }else{
                        const select = `SELECT idimagem FROM imagem WHERE hashsum = '${hashsum}' and idimagem <> ${item.idimagem}`
                        result_select = await mysqlQuery(sql)
                        if(result_select && result_select.length > 0){
                            const delete_ = `DELETE FROM imagem_tag WHERE idimagem = ${item.idimagem};
                            DELETE FROM reddit_imagem WHERE idimagem = ${item.idimagem};
                            DELETE FROM imagem WHERE idimagem = ${item.idimagem};`
                            await mysqlInsertQuery(delete_)          
                        }
                        console.log( "hashsum diferente");
                    }
                }
            }else{
                const delete_ = `DELETE FROM imagem_tag WHERE idimagem = ${item.idimagem};
                DELETE FROM reddit_imagem WHERE idimagem = ${item.idimagem};
                DELETE FROM imagem WHERE idimagem = ${item.idimagem};`
                await mysqlInsertQuery(delete_)
            }
        } catch (error) {
            
        }
        
    }
}

//main()

async function verificarUrls(){

    sql = `select * from imagem where remover = 0`
    result = await mysqlQuery(sql)
    for(const item of result){
        let existe = await post.checkIfURLExist( item.url )
        if( ! existe ){
            update = ` update imagem set remover = 1 where idimagem = ${item.idimagem}`
            await mysqlQuery(update)
            console.log( item, existe );
        }
    }
}

verificarUrls()