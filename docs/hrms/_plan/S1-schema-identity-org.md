# S1 — Target Schema Design: Identity, Org Structure, Legal Entities & Effective-Dating

**Lane:** Design Lane S1  
**Date:** 2026-07-31  
**Branch:** `refactoring-hrms`  
**Status:** DESIGN ONLY — no production code written  
**Binding decisions applied:** D-47 (names follow code), D-48 (single orgUnits), D-50 (keep pgEnums, new status = text+CHECK), D-52 (legalEntities WILL be introduced)  
**Evidence convention:** `[V]` = verified against source in this session; `[L]` = cited by recon lane with citation.

---

## 0. Source facts confirmed before designing

| Fact | File:Line | Relevance |
|---|---|---|
| `hrPeople.id` is `serial` PK | `hr/core-people.ts:68` [V] | Parent PK type for composite FKs |
| `hrEmployments.id` is `serial` PK | `hr/core-people.ts:104` [V] | Referenced by history/dated-change tables |
| `hrEffectiveDatedChanges.effectiveTo date` nullable (NULL = current) | `hr/core-people.ts:202` [V] | Must change to `infinity` convention |
| `hrReportingLines.effectiveTo date` nullable (NULL = current) | `hr/core-people.ts:226` [V] | Must change to `infinity` convention |
| `hrEmployments.jobRoleId`, `jobLevelId`, `employmentTypeId` are bare integers, no FK | `hr/core-people.ts:111-113` [V] | Design adds typed tables |
| `hrEmployments` has `departmentId` + `locationId` → `orgUnits`, NO `costCenterId` | `hr/core-people.ts:110,114` [V] | Gap — add `costCenterId` |
| `hrEmployments` has NO `legalEntityId` | `hr/core-people.ts:103-135` [V] | Gap — add FK to legalEntities |
| `payrollEntities` has `legalName`, `pan`, `tan`, `pfEstablishmentCode`, `esiCode`, `ptStateCode` | `payroll/entities-periods.ts:41-65` [V] | Partial legal entity; `legalEntities` becomes canonical parent |
| `organizations.legalName`, `registrationNumber`, `taxNumber` exist as flat columns | `common/auth.ts:34-37` [V] | Org-level registration, not multi-entity; kept as org's primary identity |
| `orgUnits.kind` TypeScript union: BUSINESS_UNIT, BRANCH, DEPARTMENT, TEAM, LOCATION, COST_CENTER | `common/organization.ts:15-21` [V] | Confirmed 6-value set |
| `hrEmployeeSensitiveFields.salaryAmountCents integer` — already cents | `hr/core-people.ts:141` [V] | Correct; no change needed here |
| `hrEffectiveDatedChanges.changeType` enum covers 9 types, NOT `cost_center` | `hr/core-people.ts:43-53` [V] | Add `cost_center` to enum |
| `legalEntities` table does NOT exist anywhere in the schema | Full schema grep [V] | New table required |

---

## 1. Target ERD

```mermaid
erDiagram
    users {
        text id PK
        text email UK
        text name
    }
    organizations {
        text id PK
        text slug UK
        text currency
        int fiscal_year_start
        int owner_membership_id
        text legal_name
        text registration_number
        text tax_number
        text status
    }
    organizationMembers {
        int id PK
        text user_id FK
        text org_id FK
        bool is_owner
        text status
        UNIQUE org_id_plus_id
    }
    legalEntities {
        text id PK
        text org_id FK
        text name
        text legal_name
        text country_code
        text state_code
        text functional_currency
        text gstin
        text pan
        text tan
        text pf_establishment_code
        text esi_code
        text pt_registration_number
        text cin
        jsonb registered_address
        text data_residency_region
        text invoice_prefix
        bool invoice_fy_reset
        text status
        date effective_from
        date effective_to
        text parent_legal_entity_id FK
        text org_unit_id FK
        UNIQUE org_id_plus_id
    }
    orgUnits {
        text id PK
        text org_id FK
        text kind
        text parent_id FK
        text code
        text name
        text status
        jsonb metadata
        UNIQUE org_id_plus_kind_plus_code
    }
    orgUnitMembers {
        text id PK
        text org_id FK
        text org_unit_id FK
        text user_id FK
        text role
    }
    hrPeople {
        int id PK
        text org_id FK
        text user_id FK
        text work_email UK_per_org
        text first_name
        text last_name
        date date_of_birth
        text gender
        text nationality
        jsonb address
        jsonb emergency_contact
        timestamp deleted_at
        UNIQUE org_id_plus_id
    }
    hrJobRoles {
        int id PK
        text org_id FK
        text name
        text code
        text description
        timestamp deleted_at
        UNIQUE org_id_plus_id
        UNIQUE org_id_plus_code
    }
    hrJobLevels {
        int id PK
        text org_id FK
        text name
        text code
        int rank
        timestamp deleted_at
        UNIQUE org_id_plus_id
    }
    hrEmploymentTypes {
        int id PK
        text org_id FK
        text name
        text code
        text worker_type_hint
        timestamp deleted_at
        UNIQUE org_id_plus_id
    }
    hrEmployments {
        int id PK
        text org_id FK
        int person_id FK
        text legal_entity_id FK
        text employee_number UK_per_org
        text lifecycle_status
        text worker_type
        text department_id FK
        text location_id FK
        text cost_center_id FK
        int job_role_id FK
        int job_level_id FK
        int employment_type_id FK
        text designation
        date joining_date
        date probation_end_date
        date confirmation_date
        date last_working_day
        date exit_date
        text exit_reason
        bool is_primary
        timestamp deleted_at
        UNIQUE org_id_plus_id
    }
    hrEmployeeSensitiveFields {
        int id PK
        text org_id FK
        int employment_id FK
        int salary_amount_cents
        text salary_currency
        text salary_frequency
        jsonb bank_details
        text pan_number
        text national_id
        text passport_number
        date passport_expiry
        text medical_notes
        text bgv_status
        UNIQUE employment_id
    }
    hrEffectiveDatedChanges {
        int id PK
        text org_id FK
        int employment_id FK
        text change_type
        date effective_from
        date effective_to
        jsonb old_value
        jsonb new_value
        text status
        text approved_by FK
        UNIQUE org_id_plus_id
        EXCL no_overlap_per_employment_change_type
    }
    hrReportingLines {
        int id PK
        text org_id FK
        int employment_id FK
        int manager_employment_id FK
        text line_type
        date effective_from
        date effective_to
        UNIQUE org_id_plus_id
        EXCL no_overlap_per_employment_line_type
    }
    hrEmploymentHistory {
        int id PK
        text org_id FK
        int employment_id FK
        text from_status
        text to_status
        text reason
        date effective_date
        text created_by FK
        APPEND_ONLY true
    }
    payrollEntities {
        int id PK
        text org_id FK
        text legal_entity_id FK
        text legal_name
        text country_code
        text base_currency
        text pan
        text tan
        text pf_establishment_code
        text esi_code
        text status
        UNIQUE org_id_plus_id
    }

    users ||--o{ organizationMembers : "member of"
    organizations ||--o{ organizationMembers : "has members"
    organizations ||--o{ legalEntities : "owns (1..N)"
    organizations ||--o{ orgUnits : "has org structure"
    organizations ||--o{ hrPeople : "employs people"
    legalEntities }o--o| orgUnits : "linked to BRANCH unit"
    legalEntities }o--o| legalEntities : "subsidiary of"
    legalEntities ||--o{ payrollEntities : "governs (1..N)"
    orgUnits ||--o{ orgUnits : "has children"
    orgUnits ||--o{ orgUnitMembers : "has members"
    hrPeople ||--o{ hrEmployments : "has employments"
    hrEmployments }o--|| legalEntities : "employed by entity"
    hrEmployments }o--o| orgUnits : "in department"
    hrEmployments }o--o| orgUnits : "at location"
    hrEmployments }o--o| orgUnits : "cost center"
    hrEmployments }o--o| hrJobRoles : "has job role"
    hrEmployments }o--o| hrJobLevels : "has job level"
    hrEmployments }o--o| hrEmploymentTypes : "has employment type"
    hrEmployments ||--|| hrEmployeeSensitiveFields : "sensitive 1:1"
    hrEmployments ||--o{ hrEffectiveDatedChanges : "dated attributes"
    hrEmployments ||--o{ hrReportingLines : "reports to"
    hrEmployments ||--o{ hrEmploymentHistory : "status transitions"
```

---

## 2. `legalEntities` Column Table

### Why a separate `legalEntities` table

`organizations` already carries `legalName`, `registrationNumber`, `taxNumber` (`common/auth.ts:34-37` [V]) — these describe the **primary** entity of the org (the company itself). A multi-location Indian company may have: one HQ legal entity under Companies Act, state-wise ESI registrations, state-wise PT registrations each constituting a separate "establishment" for labour-law purposes, and potentially subsidiary entities. `payrollEntities` (`payroll/entities-periods.ts:41` [V]) today approximates this but is payroll-scoped and not the canonical identity record. `legalEntities` becomes the canonical anchor.

### `legal_entities` columns

| Column | Type | Null? | Default | FK | Note |
|---|---|---|---|---|---|
| `id` | `text` | NOT NULL | `crypto.randomUUID()` | — | UUID PK. Matches `orgUnits.id` pattern. |
| `org_id` | `text` | NOT NULL | — | `organizations.id` CASCADE | Tenant anchor. |
| `name` | `text` | NOT NULL | — | — | Trading/display name ("StreamlineOS") |
| `legal_name` | `text` | NOT NULL | — | — | Registered legal name ("StreamlineOS Solutions Pvt Ltd") |
| `country_code` | `text` | NOT NULL | `'IN'` | — | ISO 3166-1 alpha-2. |
| `state_code` | `text` | NULL | — | — | ISO 3166-2 state where registered (for IN: `MH`, `KA`, etc.). Required for PT/LWF scoping. |
| `functional_currency` | `text` | NOT NULL | `'INR'` | — | ISO 4217. Drives payroll currency and GL entries. |
| `gstin` | `text` | NULL | — | — | 15-char GST Identification Number. Validated by CHECK `gstin ~ '^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$'` |
| `pan` | `text` | NULL | — | — | 10-char Permanent Account Number. |
| `tan` | `text` | NULL | — | — | 10-char Tax Deduction and Collection Account Number. |
| `pf_establishment_code` | `text` | NULL | — | — | PF/EPF employer code from EPFO. |
| `esi_code` | `text` | NULL | — | — | ESIC employer code. |
| `pt_registration_number` | `text` | NULL | — | — | Professional Tax registration; state-specific. |
| `lwf_code` | `text` | NULL | — | — | Labour Welfare Fund registration. State-specific. |
| `cin` | `text` | NULL | — | — | 21-char Company Identification Number (MCA, for companies). |
| `llpin` | `text` | NULL | — | — | LLP Identification Number (for LLPs). |
| `udyam_number` | `text` | NULL | — | — | MSME/Udyam registration number. |
| `registered_address` | `jsonb` | NULL | — | — | `{ line1, line2, city, state, country, postalCode }`. Typed JSONB. |
| `data_residency_region` | `text` | NULL | — | — | e.g., `'IN'`, `'EU'`. Future: drives storage-routing decisions. |
| `invoice_prefix` | `text` | NOT NULL | `'INV'` | — | Prefix for customer invoice numbers issued BY this entity. |
| `invoice_fy_reset` | `boolean` | NOT NULL | `true` | — | Reset invoice counter each April 1 (Indian GST FY). Fixes F-24. |
| `invoice_series` | `text` | NOT NULL | `'DEFAULT'` | — | For multi-series numbering. Extension point. |
| `status` | `text` | NOT NULL | `'ACTIVE'` | — | CHECK IN (`'ACTIVE'`, `'INACTIVE'`, `'DISSOLVED'`, `'MERGED'`). Uses text+CHECK per D-50. |
| `effective_from` | `date` | NOT NULL | — | — | Date entity became active. Half-open range start. |
| `effective_to` | `date` | NOT NULL | `'infinity'::date` | — | `'infinity'` = currently active. Never NULL. |
| `parent_legal_entity_id` | `text` | NULL | — | `legal_entities.id` SET NULL | For subsidiary modelling. Self-referential within `org_id`. |
| `org_unit_id` | `text` | NULL | — | `org_units.id` SET NULL | Links to the BRANCH orgUnit node representing this entity in the org hierarchy. Optional. |
| `created_by` | `text` | NULL | — | `users.id` SET NULL | Audit. |
| `created_at` | `timestamptz` | NOT NULL | `now()` | — | |
| `updated_at` | `timestamptz` | NOT NULL | `now()` | — | `$onUpdate`. |
| `deleted_at` | `timestamptz` | NULL | — | — | Soft-delete. |

### Indexes on `legal_entities`

| Index | Columns | Type | Purpose |
|---|---|---|---|
| PK | `id` | btree | Identity lookup |
| `uniq_legal_entities_org_id` | `(org_id, id)` | unique btree | Composite tenant FK pattern (north-star Rule 4) |
| `idx_legal_entities_org_status` | `(org_id, status)` | btree | List active entities per org |
| `idx_legal_entities_org_country` | `(org_id, country_code)` | btree | Country-filtered entity lookup |
| `uniq_legal_entities_org_gstin` | `(org_id, gstin)` | partial unique btree WHERE `gstin IS NOT NULL` | Prevent duplicate GSTIN within org |
| `uniq_legal_entities_org_pan` | `(org_id, pan)` | partial unique btree WHERE `pan IS NOT NULL` | Prevent duplicate PAN within org |
| `excl_legal_entities_no_active_overlap` | `(org_id =, name =, daterange(effective_from, effective_to, '[)') &&)` | GIST (btree_gist) | Prevent same named entity having two active rows |

### Relation to `payrollEntities`

`payrollEntities` (`payroll/entities-periods.ts:41` [V]) is a **payroll-operations child** of `legalEntities`. It holds payroll-run-specific configuration (period setup, PF filing codes, `baseCurrency`, payroll-period state machine). It is NOT a replacement for `legalEntities`. The relationship is **child FK**: a payroll entity exists in order to run payroll ON BEHALF OF a legal entity.

**Design decision: child, not replacement, not merge.**

Justification:
- One legal entity may have multiple `payrollEntities` over time (e.g., after a PAN change or state migration) without losing legal identity continuity.
- `payrollEntities.legalName`, `pan`, `tan` duplicate `legalEntities` columns → deprecate the duplication after FK is wired. In S1 keep them for backward compatibility; mark them `@deprecated` in comments.
- `payrollEntities.pfEstablishmentCode`, `esiCode`, `ptStateCode` are payroll-specific; they stay on `payrollEntities` (they carry filing-system-specific codes that may differ from registration numbers).

**Migration path for the FK:**
1. Add `legal_entity_id text REFERENCES legal_entities(id)` NULLABLE to `payroll_entities`.
2. Backfill: for each `payrollEntities` row, create a `legalEntities` row mirroring `legalName/pan/tan/countryCode/stateCode/baseCurrency`, then set `payrollEntities.legalEntityId`.
3. Add NOT NULL constraint after full backfill and dual-read period.
4. Add composite UNIQUE `(org_id, legal_entity_id)` on `payrollEntities` (enforce one payroll entity per legal entity per org, or allow multiple with different period setups).

---

## 3. Effective-Dated Attribute Design

### Which attributes are effective-dated

| Attribute | Current location | Effective-dating strategy |
|---|---|---|
| Salary / compensation | `hrEmployeeSensitiveFields.salaryAmountCents` (current) + `hrEffectiveDatedChanges` changeType=`compensation` (history) | KEEP: generic dated-changes table for history; sensitive fields table = current snapshot |
| Designation | `hrEmployments.designation` (current) + `hrEffectiveDatedChanges` changeType=`designation` | KEEP |
| Department | `hrEmployments.departmentId` (current) + `hrEffectiveDatedChanges` changeType=`department` | KEEP |
| Manager | `hrReportingLines` (already a dated table) | KEEP — `hrReportingLines` IS the effective-dated record |
| Location | `hrEmployments.locationId` (current) + `hrEffectiveDatedChanges` changeType=`location` | KEEP |
| Cost centre | NOT on `hrEmployments` today (gap) | ADD `cost_center_id` to `hrEmployments`; ADD `cost_center` to changeType enum |
| Employment status | `hrEmployments.lifecycleStatus` (current) + `hrEmploymentHistory` (transitions) | KEEP — `hrEmploymentHistory` IS the transition log |
| Job level | `hrEmployments.jobLevelId` (current) | ADD `job_level` to changeType enum |
| Legal entity | `hrEmployments.legalEntityId` (NEW column, see §5) | ADD `legal_entity` to changeType enum; dated via `hrEffectiveDatedChanges` |

### Recommendation: One generic table (keep `hrEffectiveDatedChanges`)

**Decision: single generic table with `changeType` enum — do NOT create per-attribute tables.**

Reasoning:
1. Nine attributes share identical structure: `(employment_id, org_id, change_type, effective_from, effective_to, old_value, new_value, status, approved_by, created_by)`. Per-attribute tables would be 9+ clones with 0 structural differentiation.
2. Extending with a new attribute = add one enum value, not a new migration + table + barrel entry.
3. `old_value`/`new_value` JSONB already handles heterogeneous types correctly. The change_type discriminator gives the application the schema it needs to parse each variant.
4. A single table lets "batch change" (multiple attributes changing on the same effectiveFrom date) be represented as multiple rows with the same `effective_from` and correlated via a `batch_id` (future extension point — add nullable `batch_id uuid`).
5. `EXCLUDE USING gist` operates on `(employment_id WITH =, change_type WITH =, validity WITH &&)`, which is as tight as per-attribute tables.

Tradeoff accepted: querying "salary on 2024-01-15" requires `WHERE change_type = 'compensation' AND ...` rather than a typed column. The current snapshot is always readable from `hrEmployeeSensitiveFields.salaryAmountCents`, so historical queries are ad-hoc analytics paths, not hot paths.

### Effective-dating convention change: NULL → `'infinity'`

**Current state:** `effectiveTo date` nullable — NULL means "currently active." (`hr/core-people.ts:202` [V])

**Target:** `effectiveTo date NOT NULL DEFAULT 'infinity'::date` — `'infinity'` means "no end date." Half-open interval `[effective_from, effective_to)`.

This convention allows the `daterange` GIST index and EXCLUDE constraint to work correctly. NULL cannot participate in range comparisons.

Same change applies to `hrReportingLines.effectiveTo` (`hr/core-people.ts:226` [V]).

### EXCLUDE constraint raw SQL

Drizzle ORM has no builder for exclusion constraints. These are raw SQL migration steps.

```sql
-- ─── STEP 1: Ensure btree_gist extension exists (ONCE, before db:migrate) ───
-- This cannot be in a migration; it must be applied to the DB manually first,
-- or included in the cold-DB setup script (see migration reproducibility rule §19).
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- ─── STEP 2: hrEffectiveDatedChanges ─────────────────────────────────────────

-- 2a. Backfill: set effective_to = 'infinity' where NULL and status = 'applied'
UPDATE hr_effective_dated_changes
  SET effective_to = 'infinity'::date
  WHERE effective_to IS NULL;

-- 2b. Make column NOT NULL with default (run AFTER backfill, in same migration)
ALTER TABLE hr_effective_dated_changes
  ALTER COLUMN effective_to SET DEFAULT 'infinity'::date,
  ALTER COLUMN effective_to SET NOT NULL;

-- 2c. Add exclusion constraint (partial: only applied rows participate)
--     Prevents two APPLIED rows for the same employment + changeType from
--     having overlapping validity periods.
ALTER TABLE hr_effective_dated_changes
  ADD CONSTRAINT excl_hr_eff_changes_no_overlap
  EXCLUDE USING gist (
    employment_id WITH =,
    change_type   WITH =,
    daterange(effective_from, effective_to, '[)') WITH &&
  )
  WHERE (status = 'applied');

-- ─── STEP 3: hrReportingLines ─────────────────────────────────────────────────

-- 3a. Backfill
UPDATE hr_reporting_lines
  SET effective_to = 'infinity'::date
  WHERE effective_to IS NULL;

-- 3b. Make NOT NULL
ALTER TABLE hr_reporting_lines
  ALTER COLUMN effective_to SET DEFAULT 'infinity'::date,
  ALTER COLUMN effective_to SET NOT NULL;

-- 3c. Exclusion constraint: one primary manager line per employment at a time
ALTER TABLE hr_reporting_lines
  ADD CONSTRAINT excl_hr_reporting_lines_no_overlap
  EXCLUDE USING gist (
    employment_id WITH =,
    line_type     WITH =,
    daterange(effective_from, effective_to, '[)') WITH &&
  );

-- ─── STEP 4: legalEntities effective-dating (no overlap for same named entity) ─
-- Applied at CREATE TABLE time — see §2 column table.
-- Constraint name: excl_legal_entities_no_active_overlap
```

**Prerequisite:** `btree_gist` extension MUST exist BEFORE `db:migrate` runs. Following the cold-DB rule (`migration-reproducibility` MEMORY.md), add `CREATE EXTENSION IF NOT EXISTS btree_gist` to the cold-DB setup script alongside `vector`, `pg_trgm`, `pgcrypto`.

**Application-layer invariant:** When inserting a new `applied` row for the same `(employment_id, change_type)`, the service must first UPDATE the preceding row's `effective_to` to `new_row.effective_from` before inserting. This "close the previous period" step must be atomic with the insert (same transaction). The EXCLUDE constraint is the backstop, not the primary enforcement.

---

## 4. Lifecycle State Machine for `hrEmployments.lifecycleStatus`

### Legal transitions

`hrEmploymentLifecycleStatusEnum` at `hr/core-people.ts:19` [V]: `CANDIDATE | PRE_JOINING | ONBOARDING | ACTIVE | PROBATION | CONFIRMED | NOTICE | EXITED | ALUMNI | SUSPENDED`

| FROM \ TO | CANDIDATE | PRE_JOINING | ONBOARDING | ACTIVE | PROBATION | CONFIRMED | NOTICE | EXITED | ALUMNI | SUSPENDED |
|---|---|---|---|---|---|---|---|---|---|---|
| **CANDIDATE** | — | ✓ offer-accept | — | — | — | — | — | ✓ offer-revoke | — | — |
| **PRE_JOINING** | — | — | ✓ day-1 | — | — | — | — | ✓ before-join | — | — |
| **ONBOARDING** | — | — | — | ✓ complete | — | — | — | ✓ withdraw | — | — |
| **ACTIVE** | — | — | — | — | ✓ set-probation | ✓* skip-probation | ✓ resign/terminate | ✓ immediate | — | ✓ investigation |
| **PROBATION** | — | — | — | ✓ reset | — | ✓ pass | ✓ resign | ✓ terminate | — | — |
| **CONFIRMED** | — | — | — | — | — | — | ✓ resign/terminate | ✓ immediate | — | ✓ investigation |
| **NOTICE** | — | — | — | ✓ retract | — | ✓ retract | — | ✓ period-end | — | — |
| **EXITED** | — | — | — | — | — | — | — | — | ✓ alumni-grant | — |
| **ALUMNI** | — | — | — | — | — | — | — | — | — | — |
| **SUSPENDED** | — | — | — | ✓ lift | — | — | ✓ terminate | ✓ immediate | — | — |

`✓*` = requires justification field (admin override).  
**ALUMNI** is terminal: no forward transitions.

**Transitions NOT permitted (representative):**
- `CANDIDATE → ACTIVE` (must pass through PRE_JOINING + ONBOARDING)
- `ACTIVE → ALUMNI` (must EXIT first)
- `EXITED → ACTIVE` (a re-hire creates a NEW `hrEmployments` row, not a status rollback)
- Any `ALUMNI → *`

### Where it is enforced

| Layer | Mechanism | Rationale |
|---|---|---|
| **Service layer (primary)** | `EmploymentLifecycleService.assertValidTransition(from, to)` throws `UnprocessableEntityException` (422) if transition not in the allowed-transitions map. Called by every method that mutates `lifecycleStatus`. | Fast, typesafe, delivers a clear error message. Must be the authoritative check. |
| **DB trigger (backstop)** | `BEFORE UPDATE ON hr_employments` trigger checks `NEW.lifecycle_status` against allowed transitions for `OLD.lifecycle_status`. Raises `P0001` if invalid. | Catches any bypass of the service layer (direct DB writes, migrations, future service). |
| **DB CHECK** | NOT USED for transitions (a CHECK cannot reference the old row value without a trigger). Used only for valid-value assertion: `CHECK (lifecycle_status IN ('CANDIDATE', ...))` — handled by the pgEnum. | pgEnum already enforces valid values. |

### Transition-event row

Every transition writes to `hrEmploymentHistory` in the **same transaction** as the `lifecycleStatus` UPDATE:

```sql
-- Within the service transaction:
UPDATE hr_employments SET lifecycle_status = $toStatus WHERE id = $empId AND org_id = $orgId;
INSERT INTO hr_employment_history
  (org_id, employment_id, from_status, to_status, reason, notes, effective_date, created_by)
  VALUES ($orgId, $empId, $fromStatus, $toStatus, $reason, $notes, $effectiveDate, $actorUserId);
```

The `hrEmploymentHistory` table is append-only (no UPDATE, no DELETE). The service enforces this; a DB trigger can add the backstop (`BEFORE UPDATE OR DELETE ON hr_employment_history RAISE EXCEPTION`).

---

## 5. Column Tables

### 5a. New table: `legalEntities` (see §2 for full spec)

Summary: 25 columns. UUID text PK. Composite `UNIQUE (org_id, id)`. 3 partial unique indexes (gstin, pan). 1 GIST exclusion constraint. Status via text+CHECK.

### 5b. Changed table: `hrEmployments` — columns added

| Column | Type | Null? | Default | FK | Note |
|---|---|---|---|---|---|
| `legal_entity_id` | `text` | NULL → NOT NULL after backfill | — | `legal_entities.id` SET NULL | Which legal entity this employment contract is with. NULL only during migration window. |
| `cost_center_id` | `text` | NULL | — | `org_units.id` SET NULL | FK to COST_CENTER kind org unit. Nullable (not all orgs use cost centres). |
| `job_role_id` | `integer` | NULL | — | `hr_job_roles.id` SET NULL | **Replaces** bare integer `jobRoleId` (no FK today). Service must migrate existing int values. |
| `job_level_id` | `integer` | NULL | — | `hr_job_levels.id` SET NULL | **Replaces** bare integer `jobLevelId`. |
| `employment_type_id` | `integer` | NULL | — | `hr_employment_types.id` SET NULL | **Replaces** bare integer `employmentTypeId`. |

Note: `jobRoleId`, `jobLevelId`, `employmentTypeId` already exist as columns but have no FK constraint (`hr/core-people.ts:111-113` [V]). The migration adds the FK constraint after seeding `hrJobRoles`, `hrJobLevels`, `hrEmploymentTypes` tables with existing values. The column names do not change.

### 5c. Changed table: `hrEffectiveDatedChanges` — columns changed + enum extended

| Column | Change | From | To |
|---|---|---|---|
| `effective_to` | NULL → NOT NULL with default | `date NULL` (NULL = current) | `date NOT NULL DEFAULT 'infinity'::date` |
| `change_type` enum | ADD value | 9 values | 11 values: + `cost_center` + `job_level` + `legal_entity` |

### 5d. Changed table: `hrReportingLines` — columns changed

| Column | Change | From | To |
|---|---|---|---|
| `effective_to` | NULL → NOT NULL with default | `date NULL` (NULL = current) | `date NOT NULL DEFAULT 'infinity'::date` |

### 5e. New table: `hrJobRoles`

| Column | Type | Null? | Default | FK | Note |
|---|---|---|---|---|---|
| `id` | `serial` | NOT NULL | auto | — | PK. Matches `hrEmployments.jobRoleId integer` type. |
| `org_id` | `text` | NOT NULL | — | `organizations.id` CASCADE | |
| `name` | `text` | NOT NULL | — | — | Display name (e.g., "Senior Software Engineer") |
| `code` | `text` | NOT NULL | — | — | Short code (e.g., "SSE"). |
| `description` | `text` | NULL | — | — | |
| `deleted_at` | `timestamptz` | NULL | — | — | Soft-delete. |
| `created_at` | `timestamptz` | NOT NULL | `now()` | — | |
| `updated_at` | `timestamptz` | NOT NULL | `now()` | — | |
| UNIQUE | `(org_id, id)` | — | — | — | Composite tenant FK. |
| UNIQUE | `(org_id, code)` | — | — | — | Code is unique per org. |

### 5f. New table: `hrJobLevels`

| Column | Type | Null? | Default | FK | Note |
|---|---|---|---|---|---|
| `id` | `serial` | NOT NULL | auto | — | PK. |
| `org_id` | `text` | NOT NULL | — | `organizations.id` CASCADE | |
| `name` | `text` | NOT NULL | — | — | e.g., "L4 — Senior" |
| `code` | `text` | NOT NULL | — | — | e.g., "L4" |
| `rank` | `integer` | NOT NULL | — | — | Numeric rank for ordering (lower = junior). |
| `deleted_at` | `timestamptz` | NULL | — | — | |
| `created_at` | `timestamptz` | NOT NULL | `now()` | — | |
| `updated_at` | `timestamptz` | NOT NULL | `now()` | — | |
| UNIQUE | `(org_id, id)` | — | — | — | |
| UNIQUE | `(org_id, code)` | — | — | — | |

### 5g. New table: `hrEmploymentTypes`

| Column | Type | Null? | Default | FK | Note |
|---|---|---|---|---|---|
| `id` | `serial` | NOT NULL | auto | — | PK. |
| `org_id` | `text` | NOT NULL | — | `organizations.id` CASCADE | |
| `name` | `text` | NOT NULL | — | — | e.g., "Full-Time Permanent" |
| `code` | `text` | NOT NULL | — | — | e.g., "FTP" |
| `worker_type_hint` | `text` | NULL | — | — | Informational mapping to `hrWorkerTypeEnum` value for UI display. |
| `deleted_at` | `timestamptz` | NULL | — | — | |
| `created_at` | `timestamptz` | NOT NULL | `now()` | — | |
| `updated_at` | `timestamptz` | NOT NULL | `now()` | — | |
| UNIQUE | `(org_id, id)` | — | — | — | |
| UNIQUE | `(org_id, code)` | — | — | — | |

### 5h. Changed table: `payrollEntities` — columns added

| Column | Type | Null? | Default | FK | Note |
|---|---|---|---|---|---|
| `legal_entity_id` | `text` | NULL (initially) | — | `legal_entities.id` SET NULL | FK to the canonical legal entity. Made NOT NULL after backfill. |

Deprecated columns (kept for backward compat, removed in a later wave): `legalName`, `pan`, `tan` — these duplicate `legalEntities` once the FK is in place.

---

## 6. Index Tables

### 6a. `legal_entities` indexes

| Index | Columns | Type | Owning query |
|---|---|---|---|
| PK | `(id)` | btree | `LegalEntityService.findById()` |
| `uniq_legal_entities_org_id` | `(org_id, id)` UNIQUE | btree | Composite FK joins from `payrollEntities`, `hrEmployments` |
| `idx_legal_entities_org_status` | `(org_id, status)` | btree | `LegalEntityService.listByOrg()` — filter ACTIVE |
| `idx_legal_entities_org_country` | `(org_id, country_code)` | btree | Multi-country entity filtering |
| `uniq_legal_entities_org_gstin` | `(org_id, gstin)` PARTIAL WHERE `gstin IS NOT NULL` | btree | Duplicate GSTIN prevention on insert |
| `uniq_legal_entities_org_pan` | `(org_id, pan)` PARTIAL WHERE `pan IS NOT NULL` | btree | Duplicate PAN prevention on insert |
| `excl_legal_entities_no_active_overlap` | `(org_id, name, daterange(effective_from, effective_to))` | GIST | Prevent overlapping active entity periods |

### 6b. `hr_employments` — new indexes for new columns

| Index | Columns | Type | Owning query |
|---|---|---|---|
| `idx_hr_employments_legal_entity` | `(org_id, legal_entity_id)` | btree | `PayrollRunService.getEmploymentsByEntity()` — run payroll per entity |
| `idx_hr_employments_cost_center` | `(org_id, cost_center_id)` | btree | `GlPostingService.groupByCostCenter()` — GL cost-centre allocation |
| `idx_hr_employments_job_role` | `(job_role_id)` | btree | `HrAnalyticsService.roleDistribution()` — headcount by role |

### 6c. `hr_effective_dated_changes` — new GIST index (exclusion constraint)

| Index | Columns | Type | Owning query |
|---|---|---|---|
| `excl_hr_eff_changes_no_overlap` | `(employment_id, change_type, daterange(effective_from, effective_to, '[)'))` PARTIAL WHERE `status='applied'` | GIST (btree_gist) | DB-level overlap prevention (structural, not a query index) |
| `idx_hr_eff_changes_org_emp_type_from` | `(org_id, employment_id, change_type, effective_from DESC)` | btree | `EffectiveDatedService.getValueAt(empId, changeType, date)` — point-in-time lookup |

### 6d. `hr_reporting_lines` — updated GIST index

| Index | Columns | Type | Owning query |
|---|---|---|---|
| `excl_hr_reporting_lines_no_overlap` | `(employment_id, line_type, daterange(effective_from, effective_to, '[)'))` | GIST (btree_gist) | Prevent two active primary managers at same time |

### 6e. `hr_job_roles`, `hr_job_levels`, `hr_employment_types`

All three tables get the same index pattern:

| Index | Columns | Type | Owning query |
|---|---|---|---|
| `idx_<table>_org` | `(org_id)` | btree | `*Service.listByOrg()` |
| `uniq_<table>_org_code` | `(org_id, code)` UNIQUE | btree | Code collision prevention |
| `uniq_<table>_org_id` | `(org_id, id)` UNIQUE | btree | Composite FK from `hr_employments` |

---

## 7. Access-Pattern Matrix

| Access pattern | Tables | Index used | Expected rows (mid-market org, 500 emp) | p95 target |
|---|---|---|---|---|
| List active employments for org (HR dashboard) | `hr_employments` | `idx_hr_employments_org_status` | 500 | < 10 ms |
| Get person + active employment by `personId` | `hr_people`, `hr_employments` | `idx_hr_people_org`, `idx_hr_employments_person` | 1 | < 5 ms |
| Point-in-time attribute lookup: "what was emp 42's department on 2024-06-01?" | `hr_effective_dated_changes` | `idx_hr_eff_changes_org_emp_type_from` | 1–3 rows returned | < 8 ms |
| Who reports to manager X? (org chart) | `hr_reporting_lines` | `idx_hr_reporting_lines_manager` + partial WHERE `effective_to = 'infinity'` | 1–50 | < 15 ms |
| All employments in legal entity Y (payroll run scoping) | `hr_employments` | `idx_hr_employments_legal_entity` | 10–500 | < 20 ms |
| Transition history for employment (audit trail) | `hr_employment_history` | `idx_hr_emp_history_org_employment` | 5–20 per employment | < 5 ms |
| List legal entities for org (settings page) | `legal_entities` | `idx_legal_entities_org_status` | 1–10 | < 5 ms |
| Get legal entity for a payroll run (run creation) | `legal_entities`, `payroll_entities` | `uniq_legal_entities_org_id` | 1 | < 5 ms |
| Cost-centre headcount for GL allocation | `hr_employments` | `idx_hr_employments_cost_center` | 10–500 | < 20 ms |
| HR analytics: role distribution across org | `hr_employments`, `hr_job_roles` | `idx_hr_employments_job_role` + JOIN | 500 | < 50 ms |

---

## 8. Capacity Estimate (10M users / 100M rows in hot tables)

### Row-size estimates

| Table | Row size (avg bytes) | Growth driver |
|---|---|---|
| `hr_people` | ~600 B | One per employee per org |
| `hr_employments` | ~400 B | 1.1–1.3× per person (re-hires, concurrent) |
| `hr_employee_sensitive_fields` | ~800 B (when encrypted) | 1:1 with `hrEmployments` |
| `hr_effective_dated_changes` | ~500 B | ~25 changes/employment lifetime |
| `hr_reporting_lines` | ~200 B | ~3 per employment |
| `hr_employment_history` | ~250 B | ~7 transitions/employment |
| `legal_entities` | ~700 B | Small; org-admin table |
| `payroll_entities` | ~400 B | Mostly one per legal entity |

### Tables that grow fastest

1. `hr_effective_dated_changes` — every salary revision, promotion, transfer = rows. At 10M employees × 25 changes = **250M rows**. This is the first partitioning target.
2. `hr_employment_history` — every status transition. At 10M × 7 = **70M rows**.
3. `hr_employee_sensitive_fields` — 1:1 with employments, **10M rows** but large (encrypted blobs if encryption added in S4).

### Size estimates at scale

| Table | Rows | Table size | Index size | Total |
|---|---|---|---|---|
| `hr_people` | 10M | ~6 GB | ~2 GB | ~8 GB |
| `hr_employments` | 12M | ~5 GB | ~3 GB | ~8 GB |
| `hr_employee_sensitive_fields` | 12M | ~10 GB | ~1 GB | ~11 GB |
| `hr_effective_dated_changes` | 250M | ~125 GB | ~50 GB | **~175 GB** |
| `hr_employment_history` | 70M | ~18 GB | ~8 GB | ~26 GB |
| `legal_entities` | 500K | ~0.4 GB | ~0.2 GB | ~0.6 GB |

### Partitioning trigger points

| Table | Trigger | Strategy |
|---|---|---|
| `hr_effective_dated_changes` | > 50M rows (approx 2M employees lifetime) | Hash partition on `org_id` (16 or 32 buckets). GIST exclusion constraints work within partitions; cross-partition exclusion is NOT enforced by Postgres — must be enforced at service layer exclusively for cross-partition scenarios. |
| `hr_employment_history` | > 50M rows | Range partition on `created_at` by year (audit-log access pattern is recency-biased). |
| `hr_employee_sensitive_fields` | > 20M rows | Hash partition on `org_id`. |

**Warning on GIST + partitions:** Postgres exclusion constraints (`EXCLUDE USING gist`) do NOT span partitions. Once `hr_effective_dated_changes` is partitioned, the service layer becomes the SOLE overlap guard. The GIST constraint remains valid WITHIN each partition. Plan accordingly.

---

## 9. Migration Sequence

Each step is tagged **[REVERSIBLE]** or **[IRREVERSIBLE]** (irreversible = hard to undo without data loss or a compensating migration).

### Wave 1 — Introduce `legalEntities` (pure expand, zero risk)

| Step | Action | Reversible? |
|---|---|---|
| 1.1 | `CREATE TABLE legal_entities` with all columns nullable initially except PK, org_id, name, legal_name, country_code, functional_currency, effective_from | ✓ DROP TABLE |
| 1.2 | Add UNIQUE `(org_id, id)` and status indexes | ✓ DROP INDEX |
| 1.3 | Add partial unique indexes on `(org_id, gstin)` and `(org_id, pan)` | ✓ DROP INDEX |
| 1.4 | Deploy `LegalEntityService` CRUD behind `payroll:entities:manage` permission (existing) | ✓ |

### Wave 2 — Backfill `legalEntities` from `payrollEntities`

| Step | Action | Reversible? |
|---|---|---|
| 2.1 | Run backfill script: INSERT one `legal_entities` row per `payrollEntities` row, copying `legalName → name + legal_name`, `countryCode`, `baseCurrency → functional_currency`, `pan`, `tan`. Set `effective_from = created_at::date`, `effective_to = 'infinity'`. | ✓ DELETE inserted rows |
| 2.2 | Add `legal_entity_id text REFERENCES legal_entities(id) ON DELETE SET NULL` NULLABLE to `payroll_entities`. | ✓ DROP COLUMN |
| 2.3 | UPDATE `payroll_entities.legal_entity_id` via JOIN on backfilled rows. | ✓ SET NULL again |

### Wave 3 — Introduce typed reference tables

| Step | Action | Reversible? |
|---|---|---|
| 3.1 | CREATE `hr_job_roles`, `hr_job_levels`, `hr_employment_types` | ✓ DROP TABLE |
| 3.2 | Seed: INSERT one row per distinct `jobRoleId/jobLevelId/employmentTypeId` integer value seen in `hr_employments` (requires a SELECT DISTINCT + manual mapping). | ✓ DELETE seeded rows |
| 3.3 | Add FK constraints on `hr_employments.job_role_id`, `job_level_id`, `employment_type_id` (previously bare integers). Run with `NOT VALID`, then `VALIDATE CONSTRAINT` separately to avoid table lock. | ✓ DROP CONSTRAINT |

### Wave 4 — Wire `hrEmployments` to `legalEntities`

| Step | Action | Reversible? |
|---|---|---|
| 4.1 | ADD COLUMN `legal_entity_id text REFERENCES legal_entities(id) ON DELETE SET NULL` NULLABLE to `hr_employments`. | ✓ DROP COLUMN |
| 4.2 | Backfill: UPDATE `hr_employments.legal_entity_id` via JOIN on `payroll_entities.legal_entity_id` (using matching `org_id`). For orgs with a single legal entity, this is deterministic. Multi-entity orgs need manual operator input. | ✓ SET NULL |
| 4.3 | Add `cost_center_id text REFERENCES org_units(id) ON DELETE SET NULL` NULLABLE to `hr_employments`. | ✓ DROP COLUMN |
| 4.4 | Add indexes `idx_hr_employments_legal_entity`, `idx_hr_employments_cost_center`. | ✓ DROP INDEX |

### Wave 5 — Effective-date convention migration [IRREVERSIBLE steps]

| Step | Action | Reversible? |
|---|---|---|
| 5.1 | `CREATE EXTENSION IF NOT EXISTS btree_gist` in cold-DB setup script. | ✓ |
| 5.2 | UPDATE `hr_effective_dated_changes SET effective_to = 'infinity'::date WHERE effective_to IS NULL`. | **IRREVERSIBLE** — NULL meaning changes permanently. Rollback: SET effective_to = NULL WHERE effective_to = 'infinity' before constraint is added. |
| 5.3 | ALTER `hr_effective_dated_changes.effective_to` SET NOT NULL DEFAULT `'infinity'::date`. | **IRREVERSIBLE** once applied — cannot re-nullify easily. |
| 5.4 | ADD CONSTRAINT `excl_hr_eff_changes_no_overlap` EXCLUDE USING gist (...). | ✓ DROP CONSTRAINT |
| 5.5 | Same NULL → infinity backfill + NOT NULL + EXCLUDE for `hr_reporting_lines`. | **IRREVERSIBLE** as above. |
| 5.6 | Add `cost_center` + `job_level` + `legal_entity` to `hrEffectiveDateChangeTypeEnum`. PostgreSQL ALTER TYPE ADD VALUE is **transactional in PG 12+** but the new value is not usable in the same transaction — deploy code that uses it only after migration. | **IRREVERSIBLE** — cannot remove enum values. |

### Wave 6 — Harden `legalEntities` FK and deprecate duplication

| Step | Action | Reversible? |
|---|---|---|
| 6.1 | `ALTER TABLE payroll_entities ALTER COLUMN legal_entity_id SET NOT NULL` (after verifying 100% backfill). | **IRREVERSIBLE** |
| 6.2 | `ALTER TABLE hr_employments ALTER COLUMN legal_entity_id SET NOT NULL` (after verifying 100% backfill). | **IRREVERSIBLE** |
| 6.3 | Add `excl_legal_entities_no_active_overlap` GIST constraint to `legal_entities`. | ✓ DROP CONSTRAINT |
| 6.4 | Add lifecycle enforcement trigger to `hr_employments`. | ✓ DROP TRIGGER |
| 6.5 | `payrollEntities.legalName`, `pan`, `tan` marked `@deprecated` in schema comments. NOT dropped yet — dual-read period continues. | ✓ |

### Wave 7 — Contract (drop deprecated columns)

| Step | Action | Reversible? |
|---|---|---|
| 7.1 | Verify zero application reads of `payrollEntities.legalName`, `pan`, `tan` (grep + deploy monitoring). | ✓ |
| 7.2 | DROP COLUMN `payroll_entities.legal_name`, `pan`, `tan`. | **IRREVERSIBLE** |

---

## 10. Open Questions

| # | Question | Recommended default | Blocks |
|---|---|---|---|
| OQ-1 | `organizations.legalName`/`registrationNumber`/`taxNumber` (`common/auth.ts:34-37`): should these be deprecated in favour of `legalEntities`? An org's primary legal entity could be created automatically at org setup and linked. | **Yes, deprecate.** Create a `legalEntities` row as part of org onboarding. Keep org columns for display until all callers migrate. | Wave 6 |
| OQ-2 | `orgUnitMembers.userId` FKs to `users.id` — should this be `organizationMembers.id` (membership-keyed) to match north-star Rule 6? Currently an org-unit member is a global user, not a tenant-scoped member. | **Change to `organization_membership_id` FK** in a later wave — north-star Rule 6 requires this. Do NOT do it in S1 (breaks 108 downstream module gates). | North-star convergence wave |
| OQ-3 | `hrEffectiveDatedChanges.changeType` is currently a `pgEnum` (`hrEffectiveDateChangeTypeEnum`). Adding `cost_center`, `job_level`, `legal_entity` requires ALTER TYPE. Since enum values cannot be removed, are these three additions certain to remain? | **Yes** — cost-centre and legal-entity are design-level requirements; job-level is a natural companion to designation. Proceed with ADD VALUE. | Wave 5.6 |
| OQ-4 | `hrReportingLines` currently allows NULL `managerEmploymentId` — does a "dotted-line" relationship without a named manager make sense? | **No** — `managerEmploymentId NOT NULL` should be enforced. An empty reporting line should not be stored. If the manager is unknown, do not insert a row. Migrate any existing NULL rows first. | Wave 5.5 |
| OQ-5 | When a `hrEmployments` row is created for a re-hire (same person, new employment), should `effective_from` on the new row's `hrEffectiveDatedChanges` be the re-hire joining date, or the insert timestamp? | **Joining date** (`hrEmployments.joiningDate`). Service must default `effective_from` to `joiningDate` for the initial set of changes on a new employment row. | Service implementation |
| OQ-6 | Concurrency: if two concurrent requests try to close an existing `hrEffectiveDatedChanges` row (SET effective_to = new_date) and insert a new one, which wins? | **Pessimistic lock on parent employment row**: `SELECT ... FOR UPDATE` on `hr_employments` before any effective-dated change transaction. The row lock serialises concurrent transitions for the same employment. | Service implementation |
| OQ-7 | `legalEntities.org_unit_id` FK to `orgUnits` — should this be enforced as `kind = 'BRANCH'` only? | **Recommend adding a DB CHECK** `(org_unit_id IS NULL OR EXISTS (SELECT 1 FROM org_units WHERE id = org_unit_id AND kind = 'BRANCH'))` but this requires a subquery CHECK which Postgres does not support. Enforce at service layer only. | Service implementation |
| OQ-8 | Should `legalEntities` support subsidiary relationships (`parent_legal_entity_id`)? If so, the cross-tenant invariant requires `parent_legal_entity_id` to also carry an `org_id` composite FK — add `(parent_org_id, parent_legal_entity_id)` → `(legal_entities.org_id, legal_entities.id)`. | **Yes, if subsidiaries are needed.** Add `parent_org_id text` co-located with `parent_legal_entity_id` and a composite FK. For same-org subsidiaries `parent_org_id = org_id` always. | Wave 1 (add to CREATE TABLE if decided) |
| OQ-9 | The `hrEmploymentLifecycleStatusEnum` is a `pgEnum` (D-50 keeps pgEnums). Adding states later is irreversible. Is `SUSPENDED` the right terminal shape, or should `ON_HOLD`/`LEAVE_OF_ABSENCE` be added? | **Do NOT add more states in S1.** Model extended leave via `hrLeaveRequests` (which exists) rather than a new lifecycle status. Status `SUSPENDED` covers investigation/administrative hold. Raise as a product decision before S2. | S2 |
| OQ-10 | The lifecycle trigger in Wave 6.4: the trigger fires on EVERY `hr_employments` UPDATE, not just `lifecycle_status` changes. This could slow non-status UPDATE paths. | **Scope the trigger:** `IF NEW.lifecycle_status IS DISTINCT FROM OLD.lifecycle_status THEN ... END IF;` inside the trigger body, with no-op on other column changes. | Wave 6.4 |

---

## Appendix A — `hrEffectiveDateChangeTypeEnum` before/after

**Before** (`hr/core-people.ts:43-53` [V]):
```
department | manager | location | designation | job_level | employment_type | compensation | work_schedule | policy_assignment
```
(9 values)

**After (design target)**:
```
department | manager | location | designation | job_level | employment_type | compensation | work_schedule | policy_assignment | cost_center | legal_entity
```
(11 values — 2 added; `job_level` was already there, NOT a new addition)

---

## Appendix B — Drizzle schema snippet for `legalEntities`

```typescript
// backend/src/db/schema/hr/legal-entities.ts
// Design reference only — not production code.

export const legalEntities = pgTable("legal_entities", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  orgId: text("org_id").references(() => organizations.id, { onDelete: "cascade" }).notNull(),
  name: text("name").notNull(),
  legalName: text("legal_name").notNull(),
  countryCode: text("country_code").notNull().default("IN"),
  stateCode: text("state_code"),
  functionalCurrency: text("functional_currency").notNull().default("INR"),
  gstin: text("gstin"),
  pan: text("pan"),
  tan: text("tan"),
  pfEstablishmentCode: text("pf_establishment_code"),
  esiCode: text("esi_code"),
  ptRegistrationNumber: text("pt_registration_number"),
  lwfCode: text("lwf_code"),
  cin: text("cin"),
  llpin: text("llpin"),
  udyamNumber: text("udyam_number"),
  registeredAddress: jsonb("registered_address").$type<{
    line1?: string; line2?: string; city?: string;
    state?: string; country?: string; postalCode?: string;
  }>(),
  dataResidencyRegion: text("data_residency_region"),
  invoicePrefix: text("invoice_prefix").notNull().default("INV"),
  invoiceFyReset: boolean("invoice_fy_reset").notNull().default(true),
  invoiceSeries: text("invoice_series").notNull().default("DEFAULT"),
  // text + CHECK per D-50
  status: text("status").notNull().default("ACTIVE"),
  effectiveFrom: date("effective_from").notNull(),
  effectiveTo: date("effective_to").notNull().default(sql`'infinity'::date`),
  parentLegalEntityId: text("parent_legal_entity_id").references(
    (): AnyPgColumn => legalEntities.id, { onDelete: "set null" }
  ),
  orgUnitId: text("org_unit_id").references(() => orgUnits.id, { onDelete: "set null" }),
  createdBy: text("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => new Date()),
  deletedAt: timestamp("deleted_at"),
}, (table) => [
  unique("uniq_legal_entities_org_id").on(table.orgId, table.id),
  index("idx_legal_entities_org_status").on(table.orgId, table.status),
  index("idx_legal_entities_org_country").on(table.orgId, table.countryCode),
  // Partial unique indexes — cannot be expressed for btree_gist EXCLUDE in Drizzle builder
  // Those exclusion constraints are raw SQL (see §3).
]);
// STATUS CHECK constraint: raw SQL migration
// ALTER TABLE legal_entities ADD CONSTRAINT chk_legal_entities_status
//   CHECK (status IN ('ACTIVE','INACTIVE','DISSOLVED','MERGED'));
```

---

## Appendix C — Cold-DB prerequisite additions

Per migration-reproducibility rule (MEMORY.md `neon-db-state-2026-07-28.md`), add to the cold-DB setup script (run BEFORE `db:migrate`):

```sql
CREATE EXTENSION IF NOT EXISTS btree_gist;   -- required by all EXCLUDE USING gist constraints
CREATE EXTENSION IF NOT EXISTS vector;        -- already required (HNSW)
CREATE EXTENSION IF NOT EXISTS pg_trgm;       -- already required (free-text)
CREATE EXTENSION IF NOT EXISTS pgcrypto;      -- already required
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";   -- already required
```
