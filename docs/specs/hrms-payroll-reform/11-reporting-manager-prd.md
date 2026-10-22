# Reporting manager, onboarding, import, and review PRD

**Status:** Existing implementation with open acceptance and release proof  
**Owner:** People Core  
**Tier:** Primary reporting line P0; secondary manager depth P1  
**Updated:** 2026-10-22

## Outcome and current evidence

Every active, non-top-level employee has one accountable primary manager. A top-level exception requires a reason. Organizations may configure up to three informational secondary managers without granting them approval authority. The core [lifecycle PRD](./01-core-hr-lifecycle-prd.md) owns the worker record and effective-dated relationship; this document defines the detailed manager policy, import, correction, and rollout behavior.

The repository now contains reporting-manager policy and fallback services, an effective-dated reporting-line service and schema, manager correction and bulk-job APIs, individual and bulk onboarding support, and frontend settings, profile, employee, review, and bulk-change surfaces. Representative source: `backend/src/modules/directory/reporting-manager-policy.service.ts`, `backend/src/modules/directory/reporting-manager-fallback.resolver.ts`, `backend/src/db/schema/hr/reporting-manager.ts`, `frontend/features/hr/reporting-managers`, and `frontend/PAGES.md`. These are **code-presence findings**, not a claim that every journey or release gate has passed.

## Detailed product contract

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

## Remaining TODOs

- [ ] Reconcile the legacy employee import and bulk-onboarding paths against one manager-column, fallback, dependency-order, blank-update, and row-diagnostic contract; prove the same behavior on preview and commit with idempotent retry.
- [ ] Audit every direct-manager consumer, including leave, WFH, expense, performance, probation, coverage, and exit; prove secondary managers never acquire authority by relationship alone and in-flight approvals retain their resolved owner.
- [ ] Verify the effective-date, one-open-primary, secondary-cap, request-status, and tenant constraints in a named disposable database, including migration replay, rollback, and historical backfill disposition.
- [ ] Run the reporting-line unit, API, contract, frontend, and DB tests together at fixed frontend/backend revisions; attach the actual results, including denial, cross-tenant, cycle, inactive manager, policy fallback, stale version, and duplicate command cases.
- [ ] Verify the maximum supported import uses bounded manager/reference queries and produces complete per-row errors for in-file manager dependencies and failed manager rows.
- [ ] Verify audit and notification outbox results for selected, fallback, correction, bulk, and emergency paths; ensure retries do not send duplicate notifications.
- [ ] Exercise employee, manager, HR admin, scoped HR, and denied roles in a browser at 375, 768, and 1280 px; inspect picker keyboard access, fallback preview, review states, bulk results, focus, and screen reader names.
- [ ] Add and verify operational metrics/alert thresholds for policy fallback, no-default failures, aged correction requests, repeated changes, cycle rejection, and bulk-job failure.
- [ ] Publish the customer support article and rollout note covering primary versus secondary authority, the default manager, legacy spreadsheet headers, and correction requests.
- [ ] For each pilot organization, record the default manager, secondary cap, fallback order, unresolved no-manager employees, notification preference, and backfill decision before enabling the feature; use a feature flag if the migration audit finds ambiguous existing data.

Close each item only with its specific evidence under [06a Release evidence](./06a-operations-release-evidence-prd.md). Existing source and isolated tests do not close database, browser, provider, or deployed checks.

