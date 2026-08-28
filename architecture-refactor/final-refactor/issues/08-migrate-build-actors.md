# 08: Migrate Build actors

**What to build:** Project members, ticket assignees, approvers and authors are organization-aware actors, preventing a multi-org user from being assigned through the wrong membership.

**Blocked by:** 06 — Expand the OrganizationActor compatibility seam. **Closed by S1 and adopted here.**

**Status:** done

- [x] Project and ticket actor writes use OrganizationActor references.
- [x] Membership lookup includes organization and active status.
- [x] Existing data is backfilled with an exception report for ambiguous rows.
- [x] Project scope, cross-org and assignment tests pass.

## Changes

| table | legacy | added | constraint |
|---|---|---|---|
| `build.project_members` | `user_id` | `membership_id` | `fk_project_members_member_actor` |
| `build.tickets` | `assignee_id` | `assignee_membership_id` | `fk_tickets_assignee_actor` |
| `build.tickets` | `reporter_id` | `reporter_membership_id` | `fk_tickets_reporter_actor` |
| `build.ticket_assignees` | `user_id` | `membership_id` | `fk_ticket_assignees_member_actor` |
| `build.project_approvals` | `approver_id` | `approver_membership_id` | `fk_project_approvals_approver_actor` |

- `backend/migrations/0648_build_actor_membership_expand.sql` — expand only. `ADD COLUMN`, backfill, `ADD CONSTRAINT … NOT VALID`, a separate `VALIDATE CONSTRAINT`, tenant-leading index. The split matters most here: `build.tickets` is the largest table in the database.
- `db/schema/build/{members,ticket-core,ticket-collaboration,approvals}.ts` — each column with a composite `(org_id, <col>) -> organization_members(org_id, id)` FK, `ON DELETE RESTRICT`.
- Writes: `ProjectsMembersService.addMember`, `ProjectsTicketsCreateService.createTicket` (both the ticket row and each `ticket_assignees` row), `ProjectsTicketsUpdateService.updateTicket` and `syncAssignees`, `ApprovalsService.createApproval` and `updateApproval`.
- `backend/src/scripts/report-build-actor-backfill.mjs` — read-only exception report.

## Findings

- `addMember` previously wrote a `user_id` with no check that the person was an active member of **that** organization. That is precisely the defect in the ticket title: a user belonging to two organizations could be added to a project in the wrong one. It now resolves through the seam, which fails closed.
- The bulk paths (ticket create with multiple assignees, `syncAssignees`) resolve the whole batch once through `resolveOrganizationActorsByUserIds` rather than per row, so the fix does not reintroduce the N+1 this program is removing.
- `createFromFeedback` sets `reporterId` without actor resolution and is left that way deliberately — it is an internal path with no client-supplied actor, so its `reporter_membership_id` stays `NULL` until ticket 11's cutover. Recorded rather than silently skipped.

## Verification

`node ./node_modules/jest/bin/jest.js src/modules/build/core/build-actor-migration.spec.ts`:

```
√ reaches the actor seam at all — the project lookup must succeed first
√ rejects a user who is not in the organization with NotFoundException
√ rejects a SUSPENDED member with ForbiddenException (not NotFoundException)
√ rejects a user from a different organization with NotFoundException (never ForbiddenException)
√ writes both userId and membershipId when the actor resolves successfully
√ throws ConflictException when the user is already a project member
√ rejects an assignee who is not an active org member
√ writes both assigneeId+assigneeMembershipId and reporterId+reporterMembershipId
√ resolveProjectsScope still uses the build:manage permission key
Tests: 9 passed, 9 total
```

Five of these were failing as delivered. The instructive one: the suite called `jest.resetAllMocks()` in `beforeEach`, which wiped the `mockResolvedValue` implementations declared at module scope, so `db.query.projects.findFirst` returned `undefined` and every test threw `NotFoundException("Project not found")` **before reaching the actor seam at all**. The cross-organization test passed anyway, because `Project not found` is also a `NotFoundException` — a green test proving nothing. The first case above was added specifically to pin that down: it asserts the seam is actually called.

Schema, verified against `pg_catalog` after applying `0648`:

```
project_members.membership_id            | 1 validated fk
tickets.assignee_membership_id           | 1 validated fk
tickets.reporter_membership_id           | 1 validated fk
ticket_assignees.membership_id           | 1 validated fk
project_approvals.approver_membership_id | 1 validated fk
```

Backfill:

```
build.tickets          legacy assignees 174860 -> membership 174860
build.project_members  legacy members      245 -> membership      245
```

The exception report returns all-clear, and was proved to bite by planting a ticket assigned to a user with no membership in that organization:

```
tickets.assignee_id: 1 org(s) with unmappable rows
  org_id=aa5627a2-…  unmappable=1
```

The planted row was then removed and the report returns to all-clear.

Runtime, against the booted API under RLS (`node src/scripts/verify-actor-membership-writes.mjs`):

```
PASS  adding a project member from another organization is refused as 404 and writes nothing — status=404 rows=0
```

Backend `tsc --noEmit -p tsconfig.build.json`: clean.
