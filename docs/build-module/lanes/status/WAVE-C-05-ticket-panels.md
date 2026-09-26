# WAVE-C-05 — Ticket Panels PageState Adoption

## Finding: ticket-detail route already gates `build:tickets:view`

`ticket-detail-page.tsx` lines 178–184 explicitly render `<NoPermissionState permission="build:tickets:view" />` when `canViewAccess === "denied"`, before any child panel is mounted. The three ticket panels (`TicketChecklists`, `TicketRelations`, `WatcherList`) are never reached by a denied user. The denied branch they previously guarded was unreachable in practice.

**Correction (orchestrator, verified 2026-09-26): `ticket-detail-page` is not the only mount site.**
The three panels are mounted by `ticket-detail-main-section.tsx` and `ticket-detail-right-panel.tsx`,
and those two sections are mounted from **two** places:

| Mount site | Gates `build:tickets:view`? |
|---|---|
| `features/build/ticket-details/ticket-detail-page.tsx` | yes, lines 178–184 |
| `features/build/inbox/inbox-ticket-preview.tsx:276,293` | **no** |

So a user without `build:tickets:view` can reach these panels through the inbox preview, and the
claim "never reached by a denied user" is true only of the page route.

The change is still correct, for a reason the original note did not give: the permission is enforced
server-side, and `pageStateFromError` maps the resulting 403 to `kind: "denied"`, so the panel
renders a denied surface rather than data even with no `permission` argument passed. Nothing leaks.

Two things were checked before accepting it:
- **No query was newly enabled.** In all three panels the data hook was already called
  unconditionally *above* the old `accessState` guard, so removing the guard changed no request that
  the client makes. The previous behaviour was "fetch, then hide the result"; it is now "fetch, then
  show what the server said".
- **The only behaviour change is in the inbox preview**, where such a user previously saw nothing and
  now sees an explained denied panel. That is the intended direction — a silently absent panel is the
  defect this wave was closing.

Do not carry the original sentence forward as "these panels need no permission handling". They need
none *passed to `usePageState`* because the server answers, which is not the same claim.

**Implication:** The valuable part of the conversion for the three ticket panels is the loading/error state handling and removal of the `accessState === "loading"` pop-in — not adding a denied banner. `usePageState` is called without a `permission` argument for these three. `StepTemplate` gates on `build:view` (a different surface — the project creation wizard), so it receives `permission: "build:view"`.

## Rules-of-Hooks audit

All four files were checked for hooks declared after a conditional early return. None were found. In all three ticket panels, `useCallback`/`useMemo` are declared before the removed early return.

## Per-file table

| File | Status | Notes |
|------|--------|-------|
| `ticket-checklists.tsx` | Converted | Removed `useCanState` + guard. Added `isError`/`error`/`refetch` to `useChecklists` destructuring. Loading skeleton via `<Skeleton>`. Wrapped with `<PageState compact loading={skeleton} onRetry={handleRetry}>`. |
| `ticket-relations.tsx` | Converted | Removed `useCanState` + guard, removed hand-rolled `if (isLoading) return null` and `if (isError) return <ErrorState>`. Added `<Skeleton>` loading state (was blank). Removed `ErrorState` import. Wrapped with `<PageState compact>`. |
| `watcher-list.tsx` | Converted | Removed `useCanState` + guard, removed `Loader2` spinner loading state (violated AP-9), removed hand-rolled error state, removed `ErrorState`/`getErrorMessage` imports. Added `<Skeleton>` loading state. Wrapped with `<PageState compact>`. |
| `step-template.tsx` | Converted | Removed `useCanState`, `templateAccessDenied`, `templateAccessGranted`. Simplified `templateList` computation. Added `error` to `useProjectTemplates` destructuring. Added `usePageState({ permission: "build:view", isLoading, isError, error })`. Removed hand-rolled loading/error blocks. Removed `Button` import. Wrapped with `<PageState compact>`. |

## Tests

All four test suites ran to completion. Real output from `npx jest --runTestsByPath`:

```
PASS features/build/project-create/steps/step-template.test.tsx
PASS features/build/ticket-details/ticket-checklists.test.tsx
PASS features/build/ticket-details/watcher-list.test.tsx
PASS features/build/ticket-details/ticket-relations.test.tsx

Test Suites: 4 passed, 4 total
Tests:       23 passed, 23 total
```

- `ticket-relations.test.tsx` — updated existing file (5 tests): replaced the `useCanState`-based denied test with `usePageState`-resolution-based tests; added loading and denied variants; updated error test to use `mockPageStateResolution = { kind: "error" }`.
- `ticket-checklists.test.tsx` — new file (5 tests).
- `watcher-list.test.tsx` — new file (5 tests).
- `step-template.test.tsx` — new file (8 tests).

## What was deliberately skipped

Nothing was skipped. All four files were converted. No blocked items.
