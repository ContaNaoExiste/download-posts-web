const { default: axios } = require("axios")
const express = require("express")
const router = express.Router()

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
        const response = await axios.get(botUrl + "/imagens/" + page, {params: {'input-search': input_search}})
    
        const imagens = response.data
        const pagination = []
        const pages = ((imagens.total - imagens.total % 50) / 50) + 1
        for (let index = 0; index < pages; index++) {
            pagination.push(index + 1)
        }
        const baseurl = "/bd/imagens/"
        const hrefquery = "?input-search="+ input_search
        res.render("bd/imagens.html", {APP_ICON, APP_NAME, imagens, pagination, page, input_search, baseurl, hrefquery})
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
        res.render("bd/imagem-data.html", {APP_ICON, APP_NAME, imagem})
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
        const APP_NAME  = process.env.APP_NAME
        const APP_ICON  = process.env.APP_ICON
        const botUrl = process.env.URL_BOT

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
        const baseurl = "/bd/bd-tag/imagens/" + idtag + "/"
        const hrefquery = ""
        res.render("bd/tags-imagens.html", {APP_ICON, APP_NAME, imagens, pagination, page, baseurl, hrefquery})
    } catch (error) {
        console.error(error)
        res.render("error.html")
    }
})

module.exports = {
    router
}