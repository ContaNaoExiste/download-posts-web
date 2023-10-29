require('dotenv/config');
const express = require('express');
const app = express();
const cors = require('cors');
const { processaJson } = require('./mysql');

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

app.get('*', function(req, res){
    res.status(404).send({"error": "Endpoint não encontrado!", "code": 404})
});

app.listen(process.env.APP_PORT, () => {
    console.log(`Database Server - API iniciada na porta ${process.env.APP_PORT}`)
})

module.exports = {
    app
}
