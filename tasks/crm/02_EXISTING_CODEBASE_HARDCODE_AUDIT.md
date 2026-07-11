# Existing Codebase Hardcode Audit

## Backend Hardcoded Areas

### Leads
Current schemas hardcode:
- statuses
- priorities
- sources
- sortable fields
- default source
- default priority

These must move to CRM metadata/configuration.

### Deals
Current schemas hardcode:
- deal stages
- default stage
- won/lost stage handling
- approval requested stage enum

These must move to pipeline configuration.

### Automations
There are two automation systems:
- general automation module
- CRM-specific automation rules

CRM-specific trigger/action enums are too limited and must be replaced with an organization-scoped automation event/action registry.

### Assignment/SLA
Lead triggers hardcode:
- priority-to-SLA mapping
- rule condition behavior
- assignment types

Move these to routing/SLA configuration.

### Approvals
Deal approval schema defaults approver role to `CEO`. This must be configurable by role, named user, manager, team, or dynamic rule.

## Frontend Hardcoded Areas
- Deal stages and colors in deal detail UI.
- Lead status/priority badge colors.
- Source labels.
- Client/account status labels.
- CRM settings tabs.
- Email template variable list.
- Smart search example queries.

Frontend must fetch metadata/configuration from backend.

## Migration Rule
Do not break existing users. Seed a default CRM configuration that matches current constants, then migrate records to reference metadata IDs/keys.

## Acceptance Criteria
- `rg` should not find core CRM process constants duplicated across backend/frontend after migration.
- Defaults exist as seed data, not service constants.
- Tests prove old records still render correctly.

