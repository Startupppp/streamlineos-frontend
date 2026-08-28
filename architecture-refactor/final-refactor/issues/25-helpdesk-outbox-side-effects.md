# 25: Move HR Helpdesk side effects to the outbox

**What to build:** Helpdesk assignment and status notifications are durable, retryable and visible to operators instead of silently ignored.

**Blocked by:** 18 — Cursor-page and index HR Helpdesk search.

**Status:** ready-for-agent

- [ ] Helpdesk state and notification intent commit atomically.
- [ ] Swallowed promise failures are removed.
- [ ] Retry and duplicate delivery are idempotent with dead-letter telemetry.
- [ ] Commit, rollback, retry and notification tests pass.
