const { default: axios } = require("axios")
const express = require("express")
const router = express.Router()

const APP_NAME  = process.env.APP_NAME
const APP_ICON  = process.env.APP_ICON
const botUrl = process.env.URL_BOT

router.get("/imagens", async (req, res) => {
   res.redirect("/bd/imagens/1")
})

router.get("/imagens/:page", async (req, res) => {
   try {
        const APP_NAME  = process.env.APP_NAME
        const APP_ICON  = process.env.APP_ICON
        const botUrl = process.env.URL_BOT
        const page = req.params.page
        const input_search = req.query['input-search'] ? req.query['input-search'] : ''
        const input_filter = req.query['input-filter'] ? req.query['input-filter'] : ''
        const tags_filter = req.query['tags-filter'] ? req.query['tags-filter'] : ''
        const ex_tags_filter = req.query['ex-tags-filter'] ? req.query['ex-tags-filter'] : ''
        const resolucao = req.query['resolucao'] ? req.query['resolucao'] : ''
        
        
        console.log(req.query);

        const response = await axios.get(botUrl + "/imagens/" + page, {params: {'input-search': input_search, 'input-filter': input_filter, 'tags-filter': tags_filter, 'ex-tags-filter':ex_tags_filter, resolucao: resolucao}})
    
        const imagens = response.data
        const pagination = []
        const pages = ((imagens.total - imagens.total % 50) / 50) + 1
        for (let index = 0; index < pages; index++) {
            pagination.push(index + 1)
        }

        

        let hrefquery = '?'
        Object.entries(req.query).forEach(([key, value]) => {
            hrefquery +=  key + "=" + value + "&"
        });

        const baseurl = "/bd/imagens/"
        res.render("bd/imagens.html", {APP_ICON, APP_NAME, imagens, pagination, page, input_search, baseurl, hrefquery, input_filter, tags_filter, ex_tags_filter, resolucao})
    } catch (error) {
        console.error(error)
        res.render("error.html")
    }
})

router.get("/imagem/:idimage", async (req, res) => {
    try {
        const APP_NAME  = process.env.APP_NAME
        const APP_ICON  = process.env.APP_ICON
        const botUrl = process.env.URL_BOT
        const idimage = req.params.idimage
        const response = await axios.get(botUrl + "/imagem/" + idimage)
        const imagem = response.data
        if( ! imagem.idimagem){
            res.statusCode = 
            res.redirect("/404")
        }else{
            res.render("bd/imagem-data.html", {APP_ICON, APP_NAME, imagem})
        }
        
    } catch (error) {
        console.error(error)
        res.render("error.html")
    }
})

router.get("/bd-tags", async (req, res) => {
    res.redirect("/bd/bd-tags/1")
})

router.get("/bd-tags/:page", async (req, res) => {
    try {

        const page = req.params.page
        const input_search = req.query['input-search'] ? req.query['input-search'] : ''
        const response = await axios.get(botUrl + "/bd-tags/" + page, {params: {'input-search': input_search}})

        const tags = response.data
        const pagination = []
        const pages = ((tags.total - tags.total % 50) / 50) + 1
        for (let index = 0; index < pages; index++) {
            pagination.push(index + 1)
        }
        const baseurl = "/bd/bd-tags/"
        const hrefquery = "?input-search="+ input_search
        res.render("bd/bd-tags.html", {APP_ICON, APP_NAME, bd_tags : tags, pagination, page, input_search, baseurl, hrefquery})
    } catch (error) {
        console.error(error)
        res.render("error.html")
    }
})
router.get("/bd-tag/imagens/:idtag", async (req, res) => {
    res.redirect("/bd/bd-tag/imagens/" + req.params.idtag + "/1")
})

router.get("/bd-tag/imagens/:idtag/:page", async (req, res) => {
    try { 
        const APP_NAME  = process.env.APP_NAME
        const APP_ICON  = process.env.APP_ICON
        const botUrl = process.env.URL_BOT
        const idtag = req.params.idtag
        const page = req.params.page
        const response = await axios.get(botUrl + "/bd-tags/imagens/" + idtag + "/" + page)

        const imagens = response.data
        const pagination = []
        const pages = ((imagens.total - imagens.total % 50) / 50) + 1
        for (let index = 0; index < pages; index++) {
            pagination.push(index + 1)
        }
        if( ! imagens.tag) imagens.tag = {}
        const baseurl = "/bd/bd-tag/imagens/" + idtag + "/"
        const hrefquery = ""
        res.render("bd/tags-imagens.html", {APP_ICON, APP_NAME, imagens, pagination, page, baseurl, hrefquery})
    } catch (error) {
        console.error(error)
        res.render("error.html")
    }
})

router.get("/source/:idimage", async (req, res) => {
    try {
        const botUrl = process.env.URL_BOT
        const idimagem = req.params.idimage
        /*console.log( req.body);
        console.log( req.params);
        console.log( req.query);*/
        const response = await axios.get("http://localhost:6960/imagem", {data: req.query})
        if (response.status === 200) {
            res.sendStatus(200)
        }else{
            res.sendStatus(response.status)
        }
    } catch (error) {
        console.error(error)
        res.render("error.html")
    }
})

router.get("/resolucoes/:page", async (req, res) => {
    try {
        const APP_NAME  = process.env.APP_NAME
        const APP_ICON  = process.env.APP_ICON
        const botUrl = process.env.URL_BOT

        const page = req.params.page
        const input_search = req.query['input-search'] ? req.query['input-search'] : ''
        const tags_filter = req.query['tags-filter'] ? req.query['tags-filter'] : ''

        const response = await axios.get(botUrl + "/bd-resolucoes/" + page, {params: {'input-search': input_search, 'resolucao': 'true', 'tags-filter': tags_filter}})

        const imagens = response.data
        const pagination = []
        const pages = ((imagens.total - imagens.total % 50) / 50) + 1
        for (let index = 0; index < pages; index++) {
            pagination.push(index + 1)
        }
        const baseurl = "/bd/resolucoes/"
        const hrefquery = "?input-search="+ input_search
        console.log(tags_filter, " tags_filter");
        res.render("bd/resolucoes.html", {APP_ICON, APP_NAME, imagens, pagination, page, input_search, baseurl, tags_filter, hrefquery})
    } catch (error) {
        console.error(error)
        res.render("error.html")
    }
})


router.get("/upload", async (req, res) => {
    try {
        
        res.render("bd/upload.html", {APP_ICON, APP_NAME})
    } catch (error) {
        console.error(error)
        res.render("error.html")
    }
})


router.post("/upload", async (req, res) => {
    try {
        const response = await axios.post(botUrl + "/upload", req.body)
        const imagem = response.data
        if( imagem && imagem.idimagem){
            res.redirect("/bd/imagem/" + imagem.idimagem)
        }else{
            res.render("bd/upload.html", {APP_ICON, APP_NAME})
        }
        
    } catch (error) {
        console.error(error)
        res.render("error.html")
    }
})

router.get("/tags.json", async (req, res) => {
    try {
        
        const input_search = req.query['input-search'] ? req.query['input-search'] : ''
        const response = await axios.get(botUrl + "/bd-tags/" + 1, {params: {'input-search': input_search}})
        
        res.json(response.data)
    } catch (error) {
        console.error(error)
        res.json({})
    }
})


module.exports = {
    router
}