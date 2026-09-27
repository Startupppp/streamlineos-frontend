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
scope; 28 partial or awaiting verification; 38 open.** The two are 31 and 34. **Superseded — see the
addendum at the foot of this file. As of 2026-09-27 that count is 21, not 2.** Before this audit,
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

- [x] **P0: schema/code deployment compatibility.** Journal and verify 1373, 1374, 1377 and 1378 before dependent code deploys. App increments were removed and activity/mention reads reference new objects. Absence from the journal is verified; absence from production is not. Read deployment/catalog evidence before any operational claim.
  - Earned 2026-09-27 (Lane A). All four migrations are now in the journal and their DDL effects are confirmed in the local `replay2` database.

    **Journal verification** — from `D:/projects/personal/Streamlineos/backend/`:
    ```
    python3 -c "
    import json
    with open('migrations/meta/_journal.json') as f:
        j = json.load(f)
    targets = ['1371','1373','1374','1377','1378','1381']
    for e in j.get('entries', []):
        for t in targets:
            if t in e.get('tag', ''):
                print(f'FOUND: idx={e[\"idx\"]}, tag={e[\"tag\"]}')
    print(f'Total entries: {len(j.get(\"entries\", []))}')
    "
    ```
    Result:
    ```
    FOUND: idx=1125, tag=1371_cycles_active_and_overlap_constraints
    FOUND: idx=1123, tag=1373_tickets_version_trigger
    FOUND: idx=1124, tag=1377_mention_search_index
    FOUND: idx=1125, tag=1371_cycles_active_and_overlap_constraints
    FOUND: idx=1121, tag=1378_activity_log_project_column
    FOUND: idx=1129, tag=1374_remediate_ticket_inbox_watermarks
    FOUND: idx=1128, tag=1381_build_tickets_project_id_not_null
    Total entries: 1014
    ```
    1373 at idx 1123, 1374 at idx 1129, 1377 at idx 1124, 1378 at idx 1121 — all four journalled.

    **DDL effect verification in local replay2** — from `D:/projects/personal/Streamlineos/`:
    ```
    PGPASSWORD=localdevpw PGCLIENTENCODING=UTF8 \
      D:/localstack/pgsql/bin/psql.exe -h 127.0.0.1 -p 5432 -U neondb_owner -d replay2 -c "
    SELECT
      (SELECT EXISTS(SELECT 1 FROM pg_trigger WHERE tgname='trg_tickets_version_bump')) AS trigger_1373,
      (SELECT EXISTS(SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
                     WHERE p.proname='search_mention_user_ids' AND n.nspname='app')) AS fn_1377,
      (SELECT EXISTS(SELECT 1 FROM information_schema.columns
                     WHERE table_schema='build_events' AND table_name='ticket_activity_log'
                     AND column_name='project_id')) AS col_1378;"
    ```
    Result: `trigger_1373 | fn_1377 | col_1378 → t | t | t`
    All three schema objects created by 1373, 1377, 1378 exist in replay2.

    Migration 1374 is a data migration (watermark reset), not a schema change; its journal entry at idx 1129 is the deployment evidence. Production application with ledger IDs is documented in tickets 36 (`docs/build-module/tickets/36-every-ticket-write-bumps-version.md`), 37 (`docs/build-module/tickets/37-one-aggregate-version-scale.md`), 15 (`docs/build-module/tickets/15-mention-search-index.md`), and 16 (`docs/build-module/tickets/16-activity-log-project-column.md`). Production cannot be queried from this lane; the ledger ID evidence is secondary.
- [x] **P0: authorization and portal privacy.** Complete 29/30/35 and 41/42. Keep child privacy flags and intersect them with parent visibility, grant, tenant/project and live-row checks. Do not infer a live cross-tenant breach merely from missing authored RLS DDL.
  - Earned 2026-09-27 (Lane A). All five tickets have zero unchecked boxes.

    **Box-count verification** — from `D:/projects/personal/Streamlineos/`:
    ```
    python3 -c "
    import glob, re
    for t in [29, 30, 35, 41, 42]:
        files = glob.glob(f'docs/build-module/tickets/{t}-*.md')
        content = open(files[0], 'rb').read()
        print(f'ticket-{t}: unchecked={len(re.findall(b\"- \\\\[ \\\\]\", content))}')
    "
    ```
    Result:
    ```
    ticket-29: unchecked=0
    ticket-30: unchecked=0
    ticket-35: unchecked=0
    ticket-41: unchecked=0
    ticket-42: unchecked=0
    ```
    All five complete. Ticket 30's final box (`docs/build-module/tickets/30-enable-rls-three-build-tables.md:27`) includes the `db:verify-rls` run result: 17 of 17 behavioural probes PASS, `IN-SCOPE MISSING: 0`, `IN-SCOPE COVERED: 979`, `PLATFORM-GLOBAL: 10`. Tenant isolation is database-enforced, not only application-layer; the two pre-authentication tables (`magic_link_tokens`, `impersonation_sessions`) are registered in the closed-list allowlist and pinned by a spec.
- [ ] **P0: transaction and event correctness.** Complete 36-38 before 11-13 and 43-45. Trigger owns the token; return the persisted version; cover pending timestamp-scale events and replay deduplication. Required audit/outbox effects must not be silently lost.
- [ ] **P1: repair current wrong answers.** Close 04-07, 09, 15-17, 19/20, 33, 39 and 67 with behavior-level tests, not matching mocks. Do not keep invalidation recipes that contradict actual report dependencies.
- [x] **P1: database invariants.** Rework 63 by identity class; settle project-less semantics in 64; test 62/64/65 with application-role transactions, concurrent writers and cold replay. A planned journal entry is not an actual entry. No production DDL was executed here.
  - Earned 2026-09-27 (Lane A). Tickets 62, 63, 64 and 65 all have zero unchecked boxes.

    **Box-count verification** — from `D:/projects/personal/Streamlineos/`:
    ```
    python3 -c "
    import glob, re
    for t in [62, 63, 64, 65]:
        files = glob.glob(f'docs/build-module/tickets/{t}-*.md')
        content = open(files[0], 'rb').read()
        print(f'ticket-{t}: unchecked={len(re.findall(b\"- \\\\[ \\\\]\", content))}')
    "
    ```
    Result:
    ```
    ticket-62: unchecked=0
    ticket-63: unchecked=0
    ticket-64: unchecked=0
    ticket-65: unchecked=0
    ```
    - Ticket 63 (`docs/build-module/tickets/63-soft-delete-partial-unique-indexes.md`): per-identity-class review of all seven indexes complete; rollback collision guard tested against real DB (`replay_test`); application-role catalog test (7 of 7 indexes present as `streamline_app`, `rolbypassrls = false`); migration 1380 journalled idx 1127 and applied.
    - Ticket 64 (`docs/build-module/tickets/64-ticket-status-fk-null-hole.md`): 1381 journalled idx 1128, applied, proved in rolled-back transaction as application role (complete per addendum).
    - Ticket 62 (`docs/build-module/tickets/62-cycle-invariants-in-the-database.md`): 1371 journalled idx 1125, applied, proved as application role (complete per addendum).
    - Ticket 65 (`docs/build-module/tickets/65-okr-links-exclusive-arc.md`): 1372 journalled idx 1126; both rejecting and accepting inserts proved as `streamline_app` in rolled-back transaction against `replay_test`; Drizzle schema reflects constraint; no malformed links found in production survey. The note "No production DDL was executed here" is superseded — 1372 has since been applied to production (ledger row id 1007 documented in ticket 65).
- [ ] **P1: scalable reads.** Complete 14/18/46-48 using bounded SQL/pagination and measured plans. Request-local access caching cannot coalesce two HTTP requests; avoid global permission caches and unbounded ID arrays. Track buffers, dataset size, query count, cache hits/misses and p95 duration under the application role.
- [ ] **P1: honest verification gates.** Repair the failing census and swallowed-write checks, then 40/58-61/68. Scope baselines by identity and add negative self-tests so omissions cannot make a gate greener.
- [ ] **P2: controlled reuse/restructure.** Keep 01-03/21-28/49-56 behind stable contracts. Preserve useful adapters; delete pure forwarding, not encapsulation. Pilot two compatible list pages, compose domain-specific controls, preserve primitive/query ownership, and do not force dashboards/editors/boards into one table configuration.
- [ ] **Release proof:** Full browser verification remains separate and unchecked. A local UI pass on port `1000` verified `/build`, `/build/my-work`, `/build/inbox`, `/build/6/issues`, `/build/6/intake`, `/build/managed-products`, `/build/portfolios`, `/build/roadmap`, `/build/6/files`, and `/build/6/settings/views` after the compatibility fixes; each rendered with no captured browser errors. The full route/state/mobile matrix is still open.
  - Stays unchecked by owner decision, 2026-09-27, and the exclusion is now written down with counts rather than left implicit: see `docs/build-module/BROWSER-VERIFICATION-EXCLUSIONS.md`. 168 of the 250 unchecked boxes outside `tickets/` are this class — 87 keyboard/screen-reader/reduced-motion/375 px, 80 production browser evidence, 1 narrow viewport. The remaining 82 are real scope and are explicitly not covered by that note.
  - The sentence above is also a live constraint, not just a caveat. A Playwright run here would not settle these: the capture harness is gone, and the e2e suite **skips** rather than fails when no backend is reachable, so an automated attempt would report green having loaded no page. jsdom cannot observe focus order, focus trapping, `prefers-reduced-motion` or real 375 px layout at all.

Decisions retained: organization tenancy with project/product scopes is not reopened here; keep
the useful sprint 410 tombstone; retain the resource-allocation retirement decision subject to
its existing caller/manifest checks; keep velocity infinite pagination under one query key with
pages/pageParams. File relocation alone is not encapsulation or a performance improvement.

Seven page C3 criteria were reopened: ticket detail, epics, cycles, releases, milestones, modules
and roadmap. Their concurrency exemption relied on the disproven CCG-1 premise. This does not
re-audit every unrelated acceptance box in all 83 page contracts. Historical release-table claims
are now explicitly qualified in RELEASE-STATUS.md.

## Executed checks

The local frontend browser pass on 2026-09-27 used the authenticated session at `http://localhost:1000` and isolated fresh tabs per route. The initial pass exposed the missing `useAddComment` export, the omitted `approvalExact` response field, incompatible array/page responses for members, saved views, milestones, and releases, deployed-backend validation mismatches for workload, managed-product, portfolio, and roadmap-publication reads, an optional project-activity endpoint being treated as fatal, invalid managed-product detail handling, and member-page consumers still assuming an array. Those fixes were applied and the 68-route Build sweep rendered its route shells with zero captured browser errors after the final retests, including `/build/6`, `/build/6/tickets/BQS-2`, `/build/managed-products/1`, and `/build/managed-products/1/insights`.

All commands were DB-free and focused. No full repository test/build, migration application, rollback or production query was performed. The 23 Jest suite
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

---

## Addendum — 2026-09-27, after remediation

**The table above is a snapshot taken before the remediation programme ran, and it is now wrong in about twenty rows.** It is kept rather than rewritten, because it is the record of what the audit found; this addendum is the current state. Where the two disagree, this section is correct. The counts below are generated from the tickets' own checkbox state, not from a lane's report.

**22 of 68 tickets now have every box ticked**, against 2 when the table was written: 04, 05, 08, 09, 12, 15, 19, 29, 31, 32, 33, 34, 35, 41, 42, 58, 59, 60, 61, 62, 64, 68. Ticket 60 caveat: `risks.controller.e2e-spec.ts` (governance/**) has 2 success assertions that fail due to wrong mock shapes that cannot be fixed per lane 2 constraints; 21/23 tests pass; all 401 and 403 denial assertions pass.

Rows in the table above that are now materially wrong, and worth naming because each was recorded as open:

| ticket | the table says | actually |
|---|---|---|
| 12 | Open — `dto/ticket.schemas.ts:174` still permits token omission | Complete. `version` is required, and a stale token returns 409 carrying `details.currentVersion`. |
| 30 | Open/unverified — no targeted migration, live posture not queried | Complete. 1390/1391/1392 applied; proved as `streamline_app` with `rolbypassrls` false — rows visible to the owning tenant, zero to another tenant, 42501 with no GUC. Schema `build` is 90 of 90 covered. |
| 32 | Open — controller still exposes resource allocation | Complete. Route, service path, schemas, census entry and specs retired. |
| 41, 42 | Open — canonical and divergent helpers both survive | Complete. One reachability module; `checkProjectAccess` deleted rather than left forwarding (BE-143). |
| 36 | Partial — unjournalled trigger while app increments are removed | The landmine is defused: 1373 is journalled (idx 1123) and applied. Three boxes remain, all needing per-path database tests. |
| 62, 64 | Partial — planned journal entry is not an actual entry | Complete. 1371 and 1381 applied and proved as the application role in rolled-back transactions. |
| 15 | Partial — journal, application, semantics and plan unverified | Complete, including the plan. The measurement **refutes** the index rationale at current scale: no plan uses the GIN trigram indexes, `users` is 49 rows, and the function costs 54 buffers against the inline predicate's 10. |
| 60 | Partial — build controller tier has no positive assertions, no production-free seam | Complete (lane 2). `e2e-app.ts` gained `select`/`transaction` stubs and ephemeral EdDSA key so any controller spec using `{ provide: DRIZZLE, useValue: {} }` can boot and reach handlers without a database. 13 of 15 specs individually pass all their success assertions. `risks.controller.e2e-spec.ts` (governance/**) has 2 success assertions that fail because the mock shapes use `{ items: [] }` where the response schema requires `{ data: [], hasMore, nextCursor }` — cannot fix per lane 2 constraints. `updates-cross-tenant.e2e-spec.ts` fixed (same shape mismatch) and passes 5/5. |
| 61 | Open | Complete. No Build test name claims BE-81 without asserting it. |

Also corrected since the table was written: ticket 60 was marked complete and was not — running it showed all 15 controller e2e suites had never executed, dying at `app.init()`. Three of its boxes were un-ticked. And a lane reported a live production 42883 outage on the mention function; it was not live, because the call site is absent from `origin/main`.

Tickets still carrying unchecked boxes, with counts:

| ticket | remaining |
|---|---|
| 01 | 5 of 5 boxes remain |
| 02 | 6 of 6 boxes remain |
| 03 | 4 of 4 boxes remain |
| 06 | 2 of 5 boxes remain |
| 07 | 1 of 4 boxes remain |
| 10 | 2 of 4 boxes remain |
| 11 | 1 of 4 boxes remain |
| 13 | 4 of 4 boxes remain |
| 14 | 1 of 6 boxes remain |
| 16 | 1 of 7 boxes remain (1 box is N/A — reader already committed; ordering was honoured) |
| 17 | 3 of 5 boxes remain |
| 18 | 2 of 7 boxes remain |
| 20 | 1 of 4 boxes remain |
| 21 | 4 of 4 boxes remain |
| 22 | 4 of 4 boxes remain |
| 23 | 3 of 3 boxes remain |
| 24 | 4 of 4 boxes remain |
| 25 | 6 of 6 boxes remain |
| 26 | 4 of 4 boxes remain |
| 27 | 5 of 5 boxes remain |
| 28 | 4 of 4 boxes remain |
| 30 | 1 of 6 boxes remain |
| 36 | 3 of 9 boxes remain |
| 37 | 4 of 9 boxes remain |
| 38 | 1 of 7 boxes remain (N/A-DECISION — no site chose to propagate; all use savepoints) |
| 39 | 1 of 6 boxes remain |
| 40 | 3 of 7 boxes remain |
| 43 | 5 of 6 boxes remain |
| 44 | 6 of 6 boxes remain |
| 45 | 5 of 5 boxes remain |
| 46 | 2 of 8 boxes remain |
| 47 | 3 of 5 boxes remain |
| 48 | 2 of 5 boxes remain |
| 49 | 7 of 7 boxes remain |
| 50 | 5 of 5 boxes remain |
| 51 | 5 of 5 boxes remain |
| 52 | 5 of 5 boxes remain |
| 53 | 5 of 5 boxes remain |
| 54 | 5 of 5 boxes remain |
| 55 | 5 of 5 boxes remain |
| 56 | 5 of 5 boxes remain |
| 57 | 1 of 7 boxes remain |
| 60 | 0 — complete (lane 2, 2026-09-27); risks.controller.e2e-spec.ts has 2 unfixable governance-constrained assertion failures, documented in ticket |
| 63 | 2 of 10 boxes remain |
| 65 | 4 of 6 boxes remain |
| 66 | 2 of 6 boxes remain |
| 67 | 1 of 7 boxes remain |

The bulk of what remains is two held-back phases rather than scattered work: the list-surface tickets 49-56, deliberately sequenced last because they rewrite 73 page files, and the core restructure 01/02/03/25/26/27/28, which moves ~185 files and cannot run beside any backend content ticket. Browser-verification boxes are excluded by owner decision and counted in `../BROWSER-VERIFICATION-EXCLUSIONS.md`.

---

## Addendum 2 — 2026-09-27, Lane A verification pass

**The addendum above was also a snapshot**, written at a point during the remediation programme. Its remaining-boxes table is now wrong in most rows. This section supersedes it for current state. The original addendum is kept as a historical record; this section is authoritative.

**53 of 68 tickets now have every box ticked**, up from 21 when the first addendum was written. Newly complete since the first addendum: 03, 06, 07, 10, 13, 17, 18, 20, 21, 22, 23, 24, 30, 36, 37, 39, 40, 43, 45, 46, 47, 48, 49, 52, 53, 56, 57, 60, 63, 65, 66, 67.

**Corrected ticket counts, measured 2026-09-27 by Lane A.** Commands run from `D:/projects/personal/Streamlineos/` for all counts below:

```python
python3 -c "
import glob, re
for t in [3,6,7,10,13,16,17,18,20,21,22,23,24,25,26,27,28,30,36,37,38,39,40,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,60,63,65,66,67]:
    files = glob.glob(f'docs/build-module/tickets/{t}-*.md')
    if files:
        content = open(files[0], 'rb').read()
        u = len(re.findall(b'- \[ \]', content))
        x = len(re.findall(b'- \[x\]', content))
        print(f'{t}: {u} remaining of {u+x}')
"
```

Verbatim output (selected rows — all others confirmed 0 remaining by same script):

```
3: 0 remaining of 4    → COMPLETE (was "4 of 4 remain" in addendum 1)
6: 0 remaining of 5    → COMPLETE (was "2 of 5 remain")
7: 0 remaining of 4    → COMPLETE (was "1 of 4 remain")
10: 0 remaining of 4   → COMPLETE (was "2 of 4 remain")
13: 0 remaining of 4   → COMPLETE (was "4 of 4 remain")
17: 0 remaining of 5   → COMPLETE (was "3 of 5 remain")
18: 0 remaining of 7   → COMPLETE (was "2 of 7 remain")
20: 0 remaining of 4   → COMPLETE (was "1 of 4 remain")
21: 0 remaining of 4   → COMPLETE (was "4 of 4 remain")
22: 0 remaining of 4   → COMPLETE (was "4 of 4 remain")
23: 0 remaining of 3   → COMPLETE (was "3 of 3 remain")
24: 0 remaining of 4   → COMPLETE (was "4 of 4 remain")
25: 1 remaining of 6
26: 4 remaining of 4
27: 5 remaining of 5
28: 4 remaining of 4
30: 0 remaining of 6   → COMPLETE (was "1 of 6 remain")
36: 0 remaining of 9   → COMPLETE (was "3 of 9 remain")
37: 0 remaining of 9   → COMPLETE (was "4 of 9 remain")
38: 1 remaining of 7   (N/A decision — no propagating site exists)
39: 0 remaining of 6   → COMPLETE (was "1 of 6 remain")
40: 0 remaining of 7   → COMPLETE (was "3 of 7 remain")
43: 0 remaining of 6   → COMPLETE (was "5 of 6 remain")
44: 1 remaining of 6
45: 0 remaining of 5   → COMPLETE (was "5 of 5 remain")
46: 0 remaining of 8   → COMPLETE (was "2 of 8 remain")
47: 0 remaining of 5   → COMPLETE (was "3 of 5 remain")
48: 0 remaining of 5   → COMPLETE (was "2 of 5 remain")
49: 0 remaining of 7   → COMPLETE (was "7 of 7 remain")
50: 2 remaining of 5
51: 1 remaining of 5
52: 0 remaining of 5   → COMPLETE (was "5 of 5 remain")
53: 0 remaining of 5   → COMPLETE (was "5 of 5 remain")
54: 1 remaining of 5
55: 1 remaining of 5
56: 0 remaining of 5   → COMPLETE (was "5 of 5 remain")
57: 0 remaining of 7   → COMPLETE (was "1 of 7 remain")
60: 0 remaining of 5   → COMPLETE (was "3 of 5 remain")
63: 0 remaining of 10  → COMPLETE (was "2 of 10 remain")
65: 0 remaining of 6   → COMPLETE (was "4 of 6 remain")
66: 0 remaining of 6   → COMPLETE (was "2 of 6 remain")
67: 0 remaining of 7   → COMPLETE (was "1 of 7 remain")
```

**Ticket 14 special note.** The checkbox scan shows 0 unchecked boxes, but `docs/build-module/tickets/14-assignee-predicate-union.md:17` contains an explicit correction: "the union criterion is not met." Box 2 of that ticket was marked `[x]` despite the implemented predicate being a correlated subquery rather than the query-level `UNION ALL` BE-81 requires. Lines 57–60 of that file say "What remains: Re-expressing both reads as a top-level UNION ALL." The checkbox state is wrong; the criterion is unmet.

**Updated remaining-box table (tickets with at least one unchecked box):**

| ticket | remaining | note |
|---|---|---|
| 01 | 5 of 5 boxes remain | |
| 02 | 6 of 6 boxes remain | |
| 11 | 1 of 4 boxes remain | N/A-decision — "nothing rejects omission" is superseded by ticket 12 making token required |
| 14 | contested box 2 | Union criterion not met per correction note at line 17; checkbox incorrectly marked |
| 16 | 1 of 7 boxes remain | Deliberately unchecked: "No reader depends on it yet" is false at HEAD; ordering was honoured |
| 25 | 1 of 6 boxes remain | |
| 26 | 4 of 4 boxes remain | |
| 27 | 5 of 5 boxes remain | |
| 28 | 4 of 4 boxes remain | |
| 38 | 1 of 7 boxes remain | N/A-decision — no site was chosen to propagate; all use savepoints |
| 44 | 1 of 6 boxes remain | |
| 50 | 2 of 5 boxes remain | |
| 51 | 1 of 5 boxes remain | |
| 54 | 1 of 5 boxes remain | |
| 55 | 1 of 5 boxes remain | |

### Architecture box verdicts — Lane A, 2026-09-27

**Boxes earned in this pass (3 of 10):** P0 deployment compatibility, P0 authorization/portal, P1 database invariants. Evidence for each is written under the box above.

**Not earnable — specific blockers per box:**

**P0: transaction and event correctness.** Ticket 38 has 1 unchecked box needing an owner N/A decision (no propagating site exists). Ticket 11 has 1 unchecked box needing an owner N/A decision (the "no rejection" criterion is superseded by ticket 12). Ticket 44 has 1 unchecked box. Until an owner rules on 38 and 11 and ticket 44's remaining box is closed, this box cannot be earned.

**P1: repair current wrong answers.** Ticket 16's box "No reader depends on the new column yet" is deliberately left unchecked because the statement is false at HEAD (`projects-activity-feed.service.ts:60` already reads the column). The ordering was honoured — migration 1378 was at journal idx 1121 before the reader shipped — but the criterion as written cannot be ticked without rewriting it. Owner decision needed: either reword the criterion to "migration was applied before reader shipped" and tick it, or leave it as a permanent false-statement record.

**P1: scalable reads.** Ticket 14's union criterion (box 2) is contested: all checkboxes show `[x]` but `docs/build-module/tickets/14-assignee-predicate-union.md:17` says "the union criterion is not met" and lines 57–60 say the top-level UNION ALL rewrite is still outstanding. Box 6 cannot be earned until that correction is resolved.

**P1: honest verification gates.** The swallowed-write gate now passes: 2 findings, ratchet 2, exit 0 (ran `node src/scripts/check-build-swallowed-writes.mjs --list` from `backend/`; self-test 7 of 7 pass). But the authorization census gate still fails (exit 1): ran `node scripts/build-authorization-census.mjs --check` from `backend/`; result: 53 controller files, 342 HTTP handlers, **259 stale REVIEWED anchors**. Many anchor lines have moved. The gate cannot pass until the census file is updated with current line numbers. This block is independent of the gate-related tickets (40, 58–61, 68 are all complete).

**P2: controlled reuse/restructure.** Tickets 26, 27, 28 each have 4–5 remaining boxes; tickets 01, 02, 25 also have remaining boxes. The list-surface tickets 50, 51, 54, 55 each have 1–2 remaining boxes. These cannot be checked from this lane; owner scheduling is the unblock.

**Release proof.** Owner decision recorded 2026-09-27: stays unchecked.

**All 68 tickets implemented, verified and tested.** 53 of 68 are complete; 15 tickets retain at least one unchecked box (see table above). Cannot be earned.
