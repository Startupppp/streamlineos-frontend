# 03 — Sending to a large channel stops costing a fan-out

**What to build:** A person sending a message to a five-hundred-member channel gets their send completed without waiting on a five-hundred-way push fan-out. Push and the two notification publishes move behind a queue; realtime delivery stays in process, because that is the thing that must be instant and it must not wait on a broker.

The fan-out becomes an interface with two implementations — the current in-process one and a queue-backed one — selected by configuration. Because the send path calls dispatch and nothing else, this is a provider binding rather than a rewrite. That optionality was the entire argument for building the seam; this ticket is where it pays off.

**Blocked by:** 01 — Sending a message stops re-reading the sender.

**Status:** ready-for-agent

## Acceptance criteria

- [ ] Send latency no longer tracks channel size.
- [ ] Recipients still see the message immediately — realtime publishing does not go behind the queue.
- [ ] Mentions still notify only people who were actually mentioned and are actually channel members.
- [ ] A queued side effect that fails is retryable and its failure is recorded, per ticket 02.
- [ ] Implementation selection is configuration, so the change is reversible without a code change.
- [ ] The same input through both implementations addresses the same recipients — this is the test that proves the swap is safe.
- [ ] The send path is untouched by this ticket beyond the provider binding.
- [ ] A test can drive the send path against a fake fan-out without a realtime or push provider.
- [ ] Backend suite green.

## Todo

- [ ] Extract the interface with the existing service as its in-process implementation, changing no behaviour
- [ ] Confirm the send path binds to the interface and nothing else changes
- [ ] Add the queued implementation, deferring only push and the two notification publishes
- [ ] Ensure each queued consumer opens its own tenant transaction rather than borrowing a committed one
- [ ] Write the parity test across both implementations
- [ ] Measure send latency on a large channel before and after; record both numbers here
- [ ] Boot the API and send to a large channel under both configurations
- [ ] Tick every acceptance criterion above
- [ ] Set **Status** to `done` and update this ticket's row in `../README.md`
