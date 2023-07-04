const fs = require('fs');
const crypto = require("crypto");
const path = require("path");
const request = require('request').defaults({ encoding: null });
const IQDB  = require("./iqdb");
const { mysqlQuery, mysqlInsertQuery } = require('./connection/mysql');
require('dotenv/config');
const cliProgress = require('cli-progress');
const sizeOf = require('buffer-image-size');

function createCliProgressContainer(){
    // create new container
    return new cliProgress.MultiBar({
        clearOnComplete: false,
        hideCursor: true,
        format: ' {bar} | {filename} | {value}/{total}',
    }, cliProgress.Presets.shades_grey);
}

let FILA_DOWNLOAD = [];
let FILA_URL_DOWNLOAD = {}

function readFileParseJson ( filePath ){
    try {
        let rawdata = fs.readFileSync(filePath);
        return JSON.parse(rawdata);
    } catch (error) { 
        if( process.env.DEBUG_ERROR === "true"){
            console.error("readFileParseJson", error);
        }
    }
    return null;
}

function writeFileFromJson ( filePath , json ) {
    try {
        return fs.writeFileSync(filePath, JSON.stringify(json));
    } catch (error) { 
        if( process.env.DEBUG_ERROR === "true"){
            console.error("writeFileFromJson", error);
        }
    }
}

function validateURL(url){
    if(url)
        return url.split("&amp;").join("&")
    
    return null
}
function cloneObject(object, append){
    let clone = Object.assign({}, object)
    if(append){
        clone = Object.assign(clone, append)
    }
    return clone
}

function extractedURLFromRedditData(data){
    
    const post_obj = {
        url : null,
        subreddit: data.subreddit,
        created: data.created,
        name: data.name,
        subreddit_id: data.subreddit_id,
        post_id: data.id
    }

    try {
        let urls = [];
        if( data.preview ){
            if(data.crosspost_parent_list && data.crosspost_parent_list.length > 0){
                data.crosspost_parent_list.forEach( (item) =>{
                    let temp_url = extractedURLFromRedditData(item)
                    if( temp_url instanceof Array){
                        temp_url.forEach( result => {
                            urls.push(result)
                        })
                    }else{
                        urls.push( cloneObject(post_obj, temp_url))
                    }
                })
                return urls;
            }
        }
        if(data.media && data.media.reddit_video){
            return cloneObject(post_obj, {url: data.media.reddit_video.fallback_url});
        }

        if(data.media && data.media.type === "redgifs.com"){
            return cloneObject(post_obj, {url: data.media.oembed.thumbnail_url.replace("-mobile.jpg", ".mp4")});
        }
        
        let url = new URL( data.url);
        if( getExtension(url.pathname) === 'gifv'){
            return cloneObject(post_obj, {url: data.url.replace(".gifv", ".mp4")});
        }
        
        if( getExtension(url.pathname) === 'gif'){
            return cloneObject(post_obj, {url: data.url});
        }
        
        if( data.media_metadata){
            Object.values(data.media_metadata).forEach( (item, index) =>{
                urls.push(cloneObject(post_obj, {url: "https://i.redd.it/" + item.id + getTypeExtensionFile( { mimeType: item.m}), name: data.name + " " + index}))
            })
            return urls;
        }

        if( data.preview ){
            
            if(data.preview.reddit_video_preview){
                return cloneObject(post_obj, {url: data.preview.reddit_video_preview.fallback_url});
            }
            
            if(data.preview.images.length > 0){
                data.preview.images.forEach( (item, index) =>{
                    urls.push(cloneObject(post_obj, {url: item.source.url, name: data.name + " " + index, url_iqdb:item.resolutions[0].url}))
                })
                return urls;
            }
        }
       
    } catch (error) {
        if( process.env.DEBUG_ERROR === "true"){
            console.error("extractedURLFromRedditData", error)
        }
    }
    return cloneObject(post_obj, {url: data.url})
}

function getTypeExtensionFile(data){
    
    if(data.mimeType == "video/mp4"){
       return ".mp4"
    }

    if(data.mimeType == "image/jpeg"){
        return ".jpg"
    }
    
    if(data.mimeType == "image/jpg"){
        return ".jpg"
    }

    if(data.mimeType == "image/gif"){
        return ".gif"
    }

    if(data.mimeType == "image/png"){
        return ".png"
    }
    throw new Error("Erro tipo nãp suportado" + " Type " + data.mimeType + ' URL ' + data.subreddit + "\\" + data.fullurl)
}

// you can send full url here
function getExtension(filename) {
    if( ! filename)
        return null
    let extensao = filename.split('.').pop().split("?").shift()
    return  extensao ? extensao : "jpg";
}

function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}

function replaceAll(str, find, replace) {
    return str.replace(new RegExp(escapeRegExp(find), 'g'), replace);
}

function getDimensionFromFile(file){
    return sizeOf(fs.readFileSync(file))
}

function getDimensionFromBuffer(buffer){
    return sizeOf(buffer)
}

function removeInvalidCharacteresPath( stringToReplace ){
    if( ! stringToReplace) return "Sem Nome";
        
    var specialChars = "!@#$^&%*()+=-[]\/{}|:<>?,.";

    for (var i = 0; i < specialChars.length; i++) {
        stringToReplace = stringToReplace.replace(new RegExp("\\" + specialChars[i], "gi"), "");
    }

    return replaceAll(stringToReplace, "\"", "");
}

async function addLogIQDBSearch(iqdb_best, download, url, filebuffer){
    let reddit_post = download.post.data
    let hashsum = getHashSumFromBuffer(filebuffer)
    let dimension = getDimensionFromBuffer(filebuffer)
    result = await mysqlQuery(`SELECT * FROM imagem WHERE hashsum = '${hashsum}'`)
    if(result.length > 0){
        console.log("Achou essa imagem", hashsum, url);
        return null
    }
    reddit_post.post_id = reddit_post.id
    result = await mysqlQuery(`select post_id from reddit_post where post_id = '${reddit_post.post_id}'`)
    if(result.length == 0){
        sql_post = `INSERT INTO reddit_post (\`subreddit\`, \`post_url\`, \`created\`, \`name\`, \`subreddit_id\`, \`post_id\`) VALUES ('${reddit_post.subreddit}', '${reddit_post.url}', FROM_UNIXTIME('${reddit_post.created}'), '${reddit_post.name}', '${reddit_post.subreddit_id}', '${reddit_post.post_id}');\n`
        await mysqlInsertQuery(sql_post)
    }

    sql_imagens = `INSERT INTO imagem (\`url\`, \`hashsum\`, \`height\`, \`width\`) VALUES ('${replaceAll(url, "'", "\\'")}', '${hashsum}', '${dimension.height}', '${dimension.width}');\n`
    await mysqlInsertQuery(sql_imagens)
    sql_reddit_imagens = `INSERT INTO reddit_imagem (\`idimagem\`, \`idreddit_post\`) SELECT (SELECT idimagem FROM imagem WHERE hashsum = '${hashsum}' limit 1) as idimagem,  (SELECT idreddit_post FROM reddit_post WHERE post_id = '${reddit_post.post_id}') as idreddit_post;\n`
    await mysqlInsertQuery(sql_reddit_imagens)
    
    result = iqdb_best.results[0]
    if( result.thumbnail && result.thumbnail.tags && result.thumbnail.tags.length > 0){
        for(const tag of result.thumbnail.tags){
            sql_tags = `INSERT INTO tag (\`descricao\`) SELECT '${replaceAll(tag, "'", "\\'")}' WHERE NOT EXISTS (SELECT idtag FROM tag WHERE descricao = '${replaceAll(tag, "'", "\\'")}');\n`
            await mysqlInsertQuery(sql_tags)

            sql_imagens_tags = `INSERT INTO imagem_tag (\`idimagem\`, \`idtag\`) SELECT (SELECT idimagem FROM imagem WHERE hashsum = '${hashsum}' limit 1) as idimagem,  (SELECT idtag FROM tag WHERE descricao = '${replaceAll(tag, "'", "\\'")}') as idtag;\n`
            await mysqlInsertQuery(sql_imagens_tags)
        }
    }
    return true
}

function generateFieldsInsert(array){
    return array.map((item)=>{return (! item )? item: ("`" +  item+ "`" ) }).join(", ")
}
function generateValuesInsert(array){
    return array.map((item)=>{return (! item || ! (  typeof item === 'string' ) || item.startsWith("(select") || item.startsWith("FROM_UNIXTIME("))? item: ("'" +  item.toString().split("'").join("\\'")+ "'" ) }).join(", ")
}

function generateSqlFromObject(json_completo){
    let sqls = []

    if( typeof json_completo !== 'object'){
        return sqls
    }
    
    Object.keys(json_completo).map( atributo =>{
        if( Array.isArray(json_completo[atributo])){
            json_completo[atributo].forEach(element => {
                if( ! Array.isArray(element)){
                    sqls = sqls.concat(generateSqlFromObject({ [atributo] : element}))   
                }
            });
        }
        else if( typeof json_completo[atributo] === 'object'){
            const values = Object.values(json_completo[atributo])
            const keys   = Object.keys(json_completo[atributo])
            let sql_insert = keys.filter((key, index) =>{ return  ! ( values[index] instanceof Array || values[index] instanceof Object)})
            let sql_values = values.filter((key, index) =>{ return  ! ( values[index] instanceof Array || values[index] instanceof Object)})
            
            if(sql_insert.length){
                if( atributo === "iqdb_tag"){
                    sqls.push(`INSERT INTO ${atributo} (${generateFieldsInsert(sql_insert)}) SELECT ${generateValuesInsert(sql_values)} where not exists (select idtag from iqdb_tag where tag = '${replaceAll(json_completo[atributo].tag, "'", "\'")}' );`)
                }
                else if( atributo === "post_reddit"){ 
                    sqls.push(`INSERT INTO ${atributo} (${generateFieldsInsert(sql_insert)}) SELECT ${generateValuesInsert(sql_values)} where not exists (select idreddit from post_reddit where name = '${json_completo[atributo].name}' and subreddit = '${json_completo[atributo].subreddit}' );`)
                }else{
                    sqls.push(`INSERT INTO ${atributo} (${generateFieldsInsert(sql_insert)}) VALUES (${generateValuesInsert(sql_values)});`)
                }
            }

            keys.filter((key, index) =>{ return ( values[index] instanceof Array)}).forEach(item=>{
                json_item = json_completo[atributo][item]
                if( Array.isArray(json_item)){
                    json_item.forEach(element => {
                        if( ! Array.isArray(element)){
                            sqls = sqls.concat(generateSqlFromObject({ [item] : element}))
                        }
                    });
                }
            })
            keys.filter((key, index) =>{ return  ( values[index] instanceof Object)}).forEach(item=>{
                json_item = json_completo[atributo][item]
                if( ! Array.isArray(json_item)){
                    sqls = sqls.concat(generateSqlFromObject({ [item] : json_item}))
                }
            })
        }
    })
    return sqls
}

function existInDirectoryIQDB(url, data, name){
    let directory = getPATH_DOWNLOAD_FILES() + path.sep + "iqdb"
    if( ! fs.existsSync(directory)) fs.mkdirSync( directory);

    if( data.crosspost_parent_list && data.crosspost_parent_list.length > 0)
        directory += path.sep + data.crosspost_parent_list[0].subreddit;
    else
        directory += path.sep + data.subreddit
    
    var pathFile = directory + path.sep + removeInvalidCharacteresPath( name || data.name) + "." + getExtension(url);
    return fs.existsSync(pathFile)
}

function getURLSearchIQDB(url, data){
    let name = url.split("/").pop().split(".").shift()
    if(data.media_metadata && data.media_metadata[name]){
        return data.media_metadata[name].p[0].u
    }
    return url
}

function getOriginalURLIfExist(url, iqdb){
    
    let extensao = getExtension(url)
    
    if( iqdb.results ){
        let result = iqdb.results[0]
        let service = result.sources[0].service
        if( service == "Danbooru"){
            let hash = result.thumbnail.src.split("/").pop().split(".")[0]
            let hash_1= hash.substring(0, 2)
            let hash_2= hash.substring(2, 4)
            return `https://cdn.donmai.us/original/${hash_1}/${hash_2}/${hash}.${extensao}`
        }
        if( service == "Yande.re"){
            let hash = result.thumbnail.src.split("/").pop().split(".")[0]
            let id= result.sources[0].href.split("/").pop()
            let tags = result.thumbnail.tags.join(" ")
            return `https://files.yande.re/image/${hash}/yande.re ${id} ${tags}.${extensao}`
        }

        if( service == "Konachan"){
            let id= result.sources[0].href.split("/").pop()
            let hash = result.thumbnail.src.split("/").pop().split(".")[0]
            return `https://konachan.com/sample/${hash}/Konachan.com - ${id} sample.${extensao}`
        }
        if( service == "Gelbooru"){
            let hash = result.thumbnail.src.split("/").pop().split(".")[0]
            let hash_1= hash.substring(0, 2)
            let hash_2= hash.substring(2, 4)
            return `https://img3.gelbooru.com//images/${hash_1}/${hash_2}/${hash}.${extensao}`
        }
        if( service == "Anime-Pictures"){
            let hash = result.thumbnail.src.split("/").pop().split(".")[0]
            let hash_1= hash.substring(0, 3)
            return `https://images.anime-pictures.net/${hash_1}/${hash}.${extensao}`
        }
    }
    return url
}
function possuiTagsInvalidas( iqdb){
    const TAGS_INVALIDAS = ['penis', 'sex', 'paizuri', 'multiple_penises', 'multiple_boys', 
    'male_masturbation', 'futanari', 'futa with futa', 'futa_with_male', 'video', 'otoko_no_ko', 
    'furry', 'femdom', 'bestiality', 'trap', 'animated_gif', 'animated']
    const TAGS_INVALIDAS_OBJ = TAGS_INVALIDAS.reduce(function(result, item, index) {
        result[item] = item
        return result
      }, {})
    let achou = false;
    if( iqdb.results ){
        let result = iqdb.results[0]
        if( result.thumbnail && result.thumbnail.tags){
            result.thumbnail.tags.every(element =>{
                if(element in TAGS_INVALIDAS_OBJ){
                    achou = true
                    return false
                }
                return true
            })
        }
    }
    return achou
}
async function requestDowloadFileFromURL(download, obj_progress){
    let image_progress = null
    if( process.env.ENABLE_BAR_PROGRESS === "true"){
        if( obj_progress.image_progress )
            obj_progress.multibar.remove(obj_progress.image_progress)
        
        image_progress = obj_progress.multibar.create(5, 0);
        obj_progress.image_progress = image_progress
    }
    
    let url = download.download
    let name = download.name
    let data = download.post.data
    let url_iqdb = download.url_iqdb
    let url_original = url
    let iqdb_best = null

    if( ! url) return null
    if( process.env.ACCEPT_FORMAT_FILES && !(process.env.ACCEPT_FORMAT_FILES.includes( getExtension( url) )))
        return null
    
    try {
        try {
            if( process.env.ENABLE_BAR_PROGRESS === "true")
                image_progress.increment({filename: name + " Iniciando busca IQDB"})

            iqdb_best = await IQDB.search_best_match(url_iqdb)
            if( ! iqdb_best)
                return null // Não vai baixar se nao tiver IQDB
            
            if( possuiTagsInvalidas(iqdb_best))
                return null

            if(process.env.ENABLE_DOWNLOAD_URL_ORIGINAL === "true"){
                url_original = getOriginalURLIfExist(url, iqdb_best)   
            }
            
            if(LISTA_DOWNLOADED[url_original]){ //Se a  url ja foi usada entao nao salva o arquivo
                return null
            }
        } catch (error) {
            return null
        }
        /*
        if( process.env.ENABLE_BAR_PROGRESS === "true")
            image_progress.increment({filename: name + " Conclusão da busca IQDB e Salvamento do Log"})
        
        let directory = getPATH_DOWNLOAD_FILES() + path.sep + (new Date(data.created * 1000).toLocaleDateString("pt-BR").split("/").join("-"))
        if( ! fs.existsSync(directory)) fs.mkdirSync( directory);

        directory += path.sep + download.subreddit
        if( ! fs.existsSync(directory)) fs.mkdirSync( directory);

        var pathFile = directory + path.sep + removeInvalidCharacteresPath( name || data.name) + "." + getExtension(url);
        if( fs.existsSync(pathFile) ) return null; // Se existe não baixa de novo
        */
    } catch (error) {
        if( process.env.DEBUG_ERROR === "true"){
            console.error("requestDowloadFileFromURL", url, error);
        }
    }

    let fileBuffer = null
    let url_final = ''
    if( process.env.ENABLE_BAR_PROGRESS === "true")
        image_progress.increment({filename: name + " Iniciando download do arquivo"})

    if( url != url_original){
        url_final = url_original
        fileBuffer = await getBufferImage(url_original)
        if( ! fileBuffer){
            let extensao_ = getExtension(url_original)
            url_original = replaceAll(url_original, "." + extensao_, (extensao_ === "png") ? ".jpg" : ".png") 
            url_final = url_original
            fileBuffer = await getBufferImage(url_original)
        }

        if( ! fileBuffer){
            let extensao_ = getExtension(url_original)
            url_original = replaceAll(url_original, "." + extensao_, ".jpeg") 
            url_final = url_original
            fileBuffer = await getBufferImage(url_original)
        }
    }
    if( ! fileBuffer){
        url_final = url
        fileBuffer = await getBufferImage(url)
    }

    if( fileBuffer ){
        if( process.env.ENABLE_BAR_PROGRESS === "true"){
            if( ! obj_progress.arquivos_salvos)
                obj_progress.arquivos_salvos = 0
            obj_progress.arquivos_salvos ++
        }
        

        return new Promise(function (resolve, reject) {
            addLogIQDBSearch(iqdb_best, download, url_final, fileBuffer).finally((result) => {
                resolve(data)
            })

            /*try {
                if( ! fs.existsSync(pathFile)) fs.writeFileSync(pathFile, fileBuffer)
                if( process.env.ENABLE_BAR_PROGRESS === "true")
                    image_progress.increment({filename: name + " Download concluído"})
                resolve(data);
            } catch (error) {
                reject(data)
                console.error(error.message)
            }
            if( process.env.ENABLE_BAR_PROGRESS === "true")
                image_progress.increment({filename: name + " Finalização do download"})
                */
        });
    }
}

let LISTA_DOWNLOADED = {}
async function getBufferImage(url){
    if( LISTA_DOWNLOADED[url])
        return null
    
    LISTA_DOWNLOADED[url] = url
    let retorno = null;
    await new Promise(function (resolve, reject) {
        request.get(url, {headers:{"cookie": process.env.REDDIT_COOKIE, "User-Agent": "PostmanRuntime/7.32.2"} }, function( error, response, body){
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

async function dowloadFileFromDataURL( data){
    return new Promise(function (resolve, reject) {
        requestDowloadFileFromURL( data).finally(()=>{
            resolve()
        })
    });
}


async function getInfoRedditByName( reddit ){
    try {
        let directory = __dirname + path.sep + ".database";
        if( ! fs.existsSync(directory)) fs.mkdirSync(directory);
        
        directory += path.sep + "reddit";
        if( ! fs.existsSync(directory)) fs.mkdirSync(directory);

        var pathFile = directory + path.sep + reddit + ".json";
        var pathFileUser = directory + path.sep + "u_" + reddit + ".json";

        if( fs.existsSync(pathFile)){
            return readFileParseJson(pathFile);    
        }
        
        if( fs.existsSync(pathFileUser)){
            return readFileParseJson(pathFileUser);    
        }
        await createNewDatabaseReddit(reddit);
        return getInfoRedditByName(reddit);
    } catch (error) {
        if( process.env.DEBUG_ERROR === "true"){
            console.log("getInfoRedditByName", error);
        }
    }
    
    return null;
}

function addFilaDownload(children){
    let url = extractedURLFromRedditData(children.data)
    if( url){
        if( ! (url instanceof Array)){
            url = [url]
        }
        url.forEach( ( item ) =>{
            let download = validateURL(item.url)
            if( ! FILA_URL_DOWNLOAD[download]){
                FILA_URL_DOWNLOAD[download] = download
                if( process.env.ACCEPT_FORMAT_FILES && (process.env.ACCEPT_FORMAT_FILES.includes( getExtension( download ) ))){
                    FILA_DOWNLOAD.push(cloneObject(item, {
                        "url": download,
                        "download": download,
                        "post"  : children,
                        "url_iqdb": validateURL(getURLSearchIQDB( item.url_iqdb || download, children.data))
                    }))  
                }
            }
        })
    }
}

async function processarFilaDownload(config, resolve, reject, obj_progress){
    if(FILA_DOWNLOAD.length == 0){
        if( process.env.ENABLE_BAR_PROGRESS === "true"){
            if( obj_progress.image_progress )
                obj_progress.multibar.remove(obj_progress.image_progress)
                
            obj_progress.multibar.stop()

            if(obj_progress.arquivos_salvos)
                console.log("Foram baixados: ", obj_progress.arquivos_salvos, " arquivos!");
        }
        
        resolve()
    }
    if( FILA_DOWNLOAD.length){
        let element = FILA_DOWNLOAD.shift()
        
        if( process.env.ENABLE_BAR_PROGRESS === "true"){
            if(obj_progress.fila_download_progress)
                obj_progress.fila_download_progress.increment({filename: element.post.data.name});
        }
        
        
            requestDowloadFileFromURL( element , obj_progress).finally(()=>{
            if( ! config.url_params){
                config.url_params = {};
            }
            config.url_params.before = element.post.data.name;
            saveInfoReddit( config.subreddit, config)    
            processarFilaDownload(config, resolve, reject, obj_progress)
        })
    }
}

async function setContentThenGoogleDrive( config, data){
    
    if( data.data && data.data.children ){
        data.data.children.reverse().forEach(children => {
            addFilaDownload(children)
        })
    }
    if( FILA_DOWNLOAD.length > 0){
        let multibar = {}
        let fila_download_progress = {}
        if( process.env.ENABLE_BAR_PROGRESS === "true"){
            multibar = createCliProgressContainer()
            fila_download_progress = multibar.create(FILA_DOWNLOAD.length, 0);
        }
                
        return new Promise(function (resolve, reject) {
            console.log("Será feito o download de ", FILA_DOWNLOAD.length , " arquivos!!");
            processarFilaDownload(config, resolve, reject, { multibar: multibar, fila_download_progress: fila_download_progress})
        })
    }
    
}

function saveInfoReddit( reddit, value){
    var pathFile = __dirname + path.sep + ".database" + path.sep + "reddit" + path.sep + reddit + ".json";
    return writeFileFromJson(pathFile, value);
}

function saveLogReturnRequest( name, value ){    
    try {
        let directory = __dirname + path.sep + ".database";    
        if( ! fs.existsSync(directory)) fs.mkdirSync(directory);
        
        directory += path.sep + "logs";
        if( ! fs.existsSync(directory)) fs.mkdirSync(directory);

        directory += path.sep + name;
        if( ! fs.existsSync(directory)) fs.mkdirSync(directory);
        
    
        var pathFile = directory + path.sep + removeInvalidCharacteresPath( new Date().toLocaleString().toString()) + "_" + name + ".json";
        writeFileFromJson(pathFile, value);
        return pathFile;
    } catch (error) {
        if( process.env.DEBUG_ERROR === "true"){
            console.log("saveLogReturnRequest", error);
        }
    }
}

function generateUrlIfReddit( config, contador_file, contador){
    let config_if = config;
    if( config_if ){
    
        if( ! config_if.url_params ){ // Configurando os Paramentros padroes da URL
            config_if.url_params = { "limit" : "100", "before" : "" }
        }

        let generateUrl = new URL( config_if.url);
        Object.entries(config_if.url_params).forEach(([key, value]) => {
            generateUrl.searchParams.set(key, value);
        });

        return { href: generateUrl.href, contador_file: contador_file || 0, contador: contador || 0};
    }

    return null;
}
const getSortedFiles = async (dir) => {
    const files = await fs.promises.readdir(dir);
    return files
      .map(fileName => ({
        name: fileName,
        time: fs.statSync(`${dir}/${fileName}`).mtime.getTime(),
      }))
      .sort((a, b) => a.time - b.time)
      .map(file => file.name);
};

async function generateNextUrlIfReddit( config , old_url){
    let config_if = config;
    if( config_if ){
        const reddit = config_if.subreddit;
        let dir = __dirname + path.sep + ".database";    
        if( ! fs.existsSync(dir)) fs.mkdirSync(dir);
        
        dir += path.sep + "logs";
        if( ! fs.existsSync(dir)) fs.mkdirSync(dir);

        dir += path.sep + reddit;
        if( ! fs.existsSync(dir)) fs.mkdirSync(dir);
        
        let files = null;
        await getSortedFiles( dir ).then( (lista )  =>{
            files = lista.reverse();
        });

        if( files ){
            let arquivo  = files[old_url.contador_file];
            if( arquivo ){
                const json = readFileParseJson(dir + path.sep + arquivo);
                const children = json.data.children[old_url.contador];
                if( children){
                    config_if.url_params.before = children.data.name;
                    old_url.contador ++;
                }else {
                    old_url.contador = 0;
                    old_url.contador_file ++;
                }
                return await generateUrlIfReddit( config, old_url.contador_file, old_url.contador);
            }
        }
    }
    return null;
}

async function requestURLReddit( url, config, callback, last_url){
    if( ! url || ! url.href){
        console.log("Não foi possível criar a URL de pesquisa!")
        return false;//throw new Error("Não foi possível criar a URL de pesquisa!")
    }

    if( last_url && last_url.href === url.href){
        return generateNextUrlIfReddit(config, url).then( (next_url) => {
            requestURLReddit( next_url, config, callback, url);
        });
    }

    request.get(url.href, {headers:{"cookie": process.env.REDDIT_COOKIE, "User-Agent": process.env.REDDIT_USER_AGENT} }, ( error, response, body)=>{
        if (!error && response.statusCode == 200) {
            data = JSON.parse(Buffer.from(body).toString('utf8'));
            if( data.data.children && data.data.children.length > 0){
                saveLogReturnRequest(config.subreddit, data);
                callback( config, data);
            }else{
                generateNextUrlIfReddit(config, url).then( (next_url) => {
                    requestURLReddit( next_url, config, callback, url);
                });
            }
        }else{
            try {
                data = Buffer.from(body).toString('utf8');
                console.log(data);    
            } catch (error) { }
            
            console.log(error,  " error ",response.statusCode, " response.statusCode");
            callback(config, {})
        }
    });
}

async function getContentIfReddit( config, callback ){
    try {
      return requestURLReddit( generateUrlIfReddit(config), config, callback);    
    } catch (error) {
        console.log(error, "error getContentIfReddit");
    }
}

async function downloadFilesByReturnRequest( config, data){
    if( data.data && data.data.children ){
        data.data.children.reverse().forEach( (element, i)=>{
            if( element.data ){
                if( ! config.url_params){
                    config.url_params = {};
                }
                config.url_params.before = element.data.name;
                dowloadFileFromDataURL(element.data);
            }
        })    
    }
    saveInfoReddit( config.subreddit, config);
}

async function createNewDatabaseReddit( reddit){
    let url = `https://www.reddit.com/r/${reddit}/new.json?limit=1`;
    return new Promise(function (resolve, reject) {
        console.log(url, " url");
        request.get(url, {headers:{"cookie": process.env.REDDIT_COOKIE} }, function( error, response, body){
            console.log(error, response.statusCode);
                if (!error && response.statusCode == 200) {
                    try {
                        data = JSON.parse(Buffer.from(body).toString('utf8'));
                        if( data.data.children.length == 0){
                           url = `https://www.reddit.com/u/${reddit}/new.json?limit=1`;
                            request.get(url, {headers:{"cookie": process.env.REDDIT_COOKIE} }, function( error, response, body){
                                if (!error && response.statusCode == 200) {
                                    try {
                                        data = JSON.parse(Buffer.from(body).toString('utf8'));
                                        if( data.data.children.length > 0){
                                            resolve(data);
                                        }else{
                                            reject(data)
                                        }
                                    } catch (error) {
                                        reject(data)
                                        console.error(error.message)
                                    }
                                }
                            });
                        }else{
                            resolve(data);
                        }
                    } catch (error) {
                        reject(data)
                        console.error(error.message)
                    }
                }
        });
    }).then( data=>{
        console.log(data, " data");
        const first_data = data.data.children.shift();
        saveInfoReddit( first_data.data.subreddit, { "subreddit" : first_data.data.subreddit, url: url.split("?").shift(), "url_params": { "limit" : 100} })
    });
}

function getAppletJsonDefault( reddit ){
    return {
        "subreddit" : reddit,
        "url": `https://reddit.com/r/${reddit}/new.json`,
        "url_params": { "limit" : 100}
    }
}

async function buscarPostsReddit( subreddit ){
    try {
        return new Promise( (resolve, reject) => {
            getInfoRedditByName(subreddit).then( (config ) =>{
                if( config ){
                    getContentIfReddit(config, (config2, json) =>{
                        setContentThenGoogleDrive(config, json).then( ()=>{
                            resolve( config);
                        });
                    })
                }else{
                    reject()
                }
            })
        });
    } catch (error) {
        if( process.env.DEBUG_ERROR === "true"){
            console.log("buscarPostsReddit", error);
        }
    }
    return null;
}

async function uploadGoogleDriveByJson(json){
    try {
        let reddit = "";
        if( json.data.children){
            reddit = json.data.children[0].data.reddit;
        }

        let config = await getInfoRedditByName(reddit);

        if( config ){
            await downloadFilesByReturnRequest(config, json);        
        }
    } catch (error) {
        if( process.env.DEBUG_ERROR === "true"){
            console.log("uploadGoogleDriveByJson", error);
        }
    }
}

/** 
 * Retorna o nome do arquivo
*/
function getNameFile( path_file){
    return path_file.split(path.sep).pop();
}

/** 
 * Gera o HashSum apartir de um arquivo.
*/
function getHashSumFromFile( path ){
    const fileBuffer = fs.readFileSync(path);
    const hashSum = crypto.createHash('sha256');
    hashSum.update(fileBuffer);

    return hashSum.digest('hex');
}
/** 
 * Gera o HashSum apartir de um arquivo.
*/
function getHashSumFromBuffer( fileBuffer ){
    const hashSum = crypto.createHash('sha256');
    hashSum.update(fileBuffer);

    return hashSum.digest('hex');
}

/** 
 * Busca o parametro PATH_COPY_FILES, e caso a pasta não exista, entao é criada.
*/
function getPATH_COPY_FILES(){
    const directory = __dirname + path.sep + ".database" + path.sep + process.env.PATH_COPY_FILES;
    try { if( ! fs.existsSync(directory)) fs.mkdirSync(directory)} catch (error) { }
    return directory;
}

/** 
 * Busca o parametro PATH_DOWNLOAD_FILES, e caso a pasta não exista, entao é criada.
*/
function getPATH_DOWNLOAD_FILES(){
    const directory = __dirname + path.sep + ".database" + path.sep + process.env.PATH_DOWNLOAD_FILES;
    try { if( ! fs.existsSync(directory)) fs.mkdirSync(directory)} catch (error) { }
    return directory;
}

/** 
 * Verifica se o HashSum do arquivo já existe.
 * Caso nao exista, adiciona o HashSum na lista de arquivos analisados.
 * Caso exista entao buscará o parametro REMOVE_OR_COPY_DUPLICATE_ITENS
 *  Caso o valor do parametro REMOVE_OR_COPY_DUPLICATE_ITENS seja === "REMOVE", o arquivo será excluido fisicamente.
 *  Caso o valor do parametro REMOVE_OR_COPY_DUPLICATE_ITENS seja === "COPY", o arquivo será movido fisicamente para uma pasta temporaria, seguindo o parametro PATH_COPY_FILES.
 * 
*/
function verifyAndRemoveDuplicateHashSum( path_file, posts){
    const hex = getHashSumFromFile( path_file );
    if( ! posts[hex]){
        posts[hex] = path_file
    }else{
        try {
            if( process.env.REMOVE_OR_COPY_DUPLICATE_ITENS === "REMOVE"){
                fs.unlinkSync(path_file)
            }else if( process.env.REMOVE_OR_COPY_DUPLICATE_ITENS === "COPY"){
                fs.renameSync(path_file, getPATH_COPY_FILES() + path.sep + getNameFile( path_file))
            }
        } catch (error) {
            if( process.env.DEBUG_ERROR === "true"){
                console.log("verifyAndRemoveDuplicateHashSum", error);
            }
        }
    }
}

/** 
 * Lê o conteudo de uma pasta,
 *  Se conter outra pasta, é realizado uma recursividade.
 *  Caso seja arquivo, entao é feito a verificaçao do HashSum
*/
function listFilesRemoveFilesDuplicate( path_folder, posts ){
    files = fs.readdirSync(path_folder);
    files.forEach( (file) =>{
        const path_file = path_folder + path.sep + file;

        if( fs.statSync( path_file ).isDirectory()){
            listFilesRemoveFilesDuplicate(path_file, posts);
        }else{
            verifyAndRemoveDuplicateHashSum(path_file, posts);
        }
    })
}

/** 
 * Inicia o processo de leitura das pastas de arquivos.
 * O primeiro caminho será o parametro PATH_DOWNLOAD_FILES
*/
function removeFilesDuplicate(){
    listFilesRemoveFilesDuplicate( getPATH_DOWNLOAD_FILES(), {});
    
    console.log("Terminou Remoção de Duplicados");
}

function buscarLocalDatabaseReddits( filtro ){
    let directory_files = path.resolve(__dirname, ".database", process.env.PATH_DOWNLOAD_FILES, "18-06-2023");

    let applets = [];
    let totais = { subreddits: 0, files: 0};
    let info = { espaco_usado: 0}
    try {
      let files = fs.readdirSync( directory_files);
      if( files ){
        if(filtro){
            files = files.filter( (value)=>{ return value.match( filtro )} );
        }
        totais.subreddits = files.length;
        files.forEach(element => {

            let subreddit = element;
            let files = 0;
            try {
                files = fs.readdirSync( directory_files + path.sep + subreddit).length;
            } catch (error) {
                files = 0
            }
            let url = ( `https://www.reddit.com/r/${element}/new`);
            if(element.startsWith('u_')){
                url = ( `https://www.reddit.com/u/${element.substring(2) }/`);
            }
            
            applets.push( {
                "subreddit" : subreddit.split(".json")[0],
                "path"      : element,
                "files"     : files,
                "url"       : url
            });

            totais.files += files;
        });
      }
    } catch (error) {
        console.log( error );
        applets = [];
    }
    
    applets = applets.sort( (a, b) => { if ( a.files < b.files ) return 1; if ( a.files > b.files ) return -1; return 0;});
    return {applets: applets, totais: totais, info: info};
}

function buscarTodosPostReddit(filtro){
    const lista = buscarLocalDatabaseReddits(filtro);
    lista.applets.forEach( item =>{
        buscarPostsReddit( item.subreddit );
    })
}

function chunkArray(arr, len) {

    var chunks = [],
        i = 0,
        n = arr.length;

    while (i < n) {
        chunks.push(arr.slice(i, i += len));
    }

    return chunks;
}

async function buscarTodasTagsIQDB(filtro){
    const sql = `select tag.idtag, tag.descricao as 'tag', count(tag.idtag) as 'total' from tag 
        left join imagem_tag on imagem_tag.idtag = tag.idtag
        group by tag.idtag
        order by count(tag.idtag) desc`

    sql_count = `SELECT count(*) as total from (${sql}) as result`

    const count = await mysqlQuery(sql_count) 
    const data = {
        tags: await mysqlQuery(sql + ' limit 0, 100'),
        total: (count.length ? count[0].total : 0)
    }
    /*let directory_files = path.resolve(__dirname, ".database", process.env.PATH_DOWNLOAD_FILES, "18-06-2023");

    let applets = [];
    let totais = { subreddits: 0, files: 0};
    let info = { espaco_usado: 0}
    try {
      let files = fs.readdirSync( directory_files);
      if( files ){
        if(filtro){
            files = files.filter( (value)=>{ return value.match( filtro )} );
        }
        totais.subreddits = files.length;
        files.forEach(element => {

            let subreddit = element;
            let files = 0;
            try {
                files = fs.readdirSync( directory_files + path.sep + subreddit).length;
            } catch (error) {
                files = 0
            }
            let url = ( `https://www.reddit.com/r/${element}/new`);
            if(element.startsWith('u_')){
                url = ( `https://www.reddit.com/u/${element.substring(2) }/`);
            }
            applets.push( {
                "subreddit" : subreddit.split(".json")[0],
                "name": element,
                "tag": element,
                "idtag": element,
                "total": files,
                "url" : url
            });

            totais.files += files;
        });
      }
    } catch (error) {
        console.log( error );
        applets = [];
    }

    const data = {
        tags: applets,
        total: (50)
    }*/
    
    return data
}

async function buscarTodasUrlsTagIQDB(tag){
    /*sql = `SELECT img_redd.url, post.name, post.subreddit, tag.tag from post_reddit as post
    left join image_reddit img_redd on post.idreddit = img_redd.idreddit
    left join image_iqdb img_iqdb on post.idreddit = img_iqdb.idreddit and img_iqdb.idimage_reddit = img_redd.idimage_reddit
    left join iqdb_result img_result on post.idreddit = img_result.idreddit and img_iqdb.idimage_iqdb = img_result.idimage_iqdb and img_result.idimage_reddit = img_redd.idimage_reddit
    left join iqdb_thumbnail img_thumb on post.idreddit = img_thumb.idreddit and img_iqdb.idimage_iqdb = img_thumb.idimage_iqdb and img_thumb.idimage_reddit = img_redd.idimage_reddit and img_thumb.idiqdb_result = img_result.idiqdb_result
    left join iqdb_result_tag img_result_tag on post.idreddit = img_result_tag.idreddit and img_iqdb.idimage_iqdb = img_result_tag.idimage_iqdb and img_result_tag.idimage_reddit = img_redd.idimage_reddit and img_result_tag.idiqdb_result = img_result.idiqdb_result and img_result_tag.idiqdb_thumbnail = img_thumb.idiqdb_thumbnail
    left join iqdb_tag tag on img_result_tag.idtag = tag.idtag
    where 
    img_result.match in ('best')
    and img_result.type in ('safe')
    and tag.tag = '${tag}'
    group by img_redd.url `
    
    sql_count = `SELECT count(*) as total from (${sql}) as result`
    const count = await mysqlQuery(sql_count) 
    const data = {
        urls: await mysqlQuery(sql + ' limit 0, 100'),
        total: (count.length ? count[0].total : 0)
    }*/
    sql = `select tag.idtag, tag.descricao as 'tag', REGEXP_REPLACE(imagem.url, ' ', '%20') as 'url', imagem.hashsum as 'name' from tag 
    left join imagem_tag on imagem_tag.idtag = tag.idtag
    left join imagem on imagem.idimagem = imagem_tag.idimagem
    where tag.descricao = '${tag}'
    group by imagem.hashsum
    order by imagem.idimagem desc`
    
    sql_count = `SELECT count(*) as total from (${sql}) as result`
    const count = await mysqlQuery(sql_count) 
    const data = {
        urls: await mysqlQuery(sql + ' limit 0, 10'),
        total: (count.length ? count[0].total : 0)
    }
   
    /*let directory_files = path.resolve(__dirname, ".database", process.env.PATH_DOWNLOAD_FILES, "18-06-2023");

    let applets = [];
    let totais = { subreddits: 0, files: 0};
    let info = { espaco_usado: 0}
    try {
      let files = fs.readdirSync( directory_files);
      if( files ){
        if(tag){
            files = files.filter( (value)=>{ return value.match( tag )} );
        }
        totais.subreddits = files.length;
        files.forEach(element => {

            let subreddit = element;
            let files = [];
            try {
                files = fs.readdirSync( directory_files + path.sep + subreddit);
            } catch (error) {
                files = []
            }
            files.forEach(image => {
                let pathiqdb = path.resolve(__dirname, ".database", "log_iqdb", "18-06-2023");
                let sql = path.resolve(pathiqdb, replaceAll(image.split(".")[0], " ", "") + ".sql");
                let rawdata = fs.readFileSync(sql).toString();
                
                let iqdb_service = rawdata.split("INSERT INTO iqdb_source (`service`, `href`, `fixed_href`, `idiqdb_result`, `idimage_iqdb`, `idimage_reddit`, `idreddit`) VALUES (")[1].split(", (select idiqdb_result from iqdb_result res inner join image_iqdb iqdb on res.idimage_iqdb = iqdb.id")[0]
                iqdb_service = iqdb_service.split(", ")

                //console.log(iqdb_service);
                let url_image = replaceAll(iqdb_service.pop(), "'", "")
                //console.log(url_image);
                
                let iqdb_thumbnail = rawdata.split("INSERT INTO iqdb_thumbnail (`src`, `fixed_src`, `rating`, `score`, `idiqdb_result`, `idimage_iqdb`, `idimage_reddit`, `idreddit`) VALUES (")[1].split("(select idiqdb_result from iqdb_result res inner join image_iqdb iqdb on res.idimage_iqdb = iqdb.idimage_iqdb where iqdb.url_iqdb =")[0]
                let src = iqdb_thumbnail.split(",")[1]
                src = replaceAll(src, "'", "")
                let iqdb = {
                    results: [
                        {
                            sources:[
                                {
                                    service: replaceAll(iqdb_service.shift(), "'", "")
                                }
                            ],
                            thumbnail: {
                                src: src
                            }
                        }
                    ]
                }
                console.log(JSON.stringify(iqdb));
                let url = src
                try {
                    url = getOriginalURLIfExist(src, iqdb);
                    console.log(url, src);    
                } catch (error) {
                    
                }
                
                applets.push( {
                    "subreddit" : subreddit.split(".json")[0],
                    "name": element,
                    "tag": element,
                    "url"       : url
                });
            });
            
            totais.files += files;
        });
      }
    } catch (error) {
        console.log( error );
        applets = [];
    }

    const data = {
        urls: applets,
        total: (50)
    }*/
    
    return data
}
module.exports = {
    buscarPostsReddit,
    buscarLocalDatabaseReddits,
    uploadGoogleDriveByJson,
    removeFilesDuplicate,
    buscarTodosPostReddit,
    buscarTodasUrlsTagIQDB,
    buscarTodasTagsIQDB,
    getHashSumFromFile,
    replaceAll,
    getOriginalURLIfExist,
    getBufferImage,
    getExtension,
    getHashSumFromBuffer,
    possuiTagsInvalidas
}
