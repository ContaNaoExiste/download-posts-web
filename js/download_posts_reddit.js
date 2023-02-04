const fs = require('fs');
const crypto = require("crypto");
const path = require("path");
const request = require('request').defaults({ encoding: null });
require('dotenv/config');

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
            return data.url.replace(".gifv", ".mp4");;
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

            if(data.preview.images){
                data.preview.images.forEach( (item, index) =>{
                    urls.push({ url: item.source.url.replace("&amp;", "&"), name: data.name + " " + index})
                })
            }
            return urls;
        }

        if(data.crosspost_parent_list){
            data.crosspost_parent_list.forEach( (item) =>{
                let temp_url = extractedURLFromRedditData(item)
                if( temp_url instanceof Array){
                    temp_url.forEach( result => {
                        urls.push(result)
                    })
                }else{
                    return temp_url;
                }
            })
            return urls;
        }
    } catch (error) {
        if( process.env.DEBUG_ERROR === "true"){
            console.error("extractedURLFromRedditData", error);
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

async function requestDowloadFileFromURL(url, data, name){
    if( ! url) return null;
    
    if( process.env.ACCEPT_FORMAT_FILES && !(process.env.ACCEPT_FORMAT_FILES.includes( getExtension( url) ))) return null;
    
    try {
        let directory = getPATH_DOWNLOAD_FILES() + path.sep + data.subreddit;
        if( ! fs.existsSync(directory)) fs.mkdirSync( directory);
        
        var pathFile = directory + path.sep + removeInvalidCharacteresPath( name || data.name) + "." + getExtension(url);
        if( fs.existsSync(pathFile) ) return null; // Se existe não baixa de novo
        
    } catch (error) {
        if( process.env.DEBUG_ERROR === "true"){
            console.error("extractedURLFromRedditData", error);
        }
    }
    return new Promise(function (resolve, reject) {
        data.fullurl = url;
        request.get(url, function( error, response, body){

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
    const url = extractedURLFromRedditData(data)
    if( url instanceof Array){
        url.forEach( async ( item ) =>{
            await requestDowloadFileFromURL( item.url, data, item.name)
        })
    }else{
        await requestDowloadFileFromURL( url, data)
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

async function setContentThenGoogleDrive( config, data){
     return new Promise(function (resolve, reject) {
        if( data.data && data.data.children ){
            next_data_children(data.data.children.reverse(), config, data, resolve);
        }
    });  
}

function next_data_children( vetor, config, data, resolve){
    if( vetor.length > 0 ){
        let element = vetor.shift();
        if( element.data ){
            if( ! config.url_params){
                config.url_params = {};
            }
            config.url_params.before = element.data.name;
            
            dowloadFileFromDataURL(element.data).then(() =>{
                saveInfoReddit( config.subreddit, config);
                
                next_data_children(vetor, config, data, resolve);
            });
        }
    }else{
        resolve();
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
        var dir = __dirname + path.sep + ".database" + path.sep + "logs" + path.sep + reddit;
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
    request.get(url.href, ( error, response, body)=>{
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
        request.get(url, function( error, response, body){
                if (!error && response.statusCode == 200) {
                    try {
                        data = JSON.parse(Buffer.from(body).toString('utf8'));
                        if( data.data.children.length == 0){
                           url = `https://www.reddit.com/u/${reddit}/new.json?limit=1`;
                            request.get(url, function( error, response, body){
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

        return new Promise(function (resolve, reject) {        
            getInfoRedditByName(subreddit).then( (config ) =>{
                if( config ){
                    getContentIfReddit(config, (config2, json) =>{
                        setContentThenGoogleDrive(config, json).then( ()=>{
                            resolve( config);
                        });
                    })
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
}

function buscarLocalDatabaseReddits( filtro ){
    let directory_files = "F:\\VisualStudio Workspace\\GoogleDriveUpload\\files";

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
            } catch (error) {}
            let url = ( `https://www.reddit.com/r/${element}/new`);
            if(element.startsWith('u_')){
                url = ( `https://www.reddit.com/u/${element.substring(2) }/`);
            }
            
            applets.push( {
                "subreddit" : subreddit,
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

    //let directory = __dirname + path.sep + path.sep + ".database" + path.sep + "reddit";
    //let directory_files = getPATH_DOWNLOAD_FILES();
    /*let directory = "F:\\VisualStudio Workspace\\GoogleDriveUpload\\database\\applets";
    let directory_files = "F:\\VisualStudio Workspace\\GoogleDriveUpload\\files";

    let applets = [];
    let totais = { subreddits: 0, files: 0};
    let info = { espaco_usado: 0}
    try {
      let files = fs.readdirSync( directory);
      if( files ){
        if(filtro){
            files = files.filter( (value)=>{ return value.match( filtro )} );
        }

        totais.subreddits = files.length;
        files.forEach(element => {
            let json = {}
            try {
                json = JSON.parse(fs.readFileSync(directory + path.sep + element))   
            } catch (error) { }

            let subreddit = element.split(".json").shift();
            let files = 0;
            try {
                files = fs.readdirSync( directory_files + path.sep + subreddit).length;
            } catch (error) {}
            
            let url = ( json && json.url ? json.url : (json && json.if) ? json.if.subreddit.url: "");
            applets.push( {
                "subreddit" : subreddit,
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
    }*/
    
    applets = applets.sort( (a, b) => { if ( a.files < b.files ) return 1; if ( a.files > b.files ) return -1; return 0;});
    return {applets: applets, totais: totais, info: info};
}

function buscarTodosPostReddit(){
    const lista = buscarLocalDatabaseReddits();
    lista.applets.forEach( item =>{
        buscarPostsReddit( item.subreddit );
    })
}

module.exports = {
    buscarPostsReddit,
    buscarLocalDatabaseReddits,
    uploadGoogleDriveByJson,
    removeFilesDuplicate,
    buscarTodosPostReddit
}
