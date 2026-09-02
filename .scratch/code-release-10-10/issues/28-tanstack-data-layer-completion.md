# 28 — Complete the TanStack Query data-layer contract

**What to build:** The remaining §8 criteria: key factories carrying every correctness dimension, access-gated queries, complete invalidation, safe optimistic state, correct cursor behaviour and runtime parsing that cannot silently accept a contract change.

**Blocked by:** None — can start immediately.

**Status:** mostly-done — one criterion blocked, two partially closed (see notes)

- [x] One hierarchical key factory per domain, carrying organization, subject, scope, filters, sort and cursor dimensions as applicable.
      Evidence: 16 domain modules behind the single `queryKeys` facade; org/user live in the hash (`scopedQueryKeyHashFn`). Folded the last two out-of-registry key objects in (`hooks/api/hr/engagement.ts` 11 keys, `hooks/api/hr/succession.ts` 1 key) into new `lib/query-keys/hr-engagement.ts`; added the missing page-size dimension to `kb.researchBriefs` and `timesheets.payroll.exports`. `pnpm -s check:query-signal` exit 0; `lib/query-keys/key-factory-contract.test.ts` indexes 1119 registry entries (933 callable factories) and passes 8/8.

- [~] Queries are gated by effective access and required identifiers; a disabled query sends no unauthorized or malformed request.
      Evidence: `pnpm -s check:command-catalog` exit 0 — 1504 mutation hooks classified, 0 unclassified; 66/70 gated reads carry a backend-enforced key. Made `projectId` a required key dimension for QA/bugs/incidents and gated the 7 call sites (`?? 0` behind the existing `enabled`); added the missing `useCan("hr:succession:view") && useModuleEnabled("hr")` gate to `useSuccessionPlans`.
      NOT CLOSED: an AST scan of `hooks/api/**` finds **125 of 929** `useQuery`/`useInfiniteQuery` calls with no `enabled` gate at all (e.g. `hooks/api/accounting.ts:74,280,340,429`, `hooks/api/blog.ts:22`, `hooks/api/git-integration.ts:52`). Each needs its exact backend `@RequirePermission` key; `check:command-catalog` does not cover them because it only classifies `useGatedQuery` reads.

- [x] Every mutation invalidates or updates each affected list, detail, count and dashboard key, and rolls optimistic state back safely on failure.
      Evidence: **291 invalidation call sites across 82 key factories were matching nothing** (see the last box). Fixed at the factory. Separately, 20 mutation hooks spread `...options` *after* their own `onSuccess`, so a caller-supplied handler would silently delete the invalidation — spread moved ahead of the callbacks in 6 files; the AST scan now reports 0 unguarded. Rollback: all 26 `onMutate` hooks audited — every one that patches the cache has a matching `onError` restore.

- [x] Optimistic updates are used only where concurrency semantics are defined; otherwise the backend result is awaited and invalidation is deterministic.
      Evidence: 26 `onMutate` hooks in `hooks/api/**`; the three without `onError` (`organization.ts`, `crm/deals.ts:357`, `build/ticket-related-links.ts`) patch no cache — they only set a flag or `cancelQueries`. No unrolled-back optimistic write remains.

- [x] Cursor pagination neither duplicates nor skips records, and changing filter or sort resets pagination. Test with disagreeing ids — an id-only cursor against a compound sort silently duplicates and skips.
      Evidence: AST audit of all 33 `useInfiniteQuery` call sites. One derives its own cursor (`notifications-inbox.ts`) and took `page[page.length-1].id`, which is only correct if rows arrive in sort order — replaced with the page minimum, matching the backend's `orderBy(desc(id))` + `lt(id, cursor)`. New `hooks/api/cursor-pagination-contract.test.tsx` (6 tests) exercises disagreeing ids `[90,12,41]`, a falsy `id: 0` cursor round trip, and a filter change; reverting the hook fix turns 2 of the 6 red.

- [ ] Loading, background-refresh, empty, partial-error, full-error, offline, permission-denied and revoked-access states are each covered.
      BLOCKED: this is a per-page criterion in `app/**` and `features/**`, which ticket 25 owns and is actively restructuring. The data-layer half exists (`hooks/common/use-online-status.ts`, `NoPermissionState` used by 35 surfaces, `useAccess` revocation) but per-screen coverage cannot be audited from `hooks/`/`lib/` alone.

- [ ] Runtime parsing rejects a backend contract change rather than silently accepting it; client types mirror the backend schema exactly.
      BLOCKED: **there is no runtime response validation anywhere.** `lib/api-envelope.ts::parseApiResponse<T>` casts the JSON body to `T` unchecked, and only 2 of 454 files under `hooks/api/` import Zod. `pnpm -s check:contract-drift` exit 0, but it is a *static* TS-interface-vs-openapi check scoped to `hooks/api/timesheets*` only (49 calls, 25 bodies unresolved). Closing this needs a schema per response type across ~450 hook files or a generated contract layer — a project, not a session.

- [x] A key factory is never called with no arguments — a trailing undefined matches nothing and silently kills the invalidation it was written for.
      Evidence: AST scan found **291 under-supplied call sites over 82 factories** producing keys such as `["streamlineos","inventory","stockLevels",undefined]` while every reader keys on `stockLevels(filters)` — 25 mutation sites alone could never refresh a stock list. Verified against `partialMatchKey` in `@tanstack/query-core@5.90.12`. Fixed by making the optional tail conditional in **211 factories** across 14 files plus 12 hand-fixed sentinel/interior cases; re-scan reports 0. Guarded permanently by `lib/query-keys/key-factory-contract.test.ts`, which fails on any factory or call site that reintroduces the shape. `hooks/api/mail.test.ts` previously *asserted the broken behaviour* ("finds ZERO — proves the trailing-undefined trap") and is rewritten as a positive regression test.

## Verification run for this ticket

- `nice -n 10 node --max-old-space-size=8192 ./node_modules/typescript/bin/tsc --noEmit` → 22 errors, all in the stale generated `.next/types/validator.ts`; **0 in source**.
- `nice -n 10 npx jest hooks/api lib/query-keys lib/query-keys-registry.test.ts lib/query-scope-isolation.test.tsx lib/prefetch lib/hr-workforce-cache.test.ts lib/optimistic-cache.test.ts --maxWorkers=2` → **58 suites, 547 tests, all pass**.
- `pnpm -s check:query-signal` exit 0 · `pnpm -s check:command-catalog` exit 0 · `pnpm -s check:effect-fetches` exit 0 · `pnpm -s check:over-300` exit 0.
- `pnpm -s check:query-scope` exit 1 — **all 16 violations are inside `.next-buildmart/`**, a stale build directory; 0 in real source. `scripts/check-query-scope.mjs` excludes `.next` but not `.next-buildmart`. Not fixed here: `scripts/` is outside this session's territory.
