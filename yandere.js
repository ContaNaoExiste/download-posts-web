const { default: axios } = require("axios");
const Reddit  = require("./js/download_posts_reddit");
const Jobs = require('./js/schedule');

async function main(params) {
    let tags = ''   //uncensored
    let page = 1//318   //243// 189
    pesquisarImagens(tags, page)
    
}

async function pesquisarImagem(data){
    if( data.length == 0)
        return false

    let imagem = data.shift()

    try {
                   
        let type = ''
        switch (imagem.rating) {
            case 's':
                type = 'Safe'
                break;
            case 'e':
                type = 'Explicit'
                break;
            case 'q':
                type = 'Ero'
                break;
            default:
                type = 'unrated'    
                break;
        }
                
        let tags = imagem.tags.split(" ")
        tags.push("Yande.re")
        tags.push(type)
        tags.push("w" + imagem.width)
        tags.push("h" + imagem.height)
        
        let tagsValidas = await pesquisarTagsValidasDatabase(tags)
        //console.log(tagsValidas.data.has_tag_invalida, " tagsValidas");

        if( ! tagsValidas.data.has_tag_invalida){
            let imagemSearch = {
                url: imagem.file_url,
                post: `https://yande.re/post/show/${imagem.id}`
            }    
            let existeUrl = await pesquisarImagemDatabase(imagemSearch)
            //console.log(existeUrl.data.idimagem, " existeUrl");
            if( ! existeUrl.data.idimagem){    
                let buffer = await Reddit.getBufferImageByURL(imagem.file_url);
                //console.log(buffer);
                if(buffer && buffer.fileBuffer){
                    let hashsum = Reddit.getHashSumFromBuffer(buffer.fileBuffer)
                    try {
                        //console.log(hashsum);
                        let response2 = await axios.get("http://localhost:6962/add", {data:{
                            imagem:{
                                url: imagem.file_url,
                                post: `https://yande.re/post/show/${imagem.id}`,
                                width: imagem.width,
                                height: imagem.height,
                                hashsum: hashsum
                            },
                            tags: tags
                        } })
                        
                        console.log("ID: ", response2.data.imagem.idimagem, "URL: ", response2.data.imagem.url);    
                    } catch (error) {
                        console.log( error);
                    }
                    
                }
            }
        } 
    } catch (error) {
        console.log( error, " ERROR");    
    } finally {
        return await pesquisarImagem(data)
    }

}

async function pesquisarImagens(tags, page){
    let str_tags = ""
    if(tags){
        str_tags = `&tags=${tags}`
    }
    let url = `https://yande.re/post.json?limit=1000&page=${page}${str_tags}`
    console.log(" ");
    console.log( url, "URL Pesquisado");
    console.log(" ");
    const response = await axios.get(url)
    if(response.data.length == 0 ){
        return false
    }

    await pesquisarImagem(response.data)
    return pesquisarImagens(tags, page+1)
}

async function pesquisarImagemDatabase(imagemSearch){
   return await axios.get("http://localhost:6962/find", {data:{
        imagem:imagemSearch
    } })
}

async function pesquisarTagsValidasDatabase(tags){
    return await axios.get("http://localhost:6962/validatetags", {data:{
        tags:tags
    } })
}

main();



/**
const { default: axios } = require("axios");
const Reddit  = require("./js/download_posts_reddit");
const Jobs = require('./js/schedule');
require('dotenv/config');
async function main(params) {
    let tags = 'blue_archive'
    let page = '1'
    let url = `https://yande.re/post.json?limit=10000&page=${page}&tags=${tags}`
    const response = await axios.get(url)

    for (const imagem of response.data) {
        let type = ''
        switch (imagem.rating) {
            case 's':
                type = 'Safe'
                break;
            case 'e':
                type = 'Explicit'
                break;
            case 'q':
                type = 'Ero'
                break;
            default:
                type = 'unrated'    
                break;
        }
        
        let tags = imagem.tags.split(" ")
        tags.push("Yande.re")
        tags.push(type)
        tags.push("w" + imagem.width)
        tags.push("h" + imagem.height)
        
        if( ! possuiTagsInvalidas(tags)){

        
            let buffer = await Reddit.getBufferImageByURL(imagem.file_url);
            if(buffer && buffer.fileBuffer){
                let hashsum = Reddit.getHashSumFromBuffer(buffer.fileBuffer)
    
                let response2 = axios.get("http://localhost:6962/add", {data:{
                    imagem:{
                        url: imagem.file_url,
                        post: `https://yande.re/post/show/${imagem.id}`,
                        width: imagem.width,
                        height: imagem.height,
                        hashsum: hashsum
                    },
                    tags: tags
                } })
                try {
                    console.log((await response2).data.imagem);    
                } catch (error) {
                    
                }
                
            }
        } else{
            console.log(" Tag invalida: ", imagem.file_url);
        }
    }

    
}

function possuiTagsInvalidas(tags){
        const TAGS_INVALIDAS = process.env.TAGS_INVALIDAS.split(", ")
        let containsAny = false;
    
        if( tags){
            for (const element of tags) {
                if (TAGS_INVALIDAS.includes(element)) {
                    containsAny = true;
                    break;
                }
            }    
        }
        return containsAny
    
}

main();

*/