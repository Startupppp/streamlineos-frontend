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

- [ ] Review the 318 actor allowlist entries against current readers. Every entry must be historical/display-only and absent from authorization, scope, approval routing, uniqueness, cache identity, search ACL, or revocation logic. Add biting scanner fixtures for stale and misclassified entries.
- [ ] Replace the three single-column invitation foreign keys for inviter, accepter, and revoker membership with tenant-composite `(org_id, membership_id) -> organization_members(org_id, id)` constraints. Use orphan reports, deterministic repair, `NOT VALID` then `VALIDATE`, and correct `ON DELETE` semantics.
- [x] Remove the redundant single-column Event Attendee membership FK from schema generation while retaining the existing tenant-composite relationship. Current schema declares only `(org_id, membership_id)` and `(org_id, event_id)` foreign keys.
- [ ] Verify every new actor migration has bounded deterministic backfill, unmappable/duplicate/cross-tenant reports, indexes, journal order, rollback or explicit irreversibility, and zero-use proof before a compatibility-column drop.
- [ ] On chat channel member removal, durably revoke the removed principal's existing Ably tokens after commit (or implement an equivalent channel-specific revocation guarantee), then mint capabilities from current membership only.
- [ ] Make provider failure retryable through the outbox/DLQ path; a fire-and-forget capability refresh is not sufficient.
- [ ] Add negative tests for cross-org invitation memberships, removed/revoked memberships, account-only principals, duplicate mapping, and a removed channel member attempting publish and subscribe with a previously minted token.
- [ ] Prove organization owner/admin/member and module owner/admin/member grant, transfer, self-escalation, descendant-route, direct-grant, and revocation behavior remains unchanged.
- [ ] Re-run backend build/spec typechecks and focused organization, RBAC, chat, calendar, HR, payroll, billing and accounting authority tests.

## Exit criteria

- [x] Actor scanner is zero: 434 legacy organizational fields = 318 display-only + 116 excluded CRM/Inventory + 0 actionable. The separate allowlist-reader audit above remains open, so this checkbox records scanner state rather than approving every classification.
- [ ] No tenant-owned membership FK permits an organization mismatch.
- [ ] Channel removal denies publish/subscribe before the next protected operation, including provider retry behavior.
- [ ] Migration ledger/chain and all focused/typecheck gates pass at the recorded commit.

## Audit evidence — 2026-09-01

Completed and preserved:

- [x] Owner-authority gate: 9/9 owner-only operations enforced; no fabricated ownership.
- [x] Permission catalog: 3,105 guarded usages resolve to the backend catalog and frontend permission union.
- [x] DataScope application: 129/129 resolutions reach a predicate.
- [x] Record-access and module-gate checks pass.
- [x] Event Attendee schema no longer generates a single-column membership FK.

Still pending from current source:

- [ ] `invitations.inviter_membership_id`, `accepted_membership_id`, and `revoked_by_membership_id` still use single-column references in `db/schema/common/auth.ts`; add tenant-composite constraints and migration proof.
- [ ] Chat member removal still fire-and-forgets `realtime:capability:refresh`; it neither durably revokes already-minted Ably tokens nor retries through an outbox/DLQ.
- [ ] Add the previously-minted-token publish/subscribe denial tests; no matching chat/realtime spec currently proves this behavior.
- [ ] Add `MEMBERSHIP_ARTIFACTS` removal rulings for 28 new HR membership FKs; `check:restrict-fks` currently fails.
- [ ] Add a cross-tenant negative test for `hr/recruitment/recruitment-vendor-sourcing.service.ts`; `check:tenant-isolation` currently fails on this sole uncovered module.
- [ ] Finish actor-cutover caller reconciliation. Backend type-check currently reports 177 errors across 61 production files and spec-inclusive type-check reports 260 errors across 98 files, largely from removed legacy actor columns and changed cursor contracts.
