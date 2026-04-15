# 🧠 MASTER REFACTOR PROMPT v2.0
### Next.js 16 App Router · React 19 · TypeScript Strict · Drizzle ORM · NeonDB (PostgreSQL) · Upstash Redis · shadcn/ui · TanStack Query · Axios

---

## 🔴 PRIME DIRECTIVE

You are simultaneously a **Senior Full-Stack Engineer**, **Prompt Engineer**, and **Product Manager**. Perform a **complete, zero-compromise refactor** of this entire repository — UI/UX, component architecture, API layer, caching, database queries, security, and file structure — **without missing a single file, line, route, or component**.

**Ask clarifying questions before implementing anything ambiguous.** Never assume. Never guess.

---

## 📋 PHASE 0 — MEMORY BOOTSTRAP & FULL REPO AUDIT

### 0.1 — Session Memory
- Check if `REFACTOR_MEMORY.md` exists at repo root
- If **exists** → read fully, resume from last `[PENDING]` item, never redo `[DONE]` items
- If **missing** → create it after completing the audit in step 0.2
- Update after **every completed file or task** — mark `[DONE]` with timestamp
- Structure:

```md
# Refactor Memory
## Last Session: <ISO timestamp>
## Overall Status: IN_PROGRESS | DONE
## Architecture: Next.js 16 App Router | Drizzle ORM | NeonDB | Upstash Redis | Axios | TanStack Query
## Phases:
### PHASE 0: [DONE]
### PHASE 1: [IN_PROGRESS]
  - [ ] components/ui/button.tsx
  - [DONE 2024-01-15T10:30Z] components/ui/card.tsx
### PHASE 2: [PENDING]
...
## Skipped Files (no changes needed):
## Blockers / Questions:
```

### 0.2 — Full Repo Scan Order (Token-Efficient)
Scan in this exact order, reading only what is needed per step:

```
1. package.json                          → versions, scripts, all dependencies
2. tsconfig.json                         → paths, aliases (@/ mappings)
3. next.config.ts                        → headers, CSP, rewrites, env exposure
4. tailwind.config.*                     → theme extensions, plugins
5. middleware.ts                         → auth guards, RBAC rules, rate limit config
6. app/layout.tsx + app/(dashboard)/layout.tsx → root providers, theme forcing
7. lib/db.ts + lib/db/schema/*           → all Drizzle schemas, relations, indexes
8. lib/upstash* or lib/redis*            → existing Upstash client setup
9. lib/api/hooks/**                      → all existing TanStack Query hooks
10. lib/axios* or lib/api/client*        → existing Axios instance (if any)
11. server/queries/**                    → all read query modules
12. server/actions/**                    → all write/mutation actions
13. app/api/**/route.ts                  → every API route handler
14. app/(dashboard)/**/page.tsx          → every dashboard page
15. features/**                          → all feature components
16. components/**                        → all shared/ui components
17. _components/** (if exists)           → flagged for migration
18. types/**                             → shared TypeScript types
```

### 0.3 — Generate Master TODO List
After scan, produce a structured TODO list saved to `REFACTOR_MEMORY.md`. Group by phase. Include every file path explicitly. Example:

```
PHASE 3 — Shared Components:
  [ ] CREATE components/shared/DataTable.tsx
  [ ] CREATE components/shared/AppSheet.tsx
  [ ] CREATE components/shared/AppDialog.tsx
  [ ] CREATE components/shared/PageWrapper.tsx
  [ ] CREATE components/shared/CardGrid.tsx
  [ ] CREATE components/shared/ConfirmDialog.tsx
  [ ] CREATE components/shared/states/EmptyState.tsx
  [ ] CREATE components/shared/states/LoadingState.tsx
  [ ] CREATE components/shared/states/ErrorState.tsx

PHASE 4 — Pages (example):
  [ ] REFACTOR app/(dashboard)/crm/leads/page.tsx
  [ ] REFACTOR features/crm/leads/LeadsTable.tsx
  ...
```

**Do not start any implementation until this list is 100% complete and saved.**

---

## ⚙️ PHASE 1 — Infrastructure & Axios Setup

### 1.1 — Axios Client (Single Source of Truth)
Create or fully replace the Axios instance at `lib/api/client.ts`:

```typescript
// lib/api/client.ts
import axios, { AxiosError } from 'axios'

const apiClient = axios.create({
  baseURL: '/api',
  timeout: 30_000,
  headers: { 'Content-Type': 'application/json' },
})

// Request interceptor: attach auth headers if needed (NextAuth session token)
apiClient.interceptors.request.use((config) => {
  // attach CSRF or custom headers here if required
  return config
})

// Response interceptor: normalize errors
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiErrorResponse>) => {
    const message =
      error.response?.data?.message ||
      error.response?.data?.error ||
      error.response?.data?.errors?.[0]?.message ||
      error.message ||
      'An unexpected error occurred'
    const status = error.response?.status ?? 500
    return Promise.reject(new ApiError(message, status, error.response?.data))
  }
)

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly data?: unknown
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export type ApiErrorResponse = {
  message?: string
  error?: string
  errors?: Array<{ message: string; field?: string }>
}

export { apiClient }
```

Rules:
- **Every API call in the entire repo** must use this `apiClient` instance — no raw `fetch`, no separate `axios.create()`, no `axios.get()` directly
- Error messages must always be extracted via the interceptor — no manual `error.response.data` parsing in components
- All TanStack Query `queryFn` and `mutationFn` must use `apiClient`

### 1.2 — Consistent API Response Shape
Every API route handler must return this shape:

```typescript
// lib/api/response.ts
import { NextResponse } from 'next/server'

export type ApiResponse<T = unknown> = {
  success: boolean
  data?: T
  message: string
  errors?: Array<{ field?: string; message: string }>
  meta?: {
    page?: number
    limit?: number
    total?: number
    totalPages?: number
  }
}

export const ok = <T>(data: T, message = 'Success', meta?: ApiResponse['meta']) =>
  NextResponse.json<ApiResponse<T>>({ success: true, data, message, meta }, { status: 200 })

export const created = <T>(data: T, message = 'Created successfully') =>
  NextResponse.json<ApiResponse<T>>({ success: true, data, message }, { status: 201 })

export const badRequest = (message: string, errors?: ApiResponse['errors']) =>
  NextResponse.json<ApiResponse>({ success: false, message, errors }, { status: 400 })

export const unauthorized = (message = 'Unauthorized') =>
  NextResponse.json<ApiResponse>({ success: false, message }, { status: 401 })

export const forbidden = (message = 'Forbidden') =>
  NextResponse.json<ApiResponse>({ success: false, message }, { status: 403 })

export const notFound = (message = 'Not found') =>
  NextResponse.json<ApiResponse>({ success: false, message }, { status: 404 })

export const conflict = (message: string) =>
  NextResponse.json<ApiResponse>({ success: false, message }, { status: 409 })

export const serverError = (message = 'Internal server error') =>
  NextResponse.json<ApiResponse>({ success: false, message }, { status: 500 })
```

### 1.3 — Upstash Redis Cache Layer
Since you use `@upstash/redis` already (for rate limiting), extend it for caching:

```typescript
// lib/redis/cache.ts
import { Redis } from '@upstash/redis'

const redis = Redis.fromEnv() // uses UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN

export async function withCache<T>(
  key: string,
  ttlSeconds: number,
  fetcher: () => Promise<T>
): Promise<T> {
  try {
    const cached = await redis.get<T>(key)
    if (cached !== null) return cached
  } catch {
    // Redis unavailable — fallback to DB, log warning
    console.warn(`[Cache] Redis unavailable for key: ${key}`)
  }
  const fresh = await fetcher()
  try {
    await redis.setex(key, ttlSeconds, fresh)
  } catch {
    console.warn(`[Cache] Failed to set key: ${key}`)
  }
  return fresh
}

export async function invalidatePattern(pattern: string): Promise<void> {
  try {
    let cursor = 0
    do {
      const [nextCursor, keys] = await redis.scan(cursor, { match: pattern, count: 100 })
      cursor = Number(nextCursor)
      if (keys.length > 0) await redis.del(...keys)
    } while (cursor !== 0)
  } catch {
    console.warn(`[Cache] Failed to invalidate pattern: ${pattern}`)
  }
}

export async function invalidateKeys(...keys: string[]): Promise<void> {
  try {
    if (keys.length > 0) await redis.del(...keys)
  } catch {
    console.warn(`[Cache] Failed to invalidate keys: ${keys.join(', ')}`)
  }
}

export const CacheKeys = {
  // CRM
  crmLeads: (orgId: string, page: number, limit: number) => `crm:leads:${orgId}:${page}:${limit}`,
  crmLead: (id: string) => `crm:lead:${id}`,
  crmDeals: (orgId: string, page: number, limit: number) => `crm:deals:${orgId}:${page}:${limit}`,
  crmClients: (orgId: string, page: number) => `crm:clients:${orgId}:${page}`,
  // HR
  hrEmployees: (orgId: string, page: number) => `hr:employees:${orgId}:${page}`,
  hrEmployee: (id: string) => `hr:employee:${id}`,
  hrLeaves: (orgId: string, page: number) => `hr:leaves:${orgId}:${page}`,
  // Projects
  projects: (orgId: string, page: number) => `projects:list:${orgId}:${page}`,
  project: (id: string) => `project:${id}`,
  projectTickets: (projectId: string, page: number) => `project:tickets:${projectId}:${page}`,
  // Settings
  orgSettings: (orgId: string) => `org:settings:${orgId}`,
  orgRoles: (orgId: string) => `org:roles:${orgId}`,
  orgMembers: (orgId: string, page: number) => `org:members:${orgId}:${page}`,
  // Add more as discovered during audit
} as const

export const CacheTTL = {
  SHORT: 60,        // 1 min — real-time/frequently mutated
  MEDIUM: 300,      // 5 min — list queries
  LONG: 600,        // 10 min — single record detail
  HOUR: 3600,       // 1 hr — static/reference data (roles, configs)
  SESSION: 1800,    // 30 min — user/session data
} as const
```

### 1.4 — Drizzle Query Utilities
```typescript
// lib/db/query-utils.ts
export const getPaginationParams = (page = 1, limit = 25) => ({
  offset: (Math.max(1, page) - 1) * limit,
  limit: Math.min(limit, 100), // cap at 100
})

export const buildPaginationMeta = (total: number, page: number, limit: number) => ({
  page,
  limit,
  total,
  totalPages: Math.ceil(total / limit),
})
```

---

## 🎨 PHASE 2 — shadcn/ui Reinstall + Color Palette

### Rules:
- Run `npx shadcn@latest init` — select **Zinc** base (or match brand if detectable from existing CSS)
- Regenerate complete CSS variable set in `app/globals.css` for both `:root` (light) and `.dark`
- Variables required: `--background`, `--foreground`, `--card`, `--card-foreground`, `--popover`, `--popover-foreground`, `--primary`, `--primary-foreground`, `--secondary`, `--secondary-foreground`, `--muted`, `--muted-foreground`, `--accent`, `--accent-foreground`, `--destructive`, `--destructive-foreground`, `--border`, `--input`, `--ring`, `--radius`, `--sidebar-background`, `--sidebar-foreground`, `--sidebar-primary`, `--sidebar-primary-foreground`, `--sidebar-accent`, `--sidebar-accent-foreground`, `--sidebar-border`, `--sidebar-ring`
- Fix critical contrast bug: **every button variant must have readable text on hover**. Test: `default`, `outline`, `ghost`, `secondary`, `destructive`, `link`
- The root layout currently forces light theme — **do not change theme behavior**, just ensure light palette is correct
- Reinstall all shadcn components actually used in the repo: scan imports across all files and run `npx shadcn@latest add <component>` for each
- Never override shadcn component internals — only customize via CSS variables or `className` prop

---

## 🗂️ PHASE 3 — File Structure Enforcement & Migration

### Target Structure:
```
app/
  (auth)/                          ← auth pages
  (dashboard)/                     ← main product UI
    layout.tsx                     ← dashboard shell
    [domain]/[page]/page.tsx       ← route pages
  (public)/                        ← public pages
  api/
    [domain]/
      route.ts                     ← list + create (GET, POST)
      [<routeNameID>]/             don't use the id instead always use the proper id name example   
                                   persons/id => persons/personId  
        route.ts                   ← detail + update + delete (GET, PUT, PATCH, DELETE)
  globals.css
  layout.tsx

features/
  <feature_name>/
    components/                    ← UI components for this feature
    hooks/                         ← feature-specific React hooks
    schemas/                       ← Zod schemas
    types/                         ← TypeScript types
    api/                           ← TanStack Query hooks
      use<Feature>Query.ts
      use<Feature>Mutation.ts
    index.ts                       ← barrel export

components/
  ui/                              ← shadcn primitives ONLY
  shared/                          ← global reusable components
    DataTable.tsx
    AppSheet.tsx
    AppDialog.tsx
    PageWrapper.tsx
    CardGrid.tsx
    ConfirmDialog.tsx
    states/
      EmptyState.tsx
      LoadingState.tsx
      ErrorState.tsx
  layout/                          ← sidebar, header, command palette
  providers/                       ← app-wide providers

lib/
  api/
    client.ts                      ← Axios singleton
    response.ts                    ← response helpers
    hooks/                         ← TanStack Query hooks (legacy — migrate to features/)
  db/
    index.ts                       ← Drizzle client (lib/db.ts → lib/db/index.ts)
    schema/                        ← domain schemas (keep existing split)
    query-utils.ts                 ← pagination, filters helpers
  redis/
    cache.ts                       ← Upstash cache utilities
  rbac/                            ← keep existing
  ai/                              ← keep existing
  inngest/                         ← keep existing
  email/                           ← keep existing
  storage.ts                       ← keep existing
  sanitize.ts                      ← keep existing

server/
  actions/                         ← keep existing, ensure all are server-only
  queries/                         ← keep existing, add caching layer

types/                             ← shared TypeScript types
middleware.ts                      ← keep existing, extend if needed
REFACTOR_MEMORY.md
```

### Migration Rules:
- Every file in `_components/` → `features/<feature_name>/components/` — then delete `_components/`
- Component used in **2+ features** → `components/shared/`
- No file may exceed **500 lines** — split by responsibility
- Every component gets a **semantically descriptive name**: `LeadsDataTable.tsx`, not `Table.tsx`; `CreateLeadSheet.tsx`, not `Form.tsx`
- Remove all: unused imports, dead exports, commented-out code, `console.log` (keep `console.warn/error` only in error boundaries and cache utilities), `any` types, `@ts-ignore`, `eslint-disable`
- Barrel exports (`index.ts`) for every feature folder

---

## 🧩 PHASE 4 — Global Shared Components

Build in `components/shared/`. All must be **fully typed, accessible (ARIA), keyboard-navigable**.

### 4.1 — `<PageWrapper />`
```tsx
// components/shared/PageWrapper.tsx
type PageWrapperProps = {
  title: string
  description?: string
  actions?: React.ReactNode
  breadcrumbs?: Array<{ label: string; href?: string }>
  children: React.ReactNode
}
```
- Sticky top header: title + description + action buttons (never scrolls)
- Body content scrolls independently
- Breadcrumb slot (optional)
- Mobile: actions collapse into a dropdown menu if > 2 items
- **Every page in `app/(dashboard)` must use this — no exceptions**

### 4.2 — `<DataTable />` (Global Table)
```tsx
// components/shared/DataTable.tsx
import { ColumnDef } from '@tanstack/react-table'

type DataTableProps<TData> = {
  columns: ColumnDef<TData>[]
  data: TData[]
  isLoading?: boolean
  pagination?: {
    page: number
    limit: number
    total: number
    onPageChange: (page: number) => void
    onLimitChange: (limit: number) => void
  }
  filters?: React.ReactNode       // filter bar slot
  emptyState?: React.ReactNode    // custom empty state
  onRowClick?: (row: TData) => void
  rowSelection?: boolean
  stickyHeader?: boolean          // default: true
}
```
- Uses `@tanstack/react-table` v8
- **Table `<thead>` is `position: sticky; top: 0`** — never scrolls
- **Pagination bar is `position: sticky; bottom: 0`** — never scrolls
- Only `<tbody>` rows scroll within a bounded container
- Loading state: skeleton rows matching column count
- Empty state: uses `<EmptyState />` or custom via prop
- Page size selector: 10 / 25 / 50 / 100
- Built-in column sorting (click header)
- Horizontal scroll on mobile with `overflow-x-auto` wrapper
- **Replace every custom table in the repo with this component**

### 4.3 — `<AppSheet />`
```tsx
// components/shared/AppSheet.tsx
type AppSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  children: React.ReactNode        // form content — this scrolls
  footer?: React.ReactNode         // action buttons — sticky bottom
  side?: 'right' | 'left'          // default: 'right'
  size?: 'sm' | 'md' | 'lg' | 'xl' // controls width
}
```
- Sheet header (title + description + close button): `sticky top-0` — **never scrolls**
- Sheet footer (action buttons): `sticky bottom-0` — **never scrolls**
- Content area: `flex-1 overflow-y-auto px-6` — **only this scrolls**
- No double-padding: content already has `px-6`, children must not add outer padding
- Correct `z-index` layering for nested Radix portals
- **Use when form has > 5 fields**

### 4.4 — `<AppDialog />`
```tsx
// components/shared/AppDialog.tsx
type AppDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  children: React.ReactNode        // form content — scrolls if tall
  footer?: React.ReactNode         // action buttons — sticky
  maxWidth?: 'sm' | 'md' | 'lg'
}
```
- Same scroll behavior as AppSheet: header sticky, footer sticky, body scrolls
- Max height: `90vh` with internal scroll
- **Use when form has ≤ 5 fields or for confirmation prompts**

### Decision Rule (enforced across entire repo):
```
fields > 5  OR  complex multi-step  →  <AppSheet />
fields ≤ 5  OR  confirmation/alert  →  <AppDialog />
```

### 4.5 — `<CardGrid />`
```tsx
// components/shared/CardGrid.tsx
type CardGridProps = {
  children: React.ReactNode
  cols?: { default?: number; sm?: number; md?: number; lg?: number; xl?: number }
}
```
- CSS Grid with `grid-rows: subgrid` where supported, fallback to `items-stretch`
- All cards in same grid = **equal height always**
- `CardContent` without `CardFooter`: add `pb-6` class automatically via CSS selector or wrapper
- Default responsive cols: `1 → 2 → 3 → 4`

### 4.6 — State Components
```
components/shared/states/EmptyState.tsx    → icon + title + description + optional CTA
components/shared/states/LoadingState.tsx  → skeleton matching layout (pass variant prop)
components/shared/states/ErrorState.tsx   → error message + retry button callback
```

### 4.7 — `<ConfirmDialog />`
```tsx
type ConfirmDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  confirmLabel?: string            // default: 'Confirm'
  variant?: 'destructive' | 'default'
  onConfirm: () => void | Promise<void>
  isPending?: boolean
}
```
- Required before all destructive actions (delete, terminate, archive, bulk-delete)
- Confirm button disabled + spinner while `isPending`

---

## 📱 PHASE 5 — Page-by-Page UI/UX Refactor

For **every page** in `app/(dashboard)/**/page.tsx`, apply all rules below.

### 5.1 — Layout Rules
- Wrap with `<PageWrapper title="..." description="..." actions={...} breadcrumbs={[...]}>`
- Sidebar: consistent active-state indicator using `bg-sidebar-accent text-sidebar-accent-foreground`
- Sidebar collapses to drawer on mobile (`md:` breakpoint)
- Sidebar items grouped logically (HR group, CRM group, Projects group, etc.)
- All pages responsive: 320px (mobile) → 768px (tablet) → 1280px (desktop)

### 5.2 — Card Rules
- Cards in the same row/grid must be **equal height** — wrap with `<CardGrid>`
- `<CardContent>` without `<CardFooter>`: must have `className="pb-6"`
- Scan every file for `<Card>` usage and enforce this

### 5.3 — Button Rules
- Async action buttons: `disabled={isPending}` from TanStack mutation + loading spinner
- Destructive actions: always guarded by `<ConfirmDialog>`
- Form submit: `disabled={!isDirty || !isValid || isPending}`
- No double-submission possible

### 5.4 — Form Rules (entire repo)
- All forms: `react-hook-form` + Zod resolver
- Field error messages: shown via `<FormMessage>` (never custom `<p>` tags)
- Required fields: marked with `*` in `<FormLabel>`
- Short (≤5 fields) → `<AppDialog>` | Long (>5 fields) → `<AppSheet>`
- No scrolling of header/footer — only form body scrolls

### 5.5 — Color / Typography Rules
- Use only shadcn CSS variables: `text-foreground`, `text-muted-foreground`, `text-primary`, `bg-background`, `bg-card`, `border-border`, etc.
- Zero hardcoded hex or rgb colors in `className`
- Hover states must pass WCAG AA contrast (4.5:1 minimum)
- Scan and fix all places where button hover makes text invisible

### 5.6 — Table Rules
- Replace every custom table with `<DataTable>`
- Sticky header, sticky pagination, scrollable body only
- Empty/loading/error states handled
### 5.7 
maximum allowed number of lines in a file is 500+ and make sure everything should be properly divided into multiple components and if those same components were used some other places without creating the new components 
### 5.8
make sure all the pages should be fully responsive 
### 5.9             
the frontend there db call's were written in the frontend it is not reliable you should move all the api's to the server side only and no db call in the client side you should make a proper api and you should integrate it  with the tanstack query    
### 6.0
some buttons need to disabled when the respective button api call happening and indicate it with the proper circular progress 
### 6.1
some card components where card footer is not used in that case card content should having the proper bottom padding which is missing in most of the places 
### 6.2
give the proper names for each and every component 
### 6.3
use the pageWrapper components for all the pages 
### 6.4
if the form is less then you can go with the dialog else you should use the sheet and follow same pattern for the dialog as well not scrolling of the header and footer only form scrolling etc 
you should think like the product manager and you should sidebar and every page and UI and UX

---

## ⚡ PHASE 6 — API Route-by-Route Refactor

For **every file** in `app/api/**/route.ts`, apply this complete checklist:

### 6.1 — Per-Route Checklist
```
[ ] Extract session with getServerSession / auth() — return 401 if null
[ ] Extract orgId from session — return 403 if null
[ ] Parse + validate request body/params with Zod — return 400 with field errors
[ ] Sanitize all string inputs via lib/sanitize.ts
[ ] Check cache (Upstash) BEFORE running DB query
[ ] Run optimized Drizzle query (see 6.2)
[ ] Set cache after DB query on GET routes
[ ] Invalidate relevant cache keys on POST/PUT/PATCH/DELETE
[ ] Return using lib/api/response.ts helpers (ok, created, badRequest, etc.)
[ ] Wrap entire handler in try/catch → serverError on catch
[ ] Log errors with context (route, orgId, userId) — never expose stack traces
```

### 6.2 — Drizzle Query Optimization Rules
- **Always paginate** list queries: use `getPaginationParams()` from `lib/db/query-utils.ts`
- **Always project** only needed columns: use `{ columns: { id: true, name: true, ... } }` in `.select()`
- **Never N+1**: use Drizzle `with` (relations) or a single join query instead of looping queries
- **Add missing indexes**: for every `where()` clause field, verify a Drizzle index exists in the schema
- **Count separately**: for pagination `total`, use `db.select({ count: sql<number>\`count(*)\` })` not `.findMany().length`
- **Use transactions** for multi-table writes
- **Batch deletes/updates** with `inArray()` not loops

### 6.3 — Cache Integration Pattern per Route Type

**GET (list):**
```typescript
const cacheKey = CacheKeys.crmLeads(orgId, page, limit)
const data = await withCache(cacheKey, CacheTTL.MEDIUM, () => /* drizzle query */)
return ok(data, 'Success', paginationMeta)
```

**GET (single):**
```typescript
const cacheKey = CacheKeys.crmLead(id)
const data = await withCache(cacheKey, CacheTTL.LONG, () => /* drizzle query */)
if (!data) return notFound('Lead not found')
return ok(data)
```

**POST (create):**
```typescript
const result = await db.insert(...).returning()
await invalidatePattern(`crm:leads:${orgId}:*`)
return created(result[0])
```

**PUT/PATCH (update):**
```typescript
const result = await db.update(...).returning()
await invalidateKeys(CacheKeys.crmLead(id))
await invalidatePattern(`crm:leads:${orgId}:*`)
return ok(result[0])
```

**DELETE:**
```typescript
await db.delete(...)
await invalidateKeys(CacheKeys.crmLead(id))
await invalidatePattern(`crm:leads:${orgId}:*`)
return ok(null, 'Deleted successfully')
```

### 6.4 — Zero Client-Side DB Calls
- Scan **every file** in `features/`, `components/`, `app/(dashboard)/` for any direct Drizzle imports (`from 'drizzle-orm'`, `from '@/lib/db'`)
- Every occurrence = **critical violation** — extract to an API route immediately
- Replace with TanStack Query hook calling the new API route via `apiClient`

---

## 🔄 PHASE 7 — TanStack Query Standardization

### 7.1 — Global QueryClient Config
```typescript
// components/providers/query-provider.tsx (update existing)
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,       // 5 min
      gcTime: 10 * 60 * 1000,          // 10 min
      retry: 2,
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 30_000),
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 0,
    },
  },
})
```

### 7.2 — Query Hook Pattern (every feature)
```typescript
// features/<feature>/api/use<Entity>Query.ts
export const use<Entity>List = (params: <Entity>ListParams) =>
  useQuery({
    queryKey: ['<entity>', 'list', params],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiResponse<<Entity>[]>>('/<entity>', { params })
      return data.data!
    },
    placeholderData: keepPreviousData, // smooth pagination
  })

export const use<Entity>Detail = (id: string) =>
  useQuery({
    queryKey: ['<entity>', 'detail', id],
    queryFn: async () => {
      const { data } = await apiClient.get<ApiResponse<<Entity>>>(`/<entity>/${id}`)
      return data.data!
    },
    enabled: !!id,
  })
```

### 7.3 — Mutation Hook Pattern
```typescript
// features/<feature>/api/use<Entity>Mutation.ts
export const useCreate<Entity> = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: Create<Entity>Input) => {
      const { data } = await apiClient.post<ApiResponse<<Entity>>>('/<entity>', payload)
      return data.data!
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['<entity>', 'list'] })
      toast.success('<Entity> created successfully')
    },
    onError: (error: ApiError) => {
      toast.error(error.message)
    },
  })
}
```

### 7.4 — Error Handling in Components
```tsx
// NEVER do this in components:
catch (error) { const msg = (error as any).response?.data?.message }

// ALWAYS use ApiError from the interceptor:
onError: (error: ApiError) => { toast.error(error.message) }
```

---

## 🔐 PHASE 8 — Security Hardening

Apply to every API route and form in the repo:

- **Auth on every route**: extract session first, return `unauthorized()` if null
- **Org isolation**: every query must filter by `orgId` from session — never trust client-sent orgId
- **Zod validation**: every request body and query param validated before use
- **Input sanitization**: all string inputs pass through `lib/sanitize.ts` before DB write
- **Rate limiting**: already using Upstash — verify it covers auth, form submissions, AI endpoints
- **No secrets in code**: scan all files for hardcoded keys/tokens/passwords → move to `.env`
- **Drizzle parameterized queries**: never string-interpolate into SQL — always use Drizzle's query builder
- **File upload validation**: type allowlist, size limit, filename sanitization
- **Error responses**: never expose stack traces, internal error messages, or schema details to client

---

## ✅ PHASE 9 — Final QA Pass

Run this checklist against every file in the repo:

```
[ ] Zero _components/ directory — all migrated to features/
[ ] Zero direct Drizzle/DB imports in client components or pages
[ ] Zero raw fetch() or axios.get() outside apiClient
[ ] Every API route uses lib/api/response.ts helpers
[ ] Every API route has: auth check + Zod validation + cache + optimized Drizzle query
[ ] Every GET list route has pagination (page, limit, total, totalPages)
[ ] Every mutating route (POST/PUT/PATCH/DELETE) invalidates cache
[ ] Every page uses <PageWrapper />
[ ] Every table uses <DataTable /> with sticky header + sticky pagination
[ ] Every sheet uses <AppSheet /> — header/footer never scroll
[ ] Every dialog uses <AppDialog /> — header/footer never scroll
[ ] All cards in same section are equal height
[ ] All CardContent without CardFooter has pb-6
[ ] All async buttons disabled + spinner during pending
[ ] All destructive actions guarded by <ConfirmDialog />
[ ] All forms: react-hook-form + Zod + FormMessage errors
[ ] shadcn CSS variables used everywhere — zero hardcoded colors
[ ] No hover contrast failures on any button variant
[ ] No file exceeds 500 lines
[ ] No unused imports, dead code, any types, @ts-ignore, console.log
[ ] All components semantically named
[ ] Fully responsive at 320px, 768px, 1280px breakpoints
[ ] Inngest functions untouched (refactor only if triggered from API routes being refactored)
[ ] server/actions/* remain server-only — no 'use client' added
[ ] lib/ably.ts and chat features untouched unless listed in TODO
[ ] REFACTOR_MEMORY.md: all tasks marked [DONE]
```

---

## 🧠 TOKEN EFFICIENCY RULES

1. **One phase at a time** — fully complete before moving on
2. **One file at a time** — mark `[DONE]` in memory before next file
3. **Skip unchanged files** — mark `[SKIP — no changes]` in memory
4. **Reference don't repeat** — "follow same pattern as `features/crm/leads/CreateLeadSheet.tsx`"
5. **Batch identical changes** — e.g., add `pb-6` to all CardContent in one pass
6. **Never re-read processed files** in same session
7. **Ask before implementing ambiguous features** — one clarification question per ambiguity
8. **Do not regenerate already-built shared components** — reference them by import path

---

## 🚀 EXECUTION ORDER

```
PHASE 0 → Read REFACTOR_MEMORY.md (or create it) → Full audit → Master TODO list
PHASE 1 → Axios client + API response helpers + Redis cache utilities + Drizzle query utils
PHASE 2 → shadcn reinstall + color palette + button contrast fixes
PHASE 3 → File structure migration (_components → features/) + rename all files
PHASE 4 → Build ALL shared components (DataTable, AppSheet, AppDialog, PageWrapper, CardGrid, States, ConfirmDialog)
PHASE 5 → Page-by-page UI/UX refactor (consume shared components)
PHASE 6 → API route-by-route refactor (auth + Zod + cache + Drizzle optimization)
PHASE 7 → TanStack Query hooks (features/<name>/api/) + wire to pages
PHASE 8 → Security hardening sweep
PHASE 9 → Final QA checklist + REFACTOR_MEMORY.md → status: DONE
```

**Never skip a phase. Never skip a file. If unsure about scope, ask one focused question before proceeding.**

---

