// frontend/js/app.js

const API_URL    = 'http://127.0.0.1:5000/expenses';
let allExpenses = [];
let currentPage = 1;
const pageSize  = 10;
let sortField   = 'data_registro';
let sortAsc     = false;

// DOM elements
const tableBody     = document.querySelector('#expenses-table tbody');
const form          = document.getElementById('expense-form');
const valorInput    = document.getElementById('valor');
const descInput     = document.getElementById('descricao');
const catInput      = document.getElementById('categoria');
const filterSelect  = document.getElementById('filter-category');
const totalSpentEl  = document.getElementById('total-spent');
const byCategoryEl  = document.getElementById('by-category');
const chartCtx      = document.getElementById('category-chart').getContext('2d');
const fromDateEl    = document.getElementById('filter-from');
const toDateEl      = document.getElementById('filter-to');
const searchEl      = document.getElementById('search-desc');
const applyFilters  = document.getElementById('apply-filters');
const paginationEl  = document.getElementById('pagination');
const cancelBtn     = document.getElementById('cancel-btn');
let categoryChart;

console.log('app.js carregado com sucesso!');

// Protege event listeners
if (filterSelect && applyFilters) {
  filterSelect.addEventListener('change', () => { currentPage = 1; applyAllTransforms(); });
  applyFilters.addEventListener('click', () =>  { currentPage = 1; applyAllTransforms(); });
}

// Inicialização após DOM carregado
document.addEventListener('DOMContentLoaded', loadExpenses);

// Buscar despesas da API
async function loadExpenses() {
  const res = await fetch(API_URL);
  allExpenses = await res.json();
  currentPage = 1;
  applyAllTransforms();
}

// Aplica filtros, buscas, ordenação e renderizações
function applyAllTransforms() {
  let data = [...allExpenses];

  // Filtro por categoria
  if (filterSelect.value) {
    data = data.filter(e => e.categoria === filterSelect.value);
  }

  // Filtros por data
  if (fromDateEl.value) {
    data = data.filter(e => e.data_registro >= fromDateEl.value);
  }
  if (toDateEl.value) {
    data = data.filter(e => e.data_registro <= toDateEl.value);
  }

  // Busca por descrição
  const q = searchEl.value.toLowerCase();
  if (q) {
    data = data.filter(e => e.descricao.toLowerCase().includes(q));
  }

  // Ordenação
  data.sort((a, b) => {
    if (a[sortField] < b[sortField]) return sortAsc ? -1 : 1;
    if (a[sortField] > b[sortField]) return sortAsc ? 1 : -1;
    return 0;
  });

  renderSummary(data);
  renderChart(data);
  renderTablePage(data);
  renderPagination(data.length);
}

// Renderiza painel de resumo
function renderSummary(data) {
  const total = data.reduce((sum, e) => sum + e.valor, 0);
  totalSpentEl.textContent = `R$ ${total.toFixed(2)}`;

  const byCat = data.reduce((acc, e) => {
    acc[e.categoria] = (acc[e.categoria] || 0) + e.valor;
    return acc;
  }, {});
  byCategoryEl.innerHTML = Object.entries(byCat)
    .map(([cat, val]) => `<li>${cat}: R$ ${val.toFixed(2)}</li>`)
    .join('');
}

// Renderiza gráfico de pizza
function renderChart(data) {
  const byCat = data.reduce((acc, e) => {
    acc[e.categoria] = (acc[e.categoria] || 0) + e.valor;
    return acc;
  }, {});
  const labels = Object.keys(byCat);
  const values = Object.values(byCat);

  if (categoryChart) categoryChart.destroy();
  categoryChart = new Chart(chartCtx, {
    type: 'pie',
    data: { labels, datasets: [{ data: values }] },
    options: {
      responsive: true,
      plugins: { legend: { position: 'bottom' } }
    }
  });
}

// Renderiza página da tabela
function renderTablePage(data) {
  const start = (currentPage - 1) * pageSize;
  const pageSlice = data.slice(start, start + pageSize);
  tableBody.innerHTML = '';
  pageSlice.forEach(exp => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${exp.valor.toFixed(2)}</td>
      <td>${exp.descricao}</td>
      <td>${exp.categoria}</td>
      <td>${new Date(exp.data_registro).toLocaleString('pt-BR')}</td>
      <td>
        <button class="btn btn-sm btn-warning me-2" onclick="startEdit(${exp.id})">Editar</button>
        <button class="btn btn-sm btn-danger" onclick="deleteExpense(${exp.id})">Excluir</button>
      </td>`;
    tableBody.appendChild(tr);
  });
}

// Renderiza paginação
function renderPagination(totalItems) {
  const pageCount = Math.ceil(totalItems / pageSize);
  paginationEl.innerHTML = '';
  for (let i = 1; i <= pageCount; i++) {
    const li = document.createElement('li');
    li.className = `page-item ${i === currentPage ? 'active' : ''}`;
    li.innerHTML = `<a class="page-link" href="#">${i}</a>`;
    li.onclick = e => { e.preventDefault(); currentPage = i; applyAllTransforms(); };
    paginationEl.appendChild(li);
  }
}

// Ordenação ao clicar no cabeçalho
function sortTable(field) {
  if (sortField === field) sortAsc = !sortAsc;
  else {
    sortField = field;
    sortAsc = true;
  }
  applyAllTransforms();
}

// Scroll suave até o formulário
function scrollToForm() {
  document.getElementById('expense-form').scrollIntoView({ behavior: 'smooth' });
}

// Handlers de CRUD
form.addEventListener('submit', async e => {
  e.preventDefault();
  const payload = {
    valor: parseFloat(valorInput.value),
    descricao: descInput.value,
    categoria: catInput.value
  };
  let method = 'POST', url = API_URL;
  if (form.dataset.editId) {
    method = 'PUT';
    url = `${API_URL}/${form.dataset.editId}`;
  }
  const res = await fetch(url, {
    method,
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify(payload)
  });
  if (!res.ok) return alert('Erro ao salvar despesa');
  resetForm();
  loadExpenses();
});

window.startEdit = async id => {
  const res = await fetch(`${API_URL}/${id}`);
  if (!res.ok) return alert('Despesa não encontrada');
  const exp = await res.json();
  form.dataset.editId = id;
  document.getElementById('form-title').textContent = 'Editando Despesa';
  document.getElementById('submit-btn').textContent = 'Atualizar';
  cancelBtn.style.display = 'inline-block';
  valorInput.value = exp.valor;
  descInput.value  = exp.descricao;
  catInput.value   = exp.categoria;
};

cancelBtn.addEventListener('click', resetForm);

window.deleteExpense = async id => {
  if (!confirm('Confirma exclusão?')) return;
  await fetch(`${API_URL}/${id}`, {method:'DELETE'});
  loadExpenses();
};

// Reseta o formulário
function resetForm() {
  delete form.dataset.editId;
  document.getElementById('form-title').textContent = 'Nova Despesa';
  document.getElementById('submit-btn').textContent = 'Salvar';
  cancelBtn.style.display = 'none';
  form.reset();
}
