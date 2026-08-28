# 21: Replace broad HR, Payroll and Expense projections

**What to build:** Sensitive people and pay endpoints return minimal explicit DTOs rather than raw ORM rows.

**Blocked by:** 07 — Migrate HR, Payroll, Expenses and Timesheets actors.

**Status:** ready-for-agent

- [ ] Broad selects in the audited sensitive paths are replaced by explicit projections.
- [ ] Field-level permission and DataScope are applied before retrieval.
- [ ] Response contracts remain backward compatible or are versioned deliberately.
- [ ] Exposure regression and representative endpoint tests pass.
