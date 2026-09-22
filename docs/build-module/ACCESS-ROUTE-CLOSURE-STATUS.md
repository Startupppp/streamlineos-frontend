# Next closure status — `/build/access` removal

Branch `build/access-route-removal` · commit `54e73a9` · worktree `D:/projects/personal/slos-access-removal`.

Written for the path `NEXT-CLOSURE-STATUS.md` and renamed on delivery: a concurrent session owns that filename for the `build/phase-4-close` workstream, where it is a coordinator-owned ledger marked "Workers never edit this file". That file was untracked in the main checkout, so no branch-level check could see it. The two documents are unrelated — this one covers only the `/build/access` removal.

Canonical route: `/build/settings/access`. Audit: [ACCESS-ROUTE-REMOVAL-AUDIT.md](./ACCESS-ROUTE-REMOVAL-AUDIT.md). Browser handoff: [ACCESS-ROUTE-BROWSER-QA.md](./ACCESS-ROUTE-BROWSER-QA.md).

## 1. Deleted files

| File | Why |
|---|---|
| `frontend/app/(authenticated)/build/access/page.tsx` | unreachable — `next.config.ts` redirects `/build/access` before filesystem routing, so the page never ran |

One file. No hook, API function, Zod schema, component, or fixture was owned by this route — the page imported only `redirect` (Next.js) and the shared `enforceRouteAccess`.

## 2. Kept shared files

`build:access:view` / `build:access:manage` keys · `features/module-access/**` (13 modules) · `features/build/members/**` · `lib/rbac/route-access/**` · `frontend/contracts/permission-catalog.json` · `lib/build/nav/build-organization-catalog.ts` · `frontend/app/(authenticated)/build/settings/access/page.tsx`.

Nothing shared was deleted. The Directory module (`user-access-links-section.tsx:12,67`) and the Build org catalog both consume `build:access:view`.

## 3. Migrated references

| File | Change |
|---|---|
| `frontend/lib/build/build-route-manifest.ts` | removed the `/build/access` entry |
| `frontend/lib/build/build-route-manifest.test.ts` | 88 → 87; added an explicit absent/present assertion |
| `frontend/components/layout/sidebar/sidebar-permission-navigation.test.ts` | stale fixture `/build/access` → `/build/settings/access` |
| `frontend/features/module-access/module-access-route-invariants.test.ts` | made path-aware via `RELOCATED_ACCESS_PAGE` |
| `docs/specs/build/generated/routes.snapshot.json` | regenerated |
| `PAGES.md`, `frontend/PAGES.md` | route inventory now names the canonical path |
| `docs/build-module/10-access.md`, `01-ia-navigation.md` | MOVE recorded as completed |

Design history in `docs/specs/build/module/{01a,02a,02c}-*.md` was deliberately left intact — those tables record the decision, they are not a live registry. `IMPLEMENTATION-STATUS.md` was left untouched because it is modified in the main checkout by another session.

No new redirect was created. The existing `next.config.ts` redirect is the sanctioned deep-link preservation named in `01-ia-navigation.md:155`.

## 4. Route-count change

Build pages 88 → 87. Census routes 97 → 96. `MIN_BUILD_PAGES = 80` unaffected.

## 5. API / Zod files removed

None. No API contract, endpoint, or schema was specific to this route; `backend/**` had zero references.

## 6. Permission keys

`build:access:view` and `build:access:manage` **retained** — still consumed by the Directory module, the Build org nav catalog, the generated permission catalog, and `route-access-keys.test.ts`. None removed.

## 7. Automated tests

| Command | Result |
|---|---|
| `pnpm check:route-census` | PASS — 96 routes, 87 Build pages, 0 weak cold-load gates |
| `pnpm check:route-census:self-test` | PASS — 9 cases |
| `pnpm check:build-execution-plan` | PASS (see note) |
| `pnpm typecheck:web` | PASS |
| `pnpm type-check:specs` | 1 error, pre-existing and identical on `main` (`project-backlog-page.test.tsx:22`) |
| `check:route-access-contract` + self-test | PASS — 221 keys, 645 contract entries |
| `eslint` on all changed files | PASS |
| `git diff --check` | clean |
| focused: manifest, invariants, sidebar nav, nav route-access, removal spec | PASS — 5 suites, 86 tests |
| broad: `lib/build`, `lib/rbac/route-access`, `features/module-access`, `components/layout/sidebar` | 41/42 suites, 561/562 tests (1 pre-existing failure, below) |

### Re-verified after merging main

`main` advanced 13 commits (Phase 3 follow-ups, Phase 4 closure, palette and portal-access work) and was merged into this branch at `5e201b16`. The merge was conflict-free, touched none of the 14 files in this change, and added or removed no Build route — `main` still carries 88 Build pages, so the 87 baseline here remains correct. The deletion survived the merge (verified on disk and in the manifest).

Every gate above was then re-run on the merged branch with identical results: census 96/87, `typecheck:web` clean, specs typecheck showing only the pre-existing error, contract gate 221/645, eslint clean, 561/562 tests.

**`check:build-execution-plan` note.** It fails in any fresh worktree because `git worktree add` writes `docs/specs/build/sidebar/02-scope-directory-prd.md` with CRLF while the checker asserts an LF-only literal. Same blob OID in both trees (`4a1d1b8`), 17009 vs 17326 bytes. Verified three ways: passes in the main checkout, passes in the worktree once CRLF is stripped, and the file is not part of this change.

### Pre-existing failures

Three suites were red on `main` at `63296d193` before this work. Two were caused by the half-finished migration and are **now fixed**:

- `module-access-route-invariants.test.ts` — Build's access page was a bare redirect, failing the shared-`ModuleAccessPage` policy.
- `sidebar-permission-navigation.test.ts` — fixture expected `/build/access`; the nav already emitted `/build/settings/access`.

One is unrelated and **left alone**: `sidebar-nav-inventory.test.ts` digest mismatch (expected `5ec432b…`, received `90c5e1e…`). Identical on `main` both before and after the merge; this change touches no navigation config.

Traced to `7840a4c58` *feat(palette): reach the 37 project-scoped Build routes and surface search failures*, which is on `main` and changed sidebar nav config without recomputing `sidebar-nav-inventory-digest.ts`. That file's own instruction is to recompute the digest **and record why** when a route or permission changes on purpose — which requires whoever made the nav change to confirm it was intended. Re-baselining it here would bless a nav diff this workstream never reviewed and hide any permission change bundled in it. Routed to the palette workstream, not fixed here.

### Regression tests added

`frontend/lib/build/build-access-route-removal.test.ts` — 9 assertions: the route file is gone; it is absent from the manifest while the canonical route remains; the `next.config` redirect still points at the canonical route; the canonical route is never itself redirected (no loop); no navigation surface emits the legacy href; no production source file names it; the sweep is non-vacuous (>1000 files); the canonical route still resolves to `module:build + build:access:view`.

Mutation-tested: restoring the deleted page turns 2 assertions red, deleting it turns them green.

No existing test was weakened. The invariants spec was made **stronger** — Build stays inside the covered set at its real path instead of being exempted, the `>= 13` non-vacuity floor was not moved, and the relocation is now itself asserted (the legacy path must be absent).

## 8. Browser verification

**READY_FOR_CODEX_BROWSER_QA** — not done. Claude ran static and unit checks only. No test in this branch boots the Next.js routing layer, so the `/build/access` redirect behaviour is unverified in a real browser. Checklist: [ACCESS-ROUTE-BROWSER-QA.md](./ACCESS-ROUTE-BROWSER-QA.md).

## 9. Unresolved references

None blocking. Intentionally retained:

- `next.config.ts:137-141` — the deep-link redirect (the product decision preserves it).
- `docs/specs/build/module/{01a,02a,02c}-*.md` — design history.
- `FINAL-CLOSURE-STATUS.md:280` — now stale; it describes a `requirePermission` gate on a page that no longer exists. Left as a historical record rather than rewritten.
- `IMPLEMENTATION-STATUS.md:222` — accurate as written; untouched because another session has it modified.

## 10. Commit

`54e73a99044999677c26ae65ecbd11c9a427c429`

Merges cleanly into `main` (`git merge-tree --write-tree` exit 0). The four files uncommitted in the main checkout are untouched by this branch.
