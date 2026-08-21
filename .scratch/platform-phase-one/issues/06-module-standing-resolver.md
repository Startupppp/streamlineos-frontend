# 06 — Module owner and module admin answer one question

**What to build:** A module owner is stored as a lifecycle record; a module admin is stored as a ranked role assignment. Both shapes are correct for what they model — exactly one owner per module, many admins — but every consumer has to know both mechanisms and ask two separate questions. That is a significant reason the ladder was only ever built for ten of eighteen modules: nothing forces a new module to acquire both rungs.

Bring them under one resolution interface. A consumer asks a single question — what is this person's standing in this module — and receives owner, admin, member or none.

**Storage does not change.** The ten working modules are not migrated, so the risk of this work stays confined to adding modules rather than altering ones that work.

**Blocked by:** None — can start immediately

**Status:** DONE — every criterion verified 2026-08-21

- [x] One interface returns standing for any person and module, handled exhaustively by callers
- [x] Organisation owner and organisation admin resolve as having module-management authority everywhere
- [x] Ownership transfer remains owner-only; an admin cannot perform it
- [x] Holding a module's manage permission grants viewing access administration but never management authority — the property that stops a grant becoming a back door
- [x] Every existing behaviour across the ten working modules is unchanged, proven by their current specs passing untouched
- [x] Adding a nineteenth module requires no change to this interface

---

## Validation — 2026-08-21

Every criterion above is ticked because it was verified individually, not because the work felt finished. Evidence, deviations and corrections are recorded in the commit that closed this ticket and in the `PAGES.md` changelog entry for 2026-08-21.

Highlights: one rules table answers standing, manage-authority and transfer-authority, so they cannot drift; the ten working modules' specs pass **unedited** because query order and count were preserved deliberately. Two corrections to this ticket's text: there is no eighteen-module list in code (10 managed, 12 catalogued), and `ownership-transfers.service.ts` deliberately keeps its own check because it distinguishes a missing ownership record (404) from a non-owner (403).

This is done.
