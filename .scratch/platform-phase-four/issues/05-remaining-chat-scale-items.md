# 05 — The chat scale items that are left, and what each one actually is

**What this records:** the four remaining items from the chat review, re-measured. Two are not defects; two need a number I cannot get from source.

**Blocked by:** a production row count for the partitioning question.

**Status:** CLOSED — measured; partitioning refused on the number, serial keys converted.

## Not defects — closing these

- [x] **The Ably capability cap is not silent.** `MAX_CAPABILITY_CHANNELS = 500` was reported as silently truncating a user's realtime channels. It logs `ably: channel capability list truncated` with the org, the user, the total and the granted count (`ably.service.ts:34-41`). A bounded capability list is deliberate — Ably tokens have a size limit — and it is observable. No change.
- [x] **The push fan-out is not an N+1 in the dangerous sense.** `sendToChannelMembers` issues its sends with `Promise.allSettled`, so they are concurrent rather than serial, and it is `await`ed inside the send path rather than fired after commit — so it does not run on a dead tenant context, which was the failure mode worth fearing.

## Real, but a design change on the hot path

- [x] **A message sender no longer waits for every push — and this was fixed by U01, not by this ticket.** The premise above is now stale and was re-checked at source rather than assumed: `chat-messages.service.ts` builds the whole fan-out as a `deferred` closure wrapped in `runInNewTenantTransaction`, hands it to `registerAfterCommit(deferred)`, and **returns the message immediately**. `TenantContextInterceptor` then fires each hook with `void hook().catch(...)` after the transaction commits — never awaited — so the response is not held for push, Ably or mention delivery.

  Exactly what this ticket asked for: deferred past the response, in its own tenant transaction because the request's has committed. The failure it feared — running on a dead tenant context — is handled by that new transaction, and the failure is logged rather than swallowed, as §4 requires.

  Confirmed against a running system, not on a type-check: `pnpm verify:chat-mentions` sends real messages through a booted API and observes delivery arriving on Ably **after** the 201 returns.
- [x] Its member read carries no explicit `orgId` predicate. **FIXED** (`96b8fef2`) — `sendToChannelMembers` now takes `orgId` and puts `eq(chatChannelMembers.orgId, orgId)` in the query beside the channel predicate. Done ahead of the deferral above rather than waiting for it, because it was two lines and the caller already held `orgId`; backend §4's point is that a table whose policy is ever missed is readable org-wide with no visible symptom.

## Needs a number before it is a decision

- [x] **`chat_messages` is unpartitioned, and stays that way. Measured: 2 rows, 136 kB.** §3 says do not partition a table that is not demonstrably large, so this is refused on the number rather than deferred. Revisit on a real row count.
- [x] ~~**`chat_messages` is unpartitioned.**~~ Backend §3 is explicit: *do not partition a table that is not demonstrably large, and record the triggering row count in the migration.* I cannot query production, so I cannot supply that number, and partitioning on a guess is exactly what the rule forbids. Get `count(*)` and the growth rate first. Note the ordering trap §3 also names: the partition key must be in every PK and UNIQUE, so the primary key becomes `(id, created_at)` and bare `id` stops being globally unique — that decision comes *before* partitioning, not after.
- [x] **DONE — twelve chat tables converted to `generatedAlwaysAsIdentity` (migration `0460`, applied).** Done *now* precisely because they hold 20 rows between them, which makes the rewrite free; after real traffic it would not be. Each sequence restarts above its table's max, verified so no insert can collide. Originally:
- [x] ~~**Twelve chat tables use `serial` primary keys**~~ against the `generatedAlwaysAsIdentity` rule. This is a real inconsistency and a wide, mechanical migration. It is worth doing as its own expand–contract stream, and worth doing *before* partitioning, since partitioning rewrites the primary keys anyway.
