# PRD — The web app can read the API on the server

Status: **ready**
Date: 2026-08-23
Stream: V
Source: architecture review 2026-08-23, candidate 8

## Problem

`frontend/CLAUDE.md` §1 opens with "Server Components by default". The tree says otherwise: **343 of 590 `page.tsx` files carry `"use client"`**, and `HydrationBoundary` / `dehydrate` appear **zero times across 4,445 files**.

The cause is structural, not cultural. There is exactly one adapter for reading the API from a Server Component — `lib/rbac/get-server-access.ts`, which fetches `/me/access` with the session's `backendJwt`. Nothing generalises it. A page that wants its data on the server has to hand-roll the token read, the base URL, the envelope unwrap, the timeout and the error shape, so no page does. The default is not a decision anyone made; it is the absence of a seam.

What every authenticated page pays: HTML shell → download and hydrate JS → session → `/me/access` → the actual data. Four sequential hops before the first row. `useCan` answers `false` for the whole window, so gated controls render hidden and then appear.

## Solution

One server-side adapter beside `getServerAccess`, and a prefetch helper per query-key factory. A page prefetches on the server and passes a dehydrated cache; the existing Query hooks hydrate instead of fetching. No hook changes.

## Goals

- Reading the API from a Server Component is one call, with the same error contract as the client.
- A list page can serve its first rows in the first HTML response.
- Adopting it on a page is additive — the hook, the query key and the component are unchanged.
- The client stops re-fetching what the server already sent.

## Non-Goals

- Converting 343 pages. This stream builds the seam and proves it on one route.
- Business Server Actions or business Route Handlers. Root §5 stands: the only `route.ts` is NextAuth / auth-bridge.
- Replacing TanStack Query. It stays the client owner of server state.
- Changing `staleTime` tiers or the query-key factory shape.

## Implementation decisions

**One adapter, marked server-only.** `lib/server-fetch.ts`, `import "server-only"`, wrapped in React `cache()` for per-request dedupe — the pattern `getServerAccess` already uses. It reads the session's `backendJwt`, applies the same envelope unwrap and the same `ApiError` shape as `lib/api-client.ts`, so an error surfaces through `getErrorMessage` identically on both sides.

**The error contract is shared, not re-implemented.** Envelope unwrap and `ApiError` construction move to a module both `api-client.ts` and `server-fetch.ts` import. Two parsers that must agree will stop agreeing.

**Prefetch lives with the query key.** Each factory gains a prefetch that pairs the key with its server fetch, so a page cannot prefetch under a key its hook does not read — the failure mode that makes prefetch silently useless.

**`getServerAccess` is refactored onto the adapter, keeping its behaviour.** It already has the right shape and its fail-closed `DENIED` fallback is load-bearing for the layout gate. It keeps that fallback.

**Adoption is one route, chosen for evidence.** A permission-gated, paginated list page — the most common screen — so the result generalises. Prove it with `next build && next start`, never `next dev`, because v16 cache behaviour differs.

**Cache reads stay outside cached functions.** A function marked `use cache` cannot read `cookies()` / `headers()`. The token is read outside and passed in.

## Testing decisions

The web `tsconfig.json` **excludes test files**, so a clean `tsc --noEmit` does not prove the tests compile. Run the suite.

Coverage: the adapter unwraps a success envelope, maps a failure to the same `ApiError` the client produces, and fails closed without a token. A prefetched page renders rows in its server output. The hook does not refetch on mount when the cache was hydrated.

The property worth pinning: **the server and client parsers produce the same `ApiError` for the same response.** Driven as a table over status codes, because that equality is the whole reason to share the module.

The 77-suite web run is the regression net.

## Out of scope

- SEO metadata beyond what the adopted route needs. `generateMetadata` exists on 7 routes; widening it is a separate pass.
- Converting the other 342 client pages.
- The org-switch cache-clear hazard (`base` carries no tenant segment), which is recorded and separate.
