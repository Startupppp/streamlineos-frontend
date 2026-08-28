# 20: Replace the Finance reminder sweep

**What to build:** Due reminders are processed in indexed cursor batches with batched recipients and idempotent occurrences instead of nested policy/invoice memory scans.

**Blocked by:** 19 — Cursor-page Finance tax and reminder APIs.

**Status:** implemented

- [x] Due work is selected by indexed organization/date predicates and bounded checkpoints.
- [x] Recipients are resolved in batches without per-invoice membership queries.
- [x] Retry/restart cannot duplicate a reminder occurrence.
- [x] Large-fixture query count, memory, latency and delivery tests pass.

Evidence: reminders scan invoices in bounded ID-cursor batches, preload recipients by organization, use a unique occurrence conflict key with retry state, and count only successful dispatches.
