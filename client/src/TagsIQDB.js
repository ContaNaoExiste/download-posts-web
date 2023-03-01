import * as React from 'react';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardActions from '@mui/material/CardActions';
import CardContent from '@mui/material/CardContent';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import Typography from '@mui/material/Typography';

import Grid from '@mui/material/Grid';
import { Link } from '@mui/material';
import ImageList from '@mui/material/ImageList';
import ImageListItem from '@mui/material/ImageListItem';

import ImageListItemBar from '@mui/material/ImageListItemBar';
import IconButton from '@mui/material/IconButton';

function consultarTags(setTags, filtro){
    try {
        React.useEffect(() => {
            fetch("http://localhost:3050/tags" + ( filtro ? "?filtro="+filtro: ""))
            .then((res) => res.json())
            .then((data) => setTags(data));        
        }, []);
        
    } catch (error) {
        console.log(error);    
    }
}

function consultarTagsBtn(setTags, filtro){
    try {
        setTags("")
        fetch("http://localhost:3050/tags" + ( filtro ? "?filtro="+filtro: ""))
        .then((res) => res.json())
        .then((data) => setTags(data));
        
    } catch (error) {
        console.log(error);    
    }
}

export default function TagsIQDB() {  
    
    const [tags, setTags] = React.useState("")
    const [filtro, setFiltro] = React.useState("")
    consultarTags(setTags, filtro)
    return (
        <Box component="form" sx={{ '& > :not(style)': { m: 1, width: '100%' }, }} noValidate autoComplete="off" >
            <Box component="form" sx={{ '& > :not(style)': { m: 1, width: '25%' }, }} noValidate autoComplete="off" >
                <TextField id="filtro" label="Filtro" variant="outlined" onChange={event => { setFiltro(event.target.value);}}/>
                
                <Button variant="contained" onClick={() => { consultarTagsBtn(setTags, filtro)}}>Consultar</Button>
            </Box>

            <Box component="form" sx={{ '& > :not(style)': { m: 1, width: '25%' }, }} noValidate autoComplete="off" >
                <Card sx={{ minWidth: 275 }}>
                    <CardContent>
                        <Typography sx={{ fontSize: 14 }} color="text.secondary" gutterBottom>
                            Quantidade de tags: { ! tags ? 0 : JSON.stringify(tags.total)}
                        </Typography>
                    </CardContent>
                </Card>
            </Box>

            <Box component="form" sx={{ '& > :not(style)': { m: 1, width: '100%' }, }}  autoComplete="off" >
                <Grid container spacing={3}>

                    { ! tags? "Carregando..." : 
                        tags && (! tags.tags || tags.tags.length == 0) ? "Não foi encontrado registros.":
                        tags.tags.map( item => {
                            
                            return (
                                <Grid item xs="auto">
                                    <Card sx={{ minWidth: 275 }}>
                                        <CardContent>
                                            <Typography sx={{ fontSize: 14 }} color="text.secondary.strong" gutterBottom>
                                                {item.tag}
                                            </Typography>
                                
                                            <Typography sx={{ fontSize: 14 }} color="text.secondary" gutterBottom>
                                                Quantidade de Arquivos: {JSON.stringify(item.total)}
                                            </Typography>

                                            <Accordion>
                                                <AccordionSummary aria-controls="panel1a-content" id="panel1a-header" >
                                                    <Typography>URLs</Typography>
                                                </AccordionSummary>
                                                <AccordionDetails>
                                                <ImageList sx={{ width: 250, height: 225 }} cols={2} rowHeight={164}>
                                            {
                                                item.urls.map( (url, index) =>{
                                                return (
                                                    <ImageListItem key={item.tag}>
                                                        <img
                                                            src={`${item.urls_iqdb[index]}`}
                                                            srcSet={`${item.urls_iqdb[index]}`}
                                                            alt={item.names[index]}
                                                            loading="lazy"
                                                        />
                                                        <ImageListItemBar
                                                            actionIcon={
                                                                <Link href={url} variant="body2" target="_blank" rel="noreferrer">{item.names[index]}</Link>
                                                            }
                                                        />
                                                    </ImageListItem>  
                                                )
                                                })
                                            }
                                                </ImageList>
                                                </AccordionDetails>
                                            </Accordion>
                                        </CardContent>
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