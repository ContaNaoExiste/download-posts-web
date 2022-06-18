# DownloadPostsReddit
Código fonte utilizado para realizar download dos arquivos (Fotos, Gifs, Videos) anexados aos posts enviados em um subreddit.

Parte da documentação utilizada: https://www.reddit.com/dev/api/

Configuração do Projeto Local:
  1. Instalar o Node js, caso não tenha. Página oficial: https://nodejs.org/en/ Versão utilizada para desenvolvimento: v16.15.0;
  2. Executar o comando dentro da pasta raiz do projeto, "npm install", para baixar as bibliotecas utilizadas;
  3. Criar um arquivo, na pasta raiz do projeto, com o nome ".env" (download-posts-reddit). O conteudo pode ser copiado do arquivo ".env.example"

Executar o projeto:
  1. Executar o comando dentro da pasta raiz do projeto, "node index.js", atualmente o comando irá buscar os posts do Reddit: https://www.reddit.com/r/wallpaper/new.

Vericar se o projeto funcionou:
  1. Será criado uma pasta ".reddit_files" na pasta raiz do projeto;
  2. Dentro da pasta ".reddit_files", terá uma pasta "wallpaper", com as imagens;
  3. Será criado uma pasta ".database" na pasta "js";
  4. Dentro da pasta ".database", terá duas pastas "logs" e "reddit";
  5. Na pasta "logs", terá toda a consulta realizada no reddit, caso tenha retornado pelo menos um post.
  6. Na pasta "reddit", terá as configurações da endereço de pesquisa do reddit e o último post recebido.
