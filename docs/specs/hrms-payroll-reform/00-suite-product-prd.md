# StreamlineOS People + Payroll Reform — Suite Product PRD

**Status:** Target-state product contract  
**Owner:** People Product Council  
**Audience:** Product, design, engineering, QA, security, legal, payroll operations  
**Market:** Startups through mid-market companies  
**Geography:** Global HRMS; India-first payroll with country-pack architecture  
**Recruitment:** Separate product; boundary integrations only  
**Last reviewed:** 2026-10-22

## 1. Authority

This folder is the product authority and open-work queue for HRMS and Payroll.
The [current-product gap map](./10-current-product-gaps-prd.md) routes to
unfinished acceptance files inherited from the former HRMS execution pack;
the [detailed reporting-manager PRD](./15-reporting-manager-onboarding-prd.md)
retains its policy contract and open verification. Source presence is not
release proof. Where older scope or route decisions conflict with this suite,
the newer domain and page contracts control the target behavior.

The normative set includes [Domain Contracts](./00a-suite-domain-contracts-prd.md), [Transitions](./00b-lifecycle-transition-contracts-prd.md), [Tier Register](./00c-requirement-tier-traceability-prd.md), [Core HR](./01-core-hr-lifecycle-prd.md),
[Workforce](./02-workforce-management-prd.md), [Talent/Rewards](./03-talent-experience-rewards-prd.md), [Service](./04-employee-manager-service-prd.md),
[India Payroll](./05-india-payroll-prd.md), [Statutory](./05a-india-payroll-statutory-prd.md), [Payroll Controls](./05b-india-payroll-controls-edge-cases-prd.md),
[Payroll Transitions](./05c-payroll-statutory-transition-tables-prd.md), [Platform](./06-platform-intelligence-compliance-prd.md), [Ops Evidence](./06a-operations-release-evidence-prd.md), [Pages](./07-pages-navigation-roles-prd.md), [Manifest](./07a-page-permission-manifest-prd.md),
[Experience and Content](./07b-experience-content-quality-prd.md), [Competitive Release](./08-competitive-coverage-release-prd.md), and [Implementation](./09-implementation-migration-cockpit-prd.md).
[Benchmark PRD 08a](./08a-competitor-benchmark-prd.md) is dated evidence, not independent scope authority.

Each capability has one owning PRD. Other PRDs may reference it but must not
redefine its business rules.

## 2. Product Outcome

StreamlineOS People + Payroll is one connected operating system in which:

- a company can go from initial organization setup to a correct payroll run
  without spreadsheets or duplicate worker records;
- employees can complete routine people and pay tasks without HR assistance;
- managers can understand and act on team work, availability, growth, cost, and
  risk from one workspace;
- HR and payroll operators work from effective-dated, permission-safe facts;
- Finance and leadership can plan headcount and cost against real work demand;
- every material employment or pay decision is explainable, auditable, and
  reversible where law and state permit; and
- global HR capabilities do not hard-code one country's employment or payroll
  rules.

## 3. What “Ahead of Competitors” Means

The goal is not to copy every SKU sold by every vendor. No product can
credibly provide every country service, insurance brokerage, PEO, EOR, device
management, and statutory filing service in one release.

StreamlineOS must meet the **combined parity envelope relevant to startups and
mid-market companies**, explicitly label partner-dependent capabilities, and
lead on measurable workflow outcomes:

1. one worker and employment record across HR, time, payroll, work, and cost;
2. one approval inbox and one lifecycle orchestration layer;
3. fewer payroll corrections through pre-run anomaly detection and source
   provenance;
4. workload, staffing, skills, delivery risk, and labor cost in one
   permission-safe decision view;
5. AI that cites source facts, respects field permissions, abstains when facts
   are missing, and cannot autonomously change employment or pay; and
6. faster implementation through guided setup, migration preflight, sandbox,
   and progressive disclosure.

## 4. Primary Customers and Personas

### Ideal customer profile

- 5–2,000 workers at launch; architecture and bounded reads support at least
  10,000 workers without a product redesign.
- Startup, scale-up, professional services, technology, distributed knowledge
  work, and mixed office/remote organizations.
- One or more legal entities; India payroll first; globally distributed
  employees and contractors may be managed in HR before local payroll exists.
- Lean HR/finance teams that need strong defaults without losing configurability.

### Personas

| Persona | Primary outcome |
|---|---|
| Employee or contractor | Complete profile, time, leave, documents, expenses, growth, and pay tasks |
| Manager | Run the team, approve work, coach performance, and resolve exceptions |
| HR operator | Manage the worker lifecycle, policy, service, talent, and compliance |
| Payroll operator | Produce accurate, compliant, explainable, and paid payroll |
| Finance leader | Control labor cost, payroll funding, headcount, and reconciliation |
| Executive | Understand workforce health, capacity, cost, and risk without oversharing |
| Auditor or legal reviewer | Obtain immutable, purpose-limited evidence |
| Organization owner | Configure a simple company quickly and add depth as it grows |

## 5. Priority Model

| Tier | Meaning | Release posture |
|---|---|---|
| **P0 Foundation** | Required for a trustworthy HRMS and end-to-end India payroll | No general availability without it |
| **P1 Complete Suite** | Expected parity for the target segment | Committed after P0; may ship incrementally |
| **P2 Differentiator** | Material advantage enabled by the work OS | Ship after the underlying P0/P1 facts are reliable |
| **P3 Future / Country Pack** | Valuable expansion that should not distort the first release | Contract and extension points only |
| **Partner-dependent** | Requires licensed provider, regulated service, or signed integration | Never market as native until contracted and verified |
| **Out of scope** | Owned by another product or deliberately excluded | No hidden implementation in HRMS |

For portfolio reviews, the four requested categories are **base features = P0**,
**features the product should have = P1**, **good to have in the future = P3**,
and **wow features = P2**. P2 differentiators depend on trustworthy P0/P1
facts and are evaluated by user outcomes, not by the presence of an AI or
dashboard label. P3 is a future horizon rather than an implied commitment.
The [product-definition index](./README.md) gives the complete ownership map.

## 6. Master Capability Scope

| Domain | P0 Foundation | P1 Complete Suite | P2 Differentiator |
|---|---|---|---|
| Core HR | Worker/person record, multi-entity employment, org assignment, minimum job/level/position, documents, fields, policies, lifecycle | Advanced job architecture, mass changes, probation, right-to-work, alumni | Lifecycle risk and cross-work context |
| Time and leave | Attendance, WFO/WFH, leave, holidays, assigned shifts, overtime input, exceptions, approvals | Rosters, swaps, comp-off, device fleet, geofence depth, work logs | Capacity and delivery-aware scheduling |
| Talent | Goals, reviews, feedback, cycles | Skills, learning, calibration, succession, career paths | Skills-to-project matching and development plans |
| Experience | ESS, manager home, approvals, announcements, knowledge, cases/helpdesk | Surveys, recognition, journeys, mobile depth | Proactive personalized work and people nudges |
| Rewards | Salary history, bands, compensation cycles | Benefits, equity, total rewards, pay-equity controls | Performance/cost-informed recommendations with human approval |
| Payroll | India setup, multi-establishment inputs, gross-to-net, minimum correction/reversal, compliance, payout fallback, payslips, FnF | Advanced off-cycle, contractor pay, group payroll, direct filings/accounting connectors | Explainable anomalies, cash and delivery-aware labor insights |
| Planning and analytics | Trusted operational reports and drill-through | Headcount scenarios, cost plans, attrition and cohort analytics | Demand-to-capacity and margin forecasting |
| Platform | RBAC, data scope, audit, standard workflows/forms/fields/reports, safe test mode, imports, APIs, retention, localization | Customer sandbox, no-code builders, custom reports, marketplace | Permission-grounded assistant and simulation |

Detailed ownership, tier resolution, and evidence rules live in the normative set above.

## 7. Locked Product Boundaries

### Recruitment is separate

Recruitment owns requisitions after approved headcount handoff, sourcing,
candidate CRM, pipeline, interviews, scorecards, offers, recruiting analytics,
vendors, booking links, and recruiting automations.

HRMS owns only:

- approved position and headcount signal sent to Recruitment;
- hired-candidate facts received into preboarding/onboarding;
- employee referrals and internal-opportunity discovery as self-service entry
  points, while candidate processing stays in Recruitment; and
- onboarding readiness and time-to-productivity after acceptance.

### Payroll and HRMS are separate domains in one suite

HRMS owns employment, attendance, leave, reimbursable approval facts, and exit
initiation. Payroll owns salary calculation, run state, statutory treatment,
payout, payslip publication, and FnF settlement. A versioned payroll-input
snapshot is the boundary; Payroll never recalculates HR policy history from
mutable live rows.

### Other platform boundaries

- Directory owns person and organization membership discovery.
- Organization owns business units, departments, locations, teams, legal
  entities, and cost centers.
- Calendar is the only calendar product; HR contributes permission-safe sources.
- Expenses owns claim capture and approval; Payroll owns reimbursement payout.
- Accounting owns books; Payroll publishes journal exports and reconciliation.
- Identity owns authentication; HRMS owns employment-triggered access requests,
  not credential internals.

## 8. Product Principles

1. **One fact, one owner.** Projections are allowed; parallel mutable records are not.
2. **Effective dates over overwrites.** Employment, manager, policy, salary,
   job, location, and statutory facts preserve history and future changes.
3. **Exception-first operations.** HR and payroll home pages show blocked,
   risky, overdue, and changed work before vanity metrics.
4. **Self-service by default.** Employees and managers resolve routine work
   without receiving administrative access.
5. **Progressive depth.** A five-person company sees a simple setup; advanced
   governance appears only when enabled or required.
6. **No silent compliance.** The product shows rule version, effective date,
   source, result, and actions; legal review remains explicit.
7. **Human accountability.** AI may explain, draft, summarize, detect, and
   recommend. A named person confirms employment, pay, access, legal, or
   disciplinary consequences.
8. **Privacy in the query.** Sensitive fields are excluded server-side, not
   fetched and hidden in the browser.
9. **Cross-work links, not schema fusion.** HR can reference projects, workload,
   CRM, calendar, chat, mail, and knowledge through scoped contracts.
10. **Every action closes the loop.** Mutation, audit, notification,
    invalidation, downstream event, and recovery behavior are specified together.

## 9. Canonical Data Concepts

The implementation must distinguish identity and employment; organization,
position, job, and reporting facts; policy, time, leave, schedule, and approved
inputs; compensation, payroll profile, run, payout, filing, and payslip;
workflow, approval, task, document, retention, and hold; skills, learning,
opportunities, headcount plans, scenarios, and actuals; and audit, domain
event, notification, integration delivery, and idempotency records.

Every entity is tenant-scoped. Sensitive fields carry a classification and
field-level visibility policy.

## 10. Required End-to-End Journeys

1. **P0:** Organization setup → legal entity → HR policy → India payroll setup.
2. **P0:** Approved headcount → Recruitment handoff → accepted hire → worker onboarding.
3. **P0:** Onboarding → manager/job/location/pay assignment → access/task orchestration.
4. **P0:** Attendance/leave/WFH/overtime/enabled-timesheet input → frozen payroll inputs → run.
5. **P0:** Run preflight → exception resolution → approval → lock → payout → payslip →
   statutory and accounting reconciliation.
6. **P0/P1:** Employee change → HR/access/payroll impact P0; benefit-provider impact P1.
7. **P0/P1:** Review → compensation → payroll P0; calibration extension P1.
8. **P0:** Employee issue → case/helpdesk → SLA, restricted notes, resolution, feedback.
9. **P0/P1:** Exit → access/asset/document/FnF P0; alumni experience P1.
10. **P1:** Workforce scenario → position → Recruitment handoff → actual-versus-plan.

## 11. Suite-Wide Functional Requirements

- **FR-SUITE-001:** Every admin collection and repeat-use self-service list supports
  scoped filtering, stable sort, bounded pagination, shareable URL state, and honest
  empty/loading/error/denied/disabled states.
- **FR-SUITE-002:** Every high-impact action supports authorization,
  preflight, consequence text, idempotency, audit, and partial-failure recovery.
- **FR-SUITE-003:** Imports use upload → map → validate → preview → commit →
  results → correction/retry; no direct unvalidated insert.
- **FR-SUITE-004:** Exports are permission-filtered snapshots with purpose,
  requester, expiry, watermark where required, and audit.
- **FR-SUITE-005:** Workflow routing uses effective facts and snapshots the
  resolved approver for in-flight steps.
- **FR-SUITE-006:** Notifications deep-link to an authorized destination and
  honor preference, urgency, deduplication, and escalation policy.
- **FR-SUITE-007:** Configuration affecting time, pay, eligibility, or access is
  versioned, previewable, and auditable.
- **FR-SUITE-008:** Every domain exposes integration-safe events and
  idempotent APIs; external network work runs after the owning transaction commits.
- **FR-SUITE-009:** Search and reporting never reveal hidden record existence or
  protected field values through counts, suggestions, or errors.
- **FR-SUITE-010:** Customer-visible AI output includes provenance, confidence
  or uncertainty, permission-aware citations, and a clear confirmation boundary.

## 12. Non-Functional Requirements

| Area | Requirement |
|---|---|
| Availability | 99.9% monthly target for HR/ESS; payroll run, payout, and filing paths use separately monitored SLOs |
| Performance | Common reads p95 ≤500 ms server time; writes p95 ≤1 s excluding durable background work; page interaction feedback ≤100 ms |
| Scale | 10,000 workers, 1 million time events/year/tenant, and 10 years payroll history without unbounded reads |
| Accessibility | WCAG 2.2 AA; keyboard, screen reader, reflow, non-color state, reduced motion |
| Security | Least privilege, MFA support, encryption, tenant isolation, signed downloads, secret isolation, immutable audit |
| Privacy | Purpose limitation, field classification, retention, legal hold, correction/export, minimum-cohort analytics |
| Recovery | Documented RPO/RTO; retry-safe jobs; reconciliation and replay for integrations |
| Localization | Locale, timezone, currency, names, addresses, week rules, working calendars, and translation-ready copy |
| Observability | Correlation ID across action, job, event, integration, notification, and audit; sensitive values redacted |

## 13. Success Metrics

### Customer outcomes

- median organization setup to first correct payroll;
- onboarding completion and time to productive access;
- employee self-service containment rate;
- manager approval and exception age;
- payroll runs completed without post-lock correction;
- payout, statutory, and accounting reconciliation rate;
- policy acknowledgment and document-expiry compliance;
- HR case first response and resolution time;
- review completion, goal adoption, and development-plan follow-through;
- approved-plan versus actual headcount and labor-cost variance.

### Trust guardrails

- zero confirmed cross-tenant disclosure;
- authorization-denial parity for sensitive record existence;
- payroll calculation and filing rule version present on every result;
- AI citation, abstention, override, and prohibited-action rate;
- audit completeness for high-impact actions;
- accessibility defect escape rate;
- stale-cache and integration replay incidents.

## 14. Delivery Sequence

1. **Wave 0 — Integrity:** canonical ownership/contracts, access, effective
   dates, audit/events, import framework, Recruitment boundary, and evidence ledger.
2. **Wave 1 — P0:** Core HR, ESS/manager/service, time/leave, implementation
   cockpit, and complete India payroll through reconciliation.
3. **Wave 2 — P1:** scheduling, talent, rewards, planning, configurable
   workflows/reporting, mobile depth, and multi-entity payroll.
4. **Wave 3 — P2:** work-aware staffing/cost, proactive compliance,
   permission-grounded assistance, simulation, and lifecycle orchestration.
5. **Wave 4 — P3:** additional country packs and contracted regulated partners.

## 15. Explicit Non-Goals

- Recruitment/ATS implementation inside HRMS.
- Native payroll tax engines for countries without an approved country pack.
- Acting as employer of record, PEO, insurer, broker, bank, tax adviser, or law firm.
- Generic endpoint/device management equivalent to an IT management SKU.
- Autonomous hire, fire, promotion, compensation, discipline, access, or payout decisions.
- Public employee social network as a substitute for work communication.
- Full accounting ledger, project management, CRM, chat, mail, or calendar duplication.

## 16. Suite Acceptance

The reform is complete only when:

- every in-scope capability and customer page has one owner, tier, role gate,
  data contract, state model, and measurable acceptance criterion;
- the P0 journeys in section 10 pass against one fixed frontend/backend revision;
- payroll calculations are reproducible from frozen inputs and versioned rules;
- India statutory outputs pass payroll/legal review in a named sandbox or
  production-like environment;
- tenant, field, data-scope, and cohort privacy tests pass;
- imports, exports, jobs, integrations, and notifications prove retry and recovery;
- all P0 pages pass responsive and WCAG 2.2 AA acceptance; and
- no Recruitment-owned feature is implemented or marketed as part of HRMS.
