# Calendar QA Round 2 — COVERAGE (2026-10-15, continuation)

Single owner session, one browser tab. Test prefix QA1015R2. Result key: PASS / FAIL (bug ID) / NOT RUN (reason) / OBSERVED (not a verified bug).

## Views and navigation

| Area | Check | Result |
|---|---|---|
| List (agenda) view | Load 5 weeks (5, 12, 19, 26 Oct; 2, 9, 16, 23, 30 Nov; 7, 14, 21 Dec) for QA1015R2 rows | PASS for loading; OBSERVED: provider-mirror rows sometimes missing from List but present in Week (race with "Loading calendar sources…"). Standups missing in Nov 16 and Dec 7 weeks (OBSERVED, cause not checked) |
| Week grid | Load Oct 19 and Oct 26 weeks; read blocks; overlapping blocks | PASS with notes: overlapping blocks are 1/3-width and truncated (UX.md). Times stored as UTC (CAL-B-001/002 still open) |
| Day view | Oct 26, Oct 29 (multi-day bar shown); Next day button (Enter works) | PASS. ArrowRight, "j", "t" do nothing (no shortcuts) — UX.md |
| Month view | October 2026; QA items and "+2 more" on Oct 20 | PASS for display; "+N more" hides items without a list (UX.md) |
| History | Loads past events (Oct 15 past probe listed) | PASS |
| Previous/Next week rapid clicks | 6 forward + 6 back | PASS (no error page) |
| Deep links | ?date=2026-13-45 (invalid) and ?event=event-999999 (missing) | PASS: falls back to current week / list with no error page |
| Full-page errors | Observed during run: "Server temporarily unavailable" (Week, 19 Oct; auto-recovered) and "Couldn't load your workspace – Network error contacting api.streamlineos.in (GET /me/access)" (List, 26 Oct; "Try again" worked) | FAIL CAL-B-008 / CAL-B-016 |
| "Calendar error – Failed to load the calendar" | Tried list, week, month, day, history, invalid deep links, rapid navigation | NOT REPRODUCED (CAL-B-016 kept as reported; re-capture needed) |

## Create (New Event sheet)

| Check | Result |
|---|---|
| Title 100 chars limit | 302-char title: inline error "Event title must be at most 100 characters" and Save blocked — PASS |
| Title with HTML/script | `<img onerror>` + `<script>` title rendered as text in List, Week and Month; no element injected, no alert — PASS |
| End before start | Inline "End must be on or after start" and Save did not create the event — PASS |
| Past date | Previous days disabled in the date picker — PASS (but see UX: cannot log a past meeting) |
| Past time today | 00:05–00:30 today accepted with no warning — OBSERVED (UX) |
| All-day multi-day (29–31 Oct) | Grid bar spans three days — PASS; List row and detail sheet show only 29 Oct — FAIL CAL-B-018 |
| Clash control, no overlap (Tue 27 Oct 22:00–23:00) | No clash toast — PASS |
| Clash control with all-day event (Fri 30 Oct 14:00–14:30) | "clashes with 1 event" toast — FAIL CAL-B-020 |
| Time field display | Shows "00 PM" / "00 AM" / "11:00" for PM and morning values; saved value correct — FAIL CAL-B-021 (confirm on device) |
| Default date/time | Default time follows the UTC clock (12:36 AM while IST is 6:06 AM) — FAIL (CAL-B-001/002, still open) |
| Default sync target | "outlook" is preselected for new events (Outlook connection is in error per CAL-B-012) — OBSERVED (UX must-change) |
| Double-click Save | Not re-run (CAL-B-003 still open from the earlier run); no new duplicate created this run |
| External attendee | qa1015r2@sharklasers.com → "No members found." — FAIL CAL-B-004 (still open) |
| Sync to Google at create | Event created with "Event created — syncing to your calendar" — PASS for create |

## Edit and sync

| Check | Result |
|---|---|
| First edit of a just-synced event | Red "[object Object] … The provider copy changed…" with no buttons — FAIL CAL-B-019 (and CAL-B-007 text) |
| Edit button on new synced events | Appears only after sync finishes (~5 s); before that the sheet lacks Edit/Delete — OBSERVED |
| Drag/resize | Not re-run this round (CAL-B-010 open from round 1) — NOT RUN |
| Recurring edit scope | Not re-run (CAL-B-009 open from round 1) — NOT RUN |

## Delete

| Check | Result |
|---|---|
| Local event delete (confirm dialog "This will permanently delete the event.") | PASS: removed after reload (clash control, xss probe, all-day, past probe, 30 Oct clash control, double-click duplicates, TZ probe, clash probes) |
| Delete leaves UI row until reload | FAIL CAL-B-023 (Low) |
| Synced event delete | Local copy removed; read-only Google mirror remains (L1, L2) — FAIL CAL-B-015 |
| Recurring series delete | Confirm dialog has no scope; one Delete removed all occurrences 9–30 Nov — FAIL CAL-B-014 (still open) |

## RSVP

| Check | Result |
|---|---|
| Accept on own event | Shows "You're going" then red "The event attendee record is no longer current"; reverts to "No response yet" after reload — FAIL CAL-B-017 (2 attempts) |
| Maybe on own event | Same error, shows "You might go", reverts — FAIL CAL-B-017 |
| Decline | Not run (same code path expected) |
| RSVP as invitee | NOT RUN — no external invitee can be added (CAL-B-004), so there is no second-account invitation |
| Hide RSVP for organiser | Not hidden; "Created by adityachalla01" shown above it — OBSERVED |

## Keyboard and accessibility

| Check | Result |
|---|---|
| Tab to "Next day" then Enter | PASS |
| Enter / Space on focused event block | FAIL CAL-B-022 (mouse click works) |
| Escape closes event sheet | PASS |
| Escape closes popover in date picker (sheet stays) | PASS |
| Arrow keys / j / t navigation in Day view | NOT SUPPORTED — UX good-to-have |
| Focus after closing sheet | Not verified (no focus indicator checked) |

## Mail (recheck only)

| Check | Result |
|---|---|
| CAL-B-011 Send 500 | NOT RUN — would send an email as the owner; routed to DraftExternalMessage (parent) |
| CAL-B-012 Outlook connector slug | STILL OPEN — slug shown, inbox empty under All accounts |

## Not covered this round

Timezone switch in settings; Outlook sync path (create/edit/delete with Outlook as target); reminders; Holidays/Attendance source toggles; "Save view"; Capacity and "My time insights"; Export day / CSV; "Protect time"; "Meeting workspace"; share and link buttons; search (⌘K); Ask OS; mobile widths; screen-reader names beyond the accessibility tree; multi-account (second Google) sync; email invitations (no external guest possible).
