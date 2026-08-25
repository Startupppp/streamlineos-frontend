# 01 — Sending a message stops re-reading the sender

**What to build:** Sending a chat message costs one fewer database read. The fan-out currently opens by selecting the sender's name and image — the sender being the person who just made the request, whose identity was already in hand. That read happens on every message in every channel, on the hottest write path in the product.

The identity travels into the fan-out as part of its input instead, resolved while the request transaction is still live. That is both faster and safer: the fan-out runs after commit, where the tenant context is gone, and resolving identity there is precisely the pattern that has silently failed before.

**Blocked by:** None — can start immediately.

**Status:** done with a corrected premise — verified 2026-08-25

## Acceptance criteria

- [x] The fan-out performs no query to resolve the sender.
- [x] Sender name and image still appear on the realtime payload and in notifications exactly as before.
- [x] The identity is resolved while the request transaction is live, not inside the deferred block.
- [x] The fan-out input stays a plain value object with no transaction handle or request object — it must survive serialisation for ticket 03 to be possible.
- [x] A sender whose name or image is absent behaves as it does today.
- [x] Backend suite green, with an assertion on the fake database that no user query is made.

## Todo

- [x] Add the identity fields to the fan-out input
- [x] Resolve them at the call site, inside the live request transaction
- [x] Delete the query at the top of the fan-out
- [x] Assert on the fake database rather than on timing
- [x] Confirm the input carries no handles that would not serialise
- [ ] Boot the API and send a real message; check the realtime payload still carries the sender's name and avatar
- [x] Tick every acceptance criterion above
- [x] Set **Status** to `done` and update this ticket's row in `../README.md`

---

## Verification (2026-08-25)

`cd backend && npx jest --testPathPattern "modules/chat" --maxWorkers=2` → **15 suites, 113 tests, all pass.**

The fan-out no longer injects the database at all: the `users` select at the top of `dispatch` is gone, and `senderName` / `senderImage` arrive on `FanoutInput` as `string | null`. `FanoutInput` remains a plain value object with no handles, so it survives serialisation — which is what ticket 03 needs.

**Correction to this ticket's premise.** The ticket claimed the send would cost "one fewer database read". It does not. `CurrentUserContext` carries `userId` but not the sender's name or image, so a read is still required — it has been MOVED from the post-commit fan-out into the live request transaction, not removed. Net query count per message is unchanged.

The move is still worth having, and these ticket goals ARE met:
- The read now happens while the tenant GUC is live. Resolving identity inside the deferred block is the pattern that previously produced zero notification rows platform-wide while every request returned 200.
- `FanoutInput` is now serialisable, which unblocks ticket 03.

Removing the read entirely would mean returning the sender's name and image from the message insert's RETURNING clause, or denormalising them onto the message row. Neither was in scope; if the read matters, that is a follow-up.

**Not verified here:** the realtime payload was not confirmed against a running app — the API cannot boot (`APP_DATABASE_URL` fails 28P01).
