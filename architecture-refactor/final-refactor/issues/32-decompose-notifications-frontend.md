# 32: Decompose Notifications frontend and event streaming

**What to build:** Notification templates, providers, events and broadcasts are cohesive features, and event streaming uses one typed resilient adapter.

**Blocked by:** 27 — Build the shared server route-access registry.

**Status:** ready-for-agent

- [ ] Oversized Notification pages are split by data, form, mutation and presentation.
- [ ] Event stream supports abort, jittered reconnect, retry ceiling and org/logout cleanup.
- [ ] Stream credentials are short-lived, purpose-limited and not leaked to logs.
- [ ] File-size, reconnection, permission and typecheck tests pass.
