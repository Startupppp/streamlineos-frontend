# 06 — Module owner and module admin answer one question

**What to build:** A module owner is stored as a lifecycle record; a module admin is stored as a ranked role assignment. Both shapes are correct for what they model — exactly one owner per module, many admins — but every consumer has to know both mechanisms and ask two separate questions. That is a significant reason the ladder was only ever built for ten of eighteen modules: nothing forces a new module to acquire both rungs.

Bring them under one resolution interface. A consumer asks a single question — what is this person's standing in this module — and receives owner, admin, member or none.

**Storage does not change.** The ten working modules are not migrated, so the risk of this work stays confined to adding modules rather than altering ones that work.

**Blocked by:** None — can start immediately

**Status:** ready-for-agent

- [ ] One interface returns standing for any person and module, handled exhaustively by callers
- [ ] Organisation owner and organisation admin resolve as having module-management authority everywhere
- [ ] Ownership transfer remains owner-only; an admin cannot perform it
- [ ] Holding a module's manage permission grants viewing access administration but never management authority — the property that stops a grant becoming a back door
- [ ] Every existing behaviour across the ten working modules is unchanged, proven by their current specs passing untouched
- [ ] Adding a nineteenth module requires no change to this interface
