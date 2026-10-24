# StreamlineOS People + Payroll Implementation and Migration Cockpit PRD

**Status:** Normative product PRD  
**Owner:** People Platform + Customer Implementation  
**Priority:** P0 for payroll cutover; P1 reusable implementation product  
**Depends on:** Core HR, Payroll, Build, Imports, Workflow, Audit, Integrations

## 1. Outcome

A customer can move from spreadsheets or another HR/payroll system into
StreamlineOS through a visible, testable, reconciled implementation project.
Configuration, mappings, imports, parallel payroll, decisions, evidence, and
cutover gates live in one cockpit instead of consultant-owned files.

## 2. Why This Is a Product

Implementation quality determines payroll and HR trust. A feature-complete
system still fails when source data, policy configuration, opening balances,
employee identity, or cutover ownership is wrong.

StreamlineOS can be structurally better because the implementation project can
use native Build tasks, documents, chat, mail, calendar, approvals, and audit
while the cockpit provides HR/payroll-specific validation and reconciliation.

## 3. Scope

### P0 — required

- Guided organization, HR, time/leave, access, and India payroll readiness plan.
- Source-system inventory, owner, extraction method, cutoff, and retention plan.
- Versioned field/entity mapping and transformation rules.
- Staging, normalization, validation, duplicate/reference resolution, preview,
  control totals, approval, idempotent commit, and row-level results.
- Employee, employment, reporting line, compensation, leave balance,
  attendance opening, loan, tax/YTD, and payroll history migration.
- Configuration validation for entities, registrations, calendars, policies,
  salary structures, statutory rules, bank, accounting, roles, and workflows.
- At least two reconciled parallel payroll cycles unless no comparable legacy
  cycle exists and payroll/legal approve an evidence-backed validation plan.
- Go/no-go checklist, maker-checker sign-off, backup, rollback rehearsal,
  cutover, and stabilization.
- Immutable evidence linking source extract through target record and payroll result.

### P1 — complete implementation product

- Reusable implementation templates by company size, industry, country pack,
  worker type, and source product.
- Read-only source connectors and repeatable delta extracts.
- Guided policy/configuration workshops with decisions and owners.
- Automated mapping suggestions that require review.
- Environment promotion for approved configuration and mappings.
- Phased legal-entity, population, module, or pay-group cutover.
- Support handoff, adoption, training, data-quality, and post-launch health.
- Customer-facing progress, blockers, decisions, risk, and readiness views.

### P2 — differentiators

- Automated variance classification with likely source, owner, and fix.
- Migration digital twin that predicts downstream payroll, access, workflow,
  reporting, and integration impact.
- Natural-language mapping/configuration draft into a reviewed explicit model.
- Benchmark-based readiness recommendations without changing configuration.
- Reusable migration adapters and country-pack certification suites.

### Out of scope

- Unapproved write access to the legacy system.
- Opaque consultant-only transformations.
- Auto-correcting pay, tax, bank, identity, or employment facts without review.
- Declaring a customer live solely because data imported or a run calculated.

### Delivery model

- Cockpit, mapping/versioning, validation, reconciliation, evidence, gates,
  and Build links are **native**.
- Source connectors are **connected** and certified individually.
- Extraction, mapping decisions, workshops, correction, sign-off, and cutover
  ownership are **customer-operated** or **managed service** per contract.
- Product copy never implies implementation labor is included because the
  cockpit is native.

## 4. Implementation State Model

`DISCOVERY → DESIGN → CONFIGURE → MIGRATE → VALIDATE → PARALLEL_RUN →
CUTOVER_READY → CUTOVER → STABILIZE → HANDOFF → COMPLETE`

Each stage has entry criteria, required evidence, accountable owner, blockers,
approved exceptions, and exit sign-off. A project may return to an earlier
stage without deleting prior evidence.

## 5. Functional Requirements

### Project and readiness

- **FR-IMP-001:** Create a native Build implementation project from a People/
  Payroll template while the cockpit remains the authority for domain checks.
- **FR-IMP-002:** The plan declares scope, entities, populations, modules,
  source systems, environments, target dates, blackout windows, owners, and risks.
- **FR-IMP-003:** Readiness is evidence-based by criterion; one opaque
  percentage cannot hide a payroll-blocking failure.
- **FR-IMP-004:** Blockers identify domain, severity, affected records,
  accountable owner, due date, recovery action, and linked task.
- **FR-IMP-005:** Every decision records options, rationale, approvers,
  effective scope, and affected configuration.

### Source discovery and extraction

- **FR-IMP-006:** Inventory each source's entities, field owners, identifiers,
  extracts/APIs, data period, encryption, quality, and retention/deletion plan.
- **FR-IMP-007:** Source connectors are read-only, scoped, credential-vaulted,
  rate-limited, and auditable.
- **FR-IMP-008:** Every extract records source, query/version, timestamp,
  row count, control totals, hash, and encrypted storage reference.
- **FR-IMP-009:** Delta extracts distinguish insert, update, delete/close, and
  unchanged records using stable source identity.

### Mapping and transformation

- **FR-IMP-010:** Mapping is versioned by source entity/field, target owner,
  type, transform, default, lookup, requiredness, classification, and approver.
- **FR-IMP-011:** Transforms use a safe typed expression catalog; arbitrary
  executable scripts are prohibited.
- **FR-IMP-012:** AI may suggest mappings with explanation/confidence but cannot
  publish or apply them.
- **FR-IMP-013:** Reference mapping handles entity, location, department, job,
  manager, employee, component, policy, and statutory identifiers.
- **FR-IMP-014:** Unmapped, lossy, conflicting, or many-to-one mappings are
  explicit blockers or approved exceptions.

### Data migration

- **FR-IMP-015:** Every migration uses stage → normalize → validate → preview →
  approve → commit → reconcile → result.
- **FR-IMP-016:** Validation includes schema, requiredness, uniqueness,
  references, tenant, effective intervals, lifecycle state, and domain invariants.
- **FR-IMP-017:** Duplicate-person resolution never merges workers automatically
  from name/email similarity alone.
- **FR-IMP-018:** Commit is idempotent and dependency ordered; partial results
  retain exact accepted/rejected rows and safe retry.
- **FR-IMP-019:** Target records retain source-system lineage without exposing
  legacy sensitive identifiers broadly.
- **FR-IMP-020:** Rollback is domain-approved: reversals/closures preserve
  audit and do not delete facts already used by payroll or downstream actions.

### India payroll migration

- **FR-IMP-021:** Import pay profiles, salary versions, YTD earnings/
  deductions/tax, prior-employment income, loans, declarations/proofs,
  statutory references, opening balances, and prior payslips as applicable.
  Opening/YTD values are keyed by person, employment, entity, registration,
  component/rule, tax year, source period, sign, currency, and last-paid date;
  aggregate-only balances cannot pass.
- **FR-IMP-022:** Payroll migration control totals reconcile employee count,
  gross, taxable income, employee/employer deductions, tax, net, and employer cost.
- **FR-IMP-023:** Historical artifacts retain their applicable law/form names;
  legacy Form 16/24Q is not globally renamed to Form 130/138.
- **FR-IMP-024:** A mid-year cutover validates remaining-period projections and
  prior deductions before the first production run.
- **FR-IMP-025:** Bank and statutory identifiers use masked comparison and
  separate authorized sign-off.

### Configuration assurance

- **FR-IMP-026:** Configuration snapshots include entity, policy, workflow,
  access, salary, statutory, bank, accounting, integration, and notification versions.
- **FR-IMP-027:** Promotion shows source/target diff, dependency validation,
  approver, environment, and rollback reference.
- **FR-IMP-028:** Production secrets, provider IDs, and bank credentials are
  never copied from test; they are configured through approved secure flows.
- **FR-IMP-029:** Sandbox simulations use de-identified or explicitly approved
  data and cannot trigger real notification, payout, filing, or external mutation.

### Parallel payroll and reconciliation

- **FR-IMP-030:** Parallel runs compare employee and total results by component,
  statutory value, employer cost, net pay, payout, and journal.
- **FR-IMP-031:** Every variance is classified as expected policy difference,
  source-data issue, mapping issue, configuration issue, calculation defect, or unknown.
- **FR-IMP-032:** Expected differences require documented rationale and approval;
  unexplained differences block cutover.
- **FR-IMP-033:** Correction reruns preserve previous comparison versions and
  show whether the variance closed or moved.
- **FR-IMP-034:** Cutover thresholds are defined before the parallel run and
  cannot be weakened without named risk approval and audit.

### Cutover, rollback, and stabilization

- **FR-IMP-035:** Go/no-go checks identity, scope, access, data quality,
  configuration, integrations, payroll, payout, statutory, accounting,
  support, backup, rollback, and communication.
- **FR-IMP-036:** Cutover freezes legacy writes or defines controlled delta
  capture; the same business fact cannot be actively written in both systems.
- **FR-IMP-037:** Rollback identifies trigger, authority, target recovery point,
  data disposition, payroll/payment consequences, communications, and rehearsal.
  It is allowed only before the declared irreversible boundary. After payslip
  publication, payout/journal submission, statutory payment/filing, or access
  execution, recovery is forward-only through cancellation, reversal,
  correction, supersession, and reconciliation.
- **FR-IMP-038:** Stabilization tracks first live cycles, data corrections,
  support volume, integration errors, reconciliation, adoption, and residual risk.
- **FR-IMP-039:** Completion requires operational ownership, runbooks,
  dashboards, support content, access review, and signed handoff.

## 6. Required Pages

- `/implementation` — portfolio, templates, progress, blockers, risks.
- `/implementation/[projectId]` — plan, stages, owners, gates, evidence.
- `/implementation/[projectId]/sources` — source inventory and extracts.
- `/implementation/[projectId]/mappings` — mapping, transforms, versions, approvals.
- `/implementation/[projectId]/migrations` — runs, errors, control totals, lineage.
- `/implementation/[projectId]/configuration` — readiness and environment diffs.
- `/implementation/[projectId]/parallel-payroll` — variance and reconciliation.
- `/implementation/[projectId]/cutover` — go/no-go, rollback, communication.
- `/implementation/[projectId]/stabilization` — live health and handoff.

These are implementation-admin surfaces, not normal HR or Payroll navigation.
Canonical visibility and implementation specialist roles are defined in
[PRD 07](./07-pages-navigation-roles-prd.md).

## 7. Record Disposition Matrix

Discovery assigns every source class one disposition:

| Disposition | Meaning |
|---|---|
| Migrate | Transform into a supported canonical record with lineage |
| Archive-link | Retain in approved archive and expose an authorized link |
| Summary-only | Import signed totals/summary where row history is unnecessary |
| Recreate | Create approved current state; retain legacy evidence separately |
| Do not migrate | Record reason, retention, access, and owner |

The matrix covers person/employment/org/compensation, documents/signatures,
policy acknowledgments, time/leave/schedules, expenses/assets references,
goals/reviews/skills/learning, requests/restricted cases, payroll/results/
forms, audit, integrations, and configuration. Legal hold, retention,
third-party privacy, evidentiary integrity, and future subject access apply to
all dispositions.

## 8. Security and Privacy

- Source access is least-privilege, read-only where possible, time-bounded, and
  revoked after handoff.
- Extracts and migration files are encrypted, malware-scanned, access-logged,
  region-controlled, and deleted by an explicit retention schedule.
- Production data is never copied to development without approved de-identification.
- Payroll/bank/tax identity validation uses dual control and masked evidence.
- Customer and implementation staff access expires automatically and is reviewed.

## 9. Success Measures

- time from kickoff to verified first live payroll;
- migration first-pass success and unresolved error age;
- mapped fields and records with signed lineage/control totals;
- parallel-run variance by class and cycles to agreed threshold;
- cutover rollback-readiness and first-live-cycle correction rate;
- stabilization support volume, integration failures, and time to handoff;
- customer-owned configuration and runbook completion.

## 10. Acceptance Criteria

- [ ] Every source, mapping, transform, import, configuration, and decision is versioned.
- [ ] Migration commits are idempotent and preserve row-level results and lineage.
- [ ] Effective-dated employment and pay history remains non-overlapping.
- [ ] Payroll opening/YTD values reconcile to signed control totals.
- [ ] Every source record class has an approved disposition, retention, access,
      and legal-hold treatment.
- [ ] At least two parallel cycles reconcile to pre-approved thresholds, or
      payroll/legal sign an evidence-backed plan where no comparison is possible.
- [ ] Every remaining variance has an owner, classification, and disposition.
- [ ] Cutover blocks on unexplained pay, statutory, payout, accounting, or access risk.
- [ ] Rollback has been rehearsed in a named environment.
- [ ] Post-irreversible recovery uses linked forward correction and reconciliation.
- [ ] First production payroll, payout, statutory, and accounting results reconcile.
- [ ] Temporary source/customer-implementation access is revoked at handoff.
- [ ] Build project tasks and cockpit gates link bidirectionally without
      duplicating authority.


## Architecture hardening acceptance (2026-10-24)

The following additive acceptance belongs to [PRD 16](./16-architecture-hardening-prd.md)
and must be applied to this domain through [guide 17](./17-claude-architecture-execution.md).
Business facts, tiers and existing acceptance remain owned here. FR-ARCH identifiers
have one definition in PRD 16 and one criterion status in the
[architecture execution ledger](./architecture-review/execution-ledger.json);
this routing table does not duplicate or pre-close an implementation task.

| Requirement | Applicable architecture obligation |
|---|---|
| FR-ARCH-036 | Migrate by expand, reconcile, enforce and retire |
