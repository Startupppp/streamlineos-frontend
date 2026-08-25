# 04 — The canonical component wins

**What to build:** A developer reaching for an empty state, a currency format or a status badge finds one obvious answer. Today 91 hand-rolled empty states, 10 local currency formatters and around 25 badges bypass the canonical versions — which exist and lose by proximity.

**Blocked by:** None — can start immediately

**Status:** ready-for-agent

## Acceptance criteria

- [ ] Currency formatting is single-sourced, asserted across locales and for zero, negative and large values.
- [ ] A lint rule catches a second formatter appearing.
- [ ] Empty, loading and error states render from the shared primitives, with a working retry from the error state.
- [ ] Local duplicates are deleted as their last caller migrates.
- [ ] Adoption happens when a file is touched — this is explicitly not a sweep.
- [ ] A new hand-rolled empty state is caught in review.

## Todo

- [ ] Make the canonical component the easiest option, then adopt on touch
- [ ] Do not replace 91 empty states in one change — large diff, no user-visible benefit, real regression risk
- [ ] Delete duplicates only when unused
- [ ] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md)

---

PRD: [`c24 — The design system is the only way to build a screen`](../prd.md) · Candidate index: [`../README.md`](../README.md)
