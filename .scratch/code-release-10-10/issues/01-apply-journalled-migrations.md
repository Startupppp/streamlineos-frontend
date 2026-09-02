# 01 — Apply the three journalled-but-unapplied migrations, proving each bites

**What to build:** Migrations `0989` (workflow execution DLQ status), `0990` (CUSTOMER_SUPPORT template grant backfill) and `0991` (calendar event local version) are present in the tree and have `_journal.json` entries, but have not been applied to any target. An operator who pulls this commit gets a database that silently lacks all three. After this ticket every configured and scratch target carries the objects, and each migration has been proven to change something rather than pass vacuously.

**Blocked by:** None — can start immediately.

**Status:** done (scratch targets only — the configured target is out of bounds, see the last line)

- [x] Each of `0989`, `0990`, `0991` applies cleanly against a scratch target, applied one at a time and in order.
      Evidence: `db-bootstrap.mjs` run three times against `scratch_boot_b` with the journal extended by one entry each time — `REACHED_HEAD 635/635`, then `636/636`, then `637/637`, each printing exactly one `OK [09xx_…]` and 634/635/636 `SKIP`.
- [x] Each is proven to bite inside a rolled-back transaction: run the probe that fails before the migration and passes after, savepointing each probe.
      Evidence: `probes.mjs` (BEGIN … SAVEPOINT per probe … ROLLBACK). BEFORE: 4/4 runtime probes fail — `22P02` on `'dead_lettered'::workflow_execution_status`, `42703` on `workflow_executions.dlq_reason`, `calendar_events.local_version`, `calendar_provider_sync_queue.event_local_version`. AFTER-0989: first two PASS, 0991's two still `42703`. AFTER-0991: all 4 PASS.
- [x] `0990` is verified to actually grant — confirm the six `support:*` keys land on existing `CUSTOMER_SUPPORT` roles and that `access_versions` is bumped, because role templates only grant at role creation and the addition is otherwise inert for every existing organization.
      Evidence: a pre-existing org seeded BEFORE 0990 ran. `role_permission_grants` for the six keys on a system `CUSTOMER_SUPPORT` role: 0 → 6. `access_versions.permissions_version`: 1 → 2. It is NOT inert for existing orgs — **but** it is inert whenever the `permissions` catalog lacks the six rows (a cold-built DB has 39 catalog rows and none of them are `support:*`), and the `access_versions` bump fires anyway. See report finding F7.
- [x] `check:migration-discipline` and `verify-migration-chain` pass; journal `when` values remain strictly increasing and above the applied watermark.
      Evidence: `check-migration-discipline.mjs` exit 0 (637 files, 0 new violations) and `--self-test` exit 0 (27/27). `verify-migration-chain.mjs` exit 0 and `--self-test` exit 0 (10/10). Journal: 637 entries, `when` strictly increasing = true, head `when` = 1803000010087; applied watermark on both scratch targets = 1803000010087, i.e. not ahead of the journal (chain check (f) was run by hand because the script hardcodes `ssl: "require"` and the local server has SSL off).
- [x] The chain and ledger report the new applied count with zero pending, orphan, duplicate or unreachable entries.
      Evidence: `check-migration-ledger.mjs` against `scratch_boot_a` and `scratch_boot_b`, both exit 0 — "637 applied row(s) against 637 journal entr(ies). Watermark 1803000010087; 0 migration(s) pending. No orphan, duplicate or unreachable entries."
- [x] Confirm against `pg_catalog` rather than the journal alone — a migration can be recorded as applied while only partially executed.
      Evidence: `pg_enum` label `dead_lettered` on `workflow_execution_status` = 1; `pg_attribute` for `workflow_executions.dlq_reason` = 1, `calendar_provider_sync_queue.event_local_version` = 1, `calendar_events.local_version` with `attnotnull` AND default `0` = 1; `pg_policy`/`pg_proc`/`pg_namespace` for the F4 fix. All zero before, all one after.

BLOCKED (configured target): the `DATABASE_URL` in `backend/.env` is the shared remote Neon database and the agent briefing forbids writing to it, so the three migrations are applied to scratch targets only. An operator still has to run `pnpm db:migrate` (or `db:bootstrap`) against the configured target. **0990 must not be run there until the API has booted `PermissionCatalogSyncService` on this codebase** — otherwise it grants nothing and only bumps `access_versions`.
