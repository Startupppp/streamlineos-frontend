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

- [x] Listing channels issues **no** write. **This is the mutation check** — a test asserts the read path calls no `update`. — `listMemberChannels` calls `resolveEntityChannelDisplayName` (no DB write; returns in-memory); `chat-channels.spec.ts:109` asserts `expect(updateSpy).not.toHaveBeenCalled()` — 2/2 pass.
- [x] The name is resolved when the entity channel is created, so the common case never needs a repair. — `getOrCreateEntityChannel` inserts `name: resolution.card.title` (`chat-channels.service.ts:395`); new entity channels store the resolved title from the start.
- [x] Reconciliation for existing fallback names happens outside the read path — a background pass or an explicit refresh, whichever is smaller. Say which and why. — **Explicit refresh** via `POST :channelId/refresh-name` (`chat-channels.controller.ts:157–167` → `reconcileEntityChannelDisplayName` at `service:81–88`); smaller than a background pass: no cron or worker needed, fires on demand when the record title has changed.
- [x] The displayed name still resolves correctly for a channel created before this change. Falling back to the stored name in the response is fine; **writing it during a read is not**. — `resolveEntityChannelDisplayName` resolves live and returns `{ ...channel, name: resolved }` in-memory; on adapter failure it returns the original `channel` (stored name); no write ever fires on the list path.
- [x] `EntityAdapter` declares whether `resolve` is pure. If an adapter may have side effects, that is on the interface where an implementer reads it. — `entity-reference.types.ts:71`: `// Pure: no writes, no observable side effects; a miss returns unresolved, never forbidden.`
- [x] A failing or slow adapter degrades one channel's display name and does not fail or delay the list. — `Promise.allSettled` at `chat-channels.service.ts:193`; rejected resolutions fall back to `ch` (original row, `service:197–198`); `chat-channels.spec.ts:115` "falls back to the stored name when the adapter fails without aborting the list" — 2/2 pass.
- [x] Adapter registration is reviewed: the two adapters are hardcoded in a `useFactory`, so a third entity type is a code change to the module rather than a registration. **If making it a real registration is more than a small change, say so and leave it** — note it for a follow-up rather than growing this ticket. — `entity-reference.module.ts:22–26`: `BuildEntityAdapter` and `CrmEntityAdapter` hardcoded in `useFactory`; a third type requires editing that factory; left for follow-up as the criterion prescribes.
- [x] `tsc --noEmit` exit 0 and the chat and entity-reference specs pass by path. — `tsc --noEmit` clean (no output); `chat-channels.spec.ts` 2/2; `entity-reference.service.spec.ts` 9/9.
- [x] `chat-entity-actions.controller.e2e-spec.ts` passes under `pnpm test:e2e`, run explicitly. **10/10** (re-run 2026-08-24 with `--runInBand`).

  The diagnosis above was right about the symptom and the cause was mine: R02's split made `MODULE_CATALOG` money-only, and `test/helpers/sign-token.ts` built `ALL_MODULES` from it — so chat and kb silently dropped out of every e2e token and the gate fired at 402. Fixed by sourcing it from `moduleIds()`, the full registry, which is what "all modules" was always meant to say.
- [x] `madge --circular` clean. — `npx madge@8 --circular --extensions ts src` from backend root: `✔ No circular dependency found!`
