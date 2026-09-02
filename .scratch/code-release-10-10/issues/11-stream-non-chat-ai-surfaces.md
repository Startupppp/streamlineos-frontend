# 11 — Stream the non-chat AI surfaces and propagate aborts, deadlines and breakers

**What to build:** Non-chat AI surfaces buffer a complete answer before responding. They should stream text and tool progress, and honour cancellation end to end so a client disconnect stops the spend rather than continuing to pay for output nobody will read.

**Blocked by:** 09.

**Status:** ready-for-agent

- [ ] Non-chat AI surfaces stream rather than buffering; first visible streamed state lands within the target and application overhead before provider dispatch stays inside its budget.
  PARTIAL — NOT CLOSED. Audit: exactly one non-chat AI surface streams, `POST /public/kb/stream-ask`
  (`grep -rn "streamText(\|pipeTextStreamToResponse" src --include=*.ts` → 4 non-spec hits, all in chat + KB RAG).
  The other ~60 AI endpoints across 11 controllers buffer. What landed: the KB stream measured NEITHER
  ttft NOR app overhead, so there was no number to hold to a budget; it now records both
  (`kb-rag-stream-resilience.spec.ts` → 13 passed, incl. "records ttft and app overhead on the settled usage row").
  What did not: converting the buffered surfaces needs a frontend stream client — `hooks/api/chat-ai-assistant.ts`
  is the only one and it is hard-wired to `/chat`, so `stream-ask` itself has no consumer today; frontend is
  outside session S3's territory. Most buffered surfaces are `invokeStructured` (Zod-validated JSON), where a
  half-parsed object is not a renderable partial state.
- [ ] Client aborts propagate through the gateway, database, cache and provider adapters. Spending stops on cancellation.
  PARTIAL — NOT CLOSED. Closed: signal reaches the provider adapter (`streamText.abortSignal`) and the gateway
  runner; both routes now build the signal through one seam (`createStreamAbortSignal`) whose disconnect arm is
  gated on `res.writableEnded` — the old `res.on("close", abort)` also fired on a *successful* response; spending
  stops (slot + reservation released on abort, and an open breaker short-circuits before retrieval/embed/reserve:
  `kb-rag-stream-resilience.spec.ts` "short-circuits BEFORE retrieval"). 6 abort tests + 10 KB route tests pass.
  NOT closed, both outside S3: (a) `KbRagRetrievalService.retrieveContext` and `embedQueryWithCredit` take no
  `AbortSignal`, so a disconnect during the retrieval leg does not stop the embedding call — ticket 10 owns the
  embedding path and is editing those files now; (b) `withTenantScopedTools` forwards `options.abortSignal` to each
  tool intact, but the per-tool `runInNewTenantTransaction` is not torn down on abort — `common/tenant/`.
- [x] Deadlines and circuit breakers are enforced, and the breaker is proven to actually trip — a breaker that is wired but never opens is inert.
  P1 FOUND AND FIXED: the breaker could open **exactly once per process, ever**. `recordCbFailure` set `openedAt`
  only on `failures === THRESHOLD`; past the threshold the equality stops matching, the 30s window expires, and
  only a success resets the counter — which a dead provider never gives. Redis had the same `count === THRESHOLD`
  and its failures key had no TTL. Both fixed in `AiStreamBreaker`. P1 FOUND AND FIXED: the public KB stream had
  no breaker at all. Proof: `npx jest src/modules/ai/core/streaming/ai-stream-breaker.spec.ts` → 13 passed,
  including "RE-OPENS when the probe after the window also fails". Bite proof: restoring the `=== threshold`
  shape and dropping the TTL → **4 failed, 9 passed**; restored, SHA-256 8111c5fe… verified.
  Deadlines: 120s chat / 60s KB, unit-proven in `ai-stream-abort.spec.ts` (6 passed).
- [x] Retries cover only replay-safe pre-stream operations; a paid request is never duplicated.
  Verified in the SDK source: `ai@7.0.51` wraps only `streamLanguageModelCall` in `retry(...)`
  (`node_modules/ai/dist/index.js:9673-9679`), which resolves when the model returns a stream handle — before the
  first token — so a retry never replays generated output. KB used `maxRetries: 0` and chat the shared policy;
  aligned both on `resolveLlmRetryPolicy()`. Proof: `kb-rag-stream-resilience.spec.ts` → "bounds retries with the
  shared policy" (2), "dispatches the paid streaming call exactly once per turn" (1 streamText call, 1 reserve),
  "settles the reservation exactly once even if onFinish is invoked twice" (1 settle). 13 passed.
- [x] A streaming handler must not commit its transaction while tools are still running.
  `TenantContextInterceptor` commits when the handler's observable completes, and a streaming handler returns the
  instant it hands off the stream. Both streaming routes carry `@NoTenantTransaction()`; that is now asserted by
  reflection rather than by reading, and a directory scan fails if any AI controller takes `@Res()` without the
  opt-out. Proof: `npx jest src/modules/ai/core/streaming/ai-stream-route-contract.spec.ts` → 4 passed
  (11 controller files scanned).
- [x] The stream helper returns synchronously, so a `try/catch` around it never sees a provider fault — error and abort callbacks must be wired explicitly.
  Both `streamText` call sites audited: `onChunk`/`onError`/`onFinish` wired, plus the `finishReason` rejection
  arm. P1 FOUND AND FIXED at the *other* synchronous seam: `pipeTextStreamToResponse` returns a `Promise<void>`
  that rejects on a mid-stream fault (`ai/dist/index.d.ts:7462`), and **both controllers dropped it** —
  `result.pipeTextStreamToResponse(res)` with no await and no catch. Only `main.ts`'s global `unhandledRejection`
  handler kept the API alive; the client got a truncated 200. Now awaited through `pipeAiTextStream`.
  Bite proof: changing that one `await` back to `void` **kills the Jest worker** — `Error: upstream 503`,
  "Jest worker encountered 4 child process exceptions", 0 tests run. Restored, SHA-256 6ff0aac9… verified.
- [x] Structured outputs are validated and citation/source integrity is preserved; a failed model, retrieval, tool or stream renders a safe partial or error state.
  P1 FOUND AND FIXED: `KbRagController.streamAsk` computed `result.sources` and **threw them away** — the
  streaming answer shipped with no citations at all while its buffered sibling `POST /public/kb/ask` returned
  them. Now emitted as an `x-kb-sources` header before the body (URL-encoded JSON, capped at 4KB, with
  `access-control-expose-headers`), so they survive a stream that is later truncated.
  P1 FOUND AND FIXED: both route catches rewrapped **every** failure as `InternalServerErrorException`, so the
  breaker's 503, the concurrency cap's 503 and the credit ledger's 402 all reached the client as an opaque 500 —
  nothing could tell "back off" from "top up" from "we broke". `rethrowStreamRouteError` now passes an
  `HttpException` through untouched and still hides everything else behind a generic 500.
  Structured outputs stay Zod-validated at the gateway (`invokeStructured`, unchanged; no streaming structured
  output exists). Proof: `kb-rag-stream.controller.spec.ts` 10 passed + `chat-assistant-stream.controller.spec.ts`
  7 passed + `ai-stream-response.spec.ts` 12 passed. Bite proof: neutering the `HttpException` passthrough →
  **3 failed** (402 became 500); restored.


---

## Session S3 evidence footer (2026-09-02)

Gates run, output read:

| Gate | Result |
|---|---|
| `nice -n 10 npx jest src/modules/ai --maxWorkers=2` | **49 suites passed / 1 skipped, 409 passed / 21 skipped** (baseline 41 suites, 338 passed) |
| `tsc --noEmit -p tsconfig.json` (8 GB heap) | exit 2, **0 errors under `src/modules/ai/`** (3 errors elsewhere: `hr/directory`, `support/core` — another agent's in-flight refactor) |
| `npx eslint` on all 17 changed/added files | **0 errors, 0 warnings** |
| `pnpm -s check:route-classification` | exit 0 — ALL ROUTES CLASSIFIED, UNDECLARED 0 |
| `pnpm -s check:log-secrets` | exit 0 — 3498 files scanned |

Handed to ticket 10 (its files, actively being edited): `ai-gateway.service.ts` mints `randomUUID()` at
7 entry points (lines 75, 89, 140, 153, 166, 195, 246) — see the ticket-31 handover in the S3 report.
