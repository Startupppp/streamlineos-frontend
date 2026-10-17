# Calendar Round 3 — working notes (2026-10-15 ~21:20 IST, owner session, one tab)
Scratch log written as the run goes; BUGS.md / UX.md / COVERAGE.md / TEST-DATA.md are the deliverables.

- 21:19 IST Opened /calendar?mode=calendar (week of 12 Oct). CAL-B-001 grid still shows 12:46 PM for 6:16 PM IST event: STILL OPEN.
- 21:2x IST New Event sheet: start time field (type=time) shows "00 AM" after entering 10:00 (CAL-B-021 still reproduces, and worse: hour dropped for AM values too).
- New Event default Sync target = "outlook" (preselected); Teams meeting link toggle ON by default.
- Closing the New Event sheet with a stray click discarded the draft (nothing saved; verified list Oct 21 has no QA1015R3 row).
- CAL-B-016 REPRODUCED on /calendar?mode=calendar&date=2026-10-21 (fresh load): full-page "Calendar error — Failed to load the calendar. Please try again." + "Try Again". Console: React minified error #185 (max update depth) in calendar route, correlationId 1a673968-30b2-4ec3-b7fa-bc49f3b2328c (at 15:50:13Z).
- 21:23-21:40 IST probes created (all QA1015R3, Don't sync): "QA1015R3 TZ probe" 21 Oct 10:00-11:00 (list: "10:00 am – 11:00 am · UTC" => CAL-B-002 STILL OPEN); "QA1015R3 Clash overlap probe" 21 Oct 10:30-11:30 (toast "Event created, but it clashes with 1 event already on your calendar." - no name => CAL-B-005 STILL OPEN for true overlap); "QA1015R3 Allday clash control" 21 Oct 14:00-14:30 (plain "Event created" => no false clash with the Leave item "adityachalla01 - OOO" on 21 Oct; CAL-B-020 NOT reproduced with that item; retest with a true all-day event); "QA1015R3 dblclick probe" 22 Oct 10:00-10:30 double-click Save => 2 rows (CAL-B-003 STILL OPEN).
- Delete test: one dblclick probe deleted via grid; after reload the second probe row was also gone (or still present in grid at a later read - ambiguous, see COVERAGE). CAL-B-023 needs a clean re-test.
- CAL-B-014 recurring delete: Delete dialog has no scope radios (only Cancel/Delete) => STILL OPEN (dialog cancelled, nothing deleted).
- CAL-B-009 reproduced: "QA1015R3 Monthly series probe" -> Nov 15 edited "This occurrence only" => "QA1015R3 Monthly ONE edited" on Nov 15; then edit Dec 15 "All occurrences" => Nov 15 override GONE, Dec 15 shows "QA1015R3 Monthly ALL edited". STILL OPEN.
- NEW BUG candidate (monthly): Monthly repeat dialog shows "Day 15 of month" (only options: Day 15 of month / Day of week) although the event starts 23 Oct. Series lands on 15th (Nov 15, Dec 15); the 23 Oct first occurrence is NOT created. Need to file.
- NEW BUG candidate: time input in New Event shows "00 AM" when 10:00 typed; end shows "11:00" (no AM/PM); "30 AM" for 10:30 (part of CAL-B-021, worse).
- Yearly probe "QA1015R3 Yearly probe" 24 Oct 13:00-13:30 saved with Ends=Never (the "After" radio click did not register; not a bug yet, just noted). Sat 24 Oct shows "1:00 PM – 1:30 PM". Cleanup needed.
- CAL-B-016 Calendar error (full page, React #185) reproduced 3x on fresh navigations: 21 Oct (corr 1a673968...), 23 Oct (corr b0bdbbeb-...), 24 Oct (no corr captured). Try Again recovers.
