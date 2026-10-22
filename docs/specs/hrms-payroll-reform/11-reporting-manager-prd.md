# Reporting-manager implementation evidence

**Status:** Code-presence review; open acceptance remains in the detailed PRD.
**Owner:** People Core  
**Updated:** 2026-10-22

The detailed [reporting-manager, onboarding, import, and review PRD](./15-reporting-manager-onboarding-prd.md) retains its prose and every open TODO. The [Core HR PRD](./01-core-hr-lifecycle-prd.md) owns the target relationship model. This note records why a page-or-module creation task should not be duplicated in a new backlog.

| Area | Source found |
|---|---|
| Policy and fallback | backend/src/modules/directory/reporting-manager-policy.service.ts; backend/src/modules/directory/reporting-manager-fallback.resolver.ts |
| Relationship data and validation | backend/src/db/schema/hr/reporting-manager.ts; backend/src/modules/directory/reporting-line.service.ts |
| Self-service correction and HR review | backend/src/modules/hr/directory/my-reporting-line.controller.ts; frontend/features/hr/reporting-managers/requests/ |
| Bulk changes | backend/src/modules/hr/directory/reporting-line-bulk-jobs.controller.ts; frontend/features/hr/reporting-managers/bulk/ |
| Policy and employee UI | frontend/features/hr/reporting-managers/policy/; frontend/features/hr/employees/detail/reporting-line-section.tsx |
| Route record | frontend/PAGES.md, including the settings, review, bulk-change, onboarding and employee detail surfaces |

This inventory shows that the implementation has progressed since the detailed PRD was written. It does not close the detailed PRD's behavioral, database, browser, migration, accessibility, notification, or release checks. Those TODOs stay in that file until each passes its own acceptance evidence.
