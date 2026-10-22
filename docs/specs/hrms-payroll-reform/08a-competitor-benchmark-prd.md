# StreamlineOS People + Payroll Competitor Benchmark PRD

**Owner:** People Product Management  
**Status:** Dated evidence; not normative product scope  
**Research date:** 2026-10-21  
**Supplemental primary-source review:** [2026-10-22 market and India transition evidence](./2026-10-22-market-benchmark.md)  
**Market:** Startups through mid-market companies  
**Scope:** Global HRMS, India-first payroll, Recruitment separate

## 1. Purpose

This PRD records the external capability baseline used by the
[Competitive Coverage and Release PRD](./08-competitive-coverage-release-prd.md).
It does not treat a marketing claim as proof of product depth, local
availability, packaging, legal compliance, or StreamlineOS implementation.
The supplemental review adds official evidence for UKG, ADP, Gusto, SAP, and
the 2026 India income-tax form transition. Neither source set is a hands-on
UX ranking; comparative superiority requires task-based customer evidence.

## 2. Method

### Comparison set

- Global/mid-market HR: Rippling, BambooHR, HiBob, Personio, Deel, Darwinbox.
- India HR/payroll: Keka, greytHR, Zoho Payroll India, RazorpayX Payroll,
  Darwinbox.
- Enterprise ceiling: Workday HCM for planning, talent, skills, journeys,
  analytics, and governance expectations.

### Rules

1. Use official product/help/compliance pages and record review date.
2. A check means the vendor publicly claims the capability; it is not a quality score.
3. Packaging, geography, native versus partner delivery, and service versus
   software remain explicit.
4. Recruitment features are recorded only to enforce the boundary.
5. Revalidate before roadmap approval and launch.
6. A launch/parity claim additionally needs a cell ledger with exact source,
   quoted claim, geography, package, native/connected/managed/partner model,
   access date, and reviewer; the summary tables alone are insufficient.

Legend: **●** clearly claimed native/platform capability in the relevant
geography; **◐** separate module/tier, limited scope, country-specific,
payroll-prep, partner, EOR, or managed-service model; **—** not established by
the reviewed source set. A symbol never overrides its cell's qualifier.

## 3. Global HRMS Coverage

| Capability | Streamline | Rippling | BambooHR | HiBob | Personio | Deel | Darwinbox | Workday ceiling |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Core HR / system of record | P0 | ● | ● | ● | ● | ● | ● | ● |
| Lifecycle / onboarding | P0 | ● | ● | ● | ● | ● | ● | ● journeys |
| Time, leave, attendance, scheduling | P0/P1 | ● | ● | ● | ● | ● | ● | ● |
| Payroll | India P0 | ◐ global/US | ◐ US | ◐ US/UK + hub | ◐ Germany + prep | ◐ global managed | ● localized | ◐ regional/connected |
| Benefits administration | P1/partner | ● | ● | ◐ hub | ◐ limited | ● global | ◐ | ● |
| Performance, goals, feedback | P0 | ● | ● | ● | ● | ● | ● | ● |
| Compensation bands and cycles | P0/P1 | ● | ● | ● | ● | ◐ upper tier | ● | ● |
| Skills, learning, career | P1 | ◐ modules | ◐ no native LMS shown | ● | ◐ apps | ◐ upper tier | ● | ● |
| Engagement/surveys/recognition | P1 | ◐ | ● | ● | ◐ | ◐ | ● | ● |
| Workforce/headcount planning | P1 | ● | — | ● | ◐ upper tier | ◐ upper tier | ◐ | ● |
| HR service/helpdesk/cases | P0/P1 | — | ◐ | ◐ | ● | ◐ | ● | ● |
| Analytics/custom reporting | P0/P1 | ● | ● | ● | ● | ● | ● | ● |
| Workflow/automation/integrations | P0/P1 | ● | ● | ● | ● | ● | ● | ● |
| Mobile employee/manager experience | P0 | ● | ● | ● | ● | ● | ● | ● |
| AI assistance/insight | P2 | ● | ● | ● | ● | ● | ● | ● governed agents |
| Cross-work staffing/delivery/cost | P2 | ◐ | — | ◐ planning | — | ◐ | ◐ | ● resource plans |

### Interpretation

- Unified worker facts, time-to-pay, performance-to-compensation, and planning
  are the market baseline.
- India payroll depth must be measured against Indian vendors, not global HR
  vendors with payroll in unrelated countries.
- StreamlineOS should lead by connecting people, work, capacity, cost,
  calendar, communication, and approvals while preserving domain and access boundaries.

## 4. India HRMS Coverage

| Capability | Streamline target | Keka | greytHR | Zoho People | Darwinbox |
|---|---:|---:|---:|---:|---:|
| Core HR and employee records | P0 | ● | ● | ● | ● |
| Onboarding and lifecycle/exit | P0 | ● | ● | ● | ● |
| Attendance, shifts, leave, remote work | P0/P1 | ● | ● | ● | ● |
| Performance, goals, feedback | P0 | ● | ● | ● | ● |
| Skills, learning, career/succession | P1 | — | — | ● | ● |
| Expenses/travel | Connected P0 status; Expenses-owned P1 depth | ◐ | ● claims | ◐ suite | ● |
| Engagement/surveys/recognition | P1 | — | — | ◐ | ● |
| HR helpdesk/case management | P0 | — | — | ● | ● |
| Payroll integrated with HR facts | India P0 | ● | ● | ◐ Zoho Payroll | ● |
| Mobile employee/manager workflows | P0 | ● | ● | ● | ● |
| AI assistant or insights | P2 | ● | ● | ● | ● |

This regional comparison makes HR service, connected work/capacity, safe AI,
and auditable time-to-pay important opportunities rather than reasons to copy
Recruitment or social-feed features into HRMS.

## 5. India Payroll Coverage

| Capability | Streamline target | Keka | greytHR | Zoho Payroll | RazorpayX | Darwinbox |
|---|---:|---:|---:|---:|---:|---:|
| Configurable salary structures/components | P0 | ● | ● | ● | ● | ● |
| Attendance/leave/LOP input sync | P0 | ● | ● | ◐ via suite | ● | ● |
| Arrears, revisions, bonus, reimbursement | P0 | ● | ● | ● | ● | ● |
| Loans/advances | P0 recovery / P1 origination | ● | ● | ● plan-gated | ● | ● |
| Implementation/migration cockpit | P0 | ◐ services | ◐ services | ◐ mid-year import | ◐ | ◐ |
| FnF, gratuity, leave encashment | P0 | ● | ● | ● | ● | ● |
| PF/EPF calculation and ECR workflow | P0 | ● | ● | ● | ● | ● |
| ESI calculation and contribution workflow | P0 | ● | ● | ● | ● | ● |
| State PT and LWF | P0 | ● | ● | ● | ● PT | ● |
| Salary TDS, declarations, proof, regimes | P0 | ● | ● | ● | ● | ● |
| Quarterly TDS and year-end certificate | P0 | ● | ● | ● | ● | ● |
| Direct salary payout | P0 partner | ◐ bank advice | ●/bank | ◐ supported banks | ● native rail | ◐ bank integration |
| Payslip/tax ESS | P0 | ● | ● | ● | ● | ● |
| Contractor payment and withholding | P1 | — | — | ● plan-gated | ● | ◐ gig accounting |
| Multi-entity/group payroll | P1 | ● plan-gated | ● plan-gated | ◐ separate orgs | — | ● |
| Accounting journal/integration | P0/P1 | ● | ● | ● | ● | ● |
| Pre-run validation/anomaly detection | P0/P2 | ● | ● controls/AI | ● rules/AI | ● checks/AI | ● AI |
| Filing/payment acknowledgment/reconciliation | P0/partner | ◐ artifacts | ◐ artifacts/bank | ◐ provider-dependent | ● | ◐ provider-dependent |

Unknown or weakly documented cells are not product exclusions. They indicate
that no stronger claim was established from the reviewed official sources.

### Global and managed India payroll comparison

| Capability | Deel | Rippling |
|---|---:|---:|
| India employee payroll | ◐ managed payroll/EOR | ◐ own entity, EOR, or global payroll route |
| India statutory detail | ◐ TDS/PF/ESI/PT/gratuity; current form detail limited | ◐ TDS/EPF/ESI/PT/gratuity; LWF/form detail limited |
| Contractor operations | ● contracts, classification, invoicing, mass payout | ● onboarding, classification, INR/global payout |
| Multi-country consolidation | ● managed entities/EOR/contractors | ● entities/countries/pay groups |
| Implementation model | ◐ materially service-backed | ◐ route and funding model require confirmation |

These products set a global workforce and managed-service ceiling. Their
public India pages do not establish the same native statutory workflow depth
as the India-specific products above.

## 6. Advanced Market Ceilings

- **Workday enterprise HCM:** deep skills, talent mobility, journeys,
  driver-based workforce planning, resource plans, extensibility, and governed
  agents. StreamlineOS should meet the target segment's outcomes without
  copying enterprise configuration complexity.
- **SAP payroll:** continuous validation, anomaly detection, guided resolution,
  and Explain Pay set the advanced bar for a payroll control tower.
- **Oracle HCM AI:** role-based access applies, but Oracle's own readiness
  guidance warns that UI-only hiding may not constrain an agent when underlying
  RBAC allows access. StreamlineOS must enforce row, field, document, and action
  authorization at retrieval and execution.
- **Implementation:** Deel and Rippling document discovery, configuration,
  parallel payroll, reconciliation, ownership, and stabilization. StreamlineOS
  owns these as a migration cockpit, not an off-product consulting checklist.

## 7. Primary Sources

### Global HR/HCM

- Rippling: [Product ecosystem](https://www.rippling.com/products),
  [Performance](https://www.rippling.com/products/hr/performance-management),
  [Time and attendance](https://www.rippling.com/products/hr/time-and-attendance),
  [Headcount planning](https://www.rippling.com/products/hr/headcount-planning).
- BambooHR: [Platform](https://www.bamboohr.com/platform/),
  [Payroll](https://www.bamboohr.com/platform/payroll/),
  [Benefits](https://www.bamboohr.com/platform/benefits-administration/),
  [Performance](https://www.bamboohr.com/platform/performance-management/),
  [Compensation](https://www.bamboohr.com/platform/compensation/).
- HiBob: [Platform](https://www.hibob.com/platform/),
  [Payroll](https://www.hibob.com/platform/payroll/),
  [Time and attendance](https://www.hibob.com/platform/payroll/time-and-attendance/),
  [Compensation](https://www.hibob.com/platform/planning/compensation/).
- Personio: [Performance](https://www.personio.com/product/performance/),
  [Compensation](https://www.personio.com/product/compensation-management/),
  [Workforce planning](https://www.personio.com/product/workforceplanning/),
  [Payroll](https://www.personio.com/product/personio-payroll/).
- Deel: [HR](https://www.deel.com/solutions/hr/),
  [Payroll](https://www.deel.com/solutions/payroll/),
  [Performance](https://www.deel.com/plp/performance/),
  [Compensation](https://www.deel.com/plp/deel-compensation/),
  [Workforce planning](https://www.deel.com/solutions/workforce-planning/).
- Darwinbox: [HCM suite](https://explore.darwinbox.com/lp/hcm-software) and
  [AI-native HCM](https://explore.darwinbox.com/enterprise-grade-hr-software-darwinbox).
- Workday: [HCM suite](https://www.workday.com/en-us/products/human-capital-management/hcm-suite.html),
  [Workforce planning](https://www.workday.com/en-us/products/human-resource-management/workforce-planning.html),
  [Skills Cloud](https://www.workday.com/en-us/products/human-resource-management/skills-cloud.html),
  and [resource plans](https://doc.workday.com/admin-guide/en-us/financial-management/projects/manage-project-resources/resource-plans/sel1405110260739.html).
- SAP: [Employee Central Payroll](https://www.sap.com/products/hcm/employee-central-payroll.html)
  and [Payroll Assistant](https://www.sap.com/use-cases/joule-assistant/payroll-ai).
- Oracle: [HCM AI](https://www.oracle.com/human-capital-management/ai-at-work/)
  and [Personal Information Assistant security note](https://docs.oracle.com/en/cloud/saas/readiness/hcm/26b/hure-26b/26B-hr-wn-f42766.htm).

### India payroll

- Keka: [Platform](https://www.keka.com/),
  [Payroll processing](https://www.keka.com/payroll-processing),
  [Payroll compliance](https://www.keka.com/payroll-compliance).
- greytHR: [Payroll](https://www.greythr.com/payroll-software/) and
  [Payroll settings](https://admin-help.greythr.com/admin/143677863/).
- Zoho Payroll India:
  [Statutory compliance](https://www.zoho.com/in/payroll/features/statutory-compliance/)
  and [Payroll compliance](https://www.zoho.com/in/payroll/payroll-compliance/).
- RazorpayX Payroll: [Payroll](https://razorpay.com/payroll/),
  [Processing](https://razorpay.com/payroll/payroll-processing/), and
  [Compliance](https://razorpay.com/payroll/payroll-compliance/).
- Zoho People: [HRMS](https://www.zoho.com/people/) and
  [HR software capabilities](https://www.zoho.com/people/lp/hr-software.html).
- greytHR: [HRMS platform](https://www.greythr.com/).
- Deel: [Global Payroll](https://www.deel.com/solutions/payroll/),
  [India operations](https://www.deel.com/blog/eor-services-in-india/),
  and [implementation framework](https://www.deel.com/blog/enterprise-payroll-implementation-framework/).
- Rippling: [India Global Payroll](https://www.rippling.com/en-IN/products/global/global-payroll),
  [paying employees in India](https://www.rippling.com/blog/how-to-pay-employees-in-india),
  and [implementation guidance](https://www.rippling.com/blog/hr-system-switch-survival-guide).

## 8. Acceptance Criteria

- [ ] Competitor claims used for prioritization have first-party citations and dates.
- [ ] Every claim used in launch/parity material has cell-level evidence and reviewer.
- [ ] Geography and native/connected/managed/partner delivery remain explicit.
- [ ] India payroll is compared against India-specific vendors and legal requirements.
- [ ] Unknown cells are not converted into unsupported competitor claims.
- [ ] Recruitment comparison does not expand HRMS implementation scope.
- [ ] The benchmark is revalidated before roadmap commitment and launch.
