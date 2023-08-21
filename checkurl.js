const request = require('request').defaults({ encoding: null });

async function main() {
    let url = "https://www.reddit.com/r/animearmpits/about.json"
    retorno = await checkIfURLExist(url)
    console.log(retorno);
}


async function checkIfURLExist(url){
    let retorno = null;
    await new Promise(function (resolve, reject) {
        request.get(url, {headers:{"cookie": process.env.REDDIT_COOKIE, "User-Agent": "PostmanRuntime/7.32.2"} }, function( error, response, body){
            console.log(JSON.parse(Buffer.from(body).toString()));
            resolve(response.statusCode == 200)
        });
    }).then((data => {
        retorno = data
    }));
    return retorno
}

main()