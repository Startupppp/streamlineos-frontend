# StreamlineOS Product Bible

# Workflow & Automation Platform

# 18_Workflow_Drizzle_Schema.md

## Purpose

Define the production-ready Drizzle ORM schema for the Workflow & Automation Platform.

---

# Design Principles

- UUID primary keys
- Multi-tenant architecture
- Immutable workflow versions
- Event-driven execution
- Optimized indexes
- Forward-only migrations

---

# Core Tables

## workflows

Columns

- id (uuid, pk)
- organization_id (fk)
- name
- description
- status
- active_version_id
- created_by
- created_at
- updated_at

Indexes

- organization_id
- status

---

## workflow_versions

Columns

- id (uuid, pk)
- workflow_id (fk)
- version
- definition_json
- published_by
- published_at
- checksum

Unique

- workflow_id + version

---

## workflow_triggers

Columns

- id
- workflow_version_id
- trigger_type
- configuration
- enabled

---

## workflow_actions

Columns

- id
- workflow_version_id
- node_id
- action_type
- configuration
- execution_order

---

## workflow_executions

Columns

- id
- organization_id
- workflow_version_id
- trigger_source
- status
- started_at
- completed_at
- duration_ms

Indexes

- organization_id
- status
- started_at

---

## workflow_execution_steps

Columns

- id
- execution_id
- node_id
- node_type
- status
- input_json
- output_json
- duration_ms

---

## workflow_approvals

Columns

- id
- execution_id
- approver_id
- status
- assigned_at
- responded_at

---

## workflow_schedules

Columns

- id
- workflow_id
- cron_expression
- timezone
- enabled
- next_run_at

---

## workflow_variables

Columns

- id
- workflow_version_id
- key
- value_type
- default_value

---

## workflow_secrets

Columns

- id
- organization_id
- name
- encrypted_value
- created_at

---

## workflow_audit_logs

Columns

- id
- organization_id
- workflow_id
- execution_id
- actor_id
- action
- metadata
- created_at

---

# Enums

WorkflowStatus

- DRAFT
- PUBLISHED
- DISABLED
- ARCHIVED

ExecutionStatus

- PENDING
- RUNNING
- WAITING
- COMPLETED
- FAILED
- CANCELLED
- TIMED_OUT

TriggerType

- EVENT
- SCHEDULE
- WEBHOOK
- API
- MANUAL

---

# Constraints

- Tenant isolation
- Immutable versions
- Immutable execution history
- Encrypted secrets
- Append-only audit logs

---

# Acceptance Criteria

- Drizzle compatible
- Fully normalized
- Multi-tenant secure
- Enterprise scalable
- Production ready
