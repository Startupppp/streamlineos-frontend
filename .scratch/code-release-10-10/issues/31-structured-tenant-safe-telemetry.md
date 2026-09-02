# 31 — Structured, redacted, tenant-safe logs, metrics and traces

**What to build:** One user intent is traceable through HTTP, database, cache, provider adapters, outbox publication, queue and event consumers, cron jobs and AI streams — without any of it logging something that must not be logged.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] Trace context propagates across every named boundary, correlating asynchronous work back to the originating intent.
- [ ] No secret, token, prompt, file content or sensitive bind value is logged anywhere on these paths.
- [ ] Expected domain failures are classified separately from actionable faults, so a normal 404 does not page anyone.
- [ ] Every log line carries tenant context without carrying tenant data.
- [ ] Any alert predicate is verified against the exact string the emitting line produces — a predicate grepping for text no log line contains is silently inert.
- [ ] After-commit hooks and outbox consumers carry explicit tenant context; they do not inherit a request scope that no longer exists.
