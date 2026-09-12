# Overall release integration

Run these tasks only after their dependencies land. The release coordinator owns this file.

## REL-001 — Run one clean commit-pair release suite
Status: FINAL-INTEGRATION
Maps to: PRD-C018, PRD-C190, PRD-C191
Parallel group: 4
Depends on: ARCH-002, ARCH-003, CHAT-002, CHAT-003, BUILD-002, DOC-002, RBAC-001, RBAC-004
Owner: release coordinator

Scope: Run backend and frontend typecheck/build, unit and focused integration suites, architecture gates, contracts, migrations, and dead-code checks at one recorded root/backend pair.

Completion: A single release record captures revisions, commands, exit codes, totals, environment, and artifacts; all required checks are green.

### Release ordering is a hard constraint — API first, then the web app

Decided 2026-09-12 by the release owner. This is a deployment requirement, not a
recommendation, and REL-001 does not pass without it stated in the runbook.

Frontend response contracts require their fields as **non-optional**. Deploying the
web app ahead of an API that predates a field therefore takes the whole route down
through its error boundary — not a degraded value, the entire screen. Worked example,
observed live in a browser on 2026-09-12 against a compiled `backend/dist` that
predated one field: `GET /billing/plans` returned **200**, the client contract rejected
it (`plans.N.annualTotalPaise: expected number, received undefined`), `ApiContractError`
propagated, and `app/(authenticated)/settings/billing/error.tsx` rendered "Billing
Error — Failed to load billing data." Backend *source* had the field; only the built
artifact did not. This is the same failure class the retained `/billing`
`platformCheckout` incident records.

Contract strictness is deliberately **retained**: it is what surfaced both incidents.
The cost is paid in deploy order instead.

Two consequences for acceptance:
- A browser capture or screenshot sweep of any route is void unless both artifacts are
  newer than the source they were built from. The failure renders as a populated error
  page, so a sweep records it as the route's real state.
- A green `next build` does not prove every route emitted its client reference manifest.
  A build over a polluted `.next` exited 0, wrote a `BUILD_ID`, and still left
  `/settings/billing/ai-credits` and `/settings/roles/simulate` returning 500 with
  `InvariantError: The client reference manifest for route "<route>" does not exist`.
  Only `rm -rf .next` plus a full rebuild cleared it, and it surfaces only when the
  route is actually requested. Smoke-request representative routes before accepting a
  build as capture-ready.

Completed lane prerequisites are linked from their owning lanes: ARCH-001, CHAT-001,
CHAT-004, BUILD-001, DOC-001, DOC-003, RBAC-003, RBAC-005 and ARCH-004. Only unresolved prerequisites appear above.

Current integration work (2026-09-10): the production build exposed three empty
installed transitive package directories (`jsdom`, `keyv`, `rimraf`). A frozen-lockfile
forced reinstall restored them; package/lock hashes are unchanged and two subsequent
production builds passed. No SSR or sanitization bypass was introduced. The stale
GDPR dead-code WIRE entry is resolved:
the producer now checks its emitted payload against the existing schema-derived
type; consumer validation and tenant binding remain covered by 20 passing tests.

Additional current-source gate repairs are in scope here: register the two existing
membership-write detector floors without changing their values or violation policy;
remove in-scope unchecked assertions and stale exception entries; add the missing
bounded lock timeout to the newly appended placement-policy migration without
changing its policy. CRM/Inventory implementation remains outside the approved PRD.

Historical integration defect (2026-09-11): HR compatibility DELETE routes called
removed hierarchy methods; a real-prototype probe reproduced TypeErrors while mocks
missed them. Current 2026-09-12 source recheck finds those DELETE handlers and
`deleteLocation`/`deleteTeam` callers removed from `hr/core/hr-org-structure-compat.controller.ts`
and `hr-org-catalog.service.ts`. Do not restore deletion or repeat the old repair.
Final HTTP/OpenAPI compatibility and integrated type gates remain REL-001 acceptance;
source retirement alone is not deployed-route proof.

Current reconciliation: all recovery lanes still have residual work in the index.
REL-001 also depends on their unchecked customer-flow/security/schema/cache/UX gates,
not only the older stable IDs above. Frontend query-scope passes; request-params,
file-size/growth and bundle provenance fail in the current targeted recheck.
Earlier integration passes below are historical and must not override these results.

### Current integration evidence — 2026-09-10

Updated with the final local 2026-09-11 refactor verification below; the heading
anchor is retained for existing lane links.

Environment: Windows, Node 24.15.0, repository-selected pnpm 10.18.0, local unit and
mocked HTTP fixtures. The supplied `architecture-review-20260909-233230.html` describes
Virabha, not this repository; the companion `architecture-review-20260909-233331.html`
and the indexed StreamlineOS lanes were checked against current source.

These are working-tree measurements, not a clean release certification. Existing
backend package/lock changes, an independently added placement migration/journal,
and concurrent organization, onboarding, DTO and frontend auth/cache changes were
preserved and were not swept into these commits. No deployment, provider delivery,
production data mutation, or human approval was performed.

| Verification | Actual result / limit |
| --- | --- |
| Backend full unit run and correction | Original run: 2,206 suites / 19,113 tests passed, one Windows-only controller-discovery suite failed to load. Node filesystem traversal replaced Unix `find`; its 6 tests then passed. Final delta run: 3 suites / 33 tests passed (controller discovery, signing durability, Support ownership). No second 20-minute full backend run is claimed |
| Frontend full unit runs | Final post-refactor run: 489/489 suites and 5,136/5,136 tests passed, zero skipped/TODO, exit 0 (252.532 s). Earlier runs caught aggregate-registry imports and two invalid test-query options; both defects were corrected before final verification |
| Final Build cache/factory/mutation selection | 3 suites / 27 tests passed, including 10 cross-tab cases and actual custom-field/value/automation hooks |
| Documents/e-sign acceptance | 143 backend suites / 1,107 tests and 17 frontend suites / 139 tests passed; see owning lane for DB exclusions |
| Support automation ownership and actions | 8 backend suites / 115 tests; frontend create/edit trigger alignment 2 tests; all passed |
| Post-extraction regression selections | KB 50 suites / 419 tests; Chat/automation/workflows 63 / 630; payroll 4 / 22; frontend 6 / 38; all passed. Separate selections may overlap earlier module totals |
| AI HTTP and tenant-probe integrity | Final mocked HTTP 23/23 passed; FK design-only checks 4/4 and guard/helper tests pass. Selected real-DB FK probe refuses unconfigured execution; its guarded implementation is not SQL acceptance |
| Authorization benchmark integrity | 31 statistics/outcome tests and three cold-path probes pass; wall-only and invalid measurements now exit nonzero. No latency benchmark capture was run |
| Final frontend build/typecheck | Strict source-plus-test program passed; production build passed with 466 generated pages. All 6,114 source/config fingerprints remained unchanged throughout the build and full Jest run: SHA-256 `1246c740948168ad4b9912f7964993f4af66af3dc54ad4bc6ead86167a27d0ba` |
| Backend source/test typechecks | Earlier isolated Nest build and spec-inclusive typecheck passed. Final strict recheck failed with nine errors in concurrent HR/onboarding work; seven constructor sites were corrected by that session. Final isolated production Nest build exits 1 with exactly two errors: `hr-org-catalog.service.ts:55` / `:177` call removed `deleteLocation` / `deleteTeam` methods. No final clean backend typecheck/build is claimed |
| Backend architecture/security gates | Post-extraction scope boundary, tenant declarations, projections, cache invalidation, import direction and dead code: exit 0. 944/944 tenant services declared, 71 global services; declaration is not runtime coverage. Temporary concurrent HR dead exports disappeared before the coordinator's final dead-code pass |
| Tenant foreign keys | Seven redundant source references removed; static analysis now zero actionable findings but intentionally exit 2 without DB proof. Detector self-test passes |
| Migration discipline / immutability | 709 SQL files, zero new discipline violations; 685 sealed entries unchanged in behavior, 24 appended. Exit 0; no migrations applied by this verification |
| Baseline integrity | Exit 0; existing membership detector floors 500/8 registered unchanged, 28 self-tests pass; no debt allowance raised |
| Backend assertion gate | Exit 1 only for four existing assertions in excluded CRM leads files. In-scope fixes verified, stale entries removed; no exceptions added |
| Frontend assertion / scope / size / handler gates | Exit 0; stale assertion allowance lowered 2 → 1. CRM/Inventory/public-landing exclusions remain visible |
| File-growth budgets | Backend 389 files above 300 lines against unchanged 390 ceiling; frontend 513 against unchanged 513. All in-scope 500-line hard caps pass. Ten backend and four frontend cohesive extractions; no whitespace compression or raised allowance |
| Test integrity | Suppression and vacuity gates exit 0 with registered residuals, not zero debt: 19 conditional sites, 10 placeholders, 6 quarantines and 6 registered assertion exceptions. EARLY_RETURN ratchet lowered 5 → 4; conditional ratchet 20 → 19 |
| API/contracts | Earlier route classification, catalog/vendor drift, response parsing, request parameters, scope, access routing, query signals and registry checks passed. Concurrent hierarchy route removals and DTO changes require a new final drift/contract pass; earlier results are not certification of those newer changes |
| Final dependency cycles | Backend 6,519 files / 59 resolution warnings; frontend 6,003 files. Both exit 0 with zero cycles; frontend feature graph also acyclic (42 features / 16 edges) |
| Browser/performance | Browser list empty. Web Vitals gate rejects old capture/provenance (exit 1); no current mobile INP or responsive acceptance certified |
| Database prerequisite | Read-only scratch preflight observed 573/708 migrations before the new 709th migration arrived. Not a current-head database; no DB acceptance certified |

Run commands are the named scripts in each package: `check:scope-boundary`,
`check:tenant-isolation`, `check:query-projections`, `check:cache-invalidation`,
`check:route-classification`, `check:dead-code`, `check:migration-discipline`,
`check:migration-immutability`, `check:baseline-integrity`, `check:type-assertions`,
`check:test-suppressions`, `check:vacuous-assertions`, and their documented self-tests.
Tenant source analysis specifically used `node src/scripts/check-tenant-relationships.mjs --static-only`.
Focused commands and fixture boundaries are linked from the Build, Chat, Documents
and RBAC lanes. Successful checks do not waive the unresolved dependencies above.

The original full backend JSON has **46 skipped tests and one TODO**: 21 excluded CRM
quarantine cases, nine real-model evals, 15 database/provider degradation checks,
and one tenant-FK placeholder. The TODO is excluded CRM last-touch attribution
integration. Since that run the false-green tenant-FK placeholder was removed in
favor of the explicitly selected, guarded real-DB probe, and all three AI-project
HTTP TODOs were implemented and verified separately (23/23). The final remaining
ten placeholder entries were individually audited; none is counted as a pass.

#### Remaining placeholder inventory (2026-09-11)

| Area | Count | Actual missing work / prerequisite |
| --- | --- | --- |
| AI wallet refund / expired reservation sweep | 2 | Real-service persisted refund, owner-scope and partial-write rollback probes remain unwritten. A provider-isolated seeded harness exists; it needs an approved current-schema disposable DB. Sweep atomicity is per tenant, not global |
| Email outbox persistence / ordering | 3 | Real publisher retry, dead-letter/committed-request and delivery-ordering probes remain unwritten. A local fault server can simulate provider 503; independent transactions require an approved disposable DB |
| Object storage / scanner lifecycle | 2 | Upload/metadata retry and real scan-confirmation probes remain unwritten. Local R2 settings exist but are unverified; an authorized disposable storage/DB target and a real scanner are required |
| Physical read replica | 1 | No configured physical replica; primary-DB snapshot tests do not prove replication behavior |
| Ably reconnect / history | 1 | Local Ably settings exist but are unverified; the real subscription/history probe and approved test channels/watermark fixtures are missing |
| CRM last-touch attribution | 1 | Integration fixture remains unwritten; CRM is excluded from this release |

These map to the existing OPS-001/003, DOC-004 and RBAC-001 acceptance work rather
than a second hidden backlog. Eight stale blocker explanations were corrected in
the source tests and suppression ledger without enabling or deleting a skipped
test. Suppression detector self-tests: 20/20; isolated non-live degradation selection:
five suites, 51 passed, 15 skipped/filtered (66 total), exit 0. Credentials being
configured does not authorize provider writes or establish their validity.

Saved implementation checkpoints before this final record: root/frontend `6cb5469ea`
(six commits in this audit), backend `6edcc1389` (eleven commits). This record is the
next root checkpoint. All agent-owned source changes are committed; the other
session's changes remain intact and outside these commits. The observed build/test
results apply to the shared working tree, not an isolated clean commit pair.
Release verdict: **NO-GO / not 100% complete** until the legacy HR contract conflict
and all remaining indexed acceptance/deployment/approval work are resolved.

## REL-002 — Reconcile backlog and publish the release verdict
Status: FINAL-INTEGRATION
Maps to: PRD-C017, PRD-C156, PRD-C193, PRD-C194, PRD-C195
Parallel group: 5
Depends on: REL-001, BILL-002, DOC-004, OPS-004, RBAC-002
Owner: release coordinator

Scope: Remove completed tasks from active lanes, link their durable evidence, enumerate external exceptions, and issue the final go/no-go decision.

Completion: The traceability gate passes, the active backlog contains only unresolved work, and the signed verdict names all accepted residual risks.
