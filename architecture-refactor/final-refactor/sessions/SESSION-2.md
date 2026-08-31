# S2 — HRMS, Payroll, Expenses, Timesheets and Build

Read `PROTOCOL.md`, the PRD and tickets 07, 08, 17, 18, 21 and 25.

## Opening decisions to include

- Confirm conflict handling when legacy user-based actor data cannot map to one active organization membership/person.
- Confirm the approved tenant-safe Helpdesk search mechanism when the current database lacks required trigram/FTS support.
- Ask the protocol's migration, commit and environment questions.

## Exclusive territory

- Backend HR, Payroll, Expenses, Timesheets and Build modules/schemas/tests.
- Corresponding frontend feature folders, excluding shared route registry and global UI primitives.

Start 17 and 18 immediately. Tickets 07, 08 and 21 wait for S1 ticket 06. Ticket 25 follows 18. Coordinate shared outbox primitives with S6 without editing its territory.
