# 00 Test summary - StreamlineOS HRMS module

| Item | Value |
|---|---|
| Product / URL | StreamlineOS HRMS, https://www.streamlineos.in (production) |
| Org | TEST org "QA Build Org 1012b" (synthetic data only) |
| Window | 13-14 Oct 2026 IST (P1/P1N, P2, P2M/P2R on 13 Oct evening; P3 00:06-00:35 IST 14 Oct) |
| Browser | Chrome on Linux, 1280x800; responsive checks 768 (iPad Mini emulation) and 375 |
| Roles | Owner (qaown1012b) VERIFIED; Employee/Manager (HR Module Member) partial; HR Admin BLOCKED (OTP never arrived) |
| Module setup | HR module enabled by QA via /settings/modules with user authorization; persisted after refresh. Payroll off. |

## Passes
- Discovery: logged-out routing, sign-in validation, module gating, console.
- Pass 1 / P1N: surface map (~30 /hr routes), negative + happy-path forms.
- P2: two-tab, deep links (39/39), responsive, keyboard accessibility, console.
- P2M/P2R: invite flow and role matrix (Employee, Manager).
- P3: independent regression of all prior defects + Employee access checks.

## Results
- Functional bugs (02): 27 = High 5, Medium-High 2, Medium 10, Low 10. UX/accessibility findings (03): 16.
- Top issues:
  1. HRMS-001 Member/Manager can open others' Sensitive tab (salary/bank/PAN form); values were 'Not set', so data exposure unconfirmed.
  2. HRMS-002 Approving an employee's leave returns HTTP 500; leave stuck Pending.
  3. HRMS-004 Submitted expenses never reach /hr/expenses or Action Center.
  4. HRMS-003 Asset edits are last-write-wins across tabs (silent data loss).
  5. HRMS-005 Invite links report 'expired' immediately / after verify while Pending.
- Changed since earlier pass: self-approval 500 now a clear message (HRMS-025 remains); huge expense ->0 now silent truncation (HRMS-011); /me payslip card graceful (not reproduced).
- VERIFIED OK: logged-out redirect with callbackUrl; incognito deep link to signin; deep links 39/39; back/forward; leave drawer focus trap, Esc, focus return; step-1 onboarding inline error ARIA; Employee denied on /hr/approvals, /settings/roles, /settings/modules, custom-fields; Employee expense scope correct; Pay tab denied; asset edit hidden for Employee; Manager edit denied server-side.

## Release assessment (honest)
**Not ready for general release of the HR module** in its current state. Reasons: a likely access-control gap on sensitive employee data (HRMS-001), two core workflows that do not complete (leave approval 500, expenses not reaching HR), silent data loss/corruption (HRMS-003, HRMS-006), and a broken invite entry point (HRMS-005). Coverage is also incomplete: HR Admin role, manager approval flow, logout propagation, Google sign-in and real screen-reader testing were not done (see 06). Recommend fixing all High items and HRMS-006/007, then a focused regression including the blocked roles before release.

## Cleanup
See 06-blockers-and-open-questions.md, section "Synthetic records to clean up".
