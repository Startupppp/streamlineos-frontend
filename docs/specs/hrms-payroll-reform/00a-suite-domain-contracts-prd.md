# StreamlineOS People + Payroll Domain Contracts PRD

**Status:** Normative suite contract  
**Owner:** People Architecture Council  
**Priority:** P0  
**Parent:** [Suite Product PRD](./00-suite-product-prd.md)  
**Applies to:** Every People, Payroll, implementation, API, event, page, and report

## 1. Purpose and Precedence

This PRD resolves ownership, terminology, tier, and cross-domain handoff
ambiguity. Domain PRDs own business behavior; this contract wins when two
domain PRDs appear to own the same mutable fact or command.

Normative documents are PRDs 00, 00a–00c, 01–07, 05a–05c, 06a, 07a–07c,
08, 09, and the [architecture hardening addendum 16](./16-architecture-hardening-prd.md).
PRD 16 owns additive FR-ARCH identifiers and preserves the fact ownership here;
[guide 17](./17-claude-architecture-execution.md) governs their implementation process.
[Competitor Benchmark PRD 08a](./08a-competitor-benchmark-prd.md) is dated
evidence only and cannot add scope without a normative requirement.

## 2. Canonical Terms and Identifiers

| Term | Meaning | Stable identifier |
|---|---|---|
| Person | Human identity, potentially shared across organizations | `personId` |
| Membership | Person's access/discovery relationship with one tenant | `membershipId` |
| Worker | Tenant-scoped person participating in work | `workerId` |
| Engagement | Employee, contractor, intern, or other relationship | `engagementId` |
| Employment | Legal-employer relationship for an employee | `employmentId` |
| Position | Approved seat with budget, job, entity, and status | `positionId` |
| Payroll profile | Pay-specific settings for one employment/pay group | `payrollProfileId` |
| Payroll result | Immutable employment/run-version calculation | `payrollResultId` |

- A worker route uses `workerId`; an employment/payroll route uses the relevant
  `employmentId` or `payrollProfileId`, even when a compatibility URL says
  `employeeId`.
- A person may have concurrent engagements and employments. No API may assume
  `personId`, `workerId`, and `employmentId` are interchangeable.
- “Employee” is UI language for an employee engagement, not the canonical
  aggregate name.

## 3. Canonical Command and Fact Ownership

| Fact or command | Sole owner | Consumers / boundary |
|---|---|---|
| Person identity and tenant membership | Directory | Core references IDs |
| Legal entity, unit, department, location, team, cost center | Organization | Core stores effective assignments |
| Worker, engagement, employment, reporting line | Core HR | All domains read `EmploymentFacts` |
| Job, level, competency baseline, position inventory | Core HR | Planning proposes; Core creates/changes |
| Approved effective recurring compensation | Core HR | Rewards commands after approval; Payroll snapshots |
| Compensation cycle, recommendation, budget, decision | Rewards | Approved decision references Core fact version |
| Attendance/leave/shift/overtime approved quantities | Workforce | Payroll consumes versioned `TimeInputPackage` |
| Expense claim, receipt, policy, approval | Expenses | Payroll consumes `ApprovedReimbursement` |
| Cross-source frozen payroll input | Payroll | Source packages are immutable references |
| Gross-to-net, statutory, payout, payslip, FnF | Payroll | HR reads status only |
| Accounting books and posted journal | Accounting | Payroll emits/receives journal status |
| Credentials, sessions, authentication factors | Identity | HR emits approved lifecycle request |
| Lifecycle state and domain task requirements | Core HR | Experience owns journey UX; Platform executes |
| Workflow/form/custom-field/policy primitives | People Platform | Domains own semantics and commands |
| People policy content, audience, acknowledgment | Core HR | Platform versions/stores primitive |
| Project/task time and project plans | Build | Workforce reads approved summaries |
| Calendar events | Calendar | Domains own holiday/payroll/compliance schedules |
| Candidate pipeline and accepted-hire source | Recruitment | Boundary contract only |

No consumer may create a second mutable copy. Projections include owner,
source ID, source version, observed-at time, and reconciliation state.

## 4. Locked Priority Decisions

These decisions resolve conflicts elsewhere:

### P0

- Global, country-neutral HR records for one or more legal entities; India
  payroll may launch one legal entity at a time.
- Multiple establishments and statutory registrations within the launched
  India legal entity.
- Minimum job, level, competency, salary-band reference, approved position,
  and Recruitment handoff models.
- Typed worker custom fields, policy acknowledgment, standard workflows/forms,
  imports/exports, and safe dry-run/test mode.
- Basic assigned shifts and overtime capture needed by payroll; roster
  optimization, swaps, comp-off depth, and device fleet management remain P1.
- Asset custody visibility and exit-check integration; inventory/procurement/
  repair/depreciation depth remains P1.
- Legal-hold placement/release for governed record classes.
- Minimum retro, supplemental adjustment, reversal, and corrected-publication
  paths needed to recover a paid or locked payroll.
- Consume approved/opening loan schedules, award inputs, and benefit deductions;
  origination/program administration remains P1.
- Secure bank-advice/file/manual-evidence payout fallback; direct money
  movement remains partner-dependent.

### P1

- Group/consolidated multi-entity India payroll, advanced cross-entity
  transfer orchestration, customer-isolated sandbox, configurable builders,
  planning scenarios, and advanced workflow/report design.
- Full scheduling, clock-device operations, travel/asset depth, talent/
  learning/benefits/equity depth, implementation adapter catalog, and
  direct provider integrations.
- Contractor payment/withholding/Form 140 workflow and advanced loan/bonus administration.

### P2/P3

- Intelligence never precedes its P0 facts, controls, and evaluation evidence.
- Additional country-native payroll is P3 until its country pack is signed off.

If a P0 requirement depends on a P1 feature, the minimum dependency subset is
P0. A later-tier label cannot waive an earlier-tier acceptance criterion.

## 5. P0 Cross-Domain Contract Registry

| Contract | Producer → consumer | Required behavior |
|---|---|---|
| `OrganizationProvisioned` | Organization → Core/Payroll | entity IDs, hierarchy versions, inactivation and readiness |
| `PositionAuthorization` | Core → Recruitment | canonical position/version; Planning supplies approved decision reference |
| `AcceptedHire` | Recruitment → Core | versioned payload, ack/reject, update/rescind, duplicate and replay handling |
| `EmploymentFacts` | Core → all | effective slices, source version, concurrent-employment-safe |
| `InitialCompensationApproval` | Core internal command | accepted-offer evidence, authorized HR decision, value/currency/period/effective date |
| `CompensationAssignment` | Core → Payroll | approved value, currency, period, effective interval, decision reference |
| `OneTimeAward` | Rewards → Payroll | approval, eligibility/period, amount, treatment inputs, void/supersession |
| `BenefitDeductionInstruction` | Rewards → Payroll | election/version, interval, employee/employer amounts, frequency, refund/retro/termination |
| `TimeInputPackage` | Workforce → Payroll | source watermark, quantities, approvals, version, checksum, late facts |
| `ApprovedReimbursement` | Expenses → Payroll | claim version, amount/currency, tax treatment input, void/reversal |
| `ApprovedAssetRecovery` | Workforce → Payroll | amount/evidence, notice/dispute, legal validation, approval/waiver, void/supersession |
| `PayrollInputSnapshot` | Payroll internal | all source versions, cutoff, rebuild, lock, adjustment lineage |
| `AccessLifecycleRequest` | Core → Identity | requested state, due time, ack/failure/retry/reconciliation |
| `PayrollJournal` | Payroll → Accounting | balanced version, status, ack/reject, reversal/replacement |
| `PaymentIntent` | Payroll → provider/bank | beneficiary version, amount, idempotency, callback order, reconciliation |
| `CalendarEventProjection` | domain → Calendar | visibility-safe event, update/cancel, source deep link |
| `ImplementationTaskLink` | Cockpit ↔ Build | authority, status mapping, evidence link, no duplicate gate state |

Every contract declares schema version, tenant, aggregate/version, actor or
service authority, effective time, idempotency key, correlation, acknowledgment
SLO, retry class, reconciliation query, and owner.

## 6. State-Machine Contract

Arrow diagrams are summaries; the
[Transition Contracts PRD](./00b-lifecycle-transition-contracts-prd.md) and
[Payroll Transition Tables PRD](./05c-payroll-statutory-transition-tables-prd.md)
provide the versioned transition tables with:

- source, target, command, allowed actor/permission, and guard;
- required evidence, expected aggregate version, idempotency behavior;
- emitted event, downstream invalidation, cancellation/expiry path;
- reversible boundary, compensating action, and terminal-state meaning.

Unknown external outcomes never transition to success. Reopen cannot invalidate
an external payment, filing, posted journal, or published document; those use a
linked cancellation, reversal, correction, supersession, and reconciliation.

## 7. Global HR Support Contract

“Global HRMS” means:

- Unicode identity/name/address data, ISO country/currency/timezone, locale-aware
  display, organization calendars, multi-entity records, and country-neutral APIs;
- workers and contractors may be recorded in any country;
- UI languages, data regions, right-to-work packs, benefits, and local employment
  compliance are supported only when listed in the release capability matrix;
- only approved country packs may claim native statutory or payroll compliance.

Launch material must state tested UI locales, data regions, country packs,
providers, and excluded local compliance. “Global” never means every-country
legal compliance.

## 8. Requirement and Page Traceability

- Every requirement inherits the earliest tier of the capability it enables.
- Every canonical page maps to one owner, tier, entitlement, permission,
  DataScope, read model, primary commands, state model, and acceptance test.
- Every P0/P1 requirement maps to at least one automated test or named manual
  evidence item in the release traceability ledger.
- Waivers name affected requirement/test, customer impact, risk owner,
  compensating control, environment, fixed revision, and expiry.

## 9. Acceptance Criteria

- [ ] No mutable fact or command has more than one owner.
- [ ] Concurrent person/worker/employment IDs are never conflated.
- [ ] Every P0 cross-domain contract proves replay, duplicate, rejection,
      update/rescind where relevant, and reconciliation.
- [ ] P0 capabilities have no unresolved P1 dependency.
- [ ] Global HR claims match the published release capability matrix.
- [ ] Every state transition and page is traceable to permission and evidence.
