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

async function updateTagsFromPost(data){
    let retorno = null;
    await new Promise(function (resolve, reject) {
        request.get("http://localhost:6966/tags_info_by_post", {body: JSON.stringify(data), headers:{'Content-Type': 'application/json', "cookie": process.env.REDDIT_COOKIE, "User-Agent": "PostmanRuntime/7.32.2"} }, function( error, response, body){
            if (!error && response.statusCode == 200) {
                retorno = Buffer.from(body);
            }
            resolve(retorno)
        });
    }).then((data => {
        retorno = data
    }));
    return retorno
}

async function getBufferImage(data){
    let retorno = null;
    await new Promise(function (resolve, reject) {
        request.get("http://localhost:6960/imagem", {body: JSON.stringify(data), headers:{'Content-Type': 'application/json', "cookie": process.env.REDDIT_COOKIE, "User-Agent": "PostmanRuntime/7.32.2"} }, function( error, response, body){
            if (!error && response.statusCode == 200) {
                retorno = Buffer.from(body);
            }
            resolve(retorno)
        });
    }).then((data => {
        retorno = data
    }));
    return retorno
}


async function verificarUrls(){
    
    /*sql = `
    select * from imagem 
    where post like '%sankakucomplex%'
    and url  like '%redd%';
    `*/
    /*sql = `
    select imagem.* from imagem
    left join imagem_tag on imagem_tag.idimagem = imagem.idimagem
    where imagem.idimagem = 233678
    group by imagem.idimagem 
    order by imagem.idimagem desc
    `*/
    /*
    sql = `
    select imagem.idimagem, REGEXP_REPLACE(imagem.url, ' ', '%20') as 'url', imagem.* from imagem
    where imagem.post = ''
    and imagem.remover = 0
    and imagem.width < 7500
    and imagem.height < 7500
    limit 10000
    `*/

    /*let sql = `
    select * from imagem where url like '%.redd%'
    and remover = 0
    `*/
/*
    let sql = `
     
    select * from imagem 
    where remover = 0
    and post <> ''
    and idimagem in(
		select idimagem from imagem_tag 
		group by idimagem 
		HAVING count(*) < 5
    );
    
    `*/
    /*let sql = `
    select * from imagem 
    where post = ''
    and remover = 0
    order by idimagem desc
    limit 550
    `*/

    let sql = `
            
        select imagem.* from imagem 
        where remover = 0
        and post <> ''
        and url not like 'https://s.sankakucomplex.com%'
        and idimagem not in(
            select idimagem from imagem_tag
            where idtag IN (
                select idtag from tag where descricao in ('SAFE', 'ERO', 'EXPLICIT', 'UNRATED')
            )
            group by idimagem
        )
        order by idimagem DESC
        limit 1097`
    
    let result = await mysqlQuery(sql)
    for(const item of result){
        try {

            /*console.log(item.post);
            let response = await updateTagsFromPost(item)
            let data = JSON.parse(response.toString())
            console.log(data);*/
            let url_crop = post.getCropUrlIfExist(item.url)
            let crop = await post.getImageUrlByURL(url_crop)
            item.url_iqdb = crop.url
            let response = await getBufferImage(item)
            if(response){
                let data = JSON.parse(response.toString())
                if(data.code){
                    //update = ` update imagem set remover = 1 where idimagem = ${item.idimagem}`
                    //await mysqlQuery(update)
                }
                console.log(data.imagem , " item");
    
            }
            
            //if( post.checkIfURLExist(item.url)){
                
            //}
            /*else{
                update = ` update imagem set remover = 1 where idimagem = ${item.idimagem}`
                await mysqlQuery(update)
            }
            */
            
            //
        /*//let existe = await post.checkIfURLExist( item.url )
        let crop_url = post.getCropUrlIfExist(item.url)
        retornocrop = await post.getImageUrlByURL(crop_url)
        crop_url = retornocrop.url
        //console.log(item.idimagem, crop_url);
        if( retornocrop.existe){
            const iqdb = await IQDB.search_best_match(crop_url)
            if(iqdb){
                item.url = await post.getOriginalURLIfExist(crop_url, iqdb)   
                retornooriginal = await post.getImageUrlByURL(item.url)
                //console.log(retornooriginal, " retornooriginal");
                if( ! retornooriginal.existe){
                    item.url = crop_url
                }else{
                    item.url = retornooriginal.url
                }
                //console.log(item.idimagem, 'final', item.url, 'orig', retornooriginal.url, 'crop', retornocrop.url);
                //console.log(JSON.stringify(iqdb));
                const fileBuffer = await post.getBufferImageByURL(item.url)
                if( fileBuffer && fileBuffer.fileBuffer)
                    await post.updateLogIQDBSearch(iqdb, null, fileBuffer.url, fileBuffer.fileBuffer, item.idimagem, fileBuffer.video_url)
            }else{
                update = ` update imagem set remover = 1 where idimagem = ${item.idimagem}`
                await mysqlQuery(update)
            }
        }else{
            update = ` update imagem set remover = 1 where idimagem = ${item.idimagem}`
            await mysqlQuery(update)
        }*/

        } catch (error) {
            console.log( error);
         console.log(item);       
        }
        
    }
}

verificarUrls()