**\*\*PRODUCT REQUIREMENTS DOCUMENT\*\***

Automated Interview Coordination & SLA Tracking

**\*\*Project:\*\*** Vaivamm Capital CRM  
**\*\*Version:\*\*** 1.0  
**\*\*Date:\*\*** April 11, 2026  
**\*\*Author:\*\*** Tarun (Product Owner)  
**\*\*Status:\*\*** Draft

**\# 1\. Overview & Objective**  
Automate the coordination of interviews utilizing calendar syncs and omni-channel notifications (SMS/WhatsApp/Email) while strictly tracking recruitment SLAs.

**\# 2\. Current Flow Analysis**  
Manual email drafting to candidates to schedule interviews and notify them of outcomes.

**\# 3\. Proposed Enhanced Flow**  
System auto-generates invites bridging Google/Outlook calendars. Auto-reminders dispatch to candidates via local channels (WhatsApp/SMS). Rejections are handled gracefully via automated email templates.

**\# 4\. Feature Specifications**  
\- Google Workspace & Outlook Microsoft Graph Sync.  
\- Omni-channel Notifications (Email, SMS, WhatsApp API).  
\- Automated Rejection Mail Templates.  
\- Recruitment Stage SLA timers (e.g., Review within 48 hrs).

**\# 5\. Database Schema Changes**  
\`interview\_schedules\` tied to \`calendar\_sync\_tokens\`.  
\`slas\` tracking table.

**\# 6\. API Endpoints**  
\- \`POST /api/notifications/dispatch\`  
\- \`GET /api/interviews/slas\`

**\# 7\. UI/UX Wireframe Descriptions**  
A toggle on the ATS stage "Schedule Interview" that reveals WhatsApp/Email checkboxes. A red/amber/green indicator next to candidate cards showing SLA compliance status.

**\# 8\. Roles & Permissions**  
HR coordinates schedules. Interviewers only sync their calendars to provide "Available Blocks".

**\# 9\. Edge Cases & Error Handling**  
Handling candidates who don't have WhatsApp accounts gracefully by falling back to standard SMS and Email.

**\# 10\. Technical Implementation Notes**  
Integrate Twilio for SMS/WhatsApp. Use Cron jobs every 15 minutes to evaluate if a candidate has breached an SLA limit in their current stage to alert HR.

**\# 11\. Success Metrics**  
\- No shows reduced by 50% via automated WhatsApp reminders.

**\# 12\. Timeline & Milestones**  
Calendar APIs: 1.5 weeks; Notifications API: 1 week. Total \~2.5 weeks.


---

## Status: COMPLETE

## Checklist

### Database
- [x] `interviews` table — `id, candidateId, scheduledAt, interviewers, format, status`
- [x] `calendar_events` — events linked to interviews
- [x] `interview_schedules.calendarSyncToken` — Google/Outlook sync token per interview
- [x] `interview_slas` table — `jobPostingId, stage, maxHours, warningHours` — in `lib/db/schema/hr.ts`
- [x] `candidate_sla_tracking` — per-candidate SLA status per stage — in `lib/db/schema/hr.ts`; pipeline route uses it for SLA badge
- [x] `interviews.remindersSent` — JSONB tracking which reminders have been dispatched — `lib/db/schema/hr.ts:991`

### API
- [x] `app/api/hr/recruitment/` — recruitment API routes
- [x] `POST /api/interviews/schedule` — create interview + create calendar_event + send notifications to interviewer + candidate — `app/api/hr/recruitment/interviews/schedule/route.ts`
- [x] `GET /api/interviews/slas` — SLA config per stage — `app/api/hr/recruitment/interviews/slas/route.ts`; also supports PUT to upsert
- [x] `POST /api/notifications/dispatch` — omni-channel: Email + WhatsApp + SMS with fallback — `app/api/notifications/dispatch/route.ts`; uses `lib/twilio.ts` (graceful skip if Twilio not configured)
- [x] `PATCH /api/candidates/[candidateId]/sla` — reset/update SLA timer on stage change — `app/api/hr/recruitment/candidates/[candidateId]/sla/route.ts`; also called automatically in stage route
- [x] Inngest cron every 15 min: check `candidate_sla_tracking` for breaches → alert HR — `lib/inngest/functions/interview-sla-check.ts` runs `*/15 * * * *`, updates AT_RISK/BREACHED status, sends in-app notifications via `notifyByRoles`
- [x] Inngest: 24h before interview → send reminder to candidate + interviewer (Email) — `lib/inngest/functions/interview-reminders.ts` runs hourly, sends to candidate + interviewer; marks `remindersSent["24h"]=true` for idempotency
- [x] Inngest: on no-show → update interview status → create follow-up task — `lib/inngest/functions/interview-no-show.ts` triggered by `hr/interview.no_show` event fired from interview PATCH route when result=NO_SHOW; creates follow-up CALL task + notifies HR
- [x] Automated rejection email: on stage change to REJECTED → send template email via `lib/email-templates/hr.ts` — fully implemented in `app/api/hr/recruitment/candidates/[candidateId]/stage/route.ts`; uses `getCandidateRejectionEmail`
- [x] Google Calendar sync for interview events (using existing Google OAuth tokens) — auto-syncs in `schedule/route.ts` if user has `googleRefreshToken`

### Frontend
- [x] `app/(dashboard)/hr/recruitment/interviews/page.tsx` — interviews list
- [x] "Schedule Interview" button on candidate card/detail → modal: date/time, multi-interviewer picker, format (Video/Phone/In-Person) — updated `app/(dashboard)/hr/recruitment/interviews/page.tsx`; uses `useScheduleInterview` hook calling `/schedule` endpoint
- [x] Notification channel selection: Email ✓ / WhatsApp ○ toggles in schedule modal
- [x] SLA compliance badge on candidate card: 🟢 On Track / 🟡 At Risk / 🔴 Breached — `SlaBadge` component in `components/hr/recruitment/pipeline-kanban.tsx`; `slaStatus` field on `AtsPipelineCandidate` populated from `candidateSlaTracking` in pipeline API
- [x] SLA configuration page: `/hr/recruitment/sla` — set SLA warning + max hours per stage — `app/(dashboard)/hr/recruitment/sla/page.tsx`; sidebar link added
- [x] Interview calendar view: month/week showing all scheduled interviews — view toggle (List/Calendar) + `BigCalendarWrapper` in `app/(dashboard)/hr/recruitment/interviews/page.tsx`; month + week views with interview events colored by result
- [x] Interviewer availability picker: show free/busy based on their calendar_events — `GET /api/hr/recruitment/interviewers/availability` + `InterviewerAvailabilityGrid` component in schedule sheet
- [x] Interview outcome: "Complete Interview" → opens scorecard inline — "Scorecard" toggle button on each interview row in candidate detail → expands `ScorecardForm` inline
- [x] Bulk reschedule: select multiple interviews → change date — checkbox column in interviews list; bulk actions bar with datetime-local picker → `useBulkRescheduleInterviews` calls PATCH in parallel

### New Features (Extended)
- [x] **WhatsApp reminder** — Twilio WhatsApp API; `lib/twilio.ts` has `sendWhatsApp()` + graceful skip if TWILIO_* env not set
- [x] **SMS fallback** — `sendWhatsAppWithSmsFallback()` in `lib/twilio.ts` auto-falls back to SMS if WhatsApp fails
- [x] **Candidate self-scheduling** — send a link; candidate picks from available slots — `POST /api/hr/recruitment/interviews/self-schedule` generates booking link; public page at `/interview-booking/[token]` lets candidate pick; DB table `interview_booking_links`
- [x] **Panel interview** — multiple interviewers in one round; coordinated scheduling — `panelInterviewerIds` JSONB column on `interviews`; schedule route stores all interviewers; calendar event includes all panel members; Panel badge in UI
- [x] **Interview prep email** — auto-send "What to expect" email 2h before interview
- [x] **No-show follow-up** — automatic reschedule offer email if candidate marked no-show
- [x] **SLA reporting** — `GET /api/hr/recruitment/interviews/sla-report` + `/hr/recruitment/sla-report` page — bar chart + summary cards + monthly table (6 months, per stage)

### Verification
- [x] Interview creation sends in-app notifications + emails to all interviewers and candidate — `schedule/route.ts` uses `getInterviewInviteEmail` for both roles; WhatsApp via `sendWhatsAppWithSmsFallback` if notifyChannels.whatsapp=true and candidate has phone
- [x] SLA breach detected by Inngest cron within 15 min of breach — `interview-sla-check.ts` runs `*/15 * * * *`
- [x] Rejection email sent on stage change to REJECTED — stage route fires non-blocking email
- [x] WhatsApp/SMS sends (or gracefully skips if not configured) — `lib/twilio.ts` checks TWILIO_* env vars before attempting; returns `{ sent: false, reason: "not_configured" }` if missing
- [x] `pnpm build` passes

---

## Implementation Plan

### Phase 1 — Interview Scheduling (3 days)
1. Migration: `interview_slas`, `candidate_sla_tracking` tables
2. `POST /api/interviews/schedule` — create interview + calendar event + notifications
3. Schedule modal UI: date-time picker, multi-interviewer selector, Google Meet toggle
4. Email notification to candidate + interviewer using `lib/email-templates/hr.ts`

### Phase 2 — SLA Engine (3 days)
1. SLA config page: `/hr/recruitment/sla` — set thresholds per stage
2. Inngest `sla-check` (already exists) — enhance to track `candidate_sla_tracking`
3. Stage change hook: reset SLA timer in `candidate_sla_tracking`
4. HR alert: Inngest sends in-app + email notification on breach

### Phase 3 — Omni-channel Notifications (3 days)
1. Twilio integration: `lib/twilio.ts` with SMS + WhatsApp send functions
2. Channel selection UI: per-notification checkboxes (Email/WhatsApp/SMS)
3. Fallback logic: if WhatsApp fails → SMS; if SMS fails → Email only
4. Reminder Inngest job: 24h before `scheduledAt` → send reminders

### Phase 4 — Advanced (2 days)
1. Candidate self-scheduling: generate one-time booking link; availability from interviewer's calendar
2. Panel interview: `interview_panel_members` table; coordinate all scheduledAt + calendar blocks
