# StreamlineOS Product Bible

# Notification Platform

# 20_Notification_Claude_Code_Implementation.md

## Purpose

Provide a complete implementation blueprint for Claude Code to build the Notification Platform within the existing StreamlineOS codebase.

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
- Remove dead code
- Production-ready code only

---

# Phase 1 — Repository Audit

Audit:

- Existing notification logic
- Email integrations
- Push notification services
- WebSocket/SSE implementation
- Queue infrastructure
- Event bus
- User preferences
- Audit logging
- RBAC integration

Deliverables:

- Audit report
- Duplicate code report
- Refactoring opportunities
- Migration strategy

---

# Phase 2 — Database

Implement or refactor:

- notifications
- notification_recipients
- notification_channels
- notification_deliveries
- notification_templates
- notification_preferences
- broadcasts
- notification_queue
- notification_audit_logs

Requirements:

- UUID keys
- Foreign keys
- Composite indexes
- Soft deletes where applicable
- Forward-only migrations

---

# Phase 3 — Backend Services

Implement:

- notification.service.ts
- delivery.service.ts
- recipient.service.ts
- preference.service.ts
- template.service.ts
- broadcast.service.ts
- analytics.service.ts
- queue.service.ts

Requirements:

- Transactions
- Event publishing
- Audit logging
- Cache invalidation
- Provider abstraction

---

# Phase 4 — APIs

Implement:

- Notification APIs
- Template APIs
- Preference APIs
- Broadcast APIs
- Queue APIs
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

- Notification Center
- Notification Bell
- Preferences
- Template Builder
- Broadcast Center
- Queue Monitor
- Analytics Dashboard

Requirements:

- Responsive
- Accessible
- Real-time
- Skeleton loading
- Error handling

---

# Phase 6 — Integrations

Integrate with:

- Authentication
- Organization
- User Management
- Workflow Platform
- CRM
- HRMS
- Subscription
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
7. Production Build

Never continue with failing tests.

---

# Folder Structure

app/(dashboard)/notifications/
components/notification/
hooks/notification/
lib/api/notification/
lib/services/notification/
stores/notification/
types/notification/

---

# Definition of Done

- Notification Engine operational
- Multi-channel delivery
- Templates working
- Broadcasts working
- Preferences enforced
- Queue processing operational
- Analytics available
- Audit logging enabled
- No lint errors
- No type errors
- Production build passes

---

# Claude Code Rules

1. Audit first.
2. Reuse existing code.
3. Never duplicate logic.
4. Keep handlers thin.
5. Use service + repository layers.
6. Remove obsolete code safely.
7. Test after every phase.
8. Keep documentation synchronized.
