# StreamlineOS Product Bible

# Timesheets / Worklogs

# 11_Data_Model_And_Database.md

## Purpose

Define data model for standalone timesheets while preserving current project time entry compatibility.

## Existing Table To Extend

### `timesheets`

Existing table can remain base time entry table.

Required additions if missing:

- `client_id`
- `project_id` nullable direct reference for non-ticket entries
- `task_id` or `work_item_id`
- `timesheet_period_id`
- `timer_session_id`
- `billing_type`
- `bill_rate`
- `cost_rate`
- `rate_source`
- `currency`
- `invoicing_status`
- `payroll_status`
- `submitted_at`
- `locked_at`
- `locked_by`
- `voided_at`
- `void_reason`
- `source`
- `custom_fields`

Do not break existing `ticket_id` linkage.

## New Tables

### `timesheet_periods`

Represents a user's week/month timesheet.

Fields:

- `id`
- `org_id`
- `user_id`
- `period_start`
- `period_end`
- `status`
- `total_hours`
- `billable_hours`
- `non_billable_hours`
- `submitted_at`
- `approved_at`
- `rejected_at`
- `locked_at`
- `current_approver_id`
- `created_at`
- `updated_at`

Unique:

- `org_id + user_id + period_start + period_end`

### `timesheet_approval_steps`

Fields:

- `id`
- `org_id`
- `period_id`
- `entry_id` nullable
- `approval_type`
- `approver_user_id`
- `external_client_contact_id` nullable
- `status`
- `comment`
- `acted_at`
- `sort_order`
- `created_at`

### `timer_sessions`

Fields:

- `id`
- `org_id`
- `user_id`
- `client_id`
- `project_id`
- `ticket_id`
- `task_id`
- `description`
- `billable`
- `started_at`
- `paused_at`
- `stopped_at`
- `duration_seconds`
- `status`
- `source_device`
- `metadata`

### `timesheet_settings`

Fields:

- `id`
- `org_id`
- `work_week_start`
- `required_fields`
- `rounding_rule`
- `max_hours_per_day`
- `allow_overlapping_entries`
- `allow_backdated_entries`
- `backdate_limit_days`
- `approval_mode`
- `client_approval_enabled`
- `lock_after_approval`
- `lock_after_invoice`
- `reminder_rules`
- `created_at`
- `updated_at`

### `timesheet_rate_cards`

Fields:

- `id`
- `org_id`
- `name`
- `currency`
- `is_default`
- `effective_from`
- `effective_to`
- `created_at`
- `updated_at`

### `timesheet_rates`

Fields:

- `id`
- `org_id`
- `rate_card_id`
- `client_id`
- `project_id`
- `user_id`
- `role_id`
- `task_id`
- `billing_type`
- `bill_rate`
- `cost_rate`
- `priority`
- `created_at`
- `updated_at`

### `timesheet_budgets`

Fields:

- `id`
- `org_id`
- `client_id`
- `project_id`
- `budget_type`
- `budget_hours`
- `budget_amount`
- `consumed_hours`
- `consumed_amount`
- `alert_thresholds`
- `starts_at`
- `ends_at`
- `status`

### `timesheet_exports`

Fields:

- `id`
- `org_id`
- `export_type`
- `status`
- `date_range_start`
- `date_range_end`
- `filters`
- `file_url`
- `created_by`
- `created_at`

### `timesheet_audit_events`

Fields:

- `id`
- `org_id`
- `actor_user_id`
- `entity_type`
- `entity_id`
- `action`
- `before`
- `after`
- `reason`
- `ip_address`
- `user_agent`
- `created_at`

### `timesheet_client_approval_links`

Fields:

- `id`
- `org_id`
- `client_id`
- `project_id`
- `period_start`
- `period_end`
- `token_hash`
- `expires_at`
- `status`
- `approved_by_name`
- `approved_by_email`
- `approved_at`
- `rejected_at`
- `comment`

## Status Enums

Time entry:

- draft
- submitted
- approved
- rejected
- locked
- invoice_drafted
- invoiced
- payroll_exported
- voided

Period:

- open
- draft
- submitted
- partially_approved
- approved
- rejected
- locked
- reopened

Timer:

- running
- paused
- stopped
- discarded
- converted

## Indexes

Required:

- `timesheets(org_id, user_id, date)`
- `timesheets(org_id, project_id, date)`
- `timesheets(org_id, client_id, date)`
- `timesheets(org_id, status)`
- `timesheets(org_id, invoicing_status)`
- `timesheet_periods(org_id, user_id, period_start)`
- `timer_sessions(org_id, user_id, status)`
- `timesheet_audit_events(org_id, entity_type, entity_id, created_at)`

## Data Rules

- Tenant scope every row.
- Never hard-delete approved/invoiced/payroll-exported entries.
- Snapshot rates when approved or invoiced.
- Use audit events for all financial state changes.
- Use additive migrations only.
