# Approvals Engine

## Approval Types

- Task.
- Milestone.
- Budget.
- Release.
- Change request.
- Client approval.
- Document.
- Timesheet.

## Approval Schema

- id.
- org_id.
- entity_type.
- entity_id.
- requested_by.
- approver_id.
- status.
- due_at.
- decision_comment.
- decided_at.

## Statuses

- Requested.
- Pending.
- Approved.
- Rejected.
- Changes requested.
- Escalated.
- Cancelled.

## Rules

- Multi-level approvals.
- Conditional approval by amount/status/client.
- Delegation.
- Escalation.
- Reminder.

## Edge Cases

- Approver is requester.
- Approver inactive.
- Entity changed during approval.
- Approval deadline missed.
- Client approval exposed internal fields.

