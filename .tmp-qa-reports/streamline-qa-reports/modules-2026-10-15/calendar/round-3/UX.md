# Calendar QA Round 3 — UX (2026-10-15)

## Must change

1. **Show event times in the account timezone everywhere** (grid, now-line, New Event defaults, sheet). Today the grid and form use UTC while List says IST (CAL-B-001/002). Users will misplace meetings.
2. **Add a timezone line to the New Event form** (e.g. "Asia/Kolkata") so the saved zone is visible before Save. The form has no zone field at all.
3. **Default "Sync to calendar account" to "Don't sync" (or the last choice), not "outlook".** The default is an account whose connector errors (CAL-B-012), so new events go to a broken target without the user noticing.
4. **Turn "Add Teams meeting link" off by default** (it is on in every new event; it creates a meeting link for every block and is not mentioned).
5. **Time fields must show the value they hold:** "10:00" reads "00 AM", "10:30" reads "30 AM", "15:48" reads "03:48" with no AM/PM (CAL-B-021).
6. **Recurrence default day**: "Day 15 of month" when the event is on the 23rd (CAL-B-024). Show the next three dates under the repeat setting so the user can check them.
7. **Calendar error must not blank the page**: replace the full-page "Calendar error — Failed to load the calendar" with an in-panel retry (CAL-B-016); the header and the open sheet should stay.
8. **Clash toast must name the clashing event and its time** (CAL-B-005), and must not fire for all-day items that do not overlap (CAL-B-020).
9. **Delete on recurring events must ask the scope** ("This occurrence only" / "All occurrences"), default "This occurrence only" (CAL-B-014).
10. **Mobile Week view** must not render seven unreadable columns at 390 px (CAL-B-025). Default to Day/Agenda below ~640 px.
11. **All-day ranges**: List rows and the sheet should show "27 Oct – 29 Oct · All day" (CAL-B-018).
12. **RSVP for the organiser**: hide the RSVP row (or say "You organise this event") (CAL-B-017). Accept currently shows "You're going" and then reverts on reload.

## Good to have

1. A calendar search box and a source/calendar filter in the List header; the current dropdown has only "All events" (CAL-B-026).
2. Event search in the ⌘K palette ("QA1015R3" returns "No results" while events exist).
3. Reminder control on events (CAL-B-027).
4. Progressive loading: show StreamlineOS events first, provider sources after (CAL-B-028).
5. "Sources" button should open a panel or show a state; it currently changes nothing visible.
6. Share menu: "Email calendar" sends mail directly from the menu; consider a confirm step (not tested — sending was out of scope).
7. Week grid: overlapping events render at 1/3 width with titles cut off; show the count ("+2") or stack them side-by-side at readable width.
8. Keyboard: Enter/Space on a focused event block should open it (CAL-B-022); add a visible focus ring.
9. New Event sheet keeps "Oct 15" as the default date even when the user is looking at Oct 21; default to the day being viewed.
10. Discarding the sheet by mis-click loses the draft; add an "unsaved changes" confirm.
11. Drag-to-create on an empty slot starts a 3-hour default span (10:30 → 1:30 PM) when the drag is short; shorten to the drag length or 30 minutes.
12. Toast "Event created, but it clashes…" should be an action toast with "View" to jump to the clashing event.
