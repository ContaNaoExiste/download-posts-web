const fs = require('fs');
const crypto = require("crypto");
const path = require("path");
const request = require('request').defaults({ encoding: null });
const IQDB  = require("./iqdb");
const { resolve } = require('path');
require('dotenv/config');

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

function extractedURLFromRedditData(data){
    try {
        let urls = [];

        if(data.media && data.media.reddit_video){
            return data.media.reddit_video.fallback_url;
        }

        if(data.media && data.media.type === "redgifs.com"){
            data.url = data.media.oembed.thumbnail_url.replace("-mobile.jpg", ".mp4");
        }
        
        let url = new URL( data.url);
        if( getExtension(url.pathname) === 'gifv'){
            return data.url.replace(".gifv", ".mp4")
        }
        
        if( getExtension(url.pathname) === 'gif'){
            return data.url
        }
        
        if( data.media_metadata){
            Object.values(data.media_metadata).forEach( (item, index) =>{
                urls.push({ url: "https://i.redd.it/" + item.id + getTypeExtensionFile( { mimeType: item.m}), name: data.name + " " + index})
            })
            return urls;
        }

        if( data.preview ){
            
            if(data.preview.reddit_video_preview){
                return data.preview.reddit_video_preview.fallback_url;
            }

            if(data.preview.images.length > 0){
                data.preview.images.forEach( (item, index) =>{
                    let url_obj = { 
                        url: item.source.url.split("&amp;").join("&"), 
                        name: data.name + " " + index
                    }
                    if( item.resolutions.length > 0){
                        url_obj.url_iqdb = item.resolutions[0].url.split("&amp;").join("&")
                    }
                    urls.push(url_obj)
                })
                return urls;
            }
        }

        if(data.crosspost_parent_list && data.crosspost_parent_list.length > 0){
            data.crosspost_parent_list.forEach( (item) =>{
                
                let temp_url = extractedURLFromRedditData(item)
                if( temp_url instanceof Array){
                    temp_url.forEach( result => {
                        urls.push(result)
                    })
                }else{
                    urls.push( {url: temp_url, name: item.name + " " + urls.length})
                }
            })
            return urls;
        }
        
    } catch (error) {
        if( process.env.DEBUG_ERROR === "true"){
            console.error("extractedURLFromRedditData", error)
        }
    }
    return data.url;
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
    return filename.split('.').pop().split("?").shift();
}

function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}

function replaceAll(str, find, replace) {
    return str.replace(new RegExp(escapeRegExp(find), 'g'), replace);
}

function removeInvalidCharacteresPath( stringToReplace ){
    if( ! stringToReplace) return "Sem Nome";
        
    var specialChars = "!@#$^&%*()+=-[]\/{}|:<>?,.";

    for (var i = 0; i < specialChars.length; i++) {
        stringToReplace = stringToReplace.replace(new RegExp("\\" + specialChars[i], "gi"), "");
    }

    return replaceAll(stringToReplace, "\"", "");
}

function addLogIQDBSearch(iqdb_best, download){
    let data = download.post.data
    let directory = __dirname + path.sep + ".database" + path.sep + "log_iqdb"
    if( ! fs.existsSync(directory)) fs.mkdirSync( directory)
    
    if( data.crosspost_parent_list && data.crosspost_parent_list.length > 0)
        directory += path.sep + data.crosspost_parent_list[0].subreddit
    else
        directory += path.sep + data.subreddit

    if( ! fs.existsSync(directory)) fs.mkdirSync( directory)
    
    var pathFile = directory + path.sep + removeInvalidCharacteresPath( download.name) + ".json"
    if( fs.existsSync(pathFile) ) fs.unlinkSync(pathFile)

    const json_completo = {
        iqdb: iqdb_best,
        reddit: data,
        url: download.download,
        url_iqdb: download.url_iqdb,
        name: download.name
    }
    fs.writeFileSync(pathFile, JSON.stringify(json_completo));    
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
        return data.media_metadata[name].p[0].u.split("&amp;").join("&")
    }
    return url
}

async function requestDowloadFileFromURL(download){

    let url = download.download
    let name = download.name
    let data = download.post.data
    let url_iqdb = download.url_iqdb
    if( ! url) return null
    if( process.env.ACCEPT_FORMAT_FILES && !(process.env.ACCEPT_FORMAT_FILES.includes( getExtension( url) )))
        return null
    
    try {
        if(  existInDirectoryIQDB(url, data, name) )
            return null
        
        let iqdb_best = null
        try {
            iqdb_best = await IQDB.search_best_match(url_iqdb)
            if( iqdb_best){
                addLogIQDBSearch(iqdb_best, download)
            }    
        } catch (error) {
            console.log("Erro consulta IQDB: ",url_iqdb,  error);
            iqdb_best = null
        }
        
        let directory = getPATH_DOWNLOAD_FILES()
        if(iqdb_best) 
            directory += path.sep + "iqdb"
        else 
            directory += path.sep + "geral"
        if( ! fs.existsSync(directory)) fs.mkdirSync( directory);

        if( data.crosspost_parent_list && data.crosspost_parent_list.length > 0)
            directory += path.sep + data.crosspost_parent_list[0].subreddit;
        else
            directory += path.sep + data.subreddit

        if( ! fs.existsSync(directory)) fs.mkdirSync( directory);
       
        var pathFile = directory + path.sep + removeInvalidCharacteresPath( name || data.name) + "." + getExtension(url);
        if( fs.existsSync(pathFile) ) return null; // Se existe não baixa de novo
       

    } catch (error) {
        if( process.env.DEBUG_ERROR === "true"){
            console.error("requestDowloadFileFromURL", url, error);
        }
    }
    return new Promise(function (resolve, reject) {
        data.fullurl = url;
        request.get(url, {headers:{"cookie": process.env.REDDIT_COOKIE} }, function( error, response, body){

                if (!error && response.statusCode == 200) {
                    try {
                        if( ! fs.existsSync(pathFile)) fs.writeFileSync(pathFile, Buffer.from(body));    
                        resolve(data);
                    } catch (error) {
                        reject(data)
                        console.error(error.message)
                    }
                }else{
                    resolve(data)
                }
            });
        
    });
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
            let download = item.url || item
            
            if( ! FILA_URL_DOWNLOAD[download]){
                FILA_URL_DOWNLOAD[download] = download
                if( process.env.ACCEPT_FORMAT_FILES && (process.env.ACCEPT_FORMAT_FILES.includes( getExtension( download ) ))){
                    FILA_DOWNLOAD.push({
                        "download": download,
                        "name"  : item.name || children.data.name,
                        "post"  : children,
                        "url_iqdb": getURLSearchIQDB( item.url_iqdb || download, children.data)
                    })  
                }
            }  
        })
    }
}

async function processarFilaDownload(config, resolve, reject){
    if(FILA_DOWNLOAD.length == 0){
        resolve()
    }
    if( FILA_DOWNLOAD.length){
        let element = FILA_DOWNLOAD.shift()
        requestDowloadFileFromURL( element ).finally(()=>{
            if( ! config.url_params){
                config.url_params = {};
            }
            config.url_params.before = element.post.data.name;
            saveInfoReddit( config.subreddit, config)    
            processarFilaDownload(config, resolve, reject)
        })
    }
}

async function setContentThenGoogleDrive( config, data){
    if( data.data && data.data.children ){
        data.data.children.reverse().forEach(children => {
            addFilaDownload(children)
        })
    }

    return new Promise(function (resolve, reject) {
        console.log("Será feito o download de " + FILA_DOWNLOAD.length + " arquivos!!");
        processarFilaDownload(config, resolve, reject)
    })
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
    request.get(url.href, {headers:{"cookie": process.env.REDDIT_COOKIE} }, ( error, response, body)=>{
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
    let directory_files = path.resolve(__dirname, ".database", process.env.PATH_DOWNLOAD_FILES, "iqdb");

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

function buscarTodasTagsIQDB(filtro){
    const TAGS_IQDB = {}
    let directory_files = path.resolve(__dirname, ".database", "log_iqdb");
    try {
      let folders = fs.readdirSync( directory_files);
      if( ! filtro)
        filtro = "ZettaiRyouiki"
    
      if(filtro){
        folders = folders.filter( (value)=>{ return value.toUpperCase().match( filtro.toUpperCase() )} );
    }
      if( folders.length ){
        chunkArray(folders.reverse(), 50)[0].forEach(element => {
            let files = fs.readdirSync( path.resolve(directory_files, element));
            files.forEach(file => {
                const rawdata = fs.readFileSync( path.resolve(directory_files, element, file))
                const json = JSON.parse(rawdata)

                if (json.iqdb && json.iqdb.results) {
                    const tags = json.iqdb.results[0].thumbnail.tags
                    if( tags){
                        tags.forEach(tag => {
                            if(! TAGS_IQDB[tag]){
                                TAGS_IQDB[tag] ={
                                    total: 0,
                                    tag: tag,
                                    urls: [],
                                    urls_iqdb: [],
                                    names: []
                                }
                            }
                            TAGS_IQDB[tag].total ++;
                            TAGS_IQDB[tag].urls.push(json.url);
                            TAGS_IQDB[tag].urls_iqdb.push(json.url_iqdb || json.iqdb.results[0].thumbnail.fixedSrc);
                            TAGS_IQDB[tag].names.push(json.name);
                        });
                    }
                }
            }); 
        });
      }
    } catch (error) {
        console.log(error );
    }
    
    return {
        tags: chunkArray(Object.values(TAGS_IQDB).sort((a, b) =>{return a.total - b.total}).reverse(), 20)[0],
        total: Object.values(TAGS_IQDB).length
    }
}

module.exports = {
    buscarPostsReddit,
    buscarLocalDatabaseReddits,
    uploadGoogleDriveByJson,
    removeFilesDuplicate,
    buscarTodosPostReddit,
    buscarTodasTagsIQDB
}
