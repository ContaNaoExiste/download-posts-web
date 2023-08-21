const Reddit  = require("./js/download_posts_reddit");
const Jobs = require('./js/schedule');

function main(params) {
    console.log('Iniciou o serviço', (new Date().toLocaleDateString("pt-BR").split("/").join("-")));

    let data_now =  new Date();
    data_now = new Date(data_now.getTime() + 1 * 60 * 1000)
    const job_str = data_now.getMinutes() + " * * * *"

    Jobs.startJob(job_str, ()=>{
        console.log('Rodou a consulta!', new Date().toLocaleTimeString("pt-BR"));
        Reddit.buscarPostsReddit("new").then(()=>{ }).finally(() => {
            console.log('Terminou a execução ', new Date().toLocaleTimeString("pt-BR"))
            //Reddit.removeFilesDuplicate()

            let data_now =  new Date();
            data_now = new Date(data_now.getTime() + 1 * 60 * 1000)
            const job_str = data_now.getMinutes() + " * * * *"
            Jobs.reschedule( job_str )
        })
    })
}

main();