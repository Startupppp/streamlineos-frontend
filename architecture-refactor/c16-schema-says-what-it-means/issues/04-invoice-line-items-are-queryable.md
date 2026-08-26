# 04 — Invoice line items are queryable

**What to build:** A finance user can filter invoices by what is on their lines, and invoices behave the same as quotes. Today quote line items are a real table with a foreign key while invoice line items are a JSON array of the same shape — one domain concept, two representations, in one module.

**Blocked by:** None — can start immediately

**Status:** ready-for-agent

**Lane 3 re-verification (2026-08-26):** confirmed still blocked, and **worse than recorded — migration `0478` will never run as things stand.**

- `backend/migrations/0477_invoice_items_backfill.sql` and `0478_invoice_line_items_column_drop.sql` both exist on disk.
- `backend/migrations/meta/_journal.json` holds 297 entries. `0477_invoice_items_backfill` is one of them. **`0478_invoice_line_items_column_drop` is not.**
- A `.sql` file absent from the journal never applies, and `db:migrate` still reports success — so the column drop would silently not happen even on a run that appeared to work.
- No database has been touched in this program, so 0477 is unapplied too.

This lane may not edit `_journal.json` (four sessions collide on it). The exact entry the orchestrator needs to append is written into `architecture-refactor/lane-requests/lane-3.md`. Nothing was built against this ticket.

**Audit note (2026-08-26):** The ticket's premise is confirmed by migration evidence. Migration `0477_invoice_items_backfill.sql` (unapplied) runs `jsonb_array_elements(i.line_items)` — proving the actual DB still has a `line_items` JSONB column on `invoices`. The Drizzle schema code is already at the target state: `invoiceItems` table exists at `backend/src/db/schema/crm/invoicing.ts:60-72` with no JSONB column on `invoices`. The `quoteLineItems` table also exists at `crm/invoicing.ts:219-229`. All ACs are BLOCKED on migrations 0477/0478 being applied.

## Acceptance criteria

- [ ] Invoice line items are a table matching the shape quotes already uses. — **BLOCKED:** schema code has `invoiceItems` at `crm/invoicing.ts:60-72`; actual DB retains `invoices.line_items` JSONB until migration 0477 is applied.
- [ ] An invoice's total reconciles with the sum of its lines, before and after migration, on production-shaped data. — **BLOCKED:** requires live DB access; no DB access in this program.
- [ ] Line items are filterable and aggregatable. — **BLOCKED:** depends on migration 0477.
- [ ] Converting a quote to an invoice is not a translation between representations. — **BLOCKED:** depends on migration 0477/0478.
- [ ] The array column is removed only after every row is migrated. — **BLOCKED:** migration 0478 (column drop) is sequenced after 0477 (backfill); both unapplied.

## Todo

- [ ] Migrate the arrays, verify reconciliation, then drop the column — **BLOCKED:** migrations 0477/0478 unapplied.
- [ ] Do not drop the column in the same ticket that migrates the data — **BLOCKED:** the migration split is already correct (0477 = backfill, 0478 = drop); waiting on application.
- [ ] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md)

---

PRD: [`c16 — The schema says what it means`](../prd.md) · Candidate index: [`../README.md`](../README.md)
