# 02 — A chat delivery outage is detected, not discovered

**What to build:** When a chat side effect fails — push, a direct-message notification, a mention notification — it leaves a durable, queryable record, not only a log line. An operator can see that one channel of delivery has been failing without reading logs, and a systemic outage becomes something that is noticed rather than reported by a user weeks later.

The existing swallow-and-log behaviour stays. A send must never fail because a push provider did. What changes is that the swallow leaves a trace.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

## Acceptance criteria

- [ ] Each side-effect failure is recorded durably with enough context to identify the channel of delivery and the affected message.
- [ ] A send still succeeds when a side effect fails — this must not become a way for a push outage to break chat.
- [ ] One failing side effect still does not suppress the others.
- [ ] Failures are queryable in aggregate, so "push has been failing for an hour" is answerable without log search.
- [ ] The record is tenant-scoped.
- [ ] Recording a failure cannot itself throw into the send path.
- [ ] Backend suite green.

## Todo

- [ ] Decide where the durable record lives — reuse an existing failure/audit path rather than inventing a second one
- [ ] Record from inside each existing catch handler, keeping the swallow
- [ ] Ensure the recording opens its own tenant transaction; deferred work has no ambient context
- [ ] Guard the recording so its own failure cannot propagate
- [ ] Test with three side effects where the middle one rejects: other two complete, one failure recorded, dispatch resolves
- [ ] Boot the API, force a side-effect failure, and confirm the trace appears
- [ ] Tick every acceptance criterion above
- [ ] Set **Status** to `done` and update this ticket's row in `../README.md`
