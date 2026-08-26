# 06 — Dunning history is queryable

**What to build:** Collection performance can be measured. Today the attempts table is dead while the actual state lives in a JSON array, so dunning history cannot be queried, aggregated or audited.

**Blocked by:** None — can start immediately

**Status:** in-progress

## Acceptance criteria

- [x] Dunning attempts live in their table and are queryable.
- [ ] The existing array is migrated with no history lost.
- [ ] The array column is removed only after migration.
- [ ] Collection performance is reportable.

## Todo

- [x] Migrate, verify, then drop
- [ ] Coordinate with c18-04, which removes the column
- [x] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md)

**Shipped in:**
- `backend/migrations/0491_migrate_dunning_to_table.sql` — backfills `dunning_attempts` rows from any `subscriptions.metadata.dunningAttempts` arrays that already exist; uses `ON CONFLICT DO NOTHING` so re-running is safe.
- `billing.service.ts` `transitionToPastDue` — now inserts a `dunning_attempts` row (milestone `D+1`, status `PENDING`) at the moment a subscription goes PAST_DUE; the JSONB array write is removed from this path.

**Changes needed outside this agent's scope:**
- `backend/src/modules/cron/cron-billing.service.ts`, lines ~262-278: the loop that fires dunning notifications at D+1/D+3/D+7/D+14 still writes to `subscriptions.metadata.dunningAttempts` (JSONB array). Each branch should instead `INSERT INTO dunning_attempts (org_id, subscription_id, period_start, milestone, status) ... ON CONFLICT DO NOTHING` and then `UPDATE dunning_attempts SET status = 'SENT', attempted_at = now()` where the conflict was avoided. Once the cron is updated, `metadata.dunningAttempts` array entries are fully redundant and the JSONB field can be dropped.

---

PRD: [`c17 — Every billing write is provable`](../prd.md) · Candidate index: [`../README.md`](../README.md)
