const fs = require('fs');
const path = require("path");
const hash = {}
function main(){
    const dias = fs.readdirSync( path.resolve("js", ".database", "log_iqdb"))
    dias.forEach(pasta => {
        const arquivos = fs.readdirSync( path.resolve("js", ".database", "log_iqdb", pasta))
        arquivos.forEach(arquivo => {
            const sql = fs.readFileSync(path.resolve("js", ".database", "log_iqdb", pasta, arquivo)).toString().split(/\r?\n/)
            sql.forEach(linha => {
                if(linha.startsWith("INSERT INTO iqdb_tag")){
                    tag = linha.split("INSERT INTO iqdb_tag (`tag`) SELECT '")[1].split("' where not exists (")[0]
                    if(! hash[tag]){
                        hash[tag] = linha;
                        sql_final = `INSERT INTO iqdb_tag (\`tag\`) SELECT '${tag}' where not exists (select idtag from iqdb_tag where tag = '${tag}' );`
                        fs.appendFileSync( path.resolve("js", ".database", "database_tags", pasta + ".sql"), sql_final + "\n")
                    }
                    
                }
            });
        });
    });
}

main()