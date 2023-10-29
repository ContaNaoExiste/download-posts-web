const { default: axios } = require("axios")
const { getHashsumByUrl, getServiceURL } = require("./Service")

function getTags(source){
    return null
}

async function getImagem(iqdb_best, url_ori){
    fixedHref = iqdb_best.sources[0].fixedHref

    let post = iqdb_best.sources[0].fixedHref
    post = post.split("/").pop()
    request = await axios(
        `https://capi-v2.sankakucomplex.com/posts/keyset?limit=40&tags=id_range:${post}`
    )
    sankakucomplex = request.data
    let file_url = null
    if( sankakucomplex && sankakucomplex.data )
        file_url = sankakucomplex.data[0].file_url
    else
        file_url = url_ori
    
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
    return "Sankaku Channel"
}

module.exports = {
    getTags,
    getImagem,
    service
}