# 04 — Change a ticket's status from chat, through a path that knows nothing about tickets

**What to build:** The action half of the entity reference seam, wired end to end for one action.

The seam already resolves a record into a chat bubble and already declares how to ask what actions a person may take on it — but that method has **no caller anywhere in the product**. It is implemented by both adapters, covered by both adapters' tests, and called by nothing. Meanwhile the four action endpoints are named after Build nouns and gated on Build permission keys, and the client posts to four literal paths and imports a bespoke assign dialog and a bespoke due-date dialog.

This ticket delivers one action — changing a ticket's status — through a discovery route, a generic submit route, and a client form rendered from the inputs the action declares. The four existing endpoints stay untouched, so nothing regresses while this is proven.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent
> **Status re-verified 2026-08-23: DONE.** `chat/chat-entity-actions.controller.ts` exposes `@Post("available")` taking a list of references and `@Post("submit")`, both carrying no module permission key.


- [ ] A discovery route returns, per reference, the actions available to the calling actor with their labels and declared inputs. This is the seam's first production caller for that method.
- [ ] The discovery route accepts a **list** of references and answers in one round trip. Fetching per message would reintroduce the request-per-record problem the seam's batching exists to prevent.
- [ ] A submit route accepts a reference, an action identifier and an input object, and returns the seam's result.
- [ ] Both routes are gated on the caller's right to be in the conversation, and carry **no module permission key**. A module key on a generic route is necessarily wrong for every module but one.
- [ ] Authorization for the action is the adapter's, which already does it. A caller lacking the owning module's permission is refused, and the refusal is indistinguishable from outside.
- [ ] An action against a record in a disabled module is refused before the adapter sees it.
- [ ] The failure vocabulary the seam already declares — forbidden, not-found, invalid — maps to status codes following the entity reference seam PRD's mapping. Cross-tenant surfaces as not-found.
- [ ] The client renders text, date, user and choice inputs from the declaration. The user kind uses the existing shared person picker rather than a new one.
- [ ] Changing a ticket's status works through the new path and still announces itself in the conversation, with the message text coming from the adapter.
- [ ] The four existing endpoints are unchanged and their guard specs still pass.
