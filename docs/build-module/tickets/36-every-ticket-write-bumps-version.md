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

## Progress — 2026-09-27

Trigger made unconditional (`NEW.version := OLD.version + 1` — no conditional). All hand-written
`version: sql\`${tickets.version} + 1\`` increments removed from: `projects-tickets-update.service.ts`,
`build-ticket-bulk-mutation.ts`, `projects-tickets-rank-utils.ts`, `build-automation-actions.service.ts`.
`updateEpic` now rejects soft-deleted epics via `isNull(tickets.deletedAt)`.

Census of all UPDATE paths on `build.tickets` (18 call sites across 12 files):
`cron-projects.service.ts`, `bugs.service.ts` (×2), `build-entity.actions.ts` (×3),
`entries-period.service.ts`, `build/execution/timesheets.service.ts`, `modules.service.ts`,
`epics.service.ts` (×2), `projects-write.service.ts` (×2), `cycles.service.ts`,
`projects-tickets.service.ts` (×3), `projects-tickets-update.service.ts`, `projects-tickets-rank-utils.ts`,
`projects-members.service.ts`, `projects-custom-states.service.ts` (×2), `build-automation-actions.service.ts` (×3),
`build-ticket-bulk-mutation.ts`, `client-visibility.service.ts`.
All covered by the unconditional trigger. Lifecycle exceptions: `epics.service.ts:92` and
`cycles.service.ts:161` null out FKs on parent delete — these are intentional and trigger still fires.
Hard-deletes (`tx.delete(tickets)`) do not fire an UPDATE trigger, which is intentional.

Migration 1373 authored with rollback; journal entry required from coordinator (not yet applied).

- [ ] Journal 1373, apply to DB, and verify behaviorally before removing application-level increments from deployment
- [ ] Per-path tests for each write path showing version increases (integration tests against real DB are authoritative; unit tests with mocks do not prove trigger fires)
- [ ] Name the mechanism in module notes
