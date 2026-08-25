# 02 — Six overlapping route groups become one each

**What to build:** The API has one way to do each thing. Six groups of overlapping endpoints collapse to one canonical shape each, with callers updated in the same change and no compatibility shim left behind.

**Blocked by:** 01 — The standard of proof is written down

**Status:** ready-for-agent

## Acceptance criteria

- [ ] Each group has one canonical route; the others are removed.
- [ ] Frontend callers are updated in the same change, so no page breaks.
- [ ] No legacy redirect or shim remains.
- [ ] The surviving route carries the same allow/deny matrix the removed ones had.
- [ ] A real build passes in both repos after each group.

## Todo

- [ ] One group per commit so a revert is surgical
- [ ] Port the controller e2e matrix to the survivor
- [ ] Build, do not just typecheck
- [ ] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md)

---

PRD: [`c18 — Removals are proved, not grepped`](../prd.md) · Candidate index: [`../README.md`](../README.md)
