# Dead Build Surface Removal — Status Ledger

**Branch:** `build/remove-dead-build-surface`
**Worktree:** `D:/projects/personal/slos-dead-surface`
**Base:** local `main` = `e21246395`, later merged forward twice as `main` moved to `ed55029d4` and then `29842b3e2`
**Date:** 2026-09-22

`main` moved twice during this session. The second move was a **parallel session
deleting `/build/access`**, one of the same six routes. The conflicts were
resolved by union, and the peer's two new regression suites pass against these
deletions. See the merge commit for the file-by-file resolution.

Decisions and their evidence live in
[`DEAD-BUILD-SURFACE-INVENTORY.md`](./DEAD-BUILD-SURFACE-INVENTORY.md). This
file records only what was done and how it was measured.

| Task | Status | Files | Tests | Browser status | Evidence |
|---|---|---|---|---|---|
| Phase 1 — route and dependency inventory | **DONE** | `docs/build-module/DEAD-BUILD-SURFACE-INVENTORY.md` | n/a | n/a | 88 authenticated Build pages enumerated, 9 redirect-only pages identified, all `(portal)` and `(public)` routes classified. Every candidate checked against nav catalogs, command palette, keyboard shortcuts, `next.config.ts`, route-access registry, route manifest, census and tests. |
| Phase 2 — managed-products organization | **DONE (no change required)** | none | `features/build/managed-products` suites pass | READY_FOR_CODEX_BROWSER_QA | All seven canonical routes already exist exactly as specified; shared product UI already lives in `frontend/features/build/managed-products/`. No duplicate product page, no product page under an unrelated project route. `/build/workspaces/[pmWorkspaceId]/products` is a workspace-scoped listing, `KEEP` per `PG-WS-006`. Moving correctly-placed routes to satisfy a checklist would be churn. |
| Phase 3 — remove dead routes and files | **DONE** | 19 deleted, 14 edited | see verification table | READY_FOR_CODEX_BROWSER_QA | Nine redirect-only route pages, four orphaned `loading`/`error` siblings, six orphaned components and tests. Route manifest 88 → 79, census 97 → 88 routes / 88 → 79 pages. |
| Phase 4 — redirect-only routes | **DONE** | see Phase 3 | `build-redirect-route-removal.test.ts`, 40 cases, all pass | READY_FOR_CODEX_BROWSER_QA | **All nine** redirect-only Build pages are deleted. Six were already shadowed by a `next.config.ts` redirect; for the other three the redirect was migrated into `next.config.ts` first, so no deep link changed behaviour. No redirect-only Build page remains. |
| Phase 5 — API, types and Zod cleanup | **DONE (nothing became unused)** | none | n/a | n/a | No endpoint, hook, request/response type or Zod schema was orphaned. Every feature behind a deleted redirect is still imported by the canonical settings route that replaced it. See "Phase 5 finding" below. |
| Phase 6 — verification | **DONE, two pre-existing failures** | n/a | see table below | n/a | Every non-green result reproduced on unmodified code before being attributed. |
| Phase 7 — browser handoff | **READY_FOR_CODEX_BROWSER_QA** | `docs/build-module/CODEX-DELETION-BROWSER-QA.md` | n/a | **READY_FOR_CODEX_BROWSER_QA** | Claude ran code and automated tests only. No browser verification is claimed. |
| Backend repository work | **BLOCKED — not required** | none | not run | n/a | `backend/` is a separate repository present only at `D:/projects/personal/Streamlineos/backend`; a worktree of the root repo has no `backend/` sibling, and this session is worktree-isolated. No backend change is required because no endpoint was removed — see "Phase 5 finding". |

## Verification results

| Check | Baseline (before any edit) | After |
|---|---|---|
| `node scripts/build-route-census.mjs --check` | PASS — 97 routes, 88 pages, 0 weak cold-load gates | **PASS — 88 routes, 79 pages, 0 weak cold-load gates** |
| `pnpm check:dead-code` unclassified exports | 6 | **5** — deleting `my-tickets-view.ts` retired `parseMyTicketsView` |
| `node scripts/build-route-census.mjs --self-test` | PASS 9/9 | **PASS 9/9** |
| `node scripts/check-build-execution-plan.mjs` | **FAIL (exit 1)** — CRLF artifact | **FAIL (exit 1) — identical message, unchanged** |
| `node scripts/check-build-execution-plan.mjs --self-test` | PASS | **PASS** |
| `pnpm typecheck:web` | PASS | **PASS (exit 0)**, re-run after the `main` merge |
| `pnpm type-check:specs` | PASS before the merge | **FAIL (exit 2) after merging `main`** — one error in `features/build/backlog/project-backlog-page.test.tsx:22`, the exact file and error `PHASE-3-STATUS.md` documents as pre-existing. Untouched by this branch; it arrived with `main`. |
| `pnpm jest lib/build lib/rbac` | — | **35 suites, 505 tests, all pass** |
| `pnpm jest features/build lib components/layout components/command-palette features/portal features/portal-access features/module-access hooks/api/build` | — | **391 of 396 suites pass, 4077 of 4086 tests.** The five failing suites are the pre-existing ones listed below. |
| Peer regression suites `build-access-route-removal.test.ts`, `module-access-route-invariants.test.ts` | added on `main` mid-session | **pass against this branch's deletions** |
| `pnpm check:gated-reads`, `check:route-thinness` | — | **PASS** |
| `pnpm check:dead-code` | **FAIL** — 6 unclassified exports, 3 dead files | **FAIL — same 6 unclassified exports, 0 dead files** |
| `pnpm check:empty-states` | PASS | **PASS** — 4652 files scanned |
| `pnpm check:page-state-usage` | PASS | **PASS** |
| `pnpm check:route-access-contract` | PASS | **PASS** — 221 permission keys, 645 contract entries |
| `pnpm check:client-pages` | PASS | **PASS** — 175 below ceiling |
| `pnpm check:over-300` | **FAIL** — 568 files, 55 above baseline 513 | **FAIL — unchanged**, every listed offender in accounting/HR/mail/payroll |
| `eslint --quiet <touched files>` | — | **0 errors** |
| `git diff --check` | — | clean (one CRLF notice on the regenerated snapshot) |

### Pre-existing failures in the broad sweep

Five suites fail on the merged branch. None is in a file this branch modifies.

| Suite | Why it is not this branch |
|---|---|
| `components/layout/sidebar/sidebar-nav-inventory.test.ts` | Digest of `NAV_GROUPS`; re-run with the HEAD copy of the one shared file this branch edits — identical failure. |
| `components/layout/__tests__/shell-keyboard.test.tsx` | Throws in `org-switcher.tsx` on `useSession`; same restore-and-compare proof. |
| `lib/renderer/record-surface-ratchet.test.ts` | Reports **growth** (`inventory: 138 -> 139`, `build: 76 -> 78`, total 580 vs frozen 578). Deletions can only shrink a count, and `inventory` is untouched here. Re-run with all three deleted components restored: **byte-identical numbers**, so this branch contributes zero. |
| `features/wiki/lib/import-job-label.test.ts` | Wiki import-job naming. No import path reaches anything this branch changes. |
| `lib/__tests__/auth-callbacks-test-helpers.ts` | "Test suite failed to run" — a helpers file matched by the test glob. A jest-config quirk, not a test. |

### The non-green gate results were each proven pre-existing, not assumed

- **`check:build-execution-plan`** reports the same missing literal that
  `PHASE-3-STATUS.md` diagnosed: the checker asserts a string containing `\n`
  while a fresh Windows worktree writes `docs/specs/build/sidebar/02-scope-directory-prd.md`
  with CRLF. Untouched by this branch.
- **`sidebar-nav-inventory.test.ts`** and **`shell-keyboard.test.tsx`** were
  re-run with the HEAD copy of `command-palette-commands.ts` — the only shared
  file this branch edits that they load — restored in place. Identical result:
  5 failed, 10 passed. Then the edit was restored.
- **`check:dead-code`** was re-run with the three deleted component files
  restored from HEAD. Identical 6 unclassified exports, including
  `parseMyTicketsView`. The dead-**file** count is the part this branch moves,
  and it moves the right way: 3 → 0.
- **`check:over-300`** is 55 files above its baseline; none of the files this
  branch touches exceeds 228 lines, and the deletions can only lower the count.

## Phase 5 finding — why nothing became unused

The six deleted pages were redirect-only. Each contained exactly two imports
(`redirect` and `enforceRouteAccess`) and rendered nothing, so deleting them
orphaned no hook, contract, type or schema.

The feature modules that the *targets* render are all still live:

| Feature module | Imported by |
|---|---|
| `features/build/members/members-page.tsx` | `app/(authenticated)/build/settings/access/page.tsx` |
| `features/portal-access/client-access-page.tsx` | `app/(authenticated)/build/settings/client-access/page.tsx` |
| `features/build/workflow/workflow-page.tsx` | `app/(authenticated)/build/[projectId]/settings/workflow/page.tsx` |
| `features/build/automations/automations-page.tsx` | `app/(authenticated)/build/[projectId]/settings/automations/page.tsx` |
| `features/build/webhooks/project-webhooks-page.tsx` | `app/(authenticated)/build/[projectId]/settings/integrations/webhooks/page.tsx` |

**A trap worth recording.** `hooks/api/build/{workflow,webhooks,automations}.ts`
and `hooks/api/build/workspace-members.ts` contain the literals
`/build/${projectId}/workflow`, `/build/${projectId}/webhooks`,
`/build/${projectId}/automations` and `/build/members`. Those are **backend REST
endpoints**, not frontend routes — the same strings in a different namespace.
`contracts/openapi.json` publishes `/build/members` as an API path. A grep-driven
deletion would have removed the API layer for five live surfaces. Nothing in
`hooks/api/**` was touched.

## Changes made

**Deleted (11 files)**

```
frontend/app/(authenticated)/build/access/page.tsx
frontend/app/(authenticated)/build/client-access/page.tsx
frontend/app/(authenticated)/build/client-access/loading.tsx
frontend/app/(authenticated)/build/members/page.tsx
frontend/app/(authenticated)/build/members/error.tsx
frontend/app/(authenticated)/build/[projectId]/workflow/page.tsx
frontend/app/(authenticated)/build/[projectId]/workflow/error.tsx
frontend/app/(authenticated)/build/[projectId]/workflow/loading.tsx
frontend/app/(authenticated)/build/[projectId]/automations/page.tsx
frontend/app/(authenticated)/build/[projectId]/automations/loading.tsx
frontend/app/(authenticated)/build/[projectId]/webhooks/page.tsx
frontend/app/(authenticated)/build/[projectId]/webhooks/loading.tsx
frontend/features/build/my-tickets/my-tickets-page.tsx
frontend/features/build/my-tickets/my-tickets-view-body.tsx
frontend/features/build/my-tickets/my-tickets-page.test.tsx
frontend/features/build/drafts/comment-drafts-page.tsx
frontend/features/build/drafts/comment-drafts-page.test.tsx
```

**Edited**

| File | Change |
|---|---|
| `frontend/lib/build/build-route-manifest.ts` | six entries removed |
| `frontend/lib/build/build-route-manifest.test.ts` | pinned count 88 → 82 |
| `frontend/lib/rbac/denial-is-not-emptiness.known.json` | `my-tickets-page.tsx` entry removed (allowlist shrinks) |
| `frontend/lib/rbac/route-access/route-access-extension-entries.ts` | `/build/[projectId]/workflow` and `/build/[projectId]/webhooks` prefixes removed — they became phantom entries once their pages were deleted |
| `frontend/lib/build/build-route-access-deny.test.ts` | the two rows for the deleted paths now assert the canonical `…/settings/…` URLs, which are the live guarded surfaces |
| `frontend/components/layout/command-palette-commands.ts` | "My Tickets" now opens `/build/my-work?projectId=…` |
| `frontend/components/command-palette/hooks/use-keyboard-shortcuts.ts` | `g`+`i` chord now opens `/build/my-work?projectId=…` |
| `frontend/components/command-palette/hooks/use-keyboard-shortcuts.test.ts` | asserts the canonical URL |
| `frontend/components/layout/sidebar/sidebar-permission-navigation.test.ts` | stale `/build/access` expectation corrected to `/build/settings/access`, turning a red test green |
| `frontend/features/build/members/members-page.test.tsx` | stale `usePathname` mock corrected to the route the component actually renders at |
| `frontend/PAGES.md` | six rows marked `[RETIRED …]` per the file's own never-delete-a-row rule |
| `docs/specs/build/generated/routes.snapshot.json` | regenerated with the script, not hand-edited |
| `docs/specs/build/module/01a-canonical-route-manifest-prd.md` | six disposition rows annotated; stale header counts flagged |
| `docs/build-module/99-kill-list.md` | executed removals recorded, with what was deliberately not removed and why |

**Deliberately not changed**

- `next.config.ts` — all six redirects retained. They are the deep-link contract
  now that the page files are gone.
- `hooks/api/**` — see the trap above.
- `features/build/my-tickets/{my-tickets-skeleton.tsx, my-tickets-view.ts}` —
  unreachable as product surface but still imported by two a11y suites. The
  house rule is not to delete a shared component while any repo-wide import
  remains. Recorded as `NEEDS_REVIEW`.
- The seven `CONSOLIDATE` pages and three `MOVE` pages with a missing target —
  `BLOCKED`, because deleting them would remove the user job rather than move it.

## Merged to `main`, and verified there

`main` = `125c66eec`. The branch was merged by fast-forward using git's own
`receive.denyCurrentBranch=updateInstead`, which **refuses if the target working
tree is dirty** and otherwise updates the working tree alongside the ref — so
the shared checkout at `D:/projects/personal/Streamlineos` is consistent rather
than left holding deleted files. The setting was unset afterwards. Verified on
disk there: all nine route pages gone, ten `/build/` redirects in
`next.config.ts`, the new removal test present.

Measured **in the main checkout**, after pruning the stale types below:

| Check | Result |
|---|---|
| `pnpm typecheck:web` | **exit 0** (was exit 2 — 17 dangling `.next/types` errors, zero source errors) |
| `node scripts/build-route-census.mjs --check` | **PASS** — 88 Build routes, 79 Build pages, 0 weak cold-load gates |
| `node scripts/build-route-census.mjs --self-test` | **PASS** |
| `node scripts/check-build-execution-plan.mjs` | **exit 0** — green on `main`, confirming the worktree failure really was the CRLF artifact |
| `pnpm jest lib/build lib/rbac features/build components/command-palette components/layout/sidebar features/module-access` | **215 of 216 suites, 1777 of 1778 tests pass** |

The single failure is `sidebar-nav-inventory.test.ts`, and it is not this work:

- `NAV_GROUPS` and the `sidebar-nav-groups-*` files contain **zero** references
  to `build-stable-destinations` or any Build nav catalog, so the Drafts href
  change cannot move the digest.
- The digest constant was last recomputed in `1dc61259f` (Recruitment OS split)
  while a nav group config changed later in `7840a4c58`. It was already stale
  before this branch existed.
- Independently reproduced earlier by restoring the HEAD copy of the only shared
  file this branch edits and re-running: identical failure.

It is deliberately **not** fixed here. Its own instruction is to recompute the
digest *and record why it moved*; recomputing it without knowing which nav
change moved it would rubber-stamp an unreviewed navigation edit, which is the
one thing that gate exists to prevent.

## Stale generated route types — pruned, no longer owed

**Done in the main checkout on 2026-09-22 — listed here for any other warm
checkout.** `next typegen` regenerates route types for routes that exist but
does **not** prune types for routes that were deleted, so on any checkout with a
warm `.next/` cache `pnpm typecheck:web` fails like this:

```
.next/types/app/(authenticated)/build/members/page.ts(2,24): error TS2307:
  Cannot find module '.../app/(authenticated)/build/members/page.js'
```

The source files are correctly gone; only the generated artifacts are stale.
`.next/` is gitignored build cache, so pruning is safe:

```bash
cd frontend
rm -rf ".next/types/app/(authenticated)/build/access"
rm -rf ".next/types/app/(authenticated)/build/members"
rm -rf ".next/types/app/(authenticated)/build/client-access"
rm -rf ".next/types/app/(authenticated)/build/[projectId]/workflow"
rm -rf ".next/types/app/(authenticated)/build/[projectId]/automations"
rm -rf ".next/types/app/(authenticated)/build/[projectId]/webhooks"
rm -rf ".next/types/app/(authenticated)/build/drafts"
rm -rf ".next/types/app/(authenticated)/build/[projectId]/my-tickets"
rm -rf ".next/types/app/(authenticated)/build/workspaces/[pmWorkspaceId]/my-work"
```

The parallel session found this for `/build/access` and recorded it in
`ACCESS-ROUTE-CLOSURE-STATUS.md`; the same applied to the other eight.
**This worktree never reproduced it** — it was created fresh and `next typegen`
first ran after the deletions, so no stale directory was ever generated. That is
why `typecheck:web` passed here throughout, and it is why that pass alone did
not prove a warm checkout was clean. It was not: the main checkout failed with
exit 2 on 17 errors, every one of them a dangling `.next/types` artifact and not
one of them a source error. After the prune it exits 0.

## The census vacuity floor was lowered, deliberately

`scripts/build-route-census.mjs` carried `MIN_BUILD_PAGES = 80`, which fails the
run with *"the sweep resolved nothing and cannot report a clean tree"*. At 79
Build pages the gate tripped. That floor is a **vacuity guard** — it exists to
catch a collapsed enumeration, not to forbid a legitimate deletion — so it was
lowered to `70` rather than the deletions being abandoned. The guard still
works: the script's own self-test asserts that a sweep of 83 passes and a sweep
of 3 fails, and both still hold. `--self-test` is green, 9/9.

## A defect the new test found, not inspection

`build-redirect-route-removal.test.ts` asserts that no Build navigation
destination points at a removed route. It failed on its first run: the "Drafts"
entry in `BUILD_MY_WORK_DESTINATIONS` was still a live sidebar link to
`/build/drafts`, so every user opening Drafts from the sidebar took a needless
server round-trip through a redirect. An earlier revision of the inventory had
dismissed the `/build/drafts` references as "test fixture only" — true of
`mobile-module-nav-items-fixtures.ts`, false of the real catalog. The href is
now `/build/inbox?view=drafts`.

## One correction, recorded rather than quietly fixed

The first verification pass ran `lib/build` but **not** `lib/rbac`, and on that
incomplete evidence this ledger recorded the two route-access extension entries
for `/build/[projectId]/workflow` and `/build/[projectId]/webhooks` as a
deliberate `KEEP`. Re-running `pnpm jest lib/rbac` showed two gates red on
exactly those prefixes — `route-access-coverage.test.ts:42` and
`route-access-keys.test.ts:153`, both of which exist to stop a registry entry
outliving its page. The entries are now removed and both gates are green. The
original `KEEP` was asserted, not measured.

## Open items for a human decision

1. **`/build/customers` has two contradictory authorities.**
   `frontend/lib/build/build-route-manifest.ts` said `DELETE → /crm`;
   `01a-canonical-route-manifest-prd.md` `PG-ORG-007` says `KEEP CRM relation
   view`. Left untouched and `KEEP` in the code manifest's neighbourhood until
   one authority wins.
2. **`/build/goals`, `/build/goals/[goalId]` and `/build/workspaces` do not
   exist.** Three `MOVE` rows name them as targets. Either build the targets or
   rewrite the dispositions to `KEEP`.
3. **`/portal` and `/portal/{projectId}`** are `KEEP` rows in the PRD manifest
   with no route file anywhere under `app/`.
4. **The PRD manifest header counts (93 / 84)** were already stale before this
   change and cannot be reconciled until 1–3 are decided.
5. **FE-45 key mismatch, pre-existing.**
   `/build/[projectId]/settings/workflow` and
   `/build/[projectId]/settings/integrations/webhooks` inherit `build:update`
   from the `/build/[projectId]/settings` prefix, but their first reads declare
   `build:workflow:view` and `build:manage`. Adding more specific registry
   prefixes would fix it and would also change which users can open those pages,
   so it was not done here. This arrived with the Phase 3 route move, not with
   this deletion.
