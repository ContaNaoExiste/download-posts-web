const express = require('express');
const app = express();
const cors = require('cors')
const port = 3050;

app.use(cors())

app.use(express.json()) // for parsing application/json
app.use(express.urlencoded({ extended: true })) // for parsing application/x-www-form-urlencoded

const Reddit  = require("./download_posts_reddit");
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
app.get('/tags', (req, res) => {
  res.send( Reddit.buscarTodasTagsIQDB(req.query.filtro) )
})
/*** TAGS **/
app.listen(port, () => {
    console.log(`API iniciada na porta ${port}`)
})