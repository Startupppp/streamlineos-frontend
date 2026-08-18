# HRMS core Phase 1 target schema proposal

Date: 2026-08-10
Status: **all eight decisions approved for additive authoring on 2026-08-11; database execution remains separately gated**
Execution gate: this document authorizes additive source and migration authoring only; it does not authorize database execution, application activation, tenant cutover, or production mutation

## Executive decision

Adopt the existing tenant-scoped directory/workforce chain as the single employee authority:

```text
users (global authentication only)
  └─ organization_members (tenant access and RBAC)
       └─ organization_people (tenant person; login optional)
            └─ workers (stable workforce/payroll subject)
                 └─ worker_engagements (employment or contract interval)
                      ├─ worker_assignment_periods
                      └─ worker_reporting_lines
```

`hr_people` and `hr_employments` become compatibility projections with stable legacy-ID mappings. They are not deleted in the HRMS phase because Payroll and Recruitment still consume them. The global `users` row remains an account, never an employment record.

This direction is compatible with the worker subject already introduced by `backend/migrations/0392_payroll_worker_subject.sql:4-100` and `0393_payroll_lifecycle_worker_subject.sql:4-145`. It does **not** approve, recalculate, or change any payroll figure.

This proposal supersedes the HR identity choice in the older `docs/hrms/04-schema-design.md`, which named `hr_people/hr_employments` as canonical before the fresh three-model and live-data audit. Its unrelated Payroll/Billing research remains prior art, not an execution plan for this session.

## Approval decisions

Canonical approval contract: `HRMS-P1-APPROVAL-2026-08-11-v1`. Implementation must not begin until all eight normative lines are accepted verbatim:

1. **Canonical workforce and legacy compatibility:** approve `organization_people → workers → worker_engagements` as the tenant workforce authority; keep `users` for global authentication and `organization_members` for tenant access/RBAC; retain `hr_people`, `hr_employments`, and finalized HR/Payroll/Recruitment legacy mappings only as one-way tenant-scoped compatibility until Payroll and Recruitment migrate and independent zero-reference proof passes.
2. **Effective workforce history:** approve effective-dated assignment/reporting periods and append-only engagement-state events, including interval-wide cycle prevention and deterministic legacy snapshots; retained current fields are compatibility projections.
3. **Leave ledger and legacy opening balances:** approve the immutable leave ledger as authority and preserve the five live balances as deterministic `UNVERIFIED_LEGACY` opening entries reconciling exactly to 94.20 days; do not recalculate or discard them.
4. **Attendance event model and evidence retention:** approve append-only attendance events and the privacy-first evidence policy: raw location off by default; opt-in encrypted coordinates rounded to at most four decimals for 30 days; longer retention only under a named two-person audited legal hold reviewed at least every 90 days; no bulk export by default.
5. **Hierarchy adjacency plus closure:** approve adjacency as direct-parent truth plus a rebuildable tenant-scoped closure projection for descendant scope.
6. **Private-data separation and managed-KMS envelope encryption:** approve the public/private/sensitive split and managed-KMS envelope encryption; Batch D remains blocked until a separate ADR names and rehearses provider, custody/IAM, tenant/key hierarchy, associated data, rotation/rewrap, recovery/restore, break-glass, deletion, and fail-closed outage behavior; no environment-key/application-keyring fallback is approved.
7. **Zero-error manual reconciliation governance:** approve zero unresolved classifications, mismatches, or PII-attribution items before cutover; no email auto-merge or error threshold; every manual classification or field-precedence decision requires two distinct `AccessService`-authorized reviewers—one organization data owner and one independent HR/security reviewer—using masked, audited PII review and a signed ID-only manifest.
8. **Migration profile plus mandatory API/security/cache/UI pre-canary gates:** approve the organization-sticky expand-contract state machine and require tenant integrity/RLS, object-level `AccessService`/DataScope, safe DTO and sensitive-access audit, tenant/actor/access/scope/profile/wire cache isolation and clearing, exact route/sidebar/action/hook permission, and responsive/accessibility gates before any canonical canary.

## Why this model

### Evidence

- `users` contains tenant employment, salary, tax, bank, manager, branch, and department fields but has no tenant key/RLS (`backend/src/db/schema/common/auth.ts:103-150`; `backend/src/common/tenant/README.md:137-139`).
- `organization_people` already models a tenant person with optional account/membership linkage and tenant uniqueness (`backend/src/db/schema/directory/organization-people.ts:16-85`).
- `workers` already models a stable payee/workforce identity (`backend/src/db/schema/directory/workers.ts:16-59`).
- `worker_engagements` already models employee/contractor/consultant/intern/agency/freelancer periods (`backend/src/db/schema/directory/worker-engagements.ts:19-92`).
- `hr_people/hr_employments` duplicate person, worker number, placement, designation, dates, and lifecycle (`backend/src/db/schema/hr/core-people.ts:67-175`).
- HR and Directory writers are disjoint; onboarding writes `users`, commits, then creates HR rows, so failure can leave divergence (`employee-onboarding.service.ts:91-178,209-221,318-330`).
- Payroll accepts user and worker subjects but downstream readers remain partly user-only (`payroll-workforce.ts:41-82`; `payroll-runs.ts:71-113`; `generate.service.ts:209-445`; `ess.service.ts:218-253`).
- Recruitment is also an employment producer: accepted offers and hiring/onboarding paths can create or populate account/HR employment records. It must migrate to the same Workforce command boundary rather than remain an independent writer.

### Rejected alternatives

| Option | Decision | Reason |
|---|---|---|
| Global `users` | Reject | It cannot safely represent different employments across tenants, accountless workers, or contractors. Account suspension/erasure must not erase employment history. |
| `hr_people → hr_employments` | Reject as platform authority | It duplicates Directory, has weaker tenant/user uniqueness, and would force Payroll and other modules through HR. Retain only as a compatibility/HR extension. |
| New fourth employee model | Reject | It increases the exact drift, storage, migration, and support cost that `SCH-001`/`COST-004` identify. |

## Ownership boundaries

| Aggregate | Owns | Must not own |
|---|---|---|
| `users` | Credentials, global account email/avatar/preferences, authentication lifecycle | Salary, bank/tax IDs, tenant employee number, manager, department, joining/termination state |
| `organization_members` | Tenant access, membership lifecycle, RBAC, owner/admin status | Employment or payroll eligibility |
| `organization_people` | Tenant-scoped public/work identity; optional account link | Employment lifecycle, salary, bank data |
| `workers` | Stable workforce/payee identity and tenant worker number | Independently mutable work lifecycle or placement |
| `worker_engagements` | Dated employment/contract relationship and coarse current-state projection | Login access, mutable historical placement |
| Assignment/reporting periods | Effective-dated job placement and manager facts | Destructive overwrite of history |
| HR extensions | Probation, workflow, private/sensitive case data tied to canonical IDs; legacy HR compatibility projections | Duplicate employee master or writes to global user employment fields |
| Payroll | Salary structures and immutable run snapshots keyed to worker/engagement | New polymorphic user-or-worker identity |
| Recruitment | Candidate/offer facts and pre-hire workflow; hiring invokes Workforce commands | Creating an independent employee master or projecting employment fields onto `users` |

Actor columns continue to identify the authenticated user/membership; business-subject columns identify the person, worker, or engagement. Terminating an engagement and suspending tenant access are separate commands. A tenant exit must never deactivate the global account (`SEC-036`). Existing employment, salary, bank, tax, manager, department, joining, and termination fields on `users` are read-only migration inputs during expansion, never compatibility-projection targets; no new canonical command may write them.

## Canonical workforce schema

Existing physical ID and column names remain stable during expansion; APIs use opaque string IDs and `orgId`. Renaming `organization_id`/`org_id` is explicitly not part of this wave.

### Existing aggregate hardening

`organization_people`:

- retain UUID/text `organization_person_id` and `organization_id`;
- keep optional composite membership link; add/verify `(organization_id, organization_membership_id) → organization_members(org_id,id)`;
- retain operational name, work email, avatar, timezone, language, and professional profile only;
- add `row_version`, `archived_at`, `archived_by_membership_id`, `updated_by_membership_id`;
- preserve tenant-unique active normalized work email;
- derive global user through membership after migration; deprecate duplicated direct `user_id` only in contract.

`workers`:

- retain stable `worker_id` and one-to-one tenant person link;
- enforce tenant-unique active `worker_number`;
- expose `UNIQUE (organization_id,organization_person_id,worker_id)` as the candidate key used by legacy-map coherence FKs;
- add `row_version`, actor columns, and archive lifecycle;
- make `status` and `is_payee` command-owned projections, never independent UI patches.

`worker_engagements`:

- retain stable IDs, worker type, start/end business dates, and live non-overlap invariant from `0330_worker_engagement_overlap.sql:22-45`;
- add `row_version`, actor columns, state reason, and last-state-event ID;
- retain current placement columns only as compatibility projections;
- add `CHECK (ends_on IS NULL OR ends_on > starts_on)`, matching the current exclusive end-date contract enforced at `directory.service.ts:41-44` and `directory.schemas.ts:87-99`;
- expose `UNIQUE (organization_id,worker_id,worker_engagement_id)` as the tenant-safe target for mapping and history FKs;
- require composite tenant FKs for every reference.

### New effective-dated tables

`worker_assignment_periods` stores engagement placement:

```text
organization_id, assignment_period_id, worker_engagement_id
valid_from date, valid_to date NOT NULL DEFAULT infinity
is_primary, business_unit_id, branch_id, department_id, team_id
location_id, cost_center_id, job_role_id, job_level_id
employment_type, designation, schedule_id
row_version, created/updated timestamps and membership actors
```

Rules:

- half-open `[valid_from, valid_to)` intervals;
- `CHECK (valid_from < valid_to)`;
- tenant-composite FKs for engagement and every reference;
- exclusion constraint prevents overlapping active primary periods for one engagement;
- corrections close/supersede periods; they never overwrite an applied historical fact.

`worker_reporting_lines` stores primary, dotted, matrix, or functional reporting:

```text
organization_id, reporting_line_id, worker_engagement_id
manager_worker_engagement_id, line_type
valid_from, valid_to, row_version, actors/timestamps
```

It uses composite tenant FKs, rejects self-management, and excludes overlap per `(engagement,line_type)`. Manager hierarchy uses the manager’s engagement, not a global user ID.

Every reporting-line mutation takes a tenant advisory lock and proves acyclicity for the whole affected interval. The command forms the sorted set of the proposed `valid_from`/finite `valid_to` plus every intersecting reporting-edge boundary; for each resulting half-open segment it runs a tenant-scoped recursive reachability query and rejects the write if the proposed manager can reach the subject. Direct table DML is revoked after writer deployment, and a deferred constraint trigger repeats the boundary check for privileged/import paths so A→B→A and longer cycles cannot bypass the command.

`worker_engagement_state_events` is append-only:

```text
organization_id, event_id bigint, worker_engagement_id
event_kind, from_status nullable, to_status, effective_date, reason_code
command_scope NOT NULL, command_id NOT NULL, effect_ordinal NOT NULL
source_type NOT NULL, source_id NOT NULL, source_ordinal NOT NULL
command_fence_id nullable, migration_batch_id nullable
recorded_at timestamptz, actor membership/user snapshot
```

The table has `PRIMARY KEY (organization_id,event_id)`, permanent `UNIQUE (organization_id,command_scope,command_id,effect_ordinal)` and `UNIQUE (organization_id,source_type,source_id,source_ordinal)` keys, non-negative ordinal checks, a tenant FK to the engagement, and a partial unique index on `(organization_id,worker_engagement_id,event_kind) WHERE event_kind = 'LEGACY_SNAPSHOT'`. No permanent key component is nullable; a command without an external source uses `source_type = 'COMMAND'`, its canonical command ID, and the effect ordinal. The base expansion leaves this table empty and `worker_engagements.last_state_event_id` nullable so the legacy writer remains compatible. After the compatible command writer is deployed, a separately approved deterministic backfill inserts one `LEGACY_SNAPSHOT` for every existing engagement (including observed `CANCELLED` and `PLANNED` rows), with `from_status = NULL`, the observed status, the engagement row as its non-null source key, and a non-null migration batch, then advances the projection atomically. Event effective dates cannot move backwards; created engagements start `PLANNED` or `ACTIVE`; subsequent transitions are only `PLANNED -> ACTIVE/CANCELLED` or `ACTIVE -> COMPLETED/TERMINATED`. `COMPLETED`, `TERMINATED`, and `CANCELLED` are terminal, so rehire creates a new engagement. A deferred projection check requires every non-null current pointer/status to equal the latest event and forbids clearing a canonical pointer.

### Compatibility and reconciliation

`hr_person_legacy_map(org_id NOT NULL,hr_person_id NOT NULL,organization_person_id NOT NULL)` has `PRIMARY KEY (org_id,hr_person_id)`, `UNIQUE (org_id,organization_person_id)`, and `UNIQUE (org_id,hr_person_id,organization_person_id)`. It uses the existing/verified `hr_people(org_id,id)` and `organization_people(organization_id,organization_person_id)` candidate keys for restrictive FKs `(org_id,hr_person_id) -> hr_people(org_id,id)` and `(org_id,organization_person_id) -> organization_people(organization_id,organization_person_id)`.

`hr_employment_legacy_map(org_id NOT NULL,hr_employment_id NOT NULL,hr_person_id NOT NULL,organization_person_id NOT NULL,worker_id NOT NULL,worker_engagement_id NOT NULL)` has `PRIMARY KEY (org_id,hr_employment_id)` and `UNIQUE (org_id,worker_engagement_id)`. Add candidate key `UNIQUE (org_id,id,person_id)` to `hr_employments`; then enforce restrictive `MATCH FULL` FKs `(org_id,hr_employment_id,hr_person_id) -> hr_employments(org_id,id,person_id)`, `(org_id,hr_person_id,organization_person_id) -> hr_person_legacy_map(org_id,hr_person_id,organization_person_id)`, `(org_id,organization_person_id,worker_id) -> workers(organization_id,organization_person_id,worker_id)`, and `(org_id,worker_id,worker_engagement_id) -> worker_engagements(organization_id,worker_id,worker_engagement_id)`. Thus an employment cannot map to a worker belonging to a different canonical person even when every individual ID exists in the tenant, and no nullable composite key can bypass the chain. These keys also make each retained legacy row map to exactly one canonical subject and prevent two legacy rows silently claiming one canonical subject. Reviewed corrections are versioned/audited commands, never an untracked remap.

Nullable canonical-link columns on `hr_people`/`hr_employments` are compatibility projections of these maps, carry the same tenant FKs, and are written only by the mapping command. Direct updates are revoked after writer deployment. A `DEFERRABLE INITIALLY DEFERRED` consistency trigger on both map and compatibility-row changes requires every populated link to equal its authoritative map and rechecks the complete HR employment -> HR person map -> canonical person -> worker -> engagement chain at commit, including privileged/import paths. `hr_workforce_reconciliation_items` stores source identifiers, classifications, reason codes, and review/approval actor metadata, never plaintext sensitive values.

### Complete source union and zero-error governance

The migration input is the distinct tenant/subject union, not only rows already present in HR tables. It includes all eight currently active `organization_members`, all three `organization_people`, every row in `workers`, `worker_engagements`, `hr_people`, and `hr_employments`, all seven global `users` as account/legacy-field evidence only, Payroll worker/user subject mappings and finalized snapshots, Leave balances/requests/ledger subjects, Attendance/time subjects, onboarding/lifecycle subjects, and Recruitment candidate/offer/hire/onboarding subjects. Each row is classified as access-only, person-only, workforce subject, legacy compatibility subject, or an unresolved conflict; membership or a populated global employment field does not by itself imply employment.

Exact same-tenant membership/user links and an existing approved mapping may auto-resolve. Email, normalized or otherwise, creates a review candidate only and is never an automatic merge key. Every manual classification, field-precedence decision, ambiguous identity, mismatch, or global-PII attribution requires two distinct `AccessService`-authorized reviewers—one organization data owner and one independent HR/security reviewer—with masked/audited review, source references, reason code, timestamps, and an audit event. The permitted unresolved/error count for a tenant cutover is zero; a reviewed non-worker/access-only classification is an explicit resolution, not an ignored error. Payroll and Recruitment producers must be included in the reconciliation rerun immediately before their writer cutover.

## Tenant integrity and RLS

Every tenant parent exposes `UNIQUE (organization_id,id)` (using its existing physical tenant-column spelling). Every child stores the tenant key and uses a composite FK:

```sql
FOREIGN KEY (organization_id, parent_id)
REFERENCES parent (organization_id, id)
ON DELETE RESTRICT NOT VALID
```

For an existing table, writer validation ships before `NOT VALID`, because the FK immediately constrains new writes. Validation is a separate online step. Historical and statutory facts use `RESTRICT`; only rebuildable projections may cascade.

Every new tenant table gets tenant-leading indexes and RLS `USING` plus `WITH CHECK`. `FORCE RLS` is a later canary after the application uses a non-owner DB role and tenant-context integration tests pass. RLS remains defense-in-depth; composite FKs provide relational tenant integrity.

The live `roster_entries` and `onboarding_template_steps` already have direct tenant keys/RLS/composite FKs even though Drizzle omits them. That portion of `SEC-006` is corrected and tracked under `SCH-016`; source declarations must be synchronized, not re-migrated.

## Private and sensitive data

Keep only common operational fields on `organization_people`. Add restricted, separately authorized tables:

- `organization_person_private_profiles` — DOB, gender, nationality, private contact metadata;
- `organization_person_addresses`;
- `organization_person_emergency_contacts`;
- `worker_bank_accounts`;
- `worker_identifiers` — PAN, Aadhaar/national ID, passport, UAN, ESI;
- `worker_medical_profiles`;
- `worker_case_records` — grievance/disciplinary data;
- `worker_documents` and immutable `worker_document_versions`;
- normalized document tag/link tables.

Sensitive values use managed-KMS envelope encryption and store ciphertext, wrapped data-encryption key, KMS key identifier/version, encrypted-data version, masked display value, and a keyed HMAC only where exact deduplication is required. A plain hash is unsafe for enumerable identifiers. Tenant ID, canonical subject ID, field purpose, and record version are bound as authenticated encryption associated data.

Bank accounts and identifiers are versioned/effective-dated records: a change closes the old validity interval and inserts a new encrypted row. It never overwrites the value used by a historical process.

The current AES-GCM helpers use one environment key with no key identifier (`backend/src/modules/hr/onboarding/core/crypto.helpers.ts:4-31`; `backend/src/common/security/secret-encryption.util.ts:3-46`) and are not an approved production fallback. Batch D and every private-data writer/backfill remain blocked until a named managed-KMS provider, custody and IAM boundary, tenant/key hierarchy, rotation schedule, recovery/escrow procedure, break-glass audit, deletion behavior, and backup-restore decrypt test are approved and rehearsed. Logs, audit diffs, checkpoints, and discrepancy reports contain no plaintext PII.

Document rows store an object key, checksum, classification, retention expiry, and legal-hold state—not a persistent signed/public URL. URLs are short-lived, tenant-scoped, permissioned, and access-audited.

Compensation authority is deferred to Payroll because existing payroll output is untrusted. HRMS Phase 1 must not establish a new salary baseline or copy figures into a new canonical table.

No new HRMS money column is proposed. Any later compensation or reimbursement amount must use an exact database numeric/minor-unit representation plus ISO currency and an approved rounding boundary; floating point is forbidden.

## Attendance target

Replace mutable attendance truth and JSON breaks with:

- `attendance_events`: append-only `CHECK_IN`, `CHECK_OUT`, `BREAK_START`, `BREAK_END`, `AUTO_CHECKOUT`, `CORRECTION`;
- `attendance_session_projections`: rebuildable current session with partial unique `(org,worker) WHERE closed_at IS NULL`;
- `attendance_daily_projections`: rebuildable daily totals;
- `attendance_event_evidence`: separately protected, at-most-one-per-event device/geolocation evidence with retention expiry;
- `attendance_evidence_legal_holds`: separately mutable hold control linked to evidence, reachable only through a two-person, row-versioned, audit-coupled command.

Each event stores worker/engagement IDs, `business_date date`, `occurred_at timestamptz`, `recorded_at timestamptz`, organization timezone snapshot, source, and a deterministic command key. The server derives business date; the client never chooses it (`API-018`). A `CORRECTION` also stores the original `(business_date,event_id)` plus a typed compensating payload; replay applies the compensation and never changes the original bytes.

`attendance_events` is monthly range-partitioned by `business_date` with `PRIMARY KEY (organization_id,business_date,event_id)`. Tenant-global identity and references use:

```text
attendance_event_locators(
  organization_id NOT NULL, event_id bigint identity, business_date date NOT NULL,
  command_scope NOT NULL, command_id NOT NULL, effect_ordinal NOT NULL,
  source_type NOT NULL, source_id NOT NULL, source_ordinal NOT NULL,
  PRIMARY KEY (organization_id,event_id),
  UNIQUE (organization_id,event_id,business_date),
  UNIQUE (organization_id,command_scope,command_id,effect_ordinal),
  UNIQUE (organization_id,source_type,source_id,source_ordinal)
) PARTITION BY HASH (organization_id)
```

All permanent command/source key components are `NOT NULL`, ordinals are non-negative, and all locator uniqueness includes the hash key, so PostgreSQL can enforce it across locator partitions. A command without an external source uses the reserved `COMMAND` source type, canonical command ID, and effect ordinal. Locator and event use reciprocal `DEFERRABLE INITIALLY DEFERRED` composite FKs between locator `(organization_id,event_id,business_date)` and event `(organization_id,business_date,event_id)`, so neither can commit orphaned. Evidence and a correction’s original-event reference store the date resolved through the locator and FK directly to the range-partitioned event PK. Locator and fact insert in one transaction; IDs are exposed to TypeScript as strings. This supplies an enforceable stable locator without pretending `event_id` alone is unique on the time-partitioned event parent.

Correction columns have a named check requiring `(corrects_business_date,corrects_event_id)` to be both non-null exactly when `event_kind = 'CORRECTION'` and both null otherwise, plus a self-target check. The target FK uses the default `MATCH SIMPLE` and is `DEFERRABLE INITIALLY DEFERRED`; `MATCH FULL` is invalid for this shape because the tenant key is always non-null while the two target columns are optional, so the named check owns their all-or-none rule. Hash-partitioned `attendance_correction_links` has primary key `(organization_id,original_event_id)` and unique `(organization_id,correction_event_id)`, so one original has at most one direct correction and one correction cannot serve two originals across range partitions. Deferred fact/link triggers require the target to be a non-`CORRECTION` event for the same worker and engagement and validate the typed compensating payload. Correction chains and cycles cannot commit; originals remain byte-immutable.

The current attendance row remains a dual-written projection through rollback. Raw geolocation is off by default. An explicitly enabled tenant policy with documented purpose and employee notice persists only geofence result and fixed accuracy/distance enum buckets in the durable fact; optional dispute evidence stores encrypted coordinates rounded to at most four decimals for 30 days. Tenants may shorten but not lengthen that default. A legal hold is not an update to immutable evidence: the separate hold aggregate names the case, two distinct `AccessService`-authorized approvers, reason, expiry/review date, and row version. Its only writer is a two-person command that appends the immutable audit before changing the aggregate, and review is required at least every 90 days. Evidence has no bulk export by default, every reveal is purpose-bound/audited, and expiry deletes evidence plus expired hold control without deleting the locator, attendance fact, or audit history.

## Leave target

`worker_leave_ledger_entries` becomes the immutable source of truth:

```text
organization_id, entry_id bigint, worker_id, worker_engagement_id
leave_type_id, period_key, delta_days numeric
entry_type, provenance_status NOT NULL, effective_date date, recorded_at timestamptz
command_scope NOT NULL, command_id NOT NULL, effect_ordinal NOT NULL
source_type NOT NULL, source_id NOT NULL, source_ordinal NOT NULL
actor membership/user snapshot, migration_batch_id
```

Rules:

- sign is explicit in `delta_days`;
- a named check constrains `provenance_status` to `VERIFIED_SOURCE | UNVERIFIED_LEGACY`; `provenance_status = 'UNVERIFIED_LEGACY'` if and only if `entry_type = 'LEGACY_OPENING_BALANCE'`, and that case requires a migration batch;
- a durable locator prevents command/source retries across time partitions;
- one reversal link per original entry; corrections append, never update;
- approval conditionally changes request version, appends the event, and advances the locked projection in one transaction;
- payroll/export locks are immutable links, not mutations of ledger facts.

`worker_leave_ledger_entries` is range-partitioned by `effective_date` with `PRIMARY KEY (organization_id,effective_date,entry_id)`. Its tenant-global locator mirrors attendance:

```text
worker_leave_entry_locators(
  organization_id NOT NULL, entry_id bigint identity, effective_date date NOT NULL,
  command_scope NOT NULL, command_id NOT NULL, effect_ordinal NOT NULL,
  source_type NOT NULL, source_id NOT NULL, source_ordinal NOT NULL,
  PRIMARY KEY (organization_id,entry_id),
  UNIQUE (organization_id,entry_id,effective_date),
  UNIQUE (organization_id,command_scope,command_id,effect_ordinal),
  UNIQUE (organization_id,source_type,source_id,source_ordinal)
) PARTITION BY HASH (organization_id)

worker_leave_reversal_links(
  organization_id NOT NULL,
  original_entry_id bigint NOT NULL, original_effective_date date NOT NULL,
  reversal_entry_id bigint NOT NULL, reversal_effective_date date NOT NULL,
  PRIMARY KEY (organization_id,original_entry_id),
  UNIQUE (organization_id,reversal_entry_id),
  CHECK (original_entry_id <> reversal_entry_id)
) PARTITION BY HASH (organization_id)
```

All permanent command/source key components are `NOT NULL`, ordinals are non-negative, and a command without an external source uses the reserved `COMMAND` source form described above. Locator and ledger fact use reciprocal deferred composite FKs, so neither can commit orphaned. Each non-null reversal endpoint has an FK directly to the range-partitioned ledger PK as well as the matching locator key. Because each partitioned PK/unique key includes `organization_id`, PostgreSQL enforces at most one reversal per original and prevents one reversal fact from serving multiple originals across every time partition.

A `DEFERRABLE INITIALLY DEFERRED` integrity trigger runs for both ledger and link inserts. It requires every `entry_type = 'REVERSAL'` fact to be the reversal endpoint of exactly one link, prohibits a `REVERSAL` fact from being an original endpoint, and requires the original to be non-reversal, non-self, for the same worker, engagement, leave type, and period, with a non-zero delta and the exact negated reversal delta. Prohibiting reversal-of-reversal links makes chains and cycles impossible. Locator, ledger fact, required reversal link, request transition, and projection advance commit together.

No new `hr_command_receipts` table is introduced. HTTP/command lifecycle reuses the existing `command_fences` contract—canonical request hash, stored outcome, in-flight lease, and retention—and maps `command_scope/command_id` to its command/key. Claim/reclaim follows the existing lease rules; the business transaction atomically inserts the durable locator/fact and completes the fence. The locator’s permanent command uniqueness still prevents a duplicate fact after the replayable fence reaches its approved expiry.

`worker_leave_balance_projections` stores a rebuildable balance, last processed entry, and projection version per tenant/worker/type/period. It is never directly edited. The five live balances become approved, idempotent `LEGACY_OPENING_BALANCE` entries only if the user accepts the discrepancy recommendation.

### Database-enforced immutability

`worker_engagement_state_events`, attendance locators/events, leave locators/ledger/reversal links, and audit/access events are owned by dedicated fact-writer roles. The base expansion grants the ordinary application role no fact, projection, raw-evidence, legal-hold, map, or reconciliation writes; those privileges activate only with their reviewed API/canary migration. Activated dedicated roles receive only the exact command privileges and authorized readers receive only the exact view privileges; `UPDATE`, `DELETE`, and `TRUNCATE` remain revoked on append-only parents and every partition. Parent-level defensive triggers reject mutation and are verified on newly attached partitions. Corrections, reversals, evidence expiry, and pseudonymization use their explicitly permitted append/retention commands rather than generic table mutation. Integration tests execute as the non-owner roles and prove all unapproved access fails.

## Hierarchy target

Keep `org_units.parent_id` as the authoritative direct edge and add:

```text
org_unit_closure(
  organization_id, ancestor_id, descendant_id, depth,
  PRIMARY KEY (organization_id, ancestor_id, descendant_id)
)
```

An index on `(organization_id,descendant_id,depth,ancestor_id)` serves ancestor scope. A tenant-scoped move operation takes an advisory lock, rejects cycles, updates adjacency and closure atomically, and records an audit event. Direct parent updates are revoked after cutover. Closure is rebuildable, so rollback returns reads to adjacency.

Effective reporting lines remain the manager truth; a rebuildable current reporting closure accelerates current DataScope. Historical as-of reads initially use indexed effective edges and gain snapshots only if measured p95 requires them.

## Audit, lifecycle, and temporal policy

Create partitioned append-only `hr_audit_events` and `hr_sensitive_access_events` with tenant, actor snapshot, entity/action, request/correlation ID, redacted diff, and `occurred_at timestamptz`. Hash-partitioned `hr_audit_event_sources` permanently owns `(organization_id,source_type,source_id,source_ordinal)` and maps it to the range fact through reciprocal deferred FKs, so a retry with a changed timestamp cannot create another immutable audit row. A dedicated audited writer can insert only after API activation and authorized readers can select; the broad application role has no direct audit-table access. Defensive triggers reject mutation. Audit JSON is allowed only as an immutable redacted diff.

Partitioned parents, reciprocal deferred FKs, exclusion constraints, and per-leaf triggers are SQL-managed objects. They live behind `backend/src/db/schema/hrms-phase1-sql-managed.ts`, which is intentionally excluded from the normal Drizzle generation barrel. The reviewed SQL bundle uses its own hashes, dependency on migration 0398, catalog fingerprints, apply ledger, and partition manifest; its placeholder metadata is never copied into the Drizzle journal.

Mutable aggregate roots get `row_version integer NOT NULL DEFAULT 1 CHECK(row_version > 0)`: person, worker, engagement, org unit, assignment/reporting period, leave request, onboarding case/task, document metadata, and rebuildable projections. Updates require the expected version; zero rows becomes a conflict. Append-only facts do not get versions.

Temporal rules:

- business dates use `date`: DOB, engagement/assignment/leave dates, attendance business date, document expiry;
- events use `timestamptz`: created/updated/approved/applied/viewed/exported/punched/audited;
- recurring local schedules use PostgreSQL `time` plus organization IANA timezone;
- durations use integer minutes or numeric days.

Legacy `timestamp without time zone` columns are never cast in place. Each needs an approved registry entry (`UTC_WALL`, `ORG_LOCAL`, or `AMBIGUOUS`), a sidecar/new-table backfill, comparison, and only then cutover. Ambiguous means stop.

Archivable aggregates use `archived_at` plus actor. Append-only facts are retained/pseudonymized under policy and never soft-deleted. Historical FKs use `RESTRICT`, not cascade (`SEC-004`).

Stable closed lifecycle values use a PostgreSQL enum or named check constraint shared by the writer contract. Administrator-configurable vocabularies use tenant lookup tables with composite FKs. TypeScript-only unions over unconstrained `text` are not accepted (`SCH-008`).

## API and frontend compatibility contract

One Workforce application boundary is consumed by HR, Payroll, and Recruitment; none imports another module’s persistence layer:

```ts
resolveByUser(orgId, userId, asOf)
getByWorker(orgId, workerId, asOf)
requireActiveEngagement(orgId, workerId, asOf)
resolveLegacyHrPerson(orgId, hrPersonId)
resolveLegacyHrEmployment(orgId, hrEmploymentId)
```

It returns `{ orgId, organizationPersonId, workerId, workerEngagementId, userId, organizationMembershipId }`. Every lookup includes tenant and effective date; runtime resolution never joins by email. Self-service resolves the authenticated account to its tenant worker. Object/team scope comes from `AccessService` over canonical engagement/reporting data.

Legacy integer HR routes and `/payroll/employees/:userId` remain adapters. Responses expose canonical IDs. HR onboarding, an accepted Recruitment offer/hire, and future Payroll enrollment call canonical Workforce commands and update only the permitted HR/Payroll compatibility projections transactionally; there are no independent bidirectional writers and no employment projection back to global `users`. Finalized payroll rows retain their original subject and an as-of compatibility mapping. Only future, non-finalized work can require worker/engagement IDs.

Frontend rollout uses an organization-sticky server-returned data-migration profile; wire V1/V2 negotiation remains a separate route/client contract. V1/V2 query keys never share cache data. Permission-shaped keys include tenant, actor user and membership, RBAC access revision, workforce-scope revision, migration-profile revision, and wire version. Tenant switch, logout, 401, actor/capability loss, and any relevant revision change abort and purge affected queries. Base employee DTOs exclude salary, bank, tax, medical, and private data; separately authorized sensitive endpoints return masked data by default and are access-audited.

No tenant may enter a canonical canary merely because schema parity passes. The gate also requires conditional-transition/idempotency tests for the affected API, tenant A/B and object-level `AccessService`/DataScope tests, safe-DTO and sensitive-access audit tests, tenant/access-version cache-key plus logout/401/switch clearing tests, and route/action/persona/responsive/accessibility UI conformance. Any failure keeps that tenant on the legacy/shadow contract profile.

## Finding design map — no closures

This proposal closes no product finding. It designs only the following schema remediations; closure requires implemented constraints, migrated writers/readers, tests, telemetry, and accepted reconciliation evidence.

| Schema design | Findings with a proposed schema remediation |
|---|---|
| Canonical person/worker/engagement boundaries | `SCH-001` |
| Composite tenant FKs and source/live registry | `SCH-002`, `SCH-016` |
| Leave ledger, locators, reversals, projection | `SCH-003`, `SCH-004` |
| Attendance events, locators, open-session projection | `SCH-005`, `SCH-007` |
| Normalized child/link data | `SCH-006` |
| Constrained lifecycle vocabularies and uniqueness | `SCH-008`, `SCH-009` |
| Effective assignments/reporting/state events | `SCH-010` |
| Versions, archive, immutable facts/audit | `SCH-011`, `SCH-012` |
| Bigint identities and feasible partition keys | `SCH-013` |
| Closure projection | `SCH-014` |
| Deferred holiday/device adapters | `SCH-015` |

All `API-*`, `SEC-*`, `UI-*`, `COST-*`, and `DEAD-*` findings remain open after schema approval. API pagination/composition/state machines/outboxes, authorization and sensitive DTOs, cache isolation/clearing, UI route/action/persona/accessibility conformance, jobs/rate limits, and measured performance require their later API→security/cache→UI waves and the mandatory pre-canary gates above.

## Explicit deferrals

- Physical deletion of `hr_people`, `hr_employments`, user HR fields, or legacy payroll subject columns waits for Payroll and Recruitment migration plus zero-reference proof.
- Payroll calculation/schema correctness waits for statutory discrepancy review; no existing number becomes a golden baseline.
- Consolidating holidays/devices waits for active-consumer adapters despite empty live tables.
- Existing 32-bit IDs are not rewritten in place; replacement high-volume facts start bigint.
- Existing timestamp columns are not mass-converted.
- `FORCE RLS` waits for a non-owner application-role canary.
- No new dependency is authorized by this proposal. A selected managed-KMS SDK/provider dependency requires its own approval; the backfill otherwise uses the operator-run resumable CLI because no job queue is available.

## Approval gate

All eight decisions were explicitly approved on 2026-08-11 under `HRMS-P1-APPROVAL-2026-08-11-v1`, permitting authoring of the additive expansion and verification wave described in the companion migration plan. That approval does not authorize database execution. Clone rehearsal, production execution, tenant activation, KMS/private data, and contract/deletion retain their separate gates. Production mutation status is **none**.
