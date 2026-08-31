# FEQ1 — Error states & date-utils sweep

**Date:** 2026-08-30  
**Lane:** FEQ1  

---

## Pages that gained an error state (5)

| Page | What changed |
|---|---|
| `app/(authenticated)/hr/onboarding/[userId]/page.tsx` | Replaced ad-hoc `<div>` + `<Button>Retry</Button>` with `<ErrorState className="flex-1" … onRetry={handleRetry}>`. Removed unused `Button` import. |
| `app/(authenticated)/hr/approvals/page.tsx` | Destructured `isError`/`refetch` from `useWorkflowInbox` and `useWorkflowActed`; added `handleRetryInbox` / `handleRetryActed`; each tab now conditionally renders `<ErrorState>` before `<InstanceList>`. |
| `app/(authenticated)/hr/settings/versions/page.tsx` | Destructured `refetch` from `useEntityVersions`; added `handleRetry`; replaced inline `<p>Failed to load versions.</p>` with `<ErrorState className="flex-1" … onRetry={handleRetry}>`. |
| `app/(authenticated)/build/[projectId]/cycles/page.tsx` | Destructured `isError`/`refetch` from `useCycles`; added `handleRetry`; added early-return `isError` guard that renders `<ErrorState>` inside `<PageWrapper>`. |
| `app/(authenticated)/surveys/[surveyId]/participants/page.tsx` | Destructured `isError`/`refetch` from `useParticipants`; added `handleRetry`; renders `<ErrorState>` when `isError` before the data/empty branches. |

---

## Date helper replacements (9 files total, 4 feature + 3 page overlap)

**Local `formatDate` functions removed and replaced with `formatShortDate` from `@/lib/date-utils`:**

| File | Null fallback preserved |
|---|---|
| `features/accounting/expenses/expense-table.tsx` | `"—"` |
| `features/accounting/expenses/receipt-card.tsx` | `""` (string input, never null) |
| `features/accounting/expenses/expense-detail-sheet.tsx` | `"—"` |
| `features/accounting/expenses/reimbursement-table.tsx` | `"—"` |

**Inline `toLocaleDateString()` calls replaced in files already edited for error states:**

| File | Call sites replaced |
|---|---|
| `app/(authenticated)/hr/onboarding/[userId]/page.tsx` | 2 (task due date, completedAt) |
| `app/(authenticated)/hr/approvals/page.tsx` | 1 (instance.dueAt) |
| `app/(authenticated)/build/[projectId]/cycles/page.tsx` | 4 (startDate/endDate × 2 sections) |
| `app/(authenticated)/surveys/[surveyId]/participants/page.tsx` | 2 (invitedAt, completedAt) |

**Helpers left alone (format genuinely differs from `formatShortDate`):**
- `features/accounting/core/journal-entry-view.tsx` — uses `day: "2-digit"`
- `features/accounting/core/period-checklist-panel.tsx` — uses `day: "2-digit"`
- `features/accounting/core/recurring-journals-tab.tsx` — uses `day: "2-digit"`
- `features/accounting/banking/components/transfers-client.tsx` — uses `day: "2-digit"`
- `features/accounting/purchases/bill-detail-view.tsx` — uses `day: "2-digit"`
- `features/accounting/planning/revisions-sheet.tsx` — uses `day: "2-digit"`
- `features/accounting/assets/asset-table.tsx` — uses `toLocaleDateString()` with no options
- `app/(authenticated)/accounting/forecast/page.tsx` — intentionally omits year in week headers
- `app/(authenticated)/build/[projectId]/cycles/[cycleId]/page.tsx` — intentionally short `{month, day}` format, no year
- `app/(authenticated)/inventory/channels/page.tsx` — uses `toLocaleString` with time component
- `app/(authenticated)/inventory/3pl/page.tsx` — uses `toLocaleString` with time component
- `app/(authenticated)/inventory/reports/movements/page.tsx` — uses `toLocaleString` with time component

---

## Files changed

9 files changed total:

```
app/(authenticated)/hr/onboarding/[userId]/page.tsx
app/(authenticated)/hr/approvals/page.tsx
app/(authenticated)/hr/settings/versions/page.tsx
app/(authenticated)/build/[projectId]/cycles/page.tsx
app/(authenticated)/surveys/[surveyId]/participants/page.tsx
features/accounting/expenses/expense-table.tsx
features/accounting/expenses/receipt-card.tsx
features/accounting/expenses/expense-detail-sheet.tsx
features/accounting/expenses/reimbursement-table.tsx
```

---

## Validation

- Typecheck: not run (hangs this machine per CLAUDE.md)
- Lint/tests: not run
- All 5 pages now have the canonical pattern: `isError ? <ErrorState className="flex-1" title="…" description="…" onRetry={handleRetry} /> : …`
- All replaced `formatDate` helpers had the same `en-IN + { day: "numeric", month: "short", year: "numeric" }` format as `formatShortDate`; null fallbacks preserved per call site
- No `any`, no casts, no `@ts-ignore` introduced
- Boundaries respected: `features/payroll/**`, `app/(portal)/**`, and `app/(authenticated)/directory/settings/**` were not touched
