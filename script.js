// Configuração OAuth 2.0 e Google Sheets API
const GOOGLE_CONFIG = {
    // Substitua pelos seus dados
    clientId: '716670112874-2bg2gr030ohrg5jv7rqoual8pu136t3e.apps.googleusercontent.com',
    apiKey: 'AIzaSyC7aVQCyO3sqH7NNb6S3JwEiKyWF_ggOmU',
    
    // Configurações da planilha
    spreadsheetId: '1QLhmly8lkDDlID2p8mog3IKJtP3Hc-aYsFYIipQQRCI',
    movimentacoesRange: 'Movimentacoes!A2:F',
    cotasRange: 'COTAS!A2:B',
    
    // Escopos necessários
    discoveryDocs: ['https://sheets.googleapis.com/$discovery/rest?version=v4'],
    scope: 'https://www.googleapis.com/auth/spreadsheets.readonly'
};

// Variáveis de autenticação
let gapi;
let tokenClient;
let isAuthorized = false;
let currentUser = null;

// Variáveis globais para armazenar os dados
let movimentacoesData = [];
let cotasData = [];
let filteredData = [];

// Elementos DOM para autenticação
const authElements = {
    authSection: document.getElementById('auth-section'),
    mainApp: document.getElementById('main-app'),
    authorizeBtn: document.getElementById('authorize-btn'),
    signoutBtn: document.getElementById('signout-btn'),
    signoutBtnHeader: document.getElementById('signout-btn-header'),
    authStatus: document.getElementById('auth-status'),
    userPhoto: document.getElementById('user-photo'),
    userName: document.getElementById('user-name'),
    userEmail: document.getElementById('user-email')
};
const elements = {
    loading: document.getElementById('loading'),
    cotaValue: document.getElementById('cota-value'),
    utilizadoValue: document.getElementById('utilizado-value'),
    recebidoValue: document.getElementById('recebido-value'),
    disponivelValue: document.getElementById('disponivel-value'),
    filterDate: document.getElementById('filter-date'),
    filterName: document.getElementById('filter-name'),
    clearFilters: document.getElementById('clear-filters'),
    refreshData: document.getElementById('refresh-data'),
    tableBody: document.getElementById('table-body'),
    tableCount: document.getElementById('table-count')
};

// Inicialização da aplicação
document.addEventListener('DOMContentLoaded', function() {
    initializeGoogleAPI();
});

// Inicializar Google API
async function initializeGoogleAPI() {
    try {
        showAuthStatus('Inicializando...', 'info');
        
        // Aguardar carregamento das APIs do Google
        await loadGoogleAPIs();
        
        // Inicializar GAPI
        await new Promise((resolve, reject) => {
            gapi.load('client', {
                callback: resolve,
                onerror: reject
            });
        });
        
        // Inicializar cliente da API
        await gapi.client.init({
            apiKey: GOOGLE_CONFIG.apiKey,
            discoveryDocs: GOOGLE_CONFIG.discoveryDocs,
        });
        
        // Configurar cliente OAuth 2.0
        tokenClient = google.accounts.oauth2.initTokenClient({
            client_id: GOOGLE_CONFIG.clientId,
            scope: GOOGLE_CONFIG.scope,
            callback: handleAuthCallback
        });
        
        setupAuthEventListeners();
        checkExistingAuth();
        showAuthStatus('Pronto para autenticação', 'info');
        
    } catch (error) {
        console.error('Erro ao inicializar Google API:', error);
        showAuthStatus('Erro na inicialização. Verifique a configuração.', 'error');
    }
}

// Aguardar carregamento das APIs do Google
function loadGoogleAPIs() {
    return new Promise((resolve) => {
        if (window.gapi && window.google) {
            resolve();
        } else {
            const checkInterval = setInterval(() => {
                if (window.gapi && window.google) {
                    clearInterval(checkInterval);
                    resolve();
                }
            }, 100);
        }
    });
}

// Configurar event listeners de autenticação
function setupAuthEventListeners() {
    authElements.authorizeBtn.addEventListener('click', handleAuthClick);
    authElements.signoutBtn.addEventListener('click', handleSignoutClick);
    authElements.signoutBtnHeader.addEventListener('click', handleSignoutClick);
}

// Verificar se já existe autenticação
function checkExistingAuth() {
    const token = gapi.client.getToken();
    if (token !== null && token.access_token) {
        isAuthorized = true;
        loadUserInfo();
        showMainApp();
    } else {
        showAuthSection();
    }
}

// Manipular clique no botão de autorização
async function handleAuthClick() {
    try {
        setButtonLoading(authElements.authorizeBtn, true);
        showAuthStatus('Abrindo janela de autenticação...', 'info');
        
        // Se já tiver token, revogar primeiro
        if (gapi.client.getToken() !== null) {
            google.accounts.oauth2.revoke(gapi.client.getToken().access_token);
            gapi.client.setToken('');
        }
        
        // Solicitar novo token
        tokenClient.requestAccessToken({ prompt: 'consent' });
        
    } catch (error) {
        console.error('Erro na autenticação:', error);
        showAuthStatus('Erro na autenticação. Tente novamente.', 'error');
        setButtonLoading(authElements.authorizeBtn, false);
    }
}

// Callback da autenticação
async function handleAuthCallback(response) {
    setButtonLoading(authElements.authorizeBtn, false);
    
    if (response.error !== undefined) {
        console.error('Erro na autenticação:', response);
        showAuthStatus('Autenticação falhou. Tente novamente.', 'error');
        return;
    }
    
    try {
        showAuthStatus('Autenticação realizada com sucesso!', 'success');
        isAuthorized = true;
        
        await loadUserInfo();
        await loadAppData();
        showMainApp();
        
    } catch (error) {
        console.error('Erro após autenticação:', error);
        showAuthStatus('Erro ao carregar dados. Verifique as permissões.', 'error');
    }
}

// Carregar informações do usuário
async function loadUserInfo() {
    try {
        // Usar a API do Google para obter informações do usuário
        const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: {
                'Authorization': `Bearer ${gapi.client.getToken().access_token}`
            }
        });
        
        if (response.ok) {
            currentUser = await response.json();
            updateUserInterface();
        }
        
    } catch (error) {
        console.error('Erro ao carregar informações do usuário:', error);
    }
}

// Atualizar interface com informações do usuário
function updateUserInterface() {
    if (currentUser) {
        authElements.userPhoto.src = currentUser.picture || '';
        authElements.userName.textContent = currentUser.name || 'Usuário';
        authElements.userEmail.textContent = currentUser.email || '';
        authElements.userPhoto.alt = currentUser.name || 'Usuário';
    }
}

// Manipular logout
function handleSignoutClick() {
    if (isAuthorized) {
        // Revogar token
        const token = gapi.client.getToken();
        if (token !== null) {
            google.accounts.oauth2.revoke(token.access_token);
            gapi.client.setToken('');
        }
        
        isAuthorized = false;
        currentUser = null;
        
        showAuthSection();
        showAuthStatus('Logout realizado com sucesso.', 'success');
        
        // Limpar dados
        movimentacoesData = [];
        cotasData = [];
        filteredData = [];
    }
}

// Carregar dados da aplicação após autenticação
async function loadAppData() {
    try {
        showLoading(true);
        
        await loadGoogleSheetsData();
        
        setupEventListeners();
        populateFilters();
        calculateValues();
        renderTable();
        
        showLoading(false);
    } catch (error) {
        console.error('Erro ao carregar dados:', error);
        showAuthStatus('Erro ao carregar dados da planilha.', 'error');
        showLoading(false);
    }
}

// Mostrar seção de autenticação
function showAuthSection() {
    authElements.authSection.style.display = 'flex';
    authElements.mainApp.style.display = 'none';
}

// Mostrar aplicação principal
function showMainApp() {
    authElements.authSection.style.display = 'none';
    authElements.mainApp.style.display = 'block';
}

// Mostrar status de autenticação
function showAuthStatus(message, type = 'info') {
    const status = authElements.authStatus;
    status.textContent = message;
    status.className = `auth-status ${type}`;
    status.style.display = 'block';
    
    // Auto-hide após 5 segundos para mensagens de sucesso
    if (type === 'success') {
        setTimeout(() => {
            status.style.display = 'none';
        }, 5000);
    }
}

// Definir estado de loading nos botões
function setButtonLoading(button, loading) {
    if (loading) {
        button.classList.add('loading');
        button.disabled = true;
    } else {
        button.classList.remove('loading');
        button.disabled = false;
    }
}

// Função para carregar dados do Google Sheets com OAuth
async function loadGoogleSheetsData() {
    try {
        if (!isAuthorized) {
            throw new Error('Usuário não autenticado');
        }
        
        // Carregar dados das movimentações
        const movimentacoesResponse = await gapi.client.sheets.spreadsheets.values.get({
            spreadsheetId: GOOGLE_CONFIG.spreadsheetId,
            range: GOOGLE_CONFIG.movimentacoesRange,
        });
        
        // Carregar dados das cotas
        const cotasResponse = await gapi.client.sheets.spreadsheets.values.get({
            spreadsheetId: GOOGLE_CONFIG.spreadsheetId,
            range: GOOGLE_CONFIG.cotasRange,
        });
        
        // Processar dados
        movimentacoesData = processMovimentacoesData(movimentacoesResponse.result.values);
        cotasData = processCotasData(cotasResponse.result.values);
        filteredData = [...movimentacoesData];
        
        console.log('Dados carregados com sucesso:', {
            movimentacoes: movimentacoesData.length,
            cotas: cotasData.length
        });
        
    } catch (error) {
        console.error('Erro ao carregar dados do Google Sheets:', error);
        
        // Se for erro de autenticação, mostrar tela de login
        if (error.status === 401 || error.status === 403) {
            handleSignoutClick();
            showAuthStatus('Sessão expirada. Faça login novamente.', 'error');
        } else {
            throw error;
        }
    }
}

// Função para dados mockados (para demonstração)
function loadMockData() {
    // Dados de exemplo baseados na estrutura fornecida
    movimentacoesData = [
        {
            servidor: 'MARCOS OLIVEIRA DA SILVA',
            dataInicial: '16/12/2024',
            dataFinal: '20/12/2024',
            destino: 'Água Clara',
            valor: 900.00,
            envioPagamento: '21/01/2025'
        },
        {
            servidor: 'SERGIO LUIZ RIBEIRO LEITE',
            dataInicial: '07/01/2025',
            dataFinal: '10/01/2025',
            destino: 'Água Clara',
            valor: 700.00,
            envioPagamento: '21/01/2025'
        },
        {
            servidor: 'SERGIO LUIZ RIBEIRO LEITE',
            dataInicial: '13/01/2025',
            dataFinal: '17/01/2025',
            destino: 'Água Clara',
            valor: 900.00,
            envioPagamento: '21/01/2025'
        },
        {
            servidor: 'ANDRE RODRIGO DE OLIVEIRA SANDOVETE',
            dataInicial: '13/01/2025',
            dataFinal: '13/01/2025',
            destino: 'Brasilândia',
            valor: 100.00,
            envioPagamento: '21/01/2025'
        },
        {
            servidor: 'CLEUNICE MENDONÇA DE MELO',
            dataInicial: '13/01/2025',
            dataFinal: '18/01/2025',
            destino: 'Brasilândia',
            valor: 1100.00,
            envioPagamento: '21/01/2025'
        }
    ];
    
    cotasData = [
        { cota: 12000.00, mes: '2025-01' },
        { cota: 12000.00, mes: '2025-02' },
        { cota: 12000.00, mes: '2025-03' }
    ];
    
    filteredData = [...movimentacoesData];
}

// Processar dados das movimentações vindos do Google Sheets
function processMovimentacoesData(rawData) {
    if (!rawData || rawData.length < 2) return [];
    
    const [headers, ...rows] = rawData;
    
    return rows.map(row => ({
        servidor: row[0] || '',
        dataInicial: row[1] || '',
        dataFinal: row[2] || '',
        destino: row[3] || '',
        valor: parseFloat(row[4]?.replace('R$', '').replace(/\./g, '').replace(',', '.')) || 0,
        envioPagamento: row[5] || ''
    }));
}

// Processar dados das cotas vindos do Google Sheets
function processCotasData(rawData) {
    if (!rawData || rawData.length < 2) return [];
    
    const [headers, ...rows] = rawData;
    
    return rows.map(row => ({
        cota: parseFloat(row[0]?.replace('R$', '').replace(/\./g, '').replace(',', '.')) || 0,
        mes: row[1] || ''
    }));
}

// Configurar event listeners
function setupEventListeners() {
    elements.filterDate.addEventListener('change', applyFilters);
    elements.filterName.addEventListener('input', debounce(applyFilters, 300));
    elements.clearFilters.addEventListener('click', clearAllFilters);
    elements.refreshData.addEventListener('click', handleRefreshClick);
}

// Manipular clique no botão de refresh
async function handleRefreshClick() {
    setButtonLoading(elements.refreshData, true);
    await refreshData();
    setButtonLoading(elements.refreshData, false);
}

// Debounce para otimizar a busca por nome
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Popular filtros
function populateFilters() {
    const months = new Set();
    
    // Adicionar meses dos pedidos enviados para pagamento
    movimentacoesData.forEach(item => {
        if (item.envioPagamento) {
            const date = parseDate(item.envioPagamento);
            if (date) {
                const monthYear = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                months.add(monthYear);
            }
        }
    });
    
    // Ordenar meses (pedidos não enviados sempre no final)
    const sortedMonths = Array.from(months).sort();
    
    // Limpar e popular o select
    elements.filterDate.innerHTML = '<option value="">Todos os períodos</option>';
    
    sortedMonths.forEach(month => {
        const option = document.createElement('option');
        option.value = month;
        option.textContent = formatMonthYear(month);
        elements.filterDate.appendChild(option);
    });
    
    // Adicionar opção para pedidos não enviados
    const pendingOption = document.createElement('option');
    pendingOption.value = 'pending';
    pendingOption.textContent = 'Pedidos não enviados';
    elements.filterDate.appendChild(pendingOption);
}

// Aplicar filtros
function applyFilters() {
    const dateFilter = elements.filterDate.value;
    const nameFilter = elements.filterName.value.toLowerCase().trim();
    
    filteredData = movimentacoesData.filter(item => {
        // Filtro por data
        let dateMatch = true;
        if (dateFilter) {
            if (dateFilter === 'pending') {
                dateMatch = !item.envioPagamento;
            } else {
                if (item.envioPagamento) {
                    const date = parseDate(item.envioPagamento);
                    if (date) {
                        const monthYear = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                        dateMatch = monthYear === dateFilter;
                    } else {
                        dateMatch = false;
                    }
                } else {
                    dateMatch = false;
                }
            }
        }
        
        // Filtro por nome (busca parcial)
        let nameMatch = true;
        if (nameFilter) {
            nameMatch = item.servidor.toLowerCase().includes(nameFilter);
        }
        
        return dateMatch && nameMatch;
    });
    
    renderTable();
}

// Limpar todos os filtros
function clearAllFilters() {
    elements.filterDate.value = '';
    elements.filterName.value = '';
    filteredData = [...movimentacoesData];
    renderTable();
}

// Calcular valores dos cards
function calculateValues() {
    const currentMonth = getCurrentMonth();
    
    // Obter cota mensal atual
    const currentCota = cotasData.find(item => item.mes === currentMonth);
    const cotaMensal = currentCota ? currentCota.cota : 0;
    
    // Calcular valores
    const utilizado = movimentacoesData
        .filter(item => item.envioPagamento)
        .reduce((sum, item) => sum + item.valor, 0);
    
    const recebido = movimentacoesData
        .filter(item => !item.envioPagamento)
        .reduce((sum, item) => sum + item.valor, 0);
    
    const disponivel = cotaMensal - utilizado - recebido;
    
    // Atualizar valores nos cards com animação
    animateValue(elements.cotaValue, cotaMensal);
    animateValue(elements.utilizadoValue, utilizado);
    animateValue(elements.recebidoValue, recebido);
    animateValue(elements.disponivelValue, disponivel);
}

// Animar valores dos cards
function animateValue(element, finalValue) {
    const duration = 1000;
    const steps = 60;
    const stepValue = finalValue / steps;
    let currentValue = 0;
    let step = 0;
    
    const timer = setInterval(() => {
        currentValue += stepValue;
        step++;
        
        if (step >= steps) {
            currentValue = finalValue;
            clearInterval(timer);
        }
        
        element.textContent = formatCurrency(currentValue);
    }, duration / steps);
}

// Renderizar tabela
function renderTable() {
    const tbody = elements.tableBody;
    tbody.innerHTML = '';
    
    if (filteredData.length === 0) {
        const row = tbody.insertRow();
        const cell = row.insertCell(0);
        cell.colSpan = 6;
        cell.textContent = 'Nenhum registro encontrado';
        cell.style.textAlign = 'center';
        cell.style.padding = '2rem';
        cell.style.color = '#6c757d';
    } else {
        filteredData.forEach(item => {
            const row = tbody.insertRow();
            
            row.insertCell(0).textContent = item.servidor;
            row.insertCell(1).textContent = item.dataInicial;
            row.insertCell(2).textContent = item.dataFinal;
            row.insertCell(3).textContent = item.destino;
            row.insertCell(4).textContent = formatCurrency(item.valor);
            
            const statusCell = row.insertCell(5);
            if (item.envioPagamento) {
                statusCell.innerHTML = `<span class="status-paid">${item.envioPagamento}</span>`;
            } else {
                statusCell.innerHTML = '<span class="status-pending">Pendente</span>';
            }
        });
    }
    
    // Atualizar contador
    elements.tableCount.textContent = `Total de registros: ${filteredData.length}`;
}

// Funções utilitárias
function formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(value);
}

function formatMonthYear(monthYear) {
    const [year, month] = monthYear.split('-');
    const monthNames = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    return `${monthNames[parseInt(month) - 1]} ${year}`;
}

function parseDate(dateString) {
    // Assumindo formato DD/MM/YYYY
    const parts = dateString.split('/');
    if (parts.length === 3) {
        const day = parseInt(parts[0]);
        const month = parseInt(parts[1]) - 1; // JavaScript months are 0-based
        const year = parseInt(parts[2]);
        return new Date(year, month, day);
    }
    return null;
}

function getCurrentMonth() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function showLoading(show) {
    elements.loading.style.display = show ? 'flex' : 'none';
}

function showError(message) {
    alert(message); // Em produção, considere usar uma biblioteca de notificações mais elegante
}

// Função para exportar dados (funcionalidade adicional)
function exportToCSV() {
    const headers = ['Servidor', 'Data Inicial', 'Data Final', 'Destino', 'Valor', 'Envio para Pagamento'];
    const csvContent = [
        headers.join(','),
        ...filteredData.map(item => [
            `"${item.servidor}"`,
            item.dataInicial,
            item.dataFinal,
            `"${item.destino}"`,
            item.valor.toFixed(2).replace('.', ','),
            item.envioPagamento || 'Pendente'
        ].join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'diarias_agencia_regional.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Configuração para integração futura com Google Sheets
class GoogleSheetsIntegration {
    constructor(config) {
        this.config = config;
    }
    
    async loadData() {
        try {
            const [movimentacoes, cotas] = await Promise.all([
                this.fetchSheetData(this.config.movimentacoesRange),
                this.fetchSheetData(this.config.cotasRange)
            ]);
            
            return {
                movimentacoes: this.processMovimentacoesData(movimentacoes),
                cotas: this.processCotasData(cotas)
            };
        } catch (error) {
            console.error('Erro ao carregar dados do Google Sheets:', error);
            throw error;
        }
    }
    
    async fetchSheetData(range) {
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${this.config.spreadsheetId}/values/${range}?key=${this.config.apiKey}`;
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`Erro na API: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        return data.values || [];
    }
    
    processMovimentacoesData(rawData) {
        if (!rawData || rawData.length < 2) return [];
        
        const [headers, ...rows] = rawData;
        
        return rows.map(row => ({
            servidor: row[0] || '',
            dataInicial: row[1] || '',
            dataFinal: row[2] || '',
            destino: row[3] || '',
            valor: this.parseValue(row[4]),
            envioPagamento: row[5] || ''
        }));
    }
    
    processCotasData(rawData) {
        if (!rawData || rawData.length < 2) return [];
        
        const [headers, ...rows] = rawData;
        
        return rows.map(row => ({
            cota: this.parseValue(row[0]),
            mes: row[1] || ''
        }));
    }
    
    parseValue(valueString) {
        if (!valueString) return 0;
        
        // Remove símbolos de moeda e formata para número
        const cleanValue = valueString
            .toString()
            .replace(/[R$\s]/g, '')
            .replace(/\./g, '')
            .replace(',', '.');
            
        return parseFloat(cleanValue) || 0;
    }
}

// Função para integração com Google Sheets (descomente quando configurar)
/*
async function integrateWithGoogleSheets() {
    try {
        const integration = new GoogleSheetsIntegration(GOOGLE_SHEETS_CONFIG);
        const data = await integration.loadData();
        
        movimentacoesData = data.movimentacoes;
        cotasData = data.cotas;
        filteredData = [...movimentacoesData];
        
        populateFilters();
        calculateValues();
        renderTable();
        
    } catch (error) {
        console.error('Erro na integração com Google Sheets:', error);
        showError('Erro ao carregar dados da planilha. Verifique a configuração.');
    }
}
*/

// Event listeners adicionais
document.addEventListener('keydown', function(event) {
    // Ctrl + E para exportar
    if (event.ctrlKey && event.key === 'e') {
        event.preventDefault();
        exportToCSV();
    }
    
    // Escape para limpar filtros
    if (event.key === 'Escape') {
        clearAllFilters();
    }
});

// Função para recarregar dados (com verificação de autenticação)
async function refreshData() {
    if (!isAuthorized) {
        showAuthStatus('Não autenticado. Faça login novamente.', 'error');
        showAuthSection();
        return;
    }
    
    try {
        showLoading(true);
        await loadGoogleSheetsData();
        populateFilters();
        calculateValues();
        renderTable();
        showLoading(false);
        
        // Mostrar feedback de sucesso
        const now = new Date().toLocaleTimeString('pt-BR');
        showAuthStatus(`Dados atualizados às ${now}`, 'success');
        
    } catch (error) {
        console.error('Erro ao recarregar dados:', error);
        showAuthStatus('Erro ao atualizar dados.', 'error');
        showLoading(false);
    }
}

// Atualizar dados automaticamente a cada 10 minutos (se autenticado)
setInterval(() => {
    if (isAuthorized && authElements.mainApp.style.display !== 'none') {
        refreshData();
    }
}, 10 * 60 * 1000);

// Verificar token e renovar se necessário
function checkTokenExpiration() {
    const token = gapi.client.getToken();
    if (token) {
        // Verificar se o token está próximo do vencimento (5 minutos antes)
        const expiresIn = token.expires_at ? token.expires_at - Date.now() : 0;
        const fiveMinutes = 5 * 60 * 1000;
        
        if (expiresIn < fiveMinutes && expiresIn > 0) {
            console.log('Token próximo do vencimento, renovando...');
            tokenClient.requestAccessToken({ prompt: '' });
        }
    }
}

// Verificar expiração do token a cada minuto
setInterval(checkTokenExpiration, 60 * 1000);

// Melhorias de performance
function optimizeTable() {
    // Implementar paginação se necessário
    const ITEMS_PER_PAGE = 50;
    
    if (filteredData.length > ITEMS_PER_PAGE) {
        // Implementar lógica de paginação aqui
        console.log('Muitos registros, considere implementar paginação');
    }
}

// Função para criar um botão de exportação (opcional)
function addExportButton() {
    const exportBtn = document.createElement('button');
    exportBtn.innerHTML = '<i class="fas fa-download"></i> Exportar CSV';
    exportBtn.className = 'clear-btn';
    exportBtn.style.background = 'linear-gradient(135deg, #27ae60, #229954)';
    exportBtn.onclick = exportToCSV;
    
    const filtersContainer = document.querySelector('.filters-container');
    filtersContainer.appendChild(exportBtn);
}

// Inicializar botão de exportação
setTimeout(addExportButton, 1000);