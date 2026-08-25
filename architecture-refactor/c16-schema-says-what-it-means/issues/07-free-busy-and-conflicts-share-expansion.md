# 07 — Free/busy and conflict checks share one expansion

**What to build:** One calendar occurrence module whose interface expands a series plus exceptions for a bounded window. List, reminder, free/busy and conflict callers all cross this seam; none parses recurrence independently.

**Status:** ready-for-agent

## Acceptance criteria

- [ ] Recurrence uses a standards-compliant RRULE adapter; no hand-written parser remains.
- [ ] Series, moved instances, cancelled instances and attendee responses produce one canonical occurrence stream.
- [ ] Free/busy and conflict checks consume that same stream.
- [ ] The write path checks conflicts in one transaction and returns the conflicting occurrence without leaking another tenant.
- [ ] IANA time zones and DST spring-forward/fall-back cases are covered.
- [ ] All-day events use local dates and do not shift across zones.

## Todo

- [ ] Put the expansion seam behind a bounded-window interface
- [ ] Add a Postgres adapter for conflict reads and an in-memory adapter for recurrence tests
- [ ] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md)
