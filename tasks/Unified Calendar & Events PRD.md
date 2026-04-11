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

## Status: IN PROGRESS

## Checklist

### Database
- [x] `calendar_events` — `id, orgId, title, description, startTime, endTime, createdBy, location`
- [x] `calendar_events.location` — added in migration 0022
- [ ] `event_attendees` table — `eventId, userId, rsvp (ATTENDING/DECLINED/MAYBE)`
- [ ] `calendar_events.recurrenceRule` — iCal RRULE string for repeating events
- [ ] `calendar_events.googleEventId` — for two-way Google Calendar sync
- [ ] `calendar_events.meetLink` — Google Meet URL
- [ ] `calendar_events.type` — enum: MEETING / INTERVIEW / PROJECT_MILESTONE / HOLIDAY / OOO

### API
- [x] `GET /api/calendar` — calendar events
- [x] `POST /api/calendar` — create event
- [x] `POST /api/calendar/create-meet` — create Google Meet link
- [x] `GET /api/integrations/google/auth` — Google OAuth for calendar
- [x] `GET /api/integrations/google/callback` — Google OAuth callback
- [ ] `GET /api/calendar/events` — multi-source aggregation: manual events + leave OOO + project task due dates + interviews
- [ ] `PUT /api/calendar/events/[eventId]/rsvp` — attendee RSVP
- [ ] `DELETE /api/calendar/events/[eventId]` — delete event (check organizer)
- [ ] `GET /api/calendar/events/[eventId]/ics` — download `.ics` file for external calendar
- [ ] `POST /api/calendar/events/[eventId]/attendees` — add attendee + send notification
- [ ] OOO conflict detection: on event creation, check if any attendee has approved leave on that date → warn
- [ ] Two-way Google Calendar sync: push created events to Google; pull Google events to calendar view
- [ ] `.ics` email attachment when creating meeting with attendees

### Frontend
- [x] `app/(dashboard)/calendar/page.tsx` — calendar page
- [ ] Full calendar UI using `react-big-calendar` or `FullCalendar` — Month/Week/Day views
- [ ] Color-coded layer toggles: 🔵 Meetings, 🔴 Project Milestones, 🟢 OOO Leaves, 🟠 Interviews
- [ ] Click time slot → create event modal
- [ ] Event creation modal: Title, Location/URL, Date+Time, Attendees picker, Recurrence, Meet link
- [ ] OOO conflict warning: "Alex is on leave on this date" inline alert in attendee picker
- [ ] RSVP buttons: Accept / Decline / Maybe on event detail
- [ ] Google Calendar sync toggle in settings: connect/disconnect Google account
- [ ] Google Meet button: auto-generate Meet link on event creation
- [ ] Export event as `.ics` download
- [ ] Attendee list on event detail with RSVP status per person
- [ ] Today indicator pill; navigate to today button
- [ ] Mini calendar picker in sidebar for quick date navigation
- [ ] Holiday display: `holidays` table events shown as full-day non-blocking events

### New Features (Extended)
- [ ] **Room/resource booking** — book meeting rooms with capacity; conflict detection
- [ ] **Outlook/Microsoft 365 sync** — OAuth Microsoft Graph API integration
- [ ] **Recurring events** — daily/weekly/monthly/yearly repeat with end conditions
- [ ] **Meeting agenda** — attach agenda notes to event; visible to all attendees
- [ ] **Post-meeting notes** — fill in meeting notes after event ends; linked to CRM deal/lead
- [ ] **Availability view** — "Find a time": show free/busy grid for multiple attendees
- [ ] **Team calendar view** — overlay all team members' OOO + events in one view
- [ ] **External invite link** — share booking link (like Calendly); external person picks a slot
- [ ] **Event reminders** — push notification 15 min before event start

### Verification
- [ ] OOO conflict detected and warned when creating event with OOO attendee
- [ ] Google Meet link generated and stored in event
- [ ] `.ics` file opens correctly in Google Calendar / Outlook
- [ ] Calendar aggregates from all 4 sources (events, leaves, tasks, interviews)
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
