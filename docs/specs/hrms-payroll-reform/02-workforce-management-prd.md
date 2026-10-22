# StreamlineOS Workforce Management PRD

**Status:** Normative domain PRD  
**Owner:** People Workforce Operations  
**Priority:** P0 time/leave inputs; P1 scheduling and asset depth; Expenses connected  
**Depends on:** Core HR, Calendar, Workflow, Expenses, Build Timesheets, Payroll

## 1. Outcome

Employees can record where and when they work, request time away, and see
expense/asset handoff status. Managers resolve exceptions quickly. Payroll
receives a frozen, explainable, approved input snapshot rather than recomputing
mutable HR facts.

## 2. Scope

### P0 — required

- Attendance day, clock-in/out, break, regularization, late/absent/present
  status, and WFO/WFH work location.
- Web, mobile, approved provider/import, and manual-contingency input channels
  with source provenance; geofence/device verification only when configured and disclosed.
- Leave types, accrual/balance ledger, eligibility, request, cancellation,
  manager approval, HR override, holidays, and team calendar.
- WFH request and approval integrated with attendance and paid payroll inputs.
- Shift definitions, assignments, weekly offs, and attendance-policy evaluation.
- Overtime request/approval and payroll-eligible hours.
- Cross-workflow approval inbox integration.
- Payroll input snapshot for attendance, paid/unpaid leave, WFH, overtime,
  holidays, and approved work hours.
- Expenses-owned claim deep link/status and versioned approved-reimbursement handoff.
- Minimum asset custody, acknowledgment, return status, and exit-check handoff.

### P1 — complete suite

- Rosters, recurring schedules, shift swaps, open shifts, availability, and
  manager planning.
- Comp-off earn/use ledger and expiry.
- Multi-location holiday calendars and optional holidays.
- Biometric/clock device registry, event reconciliation, offline event import,
  and device health.
- Advanced overtime, break, grace, rounding, night-shift, and cross-midnight rules.
- Project/task work logs and versioned timesheet-to-payroll handoff.
- Connected travel absence/schedule impact and approved-expense status.
- Asset stock, procurement reference, warranty, depreciation reference,
  maintenance, and custody history.
- Bulk attendance correction, leave/WFH decision, schedule assignment, and asset operations.

### P2 — differentiators

- Project demand, skills, leave, schedule, and capacity combined into a
  permission-safe staffing view.
- Payroll and delivery impact shown before approving overtime, leave, or schedule changes.
- Anomaly detection for duplicate punches, missed breaks, unusual overtime,
  schedule mismatch, expense duplicates, and asset risk.
- Recommended staffing or schedule changes with constraints and human confirmation.

### Out of scope

- Payroll gross-to-net calculation and payout.
- General project planning or billing; Build owns project work and timesheets.
- Banking/card ledger, travel booking agency, or device-management platform.
- Surveillance scoring or opaque productivity monitoring.

## 3. Users and Jobs

| User | Job |
|---|---|
| Employee | Check in/out, request leave/WFH, view schedule, submit expense, manage assigned assets |
| Manager | See team availability, approve requests, resolve attendance and schedule exceptions |
| HR/time operator | Configure policy, run attendance, reconcile devices, correct exceptions |
| Finance/expense operator | Work in Expenses; People exposes only approved handoff/reconciliation status |
| Payroll operator | Consume frozen approved inputs and trace every source |
| Resource manager | Compare planned work demand with authorized capacity and availability |

## 4. Core Concepts and State

### Attendance day

An attendance day is a derived, versioned result from source events, schedule,
holiday, approved leave/WFH, and policy version. It retains provenance and may
be recomputed before the payroll input period locks.

`OPEN → COMPLETE | EXCEPTION → APPROVED | REGULARIZED → FROZEN_FOR_PAYROLL`

### Time-away request

`DRAFT → SUBMITTED → APPROVED | REJECTED | CANCELLED → APPLIED`

Approval reserves/consumes balance according to policy. Rejection or permitted
cancellation releases reservation. Historical ledger entries are never edited
in place.

### Asset custody

`IN_STOCK → RESERVED → ASSIGNED → RETURN_DUE → RETURNED | LOST | DAMAGED →
REPAIR | RETIRED`

## 5. Functional Requirements

### Attendance and work location

- **FR-WFM-001:** `workLocation` is `WFO`, `WFH`, `FIELD`, or `UNKNOWN`;
  attendance status remains a separate lifecycle/result.
- **FR-WFM-002:** Check-in policy may require geofence, approved device,
  selfie/biometric provider assertion, or none by worker/location/shift; each
  assignment is explicit and defaults to none until a disclosed policy is published.
- **FR-WFM-003:** The product stores provider/source proof and decision result,
  not unnecessary raw biometric templates.
- **FR-WFM-004:** Cross-midnight shifts, timezone changes, daylight-saving
  transitions, duplicate events, and offline uploads resolve deterministically.
- **FR-WFM-005:** Regularization shows original and proposed values, impact on
  hours/LOP/overtime, approver, reason, and audit.
- **FR-WFM-006:** Managers see only scoped team attendance; HR views honor
  field and location scope.

### Leave, WFH, holidays, and comp-off

- **FR-WFM-007:** Leave policy supports eligibility, accrual, proration,
  carry-forward, expiry, negative balance, half-day/hourly units, sandwich
  rules, notice, attachment, blackout, and an explicit approval/auto-approval policy.
- **FR-WFM-008:** Balance is a ledger with grants, accruals, reservations,
  consumption, release, adjustment, expiry, and migration entries.
- **FR-WFM-009:** WFH is a policy-backed request that affects work location,
  attendance expectation, calendar, and payroll input without consuming leave.
- **FR-WFM-010:** Holiday calendars support entity, country/region, location,
  optional holiday, observance, and versioned year publication.
- **FR-WFM-011:** Team calendars apply privacy-safe labels; private leave types
  do not expose medical or personal reasons.
- **FR-WFM-012:** Bulk decisions revalidate balance, overlap, policy,
  employment, scope, and current request state per record.

### Scheduling, shifts, overtime, and clocks

- **FR-WFM-013:** Shift rules include start/end, breaks, grace, minimum/maximum
  hours, weekly off, overtime eligibility, and effective dates.
- **FR-WFM-014:** Roster planning is bounded by team and time window and checks
  leave, WFH, availability, skills where authorized, rest, and overlapping assignments.
- **FR-WFM-015:** Shift swaps require eligibility, coverage validation,
  counterparty consent where relevant, and manager confirmation.
- **FR-WFM-016:** Overtime distinguishes requested, approved, worked,
  payroll-eligible, paid, and converted-to-comp-off quantities.
- **FR-WFM-017:** Clock events are append-only. Reconciliation creates a linked
  correction; it does not erase provider evidence.
- **FR-WFM-018:** Device health and event backlog cannot block manual,
  permissioned contingency attendance.

### Work logs and timesheet handoff

- **FR-WFM-019:** Build owns project/task time. HRMS may read authorized
  approved work-hour summaries; it does not create a parallel project timesheet.
- **FR-WFM-020:** Timesheet handoff is idempotent, versioned, and acknowledged;
  hours include regular, overtime, holiday, weekend, leave, billable, and
  non-billable buckets where provided.
- **FR-WFM-021:** Payroll prices approved hours. Timesheets do not send an
  unversioned pay rate or amount.
- **FR-WFM-022:** Re-export cannot double-count entries; corrections create a
  superseding version with reconciliation status.

### Expenses and travel boundary

- **FR-WFM-023:** Expenses owns claim/receipt/policy/approval state. People
  provides authorized deep links and status projections, never a mutable claim copy.
- **FR-WFM-024:** `ApprovedReimbursement` includes claim/version, worker/
  employment, amount/currency, approved date, payout owner, tax-treatment
  input, accounting dimensions, void/reversal, and reconciliation state.
- **FR-WFM-025:** Payroll acknowledgment/rejection/retry is idempotent; a claim
  update or void creates a superseding version and cannot duplicate reimbursement.
- **FR-WFM-026:** Travel, advance, card, mileage, and per-diem workflows remain
  Expenses-owned; People may consume approved absence/schedule impacts only.
- **FR-WFM-027:** Employee/manager home may summarize outstanding expense work
  without exposing receipt, merchant, or finance-only fields.

### Assets

- **FR-WFM-028:** Each serialized asset has category, owner entity, location,
  status, custodian, history, warranty, condition, and external reference.
- **FR-WFM-029:** Assignment requires employee acknowledgment when policy
  requires it; transfer closes prior custody and opens the next atomically.
- **FR-WFM-030:** Exit cannot silently complete while required assets are
  outstanding; authorized HR may accept a documented exception. Custody status
  alone cannot create a payroll deduction: recovery requires amount, evidence,
  employee notice/dispute, legal validation, approval, waiver, and reconciliation.
  Payroll receives only the versioned `ApprovedAssetRecovery` contract.

### Time-input package

- **FR-WFM-031:** A `TimeInputPackage` records worker, employment,
  policy/rule versions, approved source quantities, source IDs, build version,
  warnings, and checksum.
- **FR-WFM-032:** Rebuild before lock creates a new version and shows deltas.
  Payroll acknowledges or rejects a version; late changes enter Payroll's
  governed rebuild, adjustment, or retro path and never mutate an acknowledged version.
- **FR-WFM-033:** Input build batches source reads and does not issue
  per-employee attendance/leave/timesheet queries.
- **FR-WFM-034:** Payroll can trace every input to the authorized HR source
  without gaining access to private reason text.

## 6. Required Pages

### Self-service

- `/me/attendance` — day status, check-in/out, history, exceptions, regularization.
- `/me/time-off` — leave, WFH, balances, requests, team-calendar-safe view.
- `/me/schedule` — upcoming shifts, availability, swaps, overtime.
- Expenses product destination — claim capture; People home may show safe status.
- `/me/assets` — custody, acknowledgment, return/report issue.

### Manager and operations

- `/me/team` — current team availability, exceptions, approvals, capacity signals.
- `/hr/attendance` — table/calendar, WFO/WFH, exception operations.
- `/hr/leaves` — leave/WFH requests, balances, calendar, bulk decisions.
- `/hr/scheduling` — shift definitions, assignments, rosters, availability, swaps.
- `/hr/overtime` — overtime and comp-off tabs.
- `/hr/time-clocks` — device and event tabs.
- `/hr/holidays` — organization/location calendars.
- `/hr/work-logs` — authorized summaries and payroll handoff state.
- Expenses product destinations — claim/travel operations.
- `/hr/assets` — inventory, custody, repair, and return tabs.

Route migration from current paths is defined in PRD 07; no duplicate page may
remain after callers move.

## 7. UX Requirements

- Default views are exception-first: missed punch, policy breach, approval due,
  balance conflict, payroll-impacting change, duplicate expense, overdue asset.
- Calendar always has an accessible list/table alternative.
- Filters and view state are URL-backed for admin collections.
- Mobile prioritizes check-in/out, requests, approval, receipt capture, schedule,
  and asset acknowledgment with 44px targets and low-bandwidth states.
- Geofence denial explains the failed requirement and offers allowed recovery,
  such as retry, manual request, or WFH request; it does not reveal raw security data.
- Every approval shows source facts, policy result, downstream impact, and
  consequence before confirmation.

## 8. Security, Privacy, and Compliance

- Location and attendance collection is purpose-limited, disclosed, retained by
  policy, and inaccessible to unrelated managers.
- Raw biometric templates stay with a contracted provider where possible.
- Health/medical leave evidence is separated from general manager views.
- Expense receipts and travel documents use signed access and field-level scope.
- India and future country time rules are effective-dated policy packs, not UI constants.
- Anomaly models cannot create disciplinary decisions; they create reviewable exceptions.

## 9. Success Measures

- attendance days resolved before payroll cutoff;
- missed/duplicate punch and regularization age;
- leave/WFH decision time and balance correction rate;
- schedule coverage, overtime, and policy-exception rate;
- payroll input delta after initial build and post-lock adjustment rate;
- expense first-pass approval, duplicate prevention, and reimbursement cycle time;
- asset acknowledgment, overdue return, loss, and reconciliation rate;
- source-to-payroll trace completeness.

## 10. Acceptance Criteria

- [ ] WFO, WFH, field, leave, holiday, weekly off, and absence resolve
      independently from attendance lifecycle status.
- [ ] Leave balances reconcile from immutable ledger entries.
- [ ] Team calendar does not reveal private leave reasons.
- [ ] Cross-midnight and timezone attendance cases are deterministic.
- [ ] Bulk attendance and request decisions return per-record outcomes.
- [ ] Clock-provider retry cannot create duplicate attendance events.
- [ ] Timesheet export and acknowledgment are idempotent and correction-safe.
- [ ] Expense approval creates one reimbursement handoff and no payment duplicate.
- [ ] Exit surfaces every outstanding assigned asset.
- [ ] Payroll input rebuild shows versioned deltas and locked periods reject silent mutation.
- [ ] A payroll operator can trace quantities without reading protected HR reason text.
- [ ] All lists/calendar windows meet the numerical scale/latency gates in PRD 06a.
