// js/app.js
const API = 'https://projwebrec-production.up.railway.app';

let allExpenses = [];
let categories   = [];
let chart;
let currentPage  = 1;
const pageSize   = 10;
let sortField    = null;
let sortAsc      = true;

const el = {
  loadingOverlay: document.getElementById('loading-overlay'),
  toastContainer: document.getElementById('toast-container'),
  globalAlerts:   document.getElementById('global-alerts'),
  filterCats:     document.getElementById('filter-categories'),
  desc:           document.getElementById('filter-description'),
  start:          document.getElementById('filter-start'),
  end:            document.getElementById('filter-end'),
  formFilter:     document.getElementById('filter-form'),
  btnReset:       document.getElementById('reset-filters'),
  btnNew:         document.getElementById('btn-new'),
  btnNewBottom:   document.getElementById('btn-new-bottom'),
  exportCsv:      document.getElementById('export-csv'),
  themeToggle:    document.getElementById('theme-toggle'),
  tableBody:      document.querySelector('#expenses-table tbody'),
  pagination:     document.getElementById('pagination'),
  totalSpent:     document.getElementById('total-spent'),
  listByCat:      document.getElementById('list-by-category'),
  chartCanvas:    document.getElementById('chart-canvas'),
  formCard:       document.getElementById('form-card'),
  formTitle:      document.getElementById('form-title'),
  expenseForm:    document.getElementById('expense-form'),
  expId:          document.getElementById('expense-id'),
  expValue:       document.getElementById('expense-value'),
  expDesc:        document.getElementById('expense-desc'),
  expCat:         document.getElementById('expense-cat'),
  expOld:         document.getElementById('expense-old'),
  dateGroup:      document.getElementById('date-group'),
  dateInput:      document.getElementById('expense-date'),
  catForm:        document.getElementById('category-form'),
  catName:        document.getElementById('category-name'),
};

// Loading overlay
function showLoader() {
  el.loadingOverlay.classList.remove('d-none');
}
function hideLoader() {
  el.loadingOverlay.classList.add('d-none');
}

// Toast notifications
function showToast(message, type = 'success') {
  const toastEl = document.createElement('div');
  toastEl.className = `toast align-items-center text-bg-${type} border-0`;
  toastEl.role = 'alert';
  toastEl.ariaLive = 'assertive';
  toastEl.ariaAtomic = 'true';
  toastEl.innerHTML = `
    <div class="d-flex">
      <div class="toast-body">${message}</div>
      <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
    </div>
  `;
  el.toastContainer.appendChild(toastEl);
  const bsToast = new bootstrap.Toast(toastEl, { delay: 3000 });
  bsToast.show();
  toastEl.addEventListener('hidden.bs.toast', () => toastEl.remove());
}

// Global alerts (for errors)
function showAlert(message, type = 'danger', timeout = 5000) {
  const alert = document.createElement('div');
  alert.className = `alert alert-${type} alert-dismissible fade show`;
  alert.role = 'alert';
  alert.innerHTML = `
    ${message}
    <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
  `;
  el.globalAlerts.appendChild(alert);
  if (timeout) setTimeout(() => alert.remove(), timeout);
}

function toggleFormButtons(form, disabled) {
  form.querySelectorAll('button, input[type="submit"]').forEach(btn => {
    btn.disabled = disabled;
  });
}

// Dark/Light Mode
(function(){
  const current = localStorage.getItem('theme') || 'light';
  document.documentElement.setAttribute('data-theme', current);
  el.themeToggle.textContent = current === 'light' ? '🌙' : '☀️';
  el.themeToggle.onclick = () => {
    const next = document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
    el.themeToggle.textContent = next === 'light' ? '🌙' : '☀️';
    showToast(`Tema ${next === 'light' ? 'claro' : 'escuro'} ativado.`);
  };
})();

window.addEventListener('DOMContentLoaded', () => {
  loadCategories();
  loadExpenses();
  setupListeners();
});

function setupListeners() {
  el.formFilter.addEventListener('submit', e => {
    e.preventDefault();
    currentPage = 1;
    applyFilters();
  });
  el.btnReset.addEventListener('click', () => {
    el.desc.value = ''; el.start.value = ''; el.end.value = '';
    el.filterCats.querySelectorAll('input').forEach(i=>i.checked=false);
    currentPage = 1;
    applyFilters();
  });
  el.btnNew.addEventListener('click', showForm);
  el.btnNewBottom.addEventListener('click', showForm);
  el.exportCsv.addEventListener('click', exportCSV);
  el.expOld.addEventListener('change', () => {
    el.dateGroup.style.display = el.expOld.checked ? 'block' : 'none';
  });
  el.expenseForm.addEventListener('submit', saveExpense);
  el.catForm.addEventListener('submit', saveCategory);
}

async function loadCategories() {
  showLoader();
  try {
    const res = await fetch(`${API}/categories`);
    if (!res.ok) throw new Error(`Status ${res.status}`);
    categories = await res.json();
    renderCategoryFilters();
    renderCategoryOptions();
  } catch (err) {
    console.error(err);
    showAlert(`Erro ao carregar categorias: ${err.message}`);
  } finally {
    hideLoader();
  }
}

async function loadExpenses() {
  showLoader();
  try {
    const res = await fetch(`${API}/expenses`);
    if (!res.ok) throw new Error(`Status ${res.status}`);
    allExpenses = await res.json();
    applyFilters();
  } catch (err) {
    console.error(err);
    showAlert(`Erro ao carregar despesas: ${err.message}`);
  } finally {
    hideLoader();
  }
}

function applyFilters() {
  let data = [...allExpenses];
  const checked = Array.from(el.filterCats.querySelectorAll('input:checked')).map(i=>i.value);
  if (checked.length) data = data.filter(e=>checked.includes(e.categoria));
  const desc = el.desc.value.toLowerCase().trim();
  if (desc) data = data.filter(e=>e.descricao.toLowerCase().includes(desc));
  if (el.start.value) data = data.filter(e=>new Date(e.data_registro)>=new Date(el.start.value));
  if (el.end.value)   data = data.filter(e=>new Date(e.data_registro)<=new Date(el.end.value));
  if (sortField) {
    data.sort((a,b)=>{
      if(a[sortField]<b[sortField]) return sortAsc?-1:1;
      if(a[sortField]>b[sortField]) return sortAsc?1:-1;
      return 0;
    });
  }
  renderTable(data);
  renderSummary(data);
  renderChart(data);
}

function renderCategoryFilters() {
  el.filterCats.innerHTML = '';
  categories.forEach(c=>{
    const chk = document.createElement('div');
    chk.className = 'form-check';
    chk.innerHTML = `
      <input class="form-check-input" type="checkbox" value="${c}" id="fcat-${c}">
      <label class="form-check-label" for="fcat-${c}">${c}</label>
    `;
    el.filterCats.appendChild(chk);
  });
}

function renderCategoryOptions() {
  el.expCat.innerHTML = '<option value="">Selecione...</option>';
  categories.forEach(c=>{
    const opt = document.createElement('option');
    opt.value = c; opt.textContent = c;
    el.expCat.appendChild(opt);
  });
}

function renderTable(data) {
  const totalPages = Math.ceil(data.length/pageSize);
  const start = (currentPage-1)*pageSize;
  const slice = data.slice(start,start+pageSize);
  el.tableBody.innerHTML = '';
  slice.forEach(e=>{
    const tr=document.createElement('tr');
    tr.innerHTML=`
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
  renderPagination(totalPages);
}

function renderPagination(totalPages) {
  el.pagination.innerHTML = '';
  for(let i=1;i<=totalPages;i++){
    const li=document.createElement('li');
    li.className=`page-item ${i===currentPage?'active':''}`;
    li.innerHTML=`<a class="page-link" href="#">${i}</a>`;
    li.onclick=e=>{e.preventDefault();currentPage=i;applyFilters();}
    el.pagination.appendChild(li);
  }
}

function renderSummary(data){
  const total=data.reduce((s,e)=>s+e.valor,0);
  el.totalSpent.textContent=`R$ ${total.toFixed(2)}`;
  const sums={};
  data.forEach(e=>sums[e.categoria]=(sums[e.categoria]||0)+e.valor);
  el.listByCat.innerHTML='';
  Object.entries(sums).forEach(([cat,val])=>{
    const pct=total?((val/total)*100).toFixed(1):0;
    const li=document.createElement('li');
    li.className='d-flex justify-content-between';
    li.innerHTML=`<span>${cat}</span><span>R$ ${val.toFixed(2)} (${pct}%)</span>`;
    el.listByCat.appendChild(li);
  });
}

function renderChart(data){
  const sums={};
  data.forEach(e=>sums[e.categoria]=(sums[e.categoria]||0)+e.valor);
  const labels=Object.keys(sums), values=Object.values(sums);
  if(chart) chart.destroy();
  chart=new Chart(el.chartCanvas,{
    type:'pie',
    data:{labels,datasets:[{data:values,backgroundColor:['#0d6efd','#198754','#ffc107','#dc3545','#6f42c1']}]},
    options:{responsive:true,plugins:{legend:{position:'bottom'}}}
  });
}

function showForm(){
  el.formTitle.textContent='Nova Despesa';
  el.expenseForm.reset();
  el.expId.value='';
  el.dateGroup.style.display='none';
  el.expenseForm.classList.remove('was-validated');
  el.formCard.style.display='block';
}

function validateExpense(){
  el.expenseForm.classList.add('was-validated');
  return el.expenseForm.checkValidity();
}

async function saveExpense(evt){
  evt.preventDefault();
  if(!validateExpense()) return;
  toggleFormButtons(el.expenseForm,true);
  showLoader();
  const payload={
    valor:parseFloat(el.expValue.value),
    descricao:el.expDesc.value.trim(),
    categoria:el.expCat.value,
    data_registro:el.expOld.checked?el.dateInput.value:null
  };
  const id=el.expId.value, method=id?'PUT':'POST';
  const url=`${API}/expenses${id?'/'+id:''}`;
  try{
    const res=await fetch(url,{method,headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
    if(!res.ok){const t=await res.text();throw new Error(`(${res.status}) ${t}`);}
    el.formCard.style.display='none';
    showToast('Despesa salva com sucesso!');
    loadExpenses();
  }catch(err){
    console.error(err);
    showAlert(`Erro ao salvar despesa: ${err.message}`);
  }finally{
    toggleFormButtons(el.expenseForm,false);
    hideLoader();
  }
}

window.editExpense=async function(id){
  try{
    showLoader();
    const res=await fetch(`${API}/expenses/${id}`);
    if(!res.ok) throw new Error(`Status ${res.status}`);
    const e=await res.json();
    el.expId.value=e.id;
    el.expValue.value=e.valor;
    el.expDesc.value=e.descricao;
    el.expCat.value=e.categoria;
    el.expOld.checked=!!e.data_registro;
    el.dateGroup.style.display=el.expOld.checked?'block':'none';
    if(e.data_registro) el.dateInput.value=e.data_registro.replace(' ','T').slice(0,16);
    el.formTitle.textContent='Editando Despesa';
    el.formCard.style.display='block';
  }catch(err){
    console.error(err);
    showAlert(`Erro ao carregar despesa: ${err.message}`);
  }finally{
    hideLoader();
  }
};

window.deleteExpense=async function(id){
  if(!confirm('Confirma exclusão?')) return;
  showLoader();
  try{
    const res=await fetch(`${API}/expenses/${id}`,{method:'DELETE'});
    if(!res.ok) throw new Error(`Status ${res.status}`);
    showToast('Despesa excluída.');
    loadExpenses();
  }catch(err){
    console.error(err);
    showAlert(`Erro ao excluir despesa: ${err.message}`);
  }finally{
    hideLoader();
  }
};

async function saveCategory(evt){
  evt.preventDefault();
  el.catForm.classList.add('was-validated');
  if(!el.catForm.checkValidity()) return;
  toggleFormButtons(el.catForm,true);
  showLoader();
  const name=el.catName.value.trim();
  try{
    const res=await fetch(`${API}/categories`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name})});
    if(!res.ok){const t=await res.text();throw new Error(`(${res.status}) ${t}`);}
    el.catName.value='';
    showToast('Categoria criada.');
    loadCategories();
    loadExpenses();
  }catch(err){
    console.error(err);
    showAlert(`Erro ao criar categoria: ${err.message}`);
  }finally{
    toggleFormButtons(el.catForm,false);
    hideLoader();
  }
}

function sortBy(field){
  if(sortField===field) sortAsc=!sortAsc;
  else{sortField=field;sortAsc=true;}
  applyFilters();
}

function exportCSV(){
  const rows=[['Valor','Descrição','Categoria','Data']];
  allExpenses.forEach(e=>{
    rows.push([
      e.valor.toFixed(2),
      `"${e.descricao.replace(/"/g,'""')}"`,
      e.categoria,
      new Date(e.data_registro).toLocaleString()
    ]);
  });
  const csv=new Blob([rows.map(r=>r.join(',')).join('\n')],{type:'text/csv;charset=utf-8;'});
  const url=URL.createObjectURL(csv);
  const a=document.createElement('a');
  a.href=url;a.download='despesas.csv';a.click();
  URL.revokeObjectURL(url);
}
