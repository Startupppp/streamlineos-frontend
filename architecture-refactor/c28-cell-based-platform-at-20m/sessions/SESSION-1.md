# Session 1 — Authorization core

**Read in this order, then act.** Do not skip a step; step 3 is where the whole session is decided.

1. [`PROTOCOL.md`](PROTOCOL.md) — binding. Especially §1 (ask everything now) and §2 (a checkbox is evidence).
2. Root `CLAUDE.md`, then `backend/CLAUDE.md`.
3. Your eight tickets, in full: [`../issues/`](../issues/) files `01` through `08`.
4. [`../README.md`](../README.md) — the candidate index and the four grounding facts.

## Your tickets

Eight, and every blocking edge is inside this session — nothing here waits on another session.

| # | Ticket | Blocked by |
|---|---|---|
| 01 | The request knows which membership it is | — |
| 02 | A principal declares what kind of thing it is | 01 |
| 03 | A permission snapshot cannot outlive its grant | 01 |
| 04 | Delegations and module overrides are keyed to the membership | 01 |
| 05 | A machine credential is membership-keyed and bounded by a ceiling | 02, 04 |
| 06 | Removing a membership removes everything derived from it | 04, 05 |
| 07 | Owner-only operations are enumerated, not implied | — |
| 08 | A module transfer records its initiator and its expected current owner | 07 |

**Suggested order:** `01` and `07` first (both unblocked; 07 is small and unlocks 08). Then `02`, `03`,
`04` — independent of each other. Then `05` and `08`. Then `06`, which is the enumeration that proves
04 and 05 actually took.

`06` is the ticket that justifies the other seven. Do not let it become a leftover.

## Ask these first — plus anything else you find

1. **Where does the membership id live?** On the access-snapshot payload, or resolved beside it?
   *Recommend: on the snapshot* — one cache entry, one invalidation signal. Two caches with different
   invalidation is how the temporal bug in `03` exists at all.
2. **What does `agent_tokens.tokenScopes === null` mean today, and what should it mean?** Find the
   current behaviour by reading `modules/access/authorize.ts` before asking — then ask whether null-scope
   tokens exist in production that a deny-all reading would break.
   *Recommend: after `05`, null means the issuer's live capability intersected with an explicit ceiling,
   never unbounded inheritance.*
3. **Confirm the owner-only list for `07`.** Candidates: ownership transfer · organization deletion and
   scheduled purge · legal hold · terminal security controls · the billing relationship. Anything to add
   or remove? Watch for the inverse defect — something gated on the owner that has no business being,
   which locks a large organization out of its own administration.
4. **Does `03`'s `valid_until` cap on permission-group membership changes too, or only on role and
   delegation start/end?** *Recommend: role and delegation only* — group changes already bump
   `accessVersion`, which converges within the 5 s explicit-revocation budget.

## Territory

**Yours, exclusively:**

- `backend/src/modules/access/**`
- `backend/src/common/rbac/**`
- `backend/src/common/auth/**` — *except* `verify-permission-catalog.mjs`, which S4 deletes
- `backend/src/modules/module-access/**`
- `backend/src/db/schema/common/agent-tokens.ts`
- `backend/src/modules/rbac/permissions/**` and `frontend/lib/rbac/permissions/**`
- `frontend/hooks/api/access.ts`, `frontend/lib/rbac/**`
- These three files, **for the `isOrgOwner: true` fabrication only** — change nothing else in them:
  `modules/payroll/payout/payout-run-completion.ts:202`, `modules/payroll/payout/locking.service.ts:83`,
  `modules/integrations/git/integrations-git.service.ts:23`

**Shared file — `backend/src/db/schema/common/auth.ts`.** You own the `organizationMembers`,
`userDelegations` and `userDelegationPermissions` blocks. **S2 owns `users`. S3 owns `organizations`.**
Re-read before editing, edit only your blocks, never reformat, commit it immediately.

**Not yours:** anything under `modules/hr`, `modules/directory`, `modules/users`, `common/region`,
`common/tenant`, `frontend/lib/query-keys`, `main.ts`. Need a change there? Report it, do not make it.

## Traps in this territory

- **`PermissionGuard` is not global.** A generated `:access:` key produces a false positive when you
  check coverage — this exact false positive has been resolved once already; do not re-raise it.
- **Owner bypass masks non-owner 403s.** Probe every change with `isOrgOwner: false`. That probe is what
  found a 21-module 403 here.
- **A zero grant restores defaults** rather than denying. Check that before treating an empty set as a lock.
- **Org admin is derived from a permission key.** Grep the constant, not the helper that reads it.
- **Session revocation needs the Redis tombstone.** `userSessions.isRevoked` logs nobody out — the guard
  reads only `revoked:session:<id>`. And the obvious one-line fix (DB fallback when the tombstone is
  null) was tried and reverted: it adds a database round trip to *all* traffic.
- **Ticket 06's realtime surface is a P0.** An Ably capability granting `chat:${orgId}:*` outlives a
  membership unless it is explicitly withdrawn.
- **`*e2e-spec` files do not run in the default suite.** The RBAC route tables in them are not executed
  coverage unless you run `pnpm -C backend test:e2e`. The e2e suite was entirely dead here for years —
  116 controller specs proving nothing — until the `createE2eApp` harness landed. Use it.
- **Drizzle conditions are circular**: `JSON.stringify` on a captured condition throws, which silently
  killed two prompt-injection tests. Render with `PgDialect.sqlToQuery`.
- **A resolver without an actor cannot check access.** `resolve()` now takes one — keep it that way, and
  grep signatures rather than call sites.
- **The frontend permission array is a subset by design.** The 206-key "gap" is intentional and tested.
  Do not re-raise it as drift.

## Definition of done for this session

- All eight tickets' criteria either ticked with pasted evidence, or left open with a written reason.
- `NODE_OPTIONS=--max-old-space-size=8192 pnpm -C backend exec tsc --noEmit` clean.
- The unit suites for `modules/access`, `common/rbac` and `modules/module-access` pass, plus
  `pnpm -C backend test:e2e` for the guard and route-table specs.
- `pnpm exec madge --circular` still zero in the backend.
- Ticket `06`'s enumeration exists as a written list, and its test fails when a new artifact type is added
  without being handled.
- A commit per closed ticket, pathspec-scoped.
