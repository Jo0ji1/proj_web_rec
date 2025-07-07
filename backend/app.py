import os
import pymysql
pymysql.install_as_MySQLdb()  # faz o pymysql responder como MySQLdb

from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate

# --- Inicialização do app ---
app = Flask(__name__)
CORS(app)

# --- Configuração do banco ---
# Lê a URL do Railway (ou usa SQLite local)
raw_url = os.getenv('DATABASE_URL')
if raw_url and raw_url.startswith('mysql://'):
    # ajusta para o driver pymysql
    db_url = raw_url.replace('mysql://', 'mysql+pymysql://', 1)
else:
    db_url = raw_url or 'sqlite:///db.sqlite3'

print(f'>>> Conectando via SQLALCHEMY_DATABASE_URI = {db_url}')
app.config['SQLALCHEMY_DATABASE_URI'] = db_url
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db      = SQLAlchemy(app)
migrate = Migrate(app, db)


# --- Models ---
class Category(db.Model):
    __tablename__ = 'categories'
    name = db.Column(db.String(50), primary_key=True)


class Expense(db.Model):
    __tablename__ = 'expenses'
    id            = db.Column(db.Integer, primary_key=True)
    valor         = db.Column(db.Numeric(10,2), nullable=False)
    descricao     = db.Column(db.String(50), nullable=False)
    categoria     = db.Column(db.String(50), db.ForeignKey('categories.name'), nullable=False)
    data_registro = db.Column(db.DateTime(timezone=True), server_default=db.func.now())

    def to_dict(self):
        return {
            'id': self.id,
            'valor': float(self.valor),
            'descricao': self.descricao,
            'categoria': self.categoria,
            'data_registro': self.data_registro.isoformat()
        }


# --- Health Check ---
@app.route('/health')
def health_check():
    try:
        db.session.execute('SELECT 1')
        return jsonify(status='ok', db='connected')
    except Exception as e:
        return jsonify(status='error', db=str(e)), 500


# --- Categories API ---
@app.route('/categories', methods=['GET'])
def list_categories():
    cats = Category.query.order_by(Category.name).all()
    return jsonify([c.name for c in cats]), 200


@app.route('/categories', methods=['POST'])
def create_category():
    data = request.get_json() or {}
    name = data.get('name','').strip()
    if not name:
        return jsonify(error='Nome é obrigatório'), 400
    if Category.query.get(name):
        return jsonify(error='Já existe'), 409
    db.session.add(Category(name=name))
    db.session.commit()
    return jsonify(created=name), 201


# --- Expenses API ---
@app.route('/expenses', methods=['GET'])
def list_expenses():
    param = request.args.get('category','').strip()
    q = Expense.query
    if param:
        cats = [c.strip() for c in param.split(',') if c.strip()]
        q = q.filter(Expense.categoria.in_(cats))
    exps = q.order_by(Expense.data_registro.desc()).all()
    return jsonify([e.to_dict() for e in exps]), 200


@app.route('/expenses/<int:expense_id>', methods=['GET'])
def get_expense(expense_id):
    e = Expense.query.get(expense_id)
    if not e:
        return jsonify(error='Despesa não encontrada'), 404
    return jsonify(e.to_dict()), 200


@app.route('/expenses', methods=['POST'])
def create_expense():
    data      = request.get_json() or {}
    valor     = data.get('valor')
    descricao = (data.get('descricao') or '').strip()
    categoria = (data.get('categoria') or '').strip()
    dreg      = data.get('data_registro')

    if valor is None or not descricao or not categoria:
        return jsonify(error='Campos faltando'), 400
    if not Category.query.get(categoria):
        return jsonify(error='Categoria inválida'), 400

    e = Expense(valor=valor, descricao=descricao, categoria=categoria, data_registro=dreg)
    db.session.add(e)
    db.session.commit()
    return jsonify(id=e.id), 201


@app.route('/expenses/<int:expense_id>', methods=['PUT'])
def update_expense(expense_id):
    e = Expense.query.get(expense_id)
    if not e:
        return jsonify(error='Despesa não encontrada'), 404

    data      = request.get_json() or {}
    valor     = data.get('valor')
    descricao = (data.get('descricao') or '').strip()
    categoria = (data.get('categoria') or '').strip()
    dreg      = data.get('data_registro')

    if valor is None or not descricao or not categoria:
        return jsonify(error='Campos faltando'), 400
    if not Category.query.get(categoria):
        return jsonify(error='Categoria inválida'), 400

    e.valor         = valor
    e.descricao     = descricao
    e.categoria     = categoria
    e.data_registro = dreg or e.data_registro
    db.session.commit()
    return jsonify(updated=expense_id), 200


@app.route('/expenses/<int:expense_id>', methods=['DELETE'])
def delete_expense(expense_id):
    e = Expense.query.get(expense_id)
    if not e:
        return jsonify(error='Despesa não encontrada'), 404
    db.session.delete(e)
    db.session.commit()
    return jsonify(deleted=expense_id), 200


# --- Entrada ---
if __name__ == '__main__':
    app.run(debug=True)
