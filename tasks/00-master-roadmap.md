# MASTER ROADMAP & PRD - Vaivamm Capital CRM

## Project Overview

**Product**: Vaivamm Capital CRM - Full-featured Investment Platform + Internal Operating System
**Stack**: Next.js 16 (App Router), React 19, TypeScript 5 (strict), Tailwind CSS 4, tRPC 11, Drizzle ORM, NextAuth v5, PostgreSQL (Neon), React Query v5, Framer Motion

---

## Current State Assessment

### What Exists (Done)
- [x] Authentication (NextAuth v5 with credentials, JWT strategy, account locking)
- [x] RBAC middleware with role-based route protection (10 roles)
- [x] CRM module (Leads, Deals, Contacts, Organizations, Analytics, Reports, Settings)
- [x] HR module (Employees, Attendance, Leaves, Payroll, Expenses, Performance, Documents, Devices, Onboarding, Org Chart, Incentives, Work Logs)
- [x] Project Management (Kanban, Gantt, Calendar, Sprints, Epics, Cycles, Modules, Pages, Intake, Views, Analytics)
- [x] Chat module (real-time messaging, presence, channels, DMs)
- [x] Dashboard with role-based stats (CEO, HR, SALES, SUPPORT, ENGINEERING, DESIGN, VIDEO_EDITOR, DIGITAL_MARKETING)
- [x] Notification system (in-app bell + email notifications)
- [x] 8 Cron jobs (auto-checkout, daily notifications, weekly reports, monthly reports, holiday notifications, leave reset, scheduled reports)
- [x] File storage (Cloudflare R2 via S3 SDK with magic byte validation)
- [x] Email system (SendGrid + SMTP fallback with HTML templates)
- [x] QR code generation and tracking
- [x] Billing/Invoice pages
- [x] Support/Ticketing system
- [x] Timesheets module (personal + team views)
- [x] AI assistant (Google Gemini via Vercel AI SDK + LangChain)
- [x] Command palette (global search, Cmd+K)
- [x] 104 loading.tsx + 104 error.tsx files
- [x] Drag-and-drop Kanban boards (@hello-pangea/dnd)
- [x] Audit logging with IP tracking
- [x] Rate limiting (in-memory)
- [x] CSV import + XLSX export
- [x] Framer Motion animations throughout
- [x] Responsive sidebar with role-based navigation
- [x] Sales module with person-specific dashboards
- [x] Digital Marketing module (Campaigns, Social, Leads)
- [x] CEO dashboard with QR codes
- [x] Onboarding flow
- [x] Security headers (HSTS, CSP, X-Frame-Options)
- [x] CI/CD (GitHub Actions: ci.yml, merge-protection.yml, pr-check.yml)

### Architecture Issues Found
- [ ] Dashboard layout is `"use client"` (forces all children to be client components)
- [ ] In-memory rate limiting (lost on restart, won't scale)
- [ ] No Redis caching layer
- [ ] No background job queue (cron jobs are HTTP-triggered, no retry/queue)
- [ ] Offset-based pagination (degrades on large datasets)
- [ ] Large monolithic components (Leads page ~67KB)
- [ ] 14 eslint-disable/@ts-ignore suppression comments
- [ ] No soft-delete on business-critical tables (leads, deals, payrolls, tickets)
- [ ] Missing audit columns (created_by, updated_by) on many tables
- [ ] Duplicate/legacy CRM tables (~12 tables from demo/seed data)
- [ ] rolePermissions.role is TEXT not FK to roles table
- [ ] Cron idempotency uses in-memory Map (lost on restart)
- [ ] No MFA/2FA support
- [ ] No desktop push notifications
- [ ] Chat missing: thread support, reactions, message search
- [ ] No webhook system for integrations
- [ ] Zustand installed but unused (dead dependency)
- [ ] Permission checks at route level only, not at procedure/query level
- [ ] No branch/entity isolation (Branch A can see Branch B data)
- [ ] No full-text search indexes
- [ ] No notification user preferences
- [ ] `env.example` duplicate of `.env.example`

---

## Execution Order (Critical Path)

```
Phase 1: Foundation (Must Do First)
  Task 06: Infrastructure (Redis, Inngest)         ←── unblocks everything
  Task 02: Database Schema Cleanup                  ←── unblocks API + features
  Task 01: Architecture Fixes                       ←── unblocks UI + performance

Phase 2: Core Systems
  Task 04: RBAC Upgrade                             ←── unblocks multi-tenant
  Task 03: API Optimizations                        ←── unblocks performance
  Task 05: Notification System                      ←── unblocks push/email

Phase 3: User Experience
  Task 07: UI/UX Overhaul                           ←── visual upgrade
  Task 11: Code Quality                             ←── cleanup
  Task 08: Calendar Module                          ←── new feature

Phase 4: Advanced Features
  Task 10: Email System                             ←── appraisal/CRM emails
  Task 09: AI Integration                           ←── smart features
  Task 12: Missing Features                         ←── investment platform

Phase 5: Production Readiness
  Task 13: Testing Strategy                         ←── test coverage
  Task 14: Security Hardening                       ←── MFA, CSRF, audit
  Task 15: DevOps & Monitoring                      ←── APM, logging
  Task 16: Marketing Module                         ←── campaigns
  Task 17: Billing & Invoicing                      ←── payments
  Task 18: Multi-Tenant & Entity Management         ←── fund/branch isolation
```

### Dependency Graph

```
06 (Infrastructure) ──┬──> 03 (API)
                      ├──> 05 (Notifications)
                      ├──> 04 (RBAC)
                      └──> 01 (Architecture - Redis parts)
02 (Database) ────────┬──> 03 (API)
                      ├──> 08 (Calendar)
                      ├──> 05 (Notifications - new tables)
                      └──> 12 (Features)
01 (Architecture) ────┬──> 07 (UI/UX)
                      └──> 11 (Code Quality)
04 (RBAC) ────────────> 18 (Multi-Tenant)
05 (Notifications) ──> 09 (AI - smart notifications)
07 (UI/UX) ───────────> 16 (Marketing)
03 (API) ─────────────> 17 (Billing)
```

---

## Global Rules (Apply to ALL Tasks)

### Code Rules
1. No `any` type - use `unknown` + type guards or proper generics
2. No `@ts-ignore` or `@ts-expect-error` - fix the underlying type issue
3. No `eslint-disable` - fix the lint error properly
4. No anonymous inline handlers - extract named handler functions
5. No comments in production code - code should be self-documenting
6. No dead code - remove unused imports, variables, functions, files
7. No hardcoded values - use constants, env vars, or config
8. Strict TypeScript everywhere - no type coercion

### Architecture Rules
1. Server Components by default - `"use client"` only for interactivity
2. Server Actions for mutations - never client-side fetch for writes
3. tRPC for queries - type-safe data fetching with React Query
4. Zod for ALL validation - forms, API inputs, env vars
5. Feature-based organization - group by domain, not by type
6. Single responsibility - each file/function does one thing well
7. DRY but not premature - extract after 3+ repetitions

### Database Rules
1. Every mutable table MUST have: `created_at`, `updated_at`, `created_by`, `updated_by`
2. Business-critical tables MUST have: `deleted_at`, `deleted_by` (soft delete)
3. Every table MUST have: `org_id` (tenant isolation)
4. Index strategy: PKs, FKs, frequently filtered columns, composite indexes
5. No raw SQL - use Drizzle query builder
6. Never modify existing migration files - create new ones

### API Rules
1. Typed responses - every endpoint returns a typed shape
2. Error handling - consistent error shape with code + message + details
3. Pagination - cursor-based for lists, with total count
4. Rate limiting - per-user, per-endpoint via Redis
5. Auth check - every procedure verifies session + role + entity scope
6. Input validation - Zod schema for every input

### UI Rules
1. Loading state - skeleton or spinner for every async operation
2. Error state - retry button + error message for every query
3. Empty state - illustration + action button for every list
4. Toast notifications - success/error for every mutation via Sonner
5. Accessibility - ARIA labels, keyboard nav, focus management
6. Responsive - mobile-first, test at 320px, 768px, 1024px, 1440px

---

## Files to Delete

| File | Reason | Status |
|------|--------|--------|
| `env.example` | Duplicate of `.env.example` | Pending |
| Legacy CRM tables in schema | Demo data tables, not used by real pipeline | Pending (verify first) |
| `zustand` in package.json | Installed but never used anywhere | Pending |

---

## Task File Standard Format

Every task file follows this structure:
```
# Task XX: Title
## Priority | Effort | Dependencies | Status

## PRD
### Problem Statement
### Goals
### Non-Goals
### Success Criteria

## Rules to Follow
## Implementation Steps
## Files to Create/Modify
## Checklist
## Acceptance Criteria
## Testing Plan
```

---

## Task Index

| # | Task | Priority | Effort | Dependencies | Status |
|---|------|----------|--------|--------------|--------|
| 00 | Master Roadmap (this file) | - | - | - | Done |
| 01 | Architecture Fixes | CRITICAL | 3-5 days | Task 06 | Not Started |
| 01b | tRPC Removal (evaluate) | CRITICAL | 8-10 days | Task 06 | Evaluate First |
| 02 | Database Schema Cleanup | CRITICAL | 3-4 days | None | Not Started |
| 03 | API Optimizations | HIGH | 4-5 days | Tasks 02, 06 | Not Started |
| 04 | RBAC Upgrade | HIGH | 3-4 days | Task 06 | Not Started |
| 05 | Notification System | HIGH | 5-6 days | Tasks 02, 06 | Not Started |
| 06 | Infrastructure (Redis, Inngest) | CRITICAL | 2-3 days | None | Not Started |
| 07 | UI/UX Overhaul | HIGH | 6-8 days | Task 01 | Not Started |
| 08 | Calendar Module | MEDIUM | 3-4 days | Task 02 | Not Started |
| 09 | AI Integration | MEDIUM | 4-5 days | Task 05 | Not Started |
| 10 | Email System | MEDIUM | 3-4 days | None | Not Started |
| 11 | Code Quality | MEDIUM | 2-3 days | Task 01 | Not Started |
| 12 | Missing Features | FUTURE | 10+ days | Tasks 02, 04 | Not Started |
| 13 | Testing Strategy | HIGH | 4-5 days | None | Not Started |
| 14 | Security Hardening | HIGH | 3-4 days | Task 04 | Not Started |
| 15 | DevOps & Monitoring | MEDIUM | 2-3 days | None | Not Started |
| 16 | Marketing Module | MEDIUM | 4-5 days | Task 07 | Not Started |
| 17 | Billing & Invoicing | MEDIUM | 4-5 days | Task 03 | Not Started |
| 18 | Multi-Tenant & Entity Mgmt | HIGH | 5-6 days | Task 04 | Not Started |
