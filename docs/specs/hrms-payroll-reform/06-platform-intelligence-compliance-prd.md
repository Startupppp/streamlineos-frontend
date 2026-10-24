# StreamlineOS People Platform, Intelligence, and Compliance PRD

**Status:** Normative platform PRD  
**Owner:** People Platform  
**Priority:** P0 trust foundation; P1 configurability; P2 intelligent work OS  
**Depends on:** Platform Identity, Organization, Workflow, Data, AI, Integrations

## 1. Outcome

HRMS and Payroll share a secure, configurable platform for access, workflows,
automation, reporting, integration, data governance, and responsible AI.
Domain products remain independently understandable and own their business
rules.

## 2. Scope

### P0 — required

- Tenant, module entitlement, role, permission, field policy, DataScope, and
  purpose-aware access enforcement.
- Immutable audit, durable domain events, notification delivery, job execution,
  idempotency, reconciliation, and observability.
- Versioned forms, custom fields, policies, workflows, approvals, imports,
  exports, and templates.
- Operational dashboards, standard reports, drill-through, scheduled export,
  and metric definitions.
- Data classification, retention, legal hold, subject export/correction, and
  regional-processing controls.
- API/webhook integration framework, credentials isolation, signed delivery,
  retry, replay, and connection health.
- Localization foundation for date, time, timezone, currency, number, name,
  address, language, calendar, and country pack.
- Safe no-side-effect preview/test mode for policy, automation, import, and payroll changes.

### P1 — complete suite

- No-code workflow and automation builder with dry-run, versioning, testing,
  approvals, and execution history.
- Customer-isolated sandbox with de-identification, environment promotion,
  secrets separation, and external-side-effect blocking.
- Report builder, saved metrics, dashboards, row/field security, and cohort privacy.
- Workforce analytics for headcount, movement, span, diversity where lawful,
  attrition, absence, capacity, skills, performance, engagement, and labor cost.
- Workforce/headcount planning with positions, scenarios, approvals, cost,
  actual-versus-plan, and Recruitment handoff.
- Integration marketplace, mapping UI, scheduled sync, conflict resolution,
  master-data ownership, and reconciliation.
- Data residency/retention packs and consent/legal-basis metadata where required.
- Mobile/offline policy for safe reads and conflict-tolerant writes.

### P2 — differentiators

- Permission-grounded People assistant with cited answers and confirmed actions.
- Natural-language reporting that compiles to governed metrics and filters.
- Cross-work demand, workload, staffing, skills, availability, and labor-cost
  intelligence.
- Proactive compliance and operations monitor that creates reviewable findings.
- Organization, headcount, compensation, schedule, and payroll simulations
  using copied scenarios, never live-state mutation.
- Trusted automation recommendations based on execution and exception history.

### P3 / partner-dependent

- Country-specific legal/compliance content and filing connectors.
- Third-party model/provider services, identity proofing, e-signature,
  benefits carriers, banks, tax utilities, and managed services.

## 3. Platform Boundaries

1. A domain owns commands, state, invariants, and sensitive projections exactly
   as assigned in the [Domain Contracts PRD](./00a-suite-domain-contracts-prd.md).
2. Platform Workflow owns orchestration primitives, not leave/payroll/case decisions.
3. Analytics owns governed read models and metric definitions, not source mutation.
4. AI may call only documented, actor-scoped tools and cannot bypass domain confirmation.
5. Integrations never become a second source of truth without an explicit
   field/entity ownership decision.
6. Country packs provide effective-dated rules and outputs through stable
   interfaces; global worker records stay country-neutral.

## 4. Access and Entitlements

### Access layers

1. authenticated actor and active organization membership;
2. enabled product/module entitlement;
3. canonical permission verb (`view`, `create`, `manage`, `approve`, `export`);
4. DataScope (self, direct reports, hierarchy, named groups, locations,
   entities, custom scope, all);
5. object state and relationship;
6. field classification/purpose;
7. temporary delegation or break-glass grant.

- **FR-PLT-001:** Backend query and command layers enforce every applicable
  access layer; frontend gating is usability only.
- **FR-PLT-002:** Permission aliases are migration-only and emit usage telemetry;
  they do not remain permanent duplicate vocabulary.
- **FR-PLT-003:** Delegation is action/type/scope/time bounded and cannot grant
  permissions the delegator does not currently hold.
- **FR-PLT-004:** Break-glass requires reason, expiry, step-up, visible banner,
  review queue, and high-severity audit.
- **FR-PLT-005:** Access revocation invalidates sessions/caches and prevents old
  exports or signed links from remaining usable beyond policy.

## 5. Workflow and Automation

### Workflow

- **FR-PLT-006:** Definitions support trigger, eligibility, steps, approver
  resolution, condition, parallel/sequential paths, SLA, reminder, escalation,
  reassignment, cancellation, and version.
- **FR-PLT-007:** Launch snapshots the definition and resolved inputs; editing a
  definition affects future instances only.
- **FR-PLT-008:** Approver resolution records why the actor was selected and
  supports unavailable-manager fallback without widening scope.
- **FR-PLT-009:** In-flight actions are idempotent and version-checked.
- **FR-PLT-010:** High-impact workflows use separation of duties and prohibit
  self-approval where configured or legally required.

### Automation

- **FR-PLT-011:** Rules support domain event, schedule, or manual trigger;
  condition builder; actions; delay; rate limit; dedupe; owner; and status.
- **FR-PLT-012:** Dry-run lists matching records, predicted actions, blocked
  actions, permission failures, and downstream calls without side effects.
- **FR-PLT-013:** Activation requires validation and, for pay/access/employment
  effects, configured approval.
- **FR-PLT-014:** Execution history shows rule version, trigger, actor context,
  condition result, action result, retry, and recovery.
- **FR-PLT-015:** An automation cannot call an action its service identity and
  initiating context are not authorized to perform.

## 6. Forms, Custom Fields, Imports, and Exports

- **FR-PLT-016:** Form definitions support typed fields, required/conditional
  rules, visibility, validation, help, localization, sections, versions, and
  submission ownership.
- **FR-PLT-017:** Platform owns custom-field definition/versioning primitives;
  each domain owns allowed entities, semantics, mutation, and invariants. Fields declare type, classification,
  visibility, filter/report eligibility, allowed values, lifecycle, and indexing.
- **FR-PLT-018:** Hidden fields cannot be inferred through filters, counts,
  options, validation errors, exports, or AI.
- **FR-PLT-019:** Import jobs use staging, mapping, preview, server validation,
  idempotent commit, results, correction, and optional domain-approved rollback.
- **FR-PLT-020:** Export jobs store canonical filter, projection, purpose,
  requester, generated-at, expiry, hash, and download events.

## 7. Reporting, Analytics, and Planning

### Governed metrics

- **FR-PLT-021:** Every metric has name, business definition, owner, source
  facts, grain, inclusions/exclusions, effective-date rule, dimensions,
  freshness, visibility, and version.
- **FR-PLT-022:** A dashboard value and drill-through list use the same
  permission-aware predicate and reconcile within documented freshness.
- **FR-PLT-023:** Reports support saved filters, columns, grouping, sort,
  schedule, destination, and export limits without arbitrary SQL.
- **FR-PLT-024:** Sensitive analytics enforce minimum cohort, dimension allowlist,
  suppression, and anti-differencing controls.
- **FR-PLT-025:** Predictive output is labeled, monitored, explainable, and
  prohibited from autonomous employment/pay action.

The P0 report catalog and metric/release evidence contract are normative in
[PRD 06a](./06a-operations-release-evidence-prd.md).

### Workforce planning

- **FR-PLT-026:** Plans support baseline, time horizon, entity/cost center,
  position, quantity, start date, employment type, location, skill/job, cost
  assumptions, owner, scenario, and version.
- **FR-PLT-027:** Scenario changes never mutate actual Core HR facts.
- **FR-PLT-028:** Approval commands Core HR to create/version the authorized
  position. Recruitment receives a requisition-ready signal but owns candidate execution.
- **FR-PLT-029:** Actual-versus-plan reconciles filled, open, frozen, canceled,
  delayed, and unplanned positions and cost.
- **FR-PLT-030:** Cost plans distinguish salary, employer statutory cost,
  benefits, variable pay, contractor cost, and assumptions.

### Cross-work intelligence

- **FR-PLT-031:** Build supplies authorized demand, assignment, utilization, and
  delivery-risk summaries through contracts; People retains no parallel project plan.
- **FR-PLT-032:** Staffing views combine required skill, verified skill,
  availability, schedule, leave, allocation, location/timezone, and cost only
  for authorized decision makers.
- **FR-PLT-033:** Recommendations explain constraints and alternatives and
  require confirmation in the owning product.

## 8. Responsible AI

### Allowed

- Answer policy/product questions with citations.
- Summarize authorized cases, reviews, surveys, exceptions, or reports.
- Draft documents, communications, goals, checklists, and workflow definitions.
- Suggest skills, learning, staffing, anomaly review, or report queries.
- Prefill actions and forms for explicit review and confirmation.

### Prohibited

- Autonomous hiring, rejection, termination, discipline, rating, promotion,
  compensation, payroll lock/payout, access revocation, or legal conclusion.
- Inferring protected traits, health, union status, intent, or emotion.
- Training across customer data without explicit contractual authorization.
- Retrieving fields hidden from the actor or revealing them through summaries.

### Requirements

- **FR-PLT-034:** Retrieval filters tenant, actor, scope, field policy,
  document version, effective date, and retention status before model input.
- **FR-PLT-035:** Answers cite source title/version/effective date and separate
  facts from suggestions.
- **FR-PLT-036:** Missing, contradictory, stale, or legally ambiguous sources
  trigger abstention and a safe next action.
- **FR-PLT-037:** Tool calls are allowlisted, schema-validated, previewed,
  confirmed, idempotent, audited, and executed by domain commands.
- **FR-PLT-038:** Evaluation covers correctness, citation, permission leakage,
  protected-class risk, unsafe action, abstention, override, and drift.
  It must pass the numerical release thresholds in PRD 06a.

## 9. Integrations

P0 dependency delivery/fallback is fixed by the integration matrix in PRD 06a.

- **FR-PLT-039:** Connections declare provider, purpose, scopes, owner,
  environment, credentials reference, mapped entities/fields, and source authority.
- **FR-PLT-040:** OAuth/API secrets remain in the integration vault and never
  appear in HR/payroll tables, logs, exports, or AI context.
- **FR-PLT-041:** Inbound and outbound records carry external ID, version,
  idempotency, correlation, status, attempts, last error class, and reconciliation state.
- **FR-PLT-042:** Webhooks verify signature, timestamp, replay window, tenant
  mapping, and schema version before processing.
- **FR-PLT-043:** Connection health distinguishes authorization, mapping,
  validation, provider, rate-limit, and transient errors with owner/action.
- **FR-PLT-044:** Disconnect revokes credentials and explains retained imported
  data and pending deliveries.

## 10. Privacy, Retention, and Globalization

- **FR-PLT-045:** Field classes drive encryption, access, logging, export,
  AI eligibility, retention, and residency.
- **FR-PLT-046:** Retention policies are versioned by record class,
  jurisdiction/entity, state, trigger date, duration, hold, and deletion method.
- **FR-PLT-047:** Subject export/correction is purpose-limited, identity-
  verified, third-party-redacted, auditable, and hold-aware.
- **FR-PLT-048:** Global data uses locale-neutral storage and localized display;
  no country-specific rule is embedded in the global employee model.
- **FR-PLT-049:** Country packs declare supported capabilities, effective
  rules, required fields, outputs, providers, tests, sign-off, and sunset policy.

## 11. Data, Performance, and Reliability

- Lists use stable cursor pagination, default 25/50, maximum 100.
- Search is scoped, cancellable, and indexed; analytics uses governed read models.
- Cache keys include tenant, actor/visibility fingerprint, DataScope,
  entitlement/config version, projection, filter, sort, cursor, and locale as needed.
- Private HR/payroll data never uses public/shared caching.
- Jobs have dedupe, lease, heartbeat, retry class, dead letter, replay,
  cancellation, progress, and tenant-safe logs.
- Events use outbox and idempotent consumers; network work occurs after commit.
- Backup, restore, migration, and rollback are tested against classified data.
  Numerical volume, SLO, RPO, RTO, and recovery-drill gates are defined in PRD 06a.

## 12. Required Pages

- `/hr/settings` — people configuration hub.
- `/hr/settings/fields`, `/hr/settings/forms`, `/hr/settings/policies`, `/hr/settings/workflows`,
  `/hr/settings/automations`, `/hr/settings/templates`,
  `/hr/settings/notifications`, `/hr/settings/integrations`, `/hr/settings/import-export`, `/hr/settings/versions`.
- `/hr/reports`, `/hr/analytics`, `/hr/workforce-planning`,
  `/hr/workforce-cost`, `/hr/audit`.
- `/payroll/settings`, `/payroll/reports`, `/payroll/import-export`,
  `/payroll/access`.
- Platform access, audit, integration, and AI controls reuse shared settings
  rather than creating HR-specific duplicates.

## 13. Success Measures

- authorization and tenant-isolation defect rate;
- workflow completion, reroute, SLA, and stale-action rate;
- automation dry-run accuracy, failure, retry, and rollback rate;
- import first-pass success and export completion/download rate;
- dashboard-to-drill reconciliation and metric freshness;
- integration delivery, duplicate, reconciliation, and mean recovery time;
- plan-versus-actual headcount/cost accuracy;
- AI citation, abstention, confirmed-action, override, and leak-test results.

## 14. Acceptance Criteria

- [ ] Access is enforced at tenant, entitlement, permission, scope, object, and field layers.
- [ ] A workflow definition change does not mutate in-flight instances.
- [ ] Automation dry-run has no side effects and activation preserves its reviewed version.
- [ ] Hidden fields cannot leak through search, analytics, exports, errors, or AI.
- [ ] Dashboard values reconcile to permissioned drill-through.
- [ ] Workforce scenarios cannot mutate actual worker or position state.
- [ ] Approved positions hand off to Recruitment without ATS duplication.
- [ ] Integration retry/replay is idempotent and reconcilable.
- [ ] Country rule packs are effective-dated, tested, signed off, and removable.
- [ ] AI answers cite sources, abstain safely, and cannot execute prohibited actions.
- [ ] Jobs, events, notifications, and audit share end-to-end correlation.


## Architecture hardening acceptance (2026-10-24)

The following additive acceptance belongs to [PRD 16](./16-architecture-hardening-prd.md)
and must be applied to this domain through [guide 17](./17-claude-architecture-execution.md).
Business facts, tiers and existing acceptance remain owned here. FR-ARCH identifiers
have one definition in PRD 16 and one criterion status in the
[architecture execution ledger](./architecture-review/execution-ledger.json);
this routing table does not duplicate or pre-close an implementation task.

| Requirement | Applicable architecture obligation |
|---|---|
| FR-ARCH-001 | Authorize payroll aggregates before response and cache fill |
| FR-ARCH-002 | Apply declared metric filters, periods and run-status semantics |
| FR-ARCH-003 | Use canonical department identifiers in AskOS |
| FR-ARCH-005 | Enforce access revocation and actor lifecycle across surfaces |
| FR-ARCH-008 | Unify versioned schemas and current wire contracts |
| FR-ARCH-022 | Deepen governed insights for charts, reports and drill-through |
| FR-ARCH-023 | Ground AskOS in owner reads, effective policies and current authority |
| FR-ARCH-024 | Own backend cache freshness and access-shaped keys |
| FR-ARCH-032 | Validate downloads and reauthorize export lifecycle |
