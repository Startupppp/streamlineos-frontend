# Side-Effects Re-Enable Manifest

Inventory of every fire-and-forget integration **side-effect that was OMITTED** when routes were ported
from the Next.js frontend (`D:\projects\personal\Streamlineos\frontend`) to the NestJS backend
(`D:\projects\personal\Streamlineos\backend`). The synchronous DB core was ported; the integration
side-effect was dropped because the integration wasn't available yet. Those integrations now exist as
backend modules, so each row below can be re-enabled.

> **Audit date:** 2026-06-27. Re-derived by diffing each frontend route source (deleted routes recovered
> from git ref `37be39b3~1`) against the backend handler.

## IMPORTANT — read before acting

1. **The backend is under active concurrent migration on `feat/backend-extraction-bridge`.** During this
   audit the module tree changed live: `modules/email`, `modules/ai`, `modules/billing`, and a full
   `modules/google-calendar` service appeared, and `modules/ai/services/*` files were renamed mid-scan.
   **Re-verify a handler's current state before wiring** — some "UNMIGRATED" rows may already be in flight.

2. **The integration adapters now exist (corrects the original brief):**
   | Integration | Backend service (inject target) | Location | Notes |
   |---|---|---|---|
   | Email (all per-event templates) | `EmailService` | `backend/src/modules/email/email.service.ts` | `@Global` `EmailModule` — no import needed. ALL frontend `send*Email` templates already ported (see method list below). |
   | SMS / WhatsApp (Twilio) | `EmailService.sendSms` / `sendWhatsApp` / `sendWhatsAppWithSmsFallback` | `backend/src/modules/email` (`dispatch/twilio.gateway.ts`) | Already ported. |
   | Automation engine | `AutomationService.runAutomationsForEvent(orgId, trigger, payload)` | `backend/src/modules/automation/automation.service.ts` | Exported by `AutomationModule`. Check `automationTriggerEnum` for trigger parity (most HR/CRM triggers already present). |
   | Ably realtime | `AblyService.publishChatMessage(orgId, channelId, payload)` | `backend/src/modules/realtime/ably.service.ts` | Exported by `RealtimeModule`. Self-guards on missing `ABLY_API_KEY`. |
   | Web push | `WebPushService.sendToUser(userId, payload)` / `sendToChannelMembers(channelId, senderUserId, payload)` | `backend/src/modules/realtime/web-push.service.ts` | Exported by `RealtimeModule`. |
   | Google Calendar / Meet | `GoogleCalendarService` (`createMeet`, `pushInterviewEvent`, `syncInterview`) | `backend/src/modules/google-calendar/google-calendar.service.ts` | Exists + exported. `/calendar/create-meet` already fully ported. |
   | AI (scoring / smart-notification / suggestions) | `modules/ai` services (CRM scoring / content, HR AI) | `backend/src/modules/ai/services/*` | Module exists; **file/class names were in flux during audit — confirm current class before injecting.** `GET /ai/suggestions` already ported. |
   | Billing | `BillingService` / `RazorpayService` | `backend/src/modules/billing/` | Exists. (No omitted row below actually needs it — the client "INVESTED" incentive is a DB write, not a Razorpay call.) |

3. **Two genuine gaps remain with NO backend equivalent yet:**
   - **Inngest / outbound `dispatchWebhook`** — frontend `dispatchWebhook(orgId, event, payload)` (→ `inngest.send("webhook/dispatch")`) and direct `inngest.send(...)` jobs. Backend `AutomationService.dispatchWebhook` is **private** (automation-rules only); `WebhooksService` is CRUD-only. Re-enabling these rows requires **adding a public event-dispatch method** (to `WebhooksService` or `AutomationService`).
   - **E-sign (Documenso)** — `createSigningRequest` in recruitment rollout-documents. No backend esign service.

4. **PARTIAL vs UNMIGRATED.** Each row is tagged:
   - **PARTIAL** = backend handler EXISTS and writes the DB core; only the side-effect was dropped → pure re-enable.
   - **UNMIGRATED** = the mutation endpoint itself was not ported yet → the side-effect is absent by extension; you must port the write-path first, then call the (already-available) service.

`EmailService` already exposes: `sendExpenseSubmitted/Approved/Rejected/Paid`, `sendAssetAssigned`, `sendPayrollApproved`, `sendProjectAssignment`, `sendTicketAssignment/ReviewRequest/ChangesRequested`, `sendSupportTicketCreated/Reply/Status`, `sendTaskAssigned`, `sendHelpdeskTicket`, `sendDealStageChange`, `sendLeadAssigned`, `sendLeaveRequest/StatusUpdate/Cancellation`, `sendResignationSubmitted/Approved`, `sendTermination`, `sendWorkLogStatus`, `sendOnboardingWelcome/Task/CompleteEmployee/CompleteHr`, `sendReviewAssigned`, `sendInvitation`, `sendWelcome`, `sendHolidayAnnouncement`/`sendBulkHolidayAnnouncement`, plus `sendEmail` (generic, supports attachments) and `sendSms`/`sendWhatsApp`/`sendWhatsAppWithSmsFallback`.

---

## 1. Summary counts

**Total omitted side-effects: ~88**, across **24 owning modules**. (Some rows fan out to multiple recipients; counted once.)

### By integration

| Integration | Count | Re-enable target |
|---|---:|---|
| Email | ~48 | `EmailService.*` (ready) |
| Automation engine | ~21 | `AutomationService.runAutomationsForEvent` (ready) |
| Inngest async jobs | 6 | **GAP** — no backend equivalent |
| Outbound webhook (`dispatchWebhook`) | 4 | **GAP** — add public dispatch |
| Google Calendar / Meet | 2 | `GoogleCalendarService` (ready) |
| AI (scoring / smart-notification) | 2 | `modules/ai` (verify class) |
| Ably realtime | 1 | `AblyService` (ready) |
| Web push | 1 | `WebPushService` (ready) |
| WhatsApp / SMS (Twilio) | 1 | `EmailService.sendWhatsAppWithSmsFallback` (ready) |
| Chat channel auto-create | 1 | port into `DealsService` (chat tables) |
| E-sign (Documenso) | 1 | **GAP** — no backend esign service |

### By owning module

| Module | Omitted | Status mix |
|---|---:|---|
| deals | 4 | PARTIAL |
| chat | 2 | PARTIAL |
| projects | 4 | PARTIAL |
| tasks | 2 | PARTIAL |
| support | 4 | PARTIAL |
| clients | 1 | UNMIGRATED endpoint |
| invoices | 0 | (verified in-DB only) |
| leads | 8 | PARTIAL |
| hr-time (leaves + work-logs) | 9 | mixed (approve/reject PARTIAL; create/cancel/work-log UNMIGRATED) |
| hr-lifecycle (exit + termination + onboarding-docs) | 9 | UNMIGRATED |
| hr-directory (employees onboard + assets) | 5 | UNMIGRATED |
| hr-payroll (reimbursements + payrolls) | 3 | UNMIGRATED |
| onboarding | 3 | UNMIGRATED |
| hr-recruitment | 12 | PARTIAL (+ esign/inngest gaps) |
| hr-interviews | 12 | UNMIGRATED |
| hr-performance | 2 | UNMIGRATED |
| expenses | 5 | UNMIGRATED |
| hr-config (holidays) | 1 | UNMIGRATED |
| organization | 1 | UNMIGRATED endpoint |

Already-ported (NOT omitted, do not re-add): `POST /organization/invitations/resend` (email), `POST /notifications/dispatch` (email + Twilio), `GET /ai/suggestions` (AI, read-only), `POST /calendar/create-meet` (Google Meet), ticket comment mentions (`processCommentMentions` is DB-only — no email ever existed), all invoice/payment/ledger routes.

---

## 2. Per-module tables

> Columns: **Route** | **Backend handler file** | **Integration** | **Frontend call (exact)** | **Trigger** | **Service to inject** | **Status**

### deals  (PATCH /deals/:dealId — all four hang off `DealsService.updateDeal`)
Backend file: `backend/src/modules/deals/deals.service.ts` (controller `deals.controller.ts`)

| Route | Integration | Frontend call | Trigger | Service to inject | Status |
|---|---|---|---|---|---|
| PATCH /deals/:dealId | Chat channel | `maybeCreateNegotiationChannel(orgId, userId, dealId)` (inserts `chatChannels` GROUP w/ `linkedDealId` + `chatChannelMembers`) | stage transitions to `NEGOTIATION` and no channel already links the deal | port the insert into `DealsService` (uses `chatChannels`/`chatChannelMembers`); keep it **awaited before** the deal UPDATE | PARTIAL |
| PATCH /deals/:dealId | Email | `sendStageChangeNotification(...)` → `sendDealStageChangeEmail(assignee.email, ...)` | stage changed AND `assignedToId` set AND assignee has email | `EmailService.sendDealStageChangeEmail` | PARTIAL |
| PATCH /deals/:dealId | Webhook (inngest) | `dispatchWebhook(orgId, "deal.won", {id,name,value,assignedToId})` | `stage === "WON"` | **GAP** — public dispatch on `WebhooksService`/`AutomationService` | PARTIAL |
| PATCH /deals/:dealId | Automation | `runAutomationsForEvent(orgId, "deal.stage_changed", {id,name,value,stage,previousStage,assignedToId})` | any stage change | `AutomationService.runAutomationsForEvent` | PARTIAL |

> Coupling: backend `updateDeal` outcome currently drops `previousStage`; the email + automation payloads need it re-added to the service result.

### chat  (POST /chat/channels/:channelId/messages)
Backend file: `backend/src/modules/chat/chat-messages.service.ts` (`send`)

| Route | Integration | Frontend call | Trigger | Service to inject | Status |
|---|---|---|---|---|---|
| POST /chat/channels/:channelId/messages | Ably realtime | `Ably.Rest(...).channels.get(\`chat:${orgId}:${channelId}\`).publish("message", {...})` | after message insert, if `ABLY_API_KEY` set | `AblyService.publishChatMessage(orgId, channelId, payload)` | PARTIAL |
| POST /chat/channels/:channelId/messages | Web push | `sendPushToChannelMembers(channelId, senderUserId, {title,body,url})` | after every send; excludes sender | `WebPushService.sendToChannelMembers(channelId, senderUserId, payload)` | PARTIAL |

> Coupling: run both **after the insert transaction commits**, off the persisted message row.

### projects
Backend files: `backend/src/modules/projects/projects.service.ts`, `projects-tickets.service.ts`

| Route | Integration | Frontend call | Trigger | Service to inject | Status |
|---|---|---|---|---|---|
| POST /projects | Email | `sendProjectAssignmentEmail(member.email, ...)` | each added member (with email) on create | `EmailService.sendProjectAssignmentEmail` | PARTIAL |
| PATCH /projects/:id/tickets/:ticketId | Email | `sendTicketAssignmentEmail(...)` (via `notifyNewAssignees`) | each newly-added assignee ≠ actor (in-app notif already ported) | `EmailService.sendTicketAssignmentEmail` | PARTIAL |
| PATCH /projects/:id/tickets/:ticketId | Email | `sendTicketReviewRequestEmail(reporter.email, ...)` | `status === "IN_REVIEW"` and ticket has reporter | `EmailService.sendTicketReviewRequestEmail` | PARTIAL |
| PATCH /projects/:id/tickets/:ticketId | Email | `sendTicketChangesRequestedEmail(assignee.email, ...)` | `status === "CHANGES_REQUESTED"` and ticket has assignee | `EmailService.sendTicketChangesRequestedEmail` | PARTIAL |

> Correction to DEFERRALS.md: project-assignment email fires on **CREATE** (added members), not PATCH manager-reassignment. Ticket review/changes emails (`notifyStatusReview`) have no backend counterpart in `updateTicket`.

### tasks
Backend file: `backend/src/modules/tasks/tasks.service.ts`

| Route | Integration | Frontend call | Trigger | Service to inject | Status |
|---|---|---|---|---|---|
| POST /tasks | Email | `sendTaskAssignedEmail(assignee.email, ...)` | `assigneeId` ≠ creator | `EmailService.sendTaskAssignedEmail` | PARTIAL |
| PATCH /tasks/:taskId | Email | `sendTaskAssignedEmail(assignee.email, ...)` | `assigneeId` changed, ≠ previous, ≠ actor | `EmailService.sendTaskAssignedEmail` | PARTIAL |

### support
Backend file: `backend/src/modules/support/support-tickets.service.ts`

| Route | Integration | Frontend call | Trigger | Service to inject | Status |
|---|---|---|---|---|---|
| POST /support | Email | `sendSupportTicketCreatedEmail(assignee.email, ...)` | `finalAssigneeId` set (explicit or routing rules) | `EmailService.sendSupportTicketCreatedEmail` | PARTIAL |
| PATCH /support/:supportTicketId | Email | `sendSupportTicketStatusEmail(creator.email, ...)` | `status` present → notify creator | `EmailService.sendSupportTicketStatusEmail` | PARTIAL |
| PATCH /support/:supportTicketId | Email | `sendSupportTicketCreatedEmail(newAssignee.email, ...)` | `assigneeId` set and ≠ existing assignee | `EmailService.sendSupportTicketCreatedEmail` | PARTIAL |
| POST /support/:supportTicketId/messages | Email | `sendSupportTicketReplyEmail(otherParty.email, ...)` | `!isInternal`; recipient = creator↔assignee counterpart | `EmailService.sendSupportTicketReplyEmail` | PARTIAL |

### clients
Backend file: `backend/src/modules/clients/clients.controller.ts` — **no `@Patch(":clientId")` exists**

| Route | Integration | Frontend call | Trigger | Service to inject | Status |
|---|---|---|---|---|---|
| PATCH /clients/:clientId | Email | `sendNotification({channel:"email", title:"Client Invested!", recipientEmail})` → sales rep + each HR member | `status === "INVESTED"` with `investmentAmount` | `EmailService.sendEmail` (port generic notification HTML) | UNMIGRATED |

> The whole PATCH endpoint (incentives insert + in-app notifications + email) lives only in the Next route; not in DEFERRALS.md.

### invoices — **0 omitted** (DEFERRALS.md correct)
`invoices-write.service.ts` faithfully ports create/update/recordPayment + double-entry ledger posting. No email/automation/webhook/push existed in the frontend.

### leads  (frontend routes recovered from git `37be39b3~1`)
Backend files: `backend/src/modules/leads/leads.service.ts`, `leads-detail.service.ts`, `leads-ops.service.ts`, `lead-status.service.ts`

| Route | Integration | Frontend call | Trigger | Service to inject | Status |
|---|---|---|---|---|---|
| POST /leads | Email | `sendLeadAssignedEmail(rep.email, ...)` | `assignedToId` set AND assignee has email | `EmailService.sendLeadAssignedEmail` | PARTIAL |
| POST /leads | Webhook (inngest) | `dispatchWebhook(orgId, "lead.created", {...})` | always after insert | **GAP** — public dispatch | PARTIAL |
| POST /leads | Automation | `runAutomationsForEvent(orgId, "lead.created", {...})` | always after insert | `AutomationService.runAutomationsForEvent` (`lead.created` is in enum); add `imports:[AutomationModule]` to `LeadsModule` | PARTIAL |
| PATCH /leads/:leadId/assign | AI | `generateSmartNotification({event:"LEAD_ASSIGNED", context:{...}})` (awaited; static fallback) | always (drives the notification title/message) | `modules/ai` (verify class); fall back to static text | PARTIAL |
| PATCH /leads/:leadId/assign | Email | `sendEmail({to:assignee.email, subject:"Lead Assigned: ...", html})` | assignee has email | `EmailService.sendLeadAssignedEmail` / `sendEmail` | PARTIAL |
| POST /leads/distribute | Email | per-rep `sendEmail({to:rep.email, subject:"N New Lead(s) Assigned", html})` | each rep with assigned leads & email | `EmailService.sendEmail` | PARTIAL |
| PATCH /leads/:leadId/status (→CONVERTED) | Email | `sendNotification({channel:"email", title:"Lead Converted", recipientEmail: salesRep.email})` | status → `CONVERTED`, sales rep has email | `EmailService.sendEmail` (backend emits in-app only) | PARTIAL |
| PATCH /leads/:leadId/status (→CONVERTED) | Email | `sendNotification({channel:"email", title:"New Client Assigned", recipientEmail: crmUser.email})` | status → `CONVERTED`, CRM assignee resolved with email | `EmailService.sendEmail` | PARTIAL |

> `recalculateLeadScore` / `evaluateAssignmentRules` / `applySlaPolicy` are deterministic and **already ported** (`leads/lead-triggers.ts`). Only `generateSmartNotification` (assign) is true AI. The status/assign routes fire **no** automation/webhook (only `lead.created` on create does — corrects the brief's expectation).

### hr-time  (leaves + work-logs)
Backend files: `backend/src/modules/hr-time/leaves.service.ts`, `work-logs.service.ts`

| Route | Integration | Frontend call | Trigger | Service to inject | Status |
|---|---|---|---|---|---|
| POST /hr/leaves | Automation | `runAutomationsForEvent(orgId, "leave.requested", {...})` | always after insert | `AutomationService` | UNMIGRATED (no create handler) |
| POST /hr/leaves | Email | `sendLeaveRequestEmail(hr.email, ...)` per HR member | always after insert | `EmailService.sendLeaveRequestEmail` | UNMIGRATED |
| PATCH /hr/leaves/:leaveId/approve | Email | `sendLeaveStatusUpdateEmail(emp.email, ..., "APPROVED", ...)` | `status === APPROVED`, emp has email | `EmailService.sendLeaveStatusUpdateEmail` | PARTIAL (`updateStatus` exists) |
| PATCH /hr/leaves/:leaveId/approve | Webhook | `dispatchWebhook(orgId, "leave.approved", {...})` | after approve | **GAP** — public dispatch | PARTIAL |
| PATCH /hr/leaves/:leaveId/approve | Automation | `runAutomationsForEvent(orgId, "leave.approved", {...})` | after approve | `AutomationService` | PARTIAL |
| PATCH /hr/leaves/:leaveId/reject | Email | `sendLeaveStatusUpdateEmail(emp.email, ..., "REJECTED", reason)` | `status === REJECTED`, emp has email | `EmailService.sendLeaveStatusUpdateEmail` | PARTIAL |
| PATCH /hr/leaves/:leaveId/reject | Automation | `runAutomationsForEvent(orgId, "leave.rejected", {...})` | after reject | `AutomationService` | PARTIAL |
| PATCH /hr/leaves/:leaveId/cancel | Email | `sendLeaveCancellationEmail(hr.email, ...)` per HR member | owner cancels a PENDING request | `EmailService.sendLeaveCancellationEmail` | UNMIGRATED (no CANCELLED path) |
| PATCH /hr/work-logs/status | Email | `sendWorkLogStatusEmail(emp.email, ...)` | admin approves/rejects, emp has email | `EmailService.sendWorkLogStatusEmail` | UNMIGRATED |

> Note: backend `LeavesService.updateStatus` (the live PARTIAL handler) also dropped the in-app `createNotification` and `writeAuditLog`, though `NotificationsService`/`AuditService` are available to inject.

### hr-lifecycle  (exit + termination + onboarding-docs)
Backend files: `backend/src/modules/hr-lifecycle/exit.service.ts`, `termination.service.ts`, `onboarding-views.service.ts`

| Route | Integration | Frontend call | Trigger | Service to inject | Status |
|---|---|---|---|---|---|
| POST /hr/exit | Email | `sendResignationSubmittedEmail(admin.email, ...)` per CEO/HR | after insert (skip self) | `EmailService.sendResignationSubmittedEmail` | UNMIGRATED |
| POST /hr/exit | Inngest | `inngest.send({name:"hr/resignation.submitted", data:{...}})` | after insert | **GAP** | UNMIGRATED |
| POST /hr/exit | Automation | `runAutomationsForEvent(orgId, "resignation.submitted", {...})` | after insert | `AutomationService` | UNMIGRATED |
| PATCH /hr/exit/:resignationId | Email | `sendResignationApprovedEmail(emp.email, ...)` | `status === "CEO_APPROVED"`, emp has email | `EmailService.sendResignationApprovedEmail` | UNMIGRATED |
| PATCH /hr/exit/:resignationId/ceo-review | Inngest | `inngest.send({name:"hr/resignation.ceo_approved", data:{...}})` | after CEO decision | **GAP** | UNMIGRATED |
| PATCH /hr/exit/:resignationId/ceo-review | Automation | `runAutomationsForEvent(orgId, "resignation.approved", {...})` | `decision === "approve"` | `AutomationService` | UNMIGRATED |
| PATCH /hr/termination/:terminationId/complete | Automation | `runAutomationsForEvent(orgId, "employee.terminated", {...})` | status `SENT` → `COMPLETED` | `AutomationService` | UNMIGRATED |
| POST /hr/termination/:terminationId/send-email | Email + PDF | `sendTerminationEmail(emp.email, ..., [{pdf}])` (PDF via `generateTerminationLetterPdf`) | status `APPROVED`, not already sent | `EmailService.sendTerminationEmail` (supports attachments; PDF gen still needed) | UNMIGRATED |
| POST /hr/onboarding-docs | Automation | `runAutomationsForEvent(orgId, "onboarding.document_submitted", {...})` | after doc insert | `AutomationService` | UNMIGRATED |

### hr-directory  (employee onboard + assets)
Backend files: `backend/src/modules/hr-directory/employees.service.ts`, `assets.service.ts`/`assets.controller.ts`

| Route | Integration | Frontend call | Trigger | Service to inject | Status |
|---|---|---|---|---|---|
| POST /hr/employees/onboard | Email | `sendWelcomeEmail(email, fullName, setupUrl)` | after user insert, email present | `EmailService.sendWelcomeEmail` | UNMIGRATED (no `onboard` method) |
| POST /hr/employees/onboard | Inngest | `inngest.send({name:"hr/employee.onboarded", data:{...}})` | after insert | **GAP** | UNMIGRATED |
| POST /hr/employees/onboard | Automation | `runAutomationsForEvent(orgId, "onboarding.started", {...})` | after insert | `AutomationService` | UNMIGRATED |
| POST /hr/employees/onboard | Webhook | `dispatchWebhook(orgId, "employee.hired", {...})` | after insert | **GAP** — public dispatch | UNMIGRATED |
| POST/PATCH /hr/assets[/:assetId] | Email | `sendAssetAssignedEmail(assignee.email, ...)` | `assignedTo` set AND changed; assignee has email | `EmailService.sendAssetAssignedEmail` | UNMIGRATED (`assets` inventory table not ported; existing `hr` controller covers asset-returns/devices only) |

### hr-payroll  (reimbursements + payrolls)
Backend files: `backend/src/modules/hr-payroll/reimbursements.service.ts`, `payrolls.service.ts`

| Route | Integration | Frontend call | Trigger | Service to inject | Status |
|---|---|---|---|---|---|
| PATCH /hr/reimbursements/:reimbursementId | Automation | `runAutomationsForEvent(orgId, "reimbursement.approved"\|"reimbursement.rejected", {...})` | `status === APPROVED \|\| REJECTED` | `AutomationService` | UNMIGRATED (status PATCH not ported) |
| PATCH /hr/payrolls/:payrollId/approve | Email | `sendPayrollApprovedEmail(emp.email, month, approver)` | after status → `APPROVED`, emp has email | `EmailService.sendPayrollApprovedEmail` | UNMIGRATED |
| PATCH /hr/payrolls/:payrollId/paid | Email + PDF | `generatePayslipPdf(...)` + `sendEmail({attachments:[pdf]})` | status `APPROVED` → `PAID`, emp has email | `EmailService.sendEmail` — **partially blocked**: backend only has `renderPayslipHtml`; payslip PDF generator + email template not ported | UNMIGRATED |

### onboarding
Backend file: `backend/src/modules/onboarding/onboarding.service.ts`

| Route | Integration | Frontend call | Trigger | Service to inject | Status |
|---|---|---|---|---|---|
| POST /hr/onboarding/reminders | Email | `sendEmail({subject:"Onboarding Reminder — Pending Tasks", ...})` per incomplete user (+ in-app notif) | each user with pending tasks | `EmailService.sendEmail` + `NotificationsService` | UNMIGRATED |
| PATCH /onboarding/tasks/:taskId | Email | `sendOnboardingCompleteEmployeeEmail(emp.email, ...)` | last pending task → all COMPLETED | `EmailService.sendOnboardingCompleteEmployeeEmail` | UNMIGRATED |
| PATCH /onboarding/tasks/:taskId | Email | `sendOnboardingCompleteHrEmail(hr.email, ...)` per HR member | last pending task → all COMPLETED | `EmailService.sendOnboardingCompleteHrEmail` | UNMIGRATED |

### hr-recruitment
Backend files: `backend/src/modules/hr-recruitment/recruitment-candidates.service.ts`, `recruitment-candidate-ops.service.ts`, `recruitment-candidate-records.service.ts`, `recruitment-offers.service.ts`

| Route | Integration | Frontend call | Trigger | Service to inject | Status |
|---|---|---|---|---|---|
| PATCH /hr/recruitment/candidates/:id/stage | Email | `getCandidateRejectionEmail(...)` + `sendEmail(...)` | `newStage === "REJECTED"` AND email | `EmailService.sendEmail` (port rejection template) | PARTIAL |
| PATCH /hr/recruitment/candidates/:id/stage | Automation | `runAutomationsForEvent(orgId, "candidate.stage_changed", {...})` | every stage change | `AutomationService` | PARTIAL |
| PATCH /hr/recruitment/candidates/:id | Email | `getCandidateRejectionEmail(...)` + `sendEmail(...)` | `status` → `REJECTED` (was not) AND email | `EmailService.sendEmail` | PARTIAL |
| POST /hr/recruitment/candidates/:id/applications | Automation | `runAutomationsForEvent(orgId, "candidate.application_created", {...})` | after application insert | `AutomationService` | PARTIAL |
| POST /hr/recruitment/candidates/bulk-reject | Email | `getCandidateRejectionEmail(...)` + `sendEmail(...)` per candidate | `sendRejectionEmail` true AND email (backend hardcodes `emailsSent:0`) | `EmailService.sendEmail` | PARTIAL |
| PATCH /hr/recruitment/candidates/:id/bgv-status | Automation | `runAutomationsForEvent(orgId, "candidate.bgv_status_changed", {...})` | after bgv update | `AutomationService` | PARTIAL |
| PATCH /hr/recruitment/candidates/:id/offers/:offerId | Automation | `runAutomationsForEvent(orgId, "offer.sent"\|"offer.accepted"\|"offer.rejected", {...})` | offer status → SENT(new)/ACCEPTED/DECLINED | `AutomationService` | PARTIAL |
| POST /hr/recruitment/candidates/:id/rollout-documents | Email | `sendEmail({subject:"Your Documents Are Ready…", ...})` | `sendEmail` && generated docs > 0 | `EmailService.sendEmail` | PARTIAL (multi-template path UNMIGRATED) |
| POST /hr/recruitment/candidates/:id/rollout-documents | Inngest | `inngest.send({name:"hr/offer.deadline.reminder", ts})` | `acceptanceDeadline` set AND > now | **GAP** | PARTIAL |
| POST /hr/recruitment/candidates/:id/rollout-documents | E-sign | `createSigningRequest({...})` (Documenso) | per generated doc | **GAP** — no backend esign | PARTIAL |
| POST /hr/recruitment/messages | Email | `sendEmail({to:candidate.email, ...})` | `channel === "EMAIL"` | `EmailService.sendEmail` | UNMIGRATED |
| POST /hr/recruitment/candidates/:id/ai-score | AI | `generateText({model:google("gemini-2.0-flash")})` → writes `aiScore`/`aiScoreBreakdown` | always (HR) | `modules/ai` HR scoring (verify class) | UNMIGRATED |

### hr-interviews  (all UNMIGRATED — no insert/schedule/submit handlers ported)
Backend files: `backend/src/modules/hr-interviews/hr-interviews.service.ts`, `hr-scorecards.service.ts` (list/SLA/analytics only)

| Route | Integration | Frontend call | Trigger | Service to inject | Status |
|---|---|---|---|---|---|
| POST /hr/recruitment/interviews | Google Calendar | `createCalendarEvent(interviewerId, {...})` | `interviewerId` present | `GoogleCalendarService.pushInterviewEvent` | UNMIGRATED |
| POST /hr/recruitment/interviews | Automation | `runAutomationsForEvent(orgId, "interview.scheduled", {...})` | after insert | `AutomationService` | UNMIGRATED |
| POST /hr/recruitment/interviews/schedule | Google Calendar | inline Google Calendar `events` POST via `googleRefreshToken` | organizer has token | `GoogleCalendarService.pushInterviewEvent` | UNMIGRATED |
| POST /hr/recruitment/interviews/schedule | Email | `getInterviewInviteEmail(...)` + `sendEmail(...)` to interviewers + candidate | `notifyChannels.email` (default true) | `EmailService.sendEmail` (port interview-invite template) | UNMIGRATED |
| POST /hr/recruitment/interviews/schedule | WhatsApp/SMS | `sendWhatsAppWithSmsFallback(candidate.phone, body)` | `notifyChannels.whatsapp && phone` | `EmailService.sendWhatsAppWithSmsFallback` | UNMIGRATED |
| POST /hr/recruitment/interviews/schedule | Automation | `runAutomationsForEvent(orgId, "interview.scheduled", {...})` | after insert | `AutomationService` | UNMIGRATED |
| POST /hr/recruitment/interviews/self-schedule | Email | `sendEmail({subject:"Schedule Your Interview…", ...})` | candidate has email | `EmailService.sendEmail` (booking-link template) | UNMIGRATED |
| PATCH /hr/recruitment/interviews/:interviewId | Automation | `runAutomationsForEvent(orgId, "interview.completed", {...})` | `result !== "PENDING"` and changed | `AutomationService` | UNMIGRATED |
| PATCH /hr/recruitment/interviews/:interviewId | Inngest | `inngest.send({name:"hr/interview.no_show", ...})` | `result === "NO_SHOW"` and changed | **GAP** | UNMIGRATED |
| POST /hr/recruitment/interviews/:interviewId/scorecard | Inngest | `inngest.send({name:"hr/interview.scorecard.submitted", ...})` → drives `candidate-feedback-email` | on every submit | **GAP** (candidate-feedback-email lost) | UNMIGRATED |
| POST /hr/recruitment/interviews/:interviewId/scorecard | Automation | `runAutomationsForEvent(orgId, "scorecard.submitted", {...})` | on every submit | `AutomationService` | UNMIGRATED |
| POST /public/interview-booking/:token | Email | `sendEmail({subject:"Interview Self-Scheduled…", to:creator.email})` | booking succeeds AND creator email | `EmailService.sendEmail` (fire AFTER the booking transaction commits) | UNMIGRATED |

### hr-performance  (UNMIGRATED — no create-review / create-cycle handler)
Backend files: `backend/src/modules/hr-performance/performance.controller.ts`, `performance-reviews.service.ts`

| Route | Integration | Frontend call | Trigger | Service to inject | Status |
|---|---|---|---|---|---|
| POST /hr/performance/reviews | Email | `sendReviewAssignedEmail(emp.email, reviewer, periodStart, periodEnd)` | employee has email | `EmailService.sendReviewAssignedEmail` (template already ported) | UNMIGRATED |
| POST /hr/performance/cycles | Automation | `runAutomationsForEvent(orgId, "performance.review_cycle_started", {...})` | after cycle insert | `AutomationService` | UNMIGRATED |

### expenses  (UNMIGRATED — `expenses.controller.ts` has GET×4 + DELETE only)
Backend file: `backend/src/modules/expenses/expenses.service.ts`

| Route | Integration | Frontend call | Trigger | Service to inject | Status |
|---|---|---|---|---|---|
| POST /hr/expenses | Email | `sendExpenseSubmittedEmail(hr.email, ...)` per HR member | submitter non-admin (`!isAdminRole`) | `EmailService.sendExpenseSubmittedEmail` | UNMIGRATED |
| POST /hr/expenses | Automation | `runAutomationsForEvent(orgId, "expense.submitted", {...})` | submitter non-admin | `AutomationService` | UNMIGRATED |
| PATCH /hr/expenses/:expenseId | Email | `sendExpenseApprovedEmail(emp.email, ...)` | PENDING → APPROVED; owner has email | `EmailService.sendExpenseApprovedEmail` | UNMIGRATED |
| PATCH /hr/expenses/:expenseId | Email | `sendExpenseRejectedEmail(emp.email, ..., reason)` | PENDING → REJECTED; owner has email | `EmailService.sendExpenseRejectedEmail` | UNMIGRATED |
| PATCH /hr/expenses/:expenseId | Email | `sendExpensePaidEmail(emp.email, ...)` | PENDING → PAID; owner has email | `EmailService.sendExpensePaidEmail` | UNMIGRATED |

### hr-config  (holidays)
Backend file: `backend/src/modules/hr-config/hr-holidays.service.ts` (controller has calendar/PATCH/DELETE; no `@Post` create)

| Route | Integration | Frontend call | Trigger | Service to inject | Status |
|---|---|---|---|---|---|
| POST /hr/holidays | Email (bulk) | `sendBulkHolidayAnnouncement(emails, name, date, message)` | after insert; all active org members with email | `EmailService.sendBulkHolidayAnnouncement` | UNMIGRATED |

### organization
Backend file: `backend/src/modules/organization/organization.controller.ts` (members GET/DELETE only; no member-invite `@Post`)

| Route | Integration | Frontend call | Trigger | Service to inject | Status |
|---|---|---|---|---|---|
| POST /organization/members | Email | `sendInvitationEmail(email, token, orgName)` | after invitation row insert (awaited) | `EmailService.sendInvitationEmail` | UNMIGRATED |

> Already covered (do NOT re-add): `POST /organization/invitations/resend` is ported in `email/controllers/organization-invitations.controller.ts`.

---

## 3. Ordering / coupling notes

- **Email infra is ready and `@Global`.** For every Email row, inject `EmailService` directly (no module import). All per-event templates + Twilio senders are already ported — the only missing piece per row is the call site (and for recruitment rejection / interview-invite / booking-link, porting a few HTML templates that still live in frontend `lib/email-templates/hr.ts`).

- **Two backend gaps block ~10 rows:**
  1. **Inngest async jobs (6)** — `hr/resignation.submitted`, `hr/resignation.ceo_approved`, `hr/employee.onboarded`, `hr/offer.deadline.reminder`, `hr/interview.no_show`, `hr/interview.scorecard.submitted`. No NestJS queue/dispatch equivalent. The last drives `candidate-feedback-email`.
  2. **Outbound `dispatchWebhook` (4)** — `deal.won`, `lead.created`, `leave.approved`, `employee.hired`. Needs a **public** event-dispatch method (separate from the private automation-rules webhook delivery).

- **Fire-and-forget timing.** Almost every dropped side-effect was post-commit fire-and-forget in the frontend (`void (async()=>…)().catch()`); re-enable them **after the primary DB write/transaction commits** and swallow failures, to preserve current semantics. Exceptions that are intentionally **awaited/blocking**: `maybeCreateNegotiationChannel` (deals — runs before the deal UPDATE), `generateSmartNotification` (leads assign — its output is the notification body, keep the static fallback), `sendInvitationEmail` (organization — awaited), `recruitment/messages` email (frontend hard-fails on send error).

- **State-transition guards.** Many triggers depend on *previous* state, not request shape — re-read prior state in the same handler: payroll-paid requires `status === APPROVED`; expense emails require prior `PENDING`; asset email requires `assignedTo` actually changed; deal email/automation need `previousStage`; offer `offer.sent` must be gated on not-already-SENT (idempotency).

- **Trigger-enum parity.** `automationTriggerEnum` already contains the leave/resignation/onboarding/employee/reimbursement/candidate/offer/interview/scorecard/performance/expense triggers, so injecting `AutomationService` needs only module wiring — but the backend runner queries `automationRules` (a different table than the frontend engine), so reconcile the payload contract per trigger.

- **Sequenced dependencies to preserve:** interview row + `meetingLink` must persist before the calendar event references it (or use `GoogleCalendarService.createMeet` → persist link → sync event); public interview-booking claims the slot inside a transaction, email only after commit; termination `complete` depends on a prior `send-email` having set status `SENT`; resignation CEO approval splits email (PATCH route) from automation/inngest (ceo-review route) — consolidate into one backend `ceoReview` to avoid double/missing dispatch.

- **Module wiring quick-reference:** `EmailModule` is `@Global` (inject `EmailService` anywhere). `AutomationModule` exports `AutomationService` — add to `imports` of: leads, deals, hr-time, hr-lifecycle, hr-directory, hr-payroll, onboarding, hr-recruitment, hr-interviews, hr-performance, expenses. `RealtimeModule` exports `AblyService`/`WebPushService` — add to `imports` of: chat. `GoogleCalendarModule` — add to `imports` of: hr-interviews.
