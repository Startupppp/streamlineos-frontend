# payroll — pending items recovered from the QA zips

These were still open, partial, blocked, or not re-checked. Fixed and pass items are omitted.

## PAY-B-001 — still open

Latest status source: `streamline-qa-reports/modules-2026-10-15/payroll/round-2/BUGS.md`

| ID | Title (short) | Round-2 result | Evidence (what I saw this round) |
| PAY-B-001 | Pay Day ordinals 21th/22th/23th | STILL OPEN | Policy > Edit > Pay Day list still reads "21th", "22th", "23th" (1st/2nd/3rd fine). Checked in the policy edit form because the setup wizard redirects to Settings once the policy is ACTIVE (same list). |

Write-up from `streamline-qa-reports/modules-2026-10-15/payroll/round-1/BUGS.md`:

### PAY-B-001 Pay Day dropdown shows wrong ordinal suffixes (21th, 22th, 23th)
- Severity: Low (cosmetic, but visible on a money-related setting)
- Route: /payroll/setup (step 1, "Pay Day" combobox)
- Steps: 1. Open /payroll/setup. 2. Open the "Pay Day" combobox. 3. Read options 21-23.
- Expected: "21st", "22nd", "23rd" (English ordinals, same as 1st/2nd/3rd).
- Actual exact text: "20th", "21th", "22th", "23th", "24th" ... (options 21-23 use "th").
- Impact: Looks unprofessional on a payroll config screen; users may doubt the pay day they choose.
- Likely code area: ordinal helper used by the setup wizard pay-day options (e.g. a shared formatOrdinal / i18n ordinal util; the 1-3 and 31 cases special-cased, 21/22/23 missed).
- Fix: Use a standard ordinal function (suffix by n%10 and n%100 in 11-13) for 1..28.
- Acceptance check: Pay Day list reads 21st, 22nd, 23rd; unit test for 1..31 ordinals passes (11th,12th,13th stay "th").

## PAY-B-002 — blocked, not confirmed fixed

Latest status source: `streamline-qa-reports/modules-2026-10-15/payroll/round-2/BUGS.md`

| ID | Title (short) | Round-2 result | Evidence (what I saw this round) |
| PAY-B-002 | Raw permission/setting keys on setup step 4 | BLOCKED | /payroll/setup now redirects to /payroll/settings (policy ACTIVE), so the step 4 review cannot be rendered. Re-test needs a DRAFT policy or a fresh org. Not re-run activation (out of scope). |

Write-up from `streamline-qa-reports/modules-2026-10-15/payroll/round-1/BUGS.md`:

### PAY-B-002 Raw internal permission key and settings key shown as user-facing labels
- Severity: Low
- Route: /payroll/setup (step 4 "Review" - Approval Chain and Employee Self-Service sections)
- Steps: 1. Complete setup steps 1-3 with India / Monthly / Indian Standard template. 2. Reach step 4 of 5. 3. Read "APPROVAL CHAIN" and "EMPLOYEE SELF-SERVICE" sections.
- Expected: Human labels, e.g. "Payroll approval (Payroll Admin)" and "Tax declarations allowed for employees". Permission codes may be shown only in a tooltip or admin view.
- Actual exact text: "payroll:runs:approve" under "1 Payroll Admin Approval"; and "allowTaxDeclarations" as the only text under "EMPLOYEE SELF-SERVICE".
- Impact: Internal identifiers leak into an admin-facing review screen; admins cannot tell what they are approving; looks unfinished.
- Likely code area: setup review step component (renders the raw permission/config key instead of the label map); check the feature-flag / permission label dictionary.
- Fix: Map permission and setting keys to localized labels; fall back to a humanized label, never the raw key.
- Acceptance check: Step 4 shows no colon-separated permission strings and no camelCase keys; labels exist for every key in the approval chain and self-service sections.

## PAY-B-003 — partial

Latest status source: `streamline-qa-reports/modules-2026-10-15/payroll/round-2/BUGS.md`

| ID | Title (short) | Round-2 result | Evidence (what I saw this round) |
| PAY-B-003 | Percent-of accepts 150% | PARTIAL | Negative percent is now blocked inline (-5: "Enter a percentage like 50 or 12.5"; no request sent). 150 is still accepted with no message (201) and stored as FORMULA "QA1015BASIC * 150 / 100" with percent null. See PAY-B-027. |

Write-up from `streamline-qa-reports/modules-2026-10-15/payroll/round-1/BUGS.md`:

### PAY-B-003 Percent-of component accepts 150% of Basic (no 0-100 limit)
- Severity: High (wrong pay math once a run is calculated; HRA of 150% of basic would inflate gross)
- Route: /payroll/components → "Add Component" → Calc. Method "Percent of…"
- Steps: 1. Create "QA1015 Basic" (Fixed Amount 25000, Earning). 2. Add Component, Name "QA1015 HRA", Code "QA1015HRA", Earning, Calc. Method "Percent of…", Percentage "150", Of "Basic". 3. Click "Add Component".
- Expected: Blocked before save with an inline error on the Percentage field, e.g. "Percentage must be between 0 and 100". (Salary structures are also expected to reject >100%.)
- Actual: No inline error. Dialog shows "Creating…" then "Component created". List shows "QA1015 HRA / QA1015HRA, Earning, PERCENT OF BASIC, 150.0000%" as Active.
- Impact: A component that pays 150% of basic is accepted silently and will flow into any salary profile that uses it, inflating gross/net on the next calculated run.
- Likely code area: component create/update validation (client Zod schema for percentage and server schema for `percentage`); the percent field has no max(100) rule.
- Fix: Add min(0) and max(100) on percentage for percent-based calc methods (client and server); show inline error under "Percentage (%)".
- Acceptance check: 150 and -5 are rejected with an inline message; 0 and 100 are accepted; the API rejects 150 with a 400 that the UI maps to the field.
- Note: test record QA1015HRA(150%) is deleted again after this report (see TEST-DATA.md).

## PAY-B-005 — still open

Latest status source: `streamline-qa-reports/modules-2026-10-15/payroll/round-2/BUGS.md`

| ID | Title (short) | Round-2 result | Evidence (what I saw this round) |
| PAY-B-005 | Editing any component fails: Unrecognized key "code" | STILL OPEN | Edit "QA1015R2 Big" (Sort Order 0 to 1), Save: PATCH /payroll/components/:id returns 400 {"path":"body","message":"Unrecognized key: \"code\""}. Dialog stays open, nothing saved. |

Write-up from `streamline-qa-reports/modules-2026-10-15/payroll/round-1/BUGS.md`:

### PAY-B-005 Editing any salary component fails: "Unrecognized key: \"code\""
- Severity: High (components cannot be corrected after creation; blocks the edit/re-run path)
- Route: /payroll/components → pencil (Edit) on a row → "Save Changes"
- Steps: 1. Open Edit Component for "QA1015 HRA" (code QA1015HRA). 2. Change "Percentage (%)" from 150 to 40 (or change "Sort Order" from 0 to 1). 3. Click "Save Changes".
- Expected: Dialog closes, toast "Component updated", list shows the new value (40.0000% of Basic).
- Actual: Dialog stays open, the value is not saved (list still shows 150.0000%), and a toast reads: Unrecognized key: "code". Repeated with a second, unrelated change (Sort Order) with the same result.
- Impact: Any component edit is blocked. Admins cannot fix a wrong percentage or amount without deleting and re-creating the component, which also breaks any salary profile already linked to it.
- Likely code area: component update handler/schema on the API (`PATCH /payroll/components/:id` strict schema rejects `code`) and the edit form, which sends the full record including the immutable `code` field.
- Fix: Either omit `code` from the update payload (code is immutable after create, shown read-only in edit) or accept it in the update schema when unchanged. Show the code field as disabled in Edit.
- Acceptance check: Editing Percentage 150→40 and Sort Order saves, the toast says "Component updated", and reloading shows the new value; the request body contains no key the schema does not accept.

## PAY-B-007 — still open

Latest status source: `streamline-qa-reports/modules-2026-10-15/payroll/round-2/BUGS.md`

| ID | Title (short) | Round-2 result | Evidence (what I saw this round) |
| PAY-B-007 | 307-char Legal Entity: raw server error; no maxlength | STILL OPEN | Input has no maxlength (attribute null). 307 chars accepted in the field; Save returns 400 and toast "legalEntityName: Too big: expected string to have <=200 characters". |

Write-up from `streamline-qa-reports/modules-2026-10-15/payroll/round-1/BUGS.md`:

### PAY-B-007 Legal Entity Name over 200 characters: raw server error, no max length on the input
- Severity: Low
- Route: /payroll/settings → Policy Profile → Edit → "Legal Entity Name" → Save Changes
- Steps: 1. Edit the Policy Profile. 2. Type 307 characters into "Legal Entity Name". 3. Click "Save Changes".
- Expected: Input stops at 200 characters (maxlength) or shows "Legal entity name must be 200 characters or fewer" under the field.
- Actual: The field accepts all 307 characters with no counter. Toast reads "legalEntityName: Too big: expected string to have <=200 characters" (camelCase field key and the zod message).
- Impact: Internal key name and framework wording shown to the admin; the form gives no warning before submit.
- Likely code area: policy profile form schema (max(200) only on the server, no client rule, no maxLength attribute); error mapper that prints `field: message`.
- Fix: Add maxLength=200 and a counter or inline error on the field; map server errors to "Legal entity name must be 200 characters or fewer".
- Acceptance check: The input cannot exceed 200 characters or shows an inline error; toast text has no camelCase key.

## PAY-B-008 — still open

Latest status source: `streamline-qa-reports/modules-2026-10-15/payroll/round-2/BUGS.md`

| ID | Title (short) | Round-2 result | Evidence (what I saw this round) |
| PAY-B-008 | PF/ESI toggle pre-fills Effective From with a past month | STILL OPEN | ESI switch (off to on) opens "Create Policy Version" with Effective From 2026-08 (past) and empty Reason. Cancelled; ESI still off, no version created. PF (on) opens a "Disable Provident Fund" confirm instead; cancelled, PF still on. |

Write-up from `streamline-qa-reports/modules-2026-10-15/payroll/round-1/BUGS.md`:

### PAY-B-008 Statutory toggle opens "Create Policy Version" with Effective From pre-filled to a past month (2026-08)
- Severity: Medium (a default that would back-date a statutory change if accepted without review)
- Route: /payroll/settings → Statutory Compliance → "Provident Fund (PF)" switch
- Steps: 1. Click the Provident Fund (PF) switch (do not submit). 2. Read the "Create Policy Version" drawer.
- Expected: Effective From defaults to the current or next payroll month (2026-10 or 2026-11) or is empty and required; past months are rejected.
- Actual: Effective From is pre-filled "2026-08" (two months before today, 15 Oct 2026). The impact preview says "1 employee affected, Statutory codes: PF_EMP, PF_ER". Reason is empty. Nothing is submitted in this round (drawer closed with Cancel).
- Impact: A one-click "Create Version" would back-date a PF change into a closed month and change calculations for past periods.
- Likely code area: policy version drawer default value (uses a stale or fixed date instead of the current month) and missing "effective date must not be in the past" rule.
- Fix: Default Effective From to next payroll month; reject past months with "Effective month cannot be in the past"; require Reason for statutory changes.
- Acceptance check: Drawer opens with the next month; 2026-08 is rejected inline; Create Version stays disabled until a valid month and reason are entered.

## PAY-B-009 — still open

Latest status source: `streamline-qa-reports/modules-2026-10-15/payroll/round-2/BUGS.md`

| ID | Title (short) | Round-2 result | Evidence (what I saw this round) |
| PAY-B-009 | Basic salary has no upper limit; 20 digits gives generic 500 | STILL OPEN | Basic "99999999999999999999" + Create Template: POST /hr/payroll/salary-structures 500, no inline message on Basic. 12-digit case not re-submitted (round 1 already left an absurd inactive template). The component side has no cap either (PAY-B-026). |

Write-up from `streamline-qa-reports/modules-2026-10-15/payroll/round-1/BUGS.md`:

### PAY-B-009 Basic salary has no upper limit: 12-digit value saved, 20-digit value gives "Something went wrong on our end"
- Severity: High (a typo can store a salary of ₹10^12; a longer value fails with a generic server error instead of a field message)
- Route: /payroll/salary-structures → "Add Template" → "Basic Salary (₹)"
- Steps: 1. Add Template, Template Name "QA1015 Huge Test", Effective From 15 Oct 2026. 2. Basic Salary "99999999999999999999" (20 digits), click "Create Template". 3. Change Basic Salary to "999999999999" (12 digits) and click "Create Template".
- Expected: Both are rejected with an inline message such as "Basic salary must be at most ₹1,00,00,00,000" (or a sensible cap). No server error.
- Actual: No inline message for either value; "Create Template" stays enabled. 20 digits → toast "Something went wrong on our end. Please try again shortly." (server error). 12 digits → "Template created successfully"; the card shows "₹9,99,99,99,99,999 basic/mo" and "Gross ₹13,99,99,99,99,998.50/mo".
- Impact: Absurd salary values are saved; the template then appears as a valid reference structure, and any copy of it into a profile would produce absurd pay. Generic 500 for bad input also hides the real problem.
- Likely code area: salary template form schema (no max on basicSalary) and the API numeric parsing (values above Number.MAX_SAFE_INTEGER or 20-digit strings reach a calculation that throws).
- Fix: Add a max for basic and allowances (and an inline message), validate on the server with the same limit and return 400 with a field message; never 500 on user input.
- Acceptance check: 20-digit and 12-digit values show an inline error; the server returns 400, not 500; a value at the cap saves.
- Cleanup: template "QA1015 Huge Test" (basic 999999999999) is deleted after this report (see TEST-DATA.md).

## PAY-B-011 — partial

Latest status source: `streamline-qa-reports/modules-2026-10-15/payroll/round-2/BUGS.md`

| ID | Title (short) | Round-2 result | Evidence (what I saw this round) |
| PAY-B-011 | Breakup preview says activate policy while DRAFT | PARTIAL | Preview now renders (policy ACTIVE). Guide, Settings and preview agree (ACTIVE). The DRAFT error card cannot be re-tested because the UI cannot revert to DRAFT. Root cause (activation, PAY-B-015) still open. |

Write-up from `streamline-qa-reports/modules-2026-10-15/payroll/round-1/BUGS.md`:

### PAY-B-011 Salary breakup preview says "Activate a payroll policy" while the setup guide says the policy is active (policy is DRAFT)
- Severity: High (the template form and the preview are blocked; the Command Center guide and Settings disagree)
- Route: /payroll/salary-structures → "Add Template" (salary breakup preview panel) ; /payroll ("Payroll setup guide") ; /payroll/settings ("Current payroll policy · DRAFT")
- Steps: 1. Open Command Center /payroll: the setup guide shows "Activate your payroll policy" as Done (3 of 5 done). 2. Open /payroll/settings: the header says "Current payroll policy · DRAFT". 3. Open Add Template and change any amount.
- Expected: Either the policy is active (status ACTIVE, preview works) or the guide says it is not active yet. Preview renders the salary breakup.
- Actual: Preview panel shows "Something went wrong — Activate a payroll policy before previewing a salary breakup", with a Reference id and "Try again". It stays after the amount is fixed. Settings status stays DRAFT. The panel is a generic error card, not an explanation with a link to Settings.
- Impact: Breakup preview (and possibly run calculation, which needs an active policy) cannot be used; the guide tells the admin the step is done, so they will not know what to fix.
- Likely code area: policy status (DRAFT vs ACTIVE) read by the breakup endpoint vs the guide's "policy activated" flag; no separate activation action is visible in Settings.
- Fix: Make the guide step depend on the same status the preview uses; in the preview, show "Your payroll policy is still a draft. Activate it in Settings → Policy" with a link instead of a generic error.
- Acceptance check: Guide, Settings and preview agree on policy status; with a draft policy the preview shows an actionable message with a link; with an active policy the breakup renders.

## PAY-B-013 — still open

Latest status source: `streamline-qa-reports/modules-2026-10-15/payroll/round-2/BUGS.md`

| ID | Title (short) | Round-2 result | Evidence (what I saw this round) |
| PAY-B-013 | Profile heading shows the UUID | STILL OPEN | H1 on /payroll/employees/32613221-… and on the QA Probe Pay profile is the UUID; document title "Salary Profile — Payroll". |

Write-up from `streamline-qa-reports/modules-2026-10-15/payroll/round-1/BUGS.md`:

### PAY-B-013 Salary profile page heading shows the profile UUID instead of the employee name
- Severity: Low
- Route: /payroll/employees/32613221-63e5-41fd-ad21-bd5b5cc73277
- Steps: 1. Open /payroll/employees and click the QA Emp row. 2. Read the page heading.
- Expected: "QA Emp" (with email as a subtitle) as the heading; the ID may be shown as a small reference.
- Actual: The H1 reads "32613221-63e5-41fd-ad21-bd5b5cc73277". The region label and page title also use the UUID ("Salary Profile — Payroll").
- Impact: Admins cannot tell whose salary they are editing; the wrong profile could be edited by mistake.
- Likely code area: salary profile header uses employee id as the title (name lookup missing or not loaded when the header renders).
- Fix: Use the employee display name in the heading; fall back to the email, never the UUID.
- Acceptance check: H1 reads "QA Emp" for this profile; no UUID in the H1 or the page title.

## PAY-B-014 — still open

Latest status source: `streamline-qa-reports/modules-2026-10-15/payroll/round-2/BUGS.md`

| ID | Title (short) | Round-2 result | Evidence (what I saw this round) |
| PAY-B-014 | Salary profile Edit fails: 400 even when unchanged | STILL OPEN | Update with unchanged values: PATCH /payroll/employees/:id/profiles/5 400, toast "Failed to update profile". Response: {"path":"body","message":"Unrecognized key: \"effectiveFrom\""}. Same class as PAY-B-005. |

Write-up from `streamline-qa-reports/modules-2026-10-15/payroll/round-1/BUGS.md`:

### PAY-B-014 Salary profile "Edit profile" fails for every change: "Failed to update profile" (HTTP 400), even with unchanged values
- Severity: High
- Route: /payroll/employees/32613221-63e5-41fd-ad21-bd5b5cc73277 → "Edit profile" → "Update"
- Steps: 1. Open QA Emp's profile. 2. Click "Edit profile". 3. Change Annual CTC from 600000 to 720000 and click "Update" (also tried 720000.00). 4. Restore 600000 and click "Update" with no other change.
- Expected: "Salary profile updated", new CTC shown on the profile and in the Employees list; or, for an unchanged form, the dialog closes without error.
- Actual: Every submit shows the toast "Failed to update profile". The dialog stays open. The console shows three 400 responses from PATCH /payroll/employees/:id/profiles/5. The CTC stays ₹6,00,000.00.
- Impact: Salary cannot be corrected or revised, so the "edit and re-run" path for pay changes is blocked. The same request body shape also fails for unchanged values, which points to a schema problem rather than bad input.
- Likely code area: salary profile update endpoint validation (400 on the PATCH body the edit form sends; probably an extra or missing key, the same class as PAY-B-005 for components).
- Fix: Align the form payload with the update schema; return field-level 400 messages mapped to the form; add an API test that PATCHes an unchanged profile.
- Acceptance check: Editing the CTC and saving shows "Salary profile updated" and the new value after reload; an unchanged save succeeds.

## PAY-B-020 — still open

Latest status source: `streamline-qa-reports/modules-2026-10-15/payroll/round-2/BUGS.md`

| ID | Title (short) | Round-2 result | Evidence (what I saw this round) |
| PAY-B-020 | Double-click on Create Template creates two templates | STILL OPEN | Real dblclick on Create Template ("QA1015R2 DblClick Recheck"): two POST /hr/payroll/salary-structures, both 201, two identical cards. A single click gives one POST (checked with "QA1015R2 Guard Test"). Duplicates deactivated in cleanup. |

Write-up from `streamline-qa-reports/modules-2026-10-15/payroll/round-1/BUGS.md`:

### PAY-B-020 Double-clicking "Create Template" creates two identical templates
- Severity: Medium (duplicate records from one intent; no in-flight guard on the button)
- Route: /payroll/salary-structures → "Add Template" → "Create Template"
- Steps: 1. Add Template: Name "QA1015 DblClick Test", Basic 30000, Effective From 15 Oct 2026. 2. Double-click "Create Template" once (two clicks in quick succession). 3. Read the template list.
- Expected: One template is created. The button disables on the first click and shows "Creating…" for the duration of the request (the same guard the Components dialog already shows).
- Actual: Toast "Template created successfully" and two cards named "QA1015 DblClick Test" (both Active, same values). The button does not stay disabled after the first click.
- Impact: Duplicate active templates from a double click (same problem as PAY-B-010 but created by one click pattern).
- Likely code area: salary template dialog submit handler (no pending state or idempotency key) and the create endpoint (no unique name check).
- Fix: Disable the submit button and set aria-busy while the request is in flight; add an idempotency key or the unique name rule from PAY-B-010.
- Acceptance check: Double-click creates exactly one template; the second click is ignored; the list shows one card.
- Cleanup: one of the two "QA1015 DblClick Test" cards is deactivated after this report (see TEST-DATA.md).

## PAY-B-021 — still open

Latest status source: `streamline-qa-reports/modules-2026-10-15/payroll/round-2/BUGS.md`

| ID | Title (short) | Round-2 result | Evidence (what I saw this round) |
| PAY-B-021 | Payslip template Preview opens an empty drawer | STILL OPEN | /payroll/payslips?tab=templates > Classic Table > Preview: drawer "Preview — Classic Table" with subtitle only; no frame, image, text or download. No iframe/embed/canvas in the DOM. |

Write-up from `streamline-qa-reports/modules-2026-10-15/payroll/round-1/BUGS.md`:

### PAY-B-021 Payslip template "Preview" opens an empty drawer (no sample payslip rendered)
- Severity: Medium (the only payslip preview available before a run is locked is blank, so the payslip layout cannot be checked)
- Route: /payroll/payslips?tab=templates → "CLASSIC · Classic Table (Default)" → "Preview"
- Steps: 1. Open /payroll/payslips and select the "Templates" tab. 2. Click "Preview" on "Classic Table". 3. Wait 10 s and read the drawer.
- Expected: The drawer title "Preview — Classic Table" and a rendered sample payslip (earnings, deductions, net, PDF or HTML), with a download action.
- Actual: Subtitle "Sample payslip rendered with this template." and an empty body: no text, no image or frame, no download button. Same for the other templates tested (Modern Compact, Detailed Compliance were not opened).
- Impact: Users cannot check what an employee's payslip will look like, and payslip download cannot be tested from the template side. Publications stays "No eligible runs - Lock a payroll run to publish payslips", so a payslip cannot be seen before a run is locked.
- Likely code area: payslip template preview renderer (sample data or the PDF/HTML render call returns nothing; no error state).
- Fix: Render a sample payslip with sample numbers or show an error with a retry; add a download button; if no preview is possible, do not open an empty drawer.
- Acceptance check: Preview shows a sample payslip whose gross − deductions = net; the download button produces a file.

## PAY-B-025 — still open

Latest status source: `streamline-qa-reports/modules-2026-10-15/payroll/round-2/BUGS.md`

| ID | Title (short) | Round-2 result | Evidence (what I saw this round) |
| PAY-B-025 | PF Deduction % accepts 150 with no % message | STILL OPEN | PF 150: no percentage message; Create disabled only by the aggregate rule "Deductions cannot exceed gross" (PF 150% of basic always exceeds gross). PF 120: no message at all and Create enabled once a date is set, so out-of-range PF % can be saved. Not submitted. |

Write-up from `streamline-qa-reports/modules-2026-10-15/payroll/round-1/BUGS.md`:

### PAY-B-025 Template PF Deduction % accepts 150 with no inline message (HRA % shows "Enter a percentage between 0 and 100")
- Severity: Medium
- Route: /payroll/salary-structures → "Add Template" → "PF Deduction %"
- Steps: 1. Add Template, enter Basic 50000, PF Deduction % 150, name "QA1015 PF150 Check", Effective From 15 Oct 2026. 2. Leave the field (click elsewhere).
- Expected: Inline "Enter a percentage between 0 and 100" under PF Deduction %, and "Create Template" disabled.
- Actual: No message; "Create Template" is enabled; the value 150 is accepted (not submitted in this round).
- Impact: Same as PAY-B-003 for the template path: a 150% PF deduction would pass the form.
- Likely code area: template form validation applies the 0–100 rule to HRA % only.
- Fix: Apply the same percentage schema to every % field (HRA, PF, any component %) on the template and component forms.
- Acceptance check: 150 in PF Deduction % shows the inline message and disables Create.

## PAY-B-027 — still open

Latest status source: `streamline-qa-reports/modules-2026-10-15/payroll/round-2/BUGS.md`

| ID | Page | Severity | Title |
| PAY-B-027 | Components (/payroll/components) | Medium | Percent-of above 100 is saved as a FORMULA; percent is lost and the list shows "Formula" |

Write-up from `streamline-qa-reports/modules-2026-10-15/payroll/round-2/BUGS.md`:

### PAY-B-027 Percent-of above 100 is stored as a FORMULA; the percent is lost and the list shows "Formula"
- Severity: Medium (partner to PAY-B-003; the percent cannot be seen or edited as a percent afterwards)
- Route: /payroll/components → Add Component → Calc. Method "Percent of…" → Percentage "150", Of "QA1015 Basic"
- Steps: 1. Create "QA1015R2 Pct 150" (Percent of, 150, Of QA1015 Basic). 2. Read the list row.
- Expected: Either rejected (PAY-B-003) or stored as PERCENT_OF_BASIC with percent 150 and shown as "150.0000%".
- Actual: POST 201 with calcMethod "FORMULA", formula "QA1015BASIC * 150 / 100", percent null. The list Value shows "Formula". In the QA Probe Pay profile and the breakup it appears as ₹37,500 (25,000 x 150%).
- Impact: Accepted >100% pay lines are invisible in the catalog; a user cannot see which percentage is applied; "% of" lines become unreviewable.
- Likely code area: the component form submits "percent of" as a formula when the percent is not clamped; the server maps percent to FORMULA; the list renders Value from amount/percent only.
- Fix: Keep PERCENT_OF_BASIC; validate 0–100 (PAY-B-003); render Value as "150%" for percent lines.
- Acceptance check: percent lines keep method PERCENT_OF_BASIC; value 150 is rejected; 40 displays "40.0000%".
- Cleanup: "QA1015R2 Pct 150" deactivated/deleted (see TEST-DATA.md).

## PAY-B-028 — still open

Latest status source: `streamline-qa-reports/modules-2026-10-15/payroll/round-2/BUGS.md`

| ID | Page | Severity | Title |
| PAY-B-028 | Components (/payroll/components) | Low | Zero-value components are accepted and go Active (0% of Basic, ₹0 lines in breakup) |

Write-up from `streamline-qa-reports/modules-2026-10-15/payroll/round-2/BUGS.md`:

### PAY-B-028 Zero-value components accepted and go Active
- Severity: Low
- Route: /payroll/components → Add Component → Percent of… → Percentage "0"
- Steps: 1. Create "QA1015R2 Pct 0" (Percent of, 0, Of QA1015 Basic).
- Expected: Either blocked ("A component with zero value has no effect") or flagged as inactive draft.
- Actual: 201, Active, formula "QA1015BASIC * 0 / 100"; appears as a ₹0 earnings line in the Add Template breakup.
- Impact: Noise in breakups and reports; a zero component can later be given a value by someone who misreads it as configured.
- Likely code area: component create validation (no min > 0 for percent or amount-based lines).
- Fix: Require a non-zero value for percent/fixed earning lines, or warn and save as Draft.
- Acceptance check: 0 is rejected or saved as Draft and excluded from the breakup.
- Cleanup: "QA1015R2 Pct 0" deactivated/deleted (see TEST-DATA.md).

## PAY-B-029 — still open

Latest status source: `streamline-qa-reports/modules-2026-10-15/payroll/round-2/BUGS.md`

| ID | Page | Severity | Title |
| PAY-B-029 | Components (/payroll/components) | Low | Component name accepts raw markup (<script>); escaped on render, but no input rule |

Write-up from `streamline-qa-reports/modules-2026-10-15/payroll/round-2/BUGS.md`:

### PAY-B-029 Component name accepts raw markup
- Severity: Low (hygiene; no script ran)
- Route: /payroll/components → Add Component → Name
- Steps: 1. Name "<script>alert(1)</script>QA1015R2", Code "QA1015R2XSS", Fixed 100.
- Expected: Name limited to letters, numbers, spaces and basic punctuation, with an inline message; or stored and shown escaped.
- Actual: 201. Shown as literal text in the list and breakup; no script executed (checked: no script nodes created in the DOM).
- Impact: Stored markup will reach any surface that renders names without escaping (exports, emails, PDF payslips). Low today, risky later.
- Likely code area: component name schema (no character rule); payslip/PDF renderer should be checked for escaping.
- Fix: Add a name pattern (or strip tags) on client and server; check escaping in payslip PDF and CSV export.
- Acceptance check: "<" and ">" are rejected inline; the name renders as plain text in list, breakup, payslip and CSV.
- Cleanup: "QA1015R2XSS" deactivated/deleted (see TEST-DATA.md).

## PAY-B-037 — still open

Latest status source: `streamline-qa-reports/modules-2026-10-15/payroll/round-2/BUGS.md`

| ID | Page | Severity | Title |
| PAY-B-037 | Settings > Policy > Start Month | Low | Past months (Jan-Sep 2026) selectable as Start Month with no warning |

Write-up from `streamline-qa-reports/modules-2026-10-15/payroll/round-2/BUGS.md`:

### PAY-B-037 Start Month accepts past months with no warning
- Severity: Low
- Route: /payroll/settings → Policy Profile → Edit → Start Month
- Steps: 1. Edit the policy. 2. Open Start Month and read the options (October 2026 is the current month; the list starts at January 2026).
- Expected: Start Month limited to the current or a future month, or a warning when a past month is chosen (back-dated start is a deliberate choice).
- Actual: January to September 2026 are selectable with no warning; the policy is active.
- Impact: A back-dated start month can be chosen by mistake and makes earlier periods appear payable.
- Likely code area: policy form month list (generated from a fixed start point, not from today).
- Fix: Limit options to today's month onward, or warn and require a reason for past months.
- Acceptance check: a past month shows a warning; the default is the current month.
