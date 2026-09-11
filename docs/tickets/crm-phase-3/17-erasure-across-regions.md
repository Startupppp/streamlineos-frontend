# 17 — Erasure across every region and generation

**Status:** done — one enumeration, across every region.
**Track:** E — compliance
**Blocked by:** 08, 10

## Why

A right that only works in one region is not a right.

## Acceptance criteria

- [ ] An erasure request **enumerates every configured region**, asserted against a registry with three entries rather than one.
- [ ] Each region records what was deleted or anonymised, with a timestamp.
- [ ] Backup generations are covered by stated policy and schedule, and **the policy is on the record** so the customer can be told when the last copy expires.
- [ ] The request completes within the statutory window, and the window is tracked.
- [ ] Erasure is one of the enumerated exceptions to the platform's soft-delete default.

## Notes (2026-08-26)

See ticket 18: erasure and export are **one mechanism with two terminal
actions**, and building them separately is how an export quietly goes incomplete.

The existing `purge-user.mjs` runs against a single `DATABASE_URL`, so it erases
from the primary and leaves every other region untouched. That is the gap closed.

**Two failure modes are distinguished**, because conflating them is how a partial
erasure gets reported as done. `complete` is a fact about the run. 
`mayReportComplete` is a decision about what may be said: every *configured*
region visited and succeeded. A request that visited two of three has
`complete: true` and may not be reported — exactly the state after a region is
added and the enumeration is not updated.

A failing region does not stop the others; zero records is a completed region,
not a failed one. An empty enumeration **throws** rather than reporting success.

Backups are **stated rather than deleted**. You cannot reach into a backup
generation to remove one subject without invalidating the backup, so the record
carries the date the last copy expires — something true, rather than a promise
nobody can keep.

**Still open:** wiring the per-region work to the real erasure queries, and the
statutory-window tracker. The enumeration and completeness rules are the part
that decides whether the right is real.