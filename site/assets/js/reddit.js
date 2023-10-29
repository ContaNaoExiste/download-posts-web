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

        updateMansonry()
    })

    updateMansonry()
    
    $('.image').on("load", () => {
        $('.grid').masonry()
    })

    //pesquisarURLIcon()
    
    /*.each(async (index, element) => {
        const data = $(element).data()
        if( data.subreddit){
            const url = "/reddit/about/json?url=" + data.url
            result = await Promise.resolve($.get(url));
            console.log(result);
            /*$.get(, (data)=>{
                if( data && data.data){
                    $(element).prepend(`<img class="image" src="${data.data.community_icon}" alt="${data.data.public_description}" srcset="" loading="lazy"/>`)
                    //updateMansonry()
                }
            })
        }
    });*/
        
})

function updateMansonry(params) {
    
    $('.grid').masonry({
        itemSelector: '.grid-item',
        columnWidth: 200,
        percentPosition: true
    })

}

async function pesquisarURLIcon(){
    for( const element of $(".div-image[data-subreddit]")){
        const data = $(element).data()
        if( data.subreddit){
            try {
                const url = "/reddit/about/json?url=" + data.url
                result = await Promise.resolve($.get(url));
                if( result && result.data.community_icon){
                    $(element).prepend(`<img class="image" src="${result.data.community_icon}" alt="${result.data.public_description}"/>`)
                }  else  if( result && result.data.icon_img){
                    $(element).prepend(`<img class="image" src="${result.data.icon_img}" alt="${result.data.public_description}"/>`)
                }
                
                updateMansonry()    
            } catch (error) {
                
            }
            
        }
        
    }
}