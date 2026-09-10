# Overall release integration

Run these tasks only after their dependencies land. The release coordinator owns this file.

## REL-001 — Run one clean commit-pair release suite
Status: FINAL-INTEGRATION
Maps to: PRD-C018, PRD-C190, PRD-C191
Parallel group: 4
Depends on: ARCH-002, CHAT-002, CHAT-003, BUILD-002, DOC-002, RBAC-001, RBAC-004
Owner: release coordinator

Scope: Run backend and frontend typecheck/build, unit and focused integration suites, architecture gates, contracts, migrations, and dead-code checks at one recorded root/backend pair.

Completion: A single release record captures revisions, commands, exit codes, totals, environment, and artifacts; all required checks are green.

Completed lane prerequisites are linked from their owning lanes: ARCH-001, CHAT-001,
CHAT-004, BUILD-001, DOC-001 and DOC-003. Only unresolved prerequisites appear above.

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

### Current integration evidence — 2026-09-10

Environment: Windows, Node 24.15.0, repository-selected pnpm 10.18.0, local unit and
mocked HTTP fixtures. The supplied `architecture-review-20260909-233230.html` describes
Virabha, not this repository; the companion `architecture-review-20260909-233331.html`
and the indexed StreamlineOS lanes were checked against current source.

These are working-tree measurements, not a clean release certification. Existing
backend package/lock changes, an independently added placement migration/journal,
and a frontend theme-script change were preserved. No deployment, provider delivery,
production data mutation, or human approval was performed.

| Verification | Actual result / limit |
| --- | --- |
| Backend full unit run and correction | Original run: 2,206 suites / 19,113 tests passed, one Windows-only controller-discovery suite failed to load. Node filesystem traversal replaced Unix `find`; its 6 tests then passed. Final delta run: 3 suites / 33 tests passed (controller discovery, signing durability, Support ownership). No second 20-minute full backend run is claimed |
| Frontend full unit runs | Final corrected-source run: 486/486 suites and 5,123/5,123 tests passed, exit 0 (266.306 s). Earlier expanded run caught two aggregate-registry imports; both moved to the existing Build-owned registry before this clean full rerun |
| Final Build cache/factory/mutation selection | 3 suites / 27 tests passed, including 10 cross-tab cases and actual custom-field/value/automation hooks |
| Documents/e-sign acceptance | 143 backend suites / 1,107 tests and 17 frontend suites / 139 tests passed; see owning lane for DB exclusions |
| Support automation ownership and actions | 8 backend suites / 115 tests; frontend create/edit trigger alignment 2 tests; all passed |
| Source/test typechecks | Backend production Nest build passed with isolated output (user's running development output preserved); initial spec-inclusive typecheck passed, final new tests pending strict recheck |
| Backend architecture/security gates | Scope boundary, tenant-isolation declaration, projections, cache invalidation, route classification and dead code: exit 0. 943/943 tenant services declared, 71 correctly classified global services; declaration is not runtime coverage |
| Tenant foreign keys | Seven redundant source references removed; static analysis now zero actionable findings but intentionally exit 2 without DB proof. Detector self-test passes |
| Migration discipline / immutability | 709 SQL files, zero new discipline violations; 685 sealed entries unchanged in behavior, 24 appended. Exit 0; no migrations applied by this verification |
| Baseline integrity | Exit 0; existing membership detector floors 500/8 registered unchanged, 28 self-tests pass; no debt allowance raised |
| Backend assertion gate | Exit 1 only for four existing assertions in excluded CRM leads files. In-scope fixes verified, stale entries removed; no exceptions added |
| Frontend assertion / scope / size / handler gates | Exit 0; stale assertion allowance lowered 2 → 1. CRM/Inventory/public-landing exclusions remain visible |
| Test integrity | Suppression and vacuity gates exit 0 with registered residuals, not zero debt: 20 conditional sites, 13 placeholders, 6 quarantines and 7 registered assertion exceptions |
| API/contracts | Route classification, catalog/vendor drift, response parsing, request parameters, scope, access routing, query signals and contract registry checks passed; registered coverage gaps remain explicit |
| Final dependency cycles | Backend 6,494 files / 59 resolution warnings; frontend 5,996 files / 20 warnings. Both exit 0 with zero cycles |
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

The full backend JSON has **46 skipped tests and one TODO**: 21 excluded CRM
quarantine cases, nine real-model evals, 15 database/provider degradation checks,
and one tenant-FK placeholder. The TODO is excluded CRM last-touch attribution
integration. Three AI-project HTTP TODOs are outside that default Jest selection;
they are being checked separately. These are not counted as passing tests.

## REL-002 — Reconcile backlog and publish the release verdict
Status: FINAL-INTEGRATION
Maps to: PRD-C017, PRD-C156, PRD-C193, PRD-C194, PRD-C195
Parallel group: 5
Depends on: REL-001, BILL-002, DOC-004, OPS-004, RBAC-002
Owner: release coordinator

Scope: Remove completed tasks from active lanes, link their durable evidence, enumerate external exceptions, and issue the final go/no-go decision.

Completion: The traceability gate passes, the active backlog contains only unresolved work, and the signed verdict names all accepted residual risks.
