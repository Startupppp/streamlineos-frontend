# 11 — Stream the non-chat AI surfaces and propagate aborts, deadlines and breakers

**What to build:** Non-chat AI surfaces buffer a complete answer before responding. They should stream text and tool progress, and honour cancellation end to end so a client disconnect stops the spend rather than continuing to pay for output nobody will read.

**Blocked by:** 09.

**Status:** 6 of 7 boxes closed · box 1 still PARTIAL, and now explicitly SPLIT.
**2026-09-03 (S13): the box's STRUCTURAL half is done and reported; its TIMING half was deliberately NOT
measured and is deferred to the quiescing pass.** Every non-chat AI surface was enumerated from the user
inward (component -> hook -> route -> gateway call, not route-first) and given a per-surface verdict:
`reports/11d-non-chat-ai-surface-census.md`. Eight buffered KB document surfaces were converted and
bite-proved: `reports/11e-kb-document-surfaces-stream.md`. **Timing was not measured because ~8 agents were
running and load averaged 3.5-5.5 on 15 CPUs all session; no contended number is quoted anywhere.**

- [ ] Non-chat AI surfaces stream rather than buffering; first visible streamed state lands within the target and application overhead before provider dispatch stays inside its budget.
  **PARTIAL — SPLIT 2026-09-03 (S13). STRUCTURAL: done. TIMING: not measured, deferred.**

  **STRUCTURAL — every non-chat AI surface now has a per-surface verdict**
  (`reports/11d-non-chat-ai-surface-census.md`). Enumerated from the user inward in three hops — 122
  gateway call sites with their enclosing method across 54 files, method to controller route, then route
  to a component under `app/ features/ components/`, taking the SECOND hop from the hook symbol because a
  path grep counts the hook file and its own path string as two callers. Kinds: 70 `invokeStructured*`
  (excluded on principle — a half-parsed object is not renderable partial state), 43 text, 10->12
  streaming, 6 embedding.
  · **4 surfaces streamed at session start**: generate-jd, survey summarize-responses, meeting prep,
    meeting follow-up. **12 now** — the eight KB document actions were converted this session.
  · **Every remaining buffered surface is named with a reason** in report 11d §3b/§3c. The reasons are:
    `invokeStructured` (build/project AI's eight actions, accounting, mail, support improve-reply — the
    largest AI output in the product, `pm.plan` at 1536 tokens, is structured, not prose), an HTML
    fragment for a rich-text editor (build ticket improve-description ×2), a stored record whose product
    is the snapshot (executive brief), an unreachable branch (`mode="public"` KB ask), or an excluded
    module (CRM, inventory).

  **THE FINDING THAT RESIZES RESIDUAL R-3c.** `components/ai/ai-actions-menu.tsx` already implements the
  whole streaming UI — `run(signal, onToken)`, a `streaming` state, Stop that keeps the partial answer,
  unmount abort, single-flight, retry. **20 surfaces use it; 26 `run` closures; exactly 2 passed
  `onToken`** at session start (4 now). The other surfaces handed it a buffered `run`, so the streaming
  state it renders was unreachable code. **R-3c is therefore not "26 sites in 17 modules each needing a
  UI rewrite" — it is a `/stream` route plus ~6 lines in one `run` closure, per surface.** That is what
  should be routed to the module owners.

  **THE ARGUMENT FOR CONVERTING THE REST, with the surfaces named.** `lib/api-client.ts:14` still arms
  `REQUEST_TIMEOUT_MS = 30_000` on every BUFFERED metered AI call, against backend deadlines of 60 s and
  120 s. A buffered call shows nothing until the last token, so its wall clock is the whole generation.
  The in-scope buffered surfaces declaring a **1024-token** ceiling are the ones that cross it:
  `kb.page-improve` and `kb.article-improve` (**both converted this session**), and still open —
  **`kb.ask`** (`features/wiki/components/knowledge-base-page.tsx`, `components/support/kb-ask-panel.tsx`)
  and **`support.reply`** (`features/support/inbox/ticket-ai-panel.tsx`, `ticket-detail-header.tsx`). On
  those two, a long generation is killed by the client and offered back as a retry that reserves and
  spends a second time.

  **THE GATE WAS BLIND, AND ITS FIRST REPAIR WAS VACUOUS.** `ai-stream-route-contract.spec.ts` scanned
  `modules/ai` only; every streaming route happened to live there, so nothing would have caught one added
  in the module that owns its data — which is what the KB routes are. It scans all of `src/modules` now
  (ratchet 11 -> 19). A second assertion, "every streaming route opts out of the tenant transaction", was
  added FILE-level and **did not bite**: deleting the decorator from one of four streaming handlers in a
  controller left the gate at exit 0 / 40 passed. Rewritten per-route and re-bite-proved (1 failed / 40
  passed, offender named with its line).

  **TIMING — NOT MEASURED. `uptime` 3.50/4.01/4.53 at start, 5.43/3.85/3.68 mid-session, on 15 CPUs
  shared with ~8 agents.** `ai.stream.first-byte.app` (150 ms p95 / 112 ms threshold) and
  `ai.stream.dispatch.overhead` (50 ms p95 / 37 ms threshold) must be re-taken on a quiet machine; the S5
  numbers were themselves taken under unknown load and should be re-taken, not trusted. Surfaces with no
  timing number at all: the 8 KB routes added here, `/ai/meetings/prep/stream`,
  `/ai/meetings/follow-up/stream`. Should ride along with tickets 22/23 in the quiescing pass. **No
  contended number is quoted as release evidence.**

  **STILL OPEN, unchanged in kind.** R-3 (6 `/stream` routes with no frontend surface of any kind — a
  product decision), R-3b (whether the `MeetingsAiController` and `CrmAiController` meeting families are
  duplicates — a product decision), R-3c (now correctly sized above — territory + ordering).
  PARTIAL — NOT CLOSED. **S5 converted six more surfaces and measured both numbers; the box stays open because
  ~33 buffered text surfaces remain, 26 of them outside this territory, and no frontend consumes any of the new
  routes.**

  **Streaming today (11 routes, one mechanism).** `POST /chat` · `POST /public/kb/stream-ask` ·
  `POST /ai/blog/posts/:postId/{improve-writing,suggest-title,summarize}/stream` · **new in S5**
  `POST /ai/account-summary/stream` · `POST /ai/meeting-prep/stream` · `POST /ai/report-narrator/stream` ·
  `POST /ai/crm/meeting-follow-up/stream` · `POST /ai/surveys/:surveyId/summarize-responses/stream` ·
  `POST /ai/generate-jd/stream`. Every one goes through `respondWithAiTextStream` →
  `AiGatewayService.streamTextWithUsage`; no second mechanism was added, and
  `ai-stream-route-contract.spec.ts` now fails if a `/stream` route appears in an AI controller that does not
  use the shared helper, or if any controller calls `pipeTextStreamToResponse` itself.

  **Why the 70 `invokeStructured*` call sites are excluded, stated rather than left unexamined.** They return a
  Zod-validated object. A half-parsed JSON object is not renderable partial state — there is nothing a user can
  read in `{"score": 7, "reas` — and emitting it would have to bypass the `.strict()` boundary validation this
  release depends on (§9 of the brief), turning a schema violation into a silently-truncated object. Streaming
  them would cost the validation and buy the user nothing. They are excluded on that ground, not because nobody
  looked. Current census (`grep -rno '\.invokeStructured[A-Za-z]*(' src --include='*.ts'` minus specs and the
  gateway's own definitions): **70 structured · 43 text · 9 streaming · 6 embedding = 128**, matching
  `check:ai-charge` ("128 invocations scanned").

  **Of the 43 text sites, 17 are in this territory.** Ten now have a streaming sibling (blog ×3, CRM
  account-summary, CRM meeting-prep, CRM meeting-follow-up, CRM report-narrator, survey summarize-responses,
  HR generate-jd, KB public-ask). The other seven are named with a reason, applying one line: **stream where the
  output is prose a client can append; do not stream where the output is only valid when complete.**
  · `hr-copilot-tools.ts` ×3 — LangChain tools inside the chat agent loop; the model consumes their output, no
  human waits on them, and the turn they belong to already streams.
  · `ticket-insights-ai.improveDescription` and `ticket-triage-ai.improveDescriptionDraft` — the output is an
  HTML fragment fed to a TipTap/ProseMirror editor; a partial fragment is unbalanced markup, the same class of
  "only valid when complete" as a half-parsed object.
  · `crm-copilot-lead.duplicateSuggestionsForLead` — the prose is one field beside a `duplicates[]` array; the
  surface's payload is a record, not an answer.
  · `executive-brief.generate` — writes a snapshot with citations that `GET /ai/executive-brief` reads back; the
  route's product is the stored record, and streaming it would need a second post-stream persistence path.
  The remaining 26 text sites live in 17 other modules (`timesheets`, `kb/wiki`, `kb/help-centre`,
  `kb/retrieval`, `inventory/ai`, `payroll/insights`, `support/core`, `e-sign`, `chat`, `cron`, `leads`,
  `mail`, `automation`, `workflows`, `hr/recruitment`, `accounting/ai`, `feedbucket`) — **another territory**.
  `kb/wiki` (4), `kb/help-centre` (5) and `timesheets` (5) are the largest and are all long-form prose that a
  human waits on; they are the obvious next batch and each is now a ~10-line controller change plus a prompt
  extraction, because the helper they need already exists.

  **Both numbers are now measured, against targets that did not exist before.**
  `common/observability/seam-budgets.ts` still carries no AI seam — deliberately, and
  `ai-metric-alert-parity.spec.ts` asserts the AI span is never bucketed into one — so the targets are declared
  in the module that owns them: `src/modules/ai/core/telemetry/ai-stream-budgets.ts`, same shape and same 25%
  alert headroom as the seam table.
  · `ai.stream.first-byte.app` — **budget 150 ms p95, threshold 112 ms**, derived from `route.cached.read`: a
  streamed answer is a browser-visible read and is held to the same bar. **Measured: n=30 over a real socket,
  p50 0.530 ms, p95 2.512 ms** (`ai-stream-surface.integration.spec.ts` boots Nest, drives
  `respondWithAiTextStream` and times `fetch` start → first byte off `response.body.getReader()`).
  · `ai.stream.dispatch.overhead` — **budget 50 ms p95, threshold 37 ms**, derived as one `cache.roundtrip`
  (2 ms, breaker) + one `db.roundtrip.simple` (20 ms, credit reservation) + in-process work, capped at one third
  of the first-byte budget. **Measured: n=50 through the real `AiGatewayStreamHelper` with only the provider
  stubbed, p50 0.052 ms, p95 0.074 ms in-process**, plus the declared 22 ms I/O allowance for the two legs a
  stub makes free = **22.1 ms against 50 ms** (`ai-stream-dispatch-overhead.spec.ts`).
  · **NOT MEASURED: end-to-end time to first token including the provider.** There is no provider credential in
  this environment, so provider latency is excluded from both numbers rather than guessed at. What is measured
  is the application's whole share of each; the provider's share is recorded per call at runtime as
  `ai.ttft_ms` on the `ai.gateway.call` span and as `ttftMs` on the settled `ai_usage_logs` row.

  **Cancellation stops the spend, proven over a real socket with a bite.**
  `ai-stream-surface.integration.spec.ts` → 4 passed: a real client hang-up mid-stream aborts the signal the
  provider stub received, the stub records `released` and never records `settled`, and an anti-vacuous control
  asserts a healthy request never aborts and does settle. Bite proof: replacing `produce(abort.signal)` with
  `produce(new AbortController().signal)` in `ai-text-stream-route.ts` → **1 failed, 3 passed**
  ("a real client hang-up aborts the provider call" — expected true, received false); restored, SHA-256
  `fb33a992…` and an empty `git diff` on that file.

  **Two things that still block the box, neither of them code in this territory.**
  1. **No frontend consumes any `/stream` route.** `hooks/api/chat-ai-assistant.ts` is still the only stream
     client in the frontend and is hard-wired to `/chat`; a surface whose only client calls the buffered sibling
     still buffers *for the user*. Ticket 13's territory.
  2. **The 26 text surfaces in 17 other modules.** Each needs an edit outside `src/modules/ai/**`.

  **S7 UPDATE (2026-09-02) — blocker 1 is now partly cleared, and the reason the rest cannot clear is not
  what S5 recorded.** A shared client exists (`hooks/api/ai-text-stream.ts`, S6) and **2 of the 9 `/stream`
  routes now reach a real user**: `/ai/generate-jd/stream` (S6) and
  `/ai/surveys/:surveyId/summarize-responses/stream` (S7, frontend commit `9c3f607cd`, 6 tests + 3 bite
  proofs). Blocker 2 is untouched.

  **The remaining 7 are not "a one-line adoption" — 6 of them have no frontend surface at all.** Measured
  in the frontend by grepping each *buffered* sibling path across `**/*.ts{,x}`, excluding `node_modules`
  and specs. A route whose buffered sibling has no caller has no surface to convert:
  · `/ai/blog/posts/:postId/improve-writing` · `/ai/blog/posts/:postId/suggest-title` ·
  `/ai/blog/posts/:postId/summarize` — **0 callers each**. A blog admin surface does exist
  (`features/blog/admin/**`, `app/(authenticated)/blog/admin/page.tsx`) but it has no AI affordance of any
  kind, so this is an unbuilt product surface, not an unstreamed one.
  · `/ai/account-summary` · `/ai/meeting-prep` · `/ai/report-narrator` — **0 callers each**; only
  `contracts/openapi.json` mentions them.
  · `/ai/crm/meeting-follow-up` — the **only** one of the seven with a live caller
  (`hooks/api/crm/ai.ts:242` → `features/crm/shared/meeting-follow-up-composer.tsx`), and `features/crm/**`
  is excluded from this release's scope.
  This corrects S5's framing: the four routes filed as "CRM" are not four CRM surfaces. Three of them are
  reachable from no frontend code at all, CRM or otherwise.

  **P2 FINDING — S5 streamed three routes the product does not call.** The live calendar surfaces
  `features/calendar/meeting-prep-panel.tsx` and `features/calendar/meeting-follow-up-panel.tsx` call
  `useMeetingPrep` / `useMeetingFollowUp` in `hooks/api/meetings-ai.ts`, which POST **`/ai/meetings/prep`**
  and **`/ai/meetings/follow-up`** — `MeetingsAiController` (`@Controller("ai/meetings")`, permission
  `calendar:ai:use`). Those two routes have **no `/stream` sibling**. Meanwhile `CrmAiController`
  (`@Controller("ai")`) exposes `/ai/meeting-prep` + `/ai/meeting-prep/stream`, which nothing calls. So the
  two meeting surfaces a user can actually reach still buffer, and cannot be converted from the frontend at
  all: the streaming route they would need does not exist. Same shape for follow-up
  (`/ai/meetings/follow-up` live and unstreamed vs `/ai/crm/meeting-follow-up/stream` streamed and
  CRM-only). Closing this box for the meeting surfaces needs a backend change in `src/modules/ai/**` —
  either a `/stream` sibling on `MeetingsAiController`, or a decision that the two route families are
  duplicates and one should go. Neither is ticket 13's territory to make.

  **`/public/kb/stream-ask` is out of scope, and not because of the visual freeze.** Its buffered sibling
  `/public/kb/ask` is called only by `usePublicAskSupportKb` → `KbAskPanel mode="public"`, and
  **`mode="public"` has zero call sites** — the public help centre pages under `app/(public)/help/**` render
  no ask panel. Streaming it would wire an unreachable branch. (`app/(public)/**` is frozen this release
  regardless.)

  Incidental fix inside this territory: `hr-recruitment-ai.generateJd` reserved and settled against
  `actor: { orgId: "system", userId: null }`, so every JD generation was billed to a fake organisation. Both the
  buffered route and the new streaming one now take the caller's real `orgId`/`userId` from `@CurrentUser()`.

  **2026-09-03 — re-measured at head. 3 of 10 `/stream` routes now reach a user, and the reason the other 7 do not
  is confirmed to be an absent product surface, not an unadopted stream.**
  The AI controllers expose **10** `/stream`-family routes. Counting frontend callers per route by grepping the path
  across `app features hooks lib components` excluding tests:
  · `generate-jd/stream` **2** · `surveys/:surveyId/summarize-responses/stream` **2** ·
  `meetings prep/stream` **2** (wired by another lane this session, commit `1cc7ded8`) —
  · `account-summary/stream` **0** · `blog/posts/:postId/improve-writing|suggest-title|summarize/stream` **0 each** ·
  `report-narrator/stream` **0** · `meeting-follow-up/stream` **0** · `stream-ask` **0**.
  **Wiring a route whose buffered sibling also has no caller is building a product surface, not adopting a stream**,
  and that is what six of the seven would be: the blog admin surface exists (`features/blog/admin/**`) but has no AI
  affordance of any kind, and `/ai/account-summary` and `/ai/report-narrator` are mentioned by nothing outside
  `contracts/openapi.json`. The seventh, `/ai/crm/meeting-follow-up/stream`, has a live caller in
  `features/crm/**`, which this release excludes. `/public/kb/stream-ask`'s only client is `KbAskPanel mode="public"`,
  and `mode="public"` still has **zero call sites** — streaming it would wire an unreachable branch, independently of
  the `app/(public)/**` freeze.
  **BLOCKED, and on two different things, which is why it cannot close as one item.** The 6 surface-less routes are a
  **product decision** (does this product want a blog AI affordance, an account summary, a report narrator?). The 26
  buffered text sites in 17 other modules are **another territory**. Neither is a missing stream helper: the client
  (`hooks/api/ai-text-stream.ts`) and the server helper (`respondWithAiTextStream`) both exist, are proven, and are
  adopted wherever a surface exists to adopt them.

  **DISPOSITION 2026-09-03 — this box holds one ASSIGNABLE item and three accepted residuals. Register:
  `reports/residual-risk-register.md` §3.2 and §1.5.**
  **ASSIGNABLE A-6 — CLOSED 2026-09-03 (S10). Was: `/ai/meetings/follow-up` still has no `/stream` sibling. Owner: `src/modules/ai/**` owner.
  Deadline: 2026-09-08.** This is real, scoped backend work and it was buried above inside a paragraph headed
  "P2 FINDING", whose first sentence reads as an observation about S5 rather than as an open item. Verified at
  head by enumerating every `@Post("...stream...")` in `src/modules/ai`: **10 streaming routes**, and
  `meetings-ai.controller.ts:83` now carries `@Post("prep/stream")` — but **there is no `follow-up/stream`**. So
  `features/calendar/meeting-follow-up-panel.tsx` still buffers and cannot be converted from the frontend at all.
  The shape is the one already landed one method above it in the same file: `@Post("follow-up/stream")` on
  `MeetingsAiController` delegating to a `streamFollowUp` on `MeetingsPrepService` through
  `respondWithAiTextStream`, then point `useMeetingFollowUp` at it.
  **RESIDUAL R-3 — 6 `/stream` routes with no frontend surface at all. Blocker: DECISION (unbuilt product
  surface). Owner: release owner (product). Deadline: 2026-09-10.**
  **RESIDUAL R-3b — whether `MeetingsAiController` and `CrmAiController`'s meeting route families are duplicates
  and one should be retired. Blocker: DECISION. Owner: release owner (product). Deadline: 2026-09-10.**
  **RESIDUAL R-3c — the 26 buffered text surfaces in 17 other modules. Blocker: territory + DECISION on ordering.
  Owner: release owner to route to the 17 module owners. Deadline: 2026-09-17.**
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

---

## Session S5 evidence footer (2026-09-02)

Gates run, output read:

| Gate | Result |
|---|---|
| `jest --runInBand --testPathPattern="modules/ai"` | exit 0 — **58 suites passed / 1 skipped, 527 passed / 21 skipped** |
| `pnpm typecheck` (8 GB heap, via `heavy.sh 2`) | exit 2, **195 errors, 0 under `src/modules/ai/`** — cascade from another agent's in-flight `src/db/schema/payroll/policies.ts` (TS7022 circular inference) |
| `pnpm check:spec-typecheck` | exit 2, **205 errors, 0 under `src/modules/ai/`** — same cascade |
| `npx eslint` on the 14 changed/added files | **0 errors, 0 warnings** |
| `pnpm -s check:route-classification` | exit 0 — ALL ROUTES CLASSIFIED, UNDECLARED 0 |
| `pnpm -s check:ai-charge` | exit 0 — 128 invocations scanned, all declare `charge` |
| `pnpm -s check:route-duplicates` | exit 0 |
| `pnpm -s check:openapi-coverage` · `check:openapi-path-params` · `check:operation-ids` | exit 0 (3613 operations) |
| `pnpm -s check:file-sizes` | exit 0 — 3559 files, all within 500 |
| `pnpm -s check:cycles` (madge) | exit 0 — no circular dependency, 5505 files |
| `check:permission-keys` · `module-gate` · `idempotent-commands` · `mock-surface` · `bounded-contracts` · `compression` · `cache-key-shapes` · `namespace-coverage` · `import-direction` · `kebab-case` · `log-secrets` · `envelope-consistency` · `contract-registry` · `module-di` · `fire-and-forget` · `bodyless-conflicts` | all exit 0 |
| `pnpm -s check:over-300` | exit 1 — **pre-existing**: 400 files / baseline 394 when S5 started, 402 now; no file changed by S5 crossed 300 (`crm-ai.controller.ts` 321→393 and `hr-recruitment-ai.service.ts` 325→342 were already over) |
| `pnpm -s check:route-budgets` | exit 1 — **another territory**: `GET /notifications` and `GET /notifications/unread-count` |


---

## Session S8 addendum (2026-09-03) — the meeting-prep panel now streams for real

**The "2 callers" this ticket recorded for `meetings prep/stream` were the hook file and its own path string.**
Grepped at head before touching anything: `streamMeetingPrep` had **zero** callers, and
`features/calendar/meeting-prep-panel.tsx` — the only surface a user can reach — still called the buffered
`useMeetingPrep`. So the route reached no user. It does now.

**What changed** (all in this territory):
- `features/calendar/meeting-prep-stream-parse.ts` — a pure parser that folds the arriving markdown back into the
  four affordances the panel renders. `agendaStreamPrompt` asks for `## Agenda` / `## Key topics` /
  `## Suggested duration` / `## Preparation notes`, so the parser is a function of the text received *so far*:
  called with a prefix it returns that prefix's sections.
- `features/calendar/meeting-prep-agenda.tsx` — the structured rendering, each branch guarded on its own content
  rather than on completion, so the four affordances appear as the model reaches them.
- `features/calendar/meeting-prep-panel.tsx` — a five-state machine (idle · streaming · cancelled · done · failed)
  with a Stop button, partial output kept on cancel, and `AiFailureBody` for the failure branch.
- `hooks/api/meetings-ai.ts` — `streamMeetingPrep` gained `onSources`; `useMeetingPrep`, `MeetingPrepResult`,
  `AgendaOutput` and `MeetingContextSummary` had no remaining caller and are **deleted**. The buffered backend
  route stays: its product is a Zod-validated record and this release does not stream those.
- `hooks/api/ai-text-stream.ts` — `onHeaders` (so `x-ai-sources` reaches the surface **before** the first token,
  which is the whole reason the backend puts citations on headers: a stopped stream keeps them) and `run()`, so a
  typed per-route transport reuses the same single-flight / stop / unmount-abort machinery instead of copying it.

**Proof.** `npx jest --runInBand --testPathPattern="meeting-prep"` → **exit 0, 2 suites / 21 tests**.
`meeting-prep-panel-streaming.test.tsx` drives the real panel down through `streamMeetingPrep` → `streamAiText` →
`authedFetch` with only `global.fetch` mocked. `pnpm type-check` → **exit 0, 0 errors**;
`npx eslint` on all 7 changed/added files → **exit 0**.

**Three bite proofs, all in a hermetic `git archive HEAD` tree, never the shared working tree** (baseline there:
21 passed):
· transport pointed back at the buffered `/ai/meetings/prep` → **1 failed / 9 passed**
  ("posts to the /stream route and never to the buffered sibling")
· `signal` dropped from the transport → **3 failed / 7 passed** ("Stop aborts the outgoing request and keeps the
  partial agenda and its citations", "aborts the stream when the panel unmounts", "does not open a second paid
  stream while one is running")
· `onHeaders` dropped from the shared client → **2 failed / 8 passed** ("renders citations from x-ai-sources
  before the body finishes", "Stop aborts …")
Live tree verified untouched afterwards: `hooks/api/meetings-ai.ts` sha256 `e93e70ee…`, `ai-text-stream.ts`
sha256 `b920a55d…`, identical to the restored hermetic copies.

**Three defects the tests found, each fixed:** a bullet marker arriving before its text rendered a topic chip
reading "-" that then vanished; sources rendered twice (the card's citation row **and** a second Sources block
carried over from the buffered panel); and a 402 offered "Try again" beside the top-up link — a non-retryable
failure now gets no dispatch control at all.

**Box 1 still does not close, and the reason is unchanged by this work:** the 6 surface-less `/stream` routes are
a product decision and the 26 buffered text sites in 17 other modules are another territory. What *has* changed is
that there is no longer any `/stream` route with a live frontend surface that is not adopted.


---

## Session S10 addendum (2026-09-03) — A-6 closed: the meeting follow-up streams end to end

**The route existed nowhere and now exists once.** Enumerated at head before touching anything:
`grep -c '@Post("[^"]*stream' src/modules/ai/core/controllers/*.ts` -> **10** streaming routes, with
`meetings-ai.controller.ts` carrying `prep/stream` and **no** `follow-up/stream`. It is now **11**, and
`ai-stream-route-contract.spec.ts`'s ratchet moved 10 -> 11 in the same change so the count cannot silently
regress.

**It copies `prep/stream`, it does not invent a second convention.** Same controller, same
`@RequirePermission("calendar:ai:use")` and `@UseRateLimit("ai:invoke")` inherited from the class, same
`@NoTenantTransaction()`, same `AiRequestAbortInterceptor`, same `respondWithAiTextStream` helper, same
`x-ai-sources` header name, same `@Validate({ body: meetingFollowUpBodySchema })` (`.strict()`), same
`(signal) => service.streamX(..., signal)` producer shape.

**Credit metering is the same call, not a similar one.** `MeetingsPrepService.streamFollowUp` goes through
`AiGatewayService.streamTextWithUsage` with `charge: true` and `feature: "meetings.follow-up"` — the key the
buffered `draftFollowUp` already uses, already priced at 1 milli-credit in `ai-cost-catalog.ts`. So the
streamed route reserves, breaker-guards and concurrency-caps identically. A spec asserts the two keys and
their `charge` flags are **equal to each other**, so the streamed route cannot start metering differently
from the one beside it. `pnpm -s check:ai-charge` 127 -> **128 invocations, `streamTextWithUsage` 9 -> 10,
all declare `charge` explicitly, exit 0.**

**Cross-tenant is 404, asserted rather than assumed.** `loadFollowUpEvent` -> `loadEvent` filters on
`orgId`, so another tenant's event id raises `NotFoundException`; the spec asserts the rejection is a
`NotFoundException` and **not** a `ForbiddenException`, and that no paid call was dispatched.

**The prompt asks for a shape a half-arrived line still parses.** `followUpStreamPrompt` requests
`## Subject` / `## Email` / `## Action items` / `## Next meeting`, with each action item written as
`- <task> | owner: <name or unassigned> | due: <date or none>`. Reading owner and due **by label** rather
than by position is what lets the frontend refine an item in place while it is still arriving. Both
follow-up prompts now share one `followUpContextBlock`, so the buffered and streamed drafts cannot drift
onto different descriptions of the same meeting.

**Sources are assembled, never asked of the model** — event, attendees, and (new for follow-up) the
organizer's own notes and supplied action items, which are the inputs the draft is derived from. Long
notes are capped to a 160-character snippet so one transcript cannot crowd the 4 KB citation header.

**The buffered route and its hook were NOT deleted.** `POST /ai/meetings/follow-up` still returns its
Zod-validated record, and `useMeetingFollowUp` still exists — recorded as a KEEP verdict in the frontend
`check:dead-code` gate, which is what turned that gate red the moment its last caller moved to the stream.

### Proof

| Command | Result |
|---|---|
| `npx jest --runInBand --testPathPattern="meetings-follow-up-stream\|meetings-prep-stream\|ai-stream-route-contract"` | exit 0 — **3 suites / 25 tests** |
| `npx jest --runInBand --testPathPattern="modules/ai"` | exit 0 — **60 suites passed / 1 skipped, 544 passed / 21 skipped** |
| `pnpm typecheck` (8 GB heap, via `heavy.sh 2`) | exit 2 — **1 error, 0 under `src/modules/ai/`** (`hr/config/hr-handbook.service.ts:105`, another territory) |
| `pnpm check:spec-typecheck` | exit 2 — **same 1 error, 0 under `src/modules/ai/`** |
| `npx eslint` on the 5 changed/added backend files | exit 0 |
| `pnpm -s check:ai-charge` | exit 0 — 128 invocations, all declare `charge` |
| `check:route-classification` · `route-duplicates` · `authz-deny` · `contract-registry` · `openapi-coverage` · `operation-ids` | all exit 0 |
| `pnpm -s check:file-sizes` | exit 1 — **not mine**: `clients/client-accounts.service.ts` at 505 lines, another agent's in-flight edit (this gate was exit 0 when S10 started) |

**Bite proofs — hermetic `git archive HEAD` tree, the shared working tree never modified.** Baseline 25 passed.

| Mutation | Result |
|---|---|
| `streamFollowUp` charges `false` | **2 failed / 23 passed** — "dispatches ONE paid streaming call…", "bills the same feature key as the buffered sibling…" |
| the abort signal is not passed to `streamTextWithUsage` | **1 failed / 24 passed** — "hands the route's abort signal to the provider call…" |
| the streamed route meters under `meetings.prep` instead | **2 failed / 23 passed** — the same two |
| the `follow-up/stream` route is deleted from the controller | **1 failed / 24 passed** — "every streaming route goes through the one shared helper" |

Restored: 25 passed; `meetings-prep.service.ts` sha256 `e9376788…` and `meetings-ai.controller.ts` sha256
`a90aaef5…`, byte-identical to the live tree.

**What A-6 does NOT close.** Box 1 stays open on exactly what it was already open on, unchanged by this
work: **R-3** (6 `/stream` routes with no frontend surface of any kind — a product decision), **R-3b**
(whether `MeetingsAiController` and `CrmAiController`'s meeting route families are duplicates — a product
decision; note this session added the follow-up stream to `MeetingsAiController`, the family the live
calendar surfaces actually call, so retiring the CRM family is now the cheaper half of that decision) and
**R-3c** (26 buffered text sites in 17 other modules — another territory).

**Cross-territory finding, NOT fixed, `src/modules/billing/core/` — the AI-credit first-purchase race is
real and now has one more caller.** `AiCreditsReservationService.reserve` does
`select().from(orgAiCredits).where(eq(orgId)).for("update")` and inserts the wallet when the row is
missing. `FOR UPDATE` locks **nothing** when the row does not exist, so two concurrent first AI calls in a
brand-new org both see no wallet and both INSERT. The recovery arm is
`if (isUniqueViolation(err) && idempotencyKey)` — and `AiGatewayStreamHelper.run` reserves with **no**
`idempotencyKey` (`{ orgId, userId, feature, credits }`), so the loser's 23505 escapes as a 500 rather than
resolving to the winner's wallet. Every streaming route reaches this, including the one added here. The fix
belongs in `billing/core/` (an `ON CONFLICT (org_id) DO NOTHING` insert-then-reselect, or advisory-locking
the org id before the select) and was not attempted from this territory.


---

## Session S13 addendum (2026-09-03) — the KB document surfaces stream; structural half closed, timing half deferred

Full write-ups: `reports/11d-non-chat-ai-surface-census.md` (the per-surface census and how it was
enumerated) and `reports/11e-kb-document-surfaces-stream.md` (the conversion, the bite proofs, the gates).

**Converted.** 8 routes — `POST /kb/{pages/:pageId,articles/:articleId}/ai/{summarize,ask,improve,suggest-related}/stream`
— all through the existing `respondWithAiTextStream`, no second mechanism, `@NoTenantTransaction()` per
method, each service's stream method opening its own tenant transaction so RLS still covers the
visibility check. Same feature keys, same prices, same `charge` flags as the buffered siblings, asserted
pairwise. Each service now holds one row per action instead of four near-copies, so the two
representations of an action share one prompt by construction; the eight prompts are byte-identical to
the ones they replaced and are deliberately NOT shared between page and article, which word theirs
differently.

**Frontend.** `hooks/api/kb/doc-ai-stream.ts` is the transport; both panels now pass `onToken` into
`AiActionsMenu`. The wiki panel had hand-rolled the menu, result sheet, in-flight guard and error
classification `AiActionsMenu` already owns — it uses it now (299 -> 99 lines), the article panel went
283 -> 92, and their two duplicated ask sheets are one shared streaming component. Net -627 / +650 across
9 files, most of the addition being the new test.

**Two honest costs of any conversion, neither new but neither previously recorded.** (a) A streamed
surface loses its per-call `AiUsageChip` — usage is only known after the last token and the headers went
out before the first; the spend is still on `ai_usage_logs`. (b) `streamTextWithUsage` is hard-wired to
`resolveChatModel()` (Vercel AI SDK, gemini-1.5-pro / gpt-4o) while the buffered path uses `LlmService`'s
`tier: "fast"` chain (LangChain, `AI_FAST_MODEL`) — **two different provider stacks, so converting a
surface changes its price per token as well as its latency. True of all 19 streaming routes.** Fixable
once by giving `streamTextWithUsage` a `tier`; that is `modules/ai/core/gateway/`, shared by every
streaming route, and was not attempted from here.

**Gates.** backend `typecheck` exit 0 / 0 errors · `check:spec-typecheck` exit 0 · frontend `type-check`
exit 0 / 0 errors · backend jest `modules/ai|modules/kb` exit 0, **158 suites / 1186 passed** · frontend
jest exit 0, **23 suites / 203 passed** · eslint on all 16 changed files exit 0 · 10 backend and 9
frontend cheap gates all exit 0. Red and **not mine**: frontend `check:dead-code` (1 unclassified export,
`chat-schema.ts:chatChannelMemberListContract`, from the chat commit at HEAD — my 5 newly-uncalled KB
hooks carry KEEP verdicts on the S10 `useMeetingFollowUp` precedent), frontend `check:over-300` (520 vs
baseline 519, none of my files in the list), backend `check:file-sizes` and `check:kebab-case` (chat,
clients, e-sign, hr, scripts).

**No real AI provider was called. No database was opened. No timing number was taken.**

**Cross-territory, NOT fixed:** the streamed/buffered model split (AI gateway lane); the 30 s buffered
client cap with `kb.ask` and `support.reply` still exposed (`lib/api-client.ts` / platform); a stale
tracked `openapi.json` carrying 5 stream paths against 19 real ones, which `check:openapi-coverage`
cannot see because it checks the contract's internal consistency rather than its currency (owner:
`pnpm openapi:generate`); and S10's first-purchase AI-credit wallet race, now with 8 more callers.
