/**
 * Frontend JavaScript para Amazon Scraper
 * Autor: Amazon Scraper Frontend
 * Descrição: Lógica principal da interface do usuário
 */

// Configurações da aplicação
const CONFIG = {
  API_BASE_URL: 'http://localhost:3000',
  DEBOUNCE_DELAY: 300,
  MIN_KEYWORD_LENGTH: 2,
  MAX_KEYWORD_LENGTH: 100
};

// Estado da aplicação
let currentKeyword = '';
let isSearching = false;
let searchTimeout = null;

// Elementos DOM
const elements = {
  searchInput: document.getElementById('searchInput'),
  searchBtn: document.getElementById('searchBtn'),
  btnText: document.querySelector('.btn-text'),
  btnLoader: document.querySelector('.btn-loader'),
  resultsSection: document.getElementById('resultsSection'),
  loadingSection: document.getElementById('loadingSection'),
  errorSection: document.getElementById('errorSection'),
  emptySection: document.getElementById('emptySection'),
  resultsTitle: document.getElementById('resultsTitle'),
  resultsStats: document.getElementById('resultsStats'),
  productsGrid: document.getElementById('productsGrid'),
  errorMessage: document.getElementById('errorMessage'),
  retryBtn: document.getElementById('retryBtn')
};

/**
 * Inicialização da aplicação
 */
function init() {
  console.log('🚀 Amazon Scraper Frontend iniciado');
  
  // Event listeners
  elements.searchBtn.addEventListener('click', handleSearch);
  elements.searchInput.addEventListener('keydown', handleKeyPress);
  elements.searchInput.addEventListener('input', handleInputChange);
  elements.retryBtn.addEventListener('click', handleRetry);
  
  // Event listeners para sugestões
  const suggestionBtns = document.querySelectorAll('.suggestion-btn');
  suggestionBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const keyword = btn.getAttribute('data-keyword');
      elements.searchInput.value = keyword;
      handleSearch();
    });
  });

  // Focar no input ao carregar
  elements.searchInput.focus();

  console.log('✅ Event listeners configurados');
}

/**
 * Manipula a mudança no input de busca (debounced)
 */
function handleInputChange(event) {
  const value = event.target.value.trim();
  
  // Clear timeout anterior
  if (searchTimeout) {
    clearTimeout(searchTimeout);
  }
  
  // Validação básica
  if (value.length === 0) {
    resetSections();
    return;
  }
  
  // Debounce para evitar muitas requisições
  searchTimeout = setTimeout(() => {
    if (value !== currentKeyword && value.length >= CONFIG.MIN_KEYWORD_LENGTH) {
      // Auto-search pode ser implementado aqui se desejado
      // handleSearch();
    }
  }, CONFIG.DEBOUNCE_DELAY);
}

/**
 * Manipula o pressionamento de teclas no input
 */
function handleKeyPress(event) {
  if (event.key === 'Enter') {
    event.preventDefault();
    handleSearch();
  }
}

/**
 * Manipula o botão de retry
 */
function handleRetry() {
  if (currentKeyword) {
    performSearch(currentKeyword);
  }
}

/**
 * Função principal de busca
 */
async function handleSearch() {
  const keyword = elements.searchInput.value.trim();
  
  // Validações
  if (!keyword) {
    showError('Por favor, digite uma palavra-chave para buscar.');
    elements.searchInput.focus();
    return;
  }
  
  if (keyword.length < CONFIG.MIN_KEYWORD_LENGTH) {
    showError(`A palavra-chave deve ter pelo menos ${CONFIG.MIN_KEYWORD_LENGTH} caracteres.`);
    elements.searchInput.focus();
    return;
  }
  
  if (keyword.length > CONFIG.MAX_KEYWORD_LENGTH) {
    showError(`A palavra-chave não pode ter mais que ${CONFIG.MAX_KEYWORD_LENGTH} caracteres.`);
    elements.searchInput.focus();
    return;
  }
  
  // Evitar múltiplas buscas simultâneas
  if (isSearching) {
    console.log('⚠️ Busca já em andamento, ignorando');
    return;
  }
  
  currentKeyword = keyword;
  await performSearch(keyword);
}

/**
 * Executa a busca na API
 */
async function performSearch(keyword) {
  console.log(`🔍 Iniciando busca para: "${keyword}"`);
  
  try {
    // Atualizar UI para estado de loading
    setSearchingState(true);
    showLoading();
    
    // Construir URL da API
    const apiUrl = `${CONFIG.API_BASE_URL}/api/scrape?keyword=${encodeURIComponent(keyword)}`;
    console.log(`📡 Fazendo requisição para: ${apiUrl}`);
    
    // Fazer requisição
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      // Timeout manual
      signal: AbortSignal.timeout(30000) // 30 segundos
    });
    
    // Verificar status da resposta
    if (!response.ok) {
      let errorMessage = 'Erro na comunicação com o servidor';
      
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorMessage;
      } catch (parseError) {
        console.warn('Não foi possível parsear erro do servidor:', parseError);
      }
      
      throw new Error(`HTTP ${response.status}: ${errorMessage}`);
    }
    
    // Parsear resposta JSON
    const data = await response.json();
    console.log('📦 Resposta recebida:', data);
    
    // Verificar se a busca foi bem-sucedida
    if (!data.success) {
      throw new Error(data.error || 'Erro desconhecido na busca');
    }
    
    // Processar e exibir resultados
    const products = data.data || [];
    
    if (products.length === 0) {
      showEmpty();
    } else {
      showResults(products, data);
    }
    
  } catch (error) {
    console.error('❌ Erro na busca:', error);
    
    // Tratamento específico de diferentes tipos de erro
    let userMessage = 'Erro inesperado durante a busca.';
    
    if (error.name === 'AbortError' || error.name === 'TimeoutError') {
      userMessage = 'A busca demorou muito para responder. Tente novamente com uma palavra-chave mais específica.';
    } else if (error.message.includes('Failed to fetch')) {
      userMessage = 'Não foi possível conectar com o servidor. Verifique sua conexão e tente novamente.';
    } else if (error.message.includes('HTTP')) {
      userMessage = error.message;
    } else {
      userMessage = error.message;
    }
    
    showError(userMessage);
    
  } finally {
    setSearchingState(false);
  }
}

/**
 * Atualiza o estado de busca (loading)
 */
function setSearchingState(searching) {
  isSearching = searching;
  
  if (searching) {
    elements.searchBtn.disabled = true;
    elements.btnText.style.display = 'none';
    elements.btnLoader.style.display = 'flex';
  } else {
    elements.searchBtn.disabled = false;
    elements.btnText.style.display = 'inline';
    elements.btnLoader.style.display = 'none';
  }
}

/**
 * Exibe a seção de loading
 */
function showLoading() {
  resetSections();
  elements.loadingSection.style.display = 'block';
  elements.loadingSection.classList.add('fade-in');
}

/**
 * Exibe os resultados da busca
 */
function showResults(products, responseData) {
  console.log(`✅ Exibindo ${products.length} produtos`);
  
  resetSections();
  
  // Atualizar cabeçalho dos resultados
  elements.resultsTitle.textContent = `Resultados para "${currentKeyword}"`;
  elements.resultsStats.innerHTML = `
    <span>📦 ${products.length} produtos encontrados</span>
    ${responseData.executionTime ? `<span>⚡ ${responseData.executionTime}</span>` : ''}
  `;
  
  // Limpar grid de produtos
  elements.productsGrid.innerHTML = '';
  
  // Criar cards de produtos
  products.forEach((product, index) => {
    const productCard = createProductCard(product, index);
    elements.productsGrid.appendChild(productCard);
  });
  
  // Exibir seção de resultados
  elements.resultsSection.style.display = 'block';
  elements.resultsSection.classList.add('fade-in');
  
  // Scroll suave para os resultados
  elements.resultsSection.scrollIntoView({ 
    behavior: 'smooth',
    block: 'start'
  });
}

/**
 * Cria um card de produto
 */
function createProductCard(product, index) {
  const card = document.createElement('div');
  card.className = 'product-card';
  
  // Gerar estrelas para rating
  const stars = generateStars(product.rating);
  
  // Formatar número de avaliações
  const reviewText = formatReviewCount(product.reviewCount);
  
  card.innerHTML = `
    ${product.imageUrl ? `<img src="${product.imageUrl}" alt="${product.title}" class="product-image" loading="lazy">` : ''}
    <h3 class="product-title">${escapeHtml(product.title)}</h3>
    <div class="product-meta">
      <div class="product-rating">
        <span class="stars">${stars}</span>
        <span class="rating-value">${product.rating}/5</span>
      </div>
      <div class="review-count">${reviewText}</div>
    </div>
    <div class="product-actions">
      ${product.productUrl ? 
        `<a href="${product.productUrl}" target="_blank" rel="noopener noreferrer" class="view-btn">
          Ver na Amazon
        </a>` : 
        '<span class="view-btn" style="opacity: 0.5; cursor: not-allowed;">Link indisponível</span>'
      }
    </div>
  `;
  
  // Animação de entrada
  setTimeout(() => {
    card.style.animation = `fadeInUp 0.6s ease-out ${index * 0.1}s both`;
  }, 50);
  
  return card;
}

/**
 * Gera estrelas visuais para o rating
 */
function generateStars(rating) {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;
  const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
  
  let stars = '';
  
  // Estrelas cheias
  for (let i = 0; i < fullStars; i++) {
    stars += '⭐';
  }
  
  // Meia estrela
  if (hasHalfStar) {
    stars += '⭐'; // Simplificado - pode usar ícone de meia estrela
  }
  
  // Estrelas vazias
  for (let i = 0; i < emptyStars; i++) {
    stars += '☆';
  }
  
  return stars;
}

/**
 * Formata o número de avaliações
 */
function formatReviewCount(count) {
  if (!count || count === 0) {
    return 'Sem avaliações';
  }
  
  if (count < 1000) {
    return `${count} avaliações`;
  } else if (count < 1000000) {
    return `${(count / 1000).toFixed(1)}k avaliações`;
  } else {
    return `${(count / 1000000).toFixed(1)}M avaliações`;
  }
}

/**
 * Exibe a seção de erro
 */
function showError(message) {
  console.error('❌ Exibindo erro:', message);
  
  resetSections();
  elements.errorMessage.textContent = message;
  elements.errorSection.style.display = 'block';
  elements.errorSection.classList.add('fade-in');
}

/**
 * Exibe a seção de resultados vazios
 */
function showEmpty() {
  console.log('📭 Nenhum produto encontrado');
  
  resetSections();
  elements.emptySection.style.display = 'block';
  elements.emptySection.classList.add('fade-in');
}

/**
 * Reset todas as seções
 */
function resetSections() {
  const sections = [
    elements.resultsSection,
    elements.loadingSection,
    elements.errorSection,
    elements.emptySection
  ];
  
  sections.forEach(section => {
    section.style.display = 'none';
    section.classList.remove('fade-in');
  });
}

/**
 * Escapa HTML para prevenir XSS
 */
function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

/**
 * Utilitário para logs formatados
 */
function log(message, type = 'info') {
  const timestamp = new Date().toLocaleTimeString();
  const emoji = type === 'error' ? '❌' : type === 'success' ? '✅' : 'ℹ️';
  console.log(`${emoji} [${timestamp}] ${message}`);
}

// Inicializar quando o DOM estiver carregado
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// Service Worker para cache (opcional)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // Pode ser implementado para cache offline
    console.log('🔧 Service Worker disponível para implementação futura');
  });
}