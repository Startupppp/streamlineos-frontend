# Database Schema And Ledger Foundation

## Backend Ownership
Backend owns schema, decimal safety, journal integrity, migrations, audit, and period locks.

## Frontend Ownership
Frontend shows financial data and submits validated actions. Frontend must not calculate authoritative ledger results.

## Core Tables

### accounting_accounts
Already exists or should be extended.

Fields:
- id
- org_id
- code
- name
- account_type: ASSET, LIABILITY, EQUITY, INCOME, EXPENSE
- parent_account_id
- normal_balance: DEBIT, CREDIT
- is_system
- is_active
- description
- created_at
- updated_at

### accounting_journal_entries
Fields:
- id
- org_id
- entry_number
- entry_date
- posting_date
- description
- source_type
- source_id
- source_event
- status: DRAFT, PENDING_APPROVAL, POSTED, VOID
- period_id
- created_by
- approved_by
- approved_at
- posted_by
- posted_at
- reversed_entry_id
- created_at
- updated_at

### accounting_journal_lines
Fields:
- id
- entry_id
- org_id
- account_id
- debit
- credit
- currency
- exchange_rate
- base_debit
- base_credit
- description
- client_id
- vendor_id
- project_id
- department_id
- employee_id
- tax_code_id
- dimension_values JSON
- line_order

### accounting_periods
Fields:
- id
- org_id
- name
- start_date
- end_date
- status: OPEN, CLOSING, CLOSED, LOCKED
- closed_by
- closed_at
- locked_by
- locked_at

### accounting_dimensions
Fields:
- id
- org_id
- name
- key
- required_for_account_types JSON
- is_active

### accounting_dimension_values
Fields:
- id
- org_id
- dimension_id
- name
- code
- is_active

## Ledger Rules
- Debit total must equal credit total for every posted entry.
- Draft entries can be edited.
- Posted entries cannot be edited.
- Posted entries can only be reversed.
- Locked periods reject backdated mutations.
- Every source transaction should have an idempotency key.
- All generated journal entries must reference source type and source ID.

