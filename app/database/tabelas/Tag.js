const tabela = "tag"
const tabelaImagem_tag = "imagem_tag"
function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}

function replaceAll(str, find, replace) {
    try {
        return str.replace(new RegExp(escapeRegExp(find), 'g'), replace);   
    } catch (error) {
        //console.log(str, find, replace, " str, find, replace");
        return str
    }
}

function select(tag){
    return `
        SELECT tag.* FROM ${tabela}
        WHERE descricao = '${tag}'
    `
}
function sqlInsertTag(tag){
    return `INSERT INTO tag (\`descricao\`) SELECT '${replaceAll(tag, "'", "\\'")}' WHERE NOT EXISTS (SELECT idtag FROM tag WHERE descricao = '${replaceAll(tag, "'", "\\'")}');`
}
function sqlInsertImagemTag(tag, idimagem){
    return `INSERT INTO imagem_tag (\`idimagem\`, \`idtag\`) SELECT (SELECT idimagem FROM imagem WHERE idimagem = '${idimagem}') as idimagem,  (SELECT idtag FROM tag WHERE descricao = '${replaceAll(tag, "'", "\\'")}') as idtag;`
}

function sqlDeleteImagemTag(idimagem){
    return `DELETE FROM imagem_tag WHERE idimagem=${idimagem}`
}

module.exports = {
    tabela,
    tabelaImagem_tag,
    select,
    sqlInsertTag,
    sqlInsertImagemTag,
    sqlDeleteImagemTag
}
