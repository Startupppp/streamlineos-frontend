# StreamlineOS India Payroll PRD
**Status:** Normative domain PRD  
**Owner:** Payroll  
**Priority:** P0 end-to-end compliant payroll  
**Geography:** India first; country-pack extension points required  
**Depends on:** Core HR, Workforce Management, Expenses, Banking/Payout Provider, Accounting  
**Legal posture:** Product requirements require payroll/legal validation before production enablement

## 1. Outcome
A payroll operator can set up an Indian legal entity, freeze approved inputs,
calculate/validate/pay, publish payslips, prepare statutory obligations,
reconcile money and filings, and trace every result to effective facts and rules.

The product must match strong India payroll competitors on processing,
compliance, self-service, and payout while leading on explainability,
exception-first operations, and connection to real workforce and work data.

## 2. Scope
### P0 — required

- One India legal entity per launched payroll with multiple establishments/registrations,
  pay groups, schedules, bank/accounting, tax, PF, ESI, PT, and LWF setup.
- Employee payroll profile, statutory identifiers, bank account verification
  state, tax regime/elections, and effective salary assignment.
- Versioned salary structures, earnings, deductions, employer contributions,
  formulas, eligibility, taxability, and accounting mappings.
- Frozen inputs from attendance, leave/LOP, WFH, overtime, approved timesheets,
  bonus, reimbursement, loan, arrear, and one-time adjustments.
- Regular payroll run with preflight, calculation, comparison, exception,
  review, approval, lock, payout, payslip, statutory, accounting, and reconciliation.
- Minimum retro, adjustment, reversal/return recovery, corrected payslip, and PRD 05b controls.
- Proration, joiner/exiter, unpaid leave, revision, arrear, retro, bonus,
  reimbursement, approved loan/advance recovery, statutory bonus, gratuity, and FnF handling.
- Indian statutory calculations and outputs for PF/EPF, ESI, Professional Tax,
  Labour Welfare Fund, salary TDS, applicable bonus and gratuity.
- Employee tax declarations, proof workflow, old/new regime or current
  statutory successor choices, projections, and year-end certificates.
- Secure bank file/manual acknowledgment or contracted payout with funding approval,
  maker-checker, status, retry, return, and reconciliation.
- Payslip and tax-document self-service with secure download.
- Payroll register, variance, statutory, payment, deduction, loan, FnF, journal, and audit reports.
- Immutable run inputs/results and complete action audit.

### P1 — complete suite

- Group/multi-entity payroll, cross-entity orchestration, and consolidated reporting.
- Advanced off-cycle scheduling, consolidated corrections, and prior-period tooling.
- Flexible Benefits Plan, perquisites, recoveries, garnishment-like configured
  deductions where legally applicable, and multiple concurrent loans.
- Contractor/professional payment runs with separate withholding and payout rules.
- Direct provider submission/payment, cross-registration consolidation,
  advanced prior-period correction orchestration, and filing-provider integration.
- Payroll funding forecast, approval calendar, cutoffs, task checklist, and
  close management.
- Accounting integrations, customizable journal templates, cost allocation,
  and reconciliation.
- Employee tax simulator, declaration/proof campaigns, YTD projection, and alerts.
- Advanced payroll-support case tooling; minimum corrected publication remains P0.
- Advanced source adapters, phased group cutovers, and extended history migration.

### P2 — differentiators

- Explainable payroll diff showing exactly which source fact, rule version, and
  formula changed net pay.
- Anomaly detection for unusual earnings/deductions, missing components,
  duplicate payments, unexpected net variance, statutory mismatch, and bank risk.
- Payroll-readiness score based on actual unresolved inputs, not a black-box score.
- Project/customer/cost-center labor-cost allocation using approved work facts.
- Cash requirement and payout timing connected to authorized finance planning.
- Permission-grounded “explain my payslip” for employees with citations to
  their own components and published policy.

### P3 / country packs

- Additional country-native tax, social security, filing, payment, and year-end
  packs under the same engine contracts.
- Multi-country consolidated payroll with native, managed, and connected
  provider models clearly distinguished.

### Partner-dependent

- Direct government-portal filing or payment.
- Bank account verification, salary disbursal rails, UPI/NEFT/RTGS/NACH
  execution, and return data.
- Digital signature, TRACES, licensed tax utilities, managed payroll, and regulated advisory.

### Out of scope

- Claiming statutory filing/payment completion without provider acknowledgment.
- Native payroll for an unapproved country.
- Banking, lending, insurance, tax advice, accounting books, EOR, or PEO.
- Recruitment offer calculation beyond an approved compensation handoff.

## 3. Product Boundaries
| Concern | Owner |
|---|---|
| Employment, entity, job, location, worker status | Core HR |
| Attendance, leave/LOP, WFH, overtime, work hours | Workforce Management |
| Expense claim and approval | Expenses |
| Frozen period input and all pay calculation | Payroll |
| Reimbursement payment | Payroll or configured payout provider |
| Exit initiation and last-working-day intent | Core HR |
| FnF monetary settlement | Payroll |
| Money movement | Approved bank/payout provider |
| Accounting books | Accounting; Payroll emits journals |
| Statutory law interpretation | Versioned country pack with legal/payroll sign-off |

Payroll snapshots consumed source facts. It never silently rereads mutable HR
rows after calculation or lock.

## 4. Payroll State Model
- Period is a derived rollup, not a second mutable run: `UPCOMING → INPUT_OPEN →
  INPUT_CUTOFF → PROCESSING → APPROVAL → LOCKED → PAYMENT_PENDING → PAID →
  STATUTORY_PENDING → RECONCILED → CLOSED`.
- Run: `DRAFT → CALCULATING → READY_FOR_REVIEW | FAILED → APPROVED → LOCKED →
  PAYOUT_PENDING → PARTIALLY_PAID | PAID → RECONCILING → CLOSED`.
- Statutory obligation/payment/return/artifact/acknowledgment/correction use
  independent linked records defined in PRDs 05a and 05c.

Reopen after lock requires elevated approval, reason, impact preview, and a new
version. Paid results use reversal/adjustment. Filed/paid states require
external or approved manual evidence, not report generation.

## 5. Functional Requirements

### Setup and migration

- **FR-PAY-001:** Setup wizard creates legal entity payroll settings, pay
  groups, calendar, cutoffs, bank/payout profile, chart-of-account mapping, and
  statutory registrations through explicit review steps.
- **FR-PAY-002:** Readiness checks identify missing entity, registration,
  employee, bank, salary, tax, opening balance, input, or approval facts.
- **FR-PAY-003:** Imports use mapping, validation, preview, duplicate detection,
  totals reconciliation, commit, and correction; templates are versioned.
- **FR-PAY-004:** Migration supports employee opening balances, YTD earnings/
  deductions/tax, loans, leave encashment basis, prior payslips, and audit provenance.
- **FR-PAY-005:** Parallel run compares legacy and StreamlineOS totals and
  employee deltas with signed acceptance before cutover.

### Payroll profile and salary structures

- **FR-PAY-006:** Payroll profile references employment and contains only
  pay-specific facts: pay group, salary assignment, payment method, verified
  bank token/reference, statutory IDs, tax elections, and exemptions.
- **FR-PAY-007:** Salary structures and components are effective-dated and
  immutable after use; edits create a new version.
- **FR-PAY-008:** Components declare earning/deduction/contribution/reimbursement,
  recurring/one-time, taxable treatment, statutory inclusion, proration,
  rounding, formula, limits, display, and accounting code.
- **FR-PAY-009:** Money uses fixed decimal precision and currency; formulas are
  deterministic, validated, dependency-ordered, cycle-safe, and sandboxed.
- **FR-PAY-010:** CTC, gross, taxable income, deductions, employer cost, and net
  pay remain distinct quantities.

### Inputs and cutoffs

- **FR-PAY-011:** Input build freezes source IDs, values, policy versions,
  approvals, build version, checksum, and warnings from versioned employment,
  compensation, time, expense, benefit, loan, award, and asset packages per employment/period.
- **FR-PAY-012:** Operators can compare input versions and accept/reject
  authorized adjustments before cutoff.
- **FR-PAY-013:** WFH approved as paid presence does not create LOP; leave and
  attendance quantities retain independent source semantics.
- **FR-PAY-014:** Timesheet hours are priced by Payroll using the effective
  assignment; handoff hours cannot carry an ungoverned rate.
- **FR-PAY-015:** Post-lock source changes create a next-period retro,
  supplemental adjustment, or governed reopen request under PRD 05b.

### Calculation and run operations

- **FR-PAY-016:** Calculation is reproducible from run version, worker facts,
  salary/component versions, frozen inputs, country-rule version, and formula engine version.
- **FR-PAY-017:** Preflight blocks calculation for missing critical facts and
  reports employee, reason, owner, and recovery action.
- **FR-PAY-018:** Run review shows control totals, prior-period comparison,
  joiners/exits, zero/negative net, predeclared absolute/percentage variance,
  exceptions, and changes since last calculation.
- **FR-PAY-019:** Authorized overrides require component, amount, reason,
  evidence when policy requires, approver, and treatment; original result remains visible.
- **FR-PAY-020:** Recalculate invalidates prior draft results but never silently
  changes a locked or paid result.
- **FR-PAY-021:** Approval and lock are separate permissions. Maker-checker is
  required for configured entity/risk thresholds.
- **FR-PAY-022:** Run actions are idempotent and concurrency-safe; duplicate
  clicks/jobs cannot duplicate results, payout, payslip, or filing records.
  Expected-version approval/lock and irreversible boundaries follow PRD 05b.

### India statutory compliance

[Statutory PRD 05a](./05a-india-payroll-statutory-prd.md) owns PF/ESI/PT/LWF/TDS,
forms, gratuity/bonus/wage effects, obligations, rules, evidence, and legal sign-off.
[Controls PRD 05b](./05b-india-payroll-controls-edge-cases-prd.md) owns segmentation,
proration, insufficient net, concurrency, corrections, payout, accounting, close, and resilience.
[Transition tables PRD 05c](./05c-payroll-statutory-transition-tables-prd.md) owns the IDs.

### Employee tax and self-service

- **FR-PAY-023:** Employees can choose permitted tax regime/elections, submit
  declarations/proofs, see review status, and compare projected impact.
- **FR-PAY-024:** Tax projection explains assumptions and is labeled an
  estimate until payroll closes.
- **FR-PAY-025:** Employees can view/download payslips, YTD summary, tax
  worksheet, the applicable officially issued Form 130 or legacy Form 16 by
  governing period, reimbursement state, loan schedule, and FnF statement.
  An internal tax worksheet or preview is labeled non-statutory; it cannot be
  presented as an issued Form 130. Retrieval and issue follow FR-STAT-027–028.
- **FR-PAY-026:** Payslip correction creates a new publication version and
  retains prior publication/audit according to policy.

### Loans, bonuses, reimbursements, retro, and FnF

- **FR-PAY-027:** P0 consumes approved/opening loan schedules for EMI, balance,
  recovery, and exit; P1 owns origination, interest, reschedule, foreclosure, and UI.
- **FR-PAY-028:** P0 consumes approved `OneTimeAward`, validates period/treatment,
  and separates recurring pay; Rewards owns P1 eligibility, budget, and program administration.
- **FR-PAY-029:** Retro calculation identifies changed effective fact, impacted
  periods/components, prior result, delta, tax/statutory treatment, and settlement run.
- **FR-PAY-030:** FnF includes earnings, LOP, leave encashment, gratuity where
  applicable, bonus/incentive, reimbursements, loan/asset recovery, notice,
  tax, payout, statement, approval, and reconciliation. Asset deduction requires
  acknowledged `ApprovedAssetRecovery`, never custody status alone.

### Contractor payments

- **FR-PAY-031:** Contractor profiles and runs are distinct from employee
  payroll while sharing controlled payout and reporting infrastructure.
- **FR-PAY-032:** Contractor payment supports invoice/work reference,
  withholding rule, deduction, payout, certificate/report, and reconciliation.
- **FR-PAY-033:** Worker classification is an HR/legal decision and cannot be
  inferred or changed by the payroll engine.

### Payout and reconciliation

- **FR-PAY-034:** Payout batch uses locked run results, verified beneficiary
  references, funding account, maker-checker, idempotency key, and control total.
- **FR-PAY-035:** Provider states map to created, submitted, processing,
  succeeded, failed, returned, canceled, or unknown; unknown requires reconciliation.
- **FR-PAY-036:** Partial failure is visible per payment and supports safe retry
  without repaying successful beneficiaries.
- **FR-PAY-037:** Payroll total, payout total, bank acknowledgment, returned
  funds, and accounting journal must reconcile before close.

### Accounting and reporting

- **FR-PAY-038:** Journal rules map component/employer cost by entity,
  department, cost center, project/customer where authorized, and payable account.
- **FR-PAY-039:** Journal export is versioned, balanced, traceable, and
  acknowledged by Accounting; Payroll does not post directly without a contract.
- **FR-PAY-040:** Reports use the same locked run facts as payslips and
  statutory outputs and support audited export jobs.

## 6. Required Pages

- Command and setup: `/payroll` (includes calendar) and `/payroll/setup`.
- People/configuration: `/payroll/employees` plus detail, `/payroll/structures`, `/payroll/components`, `/payroll/pay-groups`.
- Operations: `/payroll/inputs`, `/payroll/runs` plus detail, `/payroll/payouts`, `/payroll/payslips`.
- Pay programs: `/payroll/tax-declarations`, `/payroll/loans`, `/payroll/bonuses`,
  `/payroll/reimbursements`, `/payroll/contractors`, `/payroll/fnf`, `/payroll/statutory`.
- Control: `/payroll/reports`, `/payroll/accounting`, `/payroll/access`, `/payroll/settings`, `/payroll/import-export`.
- Self/manager: `/me/pay`; amount-safe `/me/team/payroll`.

## 7. UX Requirements

- Command center shows blockers, changes, owners, due work, funding, and safe
  next action; run tabs cover inputs through reconciliation and versions.
- Every employee result has an explanation tree and prior-period diff.
- High-impact confirmation states entity, period, employees, amount,
  consequence, and recovery.
- Tables are keyboard-accessible and responsive; state never relies on color.
- `/me/pay` never requires payroll-admin permission.

## 8. Security and Reliability

- Bank/tax IDs are encrypted/tokenized and excluded from logs, analytics, AI,
  and general search; object/field authorization prevents IDOR.
- Payout and sensitive settings require step-up where supported.
- Calculation jobs are deterministic, retry-safe, resumable, and run-version isolated.
- Provider work uses durable intent, verified callbacks, dedupe, retry, dead
  letter, and reconciliation.
- Statutory completion requires rule version, sign-off, and acknowledgment.

## 9. Success Measures

- first-pass accuracy, input readiness, exception age, and explained variance;
- post-lock adjustments, over/underpayment, and payroll close effort;
- payout success, return, retry, and reconciliation time;
- statutory obligations acknowledged by deadline and self-service containment;
- parallel-run variance and time to first successful payroll.

## 10. Acceptance Criteria

- [ ] Setup-to-first-payroll journey completes for one India legal entity.
- [ ] Run results reproduce exactly from frozen facts and rule versions.
- [ ] Joiner, exiter, LOP, WFH, overtime, revision, arrear, bonus, loan,
      reimbursement, gratuity, and FnF fixtures pass reviewed calculations.
- [ ] All P0 criteria in the India Payroll Statutory Compliance PRD pass.
- [ ] Lock, payout, payslip publication, and filing generation are idempotent.
- [ ] Partial payout retry cannot duplicate successful payments.
- [ ] Employee payslip access is actor-bound and cross-tenant safe.
- [ ] Accounting journal balances and traces to components and run version.
- [ ] Paid payroll is corrected by governed adjustment/reversal, not destructive edit.
- [ ] No partner-dependent payment or filing is shown as complete without acknowledgment.
