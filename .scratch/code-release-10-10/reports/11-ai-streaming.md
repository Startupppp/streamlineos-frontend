# Ticket 11 — stream the non-chat AI surfaces, propagate aborts/deadlines/breakers · session S4 · 2026-09-02

**Outcome:** 6 of 7 boxes closed. The one box S3 reported as "provider adapter — done" was **false in
production**: no client disconnect had ever reached a provider call on any route, and its 6 passing tests
could not see it. Found, fixed, and proven against a real HTTP server. BE = `streamlineos-backend`.
Commits `82ab7a55` and `9062b909`.

## The P1 — a cancellation path that was inert everywhere

`createStreamAbortSignal` detected a client hang-up with `req.on("close")`. That is the wrong stream.

Measured on a real Express 5 server (probe, not reasoning):

| Scenario | Events observed |
|---|---|
| Successful request, listener attached at handler start | `req:close +0ms writableEnded=false` · `res:close +305ms writableEnded=true` |
| Client aborts at 100 ms, handler sleeps 300 ms | `req:close +0ms` (spurious) · **`res:close +100ms writableEnded=false`** |
| Listener attached after two `setImmediate`s (the real Nest case) | `req.complete=true`, `req.destroyed=true`, `req` close **never fires** |

Express drains the body before the handler runs, so `req` is already complete and destroyed. Attach early
and the arm fires on a **healthy** request; attach late and it **never fires**, which is exactly what a
genuine disconnect then looks like. Both live streaming routes (`POST /chat`, `POST /public/kb/stream-ask`)
used it, so a closed tab kept generating tokens until the 60 s/120 s deadline.

Fixed: watch `res.on("close")` gated on `writableEnded` — the arm that actually fires on a hang-up and
stays quiet on success — and keep the request arm only for Node's documented premature-termination case
(`req.complete !== true`).

**Second half of the same defect.** Even repaired, the signal reached nothing. Every AI controller carries
`@NoTenantTransaction()`, so `TenantContextInterceptor` returns before it builds its AbortController, and
`getTenantAbortSignal()` had **zero readers repo-wide**. Across all **119 paid gateway call sites**, not one
passed `signal`. The option existed on `AiInvokeBaseOpts`, on `LlmService`, and on the LangChain call — a
fully-plumbed chain with no source. `AiRequestAbortInterceptor` now scopes a request signal that the gateway
resolves for the text, structured, image and embedding paths; an explicit signal still wins.

Cancellation is now a first-class outcome rather than a provider fault: `kind: "cancelled"`, released with
reason `"cancelled"`, recorded through the existing `AiCallMetrics` seam (no new log lines), and it does not
feed the circuit breaker — a busy afternoon of closed tabs must not trip it.

## Proof (each command run, each number read)

Asserted on what the **LangChain client** received, never on what the test handed the gateway — the whole
point is that the option was always present and always empty.

| Spec | Result |
|---|---|
| `ai-abort-reaches-provider.spec.ts` | **9 passed** — signal identity at the provider; `settle` 0 calls; `release(42,"cancelled","org_1")`; `outcome: cancelled`, 0 milli-credits; already-gone caller never reserves and never dispatches |
| `ai-request-abort.integration.spec.ts` | **3 passed** — boots Nest, hangs a real socket up mid-request |
| `ai-gateway-stream.helper.spec.ts` | **10 passed** — reserve strictly before dispatch, token-metered settle, settle-once, release-not-settle on death |
| `ai-stream-abort.spec.ts` | **9 passed** — drained body is not a hang-up; unfinished response is |

### Bite proofs

| Fix | Neutered to | Result |
|---|---|---|
| Response-close detector | the pre-fix `req.on("close")`-only arm | real-server hang-up **fails** (`abortedAtEnd` expected true, received false); four-suite abort run **8 failed / 28 passed** |

Restored, SHA-256 `a1269342…`, `git diff` empty against the commit.

## Streaming (box 1) — what landed and what the real blocker is

`AiGatewayService.streamTextWithUsage` is the streaming sibling of `invokeText`: breaker, concurrency slot,
atomic reserve **before** the paid call, token-metered settle after, release-without-settle on abort, TTFT
and app overhead onto the usage row. `respondWithAiTextStream` is the route half. The blog AI text surfaces
stream through it beside their buffered routes (additive — no existing consumer changes).

**Correction to the S3 report:** the blocker was never the request transaction. Every AI controller already
carries `@NoTenantTransaction()` at class level, so streaming needs no transaction refactor. Converting one
more surface is now a prompt-builder extraction plus ~10 lines of controller.

Two things genuinely block the rest:
- **No frontend stream client** except `hooks/api/chat-ai-assistant.ts`, hard-wired to `/chat` — ticket 13.
- **No declared TTFT target or app-overhead budget exists.** `common/observability/seam-budgets.ts` holds 9
  seams and none is AI, so "inside its budget" has no number to check against. A product decision.

Of 119 paid call sites, 69 are `invokeStructured*` (Zod-validated JSON, where a half-parsed object is not a
renderable partial state) and 43 are `invokeText*` (streamable).

## Gates (run, output read)

| Gate | Result |
|---|---|
| `jest --runInBand --testPathPattern="modules/ai"` | **55 suites passed / 1 skipped · 515 passed / 21 skipped** (S3 left it at 49 suites / 409) |
| `pnpm typecheck` (8 GB heap) | **exit 0 · 0 errors** |
| `pnpm check:spec-typecheck` | exit 2 · 4 errors, **0 under `modules/ai`** (2 `feedbucket/tests`, 2 `storage` — not mine; the 2 the coordinator attributed to `ai-stream-abort.spec.ts` are cleared) |
| `pnpm check:ai-charge` | exit 0 · **122 invocations**, self-test 14 passed |
| `pnpm check:route-classification` | exit 0 — ALL ROUTES CLASSIFIED, UNDECLARED 0 |
| `pnpm check:log-secrets` | exit 0 · 3527 files |
| `pnpm check:module-di` | exit 0 · 216 modules · 1702 classes · 0 violations |
| `npx eslint` on all changed/added files | **0 errors, 0 warnings** |
| `pnpm check:over-300` | exit 1 · 401 files, 7 above baseline — **not mine**: every AI file over 300 was over 300 at HEAD, none crossed the line |
| `madge --circular` | **not run** — `madge` is not installed in this repo |

`check:ai-charge` derived its coverage from names starting `invoke`/`embed`, so `streamTextWithUsage` would
have escaped the scan entirely — the exact failure its own header comment warns about. Widened to cover it;
it now reports 3 streaming call sites, all declaring `charge`.

## Files changed (absolute)

New:
- `streamlineos-backend/src/modules/ai/core/streaming/ai-request-abort.ts`
- `streamlineos-backend/src/modules/ai/core/streaming/ai-request-abort.interceptor.ts`
- `streamlineos-backend/src/modules/ai/core/streaming/ai-text-stream-route.ts`
- `streamlineos-backend/src/modules/ai/core/gateway/ai-gateway-stream.helper.ts`
- `…/streaming/ai-request-abort.integration.spec.ts` (3) · `…/gateway/__tests__/ai-abort-reaches-provider.spec.ts` (9)
  · `…/gateway/__tests__/ai-gateway-stream.helper.spec.ts` (10)

Edited: `ai-stream-abort.ts` (+ spec) · `streaming/index.ts` · `ai-gateway.service.ts` · `ai-gateway.types.ts` ·
`ai-gateway-runner.helper.ts` · `ai-gateway-credit.helper.ts` · `ai-gateway-embed.helper.ts` ·
`providers/embeddings.service.ts` · `services/ai-service-exceptions.ts` · `services/gateway-result.util.ts` ·
`services/kb-rag.service.ts` · `services/kb-rag-retrieval.service.ts` · `services/blog-ai.service.ts` ·
`controllers/blog-ai.controller.ts` · the 12 AI controllers (interceptor) · `ai.module.ts` ·
`executive-brief.module.ts` · `ai-summaries.module.ts` · `kb-rag-stream.controller.spec.ts` ·
`chat-assistant-stream.controller.spec.ts` · `src/scripts/check-ai-charge-declared.mjs`

## Other agents' territory — found, not fixed

- **P1, `common/tenant/tenant-context.interceptor.ts`.** It has the identical broken `req.on("close")` arm.
  Today that is invisible because `getTenantAbortSignal()` has zero readers — but the moment anyone wires it
  (the obvious "fix" for this box), the arm fires at +0 ms on healthy requests and **every AI call made from a
  transactional controller aborts before it starts**. Fix it the same way: `res.on("close")` gated on
  `writableEnded`, request arm gated on `req.complete !== true`.
- **`common/tenant/`** — `withTenantScopedTools` forwards `options.abortSignal` to each tool, but the per-tool
  `runInNewTenantTransaction` is not torn down on abort. Chat-only; holds a connection, does not spend.
- **P1, blog AI tenancy (carried from S3, still true at `blog-ai.service.ts:52,78,104`).** All three call sites
  pass `actor: { orgId: "", userId }` with `charge: true`, so every blog AI action reserves and settles against
  an **empty org id** and audits untenanted. My streaming siblings deliberately take the real `orgId`; the
  buffered ones are unchanged so the fix stays one reviewable change for whoever owns it.
- `@langchain/openai` cannot carry a per-call `AbortSignal` into an embedding request
  (`embeddings.js:126` hardcodes `requestOptions = {}`). Stopping that HTTP request needs the `openai` SDK as a
  direct dependency — a dependency decision, not a code fix.
