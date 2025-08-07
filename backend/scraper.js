/**
 * Módulo de scraping de produtos da Amazon
 * Autor: Amazon Scraper
 * Descrição: Funções para extrair dados de produtos da Amazon usando axios e JSDOM
 */

import axios from 'axios';
import { JSDOM } from 'jsdom';

/**
 * Configurações do scraper
 */
const SCRAPER_CONFIG = {
  timeout: 10000, // 10 segundos
  maxRetries: 3,
  baseURL: 'https://www.amazon.com.br', // Amazon Brasil
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
};

/**
 * Headers para simular uma requisição de navegador real
 */
const getHeaders = () => ({
  'User-Agent': SCRAPER_CONFIG.userAgent,
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
  'Accept-Encoding': 'gzip, deflate, br',
  'DNT': '1',
  'Connection': 'keep-alive',
  'Upgrade-Insecure-Requests': '1',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none',
  'Cache-Control': 'max-age=0'
});

/**
 * Constrói a URL de busca da Amazon
 * @param {string} keyword - Palavra-chave para busca
 * @returns {string} URL formatada
 */
function buildSearchURL(keyword) {
  const encodedKeyword = encodeURIComponent(keyword);
  return `${SCRAPER_CONFIG.baseURL}/s?k=${encodedKeyword}&ref=sr_pg_1`;
}

/**
 * Extrai o rating numérico de uma string de rating
 * @param {string} ratingText - Texto do rating (ex: "4,5 de 5 estrelas")
 * @returns {number} Rating numérico
 */
function extractRating(ratingText) {
  if (!ratingText) return 0;
  
  const match = ratingText.match(/(\d+[,.]?\d*)/);
  if (match) {
    return parseFloat(match[1].replace(',', '.'));
  }
  return 0;
}

/**
 * Extrai o número de avaliações de uma string
 * @param {string} reviewText - Texto das avaliações (ex: "1.234 avaliações")
 * @returns {number} Número de avaliações
 */
function extractReviewCount(reviewText) {
  if (!reviewText) return 0;
  
  // Remove pontos e vírgulas de separação de milhares
  const cleanText = reviewText.replace(/[.,]/g, '');
  const match = cleanText.match(/(\d+)/);
  
  return match ? parseInt(match[1]) : 0;
}

/**
 * Normaliza URLs relativas para absolutas
 * @param {string} url - URL que pode ser relativa ou absoluta
 * @returns {string} URL absoluta
 */
function normalizeURL(url) {
  if (!url) return '';
  
  if (url.startsWith('//')) {
    return `https:${url}`;
  }
  
  if (url.startsWith('/')) {
    return `${SCRAPER_CONFIG.baseURL}${url}`;
  }
  
  return url;
}

/**
 * Extrai dados de um elemento de produto
 * @param {Element} productElement - Elemento DOM do produto
 * @returns {Object|null} Dados do produto ou null se inválido
 */
function extractProductData(productElement) {
  try {
    // Seletores para diferentes elementos do produto
    const selectors = {
      title: 'h2 a span, [data-cy="title-recipe-link"] span, .a-size-mini span, .a-size-base-plus',
      rating: '.a-icon-alt, .a-offscreen',
      reviewCount: '.a-size-base, .a-link-normal',
      image: '.s-image, img',
      productLink: 'h2 a, [data-cy="title-recipe-link"]'
    };

    // Debug: Log dos elementos encontrados
    const debugInfo = {};
    
    // Extrair título
    const titleElement = productElement.querySelector(selectors.title);
    const title = titleElement?.textContent?.trim();
    debugInfo.titleElement = titleElement ? 'Encontrado' : 'Não encontrado';
    debugInfo.titleText = title || 'N/A';

    if (!title || title.length < 3) {
      // console.log(`   🔍 DEBUG - Título muito curto ou vazio: "${title}"`);
      return null; // Produto inválido sem título adequado
    }

    // Extrair rating
    const ratingElement = productElement.querySelector(selectors.rating);
    const ratingText = ratingElement?.textContent || ratingElement?.getAttribute('alt') || '';
    const rating = extractRating(ratingText);
    debugInfo.ratingElement = ratingElement ? 'Encontrado' : 'Não encontrado';
    debugInfo.ratingText = ratingText || 'N/A';

    // Extrair número de avaliações
    const reviewElements = productElement.querySelectorAll(selectors.reviewCount);
    let reviewCount = 0;
    debugInfo.reviewElements = reviewElements.length;
    
    for (const element of reviewElements) {
      const text = element.textContent?.trim() || '';
      if (text.match(/\d+/) && (text.includes('avalia') || text.includes('review'))) {
        reviewCount = extractReviewCount(text);
        debugInfo.reviewText = text;
        break;
      }
    }

    // Extrair URL da imagem
    const imageElement = productElement.querySelector(selectors.image);
    const imageUrl = imageElement?.src || imageElement?.getAttribute('data-src') || '';
    debugInfo.imageElement = imageElement ? 'Encontrado' : 'Não encontrado';

    // Extrair URL do produto
    const linkElement = productElement.querySelector(selectors.productLink);
    const productPath = linkElement?.getAttribute('href') || '';
    const productUrl = normalizeURL(productPath);
    debugInfo.linkElement = linkElement ? 'Encontrado' : 'Não encontrado';

    // Log de debug detalhado (descomente se necessário)
    // console.log(`   🔍 DEBUG ELEMENTOS:`, debugInfo);

    return {
      title: title.substring(0, 200), // Limitar tamanho do título
      rating: Math.round(rating * 10) / 10, // Arredondar para 1 casa decimal
      reviewCount,
      imageUrl: normalizeURL(imageUrl),
      productUrl,
      // Adicionar info de debug (opcional)
      debug: process.env.NODE_ENV === 'development' ? debugInfo : undefined
    };

  } catch (error) {
    console.warn('❌ Erro ao extrair dados do produto:', error.message);
    return null;
  }
}

/**
 * Função principal para fazer scraping de produtos da Amazon
 * @param {string} keyword - Palavra-chave para busca
 * @returns {Promise<Array>} Array de produtos encontrados
 */
export async function scrapeAmazonProducts(keyword) {
  let retries = 0;
  
  while (retries < SCRAPER_CONFIG.maxRetries) {
    try {
      console.log(`Tentativa ${retries + 1}/${SCRAPER_CONFIG.maxRetries} para keyword: "${keyword}"`);
      
      // Construir URL de busca
      const searchURL = buildSearchURL(keyword);
      console.log(`Fazendo requisição para: ${searchURL}`);

      // Fazer requisição HTTP
      const response = await axios.get(searchURL, {
        headers: getHeaders(),
        timeout: SCRAPER_CONFIG.timeout,
        maxRedirects: 5,
        validateStatus: status => status < 400 // Aceitar redirects
      });

      // Verificar se a resposta é válida
      if (!response.data || typeof response.data !== 'string') {
        throw new Error('Resposta inválida da Amazon');
      }

      console.log(`Resposta recebida: ${response.status} - ${response.data.length} bytes`);

      // Parse do HTML com JSDOM
      const dom = new JSDOM(response.data, {
        url: searchURL,
        pretendToBeVisual: false,
        resources: 'usable'
      });

      const document = dom.window.document;

      // Seletores para produtos (Amazon usa vários formatos)
      const productSelectors = [
        '[data-component-type="s-search-result"]', // 👈 ESTE É O SELETOR PRINCIPAL
        '.s-result-item[data-component-type="s-search-result"]',
        '.sg-col-inner .s-widget-container',
        '[cel_widget_id*="MAIN-SEARCH_RESULTS"]'
      ];

      let productElements = [];

      // Tentar diferentes seletores até encontrar produtos
      for (const selector of productSelectors) {
        console.log(`🔍 Tentando seletor: ${selector}`);
        productElements = Array.from(document.querySelectorAll(selector));
        if (productElements.length > 0) {
          console.log(`✅ Encontrados ${productElements.length} produtos com seletor: ${selector}`);
          break;
        } else {
          console.log(`❌ Nenhum produto encontrado com seletor: ${selector}`);
        }
      }

      if (productElements.length === 0) {
        console.warn('Nenhum produto encontrado na página');
        
        // Verificar se há elementos indicando bloqueio ou captcha
        const captchaCheck = document.querySelector('form[action*="captcha"]');
        const accessDenied = document.querySelector('*')?.textContent?.includes('access denied');
        
        if (captchaCheck || accessDenied) {
          throw new Error('Acesso bloqueado pela Amazon (possível detecção de bot)');
        }
        
        return []; // Retornar array vazio em vez de erro
      }

      // Extrair dados de cada produto
      const products = [];
      
      console.log(`\n🔍 PRODUTOS ENCONTRADOS PELO SELETOR:`);
      console.log(`${'='.repeat(80)}`);
      
      for (let i = 0; i < Math.min(productElements.length, 20); i++) { // Limitar a 20 produtos
        const element = productElements[i];
        const productData = extractProductData(element);
        
        // Log detalhado de cada produto encontrado
        console.log(`\n📦 PRODUTO ${i + 1}:`);
        console.log(`   HTML Preview: ${element.outerHTML.substring(0, 200)}...`);
        
        if (productData && productData.title) {
          console.log(`   ✅ Título: ${productData.title.substring(0, 60)}...`);
          console.log(`   ⭐ Rating: ${productData.rating}/5`);
          console.log(`   📊 Avaliações: ${productData.reviewCount}`);
          console.log(`   🖼️  Imagem: ${productData.imageUrl ? 'Encontrada' : 'Não encontrada'}`);
          console.log(`   🔗 Link: ${productData.productUrl ? 'Encontrado' : 'Não encontrado'}`);
          
          products.push({
            ...productData,
            position: i + 1 // Adicionar posição na busca
          });
        } else {
          console.log(`   ❌ Produto inválido ou sem título adequado`);
          
          // Debug adicional para produtos que falharam
          const titleElement = element.querySelector('h2 a span, [data-cy="title-recipe-link"] span, .a-size-mini span');
          const titleText = titleElement?.textContent?.trim() || 'TÍTULO NÃO ENCONTRADO';
          console.log(`   🔍 Título encontrado: "${titleText}"`);
        }
        
        console.log(`   ${'─'.repeat(60)}`);
      }

      console.log(`\n✅ RESUMO DA EXTRAÇÃO:`);
      console.log(`   📊 Produtos encontrados pelo seletor: ${productElements.length}`);
      console.log(`   ✅ Produtos válidos extraídos: ${products.length}`);
      console.log(`   ❌ Produtos rejeitados: ${Math.min(productElements.length, 20) - products.length}`);
      console.log(`${'='.repeat(80)}\n`);

      // Limpar DOM
      dom.window.close();

      return products;

    } catch (error) {
      retries++;
      console.error(`Erro na tentativa ${retries}:`, error.message);

      if (retries >= SCRAPER_CONFIG.maxRetries) {
        // Após esgotar tentativas, lançar erro específico
        if (error.code === 'ENOTFOUND') {
          throw new Error('Erro de DNS: Não foi possível conectar com a Amazon');
        } else if (error.code === 'ETIMEDOUT') {
          throw new Error('Timeout: Amazon não respondeu dentro do tempo limite');
        } else if (error.response?.status === 503) {
          throw new Error('Amazon temporariamente indisponível (503)');
        } else if (error.response?.status === 429) {
          throw new Error('Muitas requisições - Rate limit atingido');
        } else {
          throw new Error(`Erro no scraping: ${error.message}`);
        }
      }

      // Aguardar antes de tentar novamente (backoff exponencial)
      const delay = Math.pow(2, retries) * 1000;
      console.log(`Aguardando ${delay}ms antes da próxima tentativa...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}