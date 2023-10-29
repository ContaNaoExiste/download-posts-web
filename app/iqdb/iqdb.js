const iqdb = require('@l2studio/iqdb-api');
const { default: axios } = require("axios")
const fs = require('fs');
const path = require('path');
const sharp = require("sharp");

const services = {}

async function getResize(url) {
    let img_sharp = sharp(url)

    const img_sharp2 = img_sharp.clone()
    try {
        await img_sharp2.jpeg()
        await img_sharp2.resize(null, 600)
        await img_sharp2.resize(600, null)
        return img_sharp2
    } catch (error) {
        console.log(error);
    }
}

function loadServices(){
    fs.readdirSync("./services").forEach(fnFile => {
        const fn = require("./services/" + fnFile)
        services[fn.service()] = fn
    })
}
loadServices()
async function search(url){
    if( ! url ){
        return null
    }

    let resized_buffer = null
    try {
        let buffer = await axios.get(url, {responseType: 'arraybuffer'})
        let resized = await getResize(buffer.data)
        resized_buffer = await resized.toBuffer()
    } catch (error) {
        resized_buffer = null
    }
    try {
        let data_ = null
        let input = (resized_buffer != null) ? resized_buffer : url
        let data = await iqdb.search(input)

        if( data.results){
            for (const match of data.results) {
                if (! data_ && (match.match == 'best' || match.similarity > 80)) {
                    if(data.results.length == 1 || await searchFixedHref(match)){
                        data_ = match
                    }    
                }
            }
        }else{
            data_ = null
        }
        return data_    
    } catch (error) {
        console.error( error);
    }
    
    return null;
}

async function searchFixedHref(match){
    try {
        const request = await axios.get(match.sources[0].fixedHref)
        return request.status == 200
    } catch (error) {}
    return false
}

async function searc_tags(iqdb_best){
    let tags = iqdb_best.thumbnail.tags
    let tags_aux = null
    const source = iqdb_best.sources[0]
    if(source.service){
        console.log( source.service);
        let service = services[source.service]
        if( ! service){
            service = services['default']
        }
        try {
            tags_aux = await service.getTags(source)
            if(tags_aux)
                tags =  tags_aux    
        } catch (error) { }
    }
    if( ! tags)
        tags = []
    
    tags.push(source.service)
    tags.push(iqdb_best.type)
    tags.push("w" + iqdb_best.width)
    tags.push("h" + iqdb_best.height)
    return tags
}

async function search_imagem(iqdb_best, url){
    
    if( iqdb_best && iqdb_best.sources){
        const source = iqdb_best.sources[0]
        let service = services[source.service]
        if( ! service){
            service = services['default']
        }
        return await service.getImagem(iqdb_best, url)
    }
    return {}
}

function has_tag_invalida(tags){
    const TAGS_INVALIDAS = process.env.TAGS_INVALIDAS.split(", ")
    let containsAny = false;

    if( tags){
        for (const element of tags) {
            if (TAGS_INVALIDAS.includes(element)) {
                containsAny = true;
                break;
            }
        }    
    }
    return containsAny
}

async function iqdb_info(data, params){
    let result = {}
    if( data && data.url){
        if(data.url_iqdb)
            result = await search(data.url_iqdb)
        else
            result = await search(data.url)
        if(! result){
            return {
                error: "Informações IQDB não encontrada",
                code: 404
            }
        }

        let tags = await searc_tags(result)
        if(params.verify_tags === "true" && has_tag_invalida(tags)){
            return {
                error: "Possui tag Inválida",
                code: 404,
                tags: tags
            }
        }
        let imagem = await search_imagem(result, data.url)
        if(data.idimagem){
            imagem.idimagem = data.idimagem
        }
        return {
            reddit: data,
            iqdb: result,
            imagem,
            tags
        }
    }
    return {
        error: "Url não informada",
        code: 404
    }
}

async function tags_info_by_post(data){
    let result = {}
    if( data && data.post){
        let tags = await searc_tags(result)
        console.log(tags);
    }
    /* if(data.url_iqdb)
            result = await search(data.url_iqdb)
        else
            result = await search(data.url)
        if(! result){
            return {
                error: "Informações IQDB não encontrada",
                code: 404
            }
        }

        let tags = await searc_tags(result)
        if(params.verify_tags === "true" && has_tag_invalida(tags)){
            return {
                error: "Possui tag Inválida",
                code: 404,
                tags: tags
            }
        }
        let imagem = await search_imagem(result, data.url)
        if(data.idimagem){
            imagem.idimagem = data.idimagem
        }
        return {
            reddit: data,
            iqdb: result,
            imagem,
            tags
        }
    }
    return {
        error: "Url não informada",
        code: 404
    }*/
}

module.exports = {
    iqdb_info,
    tags_info_by_post
}
