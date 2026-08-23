# U02 — Mentions carry identities

**What to build:** The composer sends the user ids it resolved, and the server validates membership instead of re-guessing from text.

Mentions currently resolve server-side with `memberName.includes(m) || m.includes(firstName)` — bidirectional substring matching, run against every channel member, after loading all of them with their names. `@al` notifies Alex, Alice and Salman. In a company with an Alex and an Alexander, both are notified every time either is mentioned.

The composer already knew exactly who the sender picked from the autocomplete. It throws that away, sends raw text, and the server guesses. Entity references already travel as structured metadata on the same message — mentions should travel the same way.

**Owns (exclusive):**
- `backend/src/modules/chat/chat-mentions.ts` (new)
- `backend/src/modules/chat/chat-mentions.spec.ts` (new)
- `backend/src/modules/chat/chat-message-fanout.service.ts`
- `backend/src/modules/chat/dto/**` (the send-message schema)
- `frontend/features/chat/message-panel.tsx`
- `frontend/hooks/api/chat.ts`

**Blocked by:** U01
**Wave:** 2
**Status:** ready-for-agent

- [ ] The send-message payload carries resolved mention user ids, Zod-validated at the boundary, in a `*-schema.ts` file — never inline in the controller.
- [ ] The server validates each id is an **active member of that channel** and ignores the rest. It never trusts the list.
- [ ] Substring matching is **deleted, not kept as a fallback.** A fallback that fires on the same input is the same bug with a longer name.
- [ ] `@channel`, `@everyone` and `@here` stay server-side. They are a channel-level fact, not an identity the composer resolves.
- [ ] The full member load with names disappears from the send path unless `@channel`-style mentions are present.
- [ ] The client request type mirrors the backend schema exactly. A contract that drifts silently strips the field and the feature becomes a no-op that still returns 200.
- [ ] A test asserts an id that is not a channel member produces no notification.
- [ ] A test asserts two members with overlapping names — "Alex" and "Alexander" — each get exactly one notification, for their own id only.
- [ ] **The mutation check:** a message whose text contains `@alex` but carries no mention metadata produces **no** mention notification. Restore substring matching and this fails.
- [ ] A test asserts `@everyone` still notifies the channel.
- [ ] The composer sends the id for every mention the user picked from autocomplete, and a hand-typed `@name` that was never resolved sends no id.
- [ ] Both repos typecheck. The web `tsconfig.json` excludes tests, so run the web suite as well.
- [ ] **NOT verified unless stated:** no mention was sent through a booted app and observed arriving at the right person.
