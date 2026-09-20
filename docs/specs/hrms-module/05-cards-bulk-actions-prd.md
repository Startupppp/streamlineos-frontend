# HRM-05 — Cards, Row Actions, and Bulk Actions PRD

> Acceptance reference only. Dispatch and status live in [README.md](./README.md).

## Outcome

Every HRMS card and table row exposes the actions the customer job requires —
no more, no less — with clear rules for what is configurable versus fixed. Bulk
actions are fully functional, permission-safe, and honest about partial
failure.

## Ownership Boundary

Owns action catalogs, configurability, and bulk APIs/UI. Filter interaction
rules shared with HRM-04. Validation of bulk payloads with HRM-06.

## Current Source Findings

- Directory users support bulk invite/assign/suspend; employees list lacks a
  mirrored bulk bar.
- Recruitment has bulk import / reject / shortlist (BOUNDARY — do not expand
  here).
- Backend has `POST /hr/employees/onboard/bulk`, import/export jobs; missing
  bulk leave approve/reject, attendance regularize, employee field updates,
  document acknowledge, helpdesk assign.
- Cards (travel, benefits, employee grid, hub queues) have uneven overflow
  menus; many only open detail.

## Configurability Model

### Fixed by platform (not customer-configurable)

- Authorization checks and data-scope enforcement
- Destructive confirmations (terminate, delete document, legal hold)
- Audit logging and idempotency keys
- Tenant isolation
- Required fields on legal/payroll-adjacent forms
- Self-service vs admin boundary

### Configurable by org admin (settings)

- Which optional row actions appear in overflow (when permission allows)
- Default view (table vs cards) per collection
- Approval chain templates / workflow definitions
- Custom fields on cards (show/hide)
- Notification preferences for action outcomes
- Leave policy and attendance policy parameters
- Helpdesk categories and routing rules

### Configurable by end user (personal)

- Column visibility and order
- Density
- Default filters / saved views (HRM-04)
- Pin favorite actions in overflow (optional P2)

## Card and Row Action Catalogs

### Employee card / row

| Action | Where | Permission | Notes |
|--------|-------|------------|-------|
| Open profile | always | view | Primary |
| Edit job data | overflow / sheet | manage | |
| Change manager | overflow | manage | Bulk candidate |
| Change department | overflow | manage | Bulk candidate |
| Deactivate / exit | overflow | exit/manage | Confirm |
| Assign asset | overflow | assets | |
| View documents | overflow | documents | |
| Start onboarding | overflow | onboarding | |
| Message / chat | overflow | if chat entitlement | Deep link |
| Copy email | overflow | view | |

### Leave request card / row

| Action | Notes |
|--------|-------|
| Approve / Reject | Manager or HR; reason on reject |
| Cancel | Requester or HR |
| View policy balance | Read |
| Add comment | If workflows support |

### WFH request card / row

| Action | Notes |
|--------|-------|
| Approve / Reject | Manager or HR; reason on reject (HRM-13) |
| Cancel | Requester before start date |
| Open attendance day | After approval |

### Attendance row

| Action | Notes |
|--------|-------|
| Regularize | Request or admin correct |
| Open day detail | Shows **WFO or WFH** badge |
| Flag exception | |
| Request WFH | When policy allows same-day / future switch |

### Document card

| Action | Notes |
|--------|-------|
| Download / preview | ACL |
| Request acknowledge | |
| Archive / replace | manage |
| Share to employee vault | |

### Case / helpdesk

| Action | Notes |
|--------|-------|
| Assign | |
| Change status | |
| Escalate | |
| Merge (P2) | |

### Asset card

| Action | Notes |
|--------|-------|
| Assign / unassign | |
| Mark return | |
| Edit | |
| Retire | |

### Hub queue cards

| Action | Notes |
|--------|-------|
| Open owning collection filtered | Must not 404 |
| Quick approve when safe | Idempotent |

- [ ] **HRM-05-001** implement missing overflow actions per catalog on employees,
  leave, attendance, documents, cases, assets.
- [ ] **HRM-05-002** every destructive action uses a confirm pattern with
  consequence copy.
- [ ] **HRM-05-003** actions hidden by permission are omitted, not disabled
  without explanation — or disabled with tooltip naming the missing permission.
- [ ] **HRM-05-004** card primary click opens detail; action buttons stop
  propagation.

## Bulk Actions

### Required bulk (P0)

| Collection | Actions | API |
|------------|---------|-----|
| Employees | Activate/deactivate, change department, change manager, export selected | New or import-job backed |
| Leave | Approve, reject (with reason) | New endpoints |
| WFH | Approve, reject (with reason) | New or extend `/hr/wfh` (HRM-13) |
| Attendance | Regularize selected exceptions | New |
| Documents | Request acknowledgement, archive | New or workflow |
| Cases / Helpdesk | Assign, set status | New |
| Expenses | Approve / reject | Align with expenses module |
| Assets | Assign location, mark under repair | New |

### Deferred bulk (P1/P2)

- Bulk shift/roster assign
- Bulk performance cycle assign
- Bulk policy acknowledge
- Bulk custom-field set

### Bulk UX contract

1. Select rows on current filtered page; optional “select all matching filter”
   only with server-side bulk job (never silent client loop over 10k ids).
2. Toolbar appears when selection > 0.
3. Confirm sheet summarizes count + irreversible effects.
4. Server returns per-id results; UI shows success / skipped / failed.
5. Partial failure does not roll back successes unless the API is transactional
   and documented as all-or-nothing.
6. Idempotency-Key on bulk POST.
7. Rate limit and max batch size (e.g. 100 ids sync; larger → async job).
8. Cache invalidation uses the shared HR invalidator (HRM-07).
9. Selection clears on filter change unless explicitly preserved.

- [ ] **HRM-05-005** ship employee bulk bar with department/manager/deactivate.
- [ ] **HRM-05-006** ship leave bulk approve/reject.
- [ ] **HRM-05-006a** ship WFH bulk approve/reject (see HRM-13-015).
- [ ] **HRM-05-007** ship attendance bulk regularize for exceptions.
- [ ] **HRM-05-008** ship helpdesk/cases bulk assign + status.
- [ ] **HRM-05-009** ship documents bulk acknowledgement request.
- [ ] **HRM-05-010** async job UI for batches > sync max (reuse import job
  pattern).
- [ ] **HRM-05-011** e2e: cross-tenant ids in bulk body are ignored as not-found
  without leakage.
- [ ] **HRM-05-012** e2e: actor without approve cannot bulk-approve via API.

## Acceptance Checks

- [ ] **HRM-05-013** browser proof for each P0 bulk path including partial
  failure.
- [ ] **HRM-05-014** Evidence Log lists new endpoints and permissions.
