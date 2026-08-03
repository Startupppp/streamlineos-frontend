# 01 — Phase 1 Inventory (HRMS · Payroll · Billing)

**Date:** 2026-07-31 · **Branch:** `refactoring-hrms` (both repos) · **Method:** 19 exclusive read-only recon lanes + orchestrator verification.

Lane detail lives in `docs/hrms/_recon/*.md`. This document is the synthesis.

**Evidence convention.** `[V]` = I verified it myself by reading the cited source in this session. `[L]` = reported by a recon lane with a citation, not independently re-checked. `[UNVERIFIED]` = cannot be established from the repo (needs an operator or a running system). Nothing here is asserted without one of these marks.

---

## 1. System map (measured, not estimated)

| Dimension | Count | Source |
|---|---|---|
| `pgTable` declarations (all schema) | **757** | [V] |
| `pgEnum` declarations (all schema) | **399** | [V] |
| HR tables / enums | 234 / 90 | [L] Lane A |
| Payroll tables (3 generations) | 41 | [L] Lane B |
| Billing tables | 29 | [L] Lane B |
| HR backend files (`modules/hr`) | 443 ts + 50 spec | [V] |
| HR controllers / routes | **119** / ~850 | [V] / [L] |
| HR service+lib files | 324 (165 `*.service.ts`) | [L] Lane C2 |
| Payroll backend files | 133 ts + 37 spec; 29 controllers | [V] |
| Billing backend files | 42 ts + 7 spec | [V] |
| Frontend pages in scope | **175** (hr 125 · payroll 23 · billing 6 · settings 19 · users 2) | [L] Lane F1 |
| Frontend feature files | hr 456 · payroll 149 · billing 14 | [L] Lane F2 |
| Migrations | **101** (journal agrees); 5 have `.down.sql` | [L] Lane O |

**Repo topology** [V]: root = frontend git repo (`.gitignore` line 1 = `/backend/`); `backend/` = separate git repo. No monorepo, no workspace, no shared package.

**Concurrency hazard** [V]: a **concurrent session is actively editing `backend/`** (tenant-context/RLS plumbing: 4 new files under `src/common/tenant/`, plus `app.module.ts`, `drizzle.module.ts`, `package.json`, +36 lines of `_journal.json`). Line citations into those files drift. All commits must use explicit pathspecs.

---

## 2. Identity model — the brief's requirement is *already largely met*

The brief (Schema §1) asks for identity ≠ person ≠ contract. **That model already exists** [V]:

| Level | Table | File |
|---|---|---|
| Login identity | `users` — **no `orgId`**; multi-org via join table | `db/schema/common/auth.ts:103` |
| Tenant membership | `organizationMembers` — unique `(userId, orgId)` | `common/auth.ts:82` |
| Person (tenant-local) | `hrPeople` — `userId` **nullable** (pre-hire/contractor supported) | `hr/core-people.ts:67` |
| Dated contract | `hrEmployments` — `lifecycleStatus`, `isPrimary`, multiple concurrent | `hr/core-people.ts:103` |
| Transition log | `hrEmploymentHistory` — append-only | `hr/core-people.ts:177` |
| Sensitive data | `hrEmployeeSensitiveFields` — 1:1 with employment | `hr/core-people.ts:137` |

`lifecycleStatus` already spans `CANDIDATE → PRE_JOINING → ONBOARDING → ACTIVE → PROBATION → CONFIRMED → NOTICE → EXITED → ALUMNI → SUSPENDED` [L].

### What is genuinely missing
1. **No `legalEntities` table** [L]. Legal-entity concerns are approximated by `orgUnits.kind`. Blocks: per-entity tax registration, per-entity currency, per-entity invoice numbering, data residency.
2. **No transition validation** [L] — `lifecycleStatus` can jump `CANDIDATE → EXITED`; nothing enforces the state machine.
3. **Legacy duplication** [V] — `users.taxId`, `users.bankDetails`, `users.monthlySalary` still exist alongside `hrEmployeeSensitiveFields`.

### Naming collision — three vocabularies for one model
| Source | Person | Contract |
|---|---|---|
| Your brief | `employees` | `employments` |
| `docs/schema-redesign/north-star.md:320-331` | `organization_people` | `workers` + `worker_engagements` |
| **Actual code** | `hrPeople` | `hrEmployments` |

This must be settled before any schema work (**Q3**).

---

## 3. Top findings by severity

### P0

| # | Finding | Evidence |
|---|---|---|
| **F-01** | **Encryption fails open, silently.** `encrypt()` returns plaintext when `ENCRYPTION_KEY` is unset; env schema declares it `optional()`, so the app boots fine and stores PII in clear text with no error or log. | [V] `hr/onboarding/core/crypto.helpers.ts:9-17`; `config/env.validation.ts:53`. Live impact `[UNVERIFIED]` — depends on your prod env. |
| **F-02** | **The canonical sensitive table is plaintext.** All three writers of `hr_employee_sensitive_fields` (PAN, national ID, passport, `bank_details` JSONB, medical notes) store plaintext — none imports an encrypt helper. The **legacy** `users.taxId`/`bankDetails` it replaces *are* encrypted. The newer table is less protected than the old one. | [V] `hr/core/hr-sensitive.service.ts:94,118`; `hr-effective-changes.service.ts:259`; `recruitment-handoff.service.ts:191` vs `employee-mutations.service.ts:217,220` |
| **F-03** | **No effective-dated statutory config exists.** Every PF/ESI/PT/TDS-slab/gratuity/cess rate is a TypeScript constant. A Budget change is a **deploy**, not a data change. Direct H12 violation. | [V] `modules/payroll/runs/lib/statutory-registry.ts` (362 LOC) + `statutory-packs.ts` (412 LOC); [V] no schema file pairs `effectiveFrom` with a statutory rate |
| **F-04** | **Statutory coverage is admittedly partial.** PT map covers ~17 states, LWF ~10, each labelled "sample… legal review required". Orgs elsewhere silently get a wrong default. | [L] `statutory-registry.ts:122,147` |
| **F-05** | **Paywall gates on a stale JWT claim.** `plan` is read from JWT claims and `requireFeature(u.plan, …)` gates on it — so an upgrade doesn't unlock and a downgrade doesn't lock until the token refreshes. | [V] `common/auth/jwt-auth.guard.ts:184`; `modules/ai/core/billing/feature-gates.ts:92` |
| **F-06** | **Two competing entitlement engines** — DB-backed `PlanLimitsService` and JWT-backed `PLAN_FEATURES`. Brief §1 requires exactly one. | [V]/[L] |
| **F-07** | **Quota rejection returns 403, not 402**, with a prose message and no machine-readable code — the UI cannot distinguish "upgrade fixes this" from "your role forbids this". | [V] `billing/core/plan-limits.service.ts:205` |
| **F-08** | **Run totals are float.** Per-employee calc is integer paise, but run totals accumulate `parseFloat` across employees, so a stored run total can disagree with the sum of its own payslips. | [V] `payroll/runs/generate.service.ts:191-194` |
| **F-09** | **GL posting swallows every error.** `postFinalized()` wraps `postJournal` in a `try/catch` that only logs — a payroll run finalizes with no ledger entry, invisible until a trial balance. | [L] `finance/payroll-posting.service.ts:33-65` |
| **F-10** | **Balance check tolerates imbalance.** `assertBalanced()` accumulates floats with a `> 0.009` tolerance — real imbalances up to ±0.008 pass. No DB-level Σdebit=Σcredit constraint. | [L] `accounting/journal-posting.service.ts:188-203`; `db/schema/accounting.ts:69-100` |
| **F-11** | **Outbox delivers nothing.** `deliver()` is a `logger.debug` stub; every event is claimed and marked `DELIVERED` without dispatch. | [V] `common/outbox/outbox-publisher.service.ts:111-115` |
| **F-12** | **Payroll job types are fake successes.** `PREVIEW`/`EXPORT`/`RECONCILE` return `{ ok: true, note: "…no-op handler" }`. A reconciliation that reports success without reconciling is worse than none. | [V] `payroll/jobs/payroll-jobs-worker.service.ts:186-188` |
| **F-13** | **Unauthenticated denial-of-wallet.** `POST /public/kb/ask` is `@Public()` with `charge:true`; any caller supplies an `orgId` and burns that org's credits. Rate limit is the only control. | [L] `modules/kb/kb-rag.controller.ts:14` |
| **F-14** | **Storage BOLA + permanent public URLs.** `resolveFileOwnerOrgId` misses e-sign/payslip paths → signed URL issued without an org check; uploads persist permanent public URLs for HR docs and payslips. | [L] `storage.controller.ts:129,151-172`; `storage.service.ts:115-116`. Public-bucket exposure `[UNVERIFIED]` (depends on `NEXT_PUBLIC_R2_PUBLIC_URL`). |
| **F-15** | **96 of 101 migrations have no rollback**, including six mass `DROP TABLE … CASCADE`. H1 has no mechanism today. | [L] Lane O |
| **F-16** | **Cold `db:migrate` fails.** `vector` extension is never created by any migration, but `0016` builds an HNSW index on it. | [L] `migrations/0016_volatile_nicolaos.sql:10` |

### P1 (selected)

| # | Finding | Evidence |
|---|---|---|
| F-17 | **108 inert module gates.** 119 HR controllers, 114 carry `@RequireModule`, only **6** list `ModuleGuard`. `ModuleGuard` is not a global `APP_GUARD`. ~850 HR endpoints have no module-enablement check. Same shape in accounting (~70 endpoints). | [V] counts; [L] accounting |
| F-18 | **Attendance policy applied from one arbitrary employee.** `representativeUserId = userIds[0]`; half-day/absent thresholds, late penalty and overtime threshold are resolved once and applied to everyone. Feeds LOP → pay. | [V] `hr/time/attendance-summary.service.ts:187-196` |
| F-19 | **Late detection broken for every non-UTC tenant.** `getUTCHours()` compared against a shift `startTime` parsed as local `HH:MM`. An IST 09:15 check-in scores 225 vs a 555 threshold and never flags late. | [V] `attendance-summary.service.ts:227,233` |
| F-20 | **The two time chains are disconnected.** Timesheet hours never reach HR payroll inputs; an employee can show 40h in timesheets and 0 payable days in payroll. | [L] Lane J |
| F-21 | **Raw punches are mutable.** Checkout UPDATEs in place; regularisation overwrites `checkIn`/`checkOut` with no compensating row. Brief §5 requires append-only. | [L] `attendance-regularization.service.ts:149-169` |
| F-22 | **`setEmployeeHold` has no run-status check** — mutates a run employee on `APPROVED`/`LOCKED`/`PAID` runs. H14 breach. (Both read and write *are* org-scoped.) | [V] `payroll/runs/runs.service.ts:43-63` |
| F-23 | **Manual GL reversal leaves both entries `POSTED`** — the original is never voided. | [L] `accounting-ledger.service.ts:329-407` |
| F-24 | **Invoice numbering never resets per financial year** — violates Indian GST sequential-per-FY. (The advisory-lock race is safe.) | [L] `invoices-write.service.ts:96-104` |
| F-25 | **`PAST_DUE` is never set** — a failed payment leaves the subscription `ACTIVE` indefinitely; no grace/suspend path. | [L] `db/schema/common/enums.ts:118` |
| F-26 | **Three seat definitions** — display counts members; enforcement counts members + pending invites; `platform_subscriptions.seatCount` is hardcoded `1` and never read. No reconciliation. | [L] Lane E |
| F-27 | **Audit log is fire-and-forget** (`void`) — entries drop silently on failure. The HR-specific audit *is* awaited. | [L] `common/audit/audit.service.ts:37` |
| F-28 | **~58 backend HR permission keys are absent from the frontend catalog**, including `hr:sensitive:view/manage` — so the UI cannot gate sensitive-data controls. | [L] Lane H |
| F-29 | **Redaction has no Aadhaar/PAN/IFSC/bank patterns**, and bare 10-digit Indian mobiles miss the US-centric phone regex. | [L] `redaction.util.ts:1-24` |
| F-30 | **Broken AI billing attribution** — 6 CRM endpoints charge `undefined`; blog AI charges `orgId:""`; `generate-jd` charges `orgId:"system"`. | [L] Lane N |
| F-31 | **Frontend payroll arithmetic** — HRA/PF/gross/net computed in components. H5/§6 violation. | [L] `payroll/salary-structures/salary-structure-template-sheet.tsx:56-84`; `payroll/employees/employee-detail-page.tsx:261-266` |
| F-32 | **Money is `decimal` nearly everywhere** — ~55 HR + 60+ payroll/billing `decimal` money columns; 259 `parseFloat` calls in the payroll module. H13 violation at storage level. | [L] Lanes A, B |

---

## 4. Verified corrections (claims that did **not** survive checking)

Recording these matters as much as the findings — acting on them would have caused harm or wasted effort.

| Claim | Verdict |
|---|---|
| "Payroll controllers carry no `@RequireModule`" (prior session) | **False.** 29/29 have it *and* `ModuleGuard`. [V] |
| "Legacy `payrolls`/`salaryStructures` tables have readers but no writers" (prior session) | **Obsolete.** Both tables were dropped by migration `0345`. [V] |
| "`payroll-inputs` approve/reject are open cross-tenant writes" (Lane C2, P0) | **Overstated.** An org-scoped `findFirst` throws `NotFoundException` first. TOCTOU hardening, not exploitable. Downgraded to P2. [V] |
| "27 HR write-endpoints sit on `:view` permissions" | **All 27 are deliberate self-service or dual-audience.** Consistent with 4/4 prior false positives. [L] |
| "Ghost permission keys in HR controllers" | **Zero.** All resolve, including programmatically generated ones. [L] |
| "~65 ungated HR pages = data breach" | **Disclosure/UX defect, not a breach** — backend `@RequirePermission` holds; pages render a shell then 403. [V] layout chain |
| "Payroll has no golden-file/determinism tests" (assumed) | **False.** Golden-file replay, determinism, idempotency, locked-run immutability and pennies suites all exist. [L] |

---

## 5. Duplication & dead code

**Duplication** [L]: 18 status-badge implementations (only 7 use `SemanticBadge`) · ~22 money-rendering bypasses of `formatMoney` · 4 export-button implementations · 3 confirm-dialog variants · 3 approval-timeline implementations · **4 separate crypto helpers** [V] (`common/security/secret-encryption.util.ts`, `hr/lifecycle/crypto.helpers.ts`, `hr/onboarding/core/crypto.helpers.ts`, `hr/payroll/lib/encryption.ts`) · two subscription tables · two arithmetic paths in accounting.

**Missing shared primitives** [L]: `ResponsiveDialog`, shared date formatter, **`EntitlementGate`** (no paywall/upsell state anywhere), org-tree picker, approval timeline. `RouteErrorBoundary` and `AiUsageChip` exist but are **never used** in scope.

**Dead / suspect** [L]: `hr_mentorships`, `one_on_one_action_items`, `bank_transfers` (deprecation tombstone), 6 catalog permission keys defined but never enforced (`hr:kpis:*`, `hr:shifts:*`, `hr:geofencing:manage`, `hr:loans:manage`), `platform_subscriptions.seatCount`. **Nothing is deleted in Phase 1** — proof-then-delete happens in Phase 5.

---

## 6. Frontend data layer (Lane F3)

**Scope:** 123 hook files. **298 `useQuery`** · **443 `useMutation`**. No `hooks/api/billing/` — billing lives in `hooks/api/subscription.ts`.

**Healthy** [L]: one central 2,024-line query-key factory rooted at `["streamlineos"]`; the `...options`/`enabled` **clobber bug is absent**; **no optimistic updates on payroll amounts or credit balances** (exactly right); no `useEffect` API calls; no server state in `useState`; `retry` correctly blocks 402; `keepPreviousData` used in 10+ hooks; zero `any`/`@ts-ignore`.

**Defects** [L]:

| # | Finding | Evidence |
|---|---|---|
| F-33 | **~157 of 298 query hooks (53%) have no RBAC `enabled` gate** — they fire for every user and 403-spam. Worst clusters: 10 analytics hooks, 6 attendance hooks, `useHrEmployees`, `useOrgModules`. | `hr/analytics.ts:26-237`, `hr/attendance.ts:20-290`, `hr/employees.ts:122`, `access/org-modules.ts:31` |
| F-34 | **Gate-key mismatches** — `useHrEmployeeOptions` gates on `hr:employees:view` but the endpoint requires `hr:employees:read`; `useTerminations` gates on `hr:exit:manage` while the list endpoint needs `hr:exit:view`. The two-tier `read`/`view` split is **intentional** [V] `employees.controller.ts:82` vs `:100,107,113…` — the frontend simply doesn't honour it. | `hr/employees.ts:133`, `hr/termination.ts:98` |
| F-35 | **Two query keys escape global invalidation** — `access/user-module-access.ts:7` omits the `"streamlineos"` root; `hr/cases.ts:84` uses segment `"hr-cases"` so `queryKeys.hr.all` never matches. | as cited |
| F-36 | **The API client has no timeout and no `AbortController`** — a hung connection blocks indefinitely. Brief FE §1 requires both. | `lib/api-client.ts` |
| F-37 | ~49 hooks omit `staleTime`; `useUpdateProfile` doesn't invalidate the employee detail cache; `useSetUserModuleAccess` does `setQueryData` with no `onError` rollback; 2 hooks hardcode pagination in the URL. | `hr/employees.ts:146`, `access/user-module-access.ts:19`, `hr/import-export.ts:95`, `hr-webhooks.ts:50` |
| F-38 | **~3,543 lines of hand-maintained response types** across `types/hr/**` + `types/payroll/**` with no codegen — the drift surface that Q4 addresses. | as cited |

---

## 7. Known coverage gaps in this recon

- Service-layer BOLA for client-supplied `userId` in `employees.controller.ts:101,148,153` and `attendance.controller.ts:73,85,94` — not verified.
- `finance/controls/` (FX), credit-note GL path, depreciation posting — not traced.
- Whether `ENCRYPTION_KEY` and `NEXT_PUBLIC_R2_PUBLIC_URL` are set in production — **operator-only**.
- Whether the 101 migrations are actually applied to the current Neon branch — **operator-only**.
