# 13 — Frontend AI states: exhaustion, queueing, cancellation, retry, partial output, citations

**What to build:** Every AI surface in the UI handles its failure and boundary states explicitly, and none of them issues a duplicate request while doing so.

**Blocked by:** 11.

**Status:** done (1 box still PARTIAL; S6 built the shared stream client the nine `/stream` routes had no client for)

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
  **S6 — the streaming half is no longer chat-only.** The backend exposes **11** AI text-stream
  routes and they share ONE wire format: `respondWithAiTextStream` pipes the provider stream through
  `pipeTextStreamToResponse`, so the body is raw UTF-8 text deltas under `text/plain; charset=utf-8` —
  no SSE frames, no `data:` prefix, no JSON envelope, no terminator. The only client that could read
  it was the loop buried inside `useAskAI`, hard-wired to `POST /chat`, so the **nine** routes ending
  in `/stream` plus `/public/kb/stream-ask` had no client at all and their surfaces buffered a whole
  POST from the user's seat.
  Built `hooks/api/ai-text-stream.ts`: `streamAiText({ path, body, onToken, signal })` (the transport,
  no React — for a surface like `AiActionsMenu` that already owns single-flight and hands `run` a
  signal) and `useAiTextStream()` (single-flight + `stop()` + unmount abort, for a surface that owns
  its own Stop button). It returns the same discriminated outcome, keeps partial text on cancel,
  raises the real HTTP status so a 402 stays renderable as credit exhaustion, and returns `headers`
  so `x-kb-sources` citations are reachable. It also flushes the final `decoder.decode()` the old chat
  loop omitted, which could drop a trailing multi-byte character.
  `useAskAI` now delegates to it rather than owning a second copy of the loop — proven faithful by the
  9 pre-existing tests (`chat-ai-assistant-abort` + `-stream`) passing unchanged.
  Wired one non-chat surface end to end so the client is delivered, not merely built:
  `useGenerateJobDescription` now streams `POST /ai/generate-jd/stream` (same body schema, same
  `hr:interviews:manage` permission as the buffered route) and the JD action on
  `app/(authenticated)/hr/recruitment/jobs/[jobId]/edit/page.tsx` passes `(signal, onToken)` through
  the `AiAction.run` seam, so `streaming`/`cancelled`-with-partial-text are reachable on a real page.
  Evidence: `jest --testPathPattern="ai-text-stream|chat-ai-assistant"` -> **3 suites, 19 tests, exit 0**;
  the new suite drives the REAL `lib/api-client` with a mocked `global.fetch` against a non-chat route.
  Bite proof, one-off: the signal moved back into `init` (the original defect) -> **3 failed / 16 passed
  / 19**; file restored byte-identical (sha256 `f5e75af9...4792`).
  PARTIAL remains: 8 of the 9 `/stream` routes still have no caller. Three blog routes have no frontend
  reference of any kind; three `crm-ai` routes and `/ai/crm/meeting-follow-up/stream` are in
  `features/crm/**`, excluded from release scope; `/ai/surveys/:id/summarize-responses/stream` and
  `/public/kb/stream-ask` need their surfaces changed and `/public/kb/stream-ask` renders on a public
  page this territory must not alter. Each is now a one-line adoption against `streamAiText`.
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
  **S6 — routed additions, audited against current source rather than the routing note.**
  Two of the three routed items were ALREADY FIXED and the note was stale: `components/ui/data-table.tsx`
  carries the paused-read fix (commit `a03bbe6f3`), and `features/chat/channel-sidebar.tsx` already has
  an `isError` -> `ErrorState` branch. The gap that remained was **`DataTableSkeleton`**, the standalone
  export callers return directly from their loading branch (the `T7` template does exactly this): no
  `aria-busy`, no connection check, and four per-header-cell `sr-only "Loading"` spans. It now carries
  the same three lines as `LoadingState`, so an offline read says "paused" instead of spinning for ever.
  3 new tests in `components/__tests__/paused-reads-and-truncated-lists.test.tsx`, including a bite proof
  that an online skeleton must not carry the offline copy -> **38 tests, exit 0**.
  **5 read-error branches added**, each on a surface where a failed read rendered the empty state and
  told the user there was no data: `features/hr/onboarding/onboarding-list.tsx`,
  `features/hr/helpdesk/my-tickets-tab.tsx`, `features/hr/benefits/dependents-manager.tsx`,
  `features/chat/shared-files-panel.tsx`, `features/build/settings/team-roster-section.tsx`.
  **5 empty states added**: `features/build/ticket-details/watcher-list.tsx` (also had no error branch),
  `features/hr/recruitment/jobs/share-job-dialog.tsx` (its error and empty were one "Could not load"
  sentence; now separated, with a retry),
  `features/build/project-create/steps/step-template.tsx`, `features/build/ticket-details/ticket-checklists.tsx`,
  and `features/hr/exit/progress-timeline.tsx` — the worst of them, which on a failed read **fabricated**
  a timeline from `PROGRESS_STEPS` showing "Submitted / current", presenting invented progress as fact.
  **The counted gate moved.** `components/__tests__/authenticated-surface-states.contract.test.ts` is
  the ratchet behind the "5 lack a read-error branch / 5 lack an empty state" routing note; another
  lane had already taken it to `missingError 1 / missingEmpty 8` (commit `5a97f6691`). The single
  remaining read-error gap in the whole authenticated app was **`/ai/executive-brief`** — this
  ticket's own territory. Its error and empty branches existed but were hand-rolled divs the analyzer
  cannot see, and the error branch had no retry at all. Both now use the canonical `ErrorState` /
  `EmptyState`. Measured before and after over 556 surfaces / 539 data surfaces:
  **missingError 1 -> 0** and **missingEmpty 8 -> 7**. The 7 that remain are named and all outside
  this territory: `/crm/import`, `/inventory/operations`, `/inventory/products/new` (excluded from
  release scope), `/hr/recruitment/sla`, `/notifications/policy`,
  `/settings/organization/structure`, `/surveys/new`.
  Gates: `type-check` exit 0 / 0 errors · `eslint` on all 17 changed files exit 0 / 0 findings ·
  `check:query-signal` exit 0 (1054 queryFn blocks, 420 files, 0 violations) · `check:empty-states`,
  `check:effect-fetches`, `check:cycles`, `check:over-300` (519/519), `check:colors` all exit 0 ·
  `jest --testPathPattern="features/(hr|build|chat)"` -> 37 suites / 234 tests exit 0.
