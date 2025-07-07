// frontend/js/app.js

const API_URL      = 'http://127.0.0.1:5000/expenses';
let allExpenses   = [];
let currentPage   = 1;
const pageSize    = 10;
let sortField     = 'data_registro';
let sortAsc       = false;

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
const resetFilters  = document.getElementById('reset-filters');
const paginationEl  = document.getElementById('pagination');
const cancelBtn     = document.getElementById('cancel-btn');
const descCountEl   = document.getElementById('desc-count');
const oldCheckbox   = document.getElementById('old-expense');
const dateInput     = document.getElementById('expense-date');
const toastContainer= document.getElementById('toast-container');
let categoryChart;

console.log('app.js carregado!');

// Contador de caracteres da descrição
descInput.addEventListener('input', () => {
  descCountEl.textContent = descInput.value.length;
});

// Habilita/desabilita campo de data
oldCheckbox.addEventListener('change', () => {
  dateInput.disabled = !oldCheckbox.checked;
});

// Impede reload ao pressionar Enter nos filtros
document.getElementById('filters').addEventListener('keydown', e => {
  if (e.key === 'Enter') {
    e.preventDefault();
    applyFilters.click();
  }
});

// Toast helper
function showToast(msg, type = 'success') {
  const id = 't' + Date.now();
  toastContainer.insertAdjacentHTML('beforeend', `
    <div id="${id}" class="toast align-items-center text-bg-${type} border-0 mb-2" role="alert" aria-live="assertive" aria-atomic="true">
      <div class="d-flex">
        <div class="toast-body">${msg}</div>
        <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
      </div>
    </div>
  `);
  new bootstrap.Toast(document.getElementById(id), { delay: 3000 }).show();
}

// Filtros e Reset
if (filterSelect && applyFilters) {
  applyFilters.addEventListener('click', () => { currentPage = 1; applyAllTransforms(); });
  resetFilters.addEventListener('click', () => {
    filterSelect.value = '';
    fromDateEl.value = '';
    toDateEl.value = '';
    searchEl.value = '';
    currentPage = 1;
    applyAllTransforms();
  });
}

document.addEventListener('DOMContentLoaded', loadExpenses);

async function loadExpenses() {
  try {
    const res = await fetch(API_URL);
    allExpenses = await res.json();
    currentPage = 1;
    applyAllTransforms();
  } catch {
    showToast('Falha ao carregar despesas', 'danger');
  }
}

function applyAllTransforms() {
  let data = [...allExpenses];

  // Categoria
  if (filterSelect.value) data = data.filter(e => e.categoria === filterSelect.value);
  // Data
  if (fromDateEl.value) data = data.filter(e => e.data_registro >= fromDateEl.value);
  if (toDateEl.value)   data = data.filter(e => e.data_registro <= toDateEl.value);
  // Busca
  const q = searchEl.value.toLowerCase();
  if (q) data = data.filter(e => e.descricao.toLowerCase().includes(q));
  // Ordenação
  data.sort((a,b) => a[sortField] < b[sortField] ? (sortAsc ? -1 : 1) : (a[sortField] > b[sortField] ? (sortAsc ? 1 : -1) : 0));

  renderSummary(data);
  renderChart(data);
  renderTablePage(data);
  renderPagination(data.length);
}

function renderSummary(data) {
  const total = data.reduce((s,e) => s + e.valor, 0);
  totalSpentEl.textContent = `R$ ${total.toFixed(2)}`;
  const byCat = data.reduce((acc,e) => { acc[e.categoria] = (acc[e.categoria]||0)+e.valor; return acc; }, {});
  byCategoryEl.innerHTML = Object.entries(byCat)
    .map(([cat,v]) => `<li>${cat}: R$ ${v.toFixed(2)} (${((v/total)*100).toFixed(1)}%)</li>`)
    .join('');
}

function renderChart(data) {
  const byCat = data.reduce((acc,e) => { acc[e.categoria] = (acc[e.categoria]||0)+e.valor; return acc; }, {});
  const labels = Object.keys(byCat), values = Object.values(byCat);
  if (categoryChart) categoryChart.destroy();
  categoryChart = new Chart(chartCtx, { type:'pie', data:{labels,datasets:[{data:values}]}, options:{responsive:true,plugins:{legend:{position:'bottom'}}} });
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

function sortTable(field) { sortField===field?sortAsc=!sortAsc:(sortField=field,sortAsc=true); applyAllTransforms(); }
function scrollToForm(){ document.getElementById('expense-form').scrollIntoView({behavior:'smooth'}); }

// CRUD
form.addEventListener('submit', async e => {
  e.preventDefault();
  const payload = { valor: parseFloat(valorInput.value), descricao: descInput.value, categoria: catInput.value };
  if (oldCheckbox.checked && dateInput.value) payload.data_registro = dateInput.value;
  let method='POST', url=API_URL;
  if (form.dataset.editId) { method='PUT'; url=`${API_URL}/${form.dataset.editId}`; }
  try {
    const res = await fetch(url,{method,headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
    if (!res.ok) throw new Error();
    resetForm(); loadExpenses(); showToast('Despesa salva com sucesso!');
  } catch { showToast('Erro ao salvar despesa','danger'); }
});

window.startEdit = async id => {
  try {
    const res = await fetch(`${API_URL}/${id}`);
    if (!res.ok) throw new Error();
    const e = await res.json();
    form.dataset.editId = id;
    document.getElementById('form-title').textContent='Editando Despesa';
    document.getElementById('submit-btn').textContent='Atualizar';
    cancelBtn.style.display='inline-block';
    valorInput.value=e.valor;
    descInput.value=e.descricao;
    catInput.value=e.categoria;
    descCountEl.textContent=e.descricao.length;
    if (e.data_registro) {
      oldCheckbox.checked = true;
      dateInput.disabled = false;
      dateInput.value = new Date(e.data_registro).toISOString().slice(0,16);
    }
    scrollToForm();
  } catch { showToast('Despesa não encontrada','warning'); }
};

cancelBtn.addEventListener('click', () => { resetForm(); showToast('Edição cancelada','secondary'); });

window.deleteExpense = async id => {
  if (!confirm('Confirma exclusão?')) return;
  try { await fetch(`${API_URL}/${id}`,{method:'DELETE'}); loadExpenses(); showToast('Despesa excluída'); }
  catch { showToast('Erro ao excluir','danger'); }
};

function resetForm() {
  delete form.dataset.editId;
  document.getElementById('form-title').textContent='Nova Despesa';
  document.getElementById('submit-btn').textContent='Salvar';
  cancelBtn.style.display='none';
  form.reset();
  descCountEl.textContent='0';
  oldCheckbox.checked=false;
  dateInput.disabled=true;
  dateInput.value='';
}