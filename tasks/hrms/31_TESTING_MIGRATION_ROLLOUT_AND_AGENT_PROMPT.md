# Testing, Migration, Rollout And Agent Prompt

## Testing
Test:
- Policy evaluation
- Workflow approvals
- Automations
- Templates
- Sensitive field permissions
- Employee lifecycle
- Attendance rules
- Leave accrual
- Onboarding/offboarding
- Documents
- Assets
- Performance
- AI permissions
- Cross-org isolation
- Attendance-to-payroll contract
- Leave-to-payroll contract
- Overtime-to-payroll contract
- Reimbursement-to-payroll contract
- Payroll cutoff/lock behavior
- Retroactive HR adjustment behavior

## Migration
- Inventory hardcoded behavior.
- Create seeded default policies/templates/workflows matching existing behavior.
- Migrate old data carefully.
- Keep compatibility routes where possible.

## Rollout
1. Hardcode audit and cleanup.
2. Core schema and engines.
3. Employee 360 and org structure.
4. Attendance/leaves policy refactor.
5. Payroll integration contracts for attendance, leaves, overtime, reimbursements, compensation, and lifecycle status.
6. Lifecycle workflows.
7. Documents/assets/performance/learning.
8. Engagement/cases/analytics/AI.

## Agent Prompt
```txt
You are working in the current StreamlineOS branch. Read the entire `hrms/` PRD folder in numeric order before coding.

Goal: Refactor and upgrade the existing HRMS into a configurable PeopleOS. Do not blindly delete working code. Preserve useful behavior, but remove hardcoded HR business rules from services and move them into policy, workflow, automation, and template engines.

Important code:
- Backend HR modules under `streamlineos-backend/src/modules/hr-*`
- Backend cron HR services under `streamlineos-backend/src/modules/cron`
- Backend settings automations under `streamlineos-backend/src/modules/settings`
- Frontend HR routes under `streamlineos-frontend/frontend/app/(authenticated)/hr`

Rules:
1. First audit all hardcoded HR rules.
2. Create seeded default policies/templates/workflows to preserve current behavior.
3. Build shared engines before adding new feature screens.
4. Enforce org isolation, permissions, field-level privacy, and audit.
5. Make attendance, leave, overtime, reimbursements, compensation, and employee lifecycle status feed payroll through approved/locked HR payroll input contracts.
6. Payroll must not calculate from raw unapproved HR events.
7. Add tests for each policy/workflow/automation/payroll-input path.
8. Commit after each phase and push to the current branch.

Start with a short implementation plan mapped to the PRD files, then begin Phase 1.
```
