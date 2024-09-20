const iqdb = require('@l2studio/iqdb-api');
const { default: axios } = require("axios")
const fs = require('fs');
const path = require('path');
const sharp = require("sharp");

const services = {}


async function search(url){
    if( ! url ){
        return null
    }

    let resized_buffer = null
    try {
        let buffer = await axios.get(url, {responseType: 'arraybuffer'})
        let resized = await getResize(buffer.data)
        resized_buffer = await resized.toBuffer()

        console.log(resized_buffer, " resized_buffer");
    } catch (error) {
        resized_buffer = null
    }
    try {
       if(resized_buffer){
            fs.writeFileSync("teste.png", resized_buffer)

       }
    } catch (error) {
        console.error( error);
    }
    
    return null;
}

async function getResize(buffer) {
    let img_sharp = sharp(buffer)

    const img_sharp2 = img_sharp.clone()
    try {
        await img_sharp2.jpeg()
        await img_sharp2.resize(null, 1080)
        await img_sharp2.resize(1920, null)
        return img_sharp2
    } catch (error) {
        console.log(error);
    }
}

const path_wallpapers = `D:\\WallpaperAnimes`
const dest_path = `C:\\Users\\andre\\OneDrive\\Imagens\\WallpaperAnimes`
fs.readdir(path_wallpapers, async(err, files) => {
    for (let index = 0; index < files.length; index++) {
        const file = files[index];
        try {
                const buffer = fs.readFileSync(`${path_wallpapers}\\${file}`)
                let resized = await getResize(buffer)
                let resized_buffer = await resized.toBuffer()
                if(resized_buffer){
                    console.log(`${dest_path}\\${file}`);
                    fs.writeFileSync(`${dest_path}\\${file}`, resized_buffer)
               }    
           
        } catch (error) {
            console.log(error);
        }
    }
});

//search("https://cdn.donmai.us/original/44/60/446053c58452e13aaa4ae3c0b54ef15c.jpg")