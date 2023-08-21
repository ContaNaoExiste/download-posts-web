
const fs = require('fs');
const path = require('path');
module.exports = {
    ROOT: path.resolve(__dirname, "js", ".database", "reddit_files"),
    TEMP: path.resolve(__dirname, "js", ".database", "reddit_files"),
    OUTPUT: path.resolve(__dirname, "js", ".database", "reddit_files"),
    RESIZE_IMAGE_WIDTH: 600,
    JIMP_QUALITY: 70,
    MAX_IMAGE_SIZE: 350000, // IN BYTES 350 KB
    RESIZE_HD_IMAGE_WIDTH: 400,
    MEDIAN_HD_IMAGE_WIDTH: 700,
    MAX_HD_IMAGE_SIZE: 650000
  }