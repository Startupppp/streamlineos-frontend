# StreamlineOS Product Bible

# Workflow & Automation Platform

# 20_Workflow_Claude_Code_Implementation.md

## Purpose

Provide a complete implementation blueprint for Claude Code to build the Workflow & Automation Platform within the existing StreamlineOS codebase.

Claude must first audit the repository, reuse existing architecture, and avoid duplicate implementations.

---

# Implementation Principles

- Audit before coding
- Reuse existing services
- Thin API handlers
- Business logic in services
- Repository pattern
- Strict TypeScript
- Zod validation
- TanStack Query
- Zustand only for UI state
- React Flow for workflow canvas
- Remove dead code
- Production-ready code only

---

# Phase 1 — Repository Audit

Audit:

- Existing workflow engine
- Event bus
- Queue infrastructure
- Scheduler implementation
- Notification integration
- AI integrations
- Approval logic
- Existing connectors
- RBAC implementation
- Audit logging

Deliverables:

- Architecture audit report
- Duplicate code report
- Refactoring recommendations
- Migration strategy

---

# Phase 2 — Database

Implement or refactor:

- workflows
- workflow_versions
- workflow_triggers
- workflow_actions
- workflow_executions
- workflow_execution_steps
- workflow_approvals
- workflow_schedules
- workflow_variables
- workflow_secrets
- workflow_audit_logs

Requirements:

- UUID primary keys
- Foreign keys
- Composite indexes
- Immutable versions
- Forward-only migrations

---

# Phase 3 — Backend Services

Implement:

- workflow.service.ts
- execution.service.ts
- trigger.service.ts
- approval.service.ts
- scheduler.service.ts
- connector.service.ts
- analytics.service.ts
- audit.service.ts

Requirements:

- Transactions
- Event publishing
- Audit logging
- Cache invalidation
- Retry handling
- Idempotent execution

---

# Phase 4 — APIs

Implement:

- Workflow APIs
- Execution APIs
- Approval APIs
- Scheduler APIs
- Template APIs
- Analytics APIs
- Webhook endpoints

Validate:

- Authentication
- Organization
- RBAC
- Subscription
- Zod schemas

---

# Phase 5 — Frontend

Build:

- Workflow Dashboard
- Workflow Builder
- React Flow Canvas
- Approval Center
- Execution Monitor
- Scheduler
- Analytics Dashboard

Requirements:

- Responsive
- Accessible
- Real-time
- Skeleton loading
- Error boundaries

---

# Phase 6 — Integrations

Integrate with:

- Authentication Platform
- Organization Platform
- User Management
- Notification Platform
- Subscription Platform
- CRM
- HRMS
- Projects
- Finance
- AI Platform

---

# Phase 7 — Testing

Run after every phase:

1. Type Check
2. ESLint
3. Unit Tests
4. Integration Tests
5. End-to-End Tests
6. Security Scan
7. Performance Tests
8. Production Build

Do not continue if mandatory tests fail.

---

# Folder Structure

app/(dashboard)/workflows/
components/workflow/
hooks/workflow/
lib/api/workflow/
lib/services/workflow/
stores/workflow/
types/workflow/

---

# Definition of Done

- Workflow engine operational
- Workflow builder functional
- Scheduling working
- Approvals operational
- Connectors integrated
- Analytics available
- Audit logging enabled
- No lint errors
- No type errors
- Production build passes

---

# Claude Code Rules

1. Audit the repository first.
2. Reuse existing implementations.
3. Never duplicate business logic.
4. Keep handlers thin.
5. Use service + repository layers.
6. Remove obsolete code safely.
7. Test after every implementation phase.
8. Keep documentation synchronized.
