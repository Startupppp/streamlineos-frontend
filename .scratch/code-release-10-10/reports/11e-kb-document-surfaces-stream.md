# 11e — The KB document AI surfaces stream, and the streaming gate stops being blind

**Session S13, 2026-09-03.** Ticket 11, box 1 — the **structural** half. The **timing** half was
deliberately NOT measured; §6 says why and names what is outstanding.
Per-surface census: `reports/11d-non-chat-ai-surface-census.md`.

## 1. The finding that reframes this box

Ticket 11 has been carrying "26 buffered text surfaces in 17 other modules" as a residual since S5,
described as work that needs an edit per module. Measured this session, that is not the shape of the
remaining work at all.

**`components/ai/ai-actions-menu.tsx` already implements the entire streaming UI.** `AiAction.run`
takes `(signal?, onToken?)`; the component owns a `streaming` state, renders it through
`AiActionResultBody`, and already has Stop, a cancel that keeps the partial text, an unmount abort,
single-flight and retry.

```
$ grep -rln "AiActionsMenu" --include='*.tsx' app features components | grep -v test
   -> 21 files (20 surfaces + the component itself)
$ per-file count of `run:` closures, and of those passing onToken
   -> 26 run closures; onToken passed by exactly 2
```

So the frontend streaming machinery was built, adopted by 20 surfaces, and reached by 2. The other
18 handed it a buffered `run` that never calls `onToken`, and the streaming state it renders was
unreachable code. **What each of those surfaces needs is not a UI rewrite — it is a `/stream` route
on the backend plus about six lines in one `run` closure.**

That is a much smaller and much better-specified residual than "26 sites in 17 modules", and it is
the number the release owner should be routing.

## 2. What was converted

The two KB document surfaces — the largest buffered batch the ticket itself named as the obvious
next one, and the two that carry the highest exposure to the buffered client cap (§4 of report 11d).

**Backend — 8 new routes, one mechanism, same meter.**
`POST /kb/pages/:pageId/ai/{summarize,ask,improve,suggest-related}/stream` and the same four under
`/kb/articles/:articleId/ai/`. Every one goes through the existing `respondWithAiTextStream`; no
second streaming path was introduced. Each carries `@NoTenantTransaction()` per method (the buffered
siblings keep the request-scoped transaction), and each service's stream method opens its own tenant
transaction for the visibility check, so RLS still applies to a read that now happens outside the
request transaction.

Each service now holds **one row per action** instead of four near-identical methods, so the buffered
and the streamed representation of an action are the same prompt, the same ceiling and the same
feature key **by construction** rather than by two copies staying in step. The eight prompts are
byte-identical to the ones they replaced, and are **not** shared between page and article: the two
surfaces word theirs differently ("document" vs "article"; the page `improve` prompt forbids markdown
fences and the article one does not), and a shared table would have silently rewritten eight prompts
while every test stayed green.

Feature keys and prices are unchanged and already existed in `ai-cost-catalog.ts`
(`kb.page-*` / `kb.article-*`, `improve` at 2 milli-credits, the rest at 1). `check:ai-charge` moved
`streamTextWithUsage` 10 -> 12 and total invocations 128 -> **124**, the drop being the six duplicate
`invokeTextWithUsage` call sites the action tables collapsed.

**Frontend — both panels stream, and one of them stops hand-rolling a menu.**
`hooks/api/kb/doc-ai-stream.ts` is the typed transport. `features/help-centre/.../kb-article-ai-actions.tsx`
kept its `AiActionsMenu` and now passes `onToken` (283 -> 92 lines).
`features/wiki/.../kb-page-ai-actions.tsx` had hand-rolled the menu, the result sheet, the in-flight
guard and the error classification that `AiActionsMenu` already owns; it now uses it (299 -> 99 lines).
The two duplicated ask sheets are one shared streaming component, `components/kb/kb-doc-ask-sheet.tsx`.
Net **-627 / +650** lines across 9 files, most of the addition being the new test.

## 3. The gate was blind outside `modules/ai`, and its first repair was vacuous

`ai-stream-route-contract.spec.ts` scanned `src/modules/ai` only. Every streaming route lived there,
so the scan looked complete — but nothing stopped the next one being added in the module that owns its
data, which is exactly what the KB routes are. It now scans the whole `src/modules` tree, and the
ratchet moved 11 -> **19** streaming routes (8 of them now outside `modules/ai`).

A second assertion was added: **every streaming route in the repo opts out of the tenant transaction.**
The first version of it scanned the controller *file* for `@NoTenantTransaction()`. Bite-proved: it
did **not** bite. Deleting the decorator from one streaming handler in a controller that has four of
them left the gate green, because three siblings still carried it — `EXIT=0, 40 passed`. It was
rewritten to walk each stream route's own decorator block, falling back to a class-level opt-out only
when the class actually declares one, and re-bite-proved (§5). **A gate assertion added in the same
session it was needed is exactly where a vacuous one hides, and this one was caught only because it
was bite-proved rather than assumed.**

## 4. Two honest costs of streaming a metered surface, neither of them new

- **A streamed surface has no `AiUsageChip`.** Token usage is only known after the last token, and the
  response headers went out before the first — so it cannot ride the headers, and a fetch reader
  cannot reliably read trailers. Every already-streaming surface has this property; the two KB panels
  now share it. The spend is still recorded server-side on `ai_usage_logs` and is visible in
  `/settings/billing/ai-credits`. **Not a regression introduced here, but a real UX loss per converted
  surface, and the release owner should know it scales with every conversion.**
- **A streamed call runs on a different model from its buffered sibling.** `streamTextWithUsage` is
  hard-wired to `resolveChatModel()` (Vercel AI SDK, `gemini-1.5-pro-latest` or `openai/gpt-4o`),
  while the buffered path goes through `LlmService`'s tier chain (`tier: "fast"`, LangChain
  `ChatOpenAI`, `AI_FAST_MODEL` + fallbacks). Two different provider stacks. Because billing is
  `computeTokenCharge(model, in, out)`, converting a surface changes its price per token as well as
  its latency. **This is true of all 19 streaming routes, not just the new ones**, and it was not
  recorded anywhere before. Giving `streamTextWithUsage` a `tier` would fix it in one place; that is
  `modules/ai/core/gateway/` and shared by every streaming route, so it was not attempted from here.
  **Cross-territory finding — owner: the AI gateway lane.**

## 5. Bite proofs — hermetic `git archive HEAD` trees, the shared working tree never modified

Backend baseline in the archive tree: **40 passed** (41 after the per-route rewrite).

| Mutation | Result |
|---|---|
| the page stream charges `false` | **8 failed / 32 passed** — the eight "bills the same feature key, charge flag and output ceiling as its buffered sibling" cases |
| the abort signal is not passed to `streamTextWithUsage` | **1 failed / 39 passed** — "hands the route's abort signal to the provider call" |
| one KB stream route loses `@NoTenantTransaction()`, three siblings keep it — **against the FILE-level assertion** | **EXIT=0, 40 passed — DID NOT BITE.** The assertion was rewritten. |
| the same mutation against the **per-route** assertion | **1 failed / 40 passed** — "every streaming route in the repo opts out of the tenant transaction, per route", offender `kb-page-ai.controller.ts:125` |
| the contract scan reverted to `modules/ai` only | **2 failed / 38 passed** |

Frontend baseline in the archive tree: **12 passed**.

| Mutation | Result |
|---|---|
| the transport points back at the buffered sibling | **6 failed / 6 passed** — "posts to the /stream route and never to the buffered sibling", "renders tokens as they arrive", "the ask sheet streams its answer", on both surfaces |
| `signal` dropped from the transport | **6 failed / 6 passed** — "Stop aborts the outgoing request and keeps what arrived", "cancels the running stream before it dispatches a second one", "a stale answer from a stopped ask never lands on the surface", on both surfaces |
| `onToken` dropped from the transport | **8 failed / 4 passed** |

Restored in every case; live tree verified byte-identical afterwards —
`doc-ai-stream.ts` `d58c7ee8…`, `kb-doc-ask-sheet.tsx` `42d1e731…`, `kb-page-ai-actions.tsx`
`c17f15dd…`, `kb-article-ai-actions.tsx` `f620af86…`, and
`git status --short` empty on every path this session touched.

The frontend test drives the real path — the menu item a user clicks, through `streamKbDocAi` ->
`streamAiText` -> `authedFetch` -> the combined abort signal — with **only `global.fetch` mocked,
which is why bites 5-7 can bite at all**. It also uses `installAbortSignalPolyfill()`, and the
`AbortSignal.timeout` stub in it is not load-bearing here: every assertion is on the explicit
per-request signal, not on the timeout.

**One test I wrote was wrong and the component was right.** "does not open a second paid stream while
one is running" asserted one request; reopening the menu dismisses the result popover, and that
dismissal cancels the run behind it, so a second request is correct. The invariant is "never two paid
streams live at once", and the assertion is now on the *first* request's signal being already aborted
when the second is dispatched. A request-count assertion would have read correct behaviour as a
double charge.

## 6. TIMING — NOT MEASURED, and why

```
$ uptime          # at session start
11:49  up 19:15, 2 users, load averages: 3.50 4.01 4.53
$ uptime          # mid-session
12:17  up 19:44, 2 users, load averages: 5.43 3.85 3.68
```

Fifteen CPUs shared by roughly eight concurrent agents, load 3.5-5.5 throughout. **No first-byte or
dispatch-overhead number was taken, and none is quoted anywhere in this report or the ticket.** A
contended latency number is not release evidence and recording one would be worse than recording
none.

Outstanding for the quiescing pass (tickets 22 / 23 are being held for it; these should ride along):

- `ai.stream.first-byte.app` — budget 150 ms p95, threshold 112 ms
- `ai.stream.dispatch.overhead` — budget 50 ms p95, threshold 37 ms

Both are declared in `src/modules/ai/core/telemetry/ai-stream-budgets.ts` and were last measured in
S5 under **unknown** load, so the S5 numbers should be re-taken rather than trusted. Surfaces with no
timing number at all:

- the 8 KB document stream routes added this session
- `/ai/meetings/prep/stream` (S8) and `/ai/meetings/follow-up/stream` (S10)
- `/ai/generate-jd/stream` and `/ai/surveys/:surveyId/summarize-responses/stream` — re-take

End-to-end time to first token including the provider remains unmeasurable here: there is no provider
credential in this environment and **no real AI provider was called at any point this session** —
every proof is a local double.

## 7. Gates

| Gate | Command | Result |
|---|---|---|
| backend typecheck | `heavy.sh 2 -- pnpm typecheck` | **exit 0** — 0 errors |
| backend spec typecheck | `pnpm check:spec-typecheck` | **exit 0** |
| frontend typecheck | `heavy.sh 2 -- pnpm -C frontend type-check` | **exit 0** — 0 errors |
| backend focused jest | `jest --runInBand --testPathPattern="modules/ai\|modules/kb"` | **exit 0 — 158 suites passed / 1 skipped, 1186 passed / 21 skipped** |
| frontend focused jest | `jest --runInBand --testPathPattern="kb\|components/ai\|hooks/api/ai\|features/calendar/meeting\|features/surveys"` | **exit 0 — 23 suites, 203 passed** |
| eslint, all 16 changed/added files | `npx eslint <files>` | **exit 0** |
| backend cheap gates | `ai-charge` `route-classification` `route-duplicates` `bodyless-conflicts` `authz-deny` `openapi-coverage` `operation-ids` `permission-keys` `module-gate` `contract-registry` | **all exit 0** |
| frontend cheap gates | `colors` `query-signal` `effect-fetches` `empty-states` `icon-labels` `routes` `type-assertions` `response-contracts` `gated-reads` | **all exit 0** |
| `pnpm -C frontend check:dead-code` | | **exit 1 — not mine.** My 5 newly-uncalled KB hooks were given KEEP verdicts (the S10 precedent for `useMeetingFollowUp`); the one remaining unclassified export is `hooks/api/chat-schema.ts:chatChannelMemberListContract`, from the chat commit at HEAD. `check:dead-code:self-test` exit 0. |
| `pnpm -C frontend check:over-300` | | **exit 1 — not mine.** 520 files vs baseline 519; **none of my files appear** — the two panels went 299 -> 99 and 283 -> 92, and my largest new file is 257 lines. |
| backend `check:file-sizes` | | **exit 1 — not mine.** `chat/chat-huddles.service.ts` 570, `clients/client-accounts.service.ts` 505, `e-sign/sign-templates.service.ts` 507, `hr/payroll-inputs` 502, `scripts/check-declaration-column-drift.ts` 534. |
| backend `check:kebab-case` | | **exit 1 — not mine.** 3 violations, all `src/scripts/_*.mjs`. |
| database | none opened — this box needs none | |
| real AI provider | **never called** | |

## 8. Cross-territory findings, NOT fixed

1. **The streamed/buffered model split (§4).** Owner: `modules/ai/core/gateway/`. Affects all 19
   streaming routes; changes price per token, not just latency.
2. **The 30 s buffered client cap.** `lib/api-client.ts:14` still has `REQUEST_TIMEOUT_MS = 30_000`
   for every non-stream `authedFetch`; ticket 13 raised it to 180 s for streams only. Two in-scope
   buffered surfaces with a **1024-token** ceiling remain exposed: `kb.ask`
   (`features/wiki/components/knowledge-base-page.tsx`, `components/support/kb-ask-panel.tsx`) and
   `support.reply` (`features/support/inbox/ticket-ai-panel.tsx`, `ticket-detail-header.tsx`). Owner:
   `lib/api-client.ts` / platform, or those two surfaces converting to streams.
3. **`openapi.json` is stale and the OpenAPI gates are blind to it.** The tracked 7 MB contract carries
   **5** stream paths against **19** streaming routes in the source, so 6 pre-existing routes plus the
   8 added here are absent, and `check:openapi-coverage` still exits 0 at 1371/1371 because it checks
   the contract's internal consistency, not its currency. **Not regenerated here**: a 7 MB tracked
   artifact rewritten under eight concurrent agents is a collision, not a fix. Owner: whoever owns
   `pnpm openapi:generate` in this release.
4. **The first-purchase AI-credit wallet race** (`billing/core/ai-credits-reservation.service.ts`),
   already reported by S10, now has 8 more callers. Unchanged and unfixed.
