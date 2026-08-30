# S3 — Chat, Calendar, Mail, Notifications and Knowledge

Read `PROTOCOL.md`, the PRD and tickets 09, 13, 14, 15, 16, 24, 30, 31 and 32.

## Opening decisions to include

- Confirm reaction-history backfill behavior for duplicate legacy user reactions.
- Confirm attendee behavior when a historical attendee no longer has an active membership.
- Confirm realtime provider/sandbox availability for stream and ordering evidence.
- Ask the protocol's migration and commit questions.

## Exclusive territory

- Backend Chat, Calendar, Mail/Email, Notifications/Push/Realtime, KB/Wiki/Search/AI modules and schemas.
- Corresponding frontend features and module-specific hooks.

Schema tickets 13-16 wait for S1 ticket 06 when membership actor support is required. Ticket 24 follows 13. Tickets 30 and 31 follow their schema tickets. Ticket 32 also waits for S5 ticket 27 where route-access integration is required.
