# StreamlineOS Product Bible

# Workflow & Automation Platform

# 05_Workflow_Backend_APIs.md

## Purpose

Define the REST API architecture for the Workflow & Automation Platform.

---

# API Principles

- RESTful APIs
- Thin route handlers
- Service layer architecture
- Repository pattern
- Zod validation
- Multi-tenant enforcement
- Versioned endpoints
- Idempotent operations
- Audit every mutation

---

# Workflow APIs

GET    /api/v1/workflows

GET    /api/v1/workflows/{workflowId}

POST   /api/v1/workflows

PATCH  /api/v1/workflows/{workflowId}

DELETE /api/v1/workflows/{workflowId}

Actions

POST /api/v1/workflows/{workflowId}/publish

POST /api/v1/workflows/{workflowId}/disable

POST /api/v1/workflows/{workflowId}/archive

POST /api/v1/workflows/{workflowId}/duplicate

---

# Execution APIs

GET  /api/v1/workflow-executions

GET  /api/v1/workflow-executions/{executionId}

POST /api/v1/workflow-executions/{workflowId}/execute

POST /api/v1/workflow-executions/{executionId}/cancel

POST /api/v1/workflow-executions/{executionId}/retry

---

# Approval APIs

GET  /api/v1/workflow-approvals

POST /api/v1/workflow-approvals/{approvalId}/approve

POST /api/v1/workflow-approvals/{approvalId}/reject

POST /api/v1/workflow-approvals/{approvalId}/delegate

---

# Trigger APIs

GET    /api/v1/workflow-triggers

POST   /api/v1/workflow-triggers

PATCH  /api/v1/workflow-triggers/{id}

DELETE /api/v1/workflow-triggers/{id}

---

# Schedule APIs

GET    /api/v1/workflow-schedules

POST   /api/v1/workflow-schedules

PATCH  /api/v1/workflow-schedules/{id}

DELETE /api/v1/workflow-schedules/{id}

---

# Template APIs

GET    /api/v1/workflow-templates

POST   /api/v1/workflow-templates

PATCH  /api/v1/workflow-templates/{id}

DELETE /api/v1/workflow-templates/{id}

---

# Analytics APIs

GET /api/v1/workflow-analytics

GET /api/v1/workflow-analytics/executions

GET /api/v1/workflow-analytics/performance

---

# Validation

Every endpoint validates:

- Authentication
- Organization
- RBAC
- Subscription entitlement
- Zod request schema

---

# Service Layer

lib/services/workflow/

- workflow.service.ts
- execution.service.ts
- approval.service.ts
- trigger.service.ts
- scheduler.service.ts
- analytics.service.ts

---

# Repository Layer

Responsibilities

- Transactions
- Optimized queries
- Tenant isolation
- Audit logging
- Version management

---

# Standard Error

{
  "success": false,
  "error": {
    "code": "WORKFLOW_NOT_FOUND",
    "message": "Workflow not found."
  }
}

---

# Acceptance Criteria

- Thin handlers
- Versioned APIs
- Fully audited
- Multi-tenant safe
- Production ready
