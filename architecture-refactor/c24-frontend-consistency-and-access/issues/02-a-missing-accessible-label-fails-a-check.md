# 02 — A missing accessible label fails a check

**What to build:** The accessibility gap cannot reopen. A lint rule catches an unlabelled icon-only control at the call site, which is where a component test cannot reach.

**Blocked by:** 01 — Icon-only buttons are triaged and labelled

**Status:** ready-for-agent

## Acceptance criteria

- [ ] A new icon-only control without an accessible name fails the check.
- [ ] The rule runs in CI.
- [ ] Existing labelled controls pass without modification.
- [ ] The rule is documented alongside the design-system guidance.

## Todo

- [ ] The rule is the durable part; the labels were the one-time work
- [ ] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md)

---

PRD: [`c24 — The design system is the only way to build a screen`](../prd.md) · Candidate index: [`../README.md`](../README.md)
