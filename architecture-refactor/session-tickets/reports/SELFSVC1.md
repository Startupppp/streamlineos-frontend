# SELFSVC1 — Lane Report

**Date:** 2026-08-30
**Branch:** main

---

## P1 — Six `/me/*` pages: `requirePermission` removed

### Verification

Before touching any file, confirmed in `backend/src/modules/rbac/permissions/role-defaults.ts` (current HEAD):

- `UNIVERSAL_MEMBER_PERMISSION_GRANTS` contains `self:onboarding-docs` (scope `own`)
- `EMPLOYEE_SELF_SERVICE` contains `self:attendance`, `self:leaves`, `self:expenses`, `self:payslips`, `self:payroll`, `self:recruitment`, and the above universal grants
- `MEMBER` role is seeded with all of `EMPLOYEE_SELF_SERVICE`

Every active member holds all six keys unrevokably before any role-specific grant runs. Removing the `requirePermission` call is therefore behaviour-preserving, not a widening.

### What `requirePermission` does beyond the permission check

`lib/rbac/require-permission.ts` performs three things: (1) session presence check, (2) `isActive` check, (3) permission check → redirect to `/access-denied`. The `(authenticated)` layout (`app/(authenticated)/layout.tsx`) already calls `requireSession()` for every route under it, which covers (1) and (2). The permission check (3) is what must be removed.

### Replacement

Each page replaced `requirePermission("self:…")` / `requirePermission(["self:…","self:…"])` with `requireSession()`. The import line was updated from `requirePermission` to `requireSession`.

### What each page is left with

| Route | Auth guard | Source |
|---|---|---|
| `/me/attendance` | `requireSession()` in page + `requireSession()` in layout | Both redirect unauthenticated/inactive users |
| `/me/documents` | same | same |
| `/me/expenses` | same | same |
| `/me/pay` | same | same |
| `/me/recruitment` | same | same |
| `/me/time-off` | same | same |

An unauthenticated request reaches the `(authenticated)` layout first; `requireSession()` there fires `redirect(signInPathForMissingSession())` before the page component is ever invoked. The page-level `requireSession()` is defence in depth for any future layout restructuring.

### Files changed

- `frontend/app/(authenticated)/me/attendance/page.tsx`
- `frontend/app/(authenticated)/me/documents/page.tsx`
- `frontend/app/(authenticated)/me/expenses/page.tsx`
- `frontend/app/(authenticated)/me/pay/page.tsx`
- `frontend/app/(authenticated)/me/recruitment/page.tsx`
- `frontend/app/(authenticated)/me/time-off/page.tsx`

---

## P2 — Missing view-gate `enabled` on list queries

### Key verification (backend catalog)

PAGES2.md listed keys that were guessed. Real keys confirmed from `backend/src/modules/rbac/permissions/`:

| Page | PAGES2.md guess | Real backend key |
|---|---|---|
| `/accounting/budgets` | `accounting:budgets:view` | `accounting:budgets:read` |
| `/accounting/journal` | `accounting:journal:view` | `accounting:journal:read` |
| `/workflows` | `workflows:view` | `workflows:workflows:view` |

All three also exist verbatim in `frontend/lib/rbac/permissions/permission-key-extended.ts`.

### Hooks already gated (no page-level change needed)

- `useBudgets` (`hooks/api/accounting/planning.ts`): already has `const can = useCan("accounting:budgets:read")` and `enabled: can`
- `useWorkflows` (`hooks/api/workflows-definitions.ts`): already has `const canView = useCan("workflows:workflows:view")` and `enabled: canView`

### Hook fixed

- `useJournal` (`hooks/api/accounting.ts`): had no `enabled` gate. Added `useCan` import and `const can = useCan("accounting:journal:read")` with `enabled: can`.

### Files changed

- `frontend/hooks/api/accounting.ts` — added `import { useCan } from "@/hooks/api/access"` and `enabled: can` to `useJournal`

---

## P3 — Pagination

### `/accounting/budgets`

Backend endpoint supports page-based pagination (`page`, `pageSize`) and returns `{ items, total, page, pageSize, totalPages }`. The hook (`useBudgets`) already accepts and threads these params.

Fix: added `const PAGE_SIZE = 25` constant, `const [page, setPage] = useState(1)` state, reset page to 1 in both filter handlers, added `handlePageChange` function, and passed `pagination={{ mode: "server", page, pageSize: PAGE_SIZE, total: query.data?.total ?? 0, onPageChange: handlePageChange }}` to `DataTable`. Hard-coded `pageSize: 100` replaced by `PAGE_SIZE`.

### `/workflows`

Backend endpoint supports cursor-based pagination (`cursor`, `limit`) and returns `{ data, pagination: { nextCursor: string | null, hasMore, limit } }`. `nextCursor` is explicitly `string | null` — never `undefined`.

Fix: applied the same cursor-array pattern as the journal page. Added `const WORKFLOW_PAGE_SIZE = 24`, cursor state array `(string | null)[]` starting `[null]`, `cursorIndex`, a `filterKey` effect that resets cursors/index on filter change, a `useEffect` that appends `nextCursor` (which is `string | null`, never `undefined`) to the cursor array, and a synthetic total (`hasMore ? currentPage * WORKFLOW_PAGE_SIZE + 1 : (currentPage - 1) * WORKFLOW_PAGE_SIZE + workflows.length`). Added `TablePagination` below the card grid, shown only when there is more than one page of content. The `limit: 50` hard-code was replaced by `WORKFLOW_PAGE_SIZE`.

### Files changed

- `frontend/app/(authenticated)/accounting/budgets/page.tsx`
- `frontend/app/(authenticated)/workflows/page.tsx`

---

## P4 — `/accounting/settings` bare `<div>` loading/error branches

Both early-return branches used a bare `<div className="flex flex-1 min-h-0 flex-col">` wrapper. Replaced with `PageWrapper title="Finance Settings" subtitle="Company financial configuration"`, matching the title/subtitle of the normal render path. `LoadingState` and `ErrorState` are given `className="flex-1"` to fill the content zone via the flex chain. `EmptyState`'s `icon` prop was not used here; no change needed on that front.

### Files changed

- `frontend/app/(authenticated)/accounting/settings/page.tsx`

---

## Test results

```
PASS lib/rbac/route-access/__tests__/universal-route-matrix.test.ts
PASS components/layout/sidebar/sidebar-nav-items.test.ts
PASS hooks/api/workflows/workflows-gates.test.tsx
Tests: 34 passed, 34 total

PASS hooks/api/hr/hr-core-query-access-matrix.test.ts
Tests: 81 passed, 81 total
```

Total: **115 tests, 0 failures.**

Lint and build not run per CLAUDE.md standing rule (reported as not run, never as passing).
