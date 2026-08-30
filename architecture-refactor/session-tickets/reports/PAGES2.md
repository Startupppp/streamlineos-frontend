# PAGES2 — Route Reconciliation & §8 Audit Report

**Date:** 2026-08-30

---

## Task 1 — Route Count Reconciliation

### Method

Built a Python normalizer that strips every parenthesised route-group segment (`/(xxx)`) from disk paths, then compared against active PAGES.md rows (retired rows excluded). Verified with 6 known test cases before trusting output.

### Findings

| Source | Count |
|---|---|
| Disk `page.tsx` files | 598 |
| Disk unique routes (after normalisation) | 598 |
| PAGES.md active rows (parser-matched) | 595 |
| PAGES.md active rows (true, incl. 2 non-standard formatting) | 597 |
| Retired rows | 5 |

**True total after this session: 600** (597 prior + 3 new stubs added below).

### New routes on disk not in PAGES.md (3)

All three are identical placeholder stubs: `enforceRouteAccess(path)` + `PageWrapper` + `EmptyState`. No data hooks.

- `/calendar/settings` — `(authenticated)/calendar/settings/page.tsx`
- `/chat/moderation` — `(authenticated)/chat/moderation/page.tsx`
- `/chat/settings` — `(authenticated)/chat/settings/page.tsx`

Added to PAGES.md. Module index updated: Calendar 1→2, Chat 3→5.

### PAGES.md labels fixed (4)

Four blog route rows carried `(site)` in the path label (e.g., `` `/blogs/(site)/[slug]` ``), which is a route-group segment that does not appear in the URL. Corrected to `` `/blogs/[slug]` `` etc.

---

## Task 2 — §8 Audit (pages audited this session)

### Compliant pages (no issues)

| Route | Notes |
|---|---|
| `/accounting/assets/[assetId]` | Detail; Edit (DRAFT) + Dispose (ACTIVE); bounded depreciation table; all states ✓ |
| `/accounting/assets/depreciation` | Immutable runs; bounded list; all states ✓ |
| `/accounting/budgets/[budgetId]` | Detail; BudgetMatrix edit; submit/approve lifecycle; all states ✓ |
| `/accounting/coa/[accountId]` | Detail; Edit via dialog; journal preview capped at 20 (acceptable); all states ✓ |
| `/accounting/journal/new` | Create-only; security gate on `!canCreate`; all states ✓ |
| `/accounting/journal/[entryId]` | Detail; post/approve/reverse lifecycle; all states ✓ |
| `/accounting/purchase-bills` | Full cursor pagination; search+status filters; all states ✓ |
| `/accounting/vendor-payments` | Dual cursor pagination; vendor filter; all states ✓ |
| `/payroll/settings/import-export` | Server component; `requirePermission("payroll:reports:view")` ✓ |
| `/employee-onboarding` | Wizard; no `requiredPermission` (correct); all states ✓ |
| `/accept-invitation` | Four-state invitation flow; StrictMode guard ✓ |
| `/calendar/settings` | Stub; `enforceRouteAccess` ✓ |
| `/chat/moderation` | Stub; `enforceRouteAccess` ✓ |
| `/chat/settings` | Stub; `enforceRouteAccess` ✓ |

### Issues found

#### P1 — `/me/*` routes: 6 pages violate the "must NEVER carry `requiredPermission`" rule

CLAUDE.md §8: "Employee self-service `/me/*` is universal to every active member and must NEVER carry `requiredPermission`." All six pages are server components that call `requirePermission` with `self:*` keys, which will deny access if the permission is absent from the role's grant set.

| Route | Illegal call |
|---|---|
| `/me/attendance` | `requirePermission("self:attendance")` |
| `/me/documents` | `requirePermission("self:onboarding-docs")` |
| `/me/expenses` | `requirePermission("self:expenses")` |
| `/me/pay` | `requirePermission(["self:payroll","self:payslips"])` |
| `/me/recruitment` | `requirePermission("self:recruitment")` |
| `/me/time-off` | `requirePermission("self:leaves")` |

**Fix required:** Remove `requirePermission` from all six. Access enforcement for self-service is the backend `self:*` key on the individual action endpoints, not a front-door gate that can lock a member out of their own data page.

#### P2 — Missing view-gate `enabled` on list queries (3 pages)

These pages fire their list query unconditionally — when the user lacks the role, the backend returns 403 which is silently retried. The `useCan` call only gates the create button.

| Route | Hook | Missing gate |
|---|---|---|
| `/accounting/budgets` | `useBudgets` | `enabled: useCan("accounting:budgets:view")` |
| `/accounting/journal` | `useJournalEntries` | `enabled: useCan("accounting:journal:view")` |
| `/workflows` | `useWorkflows` | `enabled: useCan("workflows:view")` |

#### P3 — Missing pagination (2 pages)

| Route | Current limit | Risk |
|---|---|---|
| `/accounting/budgets` | `pageSize: 100`, no `DataTable pagination` prop | Budgets grow with fiscal years |
| `/workflows` | `limit: 50`, no `DataTable pagination` prop | Workflows can grow unboundedly |

#### P4 — Incorrect state components (1 page)

`/accounting/settings` — loading and error branches return bare `<div>` wrappers instead of `PageWrapper` + `LoadingState` / `ErrorState`. This breaks layout consistency and responsive behaviour.

#### Minor — Empty state action unchecked (1 page)

`/accounting/purchase-bills` — the `EmptyState` action renders "New bill" link without checking `canManage`, so non-finance roles see an action they cannot perform.

---

## Aggregates

| Category | Count |
|---|---|
| Routes audited this session | 24 (incl. 3 new stubs + 6 me/* violations) |
| Fully compliant | 14 |
| P1 violations (`requiredPermission` on `/me/*`) | 6 |
| P2 violations (missing enabled view-gate) | 3 |
| P3 violations (missing pagination) | 2 |
| P4 violations (wrong state components) | 1 |
| Minor issues | 1 |

---

## Files changed

- `frontend/PAGES.md` — reconciliation header, module index, 3 new stub rows, 4 blog-path label fixes, §8 status filled for ~24 rows
