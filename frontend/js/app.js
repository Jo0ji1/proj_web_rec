// frontend/js/app.js

const API_URL    = 'http://127.0.0.1:5000/expenses';
let allExpenses = [];
let currentPage = 1;
const pageSize  = 10;
let sortField   = 'data_registro';
let sortAsc     = false;

// DOM elements
const tableBody    = document.querySelector('#expenses-table tbody');
const form         = document.getElementById('expense-form');
const valorInput   = document.getElementById('valor');
const descInput    = document.getElementById('descricao');
const catInput     = document.getElementById('categoria');
const filterSelect = document.getElementById('filter-category');
const totalSpentEl = document.getElementById('total-spent');
const byCategoryEl = document.getElementById('by-category');
const chartCtx     = document.getElementById('category-chart').getContext('2d');
const fromDateEl   = document.getElementById('filter-from');
const toDateEl     = document.getElementById('filter-to');
const searchEl     = document.getElementById('search-desc');
const applyFilters = document.getElementById('apply-filters');
const paginationEl = document.getElementById('pagination');
const cancelBtn    = document.getElementById('cancel-btn');
const descCountEl  = document.getElementById('desc-count');
const toastContainer = document.getElementById('toast-container');
let categoryChart;

console.log('app.js carregado!');

// Contador de caracteres da descrição
descInput.addEventListener('input', () => {
  descCountEl.textContent = descInput.value.length;
});

// Toast helper
function showToast(msg, type = 'success') {
  const toastId = 't' + Date.now();
  const tpl = `
    <div id="${toastId}" class="toast align-items-center text-bg-${type} border-0 mb-2" role="alert" aria-live="assertive" aria-atomic="true">
      <div class="d-flex">
        <div class="toast-body">${msg}</div>
        <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
      </div>
    </div>`;
  toastContainer.insertAdjacentHTML('beforeend', tpl);
  const toastEl = document.getElementById(toastId);
  const bsToast = new bootstrap.Toast(toastEl, { delay: 3000 });
  bsToast.show();
}

// Protege listeners de filtro
if (filterSelect && applyFilters) {
  filterSelect.addEventListener('change', () => { currentPage = 1; applyAllTransforms(); });
  applyFilters.addEventListener('click', () =>  { currentPage = 1; applyAllTransforms(); });
}

// Inicializa ao carregar o DOM
document.addEventListener('DOMContentLoaded', loadExpenses);

// Fetch e processamento geral
async function loadExpenses() {
  try {
    const res = await fetch(API_URL);
    allExpenses = await res.json();
    currentPage = 1;
    applyAllTransforms();
  } catch (err) {
    showToast('Falha ao carregar despesas', 'danger');
  }
}

function applyAllTransforms() {
  let data = [...allExpenses];

  // Categoria
  if (filterSelect.value) {
    data = data.filter(e => e.categoria === filterSelect.value);
  }

  // Data
  if (fromDateEl.value) data = data.filter(e => e.data_registro >= fromDateEl.value);
  if (toDateEl.value)   data = data.filter(e => e.data_registro <= toDateEl.value);

  // Busca
  const q = searchEl.value.toLowerCase();
  if (q) data = data.filter(e => e.descricao.toLowerCase().includes(q));

  // Ordenação
  data.sort((a,b) => {
    if (a[sortField] < b[sortField]) return sortAsc ? -1 : 1;
    if (a[sortField] > b[sortField]) return sortAsc ? 1 : -1;
    return 0;
  });

  renderSummary(data);
  renderChart(data);
  renderTablePage(data);
  renderPagination(data.length);
}

function renderSummary(data) {
  const total = data.reduce((sum,e) => sum + e.valor, 0);
  totalSpentEl.textContent = `R$ ${total.toFixed(2)}`;

  const byCat = data.reduce((acc,e) => {
    acc[e.categoria] = (acc[e.categoria]||0) + e.valor;
    return acc;
  }, {});
  byCategoryEl.innerHTML = Object.entries(byCat)
    .map(([cat, val]) => {
      const pct = ((val/total)*100).toFixed(1);
      return `<li>${cat}: R$ ${val.toFixed(2)} (${pct}%)</li>`;
    })
    .join('');
}

function renderChart(data) {
  const byCat = data.reduce((acc,e) => {
    acc[e.categoria] = (acc[e.categoria]||0) + e.valor;
    return acc;
  }, {});
  const labels = Object.keys(byCat), values = Object.values(byCat);

  if (categoryChart) categoryChart.destroy();
  categoryChart = new Chart(chartCtx, {
    type: 'pie',
    data: { labels, datasets:[{ data: values }] },
    options: { responsive:true, plugins:{ legend:{ position:'bottom' } } }
  });
}

function renderTablePage(data) {
  const start = (currentPage-1)*pageSize;
  const slice = data.slice(start,start+pageSize);
  tableBody.innerHTML = '';
  slice.forEach(e => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${e.valor.toFixed(2)}</td>
      <td>${e.descricao}</td>
      <td>${e.categoria}</td>
      <td>${new Date(e.data_registro).toLocaleString('pt-BR')}</td>
      <td>
        <button class="btn btn-sm btn-warning me-2" onclick="startEdit(${e.id})">Editar</button>
        <button class="btn btn-sm btn-danger" onclick="deleteExpense(${e.id})">Excluir</button>
      </td>`;
    tableBody.appendChild(tr);
  });
}

function renderPagination(total) {
  const pages = Math.ceil(total/pageSize);
  paginationEl.innerHTML = '';
  for (let i=1;i<=pages;i++) {
    const li = document.createElement('li');
    li.className = `page-item ${i===currentPage?'active':''}`;
    li.innerHTML = `<a class="page-link" href="#">${i}</a>`;
    li.onclick = e => { e.preventDefault(); currentPage=i; applyAllTransforms(); };
    paginationEl.appendChild(li);
  }
}

function sortTable(field) {
  if (sortField===field) sortAsc=!sortAsc;
  else { sortField=field; sortAsc=true; }
  applyAllTransforms();
}

function scrollToForm() {
  document.getElementById('expense-form').scrollIntoView({behavior:'smooth'});
}

// CRUD

form.addEventListener('submit', async e => {
  e.preventDefault();
  const payload = {
    valor: parseFloat(valorInput.value),
    descricao: descInput.value,
    categoria: catInput.value
  };
  let method='POST', url=API_URL;
  if (form.dataset.editId) {
    method='PUT';
    url=`${API_URL}/${form.dataset.editId}`;
  }
  try {
    const res = await fetch(url, {
      method, headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload)
    });
    if (!res.ok) throw new Error();
    resetForm();
    loadExpenses();
    showToast('Despesa salva com sucesso!');
  } catch {
    showToast('Erro ao salvar despesa','danger');
  }
});

window.startEdit = async id => {
  try {
    const res = await fetch(`${API_URL}/${id}`);
    if (!res.ok) throw new Error();
    const e = await res.json();
    form.dataset.editId = id;
    document.getElementById('form-title').textContent = 'Editando Despesa';
    document.getElementById('submit-btn').textContent = 'Atualizar';
    cancelBtn.style.display='inline-block';
    valorInput.value=e.valor;
    descInput.value=e.descricao;
    catInput.value=e.categoria;
    descCountEl.textContent = e.descricao.length;
    scrollToForm();
  } catch {
    showToast('Despesa não encontrada','warning');
  }
};

cancelBtn.addEventListener('click', () => {
  resetForm();
  showToast('Edição cancelada','secondary');
});

window.deleteExpense = async id => {
  if (!confirm('Confirma exclusão?')) return;
  try {
    await fetch(`${API_URL}/${id}`,{method:'DELETE'});
    loadExpenses();
    showToast('Despesa excluída','success');
  } catch {
    showToast('Erro ao excluir','danger');
  }
};

function resetForm() {
  delete form.dataset.editId;
  document.getElementById('form-title').textContent='Nova Despesa';
  document.getElementById('submit-btn').textContent='Salvar';
  cancelBtn.style.display='none';
  form.reset();
  descCountEl.textContent='0';
}
