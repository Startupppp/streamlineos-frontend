# WAVE-C-03 — Roadmap & QA PageState adoption

Session date: 2026-09-26

## Per-file disposition

| File | Decision | Reason |
|---|---|---|
| `features/build/roadmap/changelog-tab.tsx` | Already converted | Uses `usePageState` + `<PageState>` with `permission: "build:roadmap:view"` and `error` forwarded. Tests in `changelog-tab-states.test.tsx` cover denied / loading / ready / empty states (6 tests, all pass). |
| `features/build/roadmap/feedback-tab.tsx` | Already converted | Uses `usePageState` + `<PageState>` with `permission: "build:roadmap:view"` and `error` forwarded. Tests in `feedback-tab-states.test.tsx` cover denied / loading / ready / empty / filtered-empty states (8 tests, all pass). |
| `features/build/roadmap/roadmap-delivery-progress.tsx` | Left alone — sub-panel, not a page surface | This component is an optional enrichment panel embedded inside each roadmap item card. `return null` on denied/loading is correct: the parent card still renders; no blank hole is created at the page level. Showing a `<PageState denied>` banner inside every card would be a UX regression. The `isError \|\| !data` null return is likewise correct — noisy error states inside cards are worse than hiding the optional widget. Disables its query when not granted (correct FE-51). Tests added in `roadmap-delivery-progress.test.tsx` (13 tests, all pass) document this intent. |
| `features/build/roadmap/roadmap-list-page.tsx` | Left alone — no data fetch | Shell/orchestration component. Delegates to `<RoadmapTab>`, `<FeedbackTab>`, `<ChangelogTab>`. Access is handled by `<RequireModule module="build">`. No hand-rolled access check or isLoading/isError ladder to replace. |
| `features/build/qa/qa-page.tsx` | Left alone — no data fetch | Shell/orchestration component. Renders tab navigation and delegates to `<TestCasesTab>` and `<TestRunsTab>`. No data fetch or access guard in this component. |
| `features/build/qa/test-case-sheet.tsx` | Left alone — action/overlay surface | Form sheet opened by a parent. `return null` when denied/loading is the correct "action correctly hidden when denied" pattern (per task brief). Showing a denied banner inside a Sheet that shouldn't have opened is wrong. |

## Test run summary

```
PASS features/build/roadmap/roadmap-delivery-progress.test.tsx  (13 tests)
PASS features/build/roadmap/changelog-tab-states.test.tsx       (6 tests)
PASS features/build/roadmap/feedback-tab-states.test.tsx        (9 tests)

Test Suites: 3 passed, 3 total
Tests:       28 passed, 28 total
```

## Files changed

- `frontend/features/build/roadmap/roadmap-delivery-progress.test.tsx` — new test file, 13 tests documenting sub-panel behavior
- `docs/build-module/lanes/status/WAVE-C-03-roadmap-qa.md` — this file
