# HRM-10 — Competitor Baseline and Differentiation PRD

> Acceptance reference only. Dispatch and status live in [README.md](./README.md).

## Outcome

StreamlineOS HRMS stays ahead of mid-market competitors on the workflows that
matter for integrated work OS customers — without copying low-value feature
bloat. This pack lists must-have parity, deliberate differentiators, and
explicit non-goals.

## Ownership Boundary

Owns competitive prioritization and net-new feature candidates. Implementation
of each item still lands through HRM-01–09 tasks or a follow-on epic.

## Competitor Set (reference)

Use as baselines, not clones: BambooHR, Personio, Rippling HR, Darwinbox,
Keka, Zoho People, Freshteam (ATS-adjacent), and modern work OS people layers
(Notion/Linear-like density only for IA inspiration).

### Primary-source review (2026-09-20)

- [BambooHR platform](https://www.bamboohr.com/platform/) — unified HR data,
  payroll, benefits, time/attendance, performance, compensation, employee
  experience, reporting, compliance, global employment, and AI-assisted work.
- [Workday HCM suite](https://www.workday.com/en-us/products/human-capital-management/hcm-suite.html)
  and [HCM overview](https://www.workday.com/en-us/products/human-capital-management/overview.html)
  — core HCM, workforce management/payroll, planning/analytics, talent/skills,
  employee experience, journeys/help, and guided automation.
- [Rippling HR](https://www.rippling.com/products/hr) and its
  [product ecosystem](https://www.rippling.com/products) — shared workforce
  data across HRIS, compliance, compensation, documents, headcount,
  performance, surveys, learning, time, scheduling, leave, and payroll-adjacent
  operations.

These pages are discovery evidence, not copied requirements. Revalidate source
claims at prioritization time and record date/region because packaging changes.

## Already Strong (protect)

- Unified work OS: HR beside Build, CRM, Chat, Calendar, Mail
- Universal self-service `/me/*` regardless of paid HR
- Shared leave component for self + admin
- Directory vs HR administration split
- Rich HR hub with queue cards
- Custom fields, forms builder, workflows, automations settings
- Import/export jobs
- Governance depth (legal holds, retention, accommodations) uncommon in SMB
  tools

## Parity Gaps to Close (P0–P1)

| Gap | Competitor norm | HRMS action |
|-----|-----------------|-------------|
| Manager team home | Everyone has My Team | ADD `/me/team` or scoped employees (HRM-02) |
| Attendance calendar | Month grid with **WFO vs WFH** | View mode (HRM-04 + HRM-13) |
| Leave / WFH team calendar | Heatmap / calendar | View or `/calendar` sources |
| Bulk approve leave **and WFH** | Inbox + bulk | HRM-05 + HRM-13 |
| Honest filters + URL share | Standard | HRM-04 |
| Policy acknowledgement tracking | Common | ADD tracking UI + API |
| Document expiry alerts | Common | Wire notifications + filter |
| Org chart search + print/export | Common | Harden org-chart |
| Onboarding checklist completeness | Common | Finish probation + task UX |
| Mobile-friendly approvals | Common | Responsive approvals inbox |
| Audit trail on people changes | Expected enterprise | Ensure visible on employee timeline |
| Location holiday calendars | Regional orgs | Finish location view |
| Effective-dated worker history | Enterprise baseline | One worker timeline for rehire, concurrent engagement, manager/org/pay changes |
| Skills and internal mobility | Modern enterprise baseline | Skills profile, opportunity matching, learning plan; human-reviewed recommendations |
| Headcount scenarios | Workforce planning baseline | Approved-position and cost scenarios linked to actuals, not spreadsheet-only totals |
| Compensation bands/calibration | Rewards baseline | Bands, compa-ratio, review cycle, guardrails, audit and cohort privacy |
| Continuous listening | Employee-experience baseline | Pulse/survey action plans with minimum cohort suppression |
| Localized compliance | Global-company baseline | Country policy packs and provider boundaries; no global hard-coded tax rules |
| Guided HR assistance | Emerging baseline | Permission-grounded answers/drafts with citations, abstention and human confirmation |

- [ ] **HRM-10-001** ship manager team home.
- [ ] **HRM-10-002** ship attendance + leave calendar experiences with WFO/WFH
  distinction.
- [ ] **HRM-10-003** ship policy acknowledgement tracking MVP.
- [ ] **HRM-10-004** ship document expiry notification + list filter.
- [ ] **HRM-10-005** harden org chart search / export.
- [ ] **HRM-10-015** define skills/internal-mobility MVP with consent,
  explainability, correction, and no autonomous employment decision.
- [ ] **HRM-10-016** define headcount scenario and compensation calibration MVP
  with effective dates, currency normalization, cohort privacy, and approvals.
- [ ] **HRM-10-017** define global policy-pack/provider boundary and localization
  readiness matrix before adding country-specific rules.
- [ ] **HRM-10-018** define permission-grounded HR assistance with provenance,
  forbidden autonomous actions, human confirmation, and audit.

## Differentiator Bets (stay ahead)

Build these only after P0 parity; they leverage StreamlineOS uniquely:

1. **Work OS people graph** — employee card actions deep-link to Build work,
   CRM accounts, chat DM, calendar hold, and mail — with permission checks.
2. **Approvals inbox as OS surface** — leave, expense, travel, attendance,
   documents, helpdesk in one prioritized inbox with bulk (HRM-05).
3. **AI-assisted HR drafts** — job description, policy summary, exit checklist
   drafts via existing AI credit metering; human confirm required.
4. **Calendar-native HR** — holidays/leave/birthdays as first-class `/calendar`
   sources with dense month UX.
5. **Trusted automation** — HR automations with dry-run and audit, not opaque
   Zap-like failure.
6. **Unified search** — people + documents + cases in command palette with
   scope.
7. **Workforce cost + delivery** — connect contingent/workforce cost to Build
   project staffing without merging schemas.

- [ ] **HRM-10-006** employee card OS deep-links (chat, calendar, mail, Build
  assigned work) behind entitlements.
- [ ] **HRM-10-007** command-palette people/document/case search.
- [ ] **HRM-10-008** AI draft entry points on policies, offers handoff notes,
  exit checklist — metered.
- [ ] **HRM-10-009** automation dry-run + audit for one HR workflow family.
- [ ] **HRM-10-010** calendar source completeness for holidays, leave, birthdays,
  probation.

## Explicit Non-Goals (this program)

- Full ATS replacement features (scoring AI, agency portals) — Recruitment
  program
- Global payroll country-pack tax engines beyond configured windows — partner
  epic; core run/payslip/setup **is** in scope via HRM-12
- Benefits carrier integrations beyond Composio-backed connections without a
  named partner epic
- Cloning Rippling’s device management SKU
- Public employee social feed unrelated to work

## APIs / Components / UX to Add (summary backlog)

### Pages

- Manager team home
- Policy acknowledgement inbox (self + admin report)
- Import job detail status (if missing)
- Notification preferences for HR events (if missing)

### Components

- Shared `HrFilterBar` built on design-system toolbar
- Bulk action bar (from Directory users pattern)
- Attendance calendar
- Employee OS action menu
- Surface-tokenized `HrSheet`

### APIs

- Bulk leave decide, bulk attendance regularize, bulk employee patch
- Policy acknowledgement create/list
- Document expiry query
- Manager team roster (`/me/team` or scoped employees)
- Shared cache invalidator
- Calendar source registration endpoints if incomplete

### UX

- Distinguishable overlays
- URL-shareable filters
- Honest empty/error/denied
- Skeleton parity

- [ ] **HRM-10-011** map each P0 parity item to a child PRD task ID.
- [ ] **HRM-10-012** reject feature requests that violate Non-Goals unless a new
  program is opened.

## Acceptance Checks

- [ ] **HRM-10-013** product review signs parity vs differentiator split.
- [ ] **HRM-10-014** no ATS scope creep merged into HRMS PRs without README
  Scope A+ amendment; Payroll changes belong under HRM-12.
