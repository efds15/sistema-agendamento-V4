# 🎓 Agendamento — Sistema de Agendamento
## Stack: Node.js + Express + MySQL · React + Vite

---

## ⚡ Como rodar

### Pré-requisitos
- Node.js 18+
- MySQL 8+ rodando localmente

### 1. Configurar o banco de dados

```bash
# Criar o schema no MySQL (use o Workbench ou terminal):
mysql -u root -p < agendamento_schema.sql
```

Ou deixe o próprio backend criar automaticamente:
```bash
cd backend
npm install
node src/database/migrate.js   # cria banco + tabelas
```

### 2. Configurar variáveis de ambiente

```bash
cd backend
cp .env.example .env
```

Edite o `.env` com suas credenciais MySQL:
```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=sua_senha
DB_NAME=agendamento
JWT_SECRET=troque_por_um_valor_seguro
```

### 3. Iniciar o backend

```bash
cd backend
npm install
npm run dev       # desenvolvimento (auto-reload)
# ou
npm start         # produção
```

O servidor sobe em **http://localhost:3001**
Na primeira execução, os dados de exemplo são inseridos automaticamente.

### 4. Iniciar o frontend

```bash
cd frontend
npm install
npm run dev
```

Acesse **http://localhost:5173** 🎉

---

## 🔑 Credenciais de teste

| Perfil        | Email                  | Senha    |
|---------------|------------------------|----------|
| Administrador | admin@agendamento.com       | admin123 |
| Professor     | joao@agendamento.com        | prof123  |
| Coordenador   | carlos@agendamento.com      | prof123  |

---

## 📁 Estrutura

```
agendamento/
├── backend/
│   ├── server.js                    ← Ponto de entrada
│   ├── .env                         ← Variáveis (DB, JWT)
│   └── src/
│       ├── database/
│       │   ├── connection.js        ← Pool MySQL
│       │   ├── migrate.js           ← Cria tabelas (npm run db:migrate)
│       │   └── seed.js              ← Dados iniciais  (npm run db:seed)
│       ├── middleware/
│       │   └── auth.js              ← JWT + roles
│       ├── controllers/
│       │   ├── authController.js
│       │   ├── bookingController.js ← Detecção de conflito
│       │   └── resourceController.js
│       └── routes/index.js
│
└── frontend/
    └── src/
        ├── services/api.js          ← Axios + interceptors
        ├── contexts/AuthContext.jsx
        ├── components/
        │   ├── Layout.jsx           ← Sidebar mini + navbar
        │   └── UI.jsx               ← Componentes reutilizáveis
        └── pages/
            ├── Login.jsx
            ├── Dashboard.jsx
            ├── Calendario.jsx       ← Fluxo principal de agendamento
            ├── Agendamentos.jsx     ← Lista + edição inline
            └── Recursos.jsx        ← Ambientes, Equipamentos, Professores
```

---

## 📡 Endpoints da API

| Método   | Rota                           | Acesso  | Descrição                   |
|----------|--------------------------------|---------|-----------------------------|
| POST     | /api/auth/login                | Público | Login                       |
| GET      | /api/auth/me                   | ✅      | Usuário logado              |
| PUT      | /api/auth/password             | ✅      | Alterar senha               |
| GET      | /api/dashboard                 | ✅      | Estatísticas do dia         |
| GET      | /api/bookings                  | ✅      | Listar agendamentos         |
| POST     | /api/bookings                  | ✅      | Criar agendamento           |
| PUT      | /api/bookings/:id              | ✅      | Editar agendamento          |
| DELETE   | /api/bookings/:id              | ✅      | Cancelar agendamento        |
| GET      | /api/bookings/availability     | ✅      | Disponibilidade por horário |
| GET      | /api/resources                 | ✅      | Listar ambientes            |
| POST     | /api/resources                 | 👑      | Criar ambiente              |
| PUT      | /api/resources/:id             | 👑      | Editar ambiente             |
| DELETE   | /api/resources/:id             | 👑      | Desativar ambiente          |
| GET      | /api/equipments                | ✅      | Listar equipamentos         |
| POST     | /api/equipments                | 👑      | Criar equipamento           |
| PUT      | /api/equipments/:id            | 👑      | Editar equipamento          |
| GET      | /api/teachers                  | ✅      | Listar professores          |
| POST     | /api/teachers                  | 👑      | Cadastrar professor         |
| PUT      | /api/teachers/:id              | 👑      | Editar professor            |
| PATCH    | /api/teachers/:id/toggle       | 👑      | Ativar/Desativar            |

✅ = Autenticado  |  👑 = Admin ou Coordenador

---

## 🌐 Deploy (produção)

**Backend (Railway / Render / VPS):**
```bash
npm install
node src/database/migrate.js
npm start
```
Configure as variáveis de ambiente na plataforma.

**Frontend (Vercel / Netlify):**
```bash
npm run build   # gera /dist
```
Defina `VITE_API_URL=https://sua-api.com/api` no painel da plataforma.
