# StreamlineOS India Payroll and Statutory Transition Tables PRD

**Status:** Normative transition contract  
**Owner:** Payroll + Payroll Compliance  
**Priority:** P0 for enabled capabilities  
**Parents:** [Payroll Controls PRD](./05b-india-payroll-controls-edge-cases-prd.md)
and [Statutory PRD](./05a-india-payroll-statutory-prd.md)

## 1. Common Transition Contract

Every row requires current aggregate version, actor/service permission,
idempotency key, correlation, tenant/entity/pay-group or registration scope,
required evidence, audit, and post-commit event. A failed guard has no state
side effect. Country-rule packs may narrow valid statutory ordering but cannot
weaken evidence, permissions, immutability, or reconciliation.

## 2. Payroll Run

| ID | From → To | Command / actor | Guard and evidence | Event / recovery |
|---|---|---|---|---|
| TR-PAY-RUN-001 | none → `DRAFT` | create / payroll operator | open period, entity/pay group, snapshot intent | `run.created`; cancel if unused |
| TR-PAY-RUN-002 | `DRAFT/FAILED` → `CALCULATING` | calculate / calculator service | locked source snapshot/version, lease | `run.calculation_started`; retry same version |
| TR-PAY-RUN-003 | `CALCULATING` → `READY_FOR_REVIEW` | complete / calculator | deterministic results, control hash, no blocker | `run.calculated` |
| TR-PAY-RUN-004 | `CALCULATING` → `FAILED` | fail / calculator | classified terminal/retryable error | `run.calculation_failed`; owner/action |
| TR-PAY-RUN-005 | `READY_FOR_REVIEW` → `APPROVED` | approve / payroll approver | exceptions disposed, result/control hash, SoD | `run.approved`; changed result invalidates |
| TR-PAY-RUN-006 | `APPROVED` → `LOCKED` | lock / payroll locker | expected approved hash, lease, no stale source | `run.locked`; no destructive reopen |
| TR-PAY-RUN-007 | `LOCKED` → `PAYOUT_PENDING` | create intents / payout preparer | funding/control approval, beneficiary versions | payment intents created once |
| TR-PAY-RUN-008 | `PAYOUT_PENDING` → `PARTIALLY_PAID/PAID` | reconcile / payout reconciler | authoritative payment events per intent | unresolved owner; no blind retry |
| TR-PAY-RUN-009 | paid state → `RECONCILING` | start close / payroll operator | payslip/statutory/journal intents created | close controls run |
| TR-PAY-RUN-010 | `RECONCILING` → `CLOSED` | close / payroll closer | employee+aggregate controls pass, signers | `run.closed`; forward correction only |
| TR-PAY-RUN-011 | pre-lock state → `CANCELLED` | cancel / payroll operator | reason, no locked/external act | `run.cancelled` |
| TR-PAY-RUN-012 | locked pre-external-act → `SUPERSEDED` | reopen / elevated approver | impact preview; all draft artifacts/intents canceled | new linked run version |
| TR-PAY-RUN-013 | locked/paid/closed → `REVERSED` | correct / payroll approver | linked adjustment/reversal authority and evidence | immutable original; new correction run |

## 3. Payment Intent

| ID | From → To | Command / actor | Guard and evidence | Event / recovery |
|---|---|---|---|---|
| TR-PAY-PMT-001 | none → `CREATED` | prepare / payout preparer | locked result, beneficiary/funding version, amount | immutable intent identity |
| TR-PAY-PMT-002 | `CREATED` → `SUBMITTED` | release / payout releaser | maker-checker, funding, bank-change hold clear | provider/bank reference |
| TR-PAY-PMT-003 | `SUBMITTED` → `PROCESSING` | callback/poll / provider adapter | verified source, monotonic event | append provider event |
| TR-PAY-PMT-004 | active → `SUCCEEDED/FAILED/UNKNOWN` | reconcile / adapter/operator | authoritative event or documented absence | unknown blocks reissue |
| TR-PAY-PMT-005 | `SUCCEEDED` → `RETURNED/PARTIALLY_RETURNED` | return event / adapter | authoritative return amount/reference | receivable/reissue review |
| TR-PAY-PMT-006 | `FAILED/RETURNED` → `REISSUED` | reissue / payout releaser | confirmed non-success, corrected beneficiary, new intent | link old/new; no duplicate |
| TR-PAY-PMT-007 | `CREATED/SUBMITTED` → `CANCELLED` | cancel / releaser/adapter | provider confirms cancellation before success | retain evidence |

`UNKNOWN` may transition only after authoritative reconciliation to
`SUCCEEDED`, `FAILED`, `RETURNED`, or `CANCELLED`.

## 4. Accounting Journal

| ID | From → To | Command / actor | Guard and evidence | Event / recovery |
|---|---|---|---|---|
| TR-PAY-JRN-001 | none → `DRAFT` | generate / Payroll | locked run, balanced dimensions/version | journal hash |
| TR-PAY-JRN-002 | `DRAFT` → `EXPORTED` | export / Payroll accounting operator | export permission, purpose, destination | export evidence |
| TR-PAY-JRN-003 | `EXPORTED` → `ACCEPTED/REJECTED` | acknowledge / Accounting contract | authoritative schema/control response | errors owner/retry new version |
| TR-PAY-JRN-004 | `ACCEPTED` → `POSTED` | status / Accounting contract | posted reference/time | Payroll cannot self-declare |
| TR-PAY-JRN-005 | `ACCEPTED/POSTED` → `REVERSED` | reverse / Accounting authority | payroll correction and balanced reversal | reversal reference |
| TR-PAY-JRN-006 | `REJECTED/REVERSED` → `REPLACED` | replace / Payroll | linked corrected balanced version | old journal immutable |

## 5. Restricted Settlement Claim

| ID | From → To | Command / actor | Guard and evidence | Event / recovery |
|---|---|---|---|---|
| TR-PAY-CLM-001 | none → `EVIDENCE_PENDING` | open / restricted Payroll | death-reported event, claimant reference, purpose | restricted claim created |
| TR-PAY-CLM-002 | pending → `DISPUTED` | dispute / claimant/legal role | competing/adverse claim evidence | approval blocked; case escalation |
| TR-PAY-CLM-003 | pending/disputed → `VALIDATED` | validate / legal+Payroll | lawful claimant/nominee evidence and destination | dual-control evidence |
| TR-PAY-CLM-004 | pending/disputed → `REJECTED/WITHDRAWN/EXPIRED` | dispose / authorized role | reason, notice, appeal/reopen policy | terminal evidence; no payout |
| TR-PAY-CLM-005 | `VALIDATED` → `APPROVED` | approve / settlement approver | final dues and SoD review | payment intent allowed |
| TR-PAY-CLM-006 | `APPROVED` → `PAID` | reconcile / payout reconciler | successful lawful-beneficiary payment | payment reference |
| TR-PAY-CLM-007 | `PAID` → `CLOSED` | close / restricted Payroll | dues/statutory/documents reconciled | retained under policy |

## 6. Statutory Records

### Obligation and artifact

| ID | From → To | Command / actor | Guard and evidence | Event / recovery |
|---|---|---|---|---|
| TR-STAT-OBL-001 | none → `CALCULATED` | calculate / rule engine | locked results, exact rule/source version | obligation/control totals |
| TR-STAT-OBL-002 | `CALCULATED` → `REVIEWED` | review / compliance reviewer | signed fixture/rule and exception disposition | reviewer evidence |
| TR-STAT-OBL-003 | `REVIEWED` → `DUE/NOT_DUE` | assess / rule engine | applicability, period, registration, due-date rule | calendar/task |
| TR-STAT-ART-001 | none → `DRAFT` | generate / artifact service | reviewed obligation allocation | generator/schema version |
| TR-STAT-ART-002 | `DRAFT` → `VALIDATED` | validate / artifact service | schema and bidirectional control totals | validation report |
| TR-STAT-ART-003 | `VALIDATED` → `GENERATED` | finalize / compliance operator | hash, signer/approval where required | downloadable artifact |
| TR-STAT-ART-004 | draft/validated → `INVALID` | reject / validator | field/schema/control errors | corrected new artifact version |

### Statutory payment and return

| ID | From → To | Command / actor | Guard and evidence | Event / recovery |
|---|---|---|---|---|
| TR-STAT-PMT-001 | none → `PAYMENT_DUE` | create / compliance operator | obligation allocation, amount, due date | payment task/intent |
| TR-STAT-PMT-002 | `PAYMENT_DUE` → `SUBMITTED` | submit/record / authorized payer | SoD, official destination/reference | never infer success |
| TR-STAT-PMT-003 | `SUBMITTED` → `PAID/FAILED/UNKNOWN` | reconcile / adapter/operator | official bank/provider/government evidence | unknown blocks completion/retry |
| TR-STAT-PMT-004 | `PAID` → `REFUNDED/REVERSED` | official event / reconciler | authoritative reference/allocation | linked correction |
| TR-STAT-RET-001 | none → `RETURN_DUE` | create / country pack | valid ordering/applicability for obligation | return task |
| TR-STAT-RET-002 | `RETURN_DUE` → `SUBMITTED` | file/record / filer | validated artifact, signature/authority | submission evidence |
| TR-STAT-RET-003 | `SUBMITTED` → `FILED/REJECTED/UNKNOWN` | reconcile / adapter/operator | official receipt/rejection or documented unknown | owner/action; no false filing |

### Acknowledgment and correction

| ID | From → To | Command / actor | Guard and evidence | Event / recovery |
|---|---|---|---|---|
| TR-STAT-ACK-001 | submitted/filed/paid → `ACKNOWLEDGED` | capture / reconciler | official acceptance reference, scope, time | allocation reconciled |
| TR-STAT-ACK-002 | submitted/filed → `REJECTED` | capture / reconciler | official errors/reference | correction required |
| TR-STAT-COR-001 | rejected/accepted record → `CORRECTION_DRAFT` | initiate / compliance operator | affected record/allocation, reason, authority | original immutable |
| TR-STAT-COR-002 | `CORRECTION_DRAFT` → `SUBMITTED` | submit/record / filer | corrected artifact/control totals/approval | correction reference |
| TR-STAT-COR-003 | `SUBMITTED` → `ACKNOWLEDGED/REJECTED/UNKNOWN` | reconcile / adapter/operator | official evidence | repeat linked cycle or investigate |

Payment, return, and acknowledgment may occur in country-pack-defined order.
One record can allocate across obligations/runs and corrections allocate only
the affected portion; all directions reconcile before obligation close.

## 7. Acceptance Criteria

- [ ] Every row rejects unauthorized, stale-version, duplicate, and invalid-evidence commands.
- [ ] Every external `UNKNOWN` blocks success, close, and reissue until reconciled.
- [ ] Reopen/reversal/correction preserves immutable original and downstream links.
- [ ] Manual evidence is official external evidence, not internal approval.
- [ ] Country-pack ordering changes guards, never audit/evidence requirements.
- [ ] Tests reference stable transition IDs and cover success, denial, retry,
      partial, rejection, correction, cancellation, and recovery.


## Architecture hardening acceptance (2026-10-24)

The following additive acceptance belongs to [PRD 16](./16-architecture-hardening-prd.md)
and must be applied to this domain through [guide 17](./17-claude-architecture-execution.md).
Business facts, tiers and existing acceptance remain owned here. FR-ARCH identifiers
have one definition in PRD 16 and one criterion status in the
[architecture execution ledger](./architecture-review/execution-ledger.json);
this routing table does not duplicate or pre-close an implementation task.

| Requirement | Applicable architecture obligation |
|---|---|
| FR-ARCH-017 | Preserve payout coverage, run transitions and stale-approval controls |
