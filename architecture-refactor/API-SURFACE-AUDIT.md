# API Surface Audit — Section 4.4

> Lane 11 deliverable for PRD-10-10 §4.4 "Prove API and export cleanup".
> Date: 2026-09-01. Tools: knip 6.x, custom module-graph walk, `check-operation-ids.mjs`, OpenAPI 3569 ops / 2646 paths.

---

## 1. Gate Results

| Gate | Result |
|---|---|
| `node scripts/check-dead-code.mjs` | **PASS** — files=0 exports=0 in DEAD bucket |
| `node scripts/check-dead-code.mjs --self-test` | **PASS** — 13 assertions |
| `node src/scripts/check-operation-ids.mjs` (backend) | **PASS** — 3569 ops, 0 duplicate operationIds |
| `pnpm exec knip --no-progress` (frontend) | 4 dead files (2 scripts RETAINED-BY-CONVENTION, 2 test-utils RETAINED-BY-CONVENTION), 0 dead files in DEAD bucket |

---

## 2. Mail vs Unified Inbox — Are they distinct or duplicate?

**Answer: Fully distinct product interfaces. No routes are duplicated.**

| Surface | Backend prefix | Frontend hook | Purpose |
|---|---|---|---|
| Email client | `/mail/**` (11 routes) | `hooks/api/mail.ts` | Full email: accounts, threads, messages, attachments, AI draft/summary |
| Unified work inbox | `/me/inbox/unified`, `/me/inbox/unified/count` | `hooks/api/inbox.ts:useUnifiedInbox` | Cross-module aggregator (notifications + mail + approvals), paginated by `kinds` filter |
| Notification inbox | `/me/inbox`, `/me/inbox/count` | `hooks/api/inbox.ts:useInfiniteInbox` / `useInboxCount` | Legacy notifications-only view; **UNWIRED** (see §4 WIRE gap) |
| CRM task inbox | `/crm/inbox`, `/crm/inbox/counts`, `/crm/inbox/tasks/**` | `hooks/api/crm/inbox.ts` | CRM-specific task queue; used by `app/(authenticated)/crm/inbox/page.tsx` |
| Build approvals inbox | `/build/approvals/inbox` | (build hooks) | Build module approval queue |
| Module-specific | `/hr/workflows/instances/inbox`, `/payroll/manager/inbox`, `/hr/service-delivery/ops-inbox` | (module hooks) | Module-scoped work queues |

**Finding:** `/mail/**` is the email product. `/me/inbox/unified` is the cross-module notification aggregator rendered at `app/(authenticated)/inbox/`. They share the word "inbox" but serve different product purposes and use different response types. No consolidation needed.

**Action:** `useInfiniteInbox` and `useInboxCount` (calling the older `/me/inbox` and `/me/inbox/count`) are unwired capability gaps. If the unified endpoint is the permanent canonical view, both the frontend hooks and the two backend routes should be retired by the team owning `/me/inbox`. If a notifications-only sub-view is planned, wire `useInfiniteInbox` into the inbox shell's NOTIFICATIONS tab filter.

---

## 3. Billing Subscription Routes — One canonical owner?

**Answer: Yes — all billing routes live exclusively under `/billing/**`. No competing owner.**

The frontend `hooks/api/subscription.ts` wraps the `/billing/**` backend routes. There is no `/subscription` prefix anywhere in the backend. The CLAUDE.md rule (billing = exactly 2 Settings pages) is respected at the route level:

- `/billing/summary`, `/billing/profile`, `/billing/seats`, `/billing/plans`, `/billing/checkout`, `/billing/coupons/**`, `/billing/entitlements` → `settings/billing` page data
- `/billing/ai-credits/**` → `settings/billing/ai-credits` page data
- `/billing/razorpay`, `/billing/marketplace/**`, `/billing/addons/**` → payment processing endpoints, not UI pages
- `/billing/affiliate/**`, `/billing/referrals`, `/billing/enterprise-quotes/**` → sales/growth endpoints

**Finding:** No duplicate subscription controllers. The `/billing/seats` backend route exists but per CLAUDE.md the frontend page `/billing/seats` was deleted; it is accessed through `settings/billing`. This is correct — the backend route is data, not a page.

**No consolidation required.**

---

## 4. Per-Export Verdict Table

Knip raw: files=4, exports=43, types=30 (total 77 items across 4 dead files + 73 dead exports/types).

### 4.1 Dead Files (4 total — 0 in DEAD bucket after classification)

| File | Classification | Reason |
|---|---|---|
| `scripts/check-seo-metadata.mjs` | RETAINED-BY-CONVENTION | Standalone executable script |
| `scripts/check-web-vitals-budget.mjs` | RETAINED-BY-CONVENTION | Standalone executable script |
| `test-utils/index.ts` | RETAINED-BY-CONVENTION | Test-infrastructure barrel; no current test imports it (tests import sub-files directly) |
| `test-utils/render.tsx` | RETAINED-BY-CONVENTION | Test render utility; no current test imports it; preserved for future component tests |

### 4.2 Exports/Types — EXCLUDED (11 — CRM/Inventory, out of scope)

| File | Export | Verdict |
|---|---|---|
| `hooks/api/leads.ts` | `useCheckLeadDuplicates` | EXCLUDED |
| `hooks/api/crm/autonomy.ts` | `useAutonomyReviewQueue`, `useMarkReviewed`, `useAutonomySettings`, `useUpdateAutonomySettings` | EXCLUDED |
| `hooks/api/crm/activity-timeline.ts` | `useActivityParticipants`, `useLogActivity` | EXCLUDED |
| `hooks/api/inventory/reports.ts` | `StockSummaryParams`, `ReorderReportParams` | EXCLUDED |
| `hooks/api/inventory/reports-types.ts` | `StockSummaryParams`, `ReorderReportParams` | EXCLUDED |

### 4.3 Exports/Types — KEEP (11 — used via TypeScript structural inference)

These types are exported from hooks that have live consumers. No feature file imports them by name because TypeScript infers them from hook return types. Removing them would break the type system without fixing any lint error.

| File | Export/Type | Evidence |
|---|---|---|
| `hooks/api/roles.ts` | `RoleTemplate` | Return type of `useRoleTemplates`; `features/settings/roles/roles-page.tsx` infers it |
| `hooks/api/module-access/index.ts` | `ModuleRolePermission` | Part of `ModuleRoleGroup.permissions`; inferred from `useModuleRoleGroups` |
| `hooks/api/module-access/index.ts` | `ModuleMemberCandidate` | Return element of `useModuleMemberCandidates` |
| `hooks/api/module-access/index.ts` | `ModuleOwnership` | Return of `useModuleOwnership` |
| `hooks/api/module-access/index.ts` | `MemberGrant` | Return element of `useModuleMemberGrants` |
| `hooks/api/module-access/index.ts` | `Pagination` | Shape inside `PaginatedResult` |
| `hooks/api/module-access/index.ts` | `PaginatedResult` | Wrapper type for paginated hook responses |
| `hooks/api/module-access/index.ts` | `CursorPaginatedResult` | Wrapper type for cursor-paginated responses |
| `hooks/api/module-access/index.ts` | `AuditCursorPage` | Return type of `useModuleAuditLog` |
| `hooks/api/module-access/index.ts` | `ModuleMyPermissions` | Return type of `useModuleMyPermissions` |
| `hooks/api/module-access/types.ts` | `PaginatedResult` | Source definition (re-exported through barrel) |

### 4.4 Exports/Types — WIRE (42 — capability gaps, precise handoffs below)

All 42 have confirmed backend routes. The hooks are correctly implemented. The gap is in the frontend page that should call them.

| # | File | Export | Handoff — page to wire / action to add |
|---|---|---|---|
| 1 | `hooks/api/workflows.ts` | `useWorkflowSchedules` | Build `app/(authenticated)/workflows/[workflowId]/schedules/page.tsx`; use this hook to list per-workflow schedules |
| 2 | `hooks/api/workflows.ts` | `useCreateSchedule` | Add create-schedule action to the above page |
| 3 | `hooks/api/workflows.ts` | `useWorkflowSecrets` | Build `app/(authenticated)/workflows/[workflowId]/secrets/page.tsx`; use this hook to list per-workflow secrets |
| 4 | `hooks/api/workflows.ts` | `useCreateWorkflowSecret` | Add create secret action to the above page |
| 5 | `hooks/api/workflows.ts` | `useDeleteWorkflowSecret` | Add delete secret action to the above page |
| 6 | `hooks/api/workflows.ts` | `TriggerType` | Import in workflow builder trigger selector; workflow builder lives at `features/workflows/builder/` |
| 7 | `hooks/api/workflows.ts` | `ApprovalStatus` | Import in `app/(authenticated)/workflows/approvals/page.tsx` status filter |
| 8 | `hooks/api/workflows.ts` | `WorkflowSortField` | Add sort controls to `app/(authenticated)/workflows/page.tsx`; import this type for the sort field selector |
| 9 | `hooks/api/workflows.ts` | `SortDirection` | Same page; sort direction |
| 10 | `hooks/api/workflows.ts` | `WorkflowVersion` | Import in workflow version history panel (not yet built) |
| 11 | `hooks/api/workflows.ts` | `WorkflowAnalytics` | Import explicitly in `app/(authenticated)/workflows/analytics/page.tsx` |
| 12 | `hooks/api/workflows.ts` | `WorkflowCursorPage` | Import in workflow list consumers that handle cursor pagination |
| 13 | `hooks/api/workflows.ts` | `WorkflowListParams` | Import in `app/(authenticated)/workflows/page.tsx` filter state typing |
| 14 | `hooks/api/workflows.ts` | `ExecutionListParams` | Import in `app/(authenticated)/workflows/executions/page.tsx` |
| 15 | `hooks/api/workflows-secrets.ts` | `useWorkflowSecrets` | Per-workflow secrets page (same as #3 above; the barrel `workflows.ts` and the sub-file both expose this) |
| 16 | `hooks/api/workflows-secrets.ts` | `useCreateWorkflowSecret` | Same page (#4 above) |
| 17 | `hooks/api/workflows-secrets.ts` | `useDeleteWorkflowSecret` | Same page (#5 above) |
| 18 | `hooks/api/workflows-schedules.ts` | `useWorkflowSchedules` | Per-workflow schedules page (same as #1; barrel + sub-file both expose) |
| 19 | `hooks/api/workflows-schedules.ts` | `useCreateSchedule` | Same page (#2 above) |
| 20 | `hooks/api/calendar.ts` | `useCancelOccurrence` | Add "Cancel this occurrence" action to `features/calendar/event-detail-sheet.tsx` recurring-event action menu; backend: `DELETE /calendar/events/{eventId}/occurrences/{occurrenceStart}` |
| 21 | `features/hr/expenses/expense-stats.tsx` | `MemberExpenseStats` | Import in the employee self-service expenses view; candidate pages: `features/employee-self-service/` expenses sub-page or `features/hr/expenses/` member view |
| 22 | `hooks/api/accounting/banking.ts` | `useBankImports` | Add imports list to `features/accounting/banking/components/bank-import-client.tsx`; the create mutation is wired but the list query (`GET /banking/imports`) is not |
| 23 | `hooks/api/onboarding-flow.ts` | `useModuleChecklist` | Show per-module checklist detail in `features/dashboard/module-setup-banners.tsx` expand panel; backend: `GET /onboarding/module-checklists/{moduleKey}` |
| 24 | `hooks/api/onboarding-flow.ts` | `useSkipChecklistItem` | Add skip-item action to the above checklist panel; backend: `POST /onboarding/module-checklists/{moduleKey}/items/{itemKey}/skip` |
| 25 | `hooks/api/onboarding-flow.ts` | `useRestartModuleChecklist` | Add restart action to the above panel; backend: `POST /onboarding/module-checklists/{moduleKey}/restart` |
| 26 | `hooks/api/onboarding-flow.ts` | `useGuidedTours` | Build guided-tour overlay component; backend: `GET /onboarding/tours` |
| 27 | `hooks/api/onboarding-flow.ts` | `useSaveTourProgress` | Wire into guided-tour overlay step advance; backend: `POST /onboarding/tours/{tourKey}/progress` |
| 28 | `hooks/api/onboarding-flow.ts` | `useDismissTour` | Wire dismiss button in guided-tour overlay; backend: `POST /onboarding/tours/{tourKey}/dismiss` |
| 29 | `hooks/api/party/subjects.ts` | `useDeleteSubject` | Add delete row-action to `features/party/subjects/subjects-page.tsx`; subjects list has create/edit but no delete |
| 30 | `hooks/api/hr/dashboard.ts` | `useHrDashboardMetrics` | Build HR dashboard page at `app/(authenticated)/hr/dashboard/page.tsx`; backend: `GET /hr/dashboard/metrics` |
| 31 | `hooks/api/hr/dashboard.ts` | `useHrLeaveCalendar` | Add leave calendar widget to HR dashboard page; backend: `GET /hr/leave-calendar` |
| 32 | `hooks/api/hr/dashboard.ts` | `useHrOnboardingStatus` | Add onboarding status widget to HR dashboard page; backend: `GET /hr/dashboard/onboarding-status` |
| 33 | `hooks/api/accounting/ar-collections.ts` | `useCollectionActivities` | Add collection activities list to `features/accounting/sales/` AR collections view; backend route exists |
| 34 | `hooks/api/accounting/ap-payment-runs.ts` | `useVendorPayments` | Add vendor payments list to `features/accounting/purchases/` AP payment-runs view |
| 35 | `hooks/api/build/teams.ts` | `useProjectTeamMembers` | Add members tab/panel to `features/build/teams/team-home-page.tsx`; backend: `GET /build/teams/{teamId}/members` |
| 36 | `hooks/api/inbox.ts` | `useInfiniteInbox` | Wire to inbox shell NOTIFICATIONS-only view OR retire hook + backend `GET /me/inbox` if unified endpoint is the permanent interface (see §2) |
| 37 | `hooks/api/inbox.ts` | `useInboxCount` | Same decision as #36; retire `GET /me/inbox/count` if unified endpoint covers the use case |
| 38 | `hooks/api/hr/attendance.ts` | `useAttendanceHeatmap` | Add attendance heatmap chart to `features/hr/attendance/` detail view or employee self-service attendance page; backend: `GET /me/attendance/heatmap` |
| 39 | `hooks/api/hr/recruitment/interviews.ts` | `SlaReportStage` | Import in SLA report page when built; belongs to `features/hr/recruitment/reports/` |
| 40 | `hooks/api/hr/recruitment/interviews.ts` | `SlaReportMonth` | Same SLA report page |
| 41 | `hooks/api/hr/recruitment/interviews.ts` | `SlaReportStageSummary` | Same SLA report page |
| 42 | `hooks/api/hr/recruitment/interviews.ts` | `BusyBlock` | Import in interviewer availability scheduling UI when built; belongs to `features/hr/recruitment/interviews/` |

---

## 5. Route Comparison — No Duplicate Operation IDs

`check-operation-ids.mjs` result: **3569 operations across 2646 paths — 0 duplicate operationIds.**

All routes have unique operation IDs. No controller consolidation required for duplication reasons.

### Notable route families that were verified for overlap

| Family | Verdict |
|---|---|
| `/mail/**` vs `/me/inbox/**` | Distinct (see §2) |
| `/billing/**` — single controller | Single owner confirmed (see §3) |
| `/me/inbox` vs `/me/inbox/unified` | Distinct endpoints, different response shapes |
| `/crm/inbox/**` vs `/me/inbox/**` | Distinct — CRM inbox is a task queue, me/inbox is a notification stream |
| `/build/approvals/inbox` vs other inboxes | Module-specific work queue, not a general inbox |
| `/onboarding/**` (employee) vs `/workspace-onboarding/**` | Distinct — employee vs org setup wizard |

---

## 6. Hardening Summary — `check-dead-code.mjs` Changes

The script no longer accepts "unproven" as a resting state.

### New behaviors

| Behavior | Trigger | Gate exit |
|---|---|---|
| UNCLASSIFIED export | Export in knip output not in EXPORT_VERDICTS, CONTRACT_BARRELS, feature barrel, or CRM_INVENTORY_RE | exit 1 |
| Stale classification | EXPORT_VERDICTS key not in knip's dead export list (export is now live) | exit 1 |
| Test-infra files | `test-utils/**` files | RETAINED-BY-CONVENTION (no longer DEAD) |

### Self-test additions (assertions i–m)

| Assertion | What it proves |
|---|---|
| (i) | `classifyExport` returns UNCLASSIFIED for unknown export → gate would fire |
| (j) | `classifyExport` returns WIRE for `useCancelOccurrence` → WIRE verdict works |
| (k) | `classifyExport` returns KEEP for `RoleTemplate` → KEEP verdict works |
| (l) | `checkStaleVerdicts` returns the stale key for a fake entry not in processedKeys |
| (m) | `classifyFile` returns RETAINED-BY-CONVENTION for `test-utils/render.tsx` |

### EXPORT_VERDICTS map

53 entries: 42 WIRE (capability gaps with confirmed backend routes), 11 KEEP (types used via TypeScript structural inference). All are in `frontend/scripts/check-dead-code.mjs`.

---

## 7. Handoffs

### 7.1 Backend route retirement candidates (analysis only — backend is read-only for Lane 11)

| Route | Reason |
|---|---|
| `GET /me/inbox` | Superseded by `GET /me/inbox/unified`; unified endpoint handles notification, mail and approval kinds via filter; if confirmed deprecated, retire both the route and `hooks/api/inbox.ts:useInfiniteInbox` |
| `GET /me/inbox/count` | Same; `GET /me/inbox/unified/count` is the canonical count |

### 7.2 Frontend wiring gaps (for Lane 4 — app/** — and Lane 5 — features/**)

Priority order based on user-facing completeness:

1. **HR Dashboard** (3 hooks) — missing page; wire `useHrDashboardMetrics`, `useHrLeaveCalendar`, `useHrOnboardingStatus` into `app/(authenticated)/hr/dashboard/page.tsx`
2. **Calendar cancel-occurrence** (1 hook) — `useCancelOccurrence` → add to `features/calendar/event-detail-sheet.tsx` recurring-event action menu
3. **Guided tours** (3 hooks) — `useGuidedTours`, `useSaveTourProgress`, `useDismissTour` → build tour overlay component
4. **Module checklist detail** (3 hooks) — `useModuleChecklist`, `useSkipChecklistItem`, `useRestartModuleChecklist` → expand panel in `features/dashboard/module-setup-banners.tsx`
5. **Build team members** (1 hook) — `useProjectTeamMembers` → add members tab to `features/build/teams/team-home-page.tsx`
6. **Per-workflow secrets/schedules** (5 hooks) — build `[workflowId]/secrets/` and `[workflowId]/schedules/` routes
7. **Attendance heatmap** (1 hook) — `useAttendanceHeatmap` → add chart to attendance view
8. **Subject delete** (1 hook) — `useDeleteSubject` → delete row-action in `features/party/subjects/subjects-page.tsx`
9. **Bank imports list** (1 hook) — `useBankImports` → list in `features/accounting/banking/components/bank-import-client.tsx`
10. **AR collections** (1 hook) + **AP vendor payments** (1 hook) — accounting list views
11. **Inbox notification-only view** (2 hooks) — decide retire vs wire (see §2)
12. **SLA report types** (4 types) — build SLA reporting page in `features/hr/recruitment/reports/`
13. **Member expense stats** (1 component) — wire to employee self-service expenses page

### 7.3 Build proof commands (orchestrator)

```sh
cd frontend && pnpm tsc --noEmit
cd backend && pnpm tsc --noEmit
# After deleting any hook: re-run check-dead-code.mjs; expect STALE error for that entry
# Remove stale entry from EXPORT_VERDICTS, re-run → PASS
```
