# File Size Exceptions — §7 Registry (frontend)

Frontend files exceeding 500 lines that are **exempt** from the 500-line hard-review limit
per §7 of the shared CLAUDE.md.

`scripts/check-file-sizes.mjs` (`pnpm check:file-sizes`) reads the `## Exceptions` table
below and **fails closed**. A row grants an exception only when all of the following hold;
any failure fails the gate rather than silently granting or dropping an exemption:

- the row carries all nine columns, none of them blank;
- the path is a concrete file — wildcard and directory-wide entries are rejected by the parser;
- the file exists on disk;
- the recorded line count equals the measured one exactly;
- the file still exceeds 500 lines — **a file that falls to 500 or below automatically loses
  its exception** and the row must be deleted;
- the review date parses as an ISO calendar date.

A path mentioned only in the audit trail below is not an exception; only table rows are read.

The backend has its own registry at
`architecture-refactor/prd/completion-plan.md` (backend exception table), enforced by the same
rules.

---

## Exceptions

| Path | Lines | Category | Owner | Public interface | Cohesion argument | Alternatives considered | Review date | Removal trigger |
|---|---|---|---|---|---|---|---|---|

---

## Audit trail

- **2026-09-02** — Initial registry. Full scan of the frontend workspace found zero authored files exceeding 500 lines. No exceptions registered.
- **2026-09-02 (ticket 37)** — Registry contract aligned with the backend twin: nine columns, an ISO review date, a removal trigger, duplicate detection, and malformed rows reported as registry errors instead of silently skipped. The table is still empty — **no frontend file has ever been granted an exception**. Two frontend files were over 500 lines at the time of this pass (`hooks/api/notifications-inbox.ts` at 534 and `features/hr/cases/cases-page-content.tsx` at 501); both sit in another lane's territory and are recorded in `reports/37-file-cohesion.md` as violations to split, not as exceptions to grant.
- **2026-09-03 (ticket 35, box 5)** — `check:over-300` was red at 520 against a baseline of 519. The count was brought to **516** by splitting five files at real seams — not by moving the number — and `scripts/check-over-300.mjs` was then lowered 519 → 516. The five: `hooks/api/mail.ts` 301 → 192 (optimistic mail-cache patch/rollback to `hooks/api/mail-action-cache.ts`), `features/payroll/reimbursements/reimbursements-page.tsx` 303 → 217, `features/build/qa/test-cases-tab.tsx` 302 → 186, `features/payroll/employees/worker-detail-page.tsx` 317 → 186, `features/build/project-detail/project-budget-page.tsx` 317 → 248 (each of the last four gave up its DataTable column set to a sibling `*-columns.tsx` / `use-*-columns.tsx`, matching the convention already used in `features/payroll/loans`, `features/payroll/components` and `features/build/members`). **No exception row was written, and none may be.** This registry's gate fails closed on any registered file at 500 lines or fewer ("exception no longer needed"), so registering a 300-line-band file here to quiet `check:over-300` would turn one red gate into another. The 300-line target has no exception mechanism by design: the only way down is a split. Prose, here, is the safe form.
- **2026-09-03 — pre-existing violations, not this pass's.** `pnpm check:file-sizes` is red at HEAD, before and after the work above, on `hooks/api/notifications-inbox.ts` (534) and `hooks/api/notifications-inbox.test.ts` (664). Both are another lane's territory and neither is an exception candidate.
