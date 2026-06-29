# StreamlineOS RBAC Product Bible

# 05 -- Backend APIs

## Purpose

Define the API layer, service boundaries, validation rules and
implementation contracts for the RBAC platform.

------------------------------------------------------------------------

# API Principles

-   Thin route handlers
-   Business logic in services
-   Zod validation for every request
-   Consistent error responses
-   Server-side authorization on every endpoint
-   Idempotent mutations where applicable
-   Pagination on list endpoints

------------------------------------------------------------------------

# Architecture

Route Handler ↓ Authentication ↓ requirePermission() ↓ Zod Validation ↓
Service Layer ↓ Repository / Drizzle ORM ↓ Database ↓ Audit Log ↓ Cache
Invalidation ↓ Response

------------------------------------------------------------------------

# REST Endpoints

## Roles

GET /api/roles

Supports: - pagination - search - filters - sorting

POST /api/roles

Body: - name - description - scope - permissions

PATCH /api/roles/{roleId}

DELETE /api/roles/{roleId}

POST /api/roles/{roleId}/clone

POST /api/roles/{roleId}/archive

------------------------------------------------------------------------

## Permissions

GET /api/permissions

Grouped by module and resource.

POST /api/permissions/check

Returns: - allowed - reason - effectiveScope

------------------------------------------------------------------------

## User Assignments

POST /api/users/{userId}/roles

DELETE /api/users/{userId}/roles/{roleId}

POST /api/users/{userId}/permissions

DELETE /api/users/{userId}/permissions/{permissionId}

------------------------------------------------------------------------

## Temporary Access

POST /api/temporary-access

PATCH /api/temporary-access/{id}

DELETE /api/temporary-access/{id}

------------------------------------------------------------------------

## Permission Simulator

POST /api/permissions/simulate

Input: - userId - resource - action

Output: - decision - matchingRole - scope - denialReason

------------------------------------------------------------------------

# Validation

Every endpoint validates:

-   Path params
-   Query params
-   Body
-   Organization context
-   Session
-   Permissions

Reject invalid payloads with structured errors.

------------------------------------------------------------------------

# Error Format

{ "success": false, "error": { "code": "PERMISSION_DENIED", "message":
"...", "correlationId": "..." } }

------------------------------------------------------------------------

# Service Layer

lib/services/rbac/

-   role.service.ts
-   permission.service.ts
-   assignment.service.ts
-   simulator.service.ts
-   audit.service.ts

No business logic inside route handlers.

------------------------------------------------------------------------

# Repository Layer

Responsibilities:

-   Drizzle queries
-   Transactions
-   Optimized joins
-   Pagination
-   Index-aware queries

------------------------------------------------------------------------

# Cache

Invalidate:

-   Roles
-   Permissions
-   Assignments
-   Feature Flags
-   Subscription

Never cache cross-user permission results.

------------------------------------------------------------------------

# Audit

Every mutation logs:

-   Actor
-   Before
-   After
-   Timestamp
-   IP
-   User Agent

------------------------------------------------------------------------

# Performance

-   Batch database reads
-   Avoid N+1
-   Select required columns only
-   Cursor pagination where appropriate

------------------------------------------------------------------------

# Acceptance Criteria

-   Thin handlers
-   Fully validated
-   Fully authorized
-   Audited
-   Cached correctly
-   REST consistency
-   Drizzle compatible
