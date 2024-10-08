$(document).ready(() => {
    $('.grid').masonry({
        itemSelector: '.grid-item',
        columnWidth: 0,
        percentPosition: true
    })

    $('.image').on("load", () => {
        $('.grid').masonry()
        loadHeigth()
    })

    $('.accordion-collapse').on('shown.bs.collapse', ()=>{
        $('.grid').masonry()
    })
    $('.accordion-collapse').on('hidden.bs.collapse', ()=>{
        $('.grid').masonry()
        loadHeigth()
    })
})

function loadHeigth(){
    var c = [];
       
    $("#div_imagens > div").each(function(){
        for(var i=0; i < $(this).length; i++){
            var height = $(this).eq(i).outerHeight();
            c.push(height)
       }
    
     });
    
     var max = Math.max.apply(Math,c)
     if(max > 600 )
        max = 500
    $("#div_imagens > div").css("min-height", max + "px");
}