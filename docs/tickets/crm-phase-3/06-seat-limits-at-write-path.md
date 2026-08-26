# 06 — Seat limits enforced at the write path

**Status:** not started
**Track:** B — enforcement
**Blocked by:** — (can start immediately)

## Why

A cap that is not enforced is a marketing claim, not a limit. Every creation
endpoint for a limited resource already calls the limit assertion; seats are the
gap.

## Acceptance criteria

- [ ] Every membership creation path asserts the limit **inside the same transaction** as the insert.
- [ ] The assertion holds under concurrent creation, proven by a test that races two creations at the boundary.
- [ ] Bulk invitation reserves quota **once for the batch**, not per row.
- [ ] The refusal explains what the limit is and how to raise it.
- [ ] An administrator sees seats used against seats available before hitting the limit.
