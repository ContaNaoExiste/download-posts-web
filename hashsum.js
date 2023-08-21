const fs = require('fs');
const path = require("path");
const post = require('./js/download_posts_reddit');
const { func } = require('assert-plus');
const sizeOf = require('buffer-image-size');
const { mysqlInsertQuery, mysqlQuery } = require('./js/connection/mysql');
const FindFiles = require('file-regex')
const IQDB  = require("./js/iqdb");
const compressImages = require("compress-images")


async function main(params) {
    /*let url = "https://cdn.donmai.us/original/99/1c/991c8be6377c3a34cb70b5916237fcc2.png"
    let url2 = "https://cdn.donmai.us/original/99/1c/991c8be6377c3a34cb70b5916237fcc2.jpg"
    let result = null
    try { result = await IQDB.search_best_match(url) } catch (error) {}

    console.log(result, " result 1");
    if( ! result)
    try { result = await IQDB.search_best_match(url2) } catch (error) {}
    console.log(result, " result 2");*/
    url_original = "https://cdn.donmai.us/original/dc/d2/dcd27b0bbaf234ce1d434917ce970570.png"
    fileBuffer = await post.getBufferImage(url_original)
    hashsum = post.getHashSumFromBuffer(fileBuffer)
    console.log(hashsum);
    //console.log("6b200389559f9a15e8b39771070bed052815b491ec55f6672c50826c0767812b");
}

main()