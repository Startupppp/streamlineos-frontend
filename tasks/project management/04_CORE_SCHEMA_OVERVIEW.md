# Core Schema Overview

## Required Core Tables

- project_workspaces.
- project_portfolios.
- project_programs.
- projects.
- project_templates.
- project_template_versions.
- project_members.
- project_roles.
- project_permissions.
- workflows.
- workflow_statuses.
- workflow_transitions.
- work_items.
- work_item_links.
- work_item_custom_fields.
- work_item_custom_field_values.
- project_views.
- sprints.
- milestones.
- releases.
- test_cases.
- test_runs.
- test_results.
- bugs.
- risks.
- decisions.
- change_requests.
- approvals.
- automation_rules.
- automation_runs.
- project_forms.
- form_submissions.
- time_logs.
- resource_allocations.
- budgets.
- comments.
- attachments.
- project_chat_links.
- activity_events.
- notification_preferences.

## Common Columns For Tenant-Owned Tables

- id.
- org_id.
- created_by.
- updated_by.
- created_at.
- updated_at.
- deleted_at nullable.

## Common Audit Event Fields

- id.
- org_id.
- actor_id.
- entity_type.
- entity_id.
- action.
- before_json.
- after_json.
- metadata_json.
- created_at.

## Data Integrity Rules

- Work item belongs to one project.
- Work item may have one parent.
- Work item may link to many related items.
- Status must belong to the work item's workflow.
- Sprint must belong to project.
- Test result must belong to test run.
- Client-visible fields must be explicitly marked.

