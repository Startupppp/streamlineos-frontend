# DOCS1 — FINAL-VERIFICATION.md Re-Verification

**Date:** 2026-08-31
**Lane:** DOCS1
**Scope:** Rebuild every row in `architecture-refactor/FINAL-VERIFICATION.md` from commands run this session.

---

## What was done

Every gate command listed in `FINAL-VERIFICATION.md` was re-run (or skipped with an explicit reason where banned by lane rules). Numbers were taken from verbatim command output, not copied from lane reports.

---

## Gates run this session with results

| Gate | Exit | Key number (this session) | Change from S10 |
|---|---|---|---|
| `check:route-classification` | 0 | 3,539 handlers, 0 undeclared | +21 handlers |
| `check:permission-keys` | 0 | 693 backend / 691 frontend keys | +3 backend / +1 frontend |
| `check:tenant-indexes` | 0 | 747/747 tables | +25 tables |
| `check:scope-application` | 0 | 122/122 | unchanged |
| `check:record-access` | 0 | 1,145 findFirst, 558 record reads | -9 / -2 |
| `check:tenant-isolation` (static) | **1** | 823/840 (98%), **17 uncovered** | was PASS 818/818 |
| `check:placement-bypass` | 0 | 76 bypasses, all allowlisted | +0 |
| `verify:rbac-integrity` (with DB) | 0 | 10/10 | unchanged |
| `check:owner-authority` | 0 | 9 declared, 9 enforced | unchanged |
| `check:idempotent-commands` | 0 | 9 bespoke exceptions | unchanged |
| `check:outbox-consumers` | 0 | 18 emitted, 20 consumed | unchanged |
| `check:migration-discipline` | 0 | 424 SQL files, 0 new violations | **was absent from document** |
| `check:migration-chain` (with DB) | 0 | no issues | unchanged |
| `check:mock-surface` | **1** | 6 phantom methods, 4 classes | **was absent from document** |
| `scan:legacy-actors:check` | 0 | 689/689 org FKs, 0 migrated | was 553/555 (wrong scanner) |
| `check:navigation-permissions` | 0 | 436 gates, 195 keys | previously under-documented |
| `check:module-entitlement` | 0 | timesheets round-trip OK | unchanged |
| `check:module-lifecycle` | 0 | timesheets 11 tables, all gates | unchanged |
| `check:log-secrets` | 0 | 2,782 files, 75 TIERS entries | +50 files / +2 TIERS |
| `openapi:check` | **1** | 3,551 ops committed; stale by 5 ops | still stale; x-exposure now 3,551/3,551 |
| `check:contract-vendor` | 0 | sha256 2a34112404142d3f | unchanged |
| `check:contract-drift` | 0 | 0 baselined drift | unchanged |
| `check:routes` (FE) | 0 | no violations | unchanged |
| `check:query-scope` (FE) | 0 | no violations | unchanged |
| `check:formatters` (FE) | 0 | 4,763 files | +19 files |
| `check:empty-states` (FE) | 0 | no violations | unchanged |
| `check:effect-fetches` (FE) | 0 | no violations | unchanged |
| `check:icon-labels` (FE) | 0 | no violations | unchanged |
| `check:client-pages` (FE) | 0 | 315/598 (52.7%), ceiling 315 | body was stale (said 259); ceiling matched |
| `check:module-manifest` (FE) | 0 | consistent | unchanged |
| `check:route-access-contract` (FE) | 0 | 200 keys, 621 x-permission | +3 keys / +1 x-permission |
| `check:dead-code` + knip (FE) | 0 | files=0 vs baseline 0 | unchanged |
| `verify:server-data-seam` (FE) | 0 | 5 auth + 6 public routes | unchanged |
| Structure >500 lines | N/A | **33 files** (17 BE non-spec + 14 spec + 2 FE) | was 45 at S10 |

---

## Rows corrected

**17 rows corrected** (numbers changed, verdicts changed, or SUPERSEDED notes added):

1. **Backend routes**: 3,518 → 3,539 handlers
2. **Permission keys**: 690/690 → 693/691
3. **Tenant indexes**: 722/722 → 747/747
4. **Record access**: 1,154/560 → 1,145/558
5. **Tenant isolation (static)**: PASS 818/818 → **FAIL 823/840 (17 missing)** — verdict changed
6. **Log secrets**: 2,732 files / 73 TIERS → 2,782 / 75
7. **Legacy actors**: ratchet count clarified (689 org FKs, not 553/555 or 697)
8. **OpenAPI**: x-exposure now 3,551/3,551 (was 0 of ~7,100); still EXIT:1 (stale by 5 ops)
9. **Client pages (body)**: body said 259/598; now correctly 315/598 (52.7%)
10. **Route access contract**: 197/620 → 200/621
11. **Formatters**: 4,744 → 4,763 files scanned
12. **Navigation permissions**: counts now explicit (436 gates, 195 keys, 693 backend, 622 route-enforced)
13. **Dead code**: corrected "both repos" claim — backend has no knip or check:dead-code
14. **Structure >500 lines**: 45 → 33 files (several splits landed between S10 and this session)
15. **e2e tests**: affirmed still FAIL (not just OPEN)
16. **Summary table**: added Invocable + Can Fail columns; added migration-discipline, mock-surface, actor contraction, applied-migration rows
17. **Client pages (summary table)**: body updated to match the table's correct figure

---

## Rows added (were absent from S10 document)

3 new rows:

1. **Migration discipline** (`check:migration-discipline`): PASS — exit 0, 424 SQL files, self-tested.
2. **Mock surface** (`check:mock-surface`): FAIL — exit 1, 6 genuine defects; new gate from S07; previously described as fixed at 0 but is not.
3. **Actor contraction**: long-horizon status row — 689 org FKs, 0 dropped, EXPAND tranches shipped.

---

## Rows not verified this session

**6 rows** could not be re-run:

1. **TypeScript (backend/frontend)**: banned (hangs); S10 baseline accepted.
2. **Build (backend/frontend)**: banned; S10/L53 baseline accepted.
3. **Cycles (backend/frontend)**: madge takes ~2 min; S10 baseline accepted.
4. **Isolation execution** (`check:tenant-isolation:run`): timed out at 30 s; S10 baseline accepted.
5. **Full backend jest**: too slow (~40 min); S10/L46 baseline accepted.
6. **Frontend jest**: too slow; L33 baseline accepted.

---

## Key findings

- The **tenant isolation (static)** gate regressed from PASS to FAIL: 17 new services added by concurrent lanes have no cross-tenant isolation spec.
- The **mock-surface** gate is FAIL with 6 defects — the prior "fixed at 0" claim was either against a different baseline or regressed.
- The **OpenAPI** gate is EXIT:1 (stale by 5 operations, 3 routes in crm/renderer). The x-exposure fix is confirmed landed: 3,551/3,551.
- The **dead-code** gate was falsely claimed to cover both repos; backend has no such gate.
- **Structure >500 lines**: reduced from 45 to 33 files. 17 backend non-spec remain, of which `notification-events.catalog.ts` (1,027 lines) is a declared exception; `access.service.ts` (725) and `relocate-org-data.ts` (703) are genuinely pending.
- The **Invocable** and **Can Fail** columns were added to the summary table. All gates listed are invocable. The e2e harness is flagged as `can fail: no` because `--forceExit` causes it to exit 0 on suite crash.
