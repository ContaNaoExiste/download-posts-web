const { default: axios } = require("axios")
const { getHashsumByUrl, getServiceURL } = require("./Service")

async function getTags(source){
    const fixedHref = source.fixedHref
    let request= await axios.get(fixedHref + "?json", {headers:{"Cookie": process.env.ZEROCHAN_COOKIE, "User-Agent": process.env.ZEROCHAN_USER_AGENT}})
    let zerochan = request.data
    if(zerochan.tags){
        return zerochan.tags
    }
    return null
}

async function getImagem(iqdb_best, url_ori){
    const fixedHref = iqdb_best.sources[0].fixedHref
    let request= await axios.get(fixedHref + "?json", {headers:{"Cookie": process.env.ZEROCHAN_COOKIE, "User-Agent": process.env.ZEROCHAN_USER_AGENT}})
    let zerochan = request.data
    let file_url = url_ori
    if( zerochan && zerochan.full )
        file_url = zerochan.full

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
    return "Zerochan"
}

module.exports = {
    getTags,
    getImagem,
    service
}