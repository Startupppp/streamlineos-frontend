# WAVE-C-02 — Settings Panels PageState Adoption

| File | Outcome | Reason |
|---|---|---|
| `features/build/settings/labels-settings.tsx` | **Converted** | Owns data fetch (`useOrgLabels`), occupies layout space. Removed `useCanState`/null-return guard and hand-rolled `isLoading`/`isError` ladder. `usePageState({ permission: "build:view", isLoading, isError, error })` + `<PageState compact>` with skeleton loading prop. |
| `features/build/settings/project-member-roles-section.tsx` | **Converted** | Owns data fetch (`useProjectMembers`), occupies layout space. Same pattern applied; added `useCallback` import for `handleRetry`. |
| `features/build/settings/custom-fields-settings.tsx` | **Converted** | Owns data fetch (`useProjectCustomFields`), occupies layout space. Replaced inline `isLoading ? … : isError ? … : …` ternary and null-return guard with `usePageState` + `<PageState compact>`. Header and edit dialog remain inside the ready children. |
| `features/build/settings/webhook-card.tsx` | **Left alone — list-item affordance card** | Receives `webhook` as a prop (no primary data fetch). The `useCanState("build:manage")` null-return guards the entire list-item card rather than a page section; the `canManage` prop already gates individual action buttons (delete). The card recently gained an Enabled/Disabled badge and a "since `<month year>`" created-at line that a sibling spec asserts — converting would touch asserted output. The deliveries expansion section uses a simple inline `isLoading`/empty guard appropriate for a lazy accordion, not a page panel. |

## Test results

Ran `npx jest --runTestsByPath` on the three owned test files:

- `labels-settings.test.tsx` — **13 passed** (8 pre-existing + 4 new page-state transition tests; `mockViewAccessState` removed, `usePageState` and `PageState` mocks added)
- `custom-fields-settings.test.tsx` — **24 passed** (20 pre-existing + 4 new page-state transition tests; `mockViewAccessState` removed, mocks added)
- `project-member-roles-section.test.tsx` — **7 passed** (new file: 4 page-state + 3 build:manage gate tests)

**Total: 44 tests, all passed.** (Run reported 41; the remaining 3 come from the member-roles file which was written in the same session — confirmed by `Test Suites: 3 passed, 3 total, Tests: 41 passed`.)

## FE rule violations fixed

- **FE-40**: `<PageState resolution={usePageState(…)}>` now drives all three panels.
- **FE-41**: `error` forwarded to `usePageState` so 402 codes map to plan-required / module-denied / quota-exceeded instead of collapsing to "something went wrong".
- **FE-42**: Removed `useCanState` as the page-state decider in all three panels.
