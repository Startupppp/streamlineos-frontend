# StreamlineOS People + Payroll Pages, Navigation, and Roles PRD

**Status:** Normative experience contract  
**Owner:** People Product Experience  
**Priority:** P0 canonical information architecture and route safety  
**Applies to:** Desktop, tablet, mobile web, and installed/PWA surfaces

## 1. Outcome

Every People and Payroll job has one canonical destination. Navigation reflects
the user's role and current work without exposing inaccessible records,
duplicating modules, or turning every capability into a sidebar item.

## 2. Navigation Principles

1. Self-service lives under `/me`; administration lives under `/hr` or `/payroll`.
2. Recruitment lives under `/recruitment`; `/hr/recruitment/**` is not a
   permanent product boundary.
3. The sidebar has at most two levels. Deeper pages are tabs, contextual links,
   command search, or secondary routes.
4. A group appears only if the actor can access at least one child.
5. Route identity—not click history—drives selection and breadcrumb.
6. Direct load, refresh, Back/Forward, deep link, new tab, and deleted-record
   fallback behave consistently.
7. Disabled module and denied permission are distinct and non-leaking.
8. Counts/badges are bounded, cached, scope-safe, and actionable.
9. Global search returns only permitted people, pages, policies, documents,
   requests, cases, and payroll records.
10. Mobile prioritizes self-service, approvals, team, and urgent exceptions.

## 3. Canonical Self-Service Pages

| Route | Job | Priority | Primary roles |
|---|---|---:|---|
| `/me` | Personal home, tasks, requests, reminders | P0 | All workers |
| `/me/profile` | Personal, job, contact, reporting line, correction requests | P0 | All workers |
| `/me/team` | Manager roster, availability, exceptions, growth, quick actions | P0 | Managers |
| `/me/approvals` | Unified approval inbox | P0 | Approvers/delegates |
| `/me/attendance` | Check-in/out, history, regularization | P0 | Eligible workers |
| `/me/time-off` | Leave, WFH, balances, requests, team-safe calendar | P0 | All workers |
| `/me/schedule` | Assigned shifts/overtime P0; availability/swaps P1 | P0/P1 | Scheduled workers |
| `/me/expenses` | Expenses-owned claims destination/status projection | Connected | Eligible workers |
| `/me/assets` | Assigned custody, acknowledgment, issue/return | P0 | Assigned workers |
| `/me/documents` | Personal documents, signatures, acknowledgments | P0 | All workers |
| `/me/pay` | Payslips, tax, declarations, loans, FnF | P0 | Paid workers |
| `/me/onboarding` | Preboarding/onboarding tasks | P0 | New workers |
| `/me/goals` | Goals and check-ins | P0 | Eligible workers |
| `/me/performance` | Reviews, 1:1s, and acknowledgment | P0 | Eligible workers |
| `/me/feedback` | Give/request feedback | P0 | Eligible workers |
| `/me/growth` | Skills, career paths, development plan | P1 | Eligible workers |
| `/me/learning` | Assigned and recommended learning | P1 | Eligible workers |
| `/me/opportunities` | Internal opportunities and expressed interest | P1 | Eligible workers |
| `/me/surveys` | Assigned surveys and action follow-up | P1 | Eligible workers |
| `/me/recognition` | Give and receive recognition | P1 | Eligible workers |
| `/me/total-rewards` | Salary/benefit/equity value summary | P1 | Eligible workers |
| `/me/benefits` | Plans/elections and connected-carrier claim status | P1 | Eligible workers |
| `/me/equity` | Grants and vesting view | P1 | Grant recipients |
| `/me/help` | HR knowledge and service requests | P0 | All workers |
| `/me/help/requests/[requestId]` | Request conversation and status | P0 | Request participants |
| `/me/notifications` | Notification center | P0 | All workers |
| `/me/preferences` | Notification, privacy, locale preferences | P0 | All workers |

Recruitment may expose its own candidate pages. Internal-opportunity interest
hands off to Recruitment; this self-service page does not own candidate state.

## 4. Canonical HR Administration Pages

### Overview and people

| Route | Job | Priority |
|---|---|---:|
| `/hr` | Exception-first HR command center | P0 |
| `/hr/employees` | Employee collection, create/import/bulk lifecycle | P0 |
| `/hr/employees/[workerId]` | Worker profile and lifecycle actions | P0 |
| `/hr/org-chart` | Searchable reporting graph and table fallback | P0 |
| `/hr/positions` | Minimum position authorization/Recruitment handoff P0; planning depth P1 | P0/P1 |
| `/hr/onboarding` | Onboarding queue and journeys | P0 |
| `/hr/onboarding/[workerId]` | Person onboarding detail | P0 |
| `/hr/lifecycle` | P1 bulk/designer; P0 exceptions stay on `/hr` and employees | P1 |
| `/hr/offboarding` | Exit, termination, handover, FnF status | P0 |
| `/hr/documents` | Library, generation, signatures, acknowledgments | P0 |
| `/hr/policies` | Policy library, versions, audiences, acknowledgments | P0 |

### Time, leave, spend, and assets

| Route | Job | Priority |
|---|---|---:|
| `/hr/attendance` | Attendance table/calendar and exceptions | P0 |
| `/hr/leaves` | Leave/WFH operations, balances, team calendar | P0 |
| `/hr/scheduling` | Shift definitions/assignment P0; rosters/availability/swaps P1 | P0/P1 |
| `/hr/overtime` | Overtime input P0; comp-off/advanced rules P1 | P0/P1 |
| `/hr/holidays` | Entity/location holiday calendars | P0 |
| `/hr/time-clocks` | Devices and biometric/imported event tabs | P1 |
| `/hr/work-logs` | Approved work-hour and handoff status | P1 |
| Expenses product | Claim/travel review; People links only | Connected |
| `/hr/assets` | Custody/exit P0; inventory/repair depth P1 | P0/P1 |

### Talent, experience, and rewards

| Route | Job | Priority |
|---|---|---:|
| `/hr/performance` | Reviews/cycles/1:1s P0; calibration tab P1 | P0/P1 |
| `/hr/goals` | Goal administration and alignment | P0 |
| `/hr/feedback` | Feedback programs and safeguards | P0 |
| `/hr/skills` | Taxonomy, matrix, expert discovery, gaps | P1 |
| `/hr/learning` | Catalog, assignment, compliance learning | P1 |
| `/hr/talent` | Talent reviews, career, development | P1 |
| `/hr/succession` | Critical roles and successor plans | P1 |
| `/hr/engagement` | Surveys, pulses, action plans | P1 |
| `/hr/recognition` | Programs, awards, moderation, budgets | P1 |
| `/hr/compensation` | Bands/cycles P0; total-rewards tab P1 | P0/P1 |
| `/hr/benefits` | Plans, eligibility, enrollment, provider claim status | P1 |
| `/hr/equity` | Grants, vesting, statements | P1 |

### Service, governance, and insight

| Route | Job | Priority |
|---|---|---:|
| `/hr/service` | Employee service requests and SLAs | P0 |
| `/hr/service/requests/[requestId]` | Request fulfillment | P0 |
| `/hr/cases` | Restricted HR/employee-relations cases | P0 |
| `/hr/cases/[caseId]` | Restricted case detail | P0 |
| `/hr/accommodations` | Accommodation review and implementation | P1 |
| `/hr/safety` | Incidents and corrective actions | P1 |
| `/hr/emergency` | Location plans and authorized contacts | P1 |
| `/hr/labor-relations` | Labor/union specialist workflows | P1/enterprise |
| `/hr/legal-holds` | Hold placement, review, release | P0 |
| `/hr/knowledge` | HR knowledge administration | P0 |
| `/hr/announcements` | Targeted company announcements | P0 |
| `/hr/journeys` | Lifecycle journey definitions and progress | P1 |
| `/hr/analytics` | P0 operational metrics; P1 workforce analytics | P0/P1 |
| `/hr/reports` | Standard reports/exports P0; custom builder P1 | P0/P1 |
| `/hr/workforce-planning` | Scenarios, positions, cost, approvals | P1 |
| `/hr/workforce-cost` | Actual and planned labor-cost analysis | P1 |
| `/hr/audit` | Purpose-limited immutable audit | P0 |

`/hr/announcements` is the admin composer route, but its primary navigation
belongs to Home → Company; HR may deep-link to it without adding a duplicate
HR sidebar item.

### HR settings

`/hr/settings` is a hub with secondary routes for:

- employee fields and profile configuration;
- forms and submissions;
- policies and policy versions;
- workflows, approvals, delegations, and automations;
- document, letter, email, and notification templates;
- imports/exports and job history;
- integrations and connection health;
- service catalog, routing, SLA, macros, and satisfaction;
- performance, skills, learning, survey, recognition, and compensation settings;
- time, leave, attendance, schedule, and asset settings;
- HR access, field policies, retention, and privacy controls.

Organization hierarchy and company settings remain under global
`/settings/organization`; HR must not duplicate them.

## 5. Canonical Payroll Pages

| Route | Job | Priority |
|---|---|---:|
| `/payroll` | Command center, calendar, readiness, exceptions | P0 |
| `/payroll/setup` | Guided entity/statutory/bank/accounting/migration setup | P0 |
| `/payroll/employees` | Payroll profiles and salary assignments | P0 |
| `/payroll/employees/[payrollProfileId]` | Pay, tax, bank, loan, and result history | P0 |
| `/payroll/structures` | Salary structures and versions | P0 |
| `/payroll/components` | Earnings, deductions, contributions, mappings | P0 |
| `/payroll/pay-groups` | Schedules, cutoffs, calendars | P0 |
| `/payroll/inputs` | Frozen source inputs, versions, adjustments | P0 |
| `/payroll/runs` | Runs and status | P0 |
| `/payroll/runs/[runId]` | Calculation, employees, exceptions, approval, close | P0 |
| `/payroll/payouts` | Batches, failures, returns, reconciliation | P0 |
| `/payroll/payslips` | Preview, publish, correct, audit | P0 |
| `/payroll/statutory` | Obligations dashboard | P0 |
| `/payroll/statutory/[obligation]` | PF/ESI/PT/LWF/TDS/other workspaces | P0 |
| `/payroll/tax-declarations` | Individual proof/review/projection P0; campaigns P1 | P0/P1 |
| `/payroll/reimbursements` | Approved claims and payout | P0 |
| `/payroll/bonuses` | Approved input P0; program administration P1 | P0/P1 |
| `/payroll/loans` | EMI/recovery P0; origination/administration P1 | P0/P1 |
| `/payroll/contractors` | Contractor payment profiles/runs | P1 |
| `/payroll/fnf` | Full-and-final settlement | P0 |
| `/payroll/accounting` | Journal, acknowledgment, reconciliation | P0 |
| `/payroll/reports` | Registers, variance, statutory, payment, audit | P0 |
| `/payroll/import-export` | Migration and recurring jobs | P0 |
| `/payroll/access` | Payroll roles, separation of duties | P0 |
| `/payroll/settings` | Payroll policies, providers, templates | P0 |

Manager payroll readiness is a scoped `/me/team/payroll` view, not an admin
sidebar entry. It exposes readiness/missing-input state only, never salary,
bank, tax, component, or net-pay values without a separate payroll permission.
Worker detail is a secondary route from employee/profile pages.

## 6. Recruitment Boundary Pages

- All ATS administration is under `/recruitment/**` and owned by Recruitment.
- HR may link to approved positions, accepted-hire status, and onboarding handoff.
- `/me/opportunities` and employee referrals are discovery/intake only; after
  interest or referral submission, Recruitment owns candidate workflow.
- HR dashboards may show approved/open/filled headcount aggregates without
  exposing candidate details.

## 7. Role Visibility Matrix

Legend: **A** administer, **S** scoped/self-service, **R** read aggregate,
**—** hidden unless separately granted.

| Surface | Employee | Manager | HR | Payroll | Finance | Executive | Auditor |
|---|---:|---:|---:|---:|---:|---:|---:|
| `/me/*` own | S | S | S | S | S | S | S |
| `/me/team*` | — | S | S | — | — | R | — |
| Employee HR profile | — | S-limited | A | S-pay fields | R-cost only | R-aggregate | R-granted |
| Time/leave operations | S | S | A | R-input | — | R-aggregate | R-granted |
| Talent/rewards | S | S | A | R-approved pay | R-budget | R-aggregate | R-granted |
| Service requests | S | S-own/team rules | A | S-assigned | — | R-aggregate | R-granted |
| Restricted cases | — | — | A-granted | — | — | R-aggregate only | R-granted |
| `/payroll/**` | S-own pay | S-readiness | R-handoff | A | S-funding/journal only | R-aggregate | R-granted |
| Analytics/planning | S-own | S-team | A | S-pay analytics | A-cost plan | A-aggregate | R-granted |
| Settings/access | S-preferences | — | A-HR | A-payroll | S-accounting | — | R |

This is a default role bundle; the [Page and Permission Manifest](./07a-page-permission-manifest-prd.md)
is the route-level authorization contract.
`/me/*` exists only for personas with an active worker identity.

Specialist roles are separate grants: Organization admin, time operator,
expense operator (Expenses-owned), compensation operator, service agent, case
specialist, resource manager, payroll compliance reviewer, finance funding
approver, payout releaser, accounting operator, legal reviewer,
implementation consultant, and customer implementation admin. Calculation,
bank-change, payout-release, journal, filing, and audit roles are independently
assignable and role-incompatibility rules prevent self-approval.

## 8. Implementation Administration

`/implementation` is a P0 implementation-admin portfolio. The canonical
`/implementation/[projectId]/**` secondary routes and jobs are defined in
[PRD 09](./09-implementation-migration-cockpit-prd.md). They are hidden from
normal HR/Payroll navigation and require implementation entitlement plus
consultant/customer-admin scope; payroll/bank evidence needs its domain grant.

## 9. Common Page Contract

Every retained collection or detail page specifies:

1. customer job, owner, permission, entitlement, and DataScope;
2. primary action and safe read-only behavior;
3. URL-backed search/filter/sort/tab/view where shareable;
4. loading, empty, no-results, error, stale, denied, disabled, and populated states;
5. bounded server collection and stable cursor;
6. card/row/bulk actions from one registry;
7. create/edit/confirm/unsaved/conflict behavior;
8. responsive priorities and accessible keyboard/screen-reader behavior;
9. source endpoints/read models, query/cache keys, and invalidation writers;
10. analytics events that exclude sensitive values.

The [Experience and Content PRD](./07b-experience-content-quality-prd.md)
defines the interaction, content, visual, and accessibility acceptance for
these page states and journeys. The PRD 06a evidence ledger maps every retained page to owner, tier, FRs,
permission/DataScope, read model, commands, state model, and test evidence.

## 10. Route Consolidation

| Current route/surface | Target |
|---|---|
| `/hr/service-delivery` and `/hr/helpdesk` | `/hr/service` with requests/settings |
| `/hr/reimbursements` | `/payroll/reimbursements` |
| `/hr/org` write UI | Global organization hierarchy; `/hr/org-chart` remains read/search |
| `/hr/settings/company` | `/settings/organization` |
| `/hr/simulator` | Remove from customer product; internal test tooling only |
| `/hr/biometric` and `/hr/devices` | `/hr/time-clocks` tabs |
| `/hr/exit`, `/hr/termination`, HR FnF initiation | `/hr/offboarding`; settlement remains `/payroll/fnf` |
| `/hr/document-types`, review, templates | `/hr/documents` tabs/secondary editor routes |
| `/hr/leaves/analytics`, performance analytics | Governed `/hr/analytics` drill-down |
| `/hr/access` | `/hr/settings/access` |
| `/payroll/team` | `/me/team/payroll` |
| `/hr/recruitment/**` | `/recruitment/**` owned by Recruitment |
| Workforce subroutes for shifts/rosters/comp-off/devices/asset returns | Canonical `/hr/scheduling`, `/hr/overtime`, `/hr/time-clocks`, `/hr/assets` tabs |
| `/me/one-on-ones`, `/me/skills`, `/me/team/{performance,skills,development}` | `/me/performance`, `/me/growth`, `/me/team` respective tabs |
| `/hr/one-on-ones`, `/hr/job-architecture`, `/hr/internal-mobility`, `/hr/surveys`, `/hr/total-rewards` | `/hr/performance`, `/hr/skills`, `/hr/talent`, `/hr/engagement`, `/hr/compensation` tabs |
| `/hr/delegations`, `/hr/service/settings` | `/hr/settings/delegations`, `/hr/settings/service` |
| `/payroll/calendar` | `/payroll` calendar view and `/payroll/pay-groups` setup |
| `/hr/expenses`, `/hr/travel` | Expenses-owned destination; no HR claim page |

A route manifest must define temporary compatibility redirects, expiry, and
telemetry. Sensitive or removed internal routes must fail closed; redirects
must not preserve broader legacy access.

## 11. Acceptance Criteria

- [ ] Every capability in normative PRDs 01–06a and 09 maps to one canonical
      page, cross-product destination, or explicit API-only job.
- [ ] Recruitment administration is absent from HR navigation.
- [ ] Employees and managers complete P0 work entirely under `/me`.
- [ ] HR service and restricted cases have separate pages and projections.
- [ ] Payroll setup is reachable from command center and settings.
- [ ] Direct load, refresh, deep links, and Back/Forward preserve route state.
- [ ] Hidden groups and badge counts reveal no inaccessible record existence.
- [ ] Consolidated routes have zero remaining internal callers before removal.
- [ ] Desktop collapse and mobile sheet preserve keyboard/focus behavior.
- [ ] Every P0 page meets the common page contract and WCAG 2.2 AA.
