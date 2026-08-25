# 01 — The standard of proof is written down

**What to build:** A developer knows what evidence justifies a deletion, so nobody repeats the scan that nearly deleted a third of a working API.

**Blocked by:** None — can start immediately

**Status:** ready-for-agent

## Acceptance criteria

- [ ] The standard is recorded: a module-graph tool plus a real build for files; access logs for endpoints; symbol, raw-name, foreign-key and spec checks for tables.
- [ ] The rule that a scan reporting near-total deadness is a broken scan is recorded, with the three examples.
- [ ] The deliberately-unused schema barrel carries an explicit retention marker, so tooling and people both see it is intentional.
- [ ] Dead-code checks run in CI, reporting rather than failing, so the number is visible.
- [ ] The zero-cycle property is asserted in CI for both repos.

## Todo

- [ ] Write the standard beside the existing tooling
- [ ] Add the retention marker
- [ ] Wire the reporting check
- [ ] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md)

---

PRD: [`c18 — Removals are proved, not grepped`](../prd.md) · Candidate index: [`../README.md`](../README.md)
