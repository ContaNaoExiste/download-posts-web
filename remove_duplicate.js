const fs = require('fs');
const crypto = require("crypto");
const path = require("path");
require('dotenv/config');

function main(){
    const path_file = `C:\\Users\\andre\\OneDrive\\Imagens\\WallpaperAnimes`
    const path_copy_file = `D:\\WallpaperAnimes`
    listFilesRemoveFilesDuplicate( path_file, path_copy_file, {});
    
    console.log("Terminou Remoção de Duplicados");
}

/** 
 * Lê o conteudo de uma pasta,
 *  Se conter outra pasta, é realizado uma recursividade.
 *  Caso seja arquivo, entao é feito a verificaçao do HashSum
*/
function listFilesRemoveFilesDuplicate( path_folder, path_copy_file, posts ){
    try {
        files = fs.readdirSync(path_folder);
        files.forEach( (file) =>{
            const path_file = path_folder + path.sep + file;
    
            if( fs.statSync( path_file ).isDirectory()){
                listFilesRemoveFilesDuplicate(path_file, path_copy_file, posts);
            }else{
                verifyAndRemoveDuplicateHashSum(path_file, path_copy_file, posts);
            }
        })    
    } catch (error) {
        
    }
    
}

/** 
 * Verifica se o HashSum do arquivo já existe.
 * Caso nao exista, adiciona o HashSum na lista de arquivos analisados.
 * Caso exista entao buscará o parametro REMOVE_OR_COPY_DUPLICATE_ITENS
 *  Caso o valor do parametro REMOVE_OR_COPY_DUPLICATE_ITENS seja === "REMOVE", o arquivo será excluido fisicamente.
 *  Caso o valor do parametro REMOVE_OR_COPY_DUPLICATE_ITENS seja === "COPY", o arquivo será movido fisicamente para uma pasta temporaria, seguindo o parametro PATH_COPY_FILES.
 * 
*/
function verifyAndRemoveDuplicateHashSum( path_file, path_copy_file, posts){
    const hex = getHashSumFromFile( path_file );
    if( ! posts[hex]){
        posts[hex] = path_file
    }else{
        try {
            //if( process.env.REMOVE_OR_COPY_DUPLICATE_ITENS === "REMOVE"){
            
            fs.copyFileSync(path_file, path_copy_file + path.sep + getNameFile( path_file))
            fs.unlinkSync(path_file)
            //}else if( process.env.REMOVE_OR_COPY_DUPLICATE_ITENS === "COPY"){
            //}
        } catch (error) {
            if( process.env.DEBUG_ERROR === "true"){
                console.log("verifyAndRemoveDuplicateHashSum", error);
            }
        }
    }
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
 * Retorna o nome do arquivo
*/
function getNameFile( path_file){
    return path_file.split(path.sep).pop();
}
main()