const { default: axios } = require("axios")
const { getHashsumByUrl, getServiceURL } = require("./Service")

async function getTags(source){
    let tags = null
    fixedHref = source.fixedHref
    const id = new URL(fixedHref).searchParams.get('id')
    const url = `https://gelbooru.com/index.php?page=dapi&s=post&id=${id}&json=1&q=index`
    if(url){
        const response = await axios.get(url)
        data = response.data
        if( data && data.post){
            try {
                tags = data.post[0].tags.split(" ")
            } catch (error) {
                
            }
        }
    }
    return tags
}

async function getImagem(iqdb_best, url_ori){
    const fixedHref = iqdb_best.sources[0].fixedHref
    const id = new URL(fixedHref).searchParams.get('id')
    const url = `https://gelbooru.com/index.php?page=dapi&s=post&id=${id}&json=1&q=index`
    let file_url = ''
    if(url){
        const response = await axios.get(url)
        data = response.data
        if( data && data.post){
            file_url = data.post[0].file_url
        }
        
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
    return "Gelbooru"
}

module.exports = {
    getTags,
    getImagem,
    isService,
    service
}