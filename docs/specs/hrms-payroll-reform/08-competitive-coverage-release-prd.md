# StreamlineOS People + Payroll Competitive Coverage and Release PRD

**Status:** Normative scope and release contract  
**Owner:** People Product Management  
**Research date:** 2026-10-21  
**Market:** Startups through mid-market companies  
**Scope:** Global HRMS, India-first payroll, Recruitment separate

## 1. Purpose

This PRD translates competitor coverage into product commitments and release
gates. It does not treat marketing-page presence as proof of depth, local
availability, packaging, legal compliance, or StreamlineOS implementation.

“Features we have for sure” below means **committed target-state features**.
It does not mean every item already works in the current code. Existing,
partial, and missing status must be established by a source/API/browser/DB
implementation audit before release claims.

## 2. Benchmark Authority

The comparison method, global HRMS matrix, India payroll matrix, caveats, and
official sources live in the
[Competitor Benchmark PRD](./08a-competitor-benchmark-prd.md). Release
priorities here must remain traceable to that dated evidence. Benchmark cells
are directional until a claim ledger records exact source, quote, geography,
package, delivery model, access date, and reviewer.

## 3. Base Features Customers Expect — P0 Foundation

These are non-negotiable for general availability.

### Core HR

- one worker/employment system of record with effective history;
- organization, job, position, manager, location, entity, cost center, and custom fields;
- onboarding, employee changes, documents, policies/acknowledgments, exit, and rehire;
- directory, employee profile, org chart, import/export, audit, RBAC, and data scope.

### Workforce operations

- attendance with WFO/WFH, leave, balances, holidays, shifts, exceptions,
  overtime inputs, approvals, and payroll snapshot;
- employee and manager mobile flows;
- expenses/reimbursement handoff and asset exit checks.

### Employee, manager, and HR service

- employee home, manager team home, unified approvals, notifications, HR
  knowledge, service requests, restricted cases, and SLA.

### Talent and rewards

- goals, reviews, feedback, 1:1s, basic analytics;
- salary history/bands, compensation cycle, budgets, approvals, and payroll handoff.

### India payroll

- setup, employee payroll profiles, structures/components, frozen inputs,
  reproducible run, preflight/exceptions, lock, payout, payslips, FnF, statutory
  calculations/artifacts, approved loan/advance recovery, minimum
  adjustment/reversal/corrected publication, reports, accounting,
  reconciliation, and self-service.

### Platform trust

- field-aware authorization, encryption, audit, outbox, idempotency,
  versioning, retention, legal hold, observability, accessibility, and recovery.

### Implementation and migration

- source inventory, versioned mappings, validation, YTD/opening balances,
  replayable imports, parallel payroll reconciliation, cutover gates, rollback
  rehearsal, stabilization, and signed handoff as defined in the
  [Implementation and Migration Cockpit PRD](./09-implementation-migration-cockpit-prd.md).

## 4. Features the Product Should Have — P1 Complete Suite

P1 is a product commitment after P0 integrity; it is not optional polish.

- advanced cross-entity HR orchestration and group/multi-entity India payroll;
- advanced scheduling, rosters, clocks, comp-off, project-hour handoff,
  connected Expenses-owned travel/expense depth, and asset depth;
- skills, learning, career paths, internal mobility handoff, talent reviews,
  calibration, succession, and critical-role coverage;
- surveys, engagement action plans, recognition, employee journeys, and mobile depth;
- benefits, equity, total rewards, pay-equity controls, multi-currency comp cycles;
- workforce/headcount scenarios, advanced position-control depth, labor-cost plan, and actuals;
- no-code forms, workflows, automations, report builder, integrations,
  customer sandbox, reusable implementation templates, and source adapters;
- contractor pay, advanced off-cycle/correction tooling, advanced tax workflow,
  loan origination/administration, FBP, direct-provider statutory acknowledgment
  automation, and consolidated payroll reporting.

## 5. Wow Features — P2 Differentiators

These are worth building because StreamlineOS has the underlying products and
data contracts. Each must prove a better task outcome against the current
workflow; it must not precede P0 trust.

1. Workload, delivery risk, skills, availability, and labor-cost staffing view.
2. Skills-to-project, mentor, learning, and opportunity matching with explanations.
3. Permission-grounded People assistant with source citations and confirmed actions.
4. Payroll variance explanation and anomaly detection with source-level evidence.
5. Lifecycle impact preview across payroll, access, work, calendar, and cost.
6. Proactive compliance findings with owner, rule source, due date, and review.
7. Trusted automation recommendations, dry-run, and reversible execution.
8. Headcount, reorganization, compensation, scheduling, and payroll simulations.
9. Employee “explain my payslip/policy” experiences using only the employee's facts.
10. Calendar-, chat-, mail-, knowledge-, CRM-, and Build-aware deep actions
    without copying protected HR data.

## 6. Good-to-Have Future Bets — P3 Country Packs and Partners

- additional native payroll countries;
- EOR/PEO and managed payroll partnerships;
- benefits brokerage/carrier networks;
- regulated tax/legal advisory;
- earned-wage access, lending, or insurance products;
- equity brokerage/cap-table execution;
- enterprise legal/labor governance packs;
- advanced physical clock, identity proofing, or digital-signature providers.

These must be labeled by delivery model: **native**, **connected**, **managed**,
or **partner**. Marketing may not collapse those distinctions.

## 7. Deliberate Non-Goals

- Recruitment/ATS inside HRMS.
- Generic IT device management.
- Full accounting/ERP.
- Public employee social network.
- Autonomous employment, pay, legal, or disciplinary decisions.
- Native country compliance without a signed-off country pack.
- Claiming that a generated statutory report equals a filed/paid obligation.

## 8. Competitive Advantages to Protect

### One work and people context

Competitors commonly connect HR modules to one another. StreamlineOS can also
connect authorized work demand, assignments, workload, project outcomes,
customer commitments, calendar, chat, mail, and knowledge. The requirement is
deep-linking and governed read models, not a universal unscoped database.

### Exception-first operations

HR and Payroll command centers must prioritize blocked onboarding, missing
manager, expiring document, policy breach, unresolved attendance, payroll
input delta, payout failure, filing rejection, and SLA risk.

### Explainable time-to-pay

Every pay quantity traces to approved source, every calculation to a rule and
formula version, every difference to a changed fact, and every payment/filing
to acknowledgment and reconciliation.

### Safe intelligence

AI respects the exact actor's fields and scope, cites sources, separates facts
from suggestions, abstains, and requires confirmation. High-impact actions are
technically unavailable to autonomous agents.

### Faster adoption

Guided defaults, migration preflight, sample validation, parallel run,
sandbox, progressive setup, and clear recovery are product features, not
services left outside the roadmap.

### Implementation and migration cockpit

The native cockpit links source lineage, configuration, reconciliation,
decisions, Build tasks, evidence, go/no-go, rollback, and stabilization. This
shortens safe time-to-live and makes implementation quality inspectable rather
than leaving it in consultant-owned spreadsheets.

## 9. Outcome Scorecard for Competitive Leadership

The claim “best” is earned for a named customer segment, country, package, and
task. Product and Design record a current-workflow baseline and a predeclared
target before a pilot or comparative study. Public vendor pages establish a
capability signal, not a winner in speed, usability, accuracy, or service.

| Customer job | Primary outcome | Guardrail and evidence |
|---|---|---|
| Set up and migrate | Time from source inventory to first correct live payroll; first-pass import and parallel-run variance | Signed opening/YTD totals, two parallel cycles or approved alternate plan, cutover and rollback evidence |
| Complete employee work | Unassisted completion and time for profile correction, leave/WFH, payslip, policy, and help request | No hidden-field leak; task study, mobile and accessibility evidence |
| Run a team | Age of pending decisions and time to resolve an exception | Manager sees only permitted context; wrong-action and return-for-change rates |
| Change an employment | On-time completion and downstream propagation without manual repair | Effective history, approval, access/payroll handoff and audit match |
| Close payroll | First-pass run accuracy, explained variance, correction effort and close time | Zero unexplained material variance or duplicate payout; locked fact/rule reproduction |
| Meet statutory obligations | On-time payment/filing acknowledgment and reconciliation | Government/provider evidence and legal sign-off; generated artifacts never count as accepted |
| Staff work intelligently (P2) | Time to find an eligible, available person and accepted recommendation rate | Scope-safe data, explanation, human approval, no protected-trait inference |

The [experience PRD](./07b-experience-content-quality-prd.md) defines the
critical task study. PRD 06a owns formulas, pilot baselines, fixed-version
evidence, and hard trust guardrails. A pilot can establish a better result for
its tested cohort; it cannot prove universal market superiority.

## 10. Release Gates

### Gate A — Scope and inventory

- Every capability maps to one owner, tier, page/API, permission, data entity,
  and acceptance criterion.
- Current implementation is classified as complete, partial, conflicting,
  missing, duplicate, or removal candidate with evidence.
- Recruitment routes and responsibilities have a migration owner.
- Every benchmark claim used in prioritization has cell-level evidence; an
  unknown/qualified cell cannot be converted to parity.

### Gate B — P0 domain integrity

- Worker/employment facts, effective dates, field policies, audit, events, and
  idempotency pass DB and contract tests.
- Time/leave-to-payroll inputs are frozen, versioned, bounded, and traceable.
- Payroll calculations pass signed India test fixtures and parallel-run comparison.
- Migration opening/YTD balances, control totals, and at least two parallel
  cycles meet pre-approved cutover thresholds; where no comparable legacy
  cycle exists, payroll/legal approve the evidence-backed validation plan in PRD 09.
- Segmentation, proration, insufficient-net, correction, payout, journal, and
  close fixtures in [PRD 05b](./05b-india-payroll-controls-edge-cases-prd.md)
  and transition IDs in [PRD 05c](./05c-payroll-statutory-transition-tables-prd.md) pass.

### Gate C — End-to-end experience

- Employee, manager, HR, payroll, finance, and auditor journeys pass in browser.
- Loading, empty, error, denied, stale, conflict, and recovery states are tested.
- WCAG 2.2 AA and mobile P0 journeys pass.
- PRD 07b task studies, state/content review, responsive light/dark inspection,
  and predeclared outcome targets pass for critical journeys.

### Gate D — Security, privacy, and compliance

- Tenant/object/field/scope tests pass, including exports, search, analytics, and AI.
- Legal/payroll owners approve India country rules and statutory outputs.
- Payout, filing, signature, or carrier providers prove sandbox acknowledgment
  and reconciliation; unavailable providers remain labeled partner-dependent.

### Gate E — Reliability and scale

- Target-volume query plans, payroll run, imports, exports, event replay,
  provider retries, backup/restore, and rollback pass in named environments.
- Numerical SLO, load, RPO/RTO, restore, provider-outage, and AI gates in
  [PRD 06a](./06a-operations-release-evidence-prd.md) pass.
- Dashboards, alerts, runbooks, ownership, and support content are ready.

### Gate F — Launch claims

- Marketing and in-product packaging use only verified current capability.
- Native, connected, managed, partner, beta, and roadmap labels are accurate.
- No “compliant,” “filed,” “paid,” or “AI decided” claim exceeds evidence.

## 11. Release Sequence

1. **Wave 0:** canonical data/access/event foundations and route cleanup.
2. **Wave 1:** Core HR, ESS/manager/service, time/leave, implementation
   cockpit, and complete India payroll P0.
3. **Wave 2:** P1 talent, rewards, planning, automation, integrations, and payroll depth.
4. **Wave 3:** P2 cross-work intelligence and permission-grounded assistance.
5. **Wave 4:** P3 country packs and contracted regulated partnerships.

## 12. Gate Governance

Every gate is a versioned checklist tied to one frontend/backend/rule/provider
revision and target environment. It names required Product, Engineering, QA,
Security/Privacy, Accessibility, Operations, Payroll, Finance, and Legal
approvers as applicable; evidence artifact/test; threshold; signer; and time.

Gates run A → F. A waived item cannot silently satisfy a later gate. A waiver
states requirement, customer impact, detection, compensating control, risk
owner, expiry, remediation date, environment, and launch-copy restriction.
Tenant isolation, payroll reproducibility, unexplained pay variance, duplicate
payout, or unsupported compliance claims are non-waivable.

Waves 2–4 require the same applicable C–F gates. The
[Tier Register](./00c-requirement-tier-traceability-prd.md) and PRD 06a ledger
map every P0/P1 FR and page to evidence.

## 13. Acceptance Criteria

- [ ] Every P0 and P1 item has exactly one owning domain PRD.
- [ ] Every competitor claim in release material is source-dated and geography-labeled.
- [ ] Current implementation status is audited separately from target commitment.
- [ ] India payroll parity is validated against Indian vendors and government sources.
- [ ] P2 work begins only after its dependent P0 facts and controls pass.
- [ ] Recruitment remains a separate product in scope, routes, navigation, and delivery.
- [ ] Launch claims distinguish native, connected, managed, and partner capability.
- [ ] Every gate has named approvers, fixed-revision evidence, waiver policy,
      and a recorded pass/fail decision.
- [ ] Each enabled P0/P1 capability meets PRD 07b interaction and content
      requirements at its tier; P2 leadership claims include measured task outcomes.
