# StreamlineOS Product Bible

# Timesheets / Worklogs

# 07_Time_Capture_Timer_Weekly_Calendar_Kiosk.md

## Capture Modes

The product must support multiple ways to log time.

## 1. Timer

Use case:

- real-time work tracking.

Fields:

- client,
- project,
- task/work item,
- description,
- billable,
- tags,
- work link,
- custom fields.

Rules:

- one active timer per user by default.
- admin can allow overlapping timers only if explicitly enabled.
- timer can be paused/resumed if enabled.
- timer can convert to time entry.
- timer survives page refresh.
- timer syncs across browser tabs.

## 2. Manual Entry

Use case:

- add exact time after work.

Fields:

- date,
- start/end optional,
- duration,
- client/project/task,
- description,
- billable,
- attachments/work links.

Validation:

- max hours per day policy,
- required fields,
- backdate restrictions,
- overlap detection.

## 3. Weekly Timesheet Grid

Use case:

- fast weekly entry.

Behavior:

- rows are client/project/task/work type combinations.
- columns are days.
- cells accept hours.
- keyboard-friendly.
- row totals and day totals update live.
- copy previous week.
- save as template.
- submit week.

## 4. Day Timeline

Use case:

- review day as sequence of entries.

Behavior:

- ordered by time.
- highlights gaps/overlaps.
- supports drag adjustment future-ready.

## 5. Calendar View

Use case:

- visual planning and review.

Behavior:

- day/week/month view.
- entries as blocks.
- drag to move future-ready.
- integrates leave/holidays where HR module exists.

## 6. Kiosk Mode

Use case:

- shared device for crews/shops/sites.

Methods:

- PIN,
- QR code,
- optional photo capture,
- optional location/site.

Rules:

- kiosk is disabled by default.
- photo/location must be policy-controlled and transparent.
- kiosk entries flow into approval queue.

## 7. Mobile/Offline

Use case:

- field teams and travel.

Requirements:

- quick timer,
- quick entry,
- offline draft storage,
- sync conflict handling,
- location optional and policy-controlled,
- attachment/photo optional.

## Required Fields Engine

Admins can require:

- project,
- task,
- description,
- billable flag,
- client,
- work link,
- tag,
- location,
- custom field.

Rules:

- required fields apply by role/project/client.
- entry cannot submit until requirements pass.
- draft can save with missing fields if policy allows.

## Rounding Rules

Supported:

- no rounding,
- nearest 5 minutes,
- nearest 6 minutes,
- nearest 10 minutes,
- nearest 15 minutes,
- round up,
- round down,
- minimum increment.

Display:

- show raw duration and billed duration when different.

## Breaks

Support:

- break timer,
- unpaid breaks,
- paid breaks,
- automatic break deduction future-ready.

## Acceptance Criteria

- Employee can log a full week in under 60 seconds using grid.
- Employee can start and stop timer in under 3 clicks.
- Timer survives refresh.
- Missing required fields are clear.
- Weekly grid is keyboard-friendly.
- Mobile logging works at 375px.
