# Oued Eddahab

Oued Eddahab is a community platform for university students in Morocco. It
combines student profiles, institution-scoped study resources, and discussion
communities in one application.

## Current features

- Account registration and JWT authentication
- Student profiles linked to Moroccan institutions
- Institution and city discovery
- Protected PDF study-resource uploads, previews, viewing, and downloads
- Discussion communities, memberships, posts, comments, and voting
- Club and event data models, with a placeholder clubs interface

Institution selection is currently self-declared. It personalizes and scopes
resource access, but it is not proof of enrollment.

## Architecture

~~~text
.
├── frontend/                Next.js App Router application
├── backend/
│   ├── prisma/              Schema, migrations, and university seed data
│   ├── src/
│   │   ├── middleware/      Authentication and rate limiting
│   │   └── modules/         API feature modules
│   └── test/                Bun tests
├── .github/workflows/       CI and CodeQL
└── docker-compose.yml       Local PostgreSQL
~~~

### Frontend

- Next.js 16 and React 19
- TypeScript
- Tailwind CSS 4
- App Router pages under **frontend/src/app**

### Backend

- Bun and TypeScript
- Express 5
- Prisma 7 with PostgreSQL
- Zod validation
- Argon2 password hashing
- JSON Web Tokens
- Multer for PDF uploads

## Prerequisites

- [Bun](https://bun.sh/)
- [Docker](https://www.docker.com/) with Docker Compose
- [Poppler](https://poppler.freedesktop.org/) for **pdftocairo**, used to
  generate resource thumbnails

Node.js is required for the compiled backend production command.

## Local setup

### 1. Start PostgreSQL

From the repository root:

~~~bash
docker compose up -d
~~~

The local database is exposed at **localhost:5432**.

### 2. Configure and start the backend

~~~bash
cd backend
bun install
~~~

Create **backend/.env**:

~~~env
DATABASE_URL="postgresql://oued:oued_dev@localhost:5432/oued_eddahab?schema=public"
PORT=5000
JWT_SECRET="replace-with-a-long-random-secret"
RESOURCE_STORAGE_DRIVER="local"
~~~

The complete template is in **backend/.env.example**. Local storage is the
default and requires no cloud credentials.

Generate the Prisma client, apply migrations, seed institutions, and start the
development server:

~~~bash
bunx prisma generate
bunx prisma migrate deploy
bunx prisma db seed
bun run dev
~~~

The API is available at **http://localhost:5000**. Check it with:

~~~text
GET http://localhost:5000/api/health
~~~

### 3. Configure and start the frontend

In another terminal:

~~~bash
cd frontend
bun install
cp .env.example .env.local
bun run dev
~~~

**NEXT_PUBLIC_API_URL** must contain the backend origin without an **/api**
suffix:

~~~env
NEXT_PUBLIC_API_URL=http://localhost:5000
~~~

Open **http://localhost:3000**, or the alternate port printed by Next.js.

## Useful commands

Run commands from the relevant package directory.

### Frontend

~~~bash
bun run dev
bun run lint
bunx tsc --noEmit
bun run build
bun run start
~~~

### Backend

~~~bash
bun run dev
bun test
bun run lint
bunx tsc --noEmit
bun run build
bun run start
~~~

### Prisma

~~~bash
bunx prisma format
bunx prisma validate
bunx prisma generate
bunx prisma migrate dev --name <migration-name>
bunx prisma migrate deploy
bunx prisma studio
~~~

Do not use **prisma db push** as a replacement for committed migrations.

## Main routes

### Frontend

| Route | Purpose |
| --- | --- |
| / | Authenticated home |
| /login, /register | Authentication |
| /profile | Student profile |
| /resources | Institution study resources |
| /resources/upload | PDF upload |
| /resources/[id] | Protected PDF reader and download |
| /community | Student discussion feed |
| /community/discover | Community discovery |
| /community/create | Community creation |
| /community/c/[slug] | Community feed |
| /community/post/create | Post creation |
| /community/post/[id] | Post and comments |
| /clubs | Clubs placeholder |

### API groups

- **/api/auth**: registration and login
- **/api/profile**: authenticated profile
- **/api/cities** and **/api/institutions**: institution discovery
- **/api/resources**: courses, resources, protected files, thumbnails, views,
  and downloads
- **/api/communities**: community discovery and membership
- **/api/posts** and **/api/comments**: discussions, voting, and comments

## Resource security and storage

Resource requests never accept an institution scope or uploader identity from
the client. The backend derives both from the authenticated user. Selected
courses must belong to the same institution.

With **RESOURCE_STORAGE_DRIVER=local**, PDFs are stored under
**backend/uploads/resources** and thumbnails under
**backend/uploads/resource-thumbnails**. Both directories are ignored and
served only through authenticated endpoints.

Production can use a private Cloudflare R2 bucket through its S3-compatible
API by setting **RESOURCE_STORAGE_DRIVER=r2** and the backend-only
**R2_ACCOUNT_ID**, **R2_BUCKET_NAME**, **R2_ACCESS_KEY_ID**, and
**R2_SECRET_ACCESS_KEY** variables from **backend/.env.example**. The bucket
must remain private; the frontend continues to use the authenticated resource
API and never receives R2 credentials. Existing local files remain readable as
a compatibility fallback after R2 is enabled. PDF responses support single
HTTP byte ranges for native browser viewers and resumable downloads.

To enable R2, open the Cloudflare Dashboard and select **Storage & databases →
R2 → Overview**, then complete the R2 subscription checkout. Create the private
bucket, then choose **Manage in API Tokens → Create Account API token**. Grant
**Object Read & Write** to that bucket only. Copy the generated Access Key ID
and Secret Access Key directly into **backend/.env**; the secret is displayed
only once. Do not use the Wrangler OAuth token as an S3 credential, expose
these values through the frontend, or enable public bucket access.

Resource relations use restrictive deletes so database records cannot silently
outlive application-managed object cleanup.

Views are unique per authenticated user and PDF. Metadata, thumbnails, and
downloads do not record a view. The frontend records one only after the
authenticated PDF blob loads in the browser viewer, while the database unique
constraint remains the final concurrency safeguard.

## Contributing

Read the root and package-specific **AGENTS.md** files before changing code.
Keep changes focused and preserve existing API and database contracts.

Run checks relevant to the change and report unrelated pre-existing failures
instead of hiding them. Generated output such as **backend/dist**,
**backend/src/generated/prisma**, **frontend/.next**, uploads, and local
environment files must not be committed.
