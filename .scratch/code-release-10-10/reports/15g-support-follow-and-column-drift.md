# 15g — `POST /support/:supportTicketId/follow`, and the drift population that hid it

**Ticket:** 15 (BOLA/IDOR sweep), the one item **A-2** left blocked on `migrations/`.
**Repos:** `streamlineos-backend` (migration, rollback, journal, spec, gate) and this reports tree.
**Measured on:** `scratch_t15f_follow`, a `CREATE DATABASE … TEMPLATE scratch_t15_500d` copy — the
database report 15f itself triaged against — plus `scratch_t15f_down`, a copy of that with `1046`
rolled back through its own down-file. `scratch_perf_seed` was read, never written. No
`cornerstone_*`, no `DATABASE_URL`, no `scratch_boot_*`, no `scratch_t23_http`, no
`scratch_money_race` was touched, and none of the cited databases was dropped.

---

## 1. The handed-down diagnosis was correct, and this is the proof rather than a restatement

Report 15f §2c said the route 500s for every caller because `support_ticket_watchers.user_id` is
`NOT NULL` in the database and absent from the Drizzle declaration. Every part was verified before
anything was changed.

**The column.** On `scratch_t15f_follow` before the fix:

```
id                  | integer   | NO  | nextval('support_ticket_watchers_id_seq'::regclass)
org_id              | text      | NO  |
ticket_id           | integer   | NO  |
user_id             | text      | NO  |          <- NOT NULL, no default
created_at          | timestamp | NO  | now()
user_membership_id  | integer   | YES |
```

**The declaration.** `src/db/schema/support/support-workspace.ts:76` declares
`id · orgId · ticketId · userMembershipId · createdAt`. No `userId`, and `userMembershipId` is
`.notNull()` — the shape the database only reached with `1046`.

**The route.** Not reasoned about — run. The new spec
`test/support/support-ticket-follow.seeded-e2e-spec.ts` boots the application and sends the real
request. Before the migration, on the same database:

```
● records the caller's membership as a watcher instead of raising 23502
    Expected: 200
    Received: 500
```

and the application's own stderr named the cause exactly:

```
"message": "Failed query: insert into \"support_ticket_watchers\" (\"id\", \"org_id\", \"ticket_id\",
            \"user_membership_id\", \"created_at\") values (default, $1, $2, $3, default)
            on conflict do nothing",
"sqlstate": "23502",
"stack": "… at SupportWorkspaceService.follow (src/modules/support/core/support-workspace.service.ts:206:5)"
```

**One thing 15f got right that is worth repeating**, because it changes the fix: the cross-tenant
answer was **already 404**, not 403. `SupportWorkspaceService.follow` calls `assertTicketInOrg`
before it inserts, so the tenant check fires first and the 500 was strictly an own-tenant defect.
The third case in the new spec pins that.

**Two things the report's §2c did not have.** Beyond the column and its FK to `users`, the live
table also carried `uniq_support_ticket_watchers_ticket_user` — a `UNIQUE (ticket_id, user_id)`
index that is not in the Drizzle declaration either. It goes with the column, and naming it in the
migration is better than letting `DROP COLUMN` take it silently.

## 2. Contraction, not restoration — and what was checked before dropping a column

Two candidates: contract the pair (drop `user_id`) or restore `user_id` to the declaration.
**Contraction, because the declaration is already the correct end state** and 72 sibling tables'
declarations assume the same shape. Restoring the column would make the release ship a legacy actor
identity the entire contraction programme exists to remove, and would need a second edit to undo.

The brief's rule 8 forbids deleting schema on a text search. What was actually checked:

- **Symbol references.** `supportTicketWatchers` appears in the schema file, three spec files, and
  `SupportWorkspaceService` (`follow` / `unfollow` / `listWatchers`). Every one of them addresses
  `userMembershipId`. `follow`'s `userId` parameter is threaded from the controller and **never
  reaches the insert** — it is unused at the call site.
- **Raw SQL.** `support_ticket_watchers` as a string appears nowhere in `src/`, `test/` or
  `scripts/` except the schema file and `membership-artifacts.ts:1683`, which rules the table on
  `user_membership_id`.
- **Catalog dependencies**, read from `pg_catalog` rather than assumed: one RLS policy
  (`org_id = app.current_org_id()`, no `user_id`), no triggers, no views, no rules. The only
  objects depending on `user_id` are the index and FK the migration names.
- **`pnpm exec knip --no-progress` — NOT RUN, and it could not have answered this.** Knip's subject
  is unused files and exports; a database column is neither, the schema file is imported by the
  runtime barrel, and no export is being removed. Saying it passed would be a false claim. What
  stands in for it is `pnpm typecheck` (exit **0**), which is the tool that would break if any
  TypeScript read the column — and nothing can, because Drizzle never declared it.
- **Erasure coverage, the one thing that could have made contraction wrong.** `user_id` carried
  `ON DELETE CASCADE` to `users`, so deleting a user removed their watch rows. After the drop the
  path still exists and is one hop longer: `users` → `ON DELETE CASCADE` →
  `organization_members` → `ON DELETE CASCADE` (`fk_support_ticket_watchers_user_actor`) →
  `support_ticket_watchers`. Verified from `pg_constraint`, not assumed. **No retention regression.**

## 3. The migration

`migrations/1046_t15f_support_ticket_watchers_actor_contract.sql`, journalled at `idx` **802**,
`when` **1803000010121** — one above the `2027-02-19` watermark, unique, strictly increasing, and
**no existing entry renumbered**. Hand-authored; `drizzle-kit generate` was not run.

It follows `0916`'s shape (the sibling `*_actor_drop`) with one deliberate difference. `0916`
`RAISE EXCEPTION`s on any row it cannot map. For a watch subscription that would make the migration
unappliable on a database holding one stale row, so `1046` **deletes** the unmappable rows and
**announces the count with `RAISE NOTICE`** instead of running silent. A watcher whose
`(org_id, user_id)` has no `organization_members` row is someone who left the organisation; the
composite FK would reject them, the column cannot be `NOT NULL` while they exist, and re-following
recreates the row. Measured before authoring: **0 such rows** on `scratch_perf_seed` (the table is
empty there) and **0** on `scratch_t15_500d` (1 row, mappable — and it was backfilled, not deleted).

Statements, in order: backfill from `organization_members` preferring `ACTIVE` (0915/0916's own
ordering) → count-and-delete the unmappable → `CHECK (… IS NOT NULL) NOT VALID` → `VALIDATE` →
`SET NOT NULL` → drop the CHECK → `DROP INDEX uniq_support_ticket_watchers_ticket_user` →
`DROP CONSTRAINT support_ticket_watchers_user_id_users_id_fk, DROP COLUMN user_id`.
`SET lock_timeout = '5s'` first; no `--> statement-breakpoint` inside the `DO` block.

### The down-file, and what reversing it costs

`migrations/rollback/1046_….down.sql` reconstructs `user_id` from
`organization_members.user_id` via the membership pointer, restores the `NOT NULL` through the same
two-step, restores the FK (`NOT VALID` → `VALIDATE`) and the legacy unique index, and makes
`user_membership_id` nullable again. **Run and verified**, not merely written: applied to
`scratch_t15f_down`, exit 0, and the single row came back with its original
`user_id = bbbbbbbb-0001-…` and `user_membership_id` nullable.

Its header records two things in the file itself, in the shape
`1045_t44b_storage_pending_purge_bucket.down.sql` uses:

- **`@reopens-a-defect`.** This is not a neutral reversal. The Drizzle declaration does not declare
  `user_id`, so the moment the column is back and `NOT NULL`, `follow` raises 23502 again and the
  route 500s for every caller. Reverting the declaration must be part of the same change.
- **`@data-loss`.** The rows `1046` deleted are not restored. Nothing left in the database records
  who they were, because the membership pointer was the only surviving actor identity.

## 4. Proof the route works — run, not mocked

`test/support/support-ticket-follow.seeded-e2e-spec.ts` seeds two organisations, gives each a
member holding `support:tickets:view` with the `support` module enabled, creates one ticket in each,
and sends the real HTTP request through the booted application.

```
node ./node_modules/jest/bin/jest.js --config ./jest-e2e-seeded.json --forceExit --runInBand \
  --testPathPattern=support-ticket-follow
```

| | before `1046` | after `1046` |
|---|---|---|
| own-tenant follow, watcher row written | **500** (23502) | **200**, one row, `user_membership_id` = the caller's |
| second follow (idempotence) | **500** | **200**, still one row |
| another organisation's ticket id | 404 | **404**, no row written |
| exit code | **1** | **0** |

And the literal route the live sweep recorded, replayed through 15f's own harness with a one-route
plan so the org, user and path are the sweep's rather than mine:

```
[t15] 200 POST /support/1/follow :: (no log)
{"status": 200, "body": "{\"success\":true}", "sqlstate": null, "table": null}
```

That is the request that produced the `INTERNAL_ERROR` envelope in
`reports/residual-risk-register/bola-live-offline.json`.

## 5. The scanner, fixed rather than the report

Full analysis is now **§12 of `reports/07b-declaration-drift.md`**, appended there so the next
reader of that report finds it. In short: 07b's population A was table-granular, its population B
was FK-granular and ran declaration→live. The one combination it never had is **live→declaration at
column granularity**, which is the only one of the four that breaks a write.
`check:drop-column-safety` is the nearest existing gate and covers a different case — a column
dropped by an *unapplied migration* that the schema still declares — so drift that never came
through a `DROP COLUMN` statement is structurally invisible to it.

**`pnpm check:declaration-column-drift`** (`src/scripts/check-declaration-column-drift.ts`, 25
self-tests) compares `getTableConfig` against `pg_attribute`. Failing verdicts: write-blocking
(live `NOT NULL`, no default, undeclared → 23502 on every INSERT) and read-blocking (declared, not
live → 42703 on every unprojected read). Reporting verdicts: trigger-supplied and
nullable-or-defaulted. Without `COLUMN_DRIFT_GATE_DATABASE_URL` it exits **2 INCONCLUSIVE**, never
a silent pass.

**The finding that makes it usable, and the reason it is not a naive `NOT NULL` scan.** Its first
real run reported **23** write-blocking columns and **22 were false positives** — `org_id` on child
tables (`invoice_items`, `quote_line_items`, every `inv_*_lines`, …) filled by a
`BEFORE INSERT … FOR EACH ROW` trigger running `set_org_id_from_parent(parent, 'id', 'org_id', fk)`.
Those columns are undeclared **on purpose**, so the ORM cannot write the tenant key. A column is
write-blocking only when no such trigger names it. Validated in both directions: the 22 downgrade,
`support_ticket_watchers.user_id` still fails, and deleting the trigger from the fixture makes the
same column fail again.

| database | write-blocking | read-blocking | trigger-supplied | invisible | exit |
|---|---:|---:|---:|---:|---:|
| `scratch_t15f_down` (pre-`1046` shape) | **1** — `support_ticket_watchers.user_id` | 0 | 22 | 155 | **1** |
| `scratch_t15f_follow` (post-`1046`) | **0** | 0 | 22 | 155 | **0** |
| no gate URL | — | — | — | — | **2** |

873 declared tables / 10,611 declared columns vs 12,267 live columns, 149 BEFORE INSERT row
triggers. **0 read-blocking and 0 declared-but-absent tables at head.**

## 6. Gates — command, exit code, number

| command | exit | number |
|---|---:|---|
| `pnpm check:migration-discipline` | **0** | 670 SQL files, 0 new violations |
| `pnpm check:migration-rollback` | **0** | 670 migrations, compliance required above 839 |
| `pnpm check:drop-column-safety` | **0** | 670 migrations, 126 dropped columns, 349 schema files, 0 still declared |
| `pnpm db:migrate` (on `scratch_t15f_follow`) | **0** | 667 → 673 applied; last `created_at` = 1803000010121 |
| `…check-declaration-column-drift.ts --self-test` | **0** | 25 passed |
| `pnpm typecheck` (first run, my files newest) | **0** | 0 errors |
| `jest --config jest-e2e-seeded.json --testPathPattern=support-ticket-follow` | **0** | 3 passed |
| `jest --maxWorkers=2 --testPathPattern="support\|membership-artifact"` | **0** | 46 suites, 408 passed, 1 skipped |
| `pnpm check:spec-typecheck` | **2** | **1 error, NOT mine** — see below |
| `pnpm typecheck` (re-run, later) | **2** | **1 error, NOT mine** — same one |

### The red gate is another agent's in-flight edit, and it is not mine

Both `check:spec-typecheck` and a later `pnpm typecheck` re-run report exactly one error:

```
src/modules/hr/recruitment/recruitment-jobs.service.ts(387,24): error TS2339:
  Property 'orgDepartment' does not exist on type '{ … }'
```

`git status` shows that file as ` M` — **uncommitted**, and I never touched it. `git diff` puts
line 387 inside an addition another agent is making right now (`listInternalJobs` reshaping
`orgDepartment` → `department`); the relational `with` no longer types the projection it destructures.
My own `pnpm typecheck` ran clean at **exit 0** before that edit landed, over a tree that already
contained every file in this report. **Owner: whoever holds `src/modules/hr/recruitment/`.**

## 7. Files changed

Backend (`streamlineos-backend`):

- `migrations/1046_t15f_support_ticket_watchers_actor_contract.sql` (new)
- `migrations/rollback/1046_t15f_support_ticket_watchers_actor_contract.down.sql` (new)
- `migrations/meta/_journal.json` (one entry appended, `idx` 802)
- `test/support/support-ticket-follow.seeded-e2e-spec.ts` (new)
- `src/scripts/check-declaration-column-drift.ts` (new)
- `package.json` (two `check:declaration-column-drift*` entries)

Commits `fa35bd8d` (migration + rollback + journal + spec) and `b828b751` (gate + registration).

Reports tree (`streamlineos-frontend`): this file, `07b-declaration-drift.md` §12,
`issues/15-bola-idor-sweep.md` (A-2's blocked item closed).

## 8. Honest gaps

- **`pnpm exec knip --no-progress` — not run.** Its subject is unused files and exports; no export
  or file is removed here, and it cannot see a database column. `pnpm typecheck` (exit 0) is the
  tool that would have caught a TypeScript reader, and there can be none because Drizzle never
  declared the column.
- **Nothing was applied to `DATABASE_URL`.** `1046` is proved only on `scratch_t15f_follow`, and
  reversed only on `scratch_t15f_down`. The shared instance is untouched, so the route is still
  broken there until someone migrates it.
- **`check:declaration-column-drift` is not wired into CI**, because it needs a bootstrapped
  database and I do not own the workflow files. Nothing runs it automatically today.
  **Owner: whoever holds `.github/workflows/`** — it wants the same treatment
  `check:set-null-column-lists` gets.
- **The 72 sibling tables were not contracted.** Every one still declares its legacy actor column,
  so every one is correct today; they are one declaration edit away from this defect and the new
  gate is what would catch it. **Owner: whoever finishes the actor contraction.**
- **`check:spec-typecheck` is red**, from another agent's uncommitted HR edit (§6). Not fixed,
  because the file is not in this territory.
- Rows counted for the `@data-loss` note come from `scratch_perf_seed` and `scratch_t15_500d`
  only. **The production distribution is unknown**, and if it holds stale watchers the migration
  will delete them — the `RAISE NOTICE` is what will say how many.
