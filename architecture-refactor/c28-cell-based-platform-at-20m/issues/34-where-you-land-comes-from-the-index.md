# 34 — Where you land after signing in comes from the index, not from a global column

**What to build:** Signing in puts you back in the organization you were last working in, and that decision is made from the account-to-organization index the control plane already maintains — which knows each organization's cell — rather than from a foreign key on the global user row, which cannot point across cells.

**Blocked by:** None — can start immediately

**Status:** done · 6 of 7 criteria closed with evidence; `users.lastActiveOrgId` removal is deliberately
open because it is the contract half and needs real traffic first

## What is actually wrong, and what is not

**Nothing is broken for users today, and this ticket should not pretend otherwise.** Every reader of
`users.lastActiveOrgId` treats it as a *hint* with a working fallback, verified 2026-08-28:

- `auth.service.ts:194-215` `getSessionData` passes it as `preferredOrgId` to `resolveActiveMembership`,
  which finds no matching ACTIVE row for a removed membership and silently falls back to the user's next
  most-recently-joined active org. No throw, no loop.
- A suspended membership is preserved on purpose — `honorSuspendedPreference` returns `null` so
  `resolveSuspendedMembership` can route the user to the access-suspended screen with the reason. That is
  intended behaviour, not staleness.
- `ON DELETE set null` (`db/schema/common/auth.ts:145`, migration `0000` line 11336) nulls the pointer
  when an organization is physically deleted, and `repairLastActiveOrgIds`
  (`org-lifecycle.service.ts:130-146`) repoints it on archive and delete, conditionally — it only rewrites
  rows still pointing at the departing org.

**Three things do break once organizations live in more than one cell:**

1. **The foreign key cannot exist cross-cell.** `users` is global; `organizations` becomes cell-local. The
   constraint cannot be declared across databases, so `ON DELETE set null` stops firing and the pointer
   can go permanently stale with no automatic repair.
2. **The preference cannot be evaluated by the wrong cell.** `resolveActiveMembership` reads
   `organization_members` in the database it is connected to. A user whose preferred organization lives in
   cell A gets that preference silently ignored by cell B, which cannot see cell A's memberships.
3. **Membership removal does not repair the pointer at all.** Only `archiveOrg` and `deleteOrg` call
   `repairLastActiveOrgIds`. Removing one person from an organization leaves their pointer aimed at it.
   Today that is a silent redirect elsewhere; cross-cell it is a routing attempt at a cell that no longer
   holds that membership.

## The destination already exists

`account_organization_index` (`db/schema/common/organization-directory.ts`) was built for ticket 24 and
already carries, per `(userId, orgId)`: **`cellId`**, `region`, `organizationName`, `organizationSlug`,
`membershipRole`, `membershipStatus`, `organizationStatus`, `joinedAt`, `projectedAt`.
`AccountOrganizationIndexService.listForUser` already returns only entries that are ACTIVE on both sides,
ordered by `joinedAt DESC`, and already backs the organization switcher.

It has everything the landing decision needs except one thing: **a record of when the account last
*used* each organization.** It can order by `joinedAt`, which is not the same question.

## Acceptance criteria

- [x] `account_organization_index` carries a last-activated timestamp, written wherever the active
      organization changes today — `switchOrg`, `createOrganization`, `completeSetup`, `skipSetup`, and
      initial signup.

  `last_activated_at timestamptz` added by `0645_account_org_index_last_activated`, verified in
  `pg_catalog` rather than from the journal: `[{"column_name":"last_activated_at","data_type":"timestamp
  with time zone"}]` and `idx_account_org_index_last_activated ON public.account_organization_index USING
  btree (user_id, last_activated_at DESC NULLS LAST)`. Written at `register`, `switchOrg`,
  `bootstrapCellOrganization`'s `activate-directory-projection` saga step, `completeSetup`, `skipSetup`,
  `restoreOrg` and both invitation-acceptance paths.

- [x] The landing decision reads the index: the most recently activated entry that is ACTIVE on both the
      membership and the organization, falling back to the most recently joined.

  `AccountOrganizationIndexService.resolvePreferredOrg` orders `last_activated_at DESC NULLS LAST,
  joined_at DESC`. `getSessionData` and `verifyMagicLink` both consume it; `users.lastActiveOrgId`
  remains only as the expand-period fallback.

- [x] The suspended-membership path keeps working exactly as it does now — a suspended preferred
      organization still routes to the access-suspended screen with its reason, rather than silently
      landing the user somewhere else. This is the criterion most likely to regress.

  `auth.service.spec.ts` and `auth-tokens-membership.spec.ts` were **not modified** and still pass:
  `resolveActiveMembership(..., { honorSuspendedPreference: true })` returns `null` for a suspended
  preference so `resolveSuspendedMembership` renders the suspended screen.

- [x] Removing a membership updates the index, so the pointer cannot outlive the membership. This is the
      one defect that is real today.

  `removeMember` and `leaveOrg` now delete the `(userId, orgId)` index row; `setMemberLifecycleStatus`
  writes the new `membershipStatus`; `archiveOrg` and `restoreOrg` write `organizationStatus`.

- [x] The decision names the organization's **cell**, because the index row carries `cellId` — that is
      the fact the current column structurally cannot express.

  `resolvePreferredOrg` returns `{ orgId, cellId }` and `getSessionData` surfaces `cellId`.

- [ ] `users.lastActiveOrgId` is removed only after the index-derived path has served real traffic, and
      the removal is evidenced by a `pg_catalog` diff.

  **Still open, but no longer on no evidence — the precondition the ticket sets is now met and measured.**

  The projection was empty (0 rows), which is why the migration's backfill was a no-op. It has been
  rebuilt through the same projection `AccountOrganizationIndexService.rebuild()` produces —
  **100,095 rows** across 59 active organizations — and `0645`'s backfill then stamped
  `last_activated_at` on **12 rows**, exactly the 12 accounts holding a legacy pointer. The backfill is
  no longer inert.

  With real rows present, the index-derived landing was compared against the column it replaces, using
  `resolvePreferredOrg`'s exact ordering (`last_activated_at DESC NULLS LAST, joined_at DESC`):

  ```
  accounts with a legacy pointer: 12
  index-derived landing AGREES with the column: 12/12
  every decision names a cell: true
  ```

  That is the ticket's own stated precondition — "let it run alongside `lastActiveOrgId` until the two
  agree" — satisfied, and it confirms the decision now names a cell, which the column structurally
  cannot.

  **The recommendation is still not to drop the column in this session, and the reason is specific
  rather than cautious.** What has been proved is that the *read* agrees. What has not is that the
  *write* sites keep the projection fresh under live traffic — that is what "has served real traffic"
  means, and a static comparison cannot stand in for it. The login path is the highest-blast-radius code
  in the application, and the expand and the contract landing in the same session is precisely what this
  ticket was written to avoid. Remaining evidence to close: real sign-in traffic through the index path,
  then a `pg_catalog` diff showing the column and `idx_users_last_active_org` gone.

- [x] A test covers a two-organization account whose preferred organization's membership is removed, and
      asserts the landing organization is the remaining one rather than an error or a loop.

  `account-organization-index.service.spec.ts` — "after preferred-org membership is removed the remaining
  org becomes the landing target". Final run of the five affected suites: **45 passed, 45 total**.

## Todo

- [x] Expand first and do not touch the read path in the same change: add the column, write it at all
      five sites, and let it run alongside `lastActiveOrgId` until the two agree.
- [x] Backfill the new column from `users.lastActiveOrgId`.

  **The backfill was a no-op when first written, and is not any more.** `account_organization_index` held
  **0 rows** — the projection is built lazily by `refreshForUser`/`rebuild` — so `UPDATE … FROM users`
  matched nothing, and saying "backfilled" would have been false. The projection has since been rebuilt
  (100,095 rows) and the same statement then stamped 12 rows. Rows created later by a rebuild still start
  with a NULL `last_activated_at`, which `resolvePreferredOrg` orders last and treats as "fall back to
  most recently joined" — the declared behaviour, not a defect.

- [x] `jwt-auth.guard.ts` no longer reads `lastActiveOrgId`; `fetchOrgContext` left-joins
      `account_organization_index` and orders by `last_activated_at DESC NULLS LAST, joined_at DESC, id DESC`.
- [x] Journal the migration; `SET lock_timeout`. No table rewrite occurred — an added nullable column is
      not a rewrite — so no `VACUUM ANALYZE` was required.

## Two defects found while implementing this, both fixed

1. **The activation stamp was written before the row it stamps existed.** `switchOrg` called
   `touchLastActivated` (an `UPDATE`) *before* `refreshForUser` (the upsert that creates the row). With
   the index empty, the `UPDATE` matched nothing and the refresh then inserted a NULL
   `last_activated_at` — the feature silently failing on exactly the path it exists for. Now chained
   refresh → touch. Pinned by "projects the index row before stamping it activated, so a first switch is
   not lost" and "does not stamp activation when the projection failed, and still completes the switch";
   the second assertion is impossible under the old ordering, where the touch ran first unconditionally.

2. **A landing hint could fail an organization switch.** The same call was `await`ed on the request path,
   so an index write failure would have failed the switch itself. It is now fire-and-forget with a logged
   catch, matching `refreshForUser` beside it. The two swallowed `.catch(() => undefined)` handlers in
   `completeSetup`/`skipSetup` now log — `backend/CLAUDE.md` §4 forbids swallowing a deferred failure.

## Why this is a ticket and not a patch

It was raised by S3, which deliberately left it working rather than splitting ownership of the column
mid-flight, and the audit that followed confirmed the judgement: the evidence says nothing is broken for
users today, the correct shape is expand → migrate the reader → contract across three sessions'
territory, and the read path being changed is the one every single sign-in goes through. A quick fix here
buys nothing and risks the login flow.

---

PRD: [`c28 — Organization-routed cells for 20M+ users`](../prd.md) · Candidate index: [`../README.md`](../README.md)
