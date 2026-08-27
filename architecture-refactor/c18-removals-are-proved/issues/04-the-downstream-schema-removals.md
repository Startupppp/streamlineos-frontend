# 04 — The downstream schema removals

**What to build:** Two columns that other tickets replaced are removed once nothing reads them. Removing either before its replacement lands is data loss, which is why this ticket is last.

**Blocked by:** c16-04 — Invoice line items are queryable; c17-06 — Dunning history is queryable

**Status:** ready-for-agent — BLOCKED on c16-04 (still ready-for-agent); c17-06 is in-progress with dunning code migrated but JSONB key cleanup (this ticket's job) pending

**Audit note (2026-08-26):** Blocker states verified at source. c16-04 is "ready-for-agent" — no invoice line-item normalization has happened; no `lineItems` JSONB array column found in `backend/src/db/schema/accounting/`. c17-06 is "in-progress": `dunning_attempts` table exists and is populated (`0491_migrate_dunning_to_table.sql` backfills it; `cron-billing.service.ts:261-310` writes to the table; `DunningMeta.dunningAttempts` JSONB field removed from the interface). The residual JSONB key `metadata.dunningAttempts` still exists in `subscriptions` rows and requires the one-migration cleanup documented in c17-06's ticket before this criterion can be ticked. Nothing in this ticket can proceed until c16-04 closes.

## Acceptance criteria

- [ ] The invoice line-item array column is removed only after every row is migrated and reconciled. — **BLOCKED:** c16-04 not started; no invoice line-item normalization exists in the schema.
- [ ] The dunning array column is removed only after its history is migrated. — **BLOCKED:** c17-06 code migration done; JSONB key cleanup migration (`UPDATE subscriptions SET metadata = metadata - 'dunningAttempts' WHERE metadata ? 'dunningAttempts'`) not yet run. Cannot proceed while c16-04 is also open.
- [ ] Each removal is proved by zero symbol references, zero raw name references and no dependent foreign key. — **BLOCKED:** upstream not done.
- [ ] The migration-integrity spec still passes. — **BLOCKED:** upstream not done; would need verification after any removal.

## Todo

- [ ] Verify migration completeness before dropping — **BLOCKED:** c16-04 not started.
- [ ] Grep by path as well as by symbol — **BLOCKED:** c16-04 not started.
- [ ] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md) — **BLOCKED:** c16-04 and c17-06 not both closed.

---

PRD: [`c18 — Removals are proved, not grepped`](../prd.md) · Candidate index: [`../README.md`](../README.md)
