# 11 — HR, directory and onboarding read the accessor

**What to build:** The employee record, the people directory, the org chart and the joiner flows all show employment facts from the organization that employs the person. A contractor in two organizations sees the right department, designation and manager in each.

First migrate batch of the users-table split. Sized by blast radius, not by layer: HR and directory own most of the call sites and share their fixtures, so they move together and CI stays green because the legacy columns still exist.

**Blocked by:** [10 — One accessor dual-reads employment, and shouts when the two disagree](10-one-accessor-dual-reads-employment.md)

**Status:** ready-for-agent

**Grounding (2026-08-28, evidence not instruction — re-read at source):** the HR module already has the readers to point at the accessor — `modules/hr/core/hr-employments.service.ts`, `hr-people.service.ts`, `hr-employee-record-lists.service.ts`, `hr-timeline.service.ts`, `hr-effective-changes.service.ts`, `modules/directory/person-seam.ts`, `modules/users/user-ops.service.ts`. Root `CLAUDE.md` §8 constrains the onboarding form to real new-joiner data and forbids showing it to org owners or platform admins — that gate is unaffected and must stay.

## Acceptance criteria

- [ ] Every HR, directory, org-chart and onboarding read of department, designation, employee number, joining date, location or manager goes through the accessor.
- [ ] List surfaces use the accessor's batch form; a directory page does not become N+1 to gain correctness.
- [ ] The org chart is built from `hr_reporting_lines`, so a manager change is effective-dated rather than overwritten.
- [ ] A person with memberships in two organizations returns different employment facts in each, proved by a test rather than reasoned about.
- [ ] Read budgets over the directory and employee-record lists are re-measured as `streamline_app` with the tenant GUC after the change; a join added to a hot list is a regression whether or not it is correct.
- [ ] No file in this batch writes to the legacy `users` columns; the dual-write from ticket 09 remains the only writer until ticket 14 removes it.

## Todo

- [ ] Convert readers only. A write path that changes in this batch is a second variable when the read regresses.
- [ ] Watch for `designation` and `joiningDate` on tables that are not `users` — the grep counts are upper bounds and some hits belong to `hr_employments` already.
- [ ] Re-run the affected read budgets rather than assuming; RLS forces `org_id` into a covering index or the Index Only Scan silently disappears.
- [ ] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md)

---

PRD: [`c28 — Organization-routed cells for 20M+ users`](../prd.md) · Candidate index: [`../README.md`](../README.md)
