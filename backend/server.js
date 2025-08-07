/**
 * Servidor Express para API de scraping da Amazon
 * Autor: Amazon Scraper Backend
 * Descrição: Servidor que expõe endpoints para realizar scraping de produtos da Amazon
 */

import express from 'express';
import cors from 'cors';
import { scrapeAmazonProducts } from './scraper.js';

// Inicialização do app Express
const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors()); // Permitir requisições cross-origin
app.use(express.json()); // Parser para JSON
app.use(express.urlencoded({ extended: true })); // Parser para form data

/**
 * Middleware de logging para requisições
 */
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

/**
 * Endpoint raiz - Health check
 */
app.get('/', (req, res) => {
  res.json({
    message: 'Amazon Scraper API está funcionando!',
    version: '1.0.0',
    endpoints: {
      scrape: '/api/scrape?keyword=sua_palavra_chave'
    }
  });
});

/**
 * Endpoint principal para scraping de produtos da Amazon
 * GET /api/scrape?keyword=laptop
 */
app.get('/api/scrape', async (req, res) => {
  try {
    // Validação do parâmetro keyword
    const { keyword } = req.query;
    
    if (!keyword || keyword.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Parâmetro "keyword" é obrigatório e não pode estar vazio',
        example: '/api/scrape?keyword=laptop'
      });
    }

    // Sanitização da keyword
    const sanitizedKeyword = keyword.trim().substring(0, 100); // Limitar tamanho
    
    console.log(`Iniciando scraping para: "${sanitizedKeyword}"`);

    // Executar scraping
    const startTime = Date.now();
    const products = await scrapeAmazonProducts(sanitizedKeyword);
    const endTime = Date.now();

    console.log(`Scraping concluído em ${endTime - startTime}ms - ${products.length} produtos encontrados`);

    // Resposta de sucesso
    res.json({
      success: true,
      keyword: sanitizedKeyword,
      resultsCount: products.length,
      executionTime: `${endTime - startTime}ms`,
      data: products
    });

  } catch (error) {
    console.error('Erro no scraping:', error.message);
    
    // Tratamento de diferentes tipos de erro
    if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      return res.status(503).json({
        success: false,
        error: 'Erro de conexão com a Amazon. Tente novamente em alguns minutos.',
        details: 'Serviço temporariamente indisponível'
      });
    }

    if (error.code === 'ETIMEDOUT') {
      return res.status(408).json({
        success: false,
        error: 'Timeout na requisição. A Amazon pode estar com alta latência.',
        details: 'Tente novamente com uma palavra-chave mais específica'
      });
    }

    // Erro genérico
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor durante o scraping',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Erro interno'
    });
  }
});

/**
 * Middleware para rotas não encontradas
 */
app.use('/',  (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint não encontrado',
    availableEndpoints: [
      'GET /',
      'GET /api/scrape?keyword=sua_palavra_chave'
    ]
  });
});

/**
 * Middleware global de tratamento de erros
 */
app.use((error, req, res, next) => {
  console.error('Erro não tratado:', error);
  res.status(500).json({
    success: false,
    error: 'Erro interno do servidor',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Erro interno'
  });
});

/**
 * Inicialização do servidor
 */
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
  console.log(`📡 API Endpoint: http://localhost:${PORT}/api/scrape?keyword=laptop`);
  console.log(`🔧 Ambiente: ${process.env.NODE_ENV || 'development'}`);
});

// Tratamento graceful de encerramento
process.on('SIGTERM', () => {
  console.log('Recebido SIGTERM, encerrando servidor graciosamente...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('\nRecebido SIGINT, encerrando servidor graciosamente...');
  process.exit(0);
});