# Calendar QA Round 1 — BUGS (2026-10-15)

Account: signed-in user (org "ADitay CAhala"); account timezone = Asia/Calcutta (IST).

Test data prefix: QA1015. See TEST-DATA.md for created/deleted items and leftovers.

Severity scale: Blocker / Critical / High / Medium / Low.

Index: CAL-B-001 time shown in UTC (grid); CAL-B-002 new event saved as UTC; CAL-B-003 double-click duplicates; CAL-B-004 external invitee not addable; CAL-B-005 clash toast; CAL-B-006 duplicate Google mirror; CAL-B-007 sync error [object Object]; CAL-B-008 CORS/server-unavailable; CAL-B-009 recurrence override lost; CAL-B-010 drag/resize; CAL-B-011 send 500; CAL-B-012 Outlook connector error; CAL-B-014 recurring delete scope; CAL-B-015 delete leaves provider copy.

## Page: Calendar week grid, Day and Month views (/calendar?mode=calendar)

### CAL-B-001: Week grid shows event times in UTC while list/history/detail show Asia/Calcutta
- Severity: High
- Route: /calendar?mode=calendar (Week view, Calendar View toggle)
- Actor: signed-in account (timezone Asia/Calcutta)
- Steps:
  1. Open /calendar in Week view (default).
  2. Look at the existing event "Calendar past-event regression check 2026-10-14".
  3. Switch to List View (/calendar?mode=list) or History (/calendar?mode=history) and read the same event.
- Expected: Every view shows the same wall-clock time in the user's timezone (Asia/Calcutta): "6:16 PM – 7:16 PM".
- Actual (grid): block labelled "12:46 PM – 1:46 PM" positioned at 12:46 PM–1:46 PM. Same for "Calendar Outlook regression check 2026-10-14" shown as "12:51 PM – 1:51 PM".
- Actual (list/history): "14 Oct 2026, 6:16 pm – 7:16 pm · Asia/Calcutta (12:46 pm UTC)".
- Related: the grid's current-time line sits near 6:55 PM on Wed 14 (UTC clock; IST is 12:26 AM Thu 15). The "Day/Week/Month" grid, the now-line and the new-event default time (the time field opens at the UTC clock, e.g. "18:58" when IST was 00:58) all use UTC.
- Impact: Users in IST see every timed event offset by −5:30 in the grid; they will miss or double-book meetings and drag/resize writes wrong times. Highest-impact calendar defect in this round.
- Likely area in code: calendar grid time-to-position / formatting util (probably using Date local getHours on UTC-normalised values or a hard-coded 'UTC' tz in the grid component); check the timezone prop passed from the org/user profile to CalendarGrid.
- Suggested fix: Use the user's profile timezone (Asia/Kolkata) for grid placement, now-line, and default times; ensure list/history/grid share one tz helper.
- Acceptance check: With account tz Asia/Calcutta, event at 18:16–19:16 IST appears in the grid at the 6:00 PM row, now-line matches IST clock, and the new-event default start equals the current IST time rounded.

### CAL-B-005: "Clashes with 1 event" warning raised with no visibly overlapping event
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

### CAL-B-010: Drag / resize on an existing event block does not move or resize it; the drag opens a New Event draft
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

## Page: New Event sheet (/calendar?mode=calendar → Add to calendar)

### CAL-B-002: New event is saved in UTC; no timezone control; user-entered wall time is treated as UTC
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

### CAL-B-003: Double-click on Save creates duplicate events
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

### CAL-B-004: Attendee picker only lists org members — external invitee (qa1015cal@sharklasers.com) cannot be added
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

## Page: Calendar list and event detail/edit sheet (/calendar?mode=list&event=<id>)

### CAL-B-006: Local event and its Google mirror both shown in the calendar (duplicate display)
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

### CAL-B-007: Edit of a synced event fails with "[object Object]" in the sync error and gives no way to resolve
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

### CAL-B-009: "All occurrences" edit deletes the earlier "This occurrence only" override (occurrence vanishes)
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

### CAL-B-014: Deleting a recurring event deletes the whole series with no scope choice
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

### CAL-B-015: Deleting a synced event in StreamlineOS leaves its provider copy behind (read-only mirror stays)
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

## Page: Calendar page as a whole (/calendar)

### CAL-B-008: Intermittent "Server temporarily unavailable" with CORS preflight failures on api.streamlineos.in
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

## Page: Mail (/mail) — compose and account health (Gmail/Outlook integration)

### CAL-B-011: Send from Mail fails with HTTP 500 and the composer gives no error message
- Severity: High
- Route: /mail → Compose → New message (From: "Account 2") → Send
- Actor: signed-in account
- Steps:
  1. Click Compose. From = Account 2. To = qa1015cal@sharklasers.com (test address only). Subject "QA1015 Calendar round 1 compose check". Body "QA1015 test message from calendar QA round 1. Ignore." (Validation with empty body works: "Message body is required".)
  2. Click Send. Wait 10 s.
- Expected: Message is sent and the composer closes with "Sent" confirmation; or a clear error ("Could not send: <reason>") stays in the composer.
- Actual: Button shows "Sending…" and then reverts to "Send". No toast, no inline error, composer stays open. Console: "Failed to load resource: the server responded with a status of 500 () @ https://api.streamlineos.in/mail/send". Sent folder shows no QA1015 item. (Not retried to avoid duplicate sends.)
- Impact: Users think mail went out when it did not (or lose the message); no feedback.
- Likely area in code: mail send mutation has no error handler / toast for 5xx; Account 2 (Outlook) has a broken tool connection (see CAL-B-012).
- Suggested fix: Surface send errors inline with retry; fix the Outlook connector failure.
- Acceptance check: With a healthy account, send to the test address shows a success toast and the message appears in Sent; with a forced 500, the composer shows "Couldn't send — try again" and keeps the draft.

### CAL-B-012: Mail "Account 2" shows an unrecoverable connector error and the inbox is empty for all accounts
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
