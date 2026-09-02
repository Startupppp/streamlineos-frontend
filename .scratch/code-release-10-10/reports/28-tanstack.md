# S7 · Ticket 28 — TanStack Query data-layer contract

## Headline: 291 invalidations were matching nothing

`queryKeys.<domain>.<list>()` — the no-argument call used at 291 sites to mean "the whole list" —
appended a literal `undefined` to the key, because 82 factories were written
`(params?: T) => [...base, "x", "list", params] as const`. Verified against
`partialMatchKey` in `@tanstack/query-core@5.90.12` (`Object.keys(b).every(...)`, so a filter
key ending in `undefined` matches only a query whose element at that index is *also* `undefined`).
Every reader keys on `list(filters)`, so the filter is an object and the match fails.

Concretely: `queryKeys.inventory.stockLevels()` is invalidated from **25** mutation sites —
adjustments, cycle counts, goods receipts, quality holds, recalls, sales orders, shipments,
transfers, reservations, purchase orders — and `useStockLevels(filters)` reads
`stockLevels(filters)`. Not one of those 25 could ever refresh a stock list.
`timesheets.entries` 11 sites, `timesheets.approvals` 10, `inventory.salesOrders` 9,
`inventory.purchaseOrders` 8, `users.invitations` 6, `hr.headcountRequests` 6.

The trap was already known and *frozen into a passing test*: `hooks/api/mail.test.ts` had
`it("messages() with no args finds ZERO — proves the trailing-undefined trap")`, asserting the
broken behaviour as correct and working around it with a hand-built prefix.

**Fix, at the factory rather than the 291 call sites:** a codemod made the optional tail
conditional in **211 factories** across 14 files, so `f()` is a true prefix of `f(x)` and
`f(x)` is byte-identical to before — zero behaviour change for correct call sites.
12 further cases were fixed by hand (sentinel defaults `?? "all"` / `?? null` that made `f()`
a *sibling* rather than a prefix; interior-optional identifiers). Re-scan: **291 → 0**.

## Guard so it cannot come back

`frontend/lib/query-keys/key-factory-contract.test.ts` (new) parses the registry with the TS
compiler API and asserts, for every factory and every partial call site in the repo, that
omitting the trailing optional argument yields (a) no literal `undefined` and (b) a real
`partialMatchKey` prefix of the full call. It found four classes I had not: the `?? "all"`
sentinels, interior-optional `projectId`s, `hr.importJobs` (3 more dead invalidations), and
the `hr.leaves*` identity params declared optional-with-default.

## Other defects found and fixed

- **20 mutations could have their invalidation deleted by a caller.** `hooks/api/build/{advanced,
  projects,sprints,ticket-related-links,time-entries}.ts` and `hr/attendance.ts` spread
  `...options` *after* their own `onSuccess`. CLAUDE.md §2 documents this for `enabled`; it is
  worse for `onSuccess`, which carries the invalidation. No caller passes one today (checked),
  so moving the spread ahead of the callbacks is a pure hardening. AST scan: 20 → 0.
- **An id-only cursor derived from page order.** `useInfiniteNotifications` used
  `page[page.length-1].id`, correct only if rows arrive in sort order. Backend is
  `orderBy(desc(id))` + `lt(id, cursor)`, so the safe continuation is the page *minimum*.
  Fixed; `hooks/api/cursor-pagination-contract.test.tsx` (new, 6 tests) proves it with
  disagreeing ids `[90,12,41]`, a falsy `id: 0` cursor round trip, and a filter change.
  Reverting the hook turns 2 of the 6 red — the test bites.
- **Two hooks whose page size drove the request but not the key** (`useKbResearchBriefs`,
  `useTimesheetPayrollExports`): two mounts with different limits shared one cache entry.
- **Two key objects outside the registry** (`hr/engagement.ts` 11 keys, `hr/succession.ts` 1),
  unprefixed and invisible to `queryKeys.hr.all`. One of them, `KEYS.leaderboard()`, had the
  same trailing-undefined bug, hidden from the registry scan because the factory was local.
  Folded into new `lib/query-keys/hr-engagement.ts`.
- **`useSuccessionPlans` had no `enabled` gate at all** — it fired for anyone. Gated on
  `hr:succession:view` + `useModuleEnabled("hr")`, matching the backend controller.
- **QA/bugs/incidents keys accepted `projectId?`**, putting `undefined` mid-key. Made required;
  the 7 call sites now pass `?? 0` behind their existing `enabled`.

## Not closed — with numbers

1. **Runtime response parsing does not exist.** `lib/api-envelope.ts::parseApiResponse<T>` casts
   the JSON body to `T` unchecked; **2 of 454** files under `hooks/api/` import Zod. A backend
   field rename is accepted silently everywhere. `check:contract-drift` passes but is *static*
   and scoped to `hooks/api/timesheets*` only (49 calls, 25 bodies unresolved). Closing this is
   a project (schema per response type, or a generated client), not a session.
2. **125 of 929 read hooks have no `enabled` gate.** e.g. `accounting.ts:74,280,340,429`,
   `blog.ts:22`, `git-integration.ts:52`, `api-tokens.ts:43`. `check:command-catalog` does not
   see them — it classifies `useGatedQuery` reads only (70 of them). Each needs its exact
   backend `@RequirePermission` key, so this is a per-hook audit, not a codemod.
3. **State coverage (loading/empty/offline/permission-denied/revoked)** is a per-page criterion
   in `app/**` + `features/**` — ticket 25's territory, actively being restructured.

## For the orchestrator

- **`pnpm -s check:query-scope` is red for a reason that is not a code defect.** All 16
  violations are inside `.next-buildmart/`, a stale build directory left by another session.
  `scripts/check-query-scope.mjs:6` excludes `.next` but not `.next-buildmart`, and
  `.next-buildmart` is not in `.gitignore` either. Zero violations in real source. Fix belongs
  to whoever owns `scripts/` + `.gitignore`.
- Transient `app/**` and `features/**` type errors appeared and cleared during the session
  (ticket 25 mid-edit). Final `tsc --noEmit`: 22 errors, all in the stale generated
  `.next/types/validator.ts`, **0 in source**.

## Gates run (all read, not assumed)

| Gate | Result |
|---|---|
| `tsc --noEmit` | 22 errors, all `.next/types/validator.ts`; 0 in source |
| `jest hooks/api lib/query-keys lib/query-keys-registry lib/query-scope-isolation lib/prefetch lib/hr-workforce-cache lib/optimistic-cache` | **58 suites / 547 tests, all pass** |
| `check:query-signal` | exit 0 |
| `check:command-catalog` | exit 0 (1504 mutations classified, 0 unclassified) |
| `check:effect-fetches` | exit 0 |
| `check:over-300` | exit 0 (510 of 5116, baseline 519) |
| `check:contract-drift` | exit 0 (static, timesheets only) |
| `check:query-scope` | exit 1 — 16/16 violations in `.next-buildmart`, 0 in source |
| `eslint` on all changed files | 0 errors, 11 pre-existing unused-import warnings |

## Files changed (all inside FE/hooks/**, FE/lib/query*/**)

**New**
- `frontend/lib/query-keys/key-factory-contract.test.ts`
- `frontend/lib/query-keys/hr-engagement.ts`
- `frontend/hooks/api/cursor-pagination-contract.test.tsx`

**Key registry** — `frontend/lib/query-keys.ts`, and under `frontend/lib/query-keys/`:
`access-and-crm.ts`, `accounting-and-support.ts`, `build-work.ts`, `collaboration.ts`,
`customer-work.ts`, `directory-and-ownership.ts`, `growth-and-sign.ts`, `human-resources.ts`,
`inventory.ts`, `knowledge-and-surveys.ts`, `payroll.ts`, `platform-core.ts`,
`platform-hierarchy.ts`, `support-and-workflows.ts`, `users-and-commerce.ts`

**Hooks** — under `frontend/hooks/api/`:
`build/advanced.ts`, `build/bugs.ts`, `build/incidents.ts`, `build/projects.ts`, `build/qa.ts`,
`build/sprints.ts`, `build/ticket-related-links.ts`, `build/time-entries.ts`,
`hr/attendance.ts`, `hr/engagement.ts`, `hr/succession.ts`, `kb/research-briefs.ts`,
`notifications-inbox.ts`, `timesheets/payroll.ts`, `mail.test.ts`

No file outside this session's territory was edited. No git command was run.
