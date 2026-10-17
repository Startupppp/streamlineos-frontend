# calendar — pending items recovered from the QA zips

These were still open, partial, blocked, or not re-checked. Fixed and pass items are omitted.

## CAL-B-011 — not re-run

Latest status source: `streamline-qa-reports/modules-2026-10-15/calendar/round-3/BUGS.md`

| ID | Title (short) | R3 status | Evidence (this run) |
| CAL-B-011 | Send from Mail fails with HTTP 500, no error shown | NOT RE-RUN | Sending is forbidden in this round ("Send no emails"). Round-1 evidence stands. |

Write-up from `streamline-qa-reports/modules-2026-10-15/calendar/round-1/BUGS.md`:

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

## CAL-B-013 — blocked, not confirmed fixed

Latest status source: `streamline-qa-reports/modules-2026-10-15/calendar/round-3/BUGS.md`

| ID | Title (short) | R3 status | Evidence (this run) |
| CAL-B-013 | (no definition in any round) | CANNOT RECHECK | Still no CAL-B-013 definition in calendar/round-1, round-2, or elsewhere on the box. Numbering gap kept. |

## CAL-B-025 — still open

Latest status source: `streamline-qa-reports/modules-2026-10-15/calendar/round-3/BUGS.md`

| ID | Severity | Page | Title |
| CAL-B-025 | High | Week grid (mobile 390 px) | Week grid unreadable on phones |

Write-up from `streamline-qa-reports/modules-2026-10-15/calendar/round-3/BUGS.md`:

### CAL-B-025: Week grid is unreadable at phone width (390 px): seven narrow columns, event labels cut to "9 9" / "10:0"
- Severity: High (mobile calendar unusable in Week view; default view on phones)
- Route: /calendar?mode=calendar (Week) at viewport 390 × 1026
- Actor: owner (any user on a phone)
- Steps:
  1. Set viewport to 390 px wide (DevTools device toolbar, custom 390).
  2. Open /calendar (default Week view) for 19–25 Oct; read the 9 AM and 10 AM rows.
  3. Compare with /calendar?mode=list.
- Expected: On phones, Week switches to a day-by-day or agenda layout (or the grid scrolls horizontally with readable labels). Event titles readable; each block tappable with a visible time.
- Actual: Seven day columns ~40 px each. Blocks show "9 9" (standups), "10:0", "1:00" (no titles). The List view is readable (cards, dates, sources). Bottom nav (Home/Inbox/Mail/Calendar/More) present. New Event opens as a bottom sheet and fits.
- Impact: Phone users cannot read or pick events from the Week view; only List works.
- Likely code area: week grid column width/min-width in the calendar grid component; no breakpoint that switches to Day or Agenda; default mode not mobile-aware.
- Suggested fix: Under ~640 px, default to Day or Agenda; in Week, use 3-day columns with horizontal scroll and min column width 96 px; show title on the first line of each block.
- Acceptance check: At 390 px, Week shows event titles in full (or a day picker), and tapping a block opens the detail sheet.
