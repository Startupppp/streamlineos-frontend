# BUGS - StreamlineOS Payroll Round 1 (QA1015)

Tester: Grok Bot (QA, owner Aditya Challa approved)
Date: 2026-10-15

## Page: Payroll Setup wizard, step 1 (/payroll/setup)

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

## Page: Payroll Setup wizard, step 4 review (/payroll/setup)

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


## Page: Components catalog - Add Component (/payroll/components)

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

### PAY-B-004 Component validation errors are raw technical strings in a toast; no inline field errors
- Severity: Medium
- Route: /payroll/components → "Add Component" (Fixed Amount and Code fields)
- Steps: 1. Add Component, Name "QA1015 Test", Code "QA1015TST", Calc. Method "Fixed Amount", Fixed Amount "abc" (or "-500"). 2. Click "Add Component". 3. Read the toast and the form. Then set Code to "qa 1015 basic!" and submit.
- Expected: Inline error under the field in plain language, e.g. "Enter an amount in rupees (numbers only, up to 2 decimals)" and "Code can use only capital letters, numbers and underscores". Dialog stays open with the message next to the field.
- Actual: Toast only, and it shows the server's raw text: "amount: Invalid string: must match pattern /^\d+(\.\d{1,2})?$/" and "code: Code must be uppercase letters, digits, or underscores". Nothing appears under the field. The "Creating…" button label stays for many seconds before the toast appears. A submit with an invalid code and a negative amount showed no message at all in the first attempt (only a 400 in the console).
- Impact: Users cannot tell which field failed or what format is allowed; the regex leaks; a negative amount is not stopped on the client (it is only rejected by the server).
- Likely code area: components form (client validation missing for amount/code; error mapping shows the API `path: message` pair unchanged).
- Fix: Add client validation for amount (>= 0, numeric, max 2 decimals) and code (A-Z, 0-9, _), show errors inline, and map server field errors to the same inline fields; drop the regex from user-facing text.
- Acceptance check: "-500", "abc" and "qa 1015 basic!" each show an inline message under the right field, no toast carries "/^\d" or a field-name prefix, and no request is sent when the client check fails.

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

## Page: Payroll Settings - Policy Profile (/payroll/settings)

### PAY-B-006 Blank Legal Entity Name shows "Policy updated" but nothing is saved
- Severity: Medium (a success message for a change that did not happen; no required-field message)
- Route: /payroll/settings → Policy Profile → Edit → "Legal Entity Name" → Save Changes
- Steps: 1. Edit the Policy Profile. 2. Clear "Legal Entity Name" (value was "QA1015 Legal Entity"). 3. Click "Save Changes". 4. Reload /payroll/settings.
- Expected: Either a required error under the field ("Legal entity name is required") and no save, or the empty value is saved and the view shows an empty/"Not set" label. Success must match what was stored.
- Actual: Toast "Policy updated" appears. After reload the view still reads "Legal Entity: QA1015 Legal Entity". No inline error.
- Impact: The admin believes the policy changed when it did not; the change is silently dropped.
- Likely code area: policy profile form (empty string is stripped/treated as "unchanged" on the update path; no required rule on the field) and the update mutation that still reports success.
- Fix: Decide whether legal entity name is required; enforce it in the client and server; if optional, persist "" and show "Not set". Never show "Policy updated" unless the response changed the stored value.
- Acceptance check: Clear + save shows an inline message or persists the empty value; after reload the view matches the toast.

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

## Page: Salary Structure Templates - Add Template (/payroll/salary-structures)

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

### PAY-B-010 Duplicate salary template name is accepted
- Severity: Medium
- Route: /payroll/salary-structures → "Add Template"
- Steps: 1. Create template "QA1015 Structure HRA150" (Basic 50000, HRA 40%, PF 12%, PT 200, Effective From 15 Oct 2026). 2. Open Add Template again with the same name, same values, and submit.
- Expected: Blocked with "A template named "QA1015 Structure HRA150" already exists" (inline on Template Name).
- Actual: Second template is created. The list shows two cards named "QA1015 Structure HRA150" with identical values and no way to tell them apart.
- Impact: Duplicate templates confuse whoever assigns structures; a wrong copy can be picked.
- Likely code area: salary template create (no unique (org, name) check, or the check only exists on components, not templates).
- Fix: Enforce unique active template name per org (case-insensitive, trimmed); show inline error; or add a "Duplicate" action that appends a suffix.
- Acceptance check: Second create with the same name is rejected inline (409/400 mapped to the name field); no two active cards share a name.
- Cleanup: one duplicate card is removed after this report (see TEST-DATA.md).

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

## Page: Salary Profile - QA Emp (/payroll/employees/:id)

### PAY-B-012 No UI to assign salary components or a salary structure to an employee
- Severity: High (blocks the "assign to QA Emp" step; the structure never reaches a payroll run)
- Route: /payroll/employees → "Add salary" (create) and /payroll/employees/:id → "Edit profile"
- Steps: 1. Open QA Emp's salary profile (32613221-…). 2. Read "Salary Components": "No components configured for this profile." 3. Click "Edit profile". 4. Look for any way to add or pick components or a salary structure template. 5. Repeat with "Add salary" on /payroll/employees.
- Expected: A way to attach components (or a template) to the profile, e.g. "Add component" or "Apply structure", with the components and amounts listed under Salary Components.
- Actual: No such control. The Edit Salary Profile panel only has Annual CTC, Worker Type, Currency, Tax Regime, Cost Center. The salary template card (Salary Structures) has only Edit / Delete (Delete actually means "Deactivate") and states "Edit an employee's structure there so it flows into their run", but the employee screen has no structure field. Result: the profile has 0 components and the run pays from the component catalog only.
- Impact: The structure created in the QA cycle cannot be assigned, so gross and deductions in the run do not reflect the intended structure (see PAY-B-016).
- Likely code area: salary profile component assignment (API exists per the copy; UI missing) and the Salary Structures copy that points users to a control that does not exist.
- Fix: Add a "Structure / components" picker on the profile (choose an active template or add components with amount), show the breakdown, and make the template copy point to it.
- Acceptance check: QA Emp can be given the QA1015 structure from the profile; Salary Components lists its lines; the next run recalculates gross from them.

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

## Page: Payroll Setup step 5 / Command Center (/payroll/setup, /payroll)

### PAY-B-015 "Activate Payroll" says "Payroll is already active" while the policy is DRAFT, then silently seeds 8 default components next to the QA components
- Severity: Medium
- Route: /payroll/setup step 4 "Looks good, activate" → step 5 "Activate Payroll"; /payroll/settings; /payroll/components
- Steps: 1. With the policy in DRAFT (/payroll/settings header "Current payroll policy · DRAFT", and the Readiness page says "activate a payroll policy before starting a run"), open /payroll/setup step 4 and click "Looks good, activate". 2. On step 5 click "Activate Payroll". 3. Open /payroll/components and /payroll/settings.
- Expected: One clear result: the policy becomes ACTIVE with a plain message such as "Payroll activated. 8 default components were added: review them before running payroll." Any wording must match the state before the click.
- Actual: Toast "Payroll is already active. Redirecting to settings…", then the page shows "Payroll is live! 8 components configured". Settings now read ACTIVE. Components gained 8 defaults (Basic Salary BASIC 40% of CTC, House Rent Allowance HRA 50% of basic, Special Allowance SPECIAL, PF_EMP 12%, PF_ER 12%, Professional Tax PT ₹200, TDS, LOP) with no review step, sitting beside the QA1015 components. Two HRA lines now exist (QA1015 HRA 40% and HRA 50%) and two basic-type lines.
- Impact: The message contradicts the state, and an admin may not know that duplicate HRA/basic lines are now active and would be paid on the next run.
- Likely code area: setup activation endpoint (returns a "conflict/already active" response for a DRAFT policy but still activates) and the default-component seeding on activation (no duplicate check against existing components).
- Fix: Return and show a single accurate result; list the seeded components with an option to review or skip; skip seeding a component whose code or role already exists, or warn about the duplicate HRA/basic lines.
- Acceptance check: After activation, the toast and step 5 say "activated"; the component list shows no two active lines with the same role; settings and guide agree.

### PAY-B-016 Run gross is ₹0 for QA Emp while the profile shows ₹50,000 est. monthly gross from CTC; only the ₹200 professional tax is applied
- Severity: High (wrong pay on the first calculated run; the profile and the run disagree)
- Route: /payroll/employees/32613221-… (Est. Monthly Gross ₹50,000.00 "Derived from annual CTC"; Salary Components "No components configured") and /payroll/runs/2 (October 2026 draft run)
- Steps: 1. With QA Emp CTC ₹6,00,000 and no components, open the profile and note Est. Monthly Gross ₹50,000 and Est. Monthly Net ₹50,000. 2. Click "Create run" for October 2026 on /payroll/readiness. 3. Open the run and read the QA Emp row and the Salary Breakdown.
- Expected: Either the run uses the same monthly gross as the profile estimate (₹50,000) or the profile says gross is unknown until components are set. Deductions reflect statutory items actually enabled.
- Actual: Run row: Gross ₹0.00, Deductions ₹200.00 (Professional Tax), Net -₹200.00. Breakdown: Earnings none, EPF Employee ₹0.00, EPF Employer ₹0.00, Gross ₹0.00, Deductions −₹200.00, Net Pay -₹200.00. The profile still says Est. Monthly Gross ₹50,000.
- Impact: A run calculated from the profile pays nothing and deducts tax; if this were approved the employee would be underpaid by ₹50,000 gross. The estimate on the profile is misleading.
- Likely code area: payroll engine input resolution (profile CTC not converted to components when none are configured) and the profile estimate (computed from CTC independently of the engine).
- Fix: Either compute earnings from the profile CTC/default structure, or make the run raise a blocker "No salary components for QA Emp" (not a zero-gross row); make the profile estimate use the same logic as the run.
- Acceptance check: Run gross equals the profile estimate for a CTC-only profile (or a blocker names the missing components); gross - deductions = net on every row.

### PAY-B-017 Negative net pay is shown as a payable total (Net Payable -₹200.00) and as a top earner
- Severity: High (negative payout totals are presented as normal numbers)
- Route: /payroll/runs/2 (summary cards, Variance tab "Top Earners This Run")
- Steps: 1. Open the October 2026 draft run with QA Emp net -₹200.00. 2. Read "Net Payable" and the Variance tab.
- Expected: Net payable total cannot be negative: the run is blocked with a clear message, and the total shows 0 or "—" with the blocker. A negative net is not a "top earner".
- Actual: "Net Payable -₹200.00", "NET -₹200.00", and Variance → Top Earners "QA Emp -₹200.00". The exception list does flag NEGATIVE_NET_PAY (good), but the totals still carry the negative.
- Impact: Totals sent to bank or finance would be negative; the Variance view ranks a negative pay as a top earner.
- Likely code area: run totals aggregation (sums net without clamping/validating) and the Variance top-earner query (sorts by net without a > 0 filter).
- Fix: Keep the NEGATIVE_NET_PAY blocker; exclude negative nets from payable totals and from top-earner lists; show the blocked amount separately.
- Acceptance check: With a negative-net employee the Net Payable card shows the blocker and no negative total; Top Earners excludes that employee.

### PAY-B-018 Run blocker and exception counts disagree: header "BLOCKERS · 1" vs list "Blocker 2"; tab badge "2" while the list has 5 items
- Severity: Low
- Route: /payroll/runs/2 (summary card, Exceptions tab)
- Steps: 1. Open the October 2026 draft run. 2. Read the header card "BLOCKERS · 1 / 2 open exception(s)". 3. Open the Exceptions tab.
- Expected: One count everywhere: e.g. "2 blockers, 2 warnings, 1 info" in the header; the tab badge matches the total or is labelled "Blockers".
- Actual: Header "BLOCKERS · 1" and "2 open exception(s)". Tab badge "2". The list shows Blocker 2 (NEGATIVE_NET_PAY, MISSING_LOCKED_INPUT_PERIOD), Warning 2 (MISSING_ATTENDANCE_INPUT, MISSING_PF_UAN), Info 1 (PENDING_TAX_DECLARATION).
- Impact: Users cannot tell how many items block the run.
- Likely code area: run summary counter (counts only one severity or stale data) vs exceptions list query.
- Fix: Derive all counts from the same exception list; label the badge by severity.
- Acceptance check: Header blockers count equals the number of Blocker rows; the total equals the list length.

### PAY-B-019 Run detail: Inputs tab is an empty table; Variance/Inputs tab click can show "Payroll run error" (reproduced once)
- Severity: Medium
- Route: /payroll/runs/2 → tabs Employees / Exceptions / Inputs / Variance (also /payroll/runs/2?tab=inputs)
- Steps: 1. Open /payroll/runs/2. 2. Click the "Inputs" tab. 3. Wait 20 s. 4. Click "Variance". Then load /payroll/runs/2?tab=inputs directly.
- Expected: Inputs lists the attendance/leave/variable inputs per employee (or says "No inputs yet"); tabs switch without an error page.
- Actual: First in-app click on Inputs replaced the whole page with "Payroll run error — Failed to load this payroll run. Please try again." with Try Again; a later direct load of ?tab=inputs shows an empty table (header only, blank rows, no empty-state text). ?tab=variance loads correctly and shows "No previous run found — variance comparison unavailable."
- Impact: The inputs check that payroll depends on (MISSING_ATTENDANCE_INPUT and MISSING_LOCKED_INPUT_PERIOD blockers) cannot be reviewed from the run.
- Likely code area: run detail tab loader (inputs query error not caught, rendered as a page-level error) and the inputs table's empty state.
- Fix: Catch the inputs query error inside the tab; show an empty state "No inputs for this period. Import attendance" with a link to Attendance Inputs.
- Acceptance check: Inputs tab opens without a page error; with no inputs it shows an empty state; the blocker links to the Inputs tab.

## Page: Salary Structure Templates - double submit (/payroll/salary-structures)

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

## Page: Payslips and Reports (/payroll/payslips, /payroll/reports)

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

### PAY-B-022 Journal says "Total Debit ₹0.00 · Total Credit ₹0.00 ✓ Balanced" while its lines carry ₹200 credit and -₹200 net; statutory codes are unmapped
- Severity: High (a finance-facing screen reports a balanced journal that is not balanced; the codes do not match the component catalog)
- Route: /payroll/reports → "Journal" tab (run October 2026)
- Steps: 1. Open /payroll/reports, select "Journal" for October 2026 (the draft run with QA Emp net -₹200). 2. Read the table and footer.
- Expected: Totals equal the line sums (debit 0 vs credit 200 is not balanced), or the journal says it cannot balance until the codes are mapped. Component codes match the catalog.
- Actual: Lines: "UNMAPPED:EPF_EMPLOYEE", "UNMAPPED:EPF_EMPLOYER", "UNMAPPED:PROFESSIONAL_TAX" (credit ₹200.00 for Professional Tax), "Salaries Payable - Net payable to employees -₹200.00". Footer: "Total Debit: ₹0.00 · Total Credit: ₹0.00 ✓ Balanced". The banner says the unmapped codes "were excluded from the journal" yet the PT line is shown. The catalog codes are PF_EMP, PF_ER and PT (see /payroll/components), so the engine and catalog disagree on codes (EPF_EMPLOYEE vs PF_EMP, PROFESSIONAL_TAX vs PT).
- Impact: A finance user could post or reconcile a journal that does not balance; statutory lines are silently dropped from accounting; the component code mismatch means mappings set on the catalog never apply.
- Likely code area: journal builder (sums only mapped lines, shows unmapped lines anyway) and the component-code to engine-code map (PF_EMP/PT vs EPF_EMPLOYEE/PROFESSIONAL_TAX).
- Fix: Compute totals from the same lines shown; show "Not balanced" when a line is unmapped; align the engine codes with catalog codes; add an accounting mapping for the default components.
- Acceptance check: Footer total equals the sum of shown lines; with unmapped lines the status is "Not balanced - map N codes"; catalog code PT is recognised as Professional Tax.
- Note: The Journal "Post" action was not used (it would create a ledger batch). Nothing was posted.

## Page: Payroll Run detail - Add Adjustment (/payroll/runs/2)

### PAY-B-023 Manual earning adjustment shows "Adjustment added" but is not in the breakdown, gross or net after Recalculate
- Severity: High (a one-time payment added by finance is silently ignored by the calculation)
- Route: /payroll/runs/2 → QA Emp row → "Add Adjustment" → Type "Earning", Name, Amount, Note → "Add"; then "Recalculate" → "Recalculate"
- Steps: 1. Open the October 2026 draft run (QA Emp: gross ₹0, PT ₹200, net -₹200). 2. Add Adjustment: Type Earning, Name "QA1015 Test Allowance", Amount 5000, Note "QA1015 test adjustment", click "Add". 3. Click "Recalculate" and confirm. 4. Reload the page and open the QA Emp breakdown.
- Expected: The breakdown lists "QA1015 Test Allowance ₹5,000.00" under earnings; Gross ₹5,000.00; Deductions ₹200.00; Net ₹4,800.00 (gross − deductions = net).
- Actual: Toast "Adjustment added". After Recalculate and after a full reload the breakdown still shows Gross ₹0.00, Deductions ₹200.00, Net Pay -₹200.00, and no adjustment line. The run totals are unchanged (Gross ₹0.00, Net -₹200.00).
- Impact: Bonuses, allowances and corrections entered for a run are not paid and not shown; the payslip and bank file would be wrong once a run is approved.
- Likely code area: adjustments write path (rows saved but not read by the calculation / breakdown query), or the recalculation does not re-read manual adjustments.
- Fix: Include adjustments in the calc input and in the breakdown; add a test that an earning adjustment raises gross after Recalculate.
- Acceptance check: After adding a 5000 earning and Recalculate, gross is 5000, net is 4800, and the breakdown lists the line.
- Note: no remove control for the adjustment was found in the UI; the QA1015 adjustment remains on the draft run (see TEST-DATA.md).

### PAY-B-024 Salary breakup preview double-counts components: ₹1,65,000 monthly earnings for a ₹12,00,000 CTC, PF and professional tax deducted twice
- Severity: Critical (any profile priced from this catalog overpays; the preview is the main check before a run)
- Route: /payroll/salary-structures → "Add Template" (salary breakup preview, Sample CTC 1200000); the same engine feeds /payroll/components → "Preview breakup"
- Steps: 1. With the policy ACTIVE and the 12 catalog components present (QA1015 Basic 25000 fixed, QA1015 HRA 40% of Basic, QA1015 PF Employee 12% of Basic, QA1015 Prof Tax ₹200, plus the 8 defaults), open Add Template and read the breakup for Sample CTC 1200000 (annual). 2. Read Earnings, Deductions and Employer contributions.
- Expected: Monthly earnings equal the CTC split (₹1,00,000 gross/month for ₹12,00,000 CTC minus employer contribution). Each role appears once: one basic, one HRA, one PF employee, one professional tax. Net take-home is computed once.
- Actual: Earnings / month ₹1,65,000 = QA1015 Basic ₹25,000 + QA1015 HRA ₹40,000 + Basic Salary ₹40,000 + House Rent Allowance (exempt) ₹20,000 + Special Allowance ₹40,000. Deductions include QA1015 PF Employee ₹4,800 AND EPF Employee ₹1,800 (two PF lines); QA1015 Prof Tax ₹200 AND Professional Tax ₹200 (two PT lines). Net take-home / month ₹1,42,313.33 (₹17,07,759.96 / year), i.e. about ₹42,000/month more than the CTC supports. Employer cost / month ₹1,800.
- Impact: The engine pays earnings that exceed the CTC; every employee priced from the catalog is overpaid; statutory lines are duplicated (PF and PT deducted twice), and the employee net is understated by the duplicated deductions.
- Likely code area: component resolution in the engine (default seeded components and QA components with the same role both included; no de-duplication by role/code) and the CTC allocation (Special Allowance formula uses the wrong base when extra components exist).
- Fix: Resolve one active component per role (basic, HRA, PF_EMP, PT) with a clear rule; block or warn on duplicate roles in the catalog; allocate earnings so that total earnings + employer cost = CTC/12 (within rounding).
- Acceptance check: Breakup for CTC 1200000 shows earnings ≈ ₹1,00,000/month, one PF line, one PT line; sum of earnings − deductions = net; a test covers duplicate roles.
- Note: Cleanup: the 4 QA1015 catalog components and the active QA template remain (see TEST-DATA.md); the default 8 cannot be removed by this QA.

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
