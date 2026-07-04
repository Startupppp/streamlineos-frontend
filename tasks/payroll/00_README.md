# Payroll Product PRD Pack

## Product Name

StreamlineOS PayrollOS

## CTO Intent

Build Payroll as a standalone sellable product, not only an HR payroll tab. PayrollOS must let a business owner configure payroll once using high-quality templates, run monthly payroll confidently, review exceptions, approve payouts, generate payslips, handle taxes/statutory deductions, reimbursements, bonuses, incentives, loans, full-and-final settlement, and employee self-service.

## Competitive Research Inputs

- Gusto: simple payroll setup, automated tax filing, benefits, time tracking, onboarding, employee self-service.
- Rippling: unified employee record, complex payroll workflows, pay-run comparison, global payroll, automation.
- ADP: direct deposit, deductions, tax compliance, mobile payroll, time and attendance integration.
- Deel: global payroll, contractors, EOR, compliance, multi-country payroll.
- QuickBooks/Xero style accounting payroll: accounting integration, tax records, reports, journal export.
- Zoho/SMB HR payroll: customizable salary structures, employee self-service, HR suite integration.

## Current Repo Awareness

Existing foundations discovered:

- `streamlineos-frontend/frontend/app/(authenticated)/hr/payroll`
- `streamlineos-frontend/frontend/features/hr/payroll`
- `streamlineos-frontend/frontend/types/hr/payroll.ts`
- `streamlineos-backend/src/modules/hr-payroll`
- `streamlineos-backend/src/db/schema/hr/payroll.ts`
- `streamlineos-backend/src/db/schema/hr/salary-structure-templates.ts`

Current backend already includes payrolls, salary structures, tax, bank transfers, reimbursements, allowances, bonuses, incentives, loans, payslip PDF/HTML, and FNF. The PRDs extend this into a full product-grade payroll system.

## Ordered PRDs

Implement in numeric order.

## Non-Negotiables

- Owner must be able to choose from at least five payroll templates.
- Each template must expose toggles before activation.
- Payroll setup must feel guided, visual, and safe.
- Payroll run must include preview, exceptions, approval, lock, payout, payslip, and audit.
- Employee self-service must include payslips, tax declarations, reimbursements, loans, documents, and bank detail updates where allowed.
- Admin must configure salary components, deductions, statutory rules, payroll calendar, approval policy, bank transfer, and accounting export.

## The Five Required Templates

1. Indian Standard Payroll.
2. Indian Startup Flexible Payroll.
3. Contractor / Consultant Payroll.
4. Sales Incentive Payroll.
5. Global Remote Payroll.

Optional additional templates:

- Hourly / Timesheet Payroll.
- Manufacturing / Shift Payroll.
- Agency / Staffing Payroll.
- Executive Payroll.

