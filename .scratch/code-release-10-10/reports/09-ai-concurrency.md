# Ticket 09 — AI concurrency fail-closed · session S3 · 2026-09-02

**Outcome:** all 7 boxes closed. Four of the five pre-ticked boxes were true as written; **box 3 was only partly true**, and the audit found a live slot leak the reported fix did not cover. Fixed, tested, proven. No git run.

## Audit of the five ticked boxes (against source, not the report)

| Box | Verdict | Where |
|---|---|---|
| 1 · required constructor dep | **true** | `chat-assistant.service.ts:83`, `kb-rag.service.ts:48` — `private readonly concurrencyLimiter: AiConcurrencyLimiter,`, no `@Optional()`. `AiGatewayModule` provides + exports it; `AiModule` imports that module. |
| 2 · no truthiness guard / optional-chained release | **true** | 0 hits for `concurrencyLimiter?.`, `if (this.concurrencyLimiter)`, `&&`. All 7 gateway paths are `try { … } finally { release() }`. |
| 3 · all three exit paths release | **PARTLY FALSE** | see below |
| 4 · bounds + streaming | **true** | `MAX_HISTORY_MESSAGES = 40`, `MAX_OUTPUT_TOKENS = 4_096` (`chat-assistant.service.ts:50-51`); `DEFAULT_TOP_K = 6` from `SEARCH_POOL_K = 24` (`kb-rag-retrieval.service.ts:19-20`); KB stream `maxOutputTokens: 1024`. Both streaming entry points acquire before any provider call. |
| 5 · specs pass a limiter stub | **true** | 7 direct constructions + 6 testing-module registrations, all supplied. |

## P1 defect found and fixed — a slot leak the reported fix missed

Both services acquired the slot **before** work that can throw outside the `try`:

- `KbRagService.streamAnswer` — `ledger.reserve()` sat between `acquire()` and the `try`.
- `ChatAssistantService.processChat` — `ledger.reserve()`, `fetchContext()`, the user-turn history write and all tool building sat between them.

`AiCreditsReservationService.reserve` throws `InsufficientAiCreditsException` when a wallet is short (`ai-credits-reservation.service.ts:70`). So **an out-of-credit org leaked one slot per request.** Twenty rejected requests exhaust `AI_CONCURRENCY_CAP = 20` and hard-block the org: on Redis the counter's TTL is set only when it goes 0→1 and never refreshed, and on the no-Redis local fallback there is no TTL at all, so the block is permanent until restart. The chat assistant also leaked the credit reservation itself on those paths (self-healing via the 15-minute sweeper, but wrong).

Fix: the release closure is now taken immediately after `acquire()`, the reservation is wrapped in its own try/catch that releases the slot, and the whole setup region is guarded (`chat_setup_error`). Also replaced `void (stream.finishReason as Promise<string> | undefined)?.catch(…)` with `void Promise.resolve(stream.finishReason).catch(…)` — same behaviour for a rejected and an absent handle, one fewer `as` assertion (§6).

## Proofs (each command run, each number read)

- **Bite proof, box 7** — neutered every limiter stub to `release: jest.fn(() => { throw new Error("STUB_NEUTERED_RELEASE") })`, source untouched: `Tests: 13 failed, 22 passed` against a 35-passed baseline. The three slot-leak assertions all flipped; the two cap-exceeded tests correctly stayed green (`release` is never reached there). Stubs restored, SHA-256 verified.
- **New tests bite** — reverted both services to the pre-fix source: `4 failed, 37 passed`. Restored (SHA-256 verified): `41 passed`.
- **Fail-closed proof, box 1** — new test compiles a TestingModule with no limiter provider and asserts `.rejects.toThrow(/AiConcurrencyLimiter/)`. Passes; goes red the moment `@Optional()` is put back on the parameter.
- **Regression** — `nice -n 10 npx jest src/modules/ai --maxWorkers=2` → **41 suites passed, 328 passed / 21 skipped** (the skips are the out-of-scope CRM `describe.skip` block the ticket already records).
- **Typecheck** — `tsc --noEmit -p tsconfig.json`, exit 2, **0 errors under `src/modules/ai/`**.
- **Lint** — `npx eslint` on the four changed files → 0 errors, 1 pre-existing `no-empty` warning at `chat-assistant.service.ts:91`.

## Files changed

- `streamlineos-backend/src/modules/ai/core/services/chat-assistant.service.ts`
- `streamlineos-backend/src/modules/ai/core/services/kb-rag.service.ts`
- `streamlineos-backend/src/modules/ai/core/services/chat-assistant.service.spec.ts` (+3 tests, +1 helper)
- `streamlineos-backend/src/modules/ai/core/services/kb-rag.service.spec.ts` (+4 tests)
- `streamlineos-frontend/.scratch/code-release-10-10/issues/09-ai-concurrency-fail-closed.md` (boxes + evidence)

## For the orchestrator

- **Not mine, seen in transit.** Backend `tsc` ended at 15 errors, all in `src/modules/storage`, `src/modules/kb/wiki`, `src/modules/payroll/payout`, `src/modules/feedbucket`, `src/degradation` — an in-flight `UploadResult` refactor (`Property 'url' does not exist on type 'UploadResult'`, plus `Cannot find name 'isSensitiveKey'` in `storage.controller.ts`). The set changed between two runs 15 minutes apart, so that agent is still working. Earlier in the session a single `gdpr-storage-purge.service.ts` arity error appeared and cleared.
- **Residual gap, deliberately not fixed.** `AiGatewayService.embedQueryWithCredit` is the only paid provider call that takes no concurrency slot. Embeddings are short and cheap so this may be intended, but it is the one path the per-org cap does not cover. Flagging rather than widening scope.
