# V5 — Delta Audit: S09 Frontend Platform + S10 Excluded Domains & Final Gates

**Date:** 2026-08-30
**Auditor:** V5 (read-only, no edits outside this file)
**Method:** Source inspection, grep, glob, knip baseline comparison, gate-script reads

---

## PAGES.md

**Does not exist anywhere in the repo.**

`glob("**/PAGES.md")` across the entire monorepo returned no matches. Root `CLAUDE.md` §1.7 and §11 require it to be updated after every fix. This is a standing open requirement with no owner.

---

## S09 — Frontend Platform

### Checked items (`[x]`) — 6 total

#### §3.1 — All 5 navigation surfaces consume the same filtered model
**VERDICT: VERIFIED DONE**
- `frontend/components/layout/nav-surface-parity.test.ts` exists with 4 `it()` blocks.
- `frontend/components/layout/mobile/mobile-module-nav-items.ts` takes `NavGroup[]` as a parameter — the caller supplies `getNavGroupsForProduct(...)` output, the same function used by sidebar and product switcher.
- **Minor discrepancy:** the `describe` block reads "all THREE navigation surfaces", and the MATRIX in a related test (`universal-route-matrix.test.ts`) has 50 rows, not the 57 claimed in the original report. The test gate itself says `expect(MATRIX.length).toBeGreaterThan(40)` — not `> 56` — so the test still passes. The row count in the previous report was overstated; the functional guarantee holds.

#### §3.2 — Every non-universal route carries requiredPermission; every universal one does not
**VERDICT: VERIFIED DONE**
- `frontend/components/layout/sidebar/sidebar-permission-coverage.test.ts` exists at the path described.
- Three assertions: "collects the whole navigation tree" (`routes.length > 100`), "gates every non-universal route on a permission", "never gates a universal surface". All bite correctly.

#### §5.3 — product-switcher-menu.tsx (562 lines) split into three files
**VERDICT: VERIFIED DONE**
- `frontend/components/layout/header/product-switcher-menu.tsx` — 266 lines (exact match)
- `frontend/components/layout/header/product-tile.tsx` — 176 lines (exact match)
- `frontend/components/layout/header/product-grid.tsx` — 126 lines (exact match)
- Both new files export named symbols imported by the menu; no dead code in the split.

#### §6.1 — 19 local formatters consolidated onto lib/format-utils.ts; gate check:formatters PASS
**VERDICT: VERIFIED DONE**
- Gate script: `frontend/scripts/check-no-local-formatters.mjs`. Pattern is exactly `new\s+Intl\.NumberFormat\s*\(`.
- `grep` across all `.ts`/`.tsx` for `new Intl.NumberFormat(` returns **one file**: `frontend/lib/format-utils.ts` itself (excluded by the gate). No violations.
- Clarification: `toLocaleDateString` and `toLocaleString` calls found in other files are outside the gate's scope and are not violations.

#### §6.3 — 26 hand-rolled empty states migrated onto EmptyState; gate check:empty-states PASS
**VERDICT: VERIFIED DONE**
- Gate script: `frontend/scripts/check-no-handrolled-empty-states.mjs` exists with 8 documented exceptions, each with a written reason. Self-test is present and non-trivial. The fixture test exercises the detection pattern.
- `EmptyState` is used across well over 80 files in the frontend tree (large count confirmed by grep).

#### §6.5 — 4 unused files + 49 unused exports + 21 unused types confirmed or removed; knip used
**VERDICT: VERIFIED DONE (with build-proof gap noted)**
- L52 report records knip run in both repos. Frontend: 0 unused files (down from 4 — earlier lanes removed them). 
- One backend deletion made: `backend/src/modules/email/templates/calendar.ts` — confirmed absent (glob returns nothing).
- **Gap:** L52 explicitly states "Build verification for the one removal was not separately run because the accounting errors mask results." The checked item requires "a passing `nest build` / `next build` afterwards" (see §2.6 below for the crossover). This applies to the same deletion.

---

### Open items (`[ ]`) — 22 items, classified

#### ALREADY DONE (source evidence)

| Item | Evidence |
|---|---|
| §1.4 — Unknown routes fail closed | `enforceRouteAccess` (`lib/rbac/route-access/enforce-route-access.ts:34`) redirects `kind === "unknown"` to `/access-denied`. `route-access-coverage.test.ts:19` asserts `resolveRouteAccess("/not-a-real-surface").kind === "unknown"`. |
| §2.5 — proxy.ts is the routing layer; middleware.ts deleted | `frontend/proxy.ts` exists. `frontend/middleware.ts` does not exist. No JWT-claim-based redirects in proxy.ts (grep confirms no `resolveWizardGate` or JWT reads there). |
| §2.6 — Middleware is not authorization (CVE-2025-29927) | No `middleware.ts` exists. Data-layer enforcement is through `enforceRouteAccess` and `requirePermission`, both server-side. |
| §4.2 — Billing routes canonical | `/billing/page.tsx` is deleted. `/settings/billing/page.tsx` and `/settings/billing/ai-credits/page.tsx` exist. `/settings/subscription` does not exist. `/billing/invoices` remains (correct per spec). |
| §4.3 — /calendar is the one unified calendar | Only `app/(authenticated)/calendar/{page,loading,error}.tsx` exist. No module-specific calendar pages found. |
| §4.4 — /projects redirects to /build | `app/(authenticated)/projects/` does not exist. No redirect file — correct per CLAUDE.md §8 ("delete the old route files — no legacy redirects"). |
| §6.2 — Replace 4 useEffect-driven public reads with Query hooks | Item notes "gate check:effect-fetches PASS (L33-report) — remaining useEffect reads are not public-data fetches." Gate script `frontend/scripts/check-no-effect-fetches.mjs` exists. Gate passes per L33-report. No remaining violations. |
| §9 — ai-credits.ts hook gating gaps | `frontend/hooks/api/ai-credits.ts:90,95`: `useAiCreditsWallet` — `enabled: useCan("billing:ai-credits:view")`. Line 107, 118: `useAiCreditTransactions` — same gate. Line 172, 178: `useAiCreditsUsage` — same gate. All three hooks cited in the item are gated. |

#### GENUINELY OPEN

| Item | Real work + rough size |
|---|---|
| §1.1 — Layout classification table | Survey of all 14+ layouts with enforced/needs-enforcement/universal verdict not written. **Gap found:** `app/(authenticated)/accounting/layout.tsx` uses legacy `requirePermission("accounting:read", { redirectTo: "/dashboard" })` instead of `enforceRouteAccess`. All other 13 top-level layouts call `enforceRouteAccess`. Sub-layouts (support/settings, accounting/settings, hr/settings, crm/settings) have no auth call — they rely on the parent. Table: 1 day. |
| §1.2 — Apply enforceRouteAccess to remaining layouts | `accounting/layout.tsx` is the one confirmed gap (1-line change). |
| §1.3 — Route-gate tests for every protected descendant | `universal-route-matrix.test.ts` has 50 specific cases. "Every protected descendant" is not a representative sample — full coverage is unverified. Medium: 2–3 days. |
| §2.1 — Reduce 342/598 client-component pages | No evidence this was addressed. `check:client-pages` gate exists but cannot be run without a build. Large: multi-day effort. |
| §2.2 — Remove unnecessary page-level `use client` | Subset of §2.1. |
| §2.3 — Loading and error boundaries for high-traffic routes | Unverified; no report addresses it. |
| §2.4 — keep check:query-scope green | Ongoing maintenance item; script exists at `frontend/scripts/check-query-scope.mjs`. |
| §3.3 — Module surfaces not gated on global settings:* key | Navigation registry audit not done. |
| §3.4 — Never render a link ending at Access Denied | Inaccessible-parent → accessible-child promotion not verified. |
| §3.5 — Home holds universal work only | No audit of home navigation content. |
| §4.1 — Module config in /<module>/settings/*; global admin in /settings/* | Route ownership audit incomplete. |
| §4.5 — Delete old routes when page moves (ongoing) | For routes beyond /projects that have moved. |
| §4.6 — Delete legacy Settings routes reported by S01 | Awaiting S01 completion. |
| §5.1 — Split oversized route files | `workflows/page.tsx` (543), `accounting/budgets/[budgetId]/page.tsx` (526), `auth/invitation/[token]/page.tsx` (522), `employee-onboarding/page.tsx` (504) not split. |
| §5.2 — Pages compose; they do not implement | No page extractions verified. |
| §6.4 — Replace raw fetch with typed API clients | Unverified. |
| §6.5 — Scope browser storage keys | Unverified. |
| §7 — States, responsiveness, accessibility | Not verified for completeness across all pages. |
| §8 — Frontend lint (scoped, ≤60 paths) | Not run (correct per trap guidance — 25+ min full run, kills at 356 paths). |

---

## S10 — Excluded Domains & Final Gates

### Checked items (`[x]`) — 8 total

#### §2.1 — Run knip in both repos; baseline backend 0 / frontend 5
**VERDICT: VERIFIED DONE**
- L52 report records the run. Backend output: 20 unused files (12 schema KEEP, 4 untracked WIP, 4 deferred). Frontend: 4 → 0 unused files.

#### §2.2 — Confirm or remove frontend 4 unused files / 49 exports / 21 types
**VERDICT: VERIFIED DONE**
- L52 report: 0 unused frontend files confirmed. Exports and types retained with recorded justifications.

#### §2.3 — grep is not proof (acknowledged)
**VERDICT: VERIFIED DONE**
- L52 report explicitly applies this principle; knip used for module-graph analysis.

#### §2.4 — Knip alone never authorizes deleting a schema file
**VERDICT: VERIFIED DONE**
- L52 report retained all 12 backend schema files with reasons. `hrms-phase1-sql-managed.ts` barrel is correctly classified as a deliberate holding design.

#### §2.5 — Emptiness is not deadness
**VERDICT: VERIFIED DONE**
- L52 report applied this principle; no tables were deleted on emptiness grounds.

#### §2.6 — Every deletion needs module-graph proof + build proof
**VERDICT: NOT ACTUALLY DONE**
- L52 report records 1 deletion (`email/templates/calendar.ts`). Module-graph proof via knip and grep: present. But L52 explicitly states: "Build verification for the one removal was not separately run because the accounting errors mask results." The item requires "a passing `nest build` / `next build` afterwards." The build was not run. This gap does not change the correctness of the deletion (zero importers confirmed), but the checkbox requirement is not met.
- Source verification: `backend/src/modules/email/templates/calendar.ts` — confirmed absent (glob returns nothing).

#### §2.7 — Never prune the build directory
**VERDICT: VERIFIED DONE**
- L52 report: "no files deleted from `build/**`". The `build/` module tree is untouched.

#### §2.8 — Record every deletion with proof in report
**VERDICT: VERIFIED DONE**
- L52 report records the one deletion with grep proof and knip module-graph evidence.

---

### Open items (`[ ]`) — 6 items, classified

#### PARTIALLY DONE (substantial work present, gate not at zero)

| Item | Current state |
|---|---|
| §1 — Bucket B06 (Inventory, 45 services) | 6 isolation spec files exist: `inv-orders-isolation`, `inv-quality-counts-reports-isolation`, `webhook-emitter-tenant-isolation`, `inv-products-warehouses-vendors-isolation`, `inv-stock-shipments-returns-isolation`, `inv-engine-misc-isolation`. L85 report (2026-08-30) repaired the last 3 suites (66 tests passing). L82 report fixed accounting isolation. Isolation gate moved 20% → 93% per L81. The 7% gap (~54 services) remains but is not known to concentrate in Inventory. |
| §1 — Bucket B07 (CRM 33 + Leads 11 + Deals 9 + Clients 4 + Contacts 1 + Sales 3 + Party 4 + Careers 1 + Customer-Executive 1 = 66 services) | Isolation spec files confirmed for all sub-modules: CRM (7 files including crm-core-a/b, crm-consent-pricebooks, crm-automation-studio, crm-import-inbox, crm-metadata, crm-connector), Leads (8 files), Deals (5 files), Clients (1), Contacts (1), Sales (1), Party (1), Careers (1), Customer-Executive (1). L81 report verified crm-core-a, crm-import-inbox, crm-metadata as solid. L84 report fixed crm-connector and several other spec files. L81 also fixed `careers-tenant-isolation.spec.ts` (was vacuous). Gate at 93% (not zero uncovered). |

#### GENUINELY OPEN

| Item | Real work + rough size |
|---|---|
| §3 — Final verification matrix (`FINAL-VERIFICATION.md`) | File does not exist. Requires running every gate listed in the matrix table and recording verbatim output. Cannot be done until all other sessions have reported. Large: requires full suite run + operator evidence. |
| §3 — Shard the test suite if workers get killed | Not run. Instruction exists in ticket but no evidence of execution. |
| §3 — Rate limits and DEV_LIMIT_MULTIPLIER noted where applicable | Not documented in any report. |
| §4 — Consolidated programme report (all S0X-report.md → one verdict) | `architecture-refactor/session-tickets/reports/S10-report.md` does not exist. All S0X session reports are missing (no S09-report.md either). Large: requires reading all Lxx lane reports and synthesising. |

---

## Verdict Counts

### S09 checked items
- VERIFIED DONE: 5
- NOT ACTUALLY DONE: 1 (§6.5 — build proof gap on email/templates/calendar.ts deletion)

### S09 open items
- ALREADY DONE: 8
- GENUINELY OPEN: 14

### S10 checked items
- VERIFIED DONE: 7
- NOT ACTUALLY DONE: 1 (§2.6 — same build proof gap)

### S10 open items
- PARTIALLY DONE: 2 (B06 Inventory, B07 CRM+related — substantial isolation specs exist, gate at 93% not 100%)
- GENUINELY OPEN: 4

---

## ALREADY DONE rows (exact item text)

**S09:**
1. "Unknown routes fail closed." (§1.4)
2. "`proxy.ts` is the routing layer (`middleware.ts` is deprecated in Next 16 and was deleted — never recreate it). It must never redirect on JWT claims; `resolveWizardGate` is the single wizard-gate authority, or you get `ERR_TOO_MANY_REDIRECTS` the moment the two disagree." (§2.5)
3. "**Middleware is not authorization** (CVE-2025-29927) — re-verify at the data layer." (§2.6)
4. "Platform billing is exactly `/settings/billing` and `/settings/billing/ai-credits`. `/billing`, `/billing/ai-credits`, `/settings/subscription`, `/billing/seats` are deleted — never resurrect them. `/billing/invoices` stays (Accounting's customer invoicing)." (§4.2)
5. "`/calendar` is the one unified calendar — never module-specific calendar pages." (§4.3)
6. "`/projects` redirects to `/build`." (§4.4) — implemented as deletion with no legacy redirect, per CLAUDE.md §8.
7. "Replace the **4 `useEffect`-driven public reads** with Query hooks." (§6.2) — gate passes per L33-report note in the ticket; remaining useEffect reads are not public-data fetches.
8. "`frontend/hooks/api/ai-credits.ts` — `useAiCreditsWallet`, `useAiCreditTransactions` and `useAiCreditsUsage` lack `enabled: useCan("billing:ai-credits:view")` and fire 403s for unpermitted roles." (§9) — all three hooks now gated.

---

## Key findings not in a verdict box

1. **accounting/layout.tsx uses legacy `requirePermission` not `enforceRouteAccess`.** All other 13 authenticated top-level layouts have migrated. This is a concrete 1-file gap in §1.2.

2. **Universal-route-matrix has 50 rows, not 57.** Previous report overcounted. The test gate says `>40` so it passes, but documentation is wrong.

3. **PAGES.md does not exist.** Root CLAUDE.md §1.7 and §11 require it to be updated after every fix. No owner is enforcing this.

4. **Isolation gate is at ~93%, not zero uncovered.** L81 confirms 817/783-ish services covered after the batch commit. L83/L84/L85 reduced failures further but the gate is not at the "zero uncovered" required by S10 §3.

5. **Build was not run after the email/templates/calendar.ts deletion.** The proof chain is complete except for the final build gate. Low-risk because zero importers were confirmed, but the checkbox says "build afterwards."
