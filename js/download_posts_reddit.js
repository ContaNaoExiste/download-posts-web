const fs = require('fs');
const crypto = require("crypto");
const path = require("path");
const request = require('request').defaults({ encoding: null });
const IQDB  = require("./iqdb");
const { mysqlQuery, mysqlInsertQuery } = require('./connection/mysql');
require('dotenv/config');
const cliProgress = require('cli-progress');
const sizeOf = require('probe-image-size');

const { default: axios } = require("axios")

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
    pathname = filename 
    try {
        pathname = new URL(filename).pathname
    } catch (error) {
        
    }
    let extensao = pathname.split('.').pop().split("?").shift()
    return  extensao ? extensao : "jpg";
}

function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}

function replaceAll(str, find, replace) {
    try {
        return str.replace(new RegExp(escapeRegExp(find), 'g'), replace);   
    } catch (error) {
        console.log(str, find, replace, " str, find, replace");
        return str
    }
}

function getDimensionFromFile(file){
    return sizeOf.sync(fs.readFileSync(file))
}

function getDimensionFromBuffer(buffer){
    return sizeOf.sync(buffer)
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

    let hashsum = getHashSumFromBuffer(filebuffer)
    let idimagem = null

    console.log( "-------------------------");
    console.log("Pesquisando Imagem", url)
    result = await mysqlQuery(`SELECT * FROM imagem WHERE (hashsum = '${hashsum}' OR url = '${replaceAll(url, "'", "\\'")}' OR post='${iqdb_best.results[0].sources[0].fixedHref}') limit 1 `)
    
    if( result.length == 0){
        sql_imagens = `INSERT INTO imagem (\`url\`, \`hashsum\`) VALUES ('${replaceAll(url, "'", "\\'")}', '${hashsum}');\n`
        await mysqlInsertQuery(sql_imagens)
        result = await mysqlQuery(`SELECT * FROM imagem WHERE hashsum = '${hashsum}' AND remover = 0 limit 1 `)
    }
    
    if( result.length > 0 ){
        idimagem = result[0].idimagem
        if( ! await checkIfURLExist(result[0].url)){
            url = result[0].url
        }
    }
    console.log(idimagem, result[0].url, hashsum, url);
    if( idimagem)
        return updateLogIQDBSearch(iqdb_best, download, url, filebuffer, idimagem)
    else 
        return false
}

function verifyArraySomeAnother(array1, array2){
    return array1.some(element => {
        return array2.indexOf(element) !== -1
    })
}

async function updateLogIQDBSearch(iqdb_best, download, url, filebuffer, idimagem, video_url){

    let reddit_post = null
    if(download ) reddit_post = download.post.data

    let hashsum = getHashSumFromBuffer(filebuffer)
    let dimension = getDimensionFromBuffer(filebuffer)
    let best_result = iqdb_best.results[0]
    
    try {
        sql_imagens = `UPDATE imagem SET \`hashsum\` = '${hashsum}' WHERE idimagem = '${idimagem}'  AND remover = 0;\n`
        await mysqlInsertQuery(sql_imagens)    
    } catch (error) {}
    
    try {
        sql_imagens = `UPDATE imagem SET \`height\` = '${dimension.height}', \`width\` = '${dimension.width}', \`post\` = '${best_result.sources[0].fixedHref}' WHERE idimagem = '${idimagem}'  AND remover = 0;\n`
        await mysqlInsertQuery(sql_imagens)    
    } catch (error) {}
    
    try {
        sql_imagens = `UPDATE imagem SET \`url\` = '${replaceAll(url, "'", "\\'")}' WHERE idimagem = '${idimagem}'  AND remover = 0;\n`
        await mysqlInsertQuery(sql_imagens)
    } catch (error) {console.log(error);}

    if( video_url ) {
        try {
            sql_imagens = `UPDATE imagem SET \`video_url\` = '${replaceAll(video_url, "'", "\\'")}' WHERE idimagem = '${idimagem}'  AND remover = 0;\n`
            console.log(video_url, " video_url", sql_imagens);
            await mysqlInsertQuery(sql_imagens)
        } catch (error) {console.log(error);}
    }
    if( best_result.thumbnail && best_result.thumbnail.tags && best_result.thumbnail.tags.length > 0){
        try {
            sql_del_tags = `DELETE FROM imagem_tag WHERE idimagem = (SELECT idimagem FROM imagem WHERE idimagem = '${idimagem}' AND remover = 0 LIMIT 1) `
            await mysqlInsertQuery(sql_del_tags)
        } catch (error) {}
        
        for(const tag of best_result.thumbnail.tags){
            try {
                sql_tags = `INSERT INTO tag (\`descricao\`) SELECT '${replaceAll(tag, "'", "\\'")}' WHERE NOT EXISTS (SELECT idtag FROM tag WHERE descricao = '${replaceAll(tag, "'", "\\'")}');\n`
                await mysqlInsertQuery(sql_tags)        
            } catch (error) {}
            
            try {
                sql_imagens_tags = `INSERT INTO imagem_tag (\`idimagem\`, \`idtag\`) SELECT (SELECT idimagem FROM imagem WHERE idimagem = '${idimagem}' AND remover = 0 LIMIT 1) as idimagem,  (SELECT idtag FROM tag WHERE descricao = '${replaceAll(tag, "'", "\\'")}') as idtag;\n`
                await mysqlInsertQuery(sql_imagens_tags)    
            } catch (error) {}
        }
    }

    if( reddit_post ){
        reddit_post.post_id = reddit_post.id
        let community_icon = ''
        if(reddit_post.sr_detail){
            if(reddit_post.sr_detail.icon_img){
                community_icon = reddit_post.sr_detail.icon_img
            }else{
                community_icon = reddit_post.sr_detail.community_icon
            }
            if(community_icon)
                community_icon = replaceAll(community_icon, "amp;", '')
            else
                community_icon = ''
        }
        result = await mysqlQuery(`select post_id from reddit_post where post_id = '${reddit_post.post_id}'`)
        if(result.length == 0){
            try {
                sql_post = `INSERT INTO reddit_post (\`subreddit\`, \`post_url\`, \`created\`, \`name\`, \`subreddit_id\`, \`post_id\`, \`community_icon\`) VALUES ('${reddit_post.subreddit}', '${reddit_post.url}', FROM_UNIXTIME('${reddit_post.created}'), '${reddit_post.name}', '${reddit_post.subreddit_id}', '${reddit_post.post_id}', '${community_icon}');\n`
                await mysqlInsertQuery(sql_post)   
            } catch (error) {}
        }
    
        try {
            sql_reddit_imagens = `INSERT INTO reddit_imagem (\`idimagem\`, \`idreddit_post\`) SELECT (SELECT idimagem FROM imagem WHERE idimagem = '${idimagem}' AND remover = 0 limit 1) as idimagem,  (SELECT idreddit_post FROM reddit_post WHERE post_id = '${reddit_post.post_id}') as idreddit_post;\n`
            await mysqlInsertQuery(sql_reddit_imagens)
        } catch (error) {}

        try {
            if( community_icon){
            sql_reddit_imagens = `
                update reddit_post
                set reddit_post.community_icon = '${community_icon}'
                where reddit_post.subreddit  = '${reddit_post.subreddit}'
                and reddit_post.community_icon = ''
            `
            await mysqlInsertQuery(sql_reddit_imagens)
            }
        } catch (error) {}
        
    }
    
    return idimagem
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
    if(data.media_metadata && data.media_metadata[name] &&  data.media_metadata[name].p.length  > 0){
        return data.media_metadata[name].p[0].u
    }
    return url
}

async function getOriginalURLIfExist(url, iqdb){
    
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

        if( service == "Zerochan"){
            let post = result.sources[0].fixedHref
            zerochan = await requestPromiseJsonZeroChan(post + "?json")
            if( zerochan && zerochan.full )
                return zerochan.full
        }
        if( service == "Sankaku Channel"){
            let post = result.sources[0].fixedHref
            post = post.split("/").pop()
            sankakucomplex = await requestPromiseJsonSankakuComplex(
                `https://capi-v2.sankakucomplex.com/posts/keyset?limit=40&tags=id_range:${post}`
            )
            if( sankakucomplex && sankakucomplex.data )
                return sankakucomplex.data[0].file_url
        }

        
    }
    return url
}
function possuiTagsInvalidas( iqdb){
    const TAGS_INVALIDAS = ['penis', 'sex', 'paizuri', 'multiple_penises', 'multiple_boys', 
    'male_masturbation', 'futanari', 'futa with futa', 'futa_with_male', 'video', 'otoko_no_ko', 
    'furry', 'femdom', 'bestiality', 'trap', 'animated_gif', 'animated', 'fellatio',
    'cumdump', 'cum_pool', 'cum_in_pussy', 'semen_pool', 'male_focus', 'testicles', 'yaoi', 
    'semen',  'cum', 'cum_inside', 'precum', 'gangbang', 'smelling_penis', 'penis_awe', 'penis_on_face', 'footjob', 'male_pubic_hair', 'handjob',
    '1boy', '2boys', 'masturbation', 'boy', 'boys', 'dildo', 'dildo_reveal', 'sex_toy', 'saliva_on_penis', 'penis_shadow', 'penis_tentacle',
    'penis_tentacles', 'tentacle_sex', 'tentacles',  'clothed_sex', 'sex_machine', 'happy_sex', 'sexual_coaching', 'all_male', 'interspecies']

    let containsAny = false;

    if( iqdb.results ){
        let result = iqdb.results[0]
        if( result.thumbnail && result.thumbnail.tags){
            for (const element of result.thumbnail.tags) {
                if (TAGS_INVALIDAS.includes(element)) {
                    containsAny = true;
                    break;
                }
            }
        }
    }
    return containsAny
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

            iqdb_best = await IQDB.search_best_match(url)
            if( ! iqdb_best)
                return null // Não vai baixar se nao tiver IQDB
            if( possuiTagsInvalidas(iqdb_best)){
                console.log("-------------------------");
                console.log("Validando Imagem", url)
                console.log("Possui Tags Invalidas");
                return null
            }

            if(process.env.ENABLE_DOWNLOAD_URL_ORIGINAL === "true"){
                url_original = await getOriginalURLIfExist(url, iqdb_best)   
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
        return null
    }

    let fileBuffer = null
    let url_final = ''
    if( process.env.ENABLE_BAR_PROGRESS === "true")
        image_progress.increment({filename: name + " Iniciando download do arquivo"})
    if( url != url_original){
        if( await checkIfURLExist(url_original) ){
            url_final = url_original
        }
        if( url_final == ''){
            let extensao_ = getExtension(url_original)
            url_original = replaceAll(url_original, "." + extensao_, (extensao_ === "png") ? ".jpg" : ".png") 
            if(await checkIfURLExist(url_original) ){
                url_final = url_original
            }
        }

        if( url_final == ''){
            let extensao_ = getExtension(url_original)
            url_original = replaceAll(url_original, "." + extensao_, ".jpeg") 
            if(await checkIfURLExist(url_original) ){
                url_final = url_original
            }
        }
    }
    //console.log(url_final, " Antes url_final ", url_original , "url_original");
    if( url_final == ''){
        if(await checkIfURLExist(url) ){
            url_final = url
        }
    }

    if(url_final != ''){
        //console.log("Final url_final ", url_final);
        fileBuffer = await getBufferImage(url_final)
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

async function requestPromiseJsonSankakuComplex(url){
    let retorno = null;
    await new Promise(function (resolve, reject) {
        request.get(url, {headers:{"Cookie": process.env.ZEROCHAN_COOKIE, "User-Agent": process.env.ZEROCHAN_USER_AGENT} }, function( error, response, body){
            if (!error && response.statusCode == 200) {
                
                try{
                    string = Buffer.from(body).toString('utf8')
                    string = replaceAll(string, "\\", "%5C")
                    retorno = JSON.parse(Buffer.from(string).toString('utf8')) ;   
                }catch(e){
                    console.log(Buffer.from(body).toString('utf8'));
                    retorno = {}
                }
            }
            resolve(retorno)
        });
    }).then((data => {
        try {
             retorno = data;
        } catch (error) {
            
        }
        
    }));
    return retorno
}

async function requestPromiseJsonZeroChan(url){
    let retorno = null;
    await new Promise(function (resolve, reject) {
        request.get(url, {headers:{"Cookie": process.env.ZEROCHAN_COOKIE, "User-Agent": process.env.ZEROCHAN_USER_AGENT} }, function( error, response, body){
            if (!error && response.statusCode == 200) {
                
                try{
                    string = Buffer.from(body).toString('utf8')
                    string = replaceAll(string, "\\", "%5C")
                    retorno = JSON.parse(Buffer.from(string).toString('utf8')) ;   
                }catch(e){
                    console.log(url);
                    retorno = {}
                }
            }
            resolve(retorno)
        });
    }).then((data => {
        try {
             retorno = data;
        } catch (error) {
            
        }
        
    }));
    return retorno
}


async function getImageUrlByURL(url_original){
    try {
        if( ! url_original){
           return {
            url: '',
            existe: false
           }
        }
        

    existe = await checkIfURLExist(url_original)
    if( ! existe){
        let extensao_ = getExtension(url_original)
        url_original = replaceAll(url_original, "." + extensao_, (extensao_ === "png") ? ".jpg" : ".png") 
        existe = await checkIfURLExist(url_original)
    }

    if( ! existe){
        let extensao_ = getExtension(url_original)
        url_original = replaceAll(url_original, "." + extensao_, ".jpeg") 
        existe = await checkIfURLExist(url_original)
    }
    return {    
        url: existe ? url_original : '',
        existe: existe
    }
    } catch (error) {
        return {
            url: '',
            existe: false
        }
    }
    
}

async function checkIfURLExist(url){
    let retorno = null;
    await new Promise(function (resolve, reject) {
        request.head(url, {headers:{"cookie": process.env.REDDIT_COOKIE, "User-Agent": "PostmanRuntime/7.32.2"} }, function( error, response, body){
            if(response && response.statusCode)
                resolve(response.statusCode == 200)
            else
                resolve(false)
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

async function getBufferImageByURL(url_original){
    let first_url = url_original
    let video_url = ''
    if( ! url_original)
        return null

    fileBuffer = await getBufferImage(url_original)
    if( ! fileBuffer){
        let extensao_ = getExtension(url_original)
        url_original = replaceAll(url_original, "." + extensao_, (extensao_ === "png") ? ".jpg" : ".png") 
        fileBuffer = await getBufferImage(url_original)
    }

    if( ! fileBuffer){
        let extensao_ = getExtension(url_original)
        url_original = replaceAll(url_original, "." + extensao_, ".jpeg") 
        fileBuffer = await getBufferImage(url_original)
    }

    return {
        fileBuffer : fileBuffer,
        url: url_original,
        video_url: video_url
    }
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
                    let community_icon = ''
                    if(children.data.sr_detail){
                        if(children.data.sr_detail.icon_img){
                            community_icon = children.data.sr_detail.icon_img
                        }else{
                            community_icon = children.data.sr_detail.community_icon
                        }
                        if(community_icon)
                            community_icon = replaceAll(community_icon, "amp;", '')
                        else
                            community_icon = ''
                    }
                    
                    //console.log(item, " item");
                    FILA_DOWNLOAD.push(cloneObject(item, {
                        "community_icon": community_icon,
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
        
        //console.log(element, " element");
        try {
            const response = await axios.get("http://localhost:6960/iqdb", {
                data: element,
                headers:{ 'Content-Type': 'application/json', "cookie": process.env.REDDIT_COOKIE, "User-Agent": process.env.REDDIT_USER_AGENT}
            })
            if( ! response.data.code){
                if( ! config.url_params){
                    config.url_params = {};
                }
                config.url_params.before = element.post.data.name;
                saveInfoReddit( config.subreddit, config)    
            }
        } catch (error) {
          //  console.log(error);
        } finally{
            processarFilaDownload(config, resolve, reject, obj_progress)
        }
        

        /*if(response.status === 200){
            if( ! config.url_params){
                config.url_params = {};
            }
            config.url_params.before = element.post.data.name;
            //saveInfoReddit( config.subreddit, config)    
        }else{
            console.log("Deu erro", response.data);
        }
        */
        //processarFilaDownload(config, resolve, reject, obj_progress)
        //request.get({url: , body: JSON.stringify(element),  }, ( error, response, body)=>{
            /*if (!error && response.statusCode == 200) {
              
              console.log(JSON.parse(Buffer.from(body).toString()));
            }else{
                
            }
            console.log(Buffer.from(body).toString());
            console.log(error, " response.statusCode", response.statusCode);*/


        //});
        /*requestDowloadFileFromURL( element , obj_progress).finally(()=>{
            if( ! config.url_params){
                config.url_params = {};
            }
            config.url_params.before = element.post.data.name;
            saveInfoReddit( config.subreddit, config)    
            processarFilaDownload(config, resolve, reject, obj_progress)
        })*/
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
            config_if.url_params = { "limit" : "100", "before" : "", "sr_detail": "1" }
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
        request.get(url, {headers:{"cookie": process.env.REDDIT_COOKIE, "User-Agent": "PostmanRuntime/7.32.2"} }, function( error, response, body){
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
        saveInfoReddit( first_data.data.subreddit, { "subreddit" : first_data.data.subreddit, url: url.split("?").shift(), "url_params": { "limit" : 100, "sr_detail":"1"} })
    });
}

function getAppletJsonDefault( reddit ){
    return {
        "subreddit" : reddit,
        "url": `https://reddit.com/r/${reddit}/new.json`,
        "url_params": { "limit" : 100, "sr_detail":"1"}
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
    try {
        files = fs.readdirSync(path_folder);
        files.forEach( (file) =>{
            const path_file = path_folder + path.sep + file;
    
            if( fs.statSync( path_file ).isDirectory()){
                listFilesRemoveFilesDuplicate(path_file, posts);
            }else{
                verifyAndRemoveDuplicateHashSum(path_file, posts);
            }
        })    
    } catch (error) {
        
    }
    
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
    console.log(filtro, " filtro");
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
    if( tag ){
        sql = `
        select tag.idtag, tag.descricao as 'tag', REGEXP_REPLACE(imagem.url, ' ', '%20') as 'url', imagem.hashsum as 'name', (imagem.height / imagem.width) * 100 as 'porcent' from imagem 
        left join imagem_tag on imagem.idimagem = imagem_tag.idimagem
       left join tag on imagem_tag.idtag = tag.idtag
       where imagem.height >= 1080
       and imagem.width >= 1920
       and imagem.width > imagem.height
       and ((imagem.height / imagem.width) * 100) > 55
       and ((imagem.height / imagem.width) * 100) < 60
       and tag.idtag in ( select idtag from tag where tag.descricao = '${tag}')
       order by imagem.idimagem desc`
    }else {
        sql = `
            select REGEXP_REPLACE(imagem.url, ' ', '%20') as 'url', imagem.hashsum as 'name' from imagem 
            group by hashsum
            order by imagem.idimagem desc`
    }
    
    
    sql_count = `SELECT count(*) as total from (${sql}) as result`
    const count = await mysqlQuery(sql_count) 
    const data = {
        urls: await mysqlQuery(sql + ' limit 0, 50'),
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
                    url = await getOriginalURLIfExist(src, iqdb);
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

function isNumeric(str) {
    if (typeof str != "string") return false // we only process strings!  
    return !isNaN(str) && // use type coercion to parse the _entirety_ of the string (`parseFloat` alone does not do this)...
           !isNaN(parseFloat(str)) // ...and ensure strings of whitespace fail
  }

async function buscarTodasImagensBD(req){
    const idtag = req.params['idtag']
    let filter_tag = ''
    if( idtag ){
        filter_tag = `AND imagem.idimagem in (SELECT idimagem FROM imagem_tag WHERE idtag = '${idtag}')`
    }
    const input_search = req.query['input-search']
    let where = ''
    if( input_search)
        where = `AND (imagem.url LIKE '%${input_search}%' OR imagem.post LIKE '%${input_search}%') `

    const input_filter = req.query['input-filter']
    let filter = ''
    if( input_filter)
        filter = ` ${input_filter} `

    let filter_resolucao = ''
    if(req.query['resolucao'] ){
        filter_resolucao =`
            AND imagem.height >= 1080
            and imagem.width >= 1920
            and imagem.width > imagem.height
            and ((imagem.height / imagem.width) * 100) > 55
            and ((imagem.height / imagem.width) * 100) < 60`
    }
    sql = `
        with consulta (idimagem, idtag, descricao) AS (
            SELECT imagem_tag.idimagem, tag.idtag, tag.descricao from tag
            inner join imagem_tag  on tag.idtag = imagem_tag.idtag
            order by tag.descricao ASC
        )
        select REGEXP_REPLACE(imagem.url, ' ', '%20') as 'url', imagem.hashsum as 'name', imagem.idimagem, imagem.width, imagem.height, imagem.post, imagem.remover,
        IF(consulta.idtag IS NULL, NULL,  CONCAT( '[', GROUP_CONCAT(JSON_OBJECT('idtag', consulta.idtag, 'descricao', consulta.descricao)), ']')) as tag_descricao
        from imagem
        left join consulta on consulta.idimagem = imagem.idimagem
        where imagem.url <> 'undefined'
        ${where}
        ${filter_tag}
        ${filter_resolucao}
        ${filter}
        group by imagem.idimagem`
    
    const limit = (req.params.page) ? ((req.params.page - 1) * 50) + ", 50 ": " 0, 50 " 
    sql_count = `SELECT count(*) as total from (
        select imagem.idimagem
        from imagem
        where imagem.url <> 'undefined'
        ${where}
        ${filter_tag}
        ${filter_resolucao}
        ${filter}
        group by imagem.idimagem
    ) as result`

    console.log(sql);
    let data = {}
    try {
        const count = await mysqlQuery(sql_count)
        data = {
            imagens: (await mysqlQuery(sql + ' order by imagem.idimagem desc limit ' + limit)).map((item => {item.crop = getCropUrlIfExist(item.url); return item})),
            total: (count.length ? count[0].total : 0)
        }    
    } catch (error) {
        data = {
            imagens: [],
            total: 0
        }    
    }
    
    return data
}

async function buscarDadosImagemBD(req){
    try {
        sql = `
        select REGEXP_REPLACE(imagem.url, ' ', '%20') as 'url', imagem.hashsum as 'name', imagem.idimagem, imagem.width, imagem.height , imagem.post, imagem.remover, imagem.video_url from imagem 
        WHERE imagem.idimagem = ${req.params.idimagem}
        order by imagem.idimagem desc
    `
    sqltag = `
        select tag.* from imagem
        left join imagem_tag on imagem_tag.idimagem = imagem.idimagem
        left join tag on imagem_tag.idtag = tag.idtag
        WHERE tag.idtag in ( select idtag from imagem_tag where imagem_tag.idimagem =  ${req.params.idimagem}) 
        group by tag.idtag
        order by tag.descricao ASC;
    `
    sqlreddit = `
        select reddit_post.*, count(reddit_imagem.idimagem) as 'files'  from reddit_post
        left join reddit_imagem on reddit_imagem.idreddit_post = reddit_post.idreddit_post
        where reddit_post.idreddit_post in ( select idreddit_post from reddit_imagem where idimagem = ${req.params.idimagem})
        group by reddit_post.idreddit_post
        order by reddit_post.idreddit_post desc
    `
    const data = (await mysqlQuery(sql))[0]
    data.tags = await mysqlQuery(sqltag)
    data.reddit = await mysqlQuery(sqlreddit)
    return data
    } catch (error) {
        return {
            imagem: {},
            tags: [],
            reddit: []
        }    
    }
}

async function buscarTodasTagsBD(req){
    const input_search = req.query['input-search']
    let where = ''
    if( input_search)
        where = `WHERE tag.descricao LIKE '%${input_search}%'`

    const sql = `select tag.idtag, tag.descricao as 'tag', count(tag.idtag) as 'total' from tag 
        inner join imagem_tag on imagem_tag.idtag = tag.idtag
        ${where}    
        group by tag.idtag
        order by count(tag.idtag) desc`

    sql_count = `SELECT count(*) as total from (${sql}) as result`
    
    const limit = (req.params.page) ? ((req.params.page - 1) * 50) + ", 50 ": " 0, 50 " 

    const count = await mysqlQuery(sql_count) 
    const data = {
        tags: await mysqlQuery(sql + ' limit ' + limit),
        total: (count.length ? count[0].total : 0)
    }
    return data
}

async function buscarDadosTagBD(req){
    try {
        const sql = `select tag.* from tag 
        where tag.idtag = '${req.params.idtag}'
        `
        imagens = await buscarTodasImagensBD(req)
        tag = (await mysqlQuery(sql))[0]
        imagens.tag = tag
        return imagens
/*
    sqlimagens = `
        select REGEXP_REPLACE(imagem.url, ' ', '%20') as 'url', imagem.hashsum as 'name', imagem.idimagem, imagem.width, imagem.height, imagem.post from imagem 
        left join imagem_tag on imagem_tag.idimagem = imagem.idimagem
        left join tag on imagem_tag.idtag = tag.idtag
        WHERE (tag.idtag = '${req.params.idtag}' OR tag.descricao = '${req.params.idtag}')
        and imagem.remover = 0
        order by imagem.idimagem DESC
    `
    const limit = (req.params.page) ? ((req.params.page - 1) * 50) + ", 50 ": " 0, 50 " 
    
    sql_count = `SELECT count(*) as total from (${sqlimagens}) as result`
    const count = await mysqlQuery(sql_count) 

    const data = (await mysqlQuery(sql))[0]
    data.imagens = (await mysqlQuery(sqlimagens + ' limit ' + limit)).map((item => {item.crop = getCropUrlIfExist(item.url); return item}))
    data.total= (count.length ? count[0].total : 0)
    return data*/
    } catch (error) {
        console.log(error);
        return {
            imagem: {},
            tags: [],
            total: 0
        }    
    }
}

async function buscarTodosPostsRedditBD(req){
    try {
        const subreddit = req.params.subreddit
        let where = ''
        if( subreddit)
            where = `AND reddit_post.subreddit = '${subreddit}'`

        sql = `
        with consulta (idimagem, idtag, descricao) AS (
            SELECT imagem_tag.idimagem, tag.idtag, tag.descricao from tag
            inner join imagem_tag  on tag.idtag = imagem_tag.idtag
        )
        select reddit_post.idreddit_post, reddit_post.subreddit, reddit_post.post_url, reddit_post.community_icon, reddit_post.name as 'post_name', REGEXP_REPLACE(imagem.url, ' ', '%20') as 'url', imagem.hashsum as 'name', imagem.idimagem, imagem.width, imagem.height, imagem.post, imagem.remover,
        IF(consulta.idtag IS NULL, NULL,  CONCAT( '[', GROUP_CONCAT(JSON_OBJECT('idtag', consulta.idtag, 'descricao', consulta.descricao)), ']')) as tag_descricao
        from imagem
        left join consulta on consulta.idimagem = imagem.idimagem
        inner join reddit_imagem on reddit_imagem.idimagem = imagem.idimagem
        inner join reddit_post on reddit_imagem.idreddit_post = reddit_post.idreddit_post 
        where imagem.remover = 0
        ${where}
        group by reddit_imagem.idreddit_post, reddit_imagem.idimagem
        `    
    sql_count = `
        SELECT count(*) as total from (
        
            select reddit_post.idreddit_post
            from imagem
            inner join reddit_imagem on reddit_imagem.idimagem = imagem.idimagem
            inner join reddit_post on reddit_imagem.idreddit_post = reddit_post.idreddit_post
            where imagem.remover = 0
            ${where}
            group by reddit_imagem.idreddit_post, reddit_imagem.idimagem
            ) as result`
    
    const limit = (req.params.page) ? ((req.params.page - 1) * 50) + ", 50 ": " 0, 50 " 
    const count = await mysqlQuery(sql_count)
    let post = await mysqlQuery(sql + ' order by reddit_imagem.idreddit_post DESC, reddit_imagem.idimagem desc limit ' + limit) 
    if( ! post) post = []

    const data = {
        post: post.map((item => {item.crop = getCropUrlIfExist(item.url); return item})),
        /**post: await mysqlQuery(sql + ' limit ' + limit),*/
        total: (count.length ? count[0].total : 0)
    }
    return data
    } catch (error) {
        console.log(error);
        return {
            post: {},
            tags: []
        }    
    }
}

async function buscarTodosRedditBD(req){
    try {
        const input_search = req.query['input-search']
        let where = ''
        if( input_search)
            where = `WHERE reddit_post.subreddit LIKE '%${input_search}%'`

        let sql = `select reddit_post.*, count(reddit_imagem.idreddit_post) as 'total' from reddit_post
            inner join reddit_imagem on reddit_imagem.idreddit_post = reddit_post.idreddit_post
            ${where}
            group by reddit_post.subreddit
            order by count(*) desc
        `    
        sql_count = `SELECT count(*) as total from (${sql}) as result`
        
        const limit = (req.params.page) ? ((req.params.page - 1) * 50) + ", 50 ": " 0, 50 " 

        const count = await mysqlQuery(sql_count)
        const data = {
            post: await mysqlQuery(sql + ' limit ' + limit),
            total: (count.length ? count[0].total : 0)
        }
        return data
    } catch (error) {
        return {
            post: {},
            tags: []
        }    
    }
}

function getCropUrlIfExist(url){
    if( ! url)
        return url
    try {
        if(url.startsWith("https://cdn.donmai.us/original")){
            url_split = url.split("/")
            hash = url_split.pop()
            let hash_1= hash.substring(0, 2)
            let hash_2= hash.substring(2, 4)
            return `https://cdn.donmai.us/360x360/${hash_1}/${hash_2}/${hash.replace("png", "jpg").replace("jpeg", "jpg").replace("webp", "jpg")}`
        }
            
        if(url.startsWith("https://files.yande.re/image/")){
            url_split = url.split("/")
            hash = url_split[4]
            let hash_1= hash.substring(0, 2)
            let hash_2= hash.substring(2, 4)
            return `https://assets.yande.re/data/preview/${hash_1}/${hash_2}/${hash}.jpg`
        }
        if(url.startsWith("https://konachan.com")){
            url_split = url.split("/")
            hash = url_split[4]
            let hash_1= hash.substring(0, 2)
            let hash_2= hash.substring(2, 4)
            return `https://konachan.com/data/preview/${hash_1}/${hash_2}/${hash}.jpg`
        }

        if(url.startsWith("https://img3.gelbooru.com")){
            let url_split = url.split("/")
            let hash = new URL(url).pathname.split("/").pop()
            let hash_1= hash.substring(0, 2)
            let hash_2= hash.substring(2, 4)
            return `https://img3.gelbooru.com/thumbnails/${hash_1}/${hash_2}/thumbnail_${hash.replace("png", "jpg").replace("jpeg", "jpg")}`
        }

        if(url.startsWith("https://images.anime-pictures.net/")){
            url_split = url.split("/")
            hash = url_split[4].split(".")[0]
            let hash_1= hash.substring(0, 3)
            return `https://cdn.anime-pictures.net/previews/${hash_1}/${hash}_cp.jpg`
        }

        if(url.startsWith("https://static.zerochan.net/")){       
            url = replaceAll(url, "static.", "s1.")
            url = replaceAll(url, ".full.", ".600.")
            url = replaceAll(url, ".png", ".jpg")
            return url
        }
    } catch (error) {
        console.log(error, url);
    }
    
    return url
}



async function consultarImagemFromBD(idimagem){
    sql = `
    select imagem.* from imagem
    where imagem.idimagem = ${idimagem}
    `
    result = await mysqlQuery(sql)
    for(const item of result){
        try {
        let crop_url = getCropUrlIfExist(item.url)
        retornocrop = await getImageUrlByURL(crop_url)
        crop_url = retornocrop.url
        //console.log( crop_url, retornocrop);
        if( retornocrop.existe){
            const iqdb = await IQDB.search_best_match(crop_url)
            if(iqdb){
                item.url = await getOriginalURLIfExist(crop_url, iqdb)   
                retornooriginal = await getImageUrlByURL(item.url)
                if( ! retornooriginal.existe){
                    item.url = crop_url
                }else{
                    item.url = retornooriginal.url
                }
                //console.log(item.idimagem, 'final', item.url, 'orig', retornooriginal.url, 'crop', retornocrop.url);
                const fileBuffer = await getBufferImageByURL(item.url)
                if( fileBuffer && fileBuffer.fileBuffer)
                    await updateLogIQDBSearch(iqdb, null, fileBuffer.url, fileBuffer.fileBuffer, item.idimagem, fileBuffer.video_url)
            }
        }else{
            update = ` update imagem set remover = 1 where idimagem = ${item.idimagem}`
            await mysqlQuery(update)
        }

        } catch (error) {
            console.log( error);
            console.log(item);       
        }
    }
}

async function consultarImagemFromURL(item){
    if( ! item.url ){
        return null
    }

    try {
        let crop_url = getCropUrlIfExist(item.url)
        retornocrop = await getImageUrlByURL(crop_url)
        crop_url = retornocrop.url
        if( retornocrop.existe){
            const iqdb = await IQDB.search_best_match(crop_url)
            if(iqdb){
                item.url = await getOriginalURLIfExist(crop_url, iqdb)   
                retornooriginal = await getImageUrlByURL(item.url)
                
                if( ! retornooriginal.existe){
                    item.url = crop_url
                }else{
                    item.url = retornooriginal.url
                }
                const fileBuffer = await getBufferImageByURL(item.url)
                if( fileBuffer && fileBuffer.fileBuffer){
                    resultado = await addLogIQDBSearch(iqdb, null, fileBuffer.url, fileBuffer.fileBuffer)
                    return { idimagem: resultado }
                }
                    
            }
        }
    } catch (error) {
       return null 
    }
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
    possuiTagsInvalidas,
    chunkArray,
    getBufferImageByURL,
    buscarTodasImagensBD,
    buscarDadosImagemBD,
    buscarTodasTagsBD,
    buscarDadosTagBD,
    buscarTodosPostsRedditBD,
    buscarTodosRedditBD,
    checkIfURLExist,
    addLogIQDBSearch,
    getCropUrlIfExist,
    updateLogIQDBSearch,
    getImageUrlByURL,
    consultarImagemFromBD,
    consultarImagemFromURL
}
