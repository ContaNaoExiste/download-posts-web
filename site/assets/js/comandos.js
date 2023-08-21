$(document).ready(() => {
    
    $('#input-search').on("keyup change", (event) => {
        const search = $('#input-search').val()
        if(search){
            $("#div_imagens .grid-item").each((i, item)=>{
                const parent = $(item)
                if($(item).text().includes(search)){
                    parent.show()
                }else{
                    parent.hide()
                }

                /*$('.grid').masonry({
                    itemSelector: '.grid-item',
                    columnWidth: 200,
                    percentPosition: true
                })*/
            })
        }else{
            $("#div_imagens .grid-item").show()
        }

        $('.grid').masonry({
            itemSelector: '.grid-item',
            columnWidth: 200,
            percentPosition: true
        })
    })


    $('.grid').masonry({
        itemSelector: '.grid-item',
        columnWidth: 200,
        percentPosition: true
    })

    $('.image').on("load", () => {
        $('.grid').masonry()
    })
})
