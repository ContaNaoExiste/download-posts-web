const tabela = "reddit_post"

const tabelaReddit_Imagem = 'reddit_imagem'
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

function select(reddit){
    return `
        SELECT reddit_post.* FROM ${tabela}
        WHERE post_id = '${reddit.post_id}'
    `
}
function sqlInsertTag(tag){
    return `INSERT INTO tag (\`descricao\`) SELECT '${replaceAll(tag, "'", "\\'")}' WHERE NOT EXISTS (SELECT idtag FROM tag WHERE descricao = '${replaceAll(tag, "'", "\\'")}');`
}
function sqlInsertImagemTag(tag, idimagem){
    return `INSERT INTO imagem_tag (\`idimagem\`, \`idtag\`) SELECT (SELECT idimagem FROM imagem WHERE idimagem = '${idimagem}') as idimagem,  (SELECT idtag FROM tag WHERE descricao = '${replaceAll(tag, "'", "\\'")}') as idtag;`
}

module.exports = {
    tabela,
    tabelaReddit_Imagem,
    select,
    sqlInsertTag,
    sqlInsertImagemTag
}
