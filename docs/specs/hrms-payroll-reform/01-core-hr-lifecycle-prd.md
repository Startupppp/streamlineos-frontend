# StreamlineOS Core HR and Lifecycle PRD

**Status:** Normative domain PRD  
**Owner:** People Core  
**Priority:** P0 foundation with named P1/P2 extensions  
**Depends on:** Organization, Directory, Identity, Workflow, Documents  
**Recruitment boundary:** Begins only after an accepted-hire handoff

## 1. Outcome

StreamlineOS maintains one trustworthy, effective-dated worker record from
accepted hire through exit, rehire, or concurrent engagement. Every downstream
product reads the same employment facts and can explain when and why they
changed.

## 2. Scope

### P0 — required

- Person, membership, worker, engagement, and employment records with distinct IDs.
- One or more legal entities with Organization-owned location, department,
  team, and cost-center assignments; minimum job, level, competency, salary-band
  reference, position, employment type, and primary-manager models.
- Create, invite, preboard, onboard, transfer, promote, change manager, change
  location, change status, terminate, exit, rehire, and concurrent engagement.
- Effective-dated current, future, and historical employment facts.
- Employee/HR profile, verified correction request, org chart, positions,
  worker directory, and lifecycle timeline.
- Configurable employee fields with classification, visibility, validation,
  effective-date behavior, and reporting eligibility.
- Employee document vault, document types, templates, generation, e-signature
  handoff, acknowledgment, expiry, version, retention, and legal hold.
- Policy library, publish/version, audience assignment, acknowledgment,
  reminders, and evidence.
- Individual and bulk onboarding/import with preview and row-level diagnostics.
- Exit checklist, asset/access handoff requests, payroll FnF initiation, and
  retention rules.
- Immutable audit and event publication for every material lifecycle change.

### P1 — complete suite

- Advanced cross-entity transfers and concurrent employee/contractor orchestration.
- Secondary/dotted-line managers without implicit approval authority.
- Advanced job architecture: families, multi-track levels, proficiency models,
  career paths, position control, and governed mass maintenance.
- Probation plans, extensions, confirmations, and manager reminders.
- Configurable lifecycle journeys by entity, location, worker type, and role.
- Mass reorganizations with simulation, validation, approval, scheduled
  effective date, and rollback plan.
- Right-to-work, visa, license, certification, and document-expiry tracking.
- Alumni status and controlled rehire restoration.

### P2 — differentiators

- Cross-work profile showing authorized projects, workload, skills, customers,
  goals, calendar availability, and collaboration links without copying data.
- Lifecycle impact preview: affected payroll, access, approvals, schedules,
  benefits, capacity, budgets, and integrations before confirmation.
- Proactive incomplete-record and policy-risk detection with source citations.

### Out of scope

- Candidate sourcing, pipeline, interviews, offers, scorecards, and ATS analytics.
- Credential provisioning internals; HR emits approved access lifecycle requests.
- Payroll run calculation or payout.
- Country-specific employment advice presented as legal advice.

## 3. Users and Jobs

| User | Job |
|---|---|
| Employee | View and correct permitted profile facts, sign/acknowledge documents, complete lifecycle tasks |
| Manager | View scoped team facts, complete onboarding/probation/exit work, request changes |
| HR operator | Create and change employment, manage documents/policies, resolve lifecycle exceptions |
| Organization admin | Configure Organization structures plus People jobs, positions, fields, defaults, and boundaries |
| Payroll operator | Read pay-relevant effective facts without gaining unrelated HR access |
| Auditor/legal | Review immutable change, document, acknowledgment, retention, and hold evidence |

## 4. Canonical Ownership

1. Directory owns person identity, organization membership, and discovery-safe profile.
2. People Core owns worker, engagement, employment, reporting line, job,
   position assignment, lifecycle state, and HR-sensitive profile.
3. Organization owns legal entities and organization hierarchy.
4. Identity owns credentials and sessions.
5. Core HR owns the approved effective `CompensationAssignment`; Rewards owns
   its decision workflow and Payroll owns profile, snapshot, and calculation.
6. One `EmploymentFacts`-style contract is the only cross-domain read facade.
7. New writes must not create a second mutable HR employee record.

## 5. Lifecycle State Model

### Worker lifecycle

`PREBOARDING → ACTIVE → SUSPENDED | ON_LEAVE → EXIT_PENDING → EXITED`

- Draft data is not an active employment.
- A future-dated hire becomes active through a durable scheduled transition.
- Suspension does not erase employment or history.
- Exit initiation and employment termination are distinct from completion of
  access, asset, document, and FnF work.
- Rehire emits a `REHIRED` lifecycle event and creates a new engagement/
  employment in `PREBOARDING`; it does not reactivate closed rows in place.

### Position lifecycle

`DRAFT → REQUESTED → APPROVED → OPEN → FILLED → FROZEN | CLOSED`

Approved/open positions may be handed to Recruitment. Recruitment returns
candidate/hire references; it cannot mutate position budgets or employment.

## 6. Functional Requirements

### Worker and employment records

- **FR-CORE-001:** A person may have multiple engagements and employments, but
  each employment has one legal entity, worker type, status, and effective period.
- **FR-CORE-002:** Lists and details show current facts by default and allow an
  authorized user to inspect future and historical facts.
- **FR-CORE-003:** A change to manager, job, position, department, entity,
  location, cost center, grade, or employment type is effective-dated and
  closes the prior interval transactionally.
- **FR-CORE-004:** Overlapping incompatible effective intervals are rejected by
  service and database constraints.
- **FR-CORE-005:** Every mutation records actor, authority, reason when
  required, before/after, effective date, source, correlation ID, and event ID.

### Reporting relationships and org structure

- **FR-CORE-006:** Every non-top-level active employee has exactly one current
  primary manager; explicit top-level exceptions require a reason.
- **FR-CORE-007:** Up to three secondary managers may be enabled by organization
  policy; secondary relationships never grant approval or HR permissions.
- **FR-CORE-008:** Direct and indirect primary-manager cycles are rejected for
  current and future-dated changes.
- **FR-CORE-009:** Org chart loads searchable neighborhoods, supports a
  directory/table fallback, and never requires the entire organization graph.
- **FR-CORE-010:** Reorganization preflight reports invalid managers, position
  conflicts, workflow impact, and unassigned employees before commit.

### Onboarding

- **FR-CORE-011:** An accepted-hire payload is idempotent and includes only
  approved identity, position, job, entity, location, manager, start date, and
  compensation-offer references needed to create preboarding. It supports
  acknowledgment, safe rejection, corrected version, delayed start, rescind,
  duplicate replay, and reconciliation without importing candidate history.
  The offer reference is evidence; authorized HR confirms the Core-owned
  `InitialCompensationApproval` before creating `CompensationAssignment`.
- **FR-CORE-012:** Individual and bulk onboarding share validation and fallback
  rules; browser validation never replaces server validation.
- **FR-CORE-013:** Onboarding templates support canonical headers, aliases for
  180 days or two releases (whichever is longer), dependency ordering, and downloadable errors.
- **FR-CORE-014:** Core emits lifecycle state and required domain tasks;
  Experience owns journey templates/UX and Platform executes task orchestration
  for employee, manager, HR, access, asset, payroll, and named custom roles.
- **FR-CORE-015:** Onboarding completion shows unresolved blocking tasks and
  cannot silently activate an employee missing required employment facts.

### Documents and policies

- **FR-CORE-016:** Documents support subject, type, version, owner, sensitivity,
  issue/expiry dates, signature/acknowledgment state, retention, and legal hold.
- **FR-CORE-017:** Downloads use short-lived signed access, authorization at
  read time, malware status, audit, and watermark where policy requires.
- **FR-CORE-018:** Core owns People policy content, audience, and acknowledgment
  commands using Platform version/storage primitives. A published version is
  immutable; updates create a new effective version with summary and acknowledgment behavior.
- **FR-CORE-019:** HR can report who was assigned, delivered, viewed,
  acknowledged, overdue, exempted, or invalidated for each policy version.
- **FR-CORE-020:** Document and policy search excludes hidden bodies and fields
  unless the actor has explicit content-search permission.

### Employment changes and exit

- **FR-CORE-021:** Every employee change runs an impact preview and generates
  domain events only after the owning transaction commits.
- **FR-CORE-022:** Scheduled changes can be canceled or superseded with audit
  before their effective date; completed historical facts are not deleted.
- **FR-CORE-023:** Exit initiation freezes the intended last working date and
  creates assigned access, asset, knowledge, document, leave, and FnF tasks.
- **FR-CORE-024:** Payroll owns monetary FnF settlement; HR displays handoff and
  status but cannot reproduce the settlement calculator.
- **FR-CORE-025:** Legal hold overrides normal deletion/retention jobs and is
  visible only to authorized legal/audit roles.

### Imports, exports, and bulk work

- **FR-CORE-026:** Import flow is upload → map → normalize → validate →
  reference resolution → preview → approve → commit → results.
- **FR-CORE-027:** A row error cannot create a partial employee. Valid rows may
  commit independently only when dependencies are satisfied and policy permits.
- **FR-CORE-028:** Bulk changes support selected IDs or all matching a frozen
  canonical filter, eligibility preflight, confirmation, idempotency, and
  per-record results.
- **FR-CORE-029:** Sensitive exports require purpose, scope, expiry, and audit;
  large exports run as durable jobs.
- **FR-CORE-030:** Position handoff to Recruitment is versioned and supports
  acknowledgment, rejection, update, freeze/close/rescind, replay, and
  filled-position reconciliation without exposing candidate details.
- **FR-CORE-031:** Organization entity/hierarchy commands remain
  Organization-owned; Core rejects unknown/inactive references and reconciles
  readiness before worker activation or payroll handoff.
- **FR-CORE-032:** A restricted death-reported lifecycle event initiates the
  controlled access, document, final-pay, claimant/nominee, and statutory
  workflow in PRD 05b; ordinary manager views receive only operational status.
- **FR-CORE-033:** Probation plans, extensions, confirmations, and reminders
  are effective-dated; they cannot change employment status without the
  authorized confirmation command.
- **FR-CORE-034:** Right-to-work, visa, license, and certification records have
  type, authority, issue/expiry, evidence, and reminder; expiry creates an
  exception, not an automatic termination.
- **FR-CORE-035:** Alumni status is a closed-employment projection with
  controlled rehire restoration; it is not a second mutable worker record.
- **FR-CORE-036:** Advanced job architecture—families, multi-track levels,
  proficiency, career-path links, and mass job maintenance—is versioned and
  cannot create overlapping employment intervals.

## 7. Primary Experiences

### HR employee collection

- Server search by name, work email, employee code, title, and permitted custom fields.
- Filters: status, worker type, entity, department, team, manager, location,
  job, position, grade, start/exit range, skill, and missing-data condition.
- Saved views, column preferences, bulk actions, and export share the same
  predicate.
- Primary actions: add/invite, import, schedule change, assign manager,
  transfer, start exit, request documents, and open audit.

### Employee detail

Tabs: overview, job, reporting line, compensation summary (permissioned), time,
documents, assets, performance, lifecycle tasks, notes, and audit. Employee
self-view omits private HR notes and other-person actions.

### Onboarding and lifecycle queues

Operators see exception-first queues for missing facts, overdue tasks, failed
integrations, expiring documents, probation decisions, scheduled changes, and
exit blockers. Every queue item identifies an owner and next action.

## 8. Data and Integration Requirements

- All keys are stable and tenant-scoped; external IDs are namespaced by provider.
- Dates representing policy days use organization-local dates; events use instants.
- Sensitive fields are classified at definition time: public-directory,
  employee-private, manager-visible, HR-confidential, payroll-confidential,
  medical/accommodation, legal, or secret.
- Custom fields cannot weaken system invariants or create executable expressions.
- Domain events include schema version, organization, aggregate ID/version,
  actor, effective date, correlation, and idempotency key.
- Required events: worker created/activated/changed/suspended/exited/rehired,
  reporting line changed, position changed, policy published/acknowledged,
  document issued/signed/expired/held, and lifecycle task changed.
- Integrations consume events through durable outbox delivery and reconciliation.

## 9. Security and Privacy

- Object, field, tenant, and DataScope authorization apply at query time.
- A manager relationship grants only documented team visibility and workflow
  responsibility; it never grants HR or payroll administration.
- Medical, accommodation, investigation, disciplinary, bank, tax, identity,
  and legal facts are isolated from general profile queries.
- Cross-tenant and unauthorized sensitive lookups return indistinguishable results.
- Break-glass access requires reason, expiry, visible banner, and high-severity audit.
- Subject export/correction and retention workflows preserve third-party privacy
  and legal holds.

## 10. Success Measures

- active non-top-level employees with a valid primary manager;
- employment records with complete required P0 facts;
- onboarding completion before start date and median time to productive access;
- lifecycle changes completed without downstream correction;
- document/policy acknowledgment and expiry-compliance rates;
- import first-pass success and correction-loop duration;
- exit tasks and FnF handoff completed by policy deadline;
- duplicate worker/person incidents and effective-date conflicts.

## 11. Acceptance Criteria

- [ ] One accepted-hire event creates at most one preboarding worker and can be replayed.
- [ ] Every non-top-level active employee has exactly one valid primary manager.
- [ ] Current, future, and historical employment facts are distinguishable and non-overlapping.
- [ ] Transfer, promotion, manager, location, and status changes update all
      authorized readers through one fact contract.
- [ ] Onboarding works for one employee and a dependency-ordered bulk import.
- [ ] Invalid import rows have actionable field/reference errors and write nothing.
- [ ] Policy publication and acknowledgment produce immutable versioned evidence.
- [ ] Document download is tenant-, subject-, permission-, and expiry-safe.
- [ ] Exit creates downstream tasks and payroll FnF handoff without duplicating settlement.
- [ ] Rehire creates a new engagement period while retaining prior history.
- [ ] Employee, manager, HR, payroll, and auditor views expose only permitted fields.
- [ ] Org chart and employee lists meet the numerical scale/latency gates in PRD 06a.
- [ ] All P0 lifecycle mutations are idempotent, audited, and integration-recoverable.
- [ ] Position and accepted-hire handoffs recover from reject, update, rescind,
      duplicate, delayed-start, and replay scenarios.
