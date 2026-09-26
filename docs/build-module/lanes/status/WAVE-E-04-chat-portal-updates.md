## Wave-E-04 — chat C5 / client portal C3 / updates C3

Session agent: B-4  
Pages: `10-project-chat.md`, `10-project-client-portal.md`, `10-project-updates.md`

---

### Deliverables

| File | Change |
|------|--------|
| `frontend/features/chat/__tests__/chat-cursor-and-cache-keys.test.ts` | New — 12 tests: `fetchChannelPage` stale cursor guard (6 cases) + `collaborationQueryKeys.chat` prefix semantics (6 cases) |
| `frontend/hooks/api/chat-mutations-contract.test.tsx` | New — 6 tests: `useSendMessage` optimistic patch shape, rollback, two invalidations; `useEditMessage` invalidation; `useDeleteMessage` invalidation |
| `frontend/features/build/updates/updates-page.test.tsx` | Extended — 4 new tests: status badge, audience badge, Post Update button (paired positive), Delete button (paired positive); `PageWrapper` mock extended to render `actions` |
| `docs/build-module/10-project-chat.md` | Ticked C5 |

---

### Criteria status

#### `10-project-chat.md`

| # | Criterion | Status |
|---|-----------|--------|
| C5 | Contract tests | CLOSED — cursor guard tested in `chat-cursor-and-cache-keys.test.ts`; cache key prefix semantics tested in same file; optimistic patch shape + rollback tested in `chat-mutations-contract.test.tsx`; all four invalidation paths (messages, myChannels, chat.all×2) tested; server/client schemas already covered by `response-contracts-chat.test.ts` (506 lines, bite+accept pairs) |

All six C5 items now have contract tests:
1. **Server/client schemas**: `response-contracts-chat.test.ts` — strict bite+accept on every wire shape
2. **Errors**: paired states covered across page and schema tests
3. **Cursor semantics**: `fetchChannelPage` guard tests — caps nextCursor, calls reportError, preserves channels, no false triggers on null/undefined cursor
4. **Cache keys**: `collaborationQueryKeys.chat.messages` prefix semantics — channel isolation, all-prefix, cursor-variant prefix, channel-vs-messages separation
5. **Optimistic patches**: `useSendMessage` appends id<0 message to page[0] before server responds; rollback restores empty cache on rejection
6. **Invalidations**: messages(channelId), myChannels(), chat.all×2 all verified via `invalidateQueries` spy

#### `10-project-client-portal.md`

| # | Criterion | Status |
|---|-----------|--------|
| C3 | Fields, states, permissions | OPEN — `ClientVisibilityPage` only covers ticket/milestone visibility toggles; core fields `grant`, `publication state`, `expiry`, and `preview content` from the spec are not implemented (no backend API endpoints exist for them); C3 cannot be ticked until these are implemented |

#### `10-project-updates.md`

| # | Criterion | Status |
|---|-----------|--------|
| C3 | Fields, states, permissions | OPEN — `UpdateCard` renders `status`, `audience`, `body`, and `createdAt`; the spec fields `wins`, `risks`, `next`, `citations`, and author display are not in the backend schema (`updateRowContract` has no `wins`/`risks`/`next`/`citations` columns); C3 cannot be ticked until those fields are implemented in the backend |

---

### Gaps documented (not fixed — backend work required)

**Client portal**: `grant`, `publication state`, `expiry`, `preview content` — not implemented. `ClientVisibilityPage` is a ticket/milestone toggle page only.

**Updates**: `wins`, `risks`, `next`, `citations`, `author` display — not in `updateRowContract`. The `body` field is the only narrative field backed by a schema column. Implementing these requires a backend migration and schema addition before frontend work is meaningful.
