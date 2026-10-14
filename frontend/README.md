# Oued Eddahab frontend

The frontend is a Next.js 16 App Router application using React 19, strict
TypeScript, and Tailwind CSS 4. It provides the authenticated home, profile,
study-resource, and discussion-community interfaces.

See the repository [README](../README.md) for full local setup, backend
configuration, and architecture notes.

## Environment

Copy the example file:

~~~bash
cp .env.example .env.local
~~~

**NEXT_PUBLIC_API_URL** is the backend origin and must not include **/api**:

~~~env
NEXT_PUBLIC_API_URL=http://localhost:5000
~~~

## Commands

~~~bash
bun install
bun run dev
bun run lint
bunx tsc --noEmit
bun run build
bun run start
~~~

Application routes and route-local components live under **src/app**. API URLs
must be created with **src/app/lib/api.ts**, and authenticated pages should use
the shared hooks in **src/app/hooks/use-auth.ts**.
