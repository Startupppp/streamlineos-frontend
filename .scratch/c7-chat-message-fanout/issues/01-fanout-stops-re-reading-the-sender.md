# 01 — Sending a message stops re-reading the sender

**What to build:** Sending a chat message costs one fewer database read. The fan-out currently opens by selecting the sender's name and image — the sender being the person who just made the request, whose identity was already in hand. That read happens on every message in every channel, on the hottest write path in the product.

The identity travels into the fan-out as part of its input instead, resolved while the request transaction is still live. That is both faster and safer: the fan-out runs after commit, where the tenant context is gone, and resolving identity there is precisely the pattern that has silently failed before.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

## Acceptance criteria

- [ ] The fan-out performs no query to resolve the sender.
- [ ] Sender name and image still appear on the realtime payload and in notifications exactly as before.
- [ ] The identity is resolved while the request transaction is live, not inside the deferred block.
- [ ] The fan-out input stays a plain value object with no transaction handle or request object — it must survive serialisation for ticket 03 to be possible.
- [ ] A sender whose name or image is absent behaves as it does today.
- [ ] Backend suite green, with an assertion on the fake database that no user query is made.

## Todo

- [ ] Add the identity fields to the fan-out input
- [ ] Resolve them at the call site, inside the live request transaction
- [ ] Delete the query at the top of the fan-out
- [ ] Assert on the fake database rather than on timing
- [ ] Confirm the input carries no handles that would not serialise
- [ ] Boot the API and send a real message; check the realtime payload still carries the sender's name and avatar
- [ ] Tick every acceptance criterion above
- [ ] Set **Status** to `done` and update this ticket's row in `../README.md`
