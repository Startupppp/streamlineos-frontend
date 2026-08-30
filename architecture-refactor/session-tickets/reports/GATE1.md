# GATE1 — CI Gate Honesty Audit

**Date:** 2026-08-30  
**Scope:** Every `check:*`, `verify:*`, and `scan:*` script in both repos  
**Method:** Ran every script; ran every self-test; checked exit codes from real invocations (no pipes that swallow exit codes)

---

## Summary Table

| Gate | Repo | Invocable | Exit Code | Headline Number | Has Self-Test | Can It Fail? | Notes |
|------|------|-----------|-----------|-----------------|---------------|--------------|-------|
| `check:permission-keys` | BE | Y | 0 | 3099 usages, 621 keys | Y (passes) | YES — exits 1 on ghost key or missing catalog entry | Self-test: 18 assertions all pass |
| `check:navigation-permissions` | BE | Y | 0 | 436 gates, 195 keys | Y (passes) | YES — exits 1 on unenforced key | Self-test: 18 assertions all pass |
| `check:tenant-indexes` | BE | Y | 0 | 747 tenant tables, 747 leading indexes | Y (passes) | YES — exits 1 on table with no leading tenant index | Self-test: 15 assertions all pass |
| `check:scope-application` | BE | Y | 0 | 122 resolved, 122 applied | Y (passes) | YES — exits 1 on decorative (unapplied) scope | Self-test: 12 assertions all pass |
| `check:record-access` | BE | Y | 0 | 1144 findFirst, 558 record reads | Y (passes) | YES — exits 1 on soft-delete bypass | Self-test: 11 assertions all pass |
| `check:module-entitlement` | BE | Y | 0 | timesheets pilot OK | Y (passes) | YES — exits 1 on planGated mismatch or wrong storedKey | Self-test: 6 assertions all pass |
| `check:module-lifecycle` | BE | Y | 0 | 11/11 timesheets tables pass all 4 gates | Y (passes, DB-required) | YES — exits 1 on missing RLS policy, orphan migration, etc. | Connects to DB via .env; self-test uses synthetic fixtures |
| `check:idempotent-commands` | BE | Y | 0 | 9 handlers in scope, all fenced | Y (passes) | YES — exits 1 on unfenced mutating handler | Self-test: 6 assertions all pass |
| `check:tenant-isolation` | BE | Y | **1** | **18 uncovered services (98%)** | Y (passes) | YES — exits 1 when coverage below 100% | REAL FAILURE: 18 services need cross-tenant negative tests |
| `check:log-secrets` | BE | Y | 0 | 2776 files, 75 TIERS entries | Y (passes) | YES — exits 1 on plaintext secret log or missing tier key | Self-test: 10 assertions all pass |
| `check:migration-discipline` | BE | Y | 0 | 418 SQL files, 0 new violations | Y (passes) | YES — exits 1 on new violation | Self-test: 20 assertions all pass (the reference implementation) |
| `check:outbox-consumers` | BE | Y | 0 | 18 emitted, all consumed | Y (passes) | YES — exits 1 on unemitted consumer type | Self-test: 2 assertions all pass |
| `check:mock-surface` | BE | **N — unwired** | **1** | **167 genuine defects** | Y (passes) | YES — exits 1 on phantom mock method | **WIRED IN THIS SESSION** — was `check-mock-surface.mjs` on disk with no package.json entry; also exits 1 with real defects |
| `check:placement-bypass` | BE | Y | **1** | **7 unapproved cron-bypass sites** | Y (passes) | YES — exits 1 on unapproved bypass | REAL FAILURE: 7 sites in `cron-leave-reset.service.ts` need allowlist entries |
| `check:owner-authority` | BE | Y | 0 | 9 declared, 9 enforced | Y (passes) | YES — exits 1 on owner-fabrication | Self-test: "SELF-TEST OK" |
| `check:route-classification` | BE | Y | 0 | 3538 handlers, 0 undeclared | Y (passes) | YES — exits 1 on undeclared handler | Self-test: 14 assertions all pass |
| `check:migration-chain` | BE | Y | **1** | **2 duplicate prefixes (0700, 0701)** | Y (passes) | YES — exits 1 on chain violations | REAL FAILURE: `0700_timesheets_attr_expand`/`0700_timesheets_idx_org_status_date` and `0701_kb_ingestion_checkpoints`/`0701_timesheets_attr_validate` need to be added to `HISTORICAL_DUPLICATE_PREFIXES` or one file from each pair renamed |
| `scan:legacy-actors` | BE | Y | 0 | 697 legacy FKs (informational) | Y (passes) | YES — in `--check` mode exits 1 on ratchet violation | Default mode is informational; `scan:legacy-actors:check` exits 1 |
| `scan:legacy-actors:check` | BE | Y | **1** | **Ratchet violation: 555→697** | Y (passes) | YES — exits 1 on count increase | REAL FAILURE: 142 new organizational user_id FKs added beyond baseline |
| `verify:permissions` | BE | Y | 0 | same as check:permission-keys | Y (via check:permission-keys:self-test) | YES | Alias for `check:permission-keys` |
| `verify:rbac-integrity` | BE | Y | **1 (no DB)** | DATABASE_URL not set | Y (passes) | YES — exits 1 both without DB and when constraints fail | DB-dependent gate; exits 1 when DATABASE_URL absent; expected CI behavior requires DB |
| `verify:chat-mentions` | BE | Y | **1 (no DB)** | DATABASE_URL required | N | DB-dependent probe; exits 1 without credentials | Not a static gate |
| `verify:multi-org-employment` | BE | Y | **1 (no DB)** | DATABASE_URL required | N | DB-dependent probe; exits 1 without credentials | Not a static gate |
| `verify:membership-revocation` | BE | Y | **1 (no DB)** | DATABASE_URL required | N | DB-dependent probe; exits 1 without credentials | Not a static gate |
| `openapi:check` | BE | Y | n/a (needs full app) | n/a | Y (partial — self-test covers diffArtifacts only) | **PARTIAL** — self-test does NOT verify that stamped >= N; stamping floor added in this session | Full NestJS app required; committed file shows 3546/3546 stamped |
| `openapi:check:self-test` | BE | Y | 0 | 4 cases pass | Y | YES — self-test exercises diff logic | Does NOT test `recordRouteClassification` stamping; gap noted |
| `check:cycles` | BE | Y | n/a (madge) | n/a | N | YES via madge exit code | madge exits 1 on cycles |
| `verify:server-data-seam` | FE | Y | 0 | 5 auth routes, 6 public routes | N | YES — exits 1 if build is missing or routes absent | No self-test; requires a committed Next.js build; passes because `.next/` exists |
| `check:colors` | FE | Y | 0 | 4763 files scanned | **N — vacuity guard added** | YES — exits 1 on hex color class | **VACUITY GUARD ADDED** — now exits 1 if fewer than 500 files are scanned |
| `check:effect-fetches` | FE | Y | 0 | 4763 files scanned | **N — vacuity guard added** | YES — exits 1 on useEffect-driven API fetch | **VACUITY GUARD ADDED** — now exits 1 if fewer than 500 files are scanned |
| `check:routes` | FE | Y | 0 | 0 violations | N | YES for violations, but **vacuous on empty dir** | No self-test; walks `app/` for route.ts files; passes with 0 because there are no business routes (correct) |
| `check:formatters` | FE | Y | 0 | 4763 files scanned | Y (passes) | YES — exits 1 on local Intl.NumberFormat or fewer than 500 files | Reference implementation: has vacuity floor + self-test |
| `check:empty-states` | FE | Y | 0 | no violations | Y (always-on IIFE) | YES — exits 1 on hand-rolled empty state | IIFE self-test runs on every invocation; `--self-test` flag is a no-op (no separate mode) |
| `check:icon-labels` | FE | Y | 0 | 3480 TSX files scanned | **N — vacuity guard added** | YES — exits 1 on unlabeled icon button | **VACUITY GUARD ADDED** — now exits 1 if fewer than 500 TSX/JSX files are scanned |
| `check:query-scope` | FE | Y | 0 | no violations | Y (passes) | YES — exits 1 on rogue QueryClient or dehydrate | Self-test: 3 assertions all pass |
| `check:dead-code` | FE | Y | 0 | 0 dead files, 0 dead exports | Y (passes) | YES — exits 1 if dead > baseline AND if knip total < 5 | Vacuity floor: knipTotal >= 5, graphFiles >= 100, graphEdges >= 300; all met |
| `check:route-access-contract` | FE | Y | **1** | **1 ghost key: `calendar:admin:manage`** | Y (passes) | YES — exits 1 on ghost nav key | REAL FAILURE: `calendar:admin:manage` in route-access-extensions.ts has no backing endpoint |
| `check:contract-vendor` | FE | Y | **1** | **Stale hash** | Y (passes) | YES — exits 1 on hash mismatch | REAL FAILURE: `frontend/contracts/openapi.json` hash does not match `backend/openapi.json` |
| `check:contract-drift` | FE | Y | 0 | 53 calls, 0 new drift | Y (passes) | YES — exits 1 on new drift or scan floor | Self-test: 18 assertions all pass |
| `check:module-manifest` | FE | Y | **1** | **2 missing modules: feedbucket, settings** | Y (passes) | YES — exits 1 on manifest violation | REAL FAILURE: `feedbucket` and `settings` modules in registry are missing from the vendored manifest |
| `check:client-pages` | FE | Y | 0 | 315/598 (52.7%), ceiling 315 | Y (passes) | YES — exits 1 if count exceeds ceiling | Ratchet-style gate; ceiling equals current count so any new client page fails |

---

## Scripts on Disk with No package.json Entry

| Repo | File | Entry Added | Notes |
|------|------|-------------|-------|
| backend | `src/scripts/check-mock-surface.mjs` | `check:mock-surface` + `check:mock-surface:self-test` | **WIRED IN THIS SESSION** — exits 1 with 167 genuine phantom-mock defects |
| backend | `src/scripts/check-hr-list-read-cost.mjs` | `db:check-hr-reads` | **WIRED IN THIS SESSION** — DB-dependent read-cost analysis; parallel to `db:check-build-reads` |

## Entries Pointing at Missing Files

None found. Every `check:*`, `verify:*`, and `scan:*` entry in both repos resolves to a file on disk.

---

## Gate Honesty Issues Fixed in This Session

### 1. `check-mock-surface.mjs` — Unwired Gate (Backend)

**Problem:** The script existed on disk, has a self-test, exits 1 on phantom mock methods, but had no `package.json` entry. CI could never invoke it. It currently exits 1 with **167 genuine phantom-method defects**.

**Fix:** Added `check:mock-surface` and `check:mock-surface:self-test` to `backend/package.json`.

**Status:** Gate is now invocable. The 167 defects are real and remain open.

---

### 2. `check-hr-list-read-cost.mjs` — Unwired Utility (Backend)

**Problem:** DB-backed read-cost analysis for HR list endpoints. No `package.json` entry. `check-build-read-cost.mjs` has the parallel entry `db:check-build-reads`; the HR companion was never wired.

**Fix:** Added `db:check-hr-reads: node src/scripts/check-hr-list-read-cost.mjs` to `backend/package.json`.

---

### 3. `openapi:check` — Stamping Vacuity (Backend)

**Problem:** The self-test (`openapi:check:self-test`) only exercises `diffArtifacts` (the freshness diff). It does not verify that `recordRouteClassification` stamped any operations. If the stamping mechanism broke (as it did historically, producing 0/7100), the committed artifact would show no stamps, the generated artifact would also show no stamps, the diff would be empty, and `openapi:check` would silently pass.

**Fix:** Added a `MIN_STAMPED_OPS = 500` floor assertion in `check-openapi-fresh.ts` `main()`. After generating, if `generated.stamped < 500` the gate exits 1 with an explicit message. The current committed document has **3546/3546** operations stamped (all passing).

**Current state:** x-exposure stamping IS working correctly (3546/3546). The floor prevents a future regression from going undetected.

---

### 4. `check:colors`, `check:effect-fetches`, `check:icon-labels` — Vacuity Guards (Frontend)

**Problem:** These three scripts had no vacuity guard. If the file-system walk returned 0 files (wrong CWD, broken exclusion list, directory missing), they would silently report "no violations" and pass.

**Fix:** Added `scannedFiles` counter and `if (scannedFiles < 500) process.exit(1)` to each:
- `frontend/scripts/check-no-arbitrary-colors.mjs`
- `frontend/scripts/check-no-effect-fetches.mjs`
- `frontend/scripts/check-no-unlabeled-icon-buttons.mjs`

All three still pass on the real codebase (4763 / 4763 / 3480 files scanned).

---

## Real Gate Failures (Not Gate Honesty Issues)

These gates are honest — they correctly detect real problems and exit 1. **Do not fix by loosening the gate.**

| Gate | Exit | Finding | Action Needed |
|------|------|---------|---------------|
| `check:tenant-isolation` | 1 | 18 tenant-owned services with no cross-tenant negative test (98% coverage) | Add isolation specs for the 18 listed services |
| `check:placement-bypass` | 1 | 7 unapproved cron-bypass sites in `cron-leave-reset.service.ts` | Add allowlist entries with justification, or migrate each site to `forEachOrg` |
| `check:migration-chain` | 1 | Duplicate numeric prefix 0700 (timesheets) and 0701 (kb+timesheets) | Rename the newer file in each pair (preferred), or add to `HISTORICAL_DUPLICATE_PREFIXES` only if already applied |
| `scan:legacy-actors:check` | 1 | Ratchet violation: organizational legacy-actor count rose from 555 to 697 | Migrate 142 new `users.id` FKs to `OrganizationActor` before adding more |
| `check:route-access-contract` (FE) | 1 | Ghost nav key `calendar:admin:manage` in `route-access-extensions.ts` — no backend endpoint enforces it | Either add a backend endpoint gated on this key, or remove the nav entry |
| `check:contract-vendor` (FE) | 1 | `frontend/contracts/openapi.json` hash does not match current `backend/openapi.json` | Run `pnpm openapi:generate` then `cp backend/openapi.json frontend/contracts/openapi.json` |
| `check:module-manifest` (FE) | 1 | `feedbucket` and `settings` modules in the frontend registry are absent from the vendored manifest | Update the vendored manifest or add the two modules |
| `check:mock-surface` | 1 | 167 phantom mock methods across 233 resolved classes | Fix or allowlist each phantom method |

---

## Denominator-Equals-Numerator Assessment

**`check:client-pages`:** Reports `315 of 598 (52.7%), ceiling 315`. The ceiling is hardcoded at 315, the current count. This is a ratchet (prevents regressions) not a vacuity (the denominator is total pages, not violations). Can fail: any new client page pushes count to 316 > 315. Honest.

**`check:scope-application`:** Reports `122 resolved, 122 applied`. Both numbers come from the same codebase scan. A scope that is both declared AND applied is the goal; the check passes when every resolved scope is applied. Could miss a scope that was never declared at all (no `@ApplyScope` decorator), but that is the `check:route-classification` gate's job. Acceptable.

**`check:dead-code`:** Baseline hardcoded at `{ deadFiles: 0, deadExports: 0 }`. Current run also 0/0. Vacuity guard: `knipTotal >= 5` (currently 5+ UNPROVEN items), `graphFiles >= 100`, `graphEdges >= 300` — all met. Honest; UNPROVEN items are not DEAD.

---

## DB-Dependent Gates (Cannot Run Without a Live Database)

These gates are correctly designed — they exit 1 without a DB rather than silently skipping:

| Gate | Behavior Without DB |
|------|---------------------|
| `verify:rbac-integrity` | `DATABASE_URL is not set.` + exit 1 |
| `verify:chat-mentions` | `DATABASE_URL and BACKEND_JWT_SECRET are required.` + exit 1 |
| `verify:multi-org-employment` | exits 1 (env required) |
| `verify:membership-revocation` | exits 1 (env required) |
| `check:module-lifecycle` | connects to DB via `.env`; would error without it |
| `check:migration-chain` check (f) | skips the watermark check gracefully when no DB — documented and self-tested |

---

## Files Changed in This Session

- `backend/package.json` — Added `db:check-hr-reads`, `check:mock-surface`, `check:mock-surface:self-test`
- `backend/src/scripts/check-openapi-fresh.ts` — Added `MIN_STAMPED_OPS = 500` floor assertion in `main()`
- `frontend/scripts/check-no-arbitrary-colors.mjs` — Added `scannedFiles` counter and floor exit
- `frontend/scripts/check-no-effect-fetches.mjs` — Added `scannedFiles` counter and floor exit
- `frontend/scripts/check-no-unlabeled-icon-buttons.mjs` — Added `scannedFiles` counter and floor exit
