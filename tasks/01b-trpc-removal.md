# Task 01b: tRPC Removal (EVALUATE FIRST)

## Priority: CRITICAL (if approved) | Effort: 8-10 days | Dependencies: Task 06 (Infrastructure) | Status: NEEDS EVALUATION

---

## PRD

### Problem Statement
The app uses tRPC as its data layer (28 router files, 14 hooks). While tRPC works well, it:
1. Forces all data-fetching pages to be client components (can't use Server Components for reads)
2. Adds bundle size for tRPC client/React Query integration
3. Creates an API layer between Server Components and the database that isn't needed in App Router
4. Makes the architecture more complex than native Next.js patterns

### Goals (if approved)
- Migrate queries to server-side functions (called directly from Server Components)
- Migrate mutations to Server Actions
- Keep TanStack Query only for real-time data (chat, notifications)
- Reduce bundle size and complexity

### Non-Goals
- Building a public REST API (separate concern)
- Changing the database layer (Drizzle stays)
- Rewriting business logic (just moving where it runs)

### Success Criteria
- Zero tRPC imports in codebase
- All read-heavy pages render as Server Components
- All mutations use Server Actions
- No functional regression

### DECISION REQUIRED
**Before starting this task, evaluate**:
1. Is the effort (120 files, 8-10 days) worth the benefit?
2. Does tRPC provide value for type-safety between client/server?
3. Can we get Server Component benefits without full tRPC removal?
4. Risk of regression during migration?

**Alternative**: Keep tRPC but use `prefetch` pattern to get Server Component rendering benefits without full removal.

## Rules to Follow

1. **One module at a time**: Migrate one feature module completely before moving to next
2. **Test after each module**: Verify no regressions before proceeding
3. **Keep tRPC running**: Don't delete tRPC until ALL modules are migrated
4. **Type safety**: Every server query/action must be fully typed
5. **Auth checks**: Every server query/action must verify session

> This is the largest single task (~120 files). It migrates the entire data layer from tRPC to native Next.js App Router patterns.

---

## Phase 1: Create the Replacement Layer

### 1.1 Create `server/queries/` Directory

Reusable async query functions that Server Components call directly (no API layer).

**Files to create** (extract query logic from each tRPC router):

| New File | From tRPC Router | Key Queries |
|----------|-----------------|-------------|
| `server/queries/dashboard-queries.ts` | `dashboard.ts` (14KB) | getStats, recentProjects, teamAvailability, myIssues, activeSprintSummary, recentActivity |
| `server/queries/hr-queries.ts` | `hr/` directory (21KB+ hooks) | departments, attendanceStatus, leaves, payrolls, salaryStructures, expenses, assets, documents, performanceReviews, goals, helpdeskTickets, workLogs |
| `server/queries/lead-queries.ts` | `leads.ts` (57KB!) | list, board, detail, stats, activities, filteredLeads |
| `server/queries/lead-detail-queries.ts` | `lead-details.ts` (7KB) | notes, tasks, emails, timeline |
| `server/queries/deal-queries.ts` | `deals.ts` (9KB) | list, detail, activities, pipeline |
| `server/queries/project-queries.ts` | `project/` directory | projects, tickets, sprints, labels, members, timeEntries, burndown, epics, cycles, modules, pages, views, intake, analytics |
| `server/queries/chat-queries.ts` | `chat/` directory | myChannels, channel, messages, poll, unreadTotal, onlineUsers, orgUsers, search |
| `server/queries/crm-queries.ts` | `crm.ts` (26KB) | salesDashboard, customerExecutiveDashboard, marketingDashboard, supportDashboard, person, allPeopleSlugs |
| `server/queries/target-queries.ts` | `targets.ts` (12KB) | list, myTargets, leaderboard, history |
| `server/queries/notification-queries.ts` | `notifications.ts` (3KB) | getAll, unreadCount |
| `server/queries/invoice-queries.ts` | `invoice.ts` (9KB) | list, detail, stats |
| `server/queries/support-queries.ts` | `support.ts` (8KB) | list, detail, messages |
| `server/queries/auth-queries.ts` | `auth.ts` (7KB) | profile, orgMembers |
| `server/queries/organization-queries.ts` | `organization.ts` (15KB) | orgSettings, members, invitations |
| `server/queries/rbac-queries.ts` | `rbac.ts` (6KB) | userPermissions, allPermissions, rolePermissions |
| `server/queries/report-queries.ts` | `reports.ts` (10KB) | attendance, payroll, project, teamPerformance, dashboardStats |
| `server/queries/contact-queries.ts` | `contacts.ts` (9KB) | list, detail |
| `server/queries/client-account-queries.ts` | `client-accounts.ts` (12KB) | list, detail, activities |
| `server/queries/incentive-queries.ts` | `incentives.ts` (7KB) | list, config, calculations |
| `server/queries/dm-lead-queries.ts` | `dm-leads.ts` (7KB) | list, detail |
| `server/queries/dm-campaign-queries.ts` | `dm-campaigns.ts` (4KB) | list, detail |
| `server/queries/social-media-queries.ts` | `social-media.ts` (3KB) | accounts, posts, metrics |
| `server/queries/branch-queries.ts` | `branches.ts` (5KB) | list, detail |
| `server/queries/role-queries.ts` | `roles.ts` (5KB) | list, detail |

**Pattern for each query file**:
```typescript
// server/queries/lead-queries.ts
import "server-only";
import { db } from "@/lib/db";
import { leads, leadActivities } from "@/lib/db/schema";
import { and, eq, desc, sql } from "drizzle-orm";

export async function getLeadsList(orgId: string, filters?: {
  status?: string;
  assignedTo?: string;
  cursor?: number;
  limit?: number;
}) {
  const limit = filters?.limit ?? 25;
  // ...existing query logic from router
  return { items, nextCursor };
}

export async function getLeadDetail(orgId: string, leadId: number) {
  // ...existing query logic
}

export async function getLeadStats(orgId: string) {
  // ...existing query logic
}
```

### 1.2 Create New Server Actions (Mutations from tRPC Routers)

**Files to create** (extract mutation logic):

| New File | From tRPC Router | Key Mutations |
|----------|-----------------|---------------|
| `server/actions/lead-actions.ts` | `leads.ts` | create, update, updateStatus, bulkAssign, bulkUpdateStatus, import, convertToClient |
| `server/actions/deal-actions.ts` | `deals.ts` | create, update, updateStage, addActivity |
| `server/actions/chat-actions.ts` | `chat/` | createChannel, sendMessage, editMessage, deleteMessage, markRead, updatePresence |
| `server/actions/invoice-actions.ts` | `invoice.ts` | create, update, send, markPaid, cancel |
| `server/actions/support-actions.ts` | `support.ts` | createTicket, updateTicket, assignTicket, addMessage |
| `server/actions/target-actions.ts` | `targets.ts` | create, update, logProgress, setMilestone |
| `server/actions/contact-actions.ts` | `contacts.ts` | create, update, delete, linkToLead |
| `server/actions/client-account-actions.ts` | `client-accounts.ts` | create, update, logActivity, updateStatus |
| `server/actions/incentive-actions.ts` | `incentives.ts` | calculate, approve, reject, updateConfig |
| `server/actions/notification-actions.ts` | `notifications.ts` | markRead, markAllRead, dismiss |
| `server/actions/rbac-actions.ts` | `rbac.ts` | updateRolePermissions, assignRole |
| `server/actions/role-actions.ts` | `roles.ts` | create, update, delete |
| `server/actions/branch-actions.ts` | `branches.ts` | create, update, assignManager |
| `server/actions/dm-lead-actions.ts` | `dm-leads.ts` | create, verify, import |
| `server/actions/dm-campaign-actions.ts` | `dm-campaigns.ts` | create, update |
| `server/actions/social-media-actions.ts` | `social-media.ts` | create, schedule, publish |
| `server/actions/crm-email-template-actions.ts` | `crm-email-templates.ts` | create, update, delete |
| `server/actions/crm-sla-actions.ts` | `crm-sla.ts` | create, update, delete |
| `server/actions/crm-view-actions.ts` | `crm-views.ts` | create, update, delete |
| `server/actions/lead-scoring-actions.ts` | `lead-scoring.ts` | createRule, updateRule, deleteRule |
| `server/actions/lead-assignment-actions.ts` | `lead-assignment.ts` | createRule, updateRule, deleteRule |
| `server/actions/crm-email-actions.ts` | `crm-email.ts` | sendEmail, saveTemplate |

**Pattern for each action file**:
```typescript
// server/actions/lead-actions.ts
"use server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { leads } from "@/lib/db/schema";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const createLeadSchema = z.object({
  name: z.string().min(1),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  // ...
});

export async function createLead(formData: z.infer<typeof createLeadSchema>) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const validated = createLeadSchema.parse(formData);
  const [lead] = await db.insert(leads).values({
    ...validated,
    orgId: session.user.orgId,
    createdBy: session.user.id,
  }).returning();
  
  revalidatePath("/crm/leads");
  return lead;
}
```

### 1.3 Create Route Handlers (for Client-Side Fetching)

Only needed for pages that require client-side real-time data:

| Route Path | Purpose | Used By |
|------------|---------|---------|
| `app/api/v1/notifications/route.ts` | Unread count polling | Notification bell |
| `app/api/v1/chat/messages/route.ts` | Chat message polling | Chat page |
| `app/api/v1/chat/presence/route.ts` | Online status updates | Chat sidebar |
| `app/api/v1/dashboard/stats/route.ts` | Live metrics refresh | Dashboard |

**Pattern**:
```typescript
// app/api/v1/notifications/route.ts
import { auth } from "@/lib/auth";
import { getUnreadNotificationCount } from "@/server/queries/notification-queries";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  
  const count = await getUnreadNotificationCount(session.user.id);
  return NextResponse.json({ count });
}
```

---

## Phase 2: Rewrite All Consumer Pages

### 2.1 Convert `"use client"` Pages to Server Components

Most pages currently do:
```tsx
"use client";
import { api } from "@/trpc/react";
const { data } = api.leads.list.useQuery({ ... });
```

**Convert to**:
```tsx
// NO "use client" directive — this is a Server Component
import { getLeadsList } from "@/server/queries/lead-queries";
import { auth } from "@/lib/auth";
import { LeadsTable } from "./leads-table"; // client component for interactivity

export default async function LeadsPage() {
  const session = await auth();
  const leads = await getLeadsList(session!.user.orgId, { limit: 50 });
  return <LeadsTable initialData={leads} />;
}
```

### Pages to rewrite (by domain):

**CRM (14 pages)**:
- `crm/page.tsx`, `crm/leads/page.tsx`, `crm/leads/[leadId]/page.tsx`
- `crm/leads/distribute/page.tsx`, `crm/deals/page.tsx`, `crm/deals/[dealId]/page.tsx`
- `crm/targets/page.tsx`, `crm/organizations/page.tsx`, `crm/reports/page.tsx`
- `crm/settings/sla/page.tsx`, `crm/settings/scoring-rules/page.tsx`
- `crm/settings/email-templates/page.tsx`, `crm/settings/assignment-rules/page.tsx`

**HR (14 pages)**:
- `hr/attendance/attendance-content.tsx`, `hr/leaves/leaves-wfh-content.tsx`
- `hr/leaves/leave-approvals.tsx`, `hr/leaves/wfh-tab-content.tsx`
- `hr/payroll/page.tsx`, `hr/employees/[id]/employee-details-view.tsx`
- `hr/employees/[id]/edit-employee-form.tsx`, `hr/expenses/*`
- `hr/documents/upload-document-dialog.tsx`, `hr/performance/page.tsx`
- `hr/devices/page.tsx`, `hr/work-logs/page.tsx`
- `hr/org-chart/page.tsx`, `hr/my-payslips/page.tsx`, `hr/incentives/page.tsx`

**Projects (12 pages)**:
- `projects/page.tsx`, `projects/new-project-dialog.tsx`, `projects/project-card.tsx`
- `projects/[id]/page.tsx`, `[id]/sprints/page.tsx`, `[id]/settings/page.tsx`
- `[id]/epics/page.tsx`, `[id]/backlog/page.tsx`, `[id]/cycles/page.tsx`
- `[id]/modules/page.tsx`, `[id]/pages/page.tsx`, `[id]/views/page.tsx`
- `[id]/intake/page.tsx`, `[id]/analytics/page.tsx`

**Dashboard & Layout (5)**:
- `dashboard/page.tsx`, `notifications/page.tsx`, `onboarding/page.tsx`
- `chat/page.tsx`, `marketing/page.tsx`

**Settings (5)**:
- `settings/[[...rest]]/page.tsx`, `settings/members/page.tsx`
- `settings/organization/page.tsx`, `settings/roles/page.tsx`
- `settings/branches/page.tsx`

**Other (8)**:
- `sales/page.tsx`, `sales/person/[slug]/page.tsx`
- `customer-executive/page.tsx`, `support/page.tsx`, `support/inbox/page.tsx`
- `billing/page.tsx`, `billing/invoices/page.tsx`
- `timesheets/page.tsx`, `timesheets/team/page.tsx`
- `digital-marketing/*` (4 pages)

**Components (~15)**:
- `components/layout/notification-bell.tsx`
- `components/hr/request-wfh-dialog.tsx`, `wfh-requests-list.tsx`, etc.
- `components/crm/lead-distribution-dialog.tsx`, `lead-export-dialog.tsx`, `csv-upload-dialog.tsx`
- `components/projects/create-sprint-dialog.tsx`, `edit-sprint-dialog.tsx`, `create-epic-dialog.tsx`
- `components/timesheets/log-time-dialog.tsx`, `edit-time-entry-dialog.tsx`, `time-entry-detail-sheet.tsx`

---

## Phase 3: Delete tRPC Infrastructure

### Files to Delete:
```
DELETE: app/api/trpc/[trpc]/route.ts
DELETE: server/api/trpc.ts
DELETE: server/api/root.ts
DELETE: server/api/routers/ (entire directory — 28 files + 3 subdirs)
DELETE: lib/trpc.ts
DELETE: trpc/ (entire directory — react.tsx, client.ts)
DELETE: lib/hooks/trpc-hooks.ts
DELETE: lib/hooks/trpc-keys.ts
DELETE: lib/hooks/hr-hooks.ts (rewrite as plain hooks or remove)
DELETE: lib/hooks/project-hooks.ts (rewrite or remove)
DELETE: lib/hooks/dashboard-hooks.ts (rewrite or remove)
DELETE: lib/hooks/rbac-hooks.ts (rewrite or remove)
DELETE: lib/hooks/reports-hooks.ts (rewrite or remove)
DELETE: lib/hooks/crm-hooks.ts (rewrite or remove)
DELETE: lib/hooks/auth-hooks.ts (rewrite or remove)
DELETE: lib/hooks/leads-hooks.ts (rewrite or remove)
DELETE: lib/hooks/targets-hooks.ts (rewrite or remove)
DELETE: lib/hooks/roles-hooks.ts (rewrite or remove)
DELETE: lib/hooks/chat-hooks.ts (rewrite or remove)
```

### Edit Root Layout:
```diff
- import { TRPCReactProvider } from "../trpc/react";
+ import { QueryProvider } from "../components/providers/query-provider";

- <TRPCReactProvider>{children}</TRPCReactProvider>
+ <QueryProvider>{children}</QueryProvider>
```

**Create** `components/providers/query-provider.tsx`:
```tsx
"use client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 2,
        gcTime: 1000 * 60 * 10,
        refetchOnWindowFocus: false,
        retry: 1,
      },
    },
  }));
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
```

### Uninstall tRPC Packages:
```bash
pnpm remove @trpc/client @trpc/react-query @trpc/server superjson
```

### Update types/api.ts:
Replace `RouterOutputs` with manually defined types from query return signatures, or use `Awaited<ReturnType<typeof queryFn>>` pattern.

---

## Phase 4: Verify

1. `pnpm build` — zero errors
2. `pnpm lint` — zero errors
3. Test every page in browser (login, navigate, CRUD operations)
4. Verify TanStack Query still works for chat/notifications
5. Verify Server Actions work for all mutations

---

## Checklist

- [ ] **DECISION**: Evaluate tRPC removal vs. tRPC+prefetch hybrid (user approval needed)
- [ ] Create `server/queries/` directory with domain query files
- [ ] Create `server/actions/` directory with domain action files (enhance existing)
- [ ] Migrate dashboard module (queries → server, mutations → actions)
- [ ] Migrate CRM module (leads, deals, contacts, organizations)
- [ ] Migrate HR module (employees, attendance, leaves, payroll, expenses)
- [ ] Migrate Projects module (tickets, sprints, epics, etc.)
- [ ] Migrate Chat module (keep TanStack Query for real-time)
- [ ] Migrate Notifications module (keep TanStack Query for polling)
- [ ] Migrate Settings module
- [ ] Migrate Billing module
- [ ] Migrate Support module
- [ ] Delete all tRPC router files
- [ ] Delete `trpc/` directory
- [ ] Delete `lib/hooks/trpc-hooks.ts`
- [ ] Uninstall `@trpc/client @trpc/react-query @trpc/server`
- [ ] Replace `RouterOutputs` types with direct function return types
- [ ] Update `QueryClientProvider` (remove tRPC wrapper)
- [ ] Verify every page renders correctly
- [ ] `pnpm build` passes with zero errors

## Acceptance Criteria

1. Zero tRPC imports remain anywhere in the codebase
2. `@trpc/*` packages removed from package.json
3. All pages render correctly (SSR for reads, client-side for mutations)
4. Server Actions handle all mutations with proper auth checks
5. TanStack Query handles real-time polling (chat, notifications)
6. Build passes with zero TypeScript errors
7. No regression in any feature functionality

## Testing Plan

1. After each module migration: test all CRUD operations for that module
2. Verify Server Components render on server (React DevTools)
3. Verify mutations work via Server Actions (form submissions, button actions)
4. Test chat real-time messaging still works (TanStack Query polling)
5. Test notification bell still updates (TanStack Query polling)
6. Full regression test: navigate every page, perform key operations
7. `pnpm build` and `pnpm lint` pass
8. Verify bundle size decreased (compare before/after)
