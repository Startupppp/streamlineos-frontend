# 02 — Research & Reconciliation

**Approach (per approved Q11):** this is a *reconciliation*, not a fresh benchmark. The repo already contains 43 HRMS spec files (`tasks/hrms/`), 33 payroll spec files (`tasks/payroll/`), a competitive benchmark, and a north-star schema. This document reconciles those against what the code actually does, adds the patterns worth adopting, and fixes the vocabulary.

Full lane detail: `_recon/R1-hrms-feature-matrix.md` · `R2-payroll-patterns.md` · `R3-billing-patterns.md` · `R4-india-statutory.md` · `R5-vocabulary-reconciliation.md`.

**Patterns only.** No competitor branding, copy, or protected assets are reproduced; only structural approaches are described.

---

## 1. Canonical vocabulary (binding for the whole programme)

Per approved decision Q3: **names follow the code.** Docs get aligned to code, not the reverse.

| Concept | Canonical | Code artefact | Retired synonyms |
|---|---|---|---|
| Tenant | organization | `organizations` `common/auth.ts:103` | workspace, account |
| Login identity | user | `users` `common/auth.ts:103` | identity |
| Tenant membership | organizationMember | `organizationMembers` `common/auth.ts:82` | userMemberships (deleted), member |
| Person in tenant | **hrPerson** | `hrPeople` `hr/core-people.ts:67` | employee*, `organization_people`, `workers` |
| Dated contract | **hrEmployment** | `hrEmployments` `hr/core-people.ts:103` | `worker_engagements`, job, role assignment |
| Legal entity | **legalEntity** | **does not exist yet** — to be created | establishment, payrollEntity |
| Org structure node | **orgUnit** (`kind`: BUSINESS_UNIT·BRANCH·DEPARTMENT·TEAM·LOCATION·COST_CENTER) | `common/organization.ts:37` | hr_departments, hr_teams, hr_locations |
| Pay component | salaryComponent | `hr/payroll-workforce.ts:13` | earnings line |
| Salary record | employeeSalaryProfile | `hr/payroll-workforce.ts:40` | salary structure (Gen-1, retired) |
| Payroll run | payrollRun | `hr/payroll-runs.ts:12` | batch |
| Pay period | payrollPeriod | `payroll/entities-periods.ts:74` | payroll cycle |
| Entitlement tier | **PlanTier** FREE·PAID·ENTERPRISE | `plan-entitlements.constants.ts:15` | — |
| Commercial plan | **EffectivePlan** FREE·STARTER·PROFESSIONAL·ENTERPRISE | `plan-entitlements.constants.ts:16` | — |
| AI credit unit | milli-credit (integer ×1000) | `billing.ts:123` | integer credit (retired 2026-07-20) |
| Billable seat | active `organizationMembers` row | — | pending-invite seat (reserves, bills on acceptance) |

`* "employee"` survives as a **UI label** for an active person under an employment. It is not a table name.

**`PlanTier` ≠ `EffectivePlan`.** These are two axes, not a drift — entitlements key on tier, the price book keys on plan. Do not collapse them.

---

## 2. Where we stand vs. the market

Detail in `R1`/`R2`/`R3`. Headline: **breadth is not the problem.** Of ~65 HR capabilities surveyed, the large majority already exist in some form. The gaps that matter are depth, correctness and configurability — not missing modules.

**Genuinely absent capabilities** (ranked by commercial weight):

| Gap | Why it matters | Effort |
|---|---|---|
| **Arrears / retro pay** | Backdated salary revisions are routine in India. Today a revision effective from an earlier month cannot be paid correctly at all. | L |
| **Effective-dated statutory config** | A Budget change is a code deploy. Blocks every compliance claim. | M |
| **Plans as data** (versioned price book, grandfathering) | STARTER and PROFESSIONAL currently resolve to the *same* entitlements — there is nothing to upsell on. | L |
| Dunning / `PAST_DUE` lifecycle | Failed payments leave subscriptions `ACTIVE` forever. Involuntary churn is a revenue bug. | M |
| Timesheet → payroll bridge | Two disconnected chains; an employee can show 40h in timesheets and 0 payable days in payroll. | M |
| LMS / courses / certifications | Common in the segment; entirely absent. | L |
| Dotted-line / functional manager | Matrix orgs can't be modelled. | S |
| Cost centres | Needed for payroll GL allocation. | S |
| Perquisites | Required for correct Indian taxable income. | M |
| Pre-joining portal | Candidates can't complete onboarding before day one. | M |

---

## 3. Adoptable patterns

Selected for **structural leverage** — each makes a class of bug impossible rather than fixing one instance. Ordered by leverage.

### P-01 · Fail-closed by default *(the single highest-leverage change)*
Three separate P0s share one root: **absence is treated as permission.**
- missing `ENCRYPTION_KEY` → store plaintext (`crypto.helpers.ts:15-17`)
- unresolvable file owner → allow download (`storage.controller.ts:129`)
- module key absent from `org_modules` → *this one already fails closed* (`entitlements.service.ts:131`)

Fix as one principle, not three patches: absence ⇒ **deny**, plus fail-fast startup assertions for required secrets. First step: make `ENCRYPTION_KEY` required in `config/env.validation.ts:53`; invert the `!== null` guard in `storage.controller.ts:129`.

### P-02 · Effective-dated statutory config
Move every rate/slab/ceiling from `statutory-registry.ts` + `statutory-packs.ts` into `payroll_statutory_parameters`, keyed `(country, state, parameter_key, effective_from)` with `source` and `notes`. The engine resolves the row effective for the run's period. Budget change = row insert. Satisfies H12.

### P-03 · Country-pack registry
Replace the `if (country !== "IN")` dispatch (`statutory.ts:202-222`) with `Map<countryCode, StatutoryPack>`. India becomes one registered pack. Adding a country never touches the engine. Satisfies Schema §13.

### P-04 · Integer minor units end-to-end + deterministic residual
Per-employee calc is already integer paise. Extend it through run totals (`generate.service.ts:191-194`) and GL posting (`payroll-posting.service.ts:22-28`). **Rounding rule:** half-up per component; `residualPaise = target_net − Σ(rounded components)` assigned to the largest earnings component; persist `residualPaise` for audit; run totals via SQL `SUM(net_paise)`, never float accumulation. Guarantees Σ(lines) = net exactly, residual bounded at (N−1) paise.

### P-05 · One entitlement service, no plan in the JWT
Delete `PLAN_FEATURES`/`requireFeature(u.plan, …)`; every check goes through `PlanLimitsService.checkFeature(orgId, feature)`. Remove `plan` from JWT claims entirely — that eliminates the slowest stale layer rather than shortening its TTL. `bust(orgId)` must evict **both** the in-memory (30s) and Redis (60s) caches. Upgrade then takes effect on the very next request with no per-request DB hit.

### P-06 · 402 vs 403 with machine-readable codes
`402` when buying more fixes it (`QUOTA_EXCEEDED`, `SEAT_LIMIT_REACHED`, `MODULE_NOT_ENTITLED`, `CREDITS_EXHAUSTED`, `SUBSCRIPTION_PAST_DUE`); `403` when the role forbids it. Today quota is 403 and module-disabled is **404**. The UI branches on `code`, never on message text.

### P-07 · Append-only attendance with correction rows
Raw punches become immutable facts; regularisations insert into `hr_attendance_adjustments` rather than overwriting `checkIn`/`checkOut` (`attendance-regularization.service.ts:149-169`). Mirrors the existing `hrEmploymentHistory` pattern. Derived daily attendance becomes a recomputable projection.

### P-08 · Per-employee policy evaluation
Replace `representativeUserId = userIds[0]` (`attendance-summary.service.ts:187`) with per-employee resolution. Small change; today it silently applies one arbitrary employee's thresholds to everyone's LOP.

### P-09 · Real outbox delivery, then event-driven bridges
Implement `OutboxPublisherService.deliver()` (`outbox-publisher.service.ts:111`). Once real, the timesheet→payroll bridge becomes an event (`hr.timesheets.period.approved`) consumed by `PayrollInputsBuildService`, rather than a second synchronous coupling.

### P-10 · Queued, chunked, resumable payroll runs
The `payroll_jobs` table already exists (`entities-periods.ts:161`). Enqueue instead of processing inline; chunk ~50 employees per commit; make each chunk retryable. Removes the Neon-timeout ceiling on large orgs.

### P-11 · Disbursement confirmed ≠ dispatched
Mark `PAID` only on bank confirmation. Implement the `RECONCILE` job (currently a fake success at `payroll-jobs-worker.service.ts:186-188`) to match bank returns by reference and record results.

### P-12 · Plans as versioned data
`plan_versions` rows (immutable once used) + `subscription.plan_version_id` pinned at subscribe time. Grandfathering becomes a first-class state; a one-off customer deal is a data change.

### P-13 · Webhook discipline
verify signature → persist **raw** payload → dedupe by provider event id → enqueue → return 200 → daily reconciliation against the provider. Currently processed inline with only a redacted summary stored.

### P-14 · Composite tenant-leading uniqueness
Three unique indexes are not led by `orgId` (`leaves.ts:27`, `core-org.ts:71`, `performance.ts:335`) — one tenant's row can block another's. Same class as the already-fixed `projects.key` bug.

### P-15 · Server-gate at the boundary, once
~60 client-only HR pages and 157 ungated query hooks. Fix structurally: thin Server Component shims calling `requirePermission`, and `enabled: useCan("<exact backend key>")` on every hook — with the key taken from the endpoint's `@RequirePermission`, honouring the intentional `hr:employees:read` vs `:view` split.

---

## 4. Statutory rules

See `_recon/R4-india-statutory.md`.

> **`[UNVERIFIED — requires sign-off by a qualified Indian CA / payroll professional before go-live]`.** Every rate, slab, ceiling and threshold compiled there is research input for a professional to confirm, not tax advice. Nothing in this programme should be represented to a customer as compliant until that sign-off exists.

Three structural facts are certain regardless of the rates themselves:

1. **No effective-dated statutory table exists** — all values are TypeScript constants `[V]`.
2. **Coverage is admittedly partial** — the PT map covers ~17 states and LWF ~10, each labelled "sample… legal review required" in the source itself (`statutory-registry.ts:122,147`). Orgs in uncovered states silently receive a wrong default. R4 additionally reports states that levy **no** PT being charged ₹200 (Haryana, Punjab, Rajasthan, UP) and states that **do** levy PT being charged ₹0 (Kerala, Bihar, Assam) — every one `[UNVERIFIED]`.
3. **A whole slab table appears shifted by one financial year** `[V]`. The registry holds two India bundles:

   | Bundle | `effectiveFrom` | New-regime slabs | §87A rebate |
   |---|---|---|---|
   | A (`:103`) | `2025-04-01` | 6-band 3L/7L/10L/12L/15L (`:187-192`) | ₹25,000 up to ₹7L (`:194-195`) |
   | B (`:221`) | `2026-04-01` | 7-band 4L/8L/12L/16L/20L/24L (`:239-245`) | ₹60,000 up to ₹12L (`:247-248`) |

   R4's sources place the 7-band structure and the ₹60,000 rebate at **1 Apr 2025**, not 2026. If that dating is right, every FY2025-26 run over-deducted TDS for ₹7L–₹12L earners and every FY2025-26 Form 16 / 24Q is wrong. **The correct legal dating is `[UNVERIFIED]` and must be confirmed by a CA — this document asserts only what the code contains.**

   Nothing in the system would have surfaced this. That is the argument for P-02 in one example: as data with `effective_from` + `source_url` + a verification marker, it is a one-row correction an accountant can review; as constants, it is invisible.

The design consequence (P-02) holds no matter which values are ultimately correct: rates must be data, per-state, effective-dated, and carry a source citation.

---

## 5. Explicit non-goals

Carried forward from CLAUDE.md, the north-star's rejected list, and this research:

- No Workspace layer above Organization; no collapsing tenancy onto `users`.
- No external authorization runtime (Keycloak/OpenFGA/SpiceDB/Cerbos); no ABAC policy DSL.
- No monorepo or shared contract package — generate frontend types from backend zod instead.
- No platform-wide `pgEnum` → `text` migration; new status columns only.
- No `class-validator`; zod remains the single validation library.
- No card data stored anywhere — PCI scope stays out of the application.
- **No home-grown tax engine.** We store cited, effective-dated parameters; we do not invent tax positions.
- No AI output as the sole basis for a pay, hiring, promotion or termination decision.
- No mobile-native app in this programme (responsive web only).
- No payroll money column migration without explicit sign-off — arithmetic is fixed first, storage later.
- No big-bang cutover; no deletion of payroll, statutory or invoice history under any cleanup.

---

## 6. Decision ledger

`_recon/R5-vocabulary-reconciliation.md` consolidates 52 decisions (`D-01…D-52`) with ACTIVE/SUPERSEDED/OPEN status. The 12 approved in this session are `D-47…D-52` plus the tier/seat/money/statutory calls recorded in `00-scope-and-conflicts.md`.

**Still open, carried into Phase 3 as flagged items rather than silent choices:**

| # | Open question | Recommended default |
|---|---|---|
| O-1 | `ENCRYPTION_KEY` set in production? | Assume not; treat as live; make it required |
| O-2 | Are all 101 migrations applied to the current Neon branch? | Verify before any schema batch |
| O-3 | `org_modules` row coverage per org | Audit + backfill **before** activating any module gate |
| O-4 | GST on platform invoices; invoice numbering per FY (Apr–Mar) | Flag for accountant; do not change tax treatment unilaterally |
| O-5 | STARTER vs PROFESSIONAL feature split | Product decision; P-12 makes it a data change |
| O-6 | `DataScope: "team"` — wired or inert? | Verify `apply-scope.ts` before relying on it |
