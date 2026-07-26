---
wave: 6
status: DESIGN — not yet implemented
author: architecture review 2026-07-26
supersedes: docs/schema-change-plan.md §8
---

# Wave 6 — Business Party master: design

> This document covers T6.1–T6.4 from the delivery program in `docs/schema-change-plan.md`.
> No source file is modified here. The design is grounded in the actual repo schema as of
> 2026-07-26. Implementation requires an approved schema review before the first migration.

---

## 1. Current state — verified facts

### 1.1 `clients` table (`backend/src/db/schema/crm/contacts.ts`)

Serial integer PK `id`, tenant column `org_id` (text, FK organizations). Key columns:

| Column | Type | Notes |
|---|---|---|
| `id` | serial PK | bare name — to migrate per Wave 7 ID matrix |
| `org_id` | text FK | tenant |
| `lead_id` | integer FK → leads | CRM pipeline origin |
| `name` | text | display name |
| `email`, `phone`, `company`, `designation` | text | contact fields |
| `city`, `state`, `gstin` | text | address / GST |
| `is_vendor` | boolean default false | overloads customer + vendor in one row |
| `investment_value` | decimal | CRM-specific field |
| `status` | text default 'active' | lifecycle |
| `account_manager_id` | text FK → users | CRM ownership |
| `health_score`, `health_status`, `churn_risk_score`, `churn_risk_reasoning`, `last_health_check` | mixed | CRM health — not neutral |
| `converted_at` | timestamp | CRM conversion timestamp |

The `is_vendor` boolean means a single row is sometimes a customer and sometimes a
supplier — a **dual-role anti-pattern** that prevents clean AR-vs-AP querying and forces
every consumer to filter by this flag.

### 1.2 `crm_organizations` table (`backend/src/db/schema/crm/contacts.ts`)

Serial integer PK `id`, `org_id` FK. Company-level CRM entity: `name`, `domain`,
`industry`, `size`, `website`, `linkedin_url`, `health_score`, `parent_id`
(self-ref for hierarchies), `merged_into_id`. Soft-delete via `deleted_at`. No FK
into `clients` — these are two parallel CRM entity types with no bridge row.

### 1.3 `inv_vendors` table (`backend/src/db/schema/inventory/purchase-orders.ts`)

Serial integer PK `id`, `org_id` FK, **`client_id` nullable FK → `clients.id`** (the
current cross-module coupling). Inventory-ops columns: `code` (unique per org),
`lead_time_days`, `payment_terms_days`, `currency`, `is_active`. The `client_id` link
is a convenience join when a vendor also exists as a CRM client — it is NOT enforced
(nullable, on-delete set null). Many vendors will have no `client_id`.

### 1.4 `support_tickets` table (`backend/src/db/schema/crm/billing.ts`)

**Boundary violation confirmed:** `support_tickets` and `support_ticket_messages` are
defined inside `crm/billing.ts`, importing `clients` for `client_id`. Support is its
own module (`backend/src/db/schema/support/agent-routing.ts` already exists in the
`support/` sub-folder). The ticket tables belong in `support/`.

### 1.5 Confirmed FK consumers of `clients.id`

Every schema file that imports from `crm/contacts` and FKs into `clients.id`:

| File | Table | Column | Role |
|---|---|---|---|
| `crm/contacts.ts` | `client_opportunities` | `client_id` | CRM upsell pipeline |
| `crm/contacts.ts` | `client_onboarding_items` | `client_id` | CRM onboarding |
| `crm/contacts.ts` | `csat_surveys` | `client_id` | CRM satisfaction |
| `crm/deals.ts` | `deals` | `client_id` | CRM deal pipeline |
| `crm/billing.ts` | `invoices` | `client_id` | Finance AR (customer invoice) |
| `crm/billing.ts` | `purchase_bills` | `vendor_id` → clients | Finance AP (vendor bill) |
| `crm/billing.ts` | `support_tickets` | `client_id` | Support — **boundary violation** |
| `finance-ar-ap.ts` | `credit_notes` | `client_id` | Finance AR |
| `finance-ar-ap.ts` | `vendor_credits` | `vendor_id` → clients | Finance AP |
| `finance-ar-ap.ts` | `fin_recurring_invoice_templates` | `client_id` | Finance AR |
| `finance-ar-ap.ts` | `fin_recurring_bill_templates` | `vendor_id` → clients | Finance AP |
| `finance-ar-ap.ts` | `fin_collection_activities` | `client_id` | Finance AR collections |
| `finance-ar-ap.ts` | `fin_payment_run_items` | `vendor_id` → clients | Finance AP runs |
| `finance-assets.ts` | `acc_fixed_assets` | `vendor_id` → clients | Accounting — asset purchase vendor |
| `inventory/purchase-orders.ts` | `inv_vendors` | `client_id` (optional bridge) | Inventory vendor ops |
| `inventory/sales-orders.ts` | `inv_sales_orders` | `client_id` | Inventory customer fulfillment |
| `support/agent-routing.ts` | `support_vip_clients` | `client_id` | Support VIP routing |

**Summary: 5 modules FK into `clients.id` — CRM, Finance (AR + AP + Assets), Inventory
(both purchase and sales), and Support.** All four non-CRM modules use `clients` only
for the counterparty identity (name, address, GSTIN, contact) — none of them need the
CRM pipeline or health-score columns.

---

## 2. Target design

### 2.1 Design principles

1. `business_parties` is a **neutral** identity master — no CRM fields, no inventory
   ops fields, no AR/AP ledger fields. It owns only what every module needs: identity,
   classification, address, and contacts.
2. CRM, Inventory, and Accounting each add an **overlay table** that extends a party
   for their domain. No module writes the other's overlay.
3. `clients` is kept as a compatibility view/alias during migration; it is not dropped
   until all consumers have migrated and a shadow-read comparison is clean.
4. Descriptive PKs (`party_id`, `party_contact_id`, `party_address_id`) per §0 firm
   rule. All composite-unique per org.
5. CRM-without-Inventory and Inventory/Accounting-without-CRM both work because each
   overlay is independent. A `business_party` row can exist with only an Inventory
   overlay, only a CRM overlay, both, or neither.

---

### 2.2 `business_parties` — the neutral master

```typescript
// backend/src/db/schema/common/party.ts  (post Wave-4 folder reorg)

export const partyTypeEnum = pgEnum("party_type", [
  "CUSTOMER",   // buys from us (AR side)
  "VENDOR",     // we buy from (AP side)
  "PARTNER",    // neither pure buyer nor seller
  "BOTH",       // acts as customer AND vendor
]);

export const businessParties = pgTable("business_parties", {
  partyId:      serial("party_id").primaryKey(),
  orgId:        text("org_id")
                  .references(() => organizations.id, { onDelete: "cascade" })
                  .notNull(),

  // Identity
  displayName:  text("display_name").notNull(),
  legalName:    text("legal_name"),            // company registered name
  partyType:    partyTypeEnum("party_type").notNull().default("CUSTOMER"),

  // Tax / compliance
  gstin:        text("gstin"),
  pan:          text("pan"),
  currency:     text("currency").default("INR").notNull(),

  // Primary contact point (denormalized for speed; full list in party_contacts)
  primaryEmail: text("primary_email"),
  primaryPhone: text("primary_phone"),

  // Lifecycle
  status:       text("status").default("active").notNull(),
  deletedAt:    timestamp("deleted_at"),

  createdBy:    text("created_by").references(() => users.id).notNull(),
  createdAt:    timestamp("created_at").defaultNow().notNull(),
  updatedAt:    timestamp("updated_at").defaultNow().notNull()
                  .$onUpdate(() => new Date()),
}, (table) => [
  uniqueIndex("uniq_business_parties_org_name")
    .on(table.orgId, table.displayName),
  index("idx_business_parties_org_type")
    .on(table.orgId, table.partyType),
  index("idx_business_parties_org_status")
    .on(table.orgId, table.status),
  index("idx_business_parties_gstin")
    .on(table.orgId, table.gstin),
]);
```

**What is NOT here:** `leadId`, `accountManagerId`, `healthScore`, `churnRiskScore`,
`investmentValue`, `convertedAt` (all CRM-specific — live in the CRM overlay),
`leadTimeDays`, `paymentTermsDays`, `isActive` (Inventory vendor ops — live in the
Inventory overlay), `invoicePrefix`, ledger account links (Accounting overlay).

---

### 2.3 `party_contacts` — people at this party

```typescript
export const partyContacts = pgTable("party_contacts", {
  partyContactId: serial("party_contact_id").primaryKey(),
  orgId:          text("org_id")
                    .references(() => organizations.id, { onDelete: "cascade" })
                    .notNull(),
  partyId:        integer("party_id")
                    .references(() => businessParties.partyId, { onDelete: "cascade" })
                    .notNull(),

  name:           text("name").notNull(),
  email:          text("email"),
  phone:          text("phone"),
  title:          text("title"),
  department:     text("department"),
  isPrimary:      boolean("is_primary").default(false).notNull(),

  // Optional link to the CRM contacts table (same person may exist there)
  crmContactId:   integer("crm_contact_id")
                    .references(() => contacts.id, { onDelete: "set null" }),

  deletedAt:      timestamp("deleted_at"),
  createdAt:      timestamp("created_at").defaultNow().notNull(),
  updatedAt:      timestamp("updated_at").defaultNow().notNull()
                    .$onUpdate(() => new Date()),
}, (table) => [
  index("idx_party_contacts_party").on(table.partyId),
  index("idx_party_contacts_org").on(table.orgId),
]);
```

---

### 2.4 `party_addresses` — delivery, billing, registered

```typescript
export const partyAddressTypeEnum = pgEnum("party_address_type", [
  "BILLING", "SHIPPING", "REGISTERED", "OTHER",
]);

export const partyAddresses = pgTable("party_addresses", {
  partyAddressId: serial("party_address_id").primaryKey(),
  orgId:          text("org_id")
                    .references(() => organizations.id, { onDelete: "cascade" })
                    .notNull(),
  partyId:        integer("party_id")
                    .references(() => businessParties.partyId, { onDelete: "cascade" })
                    .notNull(),

  addressType:    partyAddressTypeEnum("address_type").notNull().default("BILLING"),
  line1:          text("line1").notNull(),
  line2:          text("line2"),
  city:           text("city"),
  state:          text("state"),
  pincode:        text("pincode"),
  country:        text("country").default("India").notNull(),
  isDefault:      boolean("is_default").default(false).notNull(),

  createdAt:      timestamp("created_at").defaultNow().notNull(),
  updatedAt:      timestamp("updated_at").defaultNow().notNull()
                    .$onUpdate(() => new Date()),
}, (table) => [
  index("idx_party_addresses_party").on(table.partyId),
  index("idx_party_addresses_org_type").on(table.orgId, table.addressType),
]);
```

---

## 3. Module overlays

Each overlay is a **1:1 extension** of `business_parties` for module-specific data.
An overlay row is created when that module first needs a party, not at party creation.
No overlay imports another module's overlay table.

### 3.1 CRM overlay — `crm_party_accounts`

Replaces the CRM-specific columns currently on `clients`. The existing `clients` table
rows map 1:1 to `(business_parties row + crm_party_accounts row)`.

```typescript
// backend/src/db/schema/crm/party-account.ts

export const crmPartyAccounts = pgTable("crm_party_accounts", {
  crmAccountId:       integer("crm_account_id").primaryKey()
                        .references(() => businessParties.partyId, { onDelete: "cascade" }),
  orgId:              text("org_id")
                        .references(() => organizations.id, { onDelete: "cascade" })
                        .notNull(),

  // CRM pipeline provenance
  leadId:             integer("lead_id")
                        .references(() => leads.id, { onDelete: "set null" }),
  accountManagerId:   text("account_manager_id")
                        .references(() => users.id, { onDelete: "set null" }),

  // CRM health
  healthScore:        integer("health_score").default(50).notNull(),
  healthStatus:       crmHealthEnum("health_status").default("healthy").notNull(),
  lastHealthCheck:    timestamp("last_health_check"),
  churnRiskScore:     integer("churn_risk_score"),
  churnRiskReasoning: text("churn_risk_reasoning"),

  // Investment tracking (financial-services CRM use case)
  investmentValue:    decimal("investment_value", { precision: 15, scale: 2 }),
  convertedAt:        timestamp("converted_at"),

  // Link to a CRM organization (company-level record)
  crmOrganizationId:  integer("crm_organization_id")
                        .references(() => crmOrganizations.id, { onDelete: "set null" }),

  createdAt:          timestamp("created_at").defaultNow().notNull(),
  updatedAt:          timestamp("updated_at").defaultNow().notNull()
                        .$onUpdate(() => new Date()),
}, (table) => [
  uniqueIndex("uniq_crm_party_accounts_org_party")
    .on(table.orgId, table.crmAccountId),
  index("idx_crm_party_accounts_account_manager")
    .on(table.accountManagerId),
  index("idx_crm_party_accounts_org_health")
    .on(table.orgId, table.healthStatus),
]);
```

**CRM offers** (`crm_products` → CRM Offer) remain in `crm/products.ts` and are linked
to CRM Account rows, not to `business_parties` directly. The offer-fulfillment bridge
(T6.4) adds a cross-module mapping table without coupling the schemas.

### 3.2 Inventory overlay — `inv_party_vendor_profiles`

Replaces the inventory-ops columns currently on `inv_vendors`. Existing `inv_vendors`
rows map to `(business_parties row + inv_party_vendor_profiles row)`.

```typescript
// backend/src/db/schema/inventory/party-vendor-profile.ts

export const invPartyVendorProfiles = pgTable("inv_party_vendor_profiles", {
  vendorProfileId:  integer("vendor_profile_id").primaryKey()
                      .references(() => businessParties.partyId, { onDelete: "cascade" }),
  orgId:            text("org_id")
                      .references(() => organizations.id, { onDelete: "cascade" })
                      .notNull(),

  // Vendor code unique per org (replaces inv_vendors.code)
  vendorCode:       text("vendor_code").notNull(),

  // Procurement ops
  leadTimeDays:     integer("lead_time_days").default(7).notNull(),
  paymentTermsDays: integer("payment_terms_days").default(30).notNull(),
  currency:         text("currency").default("INR").notNull(),
  isActive:         boolean("is_active").default(true).notNull(),
  notes:            text("notes"),

  createdBy:        text("created_by").references(() => users.id).notNull(),
  createdAt:        timestamp("created_at").defaultNow().notNull(),
  updatedAt:        timestamp("updated_at").defaultNow().notNull()
                      .$onUpdate(() => new Date()),
}, (table) => [
  uniqueIndex("uniq_inv_vendor_profile_org_code")
    .on(table.orgId, table.vendorCode),
  index("idx_inv_vendor_profile_org")
    .on(table.orgId),
]);
```

`inv_purchase_orders.vendor_id` will eventually point to `inv_party_vendor_profiles.vendor_profile_id`
(same integer, same party — just a semantic rename during migration). The join to
`business_parties` for display name/GSTIN becomes: `inv_purchase_orders → inv_party_vendor_profiles → business_parties`.

### 3.3 Accounting overlay — `acc_party_profiles`

Finance AR/AP and Assets tables all FK into `clients` today. After migration they FK
into `business_parties.party_id`. No separate overlay table is needed for basic AR/AP
because `business_parties` already carries GSTIN, display name, and primary contact.

However, if Accounting needs party-level defaults (e.g. default AR/AP ledger accounts,
credit limit, payment terms for AR), those belong in an `acc_party_profiles` overlay.
This is deferred to a separate accounting-module wave. For Wave 6, AR/AP tables simply
re-target their `client_id`/`vendor_id` FKs to `business_parties.party_id` via the
adapter layer.

---

## 4. Non-destructive migration strategy

The rule is **expand → adapter → shadow-read compare → cut-over → contract**.
`clients` is never dropped during Wave 6; it becomes a compatibility name pointing at
the new master.

### Step 1 — Expand: add `business_parties` + overlay tables (T6.1)

Run an additive migration that creates:
- `business_parties`
- `party_contacts`
- `party_addresses`
- `crm_party_accounts`
- `inv_party_vendor_profiles`

No existing table is altered. Build stays green.

### Step 2 — Backfill: populate new tables from existing rows

An idempotent backfill script (run once, re-runnable):

```
For each clients row:
  INSERT INTO business_parties (org_id, display_name, party_type, gstin, primary_email,
    primary_phone, status, created_by, created_at, updated_at)
  VALUES (clients.org_id, clients.name,
    CASE WHEN clients.is_vendor THEN 'VENDOR' ELSE 'CUSTOMER' END,
    clients.gstin, clients.email, clients.phone, clients.status,
    clients.account_manager_id /* use system user if null */,
    clients.created_at, clients.updated_at)
  ON CONFLICT (org_id, display_name) DO NOTHING;

  -- CRM overlay (all clients rows — they all came from CRM)
  INSERT INTO crm_party_accounts (crm_account_id, org_id, lead_id, account_manager_id,
    health_score, health_status, last_health_check, churn_risk_score, churn_risk_reasoning,
    investment_value, converted_at, created_at, updated_at)
  SELECT bp.party_id, ..., clients.*
  FROM business_parties bp
  WHERE bp.org_id = clients.org_id
    AND bp.display_name = clients.name;

For each inv_vendors row where client_id IS NOT NULL:
  -- Party row already exists from clients backfill; just add Inventory overlay
  INSERT INTO inv_party_vendor_profiles (vendor_profile_id, org_id, vendor_code, ...)
  SELECT bp.party_id, inv_vendors.org_id, inv_vendors.code, ...
  FROM business_parties bp
  JOIN clients c ON c.id = inv_vendors.client_id
  WHERE bp.org_id = inv_vendors.org_id AND bp.display_name = c.name;

For each inv_vendors row where client_id IS NULL:
  -- No existing CRM client — create a new business_parties row (VENDOR type only)
  INSERT INTO business_parties (..., party_type='VENDOR', ...);
  INSERT INTO inv_party_vendor_profiles (...);
```

### Step 3 — Add bridge FK column on consumers (shadow write)

For each consumer table (e.g. `invoices`, `purchase_bills`, `credit_notes`,
`fin_collection_activities`, `inv_sales_orders`, `support_tickets`,
`acc_fixed_assets`, `support_vip_clients`):

```sql
ALTER TABLE invoices
  ADD COLUMN party_id integer REFERENCES business_parties(party_id) ON DELETE SET NULL;
```

The new column is nullable. A write interceptor (service layer) populates it in parallel
with `client_id` on every new write. Neither column is the authority yet.

### Step 4 — Adapter layer in services

Each service module gets a **party adapter** that resolves a `clientId` (integer) or
`invVendorId` to a `partyId` without the consumer knowing. Adapters live in each
module's service folder — not in `common/party`. Examples:

```typescript
// crm/party-adapter.service.ts
async resolvePartyId(orgId: string, clientId: number): Promise<number> {
  // reads the crm_party_accounts → business_parties join
}

// inventory/vendor-party-adapter.service.ts
async resolveVendorPartyId(orgId: string, invVendorId: number): Promise<number> {
  // reads inv_party_vendor_profiles
}
```

The AR/AP services (Finance) do not import from `crm/` or `inventory/` schemas after
Wave 6. They import from `common/party` only.

### Step 5 — Shadow-read comparison

For 2 full releases: every service that currently reads `clients` also reads the
equivalent `business_parties` row and compares identity fields (name, gstin, email).
Mismatches are logged to a reconciliation table. Zero mismatches = ready to cut over.

### Step 6 — Cut-over reads

Switch each consumer's service from reading `clients.name` to `business_parties.display_name`,
one consumer at a time. The FK column `party_id` becomes the primary join; `client_id`
becomes the fallback.

### Step 7 — Stop legacy writes and validate FKs (Wave 7 gate)

Once all consumers have cut over, `client_id` columns stop being written. Wave 7 then
adds `NOT VALID` constraints on the new `party_id` FKs and validates them.

### Step 8 — Contract (Wave 12 gate)

After two clean releases with zero mismatches and no legacy writes: drop the shadow
`client_id`/`vendor_id` columns from consumer tables and the legacy `clients` rows
that have no readers. The `clients` name is retired.

---

## 5. Support tickets boundary fix (T6.3)

**Current state:** `support_tickets` and `support_ticket_messages` are defined in
`crm/billing.ts`, importing `clients` for `client_id`. The support module already has
`backend/src/db/schema/support/agent-routing.ts`.

**Fix — two sub-steps, both non-destructive:**

**T6.3a — Physical move (Wave 4 schema-folder reorg, T4.1 trigger):**
Move the `support_tickets` and `support_ticket_messages` table definitions (and their
relations) from `crm/billing.ts` into a new file `support/tickets.ts`. Update
all schema barrel exports and all import paths. This is a pure file move — zero
behavior change, zero migration needed. The `client_id` FK stays pointing at `clients`
until the party migration completes.

**T6.3b — Re-target FK (Wave 6 party migration):**
After `business_parties` is populated, `support_tickets.client_id` is the same as
every other consumer: add a shadow `party_id` column, backfill, shadow-compare,
cut over.

**Post-move, `crm/billing.ts` contains only:** `invoices`, `invoice_items`, `payments`,
`purchase_bills`, `purchase_bill_items`, `vendor_payments`, `quotes`, `quote_line_items`.
That file should also be renamed `crm/finance-bridge.ts` to reflect that it is the
CRM-owned billing bridge, not the accounting source of truth.

---

## 6. CRM Offer ↔ Inventory SKU integration bridge (T6.4)

Neither CRM nor Inventory should import the other's schema. Cross-module order
fulfillment (CRM deal closes → Inventory sales order auto-created) uses an
**integration-owned mapping table** and **outbox events**.

```typescript
// backend/src/db/schema/common/offer-fulfillment.ts  (or integration/ context)

export const offerFulfillmentComponents = pgTable("offer_fulfillment_components", {
  offerFulfillmentComponentId: serial("offer_fulfillment_component_id").primaryKey(),
  orgId:                       text("org_id")
                                 .references(() => organizations.id, { onDelete: "cascade" })
                                 .notNull(),

  // CRM side — references crm_products (CRM Offer)
  crmOfferId:                  integer("crm_offer_id").notNull(),
  crmOfferOrgId:               text("crm_offer_org_id").notNull(),

  // Inventory side — references inv_product_variants (Inventory SKU)
  invSkuId:                    integer("inv_sku_id").notNull(),
  invSkuOrgId:                 text("inv_sku_org_id").notNull(),

  quantityPerUnit:             decimal("quantity_per_unit", { precision: 10, scale: 4 })
                                 .default("1").notNull(),
  notes:                       text("notes"),

  createdBy:                   text("created_by").references(() => users.id).notNull(),
  createdAt:                   timestamp("created_at").defaultNow().notNull(),
  updatedAt:                   timestamp("updated_at").defaultNow().notNull()
                                 .$onUpdate(() => new Date()),
}, (table) => [
  uniqueIndex("uniq_offer_fulfillment_components_org_offer_sku")
    .on(table.orgId, table.crmOfferId, table.invSkuId),
  index("idx_offer_fulfillment_components_offer").on(table.orgId, table.crmOfferId),
  index("idx_offer_fulfillment_components_sku").on(table.orgId, table.invSkuId),
]);
```

The columns `crmOfferOrgId` and `invSkuOrgId` are explicit (not inferred from `orgId`)
so a future query can assert the mapping is tenant-safe without joining both modules.
The `orgId` column is the tenant of the mapping itself (always the same org).

The integration service (not CRM, not Inventory) owns this table. On deal close, an
outbox event `deal.closed` is published; the integration service consumes it, reads
the mapping, and creates an `inv_sales_orders` row. CRM never writes to Inventory;
Inventory never reads CRM deals.

---

## 7. Module independence — confirmed

After Wave 6:

| Scenario | How it works |
|---|---|
| CRM only (no Inventory) | `business_parties` + `crm_party_accounts` exists. `inv_party_vendor_profiles` is never populated. No Inventory FK on any CRM table. |
| Inventory + Accounting (no CRM) | `business_parties` + `inv_party_vendor_profiles` rows created by Inventory module. `crm_party_accounts` is never populated. AR/AP FKs point directly to `business_parties`. |
| CRM + Inventory (offer fulfillment) | Both overlays exist. `offer_fulfillment_components` mapping populated by the integration service. |
| Inventory + Accounting without CRM | `inv_purchase_orders.vendor_id → inv_party_vendor_profiles.vendor_profile_id → business_parties`. `purchase_bills.vendor_id → business_parties.party_id` directly. CRM module disabled — no code path touches `crm_party_accounts`. |

---

## 8. Boundary violation summary

| Violation | File | Fix | Wave |
|---|---|---|---|
| `support_tickets` defined in CRM billing file | `crm/billing.ts` | Move to `support/tickets.ts` | T6.3a (can be done in Wave 4 T4.1 reorg) |
| `inv_vendors.client_id` → CRM `clients` | `inventory/purchase-orders.ts` | Replace with `inv_party_vendor_profiles` overlay; remove the cross-module import | T6.2 |
| `inv_sales_orders.client_id` → CRM `clients` | `inventory/sales-orders.ts` | Re-target to `business_parties.party_id` | T6.2 |
| Finance AR/AP tables FK into CRM `clients` | `crm/billing.ts`, `finance-ar-ap.ts`, `finance-assets.ts` | Re-target to `business_parties.party_id` | T6.2 |
| `support_vip_clients.client_id` → CRM `clients` | `support/agent-routing.ts` | Re-target to `business_parties.party_id` | T6.2 |
| `projects/tasks.ts` imports `crmOrganizations` | `projects/tasks.ts` | Decouple (tasks should not import CRM schema) | T6.2 or Wave 8 |
| `projects/relations.ts` imports `crmOrganizations` | `projects/relations.ts` | Same — decouple | T6.2 or Wave 8 |

---

## 9. Wave 6 task checklist

- [ ] **T6.1** `[DB]` Migration: create `business_parties`, `party_contacts`,
  `party_addresses`, `crm_party_accounts`, `inv_party_vendor_profiles`. No existing
  table altered. Build green.
- [ ] **T6.1b** `[BE]` Backfill script: `clients` → `business_parties` + `crm_party_accounts`;
  `inv_vendors` → `business_parties` + `inv_party_vendor_profiles` (vendor-only rows).
  Idempotent, re-runnable, tenant-scoped.
- [ ] **T6.2a** `[BE]` Party adapter services per module (CRM, Inventory, Finance).
- [ ] **T6.2b** `[DB]` Add shadow `party_id` columns to all 16 consumer tables (nullable,
  FK `business_parties`). Shadow write in services.
- [ ] **T6.2c** `[BE]` Shadow-read comparison + reconciliation log. Run for 2 releases.
- [ ] **T6.2d** `[BE]` Cut over each consumer's reads from `clients` to `business_parties`,
  one service at a time.
- [ ] **T6.3a** `[BE]` Move `support_tickets` + `support_ticket_messages` from
  `crm/billing.ts` to `support/tickets.ts`. Update all imports. Types green.
  *(Can be pulled into Wave 4 T4.1 as a schema-reorg sub-task.)*
- [ ] **T6.3b** `[BE]` `support_tickets.party_id` shadow column + cut-over per T6.2b–d.
- [ ] **T6.4** `[DB/BE]` `offer_fulfillment_components` table + integration service
  (outbox consumer: `deal.closed` → `inv_sales_orders`). No CRM↔Inventory direct import.
- [ ] **T6.5** `[BE]` Remove the cross-module imports (`inventory/purchase-orders.ts`
  stops importing `crm/contacts`, `projects/tasks.ts` + `projects/relations.ts` stop
  importing `crm/contacts`). Verify build + types.
- [ ] **T6.6** `[FE]` Party picker component reused across CRM, Inventory create-vendor,
  Finance bill/invoice counterparty — single `<PartySelect>` that queries
  `GET /business-parties` with `type` filter, not three separate `clientId` selects.
- [ ] **T6.7** `[BE]` e2e tests: CRM-only org (no Inventory) creates a party + CRM
  account; Inventory-only org creates a vendor party without CRM; Finance AR invoice
  links to customer party; cross-tenant party read rejected.

---

## 10. Wave 7 gate items (not Wave 6 — listed for awareness)

- Add `NOT VALID` FK constraints on `party_id` columns, then `VALIDATE` once all
  backfill rows are verified.
- Drop shadow `client_id`/`vendor_id` columns from consumer tables once legacy writes
  have stopped and two clean releases have passed.
- `UNIQUE (org_id, party_id)` composite candidate key on `business_parties` for
  composite-FK-safe referencing.

---

## 11. Deferred decisions (need explicit sign-off before implementation)

1. **`clients` as a Postgres view vs a compatibility alias:** Should `clients` become a
   `CREATE VIEW clients AS SELECT ... FROM business_parties JOIN crm_party_accounts ...`
   so existing read queries need no change during the migration window? This has the
   upside of zero read-path changes but makes the view non-updatable, requiring
   INSTEAD-OF triggers for writes. Alternative: leave `clients` as the physical table
   and add `party_id` as a shadow column. **Recommendation: shadow column on the
   physical table; no view.** Simpler, avoids trigger complexity.

2. **`crm_organizations` fate:** `crm_organizations` is a company-level CRM entity
   (distinct from `clients`/`business_parties`, which are contact-level). Should
   `crm_organizations` become a `business_parties` row of type CUSTOMER/VENDOR with a
   `crmOrganizationId` back-link, or stay as a separate CRM hierarchy table?
   **Recommendation: keep `crm_organizations` as-is for Wave 6.** It has no consumers
   outside CRM itself (only `contacts.organization_id` and a projects tasks/relations
   import — both to be decoupled per §8). Merging it into `business_parties` is a Wave
   12 cleanup, not a Wave 6 blocker.

3. **`party_type = 'BOTH'`:** A party that is simultaneously a customer (you invoice
   them) and a vendor (they invoice you) is legitimate (e.g. a contractor who also
   buys your services). The `BOTH` enum value handles this. Services that filter by
   type use `IN ('VENDOR', 'BOTH')` for AP and `IN ('CUSTOMER', 'BOTH')` for AR.
   Confirm this pattern before implementing the AR/AP adapter.
