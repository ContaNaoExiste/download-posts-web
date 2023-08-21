const express = require('express');
const app = express();
const cors = require('cors')
const port = 3050;

app.use(cors())

app.use(express.json()) // for parsing application/json
app.use(express.urlencoded({ extended: true })) // for parsing application/x-www-form-urlencoded

const Reddit  = require("./download_posts_reddit");
const DatabaseReddit = require("./database_posts_reddit")

const Jobs = require('./schedule');

app.get('/subreddit', (req, res) => {
  if( req.query.subreddit ){
    Reddit.buscarPostsReddit(req.query.subreddit)
    res.send({ message: "ok "+ req.query.subreddit})
  }else{
    res.send({ message: "error"})
  }
})

app.get('/subreddits', (req, res) => {
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
  res.send( Reddit.removeFilesDuplicate() )
})

/**** JOBS ***/
app.get('/updatejob', (req, res) => {
  console.log(" Chegou aqui");
  Jobs.startJob(req.query.params, ()=>{Reddit.buscarTodosPostReddit("new")});
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

/*** TAGS **/
app.get('/tags', async (req, res) => {
  res.send( await Reddit.buscarTodasTagsIQDB(req.query.filtro) )
})

app.post('/tag', (req, res) => {
  const json = req.body
  DatabaseReddit.saveTag(json)
  res.send( {"o":"0"} )
})

app.get('/tag-urls', async (req, res) => {
  res.send( await Reddit.buscarTodasUrlsTagIQDB(req.query.tag) )
})

app.get('/imagens', async (req, res) => {
  res.send( await Reddit.buscarTodasImagensBD(req) )
})
app.get('/imagens/:page', async (req, res) => {
  res.send( await Reddit.buscarTodasImagensBD(req) )
})

app.get('/imagem/:idimagem', async (req, res) => {
  res.send( await Reddit.buscarDadosImagemBD(req) )
})

app.get('/bd-tags/:page', async (req, res) => {
  res.send( await Reddit.buscarTodasTagsBD(req) )
})

app.get('/bd-tags/imagens/:idtag/:page', async (req, res) => {
  res.send( await Reddit.buscarDadosTagBD(req) )
})

app.get('/reddit/:page', async (req, res) => {
  res.send( await Reddit.buscarTodosRedditBD(req) )
})
/*
app.get('/posts/imagens/:idreddit/:page', async (req, res) => {
  res.send( await Reddit.buscarDadosTagBD(req) )
})*/

app.get('/reddit/posts/:subreddit/:page', async (req, res) => {
  res.send( await Reddit.buscarTodosPostsRedditBD(req) )
})

app.get('/posts/:page', async (req, res) => {
  res.send( await Reddit.buscarTodosPostsRedditBD(req) )
})

app.post('/post_reddit', (req, res) => {
  const json = req.body
  DatabaseReddit.savePostReddit(json)
  res.send( {"o":"0"} )
})
/*** TAGS **/

//The 404 Route (ALWAYS Keep this as the last route)
app.get('*', function(req, res){
  res.send({"message": "Endpoint não encontrado!", "code": 502})
});

app.post('*', function(req, res){
  res.send({"message": "Endpoint não encontrado!", "code": 502})
});

app.listen(port, () => {
    console.log(`API iniciada na porta ${port}`)
})