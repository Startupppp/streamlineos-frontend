# 13 — Frontend AI states: exhaustion, queueing, cancellation, retry, partial output, citations

**What to build:** Every AI surface in the UI handles its failure and boundary states explicitly, and none of them issues a duplicate request while doing so.

**Blocked by:** 11.

**Status:** done (2 boxes PARTIAL with a named residue)

- [ ] Credit exhaustion, queueing, streaming, cancellation, retry, partial output, citation loading, provider failure and permission revocation each render a defined state.
  PARTIAL. `classifyAiError` (`components/ai/ai-error-state.ts`) turns every AI failure into one of
  quota · denied · queued · unavailable · offline · cancelled · error; `AiActionResultBody`,
  `AiInlinePreview` and `AskOsChatView` render all seven plus loading/ready. Evidence:
  `npx jest components/ai --maxWorkers=2` → **3 suites / 24 tests pass**, including
  "separates the credit ledger's 402 from the breaker's 503 and the cap's 503" (3 distinct states).
  Reaches 20 `AiActionsMenu` consumers + `AiFieldPopoverAction` + `useAiInlineAction`/`useAiPopoverAction`
  + help-centre + build. **Residue: 3 surfaces still map only 402/403/other** —
  `features/mail/mail-inbox-summary-sheet.tsx` and `features/wiki/components/kb-page-ai-actions.tsx`
  (ticket 29's territory) and `features/feedbucket/components/feedbucket-ai-panel.tsx`
  (deliberate degrade-to-basic-ticket path, left alone).

- [x] No state transition issues a duplicate request — in particular, retry after a partial stream must not re-dispatch a paid call already in flight.
  Single-flight ref + monotonic run stamp in `AiActionsMenu`, `useAiInlineAction`, `useAiPopoverAction`,
  `useAskAI` and `KbArticleAiActions`. Bite-proven: deleting `if (inFlightRef.current) return` from the
  inline hook and the menu → **2 failed / 10 passed** (was 12 passed); deleting the busy guard from
  `useAskAI` → 1 more failure. All restored, `npx jest components/ai hooks/api/chat-ai-assistant-stream.test.tsx`
  → **4 suites / 29 tests pass**.

- [ ] Cancellation from the UI reaches the backend and stops the spend; an abandoned stream is not left running.
  PARTIAL. **Stream: done.** `useAskAI` aborts the previous controller, aborts on unmount, and returns
  `{status:"cancelled", text}` instead of throwing — proven by "stops spending when the component unmounts
  mid-stream" and "keeps the partial output when the user stops the stream". **Buffered: the seam exists,
  1 of 91 mutation families threaded.** `AiAction.run` now takes an `AbortSignal`, every shared surface
  creates/aborts a controller, and `hooks/api/kb/article-ai.ts` + `KbArticleAiActions` thread it to
  `apiClient.post(url, body, { signal })`. Audit: **0 of 91 AI `mutationFn`s took a signal at session
  start; 4 do now**. TanStack v5.90.12 gives mutations no signal (`MutationFunctionContext` is
  `{client, meta, mutationKey}`), so each remaining hook needs the signal in its variables.

- [x] AI usage metadata is returned and rendered on the surfaces that consume metered endpoints.
  Backend emits `aiUsage` from exactly 8 services (executive-brief, feedbucket, kb-article-ai, kb-ask,
  kb-page-ai, mail-ai, payroll-ai-explain, timesheets-ai); all 8 have a frontend type carrying it and a
  surface rendering `AiUsageChip` (directly, or via `AiDraftCard` / `AiActionResultBody` / `AiInlinePreview`).
  `AiActionResultBody` now reads `state.aiUsage ?? state.result.aiUsage`, so a `run` that puts usage only
  on the result no longer drops the chip.

- [x] Query hooks pass the abort signal in the correct argument position. A signal placed in the params slot type-checks and passes every gate while cancelling nothing.
  `pnpm -s check:query-signal` → exit 0, **1053 queryFn blocks across 418 files, 0 violations**
  (the gate resolves arguments by position and has a WRONG_SLOT fixture). AI-specific re-audit:
  **13 of 13 AI `queryFn`s destructure and forward `signal`, 0 in the params slot.**

- [x] Loading, empty, error, offline and permission-denied states are covered, and StrictMode double-invocation does not double-charge.
  Loading/idle/error/offline/denied all render through the shared body. StrictMode: "charges once under
  StrictMode's double-invoked lifecycle" asserts one dispatch under `<StrictMode>`. Repo audit: **10
  `useEffect` blocks fire a mutation and none of them calls a metered AI endpoint** (chat send-queue drain,
  huddle heartbeat, presence lock, markRead, joinHuddle, recordVisit, draft autosave, invite accept/join) —
  so there is no `useEffect`→AI-mutation path for StrictMode to double-charge.
