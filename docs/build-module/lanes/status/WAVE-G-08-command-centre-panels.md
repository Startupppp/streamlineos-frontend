# WAVE-G-08 Command Centre Panels

## Deliverables

### Backend — completed

**Org-wide risks route** (`GET /build/risks`)
- New controller: `backend/src/modules/build/governance/org-risks.controller.ts`
- New schema: `backend/src/modules/build/governance/dto/org-governance.schemas.ts`
- New service method: `RisksService.listOrgRisks`
- Registered first in `BuildGovernanceModule` so the static path resolves before `:projectId/risks`
- Permission: `build:risks:view`; uses existing `(org_id, id)` unique index for bounded scan

**Org-wide releases route** (`GET /build/releases`)
- Added `orgListReleasesQuerySchema` to `backend/src/modules/build/core/dto/releases.schemas.ts`
- Added `ProjectsReleasesService.listOrgReleases`
- Route added as first handler in `ProjectsReleasesController` before `:projectId/releases`
- Permission: `build:view`; uses `(org_id, id)` unique index

**`owner` URL param → `managerId` filter**
- Added `managerId?: z.string().optional()` to `listProjectsSchema` in `project-core.schemas.ts`
- Added filter in `ProjectsQueryService.queryProjects`: `eq(organizationMembers.userId, managerId)` — join already present
- Added `managerId?: string` to `ProjectFilters` in `frontend/types/projects/projects.ts`

**Dead params resolution**
- `owner`: implemented (maps to `managerId`)
- `health`: not implementable — computed from `endDate`, `status`, and ticket progress at response time; no stored column to filter on
- `due`: not implementable — no coherent single filter across projects (`endDate`) and tickets (`dueDate`)
- `view`: not implemented — no backend concept; no wireframe for a view switcher on this page

**Migration**: none required; `(org_id, id)` indexes already existed on both `project_risks` and `project_releases`

### Frontend — completed

**New hooks**
- `useOrgRisks(filters?)` in `frontend/hooks/api/build/governance.ts` — gated on `useCanState("build:risks:view") !== "denied"`
- `useOrgReleases(filters?)` in `frontend/hooks/api/build/releases.ts` — gated on `useCanState("build:view") !== "denied"`

**New query keys** in `frontend/lib/query-keys/build-work.ts`
- `buildWorkQueryKeys.projects.risks.orgList(params?)` — `[..., "projects", "risks", "org"]`
- `buildWorkQueryKeys.projects.orgReleases(params?)` — `[..., "projects", "org-releases"]`

**New panel components** (all self-contained, FE-43 surface gating)
- `command-center-approvals-panel.tsx` — `ApprovalsPanel`: uses `useApprovalInbox()`, permission `build:approvals:view`, shows up to 8 pending items
- `command-center-agent-runs-panel.tsx` — `AgentRunsPanel`: uses `useAgentPulse(ORGANIZATION_BUILD_SCOPE)`, permission `build:approvals:view`, shows top AI signal with confidence and evidence
- `command-center-risks-panel.tsx` — `RisksPanel`: uses `useOrgRisks({ status: "open" })`, permission `build:risks:view`, shows up to 8 open risks
- `command-center-releases-panel.tsx` — `ReleasesPanel`: uses `useOrgReleases()`, permission `build:view`, shows up to 8 releases

**Page wiring** (`command-center-page.tsx`)
- Reads `owner` from URL and passes as `managerId` to `useProjects`
- Renders `ApprovalsPanel`, `AgentRunsPanel`, `RisksPanel`, `ReleasesPanel` in the panels grid after the existing panels (grid row 2: approvals col-span-2 + agent-runs col-span-3; grid row 3: risks col-span-3 + releases col-span-2)

### Tests — completed

**`command-center-page.test.tsx`** — 34 tests (29 pre-existing + 5 new)
- `owner` param passes `managerId` to `useProjects`
- `owner` absent → `managerId: undefined`
- All four new panels render in the ready state
- All four new panels are absent when user lacks `build:view` (paired negative)

**`command-center-panels.test.tsx`** — 24 new tests (6 per panel)
Each panel has paired negative + positive for:
- Denied: renders nothing when `useCanState` returns `"denied"`
- Granted: renders panel header when `useCanState` returns `"granted"`
- Loading: renders skeletons when `useCanState` returns `"loading"`
- Error: renders `ErrorState` on query failure
- Empty: renders `EmptyState` when data is empty list / null signal
- Populated: renders row content when data is present

**Total passing: 42 / 42**

## Approvals double-counting note

The `GET /build/approvals/inbox` endpoint filters `project_approvals` by `approverMembershipId` and `status IN ('pending', 'escalated')`. The `approvalEntityTypeEnum` does NOT include `"leave"`. The leave-approval double-counting issue documented in MEMORY.md (`Leave x2`) applies only to the notifications inbox (`/me/inbox`), not to this dedicated approvals endpoint. The `ApprovalsPanel` count is accurate.

## Box 3 status

Box 3 in `docs/build-module/10-command-center.md` was NOT ticked. It covers "every core field, action, overlay, query parameter, bulk action, shortcut, state, and permission" — which includes P1 items (saved views, bulk actions, full keyboard coverage, `health`/`due` filter implementation) that are outside this wave's scope.
