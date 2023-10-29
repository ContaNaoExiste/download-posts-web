const { default: axios } = require("axios")
const { getHashsumByUrl, getServiceURL } = require("./Service")

async function getTags(source){
    try {
        let response = await axios.get(source.fixedHref)
        let data = response.data
        let tags = data.split(` class="quicktag">`)[1].split(`                    </dd>`)[0].split(`<span class='tag'>"<a href="/tags/`)
        let tags_final = []
        for (const tag of tags) {
            try {
                let new_tag = tag.split(`">`)[1].split("</a>")[0]
                tags_final.push(new_tag)    
            } catch (error) {}
        }
        return tags_final;
    } catch (error) {
        
    }
    return null
}

async function getImagem(iqdb_best, url_ori){
    let fixedHref = iqdb_best.sources[0].fixedHref
    let file_url = url_ori
    try {
        let response = await axios.get(fixedHref)
        let data = response.data
        file_url = "https://e-shuushuu.net/" + data.split(`<a class="thumb_image" href="/`)[1].split(`" target="_blank">`)[0]  
        file_url = await getServiceURL(file_url, url_ori)
    } catch (error) {
        file_url = url_ori
    }
    
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
    return "e-shuushuu"
}

module.exports = {
    getTags,
    getImagem,
    isService,
    service
}