const { default: axios } = require("axios")
const fs = require('fs');
const crypto = require("crypto");

async function getHashsumByUrl(url){
    if( ! url )
        return null
    const fileBuffer = await getBufferImage(url)
    if( fileBuffer){
        //fs.writeFileSync(url.split("/").pop(), fileBuffer)
        const hashSum = crypto.createHash('sha256');
        hashSum.update(fileBuffer);
        return hashSum.digest('hex');
    }
    return null
}

async function getBufferImage(url){
    try {
        const response = await axios.get(url, {responseType:"arraybuffer"})
        const data = await response.data
        return data    
    } catch (error) {
        return null
    }
}


async function axiosHead(file_url){
    try {
        let result = await axios.head(file_url, {responseType:"arraybuffer"})
        return result.status == 200    
    } catch (error) {
        return false
    }
}
function getExtension(filename) {
    if( ! filename)
        return null
    let pathname = filename 
    try {
        pathname = new URL(filename).pathname
    } catch (error) {
        
    }
    let extensao = pathname.split('.').pop().split("?").shift()
    return  extensao ? extensao : "jpg";
}

function getTags(){
    null
}

function service(){
    return "default"
}

async function getImagem(iqdb_best, file_url){
    const fixedHref = iqdb_best.sources[0].fixedHref
    return {
        url: file_url,
        width: iqdb_best.width,
        height: iqdb_best.height,
        post: fixedHref,
        hashsum: await getHashsumByUrl(file_url)
    }
}

async function getServiceURL(file_url, url_ori){
    try {
        if(await axiosHead(file_url)){
           return file_url
        }
        let extensao = getExtension(file_url)
        file_url = file_url.replace(extensao, (extensao === "png") ? "jpg" : "png")
        if(await axiosHead(file_url)){
            return file_url
        }
        extensao = getExtension(file_url)
        file_url = file_url.replace(extensao, "jpeg")
        if(await axiosHead(file_url)){
            return file_url
        }
        
    } catch (error) {}
    return url_ori
}

module.exports = {
    getHashsumByUrl,
    getTags,
    getImagem,
    service,
    axiosHead,
    getServiceURL
}