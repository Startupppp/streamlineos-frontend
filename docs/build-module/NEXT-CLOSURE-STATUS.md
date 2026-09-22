# Build closure session — status ledger

Coordinator-owned. Workers never edit this file.

**Session:** 2026-09-22
**Branch:** `build/phase-4-close` (root and backend), merged to `main` in both repos
**Worktree:** `D:/projects/personal/slos-phase-4-close` (+ `/backend`), `node_modules` junctioned, no install

`DONE` = code and automated tests complete and verified here.
`READY_FOR_CODEX_BROWSER_QA` = code complete; Codex must verify the UI in a real browser. Claude opened no browser this session.

## Status

| Task | Status | Commit | Tests | Browser status | Blocker |
|---|---|---|---|---|---|
| P4-10 — roadmap/feedback `status` in server schemas | DONE | `b85b0110b` → merge `c6cc31231` | 14/14 in `build-roadmap-response.spec.ts`; 288/288 backend focused | READY_FOR_CODEX_BROWSER_QA | none — published contract verified to carry `status`, see below |
| P4-10a — response/filter enum drift protection | DONE | `b85b0110b` | 2 drift tests compare filter `.options` to pgEnum `enumValues` | n/a | none |
| P4-17 — grant mutation response / client Zod parity | DONE (already closed) | landed earlier in `6de3fa51c` | 6 existing tests cover absent / present / null contacts | READY_FOR_CODEX_BROWSER_QA | none |
| P4-18 — revoke-grant cache invalidation | DONE | `66e257dc0` → merge `d589996f6` | 13/13 `hooks/api/portal-access`; mutation-proven red | READY_FOR_CODEX_BROWSER_QA | none |
| Phase B — Phase 3 workflow integration | DONE (already merged) | `ade105b12`, merged before this session | 220 suites / 1558 tests pass on merged main | READY_FOR_CODEX_BROWSER_QA | none |
| Phase B follow-up — FE-77 import in `use-my-work-bulk.ts` | DONE | `871103532` → merge `1ee2ca90c` | 166/166 across 22 suites | n/a | none |
| Phase B follow-up — two code comments in `use-my-work-data.ts` | DONE | `871103532` | 3 legacy-cycle tests carry the reason; mutation-proven | n/a | none |
| Phase B follow-up — inner `Promise.all` in All Work chunking | DONE | `871103532` | 4 new tests; 3 fail against the reverted mutant | READY_FOR_CODEX_BROWSER_QA | none |
| Phase B follow-up — Inbox `view` change does not reset cursor | DONE | `871103532` | 2 new tests; 1 fails against the reverted mutant | READY_FOR_CODEX_BROWSER_QA | none |
| Phase B follow-up — All Work selection for List/Board | DONE | `2d3b41ed5`, `cfd4b1afd` → merge `ebe2cd0b7` | 1420 tests / 186 suites green; board navigation guard mutation-proven | READY_FOR_CODEX_BROWSER_QA | none |
| Phase B follow-up — Inbox `type` dropdown | DONE | `2d3b41ed5`, `cfd4b1afd` → merge `ebe2cd0b7` | 105 inbox tests; invalid-category drop mutation-proven | READY_FOR_CODEX_BROWSER_QA | none |
| Phase B follow-up — physical removal of old redirect routes | DONE | `1d07fadad` | Route census: 88 routes, 79 pages, 0 weak cold-load gates; route and redirect tests pass | READY_FOR_CODEX_BROWSER_QA | `/build/goal` and `/build/pm-workspaces` page trees were removed; config redirects preserve deep links |
| Phase C — static integration verification | DONE | — | see table below | n/a | none |
| Phase D — Codex browser QA handoff | DONE | — | n/a | READY_FOR_CODEX_BROWSER_QA | See `CODEX-BROWSER-QA.md` |

## The three Phase 4 findings were already implemented — the gap was coverage

All three were recorded `IN PROGRESS` in `PHASE-4-STATUS.md`, but their implementations had landed. That ledger is stale; this file supersedes those three rows.

**P4-17 was genuinely closed already.** `portal-access-schema.ts:67-68` reads `.nullable().optional().transform((v) => v ?? null)`. Verified field-by-field against the backend `grantRowSchema` (`backend/src/modules/portal/access/dto/portal-access-response.schemas.ts:59-77`): 15 fields, all mapped. `contactFirstName` / `contactLastName` are genuinely absent from the mutation response and present only on `grantListItemSchema`, which is exactly what the `.optional()` handles. Six existing tests cover absent, present and explicitly-null. No change made.

**P4-18's implementation was closed; its test was inert.** `grants.ts:91` already invalidated `portal.all`. But `grants-revoke.test.ts` imported only `directoryAndOwnershipQueryKeys` and never `./grants` — it asserted that `portal.projects()` is prefixed by `portal.all` and similar key-shape facts. It could not observe the hook at all, so deleting the invalidation left all four tests green. That is a test documenting an intention, not pinning a behaviour.

Replaced with four tests that render `useRevokeGrant` against a real `createAppQueryClient`, seed the portal projection, run the mutation and assert `isInvalidated` flips. Each is guarded by a `toBe(false)` pre-assertion so it cannot pass vacuously. The three key-shape assertions were kept but renamed to say plainly that they do not execute the hook.

Mutation proof, reproduced by the coordinator rather than taken from the worker's report:

| Step | Result |
|---|---|
| Baseline | 13/13 pass |
| Mutant — `portal.all` invalidation line removed from `grants.ts` | **2 failed / 11 passed** |
| Restored — `grants.ts` byte-identical to `main` | 13/13 pass |

`invalidateQueries` was kept over `removeQueries` deliberately. It marks the query stale synchronously and refetches mounted observers; `removeQueries` would blank the admin's view to a spinner for no security gain, since the guest's server-side access is already revoked when the mutation resolves.

**P4-10's schema fix was closed; its coverage stopped at the row.** `status` is present at `build-roadmap-response.schemas.ts:11` and `:44`, and all 7 roadmap/feedback response routes carry `@ResponseSchema`. But a `z.object()` silently strips unknown keys on decode, so a row-level test does not prove the page wrapper preserves the field. Added envelope tests for `roadmapPageSchema` and `cursorPageSchema(feedbackPostSchema)`, mutation-proven red by swapping the item schema for a bare `{ id }`.

Also added drift protection: both list filter schemas hardcode their status literals rather than importing the pgEnum. The values match today; two tests now assert each filter's `.options` equals `enumValues` exactly, so a future divergence fails instead of shipping. Cross-repo parity was confirmed read-only — the frontend's `roadmap-schema.ts` enum sets match both pgEnums element for element.

## Phase C — static integration verification

Run serially in the worktree after syncing `main` (which had advanced 8 commits mid-session). Two 10 GB typechecks do not fit in available RAM, and parallel gate runs corrupt fixture-planting gates.

| Check | Command | Result | Classification |
|---|---|---|---|
| Route census | `pnpm check:route-census` | **PASS** — 97 Build routes, 88 pages, 0 weak cold-load gates | — |
| Build execution plan | `pnpm check:build-execution-plan` | FAIL in worktree, **PASS on `main`** | **environment** |
| Frontend typecheck | `pnpm typecheck:web` | **PASS (exit 0)** | — |
| Frontend spec typecheck | `pnpm type-check:specs` | 1 error, reproduces identically on `main` | **pre-existing** |
| Backend typecheck | `pnpm typecheck` | **PASS (exit 0)** | — |
| Backend spec typecheck | `pnpm typecheck:test` | 1 error, reproduces identically on `main` | **pre-existing** |
| Contract vendor | `pnpm check:contract-vendor` | **PASS** — sha256 `43b58720` matches backend artifact | — |
| Contract parity | `pnpm check:contract-parity` | **4 findings; 4 on `main`** — zero new | **pre-existing** |
| Frontend focused | `pnpm exec jest features/build lib/build features/portal features/portal-access hooks/api/portal-access hooks/api/portal hooks/api/build` | **220 suites, 1558 tests, all pass** | — |
| Backend focused | `pnpm exec jest src/modules/portal src/modules/build/core/dto src/modules/feedbucket src/modules/build/client-portal src/modules/build/managed-products` (db/e2e excluded) | **33 suites, 288 tests, all pass** | — |
| Whitespace | `git diff --check` over this session's commits | clean | — |

### The two non-green results, proven not assumed

**`check:build-execution-plan` is a CRLF artifact, not a regression.** It fails only in a freshly checked-out Windows worktree. `git hash-object` is identical in both trees (`4a1d1b8d2624a8ca247e1771d1afa3a0d6ba87e2`) while on-disk size differs by exactly the CR bytes — **17009 on `main` vs 17326 in the worktree**. The checker asserts a literal containing `\n`. Same diagnosis Phase 3 recorded.

**Both spec typecheck errors are pre-existing**, each reproduced on the untouched `main` checkout:
- `features/build/backlog/project-backlog-page.test.tsx(22,54)` TS2556 — a zero-arg `jest.fn()` spread.
- `src/modules/portal/client/portal-client-submit-cr.spec.ts(87,61)` TS2502 — `tx` referenced in its own type annotation, the known circular-drizzle-condition shape.

Guarded against a vacuous pass: `tsc --listFilesOnly` resolves **6187** files for the frontend spec program and both new spec files are in their respective programs, so the clean result over them is a real green, not an unresolved file.

## Phase B — Phase 3 was already merged

`git rev-list --left-right --count main...build/phase-3-workflows` returns `9  0`. Zero commits on the branch are absent from `main`; Phase 3 landed as `ade105b12` in a prior session. **There was nothing to merge.** The review that was to precede the merge was run after the fact instead; its findings are recorded in `PHASE-3-STATUS.md`.

Nine of nine review items came back CLEAN or CONCERN except code comments. No unrelated files, no migration or schema touched, manifest consistent at 88 with resolvable targets, all redirects placed after `enforceRouteAccess` with byte-identical literals and no loop, all new routes resolving to a real permission decision rather than `unknown`.

## Phase 3 follow-ups — closed 2026-09-22

Branch `build/phase-3-followups`, commit `871103532`, merged as `1ee2ca90c`.

**The All Work chunk fix was the one with teeth.** The outer per-project fan-out already used
`Promise.allSettled`, but the intra-project chunk loop used `Promise.all`. Selecting more than 100 tickets from
one project and having chunk 2 fail after chunk 1 committed rejected the whole project: it landed in `failed`,
its `projects.tickets({ projectId })` cache was never invalidated, and the rows chunk 1 had genuinely committed
read stale until `staleTime` elapsed. The per-project call now settles each chunk, sums what committed,
invalidates that project when anything did, and still reports the failed chunk with 409 kept distinct from a
generic error.

**The FE-77 import fix exposed a coupled test.** Changing `use-my-work-bulk.ts` to import `isApiError` from its
owner `@/lib/api-envelope` broke two tests, because the suite mocked `isApiError` on `@/lib/api-client` and gave
`api-envelope` only `lazyContract`. The test had been written against the violation. The mock moved to the
owning module; both tests pass without weakening an assertion.

**The removed comments were replaced by tests, not deleted outright.** The legacy `cycle` deep-link fallback now
has three tests — normalises `cycle` to `cycleId`, prefers an explicit `cycleId` when both are present, and
sends neither when absent — so the reasoning survives somewhere it can fail.

Mutation proof for all three behavioural changes, run here:

| Mutant | Result |
|---|---|
| `Promise.allSettled` → `Promise.all` in the chunk loop | **3 of 4 new tests fail** |
| `view` re-excluded from the Inbox `filterChanged` guard | **1 new test fails** |
| legacy `cycle` fallback disabled | **1 new test fails** |
| all three restored | **166/166 pass, 22 suites** |

The fourth All Work test asserts that a failed chunk is still surfaced, which holds under both implementations —
kept deliberately as the positive pair to the three that bite.

Verification after the merge: `features/build` + `lib/build` → **177 suites, 1307 tests, all pass**;
`pnpm type-check` exit 0; eslint clean on all four touched files; `type-check:specs` shows only the one
pre-existing `project-backlog-page.test.tsx` error; route census still 97/88/0.

## The OpenAPI blocker was not real, and the way it was concluded is the lesson

`PHASE-4-STATUS.md` recorded `openapi.json not regenerated` as a standing blocker: the roadmap/feedback `status`
fix was said to be correct in source but absent from the published artifact, so the generated client could not
read the field. This session repeated that claim, on the strength of the vendored copy's file mtime
(2026-09-21 22:17) predating backend commit `32f0e070b`.

**Both were wrong. The committed artifact already carried `status`, and had for some time.**

Verified by reading the artifact rather than reasoning about its timestamp:

| Route | Published `status` enum |
|---|---|
| `GET /build/roadmap` | `["planned","in_progress","completed","cancelled"]` |
| `GET /build/feedback` | `["open","planned","in_progress","completed","declined"]` |
| `PATCH /build/roadmap/{itemId}` | same as roadmap |
| `PATCH /build/feedback/{postId}` | same as feedback |

A regeneration was run to settle it, with placeholder env and **no** `--env-file` flag, so nothing contacted any
database — the placeholder `DATABASE_URL` pointed at `127.0.0.1:1`, which would have failed instantly had a
connection been attempted. `src/scripts/openapi-env.ts` requires only that the variable be non-empty and says so
in its own header.

The regenerated artifact is **byte-identical to the committed one**: same sha256 (`0f621e4e…`), same 68,224,720
bytes, 0 paths added, 0 removed, 0 operations changed. Git reported it as modified only because the generator
writes LF where the Windows working copy holds CRLF — the same class of artifact as the execution-plan gate. The
regenerated file was discarded rather than committed, since a 68 MB line-ending-only diff is pure noise.

**The 30 path-parameter rewrites no longer exist either.** That was the stated reason to keep regeneration out of
Phase 4. A direct comparison of every `in: path` parameter across all 2959 paths returns **0 changed**. Whatever
staleness existed then has since been reconciled on `main`.

Two lessons worth keeping. A file's mtime is not evidence about its contents — the artifact was right there and
could have been read at any point. And a blocker is a claim: this one survived two phases without anyone testing
it, which is the same failure the BLD-003 ledger already recorded about a "needs a scratch database" blocker that
also turned out to be false.

## The last two follow-ups, and the regression that nearly shipped with them

Merged as `ebe2cd0b7`. Two workers ran in parallel on disjoint files; the coordinator reviewed, corrected and
committed.

**Board selection was delivered as a regression and had to be rebuilt.** The first implementation gave
`KanbanBoard` a `selection` prop and made `handleSelect` toggle selection *instead of* navigating whenever that
prop was present. Because All Work always passes it, the effect was that **clicking a card on the Board could no
longer open the ticket** — the feature traded away the surface's primary action. The worker recorded it as
intentional, having taken the shortcut because `KanbanTicketCard` sat outside its ownership.

Rebuilt so selection is additive: card click navigates exactly as before, and selection is a checkbox on the
card mirroring the existing `list-view-item` idiom. `selection` is threaded through
`KanbanBoardColumn` → `KanbanVirtualTicketList` → `KanbanTicketCard` rather than intercepted at the top. Pinned
by `kanban-card-selection.test.tsx`, whose first test is named for the invariant: reintroducing the regression
fails exactly that test and nothing else.

The reason this slipped through the worker's own suite is worth recording: its tests mocked `KanbanBoard`
wholesale and asserted only that props were threaded. Prop-threading assertions cannot see behaviour, so a suite
built entirely from them will pass whatever the component does with those props.

**Three further corrections before merge**, each caught by a gate run against a main-checkout control:

- `type-check:specs` showed 10 errors against main's 9. The extra one was a `require("react")` inside a hoisted
  `jest.mock` factory shadowing the typed import, making `createContext<T>()` an untyped call. Fixed with a
  `mock`-prefixed import, which `babel-plugin-jest-hoist` permits. Back to 9, same two files as main.
- `check:type-assertions` flagged two new assertions in `use-inbox-url-state.ts`. Removed rather than
  allowlisted — `.some()` and `.find()` replace the casts — and the category guard now has one definition that
  `inbox-filter-bar.tsx` imports instead of duplicating.
- `check:over-300` rose 569 → 570 because the new category tests pushed `inbox-list-bounded.test.tsx` to 338
  lines. The ratchet may only shrink, so the suite was split into a shared harness plus two files of 233 and
  118 lines: 17 tests before, 17 after, count back to 569.

Final state on the merged branch: `pnpm type-check` 0 errors, `type-check:specs` 9 (main's baseline, zero new),
eslint clean on every touched source file, `check:over-300` 569, route census 88 routes / 79 pages / 0 weak
cold-load gates, and **1420 tests across 186 suites** in `features/build`, `lib/build` and
`hooks/api/notifications`.

The six `text-[11px]` eslint errors in `kanban-ticket-card.tsx` and `kanban-board-column.tsx` are pre-existing —
identical counts on the untouched main checkout, and this change added none.

## Blockers

| Blocker | Impact | Exact unblock condition |
|---|---|---|
| No non-production PostgreSQL 15+ | No `*.db.spec.ts` or `*.e2e-spec.ts` can run. Every fix this session is covered by specs that need no database. | Provision Postgres 15+, apply the chain, set `DATABASE_URL` in the worktree. **`.env` and `.env.production` both resolve to production RDS** — neither may be used. |
| No running application stack | No authenticated end-to-end browser journey. | The database blocker, plus a seeded disposable tenant and a frontend built against the local API with `API_INTERNAL_URL` set. |
| ~~`openapi.json` not regenerated~~ | **RETIRED 2026-09-22 — the premise was false.** See "The OpenAPI blocker was not real" below. | n/a |

## Rules enforced

- No production database contacted. No migration written, edited or applied.
- No destructive git commands, no `git stash`. Workers ran no git at all; the coordinator performed every commit and merge.
- No code comments, TODO comments, JSDoc or commented-out code added.
- Three workers maximum, strictly disjoint file ownership, one shared branch.
- Gates run serially; typechecks never concurrent.
- Every failure classified `code` / `test` / `environment` / `pre-existing`, each `pre-existing` claim reproduced on the untouched `main` checkout.
- Workers reported `READY_FOR_REVIEW`; only the coordinator marked `DONE`, and every worker claim load-bearing enough to matter was re-verified here rather than accepted.
- No browser opened, no screenshot taken, no UI verification claimed.
