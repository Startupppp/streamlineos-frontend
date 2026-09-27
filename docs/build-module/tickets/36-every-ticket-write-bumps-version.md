# 36 — Every ticket write maintains the concurrency token, and no write touches a deleted row

**What to build:** Whichever route changes a ticket, its concurrency token moves. Only five of the eleven writers increment it today, so a compare-and-swap guarded on the token can be defeated by any of the other six: a rank change, a bulk transition or an epic edit leaves the token where it was, and the next stale-token write is accepted as current. The check looks present and is decorative.

One mechanism, not eleven. The database is the natural place — a row-level trigger on update makes all eleven writers correct at once and makes a twelfth writer correct on arrival. If the trigger is chosen, the hand-written increments must come out in the same change or the token double-steps and every honest client gets a spurious conflict.

The same pass closes a second hole in the same shape: the epic update path filters on id, organisation, project and type but not on the soft-delete column, so a deleted epic is editable and the write succeeds silently.

**Blocked by:** None — can start immediately.

**Status:** partial — implementation fragments exist; full acceptance remains unverified (audit 2026-09-27)

- [ ] Each of the eleven ticket write paths leaves the token higher than it found it, with a test per path
- [ ] The token moves exactly once per statement — no path double-increments
- [ ] Updating a soft-deleted epic is rejected as not found
- [ ] The existing conflict behaviour on ticket update is unchanged and its spec still passes
- [ ] If a trigger is used, its migration is journalled with a rollback authored and is applied before any code depends on it
- [ ] The mechanism is named in the module's notes as the single place the token is maintained

## Verified remaining work — 2026-09-27

`backend/migrations/1373_tickets_version_trigger.sql` exists but is absent from the journal, while
`projects-tickets-update.service.ts:290-296` no longer increments the version itself. Deployment
must not rely on an unapplied trigger. The trigger condition only replaces an unchanged version,
so a caller-provided lower or arbitrarily higher value bypasses the intended increment.

- [ ] Make the trigger own `NEW.version = OLD.version + 1` unconditionally and verify explicit-version writes cannot decrease or skip the token
- [ ] Journal, apply and behaviorally verify 1373 before deploying code that removes application increments; record the deployed backend identity and rollback ordering
- [ ] Re-enumerate actual writers instead of the historical eleven; include `cycles.service.ts:161` unlinking and other writes to deleted rows, with deliberate lifecycle exceptions documented

Epic deleted-row guard unit tests pass, but mocked version results are not evidence that this
trigger executes. The original five-of-eleven description is historical, not a current census.
