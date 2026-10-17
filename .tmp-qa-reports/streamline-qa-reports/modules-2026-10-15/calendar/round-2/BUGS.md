# Calendar QA Round 2 — BUGS (2026-10-15)

Round 2 continuation (interrupted run finished). Test prefix: QA1015R2. See TEST-DATA.md, COVERAGE.md, UX.md in this folder. Account timezone Asia/Calcutta (IST). Test invitees: @sharklasers.com only.

## Recheck of round-1 bugs (CAL-B-001..015)

| ID | Title | Status | Evidence / notes |
|---|---|---|---|
| CAL-B-001 | Week grid shows UTC times | STILL OPEN | Grid shows "12:46 PM – 1:46 PM" for "Calendar past-event regression check 2026-10-14"; List shows "6:16 pm – 7:16 pm · Asia/Calcutta". |
| CAL-B-002 | New event saved as UTC | STILL OPEN | Created "QA1015R2 TZ display probe" 19 Oct 10:00–11:00 (no tz field). List shows "10:00 am – 11:00 am · UTC". |

| CAL-B-003 | Double-click Save duplicates | STILL OPEN | Double-click (Playwright dblclick) on Save of "QA1015R2 Double click save probe" 20 Oct 14:00–14:30 created 2 rows (both listed in List view). |
| CAL-B-004 | External attendee cannot be added | STILL OPEN (re-checked: qa1015r2@sharklasers.com → "No members found.", Enter adds nothing; discarded, nothing saved) | Add attendees popover shows "Search members..." / "No members found." for qa1015r2@sharklasers.com; Enter adds nothing. |
| CAL-B-005 | Clash toast does not name the conflict | STILL OPEN; no-overlap control PASSED on Tue 27 Oct 22:00 (plain "Event created"); false clash found with an all-day item (CAL-B-020) | Saving "QA1015R2 Clash probe 1420" (20 Oct 2:20–3:20 pm) shows "Event created, but it clashes with 3 events already on your calendar." – count is right, but no event is named. No-overlap control still to test. |
| CAL-B-008 | CORS / server unavailable replaces page | STILL OPEN (reproduced, worse) | 3 separate full-page failures: "Couldn't load your workspace – Network error contacting api.streamlineos.in (GET /me/access)"; console CORS preflight blocked for /me/access, /me/preferences, /billing/entitlements. Also "Calendar error – Failed to load the calendar" (see CAL-B-016). |
| CAL-B-010 | Drag/resize of an existing event | STILL OPEN | Dragging the body of "QA1015R2 TZ display probe" (19 Oct) and dragging its bottom edge both open "New Event" prefilled (10:30–12:30; 11:00 start). Event not moved/resized. |
| CAL-B-011 | Send from Mail fails with HTTP 500, no error shown | NOT RECHECKED (send blocked for this run) | Recheck needs an outgoing email to qa1015cal@sharklasers.com under the owner's name, so it was not sent. Ask the parent to use DraftExternalMessage (see final report). Round-1 evidence stands. |
| CAL-B-012 | Mail "Account 2" connector error shows tool slug; inbox empty | STILL OPEN (re-checked 15 Oct 00:4x UTC) | /mail still shows red banner "Account 2 / Unable to retrieve tool with slug OUTLOOK_OUTLOOK_LIST_MESSAGES / Reconnect" and "No messages in inbox / Inbox is clear" under All accounts; the sidebar still reports 7 unread. Not clicked Reconnect. |
| CAL-B-013 | (no definition found) | CANNOT RECHECK | CAL-B-013 is not defined in round-1 BUGS.md (index runs 001–012, 014, 015), round-2 BUGS.md, TEST-DATA.md, or any other folder on the box (rg across /workspace/streamline-qa). Owner needs to supply the title. Numbering gap noted. |
| CAL-B-009 | Series edit "All occurrences" drops earlier "This occurrence only" override | STILL OPEN | Series "QA1015R2 Recurring weekly series" (Mon 2 Nov 4–5 PM UTC). Edited Mon 2 Nov → "QA1015R2 Recurring ONE edited" (This occurrence only; toast seen). Then edited Mon 9 Nov → "All occurrences" → "QA1015R2 Recurring ALL edited". Result: Mon 2 Nov row is gone from List (Nov 2–8 shows only standups, re-checked after load). 9, 23 Nov show "ALL edited". Scope dialog pre-selects "All occurrences" (confirmed). |
| CAL-B-014 | Delete on recurring event has no scope | STILL OPEN (re-confirmed this run: one Delete on a 9 Nov occurrence removed 9, 16, 23, 30 Nov; dialog still has no scope) | Delete on Mon 16 Nov occurrence opens "Delete Event – This will permanently delete the event. This action cannot be undone." with only Cancel/Delete (no This occurrence / All occurrences). Dialog was cancelled, not confirmed. "Cancel occurrence" (separate alertdialog) does remove only that date (16 Nov gone, 23 Nov kept). |
| CAL-B-006 | Local event and Google mirror both shown | PARTIAL (not reproduced as a duplicate in this run) | "QA1015R2 Google sync probe" (23 Oct, synced to adityachalla01@gmail.com): while the local event existed, the List and Week grid showed one row only (no External row for it). The mirror still appears as a separate read-only item after the local is deleted (see CAL-B-015). Round-1 leftover mirror "QA1015 <script>… probe" still shows on 16 Oct as External. Standups still appear twice per day (two External rows) without account label. |
| CAL-B-007 | Synced-event edit fails with "[object Object]" | STILL OPEN (re-confirmed this run on a new synced event: red "[object Object]" text, no resolution buttons; see CAL-B-019) | Edited title of the synced event to "…EDITED" → toast "Event updated" → sheet shows red box "Sync to your external calendar failed after 1 attempt. [object Object] The provider copy changed after this event was loaded. Reload it before deciding which version to keep." No Keep/Use buttons. The conflict fired on the first edit of an event created seconds earlier (see new bug CAL-B-019). |
| CAL-B-015 | Delete leaves provider copy behind | STILL OPEN (re-confirmed this run with "QA1015R2 Sync conflict first-edit probe": local deleted, read-only Google mirror with original title stays in Week and List. Mirrors for "Google sync probe" (23 Oct) also still present) | Deleted "QA1015R2 Google sync probe EDITED" (toast "Event deleted"). Reload: Week and List show "QA1015R2 Google sync probe" again as External, source adityachalla01@gmail.com, "Read-only event from a connected account. Edit it in its own calendar." Its title is the ORIGINAL title (edit never reached Google). Confirm dialog says only "This will permanently delete the event." Google side not verified (not signed in to Google; not attempted). |


## New bugs in this round (CAL-B-016 … CAL-B-023) – index

| ID | Title | Severity | Page |
|---|---|---|---|
| CAL-B-016 | Full-page "Calendar error – Failed to load the calendar" (not reproduced again; see entry) | High | /calendar |
| CAL-B-017 | RSVP fails: "attendee record is no longer current"; choice reverts on reload | High | event sheet – Your RSVP |
| CAL-B-018 | Multi-day all-day event shows only its start date in List and sheet | Medium | /calendar list + sheet |
| CAL-B-019 | Sync conflict on the first edit of a just-created synced event | High | event sheet – sync status |
| CAL-B-020 | Clash toast fires for timed events when an all-day item exists the same day | Medium | New Event – Save |
| CAL-B-021 | Time field shows 00 PM / 00 AM / 11:00 for PM times | Medium (confirm) | New Event – time fields |
| CAL-B-022 | Event blocks don't open with Enter/Space (keyboard) | Medium | Week/Day/Month grid |
| CAL-B-023 | Deleted events remain on screen until reload | Low | list + grid after delete |

Passed controls this run: end before start (blocked, inline error); title over 100 chars (blocked, inline error); XSS-style title rendered as text (no injected element); past dates disabled in date picker; past time-of-day on today accepted without warning (see COVERAGE/UX); no-overlap clash control (Tue 27 Oct) gives no toast; multi-day all-day bar spans 3 days in grid; invalid date and missing event deep links handled without error page; Month, Day, Week, List, History views load; Escape closes the event sheet; Next button works with Enter.

## Page: Calendar event sheet – Your RSVP (/calendar?mode=calendar&event=<id>&eventSource=calendar)

### CAL-B-017: RSVP (Accept / Maybe / Decline) fails on the server with "The event attendee record is no longer current"; the choice reverts on reload
- Severity: High
- Route: /calendar?mode=calendar&date=2026-10-26&event=event-20&eventSource=calendar (event "QA1015R2 Clash control no overlap", 27 Oct 10:00 pm – 11:00 pm UTC, created by the owner account, sync = Don't sync)
- Actor: signed-in owner (aditya), organiser of the event
- Steps:
  1. Open the Week grid for 26 Oct and click the "QA1015R2 Clash control no overlap" block (Tue 27 Oct, 10 PM).
  2. In "Your RSVP" click "Accept".
  3. Read the sheet and the toast. Reload the page and reopen the same event.
  4. Repeat with "Maybe" (group "Your RSVP" → second button).
- Expected: The response is saved; the sheet shows "You're going" (or "You might go") and it still shows that after reload. No error toast. (Or, since the user is the organiser, the RSVP row is hidden and the sheet says so.)
- Actual: The sheet immediately shows "You're going" (Accept) / "You might go" (Maybe) and a red toast "The event attendee record is no longer current". After reload the sheet reads "No response yet". Reproduced 2× for Accept and 1× for Maybe. Decline not attempted.
- Impact: RSVP is non-functional for the event owner's own events and gives a false "You're going" confirmation. Invitees who open an event they were added to will hit the same stale-record path if their attendee row is re-created on each save.
- Likely area in code: RSVP mutation in the event sheet (attendee row lookup by event id + email; attendee rows are rewritten on each edit so the cached attendeeId is stale); server returns 409/410 "no longer current" but the client treats it as success before the refetch.
- Suggested fix: On RSVP, look up the attendee row by (eventId, userId) on the server instead of a client-cached id; roll back the optimistic "You're going" state on error; hide the RSVP row when the viewer is the organiser (or show "You organise this event").
- Acceptance check: As organiser, RSVP is either hidden or Accept/Maybe/Decline persists across reload with no error toast. As an invitee (second account), Accept persists and the attendee record is not reported stale after a parallel edit by the organiser.

## Page: Calendar event sheet – sync status after Edit (/calendar?mode=calendar&event=<id>&eventSource=calendar)

### CAL-B-019: Sync conflict fires on the FIRST edit of a synced event that was created moments earlier (no other change to the provider copy)
- Severity: High
- Route: /calendar?mode=calendar&date=2026-10-30&event=event-24&eventSource=calendar (Create → Edit → Save)
- Actor: signed-in owner; sync target adityachalla01@gmail.com (the connected Google account)
- Steps:
  1. Week grid → Add to calendar. Title "QA1015R2 Sync conflict first-edit probe", Fri 30 Oct, 10:00 → 10:30, "Sync to calendar account" = adityachalla01@gmail.com. Save.
  2. Wait for "Event created — syncing to your calendar" to finish (the sheet gets the Edit button after about 5 s).
  3. About a minute later, open the event → Edit → change the title to "... EDITED" → Save (one edit, nothing else touched).
  4. Wait about 20 s and read the sheet.
- Expected: The Google copy is updated with the new title with no error (nothing else changed the provider copy in between). If there really were a provider-side change, the sheet explains it in words and offers "Keep StreamlineOS version" / "Use Google version".
- Actual: Toast "Event updated", then "Syncing to your calendar…". Then the sheet shows a red box: "Sync to your external calendar failed after 1 attempt. [object Object] The provider copy changed after this event was loaded. Reload it before deciding which version to keep." There are no resolution buttons. Nothing else edited the Google copy, so the conflict is false. The same message appeared in round 2 for the "Google sync probe" (see CAL-B-007).
- Impact: Every first edit of a newly synced event fails, so synced events can't be edited without a conflict. Reload does not clear it (the error is stored on the event), and the Google copy stays at the creation-time title.
- Likely area in code: the sync worker's ETag / version check after create. The create call stores the provider version (etag or updated timestamp) before the provider adds its own changes (e.g. conference/Teams data or a second write), so the next PATCH compares against a stale version and gets a 412/"changed" result. Also the error formatter (String(err)) producing "[object Object]".
- Suggested fix: After create, re-read the provider copy (or use the create response's etag after the last write) and store that version; on a version mismatch, re-fetch the provider copy and retry once automatically before showing a conflict; show a readable message and two buttons (Keep StreamlineOS version / Use Google version).
- Acceptance check: Create a synced event, wait for sync, edit it once within 2 minutes → "Event updated", the Google copy shows the new title within 30 s, and no conflict box appears. A forced real conflict shows readable text and both buttons; "[object Object]" never appears.
- Note: left-over provider copy in Google (original title "QA1015R2 Sync conflict first-edit probe", 30 Oct 10:00–10:30 UTC). Not deletable from StreamlineOS (see CAL-B-015). Listed in TEST-DATA.md.

## Page: Calendar List view and event detail sheet – all-day multi-day events (/calendar?mode=list&date=2026-10-29, /calendar?mode=calendar)

### CAL-B-018: All-day event that spans several days shows only its start date in List and in the detail sheet (the grid bar is correct)
- Severity: Medium
- Route: /calendar?mode=list&date=2026-10-29 and the event sheet (event "QA1015R2 All-day Oct 29-31 probe")
- Actor: signed-in owner
- Steps:
  1. New Event → title "QA1015R2 All-day Oct 29-31 probe" → toggle All day → start 29 Oct → "Add end date" → 31 Oct → Sync = Don't sync → Save.
  2. Week grid (26 Oct): the bar runs across Thu 29, Fri 30, Sat 31. Good.
  3. Open List view for 26 Oct – 1 Nov. Read the row. Click the row to open the detail sheet.
  4. Open Edit and read the dates (then Discard).
- Expected: List row and sheet read "29 Oct 2026 – 31 Oct 2026 · All day" (the same range as the grid bar).
- Actual: List row: "All day" under the title on Thu 29 only; the sheet heading and date line read "29 Oct 2026" only. Edit correctly shows Oct 29 → Oct 31 and the grid bar spans three days, so the stored data is right and only the display drops the end date.
- Impact: Users reading the list or sheet think a three-day event (e.g. an offsite or leave) is one day; they may miss days in the agenda and the day-view count.
- Likely area in code: list row and detail sheet date formatter (formats only startDate for all-day events; end date ignored unless it is a timed event). The grid uses start and end.
- Suggested fix: Format all-day ranges as "29 Oct – 31 Oct 2026 · All day" (same helper used for the grid bar) in list rows, the detail sheet, and the Day/Agenda rows.
- Acceptance check: Create an all-day event 29–31 Oct; list row, detail sheet, and grid all show the same three-day range; a one-day all-day event still shows a single date.

### CAL-B-020: Clash check counts an all-day event as overlapping timed events on the same day (false "clashes with 1 event" toast)
- Severity: Medium
- Route: /calendar?mode=calendar → Add to calendar → Save (Fri 30 Oct, timed events)
- Actor: signed-in owner
- Steps:
  1. With "QA1015R2 All-day Oct 29-31 probe" present (CAL-B-018 steps), no timed event on 30 Oct that overlaps 14:00 (only the Daily Team Standup 9:00–9:15 UTC and the synced probe at 10:00–10:30 UTC).
  2. Add to calendar → "QA1015R2 Clash control 30Oct 1400", Fri 30 Oct 14:00 → 14:30, Sync = Don't sync. Save.
  3. For comparison, Tue 27 Oct 22:00 → 23:00 (no all-day event on that day) "QA1015R2 Clash control no overlap". Save.
- Expected: No clash toast in step 2 (the only item on the day is an all-day event that does not overlap 14:00). The step-3 control shows no toast, which is correct.
- Actual: Step 2 toast: "Event created, but it clashes with 1 event already on your calendar." (it does not name the event; the same wording as CAL-B-005). Step 3: plain "Event created" (correct). The Fri 30 Oct 10:00–10:30 synced probe (CAL-B-019) also raised the same toast at creation, with no timed overlap either.
- Impact: Users get false conflict warnings for every timed meeting on a day that has an all-day item (OOO, holiday, multi-day event), and the toast does not say what it clashes with, so they cannot check.
- Likely area in code: conflict detection in the create/update path (overlap test uses the day range for all-day items, or matches all-day events as 00:00–24:00 in the wrong time zone, or counts the Attendance / all-day source). It is the same overlap helper that CAL-B-005 points at.
- Suggested fix: Exclude all-day items from timed-overlap checks (or check only same-timezone intervals), name the clashing event(s) in the toast with its time, and add a unit test: all-day 29–31 + timed 30 Oct 14:00 → no clash.
- Acceptance check: 30 Oct 14:00–14:30 with only an all-day event on that day → plain "Event created", no clash toast; a real overlap with a timed event → toast names that event.
- Note: this is the "no-overlap control" requested for CAL-B-005. Result: the Tue 27 Oct control passes (no toast); the Fri 30 Oct control fails (false toast).

## Page: Calendar page as a whole (/calendar) – full-page error states

### CAL-B-016: Full-page "Calendar error – Failed to load the calendar" replaces the calendar (no retry inside the panel)
- Severity: High
- Route: /calendar (any mode; seen in the interrupted round-2 run on the calendar load path, alongside the CAL-B-008 CORS failures)
- Actor: signed-in owner
- Steps (as recorded in the interrupted run): open /calendar while the API is failing or slow; the whole page is replaced by the heading "Calendar error" and the text "Failed to load the calendar".
- Re-check in this session (one tab, owner session): tried List, Week, Month, Day, History, invalid date (?date=2026-13-45), a deep link to a missing event (?event=event-999999), 6 rapid Next/Previous week clicks, and reloads after saves. The calendar loaded in every case. What did reproduce is the same family: "Server temporarily unavailable – The server is not responding. Retrying automatically…" (Week view, 19 Oct, CAL-B-008) and the workspace-level "Couldn't load your workspace – Network error contacting api.streamlineos.in (GET /me/access). Try again." (List view, 26 Oct, after a save). Both replace the whole page; "Try again" restored it.
- Expected: A failed calendar load shows an inline error in the calendar panel with a "Retry" button; the sidebar, header and the open New Event sheet stay usable.
- Actual: The whole calendar page is replaced by the error. Unsaved work in an open sheet is lost on the full-page state.
- Impact: Any transient API failure removes the calendar and any draft; the user has to reload to continue.
- Likely area in code: the calendar route's top-level error boundary (catches the calendar query error and renders the full-page error instead of a panel error); the same boundary covers the workspace bootstrap (/me/access, /me/preferences, /billing/entitlements) that fails with the CORS preflight errors.
- Suggested fix: Scope the error boundary to the calendar grid/list panel, keep the header and sheet mounted, and add an inline "Retry" action. Fix the CORS preflight on api.streamlineos.in for calendar and workspace routes (see CAL-B-008).
- Acceptance check: With the calendar API blocked (devtools request-blocking), the header and an open New Event sheet stay visible and show an inline error with Retry; unblocking and pressing Retry loads the grid without a page reload.
- Status note: the exact "Calendar error – Failed to load the calendar" text was not seen again in this session despite the attempts above; the entry is kept from the interrupted run's notes and needs a re-capture (console + screenshot) the next time it fires.

### CAL-B-021: Time input shows "00 PM" / "00 AM" / "11:00" for afternoon and evening times (value is correct, label is not)
- Severity: Medium (entry risk: the field looks like midnight)
- Route: /calendar?mode=calendar → Add to calendar → Start / End time fields
- Actor: signed-in owner
- Steps:
  1. Add to calendar → set start time 15:00 and end 14:00 (then 14:30 etc.) on any day.
  2. Read the start and end time fields (screen crop of the segmented 12-hour input).
  3. Set start 09:00 and 22:00 / end 23:00 and read the fields. Save an event at 22:00–23:00 and read the list row.
- Expected: Fields read "03:00 PM", "02:00 PM", "09:00 AM", "10:00 PM", "11:00 PM", matching the saved value.
- Actual: 15:00 and 14:00 show "00 PM"; 09:00 shows "00 AM"; 22:00 shows "00 PM"; 23:00 shows "11:00" with no AM/PM. The stored value is right (saved list row reads "10:00 pm – 11:00 pm · UTC"), and the default time (current clock) shows "12:36" correctly. Typing digits into the hour/minute segments did not change the value; ArrowUp/Down changes the minute only. The end-before-start check still works (red "End must be on or after start").
- Impact: The user can't see which time they picked; a PM time looks like midnight, and a wrong time can be saved without notice. Combined with CAL-B-002 (UTC default) this makes the time entry hard to trust.
- Likely area in code: the 12-hour segmented time input (hour formatting for 13–23 and the hour segment's controlled value); the keyboard handler for the hour segment.
- Suggested fix: Use one formatter for the time segments (hour12 with 1–12 and AM/PM from the 24-hour value); make digit typing set the hour/minute segments; add a unit test for 00:00, 09:00, 12:00, 15:00, 23:00.
- Acceptance check: Set 15:00 → field reads 03:00 PM; set 23:00 → field reads 11:00 PM; typed "0300P" sets 03:00 PM; saved event matches the field.
- Note: the field label was read through the browser accessibility tree after automated input; the full keyboard path was not verified on a real device. Severity to be confirmed.

### CAL-B-022: Calendar event blocks cannot be opened from the keyboard (Enter/Space do nothing; mouse click works)
- Severity: Medium (accessibility, WCAG 2.1.1)
- Route: /calendar?mode=calendar&date=2026-10-26 (Week) → focus an event block with Tab → Enter or Space
- Actor: signed-in owner using keyboard only
- Steps:
  1. Week view. Tab to "10:00 PM – 11:00 PM QA1015R2 Clash control no overlap" (the block is a focusable button; the accessibility tree shows it as the focused element).
  2. Press Enter. Wait 3 s. Press Space on the same block. Wait 3 s.
  3. For comparison, click the block with the mouse.
- Expected: Enter or Space opens the event sheet (URL gains &event=…), as the mouse click does.
- Actual: Enter and Space do nothing; the URL stays without &event=. A mouse click opens the sheet. Escape closes the sheet once it is open (works).
- Impact: Keyboard and screen-reader users can't open events from the grid; the Day/Week/Month views are unusable without a mouse for event details.
- Likely area in code: the event block handler is bound to onMouseDown/onPointerDown or to a div with role=button without a keydown handler; check the grid's click vs keyboard activation.
- Suggested fix: Use a native button or onClick for activation (handles Enter and Space), keep a visible focus ring, and add aria-label with time + title.
- Acceptance check: Tab to any event block, press Enter → sheet opens; Escape → closes and focus returns to the same block.

### CAL-B-023: Deleted events stay on screen until a full reload (grid and list keep the row after "Event deleted")
- Severity: Low
- Route: /calendar?mode=calendar and /calendar?mode=list (event sheet → Delete → confirm)
- Actor: signed-in owner
- Steps:
  1. List view for 12 Oct week: open "QA1015R2 Past time probe 0005" → Delete → Delete (confirm).
  2. Read the list immediately (about 1.5 s later).
  3. Reload the page and read again.
  4. Week grid: after deleting the local "QA1015R2 Sync conflict first-edit probe EDITED" the grid still showed two blocks with that title until reload.
- Expected: The row disappears when the delete completes (optimistic or refetched).
- Actual: Step 2 still lists the deleted row (the read showed two identical rows for the probe; after reload there were none). The synced probe kept its local block next to its provider mirror until reload; after reload only the read-only mirror remains.
- Impact: Users may think the delete failed and press Delete again (a second request) or report a bug that isn't there.
- Likely area in code: the delete mutation does not invalidate or update the cached event list for the current range; the list cache keeps the deleted row.
- Suggested fix: On delete success, remove the item from the cached range (or invalidate the query) and close the sheet; show "Event deleted" only after the cache is updated.
- Acceptance check: After Delete → confirm, the row and every grid block for that event disappear within 1 s without reload.
