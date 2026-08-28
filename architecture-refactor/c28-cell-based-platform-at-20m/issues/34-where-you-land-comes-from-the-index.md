# 34 — Where you land after signing in comes from the index, not from a global column

**What to build:** Signing in puts you back in the organization you were last working in, and that decision is made from the account-to-organization index the control plane already maintains — which knows each organization's cell — rather than from a foreign key on the global user row, which cannot point across cells.

**Blocked by:** None — can start immediately

**Status:** ready-for-agent

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

- [ ] `account_organization_index` carries a last-activated timestamp, written wherever the active
      organization changes today — `switchOrg`, `createOrganization`, `completeSetup`, `skipSetup`, and
      initial signup.
- [ ] The landing decision reads the index: the most recently activated entry that is ACTIVE on both the
      membership and the organization, falling back to the most recently joined.
- [ ] The suspended-membership path keeps working exactly as it does now — a suspended preferred
      organization still routes to the access-suspended screen with its reason, rather than silently
      landing the user somewhere else. This is the criterion most likely to regress.
- [ ] Removing a membership updates the index, so the pointer cannot outlive the membership. This is the
      one defect that is real today.
- [ ] The decision names the organization's **cell**, because the index row carries `cellId` — that is
      the fact the current column structurally cannot express.
- [ ] `users.lastActiveOrgId` is removed only after the index-derived path has served real traffic, and
      the removal is evidenced by a `pg_catalog` diff.
- [ ] A test covers a two-organization account whose preferred organization's membership is removed, and
      asserts the landing organization is the remaining one rather than an error or a loop.

## Todo

- [ ] Expand first and do not touch the read path in the same change: add the column, write it at all
      five sites, and let it run alongside `lastActiveOrgId` until the two agree. The login-landing path
      is the highest-blast-radius code in the application and does not want a big-bang cutover.
- [ ] Backfill the new column from `users.lastActiveOrgId` so existing accounts do not all land as if
      they had never switched.
- [ ] `jwt-auth.guard.ts:297` uses `lastActiveOrgId` as an `ORDER BY` hint for personal-token requests —
      migrate it too, or it becomes the last reader of a column everything else has left.
- [ ] Journal the migration; `SET lock_timeout`; `VACUUM ANALYZE` after any rewrite.
- [ ] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md)

## Why this is a ticket and not a patch

It was raised by S3, which deliberately left it working rather than splitting ownership of the column
mid-flight, and the audit that followed confirmed the judgement: the evidence says nothing is broken for
users today, the correct shape is expand → migrate the reader → contract across three sessions'
territory, and the read path being changed is the one every single sign-in goes through. A quick fix here
buys nothing and risks the login flow.

---

PRD: [`c28 — Organization-routed cells for 20M+ users`](../prd.md) · Candidate index: [`../README.md`](../README.md)
