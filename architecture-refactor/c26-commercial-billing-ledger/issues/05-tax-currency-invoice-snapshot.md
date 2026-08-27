# 05 — Invoices snapshot tax and currency immutably

**Status:** in-progress — schema complete; immutability trigger (0492) unapplied; no invoice-assembly service

> ⚠️ **BLOCKED — the schema exists only in TypeScript.** No migration creates any of these tables: a repo-wide grep of `backend/migrations/*.sql` for `commercial_catalog`, `org_entitlement_overrides`, `billing_seat_events`, `billing_proration`, `usage_events` and `invoice_snapshot` returns **zero** matches. Drizzle will not generate DDL for them either, because nothing has run `db:generate`. Every criterion below that is ticked against a schema file is satisfied *in code only* — the table does not exist in any database, so the query fails at runtime while typecheck and the schema barrel stay green. This is the inert-code trap. A migration per table is the first unblocking step.

## Acceptance criteria

- [ ] Invoice headers and line items are normalized and immutable after issue. — `db/schema/billing/invoice-snapshot.ts:35-75` (`billing_invoice_snapshots`) and `:77-101` (`billing_invoice_line_snapshots`) are normalized and separate. Immutability is enforced by trigger `trg_invoice_immutability` (migration `0492`). — **BLOCKED:** migration 0492 is journalled but unapplied; without the trigger any field can be overwritten on a non-DRAFT invoice.
- [x] Seller/buyer identity, addresses, tax registrations, place of supply, rates and tax behavior are snapshotted. — `invoice-snapshot.ts:43-51` (`sellerName`, `sellerAddress`, `sellerTaxIds`, `buyerName`, `buyerAddress`, `buyerTaxIds`, `placeOfSupply`, `taxBehavior`). Schema only.
- [x] Amounts use integer minor units and every row carries ISO currency. — `invoice-snapshot.ts:55-57` (`subtotalMinor`, `taxAmountMinor`, `totalMinor` all `integer`; `currency` `varchar(3)` on header and `:87` on line items). Schema only.
- [x] FX conversions store rate, source and timestamp; historical invoices never use a new rate. — `invoice-snapshot.ts:52-54` (`fxRateMicro`, `fxRateSource`, `fxRateCapturedAt` snapshotted at issue time). Schema only.
- [x] Rounding is deterministic at line and document level. — `invoice-snapshot.ts:58` (`roundingRule` on snapshot header) and `:89` (`taxRateBps` integer basis points on each line). Schema only.
- [x] Corrections use credit/debit notes and preserve the original. — `invoice-snapshot.ts:104-127` (`billing_credit_notes` with `originalSnapshotId` FK `onDelete: "restrict"`, `noteType`, `reason`); original snapshot cannot be deleted. Schema only.
- [x] Invoice numbering is transactionally serialized and auditable. — `invoice-snapshot.ts:19-33` (`billing_invoice_number_sequences` with unique index `uq_billing_inv_num_seq_org_prefix_year` on `(orgId, prefix, year)`, `lastNumber` incremented under a per-org lock). Schema only, no service writes to this table yet.

**Audit note (2026-08-26):** All seven schema tables/structures verified. No migration exists for any of these tables. The single hard blocker is the immutability trigger (migration 0492, journalled but unapplied) — without it criterion 1 is not enforced. All other criteria are satisfied structurally at schema level.

PRD: [`c26 — Commercial billing ledger`](../prd.md) · Candidate index: [`../README.md`](../README.md)
