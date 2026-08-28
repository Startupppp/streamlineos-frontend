# 42: Repair and enforce the migration chain

**What to build:** A cold database and upgraded database reach the same declared schema with zero chain gaps, and CI prevents unjournalled migration work.

**Blocked by:** 11, 13, 14, 15 and 16.

**Status:** partial — the enforcement half is **done and biting**; the repair half is blocked on a
defect in another session's migration and on a mid-chain re-ordering job

- [ ] Every migration is journaled in dependency order and the reported chain-gap count is zero.

  **Journalling: done. Gap count: 124, not zero.**

  Journal repairs made this session, all verified by `pnpm db:reconcile-journal` reporting **0 timestamp
  regressions and 0 orphan entries**:
  - The four long-unjournalled CRM files (`0263`, `0264`, `0266`, `0267`) are journalled into the `idx`
    and `when` slots the journal already reserved for them — 310, 311, 313, 314, with 1,000 ms spacing.
    Those gaps being exactly the right size corroborates the merge-dropped-entries theory in
    `APPLY-MIGRATIONS.md` rather than a deliberate exclusion.
  - `0636_kb_source_review_tenant_constraints` was a timestamp regression and had **never applied**;
    fixed and applied — see the S3 row in `CROSS-SESSION.md`, this was a live cross-tenant hole.
  - `0649_org_members_org_fk` (new) adds the `organization_members → organizations` FK at the point in
    the chain where `0370_tenant_column_integrity` asserts it, which previously aborted a cold build
    outright. It is journalled at `when=1784993507608`, below the DB watermark, so it is correctly a
    **no-op on existing databases** — the FK is already present and `convalidated` in the control plane.
  - A duplicate `0641` (S4's `financial_actor_audit_identity` vs this ticket's `org_members_org_fk`) was
    resolved by renaming ours to `0649`.

  **Why 124 gaps remain.** `RECONCILED [0591_tenant_isolation_for_unprotected_tables] 0 already present,
  124 referencing an object the chain never creates (of 401)`. This is the job c28-33 identified and
  deliberately did not attempt: `0619_chain_creates_what_production_has` fixed the **end state** by
  appending 65 table creations at the tail, so `differences=0` holds, but statements in `0352`, `0590`
  and `0591` still reference objects that only arrive at `0619`. Closing this means moving those
  creations to the point in the chain where the referencing statements run — a re-ordering of history,
  not an addition to it. It is a substantial, separable piece of work and is not started.

- [ ] Cold bootstrap and upgrade schema comparison report no differences.

  **Blocked, but much further along than it was.** The cold bootstrap previously died with
  `CONNECTION_CLOSED` at statement 109 of 4,456 in `0000`, and on a second attempt at statement 1,471 of
  1,867 in `0619` — the documented Neon behaviour where a very large migration on a freshly-woken compute
  has its connection dropped. `apply-chain-cold.mjs` now reconnects up to 8 times and tracks applied
  hashes across restarts, and the run gets past both: **349 migrations executed**.

  It now fails at `0628_communication_actor_normalization` with `42P10 there is no unique or exclusion
  constraint matching the ON CONFLICT specification` — a real ordering defect in that migration, which is
  S3 territory: it inserts with `ON CONFLICT (org_id, message_id, membership_id, emoji)` 22 lines before
  it creates the unique index that clause requires. Recorded in `CROSS-SESSION.md` with the fix. Because
  the bootstrap cannot reach head, `cell:compare-schema` (step 5 of the bootstrap) does not run, so no
  comparison figure exists this session. Protocol §3 forbids implementing a guessed substitute for a
  blocker, so the file was not edited here.

  Exact failing command: `pnpm -C backend cell:bootstrap --region=cell-2 --database=cell2 --drop --i-mean-it`

- [x] Repair/backfill work is resumable, lock-bounded and catalog-verified.

  `apply-chain-cold.mjs` reconnects on `CONNECTION_CLOSED` (up to 8 times) and records which statements
  already succeeded, so a restart resumes rather than replaying. Every migration authored here sets
  `SET lock_timeout = '5s'` and uses `ADD CONSTRAINT … NOT VALID` → `VALIDATE CONSTRAINT`. Every claim in
  this ticket was verified against `pg_catalog`, never against the journal — `information_schema.columns`
  and `pg_indexes` for `0645`, `pg_constraint` for `0636` and `0649`, `to_regclass` for `0628`.

  New tool: `pnpm db:apply-one --tag=<journal tag>` applies a single journalled entry statement by
  statement and **names the failing statement with its SQLSTATE**. `drizzle-kit migrate` prints only
  NOTICEs, hides the failure behind its spinner and exits 1, so one broken pending migration blocks every
  session's pending migration with no diagnostic at all. That is how `0636` was applied.

- [x] CI rejects unjournalled SQL, chain gaps and cold/runtime schema drift.

  `pnpm check:migration-chain` checks five failure modes: unjournalled `.sql` not on the deliberate
  allowlist, duplicate numeric prefixes, timestamp regressions (Drizzle skips by timestamp, so a
  backwards entry never runs), journal entries with no file, and chain gaps. `--self-test` constructs
  each of the five divergences in a temporary fixture directory and asserts the guard catches it:
  **5 passed, 0 failed**. Wired into `backend/.github/workflows/ci.yml`, with a nightly
  `cell-cold-bootstrap.yml` producing the `.chain-gaps` figure the gate reads.

  **It is not a guard that has never failed.** Its first live run found 15 issues. Twelve were historical
  duplicate prefixes on already-applied migrations (0300, 0370–0375, 0379, 0420, 0426, 0430–0432);
  renaming an applied migration changes its hash and re-proposes it everywhere, so those are baselined
  with a dated reason and the set is **closed** — a new collision still fails. The remaining 3 are live
  and belong to other sessions: two unjournalled files that will never apply, and a genuine new duplicate
  on `0631`. Those are recorded in `CROSS-SESSION.md` rather than silenced.

## What a reader should take from this

The enforcement half is finished: the chain can no longer silently drift, because five specific ways it
used to drift now fail a build, and the guard has proved it catches all five. The repair half is not
finished, and the two reasons are precise rather than vague — one migration belonging to another session
is broken in a way only a cold build reveals, and 124 gaps need history re-ordered rather than extended.
Neither is hidden behind a green tick.
