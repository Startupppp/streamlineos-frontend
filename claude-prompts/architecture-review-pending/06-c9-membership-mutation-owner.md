> **DONE 2026-09-10.** One owner shipped: `backend/src/common/org/membership-mutations.ts`.
> Direct `organization_members` writes outside it **19 → 0**; private-primitive import sites **14 → 0**.
> Gate `check:membership-writes` wired in `ci.yml`. Evidence and exemptions:
> `architecture-refactor/PRD-ARCHITECTURE-REVIEW-2026-09-10.md` § "C9 deepened 2026-09-10".
> Commits: backend `bf064570b` + `80068603c`, root `433711c6f`.
>
> **Required work**
> - [x] 1 — Inventory re-taken at HEAD `7d5c126df`: **19** Drizzle writes across **12** production files,
>       **14** private-primitive import sites. Raw SQL, jobs, scripts and transaction callbacks all swept;
>       raw DML appears only in seeds/drills/probes, each now a named exemption.
> - [x] 2 — Each write classified by intent and required effects; the classification is the operation set,
>       so the effects can no longer be selected independently of the write.
> - [x] 3 — One module, ten operations: create/accept · bootstrap owner · allocate id · change role ·
>       bulk change role · bulk create · set lifecycle (activate/suspend/archive) · transfer ownership ·
>       delete · delete-by-id. Plus four named invalidation operations for erase, purge, revoke and
>       ownership change. Smaller than the four-step protocol it replaced at 19 sites.
> - [x] 4 — Every operation owns its write **and** its invalidation; no caller sequences the primitives.
> - [x] 5 — Transaction boundaries unchanged (the owner wraps the caller's own transaction call);
>       `bumpPermissionsVersion` verified site by site, folded in only where the caller already had it.
> - [x] 6 — Revocation's immediate + after-commit double preserved, session key on **both** passes,
>       expressed as `revokeMembershipAccessCaches`.
> - [x] 7 — After-commit fallback outside ambient request transactions preserved; draining after the
>       caller's transaction call is what keeps it correct (see the PRD for why draining inside is wrong).
> - [x] 8 — Batched commands preserved and widened: one `bustMembershipStatusCacheMany` for any N.
>       No per-user `Promise.all` fanout remains.
> - [x] 9 — Domain operations stayed in their domain and now invoke one boundary that cannot omit
>       invalidation.
> - [x] 10 — `check:membership-writes` rejects Drizzle writes, raw DML, private-primitive imports and
>       hand-built mutators outside the owner; 6 write + 3 primitive exemptions, each with a reason.
> - [x] 11 — The three bust primitives are private to the owner; four named operations replace them.
>
> **Tests that must bite**
> - [x] Each state/role/ownership mutation updates the row and schedules the correct bust through one call
>       (real SQL rendered via a pg-proxy Drizzle, so the write is observed, not assumed).
> - [x] Removing the write fails state assertions; removing the invalidation fails cache assertions —
>       **proved by mutation**: 5 defects planted in the owner, 5 caught, 0 silent.
> - [x] A rolled-back transaction publishes no ordinary after-commit bust (mutant: drain in a `finally` → caught).
> - [x] Revocation busts immediately and again after commit, closing the repopulation window.
> - [x] Bulk changes use bounded Redis operations independent of member count (250 / 120 / 5,000).
> - [x] GDPR, purge, invitation acceptance, ownership transfer, onboarding and user administration retain
>       their domain effects: `organization` 515, `gdpr` 243, `users` 66, `ownership` 57, `common/org` 42,
>       migrated HR specs 27 — all passing.
> - [x] Direct production writes outside the owner fail the architecture gate — **proved end to end**, not
>       just at the matcher: each of the four shapes planted in a real production file drove the gate to
>       exit 1, and the tree returned to exit 0.
>
> **Not run:** lint and the e2e suite — never requested. Whole-repo `tsc` is red from four peer sessions'
> uncommitted work; HEAD **plus only these files** typechecks at **0 errors** (verified on a clean overlay).

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
