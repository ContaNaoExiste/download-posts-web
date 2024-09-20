var mysql = require('mysql');
const Imagem = require('./tabelas/Imagem');
const Tag = require('./tabelas/Tag');
const Reddit = require('./tabelas/Reddit');
const fs = require('fs');
const path = require("path");
const axios = require('axios');

let connection = null

function mysqlQuery(sql){
    //console.log(sql);
    return new Promise( (resolve, reject) =>{
        const connection =  connect();
        connection.query(` LOCK TABLES imagem WRITE, reddit_post WRITE, tag WRITE, imagem_tag WRITE, reddit_imagem WRITE, imagem as u WRITE, imagem as u1 WRITE ;
            ${sql}; 
            UNLOCK TABLES; `, function(err, rows, fields) {
            if(connection){
                connection.end();
                //connection = null;
            }
            
            if (err){
                resolve( null);
            }
            resolve( rows[1]);
        });
    })
}

function mysqlInsertQuery(sql){
    return new Promise( (resolve, reject) =>{
        const connection = mysql.createConnection({
            multipleStatements: true,
            host     : process.env.MYSQL_HOST,
            database : process.env.MYSQL_DATABASE,
            user     : process.env.MYSQL_USER,
            password : process.env.MYSQL_PASSWORD
        });
          
        connection.connect();
        connection.query(` LOCK TABLES imagem WRITE, reddit_post WRITE, tag WRITE, imagem_tag WRITE, reddit_imagem WRITE, imagem as u WRITE, imagem as u1 WRITE ;
        ${sql}; 
        UNLOCK TABLES; `, function(err, rows, fields) {
            
            if (err){
                connection.rollback()
                connection.end()
                resolve( null);
            } else{
                connection.commit()
                connection.end()
                resolve(  rows[1] );
            }
        });
    })
}

function connect(){
    //if(connection == null ){
        const connection = mysql.createConnection({
            multipleStatements: true,
            host     : process.env.MYSQL_HOST,
            database : process.env.MYSQL_DATABASE,
            user     : process.env.MYSQL_USER,
            password : process.env.MYSQL_PASSWORD
        });
          
        connection.connect();
    //}
    return connection;
}

async function insertFromJson(tabela, json){
    //console.log("tabela", tabela, "json", json);
    let sql = `INSERT INTO ${tabela}  (${Object.keys(json).join(", ")}) VALUES (${Object.values(json).map((item)=>{return "'" + ((! item )? "": item.toString().split("'").join("\\'")) + "'"}).join(", ")})`
    //console.log(sql);
    return await mysqlInsertQuery(sql)
}


function has_tag_invalida(tags){
    const TAGS_INVALIDAS = process.env.TAGS_INVALIDAS.split(", ")
    let containsAny = false;

    if( tags){
        for (const element of tags) {
            if (TAGS_INVALIDAS.includes(element)) {
                containsAny = true;
                break;
            }
        }    
    }
    return containsAny
}


async function processaJson(data){
    if( ! data){
        return {
            error: "body está vazio",
            code: 404
        }
    }

    if(data.imagem){
        await salvarWallpaper(data)
        if( ! data.imagem.idimagem){
            let sql = Imagem.select(data.imagem)
            let result = await mysqlQuery(sql)
            if( result ){
                if( result.length == 0){
                    /*const sql_next_idimagem = `
                    SELECT u.idimagem + 1 AS idimagem
                    FROM imagem u
                    LEFT JOIN imagem u1 ON u1.idimagem = u.idimagem + 1
                    WHERE u1.idimagem IS NULL
                    ORDER BY u.idimagem
                    LIMIT 0, 1`
                    let next_idimagem = await mysqlQuery(sql_next_idimagem)
                    if(next_idimagem){
                        data.imagem.idimagem = next_idimagem[0].idimagem
                    }*/
                    result = await insertFromJson(Imagem.tabela, data.imagem)
                    if( result && result.insertId){
                         data.imagem.idimagem = result.insertId
                    }
                 }else{
                     data.imagem.idimagem = result[0].idimagem
                 }
            }
        }
        if(data.imagem.idimagem){
            let result = await mysqlQuery(Imagem.selectByUrlOrHashsumOrPostNotInIdimagem(data.imagem))
            if(result && result.length > 0){
                for (const img of result) {
                    await mysqlInsertQuery(Imagem.sqlRemoveImagemByIdimagem(img, data.imagem))
                }
                
            }
        }

        if(data.imagem.idimagem){
            await mysqlInsertQuery(Imagem.sqlUpdateImagem(data.imagem))
        }
        
        
        if(data.imagem.idimagem && data.tags){
            try {
                await mysqlInsertQuery(Tag.sqlDeleteImagemTag(data.imagem.idimagem)) 
            } catch (error) {console.log( error);}
            

            for (const tag of data.tags) {
                
                try {
                    await mysqlInsertQuery(Tag.sqlInsertTag(tag)) 
                } catch (error) {console.log( error);}
                
                try {
                    await mysqlInsertQuery(Tag.sqlInsertImagemTag(tag, data.imagem.idimagem)) 
                } catch (error) {console.log( error);}
                
            }
        }
        if(data.imagem.idimagem && data.reddit && data.reddit.post_id){
            data.reddit_post = {
                post_url: data.reddit.url,
                subreddit: data.reddit.subreddit,
                //created: `FROM_UNIXTIME('${data.reddit.created}')`,
                name: `t3_${data.reddit.post_id}`,
                subreddit_id: data.reddit.subreddit_id,
                post_id: data.reddit.post_id,
                community_icon: data.reddit.community_icon
            }
            let sql = Reddit.select(data.reddit_post)
            let result = await mysqlQuery(sql)
            //console.log(result, " result", sql, " data.reddit_post ", data.reddit_post);
            if( result.length == 0){
                result = await insertFromJson(Reddit.tabela, data.reddit_post)
                if( result.insertId){
                    data.reddit_post.idreddit_post = result.insertId
                }
            }else{
                data.reddit_post.idreddit_post = result[0].idreddit_post
            }

            let reddit_imagem = {
                idreddit_post: data.reddit_post.idreddit_post,
                idimagem: data.imagem.idimagem,
                idreddit_imagem: `${data.reddit_post.idreddit_post}${data.imagem.idimagem}`
            }
            result = await insertFromJson(Reddit.tabelaReddit_Imagem, reddit_imagem)
        }
    }
    return {
        imagem: data.imagem,
        tags: data.tags,
        reddit_post: data.reddit_post
    }
}

async function adicionarImagemDatabase(data) {
    if( ! data){
        return {
            error: "body está vazio",
            code: 404
        }
    }
    if(data.tags && has_tag_invalida(data.tags)){
        return {
            error: "Possui tag Inválida",
            code: 404,
            tags: data.tags
        }
    }

    await salvarWallpaper(data)
    
    if(data.imagem){
        
        if( ! data.imagem.idimagem){
            let sql = Imagem.select(data.imagem)
            let result = await mysqlQuery(sql)
            if( result ){
                if( result.length == 0){
                    /*const sql_next_idimagem = `
                    SELECT u.idimagem + 1 AS idimagem
                    FROM imagem u
                    LEFT JOIN imagem u1 ON u1.idimagem = u.idimagem + 1
                    WHERE u1.idimagem IS NULL
                    ORDER BY u.idimagem
                    LIMIT 0, 1`
                    let next_idimagem = await mysqlQuery(sql_next_idimagem)
                    console.log(next_idimagem, " next_idimagem");
                    if(next_idimagem){
                        data.imagem.idimagem = next_idimagem[0].idimagem
                    }*/
                    //console.log(data.imagem);
                    result = await insertFromJson(Imagem.tabela, data.imagem)
                    if( result && result.insertId){
                         data.imagem.idimagem = result.insertId
                    }
                 }else{
                     data.imagem.idimagem = result[0].idimagem
                 }
            }
        }
        if(data.imagem.idimagem){
            let result = await mysqlQuery(Imagem.selectByUrlOrHashsumOrPostNotInIdimagem(data.imagem))
            if(result && result.length > 0){
                for (const img of result) {
                    await mysqlInsertQuery(Imagem.sqlRemoveImagemByIdimagem(img, data.imagem))
                }
                
            }
        }

        if(data.imagem.idimagem){
            await mysqlInsertQuery(Imagem.sqlUpdateImagem(data.imagem))
        }
        
        
        if(data.imagem.idimagem && data.tags){
            try {
                await mysqlInsertQuery(Tag.sqlDeleteImagemTag(data.imagem.idimagem)) 
            } catch (error) {console.log( error);}
            

            for (const tag of data.tags) {
                
                try {
                    await mysqlInsertQuery(Tag.sqlInsertTag(tag)) 
                } catch (error) {console.log( error);}
                
                try {
                    await mysqlInsertQuery(Tag.sqlInsertImagemTag(tag, data.imagem.idimagem)) 
                } catch (error) {console.log( error);}
                
            }
        }
        if(data.imagem.idimagem && data.reddit && data.reddit.post_id){
            data.reddit_post = {
                post_url: data.reddit.url,
                subreddit: data.reddit.subreddit,
                //created: `FROM_UNIXTIME('${data.reddit.created}')`,
                name: `t3_${data.reddit.post_id}`,
                subreddit_id: data.reddit.subreddit_id,
                post_id: data.reddit.post_id,
                community_icon: data.reddit.community_icon
            }
            let sql = Reddit.select(data.reddit_post)
            let result = await mysqlQuery(sql)
            //console.log(result, " result", sql, " data.reddit_post ", data.reddit_post);
            if( result.length == 0){
                result = await insertFromJson(Reddit.tabela, data.reddit_post)
                if( result.insertId){
                    data.reddit_post.idreddit_post = result.insertId
                }
            }else{
                data.reddit_post.idreddit_post = result[0].idreddit_post
            }

            let reddit_imagem = {
                idreddit_post: data.reddit_post.idreddit_post,
                idimagem: data.imagem.idimagem,
                idreddit_imagem: `${data.reddit_post.idreddit_post}${data.imagem.idimagem}`
            }
            result = await insertFromJson(Reddit.tabelaReddit_Imagem, reddit_imagem)
        }
    }
    return {
        imagem: data.imagem,
        tags: data.tags,
        reddit_post: data.reddit_post
    }
}

async function pesquisarImagemDatabase(data){
    let result = await mysqlQuery(Imagem.selectByUrlOrPost(data.imagem))
    if(result && result.length > 0){
        return result[0]
    }
    return  null
}

async function salvarWallpaper(data){
    try {
        const path_folder = path.resolve("D:", "WallpaperAnimes")
        if(isWallpaper(data)){
            let name_file = decodeURI(data.imagem.url).split("/").pop()
            name_file = name_file.split("%20").join(" ")
            await downloadImage(data.imagem.url, path.resolve(path_folder, name_file))
        }    
    } catch (error) {
        console.log(error);
    }
}

async function downloadImage(url, filename) {
    const response = await axios.get(url, { responseType: 'arraybuffer' });
    fs.writeFileSync(path.resolve(filename) , response.data, (err) => {
      if (err) throw err;
      console.log("Wallpaper Salvo!")
    });
}
  
function isWallpaper(data){

    if(data.imagem.url.match(/\.(mp4|webm|zip|gif)$/) != null)
        return false

    const width = data.imagem.width
    const height = data.imagem.height

    if( height < 1080 || width < 1920)
        return false

    if(width < height)
        return false
    
    const proporcao = (height / width) * 100
    if( proporcao < 53 || proporcao > 60) 
        return false
    return true
}

function validateTags(data){
    return {
        has_tag_invalida: has_tag_invalida(data.tags)
    }
}

module.exports = {
    processaJson, adicionarImagemDatabase, pesquisarImagemDatabase, validateTags
}