# BUGS - StreamlineOS Payroll Round 2 (QA1015R2)

Tester: Grok Bot (QA, owner Aditya Challa approved)
Date: 2026-10-15 (IST). Org "ADitay CAhala". One tab only.
Scope rule: no finalize, approve, pay, file, lock or publish. Draft runs and previews only.

## Recheck of round-1 bugs (PAY-B-001..025)

Result counts (25 bugs): FIXED 0, PARTIAL 3 (PAY-B-003, PAY-B-011, PAY-B-022), STILL OPEN 21 (PAY-B-015 confirmed only from current state, activation not re-run), BLOCKED 1 (PAY-B-002). Partial fixes that were observed: negative percent is now blocked inline (B-003), the Journal footer now equals the line sums (B-022), and the policy and guide now agree (B-011).

| ID | Title (short) | Round-2 result | Evidence (what I saw this round) |
|---|---|---|---|
| PAY-B-001 | Pay Day ordinals 21th/22th/23th | STILL OPEN | Policy > Edit > Pay Day list still reads "21th", "22th", "23th" (1st/2nd/3rd fine). Checked in the policy edit form because the setup wizard redirects to Settings once the policy is ACTIVE (same list). |
| PAY-B-002 | Raw permission/setting keys on setup step 4 | BLOCKED | /payroll/setup now redirects to /payroll/settings (policy ACTIVE), so the step 4 review cannot be rendered. Re-test needs a DRAFT policy or a fresh org. Not re-run activation (out of scope). |
| PAY-B-003 | Percent-of accepts 150% | PARTIAL | Negative percent is now blocked inline (-5: "Enter a percentage like 50 or 12.5"; no request sent). 150 is still accepted with no message (201) and stored as FORMULA "QA1015BASIC * 150 / 100" with percent null. See PAY-B-027. |
| PAY-B-004 | Raw technical errors in toast; no inline field errors | STILL OPEN | Fixed Amount -500: no inline message; toast reads "amount: Invalid string: must match pattern /^\d+(\.\d{1,2})?$/". Duplicate code 409 shows only a toast ("A component with code ... already exists"). Percent field does show inline text (see B-003). |
| PAY-B-005 | Editing any component fails: Unrecognized key "code" | STILL OPEN | Edit "QA1015R2 Big" (Sort Order 0 to 1), Save: PATCH /payroll/components/:id returns 400 {"path":"body","message":"Unrecognized key: \"code\""}. Dialog stays open, nothing saved. |
| PAY-B-006 | Blank Legal Entity Name shows success; nothing saved | STILL OPEN | Cleared the field and saved: PATCH 200, response legalEntityName still "QA1015 Legal Entity"; edit mode closes as if saved. The blank is silently dropped server-side. |
| PAY-B-007 | 307-char Legal Entity: raw server error; no maxlength | STILL OPEN | Input has no maxlength (attribute null). 307 chars accepted in the field; Save returns 400 and toast "legalEntityName: Too big: expected string to have <=200 characters". |
| PAY-B-008 | PF/ESI toggle pre-fills Effective From with a past month | STILL OPEN | ESI switch (off to on) opens "Create Policy Version" with Effective From 2026-08 (past) and empty Reason. Cancelled; ESI still off, no version created. PF (on) opens a "Disable Provident Fund" confirm instead; cancelled, PF still on. |
| PAY-B-009 | Basic salary has no upper limit; 20 digits gives generic 500 | STILL OPEN | Basic "99999999999999999999" + Create Template: POST /hr/payroll/salary-structures 500, no inline message on Basic. 12-digit case not re-submitted (round 1 already left an absurd inactive template). The component side has no cap either (PAY-B-026). |
| PAY-B-010 | Duplicate salary template name accepted | STILL OPEN | Created a second "QA1015 Structure A" with the same name as the existing one: POST 201, "Template created successfully", no inline error. Deactivated again in cleanup. |
| PAY-B-011 | Breakup preview says activate policy while DRAFT | PARTIAL | Preview now renders (policy ACTIVE). Guide, Settings and preview agree (ACTIVE). The DRAFT error card cannot be re-tested because the UI cannot revert to DRAFT. Root cause (activation, PAY-B-015) still open. |
| PAY-B-012 | No UI to assign components or a structure to an employee | STILL OPEN | QA Emp: Edit Salary Profile has only Annual CTC, Worker Type, Currency, Tax Regime, Cost Center. Create Salary Profile (Add salary) has only Employee, Effective From, CTC, Worker Type, Currency, Tax Regime, Cost Center. No structure or component picker anywhere. QA Probe Pay shows components, but there is no UI control to add them. |
| PAY-B-013 | Profile heading shows the UUID | STILL OPEN | H1 on /payroll/employees/32613221-… and on the QA Probe Pay profile is the UUID; document title "Salary Profile — Payroll". |
| PAY-B-014 | Salary profile Edit fails: 400 even when unchanged | STILL OPEN | Update with unchanged values: PATCH /payroll/employees/:id/profiles/5 400, toast "Failed to update profile". Response: {"path":"body","message":"Unrecognized key: \"effectiveFrom\""}. Same class as PAY-B-005. |
| PAY-B-015 | "Already active" while DRAFT; 8 defaults seeded | STILL OPEN (state evidence) | Could not re-run activation (already ACTIVE; step 4/5 redirects). State still shows the seeded defaults next to QA lines: Basic Salary BASIC, House Rent Allowance HRA 50%, Special Allowance, PF_EMP, PF_ER, PT, TDS, LOP, plus QA1015 lines. Two basics and two HRA lines are live. |
| PAY-B-016 | Run gross 0 vs profile 50,000 | STILL OPEN | QA Emp: run 2 gross ₹0.00, deductions ₹200 (PT), net -₹200. Profile still reads Est. Monthly Gross ₹50,000.00 and Est. Monthly Net ₹50,000.00 ("Derived from annual CTC") with "No components configured". |
| PAY-B-017 | Negative net shown as Net Payable and top earner | STILL OPEN | Run 2 after Recalculate: Net Payable ₹91,200.00 = QA Probe Pay ₹91,400 + QA Emp -₹200 (the negative is netted into the payable total). Variance > Top Earners lists "QA Emp -₹200.00". NEGATIVE_NET_PAY blocker is shown (good). |
| PAY-B-018 | Blocker count disagrees (header 1, list 2, badge 2) | STILL OPEN | After Recalculate: header "BLOCKERS · 1" and "3 open exception(s)"; Exceptions tab badge "3"; list has Blocker 3 (NEGATIVE_NET_PAY, MISSING_LOCKED_INPUT_PERIOD x2), Warning 5. Header and list still disagree. |
| PAY-B-019 | Inputs tab: empty table; run error page | STILL OPEN | Direct load /payroll/runs/2?tab=inputs: "Payroll run error — Failed to load this payroll run. Please try again." (Try Again). In-app click on Inputs does not switch the tab (stays on Variance). Console shows 404 for /payroll/runs/2/inputs. Variance tab loads fine. |
| PAY-B-020 | Double-click on Create Template creates two templates | STILL OPEN | Real dblclick on Create Template ("QA1015R2 DblClick Recheck"): two POST /hr/payroll/salary-structures, both 201, two identical cards. A single click gives one POST (checked with "QA1015R2 Guard Test"). Duplicates deactivated in cleanup. |
| PAY-B-021 | Payslip template Preview opens an empty drawer | STILL OPEN | /payroll/payslips?tab=templates > Classic Table > Preview: drawer "Preview — Classic Table" with subtitle only; no frame, image, text or download. No iframe/embed/canvas in the DOM. |
| PAY-B-022 | Journal "Balanced 0/0" while lines carry credit | PARTIAL | Footer now reads Total Debit ₹97,800.00 = Total Credit ₹97,800.00 ✓ Balanced, which equals the line sums. Still open: all lines are UNMAPPED:* codes (BASIC, HRA, QA1015BASIC…), the banner says these codes "were excluded from the journal" while they are in the table, and PROFESSIONAL_TAX / EPF_* are not mapped to catalog PT / PF_*. |
| PAY-B-023 | Manual earning adjustment not in breakdown after Recalculate | STILL OPEN | Round-1 adjustment "QA1015 Test Allowance" plus new "QA1015R2 Adj Earn" ₹5,000 (POST …/adjustments 201). Recalculate 200. QA Emp breakdown: Gross ₹0.00, Net -₹200.00, no adjustment line. |
| PAY-B-024 | Breakup double counts components (PF and PT twice) | STILL OPEN (worse) | Template Sample CTC ₹12,00,000: Earnings/month ₹1,00,02,03,599 (was ₹1,65,000 in round 1; QA1015R2 Big ₹99,99,99,999 now included), deductions ₹39,00,38,466.11, net ₹61,01,65,132.89/month. Still two basics, two HRA, two PF and two PT lines. Probe Pay run also doubles (PAY-B-031). |
| PAY-B-025 | PF Deduction % accepts 150 with no % message | STILL OPEN | PF 150: no percentage message; Create disabled only by the aggregate rule "Deductions cannot exceed gross" (PF 150% of basic always exceeds gross). PF 120: no message at all and Create enabled once a date is set, so out-of-range PF % can be saved. Not submitted. |

## New bugs (PAY-B-026 onward)

### Summary of new bugs (12: 1 Critical, 5 High, 3 Medium, 3 Low; details below)
| ID | Page | Severity | Title |
|---|---|---|---|
| PAY-B-026 | Components (/payroll/components) | High | Fixed amount has no upper bound: 999999999 saved and flows into the breakup |
| PAY-B-027 | Components (/payroll/components) | Medium | Percent-of above 100 is saved as a FORMULA; percent is lost and the list shows "Formula" |
| PAY-B-028 | Components (/payroll/components) | Low | Zero-value components are accepted and go Active (0% of Basic, ₹0 lines in breakup) |
| PAY-B-029 | Components (/payroll/components) | Low | Component name accepts raw markup (<script>); escaped on render, but no input rule |
| PAY-B-030 | Salary Profile - QA Probe Pay (/payroll/employees/:id) | Medium | Components list shows "QA1015 Basic" (FIXED ₹25,000) with Percent 150.0000% |
| PAY-B-031 | Run detail (/payroll/runs/2) | Critical | Draft run pays QA Probe Pay ₹96,000 gross on a ₹6,00,000 CTC (₹50,000/mo) |
| PAY-B-032 | Run detail (/payroll/runs/2) | High | "% of Basic" components use different bases: HRA 40% of ₹25,000 Basic shows ₹20,000; PF 12% shows ₹2,400 (12% of ₹20,000) |
| PAY-B-033 | Salary Profile vs Run | High | Profile estimate (Est. Monthly Gross ₹46,000) and the run gross (₹96,000) for the same employee disagree |
| PAY-B-034 | Reports / Export CSV | High | Exported CSV files contain a JSON envelope, not CSV |
| PAY-B-035 | Run detail, LOP / proration | High | Paid days default to 31 with no attendance input; LOP not computed |
| PAY-B-036 | Salary profile - Add salary / Edit profile | Medium | Annual CTC accepts letters and negatives with no inline message |
| PAY-B-037 | Settings > Policy > Start Month | Low | Past months (Jan-Sep 2026) selectable as Start Month with no warning |

---

## Page: Components catalog - Add/Edit Component (/payroll/components)

### PAY-B-026 Fixed amount has no upper bound: ₹9,99,99,999 component saved and used in the breakup
- Severity: High
- Route: /payroll/components → Add Component → Calc. Method "Fixed Amount" → Fixed Amount
- Steps: 1. Add Component: Name "QA1015R2 Big", Code "QA1015R2BIG", Earning, Fixed Amount "999999999", Add Component.
- Expected: Blocked inline (e.g. "Amount must be at most ₹10,00,000 per month" or a sane cap tied to CTC); no record.
- Actual: POST 201. Row shows ₹99,99,99,999.00 Active. The Add Template breakup (Sample CTC ₹12,00,000) then reports Earnings ₹1,00,02,03,599/month, Deductions ₹39,00,38,466.11 (TDS from the same inflated gross), Net take-home ₹61,01,65,132.89/month, and the Labour Code note reads "Basic+DA is 0.0% of gross".
- Impact: One typo in a catalog amount makes every template and profile that uses the component absurd; the breakup and TDS estimate become meaningless.
- Likely code area: component create/update schema (`amount` has only the decimal regex, no max); no CTC sanity check in the breakup preview.
- Fix: Add a max on fixed amounts (and on formula results) with an inline error; warn when a component exceeds X% of CTC; show a confirm for values above a threshold.
- Acceptance check: 999999999 is rejected inline; 1000000 is accepted or shows a warning; the breakup for CTC 12L stays within CTC/12.
- Cleanup: "QA1015R2 Big" (test row) is deactivated/deleted in cleanup (see TEST-DATA.md).

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

## Page: Salary Profile - QA Probe Pay (/payroll/employees/:id)

### PAY-B-030 Components list shows FIXED ₹25,000 with Percent 150.0000% for "QA1015 Basic"
- Severity: Medium
- Route: /payroll/employees/a32a5b84-6ae1-4507-afe4-0245dbac2423 → Salary Components → EARNINGS
- Steps: 1. Open QA Probe Pay's profile. 2. Read the QA1015 Basic row.
- Expected: Method FIXED, Amount ₹25,000.00, Percent "—".
- Actual: Method FIXED, Amount ₹25,000.00 and Percent 150.0000%.
- Impact: The profile suggests the basic is a 150% line; an admin may edit it as a percent or think the basic is 150% of something.
- Likely code area: profile component row mapper reads `percent` from the component that was edited to 150 (PAY-B-027 record) or from a shared object; check the join on component id vs code.
- Fix: Read percent only for PERCENT_OF_BASIC lines; check the component-to-profile join.
- Acceptance check: QA1015 Basic shows Percent "—"; the profile row matches the catalog row.

## Page: Payroll Run detail (/payroll/runs/2)

### PAY-B-031 Draft run pays QA Probe Pay ₹96,000 gross on a ₹6,00,000 CTC (₹50,000 per month)
- Severity: Critical (overpay: the run promises about 1.9x the CTC monthly before any approval)
- Route: /payroll/runs/2 → Recalculate → Employees row "QA Probe Pay" → Salary Breakdown
- Steps: 1. Profile CTC ₹6,00,000 (monthly ₹50,000). 2. On run 2, click Recalculate → Recalculate. 3. Open the QA Probe Pay breakdown.
- Expected: Gross about ₹48,200 (₹50,000 less employer EPF ₹1,800, or the CTC split); each role counted once (one basic, one HRA, one PF, one PT).
- Actual: Earnings ₹96,000 = QA1015 Basic 25,000 + QA1015 HRA 20,000 + QA1015 Refresh Test 1,000 + Basic Salary 20,000 + House Rent Allowance 10,000 + Special Allowance 20,000. Deductions ₹4,600 = QA1015 PF Employee 2,400 + QA1015 Prof Tax 200 + EPF Employee 1,800 + Professional Tax 200. Employer EPF ₹1,800. Net ₹91,400. The arithmetic is right (96,000 − 4,600 = 91,400); the inputs are wrong.
- Impact: A calculated run pays nearly double the CTC. Once approved, this would overpay the employee by about ₹46,000 a month. Duplicate PF and PT lines also reduce net.
- Likely code area: payroll engine component resolution (all active catalog lines with the same role are summed; no de-dup by role; the seeded defaults and QA lines both included). Same root cause as PAY-B-024.
- Fix: One active line per role per profile; block the run with a blocker when a profile's earnings exceed CTC/12 plus employer cost; add a test that gross ≤ CTC/12.
- Acceptance check: QA Probe Pay gross is within rounding of CTC/12 − employer cost, one PF and one PT line, and the run shows a blocker when they do not match.

### PAY-B-032 "% of Basic" components resolve against different bases
- Severity: High (wrong numbers on every percentage line; inconsistent within one payslip)
- Route: /payroll/runs/2 → Recalculate → QA Probe Pay breakdown (and /payroll/employees/a32a5b84-…, Salary Components)
- Steps: 1. Profile has QA1015 Basic FIXED ₹25,000 and Basic Salary FORMULA ₹20,000. 2. Read QA1015 HRA "40% of Basic" and QA1015 PF Employee "12% of Basic" after Recalculate.
- Expected: Both percentages use the same basic (₹25,000 if QA1015 Basic is the basic): HRA ₹10,000 and PF ₹3,000. Or the rule is defined and shown.
- Actual: HRA 40% = ₹20,000 (40% of ₹50,000); House Rent Allowance 50% = ₹10,000 (50% of ₹20,000); PF Employee 12% = ₹2,400 (12% of ₹20,000). Three different bases on one profile.
- Impact: No percent line can be checked by hand; the payslip would not reconcile to any stated rule.
- Likely code area: percent-of-basic base resolution (the engine uses "basic" from different sources: the first FIXED basic, the BASIC formula, and the sum of earning lines).
- Fix: Define one basic per profile (the BASIC role line) and use it for all PERCENT_OF_BASIC lines; show the base on the component row.
- Acceptance check: HRA 40% and PF 12% use the same base shown on the breakdown; hand calculation matches.

### PAY-B-033 Profile estimate and run gross disagree for the same employee
- Severity: High
- Route: /payroll/employees/a32a5b84-6ae1-4507-afe4-0245dbac2423 (Est. Monthly Gross ₹46,000, Est. Monthly Net ₹45,600, "After ₹400.00 deductions") vs /payroll/runs/2 (QA Probe Pay gross ₹96,000, net ₹91,400)
- Steps: 1. Read the profile estimate. 2. Recalculate run 2. 3. Read the run row.
- Expected: Estimate and run use the same engine; or the profile says the estimate is not a payroll figure.
- Actual: Profile ₹46,000 gross and ₹400 deductions vs run ₹96,000 gross and ₹4,600 deductions. The profile's ₹400 counts only the two PT lines and ignores PF; the run counts both PF and EPF.
- Impact: The screen an admin reviews before a run shows about half the amount the run will pay.
- Likely code area: profile "Est." figures (separate calculation path) vs run engine.
- Fix: Use the run engine for profile estimates, or label the estimate and show the difference.
- Acceptance check: profile estimate equals the run gross and deductions for the same inputs.


## Page: Reports and Export (/payroll/reports, /payroll/settings/import-export)

### PAY-B-034 CSV exports are a JSON envelope, not CSV
- Severity: High (finance and bank users cannot open the export as a spreadsheet; the register and journal files are invalid CSV)
- Route: /payroll/reports (header "Export CSV", October 2026) and /payroll/settings/import-export ("Export" button, Payroll Register)
- Steps: 1. On /payroll/reports click "Export CSV". 2. On /payroll/settings/import-export click "Export". 3. Open both files from ~/Downloads.
- Expected: Plain CSV: header row, one line per employee, numbers without quotes/envelope. Filename matches content.
- Actual: payroll-journal-2026-10.csv starts with {"success":true,"data":"account,description,debit,credit,costCenter\nUNMAPPED:BASIC,...". payroll-register-2026-10.csv starts with {"success":true,"data":"employeeId,name,department,...". The file is the raw API response saved as .csv. The journal export is also triggered from the Reports header while the Summary tab is open (the file name is payroll-journal, not a summary).
- Impact: Spreadsheet import fails or shows one cell; the register and journal cannot be reconciled outside the app.
- Likely code area: export handler returns the JSON response body (api envelope) instead of the `data` string; download filename chosen from the journal endpoint for the header button.
- Fix: Unwrap `data` on the client or return text/csv with Content-Disposition from the API; make the header button export the active tab's data; add an export test that parses the CSV.
- Acceptance check: Opening the file in a CSV parser gives a header row and one row per employee; the first byte is not "{".

## Page: Payroll Run detail - LOP and proration (/payroll/runs/2)

### PAY-B-035 Paid days default to 31 with no attendance; LOP and proration are not applied
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

## Page: Salary Profile - Create/Edit (/payroll/employees, /payroll/employees/:id)

### PAY-B-036 Annual CTC accepts letters and negatives with no inline message
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

## Page: Payroll Settings - Policy Profile (/payroll/settings)

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
