# FEQ2 — Error State Sweep + Date Helper Consolidation

Lane: FEQ2 | Date: 2026-08-30

---

## Task 1 — Error State Sweep

Pages that had no `isError` handling have been given `ErrorState` from `@/components/shared/error-state` with `onRetry` wired to `refetch`. Pattern used:

```tsx
if (isError) return <ErrorState className="flex-1" title="Couldn't load X" description={getErrorMessage(error)} onRetry={() => void refetch()} />
```

### Pages that gained an error state (10 files)

| File | Notes |
|---|---|
| `features/wiki/components/wiki-home-page.tsx` | Two queries combined (`useKbPagesRecent` + tree query); `handleRetry` calls both `refetch` |
| `features/wiki/components/knowledge-analytics-page.tsx` | Four queries; combined error flag, `handleRetry` calls all four |
| `features/crm/campaigns/campaign-detail-page.tsx` | `useCampaigns` — error state after loading skeleton |
| `features/hr/enterprise/comp/equity-page.tsx` | `useEquityGrants` — inline in loading/empty/data ternary chain |
| `features/hr/documents/document-editor-page.tsx` | `useRichDocument` — error check placed BEFORE `!doc` to avoid misleading "Document Not Found" on API failure |
| `features/hr/workforce/workforce-planning-page.tsx` | Four tab-level queries (budget/plans/skills/succession); each tab early-returns or conditionally renders |
| `app/(authenticated)/hr/engagement/page.tsx` | Two tabs (`useEngagementOverview`, `useMyMoodHistory`) |
| `features/surveys/results/response-table.tsx` | `useSurveyResponses` — early return before data table |
| `features/surveys/builder/tabs/collectors-card.tsx` | `useCollectors` — compact variant inside card |

### Already handled (confirmed, no edit needed)

- `features/crm/settings/data-quality-page.tsx` — existing `if (error || !data)` with ErrorState
- `features/hr/onboarding/my-onboarding-tasks-page.tsx` — already imports and uses `ErrorState`
- `features/inventory/components/operations/so-queue-page.tsx` — uses `query.error` inside `emptyState` prop

---

## Task 2 — Date Helper Consolidation

Local `formatDate` helpers that matched `formatShortDate` exactly (en-IN locale, `{ day: "numeric", month: "short", year: "numeric" }`) were replaced. Null fallbacks were preserved per call site.

### Files consolidated (5 files)

| File | Null fallback | Change |
|---|---|---|
| `features/hr/announcements/announcement-card.tsx` | none (non-null input) | Removed local helper; replaced `formatDate(x)` → `formatShortDate(x)` |
| `features/inventory/components/finance/valuation-client.tsx` | none | Removed local helper; replaced usage |
| `features/inventory/components/planning/reorder-evidence-card.tsx` | `"—"` | Removed local helper; replaced `formatDate(x)` → `formatShortDate(x) \|\| "—"` |
| `features/inventory/components/planning/replenishment-client.tsx` | `"—"` | Removed local helper; replaced `formatDate(x)` → `formatShortDate(x) \|\| "—"` |
| `features/hr/import-export/components/job-history-table.tsx` | none (non-null input) | Removed local helper; replaced usage |
| `features/build/client-portal/portal-list-page.tsx` | `null` → `"TBD"` | Removed local helper; replaced start date → `formatShortDate(x)`, end date → `formatShortDate(x) \|\| "TBD"` |

### Left alone (genuinely different format)

`day: "2-digit"`, `dateStyle: "medium"`, includes time (`toLocaleString`), system locale (undefined), date-fns `format`, `val.slice(0,10)` — none of these match `formatShortDate`.

---

## Summary

- **10 pages** gained `isError` + `onRetry` error handling
- **6 files** had local `formatDate` helpers removed and replaced with `formatShortDate` from `@/lib/date-utils`
- No new components created; no prohibited files touched
- No `tsc`, `next build`, or lint run (machine constraint)
