# 09 — Make the AI concurrency cap fail closed and land the bounds work

**What to build:** The per-organization AI concurrency cap was wired as an optional injection behind a truthiness guard, so an unresolved provider silently disabled the cap entirely — no error, no log, unbounded paid provider calls. The limiter must be a required dependency so the application fails at boot instead, and every exit path must return the slot it took.

**Blocked by:** None — can start immediately.

**Status:** verified against source, one further slot leak found and fixed, uncommitted — orchestrator owns the commit

- [x] The limiter is a required constructor dependency in both the chat assistant and the KB RAG service; an unresolved provider is a boot failure, not a silent bypass.
  Evidence: `chat-assistant.service.ts:83` and `kb-rag.service.ts:48` both declare `private readonly concurrencyLimiter: AiConcurrencyLimiter,` with no `@Optional()`; `grep -rn "@Optional()" src/modules/ai` returns 3 hits, none of them the limiter. New regression test `KbRagService — the concurrency limiter is a required dependency` compiles a TestingModule without the provider and asserts `.rejects.toThrow(/AiConcurrencyLimiter/)` — passes, and goes red when `@Optional()` is put back on the parameter.
- [x] The truthiness guards and optional-chained releases are gone.
  Evidence: `grep -rn "concurrencyLimiter?\.|if (this.concurrencyLimiter)|this.concurrencyLimiter &&" src/modules/ai` → 0 hits. Every gateway call site is `try { ... } finally { this.concurrencyLimiter.release(...) }`. Also replaced the one remaining optional-chained stream handle, `void (stream.finishReason as Promise<string> | undefined)?.catch(...)`, with `void Promise.resolve(stream.finishReason).catch(...)`, which removes an `as` assertion and behaves identically for both a rejected and an absent `finishReason`.
- [x] All three exit paths release the slot: success, client abort, and a synchronous setup throw. The setup-throw path in the RAG service was missing and leaked a slot per failure.
  Evidence: the narrow claim held — a synchronous `streamText` throw was released in both services. **The audit found the box was only partly true:** in both services the slot was acquired *before* `ledger.reserve()`, `fetchContext()` and the user-turn history write, all of which sit outside the `try`. `AiCreditsReservationService.reserve` throws `InsufficientAiCreditsException` when a wallet is short, so an out-of-credit org leaked one slot per request — 20 rejected requests exhaust `AI_CONCURRENCY_CAP` and hard-block the org (permanently on the no-Redis local path, which has no TTL). Fixed by taking the release closure before the reservation and wrapping the whole setup region; the chat assistant's reservation is now released on that path too (`chat_setup_error`). Proof: 4 new tests go red against the pre-fix source and green after (`nice -n 10 npx jest src/modules/ai/core/services/chat-assistant.service.spec.ts src/modules/ai/core/services/kb-rag.service.spec.ts --maxWorkers=2` → 4 failed / 37 passed pre-fix, 41 passed post-fix).
- [x] Prompt history, retrieved chunks and output tokens are bounded; streaming no longer bypasses the limiter.
  Evidence: `chat-assistant.service.ts:50-51` `MAX_HISTORY_MESSAGES = 40` / `MAX_OUTPUT_TOKENS = 4_096`, applied at `messages.slice(-MAX_HISTORY_MESSAGES)` and `maxOutputTokens: MAX_OUTPUT_TOKENS`; `kb-rag-retrieval.service.ts:19-20` `DEFAULT_TOP_K = 6` with `SEARCH_POOL_K = 24` and `pool.slice(0, DEFAULT_TOP_K)`; KB stream caps `maxOutputTokens: 1024`. Both streaming entry points (`ChatAssistantService.processChat`, `KbRagService.streamAnswer`) acquire before any provider call, and all seven `AiGatewayService` invoke paths acquire/release around the runner. Covered by the 3 bounds tests in `chat-assistant.service.spec.ts` (`maxOutputTokens: 4096`, last-40, at-or-below-cap).
- [x] Specs constructing these services directly pass a limiter stub; testing-module specs register the provider.
  Evidence: direct constructions at `chat-assistant.service.spec.ts:65/502/546/590`, `chat-assistant-breaker.spec.ts:65/186`, `ai-kb-blog-survey-tenant-isolation.spec.ts:93/148` all pass a limiter stub; testing modules at `kb-rag.service.spec.ts:120/297/371/417` and `ai-gateway-prd12-3.spec.ts:401/451` register `AiConcurrencyLimiter`. `nice -n 10 npx jest src/modules/ai --maxWorkers=2` → 41 suites passed, 328 passed / 21 skipped.
- [x] Verify the reported result against the diff rather than the report, then commit. A delegated fix can land inert.
  Evidence: audited against source, not the report. Four of the five ticked boxes were true as written; box 3 was only partly true and is now closed (see above). Backend `tsc --noEmit` exit 2 with **0 errors under `src/modules/ai/`** — the 15 remaining errors are a concurrent `UploadResult` refactor in storage/kb/payroll/feedbucket, not this ticket. `npx eslint` on the four changed files → 0 errors, 1 pre-existing `no-empty` warning at `chat-assistant.service.ts:91`. Commit deferred: the orchestrator owns git.
- [x] Confirm the slot-leak tests actually bite — neuter the stub, not the source, and check the test goes red.
  Evidence: neutered every limiter stub to `release: jest.fn(() => { throw new Error("STUB_NEUTERED_RELEASE"); })` in both spec files, leaving the source untouched → `Tests: 13 failed, 22 passed` (baseline 35 passed). The three slot-leak assertions all flipped: `releases the concurrency slot when streamText throws synchronously` (KB), `releases the concurrency slot in onFinish` and `releases the concurrency slot when streamText throws` (chat). The two cap-exceeded tests correctly stayed green, since `release` is never reached on that path. Stubs restored and SHA-256-verified against pre-mutation copies.

**Out of scope, recorded here so it is not lost:** `crm-copilot.service.phase2.spec.ts` carries 21 tests suppressed by six `describe.skip` blocks whose target methods all exist on the real services. These are suppressed coverage rather than environment-blocked skips, and §9's "zero silently skipped tests" would normally bite. They are CRM, which this release excludes — so they are logged as excluded, not fixed.


## Coverage added while verifying (S3, 2026-09-02)

New tests, all in `backend/src/modules/ai/core/services/`:

| Spec | Test | Red pre-fix? |
|---|---|---|
| `kb-rag.service.spec.ts` | limiter provider absent → module fails to wire | red when `@Optional()` is restored |
| `kb-rag.service.spec.ts` | credit reservation rejected → slot released | yes |
| `kb-rag.service.spec.ts` | `onFinish` releases the slot | no — closes a coverage gap |
| `kb-rag.service.spec.ts` | client abort (`finishReason` rejects) releases slot + reservation | no — closes a coverage gap |
| `chat-assistant.service.spec.ts` | credit reservation rejected → slot released | yes |
| `chat-assistant.service.spec.ts` | context load throws → slot + reservation released | yes |
| `chat-assistant.service.spec.ts` | user-turn history write throws → slot released | yes |

**Residual gap, not fixed (not a leak, a scope question):** `AiGatewayService.embedQueryWithCredit` is the only paid provider call that takes no concurrency slot. Embeddings are cheap and short, so this may be deliberate, but it is the one path where the per-org cap does not apply.
