# 36 — Every ticket write maintains the concurrency token, and no write touches a deleted row

**What to build:** Whichever route changes a ticket, its concurrency token moves. Only five of the eleven writers increment it today, so a compare-and-swap guarded on the token can be defeated by any of the other six: a rank change, a bulk transition or an epic edit leaves the token where it was, and the next stale-token write is accepted as current. The check looks present and is decorative.

One mechanism, not eleven. The database is the natural place — a row-level trigger on update makes all eleven writers correct at once and makes a twelfth writer correct on arrival. If the trigger is chosen, the hand-written increments must come out in the same change or the token double-steps and every honest client gets a spurious conflict.

The same pass closes a second hole in the same shape: the epic update path filters on id, organisation, project and type but not on the soft-delete column, so a deleted epic is editable and the write succeeds silently.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] Each of the eleven ticket write paths leaves the token higher than it found it, with a test per path
- [ ] The token moves exactly once per statement — no path double-increments
- [ ] Updating a soft-deleted epic is rejected as not found
- [ ] The existing conflict behaviour on ticket update is unchanged and its spec still passes
- [ ] If a trigger is used, its migration is journalled with a rollback authored and is applied before any code depends on it
- [ ] The mechanism is named in the module's notes as the single place the token is maintained
