# oued-eddahab# Oued Eddahab

Oued Eddahab is a university community platform where students can discover clubs, meet people, and follow university news and activities.

## Tech Stack

### Frontend
- Next.js 16
- React
- TypeScript
- Tailwind CSS

### Backend
- Bun
- Node.js / TypeScript
- Express
- Prisma ORM
- PostgreSQL
- Zod
- Argon2
- JSON Web Tokens (JWT)

### Development
- Docker / Docker Compose
- PostgreSQL 17

---

## Project Structure

```text
oued-eddahab/
├── .github/
│   └── workflows/
│       └── ...
│
├── backend/
│   ├── prisma/
│   │   ├── migrations/
│   │   └── schema.prisma
│   │
│   ├── src/
│   │   ├── generated/
│   │   │   └── prisma/
│   │   │
│   │   ├── lib/
│   │   │   └── prisma.ts
│   │   │
│   │   ├── modules/
│   │   │   └── auth/
│   │   │       ├── auth.controller.ts
│   │   │       ├── auth.routes.ts
│   │   │       ├── auth.service.ts
│   │   │       └── ...
│   │   │
│   │   ├── app.ts
│   │   └── server.ts
│   │
│   ├── .env
│   ├── package.json
│   ├── bun.lock
│   ├── prisma7.config.ts
│   └── tsconfig.json
│
├── frontend/
│   ├── public/
│   │   └── ...
│   │
│   ├── src/
│   │   └── app/
│   │       ├── login/
│   │       │   └── page.tsx
│   │       ├── register/
│   │       │   └── page.tsx
│   │       ├── profile/
│   │       │   └── page.tsx
│   │       ├── globals.css
│   │       ├── layout.tsx
│   │       └── page.tsx
│   │
│   ├── .env.local
│   ├── next.config.ts
│   ├── package.json
│   └── tsconfig.json
│
├── docker-compose.yml
├── .gitignore
└── README.md
```

> The structure may grow as new modules such as clubs, posts, newsletters, events, and student profiles are added.

---

# Run Locally

## 1. Prerequisites

Install the following before starting:

- [Git](https://git-scm.com/)
- [Bun](https://bun.sh/)
- [Node.js](https://nodejs.org/) if required by frontend tooling
- [Docker](https://www.docker.com/)
- Docker Compose

Check that they are installed:

```bash
git --version
bun --version
node --version
docker --version
docker compose version
```

---

## 2. Clone the Repository

```bash
git clone <repository-url>
cd oued-eddahab
```

Replace `<repository-url>` with the GitHub repository URL.

---

## 3. Start PostgreSQL

From the project root:

```bash
docker compose up -d
```

Check that the database container is running:

```bash
docker compose ps
```

The PostgreSQL database normally runs on:

```text
localhost:5432
```

---

## 4. Configure the Backend

Go to the backend directory:

```bash
cd backend
```

Install dependencies:

```bash
bun install
```

Create the backend environment file if it does not already exist:

```bash
touch .env
```

Example:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/oued_eddahab?schema=public"

PORT=5000

JWT_SECRET="change-this-secret"
```

Make sure the database credentials match the values configured in `docker-compose.yml`.

---

## 5. Generate the Prisma Client

From `backend/`:

```bash
bunx prisma generate
```

---

## 6. Apply Database Migrations

```bash
bunx prisma migrate dev
```

If the migrations already exist and you only want to apply them:

```bash
bunx prisma migrate deploy
```

Optional: inspect the database using Prisma Studio:

```bash
bunx prisma studio
```

---

## 7. Start the Backend

From `backend/`:

```bash
bun run dev
```

The API runs on:

```text
http://localhost:5000
```

Health check:

```text
GET http://localhost:5000/api/health
```

Example response:

```json
{
  "status": "ok",
  "message": "Oued Eddahab API is running"
}
```

---

## 8. Configure the Frontend

Open another terminal and go to the frontend directory:

```bash
cd frontend
```

Install dependencies:

```bash
bun install
cp .env.example .env.local
```

`NEXT_PUBLIC_API_URL` is the backend origin only. Do not include `/api`:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000
```

Frontend API calls add the `/api/...` path through the shared API URL helper.

---

## Current Institution and Resource Security Model

Institution selection is currently **self-declared during registration**. The
application does not yet verify enrollment, an institutional email domain, or
institution membership. Institution-scoped Study Resources are therefore an
MVP personalization/filtering feature, not a security or privacy boundary.

Resource API requests never accept an institution scope from the client. Each
request resolves the authenticated JWT user in the database and uses that
user's current `institutionId`. Uploads also derive `uploaderId` and
`institutionId` server-side, and a selected course must belong to the same
institution.

Uploaded PDFs are stored in `backend/uploads/resources`, resolved relative to
the backend module rather than the process launch directory. Because these are
filesystem-backed records, database relations from `StudyResource` to its
uploader and institution use restrictive deletes. Parent records cannot be
deleted until their resources have been removed through application cleanup;
course deletion keeps resources and clears their optional course relation.

Create `.env.local` if needed:

```bash
touch .env.local
```

Example:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000
```

---

## 9. Start the Frontend

From `frontend/`:

```bash
npm run dev
```

Open the URL shown by Next.js in your terminal.

Usually:

```text
http://localhost:3000
```

If port `3000` is already in use, Next.js may automatically use another port such as:

```text
http://localhost:3001
```

---

# Local Development

For normal development, keep three things running:

### Terminal 1 — Database

```bash
docker compose up
```

### Terminal 2 — Backend

```bash
cd backend
bun run dev
```

### Terminal 3 — Frontend

```bash
cd frontend
npm run dev
```

---

# Useful Backend Commands

Run these commands inside `backend/`.

### Type check

```bash
bunx tsc --noEmit
```

### Generate Prisma client

```bash
bunx prisma generate
```

### Create a migration

```bash
bunx prisma migrate dev --name <migration-name>
```

### Open Prisma Studio

```bash
bunx prisma studio
```

### Install dependencies

```bash
bun install
```

---

# Useful Frontend Commands

Run these commands inside `frontend/`.

### Development server

```bash
npm run dev
```

### Production build

```bash
npm run build
```

### Start production build

```bash
npm start
```

### Lint

```bash
npm run lint
```

---

# Current Main Routes

## Frontend

```text
/               Home
/login          Login
/register       Register
/profile        User profile
```

## Backend

```text
GET  /api/health
POST /api/auth/register
POST /api/auth/login
```

Authentication-protected profile endpoints may also be available depending on the current branch.

---

# Troubleshooting

## Prisma client errors

Regenerate the Prisma client:

```bash
cd backend
bunx prisma generate
```

Then restart the backend.

---

## Database connection error

Make sure PostgreSQL is running:

```bash
docker compose ps
```

Restart it if necessary:

```bash
docker compose down
docker compose up -d
```

Also verify `DATABASE_URL` in:

```text
backend/.env
```

---

## Port already in use

Check which process is using a port:

```bash
lsof -i :5000
```

or:

```bash
lsof -i :3000
```

Stop the process or run the application on another port.

---

## Frontend cannot reach backend

Verify that the frontend environment variable points to the backend:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000
```

After changing `.env.local`, restart the frontend development server.

---

# Recommended First-Time Setup

For a completely new local clone, the full setup is:

```bash
git clone <repository-url>
cd oued-eddahab

docker compose up -d

cd backend
bun install
bunx prisma generate
bunx prisma migrate dev
bun run dev
```

Then, in another terminal:

```bash
cd oued-eddahab/frontend
npm install
npm run dev
```

You should then have:

```text
Frontend: http://localhost:3000
Backend:  http://localhost:5000
Database: localhost:5432
```

---

## Contributing

Create a feature branch before making changes:

```bash
git switch -c feat/my-feature
```

Before opening a pull request, run the relevant checks:

```bash
cd backend
bunx tsc --noEmit
```

and:

```bash
cd frontend
npm run lint
npm run build
```
