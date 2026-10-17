# Calendar — still to do

Completed items were removed after a check of the frontend on 17 Oct 2026.
What is left was still open, only partly fixed, or could not be confirmed because this repo has no backend.
Same defect filed under two IDs is listed once.
This file is the remaining calendar work. Duplicate and finished reports were removed. Skip any ID that is not listed below.

## Remaining bugs

### CAL-B-001 — OPEN

Latest report note: Week grid shows UTC times: STILL OPEN | Grid shows "12:46 PM – 1:46 PM" for "Calendar past-event regression check 2026-10-14"; List shows "6:16 pm – 7:16 pm · Asia/Calcutta". New Event opened with time "03:58" (UTC clock, IST was 9:28 PM). |

### CAL-B-002 — OPEN

New event is saved in UTC; no timezone control; user-entered wall time is treated as UTC

Latest report note: New event saved as UTC: STILL OPEN | Created "QA1015R2 TZ display probe" 19 Oct 10:00–11:00 (no tz field). List shows "10:00 am – 11:00 am · UTC".

- Severity: Critical
- Route: /calendar?mode=calendar → Add to calendar → New Event (side sheet)
- Actor: signed-in account (Asia/Calcutta)
- Steps:
  1. Click "Add" (Add to calendar).
  2. Title "QA1015 <script>alert(1)</script> probe", date Fri 16 Oct 2026, start 10:00, end 11:00, All day off.
  3. Sync to calendar account: adityachalla01@gmail.com. Save.
  4. Open the List view and read the event line.
- Expected: Event stored as 10:00–11:00 Asia/Kolkata (IST), displayed "16 Oct 2026, 10:00 am – 11:00 am · Asia/Calcutta (4:30 am UTC)".
- Actual: "16 Oct 2026, 10:00 am – 11:00 am · UTC". No timezone field exists in the New Event form, so the wall time is saved as UTC (5h30m off the user's intent). Existing events in the same list show "· Asia/Calcutta".
- Impact: Every event created from the calendar is shifted by +5:30 for the user and invitees (Google sync will write it at the wrong instant). Data correctness issue.
- Likely area in code: New Event form submit payload (timeZone field defaulting to 'UTC' or missing and falling back to server default); calendar/event create API mapping.
- Suggested fix: Send the profile timezone (Asia/Kolkata) with start/end; show a timezone selector (or the profile tz label) in the form; do not default to UTC.
- Acceptance check: Create 10:00–11:00 in form → list shows "10:00 am – 11:00 am · Asia/Calcutta (4:30 am UTC)" and Google Calendar shows 10:00–11:00 IST.

### CAL-B-003 — OPEN

Double-click on Save creates duplicate events

Latest report note: Double-click Save duplicates: STILL OPEN | Double-click (Playwright dblclick) on Save of "QA1015R2 Double click save probe" 20 Oct 14:00–14:30 created 2 rows (both listed in List view).

- Severity: High
- Route: /calendar?mode=calendar → New Event sheet → Save
- Actor: signed-in account
- Steps:
  1. Open New Event, fill title/date/time valid (end after start).
  2. Double-click "Save" quickly (one double-click).
  3. Wait 3 s; read List view, scroll to Fri 16 Oct.
- Expected: Exactly one event is created. Save button disables / shows busy state on first click.
- Actual: Two identical events "QA1015 <script>alert(1)</script> probe 16 Oct 2026, 10:00 am – 11:00 am · UTC" (event-7 and event-8 IDs in URL). Save button is not disabled during the in-flight request; the sheet closes only after the second submit.
- Impact: Duplicate meetings/invites and duplicate Google events on double-click or slow networks.
- Likely area in code: NewEvent sheet submit handler (no isSubmitting guard / button disabled while pending); create mutation not idempotent.
- Suggested fix: Disable Save and set busy state on first click; guard submit with a ref; optionally send client-side idempotency key.
- Acceptance check: Double-click Save → exactly one event row and one Google event; Save shows disabled/spinner during request.

### CAL-B-004 — OPEN

Attendee picker only lists org members — external invitee (qa1015cal@sharklasers.com) cannot be added

Latest report note: External attendee cannot be added: STILL OPEN (re-checked: qa1015r2@sharklasers.com → "No members found.", Enter adds nothing; discarded, nothing saved) | Add attendees popover shows "Search members..." / "No members found." for qa1015r2@sharklasers.com; Enter adds nothing.

- Severity: High (blocks invite test; confirm if by design)
- Route: /calendar → Add → New Event → Attendees
- Actor: signed-in account
- Steps:
  1. New Event → click "Add attendees".
  2. Type qa1015cal@sharklasers.com in the search box ("Search members...").
  3. Press Enter.
- Expected: The address is offered as an invitee (external email) or a clear message explains external invites are not supported; Enter adds a chip.
- Actual: The popover shows "No members found." Enter adds nothing; Save invites nobody. Only org members (e.g., the signed-in user) appear.
- Impact: Users cannot invite external guests from StreamlineOS Calendar; invite/RSVP flows cannot be exercised.
- Likely area in code: attendee combobox source (org members only), missing free-text email chip.
- Suggested fix: Allow valid email entry as a guest chip (validate format), or show explicit "External guests are not supported for this calendar" help text.
- Acceptance check: Typing a valid external email and pressing Enter adds a guest chip; saved event lists guest; invitation delivered to test address.

### CAL-B-005 — OPEN

"Clashes with 1 event" warning raised with no visibly overlapping event

Latest report note: Clash toast does not name the conflict: STILL OPEN; no-overlap control PASSED on Tue 27 Oct 22:00 (plain "Event created"); false clash found with an all-day item (CAL-B-020) | Saving "QA1015R2 Clash probe 1420" (20 Oct 2:20–3:20 pm) shows "Event created, but it clashes with 3 events already on your calendar." – count is right, but no event is named. No-overlap control still to test.

- Severity: Medium (Low for the true-overlap case)
- Route: /calendar?mode=calendar → New Event → Save (Fri 16 Oct 10:00–11:00)
- Actor: signed-in account
- Steps: Create the 16 Oct 10:00–11:00 event (see CAL-B-002). Week grid for 16 Oct shows only Daily Team Standup 9:00–9:15 AM (Etc/UTC).
- Expected: No clash toast when nothing overlaps; if a clash exists, the conflicting event is named/highlighted.
- Actual: Toast "Event created, but it clashes with 1 event already on your calendar." The toast does not name the clashing event. The same toast appears for a true overlap (QA1015 probe at 26 Oct 3:00–3:30 PM overlapping the recurring series occurrence) — so the check works there, but on 16 Oct no visibly overlapping event was on screen (only Daily Team Standup 9:00–9:15 AM), so the reason is unclear.
- Impact: Misleading conflict warning; users cannot tell what they clash with.
- Likely area in code: conflict detection (compares against events in a different tz or includes disabled sources such as Holidays/Attendance).
- Suggested fix: Name the clashing event in the toast; run conflict check in the same tz as the stored event; exclude hidden sources or say so.
- Acceptance check: Toast names the clashing event with time; no toast when no overlap.

### CAL-B-006 — UNKNOWN

Local event and its Google mirror both shown in the calendar (duplicate display)

Latest report note: Local event and Google mirror both shown: PARTIAL (not reproduced as a duplicate in this run) | "QA1015R2 Google sync probe" (23 Oct, synced to adityachalla01@gmail.com): while the local event existed, the List and Week grid showed one row only (no External row for it). The mirror still appears as a separate read-only item after the local is deleted (see CAL-B-015). Round-1 leftover mirror "QA1015 <script>… probe" still shows on 16 Oct as External. Standups still appear twice per day (two External rows) without account label.

- Severity: High
- Route: /calendar?mode=calendar (Week grid) and /calendar?mode=list
- Actor: signed-in account; event synced to the connected Google account
- Steps:
  1. Create a timed event with "Sync to calendar account" = adityachalla01@gmail.com (QA1015 event, 16 Oct).
  2. Wait for sync to finish (or see sheet "Syncing to your calendar…" end).
  3. Open Week grid for 12–18 Oct; read the Fri 16 Oct 10:00 blocks.
- Expected: The StreamlineOS event appears once. If the Google copy is shown, it is merged/marked "Synced to Google" and not listed as a second event.
- Actual: Friday 16 Oct shows two overlapping blocks: "10:00 AM – 11:30 AM QA1015 Edited title A" (local) and "10:00 AM – 11:00 AM QA1015 <script>alert(1)</script> probe" (read-only Google copy, Etc/UTC). The external copy opens a sheet reading "Read-only event from a connected account. Edit it in its own calendar." with the Google account label. The external copy still has the OLD title and end time.
- Impact: Users see every synced event twice; the stale copy disagrees with the local one (title/end), so people will act on the wrong version. Also the clash toast (CAL-B-005) may be counting the mirror as a conflict with its own event.
- Likely area in code: calendar merge of local + external (provider-synced) events; dedupe by providerEventId / iCalUID is missing or not applied for events created in StreamlineOS and pushed out.
- Suggested fix: When a local event has a provider link (providerEventId), suppress the external mirror in all views (grid, list, my day) or merge them into one item with a sync badge.
- Acceptance check: After creating and syncing one event to Google, exactly one block appears in grid and list; the external sheet is not listed separately.

### CAL-B-007 — OPEN

Edit of a synced event fails with "[object Object]" in the sync error and gives no way to resolve

Latest report note: Synced-event edit fails with "[object Object]": STILL OPEN (re-confirmed this run on a new synced event: red "[object Object]" text, no resolution buttons; see CAL-B-019) | Edited title of the synced event to "…EDITED" → toast "Event updated" → sheet shows red box "Sync to your external calendar failed after 1 attempt. [object Object] The provider copy changed after this event was loaded. Reload it before deciding which version to keep." No Keep/Use buttons. The conflict fired on the first edit of an event created seconds earlier (see new bug CAL-B-019).

- Severity: High
- Route: /calendar?mode=list&event=<id>&eventSource=calendar (event sheet → Edit → Save)
- Actor: signed-in account
- Steps:
  1. Create QA1015 event synced to the Google account (see CAL-B-006), wait for sync.
  2. Open the event sheet (click the block) → Edit → change title to "QA1015 Edited title A" and end time to 11:30 → Save.
  3. Toast "Event updated" then "Syncing to your calendar…" appears. Wait ~5 s; reload the page; reopen the event.
- Expected: The Google copy is updated to the new title/end; no error. If there is a real conflict, the message reads in plain language and offers choices ("Keep StreamlineOS version" / "Keep Google version" / "Reload").
- Actual: Sheet shows red box: "Sync to your external calendar failed after 1 attempt. [object Object] The provider copy changed after this event was loaded. Reload it before deciding which version to keep." The error persists after reload. There is no button to keep either version; the only path is Edit again. The Google copy remains with the old title "QA1015 <script>alert(1)</script> probe" and 11:00 end (see CAL-B-006).
- Impact: Edits to synced events silently diverge from Google; the raw "[object Object]" text is shown to the user; no resolution UI.
- Likely area in code: sync error formatter (String(errorObject) in the sheet's sync-status component); provider 412/ETag conflict path in calendar sync worker; missing conflict-resolution UI.
- Suggested fix: Format the error (show error.message/code); on ETag conflict, auto-refetch the provider copy and retry once, else show "Keep this version / Use Google version" actions.
- Acceptance check: Edit a synced event → Google copy updated within 30 s with no error; if conflict is forced, the sheet shows readable text plus two resolution buttons, and "[object Object]" never appears.

### CAL-B-008 — PARTIAL

Intermittent "Server temporarily unavailable" with CORS preflight failures on api.streamlineos.in

Latest report note: CORS / server unavailable replaces page: STILL OPEN (reproduced, worse) | 3 separate full-page failures: "Couldn't load your workspace – Network error contacting api.streamlineos.in (GET /me/access)"; console CORS preflight blocked for /me/access, /me/preferences, /billing/entitlements. Also "Calendar error – Failed to load the calendar" (see CAL-B-016).

- Severity: Medium (needs repro; observed once)
- Route: /calendar?mode=calendar (after Add → Escape/close of the Calendar accounts sheet)
- Actor: signed-in account
- Steps: Open /calendar, open "Calendar accounts", close it, click "Add to calendar", then take a screenshot a few seconds later.
- Expected: Calendar stays usable; any API hiccup shows a local, retryable error for the one panel.
- Actual: Whole calendar body replaced by "Server temporarily unavailable — The server is not responding. Retrying automatically…". Console: CORS preflight blocked for https://api.streamlineos.in/org/members?limit=100, /calendar/offline-policy and /calendar/saved-views ("No 'Access-Control-Allow-Origin' header is present on the requested resource"), then ApiError "Network error contacting api.streamlineos.in (GET /org/members)". A full page reload restored the calendar.
- Impact: Calendar becomes unusable until reload; unsaved work in the New Event sheet is lost.
- Likely area in code: API gateway CORS config for preflight (OPTIONS) on /org/members and /calendar/*; global error boundary replacing the whole page on one failed fetch.
- Suggested fix: Confirm CORS preflight returns Access-Control-Allow-Origin for www.streamlineos.in on all calendar routes; scope error UI to the failing widget.
- Acceptance check: 50 open/close cycles of Add and Accounts produce no CORS errors; a forced API failure shows an inline retry, not a full-page replacement.

### CAL-B-009 — OPEN

"All occurrences" edit deletes the earlier "This occurrence only" override (occurrence vanishes)

Latest report note: Series edit "All occurrences" drops earlier "This occurrence only" override: STILL OPEN | Series "QA1015R2 Recurring weekly series" (Mon 2 Nov 4–5 PM UTC). Edited Mon 2 Nov → "QA1015R2 Recurring ONE edited" (This occurrence only; toast seen). Then edited Mon 9 Nov → "All occurrences" → "QA1015R2 Recurring ALL edited". Result: Mon 2 Nov row is gone from List (Nov 2–8 shows only standups, re-checked after load). 9, 23 Nov show "ALL edited". Scope dialog pre-selects "All occurrences" (confirmed).

- Severity: High (silent data loss in recurring series)
- Route: /calendar?mode=list&date=2026-10-26&event=event-9-2026-10-26T15%3A00%3A00.000Z (edit), then /calendar?mode=list&date=2026-10-19 and /calendar?mode=calendar&date=2026-10-19
- Actor: signed-in account
- Steps:
  1. Create "QA1015 Recurring weekly sync" 19 Oct 15:00–15:30, Repeat Weekly, Ends after 4 occurrences, sync "Don't sync". Save once. (Occurrences 19, 26 Oct; 2, 9 Nov.)
  2. Open the 19 Oct occurrence → Edit → title "QA1015 Recurring ONE edited" → Save → choose "This occurrence only" → Save. Toast "Occurrence updated". The 19 Oct block shows "QA1015 Recurring ONE edited" (verified in list).
  3. Open the 26 Oct occurrence → Edit → title "QA1015 Recurring ALL edited" → Save → scope dialog defaults to "All occurrences" → Save.
  4. Open List or Week for 19–25 Oct.
- Expected: The 19 Oct occurrence still exists (as "QA1015 Recurring ONE edited", the detached override kept), or at minimum the series edit does not touch an already-detached occurrence; 26 Oct and later show "ALL edited".
- Actual: 19 Oct 3:00 PM occurrence is gone from both List and Week views (only "Daily Team Standup" rows remain on Mon 19). 26 Oct and 2 Nov show "QA1015 Recurring ALL edited". Could not find the 19 Oct occurrence anywhere in the week.
- Additional: the scope dialog "Edit recurring event" defaults to "All occurrences" (radio pre-selected) — risky default for a destructive-looking bulk change.
- Impact: Recurring exceptions are silently lost when the series is edited later; users lose a meeting.
- Likely area in code: recurrence override merge on series update (probably deletes/regenerates exception rows whose recurrence-id matches or re-expands the series from the new DTSTART, dropping overrides).
- Suggested fix: On series update, keep exception/override rows (RECURRENCE-ID based) and only update non-overridden fields; add a test for override survival.
- Acceptance check: Detach one occurrence, then edit all occurrences; the detached occurrence still shows its own title/time; no occurrence disappears.

### CAL-B-010 — OPEN

Drag / resize on an existing event block does not move or resize it; the drag opens a New Event draft

Latest report note: Drag/resize of an existing event: STILL OPEN | Dragging the body of "QA1015R2 TZ display probe" (19 Oct) and dragging its bottom edge both open "New Event" prefilled (10:30–12:30; 11:00 start). Event not moved/resized.

- Severity: Medium (confirm intended design; drag/resize was in test scope)
- Route: /calendar?mode=calendar (Week view)
- Actor: signed-in account
- Steps:
  1. In Week view, press on the middle of the "QA1015 Edited title A" block (Fri 16 Oct, 10:00 AM) and drag down ~4 hours.
  2. Repeat from the bottom edge of the block to extend the end by an hour.
- Expected: The block moves to the new start (or resizes), with a toast "Event moved"; or a clear hint that the event is not draggable.
- Actual: Both gestures open the "New Event" sheet with a prefilled range starting at the drag start time (e.g. Start 11:30, End 12:00 on 16 Oct). The original event does not move and its end time is unchanged (still 11:30 after the attempts). Drag-to-create works on empty slots.
- Impact: Users cannot reschedule by dragging; accidental drags over events open an unsaved draft.
- Likely area in code: week grid event layer lacks pointer handlers for move/resize (or the drag start is captured by the empty-slot create handler underneath the event).
- Suggested fix: Add move/resize handlers on event blocks with snapping to 15 min and a conflict check; keep empty-slot drag-to-create but do not start it from an event's hit area.
- Acceptance check: Drag a timed event to 14:00 → block moves, list shows new time in IST, toast confirms; resize handle extends end.

### CAL-B-012 — OPEN

Mail "Account 2" shows an unrecoverable connector error and the inbox is empty for all accounts

Latest report note: Mail "Account 2" connector error shows tool slug; inbox empty: STILL OPEN (re-checked 15 Oct 00:4x UTC) | /mail still shows red banner "Account 2 / Unable to retrieve tool with slug OUTLOOK_OUTLOOK_LIST_MESSAGES / Reconnect" and "No messages in inbox / Inbox is clear" under All accounts; the sidebar still reports 7 unread. Not clicked Reconnect.

- Severity: High
- Route: /mail (inbox "All messages" and "Inbox")
- Actor: signed-in account
- Steps: Open /mail and wait for the list to load.
- Expected: Messages from connected accounts load, or the account error explains the cause without tool slugs.
- Actual: Red banner "Account 2 — Unable to retrieve tool with slug OUTLOOK_OUTLOOK_LIST_MESSAGES — Reconnect". Below it "No messages in inbox / Inbox is clear". No Google/Gmail messages are listed under "All accounts". I did not click Reconnect (not allowed to reconnect).
- Impact: Mail is unusable for the Outlook connection; the error shows an internal tool slug to end users. Gmail read could not be verified (no messages shown).
- Likely area in code: Outlook connector tool-call error text passed through to UI; connection health not checked before list.
- Suggested fix: Map connector errors to user text ("Outlook needs reconnecting"); hide internal slugs; investigate why Gmail list is empty.
- Acceptance check: Error banner reads "Outlook connection needs attention" with a Reconnect action; no tool slug is shown; Gmail messages appear when the Google account is connected.

### CAL-B-014 — OPEN

Deleting a recurring event deletes the whole series with no scope choice

Latest report note: Delete on recurring event has no scope: STILL OPEN (re-confirmed this run: one Delete on a 9 Nov occurrence removed 9, 16, 23, 30 Nov; dialog still has no scope) | Delete on Mon 16 Nov occurrence opens "Delete Event – This will permanently delete the event. This action cannot be undone." with only Cancel/Delete (no This occurrence / All occurrences). Dialog was cancelled, not confirmed. "Cancel occurrence" (separate alertdialog) does remove only that date (16 Nov gone, 23 Nov kept).

- Severity: High
- Route: /calendar?mode=list&date=2026-10-26&event=event-9-2026-10-26T15%3A00%3A00.000Z (Delete)
- Actor: signed-in account
- Steps: Open any occurrence of a weekly series → Delete → confirm.
- Expected: Dialog asks "Delete this occurrence only / All occurrences" (as the Edit flow does), with "This occurrence only" available, or the user is told it will delete the full series with the count of occurrences.
- Actual: Dialog "Delete Event — This will permanently delete the event. This action cannot be undone." Confirming removed every occurrence of the series (Oct 26, Nov 2 checked empty afterwards). Edit has a scope prompt; Delete does not. Separate "Cancel occurrence" exists in the sheet but is not used by Delete.
- Impact: One click on Delete removes the whole recurring meeting series; irreversible.
- Likely area in code: delete handler for recurring events ignores recurrence scope; the Edit path has the scope dialog.
- Suggested fix: Reuse the Edit scope dialog for Delete (this occurrence / all occurrences), default to "This occurrence only".
- Acceptance check: Delete on an occurrence with "This occurrence only" removes only that date; other dates remain.

### CAL-B-015 — UNKNOWN

Deleting a synced event in StreamlineOS leaves its provider copy behind (read-only mirror stays)

Latest report note: Delete leaves provider copy behind: STILL OPEN (re-confirmed this run with "QA1015R2 Sync conflict first-edit probe": local deleted, read-only Google mirror with original title stays in Week and List. Mirrors for "Google sync probe" (23 Oct) also still present) | Deleted "QA1015R2 Google sync probe EDITED" (toast "Event deleted"). Reload: Week and List show "QA1015R2 Google sync probe" again as External, source adityachalla01@gmail.com, "Read-only event from a connected account. Edit it in its own calendar." Its title is the ORIGINAL title (edit never reached Google). Confirm dialog says only "This will permanently delete the event." Google side not verified (not signed in to Google; not attempted).

- Severity: High
- Route: /calendar?mode=list (event sheet → Delete)
- Actor: signed-in account; events synced to the connected Google account and to the Outlook account (default sync target is "outlook")
- Steps:
  1. Delete "QA1015 Edited title A" (16 Oct, synced to Google) → confirm. Toast/list: local event gone.
  2. Reload /calendar?mode=list&date=2026-10-12.
  3. Delete "QA1015 All-day 100 char…" (20 Oct, default sync = Outlook) → confirm; reload /calendar?mode=list&date=2026-10-19.
- Expected: The provider copy is deleted with the local event (or the user is asked whether to delete it in the connected calendar too). No orphan remains.
- Actual: After step 1 the Google copy still shows as "QA1015 <script>alert(1)</script> probe, 16 Oct 2026 10:00–11:00 · Etc/UTC" with source = connected Google account and the text "Read-only event from a connected account. Edit it in its own calendar." After step 3 the Outlook copy "QA1015 All-day 100 char boundary…, 20 Oct 2026 · All day" remains as read-only. StreamlineOS offers no way to delete these from here.
- Impact: Test/real meetings linger in Google/Outlook after deletion in StreamlineOS; users believe they deleted the meeting. Could not verify the Google-side state directly (the browser is not signed into the connected Google account; I did not sign in).
- Likely area in code: delete path calls local delete only; provider delete job missing or failing silently; mirror rows not reconciled.
- Suggested fix: On delete of a provider-linked event, enqueue provider delete and reconcile mirror rows; show a sync status if it fails.
- Acceptance check: Delete a synced event → within 30 s the provider copy is gone and no read-only mirror appears in list/grid.

### CAL-B-016 — OPEN

Full-page "Calendar error – Failed to load the calendar" replaces the calendar (no retry inside the panel)

Latest report note: Full-page "Calendar error – Failed to load the calendar" (not reproduced again; see entry): High | /calendar

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

### CAL-B-017 — OPEN

RSVP (Accept / Maybe / Decline) fails on the server with "The event attendee record is no longer current"; the choice reverts on reload

Latest report note: RSVP fails: "attendee record is no longer current"; choice reverts on reload: High | event sheet – Your RSVP

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

### CAL-B-018 — OPEN

All-day event that spans several days shows only its start date in List and in the detail sheet (the grid bar is correct)

Latest report note: Multi-day all-day event shows only its start date in List and sheet: Medium | /calendar list + sheet

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

### CAL-B-019 — OPEN

Sync conflict fires on the FIRST edit of a synced event that was created moments earlier (no other change to the provider copy)

Latest report note: Sync conflict on the first edit of a just-created synced event: High | event sheet – sync status

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

### CAL-B-020 — OPEN

Clash check counts an all-day event as overlapping timed events on the same day (false "clashes with 1 event" toast)

Latest report note: Clash toast fires for timed events when an all-day item exists the same day: Medium | New Event – Save

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

### CAL-B-021 — OPEN

Time input shows "00 PM" / "00 AM" / "11:00" for afternoon and evening times (value is correct, label is not)

Latest report note: Time field shows 00 PM / 00 AM / 11:00 for PM times: Medium (confirm) | New Event – time fields

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

### CAL-B-022 — OPEN

Calendar event blocks cannot be opened from the keyboard (Enter/Space do nothing; mouse click works)

Latest report note: Event blocks don't open with Enter/Space (keyboard): Medium | Week/Day/Month grid

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

### CAL-B-023 — PARTIAL

Deleted events stay on screen until a full reload (grid and list keep the row after "Event deleted")

Latest report note: Deleted events remain on screen until reload: Low | list + grid after delete

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

### CAL-B-024 — OPEN

Monthly repeat is hard-wired to "Day 15 of month"; the series ignores the chosen start date and the first occurrence is lost

Latest report note: High: Week grid / recurrence | Monthly repeat hard-wired to day 15; start-date occurrence lost

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

### CAL-B-026 — OPEN

No way to search or filter calendar events: the list filter has only "All events" and the global palette returns no calendar items

Latest report note: Medium: List / search | No calendar filter or event search; palette ignores events

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

### CAL-B-027 — OPEN

No reminder setting on calendar events (New Event or event sheet)

Latest report note: Medium: New Event / event sheet | No reminder control

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

### CAL-B-028 — PARTIAL

Calendar stays on "Loading calendar sources…" for 20+ seconds on direct navigation

Latest report note: Medium: Calendar load | "Loading calendar sources…" for 20+ s on deep link

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

## UX notes that are not done

### Must change

5. **Clash toast does not name the conflict.** "Event created, but it clashes with 1 event already on your calendar." Name the event and time, and offer "View" / "Keep anyway".
4. **Save stays enabled while the form is invalid.** With end before start, the inline text "End must be on or after start" appears but Save is still enabled and clicking it does nothing visible. Disable Save and focus the first invalid field, or show a toast.
3. **Escape silently discards an unsaved New Event.** Typed title and fields vanish with no "Discard changes?" prompt. Add a confirm when the form is dirty.
1. **Default sync target is Outlook, silently.** New Event defaults "Sync to calendar account" to `outlook`. My all-day test event (no sync choice made) was pushed to the Outlook account and now has a read-only copy there. Default should be "Don't sync" or the user's chosen primary, and the selected target should be visible in the summary before Save.
4. **Turn "Add Teams meeting link" off by default** (it is on in every new event; it creates a meeting link for every block and is not mentioned).
2. **Add a timezone line to the New Event form** (e.g. "Asia/Kolkata") so the saved zone is visible before Save. The form has no zone field at all.

### Good to have

12. Positive: Escape returns focus to the "Calendar accounts" trigger; the 100-character title limit has a clear message ("Event title must be at most 100 characters"); blank/space-only titles keep Save disabled; the <script> title renders as literal text (no alert, no HTML injection); event delete shows a clear confirm with "cannot be undone"; Mail composer blocks an empty body ("Message body is required").
11. Console: /inventory/warehouses returns 402 (payment required) on the Capacity sheet and shows no in-app message. Show a plan-upgrade notice instead of a raw error.
10. Sheets for "Calendar accounts" and "Event sources" are not announced as dialogs (no dialog role in the accessibility tree), which affects screen readers and Escape focus management.
9. Week navigation: the first click on "Previous week" / "Next week" sometimes did not move the range in my runs (two attempts, then worked with a forced click). Needs repro before filing; logged here only.
8. Share button gives no visible result in the header (no sheet, no toast, focus ring only). Confirm what it does or hide it.
7. "Loading calendar sources…" appears for several seconds on every load and the list is briefly partial (standups/external events pop in after). Show a skeleton per source or a count.
6. Event detail sheet shows loading skeletons for a noticeable time before the Edit button renders; clicking Edit too early does nothing. Show the Edit button immediately or disable it with a spinner.
5. Edit form for an existing event hides Sync account, Teams link, and recurrence rule (only the scope dialog appears). Users cannot see or change the repeat rule from Edit.
4. "Add Teams meeting link" is ON by default for every new event, including Google-synced ones. Default off unless the account is Outlook/Teams.
3. Source filter state ("Event sources" toggles) is not reflected in the URL, so a filtered view cannot be shared or bookmarked. Holidays off persisted across reload (good), but the URL does not say so.
2. Week grid labels are cut off where events overlap (e.g. "12:51 PM – 1:5", "Calendar Outlook…" clipped). Use stacked lanes or show a "+n more" chip.
1. Time inputs in New Event are too narrow: "10:00 AM" renders as "00 AM" in the time box (described in words; no screenshot kept). Widen the field or use a 24-hour mask with a visible format hint.
13. **Holes in the standup series.** No standup is shown for the weeks of 16 Nov and 7 Dec (OBSERVED; cause not checked). If that is intended, label it; if not, check the series exceptions.
12. **Loading states.** The List view showed "Loading events" for more than 25 s on a cold load of one week (once), and provider rows (External) appear late or not at all (List vs Week mismatch). Show a progress state per source.
11. **"Teams link on by default"** adds a Join link to every new event. Make it opt-in or remember the last choice.
10. **Organiser label.** "Created by adityachalla01" shows the login name, not the display name.
9. **Title limit feedback.** The 100-character limit is only enforced on Save ("Event title must be at most 100 characters"). Show a counter at 80+.
8. **"Create" and "Add to calendar" both exist** in the header with similar roles. Pick one name for "new event".
7. **Slow sheet open.** The event sheet shows grey skeleton blocks for 2–5 s, and Edit/Delete appear only after sync finishes (about 5 s). Show Edit/Delete at once and disable them only while a sync is running.
5. **Keyboard shortcuts for day navigation.** ArrowLeft/Right and "t" (today) do nothing in Day or Week view. The Previous/Next buttons work with Enter, so add the shortcuts and list them in a help hint.
4. **Cannot log a past meeting.** Past dates are disabled in the picker, so a meeting that already happened can't be added. Allow it with a "logged after the fact" flag.
3. **Past times on today are accepted silently.** The date picker blocks past days, but a 00:05 start on today's date saves with no warning. Either block both or warn "This starts in the past".
2. **Month view "+2 more"** hides events with no visible list. Let the chip open the day.
1. **Grid readability for overlapping events.** Two or three overlapping events render as narrow, truncated blocks ("2:00 PM – 2…", "QA10…"). Show a count chip or open a list on hover/click.
12. Toast "Event created, but it clashes…" should be an action toast with "View" to jump to the clashing event.
11. Drag-to-create on an empty slot starts a 3-hour default span (10:30 → 1:30 PM) when the drag is short; shorten to the drag length or 30 minutes.
10. Discarding the sheet by mis-click loses the draft; add an "unsaved changes" confirm.
9. New Event sheet keeps "Oct 15" as the default date even when the user is looking at Oct 21; default to the day being viewed.
7. Week grid: overlapping events render at 1/3 width with titles cut off; show the count ("+2") or stack them side-by-side at readable width.
6. Share menu: "Email calendar" sends mail directly from the menu; consider a confirm step (not tested — sending was out of scope).
5. "Sources" button should open a panel or show a state; it currently changes nothing visible.
2. Event search in the ⌘K palette ("QA1015R3" returns "No results" while events exist).
