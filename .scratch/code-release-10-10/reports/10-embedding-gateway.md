# Ticket 10 — Embedding through the gateway with credit · session S3 · 2026-09-02

**Outcome: all 6 boxes closed.** With the extended territory, the 7 direct-provider embedding call
sites are migrated, the missing cost ceilings exist, and `EmbeddingsService` no longer leaves the
gateway. No git run.

## `pnpm -s check:ai-charge` — green, and that green still does not mean what it looks like

`113 invocations scanned — all declare charge explicitly (1 allowlisted)`, exit 0. Self-test
`8 passed`. **The number did not move, because the gate cannot see embedding at all.** Its regex is
`\.(invokeStructured(?:WithImage)?(?:WithUsage)?|invokeText(?:WithUsage)?)\s*\(` — I ran it against a
string containing both `embedQueryWithCredit` and `embedBatchWithCredit` and it returns `null`.
**6 credited embedding call sites sit outside its coverage** (`kb-indexing:113`, `kb-search:36`,
`kb-attachment-indexing:27`, `support-ai-triage-data:119`, `support-ai-embeddings.helper:36`,
`kb-rag-retrieval:132`). Route the regex fix to ticket 35 — adding `embed(Query|Batch)WithCredit` to
the alternation makes it 119 and gives the embedding surface the same charge-declared guarantee.

## Part 1 — the seven call sites

`kb-search.service.ts` (×3), `kb-indexing.service.ts`, `kb-attachment-indexing.service.ts`,
`support-ai-embeddings.helper.ts`, `support-ai-triage-data.service.ts` now inject `AiGatewayService`.

**`kb-indexing.service.ts` — the serious one.** The per-chunk loop is gone. `embedWithResumption` now
partitions chunks into cached and pending, makes **one** `embedBatchWithCredit` call for all pending
chunks (one reservation, one concurrency slot, provider-side batches of 64), then writes checkpoints in
**one** batched multi-row upsert. That removes both violations: the unbounded paid fanout (§12.3) and
the per-row DB write inside a growing loop (§5.1) — `saveCheckpoint` was one `runInNewTenantTransaction`
per chunk. `KbIngestionCheckpointService.saveCheckpoints` replaces it; the old single-row method had no
callers left and was deleted.

**One deliberate behaviour change, flagged.** Resumption is now all-or-nothing within an embedding pass:
a provider failure mid-document previously kept checkpoints for chunks already embedded, so a retry paid
for fewer. It now writes nothing and refunds the whole reservation. I judged that the better trade — the
failed attempt costs the org zero and leaves no partial state, `chunkText` caps a document at 400 chunks
so a full retry is bounded at ~450 milli, and cross-attempt resumption (embed succeeded, a later stage
failed) still works and is covered by R2/R2b. R1 was rewritten to assert the new invariant rather than
deleted.

## Part 2 — the missing ceilings

`kb.search` 0.05 · `kb.indexing` 1 · `support.embedding` 0.05 · `support.kb-search` 0.05. Sized against
the real worst case: 400 chunks × ~375 tokens = 150k tokens ≈ **450 milli**, comfortably inside the
1-credit `kb.indexing` ceiling, so a normal document never takes an overage. Query embeds land on the
10-milli floor, so 50 milli gives 5× headroom instead of over-reserving a full credit per search.
Fractional entries are new here, so `getReserveEstimateMilli` now `Math.round`s — `0.07 * 1000` is
`70.00000000000001`, which would reach an integer ledger column.

## Part 3 — unrepresentable, not merely absent

`EmbeddingsService` is out of `AiGatewayModule.exports`, and I went further: the three un-metered
wrappers (`embedQuery`, `embedBatch`, `embedQueryDeduped`) had no production callers left and are
deleted, along with the now-unused `AiUsageService` dependency and the dedupe map. The class is 52 lines
exposing `embedQueryRaw`, `embedBatchRaw`, `isConfigured`, `toVectorLiteral`. A test pins that exact
public surface, so re-adding an un-metered entry point fails a test rather than merely passing review.

## Proofs (each command run, each number read)

- `nice -n 10 npx jest src/modules/ai --maxWorkers=2` → **49 suites passed, 416 passed / 21 skipped**.
- `nice -n 10 npx jest src/modules/kb src/modules/support --maxWorkers=2` → **122 suites passed, 848 passed, 0 failed**.
- `nice -n 10 npx jest src/modules/billing/core/ai-credits --maxWorkers=2` → **5 suites / 42 passed**.
- **Bite C — batching.** Reverted `embedWithResumption` to one gateway call per chunk: `2 failed, 15 passed`
  across the checkpoint + s10 suites. `R1b: the gateway is called once, not once per chunk` and `R3` flipped;
  the s10 attachment test correctly stayed green (different service, not neutered). Restored, SHA-256 verified.
- **Bite D — credit reservation.** Removed the reservation from `runBatch`: `4 failed, 35 passed`. Named
  failures: `reserves ONCE for the whole batch, not once per text` · `settles on the summed actual tokens of
  the batch, not the per-call floor` · `never calls the provider when the wallet is short` · `releases the
  reservation when the provider throws mid-batch`. Restored, SHA-256 verified.
- Earlier bites still hold: removing the single-embed concurrency wrapper → 3 failed / 7 passed; moving
  `reserve()` after the provider call → 4 failed / 6 passed.
- **Typecheck** — `tsc --noEmit -p tsconfig.json`: **4 errors, all in `src/modules/goals/goals-deleted-read-exclusion.spec.ts`**, zero under `ai/`, `kb/` or `support/`.
- **Lint** — `npx eslint` on all 16 changed source files → exit 0, no output.
- **`pnpm -s check:file-sizes`** — 2 offenders, neither mine (`gdpr-subject-erasure.service.ts` 630, `storage.service.ts` 520).

## Files changed

**Gateway (`modules/ai/`)** — `gateway/ai-gateway-embed.helper.ts` (single + batch paths share reserve/settle/release),
`gateway/ai-gateway.service.ts` (+`embedBatchWithCredit`), `gateway/ai-gateway.types.ts` (+`EmbedBatch*`),
`gateway/ai-gateway.module.ts` (export removed), `billing/ai-cost-catalog.ts` (4 ceilings + rounding),
`providers/embeddings.service.ts` (reduced to raw primitives), `services/kb-rag-retrieval.service.ts`,
`gateway/ai-gateway.service.spec.ts` (+8 batch tests), `providers/embeddings.service.spec.ts` (rewritten, 7 tests).

**KB (`modules/kb/retrieval/`)** — `kb-indexing.service.ts`, `kb-attachment-indexing.service.ts`,
`kb-search.service.ts`, `kb-ingestion-checkpoint.service.ts`, plus 12 specs re-shaped to the gateway mock
(`kb-checkpoint-resumption.spec.ts` rewritten to batch semantics, +2 tests; `kb-s10-fixes.spec.ts` retargeted).

**Support (`modules/support/core/`)** — `support-ai-embeddings.helper.ts`, `support-ai-triage-data.service.ts`,
`support-ai-triage-analysis.service.ts`, `support-ai.service.spec.ts`, `support-ai-tenant-isolation.spec.ts`,
`support-ai-triage-charge.spec.ts`.

**Ticket** — `.scratch/code-release-10-10/issues/10-embedding-through-gateway-with-credit.md`.

I touched nothing streaming-shaped: `kb-rag.service.ts` and `chat-assistant.service.ts` were read but never
edited, and ticket 11's work is visibly live in both.

## For the orchestrator

- **Two files I had to touch that were not in the extended list**, both forced by part 3 and both mechanical:
  `support-ai-triage-analysis.service.ts` injected `EmbeddingsService` purely for `isConfigured()` probes, so it
  would not have booted once the export was removed (3 lines: dependency dropped, probes routed to
  `aiGateway.isEmbeddingConfigured()`); and `support-ai-triage-charge.spec.ts`, which constructs that service
  positionally and needed the dropped argument removed.
- **P2 denial-of-wallet left open as instructed.** `ai:public-kb-ask` is keyed by client IP while the spender is
  the `org` in the body. Reservation now bounds the drain at the org's balance and makes it visible in
  `ai_usage_logs`; the per-org ceiling needs a tier constant in `common/ratelimit/` and a product number.
- **Pre-existing, not mine, worth a ticket:** `chunkText` (`kb-chunk-utils.ts`) silently truncates at
  `maxChunks = 400`. A document longer than ~600k characters is indexed in part with no error and no signal —
  the brief's "never solve growing work with silent truncation" rule, in the retrieval path. I did not change it;
  it is load-bearing for the ceiling arithmetic above, so raising the cap means revisiting `kb.indexing`.
- **Not mine, seen in transit:** `tsc` ended on 4 errors in `src/modules/goals/goals-deleted-read-exclusion.spec.ts`.
  Over this session the red set moved through `UploadResult` (storage/kb-wiki/payroll), `jwt-keyring`, `org-purge` +
  `support-ticket-erasure`, `hrHeadcountNamespace`, and a `kb-page-comments` `.limit()` — all other lanes, all
  transient. None ever landed under `ai/`.
