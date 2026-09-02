# 01 — Apply the three journalled-but-unapplied migrations, proving each bites

**What to build:** Migrations `0989` (workflow execution DLQ status), `0990` (CUSTOMER_SUPPORT template grant backfill) and `0991` (calendar event local version) are present in the tree and have `_journal.json` entries, but have not been applied to any target. An operator who pulls this commit gets a database that silently lacks all three. After this ticket every configured and scratch target carries the objects, and each migration has been proven to change something rather than pass vacuously.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] Each of `0989`, `0990`, `0991` applies cleanly against a scratch target, applied one at a time and in order.
- [ ] Each is proven to bite inside a rolled-back transaction: run the probe that fails before the migration and passes after, savepointing each probe.
- [ ] `0990` is verified to actually grant — confirm the six `support:*` keys land on existing `CUSTOMER_SUPPORT` roles and that `access_versions` is bumped, because role templates only grant at role creation and the addition is otherwise inert for every existing organization.
- [ ] `check:migration-discipline` and `verify-migration-chain` pass; journal `when` values remain strictly increasing and above the applied watermark.
- [ ] The chain and ledger report the new applied count with zero pending, orphan, duplicate or unreachable entries.
- [ ] Confirm against `pg_catalog` rather than the journal alone — a migration can be recorded as applied while only partially executed.
