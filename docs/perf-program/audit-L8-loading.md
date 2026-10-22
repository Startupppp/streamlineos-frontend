# Audit L8 — Loading State Coverage (`loading.tsx`)

**Scope:** every `page.tsx` under `frontend/app/(authenticated)/{hr,me,build,dashboard,calendar,chat,inbox,mail,knowledge}/**`
**Rules:** FE-40, FE-142, FE-144
**Date:** 2026-10-22
**Status:** READ-ONLY AUDIT — no source was modified

---

## Summary counts

| Metric | Count |
|---|---|
| Total pages in scope | 208 |
| Pages with own sibling `loading.tsx` | 186 |
| Pages **missing** sibling `loading.tsx` | **22** |
| Pages whose loading mirrors the page layout (feature or structured skeleton) | ~150 |
| Pages whose loading is structurally approximate (raw Skeleton bars, not a named feature skeleton) | ~35 |
| Pages with a banned generic loading (`LoadingState variant="page/form"`) | **1** (+ 1 orphan module-level) |
| Pages that import and reuse own `loading.tsx` as `<Suspense>` fallback | 10 |
| Pages with `<Suspense>` but no explicit fallback (rely on sibling `loading.tsx` for nav, feature component handles query-loading internally) | 6 |

---

## Module-level `loading.tsx` files that cover unrelated child pages — must be resolved

These files sit above one or more child `page.tsx` routes that do **not** have their own sibling `loading.tsx`. Next.js inherits the ancestor, so multiple unrelated pages share one skeleton — the FE-144 ban.

| File | Covers sibling `page.tsx`? | Child pages it incorrectly covers | Verdict |
|---|---|---|---|
| `hr/loading.tsx` | **Y** (`hr/page.tsx` exists — keep it) | 19 child pages (all hr/settings/*, hr/comp-off, hr/engagement, hr/geofencing, hr/overtime, hr/rosters, hr/service-delivery) | **FE-144 violation on children** — keep file for hr/page.tsx; create 19 new sibling files for the children |
| `calendar/loading.tsx` | **Y** (`calendar/page.tsx` exists — keep it) | `calendar/settings/page.tsx` | **FE-144 violation on settings** — keep file; create sibling for settings |
| `chat/loading.tsx` | **Y** (`chat/page.tsx` exists — keep it) | `chat/invite/[inviteToken]/page.tsx` | **FE-144 violation on invite** — keep file; create sibling for invite |
| `me/loading.tsx` | **N** (no `me/page.tsx` exists) | All `me/*` pages (all have own loading, so effectively never fires) | **Orphan module-level** — renders banned `LoadingState variant="page"`; **delete** (all children have own sibling) |

---

## Per-page ledger

Legend for **mirrors layout** column:
- **Y** — uses a named feature skeleton that was built to match this page's exact geometry, OR uses a UI skeleton primitive (DataTableSkeleton, KanbanBoardSkeleton) that correctly matches the dominant content shape  
- **Y (partial)** — structured Skeleton blocks approximate the layout but miss key elements (e.g., no tabs rendered when page has tabs; generic h-XX block for the whole content area)  
- **N** — generic `LoadingState`, `AppLoadingScreen`, bare Skeleton bars unrelated to the page shape, or no sibling at all

---

### dashboard

| route | page file | sibling loading.tsx? | inherited from | loading renders | mirrors layout? | page ready-layout shape | existing feature skeleton | page query-loading branch |
|---|---|---|---|---|---|---|---|---|
| /dashboard | `dashboard/page.tsx` | **Y** | — | `DashboardPageSkeleton` (feature) | **Y** — dedicated dashboard skeleton | toolbar + widget grid (charts + cards + activity) | `features/dashboard/dashboard-page-skeleton.tsx` → `DashboardPageSkeleton` | Suspense fallback = own `loading.tsx` |

### inbox

| route | page file | sibling? | inherited from | loading renders | mirrors? | ready-layout | feature skeleton | query-loading |
|---|---|---|---|---|---|---|---|---|
| /inbox | `inbox/page.tsx` | **Y** | — | `NotificationListSkeleton` wrapped in `PageWrapper` with filter tab skeletons | **Y** | PageWrapper + filter bar (4 chips) + notification list | `features/notifications/notification-list-skeleton.tsx` → `NotificationListSkeleton` | `<Suspense>` without fallback (relies on sibling `loading.tsx` for nav; feature component owns query-loading internally) |

### mail

| route | page file | sibling? | inherited from | loading renders | mirrors? | ready-layout | feature skeleton | query-loading |
|---|---|---|---|---|---|---|---|---|
| /mail | `mail/page.tsx` | **Y** | — | `MailHeaderSkeleton` + `MailContentSkeleton` | **Y** — two-part shell skeleton | Fixed header bar + content area (thread list + reading pane) | `features/mail/mail-shell-skeletons.tsx` | Feature component owns query-loading |

### chat

| route | page file | sibling? | inherited from | loading renders | mirrors? | ready-layout | feature skeleton | query-loading |
|---|---|---|---|---|---|---|---|---|
| /chat | `chat/page.tsx` | **Y** | — | `ChatShellSkeleton` | **Y** | Full-height chat shell (channel sidebar + message area + composer) | `features/chat/chat-shell.tsx` → `ChatShellSkeleton` | Feature component owns |
| /chat/invite/[inviteToken] | `chat/invite/[inviteToken]/page.tsx` | **N** | `chat/loading.tsx` | `ChatShellSkeleton` (wrong shape — invite page is a one-panel join form) | **N** — chat shell skeleton does not match join-invite form | Single centered card: invite summary + Join button | None identified | Feature component owns |

### calendar

| route | page file | sibling? | inherited from | loading renders | mirrors? | ready-layout | feature skeleton | query-loading |
|---|---|---|---|---|---|---|---|---|
| /calendar | `calendar/page.tsx` | **Y** | — | Skeleton toolbar rows + full-height Skeleton calendar area | **Y (partial)** — toolbar matches; calendar body is one big Skeleton block rather than month/week grid structure | PageWrapper + toolbar (nav + view toggle) + full-height calendar grid | `features/calendar/calendar-lazy-fallbacks.tsx` (has lazy fallbacks; not used in loading.tsx) | Feature component owns |
| /calendar/settings | `calendar/settings/page.tsx` | **N** | `calendar/loading.tsx` | Calendar main skeleton (wrong shape) | **N** — calendar skeleton does not match settings panel | PageWrapper + settings tabs/sections | None identified | Feature component owns |

### me

| route | page file | sibling? | inherited from | loading renders | mirrors? | ready-layout | feature skeleton | query-loading |
|---|---|---|---|---|---|---|---|---|
| /me/career | `me/career/page.tsx` | **Y** | — | `SelfServiceHubSkeleton title="Hiring & Referrals" tabCount={3}` | **Y** — exact match; page also uses same skeleton in `<Suspense>` fallback | SelfServiceHub shell + 3-tab toolbar + tab content | `features/me/hubs/self-service-hub-skeleton.tsx` → `SelfServiceHubSkeleton` | Suspense fallback = `SelfServiceHubSkeleton` (same) |
| /me/money | `me/money/page.tsx` | **Y** | — | `SelfServiceHubSkeleton title="Expenses & Pay" tabCount={4}` | **Y** | SelfServiceHub + 4 tabs | same | Suspense fallback = same skeleton |
| /me/workday | `me/workday/page.tsx` | **Y** | — | `SelfServiceHubSkeleton title="Attendance & Time Off" tabCount={4}` | **Y** | SelfServiceHub + 4 tabs | same | Suspense fallback = same skeleton |
| /me/records | `me/records/page.tsx` | **Y** | — | `SelfServiceHubSkeleton title="Documents & Onboarding"` | **Y** | SelfServiceHub | same | Feature owns |
| /me/support | `me/support/page.tsx` | **Y** | — | `SupportRequestsTableSkeleton surface="self"` inside `PageWrapper` | **Y** | PageWrapper + support table | `features/employee-support` → `SupportRequestsTableSkeleton` | Feature owns |
| /me/resignation | `me/resignation/page.tsx` | **Y** | — | PageWrapper + single `Skeleton className="h-24 rounded-xl"` | **Y (partial)** — only one card skeleton; page may have more sections | PageWrapper + resignation status card(s) | None identified | Feature owns |
| /me/team | `me/team/page.tsx` | **Y** | — | PageWrapper + `Skeleton h-24` (manager card) + `Skeleton h-64` (team list) + `StatCardGridSkeleton cols={3}` | **Y (partial)** — approximates 3-section layout | PageWrapper + manager card + team list + 3 stat cards | None identified | Feature owns |

### knowledge

| route | page file | sibling? | inherited from | loading renders | mirrors? | ready-layout | feature skeleton | query-loading |
|---|---|---|---|---|---|---|---|---|
| /knowledge/wiki | `knowledge/wiki/page.tsx` | **Y** | — | PageWrapper + search bar + pinned spaces row + filter toolbar + `DataTableSkeleton cols=5` | **Y** | PageWrapper + search + pinned spaces + document table | `features/wiki/components/wiki-collection-skeletons.tsx` | Feature owns |
| /knowledge/wiki/doc/[pageId] | `knowledge/wiki/doc/[pageId]/page.tsx` | **Y** | — | `PageDocumentSkeleton` (feature) | **Y** — dedicated page document skeleton | Full-page document editor/viewer | `features/wiki/components/page-document-skeleton.tsx` | Feature owns |
| /knowledge/wiki/doc/[pageId]/history | `knowledge/wiki/doc/[pageId]/history/page.tsx` | **Y** | — | `PageHistorySkeleton` inside `PageWrapper` | **Y** | PageWrapper + history timeline/table | `features/wiki/components/page-history-skeleton.tsx` | Feature owns |
| /knowledge/wiki/spaces | `knowledge/wiki/spaces/page.tsx` | **Y** | — | PageWrapper + filter toolbar + 6-card grid | **Y** | PageWrapper + filter toolbar + space card grid | None (inline skeleton matches) | Feature owns |
| /knowledge/wiki/spaces/[spaceId] | `knowledge/wiki/spaces/[spaceId]/page.tsx` | **Y** | — | `SpaceDetailSkeleton` inside `PageWrapper` | **Y** | PageWrapper + space detail | `features/wiki/components/space-detail-skeleton.tsx` | Feature owns |
| /knowledge/wiki/company-documents | `knowledge/wiki/company-documents/page.tsx` | **Y** | — | `CompanyDocumentsSkeleton` inside `PageWrapper` | **Y** | PageWrapper + company documents list | `features/wiki/components/company-documents-skeleton.tsx` | Feature owns |
| /knowledge/wiki/company-documents/[linkedDocumentId] | `knowledge/wiki/company-documents/[linkedDocumentId]/page.tsx` | **Y** | — | `CompanyDocumentDetailSkeleton` inside `PageWrapper` | **Y** | PageWrapper + document detail | `features/wiki/components/company-document-detail-skeleton.tsx` | Feature owns |
| /knowledge/wiki/analytics | `knowledge/wiki/analytics/page.tsx` | **Y** | — | `KnowledgeAnalyticsSkeleton` inside `PageWrapper` | **Y** | PageWrapper + analytics cards + charts | `features/wiki/components/knowledge-analytics-skeleton.tsx` | Feature owns |
| /knowledge/wiki/manage | `knowledge/wiki/manage/page.tsx` | **Y** | — | `ContentHealthSkeleton` inside `PageWrapper` | **Y** | PageWrapper + content health panels | `features/wiki/components/content-health-skeleton.tsx` | Feature owns |
| /knowledge/wiki/manage/sharing | `knowledge/wiki/manage/sharing/page.tsx` | **Y** | — | `KbSharingSettingsSkeleton` inside `PageWrapper` | **Y** | PageWrapper + sharing settings form | `features/wiki/components/kb-sharing-settings-skeleton.tsx` | Feature owns |
| /knowledge/wiki/reviews | `knowledge/wiki/reviews/page.tsx` | **Y** | — | `WikiTableRowsSkeleton` + filter toolbar inside `PageWrapper` | **Y** | PageWrapper + filter toolbar + document rows | `features/wiki/components/wiki-collection-skeletons.tsx` → `WikiTableRowsSkeleton` | Feature owns |
| /knowledge/wiki/search | `knowledge/wiki/search/page.tsx` | **Y** | — | PageWrapper + search bar + `DataTableSkeleton cols=3` | **Y** | PageWrapper + search field + results table | None (DataTableSkeleton) | Feature owns |
| /knowledge/wiki/private | `knowledge/wiki/private/page.tsx` | **Y** | — | PageWrapper + pinned section + filter toolbar + `DataTableSkeleton cols=5` | **Y** | PageWrapper + pinned + table | None (DataTableSkeleton) | Feature owns |
| /knowledge/wiki/shared | `knowledge/wiki/shared/page.tsx` | **Y** | — | PageWrapper + filter toolbar + `DataTableSkeleton cols=8` | **Y** | PageWrapper + filter + table | None (DataTableSkeleton) | Feature owns |
| /knowledge/wiki/trash | `knowledge/wiki/trash/page.tsx` | **Y** | — | `WikiTableRowsSkeleton` + filter toolbar inside `PageWrapper` | **Y** | PageWrapper + filter toolbar + document rows | `features/wiki/components/wiki-collection-skeletons.tsx` | Feature owns |
| /knowledge/wiki/templates | `knowledge/wiki/templates/page.tsx` | **Y** | — | `WikiTemplatesGridSkeleton` + filter toolbar inside `PageWrapper` | **Y** | PageWrapper + filter + template grid | `features/wiki/components/wiki-collection-skeletons.tsx` → `WikiTemplatesGridSkeleton` | Feature owns |
| /knowledge/wiki/import | `knowledge/wiki/import/page.tsx` | **Y** | — | `LoadingState variant="form"` inside `PageWrapper` | **N** — generic form loading state, not an import-specific skeleton | PageWrapper + import form (file picker, format selector, mapping panel) | None | Feature owns |
| /knowledge/research-briefs | `knowledge/research-briefs/page.tsx` | **Y** | — | PageWrapper + search/filter card + 9 brief card skeletons | **Y (partial)** — matches list shape; no named skeleton component | PageWrapper + search card + brief list | None (inline) | Feature owns |
| /knowledge/research-briefs/[briefId] | `knowledge/research-briefs/[briefId]/page.tsx` | **Y** | — | Skeleton bars (title + sections) | **Y (partial)** | PageWrapper + brief detail sections | None | Feature owns |
| /knowledge/chat | `knowledge/chat/page.tsx` | **Y** | — | Chat bubble skeletons + composer Skeleton | **Y (partial)** — matches message/composer shape but lacks sidebar | Full-height chat (possibly sidebar + messages + composer) | None (inline) | Feature owns |

---

### hr — overview and employees

| route | page file | sibling? | inherited from | loading renders | mirrors? | ready-layout | feature skeleton | query-loading |
|---|---|---|---|---|---|---|---|---|
| /hr | `hr/page.tsx` | **Y** | — | PageWrapper + 5 quick-action cards + 2 queue sections + metric grid | **Y** | PageWrapper (display) + quick action grid + queue cards + metric cards | None (inline matches `HrHubPage` shape) | No `<Suspense>` — feature component owns |
| /hr/analytics | `hr/analytics/page.tsx` | **Y** | — | `StatCardGridSkeleton` + chart Skeleton blocks | **Y (partial)** | PageWrapper + stat cards + charts | None | Feature owns |
| /hr/employees | `hr/employees/page.tsx` | **Y** | — | PageWrapper + action toolbar + filter row + employee card grid | **Y** | PageWrapper + action bar + filter bar + employee card grid | `features/hr/employees/employees-loading-skeleton.tsx` | Suspense fallback = own `loading.tsx` |
| /hr/employees/[employeeId] | `hr/employees/[employeeId]/page.tsx` | **Y** | — | PageWrapper + avatar/name skeletons + multi-section bars | **Y (partial)** | PageWrapper + employee profile header + tabs + content sections | None | Suspense fallback = own `loading.tsx` |
| /hr/employees/find-expert | `hr/employees/find-expert/page.tsx` | **N** | `hr/employees/loading.tsx` | employee card grid (wrong shape) | **N** | PageWrapper + search bar + expert cards grid | None identified | Feature owns |
| /hr/employees/skills-matrix | `hr/employees/skills-matrix/page.tsx` | **N** | `hr/employees/loading.tsx` | employee card grid (wrong shape) | **N** | PageWrapper + filter toolbar + matrix table | None identified | Feature owns |
| /hr/employees/manager-coverage | `hr/employees/manager-coverage/page.tsx` | **Y** | — | `DataTableSkeleton` inside `PageWrapper` | **Y** | PageWrapper + table | None | `<Suspense>` without fallback |
| /hr/employees/reporting-changes | `hr/employees/reporting-changes/page.tsx` | **Y** | — | `DataTableSkeleton` inside `PageWrapper` | **Y** | PageWrapper + table | None | Feature owns |
| /hr/employees/reporting-changes/[jobId] | `hr/employees/reporting-changes/[jobId]/page.tsx` | **Y** | — | `DataTableSkeleton` inside `PageWrapper` | **Y** | PageWrapper + detail sections | None | Feature owns |
| /hr/employees/reporting-requests | `hr/employees/reporting-requests/page.tsx` | **Y** | — | `DataTableSkeleton` inside `PageWrapper` | **Y** | PageWrapper + table | None | `<Suspense>` without fallback |
| /hr/org | `hr/org/page.tsx` | **Y** | — | PageWrapper + view-toggle tabs + `DataTableSkeleton` | **Y** | PageWrapper + tab toggle + table | None | Feature owns |
| /hr/org-chart | `hr/org-chart/page.tsx` | **Y** | — | PageWrapper + filter bar + node rows | **Y (partial)** | PageWrapper + search filter + tree/node rows | None | Suspense fallback = own `loading.tsx` |
| /hr/event-stream | `hr/event-stream/page.tsx` | **Y** | — | `DataTableSkeleton` inside `PageWrapper` | **Y** | PageWrapper + event log table | None | Feature owns |
| /hr/kpis | `hr/kpis/page.tsx` | **Y** | — | PageWrapper + tab bar + KPI card grid | **Y (partial)** — tabs rendered, card grid approximate | PageWrapper + tab bar + KPI cards | None | Feature owns |
| /hr/engagement | `hr/engagement/page.tsx` | **N** | `hr/loading.tsx` | HR hub skeleton (wrong shape) | **N** | PageWrapper + engagement sections/charts | None identified | Feature owns |

---

### hr — core HRMS

| route | page file | sibling? | inherited from | loading renders | mirrors? | ready-layout | feature skeleton | query-loading |
|---|---|---|---|---|---|---|---|---|
| /hr/leaves | `hr/leaves/page.tsx` | **Y** | — | `StatCardGridSkeleton cols=3` + `Skeleton h-64` | **Y (partial)** — stat cards match; h-64 block does not show tabs (page has Leave/WFH tabs) | PageWrapper + stat cards + tab toolbar + tabbed content (table + calendar) | None | `<Suspense>` without fallback |
| /hr/leaves/analytics | `hr/leaves/analytics/page.tsx` | **Y** | — | `StatCardGridSkeleton cols=3` + 2 chart Skeleton blocks inside `PageWrapper` | **Y (partial)** | PageWrapper + 3 stat cards + bar chart + line chart | None | Feature owns |
| /hr/leave-policies | `hr/leave-policies/page.tsx` | **Y** | — | PageWrapper + card grid (10 cards) | **Y** | PageWrapper + policy card grid | None | Feature owns |
| /hr/attendance | `hr/attendance/page.tsx` | **Y** | — | PageWrapper + 2-column grid (clock widget + timeline) | **Y** — 4/12 + 8/12 grid matches page | PageWrapper + 2-col layout (clock + attendance log) | None | Feature owns |
| /hr/overtime | `hr/overtime/page.tsx` | **N** | `hr/loading.tsx` | HR hub skeleton (wrong shape) | **N** | PageWrapper + overtime table with filter | None identified | Feature owns |
| /hr/comp-off | `hr/comp-off/page.tsx` | **N** | `hr/loading.tsx` | HR hub skeleton (wrong shape) | **N** | PageWrapper + comp-off request list/form | None identified | Feature owns |
| /hr/shifts | `hr/shifts/page.tsx` | **Y** | — | PageWrapper + tab bar + card grid | **Y (partial)** | PageWrapper + 3-tab bar + shift card grid | None | Feature owns |
| /hr/rosters | `hr/rosters/page.tsx` | **N** | `hr/loading.tsx` | HR hub skeleton (wrong shape) | **N** | PageWrapper + roster schedule grid | None identified | Feature owns |
| /hr/work-logs | `hr/work-logs/page.tsx` | **Y** | — | Skeleton bars in `PageWrapper` | **Y (partial)** | PageWrapper + work log list/table | None | Suspense fallback = own `loading.tsx` |
| /hr/onboarding | `hr/onboarding/page.tsx` | **Y** | — | PageWrapper + 5-tab bar + list rows | **Y** | PageWrapper + tab bar + onboarding list | None | Suspense fallback = own `loading.tsx` |
| /hr/onboarding/[userId] | `hr/onboarding/[userId]/page.tsx` | **Y** | — | `OnboardingDetailSkeleton` inside `PageWrapper` | **Y** — dedicated skeleton | PageWrapper + employee detail + task checklist | `features/hr/onboarding/onboarding-route-skeletons.tsx` → `OnboardingDetailSkeleton` | Feature owns |
| /hr/onboarding/probation | `hr/onboarding/probation/page.tsx` | **Y** | — | `ProbationSkeleton` inside `PageWrapper` | **Y** — dedicated skeleton | PageWrapper + probation list/timeline | `features/hr/onboarding/onboarding-route-skeletons.tsx` → `ProbationSkeleton` | Feature owns |
| /hr/performance | `hr/performance/page.tsx` | **Y** | — | PageWrapper + scrollable tab bar + list rows | **Y (partial)** — tab bar rendered; rows generic | PageWrapper + 8-tab bar + tabbed content | None | Suspense fallback = own `loading.tsx` |
| /hr/performance/analytics | `hr/performance/analytics/page.tsx` | **Y** | — | PageWrapper + `StatCardGridSkeleton cols=4` + 2 chart panels + stats panel — **uses inline `animate-pulse` divs instead of `Skeleton` primitive** | **Y (partial)** — layout matches but `animate-pulse` on arbitrary divs violates AP-9 | PageWrapper + 4 stat cards + 2 charts + table | None | Feature owns |
| /hr/goals | `hr/goals/page.tsx` | **Y** | — | PageWrapper + tab bar + filter bar + goal card grid (9 cards) | **Y** | PageWrapper + 3-tab bar + filter + OKR card grid | None | Feature owns |
| /hr/feedback | `hr/feedback/page.tsx` | **Y** | — | PageWrapper + search + feedback card list | **Y (partial)** | PageWrapper + filter + feedback cycle cards | None | Feature owns |
| /hr/exit | `hr/exit/page.tsx` | **Y** | — | PageWrapper + action button + list rows | **Y (partial)** | PageWrapper + action bar + resignation list | None | Feature owns |
| /hr/exit/[resignationId] | `hr/exit/[resignationId]/page.tsx` | **Y** | — | `StatCardGridSkeleton count=4` + checklist rows inside `PageWrapper` | **Y** | PageWrapper + 4 stat cards + checklist | None | Feature owns |
| /hr/termination | `hr/termination/page.tsx` | **Y** | — | Skeleton bars inside `PageWrapper` | **Y (partial)** | PageWrapper + termination list/form | None | `<Suspense>` without fallback |
| /hr/compensation-planning | `hr/compensation-planning/page.tsx` | **Y** | — | Skeleton bars inside `PageWrapper` | **Y (partial)** | PageWrapper + planning grid/table | None | `<Suspense>` without fallback |
| /hr/delegations | `hr/delegations/page.tsx` | **Y** | — | Skeleton rows inside `PageWrapper` | **Y (partial)** | PageWrapper + delegation list | None | Feature owns |
| /hr/cases | `hr/cases/page.tsx` | **Y** | — | PageWrapper + filter toolbar + action bar + `DataTableSkeleton` | **Y** | PageWrapper + filter + action bar + case table | None | Feature owns |
| /hr/helpdesk | `hr/helpdesk/page.tsx` | **Y** | — | `SupportRequestsTableSkeleton surface="agent"` inside `PageWrapper` | **Y** — dedicated skeleton | PageWrapper + support agent table | `features/employee-support` → `SupportRequestsTableSkeleton` | Suspense fallback = own `loading.tsx` |
| /hr/service-delivery | `hr/service-delivery/page.tsx` | **N** | `hr/loading.tsx` | HR hub skeleton (wrong shape) | **N** | PageWrapper + stat cards + prioritized queue list (client component with usePageState) | None identified | `PageState loading={}` inline skeletons |

---

### hr — workforce, benefits, assets, documents, compliance

| route | page file | sibling? | inherited from | loading renders | mirrors? | ready-layout | feature skeleton | query-loading |
|---|---|---|---|---|---|---|---|---|
| /hr/benefits | `hr/benefits/page.tsx` | **Y** | — | PageWrapper + 3-tab bar + benefit card grid | **Y** | PageWrapper + tab bar + benefit plan card grid | None | Feature owns |
| /hr/expenses | `hr/expenses/page.tsx` | **Y** | — | `StatCardGridSkeleton` + chart blocks inside `PageWrapper` | **Y (partial)** | PageWrapper + stat cards + expense table + charts | None | Feature owns |
| /hr/reimbursements | `hr/reimbursements/page.tsx` | **Y** | — | `DataTableSkeleton` + action button inside `PageWrapper` | **Y** | PageWrapper + action bar + reimbursement table | None | Feature owns |
| /hr/fnf | `hr/fnf/page.tsx` | **Y** | — | Skeleton rows inside `PageWrapper` | **Y (partial)** | PageWrapper + FnF settlement list | None | Feature owns |
| /hr/assets | `hr/assets/page.tsx` | **Y** | — | `DataTableSkeleton` inside `PageWrapper` | **Y** | PageWrapper + asset table | None | Feature owns |
| /hr/asset-returns | `hr/asset-returns/page.tsx` | **Y** | — | `DataTableSkeleton` inside `PageWrapper` | **Y** | PageWrapper + asset-return table | None | Feature owns |
| /hr/devices | `hr/devices/page.tsx` | **Y** | — | `DataTableSkeleton` inside `PageWrapper` | **Y** | PageWrapper + device table | None | Feature owns |
| /hr/documents | `hr/documents/page.tsx` | **Y** | — | `StatCardGridSkeleton` + filter toolbar + `DataTableSkeleton` inside `PageWrapper` | **Y** | PageWrapper + action bar + filter + document table | None | Feature owns |
| /hr/documents/editor/[documentId] | `hr/documents/editor/[documentId]/page.tsx` | **Y** | — | PageWrapper + action bar + title field Skeleton + editor area Skeleton | **Y (partial)** | PageWrapper + toolbar + doc title + rich editor area | None | Feature owns |
| /hr/documents/editor/new | `hr/documents/editor/new/page.tsx` | **Y** | — | Same as editor detail | **Y (partial)** | Same as editor | None | Feature owns |
| /hr/documents/templates | `hr/documents/templates/page.tsx` | **Y** | — | `DataTableSkeleton` inside `PageWrapper` | **Y** | PageWrapper + template table | None | Feature owns |
| /hr/documents/templates/[templateId]/edit | `hr/documents/templates/[templateId]/edit/page.tsx` | **Y** | — | Skeleton bars inside `PageWrapper` | **Y (partial)** | PageWrapper + template editor | None | Feature owns |
| /hr/documents/templates/new | `hr/documents/templates/new/page.tsx` | **Y** | — | Skeleton bars inside `PageWrapper` | **Y (partial)** | PageWrapper + template form | None | Feature owns |
| /hr/document-review | `hr/document-review/page.tsx` | **Y** | — | `DataTableSkeleton` inside `PageWrapper` | **Y** | PageWrapper + review queue table | None | Feature owns |
| /hr/document-types | `hr/document-types/page.tsx` | **Y** | — | `DataTableSkeleton` inside `PageWrapper` | **Y** | PageWrapper + type table | None | Suspense fallback = own `loading.tsx` |
| /hr/email-templates | `hr/email-templates/page.tsx` | **Y** | — | Skeleton rows inside `PageWrapper` | **Y (partial)** | PageWrapper + email template list | None | Feature owns |
| /hr/compliance | `hr/compliance/page.tsx` | **Y** | — | PageWrapper + search bar + list rows | **Y (partial)** | PageWrapper + search + compliance item list | None | Feature owns |
| /hr/legal-holds | `hr/legal-holds/page.tsx` | **Y** | — | `DataTableSkeleton` inside `PageWrapper` | **Y** | PageWrapper + legal hold table | None | Feature owns |
| /hr/labor-relations | `hr/labor-relations/page.tsx` | **Y** | — | `DataTableSkeleton` inside `PageWrapper` | **Y** | PageWrapper + labor relations table | None | Feature owns |
| /hr/safety | `hr/safety/page.tsx` | **Y** | — | `DataTableSkeleton` inside `PageWrapper` | **Y** | PageWrapper + safety incident table | None | Feature owns |
| /hr/emergency | `hr/emergency/page.tsx` | **Y** | — | `DataTableSkeleton` inside `PageWrapper` | **Y** | PageWrapper + emergency contact table | None | Feature owns |
| /hr/equity | `hr/equity/page.tsx` | **Y** | — | `DataTableSkeleton` inside `PageWrapper` | **Y** | PageWrapper + equity table | None | Feature owns |
| /hr/background-verification | `hr/background-verification/page.tsx` | **Y** | — | `DataTableSkeleton` inside `PageWrapper` | **Y** | PageWrapper + BGV table | None | Feature owns |
| /hr/accommodations | `hr/accommodations/page.tsx` | **Y** | — | `DataTableSkeleton` inside `PageWrapper` | **Y** | PageWrapper + accommodation table | None | Feature owns |
| /hr/contingent | `hr/contingent/page.tsx` | **Y** | — | Skeleton rows inside `PageWrapper` | **Y (partial)** | PageWrapper + contingent worker list | None | Feature owns |
| /hr/workforce | `hr/workforce/page.tsx` | **Y** | — | `StatCardGridSkeleton cols=4` + filter bar + `DataTableSkeleton` | **Y** | PageWrapper + 4 stat cards + filter bar + headcount table | None | Feature owns |
| /hr/workforce-cost | `hr/workforce-cost/page.tsx` | **Y** | — | `StatCardGridSkeleton` + chart blocks | **Y (partial)** | PageWrapper + stat cards + cost breakdown charts | None | Feature owns |
| /hr/positions | `hr/positions/page.tsx` | **Y** | — | `DataTableSkeleton` inside `PageWrapper` | **Y** | PageWrapper + position table | None | Feature owns |
| /hr/identity | `hr/identity/page.tsx` | **Y** | — | `DataTableSkeleton` inside `PageWrapper` | **Y** | PageWrapper + identity table | None | Feature owns |
| /hr/biometric | `hr/biometric/page.tsx` | **Y** | — | Skeleton rows inside `PageWrapper` | **Y (partial)** | PageWrapper + biometric device list | None | Feature owns |
| /hr/geofencing | `hr/geofencing/page.tsx` | **N** | `hr/loading.tsx` | HR hub skeleton (wrong shape) | **N** | PageWrapper + geofence map + zone list | None identified | Feature owns |

---

### hr — welfare, payroll, travel, settings

| route | page file | sibling? | inherited from | loading renders | mirrors? | ready-layout | feature skeleton | query-loading |
|---|---|---|---|---|---|---|---|---|
| /hr/retention | `hr/retention/page.tsx` | **Y** | — | `DataTableSkeleton` + filter toolbar + action button inside `PageWrapper` | **Y** | PageWrapper + filter + action bar + retention policy table | None | Feature owns |
| /hr/handbook | `hr/handbook/page.tsx` | **Y** | — | PageWrapper + filter toolbar + 10 row Skeleton list | **Y** | PageWrapper + action bar + filter + handbook list | None | Feature owns |
| /hr/holidays | `hr/holidays/page.tsx` | **Y** | — | PageWrapper + action bar + calendar Skeleton + list rows | **Y** | PageWrapper + action bar + calendar view + holiday list | None | Feature owns |
| /hr/announcements | `hr/announcements/page.tsx` | **Y** | — | PageWrapper + 12 announcement card skeletons | **Y** | PageWrapper + action bar + announcement card feed | None | Feature owns |
| /hr/approvals | `hr/approvals/page.tsx` | **Y** | — | PageWrapper + action bar + filter bar + list rows | **Y** | PageWrapper + action bar + approval request list | None | Feature owns |
| /hr/travel | `hr/travel/page.tsx` | **Y** | — | Skeleton rows inside `PageWrapper` | **Y (partial)** | PageWrapper + travel request list | None | Feature owns |
| /hr/travel/approvals | `hr/travel/approvals/page.tsx` | **Y** | — | Skeleton rows inside `PageWrapper` | **Y (partial)** | PageWrapper + travel approval list | None | Feature owns |
| /hr/simulator | `hr/simulator/page.tsx` | **Y** | — | PageWrapper + 2-col form + result section | **Y** | PageWrapper + 2-panel simulator form + result list | None | Feature owns |
| /hr/access | `hr/access/page.tsx` | **Y** | — | PageWrapper + 3-tab bar + list rows | **Y** | PageWrapper + access management tabs | None | Suspense fallback = own `loading.tsx` |
| /hr/fnf | `hr/fnf/page.tsx` | **Y** | — | Skeleton rows inside `PageWrapper` | **Y (partial)** | PageWrapper + FnF settlement workflow | None | Feature owns |

---

### hr — settings (all missing siblings)

| route | page file | sibling? | inherited from | loading renders | mirrors? | ready-layout | feature skeleton | query-loading |
|---|---|---|---|---|---|---|---|---|
| /hr/settings | `hr/settings/page.tsx` | **N** | `hr/loading.tsx` | HR hub skeleton (wrong shape) | **N** | PageWrapper + view-toggle (Simple/Advanced) + settings hub grid | None identified | Client component with simple local state |
| /hr/settings/automations | `hr/settings/automations/page.tsx` | **N** | `hr/loading.tsx` | HR hub skeleton (wrong shape) | **N** | PageWrapper + automations list | None identified | Feature owns |
| /hr/settings/custom-fields | `hr/settings/custom-fields/page.tsx` | **N** | `hr/loading.tsx` | HR hub skeleton (wrong shape) | **N** | PageWrapper + custom field table/list | None identified | Feature owns |
| /hr/settings/forms | `hr/settings/forms/page.tsx` | **N** | `hr/loading.tsx` | HR hub skeleton (wrong shape) | **N** | PageWrapper + forms list | None identified | Feature owns |
| /hr/settings/forms/[formId] | `hr/settings/forms/[formId]/page.tsx` | **N** | `hr/loading.tsx` | HR hub skeleton (wrong shape) | **N** | PageWrapper + form builder/detail | None identified | Feature owns |
| /hr/settings/forms/[formId]/submissions | `hr/settings/forms/[formId]/submissions/page.tsx` | **N** | `hr/loading.tsx` | HR hub skeleton (wrong shape) | **N** | PageWrapper + submissions table | None identified | Feature owns |
| /hr/settings/import-export | `hr/settings/import-export/page.tsx` | **N** | `hr/loading.tsx` | HR hub skeleton (wrong shape) | **N** | PageWrapper + import/export panels | None identified | Feature owns |
| /hr/settings/integrations | `hr/settings/integrations/page.tsx` | **N** | `hr/loading.tsx` | HR hub skeleton (wrong shape) | **N** | PageWrapper + integration card list | None identified | Feature owns |
| /hr/settings/policies | `hr/settings/policies/page.tsx` | **N** | `hr/loading.tsx` | HR hub skeleton (wrong shape) | **N** | PageWrapper + policy list | None identified | Feature owns |
| /hr/settings/preview | `hr/settings/preview/page.tsx` | **N** | `hr/loading.tsx` | HR hub skeleton (wrong shape) | **N** | PageWrapper + preview form | None identified | Feature owns |
| /hr/settings/templates | `hr/settings/templates/page.tsx` | **N** | `hr/loading.tsx` | HR hub skeleton (wrong shape) | **N** | PageWrapper + template list | None identified | Feature owns |
| /hr/settings/versions | `hr/settings/versions/page.tsx` | **N** | `hr/loading.tsx` | HR hub skeleton (wrong shape) | **N** | PageWrapper + version history table | None identified | Feature owns |
| /hr/settings/reporting-managers | `hr/settings/reporting-managers/page.tsx` | **Y** | — | Skeleton bars inside `PageWrapper` | **Y (partial)** | PageWrapper + reporting-manager policy form | None | Feature owns |
| /hr/settings/workflows | `hr/settings/workflows/page.tsx` | **Y** | — | Skeleton bars inside `PageWrapper` | **Y (partial)** | PageWrapper + workflow list | None | Feature owns |

---

### build — cross-project pages

| route | page file | sibling? | inherited from | loading renders | mirrors? | ready-layout | feature skeleton | query-loading |
|---|---|---|---|---|---|---|---|---|
| /build/projects | `build/projects/page.tsx` | **Y** | — | `ListSkeleton` (feature) + toolbar inside `PageWrapper` | **Y** — dedicated project list skeleton | PageWrapper + action bar + filter toolbar + project card/list view | `features/build/project-list/projects-page-skeletons.tsx` → `ListSkeleton` | Feature owns |
| /build/all-work | `build/all-work/page.tsx` | **Y** | — | `AllWorkToolbarSkeleton` + `AllWorkSkeleton view="list"` via `PageState loading={}` | **Y** — dedicated all-work skeleton | PageWrapper + multi-row toolbar + work list/board | `features/build/all-work/all-work-view-switcher.tsx` → `AllWorkSkeleton` | Feature owns |
| /build/my-work | `build/my-work/page.tsx` | **Y** | — | `StatCardGridSkeleton cols=4` + tab bar + `PmPanel` ticket rows | **Y** | PageWrapper + stat cards + tab filter + ticket list in panel | None | Feature owns |
| /build/roadmap | `build/roadmap/page.tsx` | **Y** | — | PageWrapper + filter toolbar + 4-column status card grid | **Y** | PageWrapper + filter + roadmap kanban/list | None | Feature owns |
| /build/teams | `build/teams/page.tsx` | **Y** | — | `DataTableSkeleton` + filter bar + action bar inside `PageWrapper` | **Y** | PageWrapper + action bar + filter + team table | None | Feature owns |
| /build/teams/[teamId] | `build/teams/[teamId]/page.tsx` | **Y** | — | PageWrapper + PmPageShell + meta panel + member list | **Y (partial)** | PageWrapper + team header + tabs + member table | None | Feature owns |
| /build/portfolios | `build/portfolios/page.tsx` | **Y** | — | `DataTableSkeleton` + filter toolbar inside `PageWrapper` | **Y** | PageWrapper + filter + portfolio table | None | Feature owns |
| /build/portfolios/[portfolioId] | `build/portfolios/[portfolioId]/page.tsx` | **Y** | — | PageWrapper + PmPageShell + meta panel + project list | **Y (partial)** | PageWrapper + detail header + project list | None | Feature owns |
| /build/programs | `build/programs/page.tsx` | **Y** | — | `DataTableSkeleton` + filter toolbar inside `PageWrapper` | **Y** | PageWrapper + filter + program table | None | Feature owns |
| /build/programs/[programId] | `build/programs/[programId]/page.tsx` | **Y** | — | PageWrapper + PmPageShell + meta panel + project list | **Y (partial)** | PageWrapper + detail header + project list | None | Feature owns |
| /build/goals | `build/goals/page.tsx` | **Y** | — | `StatCardGridSkeleton` + cycle/goal card grid inside `PageWrapper` | **Y** | PageWrapper + stat cards + goal cards | `features/build/goals/goals-skeleton.tsx` | Feature owns |
| /build/goals/[goalId] | `build/goals/[goalId]/page.tsx` | **Y** | — | `GoalDetailSkeleton` inside `PageWrapper` | **Y** — dedicated skeleton | PageWrapper + goal detail panels | `features/build/goals/goal-detail-skeleton.tsx` → `GoalDetailSkeleton` | Feature owns |
| /build/managed-products | `build/managed-products/page.tsx` | **Y** | — | `DataTableSkeleton` inside `PageWrapper` | **Y** | PageWrapper + product table | None | Feature owns |
| /build/managed-products/[managedProductId] | `build/managed-products/[managedProductId]/page.tsx` | **Y** | — | `ManagedProductOverviewRouteLoading` (feature) | **Y** — dedicated skeleton | PageWrapper + product overview panels | `features/build/managed-products/managed-product-route-loading.tsx` | Feature owns |
| /build/managed-products/[managedProductId]/projects | `build/managed-products/[managedProductId]/projects/page.tsx` | **Y** | — | `ProductProjectsRouteLoading` | **Y** | Product project list | same file | Feature owns |
| /build/managed-products/[managedProductId]/goals | `build/managed-products/[managedProductId]/goals/page.tsx` | **Y** | — | `ProductGoalsRouteLoading` | **Y** | Product goals list | same file | Feature owns |
| /build/managed-products/[managedProductId]/feedback | `build/managed-products/[managedProductId]/feedback/page.tsx` | **Y** | — | `ProductFeedbackRouteLoading` | **Y** | Product feedback list | same file | Feature owns |
| /build/managed-products/[managedProductId]/insights | `build/managed-products/[managedProductId]/insights/page.tsx` | **Y** | — | `ProductInsightsRouteLoading` | **Y** | Product insights charts | same file | Feature owns |
| /build/managed-products/[managedProductId]/releases | `build/managed-products/[managedProductId]/releases/page.tsx` | **Y** | — | `ProductReleasesRouteLoading` | **Y** | Product releases list | same file | Feature owns |
| /build/managed-products/[managedProductId]/roadmap | `build/managed-products/[managedProductId]/roadmap/page.tsx` | **Y** | — | `ProductRoadmapRouteLoading` | **Y** | Product roadmap | same file | Feature owns |
| /build/managed-products/[managedProductId]/settings | `build/managed-products/[managedProductId]/settings/page.tsx` | **Y** | — | `ProductSettingsRouteLoading` | **Y** | Product settings | same file | Feature owns |
| /build/approvals | `build/approvals/page.tsx` | **Y** | — | `StatCardGridSkeleton` + list rows inside `PageWrapper` | **Y** | PageWrapper + stat cards + approval list | None | Feature owns |
| /build/command-center | `build/command-center/page.tsx` | **Y** | — | `StatCardGridSkeleton` + panel skeletons | **Y (partial)** | PageWrapper + command center panels | `features/build/command-center/command-center-loading.tsx` | Feature owns |
| /build/templates | `build/templates/page.tsx` | **Y** | — | `TemplatesGridSkeleton` (feature) inside `PageWrapper` | **Y** — dedicated skeleton | PageWrapper + template card grid | `features/build/templates/templates-grid-skeleton.tsx` → `TemplatesGridSkeleton` | Feature owns |
| /build/search | `build/search/page.tsx` | **Y** | — | Search results Skeleton (feature) | **Y** | PageWrapper + search bar + result list | `features/build/search/workspace-search-results-skeleton.tsx` | Feature owns (via `PageWrapper`) |
| /build/inbox | `build/inbox/page.tsx` | **Y** | — | `InboxPageSkeleton` (feature) | **Y** — dedicated skeleton | PageWrapper + inbox filter + notification list | `features/build/inbox/inbox-page-skeleton.tsx` | Feature owns |
| /build/settings/access | `build/settings/access/page.tsx` | **Y** | — | `BuildAccessLoading` (feature) | **Y** — dedicated skeleton | PageWrapper + access management panels | `features/build/members/build-access-loading.tsx` | Feature owns |
| /build/settings/client-access | `build/settings/client-access/page.tsx` | **Y** | — | `ClientAccessSkeleton` (feature) inside `PageWrapper` | **Y** — dedicated skeleton | PageWrapper + client access settings | `features/portal-access/client-access-skeleton.tsx` | Feature owns |
| /build/settings/integrations | `build/settings/integrations/page.tsx` | **Y** | — | Skeleton bars inside `PageWrapper` | **Y (partial)** | PageWrapper + integration card list | None | Feature owns |
| /build/my-work/@panel/(..)[projectId]/tickets/[ticketKey] | `build/my-work/@panel/(..)[projectId]/tickets/[ticketKey]/page.tsx` | **Y** | — | `TicketPanelSkeleton` (feature) | **Y** — dedicated panel skeleton | Parallel-route panel: ticket detail in slide-over | `features/build/ticket-details/ticket-panel-skeleton.tsx` | Feature owns |

---

### build/[projectId] — core project pages

| route | page file | sibling? | inherited from | loading renders | mirrors? | ready-layout | feature skeleton | query-loading |
|---|---|---|---|---|---|---|---|---|
| /build/[projectId] | `build/[projectId]/page.tsx` | **Y** | — | `KanbanBoardSkeleton` inside `PageWrapper` with filter toolbar | **Y** | PageWrapper + filter bar + full-height kanban board | `components/ui/kanban-skeleton.tsx` → `KanbanBoardSkeleton` | Feature owns |
| /build/[projectId]/backlog | `build/[projectId]/backlog/page.tsx` | **Y** | — | `DataTableSkeleton` inside `PmPageShell/PmPanel` | **Y** | PageWrapper + filter bar + action bar + ticket table in panel | None | Feature owns |
| /build/[projectId]/issues | `build/[projectId]/issues/page.tsx` | **Y** | — | `KanbanBoardSkeleton` inside `PageWrapper` | **Y** | PageWrapper + full-height kanban | None | Feature owns |
| /build/[projectId]/epics | `build/[projectId]/epics/page.tsx` | **Y** | — | `StatCardGridSkeleton` + list rows | **Y (partial)** | PageWrapper + stat cards + epic list | None | Feature owns |
| /build/[projectId]/milestones | `build/[projectId]/milestones/page.tsx` | **Y** | — | `StatCardGridSkeleton` + milestone cards | **Y** | PageWrapper + stat cards + milestone card list | `features/build/milestones/milestones-page-skeleton.tsx` | Feature owns |
| /build/[projectId]/tickets/[ticketKey] | `build/[projectId]/tickets/[ticketKey]/page.tsx` | **Y** | — | `DetailSkeleton` inside `PageWrapper` (feature) | **Y** — dedicated ticket detail skeleton | PageWrapper + ticket header + sidebar + detail panels | `features/build/ticket-details/ticket-detail-skeleton.tsx` → `DetailSkeleton` | Feature owns |
| /build/[projectId]/@panel/(.)tickets/[ticketKey] | `build/[projectId]/@panel/(.)tickets/[ticketKey]/page.tsx` | **Y** | — | `TicketPanelSkeleton` (feature) | **Y** | Parallel-route panel overlay | `features/build/ticket-details/ticket-panel-skeleton.tsx` | Feature owns |
| /build/[projectId]/cycles | `build/[projectId]/cycles/page.tsx` | **Y** | — | PageWrapper + cycle card sections | **Y (partial)** — cycle sections rendered but no active/completed distinction | PageWrapper + current cycle card + cycle history | `features/build/cycles/cycles-skeleton.tsx` | Feature owns |
| /build/[projectId]/cycles/[cycleId] | `build/[projectId]/cycles/[cycleId]/page.tsx` | **Y** | — | `KanbanBoardSkeleton` inside `PageWrapper` | **Y** | PageWrapper + cycle header + kanban board | None | Feature owns |
| /build/[projectId]/approvals | `build/[projectId]/approvals/page.tsx` | **Y** | — | `DataTableSkeleton` inside `PageWrapper` | **Y** | PageWrapper + approvals table | None | Feature owns |
| /build/[projectId]/change-requests | `build/[projectId]/change-requests/page.tsx` | **Y** | — | `DataTableSkeleton` inside `PageWrapper` | **Y** | PageWrapper + change requests table | None | Feature owns |
| /build/[projectId]/risks | `build/[projectId]/risks/page.tsx` | **Y** | — | `DataTableSkeleton` inside `PageWrapper` | **Y** | PageWrapper + risk table | None | Feature owns |
| /build/[projectId]/decisions | `build/[projectId]/decisions/page.tsx` | **Y** | — | `DataTableSkeleton` inside `PageWrapper` | **Y** | PageWrapper + decisions table | None | Feature owns |
| /build/[projectId]/incidents | `build/[projectId]/incidents/page.tsx` | **Y** | — | `DataTableSkeleton` inside `PageWrapper` | **Y** | PageWrapper + incidents table | None | Feature owns |
| /build/[projectId]/incidents/[incidentId] | `build/[projectId]/incidents/[incidentId]/page.tsx` | **Y** | — | Skeleton bars inside `PageWrapper` | **Y (partial)** | PageWrapper + incident detail panels | None | Feature owns |
| /build/[projectId]/qa | `build/[projectId]/qa/page.tsx` | **Y** | — | `DataTableSkeleton` inside `PageWrapper` | **Y** | PageWrapper + QA test case table | None | Feature owns |
| /build/[projectId]/qa/runs/[runId] | `build/[projectId]/qa/runs/[runId]/page.tsx` | **Y** | — | Skeleton bars inside `PageWrapper` | **Y (partial)** | PageWrapper + run detail + test results | None | Feature owns |
| /build/[projectId]/releases | `build/[projectId]/releases/page.tsx` | **Y** | — | `DataTableSkeleton` inside `PageWrapper` | **Y** | PageWrapper + release table | None | Feature owns |
| /build/[projectId]/budget | `build/[projectId]/budget/page.tsx` | **Y** | — | `StatCardGridSkeleton` + chart/table blocks | **Y (partial)** | PageWrapper + budget stat cards + table | None | Feature owns |
| /build/[projectId]/workload | `build/[projectId]/workload/page.tsx` | **Y** | — | `KanbanBoardSkeleton` inside `PageWrapper` | **Y** | PageWrapper + workload kanban | None | Feature owns |
| /build/[projectId]/meetings | `build/[projectId]/meetings/page.tsx` | **Y** | — | `DataTableSkeleton` inside `PageWrapper` | **Y** | PageWrapper + meetings table | None | Feature owns |
| /build/[projectId]/meetings/[meetingId] | `build/[projectId]/meetings/[meetingId]/page.tsx` | **Y** | — | Skeleton bars inside `PageWrapper` | **Y (partial)** | PageWrapper + meeting detail | None | Feature owns |
| /build/[projectId]/forms | `build/[projectId]/forms/page.tsx` | **Y** | — | `DataTableSkeleton` inside `PageWrapper` | **Y** | PageWrapper + forms table | None | Feature owns |
| /build/[projectId]/forms/[formId] | `build/[projectId]/forms/[formId]/page.tsx` | **Y** | — | Form builder skeleton (feature) inside `PageWrapper` | **Y (partial)** | PageWrapper + form builder tabs | `features/build/forms/components/form-builder-tab.tsx` | Feature owns |
| /build/[projectId]/feedbucket | `build/[projectId]/feedbucket/page.tsx` | **Y** | — | PageWrapper + PmPageShell + 2 Skeleton blocks | **Y (partial)** | PageWrapper + feedbucket config card + feedback list | None | Feature owns |
| /build/[projectId]/feedbucket/[submissionId] | `build/[projectId]/feedbucket/[submissionId]/page.tsx` | **Y** | — | PageWrapper + 3 Skeleton blocks | **Y (partial)** | PageWrapper + submission detail panels | None | Feature owns |
| /build/[projectId]/files | `build/[projectId]/files/page.tsx` | **Y** | — | `ProjectFilesSkeleton` (feature) inside `PageWrapper` | **Y** — dedicated skeleton | PageWrapper + file browser | `features/build/files/project-files-skeleton.tsx` | Feature owns |
| /build/[projectId]/intake | `build/[projectId]/intake/page.tsx` | **Y** | — | PageWrapper + PmPageShell + 5 form-row Skeletons | **Y (partial)** | PageWrapper + intake form list | None | Feature owns |
| /build/[projectId]/triage | `build/[projectId]/triage/page.tsx` | **Y** | — | `TriagePageLoading` (feature) inside `PageWrapper` | **Y** — dedicated skeleton | PageWrapper + triage kanban | `features/build/triage/triage-page-loading.tsx` | Feature owns |
| /build/[projectId]/updates | `build/[projectId]/updates/page.tsx` | **Y** | — | PageWrapper + 3 update card Skeletons | **Y** | PageWrapper + action bar + update card list | None | Feature owns |
| /build/[projectId]/reports | `build/[projectId]/reports/page.tsx` | **Y** | — | PageWrapper + 2×2 chart panel grid | **Y** | PageWrapper + chart report grid | None | Feature owns |
| /build/[projectId]/whiteboard | `build/[projectId]/whiteboard/page.tsx` | **Y** | — | PageWrapper + left sidebar skeleton + canvas Skeleton | **Y** | PageWrapper + narrow sidebar + canvas area | None | Feature owns |
| /build/[projectId]/modules | `build/[projectId]/modules/page.tsx` | **Y** | — | `StatCardGridSkeleton` + module card blocks | **Y (partial)** | PageWrapper + module card grid | None | Feature owns |
| /build/[projectId]/client-portal | `build/[projectId]/client-portal/page.tsx` | **Y** | — | Skeleton bars inside `PmPageShell` | **Y (partial)** | PageWrapper + portal overview panels | None | Feature owns |
| /build/[projectId]/chat | `build/[projectId]/chat/page.tsx` | **Y** | — | `PmPageShell` + single large `PM_PANEL` Skeleton | **Y (partial)** — shows panel placeholder but not chat structure (thread list + composer) | PageWrapper + project chat shell | None | Feature owns |
| /build/[projectId]/wiki | `build/[projectId]/wiki/page.tsx` | **Y** | — | Bare `<div className="p-6 space-y-4">` — **no `PageWrapper`** — with title Skeleton + 6-card grid | **N** — not wrapped in `PageWrapper`; bare div padding; page uses `RequireModule → WikiHomePage` which has its own wrapper | PageWrapper (via WikiHomePage) + wiki home card grid | None | Feature owns |
| /build/[projectId]/wiki/[pageId] | `build/[projectId]/wiki/[pageId]/page.tsx` | **Y** | — | `PageDocumentSkeleton` (feature) | **Y** | Full-page document view | `features/wiki/components/page-document-skeleton.tsx` | Feature owns |
| /build/[projectId]/wiki/[pageId]/history | `build/[projectId]/wiki/[pageId]/history/page.tsx` | **Y** | — | `PageHistorySkeleton` (feature) inside `PageWrapper` | **Y** | PageWrapper + page history timeline | `features/wiki/components/page-history-skeleton.tsx` | Feature owns |

---

### build/[projectId] — settings pages

| route | page file | sibling? | inherited from | loading renders | mirrors? | ready-layout | feature skeleton | query-loading |
|---|---|---|---|---|---|---|---|---|
| /build/[projectId]/settings | `build/[projectId]/settings/page.tsx` | **Y** | — | PageWrapper + 2-col settings navigation skeleton | **Y (partial)** | PageWrapper + settings nav sidebar + content | `features/build/settings/project-settings-skeleton.tsx` | Feature owns |
| /build/[projectId]/settings/access | `build/[projectId]/settings/access/page.tsx` | **Y** | — | `ProjectAccessSkeleton` inside `PageWrapper` | **Y** | PageWrapper + member list + role panels | `features/build/settings/project-access-skeleton.tsx` | Feature owns |
| /build/[projectId]/settings/agents | `build/[projectId]/settings/agents/page.tsx` | **Y** | — | Agent list skeleton (feature) inside `PageWrapper` | **Y** | PageWrapper + agent token list | `features/build/settings/agent-token-list.tsx` | Feature owns |
| /build/[projectId]/settings/agents/credentials | `build/[projectId]/settings/agents/credentials/page.tsx` | **Y** | — | Credentials skeleton (feature) inside `PageWrapper` | **Y** | PageWrapper + credential form/list | same file | Feature owns |
| /build/[projectId]/settings/automations | `build/[projectId]/settings/automations/page.tsx` | **Y** | — | `AutomationsSkeleton` inside `PageWrapper` | **Y** | PageWrapper + automation rule list | `features/build/automations/automations-skeleton.tsx` | Feature owns |
| /build/[projectId]/settings/fields | `build/[projectId]/settings/fields/page.tsx` | **Y** | — | Custom fields skeleton (feature) inside `PageWrapper` | **Y** | PageWrapper + field list | Feature-specific | Feature owns |
| /build/[projectId]/settings/integrations | `build/[projectId]/settings/integrations/page.tsx` | **Y** | — | Integration card skeleton (feature) inside `PageWrapper` | **Y** | PageWrapper + integration cards | Feature-specific | Feature owns |
| /build/[projectId]/settings/integrations/webhooks | `build/[projectId]/settings/integrations/webhooks/page.tsx` | **Y** | — | `ProjectWebhooksSkeleton` inside `PageWrapper` | **Y** | PageWrapper + webhook list | `features/build/webhooks/project-webhooks-skeleton.tsx` | Feature owns |
| /build/[projectId]/settings/iterations | `build/[projectId]/settings/iterations/page.tsx` | **Y** | — | Iterations skeleton (feature) inside `PageWrapper` | **Y** | PageWrapper + iterations list | Feature-specific | Feature owns |
| /build/[projectId]/settings/portal | `build/[projectId]/settings/portal/page.tsx` | **Y** | — | Portal settings skeleton (feature) inside `PageWrapper` | **Y** | PageWrapper + portal config panels | Feature-specific | Feature owns |
| /build/[projectId]/settings/retention | `build/[projectId]/settings/retention/page.tsx` | **Y** | — | `RetentionSettingsSkeleton` inside `PageWrapper` | **Y** | PageWrapper + retention settings | `features/build/settings/retention-settings-skeleton.tsx` | Feature owns |
| /build/[projectId]/settings/views | `build/[projectId]/settings/views/page.tsx` | **Y** | — | Views skeleton (feature) inside `PageWrapper` | **Y** | PageWrapper + view list | `features/build/views/execution-core-gallery-frames.tsx` | Feature owns |
| /build/[projectId]/settings/workflow | `build/[projectId]/settings/workflow/page.tsx` | **Y** | — | `WorkflowSkeleton` inside `PageWrapper` | **Y** | PageWrapper + workflow status board | `features/build/workflow/workflow-skeleton.tsx` | Feature owns |

---

## Loading.tsx files in scope that are layout-level violators (FE-144 ban)

| File | Type | Direct sibling page? | Unrelated children it covers | Required action |
|---|---|---|---|---|
| `hr/loading.tsx` | Module-level (covers children) | Yes — `hr/page.tsx` | 19 child pages (see missing list above) | **Keep** for `hr/page.tsx`; create 19 new per-page siblings |
| `calendar/loading.tsx` | Covers one child | Yes — `calendar/page.tsx` | `calendar/settings/page.tsx` | **Keep**; create `calendar/settings/loading.tsx` |
| `chat/loading.tsx` | Covers one child | Yes — `chat/page.tsx` | `chat/invite/[inviteToken]/page.tsx` | **Keep**; create `chat/invite/[inviteToken]/loading.tsx` |
| `me/loading.tsx` | Orphan module-level | **No** — no `me/page.tsx` exists | All `me/*` (all have own sibling; file never fires) | **Delete** — renders banned `LoadingState variant="page"`; no sibling page |

---

## Existing skeleton components — full inventory

Fixers must reuse these before writing new ones.

### Primitive UI skeleton components (`components/`)

| Component | Path | Exports |
|---|---|---|
| `Skeleton` | `components/ui/skeleton.tsx` | `Skeleton` |
| `DataTableSkeleton` | `components/ui/data-table-skeleton.tsx` | `DataTableSkeleton` |
| `KanbanBoardSkeleton` | `components/ui/kanban-skeleton.tsx` | `KanbanBoardSkeleton` |
| `StatCardGridSkeleton`, `StatCardSkeleton` | `components/ui/stat-card.tsx` | `StatCardGridSkeleton`, `StatCardSkeleton` |
| `SurfaceBodySkeleton` | `components/ui/surface-body-skeleton.tsx` | `SurfaceBodySkeleton` |
| `LoadingState` _(do NOT use for pages)_ | `components/shared/loading-state.tsx` | `LoadingState` — valid only for sub-panel fills, never route `loading.tsx` |
| `ClockInWidgetSkeleton` | `components/attendance/clock-in-widget-skeleton.tsx` | `ClockInWidgetSkeleton` |
| `WidgetSkeleton` | `components/dashboard/widget-skeleton.tsx` | `WidgetSkeleton` |

### Feature skeleton components (`features/`)

| Component | Path |
|---|---|
| `SelfServiceHubSkeleton` | `features/me/hubs/self-service-hub-skeleton.tsx` |
| `ChatShellSkeleton` | `features/chat/chat-shell.tsx` |
| `DashboardPageSkeleton` | `features/dashboard/dashboard-page-skeleton.tsx` |
| `MailHeaderSkeleton`, `MailContentSkeleton` | `features/mail/mail-shell-skeletons.tsx` |
| `NotificationListSkeleton` | `features/notifications/notification-list-skeleton.tsx` |
| `NotificationDetailSkeleton` | `features/notifications/notification-detail-skeleton.tsx` |
| `PageDocumentSkeleton` | `features/wiki/components/page-document-skeleton.tsx` |
| `PageHistorySkeleton` | `features/wiki/components/page-history-skeleton.tsx` |
| `CompanyDocumentsSkeleton` | `features/wiki/components/company-documents-skeleton.tsx` |
| `CompanyDocumentDetailSkeleton` | `features/wiki/components/company-document-detail-skeleton.tsx` |
| `KnowledgeAnalyticsSkeleton` | `features/wiki/components/knowledge-analytics-skeleton.tsx` |
| `KbSharingSettingsSkeleton` | `features/wiki/components/kb-sharing-settings-skeleton.tsx` |
| `ContentHealthSkeleton` | `features/wiki/components/content-health-skeleton.tsx` |
| `SpaceDetailSkeleton` | `features/wiki/components/space-detail-skeleton.tsx` |
| `WikiTableRowsSkeleton`, `WikiTemplatesGridSkeleton` | `features/wiki/components/wiki-collection-skeletons.tsx` |
| `DetailSkeleton` (ticket detail) | `features/build/ticket-details/ticket-detail-skeleton.tsx` |
| `TicketPanelSkeleton` | `features/build/ticket-details/ticket-panel-skeleton.tsx` |
| `AllWorkSkeleton`, `AllWorkToolbarSkeleton` | `features/build/all-work/all-work-view-switcher.tsx` |
| `AutomationsSkeleton` | `features/build/automations/automations-skeleton.tsx` |
| `CyclesSkeleton` | `features/build/cycles/cycles-skeleton.tsx` |
| `ProjectFilesSkeleton` | `features/build/files/project-files-skeleton.tsx` |
| `GoalDetailSkeleton` | `features/build/goals/goal-detail-skeleton.tsx` |
| `GoalsSkeleton` | `features/build/goals/goals-skeleton.tsx` |
| `InboxPageSkeleton`, `InboxListSkeleton` | `features/build/inbox/inbox-page-skeleton.tsx`, `features/build/inbox/inbox-list-skeleton.tsx` |
| `ManagedProductOverviewRouteLoading`, `ProductProjectsRouteLoading`, etc. | `features/build/managed-products/managed-product-route-loading.tsx` |
| `BuildAccessLoading` | `features/build/members/build-access-loading.tsx` |
| `MilestonesPageSkeleton` | `features/build/milestones/milestones-page-skeleton.tsx` |
| `ListSkeleton` (project list) | `features/build/project-list/projects-page-skeletons.tsx` |
| `ProjectSettingsSkeleton` | `features/build/settings/project-settings-skeleton.tsx` |
| `ProjectAccessSkeleton` | `features/build/settings/project-access-skeleton.tsx` |
| `RetentionSettingsSkeleton` | `features/build/settings/retention-settings-skeleton.tsx` |
| `TemplatesGridSkeleton` | `features/build/templates/templates-grid-skeleton.tsx` |
| `TriagePageLoading` | `features/build/triage/triage-page-loading.tsx` |
| `WorkflowSkeleton` | `features/build/workflow/workflow-skeleton.tsx` |
| `ProjectWebhooksSkeleton` | `features/build/webhooks/project-webhooks-skeleton.tsx` |
| `CommandCenterLoading` | `features/build/command-center/command-center-loading.tsx` |
| `WorkspaceSearchResultsSkeleton` | `features/build/search/workspace-search-results-skeleton.tsx` |
| `ClientAccessSkeleton` | `features/portal-access/client-access-skeleton.tsx` |
| `EmployeesLoadingSkeleton` | `features/hr/employees/employees-loading-skeleton.tsx` |
| `OnboardingDetailSkeleton`, `ProbationSkeleton` | `features/hr/onboarding/onboarding-route-skeletons.tsx` |
| `SupportRequestsTableSkeleton` | `features/employee-support` (barrel) |

---

## Redirect-only and thin pages (affect how loading.tsx is built)

- `build/inbox/page.tsx` — contains a redirect call; its `loading.tsx` (`InboxPageSkeleton`) renders the inbox skeleton correctly, which shows briefly before the redirect. That is fine — a redirect page still needs a skeleton for SSR + slow connections.
- Most `build/[projectId]/*` pages are intentionally thin (4–12 non-blank lines) — they import a single feature component and may call `enforceRouteAccess`. Their `loading.tsx` is the right place for the skeleton. All have own siblings.

---

## Quality defects in existing loading.tsx files (not missing, but need fixing)

| File | Defect | Rule |
|---|---|---|
| `knowledge/wiki/import/loading.tsx` | Uses `LoadingState variant="form"` — generic spinner-family component, not an import form skeleton | FE-142, AP-9 |
| `me/loading.tsx` | Uses `LoadingState variant="page"` — generic; no `me/page.tsx` exists; file should be deleted | FE-144 |
| `hr/performance/analytics/loading.tsx` | Uses inline `animate-pulse` on raw `div` elements instead of `Skeleton` primitive | AP-9 |
| `build/[projectId]/wiki/loading.tsx` | Not wrapped in `PageWrapper` — bare `<div className="p-6">` — while the wiki home page uses `RequireModule → WikiHomePage` which has its own `PageWrapper` chain; structural mismatch | FE-142 |
| `hr/leaves/loading.tsx` | Missing tab bar; page renders two tabs (Leaves / WFH); loading shows only stat cards + single generic block | FE-142 (partial) |
| `chat/invite/[inviteToken]/loading.tsx` | **No own sibling** — inherits `chat/loading.tsx` which renders full `ChatShellSkeleton`; invite page is a single join-card, not a chat shell | FE-144 |
| `calendar/settings/loading.tsx` | **No own sibling** — inherits `calendar/loading.tsx` which renders calendar main skeleton; settings page is a tabbed settings panel | FE-144 |

---

## Fix batches (8 disjoint, balanced by count)

| Batch | Directories | Pages | Priority defects |
|---|---|---|---|
| **B1** | `dashboard`, `inbox`, `mail`, `chat`, `calendar`, `me` | 14 | Create `calendar/settings/loading.tsx`, `chat/invite/[inviteToken]/loading.tsx`; delete `me/loading.tsx` (orphan) |
| **B2** | `knowledge` (all) | 21 | Fix `knowledge/wiki/import/loading.tsx` (replace `LoadingState` with import form skeleton) |
| **B3** | `hr/employees/**`, `hr/org`, `hr/org-chart`, `hr/analytics`, `hr/kpis`, `hr/engagement`, `hr/event-stream` | 15 | Create `hr/employees/find-expert/loading.tsx`, `hr/employees/skills-matrix/loading.tsx`; create `hr/engagement/loading.tsx` |
| **B4** | `hr/leaves/**`, `hr/attendance`, `hr/onboarding/**`, `hr/performance/**`, `hr/goals`, `hr/feedback`, `hr/cases`, `hr/helpdesk`, `hr/service-delivery`, `hr/overtime`, `hr/comp-off`, `hr/shifts`, `hr/rosters` | 25 | Create missing siblings for `hr/overtime`, `hr/comp-off`, `hr/rosters`, `hr/service-delivery`; fix `hr/leaves/loading.tsx` (add tab bar) |
| **B5** | `hr/benefits`, `hr/expenses`, `hr/reimbursements`, `hr/fnf`, `hr/assets`, `hr/asset-returns`, `hr/devices`, `hr/documents/**`, `hr/document-review`, `hr/document-types`, `hr/email-templates`, `hr/exit/**`, `hr/termination`, `hr/compensation-planning`, `hr/workforce`, `hr/workforce-cost`, `hr/positions`, `hr/identity`, `hr/biometric`, `hr/geofencing`, `hr/contingent`, `hr/delegations`, `hr/announcements`, `hr/approvals`, `hr/travel/**` | 27 | Create `hr/geofencing/loading.tsx` |
| **B6** | `hr/page`, `hr/compliance`, `hr/legal-holds`, `hr/labor-relations`, `hr/safety`, `hr/emergency`, `hr/equity`, `hr/background-verification`, `hr/accommodations`, `hr/access`, `hr/retention`, `hr/handbook`, `hr/holidays`, `hr/leave-policies`, `hr/simulator`, `hr/shifts`, `hr/work-logs`, `hr/settings/**` (all 14 pages including missing ones) | 25 | Create all 12 `hr/settings/*/loading.tsx` missing siblings; fix `hr/performance/analytics/loading.tsx` (replace animate-pulse with Skeleton) |
| **B7** | `build` cross-project (all-work, projects, teams, portfolios, programs, goals, managed-products/**, roadmap, search, command-center, my-work, approvals, templates, inbox, settings/**, my-work/@panel/**) | 30 | Quality review only — all have siblings; no major structural defects |
| **B8** | `build/[projectId]/**` (all project pages + settings pages + @panel) | 53 | Fix `build/[projectId]/wiki/loading.tsx` (wrap in `PageWrapper`); quality checks on chat/feedbucket/client-portal Skeleton approximations |

**Note:** B8 is larger (53 pages) but is architecturally cohesive — all pages share the `PmPageShell`/`PmPanel`/`PmSection` layout chrome, so a single fixer can work through them efficiently.
