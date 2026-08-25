# 04 — Post-commit work carries tenant context

**What to build:** Work registered to run after a commit can write to the database. Today those hooks drain after the tenant wrapper returns, so the injected handle reaches the pool with no tenant context and fails with a permission error — this has already broken notification delivery for every organisation while the endpoint returned success.

**Blocked by:** None — can start immediately

**Status:** ready-for-agent

## Acceptance criteria

- [ ] A post-commit hook performing a write succeeds rather than failing with a tenant permission error.
- [ ] A streaming response does not commit its transaction while work is still outstanding.
- [ ] A hook that fails is reported, not discarded.
- [ ] The regression is covered by a test that would have caught the original incident.

## Todo

- [ ] Route hooks through the mechanism that opens its own tenant context
- [ ] Check the streaming handler's commit point against its stream lifetime
- [ ] Verify by running the app and watching a real delivery
- [ ] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md)

---

PRD: [`c15 — Outbound I/O leaves the request transaction`](../prd.md) · Candidate index: [`../README.md`](../README.md)
