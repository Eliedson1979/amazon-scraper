# Amazon Product Scraper

Esta é uma aplicação full-stack para fazer scraping de produtos da Amazon. O backend, construído com Bun, Express, Axios e JSDOM, extrai detalhes de produtos com base em uma palavra-chave. O frontend, uma aplicação simples com HTML, CSS e JavaScript puro (usando Vite), permite que o usuário insira uma palavra-chave e visualize os resultados de forma formatada.

## Funcionalidades

- **Backend:**
    - Servidor HTTP com Express e Bun.
    - Endpoint `/api/scrape` que recebe uma `keyword` via query parameter.
    - Utiliza **Axios** para buscar o conteúdo HTML da página de busca da Amazon.
    - Utiliza **JSDOM** para parsear o HTML e extrair detalhes dos produtos.
    - Retorna os dados extraídos em formato JSON.

- **Frontend:**
    - Interface simples com um campo de input e um botão.
    - Faz uma chamada AJAX para o backend.
    - Exibe os resultados do scraping em uma grade de cards.
    - Lida com estados de carregamento e erros.

## Pré-requisitos

Certifique-se de ter o **Bun** instalado em sua máquina. Para instalá-lo, siga as instruções no [site oficial do Bun](https://bun.sh/).

## Como Rodar a Aplicação

Siga estes passos para configurar e executar a aplicação:

### 1. Backend

1.  Navegue até a pasta `backend`:
    ```bash
    cd backend
    ```
2.  Instale as dependências usando o Bun:
    ```bash
    bun install
    ```
3.  Inicie o servidor:
    ```bash
    bun run server.js
    ```
    O servidor estará rodando em `http://localhost:3000`.

### 2. Frontend

1.  Abra um novo terminal e navegue até a pasta `frontend`:
    ```bash
    cd frontend
    ```
2.  Instale as dependências do Vite (npm):
    ```bash
    npm install
    ```
3.  Inicie o servidor de desenvolvimento do Vite:
    ```bash
    npm run dev
    ```
    O frontend estará acessível em `http://localhost:5173` (ou outra porta, dependendo da configuração do Vite).

### Uso

1.  Abra seu navegador e acesse a URL do frontend (ex: `http://localhost:5173`).
2.  Digite uma palavra-chave (ex: `smartwatch`) no campo de entrada.
3.  Clique no botão "Buscar".
4.  Os resultados do scraping serão exibidos na página.