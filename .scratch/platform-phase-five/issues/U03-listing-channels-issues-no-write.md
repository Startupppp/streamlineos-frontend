# U03 — Listing channels issues no write

**What to build:** The entity-channel rename leaves the read path, and the adapter interface declares the side effect it triggers.

`ensureEntityChannelDisplayName` (`chat-channels.service.ts:59`) runs a DB `UPDATE` inside `getMyChannels`:

```ts
await this.db.update(chatChannels).set({ name: resolved }).where(eq(chatChannels.id, channel.id));
```

It fires on every channel-list read where the name is still the fallback string, and the thing that triggers it is `EntityAdapter.resolve()` — an interface declaring three methods, none of which suggests that calling it may rewrite a row in an outer module. An adapter author cannot know. A slow or flaky adapter holds up the channel list for everyone in the org.

There is no write in a GET, and a side effect a seam does not declare is a side effect nobody maintains.

**Owns (exclusive):**
- `backend/src/modules/chat/chat-channels.service.ts`
- `backend/src/modules/chat/chat-channels.spec.ts`
- `backend/src/modules/entity-reference/entity-reference.types.ts`
- `backend/src/modules/entity-reference/entity-reference.module.ts`

**Blocked by:** nothing — no file overlap with U01 or U02
**Wave:** 1
**Status:** DONE

- [ ] Listing channels issues **no** write. **This is the mutation check** — a test asserts the read path calls no `update`.
- [ ] The name is resolved when the entity channel is created, so the common case never needs a repair.
- [ ] Reconciliation for existing fallback names happens outside the read path — a background pass or an explicit refresh, whichever is smaller. Say which and why.
- [ ] The displayed name still resolves correctly for a channel created before this change. Falling back to the stored name in the response is fine; **writing it during a read is not**.
- [ ] `EntityAdapter` declares whether `resolve` is pure. If an adapter may have side effects, that is on the interface where an implementer reads it.
- [ ] A failing or slow adapter degrades one channel's display name and does not fail or delay the list.
- [ ] Adapter registration is reviewed: the two adapters are hardcoded in a `useFactory`, so a third entity type is a code change to the module rather than a registration. **If making it a real registration is more than a small change, say so and leave it** — note it for a follow-up rather than growing this ticket.
- [ ] `tsc --noEmit` exit 0 and the chat and entity-reference specs pass by path.
- [ ] `chat-entity-actions.controller.e2e-spec.ts` passes under `pnpm test:e2e`, run explicitly — e2e specs are excluded from the default run.
- [ ] `madge --circular` clean.
