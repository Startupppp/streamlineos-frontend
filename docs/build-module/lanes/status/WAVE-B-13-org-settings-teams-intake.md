# Wave-B-13 status: org settings access, integrations, teams detail, public intake

## Spec → page mapping

| Spec | Route | Feature file(s) | Notes |
|---|---|---|---|
| `10-settings-access.md` | `/build/settings/access` | `app/(authenticated)/build/settings/access/page.tsx` renders `MembersPage` + `ModuleAccessPage`. My owned feature file `project-settings-access-page.tsx` is PROJECT-level (takes `projectId`), NOT the org-level page this spec describes. |
| `10-settings-integrations.md` | `/build/settings/integrations` | `app/(authenticated)/build/settings/integrations/page.tsx` renders `ProjectsGitIntegrationSettings` + `AgentTokensSection`. Both have existing tests. |
| `10-teams-team.md` | `/build/teams/[teamId]` | `features/build/teams/team-home-page.tsx` — comprehensive implementation. No test file existed. |
| `10-public-intake.md` | `/intake/[projectId]` | `features/build/intake/**` (READ-ONLY). Spec already contains a detailed BLOCKED note at C2. |

---

## Files changed

| File | Change |
|---|---|
| `frontend/features/build/settings/project-settings-access-page.tsx` | Bug fix: wired `isLoading`, `isError`, `error`, `refetch` from `useProjectMembers` into `usePageState`; added `onRetry`; fixed `itemCount` to use `members.data.length` |
| `frontend/features/build/settings/project-settings-access-page.test.tsx` | Rewrote: updated mocks to object-form `PageStateResolution`; added 13 tests covering `usePageState` arg-forwarding, loading, error, denied, ready, and keyboard-shortcut wiring |
| `frontend/features/build/teams/team-home-page.test.tsx` | NEW: 31 tests covering loading, denied, error, empty, ready states; permission-gated actions; keyboard-shortcut wiring; pagination; empty-member list |

---

## Box-by-box verdicts

### `10-settings-access.md`

| Box | Verdict |
|---|---|
| C1 (route/disposition) | Pre-ticked |
| C2 (job/metric) | Pre-ticked |
| **C3 (fields/actions/states/permissions)** | **OPEN — row table below** |
| C4 (bounded lists) | Pre-ticked |
| C5 (contract tests) | Pre-ticked |
| C6 (keyboard/a11y) | Orchestrator-only |
| C7 (production evidence) | Orchestrator-only |

**C3 row-by-row for `10-settings-access.md`:**

The spec route (`/build/settings/access`) renders `MembersPage` + `ModuleAccessPage`. The project-level component I own (`ProjectSettingsAccessPage`) is a separate concern. Analysis of the org-level page:

| Row | Implemented? | Tested? | Notes |
|---|---|---|---|
| Core fields: member name, role, added date | Yes (`MembersPage`) | Partially — `members-page.test.tsx` covers access states only (loading/denied); no populated-state test |
| Core fields: general/workflow/views/fields/iterations/automations/integrations/portal/agents/retention | Not on this page — these are section headings belonging to a general settings nav page, not the access-specific page | N/A |
| URL param `search` | Yes (`useBuildListFilters` with `searchParam:"search"`) | Not tested in route context |
| URL param `section` | NOT implemented | — |
| Keyboard `/` search focus | Yes (via `BuildListToolbar`) | Not tested |
| Keyboard `c`/`j-k`/`Enter`/`e`/`?` | NOT implemented in `MembersPage` | — |
| States: loading | Yes (DataTableSkeleton Suspense fallback) | Partially — only access-loading tested |
| States: empty | Yes (in `MembersPage`) | Not explicitly tested |
| States: error | Yes (in `MembersPage`) | Not tested |
| States: denied | Yes (via `usePageState` + `PageState`) | Tested |
| States: offline | Not explicitly | — |
| Permissions: org owner, build owner/admin, build member, guest | Backend-authoritative + `useCan("build:members:manage")` | Not fully tested |

**Decision: C3 UNTICKED.** Gaps: `section` URL param not implemented; keyboard shortcuts (`c`, `j/k`, `e`, `?`) not in `MembersPage`; error/empty/populated states not tested at the route level. The org-level page tests (`members-page.test.tsx`) cover only access-loading/denied. Filed as Request 1 below.

**Note on `project-settings-access-page.tsx`:** This is project-level (not the spec page). Bug fixed: `isLoading`/`isError`/`error` were hardcoded to false/undefined; now properly forwarded from `useProjectMembers`. Tests now pass for all states.

---

### `10-settings-integrations.md`

| Box | Verdict |
|---|---|
| C1 (route/disposition) | Pre-ticked |
| C2 (job/metric) | Pre-ticked |
| **C3 (fields/actions/states/permissions)** | **OPEN — row table below** |
| C4 (bounded lists) | Pre-ticked |
| C5 (contract tests) | Pre-ticked |
| C6 (keyboard/a11y) | Orchestrator-only |
| C7 (production evidence) | Orchestrator-only |

**C3 row-by-row for `10-settings-integrations.md`:**

| Row | Implemented? | Tested? | Notes |
|---|---|---|---|
| Core fields: Git provider, repo URL, display name | Yes (`ProjectsGitIntegrationSettings`) | Yes (`git-integration-settings.test.tsx`) |
| Agent tokens: name, scopes, last-used, expiry | Yes (`AgentTokensSection`) | Yes (`agent-tokens-section.test.tsx`) |
| Create connection action | Yes (dialog) | Contract-tested (schema tests) |
| Toggle connection (active/paused) | Yes | Not directly tested in the test file |
| Delete connection (ConfirmDialog destructive) | Yes | Dialog invocation not fully tested |
| Create agent token | Yes | Tested (`agent-token-create-dialog.test.tsx`) |
| Revoke agent token | Yes | Tested (`agent-tokens-section.test.tsx`) |
| URL param `section` (to deep-link to connections vs agent tab) | NOT implemented — tab state uses `useState`, not URL | — |
| URL param `search` | NOT applicable to this page | N/A |
| Keyboard shortcuts | NOT implemented (`ProjectsGitIntegrationSettings` has no `useBuildListKeyboard`) | — |
| States: loading | Yes (Skeleton rows) | Yes (`BLD-X-FE-SETTINGS-INT-010`) |
| States: error | Yes (ErrorState) | Yes (`BLD-X-FE-SETTINGS-INT-011`) |
| States: empty | Yes (EmptyState) | Yes (`BLD-X-FE-SETTINGS-INT-012`) |
| States: populated | Yes (ConnectionRow list) | Yes (`BLD-X-FE-SETTINGS-INT-013`) |
| States: denied/module-disabled | Yes (`RequireModule` + `enforceRouteAccess`) | NOT tested |
| Secret redaction (webhookSecret never on read) | Yes | Yes (`BLD-X-FE-SETTINGS-INT-014`) |
| Permissions | `RequireModule("build")` + `enforceRouteAccess` | Not tested via `RequireModule` |

**Decision: C3 UNTICKED.** Gaps: `section` URL param not implemented (tab state is in-memory); keyboard shortcuts absent; `RequireModule` denied/module-disabled behavior not tested. Filed as Request 2 below.

---

### `10-teams-team.md`

| Box | Verdict |
|---|---|
| C1 (route/disposition) | Pre-ticked |
| C2 (job/metric) | Pre-ticked |
| **C3 (fields/actions/states/permissions)** | **OPEN — row table below** |
| C4 (bounded lists) | Pre-ticked |
| C5 (contract tests) | Pre-ticked |
| C6 (keyboard/a11y) | Orchestrator-only |
| C7 (production evidence) | Orchestrator-only |

**C3 row-by-row for `10-teams-team.md`:**

| Row | Implemented? | Tested? | Notes |
|---|---|---|---|
| Core field: name | Yes (page title) | Yes (BLD-X-FE-TEAMS-DETAIL-005) |
| Core field: lead | NOT in `ProjectTeamDetail` — no `lead` field in data model | — |
| Core field: members | Yes (member list with pagination) | Yes (multiple tests) |
| Core field: projects | Yes (`TeamProjectsSection`) | Yes |
| Core field: capacity | NOT in data model | — |
| Edit team action (TeamFormSheet) | Yes | Yes (canManage gating tested) |
| Delete team action (ConfirmDialog destructive) | Yes | Yes (dialog shows when open) |
| Add member (MemberPicker + role select) | Yes | Yes (visibility gated on canManage) |
| Remove member (XIcon button) | Yes | Yes (shown per member) |
| Change member role (Select) | Yes | Yes (Select vs badge for canManage) |
| URL param `leadId` | NOT implemented — `useTeamMembers` does not accept leadId | — |
| URL param `memberId` | NOT implemented | — |
| URL param `q` (search) | NOT implemented — no search input on team detail | — |
| URL param `cursor` | Partially — `useCursorPager` is in-memory only, not URL-backed | Partially |
| Keyboard shortcuts (useBuildListKeyboard) | Yes | Yes (all wiring assertions) |
| States: loading (DetailSkeleton) | Yes | Yes (BLD-X-FE-TEAMS-DETAIL-001) |
| States: denied | Yes (PageState) | Yes (BLD-X-FE-TEAMS-DETAIL-002) |
| States: error | Yes (PageState) | Yes (BLD-X-FE-TEAMS-DETAIL-003) |
| States: empty (team not found) | Yes (EmptyState) | Yes (BLD-X-FE-TEAMS-DETAIL-004) |
| States: empty members | Yes (EmptyState within panel) | Yes (BLD-X-FE-TEAMS-DETAIL-009) |
| Permissions: build:teams:view | Yes (usePageState) | Yes |
| Permissions: build:teams:manage | Yes (useCan gating) | Yes |
| Member list accessible role+aria-label (PmPanel) | Yes (PmPanel forwards role/aria-label) | Yes |

**Decision: C3 UNTICKED.** Gaps: `lead` and `capacity` core fields not in data model (need backend changes); `leadId`, `memberId`, `q` URL params not implemented (`useTeamMembers` hook does not support search/filter); cursor not URL-backed. All IMPLEMENTED criteria are now tested with 31 passing tests. Filed as Request 3 below.

**Team home gallery note:** My changes do NOT modify `team-home-page.tsx` — tests only. No change to what the page renders. The Wave-A gallery assertions (`[data-case-frame="team-members-keyboard"]` and `[data-case-frame="team-detail-loading"]`) are unaffected.

---

### `10-public-intake.md`

| Box | Verdict |
|---|---|
| C1 (route/disposition) | Pre-ticked |
| **C2 (job/metric without oracle)** | **OPEN — filed as Request 4 (proposal only)** |
| C3 (states tested) | Pre-ticked |
| C4 (server enforcement) | Pre-ticked |
| C5 (contract tests) | Pre-ticked |
| C6 (keyboard/a11y) | Orchestrator-only |

The spec file already contains the BLOCKED note at C2 (lines 96–100). My deliverable is the written proposal in the requests file. No code changes; `features/build/intake/**` is read-only this round.

---

## Test runs (scoped)

| Suite | Tests | Result |
|---|---|---|
| `features/build/settings/project-settings-access-page.test.tsx` | 13 | PASS |
| `features/build/teams/team-home-page.test.tsx` | 31 | PASS |
| `features/build/settings/git-integration-settings.test.tsx` | 14 | PASS (pre-existing) |
| `features/build/settings/agent-tokens-section.test.tsx` | 12 | PASS (pre-existing) |
| `features/build/teams/team-projects-section.test.tsx` | 2 | PASS (pre-existing) |
| `features/build/teams/teams-list-page.test.tsx` | 20 | PASS (pre-existing) |

**Public intake box:** Filed as proposal in requests file. No code probe; defect is established by reading the code. Box stays UNTICKED.
