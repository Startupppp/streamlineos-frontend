---
wave: 0
type: rls matrix (key spine)
status: NEEDS RECONCILIATION
date: 2026-08-04
full_inventory: wave-0-rls-matrix.md
policy_templates: wave-0-rls-matrix.md §1
---

# RLS matrix — tenant spine (key tables)

GUCs (fail-closed): `app.organization_id`, `app.organization_membership_id`, `app.audience` (`INTERNAL` | `PORTAL`).

| Table | Audience | Policy template | FORCE RLS | Migration phase | Notes |
|-------|----------|-----------------|-----------|-----------------|-------|
| `organizations` | INTERNAL | Template C (dual read for membership check) | Pilot only | Phase 1 canary | Root row; special-case read |
| `organization_members` | INTERNAL | Template A | After composite FKs | Phase 1 | Identity read policy `0383` |
| `role_assignments` | INTERNAL | Template A | Wave 4+ | Phase 2 | Bust on `bumpPermissionsVersion` |
| `org_modules` | INTERNAL | Template A | Wave 4+ | Phase 2 | Module enablement gate |
| `invitations` | INTERNAL | Template A | Wave 4+ | Phase 2 | Accept flow uses service-layer BOLA until RLS |
| `invitation_events` | INTERNAL | Template A | Wave 4+ | Phase 2 | Append-only audit |
| `pm_workspaces` | INTERNAL | Template A | Wave 7+ | Phase 3 | PM container boundary |
| `projects` | INTERNAL | Template A | Canary | `0375_rls_canary_projects` | Pilot table |
| `billing_profiles` | INTERNAL | Template A | Wave 4+ | Phase 3 financial | Integer cast **retired** after `0370` |
| `app_installations` | INTERNAL | Template A | Wave 4+ | Phase 3 | Same |
| `affiliates` | INTERNAL | Template A | Wave 4+ | Phase 3 | Same |
| `revenue_events` | INTERNAL | Template A | Wave 4+ | Phase 3 financial | Same |
| `organization_people` | INTERNAL | Template A | Wave 4+ | Phase 2 directory | People directory; HRMS-independent |
| `workers` | INTERNAL | Template A | Wave 4+ | Phase 2 workforce | Child of `organization_people` |
| `worker_engagements` | INTERNAL | Template A | Wave 4+ | Phase 2 workforce | Child of `workers`; engagement overlays |
| `portal_memberships` | PORTAL | Template B | Wave 9+ | Phase 3 portal | Audience GUC `PORTAL`; not internal RBAC |
| `project_client_grants` | PORTAL | Template B | Wave 9+ | Phase 3 portal | BOLA-safe project visibility; grant + membership ACTIVE |
| `pm_workspace_memberships` | INTERNAL | Template A | Wave 7+ | Phase 3 PM | Workspace-scoped delivery membership |
| `business_parties` | INTERNAL | Template A | Wave 4+ | Phase 2 party | Module-independent; CRM/Inventory optional |
| `party_contacts` | INTERNAL | Template A | Wave 4+ | Phase 2 party | Child of `business_parties` |
| `crm_products` | INTERNAL | Template A | Wave 4+ | Phase 3 CRM | Offers; no Inventory dependency |
| `inv_products` | INTERNAL | Template A | Wave 4+ | Phase 3 inventory | Catalog root |
| `inv_product_variants` | INTERNAL | Template A | Wave 4+ | Phase 3 inventory | SKU rows |
| `inv_vendors` | INTERNAL | Template A | Wave 4+ | Phase 3 inventory | No CRM module gate; legacy `client_id` display bridge |
| `offer_fulfillment_components` | INTERNAL | Template A | Wave 6+ | Phase 3 integration | Bridge table; `@RequireModule(["crm","inventory"])` on API |
| `employee_salary_profiles` | INTERNAL | Template A | Wave 4+ | Phase 2 payroll | Dual subject `user_id`/`worker_id (`0392`) |
| `payroll_run_employees` | INTERNAL | Template A | Wave 4+ | Phase 2 payroll | Dual subject (`0392`) |
| `payslip_publications` | INTERNAL | Template A | Wave 4+ | Phase 2 payroll | Dual subject (`0393`) |
| `payroll_bank_batch_items` | INTERNAL | Template A | Wave 4+ | Phase 2 payroll | Dual subject (`0393`) |
| `payroll_tds_ytd_ledger` | INTERNAL | Template A | Wave 4+ | Phase 2 payroll | Dual subject (`0393`) |

## Shadow observation (no FORCE RLS until matrix approved)

Tables above marked Wave 4+ remain on service-layer BOLA + `runInTenantTransaction` only. Do **not** enable FORCE RLS on new table groups without an approved row in this matrix and a negative GUC test in CI.

> Implementation audit, 2026-08-04: migrations `0376`-`0378` enabled ordinary (not FORCE) RLS more broadly by discovering text `org_id`/`organization_id` columns; `0378` is explicitly catalog-wide. That implementation is broader than this approved key-spine matrix, so the sentence above is not a claim about current database state. Do not copy the catalog-wide approach into new migrations. Reconcile every enabled table into tenant-owned, nullable global-overlay, public/bootstrap, or global/platform classifications and test its real service paths before tightening, replacing, or removing a policy.

## Exclusions (no RLS — compensating control)

| Table | Reason |
|-------|--------|
| `users`, `accounts`, `sessions` | Global identity; app-layer auth only |
| `permissions`, `modules_catalog` | Global catalog |
| `marketplace_apps`, `ai_credit_packs` | Platform catalog |

## Operator checklist before enabling FORCE RLS on a row

1. Composite FK matrix row approved for table + parents
2. `runInTenantTransaction` wraps all service writes
3. Negative tests: missing GUC → 0 rows; cross-tenant id → 404 at service layer
4. Neon pooler verified with tenant GUC helper (`0374_tenant_guc_helper`)

Full table list: `wave-0-rls-matrix.md`. Rollout sequencing: `rls-rollout-plan.md`.
