# Lane L — Jobs, Notifications & Email Pipeline (READ-ONLY audit)

> Date: 2026-07-31 · Scope: `src/modules/cron/**`, `src/modules/notifications/**`, `src/modules/email/**`, `src/modules/push/**`, `src/modules/realtime/**`, plus every in-process worker found by grepping `@Cron`, `Worker`, `Queue`, `setInterval`, `setTimeout`, `scheduler`, `job`, `outbox`, `@Interval`, `@Timeout` across all of `src/`.

---

## 1. Async Infrastructure Verdict

**There is NO real external queue (no BullMQ, no pg-boss, no Redis streams, no SQS).** All background work falls into two categories:

### A. HTTP-endpoint jobs (external scheduler required)
All 35 "cron" jobs are plain public REST endpoints under `/cron/*` secured only by a Bearer secret (`assertCronSecret` — timing-safe compare vs `CRON_SECRET` env, `cron-secret.ts:4-19`). They must be called by an external scheduler (Vercel Cron, etc.) on whatever schedule the operator configures. **`@nestjs/schedule` is NOT registered in `app.module.ts`** — verified by grepping the whole backend: zero `ScheduleModule` or `@nestjs/schedule` imports found. Zero `@Cron`/`@Interval`/`@Timeout` decorators found anywhere. If the external scheduler dies, all 35 jobs stop silently.

### B. In-process polling workers (setInterval — restart-unsafe)
Three services self-schedule using Node.js timers:

| Service | File | Interval | Trigger |
|---|---|---|---|
| `NotificationDeliveryWorker` | `modules/notifications/notification-delivery-worker.service.ts:38` | 15 s (env `NOTIFICATIONS_WORKER_INTERVAL_MS`) | `setInterval → drainTick()` |
| `PayrollJobsWorkerService` | `modules/payroll/jobs/payroll-jobs-worker.service.ts:39,43` | 5 s poll + 2 s boot kick | `setInterval → tick()` |
| `PayrollCalendarReminderScheduler` | `modules/payroll/insights/payroll-calendar-reminder.scheduler.ts:42-47` | daily at 8 AM local | `setTimeout + setInterval` |

**Process restart mid-job leaves orphaned LOCKED/IN_FLIGHT rows:**
- Notification queue: stale lock recovery after 10 min (`STALE_LOCK_MS`, `notification-delivery-worker.service.ts:13`).
- Payroll jobs: no lock timeout — a crashed job stays `IN_PROGRESS` forever until manual operator intervention.

**Can the system survive a process restart mid-job?**
- Notification queue: yes (stale-lock reclaim after 10 min).
- Payroll GENERATE/RECALCULATE/PDF_PUBLISH: no — state is all-or-nothing; the `GenerateService.generateRun()` call has no checkpoint. A crash mid-run leaves `payroll_jobs.status = 'IN_PROGRESS'` with no automatic retry.
- Outbox events: yes, 30 s lease expiry allows reclaim.

---

## 2. Job Inventory (38 total)

### 2A. HTTP-endpoint jobs (35)

All endpoints are `@Public()` + `assertCronSecret(authorization)`. Both GET and POST are registered for each (Vercel Cron sends POST; GET allows manual curl).

| # | Endpoint path | Controller file | Service method | What it does | Tenant-scoped? | Idempotent? | Failure behaviour | Retry / backoff | Dead-letter |
|---|---|---|---|---|---|---|---|---|---|
| 1 | `POST /cron/trial-expiry` | `cron-billing.controller.ts:28` | `CronBillingService.processTrialExpiry()` | Expires `TRIAL` subs past deadline; sends 1/3/7-day reminder emails | Global sweep, per-org action | Yes (status transition) | Per-trial try/catch, logs warn | None (external reschedule) | None |
| 2 | `POST /cron/monthly-plan-grants` | `cron-billing.controller.ts:40` | `CronBillingService.processMonthlyPlanGrants()` | Grants monthly AI credits to ACTIVE subs | Global sweep | Yes (idempotency via `monthRef`) | Per-org try/catch, logs error | None | None |
| 3 | `POST /cron/ai-reservations-sweep` | `cron-billing.controller.ts:52` | `CronBillingService.sweepAiReservations()` | Releases expired AI credit reservations | Global | Yes | None explicit | None | None |
| 4 | `POST /cron/auto-topup-flush` | `cron-billing.controller.ts:64` | `CronBillingService.processAutoTopUps()` | Executes auto top-up AI credit purchases for eligible wallets | Global | Yes (same-day purchase guard) | Per-wallet try/catch, logs error | None | None |
| 5 | `POST /cron/ai-jobs-flush` | `cron-billing.controller.ts:76` | `AiJobsWorkerService.flush()` | Claims + runs pending AI background jobs | Per-org via job row | Claim is atomic | Per-job try/catch, marks DEAD | None (cron reschedule) | DEAD status |
| 6 | `POST /cron/auto-checkout` | `cron-hr.controller.ts:43` | `CronAttendanceService.processAutoCheckout()` | Auto-checks-out all open attendance records past policy time | **Global sweep, no orgId filter** on initial query | Conditional (skips `autoCheckedOut=true`) | Per-record silent skip | None | None |
| 7 | `POST /cron/monthly-leave-reset` | `cron-hr.controller.ts:54` | `CronLeaveService.runMonthlyLeaveReset()` | Accrues monthly leaves, expires unused, resets yearly balances | Global sweep (all orgs) | Accrual guarded by `periodLabel` uniqueness in `hrLeaveLedger` | None | None | None |
| 8 | `POST /cron/daily-notifications` | `cron-hr.controller.ts:65` | `CronNotificationsService.sendDailyNotifications()` | Birthday in-app notifications; **leaveCount always returns 0** (dead code bug) | Query users globally by DOB, then per-org | Not truly idempotent (re-inserts notifications) | Per-org try/catch | None | None |
| 9 | `POST /cron/holiday-notifications` | `cron-hr.controller.ts:77` | `CronHolidayService.sendHolidayNotifications()` | Upcoming holiday notifications | Per-org | Not idempotent | Re-thrown | None | None |
| 10 | `POST /cron/offer-deadline-reminders` | `cron-hr.controller.ts:86` | `CronRecruitmentService.sendOfferDeadlineReminders()` | Emails candidates with expiring offers | Per-org/candidate | No idempotency guard | None | None | None |
| 11 | `POST /cron/interview-no-shows` | `cron-hr.controller.ts:97` | `CronRecruitmentService.processInterviewNoShows()` | Marks no-show interviews, creates follow-up tasks | Per-org | Checks timestamp `NO_SHOW_FOLLOW_UP_DUE_MS` | None | None | None |
| 12 | `POST /cron/certification-expiry` | `cron-hr.controller.ts:108` | `CronHrService.processCertificationExpiry()` | Fires certification expiry automations; sets `reminderSent=true` | Global sweep all certs, orgId per-record | Yes (`reminderSent` flag) | None | None | None |
| 13 | `POST /cron/onboarding-sweep` | `cron-hr.controller.ts:119` | `CronHrService.processOnboardingCompletionSweep()` | Fires `onboarding.completed` event for employees with all tasks done | Global sweep | Checks `onboardingCompletedAt IS NULL` | None | None | None |
| 14 | `POST /cron/weekly-exec-recap` | `cron-hr.controller.ts:130` | `CronWeeklyRecapService.sendWeeklyExecRecaps()` | AI-generated weekly business recap emails to org owners | **Queries ALL orgs, no status filter** | Not idempotent | Per-org try/catch, logs error | None | None |
| 15 | `POST /cron/document-expiry` | `cron-hr.controller.ts:141` | `CronHrService.processDocumentExpiry()` | Fires document expiry HR automation events | Global sweep | Checks date window | None | None | None |
| 16 | `POST /cron/hr-engines-sweep` | `cron-hr.controller.ts:148` | `CronHrEnginesService.runAll()` | Runs workflow SLA, effective changes, goals, automation, probation, compliance, work-auth, contracts sweeps across all orgs | Global across all `ACTIVE + not deleted` orgs | Per-sweep, varies | Per-org per-sweep try/catch | None | None |
| 17 | `POST /cron/hr-engines-sweep/:sweepName` | `cron-hr.controller.ts:158` | `CronHrEnginesService.sweepWorkflowSlaEscalations()` (only valid name) | Named single-sweep override | Per-org inside engine | Varies | None | None | None |
| 18 | `POST /cron/chat-reply-reminders` | `cron-platform.controller.ts:37` | `ChatReplyRemindersService.processDueReminders()` | Sends chat reply reminders | Per-org | Yes | None | None | None |
| 19 | `POST /cron/email-outbox-flush` | `cron-platform.controller.ts:49` | `EmailOutboxService.processRetries()` | Retries PENDING outbox emails up to MAX_ATTEMPTS=8 with exponential backoff | Global (no orgId filter on retry query) | Yes (status transitions) | Dead after 8 attempts | Exponential backoff up to 60 min | DEAD status |
| 20 | `POST /cron/notification-delivery-flush` | `cron-platform.controller.ts:61` | `NotificationDeliveryWorker.processQueue()` | Drains `notification_queue` PENDING/stale-LOCKED rows, delivers via provider | Per-org (orgId on each delivery row) | LOCKED claim is atomic | Per-job catch, re-arms as PENDING with backoff[0] | Stepped: 1/5/15/60/360 min | DEAD after `maxAttempts` |
| 21 | `POST /cron/invitation-expiry` | `cron-platform.controller.ts:73` | `CronOrganizationService.expireStaleInvitations()` | Bulk-updates PENDING invitations past `expiresAt` to EXPIRED | Global | Yes | None | None | None |
| 22 | `POST /cron/org-purge-worker` | `cron-platform.controller.ts:85` | `CronOrganizationService.runPurgeWorker()` | Marks `PURGE_SCHEDULED` orgs as `PURGED` — **no cascade data deletion** (TODO comment) | Global | Atomic per-org status transition | Per-org try/catch | None | None |
| 23 | `POST /cron/idempotency-fence-sweep` | `cron-platform.controller.ts:97` | `CronIdempotencyService.pruneExpiredFences()` | Prunes expired `command_fences`, `inv_idempotency_keys`, and 30-day-old `payroll_command_receipts` | Global | Batched delete loop | None | None | None |
| 24 | `POST /cron/timesheets-exception-detection` | `cron-platform.controller.ts:109` | `ExceptionsDetectorService.detectAllOrgs()` | Scans all orgs for timesheet anomalies | Global → per-org | Varies | None | None | None |
| 25 | `POST /cron/support-sla-escalations` | `cron-support.controller.ts:32` | `SupportSlaService.runEscalationsForAllOrgs()` | Checks SLA breaches, escalates tickets | Per-org | Varies | None | None | None |
| 26 | `POST /cron/support-unsnooze` | `cron-support.controller.ts:44` | `SupportTicketsService.unsnoozeExpiredTickets()` | Reopens snoozed tickets past unsnooze time | Global | Status transition | None | None | None |
| 27 | `POST /cron/kb-trash-purge` | `cron-support.controller.ts:56` | `CronKbService.purgeExpiredTrash()` | Hard-deletes KB pages in trash past retention window | Per-org | Yes | Per-org try/catch | None | None |
| 28 | `POST /cron/support-kb-gap-detect` | `cron-support.controller.ts:68` | `SupportKbGapService.runDetectAllOrgs()` | AI detection of unanswered support questions lacking KB articles | Per-org | Varies | Per-org error count | None | None |
| 29 | `POST /cron/projects-recurring-flush` | `cron-build.controller.ts:37` | `CronProjectsService.spawnDueRecurringTickets()` | Creates child tickets from recurring ticket templates | **Global sweep, no orgId filter** on `tickets` query | `recurrenceNextRunAt` advance | Per-template try/catch | None | None |
| 30 | `POST /cron/crm-sequences-flush` | `cron-build.controller.ts:48` | `CrmSequencesRunnerService.flushDueEnrollments()` | Advances CRM sequence enrollments | Per-org (assumed by sequences table) | Varies | None | None | None |
| 31 | `POST /cron/finance-recurring-flush` | `cron-build.controller.ts:59` | `CronFinanceService.runRecurringFlush()` | Generates recurring journals, invoices, bills | Per-org inside each sub-service | Varies | Per-task try/catch | None | None |
| 32 | `POST /cron/finance-due-checks` | `cron-build.controller.ts:70` | `CronFinanceService.runDueChecks()` | Marks overdue invoices/bills, sends invoice reminders, tax compliance checks | Per-org inside sub-services | Varies | Per-task try/catch | None | None |
| 33 | `POST /cron/finance-depreciation` | `cron-build.controller.ts:81` | `CronFinanceService.runDepreciation()` | Runs asset depreciation | Per-org | Varies | Per-task try/catch | None | None |
| 34 | `POST /cron/crm-tasks-overdue-flush` | `cron-build.controller.ts:92` | `CronCrmTasksService.flushOverdueTasks()` | Emits `task.overdue` events for past-due CRM tasks | Per-org | Varies | None | None | None |
| 35 | `POST /cron/build-retention-prune` | `cron-build.controller.ts:100` | `CronBuildRetentionService.pruneWebhookDeliveries()` | Prunes webhook delivery rows older than 90 days | Global | Batched loop | None | None | None |
| 36 | `POST /cron/outbox-events-flush` | `common/outbox/outbox-flush.controller.ts:11` | `OutboxPublisherService.flush()` | Claims `outbox_events` PENDING/expired-IN_FLIGHT, **calls stub `deliver()` that does nothing**, marks DELIVERED | Tenant-scoped (`org_id` on every row) | Atomic lease claim + lifecycle check | Backoff retry up to dead-letter ceiling | Bounded exponential via `nextRetryDelayMs` | DEAD status |

### 2B. In-process workers (3)

| # | Service | File:line | Trigger | What it does | Tenant-scoped? | Idempotent? | Failure | Retry | Dead-letter |
|---|---|---|---|---|---|---|---|---|---|
| 37 | `PayrollJobsWorkerService` | `payroll/jobs/payroll-jobs-worker.service.ts:39` | `setInterval 5 s` + boot kick | Claims `payroll_jobs` PENDING rows; executes GENERATE/RECALCULATE/PDF_PUBLISH/FILING_EXPORT; marks COMPLETED/FAILED | Per-org (job row has `org_id`) | Atomic claim | Marks FAILED with message | None (operator must re-queue) | `DEAD_LETTER` not implemented — stays FAILED |
| 38 | `NotificationDeliveryWorker` | `notifications/notification-delivery-worker.service.ts:38` | `setInterval 15 s` (env-configurable); also flushed by job #20 | Drains `notification_queue`; delivers via provider registry; exponential backoff | Per-org via delivery row `org_id` | Atomic SELECT + UPDATE LOCK | Re-arms as PENDING with backoff[0] | 1/5/15/60/360 min steps (`BACKOFF_MINUTES`) | DEAD after `maxAttempts` |
| 39 | `PayrollCalendarReminderScheduler` | `payroll/insights/payroll-calendar-reminder.scheduler.ts:42` | `setTimeout` to next 8 AM, then `setInterval` 24 h | Sends payroll calendar event reminders to org owners | Global sweep up to 5000 events; per-org owner lookup | DB-atomic claim (`payroll_scheduler_state`) — only one instance fires per day | `markFinished(error)` | None | None |

---

## 3. Outbox Pattern

### Schema (`db/schema/common/outbox.ts`)

```
outbox_events: {
  outbox_event_id   bigint IDENTITY PK
  event_id          text UNIQUE          ← consumer dedup key
  organization_id   text FK → organizations (cascade delete)
  aggregate_type    text
  aggregate_id      text
  aggregate_version bigint               ← monotonic per-aggregate version
  schema_version    int default 1
  causation_id      text
  correlation_id    text
  actor_membership_id text
  audience          text default 'INTERNAL'
  lifecycle_state   text default 'ACTIVE'
  delivery_state    PENDING|IN_FLIGHT|DELIVERED|DEAD|SUPPRESSED
  event_type        text
  payload           jsonb
  occurred_at       timestamptz
  published_at      timestamptz
  lease_expires_at  timestamptz          ← 30 s lease
  retry_count       int
  last_error        text
  dead_lettered_at  timestamptz
  created_at        timestamptz
}

inbox_records: {
  inbox_record_id   bigint IDENTITY PK
  producer_event_id text
  consumer_name     text
  UNIQUE(producer_event_id, consumer_name)   ← exactly-once per consumer
  organization_id   text FK
  aggregate_version bigint
  status            text default 'PENDING'
  processed_at      timestamptz
  last_error        text
  retry_count       int
}
```

### Who writes to outbox?
`OutboxPublisherService` is the only writer (`common/outbox/outbox-publisher.service.ts`). Consumers would write to `inbox_records` to dedup. However, the drain's `deliver()` is a stub — see critical finding below.

### Who drains it?
- **External trigger:** `POST /cron/outbox-events-flush` → `OutboxPublisherService.flush()`
- **Claim mechanism:** atomic `UPDATE … RETURNING` sets `IN_FLIGHT` + `lease_expires_at = now + 30s`. Stale IN_FLIGHT rows (past lease) are also claimed. (`outbox-publisher.service.ts:66-96`)
- **At-least-once safe?** Mechanically yes — lease-based claim with stale reclaim is correct. **But the `deliver()` method is a complete no-op stub** (see Finding P0-1).
- **Idempotent drain?** The `uniq_outbox_events_event_id` index gives consumers a dedup key. The `inbox_records` table provides the consumer-side exactly-once dedup. Both are structurally correct but never exercised because deliver() does nothing.

---

## 4. Payroll-Relevant Jobs

| Job | Service | File:line | Resumable/Chunked? | Notes |
|---|---|---|---|---|
| Payroll GENERATE / RECALCULATE | `PayrollJobsWorkerService.execute()` | `payroll/jobs/payroll-jobs-worker.service.ts:143-156` | **No** — all-or-nothing `generateRun()` call; no checkpoint | Crash mid-run leaves job IN_PROGRESS permanently |
| PDF_PUBLISH (payslip) | `PayrollJobsWorkerService.execute()` | `payroll/jobs/payroll-jobs-worker.service.ts:157-165` | **No** — delegates to `PublishingService.publish()` which loops employees but has no checkpoint | Loop is within one transaction per employee (upsert); re-run is safe if job is manually re-queued |
| FILING_EXPORT | `PayrollJobsWorkerService.execute()` | `payroll/jobs/payroll-jobs-worker.service.ts:166-180` | **No** — single `prepareExport()` call | |
| PREVIEW / EXPORT / RECONCILE | `payroll-jobs-worker.service.ts:186-189` | `payroll/jobs/payroll-jobs-worker.service.ts:186` | N/A — registered as no-op (`return { ok: true, note: "... acknowledged (no-op handler)" }`) | These job types are silently ignored |
| Payroll calendar reminders | `PayrollCalendarReminderScheduler` | `payroll/insights/payroll-calendar-reminder.scheduler.ts:98` | Yes via `payroll_scheduler_state` daily-claim atomic | Queries up to 5000 events; N+1 notify loop |
| Leave accrual / expiry / reset | `CronLeaveService.runMonthlyLeaveReset()` | `cron/cron-leave.service.ts:26` | No — runs all orgs in-process loop; no checkpoint | Accrual guarded by `periodLabel` in `hrLeaveLedger` (idempotent) |
| Bank file generation | **Not found** | — | — | No automated job; export is manual via filing endpoints |
| Bank return import | **Not found** | — | — | No automated job |
| Payroll credit reconciliation | **Not found** (job type RECONCILE is a no-op) | `payroll-jobs-worker.service.ts:186` | — | Reconciliation is a read-only compute lib, not a scheduled job |
| Attendance recompute | `CronAttendanceService.processAutoCheckout()` | `cron/cron-attendance.service.ts:21` | No — processes all open records in one loop | Global sweep without orgId filter |

---

## 5. Notification / Email Pipeline

### Flow
1. **Emit** — caller calls `NotificationDispatchService.emit(input)` (`notifications/notification-dispatch.service.ts:51`)
2. **Routing** — `NotificationRoutingService.routeMany()` resolves per-user channel decisions: checks preferences, quiet hours, suppression rules, rate limits (per event catalog), available providers. (`notification-routing.service.ts`)
3. **Persist** — `persistForUser()` runs in a **transaction**: inserts `notification_deliveries` row + `notifications` row (IN_APP) + `notification_queue` row for each non-IN_APP channel. Uses `idempotencyKey` with `onConflictDoNothing` for deduplication within the `dedupeWindowSeconds` window. (`notification-dispatch.service.ts:181-295`)
4. **Deliver (in-process)** — `NotificationDeliveryWorker.processQueue()` claims PENDING/stale-LOCKED rows, calls `provider.send()`, updates delivery status. Runs every 15 s or on-demand via `POST /cron/notification-delivery-flush`.
5. **Backoff** — stepped: 1/5/15/60/360 min (`notification-delivery-worker.service.ts:12`). Dead after `delivery.maxAttempts`.

### Delivery status tracked?
Yes. `notification_deliveries` tracks `status` (QUEUED/SENDING/SENT/FAILED/DEAD/SUPPRESSED/DELIVERED), `sentAt`, `failedAt`, `failureCode`, `failureMessage`, `providerMessageId`, `providerResponse`, `attemptCount`. (`notification-delivery-worker.service.ts:186-203`)

### Per-tenant rate limits?
Rate limit defined per event type (`rateLimitMax`, `rateLimitWindowSeconds` on `notificationEvents`). **All catalog events have `rateLimitMax: 0` (disabled) by default.** Operators can configure per-org overrides. (`notification-events.catalog.ts:35`)

### Deduplication?
Yes — `buildIdempotencyKey()` combines `orgId + eventKey + userId + entity + channel + timeBucket` (bucket = `floor(now / dedupeWindowSeconds)`). `onConflictDoNothing` on `idempotency_key` prevents duplicate deliveries within the window. (`notification-dispatch.service.ts:158-161`)

---

## 6. Salary / Bank Details in Email Body or Logs

### CONFIRMED: net salary value in email body (stored in DB)

| Location | File:line | What is exposed |
|---|---|---|
| `getPayslipEmailTemplate()` param | `modules/email/templates/payroll.ts:7` | `netSalary: string` parameter |
| Email body HTML | `modules/email/templates/payroll.ts:20-21` | `<td>Net pay</td><td>₹${netSalary}</td>` rendered into email HTML |
| `PublishingService.publish()` call site | `modules/payroll/payout/publishing.service.ts:246-252` | `netAmount = parseFloat(snapshot.totals.net).toLocaleString(...)` passed to template |
| `email_outbox.html` column | DB — email_outbox table | HTML body including `₹<net>` stored until SENT/pruned |

**The net salary amount is in the email body HTML sent to the employee's email, and is stored in `email_outbox.html` until the row is pruned.** This is intentional by design (payslip notification email), but the row is NOT cleaned up after SENT. No automated purge of `email_outbox` was found.

### Email logs — subject only, no body
`EmailOutboxService` logs only `{ id, to: toEmail, subject }` — never the HTML body. (`email-outbox.service.ts:43,52,77,92,151,166`)

### No salary/bank details in server logs
Grepping all payroll services for logger/console calls that include salary or bank fields: **no salary amounts or bank account numbers are written to logs**. `publishing.service.ts:270` logs only `{ orgId, runId, userId, failureReason }` on PDF failure.

### CONFIRMED: bank details (masked) in payslip PDF
`publishing.service.ts:148-149`: `decryptBankDetails()` is called to get the bank account; only the last 4 digits (`maskedAccount = "XXXX" + bank.accountNumber.slice(-4)`) plus `bankName` and `ifsc` are passed to the PDF renderer. The IFSC code is passed unmasked to the PDF.

---

## 7. Email / Notification Templates

### Email templates (`modules/email/templates/`)
All are TypeScript functions returning `{ subject, html }`. No template engine or DB-backed templates for system emails. Templates exist for: payroll payslip, HR document expiry, HR document upload, recruitment offer/interview, expense notifications, project/ticket assignment, deal stage change, lead assignment, support ticket CRUD, sign envelope flows, weekly recap, trial reminder.

### Payroll/HR templates with sensitive fields

| Template | File | Sensitive field in body? |
|---|---|---|
| `getPayslipEmailTemplate` | `email/templates/payroll.ts` | `₹${netSalary}` (net pay amount) in body |
| `getWeeklyRecapEmailTemplate` | `email/templates/reports.ts` | Aggregate business metrics — no individual salary |
| `getDocumentExpiryReminderEmailTemplate` | `email/templates/hr.ts` | Document name, expiry date — no PII salary |

### Notification templates
DB-backed (`notification_templates` table, per-org, per-channel, per-locale). Variable interpolation via `{{placeholder}}` replace. (`notification-dispatch.service.ts:154-156`). The `payroll.payslip.ready` notification body is `"Your payslip for ${month} is ready to download."` — **no salary amount in the notification body** (`payroll/insights/payroll-notifications.service.ts:22`).

---

## 8. Dunning

**No dunning or payment retry flow exists.** `CronBillingService.processTrialExpiry()` sends reminder emails at 1/3/7 days before trial expiry and transitions TRIAL → EXPIRED after deadline. There is no failed-payment retry, no `PAST_DUE` status transition, no webhook retry for billing events from Razorpay. The billing module has a `payment-webhook-health.service.ts` that checks provider connectivity but performs no retry logic. Confirmed absent.

---

## 9. Reconciliation Jobs

| Reconciliation type | Exists? | Notes |
|---|---|---|
| AI credits vs ledger | Yes (manual sweep) | `sweepAiReservations()` releases expired reservations — `cron-billing.service.ts:114` |
| Seats vs members | **Absent** | No automated seat count reconciliation job found |
| Payments vs provider | **Absent** | `payment-webhook-health.service.ts` checks connectivity only; no settlement reconciliation |
| Bank confirmations vs payout batches | **Absent** | `period-reconciliation.ts` is a pure computation library (no DB writes, no scheduler); only invoked on-demand via a controller |
| Idempotency fence prune | Yes | `CronIdempotencyService.pruneExpiredFences()` — job #23 |
| Email outbox dead/retry | Yes | `EmailOutboxService.processRetries()` — job #19 |
| Notification delivery retry | Yes | `NotificationDeliveryWorker.processQueue()` — job #20 / worker #38 |

---

## 10. Tenant Scoping in Jobs

### Jobs that query globally without orgId filter (intentional global sweeps):

| Job | File:line | Missing filter | Intentional? |
|---|---|---|---|
| `auto-checkout` | `cron-attendance.service.ts:22-24` | `attendance` table queried without `orgId` filter | Yes — sweeps all open records globally; `orgId` used per-record |
| `certification-expiry` | `cron-hr.service.ts:30-47` | `certifications` queried without `orgId` filter | Yes — global sweep, `orgId` per-cert |
| `document-expiry` | `cron-hr.service.ts:153` | `documents` queried without `orgId` filter | Yes — global sweep |
| `onboarding-sweep` | `cron-hr.service.ts:88-105` | `onboardingTasks` joined with `users`, no `orgId` filter | Yes — global sweep |
| `projects-recurring-flush` | `cron-projects.service.ts:18-41` | `tickets` queried without `orgId` filter | Yes — global sweep of recurring templates |
| `build-retention-prune` | `cron-build-retention.service.ts:21-28` | `webhookDeliveries` queried without `orgId` filter | Yes — global retention sweep |
| `invitation-expiry` | `cron-organization.service.ts:17-29` | `invitations` queried without `orgId` filter | Yes — bulk expiry |
| `weekly-exec-recap` | `cron-weekly-recap.service.ts:46-48` | Queries ALL orgs with no `status` filter | **Suspicious — see Finding P1-1** |
| `daily-notifications` (birthday) | `cron-notifications.service.ts:34-48` | Users queried by DOB with no `orgId` filter | Yes — correct; membership fetched per-user |
| `email-outbox-flush` | `email-outbox.service.ts:104-110` | `emailOutbox` queried without `orgId` filter | Yes — global retry sweep |

---

## 11. Top 12 Findings (ranked)

| SEV | Location | Finding |
|---|---|---|
| **P0** | `common/outbox/outbox-publisher.service.ts:111-115` | **Outbox drain `deliver()` is a complete stub** — the method body is a single `this.logger.debug(...)` call and returns. Every domain event written to `outbox_events` is atomically claimed, logged, then immediately marked `DELIVERED` with zero actual delivery. Inbox consumers, event-driven workflows, and async side-effects that depend on the transactional outbox are silently never invoked. |
| **P0** | `modules/payroll/jobs/payroll-jobs-worker.service.ts:186-189` | **GENERATE, RECALCULATE, PREVIEW, EXPORT, RECONCILE job types are partially no-ops.** `PREVIEW`/`EXPORT`/`RECONCILE` return `{ ok: true, note: "no-op handler" }` — they silently succeed without doing anything. A UI that enqueues a `RECONCILE` job will see `status=COMPLETED` with no reconciliation performed. |
| **P0** | `modules/payroll/jobs/payroll-jobs-worker.service.ts:39,143` | **Payroll GENERATE/RECALCULATE is all-or-nothing with no crash recovery.** `PayrollJobsWorkerService` uses `setInterval` with no stale-lock timeout. A process crash mid-`generateRun()` leaves the job permanently `IN_PROGRESS` with no automatic re-queue or operator alert. Workers on cold restart will skip claimed rows until manual intervention. |
| **P1** | `cron/cron-weekly-recap.service.ts:46-48` | **Weekly exec recap emails ALL organizations including PURGED/DELETED ones.** `SELECT id, name FROM organizations` with no `status` or `deleted_at` filter. Org owners of purged/deleted tenants receive weekly AI recap emails indefinitely. |
| **P1** | `cron/cron-notifications.service.ts:31` | **`leaveCount` is always 0.** Variable declared and initialized to `0` at line 31; never computed or incremented. `POST /cron/daily-notifications` always responds `leaveCount: 0` regardless of actual on-leave employees. Leave-based daily notifications are silently dead. |
| **P1** | `app.module.ts` (absence) | **No `ScheduleModule` from `@nestjs/schedule` registered.** All 35 cron jobs depend on an external caller (Vercel Cron, etc.). If the external scheduler is misconfigured or fails, ALL 35 jobs stop silently — there is no in-process fallback, no alerting, and no monitoring of missed runs. |
| **P1** | `modules/cron/cron-org-purge-worker.service.ts:60-98` | **Org purge is a stub — no tenant data is deleted.** `purgeSingle()` only sets `status_v2 = 'PURGED'`; a `TODO` comment at `cron-organization.service.ts:69` confirms cascade data deletion was deferred. GDPR/data-retention SLAs cannot be met. Both `CronOrgPurgeWorkerService` and `CronOrganizationService.executePurge()` are similarly incomplete stubs. |
| **P2** | `modules/email/templates/payroll.ts:20-21` | **Net salary amount rendered in payslip notification email body.** `₹${netSalary}` is placed in the HTML body row of the email sent to employees. The `email_outbox.html` DB column retains the full HTML (including the salary figure) with no automated purge after SENT. Risk: compromise of the `email_outbox` table exposes salary data in plaintext. |
| **P2** | `modules/payroll/payout/publishing.service.ts:162-163` | **IFSC code written unmasked to payslip PDF data.** `bank.ifsc` (full IFSC code) passed to `buildPayslipPdfData` and included in generated PDFs. Unlike `accountNumber` (masked to last-4), IFSC is not masked. This is low-risk in a payslip PDF but is a disclosure surface if PDFs are leaked. |
| **P2** | `modules/notifications/notification-delivery-worker.service.ts:37-38` | **In-process notification worker can be disabled by env.** If `NOTIFICATIONS_INPROCESS_WORKER=false` AND the external `POST /cron/notification-delivery-flush` is not scheduled, all notification deliveries queue indefinitely with no alert. The env var is not validated at startup. |
| **P2** | `cron/cron-hr.service.ts:30-47` + `cron/cron-attendance.service.ts:22-24` | **Global cross-tenant sweeps load unbounded result sets.** Certification expiry uses `.limit(500)`; attendance `findMany` has no limit. On a large multi-tenant deployment, `attendance` query returns ALL open records across ALL orgs in one Neon round-trip. No pagination or batch chunking. |
| **P2** | `modules/payroll/insights/payroll-calendar-reminder.scheduler.ts:106` | **Payroll calendar reminder loop loads up to 5000 events then N+1 notify per owner.** `events.length === 5000` silently truncates; events beyond the limit are missed until next day. Owner lookup is per-org (batched via `inArray`), but the notify inner loop is O(events × owners). |

---

## Coverage Gaps

- `modules/email/email.provider.ts` — not audited for retry logic in the SMTP adapter; `isTransientError()` classification was not checked.
- `modules/realtime/ably.service.ts` — not audited for connection lifecycle or reconnect handling.
- `modules/push/push.service.ts` — not audited; push delivery path via `NotificationProviderRegistry` was traced but provider implementations not read.
- `modules/payroll/runs/generate.service.ts` — the `generateRun()` implementation was not read; cannot confirm whether it is transactional internally.
- `modules/finance/banking/reconciliation.service.ts` — on-demand bank reconciliation controller exists; not a scheduled job; not audited.
- Ably channel management, connection limits, and per-tenant isolation in `realtime` not audited.
- `NOTIFICATIONS_INPROCESS_WORKER` env var and its interaction with the external flush job not tested for edge-case double-delivery (both in-process timer and external cron flush firing simultaneously — the `LOCKED` claim prevents duplicate delivery, so this should be safe, but was not verified end-to-end).
