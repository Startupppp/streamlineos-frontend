# StreamlineOS Product Bible

# Timesheets / Worklogs

# 17_Testing_QA_And_Acceptance.md

## Unit Tests

Cover:

- duration calculations,
- rounding rules,
- overlap detection,
- required fields,
- period status transitions,
- rate resolution,
- budget burn,
- invoice eligibility,
- payroll eligibility,
- RBAC scope checks.

## API Tests

Cover:

- create manual entry,
- timer start/stop/convert,
- weekly period submit,
- approve/reject period,
- bulk approve,
- lock/unlock,
- billing queue,
- invoice draft creation,
- payroll export,
- settings update,
- client approval token.

## Frontend Tests

Cover:

- weekly grid keyboard entry,
- timer start/stop,
- submit week,
- rejected correction flow,
- approval queue bulk actions,
- billing queue missing rate warning,
- reports filters,
- mobile timer.

## E2E Scenarios

1. Employee logs week and submits.
2. Manager rejects with comment.
3. Employee fixes and resubmits.
4. Manager approves.
5. Finance creates invoice draft from approved billable hours.
6. HR exports payroll hours.
7. Owner views profitability report.

## Performance

Targets:

- weekly grid interactive under 1 second for 100 rows.
- reports under 3 seconds for common date ranges.
- exports run async for large data.
- approval queue paginated.

## Visual QA

Viewports:

- 375px,
- 768px,
- 1280px,
- 1440px.

Screens:

- dashboard,
- my time weekly grid,
- timer,
- team overview,
- approvals,
- billing,
- payroll,
- reports,
- settings,
- client portal.

## Acceptance Checklist

- No broken existing project time entry flows.
- Standalone timesheets nav exists.
- Weekly grid works.
- Timer works.
- Approval queue works.
- Billing queue works.
- Payroll export works.
- Reports are useful.
- Audit logs exist.
- RBAC enforced.
- Mobile usable.
