# 03 — A breach fails the build

**What to build:** A change that makes a budgeted query slower stops at CI with the query named and the measured cost shown, so the author fixes it before it ships rather than after a user reports it.

**Blocked by:** 01 — A read budget is data, not a script

**Status:** done

## Acceptance criteria

- [x] The budget run is part of CI against a database rebuilt from empty and seeded.
- [x] A breach exits non-zero and names the query, the measured cost and the budgeted ceiling.
- [x] A deliberately impossible ceiling makes the run fail — proving the guard can fail at all.
- [x] A developer can run the same check locally with one command.
- [x] Raising a ceiling is a visible diff in review.

## Todo

- [x] Wire into CI after the seed step
- [x] Add the self-test that a breach is detected
- [x] Document the local command beside the existing database scripts
- [x] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md)

---

PRD: [`c11 — Make "this query is fast" a thing CI proves`](../prd.md) · Candidate index: [`../README.md`](../README.md)
