# S03 — Repository quality and release verification

## Objective

Remove only proven dead or duplicated surface, resolve mixed-responsibility size violations, reconcile API/UI contracts, and produce one reproducible release verification record. This ticket excludes CRM and Inventory and must not change the public landing page.

## Work

- [x] Run the full dead-code/dependency analysis in a quiescent checkout. No dead files/exports or unclassified candidates remain; CRM and Inventory remain excluded.
- [x] Re-scan backend capability versus frontend routes. Every current live gap is either covered or explicitly deferred with a named product owner and review date.
- [x] Remove dead cache-key factories and duplicated helpers only after call-graph proof; four unused cache-key factories were removed and 177 cache/invalidation tests pass.
- [x] Run the hard file-size gate. `pnpm -C backend check:file-sizes` passes: 3,392 files scanned, all within 500 lines, with 12 documented cohesive/CLI/catalog exceptions. Public facades were split from the two large implementations without behavior changes.
- [x] Run backend build typecheck, backend spec typecheck, frontend typecheck, import-cycle, file-size, dead-code, tenant-isolation, route classification, permission catalog, module gate/DI, cache invalidation, outbox consumer, feature-flag, idempotency and mock-surface gates; all current scoped runs pass.
- [x] Regenerate and validate OpenAPI at the current workspace: 3,583 operations, exposure-stamped, with exact request/response/error/path coverage; freshness passes.
- [ ] Run representative disposable-database E2E for organization/RBAC, HRMS, Payroll, Build, Billing, Accounting, Chat, Calendar, Notifications, Knowledge, Workflows and Inbox/mail. Security-critical behavior may not be replaced by contradictory stubs.
- [ ] Run provider/cache outage and replay scenarios: duplicate, delayed, out-of-order and forged payment webhooks; proration/seat placement failure; Ably/email/push outage; Redis loss; retry, cancellation, DLQ and recovery.
- [ ] Run authenticated accessibility/SEO tests and visual checks at 375/768/1280 px in light, dark and system themes. Keep the design-token lint gate.
- [ ] Preserve landing visuals and animations. Record the mobile landing INP result under the agreed throttle and obtain a dated product acceptance if the frozen animation budget prevents the target.
- [ ] Verify upload malware scanning/quarantine, retention and authorized release behavior.

## Exit criteria

- [ ] All listed static, type, contract and architecture gates pass at one commit.
- [ ] Full representative E2E and outage/replay matrices pass with environment identity and command output.
- [ ] No unowned API/UI capability or proven dead surface remains.
- [x] No unjustified hard-size violation remains; the current hard-size gate passes with all 12 exceptions documented.
- [ ] No unresolved code-level P0/P1 finding remains.

## Audit evidence — 2026-09-01

Completed gates:

- [x] Frontend type-check, cycle, query-scope, route-access contract, contract drift, module-manifest, dead-code classification, SEO metadata, color-token and icon-label gates pass.
- [x] Backend file-size, migration chain/ledger/discipline/rollback, OpenAPI coverage, operation-ID, permission-key, owner-authority, scope-application, record-access, module-gate/DI, route-classification, navigation-permission, tenant-index, cache-invalidation, outbox-consumer, idempotency, feature-flag, mock-surface and drop-column gates pass.
- [x] OpenAPI structural coverage is exact at 3,583/3,583 operations and 1,363/1,363 mutating request bodies.
- [x] Frontend dependency analysis finds 0 dead files, 0 dead exports and 0 unclassified candidates.

Failing or incomplete gates:

- [x] Backend build and spec-inclusive typechecks pass at the current workspace; the previously reported 177/260 errors are no longer reproducible.
- [x] Payroll import-cycle scan passes; no circular dependency is reported.
- [x] Backend tenant-isolation coverage and its self-test pass; 897/897 tenant-owned services are covered. The live focused cross-tenant execution remains part of the environment matrix.
- [x] HR membership FK restriction gate passes: 343 schema files scanned.
- [x] `frontend/app/(authenticated)/hr/benefits/page.tsx` is 51 lines and the >300-line ratchet is 519/4,862, equal to baseline.
- [x] Reconciled the current 22 WIRE entries as explicitly owned `DEFERRED` capabilities with a 2026-10-01 product review date; the dead-code gate reports 0 WIRE, 0 DEAD, and 0 UNCLASSIFIED entries. No unowned gap is hidden.
- [ ] `.browser-driver-results.json` exists, but the recorded local desktop/mobile runs breach the declared web-vitals budgets; production/reference-device evidence or dated product acceptance is still required.
- [x] OpenAPI generation and freshness pass at 3,583 operations, representative smoke E2E passes, and upload-security tests pass; focused webhook/replay (136), billing/proration/seat (90), accessibility (128), and upload (21) test cases pass. Full outage/replay, viewport visual, and quarantine-release matrices remain environment-dependent.

## Execution record — 2026-09-01 (local workspace)

The following evidence was refreshed after the original audit text was written:

- `pnpm -C backend build`, `typecheck`, `check:spec-typecheck`, `check:cycles`, `check:tenant-isolation`, `check:restrict-fks`, and OpenAPI generation completed successfully. The generated contract contains 3,583 operations; the freshness check was rerun after generation.
- `pnpm -C frontend type-check`, `check:dead-code`, and `check:over-300` pass. The current ratchet is 519 files over 300 lines, and the 22 live capability gaps are now explicitly `DEFERRED` with a named product owner and 2026-10-01 review date in `frontend/scripts/check-dead-code.mjs`; no WIRE, DEAD, or UNCLASSIFIED entries remain. CRM and Inventory remain excluded.
- Representative `pnpm -C backend e2e:smoke` completed with 30 PASS, 5 expected FORBID, 0 FAIL, 0 NOT-FOUND, 0 UNAUTHENTICATED, and 2 allowed onboarding warnings.
- Full `pnpm -C backend test:e2e:seeded` was attempted against the configured database: 5 suites failed, 81 tests passed, and 16 failed. CRM failures are excluded from S03; the remaining seeded failures are blocked by missing organization placement/control-plane state and a seeded harness/schema mismatch, so the full matrix is not marked complete.
- Focused outage/replay verification passed 16 suites with 172 passed, 3 skipped, and 0 failed, covering duplicate/forged webhooks, provider/database/notification failures, Redis fallback, retry exhaustion, cancellation, and replay paths. The live provider/cache matrix remains open because the external outage environments are unavailable.
- Upload security verification passed: `av-scan.spec.ts` and `storage-av-gate.spec.ts` passed 21 tests.
- The AV seam now fails closed in production when no scanner is configured; the post-change AV/storage gate passed 22 tests. Quarantine lifecycle implementation is still absent and remains open.
- `pnpm -C backend browser:measure` generated `.browser-driver-results.json` for desktop and mobile at 375/390-style throttled browser conditions. `pnpm -C frontend check:web-vitals-budget` reports 7 breaches on this local development workload (mobile LCP/INP/FCP/TTFB; desktop INP/FCP/TTFB); the frozen landing visuals and animations were not changed. This item remains open pending an agreed production/reference-device run or dated product acceptance.
- `pnpm -C backend failure-drill:self-test` and `pnpm -C frontend check:web-vitals-budget:self-test` pass. Live provider/cache outage, replay, accessibility/theme, and malware quarantine-release matrices still require their declared disposable or provider environments.
- The hard-size follow-up pass reports `3,392 files scanned — all within 500 lines (12 exceptions registered)`. Cache-key collision/dimension/invalidation tests pass (177), webhook/provider replay tests pass (136), billing/proration/seat tests pass (90), and frontend authenticated accessibility tests pass (128).

The checklist remains intentionally open where evidence is a breach, environment-dependent, or not yet a complete matrix; passing a static self-test is not recorded as passing its live release criterion.
