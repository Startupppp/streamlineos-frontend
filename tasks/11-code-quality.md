# Task 11: Code Quality, Refactoring & Best Practices

## Priority: HIGH | Effort: 4-5 days | Dependencies: None | Status: NOT STARTED

---

## PRD

### Problem Statement
The codebase has accumulated technical debt and violates several React/Next.js best practices:

1. **Large files** — Multiple files exceed 500+ lines, reducing readability and maintainability
2. **Unnecessary hooks** — `useEffect` for auth checks (should use middleware), redundant state
3. **Poor code reusability** — Functions repeated across files instead of centralized utilities
4. **Naming inconsistencies** — Files and functions don't follow consistent naming patterns
5. **Navigation anti-patterns** — `<a>` tags instead of Next.js `<Link>` component
6. **Layout violations** — Shell-like wrappers instead of proper Next.js layouts
7. **Dead code** — Unused variables, functions, imports, and components
8. **Type safety issues** — `as any[]`, `Record<string, unknown>`, loose typing
9. **Anonymous handlers** — Inline arrow functions instead of named handlers
10. **eslint-disable comments** — Suppressing errors instead of fixing them

### Goals
- **Max 500 lines per file** — Split large files into logical modules
- **Zero unnecessary hooks** — Remove redundant `useEffect`/`useState`, use middleware for auth
- **Centralized utilities** — Extract reusable functions to `lib/utils/`
- **Consistent naming** — `kebab-case` for files, `camelCase` for functions, `PascalCase` for components
- **Next.js patterns** — Use `<Link>`, proper layouts, Server Components, middleware
- **Zero dead code** — No unused variables, functions, imports, files
- **Zero comments** — Code should be self-documenting, no explanatory comments
- **Strict typing** — No `any`, proper interfaces, Zod schemas matching DB
- **Named handlers** — No inline anonymous functions in JSX
- **Zero suppressions** — Fix underlying issues, don't suppress eslint

### Non-Goals
- Rewriting business logic
- Changing database schema
- Adding new features

### Success Criteria
- No file exceeds 500 lines
- Zero `useEffect` for route protection (use middleware)
- All reusable logic extracted to utilities
- `pnpm lint` passes with zero warnings
- `pnpm build` passes with zero TypeScript errors

---

## Implementation Steps

### 11.1 Split Large Files (>500 lines)

**Files to split**:

| File | Lines | Action |
|------|-------|--------|
| `app/(dashboard)/chat/page.tsx` | 2000+ | Split into: `chat-sidebar.tsx`, `chat-messages.tsx`, `chat-input.tsx`, `chat-header.tsx`, `chat-dialogs.tsx` |
| `app/(dashboard)/crm/leads/page.tsx` | 1500+ | Split into: `leads-table.tsx`, `leads-filters.tsx`, `leads-dialogs.tsx`, `leads-kanban.tsx` |
| `app/(dashboard)/crm/deals/page.tsx` | 1200+ | Split into: `deals-table.tsx`, `deals-filters.tsx`, `deals-dialogs.tsx`, `deals-pipeline.tsx` |
| `app/(dashboard)/hr/employees/page.tsx` | 1000+ | Split into: `employees-table.tsx`, `employees-filters.tsx`, `employee-dialogs.tsx` |
| `app/(dashboard)/hr/leaves/page.tsx` | 900+ | Split into: `leaves-calendar.tsx`, `leaves-list.tsx`, `leave-request-dialog.tsx` |
| `app/(dashboard)/hr/expenses/page.tsx` | 800+ | Split into: `expenses-table.tsx`, `expense-filters.tsx`, `expense-dialogs.tsx` |
| `app/(dashboard)/projects/[id]/page.tsx` | 800+ | Split into: `project-header.tsx`, `project-board.tsx`, `project-dialogs.tsx` |
| `components/illustrations/index.tsx` | 50KB | Split each illustration into its own file |
| `server/api/routers/leads.ts` | 800+ | Split into: `leads-queries.ts`, `leads-mutations.ts` |
| `server/api/routers/hr/employee.ts` | 700+ | Split into: `employee-queries.ts`, `employee-mutations.ts` |

**Pattern for splitting page components**:

```
app/(dashboard)/crm/leads/
├── page.tsx           # Main page (under 200 lines) - composition only
├── _components/
│   ├── leads-table.tsx
│   ├── leads-filters.tsx
│   ├── leads-kanban.tsx
│   ├── lead-dialogs.tsx
│   └── index.ts       # Barrel export
└── _hooks/
    └── use-leads-filters.ts
```

---

### 11.2 Remove Unnecessary useEffect Hooks

**Anti-pattern to fix**:
```tsx
// BAD: Using useEffect for auth check
useEffect(() => {
  if (!session) {
    router.push('/signin');
  }
}, [session, router]);
```

**Fix**: Remove and use middleware (already implemented in `middleware.ts`)

**Files to audit for unnecessary useEffect**:
- All page components in `app/(dashboard)/`
- All client components checking session/auth

**Other useEffect removals**:
```tsx
// BAD: Derived state in useEffect
useEffect(() => {
  setFilteredData(data.filter(item => item.status === status));
}, [data, status]);

// GOOD: Compute directly
const filteredData = useMemo(() => 
  data.filter(item => item.status === status), 
  [data, status]
);
```

---

### 11.3 Replace `<a>` Tags with Next.js `<Link>`

**Search and replace**:
```tsx
// BAD
<a href="/dashboard">Dashboard</a>

// GOOD
<Link href="/dashboard">Dashboard</Link>
```

**Files to check**:
- All components in `components/`
- All pages in `app/`
- Email templates (keep `<a>` for emails only)

---

### 11.4 Use Proper Next.js Layouts Instead of Shell Wrappers

**Anti-pattern**:
```tsx
// BAD: Shell component wrapping content
export default function Page() {
  return (
    <DashboardShell>
      <PageContent />
    </DashboardShell>
  );
}
```

**Fix**: Use `layout.tsx` for shared shells:
```tsx
// app/(dashboard)/layout.tsx handles the shell
export default function Page() {
  return <PageContent />;
}
```

---

### 11.5 Extract Reusable Utility Functions

**Create `lib/utils/` with**:

| File | Purpose |
|------|---------|
| `lib/utils/format-date.ts` | Centralized date formatting with timezone support |
| `lib/utils/format-currency.ts` | Currency formatting with locale |
| `lib/utils/format-number.ts` | Number formatting (compact, percentage) |
| `lib/utils/debounce.ts` | Debounce utility |
| `lib/utils/throttle.ts` | Throttle utility |
| `lib/utils/file-size.ts` | Human-readable file sizes |
| `lib/utils/validation.ts` | Common validation functions |
| `lib/utils/array.ts` | Array utilities (groupBy, unique, chunk) |
| `lib/utils/string.ts` | String utilities (truncate, slugify, capitalize) |
| `lib/utils/export.ts` | Export to CSV/Excel utilities |

**Example extraction**:
```typescript
// lib/utils/format-date.ts
import { format, formatDistanceToNow, parseISO } from "date-fns";

export function formatDate(date: Date | string, pattern = "PPP"): string {
  const d = typeof date === "string" ? parseISO(date) : date;
  return format(d, pattern);
}

export function formatRelativeTime(date: Date | string): string {
  const d = typeof date === "string" ? parseISO(date) : date;
  return formatDistanceToNow(d, { addSuffix: true });
}

export function formatDateRange(start: Date, end: Date): string {
  return `${format(start, "MMM d")} - ${format(end, "MMM d, yyyy")}`;
}
```

---

### 11.6 Fix File & Function Naming

**File naming conventions**:
- Components: `kebab-case.tsx` (e.g., `lead-card.tsx`, `expense-dialog.tsx`)
- Hooks: `use-kebab-case.ts` (e.g., `use-debounce.ts`, `use-disclosure.ts`)
- Utilities: `kebab-case.ts` (e.g., `format-date.ts`, `cn.ts`)
- Types: `kebab-case.ts` (e.g., `api.ts`, `next-auth.d.ts`)
- Constants: `kebab-case.ts` (e.g., `roles.ts`, `pipeline.ts`)

**Function naming conventions**:
- Event handlers: `handle{Event}` (e.g., `handleClick`, `handleSubmit`)
- Callbacks: `on{Event}` for props (e.g., `onClick`, `onSubmit`)
- Getters: `get{Thing}` (e.g., `getUser`, `getLeadById`)
- Setters: `set{Thing}` (e.g., `setStatus`, `updateLead`)
- Booleans: `is{Condition}` / `has{Thing}` / `can{Action}` (e.g., `isLoading`, `hasAccess`, `canEdit`)
- Async: `{verb}{Noun}` (e.g., `fetchLeads`, `createUser`, `deleteExpense`)

**Files to rename**:
- `lib/db.ts` → `lib/db/client.ts` (for clarity)
- `lib/auth.ts` → split into `lib/auth/config.ts`, `lib/auth/helpers.ts`

---

### 11.7 Replace Anonymous Inline Handlers

**Anti-pattern**:
```tsx
// BAD: Anonymous inline handler
<Button onClick={() => handleDelete(item.id)}>Delete</Button>

// Also BAD: Complex inline logic
<Button onClick={() => {
  setLoading(true);
  handleDelete(item.id).finally(() => setLoading(false));
}}>
  Delete
</Button>
```

**Fix**: Named handler functions
```tsx
// GOOD: Named handler
const handleDeleteClick = useCallback(() => {
  handleDelete(item.id);
}, [item.id, handleDelete]);

<Button onClick={handleDeleteClick}>Delete</Button>
```

**For lists**: Use data attributes
```tsx
// GOOD: Data attribute pattern for lists
const handleItemClick = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
  const id = e.currentTarget.dataset.id;
  if (id) handleDelete(id);
}, [handleDelete]);

{items.map(item => (
  <Button key={item.id} data-id={item.id} onClick={handleItemClick}>
    Delete
  </Button>
))}
```

---

### 11.8 Remove Dead Code & Files

**Files to DELETE** (never imported):
- `components/shared/command-palette.tsx` (duplicate)
- `components/shared/empty-state.tsx` (duplicate)
- `components/shared/metric-card.tsx` (duplicate)
- `components/shared/page-header.tsx` (duplicate)
- `components/ai/assistant-bot.tsx`
- `components/ai/task-suggestions.tsx`
- `components/attendance/daily-log.tsx`
- `components/attendance/monthly-log.tsx`
- `components/crm/mini-bar-chart.tsx`
- `components/expenses/expense-filter-bar.tsx`
- `components/expenses/expense-pagination.tsx`
- `components/expenses/receipt-viewer.tsx`
- `components/hr/attendance-page-client.tsx`
- `components/hr/employee-profile-form.tsx`
- `components/hr/leave-request-form.tsx`
- `components/hr/salary-structure-form.tsx`
- `components/projects/epic-view.tsx`
- `components/projects/sprint-board.tsx`
- `components/projects/time-tracking.tsx`
- `components/shared/ai-sidebar.tsx`
- `components/shared/data-table.tsx`
- `components/shared/section-card.tsx`
- `components/shared/status-badge.tsx`
- `components/storage/file-viewer.tsx`
- `components/ui/leaves-skeleton.tsx`
- `components/ui/project-skeleton.tsx`
- `components/ui/section-header.tsx`

**Code patterns to remove**:
```typescript
const unusedVar = "never used";

import { Something } from "./module";

console.log("debug:", data);

// Any comment like this - DELETE
/* Block comments - DELETE */
/** JSDoc comments - DELETE (unless for public API) */
// TODO: something - DELETE
// FIXME: something - DELETE
// HACK: something - DELETE
```

**No comments policy**:
- Code should be self-documenting through clear naming
- If code needs a comment to explain, refactor to be clearer
- Exception: Complex algorithms or business logic that cannot be simplified

---

### 11.9 Fix Type Safety Issues

**Replace `as any[]`** (9 instances):
```typescript
// BAD
const data = result as any[];

// GOOD
type LeadRow = InferSelectModel<typeof leads>;
const data: LeadRow[] = result;
```

**Replace `Record<string, unknown>`**:
```typescript
// BAD
metadata: Record<string, unknown>;

// GOOD
interface NotificationMetadata {
  entityId?: string;
  entityType?: "lead" | "deal" | "ticket";
  actionUrl?: string;
}
metadata: NotificationMetadata;
```

**Use strict role types**:
```typescript
// BAD
role: string;

// GOOD
import { Role } from "@/lib/constants/roles";
role: Role;
```

---

### 11.10 Fix eslint-disable Comments

**Files with suppressions to fix**:
1. `server/api/routers/leads.ts` — will be deleted in tRPC removal
2. `components/crm/lead-export-dialog.tsx` — fix type issues
3. `app/(dashboard)/settings/branches/page.tsx` — fix type issues
4. `app/(dashboard)/hr/incentives/page.tsx` — fix type issues
5. `app/(dashboard)/digital-marketing/social/page.tsx` — fix type issues
6. `app/(dashboard)/digital-marketing/leads/page.tsx` — fix type issues
7. `app/(dashboard)/digital-marketing/campaigns/page.tsx` — fix type issues
8. `app/(dashboard)/crm/leads/distribute/page.tsx` — fix type issues
9. `app/(dashboard)/crm/clients/page.tsx` — fix type issues
10. `app/(dashboard)/crm/clients/[id]/page.tsx` — fix type issues
11. `app/(dashboard)/chat/page.tsx` — fix type issues

---

### 11.11 Server Components vs Client Components

**Principle**: Default to Server Components, only use `"use client"` when necessary

**When to use `"use client"`**:
- useState, useEffect, useContext hooks
- Browser-only APIs (window, document)
- Event handlers (onClick, onChange)
- Third-party client libraries

**Pattern for mixed components**:
```tsx
// page.tsx (Server Component - data fetching)
export default async function LeadsPage() {
  const leads = await getLeads(); // Server-side fetch
  return <LeadsClient initialLeads={leads} />;
}

// leads-client.tsx (Client Component - interactivity)
"use client";
export function LeadsClient({ initialLeads }: Props) {
  const [leads, setLeads] = useState(initialLeads);
  // Client-side interactivity
}
```

---

### 11.12 Proper Error Boundaries & Loading States

**Every route should have**:
```
app/(dashboard)/crm/leads/
├── page.tsx
├── loading.tsx    # Skeleton UI
├── error.tsx      # Error boundary
└── not-found.tsx  # 404 state (if dynamic route)
```

---

### 11.13 Centralize Constants

**Already created**: `lib/constants/pipeline.ts`

**Additional constants to centralize**:

```typescript
// lib/constants/status.ts
export const EXPENSE_STATUS = ["pending", "approved", "rejected", "reimbursed"] as const;
export const LEAVE_STATUS = ["PENDING", "APPROVED", "REJECTED"] as const;
export const TICKET_STATUS = ["backlog", "todo", "in_progress", "in_review", "done", "cancelled"] as const;

// lib/constants/colors.ts
export const STATUS_COLORS = {
  success: "hsl(142, 71%, 45%)",
  warning: "hsl(38, 92%, 50%)",
  error: "hsl(0, 84%, 60%)",
  info: "hsl(217, 91%, 60%)",
} as const;
```

---

## Checklist

### File Size & Organization
- [ ] Split all files over 500 lines
- [ ] Create `_components/` folders for page-specific components
- [ ] Create `_hooks/` folders for page-specific hooks
- [ ] Split `components/illustrations/index.tsx` into individual files

### React Best Practices
- [ ] Remove unnecessary `useEffect` hooks (auth checks, derived state)
- [ ] Replace `useMemo`/`useCallback` anti-patterns
- [ ] Use `memo()` only where profiling shows benefit
- [ ] Replace anonymous inline handlers with named functions
- [ ] Add proper `key` props to all list renders

### Next.js Best Practices
- [ ] Replace all `<a>` tags with `<Link>` (except email templates)
- [ ] Use layouts instead of shell wrapper components
- [ ] Maximize Server Components, minimize `"use client"`
- [ ] Add `loading.tsx` to all route segments
- [ ] Add `error.tsx` to all route segments
- [ ] Use middleware for auth, not client-side redirects

### Code Reusability
- [ ] Extract date formatting to `lib/utils/format-date.ts`
- [ ] Extract currency formatting to `lib/utils/format-currency.ts`
- [ ] Extract array utilities to `lib/utils/array.ts`
- [ ] Extract string utilities to `lib/utils/string.ts`
- [ ] Centralize all constants in `lib/constants/`

### Naming Conventions
- [ ] Rename files to kebab-case
- [ ] Rename functions to follow conventions
- [ ] Use consistent handler naming (handle*, on*)

### Dead Code Removal
- [ ] Delete 26+ orphan component files
- [ ] Remove unused imports in all files
- [ ] Remove unused variables
- [ ] Remove ALL comments (code should be self-documenting)
- [ ] Remove commented code blocks
- [ ] Remove console.log statements
- [ ] Remove TODO/FIXME/HACK comments

### Type Safety
- [ ] Fix all `as any[]` assertions (9 instances)
- [ ] Replace `Record<string, unknown>` with specific interfaces
- [ ] Use `Role` type everywhere instead of `string`
- [ ] Verify Zod schemas match DB schema

### Lint & Build
- [ ] Fix all `eslint-disable` comments (11 files)
- [ ] Run `pnpm lint --fix`
- [ ] `pnpm build` passes with zero errors
- [ ] `pnpm lint` passes with zero warnings

---

## Acceptance Criteria

1. **No file exceeds 500 lines** (excluding auto-generated)
2. **Zero `useEffect` for auth checks** — middleware handles it
3. **Zero `<a>` tags** — all use `<Link>` (except emails)
4. **Zero anonymous inline handlers** — all named
5. **Zero `eslint-disable` comments**
6. **Zero `as any` type assertions**
7. **Zero unused code** — imports, variables, files
8. **Zero comments** — no inline comments, no block comments, no TODOs
9. **All utilities centralized** — no repeated logic
10. **Consistent naming** — files, functions, variables
11. `pnpm build` and `pnpm lint` pass with zero warnings

---

## Testing Plan

1. After each file split, verify page still renders
2. After removing useEffect, verify auth still works
3. After replacing `<a>` with `<Link>`, verify navigation works
4. Run `pnpm lint` after every batch of changes
5. Run `pnpm build` after completing each major section
6. Manual test all affected pages
7. Verify no console errors in browser
8. Search for remaining comments: `grep -r "// " --include="*.tsx" --include="*.ts" | grep -v node_modules`
9. Search for TODO/FIXME: `grep -rE "TODO|FIXME|HACK" --include="*.tsx" --include="*.ts"`

---

## File Size Reference Commands

```bash
# Find files over 500 lines
find . -name "*.tsx" -o -name "*.ts" | xargs wc -l | awk '$1 > 500' | sort -rn

# Find largest files
find . -name "*.tsx" -o -name "*.ts" | xargs wc -l | sort -rn | head -20

# Count lines in specific directory
find app -name "*.tsx" | xargs wc -l | sort -rn | head -20
```
