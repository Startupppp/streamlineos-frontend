# StreamlineOS Product Bible

# Notification Platform

# 17_Notification_API_Contracts.md

## Purpose

Define stable, versioned API contracts for the Notification Platform to ensure consistency between frontend, backend, SDKs, and third-party integrations.

---

# API Standards

- REST APIs
- JSON payloads
- UUID identifiers
- ISO-8601 timestamps
- Cursor pagination
- Versioned endpoints
- Idempotent mutations
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

# Notifications

GET    /api/v1/notifications

GET    /api/v1/notifications/{id}

POST   /api/v1/notifications

PATCH  /api/v1/notifications/{id}

DELETE /api/v1/notifications/{id}

Actions

POST /api/v1/notifications/{id}/read

POST /api/v1/notifications/{id}/unread

POST /api/v1/notifications/{id}/archive

POST /api/v1/notifications/{id}/snooze

---

# Preferences

GET   /api/v1/notification-preferences

PATCH /api/v1/notification-preferences

---

# Templates

GET    /api/v1/notification-templates

POST   /api/v1/notification-templates

PATCH  /api/v1/notification-templates/{id}

DELETE /api/v1/notification-templates/{id}

POST /api/v1/notification-templates/{id}/preview

POST /api/v1/notification-templates/{id}/test

---

# Broadcasts

GET    /api/v1/broadcasts

POST   /api/v1/broadcasts

PATCH  /api/v1/broadcasts/{id}

POST   /api/v1/broadcasts/{id}/publish

POST   /api/v1/broadcasts/{id}/cancel

---

# Analytics

GET /api/v1/notification-analytics

GET /api/v1/notification-analytics/channels

GET /api/v1/notification-analytics/providers

GET /api/v1/notification-analytics/templates

---

# Queue

GET /api/v1/notification-queue

GET /api/v1/notification-queue/failed

POST /api/v1/notification-queue/{id}/retry

---

# Webhooks

POST /api/v1/webhooks/providers/{provider}

Requirements:

- Signature Verification
- Timestamp Validation
- Replay Protection
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
    "code": "NOTIFICATION_NOT_FOUND",
    "message": "Notification not found.",
    "requestId": "req_xxx"
  }
}

---

# Standard Error Codes

- NOTIFICATION_NOT_FOUND
- TEMPLATE_NOT_FOUND
- BROADCAST_NOT_FOUND
- INVALID_CHANNEL
- DELIVERY_FAILED
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
- Production ready
