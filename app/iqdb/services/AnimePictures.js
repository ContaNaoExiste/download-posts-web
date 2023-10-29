const { default: axios } = require("axios")
const { getHashsumByUrl, getServiceURL } = require("./Service")

async function getTags(source){
    let id= source.href.split("/").pop()
    let request= await axios.get(`https://anime-pictures.net/api/v3/posts/${id}`)
    let animepictures = request.data
    let tags = []
    if(animepictures.tags){
        for (const tag of animepictures.tags) {
            tags.push(tag.tag.tag)
        }
        return tags
    }
    return null
}

async function getImagem(iqdb_best, url_ori){
    const fixedHref = iqdb_best.sources[0].fixedHref

    let hash = iqdb_best.thumbnail.src.split("/").pop().split(".")[0]
    let hash_1= hash.substring(0, 3)
    let extensao=  iqdb_best.thumbnail.src.split("/").pop().split(".")[1]
    let file_url = `https://images.anime-pictures.net/${hash_1}/${hash}.${extensao}`
    
    file_url = await getServiceURL(file_url, url_ori)
    return {
        url: file_url,
        width: iqdb_best.width,
        height: iqdb_best.height,
        post: fixedHref,
        hashsum: await getHashsumByUrl(file_url)
    }
}


function service(service){
    return "Anime-Pictures"
}

module.exports = {
    getTags,
    getImagem,
    service
}