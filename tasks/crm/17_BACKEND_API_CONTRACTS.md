# Backend API Contracts

## Metadata
- `GET /crm/metadata`
- `GET /crm/pipelines`
- `POST /crm/pipelines`
- `PATCH /crm/pipelines/:id`
- `GET /crm/pipelines/:id/stages`
- `POST /crm/pipelines/:id/stages`
- `PATCH /crm/stages/:id`
- `GET /crm/options/:type`
- `POST /crm/options/:type`

## Validation
- `GET /crm/validation-rules`
- `POST /crm/validation-rules`
- `PATCH /crm/validation-rules/:id`
- `POST /crm/validation-rules/test`

## Blueprint
- `GET /crm/blueprints`
- `POST /crm/blueprints`
- `PATCH /crm/blueprints/:id`
- `POST /crm/blueprints/:id/test-transition`

## Automation
- `GET /crm/automation/events`
- `GET /crm/automation/actions`
- `GET /crm/automations`
- `POST /crm/automations`
- `PATCH /crm/automations/:id`
- `POST /crm/automations/:id/test`
- `GET /crm/automations/:id/runs`

## Existing APIs
Keep current leads/deals/contacts/quotes APIs compatible while migrating internals to metadata-driven validation.

## Acceptance Criteria
- All APIs validate org scope.
- Admin APIs require CRM settings permissions.
- Metadata APIs are cached safely.

