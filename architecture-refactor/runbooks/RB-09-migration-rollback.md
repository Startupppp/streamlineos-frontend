# RB-09 Migration rollback

**Reference runbook, not a current pass.** Execute rollback and migration acceptance under
[the single completion plan](../prd/completion-plan.md), OPS-003 / REL-001.
Validate the explicitly authorized disposable target before commands; never load production defaults.

Applies to the expand/contract sequence this repo uses for every schema change:
**additive → backfill → validate → cutover → drop.**

Current state at the latest 2026-09-01 verification: `check:migration-ledger` reports **585 applied rows
against 585 journal entries, 0 pending, 0 orphan, 0 duplicate, 0 unreachable**; the latest
applied watermark is `1803000010025`. The configured-database upgrade is complete; disposable
staging replay and the live rollback drill remain open before the production migration gate can close.

---

## 1. Why most steps need no rollback

The sequence is designed so that only the final step is destructive.

| Step | Reversible? | How |
|---|---|---|
| additive (nullable column, new index, `NOT VALID` constraint) | yes, trivially | `DROP COLUMN` / `DROP INDEX` / `DROP CONSTRAINT`; old code never referenced it |
| backfill | yes | idempotent and re-runnable by construction — every backfill is guarded by `IF EXISTS (SELECT 1 FROM information_schema.columns ...)` and filters on `WHERE <target> IS NULL`, so re-running it is a no-op |
| validate (`ALTER TABLE t VALIDATE CONSTRAINT c`) | yes | `DROP CONSTRAINT`; validation takes `SHARE UPDATE EXCLUSIVE`, not `ACCESS EXCLUSIVE` |
| cutover (readers/writers move to the new column) | yes | deploy the previous application build; the legacy column is still present and still written |
| **drop** | **NO** | the column is gone. This is the one-way door |

**The operational rule that follows:** a `drop` migration must never ship in the same release as
its `cutover`. Ship cutover, let it soak, then ship drop separately. `0797`/`0798` and `0799`/`0800`
are deliberately separate files for exactly this reason.

## 2. Rolling back before the drop

Application-only rollback. No SQL is required.

```bash
# 1. Redeploy the previous application image. The legacy columns still exist
#    and the pre-cutover code still reads and writes them.
# 2. Confirm the legacy column is still present before assuming this works:
psql "$DATABASE_URL" -c "\
  SELECT column_name FROM information_schema.columns \
  WHERE table_name = '<table>' AND column_name = '<legacy_column>';"
```

If that query returns zero rows, the drop already ran and you are in §3.

## 3. Rolling back after the drop

A dropped column's data cannot be restored by an application rollback alone. Prefer an approved forward repair when sufficient; otherwise restore a named disposable/recovery target to a verified pre-drop point and bind it to compatible application artifacts.

```bash
# Restore to a branch at a timestamp before the drop migration committed.
# Inspect migration lineage; created_at is a migration identifier, not proof of wall-clock commit time:
psql "$DATABASE_URL" -c "\
  SELECT id, created_at FROM drizzle.__drizzle_migrations ORDER BY created_at DESC LIMIT 5;"
```

Then follow **[RB-02](RB-02-pitr-backup.md)** to branch at that point, and
**[RB-04](RB-04-recovery-drill.md)** for the approved cutover procedure. Determine the restore timestamp from actual deployment/DB evidence, verify restored data and ledger lineage, and select the matching immutable application/migration artifact. Preserve the sealed journal and ledger; do not delete or fabricate entries to prevent replay. Any subsequent repair is a reviewed forward migration with upgrade and cold-replay proof. Keep the current target intact until the authorized recovery cutover and rollback checks pass.

## 4. What the gates already enforce

These are not conventions; they fail CI.

- `check:migration-discipline` — every migration sets `lock_timeout`; FK additions are `NOT VALID`
  then validated separately; `SET NOT NULL` goes through a `CHECK ... NOT VALID` → `VALIDATE` →
  `SET NOT NULL` → drop-check sequence; no `--> statement-breakpoint` inside a `DO $$` block; no
  `CONCURRENTLY` (it cannot run inside the migration transaction); every file has a journal entry.
- `check:migration-chain` — numeric order matches journal order, no duplicate `idx` or numeric prefix.
- Ledger verification must distinguish stable migration identity, sealed content hash, actual objects and explicitly recorded legacy lineage. A mismatched hash is evidence to investigate, not permission to edit an applied migration or delete ledger rows. Reconcile the current checker through REL-001; historical counts or a row-count match alone do not prove convergence.

## 5. What is still OPEN

A rollback **drill** — actually branching a database, applying a drop, restoring, and re-applying —
has not been run. It needs a disposable Neon branch and is the same infrastructure gap as
[RB-04](RB-04-recovery-drill.md). Do not record this runbook as a drill result.

Also open: the **cold-bootstrap** proof. `db:bootstrap` replaying all 585 migrations requires a
disposable staging database and a host without the local command ceiling. The corrected proof runner
preserves transaction scope, fails closed on missing objects, and now rejects incomplete/corrupt
probe ledgers; the catalog comparison and supported-upgrade proof remain open until it passes at
current head.

## 6. The failure this procedure exists to prevent

A migration that has only been reviewed is unverified. Of the seventeen pending migrations found on
2026-08-31, **five could not apply at all** — an already-existing FK (`42710`), a soft-delete
predicate on a table with no `deleted_at` (`42703`), an index on a table that exists nowhere
(`42P01`), and invalid `VALIDATE CONSTRAINT x ON t` syntax twice (`42601`). A sixth,
`0800`, used `ALTER TABLE ... DROP INDEX` — MySQL syntax — and failed `42601` on first contact.

Apply one at a time, in journal order:

```bash
pnpm -C backend db:apply-one --tag=<tag>
```

It runs statement by statement and names the statement that fails, where `drizzle-kit migrate` hides
the error behind a spinner. Applying out of order moves the watermark past earlier entries and
strands them below it, where `db:migrate` skips them forever while printing success.
