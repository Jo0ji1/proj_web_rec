const API = 'http://127.0.0.1:5000';

let allExpenses = [];
let categories = [];
let chart;

const el = {
  filterCats: document.getElementById('filter-categories'),
  desc: document.getElementById('filter-description'),
  start: document.getElementById('filter-start'),
  end: document.getElementById('filter-end'),
  formFilter: document.getElementById('filter-form'),
  btnReset: document.getElementById('reset-filters'),
  btnNew: document.getElementById('btn-new'),
  tableBody: document.querySelector('#expenses-table tbody'),
  totalSpent: document.getElementById('total-spent'),
  listByCat: document.getElementById('list-by-category'),
  chartCanvas: document.getElementById('chart-canvas'),
  formCard: document.getElementById('form-card'),
  formTitle: document.getElementById('form-title'),
  expenseForm: document.getElementById('expense-form'),
  expId: document.getElementById('expense-id'),
  expValue: document.getElementById('expense-value'),
  expDesc: document.getElementById('expense-desc'),
  expCat: document.getElementById('expense-cat'),
  expOld: document.getElementById('expense-old'),
  dateGroup: document.getElementById('date-group'),
  dateInput: document.getElementById('expense-date'),
  catForm: document.getElementById('category-form'),
  catName: document.getElementById('category-name'),
};

window.addEventListener('DOMContentLoaded', () => {
  loadCategories();
  loadExpenses();
  setupListeners();
});

function setupListeners() {
  el.formFilter.addEventListener('submit', (e) => {
    e.preventDefault();
    applyFilters();
  });
  el.btnReset.addEventListener('click', resetFilters);
  el.btnNew.addEventListener('click', () => showForm());
  el.expOld.addEventListener('change', () => {
    el.dateGroup.style.display = el.expOld.checked ? 'block' : 'none';
  });
  el.expenseForm.addEventListener('submit', saveExpense);
  el.catForm.addEventListener('submit', saveCategory);
}

async function loadCategories() {
  const res = await fetch(`${API}/categories`);
  categories = await res.json();
  renderCategoryFilters();
  renderCategoryOptions();
}

function renderCategoryFilters() {
  el.filterCats.innerHTML = '';
  categories.forEach(c => {
    const div = document.createElement('div');
    div.className = 'form-check';
    div.innerHTML = `
      <input class="form-check-input" type="checkbox" value="${c}" id="fcat-${c}">
      <label class="form-check-label" for="fcat-${c}">${c}</label>`;
    el.filterCats.appendChild(div);
  });
}

function renderCategoryOptions() {
  el.expCat.innerHTML = '<option value="">Selecione...</option>';
  categories.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c; opt.textContent = c;
    el.expCat.appendChild(opt);
  });
}

async function loadExpenses() {
  const res = await fetch(`${API}/expenses`);
  allExpenses = await res.json();
  applyFilters(); // render inicial
}

function applyFilters() {
  let filtered = [...allExpenses];

  // categorias
  const checked = Array.from(
    el.filterCats.querySelectorAll('input:checked')
  ).map(i => i.value);
  if (checked.length) filtered = filtered.filter(e => checked.includes(e.categoria));

  // descrição
  const desc = el.desc.value.toLowerCase().trim();
  if (desc) filtered = filtered.filter(e => e.descricao.toLowerCase().includes(desc));

  // data
  if (el.start.value) {
    const dtStart = new Date(el.start.value);
    filtered = filtered.filter(e => new Date(e.data_registro) >= dtStart);
  }
  if (el.end.value) {
    const dtEnd = new Date(el.end.value);
    filtered = filtered.filter(e => new Date(e.data_registro) <= dtEnd);
  }

  renderTable(filtered);
  renderSummary(filtered);
  renderChart(filtered);
}

function resetFilters() {
  el.desc.value = '';
  el.start.value = '';
  el.end.value = '';
  el.filterCats.querySelectorAll('input').forEach(i => i.checked = false);
  applyFilters();
}

function renderTable(data) {
  el.tableBody.innerHTML = '';
  data.forEach(e => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>R$ ${e.valor.toFixed(2)}</td>
      <td>${e.descricao}</td>
      <td>${e.categoria}</td>
      <td>${new Date(e.data_registro).toLocaleString('pt-BR')}</td>
      <td>
        <button class="btn btn-warning btn-sm me-1" onclick="editExpense(${e.id})">Editar</button>
        <button class="btn btn-danger btn-sm" onclick="deleteExpense(${e.id})">Excluir</button>
      </td>`;
    el.tableBody.appendChild(tr);
  });
}

function renderSummary(data) {
  // total gasto
  const total = data.reduce((s, e) => s + e.valor, 0);
  el.totalSpent.textContent = `R$ ${total.toFixed(2)}`;

  // por categoria
  const sums = {};
  data.forEach(e => sums[e.categoria] = (sums[e.categoria]||0) + e.valor);
  el.listByCat.innerHTML = '';
  for (let [cat, val] of Object.entries(sums)) {
    const li = document.createElement('li');
    const pct = ((val/total)*100).toFixed(1);
    li.textContent = `${cat}: R$ ${val.toFixed(2)} (${pct}%)`;
    el.listByCat.appendChild(li);
  }
}

function renderChart(data) {
  const sums = {};
  data.forEach(e => sums[e.categoria] = (sums[e.categoria]||0) + e.valor);
  const labels = Object.keys(sums), values = Object.values(sums);

  if (chart) chart.destroy();
  chart = new Chart(el.chartCanvas, {
    type: 'pie',
    data: {
      labels,
      datasets: [{ data: values, backgroundColor: ['#0d6efd','#198754','#ffc107','#dc3545','#6f42c1'] }]
    },
    options: {
      responsive: true,
      plugins: { legend: { position: 'bottom' } }
    }
  });
}

function showForm() {
  el.formTitle.textContent = 'Nova Despesa';
  el.expenseForm.reset();
  el.expId.value = '';
  el.dateGroup.style.display = 'none';
  el.formCard.style.display = 'block';
}

async function saveExpense(evt) {
  evt.preventDefault();
  const e = {
    valor: parseFloat(el.expValue.value),
    descricao: el.expDesc.value,
    categoria: el.expCat.value,
    data_registro: el.expOld.checked ? el.dateInput.value : null
  };
  const id = el.expId.value;
  const method = id ? 'PUT' : 'POST';
  const url = `${API}/expenses${id?'/'+id:''}`;
  await fetch(url, { method, headers:{'Content-Type':'application/json'}, body:JSON.stringify(e) });
  el.formCard.style.display = 'none';
  loadExpenses();
}

window.editExpense = async function(id) {
  const res = await fetch(`${API}/expenses/${id}`);
  const e = await res.json();
  el.expId.value = e.id;
  el.expValue.value = e.valor;
  el.expDesc.value = e.descricao;
  el.expCat.value = e.categoria;
  el.expOld.checked = !!e.data_registro;
  el.dateGroup.style.display = el.expOld.checked ? 'block' : 'none';
  if (e.data_registro) {
    el.dateInput.value = e.data_registro.replace(' ', 'T').slice(0,16);
  }
  el.formTitle.textContent = 'Editando Despesa';
  el.formCard.style.display = 'block';
};

window.deleteExpense = async function(id) {
  if (!confirm('Confirma exclusão?')) return;
  await fetch(`${API}/expenses/${id}`, { method:'DELETE' });
  loadExpenses();
};

async function saveCategory(evt) {
  evt.preventDefault();
  const name = el.catName.value.trim();
  if (!name) return;
  await fetch(`${API}/categories`, {
    method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ name })
  });
  el.catName.value = '';
  loadCategories();
  loadExpenses();
}
