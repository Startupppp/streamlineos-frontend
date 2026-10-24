# StreamlineOS Employee, Manager, and HR Service PRD

**Status:** Normative domain PRD  
**Owner:** People Experience and Service Delivery  
**Priority:** P0 self-service, manager workspace, approvals, and case handling  
**Depends on:** Core HR, Workflow, Knowledge, Notifications, Chat, Calendar, Mail

## 1. Outcome

Employees and managers have one clear place to complete people work. HR
receives structured, prioritized, privacy-safe service queues instead of
repeated messages across disconnected channels.

## 2. Scope

### P0 — required

- Employee home and self-service navigation for profile, time, pay, documents,
  expenses, lifecycle tasks, policies, goals, requests, and entitled
  growth/learning destinations.
- Manager team home with roster, availability, lifecycle events, pending work,
  goals/development signals, and permission-safe quick actions.
- One approvals inbox for leave/WFH, attendance, schedule/overtime, expenses,
  travel, documents, lifecycle, and configured HR workflows.
- Employee HR helpdesk with service categories, request forms, SLA, assignee,
  status, messages, attachments, and resolution.
- Restricted core case management for employee relations, investigation,
  grievance, discipline, accommodation, safety, and legal escalation; specialist
  accommodation/safety/labor workflows are P1.
- HR service catalog and knowledge suggestions.
- Company announcements and targeted HR communications.
- Tasks, reminders, notifications, preferences, delegation, and escalation.
- Mobile and low-bandwidth support for request/response, approval, check-in,
  leave, payslip, onboarding tasks, and manager team exceptions.

### P1 — complete suite

- Configurable employee journeys for onboarding, probation, promotion,
  parental leave, relocation, return to work, and exit.
- Omnichannel intake from app, email, chat, and approved forms with deduplication.
- Case templates, checklists, related people, restricted notes, evidence,
  interview records, outcome, appeal, and retention.
- HR service metrics, workload balancing, routing, macros, knowledge feedback,
  satisfaction, and reopen.
- Emergency contact and location plan management.
- Workplace accommodations with strict separation of medical evidence from
  manager-visible implementation needs.
- Labor/union relations records and controlled consultation workflows.
- Personalized home cards and notification digests.

### P2 — differentiators

- Permission-grounded HR assistant that answers policy questions with citations
  and creates drafts or service requests after confirmation.
- Proactive detection of overdue lifecycle work, inconsistent policy
  application, SLA risk, missing evidence, or payroll-blocking service issues.
- Cross-work resolution: schedule a meeting, open an authorized chat, create a
  calendar hold, request a project handover, or send a templated email without
  copying protected HR facts.
- One “My Work” queue across HR and other StreamlineOS products with
  product-owned decisions and deep links.

### Out of scope

- General IT/customer support ticketing, social feed, or enterprise chat replacement.
- Legal, medical, tax, or employment advice from AI.
- Payroll administration and Recruitment candidate service.
- Manager access to investigation, medical, whistleblowing, or legal material
  without a separately authorized role.

## 3. Personas and Default Homes

| Persona | Default experience |
|---|---|
| Employee/contractor | `/me` — personal tasks, requests, facts, and recommendations |
| Manager | `/me/team` — direct/matrix team overview and manager work |
| HR service agent | `/hr/service` — queue, SLA, knowledge, and service analytics |
| HR case specialist | `/hr/cases` — restricted case work |
| HR leader | `/hr` — command center, exceptions, workload, and outcomes |
| Approver/delegate | `/me/approvals` — authorized decisions only |

Administrative product navigation must not be required for employee or manager
self-service.

## 4. Service Model

### Request versus case

- A **service request** is employee-visible operational work such as a letter,
  profile correction, policy question, payroll query, or benefit inquiry.
- A **case** is restricted work requiring controlled evidence, notes, parties,
  outcomes, or legal/employee-relations handling.
- A request may be escalated into a case. The employee-visible request retains
  a safe status and communications view; restricted case content is not copied back.
- “Service delivery” is not a separate duplicate page. The service workspace
  owns requests; the case workspace owns restricted cases.

### State models

Service request:

`DRAFT → SUBMITTED → TRIAGED → IN_PROGRESS → WAITING_ON_EMPLOYEE |
WAITING_ON_INTERNAL → RESOLVED → CLOSED`

An allowed reopen records a `REOPENED` event and returns the request to `IN_PROGRESS`.

Restricted case:

`OPEN → ASSESSMENT → INVESTIGATION | ACTION_PLAN → OUTCOME_REVIEW →
RESOLVED → APPEAL | CLOSED → RETAINED`

Legal hold is a linked overlay from PRD 00b; it does not become a case state.

Approval:

`PENDING → APPROVED | REJECTED | RETURNED | CANCELLED | EXPIRED | REASSIGNED`

## 5. Functional Requirements

### Employee home and service

- **FR-SVC-001:** Employee home shows only current, actionable, authorized
  cards with owner, due date, status, and destination.
- **FR-SVC-002:** Profile self-edit separates direct edits, verified-field
  changes, and HR-review requests.
- **FR-SVC-003:** Service catalog presents customer language, expected SLA,
  required information, visibility, and fulfillment path.
- **FR-SVC-004:** Intake forms are versioned and may prefill only permitted
  employee facts; submitters can review exactly what will be shared.
- **FR-SVC-005:** Suggested knowledge appears before submit but never blocks a
  request or exposes restricted articles.
- **FR-SVC-006:** Employees can follow status, respond, attach, rate, and reopen
  according to policy without seeing internal notes.

### Manager workspace

- **FR-SVC-007:** Team home defaults to direct reports and supports authorized
  dotted-line or delegated scope as clearly labeled views.
- **FR-SVC-008:** Team status combines availability, schedule, leave/WFH,
  attendance exceptions, lifecycle tasks, goals/reviews, expiring requirements,
  and workload signals through scoped read models.
- **FR-SVC-009:** Managers may act only through product-owned commands; a team
  dashboard cannot bypass the source product's authorization or validation.
- **FR-SVC-010:** Sensitive reasons, pay details, cases, medical facts, private
  feedback, and unrelated performance data are absent unless separately permitted.
- **FR-SVC-011:** Manager delegation is task/type/time bounded, visible,
  revocable, and audited; it does not copy the delegator's role.

### Unified approvals

- **FR-SVC-012:** Every approval item uses a normalized envelope containing
  source product, record, requester, submitted/due date, summary, risk/impact,
  allowed actions, version, and deep link.
- **FR-SVC-013:** Source domains own decision rules. The inbox orchestrates but
  does not duplicate leave, expense, payroll, or lifecycle logic.
- **FR-SVC-014:** Bulk approval is available only for homogeneous, low-risk
  actions with per-record revalidation and results.
- **FR-SVC-015:** High-impact actions—termination, salary change, payroll lock,
  payout, legal hold, and access removal—require their dedicated workflow and
  cannot be generic one-click approvals.
- **FR-SVC-016:** Stale, already-decided, reassigned, or unauthorized items show
  a safe resolved state and cannot replay a decision.

### Service requests and SLAs

- **FR-SVC-017:** Category, entity/location, employee facts, language, priority,
  and workload may route a request; rules are previewable and audited.
- **FR-SVC-018:** SLA policy distinguishes first response, update, resolution,
  business calendar, pause conditions, breach warning, breach, and escalation.
- **FR-SVC-019:** Agents can assign, collaborate, request information, use
  approved macros, link knowledge, resolve, merge duplicates, and convert to case.
- **FR-SVC-020:** Email/chat intake preserves external message IDs and threading
  and cannot create duplicate requests on retry.
- **FR-SVC-021:** Resolution requires category-specific outcome and safe
  employee-visible explanation where policy requires.

### Restricted cases

- **FR-SVC-022:** Case access is explicit and purpose-based; normal HR view or
  manager scope is insufficient.
- **FR-SVC-023:** Case fields support category, allegations/issues, people,
  conflicts, chronology, evidence, interviews, findings, actions, appeal,
  retention, and hold.
- **FR-SVC-024:** Restricted notes, privileged/legal material, medical evidence,
  and employee-visible communications are separate projections.
- **FR-SVC-025:** Evidence upload records hash, source, chain-of-custody events,
  malware status, access, and retention.
- **FR-SVC-026:** Conflict-of-interest rules block or flag assignment and require
  authorized override.
- **FR-SVC-027:** Closing a case cannot delete immutable chronology or evidence.

### Accommodations, safety, and employee relations

- **FR-SVC-028:** Accommodation records separate requested workplace need,
  medical evidence, review, approved adjustment, manager instruction, and expiry.
- **FR-SVC-029:** Managers receive only the approved operational adjustment,
  not diagnosis or private evidence.
- **FR-SVC-030:** Safety incidents support severity, location, people, immediate
  action, investigation, corrective actions, regulatory references, and closure.
- **FR-SVC-031:** Emergency pages expose current location plans and authorized
  contact data with strict export and audit controls.
- **FR-SVC-032:** Labor/union records and whistleblowing intake use restricted,
  non-retaliation-aware access and retention policies.

### Announcements, knowledge, tasks, and notifications

- **FR-SVC-033:** Announcements support draft, audience preview, schedule,
  publish, expiry, acknowledgment, and channel delivery.
- **FR-SVC-034:** HR knowledge supports owner, audience, locale, version,
  review date, related policy, feedback, and search.
- **FR-SVC-035:** Lifecycle and service tasks have assignee type, due rule,
  dependency, completion evidence, escalation, and source record.
- **FR-SVC-036:** Notification preferences cannot disable legally or
  operationally mandatory notices but may control channel/digest where allowed.
- **FR-SVC-037:** Every notification is permission-safe at open time and falls
  back to a non-leaking destination if access or record state changed.

### Permission-grounded assistant

- **FR-SVC-038:** The assistant retrieves only records and fields the actor may
  access and cites policy/document versions and effective dates.
- **FR-SVC-039:** When facts conflict, are missing, or depend on legal judgment,
  it abstains and offers the correct service path.
- **FR-SVC-040:** Drafting, form prefilling, scheduling, or action creation
  requires preview and explicit confirmation.
- **FR-SVC-041:** The assistant cannot reveal another employee's private data,
  decide a case, approve a request, change pay, or trigger employment action.
- **FR-SVC-042:** Experience owns journey templates, participant progress, and
  employee/manager UX; Core owns lifecycle state/required domain tasks and
  Platform owns execution primitives. A journey cannot override a domain state.
- **FR-SVC-043:** Configurable journeys for onboarding, probation, promotion,
  parental leave, relocation, return, and exit are templates over Core state;
  they cannot skip required domain tasks or invent employment states.
- **FR-SVC-044:** Approved email, chat, Slack, or WhatsApp channels use the
  same permission-safe payload and preference rules; they never become a
  second request, case, or payroll store.

## 6. Required Pages

### Self-service

- `/me` — employee home and My Work.
- `/me/profile`, `/me/documents`, `/me/pay`, `/me/time-off`,
  `/me/attendance`, `/me/expenses`, `/me/performance`, entitled `/me/learning`.
- `/me/help` — service catalog, knowledge, requests, request detail.
- `/me/approvals` — manager/delegate inbox.
- `/me/team` — manager home; domain tabs deep-link to owning products.
- `/me/notifications` and `/me/preferences`.

### HR operations

- `/hr` — command center.
- `/hr/service` and `/hr/service/requests/[requestId]`.
- `/hr/cases` and `/hr/cases/[caseId]`.
- `/hr/accommodations`, `/hr/safety`, `/hr/emergency`,
  `/hr/labor-relations`, `/hr/legal-holds`.
- `/hr/knowledge`, `/hr/announcements`, `/hr/journeys`.
- `/hr/settings/delegations` and `/hr/settings/service` — catalog, routing,
  SLA, macros, satisfaction, and bounded delegation.

Canonical route migration and role visibility are defined in PRD 07.

## 7. UX Requirements

- One card/row action registry controls permissions, disabled reasons, order,
  telemetry, and optimistic behavior.
- Employee-visible and internal content are visually and semantically distinct.
- Queues prioritize breached/at-risk, payroll-blocking, safety-critical, and
  employee-waiting work.
- Status never relies on color alone. Timelines identify public versus internal events.
- Mobile supports request, response, attachment, approval, check-in, leave,
  payslip, and manager team essentials.
- Empty states offer the next valid action; denied states do not reveal record existence.

## 8. Success Measures

- self-service containment and knowledge helpfulness;
- request first response, resolution, reopen, satisfaction, and SLA breach;
- approval age, reassignment, stale-decision, and bulk partial-failure;
- manager weekly active use and completion of team obligations;
- case aging, overdue actions, access exceptions, and audit completeness;
- notification delivery-to-action and preference-respecting rate;
- assistant citation, abstention, escalation, confirmation, and override rate.

## 9. Acceptance Criteria

- [ ] Employees can complete every P0 self-service journey without HR navigation.
- [ ] Managers see only authorized team facts and can act without duplicated business logic.
- [ ] One approvals inbox resolves source-owned decisions and handles stale state safely.
- [ ] Service request and restricted case content are separate at query and export layers.
- [ ] SLA clocks honor business calendars and documented pause rules.
- [ ] Email/chat retry cannot duplicate a request or message.
- [ ] Accommodation instructions never expose medical evidence to managers.
- [ ] Legal hold and evidence chain-of-custody are immutable and permissioned.
- [ ] Notifications remain permission-safe after access or record changes.
- [ ] The assistant cites effective sources, abstains on ambiguity, and confirms actions.
- [ ] High-impact employment and pay actions cannot execute from generic approval or AI.


## Architecture hardening acceptance (2026-10-24)

The following additive acceptance belongs to [PRD 16](./16-architecture-hardening-prd.md)
and must be applied to this domain through [guide 17](./17-claude-architecture-execution.md).
Business facts, tiers and existing acceptance remain owned here. FR-ARCH identifiers
have one definition in PRD 16 and one criterion status in the
[architecture execution ledger](./architecture-review/execution-ledger.json);
this routing table does not duplicate or pre-close an implementation task.

| Requirement | Applicable architecture obligation |
|---|---|
| FR-ARCH-027 | Concentrate Action Center source behavior |
