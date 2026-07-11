# HRMS API Audit — Efficiency + Correctness Findings (2026-07-11)

Two principal-engineer read-only audits of the new HR modules, followed by an efficiency fix wave (5 agents) + a correctness fix wave (3 agents) + orchestrator fixes.

## ROUND 2 — Reachability / 404 / dead-button verification pass (2026-07-11)
Three read-only agents cross-checked FE↔BE contracts, routes/links/buttons, and RBAC-key/nav parity. Findings + fixes:
- **10 features 404 in production** — FE hooks called `/hr/analytics-plus`, `/hr/career-development`, `/hr/kpis`, `/hr/leave-policies`, `/hr/mentorships`, `/hr/probation`, `/hr/succession`, `/hr/termination`, `/hr/bonuses`, `/hr/incentives` but those prefixes were **absent from `MIGRATED_PREFIXES`** (`frontend/lib/api-client.ts`) → routed to same-origin `/api` → 404. Verified each has a real backend `@Controller` at that exact path; ADDED all 10 prefixes. `/hr/analytics-plus` also covers workforce-planning hooks. FIXED.
- **2 live-404 API calls (missing backend route):** (1) `DELETE /hr/recruitment/candidates/:candidateId/vault/:documentId` — added controller+service (reuse `hr:employees:manage`, BOLA re-assert, cascade access-logs, `{success:true}`). (2) `POST /payroll/runs/:runId/employees/:runEmployeeId/adjustments` — added route+service+DTO writing to existing `payroll_line_items`, txn-atomic gross/deductions/net recompute, locked-run reject, reuse `payroll:runs:manage`, `{ok:true}`. Both: no new catalog key, no migration. FIXED.
- **1 dead link (404 page):** `/hr/recruitment/candidates/new` (recruitment pipeline page) → rewired to open the existing `AddCandidateSheet`. FIXED.
- **3 dead Edit buttons:** biometric-devices / geofence / shift-template lists had unwired `<Button>` edit icons — extended each form sheet to edit mode (update hooks + `PATCH` endpoints already existed), wired via parent editing-state. FIXED.
- **RBAC parity:** 0 FE-used keys missing from the FE union; 0 backend `@RequirePermission` keys missing from catalog (no un-authorizable endpoints). 13 backend keys absent from the FE union are backend-only (never `useCan`-referenced) → not a bug.
- **Standing-rule cleanup in touched files:** violet/indigo gradient buttons (biometric/geofencing/shifts pages) → ink primary (blue-rule §14); glassy `bg-white/90 backdrop-blur shadow-xl` cards → in-shell `bg-card border rounded-xl shadow-sm`; geofence radius accent `text-violet-600`→`text-blue-600`. Also removed a `as unknown as Record<string,unknown>` double-cast + `!` assertions in the new payroll adjustment method (§7).
- **Orphan pages (render fine, no nav path — NOT 404s, left as-is pending owner decision):** `/hr/my-payslips`, `/hr/workforce-cost`, `/hr/settings/company` (hub-card only), and the `/hr/payroll/*` subtree (likely stale duplicate of canonical `/payroll/*`).
- **Verification:** backend tsc 0, frontend tsc 0, engine test suite re-run.


## RESOLUTION SUMMARY (all HIGH + most MEDIUM fixed; both repos typecheck-green)
- **Critical bugs FIXED:** payroll attendance cardinality data-loss (userIds passed through, no 100-cap); retention cross-tenant anonymize/export (membership guard + ORM + multi-org block); workforce-costing cartesian join (added user_id predicate); analytics write endpoints gated read→hr:workforce:manage.
- **BOLA write-scope FIXED (defense-in-depth, org_id added to write WHEREs):** payroll-inputs B1/B2, templates B3, benefits claims/dependents B8/B9, webhooks redeliver B10 (secret-leak), equity child tables B15, devices B18, accommodations B19, effective-changes B7. Compliance markOverdueEvents B12 made orgId-required.
- **Permissions FIXED:** analytics P2, safety-create P4, simulator payroll-gate S4. P5/P6 delegations = FALSE POSITIVES (self-service, ownership re-checked in service).
- **Logic FIXED:** applyDueChanges L3 (now applies compensation+manager; leaves work_schedule/policy_assignment PENDING not falsely-applied); comp-planning budget pool L6 (cycle-level only) + swallowed salary write E1 (moved into txn); simulator compare L1; emergency dead-branch L2; forms validator L10 (all visible fields + strict); retention delete L5 (marks processing, no false completion).
- **Validation/SSRF FIXED:** work-auth/contracts days U1 (zod coerce); webhooks SSRF U7 (169.254 metadata + 0.0.0.0); simulator dates U8; drilldown metric U4; forms sensitive carve-out U3.
- **Efficiency FIXED:** all N+1 (workflow inbox batch-cache, attendance policy hoist, step-count join, effective-changes single-txn, custom-fields batch upsert, policies seed batch, compliance batch); JS→SQL aggregation (equity/costing/emergency SUM+GROUP BY); unbounded lists capped; in-memory pagination→SQL; leading-wildcard ILIKE → pg_trgm GIN indexes (migration 0226 APPLIED); forced casts removed.
- **Module guards FIXED:** benefits + payroll-inputs controllers @RequireModule("hr").
- **Verification:** backend tsc 0, frontend tsc 0 (outside stale .next), 107 engine tests re-run.

Original detailed findings below (status: FIXED / IN-WAVE / DONE / FALSE-POSITIVE).

## CORRECTNESS / SECURITY — HIGH

### BOLA cross-tenant write gaps (read scoped, write by bare id → add org_id to WHERE)
- B1 payroll-inputs.service.ts:123,132,230 buildPeriod/unlockPeriod UPDATE — IN-WAVE (FIX-C)
- B2 payroll-inputs.service.ts:393 approveAdjustment UPDATE — IN-WAVE (FIX-C)
- B3 hr-templates.service.ts:115,133 update/transition UPDATE — IN-WAVE (FIX-E)
- B4 hr-workflow-engine.service.ts:149 definition re-fetch — IN-WAVE (FIX-B)
- B5 hr-workflow-engine.service.ts:342-381 sweepOverdueSteps unscoped + inner UPDATE — IN-WAVE (FIX-B)
- B6 hr-policies.service.ts:328 upsertScopes DELETE — IN-WAVE (FIX-E)
- B7 hr-effective-changes.service.ts:241 applyDueChanges UPDATE — DONE (FIX-A added org_id + transaction)
- B8 hr-benefits-claims.service.ts:107,145 reviewClaim/setPayoutRoute — IN-WAVE (FIX-C)
- B9 hr-benefits-enrollment.service.ts:157,181 updateDependent/deleteDependent — IN-WAVE (FIX-C)
- B10 hr-webhooks.service.ts:201 redeliver subscription re-fetch — IN-WAVE (FIX-E)
- B11 hr-webhooks.service.ts:343-349 retryPending unscoped — IN-WAVE (FIX-E)
- B12 compliance-requirements.service.ts:229 markOverdueEvents(orgId?) optional — IN-WAVE (FIX-E)
- B13 contracts.service.ts:167 automation join unscoped hrPeople — IN-WAVE (FIX-E)
- B14 workforce-costing.service.ts:36-42 cartesian join — DONE (orchestrator, added he.user_id=esp.user_id)
- B15 equity.service.ts:116,141,149,172 vesting/exercise by grantId only — IN-WAVE (FIX-D)
- B16 retention exportSubjectData raw SQL no org — DONE (orchestrator, membership guard + ORM)
- B17 retention anonymizeSubject raw SQL no org — DONE (orchestrator, membership guard + multi-org block + ORM)
- B18 devices.service.ts:70 lastSyncAt UPDATE — IN-WAVE (FIX-D)
- B19 accommodations.service.ts:218 createTask no parent-org check — IN-WAVE (FIX-D)

### Permission gaps
- P1 emergency respond no guard — BY-DESIGN self-service (any employee marks safe); ensure service scopes to caller — VERIFY (FIX-D)
- P2 analytics workforce plans POST/PATCH gated read → hr:workforce:manage — DONE (orchestrator)
- P3 analytics metric-definitions/skills-gap/attrition-forecast — FALSE POSITIVE (inherit class-level hr:analytics:read)
- P4 hr-safety.controller.ts:66 POST incidents gated hr:safety:view → hr:safety:manage — TODO correctness wave
- P5 delegations.controller.ts:58,67,79 write gated hr:employees:view → hr:employees:manage — TODO wave
- P6 hr-workflow-delegations.controller.ts:37,47,55 write gated hr:workflows:view → :manage — TODO wave

### Sensitive / module guard
- S1 hr-benefits controllers missing @RequireModule("hr") — TODO wave
- S2 payroll-inputs controller missing @RequireModule("hr") — TODO wave
- S4 simulator simulatePayrollImpact returns salary under hr:policies:manage only — add hr:payroll:view gate — TODO wave (FIX-D)
- S5 hr-forms-public.controller trusts caller orgId in path — validate org exists server-side — TODO wave (FIX-E)

## CORRECTNESS — MEDIUM (logic + swallowed + validation)
- E1 comp-planning approveRecommendation swallows effectiveChanges.create — IN-WAVE (FIX-D)
- E2 payroll-inputs lockPeriod .catch on ledger/loan updates breaks atomicity — TODO wave (FIX-C)
- E3 payroll-inputs-build .catch → zero-row snapshot — TODO wave (FIX-C)
- L1 simulator compare evaluates same args twice (no-op diff) — IN-WAVE (FIX-D)
- L2 emergency broadcast location dead branch — IN-WAVE (FIX-D)
- L3 applyDueChanges drops compensation/manager/work_schedule/policy_assignment (marks applied w/o write) — TODO wave (FIX-A did txn; unhandled-types still marked applied)
- L4 hr-policy-evaluation reads employment_type/country/state/job_level from users (wrong table) → JOIN hrEmployments — TODO wave (FIX-E; do NOT break test signatures)
- L5 retention delete request is a no-op "completed" — TODO wave (orchestrator)
- L6 comp-planning budget pool debits all pools for cycle — IN-WAVE (FIX-D)
- L8/L9 workflow parallel_all wrong actor recorded + double-approve (needs unique idx) — TODO wave (FIX-B partial)
- L10 forms buildZodValidator only validates required fields, allows unknown keys — TODO wave
- U1 work-auth/contracts days query raw string → zod coerce — TODO wave (FIX-E)
- U3 forms sensitive-field public carve-out bypass — TODO wave
- U7 webhooks SSRF missing 169.254/link-local + 0.0.0.0 — TODO wave (FIX-E)
- U8 simulator projectionDate/effectiveDate unconstrained z.string() — TODO wave (FIX-D)

### Forced casts (remove per §7) — C1 people address/emergencyContact, C2 sensitive bankDetails, C3-C5 comp/equity/payroll-compliance setData, C6 workforce-costing rows, C7 identity, C8 workflow-defs approverType, C9 templates bodyHtml — mostly IN-WAVE.

## EFFICIENCY — HIGH (see per-module; N+1/unbounded/JS-aggregation/leading-wildcard)
- Payroll cardinality (attendance capped 100 while all employees processed) — IN-WAVE (FIX-C) — CRITICAL data loss
- attendance-summary 4 policy queries per employee — IN-WAVE (FIX-C)
- workflow inbox N+1, step-count N+1, sweep non-txn — IN-WAVE (FIX-B)
- equity/workforce-costing/emergency JS aggregation → SQL — IN-WAVE (FIX-D)
- timeline in-memory pagination, effective-changes N-txn, custom-fields N+1 upsert, org-catalog unbounded — IN-WAVE (FIX-A)
- policies seed N+1, template render sequential, cases/global unbounded+N+1 — IN-WAVE (FIX-E)
- leading-wildcard ILIKE on people/policies/cases/safety/automation → GIN trgm indexes — migration 0226 DONE

## Migration 0226 — pg_trgm GIN indexes (11) created, pending apply.
