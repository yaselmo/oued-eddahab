# Frontend Instructions

## Stack and structure

This directory is a Next.js 16 App Router application using React 19, strict TypeScript, and Tailwind CSS 4 through `@import "tailwindcss"`. Routes and route-local components live under `src/app/`; shared navigation, auth hooks, and API URL construction currently live in `components/`, `hooks/`, and `lib/` beneath that directory.

- Keep pages as Server Components by default; add `"use client"` only for browser APIs, hooks, event handlers, or client-side auth/data flows. Most current authenticated pages are necessarily client components.
- Use the `@/*` alias or the existing local relative-import style consistently within the area being edited. Keep feature-specific types and components close to their route, as the community feature does under `_components/`.
- Reuse an existing component when it already expresses the same behavior. Extract a new component or hook when repetition or state complexity justifies it, not merely to make files smaller.
- Use semantic HTML and direct, readable React. Avoid opaque component frameworks, premature design systems, and new dependencies unless explicitly requested.

## API and authentication conventions

- Build backend URLs with `apiUrl()` and pass paths beginning with `/api/`. `NEXT_PUBLIC_API_URL` is the backend origin only, with no `/api` suffix.
- Preserve the current JWT flow: the token is stored through `storeAuthToken`, observed through the auth hooks, and sent as `Authorization: Bearer ...`. On `401`, use the shared redirect behavior.
- Keep frontend request and response types aligned with the backend's actual JSON contracts. Handle non-OK responses deliberately instead of assuming successful JSON.
- Abort fetches started by effects during cleanup and guard against stale token/route data where responses can race. Prevent duplicate submissions and disable controls while mutations are in progress.
- Preserve protected resource behavior: PDF and thumbnail blobs require authorization, downloads are explicit, and a unique view is recorded only after the embedded authenticated PDF reports that it loaded.

## Product and visual direction

- Build distinctive, professional, content-first interfaces for a Moroccan university community. Let useful content, navigation, and actions establish hierarchy; avoid generic dashboard or AI-template styling.
- Use zinc/white neutrals as the foundation and emerald green thoughtfully for brand recognition, primary actions, focus, and selected states. Emerald should guide attention, not tint every surface.
- Prefer clear typography, dividers, lists, feeds, and purposeful layouts over grids of interchangeable cards. Do not wrap every section in a card.
- Avoid excessive rounded corners, pill controls, gradients, shadows, decorative icons, oversized hero copy, and empty whitespace. Use a gradient only when it has a specific visual role; use icons only when they improve recognition or affordance.
- Community platforms may inform familiar patterns such as feeds, voting, comments, memberships, and side navigation, but keep the wording, proportions, visual rhythm, and identity original to Oued Eddahab.
- Extend the existing visual language rather than redesigning adjacent screens incidentally. Keep `SiteNav` and established page shells consistent across authenticated routes.

## Accessibility, responsiveness, and states

- Start with a usable narrow-screen layout and preserve readable line lengths at larger breakpoints. Check overflow for navigation, filters, long names, post text, and form controls.
- Use real buttons, links, labels, headings, lists, and landmarks. Provide keyboard-visible focus, meaningful accessible names, sufficient contrast, and appropriate `aria-current`, `aria-pressed`, status, or alert semantics.
- Do not use color or an icon alone to communicate state. Decorative images/icons should be hidden from assistive technology; content images need useful alternatives.
- Every asynchronous surface needs a proportionate loading state, an actionable error state, and a useful empty state. Preserve surrounding navigation when possible, avoid layout jumps, and never strand the user on an indefinite loader.
- Forms must have visible labels, helpful constraints, disabled/submitting feedback, and server error messages. Client validation improves feedback but never replaces backend validation.

## Verification

From `frontend/`, run the checks relevant to the change:

- `bun run lint`
- `bunx tsc --noEmit`
- `bun run build` for changes affecting routes, rendering boundaries, configuration, or production compilation

Manually exercise changed flows at mobile and desktop widths, including loading, error, empty, keyboard, and authenticated/unauthenticated behavior where applicable. Report skipped checks and pre-existing failures.
