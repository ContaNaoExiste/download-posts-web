const Mysql = require("./connection/mysql")

async function saveTag(tag){
    if( tag && tag.tag){
        
        return await Mysql.insertFromJson("iqdb_tag", {tag: tag.tag})
    }
    return null
}

async function savePostReddit(post){
    if( post && post.subreddit && post.url){        
        return await Mysql.insertFromJson("post_reddit", {subreddit : post.subreddit, url : post.url, created: post.created, name: post.name, subreddit_id: post.subreddit_id, post_id: post.id})
    }
    return null
}

module.exports = {
    saveTag,
    savePostReddit
}
