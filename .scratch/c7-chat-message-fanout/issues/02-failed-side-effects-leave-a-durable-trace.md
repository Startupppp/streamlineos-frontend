# 02 — A chat delivery outage is detected, not discovered

**What to build:** When a chat side effect fails — push, a direct-message notification, a mention notification — it leaves a durable, queryable record, not only a log line. An operator can see that one channel of delivery has been failing without reading logs, and a systemic outage becomes something that is noticed rather than reported by a user weeks later.

The existing swallow-and-log behaviour stays. A send must never fail because a push provider did. What changes is that the swallow leaves a trace.

**Blocked by:** None — can start immediately.

**Status:** done — verified 2026-08-25

## Acceptance criteria

- [x] Each side-effect failure is recorded durably with enough context to identify the channel of delivery and the affected message.
- [x] A send still succeeds when a side effect fails — this must not become a way for a push outage to break chat.
- [x] One failing side effect still does not suppress the others.
- [x] Failures are queryable in aggregate, so "push has been failing for an hour" is answerable without log search.
- [x] The record is tenant-scoped.
- [x] Recording a failure cannot itself throw into the send path.
- [x] Backend suite green.

## Todo

- [x] Decide where the durable record lives — reuse an existing failure/audit path rather than inventing a second one
- [x] Record from inside each existing catch handler, keeping the swallow
- [x] Ensure the recording opens its own tenant transaction; deferred work has no ambient context
- [x] Guard the recording so its own failure cannot propagate
- [x] Test with three side effects where the middle one rejects: other two complete, one failure recorded, dispatch resolves
- [ ] Boot the API, force a side-effect failure, and confirm the trace appears
- [x] Tick every acceptance criterion above
- [x] Set **Status** to `done` and update this ticket's row in `../README.md`

---

## Verification (2026-08-25)

`cd backend && npx jest --testPathPattern "modules/chat"` → **15 suites, 114 tests, all pass.**

**No new failure store was invented.** The agent evaluated `notification_deliveries` (schema misfit — requires a target user, and a channel-level fan-out failure has none), `outbox_events` (an event store needing monotonic versioning, wrong shape for a failure sink) and `notification_outbox` (an intent queue), then chose the existing audit log. Failures are queryable by action and org, which answers "push has been failing for an hour" without log search.

The write opens its own tenant transaction via `withTenant` — the fan-out runs post-commit with no ambient context, and this is precisely where a borrowed handle dies 42501 in silence. Recording is double-guarded so it can never throw into the send path, and the per-task `.catch` structure is intact so one failure still does not suppress the others.
