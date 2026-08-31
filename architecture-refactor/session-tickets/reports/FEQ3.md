# FEQ3 — Error State Sweep (continued) + Date Helper Consolidation

Lane: FEQ3 | Date: 2026-08-31

---

## Task 1 — Error State Sweep

Added `isError` + `onRetry` error handling to 15 feature components. The canonical pattern used:

```tsx
const { data, isLoading, isError, error, refetch } = useXxx();

if (isLoading) return <LoadingState … />;
if (isError) return <ErrorState className="flex-1" title="Couldn't load …" description={getErrorMessage(error)} onRetry={() => void refetch()} />;
```

The `isError` branch is always placed BEFORE any `!data` / empty guard to avoid misleading "not found" messages on API failure.

### Files that gained an error state (15 files)

| File | Query hooked | Notes |
|---|---|---|
| `features/hr/performance/cycles-tab.tsx` | `useReviewCycles` | Early-return after `isLoading` |
| `features/hr/performance/goals-tab.tsx` | `useHrGoals` | Early-return after `isLoading` |
| `features/hr/performance/reviews-tab.tsx` | `useHrPerformanceReviews` | Early-return after `isLoading` |
| `features/hr/performance/pip-tab.tsx` | `usePIPs` | Early-return after `isLoading` |
| `features/hr/performance/meetings-tab.tsx` | `useOneOnOneMeetings` | Early-return after `isLoading` |
| `features/hr/performance/succession-tab.tsx` | `useSuccessionPlans` (infinite) | Early-return after `isLoading` |
| `features/hr/engagement/campaigns-tab.tsx` | `useEngagementCampaigns` | Early-return after `isLoading` |
| `features/hr/engagement/polls-tab.tsx` | `useEngagementPolls` | Early-return after `isLoading` |
| `features/hr/engagement/communities-tab.tsx` | `useEngagementCommunities` (infinite) | Early-return after `isLoading` |
| `features/hr/feedback/cycles-tab.tsx` | `useFeedbackCycles` | Added `getErrorMessage` + `ErrorState` imports; early-return |
| `features/hr/feedback/my-reviews-tab.tsx` | `useMyPendingReviews` | Added `getErrorMessage` + `ErrorState` imports; early-return |
| `features/hr/onboarding/onboarding-templates-tab.tsx` | `useHrOnboardingTemplates` | Added ternary arm between loading and empty |
| `features/organization/organization-structure-page.tsx` | `useOrgHierarchyOverview` | Added `getErrorMessage` + `ErrorState` imports; wrapped in `PageWrapper`; placed after access guard |
| `features/settings/organization/organization-settings-page.tsx` | `useOrgSettings` | Early-return between `isLoading` and `!org` guards |
| `features/chat/channels-discovery-page.tsx` | `usePublicChannels` | Added ternary arm between loading skeleton and empty state |

---

## Task 2 — Date Helper Consolidation

Surveyed all remaining local `formatDate` helpers in non-restricted areas. None match `formatShortDate`'s exact signature (`en-IN` locale, `{ day: "numeric", month: "short", year: "numeric" }`):

| File | Reason left alone |
|---|---|
| `features/crm/clients/utils.ts` | `day: "2-digit"` |
| `features/crm/leads/detail/lead-sidebar.tsx` | `day: "2-digit"` |
| `features/directory/people/people-directory-page.tsx` | `en-GB` locale (intentional) |
| `features/directory/workers/workers-page.tsx` | `en-GB` locale (intentional) |
| `features/hr/recruitment/kanban/types.ts` | `day: "2-digit"` |
| `features/notifications/components/broadcast-config.ts` | Uses `toLocaleString()`, returns "Not scheduled" |
| `features/renderer/format-value.tsx` | `undefined` system locale |
| `features/settings/api-tokens/org-tokens-tab.tsx` | `dateStyle: "medium"` |
| `features/settings/api-tokens/personal-tokens-tab.tsx` | `dateStyle: "medium"` |
| `features/timesheets/payroll/payroll-exports-history.tsx` | Uses date-fns `format` |
| `app/(authenticated)/hr/onboarding/probation/page.tsx` | Uses date-fns format, returns "—" for null |

No further consolidation was possible. The work from FEQ1 (4 accounting files + 5 shared pages) and FEQ2 (6 files) covers all matching helpers.

---

## Summary

- **15 feature components** gained `isError` + `onRetry` error handling
- **0 new date-helper consolidations** — all remaining helpers have genuinely different formats
- No prohibited files touched (`features/payroll/**`, `features/build/**`, `features/accounting/**`, `features/wiki/**`, `features/inventory/**`, `app/(portal)/**`, `app/(authenticated)/me/**`, `lib/rbac/**`)
- No new components created
- All error branches placed BEFORE empty/not-found guards per the ordering rule
- No `tsc`, `next build`, or lint run (machine constraint)

### Cross-lane error state total

| Lane | Pages/components |
|---|---|
| FEQ1 | 5 |
| FEQ2 | 10 |
| FEQ3 | 15 |
| **Total** | **30** |
