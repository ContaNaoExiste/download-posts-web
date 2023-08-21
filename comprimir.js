const { getHashSumFromBuffer, getHashSumFromFile } = require("./js/download_posts_reddit")
const fs = require('fs');
const path = require("path");
const compressImages = require("compress-images");
const { compress_image } = require("./compress_image");
const post = require('./js/download_posts_reddit');

async function processamento(caminho){
    for(const file of fs.readdirSync(caminho)){
        const file_path = path.resolve(caminho, file)
        if( fs.lstatSync(file_path).isDirectory()){
            await processamento(file_path)
        }else{
            pasta = caminho.split(path.sep).pop()

            //console.log(file_path, caminho, pasta);
            await comprimirERenomearImagem(file_path, `js\\.database\\saida\\`);
        }
    }
}

const getAllFiles = function(dirPath, arrayOfFiles) {
  files = fs.readdirSync(dirPath)

  arrayOfFiles = arrayOfFiles || []

  files.forEach(function(file) {
    const stats = fs.statSync(dirPath + "/" + file)
    if (stats.isDirectory()) {
      arrayOfFiles = getAllFiles(dirPath + "/" + file, arrayOfFiles)
    } else {
        if(stats.size > 7000000){
            arrayOfFiles.push(path.join(dirPath, "/", file).split(__dirname)[1].substring(1))
        }
    }
  })

  return arrayOfFiles
}
function main(){
    try {
        const allFiles = getAllFiles(path.resolve(__dirname, "js", ".database", "reddit_files"))
        console.log(allFiles.length);
        for (const file of allFiles) {
            //console.log(file);
            try {
             compress_image(file)   
            } catch (error) {
                console.log( file);
            }
        }    
    } catch (error) {
        
    }
    
    //
    

    //console.log("Continuou o processamento");
    //processamento(path.resolve("js", ".database", "reddit_files_copia"))
    /*sum = getHashSumFromFile(path.resolve("js", ".database", "reddit_tempfiles", "ed4d9675afb3e3b5334de7d3af78fe8b.jpg"))
    console.log(sum);*/
}

function comprimirERenomearImagem(path_imagem, path_imagem_out){
    const compression = 90
    caminho_imagem = path_imagem.split(__dirname)[1]
    caminho_imagem = caminho_imagem.substring(1);
    
    nome_arquivo = path_imagem.split(__dirname).pop()
    caminho_saida = path_imagem_out.split(__dirname)[1]
    
    if( fs.existsSync( path_imagem_out + caminho_imagem)){
       // console.log("Existe");
        return null
    }else{
        console.log(path.resolve(path_imagem_out, caminho_imagem), " path_imagem_out + caminho_imagem");
        fs.copyFileSync(path.resolve(path_imagem), path.resolve(path_imagem_out, caminho_imagem))
    }
    
    //E:\VisualStudio Workspace\download-posts-reddit\js\.database\saida\js\.database\reddit_files_copia

    /*return compressImages(caminho_imagem, path_imagem_out, { compress_force: false, statistic: true, autoupdate: true }, false,
        { jpg: { engine: "mozjpeg", command: ["-quality", compression] } },
        { png: { engine: "pngquant", command: ["--quality=" + compression + "-" + compression, "-o"] } },
        { svg: { engine: "svgo", command: "--multipass" } },
        { gif: { engine: "gifsicle", command: ["--colors", "64", "--use-col=web"] } },
        async function (error, completed, statistic) {
            if( error ){
               // fs.renameSync(path.resolve(path_imagem), path.resolve(path_imagem_out, caminho_imagem))
            }
            console.log(error);
            //if( ! error)
                //fs.unlinkSync(path_imagem)
        }
    )*/
}

main()
/**
 * 
const { getHashSumFromBuffer, getHashSumFromFile } = require("./js/download_posts_reddit")
const fs = require('fs');
const path = require("path");
const compressImages = require("compress-images")

function main(){
    const compression = 90
    let cam = "in/teste/t3_1174dim 2.jpg" //path.resolve(__dirname, "in", "teste", "t3_116vbl8 1.png")
    
    console.log(cam);
    compressImages(cam, path.resolve("out", "hentai") + path.sep, { compress_force: false, statistic: true, autoupdate: true }, false,
        { jpg: { engine: "mozjpeg", command: ["-quality", compression] } },
        { png: { engine: "pngquant", command: ["--quality=" + compression + "-" + compression, "-o"] } },
        { svg: { engine: "svgo", command: "--multipass" } },
        { gif: { engine: "gifsicle", command: ["--colors", "64", "--use-col=web"] } },
        async function (error, completed, statistic) {
            console.log("-------------")
            console.log(error)
            console.log(completed)
            console.log(statistic)
            console.log("-------------")

        }
    )
}

main()
*/