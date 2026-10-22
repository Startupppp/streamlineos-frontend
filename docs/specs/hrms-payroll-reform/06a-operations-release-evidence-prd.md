# StreamlineOS People + Payroll Operations and Release Evidence PRD

**Status:** Normative suite quality contract  
**Owner:** People Platform + SRE + Product Operations  
**Priority:** P0 release gate  
**Parents:** [Platform PRD](./06-platform-intelligence-compliance-prd.md) and
[Competitive Coverage and Release PRD](./08-competitive-coverage-release-prd.md)

## 1. Outcome

Global HR and India payroll launch claims are supported by named market,
integration, report, performance, recovery, metric, AI, and traceability
evidence rather than broad statements.

## 2. Release Capability Matrix

Every release publishes one versioned matrix containing:

- product version, environment, release date, and evidence owner;
- supported tenant size, legal-entity topology, worker types, UI languages,
  Unicode/scripts, locales, currencies, timezones, address/name formats, data
  regions, and mobile/PWA surfaces;
- native HR baseline by country, approved payroll country packs, statutory
  version/effective period, and tested establishment/registration topology;
- each capability labeled native, connected, customer-operated, managed,
  partner-dependent, beta, or unavailable;
- required provider/package, sandbox status, production certification,
  degradation/fallback mode, and known exclusions.

P0 global HR supports country-neutral records in any country, multiple legal
entities, ISO country/currency/timezone, Unicode names/addresses, and
translation-ready copy. Initial UI locales and data regions must be named in
the matrix; local employment-law compliance is not implied.

## 3. P0 Standard Report Catalog

Each report uses governed metrics, permission-filtered detail, as-of time,
effective-date rules, totals, drill-through, export limits, and reconciliation.

| Domain | Minimum P0 reports |
|---|---|
| Core HR | active workforce census; joiner/exiter/movement; missing facts; org/manager span; document/policy status |
| Time/leave | attendance and exceptions; leave balance/ledger; WFO/WFH; overtime/payroll-input reconciliation |
| Talent/rewards | goal/review completion; rating publication; compensation cycle/budget/exception |
| Service | request/SLA/workload; restricted case aging as permission-safe aggregates; knowledge containment |
| Payroll | register; input/variance; component/deduction; payout/return; statutory; FnF; loan; journal; audit |
| Platform | access/delegation; import/export; workflow/job/integration health; retention/hold; AI evaluation |
| Implementation | source/mapping/error; control totals; parallel variance; cutover readiness; stabilization |

Every catalog entry declares report ID, audience, grain, fields, filters,
freshness, owner, source versions, totals, drill path, retention, and test ID.
Custom report building is P1; P0 standard reports and safe exports are not.

## 4. Launch Integration Matrix

| Dependency | P0 delivery and fallback | P1+ |
|---|---|---|
| Organization/Directory/Identity | Native required contract and reconciliation | federation/advanced provisioning |
| Recruitment | Native versioned position/accepted-hire handoff | additional ATS connectors |
| Expenses | Native or contracted claim-to-reimbursement contract; no duplicate claim store | marketplace connectors |
| Build | Native task/time/project summary contracts | work-aware optimization |
| Calendar/Chat/Mail/Knowledge | Native deep links/events with permission-safe payloads | cross-suite automation |
| Accounting | Balanced file/export + acknowledgment/manual evidence | direct posting connectors |
| Bank/payout | Secure bank file/advice + manual acknowledgment | direct provider rail |
| Statutory filing/payment | Validated artifact + manual evidence | portal/provider submission |
| E-signature | Download/upload/manual evidence fallback where lawful | direct provider |
| Time clocks | Versioned import/manual contingency | device/provider sync |

For every required integration, the release ledger records owner, schema,
credentials/scopes, sandbox, success/rejection/timeout/unknown fixtures,
acknowledgment SLO, replay, reconciliation, fallback, and support runbook.

## 5. Numerical Reliability and Scale Gates

These are minimum service targets; contracted targets may be stricter.

| Path | Minimum release target |
|---|---|
| HR/ESS read-write availability | 99.9% monthly |
| Payroll calculation/approval/lock internal availability | 99.9% monthly and 99.95% during declared processing windows |
| Common read latency | p95 ≤500 ms server time at target volume |
| Common write acceptance | p95 ≤1 s excluding durable background completion |
| Payroll calculation | 10,000 employments in ≤60 minutes p95 in production-like load test |
| Payroll command feedback | durable command ID or validation result in ≤2 seconds p95 |
| Payout/statutory/journal intent durability | zero acknowledged intent loss |
| Critical unknown external state alert | ≤5 minutes from detection |
| Permission/access revocation | effective for new requests ≤60 seconds; signed links/session behavior per stricter policy |
| Standard report | interactive result ≤10 seconds p95 or durable export job with progress |

Target data volume is at least 10,000 workers, 1 million time events per tenant
per year, 10 years payroll history, and 100 concurrent operator/self-service
sessions without unbounded reads. Each load test records dataset, topology,
build, environment, duration, p50/p95/p99, resource saturation, and failures.
Latency tests run at least 30 minutes after warm-up with representative read/
write/export/job mix. Payroll p95 uses at least 20 independent full runs across
joiner/exiter/retro/normal mixes, including five cold-cache runs. Processing
windows and exclusions are declared before the period opens, never after results.

## 6. Recovery, Continuity, and External Cutoffs

- HR/ESS backup target: infrastructure RPO ≤15 minutes and RTO ≤8 hours.
- Payroll configuration, locked inputs/results, audit, and external intents:
  infrastructure RPO ≤5 minutes, RTO ≤4 hours, and zero logical loss for an
  acknowledged transaction through transaction/outbox durability.
- Recovery tests restore tenant isolation, encryption, field policy, legal
  hold, signed-link invalidation, job/event offsets, and reconciliation state.
- At least twice yearly, and before material payroll storage/orchestration
  change, run restore and provider-outage exercises in a named environment.
- Within 30 minutes of a cutoff-threatening incident, activate a named owner,
  customer communication, retry freeze/continuation decision, manual fallback,
  and evidence log.
- Recovery cannot replay payment, filing, journal, or publication blindly;
  unknown outcomes reconcile before retry.

## 7. Metric Specification and Hard Guardrails

Every metric declares formula, owner, source facts, grain, cohort, exclusions,
timezone/window, freshness, baseline, target, segmentation, and version.

GA hard guardrails:

- zero known cross-tenant or unauthorized sensitive-field disclosures;
- 100% high-impact commands with actor, authority, reason, before/after or
  input/result hash, correlation, and evidence;
- 100% payroll results linked to input, compensation, formula, and country-rule versions;
- 100% payout/statutory/journal intents reconciled or open with named owner;
- zero unexplained parallel-payroll or first-live-payroll variance above its
  pre-approved field/control tolerance;
- 100% P0 pages pass required keyboard, screen-reader, reflow, contrast, and
  non-color-state WCAG 2.2 AA tests;
- every critical P0 persona journey has the task-study, state/copy review, and
  responsive light/dark evidence required by PRD 07b;
- zero open Critical/High security findings without an approved time-bounded waiver.

Outcome targets that require pilot baselines are approved before GA candidate
and cannot be invented after results are known.

## 8. AI Evaluation and Release Gate

Every model, prompt, retrieval index, tool schema, and policy version appears
in an inventory with owner, purpose, fields, regions, retention, and rollback.
A fixed, versioned evaluation set covers:

- tenant/row/field/document/action permission leakage and indirect inference;
- citation existence, source support, freshness, and as-of date;
- contradictory/missing source abstention and safe escalation;
- protected-class, medical, union, case, compensation, and payroll handling;
- prompt injection, malicious document, tool argument, replay, and confirmation;
- all prohibited employment, pay, payout, access, legal, and disciplinary actions.

Release thresholds:

- 100% pass on deterministic permission, tenant-isolation, and prohibited-action tests;
- zero known sensitive-value leakage in adversarial release tests;
- ≥95% source-supported factual answers on the approved evaluation set;
- ≥95% correct abstention on intentionally unanswerable/high-risk legal cases;
- 100% mutating tool calls produce authorized preview, confirmation, idempotency,
  domain audit, and safe failure in integration tests.

Failure blocks the affected AI capability, not the underlying manual workflow.

## 9. Requirement and Release Evidence Ledger

Each P0/P1 requirement row records:

`requirement ID → tier → owner → dependency → page/API/event → permission →
automated/manual test ID → environment/build → evidence → result → approver`

Each release gate records named Product, Engineering, QA, Security/Privacy,
Accessibility, Operations, Payroll, Finance, and Legal approvers as applicable.
Evidence is tied to one immutable application/backend/rule/provider revision.

Waivers require scope, customer impact, detection, compensating control,
authority, expiry, remediation owner/date, and launch-copy restriction.
Critical tenant isolation, payroll reproducibility, unexplained pay variance,
duplicate payout, or unacknowledged compliance claims are non-waivable.

## 10. Acceptance Criteria

- [ ] Release capability matrix accurately limits global and country claims.
- [ ] Every P0 report has an owner, reconciled totals, permissions, and test.
- [ ] Every required integration passes success and recovery fixtures or uses
      its declared P0 fallback.
- [ ] Availability, performance, volume, RPO, RTO, and restore gates pass on a
      fixed production-like revision.
- [ ] GA guardrails pass with no non-waivable exception.
- [ ] AI thresholds pass before any affected assistant/tool capability is enabled.
- [ ] Every P0/P1 requirement and canonical page has traceable release evidence.
