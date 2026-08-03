# 03 — Change Map

> **APPROVAL GATE.** No production code is written until you approve this document. No payroll code until `04-schema-design.md` is also approved.

**104 rows** across three lanes. Every row carries a `path:line` confirmed by direct read, in the format
`ID | Layer | Target file:line | Category | Severity | Current | Problem (+rule ref) | Fix | Breaking?+migration | Blast radius | Depends on | Batch`.

Full row tables:
`_plan/C1-changes-security-hr.md` (34) · `_plan/C2-changes-payroll.md` (35) · `_plan/C3-changes-billing-frontend.md` (35)

Severity split: **21 P0 · 47 P1 · 36 P2**.

---

## 1. The three things I will not decide for you

| # | Decision | Why it's yours | Blocks |
|---|---|---|---|
| **D-A** | **Is the 7-band TDS slab table effective 1 Apr 2025 or 1 Apr 2026?** The code has the 6-band table at `2025-04-01` and the 7-band at `2026-04-01` (`statutory-registry.ts:103,187-195,221,239-248`). If the earlier dating is correct, every FY2025-26 run over-deducted TDS and every Form 16 / 24Q for that year is wrong. | A tax position. Requires a qualified Indian CA. I have documented the code fact, not the law. | Batch 7; and the decision on whether FY2025-26 runs are remediated at all |
| **D-B** | **GST on our platform invoices, and per-financial-year invoice numbering.** Platform prices appear to be charged without GST; numbering resets 1 Jan, not 1 Apr. | A tax position and a registration question. | Batch 10 |
| **D-C** | **What separates STARTER from PROFESSIONAL?** They currently resolve to identical entitlements — there is nothing to upsell on. | Pricing/product strategy. | Nothing — `plan_versions` makes it a data change *after* Batch 10 |

Additionally, three items need an **operator**, not code: provisioning `ENCRYPTION_KEY`; auditing `org_modules` row coverage; confirming the 101 migrations are applied to the target Neon branch.

---

## 2. Batch sequence

Each batch is independently shippable and revertible, with `typecheck + lint + build` green before the next starts. Ordering is driven by **dependency and blast radius**, not severity alone — several P0s are deliberately late because they depend on earlier structural work.

| # | Batch | Rows | Why here | Risk |
|---|---|---|---|---|
| **0** | **Preconditions** — no code | — | `ENCRYPTION_KEY` provisioned · `vector` extension created · migration state confirmed · rollback mechanism established · `org_modules` coverage audited | — |
| **1** | **Fail-closed inversion** | C1 A1–A5 | Three P0s share one root: absence ⇒ permission. Smallest possible diff, highest severity. `ENCRYPTION_KEY` must already be set (Batch 0) or this takes the app down. | **High if Batch 0 skipped** |
| **2** | **Crypto consolidation + PII encryption** | C1 B1–B3, C1–C6 | Four crypto helpers → one; then encrypt `hr_employee_sensitive_fields`. Dual-mode read (`enc:v1:` prefix) so old and new rows coexist. Backfill is operator-run, after the code is verified stable. | Medium — atomic write+read deploy required |
| **3** | **Entitlement engine unification** | C3 BILLING-01–05, 20 | Deletes the second engine and removes `plan` from the JWT. Independent of schema. Fixes the upgrade-latency bug. | Medium — touches 20+ AI controllers |
| **4** | **Frontend RBAC gates** | C3 FE-10–21 | ~157 ungated hooks + 2 key mismatches + 2 invalidation-escaping keys. High volume, low risk, no backend dependency. | Low — but see risk R-3 |
| **5** | **Payroll money arithmetic** | C2 09–13 | Run totals, GL, bank batch and bank file to integer paise, with residual allocation. **No DDL.** Must precede GL error propagation. | Medium — money path; gated by parallel run |
| **6** | **GL integrity + run immutability** | C2 14–21 | Stop swallowing posting errors; integer balance assertion; DB constraint; `setEmployeeHold` status guard; missing `orgId` on three UPDATEs. | Medium |
| **7** | **Statutory config as data** | C2 01–08 | The centrepiece. New tables + engine reads DB. **Gated on D-A and CA-verified rows.** | **High — CA-gated** |
| **8** | **Job honesty** | C2 22–24 | Implement `RECONCILE`/`PREVIEW`/`EXPORT`, stale-lock reclaim, real outbox `deliver()`. Fake success is worse than no feature. | Medium |
| **9** | **HR correctness** | C1 F1–F3, G1–G4, H1 | Per-employee attendance policy, UTC/local fix, append-only punches, missing `orgId`, missing transactions, durable audit. | Low–Medium |
| **10** | **Subscription lifecycle** | C3 BILLING-10–19 | `PAST_DUE`, dunning, suspension as read-only, `settle()` idempotency, webhook raw-body + reconciliation, quota alerts. Includes D-B items as flagged rows. | Medium |
| **11** | **Module gating** | C1 E1–E2 | 108 inert `@RequireModule`. **Hard-gated on the Batch 0 `org_modules` audit** — see R-1. Activated per-module, 3–5 controllers at a time. | **High — see R-1** |
| **12** | **Schema: legal entities + effective-dating** | S1 waves 1–7 | `legalEntities`, `EXCLUDE USING gist` non-overlap, `'infinity'` convention, lifecycle trigger, dotted-line managers, cost centres. | Medium — irreversible steps flagged |
| **13** | **Frontend structure** | C3 FE-01–09, 22–36 | Server gates, LOC extraction, `EntitlementGate`, shared formatters, missing loading/error states. | Low |
| **14** | **Arrears / retro engine** | C2 35 | **New feature, not a fix.** Depends on Batch 12's effective-dated salary design. | Medium |
| **15** | **Tests** | C2 32–34 + full matrix | Per H10, suites run at the end. Parallel run, rounding accumulation, cross-tenant isolation. | — |

---

## 3. Hard sequencing constraints

Violating any of these breaks something that works today (H3).

1. **Batch 0 → Batch 1.** `ENCRYPTION_KEY` must be provisioned *before* `encrypt()` throws instead of returning plaintext. Reverse order = total outage on any PII write.
2. **A3 + A4 atomically.** Denying on unresolved file-owner (A3) without first registering payslip/e-sign/vault tables (A4) breaks legitimate downloads.
3. **C1+C2+C3 atomically.** Encrypted writes must ship with dual-mode read, or users see ciphertext.
4. **C1–C3 verified in production → C6 backfill.** Never backfill before the read path is proven.
5. **BILLING-01 → BILLING-02.** Remove `requireFeature(u.plan,…)` before stripping the JWT `plan` claim, or every AI feature gate fails closed.
6. **BILLING-03 → FE-25.** The machine-readable `code` must exist before `EntitlementGate` consumes it.
7. **E1 → E2.** `org_modules` backfill is a hard gate; see R-1.
8. **C2-09 → C2-10 → C2-11 → C2-14.** Float fixes land before GL error propagation, or propagation surfaces float noise as hard failures.
9. **C2-24 → C2-26.** A real outbox must exist before the timesheet→payroll bridge rides on it.
10. **G1 → G2.** Fix the unscoped query before wrapping it in a transaction.
11. **Batch 12 → Batch 14.** Arrears depends on the effective-dated salary design.

---

## 4. Risk register

| ID | Risk | Likelihood | Impact | Mitigation | Early-warning signal |
|---|---|---|---|---|---|
| **R-1** | **Activating module gates 403s every HR endpoint for orgs missing an `org_modules` row.** `isModuleEnabled` fails closed (`entitlements.service.ts:127-133`). | High if unaudited | **Total HR outage per affected org** | Batch 0 audit + backfill; activate per-module in 3–5 controller slices; canary one module first | 403 rate on `/hr/*` for non-owner users |
| **R-2** | **`ENCRYPTION_KEY` not set when Batch 1 ships** → every PII write throws. | Medium | App-breaking | Batch 0 gate; startup assertion fails fast and loudly at deploy, not at first write | Deploy-time boot failure (intended) |
| **R-3** | **A gate change locks out legitimate users.** Adding `enabled: useCan(...)` with the wrong key silently hides working features. | Medium | Feature invisible to valid users | Every key copied from the endpoint's own `@RequirePermission`; honour the intentional `hr:employees:read` vs `:view` split; canary on a non-owner account | Support reports of "missing" pages |
| **R-4** | **Wrong pay reaches an employee.** Money-path refactor (Batch 5). | Low | **Severe — money + trust** | Parallel run to BigInt-paise equality per employee before merge; no batch ships without it | Any non-zero variance in the parallel run |
| **R-5** | **A statutory filing is wrong.** Batch 7 changes computed tax. | Medium | **Severe — legal** | CA sign-off gates the batch; `verification_status` blocks unverified rows from the engine; per-org impact report before deploy | Variance report vs prior cycle |
| **R-6** | **Batch 7's expected diff is mistaken for a regression** (or vice versa). | High | Wasted rollback, or a real bug shipped | Diff is documented in advance against the CA sign-off date; the parallel run asserts *only* the TDS delta changes | Diff in any component other than TDS |
| **R-7** | **Backfilling encryption corrupts data.** | Low | Severe | Dual-mode read tolerates both forms; backfill is idempotent and prefix-guarded; dry-run row counts first (H1) | Row count mismatch pre/post |
| **R-8** | **The concurrent session's backend work collides.** Another session is actively editing `backend/` (tenant/RLS plumbing). | High | Merge conflicts, stale line numbers | Explicit pathspec commits only, never `git add -A`; re-verify line numbers at batch start | `git status` showing unexpected modified files |
| **R-9** | **No rollback exists.** 96 of 101 migrations have no down-migration. | Certain today | Cannot revert a bad migration | Batch 0 establishes a rollback mechanism before any DDL batch (12, 7) | — |
| **R-10** | **A paywall change blocks a paying customer.** | Low | Revenue + trust | 402 carries a machine code and never blocks reads; suspension is read-only by design | 402 rate on a subscription in good standing |

---

## 5. Migration runbook

Applies to every batch containing DDL (7, 12, and the deferred money migration).

**Per migration:**
1. `pnpm -C backend db:generate` — never hand-edit generated SQL.
2. Review the generated file. Confirm it is **expand-only** (additive) unless explicitly a contract step.
3. Write the paired rollback script. **This is currently missing for 96 of 101 migrations and must exist going forward (H1).**
4. Dry-run on a copy of realistic data; record **row counts before and after**.
5. Apply forward, verify counts, apply rollback, verify counts return.
6. Only then apply to the target branch.

**Ordering discipline:** expand → backfill in batches → dual-read → cutover → contract. One purpose per migration. Name every constraint and index explicitly. Build indexes concurrently on large tables. Prepend `SET statement_timeout = 0;` to long catalogue migrations (Neon cancels long single statements on a cold build).

**Irreversible steps** — each needs explicit sign-off at the time:
- `NOT NULL` promotion after backfill (`effective_to`, `legal_entity_id`, `plan_version_id`)
- `pgEnum ADD VALUE`
- `DROP COLUMN` in any contract phase
- Consolidating the two subscription tables

**Cold-rebuild prerequisites** (a fresh database fails today): create `vector`, `pg_trgm`, `btree_gist`, `pgcrypto`, `uuid-ossp` **before** `db:migrate`. Never fold these into `0000` — editing an applied migration changes its hash.

---

## 6. Folder / structural changes

Additive only; no module renames.

```
backend/src/
  common/security/
    secret-encryption.util.ts        ← the ONE crypto helper (3 others deleted)
  db/schema/
    common/legal-entities.ts         ← NEW
    payroll/statutory-params.ts      ← NEW  (rule params + slabs + audit log)
    payroll/retro.ts                 ← NEW  (arrears events + period deltas)
    billing/plan-versions.ts         ← NEW  (plan_versions, prices, overrides)
    billing/platform-invoices.ts     ← NEW  (invoices, lines, FY sequences)
    billing/seat-ledger.ts           ← NEW
  modules/payroll/statutory/         ← NEW  (StatutoryConfigService + country-pack registry)
  modules/payroll/retro/             ← NEW  (arrears engine)

frontend/
  lib/format-money.ts                ← moved out of features/payroll/shared
  lib/format-date.ts                 ← NEW (no shared date formatter exists)
  components/entitlement-gate.tsx    ← NEW (no paywall/upsell state exists anywhere)
  features/**                        ← receives ~3,900 LOC extracted from oversized route files
```

Deleted: `hr/lifecycle/crypto.helpers.ts`, `hr/payroll/lib/encryption.ts`, `hr/onboarding/core/crypto.helpers.ts` (after caller migration). **Nothing holding payroll, statutory or invoice history is deleted in any batch** — cleanup (Phase 5) is prove-then-delete and explicitly excludes those.

---

## 7. What is deliberately *not* in this change map

- **Money column migration** (~115 `decimal` columns). Arithmetic is fixed in Batch 5; storage migration stays deferred behind separate sign-off. Deviates from a literal reading of H13 — flagged rather than done quietly.
- **`pgEnum` → `text` + CHECK** platform-wide. 399 enums; new columns only.
- **Monorepo / shared contract package.** Replaced by generated types from backend zod schemas.
- **RLS.** A backstop worth having, but it depends on request-GUC plumbing a concurrent session is currently building. Out of scope here.
- **LMS, mobile app, pre-joining portal, auto-filing to EPFO/ESIC.** Real gaps, but new products — not this refactor.
- **Any change to a tax position.** D-A and D-B surface questions; they do not answer them.

---

## 8. Definition of done per batch

Build ✓ · Lint ✓ · Types ✓ · no new forced types · tenant scoping verified on every touched query · RBAC gate matches the endpoint's own `@RequirePermission` · caches invalidated on mutation · responsive at 375/768/1280 for UI rows · no file over 500 LOC · rollback script exists for any DDL · `PAGES.md` updated · one commit, explicit pathspec, on `refactoring-hrms`.

Payroll batches add: **parallel run reconciles to zero variance** (except Batch 7's documented, CA-signed TDS delta).
