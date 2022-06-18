const { buscarPostsReddit, removeFilesDuplicate } = require("./js/download_posts_reddit");

function main(params) {
    removeFilesDuplicate();
    //buscarPostsReddit("wallpaper");
}

main();