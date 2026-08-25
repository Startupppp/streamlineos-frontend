# 05 — The measured properties are asserted in CI

**What to build:** The properties that took real discipline to reach stop depending on everyone remembering. Zero arbitrary colour classes, zero effect-driven fetches, zero business route handlers in the web app and zero circular dependencies are all asserted rather than assumed.

**Blocked by:** None — can start immediately

**Status:** ready-for-agent

## Acceptance criteria

- [ ] Each of the four properties is asserted in CI.
- [ ] The colour check targets the banned Tailwind form only — inline chart seeds and avatar-colour generators are legitimate and must not fail.
- [ ] A violation names the file and the offending construct.
- [ ] Inline schemas in components are recorded as accepted legacy drift, fixed per file when touched, never swept.
- [ ] No memoization sweep is performed; the rule is to add none that has not been measured.

## Todo

- [ ] Cheap greps, high value — these properties erode silently
- [ ] Be precise about the colour check or it will fail on legitimate usage
- [ ] Record the two deliberate non-actions so they are not re-raised
- [ ] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md)

---

PRD: [`c24 — The design system is the only way to build a screen`](../prd.md) · Candidate index: [`../README.md`](../README.md)
