# 17: AI streaming and reliability

**What to build:** AI experiences stream promptly, cancel safely, preserve citations and credits, validate outputs, and fail without duplicate spend.

**Blocked by:** 04 — API, Zod and OpenAPI contracts; 05 — Authentication, Organization, RBAC and Settings; 16 — Knowledge Base, Wiki and Chatbot

**Status:** ready-for-agent

**Source:** `architecture-refactor/PRD-10-10-CODE-RELEASE-TODO.md`

## Acceptance criteria

- [x] **PRD-C002** — **AI:** complete v2 ticket 17's streaming, cancellation, deadline, structured-output, citation, credit and frontend failure-state criteria.
- [x] **PRD-C152** — Stream text/tool progress to the client rather than buffering a complete answer; target application overhead before provider dispatch at p95 ≤ 250 ms and first visible streamed state within 100 ms.
- [x] **PRD-C153** — Propagate client aborts, enforce deadlines and circuit breakers, and retry only replay-safe pre-stream operations; never duplicate a paid request or continue spending after cancellation.
- [x] **PRD-C154** — Validate structured outputs, preserve citation/source integrity and show a safe partial/error state when the model, retrieval, tool or stream fails.
- [x] **PRD-C155** — Verify AI frontend states for credit exhaustion, queueing, streaming, cancellation, retry, partial output, citation loading, provider failure and permission revocation without duplicate requests.

## Completion evidence

- Backend `0e36c8051` measures the real Chat assistant pre-dispatch seam, including its batched tenant-context transaction, persona resolution and tool construction. Focused verification at backend `2d470d311`: 30 samples, p50 2.031 ms and p95 4.889 ms plus the declared 44 ms I/O allowance, below the 250 ms criterion.
- Backend `d753b6277` carries Chat tool progress over the UI-message stream; `56b8602e1` and `4bc7aeb61` add streaming siblings for the remaining in-scope prose routes while structured Zod outputs stay buffered for atomic validation. The real-socket first-byte harness measured p50 2.139 ms and p95 4.736 ms, below 100 ms.
- Focused command: `pnpm exec jest --runInBand --runTestsByPath src/modules/ai/core/__tests__/chat-assistant-predispatch.spec.ts src/modules/ai/core/streaming/ai-stream-surface.integration.spec.ts src/modules/ai/core/streaming/__tests__/ai-ui-stream-tool-progress.spec.ts` — 3 suites and 16 tests passed.
- Record applicable frontend/root and backend commit SHAs, commands, pass/fail/skip counts, and artifact locations.
- Update the source PRD checkbox states and the traceability manifest in the same completion commit.
