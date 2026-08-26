# 02 — A webhook acknowledges only durable work

**What to build:** A customer who pays gets what they paid for. Today the credit grant is fired without being awaited, with a log-only error handler, and the endpoint returns success — so if the grant fails the provider is told everything worked, the payment is recorded, and the credits never arrive. Nothing knows to retry.

**Blocked by:** 01 — A provider event is recorded before it is acted on

**Status:** ready-for-agent

## Acceptance criteria

- [ ] The endpoint returns success only after the work has committed, or after it is durably enqueued on the outbox.
- [ ] Forcing the credit grant to fail makes the endpoint return a failure so the provider retries — this is the direct regression test for the live defect.
- [ ] No partial state persists after a failed attempt.
- [ ] A retry after failure does not double-credit.
- [ ] Failed provisioning is visible in a queue rather than lost.
- [ ] A customer whose payment succeeded but provisioning did not is informed.

## Todo

- [ ] Remove the fire-and-forget with a logging catch
- [ ] Route through the outbox, which already has consumers and a dead state
- [ ] Assert the failure response explicitly
- [ ] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md)

---

PRD: [`c17 — Every billing write is provable`](../prd.md) · Candidate index: [`../README.md`](../README.md)
