const Reddit  = require("./Reddit")
const Tag = require("./Tag")

const tabela = "imagem"


function sqlRemoveImagemByIdimagem(imagemremove, imagem){
    
    return `
    UPDATE IGNORE ${Reddit.tabelaReddit_Imagem}
    SET idimagem = ${imagem.idimagem}
    WHERE idimagem = ${imagemremove.idimagem};

    UPDATE IGNORE ${Tag.tabelaImagem_tag}
    SET idimagem = ${imagem.idimagem}
    WHERE idimagem = ${imagemremove.idimagem};

    DELETE FROM imagem_tag WHERE idimagem = ${imagemremove.idimagem};

    DELETE FROM reddit_imagem WHERE idimagem = ${imagemremove.idimagem};

    DELETE FROM imagem WHERE idimagem = ${imagemremove.idimagem};
`
}


function selectByUrlOrHashsumOrPostNotInIdimagem(imagem){
    return `
    SELECT imagem.* FROM ${this.tabela}
    WHERE (url = '${imagem.url}' 
    OR hashsum = '${imagem.hashsum}'
    OR post = '${imagem.post}'
    )
    AND idimagem <> ${imagem.idimagem}
`
}

function select(imagem){
    return `
        SELECT imagem.* FROM ${this.tabela}
        WHERE (
            url = '${imagem.url}' OR 
            hashsum = '${imagem.hashsum}' OR 
            post = '${imagem.post}'
        )
    `
}

function    sqlUpdateImagem(imagem){
    return `
        UPDATE IGNORE ${tabela} SET url = '${imagem.url}' WHERE idimagem = '${imagem.idimagem}';

        UPDATE IGNORE ${tabela} SET hashsum = '${imagem.hashsum}' WHERE idimagem = '${imagem.idimagem}';

        UPDATE IGNORE ${tabela} SET width = '${imagem.width}', height = '${imagem.height}' WHERE idimagem = '${imagem.idimagem}';

        UPDATE IGNORE ${tabela} SET post = '${imagem.post}' WHERE idimagem = '${imagem.idimagem}';
    `
}

module.exports = {
    tabela,
    select,
    sqlRemoveImagemByIdimagem,
    sqlUpdateImagem,
    selectByUrlOrHashsumOrPostNotInIdimagem
}
