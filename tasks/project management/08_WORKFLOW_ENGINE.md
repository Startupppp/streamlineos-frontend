# Workflow Engine

## Workflow Status Categories

- Backlog.
- Not started.
- Active.
- Review.
- QA.
- Blocked.
- Done.
- Cancelled.

## Default Workflow

- Backlog.
- To Do.
- Ready.
- In Progress.
- In Review.
- QA.
- Blocked.
- Ready for Release.
- Done.
- Cancelled.

## Transition Schema

- from_status_id.
- to_status_id.
- allowed_roles.
- required_fields.
- approval_required.
- automation_on_enter.
- automation_on_exit.
- client_visible_status_label.

## Workflow Builder

Admin configures:

- Statuses.
- Colors.
- Transition rules.
- Required fields.
- WIP limits.
- SLA timers.
- Approval gates.
- Automation hooks.

## Edge Cases

- Status deleted while tasks exist.
- Transition removed while task is in old status.
- Automation fails on transition.
- Approval required but approver inactive.
- Client-visible mapped status missing.

