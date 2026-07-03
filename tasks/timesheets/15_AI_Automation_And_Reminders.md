# StreamlineOS Product Bible

# Timesheets / Worklogs

# 15_AI_Automation_And_Reminders.md

## AI Goals

AI should reduce admin work without faking time entries.

Allowed:

- suggest entries,
- detect missing logs,
- summarize work,
- explain budget risks,
- recommend approvals,
- draft client summaries.

Not allowed:

- silently create billable time,
- approve time without policy,
- modify locked/invoiced entries.

## AI Suggestions

Sources:

- calendar events,
- project activity,
- tickets moved,
- commits/PRs,
- meetings,
- previous patterns.

Output:

- suggested draft time entries,
- confidence,
- source evidence,
- user must confirm.

## Missing Log Detection

Detect:

- zero-hour work days,
- below target hours,
- active project activity but no time,
- running timer left open,
- repeated late submissions.

## Reminders

Reminder types:

- daily log reminder,
- Friday submit reminder,
- manager approval reminder,
- finance uninvoiced hours reminder,
- budget overrun alert,
- client approval pending reminder.

Channels:

- in-app,
- email,
- Slack/Teams future,
- WhatsApp future.

## AI Reports

Weekly owner summary:

- utilization,
- billable ratio,
- missing logs,
- budget risks,
- uninvoiced hours,
- top profitable/unprofitable clients.

Manager summary:

- team late/missing logs,
- approvals needed,
- overloaded projects.

Employee summary:

- draft entries to submit,
- rejected corrections,
- target hours.

## Acceptance Criteria

- AI suggestions are never auto-approved.
- Suggestions show evidence.
- Users can dismiss suggestions.
- Reminder frequency is configurable.
- No sensitive pay/cost data appears in AI output for unauthorized users.
