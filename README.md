# DownloadPostsReddit
Código fonte utilizado para realizar download dos arquivos (Fotos, Gifs, Videos) anexados aos posts enviados em um subreddit.

Parte da documentação utilizada: https://www.reddit.com/dev/api/

Configuração do Projeto Local:
  1. Instalar o Node js, caso não tenha. Página oficial: https://nodejs.org/en/ Versão utilizada para desenvolvimento: v16.15.0;
  2. Executar o comando dentro da pasta raiz do projeto, "npm install", para baixar as bibliotecas utilizadas;
  3. Criar um arquivo, na pasta raiz do projeto, com o nome ".env". O conteudo pode ser copiado do arquivo ".env.example"

Executar o projeto:
  1. Executar o comando dentro da pasta raiz do projeto, "node index.js", atualmente o comando irá buscar os posts do Reddit: https://www.reddit.com/r/wallpaper/new.

Vericar se o projeto funcionou:
  1. Será criado uma pasta ".database" na pasta "js";
  2. Dentro da pasta ".database", terá outras pastas "logs" e "reddit" e "reddit_files";
  3. Na pasta "logs", terá toda a consulta realizada no reddit, caso tenha retornado pelo menos um post;
  4. Na pasta "reddit", terá as configurações da endereço de pesquisa do reddit e o último post recebido;
  5. Na pasta "reddit_files", terá os arquivos baixados.

Conteúdo do arquivo ".env":
  1. DEBUG_ERROR
  1.1 true -> Habilita a apresentação dos erros que ocorrerem durante a execução, no console;
  1.2 false -> NÂO Habilita a apresentação dos erros que ocorrerem durante a execução, no console.
    
  2. REMOVE_OR_COPY_DUPLICATE_ITENS
    2.1 COPY -> Ao executar a rotina 'removeFilesDuplicate', os arquivos duplicados serão movidos para a pasta temporária (PATH_COPY_FILES).
    2.2 REMOVE -> Ao executar a rotina 'removeFilesDuplicate', os arquivos duplicados serão removidos do disco fisíco.
    
  3. PATH_DOWNLOAD_FILES
    3.1. reddit_files (Valor Padrão) -> Caminho onde os arquivos serão baixados. Não há necessidade de alterar este campo.
  
  4. PATH_COPY_FILES=
    4.1 reddit_tempfiles (Valor Padrão) -> Caminho onde os arquivos temporários serão movidos. Não há necessidade de alterar este campo.
