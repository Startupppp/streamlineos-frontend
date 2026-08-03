# S2 — Target Schema Design: Payroll & Statutory Configuration

**Date:** 2026-07-31
**Branch:** `refactoring-hrms`
**Mode:** DESIGN ONLY — no production code, no migrations run, no git.
**Sign-off required:** Every statutory rate in this document is research input only.
A qualified Indian CA/payroll professional must verify all values before go-live.

Evidence convention: `[V]` = verified from source in this session. `[L]` = from a recon lane.

---

## 0. Context — why this schema exists

`statutory-registry.ts` (`backend/src/modules/payroll/runs/lib/statutory-registry.ts`) contains two hardcoded `IndiaStatutoryBundle` objects:

- `IN_STATUTORY_2025_04` — `effectiveFrom: "2025-04-01"` — carries **pre-Budget 2025** new-regime slabs (3L/7L/10L/12L/15L, 6 bands, ₹25K rebate up to ₹7L) [V lines 101–210]
- `IN_STATUTORY_2026_04` — `effectiveFrom: "2026-04-01"` — carries **correct Budget 2025** slabs (4L/8L/12L/16L/20L/24L, 7 bands, ₹60K rebate up to ₹12L) [V lines 219–253]

Research (R4) confirms: the 7-band slab table should have taken effect **2025-04-01** (FY2025-26). It was placed in the 2026 bundle instead. Every FY2025-26 run used wrong slabs — this is the canonical example of why rates must be data. This design makes such errors **detectable as a data query** (`SELECT * FROM statutory_rule_params WHERE effective_from = '2025-04-01' AND param_key = 'tds.new_regime.slab_set'`) and **correctable without a deploy** (insert a correction row; re-run the historical period).

---

## 1. Statutory Configuration Schema (centrepiece)

### 1.1 Design philosophy

The shape of the India statutory bundle (`IndiaStatutoryBundle` at `statutory-registry.ts:88`) contains two structural kinds of rule:

- **Scalar parameters** — a single number or percentage: PF rate, ESI ceiling, LWF amounts, cess, gratuity provision %, HRA metro/non-metro %, min-wage %.
- **Progressive slab sets** — ordered bands where each band has (lower, upper, rate): income tax (new/old regime), PT in graduated states (WB 5-band, GJ 4-band, KA/AP/TS 3-band), LWF half-yearly/annual amounts with slab variation.

These live in two separate tables. A run pins the exact rows it used (snapshot mechanism, §3). A correction inserts new rows with the correct `effective_from`; the engine re-resolves and the prior snapshot shows the old values.

A third table records the **approval/verification** of each row: no row is used by the engine until it is `VERIFIED` by an authorised user (a stand-in for CA sign-off).

### 1.2 Table: `statutory_rule_params`

Stores scalar parameters: percentages, rupee amounts, boolean flags, text values (city lists, frequency codes).

| Column | Type | Constraints | Purpose |
|---|---|---|---|
| `id` | `bigint GENERATED ALWAYS AS IDENTITY` | PK | Surrogate |
| `country` | `char(2) NOT NULL` | CHECK `~'^[A-Z]{2}$'` | ISO 3166-1 alpha-2 (`IN`) |
| `state_code` | `varchar(8)` | nullable | ISO 3166-2 sub-unit (`MH`, `KA`); NULL = national |
| `param_key` | `varchar(96) NOT NULL` | see catalogue §1.5 | Dotted path: `pf.employee_rate_pct` |
| `value_type` | `text NOT NULL` | CHECK IN `('PERCENT','RUPEES','PAISE','INTEGER','BOOLEAN','TEXT','JSON')` | Discriminant |
| `value_numeric` | `numeric(20,6)` | nullable | Populated for PERCENT / RUPEES / PAISE / INTEGER |
| `value_text` | `text` | nullable | Populated for TEXT / BOOLEAN / JSON |
| `effective_from` | `date NOT NULL` | | First date this row governs |
| `effective_to` | `date` | nullable | Last date (inclusive); NULL = still in force |
| `periodicity` | `text NOT NULL DEFAULT 'MONTHLY'` | CHECK IN `('MONTHLY','HALF_YEARLY','ANNUAL','ONCE')` | How often the obligation recurs |
| `org_id` | `text` | nullable FK `organizations(id)` | NULL = global default; non-null = tenant override |
| `source_url` | `text` | | Primary/secondary citation |
| `source_type` | `text` | CHECK IN `('PRIMARY','SECONDARY','ESTIMATE')` | Confidence level |
| `notes` | `text` | | Contextual notes |
| `verification_status` | `text NOT NULL DEFAULT 'DRAFT'` | CHECK IN `('DRAFT','VERIFIED','SUPERSEDED','REJECTED')` | Engine reads only VERIFIED rows |
| `verified_by` | `text` | nullable FK `users(id)` | Who marked VERIFIED |
| `verified_at` | `timestamptz` | nullable | |
| `created_by` | `text` | nullable FK `users(id)` | |
| `created_at` | `timestamptz NOT NULL DEFAULT now()` | | |
| `updated_at` | `timestamptz NOT NULL DEFAULT now()` | | |

**Constraints:**

```sql
-- Unique per (country, state, key, effective_from, org_id)
-- COALESCE on org_id: NULL org_id shares the global unique key space
CONSTRAINT uq_stat_param_key
  UNIQUE (country, COALESCE(state_code, ''), param_key, effective_from,
          COALESCE(org_id, ''));

-- effective_to must be >= effective_from when set
CONSTRAINT chk_stat_param_dates
  CHECK (effective_to IS NULL OR effective_to >= effective_from);
```

**Indexes:**

| Index | Columns | Owning query |
|---|---|---|
| `idx_stat_param_lookup` | `(country, COALESCE(state_code,''), param_key, effective_from DESC)` | Engine resolve: given key + date, latest VERIFIED row |
| `idx_stat_param_org` | `(org_id, param_key)` | Tenant override lookup |
| `idx_stat_param_status` | `(verification_status)` | Admin: list all DRAFT/REJECTED rows needing attention |

---

### 1.3 Table: `statutory_rule_slabs`

Stores ordered progressive bands: income tax (both regimes), graduated PT, graduated surcharge.

| Column | Type | Constraints | Purpose |
|---|---|---|---|
| `id` | `bigint GENERATED ALWAYS AS IDENTITY` | PK | |
| `country` | `char(2) NOT NULL` | CHECK | |
| `state_code` | `varchar(8)` | nullable | |
| `slab_set_key` | `varchar(96) NOT NULL` | see §1.5 | e.g. `tds.new_regime.slabs`, `pt.WB.slabs` |
| `regime` | `varchar(16)` | nullable | `NEW` / `OLD` / null for non-TDS slabs |
| `slab_order` | `integer NOT NULL` | | 1-based ascending by lower_bound |
| `lower_bound_paise` | `bigint NOT NULL DEFAULT 0` | | Annual lower bound in paise (salary TDS) or rupees × 100 (PT monthly amounts × 100) |
| `upper_bound_paise` | `bigint` | nullable | NULL = open-ended (top band) |
| `rate_pct` | `numeric(8,4)` | nullable | % rate for this band |
| `fixed_amount_paise` | `bigint` | nullable | Fixed rupee deduction in paise (PT/LWF fixed-band entries) |
| `period_amount_paise` | `bigint` | nullable | Periodic obligation amount in paise (e.g. PT monthly obligation for this band) |
| `effective_from` | `date NOT NULL` | | |
| `effective_to` | `date` | nullable | |
| `periodicity` | `text NOT NULL DEFAULT 'MONTHLY'` | CHECK | |
| `org_id` | `text` | nullable FK | NULL = global |
| `source_url` | `text` | | |
| `source_type` | `text` | CHECK | |
| `notes` | `text` | | |
| `verification_status` | `text NOT NULL DEFAULT 'DRAFT'` | CHECK same as params | |
| `verified_by` | `text` | nullable FK | |
| `verified_at` | `timestamptz` | nullable | |
| `created_by` | `text` | nullable FK | |
| `created_at` | `timestamptz NOT NULL DEFAULT now()` | | |

**Constraints:**

```sql
CONSTRAINT uq_stat_slab_order
  UNIQUE (country, COALESCE(state_code,''), slab_set_key,
          COALESCE(regime,''), slab_order, effective_from,
          COALESCE(org_id,''));

CONSTRAINT chk_stat_slab_dates
  CHECK (effective_to IS NULL OR effective_to >= effective_from);

CONSTRAINT chk_stat_slab_bounds
  CHECK (upper_bound_paise IS NULL OR upper_bound_paise > lower_bound_paise);
```

**Indexes:**

| Index | Columns | Owning query |
|---|---|---|
| `idx_stat_slab_resolve` | `(country, COALESCE(state_code,''), slab_set_key, effective_from DESC)` | Full slab set resolve for a key+date |
| `idx_stat_slab_org` | `(org_id, slab_set_key)` | Tenant override |
| `idx_stat_slab_status` | `(verification_status)` | Admin review |

---

### 1.4 Table: `statutory_rule_audit_log`

Every INSERT/UPDATE to `statutory_rule_params` or `statutory_rule_slabs` writes an immutable record here.

| Column | Type | Purpose |
|---|---|---|
| `id` | `bigint GENERATED ALWAYS AS IDENTITY PK` | |
| `table_name` | `text NOT NULL` | `statutory_rule_params` or `statutory_rule_slabs` |
| `row_id` | `bigint NOT NULL` | FK to the changed row |
| `action` | `text NOT NULL` | `INSERT` / `UPDATE` / `VERIFY` / `REJECT` / `SUPERSEDE` |
| `old_data` | `jsonb` | NULL on INSERT |
| `new_data` | `jsonb NOT NULL` | Full row snapshot |
| `actor_id` | `text` | FK `users(id)` |
| `actor_role` | `text` | Role slug at time of action |
| `occurred_at` | `timestamptz NOT NULL DEFAULT now()` | |

Written by a Postgres `AFTER INSERT OR UPDATE` trigger — cannot be bypassed by the application. No `updatedAt` (append-only). Index: `(table_name, row_id, occurred_at DESC)`.

---

### 1.5 Canonical parameter-key catalogue

All keys use dotted notation. The engine resolves by exact key match.

**PF (national, state_code NULL):**
- `pf.employee_rate_pct` — PERCENT
- `pf.employer_rate_pct` — PERCENT
- `pf.monthly_wage_ceiling_paise` — PAISE
- `pf.eps_rate_pct` — PERCENT (8.33% of EPF wages up to ₹1,250/mo) — **missing from code** [V R4:21]
- `pf.edli_rate_pct` — PERCENT (0.5%, cap ₹75/mo) — **missing from code** [V R4:23]
- `pf.admin_charge_rate_pct` — PERCENT (0.5%, min ₹500/est) — **missing from code** [V R4:24]
- `pf.small_establishment_rate_pct` — PERCENT (10% for <20 employees) — **missing from code** [V R4:25]

**ESI (national, state_code NULL):**
- `esi.employee_rate_pct` — PERCENT
- `esi.employer_rate_pct` — PERCENT
- `esi.monthly_eligibility_ceiling_paise` — PAISE
- `esi.disability_ceiling_paise` — PAISE (₹25,000 for employees with disability) [V R4:43]
- `esi.contribution_period_1_start` / `...end` — TEXT (YYYY-MM-DD)
- `esi.contribution_period_2_start` / `...end` — TEXT

**PT (state-scoped, use slab table for graduated states):**
- `pt.monthly_fixed_paise` — PAISE, `state_code` required — for flat-rate states
- `pt.applicable` — BOOLEAN — explicit "this state has no PT" (Haryana=false, Delhi=false, etc.)
- Use `slab_set_key = 'pt.monthly.slabs'` in `statutory_rule_slabs` for WB/GJ/MH/KA/AP/TS/TN/GJ

**LWF (state-scoped):**
- `lwf.employee_fixed_paise` — PAISE, `state_code` required
- `lwf.employer_fixed_paise` — PAISE
- `lwf.applicable` — BOOLEAN
- `lwf.periodicity` — TEXT (MONTHLY / HALF_YEARLY / ANNUAL)

**TDS (national, regime differentiated by slab_set_key):**
- `tds.new_regime.standard_deduction_paise` — PAISE
- `tds.old_regime.standard_deduction_paise` — PAISE
- `tds.new_regime.rebate_max_paise` — PAISE
- `tds.new_regime.rebate_income_limit_paise` — PAISE
- `tds.old_regime.rebate_max_paise` / `...income_limit_paise`
- `tds.cess_pct` — PERCENT
- `tds.surcharge.new_regime.slabs` / `tds.surcharge.old_regime.slabs` — slab table entries
- `tds.new_regime.slabs` / `tds.old_regime.slabs` — slab table entries
- `tds.form.quarterly_return` — TEXT (Form 24Q / Form 138)
- `tds.form.annual_certificate` — TEXT (Form 16 / Form 130)
- `tds.hra.metro_cities` — JSON (array of city names)
- `tds.hra.metro_pct` — PERCENT
- `tds.hra.non_metro_pct` — PERCENT

**Gratuity:**
- `gratuity.provision_pct_of_basic` — PERCENT
- `gratuity.eligibility_years` — INTEGER
- `gratuity.statutory_ceiling_paise` — PAISE (₹20L ceiling, missing from code) [V R4:241]

**Min-wage:**
- `minwage.basic_da_min_pct_of_gross` — PERCENT (Labour Code 50%)

---

### 1.6 Resolution query

Given `country`, `state_code` (may be null), `param_key`, `as_of_date`, `org_id`:

```sql
-- Step 1: org-specific override
SELECT * FROM statutory_rule_params
WHERE country = $country
  AND COALESCE(state_code, '') = COALESCE($state_code, '')
  AND param_key = $param_key
  AND effective_from <= $as_of_date
  AND (effective_to IS NULL OR effective_to >= $as_of_date)
  AND org_id = $org_id
  AND verification_status = 'VERIFIED'
ORDER BY effective_from DESC
LIMIT 1;

-- Step 2: fall back to global (org_id IS NULL)
-- same query with org_id IS NULL

-- Step 3: fall back to national (state_code IS NULL)
-- same query with state_code IS NULL and org_id IS NULL
```

The engine chains steps 1 → 2 → 3. A missing-key result means "no rule applies" — the engine surface this as an exception (never silently applies zero). For PT this is correct: `pt.applicable = false` for non-PT states; an absent key is a data error, not exemption.

---

### 1.7 Worked example rows

#### `statutory_rule_params` examples

| country | state_code | param_key | value_type | value_numeric | effective_from | effective_to | source_type | verification_status |
|---|---|---|---|---|---|---|---|---|
| IN | NULL | `pf.employee_rate_pct` | PERCENT | 12.000000 | 2014-09-01 | NULL | PRIMARY | VERIFIED |
| IN | NULL | `pf.monthly_wage_ceiling_paise` | PAISE | 1500000 | 2014-09-01 | NULL | PRIMARY | VERIFIED |
| IN | NULL | `esi.employee_rate_pct` | PERCENT | 0.750000 | 2019-07-01 | NULL | PRIMARY | VERIFIED |
| IN | NULL | `esi.employer_rate_pct` | PERCENT | 3.250000 | 2019-07-01 | NULL | PRIMARY | VERIFIED |
| IN | NULL | `esi.monthly_eligibility_ceiling_paise` | PAISE | 2100000 | 2017-01-01 | NULL | PRIMARY | VERIFIED |
| IN | NULL | `gratuity.statutory_ceiling_paise` | PAISE | 200000000 | 2018-03-29 | NULL | PRIMARY | VERIFIED |
| IN | NULL | `tds.new_regime.standard_deduction_paise` | PAISE | 7500000 | 2025-04-01 | NULL | SECONDARY | VERIFIED |
| IN | NULL | `tds.new_regime.rebate_max_paise` | PAISE | 6000000 | 2025-04-01 | NULL | SECONDARY | VERIFIED |
| IN | NULL | `tds.new_regime.rebate_income_limit_paise` | PAISE | 120000000 | 2025-04-01 | NULL | SECONDARY | VERIFIED |
| IN | NULL | `tds.cess_pct` | PERCENT | 4.000000 | 2018-04-01 | NULL | PRIMARY | VERIFIED |
| IN | MH | `lwf.employee_fixed_paise` | PAISE | 2500 | 2024-03-01 | NULL | SECONDARY | VERIFIED |
| IN | MH | `lwf.employer_fixed_paise` | PAISE | 7500 | 2024-03-01 | NULL | SECONDARY | VERIFIED |
| IN | MH | `lwf.periodicity` | TEXT | NULL | 2024-03-01 | NULL | SECONDARY | VERIFIED |
| IN | HR | `pt.applicable` | BOOLEAN | NULL | 2025-04-01 | NULL | SECONDARY | VERIFIED |
| IN | PB | `pt.applicable` | BOOLEAN | NULL | 2025-04-01 | NULL | SECONDARY | VERIFIED |
| IN | WB | `pt.applicable` | BOOLEAN | NULL | 2025-04-01 | NULL | SECONDARY | VERIFIED |

For `lwf.periodicity` = HALF_YEARLY: `value_text = 'HALF_YEARLY'`.
For `pt.applicable` = false: `value_text = 'false'` (engine parses as boolean).

**Detecting the FY2025-26 slab error as data:**

```sql
SELECT param_key, effective_from, value_numeric, notes
FROM statutory_rule_params
WHERE country = 'IN'
  AND param_key LIKE 'tds.%'
  AND effective_from BETWEEN '2025-04-01' AND '2026-03-31'
ORDER BY effective_from, param_key;
```

A CA can query this, see the rebate was ₹25,000 for 2025-04, mark it `REJECTED`, insert correct ₹60,000 row, re-run affected periods.

#### `statutory_rule_slabs` examples — WB 5-band PT (monthly)

| country | state_code | slab_set_key | regime | slab_order | lower_bound_paise | upper_bound_paise | period_amount_paise | effective_from | periodicity |
|---|---|---|---|---|---|---|---|---|---|
| IN | WB | `pt.monthly.slabs` | NULL | 1 | 0 | 1000000 | 0 | 2025-04-01 | MONTHLY |
| IN | WB | `pt.monthly.slabs` | NULL | 2 | 1000001 | 1500000 | 11000 | 2025-04-01 | MONTHLY |
| IN | WB | `pt.monthly.slabs` | NULL | 3 | 1500001 | 2500000 | 13000 | 2025-04-01 | MONTHLY |
| IN | WB | `pt.monthly.slabs` | NULL | 4 | 2500001 | 4000000 | 15000 | 2025-04-01 | MONTHLY |
| IN | WB | `pt.monthly.slabs` | NULL | 5 | 4000001 | NULL | 20000 | 2025-04-01 | MONTHLY |

(Amounts in paise: ₹110 = 11000 paise, ₹130 = 13000, ₹150 = 15000, ₹200 = 20000.)

#### `statutory_rule_slabs` — FY2025-26 new-regime TDS (budget 2025 correct values, effective 2025-04-01)

| slab_set_key | regime | slab_order | lower_bound_paise | upper_bound_paise | rate_pct | effective_from |
|---|---|---|---|---|---|---|
| `tds.new_regime.slabs` | NEW | 1 | 0 | 40000000 | 0.0000 | 2025-04-01 |
| `tds.new_regime.slabs` | NEW | 2 | 40000000 | 80000000 | 5.0000 | 2025-04-01 |
| `tds.new_regime.slabs` | NEW | 3 | 80000000 | 120000000 | 10.0000 | 2025-04-01 |
| `tds.new_regime.slabs` | NEW | 4 | 120000000 | 160000000 | 15.0000 | 2025-04-01 |
| `tds.new_regime.slabs` | NEW | 5 | 160000000 | 200000000 | 20.0000 | 2025-04-01 |
| `tds.new_regime.slabs` | NEW | 6 | 200000000 | 240000000 | 25.0000 | 2025-04-01 |
| `tds.new_regime.slabs` | NEW | 7 | 240000000 | NULL | 30.0000 | 2025-04-01 |

(Bounds in paise: ₹4L annual = 40,000,000 paise.)

**Note:** The in-code `IN_STATUTORY_2025_04` bundle carries the **wrong** slabs (3L threshold, no 25% band, ₹25K rebate). These correct rows with `effective_from = 2025-04-01` supersede those constants. The old `IN_STATUTORY_2026_04` rows are seeded with `effective_from = 2026-04-01` and identical slab values — since Budget 2026 did not change slabs, the 2025-04-01 rows govern both FY2025-26 and FY2026-27 automatically. This is the exact class of error the effective-dated design makes detectable.

#### "Haryana levies no PT" — the explicit-false pattern

```sql
INSERT INTO statutory_rule_params (country, state_code, param_key, value_type, value_text, effective_from, source_url, source_type, notes, verification_status)
VALUES ('IN', 'HR', 'pt.applicable', 'BOOLEAN', 'false', '2025-04-01', 'https://...', 'SECONDARY',
  'Haryana does not levy professional tax. Code had erroneous 200.00 default.', 'DRAFT');
```

The engine: resolve `pt.applicable` for HR → `false` → skip PT deduction. Absence of this row would be a data gap, not an implicit exemption — the engine surfaces a `PT_RULE_ABSENT` warning.

---

## 2. Global vs Tenant Scope

### Decision: Global primary rows, org-level overrides

**Verdict:** Statutory rates (PF, ESI, PT, LWF, TDS slabs) are **national/state law** — they apply to every Indian employer identically. They are seeded as global rows (`org_id IS NULL`).

However, some orgs legitimately deviate:
- An employer with < 20 employees may use the 10% PF rate.
- An employer may have a TAN-specific PT arrangement with a state authority.
- Some employers voluntarily contribute higher PF (VPF on top of statutory).

For these cases, an org can insert an override row with their `org_id` set. The resolution query (§1.6) tries org-specific first, then falls back to global.

**Why `org_id` on a table of national law rows?** CLAUDE.md §19 states "every tenant-scoped table has `org_id`". The global rows break this rule by design — they are not tenant data, they are reference data. We document the exception explicitly:

> The `statutory_rule_params` and `statutory_rule_slabs` tables contain rows where `org_id IS NULL`. These are the global statutory reference rows. They are NOT a violation of the tenant-isolation principle — they are reference/catalogue rows with no owner, analogous to `modules_catalog` (`modules.ts:4`) which also has no `org_id`. Tenant-specific overrides use `org_id IS NOT NULL`. Every query from the engine resolves global rows as a fallback, not as tenant data.

**Row-Level Security implication:** No RLS policy should be applied to these tables without a `USING (org_id IS NULL OR org_id = current_setting('app.current_org_id'))` clause to allow global rows through.

---

## 3. Versioning & Auditability

### 3.1 How a rate correction works

1. A user with `payroll:config:manage` permission marks the wrong row `REJECTED` (UPDATE `verification_status = 'REJECTED'`). The audit trigger writes the change.
2. They insert a new row with the correct `effective_from` and `value_numeric`. Status starts as `DRAFT`.
3. A second user with the `VERIFIED` grant (CA proxy role) marks it `VERIFIED`.
4. The engine now resolves the corrected value for any date >= `effective_from`.
5. Any run in the affected period can be re-generated (off-cycle CORRECTION run per §6 immutability). Its new `statutory_params_snapshot` picks up the corrected rows.

### 3.2 How a run pins parameter versions

`payrollRuns.statutoryRuleVersion` (`payroll-runs.ts:25`) currently stores a single bundle identifier string (e.g. `"IN-2026.04"`). [V payroll-runs.ts:25]

**Target:** extend `payrollRunEmployees.calculationSnapshot` (JSONB, `payroll-runs.ts:92`) to include a `statutoryParamVersions` map: an array of `{ paramKey, rowId, effectiveFrom, value }` for every parameter the engine touched. This is a backwards-compatible extension of the existing JSONB field — no column change, just a new key within the JSON object.

```ts
// Extend the existing calculationSnapshot JSONB shape
interface CalculationSnapshot {
  // ... existing fields ...
  statutoryParamVersions: Array<{
    paramKey: string;
    rowId: bigint;
    effectiveFrom: string; // ISO date
    value: number | string;
  }>;
  slabVersions: Array<{
    slabSetKey: string;
    effectiveFrom: string;
    rowIds: bigint[]; // all slab rows in this set
  }>;
}
```

After a correction, a new run's snapshot will carry the corrected row IDs. The original run's snapshot is immutable and carries the original IDs — an auditor can diff the two snapshots to see exactly what changed.

This extends the **existing snapshot mechanism** already in use [V `payroll-runs.ts:91-92`; `runs/lib/__tests__/snapshot-replay.spec.ts`] without touching any table DDL.

---

## 4. Arrears / Retro Engine Schema

Currently **entirely absent** from the codebase — no `arrear` or `retro` keywords anywhere in the payroll module. [V D-payroll-engine.md:487]

### 4.1 What a retro event is

A retro event occurs when a salary revision is recorded with an `effectiveDate` in a past period for which a run has already been closed. The delta = (revised component − original component) × affected months. The delta is paid in the current period as `ARREARS`.

### 4.2 Table: `payroll_retro_events`

| Column | Type | Constraints | Purpose |
|---|---|---|---|
| `id` | `bigint GENERATED ALWAYS AS IDENTITY` | PK | |
| `org_id` | `text NOT NULL` | FK `organizations(id)` | Tenant scope |
| `user_id` | `text NOT NULL` | FK `users(id)` | Affected employee |
| `trigger_type` | `text NOT NULL` | CHECK IN `('SALARY_REVISION','POLICY_CHANGE','CORRECTION','MANUAL')` | What caused the retro |
| `trigger_source_id` | `text NOT NULL` | | FK to the triggering record (employee_salary_profile id, etc.) |
| `revised_profile_id` | `integer` | FK `employee_salary_profiles(id)` | New profile after revision |
| `original_profile_id` | `integer` | FK `employee_salary_profiles(id)` | Profile active during affected periods |
| `revision_effective_date` | `date NOT NULL` | | When the revision took effect (the past date) |
| `periods_affected` | `text[] NOT NULL` | | Array of YYYY-MM strings (e.g. `['2026-04','2026-05']`) |
| `status` | `text NOT NULL DEFAULT 'PENDING'` | CHECK IN `('PENDING','COMPUTING','COMPUTED','APPLIED','CANCELLED')` | Workflow |
| `compute_run_id` | `integer` | FK `payroll_runs(id)` | The current run that will pay the arrear |
| `computed_delta_paise` | `bigint` | | Total arrear amount in paise (set after COMPUTING) |
| `computation_snapshot` | `jsonb` | | Per-period per-component delta breakdown |
| `applied_run_id` | `integer` | FK `payroll_runs(id)` | Run where arrear was included in payslip |
| `applied_at` | `timestamptz` | | |
| `notes` | `text` | | |
| `created_by` | `text` | FK `users(id)` | |
| `created_at` | `timestamptz NOT NULL DEFAULT now()` | | |
| `updated_at` | `timestamptz NOT NULL DEFAULT now()` | | |

**Indexes:**

| Index | Columns | Purpose |
|---|---|---|
| `idx_retro_events_org_user` | `(org_id, user_id, status)` | List pending retro for an employee |
| `idx_retro_events_org_status` | `(org_id, status)` | Admin: all pending retro events |
| `idx_retro_events_compute_run` | `(compute_run_id)` | Which run is computing which retro |
| `idx_retro_events_applied_run` | `(applied_run_id)` | Which retro items appear on a given run |

**Composite unique:** `UNIQUE (org_id, user_id, trigger_source_id, revision_effective_date)` — prevents duplicate retro for the same revision.

---

### 4.3 Table: `payroll_retro_period_deltas`

One row per employee per affected period storing the component-level delta.

| Column | Type | Purpose |
|---|---|---|
| `id` | `bigint GENERATED ALWAYS AS IDENTITY PK` | |
| `org_id` | `text NOT NULL FK` | Tenant |
| `retro_event_id` | `bigint NOT NULL` | FK `payroll_retro_events(id)` |
| `user_id` | `text NOT NULL FK` | |
| `period_key` | `text NOT NULL` | YYYY-MM — the affected past period |
| `original_run_id` | `integer` | FK `payroll_runs(id)` — the closed run for this period |
| `component_code` | `text NOT NULL` | Salary component code (BASIC, HRA, PF_EMP, etc.) |
| `original_amount_paise` | `bigint NOT NULL` | What was paid in the original run |
| `revised_amount_paise` | `bigint NOT NULL` | What should have been paid |
| `delta_paise` | `bigint GENERATED ALWAYS AS (revised_amount_paise - original_amount_paise) STORED` | Arrear for this component × this period |
| `is_statutory` | `boolean NOT NULL DEFAULT false` | Whether this component is PF/ESI/PT/TDS |
| `pf_ecr_arrear` | `boolean NOT NULL DEFAULT false` | Must generate separate PF ECR |
| `created_at` | `timestamptz NOT NULL DEFAULT now()` | |

**Indexes:**

| Index | Columns |
|---|---|
| `idx_retro_deltas_event` | `(retro_event_id)` |
| `idx_retro_deltas_org_user_period` | `(org_id, user_id, period_key)` |

---

### 4.4 How arrears appear on a payslip

When a retro event is `COMPUTED` and assigned `compute_run_id`, the arrear engine:

1. Inserts a `payroll_line_item` row for the run employee with:
   - `code = 'ARREARS'`, `category = EARNING` (or `code = 'ARREARS_DEDUCTION'` if delta < 0)
   - `amount` = `ABS(delta_paise)` in paise
   - `calcExplain = { retroEventId, periods: [...], componentBreakdown: [...] }`
2. This line item feeds into the net pay computation exactly like any other earning.
3. `payslip_templates` already support arbitrary line items — no payslip template change needed.
4. The `calculationSnapshot` for the run employee includes `retroEventIds: [...]` linking to the events.

For statutory arrears (PF, ESI): the engine flags `is_statutory = true` rows and generates a separate `payroll_filing` row with `filingType = 'PF_ECR_ARREAR'`. EPFO requires a separate ECR for arrears.

### 4.5 Reconciliation to the original run

The original run's `payrollRunEmployees.calculationSnapshot` is immutable. The retro delta is reconciled as:

```
original_run.net + Σ(delta_paise for all components) = what the employee should have received
```

The corrected amount is paid through the current run. The payslip shows both the ARREARS line and its breakdown. There is no mutation of the historical run.

---

## 5. Money Representation Plan

### 5.1 The arithmetic fix (immediate — no column migration)

The per-employee calculation is already integer paise [V `D-payroll-engine.md:276`]. The bug is only in aggregation and posting.

**Columns that drive the arithmetic fix (change service code, not DDL):**

| Location | Bug | Fix |
|---|---|---|
| `generate.service.ts:191-194` | `grossTotal += parseFloat(snapshot.totals.gross)` | Change to `grossTotalPaise += snapshot.totals.grossPaise` (add paise field to snapshot) |
| `payroll-posting.service.ts:22-29` | `parseFloat(gross ?? "0")` | Pass paise integers; convert at GL boundary only |
| `payout-batches.service.ts:203` | `reduce((s,i) => s + parseFloat(i.amount), 0)` | Sum integer paise fields |
| `payout-csv.ts:35` | `parseFloat(amount).toFixed(2)` | `(amountPaise / 100).toFixed(2)` |

**New `payrollRunEmployees` fields** (service code only, no DDL change — extend the JSONB `calculationSnapshot` to include paise totals):

```ts
// Add to calculationSnapshot JSONB (no DDL change):
interface CalculationSnapshot {
  totals: {
    grossPaise: number;        // new
    deductionsPaise: number;   // new
    employerContribPaise: number; // new
    netPaise: number;          // new
    residualPaise: number;     // new — see §5.2
    // existing string fields kept for backward compat:
    gross: string;
    net: string;
    // ...
  };
}
```

Run totals stored in `payroll_runs` are summed via `SUM(CAST(calculationSnapshot->>'totals'->>'grossPaise' AS bigint))` directly in SQL — or preferably the service accumulates with `BigInt` (never `parseFloat`).

### 5.2 Residual allocation storage

After the arithmetic fix, the residual per employee is stored in `calculationSnapshot.totals.residualPaise`. The display on the payslip shows zero (it is absorbed into the largest earnings component). The audit trail in the snapshot shows it. Bounded at `(N_components - 1)` paise per employee — at most 9 paise for a 10-component payslip.

### 5.3 Columns to migrate to integer paise (DEFERRED — sign-off required)

These are deferred per binding decision (§0 of task). They are listed here so the migration sequence (§9) can reference them.

**Priority 1 — run totals (feeds GL and bank reconciliation — highest financial impact):**
- `payroll_runs.gross_total`, `deduction_total`, `employer_cost_total`, `net_total` (`payroll-runs.ts:29-32`) — currently `decimal(15,2)`
- `payroll_run_employees.gross`, `total_deductions`, `employer_contributions`, `net`, `net_payout_currency` (`payroll-runs.ts:84-88`) — currently `decimal(15,2)`
- `payroll_line_items.amount` (`payroll-runs.ts:110`) — currently `decimal(15,2)`

**Priority 2 — bank disbursement:**
- `payroll_bank_batches.total_amount` (`payroll-payout.ts:31`)
- `payroll_bank_batch_items.amount` (`payroll-payout.ts:53`)

**Priority 3 — salary profiles (feeds calc engine inputs):**
- `employee_salary_profiles.annual_ctc`, `basic_salary`, `allowances`, `deductions` (`payroll-workforce.ts:51-55`)
- `employee_salary_profile_components.amount` (`payroll-workforce.ts:77`)
- `salary_components.amount` (`payroll-workforce.ts:20`)

**Priority 4 — GL journal:**
- `payroll_journal_batch_lines.debit`, `credit` (`journal-batches.ts:116-117`)
- `payroll_journal_batches.total_debits`, `total_credits` (`journal-batches.ts:68-69`)

**Priority 5 — FnF and ancillary:**
- `fnf_settlements.*` (10 money columns, `payroll.ts:226-261`)
- `bonuses.amount` (`payroll.ts:195`) — note: `bonuses.amount_cents` (`bigint`) already exists alongside it; migrate and drop the decimal

**Deferred indefinitely (requires product decision):**
- `salary_structure_templates.*` — overlaps with Gen-2; candidate for removal rather than migration
- `expenses.amount`, `reimbursements.amount` — billing/claims domain, separate migration

### 5.4 New integer paise columns for new tables

All new tables in this design use `bigint` for paise amounts:
- `statutory_rule_params.value_numeric`: `numeric(20,6)` to accommodate large paise values without overflow
- `statutory_rule_slabs.lower_bound_paise`, `upper_bound_paise`, `period_amount_paise`, `fixed_amount_paise`: `bigint`
- `payroll_retro_events.computed_delta_paise`: `bigint`
- `payroll_retro_period_deltas.original_amount_paise`, `revised_amount_paise`, `delta_paise`: `bigint`
- Residual and immutability tables: `bigint`

---

## 6. Run Immutability Enforcement

### 6.1 Current state

DB-level enforcement: **NONE**. `canTransitionRun()` in `payroll.types.ts:319` is the only guard — bypassable by direct SQL. `setEmployeeHold()` in `runs.service.ts:43-63` has no run-status check. [V B-payroll-billing-schema.md:147; D-payroll-engine.md:173]

### 6.2 DB-level trigger design

```sql
-- Function: reject any DML on payroll_runs for locked statuses
CREATE OR REPLACE FUNCTION prevent_locked_run_mutation()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  locked_statuses text[] := ARRAY[
    'APPROVED','LOCKED','PAID','PAYSLIPS_PUBLISHED','CLOSED'
  ];
BEGIN
  IF OLD.status = ANY(locked_statuses) THEN
    -- Allow only specific status-transition columns on REOPENED path
    IF NEW.status = 'REOPENED' AND OLD.status = 'LOCKED' THEN
      -- Legitimate reopen: allow reopened_at, reopened_by, reopen_reason, status
      IF (
        NEW.month IS DISTINCT FROM OLD.month OR
        NEW.gross_total IS DISTINCT FROM OLD.gross_total OR
        NEW.net_total IS DISTINCT FROM OLD.net_total OR
        NEW.employee_count IS DISTINCT FROM OLD.employee_count
      ) THEN
        RAISE EXCEPTION 'Cannot mutate financial fields on a locked payroll run (id=%). Only status transition is permitted.', OLD.id;
      END IF;
      RETURN NEW;
    END IF;
    -- Allow CLOSED transition from PAYSLIPS_PUBLISHED
    IF NEW.status = 'CLOSED' AND OLD.status = 'PAYSLIPS_PUBLISHED' THEN
      IF NEW.gross_total IS DISTINCT FROM OLD.gross_total OR
         NEW.net_total IS DISTINCT FROM OLD.net_total THEN
        RAISE EXCEPTION 'Cannot mutate financial fields on a locked payroll run (id=%).', OLD.id;
      END IF;
      RETURN NEW;
    END IF;
    RAISE EXCEPTION 'Payroll run % is in status % and cannot be mutated.', OLD.id, OLD.status;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_prevent_locked_run_mutation
BEFORE UPDATE ON payroll_runs
FOR EACH ROW EXECUTE FUNCTION prevent_locked_run_mutation();
```

```sql
-- Function: reject DML on payroll_run_employees and payroll_line_items for locked runs
CREATE OR REPLACE FUNCTION prevent_locked_run_employee_mutation()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  run_status text;
  locked_statuses text[] := ARRAY[
    'APPROVED','LOCKED','PAID','PAYSLIPS_PUBLISHED','CLOSED'
  ];
BEGIN
  SELECT status INTO run_status FROM payroll_runs WHERE id = COALESCE(NEW.run_id, OLD.run_id);
  IF run_status = ANY(locked_statuses) THEN
    RAISE EXCEPTION
      'Cannot mutate payroll_run_employees (run_id=%, status=%). Run is locked.',
      COALESCE(NEW.run_id, OLD.run_id), run_status;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_prevent_locked_run_employee_mutation
BEFORE INSERT OR UPDATE OR DELETE ON payroll_run_employees
FOR EACH ROW EXECUTE FUNCTION prevent_locked_run_employee_mutation();

CREATE TRIGGER trg_prevent_locked_line_item_mutation
BEFORE INSERT OR UPDATE OR DELETE ON payroll_line_items
FOR EACH ROW EXECUTE FUNCTION prevent_locked_run_employee_mutation();
```

**`setEmployeeHold` gap (runs.service.ts:43-63):** The trigger above will cause `setEmployeeHold` to throw `EXCEPTION` when the run is in a locked status. This surfaces the bug as a clean DB error rather than a silent mutation. The service should catch this and return `{ ok: false, reason: 'RUN_LOCKED' }` instead of propagating an unhandled exception to the caller. A service-layer guard should be added BEFORE the DB call to pre-validate and return a typed error — but the DB trigger is the final enforcement line.

### 6.3 Run immutability row: `payroll_run_locks`

A separate, tiny table that records the moment of lock for audit purposes and supports the "locked by direct SQL" detection:

| Column | Type | Purpose |
|---|---|---|
| `run_id` | `integer NOT NULL UNIQUE` | FK `payroll_runs(id)` |
| `org_id` | `text NOT NULL` | FK `organizations(id)` |
| `status_at_lock` | `text NOT NULL` | Status when lock row was inserted |
| `locked_financial_hash` | `text NOT NULL` | SHA-256 of `(grossTotal||netTotal||employeeCount||inputSnapshotHash)` |
| `locked_at` | `timestamptz NOT NULL DEFAULT now()` | |
| `locked_by` | `text` | FK `users(id)` |

Inserted by `locking.service.ts` on `LOCKED` transition. The `locked_financial_hash` can be recomputed at any time to detect post-lock tampering. No `updatedAt` — this row is immutable itself. Protected by:

```sql
CREATE TRIGGER trg_run_locks_immutable
BEFORE UPDATE OR DELETE ON payroll_run_locks
FOR EACH ROW EXECUTE FUNCTION raise_immutable_exception();
```

---

## 7. Column + Index Tables (summary)

### New tables summary

| Table | PK type | Row estimate (10K-emp org, 36mo) | Purpose |
|---|---|---|---|
| `statutory_rule_params` | `bigint IDENTITY` | ~800 global rows; ~50 org overrides | Scalar statutory params |
| `statutory_rule_slabs` | `bigint IDENTITY` | ~400 global rows (all slabs all states) | Progressive slab sets |
| `statutory_rule_audit_log` | `bigint IDENTITY` | ~5,000/yr (rate changes) | Immutable change log |
| `payroll_retro_events` | `bigint IDENTITY` | ~200/yr per org | Retro event header |
| `payroll_retro_period_deltas` | `bigint IDENTITY` | ~2,400/yr per org | Per-period per-component delta |
| `payroll_run_locks` | (run_id unique) | 1 per run = 36 rows/36mo | Lock fingerprint |

### Changed columns (service-layer arithmetic fix, no DDL)

No DDL changes for the arithmetic fix. New paise fields are added to existing `calculationSnapshot` JSONB keys on `payrollRunEmployees`.

### New CHECK constraints (DDL)

| Table | Constraint | Definition |
|---|---|---|
| `payroll_runs` | `chk_payroll_runs_run_type` | `run_type IN ('REGULAR','BONUS','OFF_CYCLE','CORRECTION','FINAL_SETTLEMENT')` |
| `statutory_rule_params` | `chk_stat_param_value_type` | `value_type IN ('PERCENT','RUPEES','PAISE','INTEGER','BOOLEAN','TEXT','JSON')` |
| `statutory_rule_params` | `chk_stat_param_dates` | `effective_to IS NULL OR effective_to >= effective_from` |
| `statutory_rule_params` | `chk_stat_param_country` | `country ~ '^[A-Z]{2}$'` |
| `statutory_rule_slabs` | `chk_stat_slab_bounds` | `upper_bound_paise IS NULL OR upper_bound_paise > lower_bound_paise` |

---

## 8. Access-Pattern Matrix & Capacity Estimate

### 8.1 Access patterns

| Pattern | Tables | Frequency | Index |
|---|---|---|---|
| Engine resolves all params for a run | `statutory_rule_params` | Per run generation (~once/month) | `idx_stat_param_lookup` |
| Engine resolves TDS slabs | `statutory_rule_slabs` | Per-employee per run | `idx_stat_slab_resolve` |
| Admin lists DRAFT/REJECTED params needing CA | `statutory_rule_params` | Ad-hoc | `idx_stat_param_status` |
| CA verifies a new row | `statutory_rule_params`, `statutory_rule_audit_log` | Rare | no special index needed |
| Create retro event on salary revision | `payroll_retro_events` | On each past-effective revision | `idx_retro_events_org_user` |
| Compute retro deltas for a run | `payroll_retro_period_deltas`, `payroll_retro_events` | Per run with pending retro | `idx_retro_events_compute_run` |
| Payslip arrear line item generation | `payroll_retro_period_deltas` | Per employee per run with retro | `idx_retro_deltas_event` |
| Immutability check: can this run be mutated? | `payroll_runs` (trigger) | Every DML on dependent tables | Trigger (no extra index needed) |

### 8.2 Capacity estimate

**Organisation: 10,000 employees, 36 months of history**

| Table | Rows | Avg row size | Total size |
|---|---|---|---|
| `payroll_runs` (existing) | ~36 runs × say 3 entity types = 108 | 500 B | ~54 KB |
| `payroll_run_employees` (existing) | 10,000 × 36 = 360,000 | 8 KB (JSONB snapshots) | ~2.9 GB |
| `payroll_line_items` (existing) | 360,000 × 12 components avg = 4,320,000 | 256 B | ~1.1 GB |
| `payroll_tds_ytd_ledger` (existing) | 10,000 × 36 = 360,000 | 128 B | ~46 MB |
| `statutory_rule_params` (new) | ~800 global + 50 org-specific | 512 B | ~0.4 MB |
| `statutory_rule_slabs` (new) | ~400 global rows | 256 B | ~0.1 MB |
| `statutory_rule_audit_log` (new) | ~5,000/yr × 3yr = 15,000 | 1 KB | ~15 MB |
| `payroll_retro_events` (new) | ~200/yr × 3yr = 600 | 1 KB | ~0.6 MB |
| `payroll_retro_period_deltas` (new) | 600 events × 5 periods × 12 components = 36,000 | 256 B | ~9 MB |
| `payroll_run_locks` (new) | 108 rows | 256 B | ~27 KB |

**Total new table storage: < 30 MB** — negligible.

**Partitioning trigger:** `payroll_run_employees` at 360K rows × 8 KB = 2.9 GB. Partition by `org_id` range or range on `created_at` (monthly) when approaching 5M rows (approximately 40K employees × 36 months). For a 10K-employee org, no partitioning is needed in this horizon.

`payroll_line_items` at 4.3M rows × 256 B = 1.1 GB. Partition on `org_id, run_id` when exceeding 10M rows (approximately 100K employees × 36 months, 10 components).

`payroll_tds_ytd_ledger` at 360K rows is small — no partitioning needed.

---

## 9. Migration Sequence

Each step is a discrete, dependency-ordered migration. Steps marked `[IRREVERSIBLE]` have no down path.

### Phase 0 — Additive (safe, no existing data touched)

**Step 0a — Create statutory tables**

```sql
-- Migration: create statutory_rule_params
-- Migration: create statutory_rule_slabs
-- Migration: create statutory_rule_audit_log + trigger
-- Migration: create payroll_run_locks
-- Migration: create payroll_retro_events
-- Migration: create payroll_retro_period_deltas
```

Reversibility: `DROP TABLE IF EXISTS` in the down migration. No existing data touched.

**Step 0b — Seed global statutory data (DRAFT status)**

Insert all global params and slabs from the canonical sources in R4. Status = `DRAFT`. Engine does not yet read from these tables.

Reversibility: `DELETE FROM statutory_rule_params WHERE org_id IS NULL`.

**Step 0c — CA sign-off: verify seeded rows**

Not a migration — an operator action. A CA or payroll professional reviews each DRAFT row and marks it `VERIFIED`. Only after this step does the engine read from these tables.

---

### Phase 1 — Engine reads from DB (dual-read period)

**Step 1a — Service code: `StatutoryConfigService`**

New service that implements the resolution query (§1.6). Falls back to the existing TypeScript constants if no VERIFIED DB row is found (`FALLBACK_TO_CONSTANTS` flag). Both paths produce the same `IndiaStatutoryBundle` shape — no downstream changes needed.

Reversibility: flip the `FALLBACK_TO_CONSTANTS` flag to return to constants-only.

**Step 1b — Stamp `statutoryParamVersions` in calculationSnapshot**

When the engine uses a DB-sourced param, it stamps the row ID in the snapshot. When using constants-fallback, it stamps the constant name. Backwards-compatible JSONB extension.

Reversibility: stop stamping (remove the code); old snapshots with the field are ignored.

---

### Phase 2 — Arithmetic fix (service code, no DDL)

**Step 2a — Fix `generate.service.ts:191-194`**

Replace float accumulator with BigInt paise accumulation. Add `grossPaise`, `netPaise` etc. to the `totals` block of `calculationSnapshot`.

Reversibility: revert the service code.

**Step 2b — Fix `payroll-posting.service.ts:22-29`**

Pass paise integers to the GL posting service.

**Step 2c — Fix `payout-batches.service.ts:203` and `payout-csv.ts:35`**

Use integer paise for batch totals and bank file amounts.

**Step 2d — Add residual allocation in `calculation-engine.ts`**

After all component rounding, compute `residualPaise = targetNetPaise - Σ(roundedComponentPaise)`, add to the largest earnings component, store `residualPaise` in the snapshot.

---

### Phase 3 — Immutability triggers

**Step 3a** — `trg_prevent_locked_run_mutation` on `payroll_runs`

**Step 3b** — `trg_prevent_locked_run_employee_mutation` on `payroll_run_employees`, `payroll_line_items`

**Step 3c** — Populate `payroll_run_locks` for existing LOCKED/PAID/CLOSED runs

```sql
INSERT INTO payroll_run_locks (run_id, org_id, status_at_lock, locked_financial_hash, locked_at, locked_by)
SELECT id, org_id, status,
  encode(sha256(convert_to(
    concat_ws('|', gross_total::text, net_total::text, employee_count::text, input_snapshot_hash),
    'utf8')), 'hex'),
  COALESCE(locked_at, updated_at), locked_by
FROM payroll_runs
WHERE status IN ('APPROVED','LOCKED','PAID','PAYSLIPS_PUBLISHED','CLOSED')
ON CONFLICT (run_id) DO NOTHING;
```

Reversibility (before triggers): `DROP TABLE payroll_run_locks`. **[IRREVERSIBLE after triggers are wired]** — removing the triggers requires careful downtime coordination since existing locked runs have no lock entry.

---

### Phase 4 — Arrears engine

**Step 4a** — `payroll_retro_events` and `payroll_retro_period_deltas` already created in Phase 0.

**Step 4b** — `RetroEngineService`: detect past-effective salary revisions when an `employee_salary_profile` is created with `effectiveTo` in a past period for which a CLOSED run exists. Insert `payroll_retro_events` row.

**Step 4c** — Run generation reads pending retro events, calls `RetroEngineService.computeDeltas()`, inserts `payroll_retro_period_deltas`, adds ARREARS line items to the current run.

Reversibility: retro events are data; if the engine does not process them, they remain PENDING with no payslip impact.

---

### Phase 5 — Column migration to integer paise [DEFERRED — explicit sign-off required]

Expand → backfill → dual-read → cutover → contract per column group.

**5a — `payroll_line_items.amount`**: add `amount_paise bigint`, backfill `amount_paise = ROUND(amount * 100)`, serve reads from `amount_paise`, drop `amount`. `[IRREVERSIBLE on drop]`

**5b — `payroll_run_employees.{gross,total_deductions,employer_contributions,net}`**: same pattern. `[IRREVERSIBLE on drop]`

**5c — `payroll_runs.{gross_total,deduction_total,employer_cost_total,net_total}`**: same pattern. `[IRREVERSIBLE on drop]`

**5d — `employee_salary_profiles.*`**: expand → backfill → dual-read → cutover → contract. `[IRREVERSIBLE on drop]`

Each group requires: migration to add new column → service code reads both → verify parity → migration to drop old column. No group may be dropped until the previous group's reads are fully switched.

---

## 10. Open Questions

| # | Question | Recommended default | Binding decision needed from |
|---|---|---|---|
| OQ-1 | Which permission key grants `VERIFIED` status on statutory params? Should it be a dedicated `payroll:config:verify` key distinct from `payroll:config:manage`? | Yes — CA-proxy role gets `:verify`; payroll admin gets `:manage` | Product / security |
| OQ-2 | Should the engine hard-fail (throw) or soft-warn when a VERIFIED param is absent for a state? | Hard-fail with a `STATUTORY_PARAM_ABSENT` exception in the payroll exceptions table — the run surfaces a BLOCKER and cannot be approved without resolution | Architecture |
| OQ-3 | How long is the dual-read window in Phase 1 (DB params + constant fallback)? | Minimum: 2 payroll cycles after CA sign-off before disabling the fallback | Ops |
| OQ-4 | Who is authorised to INSERT a statutory param row? Any `payroll:config:manage` holder, or only platform admins? | Platform admins insert global rows; org payroll admins insert org-level overrides | Security |
| OQ-5 | What happens to existing runs with `statutoryRuleVersion = "IN-2025.04"` after the correct 2025-04-01 rows are verified? | Runs already CLOSED are not automatically reprocessed. A CORRECTION off-cycle run is triggered manually by the operator for each affected org/month | Compliance/ops |
| OQ-6 | For the retro engine: what triggers detection of a past-effective revision — a service hook on `employee_salary_profiles` INSERT, or a nightly job that scans recent revisions? | Service hook (synchronous) is preferred — nightly scan creates a window where an operator can generate a run before the retro is detected | Architecture |
| OQ-7 | Should PT slabs for half-yearly states (TN, KL) use `periodicity = 'HALF_YEARLY'` with `lower_bound_paise` representing 6-month income, or should the engine convert to a monthly equivalent? | Store half-yearly slab boundaries as-is (6-month income); engine accumulates 6 months' salary before evaluating the slab. Simpler to keep the authority's definition without conversion | Architecture |
| OQ-8 | EPS/EPF split (employer 8.33% EPS + 3.67% EPF): must this be modelled before ECR generation or can it be deferred? | Required before any ECR filing. The PF passbook and pension credit depend on the split. Classify as P1 for the filing module even if deferred from this schema sprint | Compliance |
| OQ-9 | Surcharge modelling: required before FY2026-27 TDS is correct for high earners (>₹50L income). Defer until Phase 2? | Defer but add `tds.surcharge.new_regime.slabs` rows to the statutory tables in Phase 0 so the data is ready | Product |
| OQ-10 | For `payroll_retro_period_deltas.delta_paise` as a GENERATED column — Drizzle ORM does not yet support `GENERATED ALWAYS AS ... STORED` in schema definitions. Use a regular `bigint` column populated by the service, or use a raw SQL migration? | Use a raw SQL migration for this column only; document it as not managed by Drizzle | Engineering |

---

*End of S2 — Target Schema Design: Payroll & Statutory Configuration.*
