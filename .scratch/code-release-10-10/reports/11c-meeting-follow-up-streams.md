# 11c — `/ai/meetings/follow-up/stream` exists, and the calendar panel consumes it

**Tickets:** 11 (ASSIGNABLE **A-6**, closed) · 13 (box 3, streaming half)
**Territory:** backend `src/modules/ai/**` · frontend `features/calendar/meeting-follow-up-panel.tsx`
**Date:** 2026-09-03 (S10)

---

## The gap, restated from the source rather than from the tickets

Two agents independently found the same thing and neither could act on it, because it spanned a
boundary neither owned:

- `features/calendar/meeting-follow-up-panel.tsx` called the buffered `useMeetingFollowUp`. It had **no
  Stop control at all** — the user watched a skeleton for the whole answer — and its only failure
  handling was `toast.error(getErrorMessage(error))`, so a 402 (top up) and a 503 (back off) were the
  same red toast.
- It could not be converted from the frontend, because **`/ai/meetings/follow-up` had no `/stream`
  sibling.** Verified at head before touching anything: `src/modules/ai` exposed **10** streaming routes,
  `meetings-ai.controller.ts:83` carried `@Post("prep/stream")`, and there was no `follow-up/stream`. The
  only streamed follow-up in the codebase was `/ai/crm/meeting-follow-up/stream` on `CrmAiController`,
  which is CRM and out of release scope.

## What was built

### Backend — one route, copying `prep/stream` rather than inventing a second convention

`POST /ai/meetings/follow-up/stream` on `MeetingsAiController`. Everything it inherits, it inherits from
the same place the prep stream does: `@RequirePermission("calendar:ai:use")`, `@UseRateLimit("ai:invoke")`,
`@NoTenantTransaction()` and `AiRequestAbortInterceptor` from the controller class; `respondWithAiTextStream`
for the deadline, the disconnect signal, the awaited pipe and the `HttpException` passthrough that keeps a
402 a 402; `@Validate({ body: meetingFollowUpBodySchema })` (already `.strict()`); the `x-ai-sources` header
for citations ahead of the body.

**Credit metering is the same call, not a similar one.** `MeetingsPrepService.streamFollowUp` goes through
`AiGatewayService.streamTextWithUsage` with `charge: true` and `feature: "meetings.follow-up"` — the key
the buffered `draftFollowUp` already uses, priced at 1 milli-credit in `ai-cost-catalog.ts`. Reservation,
breaker, concurrency cap and settlement are therefore identical to the buffered sibling's by construction.
A spec asserts the streamed and buffered feature keys and `charge` flags are **equal to each other**, so
the streamed route cannot start metering differently from the one beside it.
`pnpm -s check:ai-charge`: 127 → **128** invocations, `streamTextWithUsage` 9 → **10**, all declaring
`charge`, exit 0.

**Cancellation.** The route's abort signal is threaded to the provider call, asserted directly
(`expect(opts.signal).toBe(controller.signal)`), and bite-proved by removing it.

**Cross-tenant is 404, never 403.** `loadFollowUpEvent` → `loadEvent` filters on `orgId`, so another
tenant's event id raises `NotFoundException`. The spec asserts the rejection **is** a `NotFoundException`
and is **not** a `ForbiddenException`, and that no paid call was dispatched.

**The prompt is shaped so a partial line still parses.** `followUpStreamPrompt` asks for `## Subject` /
`## Email` / `## Action items` / `## Next meeting`, with each action item written as
`- <task> | owner: <name or unassigned> | due: <date or none>`. Owner and due are read **by label**, not by
position, which is what lets a half-arrived item refine in place. Both follow-up prompts now share one
`followUpContextBlock`, so the buffered and streamed drafts cannot drift onto different descriptions of the
same meeting.

**Sources are assembled, never asked of the model:** event, attendees, plus the organizer's own notes and
supplied action items — the inputs the draft is actually derived from. Long notes are capped to a
160-character snippet so one transcript cannot crowd the 4 KB citation header.

`ai-stream-route-contract.spec.ts`'s ratchet moved **10 → 11** in the same change, so the route count
cannot silently regress.

### Frontend — streaming into a structured renderer, which is the real work

The panel renders a `FollowUpDraft` (subject, body, `actionItems[]`, `nextMeetingDate`), **and** must hand
that same draft to `POST /ai/meetings/follow-up/propose-send`. So the stream has to be folded back into a
`FollowUpDraft` on every token, not just displayed.

`features/calendar/meeting-follow-up-stream-parse.ts` reuses the approach
`meeting-prep-stream-parse.ts` established rather than adding a second parser — a pure function of the
text received so far, with the same heading-withholding rule (a half-typed `## Ema` never flashes into the
previous section) and the same bullet-marker rule (`- ` alone never renders as an item reading "-").

Two consequences that are tested, not hoped:

- the send posts the **reconstructed** draft, including `{ item, assignee, dueDate }` per action item;
- a stream stopped before the email arrived is **not sendable** — its `propose-send` body would 400 — so
  the send control is disabled rather than offered a click that cannot succeed.

Placeholders the model emits (`owner: unassigned`, `due: none`, `N/A`) are read as **absent**, so no item
ever renders an owner literally named "unassigned".

The panel is now a five-state machine (idle · streaming · cancelled · done · failed) with a Stop button,
partial output kept on cancel, `AiDraftCard citationsPending` while `x-ai-sources` is in flight, and
`AiFailureBody` for the failure branch — where a **non-retryable** failure (quota, denied) gets no dispatch
control at all.

### What was deliberately NOT deleted

`POST /ai/meetings/follow-up` and `useMeetingFollowUp` both stay. The buffered route's product is a
Zod-validated record this release does not stream, and a previous pass removed a buffered hook before its
surface had moved and broke the live panel (frontend commit `ba401a949`). Its last caller moving to the
stream turned `check:dead-code` red, so the hook is now recorded there as an explicit **KEEP** verdict with
that reason — the honest way to keep a deliberately unwired export, rather than deleting it or leaving a
gate failing.

---

## Gates

### Backend

| Command | Exit | Result |
|---|---|---|
| `npx jest --runInBand --testPathPattern="meetings-follow-up-stream\|meetings-prep-stream\|ai-stream-route-contract"` | 0 | 3 suites / **25 tests** |
| `npx jest --runInBand --testPathPattern="modules/ai"` (via `heavy.sh 2`) | 0 | **60 suites passed / 1 skipped · 544 passed / 21 skipped** |
| `pnpm typecheck` (8 GB heap, `heavy.sh 2`) | 2 | **1 error, 0 under `src/modules/ai/`** — `hr/config/hr-handbook.service.ts:105`, another territory |
| `pnpm check:spec-typecheck` | 2 | same 1 error, **0 under `src/modules/ai/`** |
| `npx eslint` on the 5 changed/added files | 0 | 0 findings |
| `pnpm -s check:ai-charge` | 0 | 128 invocations, all declare `charge` |
| `check:route-classification` · `route-duplicates` · `authz-deny` · `contract-registry` · `openapi-coverage` · `operation-ids` | 0 | unchanged |
| `pnpm -s check:file-sizes` | 1 | **not mine** — `clients/client-accounts.service.ts` 505 lines, another agent's in-flight edit; this gate was exit 0 when S10 started |

### Frontend

| Command | Exit | Result |
|---|---|---|
| `jest --runInBand --testPathPattern="meeting-follow-up"` | 0 | 2 suites / **23 tests** |
| `pnpm type-check` (`heavy.sh 2`) | 0 | **0 errors** |
| `npx eslint` on the 7 changed/added files | 0 | 0 findings |
| `pnpm -s check:dead-code` | **1 → 0** | the KEEP verdict for `useMeetingFollowUp` |
| `pnpm -s check:over-300` | 0 | **519 / baseline 519** (was exit 1 at 521 when S10 started) |
| `check:query-signal` · `empty-states` · `colors` · `icon-labels` · `effect-fetches` | 0 | unchanged |
| `pnpm -s check:file-sizes` | 1 | **not mine** — `hooks/api/notifications-inbox.{ts,test.ts}`, unchanged by this work |

**Not run:** `next build`, seeded e2e, any database work. No `psql` was executed in this session.

---

## Bite proofs

All in a hermetic `git archive HEAD` tree; the shared working tree was never modified, and every restored
file was sha256-compared to the live one afterwards.

### Backend — baseline 25 passed

| Mutation | Result |
|---|---|
| `streamFollowUp` charges `false` | **2 failed / 23 passed** — "dispatches ONE paid streaming call…", "bills the same feature key as the buffered sibling…" |
| the abort signal is not passed to `streamTextWithUsage` | **1 failed / 24 passed** — "hands the route's abort signal to the provider call…" |
| the streamed route meters under `meetings.prep` instead | **2 failed / 23 passed** — the same two |
| the `follow-up/stream` route deleted from the controller | **1 failed / 24 passed** — "every streaming route goes through the one shared helper" |

Restored: 25 passed. `meetings-prep.service.ts` sha256 `e9376788…`, `meetings-ai.controller.ts` sha256
`a90aaef5…`, both byte-identical to the live tree.

### Frontend — baseline 23 passed

| Mutation | Result |
|---|---|
| transport points back at the buffered `/ai/meetings/follow-up` | **2 failed / 21 passed** |
| `signal` dropped from the transport | **4 failed / 19 passed** (Stop, unmount, single-flight, send-disabled) |
| `onHeaders` dropped | **2 failed / 21 passed** (citations before the body, Stop-keeps-citations) |
| action items read by position instead of by label | **5 failed / 18 passed** |

Restored: 23 passed. `hooks/api/meetings-ai.ts` sha256 `a4aaacf6…`, identical to the live tree.

---

## Cross-territory findings — found, NOT fixed

### 1. The AI-credit first-purchase race is real, and every streaming route reaches it

`src/modules/billing/core/ai-credits-reservation.service.ts` — **not this territory.**

```
let [wallet] = await tx.select().from(orgAiCredits).where(eq(orgAiCredits.orgId, orgId)).for("update");
if (!wallet) { ...insert the wallet with the trial grant... }
```

`FOR UPDATE` locks **nothing** when the row does not exist, so two concurrent first AI calls in a
brand-new org both see no wallet and both INSERT. The recovery arm is
`if (isUniqueViolation(err) && idempotencyKey)`, and `AiGatewayStreamHelper.run` reserves with **no**
`idempotencyKey` (`{ orgId, userId, feature, credits }`) — so the loser's `23505` escapes as a 500 rather
than resolving to the winner's wallet. This is pre-existing and affects every metered AI route, buffered
and streamed; the route added here inherits it and does not worsen it. The fix belongs in `billing/core/`
(an `ON CONFLICT (org_id) DO NOTHING` insert-then-reselect, or an advisory lock on the org id taken before
the select) and was not attempted from this territory.

### 2. R-3b is now cheaper to decide, and the decision is still product's

This session added the follow-up stream to `MeetingsAiController` — the family the **live** calendar
surfaces call. `CrmAiController`'s parallel `/ai/meeting-prep{,/stream}` and `/ai/crm/meeting-follow-up/stream`
family now has one live caller in `features/crm/**` (excluded) and none elsewhere. Retiring one of the two
families is a product decision (ticket 11, R-3b), not a code question, and nothing here presumes it.

### 3. `hr/config/hr-handbook.service.ts:105` fails `tsc`

`error TS2345: Argument of type 'HandbookUpdateData' is not assignable to parameter of type
'Record<string, unknown>'`. Present on both `typecheck` and `check:spec-typecheck`, in another territory,
and the only error in either run.

### 4. Territory note — three files touched beyond the two named paths

Stated rather than buried:

- `frontend/hooks/api/meetings-ai.ts` — **additive only**: `streamMeetingFollowUp` +
  `MeetingFollowUpStreamRequest` + `MEETING_FOLLOW_UP_STREAM_PATH`, placed beside the identically-shaped
  `streamMeetingPrep` because putting the transport anywhere else would have been the second streaming
  convention the brief forbids. `readMeetingPrepSources` → `readMeetingSources` (no external caller; both
  routes share the header). **Nothing deleted.**
- `frontend/scripts/check-dead-code.mjs` — one KEEP verdict line, required to keep that gate green while
  honouring "do not delete the buffered hook".
- `frontend/features/calendar/meeting-follow-up-{draft.tsx,stream-parse.ts}`, `meeting-stream-test-harness.ts`
  and two test files — new siblings of the panel. The panel reached **502 lines** with the conversion
  inline, over the 500 hard limit and a new `check:file-sizes` failure, so the draft rendering was
  extracted (panel now 412). `meeting-stream-test-harness.ts` exists because the panel test at 371 lines
  pushed `check:over-300` above baseline; extracting it put both files under 300 and the gate back to
  519/519. `features/calendar/meeting-prep-panel-streaming.test.tsx` carries a near-identical inline
  harness and could adopt this one — not done, as that file belongs to another lane's proof.

---

## Commits

| Repo | SHA | Files |
|---|---|---|
| `streamlineos-backend` | **`dfb5f4e8`** | `meetings-ai.controller.ts` · `meetings-prep.service.ts` · `meetings-prep-prompt.ts` · `meetings-follow-up-stream.spec.ts` (new) · `ai-stream-route-contract.spec.ts` |
| `streamlineos-frontend` | **`795629abc`** | `meeting-follow-up-panel.tsx` · `meeting-follow-up-draft.tsx` (new) · `meeting-follow-up-stream-parse.ts` (new) · `meeting-stream-test-harness.ts` (new) · 2 test files (new) · `hooks/api/meetings-ai.ts` · `scripts/check-dead-code.mjs` |

Both committed by explicit file pathspec on `git commit`; `git show --stat HEAD` confirmed 5 and 8 files
respectively, all mine. Neither was pushed.
