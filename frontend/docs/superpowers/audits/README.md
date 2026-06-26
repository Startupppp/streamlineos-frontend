# StreamlineOS Audit Index

Date: 2026-06-25 · Scope: backend route handlers, frontend data layer, dead code & duplication.
Three read-only audits, summarized here for the NestJS backend extraction. None of these audits
modified code.

- [`backend-api-audit.md`](./backend-api-audit.md) — `app/api/**/route.ts` (~710 files, 46 domains)
- [`frontend-fetch-audit.md`](./frontend-fetch-audit.md) — direct-fetch stragglers in `app/`, `components/`, `features/`
- [`deadcode-duplication-audit.md`](./deadcode-duplication-audit.md) — knip / ts-prune / jscpd map

---

## Executive summary

The backend's shared infrastructure is genuinely strong — auth/tenancy wrappers (`withAuth`,
`withAbility`, `withModule`) cover 661/710 routes, response helpers (`ok`/`err`/`serverErr`) define a
clean contract, pagination/caching/rate-limiting primitives exist and are used well in the
better-maintained domains (accounting, hr, crm, projects) — and the NestJS port should reproduce these
*contracts* faithfully so the existing Next.js client keeps working through cutover. The recurring
weaknesses are structural and consistent: manual `Number()` query coercion instead of Zod (~87 files),
list endpoints with no pagination (~94 files), ~45 hardcoded role-string checks that bypass the dynamic
CASL RBAC, one non-constant-time cron secret compare, an unfiltered cross-tenant read, and domain logic
embedded in fat route handlers — all of which the port can eliminate *by construction* rather than
patch in place. The frontend data layer is highly centralized (everything flows through
`lib/api-client.ts` + TanStack hooks) with only one true authenticated straggler. Dead-code findings
are real but noisy and over-report; cleanup must be incremental and test-gated, never a sweep.

---

## Fix during the NestJS migration (prioritized — ports must avoid these)

Ordered highest value first. Each maps a legacy violation to the architectural construct that prevents
it from recurring.

1. **Mandatory coercing Zod validation on query/params (HIGH).** ~87 routes read `searchParams`
   directly with `Number()`/`toNumber()`/`.get()` — `?page=abc` becomes `NaN` and flows into
   `OFFSET`/`LIMIT`; `?month=99` is accepted. Port: global `ZodValidationPipe` over `@Query()` DTOs with
   bounded coercing schemas (`z.coerce.number().int().min(1)`, `pageSize.max(100)`), reject out-of-range
   with 422. (Body validation is already healthy — 1 weak route.)
2. **Pagination by construction on every list endpoint (HIGH).** ~94 routes call `findMany(...)` with no
   limit; several are org-wide and grow with tenant size (`hr/directory`, `hr/compliance`,
   `cron/scheduled-reports`). Port: a shared `PaginationQueryDto`; every list returns `ListResponse<T>`
   with a bounded `LIMIT` + parallel `COUNT`. Lint/review forbids bare `findMany()` on org-wide tables.
3. **CASL-only authorization — kill hardcoded role strings (HIGH).** ~45 routes gate on literals like
   `role === "CEO"` / `["HR","CEO"].includes(role)`, bypassing the dynamic org-customizable RBAC and
   silently mis-granting custom roles. Port: a `PoliciesGuard` with `(verb, subject)` decorators driven
   by a `CaslAbilityFactory`; no controller or service compares role strings.
4. **Single constant-time cron-auth guard (HIGH, security).** `cron/scheduled-reports/route.ts:11-14`
   does a non-constant-time `authHeader !== \`Bearer ${CRON_SECRET}\`` compare and skips both the
   hardened `verifyCronSecret` (`timingSafeEqual`) and the Redis idempotency lock the other 8 cron
   routes use. Port: one `CronAuthGuard` (constant-time compare + idempotency) on every scheduled-job
   controller — no per-route header comparisons.
5. **Tenant-safe repository base — no unfiltered cross-org reads (MEDIUM).** `hr/directory/route.ts`
   queries `departmentMembers.findMany()` with no WHERE (the table has no `orgId`), scanning every org's
   memberships and filtering in memory. Port: join `department_members → departments` filtering
   `departments.orgId`, plus a tenancy interceptor/repository base that refuses unfiltered cross-org reads.
6. **Transactional services + post-commit side-effects (MEDIUM).** Only 31/710 routes use
   `db.transaction`; multi-step writes like `chat/channels` (channel then members) can orphan on partial
   failure. Port: wrap multi-step writes in a service-layer transaction; fire emails/automation events
   *after* commit.
7. **Thin controllers, logic in providers (MEDIUM).** 21 route files exceed 200 lines with embedded
   domain logic (`hr/leaves` 252, `projects/[projectId]` 287, `settings/email-templates/test` 409). Port:
   controllers validate → call service → shape response; all logic moves to injectable providers
   (`server/queries/**` and `lib/services/**` map ~1:1 — start the port there). This is the biggest
   structural win.
8. **Standardize success shapes / batch jobs (LOW).** ~181 routes return ad-hoc envelopes
   (`{success:true}`, `{message}`); pick one convention via a response interceptor. Move bulk/sequence
   loops (`cron/email-sequences`, imports) to a real job queue (BullMQ) with set-based writes; collapse
   loop-deletes into `IN (...)`. No severe request-path N+1 was found.

**Preserve as-is (contracts, not implementations):** org-scoped Redis + `revalidateTag` caching with the
`cache-tags.ts` taxonomy; tiered rate limiting (`resolveTier` → `checkRateLimit`); webhook HMAC
verification; identical 400/401/403/404/422/429 semantics.

---

## Frontend direct-fetch stragglers

**One** true authenticated straggler: `app/(dashboard)/hr/recruitment/candidates/import/page.tsx:160`
POSTs raw `fetch` to `/api/hr/recruitment/candidates/bulk-import` instead of a TanStack mutation.

Three further hits are **public** (unauthenticated, token-based) pages that intentionally must NOT carry
the authenticated bearer token `apiClient` injects, so raw fetch there is defensible — but they use
`useState`/`useEffect` fetching, violating the "no useEffect data fetching" rule:
`(public)/offer/[token]`, `(public)/application-status/[token]`,
`(public)/careers/[orgSlug]/jobs/[jobId]/apply`.

Everything else is acceptable: `apiClient` itself, the analytics `sendBeacon`, the blob/ZIP
`fetch(doc.fileUrl)` against storage URLs, server-side route handlers calling third parties, and the many
`refetch()` retry-button hits (not network primitives).

**Recommendation:** migrate the one dashboard straggler to a `lib/api/hooks/hr` mutation (gets cache
invalidation + uniform error handling). For the three public pages, add a thin un-authed public TanStack
hook variant (an `apiClient` mode that skips the bearer token), which also clears the useEffect-fetch
violation. Leave all acceptable cases untouched.

---

## Dead-code cleanup approach

**Small, test-gated commits — NOT a single sweep.** The dead-code lists over-report (no `knip.json`
config means knip can't distinguish intentional public API from orphans), and several findings are
likely false positives that would break the build if deleted blindly.

Tooling availability: knip, ts-prune, and jscpd all ran successfully via `pnpm dlx` (no permanent
install needed). knip's file-level resolution is the most reliable signal; ts-prune corroborates;
jscpd reports duplication at a very low 0.57% of lines. knip hit a non-fatal `.github/workflows/main.yml`
YAML parse error (known issue) — worth a one-line fix for clean CI tooling.

Recommended ordering, smallest-risk first, one batch per commit, `pnpm build && pnpm lint` (+ tests)
green before the next, and re-run knip/jscpd after each batch to confirm the count drops:

1. **Batch A** — 12 grep-verified orphan components (knip §1a). Delete, build to catch dynamic-import breakage.
2. **Batch B** — 3 stale schema/barrel `index.ts` duplicates (§1b), isolated: this is where a hidden
   `/index` import would surface. The live barrels are the sibling files one level up
   (`crm.ts`/`hr.ts`/`permissions.ts`), not these directory index files.
3. **Batch C** — duplication extractions (§3): add/edit candidate sheets (biggest clone, 117 lines),
   AI risk buttons, upload/edit document dialogs, aged-payables/receivables routes. Migrate both call
   sites, verify, then remove dupes.
4. **Batch D** — per-helper trims of `lib/date-utils.ts` and `lib/theme-constants.ts`, each grep-verified.
5. **Defer** — the `lib/api/hooks/**` unused-hook backlog (~510 exports / 274 types) is mostly
   built-but-not-yet-wired feature surface; reconcile per feature as pages are wired, not as a bulk delete.
6. **Do NOT delete** without per-item confirmation: `scripts/**` (CLI/ops/load-test entrypoints, outside
   the import graph), `public/sw.js` (runtime-registered service worker), the `playwright` devDependency
   (backs the E2E setup), and shadcn/ui re-exports (intentional design-system surface).

Add a tuned `knip.json` declaring entry points to cut false-positive noise in future passes.
