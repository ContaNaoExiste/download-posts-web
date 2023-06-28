var mysql = require('mysql');

let connection = null

function mysqlQuery(sql){
    //console.log(sql);
    return new Promise( (resolve, reject) =>{
        connection =  connect();
        connection.query(sql, function(err, rows, fields) {
            if(connection){
                connection.end();
                connection = null;
            }
            
            if (err){
                console.log("Error: ", err);
                resolve( null);
                //reject()
                //throw err;
            } 
            resolve( rows);
        });
    })
}

function mysqlInsertQuery(sql){
    return new Promise( (resolve, reject) =>{
        const connection = mysql.createConnection({
            multipleStatements: true,
            host     : process.env.MYSQL_HOST,
            database : process.env.MYSQL_DATABASE,
            user     : process.env.MYSQL_USER,
            password : process.env.MYSQL_PASSWORD
        });
          
        connection.connect();
        connection.query(sql, function(err, rows, fields) {
            
            if (err){
                //console.log("err", err);
                console.log("Rollback ");
                connection.rollback()
                connection.end()
                resolve( null);
            } else{
                console.log("Commit ");
                connection.commit()
                connection.end()
                resolve( rows);
            }
        });
    })
}

function connect(){
    if(connection == null ){
        connection = mysql.createConnection({
            multipleStatements: true,
            host     : process.env.MYSQL_HOST,
            database : process.env.MYSQL_DATABASE,
            user     : process.env.MYSQL_USER,
            password : process.env.MYSQL_PASSWORD
        });
          
        connection.connect();
    }
    return connection;
}

async function insertFromJson(tabela, json){
    console.log("tabela", tabela, "json", json);
    let sql = `INSERT INTO ${tabela}  (${Object.keys(json).join(", ")}) VALUES (${Object.values(json).map((item)=>{return "'" + ((! item )? "": item.toString().split("'").join("\\'")) + "'"}).join(", ")})`

    return await mysqlQuery(sql)
}

module.exports = {
    mysqlQuery,
    mysqlInsertQuery,
    insertFromJson
}