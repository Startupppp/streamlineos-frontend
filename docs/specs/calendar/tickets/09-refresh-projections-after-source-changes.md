# 09: Refresh projections after source changes

**What to build:** Keep open Calendar windows current when source visibility or source-owned records change.

**Blocked by:** 03: Expand the Calendar projection contract.

**Status:** ready-for-agent

- [ ] Enabling or disabling a source updates source metadata and visible events immediately.
- [ ] Build, Tasks, HR, CRM, and other owner mutations invalidate the old and new affected Calendar windows.
- [ ] Unknown prior dates use a safe Calendar-key invalidation rather than leaving stale rows.
- [ ] Focus and reconnect refresh active windows; cross-tab or server change hints carry no private record data.
- [ ] Tests cover source toggle, due-date move, deletion, status change, reconnect, organization switch, and two open tabs.

