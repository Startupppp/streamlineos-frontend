# 11 — Stream the non-chat AI surfaces and propagate aborts, deadlines and breakers

**What to build:** Non-chat AI surfaces buffer a complete answer before responding. They should stream text and tool progress, and honour cancellation end to end so a client disconnect stops the spend rather than continuing to pay for output nobody will read.

**Blocked by:** 09.

**Status:** ready-for-agent

- [ ] Non-chat AI surfaces stream rather than buffering; first visible streamed state lands within the target and application overhead before provider dispatch stays inside its budget.
- [ ] Client aborts propagate through the gateway, database, cache and provider adapters. Spending stops on cancellation.
- [ ] Deadlines and circuit breakers are enforced, and the breaker is proven to actually trip — a breaker that is wired but never opens is inert.
- [ ] Retries cover only replay-safe pre-stream operations; a paid request is never duplicated.
- [ ] A streaming handler must not commit its transaction while tools are still running.
- [ ] The stream helper returns synchronously, so a `try/catch` around it never sees a provider fault — error and abort callbacks must be wired explicitly.
- [ ] Structured outputs are validated and citation/source integrity is preserved; a failed model, retrieval, tool or stream renders a safe partial or error state.
