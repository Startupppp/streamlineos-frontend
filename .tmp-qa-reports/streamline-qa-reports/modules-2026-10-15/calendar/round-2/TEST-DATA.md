# Calendar QA Round 2 — TEST DATA (2026-10-15)

Prefix: QA1015R2. Account: owner (org "ADitay CAhala"), timezone Asia/Calcutta (IST). Times below are as the app displayed them (the app stores new wall-clock times as UTC, see CAL-B-002).
No invitations were sent (external attendees cannot be added, CAL-B-004). No verification or sign-in codes are recorded here.

## Created in StreamlineOS and deleted in this round (local copies)

| # | Title (as created) | Date / time shown | Sync | Created in | Final state |
|---|---|---|---|---|---|
| 1 | QA1015R2 TZ display probe | Mon 19 Oct 10:00–11:00 · UTC | none | earlier run | Deleted (list refreshed after reload) |
| 2 | QA1015R2 Double click save probe (×2) | Tue 20 Oct 14:00–14:30 · UTC | none | earlier run (CAL-B-003) | Both rows deleted |
| 3 | QA1015R2 Clash probe 1415 | Tue 20 Oct 14:15–14:45 · UTC | none | earlier run (CAL-B-005) | Deleted |
| 4 | QA1015R2 Clash probe 1420 | Tue 20 Oct 14:20–15:20 · UTC | none | earlier run (CAL-B-005) | Deleted |
| 5 | QA1015R2 All-day multi-day probe | Thu 22 – Sat 24 Oct, all day | none | earlier run | Deleted |
| 6 | QA1015R2 Recurring weekly series ("ALL edited") | Mon 9, 16, 23, 30 Nov 4:00–5:00 PM · UTC (weekly series; 2 Nov had been removed earlier) | none | earlier run (CAL-B-009/014) | Series deleted with one Delete (no scope offered, CAL-B-014). Verified empty for 9, 16, 23, 30 Nov and Dec 7/14 weeks |
| 7 | QA1015R2 Clash control no overlap | Tue 27 Oct 10:00–11:00 PM · UTC | Don't sync | this run (control, CAL-B-005/020) | Created with NO clash toast (control passed). RSVP attempts recorded on it (CAL-B-017). Deleted |
| 8 | `<img src=x onerror="alert(1)">QA1015R2 xss probe <script>alert(2)</script>` | Wed 28 Oct 9:00–10:00 · UTC | Don't sync | this run | Rendered as plain text (no element injected, no alert). Deleted |
| 9 | QA1015R2 All-day Oct 29-31 probe | Thu 29 – Sat 31 Oct, all day | Don't sync | this run (CAL-B-018) | Stored end 31 Oct (Edit shows it). Deleted |
| 10 | QA1015R2 Past time probe 0005 | Thu 15 Oct 00:05–00:30 · UTC (already past) | Don't sync | this run | Saved without warning. Deleted (gone after reload) |
| 11 | QA1015R2 Clash control 30Oct 1400 | Fri 30 Oct 2:00–2:30 PM · UTC | Don't sync | this run (CAL-B-020) | Clash toast raised (false, see CAL-B-020). Deleted |

## Created and NOT deletable from StreamlineOS (synced to Google; now read-only mirrors)

| # | Title | Date / time (app view) | Connected account | Origin | State |
|---|---|---|---|---|---|
| L1 | QA1015R2 Google sync probe | Fri 23 Oct 10:00–11:00 · Etc/UTC | adityachalla01@gmail.com | earlier run (CAL-B-006/007/015) | Local copy deleted earlier; the provider copy still shows as "External – Read-only event from a connected account" in List and Week. Provider copy in Google not verified |
| L2 | QA1015R2 Sync conflict first-edit probe | Fri 30 Oct 10:00–10:30 · Etc/UTC (original title, not the EDITED one) | adityachalla01@gmail.com | this run (CAL-B-019) | Local copy deleted (Delete → confirm). Read-only Google mirror remains in List and Week. The Google copy was not deleted: "Open in calendar" opened Google's account chooser, showing only other signed-out accounts; I did not sign in and stopped. |

Owner action needed: delete L1 and L2 in Google Calendar (adityachalla01@gmail.com). Both are titled "QA1015R2 …" and are on the dates above.

## Series and occurrences

- The weekly series in row 6 ran Mon 2 Nov → Mon 30 Nov 2026 (4:00–5:00 PM UTC). All remaining occurrences were removed by the single Delete. No occurrence remains in the weeks of 2, 9, 16, 23, 30 Nov.

## Drafts and abandoned sheets (never saved)

| Draft | Result |
|---|---|
| "QA1015R2 Past date probe" (Oct 26, end before start) | Save blocked by "End must be on or after start". Discarded |
| "QA1015R2 300-char title probe ..." (302 chars) | Save blocked by "Event title must be at most 100 characters". Retitled to the XSS title and saved (row 8) |
| "QA1015R2 Time entry probe" | Changed into row 7 before saving |
| Attendee check "qa1015r2@sharklasers.com" | Typed only, "No members found.", Discarded, nothing saved |

## Mail

| Item | Result |
|---|---|
| Compose to qa1015cal@sharklasers.com (CAL-B-011 recheck) | NOT sent. The send needs an outgoing email under the owner's name, so it was routed to DraftExternalMessage via the parent. Nothing was written to Mail (no draft). |
| Mail inbox | Unchanged. Account 2 banner still shows the tool slug. |

## Settings changed

None. Event sources not toggled. No accounts connected, disconnected or reconnected.

## Out of scope but present (round 1 leftovers, not QA1015R2 — not deleted)

- "QA1015 <script>alert(1)</script> probe" — two read-only Google mirror rows on Fri 16 Oct (round 1).
- "QA1015 All-day 100 char boundary abcdefghij…" — Outlook copy (round 1), Tue 20 Oct all day (not re-checked).
- "QA1015R1-1: QA1015 Ticket alpha" (Tue 20 Oct, All day Task) and "QA1015R1-2: QA1015 Bug beta <script>…" (Sun 18 Oct, Task) — task items, not calendar events.
- Round-1 draft "QA1015 Calendar round 1 compose check" may still exist in this browser's Mail drafts (round 1 note). Not checked this round.
