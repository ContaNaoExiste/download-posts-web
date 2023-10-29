const Reddit  = require("./js/download_posts_reddit");
const Jobs = require('./js/schedule');

async function main(params) {
    console.log('Rodou a consulta!', new Date().toLocaleTimeString("pt-BR"));
    //CedehsHentai
    let reddits = [/*'2B_Hentai_', '2B_', '2BNieR',*/
'2bhentai2', '2Bx9S', 'NierAutomataGallery']
    for (const reddit of reddits.reverse()) {
        console.log(reddit, " reddit");
        await Reddit.buscarPostsReddit(reddit).then(()=>{ }).finally(() => {
            console.log('Terminou a execução ', new Date().toLocaleTimeString("pt-BR"))
        })    
    }
    
}

main();