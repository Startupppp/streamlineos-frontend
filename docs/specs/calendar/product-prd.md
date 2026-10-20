# StreamlineOS Calendar — Product PRD

**Status:** Canonical product contract
**Updated:** 2026-10-20
**Owner:** Product / Calendar

This document defines what Calendar must become. Completion is tracked only in [implementation-prd.md](./implementation-prd.md).

## 1. Product decision

StreamlineOS Calendar is the shared time layer for a 20–200-person company using CRM, HRM, Build, Tasks, and connected Google or Outlook calendars. It must help a person understand what is happening, find a safe time, schedule work or meetings, and act on the owning record without duplicating that record.

Calendar is not a workforce-optimization suite, simulation engine, employee scoring product, payment product, or developer platform in the current release.

**North-star outcome:** more customer, people, and delivery commitments completed on time with less coordination.

### Product principles

1. Calendar owns calendar-native events, availability composition, bookings, invitations, and reservations.
2. CRM, Build, Tasks, HRM, Inventory, and Finance own their records and business transitions.
3. A source record appears as a permission-safe projection, never as a second writable copy.
4. Unknown, stale, partial, disconnected, or permission-limited coverage is never presented as complete or free.
5. Suggestions and generated actions remain drafts until a user confirms them.
6. Everyday scheduling controls stay visible; administrative and advanced capabilities stay out of the primary calendar.

### Resolved release decisions

- The first segment is a 20–200-person cross-functional service, sales, or product company.
- Public booking uses identity or expiring purpose-bound links; customer-portal booking is deferred.
- Calendar never auto-moves source-owned dates. Any source change is a proposal confirmed and reauthorized by its owner.
- Commitment Radar is not an active surface. If promoted later, it starts with CRM, Build, and Tasks and reports incomplete source coverage.
- Meeting context is limited to organization-enabled CRM, Build, document, mail, chat, recording, or transcript sources under current permission, consent, and retention policy.
- Stale or unavailable external coverage blocks public confirmation. Internal users may draft a proposed time only with an explicit warning and save-time recheck.
- Viewers outside the attendee or source authorization boundary receive free/busy only, not title, attendee, or linked-record detail.
- Rooms and source-owned equipment are active release resources. Workforce skills and operational capacity planning remain deferred.

## 2. Competitive conclusions

Official product sources were reviewed on 2026-10-20.

- [Google Calendar](https://workspace.google.com/products/calendar/) establishes the baseline for events, shared calendars, tasks, working hours/location, focus time, attachments, booking pages, and connected Workspace context.
- [Google appointment schedules](https://support.google.com/calendar/answer/10729749) establish duration, notice, buffers, daily limits, co-hosts, intake, and multi-calendar conflict checks.
- [Microsoft Scheduling Assistant and Room Finder](https://support.microsoft.com/en-us/outlook/use-the-scheduling-assistant-and-room-finder-for-meetings-in-outlook) establish participant free/busy, working hours, room capacity/features, and suggested times.
- [Microsoft Bookings](https://learn.microsoft.com/en-us/microsoft-365/bookings/bookings-overview) establishes customer booking pages, services, staff availability, reminders, rescheduling, and cancellation.
- [Odoo Calendar](https://www.odoo.com/documentation/19.0/applications/productivity/calendar.html) and [Odoo Appointments](https://www.odoo.com/app/appointments-features) show how an integrated business suite links calendar, CRM, HR, resources, projects, and appointments without making every module a primary calendar control.
- [Zoho Bookings](https://www.zoho.com/bookings/features/) and [Zoho CRM booking](https://help.zoho.com/portal/en/kb/crm/faqs/activity-management/articles/faqs-on-calendar-booking) establish CRM-linked booking, team scheduling, resources, reminders, workflows, and reporting.
- [ClickUp Planner](https://help.clickup.com/hc/en-us/articles/29051586233879-What-is-the-Planner) establishes a useful pattern for meetings plus assigned work, task time blocking, and linked work context.
- [Motion auto-scheduling](https://www.usemotion.com/help/time-management/auto-scheduling) confirms that generic automatic task rearrangement is established competitor territory, not a unique StreamlineOS differentiator.
- Calendly, HubSpot Meetings, and Salesforce Scheduler establish advanced routing, polls, embeds, workflows, skills, territory, and resource matching. Those are later-stage capabilities, not primary-calendar requirements for this release.

**Differentiator:** a permitted CRM promise, Build milestone, task, approved leave, interview, room, and meeting can share one time surface while each owning module remains authoritative.

## 3. Feature ladder

### 3.1 Basic features

- Day, week, and month calendar views plus a responsive agenda.
- Today, previous/next period, date picker, timezone label, and stable URL state.
- Create, edit, move, resize, cancel, and delete calendar-native events.
- All-day and timed events, recurrence, occurrence edits, reminders, location, video link, description, and attachments/links.
- Typed meetings, appointments, deadlines, work blocks, shifts, absences, milestones, operational tasks, and financial obligations declare whether they block availability; a deadline does not block by default.
- Internal attendees, external guests, organizer ownership, RSVP, updates, and cancellation.
- Search, source visibility, connected calendar accounts, partial-source warnings, loading, empty, denied, and error states.
- Google and Outlook read/write status with visible reconnect and retry.
- Keyboard-operable alternatives to drag actions and usable layouts at 375, 768, and 1280 px.

### 3.2 Must-have StreamlineOS features

- One authorized projection set for Calendar, Agenda, My Day, search, export, and deep links.
- Build tickets/milestones, Tasks, HR leave/holidays/interviews/attendance/WFH, CRM-linked meetings, and connected calendars.
- Stable source identity, freshness, owner, status, permitted actions, and source deep link on every item.
- Privacy-safe free/busy and an explainable **Find a time** flow for internal participants.
- Basic personal booking pages with duration, hours, notice, buffers, daily limits, intake, cancellation, and rescheduling.
- Durable slot holds, idempotent booking confirmation, invitation receipts, and honest local/provider/delivery states.
- Revocable non-enumerable public links, rate/spam controls, operator-visible abuse state, and verified receipt retrieval.
- Meeting rooms and required resources with capacity, maintenance, approval, and commit-time revalidation.
- Role-aware My Day with meetings, due work, preparation, approvals, and incomplete-coverage warnings.
- Meeting workspace with agenda, notes, permitted CRM/Build/document context, reviewed follow-ups, and action receipts.
- “Schedule in Calendar” from CRM deals without creating a parallel CRM meeting store; Build dates remain linked projections owned by Build.
- Audit evidence, provider freshness, retries, and permission-safe history/deep links.

### 3.3 Good-to-have, deferred

- Team saved views.
- Additional Inventory and Finance commitment projections beyond source-owned equipment.
- Scheduling polls.
- Collective and round-robin team routing.
- Branded embeds, single-use links, and conversion analytics.
- ICS import and subscribe-only feeds.
- Delegation, assistant rights, shared calendars, and offboarding handover.
- Read-only offline cache.
- Booking analytics and lifecycle workflow automation.
- Waitlists and host substitution.

These capabilities may retain dormant backend support. They must not add primary UI controls until promoted through a new product decision.

### 3.4 Wow features

- Role-aware My Day that explains what needs attention and why.
- Explainable time recommendations using hours, leave, required people, buffers, rooms, and connected-calendar freshness.
- Meeting-to-outcome drafts that create confirmed CRM/Build/Task actions with per-owner receipts.
- A future commitment-impact brief that explains consequences without exposing a Radar, graph, or simulation workspace.

### 3.5 Removed from the product surface

- Capacity map and capacity toolbar action.
- Time-quality coach and employee time scoring.
- What-if schedule scenarios.
- Protected-work auto-planning.
- Commitment Radar and chain view.
- Paid appointments.
- Calendar workflow builder.
- Calendar developer credential UI.
- Advanced booking analytics in Calendar settings.
- Embedded resource approval queue inside booking pages; approvals have one dedicated route.
- Global History and saved-view authoring as primary calendar modes.

Backend APIs and persisted data for these capabilities are not deleted in this release.

## 4. Personas and jobs

- **Individual contributor:** see meetings and due work, protect realistic time, and know the next permitted action.
- **Sales/account owner:** schedule from a deal, avoid double booking, and carry customer context into the meeting.
- **Project lead:** see milestones and meetings together and open the authoritative Build record.
- **Manager/HR:** coordinate leave, interviews, attendance, and rooms without leaking sensitive details.
- **Operations/resource owner:** approve constrained room or equipment requests.
- **External guest:** choose, reschedule, cancel, and RSVP through a minimal secure experience.
- **Administrator:** configure calendar sources, governance, booking safety, and resources without cluttering the end-user calendar.

## 5. Consolidated product requirements

These IDs define product outcomes, not a second task list. Completion is tracked only by the mapped `CAL-IMP-*` items in the Implementation PRD.

- **CAL-PROD-001 — Focused everyday calendar.** Calendar exposes only Calendar, Agenda, and My Day; one source/account control; clear date navigation; and no duplicated Create or advanced planning controls.
- **CAL-PROD-002 — Complete native events.** Timed/all-day events, recurrence and exceptions, attendees, RSVP, reminders, location/video, timezone/DST, conflicts, cancellation, and export work end to end.
- **CAL-PROD-003 — Unified business sources.** Build, Tasks, HR, attendance/WFH, CRM-linked meetings, and Google/Outlook use one authorized projection and consistent filters.
- **CAL-PROD-004 — Trust and privacy.** Direct links, search, details, notifications, exports, analytics, and AI context apply identical tenant/module/object authorization and non-revealing denial.
- **CAL-PROD-005 — Find a time.** A user selects internal participants and receives ranked, privacy-safe slots with reasons; incomplete inputs never appear free and selection does not write until save.
- **CAL-PROD-006 — Booking core.** A host can publish, preview, pause, revoke, and version a basic booking page; guests receive safe slots, durable holds, one idempotent outcome, safe alternatives, secure receipts, and cancellation/reschedule controls protected by abuse limits.
- **CAL-PROD-007 — Invitations and provider truth.** Guests receive one current invitation; obsolete links, join information, and reminders fail; Google/Outlook writes expose pending, failed, repaired, and reconciled states.
- **CAL-PROD-008 — Rooms and resources.** Availability and commit enforce capacity, maintenance, location, accessibility, approval, tentative-versus-confirmed state, and resource-owner outcomes for booking and rescheduling.
- **CAL-PROD-009 — Role-aware My Day.** Items distinguish actionable work, information, preparation, and incomplete coverage while showing source, freshness, status, deep link, and next action.
- **CAL-PROD-010 — Meeting outcomes.** Context is permission/consent scoped, external sharing is explicit, generated actions remain drafts, and applied actions show owner receipts.
- **CAL-PROD-011 — CRM scheduling and Build linkage.** New CRM meetings are Calendar events linked to their source with no new duplicate CRM meeting rows; Build due dates and milestones remain projections linked to their authoritative Build records.
- **CAL-PROD-012 — Accessibility and locality.** WCAG 2.2 AA target, keyboard alternatives, locale, first day of week, 12/24-hour display, display timezone, and responsive states are verified.

## 6. Required journeys

1. Create a recurring meeting across DST, move one occurrence, invite a guest, and verify reminders/provider state.
2. Open a deal, schedule in Calendar, find a time with internal attendees, and return to the same linked meeting from CRM.
3. Open My Day and act on one meeting, one Build deadline, one approval, and one preparation item without data from denied modules.
4. Publish and revoke a booking page, withstand concurrent and abusive requests, race two guests for one slot, and prove one durable confirmation plus safe alternatives.
5. Book and reschedule a room requiring approval; show tentative, approved/rejected, and repair receipts honestly.
6. Disconnect a provider during an edit and recover without duplicate remote events.
7. Revoke Build/CRM access and prove no title leaks through range, detail, search, export, notification, or meeting context.
8. Use the core flows at 375, 768, and 1280 px with keyboard-only interaction.

## 7. Success measures

- Median time to create an internal meeting.
- Median time to find a valid shared slot.
- Booking completion and conflict-rejection rates.
- Provider sync success and reconciliation time.
- Duplicate booking, invitation, reminder, and provider-event incidents.
- Meetings with at least one accepted follow-up.
- On-time completion of linked CRM/Build/Task commitments.
- Zero unauthorized detail disclosure.

Employee-level performance scoring is prohibited.

## 8. Product completion rule

A product requirement is satisfied only when its mapped implementation item, contract tests, real-database tests where relevant, responsive authenticated browser journey, accessibility state, failure recovery, cleanup, and documentation are complete. Mock-only or source-only evidence does not establish end-to-end completion.
