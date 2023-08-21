const { buffer } = require("assert-plus");
const IQDB  = require("./js/iqdb");
const request = require('request').defaults({ encoding: null });
const fs = require('fs');
const path = require("path");
const crypto = require("crypto");
var cmd=require('node-cmd');

async function main(){
    
    const result = await IQDB.search_iqdb("https://cdn.donmai.us/original/45/98/459883e20179f96241130e071c6156c5.png")
    console.log(JSON.stringify(result));
    /*let filepath = path.resolve("js", ".database", "reddit_tempfiles", "3_1539037339938435073.jpg")
    let filebuffer = fs.readFileSync(filepath)
    //console.log(filebuffer, filepath);
    await request.get(`http://localhost:6969/iqdb?file=${filepath}`, (error, response, body)=>{
        console.log(response.statusCode);
        if( ! error && response.statusCode == 200){

            console.log(JSON.parse(Buffer.from(body).toString()), " result ");
        }
    }) 
    console.log("Oloco");
/*
// YANDE.RE
    const result = await IQDB.search_iqdb("https://i.redd.it/v763nkbc1x5b1.jpg")
    if(result.results){
        result.results.forEach(element => {
            if( element.match == "best"){
                
                let hash = element.thumbnail.src.split("/").pop().split(".")[0]
                let id= element.sources[0].href.split("/").pop()
                let tags = element.thumbnail.tags.join(" ")
                let url_image = `https://files.yande.re/image/${hash}/yande.re ${id} ${tags}.jpg`
                console.log(url_image, " url_image");
            }
                
        });
    }*/
    /*
    //sankakucomplex
    const result = await IQDB.search_iqdb("https://iqdb.org/sankaku/b/6/2/b62ea69403dc8ccdc622a7d3b9765a4d.jpg")
    if(result.results){
        result.results.forEach(element => {
            if( element.match == "best"){
                console.log(element);
                console.log(element.thumbnail);
                let hash = element.thumbnail.src.split("/").pop().split(".")[0]
                let id= element.sources[0].href.split("/").pop()
                let tags = element.thumbnail.tags.join(" ")
                let url_image = `https://files.yande.re/image/${hash}/yande.re ${id} ${tags}.jpg`
                console.log(url_image, " url_image");
            }
                
        });
    }*/
/*
    //danbooru
    const result = await IQDB.search_iqdb("https://iqdb.org/thu/thu_b9c879bf.jpg")
    if(result.results){
        console.log("Elemento 0: ", result.results[0].thumbnail.tags);
        result.results.forEach(element => {

            if( element.match == "best"){
                console.log(element);
                console.log(element.thumbnail);
                let hash = element.thumbnail.src.split("/").pop().split(".")[0]
                let hash_1= hash.substring(0, 2)
                let hash_2= hash.substring(2, 4)
                let extensao = 'png'
                let url_image = `https://cdn.donmai.us/original/${hash_1}/${hash_2}/${hash}.${extensao}`
                console.log(url_image, " url_image");
            }
                
        });
    }
    */
/*
    //konachan
    const result = await IQDB.search_iqdb("https://konachan.com/sample/a89e5a7d20ab5bc4dd96c26095875f2f/Konachan.com%20-%20358286%20sample.jpg")
    if(result.results){
        result.results.forEach(element => {
            if( element.match == "best"){
                console.log(element);
                console.log(element.thumbnail);
                let id= element.sources[0].href.split("/").pop()
                let hash = element.thumbnail.src.split("/").pop().split(".")[0]
                let extensao = 'jpg'
                let url_image = `https://konachan.com/sample/${hash}/Konachan.com - ${id} sample.${extensao}`
                console.log(url_image, " url_image");
            }
                
        });
    }*/
    
    
    //anime picture
    /*const result = await IQDB.search_iqdb("https://i.redd.it/tzdcin0xyy5a1.jpg")
    if(result.results){
        result.results.forEach(element => {
            if( element.match == "best"){
                console.log(element);
                console.log(element.thumbnail);
                let hash = element.thumbnail.src.split("/").pop().split(".")[0]
                let hash_1= hash.substring(0, 3)
                let extensao = "jpg"
                let url_image = `https://images.anime-pictures.net/${hash_1}/${hash}.${extensao}`
                //`https://konachan.com/sample/${hash}/Konachan.com - ${id} sample.${extensao}`
                console.log(url_image, " url_image");
            }
                
        });
    }*/
    //fs.readFileSync(path.resolve("t3_14f1ond.jpg"))
    
    /*console.log(getHashSumFromFile(path.resolve("t3_14f1ond.jpg")) );

    console.log(getHashSumFromFile(path.resolve("t3_14ez3zk 2.jpg")) );*/

    //"21-06-2023 - Copia"
    /*INPUT_path_to_your_images = path.resolve("js", ".database", "reddit_files", "full")
    const OUTPUT_path = path.resolve("js", ".database", "reddit_files", "compress") + "\\";
    let pastas = fs.readdirSync(INPUT_path_to_your_images, {withFileTypes: true});
    pastas.forEach(pasta => {  
        if( pasta.name == "animearmpits")     {
            let arquivos = fs.readdirSync( path.resolve(INPUT_path_to_your_images, pasta.name), {withFileTypes: true});
            arquivos.forEach(arquivo => {
                let path_in = path.resolve(INPUT_path_to_your_images, pasta.name) + arquivo.name
                let path_out = path.resolve(OUTPUT_path, pasta.name) + arquivo.name
                let command =  `..\\node_modules\\mozjpeg\\vendor\\cjpeg.exe  -outfile ${path_out} ${path_in}` 
                console.log(command);
                cmd.runSync(command)
                //console.log(arquivo);
            });
        }
    });*/
/* INPUT_path_to_your_images = path.resolve("js", ".database", "reddit_files", "full", "\**") + path.sep + "*.{jpg,JPG,jpeg,JPEG,png,svg,gif}";
const OUTPUT_path = path.resolve("js", ".database", "reddit_files", "compress") + "\\";
const compression = 60
    console.log(INPUT_path_to_your_images);
compressImages(INPUT_path_to_your_images, OUTPUT_path, { compress_force: true, statistic: true, autoupdate: true }, false,
    { jpg: { engine: "mozjpeg", command: ["-quality", compression] } },
    { png: { engine: "pngquant", command: ["--quality=" + compression + "-" + compression, "-o"] } },
    { svg: { engine: "svgo", command: "--multipass" } },
    { gif: { engine: "gifsicle", command: ["--colors", "64", "--use-col=web"] } },
    async function (error, completed, statistic) {
        console.log("-------------")
        console.log(error)
        console.log(completed)
        console.log(statistic)
        console.log("-------------")

    }
)*/
    //https://images.anime-pictures.net/79e/79e599eee2f93efdb4531a06207e5703.jpg

/*
//sankakucomplex
const result = await IQDB.search_iqdb("https://s.sankakucomplex.com/data/18/03/1803db4cc72a19f5b5c282d736bd4b8c.png?e=1687356746&m=WNhi9vX_oo_jkLWfHSoCUQ")
if(result.results){
    result.results.forEach(element => {
        console.log(element);
        console.log(element.thumbnail);
        if( element.match == "additional"){
            //console.log(element);
            //console.log(element.thumbnail);
            let hash = element.thumbnail.src.split("/").pop().split(".")[0]
            let hash_1= hash.substring(0, 2)
            let hash_2= hash.substring(2, 4)
            let extensao = "jpg"
            let url_image = `https://s.sankakucomplex.com/data/${hash_1}/${hash_2}/${hash}.${extensao}?e=&m=`
            //`https://konachan.com/sample/${hash}/Konachan.com - ${id} sample.${extensao}`
            console.log(url_image, " url_image");
        }
            
    });
}*/
/*
const result = await IQDB.search_iqdb("https://b.thumbs.redditmedia.com/OmjhUcROPUGO5nQFJ03ZOJLoip4FpkFO_PCK6ctMiUs.jpg")
    if(result.results){
        result.results.forEach(element => {
            if( element.match == "best"){
                console.log(element);
                console.log(element.thumbnail);
                let hash = element.thumbnail.src.split("/").pop().split(".")[0]
                let hash_1= hash.substring(0, 3)
                let extensao = "jpg"
                let url_image = `https://images.anime-pictures.net/${hash_1}/${hash}.${extensao}`
                //`https://konachan.com/sample/${hash}/Konachan.com - ${id} sample.${extensao}`
                console.log(url_image, " url_image");
            }
                
        });
    }
*/
    /*const TAGS_INVALIDAS = ['futanari', 'futa with futa', 'futa_with_male', 'video', 'otoko_no_ko', 'sex', 'paizuri']
    const TAGS_INVALIDAS_STR = TAGS_INVALIDAS.join(",")
    const tags = ",1girl,animal_ears,animal_print,areola_slip,bare_shoulders,bell,blunt_bangs,blush,breasts,bridal_gauntlets,brown_collar,cleavage,collar,commentary_request,cow_ears,cow_girl,cow_print,cow_tail,grin,hand_up,heart,huge_breasts,looking_at_viewer,marota,marota_(character),mole,mole_under_eye,navel,neck_bell,original,parted_lips,red_background,red_eyes,sideboob,simple_background,smile,solo,tail,thighhighs,thighs,twitter_username,two_side_up,v,virtual_youtuber,white_hair".split(",")
    */
    /*
    tags.forEach(element =>{
        TAGS_INVALIDAS.forEach(tag_inv => {
            if(tag_inv.toLowerCase() == element.toLowerCase()){
                console.log("Encontrou: ", element);
            }
        });
    })*/
    
    /*if(TAGS_INVALIDAS.find( element => tags.join("").includes(element))){
        console.log("Encontrou: ");
    }*/
    /*TAGS_INVALIDAS.forEach(tag_inv => {
        if(tag_inv.toLowerCase() == element.toLowerCase()){
            console.log("Encontrou: ", element);
        }
    });
    
*/
    //console.log(TAGS_INVALIDAS_STR);
    //console.log(tags);
    /*
    let fileBuffer = await getBufferImage("https://konachan.com/sample/a89e5a7d20ab5bc4dd96c26095875f2f/Konachan.com%20-%20358286%20sample.png")
    console.log(fileBuffer);
    if(  ! fileBuffer ){
        fileBuffer = await getBufferImage("https://konachan.com/sample/a89e5a7d20ab5bc4dd96c26095875f2f/Konachan.com%20-%20358286%20sample.jpg")
    }
    console.log(fileBuffer);*/
/*
    let url = "https://cdn.donmai.us/original/dc/ad/dcad013658b3236f5da9db80642c8c48.jpg"

    await new Promise(function (resolve, reject) {
        danbooru_cookie = "_danbooru2_session=1HKa5bP5W%2Fqwpwp5U4JWHZFm8NYQenyXkW7nLybGhqQHKN%2FNNNhFNLW%2BTVrsP6cL9CSpFV3ggg1x5tTRBDl2AhaV0Giv%2Fd6A%2FiqiyYdQu2Tg%2BLEB6X0vZMGqfarh1SXPiwl%2FmZ%2FNQ3atim2mTJuNpu0CCZiy%2FdMyoTTXDXUhocOyjrKyrzQU4e28Il8c%2BEMMgcHyKB9zER1lsn9PDm8Sr75vtf%2B%2BmrC3vpn1AbaWr4jIPzPs4ywb8F%2F9O0D17RK%2FyVqk%2BagiIdC1b2UMay5VpOj510VZ%2FHZu93t94etTx9487uql86fkxmH6%2Bx10yP1tbbJN5Kby%2ByozfTtgsogaMO0JFDjscWyZBWS2SfRqdBQxI0wEgBHVu%2F4NfdJXiOpmntZkDg%3D%3D--N%2BEq8J8QHcV3EFvh--fd%2BgUUz4wkq603fa3jTLyg%3D%3D"
        request.get(url, {headers:{"cookie": process.env.REDDIT_COOKIE, "User-Agent": "PostmanRuntime/7.32.2"} }, function( error, response, body){

            if (!error && response.statusCode == 200) {
                console.log(Buffer.from(body));
            }
            console.log(" v ss", error, response.statusCode, Buffer.from(body).toString('utf8'))
        });
    });*/
    
    //console.log( result);
}

/** 
 * Gera o HashSum apartir de um arquivo.
*/
function getHashSumFromFile( path ){
    const fileBuffer = fs.readFileSync(path);
    const hashSum = crypto.createHash('sha256');
    hashSum.update(fileBuffer);

    return hashSum.digest('hex');
}

async function getBufferImage(url){
    let retorno = null;
    await new Promise(function (resolve, reject) {
        request.get(url, {headers:{"cookie": process.env.REDDIT_COOKIE, "User-Agent": "PostmanRuntime/7.32.2"} }, function( error, response, body){
            if (!error && response.statusCode == 200) {
                retorno = Buffer.from(body);
            }
            resolve(retorno)
        });
    }).then((data => {
        retorno = data
    }));
    return retorno
}

main()