# HRMS Overhaul — Master Roadmap

> **This is an index, not an executable plan.** It decomposes the HRMS review-and-fix program into sequenced, individually-shippable plans (writing-plans skill: "one plan per subsystem; each produces working, testable software on its own"). Execute plans **in order**; each ends green (build + lint + types + tests) and gets a `PAGES.md` entry before the next begins.

**Program goal:** Bring the HRMS module (~130 frontend routes, ~30 `hr-*` backend modules, ~60 `db/schema/hr` files) to production quality per `CLAUDE.md` + `UI-UX-SYSTEM.md` — correct, secure, efficient, DRY, responsive, well-typed.

**Governing constraints (from the engagement):**
- **Slice by slice**, audit-first, verify before claiming done, test the touched APIs.
- **Schema is safe-only** this program: delete confirmed-dead tables, add `org_id`/indexes, `text`→`date`. Money-`decimal`→cents and JSONB→child-table splits are a **separate, individually-approved** effort (Plan 11b) because they backfill live rows.
- **Never blindly apply an audit flag** — several "findings" were disproven on inspection (see Disproven, below). Inspect the real code first.

**Verified facts (checked in-repo):**
- Legacy `payrolls` table: 5 readers (`ai/ops-copilot-tools`, `ai/chat-assistant`, `hr-lifecycle/hr-analytics`, `hr-performance/compliance`, `reports`) + 1 FK (`crm/deals.payrollId`), **zero writers** → payroll analytics/reports/AI read a table the `payroll_runs` engine no longer fills.
- `careerLadders` / `careerPaths` / `learningPaths` = dead (zero refs).
- `bank_transfers` = disabled (`bank-transfers-disabled.spec.ts`); superseded by `payroll_bank_batches`.

**Disproven audit flags (do NOT "fix"):**
- **JWT-permission read in `onboarding-views.controller`** — `PermissionGuard` hydrates `req.user.permissions` from the DB-resolved set (guard lines 52-55); reading `u.permissions` is the intended pattern. No change.
- **Raw `schema.parse()` in `payroll-inputs.controller` (H1)** — `AllExceptionsFilter` already maps `ZodError`→400, identical to `ZodValidationPipe`. Cosmetic only.
- **`delegations` / `exit` BOLA** — both already pass actor context and enforce ownership in-service (`grantorUserId === userId`; exit `isApprover`). Correctly authored.

---

## Sequence

| # | Plan | Layer | Status | Depends on |
|---|------|-------|--------|-----------|
| 01 | hr-performance security (BOLA/priv-esc) | Backend security | ✅ **DONE** (2026-07-25) | — |
| 02 | Backend security follow-ups (2 decisions) | Backend security | ⏳ needs user decisions | — |
| 03 | Backend API efficiency | Backend API | 📋 **planned in full** (`…-03-…`) | — |
| 04 | Backend caching + validation consistency | Backend API | ▫️ roadmap only | 03 |
| 05 | Shared frontend primitives | Frontend | ▫️ roadmap only | — |
| 06 | Frontend data-layer hygiene | Frontend | ▫️ roadmap only | 05 |
| 07 | Frontend page structure & routing | Frontend | ▫️ roadmap only | 05 |
| 08 | Page splits (>600 lines) | Frontend | ▫️ roadmap only | 05, 07 |
| 09 | Mobile responsive + skeleton fidelity | Frontend | ▫️ roadmap only | 05 |
| 10 | Inline AI on detail surfaces | Frontend + AI | ▫️ roadmap only | 05, 06 |
| 11a | Schema safe-only (dead tables, indexes, dates) | Schema | ▫️ roadmap only | — |
| 11b | Schema money→cents + JSONB→tables (backfill) | Schema | ⏳ deferred, per-migration sign-off | 11a |

Write each plan **just-in-time** (fresh reads of its target files) when its turn comes — this keeps every step no-placeholder and current.

---

## Plan 01 — hr-performance security ✅ DONE
5 write endpoints on `hr:performance:view` mutated arbitrary objects (no ownership). Kept `:view`, added participant/owner-or-`hr:performance:manage` checks in `updateGoalItem`/`createKeyResult`/`updateOneOnOne`/`deleteOneOnOne`/`updateReview`; org-membership guards on `createGoal`/`createOneOnOne`/`createPip`. BE tsc ✓ · lint ✓ · 20 specs ✓. See `PAGES.md` 2026-07-25.

## Plan 02 — Backend security follow-ups (needs decisions, not code-ready)
Two items surfaced by the write-on-`:view` sweep that are **not** clean bugs — bring to the user:
1. **`hr-payroll/IncentivesController`** gates reads on `hr:payroll:view` but writes on **`crm:incentives:approve`**. The `incentives` table is `salesRepId`/`clientAccountId`/`investmentAmount` — a **sales incentive** flowing into payroll, so the CRM key may be intentional. **Decision:** confirm whether incentive approval should be `crm:incentives:approve` (keep) or `hr:payroll:approve` (align to HR). If changed, no data migration needed (bypass-admins already covered).
2. **Duplicate read keys `hr:employees:read` vs `hr:employees:view`** — both cataloged, both used across 8 controllers, both present in role templates → likely an intentional **two-tier read model** (`:view` = directory, `:read` = full/sensitive record). **Decision:** confirm the intended semantics before any canonicalization; merging needs a `role_permission_grants` backfill (data migration → sign-off).

## Plan 03 — Backend API efficiency 📋 (detailed doc written)
See `2026-07-25-hrms-03-backend-api-efficiency.md`. Fixes: `getCycle` unbounded review embed (§11); `TerminationService.list` 500-cap→paginated envelope; `employees.getStats` fetch-all-rows→SQL aggregates; `getSkillsMatrix` unbounded `findMany`→bounded/projected; verify each list endpoint hard-caps ≤100. Acceptance: no list endpoint returns unbounded rows; parent-detail endpoints never embed a full child collection; unit tests assert caps + envelope shape.

## Plan 04 — Backend caching + validation consistency
- **Cache invalidation gaps:** `leaves` analytics (`hr:leave-analytics:${orgId}:*`) not busted on approve/reject in `leaves-write.service`; onboarding create/offboard paths vs `hr:dashboard:metrics` (note: `TerminationService.complete` **already** invalidates — verify per-writer). Add invalidation at each mutation.
- **`moveStage` transaction:** `recruitment-candidates.service` status update + SLA insert are two awaits — wrap in `db.transaction`.
- **DTO/Zod placement:** move any non-trivial inline Zod out of controllers into `dto/*-schema.ts` (§7); derive types via `z.infer`.
- Acceptance: every mutation that changes cached data invalidates the exact key(s); multi-step writes are transactional; no non-trivial inline Zod in controllers.

## Plan 05 — Shared frontend primitives (highest dedup value)
Create once, adopt everywhere (reuse existing before creating):
- **`features/hr/shared/employee-picker.tsx`** — wraps `useHrEmployees` + existing `Combobox`/`MemberPicker`; replaces 30+ bespoke employee→option builders (onboarding-initiate, termination-form, cases sheets, governance, letter-generation…).
- **`components/ui/semantic-badge.tsx`** — `{ status, colorMap, label? }`; collapses `BonusStatusBadge`/`ReimbursementStatusBadge`/`LoanStatusBadge`/`RunStatusBadge`/`PayrollStatusBadge`/case/incident badges + inline `statusBadgeClass`.
- **`features/hr/shared/approval-actions.tsx`** — Approve/Reject via existing `LoadingButton` + `ConfirmWithReasonSheet`.
- **Delete** `HrEmptyPanel` (migrate 2 usages to `EmptyState`) and the dead `violet` tone alias in `hr-ui.tsx`.
- Acceptance: one employee picker + one status-badge primitive used across HR/payroll; `tsc`/lint green; no visual regressions at 375/768/1280.

## Plan 06 — Frontend data-layer hygiene
- **Global `refetchOnWindowFocus`** default in the TanStack `QueryClient` provider (one place, not per-hook).
- **Debounced search** helper for filter inputs (separate UI state from query input; never "type 3, show 1").
- Add missing **`mutationKey`** to ~67 HR/payroll mutations.
- **Optimistic** leave-approval mutations (`onMutate`→cancel→snapshot→`setQueryData`→rollback→settle) instead of invalidate-refetch (§11).
- **Query gating:** verify every gated `useQuery` sets `enabled: useCan(<exact backend key>)`; fix the `useAllHrAnnouncements` `enabled: options?.enabled` permissive default.
- Acceptance: global focus-refetch on; search debounced + correctly typed; all mutations keyed; approval surfaces update optimistically.

## Plan 07 — Frontend page structure & routing
- **Move misplaced feature files** out of route folders → `features/…` (employee `edit-employee-form`/`employee-details-view`; 5 payroll `*-content.tsx`).
- **Server-auth the client-only pages** (7 `DashboardGate`-only pages → async server component + `requirePermission`; add server `requirePermission` to the whole `timesheets/**` tree).
- **Add `loading.tsx`** to the ~20 recruitment sub-pages that fetch.
- **`PageWrapper` conformance:** remove `backHref` from nav-level pages (recruitment jobs/pipeline/interviews); replace ad-hoc `<h1>` (jobs new/edit) with `PageWrapper`.
- Acceptance: `app/` route files are thin; no feature components in route folders; every data page has a skeleton; auth is server-side.

## Plan 08 — Page splits (>600-line cap)
Per-page, extract cohesive units to `features/…` (sheets, columns, cards): `hr/assets` (1079), `hr/announcements` (855), `hr/recruitment/requisitions` (809), `hr/holidays` (721), `hr/recruitment/reports` (692), `hr/asset-returns` (660), `hr/documents` (641), `hr/recruitment/hiring-flows` (635), `hr/exit` (625) + feature files >500 (`bulk-onboard-panel` 846, `onboarding-detail-sheet` 827, `leaves-tab-content` 644…). Acceptance: no page > 600 lines; extractions reuse Plan-05 primitives; behavior unchanged.

## Plan 09 — Mobile responsive + skeleton fidelity
- Adopt **`ResponsivePopover`** for HR filter/multi-section popovers (e.g. `announcement-target-picker`); Drawer `< md`.
- Ensure `SelectContent` uses `min-w-[var(--radix-select-trigger-width)]` (HR already clean — verify).
- Make skeletons **match real layout** (`hr-dashboard-overview`, `leaves-wfh-content`).
- Acceptance: no raw Popover/Sheet mobile filter; skeletons mirror content at 375px.

## Plan 10 — Inline AI on detail surfaces
Add compact, credit-metered, draft-first **`AiActionsMenu`** (§15 living rule) where it reduces real effort — employee/candidate detail, review, case, offer, resignation letter. Reuse each module's existing gateway AI endpoint (add one only if none fits); `useCan`-gated; `AiUsageChip` on results. Acceptance: no duplicated AI primitive; every action draft-first + metered + permission-gated; graceful 402/403/error states.

## Plan 11a — Schema safe-only (additive migrations)
- **Delete dead tables** `careerLadders`, `careerPaths`, `learningPaths`, `bank_transfers` (+ their unused services/routes).
- **`payrolls` orphan:** migrate the 5 readers to `payroll_runs`/`payroll_run_employees`, then drop `payrolls` (+ `crm/deals.payrollId` FK) — one migration per step.
- **Add `org_id` + indexes** to `exit_checklists`, `key_results`, `survey_responses`, `assessment_attempts`, `training_attendance`, `team_event_participants`, `onboarding_template_steps`; add composite indexes on hot filters (`salary_loans (org,status)`, `candidates (org,email)`…).
- **`text`→`date`** on the ~10 date-as-text columns.
- Acceptance: additive/reversible migrations (`generate`+`migrate`); no data loss; `db:generate` clean; readers pass tests.

## Plan 11b — Schema money→cents + JSONB→tables ⏳ DEFERRED (per-migration sign-off)
Decimal money→integer cents across payroll/salary/expense/loan/offer tables; JSONB lifecycle arrays→child tables (disciplinary/grievance records, meeting action items, PIP objectives, survey questions/answers, career levels, task deps). Each needs additive column → batched backfill → cutover → drop-old, with explicit approval. Not started until 11a lands.

---

## Execution
Each plan runs through a **build → review → test → fix** loop. Recommended: `/build-loop-claude-code` per plan, or subagent-driven (fresh subagent per task + review). Commit between plans on the current branch (orchestrator-only, per §0.11).
