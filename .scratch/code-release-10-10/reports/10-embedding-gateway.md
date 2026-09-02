# Ticket 10 — Embedding through the gateway with credit · session S3 · 2026-09-02

**Outcome:** 4 of 6 boxes closed. Boxes 1 and 2 are blocked on 7 call sites in 5 files **outside S3's
territory** — reported, not edited. Ticket 09's residual gap (embedding takes no concurrency slot)
is closed, and two further defects in the same method were found and fixed. No git run.

## `pnpm -s check:ai-charge`

`113 invocations scanned — all declare charge explicitly (1 allowlisted)`, exit 0.
`check:ai-charge:self-test` → `8 passed (113 invocations scanned)`, exit 0.
**Note:** the gate's regex only matches `invokeStructured*` / `invokeText*`. It does not see
`embedQueryWithCredit`, and it cannot see a direct `EmbeddingsService` call at all — which is why
the whole embedding surface below was invisible to it.

## Fixed — `AiGatewayService.embedQueryWithCredit` (3 defects)

1. **P2, handed over from ticket 09 — no concurrency slot.** It was the only paid provider call the
   per-org cap did not cover. Now `acquire()` → `try { … } finally { release() }` around the whole
   method, returning `concurrency_exceeded` when the cap is hit. The slot is taken *outside* the
   credit reservation, so the ticket-09 leak shape (reserve throwing between acquire and try) cannot
   reappear — there is no code between them.
2. **P2 — a settlement failure refunded a paid embedding and failed the caller.** The old body wrapped
   provider call *and* `ledger.settle` in one `try`; a throwing settle hit the catch, released the
   reservation (full refund for work already paid to the provider) and returned `provider_unavailable`
   even though the vector existed. Settlement now logs and continues, matching `AiGatewayCreditHelper`.
3. **P3 — charged embeddings reported 0 credits.** Usage was tracked inside `EmbeddingsService` with no
   `creditsMilli`, so `ai_usage_logs.creditsMilli` was 0 while the wallet was really debited. That
   column drives the org-facing usage API (`ai-credits-usage.service.ts` → `milliToCredits`). The
   gateway now calls a new non-tracking `EmbeddingsService.embedQueryRaw` and writes its own usage row
   with the settled milli-credits, latency, correlation id and outcome.

Extracted to `ai-gateway-embed.helper.ts` (the established `*-credit.helper` / `*-runner.helper`
pattern) so `ai-gateway.service.ts` stays at 261 lines.

## Proofs (each command run, each number read)

- **Regression** — `nice -n 10 npx jest src/modules/ai --maxWorkers=2` → **41 suites passed, 338 passed /
  21 skipped** (was 328 before; +10 new tests. The 21 skips are the known out-of-scope CRM `describe.skip`).
- **Bite proof A** — removed the acquire/release wrapper, source otherwise untouched: **3 failed / 7 passed**
  (the three concurrency assertions flipped; the seven credit assertions correctly stayed green). Restored, SHA-256 verified.
- **Bite proof B** — moved `reserve()` after the provider call and made settle rethrow: **4 failed / 6 passed**
  (reserve-before-provider, no-provider-on-short-wallet, release-on-provider-failure, settle-failure-is-not-a-refund
  all flipped; the three concurrency assertions correctly stayed green). Restored, SHA-256 verified.
- **Token metering, box 3** — new test: a 1,000-token embedding settles **10** milli, a 10,000-token embedding
  settles **30** milli, against a **1,000** milli `AI_FEATURE_COSTS` ceiling. `AI_FEATURE_COSTS` has exactly one
  consumer (`getReserveEstimateMilli`) and all 4 of its call sites are `ledger.reserve`.
- **Ledger, boxes 4 + 5** — `nice -n 10 npx jest src/modules/billing/core/ai-credits --maxWorkers=2` →
  **5 suites / 42 passed**, covering under-run refund, overage debit, idempotent settle, idempotent release,
  `ConflictException` on releasing a SETTLED reservation, and the expiry sweep.
- **Box 6** — 0 permission/role-table writes under `src/modules/ai`; 0 imports of `modules/ai` from
  `modules/rbac`, `modules/auth`, `common/auth`. Every non-`@Public` AI route carries `@RequirePermission`
  (12 controllers). `ToolAccessService` reads `AccessService.resolveUserPermissions`, never the model.
- **Frontend half of box 1** — no provider SDK in `package.json` (`openai`, `ai`, `@ai-sdk/*`, `@langchain/*`,
  `@google/generative-ai`, `@anthropic-ai/*` all absent); 0 grep hits for `api.openai` / `generativelanguage` /
  `openrouter` in `.ts`/`.tsx` outside marketing copy.
- **Typecheck** — `tsc --noEmit -p tsconfig.json`, exit 2, **5 errors, 0 under `src/modules/ai/`**.
- **Lint** — `npx eslint` on all 5 changed files → 0 errors, 0 warnings.
- **`pnpm -s check:file-sizes`** — 2 offenders, neither mine (`gdpr-subject-erasure.service.ts` 619,
  `storage.service.ts` 521). Spec files are exempt; my 592-line spec is not flagged.

## Files changed

- `streamlineos-backend/src/modules/ai/core/gateway/ai-gateway-embed.helper.ts` **(new, 145 lines)**
- `streamlineos-backend/src/modules/ai/core/gateway/ai-gateway.service.ts`
- `streamlineos-backend/src/modules/ai/core/providers/embeddings.service.ts` (+`embedQueryRaw`)
- `streamlineos-backend/src/modules/ai/core/services/kb-rag-retrieval.service.ts` (maps the new `concurrency_exceeded` kind)
- `streamlineos-backend/src/modules/ai/core/gateway/ai-gateway.service.spec.ts` (+10 tests, +1 factory)
- `streamlineos-frontend/.scratch/code-release-10-10/issues/10-embedding-through-gateway-with-credit.md`

I touched nothing that looks like streaming. `kb-rag.service.ts` and `chat-assistant.service.ts` were
read but **not** edited — ticket 11's lane is visibly mid-flight in `kb-rag.service.ts` (a breaker,
`appOverheadStart` and `ttftMs` appeared there during my session).

## For the orchestrator — needs an owner outside S3

**P1 · 7 direct-provider embedding call sites, no credit, no slot, no cap.** These are the reason boxes 1
and 2 cannot be ticked. All are outside `backend/src/modules/ai/**`; SESSIONS.md assigns
`modules/kb/retrieval/**` and `modules/support/core/**` to nobody.

| File | Line | Feature string | Shape |
|---|---|---|---|
| `kb/retrieval/kb-search.service.ts` | 143, 251, 298 | `kb.search` | one embed per authenticated search |
| `kb/retrieval/kb-indexing.service.ts` | 107 | `kb.indexing` | **one embed per chunk, in a loop, unbounded** |
| `kb/retrieval/kb-attachment-indexing.service.ts` | 32 | `kb.indexing` | `embedBatch` per 64-chunk batch |
| `support/core/support-ai-embeddings.helper.ts` | 36 | `support.embedding` | one embed per triage/dedupe run |
| `support/core/support-ai-triage-data.service.ts` | 119 | `support.kb-search` | one embed per KB search for a ticket |

The migration is mechanical — swap the injected `EmbeddingsService` for `AiGatewayService` and call
`embedQueryWithCredit({ text, orgId, feature, charge: true })`, which now does reservation, settlement,
usage metering and the concurrency slot. Two things must land with it:

1. **`AI_FEATURE_COSTS` has no entry for `kb.search`, `kb.indexing`, `support.embedding` or
   `support.kb-search`.** They would fall to the 1-credit default — 1,000 milli reserved *per chunk* for
   indexing. Add per-feature ceilings (`ai-cost-catalog.ts` is in S3's territory; say the word and I will).
2. **`EmbeddingsService` should stop being exported from `AiGatewayModule`** once the last direct caller is
   gone, and `embedQuery` / `embedBatch` / `embedQueryDeduped` deleted, so the unsafe state becomes
   unrepresentable rather than merely discouraged. `embedQueryDeduped` is *already* dead (only spec mocks
   reference it) — knip proof needed before deletion.

**P2 · denial-of-wallet on `POST /public/kb/ask` and `/public/kb/stream-ask`.** The rate limit
(`ai:public-kb-ask`, 10/min) is keyed by **client IP** in `RateLimitGuard`, while the *spender* is the
`org` in the request body. Nothing bounds per-org spend from anonymous traffic; distributed callers can
drain a named tenant's wallet. Credit reservation now makes the drain visible and caps it at the org's
balance, and `hasPublishedPublicArticles` still short-circuits orgs with no eligible content — but an org
*with* content has no per-org ceiling. The fix needs a new tier constant in
`src/common/ratelimit/rate-limit.service.ts` (outside S3) plus a product decision on the number, so I
did not pick one.

**Not mine, seen in transit.** Backend `tsc` ended at 5 errors, all in `src/modules/organization/core/org-purge.service.ts`
and `src/modules/support/core/support-ticket-erasure.ts` — S4's GDPR erasure lane. Fifteen minutes earlier
the same run showed 3 different errors in `src/common/auth/jwt-keyring.service.ts` and a cron spec, and
before that the 15 `UploadResult` errors ticket 09 reported. The set is churning; none of it is AI.
