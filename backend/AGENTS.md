# Backend Instructions

## Architecture and conventions

The backend is a strict TypeScript ESM application run with Bun in development and compiled for Node. It uses Express 5, Zod 4, Prisma 7 with `@prisma/adapter-pg`, and PostgreSQL 17. NodeNext imports include `.js` suffixes even when the source file is `.ts`.

- `src/app.ts` configures middleware, the health endpoint, and `/api` routers; `src/server.ts` only loads environment configuration and listens.
- Feature modules normally separate `*.routes.ts`, `*.controller.ts`, `*.service.ts`, and `*.schema.ts`. Pure invariants may live in a testable `*.domain.ts`; filesystem concerns remain in focused helpers such as `resources.files.ts`.
- Routes compose rate limiting and `requireAuth` or `optionalAuth`. Controllers parse transport input and shape HTTP responses. Services own business rules and Prisma access.
- Use the shared Prisma client in `src/lib/prisma.ts`. Import generated Prisma types from `src/generated/prisma/client.js`; never edit generated client files.

## API behavior

- Validate request bodies, parameters, and query strings with Zod before using them. Trim text, impose realistic bounds, coerce query values only deliberately, and prefer strict object schemas for writes.
- Keep response bodies, status codes, pagination semantics, and endpoint paths backward compatible. Additive changes are preferred; coordinate unavoidable contract changes with the frontend.
- Return `400` for invalid input, `401` for missing/invalid authentication, `403` for known but unauthorized actions, `404` for inaccessible or missing records where appropriate, and `409` for conflicts. Follow the module's existing typed service-error pattern.
- Log unexpected errors server-side and return stable, non-sensitive messages. Do not expose Prisma errors, filesystem paths, token details, or stack traces.
- Bound list sizes and expensive work. Apply the existing API limiter to protected feature routers and the stricter auth limiter to login/registration endpoints.

## Authentication and authorization

- Verify JWTs through the shared auth middleware. Protected controllers must still narrow `req.userId` before use; optional authentication must never grant protected behavior.
- Derive the acting user, uploader, owner, and institution scope from the verified user and database records, never from client-supplied ownership fields.
- Enforce ownership before edits/deletes and apply institution scoping consistently to resource metadata, PDFs, thumbnails, views, courses, and uploads. A not-found response can avoid leaking cross-institution records.
- Hash passwords with Argon2, normalize emails consistently, keep `JWT_SECRET` and `DATABASE_URL` in the environment, and never select password hashes into API responses.
- Remember that institution membership is self-declared at registration; it supports filtering/scoping but is not verified enrollment.

## Prisma and data integrity

- Change `prisma/schema.prisma` and add a new, ordered migration for persistent model changes. Do not rewrite migrations that may have been applied, and do not use `db push` as a substitute for a reviewed shared migration.
- Make migrations safe for existing rows: plan defaults, nullable transitions, constraints, backfills, and indexes explicitly. Preserve user data unless destructive behavior is an explicit requirement.
- Review relation `onDelete` behavior whenever ownership changes. `StudyResource` uses restrictive uploader/institution deletes because its PDFs require application-level cleanup; its optional course relation uses `SetNull`.
- Use database constraints as the final concurrency boundary and transactions for multi-write invariants. Preserve unique membership/vote/view records and cached member, vote, comment, and download counts.
- Select only fields required by the API and index relation keys and common filter/order columns. Avoid unbounded queries and N+1 access patterns.

## File resources

- Keep uploaded PDFs outside public static serving and authorize every metadata/file/thumbnail request through the same institution context.
- Preserve layered upload defenses: one file, 20 MB limit, expected MIME type, server-generated UUID filename, canonical path checks, and PDF structure validation. MIME type or extension alone is insufficient.
- Use argument-based process execution (`execFile`), never a shell command built from input. Keep thumbnail generation bounded and treat thumbnails as recoverable derived data.
- Maintain cleanup ordering so a failed deletion does not silently orphan a database record or its source PDF. Test path traversal, malformed files, and cleanup behavior when touching file handling.

## Testing and verification

- Add or update Bun tests under `test/` for changed domain invariants, authorization, validation, transactions/counters, and file behavior. Favor pure domain tests where database access is not necessary.
- From `backend/`, run the relevant subset of:
  - `bun test`
  - `bun run lint`
  - `bunx tsc --noEmit`
  - `bun run build`
- For Prisma work, also run `bunx prisma format`, `bunx prisma validate`, and `bunx prisma generate`; inspect generated SQL and exercise the migration against a disposable/local database when possible.

Run focused checks while iterating, broaden them in proportion to risk, and report any skipped or pre-existing failures rather than hiding them.
