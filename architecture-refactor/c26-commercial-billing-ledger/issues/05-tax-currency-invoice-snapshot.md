# 05 — Invoices snapshot tax and currency immutably

**Status:** ready-for-agent

## Acceptance criteria

- [ ] Invoice headers and line items are normalized and immutable after issue.
- [ ] Seller/buyer identity, addresses, tax registrations, place of supply, rates and tax behavior are snapshotted.
- [ ] Amounts use integer minor units and every row carries ISO currency.
- [ ] FX conversions store rate, source and timestamp; historical invoices never use a new rate.
- [ ] Rounding is deterministic at line and document level.
- [ ] Corrections use credit/debit notes and preserve the original.
- [ ] Invoice numbering is transactionally serialized and auditable.
