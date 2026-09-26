# Wave-B-12 requests

## Request 1: Client portal C3 — core fields are not implemented

**Filed by:** Wave-B-12 (chat / feedbucket / client portal)
**Affects:** `docs/build-module/10-project-client-portal.md` — C3

**Issue:** `ClientVisibilityPage` (`frontend/features/build/client-portal/client-visibility-page.tsx`) implements ticket and milestone visibility toggles only. The spec's core fields are:

- `grant` — not implemented
- `publication state` — not implemented
- `expiry` — not implemented
- `preview content` — not implemented

The page only toggles `clientVisible` on individual tickets and milestones. There is no grant management UI, no publication on/off switch, no expiry date picker, and no preview pane showing what the client actually sees.

**Ask:** Before C3 can be ticked for the client portal:
1. Implement grant management (invite/revoke client access tokens) with `ConfirmDialog destructive` for revocation.
2. Add a publication state toggle (portal published / unpublished) with an optimistic mutation.
3. Add an expiry date picker for portal access, gated on `build:clientvisibility:manage`.
4. Add a preview panel or a "View as client" link so internal managers can audit the client projection.

Each of these four features needs a test covering at minimum the ready state and the permission-denied state.

---

## Request 2: Chat C5 — contract tests are absent

**Filed by:** Wave-B-12 (chat / feedbucket / client portal)
**Affects:** `docs/build-module/10-project-chat.md` — C5

**Issue:** C5 requires "server/client schemas, errors, cursor semantics, cache keys, optimistic patches, and invalidations have contract tests." No such tests exist for the chat endpoints. Specifically:

- `useEntityChannel` response contract is not verified against a backend Zod schema.
- No test asserts that cursor pagination is keyset-only (no total) for the messages list.
- `CHAT_KEYS` cache key factory is not tested for tenant-safety or filter inclusion.

**Ask:** Add contract tests for:
1. `useEntityChannel` — parse a real response through the hook's Zod contract and assert it does not throw on the fields the UI reads.
2. Message cursor pagination — assert `pageInfo.nextCursor` is present and `total` is absent from the list response contract.
3. `CHAT_KEYS` — assert the key factory includes `channelId` and does not include `orgId` (tenant-scope is hash-only per FE-20).
