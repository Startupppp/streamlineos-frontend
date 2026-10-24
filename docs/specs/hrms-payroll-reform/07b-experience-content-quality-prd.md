# StreamlineOS People + Payroll Experience and Content Quality PRD

**Status:** Normative cross-suite experience contract  
**Owner:** People Product Experience + Content Design  
**Priority:** P0 interaction and content quality; P1 configurable depth; P2 guided insight  
**Applies to:** Employee, manager, HR, payroll, finance, auditor, and implementation journeys  
**Parents:** [Suite PRD](./00-suite-product-prd.md), [Pages](./07-pages-navigation-roles-prd.md), and [Manifest](./07a-page-permission-manifest-prd.md)

## 1. Outcome and ownership

A person can recognize the next action, understand its effect, complete it with
minimal re-entry, and recover when facts or external systems disagree. Dense
operator screens remain calm and scan-friendly. Employees see plain-language
answers about their own work and pay; authorized specialists can inspect exact
facts, versions, and evidence without switching to an unsafe general view.

This PRD owns shared interaction, visual, accessibility, and content rules. A
domain PRD owns the action, calculation, state, and legal meaning. PRDs 07/07a
own canonical routes and access. A shared visual pattern must never widen a
domain permission or invent a second source of truth.

## 2. Primary experience promises

| Persona | First question the page answers | Primary path | Failure/recovery path |
|---|---|---|---|
| Employee | What needs me, and what happens next? | `/me` → one task → confirmation and status | Correct a submitted mistake or contact the named owner |
| Manager | Which team decision is due, and what are its consequences? | `/me/team` or `/me/approvals` → contextual decision | Return for changes, delegate within scope, or escalate |
| HR operator | Which people or policy exceptions put work at risk? | `/hr` → scoped queue → person/request → resolution | Assign owner, repair source fact, retry downstream handoff |
| Payroll operator | What blocks this pay period from closing safely? | `/payroll` → inputs → preflight → review → approve/lock → payout/statutory/accounting | Resolve source, recalculate, reconcile unknown outcome, or open governed correction |
| Finance approver | What cash or journal decision requires my authority? | Funding/journal queue → totals and source → approve or return | Reconcile against bank or Accounting acknowledgment |
| Auditor | Which exact actor, rule, version, and evidence produced this result? | Purpose-scoped record → timeline → evidence/export | Request access or record an evidence gap |

## 3. Page and navigation contract

- **FR-UX-001:** A page begins with a precise title, one-sentence purpose when
  needed, context (entity/person/period), current status, freshness/as-of time,
  primary action, and a link to its authoritative detail or help. The page
  exposes only actions authorized for that actor and record state.
- **FR-UX-002:** Home pages show actionable work before summary charts.
  Cards and queues state why an item is here, owner, deadline, severity,
  affected count, and next action. Counts are scope-safe and drill through to
  the same filtered records.
- **FR-UX-003:** An administrative list uses one search/filter/sort predicate for
  rows, count, export, saved view, and bulk action. Shareable state survives
  refresh, direct links, and Back/Forward. Filters show active chips and a
  clear reset; an empty filtered result does not masquerade as no data.
- **FR-UX-004:** Detail pages show current facts first and provide separate
  history, pending/future changes, documents, related work, and audit views.
  Every important number offers its source, unit, effective period, and owner.
- **FR-UX-005:** The navigation in PRD 07 uses no more than two sidebar levels.
  P1/P2 functions appear progressively when entitled; a P0 employee or
  manager journey never requires an admin route. A deep link to a denied or
  deleted record gives a safe, understandable destination without existence
  leakage.

## 4. Task and decision contract

- **FR-UX-006:** Forms group fields by the user's decision, prefill only
  authorized current facts, mark optional versus required, preserve drafts
  where safe, and show validation beside the field plus a navigable error
  summary. Dates distinguish effective date, submission time, and pay period.
- **FR-UX-007:** A high-impact preview states affected people/entity/period,
  before and after, source versions, money or access effect, downstream
  handoffs, irreversible boundary, approvers, and recovery. Confirmation uses
  a specific action verb such as “Lock payroll” rather than “Submit.”
- **FR-UX-008:** Approvals display the requester's relevant evidence and
  policy basis, conflict or missing data, consequence of approve/reject/return,
  and delegation authority. No self-approval is implied by the UI; a rejected
  or stale command preserves the user's context and explains the next step.
- **FR-UX-009:** Bulk work declares whether selection means visible rows,
  selected IDs, or all matching results. Preflight shows eligible/ineligible
  counts and reasons. A job returns progress, per-record outcomes, retry rules,
  and a safe export of failures.
- **FR-UX-010:** Payroll review shows gross, employee deductions, employer
  cost, net, prior-period delta, and control totals as distinct concepts. Every
  result drills into the frozen input, effective compensation, rule/formula
  version, override, and reviewer; unknown payout or filing remains visibly
  unresolved until authoritative evidence arrives.
- **FR-UX-011:** A long or external operation returns a durable job/intent ID,
  last known state, owner, update time, and safe next action. The interface
  does not label a generated artifact “filed,” a bank file “paid,” or an
  internal tax worksheet an official certificate.

## 5. State, error, and content model

| State | Required content and action |
|---|---|
| First use / empty | Explain what belongs here, who can create it, and the single relevant setup action |
| No filter matches | Repeat the active search/filter context; offer clear filters, not “create first record” |
| Loading / refreshing | Keep the page structure stable; show which data is refreshing without erasing a valid prior result |
| No permission / disabled module | Say access is unavailable or the module is disabled without exposing protected names or counts; give an appropriate access path |
| Validation error | Name the field, problem, valid example or constraint, and preserved input |
| Stale version / concurrent edit | Show what changed, by whom when allowed, and compare/reload/reapply choices |
| External failure / unknown | Distinguish rejected, timed out, and unknown; name the owner and reconciliation step; suppress blind retry |
| Partial batch result | Show successes, failures, excluded records, totals, and a retry limited to eligible failures |
| Completed action | State exact new status, effective time, downstream pending work, and where to track or reverse it |

- **FR-UX-012:** Each page and action implements the applicable states above.
  Domain-specific exception text names the source owner and recovery action;
  it never exposes hidden fields, a protected subject, or raw provider errors.
- **FR-UX-013:** Copy uses one term per concept from PRD 00a. “Worker” is a
  model term; employee-facing copy uses “employee” or “contractor” as
  appropriate. Labels distinguish request, approval, calculation, lock,
  submission, payment, filing, acknowledgment, correction, and closure.
- **FR-UX-014:** Money is formatted with currency and period, and never
  collapses CTC, gross pay, net pay, employer cost, tax projection, and paid
  amount into one “salary” label. Dates show timezone where a cutoff or
  cross-border action depends on it. Projections name assumptions and
  uncertainty; historical facts show an as-of date.
- **FR-UX-015:** Sensitive communication has a safe subject, audience preview,
  attachment visibility, and delivery status. It does not put salary, medical,
  investigation, bank, tax ID, or restricted case details in push/email subject,
  analytics, general search, or unscoped AI context.

| Ambiguous copy to avoid | Required status language |
|---|---|
| “Done” after an approval click | “Approved; payroll input is pending” or the actual next state |
| “Paid” after creating a bank file | “Bank file ready for submission” until a payment acknowledgment reconciles |
| “Filed” after generating a return | “Return prepared” until submission and filing evidence exists |
| “Form 130 generated” for an internal PDF | “Tax worksheet preview”; only a TRACES-retrieved, signed certificate is “Form 130 issued” |
| “Employee left” while handoffs remain | “Employment ended; access, assets, and FnF tasks remain open” |

## 6. Visual, responsive, and accessible quality

- **FR-UX-016:** Use shared design tokens for canvas, raised surface, sheet,
  dialog, focus, semantic status, and data density. Operational lists favor
  readable tables and restrained color; a hub may use a richer surface when
  contrast and task scanning remain strong. No hard-coded white overlay may
  collapse light or dark mode contrast. Keep all six displayed payroll money
  concepts visually distinct by label and grouping, not color alone.
- **FR-UX-017:** At 375, 768, and 1280 CSS-pixel widths, priority actions,
  filters, totals, and exceptions remain reachable. Dense tables may scroll
  within their region and provide a record-detail/list alternative on small
  screens; the entire page must not require two-dimensional scrolling for
  ordinary self-service tasks. Touch and keyboard reach the same actions.
- **FR-UX-018:** Meet [WCAG 2.2 AA](https://www.w3.org/TR/WCAG22/) on every P0
  journey. Test keyboard order, visible and unobscured focus, names/roles,
  status announcements, error association, reflow, zoom, text spacing,
  contrast, target size, and accessible authentication. Dialogs restore focus;
  async validation and job status are announced without stealing focus.
- **FR-UX-019:** Support reduced motion, low-bandwidth loading, interruption,
  long names, Unicode scripts, local date/number formats, and translations
  without truncating identity, money, status, or action labels. Offline data
  and queued writes are shown only where the domain explicitly allows them.
- **FR-UX-020:** Reuse established control and content patterns across HRMS
  and Payroll. A new pattern requires a named user problem, design-system
  review, light/dark and responsive evidence, and an accessible equivalent.

## 7. Journey validation and metrics

### Screen anatomy by job

| Screen pattern | First viewport | Decision area | Persistent context and recovery |
|---|---|---|---|
| Employee self-service | One current task or answer, its status, and a plain-language next step | Small form or request detail with policy/source help beside the decision | Draft state, confirmation, owner, and status timeline remain findable after leaving |
| Manager queue | Due and blocked decisions first; team scope and deadline are visible | Evidence, policy basis, consequences, and approve/return controls share one reading path | Delegation, stale decision, and reassignment explain what changed without exposing another team's facts |
| HR record/collection | Search, scope, active filters, count/freshness, and exceptions precede charts | Current effective facts and pending changes appear separately; bulk preview names exact selection | History, related work, audit, and failed-row export stay available through a durable record/job ID |
| Payroll workbench | Entity, period, run version, cutoff, blockers, and six distinct money concepts are visible | Preflight → variance/source drilldown → approval/lock is a guided sequence with irreversible boundary | Payout, statutory, journal, and publication each keep their own state, owner, evidence, and recovery action |
| Exception detail | Severity, affected population/period, source, first detection, and owner are explicit | Fix source, return for correction, reconcile, or escalate is selected according to authority | Before/after, attempts, evidence, SLA, and unresolved downstream effects stay on one timeline |
| Implementation cockpit | Phase, signed gate, source inventory, variance, and next blocker are visible | Mapping/import or cutover preview shows affected records, totals, approvers, and rollback boundary | Decision log, partial row results, parallel-run comparisons, and stabilization handoff are durable |

Within each pattern, visual hierarchy follows **context → problem → evidence →
action → result**. Use one dominant action for the current state; secondary
actions must remain discoverable without competing emphasis. Tables use stable
columns, clear numeric alignment and units, row labels that survive horizontal
scroll, and visible sort/filter state. A drawer or dialog names its parent
record, has a clear close/cancel path, and returns focus to the invoking action.
The interface may be dense for trained operators, but it may not bury a cutoff,
unknown money state, denied action, or recovery instruction in decoration.

The [critical-journey matrix](./07c-critical-journeys-edge-cases-prd.md) is the
browser review set for these screen patterns. Design sign-off records annotated
screens for entry, decision, pending, error, and recovery states, plus the
responsive, light/dark, keyboard, and screen-reader result at a fixed revision.

The design team tests the critical tasks in section 2 with representative
employees, managers, HR, payroll, and finance users across the selected
customer-size and workforce cohorts. The study records task completion,
time-on-task, wrong-action rate, assistance, confusion, recovery, and
confidence. Product and Design approve numerical improvement targets **before**
comparing a redesigned flow with the baseline; a competitor screenshot or a
mock does not establish superiority.

P0 release review includes one small-company and one multi-entity scenario,
first use and repeat use, desktop and mobile, light and dark modes, keyboard
and screen reader, and source/provider failure. Payroll and employment
confirmation tests must show that participants can identify the affected
person/period, money or access consequence, and whether the action is
reversible before confirming.

## 8. Acceptance criteria

- [ ] Every P0 canonical page maps its primary job, actor, action, states,
      copy owner, authorization, and test evidence to PRDs 07/07a/06a.
- [ ] Employee, manager, HR, payroll, finance, and auditor critical paths are
      usable without a cross-role administrative detour.
- [ ] No released P0 action relies on a generic success message when a
      downstream payment, filing, access, or integration remains pending.
- [ ] A high-impact action passes preview, stale-state, denial, duplicate,
      partial-failure, and recovery tests with human-readable content.
- [ ] The critical journey study has recorded baseline, predeclared target,
      participants/cohorts, observed results, unresolved problems, and owner.
- [ ] P0 views pass responsive and light/dark inspection plus WCAG 2.2 AA
      browser checks at one fixed frontend/backend revision.


## Architecture hardening acceptance (2026-10-24)

The following additive acceptance belongs to [PRD 16](./16-architecture-hardening-prd.md)
and must be applied to this domain through [guide 17](./17-claude-architecture-execution.md).
Business facts, tiers and existing acceptance remain owned here. FR-ARCH identifiers
have one definition in PRD 16 and one criterion status in the
[architecture execution ledger](./architecture-review/execution-ledger.json);
this routing table does not duplicate or pre-close an implementation task.

| Requirement | Applicable architecture obligation |
|---|---|
| FR-ARCH-029 | Keep shareable filters and navigation state consistent |
| FR-ARCH-035 | Prove full task states, responsive and accessible journeys |
