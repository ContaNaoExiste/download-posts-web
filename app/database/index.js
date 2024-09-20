require('dotenv/config');
const express = require('express');
const app = express();
const cors = require('cors');
const { processaJson, adicionarImagemDatabase, pesquisarImagemDatabase, validateTags } = require('./mysql');

app.use(cors())

app.use(express.json()) // for parsing application/json
app.use(express.urlencoded({ extended: true })) // for parsing application/x-www-form-urlencoded

app.get('/iqdb', async function(req, res){
    try {
        const result = await processaJson(req.body)
        if(result.code){
            res.status(result.code).send(result)
        }else{
            res.status(200).send(result)
        }    
    } catch (error) {
        console.log(error);
        res.status(404).send({})
    }
    
});

app.get('/add', async function(req, res){
    try {
        const result = await adicionarImagemDatabase(req.body)
        if(result.code){
            res.status(result.code).send(result)
        }else{
            res.status(200).send(result)
        }    
    } catch (error) {
        console.log(error);
        res.status(404).send({error: error.message})
    }
    
});

app.get('/find', async function(req, res){
    try {
        const result = await pesquisarImagemDatabase(req.body)
        if(result && result.code){
            res.status(result.code).send(result)
        }else{
            res.status(200).send(result)
        }    
    } catch (error) {
        console.log(error);
        res.status(404).send({error: error.message})
    }
    
});

app.get('/validatetags', async function(req, res){
    try {
        const result = await validateTags(req.body)
        if(result && result.code){
            res.status(result.code).send(result)
        }else{
            res.status(200).send(result)
        }    
    } catch (error) {
        console.log(error);
        res.status(404).send({error: error.message})
    }
    
});


app.get('*', function(req, res){
    res.status(404).send({"error": "Endpoint não encontrado!", "code": 404})
});

app.listen(process.env.APP_PORT, () => {
    console.log(`Database Server - API iniciada na porta ${process.env.APP_PORT}`)
})

module.exports = {
    app
}
