# HR Automation Engine

## Goal
Every HR event can trigger configurable actions.

## Trigger Examples
- employee.created
- employee.onboarded
- employee.probation_due
- employee.confirmed
- employee.transferred
- employee.promoted
- employee.salary_revised
- leave.requested
- leave.approved
- attendance.late
- attendance.missed_punch
- document.expiring
- asset.assigned
- asset.return_due
- review.cycle_started
- goal.overdue
- course.assigned
- resignation.submitted
- exit.completed

## Conditions
- employee department/location/role
- employment type
- tenure
- leave type
- attendance status
- document type
- asset type
- salary band
- performance rating

## Actions
- create task
- start workflow
- send notification
- send email
- send WhatsApp/SMS if enabled
- assign document
- generate letter
- assign course
- assign asset
- create HR case
- call webhook
- update field

## Acceptance Criteria
- HR admin can configure automation without code.
- Automation runs are logged.
- Automation cannot infinite loop.

