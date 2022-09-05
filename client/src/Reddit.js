import * as React from 'react';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardActions from '@mui/material/CardActions';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';

import Paper from '@mui/material/Paper';
import Grid from '@mui/material/Grid';

import Link from '@mui/material/Link';
import ImageList from '@mui/material/ImageList';
import ImageListItem from '@mui/material/ImageListItem';

import { styled } from '@mui/material/styles';

const RedditItem = (
    <Card sx={{ minWidth: 275 }}>
        <CardContent>
            <Typography sx={{ fontSize: 14 }} color="text.secondary" gutterBottom>
                Reddit: 
            </Typography>
            <Typography sx={{ fontSize: 14 }} color="text.secondary" gutterBottom>
                Quantidade de Arquivos: 
            </Typography>
        </CardContent>
        <CardActions>
            <Button size="small">Consultar</Button>
        </CardActions>
    </Card>
);

const bull = (
    <Box
      component="span"
      sx={{ display: 'inline-block', mx: '2px', transform: 'scale(0.8)' }}
    >
      •
    </Box>
  );

const Item = styled(Paper)(({ theme }) => ({
    backgroundColor: theme.palette.mode === 'dark' ? '#1A2027' : '#fff',
    ...theme.typography.body2,
    padding: theme.spacing(1),
    textAlign: 'center',
    color: theme.palette.text.secondary,
}));

function removerDuplicados( ){
    fetch("http://localhost:3050/duplicados", {method: "DELETE"})
}

function consultar( subreddit){
    fetch("http://localhost:3050/subreddit?subreddit=" + subreddit)
}

function consultarTodos( ){
    fetch("http://localhost:3050/runall")
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
export default function Reddit() {  
    
    const [subreddit, setSubreddit] = React.useState("");
    const [data, setData] = React.useState(null);

    updateSubreddits(setData)

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
            
            <Box component="form" sx={{ '& > :not(style)': { m: 1, width: '100%' }, }} noValidate autoComplete="off" >
                <Grid container spacing={2}>

                    { ! data ? "Carregando..." : 
                        data.applets.map( item => {
                            
                            return (
                                <Grid item xs={4}>
                                    <Card sx={{ minWidth: 275 }}>
                                        <CardContent>
                                            <Typography sx={{ fontSize: 14 }} color="text.secondary.strong" gutterBottom>
                                                {item.subreddit}
                                            </Typography>
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