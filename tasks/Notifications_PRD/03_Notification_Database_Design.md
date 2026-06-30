# StreamlineOS Product Bible

# Notification Platform

# 03_Database_Design.md

## Purpose

Define the production-ready database architecture for the Notification Platform.

---

# Design Principles

- Multi-tenant first
- UUID primary keys
- Event-driven
- Channel agnostic
- Highly scalable
- Immutable delivery history
- Optimized indexes
- Forward-only migrations

---

# Core Tables

## notifications

Stores the master notification record.

Columns

- id
- organization_id
- event_id
- notification_type
- title
- message
- priority
- source_module
- status
- created_by
- created_at
- updated_at

Indexes

- organization_id
- status
- notification_type
- created_at

---

## notification_recipients

Tracks recipients for every notification.

Columns

- id
- notification_id
- user_id
- delivery_status
- read_at
- archived_at
- snoozed_until
- created_at

Indexes

- notification_id
- user_id

---

## notification_channels

Defines delivery channels.

Examples

- In-App
- Email
- Push
- SMS
- WhatsApp
- Slack
- Teams
- Webhook

Columns

- id
- code
- name
- enabled

---

## notification_deliveries

One record per delivery attempt.

Columns

- id
- notification_id
- recipient_id
- channel
- provider
- status
- attempts
- delivered_at
- failed_at
- error_message

---

## notification_templates

Stores reusable templates.

Columns

- id
- template_key
- name
- channel
- locale
- subject
- body
- version
- is_active

---

## notification_preferences

Stores user preferences.

Columns

- id
- organization_id
- user_id
- category
- channel
- enabled

---

## notification_categories

Examples

- Security
- CRM
- HRMS
- Billing
- AI
- Projects
- Workflow
- Marketing
- System

---

## broadcasts

Stores organization broadcasts.

Columns

- id
- organization_id
- title
- message
- audience
- scheduled_at
- status

---

## delivery_queue

Stores pending notifications.

Columns

- id
- notification_id
- scheduled_at
- priority
- retry_count
- next_retry_at

---

## notification_audit_logs

Tracks every notification event.

Examples

- Created
- Queued
- Delivered
- Failed
- Read
- Archived
- Deleted

---

# Relationships

Organization

└── Notifications

├── Recipients

├── Deliveries

├── Templates

├── Preferences

├── Broadcasts

└── Audit Logs

---

# Constraints

- Immutable delivery history
- Tenant isolation
- No duplicate delivery records
- Soft delete notifications only
- Append-only audit logs

---

# Acceptance Criteria

- Fully normalized
- Event driven
- Multi-tenant secure
- Enterprise scalable
- Production ready
