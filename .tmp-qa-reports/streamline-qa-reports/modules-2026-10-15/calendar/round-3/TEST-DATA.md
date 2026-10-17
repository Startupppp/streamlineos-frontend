# Calendar QA Round 3 — TEST DATA (2026-10-15)

Prefix: QA1015R3. Account: owner (org "ADitay CAhala"), timezone Asia/Calcutta. No invitations sent. No Google or Outlook writes created this round (sync stayed "Don't sync" for every probe). No codes or tokens recorded.

## Created in StreamlineOS

| # | Title | Date / time (as shown) | Type | Result | Final state |
|---|---|---|---|---|---|
| 1 | QA1015R3 TZ probe | Tue 21 Oct 10:00–11:00 · UTC | single | CAL-B-002 (UTC) | Deleted (single delete; grid row gone immediately; gone after reload) |
| 2 | QA1015R3 Clash overlap probe | Wed 21 Oct 10:30–11:30 · UTC | single | CAL-B-005 toast | Deleted |
| 3 | QA1015R3 Allday clash control | Wed 21 Oct 14:00–14:30 · UTC | single | plain "Event created" | Deleted (cleanup) |
| 4 | QA1015R3 dblclick probe (×2) | Thu 22 Oct 10:00–10:30 · UTC | single | two rows (CAL-B-003) | One deleted in-app; the other removed in cleanup / gone on reload |
| 5 | QA1015R3 Monthly series probe | Fri 23 Oct 10:00–10:30 (monthly; series starts on 15th) | monthly, After 3 | CAL-B-024, CAL-B-009 | Monthly ONE edited (15 Nov) override lost; series ALL edited (15 Dec) deleted in cleanup |
| 6 | QA1015R3 Yearly probe | Sat 24 Oct 1:00–1:30 PM | yearly, Ends = Never | displayed correctly | Deleted in cleanup (series) |
| 7 | QA1015R3 All-day 27-29 probe | Tue 27 – Thu 29 Oct, all day | all-day multi-day | CAL-B-018 (List shows start date only) | Deleted in cleanup |
| 8 | QA1015R3 Clash after allday | Wed 28 Oct 14:00–14:30 · UTC | single | CAL-B-020 false clash; RSVP tests (CAL-B-017) | Deleted |

Deleted series/recurring: Monthly series (Dec 15 occurrence deleted; delete removed all remaining occurrences — CAL-B-014).

## Dialogs cancelled (not saved)
- New Event draft dragged on 21 Oct 10:30 → 1:30 PM (CAL-B-010): Discard.
- Add attendees: qa1015r3@sharklasers.com typed (CAL-B-004): Discard.
- Monthly series "Delete" on Dec 15 (scope check): Cancel.

## Left-over items
- None from QA1015R3 as far as the List and Week views show after cleanup (verified on 19–25 Oct, 9–15 Nov, 14–20 Dec, 2 Nov).
- Round-2 provider mirrors remain and belong to round 2 (owner must delete in Google): "QA1015R2 Google sync probe" (Fri 23 Oct, adityachalla01@gmail.com), "QA1015R2 Sync conflict first-edit probe" (Fri 30 Oct).
- Round-1 items (not R3): "QA1015 <script> probe" mirror on 16 Oct; "QA1015 All-day 100 char…" Outlook copy 20 Oct.

## Mail
- Nothing sent. Nothing drafted.
