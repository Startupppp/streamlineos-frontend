# StreamlineOS Product Bible

# Notification Platform

# 18_Notification_Drizzle_Schema.md

## Purpose

Define the production-ready Drizzle ORM schema for the Notification Platform.

---

# Design Principles

- UUID primary keys
- Multi-tenant architecture
- Event-driven design
- Provider agnostic
- Immutable audit history
- Optimized indexes
- Forward-only migrations

---

# Core Tables

## notifications

Columns

- id (uuid, pk)
- organization_id (fk)
- event_id
- type
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
- created_at

---

## notification_recipients

Columns

- id (uuid, pk)
- notification_id (fk)
- user_id (fk)
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

Columns

- id (uuid, pk)
- code
- name
- provider
- enabled

Unique:

- code

---

## notification_deliveries

Columns

- id (uuid, pk)
- notification_id (fk)
- recipient_id (fk)
- channel
- provider
- status
- attempts
- delivered_at
- failed_at
- error_message

Indexes

- notification_id
- provider
- status

---

## notification_templates

Columns

- id (uuid, pk)
- template_key
- channel
- locale
- subject
- body
- version
- is_active
- created_at

Unique:

- template_key
- version

---

## notification_preferences

Columns

- id (uuid, pk)
- organization_id (fk)
- user_id (fk)
- category
- channel
- enabled

Indexes

- organization_id
- user_id

---

## broadcasts

Columns

- id (uuid, pk)
- organization_id (fk)
- title
- message
- audience
- status
- scheduled_at
- created_at

---

## notification_queue

Columns

- id (uuid, pk)
- notification_id (fk)
- priority
- scheduled_at
- retry_count
- next_retry_at
- worker_id

---

## notification_audit_logs

Columns

- id (uuid, pk)
- organization_id (fk)
- notification_id (fk)
- actor_id
- action
- metadata
- ip_address
- user_agent
- created_at

Indexes

- organization_id
- action
- created_at

---

# Enums

NotificationStatus

- CREATED
- QUEUED
- PROCESSING
- DELIVERED
- READ
- FAILED
- ARCHIVED
- EXPIRED

Priority

- LOW
- NORMAL
- HIGH
- CRITICAL

Channel

- IN_APP
- EMAIL
- PUSH
- SMS
- WHATSAPP
- SLACK
- TEAMS
- WEBHOOK

---

# Constraints

- Tenant isolation
- Immutable audit logs
- Soft deletes only
- No duplicate recipient entries
- Foreign key integrity

---

# Acceptance Criteria

- Drizzle compatible
- Fully normalized
- Multi-tenant secure
- Enterprise scalable
- Production ready
