# 01 — The standard of proof is written down

**What to build:** A developer knows what evidence justifies a deletion, so nobody repeats the scan that nearly deleted a third of a working API.

**Blocked by:** None — can start immediately

**Status:** in-progress — standard and broken-scan rule recorded; dead-code CI wired (backend); cycle CI missing from frontend; retention marker still absent

**Audit note (2026-08-26):** Three of five acceptance criteria are already satisfied at source. Two remain genuinely open.

## Acceptance criteria

- [x] The standard is recorded: a module-graph tool plus a real build for files; access logs for endpoints; symbol, raw-name, foreign-key and spec checks for tables. — `architecture-refactor/c18-removals-are-proved/prd.md` Implementation Decisions section states this verbatim; root `CLAUDE.md` §10 repeats the knip + real-build requirement.
- [x] The rule that a scan reporting near-total deadness is a broken scan is recorded, with the three examples. — `prd.md` "Further Notes" section records all three: 1,074-route join → ~1 true dead route; table-scan missing `pgTable(` capitalisation → every table reported dead; single-line pattern missing table name on following line → same.
- [x] The deliberately-unused schema barrel carries an explicit retention marker, so tooling and people both see it is intentional. — `backend/src/db/schema/hrms-phase1-sql-managed.ts:1-10` now leads with a block comment: DO NOT DELETE, why it is out of the runtime barrel, that knip will report all 11 files as unused, and that `migration-integrity.spec.ts` asserts the arrangement.
- [x] Dead-code checks run in CI, reporting rather than failing, so the number is visible. — `backend/.github/workflows/ci.yml:61-63`: `pnpm exec knip --no-progress` with `continue-on-error: true`.
- [x] The zero-cycle property is asserted in CI for both repos. — backend `ci.yml:58-59`; frontend `ci.yml:40-42` (`Import cycles` → `pnpm check:cycles`, `continue-on-error: false`).

## Todo

- [x] Write the standard beside the existing tooling — `prd.md` + `CLAUDE.md` §10 record it. — `architecture-refactor/c18-removals-are-proved/prd.md`
- [x] Add the retention marker — done, `hrms-phase1-sql-managed.ts:1-10`.
- [x] Wire the reporting check — frontend `ci.yml` now runs `pnpm check:cycles` (gating) and `pnpm exec knip --no-progress` (`continue-on-error: true`, reporting only — the frontend knip baseline is 5 findings, so gating on it would fail every build). Mirrors backend `ci.yml:58-63`.
- [x] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md)

---

PRD: [`c18 — Removals are proved, not grepped`](../prd.md) · Candidate index: [`../README.md`](../README.md)
