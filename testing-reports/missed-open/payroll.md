# payroll — partial items

These items are only partly done, so they stay. Fully finished items from the same report were not put back.

## PAY-B-003 — FIXED

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

## PAY-B-011 — FIXED

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
