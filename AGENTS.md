# Oued Eddahab Contributor Instructions

## Scope and purpose

Oued Eddahab is a university community platform for students in Morocco. The current product covers account registration and profiles, institution discovery, institution-scoped PDF study resources, and discussion communities with posts, comments, memberships, and voting. Club and event data models exist, but the clubs UI is still a placeholder.

These instructions apply repository-wide. Also follow the more specific `frontend/AGENTS.md` or `backend/AGENTS.md` when working in those directories.

## Architecture

- `frontend/`: Next.js 16 App Router, React 19, strict TypeScript, and Tailwind CSS 4. It calls the REST API through `src/app/lib/api.ts`.
- `backend/`: Bun-managed TypeScript ESM service using Express 5, Zod 4, Prisma 7 with the PostgreSQL adapter, Argon2, JWTs, and Multer.
- `backend/prisma/`: PostgreSQL schema, ordered SQL migrations, and the Moroccan university/institution seed.
- `backend/uploads/`: ignored runtime storage for protected resource PDFs and derived thumbnails. It is not a public static directory.
- `docker-compose.yml`: local PostgreSQL 17 service. The frontend and backend are separate packages with separate lockfiles.

## Working principles

- Inspect the relevant route, UI, service, schema, tests, and configuration before changing behavior. Do not infer contracts from a single layer.
- Make the smallest coherent change that solves the task. Avoid speculative abstractions, broad formatting passes, dependency churn, or unrelated refactors.
- Preserve existing features, route paths, HTTP status codes, response shapes, auth behavior, database semantics, and stored data unless the task explicitly changes them. Coordinate intentional contract changes across both applications.
- Follow established strict TypeScript, naming, file placement, and import conventions. Prefer explicit types and narrow helpers; do not introduce `any` to bypass a design problem.
- Keep source files authoritative. Treat `.next/`, `backend/dist/`, `backend/src/generated/prisma/`, and `*.tsbuildinfo` as generated output; do not hand-edit them.
- Do not commit secrets or local environment files. Add documented placeholders to example files when a new variable is genuinely required.
- Preserve unrelated work in a dirty worktree. Never discard or overwrite changes outside the requested scope.

## Security and data integrity

- Treat every request, URL parameter, query, form value, upload, and database identifier as untrusted. Validate at the boundary and enforce authorization server-side.
- Never trust client-supplied user or institution ownership. Protected operations derive identity from the verified JWT and institution context from the database.
- Do not expose password hashes, JWT secrets, internal paths, stack traces, or unrestricted upload files. Keep public Prisma selections intentionally narrow.
- Preserve transactional updates and uniqueness constraints used for memberships, votes, comment counts, and resource views. Review deletion behavior and filesystem cleanup before changing related models.
- Institution selection is currently self-declared and is not proof of enrollment. Do not present it as a verified security boundary.

## Verification

Run the smallest relevant checks for the files and behavior changed, then report what ran and any failures. Documentation-only changes do not require a full build.

- Frontend: `bun run lint`, `bunx tsc --noEmit`, and `bun run build` when routing, rendering, or build configuration is affected.
- Backend: `bun test`, `bun run lint`, `bunx tsc --noEmit`, and `bun run build` as relevant.
- Prisma changes: format and validate the schema, generate the client, inspect the SQL migration, and test against a disposable/local database when database behavior changes.

Do not block useful progress on unrelated pre-existing failures. Isolate and report them clearly.
