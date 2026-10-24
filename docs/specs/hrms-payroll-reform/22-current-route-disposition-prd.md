# Current People and Payroll route disposition

**Status:** Proposed migration inventory from live `page.tsx` source on 2026-10-24; route existence is not proof of feature completion. **Authority:** [PRD 07](./07-pages-navigation-roles-prd.md) defines canonical navigation, [PRDs 18–21](./18-self-service-page-ui-backend-prd.md) define UI/backend behavior, and [PRD 07a](./07a-page-permission-manifest-prd.md) defines access.

This table enumerates every existing frontend `/me`, `/hr`, `/payroll` and `/timesheets/payroll` page found in the current route tree (124 entries). A “consolidate” decision is a proposal, not permission to delete a route immediately. Preserve unique behavior and old deep links until canonical parity, actor/matrix checks, redirect tests and zero-caller proof pass. Remove redundant sidebar items immediately only when the surviving page works for the actor. Keep the old URL as a tested transition only for a bounded migration period; do not preserve an access-bypass alias. Changes to financial or legal evidence need separate retention review.

| Existing page route | Canonical destination or owner | Disposition |
|---|---|---|
| `/hr` | `/hr` | Keep; verify contract |
| `/hr/access` | `/hr/settings/access` | Consolidate after parity and zero-caller proof |
| `/hr/accommodations` | `/hr/accommodations` | Keep; verify contract |
| `/hr/analytics` | `/hr/analytics` | Keep; verify contract |
| `/hr/announcements` | `/hr/announcements` | Keep; verify contract |
| `/hr/approvals` | `/hr` (admin Action Center queue) | Consolidate after parity and zero-caller proof |
| `/hr/asset-returns` | `/hr/assets (returns tab)` | Consolidate after parity and zero-caller proof |
| `/hr/assets` | `/hr/assets` | Keep; verify contract |
| `/hr/attendance` | `/hr/attendance` | Keep; verify contract |
| `/hr/background-verification` | `/hr/onboarding (verification tab)` | Consolidate after parity and zero-caller proof |
| `/hr/benefits` | `/hr/benefits` | Keep; verify contract |
| `/hr/biometric` | `/hr/time-clocks (events tab)` | Consolidate after parity and zero-caller proof |
| `/hr/cases` | `/hr/cases` | Keep; verify contract |
| `/hr/comp-off` | `/hr/overtime (comp-off tab)` | Consolidate after parity and zero-caller proof |
| `/hr/compensation-planning` | `/hr/compensation (planning tab)` | Consolidate after parity and zero-caller proof |
| `/hr/compliance` | `/hr/audit (compliance tab)` | Consolidate after parity and zero-caller proof |
| `/hr/contingent` | `/hr/employees (worker-type filter)` | Consolidate after parity and zero-caller proof |
| `/hr/delegations` | `/hr/settings/delegations` | Consolidate after parity and zero-caller proof |
| `/hr/devices` | `/hr/time-clocks (devices tab)` | Consolidate after parity and zero-caller proof |
| `/hr/document-review` | `/hr/documents (review queue)` | Consolidate after parity and zero-caller proof |
| `/hr/document-types` | `/hr/documents (types tab)` | Consolidate after parity and zero-caller proof |
| `/hr/documents` | `/hr/documents` | Keep; verify contract |
| `/hr/documents/editor/[documentId]` | `/hr/documents (contextual editor)` | Consolidate after parity and zero-caller proof |
| `/hr/documents/editor/new` | `/hr/documents (contextual editor)` | Consolidate after parity and zero-caller proof |
| `/hr/documents/templates` | `/hr/settings/templates (documents tab)` | Consolidate after parity and zero-caller proof |
| `/hr/documents/templates/[templateId]/edit` | `/hr/settings/templates (contextual editor)` | Consolidate after parity and zero-caller proof |
| `/hr/documents/templates/new` | `/hr/settings/templates (contextual editor)` | Consolidate after parity and zero-caller proof |
| `/hr/email-templates` | `/hr/settings/templates (email tab)` | Consolidate after parity and zero-caller proof |
| `/hr/emergency` | `/hr/emergency` | Keep; verify contract |
| `/hr/employees` | `/hr/employees` | Keep; verify contract |
| `/hr/employees/[employeeId]` | `/hr/employees/[workerId]` | Consolidate after parity and zero-caller proof |
| `/hr/employees/find-expert` | `/hr/skills (expert search)` | Consolidate after parity and zero-caller proof |
| `/hr/employees/manager-coverage` | `/hr/settings/reporting-managers (coverage tab)` | Consolidate after parity and zero-caller proof |
| `/hr/employees/reporting-changes` | `/hr/settings/reporting-managers (jobs tab)` | Consolidate after parity and zero-caller proof |
| `/hr/employees/reporting-changes/[jobId]` | `/hr/settings/reporting-managers (job detail)` | Consolidate after parity and zero-caller proof |
| `/hr/employees/reporting-requests` | `/hr/settings/reporting-managers (requests tab)` | Consolidate after parity and zero-caller proof |
| `/hr/employees/skills-matrix` | `/hr/skills (matrix tab)` | Consolidate after parity and zero-caller proof |
| `/hr/engagement` | `/hr/engagement` | Keep; verify contract |
| `/hr/equity` | `/hr/equity` | Keep; verify contract |
| `/hr/event-stream` | `/hr/audit (event tab)` | Consolidate after parity and zero-caller proof |
| `/hr/exit` | `/hr/offboarding` | Consolidate after parity and zero-caller proof |
| `/hr/exit/[resignationId]` | `/hr/offboarding (exit detail)` | Consolidate after parity and zero-caller proof |
| `/hr/expenses` | Expenses product | Consolidate after parity and zero-caller proof |
| `/hr/feedback` | `/hr/feedback` | Keep; verify contract |
| `/hr/fnf` | `/payroll/fnf (status only in HR exit)` | Consolidate after parity and zero-caller proof |
| `/hr/geofencing` | `/hr/settings/attendance (geofence tab)` | Consolidate after parity and zero-caller proof |
| `/hr/goals` | `/hr/goals` | Keep; verify contract |
| `/hr/handbook` | `/hr/knowledge` | Consolidate after parity and zero-caller proof |
| `/hr/helpdesk` | `/hr/service` | Consolidate after parity and zero-caller proof |
| `/hr/holidays` | `/hr/holidays` | Keep; verify contract |
| `/hr/identity` | `/hr/employees (identity tab)` | Consolidate after parity and zero-caller proof |
| `/hr/kpis` | `/hr/analytics (KPI tab)` | Consolidate after parity and zero-caller proof |
| `/hr/labor-relations` | `/hr/labor-relations` | Keep; verify contract |
| `/hr/leave-policies` | `/hr/settings/leave` | Consolidate after parity and zero-caller proof |
| `/hr/leaves` | `/hr/leaves` | Keep; verify contract |
| `/hr/leaves/analytics` | `/hr/leaves (analytics tab)` | Consolidate after parity and zero-caller proof |
| `/hr/legal-holds` | `/hr/legal-holds` | Keep; verify contract |
| `/hr/onboarding` | `/hr/onboarding` | Keep; verify contract |
| `/hr/onboarding/[userId]` | `/hr/onboarding/[workerId]` | Consolidate after parity and zero-caller proof |
| `/hr/onboarding/probation` | `/hr/onboarding (probation tab)` | Consolidate after parity and zero-caller proof |
| `/hr/org` | `/hr/org-chart` | Consolidate after parity and zero-caller proof |
| `/hr/org-chart` | `/hr/org-chart` | Keep; verify contract |
| `/hr/overtime` | `/hr/overtime` | Keep; verify contract |
| `/hr/performance` | `/hr/performance` | Keep; verify contract |
| `/hr/performance/analytics` | `/hr/performance (analytics tab)` | Consolidate after parity and zero-caller proof |
| `/hr/positions` | `/hr/positions` | Keep; verify contract |
| `/hr/retention` | `/hr/settings/retention` | Consolidate after parity and zero-caller proof |
| `/hr/rosters` | `/hr/scheduling (rosters tab)` | Consolidate after parity and zero-caller proof |
| `/hr/safety` | `/hr/safety` | Keep; verify contract |
| `/hr/service-delivery` | `/hr/service` | Consolidate after parity and zero-caller proof |
| `/hr/settings` | `/hr/settings` | Keep; verify contract |
| `/hr/settings/automations` | `/hr/settings/automations` | Keep; verify contract |
| `/hr/settings/custom-fields` | `/hr/settings/custom-fields` | Keep; verify contract |
| `/hr/settings/forms` | `/hr/settings/forms` | Keep; verify contract |
| `/hr/settings/forms/[formId]` | `/hr/settings/forms/[formId]` | Keep; verify contract |
| `/hr/settings/forms/[formId]/submissions` | `/hr/settings/forms/[formId]/submissions` | Keep; verify contract |
| `/hr/settings/import-export` | `/hr/settings/import-export` | Keep; verify contract |
| `/hr/settings/integrations` | `/hr/settings/integrations` | Keep; verify contract |
| `/hr/settings/policies` | `/hr/settings/policies` | Keep; verify contract |
| `/hr/settings/preview` | `/hr/settings/preview` | Keep; verify contract |
| `/hr/settings/reporting-managers` | `/hr/settings/reporting-managers` | Keep; verify contract |
| `/hr/settings/templates` | `/hr/settings/templates` | Keep; verify contract |
| `/hr/settings/versions` | `/hr/settings/versions` | Keep; verify contract |
| `/hr/settings/workflows` | `/hr/settings/workflows` | Keep; verify contract |
| `/hr/shifts` | `/hr/scheduling (shifts tab)` | Consolidate after parity and zero-caller proof |
| `/hr/simulator` | Internal test tooling; no customer route | Retire after caller and data-flow audit |
| `/hr/termination` | `/hr/offboarding (termination tab)` | Consolidate after parity and zero-caller proof |
| `/hr/travel` | Expenses product | Consolidate after parity and zero-caller proof |
| `/hr/travel/approvals` | Expenses product | Consolidate after parity and zero-caller proof |
| `/hr/work-logs` | `/hr/work-logs` | Keep; verify contract |
| `/hr/workforce` | `/hr/employees (workforce tab)` | Consolidate after parity and zero-caller proof |
| `/hr/workforce-cost` | `/hr/workforce-cost` | Keep; verify contract |
| `/me/career` | `/me/growth` | Consolidate after parity and zero-caller proof |
| `/me/money` | `/me/pay (other money cards link to owners)` | Consolidate after parity and zero-caller proof |
| `/me/records` | `/me/profile (documents tab links to /me/documents)` | Consolidate after parity and zero-caller proof |
| `/me/resignation` | `/me/help (exit request, HR offboarding owner)` | Consolidate after parity and zero-caller proof |
| `/me/support` | `/me/help` | Consolidate after parity and zero-caller proof |
| `/me/team` | `/me/team` | Keep; verify contract |
| `/me/workday` | `/me/attendance (schedule/leave tabs link to owners)` | Consolidate after parity and zero-caller proof |
| `/payroll` | `/payroll` | Keep; verify contract |
| `/payroll/access` | `/payroll/access` | Keep; verify contract |
| `/payroll/bank-transfers` | `/payroll/payouts` | Consolidate after parity and zero-caller proof |
| `/payroll/bonuses` | `/payroll/bonuses` | Keep; verify contract |
| `/payroll/components` | `/payroll/components` | Keep; verify contract |
| `/payroll/employees` | `/payroll/employees` | Keep; verify contract |
| `/payroll/employees/[employeeUserId]` | `/payroll/employees/[payrollProfileId]` | Consolidate after parity and zero-caller proof |
| `/payroll/fnf` | `/payroll/fnf` | Keep; verify contract |
| `/payroll/inputs` | `/payroll/inputs` | Keep; verify contract |
| `/payroll/loans` | `/payroll/loans` | Keep; verify contract |
| `/payroll/payslips` | `/payroll/payslips` | Keep; verify contract |
| `/payroll/readiness` | `/payroll/inputs (readiness tab)` | Consolidate after parity and zero-caller proof |
| `/payroll/reimbursements` | `/payroll/reimbursements` | Keep; verify contract |
| `/payroll/reports` | `/payroll/reports` | Keep; verify contract |
| `/payroll/runs` | `/payroll/runs` | Keep; verify contract |
| `/payroll/runs/[runId]` | `/payroll/runs/[runId]` | Keep; verify contract |
| `/payroll/salary-structures` | `/payroll/structures` | Consolidate after parity and zero-caller proof |
| `/payroll/settings` | `/payroll/settings` | Keep; verify contract |
| `/payroll/settings/import-export` | `/payroll/import-export` | Consolidate after parity and zero-caller proof |
| `/payroll/setup` | `/payroll/setup` | Keep; verify contract |
| `/payroll/taxes` | `/payroll/statutory (tax tab)` | Consolidate after parity and zero-caller proof |
| `/payroll/team` | `/me/team/payroll` | Consolidate after parity and zero-caller proof |
| `/payroll/templates` | `/payroll/settings (template tab)` | Consolidate after parity and zero-caller proof |
| `/payroll/workers/[workerId]` | `/payroll/employees/[payrollProfileId]` | Consolidate after parity and zero-caller proof |
| `/timesheets/payroll` | `/payroll/inputs (Timesheets-approved source tab)` | Consolidate after parity and zero-caller proof |

## Planned page gap and acceptance

The current source has no `/implementation` page; all nine implementation cockpit routes in [PRD 21](./21-supporting-page-route-disposition-prd.md) are planned, not shipped. The current route tree also lacks many of the 100 canonical primary routes. Build each missing route only when its tier and owning domain are enabled; do not create placeholder pages that claim a feature exists. Cross-check the complete canonical route list in PRD 07 with the UI/backend contracts in PRDs 18–20 before completion. Hidden contextual editors may keep their current URLs where a redirect would lose draft state, but they must not become a second sidebar destination. The route migration must update sidebar, command palette, search, breadcrumbs, links, tests, analytics labels and documented bookmarks together.

**Boundary defect to resolve during migration:** the live `/hr/fnf` page is guarded by `hr:payroll:approve`; its settlement capability belongs to the Payroll module, with only status projected to HR offboarding. The live `/payroll/team` page currently starts from session presence; its replacement must enforce `manager-pay-readiness` plus team scope and amount-free fields on server reads. Route disposition alone does not prove either access path safe.

**Completion gate:** every current route has exactly one disposition; every canonical route has exactly one UI/backend contract; every retired route has proof of destination parity, zero source callers, authorized redirect and no lost data/history. HRMS-only, Payroll-only and combined-module actors see the same allowed destinations in sidebar, palette, direct URL and API; payroll-sensitive fields never ride an HRMS-only view.

