# FIXFE1 — Frontend Typecheck Fix Report

## Error 1: `EmptyState` invalid `icon` prop (3 files)

**Real API discovered:** `EmptyState` (`components/ui/empty-state.tsx`) has no `icon` prop. The correct props for a visual are:
- `illustration?: React.ReactNode` — pass any React element
- `illustrationPreset?: StateIllustrationPreset` — pick a named SVG preset
- When neither is supplied, the component defaults to `illustrationPreset="default"` via `StateIllustration`

All three files passed a lucide component constructor (e.g., `icon={Calendar}`) to a non-existent prop. The pages are placeholder "coming soon" surfaces; per CLAUDE.md §10, full-page empties use a themed SVG, not a raw lucide icon. The fix is to drop the invalid prop and the now-unused import, letting EmptyState render its default illustration.

**Files changed:**
- `frontend/app/(authenticated)/calendar/settings/page.tsx` — removed `icon={Calendar}` and the `Calendar` lucide import
- `frontend/app/(authenticated)/chat/moderation/page.tsx` — removed `icon={ShieldCheck}` and the `ShieldCheck` lucide import
- `frontend/app/(authenticated)/chat/settings/page.tsx` — removed `icon={Settings}` and the `Settings` lucide import

`EmptyStateProps` was NOT widened. No other consumer passes an `icon` prop.

## Error 2: `batches-table.tsx` — page object vs array

**Real hook return type:**
```typescript
type PayoutBatchesPage = {
  data: PayoutBatch[];
  pagination: { limit: number; nextCursor: string | null; hasMore: boolean };
};
```
`usePayoutBatches` returns `useQuery<PayoutBatchesPage>`, so `data` from `useQuery` is `PayoutBatchesPage | undefined`.

The table was passing `batches ?? []` to `DataTable data`, which is typed as `PayoutBatch[]`. The fallback `[]` resolved to `never[]`, making the union `never[] | PayoutBatchesPage` — not assignable to `PayoutBatch[]`.

**Fix:** Changed `data={batches ?? []}` to `data={batches?.data ?? []}` at line 179 of `frontend/features/payroll/payout/bank-transfers/batches-table.tsx`. The `.data` field on `PayoutBatchesPage` is `PayoutBatch[]`, so the union becomes `PayoutBatch[] | never[]` which resolves to `PayoutBatch[]`.

## Error 3: Stale `.next/types/validator.ts` references

**Confirmed:** `.next/` is gitignored at line 23 of `frontend/.gitignore` (`/.next/`). No source file under `frontend/` imports or references the deleted Next.js routes (`crm/calendar`, `knowledge-base`, `payroll/me`, `(portal)/projects`) as app-router paths. References to `payroll/me` in `hooks/api/payroll/ess.ts` and similar files are API endpoint path strings (`/payroll/me/...`), not Next.js route imports. No source changes required; the validator files are build artifacts that regenerate on the next `next build`.
