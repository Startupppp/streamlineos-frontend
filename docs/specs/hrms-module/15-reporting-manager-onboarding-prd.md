# HRM-15 — Reporting Manager Assignment, Onboarding, Import and Review PRD

**Status:** Ready for implementation  
**Owner:** HRMS Product + Engineering  
**Audience:** Product, backend, frontend, QA, and the implementation agent  
**Decision date:** 2026-09-25

## 1. Outcome

Every active employee has one unambiguous **primary reporting manager** from
onboarding onward. HR can correct it safely, employees can ask HR to review an
incorrect assignment, and bulk onboarding/imports can assign managers without
manual cleanup. Organisations that use a matrix structure may additionally
record up to three **secondary reporting managers** per employee, but those
secondary relationships never silently become the approval manager.

The result is a reliable organisation chart and an accountable approval path
for leave, attendance, expenses, performance, exit handover and manager work.

## 2. Current-state facts and problem

The implementation already contains useful foundations. Do not replace them
with a parallel people or hierarchy model.

| Area | Current evidence | Product gap this PRD closes |
|---|---|---|
| Primary reporting line | The backend has effective-dated reporting lines and the employee detail page renders a current, future and historical line. | No explicit organisation policy for default assignment, secondary relationships, review requests or mass changes. |
| Individual onboarding | The form/API currently requires `reportingManagerUserId`, unless a top-level role reason is supplied. | An omitted manager must be safely defaulted, rather than forcing HR to choose a placeholder or mark a non-top-level employee as top-level. |
| Bulk onboarding | The latest template and API support `reportingManagerEmail`, including dependencies on another row in the same file. | The import contract must make fallback, secondary managers, row diagnostics and user-facing template rules consistent. |
| Staged HR import | The HR import service resolves a `managerEmail` and writes an effective-dated reporting line on commit. | Its template, preview and import modes need the same policy as bulk onboarding. |
| Coverage | Manager coverage identifies missing, inactive, circular and over-span reporting lines. | It must distinguish intentional top-level employees, temporary fallbacks and items awaiting review. |
| Approvals | Direct-manager workflow steps resolve the reporting manager. | Approval authority must remain primary-manager-only unless a workflow explicitly names a secondary manager role in a later product decision. |

The present mandatory-manager rule must change. The desired product is not
“several equal managers with unclear authority”; it is one accountable primary
manager with optional, explicitly non-primary relationships.

## 3. Locked product decisions

### D1 — One primary manager; optional secondary managers

1. Every non-top-level employee has exactly **one current primary reporting
   manager**.
2. A person may manage any number of employees. The “1, 2, or 3” setting does
   **not** limit a manager's span of control.
3. An organisation may configure `0`, `1`, `2`, or `3` optional **secondary
   reporting managers per employee**. Default: `0`.
4. A secondary manager is a dotted-line/functional/project manager. It appears
   in the employee profile and organisation views, but does not own default
   approvals, probation sign-off, performance review ownership, leave routing,
   or exit handover.
5. If the business later needs a secondary manager to approve a particular
   workflow, that is a named workflow-configuration feature. It must not be
   inferred from this relationship.

This resolves the apparent conflict in the request: an employee always has one
accountable reporting manager, while a matrix employee can also have up to the
organisation-configured number of additional reporting contacts.

### D2 — Default manager when onboarding omits one

The employee must not be left without a primary manager merely because a form
or spreadsheet cell was blank.

The organisation owns a required **Reporting Manager Policy**:

| Setting | Values | Default |
|---|---|---|
| `maxSecondaryManagersPerEmployee` | 0–3 | 0 |
| `defaultPrimaryManagerUserId` | an active organisation member | none until set |
| `fallbackOrder` | `CONFIGURED_MANAGER_THEN_UPLOADER`, `UPLOADER_THEN_CONFIGURED_MANAGER` | `CONFIGURED_MANAGER_THEN_UPLOADER` |
| `requireReasonAfterChanges` | positive integer, 1–10 | 3 changes / rolling 24 h |
| `allowTopLevelWithoutManager` | boolean | true |

For a missing primary-manager value, resolve in this exact order:

1. If the import/onboarding request supplies a valid primary manager, use it.
2. If policy order permits it and the configured default is an active eligible
   member, use the configured default.
3. If policy order permits it and the actor is an active HR administrator,
   organisation administrator or owner, use the actor.
4. Try the other configured fallback source, if it has not already been tried.
5. If no eligible fallback exists, reject that single onboarding/import row
   with `NO_DEFAULT_REPORTING_MANAGER`; do not guess among administrators.

The configured default is deliberately preferred over “whichever HR uploaded
the file.” It is predictable, auditable, and still lets an organisation choose
the uploader-first policy where that is their operating model.

### D3 — Top-level roles remain explicit exceptions

A top-level employee has no primary manager only when `topLevelRole=true` and
a non-empty reason is supplied. A top-level row must not also name a primary or
secondary manager. Top-level employees are excluded from “missing manager”
coverage alerts.

### D4 — Frequency safeguard is a soft guard, not a hard cooldown

Do not lock HR out during reorganisations, corrections, or urgent exits.

- The first three primary-manager changes for the same employee in a rolling
  24-hour period work normally and retain their reason/audit record.
- Change number four or later displays a high-visibility warning, requires a
  reason of at least 10 non-whitespace characters, and requires an HR Admin or
  Org Admin role.
- A designated emergency/break-glass flow may proceed, but requires a reason
  and creates a high-severity audit event.
- A bulk job affecting 10–15 employees is allowed. It requires a job-level
  reason, a preview, explicit confirmation and per-employee audit records; it
  is not throttled merely for being large.

### D5 — Effective dates and in-flight work

Primary and secondary relationship changes are effective-dated. A future-dated
change is permitted. Workflow instances retain the approver(s) resolved when
the instance/step was created; a reporting-line change changes future routing,
not an already assigned approval. HR may use the existing workflow reassignment
process when an in-flight item genuinely needs a different owner.

## 4. Scope

### In scope

- Primary and optional secondary reporting relationships.
- Organisation-level policy/configuration.
- Individual onboarding, bulk onboarding and staged employee import.
- Manual primary/secondary assignment and effective-date scheduling.
- Employee-submitted incorrect-manager review requests.
- HR/Admin review, approval, rejection, cancellation and audit trail.
- Bulk reassignment with preview, validation, idempotency and result export.
- Manager-coverage and temporary-fallback visibility.
- Notifications and reporting-line effects on future workflow routing.

### Out of scope

- Changing who can approve an existing workflow step.
- Automatically inferring managers from title, department, email domain or AI.
- A permanent approval delegation model; use the existing delegation product.
- Limiting how many direct reports a manager can have. Existing span-of-control
  alerts remain advisory and are configured separately.
- Rebuilding the organisation chart, people system of record or employee
  lifecycle architecture.

## 5. Personas, permissions and responsibility

| Persona | May do | May not do |
|---|---|---|
| Employee | See own primary/secondary managers; file/cancel own correction request; see request status. | Change own manager or see another employee's request details. |
| Reporting manager | See direct reports according to existing scope rules. | Self-approve a request to become a manager; edit reporting lines without HR authority. |
| HR operator | Set policy if granted; assign managers; review requests; create bulk jobs. | Bypass the repeated-change warning without the elevated admin permission. |
| HR Admin / Org Admin | All HR operator actions; configure fallback; approve repeated changes; emergency override. | Assign across tenant boundaries or select inactive/exited employees. |
| Org owner | Same configuration authority as Org Admin. | Be selected by the system when no deterministic fallback exists. |

Use the existing RBAC catalog and add only the smallest needed keys, consistently
in backend and frontend. Recommended keys are `hr:reporting-lines:view`,
`hr:reporting-lines:manage`, `hr:reporting-lines:review`, and
`hr:reporting-lines:override`. Do not use a frontend-only role check or accept
actor/org IDs from the client.

## 6. Terminology and relationship rules

| Term | Meaning |
|---|---|
| Primary manager | Exactly one current accountable manager for a non-top-level employee. Used for default manager workflows. |
| Secondary manager | Optional dotted-line relationship. Informational unless an explicitly configured future workflow says otherwise. |
| Fallback manager | The primary manager selected by D2 because onboarding/import omitted one. It is a real but visibly temporary assignment, not an untracked placeholder. |
| Top-level employee | Explicit exception with no primary manager and an auditable reason. |
| Change request | Employee-initiated proposal for HR review; it is not a direct edit. |
| Effective date | The local organisation date when a relationship starts. An end date closes prior active relationship history. |

Validation rules:

1. Manager and employee must be distinct active members of the same organisation.
2. An exited, suspended, deactivated or non-member account is ineligible.
3. A primary manager cannot create a primary hierarchy cycle, at any effective
   date. Detect direct and indirect cycles transactionally.
4. A secondary manager cannot be the employee, cannot duplicate the primary
   manager, cannot duplicate another current secondary manager, and cannot
   exceed the organisation cap.
5. A manager appointment must be active on the effective date. For a scheduled
   future manager, validate the relationship against their scheduled status.
6. Exactly one current primary line is permitted by a database constraint, not
   only by API code. Historical lines are retained; never overwrite history.
7. A primary line marked `source=FALLBACK` remains fully functional but is
   prominently visible to HR until confirmed/replaced. It does not expire
   automatically.
8. Assigning a manager never grants the manager HR, payroll, finance or
   employee-administration permissions.

## 7. End-to-end flows

### 7.1 Organisation setup

1. An HR Admin or Org Admin opens **HR Settings → Reporting Manager Policy**.
2. The page explains the primary/secondary distinction and approval impact.
3. The admin selects a default primary manager, fallback order, secondary cap,
   and repeated-change threshold.
4. The UI validates the selected fallback member is active and in the current
   organisation.
5. Save writes one versioned policy record and an audit event. Do not modify
   existing employee assignments as a side effect.
6. If no valid default is configured, display a blocking warning on all
   onboarding/import entry points: a blank manager cell will fail unless the
   uploader qualifies under fallback policy or the row is top-level.

### 7.2 Single employee onboarding

1. HR enters employee data.
2. **Primary reporting manager** is optional in the form and has a clear
   “Assigned automatically by policy if left blank” helper.
3. When a manager is selected, the form shows name, designation and status.
4. If the organisation cap is above zero, the user can add secondary managers
   up to the cap. Each has an optional relationship label such as “Functional”
   or “Project”; labels are descriptive only.
5. If “Top-level role” is checked, manager fields are disabled and the reason
   becomes required.
6. On submit, the backend—not the browser—resolves the fallback policy,
   validates every relationship and writes the employee plus relationships in
   one transaction.
7. The success result states the primary manager and whether it was selected,
   imported, or assigned by fallback policy. Do not expose role-sensitive
   details to users without HR access.

### 7.3 Bulk onboarding spreadsheet

The downloadable `.xlsx` and CSV-compatible template must include these
canonical columns, alongside the existing employment fields:

| Column | Required | Rules |
|---|---|---|
| `primaryManagerEmail` | No | Existing active member or another successful row. Blank invokes fallback policy. Accept legacy aliases `reportingManagerEmail`, `reportsTo`, and `managerEmail`. |
| `secondaryManagerEmail1` | No | Active member or another successful row; only valid if cap ≥ 1. |
| `secondaryManagerEmail2` | No | Only valid if cap ≥ 2. |
| `secondaryManagerEmail3` | No | Only valid if cap = 3. |
| `topLevelRoleReason` | Conditional | Required only for a declared top-level row; mutually exclusive with every manager column. |
| `effectiveFrom` | No | ISO date; default is organisation-local import date. |

Do not use a comma-separated multi-manager cell: it conflicts with CSV escaping
and produces poor per-field errors. Named columns make support and preview
diagnostics clear. The old `reportingManagerEmail` template header remains a
read-only alias for one release, but newly downloaded templates use
`primaryManagerEmail`.

Bulk flow:

1. Download template with a second **Instructions** worksheet and examples for
   selected, fallback and top-level rows.
2. Upload `.xlsx` or CSV, then parse without creating employees.
3. Normalize headers and emails; reject duplicate employee emails in the file.
4. Build a dependency graph resolving primary/secondary manager emails against
   active members and rows in the same file.
5. Detect unknown managers, in-file dependency failures, self links, duplicate
   managers, cap violations, invalid dates and primary cycles before commit.
6. Apply fallback policy per valid blank-primary row. The preview must show the
   resolved fallback person's name and a `Fallback` status, never merely the
   word “automatic.”
7. Present row-level results with Ready, Warning, Error and Skipped states;
   support download of the error report. A warning does not silently become an
   error.
8. Commit only rows classified Ready or Warning after the HR user explicitly
   confirms. Invalid rows never write; dependent rows whose named manager
   failed are skipped with the manager row number and email.
9. Create the manager rows before dependants where both are new, then create
   all reporting lines in one transaction per accepted dependency set. The
   response gives created, skipped and failed counts and links to job history.
10. Use an idempotency key so a retry cannot create duplicate users or lines.

### 7.4 Staged HR employee import

The generic HR Import/Export employee entity must use the same canonical
columns, validation engine and result vocabulary as bulk onboarding. It must
not have a second definition of `managerEmail` semantics.

The staged flow is: upload → parse → preflight/reference resolution → preview
→ explicit commit → durable job history → optional rollback according to the
existing import rollback contract. A commit must report whether a relationship
was selected, fallback-resolved, scheduled or rejected.

For imports updating existing employees, `primaryManagerEmail` is a requested
manager change. Blank means **no change** by default; it does not erase an
existing manager. An explicit `clearPrimaryManager=true` is disallowed except
when the same row declares top-level status and a reason. This prevents a
partially filled spreadsheet from damaging the hierarchy.

### 7.5 Employee reports an incorrect manager

1. The employee opens **My Profile → Reporting line** and selects **Report an
   issue**.
2. The form shows their current primary manager and allows a reason (required,
   20–1,000 characters), optional suggested manager selected from searchable
   active members, and optional effective-date request. No free-text email is
   accepted for the target.
3. The server creates a `PENDING` request, deduplicating an equivalent active
   request for the same employee. It does not change the reporting line.
4. HR receives an actionable notification and sees a queue item. The current
   manager is not notified until HR approves, unless the organisation later
   explicitly enables such notice.
5. Reviewer can approve with a selected/scheduled manager, reject with a
   non-empty employee-visible reason, cancel as duplicate, or request more
   information. Approval re-runs all current validations and the repeated-
   change guard; no stale request can bypass a new manager becoming inactive.
6. On approval, write the effective-dated change and link its audit event to
   the request. Notify the employee, incoming primary manager and outgoing
   primary manager; do not reveal the employee's private free-text reason to
   recipients other than the employee and authorised HR reviewers.

### 7.6 HR/Admin direct and bulk reassignment

For one employee, HR edits the Reporting line card, chooses primary/secondary
relationships, an effective date and a reason. The UI previews the old and new
primary manager and indicates whether the change affects future workflow
routing.

For many employees, HR uses **HR → Employees → Bulk reporting change**:

1. Filter/select employees, or upload a mapping file with `employeeEmail`,
   `primaryManagerEmail`, optional secondary columns, `effectiveFrom`, and
   `reason`.
2. Preview each delta: current primary, requested primary, secondary changes,
   change count in the last 24h, warnings, errors and affected count.
3. Require a job-level reason and confirmation phrase for 10+ employees.
4. Require an individual reason for every threshold-exceeding employee, even
   where the job itself has a reason.
5. Commit valid rows atomically by dependency set; never silently partially
   update an individual employee's primary and secondary lines.
6. Preserve row results, job ID, actor, before/after values and retry-safe
   idempotency. Allow CSV export of failures.

## 8. Data model and migration requirements

Extend the existing effective-dated reporting-line model; do not add
`manager_id` fields to the employee row and do not store manager arrays in
JSONB.

### 8.1 Reporting relationship

The canonical relationship needs, at minimum:

| Field | Requirement |
|---|---|
| `id`, `org_id`, `employee_employment_id`, `manager_employment_id` | Tenant-scoped identities/FKs; all FKs indexed. |
| `relationship_type` | `PRIMARY` or `SECONDARY`. |
| `effective_from`, `effective_to` | Date range; only one current primary relationship per employee. |
| `source` | `MANUAL`, `ONBOARDING_SELECTED`, `ONBOARDING_FALLBACK`, `BULK_ONBOARDING`, `STAGED_IMPORT`, `EMPLOYEE_REQUEST`, `BULK_REASSIGNMENT`, `EMERGENCY_OVERRIDE`. |
| `change_reason` | Nullable where the initial onboarding selection does not require one; required by the frequency guard and all employee-request approvals. |
| `created_by`, timestamps, archival lifecycle | Immutable historical accountability. |

Database invariants:

- partial unique index for one open `PRIMARY` relationship per employee;
- index `(org_id, manager_employment_id, relationship_type, effective_to)` for
  direct-report and coverage queries;
- exclusion/check strategy preventing overlapping primary effective periods;
- tenant-consistent manager/employee relationships validated through service
  transaction and foreign keys where possible;
- secondary cap enforced transactionally from the organisation policy;
- do not hard-delete history.

### 8.2 Reporting manager policy

Add one tenant-owned policy record with the D2 fields, version, updater and
timestamps. It is not a hidden global configuration. The policy update service
must validate its default manager and emit an audit/outbox event.

### 8.3 Review request

Create a normalised, lifecycle-managed request table:

`id`, `org_id`, `employee_employment_id`, `current_primary_line_id`,
`suggested_manager_employment_id` nullable, `requested_effective_from`
nullable, `employee_reason`, `status`, `reviewer_user_id` nullable,
`review_reason` nullable, `resolved_line_id` nullable, timestamps and
`deleted_at`.

Statuses: `PENDING`, `MORE_INFO_REQUIRED`, `APPROVED`, `REJECTED`,
`CANCELLED`, `EXPIRED`. Permit only valid transitions. Add a partial uniqueness
constraint that prevents duplicate active requests for the same employee and
same current line.

### 8.4 Backfill and rollout

1. Audit existing primary lines, top-level exceptions and employees without a
   manager before applying a non-null policy expectation.
2. Add new nullable fields/tables first; backfill in batches; validate indexes
   and constraints without long locks; follow existing migration rules.
3. Mark legacy primary lines as `MANUAL` or `MIGRATED` source.
4. Do not auto-assign historical employees to an arbitrary admin. Put them in
   the Manager Coverage queue with a bulk remediation path.
5. Retain support for the legacy bulk-header alias for one release and record
   its use in job metadata/telemetry.
6. Only remove legacy DTO/template aliases after zero usage for the agreed
   observation window and a documented migration note.

## 9. API and UI contract

Exact route naming may align with current controller conventions, but the
backend remains the only business authority. Every mutating route is
idempotent, tenant-scoped, Zod-validated, permission-gated and audited.

| Capability | Suggested API contract | UI surface |
|---|---|---|
| Read policy | `GET /hr/reporting-manager-policy` | Settings page |
| Update policy | `PATCH /hr/reporting-manager-policy` | Settings form |
| Read line | retain/extend `GET /hr/reporting-lines/:employeeUserId` | Employee detail + My Profile |
| Set/schedule line | `PUT /hr/reporting-lines/:employeeUserId` | Employee detail editor |
| List coverage | retain/extend `GET /hr/reporting-lines/coverage` | Manager Coverage |
| Create request | `POST /me/reporting-manager-requests` | My Profile issue form |
| List own requests | `GET /me/reporting-manager-requests` | My Profile history |
| HR request queue | `GET /hr/reporting-manager-requests` | HR review queue |
| Review request | `POST /hr/reporting-manager-requests/:requestId/review` | Review drawer |
| Create bulk job | `POST /hr/reporting-lines/bulk-jobs` | Bulk reporting change wizard |
| Get/export job | `GET /hr/reporting-lines/bulk-jobs/:jobId` | Job result/history |

Response payloads should expose display-safe manager names, designation,
relationship type, source, effective dates, warning flags and permitted actions.
They must not expose audit reasons or change-request text to an unauthorised
manager/employee. Backend contracts and frontend Zod contracts must change in
the same implementation block.

UI details:

- The employee profile labels the accountable manager as **Primary reporting
  manager** and dotted-line entries as **Additional reporting managers**.
- Fallback assignments show a non-alarming badge: “Temporarily assigned by
  onboarding policy”; HR sees a one-click replacement action.
- The onboarding and import previews explain exactly which fallback member was
  chosen and why.
- Manager Coverage adds `fallback manager`, `pending employee review`, and
  `policy missing` states without treating explicit top-level roles as defects.
- All selectors search active, in-tenant members and exclude the employee.
- Use existing query-key factories and invalidate reporting line, employee
  detail, coverage, manager-home/direct-report and workflow-routing read keys
  on a successful mutation.

## 10. Business, security and reliability requirements

1. No cross-tenant existence disclosure: an out-of-tenant manager ID/email is
   treated as unavailable, not revealed.
2. Validate imports server-side even when the browser preview declared rows
   ready. Browser validation is helpful, never authoritative.
3. Authorisation is object- and data-scope-aware. An HR employee with only
   self scope cannot read or alter another employee's line/request.
4. Perform relationship change, history close/open, audit, permission/cache
   invalidation signal and durable notification outbox write transactionally.
   Send notifications after commit.
5. Never make a network call inside the write transaction.
6. Idempotency replay returns the original completed bulk/mutation result;
   concurrent duplicate commands return the established in-flight response.
7. Existing direct-manager workflow routing reads only `PRIMARY` current lines.
   Re-test leave, WFH, expenses, probation, performance and exit handover.
8. Emit an immutable audit event for policy changes, manual changes, fallback
   assignments, import/bulk job commits, review creation and resolution, and
   emergency overrides. Audit before/after IDs, source, reason where allowed,
   effective date, job/request IDs and actor.
9. Notify the appropriate people once, deduplicated by event. A bulk job sends
   a single HR summary plus per-affected-employee messages only where current
   notification settings permit it.
10. Use organisation-local dates for effective dates; persist unambiguous
    timestamps for action/audit times.
11. Keep all list endpoints cursor-paginated and capped at 100. Large uploads
    must be bounded by the existing import/bulk limits and processed without
    N+1 manager lookups.
12. Record metrics: fallback assignment rate, no-default failures, manager
    correction request volume/age, changes per employee, bulk job failure rate,
    cycle rejection count and legacy-header usage.

## 11. Acceptance criteria

### Primary and secondary relationships

- [ ] A non-top-level employee cannot finish onboarding without a primary
  manager selected or deterministically resolved by policy.
- [ ] An explicit top-level employee requires a reason and cannot have any
  manager relationship.
- [ ] A manager can have many direct reports.
- [ ] An employee has one current primary manager and 0–3 secondary managers
  according to the organisation cap.
- [ ] A secondary manager cannot duplicate the primary or another secondary.
- [ ] Direct and indirect primary cycles are rejected before a write.
- [ ] A historical relationship remains visible after replacement; no update
  overwrites the old record.

### Onboarding and import

- [ ] Blank primary manager resolves to the configured/default eligible actor
  in the documented precedence order and exposes the chosen person in preview.
- [ ] A blank primary manager fails only when no eligible fallback exists.
- [ ] CSV/XLSX templates contain canonical primary/secondary columns and
  instructions; the old single-manager header imports for one release.
- [ ] A file can nominate a manager who is another valid row in the same file.
- [ ] A failed manager row skips dependent rows with actionable diagnostics.
- [ ] An import updating an existing employee leaves the manager untouched when
  its manager columns are blank.
- [ ] Upload retry with the same idempotency key creates no duplicate employee,
  relationship or notification.

### Review, change control and workflows

- [ ] An employee can submit one active correction request but cannot edit
  their own reporting line.
- [ ] HR can approve/reject/request information; approval revalidates current
  eligibility and records an effective-dated change.
- [ ] A fourth primary change in 24 hours warns, requires a reason and requires
  elevated authority; emergency override is separately auditable.
- [ ] A 10+ employee bulk reassignment requires job reason and explicit
  confirmation but remains available.
- [ ] In-flight approvals retain their resolved owner; future manager steps use
  the new primary line.
- [ ] Secondary managers do not gain approval or administrative authority.

### Quality and operational proof

- [ ] Unit tests cover policy resolution, cap boundaries, all fallback orders,
  inactive/default manager failure, dates, duplicates and graph cycles.
- [ ] Backend controller/e2e tests cover authentication, permission denial,
  self-scope denial, cross-tenant 404, idempotency and audit/outbox effects.
- [ ] DB tests prove partial uniqueness, effective-date overlap prevention,
  tenant isolation and no N+1 manager resolution for the max upload size.
- [ ] Frontend tests cover form validation, top-level toggle, fallback preview,
  bulk-row diagnostics, accessible manager selection, request lifecycle and
  change-warning UI.
- [ ] Existing manager-home, coverage, leave, WFH, expense, performance and
  exit routing tests pass with primary-only behavior.
- [ ] Migration replay, type checks, contract/OpenAPI checks, cycle checks and
  touched repository gates pass according to each repository's `CLAUDE.md`.

## 12. Implementation checklist

This is intentionally granular. An item is done only when code, tests,
contract parity and the relevant documentation/index update are complete.

### Phase A — Audit and design lock

- [ ] Confirm the canonical existing reporting-line table/service/controller
  and avoid duplicating its ownership.
- [ ] Inventory every current `reportingManagerEmail`, `managerEmail`,
  `reportingTo`, direct-manager workflow lookup and manager-coverage consumer.
- [ ] Confirm the authoritative active-membership predicate and manager
  eligibility check.
- [ ] Confirm existing import rollback semantics before promising relationship
  rollback behavior.
- [ ] Publish exact RBAC key names in both catalogs and map roles/scopes.
- [ ] Produce the migration compatibility matrix for legacy header aliases and
  existing top-level rows.
- [ ] Record the product decision that secondary relationships are
  informational in this release.

### Phase B — Backend persistence and policy

- [ ] Add policy table/schema, migration journal entry and rollback migration.
- [ ] Add/extend relationship type/source/reason fields and indexes without
  changing applied migrations.
- [ ] Add effective-date and one-open-primary database protections.
- [ ] Add request table, status constraints, partial duplicate guard and
  indexes.
- [ ] Add data migration/backfill classification with no arbitrary manager
  assignment.
- [ ] Implement one canonical fallback resolver; reuse it for individual,
  bulk and staged-import paths.
- [ ] Implement one canonical relationship validation/cycle service; reuse it
  for manual changes, review approvals and imports.
- [ ] Enforce secondary cap transactionally.
- [ ] Add audit and outbox events in the same transaction.
- [ ] Invalidate all affected cache namespaces after commit.

### Phase C — Backend commands and reads

- [ ] Add policy read/update controller, DTOs, response schema and permission
  guard.
- [ ] Extend reporting-line read response with relationship type, source and
  fallback visibility appropriate to caller permission.
- [ ] Add set/schedule command with idempotency and repeated-change guard.
- [ ] Add manager-correction request create/list/cancel commands under `/me`.
- [ ] Add HR queue/read/review commands with pagination, filtering and scope.
- [ ] Add bulk reassignment create/preview/commit/result/export commands.
- [ ] Unify bulk onboarding and staged import manager-column normalization,
  dependency ordering and preview error vocabulary.
- [ ] Ensure existing-employee import blanks mean no relationship mutation.
- [ ] Extend coverage read model for fallback/pending-policy states.
- [ ] Re-run direct-manager workflow consumers against primary-only lookup.

### Phase D — Frontend contracts and UI

- [ ] Update API hooks, query keys and Zod contracts to match backend exactly.
- [ ] Add Reporting Manager Policy settings page/form with validation and clear
  fallback-order explanation.
- [ ] Update individual onboarding with optional primary selector, secondary
  selectors, top-level exclusivity and fallback helper text.
- [ ] Update template generator, parser, aliases, preview table, row errors,
  instructions worksheet and result export.
- [ ] Make generic HR employee import use the same column documentation and
  preview semantics.
- [ ] Update Reporting line card to show primary, secondary, source and
  scheduled changes correctly.
- [ ] Add employee self-service issue form/history and appropriate empty/error
  states.
- [ ] Add HR review queue/drawer and request-decision states.
- [ ] Add bulk reporting-change wizard with preview, threshold reason capture,
  job confirmation and downloadable errors.
- [ ] Update Manager Coverage labels/actions and profile/detail cache
  invalidation behavior.
- [ ] Add/update `PAGES.md` for each new/moved/deleted surface.

### Phase E — Verification and release

- [ ] Build fixtures covering pre-existing, in-file and fallback managers.
- [ ] Run focused unit/DB/e2e/frontend tests and repository-required gates.
- [ ] Verify a max-size import does bounded manager/reference queries.
- [ ] Verify audit records and notifications on selected, fallback, request,
  bulk and emergency paths.
- [ ] Verify RLS/tenant isolation with two organisations using the same
  manager-like email patterns.
- [ ] Perform an accessibility pass at 375/768/1280 widths for selectors,
  preview table and review drawer.
- [ ] Add dashboard/alert thresholds for fallback and review backlog.
- [ ] Prepare support article and rollout note explaining primary vs secondary
  managers and spreadsheet header transition.
- [ ] Release behind a per-organisation feature flag if the migration/backfill
  audit identifies material existing data ambiguity.

## 13. Claude implementation prompt — mandatory parallel execution rules

Paste the following prompt to Claude together with this PRD. It deliberately
uses a dependency block so agents do not race on shared files or interfaces.

```text
Implement HRM-15, “Reporting Manager Assignment, Onboarding, Import and Review,”
from docs/specs/hrms-module/15-reporting-manager-onboarding-prd.md in the
streamlineos-frontend and streamlineos-backend repositories.

Read every applicable CLAUDE.md and AGENTS.md before edits. Preserve unrelated
dirty changes. Inspect the actual current code before naming a file or symbol;
this PRD identifies likely areas, not permission to duplicate existing models.

You MUST use at least three parallel agents. Maintain a visible ownership map
before editing. An agent may read any file, but it MUST NOT edit, format, move,
delete, or generate changes in a file owned by another live agent. If two work
items would edit the same file, split the file work sequentially or assign it
to the integration owner—never solve the conflict by concurrent edits.

BLOCK 0 — discovery and ownership map (main agent only; no code edits)
1. Inspect existing reporting-line tables/services, onboarding DTOs, staged
   import, bulk onboarding, manager coverage, workflows, RBAC, cache keys and
   both repo rules.
2. Write a short file ownership map in the task notes and identify every
   shared contract file that has exactly one owner.
3. Start at least these three agents with non-overlapping ownership:
   - Agent A: backend data model, migrations, canonical policy/fallback and
     relationship validation services, plus their focused tests.
   - Agent B: backend import/onboarding/review/bulk command integration and
     controller/DTO contracts, plus their focused tests. Agent B may inspect
     Agent A's work but must not edit Agent A-owned files.
   - Agent C: frontend hooks/contracts and UI surfaces/tests, exclusively in
     frontend files. It must not edit backend files.

BLOCK 1 — hard dependency gate
Agent B and Agent C may audit and prepare their own isolated tests/components,
but they MUST WAIT before changing any DTO, response contract, API hook, import
mapping or consumer that depends on the new data model until Agent A has
completed its owned implementation and published: migration/table names,
canonical service API, DTO field semantics, error codes and tests. Do not guess
or create temporary parallel contracts while waiting.

BLOCK 2 — parallel integration after Agent A completion
1. Agent B implements backend command/import integration using Agent A's exact
   contract. It owns only the files in its map.
2. Agent C implements frontend contract/UI integration using the published
   backend contract. It owns only the files in its map.
3. Agent A may fix only its own model/service tests during this block; any
   interface change must be reported to all agents before it is made.
4. The main agent waits for both B and C to report completion. It does not
   cherry-pick, overwrite or auto-format another agent's owned files.

BLOCK 3 — sequential integration and verification (main agent only)
1. After A, B and C are done, the main agent becomes the sole owner of shared
   integration files, contract registry/OpenAPI updates, cross-repo wiring,
   documentation and final conflict resolution.
2. Re-audit for duplicated fallback logic, duplicated import header mapping,
   duplicate relationship models, unsafe casts, missing scope checks and stale
   old manager fields. Consolidate to one canonical implementation.
3. Run the tests and repository gates required by CLAUDE.md; add missing tests
   for every acceptance criterion. Do not claim tests that were not run.
4. Report files changed, validation run, deferred risks, and the exact feature
   flag/rollout recommendation. Do not push, reset, stash, rebase, checkout or
   modify unrelated dirty work.

Implementation non-negotiables:
- one PRIMARY manager per non-top-level employee; secondary cap 0–3 is
  organisation-configured and secondary relationships never change default
  approval authority;
- blank onboarding/import primary manager resolves deterministically using the
  organisation policy, otherwise returns the specified row-level error;
- reuse the existing effective-dated reporting-line model and staged import
  machinery; never store manager arrays in JSON or a new employee manager_id;
- server-side tenant/auth/scope validation, idempotency, audit/outbox and cache
  invalidation are mandatory for every write;
- do not make a user-selectable cross-tenant manager discoverable;
- preserve historical lines; changes are effective-dated; in-flight workflow
  approvers remain snapshot-based;
- do not hard-code an arbitrary HR/Admin fallback when no configured eligible
  fallback exists;
- include every checklist and acceptance criterion in the final verification.
```

## 14. Open rollout checks (not design blockers)

Before enabling the feature for an organisation, HR must confirm:

1. Who is the configured default reporting manager, and who owns updating it
   when that person exits?
2. Does the organisation actually need 0, 1, 2 or 3 secondary managers?
3. Which existing employees have no manager and require remediation rather
   than an automatic historical assignment?
4. Is the “uploader first” fallback policy appropriate, or should the
   configured default always win?
5. Does the organisation want notifications to outgoing managers on approved
   employee correction requests?

These are deployment settings. They do not require another product decision or
another data model.
