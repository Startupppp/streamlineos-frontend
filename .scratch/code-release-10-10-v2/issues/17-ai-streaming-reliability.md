# 17: AI streaming and reliability

**What to build:** AI experiences stream promptly, cancel safely, preserve citations and credits, validate outputs, and fail without duplicate spend.

**Blocked by:** 04 — API, Zod and OpenAPI contracts; 05 — Authentication, Organization, RBAC and Settings; 16 — Knowledge Base, Wiki and Chatbot

**Status:** ready-for-agent

**Source:** `architecture-refactor/PRD-10-10-CODE-RELEASE-TODO.md`

## Acceptance criteria

- [ ] **PRD-C002** — **AI:** complete v2 ticket 17's streaming, cancellation, deadline, structured-output, citation, credit and frontend failure-state criteria.
- [ ] **PRD-C152** — Stream text/tool progress to the client rather than buffering a complete answer; target application overhead before provider dispatch at p95 ≤ 250 ms and first visible streamed state within 100 ms.
- [ ] **PRD-C153** — Propagate client aborts, enforce deadlines and circuit breakers, and retry only replay-safe pre-stream operations; never duplicate a paid request or continue spending after cancellation.
- [ ] **PRD-C154** — Validate structured outputs, preserve citation/source integrity and show a safe partial/error state when the model, retrieval, tool or stream fails.
- [ ] **PRD-C155** — Verify AI frontend states for credit exhaustion, queueing, streaming, cancellation, retry, partial output, citation loading, provider failure and permission revocation without duplicate requests.

## Completion evidence

- Record applicable frontend/root and backend commit SHAs, commands, pass/fail/skip counts, and artifact locations.
- Update the source PRD checkbox states and the traceability manifest in the same completion commit.
