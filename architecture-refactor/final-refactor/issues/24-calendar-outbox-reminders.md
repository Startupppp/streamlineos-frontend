# 24: Move Calendar reminder side effects to the outbox

**What to build:** Event invitations and reminders are scheduled only after commit and are retryable, deduplicated and observable.

**Blocked by:** 13 — Normalize Calendar attendees.

**Status:** ready-for-agent

- [ ] Calendar writes commit reminder/invitation intent atomically.
- [ ] Occurrence and attendee identity prevent duplicate delivery.
- [ ] Update/cancel/recurrence exception behavior invalidates stale scheduled work.
- [ ] Commit, rollback, retry and DST/recurrence tests pass.
