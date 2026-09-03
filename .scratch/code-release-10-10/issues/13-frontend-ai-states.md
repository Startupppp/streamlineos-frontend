# 13 — Frontend AI states: exhaustion, queueing, cancellation, retry, partial output, citations

**What to build:** Every AI surface in the UI handles its failure and boundary states explicitly, and none of them issues a duplicate request while doing so.

**Blocked by:** 11.

**Status:** 6 of 6 boxes closed. 2026-09-03 S11 closed box 3 — cancellation was traced end to end and was broken in TWO places, neither of them where the notes below said the residue was: 19 metered backend controllers handed the provider no abort signal at all (fixed, backend `56a71268`), and the frontend capped every AI stream at 30 s while the backend serves for up to 120 s (fixed, frontend `b956db76e`). Proof asserts on the credit ledger, not on rendered text. 2026-09-03 S10: the streaming half of box 3 gains its **fourth** live route — `features/calendar/meeting-follow-up-panel.tsx` now runs on `POST /ai/meetings/follow-up/stream`, which did not exist until this session and was the blocker recorded as ticket 11's A-6. The buffered residue is re-measured below and still contains nothing this release may thread. 2026-09-03 S9: the last 4 unthreaded metered AI
mutations are threaded, so the buffered half of box 3 has **no residue that this release may thread** —
the remaining 14 are 8 in excluded modules and 6 that are not metered generation.
2026-09-03: **24 more AI mutation families thread the abort signal** (population 40 → 18), proven by 17 tests driving
the real `lib/api-client` plus an anti-vacuous control that fails on an unthreaded hook, with `pnpm type-check`
exit 0 and no call-site edit needed. Of the 18 left, 8 are in excluded modules, 6 are not metered generation, and
**4 are blocked on a call-site change in another territory** — their mutation variables are a bare scalar, which
cannot carry a signal.

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

- [x] Cancellation from the UI reaches the backend and stops the spend; an abandoned stream is not left running.
  CLOSED 2026-09-03 S11 — see the S11 addendum at the foot of this file for the end-to-end trace, the
  three cases tested separately, the two defects found on the spend path, and the ledger assertions.
  Residue, named and out of release scope: 4 buffered AI mutation hooks in `crm/ai.ts` and `ai.ts`
  (`useAIBatchScoreLeads`) still do not thread a Stop signal, so on those CRM surfaces a Stop press
  ends the UI and not the spend. A tab close or navigation still stops them, via the backend fix below.
  **Stream: closed, and it was broken.** `useAskAI` put its controller's signal in
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
  **S7 — the `lib/api-client.ts` block is GONE, and the S6 note recording it was already stale.**
  `makeRequestSignal` no longer drops the caller's signal: `linkAbortSignals` hand-links the timeout and
  the caller's signal wherever `AbortSignal.any` is missing, and `authedFetch` destructures `init.signal`
  out rather than letting the spread shadow it. Both landed in commit `ea1b576a5` with
  `lib/api-client-cancellation.test.ts`, which drives the REAL client against a mocked `global.fetch`.
  Verified, not assumed: `jest --testPathPattern="lib/api-client-cancellation"` → **10 passed, exit 0**.
  Bite proof in a hermetic `git archive HEAD` tree (never the shared working tree): restoring the original
  `return timeout;` → **exit 1, 2 failed / 8 passed**, and the two that fail are exactly
  "still cancels, instead of silently discarding the caller's signal" and "still cancels a signal
  delivered through init". The live tree was never modified.

  **S7 — surveys wired, 2 of 9 `/stream` routes now reach a user.**
  `features/surveys/builder/tabs/results-tab.tsx` passed `run: async () =>` and called the buffered
  sibling, so its Stop ended the UI and not the spend. `hooks/api/surveys/survey-ai.ts` now exports
  `streamSurveyResponseSummary({ surveyId, onToken, signal })` — an options object on purpose, since the
  defect this ticket exists to close was a signal that type-checked in the wrong positional slot — and the
  action threads `(signal, onToken)` through the existing `AiAction.run` seam. Evidence:
  `features/surveys/results/survey-ai-streaming.test.tsx` → **6 passed, exit 0**, driving the real
  `streamAiText` → real `authedFetch` → mocked `fetch`. Three bite proofs, all in the hermetic tree:
  buffered path restored → **2 failed / 4 passed**; `onToken` dropped → **3 failed / 3 passed**;
  `signal` dropped as well → **4 failed / 2 passed**.

  PARTIAL remains, and the count is smaller than the S6 note implied — but so is the reachable work.
  **7 of the 9 `/stream` routes are still unwired, and 6 of those 7 have no frontend surface of any kind
  — neither the streaming route nor its buffered sibling is referenced anywhere in the frontend.**
  Measured by grepping each buffered path across `**/*.ts{,x}` excluding `node_modules` and specs:
  `/ai/blog/posts/:id/{improve-writing,suggest-title,summarize}` ×3, `/ai/account-summary`,
  `/ai/meeting-prep`, `/ai/report-narrator` — **zero callers each**; only `contracts/openapi.json`
  mentions them. Wiring those is building a product surface, not adopting a stream, so they are recorded
  rather than invented. The 7th, `/ai/crm/meeting-follow-up/stream`, is the only one with a live caller
  (`hooks/api/crm/ai.ts` → `features/crm/shared/meeting-follow-up-composer.tsx`) and `features/crm/**` is
  excluded from this release's scope.
  `/public/kb/stream-ask` is OUT OF SCOPE and the reason is not the visual freeze: its buffered sibling's
  only client is `KbAskPanel mode="public"`, and **`mode="public"` has zero call sites** — the public help
  centre pages under `app/(public)/help/**` render no ask panel at all. Streaming it would wire an
  unreachable branch. (The `app/(public)/**` freeze applies regardless, so this territory would not have
  touched it either way.)
  PARTIAL also remains on the buffered half, unchanged from S6: 55 AI `mutationFn`s still take no signal,
  all outside this territory, so their Stop buttons end the UI and not the spend.

  **2026-09-03 — the buffered half moved: 24 more AI mutation families now thread the signal, and it is tested.**
  Frontend commits `feat(ai): thread the abort signal through 24 more AI mutationFns…` and
  `test(ai): prove the newly threaded AI mutations…`. Population of unthreaded AI `mutationFn`s measured with a
  brace-balanced scan over `hooks/api/**` (non-test), counting only calls to a path under `/ai/`: **40 → 18**.
  Threaded: `support/ai.ts` 10 · `ai.ts` 3 · `kb/page-ai.ts` 3 · `mail.ts` 3 · `accounting/accounting-ai.ts` 3 ·
  `kb/ask.ts` 1 · `payroll/use-explain-payslip.ts` 1. Both shapes already established by
  `hooks/api/build/ticket-ai.ts` were reused rather than invented — `AiAbortInput | void` for a no-variable family
  so `mutate()` stays legal, and `T & AiAbortInput` with `signal` destructured out of the body for one that already
  takes an object. `linkAbortSignals` was NOT re-fixed; it already works (`ea1b576a5`) and this is adoption at the
  call sites.
  **Every change is backwards compatible at the call site**, which is measured rather than hoped: `pnpm type-check`
  **exit 0, 0 errors**, and no file under `features/**` or `app/**` needed an edit.
  **Proven, not merely compiled.** `hooks/api/ai-mutation-signal-threading.test.tsx` drives nine of the threaded
  families through the REAL `lib/api-client` with a mocked `global.fetch` and asserts the outgoing request carries
  the caller's signal and aborts with it, plus one assertion that the signal is never serialised into the JSON body.
  `jest --runInBand --testPathPattern="ai-mutation-signal"` → **exit 0, 2 suites / 17 tests**.
  **Anti-vacuous control, run once and not kept:** the identical assertion applied to `useResolveAiSuggestion`, which
  deliberately does not forward a signal, **fails** — 1 failed / 10 passed. No source file was modified for the
  proof; the test file was restored byte-identical (sha256 `4d8dc5ab…`).
  **PARTIAL remains, and the residue is now exactly characterised — 18 sites, none of them a metered generation call
  this session may thread:**
  · **8 in excluded modules** — `crm/ai.ts` 3, `inv-ai-explain.ts` 3, `inventory/ai.ts` 2.
  · **6 are not metered generation** — `ai-credits.ts` 3 (credit CRUD), `kb/ask.ts` feedback 1,
    `support/ai.ts` resolve-suggestion 1, `ai.ts` accept-candidate-score 1. Cancelling these would not stop a spend.
  · **4 are metered generation blocked on a CALL-SITE change in another territory** — `useAIScoreLead`,
    `useAIAttritionRisk`, `useNLSearch` (`hooks/api/ai.ts`) and `useKbPageAsk` (`hooks/api/kb/page-ai.ts`) take a
    **bare scalar** as their mutation variables (`leadId: number`, `userId: string`, `query: string`,
    `question: string`). A scalar cannot carry a signal, so threading them means changing `TVariables` to an object,
    which breaks every `mutate(x)` call site in `features/**` — files this session does not hold. That is the whole
    remaining gap on the buffered half, and it is a territory blocker, not a design one.

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


---

## Session S8 addendum (2026-09-03) — the calendar meeting prep surface

**Box 3 (cancellation reaches the backend): the streaming half gained its third live route.**
`features/calendar/meeting-prep-panel.tsx` called the buffered `useMeetingPrep`, so its surface had no Stop at
all — the user watched a skeleton for the whole answer. It now runs on `POST /ai/meetings/prep/stream` through
`useAiTextStream().run` + `streamMeetingPrep`, which gives it single-flight, a Stop that aborts the outgoing
request, and an unmount abort. Partial output is kept on cancel and rendered as structure, not as raw markdown.
Evidence: `jest --testPathPattern="meeting-prep"` → **exit 0, 2 suites / 21 tests**, driving the real
`lib/api-client` with a mocked `global.fetch`; three bite proofs in a hermetic tree (1, 3 and 2 failures
respectively) recorded in ticket 11's S8 addendum.

**Two nine-state gaps this surface had, both closed:** it had no streaming state and no partial-output state, and
its only failure handling was `toast.error(getErrorMessage(error))` — a 402 and a 503 were the same red toast. It
now renders through `AiFailureBody`, and a **non-retryable** failure (quota, denied) gets **no dispatch control**:
the top-up link is the only affordance, because a "Try again" beside it spends a click on a call that cannot
succeed. A 503 still gets both a retry and the form.

**Box 3 remains PARTIAL.** The residue is the 18 unthreaded AI `mutationFn`s recorded above; the 4 blocked on a
bare-scalar `TVariables` were NOT threaded this session — see the cross-territory note in report 11b: a union
`TVariables` (`T | ({ value: T } & AiAbortInput)`) would widen them with **zero** call-site edits, so this is not
in fact blocked on another territory, but it was not implemented and must not be counted as done.


---

## Session S9 addendum (2026-09-03) — the last 4 bare-scalar AI mutations are threaded

**Box 3, buffered half: the "blocked on another territory" note was wrong and is now closed.**
`useAIScoreLead`, `useAIAttritionRisk`, `useNLSearch` (`hooks/api/ai.ts`) and `useKbPageAsk`
(`hooks/api/kb/page-ai.ts`) took a bare scalar as `TVariables`. Report 11b recorded that a union
`TVariables` would thread them with zero call-site edits and then reverted the draft unbuilt. It is
now built:

```ts
export type AiAbortableScalar<T extends string | number> = T | ({ value: T } & AiAbortInput);
export function readAiAbortableScalar<T extends string | number>(input: AiAbortableScalar<T>):
  { value: T; signal?: AbortSignal }
```

`T extends string | number` is what makes the discrimination sound rather than a cast — a bare `T` can
never be an object, so `typeof input === "object"` narrows without `as`.

**Zero call-site edits, measured not hoped.** The four live call sites
(`features/crm/leads/ai-score-button.tsx:48`, `features/hr/employees/detail/employee-details-view.tsx:202`,
`app/(authenticated)/crm/leads/smart-search/page.tsx:144,150`,
`features/wiki/components/kb-page-ai-actions.tsx:125`) all still pass a bare scalar and were not touched.
`pnpm -C frontend type-check` → **exit 0, 0 errors**.

**Proof.** `hooks/api/ai-mutation-signal-threading.test.tsx` grew from 10 to 18 tests: the four families
added to the signal-forwarding matrix, one assertion that the carrier never leaks `value`/`signal` into
the JSON body, two that `mutate(scalar)` still works and sends the identical body, and a **kept**
anti-vacuous control. `jest --runInBand --testPathPattern="ai-mutation-signal"` → **exit 0, 2 suites /
25 tests**.

**The anti-vacuous control is now permanent, not a one-off.** `useAcceptCandidateScore` deliberately does
not forward a signal (accepting a score is CRUD, not a metered generation, so cancelling it stops no
spend). The control passes it a signal, aborts, and asserts the outgoing request is **not** cancelled —
so the 18 positive assertions cannot be vacuous, and threading that hook without moving the control turns
the suite red on purpose.

**Bite proofs — hermetic `git archive HEAD` tree, live tree never modified.** Baseline 18 passed.

| Mutation | Result |
|---|---|
| `useAIScoreLead` drops the signal | **1 failed / 17 passed** — its own case only |
| `useKbPageAsk` drops the signal | **1 failed / 17 passed** |
| the carrier leaks into the request body | **2 failed / 16 passed** |
| `useAcceptCandidateScore` IS threaded (control inverted) | **1 failed / 17 passed** — the control |

Restored: 18 passed.

**One test-harness defect fixed on the way.** The matrix awaited the mutation promise after aborting. On
an unthreaded hook that promise never settles, so the case timed out at 5 s and every later case in the
file failed with it — 9 failed / 9 passed for a one-hook defect, which makes a bite proof unreadable.
The assertion now `waitFor`s the outgoing signal instead, and fails in ~1 s inside its own case.

**Box 3 stays PARTIAL, and the residue no longer contains anything this release may thread.**
14 unthreaded AI `mutationFn`s remain:
· **8 in excluded modules** — `crm/ai.ts` 3, `inv-ai-explain.ts` 3, `inventory/ai.ts` 2.
· **6 are not metered generation** — `ai-credits.ts` 3 (credit CRUD), `kb/ask.ts` feedback 1,
  `support/ai.ts` resolve-suggestion 1, `ai.ts` accept-candidate-score 1 (the control).
The streaming half's residue is unchanged from S8: 6 of the 9 `/stream` routes have no frontend surface
at all and the 7th is CRM.


---

## Session S10 addendum (2026-09-03) — the calendar follow-up surface, and an honest recount of the residue

**Box 3, streaming half: the fourth live route.** `features/calendar/meeting-follow-up-panel.tsx` called the
buffered `useMeetingFollowUp`, so it had **no Stop at all** — the user watched a skeleton for the whole
answer — and its only failure handling was `toast.error(getErrorMessage(error))`, which made a 402 and a 503
the same red toast. It could not be converted from the frontend at any point before now, because
`/ai/meetings/follow-up` had **no `/stream` sibling**; that route was added in the backend this session
(ticket 11, A-6). The panel now uses `useAiTextStream().run` + `streamMeetingFollowUp`, giving it
single-flight, a Stop that aborts the outgoing request, an unmount abort, partial output kept on cancel, and
`AiFailureBody` for the failure branch — with a **non-retryable** failure (quota, denied) getting no dispatch
control at all.

**Streaming into a structured renderer was the actual work.** The panel renders a `FollowUpDraft`, not prose,
and it must hand that same draft to `POST /ai/meetings/follow-up/propose-send`.
`features/calendar/meeting-follow-up-stream-parse.ts` reuses the approach
`meeting-prep-stream-parse.ts` established rather than inventing a second parser: a pure function of the text
received so far, folding the arriving markdown into subject / email / action items / next meeting on every
token. Two consequences that are tested, not hoped:
· the send posts the **reconstructed** draft, including `{ item, assignee, dueDate }` per action item;
· a stream stopped before the email arrived is **not sendable** (its `propose-send` body would 400), so the
  send control is disabled rather than offered a click that cannot succeed.
Placeholders the model emits (`owner: unassigned`, `due: none`) are read as **absent**, so no action item ever
renders an owner literally named "unassigned".

**Proof.** `jest --runInBand --testPathPattern="meeting-follow-up"` -> **exit 0, 2 suites / 23 tests**, driving
the real `lib/api-client` with only `global.fetch` mocked. `pnpm type-check` -> **exit 0, 0 errors**;
`npx eslint` on all 7 changed/added files -> exit 0; `check:dead-code` **exit 1 -> exit 0**;
`check:over-300` **519/519 OK**; `check:query-signal`, `check:empty-states`, `check:colors`,
`check:icon-labels`, `check:effect-fetches` all exit 0. `check:file-sizes` stays exit 1 on
`hooks/api/notifications-inbox.{ts,test.ts}` — another territory, unchanged by this work.

**Four bite proofs, hermetic `git archive HEAD` tree, live tree never modified** (baseline there: 23 passed):
· transport pointed back at the buffered `/ai/meetings/follow-up` -> **2 failed / 21 passed**
  ("posts to the /stream route and never to the buffered sibling", "never serialises the abort signal…")
· `signal` dropped from the transport -> **4 failed / 19 passed** ("Stop aborts the outgoing request…",
  "aborts the stream when the panel unmounts", "does not open a second paid stream while one is running",
  "does not offer a send for a draft stopped before the email arrived")
· `onHeaders` dropped -> **2 failed / 21 passed** ("renders citations from x-ai-sources before the body
  finishes", "Stop aborts…")
· action items read by position instead of by label -> **5 failed / 18 passed**
Restored: 23 passed, `hooks/api/meetings-ai.ts` sha256 `a4aaacf6…` identical to the live tree.

**`useMeetingFollowUp` was NOT deleted.** The buffered route's product is a Zod-validated record and a
previous pass removed a buffered hook before its surface had moved and broke the live panel. Its last caller
moving to the stream turned `check:dead-code` red, so it is now recorded there as an explicit **KEEP** verdict
with that reason — which is the honest way to keep a deliberately unwired export, rather than deleting it or
leaving a gate failing.

**The buffered residue, re-measured at head rather than copied forward.** Method: walk `hooks/api/**`
(non-test), split each file at `^export (function|const) <name>`, and for every hook body containing a
`mutationFn` **and** a literal `/ai/…` path, check whether the body threads `signal`.
**46 AI mutation hooks · 40 threaded · 6 not.** This is a different key from the S9 census (which counted
`mutationFn`s brace-balanced, and reported 14), so the two numbers are not directly comparable — but the
**classification is the same, and nothing in it is threadable by this release**:
· **4 are in excluded modules** — `crm/ai.ts` `useDealSummary` / `useLeadSummary` / `useSummarizeNotes`, and
  `ai.ts` `useAIBatchScoreLeads`, whose only caller is `features/crm/leads/ai-bulk-score-button.tsx` (its
  `TVariables` is a bare `number[]`, which `AiAbortableScalar<T extends string | number>` does not cover).
· **2 are not metered generation** — `ai.ts` `useAcceptCandidateScore` (the deliberate, kept anti-vacuous
  control in `ai-mutation-signal-threading.test.tsx`; threading it turns that suite red on purpose) and
  `ai-summaries.ts` `useSaveSnapshot`, which POSTs an already-generated summary as a record
  (`ai:summaries:create`). Cancelling either stops no spend.
**Box 3 therefore stays PARTIAL and its residue is recorded, not threaded.** Threading a call whose
cancellation buys nothing would add a signal for the count's sake and make the next census harder to read.

**Streaming half's residue, unchanged in substance:** of the now-**11** `/stream` routes the backend exposes,
4 reach a real user (generate-jd, survey summarize-responses, meetings prep, meetings follow-up). Of the rest,
6 have no frontend surface of any kind — neither the streaming route nor its buffered sibling is referenced —
which is a product decision, and `/ai/crm/meeting-follow-up/stream` is CRM, excluded.


---

## Session S11 addendum (2026-09-03) — box 3 closed, and it was broken in two places

**Traced first, changed second.** The whole path was walked before anything was edited: Stop /
unmount / tab close -> `AbortController` -> `authedFetch`'s signal slot -> socket teardown ->
Node `res 'close'` with `writableEnded === false` -> `createStreamAbortSignal` -> the gateway's
`resolveSignal` -> `streamText({abortSignal})` / `ChatOpenAI.invoke(_, {signal})` -> provider stops
-> `finishReason` rejects -> reservation released. Two links in that chain were dead.

**Defect A — 19 metered controllers outside `modules/ai/**` handed the provider NO signal at all.**
`AiRequestAbortInterceptor` is the AI module's own convention and 11 controllers carry it; the other
19 that reach a metered gateway call never adopted it, so `resolveSignal` produced `undefined` and
the provider call opened with no `abortSignal`. On those routes Stop, unmount and a closed tab
stopped nothing, the completion ran to the end, and because it completed `settle` **debited the org
for an answer nobody received**. Named in report 13 §2:
`mail`, `payroll/insights`, `accounting/ai`, `timesheets`, `e-sign`, `chat-summarize`, `autonomy-review`,
`hr/config/hr-email-templates`, `hr/recruitment/recruitment-candidate-records`, `inventory/ai`,
`kb/{help-centre×3, retrieval×2, wiki}`, `support/{core, kb-gap}`, plus `cron` (`@Public()`, unaffected).
Fixed by reading a signal that already existed and had **zero** production readers:
`TenantContextInterceptor` builds one on every authenticated request and stores it as
`TenantContext.abortSignal`; the gateway now resolves `explicit ?? AI-interceptor ?? tenant` through
one new `getAmbientAiAbortSignal()`. All 19 run inside the tenant transaction, so one change closes
all of them. `embedBatchWithCredit` is excluded on purpose — its product is a durable index, and a
hang-up that cancels it mid-batch leaves a half-indexed document.

**Defect B — the frontend aborted streams the backend was still serving.** `lib/api-client.ts` armed
`AbortSignal.timeout(30_000)` on every `authedFetch`, `streamAiText` included, against backend
deadlines of **120 s** (chat), **60 s** (the other stream routes) and **120 s** (buffered AI). Any
answer over 30 s was killed **by the client**, rendered as `cancelled` with partial text —
indistinguishable from a Stop — and the retry that invites reserves and spends a second time.
No existing test could see it: `test-utils/abort-signal-polyfill.ts` stubs `AbortSignal.timeout` to
a signal that never fires. `authedFetch` now takes `{ timeoutMs }` and `streamAiText` passes
`AI_STREAM_TIMEOUT_MS = 180_000`, above every server deadline.

**The three cases, tested separately.** Stop and unmount are one event on the wire (both abort the
same controller); they are separated on the frontend, where they differ, and joined on the backend,
where they cannot be told apart. The third — socket destroyed with **no** client-side abort — is
backend-only and is driven with a raw `http.request` whose socket is destroyed, because `fetch`
always cancels cleanly and cannot express it.

**The spend is asserted on the ledger, not on rendered text.**
`src/modules/ai/core/streaming/__tests__/ai-cancellation-stops-the-spend.spec.ts` boots a real Nest
server over a real socket and drives the real route helper -> real `AiGatewayStreamHelper` -> real
`streamText`, doubling only the provider adapter (which honours the signal the SDK hands `doStream`
and **counts the deltas it produced**) and the ledger. Measured: client abort **9 deltas, still 9
after 600 ms**, `reserve` 1 / `settle` 0 / `release(4242,"stream_aborted_no_settle")`; socket
destroyed **14, still 14**, same ledger outcome; healthy control **200/200**, `settle` at
`computeTokenCharge(model,120,200)` and no release.
`ai-ambient-abort-covers-metered-routes.spec.ts` does the same for defect A with the **real
`TenantContextInterceptor`**: `release(77,"cancelled","org_probe")`, `settle` never called, and an
anti-vacuous control that a healthy request is not cancelled and does settle.

**A vacuous test already present, named as asked.** `ai-stream-surface.integration.spec.ts`'s
"a real client hang-up aborts the provider call, so the spend stops with the response" asserts
`provider[0].released === true` — a boolean the fake provider sets **on itself**. No ledger appears
anywhere in that file. It proves the producer stopped, which is worth keeping; it is not evidence
about the spend.

**Bite proofs, hermetic `git archive HEAD` tree, live tree never modified.**
· both backend specs against pre-fix source -> **exit 1, 4 failed / 4 passed**, and the 4 failures are
exactly `ai-ambient-abort-covers-metered-routes` while `ai-cancellation-stops-the-spend` passes —
confirming the stream path already worked and only the metered-route path was broken; post-fix
**exit 0, 8 passed**.
· `ai-text-stream-deadline.test.tsx` pre-fix -> **exit 1, 1 failed / 2 passed**
(`Expected: >= 120000, Received: 30000`); post-fix **exit 0, 3 passed**.

**Verified against the installed SDK rather than assumed.** `ai@7.0.51`, aborted mid-stream:
`onFinish` does not fire, `onAbort` does, `finishReason` **rejects** — which is exactly what the
gateway's `void Promise.resolve(stream.finishReason).catch(...)` relies on.

**Two things NOT fixed, deliberately, with owners.**
· **An aborted stream settles nothing and releases the whole reservation.** This cannot be closed by
coding: an aborted stream never receives the provider's terminal `finish` part, so **no token usage
exists to settle with**. Charging an estimate from the partial text would contradict the
token-metered rule. Releasing under-charges by construction. **Owner: AI billing / pricing — a
product decision.**
· **A `settle` that throws still leaves the reservation for the 15-minute sweep**, and the exposure is
**larger than previously recorded**: `sweepExpiredReservations` sets `RELEASED` with `reason:"expired"`
and credits the wallet back, so the org pays **zero** for a fully delivered turn — and because
`settleStream` awaits `ledger.settle` before `usageSvc.track`, a failed settle also writes **no
`ai_usage_logs` row**, so the turn is invisible to analytics as well as to billing. A durable
settlement retry (outbox + relay) is the fix and remains out of scope. **Owner: the AI credit ledger
lane** (`modules/billing/core/ai-credits-reservation.service.ts` + `ai-gateway-credit.helper.ts`);
note that the workflow relay is recorded broken under RLS, so an outbox retry needs that first.

**Cross-territory finding.** The 30 s client timeout still caps every **buffered** metered AI call
where the backend allows 120 s. Raising it for streams was this box's seam; raising it for
`apiClient` generally affects all 601 routes and is a platform decision. After defect A's fix the
money outcome of hitting it is a release rather than a debit, so it is now a UX defect (a long
generation is unreachable) rather than a billing one. **Owner: `lib/api-client.ts` / platform.**

**Commits.** backend `56a71268` + `0c559448` · frontend `b956db76e`.
