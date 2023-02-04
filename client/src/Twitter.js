import * as React from 'react';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardActions from '@mui/material/CardActions';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';

import Grid from '@mui/material/Grid';
import { Link } from '@mui/material';

function removerDuplicados( ){
    fetch("http://localhost:3050/duplicados", {method: "DELETE"})
}

function consultar( subreddit){
    fetch("http://localhost:3050/subreddit?subreddit=" + subreddit)
}

function consultarTodos( ){
    fetch("http://localhost:3050/runall")
}

function updatejob( params){
    fetch("http://localhost:3050/updatejob?params=" + params)
}

function cancelJob( ){
    fetch("http://localhost:3050/stopjob")
}


function updateSubreddits(setData ){
try {
    React.useEffect(() => {
        fetch("http://localhost:3050/subreddits")
        .then((res) => res.json())
        .then((data) => setData(data));        
    }, []);
        
    } catch (error) {
        console.log(error);    
    }
}

function consultarJobConfig(setJobConfig ){
    try {
        React.useEffect(() => {
            fetch("http://localhost:3050/configjob")
            .then((res) => res.json())
            .then((data) => setJobConfig(data));
        }, []);
        
    } catch (error) {
        console.log(error);    
    }
}

export default function Twitter() {  
    
    const [subreddit, setSubreddit] = React.useState("");
    const [job_schedule, setJob_schedule] = React.useState("");
    const [data, setData] = React.useState(null);
    const [jobConfig, setJobConfig] = React.useState(null);
    updateSubreddits(setData)
    /*const timer = setTimeout(() => {
        fetch("http://localhost:3050/subreddits")
        .then((res) => res.json())
        .then((data) => setData(data));        
    }, 120000);*/
    
    consultarJobConfig(setJobConfig)
    return (
        <Box component="form" sx={{ '& > :not(style)': { m: 1, width: '100%' }, }} noValidate autoComplete="off" >
            
            <Box component="form" sx={{ '& > :not(style)': { m: 1, width: '25%' }, }} noValidate autoComplete="off" >
                <TextField id="subreddit" label="Reddit" variant="outlined" onChange={event => { setSubreddit(event.target.value);}}/>
                
                <Button variant="contained" onClick={() => { consultar( subreddit);}}>Consultar</Button>
            </Box>

            <Box component="form" sx={{ '& > :not(style)': { m: 1, width: '25%' }, }} noValidate autoComplete="off" >
                <Card sx={{ minWidth: 275 }}>
                    <CardContent>
                        <Typography sx={{ fontSize: 14 }} color="text.secondary" gutterBottom>
                            Quantidade de Reddits: { ! data ? 0 : JSON.stringify(data.totais.subreddits)}
                        </Typography>
                        <Typography sx={{ fontSize: 14 }} color="text.secondary" gutterBottom>
                            Quantidade de Arquivos: { ! data ? 0 : JSON.stringify(data.totais.files)}
                        </Typography>
                    </CardContent>
                    <CardActions>
                        <Button size="small" onClick={() => { removerDuplicados( );}}>Remover Duplicados</Button>

                        <Button size="small" onClick={() => { consultarTodos( );}}>Consultar Todos</Button>
                    </CardActions>
                </Card>
            </Box>

            <Box component="form" sx={{ '& > :not(style)': { m: 1, width: '25%' }, }} noValidate autoComplete="off" >
                <Card sx={{ minWidth: 275 }}>
                    <CardContent>
                        <Typography sx={{ fontSize: 14 }} color="text.secondary" gutterBottom>
                            <TextField id="estrutura" label="Estrutura do Job" variant="outlined" onChange={event => { setJob_schedule(event.target.value);}}/>
                        </Typography>
                        
                        <Typography sx={{ fontSize: 14 }} color="text.secondary" gutterBottom>
                            Estrutura Atual: { ! jobConfig ? '' : jobConfig.rule}
                        </Typography>
                    </CardContent>
                    <CardActions>
                        <Button size="small" onClick={() => { updatejob( job_schedule );}}>Atualizar Job</Button>

                        <Button size="small" onClick={() => { cancelJob( );}}>Cancelar Job</Button>
                    </CardActions>
                </Card>
            </Box>
            
            <Box component="form" sx={{ '& > :not(style)': { m: 1, width: '100%' }, }} noValidate autoComplete="off" >
                <Grid container spacing={2}>

                    { ! data ? "Carregando..." : 
                        data.applets.map( item => {
                            
                            return (
                                <Grid item xs={3}>
                                    <Card sx={{ minWidth: 275 }}>
                                        <CardContent>
                                            <Typography sx={{ fontSize: 14 }} color="text.secondary.strong" gutterBottom>
                                                {item.subreddit}
                                            </Typography>
                                
                                            <Link href={item.url.split(".json")[0]} variant="body2" target="_blank" rel="noreferrer">{item.url.split(".json")[0]}</Link>
                                            
                                            <Typography sx={{ fontSize: 14 }} color="text.secondary" gutterBottom>
                                                Quantidade de Arquivos: {JSON.stringify(item.files)}
                                            </Typography>
                                        </CardContent>
                                        <CardActions>
                                            <Button size="small"  onClick={() => { consultar( item.subreddit);}}>Consultar</Button>
                                        </CardActions>
                                    </Card>
                                </Grid>
                            )
                        })
                    }
                </Grid>
            </Box>
      </Box>
    );
}  