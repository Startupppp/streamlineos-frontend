# Build Module Route Audit — `app/(authenticated)/build/`

**Date:** 2026-07-31  
**Scope:** every `.tsx` file under `frontend/app/(authenticated)/build/` (176 files, 68 page.tsx)

---

## 1. Page Table

| Route Path | File (relative to `app/(authenticated)/build/`) | LOC | SC/CC | Purpose | Top Components | loading.tsx | error.tsx | not-found.tsx |
|---|---|---|---|---|---|---|---|---|
| `/build` | `page.tsx:1` | 1 | SC | Re-export of `./all/page` — **REDIRECT-ONLY** | — | ✗ | ✗ | ✗ |
| `/build/access` | `access/page.tsx:1` | 7 | SC | Module access gate page | `ModuleAccessPage` | ✗ | ✗ | ✗ |
| `/build/all` | `all/page.tsx:1` | 452 | CC | Project list (grid/list views, filters, pagination) | `PageWrapper`, `ProjectCard`, `ProjectTable`, `ProjectFilterBar`, `TablePagination`, `GroupingSidebar`, `NewProjectDialog` | ✓ | ✗ | ✗ |
| `/build/all-work` | `all-work/page.tsx:1` | 9 | SC | Cross-project work view | `AllWorkPage` | ✓ | ✓ | ✗ |
| `/build/approvals` | `approvals/page.tsx:1` | 10 | SC | Cross-project approvals inbox | `RequireModule`, `ApprovalsInboxPage` | ✓ | ✓ | ✗ |
| `/build/command-center` | `command-center/page.tsx:1` | 5 | SC | Command center dashboard | `CommandCenterPage` | ✓ | ✗ | ✗ |
| `/build/customers` | `customers/page.tsx:1` | 1 | SC | Re-export — **REDIRECT-ONLY** | `ProjectCustomersPage` | ✗ | ✗ | ✗ |
| `/build/drafts` | `drafts/page.tsx:1` | 5 | SC | Comment drafts | `CommentDraftsPage` | ✗ | ✗ | ✗ |
| `/build/goal` | `goal/page.tsx:1` | 366 | CC | Goals list (OKR) with create/edit sheet | `PageWrapper`, `StatCardGrid`, `EmptyState`, `ErrorState` | ✓ | ✗ | ✗ |
| `/build/goal/[goalId]` | `goal/[goalId]/page.tsx:1` | 378 | CC | Goal detail page | `PageWrapper`, `ErrorState`, `EmptyState` | ✗ | ✗ | ✗ |
| `/build/inbox` | `inbox/page.tsx:1` | 73 | CC | Notification inbox | `PageWrapper`, `InboxList`, `InboxPreviewPane` | ✗ | ✗ | ✗ |
| `/build/managed-products` | `managed-products/page.tsx:1` | 7 | SC | Managed products list | `ManagedProductsPage` | ✓ | ✓ | ✗ |
| `/build/managed-products/[managedProductId]` | `managed-products/[managedProductId]/page.tsx:1` | 15 | SC | Managed product detail | `ManagedProductDetailPage` | ✓ | ✓ | ✗ |
| `/build/members` | `members/page.tsx:1` | 15 | SC | Project members list | `MembersPage`, `DataTableSkeleton` | ✗ | ✓ | ✗ |
| `/build/my-work` | `my-work/page.tsx:1` | 10 | SC | My assigned work | `RequireModule`, `MyWorkPage` | ✓ | ✓ | ✗ |
| `/build/pm-workspaces` | `pm-workspaces/page.tsx:1` | 7 | SC | PM workspaces | `PmWorkspacesPage` | ✓ | ✓ | ✗ |
| `/build/portal` | `portal/page.tsx:1` | 7 | CC | Client portal list | `PortalListPage` | ✓ | ✓ | ✗ |
| `/build/portal/[projectId]` | `portal/[projectId]/page.tsx:1` | 13 | CC | Client portal project dashboard | `PortalDashboardPage` | ✓ | ✗ | ✗ |
| `/build/portfolios` | `portfolios/page.tsx:1` | 5 | SC | Portfolio list | `PortfoliosPage` | ✓ | ✓ | ✗ |
| `/build/portfolios/[portfolioId]` | `portfolios/[portfolioId]/page.tsx:1` | 10 | SC | Portfolio detail | `PortfolioDetailPage` | ✓ | ✗ | ✗ |
| `/build/roadmap` | `roadmap/page.tsx:1` | 151 | CC | Roadmap / Feedback / Changelog tabs | `PageWrapper`, `RequireModule`, `RoadmapTab`, `FeedbackTab`, `ChangelogTab` | ✓ | ✗ | ✗ |
| `/build/settings/integrations` | `settings/integrations/page.tsx:1` | 8 | CC | Git + agent token integration settings | `ProjectsGitIntegrationSettings`, `AgentTokensSection` | ✓ | ✗ | ✗ |
| `/build/teams` | `teams/page.tsx:1` | 5 | SC | Teams list | `TeamsListPage` | ✓ | ✓ | ✗ |
| `/build/teams/[teamId]` | `teams/[teamId]/page.tsx:1` | 10 | SC | Team detail | `TeamHomePage` | ✓ | ✓ | ✗ |
| `/build/templates` | `templates/page.tsx:1` | 177 | CC | Project template library | `PageWrapper`, `RequireModule`, `TemplateCard`, `CreateTemplateSheet` | ✓ | ✗ | ✗ |
| `/build/[projectId]` | `[projectId]/page.tsx:1` | **707** | CC | Main project board — kanban/list/table/calendar/gantt/workload multi-view | `PageWrapper`, `KanbanBoard`, `ListView`, `TableView`, `CalendarView`, `GanttView`, `WorkloadView`, `ProjectViewsToolbar`, `BulkActionBar` | ✓ | ✓ | ✗ |
| `/build/[projectId]/ai` | `[projectId]/ai/page.tsx:1` | 13 | CC | AI assistant | `AiAssistantPage` | ✓ | ✓ | ✗ |
| `/build/[projectId]/analytics` | `[projectId]/analytics/page.tsx:1` | 193 | CC | Project analytics charts | `PageWrapper`, chart components | ✓ | ✓ | ✗ |
| `/build/[projectId]/approvals` | `[projectId]/approvals/page.tsx:1` | 13 | CC | Project approvals | `ProjectApprovalsPage` | ✓ | ✓ | ✗ |
| `/build/[projectId]/automations` | `[projectId]/automations/page.tsx:1` | **686** | CC | Automation rules (full form inline) | `PageWrapper`, `AutomationCard`, `Sheet` | ✓ | ✗ | ✗ |
| `/build/[projectId]/backlog` | `[projectId]/backlog/page.tsx:1` | 281 | CC | Backlog table with bulk actions | `PageWrapper`, `DataTable`, `BulkActionBar` | ✓ | ✓ | ✗ |
| `/build/[projectId]/budget` | `[projectId]/budget/page.tsx:1` | 285 | CC | Project budget tracking | `PageWrapper`, `StatCardGrid`, `DataTable` | ✓ | ✗ | ✗ |
| `/build/[projectId]/bugs` | `[projectId]/bugs/page.tsx:1` | 13 | CC | Bug tracker | `BugsPage` | ✓ | ✓ | ✗ |
| `/build/[projectId]/change-requests` | `[projectId]/change-requests/page.tsx:1` | 13 | CC | Change requests | `ChangeRequestsPage` | ✓ | ✓ | ✗ |
| `/build/[projectId]/chat` | `[projectId]/chat/page.tsx:1` | 138 | CC | Project chat channel | `PageWrapper`, `ChatAblyProvider`, `MessagePanel` | ✓ | ✓ | ✗ |
| `/build/[projectId]/client-portal` | `[projectId]/client-portal/page.tsx:1` | 13 | CC | Client visibility config | `ClientVisibilityPage` | ✓ | ✗ | ✗ |
| `/build/[projectId]/cycles` | `[projectId]/cycles/page.tsx:1` | 418 | CC | Cycle list with inline create sheet | `PageWrapper`, `EmptyState`, `Sheet` | ✓ | ✓ | ✗ |
| `/build/[projectId]/cycles/[cycleId]` | `[projectId]/cycles/[cycleId]/page.tsx:1` | 213 | CC | Cycle detail board/list | `PageWrapper`, `KanbanBoard`, `ListView`, `ViewSwitcher` | ✓ | ✗ | ✓ |
| `/build/[projectId]/decisions` | `[projectId]/decisions/page.tsx:1` | 13 | CC | Decision log | `DecisionsPage` | ✓ | ✓ | ✗ |
| `/build/[projectId]/epics` | `[projectId]/epics/page.tsx:1` | 193 | CC | Epics + stories | `PageWrapper`, `StatCardGrid`, `EpicCard`, `EpicStoryRow` | ✓ | ✓ | ✗ |
| `/build/[projectId]/feedbucket` | `[projectId]/feedbucket/page.tsx:1` | 13 | CC | Feedback submissions list | `ProjectFeedbucketPage` | ✓ | ✗ | ✗ |
| `/build/[projectId]/feedbucket/[submissionId]` | `[projectId]/feedbucket/[submissionId]/page.tsx:1` | 26 | CC | Feedback submission detail | `DashboardGate`, `PageWrapper`, `FeedbucketSubmissionDetail` | ✓ | ✗ | ✗ |
| `/build/[projectId]/forms` | `[projectId]/forms/page.tsx:1` | 13 | CC | Project forms list | `FormsListPage` | ✓ | ✓ | ✗ |
| `/build/[projectId]/forms/[formId]` | `[projectId]/forms/[formId]/page.tsx:1` | 18 | CC | Form detail/builder | `FormDetailPage` | ✓ | ✓ | ✗ |
| `/build/[projectId]/incidents` | `[projectId]/incidents/page.tsx:1` | 13 | CC | Incidents list | `IncidentsPage` | ✓ | ✓ | ✗ |
| `/build/[projectId]/incidents/[incidentId]` | `[projectId]/incidents/[incidentId]/page.tsx:1` | 18 | CC | Incident detail | `IncidentDetailPage` | ✓ | ✗ | ✗ |
| `/build/[projectId]/intake` | `[projectId]/intake/page.tsx:1` | 418 | CC | Intake request triage (create/accept/decline sheets inline) | `PageWrapper`, `IntakeItemCard`, `Tabs` | ✓ | ✓ | ✗ |
| `/build/[projectId]/meetings` | `[projectId]/meetings/page.tsx:1` | 13 | CC | Meetings list | `MeetingsListPage` | ✓ | ✓ | ✗ |
| `/build/[projectId]/meetings/[meetingId]` | `[projectId]/meetings/[meetingId]/page.tsx:1` | 18 | CC | Meeting detail | `MeetingDetailPage` | ✓ | ✓ | ✗ |
| `/build/[projectId]/milestones` | `[projectId]/milestones/page.tsx:1` | 188 | CC | Milestones with stat cards | `PageWrapper`, `StatCardGrid`, `MilestoneCard`, `MilestoneUpsertSheet` | ✓ | ✓ | ✗ |
| `/build/[projectId]/modules` | `[projectId]/modules/page.tsx:1` | 409 | CC | Project modules (create inline in page) | `PageWrapper`, `StatCardGrid`, `ModuleCard`, `Sheet` | ✓ | ✓ | ✗ |
| `/build/[projectId]/my-tickets` | `[projectId]/my-tickets/page.tsx:1` | 11 | CC | My tickets in project | `MyTicketsPage` | ✓ | ✓ | ✗ |
| `/build/[projectId]/qa` | `[projectId]/qa/page.tsx:1` | 13 | CC | QA test cases | `QaPage` | ✓ | ✓ | ✗ |
| `/build/[projectId]/qa/runs/[runId]` | `[projectId]/qa/runs/[runId]/page.tsx:1` | 18 | CC | QA run execution | `RunExecutionPage` | ✓ | ✗ | ✗ |
| `/build/[projectId]/releases` | `[projectId]/releases/page.tsx:1` | 13 | CC | Release list | `ReleasesPage` | ✓ | ✓ | ✗ |
| `/build/[projectId]/reports` | `[projectId]/reports/page.tsx:1` | 48 | CC | Agile reports (velocity/burnup/CFD/cycle time) | `PageWrapper`, `VelocitySection`, `BurnupSection`, `CfdSection`, `CriticalPathSection` | ✓ | ✗ | ✗ |
| `/build/[projectId]/risks` | `[projectId]/risks/page.tsx:1` | 13 | CC | Risk register | `RisksPage` | ✓ | ✓ | ✗ |
| `/build/[projectId]/settings` | `[projectId]/settings/page.tsx:1` | 394 | CC | Project settings (general, labels, statuses, custom fields, teams, danger) | `PageWrapper`, `ProjectInfoSection`, `LabelsSettings`, `StatusesSettings`, `CustomFieldsSettings` | ✓ | ✓ | ✗ |
| `/build/[projectId]/sprints` | `[projectId]/sprints/page.tsx:1` | 326 | CC | Sprint management with velocity chart | `PageWrapper`, `SprintCard`, `SprintPlanningPanel`, `VelocityChart` | ✓ | ✓ | ✗ |
| `/build/[projectId]/tickets/[ticketKey]` | `[projectId]/tickets/[ticketKey]/page.tsx:1` | 22 | CC | Ticket detail | `TicketDetailPage` | ✗ | ✓ | ✗ |
| `/build/[projectId]/timeline` | `[projectId]/timeline/page.tsx:1` | 107 | CC | Gantt timeline view | `PageWrapper`, `GanttView` | ✓ | ✓ | ✗ |
| `/build/[projectId]/triage` | `[projectId]/triage/page.tsx:1` | 18 | CC | Ticket triage queue | `TriagePage` | ✗ | ✗ | ✗ |
| `/build/[projectId]/views` | `[projectId]/views/page.tsx:1` | 174 | CC | Saved views list | `PageWrapper`, `ViewCard`, `CreateViewSheet` | ✓ | ✓ | ✗ |
| `/build/[projectId]/webhooks` | `[projectId]/webhooks/page.tsx:1` | 496 | CC | Webhook config with delivery log | `PageWrapper`, `WebhookCard`, `Sheet` | ✓ | ✗ | ✗ |
| `/build/[projectId]/whiteboard` | `[projectId]/whiteboard/page.tsx:1` | 461 | CC | Excalidraw whiteboard | `PageWrapper`, `WhiteboardToolbar`, dynamic `Excalidraw` | ✓ | ✗ | ✗ |
| `/build/[projectId]/wiki` | `[projectId]/wiki/page.tsx:1` | 18 | SC | Wiki home (server component) | `RequireModule`, `WikiHomePage` | ✓ | ✗ | ✗ |
| `/build/[projectId]/wiki/[pageId]` | `[projectId]/wiki/[pageId]/page.tsx:1` | 23 | SC | Wiki document (server component) | `RequireModule`, `ProjectWikiPageDocument` | ✓ | ✗ | ✗ |
| `/build/[projectId]/workflow` | `[projectId]/workflow/page.tsx:1` | 13 | CC | Workflow editor | `WorkflowPage` | ✓ | ✓ | ✗ |
| `/build/[projectId]/workload` | `[projectId]/workload/page.tsx:1` | 10 | SC | **REDIRECT-ONLY** → `/build/${projectId}?view=workload` | — | ✓ | ✗ | ✗ |

**Legend:** SC = Server Component (no `"use client"`), CC = Client Component (`"use client"` present)

---

## 2. Redirect-Only Pages

The user explicitly wants these gone.

### `build/page.tsx:1`
```tsx
export { default } from "./all/page";
```
Target: `/build/all` (re-export, acts as a silent redirect to the all-projects list page).

### `build/[projectId]/workload/page.tsx:7-10`
```tsx
export default async function WorkloadRedirectPage({ params }: PageProps) {
  const { projectId } = await params;
  redirect(`/build/${projectId}?view=workload`);
}
```
Target: `/build/${projectId}?view=workload` (workload is a view on the main project page).  
Note: Has a full `loading.tsx` skeleton file that is never reached.

### `build/customers/page.tsx:1`
```tsx
export { ProjectCustomersPage as default } from "@/features/build/customers/project-customers-page";
```
This is a 1-line direct re-export of a feature component. No route-level setup, no PageWrapper, no params — the feature component is the whole page. This is a thin wrapper that provides no routing value; the feature component could be rendered from any route. Referenced in `sidebar-nav-items.ts`.

---

## 3. LOC Cap Violations

Project cap: **500 lines hard / 300 lines target** (CLAUDE.md §9).

### Hard violations (>500 lines)

| File | LOC | Notes |
|---|---|---|
| `[projectId]/page.tsx` | **707** | Main project board — huge multi-view component; should be split into view-specific feature components. Contains 400+ lines of filter/sort logic that belongs in a hook. |
| `[projectId]/automations/page.tsx` | **686** | Full automation form (`AutomationCard`, `RemoveButton`, inline Zod schemas) defined in the page file. These sub-components should be extracted to `features/build/automations/`. |

### Review zone (>300 lines, under 500)

| File | LOC |
|---|---|
| `[projectId]/webhooks/page.tsx` | 496 |
| `[projectId]/whiteboard/page.tsx` | 461 |
| `all/page.tsx` | 452 |
| `[projectId]/cycles/page.tsx` | 418 |
| `[projectId]/intake/page.tsx` | 418 |
| `[projectId]/modules/page.tsx` | 409 |
| `[projectId]/settings/page.tsx` | 394 |
| `goal/[goalId]/page.tsx` | 378 |
| `goal/page.tsx` | 366 |
| `[projectId]/sprints/page.tsx` | 326 |

Pattern: automations, webhooks, cycles, intake, and modules all define sub-components (AutomationCard, WebhookCard, CycleCard, etc.) inline in the page file. These should live in `features/build/<feature>/` co-located components.

---

## 4. `'use client'` Placement

**No layout.tsx file in this subtree is marked `'use client'`.**

- `[projectId]/layout.tsx:17` — Server Component. Fetches project via `serverApiClient` server-to-server. Correct.
- `settings/layout.tsx:1` — Server Component. Pure passthrough (renders `{children}`). Could be deleted — it adds no value.

All `"use client"` directives are on leaf page.tsx files. No layout forces a whole subtree client-side. No finding here.

Server Component pages (no `"use client"`): `access/page.tsx`, `all-work/page.tsx` (implicit), `managed-products/page.tsx`, `managed-products/[managedProductId]/page.tsx`, `pm-workspaces/page.tsx`, `wiki/page.tsx`, `wiki/[pageId]/page.tsx`.

---

## 5. State Coverage Per Route

### Loading state issues

| Route | Issue |
|---|---|
| `[projectId]/chat/page.tsx:44` | Returns `null` on loading — **no skeleton**. `if (isLoading) { return null; }` Actual loading state is in `chat/loading.tsx` (Suspense boundary), but the page file itself silently renders nothing on explicit `isLoading`. If Suspense fires, the loading.tsx skeleton shows. If the component mounts while data is loading (SWR revalidate), it shows nothing. |
| `[projectId]/triage/page.tsx` | No loading.tsx, no error.tsx. Fully delegates to `TriagePage` which may or may not handle all states. [UNVERIFIED — see feature component] |
| `[projectId]/tickets/[ticketKey]/page.tsx` | No loading.tsx. Has error.tsx. Delegates to `TicketDetailPage`. |
| `[projectId]/intake/page.tsx` | Has loading state. **Missing error state** — no `isError` branch at page level. If `useIntakeRequests` fails, the page renders as if empty. |

### Error state missing

The following routes have no `error.tsx` segment boundary (the root `build/error.tsx` catches, but per-route granularity is lost):

**Under `[projectId]/`:**
`automations`, `budget`, `client-portal`, `cycles/[cycleId]`, `feedbucket`, `feedbucket/[submissionId]`, `incidents/[incidentId]`, `qa/runs/[runId]`, `reports`, `triage`, `webhooks`, `whiteboard`, `wiki`, `wiki/[pageId]`, `workload` (redirect)

**Top-level build:**
`all`, `command-center`, `customers`, `drafts`, `goal`, `goal/[goalId]`, `inbox`, `portal/[projectId]`, `portfolios/[portfolioId]`, `roadmap`, `settings/integrations`, `templates`, `access`

### Empty state coverage

All self-contained pages (automations, cycles, webhooks, milestones, sprints, views, etc.) correctly implement empty states using `EmptyState` component with illustrations. Thin relay pages delegate to feature components.

---

## 6. Duplicate / Near-Identical Pages

**Thin relay pattern (13 lines, same structure):** The following 15 pages are structurally identical — each imports one named feature component, calls `use(params)`, parses `projectId`, and renders the feature:

```
[projectId]/ai/page.tsx       → AiAssistantPage
[projectId]/approvals/page.tsx → ProjectApprovalsPage
[projectId]/bugs/page.tsx     → BugsPage
[projectId]/change-requests/page.tsx → ChangeRequestsPage
[projectId]/client-portal/page.tsx → ClientVisibilityPage
[projectId]/decisions/page.tsx → DecisionsPage
[projectId]/feedbucket/page.tsx → ProjectFeedbucketPage
[projectId]/forms/page.tsx    → FormsListPage
[projectId]/incidents/page.tsx → IncidentsPage
[projectId]/meetings/page.tsx  → MeetingsListPage
[projectId]/qa/page.tsx       → QaPage
[projectId]/releases/page.tsx  → ReleasesPage
[projectId]/risks/page.tsx    → RisksPage
[projectId]/workflow/page.tsx  → WorkflowPage
[projectId]/my-tickets/page.tsx → MyTicketsPage (11 lines, slightly different)
```

These are intentionally thin. The pattern is consistent and correct — each serves a different feature. Not a violation. These pages exist purely to satisfy Next.js App Router file conventions; the real UI is in the feature component.

No two routes render the same feature or page content with substantive duplication.

---

## 7. Route Params

All dynamic segments use descriptive, specific names. **Zero violations.**

| Segment | Name | Status |
|---|---|---|
| `[projectId]` | ✅ Descriptive |
| `[cycleId]` | ✅ Descriptive |
| `[submissionId]` | ✅ Descriptive |
| `[formId]` | ✅ Descriptive |
| `[incidentId]` | ✅ Descriptive |
| `[meetingId]` | ✅ Descriptive |
| `[runId]` | ✅ Descriptive |
| `[ticketKey]` | ✅ Descriptive (uses ticket key string, not numeric id) |
| `[pageId]` | ✅ Descriptive |
| `[goalId]` | ✅ Descriptive |
| `[managedProductId]` | ✅ Descriptive |
| `[portfolioId]` | ✅ Descriptive |
| `[teamId]` | ✅ Descriptive |

---

## 8. Dead Routes (Reference Count Survey)

Grepped the full `frontend/` tree (excluding `.next/`) for each candidate route string.

| Route | Source Files (excluding .next + own page) | Verdict |
|---|---|---|
| `/build/customers` | `sidebar-nav-items.ts`, `project-customers-page.tsx`, `customers.ts` hook | Live — sidebar nav entry |
| `/build/drafts` | `sidebar-nav-items.ts`, `mobile-module-nav-items.test.ts` | Live — sidebar nav entry |
| `/build/access` | `sidebar-nav-items.ts` | Live — sidebar nav entry |
| `/build/command-center` | `command-center-actions.tsx`, `command-center-jump-links.tsx`, `command-center-page.tsx` | Live — referenced in feature |
| `/build/inbox` | `inbox-list.tsx`, `inbox-preview-pane.tsx`, `sidebar-nav-items.ts` | Live — sidebar nav |

No candidate routes found with zero external references. All routes appear reachable.

---

## 9. PageWrapper Usage

**Rule:** every authenticated page must use `PageWrapper` (`components/ui/page-wrapper.tsx`). No `min-h-screen` or page-level gradients inside the shell.

### Pages directly using PageWrapper

All self-contained pages (routes with 48+ LOC) use `PageWrapper` directly: `[projectId]/page.tsx`, `analytics`, `backlog`, `budget`, `cycles`, `cycles/[cycleId]`, `epics`, `intake`, `milestones`, `modules`, `reports`, `settings`, `sprints`, `timeline`, `views`, `webhooks`, `whiteboard`, `chat`, `all/page.tsx`, `goal/page.tsx`, `goal/[goalId]/page.tsx`, `inbox/page.tsx`, `roadmap/page.tsx`, `templates/page.tsx`, `feedbucket/[submissionId]/page.tsx`.

### Thin relay pages (PageWrapper in feature component)

The 15 thin relay pages (`bugs`, `ai`, `change-requests`, etc.) delegate entirely to feature components. `PageWrapper` is expected inside those components. Verified by proxy: their `loading.tsx` siblings use `PageWrapper`, confirming the expected chrome. Feature component internals not audited (out of scope).

### No `min-h-screen` found in any build route file

Scanned all page.tsx files — no `min-h-screen` or page-level `bg-gradient` in authenticated shell pages.

### Orphaned route directory — `[projectId]/pages/`

`app/(authenticated)/build/[projectId]/pages/` contains `loading.tsx` and `error.tsx` but **has no `page.tsx`**. This directory appears to be a vestige of a removed or planned "Pages" feature. The loading and error files are dead code — they are never reached because no route segment exists.

### `wiki/loading.tsx` and `wiki/[pageId]/loading.tsx` — no PageWrapper

```
app/(authenticated)/build/[projectId]/wiki/loading.tsx
app/(authenticated)/build/[projectId]/wiki/[pageId]/loading.tsx
```

Both wiki loading files render raw `<div className="p-6 space-y-4">` skeleton divs without wrapping in `PageWrapper`. All other loading.tsx files in the build module use PageWrapper. This is a minor inconsistency.

### `settings/layout.tsx:1-7` — passthrough layout, no value

```tsx
export default function ProjectsSettingsLayout({ children }) {
  return <>{children}</>;
}
```
This layout adds no chrome, no auth, nothing. It exists as a no-op. Candidate for deletion.

---

## 10. Consolidated Findings (Severity Order)

| # | Severity | Finding | File(s) |
|---|---|---|---|
| 1 | HIGH | LOC hard violation: `[projectId]/page.tsx` is 707 lines — 200+ over cap. Sub-components (filter logic, bulk action handlers) should be extracted. | `[projectId]/page.tsx` |
| 2 | HIGH | LOC hard violation: `automations/page.tsx` is 686 lines. `AutomationCard`, `RemoveButton`, `NewAutomationButton`, inline Zod schemas all live in the route file instead of `features/build/automations/`. | `[projectId]/automations/page.tsx` |
| 3 | HIGH | Orphaned route directory `[projectId]/pages/` has `loading.tsx` + `error.tsx` but **no `page.tsx`** — unreachable files, signals an incomplete or abandoned feature. | `[projectId]/pages/loading.tsx`, `[projectId]/pages/error.tsx` |
| 4 | HIGH | Redirect-only pages the user wants removed: `build/page.tsx` (re-export) and `[projectId]/workload/page.tsx` (redirect to `?view=workload`). Workload has a full loading skeleton that is never used. | `build/page.tsx`, `[projectId]/workload/page.tsx` |
| 5 | MEDIUM | `intake/page.tsx` has no error state — if `useIntakeRequests` fails, the page silently renders as empty with no retry path. | `[projectId]/intake/page.tsx:69` |
| 6 | MEDIUM | `chat/page.tsx:44` returns `null` on loading. The loading.tsx Suspense boundary covers the initial mount, but any subsequent `isLoading=true` (e.g., revalidation) renders nothing. Should use a skeleton. | `[projectId]/chat/page.tsx:44` |
| 7 | MEDIUM | `[projectId]/triage/page.tsx` has no `loading.tsx` and no `error.tsx`. All state handling deferred to feature component with no route-level guarantee. | `[projectId]/triage/page.tsx` |
| 8 | MEDIUM | 23 routes missing segment-level `error.tsx` boundaries (listed in §5). Errors in these routes fall through to the root `build/error.tsx` with a generic message rather than a contextual one. | See §5 error table |
| 9 | LOW | `customers/page.tsx` is a 1-line re-export with no route setup; no loading state, no params handling, no error boundary. | `build/customers/page.tsx:1` |
| 10 | LOW | `settings/layout.tsx` is a no-op passthrough (`return <>{children}</>`) — dead file candidate. | `build/settings/layout.tsx` |
| 11 | LOW | 7 review-zone files (300–500 LOC) with inline sub-components that should be extracted to features: `webhooks`, `whiteboard`, `all`, `cycles`, `intake`, `modules`, `settings`. | See §3 table |
| 12 | INFO | `wiki/loading.tsx` and `wiki/[pageId]/loading.tsx` don't use `PageWrapper` — raw `<div>` skeletons inconsistent with the rest of the module. | `[projectId]/wiki/loading.tsx`, `[projectId]/wiki/[pageId]/loading.tsx` |
| 13 | INFO | `[projectId]/tickets/[ticketKey]/page.tsx` has no `loading.tsx` (delegates immediately to `TicketDetailPage`). | `[projectId]/tickets/[ticketKey]/page.tsx` |
