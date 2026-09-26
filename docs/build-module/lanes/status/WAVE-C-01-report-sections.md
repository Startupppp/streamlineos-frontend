# WAVE-C-01 — Build Reports: PageState Adoption

Session date: 2026-09-26

## Per-file decision table

| File | Decision | Reason |
|---|---|---|
| `velocity-section.tsx` | **Converted** | Owns `useVelocityReport` fetch, occupies layout space inside `ChartCard`. Was returning `null` for denied; now shows `DeniedView` via `<PageState compact>`. Also fixed a latent rules-of-hooks violation (no hooks were after early return in this file, but the early-return pattern itself was removed). |
| `burnup-section.tsx` | **Converted** | Owns two fetches (`useVelocityReport` + `useBurnupReport`), occupies layout space. Was returning `null` for denied. Additionally fixed a **rules-of-hooks violation**: `useCallback` and `useMemo` were declared after the conditional early return. Combined `isLoading`/`isError`/`error` across both queries for `usePageState`. Removed `getErrorMessage` import (no longer needed directly). |
| `cfd-section.tsx` | **Converted** | Owns `useCfdReport` fetch, occupies layout space. Was returning `null` for denied. Fixed a **rules-of-hooks violation**: `useCallback` and `useMemo` were declared after the conditional early return. The `LoadingButton` ("Capture today") and the day-range `Select` in the `ChartCard` `actions` slot are mutation/filter affordances — left as-is (action-gating on a panel header, not a data panel). |
| `cycle-time-section.tsx` | **Converted** | Owns `useCycleTimeReport` fetch, occupies layout space. Was returning `null` for denied. |
| `lead-time-section.tsx` | **Converted** | Owns `useLeadTimeReport` fetch, occupies layout space. Was returning `null` for denied. |
| `critical-path-section.tsx` | **Converted** | Owns `useCriticalPath` fetch, occupies layout space. Was returning `null` for denied. Removed `getErrorMessage` import (PageState handles error rendering internally). |
| `reports-agile-tab.tsx` | **Left alone — pure composer** | Renders no data of its own; it composes the six section components and the `ReportsExportButton`. No access check, no data fetch, no inline ladder. Nothing to convert. |

## What changed in each converted file

- Removed `useCanState("build:view")` and the `if (accessState === "denied" || accessState === "loading") return null` guard.
- Added `usePageState({ permission: "build:view", isLoading, isError, error, isEmpty })`.
- Wrapped chart content in `<PageState resolution={resolution} loading={...} empty={...} onRetry={handleRetry} compact>`.
- All `useCallback` / `useMemo` calls moved before any conditional logic (fixing pre-existing rules-of-hooks violations in burnup and cfd).
- `error` is always passed to `usePageState` (FE-41 compliance).

## Test results

File: `features/build/reports/reports-agile-tab.test.tsx`

36 tests, 36 passed, 0 failed.

```
VelocitySection — page states (6 tests)
BurnupSection — page states (6 tests)
CycleTimeSection — page states (6 tests)
LeadTimeSection — page states (6 tests)
CfdSection — page states (6 tests)
CriticalPathSection — page states (6 tests)
```

Each section has: permission+error forwarding assertion, loading, error, empty, positive-control (data reaches chart), and denied (shows `no-permission` instead of blank).

## What was deliberately not done

- `reports-agile-tab.tsx` was not modified (it is a pure composer).
- The `LoadingButton` / `Select` in CfdSection's ChartCard `actions` slot were left in place. After conversion the whole section shows a DeniedView for denied users, so those controls are never reachable when access is denied. Separately gating those affordances with `useCan` (FE-44) would be a separate, narrower change.
- No type assertions, no `as X`, no `@ts-ignore` introduced.
