# 02 — Six overlapping route groups become one each

**What to build:** The API has one way to do each thing. Six groups of overlapping endpoints collapse to one canonical shape each, with callers updated in the same change and no compatibility shim left behind.

**Blocked by:** 01 — The standard of proof is written down

**Status:** ready-for-agent — BLOCKED on c18-01 (retention marker + frontend cycle CI not done)

**Audit note (2026-08-26):** c18-01 is partially done but two items remain open. Until c18-01 closes, this ticket cannot start. No implementation work has started here; all criteria and todos are genuinely open. The specific six overlapping route groups are not named in this ticket — they must be identified from access logs and route analysis as part of 01's prerequisite work.

## Acceptance criteria

- [ ] Each group has one canonical route; the others are removed. — **BLOCKED:** c18-01 not closed.
- [ ] Frontend callers are updated in the same change, so no page breaks. — **BLOCKED:** c18-01 not closed.
- [ ] No legacy redirect or shim remains. — **BLOCKED:** c18-01 not closed.
- [ ] The surviving route carries the same allow/deny matrix the removed ones had. — **BLOCKED:** c18-01 not closed.
- [ ] A real build passes in both repos after each group. — **BLOCKED:** c18-01 not closed.

## Todo

- [ ] One group per commit so a revert is surgical — **BLOCKED:** c18-01 not closed.
- [ ] Port the controller e2e matrix to the survivor — **BLOCKED:** c18-01 not closed.
- [ ] Build, do not just typecheck — **BLOCKED:** c18-01 not closed.
- [ ] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md) — **BLOCKED:** c18-01 not closed.

---

PRD: [`c18 — Removals are proved, not grepped`](../prd.md) · Candidate index: [`../README.md`](../README.md)
