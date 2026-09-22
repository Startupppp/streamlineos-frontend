# Dead Build Surface — Dependency and Route-Usage Inventory

**Branch:** `build/remove-dead-build-surface`
**Worktree:** `D:/projects/personal/slos-dead-surface` (root repo only — see Environment)
**Base commit:** `e21246395`
**Session start:** 2026-09-22

Every row below was decided against source read in this worktree, not against a
documentation claim. A candidate is only `DELETE` when its callers, navigation
entries, redirects, tests, API usage and deep-link contract were each checked
and found empty or preserved elsewhere.

## Environment

| Fact | Value |
|---|---|
| Root worktree | `D:/projects/personal/slos-dead-surface`, branched from local `main` = `e21246395` |
| Backend repository | **Not present.** `backend/` is a separate repository that exists only at `D:/projects/personal/Streamlineos/backend`; a worktree of the root repo has no `backend/` sibling. |
| Install | `pnpm -C frontend install` only. `pnpm install:all` fails at `backend`. |
| Database | **None contacted.** No `.env` created or copied. `.env` and `.env.production` both resolve to production and were never read. |
| Peer branches | `build/access-route-removal` is an ancestor of `main` — already merged, nothing pending. |

## Authorities consulted

| Authority | Path |
|---|---|
| IA and route disposition | `docs/build-module/01-ia-navigation.md` |
| Kill list | `docs/build-module/99-kill-list.md` |
| Canonical route manifest (PRD) | `docs/specs/build/module/01a-canonical-route-manifest-prd.md` |
| Canonical route manifest (code) | `frontend/lib/build/build-route-manifest.ts` |
| Generated census snapshot | `docs/specs/build/generated/routes.snapshot.json` |
| Nav catalogs | `frontend/lib/build/nav/build-{organization,project,managed-product,workspace}-catalog.ts` |
| Route-access registry | `frontend/lib/rbac/route-access/route-access-extension-entries.ts` |
| Redirect configuration | `frontend/next.config.ts` |
| Page ledger | `frontend/PAGES.md` |

## Baseline gate measurements, taken before any edit

| Gate | Command | Result |
|---|---|---|
| Route census | `node scripts/build-route-census.mjs --check` | **PASS** — 97 Build routes, 88 Build pages, 0 weak cold-load gates (exit 0) |
| Census self-test | `node scripts/build-route-census.mjs --self-test` | **PASS** — 9/9 (exit 0) |
| Execution plan | `node scripts/check-build-execution-plan.mjs` | **FAIL (exit 1) — pre-existing, environmental** |
| Execution plan self-test | `node scripts/check-build-execution-plan.mjs --self-test` | **PASS** (exit 0) |
| Sidebar permission navigation | `pnpm jest components/layout/sidebar/sidebar-permission-navigation.test.ts` | **1 FAIL — pre-existing** |

Two baseline failures, both reproduced before this branch changed a single byte:

- **`check:build-execution-plan`** reports
  `docs/specs/build/sidebar/02-scope-directory-prd.md is missing "A project may be\nstandalone with no PM workspace."`
  The checker asserts a literal containing `\n` while a freshly checked-out
  Windows worktree writes the file with CRLF. `PHASE-3-STATUS.md` records the
  same diagnosis with the blob hash proof. Not caused here, not fixed here —
  the fix belongs to the checker or the spec file, neither of which is a dead
  Build surface.
- **`sidebar-permission-navigation.test.ts`** expects
  `hrefsFor("build", ["build:access:view"])` to equal `["/build/access"]`; the
  navigation actually returns `["/build/settings/access"]`. The Phase 3 access
  move landed in the navigation and the test expectation was never updated.
  This one **is** in scope: it is a stale assertion pinned to a route this
  change deletes.

## Key structural finding — the redirect is duplicated

Six Build routes carry **both** a `next.config.ts` redirect **and** a
redirect-only `page.tsx`. The bundled Next.js documentation at
`frontend/node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/redirects.md:39`
states: *"Redirects are checked before the filesystem which includes pages and
`/public` files."* The configuration redirect therefore fires first and the
`page.tsx` never executes. Deleting those page files removes unreachable code
while the deep-link contract stays intact in `next.config.ts`.

Three further redirect-only pages have **no** `next.config.ts` entry. For those
the `page.tsx` redirect *is* the deep-link contract and must be retained.

Project identifiers are numeric — `app/(authenticated)/build/[projectId]/settings/workflow/page.tsx`
calls `parseInt(projectId, 10)` — so the `:projectId(\d+)` constraint on the
three project-scoped redirects covers every real project URL.

## Candidate ledger

### A. Redirect-only routes shadowed by a `next.config.ts` redirect

| Candidate | Kind | Current path | Canonical replacement | Callers | Imports | API usage | Decision | Evidence |
|---|---|---|---|---|---|---|---|---|
| Build access redirect | route | `app/(authenticated)/build/access/page.tsx` | `/build/settings/access` | none — navigation emits `/build/settings/access`, measured | none | none | **DELETE** | `next.config.ts:137` redirects `/build/access`; page unreachable. Only repo reference is the stale assertion at `sidebar-permission-navigation.test.ts:15`. |
| Build client-access redirect | route | `app/(authenticated)/build/client-access/page.tsx` (+ `loading.tsx`) | `/build/settings/client-access` | `build-organization-catalog.ts:117` already points at `/build/settings/client-access` | none | none | **DELETE** | `next.config.ts:142` redirects `/build/client-access`; page unreachable. `loading.tsx` can never paint. |
| Build members redirect | route | `app/(authenticated)/build/members/page.tsx` (+ `error.tsx`) | `/build/settings/access` | `build-organization-catalog.ts:124` already points at `/build/settings/access` | none | none | **DELETE** | `next.config.ts:132` redirects `/build/members`; page unreachable. `error.tsx` can never render. |
| Project workflow redirect | route | `app/(authenticated)/build/[projectId]/workflow/page.tsx` (+ `error.tsx`, `loading.tsx`) | `/build/[projectId]/settings/workflow` | `build-project-catalog.ts:278` already points at `${basePath}/settings/workflow` | none | none | **DELETE** | `next.config.ts:117` redirects `/build/:projectId(\d+)/workflow`; page unreachable for every numeric project id. |
| Project automations redirect | route | `app/(authenticated)/build/[projectId]/automations/page.tsx` (+ `loading.tsx`) | `/build/[projectId]/settings/automations` | `build-project-catalog.ts:292` already points at `${basePath}/settings/automations` | none | none | **DELETE** | `next.config.ts:122` redirects `/build/:projectId(\d+)/automations`; page unreachable. |
| Project webhooks redirect | route | `app/(authenticated)/build/[projectId]/webhooks/page.tsx` (+ `loading.tsx`) | `/build/[projectId]/settings/integrations/webhooks` | `build-project-catalog.ts:299` already points at `${basePath}/settings/integrations/webhooks` | none | none | **DELETE** | `next.config.ts:127` redirects `/build/:projectId(\d+)/webhooks`; page unreachable. |

The feature directories behind all six targets stay: `features/build/members/members-page.tsx`,
`features/portal-access/client-access-page.tsx`, `features/build/workflow/workflow-page.tsx`,
`features/build/automations/automations-page.tsx` and
`features/build/webhooks/project-webhooks-page.tsx` are each imported by the
canonical settings route that replaced the old path. None is dead.

### B. Redirect-only routes that are the sole deep-link contract

| Candidate | Kind | Current path | Canonical replacement | Callers | Imports | API usage | Decision | Evidence |
|---|---|---|---|---|---|---|---|---|
| Project my-tickets | redirect route | `app/(authenticated)/build/[projectId]/my-tickets/page.tsx` | `/build/my-work?projectId=…` | `command-palette-commands.ts:93`, `use-keyboard-shortcuts.ts:54` (`g`+`i` chord) | — | — | **REDIRECT** | No `next.config.ts` entry, so this page is the only thing preserving the deep link. `route-redirects.test.ts:50` pins the behaviour. In-app callers are repointed at the canonical URL so the route serves bookmarks only. |
| Build drafts | redirect route | `app/(authenticated)/build/drafts/page.tsx` | `/build/inbox?view=drafts` | `mobile-module-nav-items-fixtures.ts:18` — **test fixture only**, not live navigation | — | — | **REDIRECT** | No `next.config.ts` entry. Phase 3 L2 composed the drafts surface inside the Inbox; the physical route survives purely for bookmarks. |
| Workspace my-work | redirect route | `app/(authenticated)/build/workspaces/[pmWorkspaceId]/my-work/page.tsx` | `/build/my-work?pmWorkspaceId=…` | none found | — | — | **REDIRECT** | No `next.config.ts` entry. `route-redirects.test.ts:17` pins both the access call and the URL encoding. |

### C. Page components orphaned by a redirect

| Candidate | Kind | Current path | Canonical replacement | Callers | Imports | API usage | Decision | Evidence |
|---|---|---|---|---|---|---|---|---|
| `MyTicketsPage` | component | `features/build/my-tickets/my-tickets-page.tsx` | `/build/my-work` | none | zero production importers repo-wide | — | **DELETE** | Its only route redirects. Repo-wide search finds it referenced solely by its own test and by `denial-is-not-emptiness.known.json:22`. |
| `MyTicketsViewBody` | component | `features/build/my-tickets/my-tickets-view-body.tsx` | — | only `my-tickets-page.tsx` | — | — | **DELETE** | Sole importer is deleted in the same change. |
| `my-tickets-page.test.tsx` | test | `features/build/my-tickets/my-tickets-page.test.tsx` | — | — | — | — | **DELETE** | Covers only the deleted component. |
| `CommentDraftsPage` | component | `features/build/drafts/comment-drafts-page.tsx` | `/build/inbox?view=drafts` | none | zero production importers repo-wide | — | **DELETE** | Phase 3 L2 composed drafts inside the Inbox via `inbox-drafts-panel.tsx`; the standalone page component was left behind. |
| `comment-drafts-page.test.tsx` | test | `features/build/drafts/comment-drafts-page.test.tsx` | — | — | — | — | **DELETE** | Covers only the deleted component. |
| `map-board-ticket.ts` | module | `features/build/my-tickets/map-board-ticket.ts` | — | `features/build/views/use-board-url-state.ts:21` | live production importer | — | **KEEP** | Shared with the board surface. Deleting it would break Issues. |
| `MyTicketsSkeleton` | component | `features/build/my-tickets/my-tickets-skeleton.tsx` | — | `features/__tests__/modules-a11y.test.tsx:150`, `modules-content-a11y.test.tsx:150` | test-only importers | — | **NEEDS_REVIEW** | Unreachable as product surface but still imported repo-wide. The house rule is "never delete a shared component until all imports across the entire repository are gone", so it is retained and recorded rather than removed. Its dependency `my-tickets-view.ts` is retained for the same reason. |

### D. Consolidation sources that are still the only implementation

These carry a `CONSOLIDATE` or `MOVE` disposition but are **not** redirects —
they render the real page, and the job has not been migrated. Deleting any of
them destroys a working user surface.

| Candidate | Kind | Current path | Canonical replacement | Callers | Decision | Evidence |
|---|---|---|---|---|---|---|
| Project AI | route | `/build/[projectId]/ai` | `/build/command-center?projectId=…` | `build-project-catalog.ts:306` (More tools, live), route-access entry at `route-access-extension-entries.ts:358` | **BLOCKED** | Full page, not a redirect. Command Center does not yet accept `projectId` as a project-AI surface. Migration is feature work, not cleanup. |
| Project analytics | route | `/build/[projectId]/analytics` | `/build/[projectId]/reports?tab=overview` | `build-project-catalog.ts:229` (live), `command-palette-commands.ts:105` (live) | **BLOCKED** | Full page. Two live navigation callers. |
| Project bugs | route | `/build/[projectId]/bugs` | `/build/[projectId]/issues?type=BUG` | `build-project-catalog.ts:172` (live), route-access entry at `:209`, palette test `command-palette-project-routes.test.tsx:136` | **BLOCKED** | Full page. Kill-list item 7 requires the QA-bug lifecycle consolidation first; that is backlog P0 #7, 8–12 days. |
| Project intake | route | `/build/[projectId]/intake` | `/build/[projectId]/forms` + `/triage` | `build-project-catalog.ts:193` (live) | **BLOCKED** | Full page. |
| Project timeline | route | `/build/[projectId]/timeline` | `/build/[projectId]/issues?layout=timeline` | `build-project-catalog.ts:85` (**primary** sidebar, live), route-access entry at `:326` | **BLOCKED** | Full page in the primary sidebar. Backlog P1 #11 owns the canonical Issues explorer that must serve `layout=timeline` first. |
| Project saved views | route | `/build/[projectId]/views` | `/build/[projectId]/issues` | `build-project-catalog.ts:264` (live) | **BLOCKED** | Full page. |
| Build customers | route | `/build/customers` | `/crm` | `build-organization-catalog.ts:103` (live), route-access entry at `:179`, `hooks/api/build/customers.ts` | **NEEDS_REVIEW** | **The two manifests disagree.** `build-route-manifest.ts:136` says `DELETE → /crm`; `01a-canonical-route-manifest-prd.md` `PG-ORG-007` says `same · KEEP CRM relation view`. A contradiction between two authorities is not a licence to delete. |

### E. Move sources whose destination does not exist

| Candidate | Kind | Current path | Stated target | Target on disk | Decision | Evidence |
|---|---|---|---|---|---|---|
| Build goals list | route | `/build/goal` | `/build/goals` | **absent** — no `app/(authenticated)/build/goals/` | **BLOCKED** | `build-organization-catalog.ts:89` points at `/build/goal`. This is the only Goals implementation; deleting it removes the job outright. |
| Build goal detail | route | `/build/goal/[goalId]` | `/build/goals/[goalId]` | **absent** | **BLOCKED** | Same. |
| PM workspaces list | route | `/build/pm-workspaces` | `/build/workspaces` | **absent** — `app/(authenticated)/build/workspaces/` contains only `[pmWorkspaceId]`, no index page | **BLOCKED** | `build-organization-catalog.ts:75` points at `/build/pm-workspaces`. Creating the index page is new work, not deletion. |

### F. Manifest rows with no page on disk

| Candidate | Kind | Decision | Evidence |
|---|---|---|---|
| `/portal`, `/portal/{projectId}` | PRD manifest rows `PG-PORTAL-001/002` | **NEEDS_REVIEW** | Marked `KEEP` in the PRD but no route file exists under `app/`. The `(portal)` group holds `client-portal` only. Documentation drift, not dead code — recorded, not acted on. |
| `/build/{projectId}/sprints` | PRD manifest row `PG-PRJ-036` (`REMOVE`) | **DONE ALREADY** | No route file on disk. The kill-list item is satisfied; nothing to delete. |

### G. Route-access registry entries for deleted pages

| Candidate | Decision | Evidence |
|---|---|---|
| `route-access-extension-entries.ts` prefixes `/build/[projectId]/workflow`, `/build/[projectId]/webhooks` | **DELETE** | Two gates forbid a registry entry outliving its page: `route-access-coverage.test.ts:42` ("every route-access extension prefix matches at least one real authenticated page — catches phantom extensions") and `route-access-keys.test.ts:153` ("keeps every registry extension live, so a stale entry cannot accumulate"). Both went red on exactly these two prefixes after the pages were deleted. Removed. |

**Correction.** An earlier revision of this inventory recorded these two entries
as `KEEP`, arguing that the URL is still live behind a `next.config.ts` redirect
so `resolveRouteAccess` must not return `unknown` for it. That reasoning was
asserted, not measured, and the repository disagrees: it carries two gates whose
entire purpose is to stop a registry entry outliving its page. The `KEEP` call
was only possible because the first verification pass ran `lib/build` but never
`lib/rbac`. Both gates are green after removal.

The entries were **deleted rather than retargeted** at the canonical settings
paths. Retargeting was the tempting fix — the surfaces that now read
`GET /build/{projectId}/workflow/transitions` and `GET /build/{projectId}/webhooks`
inherit `build:update` from the `/build/[projectId]/settings` prefix rather than
the `build:workflow:view` and `build:manage` keys those endpoints actually
declare, which is an FE-45 mismatch. But adding the more specific prefixes would
change *which users can open those pages*, and
`99-open-questions.md` forbids proceeding by silently choosing an answer that
changes permissions. Deletion leaves permission resolution byte-identical to
before this branch. **The FE-45 key mismatch on
`/build/[projectId]/settings/{workflow,integrations/webhooks}` is recorded here
as `NEEDS_REVIEW` and is pre-existing — it arrived with the Phase 3 route move,
not with this deletion.**

## Managed products — organization assessment

The canonical structure the cleanup brief specifies already exists on disk,
exactly and with no duplicates:

| Required route | On disk | Renders from |
|---|---|---|
| `/build/managed-products` | yes | `features/build/managed-products/managed-products-page.tsx` |
| `/build/managed-products/[managedProductId]` | yes | product overview |
| `…/projects` | yes | linked-projects surface |
| `…/roadmap` | yes | `features/build/managed-products/product-roadmap-page.tsx` |
| `…/goals` | yes | `features/build/managed-products/product-goals-page.tsx` |
| `…/insights` | yes | `features/build/managed-products/product-insights-page.tsx` |
| `…/feedback` | yes | `features/build/managed-products/product-feedback-page.tsx` |

Shared product UI already lives in `frontend/features/build/managed-products/`.
There is no product page outside `[managedProductId]`, no duplicate page for a
product scope, and no product page parked under an unrelated project route.
`/build/workspaces/[pmWorkspaceId]/products` is a **workspace-scoped** listing,
not a duplicate of the organization listing — `01a-canonical-route-manifest-prd.md`
`PG-WS-006` marks it `KEEP`, and it answers a different user job.

**Decision: KEEP, no reorganization required.** Nothing was moved, because
moving a correctly-placed route to satisfy a checklist would be churn.

## Summary of decisions

| Decision | Count | Kind |
|---|---|---|
| DELETE | 11 files | 6 unreachable route pages + 4 orphan `loading`/`error` siblings are counted with their route; 5 orphaned components and tests |
| REDIRECT | 3 | Sole deep-link contract, retained |
| KEEP | 2 + managed-products | Shared code with live importers |
| BLOCKED | 10 | Consolidation and move sources whose destination is absent or whose job is unmigrated |
| NEEDS_REVIEW | 3 | Manifest contradiction, drifted portal rows, test-only component |

## Retained redirects and their removal conditions

| Retained redirect | Owner | Removal condition |
|---|---|---|
| `next.config.ts` `/build/access`, `/build/members`, `/build/client-access` | Build module | Remove once access logs show zero hits for one full bookmark cycle. No in-app caller remains. |
| `next.config.ts` `/build/:projectId(\d+)/{workflow,automations,webhooks}` | Build module | Same. No in-app caller remains after this change. |
| `page.tsx` `/build/[projectId]/my-tickets` | Build module | Remove once the redirect is moved into `next.config.ts` or bookmark traffic reaches zero. In-app callers removed by this change. |
| `page.tsx` `/build/drafts` | Build module | Same. |
| `page.tsx` `/build/workspaces/[pmWorkspaceId]/my-work` | Build module | Same. |
