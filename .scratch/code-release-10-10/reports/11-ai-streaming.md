# Ticket 11 — stream the non-chat AI surfaces, propagate aborts/deadlines/breakers · session S3 · 2026-09-02

**Outcome:** 5 of 7 boxes closed, 2 left open with a precise gap list. Five P1 defects found in the
streaming path and fixed, each bite-proven. No git run. BE = `streamlineos-backend`.

## Audit — which non-chat AI surfaces stream

`grep -rn "streamText(\|pipeTextStreamToResponse" src --include=*.ts` → **4 non-spec hits**, all in
chat + KB RAG. Exactly **one** non-chat AI surface streams: `POST /public/kb/stream-ask`. The other
~60 AI endpoints across 11 controllers buffer, and most are `invokeStructured` (Zod-validated JSON).
`POST /public/kb/stream-ask` has **no frontend consumer** — `hooks/api/chat-ai-assistant.ts` is the
only stream client in the FE and it is hard-wired to `/chat`.

## P1 defects found and fixed

1. **The circuit breaker could open exactly once per process, ever.** `recordCbFailure` set `openedAt`
   only when `failures === THRESHOLD`. Past the threshold the equality stops matching, the 30 s window
   expires, and only a *success* resets the counter — which a dead provider never gives. So after the
   first 30 s the breaker was inert and every request went to the dead provider for the rest of the
   process. Redis had the same `count === THRESHOLD`, and its failures key had **no TTL** at all, so a
   count from an old outage persisted indefinitely. Fixed in `AiStreamBreaker` (re-arm on every failure
   at or above the threshold; rolling TTL on the counter).
2. **The public KB stream had no breaker at all** — the one unauthenticated AI surface. It now shares
   the breaker, and `assertClosed()` runs **before** retrieval, so an open breaker spends nothing on
   embeddings, credits or a concurrency slot.
3. **Both controllers dropped the pipe promise.** `pipeTextStreamToResponse` returns a `Promise<void>`
   that rejects on a mid-stream provider fault; `result.pipeTextStreamToResponse(res)` had no `await`
   and no `.catch`. Only `main.ts`'s global `unhandledRejection` handler kept the API process alive;
   the client got a truncated 200 with no error signal. Now awaited through `pipeAiTextStream`.
4. **Both route catches flattened every failure to 500.** `catch (error) { throw new
   InternalServerErrorException(...) }` swallowed the breaker's 503, the concurrency cap's 503 and the
   credit ledger's 402 (`INSUFFICIENT_CREDITS`). A client could not tell "back off" from "top up" from
   "we broke", and the breaker — even when it did trip — was invisible as anything but a generic 500.
5. **The KB stream discarded its citations.** `streamAnswer` computes and returns `sources`; the route
   never used them, so the streaming answer shipped with no citations while its buffered sibling
   `POST /public/kb/ask` returned them. Now sent as an `x-kb-sources` header **before** the body
   (URL-encoded JSON, 4 KB cap, `access-control-expose-headers`), so they survive a truncated stream.

Also: the client-disconnect arm used `res.on("close", () => abort())`, which also fires on a *successful*
response; it is now `req.on("close")` gated on `res.writableEnded`, matching `TenantContextInterceptor`.
The KB stream recorded neither TTFT nor app overhead (chat did) — both now settle onto the usage row.
KB used `maxRetries: 0` while chat used the shared policy; both now use `resolveLlmRetryPolicy()`.

## Bite proofs (each command run, each number read)

| Fix | Neutered to | Result |
|---|---|---|
| Breaker re-arm + TTL | `=== threshold`, TTL removed | **4 failed, 9 passed** (13) → restored, SHA-256 `8111c5fe…` |
| Awaited pipe | `await` → `void` | **Jest worker dies**: `Error: upstream 503`, "4 child process exceptions", 0 tests run → restored, SHA-256 `6ff0aac9…` |
| HttpException passthrough | `&& false` | **3 failed, 4 passed** (402 became 500) → restored |
| Correlation-id default | ambient lookup removed | **3 failed, 3 passed** → restored, SHA-256 `5c5fcb80…` |

Retry replay-safety was verified in the SDK source, not assumed: `ai@7.0.51` wraps only
`streamLanguageModelCall` in `retry(...)` (`node_modules/ai/dist/index.js:9673-9679`), which resolves
when the model returns a stream handle — before the first token. A retry never replays generated output.

## Boxes

- **[x] 3 breakers/deadlines** — breaker proven to open, to re-arm after the window, and to reject in
  the open state; 120 s chat / 60 s KB deadlines unit-proven.
- **[x] 4 retries** — SDK source + one dispatch, one reserve, one settle per turn.
- **[x] 5 no commit while tools run** — both streaming routes carry `@NoTenantTransaction()`, asserted
  by reflection plus a scan that fails if any AI controller takes `@Res()` without it.
- **[x] 6 synchronous stream helper** — both `streamText` sites audited; the *other* synchronous seam
  (the pipe) was the live bug.
- **[x] 7 structured output / citations / safe error state** — citations restored, statuses preserved.
- **[ ] 1 non-chat surfaces stream** — PARTIAL. TTFT/overhead instrumentation landed on the one
  streaming non-chat surface. Converting the buffered ones needs a **frontend stream client**
  (out of S3's territory), and adding more BE-only streaming routes would add unreachable code —
  `stream-ask` itself already has no consumer.
- **[ ] 2 aborts propagate everywhere** — PARTIAL. Provider adapter, gateway runner, concurrency slot,
  reservation and breaker short-circuit all done. **Not** done, both outside my territory:
  (a) `KbRagRetrievalService.retrieveContext` / `AiGatewayService.embedQueryWithCredit` take no
  `AbortSignal`, so a disconnect during the retrieval leg does not stop the embedding call — **ticket 10**;
  (b) `withTenantScopedTools` forwards `options.abortSignal` to each tool intact, but the per-tool
  `runInNewTenantTransaction` is not torn down on abort — `common/tenant/`.

## Ticket 31 handover (correlation ids)

**Half taken, half handed to ticket 10.** `ai_usage_logs.correlation_id` is now defaulted at the single
write site from the ambient observability context —
`src/modules/ai/core/services/ai-usage.service.ts:17-21` (`resolveCorrelationId`), used at line 62.
Explicit wins over ambient (OutboxWriter's shape); an id longer than the `varchar(64)` column is dropped
rather than losing the whole row to a 22001. **This is what makes the streaming paths correlate**:
`settleStream` never passed a correlation id, so every streamed turn billed an orphan row.
Asserted on the object that reaches `tx.insert().values()`, not on what the test handed the mock —
`ai-usage-correlation.spec.ts`, 6 passed, including a `settleStream` end-to-end case.

**Handed to ticket 10, not taken:** `src/modules/ai/core/gateway/ai-gateway.service.ts` mints
`randomUUID()` at **lines 75, 89, 140, 153, 166, 195, 246**. Those pass the minted id explicitly, so the
write-site default cannot rescue them — they need
`getObservabilityContext()?.correlationId ?? randomUUID()` at each site. I did **not** edit that file:
it was modified at **17:06** today and ticket 10 also created `ai-gateway-embed.helper.ts` at 17:06 and
edited `embeddings.service.ts`, `kb-rag-retrieval.service.ts` and `ai-gateway.service.spec.ts` — it is
actively in that file, and the brief assigns the gateway to it.

## Gates (run, output read)

| Gate | Result |
|---|---|
| `nice -n 10 npx jest src/modules/ai --maxWorkers=2` | **49 suites passed / 1 skipped · 409 passed / 21 skipped** (session start: 41 suites, 328 passed) |
| `tsc --noEmit -p tsconfig.json` (8 GB heap) | exit 2, **0 errors under `src/modules/ai/`** |
| `npx eslint` on all 17 changed/added files | **0 errors, 0 warnings** |
| `pnpm -s check:route-classification` | exit 0 — ALL ROUTES CLASSIFIED, UNDECLARED 0 |
| `pnpm -s check:log-secrets` | exit 0 — 3498 files scanned |

The backend typecheck was **exit 0 / 0 errors** when I started (the ~15 storage/kb-wiki/payroll errors
the brief warned about were already cleared). It now reports **3**, none mine and none in `modules/ai`:
`src/modules/hr/directory/org-structure-headcount.service.spec.ts:52` (`hrHeadcountNamespace` missing
from the cache-key map) and `src/modules/support/core/support-ai-triage-charge.spec.ts:60,116`
(`SupportAiTriageAnalysisService` "expected 5 arguments, but got 6" — a constructor param was dropped
under the spec). Another agent is mid-refactor there.

## Files changed (absolute)

New:
- `streamlineos-backend/src/modules/ai/core/streaming/ai-stream-abort.ts`
- `streamlineos-backend/src/modules/ai/core/streaming/ai-stream-breaker.ts`
- `streamlineos-backend/src/modules/ai/core/streaming/ai-stream-response.ts`
- `streamlineos-backend/src/modules/ai/core/streaming/index.ts`
- `…/streaming/ai-stream-abort.spec.ts` (6) · `ai-stream-breaker.spec.ts` (13) ·
  `ai-stream-response.spec.ts` (12) · `ai-stream-route-contract.spec.ts` (4)
- `…/core/services/kb-rag-stream-resilience.spec.ts` (13) · `ai-usage-correlation.spec.ts` (6)
- `…/core/controllers/kb-rag-stream.controller.spec.ts` (10) · `chat-assistant-stream.controller.spec.ts` (7)

Edited:
- `streamlineos-backend/src/modules/ai/core/services/chat-assistant.service.ts` (breaker extracted; no
  constructor change, so no spec churn — its `no-empty` warning is gone too)
- `streamlineos-backend/src/modules/ai/core/services/kb-rag.service.ts` (breaker, TTFT/overhead, retry policy;
  `@Optional() @Inject(REDIS)` added **last with a default**, so the existing positional constructions still compile)
- `streamlineos-backend/src/modules/ai/core/services/ai-usage.service.ts` (correlation-id default)
- `streamlineos-backend/src/modules/ai/core/controllers/kb-rag.controller.ts`
- `streamlineos-backend/src/modules/ai/core/controllers/chat-assistant.controller.ts`
- `streamlineos-frontend/.scratch/code-release-10-10/issues/11-stream-non-chat-ai-surfaces.md` (boxes + evidence)

No module wiring changed — the streaming seam is plain classes/functions, so `core/ai.module.ts` and
`gateway/ai-gateway.module.ts` were **not** touched.

## Other agents' territory — found in transit, not fixed

- **P1, ticket 10 or whoever owns blog AI.** `src/modules/ai/core/services/blog-ai.service.ts` passes
  `actor: { orgId: "", userId }` with `charge: true` at **all three** call sites (lines 52, 78, 104), and
  audits with `orgId: ""`. Credits for every blog AI action are reserved and settled against an **empty
  org id**, and the audit row is untenanted. Three endpoints: `improve-writing`, `suggest-title`,
  `summarize`.
- **Ticket 10.** `AiGatewayService.embedQueryWithCredit` remains the only paid provider call that takes
  no concurrency slot (carried over from ticket 09) **and** takes no `AbortSignal` (box 2 above).
- The breaker keys (`ai:cb:chat:*`, `ai:cb:kb:*`) are global, not per-org. That is right for a provider
  outage but means one tenant's sustained faults trip the breaker for everyone. Left as-is deliberately.
