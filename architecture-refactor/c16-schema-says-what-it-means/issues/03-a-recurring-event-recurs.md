# 03 — A recurring event recurs, or the columns go

**What to build:** The product promises recurring events. The schema records the intent in two columns that are written at two call sites and read by nothing. Either recurrence works, or the columns that pretend it exists are removed — a written-never-read column is worse than a missing feature because it looks implemented.

**Blocked by:** 02 — A calendar event carries its timezone

**Status:** ready-for-agent

## Acceptance criteria

- [ ] A series expands to the expected occurrences, server-side.
- [ ] Changing one occurrence does not alter its siblings.
- [ ] Ending a series retains its past occurrences.
- [ ] Expansion is correct across a daylight-saving boundary.
- [ ] If recurrence is dropped instead, the columns are gone and a test asserts their absence.

## Todo

- [ ] Adopt a standard recurrence representation; do not hand-roll a rule parser
- [ ] Decide expand-on-read versus materialise before building
- [ ] If dropping, remove the writes too
- [ ] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md)

---

PRD: [`c16 — The schema says what it means`](../prd.md) · Candidate index: [`../README.md`](../README.md)
