# 01 — A scheduled job runs once

**What to build:** A scheduled job runs once even when triggered twice. Today the secret check validates the caller but nothing prevents concurrent execution, so two scheduler fires, a retry after timeout, or two instances receiving the same trigger all run the full job in parallel — producing duplicate emails and duplicate notifications.

**Blocked by:** None — can start immediately

**Status:** ready-for-agent

## Acceptance criteria

- [ ] Two simultaneous invocations result in one execution and one set of side effects, tested genuinely concurrently.
- [ ] The lease expires, so a crashed holder does not block the next run forever.
- [ ] The lease window is sized per job, above that job's expected duration.
- [ ] A refused duplicate is logged and returns success, so the scheduler does not retry into a storm.
- [ ] Per-organisation commits are unchanged — a mid-run restart still truncates and resumes, with processed organisations durable.
- [ ] The lease wraps the whole run, not each organisation.

## Todo

- [ ] Use the Redis client and set-if-not-exists pattern already present — roughly ten lines
- [ ] Test with real concurrency; a sequential test cannot detect a missing lease
- [ ] Verify the restart-resume guarantee still holds
- [ ] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md)

---

PRD: [`c22 — Scheduled work runs once, and a deploy sheds no requests`](../prd.md) · Candidate index: [`../README.md`](../README.md)
