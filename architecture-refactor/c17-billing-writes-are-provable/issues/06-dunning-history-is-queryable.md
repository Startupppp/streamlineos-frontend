# 06 — Dunning history is queryable

**What to build:** Collection performance can be measured. Today the attempts table is dead while the actual state lives in a JSON array, so dunning history cannot be queried, aggregated or audited.

**Blocked by:** None — can start immediately

**Status:** in-progress

## Acceptance criteria

- [x] Dunning attempts live in their table and are queryable.
- [x] The existing array is migrated with no history lost.
- [ ] The array column is removed only after migration.
- [x] Collection performance is reportable.

## Todo

- [x] Migrate, verify, then drop
- [ ] Coordinate with c18-04, which removes the column
- [x] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md)

**Shipped in:**
- `backend/migrations/0491_migrate_dunning_to_table.sql` — backfills `dunning_attempts` rows from any `subscriptions.metadata.dunningAttempts` arrays that already exist; uses `ON CONFLICT DO NOTHING` so re-running is safe.
- `billing.service.ts` `transitionToPastDue` — now inserts a `dunning_attempts` row (milestone `D+1`, status `PENDING`) at the moment a subscription goes PAST_DUE; the JSONB array write is removed from this path.

**Shipped in this batch:**
- `backend/src/modules/cron/cron-billing.service.ts`: JSONB array writes removed. The dunning loop now `INSERT INTO dunning_attempts ... ON CONFLICT DO NOTHING RETURNING id`; a non-empty return means the milestone is new — the notification is dispatched and the row updated to `SENT`. `DunningMeta.dunningAttempts` field removed from the interface. `cron-billing.service.ts:261–310`

**Remaining:**
- The `metadata.dunningAttempts` JSONB key is now dead. Coordinate with c18-04 which will drop the column and clean up the metadata field.

---

PRD: [`c17 — Every billing write is provable`](../prd.md) · Candidate index: [`../README.md`](../README.md)
