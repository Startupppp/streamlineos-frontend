# Access route removal — dependency audit

Target: delete the obsolete `/build/access` redirect route. Canonical route: `/build/settings/access`.

Branch `build/access-route-removal`. Worktree `D:/projects/personal/slos-access-removal` (root) with a paired `backend/` worktree so the backend permission catalog resolves.

## The finding that shapes every decision

`frontend/app/(authenticated)/build/access/page.tsx` is **already unreachable**. `frontend/next.config.ts:137-141` declares a config redirect for `/build/access`, and Next.js checks config redirects **before** filesystem routes — `node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/redirects.md:39`: *"Redirects are checked before the filesystem which includes pages and `/public` files."*

So the page never executes. Deleting it is behaviour-neutral: `/build/access` keeps working as a deep link via the config redirect.

The page is also wrong on its own terms. Probed live via `resolveRouteAccess`:

| Path | Resolved gate |
|---|---|
| `/build/access` | `module:build + build:view` |
| `/build/settings/access` | `module:build + build:members:view,build:access:view` |

The legacy page gates on `build:view` — broader than the access screen it fronted. The canonical route carries the correct union.

## Pre-existing failures this work resolves

Both are red on `main` at `63296d193`, before any change here. A previous session converted the page to a redirect without finishing the migration.

| Suite | Failure | Cause |
|---|---|---|
| `features/module-access/module-access-route-invariants.test.ts` | `build delegates authorization UX to the shared ModuleAccessPage` | spec requires `<module>/access/page.tsx` to render `ModuleAccessPage`; Build's is a bare redirect |
| `components/layout/sidebar/sidebar-permission-navigation.test.ts` | `shows only the build access screen for an access-only role` | expects `/build/access`; nav already emits `/build/settings/access` |

## Inventory

| Item | File | Used by | Decision | Evidence |
|---|---|---|---|---|
| `BuildAccessRoute` page | `frontend/app/(authenticated)/build/access/page.tsx` | nothing — unreachable behind the config redirect | DELETE | `redirects.md:39`; no importer in any sweep |
| Config redirect | `frontend/next.config.ts:137-141` | the live `/build/access` behaviour | KEEP_CANONICAL | deep-link preservation named in `01-ia-navigation.md:155` |
| Route manifest entry | `frontend/lib/build/build-route-manifest.ts:127` | `build-route-manifest.test.ts` (disk-bound, bidirectional) | DELETE | manifest asserts every entry has a `page.tsx` on disk |
| Manifest count `88` | `frontend/lib/build/build-route-manifest.test.ts:34,38` | itself | MIGRATE_REFERENCE | re-baseline to `87` in lockstep with the deletion |
| Sidebar test fixture | `frontend/components/layout/sidebar/sidebar-permission-navigation.test.ts:15` | itself — stale | MIGRATE_REFERENCE | nav already emits `/build/settings/access` |
| Cross-module access spec | `features/module-access/module-access-route-invariants.test.ts` | policy over all 14 delegable modules | MIGRATE_REFERENCE | must become path-aware; see below |
| Route snapshot | `docs/specs/build/generated/routes.snapshot.json` | `pnpm check:route-census` | MIGRATE_REFERENCE | generated — regenerate, never hand-edit |
| Canonical page | `frontend/app/(authenticated)/build/settings/access/page.tsx` | the Build access job | KEEP_CANONICAL | renders `ModuleAccessPage` + `MembersPage` |
| `build:access:view` / `:manage` | permission catalogs | Directory module, Build org catalog, `route-access-keys.test.ts` | KEEP_SHARED | `user-access-links-section.tsx:12,67`; `build-organization-catalog.ts:126` |
| `ModuleAccessPage` + tabs | `features/module-access/**` | 13 module access pages | KEEP_SHARED | rendered by the canonical page and 12 others |
| `MembersPage` | `features/build/members/**` | canonical page | KEEP_SHARED | imported by `build/settings/access/page.tsx:3` |
| `lib/rbac/route-access/**` | shared gate foundation | every authenticated route | KEEP_SHARED | `enforceRouteAccess` is repo-wide |
| `frontend/contracts/permission-catalog.json` | generated backend catalog | catalog-sync gates | KEEP_SHARED | generated; keys retained |
| Nav entry `org-members` | `lib/build/nav/build-organization-catalog.ts:120-127` | Build sidebar | KEEP_CANONICAL | already points at `/build/settings/access` |
| Design records | `docs/build-module/{01-ia-navigation,10-access,IMPLEMENTATION-STATUS,FINAL-CLOSURE-STATUS}.md`, `docs/specs/build/module/{01a,02a,02c}-*.md` | historical decision ledger | KEEP_CANONICAL | they record the MOVE decision; the PRD table is design history, not a live registry |
| `PAGES.md` (root + frontend) | route inventory prose | humans | MIGRATE_REFERENCE | update to the canonical path |
| Command palette | `components/command-palette/**` | — | N/A | zero `/build/access` references |
| Backend | `backend/**` | — | N/A | zero references (searched by explicit path; root `.gitignore` hides `backend/`) |
| e2e / fixtures | `frontend/e2e`, Playwright | — | N/A | zero references |

No hook, API function, or Zod schema is owned by `/build/access`. The page imported exactly two symbols, both shared: `redirect` (Next.js) and `enforceRouteAccess`.

## The one spec that needs a design change

`module-access-route-invariants.test.ts` hardcodes `app/(authenticated)/<module>/access/page.tsx` for every delegable module. Build deliberately diverges: its access administration lives under `/build/settings/`, recorded in `01-ia-navigation.md:66,155` and `02a-cross-scope-pages-prd.md:45`.

Two options were considered:

- **Exempt `build`** via the existing `NO_ACCESS_PAGE` map. Rejected: it is untrue (Build *has* an access page), it drops the covered set to 12 and so forces the `>= 13` non-vacuity floor down, and it would stop checking Build's access UX entirely.
- **Make the spec path-aware.** Chosen. A `RELOCATED_ACCESS_PAGE` map points `build` at its real page, and every existing assertion runs against that file. Build stays inside the covered set, the floor is untouched, and the relocation is itself checked — the legacy path must be absent, so the spec now proves the removal rather than tolerating it.

This is strictly stronger than the current spec and needs no threshold moved.

## Route count

88 Build pages → 87. `MIN_BUILD_PAGES = 80` in `scripts/build-route-census.mjs` is unaffected.
