# 02 — The three providers adopt the deadline

**What to build:** Razorpay, blob storage and email each have a hard deadline, so a degraded provider fails fast instead of holding a database connection and a transaction open indefinitely.

**Blocked by:** 01 — An outbound call cannot be untimed

**Status:** done

## Acceptance criteria

- [x] All three call sites go through the shared helper with a per-provider timeout.
- [x] A timeout leaves the caller in a known state — a payment timeout does not leave a charge unrecorded.
- [x] The storage client is constructed once rather than per call, so connection reuse is not discarded.
- [x] A timeout is reported, not swallowed.

## Todo

- [x] Set per-provider timeouts — a slow-by-nature call should not be held to an interactive deadline
- [x] Hoist the storage client construction
- [x] Check what a timeout leaves behind on the payment path
- [x] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md)

---

PRD: [`c15 — Outbound I/O leaves the request transaction`](../prd.md) · Candidate index: [`../README.md`](../README.md)
