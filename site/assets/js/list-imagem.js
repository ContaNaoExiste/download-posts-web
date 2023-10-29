$(document).ready(() => {
    $('.grid').masonry({
        itemSelector: '.grid-item',
        columnWidth: 200,
        percentPosition: true
    })

    $('.image').on("load", () => {
        $('.grid').masonry()
    })

    $('.accordion-collapse').on('shown.bs.collapse', ()=>{
        $('.grid').masonry()
    })
    $('.accordion-collapse').on('hidden.bs.collapse', ()=>{
        $('.grid').masonry()
    })
})