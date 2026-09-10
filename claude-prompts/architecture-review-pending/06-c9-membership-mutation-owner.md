> **DONE 2026-09-10.** One owner shipped: `backend/src/common/org/membership-mutations.ts`.
> Direct `organization_members` writes outside it **19 → 0**; private-primitive import sites **14 → 0**.
> Gate `check:membership-writes` wired in `ci.yml`. Evidence and exemptions:
> `architecture-refactor/PRD-ARCHITECTURE-REVIEW-2026-09-10.md` § "C9 deepened 2026-09-10".

# Complete C9: one owner for membership writes and cache invalidation

Work directly in the StreamlineOS repository and finish the migration end to end. Read applicable `CLAUDE.md` files before editing, preserve unrelated changes, and do not commit or push unless explicitly requested.

## Source and objective

The source requirement is candidate C9 in:

`C:/Users/Aditya_Lappy/AppData/Local/Temp/architecture-review-20260909-233331.html`

`backend/src/common/org/membership-bust.ts` centralizes invalidation scheduling, but callers can still write an organization membership and forget to call it. Introduce a deep mutation owner whose public operations couple the database write, permission-version effects, transaction semantics, and required invalidation.

Known areas include organization membership/invitations/setup/lifecycle/purge, users, HR onboarding/bulk onboarding, GDPR erasure, ownership transfer, and cron purge. Re-inventory current HEAD instead of relying on an old count.

## Required work

1. Find every production insert, update, delete, soft delete, status change, role change, owner change, and bulk mutation involving organization memberships. Include raw SQL, Drizzle query builders, helpers, jobs, scripts, and transaction callbacks.
2. Classify each write by domain intent and required side effects: membership-status cache, session cache, effective-access cache/version, role assignments, invitations, audit, and notifications.
3. Introduce one canonical membership mutation module with intention-revealing operations such as create/accept, activate, suspend, revoke, change role, transfer ownership, erase, purge, and bulk update. Keep the public interface smaller than the combined caller protocol.
4. Each operation must own the membership write and required authorization-cache invalidation. Callers must not sequence those primitives manually.
5. Preserve existing transaction boundaries and `bumpPermissionsVersion` behavior.
6. Preserve revocation's deliberate immediate plus after-commit invalidation, including session keys.
7. Preserve after-commit fallback outside ambient request transactions.
8. Preserve batched cache commands for bulk operations; avoid per-user `Promise.all` fanout.
9. Keep domain-specific operations in their owning domain when necessary, but make them invoke a single mutation boundary that cannot omit invalidation.
10. Add an architecture/static gate that rejects direct organization-membership writes outside the canonical owner and narrowly documented migration/bootstrap exemptions.
11. Remove obsolete public cache-bust primitives or make them private to the mutation owner when migration is complete.

## Tests that must bite

Add integration/composition tests proving:

- Each membership state/role/ownership mutation updates the row and schedules the correct bust through one public call.
- Removing the write fails state assertions; removing invalidation fails cache assertions.
- A rolled-back transaction does not publish an ordinary after-commit bust.
- Revocation busts immediately and again after commit, closing the repopulation window.
- Bulk changes use bounded Redis operations independent of member count.
- GDPR, purge, invitation acceptance, ownership transfer, onboarding, and user administration retain their existing domain effects.
- Direct production writes outside the canonical owner fail the architecture gate.

## Verification and completion

Migrate in cohesive batches and run focused tests after each. At the end run backend typecheck, membership/auth/access suites, transaction and cache tests, security/tenant-isolation tests, architecture checks, permission checks, and dependency-cycle checks. Inspect the final write inventory and account for every exemption.

The task is complete only when a production caller cannot change an organization membership through an approved interface without receiving the required invalidation semantics. Report before/after direct-write counts, migrated operations, exemptions, Redis-call behavior, and exact verification results.
