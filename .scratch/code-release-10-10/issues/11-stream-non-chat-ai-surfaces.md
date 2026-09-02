# 11 — Stream the non-chat AI surfaces and propagate aborts, deadlines and breakers

**What to build:** Non-chat AI surfaces buffer a complete answer before responding. They should stream text and tool progress, and honour cancellation end to end so a client disconnect stops the spend rather than continuing to pay for output nobody will read.

**Blocked by:** 09.

**Status:** 6 of 7 boxes closed · session S4 (2026-09-02)

- [ ] Non-chat AI surfaces stream rather than buffering; first visible streamed state lands within the target and application overhead before provider dispatch stays inside its budget.
  PARTIAL — NOT CLOSED. S4 audit of current source (`grep -rn "streamText(\|pipeTextStreamToResponse" src --include="*.ts"` → 5 non-spec hits):
  streaming today = `POST /chat`, `POST /public/kb/stream-ask`, and **new** `POST /ai/blog/posts/:postId/{improve-writing,suggest-title,summarize}/stream`.
  Buffering = the other ~65 endpoints across 11 AI controllers. Of the 119 paid gateway call sites, 69 are
  `invokeStructured*` (Zod-validated JSON — a half-parsed object is not renderable partial state) and 43 are
  `invokeText*` (streamable). What landed: `AiGatewayService.streamTextWithUsage` — the real streaming sibling of
  `invokeText` (breaker · concurrency slot · atomic reserve before the paid call · token-metered settle after ·
  abort release), plus `respondWithAiTextStream`, so converting one more surface is now a prompt-builder extraction
  and ~10 lines of controller. TTFT and app overhead land on the settled usage row through `AiCallMetrics`
  (`ai-gateway-stream.helper.spec.ts` → "records ttft and application overhead onto the settled usage row").
  What did not: the remaining ~40 `invokeText` surfaces. **Correction to the S3 note** — the blocker was never
  `@NoTenantTransaction()`: every AI controller already carries it at class level, so streaming needs no transaction
  refactor. The real blocker is a frontend stream client (only `hooks/api/chat-ai-assistant.ts` exists, hard-wired
  to `/chat`) — ticket 13's territory. There is also **no declared TTFT target or app-overhead budget in the repo**:
  `common/observability/seam-budgets.ts` has 9 seams, none of them AI, so "inside its budget" has no number to
  check against. That is a product decision, not a code gap.

- [x] Client aborts propagate through the gateway, database, cache and provider adapters. Spending stops on cancellation.
  P1 FOUND AND FIXED — the S3 claim that "signal reaches the provider adapter" was **false in production**, and its
  6 passing tests could not see it. `createStreamAbortSignal` detected a hang-up with `req.on("close")`. Express
  drains the body before a handler runs, so by then `req.complete === true` and `req.destroyed === true`: a listener
  attached early fires **immediately on a healthy request**, one attached late (the real Nest case) **never fires at
  all**. Measured on a real Express 5 server: `req:close +0ms writableEnded=false` on a successful request;
  on a client abort at 100 ms the only event was `res:close +100ms writableEnded=false`. So **no client disconnect
  has ever reached a provider call** on either streaming route — only the 60 s/120 s deadline stopped the spend.
  `TenantContextInterceptor` (`common/tenant/`, NOT my territory) has the identical arm; it is invisible only
  because `getTenantAbortSignal()` had **zero readers** repo-wide.
  Fixed: watch `res.on("close")` gated on `writableEnded`, and treat a request close as a hang-up only when
  `req.complete !== true`. Second gap closed: every AI controller is `@NoTenantTransaction()`, so the tenant
  interceptor never establishes a signal there and the gateway's `signal` option had **no supplier at any of the 119
  call sites** — `AiRequestAbortInterceptor` now scopes a request signal that the gateway resolves for the text,
  structured, image and embedding paths (explicit still wins).
  Proof — asserts on what the **LangChain client** received, not on what the test handed the gateway:
  `ai-abort-reaches-provider.spec.ts` → 9 passed ("hands the ambient request signal to the LangChain client, with no
  call site passing one"; "releases the reservation and settles NO charge when the caller hangs up mid-call" →
  `settle` 0 calls, `release(42, "cancelled", "org_1")`; "records the turn as cancelled and bills zero
  milli-credits"; "a caller who already left never reserves credits and never reaches the provider").
  Real-server proof: `ai-request-abort.integration.spec.ts` → 3 passed — boots Nest, hangs a real socket up
  mid-request, ambient signal aborts; a healthy request is never cancelled; a `@Res()` handler still works.
  Bite proof: reverting to the request-only detector → the real-server hang-up case **fails**
  (`abortedAtEnd` expected true, received false) and the four-suite abort run goes **8 failed / 28 passed**;
  restored, SHA-256 `a1269342…` and an empty `git diff`.
  Cache leg: a cancelled call returns `{ok:false}`, which `AiResponseCacheService` raises as `UncacheableAiFailure`,
  so nothing is cached. Residuals, both harmless to spend and both stated rather than hidden: (a) the embedding
  **HTTP request** cannot be torn down — `@langchain/openai`'s `embeddingWithRetry` hardcodes `requestOptions = {}`
  (`node_modules/@langchain/openai/dist/embeddings.js:126`), so there is no per-call signal; the seam still refuses
  before dispatch, releases the reservation and never reaches the completion leg; (b) `withTenantScopedTools`' per-tool
  `runInNewTenantTransaction` is still not torn down on abort — `common/tenant/`, another territory, chat-only, no spend.

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
