# Work Item Model And CRUD

## Work Item Types

- Epic.
- Feature.
- Story.
- Task.
- Subtask.
- Checklist item.
- Bug.
- Test case link.
- Change request task.
- Risk action.
- Incident action.

## Core Fields

- id.
- org_id.
- project_id.
- key.
- type.
- title.
- description.
- status_id.
- priority.
- parent_id.
- assignee_id.
- reporter_id.
- reviewer_id.
- tester_id.
- start_date.
- due_date.
- estimate_minutes.
- story_points.
- actual_minutes.
- client_visible.
- is_archived.
- created_at.
- updated_at.
- deleted_at.

## CRUD

- Create work item.
- Read detail.
- Update fields.
- Change status.
- Duplicate.
- Convert type.
- Move project.
- Archive.
- Restore.
- Soft delete.
- Permanent delete admin-only.

## Edge Cases

- Parent task deleted.
- Moving task to project with different workflow.
- Assignee removed from project.
- Required field missing during transition.
- Client-visible child under hidden parent.
- Circular dependency.

