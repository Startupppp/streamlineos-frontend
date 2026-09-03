# 11b / 13 / 26 — the meeting-prep panel now streams (S8, 2026-09-03)

## What was actually open

Ticket 11's box 1 named one piece of reachable work: `features/calendar/meeting-prep-panel.tsx` called the
buffered `useMeetingPrep`. Verified before touching anything, by grep across `app features hooks lib components`:

- `streamMeetingPrep` — **0 callers**. The "2 callers" ticket 11 recorded for `meetings prep/stream` were the
  hook file's own definition and its own path string. The route reached no user.
- `useMeetingPrep` — exactly 1 caller, the panel.

## What changed (all in this territory)

| File | Change |
|---|---|
| `frontend/features/calendar/meeting-prep-stream-parse.ts` | NEW. Pure progressive parser: text-so-far → the four sections `agendaStreamPrompt` asks for. |
| `frontend/features/calendar/meeting-prep-stream-parse.test.ts` | NEW. 11 tests, including every prefix of a real answer. |
| `frontend/features/calendar/meeting-prep-agenda.tsx` | NEW. The structured rendering, each branch guarded on its own content. |
| `frontend/features/calendar/meeting-prep-panel.tsx` | Rewritten onto the stream: idle · streaming · cancelled · done · failed, with Stop. |
| `frontend/features/calendar/meeting-prep-panel-streaming.test.tsx` | NEW. 10 tests through the real client. |
| `frontend/hooks/api/meetings-ai.ts` | `streamMeetingPrep` gains `onSources`; `useMeetingPrep` + 3 result types deleted (0 callers). |
| `frontend/hooks/api/ai-text-stream.ts` | `onHeaders` callback + `run()` escape hatch. |

**Why `onHeaders` was needed.** The backend puts citations on `x-ai-sources` *before* the body precisely so a
truncated stream keeps them. The shared client returned `headers` only on the `completed` outcome, so a cancelled
stream threw them away — the exact case the header exists for. `onHeaders` fires the moment the response is OK.

**Why `run()` rather than a second single-flight guard.** `useAiTextStream().stream` takes a raw path and body.
The panel's transport is typed (`streamMeetingPrep`). `run(produce)` exposes the same controller, in-flight ref
and unmount teardown to any producer, and `stream` is now implemented in terms of it. No behaviour changed for
the existing callers (JD, surveys, `useAskAI`).

**Structured rendering preserved.** The user still sees agenda prose, key-topic chips, a suggested duration and
preparation notes — reconstructed from the received prefix on every token, not waited for.

## Gates run, output read

| Command | Result |
|---|---|
| `pnpm -C frontend type-check` (via `heavy.sh 2`) | **exit 0, 0 errors** |
| `npx eslint` on all 7 changed/added files | **exit 0**, 0 findings |
| `npx jest --runInBand --testPathPattern="meeting-prep"` | **exit 0 — 2 suites / 21 tests** |

## Bite proofs — hermetic `git archive HEAD` tree, never the shared working tree

Baseline in that tree: 21 passed.

| Mutation | Result |
|---|---|
| transport pointed back at buffered `/ai/meetings/prep` | **1 failed / 9 passed** — "posts to the /stream route and never to the buffered sibling" |
| `signal` dropped from the transport | **3 failed / 7 passed** — Stop-aborts, unmount-aborts, no-second-paid-stream |
| `onHeaders` dropped from the shared client | **2 failed / 8 passed** — both citation assertions |

Restored: 21 passed. Live tree verified byte-identical afterwards — `hooks/api/meetings-ai.ts` sha256
`e93e70ee09b24b25c2a81b254f40ab61b8d951a35eef15481660616392912ddb`, `hooks/api/ai-text-stream.ts` sha256
`b920a55d96b56488c31ef8e540fffa2abdc0d5b4d80ddf7e0061ab4e8bda1211`.

## Three defects the tests found, all fixed

1. **A topic chip reading "-".** A bullet marker arrives before its text, so `- ` existed for a frame and
   `toTopic` left the bare marker; the chip appeared and then vanished. Found by a monotonicity assertion over
   every prefix, not by reading. `BULLET` now strips a marker at end of line.
2. **Every source rendered twice** — `AiDraftCard`'s citation row *and* a second "Sources" block the panel
   carried over from the buffered version. The block is gone; the card owns citations, including the pending
   skeleton.
3. **A 402 offered "Try again" beside the top-up link.** A non-retryable failure now gets **no** dispatch
   control at all; a 503 still gets both a retry and the form.

## Cross-territory findings

**Ticket 13's "4 blocked on another territory" is not blocked.** `useAIScoreLead`, `useAIAttritionRisk`,
`useNLSearch` (`hooks/api/ai.ts`) and `useKbPageAsk` (`hooks/api/kb/page-ai.ts`) take a bare scalar, and the
ticket records that threading them needs a call-site change in `features/**`. It does not. A union
`TVariables` — `T | ({ value: T } & AiAbortInput)` with a `readAiAbortableScalar` normaliser beside
`AiAbortInput` — keeps `mutate(5)` legal and lets a Stop-owning surface pass `{ value, signal }`. **Zero**
call-site edits. Drafted and then reverted unbuilt when the battery warning landed; not implemented, not
claimed.

**`features/calendar/meeting-follow-up-panel.tsx` still buffers and cannot be converted from the frontend.**
It calls `POST /ai/meetings/follow-up`, which has **no `/stream` sibling**. The streamed follow-up that exists
is `POST /ai/crm/meeting-follow-up/stream` on `CrmAiController`, whose only caller is in the excluded
`features/crm/**`. Converting the calendar surface needs a backend change in `src/modules/ai/**` — either a
`/stream` sibling on `MeetingsAiController`, or a decision that the two route families are duplicates.

## Ticket 26 — NOT MEASURED

A production build was started (`NEXTAUTH_SECRET=<44-char local placeholder> npx next build` through
`heavy.sh 2`, `NODE_OPTIONS=--max-old-space-size=6144`). It compiled ("✓ Compiled successfully in 11.5s"),
reached "Running TypeScript …" and was killed at ~15% battery. **No `BUILD_ID` was produced.**

**`frontend/.next` is left incomplete.** The previous build `4LuMJdkchN7tMbNJc04IH` (2026-09-02 23:23) was
overwritten. Anyone reading `.next` must build first.

Nothing in ticket 26 was ticked or changed. Two notes for the next agent:

- `measuredTotalBytes` **is** governed — `defaults.maxTotalBytes` = 1 048 576 — and every route is inside it,
  the closest being `/chat` at 989 423 B (94%). Not vacuous, but loose.
- **Unsettled, deliberately not guessed:** `components/layout/header/org-switcher.tsx` imports
  `@/features/settings/organization/leave-organization-control` twice — statically (line 25,
  `LeaveOrganizationMenuItem`) and through `dynamic(() => import(...))` (line 28, `LeaveOrganizationDialog`).
  Whether the `dynamic()` defers anything once the module is already in the static graph is a webpack question
  only a finished build answers. Both files are outside this session's territory in any case.
