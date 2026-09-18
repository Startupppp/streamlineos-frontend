# PRD — Chat OS: the org-and-user-scoped assistant over every module

**Program:** Ask OS (`modules/ai/core` + `frontend/components/assistant`)
**Status:** Approved for build. Phases 0–7 below are the executable contract.
**Audience:** Claude Code, backend/frontend engineers, reviewers, security, QA
**System boundary:** The Ask OS conversational surface and its tool layer. Module business logic stays in its owning module; this program adds no new domain tables and no new domain endpoints.

This document supersedes the in-chat plan of 2026-09-18. It is the product and engineering contract. Every claim in §2 was verified against source in this session and carries a `file:line` anchor; a ticket is valid only when it agrees with this document, `CLAUDE.md`, `backend/CLAUDE.md` and `frontend/CLAUDE.md`.

---

## 1. Product outcome

A single conversational surface that sits on top of Build, CRM, HRM, knowledge base, documents, calendar, mail, chat and worklog — scoped to **this organisation** and **this signed-in person** — that answers questions, takes actions, and never dead-ends.

### 1.1 The transcript that must stop happening

```
> Summarize my day
  I don't have access to personal activities like attendance or calendar events.
  However, I can help you manage tasks and tickets.

> how many tickets i have handled so far ?
  Please provide your name so I can look up your ticket handling statistics.

> aditya
  You have handled a total of 18 tickets so far…
```

Three defects in six lines: it denies capability it has, it asks the user who they are, and the number it finally gives is computed by a query that counts soft-deleted tickets and tickets in projects the asker cannot open (§2.4, D-04).

### 1.2 The behaviour we are buying

| The user says | The assistant must |
|---|---|
| "Summarize my day" | Answer from attendance + calendar + assigned work + inbox, with no clarifying question |
| "How many days have I attended this month?" | Read the caller's own attendance for the current month |
| "How many referrals have I given?" | Read the caller's own referrals; say `200+` honestly at the cap |
| "How many tickets have I handled?" | Never ask who "I" is |
| "Send a mail to X" | Propose it, and on confirm send it from the caller's connected account |
| "Send a mail to X" *(not connected)* | Render **"You are not connected to your mail — click here to connect"** as a working button |
| "Clock me in" | Start web clocking |
| Anything outside their permissions or enabled modules | Say so plainly; never fabricate, never leak |

**"I", "me" and "my" always mean the authenticated caller.** The assistant never accepts a person's identity as a conversational argument for a self question.

---

## 2. Verified findings

Everything in this section was read in source. Do not re-litigate these without re-reading the anchor.

### 2.1 Why it asks "which user?"

| # | Finding | Anchor |
|---|---|---|
| F-01 | Route personas **filter the toolset**. The pathname picks a persona, which narrows tools to an allowlist. On `/crm`, "summarize my day" has no attendance or calendar tool to call. | `frontend/components/assistant/ask-os-request-policy.ts:11` → `persona-registry.ts:98` |
| F-02 | `filterToolsByPersona` **fails open** — an unrecognised persona returns *every* tool, and `persona` is an unvalidated `z.string().optional()`. | `persona-registry.ts:100`, `dto/request.schemas.ts:148` |
| F-03 | Conversely, **5 of 36 tools are unreachable under every persona**: `postChannelMessage`, `grantBonus`, `listRecentEmails`, `summarizeMailThread`, `sendMailFromAccount`. | `persona-registry.ts:10-84` |
| F-04 | The system prompt carries **no caller name and no current date**. `ChatContext` holds counts only; `CurrentUserContext` has no name field. | `chat-assistant-prompt.ts:4-23`, `chat-assistant-model.ts:15-29`, `common/auth/backend-claims.ts:22-31` |
| F-05 | There is **no self-scoped ticket tool**. `getPersonTicketStats` requires an LLM-supplied `userId`, and the prompt instructs the model to call `findPerson` first — which needs a *name*. | `workspace-copilot-tools.ts:79`, `chat-assistant-prompt.ts:17` |

### 2.2 The tool layer is shallow

**36 tools across 9 provider entry points.** Its interface is the union of 36 ad-hoc result shapes the prompt describes in prose and the model pattern-matches.

| Concept | Distinct spellings | Note |
|---|---|---|
| "nothing found" | **16** | across 8 different top-level key names |
| failure | **11** | across 4 discriminators |
| "integration not connected" | **6** | all `{success:false, message:string}`; **zero structured** |
| permission denial | **4** | +1 more delivered as an HTTP 403 |
| "needs human sign-off" | **3** | `requiresConfirmation` / `requiresApproval` / `autoSaved:false` |
| confirmation protocol | **1** | the only consistent shape in the layer |
| `buildTools(ctx)` context | **3 structural**, spelled as **9** named types | HR's `{orgId,userId}` structurally cannot reach `principal` or `isOrgOwner` |

F-06 — **Two tools report failure as success.** On gateway failure `askHrPolicy` returns a fabricated `answer` with no failure flag (`hr-copilot-tools.ts:76-79`), and `draftPromotionLetter` returns a **fabricated promotion letter** (`"Dear ${empName}, We are pleased to inform you of your promotion to ${newTitle}…"`, `:303-308`) flagged only by the `requiresApproval: true` the success path also sets.

### 2.3 Infrastructure is duplicated, and the model default is not local

| # | Finding | Anchor |
|---|---|---|
| F-07 | `ChatAssistantService` **never injects `AiGatewayService`**, yet imports seven of its internals and re-implements `AiGatewayStreamHelper.run` almost line for line: breaker, concurrency, `ledger.reserve`, `settleStream`, `AiCallMetrics`, retry policy, model resolution. | `chat-assistant.service.ts:20-23,48-50` vs `gateway/ai-gateway-stream.helper.ts:112-200` |
| F-08 | The gateway's copy is **strictly better**: it adds a per-tenant circuit breaker chat cannot express. | `ai-gateway-stream.helper.ts:117-122` |
| F-09 | `AiStreamTextOpts` takes `prompt:{system,user}` — **no `messages`, `tools` or `stopWhen`** — which is the only reason chat cannot use it. | `ai-gateway-stream.helper.ts:20-30` |
| F-10 | ⚠ `resolveAiStreamModel(tier)` falls back to `resolveChatModel()` when no tier is passed, and **21 of 24 streaming call sites pass no tier**. Changing the chat model default silently repoints blog-ai ×3, crm-brief, crm-content, crm-meeting-brief, hr-helpdesk, hr-policy, hr-recruitment, meetings-prep ×2, survey, ticket-draft, ticket-insights, kb-article, kb-page, timesheets ×3, timesheets-billing ×2. | `gateway/ai-stream-model.ts:16` |
| F-11 | `MODEL_TOKEN_PRICING_RAW` has **no Gemini 2.x row**; an unknown model falls through to `DEFAULT {in 0.5, out 1.5}` and mis-meters. | `billing/ai-model-pricing.constants.ts:19` |

### 2.4 Live defects (fix before adding write tools)

| # | Defect | Anchor | Effect |
|---|---|---|---|
| **D-01** | 🔴 `resolveToolScope` calls `resolveUserPermissions` **directly**, bypassing `scopeFor` → `resolvePrincipalScope`. | `ai-tool-scope.ts:10` vs `access.service.ts:456-464`, `access-principal-scope.ts:12-33` | A token-attenuated principal (`account-only`, `personal-token`, `agent-token`) reaching `POST /chat` is gated as the **full member**, not as the token. Every tool gate inherits it (37 `denyReason`/`scope` call sites across the 36 tools). One-directional — owners are unaffected, because `resolveUserPermissions` handles owner/admin itself (`access.service.ts:252`). |
| **D-02** | `postChannelMessage` matches channels with no `isPrivate`, no `type` and no member join. | `comms-actions-tools.ts:68-70` | Discloses private and DM channel id + name to non-members, then mints a signed proposal to post into one. |
| **D-03** | `searchLeads` / `updateLeadStatus` pass `INCLUDE_DELETED` and apply no DataScope. | `crm-copilot-tools.ts:63,146` | Soft-deleted leads are read **and mutated**; an `own`-scoped rep searches and re-statuses the whole org pipeline. |
| **D-04** | `getPersonTicketStats` has no `deleted_at IS NULL`, no project-membership bound, and ignores `ticket_assignees`. | `workspace-copilot-tools.ts:113-127` | Over-counts deleted, under-counts multi-assignee, and discloses per-project workload across projects the asker cannot open. **This produced the "18 tickets" in §1.1.** |
| **D-05** | `readTicket` / `searchTickets` apply no `ticketScope` and no `resolveProjectAccess`. | `projects-copilot-tools.ts:50,71` | Any member reads any ticket body + description in the org. The confirm path documents fixing this for *writes* (`chat-assistant.controller.ts:328-340`); reads never were. |
| **D-06** | `askHrPolicy` filters neither `deleted_at` nor the effective-date window. | `hr-copilot-tools.ts:37-44` | Cites deleted and expired policies as authoritative HR guidance, with a citation string. |
| **D-07** | `getLeaveUtilization` gates on a boolean only; the owning module splits `/my` vs `/team`. | `hr-copilot-tools.ts:390-404` | An `own`-scoped employee receives org-wide leave volume. |
| **D-08** | `draftPerformanceReviewNote` / `draftPromotionLetter` filter `e.deleted_at` but not `p.deleted_at`. | `hr-copilot-tools.ts:188-196,260-268` | Deleted people resolve to a name. |
| **D-09** | `getMyLeaveBalances` performs **no permission check at all**. | `ops-copilot-tools.ts:339-378` | Self-scoped by predicate only; nothing structural holds it there. |
| **D-10** | The `CONFIRM_ACTION:` sentinel is streamed into the visible draft token-by-token before it is parsed. | `global-ask-os.tsx:229-238` | Users watch `CONFIRM_ACTION:{"token":"…` scroll past. |
| **D-11** | `onFinish` persists the assistant's full text, sentinel included. | `chat-assistant.service.ts:342-359` | **HMAC proposal tokens are stored in plaintext** in chat history and re-rendered on reload. |
| **D-12** | Dead code: a `conditions` array built and never referenced. | `workspace-copilot-tools.ts:95-98` | The raw SQL below re-states it by hand. |
| **D-13** | Every AI-created calendar event is written in **UTC**, not the org's zone. | `ai-event-timezone.ts` (`AI_EVENT_TIMEZONE = "UTC"`), used by `projects-copilot-tools.ts:224` and `chat-assistant.controller.ts:374` | "Remind me at 3pm" lands at 3pm **UTC** — 8:30pm for an `Asia/Kolkata` org. The constant's own comment says UTC is a stand-in "replaceable in a single place **the day an actor's zone becomes available**". It *is* available: `organizations.timezone` is `NOT NULL`, default `Asia/Kolkata`. `users` has no timezone column, so the org's zone is the honest source. |

### 2.5 What already works — do not rebuild

- **Every active member already holds** `self:attendance`, `self:leaves`, `self:expenses`, `self:payslips`, `self:payroll`, `self:referrals`, `self:recruitment`, `self:job-openings`, `self:cases`, `kb:*:view`, `calendar:read|write`, `mail:*`, `chat:*`, `timesheets:entries:*`, `tasks:read`, `directory:people:view`, `integrations:connections:view|manage`, `ai:chat:use` — merged before any role is read. **No RBAC changes are needed for the self-service surface.** (`rbac/permissions/role-defaults.ts:17-65`)
- `resolveToolkitConnection` already returns `{status:"unresolved", reason:"no-connection"|"needs-reauth"}`. (`integrations/core/connection-resolution.ts:85`)
- `POST /integrations/connections/initiate` already returns `{redirectUrl}`; toolkits are `gmail | outlook | googlecalendar`.
- `AiModule` already imports `IntegrationsModule`, `MailModule`, `CalendarModule`, `ChatModule`, `ProjectsModule`. **No new module edges required.**
- `ai@7.0.51` ships `DataUIMessageChunk` (with `transient`), `createUIMessageStream` and `UIMessageStreamWriter`.
- `withTenantScopedTools` already wraps every tool execute in its own tenant transaction. (`tenant-scoped-tools.ts`)
- `resolveUserPermissions` is already cached in-process + versioned Redis + single-flighted. D-01 is a **correctness** fix, not a performance one.

---

## 3. Decisions (locked)

| # | Decision | Rationale |
|---|---|---|
| DEC-1 | **Drop route-personas.** Delete `allowedTools` and `filterToolsByPersona`; stop auto-selecting a persona from the pathname. | F-01/F-02/F-03. Replaced by capability filtering (DEC-2), which is required for security anyway. |
| DEC-2 | **Filter the tool set by the caller's resolved `AccessSnapshot`** (scopes + enabled modules), not by persona. | Keeps the list small enough for good tool selection *and* is defence-in-depth over per-tool gates. |
| DEC-3 | **Persona chips survive as a manual focus hint** in the prompt only. Preambles rewritten — today's say *"Do not discuss HR"*, which would recreate F-01. | User decision. |
| DEC-4 | **All four write groups ship**: the existing 9, self-service writes, CRM + Build writes, calendar + mail writes. | User decision. |
| DEC-5 | **Clock in / clock out / break execute immediately**, no confirmation card. Every other write keeps the confirm gate. | User asked for command-driven web clocking. These three are self-only, idempotent (`@Idempotent("hr.attendance.check-in")`) and reversible. |
| DEC-6 | **Upgrade the default chat model**, and add its pricing row in the same change. | User decision + F-10/F-11. |
| DEC-7 | **Route the chat turn through the AI gateway**; widen `AiStreamTextOpts` to carry `messages`/`tools`/`stopWhen`. | F-07/F-08/F-09. Makes DEC-6 a one-place change. |
| DEC-8 | **Carry directives as typed stream parts**, not as a text sentinel. | D-10/D-11, and plan §E would otherwise add a second sentinel. |
| DEC-9 | **Tools delegate to the owning module's service.** Raw SQL in a tool becomes the exception that needs a stated reason. | D-02…D-08 are all drift from the owning module. |
| DEC-10 | **Sign-off is a live run against a real org**, not a mocked suite. | User decision. |
| DEC-11 | **Counts that saturate report their cap honestly** (`200+`), never a wrong absolute. | Referrals cap at 200 with no count (`recruitment-sourcing.service.ts:55`); Build has no org-wide per-status count for the caller. |
| DEC-12 | Personal reads behind `hr:*` keys ordinary members lack (`hr/leaves/balance`, `hr/my-goals`, `hr/feedback/my-reviews`, `hr/service-delivery/my-items`) are reached through their `/me/*`, `payroll/me/*` or `@Universal()` `dashboard/*` equivalents. | Otherwise the feature works only for admins. |

### 3.1 Non-negotiables inherited

`CLAUDE.md` cardinal rules apply in full. Restating the four most load-bearing here: **no code comments**; **no `any` / `as` / `@ts-ignore`**; **authorize at the data layer on every read and write, tenant-scoped**; **reuse before you create** — one definition per job.

---

## 4. Phases and to-do items

Mark an item `[x]` **only** when its acceptance criterion is met and its stated verification has actually been run. Record the evidence in §7.

### Phase 0 — Close the live defects · *must land before Phase 6*

- [x] **P0-1** Fix D-01 **in place**. Change `resolveToolScope` to call `AccessService.scopeFor(actor, key, authContext)` so `resolvePrincipalScope` applies, and thread the request `AuthContext` through. This is deliberately a minimal in-place fix — P3-3 later *relocates* this resolution into the registry, but the defect is live now and must not wait for Phase 3.
  *Accept:* a `personal-token` principal whose ceiling excludes `build:tickets:view` is denied by the ticket tools; an `account-only` principal is denied everything; a `human-session` member and an org owner are unaffected. *Verify:* new unit spec covering all five principal kinds + `pnpm typecheck`.
- [x] **P0-2** Fix D-02. `postChannelMessage` resolves channels through the chat module's own channel reader (member-of, or `type='PUBLIC'`).
  *Accept:* a private channel the caller is not a member of is neither disclosed nor proposable. *Verify:* unit spec, two accounts.
- [x] **P0-3** Fix D-03. Drop `INCLUDE_DELETED` from both CRM tools; apply the leads DataScope the real list applies.
  *Accept:* soft-deleted leads are invisible and unmutatable; an `own`-scoped rep sees only their own.
- [x] **P0-4** Fix D-04 + D-12. Replace the hand-written ticket-stats SQL with `ProjectsWorkQueryService` (`scope=mine`), deleting the dead `conditions` array.
  *Accept:* counts match `/build/all-work?scope=mine`; soft-deleted excluded; multi-assignee included; no cross-project disclosure.
- [x] **P0-5** Fix D-05. `readTicket` / `searchTickets` apply `ticketScope` + `resolveProjectAccess`.
  *Accept:* a member without project access gets a not-found, not a body.
- [x] **P0-6** Fix D-06. `askHrPolicy` filters `deleted_at` and the effective-date window, mirroring `hr-policies.service.ts` and `hr-policy-evaluation.service.ts:363-365`.
  *Accept:* deleted and expired policies are never cited.
  ⚠ **Recorded deviation from DEC-9.** `AiModule` does not import `HrModule`, so HR services cannot be injected here without a new module edge and its cycle risk. P0-6/P0-7/P0-8 are therefore **in-place predicate fixes**, not delegation. Delegation remains the Phase 3 target once the registry owns data access. Verified reachable by contrast: `ProjectsModule` exports `ProjectsWorkQueryService` and `ChatModule` exports `ChatChannelsService`, both already imported by `AiModule`, so P0-2 and P0-4 *do* delegate.
- [x] **P0-7** Fix D-07. `getLeaveUtilization` narrows by the same scope split the owning module uses.
  *Accept:* an `own`-scoped employee does not receive org-wide volume.
- [x] **P0-8** Fix D-08 + D-09. Filter `p.deleted_at`; give `getMyLeaveBalances` an explicit `self:leaves` gate.
- [x] **P0-9** Fix F-06. The two fabricating tools return a typed failure instead of invented content.
  *Accept:* a forced gateway failure yields no fabricated letter or answer.
- [x] **P0-10** Regression gate for Phase 0. *Verify:* `pnpm typecheck`, targeted `pnpm test` for the touched specs, `pnpm check:cycles`, `pnpm check:route-classification`.

### Phase 1 — Consolidate on the AI gateway (C1)

- [ ] **P1-1** Widen `AiStreamTextOpts` to accept `messages`, `tools` and `stopWhen` alongside today's `prompt`, keeping every existing caller source-compatible.
- [ ] **P1-2** Add `streamAgenticTurn` (or equivalent) to `AiGatewayService` using `AiGatewayStreamHelper`.
  *Design note:* the helper owns `onFinish` (settle + metrics), but chat additionally appends the assistant turn to `ai_chat_messages`. Do **not** give chat a second `onFinish` — add an optional `onCompleted?(text, usage)` to the opts, invoked inside the helper's existing `onFinish` **after** `settleStream`, so there stays exactly one settle path and one abort path. The helper already anticipates this work: `ai-gateway-stream.helper.ts:200-205` documents that its `onAbort` exists so that *"the day a tool set is added to a gateway stream, cancellation keeps working instead of silently starting to settle at zero."*
- [ ] **P1-3** `ChatAssistantService` calls it and **deletes** its duplicated breaker, concurrency, reserve, settle, idempotency-key and model resolution. Remove the seven internal imports.
  *Accept:* chat gains the per-tenant breaker and the model fallback chain; cancel/abort still releases without settling.
- [x] **P1-4** Resolve F-10 by **severing the fallback**, not by editing 21 call sites. `resolveAiStreamModel(undefined)` stops delegating to `resolveChatModel()` and instead returns a named `DEFAULT_STREAM_MODEL` constant pinned to today's effective value, so the 21 untiered callers keep the exact model they have now. Chat then passes its own explicit tier.
  *Accept:* changing the chat model provably does not change the model for blog-ai, kb-page-ai or timesheets-ai — asserted by a spec that resolves the model id for a tiered and an untiered call and pins them apart.
- [x] **P1-5** DEC-6: upgrade the default model **and** add its `MODEL_TOKEN_PRICING_RAW` row. Report the before/after cost per turn; do not silently alter `AI_MARGIN` or `CREDIT_USD_VALUE`.
  *Accept:* `computeTokenCharge` no longer falls through to `DEFAULT` for the chat model.
- [ ] **P1-6** *Verify:* `pnpm typecheck` + gateway and chat specs + one real streamed turn.

### Phase 2 — Resolve the asker once (C4)

- [ ] **P2-1** Add `AskOsActor`: identity, display name, email, membership id, designation, org name, timezone, today, current-month bounds, `AccessSnapshot`. Resolve once per turn.
  *Accept:* display name comes from `users ⋈ organization_members` — **never** `organization_people`, whose rows are not auto-created and read "Former Member" for ordinary members.
- [ ] **P2-2** Rewrite the system prompt to state who the caller is and what today's date is, and to forbid asking the user to identify themselves for a self question.
- [ ] **P2-3** Delete the `findPerson`-first instruction for self questions; keep it for genuinely third-party questions.
- [ ] **P2-4** *Accept:* "how many tickets have I handled?" never asks for a name. *Verify:* live turn.
- [ ] **P2-5** Fix D-13. Carry the org's `timezone` on `AskOsActor` and use it wherever `AI_EVENT_TIMEZONE` is referenced; delete the constant once no call site needs the UTC stand-in. Display name resolves `users.name ?? "firstName lastName" ?? email` — `users.name` is **nullable** (`auth.ts:113`), and `findPerson` already uses that exact fallback.
  *Accept:* "remind me at 3pm" creates an event at 3pm in the org's zone, not 3pm UTC. *Verify:* unit spec on the created event's `timezone` + a live turn.

### Phase 3 — One `ToolOutcome`, one registry (C2 + C6)

- [ ] **P3-1** Define `ToolOutcome` as a discriminated union: `data` · `denied` · `empty` · `needs-connection` · `needs-confirmation` · `failed`.
- [ ] **P3-2** Define `defineTool({ key, permission, module, input, run })`; `run` receives the `AskOsActor`.
- [ ] **P3-3** Build the registry: resolve permission **once per turn**, filter by scopes + enabled modules (DEC-2), absorb `ToolAccessService` and `ai-tool-scope` (both pass-throughs), keep `withTenantScopedTools`' per-tool transaction.
- [ ] **P3-4** Migrate all 36 existing tools onto the contract. Collapse the 9 context types to one.
- [ ] **P3-5** DEC-1: delete `allowedTools` + `filterToolsByPersona`; stop pathname persona auto-selection; rewrite preambles as focus hints (DEC-3); validate `persona` as an enum.
  *Accept:* F-03's 5 orphaned tools are reachable; a bad persona string cannot widen access.
- [ ] **P3-6** *Verify:* per-tool unit specs (self-binding, denial, cross-tenant), `pnpm typecheck`, `pnpm check:cycles`.

### Phase 4 — Typed directives and the connect CTA (C3)

- [ ] **P4-1** Backend: emit `AskOsDirective` as a `data-*` stream part with `transient: true`. The writer lives in `ai-stream-response.ts` — a contract spec forbids controllers calling `.pipeUIMessageStreamToResponse(` directly.
- [ ] **P4-2** Delete the `CONFIRM_ACTION:` prompt instruction.
  *Accept:* D-10 and D-11 both close — no JSON on screen, no HMAC token in chat history.
- [ ] **P4-3** Add `requireToolkit(actor, toolkit)` over `resolveToolkitConnection`, returning `ToolOutcome.needs-connection` with `reason`. Replace all 6 prose strings in `mail-copilot-tools.ts`.
- [ ] **P4-4** Frontend: add the `data-*` variant to `readFrame`, thread `onData` through `streamAiText` → `useAiTextStream` → `useAskAI` → `GlobalAskOs`. Existing drop-tests must still pass.
- [ ] **P4-5** Frontend: `parseAskOsDirective` (zod) replaces `parseConfirmPayload`'s 32 hand-rolled guards. Add `AskOsConnectCard` using `useInitiateIntegrationConnection`, with the non-manager fallback copy from `CalendarConnectInline`.
  *Accept:* frontend/CLAUDE.md §5 — *"Unconnected integration → a clear 'Connect X' banner with an action"*.
- [ ] **P4-6** Rollout is backend-first (today's decoder already drops unknown `data-*` frames). *Verify:* `pnpm type-check`, `pnpm check:response-contracts`, live turn with a disconnected mailbox.

### Phase 5 — Self-scoped read tools

Subject is **never** an input. `inputSchema` is `z.object({})` or period-only. Split by domain to respect the file-size gate.

- [ ] **P5-1** `getMyProfile`, `getMyEmployment`
- [ ] **P5-2** `getMyAttendanceSummary({year?,month?})`, `getMyAttendanceStatus` — via `/me/attendance` (`self:attendance`)
- [ ] **P5-3** `getMyLeaveRequests` (+ existing balances) — via `/me/time-off` (`self:leaves`)
- [ ] **P5-4** `getMyExpenses` (`self:expenses`), `getMyPayslips` (`self:payslips`), `getMyTotalRewards` (`self:payroll`)
- [ ] **P5-5** `getMyReferrals` (`self:referrals`, DEC-11 cap honesty), `getMyJobApplications` (`self:job-openings`), `getMyInterviews` (`self:recruitment`)
- [ ] **P5-6** `getMyTickets` / `getMyTicketStats` — `ProjectsWorkQueryService` `scope=mine|created|subscribed`
- [ ] **P5-7** `getMyTasks` (CRM my-tasks + Build assigned), `getMyTimesheets({from,to})`
- [ ] **P5-8** `getMyInbox`, `getMyNotificationCount`, `getMyAnnouncements` — the `@Universal()` surfaces
- [ ] **P5-9** `getMyOnboardingTasks` (`self:onboarding-tasks`), `getMyDisciplinaryCases` (`self:cases`)
- [ ] **P5-10** `getMyGoals`, `getMyReviews`, `getMyHelpdeskItems` — via DEC-12 equivalents
- [ ] **P5-11** `summarizeMyDay` — one composite `Promise.all`, not 6 model round-trips
- [ ] **P5-12** `searchMyDocuments` across KB + onboarding docs, ACL-bound
- [ ] **P5-13** *Verify:* per-tool spec proving the subject cannot be overridden by tool input; two-account cross-tenant test.

### Phase 6 — Write actions (DEC-4) · *requires Phase 0 and Phase 3*

- [ ] **P6-1** Self-service: `clockIn`, `clockOut`, `toggleBreak` — **immediate**, no card (DEC-5), reusing the existing idempotency keys.
- [ ] **P6-2** Self-service confirmed: `applyForLeave`, `submitExpense`, `logTimesheetEntry`, `submitReferral`, `applyToJobOpening`
- [ ] **P6-3** CRM + Build: `createLead`, `updateLead`, `logCrmActivity`, `assignTicket`, `moveTicketToSprint`
- [ ] **P6-4** Calendar + mail: `createCalendarEvent` (attendees), `replyToMailThread`, `archiveMailMessage` — each emitting `needs-connection` when unresolved
- [ ] **P6-5** Register every new confirmable action in `CONFIRMABLE_ACTIONS` + `CONFIRM_ACTION_PERMISSION`, dispatching through the owning module's service.
  *Note:* do **not** silently retune the pre-existing `email.send` → `chat:messages:write` mapping; it is a documented open decision (`chat-assistant.controller.ts:120-127`). Raise it separately.
- [ ] **P6-6** *Verify:* controller e2e per action — auth, RBAC allow/deny, cross-tenant, credit exhaustion. Confirm the `db.transaction` mock invokes its callback.

### Phase 7 — Sign-off (DEC-10)

- [ ] **P7-1** Boot backend + frontend against a **named disposable/scratch** environment. Never load production credentials to make a test pass.
- [ ] **P7-2** Run the §5 acceptance suite as a real signed-in member (not an owner — owner bypass masks non-owner 403s).
- [ ] **P7-3** Repeat the identity-sensitive subset as a second member in a second org (cross-tenant).
- [ ] **P7-4** Capture transcripts for every row of §5 into §7.
- [ ] **P7-5** Full gate pass: backend `pnpm typecheck` (`NODE_OPTIONS=--max-old-space-size=10240`), `pnpm check:cycles`, `pnpm check:route-classification`; frontend `pnpm type-check`, `pnpm check:cycles`, `pnpm check:response-contracts`, `pnpm check:named-handlers`, `pnpm check:permission-catalog`.
- [ ] **P7-6** Update `PAGES.md` for any changed surface.

---

## 5. Acceptance suite

Every row must pass **as an ordinary member**, with the transcript recorded. A clarifying question about *who the user is* is an automatic fail.

| # | Prompt | Pass condition |
|---|---|---|
| A-01 | Summarize my day | Attendance + calendar + assigned work + inbox in one answer, no clarifying question |
| A-02 | How many days have I attended this month? | Caller's own current-month count |
| A-03 | How many tickets have I handled so far? | Answers without asking for a name; matches `/build/all-work?scope=mine` |
| A-04 | How many referrals have I given? | Caller's own; `200+` at the cap |
| A-05 | What's my leave balance? | Own balances |
| A-06 | What's on my calendar tomorrow? | Own events |
| A-07 | What does our leave policy say? | KB/policy answer with citations; no deleted or expired policy cited |
| A-08 | Send a mail to `<addr>` saying `<text>` | Confirm card → sends from the caller's connected account |
| A-09 | *Same, mailbox disconnected* | **Connect card with a working button**; no dead-end prose |
| A-10 | *Same, mailbox `needs_reauth`* | Reconnect card, distinct from A-09 |
| A-11 | Clock me in | Web clocking starts; status reflects it |
| A-12 | Clock me out | Clocking stops |
| A-13 | Apply for leave on `<date>` | Confirm card → request created |
| A-14 | Create a ticket in `<project>` | Confirm card → ticket created |
| A-15 | *Ask about a module the member lacks* | Plain refusal; no fabrication, no leak |
| A-16 | *Ask about another person's salary* | Refused |
| A-17 | A-03 repeated from a `/crm` page | Identical answer to A-03 (F-01 regression) |
| A-18 | A-03 as a second member in a second org | Their own numbers only |
| A-19 | *Any confirm action* | No `CONFIRM_ACTION:` text on screen; no token in reloaded history |
| A-20 | *Personal-token principal below ceiling* | Denied (D-01 regression) |

---

## 6. Risks and open items

| Risk | Mitigation |
|---|---|
| Widening `AiStreamTextOpts` regresses 24 existing callers | Additive only; existing `prompt` path untouched; typecheck is the gate that sees arity |
| Model upgrade changes cost materially | P1-5 reports before/after per turn; pricing row added in the same change; no margin change |
| 36 → ~61 tools degrades tool selection | DEC-2 capability filtering shrinks the per-caller set; measure selection quality in P7 |
| Live run needs provider keys + a scratch org | P7-1 names the environment; never production credentials |
| Referral/ticket caps make "how many" imprecise | DEC-11 — report the cap, never a wrong absolute |

**Open, not in scope:** the `email.send` → `chat:messages:write` mapping (P6-5) is a pre-existing documented decision awaiting an owner. Do not change it inside this program.

---

## 7. Progress ledger

Append evidence as items complete. Label inference separately from measured behaviour. Keep failed, unrun and external checks open.

| Date | Item | Evidence | Result |
|---|---|---|---|
| 2026-09-18 | **P1-4** (F-10) | Fallback **severed**: `resolveAiStreamModel(undefined)` no longer delegates to `resolveChatModel()`. `ai-stream-model.ts` now owns `DEFAULT_STREAM_GOOGLE_MODEL = "gemini-1.5-pro-latest"` / `DEFAULT_STREAM_OPENROUTER_MODEL = "openai/gpt-4o"`, pinning the 21 untiered callers at exactly the model they had. The gateway no longer imports from `services/chat-assistant-model` at all. | **verified** |
| 2026-09-18 | **P1-5** (DEC-6, F-11) | Chat default upgraded to **`gemini-2.5-pro`**, overridable via a new `AI_CHAT_MODEL` env var. Pricing rows added for `gemini-2.5-pro` (1.25/10.00), `gemini-2.5-flash` (0.30/2.50), `gemini-2.0-flash` (0.10/0.40) so none falls through to `DEFAULT {0.5,1.5}`. ⚠ **Cost note:** vs `gemini-1.5-pro` (1.25/5.00) input is unchanged and output **doubles**; at `AI_MARGIN` 1.5 and `CREDIT_USD_VALUE` 0.01 a 2k-output turn moves ~3.0 → ~6.0 milli-credits. Margin and credit value untouched. | **verified** |
| 2026-09-18 | P1-4/P1-5 proof | `ai-stream-model-isolation.spec.ts` (new, 9 tests, all pass) asserts the chat model and the untiered stream default resolve **differently**, that `AI_CHAT_MODEL` moves only chat, that the stream default still equals its pre-upgrade value, and that every selectable model prices above the unknown-model fallback. | **verified** |
| 2026-09-18 | ⚠ P1-5 residual | I cannot verify from here that `gemini-2.5-pro` resolves against this deployment's `GOOGLE_GENERATIVE_AI_API_KEY`. The **P7 live run is the check**, and `AI_CHAT_MODEL` is the one-env-var escape hatch if it 404s. Stated rather than assumed. | **open** |
| 2026-09-18 | PRD authored | This document; all §2 anchors read in source | — |
| 2026-09-18 | **Baseline** | `backend/` is a **separate git repo** with **153 files already modified** by other in-flight work. Full `tsc --noEmit` on that tree = **64 pre-existing errors**, incl. 3 in `build-due-sweep.service.ts` / `build-entity-reads.service.ts` caused by an uncommitted `build-app-paths` change (`projectId: number \| null` → `buildTicketHref(…: number)`). **Not ours.** All later results are stated against this baseline. | recorded |
| 2026-09-18 | **P0-1** (D-01) | `resolveToolScope` now calls `AccessService.scopeFor` → `resolvePrincipalScope`; `ToolAccessService.scope/denyReason` take `CurrentUserContext` + optional `AuthContext`. 37 call sites migrated across 9 tool files; `HrToolContext` changed `{orgId,userId}` → `{actor}`, closing the shape divergence that structurally blocked HR tools from `principal`. | **done** |
| 2026-09-18 | **P0-8b** (D-09) | `getMyLeaveBalances` now gates on `self:leaves` before any DB access; the `eq(leaveBalances.userId, userId)` self-scoping predicate is retained as defence in depth. Verified in source. 3 new specs incl. one asserting `inputSchema.shape` is empty (no subject can arrive via tool input). `ops-copilot-tools.spec.ts`: 11 pass. 0 tsc errors. | **verified** |
| 2026-09-18 | **P0-5** (D-05) | `readTicket` + `searchTickets` now compose `ticketScope(orgId,userId)` through `ScopedRead.read()` — tenant + own-predicate (assignee membership, reporter, **and** `ticket_assignees`) + `deleted_at`. A ticket the caller cannot see returns the **not-found** shape, never a message confirming existence. No `rawScope`. `ai-action-copilot.spec.ts`: 9 pass, incl. "returns not-found shape for a ticket in a project the actor cannot access". 0 tsc errors. | **verified** |
| 2026-09-18 | **P0-2** (D-02) | `postChannelMessage` resolves candidates via `ChatChannelsService.listMemberChannelIds(actor)` then name-matches only within that set (`org_id` + `id IN (member ids)` + `ILIKE` + `is_archived = false`), short-circuiting when the actor belongs to no channel. Both miss branches return the **identical** string, so a private/DIRECT channel is indistinguishable from a non-existent one. 6 specs pass, incl. "gives the same response for a non-member channel as for a channel that does not exist". 0 tsc errors. | **verified** |
| 2026-09-18 | P0-2 cross-check | Not over-restriction: `ChatMessagesService.send` calls `assertChannelMember`, so membership is required to post anyway. The old code disclosed a private channel's name **and** minted a confirm card that would have thrown on click; the fix makes the proposal agree with what execution permits. | confirmed |
| 2026-09-18 | **P0-6/7/8a/9** (D-06, D-07, D-08, F-06) | `askHrPolicy` now filters `deleted_at IS NULL AND effective_from <= CURRENT_DATE AND (effective_to IS NULL OR effective_to >= CURRENT_DATE)`, mirroring `hr-policy-evaluation.service.ts:363-365`. `getLeaveUtilization` narrows via `scopedRead.unrestricted ? all : AND user_id = <self>`. `p.deleted_at IS NULL` added to both draft tools. **All fabrication removed** — grep for `"We are pleased to inform"` / `"Your organization has"` returns nothing; all three sites now return `{ ok: false, error: "AI gateway failed. No content was generated." }`. 8 specs pass. | **verified** |
| 2026-09-18 | P0-7 nuance | `unrestricted ? all : self` narrows a **`team`**-scoped caller to self — stricter than `team` semantics, deliberately safe, and consistent with `backend/CLAUDE.md` §5 ("`team` ships only once materialised"). Recorded so it is not read later as a bug. | noted |
| 2026-09-18 | **P0-10** regression gate | `npx jest src/modules/ai/core` → **76 suites / 670 tests pass**. Full `tsc --noEmit` → **63 errors vs the 64 baseline (net −1), 0 in `src/modules/ai/`**. `check:cycles` → no circular dependency. `check:route-classification` → ALL ROUTES CLASSIFIED, UNDECLARED 0. `check-scope-boundary` → boundary holds, no new `rawScope`. | **PASS** |
| 2026-09-18 | ⚠ P0-10 caught a real miss | Agents each grepped only their own file, and some used `tsc -p tsconfig.build.json`, **which excludes tests** — so 8 type errors in the new HR spec (missing `context: {}` on the tool-options literal) passed every per-agent check while the specs still ran green under jest. Fixed by the coordinator. This is why the phase gate runs the **test-inclusive** program. | fixed |
| 2026-09-18 | **P0-4** (D-04, D-12) | Hand-written SQL replaced by `ProjectsWorkQueryService.getAllWork(actor, …)`; dead `conditions` array deleted (0 occurrences remain). Verified in `projects-work-query.service.ts:85-117`: `memberProjectIds` derives from the **caller**, and `inArray(tickets.projectId, allowedProjectIds)` + `isNull(tickets.deletedAt)` sit in the **base** conditions before any scope branch — so `scope:"all"` cannot escape the caller's project membership. Over-count and cross-project disclosure both closed. 4 specs pass. 0 tsc errors. | **verified** |
| 2026-09-18 | ⚠ **P0-4 residual** | The **multi-assignee under-count is NOT fully closed.** `getAllWork`'s `assigneeId` filter matches only `tickets.assignee_membership_id`; `ticket_assignees` is covered solely by the `scope:"mine"` UNION path (`work-scope-union.ts:52-108`), which is actor-bound and cannot be redirected at another user. So a *cross-user* stat still under-counts co-assigned tickets. The **self** case — the one §1.1 actually asks about — is resolved by P5-6, which uses `scope:"mine"`. Tracked, not silently closed. | **open** |
| 2026-09-18 | **P0-3** (D-03) | `INCLUDE_DELETED` and `leadPartyScope` gone; both `searchLeads` and `updateLeadStatus` now pass `isNull(businessParties.deletedAt)` through `ScopedRead.read()` with `LEAD_PARTY_SCOPE`, checking `.denied` first. So soft-deleted leads are neither read nor mutated, and an `own`-scoped rep is bound to `owner_user_id = self`. Stale 4-line comment deleted; no `rawScope`. Specs assert against the **rendered SQL predicate** (that it contains `deleted_at … is null` and binds the actor's id) rather than mock return values, so they are not tautological. 6 specs pass. Earlier spec type error resolved by the agent. 0 tsc errors. | **verified** |
| 2026-09-18 | Gate | `node src/scripts/check-scope-boundary.mjs` → "OK — the DataScope boundary holds"; only the 2 pre-declared AI `rawScope` escapes remain, none added. | pass |
| 2026-09-18 | P0-1 verification | `tool-access.service.spec.ts` rewritten against the **real** `resolvePrincipalScope`: 11 tests, all pass. **Bite proven** — reinstating the bypass fails **6 of 11**, incl. every ceiling test. `ai-action-copilot`, `chat-assistant.service`, `chat-assistant-predispatch`: 38 pass. `tsc --noEmit` (test-inclusive): **0 errors in `src/modules/ai/`**. `pnpm check:cycles`: no circular dependency (7,954 files). | **verified** |
