const express = require('express');
const app = express();
const cors = require('cors')
const port = 6969;
const IQDB  = require("./js/iqdb");
const request = require('request').defaults({ encoding: null });
const fs = require('fs');
const path = require("path");
const { compress_image } = require('./compress_image');

app.use(cors())

app.use(express.json()) // for parsing application/json
app.use(express.urlencoded({ extended: true })) // for parsing application/x-www-form-urlencoded

const URL_JA_PESQUISADAS = {}
const TAMANHO_BITES = 8192000
app.get('/iqdb', async(req, res) => {
  try {
    const filepath = req.query.file
    if( filepath ){
      if( URL_JA_PESQUISADAS[filepath]){
          console.log(filepath);
          res.statusCode = 403
          res.send({error: 403})    
      }else{
          URL_JA_PESQUISADAS[filepath] = req.query.file
          let filesize = fs.statSync(filepath);
          if( filesize['size'] < TAMANHO_BITES){
            const result = await IQDB.search_best_match(fs.readFileSync(filepath))
            if( result){
              res.send(result)
            }else{
              res.statusCode = 404
              res.send({error: 404})  
            }
            
          }else{
            res.statusCode = 403
            res.send({error: 403})    
          }
      }
    }else{
      res.statusCode = 403
      res.send({error: 403})
    }  
  } catch (error) {
    //console.log(error, " error ");
    res.statusCode = 404
    res.send({error: 404, message: error.message})
  }
  
})

app.listen(port, () => {
    console.log(`API iniciada na porta ${port}`)
})