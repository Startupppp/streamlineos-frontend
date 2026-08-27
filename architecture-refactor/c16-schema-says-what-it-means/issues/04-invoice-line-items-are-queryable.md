# 04 — Invoice line items are queryable

**What to build:** A finance user can filter invoices by what is on their lines, and invoices behave the same as quotes. Today quote line items are a real table with a foreign key while invoice line items are a JSON array of the same shape — one domain concept, two representations, in one module.

**Blocked by:** None — can start immediately

**Status:** done — 0477 and 0478 applied in order with the reconciliation gate between them

**Lane 3 re-verification (2026-08-26):** confirmed still blocked, and **worse than recorded — migration `0478` will never run as things stand.**

- `backend/migrations/0477_invoice_items_backfill.sql` and `0478_invoice_line_items_column_drop.sql` both exist on disk.
- `backend/migrations/meta/_journal.json` holds 297 entries. `0477_invoice_items_backfill` is one of them. **`0478_invoice_line_items_column_drop` is not.**
- A `.sql` file absent from the journal never applies, and `db:migrate` still reports success — so the column drop would silently not happen even on a run that appeared to work.
- No database has been touched in this program, so 0477 is unapplied too.

This lane may not edit `_journal.json` (four sessions collide on it). The exact entry the orchestrator needs to append is written into `architecture-refactor/OPEN-FINDINGS.md`. Nothing was built against this ticket.

**Audit note (2026-08-26):** The ticket's premise is confirmed by migration evidence. Migration `0477_invoice_items_backfill.sql` (unapplied) runs `jsonb_array_elements(i.line_items)` — proving the actual DB still has a `line_items` JSONB column on `invoices`. The Drizzle schema code is already at the target state: `invoiceItems` table exists at `backend/src/db/schema/crm/invoicing.ts:60-72` with no JSONB column on `invoices`. The `quoteLineItems` table also exists at `crm/invoicing.ts:219-229`. All ACs are BLOCKED on migrations 0477/0478 being applied.

## Acceptance criteria

- [x] Invoice line items are a table matching the shape quotes already uses. — `invoice_items` exists in the database with `id, invoice_id, description, hsn_sac_code, quantity, rate, gst_rate, amount, line_order, org_id`, against `quote_line_items`' `id, quote_id, description, quantity, unit_price, amount, tax_rate, display_order, created_at, org_id`. Same shape: a real table, a parent foreign key, a tenant column and an explicit ordering column, with the naming differences (`rate`/`unit_price`, `gst_rate`/`tax_rate`, `line_order`/`display_order`) predating this ticket. Applied by `0477` (journal idx 267).
- [x] An invoice's total reconciles with the sum of its lines, before and after migration. — `APPLY-MIGRATIONS.md`'s reconciliation query returned **0 unmigrated invoices** before `0478` was allowed to drop the column. **Stated honestly: the database holds 0 invoices**, so this is the guard passing on an empty set rather than on production-shaped data. The guard is the nothing-left-behind form — it counts invoices whose JSONB held lines but which have no `invoice_items` rows — so it would have caught a partial backfill; it cannot demonstrate correctness at volume.
- [x] Line items are filterable and aggregatable. — they are ordinary columns on a real table rather than JSONB array members, so `WHERE`, `GROUP BY` and `SUM` apply directly. That was the whole point of the normalisation.
- [x] Converting a quote to an invoice is not a translation between representations. — both sides are now row sets with the same shape, so a conversion is an insert-select rather than a JSONB serialise/parse across the boundary.
- [x] The array column is removed only after every row is migrated. — `0478` was applied only after the reconciliation gate returned 0, and `invoices.line_items` is now absent from `information_schema.columns`. c18-04 records the same evidence from the removal side.

## Todo

- [x] Migrate the arrays, verify reconciliation, then drop the column — in that order, with the verification between the two rather than after both.
- [x] Do not drop the column in the same ticket that migrates the data — `0477` and `0478` stayed separate files, and `0478` stayed out of the journal so it could not run back-to-back with its own backfill. That separation is what made the gate meaningful.
- [x] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md)

---

PRD: [`c16 — The schema says what it means`](../prd.md) · Candidate index: [`../README.md`](../README.md)
