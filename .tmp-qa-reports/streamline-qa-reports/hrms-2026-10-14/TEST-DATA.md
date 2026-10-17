# HRMS QA — Test Data Created (Round 1, 2026-10-14)
Org: QA Build Org 1012b · Actor: owner qaown1012b · All invite emails use @sharklasers.com only. No codes/tokens recorded here.
Cleanup is NOT done by this run; owner may archive/cancel the items below.

## Records created (kept)
| # | Type | Identifier / name | Location | Details | Created by test | Cleanup suggestion |
|---|---|---|---|---|---|---|
| 1 | Employee | QA HR Thirteen (first "QA HR", last "Thirteen" — digits cannot be typed in name fields, see HR-B-002) · EMP-ZH6QY8 | /hr/employees/2f9891d6-4322-4487-8412-b53b8309ad47 | Email qahr1014a@sharklasers.com · Phone +919000010013 · Designation "QA Analyst" (restored after HR-B-003 test) · Dept "QA Test Dept" · Org role Member · Full-time · Reports to qaown1012b (policy default) · invite sent to the sharklasers address | Onboarding wizard, double-click Submit (only 1 record created) | Terminate/archive via HR UI (not done) |
| 2 | Department | QA Dept 1013 · code QAD1013 · desc "QA disposable department 1013" | /settings/organization/departments | Active | Create | Archive |
| 3 | Department (duplicate name — HR-B-005) | QA Dept 1013 · code QAD1013B | /settings/organization/departments | Active | Duplicate-name test | Archive (should not exist) |
| 4 | Leave policy (leave type policy) | QA Leave 1013 · desc "QA disposable leave policy 1013" | /hr/settings/policies | Type Leave · status draft · v1 · accrual 1.5 days | Create | Archive / delete |
| 5 | Leave request (owner, self) | Casual Leave · Oct 27–28 2026 · reason "QA 1013 approve test" | /hr/leaves | Pending (needs another approver — not actioned, see coverage) | Create | Cancel request |
| 6 | Leave request (owner, self) | Sick Leave · Oct 29–30 2026 · reason "QA 1013 reject test" | /hr/leaves | Pending (needs another approver) | Create | Cancel request |
| 7 | Holiday | QA Holiday 1013 · Friday, Oct 30 2026 (not recurring) | /hr/holidays | Listed; persisted after reload | Create | Delete |
| 8 | Shift template | QA Shift 1013 · FIXED · 09:00 AM–06:00 PM · break 60 min · grace 15 min | /hr/shifts | Created after the inverted attempt was cancelled | Create | Delete |
| 9 | Attendance (owner) | Clock in/out Oct 14 2026 (app shows 3:30 AM; see HR-B-010) | /hr/attendance | Team view "Checked Out", 0.00h | Clock in / clock out | none (system record) |
| 10 | Attendance correction (owner) — APPROVED via self-approval | Oct 14 · 00:10 → 00:40 · reason "QA 1013 valid correction test" | /hr/attendance | Applied: Daily History now shows 12:10 AM – 12:40 AM, 0h 30m (HR-B-008/009) | Create + Approve | Re-correct the day via HR |
| 11 | Attendance correction (owner) — REJECTED | Oct 14 · 00:05 → 00:20 · reason "QA 1013 reject path test"; reject reason "QA 1013 rejected for test" | /hr/attendance | Rejected; not in Needs a decision | Create + Reject | none |

## Attempts that should NOT have created data (verified)
- Duplicate employee with email qahr1014a@sharklasers.com → blocked at Next: "This email already belongs to an employee in your organization." (no record).
- Onboarding name/email/phone invalid-value probes (typed/filled, never submitted).
- Department with blank name → blocked (no record).
- Holiday with blank name / no date → blocked (no record).
- Leave request without reason (min 10) → blocked; leave "To" before "From" → date picker prevents it.
- Attendance correction empty / inverted / future check-in → blocked (no record).
- Designation edits: whitespace (saved as empty, then restored, HR-B-003), 300 chars (blocked: max 200), `<img onerror>` payload (saved and escaped, then restored to "QA Analyst").
- Shift inverted (18:00–09:00, non-night) → confirmation shown; CANCELLED (no record). See HR-B-007.
- Cases: New HR Case dialog opened and validated only (empty submit). NO case created (employee-relations record; avoided).
- Leave policy with accrual -5 → not saved (no record); fractional 1.5 saved as #4 above.

## Identities / accounts
- No other accounts were signed in. No new user accounts were created. The invite for QA HR Thirteen was sent by the product; I did not sign in as that employee.
- Existing records seen but not created by me: 8 pre-existing employees (QA Employee, QA HR Admin, QA Manager, QA Neg Test, qaadm1012d, qamem1012c, qaown1012b, qaview1012e), one pre-existing "QA Test Dept", pre-existing leave requests (QA Employee Earned Leave rejected by qaown1012b; a Casual Nov 18 request by qaown1012b "please ignore"), one pre-existing asset "QA Laptop". Not modified.

## Holidays/time references
- Dates used: 2026-10-14 (today in the app), Oct 27–30 2026.

---
# Round 2 — test data (2026-10-14, employee/owner pass)
Actors: owner qaown1012b (default window, kept signed in); employee qahr1014a = QA HR Thirteen (incognito window). No codes recorded.

| # | Type | Identifier | Where | Details | Created by | Cleanup |
|---|---|---|---|---|---|---|
| R2-1 | Leave request (employee) | Casual Leave · Oct 19 2026 · reason "QA 1014 employee approve test leave" | /me/time-off, /hr/leaves | APPROVED by qaown1012b (approve comment blank) | employee create, owner approve | none |
| R2-2 | Leave request (employee) | Sick Leave · Oct 22 2026 · reason "QA 1014 employee reject test leave" | same | REJECTED by qaown1012b, reason "QA 1014 rejected for test: insufficient cover" | employee create, owner reject | none |
| R2-3 | Attendance correction (employee) | Oct 14 · 02:00 → 02:30 · reason "QA 1014 employee correction request test" | /me/attendance, /hr/attendance | APPROVED by qaown1012b; applied (Team Attendance In 2:00 AM · Out 2:30 AM, 0.50h) | employee create, owner approve | Re-correct via HR if desired |
| R2-4 | Employee onboarding | QA HR Thirteen profile wizard | /employee-onboarding | "Skip for now" used on personal details (phone prefilled +91 90000 10013). "Finish your details" banner remains. | employee | none |
| R2-5 | Attempts that did NOT create data | Correction 08:45 → 09:10 (rejected as future, HR-B-013) | /me/attendance | no record | - | - |
| R2-6 | Owner tab leftovers | Guerrilla Mail username set to qahr1014a (mailbox for OTP) | guerrillamail.com | no data | - | - |

Notes:
- Round-1 records (EMP-ZH6QY8, leave/corrections/holiday/shift/department/policy) unchanged in this round except the R2 items above.
- Sign-in: qahr1014a signed in via email OTP (qahr1014a@sharklasers.com). Owner session in default window never signed out.

---
# Round 2 — actor sign-ins (2026-10-14, other org actors)
No codes recorded. Each non-owner actor used its own private window; Guerrilla usernames were changed per actor.

| # | Actor | Identifier | Where | Details | Created by | Cleanup |
|---|---|---|---|---|---|---|
| R2-7 | Member (same org, non-HR) | qamem1012c@sharklasers.com | streamlineos.in (private window) | Signed in via email OTP. Read-only checks; no records created | — | Session left signed in in a private window |
| R2-8 | Member (same org, non-HR) | qaview1012e@sharklasers.com | streamlineos.in (private window) | Signed in via email OTP. "Skip for now" used on the onboarding wizard (no profile data entered). Read-only checks | employee wizard skip | Onboarding left as skipped; no data created |
| R2-9 | Outsider (other org "Outsider Org 1012g") | qaout1012g@sharklasers.com | streamlineos.in (private window) | Signed in via email OTP. Read-only checks; no records created. Org trial banner | — | Session left signed in in a private window |
| R2-10 | Owner tab leftovers | Guerrilla Mail username changed to qamem1012c → qaview1012e → qamem1012c → qaout1012g | guerrillamail.com | no StreamlineOS data | — | none |

Notes:
- No payroll enable, payment or termination was triggered in Round 2.
- Owner step 4 (department/leave type/holiday/shift edits, exit flow, helpdesk, assets, expenses) was NOT reached; no records created for it.

---
# Round 3 — owner step-4 test data (2026-10-14, owner qaown1012b)
| # | Type | Identifier | Where | Details | Action in Round 3 | Cleanup state |
|---|---|---|---|---|---|---|
| R3-1 | Department | QA Dept 1013 · code QAD1013B | /settings/organization/departments | Description edited to "QA disposable department 1013B edited by owner round 3" (saved, verified after reload) | Edit OK; Archive blocked by HR-B-017 | Still ACTIVE — archive pending a fix |
| R3-2 | Leave policy | QA Leave 1013 · v1 | /hr/settings/policies | Draft → ACTIVATED (POST /hr/policies/3/activate → 200, list shows active v1). Draft description edit failed (HR-B-018). | Activate OK | Active; cannot be edited, only versioned. Archive via owner if required |
| R3-3 | Leave policy version | QA Leave 1013 · v2 (draft, policy id 4) | same | Created by "New Version" (HR-B-019). Cannot activate (self-conflict). Priority/description edits return 400 (HR-B-018) | Created only | Draft v2 left in place; archive or leave for owner |
| R3-4 | Holiday | QA Holiday 1013 (Fri 30 Oct 2026) | /hr/holidays | Renamed to "QA Holiday 1013 Edited" (Update holiday → persisted after reload), then deleted via "Delete this holiday?" → Delete. List shows "No holidays in October". | Edit OK; Delete OK | Deleted |
| R3-5 | Shift template | QA Shift 1013 (FIXED 09:00–18:00) | /hr/shifts | Break changed 60 → 45 min via Edit → "Save shift changes?" → Save Changes (persisted after reload); then deleted via "Delete shift template?" → Delete | Edit OK; Delete OK | Deleted |
| R3-6 | Department | QA Dept 1013 · QAD1013B | /settings/organization/departments | Still ACTIVE: archive blocked by HR-B-017 (dependency check contract error) | Archive attempted ×2 (Try again) | Open: needs fix or manual archive |
| R3-7 | Expense claim | #EXP-2026-004 · Office Supplies · merchant "QA Vendor 1013" | /me/expenses, /hr/expenses | Created with ₹999,999,999 (HR-B-020), then edited by owner to ₹250, description "QA 1013 cleanup: corrected from huge-amount probe". Status Pending. | Create (huge) + Edit | Pending in owner's list; cancel/withdraw if UI allows. Not approved or paid |
| R3-8 | Expense probes (not saved) | Amounts 0, -5, abc, 99999999999999 | /hr/expenses | 0 → "Amount must be greater than 0" (blocked). -5 / abc / 14 nines → not saved (see HR-B-021). | Probes only | none |
| R3-9 | Case (Employee Relations) | CASE-CNR5BW · category Other · severity Medium · summary "QA test case 1013 (synthetic, not a real complaint)" | /hr/cases | Created with no subject employee, not confidential. Helpdesk ticket could not be created (no create action on /hr/helpdesk). | Create | Open; close via cases when reviewed |
| R3-10 | Asset | QA Asset 1013 Laptop · Laptop · SN-QA-1013-A · Brand QA Brand · Model QA Model 1013 · ₹50,000 · location QA Test Lab | /hr/assets | Registered; assigned to QA HR Thirteen; return logged (Good, Oct 14) and confirmed "Returned"; then unassigned manually (HR-B-022). Now Available | Create, assign, return, unassign | Registered & Available. Keep or retire via owner |
| R3-11 | Asset return | Return #1 (asset return id 1) · QA Asset 1013 Laptop · QA HR Thirteen · Good | /hr/asset-returns | Pending → Returned (PATCH /hr/asset-returns/1 → 200) | Log + confirm | Returned (record kept) |
| R3-12 | Announcement | "QA 1013 announcement (owner round 3)" · Published · Everyone · body "Synthetic QA announcement from HRMS QA round 3. No action needed. Please ignore." | /hr/announcements | Created (POST /org/announcements → 201); listed once | Create | Published; owner may archive |
| R3-13 | Bulk upload file (not imported) | uploads/malformed-bulk-1013.csv | /hr/onboarding → Bulk upload | Preview only; cleared. Nothing created. Used sharklasers addresses only (qabulk1013a/c, qahr1014a existing) | Preview + Clear | none |
| R3-14 | Termination (HR-initiated exit) | Termination id 2 · QA HR Thirteen (EMP-ZH6QY8) · reason End of Contract · effective Oct 14 2026 · remarks "QA offboarding flow test (owner round 3). Synthetic QA employee, not a real exit." | /hr/termination | Created & auto-approved (POST /hr/termination → 201) → termination email sent to the sharklasers address (POST send-email → 200) → marked **Completed** (PATCH /hr/termination/2/complete → 200). Employee still shows Active in directory/profile (HR-B-025). No offboarding checklist or FnF draft visible. | Full offboard run (last step) | **Completed — cannot be undone via UI.** Employee account/profile state needs HR-admin follow-up |
| R3-15 | Resignation form | none | /hr/exit → Submit resignation | Opened the self-service form (it is for the signed-in owner) and CANCELLED. No record. (HR-B-024) | none | none |
| R3-16 | Termination form draft | none | /hr/termination → New Termination | Opened and cancelled (no record) before the Terminate-button run | none | none |
