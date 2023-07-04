const fs = require('fs');
const path = require("path");
const post = require('./js/download_posts_reddit');
const { func } = require('assert-plus');
const sizeOf = require('buffer-image-size');
const { mysqlInsertQuery, mysqlQuery } = require('./js/connection/mysql');
const FindFiles = require('file-regex')
const IQDB  = require("./js/iqdb");
const compressImages = require("compress-images")

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

async function processamento(caminho){
    for(const file of fs.readdirSync(caminho)){
        const file_path = path.resolve(caminho, file)
        if( fs.lstatSync(file_path).isDirectory()){
            await processamento(file_path)
        }else{
            try {
                await adcionarSQLBD(file_path);   
            } catch (error) {
                console.log(error);
            }
        }
    }
}

async function adcionarSQLBD(path_imagem){
    let name = path_imagem.split("\\").pop().split(".")[0]
    name = post.replaceAll(name, " ", "") + ".sql"
    
    path_log_iqdb = path.resolve("js", ".database", "log_iqdb")
    logs = await FindFiles(path_log_iqdb, name, 5);
    path_log_iqdb_imagem = ""
    nova_sql = null

    if(logs.length > 0){
        path_log_iqdb_imagem =path.resolve(logs[0].dir, logs[0].file)    
    }
    if( path_log_iqdb_imagem && fs.existsSync(path_log_iqdb_imagem)){
        sql = fs.readFileSync(path_log_iqdb_imagem).toString()
        data = quebrarSQL(sql, path_imagem)
    }else{
        data = await adcionarSQLBDByFile(path_imagem)
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
        console.log("Concluiiu o  database");
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

 async function main(){
    //post.removeFilesDuplicate()

    path_reddit = path.resolve("js", ".database", "reddit_files", "hentai")

    await processamento(path_reddit)
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
    return sizeOf(fs.readFileSync(file))
}

function getDimensionFromBuffer(buffer){
    return sizeOf(buffer)
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
        }
        sql_imagens = sql_imagens + `INSERT INTO imagem (\`url\`, \`hashsum\`, \`height\`, \`width\`) VALUES (${element.url}, '${element.hashsum}', ${element.height}, ${element.width});\n`
        if(data.reddit_post){
            sql_reddit_imagens = sql_reddit_imagens + `INSERT INTO reddit_imagem (\`idimagem\`, \`idreddit_post\`) SELECT (SELECT idimagem FROM imagem WHERE hashsum = ${element.hashsum} limit 1) as idimagem,  (SELECT idreddit_post FROM reddit_post WHERE post_id = ${reddit_post.post_id}) as idreddit_post;\n`
        }
    }

    /*** TAGS */
    sql_tags = ``
    sql_imagens_tags = ``
    data.tags.forEach(tag => {
        sql_tags = sql_tags + `INSERT INTO tag (\`descricao\`) SELECT ${tag} WHERE NOT EXISTS (SELECT idtag FROM tag WHERE descricao = ${tag});\n`
      
        data.imagens.forEach(element => {
            sql_imagens_tags = sql_imagens_tags + `INSERT INTO imagem_tag (\`idimagem\`, \`idtag\`) SELECT (SELECT idimagem FROM imagem WHERE url = ${element.url}) as idimagem,  (SELECT idtag FROM tag WHERE descricao = ${tag}) as idtag;\n`
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
        iqdb_best = await IQDB.search_best_match(fs.readFileSync(path_imagem))    
    } catch (error) {
        fs.renameSync(path_imagem, path.resolve("js", ".database", "reddit_tempfiles", path_imagem.split(path.sep).pop()))
        return null
    }
    
    if( ! iqdb_best || post.possuiTagsInvalidas(iqdb_best)){
        fs.renameSync(path_imagem, path.resolve("js", ".database", "reddit_tempfiles", path_imagem.split(path.sep).pop()))
        return null
    }

    url_original = post.getOriginalURLIfExist("jpg", iqdb_best)
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

    if( fileBuffer){
        //fs.writeFileSync(path_imagem, fileBuffer)

        dimensions = getDimensionFromBuffer(fileBuffer)

        imagens.push({
            url: `'${ post.replaceAll(url_original, "'", "\\'")}'`,
            hashsum: post.getHashSumFromBuffer(fileBuffer),    
            height: dimensions.height,
            width: dimensions.width
        })

        result = iqdb_best.results[0]
        if( result.thumbnail && result.thumbnail.tags && result.thumbnail.tags.length > 0){
            for(const tag of result.thumbnail.tags){
                tags.push(`'${ post.replaceAll(tag, "'", "\\'")}'`)
            }
        }

    }
    return {
        imagens: imagens,
        tags: tags
    }
}
main()