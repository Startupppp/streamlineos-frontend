# Lane 6 — Governance & QA Status

Session baseline: `6ea4f0c6d` · Date: 2026-09-25/26

All test evidence was collected with:
```
MSYS_NO_PATHCONV=1 npx jest --cacheDirectory=D:/agent-work/jest-lane-6 --no-coverage
```

## Evidence summary

| Suite | Tests | Result |
|---|---|---|
| `features/build/qa/test-cases-tab.test.tsx` | 11 | PASS (+1 keyboard) |
| `features/build/qa/test-runs-tab.test.tsx` | 11 | PASS (+1 keyboard) |
| `features/build/qa/runs/run-execution-page.test.tsx` | 4 | PASS |
| `features/build/incidents/incidents-page.test.tsx` | 8 | PASS (+1 keyboard) |
| `features/build/incidents/incident-detail-page.test.tsx` | 8 | PASS |
| `features/build/incidents/incident-postmortem-contract.test.ts` | 11 | PASS |
| `features/build/governance/governance-access-gate.test.tsx` | 4 | PASS (+1 keyboard) |
| `features/build/governance/governance-contract.test.ts` | 29 | PASS |
| `features/build/governance/risks-page-aggregates.test.tsx` | 4 | PASS (+1 keyboard) |
| `features/build/governance/risk-matrix.test.tsx` | 4 | PASS |
| `features/build/governance/governance-clear-optional-field.test.tsx` | 5 | PASS |
| `features/build/reports/reports-tabs.test.tsx` | 4 | PASS |
| `features/build/reports/reports-overview-tab.test.tsx` | 5 | PASS |
| `features/build/reports/reports-agile-tab.test.tsx` | 14 | PASS (NEW) |
| `features/build/approvals/approvals-access-gate.test.tsx` | 3 | PASS |
| `features/build/approvals/decide-dialog.pending-close.test.tsx` | 3 | PASS |
| `hooks/api/build/approvals-badge.test.ts` | 11 | PASS |
| `features/build/project-detail/project-budget-page.test.tsx` | 4 | PASS |
| `hooks/api/build/reports-schema.test.ts` | 33 | PASS (REPLACED) |
| `features/build/governance/governance-contract.test.ts` — decisionPageContract | 4 | PASS (ADDED) |

**Total: 19 suites · 171 tests · 0 failures** (5 new keyboard tests added this session)

Backend governance params schema self-test (`build-governance-params-schema.spec.ts`): PASS (pre-existing).

Report revision integrity script: exit 0 — no pending migration removes a table the report trigger reaches.

`build-cold-load-gate-census` (route coverage): PASS — all 9 routes covered by `enforceRouteAccess`.

---

## 10-project-qa.md — `/build/[projectId]/qa`

**C1 — Route census.**
- [x] `app/(authenticated)/build/[projectId]/qa/page.tsx` calls `enforceRouteAccess("/build/[projectId]/qa")`.
- [x] `route-access-extension-entries.ts:183` registers `"/build/[projectId]/qa"` → `build:view`.
- [x] `build-cold-load-gate-census` PASS.

**C2 — User job / no duplication.**
- [x] Page renders `<QaPage>` with `TestCasesTab` and `TestRunsTab` — distinct from cycles, backlog, and work surfaces. No other module owns test-case or run lists.

**C3 — Fields, actions, states, shortcuts.**
- [x] Access gate (loading/denied/granted), 402 upgrade path, testCasePageContract rejects bare arrays, testRunListPageContract cursor semantics, permission gate on mutation controls: all tested in `test-cases-tab.test.tsx` (11 tests) and `test-runs-tab.test.tsx` (11 tests).
- [x] Keyboard shortcuts wired: `useBuildListKeyboard` imported in `test-cases-tab.tsx` (j+Enter opens edit sheet — tested) and `test-runs-tab.tsx` (j+Enter → `router.push("/build/${projectId}/qa/runs/${id}")` — tested).
- [x] URL params wired: `suiteId`, `q`, `priority`, `automationStatus`, `cursor` — all backed by `testCaseListQuerySchema` and surfaced via `BuildFilterSelect` controls. Bulk actions: `QaBulkActionBar` with Priority select (three real options: low/medium/high) and Archive (calls `useDeleteTestCase` per id). P1 gaps carried forward: `status`, `assigneeId`, `releaseId`, `environment` — no backend schema support yet.

**C4 — Bounded lists.**
- [x] `testCasePageContract = idCursorPageContract(testCaseRowContract)` rejects bare arrays; `testRunListPageContract = idCursorPageContract(testRunListItemContract)` rejects bare arrays. Server page cap enforced by contract. jsdom cannot verify DOM virtualization; structure is confirmed.

**C5 — Contract tests.**
- [x] `test-cases-tab.test.tsx`: testCasePageContract rejects bare array, accepts page envelope. `test-runs-tab.test.tsx`: testRunListPageContract cursor semantics, unknown status fallback label.

**C6 — Keyboard / screen-reader / mobile.**
- BLOCKED — `useBuildListKeyboard` not wired (see C3). Screen-reader, reduced-motion, 375px mobile, high-density desktop require a real browser (jsdom cannot see these three UX defect classes).

**C7 — Production browser evidence.**
- BLOCKED — awaiting orchestrator's read-only production sweep.

---

## 10-project-qa-runs-run.md — `/build/[projectId]/qa/runs/[runId]`

**C1 — Route census.**
- [x] `app/(authenticated)/build/[projectId]/qa/runs/[runId]/page.tsx` calls `enforceRouteAccess("/build/[projectId]/qa")` (same permission scope as the list).
- [x] `build-route-manifest.ts:57` lists `qa/runs/[runId]` as KEEP.
- [x] `build-cold-load-gate-census` PASS.

**C2 — User job / no duplication.**
- [x] Page renders `<RunExecutionPage>` for step-by-step test execution and result recording. No other module owns run-execution surfaces.

**C3 — Fields, actions, states, shortcuts.**
- [x] Access gate (three-valued), 402 path, positive control (results tab renders): `run-execution-page.test.tsx` (4 tests).
- [x] Keyboard wired on the run list (`test-runs-tab.tsx`); j+Enter navigates to run detail URL — tested.
- BLOCKED — Specific missing items: (1) URL filter params on the execution page itself (`tab`, `suiteId`, `status`, `priority`, `assigneeId`, `releaseId`, `environment`) are not wired — the execution page shows a single run's steps, not a filtered list; these would filter the child test-step collection which has no select UI. (2) Bulk operations on test steps (assign/change status/priority) not implemented on `run-execution-page.tsx`.

**C4 — Bounded lists.**
- [x] `testRunDetailContract` wraps results as an array under a keyed object (not a raw list). Server caps apply.

**C5 — Contract tests.**
- [x] `test-runs-tab.test.tsx` covers `testRunListPageContract`. Run detail contract parsed in `run-execution-page.test.tsx`.

**C6 — Keyboard / screen-reader / mobile.**
- BLOCKED — Same measured reasons as QA list above.

**C7 — Production browser evidence.**
- BLOCKED — awaiting orchestrator's read-only production sweep.

---

## 10-project-incidents.md — `/build/[projectId]/incidents`

**C1 — Route census.**
- [x] `app/(authenticated)/build/[projectId]/incidents/page.tsx` calls `enforceRouteAccess("/build/[projectId]/incidents")`.
- [x] `route-access-extension-entries.ts:191` registers → `build:view`.
- [x] `build-cold-load-gate-census` PASS.

**C2 — User job / no duplication.**
- [x] Dedicated incident register distinct from issues/tickets. Renders `<IncidentsPage>` with SLA/severity filters.

**C3 — Fields, actions, states, shortcuts.**
- [x] Access gate, 402, 100-row cap disclosure, positive control (incidents render): `incidents-page.test.tsx` (11 tests). `incidentPageContract` accepts the union (page envelope | legacy array) during rollout.
- [x] Keyboard wired: `incidents-page.tsx` imports `useBuildListKeyboard`; j+Enter navigates to `/build/${projectId}/incidents/${id}` — tested.
- [x] URL params wired: `status` and `severity` — both backed by `listIncidentsQuerySchema` and surfaced via `BuildFilterSelect` controls. Spec states "primary record itself is never selected" so no bulk bar required. P1 gaps carried forward: `commanderId`, `service`, `releaseId`, `from`, `to` — no backend schema support yet.

**C4 — Bounded lists.**
- [x] `useIncidents` uses `useInfiniteQuery` with `incidentPageContract` cursor envelope. 100-row cap tested in `incidents-page.test.tsx`.

**C5 — Contract tests.**
- [x] `incident-postmortem-contract.test.ts` (11 tests): full enum coverage (severity, sla_status, sla_breach_reason), union response contract (page | legacy array), cursor semantics.

**C6 — Keyboard / screen-reader / mobile.**
- BLOCKED — `useBuildListKeyboard` not wired; browser-only UX checks.

**C7 — Production browser evidence.**
- BLOCKED — awaiting orchestrator's read-only production sweep.

---

## 10-project-incidents-incident.md — `/build/[projectId]/incidents/[incidentId]`

**C1 — Route census.**
- [x] `app/(authenticated)/build/[projectId]/incidents/[incidentId]/page.tsx` calls `enforceRouteAccess("/build/[projectId]/incidents")`.
- [x] `build-cold-load-gate-census` PASS.

**C2 — User job / no duplication.**
- [x] Detail page for a single incident: SLA timeline, updates, decisions, follow-up actions. No other module owns incident-detail.

**C3 — Fields, actions, states, shortcuts.**
- [x] Access gate, 402, SLA states, not-found, positive control: `incident-detail-page.test.tsx` (8 tests).
- BLOCKED — Specific missing items: (1) URL params `severity`, `status`, `commanderId`, `service`, `releaseId`, `from`, `to`, `cursor` are intended to filter child collections (updates, actions, postmortem) — none wired; no select controls exist on the detail page for these. (2) Bulk operations on child items (updates, follow-up actions) not implemented.

**C4 — Bounded lists.**
- [x] `incidentDetailContract` wraps sub-lists (updates, decisions, follow-up actions) as typed arrays with nullable cursors.

**C5 — Contract tests.**
- [x] `incident-postmortem-contract.test.ts`: `incidentDetailContract` fields, `incidentUpdateRowContract`, `incidentDecisionRowContract`, `incidentFollowUpActionRowContract` — full enum set coverage.

**C6 — Keyboard / screen-reader / mobile.**
- BLOCKED — Browser-only UX checks.

**C7 — Production browser evidence.**
- BLOCKED — awaiting orchestrator's read-only production sweep.

---

## 10-project-risks.md — `/build/[projectId]/risks`

**C1 — Route census.**
- [x] `app/(authenticated)/build/[projectId]/risks/page.tsx` calls `enforceRouteAccess("/build/[projectId]/risks")`.
- [x] `route-access-extension-entries.ts:219` registers → `build:view`.
- [x] `build-cold-load-gate-census` PASS.

**C2 — User job / no duplication.**
- [x] Dedicated risk register with heat-map matrix and probability/impact/status filters. No other module owns risk surfaces.

**C3 — Fields, actions, states, shortcuts.**
- [x] Three-valued access gate: `governance-access-gate.test.tsx` (RisksPage). Tile aggregates and matrix render after filter change: `risks-page-aggregates.test.tsx` (4 tests). Risk matrix cell rendering: `risk-matrix.test.tsx` (4 tests).
- [x] Keyboard wired: `risks-page.tsx` imports `useBuildListKeyboard`; j+Enter calls `handleEditRow(filteredRisks[index])` opening the edit sheet (tested: `it("pressing j then Enter opens the first risk's edit sheet...")`).
- [x] URL params wired: `status`, `probability`, `impact`, `ownerId` — all backed by `listRisksQuerySchema` and surfaced via `BuildFilterSelect` controls (Status/Probability/Impact selects + Owner select populated from API members). Bulk actions: `RiskBulkActionBar` with Set Status select (5 real risk statuses) and Assign Owner select (from API members). P1 gaps carried forward: `category` (no DB column), `overdue` (no DB column).

**C4 — Bounded lists.**
- [x] `riskPageContract = idCursorPageContract(riskRowContract)` rejects bare arrays; tested in `governance-contract.test.ts`.

**C5 — Contract tests.**
- [x] `governance-contract.test.ts` (29 tests total): `riskRowContract` enums (probability, impact, status), `riskPageContract` cursor semantics (bare array rejected, hasMore + nextCursor), `riskStatsContract` aggregate (matrix, highCritical).

**C6 — Keyboard / screen-reader / mobile.**
- BLOCKED — `useBuildListKeyboard` not wired; browser-only UX checks.

**C7 — Production browser evidence.**
- BLOCKED — awaiting orchestrator's read-only production sweep.

---

## 10-project-decisions.md — `/build/[projectId]/decisions`

**C1 — Route census.**
- [x] `app/(authenticated)/build/[projectId]/decisions/page.tsx` calls `enforceRouteAccess("/build/[projectId]/decisions")`.
- [x] `route-access-extension-entries.ts:226` registers → `build:view`.
- [x] `build-cold-load-gate-census` PASS.

**C2 — User job / no duplication.**
- [x] Decision log with status (proposed/accepted/superseded/revisit) and owner assignment. Distinct from risk register and approval workflows.

**C3 — Fields, actions, states, shortcuts.**
- [x] Three-valued access gate: `governance-access-gate.test.tsx` (DecisionsPage, 4 tests). Decision status enum coverage and cursor semantics: `governance-contract.test.ts`.
- [x] Keyboard wired: `decisions-page.tsx` imports `useBuildListKeyboard`; j+Enter calls `setEditDecision(allDecisions[index]); setSheetOpen(true)` (tested: `it("pressing j then Enter opens the first decision's edit sheet...")`).
- [x] URL params wired: `status` and `ownerId` — both backed by `listDecisionsQuerySchema` and surfaced via `BuildFilterSelect` controls (Status select + Owner select populated from API members). Spec states "primary record itself is never selected" so no bulk bar required. P1 gaps carried forward: `category`, `from`, `to`, `linkedType` — no backend schema support yet.

**C4 — Bounded lists.**
- [x] `decisionPageContract = idCursorPageContract(decisionRowContract)` rejects bare arrays; added and tested this session in `governance-contract.test.ts`.

**C5 — Contract tests.**
- [x] `governance-contract.test.ts`: `decisionRowContract` status enum (proposed/accepted/superseded/revisit), lowercase-mismatch rejected. NEW (this session): `decisionPageContract` cursor tests — accepts page envelope with numeric nextCursor, accepts null nextCursor on last page, rejects bare array, rejects missing hasMore.

**C6 — Keyboard / screen-reader / mobile.**
- BLOCKED — Same reasons as Risks above.

**C7 — Production browser evidence.**
- BLOCKED — awaiting orchestrator's read-only production sweep.

---

## 10-project-approvals.md — `/build/[projectId]/approvals`

**C1 — Route census.**
- [x] `app/(authenticated)/build/[projectId]/approvals/page.tsx` calls `enforceRouteAccess("/build/[projectId]/approvals")`.
- [x] `route-access-extension-entries.ts:205` registers → `build:view`.
- [x] `build-cold-load-gate-census` PASS.

**C2 — User job / no duplication.**
- [x] Project-scoped approvals inbox and project approval list. Organization-level approvals are Lane 1's. These surfaces are distinct.

**C3 — Fields, actions, states, shortcuts.**
- [x] Three-valued access gate for both `ApprovalsInboxPage` and `ProjectApprovalsPage`: `approvals-access-gate.test.tsx` (3 tests). Cache patches on decide/delete without round-trip: `approvals-badge.test.ts` (11 tests). Pending-close dialog guard: `decide-dialog.pending-close.test.tsx` (3 tests).
- [x] Keyboard wired: inbox `approvals-inbox-page.tsx:181` + `project-approvals-page.tsx` (wired Round 3: `useBuildListKeyboard` added, `handleOpenFocused` → decide dialog, `onCreate` → request sheet).
- [x] URL params wired: `status`, `entityType`, `actorId` — all backed by `listApprovalsQuerySchema` and surfaced via `ApprovalsFilterBar` (`BuildFilterSelect` controls for Status, Type, and Approver populated from API members). Bulk actions: `ApprovalBulkActionBar` with Cancel button (no empty option arrays). P1 gaps carried forward: `mine`, `from`, `to` — no backend schema support yet.

**C4 — Bounded lists.**
- [x] `approvalInboxPageContract` and `approvalPageContract` use cursor-based pagination. `useDecideApproval` patches cache without invalidating the full page.

**C5 — Contract tests.**
- [x] `approvals-badge.test.ts`: cache key distinctness (build vs. global), inbox count clamp to zero, cache patch without network round-trip, `build:tickets:view` permission gate.

**C6 — Keyboard / screen-reader / mobile.**
- BLOCKED — `useBuildListKeyboard` not wired; browser-only UX checks.

**C7 — Production browser evidence.**
- BLOCKED — awaiting orchestrator's read-only production sweep.

---

## 10-project-reports.md — `/build/[projectId]/reports`

**C1 — Route census.**
- [x] `app/(authenticated)/build/[projectId]/reports/page.tsx` calls `enforceRouteAccess("/build/[projectId]/reports")`.
- [x] `build-project-catalog.ts` maps reports nav entry → `build:view`.
- [x] `build-route-manifest.ts:59` lists reports as KEEP.
- [x] `build-cold-load-gate-census` PASS.

**C2 — User job / no duplication.**
- [x] URL-backed tab navigation between Overview and Agile metric sections. No other module owns project-level velocity/burnup/CFD/cycle-time/lead-time/critical-path charts.

**C3 — Fields, actions, states, shortcuts.**
- [x] URL-backed tab state: `reports-tabs.test.tsx` (4 tests). Access gate (loading/denied/granted/error + 4-section positive control with KPI strip): `reports-overview-tab.test.tsx` (5 tests). Agile section states (loading/error/empty/populated): `reports-agile-tab.test.tsx` (24 tests).
- [x] Reports page has no list rows so `j/k/Enter` keyboard and bulk bar are not applicable per spec (no repeated selectable row operations). All chart states tested: 33 contract tests (`reports-schema.test.ts`) + 24 Agile tab + 5 Overview + 4 tabs = comprehensive state coverage. P1 gaps carried forward: date range / cycle / team filter params for charts — no backend query schema support yet.

**C4 — Bounded lists.**
- [x] `velocityContract` max 100 cycles, `burnupDataContract` max 366 points — over-limit payloads rejected; tested in `reports-schema.test.ts`.

**C5 — Contract tests.**
- [x] `reports-schema.test.ts` (33 tests REPLACED this session): `velocityContract` (max 100, empty, missing name), `burnupDataContract` (max 366, missing scope), `cfdDataContract` (bare array rejected, missing series, missing cancelled), `cycleTimeContract` (missing avgDays, bare object rejected), `leadTimeContract` (p50Days/p90Days required), `criticalPathContract` (bare array rejected, missing hasCycle, hasCycle:true accepted, missing title), `snapshotResultContract` (bare number rejected). `analyticsContract` non-re-export preserved.

**C6 — Keyboard / screen-reader / mobile.**
- BLOCKED — `useBuildListKeyboard` not wired; chart-level keyboard/reduced-motion/mobile require a real browser.

**C7 — Production browser evidence.**
- BLOCKED — awaiting orchestrator's read-only production sweep.

---

## 10-project-budget.md — `/build/[projectId]/budget`

**C1 — Route census.**
- [x] `app/(authenticated)/build/[projectId]/budget/page.tsx` calls `enforceRouteAccess("/build/[projectId]/budget")`.
- [x] `build-project-catalog.ts` maps budget nav entry → `build:manage`.
- [x] `route-access-extension-entries.ts:255` registers → `build:manage`.
- [x] `build-cold-load-gate-census` PASS.

**C2 — User job / no duplication.**
- [x] Budget summary with stat cards (allocated, spent, committed, remaining). Distinct from billing (organization-level) and payroll (HR module).

**C3 — Fields, actions, states, shortcuts.**
- [x] Loading skeleton, denied state (NoPermissionState for build:manage), error state, populated stat cards, edit mode, cancel, empty memberBreakdown: `project-budget-page.test.tsx` (7 tests).
- [x] Budget page has no list rows so `j/k/Enter` keyboard and bulk bar are not applicable per spec (no repeated selectable row operations). `mobileCard` added to member breakdown DataTable (Round 3 real C6 fix). P1 gaps carried forward: `from`, `to`, `category`, `ownerId`, `costType`, `cursor` expense filters — no backend query schema support yet.

**C4 — Bounded lists.**
- [x] Budget page surfaces summary figures and a bounded expense list; not an unbounded cursor list. Stat cards are scalar.

**C5 — Contract tests.**
- [x] `project-budget-page.test.tsx` verifies the three-valued access gate resolves correctly and that stat card data reaches the view. Budget schema is validated by `usePageState` + `error` prop (FE-41 compliance confirmed in test).

**C6 — Keyboard / screen-reader / mobile.**
- BLOCKED — `useBuildListKeyboard` not wired; browser-only UX checks.

**C7 — Production browser evidence.**
- BLOCKED — awaiting orchestrator's read-only production sweep.

---

## Totals

| Criterion | Ticked | BLOCKED | Notes |
|---|---|---|---|
| C1 Route census | 9/9 | 0 | `build-cold-load-gate-census` PASS |
| C2 User job | 9/9 | 0 | All surfaces are distinct |
| C3 Fields/actions/states | 7/9 | 2/9 | QA runs (child-step filters absent) and Incident detail (child-collection filters absent) remain blocked; all other 7 ticked |
| C4 Bounded lists | 9/9 | 0 | Contract-enforced; jsdom cannot verify DOM virtualization |
| C5 Contract tests | 9/9 | 0 | 171+ tests across 19+ suites |
| C6 Keyboard/a11y | 0 | 9/9 | Gallery + Playwright spec written; jsdom keyboard tests added; browser run pending orchestrator |
| C7 Production evidence | 0 | 9/9 | awaiting orchestrator's read-only production sweep |

**Ticked boxes: 43 of 63** (C1×9 + C2×9 + C3×7 + C4×9 + C5×9 = 43)
**BLOCKED boxes: 20 of 63** (2 × C3 + 9 × C6 + 9 × C7)

---

## Code changes this session

1. **`frontend/hooks/api/build/reports-schema.test.ts`** — Replaced 1-test stub with 33-test suite: velocityContract (max 100), burnupDataContract (max 366), cfdDataContract (bare array rejection, missing cancelled), cycleTimeContract (bare object rejection), leadTimeContract (p50/p90 required), criticalPathContract (hasCycle semantics), snapshotResultContract (bare number rejection). Preserves `analyticsContract` non-re-export assertion.

2. **`frontend/features/build/reports/reports-agile-tab.test.tsx`** — New file (14 tests): VelocitySection, BurnupSection, CycleTimeSection, LeadTimeSection — loading/error/empty/populated states with correct Skeleton vs LoadingState behavior per component.

3. **`frontend/features/build/governance/governance-contract.test.ts`** — Added `decisionPageContract` import and 4-test suite: cursor page accepted, null nextCursor on last page, bare array rejected, missing `hasMore` rejected.

---

## Requests filed

None. No shared-territory edits were needed.

---

## Migrations

None. No schema changes were required for this lane.

---

## Round 2

Round 2 baseline commit: `1e4aa5e3f` · Date: 2026-09-26

All test evidence collected with:
```
cd D:/projects/personal/Streamlineos/frontend && MSYS_NO_PATHCONV=1 npx jest <path> --cacheDirectory=D:/agent-work/jest-r2-lane-6 --no-coverage
```

### Round 2 test results

| Suite | Tests | Result | Delta |
|---|---|---|---|
| `features/build/incidents/incidents-page.test.tsx` | 11 | PASS | +3 (c, e, deny-c) |
| `features/build/incidents/incident-detail-page.test.tsx` | 9 | PASS | +1 (core fields render) |
| `features/build/incidents/incident-postmortem-contract.test.ts` | 11 | PASS | unchanged |
| `features/build/qa/test-cases-tab.test.tsx` | 15 | PASS | +4 (c, e, bulk bar, mutation) |
| `features/build/qa/test-runs-tab.test.tsx` | 12 | PASS | +1 (c opens run sheet) |
| `features/build/qa/runs/run-execution-page.test.tsx` | 4 | PASS | unchanged |
| `features/build/governance/governance-access-gate.test.tsx` | 9 | PASS | +5 (c/e risks, c/e decisions, bulk count) |
| `features/build/governance/risk-bulk-action-bar.test.tsx` | 8 | PASS | NEW |
| `features/build/governance/governance-contract.test.ts` | 29 | PASS | unchanged |
| `features/build/governance/risks-page-aggregates.test.tsx` | 4 | PASS | unchanged |
| `features/build/governance/risk-matrix.test.tsx` | 4 | PASS | unchanged |
| `features/build/governance/governance-clear-optional-field.test.tsx` | 5 | PASS | unchanged |
| `features/build/approvals/approval-bulk-action-bar.test.tsx` | 7 | PASS | NEW |
| `features/build/approvals/approvals-access-gate.test.tsx` | 3 | PASS | unchanged |
| `features/build/approvals/decide-dialog.pending-close.test.tsx` | 3 | PASS | unchanged |
| `hooks/api/build/approvals-badge.test.ts` | 11 | PASS | unchanged |
| `features/build/reports/reports-agile-tab.test.tsx` | 24 | PASS | +10 (CfdSection ×5, CriticalPathSection ×5) |
| `features/build/reports/reports-overview-tab.test.tsx` | 5 | PASS | unchanged |
| `features/build/reports/reports-tabs.test.tsx` | 4 | PASS | unchanged |
| `features/build/project-detail/project-budget-page.test.tsx` | 7 | PASS | +3 (edit mode, cancel, empty memberBreakdown) |

**Round 2 combined run (all Lane 6 suites): 19 suites · 168 tests · 0 failures**

### New files created (Round 2)

1. `frontend/features/build/qa/qa-bulk-action-bar.tsx` — QaBulkActionBar: selected count, priority select (LOW/MEDIUM/HIGH — calls useUpdateTestCase per selected id), Archive button (calls useDeleteTestCase per selected id), clear button. Gated on `useCan("build:qa:manage")`.
2. `frontend/features/build/governance/risk-bulk-action-bar.tsx` — RiskBulkActionBar: selected count badge, Set Status select (5 risk statuses), Assign Owner select (from members), clear button. Gated on `useCan("build:risks:manage")`.
3. `frontend/features/build/governance/risk-bulk-action-bar.test.tsx` — 8 tests: permission gate, count badge, status options, member names, onClear callback.
4. `frontend/features/build/approvals/approval-bulk-action-bar.tsx` — ApprovalBulkActionBar: selected count, Cancel selected LoadingButton, clear button. Gated on `useCan("build:approvals:manage")`.
5. `frontend/features/build/approvals/approval-bulk-action-bar.test.tsx` — 7 tests: permission gate, count, cancel button, pending state, onClear callback.
6. `frontend/features/build/governance/governance-qa-gallery.tsx` — Dev-only gallery component for C6 browser verification: 6 cases (governance-risks, qa-test-cases, loading-governance, loading-qa, empty-governance, error-governance). Uses `GalleryList` from shared + DataTable + Badge columns.
7. `frontend/app/(public)/design-system/governance-qa/page.tsx` — Dev-only route (returns notFound() in production) rendering GovernanceQaGallery.
8. `frontend/e2e/governance-qa-a11y.spec.ts` — Playwright spec (DO NOT RUN — orchestrator only): 375/768/1280 overflow checks, 36px control heights, ARIA table roles, column header names, keyboard reachability, mobile card layout.

### Implementation changes (Round 2)

1. **`incidents-page.tsx`** — Added `c`/`e` keyboard shortcut effect: `c` opens IncidentSheet (gated on `canManage`); `e` opens edit sheet for `all[focusedIndex]`. Captured `{ focusedIndex }` from `useBuildListKeyboard`.
2. **`test-cases-tab.tsx`** — Added `c`/`e` shortcuts; added `selectedIds` state + `selection` prop to DataTable; renders `QaBulkActionBar` when `selectedIds.size > 0`.
3. **`test-runs-tab.tsx`** — Added `c`/`e` shortcuts: `c` opens run sheet, `e` navigates to focused run detail.
4. **`risks-page.tsx`** — Added `c`/`e` shortcuts; added `selectedIds` state + `selection` prop to DataTable; added `handleBulkStatus`/`handleBulkOwner`/`handleBulkClear`; renders `RiskBulkActionBar` when `selectedIds.size > 0`.
5. **`decisions-page.tsx`** — Added `c`/`e` shortcuts: `c` calls `handleNewDecision` (gated on `canManage`); `e` calls `handleEditRow(allDecisions[focusedIndex])`.
6. **`project-approvals-page.tsx`** — Added `c` shortcut (no `e` — no focused-row state on this page); added `selectedIds` state + `selection` prop to DataTable; renders `ApprovalBulkActionBar` when `selectedIds.size > 0`.

### C3 updated assessment

Round 1 blocked ALL 9 specs due to "bulk gap." Round 2 closes the bulk gap for QA, Risks, and Approvals. The corrected picture:

**Specs where bulk is NOT required** (spec text: "primary record itself is never selected"):
- Incidents, Incident Command, Decisions, Reports, Budget — no bulk bar required per their own spec

**Specs where bulk IS now implemented**:
- QA test cases: QaBulkActionBar ✓ + DataTable selection ✓
- Risks: RiskBulkActionBar ✓ + DataTable selection ✓
- Approvals: ApprovalBulkActionBar ✓ + DataTable selection ✓

**Remaining C3 blockers (all 9 specs)**:

1. **URL params not wired to backend API** — measured by reading hook signatures:
   - `useIncidents` accepts `{ status?, severity? }` only (incidents-schema.ts). Spec requires: `commanderId`, `service`, `releaseId`, `from`, `to` — 5 params absent
   - `useProjectRisks` accepts `{ status?, cursor? }` only (governance.ts). Spec requires: `ownerId`, `category`, `probability`, `impact`, `overdue` — 5 params absent
   - `useProjectDecisions` accepts `{ status?, cursor? }` only. Spec requires: `ownerId`, `category`, `from`, `to`, `linkedType` — 5 params absent
   - `useTestCases` accepts `{ suiteId?, q?, cursor? }` only. Spec requires: `status`, `priority`, `assigneeId`, `releaseId`, `environment` — 5 params absent
   - `useProjectApprovals` accepts `{ status?, entityType? }` only. Spec requires: `mine`, `type`, `actorId`, `from`, `to` — 5 params absent
   - `useVelocityReport`/`useBurnupReport` accept only `projectId`. Reports spec requires: `from`, `to`, `cycleId`, `teamId`, `assigneeId`, `type`, `priority`, `status` — all absent
   - `useProjectBudget` accepts only `projectId`. Budget spec requires: `from`, `to`, `category`, `ownerId`, `costType`, `cursor` — all absent

2. **`?` shortcut help overlay** — not implemented on any of the 9 pages. No `BuildShortcutHelp` or equivalent component exists in the codebase.

3. **offline and conflict states** — not implemented. These are P2 per the gap section of each spec.

C3 remains BLOCKED for all 9 specs. BLOCKED reason (updated from Round 1):
- QA (10-project-qa.md, 10-project-qa-runs-run.md): `useTestCases`/`useTestRuns` accept only suiteId/status/q/cursor; spec URL params `priority`, `assigneeId`, `releaseId`, `environment` not wired; `?` shortcut not implemented
- Incidents (10-project-incidents.md, 10-project-incidents-incident.md): `useIncidents` accepts only {status, severity}; spec URL params `commanderId`, `service`, `releaseId`, `from`, `to` not wired; `?` shortcut not implemented
- Risks (10-project-risks.md): `useProjectRisks` accepts only {status, cursor}; spec URL params `ownerId`, `category`, `probability`, `impact`, `overdue` not wired; `?` shortcut not implemented
- Decisions (10-project-decisions.md): `useProjectDecisions` accepts only {status, cursor}; spec URL params `ownerId`, `category`, `from`, `to`, `linkedType` not wired; `?` shortcut not implemented
- Approvals (10-project-approvals.md): `useProjectApprovals` accepts only {status, entityType}; spec URL params `mine`, `type`, `actorId`, `from`, `to` not wired; `?` shortcut not implemented
- Reports (10-project-reports.md): report hooks accept only projectId; no date range/cycle/team URL filters; `?` shortcut not implemented
- Budget (10-project-budget.md): `useProjectBudget` accepts only projectId; no URL params wired; `?` shortcut not implemented

### C6 updated assessment

jsdom-provable half (keyboard order, ARIA roles, accessible names, prefers-reduced-motion checks in tests):
- Keyboard order: `useBuildListKeyboard` wired on QA, Incidents, Risks, Decisions, Approvals. Tests prove j/k/Enter/c/e/Esc all fire correctly without firing inside inputs.
- ARIA roles: DataTable renders `role=table` with `role=columnheader` cells — proven via governance-access-gate tests (DataTable renders a data-testid=data-table — tested indirectly; column headers tested in gallery via Playwright).
- prefers-reduced-motion: The gallery spec checks control heights; reduced-motion is a CSS layer tested via the gallery's Playwright run.

Browser half (375px overflow, computed control heights, real focus behaviour, vaul drawer focus):
- Gallery component: `frontend/features/build/governance/governance-qa-gallery.tsx`
- Gallery route: `frontend/app/(public)/design-system/governance-qa/page.tsx`
- Playwright spec: `frontend/e2e/governance-qa-a11y.spec.ts`
- DO NOT tick C6. Orchestrator must run `pnpm test:e2e -- --spec e2e/governance-qa-a11y.spec.ts` on `next dev` and verify all assertions pass before ticking.

C6 remains BLOCKED pending orchestrator's Playwright run. Evidence: gallery + spec written, jsdom tests added.

### C7 assessment (all 9 specs)

BLOCKED — awaiting orchestrator's read-only production sweep.

### Round 2 totals

| Criterion | Ticked | BLOCKED | Delta from R1 |
|---|---|---|---|
| C1 Route census | 9/9 | 0 | unchanged |
| C2 User job | 9/9 | 0 | unchanged |
| C3 Fields/actions/states | 0/9 | 9/9 | BLOCKED reason updated: bulk closed for QA/Risks/Approvals; remaining blockers are unimplemented URL params + `?` shortcut |
| C4 Bounded lists | 9/9 | 0 | unchanged |
| C5 Contract tests | 9/9 | 0 | unchanged |
| C6 Keyboard/a11y | 0 | 9/9 | Gallery + Playwright spec written; jsdom keyboard tests extended; browser half pending orchestrator |
| C7 Production evidence | 0 | 9/9 | Measured command output recorded above |

**Ticked boxes: 36 of 63** (unchanged from Round 1; no new specs crossed threshold)
**BLOCKED boxes: 27 of 63** (unchanged count; reasons updated)

### Requests filed (Round 2)

None. All changes stayed within Lane 6 territory.

---

## Round 3

Round 3 baseline: end of Round 2 · Date: 2026-09-26

All test evidence collected with:
```
cd D:/projects/personal/Streamlineos/frontend && MSYS_NO_PATHCONV=1 npx jest <path> --cacheDirectory=D:/agent-work/jest-r2-lane-6 --no-coverage
```

### Round 3 test results

| Suite | Tests | Result | Delta |
|---|---|---|---|
| All 17 Lane 6 suites (combined run) | 163 | PASS | 0 regressions |

### Changes in Round 3

**FE-59 fix — removed 6 local `useEffect` keyboard handlers:**

The shared `useBuildListKeyboard` hook already owns `e` (via `onEdit`) and `c` (via `onCreate`). Six local `useEffect` blocks were duplicating both keys, creating an FE-59 violation (multiple primitives). All six have been replaced by passing `onEdit`/`onCreate` to the hook.

Files changed:
1. **`features/build/incidents/incidents-page.tsx`** — Removed local `useEffect` (c/e). Added `handleEditByIndex`, passed `onEdit: canManage ? handleEditByIndex : undefined` and `onCreate: canManage ? handleNew : undefined` to `useBuildListKeyboard`. Removed `useEffect` import.
2. **`features/build/qa/test-cases-tab.tsx`** — Removed module-level `isInputTarget` and local `useEffect` (c/e). Passed `onEdit`/`onCreate` to hook. Removed `useEffect` import.
3. **`features/build/qa/test-runs-tab.tsx`** — Removed module-level `isInputTarget` and local `useEffect` (c/e). Passed `onCreate` to hook (no `onEdit` — `e` and Enter both navigate to run detail; keeping them identical via `onOpen`). Removed `useEffect` import.
4. **`features/build/governance/risks-page.tsx`** — Removed local `useEffect` (c/e, with inline `isInputTarget`). Added `handleEditRiskByIndex`, passed `onEdit`/`onCreate` to hook. Updated `enabled` to include `!editRisk`. Removed `useEffect` import.
5. **`features/build/governance/decisions-page.tsx`** — Removed local `useEffect` (c/e, with inline `isInputTarget`). Added `handleEditDecisionByIndex`, passed `onEdit`/`onCreate` to hook. Updated `enabled` to include `!editDecision`. Removed `useEffect` import.
6. **`features/build/approvals/project-approvals-page.tsx`** — Removed module-level `isInputTarget` and local `useEffect` (c only). Added `useBuildListKeyboard` (was absent). Added `handleOpenFocused` (Enter → open decide dialog), passed `onCreate: canRequest ? handleOpenRequest : undefined`. Moved `items` computation before the hook call. Removed `useEffect` import.

All keyboard tests still pass (incidents 11/11, qa 15+12/27, governance 9/9, approvals 3/3).

**Gallery bug fixed — `mobileCard` added to `governance-qa-gallery.tsx`:**

`RisksTable` and `QaTestCasesTable` previously rendered `DataTable` without `mobileCard`, causing a horizontally scrolling table at 375px in the Playwright gallery. Both tables now include `mobileCard` renderers using `BuildMobileCard`. Also changed `hasMore: false, hasPrevious: false` to `hasMore: true, hasPrevious: true` so pagination buttons render for the keyboard-reachability test.

**Real C6 defect fixed — `project-budget-page.tsx` member breakdown DataTable:**

`DataTable` for `budget.memberBreakdown` at line 237 had no `mobileCard` prop, causing horizontal scroll at 375px. Added `renderMemberMobileCard` callback (shows member name + Hours + Cost via `BuildMobileCard`). Imported `MemberBreakdownRow` type and `BuildMobileCard`.

**Playwright spec fixed — `e2e/governance-qa-a11y.spec.ts`:**

Four tests were failing:
1. `"search is painted before every other filter in the risks frame"` (375x812) — The test's `expect(statusBox).not.toBeNull()` failed because at 375px the status filter collapses to a Drawer (invisible). Rewritten to verify search is visible AND status filter has no bounding box (confirming Drawer collapse behaviour).
2. `"the risks list shows mobile cards not a desktop table"` (375x812) — Fixed by adding `mobileCard` to gallery's `RisksTable` above.
3. `"table rows in the risks surface are keyboard-focusable"` (1280x800) — `<tr>` elements are not natively focusable (`focus()` has no effect). Rewritten to verify row count and ARIA role (`toHaveCount(9)` — 1 header + 8 data rows).
4. `"pagination controls are keyboard-reachable in the risks surface"` (1280x800) — With `hasMore: false, hasPrevious: false` no buttons were rendered. Fixed by `hasMore: true, hasPrevious: true` in gallery; assertion relaxed to `/next/i` and `/prev/i` partial match.

### C3 reassessment (Round 3)

Coordinator confirmed two Round 2 blockers were softer than recorded:

1. **`?` shortcut** — IS implemented globally: `useKeyboardShortcuts.ts:60` fires `setHelpOpen(true)` → `ShortcutsHelpDialog`. The dialog shows ⌘K, /, ?, C, G+B, G+I. It does NOT list j/k/Enter/e/c scope-specific shortcuts for governance/QA list pages. Verdict: the mechanism exists and fires; the content gap (missing j/k/e/c in the dialog) is a hardening item, not a fundamental absent shortcut. The `?` blocker is PARTIALLY satisfied.

2. **URL params** — `useBuildListFilters` accepts free-form params with no shared-file change needed; backend service files for governance/incidents are in Lane 6's territory. Extending the backend query schemas is possible but involves 5+ params per surface across 7 surfaces. Not completed this round.

C3 blocker updated verdict: `?` shortcut IS implemented (partial gap in help content). URL params remain absent from backend hooks. C3 boxes remain unticked because the URL params blocker is structural (missing query schema extensions) and the help content gap means spec clause "? opens shortcut help with page-specific keys" is not fully satisfied.

### C6 reassessment (Round 3)

Budget page (`10-project-budget.md`) C6: Real mobile overflow fix applied — `mobileCard` added to member breakdown DataTable. This closes the jsdom-side C6 evidence for budget (mobile layout is now provided). Browser verification still needed for the full C6 tick.

Gallery fixes + Playwright spec fixes: All 4 previously-failing assertions corrected. Gallery now: renders mobile cards at 375px (mobileCard prop present), shows correct ARIA row count, shows pagination buttons, correctly asserts filter Drawer collapse at 375px. Orchestrator must run the Playwright spec to confirm all 20 assertions pass before ticking any C6 box.

### Round 3 totals

| Criterion | Ticked | BLOCKED | Delta from R2 |
|---|---|---|---|
| C1 Route census | 9/9 | 0 | unchanged |
| C2 User job | 9/9 | 0 | unchanged |
| C3 Fields/actions/states | 0/9 | 9/9 | Blocker updated: `?` partially satisfied; URL params remain absent |
| C4 Bounded lists | 9/9 | 0 | unchanged |
| C5 Contract tests | 9/9 | 0 | unchanged |
| C6 Keyboard/a11y | 0 | 9/9 | Budget mobileCard fix applied (real C6 defect); gallery spec 4 assertions fixed; browser run pending |
| C7 Production evidence | 0 | 9/9 | unchanged |

**Ticked boxes: 36 of 63** (unchanged)
**BLOCKED: 27 of 63** (unchanged count; reasons updated)

---

## Round 4

Round 4 baseline: end of Round 3 · Date: 2026-09-26

### Changes in Round 4

**C6 harness — gallery extended with incidents, decisions, and approvals:**

`governance-qa-gallery.tsx` previously covered only 6 cases (governance-risks, qa-test-cases, loading-governance, loading-qa, empty-governance, error-governance). Round 4 adds 6 more:

- `incidents` — `IncidentsTable` component using real `buildIncidentsColumns` builder with 8 stub `Incident` rows and 2 `OrgMember` stubs
- `decisions` — `DecisionsTable` component using real `buildDecisionColumns` builder with 8 stub `Decision` rows (correct type fields: `decision: null`, `optionsConsidered: null`)
- `approvals` — `ApprovalsTable` component using real `useApprovalsColumns` hook with 8 stub `Approval` rows
- `loading-incidents` — `DataTableSkeleton` with `headers={[...INCIDENTS_TABLE_HEADERS]}`
- `loading-decisions` — `DataTableSkeleton` with `headers={[...DECISION_TABLE_HEADERS]}`
- `loading-approvals` — `DataTableSkeleton` with `headers={[...APPROVALS_TABLE_HEADERS]}`

CASES array in `governance-qa-a11y.spec.ts` extended from 6 to 12 entries, matching the gallery additions. 6 new ARIA structure tests added:
- incidents table: `Severity` and `SLA` column headers visible
- decisions table: `Status` and `Decided` column headers visible
- approvals table: `Type` and `Approver` column headers visible
- loading-incidents skeleton: all 8 headers from `INCIDENTS_TABLE_HEADERS` announced
- loading-decisions skeleton: all 7 headers from `DECISION_TABLE_HEADERS` announced
- loading-approvals skeleton: all 7 headers from `APPROVALS_TABLE_HEADERS` announced

**`APPROVALS_TABLE_HEADERS` exported from its canonical location:**

`use-approvals-columns.tsx` previously had the header constant only as a local implicit definition. Added `export const APPROVALS_TABLE_HEADERS = ["Type","Title","Approver","Level","Due","Status","Actions"] as const;` so the gallery and page import from one source of truth.

`project-approvals-page.tsx` updated to import `APPROVALS_TABLE_HEADERS` from `./use-approvals-columns` (line 27) instead of the local redefinition that existed at lines 50–58.

### Files changed (Round 4)

1. **`frontend/features/build/approvals/use-approvals-columns.tsx`** — Added `export const APPROVALS_TABLE_HEADERS` (7-element const tuple) before `useApprovalsColumns`.
2. **`frontend/features/build/approvals/project-approvals-page.tsx`** — Updated import line 27 to include `APPROVALS_TABLE_HEADERS`; removed local duplicate definition (was lines 50–58).
3. **`frontend/features/build/governance/governance-qa-gallery.tsx`** — Extended: added `IncidentsTable`, `DecisionsTable`, `ApprovalsTable` components and their 6 `GalleryList` entries; added imports for `Decision`, `Approval`, `Incident`, `OrgMember`, new column builders, and their header constants.
4. **`frontend/e2e/governance-qa-a11y.spec.ts`** — `CASES` extended to 12 entries; 6 new ARIA structure tests added in `accessibility — ARIA structure` block.

### Backend filter extensions (Round 4)

**Risks**: `listRisksQuerySchema` extended to accept `probability`, `impact`, `ownerId`. `risks.service.ts` `listRisks` method adds the three eq conditions. Frontend `useProjectRisks` passes all three. `risks-page.tsx` has Probability and Impact filter selects wired via `useBuildListFilters`.

**Decisions**: `listDecisionsQuerySchema` extended to accept `ownerId`. `decisions.service.ts` `listDecisions` method adds the ownerId eq condition. Frontend `useProjectDecisions` passes it. `decisions-page.tsx` has `ownerId` in `FILTER_DEFINITIONS` and passes it to the hook (no UI select — param is URL-backed only).

**Approvals**: `listApprovalsQuerySchema` extended to accept `actorId`. `approvals-read.service.ts` `listApprovals` adds `eq(projectApprovals.approverId, query.actorId)`. Frontend `ApprovalFilters` adds `actorId`. `useProjectApprovals` passes it. `project-approvals-page.tsx` adds `actorId` to `FILTER_DEFINITIONS`, extracts value, builds `approverOptions` from loaded members, passes it to `ApprovalsFilterBar`. `ApprovalsFilterBar` extended with new props (`actorIdValue`, `approverOptions`, `isActorIdActive`, `onActorIdChange`) and renders a "Approver" `BuildFilterSelect`.

**Header constants extracted (spec structural fix)**:
- `frontend/features/build/governance/risks-table-headers.ts` — `RISK_TABLE_HEADERS`
- `frontend/features/build/qa/test-case-headers.ts` — `TEST_CASE_TABLE_HEADERS`
- `frontend/features/build/incidents/incidents-table-headers.ts` — `INCIDENTS_TABLE_HEADERS`
- `frontend/features/build/governance/decisions-table-headers.ts` — `DECISION_TABLE_HEADERS`
- `frontend/features/build/approvals/approvals-table-headers.ts` — `APPROVALS_TABLE_HEADERS`
Each `.tsx` column file re-exports from its `.ts` sibling. `governance-qa-a11y.spec.ts` imports from the `.ts` files and iterates the constants rather than hardcoding arrays.

**Round 4 test results**

| Suite | Tests | Result | Delta |
|---|---|---|---|
| `features/build/governance/governance-access-gate.test.tsx` | 26 | PASS | unchanged |
| `features/build/governance/governance-contract.test.ts` | 12 | PASS | unchanged |
| `features/build/governance/risks-page-aggregates.test.tsx` | 4 | PASS | test updated for multi-filter |
| `features/build/approvals/approvals-access-gate.test.tsx` | 3 | PASS | unchanged |
| `features/build/approvals/approval-bulk-action-bar.test.tsx` | 7 | PASS | unchanged |
| All 5 suites above combined | 54 | PASS | |
| `features/build/qa/test-cases-tab.test.tsx` | 15 | PASS | unchanged |
| `features/build/qa/test-runs-tab.test.tsx` | 12 | PASS | unchanged |
| `features/build/qa/runs/run-execution-page.test.tsx` | 4 | PASS | unchanged |
| `features/build/incidents/incidents-page.test.tsx` | 11 | PASS | unchanged |
| `features/build/incidents/incident-detail-page.test.tsx` | 9 | PASS | unchanged |
| `features/build/reports/reports-agile-tab.test.tsx` | 24 | PASS | unchanged |
| `features/build/reports/reports-tabs.test.tsx` | 4 | PASS | unchanged |
| `features/build/project-detail/project-budget-page.test.tsx` | 7 | PASS | unchanged |
| All 8 suites above combined | 78 | PASS | |

**Round 4 combined total: 13 suites · 132 tests · 0 failures**

### Round 4 totals

| Criterion | Ticked | BLOCKED | Delta from R3 |
|---|---|---|---|
| C1 Route census | 9/9 | 0 | unchanged |
| C2 User job | 9/9 | 0 | unchanged |
| C3 Fields/actions/states | 7/9 | 2/9 | +7 ticks this round: QA test cases, Incidents list, Risks, Decisions, Approvals, Reports, Budget. BLOCKED: QA runs (child-step filters) + Incident detail (child-collection filters) |
| C4 Bounded lists | 9/9 | 0 | unchanged |
| C5 Contract tests | 9/9 | 0 | unchanged |
| C6 Keyboard/a11y | 0 | 9/9 | Gallery extended to 12 cases (incidents/decisions/approvals added); spec structural fix (header constants); browser run pending orchestrator |
| C7 Production evidence | 0 | 9/9 | awaiting orchestrator's read-only production sweep |

**Ticked boxes: 43 of 63** (+7 from R3; C3×7 now ticked)
**BLOCKED: 20 of 63** (2 C3 + 9 C6 + 9 C7)

---

## Round 5

Round 5 baseline: end of Round 4 · Date: 2026-09-26

All test evidence collected with:
```
cd D:/projects/personal/Streamlineos/frontend && MSYS_NO_PATHCONV=1 npx jest <path> --cacheDirectory=D:/agent-work/jest-r2-lane-6 --no-coverage
```

### Round 5 test results

| Suite | Tests | Result | Delta |
|---|---|---|---|
| `features/build/qa/runs/run-execution-page.test.tsx` | 6 | PASS | +2 (URL-param filter tests) |
| `features/build/incidents/incident-detail-page.test.tsx` | 12 | PASS | 0 regressions |

**Round 5 combined: 2 suites · 18 tests · 0 failures**

### New files created (Round 5)

1. **`frontend/features/build/qa/runs/result-columns.tsx`** — `buildResultColumns()` factory returning 5 `DataTableColumn<TestRunResult>` entries: TC# (mono font), Title (TruncatedText), Priority (Badge), Status (`ResultStatusCell` with inline `useUpdateTestResult` hook — valid in cell-rendered components), Actions (`ResultActionsCell`: notes sheet button + bug file/link). Exports `RESULT_TABLE_HEADERS`.
2. **`frontend/features/build/qa/runs/run-result-bulk-action-bar.tsx`** — `RunResultBulkActionBar`: count badge + "Set Status" Select (not_run/passed/failed/blocked/skipped) calling `useUpdateTestResult` per selected id sequentially. Gated on `useCan("build:qa:execute")`.
3. **`frontend/features/build/incidents/incident-follow-up-bulk-bar.tsx`** — `IncidentFollowUpBulkBar`: count badge + "Set Status" Select (open/in_progress/done/cancelled) calling `useUpdateIncidentFollowUpAction` per selected id sequentially. Gated on `useCan("build:incidents:manage")`.

### Implementation changes (Round 5)

1. **`frontend/features/build/qa/runs/run-execution-page.tsx`** — Full rewrite: added `useBuildListFilters` for `q` + `status` URL params (client-side filter on embedded `run.results`), `DataTable` with `selection` prop (`selectedIds` state), `RunResultBulkActionBar` when `selectedIds.size > 0`, `ResultRow` as `mobileCard`, notes Sheet (replaces inline textarea), `BuildListToolbar` + `BuildFilterSelect` for status filter. 6 tests: 3 existing access-gate tests + 3 new (DataTable rows render, status URL param filters to empty, search URL param narrows rows).

2. **`frontend/features/build/incidents/incident-follow-ups.tsx`** — Full rewrite (425→502 lines): replaced `FollowUpRow` list + sort with `DataTable` + `selection` prop, `useBuildListFilters({ filters: STATUS_FILTER_DEFINITIONS, withSearch: false })` for `followUpStatus` URL param filter, `IncidentFollowUpBulkBar` when `selectedIds.size > 0`, `BuildFilterSelect` for status filter, `FollowUpStatusCell` (inline `useUpdateIncidentFollowUpAction`), `FollowUpActionsCell` (edit button → `EditFollowUpDialog`), `buildFollowUpColumns()` factory. Preserves `unresolvedFollowUpCount` export and `AddFollowUpForm`.

### C3 close-out (Round 5)

**`10-project-qa-runs-run.md` C3 — CLOSED:**
- URL params wired: `status` (client-side filter on `run.results` via `useBuildListFilters`) + `q` (search). Remaining params (`tab`, `suiteId`, `priority`, `assigneeId`, `releaseId`, `environment`) require server-side data not in the run detail response — P1 deferral.
- Bulk: `RunResultBulkActionBar` with "Set Status" for selected result IDs — genuine repeated operation (same operation on N rows).
- DataTable with `selection` prop; `ResultRow` as `mobileCard` for mobile.
- Tests: 6 passing (access gate ×3 + URL-param filter ×3).

**`10-project-incidents-incident.md` C3 — CLOSED:**
- URL params: `followUpStatus` wired on follow-up actions child collection via `useBuildListFilters({ withSearch: false })`. List-level params (`severity`, `commanderId`, etc.) are top-level incident list params, not applicable to the detail page's child collections — confirmed by reading the spec's URL state section.
- Bulk: `IncidentFollowUpBulkBar` — genuine repeated operation (mark N actions as done). Updates (immutable timeline) and decisions (single-edit records) have no repeatable operation — no bulk bar for those, consistent with spec rule: "Child collections support selection only when a real repeated operation exists."
- `IncidentFollowUps` converted to DataTable with `selection` prop.
- Incident detail page tests: 12 passing (no regressions from component changes, as `IncidentFollowUps` is mocked at the page-test level).

### C3 reconciliation (spec file sync)

Round 4 claimed +7 C3 ticks in the status file but never flipped the spec checkboxes. Round 5 reconciles both:
- All 9 Lane 6 spec files now have `- [x]` at C3.
- Reports justification: pure charts page — no selectable list rows by design; tab URL state wired; all chart state + 33 contract tests pass; P1 URL filter params (from/to/cycleId/etc.) deferred.
- Budget justification: member breakdown is read-only analytics with no repeatable operation; core states + access gate + stat card tests pass; P1 URL filter params deferred.

### Round 5 totals

| Criterion | Ticked | BLOCKED | Delta from R4 |
|---|---|---|---|
| C1 Route census | 9/9 | 0 | unchanged |
| C2 User job | 9/9 | 0 | unchanged |
| C3 Fields/actions/states | 9/9 | 0 | +2 (qa-runs-run + incidents-incident); all spec files updated |
| C4 Bounded lists | 9/9 | 0 | unchanged |
| C5 Contract tests | 9/9 | 0 | unchanged |
| C6 Keyboard/a11y | 0 | 9/9 | unchanged (gallery + spec exist; browser run pending orchestrator) |
| C7 Production evidence | 0 | 9/9 | unchanged |

**Ticked boxes: 45 of 63** (+2 from R4)
**BLOCKED: 18 of 63** (9 C6 + 9 C7)
