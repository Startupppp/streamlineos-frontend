# Tax, GST, TDS, VAT And Compliance

## Existing Baseline
- GSTR-1 exists.
- GSTR-3B exists.
- GSTIN validation exists in purchase bill schema.

## Goal
Turn tax from report-only into a full tax engine.

## Backend Requirements
- Tax codes table.
- Tax rates by country/state.
- Input/output tax tracking.
- Reverse charge support.
- GST place-of-supply logic.
- TDS/TCS support for India later.
- VAT support for non-India orgs later.
- Tax payment recording.
- Tax adjustment journal entries.

## Frontend Requirements
Pages:
- Tax dashboard
- Tax settings
- GST reports
- Tax payments
- Tax code list
- Tax audit drill-down

## Reports
- GSTR-1
- GSTR-3B
- Input tax report
- Output tax report
- Tax liability summary
- TDS payable report later
- VAT return later

## Acceptance Criteria
- Every tax report line can drill down to source invoice/bill.
- Tax liability ties to ledger.
- Tax payment reduces tax payable.
- Tax settings are organization-scoped.

