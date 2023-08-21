const { default: axios } = require("axios")
const express = require("express")
const router = express.Router()

router.get("/logs", async (req, res) => {
    const APP_NAME  = process.env.APP_NAME
    const APP_ICON  = process.env.APP_ICON
    try {
        res.render("reddit/logs.html", {APP_ICON, APP_NAME})
    } catch (error) {
        console.error(error)
        res.render("error.html")
    }
})

router.get("/config", async (req, res) => {
    const APP_NAME  = process.env.APP_NAME
    const APP_ICON  = process.env.APP_ICON
    try {
        res.render("reddit/configuracao.html", {APP_ICON, APP_NAME})
    } catch (error) {
        console.error(error)
        res.render("error.html")
    }
})

router.get("/reddits", async (req, res) => {
    res.redirect("/reddit/reddits/1")
})

router.get("/reddits/:page", async (req, res) => {
    try {
        const APP_NAME  = process.env.APP_NAME
        const APP_ICON  = process.env.APP_ICON
        const botUrl = process.env.URL_BOT

        const page = req.params.page
        const input_search = req.query['input-search'] ? req.query['input-search'] : ''
        const response = await axios.get(botUrl + "/reddit/" + page, {params: {'input-search': input_search}})

        const reddit = response.data

        const pagination = []
        const pages = ((reddit.total - reddit.total % 50) / 50) + 1
        for (let index = 0; index < pages; index++) {
            pagination.push(index + 1)
        }
        const baseurl = "/reddit/reddits/"
        const hrefquery = "?input-search="+ input_search
        res.render("reddit/reddit.html", {APP_ICON, APP_NAME, reddit, pagination, page, input_search, baseurl, hrefquery})
    } catch (error) {
        console.error(error)
        res.render("error.html")
    }
})


router.get("/posts", async (req, res) => {
    res.redirect("/reddit/posts/1")
})

router.get("/posts/:page", async (req, res) => {
    try {
        const APP_NAME  = process.env.APP_NAME
        const APP_ICON  = process.env.APP_ICON
        const botUrl = process.env.URL_BOT

        const page = req.params.page
        const input_search = req.query['input-search'] ? req.query['input-search'] : ''
        const response = await axios.get(botUrl + "/posts/" + page, {params: {'input-search': input_search}})

        const reddit = response.data

        const pagination = []
        const pages = ((reddit.total - reddit.total % 50) / 50) + 1
        for (let index = 0; index < pages; index++) {
            pagination.push(index + 1)
        }
        const baseurl = "/reddit/posts/"
        const hrefquery = "?input-search="+ input_search
        res.render("reddit/posts.html", {APP_ICON, APP_NAME, reddit, pagination, page, input_search, baseurl, hrefquery})
    } catch (error) {
        console.error(error)
        res.render("error.html")
    }
})

router.get("/about/json", async (req, res) => {
    try {
        const url = req.query["url"]
        const response = await axios.get(url, {headers:{"cookie": process.env.REDDIT_COOKIE, "User-Agent": process.env.REDDIT_USER_AGENT}})
        const reddit = response.data
        res.send(reddit)
    } catch (error) {
        console.error(error)
        res.render("error.html")
    }
})

router.get("/posts/:subreddit/:page", async (req, res) => {
    try {
        const APP_NAME  = process.env.APP_NAME
        const APP_ICON  = process.env.APP_ICON
        const botUrl = process.env.URL_BOT

        const page = req.params.page
        const subreddit = req.params.subreddit
        const input_search = req.query['input-search'] ? req.query['input-search'] : ''
        const response = await axios.get(botUrl + "/reddit/posts/" + subreddit + "/" + page, {params: {'input-search': input_search}})

        const reddit = response.data

        const pagination = []
        const pages = ((reddit.total - reddit.total % 50) / 50) + 1
        for (let index = 0; index < pages; index++) {
            pagination.push(index + 1)
        }
        const baseurl = "/reddit/posts/" + subreddit + "/"
        const hrefquery = "?input-search="+ input_search
        res.render("reddit/posts.html", {APP_ICON, APP_NAME, reddit, pagination, page, input_search, baseurl, hrefquery})
    } catch (error) {
        console.error(error)
        res.render("error.html")
    }
})


module.exports = {
    router
}