# 13 — Frontend AI states: exhaustion, queueing, cancellation, retry, partial output, citations

**What to build:** Every AI surface in the UI handles its failure and boundary states explicitly, and none of them issues a duplicate request while doing so.

**Blocked by:** 11.

**Status:** done (1 box PARTIAL with a counted residue)

- [x] Credit exhaustion, queueing, streaming, cancellation, retry, partial output, citation loading, provider failure and permission revocation each render a defined state.
  All nine enumerated and audited. Four had **no** defined state: **streaming** (only a `loading`
  skeleton), **retry** (re-entered `loading` indistinguishably from a first load), **partial output**
  (`cancelled` carried no text — stopping threw the tokens away) and **citation loading** (nothing).
  Built: `{status:"streaming"; text}` + `AiStreamingOutput`, `{status:"loading"; attempt}` →
  "Retrying — attempt N", `{status:"cancelled"; text?}` + `AiCancelledOutput`, and
  `AiCitationChipsSkeleton` + `AiDraftCard citationsPending`. `AiAction.run` gained an optional
  `onToken` so streaming/partial output are reachable through the existing seam.
  Separately, **11 AI surfaces in this territory rendered none of the nine** — 7 build AI cards,
  `ai-chat-panel`, and 3 `features/accounting/ai/**` panels flattened every failure to one red
  sentence plus a Retry that cannot help; all now render through the new `AiFailureBody`.
  Evidence: `npx jest --runInBand --testPathPattern="components/ai"` → **6 suites / 78 tests pass**,
  including "renders a distinguishable surface per status" and the 9-boundary matrix;
  `features/build/ai/ai-card-states.test.tsx` proves a 402 on `RisksCard` renders the top-up link and
  **no** Retry. Residue unchanged and out of territory: `features/mail/mail-inbox-summary-sheet.tsx`
  and `features/wiki/components/kb-page-ai-actions.tsx` (ticket 29) still map only 402/403/other;
  `features/feedbucket/components/feedbucket-ai-panel.tsx` is a deliberate degrade path.

- [x] No state transition issues a duplicate request — in particular, retry after a partial stream must not re-dispatch a paid call already in flight.
  Single-flight ref + monotonic run stamp in `AiActionsMenu`, `useAiInlineAction`, `useAiPopoverAction`,
  `useAskAI` and `KbArticleAiActions`; still asserted after the state-shape change. `ProjectAiMenu`
  hand-rolled its own run with no guard and now uses `useAiPopoverAction`. Evidence:
  `ai-single-flight.test.tsx` + `ai-actions-menu-dispatch.test.tsx` → 15 tests, including
  "charges once under StrictMode's double-invoked lifecycle" and
  "counts a retry as a second attempt rather than a fresh first load".

- [ ] Cancellation from the UI reaches the backend and stops the spend; an abandoned stream is not left running.
  PARTIAL. **Stream: closed, and it was broken.** `useAskAI` put its controller's signal in
  `authedFetch`'s `init`; `authedFetch` does `fetch(url, {...init, headers, signal: combinedSignal})`,
  so `init.signal` was overwritten by a timeout-only signal built from the FOURTH argument the hook
  never passed. `stop()` and the unmount teardown were both no-ops — the stream ran on and kept
  spending. The old test passed because it mocked `authedFetch` and read `init.signal`. Fixed
  (signal in the signal slot) and proven against the REAL `lib/api-client` with a mocked `global.fetch`:
  `hooks/api/chat-ai-assistant-abort.test.tsx` → 4 tests. Bite: reverting the one-line fix →
  **3 failed / 1 passed**.
  **Buffered: the seam is proven end-to-end, 35 of 90 AI mutation families threaded (was 4).**
  `components/ai/ai-abort-reaches-request.test.tsx` drives `AiActionsMenu` → `run(signal)` → real
  `apiClient.post` → real `authedFetch` → mocked `fetch` and asserts the outgoing signal aborts on
  Stop, on unmount and on Reject. `hooks/api/ai-mutation-signal.test.tsx` proves 6 hook families put
  the signal in the request and never serialise it into the body.
  PARTIAL: 55 AI `mutationFn`s still take no signal, so their surfaces' Stop button ends the UI but
  not the spend. All sit outside this territory: `support/ai.ts` (11), `ai.ts` (10 non-CRM/HR),
  `kb/page-ai.ts` + `kb/ask.ts` (5), `meetings-ai.ts` (4), `mail.ts` (3), `accounting-ai.ts` (3),
  `inv-ai-explain.ts` (3), `inventory/ai.ts` (2), `feedbucket` (2), `payroll/use-explain-payslip.ts` (1),
  `ai-summaries.ts` (1) — plus 7 that are not metered generation (`ai-credits` 3, chat conversation
  CRUD 3, `ai-confirm-action` 1).
  BLOCKED (other territory, `lib/api-client.ts`): `makeRequestSignal` returns the timeout signal alone
  when `AbortSignal.any` is missing, silently dropping the caller's signal — on any browser without it
  every cancel in the app is a no-op. And `authedFetch` overwrites `init.signal`, so the trap that
  caused this box's defect is still armed for the next caller.

- [x] AI usage metadata is returned and rendered on the surfaces that consume metered endpoints.
  Unchanged from session S3: backend emits `aiUsage` from exactly 8 services; all 8 have a frontend
  type carrying it and a surface rendering `AiUsageChip`. `AiActionResultBody` reads
  `state.aiUsage ?? state.result.aiUsage`.

- [x] Query hooks pass the abort signal in the correct argument position. A signal placed in the params slot type-checks and passes every gate while cancelling nothing.
  `pnpm -s check:query-signal` → exit 0, **1054 queryFn blocks across 419 files, 0 violations**.
  The mutation-side equivalent of the trap is now covered by `hooks/api/ai-mutation-signal.test.tsx`
  ("never serialises the AbortSignal into the request body").

- [x] Loading, empty, error, offline and permission-denied states are covered, and StrictMode double-invocation does not double-charge.
  All render through the shared body; `AskOsChatView`'s duplicate 7-branch ladder was deleted in favour
  of `AiActionResultBody`. StrictMode assertion still green.
