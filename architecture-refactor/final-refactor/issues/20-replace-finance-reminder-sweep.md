# 20: Replace the Finance reminder sweep

**What to build:** Due reminders are processed in indexed cursor batches with batched recipients and idempotent occurrences instead of nested policy/invoice memory scans.

**Blocked by:** 19 — Cursor-page Finance tax and reminder APIs.

**Status:** ready-for-agent

- [ ] Due work is selected by indexed organization/date predicates and bounded checkpoints.
- [ ] Recipients are resolved in batches without per-invoice membership queries.
- [ ] Retry/restart cannot duplicate a reminder occurrence.
- [ ] Large-fixture query count, memory, latency and delivery tests pass.
