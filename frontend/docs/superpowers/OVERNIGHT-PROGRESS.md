# Overnight Progress — Backend Extraction (StreamlineOS → NestJS)

**Last updated:** 2026-06-26 (overnight autonomous run)
**Legend:** ✅ done · 🔄 in progress · ⏳ queued · 🔒 blocked (needs your environment) · ⛔ deliberately NOT done unattended (would risk breakage)

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
