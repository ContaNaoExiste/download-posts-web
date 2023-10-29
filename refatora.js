const fs = require('fs');
const path = require("path");
const post = require('./js/download_posts_reddit');
const { func } = require('assert-plus');
const sizeOf = require('probe-image-size');
const { mysqlInsertQuery, mysqlQuery } = require('./js/connection/mysql');
const FindFiles = require('file-regex')
const IQDB  = require("./js/iqdb");
const compressImages = require("compress-images")
const request = require('request').defaults({ encoding: null });

const hash = {}
/*function main(){
    const dias = fs.readdirSync( path.resolve("js", ".database", "log_iqdb"))
    dias.forEach(pasta => {
        const arquivos = fs.readdirSync( path.resolve("js", ".database", "log_iqdb", pasta))
        arquivos.forEach(arquivo => {
            const sql = fs.readFileSync(path.resolve("js", ".database", "log_iqdb", pasta, arquivo)).toString().split(/\r?\n/)
            sql.forEach(linha => {
                if(linha.startsWith("INSERT INTO iqdb_tag")){
                    tag = linha.split("INSERT INTO iqdb_tag (`tag`) SELECT '")[1].split("' where not exists (")[0]
                    if(! hash[tag]){
                        hash[tag] = linha;
                        sql_final = `INSERT INTO iqdb_tag (\`tag\`) SELECT '${tag}' where not exists (select idtag from iqdb_tag where tag = '${tag}' );`
                        fs.appendFileSync( path.resolve("js", ".database", "database_tags", pasta + ".sql"), sql_final + "\n")
                    }
                    
                }
            });
        });
    });
}*/

async function processamento(caminho, reverse, chunk){
    let arquivos = fs.readdirSync(caminho)
    
    if( arquivos.length ==0){
        try {
         
            fs.rmdirSync(caminho)   
        } catch (error) {
        console.log("error ", error);        
        }
        return null;
    }
    if(reverse){
        arquivos = arquivos.reverse()
    }
    if( chunk){
        try {
            arquivos = post.chunkArray(arquivos, Math.round(arquivos.length / 2))[0].reverse()   
        } catch (error) {
            
        }
    }
    for(const file of arquivos){
        try {
            const file_path = path.resolve(caminho, file)
            if( fs.lstatSync(file_path).isDirectory()){
                await processamento(file_path, reverse, chunk)
            }else{
                try {
                    await adcionarSQLBD(file_path);   
                } catch (error) {
                    console.log(error);
                }
            }
        } catch (error) {}
    }
}

async function adcionarSQLBD(path_imagem){
    let nova_sql = null
    let name = path_imagem.split("\\").pop().split(".")[0]
    name = post.replaceAll(name, " ", "") + ".sql"
    data = await adcionarSQLBDByFile(path_imagem)
    if( ! data){
        return null
    }

    nova_sql = await gerarNovaSql(data)
    if( nova_sql ){
        for(const fragment_sql of nova_sql.split(";\n")){
            if( fragment_sql.length > 5 ){
                await mysqlInsertQuery(fragment_sql)
            }
        }
        try {
            fs.unlinkSync(path_imagem)
            //comprimirERenomearImagem(path_imagem, path.resolve("js", ".database", "reddit_files_copia", nome_pasta))   
        } catch (error) {
            console.log(error);
        }
        //console.log("Concluiiu o  database");
    }else{
        try {
            fs.renameSync(path_imagem, path.resolve("js", ".database", "reddit_tempfiles", path_imagem.split(path.sep).pop()))   
        } catch (error) { }
    }
}

function comprimirERenomearImagem(path_imagem, path_imagem_out){
    
    const compression = 90
    caminho_imagem = path_imagem.split(__dirname)[1]
    caminho_imagem = caminho_imagem.substring(1);
    
    caminho_saida = path_imagem_out.split(__dirname)[1]
    
    console.log(caminho_imagem ,  " caminho_imagem ", caminho_saida, " caminho_saida");
    compressImages(caminho_imagem, caminho_saida, { compress_force: false, statistic: true, autoupdate: true }, false,
        { jpg: { engine: "mozjpeg", command: ["-quality", compression] } },
        { png: { engine: "pngquant", command: ["--quality=" + compression + "-" + compression, "-o"] } },
        { svg: { engine: "svgo", command: "--multipass" } },
        { gif: { engine: "gifsicle", command: ["--colors", "64", "--use-col=web"] } },
        async function (error, completed, statistic) {
            console.log(error);
            console.log("Foi");
            //if( ! error)
                //fs.unlinkSync(path_imagem)
        }
    )
}


const { default: axios } = require("axios")

 async function main(){
    
    let result = await mysqlQuery("select * from imagem where url like '%sankakucomplex%' where idimagem = 29952")
    for(const item of result){
        let post = item.post.split("/").pop()
        let sankaku = await axios(`https://capi-v2.sankakucomplex.com/posts/keyset?limit=40&tags=id_range:${post}`)
        let data = sankaku.data
        mysqlQuery(`UPDATE imagem SET url = '${data.data[0].file_url}' WHERE idimagem = ${item.idimagem}`)
        console.log(`UPDATE imagem SET url = '${data.data[0].file_url}' WHERE idimagem = ${item.idimagem}`);
    }
    //post.removeFilesDuplicate()

    //path_reddit = path.resolve("js", ".database", "reddit_files")
    //
    //
    //
    //
    //
    //
    //
    //
    //
    //
    //
    //
    //
    //

    //processamento(path_reddit, true)
    //processamento(path_reddit, false, true)
    //processamento(path_reddit, true, true)
    //await processamento(path_reddit)
}

function quebrarSQL(sql, path_imagem, imagem) {
    reddit_post = {}
    imagens = []
    tags = []
    /*** TAGS */
    str_tags = sql.split("INSERT INTO iqdb_thumbnail (`src`, `fixed_src`, `rating`, `score`, `idiqdb_result`, `idimage_iqdb`, `idimage_reddit`, `idreddit`) VALUES (")[0].split("INSERT INTO iqdb_tag (`tag`) SELECT ")
    str_tags.shift()    
    str_tags.forEach(str_tag => {
        tag = str_tag.split(" where not exists ")[0]
        tags.push(tag)
    });

    /*** IMAGENS */
    dimensions = getDimensionFromFile(path_imagem)
    str_imagens = sql.split("INSERT INTO image_reddit (`url`, `url_iqdb`, `name`, `idreddit`) VALUES (")[1].split(", (select idreddit from post_reddit where name = ")[0]
    str_imagens = str_imagens.split(", ")
    str_imagens.pop()
    str_imagens.forEach(imagem => {
        imagens.push({
            url: imagem,
            hashsum: post.getHashSumFromFile(path_imagem),
            height: dimensions.height,
            width: dimensions.width
        })
    });
    /*** POST */
    str_post = sql.split("INSERT INTO post_reddit (`subreddit`, `url`, `created`, `name`, `subreddit_id`, `post_id`) SELECT ")[1].split(" where not exists (select idreddit from post_reddit where name = ")[0]
    str_post = str_post.split(", ")
    //console.log(str_post);
    reddit_post.subreddit = str_post[0]
    reddit_post.url  = str_post[1]
    reddit_post.created = str_post[2]
    reddit_post.name  = str_post[3]
    reddit_post.subreddit_id = str_post[4]
    reddit_post.post_id = str_post[5]

    return {
        reddit_post : reddit_post,
        imagens: imagens,
        tags: tags
    }
}

function getDimensionFromFile(file){
    return sizeOf.sync(fs.readFileSync(file));
}

function getDimensionFromBuffer(buffer){
    return sizeOf.sync(buffer)
}

async function gerarNovaSql(data){
    if( ! data)
        return null
    let encontrou = false
    //console.log("-------");
    /*** POST */
    sql_post = ''
    sql_reddit_imagens = ''
    if(data.reddit_post){
        result = await mysqlQuery(`select post_id from reddit_post where post_id = ${reddit_post.post_id}`)
        if(result.length == 0){
            sql_post = `INSERT INTO reddit_post (\`subreddit\`, \`post_url\`, \`created\`, \`name\`, \`subreddit_id\`, \`post_id\`) VALUES (${data.reddit_post.subreddit}, ${data.reddit_post.url}, ${data.reddit_post.created}, ${data.reddit_post.name}, ${data.reddit_post.subreddit_id}, ${data.reddit_post.post_id});\n`
        }else{
            sql_post = ''
        }
    }
    
    
    /*** IMAGENS */
    sql_imagens = ``
    sql_reddit_imagens = ``
    for(const element of data.imagens){
        result = await mysqlQuery(`select * from imagem where url = ${element.url} OR hashsum = '${element.hashsum}'`)
        if(result && result.length > 0){
            encontrou = true
            console.log("Achou essa imagem", element.hashsum, element.url);
        }
        sql_imagens = sql_imagens + `INSERT INTO imagem (\`url\`, \`hashsum\`, \`height\`, \`width\`) VALUES (${element.url}, '${element.hashsum}', ${element.height}, ${element.width});\n`
        if(data.reddit_post){
            sql_reddit_imagens = sql_reddit_imagens + `INSERT INTO reddit_imagem (\`idimagem\`, \`idreddit_post\`) SELECT (SELECT idimagem FROM imagem WHERE hashsum = '${element.hashsum}' limit 1) as idimagem,  (SELECT idreddit_post FROM reddit_post WHERE post_id = ${reddit_post.post_id}) as idreddit_post;\n`
        }
    }

    /*** TAGS */
    sql_tags = ``
    sql_imagens_tags = ``
    data.tags.forEach(tag => {
        sql_tags = sql_tags + `INSERT INTO tag (\`descricao\`) SELECT ${tag} WHERE NOT EXISTS (SELECT idtag FROM tag WHERE descricao = ${tag});\n`
      
        data.imagens.forEach(element => {
            sql_imagens_tags = sql_imagens_tags + `INSERT INTO imagem_tag (\`idimagem\`, \`idtag\`) SELECT (SELECT idimagem FROM imagem WHERE hashsum = '${element.hashsum}') as idimagem,  (SELECT idtag FROM tag WHERE descricao = ${tag}) as idtag;\n`
        })
    });
    if( ! encontrou)
        return ` ${sql_post}${sql_imagens}${sql_tags}${sql_imagens_tags}${sql_reddit_imagens}`
    return ''
}

async function adcionarSQLBDByFile(path_imagem){
    let reddit_post = {}
    let imagens = []
    let tags = []
    if(!(process.env.ACCEPT_FORMAT_FILES.includes( post.getExtension( path_imagem)))){
        fs.renameSync(path_imagem, path.resolve("js", ".database", "reddit_tempfiles", path_imagem.split(path.sep).pop()))
        return null
    }
    try {
        iqdb_best = await getIqdbResult(path_imagem)
    } catch (error) {
        return null
    }
    if( ! iqdb_best){
        return null
    }

    if(iqdb_best.statusCode === 403){
        return null
    }

    if(iqdb_best.statusCode === 404){
        try {
            fs.renameSync(path_imagem, path.resolve("js", ".database", "reddit_tempfiles", path_imagem.split(path.sep).pop()))    
        } catch (error) {}
        return null
    }

    if( post.possuiTagsInvalidas(iqdb_best)){
        try {
            fs.renameSync(path_imagem, path.resolve("js", ".database", "reddit_tempfiles", path_imagem.split(path.sep).pop()))    
        } catch (error) {}
        return null
    }

    url_original = post.getOriginalURLIfExist("jpg", iqdb_best)
    if(url_original == "jpg"){
        fs.renameSync(path_imagem, path.resolve("js", ".database", "reddit_tempfiles", path_imagem.split(path.sep).pop()))
        return null
    }

    fileBuffer = await post.getBufferImage(url_original)
    if( ! fileBuffer){
        let extensao_ = post.getExtension(url_original)
        url_original = post.replaceAll(url_original, "." + extensao_, (extensao_ === "png") ? ".jpg" : ".png") 
        fileBuffer = await post.getBufferImage(url_original)
    }

    if( ! fileBuffer){
        let extensao_ = post.getExtension(url_original)
        url_original = post.replaceAll(url_original, "." + extensao_, ".jpeg") 
        fileBuffer = await post.getBufferImage(url_original)
    }

    if( fileBuffer && iqdb_best){
        dimensions = getDimensionFromBuffer(fileBuffer)
        imagens.push({
            url: `'${ post.replaceAll(url_original, "'", "\\'")}'`,
            hashsum: post.getHashSumFromBuffer(fileBuffer),    
            height: dimensions.height,
            width: dimensions.width
        })

        if(iqdb_best.results ){
            result = iqdb_best.results[0]
            if( result.thumbnail && result.thumbnail.tags && result.thumbnail.tags.length > 0){
                for(const tag of result.thumbnail.tags){
                    tags.push(`'${ post.replaceAll(tag, "'", "\\'")}'`)
                }
            }
        }
        

    }
    return {
        imagens: imagens,
        tags: tags
    }
}

async function getIqdbResult(filepath){
    let retorno = null;
    await new Promise(function (resolve, reject) {
        request.get(`http://localhost:6969/iqdb?file=${filepath}`, {headers:{"cookie": process.env.REDDIT_COOKIE, "User-Agent": "PostmanRuntime/7.32.2"} }, function( error, response, body){
            let retorno = null
            try {
                retorno = JSON.parse(Buffer.from(body).toString());
            } catch (error) {
                
            }    
            if( response && response.statusCode != 200){
                retorno = { statusCode: response.statusCode}
            }
            resolve(retorno)    
        });
    }).then((data => {
        retorno = data
    }));
    return retorno
}

main()