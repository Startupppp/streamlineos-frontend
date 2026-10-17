# HRMS QA Round 2 — TEST DATA (2026-10-15)
Org "ADitay CAhala", owner adityachalla01, prefix QA1015R2, mail @sharklasers.com only. No payroll, no payments, no real employee terminated.

| Record | State at end | Notes / cleanup |
|---|---|---|
| Employee QA Probe Pay (QA1015R2-P01, qa1015r2pay@sharklasers.com) | Active, invite pending | Created by onboarding. Cannot delete from UI here; left in place. |
| Department "A" (QA1015R2A) | Archived | Created to test HRM-B-008; archived after. |
| Leave: Casual Oct 21 (1 d) | Approved (self) | Created and self-approved to test HRM-B-010; balance now 11/12. Left in place (approved). |
| Leave: Casual Oct 26 (1 d) | Rejected | Reject-flow test. |
| Leave: Casual Oct 28–30 (3 d) | Withdrawn (cancelled) | Cleaned up. |
| Leave: Casual Oct 19 (1 d) | Pending | Round-1 leftover (owner). Not touched. |
| Policy "QA1015R2 Half Day Probe" (draft v1) | Draft | HRM-B-006 evidence. Archive attempted but not finished. Needs cleanup. |
| Policy "QA1015R2 Half Day Probe B" (draft v1) | Draft | HRM-B-006 evidence. Needs cleanup. |
| Holidays QA1015R2 Holiday (22 Oct), QA1015R2 Dup Holiday (23 Oct) | Deleted | Cleaned up. |
| Documents: valid-doc-0913.pdf (as "QA1015R2 valid doc") | Removed | Cleaned up. .exe and 0-byte uploads were rejected server-side (nothing stored). |
| Asset QA1015 Laptop | Available / Unassigned | Assigned to QA1015 Member, returned and confirmed (HR-B-022 recheck). Return row left as history. |
| Attendance | No new records | Duplicate-pending (400) and future-time checks rejected; nothing saved. Owner clock-in from round 1 untouched. |
| Expenses | None created | Amount field validated, not submitted. |
| Positions | None created | Status dropdown empty; dialog cancelled. |
| Bulk CSVs (generated-qa1015r2/) | None imported | Preview only, Clear used. |
| Directory export | Queued | Output not confirmed. |
