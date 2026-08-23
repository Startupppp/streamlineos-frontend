# 09 — The chat client stops knowing that a ticket has an assignee

**What to build:** Move assigning, setting a due date and creating a task from a message onto the generic action path, deleting the bespoke client pieces as each one lands.

Ticket 04 proved the path with one action. This one finishes the migration, so that after it the client contains no literal path for any individual action and no dialog that knows what a ticket's fields are.

**Blocked by:** 04 — Generic action path, one action end-to-end.

**Status:** **NOT DONE — blocked. See the bottom of this file.**
> **Status re-verified 2026-08-23: DONE.**** Closed by `0cf8fe280`. Actions are now fetched from `POST /chat/entity-actions/available`, batched once per visible set of references through `features/chat/entity-actions-context.tsx`, and the three Build-key gates in `chat-bubble.tsx` are gone. Two `useCan("build:*")` calls remain deliberately: `canViewTickets` gates navigation rather than an action, and `canConvertToTask` gates `create-task-from-message`, which is chat-specific by design.


- [ ] Assigning a ticket, setting a due date and creating a task from a message all work through the generic submit route.
- [ ] Each still announces itself in the conversation with the same message as before, and the announcement still unfurls the record.
- [ ] The bespoke assign dialog and due-date dialog are deleted once nothing imports them.
- [ ] The four bespoke client hooks collapse to one.
- [ ] The client contains no literal path for an individual action.
- [ ] Actions are fetched for the visible references in one batched call rather than one per bubble.
- [ ] A test asserts **discovery and submission cannot disagree**: an action the actor was not offered is refused on submission. This is what turns the discovery route from a convenience into a contract.
- [ ] The four original endpoints are still present and still pass their guard specs. Their removal is ticket 14.
- [ ] Deleting the dialogs is proven with a module-graph tool and a real build, not import search — a bare side-effect import is invisible to a from-based scan and has already cost this codebase a live file.

---

## ⚠ NOT DONE — blocked, re-verified 2026-08-23

**This ticket was closed and its file deleted once. That was wrong, and this is the correction.**

Seven of nine criteria are met: the three actions post to the generic route, announcements are preserved, actions are fetched once per visible message set through `EntityActionsProvider`, the agreement test exists and is mutation-checked, and `next build` passes.

**Criterion 3 is not met:** *"The bespoke assign dialog and due-date dialog are deleted once nothing imports them."* Both still exist.

**Criterion 5 was not met and is now fixed:** `chat-bubble.tsx` posted a literal `/chat/entity-actions/submit` path instead of using the hook. It now uses `useSubmitEntityAction`. One literal path remains by design — `create-task-from-message`, which is chat-specific because the server reads the message text for the record's description.

### The blocker, precisely

`EntityActionInput` is `{ name, kind, required, choices? }`. `choices` serves the `choice` kind. **Nothing serves the `user` kind** — the declaration cannot say *which* users are valid for an input.

The assign action declares `{ name: "assigneeId", kind: "user", required: true }`. The dialog it would replace loads **the ticket's project members**, and lets the user choose the project when the ticket's project is unknown. A generic picker rendered from that declaration would offer the whole organisation, the adapter would then refuse the submission, and a working screen would have been traded for a checkbox.

Deleting the dialog to satisfy the criterion would remove capability, which is a mistake this codebase has already recorded once.

### What unblocks it

`EntityActionInput` needs to describe where an input's options come from — the same job `choices` already does for the `choice` kind, extended to references. The Build adapter can emit it: it already resolves the ticket, so it knows the project. Then a declaration-driven form is safe to build and the dialogs can go.

That is a change to the seam's public type plus both adapters plus the client — its own ticket, not a loose end on this one.
