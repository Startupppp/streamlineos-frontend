# 02 — Party becomes the truth, and legacy tables become a mirror

**Status:** done — Party is written first and the legacy tables are a derived mirror (`party-legacy-writer.ts`).
**Track:** A — identity convergence
**Blocks:** 03-08
**Blocked by:** 01

## Why

The dual-write window is the risk in this whole programme: for as long as two
forms of the same customer both accept writes, they can disagree, and a reader
cannot tell which is right.

Bounding it is a decision, not a mechanism. Party is canonical from this ticket
onward. Legacy tables are still written so that unmigrated modules keep working,
but they are never read as truth again — which makes a divergence a stale
mirror rather than two competing sources.

## Acceptance criteria

- [ ] Every write path that creates or updates a contact, client, lead or
      business party writes the Party row first and the legacy row second, in
      one transaction, so a partial write is impossible.
- [ ] The legacy row is derived from the Party row, not written independently —
      one function produces it, so the two cannot drift through a forgotten field.
- [ ] A divergence check runs on demand and reports any legacy row disagreeing
      with its Party. It is a report, not a repair: silently rewriting one side
      would destroy the evidence of how they diverged.
- [ ] Deleting through either surface soft-deletes the Party and its mirror
      together.
- [ ] Every existing e2e suite for every consuming module passes unchanged. If a
      suite needs editing, behaviour changed and that is the finding.

## Notes

Do not remove any legacy write here. Removal is ticket 08, gated on every
migrate batch being done.
