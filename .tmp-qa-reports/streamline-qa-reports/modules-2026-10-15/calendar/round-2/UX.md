# Calendar QA Round 2 — UX notes (2026-10-15)

Scope: StreamlineOS Calendar as the owner (IST account). Bug IDs refer to BUGS.md. "Must change" = users will get the wrong meeting time, lose data, or cannot complete a task. "Good to have" = friction or polish.

## Must change

1. **Times are entered and shown in UTC for an IST user.** The new-event default time follows the UTC clock (12:36 AM while IST is 6:06 AM) and new events save without a timezone (CAL-B-001, CAL-B-002). Add a timezone label to the sheet, default to the profile timezone, and fix the grid.
2. **Time field is unreadable for PM and morning times.** 15:00 shows "00 PM", 09:00 shows "00 AM", 23:00 shows "11:00" (CAL-B-021). Users can't confirm what they picked.
3. **New events sync to Outlook by default.** "Sync to calendar account" preselects "outlook" with "Add Teams meeting link" on. Outlook is currently in error (CAL-B-012), so the default path is the broken one. Default to "Don't sync" (or the last choice) and show the target in the sheet header.
4. **Recurring delete has no scope.** One Delete on any occurrence removed every occurrence of the series, with only "This will permanently delete the event." (CAL-B-014). Offer "This occurrence / All occurrences" and default to "This occurrence".
5. **Synced events can't be edited without a conflict.** The first edit of a just-created synced event fails with "[object Object]" and no way to choose a version (CAL-B-019, CAL-B-007). Show readable text and "Keep StreamlineOS version" / "Use Google version".
6. **Deleting a synced event leaves a read-only copy with the old title** (CAL-B-015). Either delete the provider copy or tell the user it stays in Google, with a link to delete it there.
7. **RSVP fails on the owner's own event and shows a false "You're going".** The error reads "The event attendee record is no longer current" and the choice reverts after reload (CAL-B-017). Hide RSVP for the organiser, or make it work.
8. **Whole-page error replacements.** One failed API call replaces the calendar, and any open New Event draft is lost (CAL-B-008, CAL-B-016). Keep the header and sheet mounted and show a retry in the panel.
9. **False and unnamed clash warnings.** A same-day all-day item triggers "clashes with 1 event" for a timed meeting that doesn't overlap (CAL-B-020), and the toast never names the event (CAL-B-005). Name the event and time, and exclude non-overlapping all-day items.
10. **Multi-day all-day events read as one day** in the List row and detail sheet (CAL-B-018). Show "29 Oct – 31 Oct · All day".
11. **Event blocks can't be opened from the keyboard** (CAL-B-022). Enter and Space must open the event; this is also a WCAG 2.1.1 issue.
12. **Duplicate standup rows.** Each day shows two "Daily Team Standup · External" rows with no account label (CAL-B-006 family). Merge or label them so a user can tell which one is theirs.

## Good to have

1. **Grid readability for overlapping events.** Two or three overlapping events render as narrow, truncated blocks ("2:00 PM – 2…", "QA10…"). Show a count chip or open a list on hover/click.
2. **Month view "+2 more"** hides events with no visible list. Let the chip open the day.
3. **Past times on today are accepted silently.** The date picker blocks past days, but a 00:05 start on today's date saves with no warning. Either block both or warn "This starts in the past".
4. **Cannot log a past meeting.** Past dates are disabled in the picker, so a meeting that already happened can't be added. Allow it with a "logged after the fact" flag.
5. **Keyboard shortcuts for day navigation.** ArrowLeft/Right and "t" (today) do nothing in Day or Week view. The Previous/Next buttons work with Enter, so add the shortcuts and list them in a help hint.
6. **Stale rows after delete** (CAL-B-023). The deleted row stays until a reload. Remove it on success.
7. **Slow sheet open.** The event sheet shows grey skeleton blocks for 2–5 s, and Edit/Delete appear only after sync finishes (about 5 s). Show Edit/Delete at once and disable them only while a sync is running.
8. **"Create" and "Add to calendar" both exist** in the header with similar roles. Pick one name for "new event".
9. **Title limit feedback.** The 100-character limit is only enforced on Save ("Event title must be at most 100 characters"). Show a counter at 80+.
10. **Organiser label.** "Created by adityachalla01" shows the login name, not the display name.
11. **"Teams link on by default"** adds a Join link to every new event. Make it opt-in or remember the last choice.
12. **Loading states.** The List view showed "Loading events" for more than 25 s on a cold load of one week (once), and provider rows (External) appear late or not at all (List vs Week mismatch). Show a progress state per source.
13. **Holes in the standup series.** No standup is shown for the weeks of 16 Nov and 7 Dec (OBSERVED; cause not checked). If that is intended, label it; if not, check the series exceptions.
