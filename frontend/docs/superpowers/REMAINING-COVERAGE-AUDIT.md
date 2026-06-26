# REMAINING-COVERAGE-AUDIT — Next.js → NestJS strangler-fig

Definitive remaining-work audit. Source of truth for which frontend API route is migrated, in-flight, or remaining.

- Frontend routes enumerated: `frontend/app/api/**/route.ts` — **699 route files** (each may expose multiple HTTP methods).
- Backend master: `backend/src/modules/**` on branch **master @ e03bb67** — 36 modules, 516 route decorators across 64 controllers.
- In-flight branches (not yet merged): `port/b7`, `port/hra`, `port/hrb`, `port/leads`, `port/recruit`.

> Method: per-route HTTP methods + coupling imports were extracted by grep over all 699 files; backend coverage compared against the 516 master decorators + in-flight controllers; ambiguous handlers were read individually (storage, search, health, chat, cron jobs, onboarding, kb attachments, git webhook).

---

## CRITICAL FINDINGS (read first)

1. **Recruitment / interviews (S7/S8) are NOT in the repo.** The directive lists `recruit S7 hr-recruitment + S8 hr-interviews` as "committed on branches." Verified across **all six branches** (master, port/b7, port/hra, port/hrb, port/leads, **port/recruit**): there is **no `hr-recruitment` or `hr-interviews` module on any branch**. `port/recruit`'s tip diff vs master contains only the shared baseline (accounting/chat/invoices-write/projects-budget) — zero recruitment controllers. The **88 `hr/recruitment/*` frontend routes are counted as in-flight per the directive, but are AT RISK / unverified** and must be re-confirmed or re-ported. They are the single largest block of work.

2. **accounting / chat / invoices-write are already ON master**, not just in-flight. master already has `accounting/*` (4 controllers, 26 decorators), `chat/*` (3 controllers), and `invoices-write`. So b7's accounting/chat/invoices count as covered-on-master.

3. **chat is 15/17 on master.** The 2 unported chat routes are `chat/ably-token` (Ably) and `chat/route` (AI assistant via LangChain) — both deferred.

---

## (1) Summary counts

| Bucket | Count |
|---|---:|
| **Total frontend route files** | **699** |
| Covered on master (e03bb67) | 326 |
| Covered in-flight (port branches) | 291 |
| &nbsp;&nbsp;↳ of which recruitment S7/S8 CLAIMED-but-ABSENT | 88 |
| Remaining — PORTABLE-NOW | 9 |
| Remaining — DEFERRED (integration-blocked) | 41 |
| Remaining — STAYS-FRONTEND | 32 |

Deferred breakdown by integration: **AI/LLM 22 · Email 9 · R2/S3 5 · Razorpay 2 · Google Calendar/Meet 1 · Ably 1 · Automation-engine 1**.

In-flight detail: HR S1–S6 (175 confirmed-present) + HR S7/S8 (88 claimed-absent) + leads-completion (28) = 291.

---

## (2) Per-domain status

total = on-master + in-flight + remaining-portable + remaining-deferred + stays-FE

| Domain | total | on-master | in-flight | rem-portable | rem-deferred | stays-FE |
|---|---:|---:|---:|---:|---:|---:|
| accounting | 21 | 21 | 0 | 0 | 0 | 0 |
| ai | 20 | 0 | 0 | 0 | 20 | 0 |
| audit-log | 3 | 3 | 0 | 0 | 0 | 0 |
| auth | 24 | 0 | 0 | 0 | 0 | 24 |
| billing | 1 | 0 | 0 | 0 | 1 | 0 |
| blog | 5 | 5 | 0 | 0 | 0 | 0 |
| branches | 2 | 2 | 0 | 0 | 0 | 0 |
| calendar | 5 | 4 | 0 | 0 | 1 | 0 |
| careers | 2 | 2 | 0 | 0 | 0 | 0 |
| chat | 17 | 15 | 0 | 0 | 2 | 0 |
| clients | 15 | 15 | 0 | 0 | 0 | 0 |
| contacts | 1 | 1 | 0 | 0 | 0 | 0 |
| cron | 9 | 0 | 0 | 4 | 5 | 0 |
| crm | 26 | 26 | 0 | 0 | 0 | 0 |
| customer-executive | 7 | 7 | 0 | 0 | 0 | 0 |
| dashboard | 21 | 21 | 0 | 0 | 0 | 0 |
| deals | 13 | 13 | 0 | 0 | 0 | 0 |
| expenses | 1 | 0 | 0 | 1 | 0 | 0 |
| goals | 7 | 7 | 0 | 0 | 0 | 0 |
| health | 1 | 0 | 0 | 0 | 0 | 1 |
| hr | 266 | 0 | 263 | 0 | 0 | 3 |
| integrations | 3 | 0 | 0 | 1 | 0 | 2 |
| inngest | 1 | 0 | 0 | 0 | 0 | 1 |
| invoices | 6 | 6 | 0 | 0 | 0 | 0 |
| leads | 31 | 3 | 28 | 0 | 0 | 0 |
| notifications | 6 | 5 | 0 | 0 | 1 | 0 |
| onboarding | 8 | 5 | 0 | 1 | 2 | 0 |
| org | 2 | 1 | 0 | 0 | 0 | 1 |
| organization | 8 | 6 | 0 | 1 | 1 | 0 |
| platform | 1 | 1 | 0 | 0 | 0 | 0 |
| projects | 62 | 62 | 0 | 0 | 0 | 0 |
| public | 18 | 16 | 0 | 0 | 2 | 0 |
| push | 2 | 2 | 0 | 0 | 0 | 0 |
| quotes | 4 | 4 | 0 | 0 | 0 | 0 |
| rbac | 3 | 3 | 0 | 0 | 0 | 0 |
| reports | 5 | 5 | 0 | 0 | 0 | 0 |
| roles | 3 | 3 | 0 | 0 | 0 | 0 |
| sales | 16 | 16 | 0 | 0 | 0 | 0 |
| search | 1 | 0 | 0 | 1 | 0 | 0 |
| settings | 15 | 13 | 0 | 0 | 2 | 0 |
| storage | 3 | 0 | 0 | 0 | 3 | 0 |
| support | 22 | 22 | 0 | 0 | 0 | 0 |
| tasks | 9 | 9 | 0 | 0 | 0 | 0 |
| webhooks | 3 | 2 | 0 | 0 | 1 | 0 |
| **TOTAL** | **699** | **326** | **291** | **9** | **41** | **32** |

### Domain status notes (fully / partial / untouched)

- **Fully done (on master), big domains verified by decorator-count ≥ FE-file-count:** projects (107 dec ≥ 62), crm (43≥26), support (32≥22), clients (22≥15), deals (21≥13), accounting (26≥21), sales (20≥16), dashboard (22 dec, all 21 FE routes matched 1:1), tasks (12≥9), customer-executive (11≥7), invoices (8≥6), goals, quotes, blog, careers, contacts, audit-log, rbac, roles, reports, push, platform.
- **Fully in-flight:** hr S1–S6 (config/time/directory/performance/payroll/lifecycle); leads-completion (28).
- **Partially done (master module exists, named routes remain):**
  - calendar — `create-meet` deferred (Google Meet). Other 4 on master.
  - chat — `ably-token` (Ably), `route` (AI) remain. 15/17 on master.
  - notifications — `dispatch` (email+SMS) remains. 5/6 on master.
  - onboarding — `bank-details` (portable), `documents` (storage), `tasks/[taskId]` (email) remain. 5/8 on master.
  - organization — `invitations/resend` (email), `security` (portable) remain; `members` POST-invite and `members/[memberId]` PATCH are partial within otherwise-covered files. 6/8.
  - org — `setup` stays-FE (bootstrap writes users+session). 1/2.
  - public — `kb/ask` (AI/RAG), `kb/[slug]/attachments` (R2/S3 presigned) remain; `interview-booking` POST email-leg partial. 16/18.
  - settings — `automations/[ruleId]/test` (automation engine), `email-templates/test` (email) remain. 13/15.
  - webhooks — `razorpay` inbound (Razorpay) remains. 2/3.
  - branches — `branches` POST (create) not in master decorators (`@Get` only); writes users → treat create as stays-FE/admin. GET/detail/patch/delete on master.
- **Untouched domains (no backend module anywhere):** ai (20), cron (9), storage (3), integrations (3), billing (1), search (1), inngest (1), health (1), auth (24).
- **HR residual stays-FE carve-out (not in any S1–S8 functional bucket):** `hr/change-password`, `hr/sessions`, `hr/sessions/[sessionId]` — identity/session management.

---

## (3) Remaining PORTABLE-NOW port plan (9 routes, 2 final batches)

All org-scoped, DB-only (audit-log / in-app notifications / CSV / signature-verify only). No blocking integration.

### Batch P1 — Scheduled jobs → Nest `@nestjs/schedule` `@Cron` tasks (4)
Re-implement the cron handlers as in-process Nest scheduled tasks (drop the Next cron endpoint; keep `CRON_SECRET`-guarded trigger if manual run is needed). In-app notification creation uses the existing notifications service.
1. `cron/auto-checkout` → `processAutoCheckout` (attendance DB writes).
2. `cron/monthly-leave-reset` → `expireUnusedMonthlyCasualLeaves` + `resetYearlyLeaveBalances` (leave-balance DB).
3. `cron/daily-notifications` → `sendDailyNotifications` (in-app notification rows). *Verify the action does not also `sendEmail`; if it does, that leg defers.*
4. `cron/holiday-notifications` → `sendHolidayNotifications` (in-app notification rows). *Same verify caveat.*

### Batch P2 — Misc portable endpoints (5)
5. `search` (GET) — global multi-entity search over leads/deals/contacts/clients/tickets; pure Drizzle + optional Redis cache. Maps cleanly to a `SearchController`.
6. `expenses/import` (POST) — CSV bulk import → rows insert (top-level path; NOT covered by the `hr/expenses` module).
7. `integrations/git/webhook` (POST) — inbound GitHub/GitLab webhook; HMAC signature verify + ticket-ref linking, DB-only.
8. `organization/security` (PATCH) — org-level security config (data write on org settings).
9. `onboarding/bank-details` (PATCH) — encrypted bank fields; writes `users` + `onboardingSteps`. Portable by precedent — master already ports `onboarding/personal-details` (also a `users` write). Needs the `@/lib/encryption` util ported to backend.

---

## (4) Deferred-by-integration rollup (41 routes)

| Integration | # routes | Unblocks (routes) |
|---|---:|---|
| **AI / LLM** (OpenAI/Gemini/LangChain/pgvector RAG) | 22 | all `ai/*` (20: account-summary, attrition-risk, churn-risk, enrich-lead, generate-email, generate-jd, generate-review, helpdesk-reply, meeting-prep, next-action, nl-search, objection-handler, predict-deal, prioritize-tasks, report-narrator, score-candidate, score-lead, sentiment-analysis, suggestions, summarize) + `chat/route` (assistant) + `public/kb/ask` (KB RAG Q&A) |
| **Email** (Resend/sendEmail) | 9 | `cron/email-sequences`, `cron/scheduled-reports`, `cron/weekly-attendance-report`, `cron/monthly-expense-report`, `cron/weekly-ceo-recap`, `notifications/dispatch`†, `settings/email-templates/test`, `onboarding/tasks/[taskId]`, `organization/invitations/resend` |
| **R2 / S3** (presigned upload/download) | 5 | `storage/upload`, `storage/download`, `storage/image`, `public/kb/[slug]/attachments`, `onboarding/documents` |
| **Razorpay** | 2 | `billing/razorpay`, `webhooks/razorpay` (inbound payment webhook) |
| **Google Calendar / Meet OAuth** | 1 | `calendar/create-meet` |
| **Ably** (realtime) | 1 | `chat/ably-token` (chat message realtime fanout is already a DB-covered route; only the token mint defers) |
| **Automation engine** (rule execution) | 1 | `settings/automations/[ruleId]/test` (automation CRUD + run-history already on master; only test-execution defers) |

† `notifications/dispatch` also needs **SMS/Twilio** (it is a generic email+SMS dispatcher); counted once under Email.

Notes: web-push needs nothing here — `push/subscribe` + `vapid-public-key` (subscription storage) are already covered on master; only the outbound send leg of `chat`/notifications is push-coupled and lives inside already-ported routes.

---

## (5) STAYS-FRONTEND (32 routes)

NextAuth session issuance, identity/`users`-table writes, MFA, OAuth connect/callback, the inngest `serve()` endpoint, and the Next infra health probe. These do not move to NestJS (the Next app keeps minting the backend JWT via `auth/backend-token`).

**auth (24)** — `[...nextauth]` (session issuance), `accept-invitation`, `backend-token` (mints the NestJS bearer — must stay in Next), `forgot-password`, `invitation`, `resend-verification`, `reset-password`, `setup-password`, `signup`, `validate-setup-token`, `verify-email`, `oauth/google` (DELETE unlink), `mfa/{setup,verify,disable,reset,status}` (5), `calendar/{google,google/callback,microsoft,microsoft/callback,disconnect,primary,status}` (7 — calendar OAuth connect/callback).

**hr (3)** — `hr/change-password` (password write), `hr/sessions`, `hr/sessions/[sessionId]` (session invalidation).

**integrations (2)** — `integrations/google/auth` (OAuth connect), `integrations/google/callback` (OAuth callback, writes token to users).

**org (1)** — `org/setup` (first-run org bootstrap: writes users + session).

**inngest (1)** — `inngest/route` (the `inngest.serve()` handler; stays as the Next-hosted function endpoint).

**health (1)** — `health/route` (Next deployment health probe over DB/Redis/auth/email/inngest env; NestJS gets its own Terminus health, this one stays with the Next app).

---

## Appendix — reconciliation

326 (master) + 291 (in-flight) + 9 (portable) + 41 (deferred) + 32 (stays-FE) = **699** ✓.
on-master column = 326 ✓ · in-flight column = 263 (hr) + 28 (leads) = 291 ✓ · rem-portable = 9 ✓ · rem-deferred = 41 ✓ · stays-FE = 32 ✓.
</content>
</invoke>
