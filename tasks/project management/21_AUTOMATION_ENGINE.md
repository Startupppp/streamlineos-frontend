# Automation Engine

## Automation Schema

- id.
- org_id.
- project_id nullable.
- name.
- trigger_type.
- conditions_json.
- actions_json.
- enabled.
- run_as_user_id.
- created_by.

## Triggers

- Project created.
- Task created.
- Status changed.
- Assignee changed.
- Due date missed.
- Comment added.
- Form submitted.
- Sprint started/completed.
- QA failed.
- Release approved.
- Client comment added.

## Conditions

- Project.
- Type.
- Status.
- Priority.
- Assignee role.
- Label.
- Custom field.
- Date.
- Client visible.
- Budget threshold.

## Actions

- Assign user.
- Change status.
- Add label.
- Create task/subtask.
- Send chat message.
- Send email.
- Notify client.
- Request approval.
- Add to sprint.
- Update project health.

## Edge Cases

- Infinite automation loop.
- Target user inactive.
- Permission denied for run-as user.
- Chat action fails.
- Bulk action triggers too many automation runs.

