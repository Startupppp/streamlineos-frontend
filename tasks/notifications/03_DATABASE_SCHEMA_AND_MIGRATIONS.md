# Database Schema And Migrations

## Backend Ownership
Backend owns schema, migrations, indexes, constraints, seed data, and data backfills.

## Frontend Ownership
Frontend consumes the API shapes generated from this schema. Frontend must not assume schema internals directly.

## Required Tables

### notification_events
Purpose: Registry of all notification event types.

Fields:
- `id`
- `org_id` nullable for global defaults
- `event_key` unique per org/global, example `project.task.assigned`
- `source_module`
- `category`
- `default_priority`
- `default_type`
- `title_template_key`
- `body_template_key`
- `default_channels` JSON array
- `allowed_channels` JSON array
- `mandatory`
- `user_configurable`
- `admin_configurable`
- `dedupe_window_seconds`
- `rate_limit_window_seconds`
- `rate_limit_max`
- `quiet_hours_behavior`: `respect`, `bypass_if_high`, `always_bypass`
- `fallback_policy` JSON
- `audience_resolver`
- `enabled`
- `created_at`
- `updated_at`

### notifications
Purpose: In-app notification record and canonical user-facing item.

Fields:
- `id`
- `org_id`
- `user_id` nullable for org-wide/system broadcasts
- `event_key`
- `type`: `INFO`, `SUCCESS`, `WARNING`, `ERROR`
- `priority`: `LOW`, `NORMAL`, `HIGH`, `CRITICAL`
- `category`
- `source_module`
- `entity_type`
- `entity_id`
- `actor_user_id`
- `title`
- `message`
- `link`
- `metadata` JSON
- `reason`
- `is_read`
- `read_at`
- `pinned`
- `archived_at`
- `snoozed_until`
- `deleted_at`
- `created_at`
- `updated_at`

### notification_deliveries
Purpose: Per-channel delivery tracking.

Fields:
- `id`
- `notification_id`
- `org_id`
- `user_id`
- `event_key`
- `channel`: `IN_APP`, `EMAIL`, `PUSH`, `SMS`, `WHATSAPP`, `SLACK`, `TEAMS`, `WEBHOOK`
- `provider`
- `recipient_address`
- `status`: `PENDING`, `QUEUED`, `SENDING`, `SENT`, `DELIVERED`, `READ`, `CLICKED`, `FAILED`, `BOUNCED`, `SUPPRESSED`, `CANCELLED`
- `attempt_count`
- `next_attempt_at`
- `sent_at`
- `delivered_at`
- `read_at`
- `clicked_at`
- `failed_at`
- `failure_code`
- `failure_message`
- `provider_message_id`
- `provider_response` JSON
- `cost_amount`
- `cost_currency`
- `idempotency_key`
- `created_at`
- `updated_at`

### notification_preferences
Extend existing preferences.

Required fields:
- Existing booleans: email, push, SMS, in-app, Slack, Teams, WhatsApp, sound.
- `quiet_hours_start`
- `quiet_hours_end`
- `quiet_hours_timezone`
- `digest_mode`
- `categories` JSON
- `channel_categories` JSON
- Add `event_preferences` JSON
- Add `module_preferences` JSON
- Add `priority_preferences` JSON
- Add `project_preferences` JSON optional
- Add `team_preferences` JSON optional
- Add `allow_critical_override`
- Add `updated_by`
- Add `last_reviewed_at`

### notification_policy_defaults
Purpose: Organization, role, department, and team defaults.

Fields:
- `id`
- `org_id`
- `scope_type`: `ORG`, `ROLE`, `DEPARTMENT`, `TEAM`, `PROJECT`
- `scope_id`
- `default_channels` JSON
- `event_overrides` JSON
- `category_overrides` JSON
- `can_user_override`
- `created_by`
- `created_at`
- `updated_at`

### notification_templates
Extend existing template table.

Required fields:
- `template_key`
- `name`
- `channel`
- `category`
- `locale`
- `subject`
- `body`
- `variables`
- `version`
- `status`: `DRAFT`, `ACTIVE`, `ARCHIVED`
- `is_active`
- `created_by`
- `approved_by`
- `approved_at`
- `created_at`
- `updated_at`

### notification_queue
Purpose: Work queue for external delivery.

Fields:
- `id`
- `delivery_id`
- `org_id`
- `run_at`
- `status`: `PENDING`, `LOCKED`, `DONE`, `FAILED`, `DEAD`
- `locked_by`
- `locked_at`
- `attempt_count`
- `last_error`
- `created_at`
- `updated_at`

### notification_provider_accounts
Purpose: Provider configuration per organization.

Fields:
- `id`
- `org_id`
- `channel`
- `provider`: `SMTP`, `SENDGRID`, `TWILIO`, `META_WHATSAPP`, `SLACK`, `TEAMS`, `WEBHOOK`, `WEB_PUSH`
- `display_name`
- `config_encrypted`
- `enabled`
- `sandbox_mode`
- `daily_send_limit`
- `monthly_cost_limit`
- `created_by`
- `created_at`
- `updated_at`

### notification_broadcasts
Purpose: Admin-created announcements/campaigns.

Fields:
- `id`
- `org_id`
- `title`
- `message`
- `type`
- `priority`
- `category`
- `channels` JSON
- `audience` JSON
- `status`
- `scheduled_at`
- `sent_at`
- `recipient_count`
- `delivered_count`
- `failed_count`
- `created_by`
- `approved_by`
- `approved_at`
- `created_at`
- `updated_at`

### notification_audit_logs
Purpose: Track preference, template, provider, policy, and send changes.

Fields:
- `id`
- `org_id`
- `actor_user_id`
- `action`
- `entity_type`
- `entity_id`
- `before` JSON
- `after` JSON
- `ip_address`
- `user_agent`
- `created_at`

### notification_suppression_rules
Purpose: Dedupe, mute, unsubscribe, bounce, invalid recipient, or fatigue suppression.

Fields:
- `id`
- `org_id`
- `user_id`
- `scope_type`
- `scope_key`
- `channel`
- `reason`
- `expires_at`
- `created_by`
- `created_at`

### notification_digests
Purpose: Digest generation and send records.

Fields:
- `id`
- `org_id`
- `user_id`
- `digest_mode`
- `period_start`
- `period_end`
- `status`
- `notification_ids` JSON
- `summary`
- `sent_at`
- `created_at`

## Indexes
- `notifications(org_id, user_id, created_at desc)`
- `notifications(org_id, user_id, is_read, created_at desc)`
- `notifications(org_id, user_id, category, created_at desc)`
- `notifications(org_id, event_key, entity_type, entity_id)`
- `notification_deliveries(org_id, status, next_attempt_at)`
- `notification_deliveries(idempotency_key)` unique
- `notification_events(org_id, event_key)` unique
- `notification_templates(org_id, template_key, channel, locale, version)`
- `notification_queue(status, run_at)`
- `notification_audit_logs(org_id, created_at desc)`

## Migration Requirements
- Add new tables without deleting old data.
- Backfill existing notifications with best-effort `event_key` based on `source_module` and metadata.
- Existing preferences must default safely:
  - in-app enabled true
  - email enabled true
  - push enabled true if supported
  - SMS/WhatsApp disabled until user/admin opts in
  - security notifications mandatory
