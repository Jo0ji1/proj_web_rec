import sqlite3
import os
from flask import Flask, request, jsonify, g
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# para SQLite local; em produção use uma variável de ambiente apontando pra outro DB
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
    db = get_db()
    db.execute("""
    CREATE TABLE IF NOT EXISTS expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      valor REAL NOT NULL,
      descricao TEXT NOT NULL,
      categoria TEXT NOT NULL,
      data_registro DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    """)
    db.execute("""
    CREATE TABLE IF NOT EXISTS categories (
      name TEXT PRIMARY KEY
    );
    """)
    # inserir categorias iniciais
    for c in ('Alimentação','Transporte','Lazer','Contas'):
        try:
            db.execute('INSERT INTO categories(name) VALUES(?)', (c,))
        except sqlite3.IntegrityError:
            pass
    db.commit()

with app.app_context():
    init_db()

@app.route('/health')
def health_check():
    try:
        # executa um SELECT 1 simples na conexão SQLite
        conn = get_db()
        conn.execute('SELECT 1')
        return jsonify(status='ok', db='connected')
    except Exception as e:
        return jsonify(status='error', db=str(e)), 500

@app.route('/expenses', methods=['GET'])
def list_expenses():
    cat = request.args.get('categories')
    db = get_db()
    if cat:
        lst = cat.split(',')
        placeholder = ','.join('?' * len(lst))
        cur = db.execute(f"SELECT * FROM expenses WHERE categoria IN ({placeholder})", lst)
    else:
        cur = db.execute('SELECT * FROM expenses')
    return jsonify([dict(r) for r in cur.fetchall()]), 200

@app.route('/expenses/<int:expense_id>', methods=['GET'])
def get_expense(expense_id):
    db = get_db()
    cur = db.execute('SELECT * FROM expenses WHERE id=?', (expense_id,))
    row = cur.fetchone()
    if not row:
        return jsonify({'error': 'Despesa não encontrada'}), 404
    return jsonify(dict(row)), 200

@app.route('/expenses', methods=['POST'])
def create_expense():
    data = request.get_json()
    valor = data.get('valor')
    desc  = data.get('descricao')
    cat   = data.get('categoria')
    dreg  = data.get('data_registro')
    if valor is None or desc is None or cat is None:
        return jsonify({'error': 'Campos faltando'}), 400
    db = get_db()
    if dreg:
        cur = db.execute(
            'INSERT INTO expenses(valor,descricao,categoria,data_registro) VALUES(?,?,?,?)',
            (valor, desc, cat, dreg)
        )
    else:
        cur = db.execute(
            'INSERT INTO expenses(valor,descricao,categoria) VALUES(?,?,?)',
            (valor, desc, cat)
        )
    db.commit()
    return jsonify({'id': cur.lastrowid}), 201

@app.route('/expenses/<int:expense_id>', methods=['PUT'])
def update_expense(expense_id):
    data = request.get_json()
    valor = data.get('valor')
    desc  = data.get('descricao')
    cat   = data.get('categoria')
    dreg  = data.get('data_registro')
    if valor is None or desc is None or cat is None:
        return jsonify({'error': 'Campos faltando'}), 400
    db = get_db()
    if dreg:
        db.execute(
            'UPDATE expenses SET valor=?,descricao=?,categoria=?,data_registro=? WHERE id=?',
            (valor, desc, cat, dreg, expense_id)
        )
    else:
        db.execute(
            'UPDATE expenses SET valor=?,descricao=?,categoria=? WHERE id=?',
            (valor, desc, cat, expense_id)
        )
    db.commit()
    return jsonify({'updated': expense_id}), 200

@app.route('/categories', methods=['GET'])
def list_categories():
    cur = get_db().execute('SELECT name FROM categories ORDER BY name')
    return jsonify([r['name'] for r in cur.fetchall()]), 200

@app.route('/categories', methods=['POST'])
def create_category():
    name = request.get_json().get('name')
    if not name:
        return jsonify({'error': 'Nome é obrigatório'}), 400
    try:
        get_db().execute('INSERT INTO categories(name) VALUES(?)', (name,))
        get_db().commit()
        return jsonify({'created': name}), 201
    except sqlite3.IntegrityError:
        return jsonify({'error': 'Já existe'}), 409

@app.route('/expenses/<int:expense_id>', methods=['DELETE'])
def delete_expense(expense_id):
    get_db().execute('DELETE FROM expenses WHERE id=?', (expense_id,))
    get_db().commit()
    return jsonify({'deleted': expense_id}), 200

if __name__ == '__main__':
    app.run(debug=True)
