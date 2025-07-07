import sqlite3
from flask import Flask, request, jsonify, g
from flask_cors import CORS

# --- CONFIGURAÇÃO DO FLASK E CORS ---
app = Flask(__name__)
CORS(app)

# --- CONFIGURAÇÃO DO BANCO ---
DATABASE = 'db.sqlite3'

def get_db():
    """Abre conexão com o SQLite e guarda em g._database."""
    db = getattr(g, '_database', None)
    if db is None:
        db = g._database = sqlite3.connect(DATABASE)
        db.row_factory = sqlite3.Row
    return db

@app.teardown_appcontext
def close_connection(exception):
    """Fecha a conexão ao final de cada request."""
    db = getattr(g, '_database', None)
    if db is not None:
        db.close()

def init_db():
    """Cria a tabela expenses caso não exista."""
    sql = """
    CREATE TABLE IF NOT EXISTS expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      valor REAL NOT NULL,
      descricao TEXT NOT NULL,
      categoria TEXT NOT NULL,
      data_registro DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    """
    db = get_db()
    db.execute(sql)
    db.commit()

# Inicializa o banco ao iniciar a aplicação
with app.app_context():
    init_db()

# --- ROTAS RESTful ---

# 1) LISTAR despesas (GET /expenses?category=…)
@app.route('/expenses', methods=['GET'])
def list_expenses():
    categoria = request.args.get('category')
    db = get_db()
    if categoria:
        cur = db.execute('SELECT * FROM expenses WHERE categoria = ?', (categoria,))
    else:
        cur = db.execute('SELECT * FROM expenses')
    rows = cur.fetchall()
    expenses = [dict(r) for r in rows]
    return jsonify(expenses), 200

# 2) CRIAR despesa (POST /expenses)
@app.route('/expenses', methods=['POST'])
def create_expense():
    data = request.get_json()
    valor = data.get('valor')
    descricao = data.get('descricao')
    categoria = data.get('categoria')
    if valor is None or descricao is None or categoria is None:
        return jsonify({'error': 'Campos faltando'}), 400
    db = get_db()
    cur = db.execute(
        'INSERT INTO expenses (valor, descricao, categoria) VALUES (?, ?, ?)',
        (valor, descricao, categoria)
    )
    db.commit()
    return jsonify({'id': cur.lastrowid}), 201

# 3) ATUALIZAR despesa (PUT /expenses/<id>)
@app.route('/expenses/<int:expense_id>', methods=['PUT'])
def update_expense(expense_id):
    data = request.get_json()
    valor = data.get('valor')
    descricao = data.get('descricao')
    categoria = data.get('categoria')
    if valor is None or descricao is None or categoria is None:
        return jsonify({'error': 'Campos faltando'}), 400
    db = get_db()
    db.execute(
        'UPDATE expenses SET valor=?, descricao=?, categoria=? WHERE id=?',
        (valor, descricao, categoria, expense_id)
    )
    db.commit()
    return jsonify({'updated': expense_id}), 200

# 4) EXCLUIR despesa (DELETE /expenses/<id>)
@app.route('/expenses/<int:expense_id>', methods=['DELETE'])
def delete_expense(expense_id):
    db = get_db()
    db.execute('DELETE FROM expenses WHERE id = ?', (expense_id,))
    db.commit()
    return jsonify({'deleted': expense_id}), 200

# --- RODA O SERVIDOR EM MODO DESENVOLVIMENTO ---
if __name__ == '__main__':
    app.run(debug=True)
