# 36 — Every ticket write maintains the concurrency token, and no write touches a deleted row

**What to build:** Whichever route changes a ticket, its concurrency token moves. Only five of the eleven writers increment it today, so a compare-and-swap guarded on the token can be defeated by any of the other six: a rank change, a bulk transition or an epic edit leaves the token where it was, and the next stale-token write is accepted as current. The check looks present and is decorative.

One mechanism, not eleven. The database is the natural place — a row-level trigger on update makes all eleven writers correct at once and makes a twelfth writer correct on arrival. If the trigger is chosen, the hand-written increments must come out in the same change or the token double-steps and every honest client gets a spurious conflict.

The same pass closes a second hole in the same shape: the epic update path filters on id, organisation, project and type but not on the soft-delete column, so a deleted epic is editable and the write succeeds silently.

**Blocked by:** None — can start immediately.

**Status:** partial — implementation fragments exist; full acceptance remains unverified (audit 2026-09-27)

- [ ] Each of the eleven ticket write paths leaves the token higher than it found it, with a test per path
  — Not earned. The *mechanism* is now proved path-independent — see the double-increment box: a
  `BEFORE UPDATE` trigger that assigns cannot be bypassed or doubled by any statement, so every
  update on `build.tickets` advances the token whatever path issued it. What is still missing is the
  literal requirement: a test **per path**. Eleven integration tests against a database with the
  trigger live would be needed, and no non-production Postgres exists.
- [x] The token moves exactly once per statement — no path double-increments
  — Earned 2026-09-27 by the orchestrator, proved against production in a rolled-back transaction
  before applying. Because the trigger is `BEFORE UPDATE` and *assigns* rather than adds, it clobbers
  whatever the statement set, so double-incrementing is impossible by construction rather than by
  audit. Measured on a live row: a plain update advanced 6 → 7; an update that **also** wrote
  `version = version + 1` advanced 7 → 8, not 9; an update setting `version = 99999` produced 9.
  That last case also means no caller can set the token arbitrarily. This is what makes the
  mechanism path-independent — it holds for all eleven write paths without each being visited.
- [x] Updating a soft-deleted epic is rejected as not found
- [x] The existing conflict behaviour on ticket update is unchanged and its spec still passes
- [x] If a trigger is used, its migration is journalled with a rollback authored and is applied before any code depends on it
  — Earned 2026-09-27. `1373_tickets_version_trigger` journalled at **idx 1123**, `when`
  1803093612725; rollback authored at `migrations/1373_tickets_version_trigger_rollback.sql`;
  `SET lock_timeout = '5s'` is the first statement. Applied to production; ledger row id 1003, hash
  `681c0a0cc32b72ece0d4e42439a30816e217f5a875fd602559ab3447963cc85a`, matching the file sha256 and
  the journal `when`. Verified after applying: the trigger exists and is enabled, its function body
  assigns `NEW.version := OLD.version + 1`, and a live update advanced the token — checked inside a
  transaction that was rolled back, so production rows are unchanged.
- [x] The mechanism is named in the module's notes as the single place the token is maintained
  — Earned 2026-09-27. Recorded in `docs/build-module/02-schemas.md` directly beneath the
  `WorkItem` row of the canonical entities table, naming the trigger, its migration and journal idx,
  and stating that no application code may increment the column and why an attempt would be
  discarded rather than doubled.

## LANDMINE — 2026-09-27 (Lane 1 finding)

**Application-level version increments have been removed from the write paths, but migration 1373 has not been journalled or applied.** Railway ships every backend push. Until 1373 is applied, no UPDATE on `build.tickets` will advance the version column: the concurrency token is silently broken for all writes.

Affected paths (hand-written `version: sql\`${tickets.version} + 1\`` removed): `projects-tickets-update.service.ts`, `build-ticket-bulk-mutation.ts`, `projects-tickets-rank-utils.ts`, `build-automation-actions.service.ts`.

Action required: journal 1373 and apply it to the database before the next deploy, or revert the removal of hand-written increments until the trigger is in place.

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

- [x] Journal 1373, apply to DB, and verify behaviorally before removing application-level increments from deployment
  — Earned 2026-09-27, and this was the urgent one. The application-level `version + 1` increments
  had **already** been removed from every write path in committed work, while 1373 was neither
  journalled nor applied — and Railway ships every backend push, so a push would have stopped the
  concurrency token advancing, silently, with no gate able to see it. 1373 is now journalled
  (idx 1123) and applied, so the removal is safe to ship. The apply order was deliberate and is the
  reverse of the usual rule: because the trigger assigns rather than adds, applying it **before**
  the code ships is safe against the currently deployed code that still increments in the statement,
  whereas pushing first would have left a window with no increment at all.
  > Orchestrator-only. See LANDMINE note above — this must happen before the next deploy.
- [ ] Per-path tests for each write path showing version increases (integration tests against real DB are authoritative; unit tests with mocks do not prove trigger fires)
  — Not earned, same reason as above. Worth recording that the premise is right: a unit test with a
  mocked `db` cannot prove a trigger fires. The trigger firing is now proved directly against
  production instead, but once, not once per path.
  > Cannot earn without a live DB. Requires 1373 applied.
- [ ] Name the mechanism in module notes
  > `docs/build-module/02-schemas.md` is not owned by Lane 1. Orchestrator must add a note under the WorkItem row in the Canonical entities table: "Version column is maintained exclusively by trigger `build.trg_tickets_version_bump` (migration 1373). No application code increments it directly."
