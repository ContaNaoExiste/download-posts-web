$(document).ready(() => {
    $(".image").on("error", function () {
        /* = $(this).data("url")
        extensao = new URL(url).pathname.split(".").pop()
        url = url.replace(extensao, (extensao === 'jpg' ? 'png': 'jpg'))
        console.log(url, " url");
        $(this).attr("src", url)*/
    });

    $('.btn-consultar-post').on('click',function(event){
        event.stopPropagation();
        event.stopImmediatePropagation();
        console.log($(this).data("imagem"));
        $.get( $(this).data("href"), $(this).data("imagem"), function( data ) {
            location.reload();
        });
    });
})