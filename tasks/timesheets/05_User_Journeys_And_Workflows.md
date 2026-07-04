# StreamlineOS Product Bible

# Timesheets / Worklogs

# 05_User_Journeys_And_Workflows.md

## Journey A: New Company Setup

1. Owner signs up for TimeFlow.
2. Chooses business type: agency, IT services, field service, consulting, internal team.
3. Adds clients or imports clients.
4. Adds projects.
5. Adds tasks/work types.
6. Invites team.
7. Sets work week, required fields, rounding, approvals.
8. Adds billing rates.
9. Starts first week.

## Journey B: Employee Logs Time With Timer

1. Employee opens My Time.
2. Selects client/project/task.
3. Starts timer.
4. Timer runs in header/sidebar.
5. Employee stops timer.
6. Adds note/work link if required.
7. Entry appears in daily timeline and weekly grid.
8. Employee submits week for approval.

## Journey C: Employee Fills Weekly Timesheet

1. Employee opens weekly grid.
2. Rows show recent/favorite project-task combinations.
3. Employee enters hours per day.
4. Required fields are validated.
5. Employee saves draft.
6. Employee submits week.
7. Status becomes Submitted/Pending Approval.

## Journey D: Manager Approves Team Week

1. Manager opens Approvals.
2. Filters by week, team, project, status.
3. Sees missing logs and submitted sheets.
4. Opens employee timesheet detail.
5. Reviews billable/non-billable, notes, work links, exceptions.
6. Approves or rejects with reason.
7. Approved hours become locked for employees.
8. Rejected timesheet returns to employee with comments.

## Journey E: Finance Generates Invoice Draft

1. Finance opens Billing Queue.
2. Filters approved billable hours by client/project/date.
3. Reviews rate application and uninvoiced total.
4. Groups hours by invoice.
5. Creates invoice draft.
6. Hours are marked invoice-drafted.
7. After invoice finalization, hours are marked invoiced.

## Journey F: Payroll Export

1. HR/finance opens Payroll Queue.
2. Selects pay period.
3. Reviews approved payable hours, overtime, breaks, leave adjustments.
4. Resolves exceptions.
5. Exports CSV/XLSX or sends to payroll integration.
6. Export is audited.

## Journey G: Client Approves Work

1. Project manager marks approved hours ready for client approval.
2. Client receives secure link.
3. Client sees summary by date/task/person.
4. Client approves or rejects with comment.
5. Approved client hours can be invoiced.
6. Rejected client hours return to internal review.

## Journey H: Owner Reviews Profitability

1. Owner opens Reports.
2. Sees utilization, billable ratio, revenue leakage, budget burn, client profitability.
3. Clicks into unbilled approved hours.
4. Finds projects exceeding budget.
5. Exports report or schedules weekly email.

## Workflow States

### Time Entry Status

- draft,
- submitted,
- approved,
- rejected,
- locked,
- invoice_drafted,
- invoiced,
- payroll_exported,
- voided.

### Timesheet Period Status

- open,
- draft,
- submitted,
- partially_approved,
- approved,
- rejected,
- locked,
- reopened.

### Approval Status

- not_required,
- pending,
- approved,
- rejected,
- delegated,
- recalled.

## Critical Business Rules

- Employees can edit draft/rejected entries.
- Employees cannot edit approved/locked/invoiced entries.
- Managers can edit only if policy allows.
- All edits after submission create audit records.
- Approved entries can be reopened only by permitted admin.
- Invoiced entries cannot be edited; correction requires adjustment/credit workflow.
- Payroll-exported entries require correction workflow.
- Period locks prevent backdated edits unless admin reopens.
