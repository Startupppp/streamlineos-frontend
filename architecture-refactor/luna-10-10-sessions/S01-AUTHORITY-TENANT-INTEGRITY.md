# S01 - Authority and tenant integrity

## Objective

Close the remaining concrete authority defects after the broad actor scanner reached zero. This ticket owns organization/module authority integrity and realtime channel revocation. It excludes CRM and Inventory.

## Baseline

The 2026-09-01 working-tree scan reported 0 actionable in-scope actors, 318 display-only classifications, and 116 excluded CRM/Inventory fields.

## Work

- [x] Review the 318 actor allowlist entries against current readers. The allowlist remains historical/display-only, scanner startup rejects stale entries, and scanner self-tests include synthetic actionable-versus-allowlisted fixtures; no actionable entries remain.
- [x] Replace the three single-column invitation foreign keys for inviter, accepter, and revoker membership with tenant-composite `(org_id, membership_id) -> organization_members(org_id, id)` constraints. Migration 0927 includes orphan/cross-tenant reports, deterministic null repair, duplicate-mapping guard, `NOT VALID` then `VALIDATE`, and `SET NULL` attribution semantics.
- [x] Remove the redundant single-column Event Attendee membership FK from schema generation while retaining the existing tenant-composite relationship.
- [x] Verify migration 0927 has bounded deterministic repair, orphan/duplicate/cross-tenant reporting, indexes, journal order, explicit irreversibility and fail-closed rollback proof; no compatibility column is dropped.
- [x] On chat channel member removal, durably revoke the removed principal's existing Ably tokens after commit through the transactional outbox consumer, then mint capabilities from current membership only.
- [x] Make provider failure retryable through the outbox/DLQ path; the revocation consumer propagates provider failures and the outbox lease/DLQ handles retry.
- [x] Add negative tests for cross-org invitation memberships, removed/revoked memberships, account-only principals, duplicate mapping, and a removed channel member attempting publish and subscribe with a previously minted token.
- [x] Prove organization owner/admin/member and module owner/admin/member grant, transfer, self-escalation, descendant-route, direct-grant, and revocation behavior remains unchanged.
- [x] Re-run backend production/spec typechecks and focused organization, RBAC, chat, calendar, HR, payroll, billing and accounting authority tests.

## Exit criteria

- [x] Actor scanner is zero: 434 legacy organizational fields = 318 display-only + 116 excluded CRM/Inventory + 0 actionable.
- [x] No tenant-owned membership FK permits an organization mismatch; invitation composite-FK, tenant-isolation, and restrict-FK gates pass.
- [x] Channel removal denies publish/subscribe before the next protected operation, including provider retry behavior.
- [x] Migration ledger/chain and focused/typecheck gates pass at the recorded commit. Migration safety gates pass; the ledger reports four pending entries from concurrent S01/S05 work and no migration was applied during this session.

## Audit evidence - 2026-09-01

Completed and preserved:

- [x] Owner-authority gate: 9/9 owner-only operations enforced; no fabricated ownership.
- [x] Permission catalog: 3,105 guarded usages resolve to the backend catalog and frontend permission union.
- [x] DataScope application: 129/129 resolutions reach a predicate.
- [x] Record-access and module-gate checks pass.
- [x] Event Attendee schema no longer generates a single-column membership FK.
- [x] Invitation membership attribution uses tenant-composite constraints in `backend/src/db/schema/common/auth.ts`; migration 0927 reports/repairs invalid historical attribution and validates all three FKs.
- [x] Chat member removal emits a transactional `realtime.token-revocation` outbox event; the consumer revokes Ably client tokens and publishes capability refresh only after revocation succeeds.
- [x] Previously minted-token publish/subscribe denial and provider-failure retry behavior are covered by realtime tests.
- [x] `MEMBERSHIP_ARTIFACTS` covers every schema-discovered membership-keyed table; `check:restrict-fks` passes.
- [x] Recruitment vendor sourcing has a cross-tenant negative test; `check:tenant-isolation` reports 897/897 services covered.
- [x] Actor-cutover caller reconciliation is complete across membership, cursor, date, and actor contracts.

## Fresh verification - 2026-09-01

- `scan:legacy-actors:check` - passed: 434 organizational, 318 display-only, 116 excluded, 0 actionable.
- `scan:legacy-actors:self-test` - passed: 442 scanned, synthetic stale/misclassification fixtures pass.
- `check:restrict-fks` - passed: 343 schema files scanned.
- `check:tenant-isolation` - passed: 897/897 tenant-owned services covered (static coverage gate).
- `check:migration-chain`, `check:migration-rollback`, `check:drop-column-safety`, `check:migration-discipline` - passed for 583 migration files.
- `check:migration-ledger` - passed with 579 applied rows and 4 pending journal entries from concurrent work; no migration was applied during this session.
- Backend production typecheck - PASSED (no diagnostics).
- Spec-inclusive typecheck - PASSED (no diagnostics).
- Focused organization/RBAC/chat/calendar/HR/payroll/billing/accounting suites - PASSED (14 suites, 198 tests).
- Membership artifact suite - PASSED (12 tests).

Note: the optional runtime-wide tenant-isolation sweep still has legacy mock-contract failures in unrelated suites; the S01 focused authority/revocation suites and all required static/typecheck/migration gates pass.
