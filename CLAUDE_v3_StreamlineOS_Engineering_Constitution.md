# CLAUDE.md --- StreamlineOS Engineering Constitution v3

> Single source of truth for AI-assisted development.

## 1. Mission

Build an enterprise-grade, multi-tenant SaaS platform that is scalable,
secure, maintainable, performant, reusable, and production-ready.

## 2. Core Principles

-   Never hallucinate.
-   Inspect before changing.
-   Reuse before creating.
-   Simplicity over cleverness.
-   Normalize data.
-   Reduce technical debt.
-   Follow SOLID, DRY, KISS, YAGNI.

## 3. Mandatory Discovery

Before coding identify: - Module - Business problem - Entities -
Existing schema - Existing APIs - Existing cache - Existing RBAC -
Existing components - Existing services - Existing hooks - Simpler
alternative

## 4. Module Audit

Audit: - Architecture - Database - API - Cache - Backend - Frontend -
UI - UX - Security - Performance - Product completeness Then implement
and validate.

## 5. Database

-   Normalize lifecycle entities.
-   No JSON arrays for invitations, members, approvals, comments,
    notifications, audit logs, tasks, events, etc.
-   Use PKs, FKs, indexes, timestamps.
-   Transactions for multi-step writes.
-   Eliminate N+1 queries.

## 6. APIs

-   RESTful
-   Validation
-   Pagination
-   Filtering
-   Sorting
-   Search
-   RBAC
-   Idempotency
-   Consistent errors

## 7. Cache

Backend: - Redis - Explicit invalidation Frontend: - TanStack Query -
staleTime - Optimistic updates - Prefix invalidation

## 8. Frontend

-   Server Components first
-   TanStack Query
-   RHF + Zod
-   Feature-first folders
-   No API calls from useEffect

## 9. Backend

-   Thin controllers
-   Services own business logic
-   Transactions
-   Efficient SQL
-   Structured logging

## 10. Security

-   OWASP API Top 10
-   Authentication
-   Authorization
-   BOLA protection
-   Input validation
-   Rate limiting

## 11. UX

Every module should support where applicable: Create, Read, Update,
Delete, Archive, Restore, Search, Filters, Sorting, Pagination, Bulk
Actions, Import, Export, Loading, Empty, Error, Responsive,
Accessibility.

## 12. Product Completeness

Review every module as a product: - Missing workflows - Missing
permissions - Missing reports - Missing automations - Missing audit
logs - Missing notifications

## 13. Performance

Review: - Bundle size - Lazy loading - Dynamic imports - Query
optimization - Cache efficiency - Duplicate requests

## 14. Refactoring

Remove: - Dead code - Duplicate code - Unused schemas - Unused APIs -
Unused hooks - Unused components

## 15. Definition of Done

Build passes. Lint passes. Types pass. CRUD complete. RBAC complete.
Caching correct. Responsive. Accessible. Secure.

## 16. Output

Always provide: - Findings - Root cause - Recommended solution - Files
changed - Validation

## 17. Final Rule

Think like a CTO, Principal Engineer, Product Manager, Security Engineer
and Database Architect. Improve architecture, not just code.
