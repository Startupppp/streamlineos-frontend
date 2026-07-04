# StreamlineOS Product Bible

# Timesheets / Worklogs

# 08_Approvals_Locking_And_Audit.md

## Approval Types

### Entry-Level Approval

Existing capability.

Use for:

- individual time entries,
- ticket-specific work,
- exceptions.

### Timesheet Period Approval

Primary new workflow.

Use for:

- weekly/monthly submissions,
- payroll,
- manager review.

### Project Approval

Approver is project manager.

### Department/People Approval

Approver is reporting manager.

### Client Approval

External client approves billable work before invoice.

## Approval Rules

Configurable by:

- organization,
- project,
- client,
- employee group,
- billing type,
- amount/hours threshold.

Rule examples:

- all billable entries require project manager approval.
- entries above 10 hours/day require manager review.
- client approval required before invoicing.
- non-billable internal admin does not require approval.

## Status Flow

Draft -> Submitted -> Approved -> Locked -> Invoiced/Payroll Exported

Rejected path:

Submitted -> Rejected -> Draft -> Submitted

Reopen path:

Approved/Locked -> Reopened -> Draft/Submitted

## Bulk Approval

Managers can:

- approve selected,
- reject selected with comment,
- approve all clean submissions,
- remind missing submissions,
- delegate approval.

Clean submission means:

- no missing required fields,
- no overlaps,
- within daily limit,
- no missing rates for billable entries,
- no policy exceptions.

## Period Locking

Lock policies:

- after approval,
- after invoice,
- after payroll export,
- after date cutoff,
- manually by admin.

Locked entries:

- cannot be edited by employee.
- can be corrected through adjustment workflow.

## Rejection

Reject requires:

- reason/comment,
- optional entry references,
- notification to employee,
- status timeline.

## Audit Log

Audit all:

- create,
- update,
- delete/void,
- submit,
- approve,
- reject,
- reopen,
- lock,
- unlock,
- rate override,
- invoice export,
- payroll export,
- client approval,
- settings change.

Audit fields:

- actor,
- action,
- before/after redacted,
- timestamp,
- IP/user agent,
- source,
- reason/comment.

## Compliance

Rules:

- do not hard-delete approved/invoiced entries.
- support void/reversal.
- maintain immutable audit for financial workflows.
- export logs must be retained.

## Acceptance Criteria

- Weekly timesheet can be submitted and approved.
- Manager can bulk approve clean timesheets.
- Rejection returns timesheet with reason.
- Approved entries are locked.
- Invoiced/payroll-exported entries cannot be silently edited.
- Audit trail shows every state change.
