# QA Build Org 1012b cleanup - Oct 14 2026

| Record | Action taken | Verified gone (after refresh) | Notes |
|---|---|---|---|
| Employee QA Neg Test (qa.happy1@example.com, EMP-N0MCHV) | Removed from Directory via Directory > Actions > "Remove from directory" | Partial - gone from Directory list; still listed in HR > People (worker record kept) | No true delete exists for employees. Dialog says application account, worker record and history remain intact. Terminate button NOT used (opened the Termination form by accident, cancelled, nothing created). |
| Department QA Test Dept | Archive clicked twice | No - still ACTIVE | Archive dependency check fails ("Could not check dependencies... out of date with the API"), nothing changed. Employee worker record still points to this department. |
| Owner Casual Leave Nov 18 2026 (Pending) | Cancel request (withdrawn) | Yes - status Cancelled | |
| QA Employee Earned Leave Nov 16 2026 (Pending) | Rejected (reason given) | Yes - no pending; in Rejected tab | |
| Holidays QA Test Holiday, QA Dup Holiday, QA P3 Dup Retest (Dec 25 2026) | Deleted, one by one | Yes - "No upcoming holidays" | |
| Asset QA Laptop (SN-QA-LAPTOP-0001) | No delete option; used Retire asset | Partial - listed with status Retired | Retire is the archive equivalent. |
| Expenses EXP-2026-001, -002, -003 (My Expenses) | Nothing done | No - all three still listed as Pending | Only Edit is offered on claims (no withdraw/delete). HR Expenses list shows no claims. Needs an admin/DB action or a different UI path. |
| Attendance correction 13 Oct 2026 18:00 (Pending) | Rejected with reason | Yes - no longer in Needs a decision | |

Not touched: test user accounts (QA HR Admin/Manager/Employee and others), HR module enablement, the owner's own directory record (qaown1012b), any other records.
Deferred to user: the file lists test accounts and HR module disable as "cleanup items 11-12" conditional on org baseline; not done per the scope given.
