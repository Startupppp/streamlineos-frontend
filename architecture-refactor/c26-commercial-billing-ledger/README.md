# c26 — Commercial billing is a versioned ledger

PRD: [`prd.md`](prd.md) · Program: [`../README.md`](../README.md)

**Wave 1** · 6 tickets, 3 done.

c17 makes individual writes provable. This candidate supplies the commercial model c17 deliberately left out: versioned prices and entitlements, seat accounting, proration, usage meters, and immutable tax/currency snapshots.

| # | Ticket | Blocked by | Status |
|---|---|---|---|
| 01 | [Plans, prices and entitlements are versioned data](issues/01-versioned-catalog.md) | — | done |
| 02 | [Seats have one auditable ledger](issues/02-seat-ledger.md) | 01 | in-progress — writer done, 4 call sites open |
| 03 | [Proration is stored, not recomputed](issues/03-proration-ledger.md) | 01, 02 | in-progress — producer done, call site open |
| 04 | [Usage metering is idempotent and aggregatable](issues/04-usage-metering.md) | 01 | done |
| 05 | [Invoices snapshot tax and currency immutably](issues/05-tax-currency-invoice-snapshot.md) | 01, 03, 04 | in-progress — needs 0565 journalled |
| 06 | One subscription table feeds billing and platform administration | 01 | done |
