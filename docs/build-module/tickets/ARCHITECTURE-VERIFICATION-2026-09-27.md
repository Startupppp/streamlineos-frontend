# Build architecture verification - 2026-09-27

## Scope and completion rule

Reviewed both original HTML reports, then audited their 68 associated Markdown tickets against
the current frontend/backend working trees with three disjoint read-only reviewers. This is a
documentation audit, not implementation, deployment or a whole-module release certification.

Originals read from `C:/Users/Aditya_Lappy/AppData/Local/Temp/`:

- `architecture-review-20260926-213335.html`: Architecture review - StreamlineOS Build module.
- `architecture-review-20260926-230544.html`: Build module - architecture review - 2026-09-26.

Source anchors at audit start: root `266330e77e5ba03936929c48ba70a91e73a8f1dc`, backend
`d72942d4fa2bba8706dec45396d61d136230692c`, plus pre-existing staged/unstaged changes. These
hashes do not identify a deployment or include all reviewed working-tree changes. Existing UI,
backend and Knowledge Base work was preserved. This audit edits Markdown only.

Owner's instruction: checked means implemented, verified and tested. Test existence is not a
test run. A passing mock is only evidence for the behavior it exercises. Database and browser
criteria need their own evidence. N/A is a decision, not completed functionality.

**Result after three-pass recheck: 2 of 68 tickets supported as complete within their stated
scope; 28 partial or awaiting verification; 38 open.** The two are 31 and 34. Before this audit,
15 ticket headers said done; thirteen were downgraded. This is not a percentage of the seven-phase product
plan, and does not imply only three features work. Many partial tickets contain real code.

## Ticket-by-ticket disposition

Paths below are repository-relative. Detailed reopened criteria and corrections live in each
numbered ticket; grouped file ownership in EXECUTION-PLAN remains scheduling guidance, not proof.
`core/`, `execution/` and `client-portal/` abbreviate `backend/src/modules/build/` subdirectories;
bare frontend filenames are resolved to their full paths in the corresponding numbered ticket.

| Ticket | Status | Evidence / remaining acceptance |
|---|---|---|
| 01 | Open | `backend/src/modules/build/approvals/approvals.service.ts:28` still deep-imports core; publish and enforce the interface. |
| 02 | Open | `core/projects-tickets.service.ts:81` and `projects-roadmap.service.ts:367` retain forwarding layers. |
| 03 | Open | Both phase-2 directories remain; QA contains live mapping code, not only guards. |
| 04 | Partial | Roadmap ordering helper wired; Date-encoded timestamp precision and real pagination proof remain. |
| 05 | Partial | Shorter count key tested; old `{}` key already matched. Actual mutation/count refresh is incomplete. |
| 06 | Partial | Enum derivation present; `request-approval-sheet.tsx:49,158` still lacks two selectable entity types. |
| 07 | Partial | Schema rejection tested; SUBTASK remains in automation/filter/AI choices; HTTP validation unverified. |
| 08 | Partial | Four component tests pass, but inherited-property action names crash the display-map lookup; new regression coverage required. |
| 09 | Partial | Server member search present; no picker cursor consumption or focused picker behavior evidence. |
| 10 | Partial | Assertion removed and gallery rendering tested; application compilation not run. Contract criterion was inapplicable to static fixtures. |
| 11 | Partial | Ticket response token exists; universal echo and sibling coverage absent. |
| 12 | Open | `dto/ticket.schemas.ts:174` still permits token omission; current-value conflict response incomplete. |
| 13 | Open | Six sibling update contracts still need verified tokens and conflict UX. |
| 14 | Partial | Shared predicate/call sites tested; correlated EXISTS/UNION is not the requested outer query rewrite. |
| 15 | Partial | Mention SQL function authored, still wildcard-based; journal, application, semantics and plan unverified. |
| 16 | Partial | Activity project column authored; reader already depends on it, journal/backfill/writer coverage incomplete. |
| 17 | Partial | Direct project predicate tested structurally; omitted writers can lose activity; index/results unverified. |
| 18 | Open | `core/project-access.ts:114` retains serial membership/team resolution and duplicate implementations. |
| 19 | Partial | Status affects velocity/burnup; critical path reads title/storyPoints, not the separate points field; rank changes updatedAt-dependent reports. |
| 20 | Partial | Broad invalidation narrowed; real helper still invalidates ticket collections and is mocked by the test. |
| 21 | Open | `frontend/features/build/backlog/project-backlog-page.tsx:4` retains aggregate hooks import. |
| 22 | Open | Same page imports the Build hooks barrel at line 5. |
| 23 | Open | `request-approval-sheet.tsx:41` remains a non-page barrel consumer. |
| 24 | Open | Existing aggregate-import gate covers query keys, not the proposed hooks rule. |
| 25 | Open | Ticket implementations remain flat in backend Build core. |
| 26 | Open | Roadmap/automation/work-query/project CRUD concept moves not present. |
| 27 | Open | Remaining groups still flat; no verified restructure/cycle check. |
| 28 | Open | No enforced core-public-surface boundary; sibling deep imports remain. |
| 29 | Open | Historical CCG-7 notes are not an exhaustive current transaction/call-path audit. |
| 30 | Open/unverified | No targeted migration found for the three RLS tables; live posture not queried. |
| 31 | Complete, decision scope | 410 tombstone decision recorded; frozen-sprint tests pass. No new production migration claim. |
| 32 | Open | `core/projects-reports.controller.ts:62` still exposes resource allocation. |
| 33 | Partial | Infinite scroll code present; wrong result type reproduces TS2339; real 101+ cycle scroll untested. |
| 34 | Complete, cleanup scope | Spec-owned disposition record; consolidation tests pass; live mapping behavior preserved. |
| 35 | Open | `client-portal/client-portal.service.ts:251` child reads lack required parent visibility. |
| 36 | Partial | Unjournalled trigger while app increments are removed; conditional trigger permits explicit token jumps. |
| 37 | Partial | Row-scale producer/remediation fragments exist; batch predicts version; tests do not invoke both producers. |
| 38 | Partial | Savepoints added at some sites; swallowed-write gate fails with six sites versus four allowed. |
| 39 | Open | Status group omitted from backend/frontend detail schemas; authored schema permits null, deployed catalog unverified. |
| 40 | Open | `frontend/scripts/contract-parity/schema-diff.mjs:86` still compares presence, not declared projection types. |
| 41 | Open | Canonical access helper and divergent read-service helper both survive. |
| 42 | Open | Work-query/scope-directory/entity reachability still independently constructed. |
| 43 | Open | Detail update still assembles mutation/effects; no applyTicketChange entry point. |
| 44 | Open | Rank/bulk remain direct writers with differing effects. |
| 45 | Open | No gate enforces mutation-module ownership; direct ticket writes remain across services. |
| 46 | Partial | Some contracts already support search; no verified end-to-end tracer closes the ticket. |
| 47 | Partial | Milestones forwards q; risks/forms/meetings still have loaded-page filtering. |
| 48 | Partial | Portfolios/all-work search exists; inventory/contract capability and remaining pages incomplete. |
| 49 | Open | No shared production row-taking list assembly found. |
| 50 | Open | Delivery pages such as epics still assemble their own list state. |
| 51 | Open | Governance pages remain independent; risks tests exist, contrary to the old no-tests premise. |
| 52 | Open | Settings views remains independently assembled. |
| 53 | Open | Org lists remain independent; old exact-500-lines/motive claim withdrawn. |
| 54 | Open | Managed-product/portal adoption and privacy-sensitive fixture parity unverified. |
| 55 | Open | Gallery reconstructs assembly; 4,149 authored lines across 12 gallery files remain. |
| 56 | Open | No list-surface adoption gate; define legitimate non-list exceptions before enforcement. |
| 57 | Open | Counter logic remains in internal and portal creation; shared lock-through-insert unverified. |
| 58 | Open | Transaction-callback gate judges whole files; passing self-tests do not fix cross-block masking. |
| 59 | Open | Census lacks verdict ratchet; enumerated plan subsets need floors, although seven required files are already checked. |
| 60 | Partial | Provider overrides exist; positive controller coverage/isolation still incomplete. |
| 61 | Open | Three BE-81 test labels overclaim substring/correlated-SQL assertions. |
| 62 | Partial | Constraint SQL exists, unjournalled; eight translation tests pass, lifecycle test fails; no DB race proof. |
| 63 | Partial, design revision | Blanket partial uniqueness confuses reusable names with durable/public identities; migration swap/rollback unsafe to assume. |
| 64 | Partial | NOT NULL SQL exists, unjournalled; deleted null-project rows invalidate the live-only survey. |
| 65 | Partial | SQL exists, unjournalled; Drizzle CHECK missing; DTO already rejects both/neither; no DB enforcement evidence. |
| 66 | Open | QA expansion and scope-event rename remain off-journal; cold replay/existing-schema compatibility unverified. |
| 67 | Partial | Valid-cursor fixture tests pass; malformed JSON/incomplete pairs restart, while invalid timestamp strings pass through instead of being rejected. |
| 68 | Partial | Root census pointer cleanup present, but canonical checker fails and retired-key records remain. |

## Architecture rulings and ordered follow-up

- [ ] **P0: schema/code deployment compatibility.** Journal and verify 1373, 1374, 1377 and 1378 before dependent code deploys. App increments were removed and activity/mention reads reference new objects. Absence from the journal is verified; absence from production is not. Read deployment/catalog evidence before any operational claim.
- [ ] **P0: authorization and portal privacy.** Complete 29/30/35 and 41/42. Keep child privacy flags and intersect them with parent visibility, grant, tenant/project and live-row checks. Do not infer a live cross-tenant breach merely from missing authored RLS DDL.
- [ ] **P0: transaction and event correctness.** Complete 36-38 before 11-13 and 43-45. Trigger owns the token; return the persisted version; cover pending timestamp-scale events and replay deduplication. Required audit/outbox effects must not be silently lost.
- [ ] **P1: repair current wrong answers.** Close 04-07, 09, 15-17, 19/20, 33, 39 and 67 with behavior-level tests, not matching mocks. Do not keep invalidation recipes that contradict actual report dependencies.
- [ ] **P1: database invariants.** Rework 63 by identity class; settle project-less semantics in 64; test 62/64/65 with application-role transactions, concurrent writers and cold replay. A planned journal entry is not an actual entry. No production DDL was executed here.
- [ ] **P1: scalable reads.** Complete 14/18/46-48 using bounded SQL/pagination and measured plans. Request-local access caching cannot coalesce two HTTP requests; avoid global permission caches and unbounded ID arrays. Track buffers, dataset size, query count, cache hits/misses and p95 duration under the application role.
- [ ] **P1: honest verification gates.** Repair the failing census and swallowed-write checks, then 40/58-61/68. Scope baselines by identity and add negative self-tests so omissions cannot make a gate greener.
- [ ] **P2: controlled reuse/restructure.** Keep 01-03/21-28/49-56 behind stable contracts. Preserve useful adapters; delete pure forwarding, not encapsulation. Pilot two compatible list pages, compose domain-specific controls, preserve primitive/query ownership, and do not force dashboards/editors/boards into one table configuration.
- [ ] **Release proof:** Browser verification remains separate and unchecked. Verify changed workflows through the UI after implementation/deployment; a source audit or component test is not browser evidence.

Decisions retained: organization tenancy with project/product scopes is not reopened here; keep
the useful sprint 410 tombstone; retain the resource-allocation retirement decision subject to
its existing caller/manifest checks; keep velocity infinite pagination under one query key with
pages/pageParams. File relocation alone is not encapsulation or a performance improvement.

Seven page C3 criteria were reopened: ticket detail, epics, cycles, releases, milestones, modules
and roadmap. Their concurrency exemption relied on the disproven CCG-1 premise. This does not
re-audit every unrelated acceptance box in all 83 page contracts. Historical release-table claims
are now explicitly qualified in RELEASE-STATUS.md.

## Executed checks

All commands were DB-free and focused. No full repository test/build, application typecheck,
browser run, migration application, rollback or production query was performed. The 23 Jest suite
executions yielded **211 passing test executions and one failure**, including a repeated run of
the nine-test assignee suite: these are not 211 distinct tests or a release pass.

From `frontend/`:

```powershell
node node_modules/jest/bin/jest.js --runInBand --no-cache --runTestsByPath lib/query-keys/build-work-column-counts.test.ts features/build/tickets/ticket-activity-log.test.tsx hooks/api/build/ticket-cache.test.ts hooks/api/build/project-rename-invalidation.test.ts features/build/reports/velocity-section.test.tsx
node node_modules/jest/bin/jest.js --runInBand --no-cache --runTestsByPath features/build/views/execution-core-gallery.test.tsx
node scripts/check-type-assertions.mjs --self-test
node scripts/check-type-assertions.mjs
```

First Jest command: 5 suites/22 tests pass. Gallery: 1 suite/2 tests pass. Assertion self-test:
48 checks pass. Actual assertion gate: FAIL (25 unledgered files, one grown entry, 27 stale
entries); no gallery offender. Passing self-tests do not clear the actual source findings.

From `backend/`:

```powershell
node node_modules/jest/bin/jest.js --runInBand --no-cache --runTestsByPath src/modules/build/core/s04-roadmap-pagination.spec.ts src/modules/build/core/dto/ticket-schema-bounds.spec.ts src/modules/build/core/assignee-filter.spec.ts src/modules/build/core/projects-activity-feed.isolation.spec.ts src/modules/build/phase-2/qa-bug-consolidation.spec.ts src/modules/build/execution/sprint-create-frozen.spec.ts
node node_modules/jest/bin/jest.js --runInBand --no-cache --runTestsByPath src/modules/build/core/ticket-status-event-version-scale.spec.ts src/modules/build/execution/epic-soft-delete-guard.spec.ts src/modules/build/core/assignee-filter.spec.ts
node node_modules/jest/bin/jest.js --runInBand --no-cache --runTestsByPath src/modules/build/core/projects-ticket-version-conflict.spec.ts
node node_modules/jest/bin/jest.js --runInBand --no-cache --coverage=false --runTestsByPath src/modules/build/execution/cycle-constraint-translation.spec.ts src/modules/build/execution/cycle-delete-lifecycle-invariant.spec.ts src/db/schema/build/soft-delete-partial-unique-indexes.spec.ts src/db/schema/build/ticket-project-id-not-null.spec.ts src/modules/goals/goal-links-constraint.spec.ts src/modules/notifications/unified-inbox-approval-ordering.spec.ts src/modules/build/core/lib/allocate-ticket-number.spec.ts
node scripts/build-authorization-census.mjs --check
node src/scripts/check-transaction-callbacks.mjs --self-test
node src/scripts/check-build-swallowed-writes.mjs --self-test
node src/scripts/check-build-swallowed-writes.mjs --list
```

Jest results respectively: 6 suites/128 pass; 3 suites/14 pass; 1 suite/3 pass;
6 suites pass/1 fails with 42 tests pass/1 fails. The failure is
`cycle-delete-lifecycle-invariant.spec.ts:73`, which incorrectly requires `id` in every unique
index and rejects the new live-only `(org_id, project_id)` index.

Census: FAIL, 139 stale REVIEWED anchors; current scan 54 controllers/343 handlers versus saved
49/325. Transaction callback self-tests: 27 pass. Swallowed-write self-tests: 6 pass. Its actual
source gate: FAIL, six findings against baseline four across 89 service files.

From repository root, `node scripts/check-build-execution-plan.mjs --self-test` passed. Only the
self-test ran, not the full execution-plan gate. Additional read-only in-memory probes confirmed:

- Installed TanStack `partialMatchKey` and QueryClient invalidation both match the old trailing `{}` against a filtered key.
- Journal entries 1371/1372/1373/1374/1377/1378/1380/1381 are absent; files or suggested JSON entries do not count as journalled.
- JavaScript Date truncates `.000900` to `.000`; skipped-row impact follows from the descending cursor predicate, not a live SQL test.
- Installed TanStack types reproduce TS2339 when `useInfiniteQuery` specifies `TData = Page` but its consumer reads `.pages`; the probe succeeding means it reproduced the error, not that the application typechecks.
- Four goal-link DTO cases pass: neither/both rejected, each single arm accepted. Database constraint enforcement was not tested by these assertions.

## Three-pass recheck requested by owner

Rechecked on 2026-09-27 against the live working tree. Root HEAD at recheck start was
`3722e603c26bc86501555d5ec7f454964ea3adb6`; backend HEAD moved from
`eeda40876e9b90dbb03a504a6a793b8e9351afa8` to `7e2e5f30e` during concurrent work.
These are source-context markers, not deployment identities or an immutable whole-repo snapshot.

### Pass 1 - Checked acceptance and tests

The three previously done tickets were re-read and their narrow suites rerun:

```powershell
# From frontend
node node_modules/jest/bin/jest.js --runInBand --no-cache --runTestsByPath features/build/tickets/ticket-activity-log.test.tsx
# From backend
node node_modules/jest/bin/jest.js --runInBand --no-cache --runTestsByPath src/modules/build/execution/sprint-create-frozen.spec.ts src/modules/build/phase-2/qa-bug-consolidation.spec.ts
```

All three suites passed: four frontend tests and 56 backend tests. These are additional
executions, not additions to the earlier distinct-test coverage. Nevertheless, a separate
in-memory rendering reproduction exposed ticket 08's `action in ACTION_ICONS` inherited-property
bug: an ordinary unknown action renders, but `__proto__` and `constructor` throw. The coordinator
independently reproduced both failures against the current transpiled component using real React
and Lucide with mocked hook data. A probe that expects these exceptions passing is evidence of
the defect, not application acceptance. No browser or response-parser behavior was exercised.

Ticket 08 is reopened. Tickets 31 and 34 remain complete only within their decision/cleanup
scope. Additional unsupported checked claims were reopened in 14 (row equivalence and drift
protection), 10 (unchanged visual rendering) and 20 (immediate detail/list cache update). Prior
ticket 10 assertion-gate evidence remains valid for that file, despite the whole gate failing.

### Pass 2 - Architecture and source accuracy

The journal was parsed again: all eight cited migration prefixes remain absent. This is not
proof of absence from a deployed database. The actual census check still reports 139 stale
anchors (54 controllers/343 handlers); the swallowed-write gate still finds six sites versus
four allowed. Existing blocking findings remain open.

Corrections to the earlier audit itself:

- `points` and `storyPoints` are distinct columns. Critical path/velocity/burnup read storyPoints; a normal points edit must not be assumed to mutate it. Rank changes updatedAt, which existing burnup fallback and cycle/lead-time calculations consume.
- Schema nullability is an authored-code observation, not a live catalog measurement.
- Reusing a widget public key risks new submissions from an old embed resolving to a different widget, not reassignment of already stored submissions.
- Malformed JSON/incomplete cursor pairs restart paging, whereas invalid timestamp strings pass through; these are different invalid-input paths to test.
- A valid full unique index implies uniqueness for an equivalent subset index, not the reverse, and says nothing about unrelated operational build failures.

### Pass 3 - Documentation reconciliation

Parsed all 68 ticket status headers and compared them with all 68 ledger rows, checking unique
ticket IDs, no done ticket with open acceptance, and all seven reopened C3 boxes. Replaced
contradictory old paragraphs rather than relying only on later disclaimers: approval consumer
counts, RLS/index guarantees, rank invalidation, prebuilt-index swapping, schema CHECK reflection,
silent cursor restart, RLS provenance, cold replay and stale execution-plan instructions.

Final ticket totals: **2 complete, 28 partial/unverified, 38 open**. These are architecture-ticket
counts, not whole-module percentages. Only Markdown was edited; no migration, application fix,
deployment or browser verification was performed. Whitespace validation uses the Windows-aware
check `git -c core.autocrlf=false -c core.whitespace=cr-at-eol diff --check -- docs/build-module`.

## Audit acceptance

- [x] Both named review reports were read and mapped to the current 68-ticket backlog.
- [x] Unsupported done headers and affected checked criteria were reopened with source/test evidence.
- [x] Invalid or overbroad architecture recommendations were corrected and assigned explicit follow-up work.
- [x] Existing code/UI changes were preserved; this pass changed documentation only.
- [ ] All 68 remediation tickets are implemented, verified and tested. This remains unfinished product work, not an audit claim.
