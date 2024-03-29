const fs = require('fs');
const crypto = require("crypto");
const path = require("path");
const { url } = require('inspector');
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

// you can send full url here
function getExtension(filename) {
    return filename.split('.').pop();
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

    throw new Error("Erro tipo nãp suportado" + " Type " + data.mimeType + ' URL ' + data.subreddit + "\\" + data.fullurl);
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

async function requestURLReddit( url, config, callback){
    if( ! url || ! url.href){
        return false;
    }

    request.get(url.href, ( error, response, body)=>{
        if (!error && response.statusCode == 200) {
            data = JSON.parse(Buffer.from(body).toString('utf8'));
            if( data.data.children && data.data.children.length > 0){
                saveLogReturnRequest(config.subreddit, data);
                callback( config, data);
            }else{
                generateNextUrlIfReddit(config, url).then( (next_url) => {
                    requestURLReddit( next_url, config, callback);
                });
            }
        }
    });
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
/****************TWITTER  *****************/
async function buscarPostsTwitter( query ){
    try {
        requestURLReddit( query)
    } catch (error) {
        if( process.env.DEBUG_ERROR === "true"){
            console.log("buscarPostsTwitter", error);
        }
    }
    
}
async function requestURLReddit(query, next_token){
    let url = `https://api.twitter.com/2/tweets/search/recent?query=${query}&expansions=attachments.media_keys&media.fields=duration_ms,height,media_key,preview_image_url,public_metrics,type,url,width,alt_text,variants&max_results=100`
    if( ! url) return null;
    
    if( next_token) url += "&next_token=" + next_token;

    var options = {
        url: url,
        json: true,
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/plain',
          Authorization: `Bearer ${process.env.TWITTER_REFRESH_TOKEN}`,
        }
    };

    //console.log(url);
    request.get(options, function( error, response, body){
        //console.log(body);
        
        if ( !error && response.statusCode == 200) {
            try {
                const json = body;
                if( json.includes && json.includes.media){

                    json.includes.media.forEach((item) =>{
                        if( item.type === "video"){
                            console.log(item, "json.includes.media.length");
                        }
                        
                        requestTwitterFromURL( item );
                    })
                }
                if( json.meta && json.meta.next_token){
                    requestURLReddit( query, json.meta.next_token);
                }
                //console.log(json);
            } catch (error) {
                if( process.env.DEBUG_ERROR === "true"){
                    console.error("requestURLReddit", error);
                }
            }
        }else{
            try {
                console.log("body", body);   
                console.log("response.statusCode", response);   
                console.log("error", error);   
            } catch (error) {
                console.log(error);
            }
        }
                    
    });
}

async function requestTwitterFromURL(data ){
    const url = data.url;

    if( ! url) return null;
    
    if( process.env.ACCEPT_FORMAT_FILES && !(process.env.ACCEPT_FORMAT_FILES.includes( getExtension( url) ))) return null;

    request.get(url, function( error, response, body){
        if ( !error && response.statusCode == 200) {
            try {
                let directory = getPATH_DOWNLOAD_FILES() + path.sep + "twitter";
                if( ! fs.existsSync(directory)) fs.mkdirSync( directory);
                
                var pathFile = directory + path.sep + removeInvalidCharacteresPath( data.media_key) + "." + getExtension(data.url);
                if( ! fs.existsSync(pathFile)) fs.writeFileSync(pathFile, Buffer.from(body));
            } catch (error) {
                if( process.env.DEBUG_ERROR === "true"){
                    console.error("requestTwitterFromURL", error);
                }
            }
        }
                    
    });
}

/** 
 * Inicia o processo de leitura das pastas de arquivos.
 * O primeiro caminho será o parametro PATH_DOWNLOAD_FILES
*/
function removeFilesDuplicate(){
    listFilesRemoveFilesDuplicate( getPATH_DOWNLOAD_FILES(), {});
}

module.exports = {
    buscarPostsTwitter,
    removeFilesDuplicate
}
