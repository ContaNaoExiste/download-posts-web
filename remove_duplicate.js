const fs = require('fs');
const path = require("path");
const post = require('./js/download_posts_reddit');
const { func } = require('assert-plus');
const sizeOf = require('probe-image-size');
const { mysqlInsertQuery, mysqlQuery } = require('./js/connection/mysql');
const FindFiles = require('file-regex')
const IQDB  = require("./js/iqdb");
const compressImages = require("compress-images")
const request = require('request').defaults({ encoding: null });

function main(){
    post.removeFilesDuplicate()
}

main()