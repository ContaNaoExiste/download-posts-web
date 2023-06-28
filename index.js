const Reddit  = require("./js/download_posts_reddit");
const request = require('request').defaults({ encoding: null });
const fs = require('fs');
const crypto = require("crypto");
const path = require("path");
const { mysqlQuery } = require("./js/connection/mysql");

function chunkArray(arr, len) {

    var chunks = [],
        i = 0,
        n = arr.length;

    while (i < n) {
        chunks.push(arr.slice(i, i += len));
    }

    return chunks;
}

function buscarTodosArquivosGeneric(filtro, qtdChunck, indice, fnc_add){
    const TAGS_IQDB = {}
    let directory_files = path.resolve(__dirname, "js", ".database", "log_iqdb");
    try {
      let folders = fs.readdirSync( directory_files);
      /*if( ! filtro)
        filtro = "ZettaiRyouiki"*/
    
      if(filtro){
        folders = folders.filter( (value)=>{ return value.toUpperCase().match( filtro.toUpperCase() )} );
    }
      if( folders.length ){
        let new_array = chunkArray(folders, qtdChunck)
        new_array[indice].forEach(element => {
            let files = fs.readdirSync( path.resolve(directory_files, element));
            files.forEach(file => {
                const rawdata = fs.readFileSync( path.resolve(directory_files, element, file))
                const json = JSON.parse(rawdata)
                fnc_add(json, TAGS_IQDB)
            }); 
        });
      }
    } catch (error) {
        console.log(error );
    }

    return TAGS_IQDB
}


function createSQLGeneric(tabela, method, method_sql){
    let sql_posts = path.resolve(__dirname, "mr", "sql_" + tabela + ".sql");
    if( fs.existsSync(sql_posts))
        fs.unlinkSync(sql_posts)
    fs.appendFileSync(sql_posts, `use dowload_posts_reddit;`)
    let indice = 0
    let continua_post = true
    while (continua_post) {
        const posts = buscarTodosArquivosGeneric(null, 100, indice ++, method);
        if(Object.values(posts).length){
            Object.values(posts).forEach(json => {
                let sql = null
                if(method_sql)
                    sql = method_sql(tabela, json)
                else 
                    sql = `\nINSERT INTO ${tabela}  (${Object.keys(json).join(", ")}) VALUES (${Object.values(json).map((item)=>{return "'" + ((! item )? "": item.toString().split("'").join("\\'")) + "'"}).join(", ")});`
                fs.appendFileSync(sql_posts, sql)
            });    
        }else{
            continua_post = false
        }
    }
}

function createSQLTags(){
    createSQLGeneric("iqdb_tag", (json, TAGS_IQDB)=>{
        if (json.iqdb && json.iqdb.results) {
            const tags = json.iqdb.results[0].thumbnail.tags
            if( tags){
                tags.forEach(tag => {
                    if(! TAGS_IQDB[tag]){
                        TAGS_IQDB[tag] = {tag: tag}
                    }
                });
            }
        }
    })
}

function createSQLPosts(){
    createSQLGeneric("post_reddit", (json, TAGS_IQDB)=>{
        if(json.reddit){//Trazendo os posts
            if( ! TAGS_IQDB[json.reddit.name]){
                TAGS_IQDB[json.reddit.name] = {
                    subreddit : json.reddit.subreddit,
                    url : json.reddit.url,
                    created: `FROM_UNIXTIME(\'${json.reddit.created}\')`,
                    name: json.reddit.name,
                    subreddit_id: json.reddit.subreddit_id,
                    post_id: json.reddit.id,
                }
            }
        }
       }, (tabela, json)=>{
        const created = json.created;
        delete json.created
        return `\nINSERT INTO ${tabela}  (${Object.keys(json).join(", ")}, created) VALUES (${Object.values(json).map((item)=>{return "'" + ((! item )? "": item.toString().split("'").join("\\'")) + "'"}).join(", ")}, ${created});`
       })
}

function createSQLRedditFiles(){
    createSQLGeneric("image_reddit", (json, TAGS_IQDB)=>{
        if(json.reddit){//Trazendo os posts
            if( ! TAGS_IQDB[json.name]){
                TAGS_IQDB[json.name] = {
                    name: json.name,
                    url: json.url,
                    url_iqdb: json.url_iqdb || json.url,
                    idreddit: `(select idreddit from post_reddit where name = \'${json.reddit.name}\' and subreddit = \'${json.reddit.subreddit}\')`
                }
            }
        }
       }, (tabela, json)=>{
        const idreddit = json.idreddit;
        delete json.idreddit
        return `\nINSERT INTO ${tabela}  (idreddit, ${Object.keys(json).join(", ")}) VALUES (${idreddit}, ${Object.values(json).map((item)=>{return "'" + ((! item )? "": item.toString().split("'").join("\\'")) + "'"}).join(", ")});`
    })
}

function createSQLImageIqdb(){
    createSQLGeneric("image_iqdb", (json, TAGS_IQDB)=>{
        if(json.reddit){//Trazendo os posts
            if( ! TAGS_IQDB[json.name]){
                TAGS_IQDB[json.name] = {
                    url_iqdb: json.url_iqdb || json.url,
                    idimage_reddit: `(select idimage_reddit from image_reddit where name = \'${json.name}\' )`,
                    idreddit: `(select idreddit from post_reddit where name = \'${json.reddit.name}\' and subreddit = \'${json.reddit.subreddit}\')`
                }
            }
        }
       }, (tabela, json)=>{
        const idreddit = json.idreddit;
        const idimage_reddit = json.idimage_reddit;
        delete json.idreddit
        delete json.idimage_reddit
        return `\nINSERT INTO ${tabela}  (idreddit, idimage_reddit, ${Object.keys(json).join(", ")}) VALUES (${idreddit}, ${idimage_reddit}, ${Object.values(json).map((item)=>{return "'" + ((! item )? "": item.toString().split("'").join("\\'")) + "'"}).join(", ")});`
    })
}

function createSQLIqdbResult(){
    createSQLGeneric("iqdb_result", (json, TAGS_IQDB)=>{
        if(json.iqdb && json.iqdb.results){
            json.iqdb.results.forEach((result, index) => {
                if( ! TAGS_IQDB[json.name + index]){
                    
                    TAGS_IQDB[json.name + index] = {

                        match: result.match,
                        width: result.width,
                        height: result.height,
                        type: result.type,
                        similarity: result.similarity,
                        similarityPercentage: result.similarityPercentage,
                        position: index,
                        idimage_iqdb: `(select idimage_iqdb from image_iqdb where url_iqdb = \'${json.url_iqdb || json.url}\' )`,
                        idimage_reddit: `(select idimage_reddit from image_reddit where name = \'${json.name}\' )`,
                        idreddit: `(select idreddit from post_reddit where name = \'${json.reddit.name}\' and subreddit = \'${json.reddit.subreddit}\')`
                    }
                }    
            });
            
        }
       }, (tabela, json)=>{
        const idreddit = json.idreddit;
        const idimage_reddit = json.idimage_reddit;
        const idimage_iqdb = json.idimage_iqdb;
        const position = json.position;
        delete json.idreddit
        delete json.idimage_reddit
        delete json.idimage_iqdb
        delete json.position
        return `\nINSERT INTO ${tabela}  (idreddit, idimage_reddit, idimage_iqdb, position, ${Object.keys(json).map((item)=>{return "`" + item + "`"}).join(", ")}) VALUES (${idreddit}, ${idimage_reddit}, ${idimage_iqdb}, ${position}, ${Object.values(json).map((item)=>{return "'" + ((! item )? "": item.toString().split("'").join("\\'")) + "'"}).join(", ")});`
    })
}

function createSQLIqdbSource(){
    createSQLGeneric("iqdb_source", (json, TAGS_IQDB)=>{
        if(json.iqdb && json.iqdb.results){
            json.iqdb.results.forEach((result, index) => {
                if( result.sources){
                    result.sources.forEach((source, index_src) => {
                        if( ! TAGS_IQDB[json.name + index + " " + index_src]){
                            TAGS_IQDB[json.name + index + " " + index_src] = {
                                service: source.service,
                                href: source.href,
                                fixed_href: source.fixedHref,
                                idiqdb_result:`(select idiqdb_result from iqdb_result res inner join image_iqdb iqdb on res.idimage_iqdb = iqdb.idimage_iqdb where iqdb.url_iqdb = \'${json.url_iqdb || json.url}\' and res.position = ${index})`, 
                                idimage_iqdb: `(select idimage_iqdb from image_iqdb where url_iqdb = \'${json.url_iqdb || json.url}\' )`,
                                idimage_reddit: `(select idimage_reddit from image_reddit where name = \'${json.name}\' )`,
                                idreddit: `(select idreddit from post_reddit where name = \'${json.reddit.name}\' and subreddit = \'${json.reddit.subreddit}\')`
                            }
                        }
                    })
                }
            });
            
        }
       }, (tabela, json)=>{
        const idreddit = json.idreddit;
        const idimage_reddit = json.idimage_reddit;
        const idimage_iqdb = json.idimage_iqdb;
        const idiqdb_result = json.idiqdb_result
        delete json.idreddit
        delete json.idimage_reddit
        delete json.idimage_iqdb
        delete json.idiqdb_result
        return `\nINSERT INTO ${tabela}  (idreddit, idimage_reddit, idimage_iqdb, idiqdb_result, ${Object.keys(json).map((item)=>{return "`" + item + "`"}).join(", ")}) VALUES (${idreddit}, ${idimage_reddit}, ${idimage_iqdb}, ${idiqdb_result}, ${Object.values(json).map((item)=>{return "'" + ((! item )? "": item.toString().split("'").join("\\'")) + "'"}).join(", ")});`
    })
}

function createSQLIqdbThumbnail(){
    createSQLGeneric("iqdb_thumbnail", (json, TAGS_IQDB)=>{
        if(json.iqdb && json.iqdb.results){
            json.iqdb.results.forEach((result, index) => {
                if( result.thumbnail){
                    if( ! TAGS_IQDB[json.name + index]){
                        TAGS_IQDB[json.name + index] = {
                            
                            src: result.thumbnail.src,
                            fixed_src: result.thumbnail.fixedSrc,
                            rating: result.thumbnail.rating,
                            score: result.thumbnail.score || 0,

                            idiqdb_result:`(select idiqdb_result from iqdb_result res inner join image_iqdb iqdb on res.idimage_iqdb = iqdb.idimage_iqdb where iqdb.url_iqdb = \'${json.url_iqdb || json.url}\' and res.position = ${index})`, 
                            idimage_iqdb: `(select idimage_iqdb from image_iqdb where url_iqdb = \'${json.url_iqdb || json.url}\' )`,
                            idimage_reddit: `(select idimage_reddit from image_reddit where name = \'${json.name}\' )`,
                            idreddit: `(select idreddit from post_reddit where name = \'${json.reddit.name}\' and subreddit = \'${json.reddit.subreddit}\')`
                        }
                    }
                }
            });
            
        }
       }, (tabela, json)=>{
        const idreddit = json.idreddit;
        const idimage_reddit = json.idimage_reddit;
        const idimage_iqdb = json.idimage_iqdb;
        const idiqdb_result = json.idiqdb_result
        delete json.idreddit
        delete json.idimage_reddit
        delete json.idimage_iqdb
        delete json.idiqdb_result
        return `\nINSERT INTO ${tabela}  (idreddit, idimage_reddit, idimage_iqdb, idiqdb_result, ${Object.keys(json).map((item)=>{return "`" + item + "`"}).join(", ")}) VALUES (${idreddit}, ${idimage_reddit}, ${idimage_iqdb}, ${idiqdb_result}, ${Object.values(json).map((item)=>{return "'" + ((! item )? ( (typeof item === "number")? item : ""): item.toString().split("'").join("\\'")) + "'"}).join(", ")});`
    })
}

function createSQLIqdbResultTag(){
    createSQLGeneric("iqdb_result_tag", (json, TAGS_IQDB)=>{
        if(json.iqdb && json.iqdb.results){
            json.iqdb.results.forEach((result, index) => {
                if( result.thumbnail){
                    if( ! TAGS_IQDB[json.name + index]){
                        if( result.thumbnail.tags){
                            result.thumbnail.tags.forEach(tag => {
                                TAGS_IQDB[json.name + index + tag] = {
                                    idtag: `(select idtag from iqdb_tag where tag = \'${tag.toString().split("'").join("\\'")}\')`,
                                    idiqdb_thumbnail: `(select idiqdb_thumbnail from iqdb_thumbnail thu inner join iqdb_result res on thu.idiqdb_result =res.idiqdb_result inner join image_iqdb iqdb on thu.idimage_iqdb =iqdb.idimage_iqdb where iqdb.url_iqdb = \'${json.url_iqdb || json.url}\' and res.position = ${index})`, 
                                    idiqdb_result:`(select idiqdb_result from iqdb_result res inner join image_iqdb iqdb on res.idimage_iqdb = iqdb.idimage_iqdb where iqdb.url_iqdb = \'${json.url_iqdb || json.url}\' and res.position = ${index})`, 
                                    idimage_iqdb: `(select idimage_iqdb from image_iqdb where url_iqdb = \'${json.url_iqdb || json.url}\' )`,
                                    idimage_reddit: `(select idimage_reddit from image_reddit where name = \'${json.name}\' )`,
                                    idreddit: `(select idreddit from post_reddit where name = \'${json.reddit.name}\' and subreddit = \'${json.reddit.subreddit}\')`
                                }       
                            });
                        }
                    }
                }
            });
            
        }
       }, (tabela, json)=>{
        const idreddit = json.idreddit;
        const idimage_reddit = json.idimage_reddit;
        const idimage_iqdb = json.idimage_iqdb;
        const idiqdb_result = json.idiqdb_result;
        const idiqdb_thumbnail = json.idiqdb_thumbnail;
        const idtag = json.idtag;
        delete json.idreddit
        delete json.idimage_reddit
        delete json.idimage_iqdb
        delete json.idiqdb_result
        delete json.idtag
        delete json.idiqdb_thumbnail
        return `\nINSERT INTO ${tabela}  (idreddit, idimage_reddit, idimage_iqdb, idiqdb_result, idtag, idiqdb_thumbnail) VALUES (${idreddit}, ${idimage_reddit}, ${idimage_iqdb}, ${idiqdb_result}, ${idtag}, ${idiqdb_thumbnail});`
    })
}

function main(params) {
    //Reddit.buscarPostsReddit("new");
    //createSQLTags()
    //createSQLPosts()
    //createSQLRedditFiles()
    //createSQLImageIqdb()
    //createSQLIqdbResult()
    //createSQLIqdbSource()
    //createSQLIqdbThumbnail()
    //createSQLIqdbResultTag()
   /* sql = `
    SELECT post.subreddit, post.url from post_reddit as post
left join image_reddit img_redd on post.idreddit = img_redd.idreddit
left join image_iqdb img_iqdb on post.idreddit = img_iqdb.idreddit and img_iqdb.idimage_reddit = img_redd.idimage_reddit
left join iqdb_result img_result on post.idreddit = img_result.idreddit and img_iqdb.idimage_iqdb = img_result.idimage_iqdb and img_result.idimage_reddit = img_redd.idimage_reddit
left join iqdb_thumbnail img_thumb on post.idreddit = img_thumb.idreddit and img_iqdb.idimage_iqdb = img_thumb.idimage_iqdb and img_thumb.idimage_reddit = img_redd.idimage_reddit and img_thumb.idiqdb_result = img_result.idiqdb_result
left join iqdb_result_tag img_result_tag on post.idreddit = img_result_tag.idreddit and img_iqdb.idimage_iqdb = img_result_tag.idimage_iqdb and img_result_tag.idimage_reddit = img_redd.idimage_reddit and img_result_tag.idiqdb_result = img_result.idiqdb_result and img_result_tag.idiqdb_thumbnail = img_thumb.idiqdb_thumbnail
left join iqdb_tag tag on img_result_tag.idtag = tag.idtag
where 
img_result.match in ('best')
and img_result.type in ('safe')
and tag.tag = 'maid'
group by post.url 
order by count(tag.idtag) desc
limit 0, 100;`

    mysqlQuery(sql).then((result)=>{
        console.log(result, " result");
    })*/

    console.log(new Date(1678369016.0 * 1000).toLocaleDateString("pt-BR").split("/").join("-"));
}

main();