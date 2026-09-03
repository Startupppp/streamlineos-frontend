# Ticket 17 — AI streaming and reliability — head audit

**Date:** 2026-09-03
**Frontend head:** `26df21488` (branch `release/code-10-10-v2`)
**Backend head:** `66f09164f` (branch `release/code-10-10-v2`)
**Prior report:** none — this is a from-scratch reconstruction.
**Scope note:** CRM and Inventory findings are recorded but NOT counted against the release, per the wave rules.

**Verdict: partially-met.** Two of the five criteria are met on the paths that were actually
measured; one is met only for the buffered gateway and breaks on the one multi-step streaming
surface; one is not met at the transport level; and one is met on 26 of ~37 frontend AI surfaces.
Separately, the audit found a **P0 that ticket 17 is downstream of**: `POST /chat` — the
product-wide Ask-OS assistant, the single largest AI surface in the app and the one all of
C152–C155 are written about — cannot complete a single request at head. It is a
`@NoTenantTransaction()` handler with two unwrapped database seams, and the app role raises
SQLSTATE 42501 on both. Measured against the local head database, not inferred.

---

## 1. What I read, with numbers

### 1.1 Backend AI surface (enumerated, not sampled)

| Dimension | Count | How counted |
|---|---|---|
| Files under `src/modules/ai/` | **186** | `find src/modules/ai -type f` |
| AI-surface HTTP controllers | **15** | 12 in `modules/ai` + `kb/wiki/kb-page-ai` + `kb/help-centre/kb-article-ai` + `kb-rag` |
| HTTP routes on those controllers | **108** | `grep -cE '^\s*@(Get\|Post\|Patch\|Put\|Delete)\('` per file |
| Declared `/stream*` routes | **19** | `@Post("…stream…")` sweep |
| Streaming endpoints in total | **20** | the 19 + `POST /chat` (pipes without a `/stream` segment) |
| Paid gateway invocations | **124** | `check:ai-charge` (EXIT 0) |
| — of which streaming | **12** | `streamTextWithUsage` |
| — of which buffered text | **36** | `invokeText` 25 + `invokeTextWithUsage` 11 |
| — of which structured | **70** | `invokeStructured` 65 + `WithUsage` 3 + image 2 |
| — of which embedding | **6** | `embedQueryWithCredit` 4 + `embedBatchWithCredit` 2 |
| Files containing a gateway invocation | **48** | grep across `src/` |
| Routes carrying a citation/sources header | **3** of 20 | `kb-rag` `x-kb-sources`, meetings prep + follow-up |
| Files using `dedupe: true` | **7** of 124 invocations | grep |
| Files using the response cache (`cache:`) | **2** | grep |
| `@Idempotent` decorators in `src/modules/ai` | **0** | grep |

Read in full or in substantive part (line counts from `wc -l`):

`gateway/` — `ai-gateway.service.ts` (404), `ai-gateway-stream.helper.ts` (209),
`ai-gateway-credit.helper.ts` (313), `ai-gateway-runner.helper.ts` (211),
`ai-gateway-runner-call.ts` (260), `ai-response-cache.service.ts` (79),
`ai-concurrency-limiter.ts` (54), `credit-ledger.interface.ts` (28), `ai-gateway.types.ts` (123).

`streaming/` — all 11 files, 1,516 lines including the six spec files:
`ai-text-stream-route.ts` (75), `ai-stream-response.ts` (76), `ai-request-abort.ts` (38),
`ai-request-abort.interceptor.ts` (41), `ai-stream-breaker.ts` (105), plus
`ai-stream-surface.integration.spec.ts` (192), `__tests__/ai-cancellation-stops-the-spend.spec.ts` (285),
`__tests__/ai-ambient-abort-covers-metered-routes.spec.ts` (234),
`ai-stream-route-contract.spec.ts` (165), `ai-stream-breaker.spec.ts` (175),
`ai-stream-response.spec.ts` (155).

`services/` — `chat-assistant.service.ts` (298), `chat-assistant-context.ts` (156),
`chat-history.service.ts`, `chat-conversation-messages.ts` (110), `kb-rag.service.ts` (253),
`org-features.service.ts` (48), `kb-rag-retrieval.service.ts` (partial).

`providers/` — `llm.service.ts` (361), `llm-retry.ts` (138).
`telemetry/` — `ai-stream-budgets.ts` (47), `ai-call-metrics.ts` (partial).
Controllers — `chat-assistant.controller.ts` (full, ~430), `kb-rag.controller.ts` (100),
plus decorator/route sweeps of the other 13.

Supporting infrastructure — `common/http/stream-abort.ts` (80),
`common/tenant/tenant-context.interceptor.ts`, `common/tenant/tenant-db.ts` (25),
`common/tenant/run-in-tenant-transaction.ts` (76), `common/tenant/with-tenant.ts` (partial),
`common/tenant/no-tenant-transaction.decorator.ts` (13), `db/drizzle.module.ts` (partial),
`db/pool.config.ts` (partial), `modules/billing/core/ai-credits-reservation.service.ts` (partial).

Third-party — `node_modules/ai@7.0.51/dist/index.js` abort/flush/`finishReason` machinery
(lines 9195–9340, 10155–10200, 2619–2640).

### 1.2 Frontend AI surface

| Dimension | Count |
|---|---|
| Files in `components/ai/` | **20** (3,897 lines, 5 of them tests) |
| Files importing an AI hook module (non-test) | **37** |
| Surfaces adopting the nine-state vocabulary | **26** |
| Surfaces rendering AI failure as a bare toast | **11** (7 CRM = out of scope, 4 HR/exec-brief = in scope) |
| Frontend files that call `classifyAiError` | **10** (7 non-test) |
| Frontend stream consumers (`getReader`) | **2** (`hooks/api/ai-text-stream.ts`, `features/notifications/notification-event-stream.ts`) |
| Files referencing an `/ai/` route path (non-test, non-`.next`) | **7** — the call surface is genuinely centralised in hooks |

Read in full: `hooks/api/ai-text-stream.ts` (204), `hooks/api/ai.ts` (307),
`hooks/api/ai-abort.ts` (28), `hooks/api/chat-ai-assistant.ts` (151),
`hooks/api/kb/doc-ai-stream.ts` (45), `components/ai/ai-error-state.ts` (93),
`components/ai/ai-action-result-body.tsx` (261), `components/ai/use-ai-inline-action.ts` (137),
`components/ai/ai-nine-states.test.tsx` (159), `hooks/api/authorized-mutation.ts` (55),
`components/providers/query-provider.tsx` (partial),
`features/wiki/components/kb-page-ai-actions.tsx` (99),
`features/calendar/meeting-follow-up-stream-parse.ts` (partial, 70 lines),
plus targeted greps across the HR / exec-brief / survey / help-centre AI surfaces.

### 1.3 Commands actually run

Backend gates (all `nice -n 10 npm run --silent`):

| Gate | Exit | Corpus it reported |
|---|---|---|
| `check:ai-charge` | 0 | 124 invocations scanned, all declare `charge` (1 allowlisted) |
| `check:transaction-callbacks` | 0 | 2,124 spec files, 280 with a transaction double, 482 doubles |
| `check:fire-and-forget` | 0 | 3,666 files; tier 1 = 0, tier 2 = 255 vs ratchet 279 |
| `check:scope-application` | 0 | 150 scope resolutions, 150 applied |
| `check:route-classification` | 0 | 3,635 handlers, 0 undeclared |

Test runs:

| Suite pattern | Result | Wall |
|---|---|---|
| backend `modules/ai/core/(streaming\|gateway\|telemetry)/` | **19 suites / 223 tests, all PASS** | 43.7 s |
| frontend `components/ai/`, `hooks/api/ai*`, `hooks/api/chat-ai*`, `components/kb/kb-doc-ai*`, calendar + survey + accounting streaming | **17 suites / 169 tests, all PASS** | 8.5 s |

Database probes against `scratch_head_1010` (owner and non-owner `streamline_app`) — verbatim
outputs quoted in §3.

Own instrumentation: one throwaway probe of `ai@7.0.51` abort semantics, written to the session
scratchpad (`…/scratchpad/abort-probe.mjs`, outside both repos), output quoted in §3.2. No file
in either repository was modified.

---

## 2. Per-criterion assessment

### PRD-C002 — "complete v2 ticket 17's streaming, cancellation, deadline, structured-output, citation, credit and frontend failure-state criteria"

**Status: partially-met.** This is the roll-up of C152–C155. Dimension by dimension:

| Dimension | Verdict | Evidence |
|---|---|---|
| Streaming | partial | 20 of 20 streaming endpoints stream correctly over a real socket (measured); but 36 buffered `invokeText` call sites remain, and the one route that emits citations with a stream (`/public/kb/stream-ask`) has no production caller — the KB widget calls the buffered `/public/kb/ask` (`hooks/api/support/kb-rag.ts:50`) |
| Cancellation | partial | Correct and measured for the single-step gateway/KB shape; **breaks on the multi-step chat shape** (F-2) |
| Deadline | met | `AI_TEXT_STREAM_DEADLINE_MS` 60 s, `CHAT_STREAM_DEADLINE_MS` 120 s, `AI_REQUEST_DEADLINE_MS` 120 s, provider `FAST_TIMEOUT_MS` 30 s / `STANDARD_TIMEOUT_MS` 60 s, client backstop 180 s — a strictly increasing ladder, verified by reading all five constants |
| Structured output | met (backend) | `withStructuredOutput(schema, {method:"jsonSchema", strict:true})` **and** a second `schema.parse()` in `llm.service.ts:239,257,331,357`; `ZodError` → release + `invalid_output`, never retried |
| Citation integrity | partial | Sources ride ahead of the body (correct design), but only 3 of 20 stream routes emit them, the header silently truncates at 4 KB (F-8), and one placeholder promises sources that never arrive (F-9) |
| Credit | partial | Reserve-before / settle-actual / release-on-fail is correct and measured on the ledger; but no idempotency anywhere (F-5) and the multi-step chat cancel settles rather than releases (F-2) |
| Frontend failure states | partial | 9/9 states exist, are distinct, and are tested; adopted by 26 of ~37 surfaces (F-12) |

### PRD-C152 — "Stream text/tool progress to the client rather than buffering a complete answer; target application overhead before provider dispatch at p95 ≤ 250 ms and first visible streamed state within 100 ms"

**Status: partially-met.**

*Streaming vs buffering.* 20 streaming endpoints exist and the transport is correct:
`respondWithAiTextStream` (`ai-text-stream-route.ts:50`) awaits the pipe (so a mid-stream
rejection is not an unhandled rejection), passes `HttpException` through unflattened
(`ai-stream-response.ts:49`), and puts citations in the headers rather than a trailer
(`ai-text-stream-route.ts:17-22`). `ai-stream-surface.integration.spec.ts:135` proves over a real
socket that the first byte arrives before half the answer exists. Against that: **112 of the 124
paid invocations still buffer**, including user-facing long-form text on `executive-brief`,
`kb-ask`, `payroll-ai-explain`, `timesheets-ai` (5 call sites), `ticket-insights-ai`,
`ticket-triage-ai`, `crm-brief`, `crm-content` and `crm-meeting-brief`. Many of the 70 structured
calls legitimately cannot stream; the 36 free-text ones can, and 24 of them do not.

*Application overhead before dispatch — MEASURED, and the measurement does not cover the real
routes.*

```
ai.stream.dispatch.overhead n=50 p50=0.053ms p95=0.079ms io_allowance=22ms budget=50ms
ai.stream.first-byte.app   n=30 p50=0.637ms p95=2.087ms budget=150ms threshold=112ms
```

Both budgets are declared in `telemetry/ai-stream-budgets.ts:21-36` at 50 ms and 150 ms —
*stricter* than the PRD's 250 ms / 100 ms, so passing them satisfies the PRD arithmetically. But:

- `ai-stream-dispatch-overhead.spec.ts:77` constructs `new AiGatewayStreamHelper(...)` directly.
  It measures breaker + redaction + concurrency + reservation + model resolution and nothing else.
  It is honest about the two stubbed I/O legs and adds 22 ms back from the seam budgets.
  It does **not** measure any real route's pre-dispatch work.
- `ai-stream-surface.integration.spec.ts:137` uses a synthetic `StreamProbeController` with no
  guard, no auth, no retrieval and no database. The 2.087 ms p95 is the Nest + route-shell cost,
  not `crm.account-summary`'s.
- The two routes whose pre-dispatch work is actually large are unmeasured: **chat** issues nine
  parallel per-tenant aggregate reads plus a history INSERT before `streamText`
  (`chat-assistant-context.ts:38-133` — two `count(*)` over `projects`/`tickets`, two counts over
  `lead_party_map ⋈ business_parties`, one over `deals`, plus attendance/leave/payroll/top-leads);
  **KB RAG** does an embedding provider round-trip plus a pgvector search
  (`kb-rag.service.ts:126,133`) before dispatch. On a large tenant either can exceed 250 ms and
  nothing would notice.

**NOT MEASURED:** p95 application overhead on a real authenticated route with a realistic tenant.
What would measure it: extend the existing `route-budgets-http` harness with a `POST /chat` and a
`POST /ai/account-summary` case against a seeded multi-tenant corpus, timing handler entry →
`AiCallMetrics.providerOpened()`, and assert the `ai.stream.dispatch.overhead` budget on that
timing rather than on a constructed helper.

**NOT MEASURED:** "first visible streamed state within 100 ms" as the *user* experiences it —
that is browser paint, not server first byte. The frontend has no first-token instrumentation.
What would measure it: a Playwright trace on `/ai` or a `KbDocAskSheet` action, marking the
performance timeline from submit to the first `onToken` render.

### PRD-C153 — "Propagate client aborts, enforce deadlines and circuit breakers, and retry only replay-safe pre-stream operations; never duplicate a paid request or continue spending after cancellation"

**Status: partially-met.** Four of the five clauses hold; two real defects.

*Abort propagation — met and genuinely measured.* Three independent proofs, all green:

- `ai-cancellation-stops-the-spend.spec.ts` drives the real route helper, the real
  `AiGatewayStreamHelper` and the real `streamText` over a real socket with only the provider
  adapter and ledger doubled. It asserts on **provider deltas produced** and on the **ledger**,
  not on rendered text (lines 121-128 explain why). Three cancellation shapes are covered —
  client `AbortController`, unmount, and a raw socket `destroy()` with no client-side abort at
  all — plus an anti-vacuity case at line 259.
- `ai-ambient-abort-covers-metered-routes.spec.ts` proves the *buffered* metered controllers
  outside the AI module still get a signal, via `getAmbientAiAbortSignal()` reading the tenant
  context (`ai-request-abort.ts:38`), with its own anti-vacuity case at line 225.
- `stream-abort.ts:26-34` gets the hard part right: it watches `res.close`, not `req.close`,
  because Express has already drained the body by the time the handler runs.

*Deadlines — met.* Ladder verified: 30/60 s provider → 60 s stream route → 120 s chat and
buffered interceptor → 180 s client backstop (`ai-text-stream.ts:24-33` documents exactly why the
client sits above, not below, the longest server deadline — a defect this seam already shipped).

*Circuit breaker — met, with a cross-tenant caveat (F-6).* `ai-stream-breaker.ts:23-28` correctly
re-arms with `>=` rather than `===`, degrades to a local counter when Redis is down, and does not
count aborts as failures (`ai-gateway-stream.helper.ts:150`).

*Retry only replay-safe pre-stream operations — met.* `llm.service.ts:164-200` calls
`signal?.throwIfAborted()` before every attempt and rethrows on `signal?.aborted`; `classifyLlmError`
sends 4xx to `fatal` so a content-policy or auth failure is never retried
(`llm-retry.ts:76-95`). The AI SDK's own `maxRetries` wraps `doStream`, which returns at headers,
so a mid-body fault is not replayed. A `ZodError` on structured output releases and returns
`invalid_output` without a second paid call (`ai-gateway-credit.helper.ts:249-275`).

*Never continue spending after cancellation — **breaks on the chat surface** (F-2).* Both
`chat-assistant.service.ts:278` and `ai-gateway-stream.helper.ts:194` detect cancellation by
`Promise.resolve(stream.finishReason).catch(...)`. I probed `ai@7.0.51` directly:

```
SINGLE-STEP (gateway/kb shape, no tools):  finishReason=REJECTED(AbortError) onFinish=false onAbort=true
MULTI-STEP  (chat shape, tools+stepCountIs): finishReason=RESOLVED("other")  onFinish=true  onAbort=true text="" usage={}
```

`ChatAssistantService` is the only `streamText` call in the codebase with `tools` and
`stopWhen: stepCountIs(10)` (lines 211, 272), so it is the only one on the resolving branch — and
it is the surface most likely to be stopped mid-answer. The `onAbort` callback the SDK provides
is used nowhere in the repo (0 hits).

*Never duplicate a paid request — **not met** (F-5).* Zero `@Idempotent` decorators in
`src/modules/ai`. Only 7 of 124 invocations pass `dedupe: true`. `AiCreditReserveInput` carries an
optional `idempotencyKey` (`credit-ledger.interface.ts:6`) that **none** of the five
`ledger.reserve` call sites supplies. Mitigations that do exist: TanStack `mutations: { retry: 0 }`
(`query-provider.tsx:53`) and the single-flight guards in `useAiTextStream` /
`useAiInlineAction` / `useAiPopoverAction`. Those cover the AI-component surfaces; they do not
cover a proxy retry, a mobile client, or an API-token caller.

### PRD-C154 — "Validate structured outputs, preserve citation/source integrity and show a safe partial/error state when the model, retrieval, tool or stream fails"

**Status: partially-met.**

*Validate structured outputs — met on the backend, absent on the frontend.* Double validation:
provider-side JSON-schema-strict plus a Zod `parse` at `llm.service.ts:239,257,331,357`. Failure is
a distinct, non-retried, refunded outcome. The frontend defines the mirror schemas in
`lib/ai/schemas.ts` but imports them **`import type`** (`hooks/api/ai.ts:7`) and never calls
`.parse()` — every AI response is a type assertion on the client. Defensible (the backend is
authoritative and the envelope gate covers shape) but it means a contract drift shows up as
`undefined` in a render, not as a caught error.

*Citation/source integrity — partial.* The design is right: sources go out **with the headers**,
before the body, precisely so a stream the user stops halfway keeps them
(`ai-text-stream-route.ts:17-22`), and the client forwards them through `onHeaders` rather than
only on the completed outcome (`ai-text-stream.ts:45-52`). Three gaps:
(a) only 3 of 20 stream routes set a sources header; (b) `encodeStreamSourcesHeader` silently
drops sources from the tail at 4,096 bytes and returns `null` — no header at all — if even one
source does not fit (F-8); (c) the streamed KB doc actions render a "Loading sources" placeholder
that never resolves, because `streamAction` returns `{ text }` with no citations (F-9).

*Safe partial/error state on failure — **not met at the transport level** (F-3).* This is the
sharpest C154 gap. When a stream faults after the headers are on the wire, `pipeAiTextStream`
logs and calls `res.end()` (`ai-stream-response.ts:33-41`). The client's read loop sees a normal
`done` and returns `{ status: "completed", text: <partial> }`
(`ai-text-stream.ts:118-134`). The comment at `ai-text-stream.ts:18-21` states this openly. So a
provider that dies after three tokens renders as a **complete three-token answer** — no error
state, no retry affordance, no indication anything went wrong. That is precisely the
"error surfaced to the UI as an empty state" shape, one layer up: an error surfaced as a
*successful* state. Failures *before* the first byte are handled correctly (real status codes,
402 stays 402, 503 stays 503).

### PRD-C155 — "Verify AI frontend states for credit exhaustion, queueing, streaming, cancellation, retry, partial output, citation loading, provider failure and permission revocation without duplicate requests"

**Status: partially-met — verified correct where adopted, adopted by 26 of ~37 surfaces.**

All nine states exist, are distinct, and are tested rather than asserted:
`components/ai/ai-nine-states.test.tsx` walks all nine through `AiActionResultBody` **and**
`AiInlinePreview`, checks each renders its own copy, checks retry is offered only where
re-dispatch can help (quota/denied/streaming/retrying get no retry button), and — the part that
makes it non-vacuous — asserts at line 103 that the eight non-overlapping states produce **eight
distinct rendered strings**, not one grey sentence repeated. `ai-error-state.ts:52-83` maps
status/code to state honestly, including the 503 ambiguity between the concurrency cap and the
breaker, with the reason for the string match written down at lines 21-26.

"Without duplicate requests" is real and tested: `useAiTextStream` returns `busy` rather than
opening a second paid stream (`ai-text-stream.ts:169`), aborts on unmount (line 197),
`useAiInlineAction` guards with `inFlightRef` (line 83) and bumps a sequence stamp so a discarded
run's tokens are dropped (line 96), and `ai-single-flight.test.tsx` + `ai-abort-reaches-request.test.tsx`
cover both. The signal-threading trap (`init.signal` being overwritten by `authedFetch`) is
documented at `ai-text-stream.ts:81-86` and guarded by `ai-mutation-signal.test.tsx`.
Permission revocation is not inert: `useAuthorizedMutation` re-fetches the access snapshot inside
`mutationFn` and throws `Missing permission: …`, which `classifyAiError` maps to `denied`
(`authorized-mutation.ts:48-51`).

**Reach is the gap (F-12).** Surfaces on the vocabulary: the Ask-OS chat view, the global Ask-OS,
the KB doc ask sheet, 9 Build AI cards/menus, 3 Build ticket dialogs, 2 calendar meeting panels,
the mail inbox summary sheet, 3 accounting AI panels, plus the wiki/help-centre/survey/JD actions
that route through `useAiPopoverAction` — **26**. Surfaces that render every AI failure as a bare
`toast.error(getErrorMessage(e))`: `features/hr/recruitment/ai-score-candidate-button.tsx:31`,
`features/hr/performance/ai-generate-review-button.tsx:41`,
`features/hr/employees/detail/employee-details-view.tsx:185`,
`app/(authenticated)/ai/executive-brief/page.tsx:30`, plus 7 CRM files (out of scope). On those,
credit exhaustion, a full queue, a tripped breaker and a revoked permission are four
indistinguishable grey toasts with no retry, no Stop and no upgrade path.

**NOT MEASURED:** the nine states end-to-end against a live backend. Every assertion above is a
component test with a stubbed transport, plus four real-`fetch` streaming tests
(`kb-doc-ai-streaming.test.tsx`, the two meeting panel tests, `survey-ai-streaming.test.tsx`)
that stub `global.fetch`. What would measure it: a Playwright run against a booted backend with a
zeroed AI wallet (quota), the concurrency cap forced to 0 (queued), Redis stopped and 5 forced
provider failures (breaker), and a mid-session permission revocation.

---

## 3. The measurements, verbatim

### 3.1 The P0 probe — RLS denies every chat request

`app.current_org_id()` is `STABLE`, `SECURITY INVOKER`, and **raises** when the GUC is unset:

```
DECLARE value text;
BEGIN
  value := nullif(current_setting('app.organization_id', true), '');
  IF value IS NULL THEN
    RAISE EXCEPTION 'no tenant context: app.organization_id is not set for this transaction'
      USING ERRCODE = '42501';
  END IF;
  RETURN value;
END;
```

RLS status at journal head:

```
 nspname |        relname        | relrowsecurity
---------+-----------------------+----------------
 public  | ai_chat_conversations | t
 public  | ai_chat_messages      | t
 public  | organizations         | f
 build   | projects              | t     (also tickets, attendance, leave_requests,
                                          payroll_runs, payroll_run_employees,
                                          lead_party_map, business_parties, deals — all t)
```

As `streamline_app` (the non-owner role the service runs as; the owner has BYPASSRLS), with no
tenant GUC — the exact condition on a `@NoTenantTransaction()` handler:

```
$ psql streamline_app -c "select count(*) from build.projects where org_id='org_x' and deleted_at is null;"
ERROR:  no tenant context: app.organization_id is not set for this transaction
CONTEXT:  PL/pgSQL function current_org_id() line 7 at RAISE

$ psql streamline_app -c "insert into ai_chat_messages (org_id,user_id,user_membership_id,role,content)
                          values ('org_x','u',1,'user','hi');"
ERROR:  no tenant context: app.organization_id is not set for this transaction
```

Control — the same read with the GUC set succeeds:

```
BEGIN
 set_config
------------
 org_x
 count
-------
     0
COMMIT
```

### 3.2 The AI SDK abort probe

Run against the backend's own `ai@7.0.51`, reproducing both `streamText` shapes the codebase uses:

```
SINGLE-STEP (gateway/kb shape, no tools):    finishReason=REJECTED(AbortError) onFinish=false onAbort=true text=null usage=null
MULTI-STEP  (chat shape, tools+stepCountIs): finishReason=RESOLVED("other")    onFinish=true  onAbort=true text=""   usage={}
```

Root cause in the SDK (`dist/index.js:9209-9220`): `flush` rejects the result promises only when
`recordedSteps.length === 0`. Once one step has finished, an abort takes the resolve branch and
notifies `onEnd` (aliased from `onFinish` at line 8785).

### 3.3 Latency

```
ai.stream.dispatch.overhead n=50 p50=0.053ms p95=0.079ms io_allowance=22ms budget=50ms   → 22.08 ms vs PRD 250 ms
ai.stream.first-byte.app    n=30 p50=0.637ms p95=2.087ms budget=150ms threshold=112ms    →  2.09 ms vs PRD 100 ms
```

Both PASS their declared budgets. Both measure a synthetic path (§2, C152).

---

## 4. Findings

| # | Sev | File:line | Summary |
|---|---|---|---|
| F-1 | **P0** | `backend src/modules/ai/core/services/chat-assistant.service.ts:143` | `POST /chat` always 500s: `@NoTenantTransaction()` handler with unwrapped DB reads/writes |
| F-2 | **P1** | `backend src/modules/ai/core/services/chat-assistant.service.ts:222` | Cancelling a tool-using chat turn settles instead of releasing and records `ok`, never `cancelled` |
| F-3 | **P1** | `backend src/modules/ai/core/streaming/ai-stream-response.ts:33` | A mid-stream provider fault renders on the client as a *completed* answer |
| F-4 | **P1** | `backend src/modules/payroll/insights/payroll-ai-explain.controller.ts:1` | Metered provider calls held inside the request tenant transaction on 3 in-scope controllers |
| F-5 | **P1** | `backend src/modules/ai/core/gateway/ai-gateway.service.ts:320` | No idempotency on any AI route; 117 of 124 invocations have no in-flight dedupe |
| F-6 | P2 | `backend src/modules/ai/core/gateway/ai-gateway-stream.helper.ts:38` | The streaming breaker is global, not per-tenant: 5 fatal errors from one org open it for all |
| F-7 | P2 | `backend src/modules/ai/core/gateway/ai-concurrency-limiter.ts:32` | The per-org AI concurrency cap fails **open** when Redis is unavailable |
| F-8 | P2 | `backend src/modules/ai/core/streaming/ai-stream-response.ts:60` | Citation header silently truncates at 4 KB, or drops every source |
| F-9 | P2 | `frontend features/wiki/components/kb-page-ai-actions.tsx:48` | "Loading sources" placeholder shown for streams that never carry citations |
| F-10 | P2 | `frontend hooks/api/support/kb-rag.ts:50` | The only route that emits `x-kb-sources` has no production caller |
| F-11 | P2 | `backend src/modules/ai/core/services/chat-assistant-context.ts:38` | Nine unbounded per-tenant aggregates run before provider dispatch on every chat turn |
| F-12 | P2 | `frontend features/hr/recruitment/ai-score-candidate-button.tsx:31` | Four in-scope AI surfaces render every failure as one indistinguishable toast |
| F-13 | P2 | `backend src/modules/ai/core/services/chat-conversation-messages.ts:93` | `appendMessageToConversation` reads and updates a conversation by bare `id`, no org predicate |
| F-14 | P2 | `backend src/modules/ai/core/services/chat-assistant-context.ts:94` | Lead counts quoted to the user deliberately include soft-deleted rows |
| F-15 | P2 | `frontend hooks/api/ai.ts:42` | `useAIBatchScoreLeads` forwards no abort signal (CRM — **out of scope**, noted only) |

### F-1 (P0) — `POST /chat` cannot complete a request

`backend/src/modules/ai/core/services/chat-assistant.service.ts:143`, and `:153`/`:162`.

`ChatAssistantController.chatAssistant` carries `@NoTenantTransaction()`
(`chat-assistant.controller.ts:239`). `TenantContextInterceptor.intercept` short-circuits on that
metadata — `if (optedOut) return next.handle();` (`tenant-context.interceptor.ts:114`) — so no
tenant transaction is opened and no `app.organization_id` is set. `DRIZZLE` is
`createTenantAwareDb`, whose proxy falls through to the raw pool when there is no ambient context
(`tenant-db.ts:19-22`). The decorator's own contract is explicit:

> "Such a handler MUST wrap every database operation in `withIdentity`,
> `runInTenantTransaction`, or another explicit RLS context." — `no-tenant-transaction.decorator.ts:8-11`

`processChat` honours that for the ledger (`reserve` → `runInTenantTransaction(..., {orgId})`),
for the tools (`withTenantScopedTools` → `runInNewTenantTransaction`,
`tenant-scoped-tools.ts:33`) and for `onFinish` (`chat-assistant.service.ts:235`). It does **not**
honour it for the two seams that run *before* the stream:

```ts
143:  const context = await this.fetchContext(userId, orgId);   // fetchChatContext(this.db, …) — 9 SELECTs
152:  if (latest?.role === "user") {
153:    await this.history.appendToConversation(orgId, userId, membershipId, conversationId, "user", latest.content);
162:    await this.history.append(orgId, userId, membershipId, "user", latest.content);
```

The originating commit says so in its own message: `5cc54c1eb` — *"Checked before adding it
rather than after: everything the stream does **afterwards** already opens its own transaction."*
The pre-stream half was never checked.

**Failure scenario.** Any signed-in user opens Ask-OS (mounted product-wide via
`AskOsProvider` at `frontend/components/layout/dashboard-shell.tsx:205`) and sends a message.
Order of events: feature flags read `organizations` (RLS off → OK); the breaker and concurrency
limiter hit Redis (OK); `ledger.reserve` debits the org wallet and writes a `RESERVED` row (OK,
it wraps itself); then `fetchChatContext` issues
`select count(*) from build.projects where org_id = $1 and deleted_at is null` on the bare pool →
**42501 `no tenant context`**. The outer catch releases the reservation with
`chat_setup_error` and rethrows; `rethrowStreamRouteError` sees a non-`HttpException` and returns
**500 "Internal server error"**. Every chat turn, every tenant. No credits are lost (reserve then
release), but the wallet is churned and a `RELEASED` reservation row is written per attempt.

**Why no test catches it.** `chat-assistant-stream.controller.spec.ts` injects a mocked
`processChat`. `chat-assistant.service.spec.ts` mocks the db. `ai.controller.e2e-spec.ts:66`
lists `["post", "/chat"]` only in the 401-without-a-token table — the handler body is never
reached with a valid token against a real database. `check:scope-application` (150/150) and
`check:route-classification` (3,635/3,635) both pass; neither models this shape.

**Proposed fix.** Wrap both seams the way the rest of the module does. Either open one transaction
around the pre-stream work —

```ts
const { context } = await runInNewTenantTransaction(this.db, orgId, async () => {
  const context = await fetchChatContext(this.db, userId, orgId);
  if (latest?.role === "user") { /* the existing append */ }
  return { context };
});
```

— or push `runInTenantTransaction(this.db, …, { orgId })` down into `fetchChatContext` and
`ChatHistoryService.append`/`appendToConversation`, which also fixes those services for any future
`@NoTenantTransaction()` caller. Then add a gate: *every DB call reachable from a
`@NoTenantTransaction()` handler must be inside an explicit tenant context.* Nothing in the 189
`check:*` scripts asserts this today, and it is the third time this shape has shipped
(`ff0553bc0`, `5cc54c1eb`, now).

### F-2 (P1) — Cancelling a tool-using chat turn settles instead of releasing

`backend/src/modules/ai/core/services/chat-assistant.service.ts:222-282`.

Cancellation is detected at line 278 by `void Promise.resolve(stream.finishReason).catch(...)`.
Measured (§3.2): with `tools` + `stopWhen: stepCountIs(10)` — the chat configuration and the only
one in the repo — an abort after at least one completed step **resolves** `finishReason` and
**calls** `onFinish`. The SDK's `onAbort` callback is used nowhere (0 hits repo-wide).

**Failure scenario.** A user asks Ask-OS "what tickets are assigned to me this sprint?". Step 1
is a tool call (the chat wires eight tool sets, so this is the common path, not the edge). The
model begins step 2's prose; the user presses Stop. `onFinish` fires with `text: ""` and
`usage: {}`. Line 223 sets `resolved = true` — which permanently disarms `releaseReservation` —
then line 229 records `call.finish("ok", { promptTokens: 0, completionTokens: 0 })` and line 236
calls `settleStream(..., 0, 0)`. Consequences: (a) the `ai_credit_reservations` row moves to
`SETTLED` with `actualMilli = 0` instead of `RELEASED` with reason `cancelled`, so the documented
failure contract is not followed; (b) `ai_usage_logs` records the turn as `outcome: "ok"` with
zero tokens — the `cancelled` outcome is never emitted for the surface most likely to be
cancelled, which contradicts the already-checked PRD line "Emit tenant-safe metrics for …
cancellation"; (c) `breaker.recordSuccess()` at line 228 credits a cancelled turn as provider
health; (d) the tokens the provider genuinely produced before the abort are billed at zero, so
real spend goes unmetered. `ai-cancellation-stops-the-spend.spec.ts` cannot see any of this — it
exercises `AiGatewayStreamHelper`, which has no tools and is on the rejecting branch.

**Proposed fix.** Stop inferring cancellation from `finishReason` and use the callback the SDK
provides. Add to both `chat-assistant.service.ts` and `ai-gateway-stream.helper.ts`:

```ts
onAbort: () => {
  releaseConcurrency();
  releaseReservation("stream_aborted_no_settle");
  call.finish("cancelled");
},
```

and guard `onFinish` with `if (resolved || signal?.aborted === true) return;` so the resolving
branch cannot settle a cancelled turn. Keep the `finishReason.catch` as the belt for a genuine
provider fault. Then extend `ai-cancellation-stops-the-spend.spec.ts` with a tool-using
`streamText` case — the existing single-step case passes either way, which is why the defect is
invisible.

### F-3 (P1) — A mid-stream fault renders as a completed answer

`backend/src/modules/ai/core/streaming/ai-stream-response.ts:33-41`;
`frontend/hooks/api/ai-text-stream.ts:118-134`.

Once headers are on the wire there is no status code left to send, so `pipeAiTextStream` logs the
fault and calls `res.end()`. The client's loop sees `done` and returns
`{ status: "completed", text: received }`.

**Failure scenario.** A user runs "Improve writing" on a wiki page. The provider streams 40 tokens
and then 503s. The user sees a truncated paragraph presented as the finished draft, with an Apply
button and no error, no retry and no indication of truncation — and clicking Apply pastes the
half-sentence into the page. Nothing in the nine-state vocabulary can fire, because the transport
reported success. This is the "error surfaced as an empty state" shape one level up: an error
surfaced as a *successful* state.

**Proposed fix.** Give the wire a fault terminator. In `pipeAiTextStream`'s catch, before
`res.end()`, write a sentinel that cannot occur in model text
(`res.write(" AI_STREAM_FAULT")`); in `streamAiText`, strip a trailing sentinel and return a
new `{ status: "faulted", text }` outcome. Add `faulted` to `AiActionResultState` rendering as a
partial-output card plus an "answer was cut short — retry" notice (the `AiCancelledOutput`
component is already the right shape). The alternative, switching these routes to the SDK's
UI-message stream protocol, gives a first-class `error` part but changes the wire format for all
20 endpoints and both client tests.

### F-4 (P1) — Provider calls held inside the request tenant transaction

`backend/src/modules/payroll/insights/payroll-ai-explain.controller.ts`,
`backend/src/modules/chat/chat-summarize.controller.ts`,
`backend/src/modules/support/core/support-ai.controller.ts`
(and `src/modules/inventory/ai/inv-ai-explain.controller.ts` — inventory, out of scope).

All twelve AI-module controllers and both KB AI controllers carry class-level
`@NoTenantTransaction()`. These do not: measured `grep -c '@NoTenantTransaction()'` = **0** on
each. So the handler runs inside `withTenant`'s transaction and the metered provider call — 30 s
`FAST_TIMEOUT_MS` or 60 s `STANDARD_TIMEOUT_MS`, up to `maxRetriesPerModel + 1` attempts per model
across the tier chain — happens while a pooled connection sits idle in transaction.

**Failure scenario.** `DB_POOL_MAX` defaults to **10** on a direct Neon endpoint and **20**
otherwise (`pool.config.ts:177`), while `AI_CONCURRENCY_CAP` is **20** per organisation
(`ai-concurrency-limiter.ts:5`). One tenant issuing 10–20 concurrent `POST /payroll/…/ai-explain`
holds every connection in the process idle-in-transaction for the provider's latency — the AI cap
is numerically incapable of protecting the pool. Every other tenant served by that instance
queues on `db.pool.wait` and then times out. `idle_in_transaction_session_timeout` is 60 s
(`pool.config.ts:122`), so a slow `standard`-tier call with one retry also risks having its own
transaction killed mid-flight, after the tokens were paid for.

**Proposed fix.** Add `@NoTenantTransaction()` to those three controllers and wrap each service's
DB reads in `runInTenantTransaction(this.db, …, { orgId })` — the exact pattern
`kb-article-ai.service.ts:102` and `timesheets-ai.service.ts:61` already use, and which
`payroll-ai-explain.service.ts` is one line away from. Then extend `check:route-classification`
(or add a small gate) to assert: any handler transitively reaching `AiGatewayService` must either
declare `@NoTenantTransaction()` or prove the provider call is outside the transaction.

### F-5 (P1) — No idempotency on any paid AI route

`backend/src/modules/ai/core/gateway/ai-gateway.service.ts:320,400`;
`backend/src/modules/ai/core/gateway/credit-ledger.interface.ts:6`.

Measured: `@Idempotent` count in `src/modules/ai` = **0**; `dedupe: true` = **7** call sites;
`ledger.reserve` call sites passing an `idempotencyKey` = **0 of 5** (the field exists and
`AiCreditsReservationService.reserve:40-42,84-92` fully implements the lookup and the 23505
recovery — it is simply never supplied by the gateway).

**Failure scenario.** A load balancer or mobile client retries `POST /ai/generate-review` after a
504 that the backend actually completed. The second request reserves again, calls the provider
again, settles again: the org is billed twice for one review, and `ai_usage_logs` shows two
`ok` turns. Nothing in the request carries a key that would let either layer recognise the
replay. The frontend's `mutations: { retry: 0 }` and the single-flight guards prevent the
*browser* from doing this; they say nothing about anything else that speaks HTTP.

**Proposed fix.** Two independent layers, both cheap. (1) Thread the caller's
`Idempotency-Key` header into `AiInvokeBaseOpts` and pass it to `ledger.reserve` — the reservation
table's unique index then makes a replay reuse the first reservation instead of debiting again.
(2) Default `dedupe: true` on the metered non-streaming entry points rather than opting in seven
times; `buildDedupeKey` (`ai-gateway.service.ts:400`) already hashes org + user + feature +
prompt, so it is tenant-safe as written. Streaming routes cannot use `@Idempotent` (the response
is not replayable), so for those the reservation key is the only available guard.

### F-6 (P2) — The streaming breaker is global, not per-tenant

`backend/src/modules/ai/core/gateway/ai-gateway-stream.helper.ts:38,149-157`;
`backend/src/modules/ai/core/streaming/ai-stream-breaker.ts:44-45`.

`DEFAULT_BREAKER_KEY = "stream"` and the Redis keys are `ai:cb:<key>:failures` — one counter for
every organisation on every pod. `onError` calls `recordFailure()` for any non-abort error,
including a `fatal` content-policy or context-length rejection.

**Failure scenario.** One tenant sends five prompts the provider rejects on content policy — an
easy thing to do accidentally, and a trivial thing to do deliberately. `AI_STREAM_BREAKER_FAILURE_THRESHOLD`
is 5, so `ai:cb:stream:opened_at` is set and **every organisation's** streaming AI returns 503
"AI assistant is temporarily unavailable" for 30 s. Only a success resets it, and a tenant that
keeps sending rejected prompts keeps it open.

**Proposed fix.** Do not count `classifyLlmError(error) === "fatal"` as a breaker failure — a 4xx
is a verdict on the prompt, not on the provider (`llm-retry.ts:76-79` already draws this line for
retries; the breaker should use the same predicate). Optionally key the breaker per tenant for
fatal-adjacent classes while keeping it global for transport failures, which are genuinely shared.

### F-7 (P2) — The concurrency cap fails open when Redis is unavailable

`backend/src/modules/ai/core/gateway/ai-concurrency-limiter.ts:32-37` —
`catch { logger.warn("… failing open"); return true; }`.

**Failure scenario.** Redis has an outage. `acquire` returns `true` unconditionally, so the
per-organisation cap of 20 concurrent paid AI calls disappears across every pod simultaneously,
and the breaker falls back to per-process counters at the same moment. A retry storm or a bulk
action can then issue unbounded concurrent provider calls with no ceiling except the wallet. This
is deliberate and tested (the spec emits the warning), so it is a posture decision rather than a
bug — but it is the one condition under which the "bound … concurrency and per-tenant rate" PRD
line does not hold, and it is not recorded anywhere as an accepted risk.

**Proposed fix.** Keep the local `localCounts` fallback path when Redis throws instead of
returning `true`: an approximate per-process cap is strictly better than none, and the same map
is already implemented three lines below for the no-Redis case.

### F-8 (P2) — Citation header truncation is silent

`backend/src/modules/ai/core/streaming/ai-stream-response.ts:60-76`.

`MAX_SOURCE_HEADER_BYTES = 4_096`. The loop drops sources from the tail until the URL-encoded JSON
fits, and returns `null` — meaning `sourceHeaders` omits the header entirely
(`ai-text-stream-route.ts:34-36`) — if not even one source fits.

**Failure scenario.** KB retrieval returns `DEFAULT_TOP_K = 6` sources
(`kb-rag-retrieval.service.ts:20`). `KbAnswerSource` carries a user-authored `title` and `slug`;
`encodeURIComponent` roughly triples JSON punctuation. Six sources with long article titles cross
4 KB, the last one or two are dropped, and the answer cites "[6]" in prose that has only four
chips beside it. With one pathologically long title, `null` is returned and the answer renders
completely ungrounded, indistinguishable from a model that cited nothing.

**Proposed fix.** Project the sources to the fields the chips actually render, truncate `title` to
a fixed length before encoding, and — when anything was dropped — emit a companion
`x-kb-sources-truncated: <n>` header so the client can say "and 2 more sources" instead of
silently showing fewer. At minimum, `logger.warn` on the drop; today it is invisible on both sides.

### F-9 (P2) — A citation placeholder that never resolves

`frontend/features/wiki/components/kb-page-ai-actions.tsx:48`;
`frontend/features/help-centre/components/kb-article-ai-actions.tsx:41`;
placeholder at `frontend/components/ai/ai-citation-chips.tsx:105`.

`AiActionResultBody` renders an `aria-label="Loading sources"` skeleton for every `streaming`
state and hides it on `ready` — asserted by `ai-nine-states.test.tsx:106-118`. But the KB doc
actions' `run` returns `{ text: outcome.text }` with no `citations`, and the four
`/kb/{pages,articles}/:id/ai/*/stream` routes set no `sourcesHeader` (only 3 of 20 stream routes
do). So the placeholder is shown on every KB AI action and always resolves to nothing.

**Failure scenario.** A user summarises a wiki page, watches a "Loading sources" shimmer for the
whole stream, and gets an answer with no sources — reading as "the sources failed to load"
rather than "this action is single-document and needs none". Screen-reader users hear a loading
announcement for content that never arrives.

**Proposed fix.** Gate the placeholder on the action declaring that it produces citations — add
`expectsCitations?: boolean` to `AiAction` / `AiActionResultBody` and render the skeleton only
when true. The two meeting panels and the KB ask sheet set it; the four doc actions do not.

### F-10 (P2) — The streaming public-KB route has no caller

`frontend/hooks/api/support/kb-rag.ts:50` calls the **buffered** `/public/kb/ask`. The only
reference to `/public/kb/stream-ask` in the frontend is `hooks/api/ai-text-stream.test.tsx:226`.
So `KbRagController.streamAsk`, `KbRagService.streamAnswer` and the entire `x-kb-sources` header
path are exercised by tests only. Concretely: the public help-centre widget — an
unauthenticated surface that spends the org's credits — buffers the whole answer, which is the
behaviour C152 exists to remove, and the streaming replacement that was built for it is not wired
up. Citations are still correct there (they come back in the JSON body and
`components/support/kb-ask-panel.tsx:151` renders them), so this is a C152 reach gap, not a
correctness one.

**Proposed fix.** Point `usePublicAskSupportKb` at `streamAiText({ path: "/public/kb/stream-ask" })`
with `onHeaders` decoding `x-kb-sources`, or delete the streaming route and its header machinery.
Either is fine; carrying both is what makes the audit trail claim streaming coverage the product
does not have.

### F-11 (P2) — Nine unbounded aggregates before provider dispatch

`backend/src/modules/ai/core/services/chat-assistant-context.ts:38-133`.

Every chat turn runs, in parallel: `count(*)` over `build.projects`, `count(*)` over
`build.tickets`, two `count()` over `lead_party_map ⋈ business_parties`, one `count()` over
`deals`, plus attendance / leave / payroll / top-5-leads. All are whole-tenant aggregates with no
time bound. On a large tenant these dominate the pre-dispatch window that C152 caps at 250 ms, and
the passing `ai.stream.dispatch.overhead` measurement does not include a single one of them
(§2, C152).

**NOT MEASURED:** the actual cost. `scratch_head_1010` is schema-only, so an `EXPLAIN (ANALYZE,
BUFFERS)` there would plan against empty tables and prove nothing. What would measure it: run the
five aggregates as `streamline_app` with the tenant GUC against a seeded corpus of realistic skew,
reporting rows, buffers and plan time together — per the project's own note that buffers alone
mismeasure.

**Proposed fix.** Cache the org-level counts (`projectCount`, `ticketCount`, `hotLeadsCount`) in
the versioned org namespace with a short TTL — they are ambient context for a prompt, not a
figure the user is reading off a dashboard — and keep only the four per-user reads on the hot
path.

### F-12 (P2) — Four in-scope AI surfaces bypass the nine-state vocabulary

`frontend/features/hr/recruitment/ai-score-candidate-button.tsx:31`,
`frontend/features/hr/performance/ai-generate-review-button.tsx:41`,
`frontend/features/hr/employees/detail/employee-details-view.tsx:185`,
`frontend/app/(authenticated)/ai/executive-brief/page.tsx:30`.

Each is `onError: (e) => toast.error(getErrorMessage(e))`.

**Failure scenario.** An HR manager's org runs out of AI credits. Pressing "Score candidate"
raises a 402 that the backend renders as a rich `INSUFFICIENT_CREDITS` payload with
`requiredCredits`/`availableCredits` — and the UI shows one grey toast with the raw message, no
`AiQuotaEmptyState`, no upgrade path, no retry. The 429 (queue full), the 503 (breaker) and the
403 (permission revoked) produce four toasts the user cannot tell apart, and none offers the
retry that three of the four warrant. `classifyAiError` already produces exactly the right state
for all four codes; these call sites just never ask it.

**Proposed fix.** Replace `onError: toast.error(...)` with `setState(classifyAiError(e))` and
render `<AiFailureBody state={state} onRetry={…} />` — the same three-line change the accounting
panels (`features/accounting/ai/*.tsx`) already made. The seven CRM surfaces need the same change
but are out of scope for this release.

### F-13 (P2) — Conversation append trusts RLS alone for tenancy

`backend/src/modules/ai/core/services/chat-conversation-messages.ts:90-108`.

`listConversationMessages` (line 30) correctly requires `orgId` **and** `userMembershipId` before
returning anything. `appendMessageToConversation` does not: it inserts with the caller's `orgId`
but the caller's `conversationId`, then `select`s and `update`s `ai_chat_conversations`
`where eq(aiChatConversations.id, conversationId)` — **no org predicate on either statement**.
`conversationId` arrives straight from the request body (`request.schemas.ts:156` validates only
`z.number().int().positive()`), and neither the controller nor `processChat` asserts ownership.
The KB sibling does resolve the row first — `kb-ask.controller.ts:84` says so explicitly — so this
is an inconsistency, not an unknown pattern.

**Failure scenario.** Today RLS blocks it: `ai_chat_conversations` has `tenant_isolation` on ALL
with `org_id = app.current_org_id()`, so a cross-org `UPDATE` matches zero rows. But this code
runs on the `@NoTenantTransaction()` path where there is no GUC at all, so the *only* thing
standing between a forged `conversationId` and another org's conversation title is that the
statement errors out (F-1). Fix F-1 by wrapping the append in `runInNewTenantTransaction` and the
statement starts succeeding — at which point the missing predicate is load-bearing and the
protection is a single `FORCE ROW LEVEL SECURITY` setting away from being wrong. Fix F-1 and F-13
together, not separately.

**Proposed fix.** Resolve the conversation with `and(eq(id, conversationId), eq(orgId, orgId),
eq(userMembershipId, membershipId))` and throw `NotFoundException` before the insert — the same
four lines `listConversationMessages:33-42` already has.

### F-14 (P2) — Soft-deleted leads counted in the assistant's context

`backend/src/modules/ai/core/services/chat-assistant-context.ts:94,103,126` — all three
`lead_party_map` reads pass `INCLUDE_DELETED`, and the file's header comment (lines 22-29) records
this as a deliberate deferral rather than an oversight: *"none of them filtered `deleted_at`
before, and a count that silently drops by a few the day this lands is a migration reporting
itself as a data change. Recorded as a finding rather than fixed in passing."* Reported here so it
is not lost; the assistant quotes "you have N leads" including deleted ones, while every lead list
in the product excludes them. Out of ticket 17's scope to fix, in scope to record.

---

## 5. What head already gets right

Not filler — each of these is a specific trap this codebase has fallen into before, and the code
demonstrably avoids it now.

1. **The disconnect signal watches the response, not the request.** `stream-abort.ts:26-34`
   documents why: Express drains the body before the handler runs, so a `req.close` listener
   attached early fires on every healthy request and one attached late never fires at all. Using
   `res.close` before `writableEnded` is the only arm that detects a real hang-up.
2. **The pipe promise is awaited.** `ai-stream-response.ts:20-23` — dropping it makes a mid-stream
   fault an unhandled rejection and leaves the client with a truncated 200.
3. **`HttpException` is not flattened.** `rethrowStreamRouteError` (`:49-58`) passes the ledger's
   402 and the breaker's 503 through, so the client can tell "top up" from "back off" from
   "we broke". `classifyAiError` on the other side depends on exactly that.
4. **Citations go out with the headers.** Not as a trailer a fetch reader cannot see, and
   delivered through `onHeaders` rather than only on the completed outcome, so a stream stopped
   halfway keeps its sources (`ai-text-stream.ts:45-52`).
5. **The client backstop sits above every server deadline, not below it.** `ai-text-stream.ts:24-33`
   records that the previous 30 s cap was aborting paid streams the server was still producing and
   reporting them as user cancellations.
6. **The abort signal is threaded through `authedFetch`'s fourth argument, not `init`.**
   `ai-text-stream.ts:81-86` names the exact defect this seam already shipped once, and
   `ai-mutation-signal.test.tsx` guards it.
7. **Ambient abort reaches metered controllers outside the AI module.** `getAmbientAiAbortSignal`
   (`ai-request-abort.ts:38`) falls back to the tenant context's disconnect signal, closing the
   nineteen controllers that never adopted `AiRequestAbortInterceptor`; proved end-to-end over a
   real socket with an anti-vacuity case.
8. **Cancellation is asserted on the ledger and on provider deltas, never on rendered text.**
   `ai-cancellation-stops-the-spend.spec.ts:121-128` states why: a stream whose reader has gone
   away renders nothing while the provider bills for every token.
9. **Every cancellation spec has an anti-vacuity twin.** Four of them, at
   `ai-cancellation-stops-the-spend.spec.ts:259`, `ai-stream-surface.integration.spec.ts:184`,
   `ai-ambient-abort-covers-metered-routes.spec.ts:225`, `ai-stream-dispatch-overhead.spec.ts:105`.
10. **The breaker re-arms.** `ai-stream-breaker.ts:23-28` uses `>=` not `===`, with the reason
    written down: equality opens once and then never again.
11. **A hang-up is not a provider failure.** `ai-gateway-stream.helper.ts:150` and
    `ai-gateway-runner-call.ts:32-39` — counting closed tabs as provider faults is how a breaker
    trips on a busy afternoon.
12. **The response cache refuses to build an ACL-blind key.** `ai-response-cache.service.ts:50-53`
    throws rather than serve restricted content to the next reader, and the key is
    `cachedVersionedForOrg(orgId, …)` so it is tenant-scoped by construction.
13. **The dedupe key is tenant-safe.** `ai-gateway.service.ts:400` hashes org + user + feature +
    prompt — no cross-tenant collision is possible.
14. **Settlement is on measured tokens, never the reserve ceiling.** `ai-gateway-runner-call.ts:151-155`;
    `computeTokenCharge` works in integer milli-credits throughout, no floats in the money path.
15. **Structured output is validated twice.** Provider-side strict JSON schema plus a Zod `parse`;
    a `ZodError` releases the reservation and returns `invalid_output` without a second paid call.
16. **Retries stop at the signal and never replay a fatal.** `llm.service.ts:172,185`;
    `classifyLlmError` sends 4xx to `fatal` (`llm-retry.ts:76-95`), and `Retry-After` beats the
    computed backoff, with jitter so a provider-wide 429 does not resynchronise every caller.
17. **The nine frontend states are distinct, not one grey sentence.** Asserted as a set cardinality
    of 8 at `ai-nine-states.test.tsx:103`, and retry is offered only where re-dispatch can help.
18. **Single-flight is real and the sequence stamp is right.** `useAiInlineAction:96` drops a
    discarded run's tokens instead of letting a stale stream write into a fresh session.
19. **The client permission gate is not inert.** `useAuthorizedMutation:48` re-fetches the access
    snapshot inside `mutationFn` and throws, rather than trusting a possibly-stale `useCan`.
20. **Mutations do not auto-retry.** `query-provider.tsx:53` — `retry: 0` on mutations is the one
    line that keeps a transient 500 from becoming a double charge on every AI surface.

---

## 6. Blocked on infrastructure

| What | Blocker | What would unblock it |
|---|---|---|
| p95 application overhead on real routes (`POST /chat`, `/ai/account-summary`) | Needs a booted backend, a seeded multi-tenant corpus and a working chat route (F-1 must be fixed first — the route 500s before dispatch) | The existing `check:route-budgets-http` harness plus a seeded local Postgres; time handler entry → `providerOpened()` |
| "First visible streamed state within 100 ms" as the user sees it | No browser instrumentation on any AI surface; the frontend web-vitals capture does not cover AI routes | A Playwright trace marking submit → first `onToken` paint on `/ai` and one `KbDocAskSheet` action |
| The nine frontend states end-to-end | Needs a live backend with a zeroed AI wallet, a forced concurrency cap, a tripped breaker and a mid-session permission revocation — plus a provider key | Playwright against a booted stack with fault injection at `AiGatewayService` |
| Realistic-corpus plans for the nine chat-context aggregates (F-11) | `scratch_head_1010` and `scratch_cold_1010` are schema-only; planning against empty tables proves nothing | A seeded local Postgres with realistic tenant skew, run as `streamline_app` with the GUC, reporting rows + buffers + plan time |
| Whether the deployed role is genuinely non-BYPASSRLS in production | Only the local scratch roles are observable here | Confirm the production connection role's `rolbypassrls`. If it *is* BYPASSRLS, F-1 downgrades from "always 500s" to "runs with no tenant boundary at all", which is worse, not better |
| Provider-side behaviour under real 429/503 (breaker + retry interaction) | No provider key; every spec doubles the adapter | A staging key plus a fault-injecting proxy |

**Not blocked, and worth saying so:** F-1, F-2, F-3, F-4, F-5, F-13 were all established from code
plus local measurement, need no provider and no seeded corpus, and are fixable in this repo today.

---

## 7. Recommended sequence for the fix wave

1. **F-1** first and alone — nothing else about chat can be measured until `POST /chat` returns a
   200. Land F-13 in the same change (fixing F-1 is what makes F-13 reachable).
2. **F-2** next, with the tool-using cancellation spec that would have caught it.
3. **F-4** and **F-5** — both are mechanical and both are pure loss today.
4. **F-3** — needs a wire-format decision (sentinel vs. UI-message protocol); pick the sentinel
   unless someone wants the protocol change.
5. **F-6, F-7, F-8, F-9, F-10, F-12** — small, independent, no ordering constraint.
6. **New gate**, worth more than any single fix above: *every database call reachable from a
   `@NoTenantTransaction()` handler must be inside an explicit tenant context.* This shape has now
   shipped three times (`ff0553bc0`, `5cc54c1eb`, head), 32 files carry the decorator, and
   `check:scope-application` (150/150) and `check:route-classification` (3,635/3,635) both pass
   straight over it.
