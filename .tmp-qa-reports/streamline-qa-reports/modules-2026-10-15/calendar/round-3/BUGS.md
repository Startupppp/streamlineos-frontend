# Calendar QA Round 3 — BUGS (2026-10-15, final regression)

Run: Thu 15 Oct 2026 ~21:17–22:10 IST, owner session (org "ADitay CAhala", account timezone Asia/Calcutta), one browser tab. Test prefix QA1015R3. Invitees: none added (external guest entry checked, then discarded). No email sent. No Google/Outlook writes created this round.

Severity scale: Blocker / Critical / High / Medium / Low.

## 1. Recheck of round-1 and round-2 bugs (CAL-B-001..023)

| ID | Title (short) | R3 status | Evidence (this run) |
|---|---|---|---|
| CAL-B-001 | Week grid + now-line + new-event default use UTC, not Asia/Calcutta | STILL OPEN | Week grid (14 Oct) shows "12:46 PM – 1:46 PM" for "Calendar past-event regression check 2026-10-14"; List shows "6:16 pm – 7:16 pm · Asia/Calcutta". New Event opened with time "03:58" (UTC clock, IST was 9:28 PM). |
| CAL-B-002 | New event saved as UTC (no timezone control) | STILL OPEN | "QA1015R3 TZ probe", 21 Oct 10:00–11:00 entered in the form → List "21 Oct 2026, 10:00 am – 11:00 am · UTC". Same for "QA1015R3 Clash after allday" (28 Oct 14:00) → "2:00 pm – 2:30 pm · UTC". |
| CAL-B-003 | Double-click Save creates duplicates | STILL OPEN | One Playwright double-click on Save of "QA1015R3 dblclick probe" (22 Oct 10:00–10:30) → two identical rows in Week grid. |
| CAL-B-004 | External invitee cannot be added | STILL OPEN | Add attendees → typed qa1015r3@sharklasers.com + Enter → "No members found."; no chip. Discarded, nothing saved. |
| CAL-B-005 | Clash toast does not name the clashing event | STILL OPEN | "QA1015R3 Clash overlap probe" (21 Oct 10:30–11:30) overlapping "QA1015R3 TZ probe" (10:00–11:00) → "Event created, but it clashes with 1 event already on your calendar." (no name, no time). |
| CAL-B-006 | Local event and its Google mirror both shown | NOT RE-RUN | No synced event was created this round (would add a new Google write). Round-2 mirrors still listed as External (e.g. "QA1015R2 Google sync probe", Fri 23 Oct 10:00–11:00 Etc/UTC), so R2 evidence stands. |
| CAL-B-007 | Edit of a synced event → "[object Object]" error | NOT RE-RUN | No synced event edited this round. R2 evidence stands (re-confirmed in R2 on two events). |
| CAL-B-008 | CORS preflight failures / whole-page replacement | PARTIAL (CORS not seen; whole-page replacement reproduced) | Captured console: no CORS messages in the calendar sessions. Whole-page "Calendar error" (see CAL-B-016) recurred 6+ times. Treat as STILL OPEN under the page-replacement half. |
| CAL-B-009 | "All occurrences" edit deletes an earlier "This occurrence only" override | STILL OPEN | Monthly series "QA1015R3 Monthly series probe". Nov 15 → "This occurrence only" → "QA1015R3 Monthly ONE edited" (visible). Dec 15 → "All occurrences" → "QA1015R3 Monthly ALL edited". Nov 15 no longer shows the ONE override. |
| CAL-B-010 | Drag/resize of an event opens New Event instead of moving it | STILL OPEN | Mouse-drag of "QA1015R3 TZ probe" (21 Oct) body → New Event opened prefilled 10:30 → 1:30 PM. Event not moved. Draft discarded. |
| CAL-B-011 | Send from Mail fails with HTTP 500, no error shown | NOT RE-RUN | Sending is forbidden in this round ("Send no emails"). Round-1 evidence stands. |
| CAL-B-012 | Mail "Account 2" connector error shows tool slug; inbox empty | STILL OPEN | /mail: "Account 2 — Unable to retrieve tool with slug OUTLOOK_OUTLOOK_LIST_MESSAGES — Reconnect"; "No messages in inbox / Inbox is clear". |
| CAL-B-013 | (no definition in any round) | CANNOT RECHECK | Still no CAL-B-013 definition in calendar/round-1, round-2, or elsewhere on the box. Numbering gap kept. |
| CAL-B-014 | Delete on a recurring event has no scope choice | STILL OPEN | Delete on Dec 15 occurrence of "QA1015R3 Monthly" → "Delete Event — This will permanently delete the event…" with Cancel/Delete only (0 radio buttons). Cancelled, nothing deleted. Series later deleted as cleanup (see TEST-DATA). |
| CAL-B-015 | Deleting a synced event leaves the provider mirror | STILL OPEN (not re-run; mirror seen) | Round-2 mirror "QA1015R2 Google sync probe" still listed as External in Week (Fri 23 Oct). Not deleted (not my data). |
| CAL-B-016 | Full-page "Calendar error – Failed to load the calendar" replaces calendar | STILL OPEN — REPRODUCED (≥6×) | Fresh loads of /calendar?mode=calendar (and list) on 21, 23, 24, 27, 28 Oct returned the full-page "Calendar error — Failed to load the calendar. Please try again." + "Try Again". Console: React minified error #185 (ids 1a673968-30b2-4ec3-b7fa-bc49f3b2328c, b0bdbbeb-2d8c-41a5-b8fc-3f09bb435020, b31e2856-9f40-464e-86e6-bb08cda905dc). "Try Again" recovered each time. Sheet and header are lost. |
| CAL-B-017 | RSVP "no longer current"; choice reverts on reload | STILL OPEN | Owner event "QA1015R3 Clash after allday" (28 Oct): Accept → toast "You're going" (no error toast this time). Reload → "Your RSVP … No response yet". Not persisted. |
| CAL-B-018 | All-day multi-day shows only its start date in List and sheet | STILL OPEN | "QA1015R3 All-day 27-29 probe" (saved 27 Oct–29 Oct, All day). List row: "All day" only under 27 Oct (no end date, no range). Grid bar spans 3 days (correct). |
| CAL-B-019 | Sync conflict on first edit of a just-created synced event | NOT RE-RUN | No new synced event (avoids another Google write). R2 evidence stands; R2 orphan "QA1015R2 Sync conflict first-edit probe" still shows as External. |
| CAL-B-020 | Clash toast fires for a timed event beside an all-day item | STILL OPEN | "QA1015R3 All-day 27-29 probe" (27–29 Oct, all day). Then "QA1015R3 Clash after allday" 28 Oct 14:00–14:30 (no timed overlap) → "Event created, but it clashes with 1 event already on your calendar." (false). Control on 21 Oct 14:00 beside the leave item "adityachalla01 - OOO" gave plain "Event created" — so the false clash needs a multi-day all-day event. |
| CAL-B-021 | Time segments show "00 PM/00 AM/11:00" for PM/AM times | STILL OPEN (worse) | Start 10:00 → time field shows "00 AM"; end 10:30 → "30 AM"; default 15:48 → "03:48" with no PM marker; List later shows the correct value. Mobile sheet shows "03:58" with no AM/PM. |
| CAL-B-022 | Event blocks cannot be opened with Enter/Space | STILL OPEN | Focused "QA1015R3 TZ probe" block: Enter → URL unchanged, no sheet. Mouse click opens the sheet. |
| CAL-B-023 | Deleted events stay on screen until reload | NOT REPRODUCED for single delete (intermittent — see note) | "QA1015R3 TZ probe" deleted from Week: block count 0 immediately after "Event deleted", and absent after reload. Note: in the earlier double-click pair, one row was still visible after the first delete (read ~5 s later) and was gone after reload — keep as intermittent until re-run. |

### Recheck counts (CAL-B-001..023 + round-2 extras 016)

| Status | Count | IDs |
|---|---:|---|
| STILL OPEN | 16 | 001, 002, 003, 004, 005, 009, 010, 012, 014, 015, 016, 017, 018, 020, 021, 022 |
| PARTIAL / intermittent | 2 | 008 (CORS not seen; page replacement open), 023 (not reproduced once; intermittent note) |
| NOT RE-RUN | 4 | 006, 007, 011, 019 |
| CANNOT RECHECK | 1 | 013 |

Note: CAL-B-011 is the only item blocked by policy this round (sending mail). CAL-B-006/007/019 would require new Google writes; not done.

## 2. New bugs (CAL-B-024 onward)

## Page: Calendar week grid, recurrence (/calendar?mode=calendar)

### CAL-B-024: Monthly repeat is hard-wired to "Day 15 of month"; the series ignores the chosen start date and the first occurrence is lost
- Severity: High (wrong dates; a meeting silently missing from its start day)
- Route: /calendar?mode=calendar&date=2026-10-23 → Add to calendar → Repeat = Monthly
- Actor: owner
- Steps:
  1. Add to calendar. Title "QA1015R3 Monthly series probe". Start Fri 23 Oct 10:00, end 10:30, Sync = Don't sync.
  2. Repeat → Monthly. Read the recurrence row.
  3. Ends → After 3 occurrences (or leave Never). Save.
  4. Read Fri 23 Oct, Sun 15 Nov and Tue 15 Dec in the Week grid (after load).
- Expected: Monthly defaults to the start day ("Day 23 of month") and the first occurrence is on Fri 23 Oct; later occurrences fall on the 23rd.
- Actual: Recurrence row reads "Every 1 month(s) · Day 15 of month" (options only "Day 15 of month" or "Day of week"). Fri 23 Oct has no occurrence. The series lands on 15 Nov (10:00–10:30) and 15 Dec.
- Impact: Monthly meetings land on the wrong day with no warning; the start-date occurrence is dropped. Users will double-book or miss monthly reviews.
- Likely code area: recurrence rule builder defaults (dayOfMonth taken from today's date (15 Oct) instead of the event start date; the rule is not derived from DTSTART); occurrence expander may skip the DTSTART occurrence when BYMONTHDAY ≠ DTSTART day.
- Suggested fix: Derive BYMONTHDAY from the start date by default ("Day 23 of month"); always include DTSTART as the first occurrence when it matches the rule; show the computed next 3 dates in the sheet.
- Acceptance check: Start Fri 23 Oct, Monthly → recurrence shows "Day 23 of month"; occurrences 23 Oct, 23 Nov, 23 Dec; no occurrence on the 15th.

### CAL-B-025: Week grid is unreadable at phone width (390 px): seven narrow columns, event labels cut to "9 9" / "10:0"
- Severity: High (mobile calendar unusable in Week view; default view on phones)
- Route: /calendar?mode=calendar (Week) at viewport 390 × 1026
- Actor: owner (any user on a phone)
- Steps:
  1. Set viewport to 390 px wide (DevTools device toolbar, custom 390).
  2. Open /calendar (default Week view) for 19–25 Oct; read the 9 AM and 10 AM rows.
  3. Compare with /calendar?mode=list.
- Expected: On phones, Week switches to a day-by-day or agenda layout (or the grid scrolls horizontally with readable labels). Event titles readable; each block tappable with a visible time.
- Actual: Seven day columns ~40 px each. Blocks show "9 9" (standups), "10:0", "1:00" (no titles). The List view is readable (cards, dates, sources). Bottom nav (Home/Inbox/Mail/Calendar/More) present. New Event opens as a bottom sheet and fits.
- Impact: Phone users cannot read or pick events from the Week view; only List works.
- Likely code area: week grid column width/min-width in the calendar grid component; no breakpoint that switches to Day or Agenda; default mode not mobile-aware.
- Suggested fix: Under ~640 px, default to Day or Agenda; in Week, use 3-day columns with horizontal scroll and min column width 96 px; show title on the first line of each block.
- Acceptance check: At 390 px, Week shows event titles in full (or a day picker), and tapping a block opens the detail sheet.

### CAL-B-026: No way to search or filter calendar events: the list filter has only "All events" and the global palette returns no calendar items
- Severity: Medium
- Route: /calendar?mode=list (filter dropdown "All events"); global search (⌘K)
- Actor: owner
- Steps:
  1. Open List view. Open the "All events" dropdown.
  2. Open ⌘K command palette; type "QA1015R3" (an event that exists on 21 Oct).
  3. Click "Sources".
- Expected: Filter by calendar/source (Google, Outlook, StreamlineOS, Attendance, Leave) and a text search over event titles in the calendar; the palette returns "QA1015R3 …" events.
- Actual: "All events" dropdown has one option ("All events"). The palette returns "No results for 'QA1015R3'" (it lists actions and pages only). "Sources" opens no panel (the toggle changes nothing visible). The calendar has no search field.
- Impact: With ~50 mirror rows from synced accounts and standups, users cannot find an event or limit the agenda to one calendar.
- Likely code area: calendar list filter has options wired to nothing (only default); command palette index excludes calendar events; Sources toggle not wired to a panel.
- Suggested fix: Add source/calendar multi-select and a title search box in the calendar header; index upcoming events in the palette.
- Acceptance check: Type "QA1015R3" in the calendar search → the probe appears; choose "Google" in the filter → only Google rows remain.

### CAL-B-027: No reminder setting on calendar events (New Event or event sheet)
- Severity: Medium (feature gap for a calendar; reminders could not be set or viewed on any event type)
- Route: /calendar → Add to calendar; event sheet → Edit
- Actor: owner
- Steps: Open New Event and read all rows (Title, date/time, All day, Attendees, Calendar, Colour, Repeat, Notes, Sync, Teams link, Location, Linked ticket). Open an existing event's Edit form. Search settings for reminders (My Account, Organization Settings).
- Expected: A "Reminder" control (e.g. 10 min / 1 h before) on events, with a default in settings, and reminders visible on the event sheet.
- Actual: No reminder row in New Event or Edit. Organization Settings has Localization and Business Hours but no reminder defaults. The "Notifications" link under Account is the only notification page found (not checked in depth).
- Impact: Users rely on external calendars for alerts; StreamlineOS events give no alert.
- Likely code area: event form schema (no reminders field), notifications service not wired to calendar events.
- Suggested fix: Add reminders (multi-select) to the event form; default in calendar preferences; schedule notifications from the event worker.
- Acceptance check: Event with "10 min before" reminder → notification fires 10 min before start (in IST).

### CAL-B-028: Calendar stays on "Loading calendar sources…" for 20+ seconds on direct navigation
- Severity: Medium (perceived outage; combined with CAL-B-016)
- Route: /calendar?mode=calendar&date=2026-11-15 and /calendar?mode=list
- Actor: owner
- Steps: Load a deep link (direct navigation, not in-app). Read the spinner text at 5 s, 15 s, 25 s.
- Expected: Grid appears in < 3 s; sources fill in progressively.
- Actual: Grid shows "Loading calendar" and bottom-left "Loading calendar sources…" for >20 s on several loads (Nov 15 week, Oct 19–25 week); List showed "Loading events / Opening this section" for 20+ s on first load.
- Impact: Users think the calendar is broken and reload (which triggers CAL-B-016).
- Likely code area: sources query waits for all provider sync states before rendering; no per-source streaming.
- Suggested fix: Render StreamlineOS events first; show provider sources as they arrive, each with its own spinner.
- Acceptance check: Direct load of a deep link shows StreamlineOS events within 3 s on a normal network.

## Summary of new bugs (CAL-B-024..028)

| ID | Severity | Page | Title |
|---|---|---|---|
| CAL-B-024 | High | Week grid / recurrence | Monthly repeat hard-wired to day 15; start-date occurrence lost |
| CAL-B-025 | High | Week grid (mobile 390 px) | Week grid unreadable on phones |
| CAL-B-026 | Medium | List / search | No calendar filter or event search; palette ignores events |
| CAL-B-027 | Medium | New Event / event sheet | No reminder control |
| CAL-B-028 | Medium | Calendar load | "Loading calendar sources…" for 20+ s on deep link |

Not filed as new (covered by existing IDs): time-zone setting — org timezone is Asia/Calcutta, but new events and the grid ignore it (CAL-B-001/002). Export/print of the agenda — see COVERAGE.md.
