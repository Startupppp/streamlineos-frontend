---
wave: 2 + 6
type: execution plan
status: DRAFT
date: 2026-07-26
author: architecture review
depends-on: wave-0-control-plane.md, wave-2-module-authority-unify.md, wave-6-business-party-design.md, wave-0-composite-fk-matrix-inventory-finance.md
---

# Wave 2 + Wave 6 — Sequenced Execution Plan

> **READ-ONLY gate:** do not touch any source file until the Wave 0 ADR gate
> (`wave-0-control-plane.md`) is fully approved and the reconciled baseline migration
> has reached an identical head from every supported deployed state without `db:push`.
>
> Each step in this plan includes: migration sketch, backend change, gate, rollback.
> Every step follows the program-wide pattern:
> **expand → tolerant backend → backfill → shadow-compare → switch reads → stop legacy writes → observe → contract.**

---

## 0. Context — verified repository state (2026-07-26)

### Wave 2 — Module Authority

The module enablement system has two live read paths with incompatible defaults:

| Path | Store | Guard | Default (unconfigured) |
|---|---|---|---|
| A — `@RequireModule` | `organizations.enabled_modules` text[] | `ModuleGuard` (`module.guard.ts:21`) | **DENY** (allowlist) |
| B — `@RequirePermission` | `org_modules` table | `PermissionGuard` → `authorize.ts:20` | **ALLOW** (absent key = allowed) |

Live production measurement (neondb, 2026-07-26, 12 orgs): `org_modules` has **2 rows across 12 orgs**. The array is the populated allowlist. The gap (`array=ON, org_modules=ALLOW`) covers all 12 orgs for payroll, 11 for surveys/sign, 7 for support/inventory/accounting, 5 for crm, 3 for projects/hr. This is a live A05 finding: `@RequirePermission`-only endpoints are reachable despite the array allowlist for those modules.

**Key source files:**
- `backend/src/common/auth/jwt-auth.guard.ts` — `fetchOrgContext` selects `organizations.enabledModules` into `req.user.enabledModules`
- `backend/src/common/rbac/module.guard.ts` — array allowlist check
- `backend/src/modules/access/authorize.ts:20` — `isModuleEnabled` (org_modules) check
- `backend/src/modules/access/entitlements.service.ts` — `getModuleMap`, `isModuleEnabled`, `setModuleEnabled`, `MODULE_KEY_TO_ORG_MODULE`, `CORE_MODULE_KEYS`
- `backend/src/db/schema/auth.ts` — `organizations.enabledModules` column (text array, line 25)
- `backend/src/db/schema/access.ts` — `orgModules` table (lines 65–79)

**Vocabulary mismatch (must not be silently ignored):**

| Module key (org_modules) | Array name (enabled_modules) |
|---|---|
| `hr` | `HR` |
| `crm` | `CRM` |
| `projects` | `PROJECTS` |
| `accounting` | `FINANCE` |
| `support` | `HELPDESK` |
| `surveys` | `SURVEYS` |
| `payroll` | `PAYROLL` |
| `sign` | `SIGN` |
| `kb` | *(core — no array entry, always-on)* |
| `inventory` | *(no array name in mapping — treated as core-equivalent for Path A)* |

`ModuleGuard` compares case-insensitively, so `@RequireModule("accounting")` would need array entry `ACCOUNTING` but the array stores `FINANCE`. Audit all `@RequireModule(...)` call-sites against the mapping before converging reads.

**`org_modules` current schema gaps (access.ts:65–79):**
- `enabledBy` is `varchar(36)` with no FK constraint (no reference to `users.id`)
- No `disabledAt`, `disabledBy`, `archivedAt` timestamps (lifecycle columns required by the architecture)
- No actor membership ID reference (target: membership, not raw user ID)

---

### Wave 6 — Business Party

`business_parties` table exists (`backend/src/db/schema/party/business-parties.ts`) with:
- `party_id` text UUID PK with `UNIQUE(organization_id, party_id)` candidate key
- `organization_id` text FK → `organizations.id`
- `partyType` enum: CUSTOMER / VENDOR / PARTNER / OTHER

`party_contacts` and `party_addresses` also exist with composite FKs into `business_parties`.

**Zero consumers have migrated.** The foundation is built; migration adapters have not started.

**Five modules FK into `clients.id` (integer serial):**
1. CRM — `client_opportunities`, `client_onboarding_items`, `csat_surveys`, `deals`
2. Finance AR — `invoices`, `credit_notes`, `fin_recurring_invoice_templates`, `fin_collection_activities`
3. Finance AP — `purchase_bills`, `vendor_credits`, `fin_recurring_bill_templates`, `fin_payment_run_items`, `vendor_credits.vendor_id`
4. Finance Assets — `acc_fixed_assets.vendor_id → clients`
5. Inventory — `inv_vendors.client_id → clients.id` (nullable bridge), `inv_sales_orders.client_id`
6. Support — `support_vip_clients.client_id`, `support_tickets.client_id` (boundary violation — tickets defined in `crm/billing.ts`)

The critical type mismatch: `clients.id` is **integer** (serial), `business_parties.party_id` is **text UUID**. Every migration that moves a counterparty FK from `clients` to `business_parties` is a **column type change** and requires shadow columns and dual-write phases — it cannot be done with a direct `ALTER COLUMN TYPE`.

---

## Wave 2 — Module Authority Execution

### W2.1 — Expand: add lifecycle columns to `org_modules`

**What:** Add missing columns to `org_modules` before touching any read path.

**Migration sketch (Drizzle, additive — nullable/defaulted):**

```sql
-- pnpm -C backend db:generate (describe, then migrate)
ALTER TABLE org_modules
  ADD COLUMN IF NOT EXISTS disabled_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS disabled_by  VARCHAR(36),   -- user_id (raw; membership ref lands in Wave 5)
  ADD COLUMN IF NOT EXISTS archived_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS archived_by  VARCHAR(36);

-- Add FK on enabled_by (currently unconstrained varchar)
-- Do this as NOT VALID first, then VALIDATE in a follow-up migration
ALTER TABLE org_modules
  ADD CONSTRAINT fk_org_modules_enabled_by
    FOREIGN KEY (enabled_by) REFERENCES users(id) ON DELETE SET NULL
    NOT VALID;
```

**Backend change:** Update `orgModules` Drizzle schema in `access.ts` to include the new columns. No service change yet.

**Gate (before W2.2):**
- Migration applies from reconciled baseline without error
- Previous app version still boots and passes smoke tests
- `VALIDATE CONSTRAINT fk_org_modules_enabled_by` runs clean (zero invalid `enabled_by` values)

**Rollback:** Drop the added columns (additive, no data lost). Drop the constraint.

---

### W2.2 — Backfill: materialize `org_modules` rows from `enabled_modules`

**What:** For every org and every non-core module, insert an explicit `org_modules` row that reflects the current `enabled_modules` array state. This closes the A05 gap: after this step `isModuleEnabled` can no longer silently allow a module the array forbids.

**Migration sketch (idempotent SQL script — run via a Drizzle migration):**

```sql
-- Pseudocode; implement as a Drizzle raw sql migration
-- For each org × non-core module, derive enabled from the array.
-- ON CONFLICT DO NOTHING so explicit admin toggles are never clobbered.

INSERT INTO org_modules (id, org_id, module_key, enabled, enabled_at, enabled_by)
SELECT
  gen_random_uuid(),
  o.id,
  m.module_key,
  (m.array_name = ANY(COALESCE(o.enabled_modules, '{}'))) AS enabled,
  NOW(),
  'system-backfill'
FROM organizations o
CROSS JOIN (VALUES
  ('hr',         'HR'),
  ('crm',        'CRM'),
  ('projects',   'PROJECTS'),
  ('accounting', 'FINANCE'),
  ('support',    'HELPDESK'),
  ('surveys',    'SURVEYS'),
  ('payroll',    'PAYROLL'),
  ('sign',       'SIGN'),
  ('inventory',  'INVENTORY')
) AS m(module_key, array_name)
ON CONFLICT (org_id, module_key) DO NOTHING;
```

**Note on `inventory`:** `inventory` has no array-name mapping in the current `MODULE_KEY_TO_ORG_MODULE` (treated as always-on under Path A). The backfill should insert `enabled = true` for inventory for all orgs unconditionally (since the array never denied it). Verify this assumption against the live array before running.

**Backend change:** None yet (reads unchanged).

**Gate (before W2.3):**
- Backfill is idempotent: rerun changes zero rows
- Parity check: for every org × module, `ModuleGuard` array verdict == `isModuleEnabled` org_modules verdict. **Zero mismatches** required
- `org_modules` row count = `(count of orgs) × (count of non-core modules)` minus any always-on-core-module carve-outs
- No explicit `enabled=false` org_modules row was overwritten

**Rollback:** Delete rows where `enabled_by = 'system-backfill'`. This reverts to the pre-backfill sparse state.

---

### W2.3 — Shadow-compare: dual-read parity in production

**What:** Before switching any read path, run both computations in parallel and log mismatches to a telemetry table (or structured log) for ≥7 consecutive days including at least one peak traffic period.

**Backend change:**

In `jwt-auth.guard.ts` (`fetchOrgContext`), add a shadow-read alongside the existing array select:

```typescript
// SHADOW ONLY — do not gate on this result yet
const orgModulesRows = await entitlementsService.getModuleMap(orgId);
const shadowEnabledModules = buildEnabledModulesArray(orgModulesRows); // convert to UPPERCASE names
if (!arraysMatch(enabledModulesFromArray, shadowEnabledModules)) {
  logger.warn('module_authority_mismatch', { orgId, fromArray: enabledModulesFromArray, fromTable: shadowEnabledModules });
  metrics.increment('module_authority.mismatch');
}
```

The existing `req.user.enabledModules` still comes from the array (no behavior change). The shadow result is logged only.

**Gate (before W2.4):**
- Zero unexplained mismatches for ≥7 consecutive days in production
- Mismatch telemetry dashboard confirmed green
- At least one org has had a module enable/disable toggle during the window and parity held

**Rollback:** Remove shadow-read code. No data change.

---

### W2.4 — Switch reads: `ModuleGuard` and `fetchOrgContext` read `org_modules`

**What:** Point both enforcement paths to `org_modules` as the single authority.

**Backend changes (two options — choose one):**

**Option A (simpler — no async guard refactor):** In `fetchOrgContext` (`jwt-auth.guard.ts`), replace the array select with an `org_modules`-derived call. Emit the same UPPERCASE names so `ModuleGuard`'s existing string comparison keeps working:

```typescript
const moduleMap = await entitlementsService.getModuleMap(orgId);
const enabledModules = Object.entries(MODULE_KEY_TO_ORG_MODULE)
  .filter(([key]) => moduleMap[key] !== false)   // absent = allowed (compat during dual-write overlap)
  .map(([, name]) => name);
req.user.enabledModules = enabledModules;
```

**Option B (cleaner long-term):** Refactor `ModuleGuard` to call `entitlementsService.isModuleEnabled(orgId, moduleKey)` directly (inject `EntitlementsService`), removing the array comparison entirely. `fetchOrgContext` no longer needs to embed `enabledModules` in the request context for module-gating purposes.

Keep `setModuleEnabled` dual-writing to the array during this overlap window to allow rollback.

**Gate (before W2.5):**
- Unit tests: `ModuleGuard` allows/denies correctly from `org_modules`-derived input; `isModuleEnabled` opt-out default; vocabulary mapping
- e2e (booted app): org with module X disabled in `org_modules` gets 403/ModuleDisabled on both `@RequireModule("X")` and `@RequirePermission("X:*")` routes; enabling X flips both
- Zero new mismatch telemetry in production for ≥48h after deploy

**Rollback:** Revert `fetchOrgContext` to array select. `setModuleEnabled` still writes both stores, so the array is fresh.

---

### W2.5 — Encode module dependency graph

**What:** Encode the architecture's module dependency rules in the backend so they are enforced at `setModuleEnabled` time, not left as a wiki rule.

**Architecture decisions (from `schema-change-plan.md` §2):**
- **Workforce is always-on** (foundational — no explicit `org_modules` row; treated as core)
- **HRMS and Payroll are independent** (Payroll must not require the HRMS module entitlement)
- HRMS requires Workforce (always satisfied)
- Payroll requires Workforce (always satisfied)
- No other mandatory inter-module dependencies in the current catalog

**Backend change:** Add a `MODULE_DEPENDENCY_GRAPH` constant in `entitlements.service.ts`:

```typescript
// Key: module being disabled; Value: modules that would break if this is disabled
const MODULE_DEPENDENTS: Readonly<Record<string, string[]>> = {
  // Example: if 'projects' is disabled, warn about timesheets which rides on it
  // No hard blocks currently except Workforce (always-on)
};

// Key: module being enabled; Value: modules that must be enabled first
const MODULE_PREREQUISITES: Readonly<Record<string, string[]>> = {
  // Currently empty — HRMS and Payroll are independent of each other
};
```

In `setModuleEnabled`, before proceeding with the insert/update:
1. If disabling a module, check `MODULE_DEPENDENTS` and return a `ConflictException` listing dependents that are still enabled
2. If enabling a module, check `MODULE_PREREQUISITES` and return a `BadRequestException` listing prerequisites that must be enabled first

**Also:** Add `disabledAt`/`disabledBy` timestamp writes to `setModuleEnabled` when `enabled=false`.

**Gate:**
- Unit tests: disabling a module with active dependents returns 409 with dependent list
- Unit tests: enabling a module without prerequisites returns 400 with prerequisite list
- Payroll can be enabled/disabled independently of HRMS (no cross-dependency enforced)

**Rollback:** Remove dependency graph constants and validation — behavior reverts to unchecked toggles.

---

### W2.6 — Stop legacy writes to `enabled_modules`

**What:** Stop dual-writing to `organizations.enabled_modules`. The array becomes stale and then is dropped.

**Pre-condition:** Both `ModuleGuard` and `fetchOrgContext` have been reading `org_modules` for ≥2 releases (approximately 4+ weeks) with zero mismatch telemetry.

**Backend change:** In `setModuleEnabled`, remove the `UPDATE organizations SET enabled_modules = ...` block. The array is no longer written.

**Gate (before W2.7):**
- Zero modules-related regressions in production for ≥2 releases after stopping the write
- Confirm array values are static (not changing) to validate no other writer exists
- Audit all callers of `organizationMembers` / `organizations` selects for any direct `enabledModules` read outside `fetchOrgContext`

**Rollback:** Re-add the dual-write block.

---

### W2.7 — Contract: drop `enabled_modules` column

**What:** Remove the now-unused `enabled_modules` array column from `organizations`.

**Pre-conditions (program-wide gate from `schema-change-plan.md` §9):**
- ≥30 days + ≥2 releases since W2.6 with zero reads or writes to `enabled_modules`
- Query telemetry / Drizzle relation audit confirms zero selects of the column
- Owner approval
- Backup restore verified

**Migration sketch:**

```sql
ALTER TABLE organizations DROP COLUMN IF EXISTS enabled_modules;
```

**Backend change:** Remove `enabledModules` field from the `organizations` Drizzle schema. Remove `MODULE_KEY_TO_ORG_MODULE` mapping's array-name half (keep only for backward-compat until fully retired). Remove `enabledModules` from `resolveActiveMembership` return type in `auth-tokens.service.ts`.

**Gate:**
- Build + lint + types pass
- e2e: module enable/disable flows work without the column

**Rollback:** `ALTER TABLE organizations ADD COLUMN enabled_modules text[] DEFAULT NULL`. Restore dual-write. (Forward repair, not destructive rollback.)

---

## Wave 6 — Business Party Execution

> **Prerequisite:** `business_parties`, `party_contacts`, and `party_addresses` tables exist
> with correct composite candidate keys. Verified: `UNIQUE(organization_id, party_id)` exists
> on `business_parties`. The `party` module exists with controller, service, and DTOs.
> Zero consumers have migrated. This plan migrates them.

### W6.1 — Expand: `crm_accounts` overlay table

**What:** Introduce `crm_accounts` as a thin CRM-specific overlay linked to `business_parties`. This is the target for CRM consumer migration. `crm_organizations` remains a compatibility source.

**Migration sketch (new table — additive):**

```sql
CREATE TABLE crm_accounts (
  id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id       TEXT         NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  party_id     TEXT         NOT NULL,
  -- CRM-specific overlay fields (pipeline, health, account manager):
  account_manager_id  TEXT REFERENCES users(id) ON DELETE SET NULL,
  health_score        INTEGER DEFAULT 50 NOT NULL,
  health_status       crm_health_enum DEFAULT 'healthy' NOT NULL,
  churn_risk_score    INTEGER,
  investment_value    DECIMAL(15,2),
  status              TEXT DEFAULT 'active' NOT NULL,
  converted_at        TIMESTAMPTZ,
  created_at          TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at          TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  CONSTRAINT uq_crm_accounts_org_id UNIQUE (org_id, id),
  CONSTRAINT fk_crm_accounts_party FOREIGN KEY (org_id, party_id)
    REFERENCES business_parties(organization_id, party_id) ON DELETE CASCADE
);
CREATE INDEX idx_crm_accounts_org_status ON crm_accounts(org_id, status);
CREATE INDEX idx_crm_accounts_party ON crm_accounts(org_id, party_id);
```

**Backend change:** Add `crm_accounts` Drizzle schema in `backend/src/db/schema/crm/accounts.ts`. Add service stubs in the `crm` module — no reads switched yet.

**Gate:**
- Migration applies cleanly
- `crm_accounts` table exists with zero rows (expected — no backfill yet)
- Previous app version still boots

**Rollback:** `DROP TABLE crm_accounts;`

---

### W6.2 — Backfill: create `business_parties` + `crm_accounts` rows from `clients`

**What:** For every existing `clients` row, create a corresponding `business_parties` row and a `crm_accounts` overlay row. This is a **one-way data migration** — the original `clients` rows are not deleted.

**Migration sketch (idempotent — run as a Drizzle migration with raw SQL):**

```sql
-- Step 1: Insert business_parties from clients (idempotent via conflict key)
-- Each client gets party_type = 'CUSTOMER'; is_vendor=true clients get party_type = 'VENDOR'
INSERT INTO business_parties (party_id, organization_id, party_type, name, email, phone,
                               tax_number, status, created_at, updated_at)
SELECT
  gen_random_uuid(),
  c.org_id,
  CASE WHEN c.is_vendor THEN 'VENDOR' ELSE 'CUSTOMER' END,
  c.name,
  c.email,
  c.phone,
  c.gstin,
  c.status,
  c.created_at,
  c.updated_at
FROM clients c
WHERE NOT EXISTS (
  -- idempotency: skip if a party was already linked in a prior run (see shadow column below)
  SELECT 1 FROM client_party_map m WHERE m.client_id = c.id
);

-- Step 2: Record the mapping in a migration-support table (drop in Wave 9 contract)
CREATE TABLE IF NOT EXISTS client_party_map (
  client_id  INTEGER PRIMARY KEY REFERENCES clients(id) ON DELETE CASCADE,
  party_id   TEXT    NOT NULL,
  org_id     TEXT    NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO client_party_map (client_id, party_id, org_id)
SELECT c.id, bp.party_id, c.org_id
FROM clients c
JOIN business_parties bp ON bp.organization_id = c.org_id AND bp.name = c.name
  -- join is approximate; use a dedicated migration column instead (see note below)
WHERE NOT EXISTS (SELECT 1 FROM client_party_map m WHERE m.client_id = c.id);
```

> **Note on join accuracy:** The name-join above is a placeholder. The production-safe approach
> is to add a nullable `party_id text` shadow column to `clients` first (W6.2-pre), populate it
> during the INSERT, and use that as the idempotency anchor. This avoids the name-collision risk
> for clients with identical names within an org.

**Recommended W6.2-pre migration (add shadow column first):**

```sql
ALTER TABLE clients ADD COLUMN IF NOT EXISTS party_id text;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS party_id_backfilled_at timestamptz;
CREATE INDEX idx_clients_party_id ON clients(org_id, party_id) WHERE party_id IS NOT NULL;
```

Then the backfill inserts `business_parties` rows and writes back `clients.party_id` and `clients.party_id_backfilled_at` in the same transaction per org (batch by org to stay within transaction size limits).

**Step 3: Insert `crm_accounts` overlay from `clients` where `crm_accounts` row doesn't exist:**

```sql
INSERT INTO crm_accounts (id, org_id, party_id, account_manager_id, health_score,
                           health_status, churn_risk_score, investment_value, status,
                           converted_at, created_at, updated_at)
SELECT
  gen_random_uuid(),
  c.org_id,
  c.party_id,   -- from shadow column
  c.account_manager_id,
  c.health_score,
  c.health_status,
  c.churn_risk_score,
  c.investment_value,
  c.status,
  c.converted_at,
  c.created_at,
  c.updated_at
FROM clients c
WHERE c.party_id IS NOT NULL
ON CONFLICT DO NOTHING;
```

**Gate (before W6.3):**
- 100% of `clients` rows have a non-null `party_id` (shadow column fully populated)
- 100% of `clients.party_id` values exist in `business_parties`
- Count of `crm_accounts` rows == count of `clients` rows (excluding soft-deleted)
- Checksum: `SELECT COUNT(*) FROM clients` == `SELECT COUNT(*) FROM crm_accounts`
- Idempotent rerun changes zero rows
- Zero unquarantined orphans

**Rollback:** Truncate `crm_accounts`. Null out `clients.party_id`. Delete rows from `client_party_map`. The backfill is additive and non-destructive.

---

### W6.3 — Shadow-compare: dual-read parity for CRM counterparty reads

**What:** Read counterparty data from both `clients` (legacy) and `business_parties + crm_accounts` (target) and compare results in production for ≥7 consecutive days.

**Backend change:** In the CRM service methods that load counterparty identity (name, email, phone, address), add a shadow read from `business_parties` alongside the existing `clients` read. Log discrepancies:

```typescript
// Example in ClientsService.findById():
const [legacyClient, partyRow] = await Promise.all([
  this.db.query.clients.findFirst({ where: ... }),
  this.db.query.businessParties.findFirst({
    where: eq(businessParties.partyId, legacyClient.partyId)  // shadow column
  }),
]);
if (partyRow && legacyClient.name !== partyRow.name) {
  logger.warn('party_shadow_mismatch', { clientId, field: 'name', legacy: legacyClient.name, party: partyRow.name });
}
```

The existing response still comes from `clients`. This is read-only shadow comparison.

**Gate (before W6.4):**
- Zero unexplained name/email/phone mismatches for ≥7 consecutive days in production
- Any mismatches found are repaired in the backfill (rerun W6.2 backfill for affected orgs)

**Rollback:** Remove shadow-read code. No data change.

---

### W6.4 — Switch CRM reads to `business_parties + crm_accounts`

**What:** CRM service methods now read counterparty identity from `business_parties` and CRM overlay from `crm_accounts`. `clients` is still written (dual-write) and still has its rows but is no longer the primary read source for counterparty identity.

**Backend change:**
- Update CRM query methods to JOIN `business_parties` and `crm_accounts` instead of `clients` for counterparty fields
- Keep all writes going to `clients` as well (`setModuleEnabled` pattern — dual-write for this window)
- Update CRM DTOs to use `partyId` as the primary identifier alongside compatibility `clientId`

**Gate (before W6.5):**
- CRM e2e tests pass with the new read source
- No visible regressions in counterparty name/address display for existing data
- ≥2 releases clean

**Rollback:** Revert service joins to `clients`. Dual-write is still active so `clients` is fresh.

---

### W6.5 — Expand: `inv_vendors` shadow column `party_id`

**What:** Add `party_id text` shadow column to `inv_vendors`. This is the critical TYPE-CHANGE migration — replacing `client_id integer` with `party_id text UUID`.

**Why a shadow column is mandatory:** `inv_vendors.client_id` is `integer` (references `clients.id`). `business_parties.party_id` is `text UUID`. A direct `ALTER COLUMN TYPE` on a live table is a **blocking full-table rewrite** on Postgres. Instead: add a nullable `party_id` shadow column, dual-write both during the transition, backfill, validate, then cut over reads, stop writing to `client_id`, and finally drop `client_id`.

**Migration sketch:**

```sql
ALTER TABLE inv_vendors
  ADD COLUMN IF NOT EXISTS party_id text,
  ADD COLUMN IF NOT EXISTS party_id_backfilled_at timestamptz;

CREATE INDEX idx_inv_vendors_party_id ON inv_vendors(org_id, party_id)
  WHERE party_id IS NOT NULL;
```

**Backend change:** Update `invVendors` Drizzle schema to include `partyId` column. No service change yet.

**Gate:**
- Migration applies without locking issues (additive nullable column)
- `inv_vendors.party_id` is NULL for all rows (expected pre-backfill)

**Rollback:** `ALTER TABLE inv_vendors DROP COLUMN party_id, DROP COLUMN party_id_backfilled_at;`

---

### W6.6 — Backfill: populate `inv_vendors.party_id` from `client_party_map`

**What:** For every `inv_vendors` row that has a `client_id`, look up the corresponding `party_id` from `client_party_map` and write it into `inv_vendors.party_id`. For rows with no `client_id` (vendors that were never linked to a CRM client), create a new `business_parties` row of type `VENDOR` using the vendor's name/email/phone, then write that `party_id`.

**Migration sketch (idempotent SQL, batched by org):**

```sql
-- Case 1: vendor has a client_id — use the existing party mapping
UPDATE inv_vendors v
SET
  party_id = m.party_id,
  party_id_backfilled_at = NOW()
FROM client_party_map m
WHERE m.client_id = v.client_id
  AND v.party_id IS NULL;

-- Case 2: vendor has no client_id — create a new business_party
-- (run as application-level logic in a migration script, not raw SQL,
--  to correctly generate UUIDs and write client_party_map entries)
-- Pseudocode:
FOR v IN (SELECT * FROM inv_vendors WHERE client_id IS NULL AND party_id IS NULL):
  INSERT INTO business_parties (party_id, organization_id, party_type, name, email, phone, status)
  VALUES (gen_random_uuid(), v.org_id, 'VENDOR', v.name, v.email, v.phone, 'active')
  RETURNING party_id INTO new_party_id;

  UPDATE inv_vendors SET party_id = new_party_id, party_id_backfilled_at = NOW()
  WHERE id = v.id;
```

**Also:** Enable dual-write in `InvVendorsService` — on create/update, write both `client_id` (legacy) and `party_id` (new). Gate the dual-write on `party_id` being non-null.

**Gate (before W6.7):**
- 100% of `inv_vendors` rows have a non-null `party_id`
- Every `party_id` exists in `business_parties` under the correct `organization_id`
- Count checksum: `SELECT COUNT(*) FROM inv_vendors` == `SELECT COUNT(party_id) FROM inv_vendors WHERE party_id IS NOT NULL`
- Idempotent rerun changes zero rows
- Zero cross-org orphans: `SELECT v.id FROM inv_vendors v LEFT JOIN business_parties bp ON bp.party_id = v.party_id AND bp.organization_id = v.org_id WHERE v.party_id IS NOT NULL AND bp.party_id IS NULL` returns 0 rows

**Rollback:** NULL out `inv_vendors.party_id` where `party_id_backfilled_at IS NOT NULL`. Remove dual-write code.

---

### W6.7 — Shadow-compare: dual-read parity for `inv_vendors`

**What:** In `InvVendorsService`, read vendor identity from both `inv_vendors.client_id → clients` (legacy) and `inv_vendors.party_id → business_parties` (target) and log mismatches for ≥7 days.

**Backend change:** Same shadow-read pattern as W6.3. Compare vendor `name`, `email`, `phone` from both sources.

**Gate (before W6.8):**
- Zero unexplained name/email/phone mismatches for ≥7 consecutive days
- Any mismatches repaired

**Rollback:** Remove shadow-read code.

---

### W6.8 — Switch `inv_vendors` reads to `business_parties`

**What:** `InvVendorsService` now reads vendor counterparty identity from `business_parties` via `party_id`. The `client_id` column is still written (dual-write) but no longer the primary read source.

**Backend change:**
- Update vendor list/detail queries to JOIN `business_parties` on `(org_id, party_id)`
- Return `partyId` in DTOs alongside compatibility `clientId`
- Add composite FK constraint (deferred — can only be applied after Wave 4 confirms `business_parties` has its `UNIQUE(organization_id, party_id)` candidate key, which it already does):

```sql
ALTER TABLE inv_vendors
  ADD CONSTRAINT fk_inv_vendors_party
    FOREIGN KEY (org_id, party_id)
    REFERENCES business_parties(organization_id, party_id)
    ON DELETE SET NULL
    NOT VALID;
VALIDATE CONSTRAINT fk_inv_vendors_party;
```

**Gate (before W6.9):**
- Inventory e2e tests pass
- Purchase order creation with vendor lookup works against `business_parties`
- ≥2 releases clean

**Rollback:** Revert service joins. `client_id` is still fresh from dual-write.

---

### W6.9 — Migrate Finance AR/AP counterparty FKs (staged per table)

> **Highest-risk section.** Covers 9 Finance tables that FK into `clients.id` (integer).
> The shadow-column + dual-write pattern applies to each table. Tables are migrated
> in order of blast radius (smallest first):
>
> Stage A: `fin_collection_activities`, `fin_payment_run_items` (operational, low volume)
> Stage B: `credit_notes`, `vendor_credits`, `fin_recurring_invoice_templates`, `fin_recurring_bill_templates`
> Stage C: `invoices`, `purchase_bills` (highest volume, highest risk)
>
> Each stage repeats: add shadow col → backfill → shadow-compare → switch reads → stop legacy write → validate FK.
> Do not advance to stage B until stage A has been clean for ≥2 releases.

**Migration sketch per table (Stage A example — `fin_collection_activities`):**

```sql
-- Expand
ALTER TABLE fin_collection_activities
  ADD COLUMN IF NOT EXISTS party_id text,
  ADD COLUMN IF NOT EXISTS party_id_backfilled_at timestamptz;

-- Backfill (from client_party_map)
UPDATE fin_collection_activities fa
SET party_id = m.party_id, party_id_backfilled_at = NOW()
FROM client_party_map m
WHERE m.client_id = fa.client_id AND fa.party_id IS NULL;

-- (Shadow-compare phase) ...
-- (Switch reads phase) ...

-- Add composite FK after parity confirmed
ALTER TABLE fin_collection_activities
  ADD CONSTRAINT fk_fin_collection_activities_party
    FOREIGN KEY (org_id, party_id)
    REFERENCES business_parties(organization_id, party_id)
    ON DELETE SET NULL NOT VALID;
VALIDATE CONSTRAINT fk_fin_collection_activities_party;
```

**Gate for all of W6.9:**
- Each stage A table: 100% backfill, zero parity mismatches, composite FK validated, ≥2 releases clean before stage B
- Each stage B table: same gate sequence
- Stage C (`invoices`, `purchase_bills`): require explicit owner approval gate in addition to technical gates, given these tables are the highest-volume financial records

**Rollback per stage:** NULL out `party_id` columns for affected rows. Remove composite FK. Remove shadow-read code. Dual-write to `client_id` is still active.

---

### W6.10 — Stop legacy writes to `clients.id` FKs

**What:** For each migrated table, stop the dual-write to the integer `client_id` column once both read paths (legacy and party) have been clean for ≥2 releases.

**Order:** Same stage sequence as W6.9 — stop Stage A writes first, observe, then Stage B, then Stage C.

**Backend change per table:** Remove the `client_id` write from service create/update methods. The column remains nullable (no data dropped).

**Gate (before W6.11):**
- Zero `client_id` writes confirmed via query telemetry for ≥2 releases
- Rollback exercised on staging: nulling `party_id` and restoring `client_id` write works cleanly

**Rollback:** Restore dual-write code. `client_id` columns still hold their last values.

---

### W6.11 — Contract: drop `client_id` FK columns + `clients` compatibility table

**What:** Drop the now-unused integer FK columns. This is the destructive-but-planned final step.

**Pre-conditions (program-wide gate):**
- ≥30 days + ≥2 releases since W6.10 with zero reads or writes to `client_id` on any migrated table
- `client_party_map` migration-support table verified as no longer needed
- Backup restore verified
- Owner approval
- `clients` table is either retained as a CRM-internal compatibility view (if CRM still needs it) or dropped if CRM has fully migrated to `crm_accounts`

**Migration sketch:**

```sql
-- Drop shadow columns (one per table per stage, after full stop-write window)
ALTER TABLE inv_vendors DROP COLUMN IF EXISTS client_id, DROP COLUMN IF EXISTS party_id_backfilled_at;
ALTER TABLE fin_collection_activities DROP COLUMN IF EXISTS client_id, DROP COLUMN IF EXISTS party_id_backfilled_at;
-- ... repeat for all migrated tables
DROP TABLE IF EXISTS client_party_map;
```

**Gate:**
- Build + lint + types pass
- No schema file imports `clients.id` for a non-CRM module
- CRM internal reads still go through `crm_accounts + business_parties`

**Rollback:** Not available for dropped columns — this step requires explicit owner approval and verified backup. Forward repair only.

---

## Critical risks and mitigations

### Risk 1 (Wave 2): Silent module-exposure regression on `org_modules` switch

If `org_modules` is switched before backfill is complete, orgs without rows get all modules allowed (allow-by-default). Mitigation: W2.2 backfill + zero-mismatch parity gate MUST complete before W2.4. The parity check is a hard gate, not a recommendation.

### Risk 2 (Wave 6): Type mismatch `integer → text UUID` on `clients.id`

This is the biggest risk in the entire Wave 2+6 program. The FK column type change (`client_id integer` → `party_id text UUID`) cannot be performed as `ALTER COLUMN TYPE` on a live table without a full-table lock. Shadow column + dual-write is mandatory. The `inv_vendors` and Finance tables individually hold tens of thousands to millions of rows. Each stage gate (W6.6, W6.9) requires 100% backfill verification before any read path is switched. A missed row means a vendor lookup returns null, breaking purchase order creation.

### Risk 3 (Wave 6): Stale `crm_accounts` after `clients` updates

During the dual-write overlap window, any update to `clients` (name change, status change, account manager change) must also be reflected in `crm_accounts` and `business_parties`. The dual-write in `ClientsService` must cover all update paths — not just create. Audit service update/patch methods explicitly.

### Risk 4 (Wave 6, Stage C): Finance AR/AP high-volume tables

`invoices` and `purchase_bills` are the largest tables in the Finance domain and are written transactionally during invoice creation/payment. The shadow column backfill on these tables must be batched (e.g., 1000 rows per org per transaction, with progress tracking) to avoid long-running transactions that block concurrent invoice writes.

### Risk 5 (Wave 2): `inventory` module vocabulary gap

`inventory` has no entry in `MODULE_KEY_TO_ORG_MODULE` (treated as always-on/core). Verify against live data before W2.2: if any org has `inventory` disabled in the array, it must be captured in `org_modules` with `enabled=false`. If no org has ever disabled it, insert `enabled=true` for all orgs.

---

## Program-wide release gates (from `schema-change-plan.md` §9)

Every step gate is enforced by all of these:

| Gate | Requirement |
|---|---|
| Expand | Migration applies from reconciled baseline; prior app version still passes smoke |
| Backfill | 100% eligible rows; zero unquarantined orphans; idempotent rerun changes zero rows; deterministic checksum |
| Shadow read | Canonical == legacy for ≥7 consecutive days including peak; zero unexplained mismatches |
| Cutover | Current + previous versions pass; p95 latency/db-load regression ≤10% |
| Stop legacy writes | Zero legacy-only writers for ≥2 releases; rollback + forward-repair exercised |
| Contract | ≥30 days + ≥2 releases; zero legacy calls/writes; verified backup restore; owner approval |

"Code merged" is never an exit criterion.

---

## Step summary

| Step | Wave | Action | Biggest danger |
|---|---|---|---|
| W2.1 | 2 | Add lifecycle columns to `org_modules` | None — additive |
| W2.2 | 2 | Backfill `org_modules` from `enabled_modules` array | A05 gap closed; must not clobber explicit rows |
| W2.3 | 2 | Shadow-compare dual reads | None — read-only |
| W2.4 | 2 | Switch `ModuleGuard`/`fetchOrgContext` to `org_modules` | Module-exposure regression if backfill was incomplete |
| W2.5 | 2 | Encode module dependency graph | Payroll/HRMS independence must be preserved |
| W2.6 | 2 | Stop writing `enabled_modules` | Any undiscovered reader breaks |
| W2.7 | 2 | Drop `enabled_modules` column | Irreversible — requires full gate |
| W6.1 | 6 | Add `crm_accounts` overlay table | None — additive |
| W6.2 | 6 | Backfill `clients → business_parties + crm_accounts` | Name-join collision risk; shadow column required |
| W6.3 | 6 | Shadow-compare CRM reads | None — read-only |
| W6.4 | 6 | Switch CRM reads to `business_parties` | CRM counterparty display breaks if parity was incomplete |
| W6.5 | 6 | Add `party_id` shadow column to `inv_vendors` | None — additive |
| W6.6 | 6 | Backfill `inv_vendors.party_id` | UUID type mismatch must use shadow col; no ALTER TYPE |
| W6.7 | 6 | Shadow-compare vendor reads | None — read-only |
| W6.8 | 6 | Switch `inv_vendors` reads to `business_parties` | Vendor not found on lookup if backfill missed rows |
| W6.9 | 6 | Migrate Finance AR/AP counterparty FKs (staged A→B→C) | **Highest risk** — high-volume tables, integer→text type change |
| W6.10 | 6 | Stop legacy `client_id` writes | Hidden writer causes silent data drift |
| W6.11 | 6 | Drop `client_id` FK columns + retire `clients` compat | Irreversible; requires full gate + owner approval |
