require('dotenv/config');
const express = require('express');
const app = express();
const cors = require('cors');
const { iqdb_info, tags_info_by_post } = require('./iqdb');

const { default: axios } = require("axios")

app.use(cors())

app.use(express.json()) // for parsing application/json
app.use(express.urlencoded({ extended: true })) // for parsing application/x-www-form-urlencoded

app.get('/iqdb', async function(req, res){
    try {
        const result = await iqdb_info(req.body,{verify_tags:process.env.VERIFY_TAGS_INVALIDA})
        if(result.code){
            res.status(200).send(result)
        }else{
            try {
                axios.get("http://localhost:6962/iqdb", {data: result})    
            } catch (error) {
                console.log(result);
            }
            
            res.status(200).send(result)
        }    
    } catch (error) {
        res.status(404).send({ error: error.message,
        code: 404})
    }
    
    
});


app.get('/imagem', async function(req, res){
    try {
        const result = await iqdb_info(req.body, {verify_tags:'false'})
        if(result.code){
            res.status(200).send(result)
        }else{
            try {
                await axios.get("http://localhost:6962/iqdb", {data: result})    
            } catch (error) {
                console.log(result);
            }
            
            res.status(200).send(result)
        }
    } catch (error) {
        res.status(404).send({ error: error.message,
        code: 404})
    }
    
    
});

app.get('/tags_info_by_post', async function(req, res){
    try {
        const result = await tags_info_by_post(req.body, {verify_tags:'false'})
        if(result.code){
            res.status(200).send(result)
        }else{
            try {
                //await axios.get("http://localhost:6962/iqdb", {data: result})    
            } catch (error) {
                console.log(result);
            }
            
            res.status(200).send(result)
        }
    } catch (error) {
        res.status(404).send({ error: error.message,
        code: 404})
    }
    
    
});

app.get('*', function(req, res){
    res.status(404).send({"error": "Endpoint não encontrado!", "code": 404})
});

app.listen(process.env.APP_PORT, () => {
    console.log(`IQDB Server - API iniciada na porta ${process.env.APP_PORT}`)
})

module.exports = {
    app
}
