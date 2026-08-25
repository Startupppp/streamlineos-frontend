# 01 — A provider event is recorded before it is acted on

**What to build:** Every notification from the payment provider is verified and stored under its own event id before any work happens, so a replayed notification is a no-op by construction rather than by each handler happening to be idempotent.

**Blocked by:** None — can start immediately

**Status:** ready-for-agent

## Acceptance criteria

- [ ] The signature is verified before any side effect, including before the ledger write.
- [ ] Every provider event is stored with the provider's event id, unique.
- [ ] A duplicate event short-circuits and changes nothing.
- [ ] A forged event changes nothing and is reported.
- [ ] Out-of-order arrival does not corrupt state.

## Todo

- [ ] Insert first, act second
- [ ] Test replay, out-of-order and forged in one suite
- [ ] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md)

---

PRD: [`c17 — Every billing write is provable`](../prd.md) · Candidate index: [`../README.md`](../README.md)
