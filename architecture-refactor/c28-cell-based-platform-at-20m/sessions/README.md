# c28 execution sessions

Six sessions cover all 32 tickets. The split was chosen so that **every blocking edge falls inside one
session** — with one unavoidable exception, S6, which descends entirely from S3's placement work.

**S1, S2, S3, S4 and S5 can run in parallel.** S6 runs after S3.

## Launch

Paste one line into a fresh session:

| Session | Paste this |
|---|---|
| S1 | `Read architecture-refactor/c28-cell-based-platform-at-20m/sessions/SESSION-1.md and execute it.` |
| S2 | `Read architecture-refactor/c28-cell-based-platform-at-20m/sessions/SESSION-2.md and execute it.` |
| S3 | `Read architecture-refactor/c28-cell-based-platform-at-20m/sessions/SESSION-3.md and execute it.` |
| S4 | `Read architecture-refactor/c28-cell-based-platform-at-20m/sessions/SESSION-4.md and execute it.` |
| S5 | `Read architecture-refactor/c28-cell-based-platform-at-20m/sessions/SESSION-5.md and execute it.` |
| S6 | `Read architecture-refactor/c28-cell-based-platform-at-20m/sessions/SESSION-6.md and execute it.` |
| S7 | `Read architecture-refactor/c28-cell-based-platform-at-20m/sessions/SESSION-7.md and execute it.` |

**S1–S6 have run.** S7 was raised by S6's own findings and is the one still to do — it closes the
3,243-object gap between the committed migration chain and the running database, which is what blocks
cold bootstrap, cell creation and disaster recovery.

Each brief points at [`PROTOCOL.md`](PROTOCOL.md) as its first read, and that file is binding. Its §0 is
the one that matters most: **a session does not stop until every one of its tickets is closed or
explicitly blocked with a written reason.**

## The split

| Session | Tickets | Weight | Runs |
|---|---|---|---|
| [S1 — Authorization core](SESSION-1.md) | 01–08 | heavy | immediately |
| [S2 — The users-table split](SESSION-2.md) | 09–14 | **heaviest** — the one wide refactor | immediately |
| [S3 — Placement](SESSION-3.md) | 20–25 | heavy | immediately |
| [S4 — Production signal and failure behaviour](SESSION-4.md) | 15, 16, 31 | medium | immediately |
| [S5 — Client contracts and the module registry](SESSION-5.md) | 17, 18, 19 | medium | immediately |
| [S6 — Cells, relocation, envelope and cost](SESSION-6.md) | 26–30, 32 | medium code + ops | **after S3 lands** |
| [S7 — The migration chain rebuilds the database](SESSION-7.md) | 33 | large, one ticket | now — S1–S6 have run |

If you run fewer than five at once, start **S2** first — it is the longest and every other session
finishes around it.

Two tickets were amended on 2026-08-28 to make this split possible, and both amendments are recorded in
the ticket files with their justification:

- **24** dropped `01` as a blocker. `POST /organization/switch` already performs a membership check
  (`org-profile.service.ts:81`), so the revalidation has an existing check to relocate into the target
  cell; it does not need S1's uniform membership resolution first.
- **31** dropped `20` as a blocker. Its control-plane row's *"refuse unknown or stale placement"* half is
  already true — `RegionRegistry.regionForOrg` fails closed in both directions — and the *"serve valid
  signed placement cache"* half is ticket 21's own criterion, proved there.

## Shared files — the only real coupling

Everything else is exclusive territory, listed in each brief. These are the exceptions:

| File | Owner split |
|---|---|
| `backend/src/db/schema/common/auth.ts` | **S1** `organizationMembers`, `userDelegations`, `userDelegationPermissions` · **S2** `users` · **S3** `organizations`. Re-read before editing, edit only your block, never reformat, commit immediately. |
| `backend/src/main.ts` | **S4** the telemetry wiring at `:76` · **S5** the Swagger block at `:97-110` |
| `backend/migrations/meta/_journal.json` | **Every session that writes SQL.** Append only, never reorder, re-read immediately before writing, commit with your `.sql` in the same commit. |
| `backend/migrations/*.sql` numbering | Re-check the highest existing number immediately before naming your file. |
| `backend/src/db/schema/hr/hiring.ts` | **S4** for `vault_access_logs` only · **S2** owns the rest of `db/schema/hr/**` |
| `backend/src/modules/payroll/payout/{payout-run-completion,locking.service}.ts` | **S1**, for the `isOrgOwner` fabrication only. S2 owns the rest of payroll. |
| `backend/src/common/auth/verify-permission-catalog.mjs` | **S4** — but see below, it may not exist |
| `../README.md` (the candidate index) | Each session edits **only its own rows** |

Need a change outside your territory? **Report it, do not make it** — append to
[`CROSS-SESSION.md`](CROSS-SESSION.md) and put it in your final report.

## Corrections found while writing these briefs

Verified 2026-08-28 against both repos. Each is a case where a ticket described work that is already
partly done — build on it rather than rebuilding:

- **`MODULE_REGISTRY` already exists** (`common/rbac/module-registry.ts:27`) covering all 20 modules,
  spec-guarded, with `storedModuleKey` / `moduleIdFromStored` centralising the case conversion. Ticket 19
  extends it. **`organizations.enabled_modules` was dropped** in migration `0335` and replaced by
  `org_modules`, so the two-vocabularies defect is already half-closed.
- **Idempotency is already built** — `common/idempotency/idempotency.interceptor.ts` claims against a
  `commandFences` table with `IN_FLIGHT` / `COMPLETED` / `FAILED`, handling replay, 409-while-in-flight
  and parameter mismatch. Ticket 18's job is enumerating which commands opt in.
- **`organizations` already carries a purge/lifecycle column set** — `statusV2`, `purgeScheduledAt`,
  `purgeScheduledBy`, `purgeJobId`, `purgedAt`, `purgeReason`, `ownerMembershipId`. Ticket 25's state
  machine is partly expressed there already.
- **Two `OPEN-FINDINGS.md` §6 items are already resolved.** `verify-permission-catalog.mjs` does not
  exist anywhere in the repo and `verify:permissions` already points at the canonical
  `check-permission-keys.mjs` (`backend/package.json:43`); `recurring-journals.controller.ts:10-17`
  imports its schemas from `./dto/recurring-journals.schemas` with nothing inline. Ticket 15 strikes both.
- **Read-cost budgets number 46**, not the 43 recorded earlier (`src/scripts/read-cost-budgets.mjs`), and
  `check-build-read-cost.mjs` still covers exactly 2 checks.

The lesson those five share is the program's own: **verify a premise before executing it.** Every session
brief tells you to re-verify its grounding at source, and this is why.
