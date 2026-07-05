# Permissions And Access Control

## Permission Principles

- Deny by default for sensitive data.
- Client-visible must be explicit.
- Financial data requires separate permission.
- Internal chat and notes are never client-visible unless intentionally shared.
- Every permission check must be tenant-scoped.

## Permission Matrix Areas

- Project create/edit/delete/archive.
- Member management.
- Workflow management.
- Task create/edit/delete.
- Status transition.
- Sprint management.
- QA management.
- Release management.
- Automation management.
- Approval management.
- Budget/financial access.
- Client portal access.
- Report export.
- Admin settings.

## Data Scopes

- All workspace projects.
- Own projects.
- Assigned projects.
- Department projects.
- Client-visible projects.
- Assigned tasks only.

## Client User Restrictions

Client users cannot see:

- Internal estimates.
- Internal cost.
- Margin.
- Internal notes.
- Internal chat.
- Hidden tasks.
- Developer-only technical details unless shared.
- Other clients.

## Audit Required For

- Permission changes.
- Client visibility changes.
- Financial changes.
- Task deletion.
- Workflow changes.
- Automation changes.
- Project archive/delete.

