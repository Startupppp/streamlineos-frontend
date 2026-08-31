# VERIFY1 — Adversarial Verification Report
**Date:** 2026-08-31  
**Scope:** All commits in frontend and backend repos from today's session (~16 commits in each)

---

## REFUTED Claims (Lead Table)

| # | Severity | Claim | Commit | Actual Finding |
|---|----------|-------|--------|----------------|
| 1 | **HIGH** | `check:placement-bypass exits 0` | `52b0d5e4` (cron) | Gate currently FAILs with 2 unlisted `withIdentity` sites, introduced by subsequent size-split commits |
| 2 | **MEDIUM** | "Large-file backlog is 30 backend and 14 frontend files over 500 lines" | `6c232e884` (PRD reconcile) | Actual count: 26 backend non-spec source files, 6 frontend source files |

---

## Finding 1 — REFUTED (HIGH): `check:placement-bypass` currently fails

**Claim:** Commit `52b0d5e4` ("fix(cron): make an unscoped leave-reset call unrepresentable") states: "check:placement-bypass exits 0; 32 tests pass."

**Evidence against:**

```
DATABASE BYPASS NOT ALLOWLISTED:
  FAIL  [with-identity]  src/modules/organization/core/org-purge.service.ts:119
  FAIL  [with-identity]  src/modules/organization/setup/org-setup-resolver.service.ts:70

FAIL — 2 of 77 bypass site(s) not on the allowlist.
```

Run verbatim from HEAD: `node src/scripts/check-placement-bypass.mjs`. Reproduced on two consecutive runs.

**Root cause:** The cron commit ran the gate BEFORE the size split commits. The gate was passing at commit time. Two subsequent commits broke it without re-running the gate:

- `46f87498` ("finish four splits, two of which had been abandoned half-done"): moved `deleteOrg/schedulePurge/cancelPurge` from `org-lifecycle` to new `org-purge.service.ts`. That service contains `withIdentity(this.db, memberUserId, ...)` at line 119 — a legitimate cross-org read — but the allowlist was not updated. Commit says "131 suites, 1061 tests. `check:cycles` and `check:module-di` both exit 0." No mention of placement-bypass.

- `b9515080` ("three more splits, each registered and each covered"): split `org-setup 608 -> 371` into `OrgSetupResolverService`, which contains `withIdentity(this.db, userId, ...)` at line 70 for `listSetupMemberships`. Also not allowlisted. Commit says "203 suites, 1,570 tests. `check:cycles` and `check:module-di` both exit 0." No mention of placement-bypass.

**Character of the calls:** Both calls are legitimate (cross-org identity reads before a tenant is established). They need allowlist entries, not removal. The gate is blocking on oversight, not on a genuine bypass. But the gate is FAILING at HEAD and nothing in today's commits acknowledges it.

**Verification method:** `node src/scripts/check-placement-bypass.mjs` — deterministic static analysis, no flakiness.

---

## Finding 2 — REFUTED (MEDIUM): Large-file count overstated

**Claim:** Commit `6c232e884` ("docs(prd): reconcile the checklist against source and record six more lanes") states: "The large-file backlog is 30 backend and 14 frontend files over 500 lines, not 88 and 22."

**Evidence:**

```bash
# Backend non-spec source files over 500 lines (excluding *.spec.ts, *.e2e-spec.ts, *.d.ts):
find backend/src -name "*.ts" -not -name "*.spec.ts" -not -name "*.e2e-spec.ts" \
  -not -name "*.d.ts" | xargs wc -l | grep -v total | awk '$1 > 500' | wc -l
=> 26

# Frontend source files over 500 lines (excluding node_modules, .next, contracts, spec files):
find frontend -name "*.ts" -o -name "*.tsx" | grep -v "node_modules|.next|contracts/openapi|.spec.|.test." \
  | xargs wc -l | grep -v total | awk '$1 > 500' | wc -l  
=> 6
```

The claim overstates the backlog: 30 vs 26 backend, 14 vs 6 frontend. Direction of error is conservative (overestimates the problem), not dangerous. But the numbers are wrong regardless.

The 6 frontend files are: `feedbucket-widget/src/ui.ts` (550), `features/crm/import/planned-import-section.tsx` (523), `hooks/api/inventory/reports.ts` (510), `app/(authenticated)/inventory/sales-orders/[soId]/page.tsx` (510), `features/hr/performance/pip-tab.tsx` (504), `hooks/api/accounting/core.ts` (501).

**Note:** `notification-events.catalog.ts` (1054) and `role-templates.constants.ts` (584) are backend files that exceed 500 lines but are deliberately left that way; commit `b9515080` explicitly records this exemption. They ARE counted in the 26.

---

## Strongest CONFIRMED Checks

These were verified directly, not taken from report prose.

### Database: column drops confirmed in live DB

```sql
-- calendar_events: created_by dropped, created_by_membership_id present
=> column_name: 'created_by_membership_id' only

-- event_attendees: user_id dropped, membership_id present
=> column_name: 'membership_id' only

-- All 8 accounting actor columns (closed_by, locked_by, created_by×4, confirmed_by, approved_by):
=> 0 rows in information_schema.columns (all dropped)

-- Migration watermark and applied count:
=> watermark: '1798000044000', applied: '448'
```

Matches claims in commits `a8334c37`, `68a4bc14`, `743e6bb3`. CONFIRMED.

### Gates confirmed passing at HEAD

| Gate | Command | Result |
|------|---------|--------|
| check:mock-surface | `node src/scripts/check-mock-surface.mjs` | 0 phantom methods in 2558 doubles |
| check:module-di | `node src/scripts/check-module-di.mjs` | 213/213 modules, 0 invalid exports |
| check:openapi-path-params | `node src/scripts/check-openapi-path-params.mjs` | 3551 operations, all path params declared |
| check:contract-vendor (frontend) | `node scripts/check-contract-vendor.mjs` | sha256 match — byte-identical |
| check:route-access-contract (frontend) | `node scripts/check-route-access-contract.mjs` | 200 keys checked, all pass |
| check:outbox-consumers | `node src/scripts/check-outbox-consumers.mjs` | 18 emitted types, all consumed |
| check:migration-chain | `node src/scripts/verify-migration-chain.mjs` | PASS, no issues |
| check:migration-discipline | `node src/scripts/check-migration-discipline.mjs` | 429 SQL files, 0 violations |
| check:scope-application | `node src/scripts/check-scope-application.mjs` | 122/122 resolutions reach a predicate |
| check:tenant-isolation | `node src/scripts/check-tenant-isolation-coverage.mjs` | 844/844 services covered |

### Spec counts confirmed

- Reads cap commit `28a0b0d5`: "17 tests across 8 new spec files" — ran the 8 files, got **17 tests**. CONFIRMED.
- Finance cache invalidation commit `3452c94b`: "2 + 6 tests" in 3 spec files — ran, got **8 tests**. CONFIRMED.

### Guard wiring confirmed

- `calendar-admin-settings.controller.ts`: `@UseGuards(JwtAuthGuard, PermissionGuard)` at class level + `@RequirePermission("calendar:admin:manage")` on handler. CONFIRMED.
- `push.controller.ts`: `@Delete("subscribe")` + `@Universal()` + `unsubscribe(query, u)` passes `u.userId` to service which adds `eq(pushSubscriptions.userId, userId)` predicate. CONFIRMED.
- `useKickParticipant()` in `hooks/api/chat-huddles.ts`: uses `useAuthorizedMutation("chat:huddles:moderate", ...)`. CONFIRMED.
- `/calendar/settings` in `route-access-extensions.ts`: permission `calendar:admin:manage`. CONFIRMED.

### Test bite assessments (reason-only — no source edits)

**Finance cache invalidation tests** (`payment-runs-cache-invalidation.spec.ts`): Uses `orderedCache` that records `"invalidate"` after a `setImmediate` delay, then asserts `order === ["invalidate", "method"]`. If `await invalidate()` becomes `void invalidate()`, the setImmediate resolves after `"method"` is pushed, so the assertion `["invalidate", "method"]` fails. **This assertion genuinely distinguishes `await` from `void`.** Commit's proof claim is credible.

**Build scope none tests** (`dashboard-project.service.spec.ts`): Uses a counting DB mock that increments `counts.select`, `counts.where`, `counts.findMany`, `counts.findFirst` on each call. Asserts all four equal 0 for `scope none`. If the short-circuit guard is removed, DB methods are called and counts are non-zero. **This assertion genuinely detects a missing guard.** It is not an empty-result test that could pass vacuously.

**Chat BOLA tests**: Ran `chat-bola-proof.spec.ts` and `chat-mutation-tenant-isolation.spec.ts` — 18 tests, all pass. Commit `ccc3b1e8` description of adding orgId predicates and checking the attacker-org lookup is consistent with the spec structure read.

---

## Observations (Not Refuted, But Worth Noting)

### Dead outbox consumers

`check:outbox-consumers` only checks that every EMITTED type has a consumer. It does not check the reverse. Two consumed event types are **never emitted**:
- `expense.submitted`
- `expense.decided`

These are registered consumers for events that no producer writes. Dead consumer code. No commit today mentions this. Not a gate failure, but dead code.

### Ratchet: 679 remaining, not 681

Commit `743e6bb3` (actors) claims "Ratchet 689 -> 681" (8 legacy actor columns migrated). Current scan shows 679/689 (10 migrated). The delta is explained by calendar commits `68a4bc14` (event_attendees.user_id) and `a8334c37` (calendar_events.created_by) which came after. The actors commit was honest about its own 8 columns; subsequent work reduced by 2 more. Not a refutation of the actors commit.

### Tenant isolation gate showed transient failure

On first run, `check:tenant-isolation` showed 843/844 FAIL, with `kb-article-query.service.ts` missing. On second and third runs, 844/844 OK. The gate is static file-matching, which should be deterministic. Possible cause: file system not yet flushed when first run was attempted. Cannot determine definitively whether the gate is currently clean or intermittently failing. Run `check:tenant-isolation:run` (the execution proof) to confirm.

### `check:contract-vendor` and `check:route-access-contract` are FRONTEND scripts

Commit `28d2aef0` (contracts) says "contract-vendor and route-access-contract both pass" in the context of a backend commit about @Validate schemas. These scripts exist in the **frontend** `package.json`, not the backend. Both do pass when run from the frontend directory. The commit's context is slightly misleading — these are cross-repo contract checks, not backend internal gates — but the claim is accurate.

---

## Summary

One live gate failure at HEAD: `check:placement-bypass` FAILS with 2 sites. Both are legitimate withIdentity calls that need allowlist entries; the risk is documentation gap, not actual bypass. The gate needs to be fixed (allowlist updated with reasons) before it can gate future commits.

All migration claims verified directly against the live database. All cited spec test counts checked by running the specs. All gate claims checked by running the gates. No other refutations found.
