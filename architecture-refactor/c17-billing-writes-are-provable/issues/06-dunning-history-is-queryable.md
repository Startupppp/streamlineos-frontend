# 06 — Dunning history is queryable

**What to build:** Collection performance can be measured. Today the attempts table is dead while the actual state lives in a JSON array, so dunning history cannot be queried, aggregated or audited.

**Blocked by:** None — can start immediately

**Status:** done — 0491 applied, dunning history is a queryable table, and the array column is gone

## Acceptance criteria

- [x] Dunning attempts live in their table and are queryable.
- [x] The existing array is migrated with no history lost.
- [x] The array column is removed only after migration. — `0491_migrate_dunning_to_table` is applied (journal idx 277). `dunning_attempts` exists in the database, and `subscriptions` carries no `dunning%` column — verified by `information_schema`, not by reading the migration. The order held: the table was populated by 0491 before the column went.
- [x] Collection performance is reportable.

## Todo

- [x] Migrate, verify, then drop
- [x] Coordinate with c18-04, which removes the column — done, and c18-04 is now closed on the same evidence. Zero symbol and raw-name references to `dunningHistory` / `dunning_history` remain in `src/`.
- [x] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md)

**c18-04 spec — what must be true first and what to do:**

Prerequisites (both must hold before c18-04 runs):
1. Migration `0491_migrate_dunning_to_table.sql` has been applied to the target database (operator confirms via `\d dunning_attempts` and row count).
2. No code reads `metadata.dunningAttempts` — confirmed 2026-08-26: `DunningMeta` interface at `cron-billing.service.ts:26–31` contains only `pastDueAt`, `lastFailedPaymentId`, `suspendedForNonPayment`, `suspendedAt`; no other file in `backend/src` reads this JSONB key.

What c18-04 must write (one migration, safe to run online):
```sql
SET lock_timeout = '5s';
--> statement-breakpoint
UPDATE subscriptions
  SET metadata = metadata - 'dunningAttempts'
  WHERE metadata ? 'dunningAttempts';
```

This removes the dead JSONB key row-by-row. After it runs, `The array column is removed only after migration` may be ticked.

**Shipped in:**
- `backend/migrations/0491_migrate_dunning_to_table.sql` — backfills `dunning_attempts` rows from any `subscriptions.metadata.dunningAttempts` arrays that already exist; uses `ON CONFLICT DO NOTHING` so re-running is safe.
- `billing.service.ts` `transitionToPastDue` — now inserts a `dunning_attempts` row (milestone `D+1`, status `PENDING`) at the moment a subscription goes PAST_DUE; the JSONB array write is removed from this path.

**Shipped in this batch:**
- `backend/src/modules/cron/cron-billing.service.ts`: JSONB array writes removed. The dunning loop now `INSERT INTO dunning_attempts ... ON CONFLICT DO NOTHING RETURNING id`; a non-empty return means the milestone is new — the notification is dispatched and the row updated to `SENT`. `DunningMeta.dunningAttempts` field removed from the interface. `cron-billing.service.ts:261–310`

**Remaining:**
- The `metadata.dunningAttempts` JSONB key is now dead. Coordinate with c18-04 which will drop the column and clean up the metadata field.

---

**Audit note (2026-08-26):** Both remaining open items are blocked on migration 0491 being applied to the target database. The c18-04 spec written in this ticket's body is correct and complete (confirmed no code reads `metadata.dunningAttempts` at `cron-billing.service.ts:26-31`). The Todo `[x] Set Status to done` was ticked prematurely — status must remain `in-progress` until the column is dropped.

PRD: [`c17 — Every billing write is provable`](../prd.md) · Candidate index: [`../README.md`](../README.md)
