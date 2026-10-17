# Calendar QA Round 3 — COVERAGE (2026-10-15, 21:17–22:10 IST)

Single owner session, one browser tab. Test prefix QA1015R3. Result key: PASS / FAIL (bug ID) / NOT RUN (reason) / OBSERVED.

## Recheck CAL-B-001..023
See BUGS.md section 1 for every item and its status. Summary: 16 still open, 2 partial/intermittent, 4 not re-run (006, 007, 011, 019), 1 cannot recheck (013).

## New coverage this round

| Area | Check | Result |
|---|---|---|
| Mobile viewport (390 px) | DevTools device mode at 390 × 1026 (Week, List, New Event sheet) | FAIL CAL-B-025: Week unreadable; List readable; New Event bottom sheet fits |
| Recurring — monthly | Monthly, Day 15 default, After 3 occurrences | FAIL CAL-B-024 (23 Oct missing; series on the 15th) |
| Recurring — monthly overrides | Edit one occurrence (This only) then all occurrences | FAIL CAL-B-009 (override lost) |
| Recurring — delete scope | Delete on a series occurrence | FAIL CAL-B-014 (no scope) |
| Recurring — yearly | Yearly, Ends = Never (the "After N" choice did not stick) | PASS for save and display (24 Oct 1:00–1:30 PM); series occurrences past 24 Oct not checked; series deleted at cleanup |
| Reminders | Looked for a reminder control in New Event, Edit, Organization Settings | FAIL CAL-B-027 (none found) |
| Time-zone setting | Read Organization → Localization (TIMEZONE = Asia/Calcutta, TIME FORMAT = 12-hour) | OBSERVED: setting exists and is IST; grid/new events ignore it (CAL-B-001/002). Changing the org timezone was NOT tested: it is an org-wide change and was not authorised. |
| Agenda print/export | List header (Attendance, HR events, Sources, Share, link icon), Share menu (Booking pages, Copy link, Email calendar, Embed calendar), event sheet "Export day" | OBSERVED: no print for the agenda; "Export day" exists in the sheet (not run). "Email calendar" NOT RUN (sends email). |
| Search / filter | List "All events" dropdown; Sources button; ⌘K palette for "QA1015R3" | FAIL CAL-B-026 |
| Clash all-day | Timed 21 Oct 14:00 beside "OOO" leave item | PASS (plain Event created) |
| Clash all-day multi-day | Timed 28 Oct 14:00 beside all-day 27–29 Oct | FAIL CAL-B-020 |
| Named clash | Timed 21 Oct 10:30 overlapping 10:00 probe | FAIL CAL-B-005 (no name) |
| External attendee | qa1015r3@sharklasers.com entered in Add attendees (no save) | FAIL CAL-B-004 ("No members found.") |
| Double-click Save | 22 Oct probe | FAIL CAL-B-003 |
| Drag/resize | Drag body of a block | FAIL CAL-B-010 |
| Keyboard | Focus block → Enter | FAIL CAL-B-022 |
| RSVP (owner) | Accept on own event; reload | FAIL CAL-B-017 (not persisted) |
| Mail banner | /mail | FAIL CAL-B-012 (same slug error) |
| Full-page error | Fresh loads of calendar routes | FAIL CAL-B-016 (6+ times; React #185 in console) |
| Deep links | Missing event, invalid date | Not repeated this round (R2 PASS) |
| Global search for events | ⌘K "QA1015R3" | FAIL CAL-B-026 |

## Not run / limits

- CAL-B-006/007/019: no synced event created — each would add a Google write that only the owner can clean up. R2 evidence stands.
- CAL-B-011: email send forbidden this round.
- CAL-B-008 CORS: not seen in the captured error-level console messages; no full console capture was saved, so this is not proof of absence.
- Time-zone change: not tested (org-wide setting).
- Export day / Email calendar: not run (download / email).
- Week grid at 390 px: only the Week and List views were compared; Month and Day not checked on mobile.
- Round-2 CAL-B-021 "00 PM" check was repeated on desktop only.
- Calendar load errors blocked several flows; each blocked flow was retried, and any flow still blocked is marked NOT RUN above.

## Tools/limits note
- The calendar full-page error (CAL-B-016) frequently interrupted direct navigations; the New Event sheet lost its draft twice.
- Mobile check used Chrome DevTools device toolbar (docked, then closed). The tab was kept open throughout.
