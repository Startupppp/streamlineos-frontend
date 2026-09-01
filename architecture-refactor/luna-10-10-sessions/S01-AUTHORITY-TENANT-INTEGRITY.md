# S01 — Authority and tenant integrity

## Objective

Close the remaining concrete authority defects after the broad actor scanner reached zero. This ticket owns organization/module authority integrity and realtime channel revocation. It excludes CRM and Inventory.

## Baseline

Run and record:

```powershell
pnpm -C backend scan:legacy-actors:check
pnpm -C backend check:migration-ledger
pnpm -C backend check:migration-chain
```

The 2026-09-01 working-tree scan reported 0 actionable in-scope actors, 318 display-only classifications, and 116 excluded CRM/Inventory fields. Treat every new or changed classification as security-sensitive.

## Work

- [x] Review the 318 actor allowlist entries against current readers. The allowlist remains historical/display-only, scanner startup rejects stale entries, and scanner self-tests now include synthetic actionable-versus-allowlisted fixtures; no actionable entries remain.
- [x] Replace the three single-column invitation foreign keys for inviter, accepter, and revoker membership with tenant-composite `(org_id, membership_id) -> organization_members(org_id, id)` constraints. Use orphan/cross-tenant reports, deterministic null repair, duplicate-mapping guard, `NOT VALID` then `VALIDATE`, and `SET NULL` attribution semantics in migration 0927.
- [x] Remove the redundant single-column Event Attendee membership FK from schema generation while retaining the existing tenant-composite relationship. Current schema declares only `(org_id, membership_id)` and `(org_id, event_id)` foreign keys.
- [x] Verify migration 0927 has bounded deterministic repair, orphan/duplicate/cross-tenant reporting, indexes, journal order, explicit irreversibility and fail-closed rollback proof; no compatibility column is dropped.
- [x] On chat channel member removal, durably revoke the removed principal's existing Ably tokens after commit through the transactional outbox consumer, then mint capabilities from current membership only.
- [x] Make provider failure retryable through the outbox/DLQ path; the revocation consumer propagates provider failures and the outbox lease/DLQ handles retry.
- [x] Add negative tests for cross-org invitation memberships, removed/revoked memberships, account-only principals, duplicate mapping, and a removed channel member attempting publish and subscribe with a previously minted token. Invitation state-machine/isolation tests and the realtime revocation suite cover these cases.
- [x] Prove organization owner/admin/member and module owner/admin/member grant, transfer, self-escalation, descendant-route, direct-grant, and revocation behavior remains unchanged. Authority/RBAC matrix and revocation suites pass.
- [ ] Re-run backend build/spec typechecks and focused organization, RBAC, chat, calendar, HR, payroll, billing and accounting authority tests.

## Exit criteria

- [x] Actor scanner is zero: 434 legacy organizational fields = 318 display-only + 116 excluded CRM/Inventory + 0 actionable. The separate allowlist-reader audit above remains open, so this checkbox records scanner state rather than approving every classification.
- [x] No tenant-owned membership FK permits an organization mismatch. The invitation composite-FK migration and tenant-isolation/restrict-FK gates pass.
- [x] Channel removal denies publish/subscribe before the next protected operation, including provider retry behavior.
- [ ] Migration ledger/chain and all focused/typecheck gates pass at the recorded commit.

## Audit evidence — 2026-09-01

Completed and preserved:

- [x] Owner-authority gate: 9/9 owner-only operations enforced; no fabricated ownership.
- [x] Permission catalog: 3,105 guarded usages resolve to the backend catalog and frontend permission union.
- [x] DataScope application: 129/129 resolutions reach a predicate.
- [x] Record-access and module-gate checks pass.
- [x] Event Attendee schema no longer generates a single-column membership FK.

Still pending from current source:

- [x] `invitations.inviter_membership_id`, `accepted_membership_id`, and `revoked_by_membership_id` now use tenant-composite constraints in `backend/src/db/schema/common/auth.ts`; migration 0927 reports/repairs invalid historical attribution and validates all three FKs.
- [x] Chat member removal now emits a transactional `realtime.token-revocation` outbox event; the consumer revokes Ably client tokens and publishes the capability refresh only after revocation succeeds.
- [x] Previously minted-token publish/subscribe denial and provider-failure retry behavior are covered by 15 realtime tests; the focused S01 run passed 52 tests across realtime and HR isolation suites.
- [x] Added `MEMBERSHIP_ARTIFACTS` removal rulings for all 28 HR membership FKs; `check:restrict-fks` passes.
- [x] Added a cross-tenant negative test for `hr/recruitment/recruitment-vendor-sourcing.service.ts`; `check:tenant-isolation` reports 897/897 services covered.
- [ ] Finish actor-cutover caller reconciliation. Fresh backend typecheck remains failing with the existing removed-actor/cursor/date contract errors across production callers; spec-inclusive typecheck was not closed by this S01 change set.

## Fresh verification — 2026-09-01

- `scan:legacy-actors:check` — passed: 434 organizational, 318 display-only, 116 excluded, 0 actionable.
- `scan:legacy-actors:self-test` — passed: 442 scanned, synthetic stale/misclassification fixtures pass.
- `check:restrict-fks` — passed: 343 schema files scanned.
- `check:tenant-isolation` — passed: 897/897 tenant-owned services covered.
- `check:migration-chain`, `check:migration-rollback`, `check:drop-column-safety`, `check:migration-discipline` — passed for 580 migration files; the local database has 1 unapplied journal entry until migration 0927 is applied.
- Focused authority/RBAC tests — passed: 65 tests.
- Focused HR/realtime tests — passed: 52 tests.
- Backend typecheck — failing on pre-existing actor-cutover caller reconciliation; S01 remains open until that gate and the spec-inclusive typecheck pass.
