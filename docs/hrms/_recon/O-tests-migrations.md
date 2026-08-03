# Lane O — Tests & Migrations Audit
**Date:** 2026-07-31 | **Status:** READ-ONLY inventory

---

## 1. Migration Inventory

### Counts

| Item | Count |
|------|-------|
| SQL files in `migrations/` (non-down) | 101 |
| `.down.sql` companion files | 5 |
| SQL files in `migrations/pending/` | 1 (`0373_build_money_contract.sql`) |
| Journal entries (`_journal.json`) | 101 |
| Agreement | **YES** — 101 SQL files : 101 journal entries (idx 0–100, no gaps, no duplicates) |

### Dual-prefix anomaly (parallel-branch merging)

Several numeric prefixes are shared by two migration files — evidence of parallel branches merged into the same journal:

```
0300_kb_chunk_content_hash.sql   +  0300_timesheets_launch_grade.sql
0370_build_project_members_org_id.sql  +  0370_tenant_column_integrity.sql
0371_build_status_check_constraints.sql  +  0371_drop_users_role.sql
0372_build_pk_widening_round2.sql  +  0372_timesheets_module.sql
0374_build_partial_indexes.sql  +  0374_tenant_guc_helper.sql
0375_build_drop_dead_reports.sql  +  0375_rls_canary_projects.sql
```

Drizzle identifies migrations by tag (filename), not numeric prefix, so this does not break `db:migrate`. However, the numeric ordering is ambiguous when both files share a prefix.

### Last 15 journal entries

| idx | Tag | Purpose |
|-----|-----|---------|
| 86 | 0366_role_column_defaults | SET statement_timeout=0; default values for role columns |
| 87 | 0367_drop_dead_user_preferences | SET statement_timeout=0; DROP user_preferences table |
| 88 | 0368_rename_ceo_to_final | SET statement_timeout=0; rename CEO designation enum value |
| 89 | 0369_drop_platform_admin | SET statement_timeout=0; DROP platform_admin columns |
| 90 | 0370_build_project_members_org_id | SET statement_timeout=0; add org_id to project_members |
| 91 | 0371_build_status_check_constraints | CHECK constraints on bare-text status columns (Build) |
| 92 | 0372_build_pk_widening_round2 | Widen high-velocity PKs from int4 → int8 |
| 93 | 0374_build_partial_indexes | Convert full indexes to partial (WHERE deleted_at IS NULL) |
| 94 | 0375_build_drop_dead_reports | DROP dead `reports` table |
| 95 | 0370_tenant_column_integrity | SET statement_timeout=0; composite tenant FK integrity |
| 96 | 0371_drop_users_role | SET statement_timeout=0; DROP users.role column |
| 97 | 0372_timesheets_module | SET statement_timeout=0; timesheets schema |
| 98 | 0373_resource_grants | SET statement_timeout=0; resource grants table |
| 99 | 0374_tenant_guc_helper | SET statement_timeout=0; GUC helper for RLS session var |
| 100 | 0375_rls_canary_projects | SET statement_timeout=0; RLS canary policy on projects |

### Destructive migrations (DROP TABLE / DROP COLUMN / TRUNCATE / DELETE FROM)

| Migration | Line | Statement (truncated) |
|-----------|------|-----------------------|
| 0301_inv_stock_levels_natural_key.sql | 55 | `DELETE FROM inv_stock_levels` |
| 0306_chat_org_id.sql | 5,19,33,47,61,75,89,103 | `DELETE FROM "chat_channel_members/messages/..."` WHERE org_id IS NULL |
| 0334_drop_dead_schema_objects.sql | 22–44 | DROP TABLE IF EXISTS workspace_search_chunks, workflow_actions, workflow_triggers, party_addresses, crm_party_accounts, crm_views, hr_mentorships, one_on_one_action_items, inv_party_vendor_profiles, role_permissions, target_history, targets CASCADE |
| 0337_modules_catalog.sql | 93,118 | DELETE FROM "org_modules"; DELETE FROM "module_setup_checklists" |
| 0341_org_units_consolidation.sql | 57–62 | DROP org_business_units, org_teams, org_locations, org_cost_centers, user_memberships, hr_teams CASCADE |
| 0342_role_assignment_collapse.sql | 107,110 | DROP membership_role_assignments, user_roles CASCADE |
| 0344_org_consolidation_finish.sql | 8,20 | DROP org_branches, org_departments CASCADE |
| 0345_payroll_generation_collapse.sql | 143,149,150 | DROP COLUMN payroll_id; DROP salary_structures; DROP payrolls |
| 0348_drop_polymorphic_tables.sql | 151,197 | DROP resource_grants, group_roles CASCADE |
| 0349_retire_legacy_org_tables.sql | 102,241 | DROP hr_locations, branches CASCADE |
| 0350_retire_departments.sql | 180,187 | DROP department_members, departments CASCADE |
| 0352_custom_fields_consolidation.sql | 30–44 | DROP hr_custom_field_values, ticket_custom_field_values, support_ticket_custom_field_values, hr_custom_field_definitions, project_custom_fields, support_custom_fields |
| 0363_collapse_role_zoo.sql | 71 | DELETE FROM "roles" |
| 0364_drop_dead_tables.sql | 31–52 | DROP bank_transfers, hr_employee_certifications, hr_employee_education, hr_employee_profiles, hr_hiring_plan_items, hr_policy_assignments, pm_project_grants, pm_workspace_grants CASCADE |
| 0367_drop_dead_user_preferences.sql | (SET timeout) | DROP user_preferences |
| 0369_drop_platform_admin.sql | (SET timeout) | DROP platform_admin columns from users |
| 0371_drop_users_role.sql | (SET timeout) | DROP users.role column |
| 0375_build_drop_dead_reports.sql | 47 | DROP TABLE IF EXISTS "reports" CASCADE |

### DO blocks

No `DO $$` blocks found in any migration. (Note: `0016_volatile_nicolaos.sql` has a `DO $$ BEGIN IF NOT EXISTS … END $$` block for a FK guard — this is a `DO` block but will not be a statement-timeout risk as it is a simple DDL guard.)

### SET statement_timeout

40 migrations prepend `SET statement_timeout = 0;`. All recent large-batch migrations (0310, 0320, 0322, 0323, 0324, 0329, 0333–0375) have it. Migrations 0007 and 0302 (extension creates + large index builds) do NOT.

### CREATE EXTENSION statements

| Migration | Extension |
|-----------|-----------|
| 0007_search_trgm_indexes.sql | `CREATE EXTENSION IF NOT EXISTS pg_trgm` |
| 0302_inv_perf_indexes.sql | `CREATE EXTENSION IF NOT EXISTS pg_trgm` |
| 0330_worker_engagement_overlap.sql | `CREATE EXTENSION IF NOT EXISTS btree_gist` |

**NOT in any migration:** `vector`, `pgcrypto`, `uuid-ossp`.  
Migration `0016_volatile_nicolaos.sql:10` creates `idx_kb_chunks_embedding_hnsw … USING hnsw ("embedding" vector_cosine_ops)`, requiring the `vector` extension to already exist. The extension is not created by any migration — it must be pre-installed manually before `db:migrate` on a fresh DB.

### Evidence of hand-editing

No hand-edited migrations identified by content inspection. The shared numeric prefixes (see above) are a branch-merge artifact, not post-generation edits.

---

## 2. Migration Reproducibility Risks

| # | Risk | Migration | Notes |
|---|------|-----------|-------|
| R1 | **`vector` extension not created** | 0016 (line 10) | `CREATE EXTENSION vector` must be run manually before `db:migrate` on an empty DB; `db:migrate` will fail at 0016 otherwise. |
| R2 | **`pgcrypto` not created** | Various | If any column uses `gen_random_uuid()` from pgcrypto rather than `gen_random_uuid()` from pg17+ built-in, cold migrate fails. Unconfirmed — extension never referenced in migrations. |
| R3 | **0007, 0302 lack `SET statement_timeout = 0`** | 0007_search_trgm_indexes, 0302_inv_perf_indexes | Both create large GIN/HNSW indexes and call `CREATE EXTENSION`. Neon may timeout without the guard. |
| R4 | **USING INDEX promotions without guard** | 0311_recon_owner_fk_trigger.sql, 0324_recon_directory_party_fks.sql | `ADD CONSTRAINT … USING INDEX` is correct for FK-dependent unique constraints but relies on the index existing at that point. A cold-DB run is fine only if migration ordering is preserved — which it is. |
| R5 | **Dual-prefix ambiguity** | 0300*, 0370*, 0371*, 0372*, 0374*, 0375* | Six numeric prefixes shared by two files. Drizzle uses the tag, not the prefix; the journal is the authority. Not a runtime risk but confusing for humans. |
| R6 | **Pending migration not in journal** | `pending/0373_build_money_contract.sql` | This migration has not been applied (not in journal). If `db:migrate` is run it will be skipped (Drizzle only runs journaled entries). The pending directory needs cleanup. |

---

## 3. Rollback

**Down-migration support:** Partial. Five hand-authored `.down.sql` companion files exist for the Build module only:
- `0370_build_project_members_org_id.down.sql`
- `0371_build_status_check_constraints.down.sql`
- `0372_build_pk_widening_round2.down.sql`
- `0374_build_partial_indexes.down.sql`
- `0375_build_drop_dead_reports.down.sql`

These are NOT Drizzle-native down migrations (Drizzle does not generate/run them automatically). They are companion scripts that must be manually invoked.

**For all other migrations (96 of 101):** NO rollback script exists. This includes every destructive migration (dozens of DROP TABLE operations). Once applied, those migrations are irreversible without a DB snapshot.

---

## 4. Backend Test Inventory

### Totals

| Scope | Files | Approx Lines |
|-------|-------|--------------|
| `modules/hr/**` | 58 | 6,619 |
| `modules/payroll/**` | 43 | 7,395 |
| `modules/billing/**` | 8 | 1,927 |
| `modules/access/**` | 9 | 2,734 |
| `modules/rbac/**` | 8 | 1,080 |
| `test/` (e2e) | 3 files | ~300 |
| **All modules (entire backend)** | **431** | **~63,000** |

### HR module — file list

| File (relative to `backend/src/modules/hr/`) | Subject | Assertion summary |
|---|---|---|
| `benefits/hr-benefits-enrollment.service.spec.ts` | Benefits enrollment | Enrollment, claims |
| `benefits/hr-benefits-plans.service.spec.ts` | Benefits plans | Plan CRUD |
| `config/hr-document-templates.service.spec.ts` | Document templates | Template rendering |
| `core/__tests__/employment-lifecycle-transitions.spec.ts` | Employment lifecycle | Status transitions |
| `core/__tests__/person-employment-backfill.spec.ts` | Person-employment sync | Backfill correctness |
| `core/__tests__/person-employment-sync.service.spec.ts` | Person sync | Sync logic |
| `directory/assets.service.spec.ts` | Asset management | CRUD |
| `directory/assets-scope.spec.ts` | Asset scope | Data scope enforcement |
| `directory/employee-mutations.service.spec.ts` | Employee mutations | Write operations |
| `directory/employees.service.spec.ts` | Employee service | Read/list |
| `directory/__tests__/lifecycle-journey.spec.ts` | Lifecycle | Hire-to-term journey |
| `directory/__tests__/salary-profile-seed.spec.ts` | Salary seeding | Profile creation |
| `lifecycle/exit-write.service.spec.ts` | Exit write | Exit flows |
| `lifecycle/termination.service.spec.ts` | Termination | Status + outputs |
| `lifecycle/__tests__/resignation-notification.spec.ts` | Resignation | Notification dispatch |
| `performance/performance-reviews.service.spec.ts` | Performance reviews | Review CRUD |
| `performance/performance-scope.spec.ts` | Performance scope | Data scope |
| `recruitment/document-variables.util.spec.ts` | Doc variables | Variable resolution |
| `recruitment/recruitment-candidates.movestage.spec.ts` | Stage transitions | Valid/invalid moves |
| `recruitment/__tests__/recruitment-handoff.spec.ts` | Handoff | Offer → employee |
| `onboarding/core/onboarding-requirements.spec.ts` | Onboarding | Requirement checks |
| `onboarding/core/onboarding.controller.spec.ts` | Controller | HTTP layer |
| `onboarding/core/__tests__/onboarding-complete-lifecycle.spec.ts` | Lifecycle | Full onboarding |
| `onboarding/flow/hr-checklist-reconciliation.service.spec.ts` | Checklist | Reconciliation |
| `onboarding/flow/module-checklist.service.spec.ts` | Module checklist | Step tracking |
| `payroll/dto/__tests__/payroll-schemas.spec.ts` | HR payroll schemas | Zod validation |
| `payroll/__tests__/payroll-cross-org-writes.spec.ts` | Cross-org guard | BonusesService/LoansService reject non-member writes |
| `payroll/__tests__/payroll-defaults.spec.ts` | Defaults | Default structure |
| `payroll/__tests__/tax-service.spec.ts` | Tax service | TDS calculations |
| `payroll/__tests__/incentive-stats.spec.ts` | Incentive stats | Aggregation |
| `payroll/__tests__/list-pagination.spec.ts` | Pagination | Page/limit |
| `payroll/reimbursements-scope.spec.ts` | Reimbursement scope | Scope filter |
| `analytics-plus/__tests__/workforce-contracts.spec.ts` | Workforce analytics | Contract metrics |
| `automations/__tests__/hr-automation-engine.spec.ts` | HR automations | Engine execution |
| `cases/__tests__/hr-cases.service.spec.ts` | HR cases | Case CRUD |
| `cases/lib/__tests__/progressive-discipline.spec.ts` | Discipline | Progressive steps |
| `cases/lib/__tests__/service-delivery-aging.spec.ts` | Aging | SLA aging logic |
| `global/lib/__tests__/country-pack-registry.spec.ts` | Country packs | Registry lookup |
| `payroll-inputs/__tests__/payroll-inputs.spec.ts` | Payroll inputs | Input CRUD |
| `payroll-inputs/__tests__/reject-adjustment.spec.ts` | Adjustment rejection | Rejection flow |
| `policies/__tests__/hr-policy-conflict.service.spec.ts` | Policy conflicts | Conflict detection |
| `policies/__tests__/hr-policy-evaluation.spec.ts` | Policy evaluation | Rule engine |
| `templates/__tests__/hr-template-render.spec.ts` | Template render | Mustache/variable |
| `time/__tests__/attendance-policy.spec.ts` | Attendance policy | Policy application |
| `time/__tests__/leave-ledger.spec.ts` | Leave ledger | Balance tracking |
| `time/__tests__/leave-policy-type-scope.spec.ts` | Leave scope | Policy type scoping |
| `time/attendance-scope.spec.ts` | Attendance scope | Scope filter |
| `time/leaves-scope.spec.ts` | Leaves scope | Scope filter |
| `time/worklogs-scope.spec.ts` | Worklogs scope | Scope filter |
| `workflows/__tests__/hr-workflow-engine.spec.ts` | Workflow engine | Step execution |

### Access module

| File | Subject | Assertion summary |
|---|---|---|
| `access.service.spec.ts` | AccessService core | resolve permissions: deny-by-default, owner bypass, role grants, group inheritance, module ownership, version-bump invalidation, stale-key dedup, membersWithPermission with cap |
| `__tests__/access-cache-scope.spec.ts` | Cache scoping | Cache key isolation |
| `__tests__/rbac-resolution.spec.ts` | RBAC resolution | Owner gets all; ORG_ADMIN gets all; module owner gets module-only; cross-tenant isolation; allow-wins union; deny-by-default; ownership transfer service denies non-owner even with permission |
| `permission.guard.spec.ts` | PermissionGuard | Allow/deny per decorator |
| `authorize.spec.ts` | Authorize helper | Authorization flows |
| `entitlements.service.spec.ts` | Entitlements | Module enablement |
| `apply-scope.spec.ts` | applyScope helper | own/team/all SQL filter |

### RBAC module

| File | Subject | Assertion summary |
|---|---|---|
| `__tests__/seed-default-roles.spec.ts` | Role seeding | Default grants applied |
| `__tests__/seed-system-roles.spec.ts` | System roles | System role structure |
| `roles-permissions-matrix.service.spec.ts` | Matrix service | Role-perm cross-join |
| `__tests__/grantable-discovery.spec.ts` | Discovery | Grantable key list |
| `__tests__/role-permission-cas.spec.ts` | CAS (compare-and-swap) | Atomic role updates |

### Billing module

| File | Subject | Assertion summary |
|---|---|---|
| `core/billing.service.spec.ts` | BillingService | Happy path, 23505 idempotency, non-23505 propagates, bad signature throws, not-configured throws |
| `core/__tests__/billing-idempotency.spec.ts` | Billing idempotency | 23505 → success; SELECT-FOR-UPDATE before UPDATE; partial/overage settle; credit arithmetic |
| `core/ai-credits.service.spec.ts` | AiCreditsService | purchaseCreditsDirectly arithmetic, grantPlanCredits idempotency, getWallet trial grant |
| `core/ai-credits-ledger.spec.ts` | AiCreditsReservationService | reserve/settle/release ledger, insufficient balance, overage (negative balance), idempotency, sweep |
| `core/plan-limits.service.spec.ts` | PlanLimitsService | FREE/EXPIRED/CANCELLED/TRIAL/ACTIVE tier resolution; assertWithinLimit allows/blocks; enterprise negotiated seats |
| `core/plan-catalog.spec.ts` | Plan catalog | Plan catalog constants |
| `payments/adapters/razorpay.adapter.spec.ts` | Razorpay adapter | Signature verify, webhook verify, key format validation |

### E2E specs (`backend/test/`)

| File | Subject |
|---|---|
| `app.e2e-spec.ts` | Root health/ping |
| `kb-page-record-links.e2e-spec.ts` | KB page record-link rendering |
| `public-contact.e2e-spec.ts` | Public contact form |

---

## 5. Payroll Test Depth (Standalone `modules/payroll`)

| Scenario | Verdict | Location |
|----------|---------|----------|
| **Golden-file test** | YES | `runs/lib/__tests__/snapshot-replay.spec.ts:11` — replays frozen JSON fixture to byte-identical snapshot (excluding `computedAt`) |
| **Determinism test** | YES | `runs/lib/__tests__/snapshot-replay.spec.ts:15` — same input twice → same output |
| **Parallel-run / known-good comparison** | NOT FOUND | No test compares two independent runs against each other |
| **Idempotency test (re-trigger → no double pay)** | YES | `__tests__/command-receipts.service.spec.ts:27` — replays a SUCCEEDED receipt without re-inserting; FAILED branch reclaims key only on hash match |
| **Locked-run-immutability test** | YES | `runs/lib/__tests__/payroll-transitions.spec.ts:117` — LOCKED/PAID/PAYSLIPS_PUBLISHED/CLOSED statuses block mutating transitions; `prd-acceptance.spec.ts:45` confirms |
| **Rounding/pennies test** | YES | `runs/lib/__tests__/money.spec.ts` — paise conversions, NEAREST/UP/DOWN rounding, pctOf arithmetic |
| **Per-employee "components sum to gross, net = gross − deductions"** | YES (totals-level) | `runs/lib/__tests__/calculation-engine.spec.ts:162` — `net ≈ gross − deductions` asserted at run-total level. No per-employee decomposition test. |
| **Rounding propagation (paise → rupee accumulation error)** | NOT FOUND | No test verifies that line-level rounding does not accumulate into a multi-paise error at the total level |

---

## 6. Billing Test Depth

| Scenario | Verdict | Location |
|----------|---------|----------|
| **Seat over-limit** | YES | `core/plan-limits.service.spec.ts:120` — ForbiddenException when used + increment > limit |
| **Module-not-entitled (payroll blocked on FREE)** | NOT FOUND | `assertWithinLimit` is tested but not the module-level `setModuleEnabled` block |
| **Credits exhausted** | YES | `core/ai-credits-ledger.spec.ts:120` — BadRequestException when balance < reserve |
| **Concurrent credit debit (overdraw)** | PARTIAL | `billing-idempotency.spec.ts:368` — SELECT FOR UPDATE order verified. True concurrent goroutine-style test: NOT FOUND |
| **Webhook replay (idempotent payment)** | YES | `core/__tests__/billing-idempotency.spec.ts:91` — 23505 → success |
| **Webhook bad signature** | YES | `payments/adapters/razorpay.adapter.spec.ts:46` — rejects wrong secret; garbage input |
| **Webhook out-of-order / duplicate** | NOT FOUND | No test for processing events out of Razorpay sequence |
| **Proration** | NOT FOUND | No proration test anywhere in billing specs |
| **Past-due → suspension flow** | NOT FOUND | `plan-limits.spec.ts` tests EXPIRED/CANCELLED but no suspension webhook-triggered transition |

---

## 7. Security Test Depth

| Scenario | Verdict | Location |
|----------|---------|----------|
| **Cross-tenant access (org A cannot read org B)** | YES | `access/__tests__/rbac-resolution.spec.ts:319` — null membership in target org → empty permission map, no DB reads |
| **Cross-tenant write guard (HR payroll bonuses/loans)** | YES | `hr/payroll/__tests__/payroll-cross-org-writes.spec.ts:16` — ForbiddenException for non-member; insert not called |
| **RBAC allow per role** | YES | `access/__tests__/rbac-resolution.spec.ts` extensively — HR_ADMIN, ORG_ADMIN, module owner |
| **RBAC deny per role** | YES | `access/access.service.spec.ts:233` — deny-by-default (no assignments → empty map); role grants only granted keys |
| **Data scope (own/team/all)** | YES | `access/apply-scope.spec.ts` — applyScope filter correctness |
| **Unauthenticated access** | NOT FOUND in scope files | No `@Public`/JWT-absent scenario tested in access/rbac specs |
| **BOLA (object-level re-assertion)** | PARTIAL | Cross-org write guard tested for bonuses/loans; no explicit "user A cannot read user B's payslip" test |
| **Stale/phantom permission key ignored** | YES | `access/access.service.spec.ts:511` — deleted catalog key is silently dropped, does not appear in resolved map |

---

## 8. Mocking Hazards

### `db.transaction` mock pattern

The most common pattern across billing specs:

```ts
// billing.service.spec.ts:58
transaction: jest.fn().mockImplementation(
  (fn: (tx: typeof txMock) => Promise<unknown>) => fn(txMock),
),
```

This is a **passthrough mock** — the callback receives `txMock`, not the outer `db`. It correctly exercises the transaction body. However:

1. **Trap: txMock is incomplete** — `txMock` in `billing.service.spec.ts` chains `update().set().where()` as `mockReturnThis()` returning the same mock object. If the real service calls `.update().set().where().returning()` but the mock only chains to `where: mockResolvedValue([])`, the `returning()` call will fail with "is not a function" or silently return `undefined`. This has been observed as a source of false-green tests.

2. **Trap: `command-receipts.service.spec.ts:5–13`** — `makeDb()` does NOT include a `transaction` key. The service may call `db.transaction(...)` but the mock would throw `"db.transaction is not a function"`. In practice this spec works because `PayrollCommandReceiptsService` uses `db.query` and `db.insert`/`db.update` directly without a transaction wrapper — but if a transaction is ever added to the service, the tests would fail loudly (correct behavior).

3. **`ai-credits-ledger.spec.ts`** — each test builds its own `db.transaction` mock inline. The transaction callback is exercised properly, but the settle/overage test at line 195 (`capturedNewBalance = -3000`) verifies that the final balance can go negative — this is intentional per-design. **This spec correctly mocks what it tests.**

4. **No spec mocks the thing it claims to test at the service level.** All specs test real service class instances wired to mock DB adapters.

---

## 9. Frontend Tests

| Status | Detail |
|--------|--------|
| Jest configured | YES — `jest.config.cjs` (Next.js jest adapter, jsdom environment, `@/` alias mapped) |
| Test files (non-node_modules) | **25 files** |
| Substantive hook tests | `hooks/api/payroll/__tests__/request-hygiene.test.tsx` — enabled/disabled gate behavior, cache invalidation scope |
| RBAC catalog consistency | `lib/rbac/permissions/__tests__/catalog-sync.test.ts` — no duplicate frontend keys; no phantom keys not in backend; every name in PermissionKey union |
| Component render tests | `components/layout/dashboard-shell.test.tsx`, `header/product-switcher-menu.test.tsx`, `stat-card.test.tsx` |
| Feature smoke tests | calendar toolbar/sheet, notification bell, chat shell, HR setup dialogs, mail accounts sheet |
| Route/page integration tests | **NONE** |
| Auth boundary tests | **NONE** |
| Permission-gated component tests | **NONE** |
| Load tests (separate) | k6 scripts under `frontend/scripts/load-tests/` — not Jest |

**Verdict:** Jest is configured and used, but coverage is sparse. The 25 tests cover smoke-level behavior for a handful of components and hooks. No page-level or auth-boundary tests exist.

---

## 10. Coverage Configuration

| Repo | Threshold configured? |
|------|----------------------|
| Backend (`package.json` jest config) | NO — `collectCoverageFrom: "src/**/*.(t|j)s"` and `coverageDirectory: "./coverage"` defined, but **no `coverageThreshold`** |
| Frontend (`jest.config.cjs`) | NO — no `coverageThreshold` |

No coverage gates block CI on low coverage.

---

## 11. Top Findings (P0–P2)

| Sev | Location | Finding |
|-----|----------|---------|
| P0 | `migrations/0016_volatile_nicolaos.sql:10` | `vector` extension required for HNSW index but no `CREATE EXTENSION vector` in any migration — cold `db:migrate` on empty DB **fails** at this step |
| P0 | `migrations/` | 96 of 101 migrations are irreversible (no down migration) including dozens of DROP TABLE operations on payroll, HR, org, role tables |
| P0 | (payroll) | No parallel-run test — two runs on identical inputs never compared; phantom non-determinism would not be caught by any spec |
| P0 | (billing) | No proration test; no past-due → suspension flow test; subscription lifecycle correctness for downgrade/cancellation unverified |
| P1 | `migrations/0007_search_trgm_indexes.sql`, `0302_inv_perf_indexes.sql` | Large index-build migrations lack `SET statement_timeout = 0;` — Neon may cancel on cold DB |
| P1 | (payroll) | Rounding accumulation error: no test verifies that sum of per-line rounded amounts equals stated totals (paise arithmetic accumulation bug would not surface) |
| P1 | (billing) | No true concurrent overdraw test (only ordering verified, not actual parallel execution) — reserve/settle race is untested |
| P1 | (billing) | No out-of-order webhook test — if Razorpay fires `payment.captured` after `subscription.activated`, the state machine is untested |
| P1 | (security) | No unauthenticated access test in any spec — JWT-absent paths untested at service layer |
| P1 | `frontend/` | No coverage threshold — zero coverage on new routes/components does not fail CI |
| P2 | `migrations/pending/0373_build_money_contract.sql` | Migration sits in `pending/` not in journal — ambiguous state (applied? not applied?) |
| P2 | `test/` (e2e) | Only 3 e2e specs (health, KB, public-contact) — no auth flows, no RBAC gates, no payroll/billing endpoints in e2e |
| P2 | (payroll) | Per-employee "components sum to gross" assertion only at totals level; individual line integrity unverified across employees |
| P2 | (billing) | Module-entitlement blocking on FREE plan (`setModuleEnabled` prevents payroll on FREE) has no direct spec |
| P2 | `migrations/` | Six numeric prefixes shared by two files — Drizzle handles it correctly but operational ambiguity when debugging applied order |
