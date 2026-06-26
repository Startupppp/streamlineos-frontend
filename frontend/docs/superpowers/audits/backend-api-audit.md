# StreamlineOS Backend API Audit (App Router route handlers)

Read-only audit of `app/api/**/route.ts` (~710 route files across 46 top-level domains). The
StreamlineOS backend is being **replaced** by a NestJS port, not refactored in place, so every
recommendation below is framed as "what the NestJS port should do" rather than "patch the legacy
route."

Scope: input validation, response shape + status codes, pagination, N+1 risk, caching +
invalidation, rate limiting, and business-logic placement. Sampled broadly; exact-count claims are
ripgrep/heuristic-derived and marked approximate.

---

## The good baseline (preserve these contracts in the NestJS port)

The shared infrastructure is genuinely strong and the port should reproduce its *behavior*, not its
implementation:

- **Auth + tenancy wrappers** — `lib/api/helpers.ts` exposes `withAuth`, `withAbility(verb, subject)`,
  `withModule(module)`, `withModuleAbility(...)`. They resolve session, enforce a Redis session
  revocation check, hydrate org/branch from a `user:session:*` cache, and centrally catch `ZodError`
  → `400 { error: "Validation failed: ..." }`. **661 / 710 routes** use one of these wrappers.
  → NestJS: a global `AuthGuard` + a CASL `PoliciesGuard` (`@CheckAbility('read','hr:employees')`)
  + a `ModuleGuard`, plus a global `ZodValidationPipe` and an exception filter that maps `ZodError`
  to 400 with the same `{ error }` body.

- **Response helpers** — `ok(data, status=200)` returns raw data; `err(msg, status)` returns
  `{ error }`; `serverErr(...)` logs and returns a generic `{ error: "An unexpected error occurred" }`
  with 500 (no internal leakage). This is the canonical contract.
  → NestJS: a response-shaping interceptor returning raw data, and a global `HttpExceptionFilter`
  emitting `{ error: string }`. Keep 401/403/404/422/429 semantics identical so the existing
  Next.js client (`lib/api/hooks/**`) keeps working during cutover.

- **Validation primitives** — `parseBody(req, schema)` / `parseQuery(req, schema)` (Zod). **339**
  routes use `parseBody`; **79** use `parseQuery`.

- **Pagination primitives** — `lib/api/list-response.ts` (`paginateOffset`, `buildListResponse`,
  `ListResponse<T>`). The accounting domain is the model citizen (`accounting/journal`,
  `accounting/customers`): `parseQuery` → `paginateOffset` → `buildListResponse` + a parallel
  `count()`.

- **Caching** — two layers: `lib/cache.ts` (`cached(key, fetcher, {ttlSeconds})` over Upstash Redis,
  with `invalidateCache`/`invalidateCachePattern`) and Next.js `unstable_cache`/`revalidateTag` keyed
  via `lib/api/cache-tags.ts` (`orgScopedTag`, `userScopedTag`, `entityScopedTag`). Mutations call
  `revalidateTag` correctly (e.g. journal POST revalidates journal + trialBalance + P&L + balanceSheet).
  Cache keys are **org-scoped** (and branch/user-scoped for per-user data) — this respects the
  CLAUDE.md rule "never cache user/permission-specific data in shared caches."
  → NestJS: a cache module wrapping Redis with the same tag taxonomy; invalidation as an interceptor
  or explicit service calls. Keep org-scoping in the key.

- **Rate limiting** — centralized in `middleware.ts` via `resolveTier(pathname)` →
  `checkRateLimit(tier, ip)` (`lib/rate-limit.ts`). Tiers exist for login, auth-write,
  account-create, ai, chat, upload, public-intake, landing-submit, api-key-ingest, etc. Prefers
  Upstash sliding-window, falls back to in-memory. Plus suspicious-bot UA blocking on sensitive
  prefixes and progressive backoff on auth tiers. Cron auth (`lib/cron-auth.ts`) uses
  `timingSafeEqual` + a Redis idempotency lock. Razorpay webhook verifies HMAC signature before
  doing anything.
  → NestJS: a `ThrottlerGuard` with named tiers (or a custom guard reusing the Upstash limiter), a
  cron `Guard` doing constant-time secret compare, and webhook signature verification as a guard/pipe.

- **Business-logic extraction (partial)** — `server/queries/**` (45 files) and `lib/services/**`
  hold real logic for the better-maintained domains (hr, crm, projects, accounting, kb-rag,
  git-integration). **162** routes import from `server/queries` / `lib/services` / `server/lib`.
  → NestJS: these map almost 1:1 onto providers/services. Start the port here.

---

## Violations (representative; counts approximate)

### 1. Query/param validation gap — manual coercion instead of Zod (HIGH)

**~87 route files** read `req.nextUrl.searchParams` directly **without** `parseQuery` (90 reference
searchParams total; only 79 use a Zod query schema, and the sets only partly overlap). They coerce
with `Number(...)`, `toNumber(...)`, or raw `.get()`, so malformed input silently degrades:
`?page=abc` → `Number("abc")` = `NaN` → propagates into `OFFSET`/`LIMIT`; `?month=99` is accepted.

Examples:
- `app/api/hr/employees/route.ts:9-23` — `page`/`limit` via `Number()`, no bounds, no schema.
- `app/api/hr/attendance/logs/route.ts:9-26` — `year`/`month` via `Number()` unvalidated.
- `app/api/projects/[projectId]/tickets/route.ts:60-62` — `page`/`limit` via `toNumber`, no max page size.
- `app/api/audit-log/route.ts`, `app/api/chat/search/route.ts`, `app/api/hr/documents/route.ts`,
  `app/api/clients/opportunities/route.ts` (same family).

Body validation is far healthier: of 53 routes calling `req.json()` directly, only **1**
(`app/api/hr/recruitment/candidates/[candidateId]/resume-parse/route.ts`) validates the JSON branch
with hand-rolled `typeof` checks instead of Zod.

→ NestJS: a global `ZodValidationPipe` bound to `@Query()` DTOs with **coercing, bounded** schemas
(`z.coerce.number().int().min(1)`, `pageSize.max(100)`). Make pagination a shared `PaginationQueryDto`
so no list endpoint can ship without it. Reject `NaN`/out-of-range with 422.

### 2. List endpoints without pagination — unbounded reads (HIGH)

**~94 route files** call `db.query.*.findMany(...)` with no `limit`, `paginateOffset`, or page
params. Many are legitimately small (single-entity sub-lists, "my X" scoped by userId), but several
are org-wide and grow linearly with tenant size:

- `app/api/hr/directory/route.ts:11-32` — all active org members, no limit.
- `app/api/hr/leaves/route.ts:66-73` — all of a user's leave requests (per-user, but unbounded over
  time) returned in a combined payload.
- `app/api/hr/compliance/route.ts:27-31` — all policy acknowledgments for the org (admin path).
- `app/api/hr/exit/route.ts`, `app/api/clients/renewals/route.ts`, `app/api/csat/route.ts`,
  `app/api/goals/route.ts`, `app/api/hr/assessments/route.ts`, `app/api/hr/background-verification/route.ts`.
- `app/api/cron/scheduled-reports/route.ts:21` — `db.query.organizations.findMany()` with **no
  limit** (full tenant-table scan; see also #6).

→ NestJS: every list endpoint returns `ListResponse<T>` via a mandatory `PaginationQueryDto`; service
methods take `{page,pageSize}` and always emit a bounded `LIMIT` + parallel `COUNT`. Forbid bare
`findMany()` on org-wide tables in code review/lint.

### 3. Hardcoded role-string checks bypass dynamic RBAC (HIGH)

**~45 route files** gate on literal role names (`session.user.role === "CEO"`,
`["HR","CEO"].includes(role)`, `role !== "HR_MANAGER"`) instead of the CASL ability system the
wrappers already provide. This directly violates the CLAUDE.md rule against hardcoded role names and
diverges from the dynamic, org-customizable RBAC; custom roles get silently denied/over-granted.

Examples:
- `app/api/hr/recruitment/candidates/[candidateId]/resume-parse/route.ts:16` —
  `role !== "CEO" && role !== "HR" && role !== "ADMIN" && role !== "HR_MANAGER"`.
- `app/api/leads/distribute/route.ts:24-25` — `["CEO","HR"].includes(role)`.
- `app/api/branches/route.ts:89`, `app/api/branches/[branchId]/route.ts:92,128`.
- `app/api/dashboard/announcements/route.ts:36,59`, `app/api/dashboard/branch-overview/route.ts:9`,
  `app/api/dashboard/executive/route.ts:8`.
- `app/api/hr/dashboard/{compliance,export,salary-bands}/route.ts`,
  `app/api/hr/employees/[employeeId]/profile-pdf/route.ts:12`,
  `app/api/hr/exit/[resignationId]/{ceo-review,hr-review}/route.ts`,
  `app/api/chat/channels/[channelId]/messages/[messageId]/route.ts:58`.

→ NestJS: every endpoint uses the CASL `PoliciesGuard` with a `(verb, subject)` decorator; no service
or controller compares role strings. Define abilities once in a `CaslAbilityFactory` keyed off the
org's role→permission mapping.

### 4. Cron-secret check not constant-time + missing on one route (HIGH, security)

- `app/api/cron/scheduled-reports/route.ts:11-14` does
  `if (authHeader !== \`Bearer ${process.env.CRON_SECRET}\`)` — a **non-constant-time** string
  compare (timing side-channel) and it bypasses the hardened `verifyCronSecret` (which uses
  `timingSafeEqual`) **and** the `cronIdempotencyCheck` Redis lock that the other 8 cron routes use.
- All other `app/api/cron/*` routes correctly call `verifyCronSecret`.

→ NestJS: a single `CronAuthGuard` doing constant-time secret comparison + idempotency lock, applied
to every scheduled-job controller. No per-route bespoke header comparisons.

### 5. Cross-tenant unbounded read in HR directory (MEDIUM, scaling/tenancy)

`app/api/hr/directory/route.ts:39-43` issues
`db.query.departmentMembers.findMany({ columns: { userId, departmentId } })` with **no WHERE clause**.
The `department_members` table (`lib/db/schema/hr/employees.ts:15-23`) has **no `orgId` column**, so
this fetches *every department membership across all organizations* and filters in memory. Output
leakage is prevented because the subsequent `deptById` map is org-scoped, but it is a full multi-tenant
table scan that degrades as the platform onboards more orgs.

→ NestJS: the query service must join `department_members → departments` and filter
`departments.orgId = :orgId` (the parent table carries org), or add an `orgId` column. Enforce a
tenancy interceptor/repository base that refuses unfiltered cross-org reads.

### 6. Non-atomic multi-step writes outside transactions (MEDIUM)

Several mutations perform 2+ dependent writes without a transaction, risking partial state:
- `app/api/chat/channels/route.ts:87-100` — inserts `chatChannels` then `chatChannelMembers` in two
  separate awaited statements (DIRECT and GROUP branches both); a failure between them orphans a
  channel with no members.
- Only **31 / 710** routes use `db.transaction(...)`. The accounting POSTs and a few HR flows do;
  most CRUD-with-side-effects do not.

→ NestJS: wrap multi-step writes in a transaction (TypeORM/Prisma `$transaction` / Drizzle `transaction`)
in the service layer. Side-effects (emails, automation events) fire *after* commit, not interleaved.

### 7. Business logic living in route handlers (MEDIUM)

**571 / 710** routes import `@/lib/db` or `drizzle-orm` directly; **21** route files exceed 200 lines.
Much is acceptable thin CRUD, but the large handlers embed real domain logic that belongs in services:
- `app/api/hr/leaves/route.ts` (252 lines) — GET seeds leave types, ensures balances, dedupes by
  name, resolves approvers; POST computes day counts, balance checks, overlap detection, insert, then
  fires automation + HR-notification side-effects inline.
- `app/api/projects/[projectId]/route.ts` (287), `app/api/hr/exit/[resignationId]/route.ts` (247),
  `app/api/hr/employees/[employeeId]/route.ts` (235), `app/api/expenses/import/route.ts` (242),
  `app/api/hr/onboarding-docs/route.ts` (264), `app/api/settings/email-templates/test/route.ts` (409).

→ NestJS: controllers stay thin (validate DTO → call service → shape response). All domain logic,
side-effects, and DB access move into injectable providers (`LeavesService`, `ExitService`, ...). This
is the single biggest structural win of the port.

### 8. Inconsistent success-response shapes (LOW)

The canonical success shape is "raw data." But **~181** routes return ad-hoc envelopes like
`{ success: true }` / `{ success: true, sent: n }` / `{ message: ... }` (e.g. `app/api/hr/leaves`
POST `:246`, `app/api/hr/compliance` POST `:56`, most auth routes). Webhooks intentionally return
`{ ok: true }` (external contract — fine). **28** route files emit `NextResponse.json` without the
`ok`/`err` helpers at all, so a few use bespoke status codes/shapes.

→ NestJS: standardize. For commands that have no resource to return, pick one convention (e.g. 204 No
Content, or `{ success: true }`) and apply it via the response interceptor — don't mix per-route.

### 9. N+1 / loop-issued queries (LOW — mostly batch jobs, not request path)

Heuristic scan found **~13** sites with `await db.*`/`await tx.*` inside a `for` loop. On inspection
most are bounded or inherently per-row:
- `app/api/cron/email-sequences/route.ts:40,65,71` — per-enrollment email + status update (must be
  per-row; bounded by `limit: 100`). Acceptable for a cron, but should be a queue/batch in the port.
- `app/api/leads/distribute/route.ts:96` — one UPDATE per *salesperson* (not per lead), so bounded.
- `app/api/hr/change-password/route.ts:70` — deletes old password-history rows one by one in a tx
  (could be a single `inArray` delete).
- `app/api/leads/import/route.ts:85,120,164`, `app/api/hr/recruitment/candidates/bulk-import/route.ts:92`
  — bulk import loops; some already chunk with `onConflictDoNothing`.

No severe request-path N+1 was found in the sampled set; relation loads use Drizzle `with: {...}`
(batched) rather than per-row queries.

→ NestJS: move bulk/sequence work to a real job queue (BullMQ) with batched DB writes; collapse
loop-deletes into set-based `IN (...)` statements.

---

## Summary for the NestJS port

Reproduce the strong contracts (wrappers → guards/pipes/interceptors, org-scoped caching with tag
invalidation, tiered rate limiting, constant-time cron auth, webhook signature verification). The
highest-value corrections to bake into the port's architecture so they can't regress:

1. **Mandatory coercing Zod (DTO) validation on query/params**, not manual `Number()` (#1).
2. **Pagination by construction** on every list endpoint via a shared `PaginationQueryDto` (#2).
3. **CASL-only authorization** — eliminate the ~45 hardcoded role-string checks (#3).
4. **Single cron-auth guard** (constant-time + idempotency) — close the `scheduled-reports` gap (#4).
5. **Tenant-safe repository base** — no unfiltered cross-org `findMany` (#5).
6. **Transactional services** for multi-step writes; post-commit side-effects (#6, #7).
