require('dotenv/config');
const express = require('express');
const app = express();
const cors = require('cors')

app.use(cors())

app.use(express.json()) // for parsing application/json
app.use(express.urlencoded({ extended: true })) // for parsing application/x-www-form-urlencoded

app.get('/reddit/:subreddit/:type', function(req, res){
    console.log(req.params);
    res.status(404).send({"message": "Endpoint não encontrado!", "code": 404})
});


app.get('*', function(req, res){
    res.status(404).send({"message": "Endpoint não encontrado!", "code": 404})
});
  

app.listen(process.env.APP_PORT, () => {
    console.log(`Reddit Server - API iniciada na porta ${process.env.APP_PORT}`)
})

module.exports = {
    app
}
