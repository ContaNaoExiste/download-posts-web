const { default: axios } = require("axios")
const { getHashsumByUrl, getServiceURL } = require("./Service")

async function getTags(source){
    const url = `${source.fixedHref}.json?only=tag_string`
    let tags = null
    if(url){
        const response = await axios.get(url)
        const data = response.data
        tags = data.tag_string.split(" ")
    }
    return tags
}

async function getImagem(iqdb_best, url_ori){
    const fixedHref = iqdb_best.sources[0].fixedHref
    const url = `${fixedHref}.json?only=file_url`
    let file_url = ''
    if(url){
        const response = await axios.get(url)
        const data = response.data
        file_url = data.file_url
    }
    
    file_url = await getServiceURL(file_url, url_ori)

    return {
        url: file_url,
        width: iqdb_best.width,
        height: iqdb_best.height,
        post: fixedHref,
        hashsum: await getHashsumByUrl(file_url)
    }
}


function isService(service){
    return service() === service
}

function service(){
    return "Danbooru"
}

module.exports = {
    getTags,
    getImagem,
    isService,
    service
}