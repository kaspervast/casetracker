# CaseGraph LE

CaseGraph LE is a self-hosted investigation case-management and link-analysis MVP for authorized law-enforcement use.

The current build implements the Phase 1 foundation from `CaseGraph_LE_AI_Build_Prompt.md`:

- FastAPI backend with PostgreSQL and SQLAlchemy.
- Alembic migration scaffold.
- Local username/password auth with Argon2id hashing.
- JWT sessions, login failure lockout, and audit logging.
- RBAC seed data for Super Admin, Admin Officer, Investigating Officer, Assistant Officer, Read-only Viewer, and Auditor.
- Case CRUD, person CRUD, manual relationship CRUD, dashboard, audit log APIs, and case/person graph APIs.
- React/Vite frontend with login, dashboard, case list/create, person list/create, graph view, and audit view.
- Docker Compose for PostgreSQL, backend, and frontend.
- Backup and restore scripts plus import CSV templates.

## Local Credentials

Seed users:

- `superadmin` / `ChangeMe#2026`
- `adminofficer` / `Admin#2026`
- `iofficer` / `Officer#2026`

Change these passwords after first login.

## Run With Docker

Copy the environment file:

```bash
cp .env.example .env
```

Start the stack:

```bash
docker compose up -d --build
```

Open:

- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:8000`
- API docs: `http://localhost:8000/docs`
- PostgreSQL host port: `localhost:5566`

## Run Backend Locally

Use the provided PostgreSQL server:

```bash
cd backend
python -m venv .venv
. .venv/Scripts/activate
pip install -r requirements.txt
copy ..\.env.example .env
python scripts/create_database.py
alembic upgrade head
python -m app.db.seed
uvicorn app.main:app --reload --port 8000
```

The database credentials supplied in the build prompt were `postgress` / `caseMgmt#2026`.
On this machine the running localhost Postgres service accepted `postgres` / `caseMgmt#2026`, so `backend/.env` has been set to:

```text
postgresql+psycopg://postgres:caseMgmt%232026@localhost:5566/casegraph_le
```

If your target server really uses `postgress`, change `DATABASE_URL` back to that username.

## Run Frontend Locally

```bash
cd frontend
npm install
npm run dev
```

## Backup

```bash
scripts/backup.sh
```

## Restore

```bash
scripts/restore.sh backups/<backup-folder>
```

## Operational Notice

This system is intended only for authorized official use. All access, exports, and evidence downloads are logged. Do not expose it directly to the public internet.
