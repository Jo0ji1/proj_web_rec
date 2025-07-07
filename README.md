# 📊 DespesasApp

Um **sistema de registro de despesas pessoais** simplificado, desenvolvido como atividade de recuperação para a disciplina de Desenvolvimento Web. Permite anotar, categorizar e visualizar seus gastos de forma dinâmica, responsiva e intuitiva.

---

## 🚀 Demo em Produção

- **Frontend:** https://affectionate-solace-production.up.railway.app  
- **API (backend):** https://projwebrec-production.up.railway.app
- **Vídeo demonstrativo:** https://\<link-do-vídeo\>

---

## 📝 Descrição da Atividade

- **Objetivo:** demonstrar domínio de tecnologias _front-end_ (HTML, CSS, JavaScript), _back-end_ (Flask + SQLAlchemy), versionamento Git, deploy e apresentação.  
- **Cenário:** ferramenta rápida para registrar gastos diários, editar/excluir despesas, filtrar por categoria, gerar relatórios visuais e exportar CSV.  
- **Requisitos Funcionais:**
  1. **Front-end**  
     - Listagem, inclusão, edição e exclusão de despesas  
     - Formulários validados, responsivos (desktop ↔ mobile)  
     - Filtros por múltiplas categorias, data e descrição  
     - Interação dinâmica via Fetch API (sem recarregar a página)  
     - Cards de resumo (total gasto, % por categoria) e gráfico de pizza  
     - Tema claro / escuro, _toasts_, overlay de carregamento e tratamento de erros  
  2. **Back-end**  
     - API RESTful com Flask + SQLAlchemy + Flask-Migrate  
     - Banco MySQL em nuvem (Railway), migrations automáticas  
     - Endpoints:  
       - `GET /health` — status do serviço  
       - `GET /categories`, `POST /categories`  
       - `GET /expenses`, `POST /expenses`  
       - `GET /expenses/:id`, `PUT /expenses/:id`, `DELETE /expenses/:id`  
  3. **Entrega**  
     - Repositório GitHub com histórico organizado  
     - Deploy no Railway (backend) e Railway Static / Netlify (frontend)  
     - Vídeo ≤ 5 min mostrando todas as funcionalidades  
     - `README.md` com instruções claras  

---

## 🛠️ Stack Tecnológica

- **Frontend:**  
  - HTML5 | CSS3 (Bootstrap 5.3) | JavaScript (ES6)  
  - Chart.js (gráfico de pizza)  
- **Backend:**  
  - Python 3.12 | Flask | Flask-CORS  
  - Flask-SQLAlchemy | Flask-Migrate | PyMySQL  
  - Gunicorn (servidor WSGI)  
- **Banco de Dados:** MySQL (Railway plugin)  
- **Deploy:** Railway.app (Docker/Nixpacks)  
- **Versionamento:** Git + GitHub  

---

## ⚙️ Como Rodar Localmente

### Backend

cd backend
python3 -m venv venv
source venv/bin/activate          # (Windows PowerShell: .\venv\Scripts\Activate.ps1)
pip install -r requirements.txt
export FLASK_APP=app.py           # Windows CMD: set FLASK_APP=app.py
flask db upgrade                  # cria/atualiza tabelas
flask run                         # inicia em http://127.0.0.1:5000

### Frontend
##Sem bundler: todo o código está pronto em /frontend/

cd frontend
# Se estiver usando http-server via NPM:
npm install
npm start                        # inicia em http://127.0.0.1:8080

# Ou, via Python HTTP nativo:
python3 -m http.server 8080 --directory .  
Abra http://localhost:8080 no navegador.


🔧 Deploy em Produção
Frontend

Via GitHub Repo + Nixpacks
Add Service → GitHub Repo

Root Directory = frontend/

Build Command: (vazio)

Start Command: (vazio — usará npm start do package.json)

🔑 Variáveis de Ambiente
Chave	Descrição
Em Variables, defina:

API_URL=https://<seu-backend>.up.railway.app
API_URL	URL do backend para o frontend fazer fetch em produção


✅ Conclusão
Este projeto demonstra o fluxo completo de desenvolvimento web full-stack:

APIs RESTful em Flask

Banco relacional com migrations

Front-end interativo e responsivo

Deploy contínuo em ambiente real

Boas práticas de UX (toasts, loaders, tratamento de erros)

Qualquer dúvida ou sugestão, abra uma issue ou envie um PR! 😃
