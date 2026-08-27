# 01 — The standard of proof is written down

**What to build:** A developer knows what evidence justifies a deletion, so nobody repeats the scan that nearly deleted a third of a working API.

**Blocked by:** None — can start immediately

**Status:** in-progress — standard and broken-scan rule recorded; dead-code CI wired (backend); cycle CI missing from frontend; retention marker still absent

**Audit note (2026-08-26):** Three of five acceptance criteria are already satisfied at source. Two remain genuinely open.

## Acceptance criteria

- [x] The standard is recorded: a module-graph tool plus a real build for files; access logs for endpoints; symbol, raw-name, foreign-key and spec checks for tables. — `architecture-refactor/c18-removals-are-proved/prd.md` Implementation Decisions section states this verbatim; root `CLAUDE.md` §10 repeats the knip + real-build requirement.
- [x] The rule that a scan reporting near-total deadness is a broken scan is recorded, with the three examples. — `prd.md` "Further Notes" section records all three: 1,074-route join → ~1 true dead route; table-scan missing `pgTable(` capitalisation → every table reported dead; single-line pattern missing table name on following line → same.
- [ ] The deliberately-unused schema barrel carries an explicit retention marker, so tooling and people both see it is intentional. — `backend/src/db/schema/hrms-phase1-sql-managed.ts` has no retention comment or annotation; it is a bare re-export barrel with no indication that being unimported is the design.
- [x] Dead-code checks run in CI, reporting rather than failing, so the number is visible. — `backend/.github/workflows/ci.yml:61-63`: `pnpm exec knip --no-progress` with `continue-on-error: true`.
- [ ] The zero-cycle property is asserted in CI for both repos. — Backend CI has `pnpm check:cycles` at `backend/.github/workflows/ci.yml:58-59`. Frontend has `check:cycles` defined in `frontend/package.json:15` but it is wired in no CI workflow (`frontend/.github/workflows/ci.yml` and `pr-check.yml` both omit it).

## Todo

- [x] Write the standard beside the existing tooling — `prd.md` + `CLAUDE.md` §10 record it. — `architecture-refactor/c18-removals-are-proved/prd.md`
- [ ] Add the retention marker — `backend/src/db/schema/hrms-phase1-sql-managed.ts` needs a leading comment explaining that being unimported is intentional and why.
- [ ] Wire the reporting check — backend CI done; frontend CI (`frontend/.github/workflows/ci.yml`) is missing both `pnpm check:cycles` and `pnpm exec knip --no-progress` steps.
- [ ] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md) — **BLOCKED:** retention marker and frontend cycle CI still open.

---

PRD: [`c18 — Removals are proved, not grepped`](../prd.md) · Candidate index: [`../README.md`](../README.md)
