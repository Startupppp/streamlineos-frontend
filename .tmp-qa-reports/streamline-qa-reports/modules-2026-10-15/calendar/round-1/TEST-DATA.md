# Calendar QA Round 1 — TEST DATA (2026-10-15)

All created records use the QA1015 prefix. Times below are as the app displayed them.

## Created in StreamlineOS and deleted (local copy)

| # | Title (as created) | Date / time shown | Created via | Final state |
|---|---|---|---|---|
| 1 | QA1015 <script>alert(1)</script> probe | Fri 16 Oct 2026, 10:00–11:00 · UTC | New Event, sync = connected Google account, Teams link default on | Created twice by double-click (CAL-B-003); duplicate (event-8) deleted; event-7 retitled to "QA1015 Edited title A", end 11:30; then deleted locally. **Google copy still exists — see leftovers.** |
| 2 | QA1015 All-day 100 char boundary abcdefghij… (100 chars) | Tue 20 Oct 2026, All day | New Event, sync left at default (Outlook) | Deleted locally. **Outlook copy still exists — see leftovers.** |
| 3 | QA1015 Recurring weekly sync (weekly, 4 occurrences, sync = Don't sync) | Mon 19 Oct 15:00–15:30, then 26 Oct, 2 Nov, 9 Nov | New Event | 19 Oct occurrence was edited ("QA1015 Recurring ONE edited") then disappeared after the all-occurrence edit (CAL-B-009). Series deleted via Delete (CAL-B-014); 2 Nov list confirmed empty. |
| 4 | QA1015 Conflict probe | Mon 26 Oct 2026, 15:00–15:30 · UTC, sync = Don't sync | New Event | Created with clash toast; deleted. |
| 5 | "Escape test draft" typed title | — | New Event | Never saved (Escape discarded it). |
| 6 | Drag-created drafts (New Event sheets opened by drag on grid) | 16 Oct 09:00–09:30, 11:30–12:00 | Week grid drag | Discarded, never saved. |

## Mail

| Item | Recipient | Subject / body | Result |
|---|---|---|---|
| Compose | qa1015cal@sharklasers.com | "QA1015 Calendar round 1 compose check" / "QA1015 test message from calendar QA round 1. Ignore." | Send returned HTTP 500 (/mail/send). Not confirmed sent; not retried. The composer was closed; per the app, unsent drafts are saved on this device — **a local draft may exist in this browser; delete it if it appears in Mail.** |
| Empty-body validation | — | — | Error "Message body is required"; nothing sent. |

## Settings changed during testing (restored)
- Event sources: "Holidays" toggled OFF, then back ON (verified true).
- Accounts: nothing connected, disconnected, or reconnected. Google and Outlook toggles untouched.

## Leftovers that need manual cleanup (cannot be removed from StreamlineOS — read-only copies)
1. Connected Google account (adityachalla01@gmail.com): event "QA1015 <script>alert(1)</script> probe", Fri 16 Oct 2026, 10:00–11:00 (shown as Etc/UTC in the app). Delete it in Google Calendar.
2. Connected Outlook account: event "QA1015 All-day 100 char boundary abcdefghij…" (100 characters), Tue 20 Oct 2026, all-day. Delete it in Outlook.
3. Mail: no QA1015 message was sent. If a local draft "QA1015 Calendar round 1 compose check" exists in the browser, discard it.

Recipient addresses used: qa1015cal@sharklasers.com only (no invitations went out because external guests could not be added).
