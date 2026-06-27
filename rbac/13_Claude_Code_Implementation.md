# StreamlineOS RBAC Product Bible

# 13 -- Claude Code Implementation Guide

## Purpose

This document defines the execution plan for rebuilding the RBAC
platform inside the existing StreamlineOS codebase. Claude Code must
follow these instructions without introducing parallel architectures or
unnecessary abstractions.

------------------------------------------------------------------------

# Guiding Principles

-   Reuse existing architecture whenever possible.
-   Analyze the repository before changing code.
-   Remove dead code and duplicate implementations.
-   Keep route handlers thin.
-   Centralize permission evaluation.
-   Preserve backward compatibility where feasible.

------------------------------------------------------------------------

# Implementation Order

1.  Audit existing RBAC implementation.
2.  Refactor database schema.
3.  Generate migrations.
4.  Build permission engine.
5.  Implement services.
6.  Protect APIs.
7.  Build UI.
8.  Integrate subscriptions.
9.  Integrate feature flags.
10. Add audit logging.
11. Add tests.
12. Run lint, type-check and production build.

------------------------------------------------------------------------

# Folder Structure

``` text
app/
  settings/
    roles/
    permissions/

components/
  rbac/

hooks/
  rbac/

lib/
  api/
  services/
  permissions/
  repositories/

types/
  rbac/
```

------------------------------------------------------------------------

# Files to Create

-   role.service.ts
-   permission.service.ts
-   assignment.service.ts
-   simulator.service.ts
-   permission-engine.ts
-   require-permission.ts
-   useRoles.ts
-   usePermissions.ts

------------------------------------------------------------------------

# Files to Refactor

-   Existing role APIs
-   Existing permission APIs
-   Sidebar generation
-   Middleware
-   User assignment logic
-   Audit integration

------------------------------------------------------------------------

# Files to Remove

-   Duplicate permission helpers
-   Hardcoded role checks
-   Unused RBAC components
-   Deprecated schemas
-   Obsolete migrations (after migration path)

------------------------------------------------------------------------

# Database Tasks

-   Normalize schema
-   Add indexes
-   Add audit tables
-   Add feature flag support
-   Add subscription references
-   Create forward-only migrations

------------------------------------------------------------------------

# Backend Tasks

-   Zod validation
-   Service layer
-   Repository layer
-   Transactions
-   Cache invalidation
-   Structured logging

------------------------------------------------------------------------

# Frontend Tasks

-   Dynamic sidebar
-   Roles management UI
-   Permission matrix
-   User assignment
-   Simulator
-   Audit dashboard

------------------------------------------------------------------------

# Security Checklist

-   Server-side authorization
-   Input validation
-   Rate limiting
-   Secure cookies
-   Parameterized queries
-   File validation

------------------------------------------------------------------------

# Testing Checklist

-   Unit tests
-   Integration tests
-   E2E tests
-   Accessibility tests
-   Performance verification
-   Security regression tests

------------------------------------------------------------------------

# Definition of Done

-   All APIs protected
-   Dynamic navigation
-   Zero hardcoded role checks
-   Full audit logging
-   Passing CI
-   No lint errors
-   No type errors
-   Production build succeeds

------------------------------------------------------------------------

# Claude Code Prompt

1.  Inspect existing repository structure.
2.  Reuse components before creating new ones.
3.  Implement only within existing architecture.
4.  Delete obsolete code.
5.  Update migrations safely.
6.  Run lint, typecheck and build.
7.  Produce implementation summary listing modified files.

End of RBAC Product Bible (Version 1).
