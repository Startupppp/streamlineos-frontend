# Ticket 13 — Frontend AI states · session S3 · 2026-09-02

**Outcome:** 4 of 6 boxes closed, 2 PARTIAL with exact residues. Four P1 defects found and fixed in the
shared AI machinery, each bite-proven. The `/public/kb/stream-ask` orphan is **recorded as deliberately
unconsumed with a removal recommendation** — see the last section; the reason is stronger than "no stream
client exists". No git run. FE = `streamlineos-frontend/frontend`.

## The three 503-vs-402 states ticket 11 made reachable were all rendering the same

Ticket 11 stopped the breaker's 503, the concurrency cap's 503 and the ledger's 402 flattening to 500.
On the frontend **all three still landed on one of two states.** Every AI surface hand-rolled the same
three-branch ladder — `402 → quota`, `403 → denied`, `else → error` — repeated verbatim in
`ai-actions-menu.tsx`, `use-ai-inline-action.ts`, `use-ai-popover-action.ts`, `project-ai-menu.tsx`,
`kb-article-ai-actions.tsx`, `kb-page-ai-actions.tsx` and `mail-inbox-summary-sheet.tsx`. A tripped
breaker, a full queue, an offline browser and a user cancellation were indistinguishable, all rendered as
a grey sentence with a Retry button.

`components/ai/ai-error-state.ts::classifyAiError` is now the single decision, returning
**quota · denied · queued · unavailable · offline · cancelled · error**. Two classifications are new
correctness, not new labels:

- **A plan gate was being sold as exhausted credits.** `ModuleDisabledException` is `402` with
  `code: "MODULE_NOT_ENABLED"`. Every surface matched on the status alone, so a module the org has not
  bought rendered "AI credits exhausted — Top up AI credits", pointing the user at a purchase that cannot
  fix it. It is now `denied`.
- **A revoked permission rendered as a server error.** `useAuthorizedMutation` throws a plain
  `Error("Missing permission: <key>")` when the client gate refuses — not an `ApiError`, so no
  status-based branch ever matched it. It is now `denied`.

The one thing the classifier cannot do cleanly: **the breaker and the concurrency cap both answer 503
with no `code`**, so `"too many concurrent"` in the message is the only separator. It is one constant in
one file with the reason recorded beside it. **Backend ask (ticket 11/10 or whoever owns
`modules/ai/core/services/`): give those two `ServiceUnavailableException`s distinct codes** — e.g.
`AI_PROVIDER_UNAVAILABLE` and `AI_CONCURRENCY_LIMIT` — and the message match dies.

## P1 defects found and fixed

1. **Nothing stopped a second paid dispatch.** `AiActionsMenu.runAction`, `useAiInlineAction.execute` and
   `useAiPopoverAction.execute` had no in-flight guard and no run stamp. `retry()` is handed to callers on
   every inline session **including the `loading` one**, so a caller could re-dispatch a paid call already
   in flight; two rapid menu selections raced and the *older* answer won, because the last `setState` to
   land was the last to resolve. All three now hold a single-flight ref and a monotonic stamp.
2. **An abandoned AI call was left running and still spending.** Closing the popover/sheet, rejecting an
   inline draft or unmounting the surface only dropped the UI. There was no `AbortController` anywhere in
   `components/ai/`. `AiAction.run` now takes an `AbortSignal` (a zero-arg `run` stays assignable, so no
   call site churned), and every shared surface aborts on close, reject, cancel, new run and unmount.
3. **`useAskAI` orphaned its own stream.** `sendMessage` overwrote `abortRef.current` without aborting the
   previous controller, so a second send left the first stream running against a `stop()` that could no
   longer reach it, and there was no unmount teardown at all. The panel guarded on `isStreaming`, but that
   flag only flips *inside* `sendMessage` — the `await createConversation.mutateAsync(...)` before it is a
   window in which two Enters both pass the guard and dispatch two streams. Fixed in the hook (a busy
   result) and in `global-ask-os.tsx` (a synchronous `sendingRef` covering the create+stream window).
4. **Stopping a stream threw its output away and reported an error.** `controller.abort()` rejects
   `reader.read()` from inside the read loop — outside `authedFetch`'s try/catch, so the raw `AbortError`
   propagated, the panel ran `setErrorMessage(getErrorMessage(error))` **and** `setDraft(null)`. Pressing
   Stop therefore deleted every token already received and showed a red error for a thing the user chose
   to do. `sendMessage` now returns `{status:"completed"|"cancelled"|"busy", text}`; a cancel keeps the
   partial answer and persists it into the conversation, and `cancelled` renders as its own state.

Also: `AiActionResultBody` read `usage={state.aiUsage}` only, so a `run` that put usage on the result
rather than the state silently dropped the chip — now `state.aiUsage ?? state.result.aiUsage`.

## Bite proofs (each neutering run, each number read)

| Guard removed | Result |
|---|---|
| `if (inFlightRef.current) return` from `useAiInlineAction` + `AiActionsMenu` | **2 failed / 10 passed** (12) → restored |
| `runSeqRef.current += 1` from the cancel path (stale settle no longer orphaned) | **1 failed / 7 passed** (8) → restored |
| the 503 message split (breaker and cap collapse to one state) | **1 failed** → restored |
| `if (inFlightRef.current) return {status:"busy"}` from `useAskAI` | **1 failed** → restored |

Restored state: `npx jest components/ai hooks/api/chat-ai-assistant-stream.test.tsx --maxWorkers=2` →
**4 suites / 29 tests pass.**

## Audits that produced numbers, not opinions

- **Abort signal in the correct argument position.** `pnpm -s check:query-signal` → exit 0,
  **1053 queryFn blocks across 418 files, 0 violations**. The gate already resolves arguments by position
  (its `WRONG_SLOT` self-test fixture is exactly `apiClient.get(url, signal)`), so the params-slot trap is
  genuinely closed for queries. AI-specific re-audit over 23 AI hook files: **13 of 13 AI `queryFn`s
  destructure and forward `signal`; 0 in the params slot.**
- **Mutations cannot be cancelled at all.** **0 of 91 AI `mutationFn`s** took a signal at session start.
  TanStack v5.90.12 gives mutations no signal — `MutationFunctionContext` is `{client, meta, mutationKey}`
  (`@tanstack/query-core@5.90.12/build/modern/hydration-DksKBgQq.d.ts:1191`) — so the gate's blind spot
  here is not a gate bug, it is a missing capability. 4 now thread one (`hooks/api/kb/article-ai.ts`).
- **StrictMode cannot double-charge an AI call.** 10 `useEffect` blocks in the repo fire a mutation;
  **none of them calls a metered AI endpoint** (chat offline-queue drain, huddle heartbeat, presence lock,
  markRead, joinHuddle, recordVisit, support draft autosave, invitation accept/join). The remaining
  StrictMode risk was a double *user* dispatch, which the single-flight refs close — asserted under
  `<StrictMode>` by "charges once under StrictMode's double-invoked lifecycle".
- **`aiUsage` coverage is symmetric.** The backend emits `aiUsage` from exactly **8** services;
  all 8 have a frontend type carrying it and a surface rendering `AiUsageChip`. No metered response
  arrives with usage that the UI drops.

## The `/public/kb/stream-ask` orphan — recorded as deliberately unconsumed, and recommended for removal

**Decision: do not wire it. Remove the whole public KB ask surface, backend and frontend, unless a product
owner claims it.** The reason is stronger than ticket 11's finding:

`stream-ask`'s only plausible consumer is `KbAskPanel mode="public"` in
`components/support/kb-ask-panel.tsx`, and **that branch is itself unreachable.** `KbAskPanel` is
instantiated at exactly two call sites, `app/(authenticated)/ask/page.tsx:13` and
`features/help-centre/components/kb-manager-content.tsx:349`, and **both pass `mode="authed"`** with no
prop spread. So `PublicAskPanel` and `usePublicAskSupportKb` are dead too — which means the *buffered*
sibling `POST /public/kb/ask` has no caller either. The public help centre
(`app/(public)/help/[orgId]/**`, 2 files) never imports an ask panel; it renders articles only.

Wiring a consumer requires adding the panel to `app/(public)/help/[orgId]/page.tsx`, which is outside this
ticket's territory (`Do NOT edit FE/app/**`), and would be inventing a product surface rather than serving
one. Per PRD §"remove deferred capability after dependency proof", the removal set is:
backend `KbRagController.streamAsk` + `KbRagService.streamAnswer` (keep `answerQuestion` only if the
buffered public route is kept), frontend `usePublicAskSupportKb` and the `mode: "public"` half of
`KbAskPanel`. **This is a judgement for the orchestrator, not a change I made** — deleting across a repo
boundary on a reachability argument needs knip + a real build (brief rule 10), and it deletes ticket 11's
own work.

## Gates (run, output read)

| Gate | Result |
|---|---|
| `tsc --noEmit` (8 GB heap) | **exit 0, 0 errors** — the 22 stale `.next/types/validator.ts` errors have cleared repo-wide |
| `npx jest components/ai components/assistant features/help-centre features/build features/chat` | **25 suites / 168 tests pass** |
| `npx jest hooks/api` | **44 suites / 476 tests pass** |
| `pnpm -s check:query-signal` | exit 0 — 1053 queryFn blocks / 418 files, 0 violations |
| `pnpm -s check:effect-fetches` | exit 0 — 5161 files |
| `pnpm -s check:empty-states` | exit 0 — 3775 files |
| `pnpm -s check:colors` | exit 0 — 5161 files |
| `pnpm -s check:icon-labels` | exit 0 — 3775 files |
| `pnpm -s check:over-300` | exit 0 — 511 of 5146 (baseline 519) |
| `npx eslint` on all changed files | **0 errors, 8 warnings** — 7 are the file's own pre-existing `runRef.current = run` during render (reproduced on a 12-line probe outside my files), 1 is the same idiom on a ref I added |

## Files changed (absolute)

New:
- `.../frontend/components/ai/ai-error-state.ts` · `ai-state-notices.tsx`
- `.../frontend/components/ai/ai-error-state.test.ts` (11) · `ai-single-flight.test.tsx` (8) ·
  `ai-actions-menu-dispatch.test.tsx` (5)
- `.../frontend/hooks/api/chat-ai-assistant-stream.test.tsx` (5)

Edited:
- `.../frontend/components/ai/`: `ai-actions-menu.tsx`, `ai-action-result-body.tsx`, `ai-inline-preview.tsx`,
  `use-ai-inline-action.ts`, `use-ai-popover-action.ts`, `ai-field-popover-action.tsx`, `index.ts`
- `.../frontend/hooks/api/chat-ai-assistant.ts` · `hooks/api/kb/article-ai.ts`
- `.../frontend/components/assistant/global-ask-os.tsx` · `ask-os-chat-view.tsx`
- `.../frontend/features/help-centre/components/kb-article-ai-actions.tsx`
- `.../frontend/features/build/ai/project-ai-menu.tsx`
- `.../.scratch/code-release-10-10/issues/13-frontend-ai-states.md`

`AiInlineSession` changed shape (`status`/`result`/`errorMessage`/`deniedReason` → one `state`, plus
`cancel`). Verified first that all 6 consumers in `features/build/**` treat it opaquely — they store it,
pass it to `AiInlinePreview` and call `reject()`; none reads a field. `tsc` confirms.

## Other agents' territory — found in transit, not fixed

- **Ticket 29 (`features/{calendar,mail,inbox,knowledge}`).** `features/mail/mail-inbox-summary-sheet.tsx`
  and `features/wiki/components/kb-page-ai-actions.tsx` still hand-roll the 402/403/other ladder. One line
  each: replace the branch with `classifyAiError(err)` and render the four new notices, exactly as
  `features/help-centre/components/kb-article-ai-actions.tsx` now does. `features/calendar/meeting-prep-panel.tsx`
  and `meeting-follow-up-panel.tsx` render `AiPermissionDenied` but have no failure classification at all.
- **P2, feedbucket owner.** `features/feedbucket/components/feedbucket-ai-panel.tsx:24` has
  `AI_UNAVAILABLE_STATUSES = new Set([400, 402, 503])`. A **400** — a validation error in our own request —
  silently falls back to creating a basic ticket toasted as "AI unavailable", hiding a client bug behind a
  provider excuse. 402 and 503 belong there; 400 does not.
- **P2, backend `modules/ai/core/services/`.** The breaker's 503 and the concurrency cap's 503 carry no
  `code`, so the frontend separates them by message text — the one place in this change that violates
  frontend CLAUDE.md §"branch on the code, never on message prefixes". Coded exceptions retire it.
- **Ticket 11's box 1 handover is now unblocked in principle:** a frontend stream client that is not
  hard-wired to `/chat` exists in shape (`useAskAI` is still `/chat`-only, but the reader loop, the
  cancel/partial-output contract and the failure classifier are now reusable). Converting buffered AI
  endpoints to streaming is still not worth doing before a surface asks for it.
