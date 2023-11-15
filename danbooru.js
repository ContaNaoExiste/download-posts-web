const { default: axios } = require("axios");
const Reddit  = require("./js/download_posts_reddit");
const Jobs = require('./js/schedule');

async function main(params) {
    let tags = 'anal_fluid'
    let page = '5'
    let url = `https://danbooru.donmai.us/posts.json?limit=200&page=${page}&tags=${tags}`

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
        
        let tags = imagem.tag_string.split(" ")
        tags.push("Danbooru")
        tags.push(type)
        tags.push("w" + imagem.image_width)
        tags.push("h" + imagem.image_height)
        
        let buffer = await Reddit.getBufferImageByURL(imagem.file_url);
        if(buffer && buffer.fileBuffer){
            let hashsum = Reddit.getHashSumFromBuffer(buffer.fileBuffer)

            let response2 = axios.get("http://localhost:6962/add", {data:{
                imagem:{
                    url: imagem.file_url,
                    post: `https://danbooru.donmai.us/posts/${imagem.id}`,
                    width: imagem.image_width,
                    height: imagem.image_height,
                    hashsum: hashsum
                },
                tags: tags
            } })
            try {
                console.log((await response2).data);    
            } catch (error) {
                
            }
            
        }
        
    }

    
}

main();

