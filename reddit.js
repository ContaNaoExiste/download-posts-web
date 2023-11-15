const Reddit  = require("./js/download_posts_reddit");
const Jobs = require('./js/schedule');

async function main(params) {
    console.log('Rodou a consulta!', new Date().toLocaleTimeString("pt-BR"));
    //CedehsHentai
    let reddits = ['onoff_hentai']
    for (const reddit of reddits.reverse()) {
        console.log(reddit, " reddit");
        await Reddit.buscarPostsReddit(reddit).then(()=>{ }).finally(() => {
            console.log('Terminou a execução ', new Date().toLocaleTimeString("pt-BR"))
        })    
    }
    
}

main();