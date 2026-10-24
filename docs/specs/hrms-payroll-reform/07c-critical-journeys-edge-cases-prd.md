# StreamlineOS People + Payroll Critical Journeys and Edge Cases PRD

**Status:** Normative cross-suite acceptance contract  
**Owner:** People Product + QA, with the domain owner named in each case  
**Priority:** P0 for enabled foundation journeys; P1/P2/P3 when those capabilities launch  
**Parents:** [Suite](./00-suite-product-prd.md), [Experience](./07b-experience-content-quality-prd.md), [Tier register](./00c-requirement-tier-traceability-prd.md), and [Release evidence](./06a-operations-release-evidence-prd.md)

## 1. Purpose and boundary

This PRD connects domain requirements into journeys that a customer can finish.
The linked domain PRD owns calculations, legal meaning, permissions, and state
transitions. This document owns the **cross-module scenario and observed user
outcome**. A case ID below is a test-planning anchor, not a second feature owner
or a claim that the implementation has passed.

“All edge cases” cannot be established by a finite list. For each enabled
transition, QA must apply the coverage dimensions in section 2, then add a
case when a new rule, provider, state, or incident exposes a missing boundary.
The tables below are the mandatory starting set for P0 and the named later
tiers. An edge case passes only when the source invariant, downstream state,
visible message, audit, and recovery all agree at one fixed revision.

## 2. Required coverage method

For each enabled action, record the valid path and test these dimensions where
applicable:

| Dimension | Minimum negative or boundary pair | Expected product behavior |
|---|---|---|
| Identity and access | Wrong tenant, entity, person, role, field, delegated scope, expired session, and changed permission while open | Deny server-side; remove protected detail and queued action without existence leakage |
| Version and time | Before/at/after effective date and cutoff; stale record, concurrent command, duplicate replay, rehire, overlapping engagement | Preserve history, reject or supersede deterministically, expose the version and safe retry path |
| Data quality | Missing, malformed, duplicate, conflicting, large, Unicode, and imported facts | Identify source owner and affected rows; do not silently coerce a money or identity fact |
| Multi-step action | Abandon, cancel, back/refresh, second tab, timeout, offline interruption, and resumed draft | Show whether anything committed; never duplicate a high-impact action |
| External result | Success, explicit rejection, partial acceptance, no callback, late callback, duplicate callback, and provider outage | Persist intent and reconciliation state; distinguish unknown from failed and from complete |
| Downstream change | Source corrected before/after snapshot or lock; consumer unavailable; event replay/out-of-order delivery | Reconcile versions and show a named pending handoff or governed correction |
| UX and accessibility | 375/768/1280 widths, keyboard/screen reader, zoom, text spacing, light/dark, low bandwidth, long localized text | Preserve the same decision, status, and recovery path without hidden controls |
| Evidence and operations | Audit gap, stale report/export, restore, rule change, legal hold, and expiring provider credential | Block an unsupported completion claim; assign owner, alert, and evidence link |

The test plan names the actor, tenant/entity/person, starting state, fact/rule
versions, action, competing event, expected persisted state, UI/copy, audit,
and evidence ID. Pairwise reduction may shorten low-risk combinations; it must
not remove a statutory boundary, sensitive-field denial, duplicate money
movement, or unknown external outcome.

## 3. P0 critical journey matrix

### A. Hire, person record, and employment change

Owners: [Core HR](./01-core-hr-lifecycle-prd.md),
[domain contracts](./00a-suite-domain-contracts-prd.md),
[lifecycle transitions](./00b-lifecycle-transition-contracts-prd.md), and
[implementation](./09-implementation-migration-cockpit-prd.md).

| Case | Trigger and boundary | Required outcome and visible recovery |
|---|---|---|
| CJ-HR-01 | Accepted hire arrives twice, is updated, or is rescinded before start | One versioned person/employment result; rejected or rescinded work is visible to authorized HR with no orphaned access or payroll profile |
| CJ-HR-02 | Start is delayed after tasks and permissions were provisioned | Recalculate effective tasks and access; show the new date and owners; preserve completed evidence |
| CJ-HR-03 | Same human has rehire or concurrent employments across entities | Keep person, worker, and employment IDs distinct; each manager, policy, pay input, and document resolves to the correct engagement |
| CJ-HR-04 | Import suggests a duplicate person or a many-to-one identifier match | Hold affected rows for human resolution; show source lineage and downstream consequences before any merge |
| CJ-HR-05 | Manager, entity, location, or compensation change crosses a payroll or access cutoff | Preview affected periods and systems; commit the effective version once; route late pay effects through a governed correction |
| CJ-HR-06 | Exit or rehire overlaps unreturned asset, active case, scheduled shift, and unpaid FnF | Show separate work owners and statuses; do not label the lifecycle complete until required handoffs reconcile |

### B. Time, leave, manager decision, and pay input

Owners: [Workforce](./02-workforce-management-prd.md),
[Service](./04-employee-manager-service-prd.md), and
[Payroll](./05-india-payroll-prd.md).

| Case | Trigger and boundary | Required outcome and visible recovery |
|---|---|---|
| CJ-TIME-01 | Cross-midnight shift, time-zone change, holiday boundary, or daylight-saving boundary | Preserve original event zone and interval; display local and payroll-period interpretation; route ambiguous or invalid intervals to review |
| CJ-TIME-02 | Leave balance changes while an approval is open; second manager acts from another tab | One authoritative decision and reservation; stale actor sees the changed balance/decision and a safe next action |
| CJ-TIME-03 | Clock event is late, missing, duplicated, or imported after time approval | Mark the source exception and affected pay input version; never silently revise a frozen payroll input |
| CJ-TIME-04 | Overtime, comp-off, leave, and unpaid absence overlap | Apply the configured precedence once; explain rejected or split units and show the approving owner |
| CJ-TIME-05 | Manager delegation expires or team membership changes mid-review | Recheck authority at commit; preserve the request; send it to a valid approver without disclosing protected team data |
| CJ-TIME-06 | Approved input changes after payroll snapshot | Show its prior snapshot and delta, affected run/person, and correction owner; prevent an untracked second payment |

### C. India payroll close, payout, statutory, and accounting

Owners: [Payroll](./05-india-payroll-prd.md),
[Statutory](./05a-india-payroll-statutory-prd.md),
[Controls](./05b-india-payroll-controls-edge-cases-prd.md), and
[Transitions](./05c-payroll-statutory-transition-tables-prd.md).

| Case | Trigger and boundary | Required outcome and visible recovery |
|---|---|---|
| CJ-PAY-01 | Joiner, exiter, transfer, retro pay, or two concurrent employments span one period | Segment by effective date and signed rule version; reconcile person, employment, entity, taxable, and net totals |
| CJ-PAY-02 | Net pay becomes zero/negative or recovery exceeds the legal/configured bound | Block unsafe payout; show the capped/deferred component, source rule, reviewer, and next period effect |
| CJ-PAY-03 | Two operators approve or lock the same run from stale views | Exactly one authorized state transition; losing actor sees current version and no duplicated intent |
| CJ-PAY-04 | Bank file is prepared, submitted, partially accepted, returned, or has no acknowledgment | Show counts and money by exact state; unknown remains open; retry only after bank evidence and idempotency check |
| CJ-PAY-05 | Statutory return is generated, submitted, accepted, rejected, corrected, or paid separately | Keep return and payment evidence distinct; show the obligation still due and correction owner until both reconcile |
| CJ-PAY-06 | Payment date crosses a tax-law/form transition or a rule changes after lock | Select the signed period/payment-date rule; keep old outputs reproducible and route new effect to a versioned correction |
| CJ-PAY-07 | Journal export is rejected or finance mapping changes after approval | Keep payroll locked; expose the failed accounting handoff and approved mapping correction without changing employee pay |
| CJ-PAY-08 | Payslip or tax certificate is requested before verified publication/official issue | Display the actual pending state; grant no premature document and no sensitive data in notification or URL |

### D. Employee service, talent, and restricted work

Owners: [Service](./04-employee-manager-service-prd.md),
[Talent and rewards](./03-talent-experience-rewards-prd.md), and
[Platform](./06-platform-intelligence-compliance-prd.md).

| Case | Trigger and boundary | Required outcome and visible recovery |
|---|---|---|
| CJ-SVC-01 | Request is routed to a departed/unauthorized owner or SLA is paused repeatedly | Reassign within scope; retain SLA and pause history; show the requester a safe status without exposing internal case detail |
| CJ-SVC-02 | Restricted case is opened from a general inbox/search/deep link | Enforce field/object grant at server and derived surfaces; do not reveal subject, count, attachment, or existence |
| CJ-SVC-03 | Employee changes a bank, tax, or identity fact while a payroll run is locked | Confirm effective date and verification path; show which run is unaffected and who owns any correction |
| CJ-TAL-01 | Reviewer exits or calibration/compensation approval conflicts with a newer employment version | Reassign authorized review, retain evidence, and recalculate the decision preview before commit |
| CJ-TAL-02 | Reward or promotion is approved after the pay cutoff | Show effective date, budget, payroll handoff state, and next eligible run; do not imply current pay changed |
| CJ-TAL-03 | Benefits/award provider accepts only some members or sends a duplicate callback | Reconcile member-level states and cost; preserve one entitlement/award consumption per approved intent |

### E. Setup, migration, and customer cutover

Owner: [Implementation cockpit](./09-implementation-migration-cockpit-prd.md).

| Case | Trigger and boundary | Required outcome and visible recovery |
|---|---|---|
| CJ-IMP-01 | Import has invalid rows, duplicate identities, or partial commit | Preview exact row outcome and control totals; retry only rejected eligible rows with lineage intact |
| CJ-IMP-02 | Opening/YTD values aggregate incompatible employments or disagree with historical payroll | Block cutover; show variance by person, entity, component, tax year, and source period |
| CJ-IMP-03 | Legacy data changes during parallel run or after freeze | Record delta, rerun comparison, and require renewed sign-off; no silent live switch |
| CJ-IMP-04 | First live run differs from signed parallel run or rollback boundary has passed | Freeze further irreversible acts, assign incident owner, and show approved rollback or forward-correction route |

## 4. P1, P2, and P3 extension cases

| Tier/case | Enabled capability | Required additional acceptance |
|---|---|---|
| P1 CJ-EXT-01 | Multi-entity/group payroll | Registration, bank, cost, and statutory totals remain separate even when a group view aggregates them |
| P1 CJ-EXT-02 | Configurable workflows/forms | New versions do not rewrite in-flight approvals; revoked field grants disappear from drafts, exports, and notifications |
| P1 CJ-EXT-03 | Contractor pay and benefits | Worker type and tax/benefit eligibility remain explicit; no employee-only rule is silently inherited |
| P2 CJ-EXT-04 | Assistant or recommendation | Inaccessible source, contradictory fact, prompt injection, and unsupported legal conclusion lead to abstention or a cited, permission-safe suggestion |
| P2 CJ-EXT-05 | Simulation or cross-work staffing | Scenario assumptions and source freshness are visible; publishing requires domain approvals; simulation never mutates payroll or employment |
| P3 CJ-EXT-06 | New country or regulated partner | Country pack has its own signed rules, data residency, provider states, support model, and migration/rollback evidence before sale or enablement |

## 5. Interface review for every case

The reviewer captures the page at entry, decision preview, pending, final, and
recovery states. The primary action, exact status, affected scope/period, source
freshness, owner, and next step must be discernible without reading an audit
log. A second authorized operator may inspect the evidence; an employee sees
only their own safe explanation. A denied actor learns no protected fact.

Use [PRD 07b](./07b-experience-content-quality-prd.md) for page layout, copy,
accessibility, and task-study rules; [PRD 07a](./07a-page-permission-manifest-prd.md)
for canonical route and grant. A design mock alone does not pass this review:
test in a browser with persisted records and realistic source/provider states.

## 6. Acceptance and maintenance

- [ ] Every enabled P0 critical journey above has a named domain owner, route,
      actor, starting fixture, expected state/UI, negative pair, and evidence ID.
- [ ] Every P0 case passes source/database/contract checks and a browser
      recovery check at one fixed application, rule, and provider revision.
- [ ] A permission or sensitive-field case includes direct-link, search,
      export, notification, and stale-session denial where applicable.
- [ ] Money movement and statutory cases include partial, unknown, late, and
      duplicate external outcomes with reconciliation evidence.
- [ ] P1/P2/P3 extension cases are added to the release ledger before their
      capabilities are enabled; no tier skips the applicable P0 trust rules.
- [ ] New incidents, rule changes, and customer edge cases update this matrix
      and the owning domain fixture before the next affected release.


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
| FR-ARCH-004 | Restore the ScopedRead sensitive-data seam |
| FR-ARCH-005 | Enforce access revocation and actor lifecycle across surfaces |
| FR-ARCH-007 | Make payroll eligibility explicit for workers and employments |
| FR-ARCH-009 | Version and validate every frozen snapshot section |
| FR-ARCH-010 | Prove snapshot completeness and source provenance |
| FR-ARCH-011 | Make HR input-period build, lock and unlock atomic and versioned |
| FR-ARCH-012 | Preserve locked history and route late changes through correction |
| FR-ARCH-014 | Define business dates and approved time quantities |
| FR-ARCH-015 | Reconcile bank-return files idempotently with per-row outcomes |
| FR-ARCH-017 | Preserve payout coverage, run transitions and stale-approval controls |
| FR-ARCH-018 | Make leave-to-payroll and downstream projection intent durable |
| FR-ARCH-019 | Make accepted-hire onboarding and BGV handoff repairable |
| FR-ARCH-020 | Preserve the Payroll-to-Accounting posting seam |
| FR-ARCH-021 | Keep Calendar projections visibility-safe and failure-aware |
| FR-ARCH-023 | Ground AskOS in owner reads, effective policies and current authority |
| FR-ARCH-026 | Share employee prefetch and infinite-list identity |
| FR-ARCH-027 | Concentrate Action Center source behavior |
| FR-ARCH-031 | Make document publication and cleanup recoverable |
| FR-ARCH-032 | Validate downloads and reauthorize export lifecycle |
| FR-ARCH-035 | Prove full task states, responsive and accessible journeys |
| FR-ARCH-036 | Migrate by expand, reconcile, enforce and retire |
| FR-ARCH-038 | Require complete fixed-revision release and capability evidence |
