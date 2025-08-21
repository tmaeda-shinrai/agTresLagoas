// Dados de exemplo simulando o Google Sheets
const movimentacoesData = [
    {
        servidor: "MARCOS OLIVEIRA DA SILVA",
        dataInicio: "16/12/2024",
        dataFinal: "20/12/2024",
        destino: "Água Clara",
        valor: 900.00,
        envioPagamento: "21/01/2025"
    },
    {
        servidor: "SERGIO LUIZ RIBEIRO LEITE",
        dataInicio: "07/01/2025",
        dataFinal: "10/01/2025",
        destino: "Água Clara",
        valor: 700.00,
        envioPagamento: "21/01/2025"
    },
    {
        servidor: "SERGIO LUIZ RIBEIRO LEITE",
        dataInicio: "13/01/2025",
        dataFinal: "17/01/2025",
        destino: "Água Clara",
        valor: 900.00,
        envioPagamento: "21/01/2025"
    },
    {
        servidor: "ANDRE RODRIGO DE OLIVEIRA SANDOVETE",
        dataInicio: "13/01/2025",
        dataFinal: "13/01/2025",
        destino: "Brasilândia",
        valor: 100.00,
        envioPagamento: "21/01/2025"
    },
    {
        servidor: "CLEUNICE MENDONÇA DE MELO",
        dataInicio: "13/01/2025",
        dataFinal: "18/01/2025",
        destino: "Brasilândia",
        valor: 1100.00,
        envioPagamento: "21/01/2025"
    },
    // Dados adicionais para demonstrar filtros
    {
        servidor: "JOÃO SILVA SANTOS",
        dataInicio: "01/02/2025",
        dataFinal: "05/02/2025",
        destino: "Campo Grande",
        valor: 800.00,
        envioPagamento: ""
    },
    {
        servidor: "MARIA FERNANDA COSTA",
        dataInicio: "10/02/2025",
        dataFinal: "12/02/2025",
        destino: "Dourados",
        valor: 600.00,
        envioPagamento: ""
    },
    {
        servidor: "PEDRO HENRIQUE LIMA",
        dataInicio: "15/02/2025",
        dataFinal: "18/02/2025",
        destino: "Três Lagoas",
        valor: 950.00,
        envioPagamento: ""
    },
    {
        servidor: "ANA CAROLINA PEREIRA",
        dataInicio: "20/03/2025",
        dataFinal: "22/03/2025",
        destino: "Corumbá",
        valor: 750.00,
        envioPagamento: ""
    }
];

const cotasData = [
    { cota: 12000.00, mes: "2025-01" },
    { cota: 12000.00, mes: "2025-02" },
    { cota: 12000.00, mes: "2025-03" }
];

// Variáveis globais
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

// Funções utilitárias
function formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(value);
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
    const months = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    return `${months[date.getMonth()]} ${date.getFullYear()}`;
}

// Função para popular o dropdown de mês/ano
function populateMonthFilter() {
    const monthsSet = new Set();
    
    // Adicionar meses das movimentações
    movimentacoesData.forEach(item => {
        if (item.envioPagamento) {
            monthsSet.add(getMonthYear(item.envioPagamento));
        }
    });
    
    // Converter para array e ordenar (pedidos não pagos sempre no final)
    const months = Array.from(monthsSet).sort();
    
    // Limpar dropdown
    elements.monthFilter.innerHTML = '<option value="">Todos os períodos</option>';
    
    // Adicionar opções
    months.forEach(month => {
        const option = document.createElement('option');
        option.value = month;
        option.textContent = getMonthYearDisplay(`01/${month.split('-')[1]}/${month.split('-')[0]}`);
        elements.monthFilter.appendChild(option);
    });
    
    // Adicionar opção para pedidos não pagos
    const pendingOption = document.createElement('option');
    pendingOption.value = 'pending';
    pendingOption.textContent = 'Pedidos Não Pagos';
    elements.monthFilter.appendChild(pendingOption);
}

// Função para calcular e atualizar os cards
function updateCards() {
    // Obter mês atual para cota
    const currentDate = new Date();
    const currentMonth = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
    
    // Cota mensal
    const cotaAtual = cotasData.find(c => c.mes === currentMonth);
    const cotaMensal = cotaAtual ? cotaAtual.cota : 12000.00;
    
    // Utilizado (movimentações com envio para pagamento)
    const utilizado = filteredData
        .filter(item => item.envioPagamento)
        .reduce((sum, item) => sum + item.valor, 0);
    
    // Pedidos recebidos (movimentações sem envio para pagamento)
    const recebido = filteredData
        .filter(item => !item.envioPagamento)
        .reduce((sum, item) => sum + item.valor, 0);
    
    // Disponível (Cota - Utilizado - Recebido)
    const disponivel = cotaMensal - utilizado - recebido;
    
    // Atualizar valores nos cards com animação
    animateValue(elements.cotaValue, cotaMensal);
    animateValue(elements.utilizadoValue, utilizado);
    animateValue(elements.recebidoValue, recebido);
    animateValue(elements.disponivelValue, disponivel);
}

// Função para animar os valores dos cards
function animateValue(element, targetValue) {
    const startValue = 0;
    const duration = 1000;
    const startTime = performance.now();
    
    function updateValue(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Easing function (ease-out)
        const easeOut = 1 - Math.pow(1 - progress, 3);
        const currentValue = startValue + (targetValue - startValue) * easeOut;
        
        element.textContent = formatCurrency(currentValue);
        
        if (progress < 1) {
            requestAnimationFrame(updateValue);
        }
    }
    
    requestAnimationFrame(updateValue);
}

// Função para aplicar filtros
function applyFilters() {
    filteredData = movimentacoesData.filter(item => {
        // Filtro por mês/ano
        let monthMatch = true;
        if (currentMonthFilter) {
            if (currentMonthFilter === 'pending') {
                monthMatch = !item.envioPagamento;
            } else {
                monthMatch = item.envioPagamento && getMonthYear(item.envioPagamento) === currentMonthFilter;
            }
        }
        
        // Filtro por nome (ilike)
        let nameMatch = true;
        if (currentNameFilter) {
            nameMatch = item.servidor.toLowerCase().includes(currentNameFilter.toLowerCase());
        }
        
        return monthMatch && nameMatch;
    });
    
    // Ordenar dados (pedidos não pagos primeiro, depois por data)
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

// Função para atualizar a tabela
function updateTable() {
    elements.tableBody.innerHTML = '';
    
    if (filteredData.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td colspan="6" class="text-center" style="padding: 40px; color: #9ca3af;">
                Nenhum registro encontrado
            </td>
        `;
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

// Função para limpar filtros
function clearFilters() {
    currentMonthFilter = "";
    currentNameFilter = "";
    elements.monthFilter.value = "";
    elements.nameFilter.value = "";
    
    // Aplicar filtros (que agora estão vazios)
    applyFilters();
    
    // Feedback visual
    elements.clearFilters.style.transform = 'scale(0.95)';
    setTimeout(() => {
        elements.clearFilters.style.transform = 'scale(1)';
    }, 150);
}

// Função para mostrar/esconder loading
function showLoading(show = true) {
    if (show) {
        elements.loading.classList.add('show');
    } else {
        elements.loading.classList.remove('show');
    }
}

// Event listeners
document.addEventListener('DOMContentLoaded', function() {
    // Mostrar loading inicial
    showLoading(true);
    
    // Simular carregamento de dados
    setTimeout(() => {
        populateMonthFilter();
        applyFilters();
        showLoading(false);
    }, 1000);
    
    // Filtro por mês/ano
    elements.monthFilter.addEventListener('change', function() {
        currentMonthFilter = this.value;
        applyFilters();
    });
    
    // Filtro por nome com debounce
    let nameFilterTimeout;
    elements.nameFilter.addEventListener('input', function() {
        clearTimeout(nameFilterTimeout);
        nameFilterTimeout = setTimeout(() => {
            currentNameFilter = this.value.trim();
            applyFilters();
        }, 300);
    });
    
    // Botão limpar filtros
    elements.clearFilters.addEventListener('click', clearFilters);
    
    // Adicionar efeitos de hover aos cards
    document.querySelectorAll('.card').forEach(card => {
        card.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-8px) scale(1.02)';
        });
        
        card.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0) scale(1)';
        });
    });
});

// Função para integração futura com Google Sheets
async function loadDataFromGoogleSheets() {
    // Esta função será implementada quando a integração com Google Sheets for configurada
    // Por enquanto, retorna os dados de exemplo
    
    try {
        // Aqui seria feita a chamada para a API do Google Sheets
        // const response = await fetch('URL_DA_API_GOOGLE_SHEETS');
        // const data = await response.json();
        
        // Por enquanto, simular delay de rede
        await new Promise(resolve => setTimeout(resolve, 500));
        
        return {
            movimentacoes: movimentacoesData,
            cotas: cotasData
        };
    } catch (error) {
        console.error('Erro ao carregar dados:', error);
        return {
            movimentacoes: movimentacoesData,
            cotas: cotasData
        };
    }
}

// Função para atualizar dados periodicamente
function setupAutoRefresh() {
    // Atualizar dados a cada 5 minutos
    setInterval(async () => {
        console.log('Atualizando dados...');
        const data = await loadDataFromGoogleSheets();
        
        // Atualizar dados globais
        movimentacoesData.length = 0;
        movimentacoesData.push(...data.movimentacoes);
        
        cotasData.length = 0;
        cotasData.push(...data.cotas);
        
        // Recarregar interface
        populateMonthFilter();
        applyFilters();
    }, 5 * 60 * 1000); // 5 minutos
}

// Inicializar auto-refresh (comentado por enquanto)
// setupAutoRefresh();

// Exportar funções para uso futuro
window.DashboardAPI = {
    loadDataFromGoogleSheets,
    updateCards,
    applyFilters,
    clearFilters
};

