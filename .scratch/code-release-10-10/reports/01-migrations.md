# S1 / ticket 01 — journalled migrations 0989–0991, plus F4 and F5

All numbers below came from a command I ran and read. Every schema claim is checked against
`pg_catalog`, never against `_journal.json`. No git command was run.

## F5 (P1) — `db:bootstrap` could not replay a migration using `ON COMMIT DROP` — FIXED

Reproduced in isolation (`repro.mjs` against `scratch_boot_c`):

    F5 autocommit (old path):       FAIL -> 42P01 relation "_probe" does not exist
    F5 one transaction (new path):  OK

`applyMigrationStatements` now applies a migration's statements inside one `sql.begin`, and the
ledger row is inserted **inside that same transaction**, so "applied" and "recorded" commit or
roll back together. Two shapes stay on the old autocommit path because they cannot be wrapped:
`CREATE INDEX CONCURRENTLY` (28 files) and the two files that issue their own `BEGIN;`/`COMMIT;`
(0316, 0321). Split measured with the shipped classifier: **30 autocommit / 607 single-transaction**.

Atomicity proven, not assumed. A synthetic migration (scratchpad only — the repo journal was never
touched) that creates a table, creates an `ON COMMIT DROP` temp table, inserts into it across two
`--> statement-breakpoint`s, then divides by zero:

    FAIL  [9999_atomicity_probe] division by zero
    RESULT: FAILED at 9999_atomicity_probe (637/638 ok before failure)
    table _atomicity_probe exists|false
    ledger rows|637

The insert into the temp table succeeded across the breakpoint (the failure is the division, not a
missing relation), and the table from statement 2 did not survive. This is the property ticket 02's
interrupt/resume test needs.

## F4 (P1) — cold bootstrap only replayed as the role `neondb_owner` — FIXED

The scope is larger than the finding said: **152 unqualified `current_org_id()` references across 7
migration files**, not 124 in one — 0619 (124), 0988 (8), 0620 (6), 0655 (4), 0677 (4), 0666 (2),
0678 (2), 0701 (2). (0417's two hits are prose in a comment.)

**Decision: I did not edit 0619 and I did not add a shim. `db-bootstrap.mjs` now issues
`SET search_path = "$user", public, build_events, app` on every migration connection.** Why:

- *Editing the 7 files* changes 7 sha256 hashes. The ledger is hash-keyed, so every database already
  at head — including the shared remote Neon one — would re-propose all seven. `check-migration-ledger`
  documents in its own header why hash is deliberately not the join key. Not worth it for a defect
  that is purely about *name resolution at CREATE POLICY time*.
- *A `public.current_org_id()` delegating shim* is actively wrong here. `public` precedes `app` in the
  search path, so the shim would **shadow** `app.current_org_id` and every policy the chain creates
  would store a different function OID than the control plane's. That breaks the exact parity that
  0619/0620/0655 and `generate-chain-repair.mjs` exist to defend.
- Setting the search path in the script reproduces production's resolution byte-for-byte and moves the
  guarantee out of the environment (a role *name*) and into the repository.

Verified on the cold build, with `search_path` forced to `pg_catalog` so `pg_get_expr` must qualify:

    functions named current_org_id*: app.current_org_id, app.current_org_id_or_null   (none in public)
    policy expression references:    app.current_org_id 1897 · app.current_org_id_or_null 35
    policies referencing an unqualified or public. variant: 0

**Cold build now reaches head as a non-`neondb_owner` superuser.** `scratch_boot_a` dropped and
recreated, bootstrapped as `tarunchintakunta` (superuser, `rolbypassrls`, **no** per-role search_path):
`RESULT: REACHED_HEAD 637/637`, exit 0, 637 OK / 0 SKIP / 0 FAIL / 0 retries — including
`OK [0619_…]` and `OK [0921_…]`. A second run is idempotent: 0 OK / **637 SKIP** / exit 0.

## Ticket 01 — all six boxes closed

`scratch_boot_b` built to 0988 (634/634) with the real, unmodified `db-bootstrap.mjs` pointed at a
scratchpad journal truncated at 634 entries, then extended one entry at a time.

| probe | BEFORE | AFTER-0989 | AFTER-0990 | AFTER-0991 |
|---|---|---|---|---|
| `'dead_lettered'::workflow_execution_status` | 22P02 | PASS | PASS | PASS |
| `workflow_executions.dlq_reason` | 42703 | PASS | PASS | PASS |
| `calendar_events.local_version` | 42703 | 42703 | 42703 | PASS |
| `calendar_provider_sync_queue.event_local_version` | 42703 | 42703 | 42703 | PASS |
| six `support:*` grants on CUSTOMER_SUPPORT (pg_catalog) | 0 | 0 | **6** | 6 |
| `access_versions.permissions_version` (seeded org) | 1 | 1 | **2** | 2 |
| ledger rows | 634 | 635 | 636 | 637 |

Every probe ran under its own `SAVEPOINT` inside a transaction that was `ROLLBACK`ed.

Gates, exit codes read: `check-migration-discipline` 0 (+ `--self-test` 0, 27/27) ·
`verify-migration-chain` 0 (+ `--self-test` 0, 10/10) · `check-migration-ledger` 0 against both
scratch targets ("637 applied row(s) against 637 journal entr(ies) … 0 pending … no orphan,
duplicate or unreachable"). Journal `when` strictly increasing across 637 entries; head `when`
1803000010087 == the applied watermark on both targets, so nothing is stranded.

## F7 (NEW, P2) — 0990 grants nothing unless the `permissions` catalog has already been synced

0990 guards each key with `EXISTS (SELECT 1 FROM permissions p WHERE p.name = k.permission_key)`.
The `permissions` catalog is populated at API boot by `PermissionCatalogSyncService.onModuleInit`,
not by any migration. A cold-built database carries **39** `permissions` rows (ad-hoc inserts from
individual migrations) and **zero** `support:*` rows. Proven inside a rolled-back transaction on a
second synthetic org:

    UNSYNCED-CATALOG grants_landed              | 0
    UNSYNCED-CATALOG access_version(org_probe_g)| 2      <- bumped anyway
    SYNCED-CATALOG   grants for org_probe_g     | 6

So on a target where the API has not booted this codebase, 0990 is a silent no-op that still bumps
`access_versions` — busting every cached permission resolution for an org while changing nothing.
Order matters: **boot the API once, then run 0990.** This is a finding, not a failure: against an
org whose catalog is synced, 0990 does exactly what it claims.

## F8 (NEW, P2) — `check:migration-rollback` was red on 0990 and 0991 — FIXED

Pre-existing, discovered while running the neighbouring gates: `0990` and `0991` had neither a
`.down.sql` nor an `-- @irreversible`/`-- @data-loss` declaration (0989 already had one). Added
`migrations/rollback/0990_…down.sql` and `…/0991_…down.sql`, both declared `-- @data-loss`. Gate now
exits 0 ("637 migrations scanned … all rollback type-name checks passed"). Both files were executed
against `scratch_boot_b` inside a rolled-back transaction and do reverse their forward migration:
grants 6→0, `permissions_version` 2→3, calendar columns 2→0.

## Files changed

- `/Users/tarunchintakunta/Personal/streamline/streamlineos-backend/src/scripts/db-bootstrap.mjs`
- `/Users/tarunchintakunta/Personal/streamline/streamlineos-backend/migrations/rollback/0990_support_template_grant_backfill.down.sql` (new)
- `/Users/tarunchintakunta/Personal/streamline/streamlineos-backend/migrations/rollback/0991_calendar_event_local_version.down.sql` (new)
- `/Users/tarunchintakunta/Personal/streamline/streamlineos-frontend/.scratch/code-release-10-10/issues/01-apply-journalled-migrations.md` (ticks + evidence)

No migration `.sql` was edited; no hash changed. `tsconfig.json` has no `allowJs`, so the `.mjs`
change is outside `tsc --noEmit`; I ran `node --check` on it instead.

## Handoff to ticket 02

- `scratch_boot_a` — pristine cold build at head, 637 ledger rows, 1027 tables, 0 organizations.
  Bootstrapped as `tarunchintakunta`. Use this one for parity.
- `scratch_boot_b` — same chain (637 rows, **1027 tables**, identical count) **plus** one synthetic
  fixture org (`org_probe_0990`) with a user, membership, 7 `permissions` rows, 7
  `role_permission_grants` and an `access_versions` row. Data only; schema is identical. Drop and
  recreate it, or use `scratch_boot_c`, if the parity comparison looks at rows.
- `scratch_boot_c` — used only for the two-statement F4/F5 micro-repro; recreate it before use.
- `verify-migration-chain.mjs` hardcodes `ssl: "require"`, so its check (f) cannot run against the
  local server (SSL is off). Not in my remit to change; I verified (f) by hand.
- Nothing in this session touched the configured `DATABASE_URL`.
