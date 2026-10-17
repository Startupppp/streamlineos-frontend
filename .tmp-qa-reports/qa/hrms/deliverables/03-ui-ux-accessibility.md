# 03 UI/UX and accessibility findings
Chrome on Linux. Keyboard and DOM/ARIA inspection only; no real screen reader used (UNTESTED). Contrast not measured with a tool.

| ID | Area | Status | Severity |
|---|---|---|---|
| UX-01 | Raw schema error on Department | VERIFIED | Medium |
| UX-02 | Empty email says "Invalid email address" (onboarding) | VERIFIED | Low |
| UX-03 | Sign-in: same message for empty and malformed email | VERIFIED | Low |
| UX-04 | Phone country button has no accessible name | VERIFIED | Medium |
| UX-05 | Date picker keyboard day selection not confirmed | INFERRED (incomplete test) | Medium |
| UX-06 | Skip link after sidebar; ~54 tab stops to first field | VERIFIED | Medium |
| UX-07 | Radix dialogs missing description | VERIFIED (console) | Low |
| UX-08 | Asset form sequential validation | VERIFIED | Low |
| UX-09 | 375px clipped tabs and off-screen table actions | VERIFIED | Low |
| UX-10 | Light placeholder/helper text | INFERRED (not measured) | Low |
| UX-11 | /hrms 404 outside app shell | VERIFIED | Low |
| UX-12 | DOB calendar caps at ~Oct 2010 with no explanation | VERIFIED | Low |
| UX-13 | Skip-for-now bank step leaves "profile incomplete" banner | VERIFIED | Low |
| UX-14 | Self-approver note on /hr/leaves misleading | VERIFIED | Low |
| UX-15 | Access-denied page reveals internal permission keys (module:hr etc.) | VERIFIED | Low |
| UX-16 | Long skeletons without progress (directory, audit drawer) | VERIFIED intermittent | Low |
Navigation gaps at 768px and admin sidebar for Members are tracked as bugs HRMS-010 and HRMS-008.

## UX-01 Raw validation text on Department
- User tries: Next on Job Details without department.
- Observed: "Invalid input: expected string, received undefined" (3 of 3). Evidence: p1n_02_onb_jobdetails_empty_next.png, p3_11_onb_department_invalid_input.png
- Recommendation: "Select a department" inline, focus moves to the field.
- Why: raw schema text is meaningless to HR users.
- Verify: empty Next shows the new copy; aria-describedby links it.

## UX-02 Empty onboarding email
- Tries: Next with empty email. Observed: "Invalid email address" (P1 2, P3 1, P2). Evidence: p1n_01_onb_all_empty_next.png, p2_t6_onboarding_empty_next_errors.png
- Recommendation: empty -> "Email is required"; malformed -> "Enter a valid email, e.g. name@company.com".
- Why: tells the user what to fix. Verify: both cases show distinct copy.

## UX-03 Sign-in email validation
- Tries: submit empty, then 'abc'. Observed: same message both times. Evidence: 10_signin_empty_submit_validation.webp, 11_signin_abc_validation.webp
- Recommendation: same split as UX-02. Verify: two distinct messages.

## UX-04 Phone country selector unnamed
- Tries: screen-reader/keyboard user tabs to flag button. Observed: no accessible name (aria-expanded=false only). Evidence: p2_t6_onboarding_focus_ring_phone.png
- Recommendation: aria-label="Country code, India (+91)" updated on change.
- Why: WCAG 4.1.2. Verify: accessibility tree shows the name.

## UX-05 Leave date picker keyboard
- Tries: pick a date via keyboard. Observed: focus lands on "Previous month"; arrows did nothing; day cell never reached. Evidence: p2_t6_leave_drawer_datepicker_focus.png
- Recommendation: focus the selected/today cell on open; arrows move days, PageUp/Down months, Enter selects; or allow typed date entry (DD/MM/YYYY).
- Why: WCAG 2.1.1. Verify: complete a date selection with keyboard only.

## UX-06 Tab order / skip link
- Observed: ~45 sidebar stops; First Name ~54th stop; "Skip to content" reached only after the last control.
- Recommendation: make "Skip to main content" the first focusable element, targeting <main>.
- Verify: first Tab shows the skip link; Enter moves focus to page heading.

## UX-07 Dialog descriptions
- Observed: console "Missing Description or aria-describedby={undefined} for DialogContent" (several, incl. leave drawer).
- Recommendation: add DialogDescription (visually hidden if needed), e.g. "Request time off. Fields marked * are required."
- Verify: no warning in console.

## UX-08 Asset sequential validation
- Observed: empty submit shows only "Asset name is required"; Serial/Brand/Model errors only after name. Evidence: p1n_19_asset_empty_submit.png
- Recommendation: show all required-field errors at once with a summary "3 fields need attention".
- Verify: one submit lists all errors.

## UX-09 375px layout
- Observed: /hr/leaves module tabs clipped ("Approvals 1"), Status column and "Cancel request" off-screen; onboarding tabs clipped. Evidence: p2_r5_375_leaves.png, p2_r5_375_onboarding.png
- Recommendation: card layout per leave on mobile with actions visible; scroll fade indicator on tab row.
- Verify: at 375 every row action visible without horizontal scroll.

## UX-10 Contrast (INFERRED)
- Placeholder/helper text looks light; not measured. Recommendation: verify >=4.5:1 for helper text; placeholders not used as labels. Verify: axe/contrast tool.

## UX-11 /hrms 404
- Observed: plain 404 outside app shell. Evidence: 06_hrms_404.png. Recommendation: redirect /hrms to /hr, or in-shell 404 with "Go to HR". Verify: /hrms lands on /hr.

## UX-12 DOB limit
- Observed: calendar opens Dec 2010, days after ~Oct 2010 disabled, year list 1940-2010, no explanation. Evidence: p3_09_*, p3_10_*. Recommendation: helper text "Employee must be at least 16 (or policy value)"; allow typed entry; validate with message. Verify: helper shown; typed underage date shows message.

## UX-13 Bank step skip
- Observed: "Skip for now" leaves a profile-incomplete banner. Evidence: p2r_employee_onboarding_bank_step.webp. Recommendation: banner copy "Add bank details to receive salary - Add now" with dismiss/remind; if expected behaviour, state on skip "You can add this later from Profile > Bank". Verify: copy present.

## UX-14 Self-approver note
- Observed: /hr/leaves "You are the approver - decide in Action Center" on own leave, which cannot be self-approved. Evidence: p2_t1_leaves_self_approver_note.webp. Recommendation: "Awaiting approval from HR approvals queue" naming the actual approver. Verify: own leave shows correct approver.

## UX-15 Permission keys in access-denied
- Observed: /access-denied?required=module:hr, hr:custom-fields:manage etc. Recommendation: human copy "You don't have access to Custom fields. Ask your HR admin." Keep keys out of the URL/body or behind a details toggle. Verify: no raw keys displayed. (Low risk: keys are not secrets.)

## UX-16 Long skeletons
- Observed: directory ~4 s skeleton; audit drawer ~20 s. Recommendation: after 5 s show "Still loading..." and after 15 s a Retry. Verify: messages appear on throttled network.

## VERIFIED passes
Focus trap and Esc layering in leave drawer, focus return; onboarding step-1 aria-invalid + aria-describedby; visible focus rings; labeled form controls; 768 employees/leaves/onboarding fit.
