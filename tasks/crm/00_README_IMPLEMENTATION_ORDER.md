# CRM PRD Pack

## Product
World-class CRM and Revenue Automation module for StreamlineOS.

## Goal
Refactor the existing CRM into a configurable, automation-first revenue operating system with strict validation, no hardcoded sales process values, clean frontend/backend contracts, and deep integration with the rest of StreamlineOS.

## Current Codebase Baseline
Existing code includes:

- Backend CRM module: `streamlineos-backend/src/modules/crm`
- Leads module: `streamlineos-backend/src/modules/leads`
- Deals module: `streamlineos-backend/src/modules/deals`
- Contacts module: `streamlineos-backend/src/modules/contacts`
- Quotes module integration
- AI CRM services
- CRM automation services
- Assignment rules
- Scoring rules
- SLA policies
- Territories
- Web forms
- Products
- Email templates
- CRM dashboard/reporting routes
- Frontend CRM routes under `streamlineos-frontend/frontend/app/(authenticated)/crm`

## Known Hardcoded Values To Remove
- Lead statuses: `NEW`, `CONTACTED`, `INTERESTED`, `QUALIFIED`, `CONVERTED`, `LOST`
- Lead priorities: `HOT`, `WARM`, `COLD`
- Lead sources: `referral`, `campaign`, `cold_call`, `website`, `social_media`, `walk_in`, `other`
- Deal stages: `LEAD`, `CONTACTED`, `PROPOSAL`, `NEGOTIATION`, `WON`, `LOST`
- Automation trigger/action enums in CRM-specific automation schemas
- Fixed approval role default: `CEO`
- Fixed lead distribution role assumptions like CEO/HR checks
- Frontend hardcoded stage/status/source labels, colors, and example filters
- Fixed priority-to-SLA mapping in lead triggers
- Fixed dashboard status maps/colors where they should come from metadata

## Implementation Order
1. `01_PRODUCT_STRATEGY_AND_BENCHMARKS.md`
2. `02_EXISTING_CODEBASE_HARDCODE_AUDIT.md`
3. `03_TARGET_ARCHITECTURE_AND_METADATA_MODEL.md`
4. `04_STRICT_VALIDATION_AND_DATA_QUALITY.md`
5. `05_PIPELINES_STAGES_STATUSES_AND_BLUEPRINTS.md`
6. `06_LEADS_CAPTURE_ROUTING_SCORING_AND_DEDUPE.md`
7. `07_CONTACTS_COMPANIES_ACCOUNTS_AND_CUSTOMER_360.md`
8. `08_DEALS_FORECAST_APPROVALS_AND_REVENUE_PROCESS.md`
9. `09_QUOTES_PRODUCTS_PRICEBOOKS_AND_QUOTE_TO_CASH.md`
10. `10_ACTIVITY_TASKS_CALENDAR_AND_SALES_INBOX.md`
11. `11_AUTOMATION_STUDIO_WORKFLOWS_AND_SEQUENCES.md`
12. `12_TERRITORIES_ASSIGNMENT_AND_SLA.md`
13. `13_MARKETING_CAMPAIGNS_ATTRIBUTION_AND_LEAD_NURTURE.md`
14. `14_AI_SALES_COPILOT_AND_INTELLIGENCE.md`
15. `15_REPORTING_ANALYTICS_FORECASTING_AND_REVOPS.md`
16. `16_FRONTEND_UI_UX_REQUIREMENTS.md`
17. `17_BACKEND_API_CONTRACTS.md`
18. `18_SECURITY_PERMISSIONS_AUDIT_AND_COMPLIANCE.md`
19. `19_INTEGRATIONS_WITH_STREAMLINEOS_MODULES.md`
20. `20_TESTING_MIGRATION_ROLLOUT_AND_AGENT_PROMPT.md`
21. `21_CONFIGURATION_CHECKLIST_A_TO_Z.md`

## Non-Negotiables
- No CRM process values are hardcoded in backend services or frontend screens.
- Pipelines, stages, statuses, priorities, sources, lost reasons, approval rules, scoring rules, SLA rules, automation triggers, and UI colors must come from organization-scoped configuration.
- Strict validation must be server-side, typed, tested, and mirrored in frontend forms.
- Existing behavior must be migrated into seeded default CRM configuration.
- Every automation run, stage change, assignment, merge, import, and approval must be audited.

