# Calendar QA Round 1 — COVERAGE (2026-10-15)

Environment: https://streamlineos.in (served as www.streamlineos.in), signed-in user (org "ADitay CAhala"), one browser tab kept open, account timezone Asia/Calcutta. Google account (connected, not re-connected) used as the sync target. Test addresses: qa1015cal@sharklasers.com only.

## Routes and views mapped

| Route / view | What I checked | Result |
|---|---|---|
| /calendar?mode=calendar (Week, default) | Grid render, day headers, all-day row, now-line, event blocks, Prev/Next, Today | Works; times in UTC (CAL-B-001) |
| /calendar?mode=calendar&view=day | Day view via "Calendar view" combobox → Day; heading "Monday, October 19, 2026" | Works |
| /calendar?mode=calendar&view=month | Month view; all-day and timed events; duplicate mirror blocks visible (CAL-B-006) | Works with bugs |
| /calendar?mode=list | List grouped by date; "All day", source tag (General/External/Task); per-row times with zone label | Works; source only "External" |
| /calendar?mode=history | History newest→oldest, historyBefore/historyPages params | Works; shows IST |
| /calendar?mode=my-day | My Day list: Action needed / For your information, RSVP labels | Works |
| Event detail sheet (&event=<id>&eventSource=calendar) | Join meeting, created by, RSVP buttons, Edit, Export day, Delete, Protect time, Cancel occurrence (recurring) | Works; loading skeleton delay |
| External (read-only) sheet (&eventSource=external) | Read-only copy from Google/Outlook; "Open in calendar" | Works; should be merged (CAL-B-006) |
| New Event sheet (Add to calendar) | Title, date, time, end, All day, attendees, category, color, repeat, notes, sync target, Teams toggle, room, linked ticket | Works with bugs (CAL-B-002/003/004) |
| Edit Event sheet | Title, times, end (after "+"), scope dialog for recurring | Works; no repeat/sync fields (UX) |
| Delete Event confirm | Single and recurring | Works; no scope (CAL-B-014) |
| Calendar accounts sheet | Outlook (Default) and Google toggles; star and disconnect icons present (not used) | Opens; not dialog role |
| Event sources sheet | 8 toggles: Calendar events, Tasks, Build tickets, Leaves, Interviews, Attendance, Holidays, HR milestones | Holidays toggle persisted across reload; restored to ON |
| Saved view combobox | Only "All events" option; Save view button not exercised | Limited |
| Capacity / My time insights sheet | Tabs: Rooms and equipment, My capacity, People, Warehouse work; resource select; start/end; units | Opens; UTC defaults; 402 for warehouses |
| Share, Attendance, HR events toggles | Present in header | Share: no visible result; Attendance/HR toggles not exercised in depth |
| Ask OS, Notifications, Search (⌘K) | Not tested | — |
| /mail (Inbox, Compose, Sent) | Account 2 error banner; empty inbox; Compose From/To/Subject/body; Send | Outlook error (CAL-B-012); send 500 (CAL-B-011) |
| Google Calendar web (calendar.google.com) | Attempted to verify synced event | Not signed in to the connected account in this browser; account chooser showed other accounts. Did NOT sign in. |

## Test matrix

| Area | Test | Status | Bug |
|---|---|---|---|
| Views | Day/Week/Month/List/History/My Day switching; URL mode/date/view params | Done | CAL-B-001 (UTC grid) |
| Create | Timed event with title, date, start/end | Done (created) | CAL-B-002 |
| Create | All-day event | Done (created 20 Oct, Outlook sync by default) | UX #1, CAL-B-015 |
| Create | Long title (350 chars) | Done — rejected: "Event title must be at most 100 characters" | — (pass) |
| Create | Exactly 100 chars | Done — saved | — (pass) |
| Create | Blank / whitespace title | Done — Save disabled | — (pass) |
| Create | End before start | Done — inline "End must be on or after start"; Save not applied | UX #4 |
| Create | <script> title | Done — rendered as text, no alert | — (pass) |
| Create | Double-click Save | Done — 2 events created, one deleted | CAL-B-003 |
| Create | Attendee qa1015cal@sharklasers.com | Done — not addable (org members only) | CAL-B-004 |
| Create | Recurring weekly, 4 occurrences | Done — occurrences on 19 Oct, 26 Oct, 2 Nov (9 Nov not separately checked) | — |
| Edit | Title + end time persisted after reload | Done | CAL-B-007 (sync error) |
| Edit | Blank/whitespace title on edit | Done — Save disabled | — (pass) |
| Edit | Recurring: this occurrence only | Done — list shows changed title for 19 Oct | — (pass at that step) |
| Edit | Recurring: all occurrences | Done — but removed 19 Oct override | CAL-B-009 |
| Edit | Recurring scope default | Observed — defaults to All occurrences | UX #2 |
| Delete | Single event (duplicate, retitled, all-day, conflict probe) | Done — local removed; provider copies remain | CAL-B-015 |
| Delete | Recurring series | Done — whole series removed without scope | CAL-B-014 |
| Drag / resize | Move a timed block; resize from bottom edge | Done — did NOT move/resize; opened New Event | CAL-B-010 |
| Drag / resize | Drag on empty slot creates draft | Observed — works (opens New Event prefilled) | — |
| Conflicts | Overlap with recurring occurrence (26 Oct 3–3:30 PM) | Done — toast shown; does not name event | CAL-B-005 |
| Conflicts | Overlap with existing standup | Not done | — |
| Timezone | Display of event times, now-line, defaults, capacity | Done | CAL-B-001, CAL-B-002 |
| Google sync (StreamlineOS → Google) | Event saved with sync to connected Google account appears as provider copy | Done (visible back in StreamlineOS as read-only copy); not verified in Google web | CAL-B-006, CAL-B-007 |
| Google sync (Google → StreamlineOS) | Create an event in Google and check it appears | Not done — cannot create in Google without signing in; existing Google/Outlook copies do appear (External) | — |
| Outlook sync | Default target Outlook | Done — all-day event produced an Outlook copy | UX #1 |
| Invites | Attendee invite email to test address | Not done — cannot add external attendee | CAL-B-004 |
| Filters | Source toggles (Holidays off/on) and persistence after reload | Done | UX #3 |
| Filters | Saved view options | Done (only "All events") | — |
| URL sync | mode/view/date/event params; history back/forward | Done (Day ↔ Week ↔ List ↔ History via Back/Forward) | — |
| Back / Forward | Browser Back from Day view and List view | Done | — (pass) |
| Refresh persistence | Reload after edit, create, delete, source toggle | Done | — (pass, except CAL-B-007 persisted) |
| Keyboard / focus | Escape closes Calendar accounts and New Event; focus returns to Calendar accounts button | Partly done | UX #3 (Escape discards draft) |
| Keyboard | Full tab order through grid and sheets | Not done (time-boxed) | — |
| Double-click save | Done | CAL-B-003 | |
| Reconnect / disconnect Google | Not done (forbidden for this round) | — | — |
| Mail read | Inbox/All accounts | Done — Outlook error; no Google messages shown | CAL-B-012 |
| Mail compose | To qa1015cal@sharklasers.com; empty-body validation; send | Done — body validation pass; send returned 500 (not retried) | CAL-B-011 |
| Capacity | Open sheet; resource options | Partly — no resource selected, no booking attempted | UX #9 / Good #11 |
| Payments | None | Not applicable | — |

## Not executed / limits
- Google-side verification: the browser is not signed into adityachalla01@gmail.com (account chooser lists other accounts). I did not sign in or reconnect.
- Attendee invitations: external guest cannot be added, so no invite email was sent (no mail to sharklasers from calendar).
- Recurring "Cancel occurrence", "Protect time", "Export day", RSVP Accept/Maybe/Decline, Join meeting: not exercised (would change state or are out of scope for round 1).
- Attendance / HR events header toggles and Ask OS: not exercised.
- Drag-to-move of events: not possible in this build; only observed behaviour recorded.
- Screenshots: none saved to /screenshots — all bugs were describable in words.
