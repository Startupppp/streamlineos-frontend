# Remaining Domains — Batched Migration Plan (NestJS strangle)

**Date:** 2026-06-26
**Status:** Actionable — drives the parallel port batches.
**Scope:** The ~37 remaining API domains after the CRM core (**leads, contacts, targets, csat**) already landed on NestJS (port 1500). This file turns the per-domain classification into *ordered, parallel-portable batches*.

This is the execution view of the 12-wave roadmap (`specs/2026-06-25-migration-roadmap.md`). The roadmap explains *why* the ordering binds; this file says *what ships together in each batch* and *which domains in the batch are fully-portable now vs. partial (some routes deferred)*.

---

## Hard rules this batching obeys

1. **Never migrate a domain before the domains it WRITES into.** Read-only fan-outs (dashboard, reports, search, sales analytics, calendar feed, accounting reports) may *lag* their sources because NestJS reads not-yet-migrated tables via the shared Drizzle schema (same Neon DB). Cross-domain **writes** force sequencing.
2. **Already migrated (do not touch):** leads, contacts, targets, csat. Shared kernel (JWT bridge, CASL RBAC, CacheService, AuditService, branch-filter, rate-limit, error envelope, ApiKeyGuard) is live.
3. **NextAuth stays in the frontend.** NestJS *consumes* the JWT and *resolves* RBAC; it never owns the cookie/session-issuance path. Anything welded to NextAuth session issuance or the `users`/identity write boundary stays FE or is handled as a cross-service callback.
4. **Security-foundation domains** (rbac, roles, org, organization, branches) ship in their own careful batch (Batch 2) — they are the scoping/authorization contract every later batch enforces against.
5. **Giant / high-blast-radius domains** (hr, projects, support, accounting, chat, deals) each get an isolated batch (or are the dominant member of one), never lumped with unrelated clean domains.
6. A batch's **partial** domains keep their deferred routes on the legacy Next.js handler (per-prefix `apiClient` routing) until the batch that owns the deferred dependency lands. Only the **fully-portable** routes flip prefix + get deleted.

Effort key: **S** ≤ ~1wk · **M** ~1–2wk · **L** ~2–4wk · **XL** > ~1mo.

---

## Batch 1 — Foundation sinks & zero-coupling warm-ups (PARALLEL, LARGE)
**Domains:** `notifications`, `push`, `storage`, `platform`
**Effort:** L (notifications dispatch is the bulk; push/storage/platform are S each).

Stand up the things *everyone writes to* first, plus the genuinely standalone leaf endpoints as low-risk muscle-builders. All four are parallel-portable.

| Domain | Portability | Notes |
|---|---|---|
| notifications | **Partial** (5/6 clean) | CRUD/read (list, unread-count, read, read-all, clear-all) port now; **defer `dispatch`** (email + Twilio fan-out) until the messaging integration lands. Keep a shared write-path (shared-DB insert + a `POST /notifications/dispatch`) so not-yet-migrated Next domains keep calling `createNotification` unchanged. |
| push | **Full** (2/2 clean) | `subscribe` (POST/DELETE) + `vapid-public-key` (public). Self-owned `push_subscriptions`. Harden DELETE to scope by `session.user.id` on port (currently endpoint-only). |
| storage | **Partial** (2/3 clean) | `upload` + `image` (R2) port now; **defer `download`** until HR `documents` table is migrated (its ownership check reads `documents`) — or replace with a generic ownership table. R2 client is the shared file service every later batch calls. |
| platform | **Full** (1/1 clean) | `platform/visit` public analytics beacon, own table, zero cross-domain deps. Pure warm-up. |

**Rationale:** notifications + storage + push are the cross-cutting sinks the whole roadmap fans into; getting their write/read paths up first unblocks every later batch's notify/upload/audit side effects. platform is a free clean win to prove the per-domain cycle.
**Decision needed before flip:** messaging provider for `notifications/dispatch` (email = existing Resend; SMS/WhatsApp = existing Twilio) — see needsDecision.

---

## Batch 2 — Security foundation: identity, RBAC & tenancy (ISOLATED, CAREFUL)
**Domains:** `rbac`, `roles`, `org`, `organization`, `branches`
**Effort:** L (low route count, central + high-risk).

Isolated by design: this is the authorization + org/branch-scoping contract every business batch enforces against. The backend already has the CASL core (abilities.factory, ability.guard, module.guard) and the identical auth schema — these routes are the thin read/admin endpoints feeding it.

| Domain | Portability | Notes |
|---|---|---|
| rbac | **Full** (3/3 clean) | permissions catalog, user-permissions, role-permissions (GET/POST). Backend RBAC primitives already exist; just wire GET/POST endpoints to the existing guards. Preserve `role_permissions.orgId` nullable (global default) semantics. |
| roles | **Full** (3/3 clean) | roles CRUD + templates. Writes gated on `can('manage','all')`. Only reads org/user tables (which stay FE) — no write blocker. |
| branches | **Partial** (4/5 clean) | GET/GET-one/PATCH/DELETE port now; **defer POST create** — it writes `users.branchId` (identity table, NextAuth-owned). Cut over create once a cross-module users write is allowed. Foundational `branch-filter` primitive reused by hr/dashboard/reports. |
| org | **Partial** (1/2 clean) | `GET /org/members` ports now; **defer `PATCH /org/setup`** — writes `users` profile + busts the NextAuth Redis session cache (`invalidateUserSession`), needs a FE session-invalidation callback. |
| organization | **Partial** (3/8 clean) | List/profile/invitations-GET port now; **defer** members POST + invitations/resend (email), members/[memberId] PATCH (writes `users.role`), security PATCH (session invalidation across members). All touch auth-schema/`users` + email. |

**Rationale:** RBAC resolution must be authoritative on NestJS before any RBAC-heavy business domain cuts over; org/branch scoping primitives must be shared.
**Key coupling:** role/permission changes must coherently invalidate sessions — both services write the same Redis `revoked:session:*` keys. Never split RBAC resolution from the JWT contract.
**Decision needed:** which roles get the `withAuth`-only writes (org/branch writes have inline role checks today, not CASL grants) — see needsDecision.

---

## Batch 3 — CRM clean leaves & conversion targets (PARALLEL, LARGE)
**Domains:** `clients`, `quotes`, `customer-executive`, `reports`
**Effort:** L (clients is heavy; quotes/customer-executive/reports are S–M).

The CRM domains that lead-conversion writes into (`clients`/`clientAccounts`) plus clean read-side CRM analytics. All depend only on already-migrated CRM + Batches 1–2.

| Domain | Portability | Notes |
|---|---|---|
| clients | **Partial** (12/15 clean) | All list/health/churn/opportunities/onboarding/renewals CRUD port now. **Defer 3:** `[clientId]` PATCH (writes `incentives` + `notifications` + email on INVEST), `[clientId]/activities` POST (pair with it), `[clientId]/timeline` GET (reads `deals`/`deal_activities`, no deals module yet). Conversion writes here are the most-cited ordering constraint. |
| quotes | **Full** (4/4 clean) | Self-owned `quotes`/`quote_line_items`; deal/client FKs are nullable display joins (degrade gracefully). The `/send` route is DB-only (no email). Standardize all verbs on `withAbility('crm:quotes')` on port. |
| customer-executive | **Full** (7/7 clean) | CS health/NPS/SLA. Writes only own CS tables; cross-domain coupling is read-only (supportTickets, csatResponses, clientAccounts). csat already migrated; reads degrade during overlap. |
| reports | **Full** (5/5 clean) | Read-only aggregation, zero writes. Cross-domain *reads* (attendance/payroll/projects/tickets/candidates) resolve via shared schema during overlap. Add the missing permission checks on project/team-performance/source-effectiveness on port. |

**Rationale:** "Migrate the written-to side first" — `clients`/`clientAccounts` must exist before lead-conversion logic moves (Batch 4). The clean reads ride along.
**Note:** `incentives` payout config/tables must be ported with clients' deferred PATCH (it writes into them) — bundle incentives here if a dedicated module is stood up; otherwise the deferred PATCH waits.

---

## Batch 4 — CRM pipeline (deals isolated) + conversion cutover (GIANT-ISOLATED)
**Domains:** `deals`, `sales`, plus finalize **lead-conversion** into NestJS
**Effort:** L (deals heavy/high-risk; sales analytics M).

`deals` is a high-blast-radius writer — isolated as the batch anchor. `sales` rides with it because 10/16 sales routes are read-only analytics over the deal tables.

| Domain | Portability | Notes |
|---|---|---|
| deals | **Partial** (11/13 clean) | All CRUD/read/analytics (stats, aging, forecast, win-loss, approval-rules, activities, clone, custom-data, meetings) port now. **Defer 2:** `[dealId]` PATCH stage-transition (writes `chat_channels` + email + inngest `deal.won` + automation engine — Batch 7/comms), and `approvals` POST (writes `dealApprovals` + `createNotification` — notifications is in Batch 1, so this can flip once notifications is live; the chat side effect can't). |
| sales | **Partial** (15/16 clean) | All entity CRUD (quotas, commission_rules, commissions, playbook) + 10 read-only dashboards port now. **Defer 1:** `commissions/[commissionId]` PATCH (fires `createNotification`) — flips once Batch 1 notifications is live. Standardize the 4 inconsistent auth patterns onto `withModuleAbility('sales')`. |

**Rationale:** With clients + incentives (Batch 3) + notifications (Batch 1) on NestJS, lead-conversion can fully cut over (it writes clients/clientAccounts/deals/incentives/notifications). The deal stage→chat side effect stays event-bridged until chat lands (Batch 6).
**Key coupling:** deal-update → chat emits a `deal/stage.changed` event; a thin consumer writes shared `chat_channels` tables until Batch 6 owns it.

---

## Batch 5 — Finance: accounting (GIANT-ISOLATED) + invoices + billing
**Domains:** `accounting`, `invoices`, `billing`, plus the `webhooks/razorpay` inbound handler
**Effort:** L (accounting+invoices = deepest financial coupling; billing S).

`accounting` (GL) is isolated as the batch anchor. `invoices` posts journal entries by *importing* `lib/accounting` in-process, so accounting + invoices ship as **one unit**.

| Domain | Portability | Notes |
|---|---|---|
| accounting | **Partial** (12/21 clean) | The pure-ledger core (COA + journal post/reverse + 4 financial statements) ports now. **Defer 9** that read/write the billing domain (purchase-bills, vendor/customer ledgers, aged AR/AP, GSTR-1/3B). No external integrations at all. |
| invoices | **Partial** (2/6 files clean) | Read slice (stats, recurring list, list/detail/payments GET) ports early; **defer the 4 write files** (invoice send, DRAFT→SENT, payments, recurring/run) — they post double-entry journals into accounting. So they flip *with* the accounting ledger core, same batch. |
| billing | **Partial** (1/3 methods clean) | Razorpay SaaS subscription. GET (org subscription read) clean; **defer POST/PATCH** (live Razorpay REST + HMAC verify) until the Razorpay client is ported. Bundle the inbound `webhooks/razorpay` (HMAC-verified, writes `platform_payments`) here. |

**Rationale:** invoices' in-process accounting import means they cannot be split. Vendors map onto `crm.clients` (Batch 3) so the AR/AP ledgers resolve.
**Key coupling:** Indian-GST tax split (CGST/SGST/IGST) + idempotency `(orgId,sourceType,sourceId,sourceEvent)` must port intact; replace the in-process import with a co-located journal-posting service. Wrap billing's plan-mutating POST/PATCH in an owner/admin ability check on port (current security gap: any member can change the org plan).
**Decision needed:** Razorpay client port vs. keep proxied to FE — see needsDecision.

---

## Batch 6 — Comms realtime & calendar (chat ISOLATED)
**Domains:** `chat`, `calendar`
**Effort:** L (chat realtime port is fiddly/high-risk; calendar aggregator M–L).

`chat` is integration-heavy (Ably + web-push + in-process typing Map) — isolated. Migrating it gives the Batch-4 deal-stage event its permanent consumer.

| Domain | Portability | Notes |
|---|---|---|
| chat | **Partial** (13/17 clean) | 13 plain messaging-CRUD routes port now (channels, messages CRUD, reactions, read, presence, status, unread, search). **Defer 4:** the AI-assistant route (`chat/route.ts`, Gemini + writes tasks — split into an `ai/assistant` domain), `channels/[channelId]/messages` POST (Ably + web-push fan-out), `typing` (in-process `typingState` Map — **must move to Redis/Ably presence**, a scaling-correctness fix), `ably-token`. |
| calendar | **Partial** (4/5 clean) | events CRUD + rsvp + export port now (writes only own `calendar_events`/`event_attendees`); the unified-feed `events` GET aggregates reads from hr leaves/holidays + recruitment interviews + tasks (resolve via shared schema). **Defer 1:** `create-meet` (Google OAuth token refresh + Calendar v3 Meet link, reads `users.googleRefreshToken`) until the Google integration lands. |

**Rationale:** chat is written to by deals (Batch 4); migrating it here lands the permanent event consumer. calendar's own writes are self-contained; its fan-out reads lag their HR/projects sources (Batches 7–9).
**Key coupling:** chat in-process typing Map + Ably singleton are the two scaling blockers — fix on port (Redis/Ably presence; no module-level singleton).
**Note:** the 7 `app/api/auth/calendar/**` OAuth connect/callback routes STAY in the frontend with NextAuth (see staysFrontend).

---

## Batch 7 — HR core anchor (GIANT-ISOLATED, XL)
**Domains:** `hr` (core, ~150 of 266 routes portable), `onboarding`
**Effort:** XL (sheer surface; provisioning writes; multiple integrations).

The largest domain in the repo — isolated. Slice it: clean read/CRUD leaf modules first (departments, holidays, designations, skills, devices, assets), then leaves/attendance/payroll, then defer the integration-heavy + recruitment sub-tree.

| Domain | Portability | Notes |
|---|---|---|
| hr (core) | **Partial** (~150/266 clean-shaped) | ~150 plain org-scoped CRUD/read routes port now (but ALL need the NextAuth→backend auth-context bridge). **Defer ~116:** ~28 fire `createNotification` (Batch 1 — can flip once live), many call `writeAuditLog`, leave/exit/onboard dispatch inngest webhooks + automation engine (Batch 10), AI scoring (Gemini), Google Calendar sync, R2 vault, email; `employees/onboard` writes `users`+`organizationMembers`+`passwordResetTokens` (auth boundary). |
| onboarding | **Partial** (5/8 clean) | Progress/templates/tasks-read + personal-details + bank-details PATCH port now. **Defer 3:** `submit` (seeds `leaveBalances` from the LEAVE domain — migrate leave first, same batch), `documents` (R2), `tasks/[taskId]` (completion email fan-out). |

**Rationale:** Depends on notifications (Batch 1), users/org/branches/RBAC (Batch 2), storage/email. Onboarding mutates the `users` employee profile + seeds `leaveBalances` — cannot be standalone; moves with hr core.
**Note:** The ~116 deferred HR routes flip incrementally as their dependencies (notifications already up; audit sink; automation/inngest in Batch 10; AI in Batch 9) land — HR is a long-running batch, not a single cutover.

---

## Batch 8 — Recruitment & public hiring edges (GIANT-ISOLATED, XL)
**Domains:** `hr/recruitment` (~120 routes, the recruitment sub-tree of hr), `careers`, the recruitment slices of `public`
**Effort:** XL (densest integration spread in the repo).

Shares the `hr/hiring` schema (candidates/applications/jobPostings/interviews) with hr core, so it follows Batch 7. Densest integration spread: OpenAI resume parsing, Gemini scoring, Twilio SMS, Google Calendar scheduling, e-sign offers, R2 vault.

| Domain | Portability | Notes |
|---|---|---|
| careers | **Partial** (3/5 clean) | 3 public GET read routes (job lists/detail) port now. **Defer 2:** both `apply` POSTs write `candidates`+`candidateApplications` (recruitment schema) — flip with the recruitment sub-tree. |
| public (recruitment slices) | **Partial** | `application-status`, `offer/[token]` read/respond port; **defer** `careers/.../apply` (candidates), `interview-booking` (writes interviews+calendarEvents + recruiter email). These ship WITH recruitment. |

**Rationale:** careers/public/apply are *unauthenticated write edges* into the same hiring tables — migrate together or expose a recruitment-intake API the public site calls. Add the missing rate-limiting on port; preserve token/slug validation.

---

## Batch 9 — Projects (GIANT-ISOLATED) + support (GIANT-ISOLATED) + AI service
**Domains:** `projects` (~62 routes), `support` (tickets + KB/RAG), `ai`
**Effort:** XL (projects 62 routes + support RAG infra + AI service; high-risk).

Three large domains that converge: projects is the biggest single business domain; support's cs-health read path becomes same-service; ai writes back into leads/candidates (now migrated) and gates on plan/feature flags.

| Domain | Portability | Notes |
|---|---|---|
| projects | **Partial** (58/62 clean) | Remarkably self-contained — 58 routes port now (all CRUD + analytics/reports). **Defer 4 low-friction:** `[projectId]` PATCH (assign email), `tickets` POST (email+notification), `reports/snapshot` (needs scheduler parity, Batch 10), `from-deal` (waits on a Nest deals reader — deals is Batch 4, so this unblocks). Note `projects:timesheets` is missing from the AbilitySubject union — fix on port. |
| support | **Partial** (11/22 clean) | Clean KB/macros/routing CRUD + ticket reads port now. **Defer 11:** ticket create/PATCH/messages (email + ce-dashboard cache), entire KB RAG surface (OpenAI embeddings + pgvector + Gemini), R2 attachments. Tighten the `withAuth`-only tickets sub-domain to a `support:tickets` CASL subject on port. |
| ai | **Partial** (13/20 clean) | 13 CRM-backed or zero-DB LLM routes port now (account-summary, nl-search, score-lead, predict-deal, churn-risk, etc.). **Defer 7:** depend on unmigrated recruitment/HR/helpdesk/projects (score-candidate, attrition-risk, generate-review, helpdesk-reply, prioritize-tasks, suggestions, generate-jd). Port the OpenAI/LangChain wrapper + `requireFeature` billing gate as a shared primitive (could be pulled into Batch 1). |

**Rationale:** by Batch 9 ai's read/write targets (leads/candidates/CRM/HR) are migrated, so ai can call their APIs instead of direct cross-DB writes. Support KB needs pgvector + OpenAI/Gemini + R2 — provision pgvector before this batch.
**Decision needed:** OpenAI/Gemini provider + pgvector provisioning for support KB and ai — see needsDecision.

---

## Batch 10 — Worker/scheduler tier & event backbone (LAST-ish)
**Domains:** `inngest` (~33 functions), `cron` (9 entrypoints), `webhooks` (outbound mgmt + dispatcher), `integrations` (git webhook)
**Effort:** L (low route count, maximal fan-out + dedupe + event-contract design).

The event/worker backbone that fans into virtually every domain — moves after the domains it triggers exist on NestJS. cron heavily overlaps inngest (same jobs registered twice) — dedupe here.

| Domain | Portability | Notes |
|---|---|---|
| inngest | **Stays-frontend until end** (0/1 portable) | The `inngest/route.ts` serve() endpoint registers 33 functions writing across notifications/HR/recruitment/billing/projects/calendar/webhooks. Migrate functions WITH their owning domain where possible; the serve() endpoint + cross-domain digests land here. NestJS must host an Inngest client. |
| cron | **Partial → deferred** (0/9 portable now) | All 9 jobs write/aggregate across HR/recruitment/CRM. Re-home onto a Nest scheduler (`@nestjs/schedule`) calling migrated services. Harden `scheduled-reports` auth to the shared cron-secret guard (currently weak inline compare). |
| webhooks | **Partial** (2/3 clean) | The 2 webhook-endpoint CRUD files port now (early, with Batch 5 even). **Defer** `webhooks/razorpay` (→ moved into Batch 5 with billing). Outbound dispatcher moves with inngest. |
| integrations | **Defer** (0/3 clean) | `git/webhook` follows the projects/tickets domain (Batch 9). `google/auth` + `google/callback` are intertwined with NextAuth/`users` refresh-token storage → **stay frontend** (see staysFrontend). |

**Rationale:** must move last (or co-locate with the event bus) — depends on all domains it triggers. Run cron/inngest in both places only with existing Redis idempotency ON; cut monolith registrations per-domain as targets land.
**Key coupling:** design the event contract up front — hardest piece to strangle.

---

## Batch 11 — Cross-cutting read layer & admin grab-bag (LAST)
**Domains:** `dashboard` (~21 widgets), `search`, `settings`, the remaining `public` slices
**Effort:** L (broad but mostly read-side; settings automation engine is the high-risk writer).

Read-only fan-outs and admin/edge surfaces that can only land once their underlying domains expose data — they go last.

| Domain | Portability | Notes |
|---|---|---|
| dashboard | **Partial** (3/21 clean) | 3 clean now (today-activities, role-stats, announcements GET — own table). **Defer 18** read-fan-outs across HR/projects/recruitment — flip as those sources migrate (Batches 7–9). Pure consumer; never blocks earlier batches. |
| search | **Defer** (0/1 portable now) | Global omnibox fans across deals/clients/tickets/leads/contacts. leads/contacts migrated; needs deals (Batch 4) + clients (Batch 3) + tickets (Batch 9) readable. Read-only, so flips once sources land. Add an ability check on port (currently `withAuth`-only). |
| settings | **Partial** (13/15 clean) | 13 clean admin CRUD (api-keys, automations CRUD, custom-fields, feature-flags, git connections, ai-usage) port once the auth/RBAC bridge exists. **Defer 2:** `automations/[ruleId]/test` (automation engine → email + tasks + inngest) and `email-templates/test` (real email send) — land after Batch 10. |
| public (remaining) | **Partial** | The genuinely self-contained slices (roadmap/feedback/vote; already-migrated lead-form/nps) flip early; kb/ask (RAG → Batch 9), intake (projects → Batch 9), kb attachments (R2) follow their owning domain. Preserve token-equality contract + add throttling. |

**Rationale:** these read shared tables during overlap and become same-service queries once their sources land. Decide direct-join vs. materialized read-model for 10M scale. settings' automation engine is the heavy cross-domain writer — verify all write targets migrated before enabling it on NestJS.

---

## Stays in the frontend (do NOT migrate)

- **NextAuth** — the sole auth authority (cookie/session issuance, sign-in/sign-up, session JWT minting). NestJS only consumes the JWT + resolves RBAC.
- **`app/api/auth/calendar/**`** (7 routes) and **`integrations/google/auth` + `google/callback`** — Google/Microsoft OAuth connect/callback flows that write `users.googleRefreshToken`/`googleEmail` (NextAuth-owned identity columns). Stay FE permanently alongside NextAuth.
- **`inngest/route.ts` serve() endpoint** — stays-frontend until *every* domain it fans into is migrated (Batch 10); even then, NestJS must first host an Inngest client.
- **`users`/identity table write boundary** — `org/setup`, `organization/members/[memberId]` role write, `branches` create (`users.branchId`), `hr/employees/onboard` user provisioning, and any session-invalidation (`invalidateUserSession`) either stay FE or run as a cross-service callback into the NextAuth/session layer.
- **Frontend `lib/api-client.ts` per-prefix router itself** — the strangle chokepoint; it stays in FE and grows its `MIGRATED_PREFIXES` allowlist as each batch lands.

---

## Decisions needed (block the relevant batch's *write/defer* routes, not the clean ones)

1. **RBAC grants for `withAuth`-only domains** — contacts (already flagged), and the many CRM/HR/support routes that today have *no* CASL ability check (any logged-in member can CRUD). Decide which roles get `crm:quotes`, `support:tickets`, `crm:clients`, `sales`, billing plan-mutation, branch/org writes, etc., before enabling ability guards (else 403 everyone). Default: mirror source `withAuth` (auth-only) on port, harden later.
2. **Messaging provider for `notifications/dispatch`** — confirm Resend (email) + Twilio (SMS/WhatsApp) as the backend adapters (matches source). Blocks notifications `dispatch` + many HR/support/deal email side effects.
3. **Razorpay client** — port the Razorpay REST/HMAC client into NestJS vs. keep `billing` POST/PATCH + inbound webhook proxied to FE. Blocks Batch 5 billing writes.
4. **AI provider + pgvector** — OpenAI (LangChain) vs. Gemini split is already in the code (CRM-AI uses OpenAI; chat/support RAG uses Gemini + OpenAI embeddings). Confirm provisioning pgvector on Neon before Batch 9 support KB / ai RAG. Also confirm `session.plan` is forwarded on the backend auth context for the `requireFeature` billing gate.
5. **Event-bus contract** — for Batch 10: how deal-stage/chat-channel, automation, and cron/inngest dedupe events are modeled (NestJS Inngest client vs. native queue). Hardest single design decision; pin it before Batches 4/6 ship their event bridges.
6. **`incentives` module** — stand up a dedicated incentives module in Batch 3 (so clients' INVEST PATCH can flip) vs. leave that PATCH on the legacy handler longer. Affects Batch 3/4 boundary.
7. **Read-model strategy** — direct cross-table reads (same DB, fine short-term) vs. a materialized read store for dashboard/reports/search at scale. Decide before Batch 11.

---

## Batch summary table

| Batch | Domains | Theme | Full vs Partial | Effort |
|---|---|---|---|---|
| 1 | notifications, push, storage, platform | Foundation sinks & warm-ups | full: push, platform · partial: notifications, storage | L |
| 2 | rbac, roles, org, organization, branches | Security foundation (isolated) | full: rbac, roles · partial: branches, org, organization | L |
| 3 | clients, quotes, customer-executive, reports | CRM leaves & conversion targets | full: quotes, customer-executive, reports · partial: clients | L |
| 4 | deals, sales, lead-conversion | CRM pipeline (deals isolated) | partial: deals, sales | L |
| 5 | accounting, invoices, billing, webhooks/razorpay | Finance (accounting isolated) | partial: all | L |
| 6 | chat, calendar | Comms realtime (chat isolated) | partial: chat, calendar | L |
| 7 | hr (core), onboarding | HR core anchor (isolated) | partial: hr, onboarding | XL |
| 8 | hr/recruitment, careers, public(hiring) | Recruitment & public edges (isolated) | partial: all | XL |
| 9 | projects, support, ai | Projects + support + AI (each isolated) | partial: all | XL |
| 10 | inngest, cron, webhooks, integrations | Worker/scheduler & event backbone | stays/defer: inngest, integrations · partial: cron, webhooks | L |
| 11 | dashboard, search, settings, public(rest) | Cross-cutting read layer & admin | partial: dashboard, settings, public · defer: search | L |

Stays frontend: NextAuth, calendar/google OAuth, inngest serve() (until end), users-write boundary, api-client router.
