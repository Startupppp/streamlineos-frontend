# Lane 7 — Requests for orchestrator

## ORCHESTRATOR RULING — Round 4 C4 audit (2026-09-26)

You reported 12 C4 ticks, four of them justified as "stub pages with no lists — vacuously satisfied".
I reverted **four** of those ticks. The other eight stand.

**`10-project-settings-views.md` — REVERTED, and it is a real defect, not a bookkeeping error.**
`hooks/api/build/advanced.ts:223` `useViews` returns a plain `ProjectView[]` from
`GET /build/{projectId}/views` with no cursor and no page envelope, and
`features/build/settings/project-settings-views-page.tsx:113` renders `(views ?? []).map(...)` with no
pagination, slice or windowing. That is an FE-112 violation on a page you ticked as "bounded and usable
at 1k members" — saved views scale with member count, so this is exactly the case the criterion names.
**Action for you:** this needs a cursor on the endpoint and either `TablePagination mode="cursor"` or an
`InfiniteScrollSentinel` on the page (FE-125 forbids a reveal button). Lane 1 did the equivalent cutover
for templates this round — copy that shape, and migrate the page's own test mocks in the same change,
because Lane 1 and Lane 2 both left stale array-shaped mocks behind and the suites stayed green while
the page crashed.

**`10-project-settings-iterations.md`, `-portal.md`, `-retention.md` — REVERTED as vacuous.**
All three are disposition **ADD**. `project-settings-iterations-page.tsx:48` renders
`<PmSection index={0}>{null}</PmSection>` behind an EmptyState; the portal page is a 58-line EmptyState
with no data hook; `retention/page.tsx:15` renders a `RetentionPlaceholder` that says the work awaits
open question 9. Ticking "lists are bounded and remain usable at 10k work items" on a page that renders
nothing is technically true and practically misleading — the next implementer reads a tick and skips the
boundedness work. A criterion that cannot fail yet is not satisfied; it is not yet applicable. Each now
carries a measured BLOCKED line.

**Standing rule from this:** do not tick a criterion because the feature it constrains is absent. If the
page is a placeholder, the box stays open with a BLOCKED line naming the placeholder.

The eight remaining C4 ticks stand — I checked the map call sites. `automations-page.tsx:219`,
`project-webhooks-page.tsx:205` and `workflow-page.tsx:92` render genuinely bounded admin
configuration, and `WEBHOOK_EVENTS.map` at `project-webhooks-page.tsx:262` is a fixed constant.

## ORCHESTRATOR RULING (2026-09-26)

**All 12 route files exist on disk** — access, agents, agents/credentials, fields, integrations,
iterations, portal, retention, views, automations, workflow, integrations/webhooks. No dead route was
registered.

### Request 1 (route manifest) — ALREADY SATISFIED, no edit needed

All 9 entries are already in `frontend/lib/build/build-route-manifest.ts` at lines 62–76, added in
commit `cb7433704`. Note the manifest's actual shape is `{ route, decision, target }` — it has no
"manifest key" or permission column, so the table in your request did not describe this file. Nothing
to apply.

### Request 3 (route-access extension entries) — APPLIED, this is the one that mattered

This, not the nav catalog, is what binds access: `lib/build/nav/build-nav-route-access.test.ts:52`
proves project-settings sub-routes resolve **via prefix extension**, and
`matchRouteAccessExtension` (`route-access-extensions.ts:37`) picks the most specific prefix by
`specificityOf`, so array position does not matter.

Added to `frontend/lib/rbac/route-access/route-access-extension-entries.ts`:
- `/build/[projectId]/settings/access` → `build:members:view`
- `/build/[projectId]/settings/agents/credentials` → `settings:api-tokens:read`
- `/build/[projectId]/settings/portal` → `build:clientvisibility:manage`

All three keys verified to exist in the real backend catalog, not assumed:
`build:members:view` at `backend/src/modules/rbac/permissions/build.ts:201`,
`build:clientvisibility:manage` at `:29`, `settings:api-tokens:read` at
`backend/src/modules/api-tokens/user/user-api-tokens.controller.ts:44`.

**Two of your `backendRoute` paths were wrong and I corrected them.** The members list is
`GET /build/members` (`build-members.controller.ts:36`), org-scoped — not
`/build/{projectId}/members`; that project-scoped route does exist at
`project-resources.controller.ts:71` but declares `build:view`, not `build:members:view`. Agent tokens
are `GET /agent-tokens` (`agent-tokens.controller.ts:17`), not `/agent/tokens`. Client visibility
was right: `GET /build/{projectId}/client-visibility` (`client-visibility.controller.ts:33`).

Five tests added to `lib/build/nav/build-nav-route-access.test.ts`, including two negative controls
proving `settings/agents` and `settings/fields` still inherit `build:update` so the new entries did
not widen their reach. `npx jest lib/build/nav/build-nav-route-access lib/rbac/route-access` →
10 of 13 suites pass, 258 of 261 tests. The 3 failures are a **pre-existing** gap:
`/chat/settings` has no registry entry and resolves as unknown, which fails closed. That file is
tracked, unmodified, and was committed in `d6be51300` — not this session, and not the build module.

### Request 2 (nav catalog entries) — HELD, pending a decision I am making deliberately

Not applied as written, and you should not wait on it. Three reasons:
1. `build-project-catalog.ts` is 279 lines. Nine entries at ~7 lines each takes it to ~342, past the
   FE-57 300-line ratchet — which is the signal to split the file, not to append.
2. Nine flat items (Access, Agents, Credentials, Fields, Integrations, Iterations, Portal, Retention,
   Views) in the project sidebar beside the existing "Project settings" singleton is nav bloat, and
   the spec's own wireframe caps the functional bands before content at three.
3. Access resolution does **not** depend on it (see Request 3), so nothing of yours is blocked. These
   pages are sub-pages of Project settings and belong in an index on the settings page itself.

**Do not tick a C1/C3 box on sidebar reachability for these nine.** If a criterion of yours needs a
user-visible path to one of them, build the index on `/build/[projectId]/settings` — that page is
yours — and tell me; the nav catalog stays as it is.

### One defect in your own territory, found while verifying

`frontend/features/build/settings/project-settings-access-page.tsx:31` calls `useBuildListKeyboard`
with `itemCount: 0` and an empty `onOpen` callback. That binding is inert: `j`/`k`/`Enter` can never
move or open anything, and the search input gets no `inputRef`, so `/` does nothing either. A C3 or
C6 keyboard tick citing this page would be false. Wire it to the real row count and pass
`inputRef` (see my separate message on `search.inputRef`) before claiming keyboard support anywhere
in the settings set.

---


## 1. Route manifest registrations (build-route-manifest.ts)

File: `frontend/lib/build/build-route-manifest.ts` (request-only)

Add the following 9 new project-settings sub-routes to the manifest. Each route uses `enforceRouteAccess` in its route file (path listed below). The permission key each enforces matches the `/build/[projectId]/settings` prefix entry already in `route-access-extension-entries.ts` (`build:update`) **except** access and credentials which have their own keys.

| Manifest key | Route path | Route file | Permission |
|---|---|---|---|
| `build-project-settings-access` | `/build/[projectId]/settings/access` | `app/(authenticated)/build/[projectId]/settings/access/page.tsx` | `build:members:view` |
| `build-project-settings-agents` | `/build/[projectId]/settings/agents` | `app/(authenticated)/build/[projectId]/settings/agents/page.tsx` | `build:update` |
| `build-project-settings-agents-credentials` | `/build/[projectId]/settings/agents/credentials` | `app/(authenticated)/build/[projectId]/settings/agents/credentials/page.tsx` | `settings:api-tokens:read` |
| `build-project-settings-fields` | `/build/[projectId]/settings/fields` | `app/(authenticated)/build/[projectId]/settings/fields/page.tsx` | `build:update` |
| `build-project-settings-integrations` | `/build/[projectId]/settings/integrations` | `app/(authenticated)/build/[projectId]/settings/integrations/page.tsx` | `build:update` |
| `build-project-settings-iterations` | `/build/[projectId]/settings/iterations` | `app/(authenticated)/build/[projectId]/settings/iterations/page.tsx` | `build:update` |
| `build-project-settings-portal` | `/build/[projectId]/settings/portal` | `app/(authenticated)/build/[projectId]/settings/portal/page.tsx` | `build:clientvisibility:manage` |
| `build-project-settings-retention` | `/build/[projectId]/settings/retention` | `app/(authenticated)/build/[projectId]/settings/retention/page.tsx` | `build:update` |
| `build-project-settings-views` | `/build/[projectId]/settings/views` | `app/(authenticated)/build/[projectId]/settings/views/page.tsx` | `build:update` |

## 2. Nav catalog entries (build-project-catalog.ts)

File: `frontend/lib/build/nav/build-project-catalog.ts` (request-only)

Add nav entries for the following new settings sub-routes under the existing "Settings" group in the project nav. Each entry should mirror the existing `settings` entry pattern (icon from lucide-react, `requiredPermission` matching the permission above).

Routes to add: access, agents, agents/credentials, fields, integrations (project-level), iterations, portal, retention, views.

Note: automations, workflow, and integrations/webhooks routes already existed; verify they already have nav entries before adding duplicates.

## 3. route-access-extension-entries.ts

File: `frontend/lib/rbac/route-access/route-access-extension-entries.ts` (shared)

Add prefix-match entries for:
- `/build/[projectId]/settings/access` → `build:members:view`
- `/build/[projectId]/settings/agents/credentials` → `settings:api-tokens:read`
- `/build/[projectId]/settings/portal` → `build:clientvisibility:manage`

The existing `/build/[projectId]/settings` wildcard entry with `build:update` already covers agents, fields, integrations, iterations, retention, views, automations, and workflow.
