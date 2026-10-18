# Payroll — still to do

Completed items were removed after a check of the frontend on 17 Oct 2026.
What is left was still open, only partly fixed, or could not be confirmed because this repo has no backend.
Same defect filed under two IDs is listed once.
This file is the remaining payroll work. Duplicate and finished reports were removed. Skip any ID that is not listed below.

## Remaining bugs

### PAY-B-004 — FIXED (f29511abc), PENDING_BROWSER_VERIFICATION

Component validation errors are raw technical strings in a toast; no inline field errors

Latest report note: Raw technical errors in toast; no inline field errors: STILL OPEN | Fixed Amount -500: no inline message; toast reads "amount: Invalid string: must match pattern /^\d+(\.\d{1,2})?$/". Duplicate code 409 shows only a toast ("A component with code ... already exists"). Percent field does show inline text (see B-003).

- Severity: Medium
- Route: /payroll/components → "Add Component" (Fixed Amount and Code fields)
- Steps: 1. Add Component, Name "QA1015 Test", Code "QA1015TST", Calc. Method "Fixed Amount", Fixed Amount "abc" (or "-500"). 2. Click "Add Component". 3. Read the toast and the form. Then set Code to "qa 1015 basic!" and submit.
- Expected: Inline error under the field in plain language, e.g. "Enter an amount in rupees (numbers only, up to 2 decimals)" and "Code can use only capital letters, numbers and underscores". Dialog stays open with the message next to the field.
- Actual: Toast only, and it shows the server's raw text: "amount: Invalid string: must match pattern /^\d+(\.\d{1,2})?$/" and "code: Code must be uppercase letters, digits, or underscores". Nothing appears under the field. The "Creating…" button label stays for many seconds before the toast appears. A submit with an invalid code and a negative amount showed no message at all in the first attempt (only a 400 in the console).
- Impact: Users cannot tell which field failed or what format is allowed; the regex leaks; a negative amount is not stopped on the client (it is only rejected by the server).
- Likely code area: components form (client validation missing for amount/code; error mapping shows the API `path: message` pair unchanged).
- Fix: Add client validation for amount (>= 0, numeric, max 2 decimals) and code (A-Z, 0-9, _), show errors inline, and map server field errors to the same inline fields; drop the regex from user-facing text.
- Acceptance check: "-500", "abc" and "qa 1015 basic!" each show an inline message under the right field, no toast carries "/^\d" or a field-name prefix, and no request is sent when the client check fails.

### PAY-B-006 — FIXED (51affb5fe), PENDING_BROWSER_VERIFICATION

Blank Legal Entity Name shows "Policy updated" but nothing is saved

Latest report note: Blank Legal Entity Name shows success; nothing saved: STILL OPEN | Cleared the field and saved: PATCH 200, response legalEntityName still "QA1015 Legal Entity"; edit mode closes as if saved. The blank is silently dropped server-side.

- Severity: Medium (a success message for a change that did not happen; no required-field message)
- Route: /payroll/settings → Policy Profile → Edit → "Legal Entity Name" → Save Changes
- Steps: 1. Edit the Policy Profile. 2. Clear "Legal Entity Name" (value was "QA1015 Legal Entity"). 3. Click "Save Changes". 4. Reload /payroll/settings.
- Expected: Either a required error under the field ("Legal entity name is required") and no save, or the empty value is saved and the view shows an empty/"Not set" label. Success must match what was stored.
- Actual: Toast "Policy updated" appears. After reload the view still reads "Legal Entity: QA1015 Legal Entity". No inline error.
- Impact: The admin believes the policy changed when it did not; the change is silently dropped.
- Likely code area: policy profile form (empty string is stripped/treated as "unchanged" on the update path; no required rule on the field) and the update mutation that still reports success.
- Fix: Decide whether legal entity name is required; enforce it in the client and server; if optional, persist "" and show "Not set". Never show "Policy updated" unless the response changed the stored value.
- Acceptance check: Clear + save shows an inline message or persists the empty value; after reload the view matches the toast.

### PAY-B-010 — FIXED (6f30c9f05), PENDING_BROWSER_VERIFICATION

Duplicate salary template name is accepted

Latest report note: Duplicate salary template name accepted: STILL OPEN | Created a second "QA1015 Structure A" with the same name as the existing one: POST 201, "Template created successfully", no inline error. Deactivated again in cleanup.

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

### PAY-B-012 — FIXED (e77fb9766), PENDING_BROWSER_VERIFICATION

No UI to assign salary components or a salary structure to an employee

Latest report note: No UI to assign components or a structure to an employee: STILL OPEN | QA Emp: Edit Salary Profile has only Annual CTC, Worker Type, Currency, Tax Regime, Cost Center. Create Salary Profile (Add salary) has only Employee, Effective From, CTC, Worker Type, Currency, Tax Regime, Cost Center. No structure or component picker anywhere. QA Probe Pay shows components, but there is no UI control to add them.

- Severity: High (blocks the "assign to QA Emp" step; the structure never reaches a payroll run)
- Route: /payroll/employees → "Add salary" (create) and /payroll/employees/:id → "Edit profile"
- Steps: 1. Open QA Emp's salary profile (32613221-…). 2. Read "Salary Components": "No components configured for this profile." 3. Click "Edit profile". 4. Look for any way to add or pick components or a salary structure template. 5. Repeat with "Add salary" on /payroll/employees.
- Expected: A way to attach components (or a template) to the profile, e.g. "Add component" or "Apply structure", with the components and amounts listed under Salary Components.
- Actual: No such control. The Edit Salary Profile panel only has Annual CTC, Worker Type, Currency, Tax Regime, Cost Center. The salary template card (Salary Structures) has only Edit / Delete (Delete actually means "Deactivate") and states "Edit an employee's structure there so it flows into their run", but the employee screen has no structure field. Result: the profile has 0 components and the run pays from the component catalog only.
- Impact: The structure created in the QA cycle cannot be assigned, so gross and deductions in the run do not reflect the intended structure (see PAY-B-016).
- Likely code area: salary profile component assignment (API exists per the copy; UI missing) and the Salary Structures copy that points users to a control that does not exist.
- Fix: Add a "Structure / components" picker on the profile (choose an active template or add components with amount), show the breakdown, and make the template copy point to it.
- Acceptance check: QA Emp can be given the QA1015 structure from the profile; Salary Components lists its lines; the next run recalculates gross from them.

### PAY-B-015 — FIXED (2da12698a), PENDING_BROWSER_VERIFICATION

"Activate Payroll" says "Payroll is already active" while the policy is DRAFT, then silently seeds 8 default components next to the QA components

Latest report note: "Already active" while DRAFT; 8 defaults seeded: STILL OPEN (state evidence) | Could not re-run activation (already ACTIVE; step 4/5 redirects). State still shows the seeded defaults next to QA lines: Basic Salary BASIC, House Rent Allowance HRA 50%, Special Allowance, PF_EMP, PF_ER, PT, TDS, LOP, plus QA1015 lines. Two basics and two HRA lines are live.

- Severity: Medium
- Route: /payroll/setup step 4 "Looks good, activate" → step 5 "Activate Payroll"; /payroll/settings; /payroll/components
- Steps: 1. With the policy in DRAFT (/payroll/settings header "Current payroll policy · DRAFT", and the Readiness page says "activate a payroll policy before starting a run"), open /payroll/setup step 4 and click "Looks good, activate". 2. On step 5 click "Activate Payroll". 3. Open /payroll/components and /payroll/settings.
- Expected: One clear result: the policy becomes ACTIVE with a plain message such as "Payroll activated. 8 default components were added: review them before running payroll." Any wording must match the state before the click.
- Actual: Toast "Payroll is already active. Redirecting to settings…", then the page shows "Payroll is live! 8 components configured". Settings now read ACTIVE. Components gained 8 defaults (Basic Salary BASIC 40% of CTC, House Rent Allowance HRA 50% of basic, Special Allowance SPECIAL, PF_EMP 12%, PF_ER 12%, Professional Tax PT ₹200, TDS, LOP) with no review step, sitting beside the QA1015 components. Two HRA lines now exist (QA1015 HRA 40% and HRA 50%) and two basic-type lines.
- Impact: The message contradicts the state, and an admin may not know that duplicate HRA/basic lines are now active and would be paid on the next run.
- Likely code area: setup activation endpoint (returns a "conflict/already active" response for a DRAFT policy but still activates) and the default-component seeding on activation (no duplicate check against existing components).
- Fix: Return and show a single accurate result; list the seeded components with an option to review or skip; skip seeding a component whose code or role already exists, or warn about the duplicate HRA/basic lines.
- Acceptance check: After activation, the toast and step 5 say "activated"; the component list shows no two active lines with the same role; settings and guide agree.

### PAY-B-016 — FIXED (e77fb9766), PENDING_BROWSER_VERIFICATION

Run gross is ₹0 for QA Emp while the profile shows ₹50,000 est. monthly gross from CTC; only the ₹200 professional tax is applied

Latest report note: Run gross 0 vs profile 50,000: STILL OPEN | QA Emp: run 2 gross ₹0.00, deductions ₹200 (PT), net -₹200. Profile still reads Est. Monthly Gross ₹50,000.00 and Est. Monthly Net ₹50,000.00 ("Derived from annual CTC") with "No components configured".

- Severity: High (wrong pay on the first calculated run; the profile and the run disagree)
- Route: /payroll/employees/32613221-… (Est. Monthly Gross ₹50,000.00 "Derived from annual CTC"; Salary Components "No components configured") and /payroll/runs/2 (October 2026 draft run)
- Steps: 1. With QA Emp CTC ₹6,00,000 and no components, open the profile and note Est. Monthly Gross ₹50,000 and Est. Monthly Net ₹50,000. 2. Click "Create run" for October 2026 on /payroll/readiness. 3. Open the run and read the QA Emp row and the Salary Breakdown.
- Expected: Either the run uses the same monthly gross as the profile estimate (₹50,000) or the profile says gross is unknown until components are set. Deductions reflect statutory items actually enabled.
- Actual: Run row: Gross ₹0.00, Deductions ₹200.00 (Professional Tax), Net -₹200.00. Breakdown: Earnings none, EPF Employee ₹0.00, EPF Employer ₹0.00, Gross ₹0.00, Deductions −₹200.00, Net Pay -₹200.00. The profile still says Est. Monthly Gross ₹50,000.
- Impact: A run calculated from the profile pays nothing and deducts tax; if this were approved the employee would be underpaid by ₹50,000 gross. The estimate on the profile is misleading.
- Likely code area: payroll engine input resolution (profile CTC not converted to components when none are configured) and the profile estimate (computed from CTC independently of the engine).
- Fix: Either compute earnings from the profile CTC/default structure, or make the run raise a blocker "No salary components for QA Emp" (not a zero-gross row); make the profile estimate use the same logic as the run.
- Acceptance check: Run gross equals the profile estimate for a CTC-only profile (or a blocker names the missing components); gross - deductions = net on every row.

### PAY-B-017 — FIXED (be47a5e2d+6130ad7be), PENDING_BROWSER_VERIFICATION

Negative net pay is shown as a payable total (Net Payable -₹200.00) and as a top earner

Latest report note: Negative net shown as Net Payable and top earner: STILL OPEN | Run 2 after Recalculate: Net Payable ₹91,200.00 = QA Probe Pay ₹91,400 + QA Emp -₹200 (the negative is netted into the payable total). Variance > Top Earners lists "QA Emp -₹200.00". NEGATIVE_NET_PAY blocker is shown (good).

- Severity: High (negative payout totals are presented as normal numbers)
- Route: /payroll/runs/2 (summary cards, Variance tab "Top Earners This Run")
- Steps: 1. Open the October 2026 draft run with QA Emp net -₹200.00. 2. Read "Net Payable" and the Variance tab.
- Expected: Net payable total cannot be negative: the run is blocked with a clear message, and the total shows 0 or "—" with the blocker. A negative net is not a "top earner".
- Actual: "Net Payable -₹200.00", "NET -₹200.00", and Variance → Top Earners "QA Emp -₹200.00". The exception list does flag NEGATIVE_NET_PAY (good), but the totals still carry the negative.
- Impact: Totals sent to bank or finance would be negative; the Variance view ranks a negative pay as a top earner.
- Likely code area: run totals aggregation (sums net without clamping/validating) and the Variance top-earner query (sorts by net without a > 0 filter).
- Fix: Keep the NEGATIVE_NET_PAY blocker; exclude negative nets from payable totals and from top-earner lists; show the blocked amount separately.
- Acceptance check: With a negative-net employee the Net Payable card shows the blocker and no negative total; Top Earners excludes that employee.

### PAY-B-018 — FIXED (1fdbb95a0+6130ad7be), PENDING_BROWSER_VERIFICATION

Run blocker and exception counts disagree: header "BLOCKERS · 1" vs list "Blocker 2"; tab badge "2" while the list has 5 items

Latest report note: Blocker count disagrees (header 1, list 2, badge 2): STILL OPEN | After Recalculate: header "BLOCKERS · 1" and "3 open exception(s)"; Exceptions tab badge "3"; list has Blocker 3 (NEGATIVE_NET_PAY, MISSING_LOCKED_INPUT_PERIOD x2), Warning 5. Header and list still disagree.

- Severity: Low
- Route: /payroll/runs/2 (summary card, Exceptions tab)
- Steps: 1. Open the October 2026 draft run. 2. Read the header card "BLOCKERS · 1 / 2 open exception(s)". 3. Open the Exceptions tab.
- Expected: One count everywhere: e.g. "2 blockers, 2 warnings, 1 info" in the header; the tab badge matches the total or is labelled "Blockers".
- Actual: Header "BLOCKERS · 1" and "2 open exception(s)". Tab badge "2". The list shows Blocker 2 (NEGATIVE_NET_PAY, MISSING_LOCKED_INPUT_PERIOD), Warning 2 (MISSING_ATTENDANCE_INPUT, MISSING_PF_UAN), Info 1 (PENDING_TAX_DECLARATION).
- Impact: Users cannot tell how many items block the run.
- Likely code area: run summary counter (counts only one severity or stale data) vs exceptions list query.
- Fix: Derive all counts from the same exception list; label the badge by severity.
- Acceptance check: Header blockers count equals the number of Blocker rows; the total equals the list length.

### PAY-B-019 — FIXED (51affb5fe), PENDING_BROWSER_VERIFICATION

Run detail: Inputs tab is an empty table; Variance/Inputs tab click can show "Payroll run error" (reproduced once)

Latest report note: Inputs tab: empty table; run error page: STILL OPEN | Direct load /payroll/runs/2?tab=inputs: "Payroll run error — Failed to load this payroll run. Please try again." (Try Again). In-app click on Inputs does not switch the tab (stays on Variance). Console shows 404 for /payroll/runs/2/inputs. Variance tab loads fine.

- Severity: Medium
- Route: /payroll/runs/2 → tabs Employees / Exceptions / Inputs / Variance (also /payroll/runs/2?tab=inputs)
- Steps: 1. Open /payroll/runs/2. 2. Click the "Inputs" tab. 3. Wait 20 s. 4. Click "Variance". Then load /payroll/runs/2?tab=inputs directly.
- Expected: Inputs lists the attendance/leave/variable inputs per employee (or says "No inputs yet"); tabs switch without an error page.
- Actual: First in-app click on Inputs replaced the whole page with "Payroll run error — Failed to load this payroll run. Please try again." with Try Again; a later direct load of ?tab=inputs shows an empty table (header only, blank rows, no empty-state text). ?tab=variance loads correctly and shows "No previous run found — variance comparison unavailable."
- Impact: The inputs check that payroll depends on (MISSING_ATTENDANCE_INPUT and MISSING_LOCKED_INPUT_PERIOD blockers) cannot be reviewed from the run.
- Likely code area: run detail tab loader (inputs query error not caught, rendered as a page-level error) and the inputs table's empty state.
- Fix: Catch the inputs query error inside the tab; show an empty state "No inputs for this period. Import attendance" with a link to Attendance Inputs.
- Acceptance check: Inputs tab opens without a page error; with no inputs it shows an empty state; the blocker links to the Inputs tab.

### PAY-B-022 — FIXED (fd307e777), PENDING_BROWSER_VERIFICATION

Journal says "Total Debit ₹0.00 · Total Credit ₹0.00 ✓ Balanced" while its lines carry ₹200 credit and -₹200 net; statutory codes are unmapped

Latest report note: Journal "Balanced 0/0" while lines carry credit: PARTIAL | Footer now reads Total Debit ₹97,800.00 = Total Credit ₹97,800.00 ✓ Balanced, which equals the line sums. Still open: all lines are UNMAPPED:* codes (BASIC, HRA, QA1015BASIC…), the banner says these codes "were excluded from the journal" while they are in the table, and PROFESSIONAL_TAX / EPF_* are not mapped to catalog PT / PF_*.

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

### PAY-B-023 — FIXED (8dc833876), PENDING_BROWSER_VERIFICATION

Manual earning adjustment shows "Adjustment added" but is not in the breakdown, gross or net after Recalculate

Latest report note: Manual earning adjustment not in breakdown after Recalculate: STILL OPEN | Round-1 adjustment "QA1015 Test Allowance" plus new "QA1015R2 Adj Earn" ₹5,000 (POST …/adjustments 201). Recalculate 200. QA Emp breakdown: Gross ₹0.00, Net -₹200.00, no adjustment line.

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

### PAY-B-024 — FIXED (05c32964f; corrected by backend c09520db2), PENDING_BROWSER_VERIFICATION

Salary breakup preview double-counts components: ₹1,65,000 monthly earnings for a ₹12,00,000 CTC, PF and professional tax deducted twice

Latest report note: Breakup double counts components (PF and PT twice): STILL OPEN (worse) | Template Sample CTC ₹12,00,000: Earnings/month ₹1,00,02,03,599 (was ₹1,65,000 in round 1; QA1015R2 Big ₹99,99,99,999 now included), deductions ₹39,00,38,466.11, net ₹61,01,65,132.89/month. Still two basics, two HRA, two PF and two PT lines. Probe Pay run also doubles (PAY-B-031).

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

### PAY-B-031 — FIXED (05c32964f; corrected by backend c09520db2), PENDING_BROWSER_VERIFICATION

Draft run pays QA Probe Pay ₹96,000 gross on a ₹6,00,000 CTC (₹50,000 per month)

Latest report note: Run detail (/payroll/runs/2): Critical | Draft run pays QA Probe Pay ₹96,000 gross on a ₹6,00,000 CTC (₹50,000/mo)

- Severity: Critical (overpay: the run promises about 1.9x the CTC monthly before any approval)
- Route: /payroll/runs/2 → Recalculate → Employees row "QA Probe Pay" → Salary Breakdown
- Steps: 1. Profile CTC ₹6,00,000 (monthly ₹50,000). 2. On run 2, click Recalculate → Recalculate. 3. Open the QA Probe Pay breakdown.
- Expected: Gross about ₹48,200 (₹50,000 less employer EPF ₹1,800, or the CTC split); each role counted once (one basic, one HRA, one PF, one PT).
- Actual: Earnings ₹96,000 = QA1015 Basic 25,000 + QA1015 HRA 20,000 + QA1015 Refresh Test 1,000 + Basic Salary 20,000 + House Rent Allowance 10,000 + Special Allowance 20,000. Deductions ₹4,600 = QA1015 PF Employee 2,400 + QA1015 Prof Tax 200 + EPF Employee 1,800 + Professional Tax 200. Employer EPF ₹1,800. Net ₹91,400. The arithmetic is right (96,000 − 4,600 = 91,400); the inputs are wrong.
- Impact: A calculated run pays nearly double the CTC. Once approved, this would overpay the employee by about ₹46,000 a month. Duplicate PF and PT lines also reduce net.
- Likely code area: payroll engine component resolution (all active catalog lines with the same role are summed; no de-dup by role; the seeded defaults and QA lines both included). Same root cause as PAY-B-024.
- Fix: One active line per role per profile; block the run with a blocker when a profile's earnings exceed CTC/12 plus employer cost; add a test that gross ≤ CTC/12.
- Acceptance check: QA Probe Pay gross is within rounding of CTC/12 − employer cost, one PF and one PT line, and the run shows a blocker when they do not match.

### PAY-B-032 — FIXED (1f78019e7), PENDING_BROWSER_VERIFICATION

"% of Basic" components resolve against different bases

Latest report note: Run detail (/payroll/runs/2): High | "% of Basic" components use different bases: HRA 40% of ₹25,000 Basic shows ₹20,000; PF 12% shows ₹2,400 (12% of ₹20,000)

- Severity: High (wrong numbers on every percentage line; inconsistent within one payslip)
- Route: /payroll/runs/2 → Recalculate → QA Probe Pay breakdown (and /payroll/employees/a32a5b84-…, Salary Components)
- Steps: 1. Profile has QA1015 Basic FIXED ₹25,000 and Basic Salary FORMULA ₹20,000. 2. Read QA1015 HRA "40% of Basic" and QA1015 PF Employee "12% of Basic" after Recalculate.
- Expected: Both percentages use the same basic (₹25,000 if QA1015 Basic is the basic): HRA ₹10,000 and PF ₹3,000. Or the rule is defined and shown.
- Actual: HRA 40% = ₹20,000 (40% of ₹50,000); House Rent Allowance 50% = ₹10,000 (50% of ₹20,000); PF Employee 12% = ₹2,400 (12% of ₹20,000). Three different bases on one profile.
- Impact: No percent line can be checked by hand; the payslip would not reconcile to any stated rule.
- Likely code area: percent-of-basic base resolution (the engine uses "basic" from different sources: the first FIXED basic, the BASIC formula, and the sum of earning lines).
- Fix: Define one basic per profile (the BASIC role line) and use it for all PERCENT_OF_BASIC lines; show the base on the component row.
- Acceptance check: HRA 40% and PF 12% use the same base shown on the breakdown; hand calculation matches.

### PAY-B-033 — FIXED (738b83f3d), PENDING_BROWSER_VERIFICATION

Profile estimate and run gross disagree for the same employee

Latest report note: Salary Profile vs Run: High | Profile estimate (Est. Monthly Gross ₹46,000) and the run gross (₹96,000) for the same employee disagree

- Severity: High
- Route: /payroll/employees/a32a5b84-6ae1-4507-afe4-0245dbac2423 (Est. Monthly Gross ₹46,000, Est. Monthly Net ₹45,600, "After ₹400.00 deductions") vs /payroll/runs/2 (QA Probe Pay gross ₹96,000, net ₹91,400)
- Steps: 1. Read the profile estimate. 2. Recalculate run 2. 3. Read the run row.
- Expected: Estimate and run use the same engine; or the profile says the estimate is not a payroll figure.
- Actual: Profile ₹46,000 gross and ₹400 deductions vs run ₹96,000 gross and ₹4,600 deductions. The profile's ₹400 counts only the two PT lines and ignores PF; the run counts both PF and EPF.
- Impact: The screen an admin reviews before a run shows about half the amount the run will pay.
- Likely code area: profile "Est." figures (separate calculation path) vs run engine.
- Fix: Use the run engine for profile estimates, or label the estimate and show the difference.
- Acceptance check: profile estimate equals the run gross and deductions for the same inputs.

### PAY-B-034 — FIXED (5a28a7bd8), PENDING_BROWSER_VERIFICATION

CSV exports are a JSON envelope, not CSV

Latest report note: Reports / Export CSV: High | Exported CSV files contain a JSON envelope, not CSV

- Severity: High (finance and bank users cannot open the export as a spreadsheet; the register and journal files are invalid CSV)
- Route: /payroll/reports (header "Export CSV", October 2026) and /payroll/settings/import-export ("Export" button, Payroll Register)
- Steps: 1. On /payroll/reports click "Export CSV". 2. On /payroll/settings/import-export click "Export". 3. Open both files from ~/Downloads.
- Expected: Plain CSV: header row, one line per employee, numbers without quotes/envelope. Filename matches content.
- Actual: payroll-journal-2026-10.csv starts with {"success":true,"data":"account,description,debit,credit,costCenter\nUNMAPPED:BASIC,...". payroll-register-2026-10.csv starts with {"success":true,"data":"employeeId,name,department,...". The file is the raw API response saved as .csv. The journal export is also triggered from the Reports header while the Summary tab is open (the file name is payroll-journal, not a summary).
- Impact: Spreadsheet import fails or shows one cell; the register and journal cannot be reconciled outside the app.
- Likely code area: export handler returns the JSON response body (api envelope) instead of the `data` string; download filename chosen from the journal endpoint for the header button.
- Fix: Unwrap `data` on the client or return text/csv with Content-Disposition from the API; make the header button export the active tab's data; add an export test that parses the CSV.
- Acceptance check: Opening the file in a CSV parser gives a header row and one row per employee; the first byte is not "{".

### PAY-B-035 — FIXED (c1e6edf80), PENDING_BROWSER_VERIFICATION

Paid days default to 31 with no attendance; LOP and proration are not applied

Latest report note: Run detail, LOP / proration: High | Paid days default to 31 with no attendance input; LOP not computed

- Severity: High (a draft run pays full-month days for employees with no attendance; LOP and proration cannot work)
- Route: /payroll/reports (Payroll Register export) and /payroll/runs/2 (Exceptions: MISSING_ATTENDANCE_INPUT "LOP cannot be computed"); /payroll/inputs ("No input period found for October 2026. Open Period")
- Steps: 1. Recalculate run 2 with no attendance input period. 2. Export the register. 3. Read paidDays for QA Emp and QA Probe Pay.
- Expected: paidDays from attendance (or a blocker "No attendance for period; paid days unknown") and proration for LOP when days are missing; LOP shown as a line.
- Actual: paidDays 31.0 for both employees in the register. LOP is "ATTENDANCE_BASED" with no amount in the profile. No proration or LOP line in either breakdown, while the exception says LOP cannot be computed.
- Impact: Missing attendance silently pays full month. Any unpaid leave is paid in full.
- Likely code area: payroll engine input resolution (defaults paidDays to days-in-month when no input row exists); LOP component reads attendance only when a locked input period exists.
- Fix: When the input period is not locked/present, set paidDays to null and add a blocker; do not default to full month. Show LOP and proration lines.
- Acceptance check: With no attendance, the run shows a blocker and no full-month paid days; with 10 LOP days on a 31-day month the gross is prorated by 21/31 and an LOP line appears.
- Note: Attendance import and period opening were not tested (Open Period changes period state; not done).

### PAY-B-036 — FIXED (51affb5fe), PENDING_BROWSER_VERIFICATION

Annual CTC accepts letters and negatives with no inline message

Latest report note: Salary profile - Add salary / Edit profile: Medium | Annual CTC accepts letters and negatives with no inline message

- Severity: Medium
- Route: /payroll/employees → "Add salary" (Create Salary Profile) and /payroll/employees/:id → "Edit profile" (Annual CTC)
- Steps: 1. Open Add salary. 2. Type "-5", then "999999999999", then "abc" into Annual CTC and blur each time.
- Expected: Inline "Enter an annual amount (numbers only)" and a cap; Create disabled with the reason shown.
- Actual: No inline message for any of the three values; the field keeps "abc". Create stays disabled only because no employee is selected. Edit profile has the same field and also fails on save (PAY-B-014).
- Impact: Bad CTC values reach the server; the user sees no reason before submit.
- Likely code area: salary profile form (no client schema for annualCtc; a text input with no numeric type).
- Fix: Use a numeric input with min 0 and max cap; validate on blur and on submit; show inline messages.
- Acceptance check: "abc" cannot be typed; -5 and above-cap values show an inline message.
- Note: values were not submitted (no employee profile created).

## UX notes that are not done

### Must change
1. Make the draft run deletable or discardable; right now a test run cannot be removed from the UI. — FIXED (8f9372081), PENDING_BROWSER_VERIFICATION
2. Delete button on templates actually deactivates; rename the button or the dialog so they match. — FIXED (6f30c9f05), PENDING_BROWSER_VERIFICATION
3. Run page: "Submit for Approval" is the primary button while the run has blockers; disable it until blockers are cleared. — FIXED (8837c42f3+68e5baeb3), PENDING_BROWSER_VERIFICATION
4. Creating… spinner on components/templates can last 20+ seconds with no progress text. — VERIFIED IN CODE (hr-sheet.tsx:131-138, LoadingButton shows submit label with spinner; server-side latency only), PENDING_BROWSER_VERIFICATION

### Good to have
1. Readiness/Runs show "Run created 14 Oct 2026" while the local date is 15 Oct IST - show dates in the user's timezone. — VERIFIED IN CODE (date-utils.ts:79, toLocaleDateString uses browser local timezone for ISO timestamps), PENDING_BROWSER_VERIFICATION
2. Salary profile list: "Annual CTC" value sits under the wrong column header. — VERIFIED IN CODE (employees-list-page.tsx:128, column definition has className: "text-right"), PENDING_BROWSER_VERIFICATION
3. Tax report and Journal show internal codes (EPF_EMPLOYEE, PROFESSIONAL_TAX, UNMAPPED:…) as labels. — FIXED (e602eeccd+77da54c75), PENDING_BROWSER_VERIFICATION
4. Policy version drawer: explain what effective month means and show the affected employees by name. — VERIFIED IN CODE (toggle-settings-section.tsx:281 "The change applies from the first day of this month." + :259 affectedNamesText), PENDING_BROWSER_VERIFICATION
5. Number inputs accept "12e3"; restrict to digits and a decimal point. — FIXED (0b247d0a7), PENDING_BROWSER_VERIFICATION
6. Ordinals/labels and component names: keep codes out of employee-facing text. — VERIFIED IN CODE (breakdown-sheet.tsx:104, uses line.name not line.code), PENDING_BROWSER_VERIFICATION

### Must change
1. Put validation errors under the field, in plain words, for every money and code field. Still toast-only with raw text on Components (amount regex, code) and Legal Entity (camelCase key). Same for Annual CTC on the salary profile, which shows no message at all for "-5", "999999999999" or "abc" (PAY-B-004, B-007, B-036). — FIXED (f29511abc+51affb5fe), PENDING_BROWSER_VERIFICATION
2. Export files must open as CSV. Today the download is a JSON envelope; the Reports header button exports the journal even when another tab is open (PAY-B-034). — FIXED (5a28a7bd8), PENDING_BROWSER_VERIFICATION
3. Give adjustments a remove or void action (and show them in the breakdown). Adjustments on a draft run cannot be removed from the UI; the QA1015 test rows stay on run 2 (PAY-B-023, B-034 notes in TEST-DATA.md). — FIXED (8dc833876), PENDING_BROWSER_VERIFICATION
4. Show component roles on the catalog list (Basic, HRA, PF employee, PT) with a "duplicate role" warning. Today two basics, two HRAs, two PF and two PT lines are all active, and nothing says so (PAY-B-015, B-024, B-031). — FIXED (1f78019e7), PENDING_BROWSER_VERIFICATION
5. Show the percentage for percent lines (e.g. "150%") and the percentage base, not "Formula" (PAY-B-027, PAY-B-032). — FIXED (1f78019e7+aa5276cfc), PENDING_BROWSER_VERIFICATION
7. One count everywhere on the run: header "BLOCKERS · 1" vs Exceptions list Blocker 3 vs tab badge 3 (PAY-B-018). — FIXED (1fdbb95a0+6130ad7be), PENDING_BROWSER_VERIFICATION
8. Journal banner says unmapped codes "were excluded" while the rows are in the table and in the totals. Say "included, not mapped" and show "Not balanced - map N codes" until mapped (PAY-B-022). — FIXED (fd307e777), PENDING_BROWSER_VERIFICATION
9. Negative net is netted into "Net Payable" and shown as a top earner. Show it as a blocked amount, not as a payable total (PAY-B-017). — FIXED (be47a5e2d+6130ad7be), PENDING_BROWSER_VERIFICATION
10. Payroll run "Inputs" must open without the page-level error ("Payroll run error") and show an empty state with a link to Open Period (PAY-B-019). — FIXED (51affb5fe+e44771d9e), PENDING_BROWSER_VERIFICATION

### Good to have
1. Salary Template cards show no code or id, so two cards named "QA1015 Structure A" look identical. Show the created date and a short id on the card (PAY-B-010). — FIXED (32881623c), VERIFIED IN CODE (salary-structures-page.tsx:114), PENDING_BROWSER_VERIFICATION
2. Placeholders in the template form (50000, 40, 12, 200) look like entered values. Use "e.g." placeholders or show the default as a helper line. — VERIFIED IN CODE (salary-structure-template-sheet.tsx:244, all inputs have "e.g. N" placeholders), PENDING_BROWSER_VERIFICATION
3. Remove or clarify the "Labour Code wage definition: Basic+DA is 0.0% of gross" note in the breakup. It is a compliance hint that appears only because the breakup is wrong; hide it when the breakup fails sanity checks. — FIXED (66fc9e7ee), PENDING_BROWSER_VERIFICATION
5. Not-found pages for /payroll/runs/999999 and /payroll/employees/<missing-uuid> say "Not found … or you don't have access" with no link back to Payroll. Add a "Back to payroll runs" link. The /payroll/runs/not-a-uuid page uses a different title ("Run not found"); align them. — FIXED (77da54c75), PENDING_BROWSER_VERIFICATION
6. The component delete confirm says "permanently deleted … or deactivated instead". Tell the user which one will happen before they confirm (QA1015RFR was deactivated, not deleted, because a profile uses it). — VERIFIED IN CODE (components-page.tsx:252-257, dialog says "Deactivate component?" when profileCount > 0 and "Delete component?" otherwise, each with a clear explanation), PENDING_BROWSER_VERIFICATION
7. Percent "Enter a percentage like 50 or 12.5" is clear; keep this pattern for all percent fields. — VERIFIED IN CODE (percent-of-fields.tsx:34, placeholder "e.g. 50"), PENDING_BROWSER_VERIFICATION
8. Duplicate-code error (409) is clear ("A component with code ... already exists"); show it under the Code field. — VERIFIED IN CODE (component-form-sheet.tsx:101-104, 409 maps to form.setError("code")), PENDING_BROWSER_VERIFICATION
9. Adjustment amount error "Positive decimal required" under the field is good; keep it. — VERIFIED IN CODE (create-adjustment-dialog.tsx, inline validation error shown under amount field), PENDING_BROWSER_VERIFICATION
10. The PF switch on the policy page opens a "Disable Provident Fund (PF)?" confirm with "2 employees will be affected. Codes: PF_EMP, PF_ER"; list the names of the affected employees. — VERIFIED IN CODE (toggle-settings-section.tsx:224-225, affectedNamesText shows names from affectedEmployeeNames array), PENDING_BROWSER_VERIFICATION
11. Tab click on Inputs in the run page did not switch the tab. Make tab changes update the URL (?tab=) so the state is clear. — VERIFIED IN CODE (run-detail-content.tsx:50-53, handleTabChange sets params.set("tab", tab) and calls router.replace), PENDING_BROWSER_VERIFICATION
