const API_URL = 'http://127.0.0.1:5000/expenses';

let editId = null;

// Elementos
const tableBody     = document.querySelector('#expenses-table tbody');
const form          = document.getElementById('expense-form');
const valorInput    = document.getElementById('valor');
const descInput     = document.getElementById('descricao');
const catInput      = document.getElementById('categoria');
const filterSelect  = document.getElementById('filter-category');
const formTitle     = document.getElementById('form-title');
const submitBtn     = document.getElementById('submit-btn');
const cancelBtn     = document.getElementById('cancel-btn');

// Carrega e renderiza despesas
async function loadExpenses() {
  const category = filterSelect.value;
  const url = category ? `${API_URL}?category=${category}` : API_URL;
  const res = await fetch(url);
  const expenses = await res.json();

  tableBody.innerHTML = '';
  expenses.forEach(exp => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${exp.valor.toFixed(2)}</td>
      <td>${exp.descricao}</td>
      <td>${exp.categoria}</td>
      <td>${new Date(exp.data_registro).toLocaleString('pt-BR')}</td>
      <td>
        <button class="btn btn-sm btn-warning me-2" onclick="startEdit(${exp.id})">Editar</button>
        <button class="btn btn-sm btn-danger"      onclick="deleteExpense(${exp.id})">Excluir</button>
      </td>`;
    tableBody.appendChild(tr);
  });
}

// Cria ou atualiza despesa
form.addEventListener('submit', async e => {
  e.preventDefault();
  const payload = {
    valor: parseFloat(valorInput.value),
    descricao: descInput.value,
    categoria: catInput.value
  };

  let method = 'POST', url = API_URL;
  if (editId) {
    method = 'PUT';
    url = `${API_URL}/${editId}`;
  }

  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    alert('Erro ao salvar despesa');
    return;
  }

  resetForm();
  loadExpenses();
});

// Inicia edição
window.startEdit = async id => {
  const res = await fetch(`${API_URL}/${id}`);
  if (!res.ok) return alert('Despesa não encontrada');
  const exp = await res.json();

  editId = id;
  formTitle.textContent = 'Editando Despesa';
  submitBtn.textContent = 'Atualizar';
  cancelBtn.style.display = 'inline-block';

  valorInput.value = exp.valor;
  descInput.value  = exp.descricao;
  catInput.value   = exp.categoria;
};

// Cancela edição
cancelBtn.addEventListener('click', () => {
  resetForm();
});

// Exclui despesa
window.deleteExpense = async id => {
  if (!confirm('Confirma exclusão?')) return;
  await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
  loadExpenses();
};

// Reseta formulário
function resetForm() {
  editId = null;
  formTitle.textContent = 'Nova Despesa';
  submitBtn.textContent = 'Salvar';
  cancelBtn.style.display = 'none';
  form.reset();
}

// Filtrar
filterSelect.addEventListener('change', loadExpenses);

// Inicialização
loadExpenses();
