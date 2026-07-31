# 04 — Target Schema Design

**Status: awaiting approval. No production code until this document is approved (brief, Phase 3 gate).**

Full column tables, index tables, access-pattern matrices and capacity estimates live in the design lane files — this document is the binding synthesis:
`_plan/S1-schema-identity-org.md` · `_plan/S2-schema-payroll-statutory.md` · `_plan/S3-schema-billing.md`

---

## 0. Governing rules

Inherited from `docs/schema-redesign/north-star.md` §0 and CLAUDE.md §19, plus this brief:

1. No JSONB/array holding a collection of individually-addressable entities.
2. Every tenant parent exposes `UNIQUE (org_id, id)`; every tenant child uses a composite FK `(org_id, parent_id)` — a cross-tenant row must be **structurally impossible**, not merely prevented in code.
3. Composite indexes lead with `org_id`. Every index names an owning query.
4. Soft-delete via `deleted_at`; lifecycle via an explicit status column. Never overload one for the other.
5. Money as integer minor units + ISO-4217 code (**staged** — see §4).
6. Date-only semantics use `date`, never `timestamp`.
7. Effective-dating is **half-open `[effective_from, effective_to)` with `'infinity'`**, never NULL, applied uniformly.
8. New status columns are `text` + CHECK. Existing `pgEnum`s stay (approved decision).
9. Statutory values are **data**, never code.

---

## 1. What already exists (do not rebuild)

The recon established that the foundation is broader than assumed. These exist and are load-bearing:

| Concern | Existing artefact |
|---|---|
| Identity → person → contract | `users` `common/auth.ts:103` → `hrPeople` `hr/core-people.ts:67` → `hrEmployments` `:103` |
| Lifecycle status | `hrEmployments.lifecycleStatus` (10 states) |
| Transition log | `hrEmploymentHistory` `hr/core-people.ts:177` |
| Effective-dated attributes | `hrEffectiveDatedChanges` `hr/core-people.ts:194` |
| Reporting lines | `hrReportingLines` `hr/core-people.ts:219` |
| Job architecture | `hrJobRoles` `hr/core-org.ts:18` |
| Payroll run engine | `payrollRuns` + state machine + snapshot replay tests |
| Credit ledger + balance row | `billing.ts:118-178`, `ai-credits-reservation.service.ts:43-88` |
| Async job table | `payroll_jobs` `payroll/entities-periods.ts:161` |

**The work is therefore constraints, conventions and configurability — not new subsystems.**

---

## 2. Identity, org and legal entity

### 2.1 New: `legalEntities`
Does not exist today; approximated by `orgUnits.kind` and by duplicated columns on `payrollEntities`.

Carries: country + state, functional currency, tax registrations (`gstin`, `pan`, `tan`, `pf_establishment_code`, `esi_code`, `pt_registration_number`, `cin`), registered address, **data-residency region**, invoice prefix + per-FY reset flag, status (`text` + CHECK), `parent_legal_entity_id` for subsidiaries, and half-open effective dating.

`payrollEntities` becomes a **child** (`payrollEntities.legalEntityId → legalEntities.id`), keeping only payroll-operational columns; its duplicated `legalName`/`pan`/`tan` are deprecated once the FK is wired.

Why it matters: it is the anchor for per-entity tax registration, per-entity currency, **per-entity invoice sequences**, and data residency — four requirements that currently have nowhere to live.

### 2.2 Effective-dating — one generic table
Keep `hrEffectiveDatedChanges` with a `changeType` discriminator rather than nine per-attribute tables: the attributes share an identical shape, a new attribute is one enum value, and batch changes are representable via `batch_id`.

Two changes:
1. `effective_to date NULL` → `NOT NULL DEFAULT 'infinity'::date` (backfill NULL → infinity first).
2. Add the non-overlap constraint (raw SQL — Drizzle has no builder):

```sql
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE hr_effective_dated_changes
  ADD CONSTRAINT excl_hr_eff_changes_no_overlap
  EXCLUDE USING gist (
    employment_id WITH =, change_type WITH =,
    daterange(effective_from, effective_to, '[)') WITH &&
  ) WHERE (status = 'applied');
```
Same shape on `hr_reporting_lines` keyed by `(employment_id, line_type)` — which also delivers **dotted-line/functional managers**, currently absent.

This makes "two salaries effective on the same day" a database error rather than a support ticket.

### 2.3 Lifecycle state machine
`CANDIDATE → PRE_JOINING → ONBOARDING → ACTIVE ⇄ PROBATION → CONFIRMED → NOTICE → EXITED → ALUMNI`, with `SUSPENDED` reachable from `ACTIVE`/`CONFIRMED`. `ALUMNI` is terminal; **re-hire is a new `hrEmployments` row**, never a status rewind. Enforced service-side (422) with a DB trigger backstop, writing `hrEmploymentHistory` in the same transaction.

---

## 3. Statutory configuration — the centrepiece

Replaces ~774 lines of TypeScript constants (`statutory-registry.ts`, `statutory-packs.ts`).

**`statutory_rule_params`** — scalars (PF rate/ceiling, ESI rate/threshold, LWF amounts, cess, HRA %).
**`statutory_rule_slabs`** — progressive bands (income tax both regimes, surcharge, per-state PT including WB's 5 bands and TN/KL half-yearly).
**`statutory_rule_audit_log`** — append-only, written by an AFTER trigger; cannot be bypassed by the application.

Every row carries `effective_from`, `effective_to`, `source_url`, `source_type`, `notes` and:

> **`verification_status` ∈ `DRAFT` · `VERIFIED` · `SUPERSEDED` · `REJECTED`, and the engine reads only `VERIFIED` rows.**

That single column turns your `[UNVERIFIED]` requirement into a schema constraint: an unreviewed rate **cannot** reach a payslip. A CA verifies rows in the product; nobody deploys code to change a rate.

**Scope:** statutory rows are national/state law, so they are **global** (`org_id IS NULL`), with optional per-org overrides resolved first (org-specific → global-state → global-national). This is a deliberate, documented exception to "every tenant table has `org_id`" — the alternative is duplicating the Indian tax code per tenant.

**Absent parameter ⇒ hard fail** (`STATUTORY_PARAM_ABSENT` blocker), never a silent default. Today an unlisted state silently receives ₹200 PT.

**Detectability:** the verified bundle-dating anomaly (§02-research §4) becomes a query — `WHERE param_key LIKE 'tds.%' AND effective_from = '2025-04-01'` — and a correction becomes an `INSERT` plus a re-run, reviewable by an accountant.

---

## 4. Payroll

- **Arrears/retro engine (new):** `payroll_retro_events` (header, affected periods, computed delta, apply-run FK) + `payroll_retro_period_deltas` (per employee × period × component: original / revised / delta in paise, `is_statutory` flag so PF arrears file separately). Arrears surface as an `ARREARS` line item linked to the retro event. This capability does not exist at all today.
- **Run immutability at the database:** triggers on `payroll_runs`, `payroll_run_employees` and `payroll_line_items` reject DML when status ∈ `{APPROVED, LOCKED, PAID, PAYSLIPS_PUBLISHED, CLOSED}`, permitting only the explicit `LOCKED→REOPENED` and `PAYSLIPS_PUBLISHED→CLOSED` transitions. This closes `setEmployeeHold` (`payroll/runs/runs.service.ts:43-63`) structurally rather than by adding one more service check. Satisfies H14.
- **Money, staged (approved decision):** *arithmetic* is fixed now — `generate.service.ts:191-194`, `payroll-posting.service.ts:22-29`, `payout-batches.service.ts:203`, `payout-csv.ts:35` move to integer paise, with `residualPaise = target_net − Σ(rounded components)` assigned to the largest earnings component and persisted for audit. *Storage* migration of ~115 `decimal` columns is **deferred** behind separate sign-off.

---

## 5. Billing

- **`plan_versions`** — immutable once any subscription pins it. Grandfathering becomes a state; a customer deal or a new tier is a data change. This is also what makes the STARTER-vs-PROFESSIONAL split (currently identical entitlements) a decision you can take later without a deploy.
- **One `subscriptions` table**, replacing the two that exist today (`shared.ts:308`, `platform.ts:92`).
- **`seat_ledger`** — append-only, one row per seat change, with nightly reconciliation against the live count. Billable = active `organizationMembers`; pending invitations **reserve** against the limit but bill on acceptance (approved decision).
- **Credits** — keep milli-credits, the balance row as serialisation point, and reserve→settle→release. Add `idempotency_key UNIQUE` on `ai_credit_transactions` to make `settle()` idempotent. **Do not add `CHECK (balance >= 0)`** — the balance is intended to go slightly negative when actual usage exceeds the reservation (CLAUDE.md §16); the `FOR UPDATE` serialisation is the correct control.
- **`platform_invoices` + `platform_invoice_sequences`** — per legal entity, per Indian financial year (`SLINV-FY2627-00001`), immutable once issued, `VOID` retains its number. All GST fields `[UNVERIFIED — accountant sign-off required]`.
- **Subscription state machine** — `TRIAL → ACTIVE → PAST_DUE → SUSPENDED → CANCELLED` with dunning. **`SUSPENDED` is read-only and never deletes**; payroll history stays readable at all times.

---

## 6. Capacity and indexing

Fast-growing tables, in order: `ai_credit_transactions`, `usage_records`, `payroll_line_items`, calculation traces, `hr_attendance` punches, `seat_ledger`, `audit_logs`. Each design lane gives row-size and index-size estimates and a partitioning trigger point (range-partition by month on the event tables once a table passes ~100M rows).

Every proposed index in the lane files names the query that owns it; no speculative indexes.

---

## 7. Migration strategy

Every change follows **expand → backfill → dual-read → cutover → contract**, and every step states its reversibility.

**Genuinely irreversible steps** (each requires explicit sign-off, a dry-run row count, and a tested restore path per H1):
- `NOT NULL` promotions after backfill (`effective_to`, `legal_entity_id`)
- `pgEnum` `ADD VALUE`
- `DROP COLUMN` in the contract phase (deprecated `payrollEntities` columns, old `org_id integer` columns, legacy money columns)
- Consolidating the two subscription tables

**Reversible** (contrary to one lane's note): adding DB triggers and EXCLUDE constraints — both can be dropped.

**Preconditions that are not code** and gate the first schema batch:
1. Confirm all 101 migrations are applied to the target Neon branch.
2. Create the `vector` extension — no migration does, yet `0016` builds an HNSW index on it, so a cold rebuild fails today.
3. Establish a rollback mechanism: 96 of 101 migrations have no down-migration, so H1 currently has no implementation.
4. Audit `org_modules` row coverage per org **before** any module gate is activated (`isModuleEnabled` fails closed).

---

## 8. Open questions carried to approval

| # | Question | Recommended default |
|---|---|---|
| S-1 | Deprecate `organizations.legalName/registrationNumber/taxNumber` in favour of `legalEntities`? | Yes — auto-create one `legalEntities` row per org at setup, then deprecate |
| S-2 | Subsidiary FK: composite `(org_id, parent_legal_entity_id)`? | Yes — decide before the CREATE TABLE, it cannot be added cheaply later |
| S-3 | Separate `payroll:config:verify` permission for the CA-proxy role? | Yes — verification must not require full payroll admin |
| S-4 | How are FY2025-26 runs with the older slab table remediated? | Manual per-org CORRECTION run after CA confirmation — never an automatic mass re-run |
| S-5 | `billing_profiles`/`affiliates` `org_id` integer → text | Migrate to text; audit the FK graph before the contract phase |
| S-6 | `ai_credits_monthly` grant currently hardcoded | Move into `plan_versions.limits_snapshot` so it is a data change |
