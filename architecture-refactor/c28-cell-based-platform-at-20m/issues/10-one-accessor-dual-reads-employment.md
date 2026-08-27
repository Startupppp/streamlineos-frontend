# 10 — One accessor dual-reads employment, and shouts when the two disagree

**What to build:** There is exactly one way to ask *"what is this person's department / designation / employee number / manager / salary in this organization?"*. It answers from the organization-owned tables, falls back to the legacy columns on `users` only while the migration is in flight, and reports every disagreement rather than quietly preferring one.

**Blocked by:** [09 — Employment truth is backfilled into the organization-owned tables](09-employment-truth-is-backfilled.md)

**Status:** ready-for-agent

**Grounding (2026-08-28, evidence not instruction — re-read at source):** the blast radius makes a direct swap impossible — `designation` appears in 90 backend files and 64 frontend files, `employeeId` in 78 and 52, `joiningDate` in 53. That is a wide refactor: one edit across all of them cannot land green, so this ticket is the *expand* that lets tickets 11–13 migrate in batches while both forms exist. `modules/directory/person-seam.ts` already exists and reads both `hrPeople` and `hrEmployments` — check whether it is already this accessor before writing a second one.

## Acceptance criteria

- [ ] One accessor, in one place, is the only supported way to read an employment fact; it takes the org and the person and returns the canonical values.
- [ ] It reads the canonical tables first and the `users` columns only as fallback, and every fallback hit increments a counter that is visible in the drift dashboard.
- [ ] A disagreement between the two sources emits a structured alert with the org, the field and both values — not a log line. A log line is not an alert until it reaches a person.
- [ ] The accessor is a *deep* interface: callers ask for the fact, not for the join. Its storage and the fallback are implementation details that tickets 11–13 do not need to know about.
- [ ] Salary, bank and tax reads go through the same accessor but stay behind their existing permission gate — widening the read surface is not part of this change.
- [ ] Adding a new employment fact means adding it here, enforced by the legacy columns being unreachable from anywhere else once ticket 13 lands.

## Todo

- [ ] Read `modules/directory/person-seam.ts` and `modules/hr/core/person-employment-sync.service.ts` first — the seam may already exist and need deepening rather than replacing. Reuse before you create.
- [ ] Give the accessor a batch form before ticket 11 starts, or the first list page that adopts it turns one query into N.
- [ ] Prove the drift alert fires: the predicate has to match what the code actually emits, which a previous alert in this program got wrong by grepping for a string no log line contained.
- [ ] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md)

---

PRD: [`c28 — Organization-routed cells for 20M+ users`](../prd.md) · Candidate index: [`../README.md`](../README.md)
