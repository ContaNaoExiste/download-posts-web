var mysql = require('mysql');
const Imagem = require('./tabelas/Imagem');
const Tag = require('./tabelas/Tag');
const Reddit = require('./tabelas/Reddit');

let connection = null

function mysqlQuery(sql){
    //console.log(sql);
    return new Promise( (resolve, reject) =>{
        const connection =  connect();
        connection.query(sql, function(err, rows, fields) {
            if(connection){
                connection.end();
                //connection = null;
            }
            
            if (err){
                resolve( null);
            } 
            resolve( rows);
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
        connection.query(sql, function(err, rows, fields) {
            
            if (err){
                connection.rollback()
                connection.end()
                resolve( null);
            } else{
                connection.commit()
                connection.end()
                resolve( rows);
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
        
        if( ! data.imagem.idimagem){
            let sql = Imagem.select(data.imagem)
            let result = await mysqlQuery(sql)
            if( result ){
                if( result.length == 0){
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
                idimagem: data.imagem.idimagem
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

    if(data.imagem){
        
        if( ! data.imagem.idimagem){
            let sql = Imagem.select(data.imagem)
            let result = await mysqlQuery(sql)
            if( result ){
                if( result.length == 0){
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
                idimagem: data.imagem.idimagem
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
module.exports = {
    processaJson, adicionarImagemDatabase
}