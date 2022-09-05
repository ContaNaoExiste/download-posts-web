const express = require('express');
const app = express();
const cors = require('cors')
const port = 3050;
const path = require("path");
const fs = require('fs');
app.use(cors())

app.use(express.json()) // for parsing application/json
app.use(express.urlencoded({ extended: true })) // for parsing application/x-www-form-urlencoded

const Reddit  = require("./js/download_posts_reddit");
const Jobs = require('./js/schedule');

app.get('/subreddit', (req, res) => {
  console.log(req.query);
  if( req.query.subreddit ){
    Reddit.buscarPostsReddit(req.query.subreddit)
    res.send({ message: "ok "+ req.query.subreddit})
  }else{
    res.send({ message: "error"})
  }
})

app.get('/subreddits', (req, res) => {
  console.log("Reddit.buscarLocalDatabaseReddits()");
  res.send( Reddit.buscarLocalDatabaseReddits() )
})


app.get('/runall', (req, res) => {
  try {
    Reddit.buscarTodosPostReddit();
    res.send(  {"message": "ok"} )
  } catch (error) {
    res.send({ message: "error"})
  }
})

app.delete('/duplicados', (req, res) => {
  console.log("Reddit.removeFilesDuplicate()");
  res.send( Reddit.removeFilesDuplicate() )
})

/**** JOBS ***/
app.get('/updatejob', (req, res) => {
  Jobs.startJob(req.query.params, Reddit.buscarTodosPostReddit);
})

app.get('/stopjob', (req, res) => {
  Jobs.stopJob();
})

app.get('/configjob', (req, res) => {
  try {
    res.send(  Jobs.getConfigJob() )
  } catch (error) {
    res.send({ message: "error"})
  }
  
})

/**** JOBS ***/

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})

/*
const Reddit  = require("./js/download_posts_reddit");
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
          case 'applet':
            RUN_applet(req, res);
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
 
}).listen(3050);

function GET_applets( req, res ){
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Request-Method', '*');
  res.setHeader('Access-Control-Allow-Methods', 'OPTIONS, GET');
  res.setHeader('Access-Control-Allow-Headers', '*');

  res.writeHead(200, { 'content-type': 'application/json' });
  res.write(JSON.stringify({ applets: listFilesInDirectory()}));
  res.end("");
}

function RUN_applet( req, res ){
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Request-Method', '*');
  res.setHeader('Access-Control-Allow-Methods', 'OPTIONS, GET');
  res.setHeader('Access-Control-Allow-Headers', '*');

  res.writeHead(200, { 'content-type': 'application/json' });
  console.log( req.params);
  //Reddit.buscarPostsReddit("")
  res.write("Rodou");
  res.end("");
}

function returnErrorConnection( req, res ){
  const method = req.method;
  res.setHeader('Allow', ['GET']);
  res.writeHead(405, { 'content-type': 'application/json' });
  res.write(JSON.stringify({ error: `Method ${method} Not Allowed.`, message: `Method ${method} Not Allowed.`, errorCode: res.statusCode}) )
  res.end("");
}

*/