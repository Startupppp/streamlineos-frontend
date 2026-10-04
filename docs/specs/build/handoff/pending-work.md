# Pending work — 2026-09-21

Grouped by **what blocks it**, because that determines what you can start now.

- [§1 Blocked on the environment](#1-blocked-on-a-local-postgres) — largest share
- [§2 Ready now, small](#2-ready-now-small-and-well-defined)
- [§3 Ready now, the seven red gates](#3-the-seven-red-gates)
- [§4 Needs a decision, not code](#4-needs-a-decision-not-code)
- [§5 The long tail](#5-the-long-tail-653-open-boxes)

---

## 1. Blocked on a local Postgres

Everything here waits on `winget install -e --id PostgreSQL.PostgreSQL.17`,
then roles `neondb_owner` + `streamline_app`, database `scratch_local`, a local
trust rule. **Read `traps.md` §1 before pointing any tool at a database.**

| Item | What it needs |
|---|---|
| `BLD-10-007`, `BLD-10-038`, `BLD-10-039` | Applied migration + rollback/forward recovery evidence |
| `BLD-X-BE-E2E-STATUS-001` | The backend e2e status tier — **73 spec files**, `pnpm test:e2e` only |
| Migration application | 897 `.sql` files, 897 journal entries, **in sync** through `1134`. Whether any are *applied* is unknowable without a database. |
| Every Browser-proof item | Stack boot + Playwright capture. Browserless sessions may author journeys and fixtures; execution stays an `EVIDENCE_PENDING` packet. |
| `BLD-X-DB-*`, `BLD-X-PW-*` families | See the ledger's External Evidence Queue |

Migration state note: an earlier handoff said "1124–1127 authored and journaled,
unapplied". **That is superseded** — peers have since landed through `1134` and
the journal has no drift. Re-derive, do not trust that line.

---

## 2. Ready now, small and well defined

### `use-build-scope-directory.test.ts` — the one rejected agent result

An agent "fixed" 46 TS2352 errors with `as (...args: any[]) => any` at three
sites, and silently dropped `.mockResolvedValue(undefined)` from
`fetchNextPage`, changing runtime behaviour under cover of a type fix. **Both
reverted** — the file is back at its committed state and the errors are open.

The real shape of the problem: the file's 46 call sites already use
`as ReturnType<typeof useX>`, which are themselves §6 violations. A cast that
makes those casts compile is not a fix.

**Do:** give `makeEmptyQuery` / `makeEmptyInfiniteQuery` an explicit return type
matching the real TanStack `UseQueryResult` / `UseInfiniteQueryResult` shape, so
the call sites need no assertion at all. Then delete the 46 assertions.

**Do not:** reach for `any`, `as unknown as`, `@ts-expect-error`, or widen a
mock to `jest.Mock` to make the overlap check pass.

This file is also **543 lines**, over the 500 hard-review gate, so the split and
the type fix are one job.

### The `-ink`-as-text sweep

~1,716 call sites repo-wide (~180 Build) render text in `--status-<tone>-ink`,
the 3:1 non-text ink. Needs its own packet **with a ratchet**, because a
one-time fix will regress. Do not change the tokens — see
`completed-work.md` §6 for why that is wrong.

### `BSN-04-A03` — still reopened

Programmatic `router.push` navigation remains unguarded by the dirty-state
check. Link navigation is guarded; `router.push` is not.

---

## 3. The seven red gates

Findings are recorded verbatim in `module/10-release-verification-prd.md` under
`BLD-10-067`. Current state, measured 2026-09-21:

| Gate | Finding | Build-owned? |
|---|---|---|
| `check:test-typecheck` | **121 errors, 38 files.** 19 of 22 Build files fixed; 1 open (§2), 16 non-Build untouched | partly |
| `check:file-sizes` | **15 files over 500 lines.** Build: `use-build-scope-directory.test.ts` 543, `cycles-page.tsx` 586, `build-scope-browser.test.tsx` 519, `projects-page.tsx` 508 | partly |
| `check:over-300` | 547 files over 300 lines, **34 above baseline 513**; 6 sit at exactly 301 | partly |
| `check:type-assertions` | 4 files hold an unledgered double cast; 23 an unledgered plain assertion; 8 ledger entries stale; the plain-assertion floor reads 498 against 499, which the gate itself calls "the counter is broken, not the tree clean" | no |
| `check:permission-binding` | **12 hooks** gate on a permission the route they call does not declare — all CRM, payroll and HR recruitment | **no** |
| `check:command-catalog` | **16 findings**, all outside Build: 9 recruitment hooks declare `hr:employees:*` where the contract wants `hr:requisitions:*` / `hr:interviews:*`; impersonation, inventory and timesheets mutations unguarded | **no** |
| `check:test-integrity` | **2 tautologies, 12 bare `.toThrow()`**, both ratchets at 0 | unknown |

**`check:contract-vendor` now passes** — a peer re-vendored `openapi.json`
(`e04d996eb`). An earlier handoff listed it as failing; that is stale.

⚠ **Before treating any `check:command-catalog` or `check:permission-binding`
finding as a defect, verify it against the backend decorator.** Those gates read
the vendored contract. The three Build findings fixed in `49a167a5e` were each
confirmed against `@RequirePermission` in the controller first, and that is the
standard.

One of those 16 deserves a product read, not a mechanical fix:
`useSubmitReferral` and internal-job application are flagged as needing
`hr:requisitions:*`. **CLAUDE.md §8 makes referrals and internal job openings
universal self-service** — so the correct key may be neither what the hook
declares nor what the contract asks for. Resolve the product rule first.

---

## 4. Needs a decision, not code

| Item | Decision owner |
|---|---|
| `BLD-09-021` non-goals wording | Product — twelve exclusions drafted and ready to read |
| `BLD-10-A01` | User, explicitly deferred |
| **`/sprints` removal** | **Urgent.** See below. |

### `/sprints` — check this before it is buried

`features/build/sprints/` holds planning, velocity and complete-sprint
capability that `features/build/cycles/` **does not have**. The `PG-PRJ-036`
disposition says REMOVE the duplicate route; it does not say discard those
features.

A peer session committed `9662485c9 "refactor: remove sprint-related components
and schemas"` and deleted
`frontend/app/(authenticated)/build/[projectId]/sprints/{page,error,loading}.tsx`.
**Verify the capability was ported into `/cycles` and not simply dropped.** If
it was dropped, that is lost function, not a completed consolidation, and
`git show 9662485c9` is where to recover it.

---

## 5. The long tail: 653 open boxes

Counted 2026-09-21 by `grep -c '^\s*- \[ \]'`. These are acceptance criteria,
most requiring evidence tiers this machine cannot produce yet.

| Area | Open | Notable |
|---|---|---|
| `module/10-release-verification-prd.md` | **80** | The verification spine; 3 closed so far |
| `module/06-data-performance-prd.md` | 49 | Needs Database proof |
| `module/README.md` | 46 | Index-level criteria |
| `module/04-ticket-workflow-prd.md` | 44 | |
| `module/07-architecture-integrations-prd.md` | 44 | |
| `module/05-forms-validation-prd.md` | 41 | |
| `module/01-route-navigation-prd.md` | 40 | |
| `module/03-discovery-views-pagination-prd.md` | 38 | |
| `module/08-visual-accessibility-prd.md` | 36 | Mostly Browser proof |
| `module/09-competitor-parity-prd.md` | 30 | |
| `module/02a-cross-scope-pages-prd.md` | 23 | |
| `module/00-product-decisions-prd.md` | 15 | Product, not engineering |
| remaining `module/*` | 74 | route/contract matrices |
| `sidebar/05-release-verification-prd.md` | **55** | |
| `sidebar/02-scope-directory-prd.md` | 15 | |
| remaining `sidebar/*` | 23 | |
| **Total** | **653** | 560 module + 93 sidebar |

Routing for these is in [`../requirement-map.md`](../requirement-map.md);
per-lane reading lists in [`../context-capsules.md`](../context-capsules.md);
packet boundaries in [`../work-packets.md`](../work-packets.md).

**Do not bulk-tick.** CLAUDE.md §12: untick or tick a box only after matching
its exact acceptance to durable evidence at the real entry point. A helper-only
test does not certify an unwired caller.
