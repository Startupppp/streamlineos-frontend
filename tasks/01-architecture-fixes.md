# Task 01: Architecture Fixes (Remove Mistakes)

## Priority: 🔴 CRITICAL — Execute After Task 06 (Infrastructure)

> Per user directive: If there's an architecture mistake, **remove it** — don't just document or work around it.

---

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

**Acceptance Criteria**:
- Every dashboard sub-route has a useful error boundary
- Errors in one module don't crash the entire dashboard
- Users can retry after transient failures
