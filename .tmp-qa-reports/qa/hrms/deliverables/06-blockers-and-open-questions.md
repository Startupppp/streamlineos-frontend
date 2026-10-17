# 06 Blockers, open questions, cleanup

## Blockers
| Item | Status | Reason | Needed |
|---|---|---|---|
| HR Admin role matrix | BLOCKED | Sign-in OTP to zdehdf+ly377dxs8ksr3ek240xw0@sharklasers.com never arrived (multiple resends) | New HR Admin address or manual code |
| Manager approval flow | BLOCKED | QA Manager not selectable as reporting manager (HRMS-007) | Fix or eligibility rule |
| Logout propagation | BLOCKED | Not run (would require re-login) | Approval to log out |
| Invite resend email | VERIFIED not delivered within ~3 min | - | Check mail logs |
| Real screen reader testing | UNTESTED | No SR available | NVDA/VoiceOver pass |
| Google sign-in | UNTESTED | - | Test Google account |
| Leave Reject | UNTESTED | Instructed not to change records | Approval |
| Server-side authz via crafted requests (asset edit, custom fields as Member) | UNTESTED | No crafted requests made | Approval / dev support |
| Sensitive data API response for Member | UNTESTED | Values 'Not set' | Populate dummy values |

## Open questions
1. Is Member access to the Sensitive tab intended? Which permission should gate it?
2. Reporting-manager eligibility rules?
3. Should directory accounts (e.g. qaadm1012d@sharklasers.com) count as employees for duplicate email?
4. Intended max expense amount? Minimum employee age (DOB cap)?
5. Is a duplicate holiday on one date ever valid (e.g. regional calendars)?
6. Is "Skip for now" on bank step expected to leave the incomplete banner?
7. Should /hrms redirect to /hr?
8. Attendance timezone: are correction times compared in UTC on the server? (hypothesis only)

## Synthetic records to clean up (QA Build Org 1012b)
1. Department "QA Test Dept".
2. Employee "QA Neg Test", qa.happy1@example.com, EMP-N0MCHV, id 43827043-ac67-4e9b-911f-b33ebc7b04eb (Onboarding, invite sent).
3. Leave: owner Casual Leave Nov 18 2026, Pending.
4. Leave: QA Employee Earned Leave Nov 16 2026, Pending.
5. Holidays Dec 25 2026: "QA Test Holiday", "QA Dup Holiday", "QA P3 Dup Retest".
6. Asset "QA Laptop" (SN-QA-LAPTOP-0001), location QA-P3-LOC-B (reset or delete).
7. Expense EXP-2026-001 (Software, Rs 500).
8. Expense EXP-2026-002 (duplicate of 001).
9. Expense EXP-2026-003 (Travel, Rs 99,99,99,999).
10. Attendance regularization Oct 13 2026 check-in 18:00, Pending.
11. Test users: QA Manager, QA Employee, QA HR Admin (pending) invites/accounts (see test-accounts.md).
12. HR module enablement (disable if the org should return to baseline).
Cleanup involves deletions in production; requires user approval before execution. None was performed.
