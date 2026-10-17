# HRMS fix list (QA run 2026-10-14) — 25 bugs: 2 High, 15 Medium, 8 Low
Full details and acceptance criteria: CLAUDE-FIX-BRIEF.md.

## High (2)
- HR-B-008 Self-approval of own attendance correction is allowed and applied (maker-checker).
- HR-B-025 Completed termination leaves employee Active; no checklist / FnF draft / access revocation.

## Medium (15)
- HR-B-001 Name fields strip `'` `-` accents; paste discards value silently.
- HR-B-003 Edit employee saves blank/whitespace Designation.
- HR-B-005 Duplicate department names accepted.
- HR-B-006 Typed no-match directory search shows all employees + "integrity check" banner.
- HR-B-007 Non-night shift with end < start passes validation.
- HR-B-009 Approve correction → ApiContractError (`payrollInputRebuild` object vs boolean) though applied.
- HR-B-010 Attendance times shown in UTC while labelled IST — **confirm in IST browser**.
- HR-B-013 Correction rejects past morning times as "later than current time" (UTC now).
- HR-B-014 Leave balance 11 after approval while card says prorated 3/12 (check policy config first).
- HR-B-017 Department archive blocked: dependency contract error (`mode` enum).
- HR-B-018 Edit draft policy: PATCH 400, silent.
- HR-B-019 New policy version can't activate (conflicts with its own v1).
- HR-B-020 Expense accepts ₹999,999,999; input silently truncates to 9 digits.
- HR-B-022 Confirmed asset return doesn't unassign the asset.
- HR-B-023 Bulk CSV: unclosed quote merges rows; later errors (dup email, bad date) not reported.

## Low (8)
- HR-B-002 Digits stripped from names silently; then "Last name is required".
- HR-B-004 Department form shows raw zod "Too small…" message.
- HR-B-011 Negative leave accrual: Create does nothing, no message.
- HR-B-012 "Column 1–N" placeholder headers while loading (asset-returns, cases, directory).
- HR-B-015 Correction card doesn't show requester / original times.
- HR-B-016 One-off "Failed to load leaves data" after reject + reload (no speculative fix).
- HR-B-021 Expense amount drops minus sign / letters silently.
- HR-B-024 /hr/exit resignation form is self-only; HR can't record for an employee.
