# Calendar QA Round 1 — UX findings (2026-10-15)

Bugs are in BUGS.md; this file covers usability, copy, and interaction notes. Items marked (see CAL-B-xxx) overlap a bug.

## Must change

1. **Default sync target is Outlook, silently.** New Event defaults "Sync to calendar account" to `outlook`. My all-day test event (no sync choice made) was pushed to the Outlook account and now has a read-only copy there. Default should be "Don't sync" or the user's chosen primary, and the selected target should be visible in the summary before Save.
2. **Recurring edit scope defaults to "All occurrences".** The "Edit recurring event" dialog pre-selects All occurrences, so a quick Save changes the whole series (see CAL-B-009). Default to "This occurrence only".
3. **Escape silently discards an unsaved New Event.** Typed title and fields vanish with no "Discard changes?" prompt. Add a confirm when the form is dirty.
4. **Save stays enabled while the form is invalid.** With end before start, the inline text "End must be on or after start" appears but Save is still enabled and clicking it does nothing visible. Disable Save and focus the first invalid field, or show a toast.
5. **Clash toast does not name the conflict.** "Event created, but it clashes with 1 event already on your calendar." Name the event and time, and offer "View" / "Keep anyway".
6. **Attendee picker is org-members only.** Typing an external address shows "No members found." and Enter does nothing (CAL-B-004). Either allow guest emails or say in the field that only members can be invited.
7. **Raw "[object Object]" in sync error text** (CAL-B-007). Also add resolution actions for the "provider copy changed" conflict.
8. **External (Google/Outlook) items look like duplicates.** Each synced event appears twice; external rows say only "External" with no account name in the grid, and standups appear twice per day (two External rows) with no hint which account they come from. Show the account email/badge and merge mirrors (CAL-B-006).
9. **Times are shown in UTC in the grid, form and capacity panel** while list and history show IST (CAL-B-001, CAL-B-002). The capacity sheet also opens with start 07:12 PM on "10/14/2026" — UTC "now" — when IST is 12:42 AM on 10/15.
10. **Mail error copy exposes a tool slug.** "Unable to retrieve tool with slug OUTLOOK_OUTLOOK_LIST_MESSAGES" with a Reconnect link (CAL-B-012). Use plain text: "Outlook needs attention — reconnect".
11. **Send failure is silent.** Send → "Sending…" → back to "Send" with no message (CAL-B-011).
12. **Delete on a recurring series has no scope prompt** and the confirm text ("This will permanently delete the event") does not say that all occurrences go (CAL-B-014). Synced events should also say the provider copy may remain (CAL-B-015) or delete it.

## Good to have

1. Time inputs in New Event are too narrow: "10:00 AM" renders as "00 AM" in the time box (described in words; no screenshot kept). Widen the field or use a 24-hour mask with a visible format hint.
2. Week grid labels are cut off where events overlap (e.g. "12:51 PM – 1:5", "Calendar Outlook…" clipped). Use stacked lanes or show a "+n more" chip.
3. Source filter state ("Event sources" toggles) is not reflected in the URL, so a filtered view cannot be shared or bookmarked. Holidays off persisted across reload (good), but the URL does not say so.
4. "Add Teams meeting link" is ON by default for every new event, including Google-synced ones. Default off unless the account is Outlook/Teams.
5. Edit form for an existing event hides Sync account, Teams link, and recurrence rule (only the scope dialog appears). Users cannot see or change the repeat rule from Edit.
6. Event detail sheet shows loading skeletons for a noticeable time before the Edit button renders; clicking Edit too early does nothing. Show the Edit button immediately or disable it with a spinner.
7. "Loading calendar sources…" appears for several seconds on every load and the list is briefly partial (standups/external events pop in after). Show a skeleton per source or a count.
8. Share button gives no visible result in the header (no sheet, no toast, focus ring only). Confirm what it does or hide it.
9. Week navigation: the first click on "Previous week" / "Next week" sometimes did not move the range in my runs (two attempts, then worked with a forced click). Needs repro before filing; logged here only.
10. Sheets for "Calendar accounts" and "Event sources" are not announced as dialogs (no dialog role in the accessibility tree), which affects screen readers and Escape focus management.
11. Console: /inventory/warehouses returns 402 (payment required) on the Capacity sheet and shows no in-app message. Show a plan-upgrade notice instead of a raw error.
12. Positive: Escape returns focus to the "Calendar accounts" trigger; the 100-character title limit has a clear message ("Event title must be at most 100 characters"); blank/space-only titles keep Save disabled; the <script> title renders as literal text (no alert, no HTML injection); event delete shows a clear confirm with "cannot be undone"; Mail composer blocks an empty body ("Message body is required").
