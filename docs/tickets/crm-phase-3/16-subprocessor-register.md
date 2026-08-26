# 16 — The subprocessor register

**Status:** done — a register, with subscribers.
**Track:** E — compliance
**Blocked by:** — (can start immediately)

## Why

A register is data, not a PDF that goes stale.

## Acceptance criteria

- [ ] The register is a table with a public page, not a document.
- [ ] A customer can subscribe to changes and is notified when one occurs.
- [ ] Each entry carries purpose, location and the date it was added.
- [ ] A data-processing agreement is available without negotiation.

## Notes (2026-08-26)

A table with a public page over it, so a change to a row is an event somebody
can be told about rather than a PDF that goes stale the week after it is written.

**Not tenant-scoped, and therefore deliberately without an RLS policy.** Our
subprocessors are the same for every customer; a per-tenant register would imply
each organisation has its own set, which is untrue and a strange thing to assert
to a regulator.

**Retired processors stay**, with a retirement date. A reviewer checking a past
period needs to know who processed their data *then*, and deleting the row erases
exactly what the register exists to answer. `changesSince` reports retirements as
well as additions for the same reason — a notification that only reported
additions would let a customer believe a departed processor still holds their
data.

`effective_from` is when they started processing, not when the row was written,
so a register backfilled today does not claim every subprocessor began today.

Subscribers are emails, not users: the reviewer is often counsel with no login,
and requiring one makes the notification useless to the people it is for.
Re-subscribing clears a previous unsubscribe rather than inserting a second row —
two rows for one address is how unsubscribing stops working.

Both routes carry **real** rate-limit tiers rather than borrowed names.
`CLAUDE.md` records that an unknown key silently disables the limit, and the file
already carries a SEC-004 comment about three routes that shipped exactly that way.

**Still open:** sending the notification (this records who wants it and what
changed), the public page itself, and the DPA.