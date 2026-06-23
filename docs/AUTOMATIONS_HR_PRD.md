# PRD: HR & Hiring Automations

**Status:** Planning
**Target modules:** HR, Recruitment/Hiring
**Existing engine:** `lib/services/automation/engine.ts` · `lib/db/schema/automation/rules.ts`
**UI builder:** `components/automations/automation-meta.ts` · `/settings/automations`

---

## Background

The automation engine already works for CRM and billing (`lead.created`, `deal.stage_changed`, `ticket.created`, `invoice.overdue`). The architecture is solid — Postgres enum for triggers, JSONB conditions + actions, `runAutomationsForEvent()` called from route handlers.

This PRD extends that same system into HR and Recruitment. No new engine, no new UI — just new trigger values, their metadata, and call-sites in the relevant route handlers.

---

## How the system works (reference)

1. **Schema** — `automationTriggerEnum` in `lib/db/schema/automation/rules.ts` lists allowed trigger strings.
2. **Engine type** — `AutomationTrigger` union in `lib/services/automation/engine.ts` mirrors it.
3. **Client type** — `AutomationTrigger` union in `lib/api/hooks/automations.ts` mirrors it.
4. **Metadata** — `TRIGGER_META[]` in `components/automations/automation-meta.ts` drives the builder UI (fields, sample payload, label).
5. **Call-site** — Route handlers call `runAutomationsForEvent(orgId, "trigger.name", payload)` after the DB write succeeds.

To add a trigger you touch exactly these 4 files + 1 route handler. Nothing else changes.

---

## Existing actions (no new ones needed for Phase 1–3)

| Action type | What it does |
|---|---|
| `notify_roles` | In-app notification to members with given roles |
| `notify_all` | Broadcast in-app notification to all org members |
| `email` | Send email to a fixed address |
| `create_task` | Create a follow-up task with optional assignee + due offset |
| `webhook` | Dispatch outbound webhook event via Inngest |

---

## Phase 1 — Recruitment (highest value, ship first)

### 1.1 `candidate.application_created`

Fires when a new application is created in `POST /api/hr/recruitment/candidates` or the apply form.

**Payload fields:**
```ts
{
  candidateId: number;
  candidateName: string;          // firstName + lastName
  candidateEmail: string;
  jobPostingId: number;
  jobTitle: string;
  source: string;                 // "DIRECT" | "LINKEDIN" | "REFERRAL" etc.
  appliedAt: string;              // ISO timestamp
}
```

**Filterable fields for UI:**
- `source` — eq/neq/contains
- `jobTitle` — contains
- `jobPostingId` — eq

**Use-case examples:**
- Send acknowledgment email to candidate
- Notify recruiter role of new application
- Create task: "Screen résumé for {jobTitle}"

---

### 1.2 `candidate.stage_changed`

Fires when `PATCH /api/hr/recruitment/candidates/[candidateId]/stage` succeeds.

**Payload fields:**
```ts
{
  candidateId: number;
  candidateName: string;
  candidateEmail: string;
  jobPostingId: number;
  jobTitle: string;
  previousStatus: string;         // old candidateStatusEnum value
  newStatus: string;              // new candidateStatusEnum value
}
```

**Filterable fields:**
- `newStatus` — eq/neq (SHORTLISTED, OFFERED, HIRED, REJECTED …)
- `previousStatus` — eq/neq

**Use-case examples:**
- When `newStatus = OFFERED` → email candidate with offer details link
- When `newStatus = REJECTED` → send polite rejection email
- When `newStatus = HIRED` → notify HR roles to start onboarding

---

### 1.3 `interview.scheduled`

Fires when `POST /api/hr/recruitment/interviews` or `POST /api/hr/recruitment/interviews/schedule` succeeds.

**Payload fields:**
```ts
{
  interviewId: number;
  candidateId: number;
  candidateName: string;
  candidateEmail: string;
  jobTitle: string;
  interviewerId: string;
  interviewerEmail: string;
  type: string;                   // VIDEO | PHONE | IN_PERSON | PANEL
  scheduledAt: string;            // ISO timestamp
  durationMinutes: number;
  meetingLink: string | null;
}
```

**Filterable fields:**
- `type` — eq/neq
- `durationMinutes` — gt/lt

**Use-case examples:**
- Email candidate the interview link + time
- Notify interviewer with candidate profile link
- Create task: "Prepare scorecard for {candidateName}"

---

### 1.4 `interview.completed`

Fires when `PATCH /api/hr/recruitment/interviews/[interviewId]` sets `result` to a non-PENDING value.

**Payload fields:**
```ts
{
  interviewId: number;
  candidateId: number;
  candidateName: string;
  jobTitle: string;
  result: string;                 // PASS | FAIL | HOLD | NO_SHOW
  rating: number | null;
  interviewerId: string;
  completedAt: string;
}
```

**Filterable fields:**
- `result` — eq/neq (PASS, FAIL, HOLD, NO_SHOW)
- `rating` — gt/lt

**Use-case examples:**
- When `result = NO_SHOW` → notify recruiter + create reschedule task
- When `result = PASS` and `rating >= 4` → notify hiring manager
- Request scorecard submission from interviewer (email)

---

### 1.5 `scorecard.submitted`

Fires when `POST /api/hr/recruitment/interviews/[interviewId]/scorecard` succeeds.

**Payload fields:**
```ts
{
  interviewId: number;
  candidateId: number;
  candidateName: string;
  interviewerId: string;
  recommendation: string;         // STRONG_HIRE | HIRE | MAYBE | NO_HIRE
  submittedAt: string;
}
```

**Filterable fields:**
- `recommendation` — eq/neq

**Use-case examples:**
- When `recommendation = STRONG_HIRE` → notify hiring manager immediately
- When `recommendation = NO_HIRE` → create review task for recruiter

---

### 1.6 `offer.sent`

Fires when `PATCH /api/hr/recruitment/candidates/[candidateId]/offers/[offerId]` sets `offerStatus = SENT`.

**Payload fields:**
```ts
{
  offerId: number;
  candidateId: number;
  candidateName: string;
  candidateEmail: string;
  jobTitle: string;
  offeredSalary: string;
  joiningDate: string | null;
  validUntil: string | null;
  sentAt: string;
}
```

**Use-case examples:**
- Email candidate a link to view offer
- Notify HR roles that offer is out
- Create task: "Follow up with {candidateName} in 3 days"

---

### 1.7 `offer.accepted` / `offer.rejected`

Fires when offer status changes to ACCEPTED or REJECTED.

**Payload fields:**
```ts
{
  offerId: number;
  candidateId: number;
  candidateName: string;
  candidateEmail: string;
  jobTitle: string;
  decision: "ACCEPTED" | "REJECTED";
  respondedAt: string;
}
```

**Filterable fields:**
- `decision` — eq

**Use-case examples:**
- On ACCEPTED → notify HR + recruiter, create onboarding start task
- On REJECTED → notify recruiter, create "Revisit pipeline" task

---

### 1.8 `candidate.bgv_status_changed`

Fires when `bgvStatus` changes on the candidate record.

**Payload fields:**
```ts
{
  candidateId: number;
  candidateName: string;
  candidateEmail: string;
  previousBgvStatus: string;
  newBgvStatus: string;           // NOT_INITIATED | INITIATED | PENDING | CLEARED | FAILED
  bgvAgency: string | null;
}
```

**Filterable fields:**
- `newBgvStatus` — eq/neq

**Use-case examples:**
- On CLEARED → notify HR, move forward with joining
- On FAILED → notify HR roles with urgent flag

---

### 1.9 `sla.breached`

Fires from the cron/SLA tracking job when `candidateSlaTracking.status` becomes BREACHED.

**Payload fields:**
```ts
{
  candidateId: number;
  candidateName: string;
  stage: string;
  enteredAt: string;
  breachedAt: string;
  hoursInStage: number;
}
```

**Filterable fields:**
- `stage` — eq/contains
- `hoursInStage` — gt

**Use-case examples:**
- Notify recruiter role when SLA is breached
- Create task: "Resolve SLA breach for {candidateName}"

---

## Phase 2 — Onboarding

### 2.1 `onboarding.started`

Fires when the first onboarding task batch is created for a new hire (POST `/api/hr/onboarding`).

**Payload fields:**
```ts
{
  userId: string;
  employeeName: string;
  employeeEmail: string;
  departmentId: number | null;
  joiningDate: string | null;
  startedAt: string;
}
```

**Use-case examples:**
- Send welcome email to new hire
- Notify manager role
- Create task: "Set up workstation for {employeeName}"

---

### 2.2 `onboarding.task_overdue`

Fires from a daily cron that scans `onboarding_tasks` where `status = PENDING` and `dueDate < now`.

**Payload fields:**
```ts
{
  taskId: number;
  taskTitle: string;
  userId: string;
  employeeName: string;
  ownerRole: string;             // NEW_HIRE | HR | IT | MANAGER
  dueDate: string;
  daysOverdue: number;
}
```

**Filterable fields:**
- `ownerRole` — eq
- `daysOverdue` — gt

**Use-case examples:**
- Email new hire when their own task is 1 day overdue
- Notify HR roles when IT tasks are 2+ days overdue

---

### 2.3 `onboarding.document_submitted`

Fires when `POST /api/hr/onboarding/documents` uploads a new document.

**Payload fields:**
```ts
{
  documentId: number;
  userId: string;
  employeeName: string;
  documentTypeName: string;
  status: string;               // SUBMITTED
  submittedAt: string;
}
```

**Use-case examples:**
- Notify HR roles to review the document
- Create task: "Verify {documentTypeName} for {employeeName}"

---

### 2.4 `onboarding.completed`

Fires when all `onboarding_tasks` for a user reach `status = COMPLETED`.

**Payload fields:**
```ts
{
  userId: string;
  employeeName: string;
  employeeEmail: string;
  completedAt: string;
}
```

**Use-case examples:**
- Email congratulations to employee
- Notify manager role
- Notify IT to grant full system access

---

## Phase 3 — Leave & Attendance

### 3.1 `leave.requested`

Fires when `POST /api/hr/leaves` creates a new leave request.

**Payload fields:**
```ts
{
  leaveRequestId: number;
  userId: string;
  employeeName: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  reason: string | null;
  priority: string;             // LOW | MEDIUM | HIGH
}
```

**Filterable fields:**
- `leaveType` — eq/contains
- `totalDays` — gt/lt
- `priority` — eq

**Use-case examples:**
- Notify approver role
- When `totalDays > 5` → notify HR roles as well

---

### 3.2 `leave.approved` / `leave.rejected`

Fires when `PATCH /api/hr/leaves/[leaveRequestId]` changes status to APPROVED or REJECTED.

**Payload fields:**
```ts
{
  leaveRequestId: number;
  userId: string;
  employeeEmail: string;
  employeeName: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  decision: "APPROVED" | "REJECTED";
  approverId: string;
  rejectionReason: string | null;
  decidedAt: string;
}
```

**Filterable fields:**
- `decision` — eq
- `leaveType` — eq

**Use-case examples:**
- Email employee with decision
- On APPROVED → notify covering employee if assigned

---

### 3.3 `attendance.anomaly`

Fires from the weekly attendance cron when an employee has missed check-ins beyond a threshold.

**Payload fields:**
```ts
{
  userId: string;
  employeeName: string;
  employeeEmail: string;
  missedDays: number;
  weekOf: string;
}
```

**Filterable fields:**
- `missedDays` — gt

**Use-case examples:**
- When `missedDays >= 3` → notify manager role
- When `missedDays >= 5` → notify HR roles

---

## Phase 4 — Offboarding & Exit

### 4.1 `resignation.submitted`

Fires when `POST /api/hr/exit` (or the resignation endpoint) creates a resignation record.

**Payload fields:**
```ts
{
  resignationId: number;
  userId: string;
  employeeName: string;
  employeeEmail: string;
  lastWorkingDate: string | null;
  noticePeriodDays: number;
  reasonCategory: string | null;
  submittedAt: string;
}
```

**Use-case examples:**
- Notify HR + manager roles
- Create task: "Begin exit checklist for {employeeName}"
- Email employee: "We've received your resignation"

---

### 4.2 `resignation.approved`

Fires when resignation `status` changes to APPROVED.

**Payload fields:**
```ts
{
  resignationId: number;
  userId: string;
  employeeName: string;
  lastWorkingDate: string;
  approvedBy: string;
  approvedAt: string;
}
```

**Use-case examples:**
- Email employee with last working date confirmation
- Notify IT to schedule access revocation
- Notify finance to initiate FnF calculation

---

### 4.3 `employee.terminated`

Fires when termination `status` changes to EXECUTED via `PATCH /api/hr/termination/[terminationId]`.

**Payload fields:**
```ts
{
  terminationId: number;
  userId: string;
  employeeName: string;
  effectiveDate: string;
  reasons: string[];
  noticePeriodWaived: boolean;
}
```

**Use-case examples:**
- Notify IT to immediately revoke all access
- Notify finance for FnF
- Create task: "Collect assets from {employeeName}"

---

### 4.4 `certification.expiring`

Fires from a daily cron scanning `certifications` where `expiryDate` is within 30 days and `reminderSent = false`.

**Payload fields:**
```ts
{
  certificationId: number;
  userId: string;
  employeeName: string;
  employeeEmail: string;
  certificationName: string;
  issuingOrganization: string | null;
  expiryDate: string;
  daysUntilExpiry: number;
}
```

**Filterable fields:**
- `daysUntilExpiry` — lt/gt

**Use-case examples:**
- Email employee 30 days before expiry
- Notify HR roles 7 days before

---

## Phase 5 — Documents & Performance

### 5.1 `document.review_requested`

Fires when `POST /api/hr/document-review` creates a review request.

**Payload fields:**
```ts
{
  documentId: number;
  documentTitle: string;
  requesterId: string;
  requesterName: string;
  reviewerIds: string[];
  dueDate: string | null;
}
```

---

### 5.2 `performance.review_cycle_started`

Fires when a new performance review cycle is kicked off.

**Payload fields:**
```ts
{
  cycleId: number;
  cycleName: string;
  startDate: string;
  endDate: string;
  reviewerCount: number;
}
```

---

### 5.3 `expense.submitted`

Fires when a new expense is created via `POST /api/hr/expenses`.

**Payload fields:**
```ts
{
  expenseId: number;
  userId: string;
  employeeName: string;
  amount: string;
  category: string;
  submittedAt: string;
}
```

---

### 5.4 `reimbursement.approved` / `reimbursement.rejected`

Fires when reimbursement status changes.

**Payload fields:**
```ts
{
  reimbursementId: number;
  userId: string;
  employeeName: string;
  employeeEmail: string;
  amount: string;
  decision: "APPROVED" | "REJECTED";
}
```

---

## Implementation guide (per trigger)

### Files to touch for every new trigger

| # | File | Change |
|---|---|---|
| 1 | `lib/db/schema/automation/rules.ts` | Add new value(s) to `automationTriggerEnum` |
| 2 | `lib/services/automation/engine.ts` | Add new string(s) to `AutomationTrigger` union |
| 3 | `lib/api/hooks/automations.ts` | Add new string(s) to `AutomationTrigger` union |
| 4 | `components/automations/automation-meta.ts` | Add new `TriggerMeta` objects to `TRIGGER_META[]` |
| 5 | Relevant route handler | Call `runAutomationsForEvent(orgId, "trigger.name", payload)` |
| 6 | Run Drizzle migration | `pnpm drizzle-kit generate && pnpm drizzle-kit migrate` |

### Migration note

`automationTriggerEnum` is a Postgres native enum. Every new trigger value requires an `ALTER TYPE ... ADD VALUE` migration. Drizzle generates this automatically — just add the string to the array in `rules.ts` and run the migration commands above. **Order matters**: add values before deploying code that fires them.

### Call-site pattern

```ts
// In a route handler, after the DB write succeeds:
import { runAutomationsForEvent } from "@/lib/services/automation/engine";

await runAutomationsForEvent(orgId, "candidate.application_created", {
  candidateId: candidate.id,
  candidateName: `${candidate.firstName} ${candidate.lastName}`,
  candidateEmail: candidate.email,
  jobPostingId: application.jobPostingId,
  jobTitle: jobPosting.title,
  source: candidate.source,
  appliedAt: application.appliedAt.toISOString(),
});
```

The engine is fire-and-forget — it catches its own errors and logs them. Never `await` inside a transaction.

### TRIGGER_META template

```ts
{
  value: "candidate.application_created",
  label: "Candidate applied",
  description: "Runs when a new candidate application is submitted",
  fields: [
    { value: "source", label: "Application source" },
    { value: "jobTitle", label: "Job title" },
    { value: "jobPostingId", label: "Job posting ID" },
  ],
  samplePayload: {
    candidateId: 1,
    candidateName: "Jane Smith",
    candidateEmail: "jane@example.com",
    jobPostingId: 42,
    jobTitle: "Senior Engineer",
    source: "LINKEDIN",
    appliedAt: "2026-06-21T10:00:00Z",
  },
},
```

---

## Delivery phases & scope

| Phase | Triggers | Priority | Estimated effort |
|---|---|---|---|
| **1 — Recruitment** | 9 triggers (1.1–1.9) | P0 | ~2 days |
| **2 — Onboarding** | 4 triggers (2.1–2.4) | P0 | ~1 day |
| **3 — Leave & Attendance** | 3 triggers (3.1–3.3) | P1 | ~1 day |
| **4 — Offboarding** | 4 triggers (4.1–4.4) | P1 | ~1 day |
| **5 — Docs & Performance** | 4 triggers (5.1–5.4) | P2 | ~1 day |

**Total: 24 triggers across 5 phases.**

Each phase is one migration + changes to 4 shared files + N route handler call-sites. Phases are independent and can be shipped separately.

---

## Out of scope (this PRD)

- New action types (all 5 existing actions cover every use-case above)
- A separate "HR Automations" page (all rules live under `/settings/automations` — the module dropdown/filter is a nice-to-have enhancement)
- Inngest job scheduling for time-based triggers (Phase 2 onboarding.task_overdue and Phase 4 certification.expiring require a cron job — covered by the existing `/api/cron/` pattern already in use)
- Templated email bodies with variable substitution (current `email` action takes a static `body` string — enhancement for a future pass)
