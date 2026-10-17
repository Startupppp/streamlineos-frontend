# HRMS QA Round 1 — TEST DATA (2026-10-15)

Org: **"ADitay CAhala"**. Actor: owner **adityachalla01**. Prefix: **QA1015**. Times in Asia/Calcutta (IST) unless noted. No payments / no payroll runs. Mail: @sharklasers.com only.

## Departments

| Name | Status | Notes |
|---|---|---|
| QA1015 Dept | Active | Created this round (slow save observed — HRM-B-008) |
| QA1015 Ops | Archived | Archived this round (unused path — HR-B-017 UI fixed for unused) |

## Employees / onboarding

| Field | Value |
|---|---|
| Display name | QA Emp |
| Employee ID | QA1015-EMP |
| Email | qa1015emp@sharklasers.com |
| Invite | Pending |
| Notes | Appears in directory; may be omitted from assign-asset / resignation pickers (UX Good-to-have #1) |

## Leave policy

| Name | Versions | Notes |
|---|---|---|
| QA1015 Casual Leave | v2 **active**, v1 **archived** | Half Day Allowed OFF on create but ON on reopen — HRM-B-006 (needs verification) |

## Leave requests

| Who | Date | Status | Notes |
|---|---|---|---|
| Owner (adityachalla01) | 19 Oct 2026 | Pending | Form copy vs "Needs another approver" — HRM-B-004; list stale until reload — HRM-B-005 |

## Attendance

| Item | Detail |
|---|---|
| Owner clock-in | **15 Oct 2026, 03:51 IST** (adityachalla01) |
| Correction | **15 Oct** — Pending |
| Correction | **14 Oct** — Pending |
| Notes | Second correction for 15 Oct while one pending fails silently — HRM-B-003 |

## Shifts

| Name | Notes |
|---|---|
| QA1015 Day Shift | Created this round |

## Holidays

| Name | Date | Notes |
|---|---|---|
| QA1015 Holiday | 20 Oct 2026 | After "Holiday added" toast, October still showed empty until reload — HRM-B-007 |

## Expenses

| ID | Amount | Status | Notes |
|---|---|---|---|
| EXP-2026-006 | ₹250.50 | Pending | Owner's own claim — no action / no explanation on Approvals (UX Must-change #1) |

## Assets

| Name | Status | Notes |
|---|---|---|
| QA1015 Laptop | Available | Retire control adjacent to Edit (UX Must-change #2) |

## Positions

| Item | Notes |
|---|---|---|
| (none created) | Status dropdown empty — create blocked (HRM-B-001) |

## Leftovers / cleanup

Leave in place for follow-up / engineering unless product asks to remove:
- Departments QA1015 Dept (active), QA1015 Ops (archived)
- Employee QA Emp (invite pending)
- Leave policy QA1015 Casual Leave (v2 active, v1 archived)
- Owner leave 19 Oct pending; corrections 15 Oct + 14 Oct pending
- Expense EXP-2026-006 ₹250.50 pending
- Shift QA1015 Day Shift; holiday QA1015 Holiday 20 Oct; asset QA1015 Laptop Available
- Owner remains clocked in from 03:51 IST on 15 Oct (clock-out not required for this report)

No bulk CSV rows were created. No terminations or resignations were submitted.
