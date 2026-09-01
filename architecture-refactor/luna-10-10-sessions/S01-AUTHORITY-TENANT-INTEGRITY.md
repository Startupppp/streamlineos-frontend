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
- [ ] Remove the redundant single-column Event Attendee membership FK from schema generation while retaining the existing tenant-composite relationship.
- [ ] Verify every new actor migration has bounded deterministic backfill, unmappable/duplicate/cross-tenant reports, indexes, journal order, rollback or explicit irreversibility, and zero-use proof before a compatibility-column drop.
- [ ] On chat channel member removal, durably revoke the removed principal's existing Ably tokens after commit (or implement an equivalent channel-specific revocation guarantee), then mint capabilities from current membership only.
- [ ] Make provider failure retryable through the outbox/DLQ path; a fire-and-forget capability refresh is not sufficient.
- [ ] Add negative tests for cross-org invitation memberships, removed/revoked memberships, account-only principals, duplicate mapping, and a removed channel member attempting publish and subscribe with a previously minted token.
- [ ] Prove organization owner/admin/member and module owner/admin/member grant, transfer, self-escalation, descendant-route, direct-grant, and revocation behavior remains unchanged.
- [ ] Re-run backend build/spec typechecks and focused organization, RBAC, chat, calendar, HR, payroll, billing and accounting authority tests.

## Exit criteria

- [ ] Actor scanner is zero with no untracked or dishonest classification.
- [ ] No tenant-owned membership FK permits an organization mismatch.
- [ ] Channel removal denies publish/subscribe before the next protected operation, including provider retry behavior.
- [ ] Migration ledger/chain and all focused/typecheck gates pass at the recorded commit.
