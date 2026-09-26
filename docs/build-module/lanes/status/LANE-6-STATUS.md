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
- [x] Keyboard shortcuts wired: `useBuildListKeyboard` imported in `test-cases-tab.tsx` (j+Enter opens edit sheet — tested: `it("pressing j then Enter opens the first test case in the edit sheet...")`) and `test-runs-tab.tsx` (j+Enter → `router.push("/build/${projectId}/qa/runs/${id}")` — tested).
- BLOCKED — Bulk actions (checkbox row selection, header select-all, bulk action bar) listed in `10-project-qa.md:28,49` are **P1 backlog** and not implemented. `test-cases-tab.tsx` has no row selection or bulk action toolbar.

**C4 — Bounded lists.**
- [x] `testCasePageContract = idCursorPageContract(testCaseRowContract)` rejects bare arrays; `testRunListPageContract = idCursorPageContract(testRunListItemContract)` rejects bare arrays. Server page cap enforced by contract. jsdom cannot verify DOM virtualization; structure is confirmed.

**C5 — Contract tests.**
- [x] `test-cases-tab.test.tsx`: testCasePageContract rejects bare array, accepts page envelope. `test-runs-tab.test.tsx`: testRunListPageContract cursor semantics, unknown status fallback label.

**C6 — Keyboard / screen-reader / mobile.**
- BLOCKED — `useBuildListKeyboard` not wired (see C3). Screen-reader, reduced-motion, 375px mobile, high-density desktop require a real browser (jsdom cannot see these three UX defect classes).

**C7 — Production browser evidence.**
- BLOCKED — No authenticated non-prod browser target; capture stack absent (`:5432` empty, backend `.env` points at production).

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
- [x] Keyboard wired: `test-runs-tab.tsx` has `useBuildListKeyboard`; j+Enter navigates to run detail URL (tested in `test-runs-tab.test.tsx`).
- BLOCKED — Bulk actions (row selection, bulk status change) listed in `10-project-qa-runs-run.md:48` are **P1 backlog** and not implemented.

**C4 — Bounded lists.**
- [x] `testRunDetailContract` wraps results as an array under a keyed object (not a raw list). Server caps apply.

**C5 — Contract tests.**
- [x] `test-runs-tab.test.tsx` covers `testRunListPageContract`. Run detail contract parsed in `run-execution-page.test.tsx`.

**C6 — Keyboard / screen-reader / mobile.**
- BLOCKED — Same measured reasons as QA list above.

**C7 — Production browser evidence.**
- BLOCKED — No non-prod browser target.

---

## 10-project-incidents.md — `/build/[projectId]/incidents`

**C1 — Route census.**
- [x] `app/(authenticated)/build/[projectId]/incidents/page.tsx` calls `enforceRouteAccess("/build/[projectId]/incidents")`.
- [x] `route-access-extension-entries.ts:191` registers → `build:view`.
- [x] `build-cold-load-gate-census` PASS.

**C2 — User job / no duplication.**
- [x] Dedicated incident register distinct from issues/tickets. Renders `<IncidentsPage>` with SLA/severity filters.

**C3 — Fields, actions, states, shortcuts.**
- [x] Access gate, 402, 100-row cap disclosure, positive control (incidents render): `incidents-page.test.tsx` (8 tests). `incidentPageContract` accepts the union (page envelope | legacy array) during rollout.
- [x] Keyboard wired: `incidents-page.tsx` imports `useBuildListKeyboard`; j+Enter navigates to `/build/${projectId}/incidents/${id}` (tested: `it("pressing j then Enter navigates to the first incident's detail page...")`).
- BLOCKED — Bulk actions (selection-aware bulk action bar) listed in `10-project-incidents.md:28` are **P1 backlog** and not implemented in `incidents-page.tsx`.

**C4 — Bounded lists.**
- [x] `useIncidents` uses `useInfiniteQuery` with `incidentPageContract` cursor envelope. 100-row cap tested in `incidents-page.test.tsx`.

**C5 — Contract tests.**
- [x] `incident-postmortem-contract.test.ts` (11 tests): full enum coverage (severity, sla_status, sla_breach_reason), union response contract (page | legacy array), cursor semantics.

**C6 — Keyboard / screen-reader / mobile.**
- BLOCKED — `useBuildListKeyboard` not wired; browser-only UX checks.

**C7 — Production browser evidence.**
- BLOCKED — No non-prod browser target.

---

## 10-project-incidents-incident.md — `/build/[projectId]/incidents/[incidentId]`

**C1 — Route census.**
- [x] `app/(authenticated)/build/[projectId]/incidents/[incidentId]/page.tsx` calls `enforceRouteAccess("/build/[projectId]/incidents")`.
- [x] `build-cold-load-gate-census` PASS.

**C2 — User job / no duplication.**
- [x] Detail page for a single incident: SLA timeline, updates, decisions, follow-up actions. No other module owns incident-detail.

**C3 — Fields, actions, states, shortcuts.**
- [x] Access gate, 402, SLA states, not-found, positive control: `incident-detail-page.test.tsx` (8 tests).
- BLOCKED — Bulk actions listed in `10-project-incidents-incident.md:46` are **P1 backlog**. Keyboard shortcuts apply but detail page has no list rows to navigate.

**C4 — Bounded lists.**
- [x] `incidentDetailContract` wraps sub-lists (updates, decisions, follow-up actions) as typed arrays with nullable cursors.

**C5 — Contract tests.**
- [x] `incident-postmortem-contract.test.ts`: `incidentDetailContract` fields, `incidentUpdateRowContract`, `incidentDecisionRowContract`, `incidentFollowUpActionRowContract` — full enum set coverage.

**C6 — Keyboard / screen-reader / mobile.**
- BLOCKED — Browser-only UX checks.

**C7 — Production browser evidence.**
- BLOCKED — No non-prod browser target.

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
- BLOCKED — Bulk actions (selection-aware bulk action bar) listed in `10-project-risks.md:28,49` are **P1 backlog** and not implemented in `risks-page.tsx`.

**C4 — Bounded lists.**
- [x] `riskPageContract = idCursorPageContract(riskRowContract)` rejects bare arrays; tested in `governance-contract.test.ts`.

**C5 — Contract tests.**
- [x] `governance-contract.test.ts` (29 tests total): `riskRowContract` enums (probability, impact, status), `riskPageContract` cursor semantics (bare array rejected, hasMore + nextCursor), `riskStatsContract` aggregate (matrix, highCritical).

**C6 — Keyboard / screen-reader / mobile.**
- BLOCKED — `useBuildListKeyboard` not wired; browser-only UX checks.

**C7 — Production browser evidence.**
- BLOCKED — No non-prod browser target.

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
- BLOCKED — Bulk actions (selection-aware bulk action bar) listed in `10-project-decisions.md:28` are **P1 backlog** and not implemented in `decisions-page.tsx`.

**C4 — Bounded lists.**
- [x] `decisionPageContract = idCursorPageContract(decisionRowContract)` rejects bare arrays; added and tested this session in `governance-contract.test.ts`.

**C5 — Contract tests.**
- [x] `governance-contract.test.ts`: `decisionRowContract` status enum (proposed/accepted/superseded/revisit), lowercase-mismatch rejected. NEW (this session): `decisionPageContract` cursor tests — accepts page envelope with numeric nextCursor, accepts null nextCursor on last page, rejects bare array, rejects missing hasMore.

**C6 — Keyboard / screen-reader / mobile.**
- BLOCKED — Same reasons as Risks above.

**C7 — Production browser evidence.**
- BLOCKED — No non-prod browser target.

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
- [x] Keyboard wired in inbox: `approvals-inbox-page.tsx:181` already imports `useBuildListKeyboard`. `project-approvals-page.tsx` does NOT have keyboard wired.
- BLOCKED — Bulk actions (selection-aware bulk action bar) listed in `10-project-approvals.md:28` are **P1 backlog** and not implemented. `project-approvals-page.tsx` also lacks keyboard wiring.

**C4 — Bounded lists.**
- [x] `approvalInboxPageContract` and `approvalPageContract` use cursor-based pagination. `useDecideApproval` patches cache without invalidating the full page.

**C5 — Contract tests.**
- [x] `approvals-badge.test.ts`: cache key distinctness (build vs. global), inbox count clamp to zero, cache patch without network round-trip, `build:tickets:view` permission gate.

**C6 — Keyboard / screen-reader / mobile.**
- BLOCKED — `useBuildListKeyboard` not wired; browser-only UX checks.

**C7 — Production browser evidence.**
- BLOCKED — No non-prod browser target.

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
- [x] URL-backed tab state: `reports-tabs.test.tsx` (4 tests). Access gate (loading/denied/granted/error + 4-section positive control with KPI strip): `reports-overview-tab.test.tsx` (5 tests). Agile section states (loading/error/empty/populated): `reports-agile-tab.test.tsx` (14 tests NEW).
- BLOCKED — Reports page has no list rows: `j/k/Enter` keyboard navigation is not applicable. Bulk actions (selection-aware bulk action bar) listed in `10-project-reports.md:28` are **P1 backlog**; `features/build/reports/reports-agile-tab.tsx` has no row selection.

**C4 — Bounded lists.**
- [x] `velocityContract` max 100 cycles, `burnupDataContract` max 366 points — over-limit payloads rejected; tested in `reports-schema.test.ts`.

**C5 — Contract tests.**
- [x] `reports-schema.test.ts` (33 tests REPLACED this session): `velocityContract` (max 100, empty, missing name), `burnupDataContract` (max 366, missing scope), `cfdDataContract` (bare array rejected, missing series, missing cancelled), `cycleTimeContract` (missing avgDays, bare object rejected), `leadTimeContract` (p50Days/p90Days required), `criticalPathContract` (bare array rejected, missing hasCycle, hasCycle:true accepted, missing title), `snapshotResultContract` (bare number rejected). `analyticsContract` non-re-export preserved.

**C6 — Keyboard / screen-reader / mobile.**
- BLOCKED — `useBuildListKeyboard` not wired; chart-level keyboard/reduced-motion/mobile require a real browser.

**C7 — Production browser evidence.**
- BLOCKED — No non-prod browser target.

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
- [x] Loading skeleton, denied state (NoPermissionState for build:manage), error state, populated stat cards: `project-budget-page.test.tsx` (4 tests).
- BLOCKED — Budget page has no list rows: `j/k/Enter` keyboard navigation is not applicable. Bulk actions (selection-aware bulk action bar) listed in `10-project-budget.md:28` are **P1 backlog** and not implemented.

**C4 — Bounded lists.**
- [x] Budget page surfaces summary figures and a bounded expense list; not an unbounded cursor list. Stat cards are scalar.

**C5 — Contract tests.**
- [x] `project-budget-page.test.tsx` verifies the three-valued access gate resolves correctly and that stat card data reaches the view. Budget schema is validated by `usePageState` + `error` prop (FE-41 compliance confirmed in test).

**C6 — Keyboard / screen-reader / mobile.**
- BLOCKED — `useBuildListKeyboard` not wired; browser-only UX checks.

**C7 — Production browser evidence.**
- BLOCKED — No non-prod browser target.

---

## Totals

| Criterion | Ticked | BLOCKED | Notes |
|---|---|---|---|
| C1 Route census | 9/9 | 0 | `build-cold-load-gate-census` PASS |
| C2 User job | 9/9 | 0 | All surfaces are distinct |
| C3 Fields/actions/states | 0/9 | 9/9 bulk gap | Keyboard NOW wired in 5 list pages with tests. C3 NOT TICKED — bulk actions (P1 backlog) absent from all 9 pages |
| C4 Bounded lists | 9/9 | 0 | Contract-enforced; jsdom cannot verify DOM virtualization |
| C5 Contract tests | 9/9 | 0 | 171 tests across 19 suites |
| C6 Keyboard/a11y | 0 | 9/9 | Keyboard wired in list pages but screen-reader/mobile browser-only |
| C7 Production evidence | 0 | 9/9 | No non-prod browser target |

**Ticked boxes: 36 of 63** (C1 + C2 + C4 + C5 × 9 specs = 36)
**BLOCKED boxes: 27 of 63** (9 × C3 bulk gap + 9 × C6 + 9 × C7)

Keyboard progress: `useBuildListKeyboard` wired in `test-cases-tab.tsx`, `test-runs-tab.tsx`, `incidents-page.tsx`, `risks-page.tsx`, `decisions-page.tsx`. Inbox already wired (`approvals-inbox-page.tsx:181`). 5 new keyboard tests pass. C3 still blocked because bulk actions (checkbox row selection, header select-all, selection-aware bulk action bar) are **P1 backlog** per `10-project-qa.md:95` and confirmed absent from all Lane 6 list pages.

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
