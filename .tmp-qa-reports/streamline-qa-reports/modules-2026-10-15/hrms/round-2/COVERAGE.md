# HRMS QA Round 2 — COVERAGE (2026-10-15)
Single tab. Owner session, org "ADitay CAhala". Tab crashed several times from memory pressure; replaced each time with one new tab.

| Area | Done | Result |
|---|---|---|
| Round-1 HRM-B-001..008 | All 8 rechecked | 001 open; 002 fixed; 003 fixed; 004 changed (see HRM-B-010); 005 fixed; 006 open; 007 fixed; 008 partial/open |
| HR-B rechecks | 004, 008, 012, 013, 014, 016, 017, 020, 021, 022, 024 | 013 likely fixed; 014 open; 016 not seen; 017 fixed; 020/021 fixed client-side; 022 fixed; 024 fixed (Record resignation has employee picker); 012 partial |
| HR-B-008/009/010/023/025 | 023 partial (bulk preview); 008 UI only | 009 not testable; 025 not run (no real termination); 010 not reproduced |
| Onboarding Personal/Job/Pay | Name length, digits, script, bad email, DOB range, duplicate employee ID, salary negative, review, submit | Bugs HRM-B-012, HRM-B-013 |
| Onboarding bulk | Edge CSV, clean CSV | Bugs HRM-B-018, HRM-B-019 |
| Positions | Create dialog, status options | HRM-B-001 open |
| Departments | Create 1-char, archive unused, archive used (dependency dialog) | HRM-B-008 open; HR-B-017 fixed |
| Leave types | Dropdown: Casual, Sick, Earned, Maternity, Paternity | Casual exercised |
| Leave apply/approve/reject | Apply, overlap, over-balance, approve (self), reject | HRM-B-009, HRM-B-010, HRM-B-011 |
| Leave list refresh | After submit | HRM-B-005 fixed |
| Leave policies | Create draft, reopen, edit draft, save | HRM-B-006 open; HR-B-018 draft save fixed |
| Holidays | Add, list refresh, duplicate name, double-click, delete | HRM-B-007 fixed; double-submit OK |
| Attendance | Duplicate pending correction, future-time check | HRM-B-003 fixed; HR-B-013 likely fixed |
| Documents | .exe, 0-byte, valid PDF, list, delete | HRM-B-015, HRM-B-016, HRM-B-017 |
| Assets | Assign, return, confirm | HR-B-022 fixed; UX Retire next to Edit still present |
| Expenses | Amount field validation (not submitted) | HR-B-020/021 fixed client-side |
| Org chart | Root, Needs-a-manager, search | Pass (expansion via chevron not confirmed) |
| Search & filters | Directory search (ID, email, name, markup, empty), status filter, dept list | Pass; latency noted |
| Deep links | Missing employee UUID, invalid id, termination with unknown id | HRM-B-022 |
| Export | Directory export | Queued; file not confirmed (open) |
| Exit | Record resignation dialog (opened, cancelled) | HR-B-024 fixed |

## Not done
- Policy draft archive cleanup (HRM-B-006 probes): archive attempt hit a modal overlay; not finished.
- Export file verification.
- Profile edit (identity fields); only reporting-line edit found on profile.
- Attendance approval (HR-B-009), second-user flows, member/viewer RBAC.
- Documents: "Letters" and Doc Review not walked.
- HR-B-025 termination (out of scope: no real termination).
- Cases, benefits, analytics, announcements, probation.
