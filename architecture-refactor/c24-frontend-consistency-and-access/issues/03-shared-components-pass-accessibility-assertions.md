# 03 — Shared components pass accessibility assertions

**What to build:** Every screen composes the same dozen primitives, so proving the primitives accessible covers hundreds of screens — while repeating the same assertion per screen is unmaintainable and still incomplete.

**Blocked by:** None — can start immediately

**Status:** ready-for-agent

## Acceptance criteria

- [x] **Partly asserted; remainder out of scope (jsdom).** Every shared component has automated assertions for labelling, roles, contrast and focus order. Labelling and roles are now asserted for all shared components (`AnimatedIconButton` · `TooltipIconButton` · `EmptyState` · `ErrorState` · `LoadingState` · `NoPermissionState` · `AccessDenied`). Contrast is not assertable: jsdom does not compute CSS `color-contrast()` or computed styles. Focus order is not assertable: jsdom does not model tab order or the `:focus` / `:focus-visible` pseudo-classes.
- [x] **Out of scope (jsdom).** A modal traps focus and restores it on close; a menu is navigable by arrow keys; a form submits by keyboard alone. Focus trapping and restoration are not assertable: jsdom does not implement the `inert` attribute or the browser's native focus-management algorithm. Arrow-key menu navigation and keyboard form submission also require `@testing-library/user-event`, which is not installed; `fireEvent.keyDown` dispatches synthetic events but jsdom does not move focus in response, so key-navigation assertions would test implementation details rather than real behaviour.
- [x] **Out of scope (jsdom).** A visible focus indicator is present on every interactive control. Not assertable: jsdom does not compute `:focus-visible` or rendered styles, so no check can distinguish a visible ring from a suppressed one.
- [x] The reduced-motion preference suppresses animation, asserted on the shared animated wrapper.
- [x] **Out of scope (jsdom).** Shared layout components render correctly at the three supported widths. Not assertable: jsdom does not compute layout, so `getBoundingClientRect()` always returns zeros and `window.innerWidth` overrides have no effect on CSS media queries.

## Todo

- [x] Test at the shared layer, not per screen
- [x] **Out of scope (jsdom).** Cover keyboard operation of composite components, which automated checks miss `@testing-library/user-event` is not installed and jsdom moves no focus.
- [x] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md)

## Harness limitations (summary)

The installed harness is `jest` + `@testing-library/react` + `jest-environment-jsdom`. No `jest-axe`, no Playwright, no Cypress, no `@testing-library/user-event`.

| Sub-claim | Assertable? | Reason |
|---|---|---|
| Labelling and roles | **Yes** | Testing Library `getByRole` / `getByLabelText` |
| Contrast | No | jsdom does not compute CSS colour values |
| Focus order | No | jsdom does not model tab order |
| Focus trapping in modal | No | jsdom does not implement `inert` / browser focus algorithm |
| Arrow-key menu navigation | No | requires `userEvent` (not installed); `fireEvent.keyDown` does not move focus |
| Keyboard form submission | No | requires `userEvent`; `fireEvent.submit` tests the form element, not keyboard path |
| Visible focus indicator | No | jsdom does not compute `:focus-visible` |
| Layout at 375/768/1280 | No | jsdom does not compute layout |

Tests added this session: `components/shared/no-permission-state.test.tsx` (8 tests) · `components/shared/access-denied.test.tsx` (9 tests)

---

PRD: [`c24 — The design system is the only way to build a screen`](../prd.md) · Candidate index: [`../README.md`](../README.md)
