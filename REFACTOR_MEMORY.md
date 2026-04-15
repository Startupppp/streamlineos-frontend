# 🧠 MASTER REFACTOR PROMPT — Full-Stack CRM (Next.js + TypeScript + shadcn/ui + Redis + Neondb+ Drizzle ORM)

---

## 🔴 PRIME DIRECTIVE

You are simultaneously acting as a **Senior Full-Stack Engineer**, **Prompt Engineer**, and **Product Manager**. Your job is to perform a **complete, zero-compromise refactor** of this entire repository — UI/UX, component architecture, API layer, caching, database queries, security, and file structure — **without missing a single file, line, route, or component**.

---

## 📋 PHASE 0 — MEMORY, AUDIT & TODO LIST (Always Run First)

Before writing a single line of code, you must:

### 0.1 — Memory Bootstrap
- Check if a file `REFACTOR_MEMORY.md` exists at the repo root.
- If it exists: **read it fully**, resume from where the last session left off, and update it after each completed phase.
- If it does not exist: **create it** with the full TODO list generated in step 0.2.
- After every completed task/file, **update `REFACTOR_MEMORY.md`** marking it `[DONE]` with a timestamp.
- Structure:
```md
# Refactor Memory
## Session: <date>
## Status: IN_PROGRESS | DONE
## Completed: []
## Pending: []
## Notes: []
```

### 0.2 — Full Repo Audit (Token-Efficient Strategy)
Scan the entire repo systematically using this order:
1. `package.json` → detect all libraries, scripts, versions
2. `tsconfig.json`, `next.config.*`, `tailwind.config.*` → detect aliases, paths, plugins
3. `/app` or `/pages` → map all routes (pages + API routes)
4. `/features`, `/components`, `/_components`, `/lib`, `/hooks`, `/services`, `/models`, `/types`, `/utils` → map all files
5. `/styles` or `globals.css` → detect color palette, CSS variables
6. `.env.example` → detect environment variables, services used (Redis, MongoDB, etc.)

### 0.3 — Generate Master TODO List
After audit, generate a structured TODO list grouped by phase:
```
[ ] PHASE 1: shadcn reinstall + color palette
[ ] PHASE 2: File structure cleanup + feature migration
[ ] PHASE 3: Global shared components
[ ] PHASE 4: Page-by-page UI/UX refactor
[ ] PHASE 5: API route-by-route refactor
[ ] PHASE 6: Caching layer (Redis)
[ ] PHASE 7: TanStack Query integration
[ ] PHASE 8: Security hardening
[ ] PHASE 9: Final QA pass
```
Save this in `REFACTOR_MEMORY.md`. **Do not start implementation until this list is complete.**

---

## 🎨 PHASE 1 — shadcn/ui Reinstall + Color Palette

### Rules:
- Run `npx shadcn@latest init` and select the **correct base color** (e.g., Zinc, Slate, or Neutral — match the project's brand if detectable, otherwise use Zinc as default).
- Regenerate all CSS variables in `globals.css`:
  - `--background`, `--foreground`, `--primary`, `--primary-foreground`, `--secondary`, `--secondary-foreground`, `--muted`, `--muted-foreground`, `--accent`, `--accent-foreground`, `--destructive`, `--destructive-foreground`, `--border`, `--input`, `--ring`, `--card`, `--card-foreground`, `--popover`, `--popover-foreground`
  - Ensure **dark mode** variants are also defined.
- Fix the critical bug: **button hover states must never have matching text and background color**. Verify every button variant: `default`, `outline`, `ghost`, `destructive`, `secondary`, `link`.
- Reinstall all shadcn components that are used in the repo: `npx shadcn@latest add <component>` for each.
- After reinstall, scan every component for broken class references or color mismatches and fix them.

---

## 🗂️ PHASE 2 — File Structure & Migration

### Folder Structure Enforcement:
```
/app
  /api                    ← ALL API routes (no DB calls in client ever)
/features
  /<feature_name>
    /components           ← Feature-specific components (migrated from _components)
    /hooks                ← Feature-specific hooks
    /schemas              ← Zod schemas for this feature
    /types                ← Feature-specific TypeScript types
    /api                  ← TanStack Query hooks (useQuery, useMutation)
    index.ts              ← Barrel export
/components
  /ui                     ← shadcn primitives only
  /shared                 ← Global reusable components (table, sheet, dialog, page-wrapper, etc.)
/lib
  /db                     ← DB connection, models
  /redis                  ← Redis client + cache utilities
  /auth                   ← Auth helpers
  /utils                  ← Pure utility functions
  /validators             ← Shared Zod schemas
/hooks                    ← Global hooks
/types                    ← Global TypeScript types
/middleware.ts            ← Next.js middleware (auth guards, rate limiting)
REFACTOR_MEMORY.md        ← Session memory
```

### Migration Rules:
- Move **every file** from `_components/` → `features/<feature_name>/components/`
- If a component is used in **more than one feature**, move it to `components/shared/`
- Delete `_components/` directory after migration — it must not exist
- Every file must have a **semantically correct, descriptive name** (e.g., `ClientListTable.tsx` not `Table.tsx`, `CreateInvoiceSheet.tsx` not `Form.tsx`)
- No file may exceed **500 lines** — split into subcomponents if needed
- Remove **all unused files, dead exports, commented-out code, unused imports**
- No `any` types, no `// @ts-ignore`, no `// eslint-disable`

---

## 🧩 PHASE 3 — Global Shared Components

Build these shared components in `components/shared/`. Each must be **fully typed, accessible, and reusable**.

### 3.1 — `<PageWrapper />`
```tsx
// components/shared/PageWrapper.tsx
// Props: title, description?, actions? (ReactNode), children
// Structure: sticky header with title + action buttons, scrollable body
// Used on EVERY page — no exceptions
```
Rules:
- Header must be sticky and never scroll
- Body scrolls independently
- Responsive padding (mobile-first)
- Accepts optional breadcrumb slot

### 3.2 — `<DataTable />` (Global Table Component)
```tsx
// components/shared/DataTable.tsx
// Props: columns (TanStack Table ColumnDef[]), data, isLoading?, pagination?, filters?, emptyState?
```
Rules:
- Uses TanStack Table v8 (`@tanstack/react-table`)
- **Table header must NEVER scroll** — it stays sticky
- **Pagination must NEVER scroll** — it stays at the bottom
- Only the table body rows scroll
- Built-in: loading skeleton, empty state, column sorting, optional search/filter bar
- Pagination: page size selector (10/25/50/100), prev/next, page indicator
- Fully responsive: horizontal scroll on mobile, never breaks layout
- Reuse across the entire repo — no feature should have its own table implementation

### 3.3 — `<AppSheet />` (Global Sheet Wrapper)
```tsx
// components/shared/AppSheet.tsx
// Props: open, onOpenChange, title, description?, children (form content), footer? (action buttons)
```
Rules:
- Sheet header (title + description) is **sticky, never scrolls**
- Sheet footer (action buttons) is **sticky at bottom, never scrolls**
- **Only the form content area scrolls** (overflow-y-auto with proper max-height)
- Correct padding: `p-6` on content, no double-padding from nested components
- Use this for **all forms with more than ~5 fields**

### 3.4 — `<AppDialog />` (Global Dialog Wrapper)
```tsx
// components/shared/AppDialog.tsx
// Props: open, onOpenChange, title, description?, children, footer?
```
Rules:
- Same scroll behavior as AppSheet — only body scrolls
- Header and footer are sticky
- Use for **short forms (≤5 fields) or confirmation dialogs**
- Decision rule: `fields > 5` → use Sheet; `fields ≤ 5` → use Dialog

### 3.5 — `<CardGrid />` (Equal Height Card Layouts)
```tsx
// components/shared/CardGrid.tsx
// Props: children, cols? (responsive column config)
```
Rules:
- All cards in a grid section must have **equal height** — use CSS Grid with `grid-rows: subgrid` or `items-stretch`
- `CardContent` without `CardFooter` must have `pb-6` bottom padding — enforce globally
- Cards must be responsive: 1 col mobile → 2 col tablet → 3/4 col desktop

### 3.6 — `<EmptyState />`, `<LoadingState />`, `<ErrorState />`
```tsx
// components/shared/states/
```
- Consistent design across all pages
- EmptyState: icon + title + description + optional CTA button
- LoadingState: skeleton that matches the page layout
- ErrorState: error message + retry button

### 3.7 — `<ConfirmDialog />`
- Reusable destructive action confirmation
- Props: `title`, `description`, `onConfirm`, `isLoading`

---

## 📱 PHASE 4 — Page-by-Page UI/UX Refactor

For **every page** in the repo, apply ALL of the following rules:

### Layout Rules:
- Wrap every page with `<PageWrapper title="..." actions={...}>`
- Sidebar navigation must be consistent, accessible, and keyboard-navigable
- Active sidebar item must have clear visual indicator using shadcn accent colors
- Sidebar must collapse on mobile (hamburger/drawer pattern)
- All pages must be **fully responsive**: mobile (320px+) → tablet (768px+) → desktop (1280px+)

### Card Rules:
- All cards in the same section/grid must be **equal height** (use flexbox or grid stretch)
- `CardContent` without `CardFooter` → add `className="pb-6"` explicitly
- Never mix different card height in the same visual row

### Button Rules:
- All async action buttons (submit, save, delete) must be **disabled + show loading spinner** during their pending state
- Use `disabled={isPending}` from TanStack mutation
- Destructive actions require `<ConfirmDialog />` before execution
- Never allow double-submission

### Form Rules:
- Short forms (≤5 fields): use `<AppDialog />`
- Long forms (>5 fields): use `<AppSheet />`
- All forms use `react-hook-form` + Zod validation
- Show inline field error messages using `FormMessage`
- Required fields marked with `*`
- Submit button disabled until form is valid (or dirty)

### Typography & Color Rules:
- Follow shadcn palette strictly — no hardcoded hex colors in className
- Use `text-foreground`, `text-muted-foreground`, `text-primary`, etc.
- Never use color combinations that cause text/background contrast failure on hover

### Table Rules (on every page with a table):
- Replace all custom tables with `<DataTable />`
- Header sticky, pagination sticky, body scrolls
- Empty state handled by DataTable's built-in emptyState prop

---

## ⚡ PHASE 5 — API Route-by-Route Refactor

### For EVERY route in `/app/api/**`:

#### 5.1 — Audit Checklist per Route:
```
[ ] Input validation with Zod (request body, query params, path params)
[ ] Auth check (middleware or inline) — return 401 if unauthorized
[ ] Proper HTTP status codes (200, 201, 400, 401, 403, 404, 409, 500)
[ ] Consistent response shape: { data, message, error, meta }
[ ] Optimized DB query (indexed fields, projection, lean(), no N+1)
[ ] Pagination on all list endpoints (page, limit, skip)
[ ] Redis cache check BEFORE DB query
[ ] Cache invalidation on mutation (POST/PUT/PATCH/DELETE)
[ ] Error handling with try/catch + logger
[ ] Rate limiting on sensitive endpoints
[ ] No DB calls in client components — only through API routes
```

#### 5.2 — Consistent Response Shape:
```typescript
// lib/api/response.ts
export const apiSuccess = <T>(data: T, message = 'Success', meta?: object) =>
  NextResponse.json({ success: true, data, message, meta }, { status: 200 });

export const apiError = (message: string, status = 500, errors?: unknown) =>
  NextResponse.json({ success: false, message, errors }, { status });
```

#### 5.3 — Query Optimization Rules:
- Every MongoDB query on a list endpoint must use `.lean()` for read operations
- All frequently-queried fields must have DB indexes (check models and add missing ones)
- Never do N+1 queries — use `populate()` with field projection or aggregation pipelines
- Paginate all list endpoints: `?page=1&limit=25` with `skip = (page-1) * limit`
- Use `select()` to project only required fields
- Add compound indexes where multi-field queries exist

---

## 🔴 PHASE 6 — Redis Caching Layer

### 6.1 — Redis Client Setup:
```typescript
// lib/redis/client.ts
// Use ioredis with connection pooling
// Graceful fallback if Redis is unavailable (log warning, proceed without cache)
```

### 6.2 — Cache Utility:
```typescript
// lib/redis/cache.ts
export async function withCache<T>(
  key: string,
  ttl: number,
  fetcher: () => Promise<T>
): Promise<T>
// If key exists in Redis → return parsed JSON
// Else → run fetcher, store result with TTL, return result
```

### 6.3 — Cache Key Conventions:
```
<entity>:<id>              → single record (e.g., "client:abc123")
<entity>:list:<hash>       → list with filter hash (e.g., "clients:list:page1limit25")
<entity>:count             → aggregate count
user:<id>:permissions      → per-user permissions
```

### 6.4 — TTL Strategy:
```
Static/reference data (roles, configs):     3600s (1 hour)
List queries (paginated):                    300s  (5 min)
Single record detail:                        600s  (10 min)
User session data:                           1800s (30 min)
Real-time/frequently mutated data:           60s   (1 min) or no cache
```

### 6.5 — Cache Invalidation:
- On `POST` (create): invalidate `<entity>:list:*` (wildcard pattern delete)
- On `PUT/PATCH` (update): invalidate `<entity>:<id>` + `<entity>:list:*`
- On `DELETE`: invalidate `<entity>:<id>` + `<entity>:list:*`
- Use Redis `SCAN` with pattern matching for wildcard invalidation (never `KEYS *` in production)

---

## 🔒 PHASE 7 — TanStack Query Integration (Client Side)

### Rules:
- **Zero direct DB calls in client components** — if any exist, extract to API route immediately
- Every data fetch in a component must use `useQuery` from `@tanstack/react-query`
- Every mutation must use `useMutation` with `onSuccess` cache invalidation via `queryClient.invalidateQueries`
- Query keys must be structured arrays: `['clients', 'list', { page, filters }]`
- Global `QueryClient` config:
  - `staleTime`: 5 minutes (300_000)
  - `gcTime`: 10 minutes (600_000)
  - `retry`: 2
  - `refetchOnWindowFocus`: false (for CRM-type apps)
- All queries must handle: `isLoading` → skeleton, `isError` → ErrorState, `data?.length === 0` → EmptyState

### Feature Query Hook Pattern:
```typescript
// features/<feature>/api/use<Feature>Query.ts
export const useClientList = (params: ClientListParams) =>
  useQuery({
    queryKey: ['clients', 'list', params],
    queryFn: () => fetchClients(params),
    staleTime: 300_000,
  });
```

---

## 🔐 PHASE 8 — Security Hardening

Apply to the entire codebase:

- **Input sanitization**: All user inputs sanitized before DB write (strip HTML, trim whitespace)
- **Zod on all API routes**: Every endpoint validates request body/params with Zod before processing
- **Auth middleware**: Every non-public route must verify session/JWT — use Next.js middleware or per-route check
- **Rate limiting**: Apply to auth routes, form submissions, and any high-frequency endpoints
- **No secrets in code**: All keys/URIs in `.env` — scan and remove any hardcoded secrets
- **CORS**: Properly configured, no wildcard `*` in production
- **HTTP headers**: Use `next/headers` security headers in `next.config.js` (CSP, X-Frame-Options, HSTS, etc.)
- **MongoDB injection prevention**: Always use Mongoose typed models + Zod validated input (never `req.body` directly to DB)
- **File uploads**: Validate type, size, and sanitize filename if applicable

---

## ✅ PHASE 9 — Final QA Pass

After all phases complete, run this checklist against the entire repo:

```
[ ] Zero files in _components/ — all migrated to features/
[ ] Zero DB calls in any client component
[ ] Every page uses <PageWrapper />
[ ] Every table uses <DataTable /> with sticky header + sticky pagination
[ ] Every sheet uses <AppSheet /> with non-scrolling header/footer
[ ] Every dialog uses <AppDialog /> with non-scrolling header/footer
[ ] All cards in grid sections are equal height
[ ] All CardContent without CardFooter has pb-6
[ ] All async buttons disabled during loading
[ ] All destructive actions guarded by <ConfirmDialog />
[ ] All forms: react-hook-form + Zod + inline errors
[ ] shadcn color palette used consistently — no hover contrast failures
[ ] All API routes: Zod validation + auth check + cache + optimized query
[ ] Redis caching on all read-heavy routes
[ ] Cache invalidation on all mutations
[ ] No file exceeds 500 lines
[ ] No unused imports, dead code, or any types
[ ] All components named semantically and correctly
[ ] Fully responsive at 320px, 768px, 1280px
[ ] REFACTOR_MEMORY.md updated with all completed tasks
```

---

## 🧠 TOKEN EFFICIENCY RULES (Critical for Long Sessions)

To minimize token consumption while ensuring completeness:

1. **Process one phase at a time** — complete it fully before moving to next
2. **Process one feature/route at a time** within a phase — don't jump around
3. **Update `REFACTOR_MEMORY.md` after each file** — so sessions can resume without re-auditing
4. **Reuse shared components** — never re-implement the same pattern twice
5. **If a file has no changes needed** — mark it `[SKIP — no changes needed]` in memory and move on
6. **Batch similar changes** — e.g., adding `pb-6` to CardContent can be done across all files in one scan
7. **Reference, don't repeat** — if a pattern was established in one file, say "follow same pattern as X" in subsequent files
8. **Never re-read a file already processed** in the same session unless updating it

---

## 🚀 EXECUTION ORDER

```
PHASE 0 → Audit + REFACTOR_MEMORY.md creation
PHASE 1 → shadcn reinstall + color palette fix
PHASE 2 → File structure migration
PHASE 3 → Build all shared components first (DataTable, AppSheet, AppDialog, PageWrapper, CardGrid, States)
PHASE 4 → Page-by-page UI/UX (consume shared components)
PHASE 5 → API route-by-route refactor
PHASE 6 → Redis caching layer
PHASE 7 → TanStack Query wiring
PHASE 8 → Security hardening
PHASE 9 → Final QA pass + REFACTOR_MEMORY.md marked DONE
```

**Never skip a phase. Never skip a file. Update memory after every completed unit of work.**

---
