# ROUTE1 — Route Ownership & Portal Deduplication

## Task 1 — Client portal hook collision

**Finding:** The two `usePortalProjects` functions are NOT duplicates. They serve different audiences:

| Implementation | Audience | Auth mechanism | API client |
|---|---|---|---|
| `hooks/api/portal/use-portal-projects.ts` | External client | Portal token (`getPortalToken()`) | `portalApiClient` → `/portal/v1/projects` |
| `hooks/api/build/client-portal.ts` | Internal user | Session JWT + `useCan("build:portal:view")` | `apiClient` → `/build/portal/projects` |

The `(portal)/client-portal/` route group is for external clients who receive an invitation link and authenticate with a portal token — no session required. The `(authenticated)/portal/` route is for internal users managing which projects/tickets/milestones are client-visible.

**Decision:** Both implementations are canonical. No deletion. Resolved the naming collision by renaming the external hook to `useExternalPortalProjects`.

**Files changed:**
- `frontend/hooks/api/portal/use-portal-projects.ts` — renamed `usePortalProjects` → `useExternalPortalProjects`
- `frontend/app/(portal)/client-portal/page.tsx` — updated import and call site

## Task 2 — `/settings/directory` route move

Moved `/settings/directory` and `/settings/directory/[personId]` to `/directory/settings/` and `/directory/settings/[personId]/` per the module-settings rule.

**Files created:**
- `frontend/app/(authenticated)/directory/settings/page.tsx` — `PeopleDirectoryPage basePath="/directory/settings"`
- `frontend/app/(authenticated)/directory/settings/[personId]/page.tsx` — `PersonDetailPage directoryBasePath="/directory/settings"`
- `frontend/app/(authenticated)/directory/settings/loading.tsx`

**Files deleted:**
- `frontend/app/(authenticated)/settings/directory/page.tsx`
- `frontend/app/(authenticated)/settings/directory/[personId]/page.tsx`
- `frontend/app/(authenticated)/settings/directory/loading.tsx`
- `frontend/app/(authenticated)/settings/directory/workers/` (empty directory)

**Files updated:**
- `frontend/components/layout/sidebar/sidebar-nav-groups-administration.ts` — href `/settings/directory` → `/directory/settings`, activePrefixes updated
- `frontend/components/layout/sidebar/sidebar-nav-items.test.ts` — 4 occurrences updated
- `frontend/components/layout/sidebar/sidebar-product-path.test.ts` — 1 occurrence updated
- `frontend/CLAUDE.md` §17 — basePath example updated to `/directory/settings/*`
- `frontend/PAGES.md` — violation rows removed; two new rows added under `## Directory`; standalone violation table row removed

## Task 3 — `[projectId]/page.tsx` split (479 → 46 lines)

Extracted all section components, helpers, and state variants into `features/portal/components/portal-project-detail.tsx`.

**Components extracted:**
- `formatPortalStatus`, `portalStatusStyle`, `formatPortalDate`, `formatPortalFileSize` — format helpers
- `SectionHeader`, `MilestonesSection`, `TasksSection`, `AttachmentsSection`, `CommentsSection` — section renderers
- `ChangeRequestDialogTrigger` — button + dialog state (was scattered in the page)
- `BackToProjects` — reused nav link
- `OverviewSkeleton` — loading shape
- `PortalProjectDetailLoading`, `PortalProjectDetailError`, `PortalProjectDetailNotFound` — full-page state variants
- `PortalProjectDetail` — main content component

**Files changed:**
- `frontend/features/portal/components/portal-project-detail.tsx` — new file (~280 lines)
- `frontend/app/(portal)/client-portal/[projectId]/page.tsx` — reduced from 479 → 46 lines; imports and composes the above

## Lint / Tests
Not run per CLAUDE.md rule.
