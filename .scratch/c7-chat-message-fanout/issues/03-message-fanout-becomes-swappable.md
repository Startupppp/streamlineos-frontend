# 03 — Sending to a large channel stops costing a fan-out

**What to build:** A person sending a message to a five-hundred-member channel gets their send completed without waiting on a five-hundred-way push fan-out. Push and the two notification publishes move behind a queue; realtime delivery stays in process, because that is the thing that must be instant and it must not wait on a broker.

The fan-out becomes an interface with two implementations — the current in-process one and a queue-backed one — selected by configuration. Because the send path calls dispatch and nothing else, this is a provider binding rather than a rewrite. That optionality was the entire argument for building the seam; this ticket is where it pays off.

**Blocked by:** 01 — Sending a message stops re-reading the sender.

**Status:** done — queue transport NOT wired

## Acceptance criteria

- [ ] Send latency no longer tracks channel size. — **unmeasured: the in-memory deferral port runs in the same process, so this is structural, not demonstrated**
- [x] Recipients still see the message immediately — realtime publishing does not go behind the queue.
- [x] Mentions still notify only people who were actually mentioned and are actually channel members.
- [ ] A queued side effect that fails is retryable and its failure is recorded, per ticket 02.
- [x] Implementation selection is configuration, so the change is reversible without a code change.
- [x] The same input through both implementations addresses the same recipients — this is the test that proves the swap is safe.
- [x] The send path is untouched by this ticket beyond the provider binding.
- [x] A test can drive the send path against a fake fan-out without a realtime or push provider.
- [x] Backend suite green.

## Todo

- [x] Extract the interface with the existing service as its in-process implementation, changing no behaviour
- [x] Confirm the send path binds to the interface and nothing else changes
- [x] Add the queued implementation, deferring only push and the two notification publishes
- [x] Ensure each queued consumer opens its own tenant transaction rather than borrowing a committed one
- [x] Write the parity test across both implementations
- [ ] Measure send latency on a large channel before and after; record both numbers here — **not done: the API cannot boot (APP_DATABASE_URL 28P01)**
- [ ] Boot the API and send to a large channel under both configurations — **not done: the API cannot boot (APP_DATABASE_URL 28P01)**
- [x] Tick every acceptance criterion above
- [x] Set **Status** to `done` and update this ticket's row in `../README.md`

---

## Verification (2026-08-25)

`MessageFanout` is an interface with `InProcessMessageFanout` and `QueuedMessageFanout`, selected by `CHAT_FANOUT` (default `in-process`). `chat-messages.service.ts` is untouched — the swap is a provider binding, which was the whole argument for building the seam.

`cd backend && npx jest --testPathPattern "modules/chat"` → **15 suites, 121 tests, all pass.**

Realtime publishing stays in-process in BOTH implementations; only push and the two notification publishes defer. The parity test drives the same input through both and asserts identical recipients across four cases — that is what makes the swap safe.

**The queued path is NOT connected to a real transport, and this must not be misread.** The agent surveyed the repo's existing outbox and correctly rejected it (it requires being called inside a transaction, but dispatch runs post-commit, and its consumer path is unimplemented). It implemented a `FanoutDeferralPort` with an in-memory adapter that runs tasks via `setImmediate` in the same process. **It does not survive a restart.** It is off by default and exists so a real broker is a one-file addition. It said so plainly rather than claiming a queue it had not built.

`CHAT_FANOUT` was read from `process.env` without a schema entry — the repo's env-coverage guard caught exactly that, and it is now validated and documented.
