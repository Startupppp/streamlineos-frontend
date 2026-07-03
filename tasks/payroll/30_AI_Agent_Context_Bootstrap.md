# AI Agent Context Bootstrap

## Mission

Implement StreamlineOS PayrollOS from this PRD folder. Build it as a standalone payroll product with template-first setup and toggle-driven configuration.

## Read First

Read all files in `/Users/tarunchintakunta/Personal/Streamlineos/payroll` in numeric order.

Then inspect:

- `streamlineos-frontend/frontend/app/(authenticated)/hr/payroll`
- `streamlineos-frontend/frontend/features/hr/payroll`
- `streamlineos-frontend/frontend/types/hr/payroll.ts`
- `streamlineos-backend/src/modules/hr-payroll`
- `streamlineos-backend/src/db/schema/hr/payroll.ts`
- `streamlineos-backend/src/db/schema/hr/salary-structure-templates.ts`

## Non-Negotiables

- Do not implement a basic payroll table only.
- Build template picker with at least five templates.
- Build toggle-driven policy setup.
- Build payroll command center.
- Build preview, exceptions, approvals, lock, payout, payslip publishing.
- Add RBAC, audit, loading, empty, error, and mobile states.

## Definition Of Done

- Owner can activate payroll template.
- Admin can run payroll safely.
- Finance can approve and export.
- Employee can download payslip.
- Tests/checks are run.

