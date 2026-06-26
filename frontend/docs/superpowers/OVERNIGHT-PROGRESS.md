# Overnight Progress — Backend Extraction (StreamlineOS → NestJS)

**Last updated:** 2026-06-26 (overnight autonomous run)
**Legend:** ✅ done · 🔄 in progress · ⏳ queued · 🔒 blocked (needs your environment) · ⛔ deliberately NOT done unattended (would risk breakage)

## ✅✅ BACKEND PORT COMPLETE — ALL PORTABLE ROUTES MIGRATED (2026-06-26)
**Master/main `631ee83` (now on GitHub remote `Startupppp/streamlineos-backend`, branch `main`): 47 feature modules, 61 unit + 1002 e2e (53 suites) green, tree clean.** Every PORTABLE route of the 699-route frontend surface is now ported + integrated + tested:
- CRM: leads (complete 36 handlers), contacts, targets, csat, deals, clients, crm, quotes, customer-executive, sales, reports.
- HR (all 8 slices): hr-config, hr-time (+GET /hr/leaves fix), hr-directory, hr-performance, hr-payroll, hr-lifecycle, hr-recruitment (S7, 53), hr-interviews (S8, 24).
- Finance: accounting (21, full ledger+GST), invoices (+writes +POST create fix).
- Comms/Productivity: chat (15/17), projects (62), projects-execution, calendar, tasks, goals, notifications, push, blog, audit-log, expenses (+import), platform, careers, onboarding (+bank-details), webhooks, settings, dashboard, public, rbac, org, organization, branches.
- Infra: search, integrations-git/webhook, cron (4 jobs), background.
**Remaining (NOT portable without external setup):** 41 integration-gated routes (need provider decisions — AI/LLM 22, email 9, R2 5, Razorpay 2, Google-cal 1, Ably 1, automation 1) + 32 stays-frontend (NextAuth/OAuth/identity/inngest). RBAC fidelity verified clean across all batches (0 added/dropped/mis-verbed checks). Cleanup: 6 worktrees removed; port/* branches kept as safety net.
**Next:** frontend cutover (functional-test → delete migrated Next routes → extend api-client MIGRATED_PREFIXES), backend eslint.config.mjs, per-API functional test scripts, then the integration-gated deferrals as providers are decided.

## 🚚 PARALLEL MIGRATION LEDGER (live)
Plan: `frontend/docs/superpowers/REMAINING-DOMAINS-PLAN.md` (11 batches, dependency-ordered). Strategy: **N agents port N domains in parallel** (separate `src/modules/<domain>/` folders, no git/build) → **one serialized consolidation** wires+builds+tests+fixes → adversarial verify. (Can't run two backend-build/commit workflows at once — they'd corrupt each other.)

**Ported to backend (build + unit + e2e green):**
- ✅ leads (8/31), contacts, targets, csat — earlier; **functionally tested vs live DB**; contacts/targets/csat **cut over** in frontend (branch `feat/frontend-strangle-cutover`).
- ✅ **Batch 1** (`e234fb0`, parallel, 0 fixes): blog (10), audit-log (3, full), goals (14, full), expenses (7, +5 deferred email/automation/storage), tasks (11, full). Backend: 61 unit + 84 e2e green.
- ✅ **Batch 2** (`ff05a46`, parallel, 2 minor fixes): platform(2), notifications(5,+defer dispatch), push(3), quotes(7), customer-executive(11), reports(5), sales(16), calendar(7,+defer create-meet), settings(22,+defer 2). Backend: 61 unit + 179 e2e green. **storage SKIPPED** (pure Cloudflare-R2 — needs the storage integration ported to backend first).
- ⚠️ **Batch 3** (session-limit halted mid-run; salvaged + stabilized to `07c8543`, **61 unit + 207 e2e green**): ✅ careers(2), invoices(5,+4 defer accounting), onboarding(7,+3 defer encryption/R2/email), webhooks(5,+1 defer razorpay). ❌ re-queued → done in Batch 4. ⏭️ **skipped (need integrations):** ai (OpenAI), integrations (Google/Git OAuth — mostly stays-FE).
- ✅ **Batch 4** (`b260022`, parallel re-port of the batch-3 casualties + security, **61 unit + 325 e2e green**, adversarially verified): clients(22), crm(43, 7 controllers/8 services), dashboard(23), public(18), rbac(11 — **absorbs the `roles` domain**: standalone roles module was a redundant duplicate `@Controller("roles")`, deleted; RbacModule is a strict superset). **Documented deferrals (integration-gated, NOT silent drops):**
  - `PATCH /clients/:clientId` (client-account status → on INVESTED writes incentive row + in-app notifications + email via `sendNotification` + audit). Couples **incentives + email** integrations → defer with the incentives module. GET ported.
  - `POST /public/interview-booking/:token` (writes interview+calendarEvent, then interviewer **email**). GET ported; POST deferred with email.
  - `GET /public/kb/:slug/attachments` (presigned URLs via **R2 storage**) — defer with storage.
  - `POST /public/kb/ask` (pgvector+OpenAI **RAG**) — defer with AI (blocked on valid OPENAI_API_KEY, known).
- ✅ **Batch 5** (`8f73f2e` wire + `4ca8ba3` redo, **61 unit + 374 e2e green**, adversarially verified): deals(21), org(1), organization(9), branches(4). Verify caught 3 over-deferrals (clean routes wrongly held citing DB-only side effects) → redo ported them faithfully: PATCH /deals/:dealId (optimistic-lock 409, defer only chat-channel/email/inngest/automation), POST /deals/approvals (createNotification is a DB insert, not a gate), PATCH /organization/settings (org-table + settings JSON + best-effort ipAllowlist Redis). **Created `backend/DEFERRALS.md`** — living per-domain deferred-routes registry (closes the "undocumented deferral" process gap). Open nit: deals audit metadata logs newStage=undefined when stage unchanged (source logs input.stage) — fold the 1-line parity fix into b6.
- ✅ **Batch 6** (`11af62f`, **61 unit + 525 e2e green**, adversarially verified): projects(36), projects-execution(25), support(17, +defer 5 KB-RAG/R2). Folded the b5 deals audit-nit. Verify caught 1 dropped-clean-route → **budget redo done** (`e03bb67`, GET/PATCH /projects/:projectId/budget ported; 61 unit + 527 e2e; projects now 62/62). support tickets list limit unbounded (mirrors source — flagged for the pagination-hardening pass, not a redo).
- **= 34 domain modules on backend** (after b6). Infra TODO: add `eslint.config.mjs` to backend (no flat config → `pnpm lint` can't run; type-check passes).
- 📊 **DEFINITIVE COVERAGE AUDIT** (`REMAINING-COVERAGE-AUDIT.md`, grounded in all **699** frontend route files): 326 on master · 291 in-flight (HR S1–S8 175+88 + leads 28) · **9 remaining-portable** · 41 deferred (integration-gated) · 32 stays-FE. **The finish line:** after the current wave integrates, only 9 portable routes remain = 4 cron jobs (need `@nestjs/schedule`) + search + expenses/import + integrations/git/webhook + organization/security + onboarding/bank-details. **41 deferred need YOUR provider calls:** AI/LLM 22 (all ai/* + chat-ai + kb/ask RAG), email 9, R2 5, Razorpay 2, Google-cal 1, Ably 1, automation-engine 1. **32 stays-FE:** auth/* ×24 (NextAuth/MFA/OAuth/backend-token mint), 3 HR identity, 2 google-OAuth, org/setup, inngest serve, health.
- 🔧 **STALL + SERIAL-INTEGRATION RECOVERY:** the 5-way concurrent worktree wave (b7/hrA/hrB/leads + budget) STALLED — 5 simultaneous `test:e2e` booting the full Nest app exhausted shared Neon/Upstash connections → builds hung, none committed. No code lost (all ported, committed to `port/*` branches). **Fix:** a SERIAL integration workflow (`integrate-port-branches`) pulls each branch's folders onto master + wires app.module + build + unit + e2e + commit, ONE build at a time (no contention). Progress: b7 `548e8dc` ✅, hrA `d9d6539` ✅, hrB `7e42833` ✅, **leads `7834df9` ✅ (61 unit + 868 e2e green)** — ALL 4 integrated. Integration workflow died twice on socket drops (network), so leads was finished via **Bash-driven build/test/commit** (local, no socket to drop) — the robust pattern for long-running steps under flaky network. Still TODO: comprehensive dropped-clean-route verify across b7/hrA/hrB/leads. Lesson: **port-only fans out wide (no build/DB → zero contention); build+e2e must serialize** (one shared Neon/Redis). Recruit S7/S8 + misc-portable ported as PORT-ONLY worktrees, folded into the serial integration queue via Bash-driven build/test/commit.
- ✅ **misc-portable integrated** (`fbffc17`, 61 unit + 874 e2e): search (1) + integrations-git/webhook (1, +main.ts rawBody:true for HMAC) + expenses-import (1, CSV path; XLSX deferred — needs exceljs; upload contract switched to JSON {fileName,content} since backend has no multer — frontend api-client adjustment needed at cutover). **= 44 modules on master.**
- 🔄 **recruit S7/S8** being integrated: hr-interviews S8 (24) ✅ ported (needs `pdf-lib` — added); hr-recruitment S7 (47) re-porting after a socket drop. Network was flaky — several port agents socket-dropped and were restarted; long-running integration agents replaced by local Bash build/test/commit (drop-proof).
- 🔀 **PARALLEL WAVE via git worktrees (2026-06-26):** to run multiple backend batches at once (nest build compiles all of src, so two batches can't share one tree). Each batch = isolated worktree under `D:\projects\personal\sos-wt\<name>` (branch `port/<name>`, node_modules junctioned from main, .env copied) running full port→consolidate(build+test+commit-on-branch)→verify. **In flight:** b7 `port/b7` (accounting 21 + invoices-writes + chat 15), hrA `port/hra` (HR S1 config/S2 time/S3 directory), hrB `port/hrb` (HR S4 perf/S5 payroll/S6 lifecycle), leads `port/leads` (28 completion routes). **Integration plan:** after each lands green-on-branch, sequentially `git merge` each `port/*` into master, resolving the app.module imports-union (+ any additive shared-file 3-way merges), then one master build+test, then `git worktree remove`. NEVER auto-merge to master from inside a worktree.
- Cleanup manifests: B1 done (`CLEANUP-MANIFEST-B1.md`); B2 done except sales/push (their analyze agents died — redo on reset).
- **leads completion plan ready:** `LEADS-COMPLETION-MANIFEST.md` — 8/36 method-handlers ported; **28 missing, ALL portable-now** (0 deferred, 0 stays-FE; 2 partials: assign + distribute drop email/OpenAI, both self-degrading). 2 slices: S1 = 15 reads/reports, S2 = 13 mutations (status→assign→bulk→merge→import→distribute, ordered by intra-leads txn deps). Backend `leads.create` already proved the DB-only-side-effects-kept / email+inngest+automation-dropped pattern — mirror it. RBAC inconsistent in source (CASL crm:leads on some, withAuth on others, role-strings on distribute/merge) — mirror verbatim.
- **b6/b7 slice plan ready:** `B6-B7-SLICE-MANIFEST.md` — projects **62/62 portable** (2 partial email, 0 fully deferred; `snapshot`/`from-deal` are pure same-DB), accounting **21/21** (zero external integrations — the 9 billing-coupled are slice-ordering not deferrals), support **17/22** (5 partial email + defer 4 KB-RAG + 1 R2 attach), chat **15/17** (defer ai-assistant Gemini + ably-token; messages-POST partial Ably/web-push; typing portable but re-impl on Redis). 0 stays-FE across all four. Normalize projects/support/chat withAuth/role-string gates to CASL on port (add missing `projects:timesheets` subject) — but mirror source, flag-not-add.
- **HR slice plan ready:** `HR-SLICE-MANIFEST.md` — all 266 HR + recruitment routes classified: **215 portable-now**, 42 deferred (email 26 / automation 10 / AI 3 / google-cal 1 / e-sign 1 / R2 1), 9 stays-FE (users-table writes). Sliced into 8 ordered sub-batches (org-config → time → directory/assets → performance → payroll → lifecycle → recruitment-core → interviews/offers). Drives b8–b10. Note: recruitment RBAC is role-string gated (CEO/HR/ADMIN), normalize to `hr:recruitment`; automation engine is fire-and-forget (stubbing the sink frees ~10 more).
- **Stays frontend:** NextAuth + OAuth-connect routes, inngest serve endpoint, users-table write boundary, the api-client router.
- **Pending sweeps:** functional-test (real DB) + frontend cutover (per-prefix routing + delete routes) for the fully-ported domains — batched after porting.
- **Needs your decisions (7, see plan):** RBAC grants for withAuth-only domains; messaging provider (Resend/Twilio); Razorpay client; AI provider + pgvector; event-bus contract; incentives module timing; read-model strategy.

## 🆕 MONOREPO MOVE + FRONTEND STRANGLE (2026-06-26, after you moved to `frontend/` + `backend/`)
- **New layout:** `Streamlineos/` (one git repo tracking `frontend/`) + `frontend/` (Next.js) + `backend/` (nested git repo, NestJS, 33+ commits intact). Both `node_modules` were rebuilt (the move broke pnpm's symlinks).
- **Backend re-homed + still green:** build, 61 unit, 30 e2e, **64/64 functional vs live DB**, schema in sync. Fixed `sync-schema` path → `../frontend`. Parity fixes committed (`89028b5`): csat dropped source-absent audit + unused deps; `/leads/ingest` now returns **422** (matches source); strict source parity.
- **Frontend strangle cutover — on branch `feat/frontend-strangle-cutover` (NOT merged, reversible), commit `efd2e58a`:**
  - `lib/api-client.ts` → **per-prefix routing**: `/contacts`,`/targets`,`/csat` → backend (Bearer); everything else same-origin (cookies). Requires `NEXT_PUBLIC_API_URL` (set to `:1500` in dev `.env`).
  - **Deleted 11 migrated Next API routes** (contacts ×3, targets ×5, csat ×3) + `server/queries/crm-targets.ts` + its barrel re-export. **Kept** `contacts/[contactId]/vcard/route.ts` (bare `<a href>` download; UI→`apiClient.download` conversion flagged as follow-up). **Leads excluded** (only 8/31 migrated).
  - Frontend **source tsc clean** after deletions (the only errors were stale `.next/` generated route-validator, which regenerates).
  - ⚠️ **Cutover requires the backend reachable** at `NEXT_PUBLIC_API_URL` — once merged, contacts/targets/csat 404 in any env where the backend isn't deployed + that var isn't set. Pre-merge gate: `next build` + click-through with backend up.
- **Stray flagged:** `Streamlineos/app/api/accounting/customers/route.ts` — an untracked file at the repo root (likely from your IDE), NOT part of frontend/ or backend/; left untouched.
- **Adversarially verified (independent pass):** cutover CORRECT + COMPLETE on all checks — no dangling refs, every migrated hook call-site has a matching backend route, routing boundary-matched (Bearer only for migrated), auth-bridge + vcard intact, non-migrated unaffected. **One pre-existing bug surfaced (not a regression):** the data-hub "Export contacts" button calls `/contacts/export`, which never existed on either side (was already 404ing) — now 404s against the backend. Fix = implement `GET /contacts/export` in backend OR set `contacts.supported.export:false` in `settings/data-hub/page.tsx`. (Sibling `/contacts/import` is UI-gated off → never called.)
- **Pre-merge gate (your env):** `cd frontend && pnpm build` + run backend on :1500 + click-through contacts/targets/csat with `NEXT_PUBLIC_API_URL=http://localhost:1500`. Then merge `feat/frontend-strangle-cutover` once the backend is deployed + that var is set in prod.

## ☀️ MORNING SUMMARY (read first)
Built and **functionally verified against the live Neon DB** on a standalone NestJS service (`D:\projects\personal\streamlineos-api`, port 1500, branch `master`, 33 commits):
- **Kernel** (auth/JWT HS256, CASL RBAC, ApiKeyGuard, Zod pipe, cache, audit, error envelope, rate-limit) — 61 unit + 30 e2e green.
- **4 domains ported + real-DB tested:** Leads (22/22), Contacts (15/15), Targets (13/13), CSAT (14/14). All faithful to source (RBAC, response shape, status codes, transactions); ≤500-line files; no comments/`any`.
- **Docs:** migration roadmap (12 waves), perf diagnosis (the real 7s fix is the Vercel `sin1` region pin — NOT the backend split), three audits, four functional-test reports/harnesses.
- **Nothing destructive done:** no Next.js routes deleted, no cutover, no prod/perf changes. The app is untouched and working.

**What needs YOU (see checklist at bottom):** approve cutover + which domains next, the contacts RBAC decision, the perf quick-wins (esp. region pin), the GitHub repo for the API. The remaining ~41 domains are ready to port on your word — the pipeline is proven + hardened; I paused new ports because the next ones need RBAC/deferral decisions that shouldn't be guessed while you sleep.

---

## Safety boundary (unattended run)

Per your "never introduce breaking changes / no bugs" rule, tonight is **additive + verifiable only**. I will NOT, unattended:
- ⛔ Delete any Next.js `app/api/**` routes/folders (destructive; needs verified per-domain parity first)
- ⛔ Cut the frontend over to NestJS (needs parity + a deployed/reachable service)
- ⛔ Apply perf changes to the production app / deploy config (measure-first; the `sin1` region pin is yours to approve)
- ⛔ Run destructive ops on real data (write-tests use create-then-delete on clearly-tagged rows only; never touch pre-existing rows)

These are **staged + ready**, with the morning checklist at the bottom.

---

## Workflows

| Workflow | ID | Purpose | Status |
|---|---|---|---|
| Leads pilot core build | `wt6ttfb7g` | Build + adversarially verify Plan B (8 tasks) | ✅ (46 unit + 9 e2e green) |
| Codebase audits | `w69std8mo` | Backend API / frontend-fetch / dead-code violation reports | ✅ → `audits/` |
| Migration roadmap | `w6jxdp240` | 12-wave dependency-ordered plan | ✅ → `specs/2026-06-25-migration-roadmap.md` |
| Frontend perf diagnosis | `wuvqusgix` | Prioritized 7s-load remediation plan | ✅ → `specs/2026-06-25-frontend-perf-diagnosis.md` |

---

## Track A — Leads pilot core (NestJS, shadow; no cutover)

Plan: `plans/2026-06-25-leads-pilot-core.md`. Built by workflow `wt6ttfb7g` (implement → adversarial verify → fix-loop per task). ✅ ALL DONE (commits `aadf19d`→`81d514f`):

- [x] T1 `src/modules/leads/dto/lead.schemas.ts` (+ `.spec.ts`) — byte-faithful to web schemas
- [x] T2 `src/modules/leads/branch-filter.ts` (port of `lib/db/branch-filter.ts`)
- [x] T2 `src/modules/leads/lead-triggers.ts` (port of `server/lib/lead-triggers.ts`)
- [x] T3 `src/common/ratelimit/rate-limit.service.ts` (+ `.module.ts`, `.spec.ts`) — tier matched to web (60/60s)
- [x] T4 `src/common/auth/api-key.guard.ts` (+ `api-key.decorator.ts`, `.spec.ts`) — sha256, scopes, rate-limit
- [x] T5 `src/modules/leads/leads.service.ts` (414 lines ≤500; ported reads + create/update/delete/ingest)
- [x] T6 `src/modules/leads/leads.controller.ts` (+ `leads.module.ts`, e2e, AppModule wiring)
- [x] T7 `src/modules/leads/leads.ingest.controller.ts` (+ e2e)
- [x] T8 `scripts/parity-leads.mjs` + `MIGRATION.md`
- [x] Final review + ground-truth sweep: `pnpm build` clean, **46 unit + 9 e2e pass**, `check:schema` in sync

---

## Track B — Audits (read-only reports)

Workflow `w69std8mo` → `docs/superpowers/audits/` — ✅ all written:
- [x] `backend-api-audit.md` — strong baseline; violations to design out: ~87 manual query-coercion, ~94 unpaginated `findMany`, ~45 hardcoded role checks, 🔴 `hr/directory` cross-tenant scan, cron/scheduled-reports weak secret compare, 31/710 transactions, ~181 ad-hoc envelopes
- [x] `frontend-fetch-audit.md` — data layer already centralized via apiClient/TanStack (stragglers, if any, listed)
- [x] `deadcode-duplication-audit.md` — findings only; NO deletions performed (deletions require small test-gated commits later)
- [x] `README.md` (synthesis)

**Port standards locked from this audit** (every NestJS port must satisfy): bounded `PaginationQueryDto` (z.coerce + max pageSize, 422 on bad input) on all lists; CASL ability guard only (no role-string checks); tenant-safe queries (always org-scoped, fix the `department_members` join); transactions for multi-write + post-commit side-effects; raw-data success / `{error}` failure envelope.

---

## Track C — Additive shadow domain ports (roadmap-ordered)

Built onto NestJS, **not cut over**. Order follows the roadmap (clean/foundational first). Each: port → build green → functional+RBAC test vs real DB → mark done.
- [x] **contacts** (4 routes: list/create/get/update/delete/search/vcard) — built, **15/15 functional on real DB**, commit `93d4bd0`. ⚠️ Reverted to **auth-only** to match source (`withAuth`); the port had added `crm:contacts` ability gating that **no role grants** → would 403 all non-admins on cutover. RBAC hardening is a flagged decision (see morning checklist #8).
- [x] **targets** (7 routes: list/my/leaderboard/:id-history/:id-patch/:id-delete/create) — built, **13/13 functional on real DB**, faithful **auth-only** (no added `crm:targets` gating), transactions on PATCH, commit `394b136`. Source has no single `GET /targets/:id` (fetched via list) — port matches.
- [x] **csat** (7 routes: list/create/get/patch/delete/responses + **public** submit) — built, **14/14 functional on real DB**, faithful **auth-only** + `@Public()` on the public submit (matches source), commit `4d12372`.
- [ ] (next: blog …)

**Recovered incident (no work lost):** the port workflows each created a per-domain feature branch and didn't merge back; csat branched off master (missing contacts/targets). I consolidated everything onto `master` (cherry-picked csat onto the leads+contacts+targets branch, resolved the `app.module.ts` overlap), deleted the stray branches, and **hardened the workflow** so future ports commit directly on `master` and never branch. Verified after recovery: master = {leads, contacts, targets, csat}, build clean, **61 unit + 30 e2e green**, 33 commits.

---

## Track D — Functional + multi-role RBAC testing (UNBLOCKED by env)

Backend `.env` points at the real Neon DB + Redis (shared `BACKEND_JWT_SECRET`). ✅ **22/22 passed** — report: `audits/leads-functional-test-report.md`; harness: `streamlineos-api/scripts/functional-test-leads.mjs` (commit `f3539c3`).
- [x] Started NestJS on :1500; `/health/ready` → `{status:"ready"}` (real DB `select 1`)
- [x] Minted multi-role tokens (OWNER/manage-all, SALES r/c/u, viewer read-only, no-perms) for a real org with leads
- [x] All 8 endpoints: RBAC (401/403 with exact `RBAC_DENIED` body), validation (400 exact messages), 404, auth-only board/stats
- [x] Write round-trip create→read→update→delete on `ZZ_FUNCTEST` rows + temp API key (all cleaned up)
- [x] Confirmed org-wide OWNER returns the 5 real leads, shape `{leads,totalCount,page,totalPages}` = web parity

---

## Decisions & assumptions log
- Repo already has centralized `lib/api-client.ts` + `lib/api/hooks/**` (TanStack throughout) → "centralize data fetching" is largely already satisfied; audit only hunts stragglers; not rewriting the working frontend.
- TanStack-spec example domains (orders/gold-prices/users) treated as a generic template; real domains are leads/crm/hr/etc.
- "API best-practice recheck" satisfied by building NestJS ports to standard (verify-loop enforces validation/RBAC/caching/transactions/≤500-lines/service-layer), not by refactoring the soon-to-be-deleted legacy Next routes.
- `branchId` session-propagation fixed in WEB (committed on `feat/backend-extraction-bridge`).

---

## MORNING CHECKLIST (env-gated — needs you)
1. Review the four docs: roadmap, perf diagnosis, audits/, and this file.
2. Review the bridge PR: https://github.com/Startupppp/streamlineos/pull/new/feat/backend-extraction-bridge
3. **Leads parity** — run `node scripts/parity-leads.mjs` (both servers up) to confirm shadow parity before any cutover. (I will have run the functional/RBAC tests overnight; parity-vs-Next still benefits from your sign-off.)
4. Decide on perf quick-wins (esp. Vercel `sin1` region pin — biggest win, deploy-config).
5. Approve cutover sequencing (Plan B2) + which domains to migrate next per the roadmap.
6. Create the GitHub repo for `streamlineos-api` when ready; I'll wire the remote + push.
7. 🔴 **Legacy security flag:** `app/api/hr/directory/route.ts` scans `department_members` with no org filter (table lacks `orgId`) — full cross-tenant scan filtered in memory. The NestJS port fixes it (join `departments.orgId`); consider patching the live route too.
8. ⚖️ **Contacts RBAC decision:** the live `contacts` API has **zero authorization** (any logged-in user can CRUD contacts — only `withAuth`). The port mirrors that (auth-only) to avoid breakage. If you want dynamic RBAC there (you asked for it), decide which roles get `crm:contacts` and I'll add it to the role defaults + re-enable the ability guard (it's already wired, just needs the permission granted). Same likely applies to other `withAuth`-only CRM read/write routes.
