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

---

# Session S5 (2026-09-02) — the last open box: which surfaces owe streaming, and the two numbers

## What the box asked, and what it got

> *Non-chat AI surfaces stream rather than buffering; first visible streamed state lands within the target and
> application overhead before provider dispatch stays inside its budget.*

**Still PARTIAL.** Six more surfaces stream, the excluded set is now excluded *with a stated reason* rather than
merely uncounted, and both numbers are measured against targets that did not exist in the repo before this
session. What keeps it open is not a missing mechanism: it is ~33 buffered text surfaces, 26 of them in other
agents' modules, and a frontend that still has exactly one stream client.

## Re-verification of the S4 finding (it had drifted)

S4 recorded "119 paid gateway call sites, 69 `invokeStructured*`, 43 the rest". Re-counted at S5 head:

| kind | count | source |
|---|---|---|
| `invokeStructured*` (incl. 2 `WithImage`) | 70 | `grep -rno '\.invokeStructured[A-Za-z]*(' src --include='*.ts'` minus specs and the gateway's own definitions |
| `invokeText*` | 43 | same shape |
| `streamTextWithUsage` | 9 (was 3) | same shape |
| `embed{Query,Batch}WithCredit` | 6 | same shape |
| **total** | **128** | corroborated by `check:ai-charge`: "128 invocations scanned" |

So S4's 119/69 was one structured call short and predates this session's six conversions. The 43 text sites is
unchanged — conversions add a streaming sibling beside the buffered route rather than replacing it, because the
buffered route is the fallback for a client that cannot stream.

## The judgement: which of the text surfaces owe streaming

One line decides it: **stream where the output is prose a client can append; do not stream where the output is
only valid when complete.**

**The 70 `invokeStructured*` sites are excluded on the second half of that line, and this is the reason.** They
return an object validated by a Zod schema. A half-parsed object is not renderable partial state — there is
nothing a user can read in `{"score": 7, "reas` — and streaming one would have to emit before validation, which
is precisely the `.strict()` boundary the release depends on (brief §9). The cost is real and the benefit is
zero. That is an exclusion, not an omission.

**17 of the 43 text sites are in `src/modules/ai/**`.** Ten now stream:

| surface | route | why it owes streaming |
|---|---|---|
| blog improve-writing / suggest-title / summarize | `POST /ai/blog/posts/:postId/*/stream` | (landed S4) |
| KB public ask | `POST /public/kb/stream-ask` | (landed earlier) |
| CRM account summary | `POST /ai/account-summary/stream` | 6-section executive brief, 1024 tokens, a human is waiting |
| CRM meeting prep | `POST /ai/meeting-prep/stream` | 7-section pre-meeting brief, 1024 tokens |
| CRM meeting follow-up | `POST /ai/crm/meeting-follow-up/stream` | drafted email a human reads and edits |
| CRM report narrator | `POST /ai/report-narrator/stream` | 2-3 paragraph narrative over a report |
| survey response summary | `POST /ai/surveys/:surveyId/summarize-responses/stream` | narrative under 600 words |
| HR job description | `POST /ai/generate-jd/stream` | plain-text JD, explicitly "no markdown", 1024 tokens |

Seven are named and left buffered, each with its reason:

- `hr-copilot-tools.ts` ×3 — LangChain tools inside the chat agent loop. The **model** consumes their output;
  no human waits on the intermediate text, and the turn that contains them already streams.
- `ticket-insights-ai.improveDescription`, `ticket-triage-ai.improveDescriptionDraft` — the output is an HTML
  fragment handed to a TipTap/ProseMirror editor. A partial fragment is unbalanced markup: same class as a
  half-parsed object.
- `crm-copilot-lead.duplicateSuggestionsForLead` — the prose is one field beside a `duplicates[]` array. The
  payload is a record; streaming it would mean streaming one field of a JSON body.
- `executive-brief.generate` — persists a snapshot with citations that `GET /ai/executive-brief` reads back.
  The route's product is the stored record; streaming would need a second post-stream persistence path, which
  is exactly the duplicate mechanism this release is removing.

**26 text sites are outside this territory** (17 modules: `timesheets` 5, `kb/help-centre` 5, `kb/wiki` 4,
`inventory/ai` 2, and 10 modules with 1 each). The three largest are all long-form prose a human waits on and
are the obvious next batch; each is now a prompt extraction plus ~10 lines of controller, because the helper
they need already exists and is proven.

## One mechanism, not two — and a gate that enforces it

Every new route is:

```ts
return respondWithAiTextStream(req, res, { feature, orgId, route }, (signal) =>
  this.svc.streamX(orgId, body, userId, signal));
```

and every new service method is `resolve…Prompt()` (shared with the buffered sibling, so a tuned prompt cannot
make the two disagree) followed by `gateway.streamTextWithUsage`. No new streaming primitive was written.

`ai-stream-route-contract.spec.ts` grew two tests so this cannot quietly stop being true:
- every `@Post("…stream…")` in an AI controller must sit in a file that uses `respondWithAiTextStream` or
  `pipeAiTextStream` (10 stream routes found);
- no AI controller may call `.pipeTextStreamToResponse(` itself — that is the seam whose dropped promise
  produced a truncated 200 in S4.

## The two numbers

`common/observability/seam-budgets.ts` has nine seams and no AI entry, **deliberately** —
`ai-metric-alert-parity.spec.ts` asserts the AI span is never bucketed into a seam budget, because averaging a
third party's latency into a database seam makes every seam alert meaningless. So the targets are declared in
the module that owns them, in the same shape and with the same 25% alert headroom:
`src/modules/ai/core/telemetry/ai-stream-budgets.ts`.

| key | budget (p95) | threshold | derivation |
|---|---|---|---|
| `ai.stream.first-byte.app` | 150 ms | 112 ms | a streamed answer is a browser-visible read, so it is held to `route.cached.read`'s bar; provider latency is excluded, not hidden inside it |
| `ai.stream.dispatch.overhead` | 50 ms | 37 ms | one `cache.roundtrip` (2 ms, breaker) + one `db.roundtrip.simple` (20 ms, reservation) + in-process work, capped at ⅓ of the first-byte budget so dispatch alone can never make the visible target unattainable — the derivation `runtime.eventloop.delay` uses |

**Method and result — first visible streamed state.** `ai-stream-surface.integration.spec.ts` boots a real Nest
app, exposes a controller that goes through `respondWithAiTextStream`, and hands it a provider stub that writes
its first chunk with no delay. The client is `fetch` + `response.body.getReader()`; the window is
`process.hrtime.bigint()` at request start to the first `read()` resolving. **n=30, p50 0.530 ms, p95
2.512 ms** against a 150 ms budget. A separate test proves the response is genuinely streamed rather than
buffered: first byte arrives at under half the time the last byte does, over a 400 ms producer.

**Method and result — application overhead before provider dispatch.**
`ai-stream-dispatch-overhead.spec.ts` drives the real `AiGatewayStreamHelper` — real breaker, real redaction of
a realistic 5 KB prompt, real concurrency limiter, real reservation ordering — with only `streamText` stubbed,
and times request start → the moment `streamText` is invoked. **n=50, p50 0.052 ms, p95 0.074 ms in-process.**
A stub makes two I/O legs free, so they are added back from their own declared seam budgets rather than
pretended away: **0.074 + 22 = 22.1 ms against a 50 ms budget.** An anti-vacuous test asserts the measured
window really brackets the gateway (the reservation is recorded before dispatch, in that order).

**NOT MEASURED: end-to-end time-to-first-token including the provider.** There is no provider credential in this
environment. Rather than guess, both numbers exclude provider latency and say so. The provider's own share is
recorded per call at runtime — `ai.ttft_ms` on the `ai.gateway.call` span, `ttftMs` on the settled
`ai_usage_logs` row — so the missing half is observable in production without another code change.

## Cancellation stops the spend — proven over a socket, with a bite

The frontend equivalent of this bug (ticket 13: a controller signal overwritten by a timeout-only signal) has a
backend twin, and a mocked controller spec cannot see either, because it never builds a socket.
`ai-stream-surface.integration.spec.ts` hangs a real client up mid-stream and asserts on what the **provider
stub** observed, not on what the test handed the route:

- `aborted: true` — the signal the producer received fired;
- `settled: false`, `released: true` — the producer stopped rather than running to completion;
- anti-vacuous control: a healthy request records `aborted: false`, `settled: true`, so the abort assertion is
  not free.

**Bite proof.** Replacing `produce(abort.signal)` with `produce(new AbortController().signal)` in
`ai-text-stream-route.ts` → **1 failed, 3 passed**, the failure being "a real client hang-up aborts the provider
call" (expected `true`, received `false`). Restored; SHA-256 `fb33a99207a379397a0b12550c6467f46ab53ffee8e3f34978049267c99fce25`
and an empty `git diff` on that file.

## Incidental fix in this territory

`hr-recruitment-ai.generateJd` invoked the paid gateway with `actor: { orgId: "system", userId: null }` and
`charge: true`, so **every job-description generation reserved and settled against a fake organisation** — the
caller's org was never billed and the usage row was untenanted. The controller already had `@CurrentUser()`.
Both the buffered route and the new streaming one now take the real `orgId`/`userId`. Same class as the blog
tenancy finding recorded above.

## Gates (S5)

| Gate | Result |
|---|---|
| `jest --runInBand --testPathPattern="modules/ai"` | exit 0 — 58 suites passed / 1 skipped, **527 passed / 21 skipped** |
| `pnpm typecheck` (8 GB heap, `heavy.sh 2`) | exit 2, 195 errors, **0 under `src/modules/ai/`** |
| `pnpm check:spec-typecheck` | exit 2, 205 errors, **0 under `src/modules/ai/`** |
| `npx eslint` on 14 changed/added files | 0 errors, 0 warnings |
| `check:ai-charge` | exit 0 — 128 invocations, all declare `charge` |
| `check:route-classification` | exit 0 — UNDECLARED 0 |
| `check:cycles` (madge) | exit 0 — no circular dependency |
| 18 further `check:*` gates | exit 0 (listed in the ticket's S5 footer) |
| `check:over-300` | exit 1 — **pre-existing**, 400/394 at S5 start; no S5 file crossed 300 |
| `check:route-budgets` | exit 1 — **another territory**, `GET /notifications*` |

The 195/205 typecheck errors are a single cascade: another agent is mid-edit in
`src/db/schema/payroll/policies.ts`, where `payrollPolicies` and `payrollPolicyVersions` now fail TS7022
circular inference, which collapses the Drizzle query-builder types and turns ~200 callbacks repo-wide into
implicit `any`. Rule 4 applies — none of it is under `src/modules/ai/`.

## Handover

- **Ticket 13 (frontend).** Nine `/stream` routes now exist with no client. `hooks/api/chat-ai-assistant.ts` is
  still the only stream reader and is hard-wired to `/chat`. Until a generic `useAiTextStream` exists, every one
  of these surfaces still buffers *from the user's seat*, which is why the box is not ticked.
- **Whoever owns `kb/`, `timesheets/`, `inventory/`, `payroll/`, `support/`, `e-sign/`, `chat/`, `cron/`,
  `leads/`, `mail/`, `automation/`, `workflows/`, `hr/recruitment/`, `accounting/`, `feedbucket/`.** 26 buffered
  `invokeText*` surfaces. The 14 in `kb/wiki`, `kb/help-centre` and `timesheets` are long-form prose a human
  waits on and should stream; the pattern is `resolve…Prompt()` + `streamTextWithUsage` +
  `respondWithAiTextStream`, three files' worth of precedent in `crm-brief.service.ts`,
  `crm-ai.controller.ts` and `survey-ai.controller.ts`.
- **`common/observability/`.** `AI_STREAM_BUDGETS` deliberately lives in the AI module because the parity spec
  bars an AI seam. If a future alert wants to read AI budgets from one table, that table has to grow a
  non-seam section rather than absorb the AI keys.
