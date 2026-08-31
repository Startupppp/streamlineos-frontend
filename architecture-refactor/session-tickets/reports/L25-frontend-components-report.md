# L25 Frontend Components Report

**Status:** DONE — all items within exclusive file ownership completed.

**Duplicate primitives found:** None. `DataTable`, `LoadingButton`, `EmptyState`, `AiActionsMenu` each have exactly one implementation. Import index §15 verified correct.

**Files split with line counts:**
- `plate-document-editor.tsx`: 520 → 128 lines. Extracted plugin config to `plate-plugins.ts` (226 lines) and page-link picker to `plate-page-link-picker.tsx` (168 lines).
- `data-table.tsx`: 560 → 463 lines. `DataTableSkeleton` extracted to `data-table-skeleton.tsx` (47 lines, re-exported for backward compat); types extracted to `data-table.types.ts` (64 lines, re-exported).

**EmptyState filter-empty:** Added `filtersActive?: boolean` and `onClearFilters?: () => void` props. When `filtersActive`, renders "No results match your filters." + "Clear filters" button and suppresses the create action. Tested: 10 tests pass.

**AccessDenied fix:** Replaced hardcoded `min-h-[60dvh]` with `flex-1 min-h-0` to fill via flex chain; added `className` prop.

**A11y findings:** All existing components verified — `aria-label` on icon controls, `type="button"` on non-submit buttons, `role="alert"` on ErrorState. No new violations introduced.

**Empty states migrated:** check:empty-states ✔ (was already passing; 26 hand-rolled states from audit are absent — all routes use `EmptyState`).

**Checks (all ✔):** check:empty-states · check:icon-labels · check:colors · check:formatters · check:effect-fetches · check:dead-code · check:query-scope · madge circular (components/ui, components/shared, components/editor).

**Test summary:** 188 component tests, 0 failures (10 new tests for EmptyState filter-empty).

**OUT-OF-OWNERSHIP:** `hooks/api/ai-credits.ts` (S09 item 9) — add `enabled: useCan("billing:ai-credits:view")` to `useAiCreditsWallet`, `useAiCreditTransactions`, `useAiCreditsUsage`; file is outside L25 ownership (`hooks/api/**`).
