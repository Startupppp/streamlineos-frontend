# HRMS QA Round 1 — COVERAGE (2026-10-15)

Environment: https://www.streamlineos.in (www), org **"ADitay CAhala"**, actor **owner adityachalla01**, browser timezone Asia/Calcutta (IST). Test prefix QA1015. Test mail: @sharklasers.com only. No payments / no payroll runs.

## Covered this round

| Area | What was exercised | Notes / bugs |
|---|---|---|
| Departments | Create (incl. timing / short name), archive unused, list | HRM-B-008; HR-B-017 fixed for unused only; HR-B-005 fixed |
| Employees / onboarding | Single-employee onboarding incl. Pay step; name validation; directory search | HRM-B-002; name/digit rules (see UX); HR-B-001/002/003/006 fixed |
| Leave policy | Create / version / Half Day Allowed; activate path | HRM-B-006 (Half Day OFF→ON on reopen — needs verification); HR-B-011/018/019 fixed |
| Leave requests | Submit (owner), list after submit, Approvals copy | HRM-B-004, HRM-B-005 |
| Attendance | Clock-in (owner), corrections (incl. second same-date) | HRM-B-003; HR-B-013 partial; HR-B-008/015 UI; HR-B-010 not reproduced |
| Shifts | Create / validation (end vs start / night) | HR-B-007 fixed |
| Holidays | Add holiday + October empty state after toast | HRM-B-007 |
| Expenses | Submit / pending queue; owner own-claim actions | UX Must-change #1; HR-B-020/021 UI-only fixed |
| Assets | Register, availability, Retire vs Edit placement | UX Must-change #2; HR-B-012/022 fixed |
| Search | Employee directory typed search | HR-B-006 fixed |
| Name validation | Digits / allowed characters on name fields | UX Good-to-have #2; related FIXED HR-B-001/002 |
| Positions | Create Position — Status dropdown | HRM-B-001 (blocked) |

## Not done

| Area | Reason / note |
|---|---|
| Termination | Not run this round (HR-B-025 still Not tested) |
| Bulk CSV onboarding | Not run (HR-B-023 Not tested) |
| Profile tabs | Not walked in depth |
| Org chart | Not tested |
| Documents | Not tested |
| Helpdesk / cases | Not tested |
| Benefits | Not tested |
| Analytics | Not tested |
| Announcements | Not tested |
| Probation | Not tested |
| Member / viewer RBAC checks | Not tested (owner-only pass) |
| HR-B-009, 014, 016, 024 | Explicitly Not tested (see BUGS.md Rechecks) |

## Limits

- Actor was organisation owner only; member and viewer paths were not checked.
- Server-side verification was **not** completed for items marked "FIXED in UI only" (HR-B-008, 020, 021).
- Half Day Allowed (HRM-B-006) and Holidays stale empty state (HRM-B-007) are flagged for verification / recheck as noted in BUGS.md.
