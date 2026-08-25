# c24 · The design system is the only way to build a screen

**Status: mostly met; four drifts and one accessibility gap.** Verified at source 2026-08-25. The measured discipline is genuinely good and better than most codebases of this size: **zero arbitrary colour classes across 591k lines**, zero circular dependencies, zero dead files across 4,429, **zero `useEffect` firing an API call**, zero business route handlers in the web app, and only 41 files over 500 lines. Of 261 pages not referencing the page wrapper directly, only 13 genuinely lack it — the rest correctly delegate to a feature component that has it, which is the mandated pattern rather than a violation. **What remains is drift against canonical components, and one real accessibility gap.**

## Problem Statement

**As a user relying on a screen reader, most icon-only buttons do not tell me what they do.** 487 icon-only buttons exist against 78 with a same-line accessible label. A same-line search undercounts, so the true gap needs triage rather than a precise figure — but it is the clearest accessibility debt in the product, and the project's own checklist already requires the label.

**As a user, empty states look different on different screens.** 91 hand-rolled empty states exist against a canonical component. Same story for 10 local currency formatters and around 25 status badges bypassing the shared badge.

**As a user, currency is formatted inconsistently.** Ten independent formatters mean rounding, symbol placement and locale can differ between two screens showing the same number.

**As a developer, I do not know which component is canonical.** When a screen needs an empty state, the neighbouring file has a hand-rolled one, so that becomes the pattern. The canonical component exists and loses by proximity.

**As a developer, validation schemas are inline in components.** 202 files declare an inline schema object in a component file, against a convention that puts them in a schema file beside the feature. This is acknowledged legacy drift.

**As a user, the app pays for memoization that does nothing.** 4,134 memoized callbacks against 6 memoized components. Almost all pay allocation and comparison cost for no benefit, because the child re-renders anyway.

## Solution

**Fix accessibility first**, because it is the only item here that excludes people rather than merely being inconsistent. Triage the icon-only buttons — the count needs verifying properly — and add labels. Then make the absence fail a check, so the gap cannot reopen.

**Close the four drifts by making the canonical component the easy path**, and adopt when a file is touched. Deliberately **not** a sweep: 91 empty states replaced in one change is a large diff with no user-visible benefit and real regression risk.

**Stop adding memoization rather than removing it.** The existing 4,134 are mostly harmless waste; a sweep to remove them is risk without reward. The rule is: add no memoization you have not measured.

**Record what is already correct** so it is not re-audited. Zero arbitrary colours, zero effect-driven fetches and zero business routes in the web app are the properties that keep this codebase legible, and each should be asserted rather than assumed.

## User Stories

1. As a screen-reader user, I want every icon-only button to announce its purpose, so that I can operate the product.
2. As a screen-reader user, I want form fields associated with their labels, so that I know what I am filling in.
3. As a screen-reader user, I want an error announced when it appears, so that I learn a submission failed.
4. As a keyboard user, I want every interactive control reachable and operable, so that I do not need a mouse.
5. As a keyboard user, I want a visible focus indicator, so that I know where I am.
6. As a keyboard user, I want focus trapped in a modal and restored on close, so that I do not lose my place.
7. As a user with low vision, I want text and controls to meet contrast requirements, so that I can read them.
8. As a user who prefers reduced motion, I want animation suppressed, so that the product does not cause discomfort.
9. As a user, I want empty states to look and read the same everywhere, so that the product feels like one product.
10. As a user, I want an empty state to tell me what to do next, so that an empty screen is not a dead end.
11. As a user, I want currency formatted identically everywhere, so that the same amount reads the same on every screen.
12. As a user, I want status badges to use consistent colour and wording, so that I can read status at a glance.
13. As a user on a phone, I want every screen usable at the smallest supported width, so that the product works on mobile.
14. As a user, I want a loading state on every screen that fetches, so that a blank region is never ambiguous.
15. As a user, I want an error state with a way to retry, so that a failure is recoverable.
16. As a developer, I want one canonical component per pattern, so that I do not choose between five.
17. As a developer, I want the canonical component to be the easiest option, so that the right thing is also the fast thing.
18. As a developer, I want validation schemas beside the feature, so that a schema is findable and reusable.
19. As a developer, I want to add memoization only where measured, so that the codebase does not accumulate unmeasured cost.
20. As a developer, I want the zero-arbitrary-colour property preserved, so that token discipline does not erode.
21. As a developer, I want no data fetching from effects, so that the query layer stays the single fetch path.
22. As a reviewer, I want a missing accessible label to fail a check, so that accessibility does not depend on someone noticing.
23. As a reviewer, I want a new hand-rolled empty state to be caught in review, so that drift does not resume.

## Implementation Decisions

**Already shipped — assert these, do not re-audit them**

- **Zero arbitrary colour classes across 591k lines.** The token discipline holds. Note the precision point: 54 inline colour styles and 256 raw hex literals do exist, mostly chart seeds and avatar-colour generators, which are legitimate — the banned Tailwind form is what is at zero.
- **Zero `useEffect` firing an API call.** Fetching goes through the query layer everywhere. This is unusual and worth protecting.
- **Zero business route handlers in the web app.** The frontend/backend boundary holds.
- **Zero circular dependencies, zero dead files, 41 files over 500 lines out of 4,429.**
- **The page wrapper pattern is correctly applied.** Delegating to a feature component that carries it is the mandated pattern; only 13 pages genuinely lack it.
- **Canonical components already exist** for empty state, currency and status badge. Nothing needs designing.

**To build**

- **Triage the icon-only buttons properly.** The same-line count undercounts, so the first task is an accurate list, not a fix. Then label them, prioritising primary navigation and destructive actions.
- **A lint rule for accessible labels on icon-only controls**, so the gap cannot reopen. The rule is the durable part; the labels are the one-time work.
- **Fix the 13 pages genuinely missing the page wrapper.**
- **Adopt canonical components when a file is touched**, not as a sweep. Empty states, currency formatting and status badges.
- **Delete the local duplicates as their last caller migrates**, so the canonical one wins by being the only one.
- **Move inline schemas per file when touched**, never as a sweep. Recorded as accepted legacy drift.
- **No memoization sweep.** Add none that is not measured; leave the existing ones.
- **Accessibility checks in CI** covering contrast, labelling and keyboard reachability on the shared components — which is where the leverage is, since every screen composes them.
- **Responsive behaviour at the three supported widths** verified on the shared components for the same reason.

## Testing Decisions

**What makes a good test here.** Test the shared components hard and the screens lightly. Every screen composes the same dozen primitives, so an accessibility assertion on the primitive covers hundreds of screens, while the same assertion repeated per screen is unmaintainable and still incomplete.

- **Automated accessibility assertions on every shared component** — labelling, roles, contrast, focus order. This is the highest-leverage test in the spec.
- **Icon-only buttons expose an accessible name.** Assert on the shared button component, and add a lint rule for call sites. The rule catches what the test cannot reach.
- **Keyboard operation of composite components** — modal focus trap and restore, menu arrow-key navigation, form submission by keyboard alone.
- **Reduced-motion preference suppresses animation**, asserted on the shared animated wrapper.
- **Currency formatting is single-sourced** — one formatter, asserted across locales, zero, negative and large values. Then a lint rule against a second formatter appearing.
- **Empty, loading and error states render** for the shared list and page primitives, with a working retry from the error state.
- **Responsive rendering at the three supported widths** for shared layout components.
- **The measured properties are asserted in CI** — zero arbitrary colour classes, zero effect-driven API calls, zero business route handlers, zero circular dependencies. These are cheap greps that protect properties which took real discipline to reach.
- **Prior art**: the existing shared component tests, the sidebar permission coverage test, and the hydration and cache-across-navigation tests, which already demonstrate testing a behaviour at the shared layer rather than per screen.

## Out of Scope

- Redesigning the design system.
- Sweeping the 91 empty states, 10 formatters or 25 badges in one change.
- Sweeping the 202 inline schemas.
- Removing existing memoization.
- Offline and reconnect handling, a recorded product decision.
- Server-rendering rollout, which is c8's and is closed.
- Full accessibility certification.

## Further Notes

This is the section of the review where the honest verdict is **mostly KEEP**, and the numbers deserve stating because they are unusual: zero arbitrary colour classes across 591k lines, and not one effect firing an API call. Both are properties that erode silently under delivery pressure, and neither has eroded here. The most valuable thing this spec does may be asserting them in CI so they stay true.

The accessibility item is the exception and should not be softened by the good news around it. 487 icon-only buttons against 78 labelled ones is a gap that **excludes people from using the product**, and it is the only item in this spec with that character — everything else is inconsistency. It belongs ahead of the drift work for that reason alone, and the count needs verifying properly before it is worked, because a same-line search is the wrong instrument for it.
