# 01 — Icon-only buttons are triaged and labelled

**What to build:** A screen-reader user can operate the product. Today most icon-only buttons announce nothing. The count needs verifying properly first — a same-line search undercounts, so the first task is an accurate list rather than a fix.

**Blocked by:** None — can start immediately

**Status:** ready-for-agent

## Acceptance criteria

- [ ] An accurate list of unlabelled icon-only controls exists, not a same-line approximation.
- [ ] Primary navigation and destructive actions are labelled first.
- [ ] Every icon-only control announces its purpose.
- [ ] The shared button component exposes an accessible name, asserted by test.
- [ ] The 13 pages genuinely missing the page wrapper are fixed.

## Todo

- [ ] Build the accurate list before fixing anything — the reported figure is an undercount
- [ ] Prioritise destructive actions
- [ ] Assert on the shared component, which covers hundreds of screens
- [ ] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md)

---

PRD: [`c24 — The design system is the only way to build a screen`](../prd.md) · Candidate index: [`../README.md`](../README.md)
