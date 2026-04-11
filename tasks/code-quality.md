# Task 11: Code Quality, Refactoring & Best Practices

## Priority: HIGH | Effort: 4-5 days | Dependencies: None | Status: IN PROGRESS

---

## PRD

### Problem Statement
The codebase violates React/Next.js best practices and has accumulated technical debt that impacts performance, maintainability, and developer experience.

### Goals
- **Max 500 lines per file** — Split large files into logical modules
- **Zero unnecessary hooks** — Remove redundant `useEffect`/`useState`
- **Zero comments** — Code should be self-documenting
- **Strict typing** — No `any`, proper interfaces
- **Next.js patterns** — Use all Next.js features correctly
- **React best practices** — Follow all React conventions

### Success Criteria
- No file exceeds 500 lines
- `pnpm lint` passes with zero warnings
- `pnpm build` passes with zero TypeScript errors
- All rules below are followed

---

## NEXT.JS RULES (Must Follow)

### Rule 1: Use `<Link>` Instead of `<a>` for Internal Navigation

```tsx
// ❌ BAD - Uses native anchor tag
<a href="/dashboard">Go to Dashboard</a>
<a href="/crm/leads">View Leads</a>
<a href={`/users/${user.id}`}>View Profile</a>

// ✅ GOOD - Uses Next.js Link component
import Link from "next/link";

<Link href="/dashboard">Go to Dashboard</Link>
<Link href="/crm/leads">View Leads</Link>
<Link href={`/users/${user.id}`}>View Profile</Link>

// ✅ GOOD - Link with custom styling
<Link href="/dashboard" className="text-blue-500 hover:underline">
  Dashboard
</Link>

// ✅ GOOD - Link wrapping a button
<Link href="/create">
  <Button>Create New</Button>
</Link>

// ⚠️ EXCEPTION - Keep <a> for external links and email templates
<a href="https://external-site.com" target="_blank" rel="noopener noreferrer">
  External Link
</a>
```

**Why**: `<Link>` enables client-side navigation, prefetching, and faster page transitions.

---

### Rule 2: Use `layout.tsx` Instead of Shell/Wrapper Components

```tsx
// ❌ BAD - Shell wrapper component in page
export default function DashboardPage() {
  return (
    <DashboardShell>
      <Sidebar />
      <main>
        <Header />
        <PageContent />
      </main>
    </DashboardShell>
  );
}

// ❌ BAD - Repeating layout structure in every page
export default function LeadsPage() {
  return (
    <div className="flex">
      <Sidebar />
      <div className="flex-1">
        <Header />
        <LeadsContent />
      </div>
    </div>
  );
}

// ✅ GOOD - Use layout.tsx for shared structure
// app/(dashboard)/layout.tsx
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex">
      <Sidebar />
      <div className="flex-1">
        <Header />
        <main>{children}</main>
      </div>
    </div>
  );
}

// app/(dashboard)/leads/page.tsx - Clean, focused page
export default function LeadsPage() {
  return <LeadsContent />;
}
```

**Why**: Layouts persist across navigation, preserve state, and avoid unnecessary re-renders.

---

### Rule 3: Use Middleware for Auth, NOT useEffect

```tsx
// ❌ BAD - Client-side auth redirect with useEffect
"use client";
export default function ProtectedPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/signin");
    }
  }, [status, router]);

  if (status === "loading") return <Loading />;
  if (!session) return null;

  return <PageContent />;
}

// ❌ BAD - Conditional rendering based on session
"use client";
export default function Dashboard() {
  const { data: session } = useSession();

  if (!session) {
    return <Redirect to="/signin" />;
  }

  return <DashboardContent />;
}

// ✅ GOOD - Middleware handles auth (already implemented in middleware.ts)
// middleware.ts
export default function middleware(req: NextRequest) {
  const token = await getToken({ req });
  if (!token && isProtectedRoute(req.nextUrl.pathname)) {
    return NextResponse.redirect(new URL("/signin", req.url));
  }
  return NextResponse.next();
}

// page.tsx - No auth check needed, middleware already handled it
export default function ProtectedPage() {
  return <PageContent />;
}

// For server components - use auth() directly
export default async function DashboardPage() {
  const session = await auth();
  return <DashboardContent user={session.user} />;
}
```

**Why**: Middleware runs before the page loads, preventing flash of unauthenticated content.

---

### Rule 4: Server Components by Default

```tsx
// ❌ BAD - Unnecessary "use client" on data-fetching page
"use client";
export default function LeadsPage() {
  const { data } = useQuery(...);
  return <LeadsList leads={data} />;
}

// ✅ GOOD - Server Component for data fetching
export default async function LeadsPage() {
  const leads = await getLeads();
  return <LeadsClient initialLeads={leads} />;
}

// ✅ GOOD - Only client component for interactivity
"use client";
export function LeadsClient({ initialLeads }: Props) {
  const [leads, setLeads] = useState(initialLeads);
  return <LeadsList leads={leads} />;
}
```

**When to use `"use client"`**:
- `useState`, `useEffect`, `useContext`, `useReducer`
- Event handlers (`onClick`, `onChange`, `onSubmit`)
- Browser APIs (`window`, `document`, `localStorage`)
- Third-party client libraries (charts, drag-and-drop)

---

### Rule 5: Use Next.js Image Instead of `<img>`

```tsx
// ❌ BAD - Native img tag
<img src="/logo.png" alt="Logo" width="100" height="100" />
<img src={user.avatar} alt={user.name} className="rounded-full" />

// ✅ GOOD - Next.js Image component
import Image from "next/image";

<Image src="/logo.png" alt="Logo" width={100} height={100} />
<Image 
  src={user.avatar || "/default-avatar.png"} 
  alt={user.name}
  width={40}
  height={40}
  className="rounded-full"
/>

// ✅ GOOD - Fill mode for responsive images
<div className="relative h-48 w-full">
  <Image src="/hero.jpg" alt="Hero" fill className="object-cover" />
</div>
```

**Why**: Automatic optimization, lazy loading, and responsive images.

---

### Rule 6: Every Route Must Have loading.tsx and error.tsx

```
app/(dashboard)/crm/leads/
├── page.tsx       # Page content
├── loading.tsx    # Skeleton UI while loading
├── error.tsx      # Error boundary
└── not-found.tsx  # 404 state (for dynamic routes)
```

```tsx
// loading.tsx
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-4 p-6">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-[400px] w-full" />
    </div>
  );
}

// error.tsx
"use client";

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center p-6">
      <h2>Something went wrong</h2>
      <Button onClick={reset}>Try again</Button>
    </div>
  );
}
```

---

### Rule 7: Use Server Actions for Mutations

```tsx
// ❌ BAD - Client-side fetch for mutations
"use client";
async function handleSubmit(data: FormData) {
  await fetch("/api/leads", { method: "POST", body: data });
}

// ✅ GOOD - Server Action
// actions.ts
"use server";
export async function createLead(formData: FormData) {
  const data = Object.fromEntries(formData);
  await db.insert(leads).values(data);
  revalidatePath("/crm/leads");
}

// page.tsx
import { createLead } from "./actions";

export default function CreateLeadPage() {
  return (
    <form action={createLead}>
      <input name="name" />
      <button type="submit">Create</button>
    </form>
  );
}
```

---

### Rule 8: Use Route Handlers for API, Not Pages

```tsx
// ❌ BAD - API logic in page component
export default function ApiPage() {
  // This is wrong
}

// ✅ GOOD - Route handler in app/api/
// app/api/leads/route.ts
export async function GET(request: Request) {
  const leads = await getLeads();
  return Response.json(leads);
}

export async function POST(request: Request) {
  const body = await request.json();
  const lead = await createLead(body);
  return Response.json(lead);
}
```

---

## REACT RULES (Must Follow)

### Rule 9: No Unnecessary useEffect

```tsx
// ❌ BAD - useEffect for derived state
const [filteredItems, setFilteredItems] = useState([]);

useEffect(() => {
  setFilteredItems(items.filter(item => item.status === status));
}, [items, status]);

// ✅ GOOD - Compute directly or use useMemo
const filteredItems = useMemo(
  () => items.filter(item => item.status === status),
  [items, status]
);

// ❌ BAD - useEffect for formatting
useEffect(() => {
  setFormattedDate(format(date, "PPP"));
}, [date]);

// ✅ GOOD - Compute directly
const formattedDate = format(date, "PPP");

// ❌ BAD - useEffect for initial data transformation
useEffect(() => {
  if (data) {
    setProcessedData(transformData(data));
  }
}, [data]);

// ✅ GOOD - Transform during render or in useMemo
const processedData = useMemo(() => data ? transformData(data) : null, [data]);
```

---

### Rule 10: No Anonymous Inline Handlers

```tsx
// ❌ BAD - Anonymous inline handler
<Button onClick={() => handleDelete(item.id)}>Delete</Button>

// ❌ BAD - Complex inline logic
<Button onClick={() => {
  setLoading(true);
  deleteItem(item.id).finally(() => setLoading(false));
}}>
  Delete
</Button>

// ✅ GOOD - Named handler with useCallback
const handleDeleteClick = useCallback(() => {
  handleDelete(item.id);
}, [item.id]);

<Button onClick={handleDeleteClick}>Delete</Button>

// ✅ GOOD - For lists, use data attributes
const handleItemDelete = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
  const id = e.currentTarget.dataset.id;
  if (id) deleteItem(id);
}, [deleteItem]);

{items.map(item => (
  <Button key={item.id} data-id={item.id} onClick={handleItemDelete}>
    Delete
  </Button>
))}
```

---

### Rule 11: Proper Key Props in Lists

```tsx
// ❌ BAD - Using index as key
{items.map((item, index) => (
  <ListItem key={index} item={item} />
))}

// ❌ BAD - Missing key
{items.map(item => (
  <ListItem item={item} />
))}

// ✅ GOOD - Unique identifier as key
{items.map(item => (
  <ListItem key={item.id} item={item} />
))}

// ✅ GOOD - Composite key when needed
{items.map(item => (
  <ListItem key={`${item.type}-${item.id}`} item={item} />
))}
```

---

### Rule 12: No Prop Drilling (3+ Levels)

```tsx
// ❌ BAD - Prop drilling through multiple levels
<Parent user={user}>
  <Child user={user}>
    <GrandChild user={user}>
      <GreatGrandChild user={user} />
    </GrandChild>
  </Child>
</Parent>

// ✅ GOOD - Use Context for deeply shared state
const UserContext = createContext<User | null>(null);

function Parent({ user }: { user: User }) {
  return (
    <UserContext.Provider value={user}>
      <Child />
    </UserContext.Provider>
  );
}

function GreatGrandChild() {
  const user = useContext(UserContext);
  return <div>{user?.name}</div>;
}

// ✅ GOOD - Use composition pattern
<Parent>
  <Child>
    <GrandChild>
      <UserDisplay user={user} />
    </GrandChild>
  </Child>
</Parent>
```

---

## STATE MANAGEMENT RULES

### Rule 13: Remove Zustand (Unused)

```bash
# Zustand is installed but NEVER used in codebase - DELETE
pnpm remove zustand
```

**Use instead**:
- React Query for server state
- React Context for shared UI state
- URL state for filters/pagination
- Local state for component-specific state

---

### Rule 14: Use URL State for Filters/Pagination

```tsx
// ❌ BAD - useState for filters (lost on refresh)
const [status, setStatus] = useState("all");
const [page, setPage] = useState(1);

// ✅ GOOD - URL state with searchParams
import { useSearchParams, useRouter } from "next/navigation";

function LeadsFilters() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const status = searchParams.get("status") || "all";
  const page = parseInt(searchParams.get("page") || "1");

  function updateFilters(key: string, value: string) {
    const params = new URLSearchParams(searchParams);
    params.set(key, value);
    router.push(`?${params.toString()}`);
  }

  return (
    <Select value={status} onValueChange={(v) => updateFilters("status", v)}>
      ...
    </Select>
  );
}
```

---

### Rule 15: Use localStorage/sessionStorage Correctly

```tsx
// ❌ BAD - Direct access (crashes on server)
const theme = localStorage.getItem("theme");

// ❌ BAD - useEffect just to read storage
useEffect(() => {
  setTheme(localStorage.getItem("theme"));
}, []);

// ✅ GOOD - Safe storage access with hook
function useLocalStorage<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(() => {
    if (typeof window === "undefined") return initialValue;
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : initialValue;
  });

  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);

  return [value, setValue] as const;
}

// ✅ GOOD - Use existing next-themes for theme
import { useTheme } from "next-themes";
const { theme, setTheme } = useTheme();
```

---

## CODE ORGANIZATION RULES

### Rule 16: Max 500 Lines Per File

**Files to split**:

| File | Lines | Split Into |
|------|-------|------------|
| `chat/page.tsx` | 2000+ | `chat-sidebar.tsx`, `chat-messages.tsx`, `chat-input.tsx`, `chat-header.tsx` |
| `crm/leads/page.tsx` | 1500+ | `leads-table.tsx`, `leads-filters.tsx`, `leads-kanban.tsx`, `lead-dialogs.tsx` |
| `crm/deals/page.tsx` | 1200+ | `deals-table.tsx`, `deals-filters.tsx`, `deals-pipeline.tsx` |
| `hr/employees/page.tsx` | 1000+ | `employees-table.tsx`, `employees-filters.tsx`, `employee-dialogs.tsx` |
| `illustrations/index.tsx` | 50KB | Individual files per illustration |

**Pattern**:
```
app/(dashboard)/crm/leads/
├── page.tsx              # Under 200 lines - composition only
├── _components/
│   ├── leads-table.tsx
│   ├── leads-filters.tsx
│   ├── leads-kanban.tsx
│   └── index.ts
└── _hooks/
    └── use-leads-filters.ts
```

---

### Rule 17: Consistent File Naming

| Type | Convention | Example |
|------|------------|---------|
| Components | `kebab-case.tsx` | `lead-card.tsx`, `expense-dialog.tsx` |
| Hooks | `use-kebab-case.ts` | `use-debounce.ts`, `use-disclosure.ts` |
| Utilities | `kebab-case.ts` | `format-date.ts`, `cn.ts` |
| Constants | `kebab-case.ts` | `roles.ts`, `pipeline.ts` |
| Types | `kebab-case.ts` | `api.ts`, `next-auth.d.ts` |

---

### Rule 18: Consistent Function Naming

| Type | Convention | Example |
|------|------------|---------|
| Event handlers | `handle{Event}` | `handleClick`, `handleSubmit`, `handleDelete` |
| Callback props | `on{Event}` | `onClick`, `onSubmit`, `onChange` |
| Getters | `get{Thing}` | `getUser`, `getLeadById`, `getSession` |
| Async fetchers | `fetch{Thing}` | `fetchLeads`, `fetchUser` |
| Mutations | `{verb}{Noun}` | `createLead`, `updateUser`, `deleteExpense` |
| Booleans | `is/has/can/should` | `isLoading`, `hasAccess`, `canEdit`, `shouldRefetch` |

---

### Rule 19: Extract Reusable Utilities

**Create centralized utilities**:

```typescript
// lib/utils/format-date.ts
export function formatDate(date: Date | string, pattern = "PPP"): string
export function formatRelativeTime(date: Date | string): string
export function formatDateRange(start: Date, end: Date): string

// lib/utils/format-currency.ts
export function formatCurrency(amount: number, currency = "INR"): string
export function formatCompactNumber(num: number): string

// lib/utils/array.ts
export function groupBy<T>(arr: T[], key: keyof T): Record<string, T[]>
export function unique<T>(arr: T[]): T[]
export function chunk<T>(arr: T[], size: number): T[][]

// lib/utils/string.ts
export function truncate(str: string, length: number): string
export function slugify(str: string): string
export function capitalize(str: string): string
```

---

## CLEANUP RULES

### Rule 20: No Comments

```typescript
// ❌ BAD - Any comments
// This function fetches leads
function fetchLeads() { ... }

/* Set the user state */
setUser(data);

// TODO: Fix this later
// FIXME: This is a hack
// HACK: Temporary solution

// ✅ GOOD - Self-documenting code (no comments needed)
function fetchLeadsForOrganization(orgId: string) { ... }

// Code should be clear from naming alone
const activeLeads = leads.filter(lead => lead.status === "ACTIVE");
```

**Exception**: Complex algorithms that cannot be simplified

---

### Rule 21: No Dead Code

```typescript
// ❌ BAD - Remove all of these
const unusedVariable = "never used";
import { UnusedComponent } from "./unused";
// const oldCode = something;
console.log("debug:", data);

function neverCalledFunction() { ... }
```

---

### Rule 22: No Type Assertions

```typescript
// ❌ BAD
const data = result as any[];
const user = response as User;

// ✅ GOOD - Proper typing
type LeadRow = InferSelectModel<typeof leads>;
const data: LeadRow[] = result;

// ✅ GOOD - Type guards
function isUser(obj: unknown): obj is User {
  return typeof obj === "object" && obj !== null && "id" in obj;
}
```

---

### Rule 23: No eslint-disable Comments

```typescript
// ❌ BAD - Never suppress errors
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const data: any = result;

/* eslint-disable */
// Bad code here
/* eslint-enable */

// ✅ GOOD - Fix the underlying issue
const data: LeadData[] = result;
```

---

## FILES TO DELETE

**Orphan components** (never imported):
- `components/shared/command-palette.tsx`
- `components/shared/empty-state.tsx`
- `components/shared/metric-card.tsx`
- `components/shared/page-header.tsx`
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

---

## CHECKLIST

### Next.js
- [ ] Replace all `<a>` tags with `<Link>` (except external/email) — not audited yet
- [ ] Replace all `<img>` tags with `<Image>` — not audited yet
- [x] Use `layout.tsx` instead of shell wrappers — App Router layout in place; `app/(dashboard)/layout.tsx` is a Server Component
- [x] Remove all auth-related `useEffect` (middleware handles it) — middleware.ts guards all protected routes
- [x] Add `loading.tsx` to all routes — comprehensive coverage across all 90+ dashboard routes
- [x] Add `error.tsx` to all routes — comprehensive coverage across all 90+ dashboard routes (using `RouteErrorBoundary`)
- [ ] Use Server Components by default — partially done; many pages still use `"use client"` unnecessarily
- [ ] Use Server Actions for mutations — not systematically adopted; most mutations go through Axios + TanStack Query

### React
- [ ] Remove unnecessary `useEffect` hooks — partially done; some cleanup done but not fully audited
- [x] Replace anonymous inline handlers with named functions — done for leads/deals pages; `useCallback` pattern adopted
- [ ] Add proper `key` props to all lists — not audited
- [ ] Fix prop drilling with Context or composition — not audited
- [x] Remove Zustand dependency (unused) — Zustand not present in `package.json`
- [x] Use URL state for filters/pagination — `hooks/use-leads-filters.ts` + HR page use `useSearchParams`

### Code Organization
- [x] Split all files over 500 lines — landing page split, 10+ page/component files moved to `_components/`; hook files split into `lib/api/hooks/projects/` and `lib/api/hooks/hr/` subdirs
- [ ] Follow naming conventions (files, functions) — partially done; dynamic routes use descriptive names (e.g. `[projectId]`)
- [ ] Extract reusable utilities to `lib/utils/` — not done; utilities still scattered
- [ ] Centralize constants in `lib/constants/` — not done

### Cleanup
- [ ] Remove ALL comments — not systematically done
- [ ] Remove dead code and unused files — partially done; orphan list in this file not yet cleared
- [x] Fix all `as any` type assertions — 2 `as any` casts fixed per prior refactor; `AuthSession.orgId: string` narrowed
- [ ] Fix all `eslint-disable` comments — 2 remaining (`app/api/webhooks/route.ts`, `app/api/clients/opportunities/route.ts`)
- [x] Remove `console.log` statements — 0 `console.log` found in `app/(dashboard)/`

### Verification
- [x] `pnpm build` passes — ✅ as of 2026-04-05
- [ ] `pnpm lint` passes with zero warnings — not verified after recent changes
- [ ] All pages render correctly — not fully verified
- [ ] No console errors in browser — not verified

---

## ACCEPTANCE CRITERIA

1. **No file exceeds 500 lines**
2. **Zero `<a>` tags** for internal navigation
3. **Zero `<img>` tags** (use Next.js Image)
4. **Zero shell wrapper components** (use layouts)
5. **Zero `useEffect` for auth/session checks**
6. **Zero anonymous inline handlers**
7. **Zero comments** (except complex algorithms)
8. **Zero dead code**
9. **Zero `as any` assertions**
10. **Zero `eslint-disable` comments**
11. **Zero `console.log` statements**
12. `pnpm build` and `pnpm lint` pass with zero warnings
