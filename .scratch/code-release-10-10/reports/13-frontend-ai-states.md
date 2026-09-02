# Ticket 13 — Frontend AI states · session S4 · 2026-09-02

**Outcome:** 5 of 6 boxes closed (was 4). The two boxes the orchestrator reopened were both wrong in
the source, not just incomplete. FE = `streamlineos-frontend/frontend`. Supersedes the S3 report;
the S3 findings that still hold are restated rather than repeated in full.

---

## Box 1 — the nine states, enumerated

| # | Boundary | Defined state before this session | Now |
|---|---|---|---|
| 1 | Credit exhaustion | **Yes** — `quota` → `AiQuotaEmptyState`, top-up link, no Retry | unchanged |
| 2 | Queueing | **Yes** — `queued` → `AiQueuedNotice` (429, and 503 carrying "too many concurrent") | unchanged |
| 3 | **Streaming** | **No** — only a `loading` skeleton. The Ask-OS bubble streamed, but ad hoc and unclassified; no other surface could render a partial answer at all | **built**: `{status:"streaming"; text}` → `AiStreamingOutput` (partial text, live caret, "Generating…", Stop) |
| 4 | Cancellation | **Yes** — `cancelled` → `AiCancelledNotice` | unchanged |
| 5 | **Retry** | **Partial** — clicking Retry re-entered `loading`, visually identical to a first load | **built**: `{status:"loading"; attempt}` → "Retrying — attempt N", from a monotonic per-surface counter |
| 6 | **Partial output** | **No** — `cancelled` carried no text; every token received before Stop was discarded | **built**: `{status:"cancelled"; text?}` → `AiCancelledOutput` ("Stopped — partial answer kept" + text + Run again) |
| 7 | **Citation loading** | **No** — `AiCitationChips` returned `null` until citations existed | **built**: `AiCitationChipsSkeleton` + `AiDraftCard citationsPending`, shown while streaming |
| 8 | Provider failure | **Yes** — `unavailable` → `AiUnavailableNotice` (503 without the cap phrase, 502/504, TIMEOUT) | unchanged |
| 9 | Permission revocation | **Yes** — `denied` → `AiPermissionDenied` (403, `MODULE_NOT_ENABLED` 402, and the client gate's `Missing permission:` Error) | unchanged |

Streaming and partial output are one mechanism, so they were built as one: `AiAction.run` gained an
optional second parameter `onToken`, `AiActionsMenu` / `useAiInlineAction` / `useAiPopoverAction` feed
it into a `streaming` state, and cancelling a run that has streamed keeps what arrived. A zero-arg or
one-arg `run` stays assignable, so none of the ~40 existing call sites churned.

### The bigger finding: 11 surfaces in this territory rendered none of the nine

`AiActionResultBody` handled all of it, but the surfaces that own their own success rendering never
used it. Seven build AI cards (`risks`, `summary`, `weekly-update`, `client-update`, `plan`,
`extract-tasks`, `change-impact`), `features/build/ai/ai-chat-panel.tsx` and all three
`features/accounting/ai/**` panels rendered **every** AI failure as

```
<p className="text-...-destructive">{getErrorMessage(mutation.error)}</p>  + Retry
```

so an exhausted wallet, a plan the org has not bought, a tripped breaker, a full queue, an offline
browser and a revoked permission were one red sentence with a Retry that cannot help any of them.
New `components/ai/ai-failure-body.tsx` (`AiFailureBody`) classifies and delegates to
`AiActionResultBody`, suppressing Retry on the states re-dispatch cannot fix; all 11 now use it.

Also in this pass:
- `features/build/ai/project-ai-menu.tsx` hand-rolled its own run — no single-flight guard, no
  AbortController, no unmount teardown, closing the sheet did not stop the call. Now `useAiPopoverAction`.
- `components/assistant/ask-os-chat-view.tsx` carried a 30-line copy of the seven-branch ladder
  (`AskOsFailureNotice`). Deleted; the chat renders through `AiActionResultBody`.
- `features/sign/builder/envelope-ai-menu.tsx` wrapped its error in `new Error(getErrorMessage(err))`,
  destroying the `ApiError` status so `classifyAiError` could only ever answer `error`. Removed.
- `GlobalAskOs` kept a stopped stream's partial answer but marked it as a normal completed message;
  it now also raises the `cancelled` state so the user sees that the answer is partial.

---

## Box 3 — the abort was a no-op, exactly as suspected

**`useAskAI` created an AbortController and never wired it to the fetch.**

```ts
authedFetch(buildUrl("/chat"), { …, signal: controller.signal }, "/chat")   // before
```

`authedFetch(url, init, path, signal?)` ends with

```ts
fetch(url, { ...init, headers, credentials: "omit", signal: combinedSignal })
```

— `signal: combinedSignal` comes **after** the spread, so the caller's `init.signal` is overwritten by
`makeRequestSignal(signal)` built from the **fourth** argument, which `useAskAI` never passed. The
combined signal was therefore the 30 s timeout alone. `stop()` aborted a controller attached to
nothing; the unmount teardown did the same. The read loop kept consuming tokens and the request kept
spending. The suite that "proved" cancellation mocked `authedFetch` and read `init.signal`, so it
asserted the bug.

Fix: pass `controller.signal` in the signal slot (and drop it from `init`, so the illusion is gone),
plus a `signal.aborted` check at the top of the read loop.

**Proof, against the real client.** `hooks/api/chat-ai-assistant-abort.test.tsx` imports the real
`@/lib/api-client` and mocks `global.fetch`, asserting the signal `fetch` actually received:

- is not aborted while streaming,
- becomes aborted when `stop()` is called,
- becomes aborted when the hook unmounts mid-stream,
- and one send produces exactly one network call.

**Bite:** restoring `signal` to `init` (the shipped code) → `npx jest --testPathPattern="chat-ai-assistant-abort"`
→ **3 failed / 1 passed**. Restored → 4 passed.

`hooks/api/chat-ai-assistant-stream.test.tsx` was rewritten to read `authedFetch`'s fourth argument and
to throw if it is not an `AbortSignal`, so the positional trap cannot be re-introduced silently.

**Buffered path, end to end.** `components/ai/ai-abort-reaches-request.test.tsx` drives
`AiActionsMenu` → `action.run(signal)` → real `apiClient.post` → real `authedFetch` → mocked `fetch`,
and asserts the outgoing request's signal aborts on Stop, on unmount, and on rejecting an inline
session — and that one dispatch is one request.

**Mutation threading.** TanStack v5 gives a mutation no signal, so the surface must put one in the
variables. New `hooks/api/ai-abort.ts` (`AiAbortInput`) plus a `{ signal, ...input }` destructure so
the signal never reaches `JSON.stringify` — asserted by
`hooks/api/ai-mutation-signal.test.tsx::"never serialises the AbortSignal into the request body"`,
alongside six hook families each proven to abort the real outgoing request.

Threaded families: **4 of 90 → 35 of 90** (`build/ticket-ai` 9/9, `build/ai` 8/8, `crm/ai` 8/11,
`ai.ts` 5/15, `kb/article-ai` 4/4, `sign/ai` 1/1), with their run sites in `features/build/ai/**`,
`features/crm/shared/crm-inline-ai-menu.tsx`, `features/inventory/components/{product,vendor}-ai-actions.tsx`,
`features/hr/recruitment/candidate-detail/use-candidate-ai-actions.ts` and
`features/sign/builder/envelope-ai-menu.tsx`.

---

## Gates (run, exit code read)

| Gate | Result |
|---|---|
| `pnpm type-check` (`tsc --noEmit`) | **exit 0, 0 errors** (grep of the full output: 0 `error TS`) |
| `npx jest --runInBand --testPathPattern="components/ai"` | **6 suites / 78 tests pass** |
| `npx jest --runInBand --testPathPattern="(components/ai\|components/assistant\|features/build/ai\|features/accounting/ai\|features/crm/shared\|features/inventory/components\|features/sign\|features/help-centre\|hooks/api/ai-mutation-signal\|hooks/api/chat-ai)"` | **14 suites / 128 tests pass** |
| `npx jest --runInBand --testPathPattern="(components/ai\|components/assistant\|hooks/api\|features/build\|features/crm\|features/accounting\|features/inventory\|features/sign\|features/help-centre)"` | 75 passed / 2 failed — **both failures foreign** (see below) |
| `pnpm -s check:query-scope` | exit 0 — 5200 files, 0 violations |
| `pnpm -s check:query-signal` | exit 0 — 1054 queryFn blocks / 419 files, 0 violations |
| `pnpm -s check:icon-labels` | exit 0 — 3791 files |
| `pnpm -s check:colors` | exit 0 — 5200 files |
| `pnpm -s check:effect-fetches` | exit 0 — 5200 files |
| `pnpm -s check:empty-states` | **exit 1 — 1 violation, not mine** (see below) |
| `pnpm -s check:file-sizes` | exit 0 — `ai-actions-menu.tsx` was pushed to 511 lines by this change and is back to 493 (duplicate Sheet/Dialog JSX extracted); the remaining >500 file is `hooks/api/notifications-inbox.ts` |
| `npx eslint` on the 54 files this ticket touched | **0 errors, 10 warnings** — all pre-existing (`refs during render`, `set-state-in-effect`) |

Not run: `next build` (dies at `/billing/ai-credits` env validation), `madge --circular`, e2e.

### Red gates that are not this ticket's

- `check:empty-states` → `features/workflows/builder/workflow-builder-canvas.tsx:118`.
  `git diff HEAD -- frontend/features/workflows/` is empty, so the file is byte-identical to HEAD and
  the gate was already red before this session. It is a false positive: the flagged centered flex
  container is `BuilderErrorState`, and the checker's `empty` indicator matches the neighbouring
  `<EmptyState>` usage 8 lines below.
- `hooks/api/read-error-reaches-boundary.test.tsx` (2 failures) and
  `hooks/api/__tests__/response-contract-fixtures.ts` ("suite failed to run") are another agent's
  uncommitted work — the first is ` M`, the second is `??`, and neither is in this ticket's import graph.

---

## Files changed (relative to `streamlineos-frontend/frontend`)

New:
- `components/ai/ai-partial-output.tsx` · `components/ai/ai-failure-body.tsx`
- `hooks/api/ai-abort.ts` · `test-utils/abort-signal-polyfill.ts`
- `components/ai/ai-nine-states.test.tsx` (32) · `components/ai/ai-failure-body.test.tsx` (16) ·
  `components/ai/ai-abort-reaches-request.test.tsx` (4) ·
  `hooks/api/chat-ai-assistant-abort.test.tsx` (4) · `hooks/api/ai-mutation-signal.test.tsx` (7) ·
  `features/build/ai/ai-card-states.test.tsx` (2)

Edited — shared AI machinery:
`components/ai/{ai-error-state.ts, ai-action-result-body.tsx, ai-inline-preview.tsx, ai-actions-menu.tsx,
ai-citation-chips.tsx, ai-draft-card.tsx, ai-field-popover-action.tsx, use-ai-inline-action.ts,
use-ai-popover-action.ts, index.ts, ai-actions-menu-dispatch.test.tsx}`,
`components/assistant/{ask-os-chat-view.tsx, global-ask-os.tsx}`

Edited — hooks: `hooks/api/{chat-ai-assistant.ts, chat-ai-assistant-stream.test.tsx, ai.ts,
build/ai.ts, build/ticket-ai.ts, crm/ai.ts, sign/ai.ts}`

Edited — surfaces: `features/build/ai/{ai-chat-panel, change-impact-card, client-update-card,
create-ticket-ai-menu, extract-tasks-card, plan-card, project-ai-menu, risks-card, summary-card,
ticket-ai-generate-checklist, ticket-ai-suggest-subtasks, ticket-detail-ai, weekly-update-card}`,
`features/accounting/ai/{document-extract-panel, reconciliation-explain-panel, variance-explain-panel}`,
`features/crm/{shared/crm-inline-ai-menu, shared/ai-panel-extra-tabs, deals/ai-predict-deal-button,
leads/ai-next-action-button}`, `features/hr/recruitment/candidate-detail/use-candidate-ai-actions.ts`,
`features/inventory/components/{product-ai-actions, vendor-ai-actions}`,
`features/sign/builder/envelope-ai-menu.tsx`

---

## Other agents' territory — found in transit, not fixed

1. **`lib/api-client.ts` (unowned shared infra) — two live cancellation traps. P1.**
   - `makeRequestSignal` falls back to `return timeout;` when `AbortSignal.any` is absent, **silently
     dropping the caller's signal**. `AbortSignal.any` is Chrome 116 / Safari 17.4 / Firefox 124; on
     anything older every cancel in the whole app — AI included — is a no-op that looks correct. Fix:
     link manually with a controller instead of discarding the external signal. (jsdom has neither
     `AbortSignal.timeout` nor `.any`, which is why `test-utils/abort-signal-polyfill.ts` exists.)
   - `authedFetch` spreads `init` and then sets `signal`, so a caller who puts a signal in `init`
     gets a silent no-op. That is precisely the defect this ticket found in `useAskAI`. Fix:
     `makeRequestSignal(signal ?? init.signal)`, or remove `signal` from the accepted `init` type so it
     stops compiling.
2. **55 AI `mutationFn`s still take no signal**, so Stop on those surfaces ends the UI and not the
   spend. Ordered by user-visible impact (surfaces that render a Stop button first):
   `hooks/api/support/ai.ts` (11 → `features/support/inbox/ticket-detail-header.tsx`, 5 menu actions),
   `hooks/api/timesheets-core` run sites in `features/timesheets/**` (5),
   `hooks/api/payroll/use-explain-payslip.ts` (1 → `features/payroll/ess/...`, a menu),
   `hooks/api/mail.ts` (3 → `features/mail/mail-reading-ai-actions.ts`, ticket 29),
   `hooks/api/kb/page-ai.ts` + `kb/ask.ts` (5, ticket 29), `hooks/api/meetings-ai.ts` (4, calendar),
   `hooks/api/accounting/accounting-ai.ts` (3), `hooks/api/inv-ai-explain.ts` (3),
   `hooks/api/inventory/ai.ts` (2), `hooks/api/feedbucket/use-feedbucket-ai.ts` (2),
   `hooks/api/ai-summaries.ts` (1) and 10 remaining in `hooks/api/ai.ts`. The pattern to copy is
   `hooks/api/ai-abort.ts` + `{ signal, ...input }`.
3. **Ticket 29.** `features/mail/mail-inbox-summary-sheet.tsx` and
   `features/wiki/components/kb-page-ai-actions.tsx` still hand-roll `402 → quota / 403 → denied /
   else → error`. One-line fix each: `classifyAiError(err)` then `<AiFailureBody />` or
   `<AiActionResultBody />`. `features/calendar/{meeting-prep,meeting-follow-up}-panel.tsx` render
   `AiPermissionDenied` with no classification at all.
4. **P2, feedbucket owner.** `features/feedbucket/components/feedbucket-ai-panel.tsx:24` still has
   `AI_UNAVAILABLE_STATUSES = new Set([400, 402, 503])`; a **400** is our own bad request being hidden
   behind "AI unavailable".
5. **P2, backend `modules/ai/core/services/`.** The breaker's 503 and the concurrency cap's 503 still
   carry no `code`, so `classifyAiError` separates them by message text — the one place this design
   violates "branch on the code, never on message prefixes". Distinct codes
   (`AI_PROVIDER_UNAVAILABLE` / `AI_CONCURRENCY_LIMIT`) retire the string match.
6. **Informational.** `hooks/api/surveys/analytics.ts:107` (`useExportResponses`) calls `authedFetch`
   with no signal in any position; not AI, but the same class of leak.
7. **S3's `/public/kb/stream-ask` orphan finding stands** and is unchanged: `KbAskPanel mode="public"`
   has no reachable call site, so the public ask surface (backend `KbRagController.streamAsk` +
   `KbRagService.streamAnswer`, frontend `usePublicAskSupportKb` and the `mode: "public"` half of
   `KbAskPanel`) is recommended for removal. Still a decision for the orchestrator, not a change made
   here.

## Honest gaps

- `next build`, `madge --circular` and any e2e: **not run**.
- The buffered cancellation guarantee is proven for the 35 threaded families and for the shared
  machinery; for the other 55 the Stop button still ends only the UI.
- `AbortSignal.any` availability is assumed by every cancellation claim in this report — see
  cross-territory finding 1. The jest proofs polyfill it because jsdom 20 has neither.

---

## Session S6 — the AI stream client, and the states the routing note pointed at

### The client (the substance of the open box)

The backend exposes **11** AI text-stream routes and they share **one** wire format.
`respondWithAiTextStream` (`ai-text-stream-route.ts`) pipes the provider stream through
`pipeTextStreamToResponse`, so the body is raw UTF-8 text deltas under
`text/plain; charset=utf-8` — no SSE frames, no `data:` prefix, no JSON envelope and no
terminator sentinel. A parser that splits on newlines or calls `JSON.parse` corrupts it.
A contract spec (`ai-stream-route-contract.spec.ts`) holds every route to that helper.

The only client able to read it was the loop inside `useAskAI`, hard-wired to `POST /chat`.
The **nine** routes ending in `/stream`, plus `/public/kb/stream-ask`, had no client at all.

New `frontend/hooks/api/ai-text-stream.ts` exports two things, deliberately split:

- `streamAiText({ path, body, onToken, signal })` — the transport, no React. For a surface
  like `AiActionsMenu` that already owns single-flight and hands `run` a signal, a second
  in-flight ref would be a second source of truth.
- `useAiTextStream()` — single-flight + `stop()` + unmount abort, for a surface that owns
  its own Stop button.

Behaviour that matters and is asserted: the signal goes in `authedFetch`'s **fourth**
argument (an `init.signal` is overwritten by the combined signal, which is exactly how this
seam shipped a no-op cancel once already); a cancel keeps the partial text; a pre-aborted
signal opens no request at all; a non-ok response raises the real HTTP status so a 402 stays
renderable as credit exhaustion rather than a generic failure; `headers` is returned so
`/public/kb/stream-ask`'s `x-kb-sources` citations are reachable; and the final
`decoder.decode()` is flushed — the old chat loop omitted it and could drop a trailing
multi-byte character.

`useAskAI` now delegates rather than owning a second copy. Faithfulness is proven by the 9
pre-existing tests passing unchanged, including the 4 that drive the REAL `lib/api-client`.

One non-chat surface is wired end to end so the client is delivered rather than merely built:
`useGenerateJobDescription` streams `POST /ai/generate-jd/stream` (same body schema, same
`hr:interviews:manage` permission as the buffered route) and the JD action passes
`(signal, onToken)` through the existing `AiAction.run` seam.

### What the routing note got wrong

Two of the three routed items were already fixed and the note was stale, verified against
current source rather than trusted in either direction:

- `components/ui/data-table.tsx` already carries the paused-read fix (commit `a03bbe6f3`).
- `features/chat/channel-sidebar.tsx` already has an `isError` -> `ErrorState` branch.

The real remaining gap was **`DataTableSkeleton`** — the standalone export callers return
directly from their loading branch, which is what the `T7` template in `frontend/CLAUDE.md`
tells them to do. It had no `aria-busy`, no connection check, and four per-header-cell
`sr-only "Loading"` spans. It now carries the same three lines as `LoadingState`.

### States

Five read-error branches, each on a surface where a failed read rendered the empty state and
told the user there was no data:
`hr/onboarding/onboarding-list.tsx` · `hr/helpdesk/my-tickets-tab.tsx` ·
`hr/benefits/dependents-manager.tsx` · `chat/shared-files-panel.tsx` ·
`build/settings/team-roster-section.tsx`.

Five empty states: `build/ticket-details/watcher-list.tsx` (also had no error branch) ·
`hr/recruitment/jobs/share-job-dialog.tsx` (error and empty were one "Could not load"
sentence; now separated, with a retry) · `build/project-create/steps/step-template.tsx` ·
`build/ticket-details/ticket-checklists.tsx` · `hr/exit/progress-timeline.tsx`.

`progress-timeline.tsx` was the worst of the ten. On a failed read it fell through to
`data?.steps ?? PROGRESS_STEPS.map(...)` and rendered a **fabricated** timeline showing
"Submitted / current" — invented progress presented to a departing employee as fact.

### Proofs, run and read

| Command | Exit | Number |
|---|---|---|
| `pnpm -C frontend type-check` | 0 | 0 errors |
| `npx eslint <17 changed files>` | 0 | 0 findings |
| `jest --testPathPattern="ai-text-stream\|chat-ai-assistant"` | 0 | 3 suites, 19 tests |
| `jest --testPathPattern="components/ai\|hooks/api/ai\|...\|data-table\|read-state"` | 0 | 15 suites, 173 tests |
| `jest --testPathPattern="features/(hr\|build\|chat)"` | 0 | 37 suites, 234 tests |
| `jest --testPathPattern="paused-reads\|data-table-states"` | 0 | 2 suites, 38 tests |
| `pnpm -s check:query-signal` | 0 | 1054 queryFn blocks / 420 files / 0 violations |
| `pnpm -s check:empty-states` | 0 | 3814 files |
| `pnpm -s check:effect-fetches` | 0 | 5256 files |
| `pnpm -s check:cycles` | 0 | 0 circular |
| `pnpm -s check:over-300` | 0 | 519 of 5241 (baseline 519) |
| `pnpm -s check:colors` | 0 | 5256 files |

Bite proof, one-off, file restored byte-identical (sha256 `f5e75af9...4792` before and after):
the signal moved back into `init` — the original defect — gives **3 failed / 16 passed / 19**.

### Still open, and why

Eight of the nine `/stream` routes still have no caller, and each is now a one-line adoption
against `streamAiText`:

| Route | Why not adopted here |
|---|---|
| `/ai/blog/posts/:postId/{improve-writing,suggest-title,summarize}/stream` | no frontend reference of any kind — no surface exists to wire |
| `/ai/account-summary/stream`, `/ai/meeting-prep/stream`, `/ai/report-narrator/stream` | `features/crm/**`, excluded from release scope |
| `/ai/crm/meeting-follow-up/stream` | `features/crm/**`, excluded from release scope |
| `/ai/surveys/:surveyId/summarize-responses/stream` | surface change in `features/surveys/**` |
| `/public/kb/stream-ask` | renders on a public page this territory must not alter; it is also the only route with sidecar metadata (`x-kb-sources`), which the client already returns |

### Cross-territory findings

1. **`lib/api-client.ts` still arms the trap.** `makeRequestSignal` returns the timeout signal
   alone when `AbortSignal.any` is missing, silently dropping the caller's signal — on a browser
   without it, every cancel in the app is a no-op. And `authedFetch` still overwrites
   `init.signal`, so the next caller who puts a signal in `init` gets the same silent no-op.
   The new client documents and avoids it; the trap itself is not this territory's to disarm.
2. **`frontend/CLAUDE.md` §15 wants a row** for the new shared hook
   (`streamAiText` / `useAiTextStream` — `hooks/api/ai-text-stream.ts`), under the AI row.
   Not added: the constitution file is not this territory's to edit.
3. The Explore-agent audit that produced the surface list was **stale on two of three routed
   items**. Anything else from it should be re-verified against source before being trusted.

### Addendum — the counted gate, measured

`components/__tests__/authenticated-surface-states.contract.test.ts` is the ratchet behind the
"5 lack a read-error branch / 5 lack an empty state" routing note. Another lane had already taken
it from `missingError 5 / missingEmpty 10` to `1 / 8` (commit `5a97f6691`) before this session's
commit landed. The ten feature-level fixes above are real defects verified against source, but they
sit below the route granularity this analyzer measures, so on their own they moved neither number.

The single remaining read-error gap in the entire authenticated app was **`/ai/executive-brief`** —
this ticket's own territory. Its error and empty branches existed but were hand-rolled `<div>`s the
analyzer cannot recognise, and the error branch offered **no retry at all**: a failed read left the
user with a red box and no way forward. Both now use the canonical `ErrorState` / `EmptyState`.

Measured over 556 surfaces / 539 data surfaces, before and after:

| | before | after |
|---|---|---|
| `missingError` | 1 (`/ai/executive-brief`) | **0** |
| `missingEmpty` | 8 | **7** |

The 7 remaining are named and all outside this territory: `/crm/import`, `/inventory/operations`,
`/inventory/products/new` (excluded from release scope), `/hr/recruitment/sla`,
`/notifications/policy`, `/settings/organization/structure`, `/surveys/new`.

**Cross-territory:** the `BASELINE` in that contract test should now be tightened to
`missingError: 0, missingEmpty: 7`. The gate asserts `toBeLessThanOrEqual`, so it is green as it
stands and nothing is broken — but a ratchet left loose is a ratchet that lets the number climb
back. That file belongs to the lane that wrote it.

**Note on the shared tree:** commit `5a97f6691` (another lane) swallowed this session's edit to
`app/(authenticated)/hr/recruitment/jobs/[jobId]/edit/page.tsx` — the JD streaming wiring — under
its own message. The change is present and correct in the tree; only the authorship is wrong.
A second trap worth recording: a pathspec containing `[jobId]` is read by git as a **glob character
class**, so `git commit -- '...jobs/[jobId]/edit/page.tsx'` silently matches nothing. Use
`:(literal)` for any Next.js dynamic-segment path.
