# 09 — The chat client stops knowing that a ticket has an assignee

**What to build:** Move assigning, setting a due date and creating a task from a message onto the generic action path, deleting the bespoke client pieces as each one lands.

Ticket 04 proved the path with one action. This one finishes the migration, so that after it the client contains no literal path for any individual action and no dialog that knows what a ticket's fields are.

**Blocked by:** 04 — Generic action path, one action end-to-end.

**Status:** ready-for-agent
> **Status re-verified 2026-08-23: **NOT DONE — PARTIAL**.** Backend is done and the two dialogs now post through `useSubmitEntityAction`, so nothing is broken. What remains is the point of the ticket: `POST /chat/entity-actions/available` has **zero frontend callers**, and `chat-bubble.tsx` still hardcodes `useCan("build:tickets:update"|":view"|":create"|":assign")` at lines 129, 264, 350, 351, 360. A CRM deal shared in chat therefore offers no actions to someone without Build permissions - the defect the seam exists to remove.


- [ ] Assigning a ticket, setting a due date and creating a task from a message all work through the generic submit route.
- [ ] Each still announces itself in the conversation with the same message as before, and the announcement still unfurls the record.
- [ ] The bespoke assign dialog and due-date dialog are deleted once nothing imports them.
- [ ] The four bespoke client hooks collapse to one.
- [ ] The client contains no literal path for an individual action.
- [ ] Actions are fetched for the visible references in one batched call rather than one per bubble.
- [ ] A test asserts **discovery and submission cannot disagree**: an action the actor was not offered is refused on submission. This is what turns the discovery route from a convenience into a contract.
- [ ] The four original endpoints are still present and still pass their guard specs. Their removal is ticket 14.
- [ ] Deleting the dialogs is proven with a module-graph tool and a real build, not import search — a bare side-effect import is invisible to a from-based scan and has already cost this codebase a live file.
