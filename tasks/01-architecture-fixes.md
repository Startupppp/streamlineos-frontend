# Task 01: Architecture Fixes (Remove Mistakes)

## Priority: CRITICAL | Effort: 3-5 days | Dependencies: Task 06 (Redis) | Status: NOT STARTED

> Per user directive: If there's an architecture mistake, **remove it** — don't just document or work around it.

---

## PRD

### Problem Statement
The application has fundamental architecture mistakes that harm performance, scalability, and developer experience:
1. **Dashboard layout is `"use client"`** — forces ALL child pages to be client components, defeating Next.js App Router's RSC model
2. **JWT callback queries DB on every request** — ~70% of all DB queries are auth lookups with no caching
3. **In-memory rate limiting** — resets on every cold start, doesn't share across serverless instances
4. **Large monolithic components** — Chat page (2,380 lines), Leads page (1,450 lines), Expenses page (994 lines) are unmaintainable
5. **Dead/duplicate files** — orphan components, duplicate command-palette/empty-state/metric-card/page-header
6. **Missing loading/error states** — 20+ pages lack loading.tsx, 25+ lack error.tsx
7. **Browser dialogs** — `window.confirm()`/`prompt()` used in 4 files instead of proper UI components
8. **Hardcoded localhost** — 7 files use `http://localhost:3000` fallback instead of env vars
9. **Dual tRPC client systems** — `trpc/react.tsx` (67 imports) and `lib/trpc.ts` (47 imports) serve overlapping purposes

### Goals
- Convert dashboard layout to Server Component (unlock RSC for all pages)
- Cache JWT session in Redis (<10ms auth checks)
- Replace in-memory rate limiting with Redis-backed
- Split all files >500 lines into focused sub-components
- Delete dead files and orphan components
- Add loading/error states to all pages
- Replace all browser dialogs with AlertDialog
- Remove hardcoded URLs

### Non-Goals
- Removing tRPC (separate task 01b)
- UI redesign (Task 07)
- New features (only fix existing architecture)

### Success Criteria
- No `"use client"` on layout files
- JWT callback <10ms (cached)
- Rate limits survive restarts
- No file exceeds 500 lines
- Every page has loading.tsx and error.tsx
- Zero `window.confirm()`/`prompt()` calls
- Zero hardcoded localhost URLs

---

## Implementation Steps

### 1.1 Convert Dashboard Layout to Server Component

**File**: `app/(dashboard)/layout.tsx`

**Problem**: Entire layout is `"use client"` which forces ALL child pages to be client components. This defeats the purpose of Next.js App Router's RSC model entirely.

**Action**: REMOVE the client directive from the layout.

**Steps**:
1. Create `components/layout/dashboard-shell.tsx` — new client component containing sidebar, header, scroll area, mobile menu
2. Rewrite `app/(dashboard)/layout.tsx` as a Server Component:
   ```tsx
   import { auth } from "@/lib/auth";
   import { redirect } from "next/navigation";
   import { DashboardShell } from "@/components/layout/dashboard-shell";
   
   export default async function DashboardLayout({ children }) {
     const session = await auth();
     if (!session) redirect("/signin");
     return <DashboardShell session={session}>{children}</DashboardShell>;
   }
   ```
3. Move all interactive elements (sidebar toggle, shortcuts, scroll) into `DashboardShell`

**Acceptance Criteria**:
- No `"use client"` on the layout file
- Session check happens server-side (no flash/redirect)
- Children can be either Server or Client Components

---

### 1.2 Split Monolithic Schema File — REMOVE the 2,464-Line Monster

**File**: `lib/db/schema.ts` → Split into 8 files

**Steps**:
1. Create `lib/db/schema/` directory
2. Split into domain files:
   - `lib/db/schema/enums.ts` — ALL pgEnum declarations (~50 enums)
   - `lib/db/schema/auth.ts` — users, accounts, sessions, invitations, tokens, organizations, orgMembers
   - `lib/db/schema/hr.ts` — attendance, leaves, payroll, salary, expenses, assets, documents, performanceReviews, goals, holidays, wfh, devices, onboarding tasks
   - `lib/db/schema/crm.ts` — leads, deals, contacts, targets, campaigns, lead-activities, lead-notes, lead-tasks, lead-emails, scoring, assignment, SLA, views, crmOrganizations, clientAccounts, incentives, dmLeads
   - `lib/db/schema/projects.ts` — projects, tickets, sprints, cycles, modules, pages, views, statuses, comments, attachments, labels, intake, workItemRelations
   - `lib/db/schema/chat.ts` — chatChannels, chatChannelMembers, chatMessages, chatAttachments, chatUserPresence
   - `lib/db/schema/billing.ts` — invoices, invoiceAiExtractions, branches, incentiveConfig
   - `lib/db/schema/notifications.ts` — notifications, auditLogs, qrCodes, supportTickets, supportTicketMessages
   - `lib/db/schema/index.ts` — re-export everything
3. DELETE `lib/db/schema.ts` (the original monolith)
4. Update ALL imports across the codebase (most import from `@/lib/db/schema` which will resolve to `index.ts`)

**Acceptance Criteria**:
- `drizzle-kit generate` produces zero-diff migration
- Build passes
- No circular imports

---

### 1.3 REMOVE JWT DB Query on Every Request

**File**: `lib/auth.ts` lines 143-173

**Problem**: JWT callback queries `db.query.users.findFirst()` on EVERY single request — this is ~70% of all DB queries.

**Action**: Replace with Redis cache. Requires Task 06 (Upstash Redis) to be done first.

**Steps**:
1. In JWT callback: `await redis.get<UserMeta>(\`user:session:${userId}\`)`
2. On cache miss: query DB, then `redis.set(key, data, { ex: 300 })`
3. On user update/role change: `redis.del(\`user:session:${userId}\`)`
4. On logout: `redis.del(\`user:session:${userId}\`)`

**Acceptance Criteria**:
- JWT callback <10ms for cached users
- First request per 5 min hits DB, rest are cached

---

### 1.4 REMOVE In-Memory Rate Limiter

**File**: `lib/rate-limit.ts`

**Problem**: Uses in-memory `Map` — resets on every serverless cold start, doesn't share across instances.

**Action**: Delete and replace with Upstash Redis rate limiter.

**Steps**:
1. `pnpm add @upstash/ratelimit`
2. Rewrite `lib/rate-limit.ts` using `Ratelimit` from `@upstash/ratelimit`
3. Update all consumers (auth, API routes)

---

### 1.5 REMOVE Dead/Duplicate Files

**Delete immediately**:

| File | Reason |
|------|--------|
| `d:/projects/vaivamm-capital-crm/task` | User prompt file at root, not code |
| `d:/projects/vaivamm-capital-crm/test-drizzle.ts` | Debug/test file at root |
| `d:/projects/vaivamm-capital-crm/audit/REPORT.md` | Old audit — replaced by `/tasks/` |
| `d:/projects/vaivamm-capital-crm/lib/email-templates.ts` | Empty file (just `export {}`) |
| `d:/projects/vaivamm-capital-crm/env.example` | Duplicate of `.env.example` (if exists) |

**Merge duplicates**:
- Move files from `lib/hooks/` (tRPC-dependent hooks) → will be deleted during tRPC removal (Task 01b)
- Keep ONLY `hooks/` directory for general-purpose React hooks

---

### 1.6 REMOVE Global CSS Import from Root

**Problem**: `globals.css` at project root level, imported as `../globals.css` in layout.

**Action**: Move to `app/globals.css` and update import to `./globals.css`.

---

### 1.7 Add Error Boundaries Per Feature

**Create**: `components/shared/feature-error-boundary.tsx`

**Add to**: Each dashboard sub-route's `error.tsx` files — replace generic error UI with rich error boundary including:
- Retry button
- Error details (dev only)
- Report button
- Fallback UI matching the page layout

### 1.8 Split Chat Page Monolith (2,380 lines)

**File**: `app/(dashboard)/chat/page.tsx` — **largest file in codebase**

**Split into**:
- `components/chat/chat-sidebar.tsx` — Channel list, DM list, search
- `components/chat/chat-messages.tsx` — Message list, scroll, load more
- `components/chat/chat-input.tsx` — Message composer, file upload
- `components/chat/chat-header.tsx` — Channel name, members, settings
- `components/chat/message-item.tsx` — Individual message rendering
- `app/(dashboard)/chat/page.tsx` — Orchestrator (under 200 lines)

**Also split other oversized files**:
- `app/(dashboard)/hr/expenses/page.tsx` (994 lines)
- `app/(dashboard)/hr/work-logs/page.tsx` (949 lines)
- `app/(dashboard)/hr/attendance/attendance-content.tsx` (855 lines)

### 1.9 Fix Missing Loading/Error States (20+ pages)

**Pages missing `loading.tsx`**:
- `app/(auth)/forgot-password/`
- `app/(auth)/signin/`
- `app/(auth)/verify-email/`
- `app/(auth)/invitation/[token]/`
- `app/(dashboard)/crm/clients/[id]/`
- `app/(dashboard)/crm/leads/distribute/`
- `app/(dashboard)/digital-marketing/` (all sub-pages)
- `app/(dashboard)/settings/branches/`
- `app/(dashboard)/settings/roles/`

**Pages missing `error.tsx`**:
- `app/(dashboard)/ceo/qr-code/`
- `app/(dashboard)/hr/attendance/`
- `app/(dashboard)/hr/employees/new/`
- `app/(dashboard)/hr/payroll/`
- `app/(dashboard)/hr/work-logs/`

### 1.10 Replace browser confirm()/prompt() with AlertDialog

**Files using anti-pattern** (4 files, not 2):
- `app/(dashboard)/crm/deals/page.tsx` — uses `window.confirm()` for deal deletion
- `app/(dashboard)/crm/deals/[dealId]/page.tsx` — uses `prompt()` for user input
- `app/(dashboard)/hr/leaves/leaves-shared.tsx` — uses `window.prompt()`
- `app/(dashboard)/hr/work-logs/page.tsx` — uses `window.prompt()`
- `components/crm/lead-table-view.tsx` — uses `confirm()`

Replace with shadcn `AlertDialog` component for proper UX.

### 1.11 Centralize Hardcoded localhost Fallbacks

**7 files** use `http://localhost:3000` as fallback instead of throwing:
- `app/(dashboard)/ceo/qr-code/actions.ts`
- `app/api/qr-code/download/route.ts`
- `lib/email/sender.ts`
- `lib/email-templates/base.ts`
- `lib/email.ts`
- `lib/notifications/send.ts`
- `lib/trpc.ts`

**Fix**: Use `env.NEXT_PUBLIC_APP_URL` from validated env (lib/env.ts) everywhere. Remove fallbacks.

---

## Rules to Follow

1. **Server Components First**: Remove `"use client"` from layout files. Extract interactive parts into separate client components
2. **Component Size Limit**: No single component file should exceed 500 lines
3. **Named Exports**: Every component must be a named export
4. **No Prop Drilling**: If props pass through 3+ levels, use context or composition
5. **Error Isolation**: Each route group gets its own `error.tsx` that doesn't crash siblings
6. **Code Splitting**: Use `dynamic()` for heavy components (charts, kanban, rich editors)
7. **No browser APIs for confirmation**: Use AlertDialog, not `window.confirm()`/`prompt()`
8. **No hardcoded URLs**: Always use env-validated URLs from `lib/env.ts`

---

## Checklist

- [ ] Dashboard layout converted to server component
- [ ] `DashboardShell` client component extracted
- [ ] Chat page (2,380 lines) split into 5+ sub-components
- [ ] Leads page (1,450 lines) split into 6+ sub-components
- [ ] Expenses page (994 lines) split into sub-components
- [ ] Work Logs page (949 lines) split into sub-components
- [ ] Attendance content (855 lines) split into sub-components
- [ ] Deals page split into sub-components
- [ ] Rate limiting migrated to Redis (requires Task 06)
- [ ] Cron idempotency migrated to Redis (requires Task 06)
- [ ] JWT callback uses Redis cache (requires Task 06)
- [ ] Error boundaries exist for CRM, HR, Projects, Chat, Settings
- [ ] Missing loading.tsx files created (20+ pages)
- [ ] Missing error.tsx files created (25+ pages)
- [ ] Heavy components use dynamic imports
- [ ] `zustand` removed from package.json
- [ ] `window.confirm()` and `prompt()` replaced with AlertDialog (5 files)
- [ ] Hardcoded localhost URLs replaced with env vars
- [ ] No single component file exceeds 500 lines
- [ ] Build passes with no errors

## Acceptance Criteria

1. `pnpm build` succeeds with zero errors
2. Dashboard layout renders on server (no client boundary at layout level)
3. Rate limit state persists across restarts
4. Each module can error independently without crashing others
5. Largest component file is under 500 lines
6. Every page has loading.tsx and error.tsx
7. No `window.confirm()` or `prompt()` in codebase
8. No hardcoded localhost URLs remain

## Testing Plan

1. Navigate all dashboard routes, verify sidebar/header render correctly
2. Trigger rate limits, restart server, verify limits persist
3. Force an error in CRM module, verify HR/Projects still work
4. Switch between kanban/table views on leads, verify both work
5. Test responsive layout at 320px, 768px, 1024px, 1440px
6. Verify all pages show loading skeleton during navigation
7. Verify all pages show error boundary on failure
8. `pnpm build` and `pnpm lint` must pass
