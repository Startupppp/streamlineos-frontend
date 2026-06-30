# StreamlineOS Product Bible

# Workflow & Automation Platform

# 17_Workflow_API_Contracts.md

## Purpose

Define stable, versioned API contracts for the Workflow & Automation Platform to ensure consistent communication between frontend, backend, SDKs, AI agents, and third-party integrations.

---

# API Standards

- REST APIs
- JSON payloads
- UUID identifiers
- ISO-8601 timestamps
- Cursor pagination
- Versioned endpoints
- Idempotent operations
- Consistent error responses

---

# Authentication

Every endpoint requires:

- Valid Access Token
- Active Organization
- RBAC Authorization

Headers

Authorization: Bearer <token>

Optional:

X-Organization-Id

---

# Workflow APIs

GET    /api/v1/workflows

GET    /api/v1/workflows/{id}

POST   /api/v1/workflows

PATCH  /api/v1/workflows/{id}

DELETE /api/v1/workflows/{id}

Actions

POST /api/v1/workflows/{id}/publish

POST /api/v1/workflows/{id}/disable

POST /api/v1/workflows/{id}/archive

POST /api/v1/workflows/{id}/duplicate

---

# Execution APIs

GET  /api/v1/workflow-executions

GET  /api/v1/workflow-executions/{id}

POST /api/v1/workflow-executions/{workflowId}/execute

POST /api/v1/workflow-executions/{executionId}/cancel

POST /api/v1/workflow-executions/{executionId}/retry

POST /api/v1/workflow-executions/{executionId}/replay

---

# Approval APIs

GET  /api/v1/workflow-approvals

POST /api/v1/workflow-approvals/{id}/approve

POST /api/v1/workflow-approvals/{id}/reject

POST /api/v1/workflow-approvals/{id}/delegate

---

# Scheduler APIs

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

GET /api/v1/workflow-analytics/slas

---

# Webhooks

POST /api/v1/workflow-webhooks/{triggerKey}

Requirements:

- Signature verification
- Timestamp validation
- Replay protection
- Idempotency

---

# Success Response

{
  "success": true,
  "data": {}
}

---

# Error Response

{
  "success": false,
  "error": {
    "code": "WORKFLOW_NOT_FOUND",
    "message": "Workflow not found.",
    "requestId": "req_xxx"
  }
}

---

# Standard Error Codes

- WORKFLOW_NOT_FOUND
- EXECUTION_NOT_FOUND
- APPROVAL_NOT_FOUND
- TEMPLATE_NOT_FOUND
- INVALID_TRIGGER
- INVALID_ACTION
- EXECUTION_FAILED
- RATE_LIMITED
- UNAUTHORIZED
- FORBIDDEN
- VALIDATION_ERROR
- TENANT_ACCESS_DENIED

---

# Acceptance Criteria

- Stable contracts
- Versioned APIs
- Zod validated
- Multi-tenant safe
- SDK friendly
- Production ready
