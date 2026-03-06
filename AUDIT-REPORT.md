# Vaivamm Capital CRM — Comprehensive Production Audit Report

**Date:** 2026-03-06
**Branch:** `phasee` (Phase 1 live on `main`)
**Auditor:** Claude Opus 4.6 — Senior Full-Stack Architect / Security Engineer / QA Lead

---

## Phase 1 — Project Structure & Architecture Analysis

**Summary:** The project follows Next.js App Router conventions well with proper route grouping, co-located components, and a clear separation between auth/dashboard layouts. However, several monolithic files exceed maintainability thresholds, and there are unused dependencies bloating the bundle.

**Issues Found:**

| # | File / Location | Issue Description | Severity | Recommendation |
|---|---|---|---|---|
| 1.1 | `server/api/routers/hr.ts` (1787 lines) | Monolithic router handling employees, attendance, payroll, documents, helpdesk — 5+ domains in one file | Medium | Split into `hr-employee.ts`, `hr-payroll.ts`, `hr-attendance.ts`, `hr-documents.ts`, `hr-helpdesk.ts` |
| 1.2 | `server/api/routers/project.ts` (1710 lines) | Single router for projects, tickets, sprints, epics, labels, comments, time-tracking | Medium | Split into `project-core.ts`, `project-tickets.ts`, `project-sprints.ts` |
| 1.3 | `lib/hooks/trpc-hooks.ts` (2035 lines) | Largest file in codebase — all tRPC hooks in one barrel | Medium | Split by domain (e.g., `hooks/hr-hooks.ts`, `hooks/project-hooks.ts`) |
| 1.4 | `lib/email-templates.ts` (1361 lines) | All HTML email templates as template literals in one file | Low | Extract to individual template files or use a templating engine |
| 1.5 | `app/(dashboard)/hr/leaves/leaves-wfh-content.tsx` (1410 lines) | Massive UI component combining leaves + WFH logic | Medium | Split into `LeavesContent` and `WfhContent` components |
| 1.6 | `package.json:57` | `"i": "^0.3.7"` — accidental dependency (npm typo package) | Low | Remove — never imported anywhere |
| 1.7 | `package.json:60` | `"moment": "^2.30.1"` — unused, never imported | Low | Remove — `date-fns` is already used throughout |
| 1.8 | `app/(auth)/reset-password/page.tsx` + `app/auth/reset-password/page.tsx` | Duplicate reset-password pages in two different route groups | Medium | Consolidate into one — `app/auth/reset-password` is the one used by middleware |
| 1.9 | `.DS_Store` files | Multiple `.DS_Store` files tracked (app/, lib/, components/, server/, public/) | Low | Add `**/.DS_Store` to `.gitignore`, remove from tracking |
| 1.10 | Missing error/loading boundaries | `app/(dashboard)/hr/employees/page.tsx`, `app/(dashboard)/hr/employees/[id]/page.tsx`, `app/(dashboard)/hr/employees/new/page.tsx`, `app/(dashboard)/ceo/qr-code/` — no `error.tsx` | Medium | Add `error.tsx` for all route segments with data fetching |

**What's Done Right:**
- Proper use of Next.js route groups `(auth)` and `(dashboard)` for layout isolation
- Loading skeletons present for most dashboard routes
- Co-located components in route folders (e.g., `projects/project-card.tsx`)
- Clean separation: `server/actions/` for server actions, `server/api/routers/` for tRPC
- Shared `lib/` utilities with proper exports

**Quick Wins:** Remove `moment`, `i` packages; delete `.DS_Store` files
**Requires Refactor:** Split monolithic routers and hooks file

---

## Phase 2 — tRPC Deep Audit

**Summary:** tRPC setup is solid with proper superjson transformer, Zod error formatting, and a three-tier procedure system (public/session/protected). However, there are critical org-context issues, `as any` casts, and missing pagination on several list queries.

**Issues Found:**

| # | File / Location | Issue Description | Severity | Recommendation |
|---|---|---|---|---|
| 2.1 | `server/api/trpc.ts:51-56` | `enforceUserIsAuthed` picks first org membership with `limit: 1` — user in multiple orgs always operates on whichever DB returns first (non-deterministic without ORDER BY) | Critical | Add `ORDER BY` or use session-stored org selection; support multi-org context switching |
| 2.2 | `server/api/routers/auth.ts:69-73` | `signUp` reveals account existence: "User with this email already exists" — account enumeration | High | Return generic success message regardless; send email to existing users saying "you already have an account" |
| 2.3 | `server/api/routers/auth.ts:269` | `resendVerificationEmail` reveals user existence via NOT_FOUND error | High | Return generic success regardless |
| 2.4 | `lib/rbac/middleware.ts:7,8,33,67,89,90` | Multiple `any` types: `db: any`, `next: () => Promise<any>`, `role as any` | Medium | Use proper Drizzle DB type and typed middleware context |
| 2.5 | `server/api/routers/hr.ts:1104` | `eq(documents.type, input.type as any)` — unsafe cast | Medium | Use `documentTypeEnum` values in Zod schema to ensure type compatibility |
| 2.6 | `server/api/routers/hr.ts:1250` | `eq(helpdeskTickets.status, input.status as any)` — unsafe cast | Medium | Use enum-constrained Zod input |
| 2.7 | `server/actions/expense-query.ts:151,154` | `filters.status as any` in two places | Medium | Type the status filter properly against `expenseStatusEnum` |
| 2.8 | `server/actions/expense-query.ts:551` | `(byEmployee as any[]).map(...)` — untyped aggregation result | Medium | Define proper return type for the aggregation query |
| 2.9 | `server/api/routers/rbac.ts:39` | `eq(rolePermissions.role, role as any)` | Medium | Cast role through the `roleEnum` type |
| 2.10 | Multiple routers | Several list queries without pagination: `hr.getEmployees` (employees list), `hr.getAttendanceByDate`, `dashboard.getRecentActivity`, `crm.getCompanies`, `crm.getDeals` | High | Add pagination using existing `paginationInputSchema` from `lib/pagination.ts` |
| 2.11 | `server/api/routers/auth.ts` | All auth procedures are `publicProcedure` — correct for auth, but no rate limiting at tRPC level (middleware only covers HTTP layer) | Medium | Add rate limiting middleware for auth procedures at tRPC level as defense-in-depth |
| 2.12 | `server/api/routers/organization.ts:93` | `console.error()` used directly instead of `logger.error()` | Low | Use structured logger consistently |
| 2.13 | `server/api/routers/organization.ts:94-96` | Error swallowed — returns empty array on DB failure without distinguishing "no data" from "query failed" | Medium | At minimum log the error with structured logger; consider throwing to let error boundaries handle it |

| 2.14 | `server/api/routers/hr.ts` — multiple queries | **CRITICAL AUTHZ**: `getSalaryStructures`, `getEmployeeStats`, `getDocuments`, `getPerformanceReviews`, `getGoals`, `getHelpdeskTickets` accept optional `userId` parameter but perform NO permission check — any employee can query any coworker's sensitive data (salary, goals, documents) | Critical | Add role check: only ADMIN/OWNER can query other users' data; MEMBER can only query their own |
| 2.15 | `server/api/routers/hr.ts:1237` | `updateGoal` mutation missing `orgId` filter in WHERE clause — only checks `goal.id`, could update any goal in any org if ID guessed | Critical | Add `eq(goals.orgId, ctx.session.orgId)` to WHERE clause |
| 2.16 | `server/api/routers/reports.ts` | `getAttendanceReport`, `getPayrollReport`, `getProjectReport` accept optional `userId`/`projectId` with no authorization check — any employee can retrieve any colleague's attendance/payroll data | High | Add permission checks for cross-user report access |
| 2.17 | `server/api/routers/rbac.ts:138,170,181` | Throws generic `Error` instead of `TRPCError` — bypasses tRPC error formatting | Medium | Replace with `throw new TRPCError({ code: "..." })` |
| 2.18 | `app/api/trpc/[trpc]/route.ts` | `onError: undefined` — no custom error logging or sanitization in tRPC handler | Medium | Add `onError` handler with `logger.error()` |
| 2.19 | `server/api/routers/hr.ts` — `generatePayroll` | N+1 query: loops all org members and queries each one's salary structure individually | Medium | Batch-fetch salary structures in single query |

**What's Done Right:**
- Three-tier procedure system: `publicProcedure`, `sessionProcedure`, `protectedProcedure`
- All protected procedures enforce org membership via middleware
- Zod validation on all input schemas
- Proper use of `TRPCError` with specific codes (UNAUTHORIZED, FORBIDDEN, BAD_REQUEST, etc.)
- Zod error flattening in error formatter for client consumption
- Organization-scoped data access throughout HR/Project/Dashboard/Reports routers using `ctx.session.orgId`
- Proper authorization checks in org admin operations (inviteUser, updateMemberRole, removeMember)

**Quick Wins:** Replace `as any` casts with proper enum types; add `ORDER BY` to org membership query; fix `updateGoal` orgId filter
**Requires Refactor:** Implement row-level authorization for user-specific queries; add pagination to all list endpoints

---

## Phase 3 — Full Security Audit (OWASP Top 10 + Beyond)

**Summary:** The application has a strong security foundation: bcrypt password hashing, CSRF protection via middleware, comprehensive security headers including CSP, path traversal protection on uploads, and rate limiting on auth endpoints. However, there are critical dependency vulnerabilities, account enumeration vectors, and missing runtime env validation.

**Issues Found:**

| # | File / Location | Issue Description | Severity | Recommendation |
|---|---|---|---|---|
| 3.1 | `pnpm audit` | **1 CRITICAL** vulnerability: `fast-xml-parser` entity encoding bypass (via `@aws-sdk`) | Critical | Update `@aws-sdk/client-s3` to latest; check for `fast-xml-parser >= 5.3.5` |
| 3.2 | `pnpm audit` | **17 HIGH** vulnerabilities: `xlsx` (prototype pollution + ReDoS), `next` (DoS), `@trpc/server` (prototype pollution), `jspdf` (5 CVEs), `axios` (DoS via `@sendgrid`), `minimatch` (3 ReDoS), `fast-xml-parser` (2 more CVEs) | Critical | Update all: `next` to >=16.0.9, `@trpc/server` to >=11.8.0, replace `xlsx` with `exceljs`, update `jspdf` to >=4.2.0 |
| 3.3 | `pnpm audit` | **7 MODERATE**: `dompurify` XSS, `esbuild` request hijack, `ajv` ReDoS, `next` (3 more: DoS, memory consumption, source code exposure), `jspdf` (2 more) | High | Update all affected packages |
| 3.4 | `server/api/routers/auth.ts:69-73,268-273` | **A01 Broken Access Control** — Account enumeration via `signUp` ("User exists") and `resendVerificationEmail` ("User not found") | High | Return generic responses for all auth endpoints |
| 3.5 | `server/api/trpc.ts:51-56` | **A01 Broken Access Control** — Non-deterministic org selection in multi-org scenario; first membership returned could be wrong org | High | Implement explicit org selection stored in session/cookie |
| 3.6 | `app/api/test/weekly-report-email/route.ts:8`, `app/api/test/monthly-expense-report-email/route.ts:8` | **Hardcoded email**: `tarunchintakunta@gmail.com` — PII in source code; test routes accessible if `ALLOW_TEST_EMAIL=1` in production | High | Remove hardcoded email; use env var; ensure test routes are completely disabled in production builds |
| 3.7 | `.github/workflows/ci.yml:43-44` | CI references `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` — Clerk is not used (NextAuth is used). Dummy keys in CI config are confusing and could mask real build failures | Medium | Remove Clerk references; add actual required env vars (NEXTAUTH_SECRET, etc.) |
| 3.8 | No env validation | **A05 Security Misconfiguration** — No runtime env variable validation. Missing vars silently cause runtime errors | High | Implement `@t3-oss/env-nextjs` with Zod schemas for all required env vars |
| 3.9 | `env.example` | Missing keys used in code: `CRON_SECRET`, `WEBHOOK_SECRET`, `EMAIL_PROVIDER`, `NEXT_PUBLIC_APP_URL`, `EMAIL_FROM_NAME` | Medium | Update `env.example` to include ALL env vars used in codebase |
| 3.10 | `next.config.ts:51` | CSP allows `'unsafe-inline'` for both `script-src` and `style-src` — weakens XSS protection | Medium | Use nonce-based CSP for scripts; `'unsafe-inline'` for styles is acceptable with Tailwind |
| 3.11 | `middleware.ts:36` | Rate limiting uses in-memory `Map` — resets on every deployment, doesn't work across serverless instances | Medium | Use Redis or Vercel KV for distributed rate limiting, or use Vercel's built-in rate limiting |
| 3.12 | No audit logging | **A09 Logging Failures** — No audit trail for sensitive actions: login, role changes, member removal, data deletion, salary changes | High | Implement audit log table and log all sensitive mutations |
| 3.13 | `lib/logger.ts` | Logger is console-based only — no integration with external monitoring (Sentry, Datadog, etc.) | Medium | Add Sentry or similar APM for production error tracking |
| 3.14 | `server/api/routers/auth.ts` | Password reset tokens not invalidated on password change (only the specific token used is deleted, but others for same email persist) | Medium | Delete ALL reset tokens for the email after successful password reset |
| 3.15 | `lib/db/schema.ts:101-107` | `password_reset_tokens` — no index on `email` column; frequent lookups by email will be slow | Medium | Add index on `email` column |
| 3.16 | File upload | `app/api/storage/upload/route.ts` — well-implemented: auth check, file size limit (10MB), MIME type allowlist, magic byte validation, path traversal protection, filename sanitization | N/A | Good — file upload security is solid |
| 3.17 | `app/api/qr-code/download/route.ts` | **SSRF vulnerability**: fetches user-controlled URLs server-side with incomplete blocklist — missing IPv6 (`::1`), `127.0.0.0/8` range, DNS rebinding protection; no `Content-Length` limit on fetched images; filename injection in `Content-Disposition` header | Critical | Implement proper URL validation with allowlist of domains; add response size limit; use RFC 5987 for Content-Disposition |
| 3.18 | `server/api/routers/hr.ts` — `onboardEmployee` | Sends generated password in plain text via email — while `isPasswordChangeRequired` is set, password is visible in email transit/storage | Medium | Consider sending a one-time login link instead of a plaintext password |
| 3.19 | `lib/db/schema.ts:101-107` | `password_reset_tokens.token` stored as plaintext in DB — if database is compromised, attacker can use valid tokens | Medium | Hash tokens before storage; compare hashed values on lookup |

**What's Done Right:**
- bcrypt password hashing with salt rounds of 10
- Strong password policy enforced via Zod regex (uppercase, lowercase, digit, special char, min 8)
- Comprehensive security headers: X-Frame-Options DENY, HSTS with preload, CSP, CORP, COOP, X-Content-Type-Options
- CSRF protection via `allowedOrigins` in server actions config
- Safe redirect validation in middleware (prevents open redirects)
- Path traversal protection on file upload/download
- Rate limiting on auth endpoints (10 requests per minute)
- CRON_SECRET authentication on all cron endpoints
- `.env` properly gitignored (`.env*` pattern)
- No `dangerouslySetInnerHTML` usage anywhere
- Session token uses `__Secure-` prefix in production
- Inactive user detection and forced sign-out
- Force password change flow for invited users
- File upload validates magic bytes (not just MIME type headers)

**Quick Wins:** Fix account enumeration; update vulnerable dependencies; add missing env.example keys
**Requires Refactor:** Implement distributed rate limiting; add audit logging; add runtime env validation

---

## Phase 4 — Code Quality & Best Practices

**Summary:** TypeScript strict mode is enabled with good type safety overall. The codebase uses established patterns (type guards, safe color lookups, React.memo). However, there are 9 `as any` casts, unused dependencies, scattered `console.log` statements, and the dashboard layout is a client component when it could benefit from being a server component.

**Issues Found:**

| # | File / Location | Issue Description | Severity | Recommendation |
|---|---|---|---|---|
| 4.1 | 9 locations | `as any` casts (listed in Phase 2) — undermines TypeScript strict mode | Medium | Replace with proper typing |
| 4.2 | `app/(dashboard)/layout.tsx:1` | Dashboard layout is `"use client"` — forces entire dashboard tree into client rendering for just sidebar collapse state | Medium | Extract sidebar state to a client component; keep layout as server component for better SSR |
| 4.3 | `hooks/useAttendanceTimer.ts` | camelCase filename convention breaks from kebab-case used by all other hooks (`use-file-url.ts`, `use-mobile.ts`, `use-expense-filters.ts`) | Low | Rename to `use-attendance-timer.ts` |
| 4.4 | `package.json:57` | `"i": "^0.3.7"` — accidental `npm i` artifact | Low | Remove |
| 4.5 | `package.json:60` | `"moment": "^2.30.1"` — dead dependency | Low | Remove |
| 4.6 | `package.json:56` | `"html2canvas": "^1.4.1"` — large dependency; check if still needed | Low | Verify usage; remove if unused |
| 4.7 | Multiple script files | 40+ `console.log` calls in `scripts/` — acceptable for CLI scripts, but verify none leak to production bundle | Low | Scripts are dev-only, acceptable |
| 4.8 | `hooks/use-file-url.ts:36` | `console.error("Error getting signed URL:", error)` — leaks to production | Low | Use structured logger |
| 4.9 | `app/(dashboard)/projects/[id]/page.tsx:77,86` | `console.warn` for localStorage failures — minor but leaks to production | Low | Silent catch or use logger |
| 4.10 | `components/expenses/expense-export-dialog.tsx:386` | `console.error("Export error:", error)` — leaks to production | Low | Use structured logger |
| 4.11 | `app/(auth)/signin/page.tsx:18` | `export const dynamic = "force-dynamic"` — only page with this; may cause unnecessary SSR overhead | Low | Verify if needed; signin page could be static |
| 4.12 | No `generateMetadata` anywhere | Zero dynamic metadata generation — all pages use the single root `metadata` from `app/layout.tsx` | Medium | Add `generateMetadata` to key pages (especially project detail, employee detail) |

**What's Done Right:**
- `strict: true` in tsconfig.json
- Type guards (`isStepId`, `isTicketType`, etc.) used over unsafe casts
- `React.memo()` on dashboard card components
- Proper use of `useMemo` for stable handler identities
- Shared Zod schemas in `lib/validations/`
- Shared format utilities in `lib/format-utils.ts`
- Proper error boundaries (`error.tsx`) on most route segments
- Consistent use of kebab-case file naming (one exception)

**Quick Wins:** Remove unused deps; replace console.log with logger in non-script files
**Requires Refactor:** Refactor dashboard layout to server component; add `generateMetadata`

---

## Phase 5 — Database Layer Audit

**Summary:** The schema is comprehensive with proper foreign keys, enums, and typed JSONB columns. However, there are missing indexes on frequently-queried columns, missing unique constraints, no soft-delete on critical tables, and limited use of transactions for multi-step writes.

**Issues Found:**

| # | File / Location | Issue Description | Severity | Recommendation |
|---|---|---|---|---|
| 5.1 | `lib/db/schema.ts` — `attendance` table | No unique constraint on `(userId, date, orgId)` — allows duplicate attendance records for same user/day | High | Add unique constraint |
| 5.2 | `lib/db/schema.ts` — `organizationMembers` | No unique constraint on `(userId, orgId)` — allows duplicate memberships | High | Add unique constraint |
| 5.3 | `lib/db/schema.ts` — `leaveBalances` | No unique constraint on `(userId, leaveTypeId, year, orgId)` — duplicate balances possible | High | Add unique constraint |
| 5.4 | `lib/db/schema.ts` — `salaryStructures` | No unique constraint to prevent multiple active structures per user | Medium | Add check or unique partial index |
| 5.5 | `lib/db/schema.ts` — `projectMembers` | No unique constraint on `(projectId, userId)` — duplicate memberships | Medium | Add unique constraint |
| 5.6 | `lib/db/schema.ts` — All tables with `orgId` | No indexes on `orgId` columns — every org-scoped query requires full table scan | High | Add indexes on `orgId` for: attendance, leaveRequests, payrolls, expenses, tickets, projects, documents, etc. |
| 5.7 | `lib/db/schema.ts` — `attendance` | No index on `(userId, date)` — frequent lookup pattern | Medium | Add composite index |
| 5.8 | `lib/db/schema.ts` — `users` | No index on `isActive` — filtered queries scan all users | Low | Add index if user count is large |
| 5.9 | `lib/db/schema.ts` — `tickets` | No index on `projectId` or `sprintId` — ticket list queries per project/sprint are slow | Medium | Add indexes |
| 5.10 | `lib/db/schema.ts:124` | `password` field is nullable `text("password")` — OAuth users may have null, but no documentation of this design choice | Low | Document intention; consider separate auth strategy pattern |
| 5.11 | `lib/db/schema.ts` — `users` table | No `deletedAt` / soft-delete column — user deletion is hard delete, losing audit trail | Medium | Add `deletedAt` for soft delete; update queries to filter |
| 5.12 | `lib/db/schema.ts` — `expenses`, `leaveRequests` | No `deletedAt` — hard delete of financial records is risky for compliance | Medium | Implement soft delete for financial/HR records |
| 5.13 | `server/api/routers/auth.ts:86-106` | `signUp` mutation: user creation + verification token insert + email send — not in a transaction. If email fails, user exists but has no verification token | High | Wrap in `db.transaction()` |
| 5.14 | `server/api/routers/auth.ts:199-259` | `acceptInvitation`: user creation + org membership + invitation update — not in a transaction | High | Wrap in `db.transaction()` |
| 5.15 | `server/api/routers/organization.ts:115-125` | `createOrganization`: org creation + owner membership — not in a transaction | High | Wrap in `db.transaction()` |
| 5.16 | `server/api/routers/hr.ts:156-240` | `addEmployee`: user creation + org membership + email — check if this uses transaction | Medium | Verify and add transaction if missing |
| 5.17 | Multiple routers | Queries using `select()` without column selection — returns all columns including potentially sensitive data | Medium | Use explicit column selection for queries that go to client |
| 5.18 | `lib/db/schema.ts` — `projects.key` | `unique()` but no composite unique with `orgId` — project keys must be globally unique instead of per-org | Medium | Change to `unique(orgId, key)` composite |
| 5.19 | `server/actions/weekly-attendance-report.ts:25-91` | **N+1 query**: loops `activeMembers` and queries attendance for EACH member inside loop — 50 employees = 50 DB queries | High | Batch-fetch all attendance records in single query with `WHERE userId IN (...)` |
| 5.20 | `server/actions/monthly-expense-report.ts:24-91` | Same N+1 pattern — loops members, queries expenses per member | High | Batch-fetch with single query |
| 5.21 | `server/actions/leave-actions.ts:208-244` | `resetYearlyLeaveBalances`: nested loop (members × leave types) with DB query in inner loop — 50 members × 3 types = 150 queries | High | Batch insert all balances in single query |
| 5.22 | `server/actions/auto-checkout.ts:23-71` | Loop with individual `UPDATE` per attendance record — should batch update | Medium | Use single `UPDATE ... WHERE id IN (...)` |
| 5.23 | Multiple server actions | Unbounded `findMany()` with NO LIMIT: `getHolidays()`, `getEmployees()`, `getExpenses()`, `getMyExpenses()`, `getPendingExpenses()` | High | Add pagination or reasonable LIMIT to all list queries |
| 5.24 | `server/actions/expense-actions.ts:31-46` | Duplicate detection via `findFirst` then `insert` — race condition allows duplicates between check and insert | Medium | Use DB unique constraint or transaction with serializable isolation |
| 5.25 | `lib/db/schema.ts` — `expenses.amount` | Stored as `decimal` but frequently cast via `CAST(amount::numeric)` in expense-query.ts — unnecessary double conversion | Low | Ensure consistent decimal handling without raw SQL casts |
| 5.26 | `lib/db/schema.ts` — multiple tables | Missing `updatedBy` column — no record of who modified records (salary, leave approvals, etc.) | Medium | Add `updatedBy` for audit trail |
| 5.27 | `lib/db/schema.ts` — `users.metadata` | `jsonb("metadata")` with NO type definition — unlike `bankDetails` which has `$type<>()` | Low | Add type definition or remove if unused |

**What's Done Right:**
- Proper foreign key constraints on all relationships
- Typed JSONB columns using `$type<>()` for bankDetails, breaks, ratings, goals, settings
- pgEnum used for all status/type fields — enforces valid values at DB level
- Drizzle ORM prevents SQL injection by design (parameterized queries)
- Proper use of `serial` for auto-incrementing IDs
- `nanoid` for user/org IDs (unpredictable, no IDOR via sequential IDs)
- Transactions used in some critical operations (HR salary structure, ticket creation, sprint management)

**Quick Wins:** Add unique constraints; add missing indexes
**Requires Refactor:** Add transactions to auth flows; implement soft delete

---

## Phase 6 — Performance Audit

**Summary:** The app has reasonable defaults (5s staleTime on tRPC queries, pagination utility exists) but suffers from the dashboard layout being entirely client-rendered, heavy unused dependencies, and missing code splitting for large components.

**Issues Found:**

| # | File / Location | Issue Description | Severity | Recommendation |
|---|---|---|---|---|
| 6.1 | `app/(dashboard)/layout.tsx` | `"use client"` on root dashboard layout — every child page is forced into client rendering, losing SSR benefits | High | Refactor: extract sidebar collapse state to a client component, keep layout as server component |
| 6.2 | `package.json` | `moment` (320KB gzipped) in dependencies but never imported | Medium | Remove — saves significant bundle size |
| 6.3 | `package.json` | `xlsx` (1MB+) imported server-side for export — verify it's not in client bundle | Medium | Ensure xlsx is only imported in server actions/API routes; add to `serverExternalPackages` if needed |
| 6.4 | `package.json` | `html2canvas` (~250KB) — heavy; verify usage | Medium | Check if needed; consider lighter alternatives |
| 6.5 | `trpc/react.tsx:18` | `staleTime: 5 * 1000` (5 seconds) globally — aggressive for relatively static data like org settings, employee lists | Medium | Set per-query staleTime: 5s for dashboard, 30s+ for settings/lists |
| 6.6 | `components/illustrations/index.tsx` (762 lines) | Large SVG illustrations as React components — in client bundle | Low | Consider using `next/image` with SVG files or dynamic imports |
| 6.7 | 169 client components | Many UI primitive wrappers are `"use client"` — this is necessary for Radix UI but adds to client bundle | Low | This is expected with Radix UI; no action needed |
| 6.8 | No `Suspense` boundaries | Only 2 Suspense boundaries in entire app (both in auth pages) — no Suspense in dashboard | Medium | Add Suspense boundaries around data-fetching sections for streaming SSR |

**What's Done Right:**
- `next/font/google` with `display: "swap"` for non-blocking fonts
- Loading skeletons for most routes (loading.tsx files)
- Pagination utility exists and is used in several routers
- `React.memo()` on dashboard cards prevents unnecessary re-renders
- `staleTime` configured (prevents refetch storms)
- Security headers cached via `next.config.ts` (not computed per-request)

**Quick Wins:** Remove `moment`; set per-query staleTime
**Requires Refactor:** Refactor dashboard layout; add Suspense boundaries

---

## Phase 7 — Accessibility (a11y) Audit

**Summary:** Good foundational accessibility with a skip-to-content link, ARIA attributes on dashboard components, and Radix UI providing built-in a11y. However, coverage is inconsistent — many pages lack proper ARIA labels, and there's no evidence of WCAG compliance testing.

**Issues Found:**

| # | File / Location | Issue Description | Severity | Recommendation |
|---|---|---|---|---|
| 7.1 | `app/layout.tsx:27` | `<html lang="en">` present — good | N/A | Correct |
| 7.2 | `app/(dashboard)/layout.tsx:22-27` | Skip-to-content link present — good | N/A | Correct |
| 7.3 | ARIA attribute usage | Only ~65 ARIA attributes across 20 files (out of 169 client components) — low coverage | Medium | Add `aria-label` to all interactive elements, especially icon-only buttons |
| 7.4 | Auth pages | No `aria-describedby` linking error messages to form fields | Medium | Add `aria-describedby` for validation errors |
| 7.5 | Brand colors | Gold `#bd882c` on white background — contrast ratio ~3.5:1, fails WCAG AA (4.5:1 required for normal text) | High | Darken gold to ~`#8a6420` for text usage, or use only on large text/decorative elements |
| 7.6 | `app/page.tsx` (landing page) | No heading hierarchy audit performed — verify h1 > h2 > h3 structure | Medium | Audit and fix heading levels |
| 7.7 | Missing `alt` text audit | Could not verify all images have `alt` — `next/image` requires it, but custom `<img>` tags may not | Medium | Audit all image elements |
| 7.8 | No focus management | Custom modals/dialogs use Radix (which handles focus trapping), but page transitions don't manage focus | Low | Add focus management on route changes for SPA navigation |

**What's Done Right:**
- Skip-to-content link in dashboard layout
- SR announcements via `role="status" aria-live="polite" aria-atomic="true"` (per MEMORY.md)
- `aria-valuetext` on progress bars
- `<caption className="sr-only">` on data tables
- Radix UI components provide built-in keyboard navigation and focus management
- `<html lang="en">` set

**Quick Wins:** Fix gold color contrast; add `aria-describedby` to form fields
**Requires Refactor:** Comprehensive ARIA audit across all 169 client components

---

## Phase 8 — SEO Audit

**Summary:** SEO is minimal. The app is primarily a SaaS dashboard (most pages behind auth), so SEO matters mainly for the landing page, auth pages, and any public-facing content. Currently, there's no robots.txt, sitemap, favicon, or structured data.

**Issues Found:**

| # | File / Location | Issue Description | Severity | Recommendation |
|---|---|---|---|---|
| 8.1 | `public/` | No `favicon.ico` — browser shows default icon | Medium | Add branded favicon |
| 8.2 | `public/` | No `robots.txt` — search engines have no crawling guidance | Medium | Add `robots.txt` disallowing `/dashboard`, `/api`, `/settings` etc. |
| 8.3 | `public/` | No `sitemap.xml` | Low | Add basic sitemap for public pages |
| 8.4 | `app/layout.tsx:18-21` | Only root metadata set — generic "Vaivamm CRM" title on all pages | Medium | Add `generateMetadata` to landing page, auth pages at minimum |
| 8.5 | No OG/Twitter meta tags | Missing social sharing metadata | Low | Add OG image, description, Twitter card metadata |
| 8.6 | No canonical URLs | Potential duplicate content issues | Low | Add canonical link tags |
| 8.7 | No structured data | No JSON-LD for organization/software application | Low | Add to landing page |

**What's Done Right:**
- Landing page exists at root (`app/page.tsx`)
- `display: "swap"` on fonts prevents render blocking

**Quick Wins:** Add favicon, robots.txt; add metadata to key pages

---

## Phase 9 — Environment & Configuration Audit

**Summary:** Environment management has significant gaps. No runtime validation, stale CI config with wrong provider references, and missing env.example keys create deployment risks.

**Issues Found:**

| # | File / Location | Issue Description | Severity | Recommendation |
|---|---|---|---|---|
| 9.1 | No env validation | No `@t3-oss/env-nextjs` or equivalent — missing env vars cause runtime crashes, not build-time errors | High | Implement runtime env validation with Zod |
| 9.2 | `env.example` | Missing keys: `CRON_SECRET`, `WEBHOOK_SECRET`, `EMAIL_PROVIDER`, `NEXT_PUBLIC_APP_URL`, `EMAIL_FROM_NAME`, `ALLOW_TEST_EMAIL` | Medium | Update env.example with all required vars |
| 9.3 | `.github/workflows/ci.yml:43-44` | References Clerk keys (`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`) — project uses NextAuth, not Clerk | Medium | Remove Clerk references; add correct env vars |
| 9.4 | `.github/workflows/ci.yml:45` | `GOOGLE_GENERATIVE_AI_API_KEY` with dummy value — may cause build to succeed but AI features to silently fail | Low | Acceptable for CI build; document this |
| 9.5 | No health check endpoint | No `/api/health` endpoint for monitoring | Medium | Add health check that verifies DB connectivity |
| 9.6 | No error monitoring | No Sentry, Datadog, or equivalent integration | High | Add Sentry for production error tracking |
| 9.7 | `vercel.json` | Cron jobs configured but `monthly-leave-reset` not in vercel.json (only in API routes) | Medium | Add to vercel.json or document if manually triggered |

**What's Done Right:**
- `.env` properly gitignored
- `CRON_SECRET` used to authenticate cron endpoints
- Test routes gated behind `NODE_ENV === "development" || ALLOW_TEST_EMAIL === "1"`
- Security headers configured in `next.config.ts`
- `vercel.json` has cron schedule definitions

**Quick Wins:** Add health check; update env.example; fix CI config
**Requires Refactor:** Implement env validation; add error monitoring

---

## Phase 10 — Regression Test Plan

### Core Flow Mapping

**Authentication Flows:**
1. Sign Up -> Email Verification -> Sign In
2. Sign In -> Dashboard Redirect
3. Forgot Password -> Reset Token Email -> Reset Password -> Sign In
4. Invitation Link -> Accept Invitation (create account) -> Dashboard
5. Force Password Change Flow (invited users)
6. Deactivated User -> Forced Sign Out
7. Org Selection (multi-org users)
8. Setup Organization (new users with no org)

**Dashboard Flows:**
9. Dashboard Home — stats cards, recent projects, issues, activity
10. Projects — list, create, filter, paginate
11. Project Detail — kanban board, ticket CRUD, sprint management, epics, backlog, settings
12. HR Dashboard — employee overview, quick stats
13. HR Employees — list, add, view detail, edit
14. HR Attendance — clock in/out, daily/monthly log
15. HR Leaves — request leave/WFH, approve/reject, balances
16. HR Payroll — generate, approve, view payslips
17. HR Documents — upload, list, filter by type
18. HR Devices — asset list, assign
19. HR Expenses — create, approve, reject, export
20. HR Onboarding — wizard flow, work logs
21. Timesheets — log time, edit, team view
22. Settings — profile, organization, members
23. Billing — overview
24. CRM Dashboards — Sales, Marketing, Customer Executive, Support

### Regression Test Cases

| ID | Flow | Pre-conditions | Steps | Expected Result | Regression Indicator |
|---|---|---|---|---|---|
| RT-001 | Sign Up | No existing account | 1. Go to /signup 2. Enter valid email + strong password 3. Submit | Success message, verification email sent | Error message, no email, 500 error |
| RT-002 | Sign Up (duplicate) | Account exists | 1. Go to /signup 2. Enter existing email | Error message (note: currently reveals existence — known issue) | Different error, 500, or success |
| RT-003 | Email Verification | Pending verification | 1. Click link from email | Email verified, can sign in | Token invalid error, 500 |
| RT-004 | Sign In | Verified account | 1. Go to /signin 2. Enter credentials | Redirect to /dashboard (or callbackUrl) | Login fails, wrong redirect, 500 |
| RT-005 | Sign In (wrong password) | Verified account | 1. Enter wrong password | Error: "Invalid credentials" | Different error, success, 500 |
| RT-006 | Sign In (unverified) | Unverified account | 1. Try to sign in | Error prompting verification | Bypasses verification |
| RT-007 | Forgot Password | Verified account | 1. Go to /forgot-password 2. Enter email 3. Submit | Success message (regardless of email existence) | Reveals account existence |
| RT-008 | Reset Password | Valid reset token | 1. Click reset link 2. Enter new password | Password updated, can sign in with new password | Token invalid, old password still works |
| RT-009 | Protected Route (unauthenticated) | Not logged in | 1. Navigate to /dashboard | Redirect to /signin with callbackUrl | Page loads, 500, wrong redirect |
| RT-010 | Auth Route (authenticated) | Logged in | 1. Navigate to /signin | Redirect to /dashboard | Signin page shows |
| RT-011 | Force Password Change | User with `isPasswordChangeRequired=true` | 1. Sign in | Redirect to /auth/reset-password, blocked from other pages | Can access dashboard |
| RT-012 | Deactivated User | User with `isActive=false` | 1. Try any action | Forced sign out | Can still use app |
| RT-013 | Invitation Flow | Valid invitation link | 1. Click invitation link 2. Create account with password | Account created, added to org, invitation marked accepted | Already-used token works, wrong org |
| RT-014 | Org Selection | User in multiple orgs | 1. Navigate to /org-selection | See all orgs, can select one | Missing orgs, wrong orgs |
| RT-015 | Create Organization | Authenticated, no org | 1. Go to /setup-organization 2. Fill name + slug 3. Submit | Org created, user is OWNER | Duplicate slug allowed, wrong role |
| RT-016 | Dashboard Load | Authenticated with org | 1. Go to /dashboard | Stats, recent projects, issues, team info load | Empty data, loading forever, 500 |
| RT-017 | Create Project | Authenticated | 1. Click new project 2. Fill details 3. Submit | Project created with default statuses | Missing statuses, wrong org |
| RT-018 | Project Kanban | Project exists with tickets | 1. Go to project detail | Kanban board renders, can drag tickets | Empty board, drag fails |
| RT-019 | Create Ticket | In project context | 1. Click create ticket 2. Fill title + type 3. Submit | Ticket created with auto-incrementing number | Wrong number, wrong project |
| RT-020 | Clock In/Out | Authenticated employee | 1. Clock in 2. Work 3. Clock out | Attendance record created with work hours | Duplicate record, wrong hours |
| RT-021 | Request Leave | Has leave balance | 1. Go to leaves 2. Request leave 3. Fill dates + type | Leave request created as PENDING | Balance not checked, wrong dates |
| RT-022 | Approve Leave | Manager role | 1. See pending request 2. Approve | Status -> APPROVED, balance deducted | Balance not deducted, wrong status |
| RT-023 | Upload Document | Authenticated | 1. Go to documents 2. Upload PDF 3. Submit | Document stored, appears in list | Upload fails, wrong type allowed |
| RT-024 | File Upload (invalid type) | Authenticated | 1. Try to upload .exe file | Error: "File type not allowed" | File accepted |
| RT-025 | File Upload (size limit) | Authenticated | 1. Try to upload >10MB file | Error: "File too large" | File accepted |
| RT-026 | Create Expense | Authenticated | 1. Go to expenses 2. Fill amount + category + date 3. Submit | Expense created as PENDING | Wrong amount type, missing fields |
| RT-027 | Export Expenses | Has expenses | 1. Click export 2. Select format | File downloads with correct data | Empty file, wrong data, 500 |
| RT-028 | Invite User | ADMIN/OWNER role | 1. Go to settings/members 2. Invite email + role | Invitation created, email sent | Non-admin can invite, email fails |
| RT-029 | Remove Member | ADMIN/OWNER role | 1. Go to members 2. Remove member | Member removed from org | Self-removal allowed, MEMBER can remove |
| RT-030 | Update Member Role | OWNER only | 1. Change member role | Role updated | ADMIN can update, non-owner succeeds |
| RT-031 | Rate Limiting | Auth endpoints | 1. Send >10 requests in 1 minute | 429 Too Many Requests after 10 | No rate limiting |
| RT-032 | Cron Auth | Cron endpoint | 1. Call without CRON_SECRET | 401 Unauthorized | Endpoint accessible |
| RT-033 | Session Persistence | Logged in, close browser | 1. Reopen app | Still authenticated | Logged out |
| RT-034 | Log Time | In project with time tracking | 1. Log time entry 2. Submit | Timesheet entry created | Wrong project, negative hours |
| RT-035 | Payroll Generation | HR admin | 1. Generate payroll for month | Payroll records created for all employees | Missing employees, wrong amounts |

---

## Phase 11 — Smoke Test Checklist

Deploy-day checklist (< 10 minutes):

| # | Test | URL / Action | Expected Outcome | Pass/Fail Criteria | Severity |
|---|---|---|---|---|---|
| SM-01 | App loads | `GET /` | Landing page renders, no JS errors | Page visible, console clean | **Blocks deploy** |
| SM-02 | Auth page loads | `GET /signin` | Sign in form renders | Form fields visible | **Blocks deploy** |
| SM-03 | Sign in works | Submit valid credentials | Redirect to `/dashboard` | Dashboard renders | **Blocks deploy** |
| SM-04 | Dashboard renders | `GET /dashboard` | Stats, cards, data loads | No white screen, data present | **Blocks deploy** |
| SM-05 | API responds | `GET /api/trpc/dashboard.getStats` | JSON response, 200 | Valid JSON, not 500 | **Blocks deploy** |
| SM-06 | Sign out works | Click sign out | Redirect to `/signin`, session cleared | Cannot access `/dashboard` | **Blocks deploy** |
| SM-07 | 404 page | `GET /nonexistent-page` | Custom 404 renders | Not white screen | Monitor only |
| SM-08 | Protected redirect | `GET /dashboard` (unauthenticated) | Redirect to `/signin` | Not 500, redirect works | **Blocks deploy** |
| SM-09 | Cron auth | `GET /api/cron/auto-checkout` (no secret) | 401 response | Not 200, not 500 | **Blocks deploy** |
| SM-10 | Rate limiting | 11 rapid auth requests | 429 on 11th request | Rate limit triggers | Monitor only |
| SM-11 | File upload | Upload a small image | Success response with URL | File accessible | Monitor only |
| SM-12 | HR page loads | `GET /hr` | HR dashboard renders | Data present, no errors | Monitor only |
| SM-13 | Projects page | `GET /projects` | Projects list renders | Data present, no errors | Monitor only |
| SM-14 | No console errors | Check browser console on 5 core pages | No error-level messages | No red console entries | Monitor only |

---

## Phase 12 — Integration & Unit Test Gap Analysis

**Summary:** Zero test files exist in the project (excluding the e2e/ directory which appears to be in early stages). There is no unit test framework configured (no Jest, Vitest, or testing-library setup).

| What Needs Testing | Type | Priority | Test Description |
|---|---|---|---|
| **Auth router: signUp** | Integration | Critical | Verify user creation, token generation, password hashing, email dispatch; test duplicate email handling |
| **Auth router: verifyEmail** | Integration | Critical | Verify token validation, expiry handling, user update, token cleanup |
| **Auth router: resetPassword** | Integration | Critical | Verify token lookup, password update, token deletion |
| **Auth router: acceptInvitation** | Integration | Critical | Verify invitation validation, user creation, org membership, invitation update |
| **Middleware auth guard** | Integration | Critical | Verify protected routes redirect, auth routes redirect when logged in, rate limiting works |
| **Organization router: createOrganization** | Integration | High | Verify org creation, owner membership, slug uniqueness |
| **Organization router: inviteUser** | Integration | High | Verify permission check, invitation creation, email dispatch |
| **Organization router: removeMember** | Integration | High | Verify permission check, self-removal prevention, membership deletion |
| **HR router: addEmployee** | Integration | High | Verify user creation, org membership, password generation, email |
| **HR router: clockIn/clockOut** | Integration | High | Verify attendance creation, duplicate prevention, work hours calculation |
| **Leave actions: requestLeave** | Integration | High | Verify balance check, request creation, date validation |
| **Leave actions: approveLeave** | Integration | High | Verify status update, balance deduction, notification |
| **Project router: createProject** | Integration | High | Verify project creation, default statuses, member assignment |
| **Project router: createTicket** | Integration | High | Verify ticket number auto-increment, project association |
| **Expense actions: createExpense** | Integration | Medium | Verify expense creation, category validation, receipt URL |
| **File upload route** | Integration | High | Verify auth, size limit, type validation, magic bytes, path traversal prevention |
| **File download route** | Integration | Medium | Verify auth, path traversal prevention, signed URLs |
| **Cron routes** | Integration | Medium | Verify CRON_SECRET authentication, processing logic |
| **lib/format-utils.ts** | Unit | Medium | Test all utility functions: formatCurrency, formatNumber, getInitials, etc. |
| **lib/pagination.ts** | Unit | Medium | Test createPaginatedResponse, getOffset, boundary conditions |
| **lib/password-utils.ts** | Unit | Medium | Test password hashing, comparison |
| **lib/leave-policy.ts** | Unit | Medium | Test leave calculation logic |
| **lib/date-utils.ts** | Unit | Medium | Test date formatting and calculation |
| **RBAC middleware** | Integration | High | Test permission checks, role hierarchy, org context |
| **OrganizationGuard component** | Component | Medium | Test redirect when no org, loading state, org context provision |
| **Error boundaries** | Component | Medium | Test error.tsx components render properly on errors |

---

## Phase 13 — Static Analysis & Dead Code

**Issues Found:**

| # | File / Location | Issue Description | Severity | Recommendation |
|---|---|---|---|---|
| 13.1 | `package.json:57` | `"i": "^0.3.7"` — never imported, accidental install | Low | Remove |
| 13.2 | `package.json:60` | `"moment": "^2.30.1"` — never imported | Low | Remove |
| 13.3 | `package.json:67` | `"radix-ui": "^1.4.3"` — appears redundant; individual `@radix-ui/*` packages are already installed | Low | Verify and remove if unused |
| 13.4 | `drizzle/` folder | Duplicate migration paths: `0001_add_timesheet_approval.sql` AND `0001_typical_mockingbird.sql`; `0002_add_holidays_table.sql` AND `0002_flaky_captain_cross.sql` | Medium | Clean up — only one migration per sequence number should exist |
| 13.5 | `app/(auth)/reset-password/page.tsx` | Duplicate of `app/auth/reset-password/page.tsx` — middleware routes to `app/auth/` version | Medium | Remove the `(auth)` group version if unused |
| 13.6 | `.github/workflows/ci.yml:43-44` | Clerk env vars — dead references from a previous auth provider | Low | Remove |
| 13.7 | `scripts/test-holiday-email.ts`, `scripts/test-holiday-email-multi.ts` | Development test scripts with hardcoded personal email | Low | Remove hardcoded email; parameterize |

---

## Phase 14 — Error Handling & Observability

**Issues Found:**

| # | File / Location | Issue Description | Severity | Recommendation |
|---|---|---|---|---|
| 14.1 | No Sentry/Datadog | No APM or error monitoring in production | High | Add Sentry SDK with Next.js integration |
| 14.2 | `lib/logger.ts` | Console-only structured logging — no external sink | Medium | Add transport to external logging service |
| 14.3 | Multiple locations | `console.error` used instead of structured `logger.error` | Low | Standardize on logger |
| 14.4 | `server/api/routers/organization.ts:92-96` | Error swallowed silently — returns `[]` on DB failure | Medium | Log error; consider throwing |
| 14.5 | No audit log table | No record of sensitive actions (role changes, deletions, salary modifications) | High | Create `audit_logs` table; log all sensitive mutations |
| 14.6 | Error boundaries | Present on most route segments — good | N/A | Correct |
| 14.7 | tRPC error formatter | Properly flattens Zod errors for client — good | N/A | Correct |

---

# FINAL DELIVERABLES

## 1. Top 10 Critical Issues (Ordered by Risk/Impact)

| Rank | Issue | Phase | Severity | Impact |
|---|---|---|---|---|
| **1** | **Authorization bypass on HR queries** — `getSalaryStructures`, `getEmployeeStats`, `getDocuments`, `getPerformanceReviews`, `getGoals` accept any `userId` with NO permission check. Any employee can view any coworker's salary, goals, documents | 2 | Critical | Active data breach risk — any authenticated user can access all employee PII/financial data |
| **2** | **SSRF in QR code download** — `app/api/qr-code/download/route.ts` fetches user-controlled URLs with incomplete blocklist (missing IPv6, DNS rebinding). Can probe internal networks | 3 | Critical | Server-side request forgery — internal network scanning, metadata endpoint access |
| **3** | **18 dependency CVEs** (1 critical, 17 high) — Next.js DoS, tRPC prototype pollution, xlsx prototype pollution, jspdf injection | 3 | Critical | Remote exploitation possible on production |
| **4** | **Missing orgId filter in `updateGoal`** — WHERE clause only checks `goal.id`, not `orgId`. Can update goals across organizations | 2 | Critical | Cross-org data modification |
| **5** | **Non-deterministic org selection** in `enforceUserIsAuthed` — no ORDER BY, picks random first org | 2 | Critical | User may operate on wrong organization's data |
| **6** | **N+1 queries in cron jobs** — weekly attendance, monthly expense, leave reset all loop with per-member DB queries (50 employees = 50-150 queries) | 5 | High | Cron timeouts, DB connection pool exhaustion |
| **7** | **Missing DB transactions** on auth flows (signUp, acceptInvitation, createOrg) | 5 | High | Data inconsistency — users without verification tokens or memberships |
| **8** | **Missing unique constraints** (attendance/user/day, org membership, leave balances, project members) | 5 | High | Duplicate records, data corruption, incorrect calculations |
| **9** | **Zero test coverage** — no unit, integration, or component tests | 12 | High | Any change could break production undetected |
| **10** | **No error monitoring + no audit logging** — no Sentry, no audit trail for role changes, deletions, salary modifications | 9,14 | High | Production errors invisible; no forensic capability |

---

## 2. Regression Test Suite

See **Phase 10** above — 35 test cases covering all Phase 1 flows (RT-001 through RT-035).

---

## 3. Smoke Test Checklist

See **Phase 11** above — 14 items, copy-paste ready (SM-01 through SM-14).

---

## 4. Prioritized Fix Roadmap

### Week 1: Critical Security + Regression Gaps
- [ ] **FIX IMMEDIATELY**: Add role-based permission checks to ALL HR queries accepting `userId` param (getSalaryStructures, getEmployeeStats, getDocuments, getPerformanceReviews, getGoals, getHelpdeskTickets)
- [ ] **FIX IMMEDIATELY**: Fix `updateGoal` — add `eq(goals.orgId, ctx.session.orgId)` to WHERE clause
- [ ] **FIX IMMEDIATELY**: Fix SSRF in QR code download — implement domain allowlist, add IPv6/DNS rebinding protection, add response size limit
- [ ] Update all vulnerable dependencies (`next`, `@trpc/server`, `xlsx` -> `exceljs`, `jspdf`, `@aws-sdk/*`)
- [ ] Add DB transactions to: signUp, acceptInvitation, createOrganization, addEmployee
- [ ] Fix org selection: add `ORDER BY` to `enforceUserIsAuthed`, plan multi-org support
- [ ] Fix account enumeration: generic responses on signUp, resendVerification
- [ ] Add unique constraints: attendance(userId,date,orgId), orgMembers(userId,orgId), leaveBalances(userId,leaveTypeId,year,orgId), projectMembers(projectId,userId)
- [ ] Add runtime env validation with `@t3-oss/env-nextjs`
- [ ] Add Sentry error monitoring

### Week 2: High Severity Code Quality + Performance
- [ ] Fix N+1 queries in cron jobs: batch-fetch attendance/expenses/leave-balances in single queries
- [ ] Add DB indexes on all `orgId` columns + key lookup patterns (attendance, tickets, expenses, etc.)
- [ ] Create audit_logs table; log sensitive mutations (role changes, salary, deletions)
- [ ] Implement pagination on all unbounded list queries (getEmployees, getExpenses, getHolidays, etc.)
- [ ] Add authorization checks to Reports router (cross-user data access)
- [ ] Remove unused dependencies (`moment`, `i`, verify `radix-ui`)
- [ ] Replace all `as any` casts with proper types (9 occurrences)
- [ ] Fix CI config (remove Clerk references, add correct env vars)
- [ ] Add `/api/health` endpoint
- [ ] Refactor dashboard layout to server component
- [ ] Hash password reset/verification tokens before DB storage

### Week 3: Medium Issues + Test Coverage
- [ ] Set up Vitest + testing-library
- [ ] Write integration tests for all auth router procedures
- [ ] Write integration tests for organization CRUD
- [ ] Write unit tests for `lib/format-utils.ts`, `lib/pagination.ts`, `lib/date-utils.ts`
- [ ] Add `generateMetadata` to key pages
- [ ] Add favicon, robots.txt, sitemap.xml
- [ ] Update env.example with all required variables
- [ ] Fix gold color contrast for WCAG AA
- [ ] Clean up duplicate migrations

### Backlog: Low Severity + Nice-to-Haves
- [ ] Split monolithic routers (hr.ts, project.ts) into sub-routers
- [ ] Split `trpc-hooks.ts` (2035 lines) by domain
- [ ] Add nonce-based CSP for scripts
- [ ] Implement distributed rate limiting (Redis/Vercel KV)
- [ ] Add soft delete for users, expenses, leave records
- [ ] Add Suspense boundaries in dashboard
- [ ] Remove hardcoded test emails from source code
- [ ] Rename `useAttendanceTimer.ts` to `use-attendance-timer.ts`
- [ ] Add structured data (JSON-LD) to landing page
- [ ] Implement per-query staleTime for tRPC
- [ ] Delete `.DS_Store` files and ensure gitignored

---

## 5. Health Scorecard

| Area | Score | Justification |
|---|---|---|
| **Architecture** | 7/10 | Clean App Router structure with proper grouping; monolithic routers need splitting |
| **tRPC Design** | 7/10 | Solid 3-tier procedure system with org scoping; multi-org context is fragile |
| **Security** | 4/10 | Good headers/CSRF/upload protection, but authorization bypass on HR queries, SSRF, 18 CVEs, no audit logging |
| **Code Quality** | 7/10 | Strict TS, good patterns, but 9 `as any` casts, unused deps, console.logs in prod |
| **Performance** | 6/10 | Client-rendered dashboard layout, missing indexes, unused heavy deps in bundle |
| **Accessibility** | 6/10 | Skip link, ARIA on some components, Radix provides basics; inconsistent coverage |
| **SEO** | 3/10 | Minimal — no favicon, robots.txt, sitemap, or per-page metadata (acceptable for SaaS dashboard) |
| **Test Coverage** | 1/10 | Zero tests — most critical gap; any code change is deployed blind |
| **Error Handling** | 6/10 | Error boundaries present, typed TRPCErrors, structured logger; but no monitoring/audit logs |
| **Observability** | 2/10 | Console-only logging, no APM, no health check, no audit trail |
