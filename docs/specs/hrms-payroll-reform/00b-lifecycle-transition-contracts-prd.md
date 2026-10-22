# StreamlineOS People Lifecycle Transition Contracts PRD

**Status:** Normative suite state contract  
**Owner:** People Architecture Council  
**Priority:** P0 for enabled states  
**Parent:** [Domain Contracts PRD](./00a-suite-domain-contracts-prd.md)

## 1. Purpose

This PRD makes the arrow summaries in Core, Workforce, Service, and
Implementation implementable. Payroll and statutory transition IDs are owned
by [PRD 05c](./05c-payroll-statutory-transition-tables-prd.md). [PRD 05b](./05b-india-payroll-controls-edge-cases-prd.md)
owns control rules; [PRD 05a](./05a-india-payroll-statutory-prd.md) owns
statutory calculation and evidence rules.

Every command requires tenant, aggregate ID/version, actor/service authority,
reason where required, idempotency key, correlation, effective time, audit, and
post-commit event. Failed guards write no state.

## 2. Worker and Employment Lifecycle

| From | Command → To | Actor | Minimum guard/evidence | Recovery/event |
|---|---|---|---|---|
| none | create accepted hire → `PREBOARDING` | Recruitment contract/Core | accepted offer reference, position/entity/start, dedupe | reject/ack; `worker.preboarding_created` |
| `PREBOARDING` | activate → `ACTIVE` | Core scheduler/HR | required employment facts, start due, blockers clear | remain preboarding; blocker owner |
| `ACTIVE` | start leave → `ON_LEAVE` | HR/approved workflow | approved leave/status interval and pay impact | cancel before effective; status changed |
| `ON_LEAVE` | return → `ACTIVE` | HR/scheduler | return date and required access/schedule facts | amend future return; status changed |
| `ACTIVE` | suspend → `SUSPENDED` | restricted HR role | authority, reason class, interval, access/pay impact | end/amend; restricted event |
| `SUSPENDED` | reinstate → `ACTIVE` | restricted HR role | effective date and downstream readiness | scheduled supersession |
| `ACTIVE/ON_LEAVE/SUSPENDED` | initiate exit → `EXIT_PENDING` | HR/approved workflow | intended last day, reason class, tasks, FnF/access handoff | cancel/supersede before termination |
| `EXIT_PENDING` | cancel exit → prior valid state | authorized HR | no irreversible termination; reason | tasks canceled/reconciled |
| `EXIT_PENDING` | complete exit → `EXITED` | HR/scheduler | termination effective; mandatory handoffs created | post-exit corrections only |
| `EXITED` | rehire → new `PREBOARDING` employment | HR/accepted hire | new engagement/employment IDs, eligibility | old rows remain closed; `worker.rehired` |

Death reporting is a restricted event, not a public lifecycle state. It invokes
PRD 05b settlement-claim controls while the employment follows authorized exit.

## 3. Position and Recruitment Handoff

| From | Command → To | Actor | Guard/evidence | Recovery/event |
|---|---|---|---|---|
| none | draft → `DRAFT` | HR/planner | job/entity/cost owner | delete only if never requested |
| `DRAFT` | request → `REQUESTED` | planner | budget/cost/headcount evidence | return to draft with reason |
| `REQUESTED` | approve → `APPROVED` | authorized approver | versioned decision, no self-approval | reject/return; decision event |
| `APPROVED` | open → `OPEN` | Core | active entity/job, requisition-ready payload | Recruitment reject/update/replay |
| `OPEN` | fill → `FILLED` | Core after accepted hire | one accepted hire/position version | rescind before activation or backfill intent |
| `APPROVED/OPEN` | freeze → `FROZEN` | owner/approver | reason and interval | reopen with new version |
| any non-filled | close → `CLOSED` | owner/approver | no active accepted hire | rescind and reconcile Recruitment |
| `FILLED` | close/backfill → `CLOSED` or new position | Core | employment exit/transfer and policy | preserve historical link |

## 4. Attendance, Leave, and Asset Custody

### Attendance day

| From | Command → To | Guard | Recovery/event |
|---|---|---|---|
| none | derive → `OPEN` | employment/day/policy exists | recompute new version |
| `OPEN` | complete → `COMPLETE` | required events/schedule resolve | source correction supersedes |
| `OPEN/COMPLETE` | flag → `EXCEPTION` | deterministic rule violation/missing fact | owner/action required |
| `EXCEPTION` | approve exception → `APPROVED` | permitted approver/evidence | revoke before payroll freeze |
| `EXCEPTION` | regularize → `REGULARIZED` | before/after, reason, approval | linked correction only |
| `COMPLETE/APPROVED/REGULARIZED` | publish package → `FROZEN_FOR_PAYROLL` | acknowledged package version | later facts use new package/adjustment |

### Time-away request

| From | Command → To | Guard | Recovery/event |
|---|---|---|---|
| none | save → `DRAFT` | worker/type/dates | delete own unsubmitted draft |
| `DRAFT` | submit → `SUBMITTED` | eligibility/overlap/balance preflight | return/cancel by policy |
| `SUBMITTED` | approve/reject → `APPROVED/REJECTED` | current version, scoped approver | approved cancellation creates release |
| `DRAFT/SUBMITTED/APPROVED` | cancel → `CANCELLED` | policy/cutoff; no hidden balance edit | release reservation/consumption entry |
| `APPROVED` | apply → `APPLIED` | effective date reached | correction uses ledger adjustment |

### Asset custody

| From | Command → To | Guard | Recovery/event |
|---|---|---|---|
| `IN_STOCK` | reserve/assign → `RESERVED/ASSIGNED` | active asset/custodian; acknowledgment policy | release or atomic transfer |
| `ASSIGNED` | request return → `RETURN_DUE` | due reason/date | extend/waive with approval |
| `RETURN_DUE` | receive → `RETURNED` | condition/evidence | correction retains prior custody |
| `ASSIGNED/RETURN_DUE` | report → `LOST/DAMAGED` | evidence/notice | dispute/waiver; no automatic deduction |
| `DAMAGED` | repair → `REPAIR` | repair owner/reference | return to stock/assigned or retire |
| `RETURNED/REPAIR/LOST/DAMAGED` | retire → `RETIRED` | authority and disposition | terminal; historical correction only |

## 5. Service, Case, and Approval

### Service request

| From | Command → To | Guard/recovery |
|---|---|---|
| none/`DRAFT` | submit → `SUBMITTED` | valid form/version; retry dedupes |
| `SUBMITTED` | triage → `TRIAGED` | category/priority/route recorded |
| `TRIAGED` | start → `IN_PROGRESS` | assignee accepts; reassign retains SLA |
| `IN_PROGRESS` | wait → `WAITING_ON_EMPLOYEE/INTERNAL` | reason, owner, SLA pause rule |
| waiting | resume → `IN_PROGRESS` | response/dependency event |
| `IN_PROGRESS` | resolve → `RESOLVED` | outcome and safe explanation |
| `RESOLVED` | close/reopen → `CLOSED/IN_PROGRESS` | reopen window/policy; history retained |

### Restricted case

| From | Command → To | Guard/recovery |
|---|---|---|
| none | open → `OPEN` | purpose, restricted role, conflict check |
| `OPEN` | assess → `ASSESSMENT` | scope/participants/triage recorded |
| `ASSESSMENT` | investigate/action plan → `INVESTIGATION/ACTION_PLAN` | evidence authority and owner |
| investigation/action | review outcome → `OUTCOME_REVIEW` | findings/actions and legal review where required |
| `OUTCOME_REVIEW` | resolve → `RESOLVED` | decision authority and communications |
| `RESOLVED` | appeal/close → `APPEAL/CLOSED` | appeal policy/deadline; no evidence deletion |
| `APPEAL` | resolve/close → `RESOLVED/CLOSED` | separate reviewer where required |
| any | create hold → state unchanged | linked active hold suspends deletion |
| `CLOSED` | retain → `RETAINED` | retention class/trigger; authorized correction only |

### Legal hold

| From | Command → To | Guard/recovery |
|---|---|---|
| none | place → `ACTIVE` | legal-hold permission, purpose, scope, authority, start; link records |
| `ACTIVE` | amend → new `ACTIVE` version | authorized scope/reason; prior version retained |
| `ACTIVE` | release → `RELEASED` | authorized reviewer, release basis/date, affected records |

Release preserves immutable hold history and resumes each linked record's
versioned retention policy from its correct trigger; it does not change the
record's business-workflow state.

### Approval

| From | Command → To | Guard/recovery |
|---|---|---|
| none | request → `PENDING` | source record/version and resolved approver |
| `PENDING` | approve/reject → terminal decision | scope, current version, no self-approval; source command authoritative |
| `PENDING` | return → `RETURNED` | reason and requested changes; old item is terminal |
| `RETURNED` | source resubmits → new `PENDING` | new source/approval version and approver resolution |
| `PENDING` | cancel/expire → `CANCELLED/EXPIRED` | source cancel or deadline policy |
| `PENDING` | reassign → `REASSIGNED` then new `PENDING` | delegation/fallback reason; no widened scope |

## 6. Implementation Project

| From | Command → To | Exit guard |
|---|---|---|
| `DISCOVERY` | approve inventory → `DESIGN` | sources, scope, owners, disposition |
| `DESIGN` | approve design → `CONFIGURE` | mappings, target model, decisions |
| `CONFIGURE` | readiness → `MIGRATE` | configuration validation and promotion evidence |
| `MIGRATE` | reconcile import → `VALIDATE` | row outcomes, lineage, control totals |
| `VALIDATE` | approve test → `PARALLEL_RUN` | domain fixtures and integrations |
| `PARALLEL_RUN` | meet threshold → `CUTOVER_READY` | signed variance and exception evidence |
| `CUTOVER_READY` | go → `CUTOVER` | go/no-go, backup, rollback boundary, communications |
| `CUTOVER` | reconcile live → `STABILIZE` | first-live facts/external acts reconciled |
| `STABILIZE` | accept operations → `HANDOFF` | health, runbooks, access review |
| `HANDOFF` | sign → `COMPLETE` | owner, support, evidence, temporary access revoked |

Any stage may return to an earlier stage with reason and retained evidence
before cutover. After an irreversible external act, recovery is forward-only.

## 7. Acceptance Criteria

- [ ] Every listed transition rejects stale version, unauthorized actor, and invalid guard.
- [ ] Retry produces one state/event outcome.
- [ ] Cancellation, return, reopen, correction, and supersession preserve history.
- [ ] Domain events occur only after the owning state commit.
- [ ] Downstream failure is visible and reconcilable without rolling back the owner fact.
- [ ] Transition tests cover every row plus denied, duplicate, stale, and partial-failure cases.
