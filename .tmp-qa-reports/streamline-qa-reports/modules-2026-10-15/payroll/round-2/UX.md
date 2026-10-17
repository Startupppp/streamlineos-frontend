# Payroll Round 2 - UX (QA1015R2, 2026-10-15)

## Must change
1. Put validation errors under the field, in plain words, for every money and code field. Still toast-only with raw text on Components (amount regex, code) and Legal Entity (camelCase key). Same for Annual CTC on the salary profile, which shows no message at all for "-5", "999999999999" or "abc" (PAY-B-004, B-007, B-036).
2. Export files must open as CSV. Today the download is a JSON envelope; the Reports header button exports the journal even when another tab is open (PAY-B-034).
3. Give adjustments a remove or void action (and show them in the breakdown). Adjustments on a draft run cannot be removed from the UI; the QA1015 test rows stay on run 2 (PAY-B-023, B-034 notes in TEST-DATA.md).
4. Show component roles on the catalog list (Basic, HRA, PF employee, PT) with a "duplicate role" warning. Today two basics, two HRAs, two PF and two PT lines are all active, and nothing says so (PAY-B-015, B-024, B-031).
5. Show the percentage for percent lines (e.g. "150%") and the percentage base, not "Formula" (PAY-B-027, PAY-B-032).
6. Make the Create Template disabled state explain itself. "Create Template" is greyed out with no reason when Effective From is empty; the only message comes from a different rule ("Deductions cannot exceed gross") when PF is 150%. Name the blocking field (PAY-B-025).
7. One count everywhere on the run: header "BLOCKERS · 1" vs Exceptions list Blocker 3 vs tab badge 3 (PAY-B-018).
8. Journal banner says unmapped codes "were excluded" while the rows are in the table and in the totals. Say "included, not mapped" and show "Not balanced - map N codes" until mapped (PAY-B-022).
9. Negative net is netted into "Net Payable" and shown as a top earner. Show it as a blocked amount, not as a payable total (PAY-B-017).
10. Payroll run "Inputs" must open without the page-level error ("Payroll run error") and show an empty state with a link to Open Period (PAY-B-019).
11. Templates: "Delete" deactivates. Use "Deactivate" on the card button, the same wording as the confirm (B-009 round-1 note still applies).

## Good to have
1. Salary Template cards show no code or id, so two cards named "QA1015 Structure A" look identical. Show the created date and a short id on the card (PAY-B-010).
2. Placeholders in the template form (50000, 40, 12, 200) look like entered values. Use "e.g." placeholders or show the default as a helper line.
3. Remove or clarify the "Labour Code wage definition: Basic+DA is 0.0% of gross" note in the breakup. It is a compliance hint that appears only because the breakup is wrong; hide it when the breakup fails sanity checks.
4. Start Month offers January to September 2026 with no warning (PAY-B-037).
5. Not-found pages for /payroll/runs/999999 and /payroll/employees/<missing-uuid> say "Not found … or you don't have access" with no link back to Payroll. Add a "Back to payroll runs" link. The /payroll/runs/not-a-uuid page uses a different title ("Run not found"); align them.
6. The component delete confirm says "permanently deleted … or deactivated instead". Tell the user which one will happen before they confirm (QA1015RFR was deactivated, not deleted, because a profile uses it).
7. Percent "Enter a percentage like 50 or 12.5" is clear; keep this pattern for all percent fields.
8. Duplicate-code error (409) is clear ("A component with code ... already exists"); show it under the Code field.
9. Adjustment amount error "Positive decimal required" under the field is good; keep it.
10. The PF switch on the policy page opens a "Disable Provident Fund (PF)?" confirm with "2 employees will be affected. Codes: PF_EMP, PF_ER"; list the names of the affected employees.
11. Tab click on Inputs in the run page did not switch the tab. Make tab changes update the URL (?tab=) so the state is clear.
