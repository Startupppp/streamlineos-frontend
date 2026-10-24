# StreamlineOS India Payroll Controls and Edge Cases PRD

**Status:** Normative child PRD  
**Owner:** Payroll  
**Priority:** P0  
**Parent:** [India Payroll PRD](./05-india-payroll-prd.md)  
**Legal posture:** Payroll/legal/finance/security sign-off applies by requirement

## 1. Outcome

India payroll remains deterministic and recoverable when employments overlap,
facts change mid-period, net pay is insufficient, operators act concurrently,
or payment/accounting/provider work partially succeeds.

## 2. P0 Control Scope

- employment/result segmentation and person-level statutory aggregation;
- explicit proration, rounding, insufficient-net, and deceased-worker handling;
- one cross-source input freeze, cutoff, late-input, rebuild, and lock contract;
- minimum retro, supplemental adjustment, reversal, and correction run types;
- version-safe approval/lock and downstream supersession;
- bank-change and payout fraud controls;
- accounting reversal/replacement and signed payroll close;
- cutoff-aware provider outage, disaster recovery, and manual contingency.

## 3. Employment and Period Segmentation

- **FR-PCTL-001:** Every calculation and result is keyed to `employmentId`,
  `payrollProfileId`, pay group, legal entity, establishment/registration,
  period, and run version.
- **FR-PCTL-002:** A person-level tax/statutory ledger defines when concurrent
  employments aggregate or remain separate by legal employer, registration,
  tax identity, worker class, and signed rule version.
- **FR-PCTL-003:** Duplicate identifiers across employments trigger review;
  deduplication never merges employment results or payout instructions silently.
- **FR-PCTL-004:** Mid-period entity, establishment, registration, pay-group,
  location/state, cost-center, salary, or worker-status change creates
  deterministic effective-date slices.
- **FR-PCTL-005:** Slice rules define inclusive dates, legal employer, payable
  days, component/rule versions, rounding residual owner, journal dimensions,
  statutory allocation, and one-versus-multiple payslip behavior.
- **FR-PCTL-006:** Cross-entity transfers close one employment/payroll profile
  and open another; no result is attributed to two employers.

## 4. Proration, Rounding, and Insufficient Net

- **FR-PCTL-007:** A versioned proration policy declares denominator
  (calendar, working, fixed, or payable days), inclusive-date rule, join/exit/
  leave/revision treatment, component eligibility, leap/month handling, and
  residual rounding.
- **FR-PCTL-008:** Formula and component rounding order is explicit; employee,
  aggregate, statutory, payout, and journal totals reconcile to signed tolerance.
- **FR-PCTL-009:** Zero or negative net enters `INSUFFICIENT_NET_REVIEW`; the
  product creates no non-positive bank instruction.
- **FR-PCTL-010:** The resolution policy orders mandatory and voluntary
  deductions and permits only authorized reduction, deferral, carry-forward
  receivable, separate collection, or approved write-off.
- **FR-PCTL-011:** Resolution records original result, deferred balance,
  legal/policy basis, employee communication, operator, approver, and future
  recovery; it never rewrites the original deduction demand.

## 5. Input Freeze and Concurrency

- **FR-PCTL-012:** Payroll alone creates `PayrollInputSnapshot` from versioned
  `EmploymentFacts`, `CompensationAssignment`, `TimeInputPackage`,
  `ApprovedReimbursement`, `BenefitDeductionInstruction`, loans,
  `OneTimeAward`, `ApprovedAssetRecovery`, and authorized adjustments.
- **FR-PCTL-013:** The snapshot records source watermark/cutoff, source
  versions, received-at time, approval state, checksum, missing sources, and
  unresolved warnings per employment.
- **FR-PCTL-014:** Facts arriving after cutoff enter a late-input queue with
  owner and disposition: reject, governed rebuild before lock, next regular
  period, supplemental adjustment, or retro.
- **FR-PCTL-015:** Rebuild supersedes—not mutates—the prior snapshot and
  invalidates any draft calculation/approval tied to the older version.
- **FR-PCTL-016:** Calculate, override, approve, lock, reopen, publish, payout,
  and statutory commands require expected aggregate/run version.
- **FR-PCTL-017:** Calculation/lock uses an exclusive renewable lease. A stale
  command is rejected with the current version and no side effect.
- **FR-PCTL-018:** Approval stores the exact result/control-total hash; lock
  fails if any approved result, exception, or source version changed.

## 6. Run and Correction Lifecycle

Run transitions are governed by the IDs in
[PRD 05c](./05c-payroll-statutory-transition-tables-prd.md):

`DRAFT → CALCULATING → READY_FOR_REVIEW | FAILED → APPROVED → LOCKED →
PAYOUT_PENDING → PARTIALLY_PAID | PAID → RECONCILING → CLOSED`

Terminal/supersession outcomes: `CANCELLED`, `SUPERSEDED`, `REVERSED`.

- **FR-PCTL-019:** A draft may be cancelled; a locked run may reopen only
  before any irreversible downstream act and after draft artifacts/intents are
  cancelled or superseded.
- **FR-PCTL-020:** After payout submission, payslip publication, journal
  acceptance, statutory payment, or filing, recovery is forward-only through a
  linked supplemental adjustment, reversal, corrected publication, return,
  journal reversal/replacement, or statutory correction.
- **FR-PCTL-021:** The original locked/paid result remains immutable. Every
  correction names original result, cause, affected periods/components,
  source/rule delta, tax/statutory treatment, settlement run, and evidence.
- **FR-PCTL-022:** P0 supports: next-regular retro, supplemental earning/
  deduction adjustment, payment reversal/return recovery, and corrected
  payslip. Advanced scheduling and consolidated corrections are P1.
- **FR-PCTL-023:** `FAILED`, `CANCELLED`, `SUPERSEDED`, and `REVERSED` have
  explicit close eligibility and cannot be presented as successfully paid.

## 7. Death-Reported and Exceptional Exit

- **FR-PCTL-024:** A restricted death-reported event stops ordinary
  self-service/payout assumptions without exposing cause broadly.
- **FR-PCTL-025:** Final pay/FnF validates last payable period, nomination or
  lawful claimant evidence, permitted payout destination, undisbursed wages,
  gratuity/insurance/EDLI inputs where applicable, documents, and access.
- **FR-PCTL-026:** No operator may replace the employee beneficiary with a
  nominee/claimant without purpose-bound evidence, dual control, and legal/
  payroll approval.

## 8. Payout and Bank-Change Controls

- **FR-PCTL-027:** Every payment has immutable intent identity across
  payroll result, beneficiary version, amount/currency, funding account, and
  attempt lineage. Provider retries reuse the correct intent identity.
- **FR-PCTL-028:** Provider events are append-only and reconciled by provider
  event/reference/time; out-of-order, duplicate, unknown, returned, and
  partially returned events cannot regress a terminal fact silently.
- **FR-PCTL-029:** A retry through another provider creates a linked reissue
  only after the earlier intent is confirmed failed, canceled, or non-success
  by authoritative reconciliation; successful or unknown beneficiaries are excluded.
- **FR-PCTL-030:** Bank-detail change requires identity verification,
  before/after audit, out-of-band employee notice, risk-based cooling/hold, and
  dual control. The changer cannot approve or release the affected payout.
- **FR-PCTL-031:** P0 payout modes are secure bank advice/file with finance
  authorization and manual bank acknowledgment, or a contracted direct
  provider. Funding sufficiency and control totals are approved before release.

## 9. Accounting and Close Controls

- **FR-PCTL-032:** Journal lifecycle is `DRAFT → EXPORTED → ACCEPTED →
  POSTED | REJECTED → REVERSED | REPLACED`; Accounting acknowledgment is
  authoritative for posted status.
- **FR-PCTL-033:** A payroll correction after acceptance creates a balanced,
  linked reversal and replacement/delta journal; prior exports remain auditable.
- **FR-PCTL-034:** Close reconciles by employee and aggregate: gross, taxable,
  each deduction/contribution, employer cost, net, payout success/return,
  payslip, statutory obligation/payment/return, and journal.
- **FR-PCTL-035:** Each control declares exact or tolerated comparison,
  currency/rounding, residual owner, aging SLA, evidence, and signer.
- **FR-PCTL-036:** Unexplained employee-level difference blocks close even when
  aggregate totals agree.

## 10. Resilience and Cutoff Contingency

- **FR-PCTL-037:** Payroll critical paths use the numerical SLO/RPO/RTO and
  recovery evidence in the
  [Operations and Release Evidence PRD](./06a-operations-release-evidence-prd.md).
- **FR-PCTL-038:** Provider calls have cutoff-aware retry budget, circuit
  breaker, unknown-state reconciliation, owner alert, and manual contingency.
- **FR-PCTL-039:** Recovery replays in dependency order: facts → snapshot →
  calculation → approval/lock → artifacts → payment/journal/statutory intents.
- **FR-PCTL-040:** A restoration drill proves no duplicate payout, filing,
  publication, or journal and records time-to-reconcile.

### Restricted settlement claim

- **FR-PCTL-041:** Payroll owns a restricted settlement claim linked to the
  deceased employment and case reference, never a new employment/worker record.
- **FR-PCTL-042:** Claim state is `EVIDENCE_PENDING → DISPUTED | VALIDATED |
  REJECTED | WITHDRAWN | EXPIRED`; only `VALIDATED → APPROVED → PAID → CLOSED`.
  `DISPUTED` blocks approval and may return to evidence, validate, or reject.
- **FR-PCTL-043:** Communications, evidence requests, expiry, decisions,
  beneficiary/payment destination, and closure are purpose-limited and audited.

## 11. Acceptance Fixtures

- [ ] Two concurrent employments aggregate and separate exactly per signed rules.
- [ ] Mid-period entity/state/pay-group/salary transfers produce deterministic slices.
- [ ] Join, exit, revision, LOP, and leap/month proration fixtures reconcile.
- [ ] Negative net produces no payout and retains deferred recovery lineage.
- [ ] Concurrent stale approve/lock commands fail without side effects.
- [ ] A late fact follows its approved rebuild/adjustment/retro disposition.
- [ ] Reopen is impossible after an irreversible act without forward correction.
- [ ] Failed, partial, returned, duplicate, out-of-order, and reissued payments reconcile.
- [ ] A recent bank change cannot be released by the changer.
- [ ] Death-reported final pay requires validated claimant/beneficiary evidence.
- [ ] Journal reversal/replacement and employee/aggregate close controls reconcile.
- [ ] Recovery drill meets target and duplicates no external act.


## Architecture hardening acceptance (2026-10-24)

The following additive acceptance belongs to [PRD 16](./16-architecture-hardening-prd.md)
and must be applied to this domain through [guide 17](./17-claude-architecture-execution.md).
Business facts, tiers and existing acceptance remain owned here. FR-ARCH identifiers
have one definition in PRD 16 and one criterion status in the
[architecture execution ledger](./architecture-review/execution-ledger.json);
this routing table does not duplicate or pre-close an implementation task.

| Requirement | Applicable architecture obligation |
|---|---|
| FR-ARCH-011 | Make HR input-period build, lock and unlock atomic and versioned |
| FR-ARCH-012 | Preserve locked history and route late changes through correction |
| FR-ARCH-013 | Use validated exact payroll money, rates and rounding |
| FR-ARCH-016 | Represent payment unknown, partial, return and reconciliation honestly |
