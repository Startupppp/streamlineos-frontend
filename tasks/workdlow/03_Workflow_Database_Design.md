# StreamlineOS Product Bible

# Workflow & Automation Platform

# 03_Workflow_Database_Design.md

## Purpose

Define the production-ready database architecture for the Workflow & Automation Platform.

---

# Design Principles

- Multi-tenant first
- UUID primary keys
- Event-driven
- Version controlled
- Horizontally scalable
- Immutable execution history
- Optimized indexes
- Forward-only migrations

---

# Core Tables

## workflows

Stores workflow definitions.

Columns

- id
- organization_id
- name
- description
- status
- version
- created_by
- created_at
- updated_at

Indexes

- organization_id
- status
- version

---

## workflow_versions

Stores immutable workflow versions.

Columns

- id
- workflow_id
- version
- definition_json
- published_by
- published_at

---

## workflow_triggers

Supported Types

- Event
- Schedule
- Webhook
- Manual
- API

Columns

- id
- workflow_version_id
- trigger_type
- configuration

---

## workflow_actions

Stores executable actions.

Examples

- Send Notification
- Create Record
- Update Record
- AI Task
- HTTP Request
- Integration Action
- Delay
- Condition

Columns

- id
- workflow_version_id
- action_type
- configuration

---

## workflow_executions

Stores every execution.

Columns

- id
- workflow_version_id
- organization_id
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

Tracks every executed node.

Columns

- id
- execution_id
- node_id
- node_type
- status
- input
- output
- duration_ms

---

## workflow_approvals

Stores approval state.

Columns

- id
- execution_id
- approver_id
- status
- approved_at
- rejected_at

---

## workflow_variables

Stores reusable variables.

Columns

- id
- workflow_version_id
- key
- value_type
- default_value

---

## workflow_schedules

Stores scheduled executions.

Columns

- id
- workflow_id
- cron_expression
- timezone
- next_run_at

---

## workflow_secrets

Stores encrypted secrets.

Columns

- id
- organization_id
- name
- encrypted_value

Never expose plaintext secrets.

---

## workflow_audit_logs

Tracks every workflow event.

Examples

- Published
- Executed
- Failed
- Cancelled
- Approved

---

# Constraints

- Tenant isolation
- Immutable versions
- Immutable execution history
- Encrypted secrets
- Append-only audit logs

---

# Acceptance Criteria

- Fully normalized
- Version controlled
- Multi-tenant secure
- Enterprise scalable
- Production ready
