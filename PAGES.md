# Pages

Ordered money-path first. Check off each page after fixing.

> **Visual redesign (redesign/v2 branch)**: All landing, auth, public/marketing pages have been visually redesigned — `brand-text` gradient clip-text removed (hero `brand-sweep` kept), `rounded-3xl` → `rounded-2xl`/`rounded-xl`, decorative uppercase eyebrows removed/converted to `font-medium`, `PageWrapper` eyebrow styling updated. Dashboard feature pages already use clean design system — no `brand-text` or `rounded-3xl` found.

---

## Dashboard
- [x] `/dashboard` — Removed type cast, duplicate import, dead widget exports, useEffect data fetch; added TanStack Query hook for public docs; named all event handlers; fixed empty states, grid orphan, loading skeleton alignment, quick-actions deduplication, comments removed

---

## CRM — Leads & Pipeline
- [x] `/crm` — Replaced all-deals fetch with dedicated stats endpoint; added error state; fixed empty state and timeAgo in CrmRecentActivity; added staleTime to useDeals
- [ ] `/crm/leads` — Leads list
- [ ] `/crm/leads/[leadId]` — Lead detail
- [ ] `/crm/leads/distribute` — Lead distribution
- [ ] `/crm/leads/smart-search` — AI smart search
- [ ] `/crm/leads/duplicates` — Duplicate leads
- [ ] `/crm/leads/source-report` — Source report
- [ ] `/crm/deals` — Deals list
- [ ] `/crm/deals/[dealId]` — Deal detail
- [ ] `/crm/deals/approvals` — Deal approvals
- [ ] `/crm/deals/aging` — Aging deals
- [ ] `/crm/deals/win-loss` — Win/loss analysis
- [ ] `/crm/quotes` — Quotes list
- [ ] `/crm/quotes/[quoteId]` — Quote detail
- [ ] `/crm/contacts` — Contacts
- [ ] `/crm/clients` — Clients list
- [ ] `/crm/clients/[clientId]` — Client detail
- [ ] `/crm/organizations` — Organizations list
- [ ] `/crm/organizations/[organizationId]` — Organization detail
- [ ] `/crm/targets` — Sales targets
- [ ] `/crm/territories` — Territories
- [ ] `/crm/web-forms` — Web lead forms
- [ ] `/crm/analytics` — CRM analytics
- [ ] `/crm/reports` — CRM reports
- [ ] `/crm/settings/assignment-rules` — Assignment rules
- [ ] `/crm/settings/email-templates` — CRM email templates
- [ ] `/crm/settings/scoring-rules` — Scoring rules
- [ ] `/crm/settings/sla` — SLA policies

---

## Billing & Accounting
- [ ] `/billing` — Billing overview
- [ ] `/billing/invoices` — Invoices list
- [ ] `/billing/invoices/new` — New invoice
- [ ] `/billing/invoices/[invoiceId]` — Invoice detail
- [ ] `/accounting` — Accounting overview
- [ ] `/accounting/coa` — Chart of accounts
- [ ] `/accounting/coa/[accountId]` — Account detail
- [ ] `/accounting/journal` — Journal entries
- [ ] `/accounting/journal/new` — New journal entry
- [ ] `/accounting/journal/[entryId]` — Journal entry detail
- [ ] `/accounting/trial-balance` — Trial balance
- [ ] `/accounting/profit-loss` — Profit & loss
- [ ] `/accounting/balance-sheet` — Balance sheet
- [ ] `/accounting/customers` — Customer ledger list
- [ ] `/accounting/customers/[clientId]` — Customer ledger
- [ ] `/accounting/vendors` — Vendor ledger list
- [ ] `/accounting/vendors/[vendorId]` — Vendor ledger
- [ ] `/accounting/purchase-bills` — Purchase bills list
- [ ] `/accounting/purchase-bills/new` — New purchase bill
- [ ] `/accounting/purchase-bills/[billId]` — Bill detail
- [ ] `/accounting/aged-receivables` — Aged receivables
- [ ] `/accounting/aged-payables` — Aged payables
- [ ] `/accounting/gstr-1` — GSTR-1
- [ ] `/accounting/gstr-3b` — GSTR-3B

---

## HR — Core
- [ ] `/hr` — HR overview
- [ ] `/hr/employees` — Employees list
- [ ] `/hr/employees/[employeeId]` — Employee profile
- [ ] `/hr/attendance` — Attendance
- [ ] `/hr/leaves` — Leave management
- [ ] `/hr/payroll` — Payroll
- [ ] `/hr/my-payslips` — My payslips
- [ ] `/hr/expenses` — Expenses
- [ ] `/hr/reimbursements` — Reimbursements
- [ ] `/hr/assets` — Assets
- [ ] `/hr/devices` — Devices
- [ ] `/hr/work-logs` — Work logs
- [ ] `/timesheets` — Timesheets (personal)
- [ ] `/timesheets/team` — Team timesheets

---

## HR — People Ops
- [ ] `/hr/onboarding` — Onboarding overview
- [ ] `/hr/onboarding/[userId]` — Employee onboarding
- [ ] `/hr/onboarding/my-tasks` — My onboarding tasks
- [ ] `/hr/org-chart` — Org chart
- [ ] `/hr/teams/[teamId]` — Team detail
- [ ] `/hr/helpdesk` — HR helpdesk
- [ ] `/hr/handbook` — Employee handbook
- [ ] `/hr/recognition` — Recognition
- [ ] `/hr/performance` — Performance reviews
- [ ] `/hr/surveys` — Surveys
- [ ] `/hr/enps` — eNPS
- [ ] `/hr/assessments` — Assessments
- [ ] `/hr/learning-paths` — Learning paths
- [ ] `/hr/training` — Training
- [ ] `/hr/skills` — Skills
- [ ] `/hr/certifications` — Certifications
- [ ] `/hr/career-ladders` — Career ladders
- [ ] `/hr/loans` — Loans
- [ ] `/hr/bonuses` — Bonuses
- [ ] `/hr/incentives` — Incentives
- [ ] `/hr/documents` — Documents
- [ ] `/hr/documents/templates` — Document templates
- [ ] `/hr/documents/editor/new` — New document
- [ ] `/hr/documents/editor/[documentId]` — Document editor
- [ ] `/hr/document-review` — Document review
- [ ] `/hr/document-types` — Document types
- [ ] `/hr/email-templates` — HR email templates
- [ ] `/hr/compliance` — Compliance
- [ ] `/hr/background-verification` — Background verification
- [ ] `/hr/alumni` — Alumni
- [ ] `/hr/exit` — Exit management
- [ ] `/hr/fnf` — Full & final settlement
- [ ] `/hr/termination` — Terminations
- [ ] `/hr/asset-returns` — Asset returns
- [ ] `/hr/analytics` — HR analytics
- [ ] `/hr/team-events` — Team events
- [ ] `/hr/employees/find-expert` — Find expert
- [ ] `/hr/employees/skills-matrix` — Skills matrix

---

## HR — Recruitment
- [ ] `/hr/recruitment` — Recruitment overview
- [ ] `/hr/recruitment/jobs` — Job postings
- [ ] `/hr/recruitment/candidates` — Candidates list
- [ ] `/hr/recruitment/candidates/[candidateId]` — Candidate detail
- [ ] `/hr/recruitment/pipeline` — Pipeline
- [ ] `/hr/recruitment/interviews` — Interviews
- [ ] `/hr/recruitment/scorecard-templates` — Scorecard templates
- [ ] `/hr/recruitment/question-bank` — Question bank
- [ ] `/hr/recruitment/interviewer-performance` — Interviewer performance
- [ ] `/hr/recruitment/diversity-report` — Diversity report
- [ ] `/hr/recruitment/sla` — Recruitment SLA
- [ ] `/hr/recruitment/sla-report` — SLA report

---

## Projects
- [ ] `/projects` — Projects list
- [ ] `/projects/[projectId]` — Project board
- [ ] `/projects/[projectId]/backlog` — Backlog
- [ ] `/projects/[projectId]/sprints` — Sprints
- [ ] `/projects/[projectId]/timeline` — Timeline
- [ ] `/projects/[projectId]/epics` — Epics
- [ ] `/projects/[projectId]/cycles` — Cycles
- [ ] `/projects/[projectId]/modules` — Modules
- [ ] `/projects/[projectId]/milestones` — Milestones
- [ ] `/projects/[projectId]/pages` — Pages
- [ ] `/projects/[projectId]/views` — Views
- [ ] `/projects/[projectId]/intake` — Intake
- [ ] `/projects/[projectId]/my-tickets` — My tickets
- [ ] `/projects/[projectId]/analytics` — Analytics
- [ ] `/projects/[projectId]/budget` — Budget
- [ ] `/projects/[projectId]/settings` — Project settings
- [ ] `/projects/templates` — Project templates
- [ ] `/projects/resource-allocation` — Resource allocation

---

## Sales
- [ ] `/sales` — Sales overview
- [ ] `/sales/person/[personSlug]` — Sales person profile
- [ ] `/sales/quotas` — Quotas
- [ ] `/sales/commissions` — Commissions
- [ ] `/sales/forecast-report` — Forecast report
- [ ] `/sales/cohort-analysis` — Cohort analysis
- [ ] `/sales/rep-comparison` — Rep comparison
- [ ] `/sales/meeting-prep` — Meeting prep
- [ ] `/sales/playbook` — Playbook
- [ ] `/sales/task-sequences` — Task sequences
- [ ] `/sales/report-narrator` — Report narrator

---

## Customer Executive
- [ ] `/customer-executive` — Overview
- [ ] `/customer-executive/account-summary` — Account summary
- [ ] `/customer-executive/client-onboarding` — Client onboarding
- [ ] `/customer-executive/renewals` — Renewals
- [ ] `/customer-executive/upsell` — Upsell
- [ ] `/customer-executive/sla` — SLA
- [ ] `/customer-executive/surveys` — Surveys
- [ ] `/customer-executive/sentiment` — Sentiment

---

~~## Marketing~~ — **REMOVED**: All `/marketing/*` pages, API routes, schema, hooks, sidebar nav, billing gates, and AI features deleted end-to-end.

~~## Digital Marketing~~ — **REMOVED**: All `/digital-marketing/*` pages, API routes, DM leads/campaigns schema, hooks, and sidebar nav deleted end-to-end.

---

## Support
- [ ] `/support` — Support overview
- [ ] `/support/inbox` — Support inbox

---

## Reports
- [ ] `/reports` — Reports

---

## Chat & Communication
- [ ] `/chat` — Chat
- [ ] `/calendar` — Calendar
- [ ] `/notifications` — Notifications

---

## AI
- [ ] `/ai` — AI assistant

---

## Settings
- [ ] `/settings` — Settings (catch-all)
- [ ] `/settings/organization` — Organization
- [ ] `/settings/members` — Members
- [ ] `/settings/roles` — Roles
- [ ] `/settings/permissions` — Permissions
- [ ] `/settings/branches` — Branches
- [ ] `/settings/notifications` — Notifications
- [ ] `/settings/audit-log` — Audit log
- [ ] `/settings/webhooks` — Webhooks
- [ ] `/settings/email-templates` — Email templates
- [ ] `/settings/custom-fields` — Custom fields
- [ ] `/settings/integrations/recruitment` — Integrations
- [ ] `/settings/data-hub` — Data hub
- [ ] `/settings/ai` — AI settings

---

## Onboarding
- [x] `/onboarding` — Employee onboarding wizard. Fixed ID-proof upload (sent `ID` vs DB enum `ID_PROOF`); added server-side Zod validation for doc type/mime/size and personal details; trimmed personal step to standard HR fields (removed experience/skills, added home address + emergency contact); compacted document cards. All access gating moved to middleware (owners/platform admins redirected away; completed users redirected to /dashboard via new `users.onboardingCompletedAt`, set on submit + surfaced in JWT) — no page-level role checks.
