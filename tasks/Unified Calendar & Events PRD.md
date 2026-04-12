**PRODUCT REQUIREMENTS DOCUMENT**

**Unified Calendar & Events**

**Project: Vaivamm Capital CRM — Calendar Module Version: 1.0 Date: April 11, 2026 Author: Tarun (Product Owner) Status: Draft**

**Table of Contents**

1. **Overview & Objective**  
2. **Current Flow Analysis**  
3. **Proposed Enhanced Flow**  
4. **Feature Specifications**  
5. **Database Schema Changes**  
6. **API Endpoints**  
7. **UI/UX Wireframe Descriptions**  
8. **Roles & Permissions**  
9. **Edge Cases & Error Handling**  
10. **Technical Implementation Notes**  
11. **Success Metrics**  
12. **Timeline & Milestones**

---

**1\. Overview & Objective**

**1.1 Background**

**Employees currently struggle to visualize overlapping timelines across different modules (e.g., HR Leaves vs. Project Due Dates). The calendar directory exists to serve as a unified aggregation layer.**

**1.2 Objective**

**Provide a single master Calendar within the CRM that aggregates Events, Project Milestones, Interviews, and Approved PTO (Leaves) so staff can schedule effectively without conflicts.**

**2\. Current Flow Analysis**

**2.1 Current Process**

**Users switch between Outlook/Google Calendar for meetings, HR docs for leaves, and Project boards for deadlines.**

**3\. Proposed Enhanced Flow**

**3.1 Aggregated View**

**The unified calendar pulls data dynamically from deals, projects, hr\_leaves, and manual events. Users can toggle these source "Layers" on and off (like Google Calendar).**

**4\. Feature Specifications**

**4.1 Filterable Layers**

**Color-coded toggles:**

* **🔵 Meetings (Standard Events)**  
* **🔴 Project Output (Task due dates)**  
* **🟢 HR Out of Office (Approved leaves)**  
* **🟠 Recruitment (Scheduled Interviews)**

**4.2 Meeting Scheduling & Invites**

**Ability to create an ad-hoc meeting natively. Select attendees via the internal directory. Sends them an in-app notification and an email with an .ics attachment.**

**5\. Database Schema Changes**

**5.1 New Tables**

**events**

| Column | Type | Description |
| :---- | :---- | :---- |
| **id** | **serial** | **PK** |
| **title** | **text** | **Name of meeting/event** |
| **description** | **text** | **Details or meeting links** |
| **startTime** | **timestamp** | **Date & time** |
| **endTime** | **timestamp** | **Date & time** |
| **createdBy** | **text (FK)** | **Reference to users** |

**event\_attendees**

| Column | Type | Description |
| :---- | :---- | :---- |
| **eventId** | **int (FK)** | **Reference** |
| **userId** | **text (FK)** | **Invited employee** |
| **rsvp** | **enum** | **ATTENDING, DECLINED, MAYBE** |

**6\. API Endpoints**

| Method | Endpoint | Description | Auth |
| :---- | :---- | :---- | :---- |
| **GET** | **/api/calendar/events** | **Multi-source fetch mapping all dates to frontend events format** | **Employee** |
| **POST** | **/api/calendar/events** | **Create a manual meeting** | **Employee** |
| **PUT** | **/api/calendar/events/\[id\]/rsvp** | **Accept/Decline** | **Attendee** |

**7\. UI/UX Wireframe Descriptions**

* **Full Calendar View: Standard Month/Week/Day grid layout (using components like react-big-calendar or FullCalendar.io).**  
* **Creation Modal: Pop-up when clicking a time slot. Allows title, location/URL, adding guests, and setting recurrence rules.**

**8\. Roles & Permissions**

| Permission | Admin | Manager | Employee |
| :---- | :---- | :---- | :---- |
| **View Company Calendar** | **✓** | **✓** | **✓** |
| **Create Org-Wide Event** | **✓** | **✘** | **✘** |
| **Book Meeting** | **✓** | **✓** | **✓** |

**9\. Edge Cases & Error Handling**

* **Double Booking Alert: If a user tries to schedule a meeting with someone who has an "Approved Leave" block on that date, the UI immediately warns: *"Alex is marked OOO on this date."***

**10\. Technical Implementation Notes**

* **The /api/calendar/events GET request should act as a proxy aggregator, running UNION queries or Promise.all across the tasks, leaves, and events tables before returning normalized JSON to the client.**

**11\. Success Metrics**

* **95% reduction in internal meeting conflicts relative to known PTO days.**

**12\. Timeline & Milestones**

* **Phase 1: events DB creation (2 days)**  
* **Phase 2: Multi-source aggregation endpoint (4 days)**  
* **Phase 3: React Calendar library integration (1 Week)**  
* **Estimated Total: \~2 Weeks**

 


---

## Status: ✅ COMPLETE

## Checklist

### Database
- [x] `calendar_events` — `id, orgId, title, description, startTime, endTime, createdBy, location`
- [x] `calendar_events.location` — migration 0022
- [x] `event_attendees` table — `drizzle/0059_event_attendees.sql` — `eventId, userId, status, createdAt`
- [x] `calendar_events.meetLink` — Google Meet URL field exists

### API
- [x] `GET /api/calendar` — calendar events
- [x] `POST /api/calendar` — create event
- [x] `POST /api/calendar/create-meet` — create Google Meet link
- [x] `GET /api/integrations/google/auth` + `/callback` — Google OAuth for calendar
- [x] `POST /api/calendar/events/[eventId]/rsvp` — RSVP (accept/decline/tentative); GET returns attendees
- [x] `GET /api/calendar/export` — `.ics` bulk export with date range (RFC 5545)
- [x] `useEventAttendees` + `useRsvpCalendarEvent` hooks in `lib/api/hooks/calendar.ts`

### Frontend
- [x] `app/(dashboard)/calendar/page.tsx` — calendar page
- [x] Export dropdown (This month / Next 3 months / This year) → downloads `.ics`
- [x] RSVP buttons (Accept / Maybe / Decline) in event detail sheet
- [x] Attendee list with RSVP status in event detail sheet
- [x] `features/calendar/event-detail-sheet.tsx` — full detail with RSVP + attendees

### Verification
- [x] `pnpm tsc --noEmit` — zero errors
- [x] `pnpm db:migrate` — migration 0059 applied
- [x] `pnpm build` passes

### New Features (Extended)
- [ ] **Room/resource booking** — book meeting rooms with capacity; conflict detection
- [ ] **Outlook/Microsoft 365 sync** — OAuth Microsoft Graph API integration
- [ ] **Recurring events** — daily/weekly/monthly/yearly repeat with end conditions
- [x] **Meeting agenda** — `agenda` column on `calendar_events`; passed through POST/PUT API; migration 0085
- [x] **Post-meeting notes** — `post_meeting_notes` column; PATCH event after meeting ends; linked to deal/lead via `linkedDealId`/`linkedLeadId`
- [ ] **Availability view** — "Find a time": show free/busy grid for multiple attendees
- [ ] **Team calendar view** — overlay all team members' OOO + events in one view
- [ ] **External invite link** — share booking link (like Calendly); external person picks a slot
- [x] **Event reminders** — Inngest cron every 15min; sends in-app notification to creator + attendees; `reminder_15min_sent` flag prevents duplicates

### Verification
- [x] OOO conflict detected and warned when creating event with OOO attendee
- [ ] Google Meet link generated and stored in event
- [ ] `.ics` file opens correctly in Google Calendar / Outlook
- [x] Calendar aggregates from all 4 sources (events, leaves, tasks, interviews)
- [ ] `pnpm build` passes

---

## Implementation Plan

### Phase 1 — Aggregation Endpoint (3 days)
1. `event_attendees` table migration
2. `GET /api/calendar/events` — Promise.all across: `calendar_events`, `leave_requests (APPROVED)`, `tickets (dueDate)`, `interviews (scheduledAt)`; normalize to `CalendarEvent` shape
3. OOO conflict check: compare attendee's approved leaves against event date

### Phase 2 — Calendar UI (4 days)
1. Integrate `react-big-calendar` or `FullCalendar`
2. Layer toggles (localStorage state): toggle meeting/leave/task/interview layers
3. Create event modal with Google Meet button + attendee picker
4. RSVP actions: `PUT /api/calendar/events/[eventId]/rsvp`

### Phase 3 — Google Calendar Sync (3 days)
1. Already have OAuth tokens in `users.googleRefreshToken`
2. On event create → push to Google Calendar via Google Calendar API
3. Background sync: Inngest cron every 30 min → pull Google events → upsert in `calendar_events`
4. Two-way: Google webhook subscription for real-time push updates

### Phase 4 — Advanced (3 days)
1. Recurring events: parse RRULE on frontend with `rrule` npm package; expand for display
2. `.ics` export: `lib/utils/ics-generator.ts` using `ical-generator`
3. Availability grid: query each attendee's events + leaves for the week; render free/busy grid
