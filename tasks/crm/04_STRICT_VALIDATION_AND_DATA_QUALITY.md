# Strict Validation And Data Quality

## Goal
Every CRM object must have strict validation without making the product rigid. Required fields and formats should be configurable by pipeline/stage/form/source.

## Validation Types
- Required field
- Email format
- Phone format
- URL format
- Numeric min/max
- Currency min/max
- Date cannot be past/future
- Date dependency
- Regex
- Unique field
- Conditional required field
- Stage required field
- Source-specific required field
- Role-specific field editability

## Lead Validation
Configurable validation for:
- name
- email or phone required
- source required
- company required for B2B pipelines
- potential value numeric/currency
- owner required after qualification
- consent required for WhatsApp/SMS/email campaigns

## Deal Validation
Configurable validation for:
- deal name
- amount/value
- close date
- probability
- stage requirements
- contact/account required
- quote required before proposal stage
- lost reason required when lost
- competitor required when lost if configured

## Contact/Company Validation
Configurable validation for:
- duplicate email
- duplicate phone
- required company domain
- GST/tax ID if needed
- website format
- primary contact rules

## Data Quality Dashboard
Show:
- missing emails
- invalid phones
- duplicate leads
- duplicate companies
- stale deals
- no next activity
- no owner
- missing stage-required fields

## Acceptance Criteria
- Server rejects invalid records with field-specific errors.
- Frontend shows the same validation before submit.
- Validation rules are configurable and audited.

