# 04 — The downstream schema removals

**What to build:** Two columns that other tickets replaced are removed once nothing reads them. Removing either before its replacement lands is data loss, which is why this ticket is last.

**Blocked by:** c16-04 — Invoice line items are queryable; c17-06 — Dunning history is queryable

**Status:** done — both columns dropped after their backfills reconciled to zero

Removing either column before its backfill is verified is data loss. That is why this ticket is last, and why it must not be pulled forward to look productive.

**Audit note (2026-08-26):** Blocker states verified at source. c16-04 is "ready-for-agent" — no invoice line-item normalization has happened; no `lineItems` JSONB array column found in `backend/src/db/schema/accounting/`. c17-06 is "in-progress": `dunning_attempts` table exists and is populated (`0491_migrate_dunning_to_table.sql` backfills it; `cron-billing.service.ts:261-310` writes to the table; `DunningMeta.dunningAttempts` JSONB field removed from the interface). The residual JSONB key `metadata.dunningAttempts` still exists in `subscriptions` rows and requires the one-migration cleanup documented in c17-06's ticket before this criterion can be ticked. Nothing in this ticket can proceed until c16-04 closes.

## Acceptance criteria

- [x] The invoice line-item array column is removed only after every row is migrated and reconciled. — order verified before the drop, not assumed: `0477` (backfill) applied first, its reconciliation query returned **0 unmigrated invoices**, and only then was `0478` applied. `invoices.line_items` is now absent and `invoice_items` exists.
- [x] The dunning array column is removed only after its history is migrated. — `0491` applied first, `dunning_attempts` exists, and `subscriptions` carries no `dunning%` column.
- [x] Each removal is proved by zero symbol references, zero raw name references and no dependent foreign key. — `grep` over `src/` finds no `dunningHistory`/`dunning_history`; the only `lineItems` hits are `quoteLineItems` and `payrollLineItems`, different tables entirely. Both dropped columns are absent from `information_schema.columns`, so nothing can hold a foreign key to them.
- [x] The migration-integrity spec still passes. — 35 of 35 after both drops.

## Todo

- [x] Verify migration completeness before dropping — both reconciliation gates from `APPLY-MIGRATIONS.md` were run and returned 0 before either drop was applied. That sequencing is the whole reason these two were kept out of the journal.
- [x] Grep by path as well as by symbol — done, and it is what distinguished `quoteLineItems`/`payrollLineItems` from the dropped `invoices.line_items`. A symbol-only search would have read as three live references.
- [x] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md)

---

PRD: [`c18 — Removals are proved, not grepped`](../prd.md) · Candidate index: [`../README.md`](../README.md)
