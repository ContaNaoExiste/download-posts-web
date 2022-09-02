const express = require('express');
const app = express();
const port = 3001;
const path = require("path");
const fs = require('fs');
const request = require('request').defaults({ encoding: null });

app.use(express.json()) // for parsing application/json
app.use(express.urlencoded({ extended: true })) // for parsing application/x-www-form-urlencoded

app.get('/home', (req, res) => {
    const url_applets = "http://localhost:3050/subreddits";
    request.get(url_applets, ( error, response, body)=>{
        if (!error && response.statusCode == 200) {
            data = JSON.parse(Buffer.from(body).toString('utf8'));
            res.write("<html>");
            res.write("<body>");

            res.write(`
                <form action="http://localhost:3050/subreddit" method=GET>                    
                    <div>
                        <input type=text placeholder='Novo Subreddit' name='subreddit'>
                            
                        </input>

                        <button type=submit onclick="">
                            Rodar Consulta
                        </button>
                    </div>
                </form>
            `);

            res.write(`
                <hr />
                    <div>
                        <label>
                            Qts Subreddits: ${ data.totais.subreddits}
                        </label>
                    </div>
                    
                    <div>
                        <label>
                            Qts Arquivos: ${ data.totais.files}
                        </label>
                    </div>
                <hr />
            `);
            data.applets.forEach(element => {
                res.write(`
                <form action="http://localhost:3050/subreddit" method=GET>                    
                    <div>
                        <input type=hidden name=subreddit value=${element.subreddit} />
                        <strong>
                            ${element.subreddit}
                        </strong>
                        <br />
                        <label>
                            Qts Arquivos: ${element.files}
                        </label>
                        <br />
                        <button type=submit onclick="">
                            Rodar Consulta
                        </button>
                    </div>
                </form>
                `);
            });

            res.write("</body>");
            res.write("</html>");

            res.end("");
        }
    })
})

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})
/*
const path = require("path");
const fs = require('fs');
const request = require('request').defaults({ encoding: null });

const http = require('http')
http.createServer((req, res) => {
  const method = req.method;

  switch (method ) {
    case "GET":
      var parts = req.url.split("/");
      if(parts.length > 1 ){
        switch (parts[1]) {
          case 'applets':
            GET_applets(req, res);
            break;
        
          default:
            returnErrorConnection( req, res);
            break;
        }
      }else{
        returnErrorConnection( req, res);
      }
     
      break;
  
    default:
      returnErrorConnection( req, res)
      
      break;
  }
 
}).listen(3001);

function GET_applets( req, res ){
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Request-Method', '*');
  res.setHeader('Access-Control-Allow-Methods', 'OPTIONS, GET');
  res.setHeader('Access-Control-Allow-Headers', '*');

  res.writeHead(200, { 'content-type': 'text/html' });
  listFilesInDirectory( res);
}

function returnErrorConnection( req, res ){
  const method = req.method;
  res.setHeader('Allow', ['GET']);
  res.writeHead(405, { 'content-type': 'text/html' });

  res.write(JSON.stringify({ error: `Method ${method} Not Allowed.`, message: `Method ${method} Not Allowed.`, errorCode: res.statusCode}) )
  res.end("");
}

function listFilesInDirectory( res  ){
    
  try {
    
    const url_applets = "http://localhost:3050/applets"
    request.get(url_applets, ( error, response, body)=>{
        if (!error && response.statusCode == 200) {
            data = JSON.parse(Buffer.from(body).toString('utf8'));
            console.log( data );
            res.write("<html>");
            res.write("<body>");

            res.write(`
                    <div>
                        <input type=text placeholder='Novo Applet' id='novo_applet'>
                            
                        </input>

                        <button type=button onclick="">
                            Rodar Consulta
                        </button>
                    </div>
            `);

            data.applets.forEach(element => {
                console.log(element);

                res.write(`
                    <div>
                        <strong>
                            ${element}
                        </strong>

                        <button type=button onclick="">
                            Rodar Consulta
                        </button>
                    </div>
                `);
            });

            res.write("</body>");
            res.write("</html>");

            res.end("");
        }
    });
  } catch (error) {
    res.write(error.message);
    res.end("");
    console.error("Erro listFilesInDirectory: ", error.message)
  }
}*/