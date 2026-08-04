---
wave: 0
type: reconciliation
status: ACCEPTED (partial — billing repair shipped; full matrices in flight)
date: 2026-08-04
authoritative_over: wave-8-pm-hierarchy-design.md (see wave-0-pm-reconciliation-adr.md)
---

# Wave 0 — Tenant terminology and ADR reconciliation

## Authoritative product rules

| Term | Meaning |
|------|---------|
| **Organization** | The tenant: security, billing, module entitlements, and data isolation boundary. Physical tables: `organizations`, `organization_members`, tenant `org_id`. |
| **PM Workspace** | Product Management collaboration container **inside** an Organization. Physical: `pm_workspaces`. Never the tenant. |
| **Workspace (legacy UI)** | Retired for tenant context. Remaining code symbols (`WorkspaceSwitcher`, preview mocks) are compatibility names only; user-facing copy must say **Organization**. |

Anyone authenticated may create an Organization (owner/admin status is not required). See platform redesign plan §4.

## PM hierarchy decision (vs wave-8)

Full contradiction ledger and decisions live in `wave-0-pm-reconciliation-adr.md` (ACCEPTED 2026-07-26). Summary:

| Topic | `wave-8-pm-hierarchy-design.md` | **Decision** |
|-------|----------------------------------|--------------|
| Container | No `pm_workspaces`; PM hangs off `org_id` | **Plan wins** — `pm_workspaces` is authoritative (`build/pm-workspaces.ts`). |
| PM roster | Rename `project_workspace_members` → org-level `product_management_members` | **Plan wins** — `pm_workspace_memberships` keyed on `organization_membership_id`. |
| Managed products | Org-scoped only | **Amended** — `managed_products` + `pm_workspace_id` spine. |
| Terminology | Strip all "workspace" from PM | **Amended** — strip legacy `project_workspace_*`; keep **PM Workspace** as the sanctioned container label. |

Related inventories: `wave-0-doc-contradiction-inventory.md`, `wave-0-pm-reconciliation-adr.md`.

## Billing `orgId` type repair

**Schema (current):** `backend/src/db/schema/billing/billing.ts` declares `orgId: text(...).references(() => organizations.id)` on `billing_profiles`, `app_installations`, `affiliates`, `revenue_events`, and related platform billing tables. `organizations.id` is `text`.

**Migration (shipped):** `0370_tenant_column_integrity.sql` converts legacy `integer org_id` → `text` on the four empty baseline tables, adds missing org FKs on tenant columns (`invitation_events`, `crm_sla_breach_log`, `email_outbox.organization_id`), and asserts no tenant column remains without an FK.

**Accounting:** Customer AR/AP and finance modules use `text org_id` + FK today — **not** part of the integer mismatch. No shadow column or dual-write path is required for Accounting.

**Ops:** Apply `0370_tenant_column_integrity` on Neon branches that still carry integer billing `org_id`. Fresh `db:migrate` from journal includes this tag.

**Retirement:** After all environments confirm `pg_catalog` column type `text` + FK present, remove DEFERRED-CAST rows for billing tables from `wave-0-rls-matrix.md` Template D section.

## Migration journal status (Wave 0 gate)

Critical repairs are journaled (not push-only):

| Tag | Purpose |
|-----|---------|
| `0370_tenant_column_integrity` | Billing integer → text + orphan-safe org FKs |
| `0117_invitation-events-org-fk` | Invitation events tenant FK hardening |
| `0118_*` | Module-access index hardening |
| `0391_org_scoped_member_lifecycle` | Membership lifecycle SoT |

Full drift narrative: `wave-0-control-plane.md`. Baseline squash remains the long-term exit; incremental journal is the operational path until squash lands.

## Matrix artifacts (this wave)

| Document | Scope |
|----------|-------|
| `composite-fk-matrix.md` | Key tenant spine tables — composite FK readiness + module counts |
| `rls-matrix.md` | Key tenant spine tables — RLS template + rollout gate |
| `compatibility-authorities.md` | Live dual-write / read-fallback authorities + telemetry |
| `module-boundaries-contracts.md` | CRM / Inventory / Party / Payroll-without-HRMS operational contracts |
| `wave-7-composite-fk-matrix.md` | Full ~214-table inventory |
| `wave-0-rls-matrix.md` | Full per-table RLS draft |
| `forward-repair-runbook.md` | 0392/0393 apply, forward repair, telemetry |

## Remaining Wave 0 (out of this slice)

- Full entity-ownership inventory across all modules
- Approve composite-FK + RLS matrices for every tenant table
- Baseline squash / forbid push-only drift (operator runbook)
- PM physical rename cutover (Wave 7+)
