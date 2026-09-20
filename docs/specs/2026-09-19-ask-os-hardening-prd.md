# PRD — Ask OS hardening: security, correctness and the confirm seam

**Program:** Ask OS (`backend/src/modules/ai/**` + `frontend/components/assistant/**`)
**Status:** Approved for build. §4–§7 are the executable contract.
**Supersedes:** nothing. Complements `2026-09-18-chat-os-prd.md`, which delivered the tool registry this document hardens.
**Audience:** Claude Code, backend/frontend engineers, reviewers, security, QA

Every finding below was read in source in this session and carries a `file:line` anchor. Five parallel read-only audits produced the leads; each lead was re-verified against source before it was written here. Leads that did not survive verification are recorded in §3 so they are not re-raised.

---

## 1. Why this exists

`2026-09-18-chat-os-prd.md` closed the *shape* of the tool layer: one `ToolOutcome`, one registry, one actor, tools calling owning modules. It did not audit the **authorization, spend and execution** paths underneath that shape. This document does.

The headline: Ask OS is the first surface in the product where **an external party's text becomes a privileged instruction**, and where **a model's output becomes a database write**. Those two facts create defect classes the rest of the codebase does not have, and four of them are live.

---

## 2. Verified findings

Severity is the customer/security impact, not the size of the fix. `CONFIRMED` means the code path was traced end to end.

### 2.1 Critical

| # | Finding | Anchor |
|---|---|---|
| **S-01** | **Indirect prompt injection with an external entry point.** Lead names are interpolated into the **system** prompt unescaped and unbounded. `POST /leads/ingest` is `@Public()` behind an API key (the key a web-to-lead form carries), `ingestSchema.name` has **no `.max()`**, and `ingestCreate` fires `evaluateAssignmentRules` → `updateMirroredLeads(… assignedToId …)`. So a marketing-form submission lands verbatim above the guard rules in an assigned rep's system prompt. | `chat-assistant-prompt.ts:29` · `chat-assistant-context.ts:107-123` · `leads.ingest.controller.ts:11` · `lead.schemas.ts:70` · `leads.service.ts:389` · `lead-triggers.ts:181` |
| **S-02** | **Direct messages can be delivered to the wrong person and reported as sent.** `lower.includes((r.firstName ?? "").toLowerCase())` — when `firstName` is null, `includes("")` is **always true**, so that member matches every name. With exactly one blank-`firstName` member, `sendDirectMessage` resolves to them and returns `{recipientName: "Raj", sent: true}`. It writes immediately: no confirmation card. Orgs that populate `users.name` only — the common case — are exposed. | `comms-copilot-tools.ts:52`, write at `:141-145` |
| **S-03** | **An aborted turn is billed zero and logged nowhere.** `onAbort` calls `releaseReservation(…)`, which sets `resolved = true`, which permanently disarms `onFinish`'s `if (resolved) return;`. No `settleStream`, so no debit and no `ai_usage_logs` row. The code comment asserting "these streams pass no tools" is false for Ask OS — `streamAgenticTurn` delegates to this exact helper and passes `tools` + `stepCountIs(10)`. 20 turns/min/user × ~10 provider round trips, free and invisible. | `ai-gateway-stream.helper.ts:224-228, 240-241` · `ai-gateway.service.ts:103-105` · `chat-assistant.service.ts:36,168` |

### 2.2 High

| # | Finding | Anchor |
|---|---|---|
| **S-04** | **`Idempotency-Key` replay bypasses the wallet check.** `reserve` short-circuits on the key **before** `wallet.balance < credits` is read, and `findByIdempotencyKey` has no status filter and no age window — a SETTLED reservation from weeks ago still matches. Settle is then a silent no-op (`if (status === "SETTLED") return;`). An org at zero or negative balance keeps calling the provider. | `ai-credits-reservation.service.ts:42-45, 54, 189-210` · `credit-reservation-close.ts:50` |
| **S-05** | **Ticket title oracle.** `updateTicketStatus`, `addTicketComment`, `assignTicket` and `moveTicketToSprint` read the ticket by `(id, orgId, deletedAt)` with **no scope predicate** — `readTicket` applies one at `:71`. An `own`-scoped `build:tickets:update` holder enumerates every ticket title in the org by id, and gets it back in the confirmation preview. The write is contained downstream; the disclosure is not. | `projects-copilot-tools.ts:169-173, 210-214` · `work-actions-tools.ts:134-138, 212-216` |
| **S-06** | **`logCrmActivity` ignores DataScope**, while its CRM siblings apply it. On an ambiguous name it returns up to 5 other reps' lead names. | `work-actions-tools.ts:80-93, 99` vs `crm-copilot-tools.ts:37-41, 117-119` |
| **S-07** | **`propose()` 23505 is an unhandled 500.** The reuse lookup requires `status = 'PROPOSED'` **and** unexpired; the unique index is `(org_id, idempotency_key)` with no status. `all-exceptions.filter.ts` has no 23505 → 409 mapping. Re-asking for the same leave/expense/timesheet/referral after the first card expires is a hard 500, permanently, for that key. | `ai-confirmation.service.ts:47-73, 79-91` · `ai-confirmation.ts:34-36` · `all-exceptions.filter.ts` |
| **S-08** | **`/chat/confirm` is unthrottled and ignores the AI kill switch.** `POST /chat` carries `@UseGuards(RateLimitGuard)`, `@UseRateLimit("ai:chat")` and a `flags.aiChat` check. The endpoint that actually sends the mail and creates the bonus carries none of them. | `chat-assistant.controller.ts:285-302` vs `:322-325` |
| **S-09** | **External sends run inside the request transaction.** `/chat/confirm` is not `@NoTenantTransaction`, so the `status='CONFIRMED'` flip, the provider send and `markExecuted` share one transaction. Any throw after the send — `markExecuted`, the commit, the deadline abort — rolls the flip back with the mail already delivered, and the token redeems again. Also holds a pooled Neon connection across a provider round trip, which `backend/CLAUDE.md` §4 forbids. | `chat-assistant.controller.ts:322, 419, 472, 621, 632` · `tenant-context.interceptor.ts:104-114` · `run-in-tenant-transaction.ts:73` |
| **S-10** | **13 of 19 confirm branches coerce model payload with bare `String()`/`Number()`.** Worst: `email.send` takes `String(payload["toEmail"])` with no `z.string().email()`, no length cap — while `mail.send` validates the same fields. A missing key becomes the literal `"undefined"` or `NaN`. | `chat-assistant.controller.ts:347-628` · `request.schemas.ts:253-258` |
| **S-11** | **`searchChatMessages` returns zero results for every user, always, and says so as fact.** The actor is built without `membershipId`; `ChatSearchService.searchMessages` opens `if (!membershipId) return { results: [], … }`. It returns `data({results: []})`, not `empty()`, so the model states it searched and found nothing. | `workspace-copilot-tools.ts:199-203` · `chat-search.service.ts:24-25` |
| **S-12** | **`askHrPolicy` fabricates citations.** It selects `id, policy_type, status, created_at` and feeds the model `"Policy type: leave"` — `hr_policies` carries `name`, `description` and `rules`, none read. It then emits `sources[].citation` for text never retrieved, on a charged call, under a description promising "source citations". | `hr-copilot-tools.ts:37-47, 56-58, 81-85` · `policy-engine.ts:50-57` |
| **S-13** | **Two write tools bypass the confirmation protocol entirely.** `scheduleEvent` and `sendDirectMessage` write directly, while the equivalent `calendar.createEvent` and `chat.postChannel` require a signed proposal. The confirmation gate is bypassable by tool choice alone. | `comms-copilot-tools.ts:89, 145` vs `work-actions-tools.ts:256` · `comms-actions-tools.ts:61` |
| **S-14** | **`updateLeadStatus` writes immediately with an unconstrained status.** `status: z.string().optional()` while `searchLeads` constrains the same field to a 6-value enum. The model can persist `"Closed-ish"`, which no board or filter will ever match again. | `crm-copilot-tools.ts:30-32, 65-70` vs `:109` |
| **S-15** | **Reserve ceiling is 1 credit for a turn that can cost ~40×, and settle has no floor at zero.** `newBalance = wallet.balance + (reserved − actual)` is unclamped. 20 concurrent turns authorise ~900 credits of real spend against 20 credits of balance. | `ai-cost-catalog.ts:66` · `chat-assistant.service.ts:36,168,170` · `credit-reservation-close.ts:61, 75` |
| **S-16** | **`ai_action_proposals` has no RLS policy.** No `ENABLE ROW LEVEL SECURITY` in any migration. Isolation rests entirely on application predicates — and the redemption `UPDATE`s carry none. The table stores full action payloads: leave reasons, candidate emails, bonus amounts, lead PII. | `migrations/*.sql` (absent) · `ai-confirmation.ts` |

### 2.3 Medium

| # | Finding | Anchor |
|---|---|---|
| **S-17** | `getSecret()` returns `""` when `AI_CONFIRMATION_SECRET=` is set blank — `??` does not catch empty string — and the env schema is a bare `z.string().optional()` with no `min(32)` and no `emptyToUndefined`, unlike every other secret in the file. `.env.example:139` ships the line ready to uncomment. Blast radius is bounded by the actor check, so this is a defence-in-depth loss, not a takeover. | `ai-confirmation.helpers.ts:59` · `env-schema-app.ts:36` |
| **S-18** | Redemption is not a conditional update. `.set({status:"CONFIRMED"}).where(eq(id, proposalId))` — no `orgId`, no `status = 'PROPOSED'` predicate, no affected-row check. Safe today **only** because the ambient request transaction serialises it; one `@NoTenantTransaction` away from a real double-execution. | `ai-confirmation.service.ts:146-149, 168-171` · `proposal-lifecycle.ts:68, 136` |
| **S-19** | `payloadHash` is written and never verified. The HMAC binds a stored string, not the payload that executes. | `ai-confirmation.service.ts:159` (no `stableHash(row.payload)` comparison) |
| **S-20** | Same-org state oracle: status, cancelled and expiry branches all precede the actor check, and the expiry branch **writes** to another user's row first. | `ai-confirmation.service.ts:135-152` before `:154` |
| **S-21** | `getPayrollSummary` declares no `permission`, only `module`. `scopeFor` returns `"all"`, the registry's `scope === "none"` short-circuit never fires, and the tool is offered by name and description to every member of a payroll-enabled org. Data is held by an in-`run` branch — the "safe usage by convention" shape §4 bars. `getMyProfile` has neither `permission` nor `module` and no in-`run` check. | `ops-copilot-tools.ts:209-217` · `self-hr-tools.ts:38-42` |
| **S-22** | Member/attendee resolution reads **every** org member with no `.limit()`, no `isNull(users.deletedAt)` and no `status = 'ACTIVE'`; `findPerson` likewise omits both filters. Deactivated and soft-deleted people stay resolvable as DM targets and attendees. | `comms-copilot-tools.ts:37-41` · `workspace-copilot-tools.ts:41-62` · `work-actions-tools.ts:142-160` |
| **S-23** | An unknown model id is charged at a fictional `DEFAULT` price with no log, no metric and no exception. `resolveChatModelId()` returns `process.env.AI_CHAT_MODEL` verbatim, so one env var under-bills a `gemini-2.5-pro`-class model by ~6.7× on output. | `ai-model-pricing.constants.ts:33-36` · `chat-assistant-model.ts:29-30` |
| **S-24** | The client supplies the entire model context; `role: "assistant"` turns are forgeable and stored history is never replayed. Bounded (the enum excludes `system`/`tool`, and the toolset is ACL-filtered independently), but it defeats every prompt-level rule and leaves no audit trail of what was actually sent to the provider. | `chat-assistant.service.ts:98-104, 166` · `request.schemas.ts:138-150` |
| **S-25** | Concurrency counter TTL (120 s) equals the request deadline (120 s) and is never refreshed, so a full-length turn expires its own key; `release` then `decr`s a missing key to **−1 with no TTL** and the org's cap drifts open by one, permanently. | `ai-concurrency-limiter.ts:6, 38, 70` · `chat-assistant.controller.ts:89` |
| **S-26** | The provider breaker is **global across all tenants**; `classifyLlmError` falls back to `"transient"`, so an unclassified error — including a local `ServiceUnavailableException` — counts as provider ill-health and 5 in 30 s deny Ask OS to every org. Conversely any single tenant's success `del`s both keys and re-closes it early. | `ai-gateway-stream.helper.ts:128-143, 243-244` · `llm-retry.ts:94` · `ai-stream-breaker.ts:20-21, 68-76` |
| **S-27** | Streamed AI spend writes no audit entry. The buffered path audits `ai.invoke`; `settleStream` does not. Every Ask OS turn is absent from the audit log. A failed or denied confirm is likewise never audited, and the rollback erases the confirm entry too. | `ai-gateway-stream-credit.ts:21-51` vs `ai-gateway-credit.helper.ts:151-167` · `audit.service.ts:77-84` |
| **S-28** | `user_membership_id` is never written on propose, so `fk_ai_proposals_org_user_mbr` is inert for every row since the cutover and `idx_ai_proposals_org_user_created` indexes an always-NULL middle column. Migration `0926` asserts exactly this invariant. | `ai-confirmation.service.ts:80-88` · `0920:61` · `0926_s03_actor_fk_contract.sql:72` |
| **S-29** | Ask OS context counts **include soft-deleted leads** (`INCLUDE_DELETED` ×3), the attendance and leave reads are unprojected `db.query.*` selects, the leave read is fetched in full only to take `.length`, and `netSalary` is selected and never rendered. | `chat-assistant-context.ts:55-69, 92, 117, 137-141` |
| **S-30** | `ai.module.ts` lists the 14 Ask OS provider classes **twice**. Register in one list and not the other and the tool either fails to inject or silently contributes nothing to the toolset. No gate catches it. | `ai.module.ts:69-84` vs `:113-132` |
| **S-31** | Denial rendered as breakage: 5 sites return `failed(...)` for a permission denial and 6 more for an empty/ambiguous result. The registry renders `failed` as `{ok:false, failed:true}`, which the model reports to the user as a broken feature. Bare `catch {}` blocks in comms and mail tools discard `ForbiddenException` the same way. | `workspace-copilot-tools.ts:89-90` · `ops-copilot-tools.ts:249-252` · `comms-copilot-tools.ts:87, 134, 147` · `mail-copilot-tools.ts:107-109, 150-152, 212-214` |
| **S-32** | `searchTickets` reports `total: results.length`, which is the page size, so the model says "you have 5 tickets" when 5 is the limit. | `projects-copilot-tools.ts:114` |
| **S-33** | `stableHash` passes `Object.keys(payload).sort()` as `JSON.stringify`'s **replacer**, which is a key allowlist applied at every depth — not a sort comparator. Latent only because every payload is currently flat. | `ai-confirmation.helpers.ts:35` |

### 2.4 Frontend

| # | Finding | Anchor |
|---|---|---|
| **F-01** | **CRITICAL — every saved conversation loads as an empty chat.** The frontend contract requires `conversationId` on each message; the backend projects exactly `{id, role, content, createdAt}`, and its own `chatMessageSchema` agrees. `applyContract` **throws** on a missing required field. The chat view has no `isError` prop, so the history silently renders "Beginning of conversation" with no retry. Invisible to `tsc`: `ZodType<Wider>` is structurally assignable to `ZodType<Narrower>`. | `chat-extra-schema.ts:51-65` vs `chat-conversation-messages.ts:68-73` · `ai-chat-response.schemas.ts:3-8` · `api-envelope.ts:145-160` · `ask-os-chat-view.tsx:21-40` |
| **F-02** | **HIGH — the Connect button 400s on every route except `/calendar` and `/mail`.** The card posts `returnPath: window.location.pathname` into a `z.enum(["/calendar","/mail"])`. "Connect Gmail" from `/crm/leads` is a ZodError → 400 → toast. Ask OS is the only caller passing a live pathname. The test enshrines the broken value because the hook is mocked. | `ask-os-connect-card.tsx:32-36` · `integrations.schemas.ts:5-10` · `ask-os-connect-card.test.tsx:36` |
| **F-03** | **HIGH — a live confirmation token is written into the message cache and replayed to the model.** `appendAskOsDirective` embeds `CONFIRM_ACTION:{…token…,preview:{to,subject,body}}` into the cached assistant message, and the next turn builds its context from `persisted`. Two backend specs assert the prompt must never contain that sentinel; the frontend is its sole producer. | `global-ask-os.tsx:249-252, 275-280` · `ask-os-directive-schema.ts:51-62` · `ask-os-actor.spec.ts:123-128` |
| ~~F-04~~ | **REFUTED on verification.** The per-message cap already exists and matches the backend exactly: `ASK_OS_MAX_MESSAGE_CHARS = 10_000` is enforced in the composer (`askOsInputError`), again in `send` (`prepareAskOsSend`), and again per message in `boundedAskOsContext` via `slice(0, Math.min(remaining, ASK_OS_MAX_MESSAGE_CHARS))`. The cited test asserts a 20 000-char message is truncated **to** the cap, not that it survives. `MAX_CONTEXT_CHARS = 24_000` is a whole-context budget, not a per-message one. No defect. | `ask-os-request-policy.ts:10, 15-19, 43-60` · `ask-os-request-policy.test.ts:19-29` |
| **F-05** | **HIGH — `tool-output-error` / `tool-input-error` frames are dropped.** `readFrame` recognises `text-delta`, `error` and `data-*`; everything else returns `null` and is discarded. An input-validation failure at the SDK boundary happens *outside* the registry's try/catch, so the turn ends with empty text and no error. | `ai-ui-message-stream.ts:24-42, 60-62` |
| **F-06** | Only the last directive of a turn survives — the ref is overwritten per event while the backend writes every collected directive. A turn proposing two actions renders one card; the other proposal is live server-side and invisible. | `global-ask-os.tsx:197-206` vs `ai-stream-response.ts:157-159` |
| **F-07** | The confirm card exists only on the optimistic cache entry, so after a reload the user sees narration with no Confirm button while the proposal stays redeemable. | `global-ask-os.tsx:311-313` · `ask-os-chat-utils.tsx:141` |
| **F-08** | An empty completed turn persists a blank grey pill — no `text.length === 0` guard on the `completed` path, and the bubble renders with zero children. Exactly the state F-04/F-05 produce. | `global-ask-os.tsx:269-310` · `ask-os-chat-utils.tsx:169-208` |
| **F-09** | §4 duplicate: `PersonaId` has two import paths — owned by `ask-os-request-policy.ts`, re-exported by `persona-chip-strip.tsx:7`, with consumers split across both. | `ask-os-request-policy.ts:1-6` · `persona-chip-strip.tsx:7` |
| **F-10** | Unbounded message list — every loaded message renders with no windowing while the observer can page indefinitely at 30 rows/page. | `ask-os-chat-view.tsx:62, 110-122` |
| **F-11** | Dead code: `ConfirmActionDirective` (1 reference, its own declaration), an unused `useMutation` import, and three surplus `export` keywords. | `ask-os-directive-schema.ts:28` · `ai-confirm-action.ts:1` · `ask-os-chat-utils.tsx:22, 213` |

Checked and clean, with evidence: **no XSS vector** (no `dangerouslySetInnerHTML` under `components/assistant/**`; `react-markdown` v10 with `remarkGfm` only, no `rehype-raw`, default `urlTransform` strips `javascript:`; all tool-derived text reaches the DOM as React children) · **no client-sent `userId`/`orgId`/`actorId`** on this surface · both `useCan` keys exist verbatim in the backend catalog · **no `localStorage`/`sessionStorage` writes** · stream teardown, single-flight and StrictMode double-invoke are handled · every other contract on this surface matches field-for-field against the vendored OpenAPI snapshot.

### 2.5 Architecture

| # | Finding | Anchor |
|---|---|---|
| **A-01** | **A confirmable action is defined in three places.** The proposal is minted in `actions/*-tools.ts`, the permission key lives in `CONFIRM_ACTION_PERMISSION`, and the executor is a branch of a 19-case `switch` in the controller. Nothing ties the three together, so a new action can ship with a proposal and no executor, or an executor and the wrong key. This is also why S-10 exists at all: there is no place for a payload schema to live. | `chat-assistant.controller.ts:118-170, 346-630` |
| **A-02** | `chat-assistant.controller.ts` is **635 lines** — past the 500 hard-review gate — and holds business logic in a controller, which `backend/CLAUDE.md` §1 forbids. | `chat-assistant.controller.ts` |
| **A-03** | `sweepExpired` has no caller, no `orgId` predicate and no tenant wrapper; `cancel` and `getExecutedResult` are unreachable — there is no API for a user to decline a proposed card, so a rejected action sits until TTL. | `proposal-lifecycle.ts:150-163` · `ai-confirmation.service.ts:202-211` |

---

## 3. Leads that did not survive verification

Recorded so they are not re-raised.

- **Toolset scope ceiling.** `computeAccessSnapshot` filters every scope through `isPersonalTokenPermissionDelegable(key) && tokenScopes.includes(key)`, and `getAccessSnapshot` bypasses the cache whenever `tokenScopes !== null`. The personal/agent-token ceiling reaches the tool filter. Sound.
- **Conversation ownership.** Every history/conversation read and write predicates on `(orgId, userMembershipId)`, including the cursor row; every miss is `NotFoundException`. Cross-tenant and cross-user ids are 404, no existence oracle. Sound.
- **Confirmation token handling.** The token never enters the model context — it is routed out-of-band as a `transient` stream directive. `confirm` re-reads `FOR UPDATE` on `(id, orgId)`, re-checks status, expiry and actor, and the controller re-checks the permission server-side and executes from the **stored** payload. `timingSafeEqual` with a length guard. Sound.
- **Multi-step metering.** `onFinish`'s `usage` is aggregated across all steps. A user cannot drive N steps and be billed for one; the defects are S-03 and S-15, not the meter.
- **Prompt egress.** The system prompt embeds no permission keys, role names, grant history or org hierarchy. `AskOsActor.role` and `.isOrgOwner` exist and are deliberately never rendered. §4's egress bar is met.
- **SQL injection.** All eight `db.execute(sql…)` sites bind every model-supplied value; the only interpolated identifiers are compile-time literals. None.
- **N+1.** None in the tool layer.
- **Tenant GUC under `@NoTenantTransaction`.** Every DB touch on the chat path passes an explicit `orgId`. The one pool-direct read is `OrgFeaturesService.getFlags` against `organizations`, which carries no RLS. Safe today; would fail loudly, not leak, if that changed.
- **Soft delete in the tool layer.** Checked against each Drizzle table: the tables the tools read without a `deletedAt` filter genuinely have no such column. The real misses are on `users.deletedAt` (S-22).
- **`AiResponseCacheService` missing actor/scope discriminators.** Real, but no production caller passes `cache` — `resolveCacheOpts` returns null everywhere outside a spec, and the Ask OS path never touches it. Recorded as a latent trap in §7, not fixed.
- **`email.send` → `chat:messages:write`.** Unchanged, deliberate, owner-pending (findings register #241). One amplification worth recording: that key is in `EMPLOYEE_SELF_SERVICE` and merged before any role is read, so the gate is effectively "is an active member", not "may post in chat".

---

## 4. The deepening: one definition per confirmable action

**Problem.** A confirmable action is three disconnected fragments (A-01). There is nowhere for a payload schema to live, which is why 13 of 19 branches coerce raw model output (S-10), and nowhere for an executor's authorization to be stated next to what it executes.

**Solution.** A `ConfirmableActionDefinition` — the same shape `defineTool` already established for the read side:

```ts
defineConfirmableAction({
  action: "email.send",
  permission: "chat:messages:write",
  payload: emailSendPayloadSchema,
  execute: async (payload, ctx) => ({ result, summary }),
})
```

One registry, keyed by action. The controller becomes: confirm → look up → check permission → parse payload → execute → mark executed.

**Deletion test.** Deleting `CONFIRM_ACTION_PERMISSION` and the 19-case switch *concentrates* complexity into one registry rather than moving it — the signal we want. The controller drops from 635 lines to well under the gate, and a new action becomes one file change instead of three.

**What it buys beyond tidiness:** S-10 becomes unrepresentable (a definition without a payload schema does not type-check), and the tool-time and confirm-time permission keys can be asserted equal by a test rather than by eye.

---

## 5. Scope

### 5.1 In scope — fix in this program

P0 (S-01 … S-03), P1 (S-04 … S-16), P2 (S-17 … S-33 except where §5.2 applies), and A-01/A-02.

### 5.2 Out of scope — stated, not silently dropped

| Item | Why | Owner action needed |
|---|---|---|
| **S-16 RLS migration applied to production** | ✅ **Applied 2026-09-20.** The ledger hazard was real and remains: it holds 17 rows against 890 files, so bare `db:migrate` would still replay ~870. Applied with `--tag=1123_ai_action_proposals_rls` alone, dry-run first. Live proof against Aurora: no tenant GUC → `42501`; org A sees 0 rows, org B sees all 10, neither sees the other's; `streamline_app` has `rolbypassrls = false`. Two errors in my own earlier framing: the migration was **not** journaled when that row was written (it was added in the same pass), and I had wrongly reported the apply as blocked on the user minting an IAM token — `@aws-sdk/rds-signer` is a backend dependency and the token mints inline. | Done |
| **`serial` → identity PK on `ai_action_proposals`** | Breaking schema change on a live table with existing FKs. Real (`backend/CLAUDE.md` §3) but not a hardening fix. | Schedule separately |
| **S-28 `user_membership_id` backfill** | Forward-fixed here (new rows carry it); backfilling historical rows is a data migration. | Schedule separately |
| **`email.send` permission key** | Deliberate, owner-pending, documented in place. Not touched. | Owner decision |
| **`evaluateAssignmentRules` `void Promise.allSettled` after the handler** | A real post-commit-context hazard in `leads.service.ts:388`, adjacent to S-01 but outside Ask OS. | Separate ticket |
| **A-03 decline API** | A product decision (should a user be able to reject a card, and what should the model then say?), not a defect fix. | Product |

---

## 6. Acceptance

Each row is ticked only against durable evidence at the real entry point.

| # | Acceptance | Evidence required |
|---|---|---|
| AC-1 | Tenant free-text in the system prompt is bounded, escaped and fenced; a lead named with an injection string cannot emit an instruction line | Unit test over `buildContextPrompt` with a hostile lead name |
| AC-2 | `ingestSchema.name/company/notes` carry length caps | Schema test |
| AC-3 | Name resolution never matches on an empty string; a null-`firstName` member does not match an unrelated query | Unit test on the matcher |
| AC-4 | `sendDirectMessage` and `scheduleEvent` return `needsConfirmation` | Tool tests |
| AC-5 | An aborted agentic turn settles partial usage and writes an `ai_usage_logs` row | Spec driving the real `onAbort` with recorded steps |
| AC-6 | A replayed `Idempotency-Key` against an insufficient wallet is refused | Reservation spec |
| AC-7 | All four ticket existence reads apply the scope predicate | Tool tests, own-scope caller vs foreign ticket |
| AC-8 | `logCrmActivity` applies DataScope | Tool test |
| AC-9 | A duplicate idempotency key on propose yields a reused proposal or a 409, never a 500 | Confirmation spec |
| AC-10 | `/chat/confirm` is rate-limited and honours `flags.aiChat` | Controller spec |
| AC-11 | Every confirmable action has a payload schema; tool-time and confirm-time keys match | Registry parity test |
| AC-12 | `searchChatMessages` returns real results for a channel member | Tool test with `membershipId` |
| AC-13 | `askHrPolicy` cites policy `name` and feeds `description`/`rules`; no citation without retrieved text | Tool test |
| AC-14 | Redemption is a conditional update on `(id, orgId, status)` with a rowcount check | Confirmation spec |
| AC-15 | `getPayrollSummary` and `getMyProfile` declare their permission | Registry test asserting every definition declares one |
| AC-16 | Typecheck, `check:cycles`, `check:route-classification` and the AI suites pass with no new failures | Command output, separated from the pre-existing baseline |

---

## 6a. Delivery status — 2026-09-19

**Verification:** backend `tsconfig.build.json` typecheck **0 errors**; `src/modules/ai` + `src/modules/billing` **188 suites / 2,037 tests pass**; `pnpm check:cycles` clean (8,011 files); `pnpm check:route-classification` ALL ROUTES CLASSIFIED; frontend assistant **8 suites / 38 tests pass**. The test-inclusive backend program reports 78 errors, **none in any file changed here** — they sit in `common/hr`, `build/scope-directory`, `build/core`, `hr/onboarding`, `impersonation` and `inventory`, all another session's concurrent work in this shared tree. Frontend `tsc` reports 2 errors, both stale `.next/types` artifacts for a page another session moved. Nothing committed.

### Closed

| # | What changed |
|---|---|
| S-01 | `asPromptData` strips control characters, `U+2028/29` and angle brackets, bounds identity to 120 and lead names to 80 chars, and the whole context moved inside an `<<<ORG_DATA … ORG_DATA>>>` fence carrying an explicit "data, not instructions" rule. `ingestSchema` gained `.max()` on all five free-text fields. 8 new tests. |
| S-02 | The always-true `lower.includes(firstName ?? "")` clause is gone; matching is on `displayNameFrom(row)` with a 2-char minimum needle. |
| S-03 | `onAbort` now sums `steps[].usage` and settles the partial spend, writing an `ai_usage_logs` row with `outcome: "cancelled"`; it releases only when no step completed. `sumStepUsage` is exported and tested. |
| S-04 | `reserve` short-circuits only on a `RESERVED` row; any other status is a `ConflictException`, so a replayed key can no longer skip the wallet check. New regression test. |
| S-05 | All four ticket existence reads apply the scope predicate. `buildTicketScopePredicate` moved to its owner (`build/core/tickets-scope.ts`) as `ticketScopePredicate` — one definition, two consumers. |
| S-06 | `logCrmActivity` applies DataScope on the lead lookup. |
| S-07 | `propose` catches `23505` via the existing `common/db/postgres-error` helper, reuses a live proposal or raises 409 — never a 500. |
| S-08 | `/chat/confirm` carries `@UseRateLimit("ai:chat")` and the `flags.aiChat` check. |
| S-11 | `searchChatMessages` passes `membershipId`, projects four named fields, and returns `empty()` on no match. |
| S-12 | `askHrPolicy` selects `name`, `description` and `rules`, feeds them bounded to the model, and cites the policy **name** plus its id. |
| S-13 | `sendDirectMessage` and `scheduleEvent` now return `needsConfirmation`. Two new confirmable actions (`chat.sendDirect`, `calendar.scheduleMeeting`), both with Zod payload schemas and executors. |
| S-17 | `getSecret()` rejects an empty or short secret instead of signing with `""`; `AI_CONFIRMATION_SECRET` uses `deploymentSecret` (`min(32)`). |
| S-18 | Both redemption writes are conditional on `(id, orgId, status)` with an affected-row check. |
| S-19 | `confirm` recomputes `stableHash(row.payload)` and refuses a mismatch. |
| S-20 | The actor check runs **first** and returns 404, so neither a colleague's nor another tenant's proposal id is confirmed to exist. |
| S-21 | `getPayrollSummary` declares `permission: "self:payslips"`. |
| S-22 | Member, attendee and `findPerson` lookups filter `users.deletedAt`, `users.isActive` and `organizationMembers.status = 'ACTIVE'`, and are bounded. |
| S-23 | An unpriced model logs a warning instead of billing at `DEFAULT` in silence. |
| S-25 | Concurrency counter TTL raised to 300 s, above the 120 s request deadline, so `release` can no longer decrement a missing key to −1. |
| S-28 | `propose` resolves and writes `user_membership_id`, re-arming the composite FK and the `(org_id, user_membership_id, created_at)` index. |
| S-29 | Context counts exclude soft-deleted leads; attendance is projected to three columns; pending leaves is a `count()` instead of a full 5-row read; the never-rendered `netSalary` is gone from the query and the type. |
| S-30 | `ai.module.ts` spreads `ASK_OS_PROVIDER_CLASSES` — the 14 classes are listed once. |
| S-31 | Corrected outcome kinds across workspace and ops tools (`denied`/`empty` instead of `failed`/`data`). |
| S-32 | `searchTickets` reports `returned` + `truncated` instead of a `total` that was the page size. |
| S-33 | `stableHash` canonicalises recursively instead of misusing `JSON.stringify`'s replacer as a comparator. |
| F-01 | `conversationId` removed from the message contract — saved conversations load again. |
| F-02 | The connect card sends no `returnPath`, so the backend's `defaultReturnPath(toolkit)` applies and the button works from every route. The hook's type is now the two-member union. Test corrected. |
| F-03 | Outgoing context is built through `extractAskOsDirective(...).prose`, so a live confirmation token and its payload preview never reach the provider — including tokens already in the cache. |
| F-08 | An empty completed turn surfaces a failure instead of persisting a blank grey pill. |
| F-09 | The `PersonaId` alias re-export is deleted; one owner, one import path. |

### Corrected in flight

- **S-15's zero-clamp was my error.** I clamped `newBalance` at 0; `ai-credits-ledger.spec.ts` asserts "charges overage — balance goes negative when actual > reserved". The negative balance is the mechanism that makes an overage recoverable — clamping forgives the debt. Reverted. The real S-15 defect is the 1-credit reserve ceiling against a 10-step turn, which remains open below.
- **F-04 refuted** (see §2.4).

### Closed in the second pass — 2026-09-19

**Verification:** backend build-program typecheck **0**; `src/modules/ai` **101 suites / 961 tests**; `src/modules/ai` + `src/modules/billing` **191 suites / 2,052 tests**; `migration-integrity` 38 tests; cycles clean; routes all classified; frontend assistant + AI streams **10 suites / 59 tests**, frontend `tsc` 0 non-generated errors.

| # | What changed |
|---|---|
| **A-01 / A-02 / S-10** | **The confirmable-action registry.** `defineConfirmableAction` binds an action's key, permission, Zod payload schema and executor in one place; 21 definitions live in five domain files under `core/confirm-actions/`, assembled by a barrel that derives `CONFIRMABLE_ACTIONS` and `CONFIRM_ACTION_PERMISSION` from the definitions themselves. The controller's 19-case switch is gone — `chat-assistant.controller.ts` drops **682 → 259 lines**, back under the gate, with the handler reduced to look up → check permission → parse payload → execute. Every branch now parses its payload, so S-10's bare `String()`/`Number()` coercion is unrepresentable. A new parity spec asserts every proposed action has an executor, every definition has a schema, and every permission exists verbatim in the backend catalog. |
| **S-14** | `updateLeadStatus` proposes instead of writing, and `crm.updateLeadStatus` validates the status and priority against the org's **configured** `crm_options` rather than a hardcoded enum — the tenant's own vocabulary, with the configured list returned in the refusal. |
| **S-16** | `1123_ai_action_proposals_rls.sql` enables RLS with a `tenant_isolation` policy, revokes PUBLIC, grants `streamline_app`, and verifies itself in a `DO` block. Registered in `_journal.json` (idx 1011) — a `.sql` outside the journal never runs while `db:migrate` still prints success. **Applied to production 2026-09-20** — see §5.2. |
| **S-24** | The model context is now read from stored history inside the tenant transaction, oldest-first, instead of the request body. A client-forged `assistant` turn no longer reaches the provider, and the transcript the model saw matches what is stored. 3 new tests. |
| **S-26** | `breakerAttribution` treats a locally-thrown `HttpException` as `request`, so our own `ServiceUnavailableException` no longer counts as provider ill-health against the breaker every tenant shares. |
| **S-27** | Streamed spend writes an `ai.stream` audit entry on both the completed and the cancelled settlement path, via `Pick<AuditService, "log">` rather than a parallel port. |
| **F-05** | `tool-output-error` and `tool-input-error` frames are decoded into a distinct `tool-error` event instead of being dropped. It does not abort the turn — the model often recovers — but if the turn ends with no text, the tool's real message is surfaced instead of the generic empty-turn error. |
| **F-11** | `ConfirmActionDirective`, an unused `useMutation` import and three surplus `export` keywords removed. |

### Still open

| # | Why it is not done |
|---|---|
| S-09 | External sends inside the request transaction. The fix restructures transaction boundaries around live mail/chat sends and needs a deployed-environment test to certify; a mocked pass would not prove it. |
| S-15 | The 1-credit reserve ceiling for a 10-step agentic turn. A costing decision, not a code fix. Note the zero-clamp is **not** the fix — see "Corrected in flight". |
| F-06 / F-07 | Multiple directives per turn, and the confirm card not surviving a reload. Both need a wire-format change for the cached message plus an N-card renderer. |
| F-10 | Message-list windowing. `react-window` is installed but unused anywhere in the repo; introducing the first virtualized list for a variable-height streaming panel with scroll anchoring is not verifiable without a browser. The list grows only when the user deliberately pages back at 30/page. |
| M6 | The `unique("uniq_ai_action_proposals_org_id")` declared in Drizzle has no migration. Inert today (no FK targets it), but `db:generate` will keep re-proposing it. |

## 7. Traps recorded for the next engineer

- **`AiResponseCacheService` has no actor or scope discriminator in its key.** It is inert only because nothing passes `cache`. Any surface that opts in ships a cross-user disclosure on day one.
- **`chat-assistant.service.spec.ts:270-297` and `chat-assistant-multistep-cancellation.spec.ts:345-402` assert opposite outcomes for the same abort scenario.** The former's `streamText` mock never invokes `onAbort`, so it certifies a fiction. The latter matches the shipped SDK. Fix S-03 against the latter.
- **`ai-confirmation.service.spec.ts:452` asserts a row ends `EXPIRED`** after an expired confirm. In production the `BadRequestException` rolls that write back. The mock has no rollback, so the spec cannot see it.
- **`onFinish`'s `text` is the final step's text, not the whole turn**, and it is what gets persisted as the assistant message.
- **Two 120 s abort handles are armed per chat request**; only the handler's reaches the provider.
