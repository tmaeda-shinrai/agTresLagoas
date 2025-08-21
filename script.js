// VARIÁVEIS GLOBAIS
// =========================
let movimentacoesData = []; 
let cotasData = [];

let filteredData = [...movimentacoesData];
let currentMonthFilter = "";
let currentNameFilter = "";

// Elementos DOM
const elements = {
    cotaValue: document.getElementById('cota-value'),
    utilizadoValue: document.getElementById('utilizado-value'),
    recebidoValue: document.getElementById('recebido-value'),
    disponivelValue: document.getElementById('disponivel-value'),
    monthFilter: document.getElementById('month-filter'),
    nameFilter: document.getElementById('name-filter'),
    clearFilters: document.getElementById('clear-filters'),
    tableBody: document.getElementById('table-body'),
    tableCount: document.getElementById('table-count'),
    loading: document.getElementById('loading')
};

// Funções utilitárias (mantêm-se as mesmas)
function formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function parseDate(dateString) {
    const [day, month, year] = dateString.split('/');
    return new Date(year, month - 1, day);
}

function getMonthYear(dateString) {
    const date = parseDate(dateString);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function getMonthYearDisplay(dateString) {
    const date = parseDate(dateString);
    const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    return `${months[date.getMonth()]} ${date.getFullYear()}`;
}

function populateMonthFilter() {
    const monthsSet = new Set();
    movimentacoesData.forEach(item => {
        if (item.envioPagamento) {
            monthsSet.add(getMonthYear(item.envioPagamento));
        }
    });
    const months = Array.from(monthsSet).sort();
    elements.monthFilter.innerHTML = '<option value="">Todos os períodos</option>';
    months.forEach(month => {
        const option = document.createElement('option');
        option.value = month;
        option.textContent = getMonthYearDisplay(`01/${month.split('-')[1]}/${month.split('-')[0]}`);
        elements.monthFilter.appendChild(option);
    });
    const pendingOption = document.createElement('option');
    pendingOption.value = 'pending';
    pendingOption.textContent = 'Pedidos Não Pagos';
    elements.monthFilter.appendChild(pendingOption);
}

function updateCards() {
    const currentDate = new Date();
    const currentMonth = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
    const cotaAtual = cotasData.find(c => c.mes === currentMonth);
    const cotaMensal = cotaAtual ? cotaAtual.cota : 12000.00;
    const utilizado = filteredData.filter(item => item.envioPagamento).reduce((sum, item) => sum + item.valor, 0);
    const recebido = filteredData.filter(item => !item.envioPagamento).reduce((sum, item) => sum + item.valor, 0);
    const disponivel = cotaMensal - utilizado - recebido;
    animateValue(elements.cotaValue, cotaMensal);
    animateValue(elements.utilizadoValue, utilizado);
    animateValue(elements.recebidoValue, recebido);
    animateValue(elements.disponivelValue, disponivel);
}

function animateValue(element, targetValue) {
    const startValue = 0;
    const duration = 1000;
    const startTime = performance.now();
    
    function updateValue(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easeOut = 1 - Math.pow(1 - progress, 3);
        const currentValue = startValue + (targetValue - startValue) * easeOut;
        element.textContent = formatCurrency(currentValue);
        if (progress < 1) {
            requestAnimationFrame(updateValue);
        }
    }
    requestAnimationFrame(updateValue);
}

function applyFilters() {
    filteredData = movimentacoesData.filter(item => {
        let monthMatch = true;
        if (currentMonthFilter) {
            if (currentMonthFilter === 'pending') {
                monthMatch = !item.envioPagamento;
            } else {
                monthMatch = item.envioPagamento && getMonthYear(item.envioPagamento) === currentMonthFilter;
            }
        }
        let nameMatch = true;
        if (currentNameFilter) {
            nameMatch = item.servidor.toLowerCase().includes(currentNameFilter.toLowerCase());
        }
        return monthMatch && nameMatch;
    });
    filteredData.sort((a, b) => {
        if (!a.envioPagamento && b.envioPagamento) return -1;
        if (a.envioPagamento && !b.envioPagamento) return 1;
        const dateA = parseDate(a.dataInicio);
        const dateB = parseDate(b.dataInicio);
        return dateB - dateA;
    });
    updateTable();
    updateCards();
}

function updateTable() {
    elements.tableBody.innerHTML = '';
    if (filteredData.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = `<td colspan="6" class="text-center" style="padding: 40px; color: #9ca3af;">Nenhum registro encontrado</td>`;
        elements.tableBody.appendChild(row);
        elements.tableCount.textContent = '0 registros encontrados';
        return;
    }
    filteredData.forEach((item, index) => {
        const row = document.createElement('tr');
        row.style.animationDelay = `${index * 0.05}s`;
        row.classList.add('fade-in');
        const statusBadge = item.envioPagamento 
            ? `<span class="status-badge status-paid">${item.envioPagamento}</span>`
            : `<span class="status-badge status-pending">Pendente</span>`;
        row.innerHTML = `
            <td><strong>${item.servidor}</strong></td>
            <td>${item.dataInicio}</td>
            <td>${item.dataFinal}</td>
            <td>${item.destino}</td>
            <td><strong>${formatCurrency(item.valor)}</strong></td>
            <td>${statusBadge}</td>
        `;
        elements.tableBody.appendChild(row);
    });
    elements.tableCount.textContent = `${filteredData.length} registro${filteredData.length !== 1 ? 's' : ''} encontrado${filteredData.length !== 1 ? 's' : ''}`;
}

function clearFilters() {
    currentMonthFilter = "";
    currentNameFilter = "";
    elements.monthFilter.value = "";
    elements.nameFilter.value = "";
    applyFilters();
    elements.clearFilters.style.transform = 'scale(0.95)';
    setTimeout(() => { elements.clearFilters.style.transform = 'scale(1)'; }, 150);
}

function showLoading(show = true) {
    if (show) {
        elements.loading.classList.add('show');
    } else {
        elements.loading.classList.remove('show');
    }
}

// A função que se conectará ao Google Sheets
async function loadDataFromGoogleSheets() {
    return new Promise((resolve, reject) => {
        const CLIENT_ID = '716670112874-2bg2gr030ohrg5jv7rqoual8pu136t3e.apps.googleusercontent.com'; // <--- O SEU ID VAI AQUI
        const SPREADSHEET_ID = '1QLhmly8lkDDlID2p8mog3IKJtP3Hc-aYsFYIipQQRCI'; // <--- O ID DA SUA PLANILHA VAI AQUI
        const API_KEY = 'AIzaSyC7aVQCyO3sqH7NNb6S3JwEiKyWF_ggOmU'; // <--- A CHAVE API VAI AQUI

        const DISCOVERY_DOCS = ["https://sheets.googleapis.com/$discovery/rest?version=v4"];
        const SCOPES = "https://www.googleapis.com/auth/spreadsheets.readonly";

        gapi.client.init({
            apiKey: API_KEY,
            clientId: CLIENT_ID,
            discoveryDocs: DISCOVERY_DOCS,
            scope: SCOPES,
        }).then(async () => {
            if (!gapi.auth2.getAuthInstance().isSignedIn.get()) {
                await gapi.auth2.getAuthInstance().signIn();
            }

            const responseMovimentacoes = await gapi.client.sheets.spreadsheets.values.get({
                spreadsheetId: SPREADSHEET_ID,
                range: 'movimentacoes!A2:F',
            });
            const responseCotas = await gapi.client.sheets.spreadsheets.values.get({
                spreadsheetId: SPREADSHEET_ID,
                range: 'cotas!A2:B',
            });

            const movimentacoes = responseMovimentacoes.result.values.map(row => ({
                servidor: row[0],
                dataInicio: row[1],
                dataFinal: row[2],
                destino: row[3],
                valor: parseFloat(row[4]),
                envioPagamento: row[5]
            }));
            const cotas = responseCotas.result.values.map(row => ({
                mes: row[0],
                cota: parseFloat(row[1])
            }));
            resolve({ movimentacoes, cotas });
        }).catch(error => {
            console.error("Erro ao carregar dados:", error);
            reject(error);
        });
    });
}

// Event Listeners
elements.monthFilter.addEventListener('change', function() {
    currentMonthFilter = this.value;
    applyFilters();
});
let nameFilterTimeout;
elements.nameFilter.addEventListener('input', function() {
    clearTimeout(nameFilterTimeout);
    nameFilterTimeout = setTimeout(() => {
        currentNameFilter = this.value.trim();
        applyFilters();
    }, 300);
});
elements.clearFilters.addEventListener('click', clearFilters);
document.querySelectorAll('.card').forEach(card => {
    card.addEventListener('mouseenter', function() {
        this.style.transform = 'translateY(-8px) scale(1.02)';
    });
    card.addEventListener('mouseleave', function() {
        this.style.transform = 'translateY(0) scale(1)';
    });
});

// AQUI COMEÇA A MÁGICA FINAL!
// Este é o único ponto de entrada do seu aplicativo
gapi.load('client:auth2', async () => {
    try {
        const data = await loadDataFromGoogleSheets();
        movimentacoesData = data.movimentacoes;
        cotasData = data.cotas;
        populateMonthFilter();
        applyFilters();
    } catch (error) {
        console.error("Falha ao carregar dados da planilha:", error);
    } finally {
        showLoading(false);
    }
});