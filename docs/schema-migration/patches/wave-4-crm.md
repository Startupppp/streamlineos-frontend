---
type: wave-4 patch spec (CRM)
status: DRAFT
date: 2026-07-26
migration-file: 0212_phase_d_crm_pm_composite_fks.ts (and 0202_phase_a_crm_pm_chat_org_id.ts, 0208_phase_c_crm_pm_candidate_keys.ts)
depends-on: wave-4-execution-plan.md, wave-0-composite-fk-matrix-crm-projects-misc.md (Part D)
wave-7-ref: W7-C
blocks: Wave 7 composite FK enforcement (CRM cluster), Wave 9 RLS on CRM tables
wave-6-note: clients→business_parties overlay is Wave 6 work. All `clients.id` FK references in this spec use the CRM `clients` table as it exists today. When Wave 6 lands, those FKs will be migrated to `business_parties`. Do not rename or remove `clients` as part of this wave.
---

# Wave 4 Patch Spec — CRM Domain Tenant-Safe FK Work

> Implementation-ready. Apply phases in strict order A → B → C → D.
> Each phase is a hard prerequisite for the next.
> All Drizzle diffs are shown as before→after for the relevant file section.
> All generated SQL uses `NOT VALID` first; `VALIDATE CONSTRAINT` runs separately
> in migration `0218_phase_d_validate_crm_pm.ts` during a low-traffic window.

---

## Scope of this spec

This spec covers the CRM-domain tables that fall under Wave 4 phases A, B, C, and D
as defined in `wave-4-execution-plan.md`. Concretely:

**Phase A (add missing `org_id`):** 5 tables — `invoice_items`, `purchase_bill_items`,
`support_ticket_messages`, `quote_line_items`, `client_account_activities`.

**Phase B (add missing `.references()` / bare FK hotfixes):** 2 tables —
`crm_sla_breach_log.org_id` (bare text, no FK) and `crm_sla_breach_log.lead_id`
(bare integer, no FK).

**Phase C (add `UNIQUE(org_id, id)` candidate keys on CRM parent tables):** 12 tables —
`leads`, `clients`, `client_accounts`, `branches`, `crm_organizations`, `deals`,
`crm_campaigns`, `invoices`, `purchase_bills`, `support_tickets`, `csat_surveys`,
`quotes`.

**Phase D (add composite FKs):** All CRM child→parent composite FK declarations.
Covered table by table below in sections D1–D17.

**Not in scope for this spec:**
- PM/projects cluster (separate `wave-4-pm.md`)
- Support module proper (separate `wave-4-support.md`)
- KB and Chat clusters (separate specs)
- Wave 6 `clients → business_parties` migration (acknowledged, not detailed here)

---

## Phase A — Add `org_id text NOT NULL` to CRM line tables

Migration file: `0202_phase_a_crm_pm_chat_org_id.ts` (shared with PM/Chat — CRM portion)

Process in the order below inside a single transaction. Each table's parent already has
`org_id` so backfill is a one-hop `UPDATE … FROM parent`.

---

### A.1 — `invoice_items`

**Source file:** `backend/src/db/schema/crm/billing.ts`

**Before:**
```typescript
export const invoiceItems = pgTable("invoice_items", {
  id: serial("id").primaryKey(),
  invoiceId: integer("invoice_id").references(() => invoices.id, { onDelete: "cascade" }).notNull(),
  description: text("description").notNull(),
  hsnSacCode: text("hsn_sac_code"),
  quantity: decimal("quantity", { precision: 18, scale: 4 }).notNull(),
  rate: decimal("rate", { precision: 18, scale: 4 }).notNull(),
  gstRate: decimal("gst_rate", { precision: 5, scale: 2 }).notNull(),
  amount: decimal("amount", { precision: 18, scale: 4 }).notNull(),
  lineOrder: integer("line_order").notNull(),
}, (table) => [
  index("idx_invoice_items_invoice").on(table.invoiceId),
]);
```

**After:**
```typescript
export const invoiceItems = pgTable("invoice_items", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  invoiceId: integer("invoice_id").references(() => invoices.id, { onDelete: "cascade" }).notNull(),
  description: text("description").notNull(),
  hsnSacCode: text("hsn_sac_code"),
  quantity: decimal("quantity", { precision: 18, scale: 4 }).notNull(),
  rate: decimal("rate", { precision: 18, scale: 4 }).notNull(),
  gstRate: decimal("gst_rate", { precision: 5, scale: 2 }).notNull(),
  amount: decimal("amount", { precision: 18, scale: 4 }).notNull(),
  lineOrder: integer("line_order").notNull(),
}, (table) => [
  index("idx_invoice_items_invoice").on(table.invoiceId),
  index("idx_invoice_items_org").on(table.orgId),
]);
```

**Add to imports:** `organizations` from `"../auth"` (already present for billing.ts via existing `invoices` table — confirm before adding duplicate import).

**Generated SQL (run in order):**
```sql
-- A.1.1: add nullable first
ALTER TABLE invoice_items ADD COLUMN org_id text;

-- A.1.2: backfill from parent
UPDATE invoice_items ii
SET org_id = inv.org_id
FROM invoices inv
WHERE inv.id = ii.invoice_id;

-- A.1.3: verify zero nulls
SELECT COUNT(*) FROM invoice_items WHERE org_id IS NULL;
-- must return 0 before proceeding

-- A.1.4: set NOT NULL
ALTER TABLE invoice_items ALTER COLUMN org_id SET NOT NULL;

-- A.1.5: add bare org FK (composite comes in Phase D)
ALTER TABLE invoice_items
  ADD CONSTRAINT invoice_items_org_id_fk
  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;

-- A.1.6: add supporting index
CREATE INDEX IF NOT EXISTS idx_invoice_items_org ON invoice_items (org_id);
```

**Quarantine check (run before step A.1.4):**
```sql
SELECT COUNT(*) FROM invoice_items ii
WHERE ii.invoice_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM invoices inv WHERE inv.id = ii.invoice_id);
-- must return 0; if not, quarantine orphan rows before proceeding
```

---

### A.2 — `purchase_bill_items`

**Source file:** `backend/src/db/schema/crm/billing.ts`

**Before:**
```typescript
export const purchaseBillItems = pgTable("purchase_bill_items", {
  id: serial("id").primaryKey(),
  billId: integer("bill_id").references(() => purchaseBills.id, { onDelete: "cascade" }).notNull(),
  description: text("description").notNull(),
  hsnSacCode: text("hsn_sac_code"),
  quantity: decimal("quantity", { precision: 18, scale: 4 }).notNull(),
  rate: decimal("rate", { precision: 18, scale: 4 }).notNull(),
  gstRate: decimal("gst_rate", { precision: 5, scale: 2 }).notNull(),
  amount: decimal("amount", { precision: 18, scale: 4 }).notNull(),
  lineOrder: integer("line_order").notNull(),
}, (table) => [
  index("idx_purchase_bill_items_bill").on(table.billId),
]);
```

**After:**
```typescript
export const purchaseBillItems = pgTable("purchase_bill_items", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  billId: integer("bill_id").references(() => purchaseBills.id, { onDelete: "cascade" }).notNull(),
  description: text("description").notNull(),
  hsnSacCode: text("hsn_sac_code"),
  quantity: decimal("quantity", { precision: 18, scale: 4 }).notNull(),
  rate: decimal("rate", { precision: 18, scale: 4 }).notNull(),
  gstRate: decimal("gst_rate", { precision: 5, scale: 2 }).notNull(),
  amount: decimal("amount", { precision: 18, scale: 4 }).notNull(),
  lineOrder: integer("line_order").notNull(),
}, (table) => [
  index("idx_purchase_bill_items_bill").on(table.billId),
  index("idx_purchase_bill_items_org").on(table.orgId),
]);
```

**Generated SQL:**
```sql
-- A.2.1
ALTER TABLE purchase_bill_items ADD COLUMN org_id text;

-- A.2.2: backfill from parent
UPDATE purchase_bill_items pbi
SET org_id = pb.org_id
FROM purchase_bills pb
WHERE pb.id = pbi.bill_id;

-- A.2.3: verify zero nulls
SELECT COUNT(*) FROM purchase_bill_items WHERE org_id IS NULL;
-- must return 0

-- A.2.4
ALTER TABLE purchase_bill_items ALTER COLUMN org_id SET NOT NULL;

-- A.2.5
ALTER TABLE purchase_bill_items
  ADD CONSTRAINT purchase_bill_items_org_id_fk
  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;

-- A.2.6
CREATE INDEX IF NOT EXISTS idx_purchase_bill_items_org ON purchase_bill_items (org_id);
```

---

### A.3 — `support_ticket_messages`

**Source file:** `backend/src/db/schema/crm/billing.ts`

**Before:**
```typescript
export const supportTicketMessages = pgTable("support_ticket_messages", {
  id: serial("id").primaryKey(),
  ticketId: integer("ticket_id").references(() => supportTickets.id, { onDelete: "cascade" }).notNull(),
  authorId: text("author_id").references(() => users.id),
  body: text("body").notNull(),
  isInternal: boolean("is_internal").default(false).notNull(),
  attachments: jsonb("attachments").$type<...>().default([]),
  sourceChannel: text("source_channel").default("web").notNull(),
  sourceMessageId: text("source_message_id"),
  sourceContactEmail: text("source_contact_email"),
  sourceContactName: text("source_contact_name"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_support_ticket_messages_ticket").on(table.ticketId),
  index("idx_support_ticket_messages_author").on(table.authorId),
  index("idx_support_ticket_messages_source_message").on(table.sourceMessageId),
]);
```

**After:**
```typescript
export const supportTicketMessages = pgTable("support_ticket_messages", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  ticketId: integer("ticket_id").references(() => supportTickets.id, { onDelete: "cascade" }).notNull(),
  authorId: text("author_id").references(() => users.id),
  body: text("body").notNull(),
  isInternal: boolean("is_internal").default(false).notNull(),
  attachments: jsonb("attachments").$type<...>().default([]),
  sourceChannel: text("source_channel").default("web").notNull(),
  sourceMessageId: text("source_message_id"),
  sourceContactEmail: text("source_contact_email"),
  sourceContactName: text("source_contact_name"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_support_ticket_messages_ticket").on(table.ticketId),
  index("idx_support_ticket_messages_author").on(table.authorId),
  index("idx_support_ticket_messages_source_message").on(table.sourceMessageId),
  index("idx_support_ticket_messages_org").on(table.orgId),
]);
```

**Generated SQL:**
```sql
-- A.3.1
ALTER TABLE support_ticket_messages ADD COLUMN org_id text;

-- A.3.2: backfill from parent
UPDATE support_ticket_messages stm
SET org_id = st.org_id
FROM support_tickets st
WHERE st.id = stm.ticket_id;

-- A.3.3: verify zero nulls
SELECT COUNT(*) FROM support_ticket_messages WHERE org_id IS NULL;
-- must return 0

-- A.3.4
ALTER TABLE support_ticket_messages ALTER COLUMN org_id SET NOT NULL;

-- A.3.5
ALTER TABLE support_ticket_messages
  ADD CONSTRAINT support_ticket_messages_org_id_fk
  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;

-- A.3.6
CREATE INDEX IF NOT EXISTS idx_support_ticket_messages_org ON support_ticket_messages (org_id);
```

**Note:** `support_ticket_messages` also becomes a parent table in Phase C (its `id`
is referenced by `support_message_mentions.message_id` — covered in the support module
spec). The `UNIQUE(org_id, id)` candidate key for `support_ticket_messages` is Phase C
work for the support cluster, not CRM. Recorded here as a cross-reference only.

---

### A.4 — `quote_line_items`

**Source file:** `backend/src/db/schema/crm/billing.ts`

**Before:**
```typescript
export const quoteLineItems = pgTable("quote_line_items", {
  id: serial("id").primaryKey(),
  quoteId: integer("quote_id").references(() => quotes.id, { onDelete: "cascade" }).notNull(),
  description: text("description").notNull(),
  quantity: decimal("quantity", { precision: 10, scale: 2 }).notNull(),
  unitPrice: decimal("unit_price", { precision: 15, scale: 2 }).notNull(),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  taxRate: decimal("tax_rate", { precision: 5, scale: 2 }).default("0").notNull(),
  displayOrder: integer("display_order").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
```

**After:**
```typescript
export const quoteLineItems = pgTable("quote_line_items", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  quoteId: integer("quote_id").references(() => quotes.id, { onDelete: "cascade" }).notNull(),
  description: text("description").notNull(),
  quantity: decimal("quantity", { precision: 10, scale: 2 }).notNull(),
  unitPrice: decimal("unit_price", { precision: 15, scale: 2 }).notNull(),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  taxRate: decimal("tax_rate", { precision: 5, scale: 2 }).default("0").notNull(),
  displayOrder: integer("display_order").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_quote_line_items_quote").on(table.quoteId),
  index("idx_quote_line_items_org").on(table.orgId),
]);
```

**Generated SQL:**
```sql
-- A.4.1
ALTER TABLE quote_line_items ADD COLUMN org_id text;

-- A.4.2: backfill from parent
UPDATE quote_line_items qli
SET org_id = q.org_id
FROM quotes q
WHERE q.id = qli.quote_id;

-- A.4.3: verify zero nulls
SELECT COUNT(*) FROM quote_line_items WHERE org_id IS NULL;
-- must return 0

-- A.4.4
ALTER TABLE quote_line_items ALTER COLUMN org_id SET NOT NULL;

-- A.4.5
ALTER TABLE quote_line_items
  ADD CONSTRAINT quote_line_items_org_id_fk
  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;

-- A.4.6
CREATE INDEX IF NOT EXISTS idx_quote_line_items_quote ON quote_line_items (quote_id);
CREATE INDEX IF NOT EXISTS idx_quote_line_items_org ON quote_line_items (org_id);
```

---

### A.5 — `client_account_activities`

**Source file:** `backend/src/db/schema/crm/contacts.ts`

**Before:**
```typescript
export const clientAccountActivities = pgTable("client_account_activities", {
  id: serial("id").primaryKey(),
  clientAccountId: integer("client_account_id").notNull().references(() => clientAccounts.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => users.id),
  activityType: text("activity_type").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_client_account_activities_account").on(table.clientAccountId),
  index("idx_client_account_activities_user").on(table.userId),
]);
```

**After:**
```typescript
export const clientAccountActivities = pgTable("client_account_activities", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  clientAccountId: integer("client_account_id").notNull().references(() => clientAccounts.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => users.id),
  activityType: text("activity_type").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("idx_client_account_activities_account").on(table.clientAccountId),
  index("idx_client_account_activities_user").on(table.userId),
  index("idx_client_account_activities_org").on(table.orgId),
]);
```

**Generated SQL:**
```sql
-- A.5.1
ALTER TABLE client_account_activities ADD COLUMN org_id text;

-- A.5.2: backfill from parent (client_accounts already has org_id)
UPDATE client_account_activities caa
SET org_id = ca.org_id
FROM client_accounts ca
WHERE ca.id = caa.client_account_id;

-- A.5.3: verify zero nulls
SELECT COUNT(*) FROM client_account_activities WHERE org_id IS NULL;
-- must return 0

-- A.5.4
ALTER TABLE client_account_activities ALTER COLUMN org_id SET NOT NULL;

-- A.5.5
ALTER TABLE client_account_activities
  ADD CONSTRAINT client_account_activities_org_id_fk
  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;

-- A.5.6
CREATE INDEX IF NOT EXISTS idx_client_account_activities_org ON client_account_activities (org_id);
```

---

## Phase B — Add missing `.references()` on bare FK columns

Migration file: `0205_phase_b_p1_defect_fks.ts` (shared P1 hotfix file)

### B.1 — `crm_sla_breach_log` — two bare columns

**Source file:** `backend/src/db/schema/crm/deals.ts`

Current declaration (lines 382–393):
```typescript
export const crmSlaBreachLog = pgTable("crm_sla_breach_log", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").notNull(),           // NO .references() — bare text
  leadId: integer("lead_id").notNull(),      // NO .references() — bare integer
  policyId: integer("policy_id"),
  breachedAt: timestamp("breached_at", { withTimezone: true }).defaultNow().notNull(),
  taskCreated: boolean("task_created").default(false).notNull(),
  notified: boolean("notified").default(false).notNull(),
}, (table) => [
  uniqueIndex("crm_sla_breach_log_lead_policy_unique").on(table.leadId, table.policyId),
  index("idx_sla_breach_org_idx").on(table.orgId),
  index("idx_sla_breach_lead_idx").on(table.leadId),
]);
```

**After:**
```typescript
export const crmSlaBreachLog = pgTable("crm_sla_breach_log", {
  id: serial("id").primaryKey(),
  orgId: text("org_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  leadId: integer("lead_id").references(() => leads.id, { onDelete: "cascade" }).notNull(),
  policyId: integer("policy_id"),
  breachedAt: timestamp("breached_at", { withTimezone: true }).defaultNow().notNull(),
  taskCreated: boolean("task_created").default(false).notNull(),
  notified: boolean("notified").default(false).notNull(),
}, (table) => [
  uniqueIndex("crm_sla_breach_log_lead_policy_unique").on(table.leadId, table.policyId),
  index("idx_sla_breach_org_idx").on(table.orgId),
  index("idx_sla_breach_lead_idx").on(table.leadId),
]);
```

**Add to imports in `deals.ts`:** `leads` is already imported from `"./leads"`.
`organizations` from `"../auth"` — verify it is already imported (it is, via `dealActivities` etc.).

**Generated SQL:**

```sql
-- B.1.1: quarantine orphan org_ids (rows whose org_id is not in organizations)
BEGIN;
CREATE TABLE IF NOT EXISTS crm_sla_breach_log_quarantine AS
  SELECT *, now() AS quarantined_at, 'wave-4-phase-b' AS reason
  FROM crm_sla_breach_log
  WHERE NOT EXISTS (
    SELECT 1 FROM organizations o WHERE o.id = crm_sla_breach_log.org_id
  );

DELETE FROM crm_sla_breach_log
WHERE NOT EXISTS (
  SELECT 1 FROM organizations o WHERE o.id = crm_sla_breach_log.org_id
);
COMMIT;

-- B.1.2: quarantine orphan lead_ids
BEGIN;
INSERT INTO crm_sla_breach_log_quarantine
  SELECT *, now(), 'wave-4-phase-b-lead-orphan'
  FROM crm_sla_breach_log
  WHERE lead_id NOT IN (SELECT id FROM leads);

DELETE FROM crm_sla_breach_log
WHERE lead_id NOT IN (SELECT id FROM leads);
COMMIT;

-- B.1.3: add org_id FK
ALTER TABLE crm_sla_breach_log
  ADD CONSTRAINT crm_sla_breach_log_org_id_fk
  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;

-- B.1.4: add lead_id FK
ALTER TABLE crm_sla_breach_log
  ADD CONSTRAINT crm_sla_breach_log_lead_id_fk
  FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE;
```

**Verification:**
```sql
SELECT conname, contype FROM pg_constraint
WHERE conrelid = 'crm_sla_breach_log'::regclass AND contype = 'f';
-- must show both crm_sla_breach_log_org_id_fk and crm_sla_breach_log_lead_id_fk
```

---

## Phase C — Add `UNIQUE(org_id, id)` candidate keys on CRM parent tables

Migration file: `0208_phase_c_crm_pm_candidate_keys.ts` (CRM portion)

**Why UNIQUE constraint (not just uniqueIndex):** PostgreSQL requires a `UNIQUE` or
`PRIMARY KEY` constraint — not merely a unique index — as the referent of a
composite `FOREIGN KEY`. `uniqueIndex(...)` in Drizzle generates a unique index
only. Use `unique("name").on(...)` which generates `ADD CONSTRAINT ... UNIQUE`.

**Drizzle pattern for each parent table:**
```typescript
// Add inside the (table) => [...] array:
unique("uniq_<tablename>_org_id").on(table.orgId, table.id),
```

**Concurrency note:** For tables with > 500k rows, build the index concurrently first:
```sql
CREATE UNIQUE INDEX CONCURRENTLY uniq_<table>_org_id_idx ON <table> (org_id, id);
ALTER TABLE <table> ADD CONSTRAINT uniq_<table>_org_id UNIQUE USING INDEX uniq_<table>_org_id_idx;
```
For smaller tables (< 500k rows in a development/startup instance), the inline
`ADD CONSTRAINT` is acceptable.

The 12 CRM parent tables that must receive the candidate key before any Phase D FK
on their children can be declared:

---

### C.1 — `leads` (`crm/leads.ts`)

```typescript
// Add to (table) => [...]:
unique("uniq_leads_org_id").on(table.orgId, table.id),
```

```sql
ALTER TABLE leads ADD CONSTRAINT uniq_leads_org_id UNIQUE (org_id, id);
```

---

### C.2 — `clients` (`crm/contacts.ts`)

```typescript
unique("uniq_clients_org_id").on(table.orgId, table.id),
```

```sql
ALTER TABLE clients ADD CONSTRAINT uniq_clients_org_id UNIQUE (org_id, id);
```

---

### C.3 — `client_accounts` (`crm/contacts.ts`)

```typescript
unique("uniq_client_accounts_org_id").on(table.orgId, table.id),
```

```sql
ALTER TABLE client_accounts ADD CONSTRAINT uniq_client_accounts_org_id UNIQUE (org_id, id);
```

---

### C.4 — `branches` (`crm/contacts.ts`)

```typescript
unique("uniq_branches_org_id").on(table.orgId, table.id),
```

```sql
ALTER TABLE branches ADD CONSTRAINT uniq_branches_org_id UNIQUE (org_id, id);
```

---

### C.5 — `crm_organizations` (`crm/contacts.ts`)

```typescript
unique("uniq_crm_organizations_org_id").on(table.orgId, table.id),
```

```sql
ALTER TABLE crm_organizations ADD CONSTRAINT uniq_crm_organizations_org_id UNIQUE (org_id, id);
```

---

### C.6 — `deals` (`crm/deals.ts`)

```typescript
unique("uniq_deals_org_id").on(table.orgId, table.id),
```

```sql
ALTER TABLE deals ADD CONSTRAINT uniq_deals_org_id UNIQUE (org_id, id);
```

---

### C.7 — `crm_campaigns` (`crm/campaigns.ts`)

```typescript
unique("uniq_crm_campaigns_org_id").on(table.orgId, table.id),
```

```sql
ALTER TABLE crm_campaigns ADD CONSTRAINT uniq_crm_campaigns_org_id UNIQUE (org_id, id);
```

---

### C.8 — `invoices` (`crm/billing.ts`)

```typescript
unique("uniq_invoices_org_id").on(table.orgId, table.id),
```

```sql
ALTER TABLE invoices ADD CONSTRAINT uniq_invoices_org_id UNIQUE (org_id, id);
```

---

### C.9 — `purchase_bills` (`crm/billing.ts`)

```typescript
unique("uniq_purchase_bills_org_id").on(table.orgId, table.id),
```

```sql
ALTER TABLE purchase_bills ADD CONSTRAINT uniq_purchase_bills_org_id UNIQUE (org_id, id);
```

---

### C.10 — `support_tickets` (`crm/billing.ts`)

```typescript
unique("uniq_support_tickets_org_id").on(table.orgId, table.id),
```

```sql
ALTER TABLE support_tickets ADD CONSTRAINT uniq_support_tickets_org_id UNIQUE (org_id, id);
```

---

### C.11 — `csat_surveys` (`crm/contacts.ts`)

```typescript
unique("uniq_csat_surveys_org_id").on(table.orgId, table.id),
```

```sql
ALTER TABLE csat_surveys ADD CONSTRAINT uniq_csat_surveys_org_id UNIQUE (org_id, id);
```

---

### C.12 — `quotes` (`crm/billing.ts`)

```typescript
unique("uniq_quotes_org_id").on(table.orgId, table.id),
```

```sql
ALTER TABLE quotes ADD CONSTRAINT uniq_quotes_org_id UNIQUE (org_id, id);
```

---

### Phase C gate (run after all 12 constraints land)

```sql
SELECT conname, contype
FROM pg_constraint
WHERE conrelid = ANY(ARRAY[
  'leads', 'clients', 'client_accounts', 'branches', 'crm_organizations',
  'deals', 'crm_campaigns', 'invoices', 'purchase_bills',
  'support_tickets', 'csat_surveys', 'quotes'
]::regclass[])
  AND contype = 'u'
  AND conname LIKE '%org_id%';
-- must return 12 rows, one per table

-- Verify no duplicates exist on any candidate key:
SELECT 'leads' AS tbl, org_id, id, COUNT(*) FROM leads GROUP BY org_id, id HAVING COUNT(*) > 1
UNION ALL
SELECT 'clients', org_id, id, COUNT(*) FROM clients GROUP BY org_id, id HAVING COUNT(*) > 1
UNION ALL
SELECT 'client_accounts', org_id, id, COUNT(*) FROM client_accounts GROUP BY org_id, id HAVING COUNT(*) > 1
UNION ALL
SELECT 'branches', org_id, id, COUNT(*) FROM branches GROUP BY org_id, id HAVING COUNT(*) > 1
UNION ALL
SELECT 'crm_organizations', org_id, id, COUNT(*) FROM crm_organizations GROUP BY org_id, id HAVING COUNT(*) > 1
UNION ALL
SELECT 'deals', org_id, id, COUNT(*) FROM deals GROUP BY org_id, id HAVING COUNT(*) > 1
UNION ALL
SELECT 'crm_campaigns', org_id, id, COUNT(*) FROM crm_campaigns GROUP BY org_id, id HAVING COUNT(*) > 1
UNION ALL
SELECT 'invoices', org_id, id, COUNT(*) FROM invoices GROUP BY org_id, id HAVING COUNT(*) > 1
UNION ALL
SELECT 'purchase_bills', org_id, id, COUNT(*) FROM purchase_bills GROUP BY org_id, id HAVING COUNT(*) > 1
UNION ALL
SELECT 'support_tickets', org_id, id, COUNT(*) FROM support_tickets GROUP BY org_id, id HAVING COUNT(*) > 1
UNION ALL
SELECT 'csat_surveys', org_id, id, COUNT(*) FROM csat_surveys GROUP BY org_id, id HAVING COUNT(*) > 1
UNION ALL
SELECT 'quotes', org_id, id, COUNT(*) FROM quotes GROUP BY org_id, id HAVING COUNT(*) > 1;
-- must return 0 rows
```

---

## Phase D — Composite FK declarations

Migration file: `0212_phase_d_crm_pm_composite_fks.ts` (CRM portion)
Validate migration file: `0218_phase_d_validate_crm_pm.ts`

All FKs below are added `NOT VALID` first. The validate migration runs separately
in a low-traffic window — each `VALIDATE CONSTRAINT` holds only a
`ShareUpdateExclusiveLock` (non-blocking for reads and writes).

**Standard quarantine query (run before each NOT VALID ADD CONSTRAINT):**
```sql
-- Adapt table/column names per section below.
CREATE TABLE IF NOT EXISTS <table>_cross_tenant_quarantine (
  LIKE <table> INCLUDING ALL,
  quarantined_at timestamptz NOT NULL DEFAULT now(),
  quarantine_reason text NOT NULL
);
INSERT INTO <table>_cross_tenant_quarantine
  SELECT t.*, now(), 'wave-4-crm-composite-fk'
  FROM <table> t
  WHERE t.<parent_fk_col> IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM <parent> p
      WHERE p.org_id = t.org_id AND p.id = t.<parent_fk_col>
    );
DELETE FROM <table> t
USING <table>_cross_tenant_quarantine q
WHERE q.id = t.id;
```

---

### D1 — `leads → crm_campaigns` (nullable campaign_id)

**File:** `crm/leads.ts`

**Drizzle before (table-level constraints array):**
```typescript
(table) => [
  foreignKey({ columns: [table.mergedIntoId], foreignColumns: [table.id] }).onDelete("set null"),
  index("idx_leads_org_status_created").on(table.orgId, table.status, table.createdAt),
  index("idx_leads_assigned_to").on(table.assignedToId),
  index("idx_leads_org_assigned_status").on(table.orgId, table.assignedToId, table.status),
  index("idx_leads_source").on(table.source),
  index("idx_leads_score").on(table.score),
  index("idx_leads_deleted").on(table.deletedAt),
]
```

**After (add composite FK):**
```typescript
(table) => [
  foreignKey({ columns: [table.mergedIntoId], foreignColumns: [table.id] }).onDelete("set null"),
  foreignKey({
    name: "fk_leads_org_campaign",
    columns: [table.orgId, table.campaignId],
    foreignColumns: [crmCampaigns.orgId, crmCampaigns.id],
  }).onDelete("set null"),
  index("idx_leads_org_status_created").on(table.orgId, table.status, table.createdAt),
  index("idx_leads_assigned_to").on(table.assignedToId),
  index("idx_leads_org_assigned_status").on(table.orgId, table.assignedToId, table.status),
  index("idx_leads_source").on(table.source),
  index("idx_leads_score").on(table.score),
  index("idx_leads_deleted").on(table.deletedAt),
]
```

**Quarantine (cross-tenant campaign refs):**
```sql
INSERT INTO leads_cross_tenant_quarantine
  SELECT l.*, now(), 'wave-4-fk_leads_org_campaign'
  FROM leads l
  WHERE l.campaign_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM crm_campaigns c WHERE c.org_id = l.org_id AND c.id = l.campaign_id
    );

UPDATE leads SET campaign_id = NULL
WHERE campaign_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM crm_campaigns c WHERE c.org_id = leads.org_id AND c.id = leads.campaign_id
  );
```
*(Set NULL rather than DELETE because campaign_id is nullable and the lead itself is valid.)*

**Generated SQL:**
```sql
ALTER TABLE leads
  ADD CONSTRAINT fk_leads_org_campaign
  FOREIGN KEY (org_id, campaign_id) REFERENCES crm_campaigns(org_id, id)
  ON DELETE SET NULL
  NOT VALID;
```

**Validate SQL (in `0218_phase_d_validate_crm_pm.ts`):**
```sql
ALTER TABLE leads VALIDATE CONSTRAINT fk_leads_org_campaign;
```

---

### D2 — `lead_activities → leads`

**File:** `crm/leads.ts`

**After (add to table-level constraints):**
```typescript
foreignKey({
  name: "fk_lead_activities_org_lead",
  columns: [table.orgId, table.leadId],
  foreignColumns: [leads.orgId, leads.id],
}).onDelete("cascade"),
```

**Quarantine:**
```sql
INSERT INTO lead_activities_cross_tenant_quarantine
  SELECT la.*, now(), 'wave-4-fk_lead_activities_org_lead'
  FROM lead_activities la
  WHERE NOT EXISTS (
    SELECT 1 FROM leads l WHERE l.org_id = la.org_id AND l.id = la.lead_id
  );
DELETE FROM lead_activities la
WHERE NOT EXISTS (SELECT 1 FROM leads l WHERE l.org_id = la.org_id AND l.id = la.lead_id);
```

**Generated SQL:**
```sql
ALTER TABLE lead_activities
  ADD CONSTRAINT fk_lead_activities_org_lead
  FOREIGN KEY (org_id, lead_id) REFERENCES leads(org_id, id)
  ON DELETE CASCADE NOT VALID;
```

**Validate:** `ALTER TABLE lead_activities VALIDATE CONSTRAINT fk_lead_activities_org_lead;`

---

### D3 — `lead_notes → leads`

**File:** `crm/leads.ts`

```typescript
foreignKey({
  name: "fk_lead_notes_org_lead",
  columns: [table.orgId, table.leadId],
  foreignColumns: [leads.orgId, leads.id],
}).onDelete("cascade"),
```

```sql
ALTER TABLE lead_notes
  ADD CONSTRAINT fk_lead_notes_org_lead
  FOREIGN KEY (org_id, lead_id) REFERENCES leads(org_id, id)
  ON DELETE CASCADE NOT VALID;
```

---

### D4 — `lead_tasks → leads`

**File:** `crm/leads.ts`

```typescript
foreignKey({
  name: "fk_lead_tasks_org_lead",
  columns: [table.orgId, table.leadId],
  foreignColumns: [leads.orgId, leads.id],
}).onDelete("cascade"),
```

```sql
ALTER TABLE lead_tasks
  ADD CONSTRAINT fk_lead_tasks_org_lead
  FOREIGN KEY (org_id, lead_id) REFERENCES leads(org_id, id)
  ON DELETE CASCADE NOT VALID;
```

---

### D5 — `lead_emails → leads`

**File:** `crm/leads.ts`

```typescript
foreignKey({
  name: "fk_lead_emails_org_lead",
  columns: [table.orgId, table.leadId],
  foreignColumns: [leads.orgId, leads.id],
}).onDelete("cascade"),
```

```sql
ALTER TABLE lead_emails
  ADD CONSTRAINT fk_lead_emails_org_lead
  FOREIGN KEY (org_id, lead_id) REFERENCES leads(org_id, id)
  ON DELETE CASCADE NOT VALID;
```

---

### D6 — `clients → leads` (nullable lead_id)

**File:** `crm/contacts.ts`

```typescript
foreignKey({
  name: "fk_clients_org_lead",
  columns: [table.orgId, table.leadId],
  foreignColumns: [leads.orgId, leads.id],
}).onDelete("set null"),
```

**Quarantine (set null for cross-tenant refs, lead_id is nullable):**
```sql
UPDATE clients SET lead_id = NULL
WHERE lead_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM leads l WHERE l.org_id = clients.org_id AND l.id = clients.lead_id);
```

```sql
ALTER TABLE clients
  ADD CONSTRAINT fk_clients_org_lead
  FOREIGN KEY (org_id, lead_id) REFERENCES leads(org_id, id)
  ON DELETE SET NULL NOT VALID;
```

---

### D7 — `client_accounts → branches` (nullable branch_id)

**File:** `crm/contacts.ts`

```typescript
foreignKey({
  name: "fk_client_accounts_org_branch",
  columns: [table.orgId, table.branchId],
  foreignColumns: [branches.orgId, branches.id],
}).onDelete("set null"),
```

**Quarantine:**
```sql
UPDATE client_accounts SET branch_id = NULL
WHERE branch_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM branches b WHERE b.org_id = client_accounts.org_id AND b.id = client_accounts.branch_id);
```

```sql
ALTER TABLE client_accounts
  ADD CONSTRAINT fk_client_accounts_org_branch
  FOREIGN KEY (org_id, branch_id) REFERENCES branches(org_id, id)
  ON DELETE SET NULL NOT VALID;
```

---

### D8 — `client_accounts → leads`

**File:** `crm/contacts.ts`

**Note:** `client_accounts.lead_id` is `NOT NULL` in current schema.

```typescript
foreignKey({
  name: "fk_client_accounts_org_lead",
  columns: [table.orgId, table.leadId],
  foreignColumns: [leads.orgId, leads.id],
}).onDelete("restrict"),
```

**Quarantine (cross-tenant rows — should be zero in a healthy DB):**
```sql
INSERT INTO client_accounts_cross_tenant_quarantine
  SELECT ca.*, now(), 'wave-4-fk_client_accounts_org_lead'
  FROM client_accounts ca
  WHERE NOT EXISTS (SELECT 1 FROM leads l WHERE l.org_id = ca.org_id AND l.id = ca.lead_id);
DELETE FROM client_accounts ca
WHERE NOT EXISTS (SELECT 1 FROM leads l WHERE l.org_id = ca.org_id AND l.id = ca.lead_id);
```

```sql
ALTER TABLE client_accounts
  ADD CONSTRAINT fk_client_accounts_org_lead
  FOREIGN KEY (org_id, lead_id) REFERENCES leads(org_id, id)
  ON DELETE RESTRICT NOT VALID;
```

---

### D9 — `client_account_activities → client_accounts`

**File:** `crm/contacts.ts`

```typescript
foreignKey({
  name: "fk_client_account_activities_org_account",
  columns: [table.orgId, table.clientAccountId],
  foreignColumns: [clientAccounts.orgId, clientAccounts.id],
}).onDelete("cascade"),
```

**Quarantine:**
```sql
INSERT INTO client_account_activities_cross_tenant_quarantine
  SELECT caa.*, now(), 'wave-4-fk_caa_org_account'
  FROM client_account_activities caa
  WHERE NOT EXISTS (SELECT 1 FROM client_accounts ca WHERE ca.org_id = caa.org_id AND ca.id = caa.client_account_id);
DELETE FROM client_account_activities caa
WHERE NOT EXISTS (SELECT 1 FROM client_accounts ca WHERE ca.org_id = caa.org_id AND ca.id = caa.client_account_id);
```

```sql
ALTER TABLE client_account_activities
  ADD CONSTRAINT fk_client_account_activities_org_account
  FOREIGN KEY (org_id, client_account_id) REFERENCES client_accounts(org_id, id)
  ON DELETE CASCADE NOT VALID;
```

---

### D10 — `contacts → crm_organizations` (nullable organization_id)

**File:** `crm/contacts.ts`

```typescript
foreignKey({
  name: "fk_contacts_org_crm_org",
  columns: [table.orgId, table.organizationId],
  foreignColumns: [crmOrganizations.orgId, crmOrganizations.id],
}).onDelete("set null"),
```

**Quarantine (set null for cross-tenant refs):**
```sql
UPDATE contacts SET organization_id = NULL
WHERE organization_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM crm_organizations co WHERE co.org_id = contacts.org_id AND co.id = contacts.organization_id);
```

```sql
ALTER TABLE contacts
  ADD CONSTRAINT fk_contacts_org_crm_org
  FOREIGN KEY (org_id, organization_id) REFERENCES crm_organizations(org_id, id)
  ON DELETE SET NULL NOT VALID;
```

---

### D11 — `deals → leads` and `deals → clients` (both nullable)

**File:** `crm/deals.ts`

```typescript
foreignKey({
  name: "fk_deals_org_lead",
  columns: [table.orgId, table.leadId],
  foreignColumns: [leads.orgId, leads.id],
}).onDelete("set null"),
foreignKey({
  name: "fk_deals_org_client",
  columns: [table.orgId, table.clientId],
  foreignColumns: [clients.orgId, clients.id],
}).onDelete("set null"),
```

**Quarantine (set null for cross-tenant refs):**
```sql
UPDATE deals SET lead_id = NULL
WHERE lead_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM leads l WHERE l.org_id = deals.org_id AND l.id = deals.lead_id);

UPDATE deals SET client_id = NULL
WHERE client_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM clients c WHERE c.org_id = deals.org_id AND c.id = deals.client_id);
```

```sql
ALTER TABLE deals
  ADD CONSTRAINT fk_deals_org_lead
  FOREIGN KEY (org_id, lead_id) REFERENCES leads(org_id, id)
  ON DELETE SET NULL NOT VALID;

ALTER TABLE deals
  ADD CONSTRAINT fk_deals_org_client
  FOREIGN KEY (org_id, client_id) REFERENCES clients(org_id, id)
  ON DELETE SET NULL NOT VALID;
```

---

### D12 — `deal_activities → deals`

**File:** `crm/deals.ts`

```typescript
foreignKey({
  name: "fk_deal_activities_org_deal",
  columns: [table.orgId, table.dealId],
  foreignColumns: [deals.orgId, deals.id],
}).onDelete("cascade"),
```

```sql
ALTER TABLE deal_activities
  ADD CONSTRAINT fk_deal_activities_org_deal
  FOREIGN KEY (org_id, deal_id) REFERENCES deals(org_id, id)
  ON DELETE CASCADE NOT VALID;
```

---

### D13 — `deal_meetings → deals`

**File:** `crm/deals.ts`

```typescript
foreignKey({
  name: "fk_deal_meetings_org_deal",
  columns: [table.orgId, table.dealId],
  foreignColumns: [deals.orgId, deals.id],
}).onDelete("cascade"),
```

```sql
ALTER TABLE deal_meetings
  ADD CONSTRAINT fk_deal_meetings_org_deal
  FOREIGN KEY (org_id, deal_id) REFERENCES deals(org_id, id)
  ON DELETE CASCADE NOT VALID;
```

---

### D14 — `invoices → clients` and `invoices → projects` (both nullable)

**File:** `crm/billing.ts`

**Note:** `invoices → projects` is a cross-module FK. It requires `projects.UNIQUE(org_id, id)` from the PM Phase C work to land first. This FK should be declared here but gated on the PM candidate key existing.

```typescript
foreignKey({
  name: "fk_invoices_org_client",
  columns: [table.orgId, table.clientId],
  foreignColumns: [clients.orgId, clients.id],
}).onDelete("set null"),
// Cross-module: requires projects.UNIQUE(org_id, id) from wave-4-pm.md Phase C
foreignKey({
  name: "fk_invoices_org_project",
  columns: [table.orgId, table.projectId],
  foreignColumns: [projects.orgId, projects.id],
}).onDelete("set null"),
```

**Add to imports in billing.ts:** `projects` from `"../projects"` — already imported.
`clients` from `"./contacts"` — already imported.

**Quarantine (set null for cross-tenant refs):**
```sql
UPDATE invoices SET client_id = NULL
WHERE client_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM clients c WHERE c.org_id = invoices.org_id AND c.id = invoices.client_id);

UPDATE invoices SET project_id = NULL
WHERE project_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM projects p WHERE p.org_id = invoices.org_id AND p.id = invoices.project_id);
```

```sql
ALTER TABLE invoices
  ADD CONSTRAINT fk_invoices_org_client
  FOREIGN KEY (org_id, client_id) REFERENCES clients(org_id, id)
  ON DELETE SET NULL NOT VALID;

-- Depends on wave-4-pm.md Phase C: projects UNIQUE(org_id, id) must exist first
ALTER TABLE invoices
  ADD CONSTRAINT fk_invoices_org_project
  FOREIGN KEY (org_id, project_id) REFERENCES projects(org_id, id)
  ON DELETE SET NULL NOT VALID;
```

---

### D15 — `invoice_items → invoices`

**File:** `crm/billing.ts`

```typescript
foreignKey({
  name: "fk_invoice_items_org_invoice",
  columns: [table.orgId, table.invoiceId],
  foreignColumns: [invoices.orgId, invoices.id],
}).onDelete("cascade"),
```

```sql
ALTER TABLE invoice_items
  ADD CONSTRAINT fk_invoice_items_org_invoice
  FOREIGN KEY (org_id, invoice_id) REFERENCES invoices(org_id, id)
  ON DELETE CASCADE NOT VALID;
```

---

### D16 — `purchase_bills → clients` (nullable vendor_id)

**File:** `crm/billing.ts`

```typescript
foreignKey({
  name: "fk_purchase_bills_org_vendor",
  columns: [table.orgId, table.vendorId],
  foreignColumns: [clients.orgId, clients.id],
}).onDelete("set null"),
```

**Quarantine:**
```sql
UPDATE purchase_bills SET vendor_id = NULL
WHERE vendor_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM clients c WHERE c.org_id = purchase_bills.org_id AND c.id = purchase_bills.vendor_id);
```

```sql
ALTER TABLE purchase_bills
  ADD CONSTRAINT fk_purchase_bills_org_vendor
  FOREIGN KEY (org_id, vendor_id) REFERENCES clients(org_id, id)
  ON DELETE SET NULL NOT VALID;
```

---

### D16b — `purchase_bill_items → purchase_bills`

**File:** `crm/billing.ts`

```typescript
foreignKey({
  name: "fk_purchase_bill_items_org_bill",
  columns: [table.orgId, table.billId],
  foreignColumns: [purchaseBills.orgId, purchaseBills.id],
}).onDelete("cascade"),
```

```sql
ALTER TABLE purchase_bill_items
  ADD CONSTRAINT fk_purchase_bill_items_org_bill
  FOREIGN KEY (org_id, bill_id) REFERENCES purchase_bills(org_id, id)
  ON DELETE CASCADE NOT VALID;
```

---

### D17 — `support_tickets → clients` (nullable client_id)

**File:** `crm/billing.ts`

```typescript
foreignKey({
  name: "fk_support_tickets_org_client",
  columns: [table.orgId, table.clientId],
  foreignColumns: [clients.orgId, clients.id],
}).onDelete("set null"),
```

**Quarantine:**
```sql
UPDATE support_tickets SET client_id = NULL
WHERE client_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM clients c WHERE c.org_id = support_tickets.org_id AND c.id = support_tickets.client_id);
```

```sql
ALTER TABLE support_tickets
  ADD CONSTRAINT fk_support_tickets_org_client
  FOREIGN KEY (org_id, client_id) REFERENCES clients(org_id, id)
  ON DELETE SET NULL NOT VALID;
```

---

### D17b — `support_ticket_messages → support_tickets`

**File:** `crm/billing.ts`

```typescript
foreignKey({
  name: "fk_support_ticket_messages_org_ticket",
  columns: [table.orgId, table.ticketId],
  foreignColumns: [supportTickets.orgId, supportTickets.id],
}).onDelete("cascade"),
```

```sql
ALTER TABLE support_ticket_messages
  ADD CONSTRAINT fk_support_ticket_messages_org_ticket
  FOREIGN KEY (org_id, ticket_id) REFERENCES support_tickets(org_id, id)
  ON DELETE CASCADE NOT VALID;
```

---

### D17c — `payments → invoices`

**File:** `crm/billing.ts`

```typescript
foreignKey({
  name: "fk_payments_org_invoice",
  columns: [table.orgId, table.invoiceId],
  foreignColumns: [invoices.orgId, invoices.id],
}).onDelete("cascade"),
```

```sql
ALTER TABLE payments
  ADD CONSTRAINT fk_payments_org_invoice
  FOREIGN KEY (org_id, invoice_id) REFERENCES invoices(org_id, id)
  ON DELETE CASCADE NOT VALID;
```

---

### D17d — `vendor_payments → purchase_bills`

**File:** `crm/billing.ts`

```typescript
foreignKey({
  name: "fk_vendor_payments_org_bill",
  columns: [table.orgId, table.billId],
  foreignColumns: [purchaseBills.orgId, purchaseBills.id],
}).onDelete("cascade"),
```

```sql
ALTER TABLE vendor_payments
  ADD CONSTRAINT fk_vendor_payments_org_bill
  FOREIGN KEY (org_id, bill_id) REFERENCES purchase_bills(org_id, id)
  ON DELETE CASCADE NOT VALID;
```

---

### D17e — `quotes → deals` and `quotes → client_accounts` (both nullable)

**File:** `crm/billing.ts`

```typescript
foreignKey({
  name: "fk_quotes_org_deal",
  columns: [table.orgId, table.dealId],
  foreignColumns: [deals.orgId, deals.id],
}).onDelete("set null"),
foreignKey({
  name: "fk_quotes_org_client_account",
  columns: [table.orgId, table.clientId],
  foreignColumns: [clientAccounts.orgId, clientAccounts.id],
}).onDelete("set null"),
```

**Quarantine (set null for cross-tenant refs):**
```sql
UPDATE quotes SET deal_id = NULL
WHERE deal_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM deals d WHERE d.org_id = quotes.org_id AND d.id = quotes.deal_id);

UPDATE quotes SET client_id = NULL
WHERE client_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM client_accounts ca WHERE ca.org_id = quotes.org_id AND ca.id = quotes.client_id);
```

```sql
ALTER TABLE quotes
  ADD CONSTRAINT fk_quotes_org_deal
  FOREIGN KEY (org_id, deal_id) REFERENCES deals(org_id, id)
  ON DELETE SET NULL NOT VALID;

ALTER TABLE quotes
  ADD CONSTRAINT fk_quotes_org_client_account
  FOREIGN KEY (org_id, client_id) REFERENCES client_accounts(org_id, id)
  ON DELETE SET NULL NOT VALID;
```

---

### D17f — `quote_line_items → quotes`

**File:** `crm/billing.ts`

```typescript
foreignKey({
  name: "fk_quote_line_items_org_quote",
  columns: [table.orgId, table.quoteId],
  foreignColumns: [quotes.orgId, quotes.id],
}).onDelete("cascade"),
```

```sql
ALTER TABLE quote_line_items
  ADD CONSTRAINT fk_quote_line_items_org_quote
  FOREIGN KEY (org_id, quote_id) REFERENCES quotes(org_id, id)
  ON DELETE CASCADE NOT VALID;
```

---

### D17g — `csat_surveys → clients` (nullable client_id)

**File:** `crm/contacts.ts`

```typescript
foreignKey({
  name: "fk_csat_surveys_org_client",
  columns: [table.orgId, table.clientId],
  foreignColumns: [clients.orgId, clients.id],
}).onDelete("set null"),
```

```sql
ALTER TABLE csat_surveys
  ADD CONSTRAINT fk_csat_surveys_org_client
  FOREIGN KEY (org_id, client_id) REFERENCES clients(org_id, id)
  ON DELETE SET NULL NOT VALID;
```

---

### D17h — `csat_responses → csat_surveys`

**File:** `crm/contacts.ts`

```typescript
foreignKey({
  name: "fk_csat_responses_org_survey",
  columns: [table.orgId, table.surveyId],
  foreignColumns: [csatSurveys.orgId, csatSurveys.id],
}).onDelete("cascade"),
```

```sql
ALTER TABLE csat_responses
  ADD CONSTRAINT fk_csat_responses_org_survey
  FOREIGN KEY (org_id, survey_id) REFERENCES csat_surveys(org_id, id)
  ON DELETE CASCADE NOT VALID;
```

---

### D17i — `crm_sla_breach_log → leads` (composite, after Phase B single-col FK lands)

**File:** `crm/deals.ts`

After Phase B lands the single-column `lead_id` FK, this composite FK widens it:

```typescript
foreignKey({
  name: "fk_crm_sla_breach_log_org_lead",
  columns: [table.orgId, table.leadId],
  foreignColumns: [leads.orgId, leads.id],
}).onDelete("cascade"),
```

```sql
-- Drop the single-col FK first (Phase B added it; composite supersedes it)
ALTER TABLE crm_sla_breach_log DROP CONSTRAINT crm_sla_breach_log_lead_id_fk;

ALTER TABLE crm_sla_breach_log
  ADD CONSTRAINT fk_crm_sla_breach_log_org_lead
  FOREIGN KEY (org_id, lead_id) REFERENCES leads(org_id, id)
  ON DELETE CASCADE NOT VALID;
```

---

## Phase D — Full VALIDATE block (migration `0218_phase_d_validate_crm_pm.ts`)

Run each statement independently (each acquires `ShareUpdateExclusiveLock` only):

```sql
ALTER TABLE leads VALIDATE CONSTRAINT fk_leads_org_campaign;
ALTER TABLE lead_activities VALIDATE CONSTRAINT fk_lead_activities_org_lead;
ALTER TABLE lead_notes VALIDATE CONSTRAINT fk_lead_notes_org_lead;
ALTER TABLE lead_tasks VALIDATE CONSTRAINT fk_lead_tasks_org_lead;
ALTER TABLE lead_emails VALIDATE CONSTRAINT fk_lead_emails_org_lead;
ALTER TABLE clients VALIDATE CONSTRAINT fk_clients_org_lead;
ALTER TABLE client_accounts VALIDATE CONSTRAINT fk_client_accounts_org_branch;
ALTER TABLE client_accounts VALIDATE CONSTRAINT fk_client_accounts_org_lead;
ALTER TABLE client_account_activities VALIDATE CONSTRAINT fk_client_account_activities_org_account;
ALTER TABLE contacts VALIDATE CONSTRAINT fk_contacts_org_crm_org;
ALTER TABLE deals VALIDATE CONSTRAINT fk_deals_org_lead;
ALTER TABLE deals VALIDATE CONSTRAINT fk_deals_org_client;
ALTER TABLE deal_activities VALIDATE CONSTRAINT fk_deal_activities_org_deal;
ALTER TABLE deal_meetings VALIDATE CONSTRAINT fk_deal_meetings_org_deal;
ALTER TABLE invoices VALIDATE CONSTRAINT fk_invoices_org_client;
ALTER TABLE invoices VALIDATE CONSTRAINT fk_invoices_org_project;
ALTER TABLE invoice_items VALIDATE CONSTRAINT fk_invoice_items_org_invoice;
ALTER TABLE purchase_bills VALIDATE CONSTRAINT fk_purchase_bills_org_vendor;
ALTER TABLE purchase_bill_items VALIDATE CONSTRAINT fk_purchase_bill_items_org_bill;
ALTER TABLE vendor_payments VALIDATE CONSTRAINT fk_vendor_payments_org_bill;
ALTER TABLE payments VALIDATE CONSTRAINT fk_payments_org_invoice;
ALTER TABLE support_tickets VALIDATE CONSTRAINT fk_support_tickets_org_client;
ALTER TABLE support_ticket_messages VALIDATE CONSTRAINT fk_support_ticket_messages_org_ticket;
ALTER TABLE quotes VALIDATE CONSTRAINT fk_quotes_org_deal;
ALTER TABLE quotes VALIDATE CONSTRAINT fk_quotes_org_client_account;
ALTER TABLE quote_line_items VALIDATE CONSTRAINT fk_quote_line_items_org_quote;
ALTER TABLE csat_surveys VALIDATE CONSTRAINT fk_csat_surveys_org_client;
ALTER TABLE csat_responses VALIDATE CONSTRAINT fk_csat_responses_org_survey;
ALTER TABLE crm_sla_breach_log VALIDATE CONSTRAINT fk_crm_sla_breach_log_org_lead;
```

---

## Phase D gate — cross-tenant integrity check

Run after all VALIDATE statements complete:

```sql
-- Generic pattern; repeat for every table/FK pair above
SELECT
  'lead_activities' AS tbl,
  COUNT(*) AS cross_tenant_rows
FROM lead_activities la
WHERE NOT EXISTS (
  SELECT 1 FROM leads l WHERE l.org_id = la.org_id AND l.id = la.lead_id
)
UNION ALL
SELECT 'lead_notes', COUNT(*) FROM lead_notes ln
  WHERE NOT EXISTS (SELECT 1 FROM leads l WHERE l.org_id = ln.org_id AND l.id = ln.lead_id)
UNION ALL
SELECT 'lead_tasks', COUNT(*) FROM lead_tasks lt
  WHERE NOT EXISTS (SELECT 1 FROM leads l WHERE l.org_id = lt.org_id AND l.id = lt.lead_id)
UNION ALL
SELECT 'lead_emails', COUNT(*) FROM lead_emails le
  WHERE NOT EXISTS (SELECT 1 FROM leads l WHERE l.org_id = le.org_id AND l.id = le.lead_id)
UNION ALL
SELECT 'deal_activities', COUNT(*) FROM deal_activities da
  WHERE NOT EXISTS (SELECT 1 FROM deals d WHERE d.org_id = da.org_id AND d.id = da.deal_id)
UNION ALL
SELECT 'deal_meetings', COUNT(*) FROM deal_meetings dm
  WHERE NOT EXISTS (SELECT 1 FROM deals d WHERE d.org_id = dm.org_id AND d.id = dm.deal_id)
UNION ALL
SELECT 'invoice_items', COUNT(*) FROM invoice_items ii
  WHERE NOT EXISTS (SELECT 1 FROM invoices inv WHERE inv.org_id = ii.org_id AND inv.id = ii.invoice_id)
UNION ALL
SELECT 'purchase_bill_items', COUNT(*) FROM purchase_bill_items pbi
  WHERE NOT EXISTS (SELECT 1 FROM purchase_bills pb WHERE pb.org_id = pbi.org_id AND pb.id = pbi.bill_id)
UNION ALL
SELECT 'support_ticket_messages', COUNT(*) FROM support_ticket_messages stm
  WHERE NOT EXISTS (SELECT 1 FROM support_tickets st WHERE st.org_id = stm.org_id AND st.id = stm.ticket_id)
UNION ALL
SELECT 'quote_line_items', COUNT(*) FROM quote_line_items qli
  WHERE NOT EXISTS (SELECT 1 FROM quotes q WHERE q.org_id = qli.org_id AND q.id = qli.quote_id);
-- All rows must be 0
```

---

## Table count summary

| Phase | Tables touched | Count |
|-------|---------------|-------|
| A — add org_id | `invoice_items`, `purchase_bill_items`, `support_ticket_messages`, `quote_line_items`, `client_account_activities` | 5 |
| B — bare FK hotfix | `crm_sla_breach_log` (2 columns) | 1 table, 2 FK gaps |
| C — UNIQUE(org_id, id) candidate keys | `leads`, `clients`, `client_accounts`, `branches`, `crm_organizations`, `deals`, `crm_campaigns`, `invoices`, `purchase_bills`, `support_tickets`, `csat_surveys`, `quotes` | 12 |
| D — composite FKs declared | `leads`, `lead_activities`, `lead_notes`, `lead_tasks`, `lead_emails`, `clients`, `client_accounts` (×2), `client_account_activities`, `contacts`, `deals` (×2), `deal_activities`, `deal_meetings`, `invoices` (×2), `invoice_items`, `purchase_bills`, `purchase_bill_items`, `vendor_payments`, `payments`, `support_tickets`, `support_ticket_messages`, `quotes` (×2), `quote_line_items`, `csat_surveys`, `csat_responses`, `crm_sla_breach_log` | 24 tables, 29 composite FK declarations |
| **Total distinct CRM tables receiving changes** | | **31** |

**Cross-module dependency:** `invoices.project_id → projects(org_id, id)` (D14) requires
`projects.UNIQUE(org_id, id)` from `wave-4-pm.md` Phase C. Do not run that specific
`ALTER TABLE invoices ADD CONSTRAINT fk_invoices_org_project … NOT VALID` until the
PM Phase C gate passes.

**Wave 6 reminder:** `clients` (and `client_accounts`, `branches`) will be overlaid onto
`business_parties` in Wave 6. All FKs added here will need to be migrated at that time.
The Wave 6 spec will own that transition — this spec is Wave 4 only.
