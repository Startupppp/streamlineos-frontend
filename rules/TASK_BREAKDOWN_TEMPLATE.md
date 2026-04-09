# TASK BREAKDOWN TEMPLATE (Use This For Every Task)

**Follow this structure to execute tasks with minimal tokens and maximum clarity.**

---

## TASK: [Bug Fix / Feature / Refactor]

### Step 1: Define Scope (5 min)
```
What are we fixing/building?
- Bug: [describe with steps to reproduce]
- Feature: [describe with user story]
- Refactor: [describe what changes and why]

Related bugs/features?
- [Link to related items]

Acceptance criteria:
- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Criterion 3
```

### Step 2: Audit Current State (10 min)
```
Current files involved:
- /path/to/file.tsx (lines: Y-Z, issues: ...)
- /path/to/api/route.ts (issues: ...)

Current behavior:
- [What happens now]
- [Where it breaks]

Data flow:
- Frontend → API → Database
- [Current flow diagram or description]
```

### Step 3: Plan Changes (10 min)
```
Files to create:
- [ ] /path/to/new-file.tsx (description)

Files to modify:
- [ ] /path/to/file.tsx (lines Y-Z)
  - Change: [specific change]
  - Reason: [why]

Files to delete:
- [ ] /path/to/orphaned.tsx (reason)

Database changes:
- [ ] Schema update? (Drizzle migration)
- [ ] New query? (lib/db/queries.ts)

API changes:
- [ ] New endpoint? (POST /api/v1/...)
- [ ] Modify endpoint? (which?)
- [ ] Add validation? (Zod schema)

Cache strategy:
- [ ] Mutation uses direct update? OR invalidate?
- [ ] Which queries affected?
```

### Step 4: Implementation (30–60 min)
```
Code changes:
1. API endpoint
2. Frontend mutation/query
3. UI component
4. Tests (mental edge cases)

Testing checklist:
- [ ] Happy path (valid inputs)
- [ ] Error path (network failure, invalid data)
- [ ] Edge case 1
- [ ] Edge case 2
- [ ] Mobile responsive
- [ ] Empty states
```

### Step 5: Verification (5 min)
```
Before pushing:
- [ ] `pnpm build` passes
- [ ] `pnpm lint` passes
- [ ] No `any`, no comments, no dead code
- [ ] Max 500 lines per file
- [ ] All TypeScript strict
- [ ] Files properly named (kebab-case)
- [ ] Handlers properly named (handleX, onX, isX)
- [ ] Cache strategy documented
- [ ] ConfirmDialog used for destructive actions
- [ ] Mobile tested at <640px
- [ ] Toast on success/error
```

---

## SPECIFIC TASK TEMPLATES

### Template: Bug Fix

**Example: 1-on-1 Scheduling Validation Error**

```
CURRENT STATE:
- File: app/(dashboard)/performance/one-on-ones/schedule/page.tsx
- Issue: Form shows error "Employee and date required" even when both filled
- Steps to reproduce:
  1. Navigate to Performance → 1-on-1s → Schedule
  2. Select employee "Prazith Chinna"
  3. Pick a date
  4. Enter duration and agenda
  5. Click Schedule → Error appears

ROOT CAUSE:
- Form state binding incorrect (employee field not reading selected value)
- OR API payload not including both employeeId and date
- OR backend validation failing silently

PLAN:
1. Check form component:
   - Verify field binding (is selected value stored in state?)
   - Check onChange handlers
   
2. Check API call:
   - Log payload being sent
   - Verify employeeId and date both present
   - Check API route expects these fields
   
3. Add time field:
   - Currently missing time; add as required OR default
   - Update API schema (Zod)
   
4. Improve error message:
   - Show specific missing field, not generic message
   
5. Test:
   - With valid employee + date + time
   - With missing time
   - With invalid date
   - With API failure

ACCEPTANCE:
- [ ] Can schedule 1-on-1 with all fields filled
- [ ] Error message is specific
- [ ] Time field required or defaulted
- [ ] Works on mobile
```

### Template: Modal → Side Sheet

**Example: Create Deal Modal Refactor**

```
CURRENT STATE:
- File: app/(dashboard)/crm/deals/_components/create-deal-modal.tsx
- Issue: Modal is cramped, spacing too tight

PLAN:
1. Replace <Dialog> with <Sheet> (shadcn)
2. Layout:
   - Header: fixed (title + close)
   - Body: scrollable (ScrollArea)
   - Footer: fixed (Create Deal button)
3. Spacing:
   - 16–24px gap between form fields
   - 12px padding inside containers
   - Review and remove overlapping padding
4. Responsive:
   - Full width on mobile
   - 50% width on desktop
5. Test:
   - Long form (10+ fields) scrolls correctly
   - Header/footer stay visible
   - Mobile <640px

ACCEPTANCE:
- [ ] Uses <Sheet> component
- [ ] Header fixed, footer fixed
- [ ] Only form body scrolls
- [ ] Spacing 16–24px between fields
- [ ] No overlapping padding
- [ ] Mobile responsive
- [ ] Looks less cramped
```

### Template: Add Missing Feature

**Example: Asset Status Dropdown**

```
CURRENT STATE:
- File: app/(dashboard)/hr/assets/_components/add-asset-form.tsx
- Issue: No status field in Add Asset form

PLAN:
1. Add to form schema (Zod):
   - status: enum('AVAILABLE', 'ASSIGNED', 'MAINTENANCE')
   - required: true
   
2. Add to API (POST /api/v1/assets):
   - Validate status in Zod schema
   - Store in database
   
3. Add to UI:
   - shadcn <Select> component
   - Options: Available, Assigned, Maintenance
   - Default: AVAILABLE
   - Required field validation
   
4. Add to form submission:
   - Include status in API payload
   - Show toast on success
   
5. Test:
   - Submit with each status
   - Verify stored in DB
   - Mobile responsive

ACCEPTANCE:
- [ ] Select dropdown visible
- [ ] All 3 options available
- [ ] Defaults to AVAILABLE
- [ ] Required validation works
- [ ] Status stored in DB
- [ ] Displays on asset list/detail
```

### Template: Permission/Visibility Fix

**Example: Helpdesk for All Employees**

```
CURRENT STATE:
- File: middleware.ts (checks permissions)
- Issue: Helpdesk visible only to HR/CEO roles

PLAN:
1. Check middleware/permission logic:
   - Where does role check happen?
   - Is it in middleware, layout, or route handler?
   
2. Update permission:
   - Change from: role === 'HR' || role === 'CEO'
   - Change to: remove restriction (all employees allowed)
   
3. Verify database/schema:
   - No permission table blocking access?
   - Update if needed
   
4. Test:
   - Login as employee (non-HR)
   - Verify Helpdesk appears in sidebar
   - Verify can create tickets
   - Verify can view own tickets
   
5. Security check:
   - Employees can only see own tickets
   - HR can see all tickets
   - No SQL injection risks

ACCEPTANCE:
- [ ] Helpdesk visible to all employees
- [ ] Exit Management visible to all employees
- [ ] Employees can only access own data
- [ ] HR can access all data
- [ ] No permission bypass bugs
```

### Template: Notification/Email Flow

**Example: Termination Email**

```
CURRENT STATE:
- File: app/api/v1/hr/employees/[employeeId]/terminate/route.ts
- Issue: Employee not notified when terminated

PLAN:
1. Check current flow:
   - What happens when terminate action triggered?
   - Where should email be sent?
   
2. Choose email delivery method:
   - Option A: Server action (simple, no background job)
   - Option B: Background job (Bull/Node schedule, better for scale)
   - Option C: Queue (RabbitMQ, Kafka, for enterprise)
   
3. Implement email:
   - Create email template: termination-notice.tsx (React email)
   - Include: termination date, access removal, HR contact
   - Send via Resend/SendGrid/SMTP
   
4. Add to mutation:
   - After terminate succeeds:
     - Call sendTerminationEmail(employeeId)
     - OR queue background job
     - OR use server action
   
5. Test:
   - Terminate employee
   - Check email delivery (mock if no SMTP)
   - Check email content
   - Check error handling if email fails

ACCEPTANCE:
- [ ] Email sent on termination
- [ ] Email includes termination date + HR contact
- [ ] Works if email service fails (graceful fallback)
- [ ] Can verify in logs/email service
```

### Template: Workflow Implementation

**Example: Exit Management Workflow**

```
CURRENT STATE:
- Files: app/(dashboard)/exit/submission/page.tsx, /api/v1/exit/...
- Issue: No resignation flow, missing HR approval, no notifications

PLAN:

1. Database schema:
   - Create resignation_requests table:
     - id, employeeId, submittedDate, status (PENDING, APPROVED, REJECTED)
     - resignationDate, lastWorkingDay, template (optional)
     - hrApprovedDate, hrApprovedBy
     - createdAt, updatedAt
   
2. Employee flow (frontend):
   - Page: /exit/submit-resignation
   - Form fields:
     - Resignation date (datepicker)
     - Template (optional select)
     - Note (textarea)
   - Submit → POST /api/v1/exit/resignation
   - Response: resignation_id + status PENDING
   - Toast: "Resignation submitted. HR will review."
   
3. Notification to HR:
   - After resignation submitted:
     - Send email to HR/CEO with resignation details
     - Send in-app notification
     - Include link to approve/reject
   
4. HR flow (frontend):
   - Page: /hr/exit/pending-resignations
   - List: All pending resignations
   - Actions: View, Approve, Reject
   - Modal/sheet: show employee details + resignation date
   - Buttons: Approve, Reject with reason
   - POST /api/v1/exit/resignation/:id/approve OR /reject
   
5. Auto-calculation:
   - When resignation submitted:
     - lastWorkingDay = resignationDate + 60 days
     - Display to employee
     - Lock field (read-only)
   
6. Notifications:
   - On approval: Email employee "Your resignation approved. LWD: ..."
   - On rejection: Email employee "Your resignation rejected. Reason: ..."
   
7. Test:
   - Employee submits resignation
   - HR receives email/notification
   - HR approves
   - Employee receives approval email
   - Employee status changes to "Resigned"
   - Can see Last Working Day calculated

ACCEPTANCE:
- [ ] Resignation form with date + optional template
- [ ] Submits successfully
- [ ] HR/CEO notified (email + in-app)
- [ ] HR can approve/reject
- [ ] Employee notified on approval/rejection
- [ ] Last Working Day auto-calculated (60 days)
- [ ] Field non-editable
- [ ] Works end-to-end
```

---

## TOKEN-SAVING TIPS

1. **Describe instead of paste**: "File X at lines 45–60 has validation logic. Currently checking field Y but should check field Z."
2. **Use relative paths**: `_components/form.tsx` not full path
3. **Reference existing patterns**: "Like the Leads table pattern"
4. **Batch related changes**: "Update mutation + cache + toast in one block"
5. **Use templates**: Don't rewrite; fill in template

---

**Copy this template, fill it in, and reference it for every task.**
