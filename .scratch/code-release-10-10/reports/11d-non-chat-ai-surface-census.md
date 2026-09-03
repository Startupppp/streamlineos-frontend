# 11d — Non-chat AI surfaces: the structural census, measured from the user inward

**Session S13, 2026-09-03.** Ticket 11, box 1. This report closes the **structural** half of the box
and states plainly that the **timing** half was not measured, and why.

## Load at the start of this session — the reason no latency number appears below

```
$ uptime
11:49  up 19:15, 2 users, load averages: 3.50 4.01 4.53
$ sysctl -n hw.ncpu
15
```

Roughly eight agents are running concurrently and the load average has sat at 4-6 all session. A
first-byte or dispatch-overhead number captured under that contention is not evidence of anything,
so **none was taken**. The timing half of this box is deferred to the quiescing pass, and the
surfaces whose numbers are outstanding are named in §6.

## 1. How the surfaces were enumerated

Previous sessions on this ticket counted **backend routes**. That is the wrong denominator for a
box that says "surfaces stream rather than buffering": a route with no caller is not a surface, and
a route with two callers is one surface if only one is a component. This census is built the other
way round, from the user inward, in three hops:

1. **Every gateway call site, with its enclosing method.** Walk `src/**` (excluding `__tests__` and
   `*.spec.ts` and the gateway's own definitions) for
   `.invokeText | .invokeTextWithUsage | .invokeStructured* | .streamTextWithUsage |
   .embedQueryWithCredit | .embedBatchWithCredit`, and attribute each hit to the class member that
   encloses it. **122 (file, method) pairs across 54 files.**
2. **Method to route.** For each prose-producing method, find the controller that calls it and read
   the `@Controller` prefix plus the nearest preceding `@Get/@Post/...` path.
3. **Route to a component a human can reach.** Grep the frontend for the route path (params
   wildcarded), then take the *second* hop from the hook's exported symbol to a `.tsx` under
   `app/ features/ components/`, excluding tests. **This second hop is the one that matters** — S8
   already recorded that a route can look adopted because the hook file and its own path string
   count as two "callers" while no component calls the hook at all.

Scripts used are in the session scratchpad; the commands are reproduced in §5.

## 2. The kinds, and which kind can stream at all

| kind | count | streams? |
|---|---|---|
| `invokeStructured*` | 70 | **No, on principle.** The product is a Zod-validated object; `{"score": 7, "reas` is not renderable partial state, and emitting it would have to bypass the `.strict()` boundary validation. Excluded, and this census does not reopen that. |
| `invokeText` / `invokeTextWithUsage` | 43 | Yes where a human waits on the prose. |
| `streamTextWithUsage` | 10 | Already streaming. |
| `embed*` | 6 | N/A — no prose. |

Two `invokeText` sites do not sit under a class member and so are absent from the method map:
`kb/retrieval/kb-research-brief.graph.ts` (a LangGraph node) and
`automation/ai-workflow-nodes/ai-node-executor.service.ts` (a workflow executor). Neither has a
human waiting on it; both are recorded here rather than left as an unexplained discrepancy.

## 3. Per-surface verdict — every non-chat AI surface a user can actually reach

"Surface" = a component under `app/`, `features/` or `components/` that dispatches a prose-producing
AI call and renders the result to the person who triggered it. `maxTokens` is the output ceiling
declared at the gateway call site.

### 3a. STREAMS today — 4 surfaces

| Surface | Route | maxTokens |
|---|---|---|
| `app/(authenticated)/hr/recruitment/jobs/[jobId]/edit/page.tsx` | `POST /ai/generate-jd/stream` | — |
| `features/surveys/builder/tabs/results-tab.tsx` | `POST /ai/surveys/:surveyId/summarize-responses/stream` | — |
| `features/calendar/meeting-prep-panel.tsx` | `POST /ai/meetings/prep/stream` | — |
| `features/calendar/meeting-follow-up-panel.tsx` | `POST /ai/meetings/follow-up/stream` | — |

Verified by the second hop, not by the path grep: `useGenerateJobDescription` is imported by the JD
edit page, `streamSurveyResponseSummary` by `results-tab.tsx`, and both calendar panels are mounted
by `features/calendar/event-detail-sheet.tsx`. The chat assistant
(`hooks/api/chat-ai-assistant.ts` -> `POST /chat`) also streams and is out of scope by the box's own
wording.

### 3b. BUFFERS today, in scope, and the output is prose a client could append

| Surface | Route(s) | feature key | maxTokens |
|---|---|---|---|
| `features/wiki/components/kb-page-ai-actions.tsx` | `POST /kb/pages/:pageId/ai/summarize` | `kb.page-summarize` | 512 |
| " | `.../ai/ask` | `kb.page-ask` | 512 |
| " | `.../ai/improve` | `kb.page-improve` | **1024** |
| " | `.../ai/suggest-related` | `kb.page-suggest-related` | 384 |
| `features/help-centre/components/kb-article-ai-actions.tsx` | `POST /kb/articles/:articleId/ai/summarize` | `kb.article-summarize` | 512 |
| " | `.../ai/ask` | `kb.article-ask` | 512 |
| " | `.../ai/improve` | `kb.article-improve` | **1024** |
| " | `.../ai/suggest-related` | `kb.article-suggest-related` | 384 |
| `features/wiki/components/knowledge-base-page.tsx`, `components/support/kb-ask-panel.tsx` | `POST /kb/ask` | `kb.ask` | **1024** |
| `features/support/inbox/ticket-ai-panel.tsx`, `.../ticket-detail-header.tsx` | `POST /support/:ticketId/ai/suggest-reply` | `support.reply` | **1024** |
| `features/timesheets/my-time/my-time-view.tsx`, `.../approvals/approval-detail-sheet.tsx` | `POST /timesheets/periods/:periodId/ai/summarize` | `timesheets.period-summary` | 512 |
| `features/timesheets/billing/invoice-draft-dialog.tsx` | `POST /timesheets/ai/billing-narrative` | `timesheets.billing-narrative` | 600 |
| `features/timesheets/reports/reports-view.tsx` | `POST /timesheets/ai/reports-narrative` | `timesheets.reports-narrative` | 500 |
| `features/timesheets/approvals/approval-detail-sheet.tsx` | `POST /timesheets/periods/:periodId/ai/rejection-reason` | `timesheets.rejection-draft` | 220 |
| `features/timesheets/my-time/log-time-sheet.tsx` | `POST /timesheets/ai/describe-entry` | `timesheets.describe-entry` | 200 |
| `features/sign/builder/envelope-ai-menu.tsx` | `POST /sign/envelopes/:envelopeId/ai/summarize` | `sign.summarize-document` | 600 |
| `features/chat/use-message-panel-data.ts` | `POST /chat/channels/:channelId/summarize` | `chat.summarize` | 600 |
| `features/payroll/ess/components/ess-payslips-section.tsx` | `POST /payroll/me/payslips/:publicationId/ai/explain` | `payroll.explain-payslip` | 400 |

### 3c. BUFFERS, and stays buffered — with the reason, per surface

| Surface | Route | Why it stays buffered |
|---|---|---|
| `features/build/ai/summary-card.tsx`, `project-ai-menu.tsx`, `ai-chat-panel.tsx` | `POST /ai/projects/:projectId/{summary,ask}` and six siblings | **`invokeStructured`, all eight.** `pm.summary`, `pm.risks`, `pm.client-update`, `pm.plan`, `pm.extract-tasks`, `pm.ask`, `pm.weekly-update`, `pm.change-impact` return validated objects. The largest AI output in the product (`pm.plan`, 1536 tokens) is structured, not prose. |
| `features/support/inbox/reply-improvement-section.tsx` | `POST /support/ai/improve-reply` | `invokeStructured` (`support-ai-translation.service.ts::improveReply`). |
| `features/accounting/overview/insights-strip.tsx` | `GET /accounting/insights/digest` | `invokeStructured` (`explainVariance`, `explainReconciliation`, `extractDocument`). |
| mail compose / inbox summary | `POST /mail/ai/{draft,inbox-summary}` | `invokeStructured` / `invokeStructuredWithUsage`. |
| `features/build/ai/ticket-detail-ai.tsx`, `create-ticket-ai-menu.tsx` | `.../improve-description` ×2 | The output is an HTML fragment for a TipTap/ProseMirror editor. A partial fragment is unbalanced markup — "only valid when complete", same class as a half-parsed object. |
| `app/(authenticated)/ai/executive-brief/page.tsx` | `POST /ai/executive-brief/generate` | The route's product is a stored snapshot that `GET /ai/executive-brief` reads back. Streaming it needs a second post-stream persistence path. |
| `components/support/kb-ask-panel.tsx` `mode="public"` | `POST /public/kb/ask` | `mode="public"` still has **zero call sites**; `app/(public)/**` is frozen this release. Streaming it wires an unreachable branch. |
| `features/inventory/**` (6 files) | `/inventory/ai/*` | **Inventory is excluded from this release.** |
| `features/crm/**` | `/ai/crm/*` | **CRM is excluded from this release.** |
| blog admin, `/ai/account-summary`, `/ai/report-narrator` | 5 `/stream` routes | **No AI affordance exists in any component.** Wiring these is building a product surface, not adopting a stream. Unchanged residual R-3. |

## 4. The finding this census adds: the 30 s client cap is a live defect on four buffered surfaces

`lib/api-client.ts` arms a client-side abort on every buffered `authedFetch`. Ticket 13 raised it to
180 s **for streams only**; every **buffered** metered AI call is still capped at **30 s**, against
backend deadlines of 60 s (`AI_TEXT_STREAM_DEADLINE_MS`) and 120 s (`AI_REQUEST_DEADLINE_MS`).

A buffered call shows the user nothing until the last token, so its wall clock is the *whole*
generation. The four in-scope buffered surfaces that declare a **1024-token** output ceiling are the
ones that can cross 30 s on an ordinary generation:

- `kb.page-improve` — `features/wiki/components/kb-page-ai-actions.tsx`
- `kb.article-improve` — `features/help-centre/components/kb-article-ai-actions.tsx`
- `kb.ask` — `features/wiki/components/knowledge-base-page.tsx`, `components/support/kb-ask-panel.tsx`
- `support.reply` — `features/support/inbox/ticket-ai-panel.tsx`, `ticket-detail-header.tsx`

On those, a long generation is aborted **by the client** and surfaces as a failure the user is
invited to retry — which reserves and spends again for an answer the server was already producing.
**This is the strongest argument in the box for streaming**, because a streamed surface has no such
exposure: its first byte arrives in milliseconds and the client's timeout never approaches the
server's deadline. It is also the argument for the four 500-600 token surfaces, which sit close
enough to the cap to be at risk on a slow provider.

Raising the buffered cap generally is an API-wide decision over 601 routes and belongs to
`lib/api-client.ts` / platform — recorded, not taken, here.

## 5. Commands

```
# hop 1 — gateway call sites with enclosing method (122 pairs, 54 files)
grep -rn '\.invokeText\(WithUsage\)\?(\|\.invokeStructured[A-Za-z]*(\|\.streamTextWithUsage(\|\.embed[A-Za-z]*WithCredit(' \
  src --include='*.ts' | grep -v '__tests__\|\.spec\.ts\|/gateway/'

# hop 2 — method to controller route (scripted; @Controller prefix + nearest preceding verb)

# hop 3 — route to hook, then hook symbol to component
grep -rlE '<route with :params wildcarded>' --include='*.ts' --include='*.tsx' app features hooks lib components \
  | grep -v '\.test\.\|__tests__\|\.spec\.'

# streaming clients in the frontend, whole repo
grep -rln 'streamAiText\|useAiTextStream\|body\.getReader\|TextDecoderStream' \
  --include='*.ts' --include='*.tsx' app features hooks lib components | grep -v '\.test\.\|__tests__'
#  -> features/calendar/meeting-follow-up-panel.tsx, features/calendar/meeting-prep-panel.tsx,
#     features/calendar/meeting-stream-test-harness.ts, features/notifications/notification-event-stream.ts,
#     hooks/api/ai-text-stream.ts, hooks/api/ai.ts, hooks/api/chat-ai-assistant.ts,
#     hooks/api/meetings-ai.ts, hooks/api/surveys/survey-ai.ts

# every streaming route in the repo, and where they live
grep -rn '@\(Post\|Get\)("[^"]*stream[^"]*")' src --include='*.controller.ts'
#  -> 11, ALL of them under src/modules/ai/. Zero outside it.
```

## 6. What is deferred, and to what

**TIMING — NOT MEASURED THIS SESSION.** `ai.stream.first-byte.app` (budget 150 ms p95, threshold
112 ms) and `ai.stream.dispatch.overhead` (budget 50 ms p95, threshold 37 ms) are declared in
`src/modules/ai/core/telemetry/ai-stream-budgets.ts` and were last measured in S5 under unknown
load. They must be re-measured on a quiet machine, and the run should cover the surfaces converted
since S5 as well as the two S5 measured. Outstanding surfaces for that pass:

- `/ai/meetings/prep/stream`, `/ai/meetings/follow-up/stream` (S8/S10, never timed)
- every route converted by this session (§7 of report 11e)
- `/ai/generate-jd/stream`, `/ai/surveys/:surveyId/summarize-responses/stream` (S5 numbers, re-take)

Tickets 22 and 23 are being held for the quiescing pass; these numbers should ride along with them.
**No contended number from this session is quoted as release evidence anywhere.**
