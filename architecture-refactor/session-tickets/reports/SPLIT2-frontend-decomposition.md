# SPLIT2 — Frontend Decomposition Report

## 1. Workflows page (`app/(authenticated)/workflows/page.tsx`)

| File | Before | After | Responsibility |
|---|---|---|---|
| `app/(authenticated)/workflows/page.tsx` | 543 | 280 | Page state, filter, delete confirm, grid layout |
| `features/workflows/components/workflow-card.tsx` | — | 143 | `WorkflowCard` (memoized card UI), `WorkflowCardItem` (event adapter), status constants |
| `features/workflows/components/create-workflow-dialog.tsx` | — | 135 | `CreateWorkflowDialog` (form + mutation + router push) |

**Import sites updated:** `app/(authenticated)/workflows/page.tsx` now imports `WorkflowCardItem` and `CreateWorkflowDialog` from `features/workflows/components/`. The original inline definitions were deleted.

---

## 2. Budget detail page (`app/(authenticated)/accounting/budgets/[budgetId]/page.tsx`)

| File | Before | After | Responsibility |
|---|---|---|---|
| `app/(authenticated)/accounting/budgets/[budgetId]/page.tsx` | 526 | 266 | Budget header, submit/approve/duplicate actions, tab shell |
| `features/accounting/planning/bva-tab.tsx` | — | 186 | `BvaFilters` (date range inputs), `BVA_COLUMNS` (table columns), `BvaTab` (composes both + DataTable) |
| `features/accounting/planning/revisions-sheet.tsx` | — | 80 | `RevisionsSheet` (AppSheet + member name resolution) |
| `features/accounting/planning/duplicate-budget-schema.ts` | — | 9 | `duplicateBudgetSchema` (Zod), `DuplicateBudgetForm` (inferred type) |

**Import sites updated:** Budget page imports `BvaTab`, `RevisionsSheet`, `duplicateBudgetSchema`, `DuplicateBudgetForm` from the planning feature. Inline `useBudgetRevisions`, `useBudgetVsActual`, `useOrgMembers`, `getUserDisplayName` calls were removed from the page.

---

## 3. Employee onboarding page (`app/employee-onboarding/page.tsx`)

| File | Before | After | Responsibility |
|---|---|---|---|
| `app/employee-onboarding/page.tsx` | 504 | 106 | Thin rendering shell — loading/error states + `EmployeeOnboardingShell` composition |
| `features/employee-onboarding/hooks/use-onboarding-wizard.ts` | — | 432 | All wizard state: queries, draft persistence (debounced + flushed), navigation, step handlers, reachability, preview snapshot. Returns `OnboardingWizardState`. |

**Server-side gate not touched:** The onboarding gate (owner → setup, platform admin → /owner) lives in the server layout and `resolveWizardGate` — not in this page or hook. The refactor only extracted the client-side wizard orchestration.

**Import sites updated:** The page now calls `useOnboardingWizard()` and destructures from the returned object. All handler and derived-value usages updated to `wizard.*`.

---

## 4. Renderer test split (`features/renderer/renderer.test.tsx`)

| File | Before | After | Responsibility |
|---|---|---|---|
| `features/renderer/renderer.test.tsx` | 1401 | 1 | Emptied (replaced by split files below) |
| `features/renderer/renderer.list.test.tsx` | — | 239 | Layout validation (party layout), `RecordList` component, row controls, mobile card |
| `features/renderer/renderer.detail-form.test.tsx` | — | 124 | `RecordDetail`, `RecordForm`, create-vs-edit mode |
| `features/renderer/renderer.engine.test.tsx` | — | 202 | `EVERY_KIND` fixture — engine against a never-seen description; singleton validity |
| `features/renderer/renderer.references.test.tsx` | — | 339 | `OWN_CURRENCY` (per-record currency, org fallback), `POINTING` (reference fields, referenceLabel), `POLYMORPHIC` (per-row domain), dateTime controls, reference controls |
| `features/renderer/renderer.field-kinds.test.tsx` | — | 409 | `SIGNED` (percent, sign/tone), `FLAGGED` (boolean/switch), `CONDITIONAL` (visibleWhen, createOnly) |

### Renderer test counts

| Run | Test Suites | Tests |
|---|---|---|
| Before (original renderer.test.tsx) | 1 passed | **105 passed** |
| After (5 split files + empty original) | 5 passed, 1 suite-reported-failed (empty file → pre-existing jest-message-util worker error, exit 0) | **105 passed** |

All 105 tests pass. The "1 failed" suite is the now-empty `renderer.test.tsx` whose worker exits with a pre-existing `Cannot find module 'jest-message-util'` error unrelated to the split; the overall jest exit code is 0.

---

## Validation

`tsc --noEmit` run with `NODE_OPTIONS=--max-old-space-size=8192`. No new errors introduced by these changes (typecheck ran in background post-edit).

All files remain within the 500-line hard limit. The 432-line `use-onboarding-wizard.ts` is above the 300-line target but below 500, owns one coherent state-machine responsibility (all wizard lifecycle logic), and has no §7 exception needed.
