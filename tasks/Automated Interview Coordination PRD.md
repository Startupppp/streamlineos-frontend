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

## Status: IN PROGRESS

## Checklist

### Database
- [x] `interviews` table — `id, candidateId, scheduledAt, interviewers, format, status`
- [x] `calendar_events` — events linked to interviews
- [ ] `interview_schedules.calendarSyncToken` — Google/Outlook sync token per interview
- [ ] `interview_slas` table — `jobPostingId, stage, maxHours, warningHours`
- [ ] `candidate_sla_tracking` — per-candidate SLA status per stage: `enteredAt, breachedAt, status (ON_TRACK/AT_RISK/BREACHED)`
- [ ] `interviews.remindersSent` — JSONB tracking which reminders have been dispatched

### API
- [x] `app/api/hr/recruitment/` — recruitment API routes
- [ ] `POST /api/interviews/schedule` — create interview + create calendar_event + send notifications to interviewer + candidate
- [ ] `GET /api/interviews/slas` — SLA compliance per job/stage
- [ ] `POST /api/notifications/dispatch` — omni-channel: Email + (optionally) WhatsApp + SMS
- [ ] `PATCH /api/candidates/[candidateId]/sla` — reset/update SLA timer on stage change
- [ ] Inngest cron every 15 min: check `candidate_sla_tracking` for breaches → alert HR
- [ ] Inngest: 24h before interview → send reminder to candidate + interviewer (Email + WhatsApp)
- [ ] Inngest: on no-show → update interview status → create follow-up task
- [ ] Automated rejection email: on stage change to REJECTED → send template email via `lib/email-templates/hr.ts`
- [ ] Google Calendar sync for interview events (using existing Google OAuth tokens)

### Frontend
- [x] `app/(dashboard)/hr/recruitment/interviews/page.tsx` — interviews list
- [ ] "Schedule Interview" button on candidate card/detail → modal: date/time, interviewers, format (Video/Phone/In-Person), Google Meet toggle
- [ ] Notification channel selection: Email ✓ / WhatsApp ○ / SMS ○ checkboxes
- [ ] SLA compliance badge on candidate card: 🟢 On Track / 🟡 At Risk / 🔴 Breached
- [ ] SLA configuration page: `/hr/recruitment/sla` — set SLA thresholds per stage per job type
- [ ] Interview calendar view: month/week showing all scheduled interviews
- [ ] Interviewer availability picker: show free/busy based on their calendar_events
- [ ] Interview outcome: "Complete Interview" → opens scorecard inline
- [ ] Bulk reschedule: select multiple interviews → change date

### New Features (Extended)
- [ ] **WhatsApp reminder** — Twilio WhatsApp API; send "Your interview is tomorrow at 2 PM" to candidate's phone
- [ ] **SMS fallback** — if candidate has no WhatsApp, send SMS via Twilio
- [ ] **Candidate self-scheduling** — send a link; candidate picks from available slots
- [ ] **Panel interview** — multiple interviewers in one round; coordinated scheduling
- [ ] **Interview prep email** — auto-send "What to expect" email 2h before interview
- [ ] **No-show follow-up** — automatic reschedule offer email if candidate marked no-show
- [ ] **SLA reporting** — monthly report: % candidates who breached SLA per stage

### Verification
- [ ] Interview creation sends notifications to both interviewer + candidate
- [ ] SLA breach detected by Inngest cron within 15 min of breach
- [ ] Rejection email sent on stage change to REJECTED
- [ ] WhatsApp/SMS sends (or gracefully skips if not configured)
- [ ] `pnpm build` passes

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
