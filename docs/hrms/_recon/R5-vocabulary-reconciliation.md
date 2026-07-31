---
lane: R5
name: Vocabulary Reconciliation & Decision Ledger
phase: 1 (read-only)
date: 2026-07-31
branch: refactoring-hrms
status: FINAL — no further edits without a new R5 run
---

# R5 — Vocabulary Reconciliation

**Method:** Cross-reference `docs/hrms/_recon/*.md`, `docs/hrms/01-inventory.md`,
`docs/hrms/_recon/I-prior-art.md`, `docs/schema-redesign/north-star.md`,
`docs/schema-change-plan.md`, `docs/schema-redesign/todo.md`, `tasks/hrms/**`,
`tasks/payroll/**`, `CLAUDE.md`, and the approved decisions listed in the R5 brief.
Every claim is backed by a `path:line` citation. **No code was modified.**

Evidence marks (inherited from Lane I): `[V]` = verified against source in this session;
`[L]` = cited by a recon lane with its own citation; `[DOC-CLAIM]` = documentation only,
not independently verified against code.

---

## Part 1 — Canonical Vocabulary Table

One row per concept. **The Canonical term column is the ONLY name that should appear in new
code, new docs, new API contracts, and new schema.** Retired synonyms may still appear in
existing code while the wave program migrates them; their locations are listed so they can be
found and updated.

| # | Concept | Canonical term | Code artefact (table / type) | File:line | Retired synonyms | Where synonyms still appear |
|---|---------|----------------|------------------------------|-----------|------------------|-----------------------------|
| V-01 | Multi-tenant boundary | **organization** | `organizations` pgTable | `common/auth.ts:103` [V] | workspace (as tenant), account, company, tenant | `docs/schema-redesign/north-star.md:47` ("workspace" warned against); various legacy comments |
| V-02 | Personal-org marker | **organization.kind = 'PERSONAL'** | `organizations` (planned `kind` col) | north-star:63 [DOC-CLAIM] | personal workspace | not in code yet — `kind` column is north-star target |
| V-03 | Global login identity | **user** | `users` pgTable | `common/auth.ts:103` [V] | identity, account | root `task` file (historical) |
| V-04 | Tenant membership (internal) | **organizationMember** | `organizationMembers` pgTable | `common/auth.ts:82` [V] | member, workspace member, `userMemberships` (deleted), `membership_role_assignments` | north-star §3.1 lists retired role tables; `user_memberships` targeted for deletion |
| V-05 | HR person (tenant-local human) | **hrPerson** (singular) / `hrPeople` (table) | `hrPeople` pgTable | `hr/core-people.ts:67` [V] | employee (as a DB term), `organization_people` (north-star draft), `workers` (north-star draft), person | `docs/schema-redesign/north-star.md:324` (`organization_people`); `tasks/hrms/04_CORE_SCHEMA.md:2` (`hr_people`); root `task` |
| V-06 | Employment contract / dated engagement | **hrEmployment** (singular) / `hrEmployments` (table) | `hrEmployments` pgTable | `hr/core-people.ts:103` [V] | employment, contract, `worker_engagements` (north-star draft), `workers` (north-star draft) | `docs/schema-redesign/north-star.md:325` (`worker_engagements`); brief spec (`employments`) |
| V-07 | Sensitive HR data per employment | **hrEmployeeSensitiveFields** | `hrEmployeeSensitiveFields` pgTable | `hr/core-people.ts:137` [V] | sensitive fields | — |
| V-08 | Employment lifecycle state | **lifecycleStatus** enum | `hrEmploymentLifecycleStatusEnum` | `hr/core-people.ts:19` [V] | employee status, worker status | tasks/hrms/04 uses same enum values ✓ |
| V-09 | Legal entity (per-jurisdiction establishment) | **legalEntity** / `legalEntities` | DOES NOT EXIST YET | (planned) | company, establishment, payroll entity | `payroll_entities` in Gen-3 partially models this (`payroll/entities-periods.ts:41` [L]) — NOT a full legal entity; `orgUnits` approximates it today |
| V-10 | Org structure node (department/team/branch/etc.) | **orgUnit** / `orgUnits` table with `kind` | `orgUnits` pgTable | `common/organization.ts:37` [V] | department (`hr_departments`), team (`hr_teams`), location (`hr_locations`), branch, business unit, cost centre | `tasks/hrms/04_CORE_SCHEMA.md:7-12` (lists discrete tables); `tasks/hrms/10_ORG_STRUCTURE.md`; all are RETIRED — code already uses `orgUnits` |
| V-11 | Org unit kind values | **BUSINESS_UNIT \| BRANCH \| DEPARTMENT \| TEAM \| LOCATION \| COST_CENTER** | `OrgUnitKind` type | `common/organization.ts:15-21` [V] | hr_department, hr_team, hr_location (discrete table names) | tasks/hrms spec files |
| V-12 | Org unit membership | **orgUnitMember** / `orgUnitMembers` | `orgUnitMembers` pgTable | `common/organization.ts:76` [V] | department membership, team member | — |
| V-13 | Manager/reporting relationship | **hrReportingLine** / `hrReportingLines` | `hrReportingLines` pgTable | `hr/core-people.ts:219` [V] | manager link, reporting structure, manager hierarchy | — |
| V-14 | Scheduled future HR change | **hrEffectiveDatedChange** / `hrEffectiveDatedChanges` | `hrEffectiveDatedChanges` pgTable | `hr/core-people.ts:194` [V] | effective date, pending change, future change | — |
| V-15 | Job role definition | **jobRole** / referenced via `hrEmployments.jobRoleId` | `hrEmployments.jobRoleId integer` | `hr/core-people.ts:111` [V] | designation, title, role (in HR context) | no dedicated `hr_job_roles` table found in code — FK exists but references what? (gap) |
| V-16 | Job level / grade | **jobLevel** / referenced via `hrEmployments.jobLevelId` | `hrEmployments.jobLevelId integer` | `hr/core-people.ts:112` [V] | grade, band, level | tasks/hrms/04 lists `hr_job_levels` as required — not found as a standalone table |
| V-17 | Employment type (full-time/contractor/etc.) | **employmentType** / `hrEmployments.employmentTypeId` | `hrEmployments.employmentTypeId integer` | `hr/core-people.ts:113` [V] | worker type, contract type | tasks/hrms/04 lists `hr_employment_types` |
| V-18 | Pay group / payroll entity | **payrollPolicy** (per-org config) + **payrollEntity** (Gen-3 per-establishment) | `payrollPolicies` + `payrollEntities` | `hr/payroll-policies.ts:6` [L], `payroll/entities-periods.ts:41` [L] | pay group, establishment | tasks/payroll/10 uses "payroll policy" ✓ |
| V-19 | Salary component definition | **salaryComponent** / `salaryComponents` | `salaryComponents` pgTable | `hr/payroll-workforce.ts:13` [L] | pay component, earnings component, deduction line | tasks/payroll/12 calls them "salary components" ✓ |
| V-20 | Per-employee salary profile | **employeeSalaryProfile** / `employeeSalaryProfiles` | `employeeSalaryProfiles` pgTable | `hr/payroll-workforce.ts:40` [L] | salary structure, CTC breakdown, salary package | `salary_structure_templates` (Gen-1) is a RETIRED overlapping concept |
| V-21 | Org-level salary template (Gen-1, semi-deprecated) | **salaryStructureTemplate** / `salaryStructureTemplates` | `salaryStructureTemplates` pgTable | `hr/salary-structure-templates.ts:4` [L] | salary structure | functionally overlaps Gen-2 profiles; maintained but not to be expanded |
| V-22 | A single payroll execution | **payrollRun** / `payrollRuns` | `payrollRuns` pgTable | `hr/payroll-runs.ts:12` [L] | payroll run, payroll batch, monthly payroll | — |
| V-23 | Calendar pay period (time window) | **payrollPeriod** / `payrollPeriods` | `payrollPeriods` pgTable | `payroll/entities-periods.ts:74` [L] | payroll cycle, pay cycle | tasks/payroll/10 uses "payroll period" ✓ |
| V-24 | Per-employee payroll record in a run | **payrollRunEmployee** / `payrollRunEmployees` | `payrollRunEmployees` pgTable | `hr/payroll-runs.ts:70` [L] | payslip row, employee payroll detail | — |
| V-25 | Published employee payslip (layout + data) | **payslip** = `payrollRunEmployee` data + `payslipTemplate` layout | `payslipTemplates` + `payrollRunEmployees` | `hr/payroll-payout.ts:10` [L] | payslip, salary slip | — |
| V-26 | Statutory rate parameter (e.g. PF ceiling) | HARDCODED TypeScript constant (no DB table) | `statutory-registry.ts`, `statutory-packs.ts` | `modules/payroll/runs/lib/statutory-registry.ts:108` [V] | statutory config, tax rate, PF config, ESI config | **VIOLATION of non-negotiable #1 (no hardcoded HR policies)** — P0 finding F-03 |
| V-27 | Leave policy (tenant config, rules) | **hrLeavePolicy** / `hrLeavePolicies` | `hrLeavePolicies` pgTable | `hr/leave-policies.ts` [L] | leave rules, leave configuration | — |
| V-28 | Leave type (vacation/sick/etc.) | **leaveType** referenced from policies | `leaveTypeId` FK on `hrLeaveBalances` | `hr/leaves.ts` [L] | leave category | tasks/hrms/12 ✓ |
| V-29 | Leave balance per employee | **hrLeaveBalance** / `hrLeaveBalances` | `hrLeaveBalances` pgTable | `hr/leaves.ts:27` [L] | leave entitlement, leave quota, accrual balance | — |
| V-30 | Raw attendance record (punch in/out) | **hrAttendance** (raw punch fact) | `hrAttendance` pgTable | `hr/attendance.ts` [L] | punch, check-in/check-out | — |
| V-31 | Derived attendance (summary for payroll) | **attendanceSummary** (computed, not a table) | service: `attendance-summary.service.ts` | `modules/hr/time/attendance-summary.service.ts:187` [V] | attendance report, LOP calculation | — |
| V-32 | Subscription plan tier (external product name) | **plan** (STARTER \| PROFESSIONAL \| ENTERPRISE) | `subscriptionPlanEnum` | `common/enums.ts:119` [L] | plan name | `subscriptions.plan` column, `plan-entitlements.constants.ts:16` |
| V-33 | Internal entitlement tier (access level) | **PlanTier** (FREE \| PAID \| ENTERPRISE) | `PlanTier` TypeScript type | `billing/core/plan-entitlements.constants.ts:15` [L] | tier | used in `PlanLimitsService.resolveTier()` |
| V-34 | Price (INR, in paise) | **price in paise** (integer) | hardcoded in `plan-entitlements.constants.ts` | `:83` [L] | price, MRR | STARTER ₹999/mo = 99900 paise |
| V-35 | Feature gate (AI feature per plan) | **PLAN_FEATURES map** | `feature-gates.ts` | `ai/core/billing/feature-gates.ts:39-73` [V] | feature flag, AI feature | reads **stale JWT plan** — P0 bug F-05 |
| V-36 | DB-backed entitlement / limit cap | **entitlement** / `LimitKey` | `PlanLimitsService.getEntitlements()` | `billing/core/plan-limits.service.ts` [L] | quota, limit | caps hardcoded in `plan-entitlements.constants.ts` (not DB) |
| V-37 | RBAC permission key | **permission** (module:resource:action format) | `permissions` catalog table (DB) + `PERMISSIONS[]` array | `modules/rbac/permissions/` folder [L] | role, privilege, right | CASL (deleted); `user_permissions` table (to be retired) |
| V-38 | Resource consumption limit | **limit** / `LimitKey` | `LimitKey` type in `plan-entitlements.constants.ts` | `:24` [L] | quota, cap | same as V-36 — limit IS the quota |
| V-39 | AI credit balance unit | **milli-credit** (integer, 1 credit = 1000) | `org_ai_credits.balance integer` | `billing.ts:123` [L] | credit, AI credit (legacy integer, NOW RETIRED) | old billing plan (2026-06-29) used non-milli integer — SUPERSEDED by 2026-07-20 spec |
| V-40 | Billable seat | **active organizationMember** | `organization_members` COUNT | `billing/core/billing.service.ts:getSeatInfo()` [L] | seat, user seat, paid seat | pending invites RESERVE a seat but bill only on acceptance (D-51) |
| V-41 | Module (product feature set) | **module** (lowercase key) | `modules_catalog` pgTable + `MODULE_CATALOG` constant | `billing.ts` (modules.ts:4) [L]; `common/rbac/module-vocabulary.ts` [L] | product, feature pack, add-on | UPPERCASE `enabledModules` claim in JWT (stripped at guard, module.guard.ts:28) |
| V-42 | External client/portal identity | **portalMembership** / `portalMemberships` | north-star §5 (planned); not yet in HR module | north-star:351 [DOC-CLAIM] | client access, guest | — |
| V-43 | Role (RBAC) | **role** with `moduleKey` scope | `roles` pgTable | `db/schema/common/access.ts` [L] | user_roles (keyed by user_id — RETIRED), `role_permissions` (keyed by slug — RETIRED) | north-star §3.1 retirement list |
| V-44 | Payroll run state | **payrollRunStatus** (12-value enum) | `PREPARING→DRAFT→…→CLOSED` | `common/enums.ts:195` [L] | payroll status, run phase | tasks/payroll/10 ✓ |
| V-45 | Payroll lock | **LOCKED status on payrollRun** | `payrollRuns.status = "LOCKED"` | `hr/payroll-runs.ts:12` [L] | payroll freeze, finalized payroll | — |
| V-46 | Full and final settlement | **fnfSettlement** / `fnfSettlements` | `fnfSettlements` pgTable | `hr/payroll.ts:213` [L] | FNF, full-final, exit settlement | — |

---

## Part 2 — Spec-vs-Code Contradiction Register

Format: **Topic | Doc says (path:line) | Code does (path:line) | Winner | Action**

Only contradictions that affect naming, schema, or expected behaviour — not bug findings
(those are in `01-inventory.md` §3).

| # | Topic | Doc says | Code does | Winner | Action |
|---|-------|----------|-----------|--------|--------|
| C-01 | HR org-structure tables | `tasks/hrms/04_CORE_SCHEMA.md:7-12` lists `hr_departments`, `hr_teams`, `hr_locations`, `hr_job_roles`, `hr_job_levels`, `hr_employment_types` as required tables | Code uses single `orgUnits` table with `kind` enum (`common/organization.ts:37`) — discrete tables do not exist | **CODE wins** (Approved decision from R5 brief, resolves CON-02) | Update tasks/hrms/04 with stale-doc header; no schema change needed |
| C-02 | Person entity name | North-star §4 (`north-star.md:324`): `organization_people` + `workers` + `worker_engagements` | Code: `hrPeople` + `hrEmployments` (`hr/core-people.ts:67,103`) | **CODE wins** (Approved decision from R5 brief — names follow code) | Update north-star §4 with note that `hrPeople`/`hrEmployments` are canonical; `organization_people` etc. are target tables for a future migration wave, not the live HR module tables |
| C-03 | AI credits unit | `docs/superpowers/plans/2026-06-29-billing-platform.md` — integer credits (STARTER=500, etc.) | Code (`billing.ts:123`): `balance integer` in milli-credits; `docs/specs/2026-07-20-ai-token-billing.md` (APPROVED) defines milli-credits | **2026-07-20 spec wins** (D-35, CON-01 resolved) | Mark 2026-06-29 billing plan as superseded on credits section |
| C-04 | Plan tier names for entitlements | `CLAUDE.md §16` and `plan-entitlements.constants.ts:15`: `FREE \| PAID \| ENTERPRISE` | `subscriptionPlanEnum` (`common/enums.ts:119`): `STARTER \| PROFESSIONAL \| ENTERPRISE`; billing plan (2026-06-29): STARTER/PROFESSIONAL/ENTERPRISE | **Both**: `PlanTier` (FREE/PAID/ENTERPRISE) for access decisions; `subscriptionPlanEnum` (STARTER/PROFESSIONAL/ENTERPRISE) for subscription/pricing — different concepts, not a contradiction | Ensure code that makes access decisions uses `PlanTier`, not `subscriptionPlan`. Add clarifying comment to both types. |
| C-05 | DataScope "team" status | `CLAUDE.md §21` and `todo.md:2080` (D-21): `team` is inert, `teamIds: []` hardcoded | Lane H §6: `applyScope()` (`access/apply-scope.ts:29`) uses subquery through `org_unit_members` for TEAM-type units | **NEEDS DECISION** (conflicting lane reports — Q5) | Verify `apply-scope.ts` live code; if wired, close D-21; if still hardcoded, choose wire-or-drop |
| C-06 | Subscription tables (one or two?) | `CLAUDE.md §16` implies one canonical subscription path | Two tables: `subscriptions` (`shared.ts:308`) + `platformSubscriptions` (`platform.ts:92`), both referencing Razorpay, unlinked | **NEEDS DECISION** | Consolidate into `subscriptions` as canonical; retire `platform_subscriptions` unless a justified boundary exists |
| C-07 | Payroll money format | `CLAUDE.md §19`: money as integer cents, never float | Payroll schema: 60+ `decimal(15,2)` columns (`hr/payroll-runs.ts:29-32`, etc.) | **CLAUDE.md wins** — but migration deferred (D-16, D-34) | No change until Plan 11b sign-off (Q7) |
| C-08 | `bonuses` dual amount representation | No spec supports two amount columns | `payroll.ts:194-195`: both `amount decimal(15,2)` AND `amountCents bigint` on same row | **`amountCents` wins** (integer cents is canonical) | Drop `amount` column when Plan 11b runs; application must write `amountCents` exclusively |
| C-09 | `assertWithinLimit` HTTP status | CLAUDE.md §20 A04 implies 402 for quota exhaustion; UX cannot distinguish from 403 | `billing/core/plan-limits.service.ts:205`: throws `ForbiddenException` (403) | **NEEDS DECISION** — 402 is correct for "upgrade to fix" (F-07) | Change to `PaymentRequiredException` (402) with machine-readable `code: "QUOTA_EXCEEDED"` |
| C-10 | `ModuleDisabledException` HTTP status | Logic: "module not enabled" = a billing/plan restriction, not a routing error | `common/http/api-exceptions.ts:6`: returns HTTP **404** | **NEEDS DECISION** — should be 402 or 403 (F at 01-inventory P0 list) | Change to 402 with `code: "MODULE_NOT_ENABLED"` |
| C-11 | Statutory rates — configurable vs hardcoded | `tasks/hrms/00_README.md` non-negotiable #1: "no hardcoded HR policies — every rule configurable" | `modules/payroll/runs/lib/statutory-registry.ts:108` [V]: all PF/ESI/PT/TDS/gratuity rates are TypeScript constants; no DB effective-dated table | **Spec wins — code violates non-negotiable** (F-03, P0) | Design a `statutory_rates` effective-dated table; migrate constants there |
| C-12 | `ENCRYPTION_KEY` required vs optional | Security non-negotiable: PAN, bank, passport stored in DB should be encrypted at rest | `config/env.validation.ts:53`: `ENCRYPTION_KEY: z.string().optional()` — startup succeeds without it; sensitive fields stored plaintext | **Security requirement wins** (F-01/F-02, P0) | Make `ENCRYPTION_KEY` required; apply `encryptSecret()` to `hrEmployeeSensitiveFields` columns |
| C-13 | Frontend permission catalog completeness | `CLAUDE.md §9` requires no catalog drift; `catalog-sync.test.ts:23` has `KNOWN_PHANTOM_KEYS = new Set<string>()` | ~58 backend HR permission keys absent from frontend catalog (`frontend/lib/rbac/permissions/hr.ts`) | **Backend catalog wins; frontend must catch up** (F-28) | Add missing keys to frontend catalog file; most critical: `hr:sensitive:view`, `hr:sensitive:manage` |
| C-14 | `legalEntities` table | Approved decision (R5 brief): `legalEntities` WILL be introduced | No `legal_entities` table exists; legal-entity concerns approximated by `orgUnits.kind` and partially by `payrollEntities` (Gen-3) | **Approved decision** — table must be created | Design migration; `payrollEntities` may become a FK child of `legalEntities` |
| C-15 | `payrollEntities` vs `legalEntities` | `payrollEntities` (`payroll/entities-periods.ts:41`) models "legal entity / establishment" for payroll filing | It is a payroll-scoped table only; no equivalent in HR org model | **Design needed** — `legalEntities` is the canonical parent; `payrollEntities` becomes a child FK | New table + migration; not a reversal, an addition |
| C-16 | `orgUnits.kind` values in north-star vs code | North-star §4: `BUSINESS_UNIT, BRANCH, DEPARTMENT, TEAM` (4 values) | `common/organization.ts:15-21` [V]: 6 values — adds `LOCATION` and `COST_CENTER` | **CODE wins** — code is more complete | Update north-star §4 to reflect actual enum values |
| C-17 | `plan` claim in JWT (stale) | `CLAUDE.md §21`: never use JWT claims for access decisions | `ai/core/billing/feature-gates.ts:79-99` [V]: `requireFeature(u.plan, …)` reads plan from stale JWT claim | **CLAUDE.md wins** (F-05, P0) | Replace JWT plan gate with `PlanLimitsService.resolveTier()` DB call |
| C-18 | HR_ADMIN template completeness | Backend enforces ~120 HR permission keys via `@RequirePermission` | `role-templates.constants.ts:83`: HR_ADMIN template has ~45 keys; ~25-30 enforced backend keys missing | **Backend enforcement wins** (H §5) | Audit HR_ADMIN template; add missing keys (`hr:sensitive:view`, etc.) |
| C-19 | Seat definition (display vs enforcement) | `CLAUDE.md §16`: billable seat = active `organizationMembers`; pending invites reserve | Enforcement (`plan-limits.service.ts`): members + pending invites. Display (`billing.service.ts`): active members only | **Approved decision D-51 resolves**: pending invites RESERVE a seat, billing on acceptance. Enforcement correctly gates; display needs updating to match | Update `billing.service.ts:getSeatInfo()` to show "N active + M pending (reserved)" |
| C-20 | `backfill:rbac` script | `docs/hrms/01-inventory.md` notes `backfill:rbac` as a setup step; PAGES.md references it | `docs/schema-redesign/todo.md` B-18: `backfill:rbac` DELETED in Wave 25; now automatic via `PermissionCatalogSyncService` on boot | **Code wins** | Mark `MIGRATION-RUNBOOK.md` stale; remove all references to `backfill:rbac` from docs |

---

## Part 3 — Superseded Document Register

Documents that are now stale or superseded. Not deleting in this phase — add the recommended
header line to each file.

| Document | Status | Superseded by | Recommended header line |
|----------|--------|---------------|------------------------|
| `task` (root, 764 lines) | HISTORICAL — all todos marked `pending` despite many being done | `docs/schema-change-plan.md` (VERIFIED 2026-07-26) | `> ARCHIVED: This is the original brief. Status is frozen. Current work is tracked in docs/schema-change-plan.md and docs/schema-redesign/todo.md.` |
| `docs/superpowers/plans/2026-06-29-billing-platform.md` (2626 lines) | PARTIALLY SUPERSEDED on credit design | `docs/specs/2026-07-20-ai-token-billing.md` (APPROVED) | `> PARTIAL SUPERSESSION: The AI credit model (milli-credits, reserve/settle) is superseded by docs/specs/2026-07-20-ai-token-billing.md. Payment provider, GL journal, and affiliate sections remain applicable.` |
| `tasks/hrms/_reports/MIGRATION-RUNBOOK.md` | STALE — references defunct migrations 0201-0225; `backfill:rbac` command deleted | Wave 25 (`todo.md` B-18); cold-rebuild (B-01) | `> STALE: Migration range 0201-0225 was for an earlier schema generation. Current migration chain is 0000-0369+. backfill:rbac was deleted in Wave 25.` |
| `docs/schema-redesign/north-star.md §4` (directory model) | PARTIALLY STALE — `organization_people`, `workers`, `worker_engagements` terminology | Approved decision D-47: names follow code (`hrPeople`, `hrEmployments`) | `> NOTE (§4 directory model): organization_people/workers/worker_engagements are the NORTH-STAR TARGET tables, not the live HR module tables. Live HR uses hrPeople/hrEmployments. These will converge in a future wave.` |
| `tasks/hrms/04_CORE_SCHEMA_PEOPLE_ORG_AND_EMPLOYMENT.md` | PARTIALLY STALE — lists discrete org-structure tables | `orgUnits` is live (Approved decision D-48 + C-01) | `> STALE (org structure): hr_departments, hr_teams, hr_locations etc. are superseded by the single orgUnits table with kind enum in the live codebase.` |
| `tasks/hrms/I-prior-art.md` §1 doc index (file list rows 01-43) | MISMATCHED — lists different file names than what is in `tasks/hrms/` on disk | Actual file listing in `tasks/hrms/` | `> DOC-INDEX NOTE: The file list in §1 reflects the original PRD naming. Current files on disk have different names/numbers. Use ls tasks/hrms/ for authoritative list.` |
| `docs/superpowers/plans/2026-07-25-hrms-overhaul-roadmap.md` Plans 01/03-09 | DONE | `docs/hrms/01-inventory.md` (synthesizes findings post-plan execution) | `> Plans 01 and 03-09 are marked DONE. Plans 02, 10, 11a, 11b remain in scope.` |
| `docs/schema-redesign/todo.md` `pending-operator-sql-runbook.md` reference | STALE — the runbook's premise was wrong (54 migrations already applied) | `todo.md` B-01/B-02 resolution | `> STALE: Runbook was written assuming 0 applied migrations. Actual state: all migrations applied. See todo.md B-01.` |

---

## Part 4 — Decision Ledger (Consolidated)

Combines Lane I's D-01 through D-46 (verified 2026-07-31) with approved decisions from the
R5 brief (D-47 through D-52). This is the SINGLE REFERENCE for all architectural decisions.

**Status values:** ACTIVE (binding), SUPERSEDED (retired by a later decision), OPEN (needs user sign-off).

| ID | Decision | Source | Date | Status |
|----|----------|--------|------|--------|
| **ARCHITECTURE** | | | | |
| D-01 | Two separate git repos, no monorepo. Frontend = `D:/projects/personal/Streamlineos`; backend = `…/backend`. Backend dir is gitignored by frontend. | `docs/hrms/00-scope-and-conflicts.md:33` | 2026-07-31 | ACTIVE |
| D-02 | No branch creation by agents. Work stays on `refactoring-hrms`. | `docs/hrms/00-scope-and-conflicts.md:44` | 2026-07-31 | ACTIVE |
| D-03 | Organization is the tenant boundary. No generic Workspace layer. | `north-star.md` Rule 1; `schema-change-plan.md` | 2026-07-26 | ACTIVE |
| D-04 | "Workspace" reserved ONLY for PM bounded context (`pm_workspaces` table). | `schema-change-plan.md §2` | 2026-07-26 | ACTIVE |
| D-05 | Option A — greenfield north-star reached through wave program; NOT big-bang cutover. | `north-star.md:8`; `todo.md:1` | 2026-07-27 | ACTIVE |
| D-06 | "Build" module = delivery + strategy (Projects + Products). Route `/build`; RBAC `build:*`; module key `BUILD`. | `CLAUDE.md §16`; `todo.md` W-27 | 2026-07-27 | ACTIVE |
| D-07 | Platform owner/admin moved to separate app — Wave 28. 216 usages stripped. | `todo.md:2070 area` | 2026-07-30 | ACTIVE |
| D-08 | Shared contract package BLOCKED pending decision — overridden by D-49. | `00-scope-and-conflicts.md:47` | 2026-07-31 | **SUPERSEDED by D-49** |
| D-09 | pgEnum → text+CHECK migration BLOCKED (399 pgEnums in production, platform-wide scope). | `00-scope-and-conflicts.md:48` | 2026-07-31 | **SUPERSEDED by D-50** |
| **SCHEMA / DATABASE** | | | | |
| D-10 | Every tenant-scoped table: composite `uniqueIndex(org_id, col)` — never bare `.unique()` on business key. | `CLAUDE.md §19` | ongoing | ACTIVE |
| D-11 | `users.role` is a leftover column. Build nothing on `users.role`. | `org-rbac-explained.md` Notes | 2026-07-29 | ACTIVE |
| D-12 | `organization_members` is the hub. Permissions resolve from `organization_membership_id`, not global `user_id`. | `north-star.md §3` | 2026-07-27 | ACTIVE |
| D-13 | `org_units` with `kind` enum is the canonical org structure table. Discrete HR tables (`hr_departments`, etc.) are NOT created. | `north-star.md §4`; approved in R5 brief | 2026-07-31 | ACTIVE |
| D-14 | `user_memberships` table DELETED in north-star target. | `north-star.md §4` | 2026-07-27 | ACTIVE |
| D-15 | `calculationSnapshot` JSONB KEEP (immutable reproducibility). Investigate dropping `inputsSnapshot`. | `docs/payroll-audit-2026-07.md §schema` | 2026-07-26 | ACTIVE |
| D-16 | Money as integer cents (`CLAUDE.md §19`) — payroll money-decimal→cents migration DEFERRED pending D-34 sign-off. | `CLAUDE.md §19`; Plan 11b | 2026-07-25 | ACTIVE (deferred) |
| D-17 | No JSONB arrays for lifecycle entities. | `CLAUDE.md §19`; `north-star.md` Rule 1 | ongoing | ACTIVE |
| D-18 | `apply-hrms-migrations.mjs` is inert/deleted (targeted defunct 0201-0226 range). | `tasks/hrms/_reports/MIGRATION-RUNBOOK.md` | 2026-07-11 | ACTIVE |
| D-19 | Drizzle client has `prepare: false` (Neon pooling). Prepared-statement optimization advice in CLAUDE.md §19 is inert. Use indexes/projection/N+1 removal instead. | `00-scope-and-conflicts.md:50` | 2026-07-31 | ACTIVE |
| **RBAC / ACCESS** | | | | |
| D-20 | CASL fully removed from backend. `PermissionGuard` + `AccessService` + `@RequirePermission` are canonical. | `CLAUDE.md §21` | 2026-07-03 | ACTIVE |
| D-21 | `DataScope: "team"` — prior claim it is fully inert (todo.md:2080) is DISPUTED by Lane H §6 (`apply-scope.ts` uses `org_unit_members` subquery). Verification needed. | `todo.md:2080`; `Lane H §6` | 2026-07-31 | OPEN (Q5) |
| D-22 | Permission key format: `"module:resource:action"`, three lowercase colon-separated segments. | `CLAUDE.md §21` | ongoing | ACTIVE |
| D-23 | Role slug always UPPERCASE_SNAKE. Client must uppercase before POST. | `CLAUDE.md §21` | 2026-07-25 | ACTIVE |
| D-24 | `bumpPermissionsVersion(tx, orgId)` in same transaction as any role/permission mutation. | `CLAUDE.md §21` | ongoing | ACTIVE |
| D-25 | `permissions.constants.ts` and `role-templates.constants.ts` protected — no edits without explicit sign-off. | `00-scope-and-conflicts.md:63` | 2026-07-31 | ACTIVE |
| **PAYROLL** | | | | |
| D-26 | Payroll = three schema generations: Gen-1 (`salary_structure_templates`, semi-deprecated), Gen-2 (LIVE-CORE run engine), Gen-3 (extension layer). | `payroll-audit-2026-07.md §schema` | 2026-07-26 | ACTIVE |
| D-27 | `bank_transfers` CORRECTED: the table in scope is `finBankTransfers` in accounting — NOT a payroll dead table. Prior "dead" claim was incorrect. | Lane B §10 [L] | 2026-07-31 | ACTIVE |
| D-28 | `frontend/types/hr/payroll.ts` (237 lines) CONFIRMED DEAD — zero import sites. | `payroll-audit-2026-07.md` | 2026-07-26 | ACTIVE |
| D-29 | Payroll as own top-level module vs HR submodule — PENDING user sign-off. | `payroll-audit-2026-07.md §decisions-pending` | 2026-07-26 | OPEN (Q6) |
| D-30 | Payroll run lifecycle: 11 live statuses (PREPARING→DRAFT→PREVIEW_READY→EXCEPTIONS_FOUND→PENDING_APPROVAL→APPROVED→LOCKED→PAID→PAYSLIPS_PUBLISHED→CLOSED; REOPENED as escape from LOCKED). | `common/enums.ts:195-196` [L]; `tasks/payroll/10` | 2026-07-31 | ACTIVE |
| D-31 | Locked payroll: no edits. Reopen requires admin permission + reason + audit event. Paid payroll cannot be deleted. | `tasks/payroll/10` | 2026-07-26 | ACTIVE |
| D-32 | Immutable calculation snapshot required after lock. | `tasks/payroll/10`; PAGES.md payroll note | 2026-07-04 | ACTIVE |
| D-33 | PayrollOS is a standalone sellable product, not just an HR payroll tab. | `tasks/payroll/00_README.md` | 2026-07-26 | ACTIVE |
| D-34 | Plan 11b (money-decimal→cents + JSONB→child-tables) deferred. No money-schema change without per-migration sign-off. | `plans/2026-07-25-hrms-overhaul-roadmap.md` | 2026-07-25 | ACTIVE (deferred) |
| **BILLING / AI** | | | | |
| D-35 | AI credits: milli-credit ledger. 1 credit = $0.01 = 1000 milli-credits. 1.5× margin over provider price. | `docs/specs/2026-07-20-ai-token-billing.md` (APPROVED) | 2026-07-20 | ACTIVE |
| D-36 | Reserve/settle pattern for AI: reserve atomically BEFORE provider call; refund on provider failure only. | `docs/specs/2026-07-20-ai-token-billing.md`; `CLAUDE.md §20 A04` | 2026-07-20 | ACTIVE |
| D-37 | Razorpay as sole payment provider; abstract interface for future Stripe/Chargebee. | `plans/2026-06-29-billing-platform.md` | 2026-06-29 | ACTIVE |
| D-38 | Plan tiers: FREE / PAID / ENTERPRISE (NOT Starter/Professional at the tier level). `PlanLimitsService` resolves server-side. | `CLAUDE.md §16` | ongoing | ACTIVE |
| D-39 | Platform billing is exactly 2 pages: `/billing` (tabbed) and `/billing/ai-credits`. | `CLAUDE.md §16` | ongoing | ACTIVE |
| **HRMS HARDCODES** | | | | |
| D-40 | All 54 hardcoded HR rules must move to named engines. Hardcoded values remain only as seeded defaults. | `tasks/hrms/_reports/hardcode-audit.md` | 2026-07-11 | ACTIVE — P0 blocking compliance claims |
| **COMPLETED AUDIT PLANS** | | | | |
| D-41 | HRMS overhaul Plans 01, 03-09 DONE. | `plans/2026-07-25-hrms-overhaul-roadmap.md` | 2026-07-25 | ACTIVE |
| D-42 | Plan 02 PENDING two user decisions (Q3 IncentivesController key, Q4 two-tier read model). | `plans/2026-07-25-hrms-overhaul-roadmap.md` | 2026-07-25 | OPEN (Q3, Q4) |
| D-43 | Plan 10 (inline AI) and Plan 11a (safe schema) = roadmap only, not shipped. | `plans/2026-07-25-hrms-overhaul-roadmap.md` | 2026-07-25 | ACTIVE |
| **WAVE PROGRAM** | | | | |
| D-44 | DB cold-rebuilt from empty 2026-07-28. 55/55 migrations (journal says 55 at that time), 776 tables. | `todo.md` BLOCKER RESOLVED | 2026-07-28 | ACTIVE |
| D-45 | Waves 0-28 landed; migrations through idx 89 applied (0000-0369+). | `todo.md` Wave 28 note | 2026-07-30 | ACTIVE |
| D-46 | [DOC-CLAIM] HRMS migrations 0201-0225 (0222 skipped) pending one TTY session — STATUS UNVERIFIED against current Neon branch. | `PAGES.md:895`; `MIGRATION-RUNBOOK.md` | 2026-07-11 | OPEN (Q12) |
| **APPROVED R5 DECISIONS (NEW)** | | | | |
| D-47 | Names follow CODE. `hrPeople` (person), `hrEmployments` (contract), `orgUnits` (org structure) are canonical. North-star's `organization_people`/`workers`/`worker_engagements` and brief's `employees`/`employments` are RETIRED synonyms for docs. | R5 brief (approved) | 2026-07-31 | ACTIVE |
| D-48 | Org structure = single `orgUnits` with `kind` enum (BUSINESS_UNIT, BRANCH, DEPARTMENT, TEAM, LOCATION, COST_CENTER). Resolves CON-02 in favour of north-star (code already implements it). | R5 brief (approved) | 2026-07-31 | ACTIVE |
| D-49 | No monorepo, no shared contract package. Frontend types GENERATED from backend Zod schemas into a committed folder. Supersedes D-08. | R5 brief (approved) | 2026-07-31 | ACTIVE |
| D-50 | Keep existing pgEnums. New status columns use `text + CHECK`. Supersedes D-09. | R5 brief (approved) | 2026-07-31 | ACTIVE |
| D-51 | Billable seat = active `organizationMembers`. Pending invites RESERVE a seat but BILL on acceptance. | R5 brief (approved) | 2026-07-31 | ACTIVE |
| D-52 | `legalEntities` table WILL be introduced (does not exist today). Design TBD; `payrollEntities` likely becomes a FK child. | R5 brief (approved) | 2026-07-31 | ACTIVE |

---

## Part 5 — Explicit Non-Goals for the Whole Programme

Synthesised from `CLAUDE.md`, `north-star.md §8` (explicitly rejected), and recon findings.
These are deliberately NOT being done. Raise a challenge before implementing any of them.

| # | Non-goal | Source |
|---|----------|--------|
| NG-01 | A generic "Workspace" layer above or beside Organization | `north-star.md §8`; `CLAUDE.md §16` |
| NG-02 | A shared generic `products` table (Managed Product ≠ CRM Offer ≠ Inventory Item ≠ Inventory SKU) | `north-star.md §8` |
| NG-03 | External authorization runtime (Keycloak, OpenFGA, SpiceDB, Cerbos) | `north-star.md §8` |
| NG-04 | A generic ABAC/JSON policy DSL | `north-star.md §8` |
| NG-05 | Big-bang cutover — every table is reached through the wave program | `north-star.md §8`; D-05 |
| NG-06 | Monorepo or published shared contract package (D-49: generated types instead) | `CLAUDE.md §6`; D-49 |
| NG-07 | `class-validator` / decorator DTOs — repo uses Zod exclusively (2,177+ `ZodValidationPipe` call sites) | `CLAUDE.md §18` |
| NG-08 | Platform-wide pgEnum → text+CHECK migration (399 pgEnums; far exceeds engagement scope) | D-50 |
| NG-09 | CASL anywhere (deleted) | D-20; `CLAUDE.md §21` |
| NG-10 | Polymorphic resource grants (`resource_type`, `resource_id`) — replace with typed grant tables | `north-star.md §3.6` |
| NG-11 | `users.role` as an authority source | D-11; `north-star.md §3.1` |
| NG-12 | JWT claims for permission decisions (always DB-resolved via `AccessService`) | `CLAUDE.md §21` |
| NG-13 | Frontend business logic, DB access, or business REST routes (only NextAuth/auth-bridge allowed) | `CLAUDE.md §6` |
| NG-14 | Direct provider OAuth flows for integrations (all via Composio on backend) | `CLAUDE.md §6` |
| NG-15 | Hardcoded HR policies (all configurable via policy engine) | `tasks/hrms/00_README.md` non-negotiable #1 |
| NG-16 | `DataScope: "team"` without a clear decision to wire or drop it (Q5 must be answered first) | D-21; Q5 |
| NG-17 | Payroll money-schema migration without per-migration sign-off (Plan 11b gate) | D-34; Q7 |
| NG-18 | Dropping `organizations` as the tenant boundary | `north-star.md §8` |
| NG-19 | RLS as a replacement for service-layer object-level checks — it is a backstop only | `CLAUDE.md §20`; `north-star.md §7` |
| NG-20 | `app/api/**` business routes in Next.js (only NextAuth + auth-bridge) | `CLAUDE.md §6` |
| NG-21 | Arrays or JSONB for any collection of individually-addressable entities | `CLAUDE.md §19`; `north-star.md` Rule 1 |
| NG-22 | Deploying to change statutory rates (P0 — must move to DB-effective-dated table) | F-03; non-negotiable #1 |

---

## Part 6 — Open Decisions Still Outstanding

These genuinely require a user decision before coding can proceed in the affected areas.
Recommended defaults are included — accept or override.

| # | Question | Recommended default | Blocks |
|---|----------|--------------------|----|
| Q3 | IncentivesController permission key: `crm:incentives:approve` or `hr:payroll:approve`? | **`hr:payroll:approve`** — incentives as variable compensation = HR+Payroll domain, not CRM | Plan 02 |
| Q4 | Two-tier employee read: one key (`hr:employees:view`) or two distinct (`hr:employees:read` for list + `hr:employees:view` for 360°)? | **Keep two-tier as already coded** (`employees.controller.ts:82,100,107…`) — the split is intentional and must be honoured in frontend gates | Plan 02; F-34 fix |
| Q5 | DataScope `"team"` fate: verify whether `apply-scope.ts` TEAM subquery is live and working, then decide to wire or drop. | **Verify first. If the DB subquery works, fix `hr-policy-evaluation.service.ts:153` to use it. If it doesn't, drop `"team"` from the enum.** | RBAC DataScope correctness |
| Q6 | Payroll module ownership: own top-level module (`payroll:*` namespace, `/payroll` routes) vs HR submodule (`hr:payroll:*`). | **Own top-level module** — PayrollOS is a standalone sellable product (D-33); separate namespace, separate module key `PAYROLL` | Route structure; RBAC catalog |
| Q7 | Payroll money-decimal → integer cents (Plan 11b): sign off now or continue deferring? | **Continue deferring** — risk of touching 60+ columns and 259 `parseFloat` call sites without a complete migration plan. Defer until a dedicated migration sprint with rollback plan. | All payroll schema migrations |
| Q8 | Payroll PK strategy for NEW payroll tables: `generatedAlwaysAsIdentity()` vs serial vs UUID. | **`generatedAlwaysAsIdentity()`** for any new table (matches CLAUDE.md §19); existing `serial` tables stay as-is unless touched | New payroll table migrations |
| Q9 | Design for `legalEntities` table: which columns? Relation to `payrollEntities`, `orgUnits`, `organizations`? | Needs a separate design doc. Minimum: `(id, org_id, name, country_code, currency_code, tax_registration_number, registration_type, effective_from)`. `payrollEntities.legalEntityId` FK added. | D-52 implementation |
| Q10 | e2e specs excluded from CI (`testPathIgnorePatterns: ["e2e-spec"]`): fix jest config now or continue writing dormant specs? | **Fix the jest config now** — writing specs that never run is dead letter and wastes effort | CLAUDE.md §27 compliance |
| Q11 | Billing `orgId` type mismatch: `billing_profiles`/`app_installations`/`affiliates`/`revenue_events` use integer `org_id` while `org_modules.org_id` is varchar(36). | **Migrate billing tables to `text` UUID org_id** — integer FK to a text PK is structurally broken; include in next billing schema hardening pass | CON-04; billing JOIN queries |
| Q12 | HRMS migrations 0201-0225 status: have they been applied to the current Neon branch? | **Verify with `SELECT * FROM drizzle.__drizzle_migrations ORDER BY id`** before writing any schema that depends on `hr_*` tables added in that range | Any HR schema migration |
| Q13 | CSAT module fate: stay in Support or move to Surveys? | **Keep in Support** (`support:csat:*`) — CSAT is a post-ticket rating, not a standalone survey product; merge Surveys only if the domain substantially overlaps | `support-cleanup-findings.md` resolution |
| Q14 | RLS implementation: when does it begin, which tables first? | **Defer to a dedicated access-convergence wave (Wave 30+)** — requires app GUC plumbing that is not yet built; do not mix with HRMS program | Wave program sequencing |
| Q15 | B1/B3/B4 legacy column retirement (`users.role`, `organization_members.role`, explicit DENY model, typed resource grants): include in HRMS program or defer? | **Defer to access-convergence wave** — these are platform-wide breaking changes; HRMS program should not widen scope to touch the core auth schema | Wave program sequencing |

---

## Appendix — Evidence Trail

All findings cited above trace to the following verified source files (read in this session):

- `docs/hrms/01-inventory.md` — synthesis inventory with `[V]`/`[L]` marks
- `docs/hrms/_recon/A-hr-schema.md` — HR schema audit (234 tables, 90 enums)
- `docs/hrms/_recon/B-payroll-billing-schema.md` — payroll/billing schema audit (41+29 tables)
- `docs/hrms/_recon/E-billing-entitlements.md` — billing, entitlements, seats, AI credits
- `docs/hrms/_recon/H-cross-cutting.md` — RBAC, identity, security, PII, audit trail
- `docs/hrms/_recon/I-prior-art.md` — 45 prior decisions, 8 contradictions, 15 open questions
- `docs/hrms/_recon/J-time-to-pay.md` — time-to-pay chain (two disconnected chains)
- `docs/schema-redesign/north-star.md` — target schema (DRAFT, code is authoritative for live tables)
- `docs/schema-redesign/todo.md` (first 100 lines) — wave program status / BLOCKER resolved
- `backend/src/db/schema/common/organization.ts` — `orgUnits` table / kind enum [V]
- `tasks/hrms/04_CORE_SCHEMA_PEOPLE_ORG_AND_EMPLOYMENT.md` — spec table list [V]
