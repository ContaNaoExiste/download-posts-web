const { default: axios } = require("axios")
const { getHashsumByUrl, getServiceURL } = require("./Service")

async function getTags(source){
    try {
        let id= source.href.split("/").pop()
        let request = await axios.get(`https://yande.re/post.json?api_version=2&page=1&tags=id:${id}`)
        let data = request.data
        if( data.posts && data.posts[0] && data.posts[0].file_url)
            return data.posts[0].tags.split(" ")
    } catch (error) { }
    return null
}

async function getUrl(iqdb_best, url_ori){
    let file_url = url_ori
    let id= iqdb_best.sources[0].href.split("/").pop()
    try {
        let request = await axios.get(`https://yande.re/post.json?api_version=2&page=1&tags=id:${id}`)
        let data = request.data
        if( data.posts && data.posts[0] && data.posts[0].file_url)
            return data.posts[0].file_url
        else{
            let hash = iqdb_best.thumbnail.src.split("/").pop().split(".")[0]
            let extensao = iqdb_best.thumbnail.src.split("/").pop().split(".")[1]
            let tags = iqdb_best.thumbnail.tags.join(" ")
            file_url = `https://files.yande.re/image/${hash}/yande.re ${id} ${tags}.${extensao}`
            file_url = file_url.split(" ").join("%20")
            return await getServiceURL(file_url, url_ori)    
        }
    } catch (error) {
        let hash = iqdb_best.thumbnail.src.split("/").pop().split(".")[0]
        let extensao = iqdb_best.thumbnail.src.split("/").pop().split(".")[1]
        let tags = iqdb_best.thumbnail.tags.join(" ")
        file_url = `https://files.yande.re/image/${hash}/yande.re ${id} ${tags}.${extensao}`
        file_url = file_url.split(" ").join("%20")
        return await getServiceURL(file_url, url_ori)    
    }
}

async function getImagem(iqdb_best, url_ori){
    const fixedHref = iqdb_best.sources[0].fixedHref
    let file_url = await getUrl(iqdb_best, url_ori)
    console.log( file_url, " file_url");
    return {
        url: file_url,
        width: iqdb_best.width,
        height: iqdb_best.height,
        post: fixedHref,
        hashsum: await getHashsumByUrl(file_url)
    }
}


function service(){
    return "Yande.re"
}

module.exports = {
    getTags,
    getImagem,
    service
}