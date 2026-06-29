# Backend Extraction → NestJS (port 1500) — Design Spec

**Date:** 2026-06-25
**Status:** Draft for review
**Author:** Aditya + Claude

## 1. Goal & non-goals

**Goal.** Extract the StreamlineOS backend (709 Next.js route handlers across ~46 domains) into a standalone NestJS service running on **port 1500**, built for independent scaling (10M-user target), independent deploys, and clean runtime/team boundaries. Done via a **strangler-fig** rollout: build the shared kernel, migrate one pilot domain (**CRM Leads**) end-to-end, verify, then proceed domain-by-domain. The app stays fully working throughout.

**Explicit non-goal of the extraction itself.** The split does **not** fix the ~7s frontend load. That is a separate, **parallel perf workstream** (Section 9). Moving the same Drizzle queries to NestJS hits the same Neon DB with the same latency plus a network hop, so perf is tracked and planned independently.

**Decisions locked (2026-06-25):**
- Repo layout: **truly separate repo** (`streamlineos-api`), not a monorepo.
- Rollout: **strangler-fig**, kernel + pilot first.
- Performance: **parallel perf pass**, separate plan.
- Pilot domain: **CRM Leads** (~31 routes).

## 2. Current-state findings (verified)

- **API layer is uniform.** Every route flows through shared wrappers in `lib/api/helpers.ts`: `withAuth` / `withAbility(verb, subject)` / `withModuleAbility(module, verb, subject)` + `parseBody(req, zod)` / `parseQuery(req, zod)` + `ok(data, status)` / `err(msg, status)` / `serverErr(...)`. List endpoints use `paginateOffset` + `buildListResponse` (`lib/api/list-response.ts`) returning `{ items, total, page, pageSize, totalPages }`.
- **Auth is pure JWT.** NextAuth v5 (`lib/auth.ts`), `strategy: "jwt"`, **no DB sessions**, signed/encrypted with `NEXTAUTH_SECRET` (8h TTL). JWT claims already carry `id, email, role, orgId, branchId, sessionId, permissions[], plan, enabledModules[], isPlatformAdmin, isOrgOwner, isActive`. Middleware verifies at the edge via `getToken()`.
- **Authorization is CASL.** `lib/abilities.ts` `defineAbilityFor({ isPlatformAdmin, isOrgOwner, permissions, enabledModules })`; permission strings `domain:resource:action`; resolved DB role → `rolePermissions` → custom `roles` → `userPermissions` overrides (`server/queries/rbac.ts`). Platform admin / org owner ⇒ `can("manage","all")`.
- **Data layer.** Drizzle + **postgres.js** (not Neon serverless driver) on Neon (`lib/db.ts`, env-tuned pool). **51 modular schema files** under `lib/db/schema/` with a barrel `index.ts`; 137 migrations in `drizzle/`. Consistent `orgId` multi-tenancy (cascade FK); branch-scoping via `lib/db/branch-filter.ts`.
- **Caching / limits.** Upstash Redis. `lib/cache.ts` (`cached()`, `invalidateCache`, `invalidateCachePattern`, `CACHE_KEYS`, `CACHE_TTL`), `lib/hr-cache.ts`, `lib/rate-limit.ts` (12 tiers + bot detection + IP allowlist).
- **Business logic ~65% extracted** into `lib/services/**` (plain async functions, not classes) and `server/queries|actions/**`. Coupling to Next is light (mostly `import "server-only"`, `@/lib/db`, `@/lib/email`).
- **Integrations** (portability): Storage R2/S3 `lib/storage.ts` (trivial), Email Resend/SendGrid `lib/email*` (high), AI `lib/ai/**` (trivial), Twilio (trivial), Razorpay `lib/razorpay/**` (high), web-push (high), Ably realtime `lib/ably.ts` (medium — token endpoint), Inngest `lib/inngest/**` + 9 cron routes (high), Documenso e-sign (high).
- **Frontend data layer.** `lib/api-client.ts` base URL is **hardcoded to `/api`** (same-origin) with `credentials: "include"`. TanStack hooks in `lib/api/hooks/**`. This single file is the chokepoint for repointing the frontend at port 1500.
- **Load tests already exist:** `scripts/load-tests/*.js` (k6) — reuse for parity/throughput verification.

## 3. Target architecture

Two independently deployable services sharing one Neon Postgres DB during the strangler period.

```
streamlineos (existing Next.js)  ──┐
  - UI, SSR, NextAuth (auth owner) │   Bearer backend-token (HS256, shared secret)
  - lib/api-client.ts → API base   │──────────────────────────────►  streamlineos-api (NestJS, :1500)
  - mints short-lived backend token│                                   - resource server, verifies token
                                   │                                   - CASL RBAC, Zod pipes, Redis cache
        Neon Postgres  ◄───────────┴───────────────────────────────►  - Drizzle + postgres.js (persistent pool)
        Upstash Redis  ◄─────────────────── shared keys ────────────►
```

**NestJS stays a pure resource server.** NextAuth remains the **sole auth authority** in the Next.js app (cookies, OAuth callbacks, sign-in pages, MFA, middleware redirects). We do **not** build a parallel auth path in NestJS.

### 3.1 Repo structure (`streamlineos-api`)

```
src/
  main.ts                       # bootstrap: port 1500, helmet, CORS(allowlist), global pipe/filter/interceptor
  app.module.ts
  config/                       # ConfigModule + zod env validation (DATABASE_URL, NEXTAUTH/ BACKEND_JWT_SECRET, UPSTASH_*, R2_*, ...)
  db/
    schema/                     # Drizzle schema — synced copy of web's lib/db/schema (source of truth: see §6)
    drizzle.module.ts           # @Global() provider for the Drizzle client
    drizzle.provider.ts         # postgres.js pool tuned for a PERSISTENT server (not serverless)
  common/
    auth/
      jwt-auth.guard.ts         # verifies Bearer backend-token (HS256, BACKEND_JWT_SECRET) → req.user
      api-key.guard.ts          # X-API-Key (existing hashed apiKeys table + scopes)
      current-user.decorator.ts # @CurrentUser() → { userId, orgId, role, branchId, permissions[], plan, enabledModules[], flags }
    rbac/
      abilities.factory.ts      # port of lib/abilities.ts defineAbilityFor
      ability.guard.ts          # reads @CheckAbility metadata, enforces CASL
      check-ability.decorator.ts# @CheckAbility('read','crm:leads')
      module.guard.ts           # @RequireModule('crm') plan/enabledModules gate (withModuleAbility equivalent)
    cache/
      redis.module.ts           # Upstash client (@Global)
      cache.service.ts          # port of lib/cache.ts: cached/invalidate/pattern + CACHE_KEYS/TTL (SAME keys as web)
    pipes/zod-validation.pipe.ts# parseBody/parseQuery equivalent; reuses existing zod schemas
    interceptors/
      response.interceptor.ts   # success envelope == ok()
      logging.interceptor.ts    # structured logging (port lib/logger)
    filters/all-exceptions.filter.ts # err()/serverErr() shape + status codes (400/401/403/404/409/422/500/503)
    pagination/                 # paginateOffset, buildListResponse
    audit/audit.service.ts      # port lib/audit-log.ts (fire-and-forget)
    tenancy/branch-filter.ts    # port lib/db/branch-filter.ts
    ratelimit/                  # port lib/rate-limit.ts tiers (guard/interceptor)
  modules/
    leads/                      # PILOT
      leads.module.ts
      leads.controller.ts       # all ~31 lead routes (GET/POST/PATCH/DELETE + subroutes)
      leads.service.ts          # ported from lib/services/lead-* + server/queries/crm leads
      dto/                      # reuse existing zod schemas as DTOs
  integrations/                 # email, storage, ably, razorpay, ai, twilio, web-push, inngest — added as domains require
```

### 3.2 Wrapper → NestJS mapping

| Next.js (`lib/api/helpers.ts`) | NestJS |
|---|---|
| `withAuth(handler)` | `@UseGuards(JwtAuthGuard)` + `@CurrentUser()` |
| `withAbility(verb, subject)` | `@UseGuards(JwtAuthGuard, AbilityGuard)` + `@CheckAbility(verb, subject)` |
| `withModuleAbility(module, verb, subject)` | `+ @UseGuards(ModuleGuard)` + `@RequireModule(module)` |
| `parseBody(req, zod)` / `parseQuery` | `@Body(ZodValidationPipe)` / `@Query(ZodValidationPipe)` |
| `ok(data, status)` | `return data` → `ResponseInterceptor` (+ `@HttpCode`) |
| `err` / `serverErr` | `throw new HttpException` → `AllExceptionsFilter` |
| `paginateOffset` + `buildListResponse` | shared `pagination/` util |
| `cached()` / `invalidateCache*` | `CacheService` (same Redis keys) |
| `createAuditLog()` | `AuditService` |
| API-key ingest (`X-API-Key`) | `ApiKeyGuard` |

## 4. Auth bridge (cross-origin)

The NextAuth session cookie is **httpOnly and JWE-encrypted**, so neither browser JS nor NestJS should depend on its internal format. Instead:

1. **Next.js mints a short-lived backend access token.** New route `GET /api/auth/backend-token` calls `auth()`, and if a session exists, signs a compact **HS256 JWT** with `BACKEND_JWT_SECRET` (a new shared secret) containing `{ userId, orgId, branchId, role, permissions[], plan, enabledModules[], isPlatformAdmin, isOrgOwner, sessionId }`, TTL ~10 min. Rate-limited.
2. **Frontend attaches it.** `lib/api-client.ts` gains a configurable base URL (`NEXT_PUBLIC_API_URL`, default `/api` for not-yet-migrated routes) and an in-memory token cache; it fetches/refreshes the backend token and sends `Authorization: Bearer <token>`; on a 401 it refreshes once and retries.
3. **NestJS verifies.** `JwtAuthGuard` verifies the HS256 token with `BACKEND_JWT_SECRET`, populates `req.user`. Optional revocation check against Redis `revoked:session:{sessionId}` (same key the web app uses) — claims are otherwise trusted (fast, no DB hit).
4. **CORS** locked to the web origin(s); credentials not required (Bearer, not cookie).

**Why not proxy through Next.js?** A Next.js rewrite/BFF keeps Next in the hot path and undercuts the point of separating for scale. Direct frontend→API with a minted token is the 10M-user-correct design, and `lib/api-client.ts` is a single contained change. (Fallback if zero frontend churn is ever required: Next.js `rewrites` proxy `/api/*` → :1500, forwarding the minted token — kept as a documented escape hatch, not the default.)

## 5. Strangler rollout & per-domain cutover

Per migrated domain:
1. **Port** the routes into a NestJS module (controller thin, logic in service ported from `lib/services` + `server/queries|actions`).
2. **Verify parity**: response shape, status codes, auth (401), RBAC (403), pagination, caching, side effects (Inngest events, audit, emails). Run the relevant k6 load test against both old and new.
3. **Cutover**: repoint the domain's TanStack hooks to the API base URL; **delete** the corresponding `app/api/<domain>/**` route files and any now-dead `lib/services` / `server/queries|actions` (verify nothing else imports them).
4. Update a `MIGRATION.md` checklist (domain done, routes count, notes) — mirrors the repo's existing page-by-page `PAGES.md` discipline.

Cron + Inngest functions and realtime/webhook endpoints migrate **with their owning domain**; idempotency keys already exist (`cronIdempotencyCheck`), so no double-processing during overlap.

## 6. Shared DB & schema-drift control (the cost of "separate repo")

- **One Neon DB**, shared during the strangler period. Both services use postgres.js; the API uses a **persistent-server pool** (higher `max`, long `idle_timeout`) rather than the serverless settings — a real scaling win from leaving Vercel functions.
- **Migration ownership stays in the web repo** during the strangler period (it holds all 137 migrations + drizzle-kit). The API repo carries a **synced copy** of `lib/db/schema/**` used only for query building and runs **no** migrations against shared tables.
- **Drift control:** a `pnpm sync:schema` script copies `lib/db/schema/**` from web → api, plus a **CI check** that fails if the two trees differ. After a domain fully cuts over and the web app no longer touches its tables, migration ownership for new changes in that domain may move to the API repo.
- Both services share **the same Redis cache keys** (`CACHE_KEYS`) so reads/invalidations stay coherent across the overlap.

## 7. Pilot: CRM Leads (~31 routes)

Chosen because it exercises the entire kernel without realtime/file complexity: full CRUD + list/board/dashboard/analytics/export/duplicates/distribution, RBAC (`crm:leads:*`), pagination, Redis caching (`leads:list/count/detail`), soft-delete/merge, API-key ingest (`/api/leads/ingest`, `X-API-Key`), and Inngest events (`crm/lead.created`, lead-temperature).

Pilot acceptance = byte-compatible responses, identical status codes, identical RBAC outcomes, cache parity, ingest + Inngest side effects fire, and k6 `recruitment-hub`/custom leads script passes against :1500 at target throughput.

## 8. Scale & security (10M users)

- Stateless controllers; no in-process mutable state → horizontally scalable behind a load balancer.
- Persistent connection pool sized per instance; Redis for read-heavy caching; existing indexes + add where EXPLAIN shows need.
- Helmet headers, CORS allowlist, rate-limit tiers ported, Zod validation on every body/param, parameterized Drizzle queries only, secrets via env, audit logging on sensitive actions.
- Health/readiness endpoints; graceful shutdown (drain pool); structured logging; global exception filter (no leaked internals).

## 9. Parallel perf workstream (separate plan)

Tracked alongside, **not** in the extraction's critical path. Candidate fixes (own spec/plan later):
- **Dashboard SSR waterfall** (`app/(dashboard)/dashboard/page.tsx`): stream with Suspense so the shell paints first; cache role/headcount widgets; add covering indexes for the 4 prefetch queries.
- **Middleware** (`middleware.ts`): stop the per-request Redis IP-allowlist call unless the org actually has an allowlist (flag/short in-memory TTL).
- **Sidebar** (`components/layout/app-sidebar.tsx`): collapse the 4 on-mount queries into one `/dashboard/bootstrap` call; raise `staleTime`.
- **Bundle**: dynamic-import `framer-motion` usages (20+ pages) and confirm `recharts`/`tiptap`/`xlsx` are lazy.
- **DB locality**: confirm Neon region is near users; warm pool.

## 10. Milestones

- **M0 — Scaffold:** `streamlineos-api` NestJS app, config + zod env validation, Drizzle module (shared DB), health endpoint, runs on :1500.
- **M1 — Shared kernel:** JwtAuthGuard, AbilityGuard + ModuleGuard, ZodValidationPipe, ResponseInterceptor, AllExceptionsFilter, CacheService, pagination, AuditService, branch-filter tenancy, rate-limit, ApiKeyGuard, logging.
- **M2 — Auth bridge:** Next.js `/api/auth/backend-token` mint endpoint + `lib/api-client.ts` base-URL/token wiring + NestJS CORS.
- **M3 — Leads pilot:** controllers for all ~31 routes, `leads.service` ported, DTO/zod reuse, caching + RBAC + pagination + ingest + Inngest; parity + load-test verified.
- **M4 — Leads cutover:** repoint web leads hooks, delete old `app/api/leads/**` + dead services/queries, verify build/lint/tests.
- **Backlog:** remaining ~45 domains, each = port → verify → cutover → delete, tracked in `MIGRATION.md`.

## 11. Risks

| Risk | Mitigation |
|---|---|
| Schema drift (separate repos) | `sync:schema` script + CI diff check; single migration owner during strangler |
| Auth coupling to Auth.js cookie internals | Mint our own HS256 backend token; NestJS never parses the NextAuth cookie |
| Cache incoherence during overlap | Shared Redis keys + same invalidation patterns |
| Cron/Inngest double-processing | Migrate per domain; existing idempotency keys |
| CORS / security regressions | Origin allowlist, helmet, ported rate-limit, Zod everywhere |
| Expecting perf win from the split | Perf is an explicit parallel workstream (§9) |

## 12. Defaults chosen (override any before/at plan review)

1. **Hosting/runtime:** **Docker container** (portable to Fly/Railway/Render/ECS/a VM) running a persistent Node process — not Vercel functions. This is what unlocks the persistent connection pool and the scaling win. Pool sized per instance, horizontally scaled behind a load balancer.
2. **Signing secret:** introduce a dedicated **`BACKEND_JWT_SECRET`** (independent rotation, clean separation from Auth.js). The Next.js mint endpoint and the NestJS guard share it.
3. **Redis:** the API **shares the existing Upstash Redis** (same `CACHE_KEYS`) during the overlap for cache/invalidation coherence.

These are defaults, not commitments — say the word to change any.
