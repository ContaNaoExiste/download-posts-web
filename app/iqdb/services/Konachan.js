const { default: axios } = require("axios")
const { getHashsumByUrl, getServiceURL } = require("./Service")

async function getTags(source){
    try {
        let request = await axios.get(source.fixedHref)
        let data = request.data
        let json = data.split(`<script type="text/javascript"> Post.register_resp(`)[1].split(`); </script>`)[0]
        json = JSON.parse(json)
        if( json && json.posts){
            return json.posts[0].tags.split(" ")
        }    
    } catch (error) {
        
    }
    

    return null
}

async function getImagem(iqdb_best, url_ori){
    let fixedHref = iqdb_best.sources[0].fixedHref
    let file_url = ""
    try {
        let request = await axios.get(fixedHref)
        let data = request.data
        let json = data.split(`<script type="text/javascript"> Post.register_resp(`)[1].split(`); </script>`)[0]
        json = JSON.parse(json)
        if( json && json.posts){
            file_url = json.posts[0].file_url
        }    
    } catch (error) {
        let id= iqdb_best.sources[0].href.split("/").pop()
        let hash = iqdb_best.thumbnail.src.split("/").pop().split(".")[0]
        let extensao=  iqdb_best.thumbnail.src.split("/").pop().split(".")[1]
        file_url = `https://konachan.com/sample/${hash}/Konachan.com - ${id} sample.${extensao}`
        file_url = await getServiceURL(file_url, url_ori)
        if( file_url == url_ori){
            file_url = `https://konachan.com/jpeg/${hash}/Konachan.com - ${id} sample.${extensao}`
            file_url = await getServiceURL(file_url, url_ori)
        }

        if( file_url == url_ori){
            file_url = `https://konachan.com/image/${hash}/Konachan.com - ${id} image.${extensao}`
            file_url = await getServiceURL(file_url, url_ori)
        }
    }

    
    return {
        url: file_url,
        width: iqdb_best.width,
        height: iqdb_best.height,
        post: fixedHref,
        hashsum: await getHashsumByUrl(file_url)
    }
}


function service(service){
    return "Konachan"
}

module.exports = {
    getTags,
    getImagem,
    service
}