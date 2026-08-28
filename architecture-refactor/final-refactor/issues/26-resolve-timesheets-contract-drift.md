# 26: Resolve Timesheets API contract drift

**What to build:** Timesheet entry, rate, exception and settings workflows use one canonical billing type, source and approval-mode contract across API and UI.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [ ] Product decisions select one accepted enum/value model for every known drift.
- [ ] Backend validation, OpenAPI, frontend types/forms and persisted values agree.
- [ ] Existing stored values receive a safe compatibility/backfill path.
- [ ] Contract-drift checks report zero unapproved differences and workflows pass.
