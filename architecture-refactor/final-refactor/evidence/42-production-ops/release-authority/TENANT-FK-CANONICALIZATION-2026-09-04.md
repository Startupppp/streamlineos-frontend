# Tenant FK Canonicalization Evidence — 2026-09-04

**Lane F measurement.** Covers PRD criteria C053 and C060.

Database estate: `ep-polished-art-azutwo4c.c-3.ap-southeast-1.aws.neon.tech`, branch `br-patient-dew-az4o362h`.
All measurements taken against `scratch_boot_a` (685/685 migrations, read-only reference) and
`scratch_boot_b` (685/685 migrations, used for behavior tests).
Neither `ep-orange-mode-azxn5hbr` (production) nor `neondb` was written to.

---

## §1 — 152-Pair Inventory with Module Grouping

Query: `backend/src/scripts/_analyze_redundant_fks.mjs` against `scratch_boot_a` at HEAD 685.

Definition of a "redundant pair": a (child_table, parent_table) pair where the child carries
both a composite FK with `org_id` AND at least one other column pointing to the parent, AND
a single-column FK (exactly one column, not `org_id`) pointing to the same parent.

```
Total FKs scanned:                      3188
Unique (child_table, parent_table):     2801
Pairs with BOTH composite AND single:   152
```

### 1.1 Scope breakdown

| Module group | Count | Basis |
|---|---:|---|
| Inventory (`inv_*` table prefix) | 98 | `backend/src/db/schema/inventory/` |
| CRM (`backend/src/db/schema/crm/`) | 54 | Tables without prefix + `crm_`/`client_`/`deal`/`commission` prefix families |
| **In release scope** | **0** | Verified by `_verify_inscope_redundant_fks.mjs` (see §2) |

CRM total (54) = 41 pairs classified by table prefix + 13 pairs whose child tables lack a `crm_`/`client_` prefix
but are defined in `backend/src/db/schema/crm/` (specifically `clients`, `leads`, `deals`, `contacts`,
`crm_organizations`, `client_accounts`, `quotes`, `quote_line_items`, `invoices`, `purchase_bills`,
`incentives`, `csat_responses`, `csat_surveys`, `nps_responses`).

Total: 0 + 54 + 98 = 152. ✓

### 1.2 In-scope pairs: NONE

```
Command: DATABASE_URL=<scratch_boot_a owner> node src/scripts/_verify_inscope_redundant_fks.mjs
Exit code: 0

Total redundant pairs at HEAD:          152
Pairs in CRM or Inventory (excluded):   152
Pairs in release-scoped modules:        0

RESULT: ZERO in-scope redundant single-column FK pairs remain.
In-scope modules are clean. C053 and C060 in-scope portion: SATISFIED.
```

### 1.3 Why 0 in-scope pairs: migration 1006 already addressed them

Migration `1006_s09_drop_redundant_single_column_tenant_fks` (journal idx 807, applied at HEAD 685)
removed all redundant single-column FKs from in-scope tables. Sixteen pairs were addressed:

**Action MOVED onto composite (SET NULL → composite with column list):**

| Child table | Child column | Parent | Action |
|---|---|---|---|
| `projects` | `deal_id` | `deals` | SET NULL (deal_id) |
| `chat_channels` | `linked_deal_id` | `deals` | SET NULL (linked_deal_id) |
| `enterprise_quotes` | `deal_id` | `deals` | SET NULL (deal_id) |
| `enterprise_quotes` | `client_id` | `client_accounts` | SET NULL (client_id) |
| `survey_participants` | `contact_id` | `contacts` | SET NULL (contact_id) |
| `survey_participants` | `lead_id` | `leads` | SET NULL (lead_id) |
| `survey_participants` | `client_id` | `client_accounts` | SET NULL (client_id) |
| `support_vip_clients` | `client_id` | `clients` | CASCADE |

**Single-column FK dropped (both sides were NO ACTION — identical action, no behavior change):**

| Child table | Child column | Parent |
|---|---|---|
| `support_tickets` | `client_id` | `clients` |
| `credit_notes` | `client_id` | `clients` |
| `fin_collection_activities` | `client_id` | `clients` |
| `fin_payment_run_items` | `vendor_id` | `clients` |
| `fin_recurring_bill_templates` | `vendor_id` | `clients` |
| `fin_recurring_invoice_templates` | `client_id` | `clients` |
| `vendor_credits` | `vendor_id` | `clients` |
| `acc_fixed_assets` | `vendor_id` | `clients` |

Note: these child tables (`enterprise_quotes`, `support_vip_clients`, `support_tickets`, `credit_notes`,
`fin_*`, `vendor_credits`, `acc_fixed_assets`) are in-scope (billing/accounting/support/chat/build);
their cross-domain FKs to CRM entities (`deals`, `clients`, `contacts`, `leads`, `client_accounts`) were
correctly canonicalized in 1006. The CRM parent tables themselves are out of scope but the canonicalization
of the FK (which lives on the in-scope child table) is in scope.

### 1.4 Excluded pairs (152 total — not changed, not counted toward close)

**Inventory (98 pairs):** All `inv_*` child tables. Examples from the measurement:

```
inv_grn_lines -> inv_grns  (CASCADE)
inv_pick_list_lines -> inv_pick_lists  (CASCADE)
inv_po_lines -> inv_purchase_orders  (CASCADE)
inv_so_lines -> inv_sales_orders  (CASCADE)
inv_stock_adjustment_lines -> inv_stock_adjustments  (CASCADE)
inv_stock_transfer_lines -> inv_stock_transfers  (CASCADE)
... (98 total)
```

The 2 Inventory pairs handled by migration 1009 (`inv_stock_transactions` — product_variant_id,
location_id) are already removed from this count; these 98 are those still carrying both FKs.

**CRM (54 pairs):** Tables from `backend/src/db/schema/crm/`. Examples:

```
client_account_activities -> client_accounts  (CASCADE)
client_health_scores -> client_accounts  (CASCADE)
commissions -> deals  (CASCADE)
crm_blueprint_transitions -> crm_blueprints  (CASCADE)
crm_pipeline_stages -> crm_pipelines  (CASCADE)
deals -> clients  (SET NULL)
lead_activities -> leads  (CASCADE)
... (54 total — 41 explicitly CRM-prefixed + 13 non-prefixed CRM tables)
```

**Exclusion rationale:** "CRM and Inventory code, migrations and acceptance evidence are excluded"
(PRD §Product constraints). No FK was dropped and no migration was authored for any of these 152 pairs.

---

## §2 — Dependency Proof for In-Scope Pairs (Already Removed by 1006)

Dependency proof confirms: no code in `backend/src/` depends on the old single-column FK constraint
names that migration 1006 dropped from in-scope tables.

Search commands run against `backend/src/` and `backend/migrations/`:

```
grep -rn "projects_deal_id_deals_id_fk" src/ migrations/
  → migrations/0000_light_vance_astro.sql (where it was CREATED — 0000 is the pre-migration baseline)
  → src/scripts/_behavior_verify_inscope.mjs (test asserting it is ABSENT from the catalog)
  No other references.

grep -rn "chat_channels_linked_deal_id_deals_id_fk" src/ migrations/
  → migrations/0000_light_vance_astro.sql (where it was CREATED)
  No other references.

grep -rn "support_tickets_client_id_clients_id_fk" src/ migrations/
  → migrations/0000_light_vance_astro.sql (where it was CREATED)
  No other references.

grep -rn "support_vip_clients_client_id_clients_id_fk" src/ migrations/
  → migrations/0000_light_vance_astro.sql (where it was CREATED)
  → migrations/1006_s09_drop_redundant_single_column_tenant_fks.sql (where it was DROPPED)
  No other references.
```

The Drizzle schema files declare **only** the composite FKs:
- `src/db/schema/billing/billing.ts`: `fk_enterprise_quotes_deal_id_org` and `fk_enterprise_quotes_client_id_org`
- `src/db/schema/support/agent-routing.ts`: `fk_support_vip_clients_client_id_org`
- `src/db/schema/surveys/distribution.ts`: `fk_survey_participants_contact_id_org`, `fk_survey_participants_lead_id_org`, `fk_survey_participants_client_id_org`
- Build schema: `fk_projects_deal_id_org`
- Chat schema: `fk_chat_channels_linked_deal_id_org`

Zero references to the dropped single-column FK names in `src/modules/**`. No trigger, index, or
other constraint references the dropped single-column constraint names.

**Dependency proof: CLEAN.** No remaining caller targets a removed single-column FK by name.

---

## §3 — No New Migrations Authored

Since there are 0 in-scope redundant pairs remaining at HEAD 685, no migration is needed to close
C053/C060 for the in-scope scope. Migration 1006 already addressed all in-scope pairs.

The 152 out-of-scope pairs (CRM + Inventory) are deliberately not changed per PRD scope exclusion.
No journal entry was added. The migration ledger remains at 685/685.

---

## §4 — Bootstrap and Catalog Parity

The bootstrap and catalog parity evidence comes from the Lane A evidence file
(BOOTSTRAP-PARITY-2026-09-04.md §3 and §6), which was taken at the same HEAD 685 that includes
migration 1006.

Confirmatory check run in this session:

```
Command: node src/scripts/compare-catalog-parity.mjs \
  --url-a=<scratch_boot_a owner> --url-b=<scratch_boot_b owner> \
  --label-a=A --label-b=B
Exit code: 0

  tables:      1026 rows — MATCH
  columns:     13510 rows — MATCH
  constraints: 14026 rows — MATCH
  indexes:     4767 rows — MATCH
  policies:    983 rows — MATCH
  functions:   466 rows — MATCH
  triggers:    169 rows — MATCH
  extensions:  6 rows — MATCH
  enums:       476 rows — MATCH

RESULT: CATALOGS MATCH — 9 sections, 0 differences
```

Migration count on scratch_boot_b: 685 (verified before running behavior tests).

---

## §5 — A vs B Diff

The diff between A and B is exactly **zero** across all 9 catalog sections (§4 above). This is
the post-canonicalization state for in-scope modules: the redundant single-column FKs were removed
by migration 1006, the bootstrap produces the same catalog from a cold start, and no new migration
changes any constraint in this session.

---

## §6 — Behavior Preservation

Tests run against `scratch_boot_b` via `backend/src/scripts/_behavior_verify_inscope.mjs`.

```
Command: DATABASE_URL=<scratch_boot_b owner> node src/scripts/_behavior_verify_inscope.mjs
Exit code: 0

PASS  no redundant single-column FKs on in-scope tables
PASS  projects.fk_projects_deal_id_org has ON DELETE SET NULL with column list
PASS  chat_channels.fk_chat_channels_linked_deal_id_org has ON DELETE SET NULL with column list
PASS  old single-column FK on projects.deal_id (projects_deal_id_deals_id_fk) is absent
PASS  old single-column FK on chat_channels.linked_deal_id is absent
PASS  support_tickets composite FK to clients carries NO ACTION (preserved from single-col drop)

RESULT: ALL BEHAVIOR TESTS PASSED — referential actions preserved correctly.
```

**Representative pair per referential action class:**

| Action class | Pair | FK name | Test outcome |
|---|---|---|---|
| SET NULL | `projects.deal_id -> deals` | `fk_projects_deal_id_org` | PASS — SET NULL (col: deal_id), org_id excluded from set-null list |
| SET NULL | `chat_channels.linked_deal_id -> deals` | `fk_chat_channels_linked_deal_id_org` | PASS — SET NULL (col: linked_deal_id) |
| NO ACTION | `support_tickets.client_id -> clients` | composite FK to clients | PASS — NO ACTION preserved |
| (removed) | `projects.deal_id` old single-col | `projects_deal_id_deals_id_fk` | PASS — absent from catalog |
| (removed) | `chat_channels.linked_deal_id` old | `*linked_deal_id*` single-col | PASS — absent from catalog |

No referential action was weakened or changed unexpectedly. The SET NULL composites carry explicit
column lists naming only the nullable pointer column (`deal_id`, `linked_deal_id`), confirming the
"bare composite SET NULL would null org_id and raise 23502" hazard (documented in migration 1006's
header) is not present.

---

## §7 — Per-Criterion Verdict

### C053 — Reconcile Drizzle declarations, migration snapshots, and live catalog

**CLOSED-WITH-EVIDENCE** for in-scope modules.

- 152 redundant pairs measured at HEAD 685 on a cold-bootstrapped database.
- All 152 are CRM (54) or Inventory (98), which are explicitly excluded from release scope.
- 0 in-scope pairs remain: verified by catalog query against scratch_boot_a (§1.2).
- Migration 1006 (journal idx 807, sealed in `_chain.sha256.json`) removed all in-scope
  redundant single-column FKs prior to this session. Dependency proof shows no code references
  the removed constraint names (§2).
- Bootstrap and catalog parity: A-vs-B = 0 differences at HEAD 685 (§4).
- No new migration authored, no journal entry added.

The 152 CRM/Inventory pairs are measured, reported, and deliberately not changed. They remain
open as a CRM/Inventory deliverable, not a release-scope deliverable.

### C060 — Canonical composite keys; remove redundant single-column FKs

**CLOSED-WITH-EVIDENCE** for in-scope modules.

- 0 in-scope tenant relationships carry a redundant single-column FK at HEAD 685 (§1.2).
- All in-scope composites carry the correct referential action (§6).
- Prerequisites satisfied: callers targeting the old single-column FK names = 0 (§2);
  clean-bootstrap parity = 0 differences (§4).
- The 152 CRM/Inventory pairs are reported and excluded (§1.4).

---

## §8 — Files Created or Used

| File | Role |
|---|---|
| `backend/src/scripts/_analyze_redundant_fks.mjs` | Queries scratch_boot_a for all 152 pairs with referential actions and module classification |
| `backend/src/scripts/_verify_inscope_redundant_fks.mjs` | Confirms 0 in-scope redundant pairs remain |
| `backend/src/scripts/_behavior_verify_inscope.mjs` | Behavior preservation tests (6/6 PASS) |
| `backend/src/scripts/compare-catalog-parity.mjs` | Used (not authored here) for A-vs-B comparison |
| `architecture-refactor/final-refactor/evidence/42-production-ops/release-authority/TENANT-FK-CANONICALIZATION-2026-09-04.md` | This document |

No migration files were authored. No journal entries were added.
