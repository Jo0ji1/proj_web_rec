import sqlite3
from flask import Flask, request, jsonify, g
from flask_cors import CORS

app = Flask(__name__)
CORS(app)
DATABASE = 'db.sqlite3'

def get_db():
    db = getattr(g, '_database', None)
    if db is None:
        db = g._database = sqlite3.connect(DATABASE)
        db.row_factory = sqlite3.Row
    return db

@app.teardown_appcontext
def close_connection(exception):
    db = getattr(g, '_database', None)
    if db:
        db.close()

def init_db():
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

with app.app_context():
    init_db()

# 1) LISTAR todas as despesas (GET /expenses)
@app.route('/expenses', methods=['GET'])
def list_expenses():
    categoria = request.args.get('category')
    db = get_db()
    if categoria:
        cur = db.execute('SELECT * FROM expenses WHERE categoria = ?', (categoria,))
    else:
        cur = db.execute('SELECT * FROM expenses')
    rows = cur.fetchall()
    return jsonify([dict(r) for r in rows]), 200

# 2) BUSCAR uma despesa (GET /expenses/<id>)
@app.route('/expenses/<int:expense_id>', methods=['GET'])
def get_expense(expense_id):
    db = get_db()
    cur = db.execute('SELECT * FROM expenses WHERE id = ?', (expense_id,))
    row = cur.fetchone()
    if row is None:
        return jsonify({'error': 'Despesa não encontrada'}), 404
    return jsonify(dict(row)), 200

# 3) CRIAR despesa (POST /expenses)
@app.route('/expenses', methods=['POST'])
def create_expense():
    data = request.get_json()
    valor = data.get('valor')
    descricao = data.get('descricao')
    categoria = data.get('categoria')
    data_registro = data.get('data_registro')
    if None in (valor, descricao, categoria):
        return jsonify({'error': 'Campos faltando'}), 400
    db = get_db()
    if data_registro:
        cur = db.execute(
            'INSERT INTO expenses (valor, descricao, categoria, data_registro) VALUES (?, ?, ?, ?)',
            (valor, descricao, categoria, data_registro)
        )
    else:
        cur = db.execute(
            'INSERT INTO expenses (valor, descricao, categoria) VALUES (?, ?, ?)',
            (valor, descricao, categoria)
        )
    db.commit()
    return jsonify({'id': cur.lastrowid}), 201

# 4) ATUALIZAR despesa (PUT /expenses/<id>)
@app.route('/expenses/<int:expense_id>', methods=['PUT'])
def update_expense(expense_id):
    data = request.get_json()
    valor = data.get('valor')
    descricao = data.get('descricao')
    categoria = data.get('categoria')
    data_registro = data.get('data_registro')
    if None in (valor, descricao, categoria):
        return jsonify({'error': 'Campos faltando'}), 400
    db = get_db()
    if data_registro:
        db.execute(
            'UPDATE expenses SET valor=?, descricao=?, categoria=?, data_registro=? WHERE id=?',
            (valor, descricao, categoria, data_registro, expense_id)
        )
    else:
        db.execute(
            'UPDATE expenses SET valor=?, descricao=?, categoria=? WHERE id=?',
            (valor, descricao, categoria, expense_id)
        )
    db.commit()
    return jsonify({'updated': expense_id}), 200

# 5) EXCLUIR despesa (DELETE /expenses/<id>)
@app.route('/expenses/<int:expense_id>', methods=['DELETE'])
def delete_expense(expense_id):
    db = get_db()
    db.execute('DELETE FROM expenses WHERE id = ?', (expense_id,))
    db.commit()
    return jsonify({'deleted': expense_id}), 200

if __name__ == '__main__':
    app.run(debug=True)
# This code is a simple Flask application that provides a RESTful API for managing expenses.
# It allows you to list, create, update, and delete expenses stored in a SQLite database