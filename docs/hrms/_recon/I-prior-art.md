# Recon Lane I — Prior Art & Prior Decisions Inventory

Phase 1, read-only. Every claim cites its source file. Claims labelled `[DOC-CLAIM]` are taken from documentation without code verification (other lanes own the code).

---

## 1. Document Index

### Specification / PRD Pack

| File | Lines | Status |
|---|---|---|
| `tasks/AUDIT_PROMPT.md` | ~150 | Module-by-module audit protocol, severity ladder |
| `tasks/hrms/00_README_IMPLEMENTATION_ORDER.md` | ~80 | 43-file HRMS PRD; non-negotiables, enterprise edge-cases |
| `tasks/hrms/01_PRODUCT_OVERVIEW.md` | — | PeopleOS product vision |
| `tasks/hrms/02_CORE_ARCHITECTURE_AND_PRINCIPLES.md` | — | Architecture principles |
| `tasks/hrms/03_PERSON_WORKER_UNIFIED_DIRECTORY.md` | — | Unified directory model |
| `tasks/hrms/04_CORE_SCHEMA_PEOPLE_ORG_AND_EMPLOYMENT.md` | — | Core schema spec |
| `tasks/hrms/05_ONBOARDING_AND_LIFECYCLE.md` | — | Onboarding/lifecycle flows |
| `tasks/hrms/06_LEAVE_AND_ABSENCE_MANAGEMENT.md` | — | Leave ledger spec |
| `tasks/hrms/07_ATTENDANCE_AND_TIME_TRACKING.md` | — | Attendance / shifts |
| `tasks/hrms/08_PERFORMANCE_MANAGEMENT.md` | — | Performance cycles |
| `tasks/hrms/09_PAYROLL_INPUTS_CONTRACT.md` | — | buildPayrollInputs interface |
| `tasks/hrms/10_OFFBOARDING_AND_EXIT_MANAGEMENT.md` | — | Exit / FNF |
| `tasks/hrms/11_RECRUITMENT_AND_HIRING.md` | — | ATS spec |
| `tasks/hrms/12_TRAINING_AND_LEARNING.md` | — | LMS spec |
| `tasks/hrms/13_SUCCESSION_AND_CAREER_DEVELOPMENT.md` | — | Succession planning |
| `tasks/hrms/14_WORKFORCE_ANALYTICS_AND_REPORTING.md` | — | Analytics / reporting |
| `tasks/hrms/15_POLICY_ENGINE.md` | — | No-code policy engine |
| `tasks/hrms/16_APPROVAL_WORKFLOW_ENGINE.md` | — | Multi-step approval workflows |
| `tasks/hrms/17_DOCUMENT_MANAGEMENT.md` | — | Document vault |
| `tasks/hrms/18_NOTIFICATIONS_AND_COMMUNICATION.md` | — | Notification spec |
| `tasks/hrms/19_BENEFITS_AND_COMPENSATION.md` | — | Benefits / equity spec |
| `tasks/hrms/20_COMPLIANCE_AND_AUDIT.md` | — | Audit log spec |
| `tasks/hrms/21_GLOBAL_WORKFORCE_FEATURES.md` | — | Multi-country / global |
| `tasks/hrms/22_INTEGRATIONS_AND_WEBHOOKS.md` | — | Composio + webhook spec |
| `tasks/hrms/23_DATA_RETENTION_AND_ARCHIVAL.md` | — | GDPR / legal hold |
| `tasks/hrms/24_MAKER_CHECKER_AND_FOUR_EYES.md` | — | 4-eyes approval |
| `tasks/hrms/25_DELEGATION_AND_ACTING_AUTHORITY.md` | — | Delegation spec |
| `tasks/hrms/26_PAYROLL_SIMULATION.md` | — | Dry-run simulation |
| `tasks/hrms/27_ESOP_AND_EQUITY.md` | — | ESOP / equity tracking |
| `tasks/hrms/28_GRIEVANCE_AND_DISCIPLINARY.md` | — | Grievance spec |
| `tasks/hrms/29_TRAVEL_AND_EXPENSE.md` | — | T&E spec |
| `tasks/hrms/30_CONTRACTOR_MANAGEMENT.md` | — | Contractor/freelancer |
| `tasks/hrms/31_HR_FIELD_WORKER_FEATURES.md` | — | Field worker features |
| `tasks/hrms/32_HR_ANALYTICS_PLUS.md` | — | Advanced analytics |
| `tasks/hrms/33_EMPLOYEE_SELF_SERVICE_PORTAL.md` | — | ESS portal spec |
| `tasks/hrms/34_MANAGER_SELF_SERVICE.md` | — | MSS portal spec |
| `tasks/hrms/35_MOBILE_HR.md` | — | Mobile-specific spec |
| `tasks/hrms/36_AUDIT_SECURITY_COMPLIANCE.md` | — | Security / audit spec |
| `tasks/hrms/37_AI_INTELLIGENCE_AND_COPILOT.md` | — | AI copilot spec |
| `tasks/hrms/38_CUSTOMIZATION_AND_EXTENSIBILITY.md` | — | Custom fields / forms |
| `tasks/hrms/39_THIRD_PARTY_INTEGRATIONS.md` | — | 3rd-party integrations |
| `tasks/hrms/40_MULTI_ENTITY_AND_GROUP.md` | — | Multi-entity / group payroll |
| `tasks/hrms/41_DATA_MIGRATION_AND_IMPORT.md` | — | Data migration |
| `tasks/hrms/42_IMPLEMENTATION_GUIDE.md` | — | Implementation guide |
| `tasks/hrms/43_ENTERPRISE_PACK_SUMMARY.md` | — | Enterprise feature matrix |
| `tasks/payroll/00_README.md` | ~40 | PayrollOS standalone product spec |
| `tasks/payroll/01_*.md` – `tasks/payroll/33_*.md` | — | Full payroll PRD (33 files) |
| `tasks/payroll/10_Payroll_Run_Lifecycle.md` | — | 12-status run lifecycle |
| `tasks/payroll/14_Tax_Statutory_Compliance_And_Declarations.md` | — | India statutory spec |

### Architecture / Audit Documents

| File | Status | Role |
|---|---|---|
| `docs/schema-redesign/north-star.md` | DRAFT — awaiting verification | Target schema design (Option A) |
| `docs/schema-redesign/todo.md` | Living — 2084 lines, Wave 28 done | Migration wave tracker |
| `docs/schema-redesign/org-rbac-explained.md` | Verified vs live DB 2026-07-29 | Plain-English RBAC explanation |
| `docs/schema-change-plan.md` | VERIFIED 2026-07-26 | Platform domain redesign (10-pass review) |
| `docs/payroll-audit-2026-07.md` | 2026-07-26 | Master payroll audit |
| `docs/hrms/00-scope-and-conflicts.md` | Verified 2026-07-31 | Phase 0 output; rule conflicts |
| `docs/superpowers/plans/2026-07-25-hrms-overhaul-roadmap.md` | Living | 11-plan HRMS program; Plans 01/03-09 DONE |
| `docs/superpowers/plans/2026-06-29-billing-platform.md` | 2626 lines; superseded on credits | Billing engine full-code plan |
| `docs/specs/2026-07-20-ai-token-billing.md` | APPROVED; supersedes billing plan credits | Token-metered AI billing spec |
| `tasks/hrms/_reports/api-audit-findings.md` | 2026-07-11 | 10 features 404, 2 missing routes, orphan pages |
| `tasks/hrms/_reports/hardcode-audit.md` | 2026-07-11 | 54 hardcoded HR findings, 15 categories |
| `tasks/hrms/_reports/MIGRATION-RUNBOOK.md` | 2026-07-11 | `[DOC-CLAIM]` migrations 0201-0226 pending TTY |
| `PAGES.md` | Living, 944 lines | Page completion tracker |
| `task` (root) | 764 lines | Original full-stack brief; all todos `status: pending` |

---

## 2. Decisions Already Taken — COMPLETE LIST

Do not re-debate any item below. Source cited for each.

### Architecture & Repos
- **D-01** Two separate git repos, no monorepo. Frontend at `D:/projects/personal/Streamlineos`; backend at `.../Streamlineos/backend`. The backend directory is gitignored by the frontend repo. (`docs/hrms/00-scope-and-conflicts.md:33`)
- **D-02** No branch creation by agents. Work stays on `refactoring-hrms`. (`docs/hrms/00-scope-and-conflicts.md:44`)
- **D-03** Organization is the tenant boundary. No generic "Workspace" layer. (`docs/schema-redesign/north-star.md` Rule 1, `docs/schema-change-plan.md` tenancy verdict)
- **D-04** "Workspace" is reserved ONLY for the PM bounded context (`pm_workspaces` table). Not a generic tenant concept anywhere else. (`docs/schema-change-plan.md` §2 reconciliation note, MEMORY)
- **D-05** Option A — greenfield north-star reached through wave program; NOT a big-bang cutover. (`docs/schema-redesign/north-star.md:8`, `docs/schema-redesign/todo.md:1`)
- **D-06** "Build" module = delivery + strategy (formerly Projects / Product Management). Route `/build`; RBAC `build:*`; module key `BUILD`. `project` ≠ `product` ≠ `Build module` are distinct. (`CLAUDE.md §16`, `docs/schema-redesign/todo.md` W-27)
- **D-07** Platform owner/admin moved to a separate app — Wave 28 (2026-07-30). 216 usages stripped. (`docs/schema-redesign/todo.md:2070` area)
- **D-08** Shared contract package (Q1) BLOCKED pending decision — cannot be done without a monorepo or published package. (`docs/hrms/00-scope-and-conflicts.md:47`)
- **D-09** pgEnum → text+CHECK migration (Q2) BLOCKED — 399 pgEnums in production; platform-wide migration far exceeds engagement scope. (`docs/hrms/00-scope-and-conflicts.md:48`)

### Schema / Database
- **D-10** Every tenant-scoped table must have composite `uniqueIndex(org_id, col)` — never a bare `.unique()` on a business key. (`CLAUDE.md §19`)
- **D-11** `users.role` is a leftover column. "Do not build anything on `users.role`." (`docs/schema-redesign/org-rbac-explained.md` Notes section)
- **D-12** `organization_members` is the hub for a person inside a tenant. Permissions resolve from `organization_membership_id`, not from global `user_id`. (`docs/schema-redesign/north-star.md` §3 RBAC model)
- **D-13** `org_units` with `kind` enum replaces 10 overlapping tables (`hr_departments`, `hr_teams`, `hr_locations`, etc.) in the north-star. (`docs/schema-redesign/north-star.md` §2 directory model)
- **D-14** `user_memberships` table DELETED in north-star. (`docs/schema-redesign/north-star.md` §2)
- **D-15** `calculationSnapshot` JSONB KEEP — immutable reproducibility. Investigate dropping `inputsSnapshot`. (`docs/payroll-audit-2026-07.md` §schema)
- **D-16** Money as integer cents, never float. (`CLAUDE.md §19`) — payroll money-decimal→cents decision PENDING user sign-off (Plan 11b). (`docs/superpowers/plans/2026-07-25-hrms-overhaul-roadmap.md` Plan 11b)
- **D-17** No JSONB arrays for lifecycle entities. (`CLAUDE.md §19`, `docs/schema-redesign/north-star.md` Rule 2)
- **D-18** `apply-hrms-migrations.mjs` [DOC-CLAIM] is inert / deleted (targeted defunct 0201-0226 range). (`tasks/hrms/_reports/MIGRATION-RUNBOOK.md`)
- **D-19** Drizzle client has `prepare: false` (Neon pooling). Prepared-statement optimization advice in CLAUDE.md §19 is therefore inert. Use indexes / projection / N+1 removal instead. (`docs/hrms/00-scope-and-conflicts.md:50`)

### RBAC / Access
- **D-20** CASL fully removed from backend. `PermissionGuard` + `AccessService` + `@RequirePermission` are the canonical path. (`CLAUDE.md §21`)
- **D-21** `DataScope: "team"` is inert — no table links a member to an org team; `teamIds: []` is hardcoded. Must be wired or dropped. (`docs/schema-redesign/todo.md:2080`)
- **D-22** Permission key format: `"module:resource:action"`, three lowercase colon-separated segments. (`CLAUDE.md §21`)
- **D-23** Role slug always UPPERCASE_SNAKE (`PROJECT_MANAGER`). Client must uppercase before POST. (`CLAUDE.md §21`)
- **D-24** `bumpPermissionsVersion(tx, orgId)` must be called in same transaction as any role/permission mutation. (`CLAUDE.md §21`)
- **D-25** `permissions.constants.ts` and `role-templates.constants.ts` are protected — no edits without explicit sign-off. (`docs/hrms/00-scope-and-conflicts.md:63`)

### Payroll
- **D-26** Payroll = three schema generations: Gen-1 (legacy/deprecate), Gen-2 (LIVE-CORE run engine), Gen-3 (extension layer). (`docs/payroll-audit-2026-07.md` §schema-inventory)
- **D-27** `bank_transfers` table + service + controller CONFIRMED DEAD. (`docs/payroll-audit-2026-07.md`)
- **D-28** `frontend/types/hr/payroll.ts` (237 lines) CONFIRMED DEAD — zero import sites. (`docs/payroll-audit-2026-07.md`)
- **D-29** Payroll is its own module (own-module decision PENDING). (`docs/payroll-audit-2026-07.md` §decisions-pending)
- **D-30** Payroll run lifecycle: 12 statuses (Not started → Preparing → Draft → Preview ready → Exceptions found → Pending approval → Approved → Locked → Paid → Payslips published → Closed → Reopened). (`tasks/payroll/10_Payroll_Run_Lifecycle.md`)
- **D-31** Locked payroll = no edits. Reopen requires admin permission + reason + audit event. Paid payroll cannot be deleted. (`tasks/payroll/10_Payroll_Run_Lifecycle.md`)
- **D-32** Immutable calculation snapshot required after lock. (`tasks/payroll/10_Payroll_Run_Lifecycle.md`, PAGES.md payroll note)
- **D-33** PayrollOS is a standalone sellable product, not just an HR payroll tab. (`tasks/payroll/00_README.md`)
- **D-34** Plan 11b (money-decimal→cents + JSONB→child-tables) deferred — requires per-migration sign-off. No money-schema change without that sign-off. (`docs/superpowers/plans/2026-07-25-hrms-overhaul-roadmap.md`)

### Billing / AI
- **D-35** AI credits: milli-credit ledger. 1 credit = $0.01. Stored as integer milli-credits (×1000). 1.5× margin over provider list price. (`docs/specs/2026-07-20-ai-token-billing.md` — APPROVED, supersedes 2026-06-29 billing plan on credits)
- **D-36** Reserve/settle pattern for AI: reserve atomically BEFORE provider call; refund on provider failure only. (`docs/specs/2026-07-20-ai-token-billing.md`, `CLAUDE.md §20 A04`)
- **D-37** Razorpay as sole payment provider; abstract interface for future Stripe/Chargebee. (`docs/superpowers/plans/2026-06-29-billing-platform.md`)
- **D-38** Plan tiers: FREE / PAID / ENTERPRISE (NOT Starter/Professional). `PlanLimitsService` resolves server-side. (`CLAUDE.md §16`)
- **D-39** Platform billing is exactly 2 pages: `/billing` (tabbed) and `/billing/ai-credits`. (`CLAUDE.md §16`)

### HRMS Hardcodes (Per hardcode-audit.md)
- **D-40** All 54 hardcoded HR rules must move to named engines. Hardcoded values remain only as seeded defaults. (`tasks/hrms/_reports/hardcode-audit.md` summary — `[DOC-CLAIM]`)

### Completed Audit Plans
- **D-41** HRMS overhaul Plans 01, 03-09 DONE. (`docs/superpowers/plans/2026-07-25-hrms-overhaul-roadmap.md`)
- **D-42** Plan 02 PENDING two user decisions (see §10 Q3, Q4). (`docs/superpowers/plans/2026-07-25-hrms-overhaul-roadmap.md`)
- **D-43** Plan 10 (inline AI) = roadmap only, not shipped. Plan 11a (safe schema) = roadmap only. (`docs/superpowers/plans/2026-07-25-hrms-overhaul-roadmap.md`)

### Wave Program (migration status)
- **D-44** DB cold-rebuilt from empty 2026-07-28. 55/55 migrations, 776 tables. (`docs/schema-redesign/todo.md` BLOCKER RESOLVED)
- **D-45** Waves 0-28 landed; migrations 0337-0369 applied; 89/89 total. (`docs/schema-redesign/todo.md` Wave 28 note)
- **D-46** [DOC-CLAIM] HRMS migrations 0201-0225 (0222 skipped) pending one TTY session. (`PAGES.md:895`, `tasks/hrms/_reports/MIGRATION-RUNBOOK.md`)

---

## 3. North-Star Schema Summary

Source: `docs/schema-redesign/north-star.md`. Status: DRAFT — awaiting verification; extends `docs/schema-change-plan.md`.

### 8 Governing Rules (north-star.md §1)
1. Organization = tenant boundary. Personal org = `kind='PERSONAL'`. No generic Workspace layer.
2. No JSONB arrays for entity collections (invitations, members, approvals, comments, audit logs, tasks, events, documents) — each gets its own table.
3. Composite FK pattern — every tenant-scoped row carries `org_id` as a non-nullable FK with a composite leading index `(org_id, …)`.
4. No polymorphic references — no `(entity_type, entity_id)` columns; use typed junction tables or typed grant tables.
5. Soft-delete via `deleted_at` on all lifecycle entities.
6. No external authz service (no Keycloak, OpenFGA, SpiceDB, Cerbos).
7. No ABAC DSL; hybrid tenant RBAC + relational scopes + typed ReBAC.
8. No big-bang cutover — every table is reached through the wave program.

### Key New Tables Specified
- `module_ownerships`, `ownership_transfers` — ownership transfer protocol
- `modules` (catalog), `permissions`, `permission_supported_scopes` — permission catalog tables
- `roles` (with `module_key` + `rank` ladder: Owner 0 / OrgAdmin 10 / ModuleAdmin 20 / ModuleCustom 30 / Functional 40)
- `role_assignments`, `principal_groups`, `principal_group_members`, `group_role_assignments` — group-based assignment
- Typed resource grant tables (not a polymorphic `resource_grants`)

### Directory Model
- `users` (global login record) + `organization_members` (hub — one per person per org) + `organization_people` (tenant-local human, may exist without a `user`) + `workers` + `worker_engagements` + `portal_memberships`
- `org_units` with `kind` enum replaces: `hr_departments`, `hr_teams`, `hr_locations`, `branches`, `cost_centers`, `profit_centers` and 4 more overlapping tables
- `user_memberships` table DELETED

### Explicitly Rejected
Dropping Organization, generic workspace layer, shared `products` table, Keycloak/OpenFGA/SpiceDB/Cerbos, ABAC DSL, big-bang cutover.

---

## 4. Contradictions Between Documents — COMPLETE LIST

### CON-01 — AI Credits: INTEGER vs MILLI-CREDIT
- `docs/superpowers/plans/2026-06-29-billing-platform.md` uses INTEGER credits (500/2000/10000 plan grants, unit operations, no ×1000 factor).
- `docs/specs/2026-07-20-ai-token-billing.md` (APPROVED, later) uses milli-credits (×1000). Migration multiplies existing balances ×1000.
- **Resolution: 2026-07-20 spec supersedes. Integer credits design is retired. Any code or doc referencing non-milli credits must be updated.**

### CON-02 — HRMS Schema Tables vs North-Star `org_units`
- `tasks/hrms/04_CORE_SCHEMA_PEOPLE_ORG_AND_EMPLOYMENT.md` specifies discrete tables: `hr_departments`, `hr_teams`, `hr_locations`, `hr_job_roles`, `hr_job_levels`, etc.
- `docs/schema-redesign/north-star.md` §2 collapses all of these into a single `org_units` table with a `kind` enum.
- **Resolution: Not yet decided. The HRMS PRD spec was written before the north-star was drafted. The north-star is DRAFT status. This is an open architectural question for the change-map phase.**

### CON-03 — "Workspace" Banned vs "Workspace" in PM Context
- CLAUDE.md §16 says: "Workspace" reserved for PM bounded context (`pm_workspaces` table) — supersedes earlier "Workspace banned entirely" rule.
- `docs/schema-redesign/north-star.md` Rule 1 says: no generic Workspace layer. Organization = tenant boundary.
- **Resolution: Compatible if read carefully. `pm_workspaces` is a PM-domain entity, not a tenant-scoping concept. Both rules can coexist. No action needed — just do not use "workspace" as a synonym for tenant or for any other entity.**

### CON-04 — Billing `orgId` Type Mismatch
- `billing_profiles`, `app_installations`, `affiliates`, `revenue_events` use integer `org_id`.
- `org_modules.org_id` is varchar(36).
- **Source: `docs/schema-change-plan.md` line ~36 (billing orgId note).**
- **Resolution: Not yet fixed. Must be tracked in the billing schema hardening pass. Joining these tables requires a cast or is currently broken.**

### CON-05 — Plan Tier Names: FREE/PAID/ENTERPRISE vs STARTER/PROFESSIONAL/ENTERPRISE
- `CLAUDE.md §16` specifies: FREE / PAID / ENTERPRISE.
- `docs/superpowers/plans/2026-06-29-billing-platform.md` uses STARTER / PROFESSIONAL / ENTERPRISE with specific credit grant amounts (500/2000/10000).
- **Resolution: CLAUDE.md wins (§29.2). FREE/PAID/ENTERPRISE are canonical. The billing plan's tier names and credit grants must be reconciled to match.**

### CON-06 — `DataScope: "team"` Is Inert vs Documented
- `CLAUDE.md §21` documents `DataScope: "team"` as a valid scope (same dept).
- `docs/schema-redesign/todo.md:2080` states it is inert — no table links a member to an org team; `hr-policy-evaluation.service.ts:153` hardcodes `teamIds: []`.
- **Resolution: `todo.md` reflects actual code state (verified 2026-07-29). Offering a scope that can never grant is worse than neither. Either wire team membership or drop `team` from `DataScope`. Decision needed.**

### CON-07 — Root `task` File vs `docs/schema-change-plan.md` Status
- Root `task` file (764 lines) is the original brief. All todos in it are `status: pending`.
- `docs/schema-change-plan.md` is the VERIFIED update (senior-architect ten-pass review 2026-07-26). Several of those same todos are now `in_progress`.
- **Resolution: `docs/schema-change-plan.md` is authoritative. The root `task` file is historical — do not use it for current status tracking.**

### CON-08 — e2e Specs Never Run
- CLAUDE.md §27 requires controller e2e specs for every new module.
- `docs/schema-redesign/todo.md` W-29 notes: `testPathIgnorePatterns: ["e2e-spec"]` in jest config — e2e specs never run in CI.
- **Resolution: This is a known open item (W-29). Any new e2e spec must also fix the jest config for it to actually run. Writing a spec without fixing the pattern is dead letter.**

---

## 5. HRMS Spec Coverage Analysis

Source: `tasks/hrms/00_README_IMPLEMENTATION_ORDER.md` + file listing (43 files, tasks/hrms/01–43).

### Well-Covered Domains (spec exists)
- Core people & org schema (04), onboarding/lifecycle (05), leave (06), attendance (07), performance (08), payroll inputs contract (09), exit/FNF (10), recruitment (11), training (12), succession (13), analytics (14), policy engine (15), approval workflows (16), documents (17), notifications (18), benefits/compensation (19), compliance/audit (20), integrations (22), data retention (23), maker-checker (24), delegation (25), payroll simulation (26), ESOP/equity (27), grievance/disciplinary (28), T&E (29), contractors (30), field workers (31), analytics-plus (32), ESS (33), MSS (34), mobile (35), security/audit (36), AI copilot (37), customization (38), 3rd-party integrations (39), multi-entity/group (40), data migration (41).

### Weak / Gap Areas
- **Multi-country statutory compliance**: task 21 covers global workforce; task 14 (tax/statutory) is India-only (PF, ESI, PT, TDS, gratuity, LWF). No spec for EU/US/APAC statutory rules. The spec marks global as a separate phase.
- **Equity / ESOP mechanics**: task 27 exists but is listed as an enterprise pack — not a core deliverable.
- **Group payroll / multi-entity consolidation**: task 40 exists; depth unknown without reading it.
- **Identity lifecycle (SSO, deprovisioning)**: mentioned in 00_README non-negotiables but no dedicated task file visible.
- **Legal hold / data retention specifics**: task 23 exists but compliance law details (GDPR vs India DPDP) are left to implementation.

### Non-Negotiables from 00_README (must be verified against code)
1. No hardcoded HR policies — every rule configurable. (`tasks/hrms/00_README_IMPLEMENTATION_ORDER.md`)
2. Effective-dated changes for department/manager/location/designation/comp/schedule/policy. (`tasks/hrms/04_CORE_SCHEMA_PEOPLE_ORG_AND_EMPLOYMENT.md`)
3. Sensitive field stricter access (salary, bank, tax ID, medical, disciplinary). (`tasks/hrms/04…`)
4. Workflow-driven lifecycle transitions. (`tasks/hrms/00_README`)
5. Support for all worker types: employees, contractors, interns, temps, consultants, field, remote, alumni. (`tasks/hrms/00_README`)
6. Enterprise edge cases: data retention, legal hold, identity lifecycle, delegation, payroll simulation, ESOP/equity. (`tasks/hrms/00_README`)
7. `[DOC-CLAIM]` All 54 hardcode findings must be addressed before compliance claims can be made. (`tasks/hrms/_reports/hardcode-audit.md`)

---

## 6. Payroll Spec Coverage Analysis

Source: `tasks/payroll/00_README.md` + file listing (33 files, tasks/payroll/00–33).

### Covered by Spec
- Run lifecycle (10): 12 statuses, 16-step flow — fully specified.
- Salary components engine: earnings/deductions/formula types.
- Tax and statutory (14): India-specific (PF, ESI, PT, TDS, §87A, OLD/NEW regime). Policy-toggle driven — not hardcoded per spec.
- Payslip immutability: required after lock; locked payroll cannot be deleted.
- Maker-checker (task 24): 4-eyes approval pattern for payroll approval.
- FNF: 9-component net, HR/Finance review states, statement download.
- Simulation (task 26): dry-run before lock.
- Multi-currency payout sub-batches.
- Journal double-entry.

### Non-Negotiables from 00_README
1. PayrollOS must be a standalone sellable product. (`tasks/payroll/00_README.md`)
2. Five required templates: Indian Standard, Indian Startup Flexible, Contractor/Consultant, Sales Incentive, Global Remote.
3. Guided owner setup wizard.
4. Preview → exceptions → approval → lock → payout → payslip → audit cycle — all steps required.

### Gaps in Spec
- Multi-country statutory config: mentioned in tasks/hrms/21 (global workforce) but payroll statutory spec (task 14) is India-only. No spec exists for US Medicare / EU contributions.
- Per-category receipts: PAGES.md payroll note says "per-category receipts need schema" — not yet specified.
- SALARY_ON_HOLD and DUPLICATE_BANK_ACCOUNT detection: wired but unpopulated (PAGES.md note).
- US Medicare YTD / India PT brackets per state: PAGES.md says "need schema."

### Confirmed Issues (from audit, docs/payroll-audit-2026-07.md)
- `[DOC-CLAIM]` SEC-1: loans/reimbursements pages missing `requirePermission`.
- `[DOC-CLAIM]` SEC-2: zero `enabled: useCan()` gates on ~50 payroll queries.
- `[DOC-CLAIM]` SEC-3: `@RequireModule("payroll")` absent on every endpoint.
- `[DOC-CLAIM]` API-1: `generateRunLocked` = per-employee sequential loop inside one transaction (~2500-5000 round-trips for 500 employees).
- `[DOC-CLAIM]` API-8: `payroll-posting.service.ts` uses `parseFloat`/`toFixed(4)` float math for ledger money.

---

## 7. Billing Prior Art Summary

### 2026-06-29 Billing Plan (`docs/superpowers/plans/2026-06-29-billing-platform.md`, 2626 lines)
- Complete code for: `MarketplaceService`, `AiCreditsService`, `AffiliateService`, `ReferralService`, `RevenueAnalyticsService`.
- Razorpay as sole provider; abstract interface (`PaymentProvider`) for future Stripe/Chargebee.
- Plan grant amounts (NOW SUPERSEDED on credit design): STARTER=500, PROFESSIONAL=2000, ENTERPRISE=10000 integer credits.
- Billing profile: GSTIN/PAN fields; country default "IN".
- `billingProfiles.orgId` is integer (bare FK, no FK constraint declared in the plan code).
- Contains full GL journal double-entry implementation.
- **Credit design superseded by 2026-07-20 spec (CON-01).**

### 2026-07-20 AI Token Billing Spec (`docs/specs/2026-07-20-ai-token-billing.md`, APPROVED)
- `computeTokenCharge(model, promptTokens, completionTokens) → { costUsd, milliCredits }`.
- 1.5× margin over provider list price. 1 credit = $0.01. Stored as milli-credits (integer ×1000).
- Reserve before call; settle after with actual tokens; streaming uses `onFinish`.
- Existing balances must be multiplied ×1000 in migration.
- Every AI result surface renders `AiUsageChip`.
- Minimum charge: 0.01 credit; balance may go slightly negative on overage.

### Already Built (PAGES.md billing entries)
- `/billing` — tabbed: Plan + promo + seats + usage meters · Invoices & Payments · Billing Profile. `[x]` done.
- `/billing/ai-credits` — wallet, top-up packs, auto-top-up, history. `[x]` done.
- `/billing/invoices` — org's own customer invoicing (accounting), not platform billing. `[x]` done.
- All billing pages marked done as of PAGES.md.

### PAGES.md Notes on Billing
- `[x]` status often means "page was built/shipped." Pending migration status varies — several entries note "migration PENDING" or "BUILD NOT run."

---

## 8. PAGES.md Current State

Source: `PAGES.md` (944 lines). Assessed 2026-07-31.

### Format
Large header comment block with detailed changelogs per module, then module sections with `[x]` / `[ ]` items. `[x]` = shipped; does not guarantee all pending migrations applied.

### HR / Payroll / Billing Completion Counts

| Module | Approximate Routes | Status |
|---|---|---|
| HR Core (employees, org, attendance, shifts, leaves, onboarding, exit, recruitment, performance, learning) | ~85 routes | All `[x]` |
| HR Settings (policy, workflow, automations, templates, forms, custom-fields, preview, versions, import/export, integrations) | ~10 hub routes | All `[x]` |
| Payroll (20 routes) | 20 | All `[x]` |
| Billing (2 platform pages + invoices) | ~3 | All `[x]` |
| KB Wiki | ~16 | All `[x]` |
| Build (Projects/Products) | Not checked in this lane | — |

### PAGES.md Payroll Note (line 824)
"Migrations 0147-0150 applied. 261 unit + 4 e2e suites. Full conformance pass 2026-07-04. Gap-closure pass 2026-07-05: ~24 P0 + ~35 P1/P2 fixed. Migration 0155_payroll_gapclosure written (UNRUN, unjournaled — renumber before db:migrate). NOT build/test-verified this pass."

### PAGES.md HRMS Note (line 895)
"Backend + frontend typecheck green. Migrations 0201–0225 (0222 skipped, no table) pending one TTY session."

### Orphan Pages (no nav path — from api-audit-findings.md)
- `/hr/my-payslips` — no nav path
- `/hr/workforce-cost` — no nav path
- `/hr/settings/company` — no nav path
- `/hr/payroll/*` subtree — possibly stale duplicate of canonical `/payroll/*`

### 10 Features 404 in Production (missing from `MIGRATED_PREFIXES`)
analytics-plus, career-development, kpis, leave-policies, mentorships, probation, succession, termination, bonuses, incentives. (`tasks/hrms/_reports/api-audit-findings.md`)

### 2 Missing Routes (live 404)
- `DELETE /hr/recruitment/candidates/:candidateId/vault/:documentId`
- `POST /payroll/runs/:runId/employees/:runEmployeeId/adjustments`

---

## 9. Root `task` File — Role and Status

Source: `task` (764 lines).

The root `task` file is the ORIGINAL full-stack brief ("act as 50 years experienced full stack developer"). It contains:
- Scope declaration: review and fix Build module (Projects, Products, Clients, Freelancing Users).
- Platform domain redesign YAML — same content later verified and updated in `docs/schema-change-plan.md`.
- All todos in the YAML are `status: pending`.

The same todos appear as `in_progress` in `docs/schema-change-plan.md` (verified 2026-07-26). The schema-change-plan is authoritative. The root `task` file is historical and should not be used for current status tracking. It may be safely archived.

---

## 10. Open Questions — COMPLETE LIST

These are unresolved; they block downstream work or require a user decision before coding.

### Q1 — Shared Contract Package
Cannot share DTOs/Zod schemas between frontend and backend without a monorepo or published package. Two separate git repos block this. **Decision needed: monorepo restructure, published internal package, or accept copy-by-hand with lint drift?** (`docs/hrms/00-scope-and-conflicts.md:47`)

### Q2 — pgEnum vs text+CHECK
North-star §21 specifies `text + CHECK`. Repo has 399 pgEnums in production. Platform-wide migration far exceeds engagement scope. **Decision needed: keep all pgEnums as-is, migrate only new tables, or phased migration?** (`docs/hrms/00-scope-and-conflicts.md:48`)

### Q3 — IncentivesController Permission Key
Plan 02 (HRMS overhaul) needs a user decision: should `IncentivesController` use `crm:incentives:approve` (current) or `hr:payroll:approve`? (`docs/superpowers/plans/2026-07-25-hrms-overhaul-roadmap.md` Plan 02)

### Q4 — Two-Tier Employee Read Model
Plan 02 needs confirmation: `hr:employees:read` (basic profile) vs `hr:employees:view` (full 360°). Are these two separate permission keys or one? (`docs/superpowers/plans/2026-07-25-hrms-overhaul-roadmap.md` Plan 02)

### Q5 — DataScope `"team"` Fate
`DataScope: "team"` is inert — no table links members to org teams; `teamIds: []` hardcoded. **Decision: wire team membership (requires schema + service work) or drop `"team"` from `DataScope` enum?** (`docs/schema-redesign/todo.md:2080`)

### Q6 — Payroll Module Ownership
Payroll as own top-level module vs submodule of HR. Affects route structure, RBAC namespace, and module enablement key. (`docs/payroll-audit-2026-07.md` §decisions-pending)

### Q7 — Payroll Money-Decimal → Integer Cents (Plan 11b)
CLAUDE.md §19 mandates integer cents. Existing payroll schema uses decimal. Plan 11b deferred pending per-migration sign-off. **Decision: sign off on the migration now, or continue deferring?** (`docs/superpowers/plans/2026-07-25-hrms-overhaul-roadmap.md` Plan 11b)

### Q8 — Payroll PK Identity
Payroll tables use which PK strategy? `generatedAlwaysAsIdentity()` vs `serial` vs UUID. (`docs/payroll-audit-2026-07.md` §decisions-pending)

### Q9 — HRMS Schema: Spec Tables vs North-Star `org_units`
HRMS PRD (task 04) specifies `hr_departments`, `hr_teams`, `hr_locations` as discrete tables. North-star collapses all to `org_units` with kind enum. **Decision: do the HRMS migrations adopt north-star `org_units` or ship discrete spec tables first and migrate later?** (CON-02 above)

### Q10 — W-29: e2e Specs Excluded from CI
`testPathIgnorePatterns: ["e2e-spec"]` means all e2e specs are dead letter. `CLAUDE.md §27` requires e2e specs for new modules. **Decision: fix the jest config now so e2e actually runs, or continue writing dormant specs?** (`docs/schema-redesign/todo.md` W-29)

### Q11 — Billing `orgId` Type Mismatch
`billing_profiles`/`app_installations`/`affiliates`/`revenue_events` use integer `org_id`. `org_modules.org_id` is varchar(36). JOIN between these is currently broken or requires a cast. **Decision: migrate billing tables to UUID org_id, or add a cast column?** (CON-04 above, `docs/schema-change-plan.md` line ~36)

### Q12 — HRMS Migrations TTY Session
Migrations 0201-0225 `[DOC-CLAIM]` pending one TTY session. **Status: have these been applied to the current Neon branch? The PAGES.md note says pending; the cold-rebuild from 2026-07-28 (55/55 migrations through 0369) suggests they may already be in.** Verify before writing any schema that depends on `hr_*` tables.

### Q13 — `csat` Module Fate
`support-cleanup-findings.md` (MEMORY) notes: csat-vs-surveys module fate still undecided. Does CSAT live in Support, or move to Surveys, or remain standalone? Affects permission key namespace and module routing.

### Q14 — RLS (Row-Level Security) Implementation
B5/E2 — RLS never built; blocked by app GUC plumbing. **Decision: when does RLS implementation begin, and which tables are in scope for the first wave?** (`docs/schema-redesign/todo.md:2079`)

### Q15 — B1/B3/B4 Legacy Column Retirement
Three structural items still open: (B1) `users.role` / `organization_members.role` columns not retired; (B3) explicit DENY model absent; (B4) typed `resource_grants` absent. **Decision: include these in the current HRMS program, or defer to a dedicated access-convergence wave?** (`docs/schema-redesign/todo.md:2077-2079`)
