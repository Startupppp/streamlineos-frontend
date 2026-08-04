---
wave: 0
type: module boundary contracts
status: ACCEPTED (operational for current code paths)
date: 2026-08-04
---

# Module boundary contracts — CRM / Inventory / Party / Payroll-without-HRMS

Operational truth for **current shipped code**. Physical renames and party cutovers remain deferred per platform redesign Waves 6–9.

## Party (module-independent)

| Surface | Module gate | CRM required | Inventory required | HRMS required |
|---------|-------------|--------------|-------------------|---------------|
| `GET/POST/PATCH/DELETE /party/parties` | None (`party:*` RBAC only) | No | No | No |
| `/parties` FE page | `party:parties:view` | No | No | No |
| Nav: Administration → People → Business Parties | Permission only | No | No | No |

Vendors as **business parties** (`party_type = VENDOR`) are creatable without Inventory. Inventory `inv_vendors` remains a separate catalog until Wave 6 party FK cutover.

## Inventory vendors (no CRM entitlement)

| Surface | Module gate | CRM required | Party required |
|---------|-------------|--------------|----------------|
| `GET/POST/PATCH /inventory/vendors` | `@RequireModule("inventory")` | No | No (optional legacy `client_id`) |
| Vendor CRUD service | Inventory module only | No | No |

`inv_vendors.client_id` is a **nullable** legacy bridge to `clients` — not required for create/list. No `@RequireModule("crm")` on vendor endpoints.

## CRM offers (no Inventory entitlement for catalog)

| Surface | Module gate | Inventory required |
|---------|-------------|-------------------|
| CRM product/offer CRUD | CRM module + `crm:products:*` | No |
| `/crm/settings/products` FE | CRM module | No |

CRM offers (`crm_products`) operate without Inventory enabled.

## Offer fulfillment bridge (both modules required)

| Surface | Module gate | Notes |
|---------|-------------|-------|
| `GET/POST/PATCH/DELETE /offer-fulfillment` | `@RequireModule(["crm", "inventory"])` + `ModuleGuard` | Integration-owned; maps offer → SKU |
| CRM product form fulfillment UI | **Not shipped** | When built: gate with `useModuleEnabled("inventory")` + `useCan("crm:offer-fulfillment:view")`; no Inventory CTA when module off |
| Inventory SKU detail reverse mapping | **Not shipped** | When built: gate with `useModuleEnabled("crm")`; no CRM CTA when module off |

Schema: `offer_fulfillment_components` — no cross-module FK; service asserts tenant-safe offer + SKU existence (404 cross-tenant).

## Payroll without HRMS

| Surface | HRMS module gate | Behavior |
|---------|------------------|----------|
| Payroll runs, profiles, workers list | `@RequireModule("payroll")` only | No `@RequireModule("hr")` on payroll controllers |
| `/payroll/workers/[workerId]` | Payroll | Worker spine via Workforce (`workers`), not HRMS overlay |
| FE labels (`usePayrollWorkforceLabel`) | Cosmetic only | "Payee" when HR off, "Employee" when HR on — no entitlement coupling |
| Salary profile sheet HR fields | Gated `useModuleEnabled("hr")` | HR-only fields hidden when HRMS disabled |

Payroll payee resolution uses `worker_id` with `user_id` read fallback (`0392`/`0393`) — independent of HRMS module enablement.

## Product Management physical rename (deferred)

| Item | Status |
|------|--------|
| FE routes | `/build/workspaces/[pmWorkspaceId]/…` canonical; `/product-management/**` → `/build/**` redirect (`proxy.ts`) |
| Backend API prefix | `/product-management/workspaces` (unchanged physical path) |
| Table rename `project_workspace_*` → `pm_*` | **Deferred Wave 7+** — exit criterion documented; no big-bang rename in this program slice |

## Empty-state / nav independence

- **CRM-only org:** no Inventory CTAs on Party, CRM products, or CRM settings surfaces touched in this slice.
- **Inventory-only org:** vendor surfaces do not link to CRM modules; no offer-fulfillment API access (403 module disabled).
- **Party-only path:** `/parties` empty state prompts "Add Party" only — no CRM/Inventory upsell.

## Tests proving boundaries

| Area | Spec file |
|------|-----------|
| Offer fulfillment BOLA + tenant asserts | `offer-fulfillment.service.spec.ts` |
| Party BOLA cross-tenant | `party.service.spec.ts` |
| Dual module gate (`crm` + `inventory`) | `module.guard.spec.ts` |
| Portal grant workspace proof | prior slice scope specs |
