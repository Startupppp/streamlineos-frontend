# HRMS core Phase 1 live discrepancy report

Date: 2026-08-10
Status: read-only evidence; no repair approved or applied

## Safety boundary

The checks in this report ran against the authorized production database inside a `REPEATABLE READ READ ONLY` transaction. They returned aggregate counts and structural metadata only. The checks changed no application data, schema, migration journal, sequence, cache, or other production state. Repository changes in this phase are documentation-only, and no PII values were copied into this report.

The live database is too small to represent the stated scale target: 5 organizations, 7 users, 8 active memberships, and mostly empty HR tables. These results establish current integrity facts, not production-scale performance.

## Canonical-model reconciliation

The current core identity source counts are:

| Source | Live rows | Cutover meaning |
|---|---:|---|
| Global `users` | 7 | Account and legacy-field evidence only; a global account is not proof of tenant employment. |
| Active `organization_members` | 8 | Current employee-list readers treat these memberships as employees; each must be classified before cutover. |
| `organization_people` | 3 | Each must be classified as workforce-linked or person/directory-only. |
| `workers` | 1 | Preserve its stable canonical worker ID. |
| `worker_engagements` | 2 | Preserve both IDs and their recorded history. |
| `hr_people` | 0 | No legacy HR person mirror exists. |
| `hr_employments` | 0 | No legacy HR employment mirror exists. |

Eight active memberships do **not** prove eight workers: a membership can represent access/RBAC without an employment. However, the current employee API selects organization memberships joined to global users and presents them as employees (`backend/src/modules/hr/directory/employees.service.ts:81-133`). Before any canonical read cutover, every membership/user subject and every organization-person row must be classified as a canonical worker, a reviewed access-only/person-only exception, or a blocking reconciliation item. A row may not disappear merely because the legacy HR tables are empty.

The database contains one directory worker and two engagements. The first query shape initially appeared to show two workers because it joined one worker to both engagements; the corrected distinct count is one.

| Check | Result | Classification | Proposed treatment |
|---|---:|---|---|
| Directory workers | 1 | Fact | Preserve the existing worker ID as the canonical workforce ID. |
| HR people | 0 | Gap | Do not create another competing HR person. Map future HR APIs to the directory person. |
| HR employments | 0 | Gap | Do not invent historical employment facts. Review the existing engagements and retain their IDs/status/history. |
| Worker status | 1 `INACTIVE` | Inconsistent projection | `workers.status` must become a command-owned projection of engagement state, not an independently writable source. |
| Worker payee flag | 1 `false` | Current configuration | Preserve it; Phase 1 must not infer payroll eligibility. |
| Engagements | 1 `CANCELLED`, 1 `PLANNED` | Current history | Preserve both. No active-primary engagement exists. |
| Active-primary duplicates | 0 | Pass | Preserve and strengthen the live exclusion invariant in source/schema CI. |
| Overlapping planned/active pairs | 0 | Pass | Backfill can proceed only while this remains zero. |

For the linked worker, normalized field comparisons found:

| Comparison | Mismatches |
|---|---:|
| Work email | 0 |
| Display/name | 1 |
| Worker number vs global `users.employee_id` | 1 |
| Designation | 0 |
| Joining date vs selected engagement start | 1 |
| Department | 0 |

These mismatches are not safe to resolve automatically. The global user fields are tenant-ambiguous and neither source has approved precedence for name, employee number, or joining date. They must enter a review queue with the source rows and proposed canonical value; a migration must not silently choose one.

Identity matching policy for migration:

1. Exact tenant-scoped membership/user links are authoritative for identity linkage, but do not by themselves prove worker/employment status.
2. A previously stored legacy-map row is authoritative.
3. Normalized work email may identify review candidates only; it is never an automatic merge key.
4. Personal email is never an automatic employment-identity key.
5. Ambiguous or conflicting rows stop that tenant batch.

This is deliberately stricter than runtime directory invitation matching. A one-time migration can be reviewed; a wrong employee merge can expose payroll, bank, leave, or medical data.

Manual reconciliation governance is a zero-unresolved-error cutover gate:

- normalized work email can create a candidate only; no email-only automatic merge is permitted;
- two distinct `AccessService`-authorized reviewers must approve every manual classification or field-precedence decision, including one organization data owner and one independently authorized HR/security reviewer;
- PII comparison occurs only in a separately authorized, masked-by-default review view; reveal is purpose-bound, short-lived, and access-audited, with no plaintext in logs, exports, comments, or manifests;
- the completed batch produces a signed, ID-only audit manifest containing the batch ID, source/canonical record IDs, resolution reason codes, reviewer IDs, decision timestamps, and integrity hashes/signature; it never contains names, emails, bank/tax values, or other PII;
- canonical canary requires zero unresolved source classifications, identity conflicts, sensitive-attribution items, mismatches, or any other reconciliation item; no severity threshold can waive one.

## Leave balance provenance

| Check | Result |
|---|---:|
| `leave_balances` rows | 5 |
| Organizations represented | 1 |
| Users represented | 1 |
| Leave types represented | 5 |
| Balance year | 2026 |
| Sum of positive balances | 94.20 days |
| Leave ledger rows | 0 |
| Missing membership references | 0 |
| Invalid leave-type references | 0 |

The repository has multiple balance writers:

- onboarding seeds balances from leave-type allowance (`backend/src/modules/hr/onboarding/core/onboarding.service.ts:483-502`);
- the leave page GET creates prorated balances (`backend/src/modules/hr/time/leaves-page.service.ts:60-75`);
- import upserts balances (`backend/src/modules/hr/import/hr-import-commit.service.ts:117-123`);
- comp-off and approval paths mutate balances directly.

The balance rows have no source, creation actor, or provenance timestamp that proves which path produced them. Therefore 94.20 days is an observed legacy balance, not a verified entitlement and not evidence of correct policy arithmetic.

Approval choice required:

- Recommended: create one idempotent `LEGACY_OPENING_BALANCE` ledger entry per existing balance, tagged with migration batch, source row, effective date, and `provenance_status='UNVERIFIED_LEGACY'`. Reconcile the projection exactly to 94.20 and require HR review before policy recalculation.
- Rejected: recalculate from current policy and overwrite the balance. That would silently change an employee entitlement without provenance.
- Rejected: start the ledger at zero. That would discard a live entitlement.

No leave row will be changed before this choice is approved.

## Sensitive data placement

| Global `users` field populated | Rows |
|---|---:|
| Tax identifier | 3 |
| Bank details | 3 |
| Salary | 0 |
| Date of birth | 3 |
| Emergency contact | 3 |

Global users have no tenant key. A user can belong to multiple organizations, so these values cannot be copied to every worker membership. Backfill requires a unique tenant/workforce attribution; ambiguous rows remain in compatibility storage and are reported for manual resolution. Values must be encrypted before entering the new worker-sensitive tables, and migration logs may contain only counts/checksums.

## Compatibility writer direction

Tenant employment data must never be projected from the canonical model back into global `users` employment fields. Those fields cannot represent different employment facts for one account across organizations. They remain frozen compatibility storage until every reader migrates to a tenant-scoped adapter; canonical commands may project only into tenant-scoped legacy stores with a stable legacy map.

Recruitment is also an active legacy writer: offer acceptance directly inserts or updates `hr_people` and `hr_employments` (`backend/src/modules/hr/recruitment/recruitment-handoff.service.ts:44-182`). Before a tenant can enter canonical write/read mode, that handoff must call the Workforce command boundary and receive the tenant-scoped HR projection transactionally. Deferring Recruitment internals or physical legacy removal does not authorize an independent legacy writer during canonical operation.

## Tenant and uniqueness preflight

| Check | Violations |
|---|---:|
| Normalized active directory work-email duplicates | 0 |
| Cross-tenant or orphan org-unit parent | 0 |
| Duplicate open attendance session | 0 |
| Active-primary engagement duplicates | 0 |
| Planned/active engagement overlap pairs | 0 |

Passing today does not remove the need for database constraints. These queries must rerun immediately before each validation/cutover gate.

## Duplicate stores

Both holiday families (`holidays`, `org_holidays`) and both device families (`biometric_devices`, `hr_time_devices`) contain zero rows. Empty tables lower data-migration risk, but they are not deletion proof: Phase 0 found active code consumers (`DEAD-002`). The proposal designates `org_holidays` and `hr_time_devices` as the eventual stores, with adapters and consumer migration before any contract step.

## Temporal-type inventory

Across the exact 45-table Phase 0 set listed in the row-count table of `hrms-core-phase-0-db-inventory-2026-08-10.md`, the live catalog has 37 `date` columns, 89 `timestamp without time zone` columns, and 2 `timestamp with time zone`/`timestamptz` columns. An in-place cast would guess whether each legacy value means UTC wall time or organization-local time. Phase 1 therefore requires a per-column conversion registry and sidecar/new-table backfill. Ambiguous columns stop rather than defaulting.

## Source-to-live drift correction

Phase 0 `SEC-006` described `roster_entries` and `onboarding_template_steps` as lacking direct tenant keys based on Drizzle source. The live database already has `org_id`, direct tenant RLS, tenant-leading indexes, and composite parent FKs on both tables. The source declarations in `backend/src/db/schema/hr/rosters.ts` and `backend/src/db/schema/hr/offboarding.ts` are stale.

Accordingly:

- no duplicate live `org_id` columns will be added;
- `SEC-006` is reclassified as a source/live drift instance under `SCH-016` for these two tables;
- the first implementation wave must synchronize Drizzle declarations and add schema-vs-live constraint tests;
- the migration runner must inspect live catalog state and be idempotent instead of assuming source declarations describe production.

The live catalog also contains duplicate-named composite FKs/unique constraints on portions of `organization_people`, `workers`, and `worker_engagements`. They are cleanup candidates only. Nothing may be dropped until dependency queries and repository/runtime reference proof are reviewed in the contract phase.

## Gate conclusion

The production data is compatible with an additive canonical-workforce migration, but it is not safe for unattended backfill. Canonical approval contract `HRMS-P1-APPROVAL-2026-08-11-v1` requires all eight normative lines verbatim:

1. **Canonical workforce and legacy compatibility:** approve `organization_people → workers → worker_engagements` as the tenant workforce authority; keep `users` for global authentication and `organization_members` for tenant access/RBAC; retain `hr_people`, `hr_employments`, and finalized HR/Payroll/Recruitment legacy mappings only as one-way tenant-scoped compatibility until Payroll and Recruitment migrate and independent zero-reference proof passes.
2. **Effective workforce history:** approve effective-dated assignment/reporting periods and append-only engagement-state events, including interval-wide cycle prevention and deterministic legacy snapshots; retained current fields are compatibility projections.
3. **Leave ledger and legacy opening balances:** approve the immutable leave ledger as authority and preserve the five live balances as deterministic `UNVERIFIED_LEGACY` opening entries reconciling exactly to 94.20 days; do not recalculate or discard them.
4. **Attendance event model and evidence retention:** approve append-only attendance events and the privacy-first evidence policy: raw location off by default; opt-in encrypted coordinates rounded to at most four decimals for 30 days; longer retention only under a named two-person audited legal hold reviewed at least every 90 days; no bulk export by default.
5. **Hierarchy adjacency plus closure:** approve adjacency as direct-parent truth plus a rebuildable tenant-scoped closure projection for descendant scope.
6. **Private-data separation and managed-KMS envelope encryption:** approve the public/private/sensitive split and managed-KMS envelope encryption; Batch D remains blocked until a separate ADR names and rehearses provider, custody/IAM, tenant/key hierarchy, associated data, rotation/rewrap, recovery/restore, break-glass, deletion, and fail-closed outage behavior; no environment-key/application-keyring fallback is approved.
7. **Zero-error manual reconciliation governance:** approve zero unresolved classifications, mismatches, or PII-attribution items before cutover; no email auto-merge or error threshold; every manual classification or field-precedence decision requires two distinct `AccessService`-authorized reviewers—one organization data owner and one independent HR/security reviewer—using masked, audited PII review and a signed ID-only manifest.
8. **Migration profile plus mandatory API/security/cache/UI pre-canary gates:** approve the organization-sticky expand-contract state machine and require tenant integrity/RLS, object-level `AccessService`/DataScope, safe DTO and sensitive-access audit, tenant/actor/access/scope/profile/wire cache isolation and clearing, exact route/sidebar/action/hook permission, and responsive/accessibility gates before any canonical canary.

Until all eight decisions are approved, production mutation status remains **none**.
