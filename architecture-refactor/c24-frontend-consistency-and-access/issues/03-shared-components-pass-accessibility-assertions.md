# 03 — Shared components pass accessibility assertions

**What to build:** Every screen composes the same dozen primitives, so proving the primitives accessible covers hundreds of screens — while repeating the same assertion per screen is unmaintainable and still incomplete.

**Blocked by:** None — can start immediately

**Status:** ready-for-agent

## Acceptance criteria

- [ ] Every shared component has automated assertions for labelling, roles, contrast and focus order.
- [ ] A modal traps focus and restores it on close; a menu is navigable by arrow keys; a form submits by keyboard alone.
- [ ] A visible focus indicator is present on every interactive control.
- [x] The reduced-motion preference suppresses animation, asserted on the shared animated wrapper.
- [ ] Shared layout components render correctly at the three supported widths.

## Todo

- [x] Test at the shared layer, not per screen
- [ ] Cover keyboard operation of composite components, which automated checks miss
- [ ] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md)

---

PRD: [`c24 — The design system is the only way to build a screen`](../prd.md) · Candidate index: [`../README.md`](../README.md)
