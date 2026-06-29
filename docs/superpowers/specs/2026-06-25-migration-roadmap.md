# Backend Extraction → NestJS — Strangler Migration Roadmap

**Date:** 2026-06-25
**Status:** Draft for review
**Author:** Aditya + Claude
**Companion to:** [`2026-06-25-backend-extraction-nestjs-design.md`](./2026-06-25-backend-extraction-nestjs-design.md)

This doc sequences the move of the remaining ~45 API domains into the NestJS service (port 1500) after the **Leads pilot**. The design spec covers *how* one domain is ported (kernel, auth bridge, shared schema, per-domain cutover); this doc covers *in what order* and *why*, with the riskiest couplings called out.

The hard ordering rule throughout: **a domain is never migrated before the domains it WRITES into.** A read-only fan-out (dashboards, search, reports) may lag its data sources because, during the strangler period, NestJS can read not-yet-migrated tables directly via the shared schema. But a cross-domain *write* (e.g. lead-conversion inserting `clients` + `incentives` + `notifications`, deal stage-change writing `chatChannels`) requires the written-to tables — and ideally their service contract — to already exist on the NestJS side, or to be handled via the strangler bridges in §3.

Already on NestJS (from the design spec): **shared kernel** (JWT auth bridge, CASL RBAC, `CacheService`, pagination, `AuditService`, branch-filter tenancy, rate-limit, `AllExceptionsFilter`, logging) + **ApiKeyGuard**. **CRM Leads core** is the in-flight pilot.

---

## 1. Dependency graph summary

### 1.1 The foundational domains (everyone depends on these)

These are written to or resolved-through by most business domains. They must lead the migration (or be exposed behind a stable shared interface) before their dependents can cut over.

| Foundational domain | Why it is foundational | Inbound dependents (sample) |
|---|---|---|
| **auth / rbac / roles** | Session/JWT shape + CASL ability resolution is the contract every guard uses. `roles.permissions` JSON drives CASL; changing a role must invalidate sessions. | Literally every domain. |
| **org / organization / branches** | Org + branch are the multi-tenancy and row-scoping primitives (`branch-filter.ts`, `getBranchUserIds`). | hr, dashboard, reports, org admin, most lists. |
| **notifications (+ push)** | Org-wide notification HUB. ~25 modules call `sendNotification` / `createNotification` / `notifyAllMembers` / `notifyByRoles`. Multi-channel dispatch (email/SMS/WhatsApp/web-push). `push_subscriptions` is shared by chat + notifications inngest. | leads, deals, clients, hr (leaves/recruitment), sales/commissions, projects/tickets, targets, support, automation, inngest digests. |
| **storage (R2)** | Shared file service (`lib/storage.ts`). Every file-handling domain depends on it. | hr docs, recruitment resumes, KB PDFs/attachments, chat attachments metadata, candidate docs, blog covers. |
| **email** (integration, not a route domain) | `lib/email*` send helpers; "hardcoded EMAIL_EVENTS" title-match in notifications. | hr, deals, projects, support, onboarding, recruitment, cron. |
| **audit-log** | Read API is trivial; the WRITE side `createAuditLog` is invoked from ~41 call sites. Must remain a shared cross-cutting sink (event/queue or shared DB write). | auth, org, roles, settings, storage, HR, CRM. |
| **accounting GL** | General-ledger sink for the whole CRM. `invoices` writes journal entries by importing `lib/accounting` in-process; vendors map onto `crm.clients`. | invoices, billing-of-customer (not SaaS billing), purchase-bills, vendor/customer ledgers. |

### 1.2 Cross-domain write edges (the ordering constraints that actually bind)

These are the writes that force sequencing — the written-to side must exist first:

- **leads → clients + clientAccounts + deals + incentives + notifications** — `lib/services/lead-status.ts` conversion creates `clientAccounts`/`clients` rows (with `leadId`), `deals` rows (`deals.leadId`), and fires notifications.
- **clients/[clientId] → incentives + incentiveConfig + notifications + clientAccountActivities** — on conversion/investment, a CRM client write fans into the incentives payout tables.
- **invoices → accounting** — every invoice/payment state change posts double-entry `journal_entries`/`journal_lines` via `lib/accounting/*`.
- **deals (deal-update.ts) → chat (chatChannels + chatChannelMembers) + email + notifications** — stage→Negotiation auto-creates a chat channel.
- **deals approvals → notifications** (approvers).
- **tasks/[taskId]/complete → crm.crmActivities** — completing a task writes a CRM activity row.
- **projects (from-deal) → reads deals/clients, FKs dealId/clientId/managerId**; ticket-update → notifications.
- **chat (message send) → web-push (`sendPushToChannelMembers`)**; `chatChannels.linkedDealId` → crm.deals.
- **onboarding submit → users profile + leaveBalances + documents** (HR tables).
- **hr/recruitment + careers + public/apply → candidates/candidateApplications/jobPostings** (shared hiring schema; careers/public are unauthenticated write edges).
- **support ticket create → notifications + invalidates supportDashboard/ceDashboard caches**; csat consumes resolved tickets; cs-health (clients) reads supportTickets.
- **ai (score-lead/score-candidate) → writes leads.score / candidates.rating**; nl-search reads CRM.
- **automation engine (settings) → writes leads/deals/tickets/notifications**.
- **cron + inngest → fan out into nearly every domain** (the worker backbone).

### 1.3 Read-only fan-out domains (may lag their sources)

`dashboard`, `reports`, `search`, `sales` dashboards (12 of ~20 handlers), `customer-executive`/cs-health, `accounting` reports. These only **read** across domains, so they can migrate after their sources or keep reading shared tables during overlap. They become cross-service queries once their sources move — track that as a read-model decision, don't let it block ordering.

---

## 2. Wave-ordered roadmap

Effort key: **S** ≤ ~1 week, **M** ~1–2 weeks, **L** ~2–4 weeks, **XL** > ~1 month (or needs heavy integration/infra provisioning). Estimates assume the kernel exists and one engineer-stream per wave with parallelism inside a wave.

### Wave 0 — Pilot (in flight)
**Domains:** `leads` (CRM Leads core).
**Rationale:** Proves the kernel end-to-end (CRUD, RBAC, pagination, Redis cache parity, API-key ingest, Inngest events). Establishes the per-domain cycle. Not re-counted below.
**Effort:** (in progress)

---

### Wave 1 — Foundation: shared sinks & primitives
**Domains:** `notifications`, `push`, `storage`, `audit-log`, `blog`, `platform`.
**Rationale / what it unblocks:** Stand up the things everyone writes to **first**, behind a stable write-path, so later domains can fire notifications, store files, and emit audit events against the NestJS service instead of the monolith. `notifications` is the single hardest sequencing item *because* so many domains write to it — getting its write API (RPC/event or shared-DB write) up early is what lets every subsequent wave cut over cleanly. `push` co-extracts with notifications (shared `push_subscriptions` + send helpers). `storage` is the shared R2 file service. `audit-log` read API lifts trivially; keep `createAuditLog` as a shared sink. `blog` and `platform/visit` are clean, self-contained, zero cross-domain coupling — ideal low-risk warm-ups to run in parallel and build team muscle.
**Must already be migrated:** kernel + auth bridge (done). Nothing else.
**Key couplings to handle now:** notifications must keep a write-path callable by *not-yet-migrated* Next.js domains during overlap (shared-DB write, or NestJS exposes a `POST /notifications/dispatch` the monolith calls). `notification_preferences` exists but is unenforced — port behavior as-is, don't "fix" silently.
**Effort:** L (notifications dispatch + multi-channel + push send helpers are the bulk; blog/platform/audit-read are S each).

---

### Wave 2 — Identity & tenancy core
**Domains:** `auth` (backend-token + supporting routes), `rbac`, `roles`, `org`, `organization`, `branches`.
**Rationale / what it unblocks:** This is the security and scoping foundation. CASL ability-building, role CRUD (with session invalidation), org/branch scoping primitives must be authoritative on NestJS before any RBAC-heavy business domain cuts over. `branches` must become a shared primitive (`branch-filter`) reused across hr/dashboard/reports. NextAuth stays the sole auth authority in Next.js (per design spec) — NestJS only *consumes* the JWT and *resolves* RBAC; we port ability-building and role/permission management, not the NextAuth cookie path.
**Must already be migrated:** Wave 1 (`audit-log` sink — auth/org/roles all write audit logs; `notifications` for invite flows).
**Key couplings to handle now:** changing a role/permission must invalidate sessions (Redis `revoked:session:*`) coherently across both services — wire the same key. `org` overlaps `organization`; migrate them together. Do **not** split RBAC resolution from the JWT contract.
**Effort:** L (rbac/roles/auth are low route-count but central and high-risk; org/organization/branches are M combined).

---

### Wave 3 — CRM clean leaves & lead-conversion targets
**Domains:** `contacts`, `csat`, `clients` (incl. `clientAccounts`), `incentives` (the payout config/tables that `clients` writes into), `targets`.
**Rationale / what it unblocks:** `contacts` is the cleanest CRM domain (pure CRUD/search/vcard, no cross-domain writes) — fast confidence-builder. The critical reason this wave is here: **lead-status conversion writes into `clients`/`clientAccounts`** and **`clients/[clientId]` writes into `incentives`/`incentiveConfig`**. To honor "migrate the written-to side first," `clients` + `incentives` must land before any conversion logic moves into NestJS. `csat` is light but its data feeds cs-health (clients) — co-locate the read path. `targets` is small (user-hierarchy read + notification fan-out) and is read by sales revenue-vs-goal; move it now so `sales` later has it.
**Must already be migrated:** Waves 1–2 (notifications, audit, org/branches, users/RBAC). Leads pilot (for the `leadId` backref, though leads can stay readable via shared schema).
**Key couplings to handle now:** `clients` cs-health reads `supportTickets` (support not yet migrated) — read shared `supportTickets` table during overlap, or stub the SLA component. `clientAccounts` rows are *also* created by lead-conversion — until that conversion logic moves (Wave 4), the monolith still writes these tables, so NestJS must tolerate concurrent writers (it's the same DB; fine).
**Effort:** L (clients is heavy — clientAccounts health/churn/renewals/onboarding + incentives payout; contacts/csat/targets are S–M).

---

### Wave 4 — CRM pipeline & lead-conversion cutover
**Domains:** `deals` (+ approvals), `quotes`, `tasks`, then **finalize lead-status conversion** into NestJS.
**Rationale / what it unblocks:** `deals` is the core pipeline and a heavy writer: stage-change fires email + writes `chatChannels`/`chatChannelMembers` (chat) + notifications; approvals notify approvers; rows are created by lead-conversion (`deals.leadId`). It must land after notifications (Wave 1) and clients (Wave 3), and its **chat-channel side effect** needs handling (see §3 — emit an event or keep writing the shared chat tables until chat migrates in Wave 6). `quotes` references `deals`/`clientAccounts` (read joins) so it follows `deals`. `tasks` writes `crm.crmActivities` and is polymorphically attached to LEAD/DEAL/CONTACT/PROJECT — its "related entity" contract belongs with CRM, so move it here. With `clients` + `deals` + `incentives` + `notifications` now on NestJS, the **lead-status conversion service can be fully cut over** (it writes all of those) — this closes the most-cited ordering constraint.
**Must already be migrated:** Waves 1–3 (notifications, clients/clientAccounts, incentives, contacts, targets, leads).
**Key couplings to handle now:** deal-update → chat: emit a `deal/stage.changed` event (consumed later by chat) OR write `chatChannels`/`chatChannelMembers` via shared schema until Wave 6, then swap. deal-update → email: carry the send or emit event. tasks → crmActivities: write shared `crmActivities` (CRM core) directly — same DB.
**Effort:** L (deals heavy/high-risk; quotes S; tasks M; conversion finalization M).

---

### Wave 5 — Finance
**Domains:** `accounting` (GL + purchase-bills/vendor-payments), `invoices`, `billing` (Razorpay SaaS subscription).
**Rationale / what it unblocks:** `invoices` posts journal entries by importing `lib/accounting` in-process, so **accounting must move with or just before invoices** — they ship as one unit. Re-home `purchase_bills`/`purchase_bill_items`/`vendor_payments` out of `crm/billing.ts` into the accounting module, and expose the journal-posting API that invoices calls (replacing the in-process import with a service call or co-located module). Vendors map onto `crm.clients` (no separate table) — so `clients` (Wave 3) must already exist. `billing` (Razorpay subscription) is entirely separate from the GL — self-contained once Razorpay creds + shared `subscriptions` tables are exposed; bundle the **inbound Razorpay webhook** (`webhooks/razorpay`) here, not with generic webhooks.
**Must already be migrated:** Waves 1–3 (clients = vendors/customers, audit), Wave 4 (invoices link to clients; AR ledgers read invoices/payments).
**Key couplings to handle now:** Indian-GST tax logic (`splitTaxPool` CGST/SGST/IGST) + idempotency `(orgId,sourceType,sourceId,sourceEvent)` must port intact. `recurring/run` is a manual POST (not cron) — keep it a route. Cache tags (`journal`/`trialBalance`/`profitLoss`/`balanceSheet`/`agedPayables`/`vendorLedger`/`gstr1`) shared with web.
**Effort:** L (accounting+invoices are the deepest financial coupling, high-risk; billing is S).

---

### Wave 6 — Comms realtime & calendar
**Domains:** `chat`, `calendar`.
**Rationale / what it unblocks:** `chat` is written to by `deals` (Wave 4) via the deal-update side effect — by migrating chat here, the Wave-4 event/shared-write bridge gets its permanent consumer. Needs Ably REST client + web-push (Wave 1) + a **distributed typing store** (Redis/Ably presence) to replace the in-process `typingState` Map (horizontal-scaling blocker). `calendar` is a heavy read-side aggregator joining FIVE domains (leaveRequests, interviews, tasks, holidays, its own events) + writes via Google Meet using `users.googleRefreshToken` — most of those sources are HR/projects, so calendar reads shared tables during overlap and only its own `calendar_events`/`event_attendees` are authoritative.
**Must already be migrated:** Waves 1–2 (push, users/org), Wave 4 (deals — `linkedDealId`; tasks — calendar reads tasks.dueDate).
**Key couplings to handle now:** chat in-process typing Map and Ably singleton are the two scaling blockers — fix on port (Redis/Ably presence). calendar `create-meet` needs the auth-domain `googleRefreshToken` column — read via shared schema. chat `linkedDealId` FK → crm.deals (now migrated).
**Effort:** L (chat realtime port is fiddly/high-risk; calendar aggregator fan-out is M–L).

---

### Wave 7 — HR core anchor
**Domains:** `hr` (core, ~178 routes), `onboarding`, `expenses` (the lone import route — folds into hr expenses), `goals` (OKR).
**Rationale / what it unblocks:** Largest, broadest surface in the repo (~280 handlers across ~18 `hr:*` subjects). It depends on notifications (Wave 1), calendar (Wave 6), and accounting (Wave 5 — `integrations/accounting-export` reads payrolls+expenses → Tally/QuickBooks) — hence it lands after all three contracts are defined. `onboarding` mutates the `users` employee profile and seeds `leaveBalances` — it **cannot be standalone**, moves with/just after hr core. `expenses/import` shares the HR `expenses` table + `hr:expenses` RBAC — migrate with hr, not separately. `goals` (OKR) is actually modeled under the projects domain (`projects:goals`) with only optional `okrLinks` to tickets/projects — highly portable; park it here or with projects (low blast radius either way).
**Must already be migrated:** Waves 1 (notifications, storage, email), 2 (users/org/branches/RBAC), 5 (accounting export contract), 6 (calendar for interview sync).
**Key couplings to handle now:** `employees/onboard` is a heavy account-provisioning write (creates user + membership + salary structure + reset token + welcome email + inngest) — touches auth-domain tables; do as a transaction against shared schema. HR uses `crm:incentives` (foreign RBAC subject) for incentive approve/reject — incentives already on NestJS (Wave 3). Inngest HR functions (attendance anomaly, leave escalation, onboarding lifecycle) move with the worker tier (Wave 10).
**Effort:** XL (sheer surface area; provisioning writes; AI resume-parser; multiple integrations).

---

### Wave 8 — Recruitment & public hiring edges
**Domains:** `hr/recruitment` (~88 routes), `careers`, the recruitment slices of `public` (apply, offer/[token], application-status, interview-booking).
**Rationale / what it unblocks:** Shares the `hr/hiring` schema (candidates/candidateApplications/jobPostings/interviews) with hr core, so it follows Wave 7. Heavy integration spread: OpenAI resume parsing, Gemini AI scoring (metered via usage-tracker — needs the AI-usage contract, Wave 9), Twilio SMS + Google Calendar interview scheduling, esign/Documenso offers, R2 candidate vault. `careers` and `public/apply` are **unauthenticated write edges** into the same hiring tables — migrate together (or expose a recruitment intake API the public site calls) and preserve CSRF/rate-limit/token validation. RBAC here is weak/inconsistent (mostly `withAuth` org-scope) — port as-is but note it.
**Must already be migrated:** Wave 7 (hr core + shared hiring schema), Wave 1 (notifications, storage, email), Wave 6 (calendar). AI scoring can lean on a shared AI-usage stub until Wave 9.
**Key couplings to handle now:** `headcountRequests → jobPostings` (create-job) and `offer → rollout-documents` conversion paths. Public apply is a spam surface with no rate limiting observed — add rate-limit on port. Define notification + calendar + AI-usage contracts before this wave.
**Effort:** XL (88 routes + the densest integration spread in the repo).

---

### Wave 9 — Projects, support & AI service
**Domains:** `projects` (~62 routes), `support` (tickets + KB/RAG), `ai`.
**Rationale / what it unblocks:** `projects` is the largest single business domain (tickets/sprints/epics/roadmap/whiteboards/billing); `from-deal` reads deals + FKs clientId/dealId/managerId — so it follows CRM (Wave 4) and auth (Wave 2). ticket-update → notifications (Wave 1). `support` clientId → crm.clients (Wave 3); ticket create → notifications + invalidates the CE/support dashboard caches; csat (Wave 3) consumes resolved tickets; **cs-health (clients, Wave 3) reads supportTickets** — that read path is finally same-service once support lands. Support KB needs the heaviest infra: pgvector + OpenAI embeddings + Gemini + R2 (provision pgvector before this wave). `ai` writes back into leads.score/candidates.rating and reads CRM+HR — by Wave 9 those targets are migrated, so AI can call their APIs instead of direct cross-DB writes (preferred post-migration shape); it also gates on plan/feature flags (settings/billing).
**Must already be migrated:** Waves 1–4 (notifications, clients, deals, contacts), Wave 2 (users/RBAC), Wave 7 (hr — for ai churn/attrition reads + ai candidate scoring), Wave 8 (recruitment — candidates.rating writes). pgvector provisioned.
**Key couplings to handle now:** support KB `reindex`/`reindex-all` are long-running — route to a queue/inngest (Wave 10). `customer-executive`/cs-health belongs with the clients context but reads supportTickets — now resolvable same-service. AI should prefer calling migrated domains' APIs over direct table writes.
**Effort:** XL (projects 62 routes + support RAG infra + AI service; high-risk).

---

### Wave 10 — Worker/scheduler tier & event backbone
**Domains:** `inngest` (~35 functions), `cron` (9 Vercel-cron entrypoints), `webhooks` (outbound endpoint mgmt + dispatcher).
**Rationale / what it unblocks:** This is the event/worker backbone that fans out into virtually every domain — it **must move last (or be co-located with the event bus)** because it depends on all the domains it triggers existing on NestJS. `cron` heavily overlaps `inngest` (same jobs registered twice) — **dedupe** during this wave. Existing idempotency keys (`cronIdempotencyCheck`, Redis) prevent double-processing during overlap. Outbound webhook dispatch is `lib/inngest` (webhook-dispatcher) — moves with inngest; the **inbound Razorpay webhook already shipped in Wave 5** (it belongs with billing, not here).
**Must already be migrated:** essentially all business domains (Waves 1–9) that these jobs touch.
**Key couplings to handle now:** design the event contract carefully (it is the hardest piece to strangle). Run cron/inngest in both places only with idempotency on; cut the monolith's registrations per-domain as each function's targets land. Become the (or a) worker service tier.
**Effort:** L (low route count but maximal fan-out + dedupe + event-contract design).

---

### Wave 11 — Cross-cutting read layer & admin grab-bag
**Domains:** `dashboard` (~21 widgets), `reports`, `search`, `sales` dashboards (the read/analytics 12 of ~20), `settings` (api-keys, automations, custom-fields, feature-flags, git, ai-usage, email-templates), `integrations` (git webhook, Google OAuth), the remaining `public` slices (lead-form, kb/ask, nps, roadmap feedback/vote, intake).
**Rationale / what it unblocks:** These are **read-only fan-outs** (`dashboard`/`reports`/`search`/`sales` dashboards) or admin/edge surfaces that can only land once their underlying domains expose data — so they go last. `search` and `dashboard` fan across CRM+HR+projects+support; with all of those migrated (Waves 3–9) they become same-service queries (or a dedicated read model). `sales` analytics (12 dashboard handlers over `deals`) follow deals — its writable bits (commissions/quotas/playbook) could go in Wave 4 if desired; the analytics tail lands here. `settings` is a grab-bag admin surface whose **automation engine writes leads/deals/tickets/notifications** — those targets are all migrated by now, so the engine can write safely. `integrations` (git webhook writes git links onto projects tickets; Google OAuth stores refresh tokens on users) consolidates calendar+git connection storage. Remaining `public` slices map to their backing domains (lead-form→CRM, kb/ask→support RAG, nps→customer-executive).
**Must already be migrated:** Waves 1–9 (the data sources). For sales analytics: Wave 4 (deals), Wave 3 (targets).
**Key couplings to handle now:** decide read-model strategy for dashboard/reports/search — direct cross-table reads (same DB, fine short-term) vs. a materialized read store (better at 10M scale). `settings` automation engine is the heavy cross-domain writer — verify all its write targets are migrated before cutover. Split the Razorpay inbound handler away from generic webhooks (already done, Wave 5).
**Effort:** L (broad but mostly read-side; settings automation engine is the high-risk writer).

---

## 3. Riskiest cross-domain couplings & strangler handling

During the strangler period, the two safe bridges are: **(A) NestJS writes/reads not-yet-migrated tables directly via the shared Drizzle schema** (same Neon DB — concurrent writers are fine), and **(B) NestJS emits an event / calls back to a Next.js (or NestJS) service** for side effects whose logic should not be duplicated. Prefer (B) for *behavioral* side effects (emails, channel creation, notification copy enrichment) and (A) for *plain data* reads/writes.

| # | Coupling | Risk | Strangler handling |
|---|---|---|---|
| 1 | **lead-conversion → clients + clientAccounts + deals + incentives + notifications** | High — touches 5 domains in one transaction. | Sequenced away: migrate clients/incentives (W3), deals/notifications (W1/W4) **before** finalizing conversion in W4. During overlap, NestJS writes those tables via shared schema (A); flip to service calls once each target is fully cut over. |
| 2 | **invoices → accounting (in-process `lib/accounting` import posting journal lines)** | High — direct code import, not an API. | Ship accounting + invoices as **one unit** (W5). Replace the in-process import with a co-located journal-posting service/module. Preserve `(orgId,sourceType,sourceId,sourceEvent)` idempotency so a stray double-post is a no-op. |
| 3 | **deals deal-update → chat (chatChannels/chatChannelMembers) + email + notifications** | High — load-bearing side effect on stage→Negotiation. | deals (W4) emits a `deal/stage.changed` **event** (B) for the chat channel + email; until chat lands (W6) a thin consumer writes the shared chat tables (A). Notifications already on NestJS (W1). After W6, chat module owns the consumer. |
| 4 | **notifications HUB — ~25 modules write to it** | High — if it's not up first, every domain that notifies is blocked. | Migrate **first** (W1) and expose a stable write-path: shared-DB write (A) for simple inserts + a `POST /notifications/dispatch` (B) for multi-channel. Not-yet-migrated Next.js domains keep calling `createNotification` (shared DB) with no change. |
| 5 | **audit-log write side — ~41 call sites** | Medium — ubiquitous, fire-and-forget. | Keep `createAuditLog` as a shared sink (A): both services write the same `auditLogs` table during overlap. Read API lifts in W1. Later, optionally route through an event/queue. |
| 6 | **storage/R2 + push send helpers shared across domains** | Medium — shared infra, not a domain boundary. | Extract as **shared services** in W1 (storage module, push send helpers) and let chat/notifications/hr/recruitment call them. Don't leave send helpers in the monolith once chat/notifications are out. |
| 7 | **chat in-process `typingState` Map + Ably singleton** | High (scaling blocker) — breaks under horizontal scale. | Fix on port (W6): move typing to Redis/Ably presence; instantiate Ably REST per-request/pooled, no module-level singleton. This is a *correctness* fix the extraction must not carry forward. |
| 8 | **calendar read-aggregator joins 5 domains; create-meet needs `users.googleRefreshToken`** | High — fan-out read + auth-column dependency. | calendar (W6) reads the 5 source tables via shared schema (A) during overlap; only `calendar_events`/`event_attendees` are authoritative. Read `googleRefreshToken` from the shared `users` table. Revisit as a read model if join cost bites. |
| 9 | **cron ↔ inngest duplicate job registration** | High — double-processing. | Dedupe in W10. Run in both places only with the existing Redis idempotency keys ON; cut monolith registrations per-domain as each function's targets land. |
| 10 | **inngest worker backbone fans into every domain** | High — hardest to strangle. | Migrate **last** (W10) or co-locate with the event bus. Design the event contract up front; migrate functions with their owning domain where possible, leaving only the serve() endpoint + cross-domain digests for W10. |
| 11 | **careers / public/apply — unauthenticated writes into hiring tables** | Medium — public write/spam surface. | Migrate **with** recruitment (W8) sharing the hiring schema, or expose a recruitment-intake API the public site calls. Add the missing rate-limiting on port; preserve token/slug validation + CSRF. |
| 12 | **ai writes back into leads.score / candidates.rating; reads CRM+HR** | High — cross-domain writes from a "service" domain. | Migrate ai in W9 after its read/write targets (leads W0, candidates W8, CRM/HR W3–7). **Prefer calling the migrated domains' APIs** over direct table writes post-migration. Keep the `aiUsageLogs` metering + plan/feature gates intact (billing dependency). |
| 13 | **settings automation engine writes leads/deals/tickets/notifications** | High — heavy cross-domain writer, admin surface. | Migrate in W11 after all write targets exist on NestJS. Verify each target is cut over before enabling the engine on NestJS; otherwise it writes shared tables (A) which is still safe. |
| 14 | **dashboard / reports / search read-fan-out across CRM+HR+projects+support** | Medium — coupling, not a write hazard. | Allow these to **lag** their sources (W11). Read shared tables during overlap; decide direct-join vs. read-model for 10M scale. No write hazard, so they never block earlier waves. |
| 15 | **roles/permissions change must invalidate sessions** | High — security correctness across two services. | rbac/roles (W2) write the same Redis `revoked:session:*` keys the web app uses; both services honor them. Never split RBAC resolution from the JWT contract. |

---

## 4. Per-domain cycle (applies to every domain in every wave)

Each domain follows the identical four-step strangler cycle from the design spec (§5) — no exceptions:

1. **Port** — move the routes into a NestJS module (thin controller; logic ported from `lib/services/**` + `server/queries|actions/**`; reuse existing Zod schemas as DTOs; wire RBAC via `@CheckAbility` / `@RequireModule`).
2. **Shadow-verify parity** — response shape (byte-compatible envelope), status codes, auth (401), RBAC (403), pagination, cache keys/parity, and **side effects** (notifications, audit, emails, Inngest events). Run the relevant k6 load test against both old and new at target throughput.
3. **Per-prefix cutover** — repoint that domain's TanStack hooks at the API base URL (the single `lib/api-client.ts` chokepoint, per-prefix).
4. **Delete Next routes** — remove `app/api/<domain>/**` and any now-dead `lib/services` / `server/queries|actions`, after verifying nothing else imports them. Update `MIGRATION.md` (domain done, route count, notes) — mirrors the repo's page-by-page `PAGES.md` discipline.

Cron + Inngest functions and realtime/webhook endpoints migrate **with their owning domain**; existing idempotency keys (`cronIdempotencyCheck`) prevent double-processing during overlap.

---

## 5. Wave summary table

| Wave | Domains | Theme | Effort |
|---|---|---|---|
| 0 | leads | Pilot (in flight) | — |
| 1 | notifications, push, storage, audit-log, blog, platform | Foundation sinks & primitives | L |
| 2 | auth, rbac, roles, org, organization, branches | Identity & tenancy core | L |
| 3 | contacts, csat, clients (+clientAccounts), incentives, targets | CRM clean leaves & conversion targets | L |
| 4 | deals (+approvals), quotes, tasks, lead-conversion cutover | CRM pipeline & conversion finalize | L |
| 5 | accounting (+purchase/vendor), invoices, billing (Razorpay) | Finance | L |
| 6 | chat, calendar | Comms realtime & calendar | L |
| 7 | hr (core), onboarding, expenses(import), goals | HR core anchor | XL |
| 8 | hr/recruitment, careers, public(hiring edges) | Recruitment & public hiring edges | XL |
| 9 | projects, support (+KB/RAG), ai | Projects, support & AI service | XL |
| 10 | inngest, cron, webhooks (outbound) | Worker/scheduler & event backbone | L |
| 11 | dashboard, reports, search, sales (analytics), settings, integrations, public (remaining) | Cross-cutting read layer & admin | L |
