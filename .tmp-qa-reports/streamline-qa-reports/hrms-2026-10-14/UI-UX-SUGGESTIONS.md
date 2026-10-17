# HRMS QA — UI/UX Suggestions (Round 1, 2026-10-14)
Non-blocking observations. Bugs are in HR-BUGS.md.

## HR-U-001: Show the reason a field was ignored
- **Where:** Onboarding Personal step (names), HR Policies (accrual), Departments.
- **Observed:** Keystrokes are dropped or values reverted with no message (see HR-B-001, HR-B-011).
- **Suggestion:** Inline hint on the field the moment a character is rejected ("Numbers are not allowed in names"); keep the typed text visible so users can correct it.

## HR-U-002: Explain "Needs another approver" on own leave requests
- **Where:** /hr/leaves?tab=approvals (Leave Requests cards) and /hr/leaves "My leaves".
- **Observed:** Own leave requests show "Needs another approver" with no explanation or next step; the owner (HR admin) cannot act on them.
- **Suggestion:** Add a tooltip or line: "You cannot approve your own request. The HR approvals queue will review it." Link to the approver list.

## HR-U-003: Two different counts for "pending approvals"
- **Where:** /hr/leaves tab "Approvals 2" vs /hr/approvals (Action Center) Leave count `0`, same user.
- **Observed:** Leaves tab counts 2 (own requests, which cannot be actioned) while Action Center counts 0 for Leave.
- **Suggestion:** Use one definition of "pending for me" across tabs, or label the leaves count "Pending across org".

## HR-U-004: Consistent name rules across HR forms
- **Where:** Employee names (/hr/onboarding Personal) vs Holiday Name (/hr/holidays).
- **Observed:** Holiday Name's helper text lists allowed characters ("letters, numbers, spaces, apostrophes, periods, and hyphens"); employee name fields accept none of the apostrophe/hyphen characters.
- **Suggestion:** Reuse one name-validator with the same helper text everywhere (see HR-B-001).

## HR-U-005: Leave type names differ between the request form and the list
- **Where:** /hr/leaves "Request leave" → Leave Type options "Casual Leave", "Sick Leave", "Earned Leave"; the My leaves table shows "Casual", "Sick", "Earned".
- **Suggestion:** Use the same label in both places (e.g. "Casual Leave").

## HR-U-006: Confirmation modal should show warnings, not just times
- **Where:** /hr/shifts → Create shift → "Create this shift?"
- **Observed:** The modal shows `(06:00 PM – 09:00 AM)` with no warning for a non-night shift (see HR-B-007).
- **Suggestion:** Show "Ends before it starts — enable Night Shift?" in the modal and disable the confirm button.

## HR-U-007: Duplicate name checks should name the existing record
- **Where:** Onboarding email duplicate (works well: "This email already belongs to an employee in your organization.") vs Departments (no check, HR-B-005).
- **Suggestion:** Same pattern everywhere; link to the existing record ("View QA HR Thirteen").

## HR-U-008: Employee-list search needs a visible "searching…" state and an empty state
- **Where:** /hr/employees search box.
- **Observed:** On a typed no-match search the list shows everyone with an error banner (HR-B-006); the URL keeps `?q=`.
- **Suggestion:** Show "No employees match 'zzzznomatch'. Clear search" as the empty state; debounce and cancel stale responses.

## HR-U-009: Clock-in cooldown lacks an explanation
- **Where:** /hr/attendance after "Clock out": button reads "Wait 1:46" with "Cooldown · 1:46".
- **Suggestion:** Explain why ("You can clock in again in 1:46 to prevent accidental double entries") and show the time it becomes available.

## HR-U-010: Attendance corrections list needs a clear empty/filter state
- **Where:** /hr/attendance "Attendance corrections" with filter "Needs a decision" after an action.
- **Observed:** Shows "No results match your filters. Corrections employees raise for this date range appear here." — good copy, but the item just actioned disappears without a success message (see HR-B-009).
- **Suggestion:** Toast "Correction approved for Wed, 14 Oct" and keep the item visible under "Approved".

## HR-U-011: Asset Returns and similar lists — use real empty states
- **Where:** /hr/asset-returns (HR-B-012), /hr/shifts (good empty state "Create your first shift template"), /hr/devices ("No time clock devices").
- **Suggestion:** Copy the Shifts empty-state pattern to every list.

## HR-U-012: Positive notes (keep)
- Duplicate-email check happens on Next, before Job Details.
- Future Date of Birth is impossible: the picker disables months after the current month.
- Leave date picker prevents "To" before "From" (earlier dates greyed out) and disables weekends.
- Leave reason needs at least 10 characters; attendance correction reports "Provide at least a check-in or check-out time" and "Check-out must be after check-in".
- Reject reason is required (the Reject button stays disabled until text is entered).
- Status filter syncs to the URL (`/hr/employees?status=inactive`) and "No results match your filters" with "Clear filters" works.
- Designation is HTML-escaped on display (`<img onerror>` text shown as text).
- Holiday name rejects `<script>` with a clear helper message.
- Unsaved Edit form prompts before navigating away (browser `beforeunload`).

## HR-U-013: No maximum length on person-name fields
- **Where:** /hr/onboarding Personal step — First Name accepted a 300-character value with no message (Last Name accepted 120 characters).
- **Suggestion:** Enforce a max length (e.g. 100) with a visible counter or inline message, matching the 200-character designation rule.

## HR-U-014: Onboarding gate hides the real access result for some members
- **Where:** /hr for qaview1012e redirects to /employee-onboarding ("Personal details … Skip for now") before the access-denied page. qamem1012c and qahr1014a went straight to /access-denied (or to HR after onboarding).
- **Observed:** Same org, same non-HR role; behaviour differs. A member who has not finished the wizard is shown a profile form when they tried to open HR, which looks like HR is available to them.
- **Suggestion:** Send only users who are allowed to onboard to the wizard; everyone else should see the Access Restricted page with the required permission.

## HR-U-015: "Finish your details" banner copy promises HR access that does not come
- **Where:** employee QA HR Thirteen after "Skip for now" (banner "Your own employee profile is still incomplete" / "Completing your employee profile activates your access to the HR module").
- **Observed:** Completing or skipping the wizard did not grant any hr:* permission; all HR routes stayed on access-denied (see RBAC.md Round 2).
- **Suggestion:** Reword to what completing the profile really does (e.g. "Complete your profile so HR can find your details"), or grant the promised access.

## HR-U-016: Directory is a "People" list with no explanation of who is in it
- **Where:** /directory for every non-HR member.
- **Observed:** The list shows 2 people (QA HR Thirteen and the owner). The viewing member is not listed, and there is no note explaining why. Work emails of all listed people are visible to every org member.
- **Suggestion:** Either explain the filter ("Showing people with a linked account") or list all active members. Confirm the intended visibility of work email to non-HR members.

## HR-U-017: Directory placeholder headers while loading
- **Where:** /directory, and /hr/asset-returns (same family as HR-B-012).
- **Observed:** "Loading results…" with placeholder headers "Column 1…6" shown for 5–10 s before the list appears.
- **Suggestion:** Render the real column headers immediately and a skeleton for the rows.

## HR-U-018: Leave balance card should show the calculation
- **Where:** /me/time-off "Available Days" card.
- **Observed:** "Available Days 11 · Prorated from your joining date (14 Oct 2026): 3 of 12 months" — the number does not match the text (see HR-B-014).
- **Suggestion:** Show "Entitlement X (prorated 3/12) − approved Y − pending Z = available W" so employees can check it.

## HR-U-019: Approver card needs requester and original vs requested times
- **Where:** /hr/attendance → "Attendance corrections" → "Needs a decision".
- **Observed:** The card shows only the requested times and reason (see HR-B-015).
- **Suggestion:** Show requester name/avatar, original punch, requested punch, and the delta.

---
# Round 3 (owner step-4 pass) — UX suggestions HR-U-020+

## HR-U-020: Policy edit sheet gives no feedback on save and no field-level reason
- **Where:** /hr/settings/policies → Edit (draft) → "Save Changes"
- **Observed:** Save on a draft policy (HR-B-018) closes nothing, shows no toast and no inline error. The only trace is a console 400.
- **Suggestion:** Show "Couldn't save: <reason>" inside the sheet, keep the sheet open with the typed values, and add a success toast ("Policy saved as draft v1").

## HR-U-021: Two rows with the same policy name in the list once a new version exists
- **Where:** /hr/settings/policies after "New Version" (HR-B-019) → "QA Leave 1013" appears twice (draft v2, active v1).
- **Suggestion:** Group versions under one policy row (expandable), or show "v2 (draft) of QA Leave 1013" in the name column.

## HR-U-022: Conflict message should not blame the same policy
- **Where:** Policy version "Cannot activate — resolve policy conflicts" (HR-B-019).
- **Observed:** The blocker is named as "QA Leave 1013" — the policy itself. "Raise priority, narrow scopes, or force-activate" is misleading advice for a self-conflict.
- **Suggestion:** Say "Overlaps with the active version of this policy (v1). Activating v2 will replace v1." and offer that action directly.

## HR-U-023: Department archive dialog names the department but not its code
- **Where:** /settings/organization/departments → Archive (HR-B-017). Dialog: "Checking whether "QA Dept 1013" is still used…".
- **Observed:** Two departments share the name "QA Dept 1013" (HR-B-005). The dialog cannot say which one is being archived.
- **Suggestion:** Show "QA Dept 1013 (QAD1013B)" in the title and the body text.

## HR-U-024: Holiday and shift row controls are icon-only with no visible hint
- **Where:** /hr/holidays List view (Edit / Delete icons) and /hr/shifts (pencil / trash icons).
- **Observed:** Both rows have edit and delete icons next to each other; a mis-click opens "Delete this holiday?" (a safe confirm, which is good). Holiday List view shows the icons only on hover.
- **Suggestion:** Keep the confirm dialogs (they work well). Show the icons always, or add a row menu ("…") so Edit and Delete are not adjacent.

## HR-U-025: Shift edit reads as a save but goes through a second confirm
- **Where:** /hr/shifts → Edit → Save Changes → "Save shift changes? Update "QA Shift 1013"? Existing assignments keep using this template."
- **Observed:** Confirm text is clear (good). But the edit sheet closes with no visible state while the confirm is open, which is confusing if the confirm is missed.
- **Suggestion:** Keep the sheet open behind the confirm, and show the changed fields (e.g. "Break 60 → 45 min") in the confirm body.


## HR-U-026: Termination "Create & Approve" is the only commit and it is final
- **Where:** /hr/termination → New Termination (also from the profile "Terminate" button).
- **Observed:** The form says "As FINAL, this will be automatically approved" and "Termination records are permanent". There is no Draft save, so the first click starts the offboarding (HR-B-025).
- **Suggestion:** Add "Save as draft" next to "Create & Approve", and a second confirmation that repeats the employee name, reason and effective date.

## HR-U-027: Complete Termination dialog should list its effects and show their result
- **Where:** /hr/termination → "Complete" → "Complete Termination".
- **Observed:** The text says it will "deactivate the employee's account, initiate the final settlement, and create asset return records" but does not list them, and the result screen does not confirm any of them (HR-B-025).
- **Suggestion:** List each effect with a checkbox or status ("Account: deactivated on save", "Settlement draft: created", "Asset returns: 0 open") and show the outcome after completion.

## HR-U-028: Exit page reads like an HR tool but its primary button is self-service
- **Where:** /hr/exit → "Submit resignation" (top right and empty state).
- **Observed:** Step copy says "from the employee or HR", but the dialog is "Submit Resignation" for the signed-in user ("Your last working date will be 13 Dec 2026").
- **Suggestion:** On the HR exit page, label the button "Record resignation" with an employee picker; keep "Submit resignation" for /me (see HR-B-024).

## HR-U-029: Asset return needs two confirmations and the "Received" label reads as a status
- **Where:** /hr/asset-returns: after "Log return" the row shows status "Pending" and an action labelled "Received"; the confirm reads "Mark this asset as returned in good condition?".
- **Observed:** The action name "Received" does not say it completes the return; the list does not say the asset is still assigned (HR-B-022).
- **Suggestion:** Label the action "Mark returned", and when confirmed, unassign the asset and say so in the toast.

## HR-U-030: Expense amount and "Other" category messages duplicate each other
- **Where:** /hr/expenses → New Expense Claim → Category "Other".
- **Observed:** Choosing "Other" shows two required fields: "What is the other category?" (with the hint "Letters, numbers, spaces, apostrophes, periods, and hyphens only.") and a second line "Please describe what the other category is" that is the same request.
- **Suggestion:** One field, one message.

## HR-U-031: HR expense queue does not show the owner's own pending claims and says nothing about it
- **Where:** /hr/expenses ("Expense Claims 0–0 of 0 total", "No expenses found") vs /me/expenses (4 Pending claims, including the owner's own).
- **Observed:** Own claims are not in the HR approvals list, and there is no note. Same pattern as own leave ("Needs another approver", HR-U-002).
- **Suggestion:** Show "Your own claims are approved by another approver" in the HR list, or show the owner's claims with the same note.

## HR-U-032: Helpdesk page has no way to raise a ticket from the HR side
- **Where:** /hr/helpdesk ("Employee support"): queue tabs HR / IT / Finance / Admin / Legal, "Queue settings", search. Create menu has People, Comms, Work, Docs items but no helpdesk request.
- **Observed:** "No HR requests — Requests routed to this queue appear here as employees raise them." No "New request" button. The owner could not create a helpdesk ticket (case created instead, see TEST-DATA R3-9).
- **Suggestion:** Add "New request" for HR staff (on behalf of an employee) or state where tickets are raised.
