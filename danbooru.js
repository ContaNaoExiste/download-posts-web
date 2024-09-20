const { default: axios } = require("axios");
const Reddit  = require("./js/download_posts_reddit");
const Jobs = require('./js/schedule');

async function main(params) {
    let tags = 'spread_anus' //'after_sex' //
    let page = 15//3
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
        
        let tags = imagem.tag_string.split(" ")
        tags.push("Danbooru")
        tags.push(type)
        tags.push("w" + imagem.image_width)
        tags.push("h" + imagem.image_height)
        
        let tagsValidas = await pesquisarTagsValidasDatabase(tags)
        ///console.log(tagsValidas.data.has_tag_invalida, " tagsValidas");
        if( ! tagsValidas.data.has_tag_invalida){
            let imagemSearch = {
                url: imagem.file_url,
                post: `https://danbooru.donmai.us/posts/${imagem.id}`
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
                                post: `https://danbooru.donmai.us/posts/${imagem.id}`,
                                width: imagem.image_width,
                                height: imagem.image_height,
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
    let url = `https://danbooru.donmai.us/posts.json?limit=1000&page=${page}&tags=${tags}`
    console.log(" ");
    console.log( url, "URL Pesquisado");
    console.log(" ");
    const response = await axios.get(url)
    if(response.data.length == 0 ){
        return false
    }

    await pesquisarImagem(response.data)
    /*for (const imagem of response.data) {
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
            
            let tags = imagem.tag_string.split(" ")
            tags.push("Danbooru")
            tags.push(type)
            tags.push("w" + imagem.image_width)
            tags.push("h" + imagem.image_height)
            
            let tagsValidas = await pesquisarTagsValidasDatabase(tags)
            if( ! tagsValidas.data.has_tag_invalida){
                let imagemSearch = {
                    url: imagem.file_url,
                    post: `https://danbooru.donmai.us/posts/${imagem.id}`
                }    
                let existeUrl = await pesquisarImagemDatabase(imagemSearch)

                if( ! existeUrl.data.idimagem){    
                    let buffer = await Reddit.getBufferImageByURL(imagem.file_url);
                    if(buffer && buffer.fileBuffer){
                        let hashsum = Reddit.getHashSumFromBuffer(buffer.fileBuffer)
                        try {
                            let response2 = await axios.get("http://localhost:6962/add", {data:{
                                imagem:{
                                    url: imagem.file_url,
                                    post: `https://danbooru.donmai.us/posts/${imagem.id}`,
                                    width: imagem.image_width,
                                    height: imagem.image_height,
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
        }
    }*/

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

