# Bugs and verification ledger

## Whiteboard delete127 reconciliation — 2026-10-06

Current verified bounded source: root personally repairs the existing WhiteboardsService delete command and its existing tenant/lifecycle suites, committed only as backend940e7c7a39cc229af230724ddaaf6d2bbdc8a74d with100 insertions/3 deletions. The already scoped live organization/project/ID UPDATE now projects RETURNING id and refuses empty404 before audit. Existing board lookup, creator/organization-owner and project manage authorization remain unchanged. The lifecycle positive fixture now returns its actual id6; all unrelated fixtures and external work are preserved. No new API/schema/helper/source/comment or duplicate file.

Meaningful RED5 failures/14 controls/19 total49.098s precedes service edits, using an UPDATE double that supports both the baseline awaited WHERE and repaired RETURNING. Shared SQL-predicate evaluation proves creator/owner positives, write-time deleted/missing/foreign organization/project negatives, explicit zero/error and no audit on refusal. Private/project-visible noncreator viewer/editor controls run with manage permission false and true. Earlier54/3 and99/8 passes are retained as intermediate checkpoints. The final additional control initially contains a missing closing parenthesis: TS1005/zero executed tests and lint parse failure are recorded, then corrected without suppression. Final101 tests/8 suites passes24.266s; strict three-path ESLint/diff passes, existing tsconfig.test.json three-root/one-ambient/dependency TypeScript reports0 diagnostics56.047s. Fresh serialized12GB production and separate test-inclusive TypeScript both exit0. External Ticket constructor fixes belong to their active editor; root neither repeats nor stages them. Historical failed gates remain preserved.

| Frozen source | Lines | SHA256 |
|---|---:|---|
| WhiteboardsService | 383 | 9b64965b8f95ca7b3874ea746c6cfb501795fef4f0d2c8963aa1d74644b344a5 |
| Whiteboard tenant suite | 223 | 8bf9bf157ba07367c090cd6ca4aaf58dfd09e73950dc9017190884a25302156b |
| Build delete/restore suite | 339 | 60e00f64e3f9e222843dabb84a03c75a7623c9caa8c8df29a80c1fd0fcbd855b |

Two independent final reviews are CLEAR at unchanged three hashes. Exact staging starts with an empty backend index, checks only those three paths and releases them clean after commit. No new file-size crossing, raised exception, formatter, deployment or production mutation.

```text
pnpm -C backend exec jest --runInBand --runTestsByPath src/modules/build/execution/whiteboards-tenant-isolation.spec.ts src/modules/build/execution/whiteboard-access.spec.ts src/modules/build/execution/whiteboard-board-helpers.spec.ts src/modules/build/execution/whiteboard-sharing-tenant-isolation.spec.ts src/modules/build/execution/whiteboard-sharing.service.spec.ts src/modules/build/execution/whiteboards-cursor-pagination.spec.ts src/modules/build/execution/whiteboards-project-access.spec.ts src/modules/build/lifecycle/build-delete-restore.spec.ts
pnpm -C backend exec eslint src/modules/build/execution/whiteboards.service.ts src/modules/build/execution/whiteboards-tenant-isolation.spec.ts src/modules/build/lifecycle/build-delete-restore.spec.ts --max-warnings 0
pnpm -C backend exec tsc --noEmit --project tsconfig.test.json
```

Current unverified: actual concurrent PostgreSQL deletion/RLS, HTTP404/200/response contracts, complete six-role/project/tenant/PAT/private/shared/public-token matrix, persisted deletion/read-after-write, atomic audit/outbox/cache, canvas/delete/restore/mobile and deployment/operations. Conditional-write fixture proof does not establish physical races or atomic audit. The isolated mutable target is still pending; no production disposable write, fixture, grant, credential, live comment, DDL or screenshot of a deletion is claimed. Supports open BT-c7a2f16557bb/BT-05e68784a2c2; all535 task texts/statuses/stages remain298 checked/237 open.

## QA case live-write125 reconciliation — 2026-10-06

Current verified bounded source: root directly repairs only existing TestManagementService and its tenant-isolation suite, claimed before edits and committed separately as backend842aac4be with22 insertions/9 deletions. Case UPDATE retains ID/organization/project, adds live state and rejects empty RETURNING404; existing authorization, supplied bindings, omitted fields and response remain unchanged. The suite's existing UPDATE fixture now evaluates real predicates; eight case/suite post-lookup organization/project/deleted/missing controls retain no-write assertions and every earlier binding/hierarchy/rename positive. No new file/helper/API/schema/comment or duplicate implementation.

Meaningful RED4 case failures/63 controls/67 total73.492s against unchanged production source proves deleted-case mutation and silent zero-result resolution. Final regression215 tests/8 suites passes59.338s. Exact two-path strict ESLint/diff passes; existing tsconfig.test.json two-root/one-ambient/dependency TypeScript reports0 diagnostics52.757s. Independent backend/security reviewers report CLEAR at unchanged servicea7f3fa206730585b044e85925d749eecafece6b1a92cab426d71c1613755a864 (401 versus397 lines) and testb16712ec3e7bb4531b0ea7ca18f437f83b829772a69eb03a3944fb38163da3dd (498 versus489). Both remain below500; no limit, exception or formatter changes. Exact isolated staging preserves all unrelated dirty/untracked files and releases the two source paths.

Fresh serialized12GB production TypeScript exits1 with four external Ticket constructor-fixture diagnostics: ticket-command-paths.spec.ts113, projects-ticket-subresources-cross-project-binding.spec.ts355 and projects-ticket-subresources-tenant-isolation.spec.ts72/90. Previous124 system-detach/automationRunner diagnostics no longer occur in this snapshot; this is external owner progress, not root implementation. Same full-test repetition waits for the active external migration. Unchanged artifact vendor/fresh-generation checks pass417 schemas/331 operations at OpenAPI5442d474a431. Current-controller export, deployment and physical SQL are not inferred.

```text
pnpm -C backend exec jest --runInBand --runTestsByPath src/modules/build/qa/test-management-tenant-isolation.spec.ts src/modules/build/qa/test-runs-bola-binding.spec.ts src/modules/build/qa/test-runs-tenant-isolation.spec.ts src/modules/build/qa/qa-by-id-project-access.spec.ts src/modules/build/qa/qa-concurrent-edit.spec.ts src/modules/build/qa/qa-controllers-forward-actor.spec.ts src/modules/build/qa/bug-consolidation/test-run-cycle-bridge.spec.ts src/modules/build/lifecycle/build-delete-restore.spec.ts
pnpm -C backend exec eslint src/modules/build/qa/test-management.service.ts src/modules/build/qa/test-management-tenant-isolation.spec.ts --max-warnings 0
```

Current unverified: actual HTTP404/200, physical conditional write/concurrent deletion/RLS, complete six-role/project/tenant/PAT matrix, persistence/read-after-write, mandatory case CAS/history, audit/cache/outbox, browser mutation/mobile and deployment/operations. The shared predicate fixture is source proof only; isolated mutable target remains pending. No production disposable write, fixture, grant, comment, credential, DDL or deployment. Supports open BT-9ea775d73705/BT-e19e42776b5a; all535 task texts/statuses/stages remain298 checked/237 open.

## QA run return128 reconciliation — 2026-10-06

Current verified bounded source: root personally changes the existing RunExecutionPage's six return destinations across ready, loading, missing, fallback and denied/error states to the originating project's canonical /qa?tab=runs. The existing PageWrapper/dirty-state guard remains the navigation owner. Root37303cad1 commits only this page and its existing execution test with37 insertions/17 deletions; both are released after exact matching-hash staging. No API, schema, permission, component, hook, wrapper, source comment or new Markdown file.

Meaningful RED3 failures/7 controls/10 total2.199s precedes source edits: actual PageWrapper Back anchors for project7 ready/missing and the deferred leave callback return to cases. Root removes only the wrapper mock, forwards existing Link interaction props and renders the existing EmptyState action boundary. The first expanded command incorrectly names two nonexistent result-column/bulk-bar test paths: two ENOENT suite failures and50 executed passes are retained, not a passing bundle. An rg inventory supplies the corrected seven existing suites, initially65 passes7.541s. Independent review catches two unsupported Testing Library exact options; root removes them before scoped checking. The other reviewer strengthens the cached-denial negative: retain populated Run1 and prove its name and Complete Run action remain hidden. Final65 tests/7 suites pass8.331s, exact strict lint/diff passes, existing tsconfig.specs.json two-root/four-ambient/dependency TypeScript reports0 diagnostics19.487s. Both independent final reviews are CLEAR at unchanged sourcef559a1df84cb1aa8ad0daceb6683d6ea683c982e9e8c378fa526524018e99ddb (438 versus437 lines) and test77e2c995e5083199a0a4e58703577a82d94c532b5fe41ccb634d1da6f5d8068c (278 versus259). No new limit crossing or suppression.

Current verified browser: one focused read-only /build/1/qa/runs/1 navigation initially times out; the next actual AX observation proves the route settled on Run not found with both Back destinations pointing to ?tab=runs. Clicking the real header Back settles at /build/1/qa?tab=runs with Test Runs selected, correct creation controls and genuine empty state. Normal refresh retains the selected pane and settles again on empty runs. This is missing-record recovery, not a populated run execution or verified HTTP404. Temporary requested1280×800 viewport is reset, and no Create/Save/Submit or production mutation occurs.

| Actual view | Immutable capture | Encoded pixels | SHA256 |
|---|---|---|---|
| Missing run recovery | [Missing run](./evidence/2026-10-05-browser/qa128-missing-run-back-desktop.jpg) | 1152×720 | 01757302702ef2584fdfe81f3b107d109594be019941ea823c55acd7de41c1fb |
| Runs after Back and refresh | [Returned runs](./evidence/2026-10-05-browser/qa128-returned-runs-desktop.jpg) | 1280×800 | ed916d3b85a591087e21531029ff38a188416b9332d1dfe2f21bdd82eb61a5df |

Captured on2026-10-06 in the existing2026-10-05 collection with exclusive writes; older screenshots are preserved. Requested viewport and encoded pixels are distinct: independent metadata review verifies1152×720 for the first image and1280×800 for the second, at unchanged hashes. Both visibly support the bounded recovery claims. App-only images do not show the address bar or independently prove actions/reload. Feedback toolbar obstruction remains visible and open. Fresh production frontend typecheck exits2 with17 external moving navigation/project/team/webhook diagnostics, none naming the two128 paths; full-spec repetition waits for that active migration. Official Next type generation completes with its existing Edge Runtime warning. No root edit to those external owners or contract/config/ratchet files.

```text
pnpm -C frontend exec jest --runInBand --runTestsByPath features/build/qa/runs/run-execution-page.test.tsx features/build/qa/runs/run-effective-status.test.ts features/build/qa/test-cases-tab.test.tsx features/build/qa/test-runs-tab.test.tsx features/build/qa/qa-schema.test.ts components/ui/page-wrapper-unsaved-guard.test.tsx components/ui/page-wrapper-state.test.tsx
pnpm -C frontend exec eslint features/build/qa/runs/run-execution-page.tsx features/build/qa/runs/run-execution-page.test.tsx --max-warnings 0
pnpm -C frontend type-check
```

Current unverified: populated detail→Back, unsaved mutation recovery, complete mobile/role/tenant/PAT and server authorization, persistent execution/results/effects and deployment/operations. Missing-screen recovery and cached-data unit denial do not substitute for these. Supports open BT-9ea775d73705/BT-3e9ebfaad21e; all535 task texts/statuses/stages remain298/237.

## QA tab URL126 reconciliation — 2026-10-06

Scope: root directly repairs two existing frontend files, claimed before edits, supporting open BT-9ea775d73705/BT-e19e42776b5a and recovery BT-3e9ebfaad21e. Exact rootda6c9ae3c commits only qa-page.tsx and test-cases-tab.test.tsx with36 insertions/6 deletions. The existing generic useUrlTab owns validated cases/runs selection, default removal, preserved query facets and replace/no-scroll navigation; its HR-directory location adds no HR dependency or new API. It is reused unchanged. Existing Tabs styling, permissions, create nonces, leaf components, contracts and query keys remain unchanged. No new helper, component, test or Markdown file, source comment or live Ticket comment.

Current verified tests: meaningful4 RED/11 controls/15 total18.811s precedes source edits. Initial expanded39/40 identifies the existing AnimatedIconButton mock's missing hover handlers when the actual parent create control is exercised. Root corrects only that fixture with named handlers; final40 tests/3 suites pass7.472s. Exact two-path strict ESLint/diff passes. Existing tsconfig.specs.json with two roots/four existing ambient declarations/dependencies reports0 diagnostics9.546s. Both independent source reviewers report CLEAR at unchanged hashes: page4e21b5576d7c221875d4a2c2ea6b5bf0dc3659614e78055f1e28b5c7d25217a6 (88 versus91 lines), testd9c949653b8027a07dec304ca26d88830324ac26f879af5d2d9de48642a08019 (288 versus255). Actual parent/Tabs/shared-hook tests preserve every prior leaf case and pair view-only negatives with manage positives.

Current verified browser: before repair, selecting Test Runs leaves /build/1/qa unchanged and normal refresh returns to Test Cases. After repair, Test Runs writes ?tab=runs and normal refresh retains the selected pane and New Test Run control. Actual debounced search QA126 adds q; switching to default Test Cases removes tab and preserves q. At768px ArrowRight focuses Test Runs without selecting, then Enter selects it and updates the URL. At375px cases and at768/1280px runs show correct black/white tabs, corresponding creation controls, search and filtered empty states. Focused invalid tab=unknown&q=QA126 deep link settles on Test Cases with the preserved keyword and filtered empty state. Temporary viewport overrides are reset. No Create/Save/Submit, customer mutation, comment, grant, credential change, DDL or deployment occurs. These observations do not establish mutable run/case persistence or server authorization.

Three new immutable JPEGs reside beside existing browser evidence, created with exclusive-write semantics on2026-10-06; the collection folder date is2026-10-05. Independent capture review is CLEAR at matching before/after hashes. Images contain app context but no address bar; URL, refresh and keyboard assertions come from the actual recorded browser observations, not the images alone.

| Actual view | Screenshot | SHA256 |
|---|---|---|
| 1280×800, runs, QA126 | [Desktop](./evidence/2026-10-05-browser/qa126-url-runs-desktop-1280.jpg) | 463a3a074e1d2403246797ab4418ac5b371ba0637651a2e39912bf6b85f6a103 |
| 375×812, cases, QA126 | [Mobile](./evidence/2026-10-05-browser/qa126-url-cases-mobile-375.jpg) | 9df998538bedf803dc3b723585c9084b4c49f19c086dff35ced2f615f85c4309 |
| 768×1024, runs, QA126 | [Tablet](./evidence/2026-10-05-browser/qa126-url-runs-tablet-768.jpg) | 861a55b2d9dd59621b7fde040e0bc556ec8111f4255da92faf65ef715ab8b431 |

The Feedback toolbar still overlaps navigation at1280 and obscures header/tab/search content at375/768. This is an observed remaining defect, not complete unobstructed mobile proof; reserved widget-cache configuration handoff and fresh-asset paint remain pending. Source116 host layering alone has not established the current browser fix.

Failed gates retained: production frontend typecheck exits2 with13 diagnostics in externally moving navigation build-scope-browser/rows, project-list/projects-page and teams team-home-page/member-section paths. No diagnostic names either126 path. Full-spec repetition waits for that same active migration; no passing full gate is inferred. Named-handler self-tests33 pass, real gate fails one outside-owned governance-qa-tables.tsx161 inline onClick. Feature-cycle self/real checks pass47 features/18 edges/7848 resolved imports/4688 files. Assertion self-tests48 and actual scan pass6840 files, with404 plain assertions and no prohibited suppression. No external file, limit, exception or generated artifact is changed.

```text
pnpm -C frontend exec jest --runInBand --runTestsByPath features/build/qa/test-cases-tab.test.tsx features/build/qa/test-runs-tab.test.tsx features/build/qa/qa-schema.test.ts
pnpm -C frontend exec eslint features/build/qa/qa-page.tsx features/build/qa/test-cases-tab.test.tsx --max-warnings 0
pnpm -C frontend type-check
```

Current unverified: complete QA execution, mutable persistence/read-after-write, actual six-role/project/tenant/PAT denials, effects/cache/audit/outbox, case/run concurrency/history, complete unobstructed mobile flow and deployment/operations. Isolated mutable target remains required. All535 task identities/text/statuses/stages remain298 checked/237 open; the URL recovery slice does not close any broad task or whole stage. Earlier124 tab-reset observations remain historical and are superseded only by this126 repair and browser evidence.

## QA run live-write124 reconciliation — 2026-10-06

Scope: root implements only the existing TestRunsService and qa-concurrent-edit.spec.ts, claimed before edits at backend97ee854b1. All controller/DTO/response/permission/generated/frontend files and external Ticket/automation work remain excluded. No new or deleted file, source comment, live Ticket comment, wrapper or schema. This supports open BT-9ea775d73705/BT-e19e42776b5a without a task or whole D/I/T/R/B/L closure.

Exact source commit backendb4ac2f72b records only the two frozen files with146 insertions/30 deletions after matching hashes, confirming the initially empty index, exact staging and staged diff. Both owned paths are clean and released; no external dirty/untracked path is staged or committed by root. Root retains the canonical five docs/tracker and port1000 integration, with physical R/B/L and repository-gate gaps still open.

Current verified source: a single UPDATE predicate retains run/organization/project identity, requires deletedAt IS NULL and compares the supplied version only when present. Every empty RETURNING is refused before completion auditing: supplied version retains409 and omitted version returns404. Initial unavailable records retain404; authorization and catalog/tester binding checks remain before the write. Existing optional-CAS request/consumer behavior is preserved. Completion still derives from the preceding snapshot; atomic or exactly-once audit history is not established.

Meaningful public-command RED:6 failures/12 controls/18 total10.233s against unchanged source, including both delete-after-lookup branches and omitted-version zero-row/scope-change refusals. Root replaces the existing canned RETURNING fixture with shared predicate/database evaluation, uses schema-valid version1 against stored2, and preserves the three prior CAS cases. GREEN18 passes6.205s; expanded regression208 tests/8 suites passes20.384s. Exact two-path zero-warning lint/diff passes. Two-root/one-existing-ambient/dependency TypeScript reports0 diagnostics51.262s using the actual backend working directory and unchanged tsconfig.test.json. Two preliminary in-memory invocations reference absent session variable names and never execute a product typecheck; corrected setup resolves the existing express.d.ts directly from that configuration. No diagnostic is suppressed.

Both independent backend/security reviewers report CLEAR at identical start/end hashes: service9231f0b52c499ec108ebfd0700ab346785fe67c88908d225e79dd2120204098b (487 versus482 lines) and testfa4bde960d0468f415cf9060b80218812ae9c2a8c18f17025229efe037f75c42 (177 versus66). No new300/500 crossing or exception. The frontend review confirms completion sends status without version, errors use the existing toast and only successful updates invalidate caches; missing detail GET already uses its null state. Optional version exposure and explicit conflict recovery remain separate open acceptance.

Final gate checkpoint124: serialized12GB production TypeScript exits1 with nine outside-owned Ticket fixture diagnostics: obsolete constructor arguments in ticket-command-paths113, build-ticket-system-detach117, project-subresources-cross-project355 and tenant-isolation72/90, plus removed automationRunner names and constructor arguments in update-assignee-notification71/73 and update-tenant-isolation59. These current failures supersede only the earlier123 broader automation error snapshot; no diagnostic names either owned QA path. Same full-test repetition waits for that active external signature migration. Static official vendor equality and fresh-generation checks pass at existing OpenAPI5442d474a43139d3 with417 schemas/331 hook-called operations; current-controller export/runtime parity is not inferred. No generator/config/ratchet file or external fixture is edited.

```text
pnpm -C backend exec jest --runInBand --runTestsByPath src/modules/build/qa/test-management-tenant-isolation.spec.ts src/modules/build/qa/test-runs-bola-binding.spec.ts src/modules/build/qa/test-runs-tenant-isolation.spec.ts src/modules/build/qa/qa-by-id-project-access.spec.ts src/modules/build/qa/qa-concurrent-edit.spec.ts src/modules/build/qa/qa-controllers-forward-actor.spec.ts src/modules/build/qa/bug-consolidation/test-run-cycle-bridge.spec.ts src/modules/build/lifecycle/build-delete-restore.spec.ts
pnpm -C backend exec eslint src/modules/build/qa/test-runs.service.ts src/modules/build/qa/qa-concurrent-edit.spec.ts --max-warnings 0
```

Current unverified: physical conditional UPDATE/CAS/delete races, real authenticated HTTP denial/status/contract, six-role/PAT/project/tenant matrix, application-role persistence/read-after-write, cache/audit/outbox effects, browser run completion/refresh/retry/mobile and deployment/operations. Shared predicate doubles are not PostgreSQL/RLS evidence. The read-only port1000 Test Runs empty view is observed, without Create/Save/Submit. Selecting Test Runs leaves the URL unchanged and normal reload resets to Test Cases; that separate UI defect awaits its own exact claim. Isolated mutable target and reserved widget-cache configuration handoff remain pending. No production fixture/mutation/DDL/grant/comment/deployment. All535 task semantics/statuses/stages stay298 checked/237 open.

## QA suite hierarchy123 reconciliation — 2026-10-06

Scope: root implements only existing TestManagementService, qa-scope-guards.ts and test-management-tenant-isolation.spec.ts, claimed before edits at backend561bd9ec0. Exact separate backend97ee854b19830199572cacdb1cf7ac6b570d9dfb commits only those three paths after matching final hashes, checking the initially empty index and exact staged inventory/diff. All three owned paths are clean and released afterward; external9c51fa0ef5 and its automation/Ticket dirty/untracked work are preserved without release clearance. The additionally reserved by-ID test is released unchanged after choosing conditional parent transactions. Existing DTOs, controllers, response schemas, permissions, generated artifacts, frontend and other QA commands remain excluded. No new or deleted file, generic hierarchy framework, source comment or live Ticket comment. Supports open BT-9ea775d73705 and BT-e19e42776b5a without a whole task or D/I/T/R/B/L closure.

Current verified source: supplied parent create/update commands use canonical runInTenantTransaction with explicit caller organization, joining the request transaction or opening its tenant transaction for other callers. The existing QA scope seam takes an organization/project-namespaced transaction lock, then reads at most100 ancestors in one projected recursive query. Both anchor and recursive hops require live rows in the same organization/project; visited IDs terminate existing cycles. Self/descendant/existing-cycle and unfinished depth-bound proposals fail400; missing or unavailable ancestry fails404 before writes. A complete100-ancestor chain is accepted. Omitted parents retain their previous path and fields. Suite updates include the live target predicate and reject empty RETURNING404. The lock serializes cooperating parent writers; it does not establish safety for every deletion, restore, revocation or non-cooperating writer.

Meaningful public-command RED:11 failures/45 controls/56 total in9.459s against unchanged source. Initial GREEN56 passes16.521s; expanded eight-suite regression193 passes25.881s. Independent review identifies an unrealistic depth100 positive containing only two rows; root replaces it with100 connected, consecutive ancestors excluding the update target. Corrected regression193 passes23.047s. A real assertion gate then catches the newly introduced forced raw-query generic: root removes it and converts the explicit numeric/boolean projection at use sites, adding no cast, schema or exception. Final regression193 passes29.292s; exact three-path zero-warning lint/diff pass. The initial scoped harness uses the outer repository working directory and misses Jest globals; root corrects only its in-memory compiler host to the actual backend directory, preserving configuration and without suppressing diagnostics. Corrected three-root/one-ambient/dependency TypeScript reports0 diagnostics57.399s, then final0 diagnostics84.508s after the guard correction. The original failures remain recorded, not reclassified as passes.

Independent backend_review107 and qa_security118 report CLEAR at identical start/end final hashes. Services/guard/test397/79/489 lines versus385/43/411 baseline; no owned300/500 crossing or raised exemption. Exact three-path diff163 insertions/37 deletions. Frontend reviewer runs the three unchanged QA case/run/schema suites:36 tests pass5.573s with12 observed consumer/test/hook/type/generated files retaining the same before/after hashes. Current port1000 browser remains the settled authorized QA Test Cases empty view; that read-only observation is compatibility evidence, not a suite mutation or physical hierarchy proof. Current consumers use flat options, have no suite-parent editor and do not traverse ancestry.

| Existing path beneath backend/src/modules/build/qa/ | Final frozen SHA256 |
|---|---|
| test-management.service.ts |4485c45aa2cc9156c7ad1d699b8c2b3aaf35f7e2a13ad377fc6b2193215ccfa6|
| qa-scope-guards.ts |e39c02ae56ff33df69705720dca0cd23baa7ef0cdbac87f70e6de6df1a0b70de|
| test-management-tenant-isolation.spec.ts |28034808fa49ceee74a03fe4af4434810feed244572583521d535d4c839acad5|

```text
pnpm -C backend exec jest --runInBand --runTestsByPath src/modules/build/qa/test-management-tenant-isolation.spec.ts src/modules/build/qa/test-runs-bola-binding.spec.ts src/modules/build/qa/test-runs-tenant-isolation.spec.ts src/modules/build/qa/qa-by-id-project-access.spec.ts src/modules/build/qa/qa-concurrent-edit.spec.ts src/modules/build/qa/qa-controllers-forward-actor.spec.ts src/modules/build/qa/bug-consolidation/test-run-cycle-bridge.spec.ts src/modules/build/lifecycle/build-delete-restore.spec.ts
pnpm -C backend exec eslint src/modules/build/qa/test-management.service.ts src/modules/build/qa/qa-scope-guards.ts src/modules/build/qa/test-management-tenant-isolation.spec.ts --max-warnings 0
pnpm -C frontend exec jest --runInBand --runTestsByPath features/build/qa/test-cases-tab.test.tsx features/build/qa/test-runs-tab.test.tsx features/build/qa/qa-schema.test.ts
```

Gate checkpoint: self-tests pass52 assertion,65 size,16 over300,32 projection and44 loop-call checks. Real projection gate passes. Final assertion gate has no owned violation and still fails three unledgered raw-row files, one stale raw entry, five unledgered plain-assertion files, two growth files and six stale ceilings outside this package. Size gate fails44 outside-owned files; over300 fails540 versus413 with no new crossing in the owned paths. Loop-call gate fails10 unclassified files,10 stale classifications and three stale verdicts outside this package. No ceiling or classifier is edited. A production TypeScript pass before the final guard conversion is only a historical checkpoint. The final serialized12GB production command exits1: external automation callers reference removed runForTicketEvent, and external Ticket fixtures retain obsolete constructor arguments/automationRunner dependency fields (TS2339/TS2554/TS2353). No diagnostic names the three owned paths. Full test-inclusive TypeScript is not repeated while the same external migration is unfinished; no pass is inferred. Exact source checks remain bounded, and concurrent external source is not covered by frozen package release clearance.

Final static checks: official vendor equality passes at OpenAPI5442d474a43139d3; generated schema/hash/semantic fresh-generation checks pass417 schemas/331 hook-called operations. These compare existing artifacts; current-controller OpenAPI boot/export is not performed. Official TODO apply/check and execution-plan validation pass78 pages,29 coverage requirements,36 implementation requirements,16 architecture decisions,18 packages and72 canonical Markdown links. Native comparison against rootf13aac664 proves every535 ID/text/status/stage/evidence tuple unchanged except source anchors. Root-owned diff checks pass.

Current unverified: physical CTE execution, actual authenticated400/403/404, six-role/PAT/project/tenant denial, opposite concurrent parent moves, deletion/revocation races, persisted hierarchy/read-after-write, cache/audit/outbox effects, restoration of historical corrupt data, suite browser/mobile mutation and deployment/operations. Explicit recursive projection doubles and rendered SQL assertions are not PostgreSQL/RLS evidence. No production fixture, record/grant/DDL/comment mutation or deployment; isolated mutable target and reserved widget-cache config handoff remain pending. All535 task semantics/statuses/stages remain298 checked/237 open.

## QA tester eligibility122 reconciliation — 2026-10-06

Scope: only existing TestRunsService and test-runs-bola-binding.spec.ts, claimed before edits at backend55d9c189ba2f79d061476ffa8bcd24384f840eca. Root implements source and tests directly; shared assignment/AccessService, controllers, DTOs, response schemas, permissions, frontend/generated files, onboarding/config and external settings remain excluded. Exact separate source commit561bd9ec00c85f7d74b22815b9e32ff015e9f428 includes only those two paths at their frozen hashes, after checking an empty index, exact staging and staged diff. The owned paths are clean/released; external8618ab0f0 plus moving automation/composition/trigger files and frontend hook/consumer extraction are preserved without release clearance. No new source/helper/API/schema/file/comment or live Ticket comment. Supports open BT-9ea775d73705/BT-e19e42776b5a without a task or whole D/I/T/R/B/L closure.

Current verified source: both run creation/update pass the existing projectId to tester resolution. After canonical active organization actor resolution, the existing resolveProjectAssignableMemberships must return the same membershipId for that user in the direct project roster. Only then does existing AccessService.moduleAvailabilityFor check Build availability for the target IDs. Missing/foreign org/project/mismatched membership and unavailable Build refuse404 before writes; inactive organization membership remains403, and unexpected infrastructure errors propagate. Omission skips actor/project/module eligibility reads and preserves stored tester fields. This adopts the existing Ticket/Intake assignment roster used by the current QA picker; managers/team-only/global visibility do not replace direct assignability. Module availability does not prove positive module assignment or build:qa:execute permission and grants no new authority.

Meaningful public-command RED16 failures/41 controls in3.543s against unchanged source; the existing fixture evaluates actual shared assignment JOIN/WHERE predicates and mocks only the canonical availability interface. GREEN57 passes3.282s; after the precise unavailable-target message change, the six existing run-binding/tenant/by-ID/concurrency/actor/cycle suites pass113 tests14.54s. Exact two-path zero-warning lint/diff pass. Existing-config two-root/one-ambient/dependency TypeScript reports0 diagnostics43.156s. Security qa_security118 and consumer/backend_review107 are independently CLEAR at identical start/end frozen hashes; no reviewer edits. Source/test482/242 lines versus476/196 baseline, no crossing or exception increase; exact diff58 insertions/6 deletions.

| Existing path beneath backend/src/modules/build/qa/ | Frozen SHA256 |
|---|---|
| test-runs.service.ts |ca26d2ff58e8eb722295d69c3437cba4e1f914f0454cf60cd72ca89af96a0830|
| test-runs-bola-binding.spec.ts |a98c2dbe10b7e6a5c8035631fd5390ce543f6092bace44bb716b91963590bee8|

```text
pnpm -C backend exec jest --runInBand --runTestsByPath src/modules/build/qa/test-runs-bola-binding.spec.ts src/modules/build/qa/test-runs-tenant-isolation.spec.ts src/modules/build/qa/qa-by-id-project-access.spec.ts src/modules/build/qa/qa-concurrent-edit.spec.ts src/modules/build/qa/qa-controllers-forward-actor.spec.ts src/modules/build/qa/bug-consolidation/test-run-cycle-bridge.spec.ts
pnpm -C backend exec eslint src/modules/build/qa/test-runs.service.ts src/modules/build/qa/test-runs-bola-binding.spec.ts --max-warnings 0
```

Serialized production TypeScript fails at the10GB heap limit after approximately200 seconds with a real JavaScript heap OOM and exit1; no pass is inferred from that attempt. After checking available physical memory, one serialized12GB production retry exits0. Root then rechecks the reserved onboarding fixture read-only against current source instead of assuming120's full-gate error still exists: existing-config one-root/ambient/dependency TypeScript reports0 diagnostics25.210s. Preview95f3b3b95e87be624d4397e10a7e82156fc8c90bc1012a93b5ad3c115365fc38 and schema263012d3968b312a965277b8bb7691576519e2cbeccf99482aa8b695c8567344 are unchanged before/after. No onboarding edit/handoff is needed; the earlier full failure stays historical evidence. The justified fresh serialized12GB full test-inclusive retry exits0 before the exact source commit. These current-workspace passes supersede the prior pending/failing gate status only at this checkpoint; the historical failures stay recorded and moving external source is not declared release-ready. Repository assertion/size/over300 failures are retained without changing unowned ceilings. Current unverified: real HTTP/role/tenant/PAT denial, positive module assignment and QA execution permission, physical concurrent revocation, persistence/refresh, atomic audit/outbox/cache/events, browser/mobile mutation and deployment/operations. No disposable production verification; isolated target and reserved cache-config handoff remain pending.535 task semantics stay298 checked/237 open.

Widget cache observation: current local `/feedbucket-widget.js` returns200 with `public, max-age=86400, stale-while-revalidate=604800`. The existing unversioned embed URL shares next.config.ts's logo asset rule, while the local built bundle contains116's correct positioned host. Read-only current browser DOM at port1000 still shows the old host at position static/z-index auto with ':host { all: initial; }'; ordinary reload/key action is not fresh-byte proof. The smallest planned policy correction is an exact revalidation rule for mutable widget JS while retaining existing logo/icon and security policies. Config/its redirect test remain reserved to migration_repair pending exact release. Such a policy does not retroactively expire fresh cached entries; actual browser asset/paint proof remains open. No cache bypass, script injection, source/contract mutation or new capture occurs.

## QA request-binding120 reconciliation — 2026-10-06

Scope: six existing backend files claimed before edits at outer51a57e2a4/backend11eb3509a. Root implements the three production files; backend_review107 owns three focused suites until frozen handoff. External analytics/metrics/composition/activity/Ticket-comments/KB work is excluded and preserved, including external backend8198333a81286ffc32ce18a6c2f773e8d81432d5 and later258b9e57929f36f13051721029b5ea696673bf13. Exact separate source commit55d9c189ba2f79d061476ffa8bcd24384f840eca contains only these six QA paths; all final hashes match before staging, the exact staged inventory and diff checks pass, and the backend worktree is clean immediately afterward. No new source, helper, DTO, schema, API, generated file, migration, permission or Markdown file; no comments or live Ticket comments. Supports open BT-9ea775d73705/BT-e19e42776b5a without advancing a whole task or D/I/T/R/B/L stage.

Current verified source: run creation now checks every supplied release and suite against live org/project records, including a suite supplied alongside explicit caseIds. Cycle create/update lookup includes projectId and returns404 for missing, deleted, foreign-project or foreign-org rows. Valid empty suites remain valid; the strict run-update DTO still has no suiteId. Case create/update checks the live project suite and invokes the full caller's canonical Ticket read authorization for linkedTicketId, including data-scope refusal. Suite parent creation reuses the existing QA guard seam and parent updates now use the same live org/project check. Omitted fields preserve current behavior; no new duplicate ID-validation or permission owner.

Current verified tester binding: only undefined skips the canonical organization actor resolver. Supplied blank/whitespace/missing/foreign identifiers fail404; inactive membership uses the canonical403 mapping. Unexpected query errors propagate. Successful create/update writes the resolver's matched testerId/testerMembershipId pair; omitted updates write neither field. This establishes active organization membership at lookup only, not Build/project assignment eligibility or protection against later revocation.

Meaningful public-command RED:52 failed/42 passed/94 total in10.086s against unchanged production files. Catalog/actor fixtures evaluate real query predicates; linked Ticket fixtures evaluate real row WHERE/JOIN predicates while isolating reachable/inScope SQL projection booleans. Author GREEN94/3 in9.23s and expanded221/14 in38.723s; root repeats221/14 in40.743s. Exact six-path strict lint/diff pass. Initial existing-config six-root/one-ambient/dependency TypeScript fails one owned TS2502 because the test callback parameter shadows its outer tx fixture. Root records a single-path handoff, renames only the type-only parameter, then obtains fresh94/3 in8.675s, strict lint/diff and corrected scoped TypeScript0 diagnostics62.347s. Independent author review reverses that one rename to reproduce the original frozen test hash exactly. The initial failed gate remains part of this receipt.

Independent frozen-source security and consumer review are CLEAR at the six hashes before the type-name correction; the sole later management-test correction is separately CLEAR at91e85271f905. Final qa_security118 review rechecks all six revised hashes and is CLEAR without further edits. DTOs, response schemas, endpoints and frontend request/parser shapes remain unchanged; empty UI tester selection is still omitted. Final production service sizes476/385, guard43; tests196/411/239. Baseline sizes452/384/30 and105/318/239 show no owned crossing of300 or500 and no new exemption. Exact package diff277 insertions/55 deletions.

| Existing path beneath backend/src/modules/build/ | Final SHA256 |
|---|---|
| qa/test-runs.service.ts |f02fa67620fb38af74a4c7841351d27e0afb605f2f1f2bbe83eb74c91a2077b2|
| qa/test-management.service.ts |1a17dc722eeb3c236cd566d38349bf1bde4d659d27a2cbb8f8eaed74e3c056a4|
| qa/qa-scope-guards.ts |64324e21105652e2faa4c30b9da5dad4292f1fe39c434303c0ea5ad4f93e5e16|
| qa/test-runs-bola-binding.spec.ts |b0f809fda3ec920bb25398b7bf676ec7eba356d8b6ef405cf0803dea4152dabd|
| qa/test-management-tenant-isolation.spec.ts |91e85271f9053feb82e95d12738c66402b8019556da48dd072c4360f701c47f0|
| qa/bug-consolidation/test-run-cycle-bridge.spec.ts |1691876149b48ab2ca056c659eae68f59e7e610ac25f348ecb34629f445b9484|

```text
pnpm -C backend exec jest --runInBand --runTestsByPath src/modules/build/qa/test-runs-bola-binding.spec.ts src/modules/build/qa/test-management-tenant-isolation.spec.ts src/modules/build/qa/bug-consolidation/test-run-cycle-bridge.spec.ts
pnpm -C backend exec eslint src/modules/build/qa/test-runs.service.ts src/modules/build/qa/test-management.service.ts src/modules/build/qa/qa-scope-guards.ts src/modules/build/qa/test-runs-bola-binding.spec.ts src/modules/build/qa/test-management-tenant-isolation.spec.ts src/modules/build/qa/bug-consolidation/test-run-cycle-bridge.spec.ts --max-warnings 0
```

Fresh serialized production backend TypeScript passes with10GB and no incremental cache. The initial full test-inclusive12GB run fails one TS2554 in externally affected build-cross-tenant-lookup.spec.ts145; the isolated121 correction below precedes a fresh full-gate retry. That retry exits1 with one TS2322 in externally committed org-setup-preview.spec.ts148: the selected module array widens to string[] instead of the existing module-key union. The active onboarding ownership remains authoritative and that file is untouched pending exact handoff. No OOM or full-test pass is inferred. Self-tests52 type-assertion/65 file-size/16 over300 pass. Real repository assertion gate fails three unledgered raw-row files, one stale raw-row entry, six unledgered plain-assertion files, two growth files and six stale ceilings, all outside the six QA owners. File-size gate fails44 outside-package files above500; over300 fails539/413. No baseline or exception changes. Official vendor equality/fresh generation comparison passes OpenAPI5442d474a431,417 schemas/331 operations; tracker and execution-plan checks pass71 specifications/116 research,78 routes and72 canonical Markdown files. Native comparison proves535 unchanged task IDs/text/statuses/stages/evidence; only source anchors move. These are static/source integration checks, not a current-controller backend OpenAPI boot or deployment check. R/B/L remain Current unverified: real synthetic HTTP contracts/statuses, application-role persistence, tenant/role/PAT denial, current tester module/project eligibility, concurrent catalog/membership revocation, suite ancestry, mandatory run/result CAS, versioned case/attempt retention, atomic audit/outbox/cache, actual browser mutation and deployment/operations. No disposable production write, fixture or DDL occurs; an isolated target remains required.

Activity fixture121: the single existing `backend/src/modules/build/core/build-cross-tenant-lookup.spec.ts` is clean/unclaimed before root's exact reservation. Its old three-argument Activity constructor matches baseline8198333a, while active external source has one dependency; root removes only two obsolete arguments at that one call. Five existing public-behavior tests pass3.197s, exact strict lint/diff pass and independent backend_review107 is CLEAR at begin/end SHA2567a6e1117bac0b9d4683f9b81cefb8e9641c64608b7877a28d7832da9a6c921c2. No assertion or production byte changes; every Activity/collaboration/Ticket/KB source remains excluded. While the full retry runs, externalb9f17e384e4f950eb6bc4b7add26b8c942ee8bdd incorporates this exact one-line correction. Root confirms the committed diff and matching current hash, preserves that integration, releases the test and does not repeat it in another commit. The full retry fails the distinct onboarding fixture noted above. Supports open BT-05e68784a2c2 as typed fixture integration only, not physical behavior or whole task/stage closure.

Current browser observation: normal port1000 QA reload and the documented browser ctrl+shift+r action still leave the actual same-origin feedbucket-root at position static/z-index auto with old ':host { all: initial; }'. The local widget116 source/bundle fix is separate historical source proof; neither action establishes that new bytes painted. No DOM/script injection, cache-clearing workaround, submission or new screenshot occurs; two post-fix116 captures stay pending and next.config.ts remains externally reserved. Existing immutable115 evidence is preserved.535 task semantics remain298 checked/237 open; no broader QA or overlay closure.

## QA live-parent and defect-command118 reconciliation — 2026-10-05

Scope: the13 existing Backend118 paths claimed before edits, followed by a root-only two-line SQL-scope narrowing in the same BugsService. No new source/test/schema/API/helper/Markdown file, migration, generated contract or comment. All external planning-graph, portfolio, goal, Ticket, import/export and other working changes are excluded. Supports open BT-9ea775d73705/BT-e19e42776b5a without closing either task or any whole D/I/T/R/B/L stage. Exact separate backend source commit11eb3509ad8f48eb9a55c9f0178b12454c2150c5 follows reviewed final checks; physical runtime proof remains open.

Final integration118: root's sequential existing-config final production and test-inclusive backend TypeScript both exit0 after the fail-closed narrowing. The pre-narrowing production pass is a separate historical checkpoint. Both final heavy gates finish before committing, with no OOM or suppression. External process commits its separately owned planning work as0ba605b2051591e19bea5e358c58d5ee0ca9d2d4 during verification; root preserves it, rechecks every owned frozen hash and an empty index, stages exactly13 paths, confirms the exact index and commits only the reviewed QA package. Backend worktree is clean immediately afterward. Fresh contract-vendor equality and official generator comparison pass at OpenAPI5442d474a431 with417 schemas/331 operations. Official tracker/route/link checks pass71 specifications/116 research files,78 pages and72 canonical Markdown files; native semantic comparison proves535 unchanged IDs/statuses/stages/evidence/text, with only source-line anchors moving. This is source integration, not deployment or clearance of external changes.

### Current verified implementation and focused proof

Result writes now select against the matching live parent run and repeat all org/project/run/result/live-parent predicates in UPDATE FROM RETURNING. A retained result under a deleted, mismatched or foreign parent is refused; identical replay is checked only after the parent lookup. A write whose binding disappears returns404 instead of an undefined success. Database call count is unchanged. Predicate tests are source-level proof, not a PostgreSQL locking or isolation result.

Result-origin defect creation now belongs to the existing BugsService command that owns canonical Ticket creation, QA-detail materialization and publication. Its sole controller injects that already registered service directly; the old TestRunsService command and unused constructor dependency are removed, and every affected explicit constructor/caller test is adapted. This is a real transaction/projection seam, not a forwarding service. Ordinary Bug creation keeps its existing validated bindings, defaults and return projection.

Origin lookup requires the same matching live parent. Result linking is guarded inside the Ticket/QA-detail transaction; zero linked rows throw before returning from the callback, publication or audit. The focused fixture evaluates actual query predicates and staged inserts, refusing deleted/mismatched parents and binding loss between lookup and linking. Its rollback model covers Ticket/QA-detail tables, not physical creator activity/outbox writes, concurrent PostgreSQL transactions or an ambient request transaction.

Independent consumer review finds a historical response defect: result-origin creation returned a bare Ticket while its unchanged controller and frontend require bugRowSchema QA fields. Persisted creation could therefore appear to fail at frontend parsing before invalidation/success callbacks. A meaningful RED against the actual existing schema fails on14 missing QA fields with a valid base Ticket. Both commands now return the already materialized QA enrichment, null ownership/default fields and canonical Ticket version. The real schema parses the positive and persisted QA-field assertions remain; there is no new schema, invented persisted value, response family or extra query. HTTP201, endpoint, body validation, permission keys and frontend query keys remain unchanged. No production creation/retry experiment occurs.

Meaningful RED checkpoints: result-parent protection6 failures/13 passes; origin protection9 failures/5 passes; declared response1 failure/14 passes. Author final121 tests/11 suites pass29.747s, exact13-path zero-warning lint/diff and existing-config scoped TypeScript pass. Root repeats121/11 at32.554s before narrowing, then121/11 at24.615s after narrowing. Final exact13-path strict lint/diff pass; root13 changed roots plus one existing ambient declaration/dependencies pass0 TypeScript diagnostics50.822s. No test-inclusive gate is inferred from these scoped results.

```text
pnpm -C backend exec jest --runInBand --runTestsByPath src/modules/build/qa/test-runs-tenant-isolation.spec.ts src/modules/build/qa/qa-by-id-project-access.spec.ts src/modules/build/qa/test-runs-search-predicate.spec.ts src/modules/build/qa/test-runs-bola-binding.spec.ts src/modules/build/qa/qa-concurrent-edit.spec.ts src/modules/build/qa/qa-controllers-forward-actor.spec.ts src/modules/build/qa/bug-consolidation/test-run-cycle-bridge.spec.ts src/modules/build/qa/bug-consolidation/bug-test-run-link-survival.spec.ts src/modules/build/qa/bug-consolidation/legacy-bug-writer-unreachable.spec.ts src/modules/build/lifecycle/build-delete-restore.spec.ts src/modules/build/qa/bugs.service.spec.ts
```

### Current verified independent review and standards correction

Security reviewer qa_security118 independently matches all13 frozen hashes and reports CLEAR for live-parent scope, command ownership, staged rollback, response enrichment and retained actor/permissions. Independent frontend_review101 matches command/controller/origin-test hashes and reports consumer CLEAR. Root's subsequent real type-assertion gate catches the newly added scope non-null assertion: BugsService grows1→2. Root records the single-path handoff, rejects an absent scope before querying and passes the narrowed SQL without that assertion. Security review repeats CLEAR at final BugsService8fec3de6a54520ecece40db5ba4ddabfebb5e32f23b43b5a6a9756c0c7b7c995. Every prior predicate/transaction/response behavior remains reviewed; the final focused/scoped/lint results above cover that change.

Final production services are452/488 lines; origin test203, tenant test459, by-ID test495. Existing query/response/DTO/permission/module owners are reused. Final13-path diff is358 insertions/361 deletions. Read-only ordinary BugsService regression test stays unchanged. Baseline backend4517bb218f1fd6aa8319ea192db1acbfbebd0d05 and external ancestry are preserved.

| Existing claimed path beneath backend/src/modules/build/ | Final SHA256 |
|---|---|
| qa/test-runs.service.ts |9217d5b31f9844c749b07b789f1fd2cbb2f56762b4d8ee1f5342251f103ad14a|
| qa/bugs.service.ts |8fec3de6a54520ecece40db5ba4ddabfebb5e32f23b43b5a6a9756c0c7b7c995|
| qa/test-runs.controller.ts |7341057e78392458a1671e424bddea58213d956e1a831fc858e714d018d5fd2b|
| qa/test-runs-tenant-isolation.spec.ts |4f27d34db4506e98718d52f43df637833b85fd3230557be79f97a6e28b636360|
| qa/qa-by-id-project-access.spec.ts |523c652717644c1ce61185a6bd6aafae60eaecb5e9d61c2338c12ac6899bbc30|
| qa/test-runs-search-predicate.spec.ts |acbc8af3a50a840c834af7cd0152b8a1cca521082ad9152ca9fab6451767e895|
| qa/test-runs-bola-binding.spec.ts |851194764e85a1d8d2970e9035775d903906965fd15b115e20420f2f03302b88|
| qa/qa-concurrent-edit.spec.ts |d8479f0e51c375324c2b48a9f010371a747f47eae5c1b4b6d008c3fe167f06a8|
| qa/qa-controllers-forward-actor.spec.ts |fd53b03c810a252cb1f5ca43e78cc64e3debb0327c851e8a21534b301cba5d5b|
| qa/bug-consolidation/test-run-cycle-bridge.spec.ts |6816a823efa866611d5484ac96a267fb6765db920487e378834c3dca82cb3794|
| qa/bug-consolidation/bug-test-run-link-survival.spec.ts |625762a3dfd6fbdba33c74712112237e3f29794098e97f29250e25e7a21184a8|
| qa/bug-consolidation/legacy-bug-writer-unreachable.spec.ts |1b50781b1bcea2aaf4a7ec7e3699eec7e9dcc8f842ca58e2ce5f20e9deab4dc1|
| lifecycle/build-delete-restore.spec.ts |f62f6ab506cafa6df5ca67af083b285e8c17660f76f314cea8d1a6deb2945826|

### Failed repository gates and Current unverified acceptance

The52 type-assertion and8 canonical Ticket-write self-tests pass; the real Ticket-write scan passes369 sources with its existing2 grandfathered update bypasses, zero new/stale bypasses and one creation module. The real assertion scan still fails unrelated raw-row/plain-assertion/stale-ledger entries. After root narrowing it no longer names BugsService; no exception ceiling is raised. Size self-tests65 and over300 self-tests16 pass, but actual size scans fail44 unowned files above500 and540 files versus413 over300. Measured owned files create no new threshold crossing. These are failed repository gates, not a full green release or an authorization to refactor other owners' files.

Before the narrowing, production backend TypeScript exits0. The final integration above supersedes pending full-gate wording: production and test-inclusive gates both exit0, run sequentially from backend with `node --max-old-space-size=10240 node_modules/typescript/bin/tsc --noEmit --incremental false -p tsconfig.build.json`, then `node --max-old-space-size=12288 node_modules/typescript/bin/tsc --noEmit --incremental false -p tsconfig.test.json`. Contract definitions/decorators have not changed; generator/vendor freshness remains an independently recorded static check.

Current unverified: isolated real401/403/404/409/validation responses, authenticated persistence and denial invariants, six-role/object/tenant matrix, physical parent-deletion concurrency, ambient transaction/creator outbox effects, request idempotency/replay, mandatory run/result CAS, suite/ticket/release project bindings, transactional audit/attempt history, result-origin browser/cache refresh and deployment/operations. No QA mutation, deployment or customer-data cleanup occurs. Configured application-role metadata has no scratch_e2e target; PATH has no psql/pg_ctl/initdb and the default Windows PostgreSQL directory is absent. This bounded inventory does not prove every possible tool location or authorize provisioning on the production cluster. Approved isolated credentials and fresh widget browser bytes remain pending user input.535 task identities/statuses/stages stay298 checked/237 open; no broad item is completed from this source package.

## QA forms115 and widget116 reconciliation — 2026-10-05

Scope: bounded existing QA form accessibility/state repair, actual port1000 open/Cancel/reset observations, existing feedback-widget paint correction and canonical QA error import. All production observations are read-only; no case/run/result, ticket comment, feedback submission, grant or financial record is written. The new user attachment prohibits disposable production verification. No broad BT checkbox or D/I/T/R/B/L stage advances;298 checked/237 open/535 total remains tracker state, not release readiness.

### Current verified QA source, focused checks and review

Commit `cb56518f9` contains exactly six existing QA schema/sheet/test paths. Both sheet headers now reuse the shared screen-reader SheetDescription. The run form is the single owner of mode/selected case IDs, using existing useWatch/reset/setValue and dirty registration. Explicit Cases mode rejects zero, invalid and duplicate IDs; selected IDs alone enter the existing wire payload. Suite mode preserves its optional-suite/all-cases behavior. Cancel is a button, and closing/reopening resets name/mode/selection. No new source file, helper, component, API, schema family, query key or comment is added.

Meaningful accessibility RED has2 failures/21 passes before the header fix. The subsequent explicit-selection RED has7 failures/18 passes. A baseline synchronous effect setter was exposed by strict lint and repaired through the existing form owner, without a render setter, transition-only workaround or duplicated local state. An ESM spy instrumentation attempt fails before the canonical dirty-state mock is corrected; that attempt is not product evidence. Final author36 tests/3 suites pass9.859s, exact six-path zero-warning lint/diff and ambient-aware scoped TypeScript pass. Root90 tests/6 suites pass14.156s, exact strict lint/diff pass and both existing-config production/full-spec TypeScript exit0, run separately with10GB heap. These115 full-gate passes precede the later116/117 edits, which require fresh checks.

```text
pnpm -C frontend exec jest --runInBand --runTestsByPath features/build/qa/test-cases-tab.test.tsx features/build/qa/test-runs-tab.test.tsx features/build/qa/qa-schema.test.ts features/build/reports/reports-quality-tab.test.tsx features/build/reports/reports-tabs.test.tsx features/build/shared/use-build-list-filters.test.tsx
pnpm -C frontend exec eslint features/build/qa/test-case-sheet.tsx features/build/qa/test-run-sheet.tsx features/build/qa/test-cases-tab.test.tsx features/build/qa/test-runs-tab.test.tsx features/build/qa/qa-schema.ts features/build/qa/qa-schema.test.ts --max-warnings=0
```

Independent frontend_review101 is CLEAR against2b0bcf20a at matching six hashes: case sheet4d2376b721f5a16e6404813c9877727330dd4a226a0ca15038cff1c203b5ff66; run sheet6ec411ca39bb0e1565e0e87b9f5a245c0d4e1586519f34ac41dcc9493370266f; case-tab test507344fac1b6e89e1ce2f3e6ea6f49bbf1a2b05d667f4ed0abf9ed349fa880d6; run-tab test588a2d95535b808b476496563049aa977f101c648eb4c6da4d856d1e3174e8d8; schema7216ccde5b366abb911c9bc1edaae9377eda24dfe3586e81cb6499c78cf07f99; schema test a262be9c06c0e2635906306a511dacbebfed1b6f2df5fe1aee8b746827c587fc. Existing assertions are retained; source413/288 lines and run test299 stay within the recorded size constraints. Focused forwarding tests are not physical submission proof.

### Current verified bounded browser115

After tool-session reset the browser inventory is empty and the initial tab gets connection refused. Actual1000 listener inventory is empty. Root starts only the existing `pnpm -C frontend dev`, with unchanged environment; Next16.3.8 becomes Ready in1249ms. First new navigation times out, then the actual settled authenticated Quality page renders200 and Open QA reaches `/build/1/qa`. No process is terminated, no cache/env/source configuration is changed, and no alternate port is used.

At1280×900, New Test Case's actual dialog links its accessible description to “Define the test steps and expected results for this project.” Cancel closes the form and restores New Test Case focus. At375×812, New Test Run links “Choose tests and execution details for this project’s test run.” A local unsubmitted name and By Cases selection display the genuine No test cases found state; Cancel closes it and restores New Test Run focus. At768×1024, reopening has an empty name and By Suite selected. Dialog widths are512/375/512; document clientWidth equals scrollWidth at all three widths. Viewport is reset and Back returns to Quality. Create/Save/Submit is never invoked, including for expected validation refusal. Browser does not prove selected-case dispatch, validation denial HTTP status, dirty-route protection, persisted QA data or authority matrices.

New console entries after the baseline contain6 chart-dimension warnings, zero errors and zero missing-description warnings. This is bounded sampled-session evidence, not a clean-console or isolated chart attribution claim. The mobile feedback toolbar visibly covers Name/Test Selection labels; the immutable [mobile issue capture](evidence/2026-10-05-browser/qa-run-cases-mobile-375.jpg) supplies the116 paint defect. Other captures: [accessible case sheet desktop1280](evidence/2026-10-05-browser/qa-case-description-desktop-1280.jpg), [reopened reset run tablet768](evidence/2026-10-05-browser/qa-run-reset-tablet-768.jpg). SHA256 respectivelyca84553f069dea2f7aaeaa2b8442cb4d5c052bd8ca9d2f2d358bf0f755b46cd1 (51264 bytes),18400e0a438a7551dd97a8a48f54a08ce84a59f6bf19465c68f2acbf138cae74 (17001 bytes),3fba8e28a7e40014f4f479cb94ef8c52467cc3b0decd6b1a33e4e1eb3a1e3b4d (30528 bytes). No prior evidence is overwritten.

### Current verified widget116 source; browser paint Current unverified

The body-mounted widget shadow host has no stacking context; internal toolbar/mobile panel/backdrop layers exceed the app's existing z50 modals. Root changes only the existing host declaration to position relative/layer40. Fixed viewport positioning, dragged location, internal ordering and pointer/focus behavior stay in their existing owners. This affects every public embed: host-page overlays above40 intentionally cover feedback chrome. No modal/component observer, duplicate helper, new file or comment is introduced.

The first CSSOM test attempt fails because jsdom's cssRules has no item method; corrected array/getPropertyValue instrumentation then gives meaningful1-failure/9-pass RED for the missing positioned host. GREEN10 tests/2 existing styles/focus suites pass1.331s. Exact source/test strict lint/diff pass; `pnpm -C frontend build:widget` regenerates the public asset successfully. Independent review is CLEAR at stylec5b63f0ed952cdc0a0c1891f6e2599755509fc044856bb2f4c11f5ce19f08d01, test2c88b3026cf40401ab0285d2e97297a030ef9ea04a22fe24eea8c9eb81200af5 and generated2840cc5958ebfafd536c762153e0cf1d9b95477cf70417866725e893ba15104a. Independent byte comparison confirms replacing the one changed declaration restores the previous bundle exactly; no other generated behavior changes. CSSOM/focus tests cannot prove paint/hit testing.

At17:33:57.605Z, direct local public-asset HTTP200 serves exactly the generated disk bytes, but Cache-Control is public,max-age86400,stale-while-revalidate604800. The browser after reload still exposes the old :host declaration with static/auto computed style. The first post-reload heading wait also times out; the later settled Quality page is genuine. An ordinary hard-reload shortcut produces no fresh widget bytes. Root requests normal human hard reload and does not inject a script, bypass a security policy or relabel cached behavior as corrected.116 app-modal375/768/1280 paint/hit testing, actual widget-panel/focus behavior and two proposed final captures remain pending. Read-only design identifies the lasting cache owner in next.config.ts: separate this mutable widget from logos and allow conditional revalidation. That config is reserved and517 lines; no unauthorized header edit or manual version/API/manifest workaround is applied.

### Current verified QA import117; remaining acceptance

Stable116/117 integration now passes sequential existing-config frontend production and full-spec TypeScript with10GB heap. Source commits are QA forms `cb56518f9a9ee6e6e84e97cdb868a5fb4345c7a5`, canonical import `7f6a8ecb4739e4511295e2c55b416f6646b35660` and widget `2ca80dbc01b93c7abd5db34585ef28b93dfc1e85`, each exact-path only. This supersedes the pending full-gate wording below at that stable checkpoint, without advancing cached-widget browser proof or backend release scope. Current contract-vendor equality and fresh generator comparison pass417 schemas/331 operations at OpenAPI5442d474a431; no contract is manually edited. Official tracker/execution-plan links pass71 specifications/116 research files,78 routes and72 canonical Markdown files. Comparison with the prior tracker shows535 identical IDs/statuses/stages/evidence/descriptions and no semantic change; only generated line anchors move.

Size119 corrects only the stale existing Project Board test exception count709→707, preserving54 existing rows, every reason/date/removal trigger and unchanged test SHA25604f2045cc19335ad2cd4fdbc674a721be0c3271288024529da25a240f52c4697. Independent review is CLEAR at registry3be05ff0743f5e1bee443e475e3bdb9c82d1fa89b1ab1e9b98b3a23f3e852be9. Initial stale-registry gate fails; after correction all65 self-tests and the actual7469 in-scope/54-exception scan pass.1073 CRM/Inventory files remain outside that decision. The separate over300 gate still fails737 versus724; do not raise its baseline or report a full green release. Exact nine owned-source/test comparison against2b0bcf20a proves zero new over300 crossings; widget files remain excluded by that ratchet. No source is split mechanically or deleted to conceal the failure.

Existing frontend/CLAUDE FE-77 requires isApiError from api-envelope, not api-client's re-export. Root moves only the import into the hook's existing owner import; source SHA2567b447955210aed54bbf69c2f1c6e51527aa34c7e6e03c71f262b5dacccfc7f4b has matching-hash independent CLEAR. No implementation-mirroring test or new source is created. Existing47 tests/5 Quality/run/search/widget suites pass17.502s, exact strict lint/diff pass. Scoped three changed roots plus four existing ambient roots pass0 diagnostics8.56s after fixing the verification compiler host's working directory; the first native attempt had23 missing type-library/Jest diagnostics and did not pass. No source/config change suppresses those failures. At that first scoped checkpoint the full gates were pending; the stable integration above supplies the subsequent production/spec passes.

At17:07:27.525Z, existing canonical APP_DATABASE_URL-only max1 READ ONLY role/pg_database metadata establishes nonsuperuser/non-BYPASSRLS application access, but scratch_e2e does not exist and is not CONNECT-able. No customer table, fixture, DDL, owner fallback or mutation is used; connection closes afterward. Docker/Podman are unavailable. Root requests an approved isolated target with locally configured credentials. A captured-mail runner alone is insufficient because it inherits database configuration; do not launch it against production. Database existence checks are not schema-head/provenance proof.

Backend117 read-only48 tests/3 existing tenant/object suites pass11.019s at stablef359c17e13658a73610809bbcaaa06b06b5120f4 and unchanged hashes. These mocks do not test parent deletion. Fresh exact Backend118 ownership is recorded for13 clean existing files: result-origin defect creation will adopt the existing BugsService command owner, and live-parent result lookup/write protection needs meaningful query-semantics tests. No backend source repair, physical PostgreSQL proof, generated contract, deployment or operation is yet verified here. The separate mandatory version, same-project binding, transactional audit/attempt-history and populated result/report/cache/actor matrices remain open. BT-9ea775d73705, BT-e19e42776b5a, BT-d170494abb3f and BT-05e68784a2c2 stay open; broad task stages do not advance.

## Quality report114 browser and review reconciliation — 2026-10-05

Scope: the user's requested `/build/1/reports?tab=quality`, existing frontend on1000, authorized production backend, read-only project1 observations. No QA case/run/result, ticket comment, client grant, financial record or ordinary production data is mutated. Source113 remains isolated ind74799f682afddb64a6788d8d98c20e701ba9215; the two-path caption correction is isolated in47846e29c3a673f73dda01f3c4f8c84cad3977de. The earlier113 browser-policy refusal and pending captures are historical observations, superseded only by the actual normally reopened tab5 evidence below.

### Current verified implementation, focused checks and review

Settled1280 browser inspection found a failures Switch with an accessible name but no visible caption. A meaningful missing-caption RED precedes the existing Label/Switch correction; clicking “Completed runs with failures” applies Completed and failuresOnly. The caption uses the existing md breakpoint and is hidden inline on mobile, where the existing drawer field title remains visible once. No duplicate IDs, helper, schema, API, query key, permission, new source file or source comment is introduced.

The author runs79 tests/6 suites, exact two-path zero-warning lint/diff and corrected changed-root/dependency TypeScript with the existing ambient declarations. Its first scoped attempt omitted those declarations and failed four dependency Session.orgId diagnostics; that attempt did not pass. Root runs the actual seven-suite command below:81 tests pass14.015s. Sequential existing-config production and full-spec TypeScript both exit0 with10GB heap. These are frozen114 source-checkpoint results; concurrent externally owned Ticket, Files and generated-contract changes are excluded from release clearance.

```text
pnpm -C frontend exec jest --runInBand features/build/reports/reports-quality-tab.test.tsx features/build/reports/reports-tabs.test.tsx features/build/shared/use-build-list-filters.test.tsx features/build/qa/test-runs-tab.test.tsx features/build/qa/qa-schema.test.ts features/build/qa/test-cases-tab.test.tsx hooks/api/build/test-runs-search.test.ts
pnpm -C frontend exec eslint features/build/reports/reports-quality-tab.tsx features/build/reports/reports-quality-tab.test.tsx --max-warnings=0
git diff --check -- frontend/features/build/reports/reports-quality-tab.tsx frontend/features/build/reports/reports-quality-tab.test.tsx
```

Each TypeScript command runs separately from frontend: `node --max-old-space-size=10240 node_modules/typescript/bin/tsc --noEmit --incremental false -p tsconfig.json`, then the same command with `-p tsconfig.specs.json`. Independent frontend_review101 review is CLEAR at source SHA2561cd48b00529490482ebf4c13dd7141f97cce9f3918e3415f357184c176998894 and test426b86687f26bdb1dba65ebb0ac424ad504b4f7ba093266516ad465fcf11589c. It checks real Label association, caption-click behavior, repeated inline/drawer controls and retained permission/query/filter/cache boundaries; browser layout remains root proof.

### Current verified browser observations

| Flow | Actual observation | Limit |
|---|---|---|
| Desktop search and failure filter | QA-114 survives reload; enabling failures yields Quality plus status=completed/failuresOnly=true, checked switch and Completed control. Selecting In Progress removes failuresOnly and unchecks the switch. | Matching filtered-empty state, no populated predicate/count proof. |
| Clear and reload | Clear removes q/status/failures/cursor state, retains tab=quality, blanks search, selects All statuses and turns the switch off. The earlier stale debounce restoration is absent after settling, reload and return. | One initial navigation/heading wait times out during rendering; later actual settled state supplies the proof. |
| Visible desktop label | Actual caption text is present and clicking it applies the filter. Document clientWidth and scrollWidth are both1280. | The pre-label capture remains issue evidence. |
| Tablet | Quality, caption, filters and genuine No test runs/Open QA remain usable at768×1024; document widths are both768. | No populated rows or dense table measured. |
| Mobile | At375×812, Quality remains selected and Filters opens the existing drawer. Completed and checked failures survive reopening. Escape eventually closes it and restores Filters focus. Clear all restores the canonical tab-only URL and genuine empty state. Document widths are both375. | A press of Done after Escape reports no match because the drawer has already closed. An initial Clear URL wait times out; later settled state proves Clear. Route updates close the drawer; continuous multi-filter drawer state is not proved. |
| QA integration and Back | Actual Open QA reaches `/build/1/qa`; settled Test cases and Test runs show genuine empty states. Mobile New test case opens an unsubmitted form; Cancel closes it and returns focus. Browser Back restores the cleared Quality report. | No form submission, case/result/run mutation, populated run-row link or execution-page proof. |

Immutable captures: [pre-label settled desktop](evidence/2026-10-05-browser/reports-quality-desktop-settled-1280.jpg), [final labeled desktop](evidence/2026-10-05-browser/reports-quality-labeled-desktop-1280.jpg), [tablet768](evidence/2026-10-05-browser/reports-quality-tablet-768.jpg), [mobile375](evidence/2026-10-05-browser/reports-quality-mobile-375.jpg), [mobile completed-failure drawer](evidence/2026-10-05-browser/reports-quality-mobile-filters-375.jpg). The earlier113 screenshot is an intermediate skeleton and is not final proof. Temporary viewport overrides are reset after verification; the user's tab remains open on Quality.

Sanitized sampled browser logs contain74 warnings, zero errors, zero matched hydration/contract errors:72 Image sizing warnings and two dialog-description warnings. These are development-session samples, not a clean-console claim or isolated attribution to the new report. The existing floating feedback widget overlaps the mobile drawer header in the capture; that chrome/accessibility cleanup remains open and needs its source owner's exact claim.

### Current verified restricted database and anonymous authorization

At16:30:15.698Z, canonical application-pool READ ONLY verification establishes current_user=streamline_app, transaction read_only=on, no superuser/BYPASSRLS, trusted server-resolved project1 tenant context, the matching visible project name and zero nondeleted project1 test runs. At16:35:25.645Z, anonymous production `GET /build/1/test-runs` returns401 UNAUTHORIZED, not500. Credentials, tenant identifiers and raw rows remain in memory; the connection is closed after proof. This supports the genuine empty surface and anonymous boundary only. No physical authenticated response-contract, complete module/project/tenant denial, mutation, audit/outbox or browser cache-refresh proof is supplied.

### Current unverified QA findings and exact follow-up

Independent backend_review107 reviews clean committed backend40c7f4017b753e22ef08ca668655a2f21dc96492 without live requests or edits. Root rechecks service SHA256f6735894588f3abf5334c28a53a1728065bd43153ea90d37288634670c61390e and response-schema e05f601ffb9eae723b4769b82f9f454c7c755e17acf874009b8fa5f62c8b7f0a. The following are Current verified source defects; deployment reachability and exploitability remain Current unverified:

1. `TestRunsService.updateResult` verifies the result's run/org/project but never a live parent run. A retained result can be updated after its parent is soft deleted. The existing tenant-isolation suite covers mismatched-run404 and nonmember403, not deleted-parent refusal. Reuse the canonical service and tenant-isolation test; verify a real denial and unchanged persistence after repair.
2. `testRunRowSchema` omits version, so the generated frontend parser discards the database run revision. Run PATCH permits optional CAS, while ordinary completion sends no revision. Existing tests intentionally cover last-write-wins without a version and409 with a stale version. Result PATCH has no revision input and rejects version400. Reconcile the existing DTO/response/official generated contracts, execution consumer and concurrency tests before claiming mandatory optimistic concurrency.
3. Case creation does not validate suite/ticket project ownership; run creation does not validate release project ownership. The composite FKs constrain organization, not project. Validate bindings in the canonical QA scope seam and prove same-org foreign-project denial without changing existing permission keys.
4. Case creation, run creation and result execution contain no transactional audit/outbox call. Completion logs only best-effort after commit. Source transactions/project locks do not prove retained attempt history, release signoff, atomic audit/event delivery or deployed RLS. Longer service/contract/schema remediation is a separate source package for Claude; no production cleanup experiment or QA mutation follows this receipt.

The reviewer identifies a future bounded synthetic create-case → explicit one-case run → read-result → record-result candidate, but full mutation-safety clearance is not established. Omitted/empty caseIds selects all active project cases; never use that default for disposable proof. Both create POSTs require separate Idempotency-Key values. No candidate is executed here.

BT-9ea775d73705 and BT-e19e42776b5a are individually reopened in the [existing QA specification](../experience/screens/quality.md#current-qa-reconciliation--2026-10-05); their exact text/IDs remain unchanged. BT-235ad1042755 and BT-d170494abb3f stay open. No D/I/T/R/B/L stage advances from partial clause coverage. Official regeneration produces298 checked/237 open/535 total; this corrects two unsupported historical checks, not a regression introduced by the new report. Populated count arithmetic, physical cursor movement/run-row links, all six roles, tenant/object denials, real QA mutation/cache/events, metrics/freshness and deployment/operations remain open.

Final documentary review is independently CLEAR after correcting the existing tenant-isolation suite's direct QA path; the suite is not in an invented __tests__ folder. Audit/quality/ledger/TODO/claims reviewed hashes ared7ec6ad333315c57b99b27081ee7310c7b5b81ec0e97a944d5cd258622266bdc,1dfa78e3f39d9c6654b799e99b9ab5e7e656ce02be93960bc817c3b0e9b76609,e510294f9e1b679d934886893f06c432a63b12d2209d5ebcefc9fbd791dc0641,c7e8921aba1293b4510b8a4a15b2575da04d0113c96863def881a902cad94f0d andb18633895d9d0184a9ac1a71eb3c3e37fcdb046dcb52948e7c32436566ba378e. This receipt-only append follows that review. Semantic comparison against47846e29c confirms exactly the two reopened states, no added/removed IDs and unchanged stages/evidence/task text. Official tracker freshness and execution-plan checks pass71 specifications/116 research files,78 routes,29 coverage requirements,36 implementation requirements,16 decisions,18 packages and72 canonical Markdown link checks. Vendor self-tests and all93 build-contract self-tests pass; fresh vendor equality and generator freshness pass417 schemas/331 operations at the current external OpenAPI5442d474a431. These are static observations, not clearance of externally owned generated changes, deployed behavior or operations.

Capture SHA256 receipts: settled desktop53b5dbc85f63616188543fbb5e6249fa6cfdb869e805721a7f1b9147fa99e302; final labeled desktop66e51c520e2016c036fe6247f3dce97f1efc68f425a029bd4c9d28f904aafa5f; tablet0e9f508c55672cd421479818d866a17399e5d46626224969355cc068676216db; mobile7f41d452eff39b23fd9436be3d04771f6140d2182ef6ea5b13225ea22279eac6; mobile drawer02307996cbc41227b4a8a05a8c5fa29388e91d35e1402337dc7b6a975a121575. All five are actual nonempty JPEGs; no prior capture or historical evidence is overwritten or deleted.

Concurrent external58349cf3a39ef4a4486f450e40832ef56b78d47a commits the already written114 documentary reconciliation alongside unrelated Files/Ticket/generated-contract work before root's remaining evidence commit. Preserve that mixed commit; it is not an isolated root package or independent clearance of those application changes. Root commits only remaining exact documentary corrections/receipts and the five captures. The earlier full TypeScript passes describe their frozen pre-external checkpoint, not the new mixed release candidate.

## Quality report113 and workload state112 — 2026-10-05

Current source integration: separate Workload commit16e88e7caea0ba8698555a855b661b0b56bd4acd contains exactly seven112 paths. Separate Quality commitd74799f682afddb64a6788d8d98c20e701ba9215 contains exactly seven113 paths, including the two justified new report files. Both final existing-config frontend TypeScript gates pass (`node --max-old-space-size=10240 node_modules/typescript/bin/tsc --noEmit --incremental false -p tsconfig.json`, then separately `-p tsconfig.specs.json`); this supersedes pending full-gate wording only at the final frozen revision.14-root/dependency scoped proof is separately documented below. Source commits preserve unrelated index/worktree content. Official index semantic comparison confirms535 identical task IDs/statuses/stages/evidence/descriptions (300 checked/235 open); only generated source-line anchors change. Final browser/mobile remains pending normal human reopening, not complete or blocked-by-product based on the automation rejection.

Scope: user-requested `/build/1/reports?tab=quality`, supporting open BT-235ad1042755 and BT-d170494abb3f. Separate quality_report113 implements only claimed Reports presentation/shared filter paths; root owns existing QA query integration,112 corrections, canonical specifications/evidence, serialized gates and browser/database. No production QA result/run/record, grant, comment or financial mutation. No broad checkbox or D/I/T/R/B/L stage advances; tracker remains300 checked/235 open/535 total. Existing [reporting specification](../experience/screens/reporting.md#quality-report-projection) describes the bounded current projection and remaining planned metrics instead of inventing a reporting API.

Later frozen checkpoint: the disputed coalesced-acknowledgement test passes on the unchanged shared hook; all22 shared tests pass1.838s and the reviewer retracts the proposed P2 after confirming the pending-value cleanup. Final80 tests across7 Quality/shared/QA/search suites pass13.181s; strict seven-path lint/diff and14-root/dependency TypeScript pass21.742s. Final independent review is CLEAR at shared hook04bf948b8f79ca7780d347822ce1dc1125538206d3d4104b7bda2a84b9e7e27c, shared test64cc123156a376e0749321fee7b952a4fe71e0d67a168c261db9d746d0a70d36, QA hookb74c3595976e0d3e13bc77460df76d43778488fce39f02231c75d438e4f0feb3 and Quality test020470c9579f6ea3f912379a89568e9712058a8fe3892827e4891e695007dcd3. Remaining Quality source/tab hashes are2e12867243343b5a6e5ea2b148e220a26fc3e4f2f45466aff152ca1dd382db28,46e626c4856e0253b5409c14d4c5b025e0a90fdab6e5debc0a5f576a69e78b28 and78f751d915537e921229386f66709b8b02627abc5490a0e272a8c4cefae6580e. All seven sources/tests are below300 lines. Fresh production frontend TypeScript passes; the separate full-spec gate is still running at this checkpoint. Official vendor/freshness pass3fdf19130799 with417 schemas/331 operations; tracker freshness and static execution-plan checks pass78 routes/29 coverage/36 requirements/16 decisions/18 packages. Those static checks do not prove behavior. Readiness recovers to200 at16:18:11.020Z, superseding503 only at that new observation. Human reopening and final browser proof remain pending; the earlier failures/captures are preserved below.

### Current verified source, tests and review checkpoints

Quality's Coming soon placeholder is replaced by an authorized read-only report over canonical useTestRuns. Rows/card metadata link run names to existing execution pages and show status, optional environment and five persisted-result counts; page summaries explicitly say Displayed page, with no implied project total/readiness. Existing tabs/toolbar/filter/select/switch/cards/table/mobile components and black/white styling remain owners. Failure filtering means completed runs with failed results: enabling selects Completed, incompatible status selection removes the flag, and filters/cursors use existing URL/debounce infrastructure. The genuine empty state opens existing QA; no copied records or endpoint/schema/key/permission is added.

Initial meaningful Quality tab RED1 precedes implementation. Correcting the tests to preserve canonical createAppQueryClient defaults exposes actual404/503 failures before PageState renders: root repeats RED2 failed/37 passed/39 total13.729s; that invocation mistakenly names a nonexistent hook QA-schema suite, so it proves only three executed suites. Existing INLINE_READ_ERROR in useTestRuns fixes the boundary; the correct QA schema and search suites then pass45 tests/5 suites13.091s. Independent presentation/query review is CLEAR at the matching five-path checkpoint.

Actual browser Clear after settled status/search refresh restores q=QA-113, contradicting the first control-only test. A same-client450ms regression reproduces it. Reusing canonical clearAll alone still fails (43 passed/1 failed); the shared domain hook owns the correction. Four new shared cases fail while all15 original tests pass. It now distinguishes editing from URL-driven search, reuses the existing debounce, recognizes pending own URL acknowledgements, fences stale Clear writes and synchronizes external history through an effect/transition, removing render-phase setters. Independent review then reproduces status-only Clear → acknowledged new search → Back-to-blank input divergence; the exact new RED precedes no-op marker retirement. The74-test/6-suite11.635s checkpoint preserves all original tests and adds targeted Clear/history/delayed-update coverage. A further proposed coalesced-acknowledgement history risk is disputed because current source already clears pending values when the final URL search is acknowledged; do not classify that proposal as a proven defect until its exact hook test runs.

Root integration finds useUpdateTestResult invalidates only detail while report/list counts and the failures predicate use run-list queries. Actual canonical mutation and QueryClient test reproduces stale visible counts (RED1 failed/2 passed4.446s). Success now invalidates the existing project runs prefix, which covers detail plus filtered lists. Negative tests preserve displayed counts on missing build:qa:execute or backend403, with no unauthorized HTTP/success refresh; another project's cache stays untouched. All79 tests across7 suites pass16.406s, exact seven-path strict lint and diff checks pass, and existing-spec-config TypeScript over14 owned roots/dependencies passes12.558s with zero diagnostics. These are mock transport/client evidence, not real HTTP/DB/role proof. The first reconstructed scoped verification command has an escaped-newline SyntaxError before TypeScript starts; a corrected command passes12.367s, and the later final-cache checkpoint above is the relevant pass.

112 preserves capacity query loading/error/refetch via existing select-to-Map and adapts both board consumers. Reports resolves members (build:view) and capacity (build:tickets:view) independently with original errors and branch-specific named Retry. Its initial test overrides throwOnError:false globally, masking actual default behavior. Root removes that override first: RED3 failed/13 passed/16 total9.277s. Existing INLINE_READ_ERROR in the capacity hook and member caller options fixes503/404 states without changing the project-members hook. Final65 tests/3 suites pass6.289s, exact seven-path strict lint/diff pass and independent review is CLEAR at capacity ab841f05ba83047e86814fc61b5cdca55995321e78b56f869a1a40c3b42012e5, section5cbb5a0a38c4ca5c49193933d0ff3e9ee6e2284598a19af726ed635fef7db034 and test76e532c49c49ee11307c7a99264a5bea789be3085e166568239bebc210b6ecbf. The existing707-line board test receives only its same-line mock shape adaptation; no mechanical split or new threshold exception.

Current-workspace production and full-spec TypeScript both pass with the10GB existing-config command at the earlier presentation checkpoint. Later shared/history/cache/112 changes require fresh full gates; those older passes are not final-revision proof. Historical OOM/webhook failures below stay recorded. Source113 and112 are not yet separately committed at this receipt checkpoint.

### Current verified bounded runtime observations

Before the shared Clear fix, actual Quality shows its heading, scoped explanation, status/search/failures controls and genuine No test runs/Open QA. Enabling completed failures eventually writes tab=quality&failuresOnly=true&status=completed and shows filtered empty; selecting In Progress eventually removes the flag. One navigation wait times out before the later settled URL/control observation; it is not classified as a permanent failure. Actual q=QA-113 survives reload with In Progress, preserving Quality. Reload's first heading wait times out before the settled observation; the later rendered state supplies the bounded refresh proof. Clear then restores the search, prompting the correction above; no post-fix Clear/browser pass is claimed yet. [First desktop capture](evidence/2026-10-05-browser/reports-quality-desktop-1280.jpg) is an intermediate skeleton and remains historical evidence, not a finished-page screenshot. No populated run, real cursor movement, run-link click, Open QA/Back or final tablet/mobile proof exists yet.

Anonymous production `GET /build/1/test-runs` returns401 UNAUTHORIZED at15:54:57.537Z. At15:55:30.883Z a READ ONLY streamline_app transaction confirms non-superuser/non-BYPASSRLS, transaction read_only=on, matching trusted tenant context and zero visible project1 runs. This agrees with the genuine empty surface, without proving all tenant/role policies or aggregate arithmetic. The first verification query incorrectly casts the text org_id column to UUID and fails SQLSTATE42883; schema inspection corrects only that bound verification query. It is not an applicationHTTP500 or product schema change. Private credentials/context remain in memory; no row contents or secrets are stored in evidence.

Later actual report rendering shows Backend unavailable; production anonymous QA read401 at16:04:38.072Z establishes a reachable auth boundary, while readiness503 at16:05:57.178Z does not establish healthy dependencies. Browser CDP and local sign-in probes time out, with port1000 owned by root's verified listener4192. Ancestry4192→17452→6084→19556→17736→26976→27464 matches runner103. Root stops only4192 and restarts unchanged pnpm dev on1000 as20868, with no env/source/cache/port change. Anonymous sign-in returns200 at16:10:44.970Z and runner output contains no port conflict. This proves bounded local availability, not the cause of the outage or production health. Both browser-generated connection-error tabs are then rejected by Browser Use URL policy; normal human reopening is requested. Do not bypass that rejection or mark final browser/mobile complete.

### Current unverified and Planned

Final matching-hash113 review and both TypeScript gates are verified in the current source-integration checkpoint above. Post-fix browser Clear/refresh/QA return/responsive captures, real populated counts and cursor reads remain pending. Physical QA mutations/denials, all six role cases, project/tenant denial, deployed relational/RLS constraints, cache/event delivery, DB formulas, query plans and release/operations proof remain Current unverified. Complete reporting filter/export/drill-down/freshness parity and project-wide measures remain Planned. Broader112 member pagination/date/capacity arithmetic and recovery are not proved by valid null values or route rendering. No duplicate helper/schema/API/component/research/Markdown is introduced; two new co-located report presentation/test files and immutable screenshots are justified and claimed. No files are deleted in this package.

## Reports browser110 and snapshot control111 — 2026-10-05

Scope: open BT-235ad1042755 and BT-d170494abb3f. Tracker remains300 checked/235 open/535 total, with no broad checkbox or full D/I/T/R/B/L stage advanced. Current verified observations apply to the development workspace on frontend1000 and authorized production API; they do not establish an immutable deployed candidate or complete reporting acceptance. Root starts110 at0843782075fc9d572f332f54e399032528761a2a. External b067e000c already commits108's adapter/layout test alongside unrelated work; former uncommitted wording below is a historical review checkpoint, not current Git state or an author freeze. That external mixed commit does not clear the pending FE-114 finding or ownership handoff.

### Current verified read-only browser observations

Visible More tools → Agile reports eventually reaches `/build/1/reports`. The first navigation wait times out while Next compiles; it is not proof of a permanent route failure. Agile shows explicit Velocity/Burnup/Cycle Time/Lead Time/Critical Path empty states and a CFD chart with existing history. Authorized Capture today is visible but never clicked. The CFD range menu offers14/30/60/90 days; actual desktop14-day and mobile90-day selections update the control and finish loading. At375 document clientWidth=scrollWidth=375. [Mobile Agile report](evidence/2026-10-05-browser/reports-mobile-375.jpg) preserves the selected90-day control and chart; the floating feedback toolbar visibly overlaps left-side content and remains an unresolved UI limitation.

Overview at1280 shows Total tickets202, Open202, Completed0, Completion rate0%, On-time rate100% and Avg velocity0, followed by six report panels. [Desktop Overview](evidence/2026-10-05-browser/reports-desktop-1280.jpg) records the displayed values, not their formula, complete dataset, tenant scope, freshness or drill-down correctness. Quality at the110 checkpoint renders Coming soon. The user's subsequent explicit request assigns its implementation to separate quality_report113; no placeholder is treated as completed. Actual mobile Workload selection plus waitForURL reaches `?tab=workload`, with three existing member names and missing-metric marks. Null capacity/estimates are valid contract states, so those marks alone do not prove an API failure or incorrect calculation.

Refresh briefly exposes a command-palette state; the attempted Escape then finds no combobox, and the settled page is Quality after active user navigation. Workload refresh persistence is therefore Current unverified, not a confirmed pass or application redirect defect. Immediate pre-settlement snapshots for tab clicks are likewise not used as final URL evidence. Temporary viewport override is reset. No snapshot capture, export/download, QA mutation, record/comment change, grant, publication or financial action occurs.

### Current verified source correction and focused proof

Read-only110 Reports inventory has stable sorted source/hook/route/contract/key manifest SHA9e8ad3562946b81249c9f6ab8c21328517a69383357efbc8164db978fe5387d1 at0843782075fc9d572f332f54e399032528761a2a. Existing8 suites/104 tests pass in6.292s. Its broader strict lint fails with four warnings: two unused flow-test imports and separate Burnup/export dependency warnings.111 removes only the two claimed unused imports; the two other warnings remain outside its scope. Existing hook/controller use build:manage for capture, but both actual CFD capture controls previously ignored that boundary.

111 reuses the existing component and flow suite. Initial unmock-order experiments fail as test infrastructure and are not meaningful RED. The explicitly claimed existing harness is then adapted to actual ChartCard, PmPanel, EmptyState and buttons while retaining its established test marker. Corrected actual-control RED is2 failed/22 passed: denied managers still see one ready capture action or two empty-state actions. Both authorized actual-click positive controls pass. The source then gates both controls through the exact existing useCan(build:manage); viewer empty text no longer directs an unavailable action. Read permission, error/loading/denied states, range selector, filters disclosure and authorized mutation callbacks remain intact.

Final8 suites/108 tests pass in5.576s. Exact three-file ESLint --max-warnings0 and diff checks pass. Initial scoped TypeScript fails TS2769 because the new test supplies unsupported Testing Library exact:true; root removes that option, preserving string-name matching, and existing tsconfig.specs owned-root/dependency TypeScript passes with zero diagnostics in4.712s. Independent review is CLEAR at final source fa095fc41afd3018f1f89fa3d2c57cce0fa6fe96a4819ab1e67881b193a34dec, flow0ab540b72aa80eaf61587724471b2d2ed6691552c6fd2d6833f5e803e60c92e0 and harnessb6436e0e71ad00f76d9cc131c20723c5c1e37b8e8767c11e75283ee267ed8097. Measured source135 lines, flow205, harness163. Isolated commit552e5b431 changes only those three claimed files. Recharts negative/zero-size jsdom warnings remain visible; they are not suppressed or represented as browser-layout failures.

### Current verified gates; remaining scope Current unverified

After external fdbd7643df967934d78d3ef5db843ec468dec051 restores the webhook consumer export, `node --max-old-space-size=10240 node_modules/typescript/bin/tsc --noEmit --incremental false -p tsconfig.json` and the separate `-p tsconfig.specs.json` both exit0 at the111 checkpoint. This supersedes the earlier webhook-export failure at that checkpoint only; historical TS2305/OOM evidence remains below.112 and113 were subsequent in-progress packages at that historical checkpoint; their final source commits and fresh full-gate passes are recorded in the current source-integration receipt above. No deployed frontend/backend, operations or broader release proof follows from these gates.

Historical Current verified source findings at110/111: Workload discarded member/capacity query loading/error/refetch states, and Quality had a placeholder. Bounded112 and113 source implementations, focused tests and independent reviews supersede those source gaps as recorded above; their remaining runtime acceptance stays Current unverified. Remaining source findings: CSV exports only cached pages without disclosing remaining pages; Burnup's no-cycle key drops the encoded filter; the Reports route does not supply a shared filter expression to those views. Physical viewer capture denial, capture idempotency/persistence/audit/cache, full report metrics and pagination, all role/tenant cases, mobile/tablet details, failure recovery and deployment/operations still require separate evidence. No screenshot or passing unit test is substituted for those proofs. Earlier backend authorization/DI/invalidation findings and exact external handoff requests remain open.

## Browser107, retained panel108 and iteration contract109 — 2026-10-05

Scope: open BT-801e948e8a67, BT-235ad1042755, BT-d170494abb3f, BT-f7dce3a272af and BT-7ad3d5bdfef4. No broad checkbox or full D/I/T/R/B/L stage advances. Root starts at58ecc72c4f6e996f92ec1df29d7bd4e26e7267cc; current browser evidence comes from the development workspace on port1000 and production API, not an immutable release candidate. Concurrent external route/helper and backend edits remain outside root's edit/commit authority. Tracker300 checked/235 open535 total is documentation state, not535 runtime requirements verified.

### Current verified browser and persistence

Build Inbox at1280 shows Active/Later/Done, search, attention and category choices All types / Projects & tickets / Approvals. At375 its Filters drawer exposes the same categories without an overall-module selector. Existing unread count remains1; no notice read/resolve/archive/snooze or ordinary record action is invoked. [Desktop categories](evidence/2026-10-05-browser/build-inbox-desktop-1280.jpg) and [mobile drawer](evidence/2026-10-05-browser/build-inbox-mobile-375.jpg) support the visible Build-scoped controls. The global keyboard-opened Inbox popup lists six notices. The initial Open Inbox click snapshot still has the Build URL; direct `/inbox` navigation exposes Home Notifications/Mail/Approvals plus an All modules / Build selector. A settled actual-link retest reaches `/inbox?view=primary`, Home OS and the Inbox heading; browser Back then restores Issues?q=QA-106. The initial snapshot is pending, not a proved failed transition. [Global scope controls](evidence/2026-10-05-browser/global-inbox-scope-desktop-1280.jpg) and [actual-link destination](evidence/2026-10-05-browser/global-inbox-link-navigation-desktop.jpg) support those bounded observations. They do not prove a complete loaded global collection or non-Build positive fixture. Complete module isolation, role matrix, state mutations and exact-version approval actions remain Current unverified.

Actual Issues search QA-106 returns two matching cards, STRE-106 and reserved STRE-211; clicking the exact reserved title opens `/build/1/tickets/STRE-211?returnTo=%2Fbuild%2F1%2Fissues%3Fq%3DQA-106`. After Close settles, `/build/1/issues?q=QA-106` contains the usable collection and no retained pane. Browser Back restores the matching211 pane; Forward restores the filtered collection without a pane. Refresh preserves the search and both actual cards. At375 the reserved card opens the matching pane and Close again returns to the same query, with document clientWidth=scrollWidth=375, zero dialog elements and focus on dashboard-content. [Dismissed desktop collection](evidence/2026-10-05-browser/ticket-panel-dismissed-desktop-1280.jpg) and [dismissed mobile collection](evidence/2026-10-05-browser/ticket-panel-dismissed-mobile-375.jpg) preserve the observations. The initial immediate Close snapshot is pending rather than failure; final settled results above are authoritative. Temporary viewport overrides are reset. No new request, acceptance replay, ticket property/comment, grant or public-sharing mutation occurs. The separate missing Intake return origin, full detail interactions and all other collection origins remain open.

READ ONLY persistence at15:07:03.921Z uses streamline_app with read_only=on, non-superuser/non-BYPASSRLS guards, trusted app.organization_id/internal audience and bounded statement timeout. Exact reserved request8 remains accepted→Ticket365/number211/IN_REVIEW/version1; title matches and foreign reserved organization context returns0 rows. This is a fresh read of existing state, not a new write, complete API-role denial matrix or repeated physical event-delivery proof. Earlier106 write/activity/audit receipts remain separate below. No token, OTP, credential, raw private payload or connection string is retained.

### Current verified bounded source and focused checks

108 first reuses the existing intercepted route adapter and actual-pane layout suite. The initial reused JSX fixture can skip a rerender, so its first RED is qualified. The corrected fresh-render fixture produces a meaningful1-failed/5-passed RED against the original adapter; the guard is restored with apply_patch and all6 pass. Alias/trailing-slash/encoded-key and updated return-query controls then produce8 passes in3.805s. Actual Pane, PageState, session provider, canonical scoped QueryClient and API hooks remain in the test; only API and navigation boundaries supply fixtures. Source initially59 lines SHA2e70265e275d2e219ebb584393f38199a1761cc65bfe83d9c0a3f5910cc17f8b; test180 lines SHAe070b67ae1ba235fec0daa7ba3d26a4a986e093eb51fd38fa55fdaa681586305. Exact strict lint/diff, changed-root TypeScript and independent matching-hash CLEAR apply to those initial bytes. The guard disables stale key lookup and unmounts presentation off its project/key route while preserving unconditional hooks, permission/error/loading/Retry and canonical Back resolution.

An external writer subsequently moves the guard into the canonical URL owner and adds memoization in the adapter. Current adapter SHAdd9d020c03a966254dfb770fea1ec400b1aece518e4590f56cdcdb2c7f49dbb1 is not covered by the former CLEAR. Read-only repeat of the actual-pane and canonical URL suites passes22 tests/2 suites in5.329s. Independent current-byte review finds no concrete functional/security regression, but FE-114 unnecessary useMemo/useCallback remains actionable. External start/end hashes are stable during that review: intercepted page61806481a5fbe07e58f572fd455789811f7f87659a6c801ee4d675ab26a554f6; direct pagef23b6f22bcdf3285fbef37941ca79b45bcada4244f6b7cbd4a5a325ffb517d57; URL ownerfe3f27b7d8a949bfc744137c560b3c3a30dcdf2ad8df81ec92068da81969b37a; URL test2d7ad56d9600e39cf19faa8209d972824cc2f04ca26029773d2118950db609a4. Root requests a freeze/handoff and keeps these source paths uncommitted. The external Radix missing DialogDescription warning remains; it is not suppressed or misreported as clean accessibility proof.

109 reproduces three undefined.safeParse failures/14 passes in the existing iteration-settings test after the external schema consolidation. Its minimal +5/-5 repair directly imports the same generated projectsSettingsIterationsGetSettingsResponseSchema used by the production hook; all original assertions remain, with no restored alias/wrapper/new file. Existing iteration, report-schema and settings-page suites pass55 tests in5.783s. Exact test ESLint --max-warnings0 and diff checks pass. Frozen224-line test SHA5160e8cc37a89fea6223f646e0e17f2d9a84d8a0a38c8851dd09d42d410016e4 has independent matching-hash CLEAR. Unchanged raw QueryClient construction and casts remain outside this test-contract repair; no whole-file standards cleanup or designer/browser completion is inferred.

Current changed-root TypeScript, using the existing tsconfig.specs.json, its ambient declarations and the three owned108/109 roots plus dependencies, passes with zero diagnostics in8.294s. The108 production frontend run `node --max-old-space-size=10240 node_modules/typescript/bin/tsc --noEmit -p tsconfig.json --incremental false` fails with TS2305 at settings/webhook-card.tsx:29 because the external webhooks module lacks useWebhookImpact. Production TypeScript remains failed; this scoped pass and the earlier4GB OOM do not replace it. Focused runtime/history success does not establish release, complete role/tenant/cache/event or operational proof.

### Current verified independent findings; runtime and repair Current unverified

backend_review107 reviews only committed backend1af4c1a6eff8f77d4db68c87a6730876f4797bb9, unchanged during review, with no runtime requests or tests. P1: generic Ticket PATCH accepts clientVisible in core/dto/ticket.schemas.ts:213 and writes it in core/tickets/apply-ticket-change.ts:276 under build:tickets:update, bypassing the dedicated build:clientvisibility:manage requirement; portal-projection.service.ts:75 uses that flag. Existing dedicated visibility tests do not prove generic denial. Exact DTO/mutation/existing authorization-test handoff is requested before repair. No real publication attempt or deployed exploitability claim is made.

P1: committed execution/cycles.service.ts references undeclared this.cache/logSideEffectFailure and injects TicketSystemDetachService without a committed provider/export. Existing constructor-mismatched cache tests do not establish compilation or DI. External dirty cycle/module/test work may already address it; its owner must freeze and provide production typecheck/module-resolution evidence before this finding is cleared. P2: committed custom-state, Workstream and project-write analytics invalidations run before the outer tenant request transaction commits, allowing a concurrent reader to cache old rows under the new generation. Existing mocked invocation tests do not prove commit/rollback ordering. Use canonical deferAfterCommit only after exact external owner handoff; physical concurrency remains unverified. Root does not edit, stage or deploy these concurrent files.

Independent frontend consumer review reproduces the iteration test regression repaired in109 and confirms report response/request parity at its reviewed snapshot. Separate pre-existing findings remain open: iteration read options.enabled=false is ignored and burnup query keys lose an encoded filter when cycleId is undefined. These require exact claims and meaningful denial/cache tests; no duplicate helper or consumer rewrite is authorized by107. Planned next handoffs prioritize the visibility permission boundary, external freeze/FE-114 cleanup, production webhook export gate, cycle DI and after-commit analytics ordering.

Current verified integration:109 is committed separately as d86ea1635fcabaab01be61b82fc9f9cb97294dd8, containing only the existing iteration test. Contract vendor and Build-contract self-tests pass (6 and93 cases); subsequent normal checks pass at OpenAPI SHA prefix3fdf19130799 with417 generated schemas/331 hook-called operations. Official tracker apply/check and execution-plan/local-link checks pass:71 specifications,116 research mappings,78 route mappings,29 coverage requirements,36 ledger requirements,16 architecture decisions,18 packages and72 canonical Markdown files. Exact three-root zero-warning lint and owned diff checks pass. These are static/scoped checks, not complete runtime route, production TypeScript, deployment or operations proof. Source108/root layout test remain uncommitted pending external freeze; six new screenshot paths are immutable and no BT identity, state, stage or task text changes are authorized.

## Intake contract99 and filter recovery94–98 — 2026-10-05

Current verified final106 integration checkpoint at root c90a8880e8500420d13c971b9ee3f99866c7c9e1: official tracker apply/check and execution-plan/local-link checks pass, with78 route mappings,29 coverage requirements,36 ledger requirements,16 architecture decisions,18 packages and72 canonical Markdown files. Contract vendor equality and fresh Build generation checks pass at3fdf19130799 with417 schemas/331 hook-called operations. Exact four-document diff checks pass. All14 screenshot paths exist; no BT identity, checkbox, stage, evidence mapping or task text changes are authorized. Earlier103 pending paragraphs are explicitly historical. A real211 full-page refresh retains the reserved title and STRE-211; its Back destination is still Issues. Temporary viewport overrides are reset. These checks do not prove all78 runtime routes, the complete actor/tenant matrix, delivery of effects or production-wide operations. External backend changes and the mixed c90 commit are excluded from this coordinator's isolated evidence package.

Authoritative HTTP105/106 receipts: reviewed101 deployment256aa2b9-4735-4ce3-a4cc-8014c2ee67fd records QA-101 POST201 at14:25:08.124992570Z/request Zh796V6-Tj-vV8Vjmrpb1w/duration3494ms; QA-106 POST201 at14:36:58.000116923Z/request0WHJRZTqR763XIiiV7rehQ/duration1587ms; PATCH `/build/1/intake/8`200 at14:37:43.153120709Z/request l1pFBqZ4SwyCaKcYipRofQ/duration2900ms; GET `/build/1/tickets/key/211`200 at14:37:51.267267497Z/request4Jyh0jRtSl-iTxzQDcO5xA/duration3167ms. No secret/header/body/IP is retained. Historical106 navigation observation: Closing211 changes URL to `/build/1/issues` while retaining its pane; Browser Back restores211 and an immediate Forward attempt has no next entry.108 supersedes the retained-slot defect and that pending Forward result through actual settled Close/Back/Forward/mobile proof above. The missing Intake return context and untested collection-origin coverage remain open in externally owned canonical navigation. Preserve BT-d170494abb3f and broad detail/navigation requirements as open; obtain exact handoff and retest Intake origin, full-page return, dirty protection and all collection origins. The historical slot failure is not an acceptance or permission failure.

Current verified browser105/106: a normal new HTTP tab in the same selected browser initially times out, then settles on authenticated Intake; no generated-error page or security interstitial is accessed or bypassed. One reserved QA-101 request7 is created and accepted once in In Review. Actual View ticket invokes the existing leave guard, shows an unnecessary Unsaved changes prompt after saved-form unmount, then Discard eventually opens canonical `/build/1/tickets/210` in a pane. This supersedes the earlier no-click/no-write101 gap only for this reserved flow. Real refresh renders full STRE-210 with persisted title/description/IN_REVIEW, and widths375/768 report clientWidth=scrollWidth. Mobile properties open and close; no Ticket comment/property/publication mutation occurs. [Actual pane](evidence/2026-10-05-browser/intake-ticket-desktop-1280.jpg), [mobile full detail](evidence/2026-10-05-browser/intake-ticket-mobile-375.jpg) and [tablet](evidence/2026-10-05-browser/intake-ticket-tablet-768.jpg) preserve evidence. Refreshed Back falls back to Issues rather than Intake; complete origin/history/focus and the previously observed floating-widget overlap remain open. Railway PATCH `/build/1/intake/7`200 at14:25:49.839990416Z/request1MOc1GAqS3StHRzUVOLIQQ/duration2845ms belongs to reviewed101 deployment. READ ONLY14:25:21.417Z shows7 pending/null Ticket/zero effects before acceptance;14:26:28.027Z shows7 accepted→Ticket364/number210/version1 with exactly one Ticket/activity/accepted audit and foreign-context visibility0. No internal-id-versus-summary request-absence claim is made without a complete captured HTTP window.

Current verified106 source/review: the actual DirtyStateProvider regression fails1/59 before correction while the provider is clean after saved form unmount; unrelated genuinely dirty work retains its prompt and Discard navigates once without replay. Existing navigation ref/layout effect now commits both href and requestLeave, so a captured toast action reads the latest authorized leave callback. Exact500-line limits are preserved: source499 SHA856294ddfdd1bdc21b689d044222870de0849abd1aa8345c2f1c8561c2cb19f2; test499 SHA4f8f07196d795d6d1fcaf6548c0f3dd4ccc31966aeeb91c748a103c13c8731de.59 focused tests, exact zero-warning lint/diff and changed-root/dependency TypeScript pass; independent standards/spec review matches both hashes. Existing permission/session/project/stale destination/deferred confirmation coverage remains. No new helper/file/style/comment/suppression or guard bypass. Another process commits these frozen paths together with its unrelated report/schema work in c90a8880e8500420d13c971b9ee3f99866c7c9e1; root does not reset, restage or claim that mixed commit as an isolated coordinator package.

Current verified106 runtime: a new exact single reserved QA-106 request8 is authorized in the claim before creation;14:36:35.121Z application-role READ ONLY guard proves it absent and scoped webhook/ticket.created automation counts0. Normal UI create and one In Review acceptance lead through actual View ticket directly to canonical `/build/1/tickets/211` pane with no Unsaved changes prompt. [Post-fix navigation](evidence/2026-10-05-browser/intake-leave-clean-desktop-1280.jpg) preserves the action result. READ ONLY14:38:14.267Z reports8 accepted→Ticket365/number211/IN_REVIEW/version1, matching title and exactly one matching live Ticket/creation activity/accepted audit; foreign-context visibility0. No request7 replay, live comment, financial, sharing or permission mutation. Full role/object HTTP denials, selected assignee/cycle/workstream, physical retry races, notification/cache delivery and deployment-wide operations remain Current unverified.

Current verified102 browser slice: width375 search Cycle, blur to heading and Filters opens the existing drawer with the draft retained; Bug combines with search in `?search=Cycle&type=bug`, settles to two results and a selected Bug value. [First drawer capture](evidence/2026-10-05-browser/feedbucket-toolbar-refs-mobile-375.jpg) precedes settled type selection; [settled selected drawer](evidence/2026-10-05-browser/feedbucket-toolbar-refs-selected-mobile-375.jpg) is a separate capture, not an overwrite. Clear all atomically returns the base URL and closes the drawer. Real refresh preserves empty search and reachable Filters. An attempted Done click after Clear all finds no button because the drawer is already closed; it is not a failed clear mutation. A Next dev-tools menu is dismissed via Escape during verification. Navigation/loading locator deadlines require settled-state observations; no application mutation is replayed or customer feedback edited. These bounded search/drawer/clear/ref proofs do not close every shared filter/operator/mobile requirement.

106 full-gate qualification: frontend `pnpm exec tsc --noEmit -p tsconfig.json --incremental false` exits1 after about233s with JavaScript heap out of memory near4GB. The sequential same-configuration retry `node --max-old-space-size=10240 node_modules/typescript/bin/tsc --noEmit -p tsconfig.json --incremental false` also exits1, reporting TS2305 at `features/build/settings/webhook-card.tsx:29:3`: the externally owned `hooks/api/build/webhooks` no longer exports useWebhookImpact. Neither run passes production TypeScript. The owned106 changed-root/dependency check remains a separate scoped pass. External webhook source is not released to this package. Earlier full spec failures and runtime gaps stay visible. An attempted string-generated private verification function is rejected by the REPL; no generated code executes. Root uses ordinary explicit application-role READ ONLY queries with the same guard and reserved predicate instead.

Historical checkpoint, superseded by105/106: Later Current verified runtime103 supersedes the anonymous sign-in404 checkpoint below: an independent read-only source review finds one sign-in route, no protected anonymous sign-in rule, no sign-in rewrite/basePath/notFound call, and mixed-age compiled artifacts without proof of corruption. Root confirms process ancestry7976→24716→30072→10352→27456→15024→21540 before stopping only its own listener. Identical fixed-port1000 pnpm dev restart, root child27464, changes no source/env/cache/config/provider and retains bounded diagnostics in private memory. Anonymous `/signin` now200 at14:21:26.910Z with the expected sign-in heading, no Page Not Found heading, ready signal and no compilation/port conflict signal. This proves runtime availability recovery, not the cache hypothesis or a browser login/action. The normal HTTP tab still has not appeared; the latest human reopen question remains pending.

Historical checkpoint, superseded by105/106: Current verified fresh gates103: official vendor equality passes SHA3fdf19130799 and official Build freshness passes417 schemas/331 hook operations. Official tracker apply/check passes71 specifications/116 research files; execution-plan check passes78 routes,29 coverage requirements,36 canonical implementation requirements,16 architecture decisions,18 packages and72 Markdown files. These checks explicitly exclude product/browser/persistence/deployment acceptance. A later external frontend commit and active hook edits are excluded from this coordinator's source ownership. Newer Railway attempt a6a5b358-e2ef-4c67-b7cc-a358d5a90a01, created14:13:04.910Z, is FAILED in the14:21:51.301Z list; reviewed101 deployment remains SUCCESS. A bounded build-log lookup times out after20s, so no failure cause is asserted or external deployment retried. READ ONLY14:22:06.389Z again reports streamline_app/read_only on/non-superuser/non-BYPASSRLS,5/6 accepted with one live matching Ticket/activity/accepted audit each, zero active scoped webhook/ticket.created automation and foreign-context visibility0; QA-101 remains absent. No new production record, screenshot, full stage or checkbox closes.

Current verified integration103 supersedes earlier pending scoped/deployment and six-warning102 language: backend changed roots/dependencies exit0; frontend changed roots/dependencies using existing tsconfig.specs.json exit0 with PASS output and empty diagnostics. The first frontend scoped attempt incorrectly used production config and failed without retained diagnostics; it is not a pass. Backend asynchronous output capture was lost, so only the actual child exit0 is attested.101 exact backend four-file commit a5b14c708f1ad4f426018fc19bc57dc81c7799f9 and frontend five-file commit c1b934928cd8aded6e52e0e1327ed4a1ef7cf8a5 preserve the reviewed candidate. Tracked-only archive bd8925d53ec644915c532cd30d95d3bc8176c7d19ee22d6629592bf30aa38b1f contains12248 files and excludes local secrets, scratch, dependencies and untracked changes. Initial extraction times out without deployment; fresh .NET extraction succeeds. The first CLI message fails argument splitting without creating a deployment; corrected single-word message creates256aa2b9-4735-4ce3-a4cc-8014c2ee67fd at14:02:55.494Z. Deployment reaches SUCCESS; readiness200 at14:12:36.171Z. Metadata commit hash is absent, so it does not independently attest the packaging revision. At14:14:43.957Z anonymous GET `/build/1/intake` and `/build/1/tickets/key/209` return401 UNAUTHORIZED. This proves authentication denial only, not object/role/tenant matrices or deployment-wide operations.

Current verified102 shared-toolbar source/test: readable destructuring separates controlled search metadata from ref forwarding in the existing component. Empty-string search, actual ref ownership, labels, focus/blur and black-and-white styles remain. Strict lint RED has six warnings; final exact strict lint has zero warnings/errors. Existing36 tests plus real caller-ref replacement/cleanup and controlled metadata coverage pass37/37. Source278 lines SHA eadbd15322a639b59edb9e1d4af78e2d3ea7be86347dfd685f478db8aa6dd11b; test385 SHA95ec4ef4a6cd46e70d7f17ebff827fc234298803d9eae4a480cb85e466b02edb. Matching-hash independent standards/spec review CLEAR, exact diff and changed-root/dependency TypeScript with the existing specs config pass. Exact two-file commit aa6d9c34c4036fbf6ef01ae0b041d85673713490 adds no helper/API/style/comment/suppression or gate widening. Historical full backend/frontend spec failures below remain failures; later externally owned commits require a new frozen gate check.

Historical checkpoint, superseded by105/106: Current unverified runtime103: no listener existed on1000 and prior verified Next17332 was absent. Root restarts only the existing repository pnpm dev fixed-port1000 runner with unchanged production API configuration, hidden process and no persisted credentials. Listener7976 is confirmed as its Next child. Next regenerates ignored next-env.d.ts, hash1b59d4c6b838→b8b3a344484b; no hand edit or staging, tsconfig fc7bd5b9fda5 unchanged. Anonymous `/signin` returns404 repeatedly, including14:18:02.061Z, with the application's Page Not Found heading; source and dev app-path manifest contain the sign-in route. This is a reproduced availability defect without an assigned cause, under read-only independent diagnosis. Browser2/tab2 remains its generated connection-refused data page; Browser Use URL policy prevents attachment. Human agreement to reopen does not establish a normal HTTP tab. No policy bypass, exported browser credentials, alternative UI automation, QA-101 write or new screenshot occurs.101 actual View ticket/refresh/mobile and102 final mobile filter proof remain pending. READ ONLY14:06:13.904Z confirms5/6 unchanged, QA-101 absent, one Ticket/activity/audit per accepted request, zero enabled scoped webhooks/ticket.created automations and foreign-context visibility0. These bounded proofs do not close full BT tasks or D/I/T/R/B/L stages.

101 gate qualification: full backend spec-inclusive TypeScript exits1. Our new test's direct linkedTicket access caused TS2339 on the inferred legacy-or-summary union; root changes only that assertion to exact nested toHaveProperty matching, with no cast or production type widening. The existing two focused suites again pass94/94 (8.46s), exact test zero-warning lint/diff pass; final test SHA e3a2a05a6823dc119fd9130cdfb483a6173351cbbfcedcc244bbc4fb260ebabe is independently reviewed CLEAR. The full output also reports constructor mismatches in externally edited Portal visibility, Analytics, Custom states, Templates, Project writes and RBAC adapters; these files are not claimed or staged here. Full frontend specs exit2 on seven webhook-export diagnostics: settings/webhook-card.tsx expects useWebhookImpact and hooks/api/build/webhooks-schema.test.ts expects removed lifecycle contracts. Those hooks/tests are external active working files. Neither failed full gate is an OOM or pass. Scoped confirmation is pending at this checkpoint; earlier full-gate success applies to99 only. No external file is staged or included in101 deployment.

Latest runtime99 receipt (supersedes pending deployment/acceptance language below): the tracked-only99 archive deploys successfully as f2c427cf-2b05-469b-b2cb-3f949e824b7e, created13:20:33.679Z, on the explicitly authorized StreamlineOS production service. Health readiness returns200 at13:27:38.269Z. Packaging records backend180cafa92896dc9efd4ba1f7e4b5bcb64ff90da2 and archive e7acd551694e185d83af5959fb2bac5b15f0c6e166cb2a221f3d6e0e430fffa9; deployment metadata has no commit hash, so metadata alone does not attest that revision. Railway HTTP receipts show reserved5 PATCH200 at13:27:53.056912884Z/request lxN3jM4MT6-rgwFLDcO5xA; reserved6 POST201 at13:30:12.766368706Z/request NhJAc5xAS36B2QbsJH0Vcg and PATCH200 at13:31:37.494315421Z/request p6Rf8fW4Qie9bAJG0ubPiw. Each normal UI acceptance creates one Ticket and shows the accepted toast. No replay of an accepted request occurs.

Independent READ ONLY application-role receipt13:32:53.570Z reports streamline_app, read_only=on, superuser=false, BYPASSRLS=false: Intake5 accepted→Ticket362/number208 and Intake6 accepted→Ticket363/number209, both project1/IN_REVIEW/version1. Each has exactly one matching live Ticket, one created activity and one intake.accepted audit; optional assignment/cycle/workstream remain unset. A different reserved organization context sees0 matching records. Before6 acceptance13:31:02.456Z its status is pending with no Ticket/activity/audit. Before writes, the same scoped read reports zero active enabled webhooks and zero active ticket.created automations. This is bounded persistence/RLS evidence, not authenticated object404, assignment matrices, physical concurrency, delivered notifications or complete operations proof. [Accepted list](evidence/2026-10-05-browser/intake-accepted-record-desktop-1280.jpg) and [post-acceptance view](evidence/2026-10-05-browser/intake-accepted-desktop-1280.jpg) preserve actual UI evidence; neither proves a clicked navigation action.

Current verified navigation finding101: authorized GET Ticket363 returns200 at13:31:42.771966026Z/request Xe4rInKSRmyayteFVOLIQQ but takes4396ms. The transient View ticket action was not clicked before expiry, so successful navigation is not claimed. The pre101 deployed acceptance service returns a full linkedTicket that its declared response schema omits; the generated consumer therefore drops it and needs another lookup. Claim101 adds only the minimal canonical id/projectId/ticketNumber projection to the existing response and consumes it immediately, retaining legacy authorized fallback and permission/context/leave fences. Meaningful RED: backend2 failures/52 passes and frontend1 failure/50 passes. Frozen sources fit160/444 backend and499/368 frontend lines; final existing focused suites pass94 backend and105 frontend tests, exact lint/diff pass. Independent frontend review matches dialog d551a6a2120e/types c48c9be7acfc/test a4c554ea969f; independent high-effort backend review matches response c02a4d4dc7df/service052a125720d0/test0de4b58ed871. Production backend/frontend TypeScript pass. Official generation and vendor/freshness pass4178 operations/4163 applied contracts/0 undeclared,417 consumed schemas/331 hook operations, artifact3fdf19130799add92a11c299a1e2d1a9a6ebb71db71cd3e1c17e3a5a396dd8c9. The backend full spec gate is still running; frontend spec,101 deployment and actual action proof remain pending. Production frontend and full backend spec checks briefly overlap during root dispatch; do not label that interval serialized. No full BT stage or checkbox advances.

99 source/generation checkpoint: backend production `pnpm -C backend typecheck` passes after frozen source. Official OpenAPI generation writes4178 operations,4163 applied contracts,0 undeclared, all Zod schemas converted. Official vendoring and Build generator produce SHA256625d07220bcffc252da83208d6820047fe6612cfa983dff08cde0dfbb2cedf1b; vendor equality and freshness pass417 schemas/331 consumed operations. Generated frontend production TypeScript passes; backend commit180cafa92896dc9efd4ba1f7e4b5bcb64ff90da2 and consumer a703ce33f record exact artifacts. Backend index/worktree is clean after the five-file commit. Tracked-only archive contains12248 source files and hash e7acd551694e185d83af5959fb2bac5b15f0c6e166cb2a221f3d6e0e430fffa9, excluding local env/scratch/artifacts/untracked files. Deployment is dispatched only to the explicit StreamlineOS project/service/environment; status, health and acceptance proof remain pending. READ ONLY13:20:03.112Z still shows reserved Intake5 pending/null linked Ticket.

Earlier99 checkpoint (superseded by the source/generation receipt above): final92/92 backend focused tests and exact four-path zero-warning ESLint/diff pass. Full spec-inclusive `node src/scripts/check-spec-typecheck.mjs` passes; the initial invocation included unsupported --help and actually ran the normal full gate, not a help mode. Production typecheck and official generation were pending at this checkpoint. Independent high-effort security/Standards/Spec review matches DTO4c2ff6d349fb/service dce311a72178/test6e16039475e9/test2ac680c2ac36, confirms scoped SHARE targets and canonical ACTIVE assignment/intent reuse, and independently reruns92 tests. Physical concurrency, current permission/membership revocation and complete runtime scope remain unproved.

Later authoritative HTTP capture closes only the earlier missing-status observation: exact-service Railway HTTP logs show PATCH /build/1/intake/5 at12:46:07.384798550Z and12:49:41.701028879Z both400, request IDs dA_XnVTiROaeTsPWV7rehQ and cxsmGf6xQ0-OQyFyAXC71g. Both belong to SUCCESS deployment9f17ad1b-5677-49a7-b1e6-f46e72e1f5cf at backend f7d4f66f83d586fa9b6e20dd1c51c6628cd8bf4c, created12:21:03.150Z. This is controlled validation failure, not500, and supersedes the earlier d79b deployment snapshot. No account/token/IP/header/body is printed. Source implementation has not yet been deployed by this coordinator.

Frontend bounded source commits:711bdb8d2 (94/98),5e4362f27 (95),be0fda53a (96),6d2ca0da2 (97). External Ticket edits are excluded. These commits do not close composite BT tasks or deployment gates.

Historical verified bounded99 RED: human explicitly transfers the Intake backend correction to Codex. The pre99 strict PATCH rejects the four fields already sent by the dialog. On unchanged source, `pnpm -C backend exec jest --runInBand --runTestsByPath src/modules/build/execution/intake-transition.spec.ts src/modules/build/execution/intake-duplicate-target.spec.ts` reports2 failures/57 passes/59 total: parsing rejects the selected fields and service creation drops chosen status, targets and assignment. Claim99 assigns two existing source files and two existing tests disjointly. At this initial RED checkpoint implementation/review/generation/deployment/runtime were pending; the latest99 receipt above supersedes that pending state. No controller/helper/migration/permission key is duplicated.

### Current verified source and focused tests

- 94/98 reuse useDebouncedValue300ms and a pure local reducer; incoming URL values synchronize after commit, without render-time setters or private timers. Serialized acknowledgement preserves newer typing and rejects stale publication. Clear all invokes the parent's existing atomic command, resetting all facets/cursor/selection in one navigation. Delayed-clear and actual-parent RED:2 failures/39 passes; final two suites41/41. A navigation that never acknowledges remains an open liveness boundary.
- 95 registers Triage ownerId and allowlisted sort through the existing shared hook, preserving default TODO/created and unknown-sort fallback; actual-hook tests23/23. The historical95 Intake dialog uses authorized useTicket with INLINE_READ_ERROR, resolves internal ID to canonical ticket number, and offers guarded navigation only for matching current identity/project/result. Follow-up read failure does not replay acceptance. Its47 tests cover ID91 versus number7, missing/denied/error reads, context and deferred leave approval. Reused Cycle/Workstream controls keep source498/test440 within limits. Actual acceptance was unverified at95; latest99 proves acceptance and101 changes only response-based navigation.
- 96 restores mobile filter actions after search blur while preserving the draft and expanded focused search. Two meaningful failures precede36/36 focused tests. Six existing react-hooks/refs warnings in shared toolbar source remain: strict zero-warning lint fails. No suppression, exception or baseline widening was added.
- 97 corrects only the existing test mock's hook-to-resolver shape by forwarding supported loading/error/empty fields. Initial full frontend spec TypeScript TS2345 is retained; the corrected full gate passes. No production type, cast or helper changes.

Root final Jest rerun passes12 suites/220 tests: Feedbucket component/server-filters/parent/page/inbox, shared debounce, Intake, Triage, shared toolbar/layout, My Work pane and Ticket errors. Exact strict lint succeeds for the other11 owned paths;96's source warnings remain separate. `pnpm -C frontend type-check` and `pnpm -C frontend type-check:specs` pass after final98 and Intake reduction. These are not backend, browser, role or deployment gates.

Matching-byte independent reviews:94/98 hashes33f16b875674/73ad1284e295/d44062ffbc76/886a762bf9bb;95 Intake4240461a9a4d/261a52904852 and final Triage1f4858e78fe2/c7efa17ae799;96 b89d7937d316/11868fc0e7eb/1b53e7fae8f1/bbac4d339542;97 2eede343b3ee. After external Triage reflow, the reviewer independently rechecks current475/496-line bytes and reruns23 tests. Historical clearance is not substituted for current hashes.

### Current verified browser and database observations

Real authenticated port1000 Feedbucket at375px initially hides Filters after filled-search blur. After96, QA-094X combines with status=open through the restored drawer and survives refresh. Before98, Clear all leaves status=open. After98, it restores clean `/build/1/feedbucket` and all eight default facets; clientWidth=scrollWidth=375. Refresh followed by QA-098-refresh typing publishes the matching query. This is filtering proof, not a feedback mutation or full role/cache/release proof.

Screenshots: [desktop](evidence/2026-10-05-browser/feedbucket-filter-desktop-1280.jpg), [historical mobile failure](evidence/2026-10-05-browser/feedbucket-filter-mobile-375.jpg), [restored drawer](evidence/2026-10-05-browser/feedbucket-filter-mobile-drawer-375.jpg), [atomic clear](evidence/2026-10-05-browser/feedbucket-filter-cleared-mobile-375.jpg). The floating feedback widget still overlaps mobile/tablet content; responsive placement remains open.

Historical pre99 reserved project1 Intake5 title [QA-095] Intake ticket navigation verification is created through UI. Creation HTTP status was not captured. Non-superuser/non-BYPASSRLS streamline_app READ ONLY transactions show zero baseline rows12:42:54.037Z, then id5 pending/null link12:45:21.610Z. Normal In Review acceptance and a second attempt display Validation failed while preserving the draft. Reads12:49:35.614Z and12:50:10.223Z still show pending/null link/null Ticket. HTTP status was not captured at that checkpoint; later exact-service logs above prove400. Empty console error telemetry does not prove no server failure. [Desktop failure](evidence/2026-10-05-browser/intake-desktop-1280.jpg), [reserved mobile view](evidence/2026-10-05-browser/intake-mobile-375.jpg) are retained. Latest99 deployment/acceptance/persistence success supersedes the failure; actual View ticket navigation remains unverified pending101.

Triage currently renders Nothing to triage with Search only. URL-contract tests do not prove visible owner/sort controls or full processing. No ordinary record, Ticket comment, financial action, assignment, permission expansion or public publication is made by94–98. Tracker remains300 checked/235 open535 total: document status is not300 verified product requirements. No broad BT checkbox or complete D/I/T/R/B/L stage advances. Prior official vendor/freshness checks pass417 schemas/331 hook operations;99 requires fresh generation and deployment parity. Complete role/tenant, physical lock/cache/event/concurrency and operational proof remain Current unverified.

## Production recovery91 and ticket state92 — 2026-10-05

Scope: BT-7f60ba90ec64, BT-60a1986f3a4c and BT-f7dce3a272af, with source-only portal follow-up BT-b2397d37b85d/BT-bba8e3bce723. These composite tasks remain open. Start revisions were frontend `86b67f972` and backend `d79b1e9ccd0c8f269867e909403941ef16065936`; concurrent external work advanced them to `3755abd5b` and `f7d4f66f8`. Runtime observations use an existing authorized session, frontend `http://localhost:1000` and production `https://api.streamlineos.in`. They are observations of the running development workspace, not an immutable release candidate.

### Current verified runtime evidence

- Production health returns HTTP200. Authorized Railway metadata reports deployment `4a20c34c-ec01-456e-be94-d7872939316b` SUCCESS at exact commit `d79b1e9ccd0c8f269867e909403941ef16065936`, created `2026-10-05T11:48:30.566Z`. This supersedes the earlier unavailable-health observation, without claiming deployment of later `f7d4f66f8` changes or a complete operations gate.
- Unauthenticated real GET `/build/1` and `/build/1/tickets/key/123` return HTTP401 `UNAUTHORIZED`, success=false. These are authentication negatives only, not proof of the six roles, tenant boundaries or object permissions.
- The reserved QA-070 Ticket is independently persisted as internal id159, project1, ticket number123, status IN_REVIEW, version4, client_visible=false, live=true. The real transaction reports role `streamline_app`, transaction_read_only=on, rolsuper=false and rolbypassrls=false. Tenant context and internal audience are set transaction-locally before the scoped SELECT. A one-connection IAM password provider signs through the authorized production AWS configuration in memory; TLS remains enabled. Two prior static-password connections failed with PostgreSQL28P01 and performed no application read. No owner/superuser fallback, writes or secret persistence occurred.
- A subsequent READ ONLY application-role RLS check uses the same reserved Ticket predicate: current organization context returns1 row; a different synthetic organization context returns0. Catalog reports tickets RLS enabled=true, forced=false; transaction-local organization context is cleared after commit. This proves physical row filtering and local context cleanup for that role/predicate, not authenticated HTTP404, organization existence/standing, project membership or the complete role/tenant matrix.
- My Work search QA-070 returns one canonical STRE-123 link with returnTo `/build/my-work?q=QA-070`. Ordinary click still reaches global Page Not Found. Reload of that same URL renders the full Ticket. Control-click opens another native tab and successfully renders the same canonical full-page Ticket while retaining the filtered origin tab. A middle-click attempt did not expose a new tab in the available inventory, so successful middle-click is not claimed.
- The full-page Back link restores `/build/my-work?q=QA-070`. Browser Back then restores the loaded Ticket; Forward returns the same filtered My Work result and visible search value QA-070. Scroll-anchor and focus restoration, Enter activation and every other record origin remain unverified.
- Directly loaded Ticket details render at widths375,768 and1280. At375, Expand details panel opens the Ticket properties sheet and Close details panel returns to the Ticket. Tablet/desktop DOM measurements report clientWidth=scrollWidth at768 and1280. These prove rendering and the sheet open/close interaction only; mutations, mobile375 overflow, keyboard focus trapping, denied actors and all detail actions remain open. The floating feedback toolbar visibly overlaps the left edge of subtask/checklist content at375/768 and needs a responsive placement review.

Screenshots: [mobile375 properties](evidence/2026-10-05-browser/ticket-properties-mobile-375.jpg), [tablet768 detail](evidence/2026-10-05-browser/ticket-detail-tablet-768.jpg), [desktop1280 detail](evidence/2026-10-05-browser/ticket-detail-desktop-1280.jpg). Captures were taken during external UI changes; they are not proof of a frozen source candidate. No live Ticket comment, publication, assignment, status, permission or financial mutation was made.

### Current verified bounded source and tests

Existing TicketDetailPage now distinguishes isPending from isLoading for the key read: a pending missing result stays in the existing skeleton after error/denial precedence; a settled missing result still returns notFound. Existing TicketDetailPane Retry calls refetchTicket; explicit Close preserves its origin. The meaningful RED had two failures and29 passes. Final author GREEN has31/31 across the two existing suites. Coordinator rerun of detail-errors, my-work-ticket-pane, build-ticket-detail-url and my-work-rows passes61/61. The rows suite retains jsdom's native-navigation warnings; these do not establish actual browser navigation.

Command: `pnpm -C frontend exec jest --runInBand features/build/ticket-details/ticket-detail-errors.test.tsx features/build/my-work/my-work-ticket-pane.test.tsx features/build/ticket-details/build-ticket-detail-url.test.ts features/build/my-work/my-work-rows.test.tsx`. Exact four-file ESLint, executed from frontend through `node node_modules/eslint/bin/eslint.js`, and exact diff checks pass. The initial root-directory lint command could not find the frontend ESLint config; it is a corrected tooling attempt, not a product lint pass. Production and test-inclusive TypeScript for this92 candidate have not run while source ownership is unstable.

Independent semantic review is CLEAR for pending/settled state, denial/error precedence, real PageState Retry→refetch→recovered Ticket and explicit Close. Frozen-source clearance is withheld: author hashes page `b16a23083ae7c2d9b80363c6606c0a733fd5ab1770c13327ad3a59aab1a2a818`, pane `efc8d3da084075e666dfa35a42793942069de8de36b2c00639802236fab551cb` were followed by external formatting. Observed current hashes are page `d1dbeadfc148144c6319b54ebf7e05147181d85189b4bced5d25b880678c7151`, pane `14a64635e1ac46a2059c5ba21dce7e0bcaf72778576e4f4e3059eb64c28334cb`. Test hashes remain `4ac6a99a7030d37569f0f5640916d62eea1587c5afebfdf883009932cafa47b7` and `3bd546f1820cd588ba43abaaaeab16635a8184b8c9da488ff22d6be1838bd528`. The user confirms Claude is still editing the two source files: all four source/test paths remain uncommitted here, and final review/commit requires handoff and new hashes.

### Current unverified findings and assigned follow-up boundary

| Finding | Evidence and customer impact | Required next proof/correction |
|---|---|---|
| Ordinary My Work→Ticket navigation still404 | Actual click failed before and after the bounded pending-state change; refresh and Control-click succeed. The pending-state test correction is not the demonstrated routing fix. My Work is outside `[projectId]`; interception is inside `[projectId]/@panel/(.)tickets`, with panel/default but no implicit project children/default. Bundled Next route documentation supports an unmatched-slot hypothesis. | Capture the failing RSC route selection and actual key request result before assigning root cause. Claude owns the active Ticket UI changes. Resolve page/pane routing at the correct shared layout boundary; do not insert a null default merely to hide404. Test project and organization origins, refresh, Back/Forward, focus/scroll, native modifiers and mobile. |
| Pending title/description navigation loss | Source review of use-ticket-detail.ts finds500ms debounce cleared on cleanup without pending-edit dirty registration; comment drafts have separate handling. No live mutation was attempted. | Claude follow-up: own the existing edit/navigation seam, define queued/in-flight/failed/conflict/offline behavior, add a failing actual-hook navigation regression, then prove saved version and read-after-navigation persistence. |
| Pane does not yet implement complete detail actions | Current pane contains a narrow title/status/priority/description view; the planned detail scope includes properties, subtasks, relations, comments, files, time, activity, approvals and publication. | Claude follow-up: reuse the existing full detail composition with explicit page/pane/mobile context, preserve permissions and client boundary, and verify all actions without duplicate owners/components. Live comments remain excluded from this coordinator's test actions. |
| Project response projection includes undeclared fields in source | projects-query.service.ts:343 reads a full project/member row and returns the spread at361. Project intakeToken and member hourlyRate/hourlyRateMinor/rateCurrency are omitted from projectDetailSchema. The response interceptor validates but returns original data; frontend parsing does not make the network response safe. Source issue confirmed; deployed wire presence and unauthorized exposure remain unverified. | Historical ARCH07 ownership is retained. Claude/owner handoff must explicitly cover existing projects-query.service.ts and projects-query-get-project.spec.ts. Use exact allowed project/status/member projections, keep crmClientId private for its lookup, preserve member-user/CRM shapes and auth predicates. Add token/rate-bearing forbidden-key regression and positive/403/404 controls; inspect only key presence in an authorized raw response, never values. No global interceptor change or new helper is required. |
| Feedback toolbar obstructs mobile work | Current375/768 screenshot/visual observation shows overlap of the left subtask/checklist region. | Existing widget/layout owner should define responsive collapsed/edge placement using existing UI. Verify all inputs and bottom navigation remain reachable, drag/reset and focus behavior. Do not call current rendering full mobile acceptance. |

### Gates, gaps and truthful completion

Current execution-plan gate passes with78 routes,29 coverage rows,36 canonical requirements,16 decisions,18 packages and72 canonical Markdown files;14 self-tests pass. Generator93 and vendor6 self-tests pass; vendor equality at SHA prefix2b0b10a3e88ab2c3 passed at the observed snapshot. Build consumer freshness failed against fresh generation at the earlier4a9c539b7aa0 schema hash snapshot; concurrent external contract regeneration means this failure requires a new frozen check, not a manual generated-file edit. Tracker --check still fails as stale with zero missing checklists; --self-test is unsupported and not a passing tracker gate.

Later independent recheck after external backendf7d4f66f8/frontend3755abd5b contract changes: `node scripts/check-build-contracts.mjs` now passes all three rules,417 schemas, hash prefix7838edf15df5 and byte equality to fresh generation over331 hook-called operations. `node scripts/check-contract-vendor.mjs` passes at SHA prefix7838edf15df590da. The earlier freshness failure remains historical evidence and is superseded for this later contract snapshot only. Execution-plan/local-link and repository diff checks pass again after evidence commit `a094583e8`. This does not establish deployment of these later contracts or resolve the stale tracker and unstable UI ownership.

Physical tracker count at the observed snapshot:300 checked,235 open,535 total. Historical checked boxes do not establish matching browser/database/RBAC/deployment proof. No new composite checkbox or complete D/I/T/R/B/L stage was closed. Current unverified: stable source release, authenticated positive response contracts, full org/module/object/tenant matrix, mutations/replay, cache/events, all record routes/actions, portal waiting HTTP recovery, complete browser/mobile coverage, deployment of current backendHEAD and operations. No files were deleted, no new Markdown was created, and unrelated external changes remain preserved.

## Bounded corrections89 and portal recovery90 — 2026-10-05

Current verified source: frontend commit `d00183921` changes only My Work rows and their existing regression suite; ordinary and keyboard activation now use the same canonical Ticket destination as the native link, through the existing navigation-leave guard. Modifier clicks retain native behavior. The meaningful handler regression produced five failures before correction; four suites passed 62 tests afterward. Exact lint and diff checks pass with one unchanged effect warning. Independent review found no actionable bounded defect. Source SHA256 `4cea077c902579f2e4b0b656f420c2aa5cc5530068490b03ee342aeb154c4f8a`; test SHA256 `46600e84b59aca7690c9c6f72ac7f11733fb91616dff8af7af4191b509ff71d0`. Successful deployed details, leave-dialog interaction, history, refresh, mobile and denied actors remain Current unverified.

Current verified source: backend commit `83d9e316f` changes only PortalClientService and its waiting-filter test. `waiting=true` now returns a controlled `PORTAL_WAITING_FILTER_UNAVAILABLE` BadRequestException before any service SELECT. Ordinary/false-filter grant scoping and cursor behavior remain intact. This contains the internal approval-existence leak without claiming that external approval filtering is implemented. The service regression failed before correction; six suites passed 60 tests. Strict exact lint, diff and source/test semantic TypeScript checks pass; independent security review is clear. Service SHA256 `eaf1d691ef99f307e4b0cc9699db884b4884d5e243c97089352aaa3c516d88e5`; test SHA256 `ca6832bfa26d3e6ba7faa35427a5caf9dfec6a18b9adb420927442bc76b5c35b`. No database mutation or authenticated production HTTP400/200 proof is claimed; authentication-guard queries are outside the service's no-SELECT assertion.

Current verified source: root commit `4cb75e168` scopes the existing execution-plan gate to the unique complete canonical requirement table rather than later reference tables. Its repeated-reference regression failed before correction. All 14 self-tests, Node syntax and diff checks pass; independent normal execution passes with 78 Build pages, 29 coverage rows, 36 canonical requirements, 16 decisions, 18 packages and 72 Markdown files. Script SHA256 `a3e6742db3fb9e209da8d11539c04b1bec3df0cc31a75510de1f927499377a6f`. This is a documentation gate correction, not application readiness.

Current verified source90: the existing portal page exposes safe clear-filter guidance and uses shared Button default/outline selection. Independent security review caught an intermediate mismatch: getApiErrorCode accepts ApiError while the real portal transport throws PortalApiError. A regression using the actual PortalApiError reproduced the missing guidance before correction. The final page matches the real class/code; its two existing suites expose that class. Four focused suites pass 50 tests, exact three-path lint/diff checks pass, and both final independent reviews are clear. The earlier clearance and intermediate ApiError-only test are superseded. An adjacent incomplete transport mock caused three failures during integration; the one-line mock correction restores all three cases. Untouched RetryReader act warnings are retained. Page SHA256 `63e67182a5556e2c38281aa6863e1fb9e841df600bb87fc23711ad4515e900fb`; secret test SHA256 `a3f3cab9b494fd7536382675d13abb2fcd45702870628a1bade4de42318f1447`; page-state test SHA256 `a8baf7a9f43baa360164b7a7c0c84a019728122ccf56cb1314d99ec8f728805d`. Concurrent external commit `5d86174cd` integrated the final page, secret test and prior88 evidence; this coordinator did not stage its unrelated files. Exact one-file commit `d17e4e2f4` records the remaining page-state mock after integration checks. Actual transport/browser recovery, refresh/mobile, grants, cache and deployment remain Current unverified.

Focused commands: `pnpm -C frontend exec jest --runInBand features/build/my-work/my-work-rows.test.tsx features/build/my-work/my-work-page.test.tsx features/build/ticket-details/build-ticket-detail-url.test.ts features/build/my-work/my-work-card-density.test.tsx`; `pnpm -C backend exec jest --runInBand --runTestsByPath src/modules/portal/client/portal-client-waiting-filter.spec.ts src/modules/portal/client/portal-client-lifecycle-acl.spec.ts src/modules/portal/client/portal-client-expiry.spec.ts src/modules/portal/client/portal-client-tenant-isolation.spec.ts src/modules/portal/client/portal-client-projection-parity.spec.ts src/modules/portal/access/portal-access-tenant-isolation.spec.ts`; `pnpm -C frontend exec jest --runInBand features/portal/portal-secret-redaction.test.tsx features/portal/portal-page-states.test.tsx features/portal/portal-contract-guards.test.tsx features/portal/components/portal-tenant-isolation.test.tsx`; `node scripts/check-build-execution-plan.mjs --self-test`; `node scripts/check-build-execution-plan.mjs`. Exact ESLint runs through its installed Node entry point when the Windows pnpm wrapper strips the portal path's parentheses; the failed wrapper attempt is not a product lint failure.

Current verified gates: backend production `node --max-old-space-size=10240 ./node_modules/typescript/bin/tsc --noEmit --incremental false -p tsconfig.build.json` and test-inclusive `node --max-old-space-size=12288 ./node_modules/typescript/bin/tsc --noEmit --incremental false -p tsconfig.test.json` exit 0. Frontend test-inclusive `node --max-old-space-size=10240 ./node_modules/typescript/bin/tsc --noEmit --incremental false -p tsconfig.specs.json` and final90 production `node --max-old-space-size=8192 ./node_modules/typescript/bin/tsc --noEmit --incremental false -p tsconfig.json` exit 0. The owned89/90 hashes remain frozen. Concurrent commits advanced frontend7fd3e99a2 through5d86174cd/874c5a264 and backend83d9e316f through2ac45cf15; backend later advanced to d79b1e9cc with an unrelated security-test change after these backend gates. No immutable clean deployment candidate or proof of that later test change is inferred. These are TypeScript gates, not optimized builds or current deployment proof. Canonical source/test semantic checks for89 produced zero diagnostics after correcting the harness package working directory; the initial harness resolution error is retained as a tooling failure.

Failed gates retained: `node scripts/check-build-contracts.mjs` reports 421 schemas with matching OpenAPI hash prefix `4a9c539b7aa0`, but the artifact differs from fresh generation. Vendor equality passes at SHA256 prefix `2b0b10a3e88ab2c3`; equality does not resolve consumer-artifact freshness. The 93 generator and six vendor self-tests pass. `node scripts/build-doc-todo-tracker.mjs --check` reports a stale index and zero missing checklists. Generated artifacts and TODO regeneration remain with their separately assigned coordinator; no manual artifact edit or checkbox closure was performed.

Current verified reuse: the current external DashboardShell already renders the shared ErrorState with fullPage, handleRetryAccess and ErrorReference, so the pasted workspace error block is not implemented again. `pnpm -C frontend exec jest --runInBand components/shared/error-state.test.tsx` passes all 17 accessibility, retry, full-page, status and reference tests. Current port1000 `/build/6/settings/workflow` visibly reports Couldn't load your workspace / Request timed out. Please try again. This proves the failure presentation only, not successful workspace or workflow loading.

Current unverified runtime/release: the authorized Railway recheck still reports latest `bad561a4-3139-4a5b-a50f-8ff1d56f1733` FAILED at `5725b462bf258161cf60f99c5b26e39390ee4233`, with previous `fcd4279a-6971-478e-8899-33c6d427740d` CRASHED. The failed deployment's build logs report two NotificationsLifecycleService constructor arity errors; those exact paths were concurrently fixed by Claude in `2ac45cf15` and were not edited here. The prior deployment's bootstrap failure has no precise cause established by this receipt. No deployment, rollback, restart, authentication bypass, production write or live Ticket comment was performed. Browser/DB/role/cache/event/mobile/deployment/operations proof remains open.

Cleanup decision: the read-only inventory compared SHA256 for 169 Markdown candidates outside protected evidence/screenshots and found no exact duplicates. The checked master prompt still has open BT-47a128753eb8 and active inbound references; completed specifications remain implementation authorities, while evidence/research retain unique findings. No Markdown, screenshot, evidence or source file was deleted or created by89/90. Only the unused private waiting predicate/imports were removed inside the owned service. A checked box alone is not a deletion reason. Larger external-recipient approval modeling, production release recovery, generated-contract reconciliation and full runtime acceptance are assigned in the existing work claims for Claude follow-up. No broad BT requirement or D/I/T/R/B/L stage advances from these bounded fixes.

## Readiness review88 — 2026-10-05

Current verified review and gate observations: three disjoint read-only reviewers assessed standards, backend security/specification behavior and requirement evidence. Frontend baseline d777ec284 advanced to f0b6a158; backend641be6ffc advanced to5725b462. External working changes were preserved. These observations do not establish application readiness.

Standards: `frontend/features/build/my-work/my-work-rows.tsx` still intercepted primary clicks into pane/projectId parameters that My Work did not consume. Its canonical native href differed from the intercepted destination. The existing row test omitted the click handler from its Link mock. Row SHA25640c95343449afba2df6a01c96ee496dad319e209a4bd323c128c5b893573663c stayed unchanged at f0b6a158. Successful details/history/mobile/denied actors remain Current unverified; source correction is now assigned under89 after explicit human handoff.

Specification/security: `backend/src/modules/portal/client/portal-client.service.ts` used any live project client_approval with pending/requested status for waiting=true, without capability or recipient scope. The Build producer uses that type for internal Client access requests assigned to a project manager, rather than an external client's required action. Comparing lists can therefore reveal hidden approval existence. Source SHA256b000679e4a2a5d79f2b30e5fe025ef5bbcf5d88ef75e97e2a29088d375533ef3; waiting test SHA256d65a4627565e4dafa66aca90ef2858f03f82dc404bb250bad826b427aa3aee9e. Runtime exposure remains Current unverified.89 contains the filter with an actionable unsupported-filter error until a canonical external-recipient action projection exists; the broader approval projection is a separately owned follow-up.

Gate baseline: tracker check failed stale index with zero missing delivery checklists. Execution-plan self-test passed9 cases, while normal execution failed on missing BLD037–099 and duplicate references. Independent inspection found36 canonical requirements but99 numeric table occurrences; the parser incorrectly scans later reference tables.89 will scope the existing parser to its unique complete canonical header without weakening floor, sequence, duplicate or malformed-row validation. Historical failure remains retained.

Tracker provenance: eabc56314 contained114 checked/409 open523 total; d777ec284/f0b6a158 report300 checked/235 open535 total.174 existing items were newly checked,12 new checked local-worker receipt items were added, and no checkbox texts were removed. Counts describe document state. Evidence reconciliation is required for BT-be12f9c005dd (deployed project-read parity despite follow-up86 HTTP500), BT-47a503e85f08 (deployed outbox dispatch while source-only evidence excludes delivery/leases), and BT-8a6d5a615ca5 (every-action/actor/tenant/recovery authority while the ledger retains missing proof). No mass completion or unrelated checkbox reversal is inferred.

Cleanup87 evidence gap: its claim names the15 cleanup plan as inventory, but the reviewed plan and cleanup manifest contain no cleanup87-specific before hashes, replacement sections, reviewer and validation mapping. Historical entries do not prove new deletions. No Markdown, source or evidence file was deleted by88.

Browser: existing port1000 `/build/6/settings/workflow` moved from organization synchronization to Couldn't load your organization / Request timed out. Try again returned to synchronization; successful workflow loading was not observed. Independent production health GET timed out after15 seconds. Listener16500 and parent10072 remained present. These are availability failures, not authentication/authorization/persistence evidence. No process was restarted, secret printed, production write performed or browser security workaround attempted.

Authorized Railway metadata89 identifies FAILED deployment bad561a4-3139-4a5b-a50f-8ff1d56f1733 at5725b462bf258161cf60f99c5b26e39390ee4233, created2026-10-05T10:48:00.833Z; prior fcd4279a-6971-478e-8899-33c6d427740d is CRASHED atc483b239dfa97c15c9db554638bbf062d24d73d2. Metadata does not prove the precise outage cause. No deployment was initiated by this coordinator.

## Browser navigation follow-up86 — 2026-10-04

Current verified at frontend eabc56314/backend b70fcc91e: authenticated port1000 My Work search for QA-070 updated q=QA-070 and displayed one matching row. This supersedes the earlier inconclusive search observation during the frontend restart. Ordinary row click changed the URL to pane=159&projectId=1 without displaying ticket details; unchanged accessibility state and a screenshot confirmed the missing pane. Browser Back preserved the search and matching row.

Independent read-only review identifies my-work-rows.tsx intercepting primary clicks into legacy pane parameters that MyWorkPage never consumes. Its native href already uses the canonical ticket destination. Existing my-work-rows.test.tsx drops onClick in its Link mock, so href-only assertions do not cover this defect. ARCH-16 owns the row file; no overlapping source change was made. Canonical destination plus the existing navigation-leave guard and meaningful primary/modifier-click regression require owner handoff.

Direct navigation to the actual row href reached the project-scoped ticket route but displayed Projects Error. Browser error telemetry identifies GET /build/1 as HTTP500 INTERNAL_ERROR, correlation b5ea0131-dc3e-4e13-9b8f-569eacf66af8. Railway logs for the authorized StreamlineOS service match that correlation and SQLSTATE42702: column reference role is ambiguous in the joined project-member authorization projection. This is a real server failure, not a controlled permission denial. WORK-CLAIMS already assigns project-access.ts and its projection regression to module_grants_resume for this same failure; source/deployment handoff is required. No query, permission, data or deployment change was made in this follow-up.

Current unverified: ticket detail rendering, mobile, refresh, full role/tenant matrix and production deployment of the existing projection correction. No broad BT or stage is completed. The original twelve-hour window elapsed; latest human continuation authorizes further work without changing evidence requirements.

Inbox follow-up86: direct navigation reached port1000/build/inbox and initially rendered one task-status notification. The visible category menu contains only All types, Projects & tickets and Approvals, matching the requested Build-specific UI rather than a global module selector. The content subsequently changed to Validation failed, reference bd154c19-39c9-4ce2-89db-8a363d4ce5a9. A bounded authorized Railway lookup of100 lines found no matching correlation; no server status or cause is inferred from that absence. Source review requested. Category-menu rendering alone does not prove server-side module isolation, successful list refresh, mutations or complete Inbox behavior. No notification was marked read, resolved or archived.

Independent Inbox source review86: desktop auto-selection makes a second bounded notification request with ids and limit1 after the initial list. Current strict DTO accepts ids; initial list parameters also validate. Railway status recheck identifies a newer SUCCESS deployment7b529073-7bb2-468a-a99f-b99904d137bc created2026-10-04T15:04:38.068Z at52421c5f3feffeb47fd44d0c52a85c9abad4fc5e. This supersedes the earlier deployment metadata observation. Git inspection of that reported deployment revision confirms its strict notification query schema omits ids and SNOOZED, while the local schema includes both. This is verified source compatibility drift; the selected-request explanation remains an inference until actual failing request/status/details are captured. Do not weaken local strict validation or fabricate a complete deployment/browser proof.

## Browser resume84 and review85 — 2026-10-04

Current verified bounded source81: backend commit f100dcd47 changes only the existing public response declaration and service-contract regression suite. Both populated lookup cases failed before correction (2 failed/2 passed), then4/4 passed. Exact lint/diff and source/test semantic TypeScript diagnostics0 passed; independent review CLEAR. Source393 SHA9bfdf8ea5ee2b724c32ef2024330021bb0aab6a99b19776b4d13250ba8485228; test79 SHA5c4f966cc50b3f9d05ea9ee863443024b96ff8e183c9d3fee4966b64a1a5fe29. Official generation at that checkpoint produced4128 operations/4113 Zod contracts/0 undeclared; vendor equality and fresh319-operation frontend generation passed (OpenAPI prefix aa631306cc477873). This is not deployed/runtime/browser proof.

User authorized production backend/database with frontend1000 and Railway log/deployment access. Private token-scoped metadata identified StreamlineOS production service, api.streamlineos.in, successful deployment de6252bf-1b9e-453e-8de7-2d5d9738661c at d6c8f455b12d3b817be54dd2df528cc8b541a814, created2026-10-03T06:03:40.145Z. Health GET200 and60 selected info-level log rows are bounded observations, not operational readiness. No deployment was performed; credentials stayed out of repository files and log output. Default CLI linking was unrelated and was not modified; unrelated service logs were not read.

Claude corrected the duplicate workflow-template controller prefix to build/work-templates; generated ProjectsTemplatesListTemplates response export is restored. On resume at frontend HEAD8e8a78702/backendee769324d, authenticated localhost1000/build/my-work rendered the real work tabs, controls,50 rows and cursor pagination. This rendering does not establish the required tenant/role matrices. Search input accepted QA-070, but URL/50 rows did not update during the observation; Enter/blur did not change the result. A frontend child restarted during this interval (listener17580 changed to16500, parent10072), and the subsequent Ticket click encountered a browser-generated connection-refused page blocked by URL policy. Ticket navigation/search success is not claimed. No security workaround was attempted; manual normal-page reopening requested.

Read-only source diagnosis84 found the intended300ms debounce→router.replace→canonical search request chain, with no evident dropped query. Enter flush is not wired, but the persistent URL observation remains inconclusive under the restart. Recheck with stable rendering before fixing an assumed search bug. Browser logs also contained HTTP200 contract failures for /build/releases readiness; deployed/local revision compatibility needs investigation before changing contracts.

Bounded physical follow-up84: READ ONLY streamline_app checks (not superuser, not BYPASSRLS) used the application project-to-tenant resolver and explicit tenant/audience GUCs. Exact reserved Project1/TicketNumber123 marker QA-070 exists, IN_REVIEW/version4/not deleted. Reserved Project55/Form5 marker matches, active/public/not deleted. Production public GET for its token returned200 and parsed the current official generated contract with3 fields; the token remained private. Unknown public token GET404 and unauthenticated internal Form5 GET401 were controlled denials. No write, cleanup, browser mutation, API actor-role matrix or production revision upgrade is claimed. The same organization's bounded release-readiness aggregate found one null value; current generated readiness permits null, so the stored value alone does not explain the earlier browser contract error. Do not mutate release data or loosen validation on this inconclusive observation.

Read-only standards/spec review82 found six open issues across seven stable Ticket UI/client-access files: silent visibility failure; first100-only project picker; QUEUED called sent; nested activation can create a second/unintended project grant; publication missing preview/confirmation; loading/error/denial collapsed into an empty picker. Review did not cover the entire repository. Claim85 assigns only the previously coordinator-owned visibility hook and existing hook test to separate agents for error feedback. Client-grant/UI panel source remains with its current owner. No live Ticket comments, publication or role changes were made; broad BT/D/I/T/R/B/L stages remain open.

Source correction85 is committed as244a4c949, exactly six claimed files. Shared hook error feedback covers conflict/permission/network; duplicate callbacks in ClientVisibilityPage and ProjectSettingsPortalPage were removed after each actual page integration reproduced two notifications. Separate milestone feedback is preserved. Final focused suites49/49, strict exact lint/diff, settings source/test semantic TypeScript diagnostics0 and independent complete three-caller review CLEAR. Four-path hook/page semantic gate remains failed with one untouched overview-contract capabilities mismatch; no full typecheck success or browser mutation is claimed. Reviewer corrections and failing tests were retained rather than treating initial hook-only GREEN as sufficient. Source ownership released; full requirement, preview/confirmation, authorization, persistence mutation, browser/mobile and deployment remain open.

## Reserved form runtime80 and contract defect81 — 2026-10-04

Current verified: clean private checkout7a7af1470 combines reviewed eeea9726a with ed66e9f49 configured validator and187afb7f2 typed-answer fix. Independent high-effort review clears the complete bounded production prerequisite; private two-suite run61/61 passes. Old owned runner13892 was confirmed by PID/command before stop and exited1; no graceful shutdown is claimed. New owned runner1984 became ready on1001, ordinary NextAuth synthetic refresh succeeded and reserved Project55 GET200 matched contract/ACTIVE. Frontend remains1000.

Canonical create Form5 `Build verification answer integrity form 80` returned201 with valid generated contract. READ ONLY transaction using nonsuper/non-BYPASSRLS application role verifies reserved org/project/form names, three fields, configured create_task action and zero baseline submissions/Tickets. Public malformed POST was blocked by synthetic runner403 `BUILD_BROWSER_SYNTHETIC_ONLY`, before application validation; no public400 proof follows. Do not bypass this boundary or count it as application denial.

Authenticated shared-command negative controls: malformed multiselect and309-digit decimal overflow each return400 `BAD_REQUEST`; READ ONLY persistence remains zero submissions and zero matching Tickets. Valid finite decimal/string-array POST returns201 and valid contract, creates Submission2 processed and Ticket361 with exact same-org/project conversion. Fresh submission-list GET200 parses and contains that linkage. Initial persisted-values comparison failed because JSON object key order differed; explicit field/array comparison confirmed exact values without resubmitting. No mutation retry or duplicate submit is claimed.

Public form GET200 fails its official declared/generated contract: missing title, field IDs and branding; actual returns name/type/key fields/publicToken, matching the existing frontend definition. Primary service bytes match private source. Claim81 addresses existing response declarations with RED tests; this is a real contract defect, not a passing response. No-auth internal form GET401 and wrong-project internal GET404 are controlled negatives, not a complete role/tenant matrix. Cache/events, idempotency, all role/tenant/public lifecycle paths, browser/mobile and release remain open. Form5/Submission2/Ticket361 are reserved current proof records pending canonical cleanup after contract retest; no direct SQL mutation or Ticket comment occurred.

## Current workspace and verification78 — 2026-10-04

Source commits: backend `187afb7f2` contains only the two78 paths; outer `52c1ff4a4` contains only the79 row component.79 exact-file semantic TypeScript now passes diagnostics0 in addition to28/28 panels, lint/diff and review. These supersede earlier pending79 TypeScript wording. Neither commit closes a broad BT or supplies physical/browser/release evidence. Private reviewed runner still serves `eeea9726a` until an explicit verified revision handoff.

Backend production TypeScript terminal91451 completed exit1 with10 diagnostics outside the two78 paths: dashboard project health, templates Zod record/idempotency arity, epics assignee column, Intake row/table typing, Deals idempotency arity, entity-reference record arity, invitation deletedAt and portal project-status typing. Exact78 semantic TypeScript remains separately passed; the production gate is failed. No unrelated owner files were changed to hide those errors.

Header79 bounded correction: existing Command Center BlockersPanel used an unsupported shared-header icon prop. Removed only that prop and unused import; actor `scope:mine`, rendering states and shared style are preserved. Source408 SHA5c2dbbc4d1bbb5c44a5f5e39b164d8a06703c6b86cca5493e3f361729300750d. Existing panels suite28/28, exact source lint/diff and independent low-effort frozen-hash review pass. Original production TS2322 supplies the failing contract observation; post-correction semantic TypeScript and browser/mobile remain pending. No broad BT closure.

Current route execution-plan gate fails on missing `/build/budget`, `/build/programs/[programId]`, `/build/reports` and `/build/[projectId]/[ticketKey]` specification mapping. Additional external documentation edits made the TODO index stale again after an earlier passing generator check; these are preserved. No route or tracker freshness pass is inferred from source existence.

Final78 bounded source gates:23/23 focused tests pass, exact source/test strict lint and whitespace pass, exact source/test semantic TypeScript diagnostics0 (terminal59702). Independent high-effort security review matched both hashes and found no actionable bounded defect. Test301 SHA4cd34462edfc0e97b7828e5e36974c41bb1fa857c2e2e5f645b1facc10f51bf5; source366 SHA9478ae8fb9466a5326bc6b7f263c4a42dd13f684203a275a19e47b52d37b0403. The GREEN supersedes the pending statement below. Public-token transaction setup precedes field checks; zero write/effect assertions do not mean zero transactions. Actual HTTP/DB/browser and broad BT completion remain open.

Outer workspace HEAD advanced externally to `ce94d9eca`; nested backend advanced to `1d7e384d6`. These changes are preserved and not represented as coordinator-reviewed or served by the private runner. Tracker regeneration now discovers523 unique tasks,110 complete/413 open, following additional specification text. Earlier522/110/412 receipts are historical snapshots, not current counts. Generator apply and check pass after refresh; original-ID preservation and semantic mapping of externally changed checklist text need separate reconciliation. No requirement completion or stage advanced in this continuation.

Frontend production TypeScript session64766 terminated exit1. Observed errors include ClientPortalOverview capabilities, unsupported PanelHeader/EmptyState icon props, public form/intake resolver types, comment-draft page/cache/context shape drift, report-member fields, onboarding Zod4 record arity and response drift, missing generated template-list schema and cross-module record arity. Output was truncated; no exact diagnostic count or whole-gate pass is claimed. The attempted `pnpm -C frontend typecheck` failed because that script does not exist; actual gate was `node --max-old-space-size=10240 node_modules/typescript/bin/tsc --noEmit` from frontend.

Browser inventory was empty; creating a fresh port1000 sign-in tab again timed out during attachment. No rendered Build/browser/mobile flow is claimed. Independent76 review confirms obsolete endpoint/operation absent from both OpenAPI files and generated frontend response source; vendor texts agree after newline normalization, not byte-for-byte (backend SHA447607fe7c54b842be8b367de23198c4a12e21c3cf03dbfc46de85bd697c896b; vendor SHA87a059790b7009b5bb95c53cbc3d5073587a7895f3e03b2708aeb3085cdd3034).

Claim78 public-answer RED: actual submitPublicForm produced7 failures/16 passes,23 tests total. All seven malformed arrays/overflow decimal strings reached insert, Ticket creation, audit and publication; required400/zero-effects assertions failed. Original unique controls retained by common public fixture; suite shrank312 to301 lines. The two-line shared validation correction is frozen at366 source lines SHA9478ae8fb9466a5326bc6b7f263c4a42dd13f684203a275a19e47b52d37b0403; GREEN and final review pending. Existing configured field enforcement is present: prior broad missing-enforcement wording is superseded. Physical API/DB/browser proof remains separate.

## Synthetic checklist lifecycle77 — 2026-10-04

Current verified: reviewed synthetic backend revision `eeea9726a`, canonical server-issued session, reserved Project55 and Ticket360. Checklist37 and Item50 create returned201; both updates returned200 and matching READ ONLY application-role persistence. After archiving only this reserved project, all six checklist/item create/update/delete commands returned409 `PROJECT_LOCKED`. History GET returned200; exact persisted rows and timestamps stayed unchanged. Project restoration returned200 and persisted ACTIVE. Cleanup deleted Item50 then Checklist37 with204 and empty bodies; final GET returned200 `{success:true,data:[]}` and READ ONLY persistence showed ACTIVE with zero checklist/item rows. No customer records or Ticket comments were used.

Retained failures: an initial archived command exceeded the five-second observation timeout; it supplies no HTTP denial proof. Restoration and unchanged persistence were checked before the subsequent six-command run. Two cleanup attempts returned401 after session expiry; no rows were deleted. A closure-based verification-helper assignment did not reliably refresh the outer token binding; explicit top-level normal session refresh resolved this harness issue. The final cleanup used that fresh session. No application authentication defect is inferred from the helper behavior.

Current unverified: complete role/tenant matrix, idempotency, archive-after-check races, assignment identity, event/cache effects, browser/mobile, deployment and operations. This bounded lifecycle does not complete BT-7c62c17f5d40 or BT-c145e5ed8633. Tracker remains110 complete/412 open/522 total.

## Competing ownership writer76 — 2026-10-04

Official regeneration completed:4124 operations,4109 Zod contracts,0 undeclared exposure and382 page caps. Vendor equality and fresh frontend generation checks pass, with398 schemas and317 hook-consumed operations, SHA prefix `447607fe7c54b842`. Both OpenAPI files no longer publish the competing ownership path/operation. Generation includes other lane changes; increased operation count does not prove their review or completion. This final update supersedes the pending generation statement below.

Current verified source correction: removed the unused ownership POST and competing roster writer/provider while retaining both standing GETs and unrelated module composition. Actual Nest HTTP tests9/9 and metadata/unchanged canonical controls41/41 pass; exact lint, whitespace and scoped source/test TypeScript pass. Independent high-effort review matched frozen hashes and cleared the bounded source delta. These HTTP tests use fixture authorization and storage, not physical PostgreSQL/RLS proof.

The initial HTTP RED storage stub did not invoke the tenant callback: observed201 and transaction dispatch were not evidence of actual unsafe writes. The corrected suite proves route removal and exact404 twice across five actor shapes with zero observed mocked effects, plus retained GET401/403/200 controls. Generated contract removal and vendor/freshness checks pass as recorded above. Fabricated standing-read fields and canonical direct-transfer concurrency remain open; BT-06d4c0b58e4c is not complete.

## Current review corrections and browser entry — 2026-10-04

Classification: Current verified for the bounded source/test observations below; Current unverified for complete Build flows, physical authorization/persistence, mobile and release. Tracker remains110 checked/412 open.

- Backend checklist `eeea9726a`: current independent review found no introduced bounded policy defect; four focused suites90/90 pass. Reviewed synthetic backend PID4692 serves this revision on1001; no new PostgreSQL claim follows from readiness.
- Intake70: actual required/whitespace/email/decimal denial, exact normalization and optional blanks, entered-answer preservation through a failed submit, successful retry and receipt: three suites57/57 pass. Exact source/test lint/diff pass. Source350 SHA734d214e0c0c830b15648dd4154f88334b701b8d7b298e4830d1ec311b78fda3; test264 SHA13bf77b1ab51ad7ed1b3746a9a7cce326dfef80b044d93957c8df56256696919. Authoritative server answer validation remains separate and unverified.
- Ticket client-sharing review found detail-cache invalidation missing. Existing hook/test corrections captured meaningful RED1failed/11passed, then hook/contract suites28/28 pass and strict two-path lint. Both visibility-prefix and exact project/Ticket-detail invalidations are now awaited, retaining pending through refresh. Independent final review found no concrete defect; real switch/refetch/persistence remains unverified. Initial strict lint failed on an existing unused import and forbidden require; corrected within exact owned files.
- Triage review found unsafe modifiers, editable targets, repeat and pending keyboard decisions. Existing source guards these and synchronously latches duplicate/opposing actions. Existing test retains lane positives and covers those negatives plus recovery: two suites38/38, exact source/test lint/diff pass. Source367 SHA829ebefcc402a5cda659ac98c88d916c3e25bc2c2ebee24c0197b070a60a9880; test266 SHA35b6ec3c52e700a5c47da917766c55790cd3ea1abbca9d680c62359d12c759c9. No original-prepatch RED is claimed: Git HEAD lacks the prior uncommitted handler. Actual keyboard/browser and backend denials remain unverified.
- Coordinator changed-path TypeScript for the visibility hook/test, Intake source/test and Triage source returned diagnostics0. Production/full-test TypeScript is not inferred.
- Actual browser16 on127.0.0.1:1000/signin rendered an intact desktop sign-in layout. Reserved existing-email submission reached the verification-code step. Local captured-mail navigation in temporary browser17 was blocked by the browser with ERR_BLOCKED_BY_CLIENT; no bypass or credential exposure occurred. Authentication, Build browser/mobile and screenshots of completed flows remain pending. API proof cannot replace them.

All newer uncommitted lane changes require their own current review and evidence. The supplied claim that seven production migrations were applied has not been independently revalidated in this checkpoint. No task or D/I/T/R/B/L stage closes from these narrow results; no source comments, live Ticket comments, broad deletion or unrelated staging occurred.

Documentation generator apply/check passed with70 specifications116 research files. Current execution-plan validation failed on missing `/build/budget`, `/build/programs/[programId]` and `/build/reports`; current lane route changes require reconciliation against the canonical screen/route decisions. This gate is explicitly failed, not waived or treated as behavior proof.

Independent route review found the three physical untracked destinations were still planned in documentation: Program detail is a permanent skeleton without a data hook, while Budget/Reports redirect to unsupported All Work view values and lose incoming query context. Their existence is not completion. Final visibility hook/contract rerun includes successful and failed PATCH reconciliation:29/29 pass. A separate low-effort reviewer found no bounded implementation defect and confirmed active-query/refetch/browser proof limits.

The attempted ordinary session refresh timed out and reset the persistent verification tool kernel. No authenticated session or returned API status is claimed; privately held secrets are no longer available. Subsequent listener inspection found no1000/1001 listeners, requiring authoritative process revalidation and a fresh reviewed runner launch rather than assuming the old handles remain live. Production source TypeScript is still running under terminal session68414; it is not reported passed.

Follow-up current verification: session68414 terminated exit1 with17 production source diagnostics, including Command Center prop/widget typing, invalid nav-preference API-client/decoder usage, Zod4 record arity and readonly capability narrowing. The earlier changed-path diagnostics0 is retained separately. Frontend1000 recovered through process-only configuration. Backend recovery first failed on missing module-root alias configuration, then unavailable tsconfig-paths preload; corrected module-root NODE_PATH reached an independent missing installed `drizzle-orm/pg-core/index.cjs` failure. These loader/dependency failures are not application behavior proof. No environment files or dependency links were edited by the coordinator.

Program72 test execution also failed before behavior on VirtualAlloc and missing installed y18n/exit modules. Source implementation awaits a meaningful test RED; no passing test or production detail is inferred. Existing OpenAPI already contains canonical Program GET; its frontend generated response export is consumer-driven and must be officially regenerated after the new query consumer, never hand-written. Dependency/runtime recovery and all current browser flows remain open.

Recovery72 subsequently captured actual populated-page RED1/1, then30/30 focused page/hook passes and exact five-path lint. Independent low review found raw owner/portfolio IDs and the newly consumed deleted detail cache remained fresh. Coordinator's assigned-metadata/delete tests captured2fail/29pass; source author corrected metadata without unauthorized lookups and awaited exact Program-detail-prefix invalidation. The31-case repeat first failed before tests on missing chalk; a subsequent repeat failed on missing lodash.merge and V8 allocation failure. Neither infrastructure failure is a GREEN result. Current assigned metadata names remain unavailable from the canonical projection; backend linked-project cursor timestamp precision was separately identified as a source-supported defect, not physically reproduced.

Official backend generation completed4122 operations/4107 Zod contracts/0 undeclared; the15 added operations were inventoried, including layout, landing, member standing, template, setup and portal activation surfaces. Official frontend vendoring and generation completed317 consumers at SHA prefixd2c4a7e8943a3dad. Generation does not independently review or deploy those other lane changes. Earlier Program-only generation312 consumers at54cfc6e2 had passed vendor/freshness; latest vendor check exited1 without diagnostic output and remains failed/inconclusive until rerun.

Recovered reviewed backend19968 reached1001 readiness. A bounded synthetic OTP request timed out locally but subsequent captured-mail GET200 found one message; no duplicate request was issued. Initial code extraction from absent plain text failed before verification, then HTML visible-text extraction identified one private code. Verification request also timed out, so consumption/persistence and authentication are unknown; never infer failure or retry from that timeout alone. No code/token/mail content was printed. Frontend1000 remains process-owned, but error1455 and transient listener absence were observed amid memory pressure. A system snapshot found915MB free of32096MB; subsequent infrastructure OOMs are retained. No unowned process, dependency link, package, lockfile, environment file or production record was changed to resolve these failures.

Resource handoff: after confirming frontend child18016 belonged to coordinator parent6220 and backend19968 matched its retained runner handle, coordinator temporarily stopped only those three owned processes to release verification memory. A subsequent process/listener probe found them absent. Private launch configuration remains in memory for the reviewed restart; no external test/process was stopped.73 focused tests run first, then72 repeat and runtime/browser recovery; no heavy root gate runs concurrently.

Recovery73 captured real landing-contract RED1failed/10passed and unknown-widget RED1failed/11passed before their respective corrections. The final existing contract suite passes20/20 with exact three-path strict lint and whitespace checks. Dashboard58 SHA1e5549abada7ce26b81c67246137736f343541cae43c4a32b1a66e1e998b2d07; landing41 SHA664598a91946fee98654d1fd15127b0d99c5df6f86c4414eebdbd69b863535e4; test243 SHAd2ec567eaf7201d1839aa91035150ab71d9f556aa9a1cf41985daecf8fd35c6f. Reads and mutation acknowledgments use official response decoders, mutations retain endpoint permissions, and the layout input derives from the canonical widget enum. Next CLI startup and HasteMap allocation failures remain failed runs. Independent review, current TypeScript/freshness, physical persistence/authorization and browser/mobile remain required; neither broad BT task closes.

Follow-up73: independent low-effort read-only review found no actionable bounded defect, while explicitly excluding runtime authorization/persistence, actual cancellation, simultaneous saves,409 recovery and deployment. Separate current vendor check exits0 and confirms exact backend/frontend OpenAPI equality atd2c4a7e8943a3dad; separate freshness check exits0 with398 generated schemas and exact regeneration over317 consumers. These successful repeats supersede the inconclusive latest vendor attempt for current artifact equality only; its failed run remains recorded above. Current production TypeScript and browser/database proof are not inferred.

Follow-up72 corrective repeat exits0 with31/31 across the two claimed Program page/hook suites, followed by separate exact five-path strict lint exit0. Independent final low-effort review found no new actionable bounded defect: no fabricated owner names or raw IDs, permission-gated portfolio link and awaited deletion invalidation for all detail cursor variants. Portfolio-link denial still lacks a focused negative assertion; active refetch timing, real pagination/navigation, database/tenant authorization and responsive layout remain unverified. These results resolve the failed corrective repeat only, not full Program acceptance.

Program74 captured corrected public getProgram RED4failed/20passed before source change, then final four-suite65/65 after the last wire-projection correction. The earlier RED fixture compared a trailing driver Z lexically; that failed fixture run is retained but is not the defect proof. Exact two-path strict lint and whitespace checks pass. Source472 SHA6ee32753ca0bfde7041ed22d8ff02af20a8a8ce673370d9c4754e100c979236a; test397 SHA6c505c996de23cc17145f3175be43fc1c28176ec0422817530db7530282e949e. Independent low-effort review verified both hashes and found no actionable bounded defect: microsecond text is retained through cursor binding, existing tenant/project reach predicates remain, invalid dates are rejected, legacy millisecond cursors remain accepted and internal fields are removed from responses. The23-row model traverses a20-row boundary without duplicate or skipped links. Models supply authorized rows and do not prove PostgreSQL execution, query plans, RLS or actual role reach. Scoped TypeScript is still running; database/browser/mobile/deployment remain open.

Program74 scoped TypeScript subsequently terminated exit1 with TS2554 at unowned `backend/src/modules/build/core/members/build-standing.controller.ts:71`, where @Idempotent lacks its required command name. No diagnostics were reported against the two74 owned paths, but the scoped gate is failed rather than passed. Author did not edit the unowned controller. All74 heavy processes ended before75 compiler/test work began.

Navigation75 captures exact registry TS2322 before its one-line string discriminator correction. Existing registry/navigation suites pass54/54, exact-path semantic diagnostics0, strict lint and whitespace checks pass. Source54 SHAf2e43dbe4d1f8ad287c1de16fc37d002c6adc8e7eb941a3b2fed4102327dc5a4; test81 SHAa921834b726148545fbe7519a42f339d63eeae969bca527598846a72ddcb86d5. Independent low-effort review matched both hashes and found no actionable defect. OR permission alternatives, empty-array denial and actual build-nav-model consumer remain unchanged. Live UI/server authorization and full production TypeScript remain separate proof.

Runtime recovery at10:54UTC uses the canonical pool resolver including its IAM password provider and explicitly requires APP_DATABASE_URL. READ ONLY observation verified current_user streamline_app with neither superuser nor BYPASSRLS before the reserved synthetic email query. The latest OTP is consumed, expired and has one attempt; the existing account is active, verified and not deleted. No code, token or hash was read. This resolves ambiguous consumption after the previous timeout, but establishes neither returned auto-login token nor session/browser authentication. Do not retry that consumed code. Ports1000/1001 were confirmed unbound before reviewed backend eeea9726a runner13892 and owned frontend parent5064 were restarted with private process-only configuration. Startup readiness is still being observed.

Security76 independent high-effort review found P1 competing ownership truth in the new uncommitted Build transfer service: membership-only authority, legacy buildMembers.role writes instead of moduleOwnerships, self-demotion, no serialization, missing required idempotency command name, no transactional ownership audit and incomplete standing/cache effects. A permissions-version bump is present and must not be described as no invalidation. Current canonical immediate transfer is Org Owner only; canonical pending initiation also permits Org Admin and actual Module Owner, followed by recipient acceptance. Retained standing reads separately return actor role for target, hardcoded project count and owner-flag-only standing; these defects remain open. Canonical direct transfer also lacks adequate old-owner serialization in the reviewed source; removing this duplicate cannot prove that path safe. Exact cleanup76 is claimed without touching active ARCH-01 source. No full RBAC task is complete.

Fresh normal synthetic API authentication: reviewed backend13892 and frontend parent5064 both reached readiness. Fresh OTP request observation hit a REPL ReferenceError after the request; status is unknown. A subsequent local captured-mail GET200 found one message, so the request was not duplicated. Fresh code verification returned200 with canonical success/data envelope; server-issued token was kept private and exchanged once through ordinary NextAuth CSRF200/credentials200. Session GET200 confirms the exact reserved synthetic email and a server-issued backend JWT; no token/cookie/mail/code is printed or persisted. Initial token check looked at the unwrapped response incorrectly and was false; envelope inspection resolved it without resubmission.

Current eeea9726a Project/Ticket reads: the first erroneous `/build/projects` API path returned controlled400 and failed contract validation; source confirms the canonical collection is `/build`. Its GET returns200 and valid projectsListProjects contract with one reserved project. Project55 is exactly `Build verification window12h project 62`; its detail and Ticket list return200 with valid generated contracts. Ticket360 is exactly `Build verification window12h ticket 62`; detail returns200 with valid contract and version2. Separate READ ONLY application-role transaction verifies neither superuser nor BYPASSRLS, binds server-issued tenant context and verifies the exact live project/Ticket relationship, ACTIVE project and persisted version2 matching the API. The first persistence attempt failed before query because a prior block-scoped pool variable was unavailable; re-resolving the canonical pool succeeded. These are read/persistence observations of existing reserved rows, not new write, complete RBAC/tenant matrix, browser/mobile or deployment proof.

Browser recovery remains blocked: the old in-app tab became a browser-generated data-protocol connection-error page during server shutdown. Browser policy refused binding/control; a fresh allowed HTTP tab attempt timed out attaching and inventory showed only the old tab. No raw browser commands or alternate control mechanism bypassed the policy. User has been asked to manually open the allowed port1000 sign-in page. Native normal-session proof does not establish browser authentication or completed Build UI.

## Forms, Intake, invitation and Ticket link evidence — 2026-10-04

Classification: Current verified for these exact source/gate/review observations and bounded normal synthetic API/READ ONLY results. Current unverified for complete tasks, browser/mobile, deployed authorization and release. All522 task checkboxes and D/I/T/R/B/L stage values remain unchanged (110 checked,412 open). Prior receipts retain their original runtime revisions; runtime66 below serves2eaa, while newly committed68 has not been served yet.

Source63 distinguishes untouched null description from an edited clear; two meaningful REDs and the final real Textarea/Save tests cover both. Source65 gives the existing Intake page a private decision owner, strict positive duplicate target, matching acknowledgment and trusted-owner reset. The new component owns drafts/commands/lifecycle rather than wrapping a pass-through; actual dynamic EntityFormDialog/TicketCombobox loading remains covered. Workstream is the UI label. Root specializes only the existing hook mutation types; it changes no API, permission, key, decoder or invalidation.

Source68 corrects independent64 review failure: canonical mail resolves on suppression/queued retries, which was insufficient delivery acknowledgment. Only invitation OTP opts into inline_ack_required. Its outbox row starts terminal FAILED, becomes SENT after provider ACK, and is excluded from PENDING retry workers. Typed post-ACK persistence failure preserves the acknowledged code and returns controlled503. Ordinary auth/mail policy stays unchanged. Controlled provider/DB doubles are not actual provider, physical concurrency or delivery proof.

Exact committed invitation staging is694 lines versus696 HEAD baseline. Unrelated working formatting remains725 lines and fails that working-size limit. The method exactly matches the reviewed working source; the suffix exactly matches baseline. Structured TypeScript equivalence and independent high-effort staged review confirm no functional omission. Unknown-author formatting is retained, never staged or waived. Other working/blob hash differences below are newline normalization. No source comment, live Ticket comment, schema/API/permission/generated change or deletion is included.

Actual runtime67 creates201, reads200, archives200, denies related-link create/update/delete409 PROJECT_LOCKED, preserves storage, restores ACTIVE200, edits200, deletes204 and reads200 without the deleted link. READ ONLY streamline_app transactions verify exact author/membership, unchanged denied writes, updated label and final zero links/zero Ticket comments. Known foreign related-link GET404 has an own200 control. The schema response wire uses title while storage uses label. PATCH validates through the official generated POST response schema because backend GET/POST/PATCH share the same canonical relatedLinkSchema; no dedicated generated PATCH export exists.

Retained method failures: guessed p.project_key (actual key), wrong tenant GUC app.current_org_id (actual app.organization_id), failed-cell undefined binding, guessed build.ticket_comments (actual build_events.ticket_comments), stale primitive JWT captured by an earlier helper (401 is not lifecycle proof), and initial unchanged:false from comparing wire.label instead of wire.title. Corrected explicit bearer input, fresh session, exact schema/GUC and READ ONLY proofs follow; failed read-only probes wrote nothing. Initial printer-based staging comparisons failed on formatting before structured equivalence; no index write preceded the verified result.

Failed gates remain explicit: full backend test TypeScript exhausted10 GiB; fresh full frontend specs has24 diagnostics: calendar/event-create-form-drawer-nesting.test.tsx2, calendar/event-form-fields-end-time-height.test.tsx1, chat/__tests__/message-input-format.test.tsx14, wiki/kb-conversation-list.test.tsx1, hooks/api/kb/kb-page-children-level-error-policy.test.ts1, hooks/api/mail-action-cache.test.ts5. They are unowned paths. Expected fixture account-index/email ECONNRESET/no-provider/suppression logs are retained, not actual delivery/projection proof. No stage closes from focused or production TypeScript alone.

API62 supplement observes one COMPLETED201 command fence each for project/ticket creation and one self watcher, but zero exact-ticket notification intents. Creator-recipient exclusion is source inference, not delivery proof. A normal NextAuth session and fresh Ticket read succeed after runtime66 restart. No secrets, tokens, OTPs, cookies, magic links, environment values or raw mail are recorded. Private browser login handoff remains unresolved; API persistence is not browser evidence.

Payload SHA-256: `e3608934ee2e0454bd1f828612578e7edbe30e5bb71851366e4947262d881e52` (UTF-8 JSON between fences, excluding fence newlines). Ownership and exact commands: [work claims](../implementation/WORK-CLAIMS.md).

```json
{
  "timestamp": "2026-10-04T07:03:57.472Z",
  "classification": "Current verified only for bounded source, tests, review and API/READ ONLY observations; complete tasks Current unverified",
  "tasks": {
    "total": 522,
    "checked": 110,
    "open": 412,
    "stagesAdvanced": 0
  },
  "source": {
    "source63": {
      "revision": "8093ead86fb269f2d39b2ce09a96c79df9abcceb",
      "focused": "3 suites / 43 passed; owned 11",
      "meaningfulReds": 2,
      "lintDiffScopedProduction": "passed",
      "review": "bounded CLEAR"
    },
    "source65": {
      "revision": "5e6b3389b",
      "focused": "3 suites / 42 passed; actual page 29 cases",
      "retainedFailures": [
        "Initial 2 TS2322 unknown update-hook result/error",
        "Async dynamic-render assertions 2 failed / 40 passed before correction",
        "Full frontend specs 24 diagnostics in six unowned paths"
      ],
      "lintDiffScopedProduction": "passed",
      "review": "intake_review65_final bounded CLEAR"
    },
    "source68": {
      "revision": "721ab4788948f58d68988baaeb0c523c5f0e276d",
      "focused": "19 suites / 215 passed; owned three suites 47",
      "meaningfulRed": "5 failed / 14 passed through canonical EmailService/outbox",
      "lintDiffScopedProduction": "passed",
      "review": "invitation_security_review68 bounded CLEAR for working and exact staged source",
      "staging": {
        "timestamp": "2026-10-04T06:52:32.585Z",
        "structuredAstEquivalent": true,
        "normalization": "Ordered TypeScript child kinds/literals/type-only/declaration/optional-chain flags; one identical throw if-block normalization; excludes positions/trivia/formatting",
        "canonicalLines": 694,
        "workingLines": 725,
        "canonicalSha": "c11a6c91d3cf97b317c7472ca94fc225d5060d0ba6547c28b9b529abbdea60db",
        "astProjectionSha": "0f487117a4a3d432814dbf0ee75f99cf3859d5381671902ff1b2ea1a7353edf4",
        "diskUntouched": true
      }
    }
  },
  "files": [
    {
      "owner": "source63",
      "path": "frontend/features/build/forms/components/form-builder-tab.tsx",
      "workingSha256": "ffe250e1ee394b568c35ef24bec339210ac9b1d2f70204d14206b9ccba305cf1",
      "committedBlobSha256": "ffe250e1ee394b568c35ef24bec339210ac9b1d2f70204d14206b9ccba305cf1",
      "workingLines": 252,
      "committedLines": 252
    },
    {
      "owner": "source63",
      "path": "frontend/features/build/forms/form-detail-page.test.tsx",
      "workingSha256": "7415998563439e3461c20e298a42167687d8beb6465a67d97ee2685f4fea62da",
      "committedBlobSha256": "7415998563439e3461c20e298a42167687d8beb6465a67d97ee2685f4fea62da",
      "workingLines": 299,
      "committedLines": 299
    },
    {
      "owner": "source65",
      "path": "frontend/features/build/intake/intake-page.tsx",
      "workingSha256": "e27e573faf5226e77c3714acaf8eb5df0bad418c1d2b4129850ba2db6e6eb22a",
      "committedBlobSha256": "e802b47d9c6862f92865d41550b8883fc24c571bc2dce4c4c1eda673179344a8",
      "workingLines": 313,
      "committedLines": 313
    },
    {
      "owner": "source65",
      "path": "frontend/features/build/intake/intake-schema.ts",
      "workingSha256": "a09b9a5c542f6e257dc57600068306bc241b2df8ac0470fbc7509a0b55d8cd2b",
      "committedBlobSha256": "a09b9a5c542f6e257dc57600068306bc241b2df8ac0470fbc7509a0b55d8cd2b",
      "workingLines": 35,
      "committedLines": 35
    },
    {
      "owner": "source65",
      "path": "frontend/features/build/intake/components/intake-decision-dialog.tsx",
      "workingSha256": "12c541928d08fd1f252e5e30d349d565823e23ec90e48ce10d2b836ae2c90d01",
      "committedBlobSha256": "12c541928d08fd1f252e5e30d349d565823e23ec90e48ce10d2b836ae2c90d01",
      "workingLines": 218,
      "committedLines": 218
    },
    {
      "owner": "source65",
      "path": "frontend/features/build/intake/intake-page.test.tsx",
      "workingSha256": "a1de17f42fc93d920dc38bce5e4f357f462b18ef03bf516f03bd01490898bd3f",
      "committedBlobSha256": "68f12627151b8d5d70b8be97c8888fe2b58dd53343d3262db43ffe60b6ed68bc",
      "workingLines": 293,
      "committedLines": 293
    },
    {
      "owner": "source65",
      "path": "frontend/hooks/api/build/advanced.ts",
      "workingSha256": "add2a51c3e3ac8ffa1287cc2d4b91e59f1429571d540c10c4a5d50abbe36bb5c",
      "committedBlobSha256": "ca1f51baa05cdef2478a1a06df4f8a4ebd8cf81e51fa14577905330d980f9ded",
      "workingLines": 484,
      "committedLines": 484
    },
    {
      "owner": "source68",
      "path": "backend/src/modules/email/email-outbox.service.spec.ts",
      "workingSha256": "43650a52bb5fc8f951234ca806f6814437ecbd397a80ff1755cdc30d83f99e7f",
      "committedBlobSha256": "a22f22ac79fa049270e426d40e51bc145f63535cf3cc1c495f41fc1e979ba064",
      "workingLines": 398,
      "committedLines": 398
    },
    {
      "owner": "source68",
      "path": "backend/src/modules/email/email-outbox.service.ts",
      "workingSha256": "e2ba96035ce94743d1e592447eaa826edafdef6e5cbbe6ad1d086cc058e13c4f",
      "committedBlobSha256": "5dc0b1e559a0781968ae7367fa59f2516e2817ad11e163a668727d7299f0d80e",
      "workingLines": 476,
      "committedLines": 476
    },
    {
      "owner": "source68",
      "path": "backend/src/modules/email/email-provider-selection.ts",
      "workingSha256": "4a7dbdb2bee681f70b6a30c25f1b9af404a34d5922851e933a7e9d291aacbb06",
      "committedBlobSha256": "7ab4a31dfbb69be4fe3311592dbd22834284c6093cff7a5622f3edfe6f30fe3c",
      "workingLines": 61,
      "committedLines": 61
    },
    {
      "owner": "source68",
      "path": "backend/src/modules/email/email-senders-auth-scope.spec.ts",
      "workingSha256": "cd2f64930ac683bd651501c29fd6d11a2571ebc5270e560c48e2c2422fa05158",
      "committedBlobSha256": "cd2f64930ac683bd651501c29fd6d11a2571ebc5270e560c48e2c2422fa05158",
      "workingLines": 102,
      "committedLines": 102
    },
    {
      "owner": "source68",
      "path": "backend/src/modules/email/email-senders.base.ts",
      "workingSha256": "83a705e51f46bd01a2367f99719d8357275ca0007111916cac79d0ad4336b909",
      "committedBlobSha256": "f28b55008f7243e2b6d36faf57f002220b63b3089ece4063f5fed4a3ab30a4a6",
      "workingLines": 456,
      "committedLines": 456
    },
    {
      "owner": "source68",
      "path": "backend/src/modules/organization/core/invitation-acceptance-otp-gate.spec.ts",
      "workingSha256": "81d576fdaeaa1e6312c06adce66dd4cabeaab6d7a9005e0afa7c9e798eb93be5",
      "committedBlobSha256": "81d576fdaeaa1e6312c06adce66dd4cabeaab6d7a9005e0afa7c9e798eb93be5",
      "workingLines": 485,
      "committedLines": 485
    },
    {
      "owner": "source68",
      "path": "backend/src/modules/organization/core/invitation-acceptance.service.ts",
      "workingSha256": "f1e661ba8cdfb06cfd7ccd75dc2ef8bd45e82d3f8d1c4a3a68c740fe5b4eeea1",
      "committedBlobSha256": "c11a6c91d3cf97b317c7472ca94fc225d5060d0ba6547c28b9b529abbdea60db",
      "workingLines": 725,
      "committedLines": 694
    }
  ],
  "api62Supplement": {
    "timestamp": "2026-10-04T06:00:42.986Z",
    "readOnlyApplicationRole": true,
    "completedProjectFenceCount": 1,
    "completedTicketFenceCount": 1,
    "responseStatus": 201,
    "watcherCount": 1,
    "notificationIntentCount": 0,
    "workerDeliveryProof": false
  },
  "runtime66": {
    "timestamp": "2026-10-04T06:20:52.290Z",
    "revision": "2eaa96b492964e0adbaaecec8c6b054fdf234da1",
    "sessionStatus": 200,
    "ownGetStatus": 200,
    "contractPassed": true,
    "status": "IN_PROGRESS",
    "version": 2,
    "browserProof": false
  },
  "runtime67": {
    "created": {
      "timestamp": "2026-10-04T06:27:37.176Z",
      "postStatus": 201,
      "postContract": true,
      "getStatus": 200,
      "getContract": true,
      "exactNewLinkReturned": true
    },
    "denials": {
      "timestamp": "2026-10-04T06:42:03.060Z",
      "archiveStatus": 200,
      "archiveContract": true,
      "createStatus": 409,
      "createCode": "PROJECT_LOCKED",
      "updateStatus": 409,
      "updateCode": "PROJECT_LOCKED",
      "deleteStatus": 409,
      "deleteCode": "PROJECT_LOCKED",
      "readWhileLockedStatus": 200,
      "readContract": true,
      "linkUnchanged": false
    },
    "wireMethodCorrection": {
      "initialUnchangedFlag": false,
      "reason": "Related-link wire field is title, storage field is label",
      "correctedUnchanged": true
    },
    "updatedPersistence": {
      "timestamp": "2026-10-04T06:47:02.258Z",
      "readOnly": true,
      "applicationRole": "streamline_app",
      "exactUpdatedLinkCount": 1,
      "updatedLabelPersisted": true,
      "projectRestoredActive": true
    },
    "delete": {
      "timestamp": "2026-10-04T06:47:10.204Z",
      "patchContractViaSameCanonicalRelatedLinkSchema": true,
      "deleteStatus": 204,
      "noResponseBody": true,
      "getAfterDeleteStatus": 200,
      "getContract": true,
      "deletedLinkAbsent": true
    },
    "finalReadOnlyPersistence": {
      "timestamp": "2026-10-04T06:50:22.095Z",
      "applicationRole": "streamline_app",
      "readOnly": true,
      "projectRestoredActive": true,
      "remainingRelatedLinkCount": 0,
      "ticketCommentsCount": 0
    },
    "knownForeignReadStatus": 404,
    "ownReadStatus": 200,
    "browserProof": false
  },
  "remaining": {
    "browser": "Private OTP handoff unresolved; no browser/mobile mutation proof",
    "backendFullTestTypeScript": "Previously exhausted 10 GiB; no passing full gate",
    "frontendFullSpecs": "24 diagnostics in six unowned paths",
    "deployedMigrations": "1730/1731/1732/1733/1734 unapplied",
    "invitation": "Pending-code shadowing, late timeout ACK, delivered eligibility/revocation/concurrency and real delivery/acceptance remain open",
    "ticket": "Complete idempotency/race/cache/event/role matrix and UI/release scope open",
    "intake": "Actual mutation, persistence, transport identity, full triage and mobile/release scope open"
  }
}
```



## Forms, Feedbucket and normal activation evidence — 2026-10-04

Classification: Current verified only for the exact source, focused gates and normal synthetic API/read-only outcomes below; Current unverified for complete requirements and release. Source60 uses the existing canonical public-field renderer; source61 serializes source conversion and queues publication after the enclosing commit. Both are independently reviewed and committed. The live backend still serves55, so the API62 observations do not prove newly committed58/61 behavior.

No broad checkbox or D/I/T/R/B/L stage advances:522 uniquely identified tasks,110 checked,412 open. The ordinary OTP → NextAuth credentials → organization setup → Project → Ticket path uses separate reserved synthetic API identity and server-issued authority; it does not complete the separate browser login awaiting private user code entry. No token, OTP, cookie, magic link, raw mail, secret or environment value is recorded. No live Ticket comment was posted.

Payload SHA-256: `f2c58dd9e3156c960195195c09e4dfb41fe1626dfa7978bf79eda9af4610f34c` (UTF-8 JSON between fences, excluding fence newlines). Exact commands/ownership remain in [work claims](../implementation/WORK-CLAIMS.md).

```json
{
  "source": {
    "classification": "Current verified for bounded source and focused gates; Current unverified for full requirements",
    "at": "2026-10-04T05:52:18.927Z",
    "packages": [
      {
        "number": 60,
        "repository": "outer",
        "revision": "683e3e7572f8864561041e41a52cf049d39a5d4c",
        "tasks": [
          "BT-1334e7840230",
          "BT-6510aa3284df"
        ],
        "files": [
          {
            "path": "frontend/features/build/forms/field-input.tsx",
            "sha256": "906214efb0309ed1c8255d6374a274065800639a625795f0d56a56e490f639c9",
            "committedBlobSha256": "906214efb0309ed1c8255d6374a274065800639a625795f0d56a56e490f639c9"
          },
          {
            "path": "frontend/features/build/forms/public-form-page-states.test.tsx",
            "sha256": "5e2c580b7a6acb2fe7efa09ca83b13a55e7bb8ab5181fe5c38a17a4fccd5fd64",
            "committedBlobSha256": "5e2c580b7a6acb2fe7efa09ca83b13a55e7bb8ab5181fe5c38a17a4fccd5fd64"
          }
        ],
        "meaningfulRed": "Actual PublicFormPage/View/RHF/Radix canonical dropdown and long_text RED2 before renderer edit",
        "focused": "C and root: two suites,42 tests passed",
        "lint": "Exact two-path strict ESLint and diff checks passed",
        "changedTypeScript": "Initial TS2345 in incoherent idle/error mock retained; coherent flags/data/variables correction; final 8 GiB scoped pass",
        "productionTypeScript": "Frontend production pass, session89864 exit0",
        "review": "Backend agent independent CLEAR; root hash/source review",
        "gaps": [
          "Actual published Form/answers/database/public authority/version proof",
          "Browser keyboard/mobile",
          "Deployment and operations"
        ],
        "retainedFailure": "First post-edit Radix jsdom pointer support failed; test support corrected without source bypass"
      },
      {
        "number": 61,
        "repository": "backend",
        "revision": "2eaa96b492964e0adbaaecec8c6b054fdf234da1",
        "tasks": [
          "BT-6aad874e5b9c",
          "BT-abd16670ef91"
        ],
        "files": [
          {
            "path": "backend/src/modules/feedbucket/feedbucket-submissions.service.ts",
            "sha256": "d6bd84d1fbcf525a94ae2298be8c51b561f1b33f69b941b67139fcc5e3d55c34",
            "committedBlobSha256": "33a1c16866389bdabd20e9da4f3ba3af7417d23ddb5196ae80aa0ec692e69855"
          },
          {
            "path": "backend/src/modules/feedbucket/lib/feedbucket-submit.ts",
            "sha256": "a94f4907e97e8cb7fd6f27a0435e953fd728de593cd8e28255fe63237dc49605",
            "committedBlobSha256": "a94f4907e97e8cb7fd6f27a0435e953fd728de593cd8e28255fe63237dc49605"
          },
          {
            "path": "backend/src/modules/build/core/tickets/projects-tickets-create.service.ts",
            "sha256": "17ce44a086f84867655cf0098989ee77473592063d56fad14af00fde7060543d",
            "committedBlobSha256": "74db481ddfb50f8921031f87b536f11eff4e9daa1adff5a159c55c2b3003ccf8"
          },
          {
            "path": "backend/src/modules/feedbucket/feedbucket-convert-project-access.spec.ts",
            "sha256": "272d8570df44964b7b8620a811ec7602428a1bdd82540404be3be85502bb51ba",
            "committedBlobSha256": "04580ffe5ba2109ec2119553c4abeee3b12ff6eabf6ca539b3975ba293301cc5"
          },
          {
            "path": "backend/src/modules/feedbucket/tests/feedbucket-auto-link-deferred.spec.ts",
            "sha256": "4eb9ec2b6ded8bae8e23928bfd78ff6016ffb26c568ed5e1256a36eb59c6cb8f",
            "committedBlobSha256": "8b9fcf53a38a182c57df47d63aa245c98ee44586690d2c7061ce09e8d66ae6cd"
          },
          {
            "path": "backend/src/modules/build/core/tickets/projects-tickets-create.savepoint.spec.ts",
            "sha256": "1c1e63dfcff50d8708d6121d5320c320dd6246a60dfa1ba5a563e93c2e15e679",
            "committedBlobSha256": "037acefcd4c421dc944c6de87bb4fd46728a859cf0551658c40fa23789be6fd5"
          },
          {
            "path": "backend/src/modules/feedbucket/__tests__/feedbucket-build-notification.spec.ts",
            "sha256": "c48e73811a22e00538855823dc081ca7c84655b99db67cbc17dd943d03f8b2df",
            "committedBlobSha256": "c48e73811a22e00538855823dc081ca7c84655b99db67cbc17dd943d03f8b2df"
          }
        ],
        "meaningfulRed": "Three seam REDs: repeated basic conversion, repeated committed auto-hook and publication before outer commit",
        "focused": "C and root: four suites,48 tests passed",
        "lint": "Exact seven-path strict ESLint and diff checks passed",
        "changedTypeScript": "10 GiB scoped pass, session77893 exit0",
        "productionTypeScript": "Backend production pass, fresh root execution exit0 at 05:50Z",
        "review": "Frontend agent independent Standards/Spec CLEAR on all seven hashes; root source/hash review",
        "compatibility": "Initial4 suites passed/2failed,41 tests passed/21failed; affected notice fixture corrected. Final5suites passed/1failed,42tests passed/20failed",
        "retainedFailure": "Twenty unchanged AI fixture failures reach missing AccessService.scopeFor before mocked Ticket adapter. No pre61 execution baseline; static attribution only. Excluded AI source/test remain unchanged.",
        "gaps": [
          "Actual PostgreSQL source lock/concurrent mapping/rollback",
          "Real HTTP response/RLS/cache/event proof",
          "Runner refuses Feedbucket writes and reserved org Feedbucket disabled",
          "Header replay, hard-delete durable mapping and complete authority races",
          "Browser/mobile/deployment/operations"
        ]
      }
    ],
    "newFiles": [],
    "deletedFiles": [],
    "tracker": {
      "total": 522,
      "checked": 110,
      "open": 412,
      "checkboxChanges": 0,
      "stageChanges": 0
    },
    "runtimeBackendRevision": "5dcafa517ca634e658345c08c4085899900279a3",
    "hashBasis": "sha256 is the reviewed frozen working-tree byte hash; committedBlobSha256 is the exact Git blob hash. CRLF/LF normalization may differ without source-content change."
  },
  "runtime": {
    "classification": "Current verified for named normal API and read-only outcomes; Current unverified for full journeys",
    "runtime": {
      "frontendPort": 1000,
      "backendPort": 1001,
      "backendRevision": "5dcafa517ca634e658345c08c4085899900279a3",
      "source60And61Served": false,
      "providersAndBackgroundWorkers": false,
      "capturedMailOnly": true
    },
    "before": {
      "at": "2026-10-04T05:16:18.659Z",
      "exactReservedUserCount": 0,
      "readOnly": true,
      "scope": "Older Flow02 application-role guard plus GLOBAL exact new-email identity lookup; not tenant-only signup proof"
    },
    "authentication": {
      "at": "2026-10-04T05:20:02.523Z",
      "otpStatus": 200,
      "credentialStatus": 200,
      "sessionStatus": 200,
      "reservedIdentityMatches": true,
      "userIdShape": true,
      "registeredSessionShape": true,
      "backendBearerShape": true,
      "orgPresent": false,
      "organizationAccess": "none",
      "enabledModules": [],
      "browserProof": false
    },
    "activation": {
      "first": {
        "at": "2026-10-04T05:21:11.350Z",
        "status": 201,
        "success": true,
        "orgIdShape": true,
        "autoLoginTokenShape": true,
        "errorCode": null,
        "selectedModules": [
          "build"
        ],
        "browserProof": false,
        "responseShape": "top-level declared success/orgId/autoLoginToken; initial evidence extractor incorrectly assumed data envelope"
      },
      "requestSchema": "Authoritative organization setup schema",
      "responseSchema": "Backend orgSetupCompleteResponseSchema parses actual top-level JSON",
      "renewal": {
        "sessionStatus": 200,
        "sameUserAndOrg": true,
        "organizationAccess": "active",
        "serverOwner": true,
        "enabledModules": [
          "build",
          "kb",
          "chat"
        ]
      },
      "replay": {
        "status": 201,
        "sameOrganization": true,
        "autoLoginTokenOmitted": true,
        "responseContract": true
      },
      "statusRead": {
        "status": 200,
        "ready": true,
        "provisioningStatus": "completed",
        "wireContract": "frontend/hooks/api/org-setup-schema.ts"
      },
      "persisted": {
        "at": "2026-10-04T05:27:05.884Z",
        "applicationRoleReadOnly": true,
        "currentOrgIdentityGuard": true,
        "setupCompleted": true,
        "organizationStatus": "ACTIVE",
        "ownerMembership": [
          {
            "role": "OWNER",
            "is_owner": true,
            "status": "ACTIVE"
          }
        ],
        "userVerified": true,
        "userActive": true,
        "otp": {
          "total": 1,
          "used": 1
        },
        "modules": [
          {
            "module_key": "accounting",
            "enabled": false
          },
          {
            "module_key": "billing",
            "enabled": false
          },
          {
            "module_key": "blog",
            "enabled": true
          },
          {
            "module_key": "build",
            "enabled": true
          },
          {
            "module_key": "calendar",
            "enabled": true
          },
          {
            "module_key": "chat",
            "enabled": true
          },
          {
            "module_key": "crm",
            "enabled": false
          },
          {
            "module_key": "directory",
            "enabled": true
          },
          {
            "module_key": "feedbucket",
            "enabled": false
          },
          {
            "module_key": "home",
            "enabled": true
          },
          {
            "module_key": "hr",
            "enabled": false
          },
          {
            "module_key": "inventory",
            "enabled": false
          },
          {
            "module_key": "kb",
            "enabled": true
          },
          {
            "module_key": "mail",
            "enabled": true
          },
          {
            "module_key": "notifications",
            "enabled": true
          },
          {
            "module_key": "payroll",
            "enabled": false
          },
          {
            "module_key": "settings",
            "enabled": false
          },
          {
            "module_key": "sign",
            "enabled": false
          },
          {
            "module_key": "support",
            "enabled": false
          },
          {
            "module_key": "surveys",
            "enabled": false
          }
        ],
        "outbox": [
          {
            "event_type": "organization.setup.completed",
            "delivery_state": "DELIVERED",
            "count": 1
          }
        ],
        "secretColumnsSelected": false,
        "browserProof": false,
        "retainedFailures": [
          "first identity query before explicit tenant context returned zero rows and refused; readonly rollback/connection closed",
          "next proof completed reads but evidence assignment used absent REPL binding; readonly connection closed; no write"
        ]
      }
    },
    "project": {
      "firstAt": "2026-10-04T05:29:46.946Z",
      "firstStatus": 201,
      "replayStatus": 201,
      "sameReturnedRecord": true,
      "readStatus": 200,
      "requestSchema": "createProjectSchema",
      "wireSchemas": [
        "projectsCreateProjectResponseSchema",
        "projectsByIdGetProjectResponseSchema"
      ]
    },
    "ticket": {
      "firstAt": "2026-10-04T05:30:51.243Z",
      "firstStatus": 201,
      "replayStatus": 201,
      "sameReturnedRecord": true,
      "readStatus": 200,
      "requestSchema": "createTicketSchema",
      "wireSchemas": [
        "projectsTicketsCreateTicketResponseSchema",
        "projectsTicketsGetTicketResponseSchema"
      ],
      "statusMutation": {
        "at": "2026-10-04T05:32:30.412Z",
        "status": 200,
        "version": 2,
        "wireSchema": "projectsTicketsUpdateTicketResponseSchema"
      },
      "staleMutation": {
        "status": 409,
        "errorCode": "PROJECTS_TICKET_CONFLICT",
        "not500": true
      },
      "tenantRead": {
        "knownExistingOtherReservedTicket": true,
        "freshOwnControl": 200,
        "foreignTicket": 404,
        "not500": true,
        "firstExpiredOrInvalidAuthenticationResult": 401,
        "first401IsNotTenantProof": true
      }
    },
    "postWrites": {
      "at": "2026-10-04T05:51:04.540Z",
      "appRoleReadOnly": true,
      "currentOrgIdentityGuard": true,
      "project": [
        {
          "status": "ACTIVE",
          "same_key_count": 1
        }
      ],
      "ticket": [
        {
          "status": "IN_PROGRESS",
          "priority": "HIGH",
          "version": 2,
          "same_title_count": 1
        }
      ],
      "assignments": [
        {
          "count": 1
        }
      ],
      "activity": [
        {
          "action": "created",
          "from_value": null,
          "to_value": null,
          "count": 1
        },
        {
          "action": "status_changed",
          "from_value": "TODO",
          "to_value": "IN_PROGRESS",
          "count": 1
        }
      ],
      "comments": [
        {
          "count": 0
        }
      ],
      "setupEvents": [
        {
          "event_type": "organization.setup.completed",
          "delivery_state": "DELIVERED",
          "count": 1
        }
      ],
      "secretColumnsSelected": false,
      "browserProof": false
    },
    "retainedVerificationMethodFailures": [
      "Initial setup extractor wrongly expected data envelope; actual top-level authoritative contract passed",
      "Initial setup-status parser used backend Date schema on wire strings; existing frontend wire schema passed",
      "First read-only new-org identity lookup omitted explicit tenant context, returned0 and refused; no write",
      "Second read-only evidence assignment referred to an absent REPL binding; transaction closed, no write",
      "First foreign-ticket attempt401; normal NextAuth session refresh followed by own200/foreign404 is the only tenant denial proof"
    ],
    "limits": [
      "Browser53 synthetic account is distinct and awaiting human OTP entry; API62 credentials are not injected into browser",
      "No full browser/mobile/role/module/object/PAT matrix",
      "No cache notification fanout/physical concurrency/deployment/operations proof",
      "No comment write",
      "Modules query limited20 is bounded observation, not whole catalog",
      "Old51–59 initial frontend API misconfiguration and unknown server-side effect remain retained"
    ]
  }
}
```

Every named failed gate/method and bounded proof remains retained. Physical Feedbucket locking, public Form persistence, complete permission/tenant/mobile/browser coverage and release/operations are open. No source or evidence file is created or deleted.

## Synthetic runtime and ticket interaction source — 2026-10-04

Classification: Current verified for the exact source/gate and bounded HTTP/read-only observations below; Current unverified for complete customer/release behavior. Eight disjoint packages reuse existing owners and have meaningful behavioral REDs, root focused repeats, exact lint/diff, changed-file/production TypeScript and frozen independent reviews.52 strict source lint remains failed with three existing warnings; the passing default lint is not a strict pass.54 repairs timestamp test fixtures without relaxing production contracts;57 repairs the existing member dirty/pending boundary. No source/helper/schema/API/component/test/Markdown was added or deleted by51–59.

All522 IDs remain present:110 checked/412 open; no checkbox or D/I/T/R/B/L status is advanced. The complete412-ID queue remains root-owned when not exactly claimed. Source58 is committed, but the local backend still serves55; no58 runtime proof is implied. Final frozen hashes, source revisions, suite counts and exact limits appear once in this receipt. Commands remain in each exact [work claim](../implementation/WORK-CLAIMS.md). Payload SHA-256: `6a5c8164d92e0f39a82a1f97c4104ee4457652757b201dfd809e08bb8f2b5247` (UTF-8 JSON between fences, excluding fence newlines).

The second1000 sign-in reached the local captured-mail transport and verification-code screen. The READ ONLY application-role query observes one active reserved global user, unverified email and one valid unused OTP; it does not prove the user was absent before, OTP consumption, authentication, new organization, onboarding or module/record authorization. Its older Flow02 tenant guard and bounded GLOBAL user read are separate scopes. The first misconfigured sign-in reached no local capture; its server-side effect remains unverified. Secret mail, OTP/token/session/activation values and database configuration are never recorded. The tools have separate memory and no supported private OTP bridge; browser code entry is pending user input.

The stale generated route declaration initially failed118 parse diagnostics. Installed Next typegen alone repaired it to zero; source was not excluded and generated declarations were not hand-edited. Temporary custom-output tsconfig includes remain authorized and differ from HEAD. No pre-window .env hashes exist, so no-write action audit is not byte invariance. Historical runtime failures, full test-TypeScript failures, unapplied application migrations, unverified physical races/cache/events/mobile and deployment/operations remain open.

```json
{
  "classification": "Current verified",
  "observedAt": "2026-10-04T05:14:58.223Z",
  "tracker": {
    "total": 522,
    "checked": 110,
    "open": 412,
    "stageAdvances": 0,
    "sortedOpenIdSha256": "3ad4f5da9e48eee69e82369f027c5b654874563a603c9eaad80ddaf7acb9e160"
  },
  "sourcePackages": [
    {
      "package": 51,
      "revision": "35eac0d45783ad96f53b9898a69b7766da340fbc",
      "files": [
        {
          "path": "backend/test/helpers/build-browser-app.ts",
          "sha256": "4d858fb00bcf67d5722bf5187851caae64d53a8bc94fa36723c8a7e4d6e72feb"
        },
        {
          "path": "backend/test/helpers/run-build-browser-verification.ts",
          "sha256": "9fb449139b2ed5082dc220afe6cc74db1cfcec08a3616c057b6ae639ab17898d"
        },
        {
          "path": "backend/test/security/build-browser-boundary.spec.ts",
          "sha256": "74870e4c48006dd644c6b16871e7a882efc620f4a3aa4d297f120c57d0856c1a"
        },
        {
          "path": "backend/test/security/build-browser-runner.spec.ts",
          "sha256": "e519cb1dfbf040c0b8442b5dbbd9bf2d2c18e6cf5332b93b9eb510db928ebdbd"
        }
      ],
      "red": "4 meaningful boundary/CORS failures",
      "focused": {
        "passed": 223,
        "suites": 2
      },
      "review": "B and root CLEAR",
      "lint": "exact four paths strict PASS",
      "changedFileTypeScript": "PASS 10GiB",
      "productionTypeScript": "PASS 10GiB",
      "scope": "closed loopback browser origins; authority and provider/worker/application-role controls preserved"
    },
    {
      "package": 52,
      "revision": "8207d7c020dc2273a1964fdb6295a44954dea1de",
      "files": [
        {
          "path": "frontend/features/build/tickets/create-ticket-dialog.tsx",
          "sha256": "b0b67db4514b3f6cb1f242fb695293af90421f5e75919872c1de600611370727"
        },
        {
          "path": "frontend/features/build/tickets/create-ticket-dialog-dirty-state.test.tsx",
          "sha256": "c5c3f76ea55dc67c1315398d31daea0f1b8cca0af42d0e52b7fa4974f7a769b9"
        }
      ],
      "red": "2 actual pending Dialog/project-switch failures",
      "focused": {
        "passed": 15,
        "suites": 1
      },
      "review": "A and root CLEAR",
      "lint": "source0errors/3 retained effect warnings; strict max-warnings0 FAIL; test strict PASS",
      "changedFileTypeScript": "PASS 8GiB",
      "productionTypeScript": "PASS 8GiB",
      "scope": "pending Ticket create/upload draft retention; partial-upload/unmount/retry identity remains open"
    },
    {
      "package": 54,
      "revision": "53c437d0e2d0723eb39e2fd67cf9f86b001bd03c",
      "files": [
        {
          "path": "frontend/hooks/api/build/__tests__/build-project-contract-drift.test.ts",
          "sha256": "f2302a7fe6bf59196a30429eaa96bace6896e8c3c9b97a44e11996817252f44a"
        }
      ],
      "red": "6 timestamp-fixture failures/7passes",
      "focused": {
        "passed": 73,
        "suites": 6
      },
      "review": "B and root CLEAR",
      "lint": "exact one path strict PASS",
      "changedFileTypeScript": "PASS 8GiB",
      "productionTypeScript": "PASS 8GiB",
      "scope": "fixture follows required current createdAt/updatedAt; two omission negatives retained; no production contract relaxation"
    },
    {
      "package": 55,
      "revision": "5dcafa517ca634e658345c08c4085899900279a3",
      "files": [
        {
          "path": "backend/src/modules/build/core/tickets/projects-ticket-relations.service.ts",
          "sha256": "eb63112886756b97b4443ea64f2b0af37d7fa721d7081765fc3fbcdbb3b0ed77"
        },
        {
          "path": "backend/src/modules/build/core/tickets/projects-ticket-relations-soft-delete.spec.ts",
          "sha256": "31d726e963f67ec30ebe89f2b974a359f76c2e636c622a3683c1b2f348524124"
        },
        {
          "path": "backend/src/modules/build/core/tickets/projects-ticket-links-tenant-isolation.spec.ts",
          "sha256": "09477d80c4dc7de40bbef7e59071d56825d54536533fa59a9edf6e9f83a45480"
        }
      ],
      "red": "2 hidden opposite-endpoint LIST/ADD authority failures",
      "focused": {
        "passed": 29,
        "suites": 3
      },
      "review": "B and root CLEAR",
      "lint": "exact three paths strict PASS",
      "changedFileTypeScript": "PASS 10GiB",
      "productionTypeScript": "PASS 10GiB",
      "scope": "canonical related Ticket read visibility in outer SQL before limit100; target ADD read gate; modeled SQL not physical PostgreSQL"
    },
    {
      "package": 56,
      "revision": "aec8aa43a84246c46693a38ad1c1c2967810017f",
      "files": [
        {
          "path": "frontend/features/build/ticket-details/ticket-related-links.tsx",
          "sha256": "04905cf9db833b82451dd03a2ff49044c61e055be5d02e46c0cae8e1b7c8547b"
        },
        {
          "path": "frontend/features/build/ticket-details/ticket-related-links.test.tsx",
          "sha256": "d130426331c49557e9fbd2300913e4846cecbbb2e4b8a148b9836511efcc6e4f"
        }
      ],
      "red": "2 actual unsafe rendered href failures; expanded8RED",
      "focused": {
        "passed": 96,
        "suites": 2
      },
      "review": "A and root CLEAR",
      "lint": "exact two paths strict PASS",
      "changedFileTypeScript": "PASS 8GiB",
      "productionTypeScript": "PASS 8GiB",
      "scope": "single-slash same-origin internal links, unsafe control/backslash/protocol-relative refusal; external HTTP(S) noopener preserved"
    },
    {
      "package": 57,
      "revision": "e28b9f225e611451bb6f3bfd97d473fad16ebcd8",
      "files": [
        {
          "path": "frontend/features/build/settings/add-project-member-dialog.tsx",
          "sha256": "d88226593cafb8ac444f1ee0bb9c8b4c6ff5ca2743a2120714bf3c81d2da6bc1"
        },
        {
          "path": "frontend/features/build/settings/add-project-member-dialog.test.tsx",
          "sha256": "e3318ca403601b3ae85ea701d48013eec7472a9ceeacfa0ba8caa769cef2d35f"
        }
      ],
      "red": "2 actual dirty-navigation/pending member-dialog failures",
      "focused": {
        "passed": 36,
        "suites": 2
      },
      "review": "A and root CLEAR",
      "lint": "exact two paths strict PASS",
      "changedFileTypeScript": "first FAIL118 stale generated-route parse errors; official next typegen repair then PASS8GiB",
      "productionTypeScript": "PASS 8GiB after official route repair",
      "scope": "actual RHF dirty registration; pending dismissal/edit fence, failure retry and acknowledged success; existing project VIEWER is not structural role"
    },
    {
      "package": 58,
      "revision": "c450537b0aa17aa0afbfe5976ffab2e9bb7f1b0d",
      "files": [
        {
          "path": "backend/src/modules/build/core/tickets/projects-ticket-links.service.ts",
          "sha256": "b2e7116628b6c026b4a06bd270c7dc1362657f3596742c976d7a3c4adb5022de"
        },
        {
          "path": "backend/src/modules/build/core/tickets/projects-ticket-links-project-access.spec.ts",
          "sha256": "8039f18ccb49d0f9472d3d826d0e9a47f5a74a49d303b8e9e1739f2ce454fa91"
        },
        {
          "path": "backend/src/modules/build/core/tickets/projects-ticket-subresources-project-access.spec.ts",
          "sha256": "a62b3e7562092156ab72cbe814a36002de97a7ffcedf556cfd1b4f7320e41a01"
        }
      ],
      "red": "8 actual canonical locked-project command failures (4writes x ARCHIVED/COMPLETED)",
      "focused": {
        "passed": 131,
        "suites": 4
      },
      "review": "B and root CLEAR",
      "lint": "exact three paths strict PASS",
      "changedFileTypeScript": "PASS 10GiB",
      "productionTypeScript": "PASS 10GiB",
      "scope": "existing assertTicketWriteAccess for attachment and related-link add/update/delete; readable locked-project history and child binding preserved"
    },
    {
      "package": 59,
      "revision": "f47f13bb220edf42c5f06918b188688ef03c410e",
      "files": [
        {
          "path": "frontend/features/build/navigation/build-scope-browser.tsx",
          "sha256": "bd2b048429a1d483b1a7c88a6e89237bbacf141d179f1f4c5bc52b432094ff7a"
        },
        {
          "path": "frontend/features/build/navigation/build-scope-browser.test.tsx",
          "sha256": "81514223348dd7bf705faaf68c332815a60f194d951af4c458a3946fd60f5efc"
        }
      ],
      "red": "1 actual child-to-parent keyboard-focus failure/40oldskipped in RED selection",
      "focused": {
        "passed": 76,
        "suites": 3
      },
      "review": "A and root CLEAR",
      "lint": "exact two paths strict PASS",
      "changedFileTypeScript": "PASS 8GiB",
      "productionTypeScript": "PASS 8GiB",
      "scope": "current rendered hierarchy parent focus on Left; collapse/root/flat lists/Right/Enter unchanged"
    }
  ],
  "runtime": {
    "frontendPort": 1000,
    "backendPort": 1001,
    "backendServedRevision": "5dcafa517ca634e658345c08c4085899900279a3",
    "backendPid": 25504,
    "frontendPid": 10420,
    "backendReady": true,
    "frontendReady": true,
    "environment": "process-only overrides; .env read without write; no retained pre-window hash baseline",
    "primaryAndRegionalPreflight": "application role streamline_app; nonsuperuser/nonBYPASSRLS; read-only preflight retained",
    "frontendCompiledApi": "local emitted script confirmed127.0.0.1:1001 before second sign-in request",
    "observations": [
      {
        "at": "2026-10-04T04:37:01Z",
        "method": "OPTIONS",
        "path": "/auth/email-otp/request",
        "origin": "http://127.0.0.1:1000",
        "status": 204,
        "allowOrigin": "http://127.0.0.1:1000",
        "scope": "CORS only; this is not the business OTP route"
      },
      {
        "at": "2026-10-04T04:37:01Z",
        "method": "OPTIONS",
        "path": "/auth/email-otp/request",
        "origin": "https://evil.invalid",
        "status": 403,
        "allowOrigin": false
      },
      {
        "at": "2026-10-04T04:37:01Z",
        "method": "GET",
        "path": "/me/inbox/unified",
        "authenticated": false,
        "status": 401,
        "code": "UNAUTHORIZED"
      }
    ],
    "mail": {
      "status": 200,
      "noStore": true,
      "locallyCapturedMessages": 1,
      "secretDataRecorded": false
    },
    "persistence": {
      "at": "2026-10-04T04:56:23.330Z",
      "applicationRoleReadOnly": true,
      "syntheticOrganizationGuardVerified": true,
      "syntheticUserCount": 1,
      "userActive": true,
      "emailVerified": false,
      "otpCounts": {
        "total": 1,
        "unused": 1,
        "valid_unused": 1
      },
      "secretColumnsSelected": false,
      "scope": "READ ONLY guarded older Flow02 organization plus bounded GLOBAL exact reserved user/OTP read; not new-organization/RLS proof"
    },
    "browser": {
      "url": "http://127.0.0.1:1000/signin",
      "state": "verification-code screen after local captured-mail request",
      "signedIn": false,
      "otpConsumed": false,
      "screenshotsSaved": false,
      "secureCrossToolSecretTransfer": "unsupported; user private browser code entry requested"
    },
    "failedAttempts": [
      "First backend preload failed missing tsconfig-paths/register; retry uses installed ts-node/NODE_PATH without install",
      "Isolated frontend1002 font resolution failed and fallback manifest ENOENT followed; stopped exact owned process;1002 not used again",
      "First original1000 frontend launch lost API overrides; its sign-in did not reach local capture; server-side effect unverified. Stopped before retry, rebuilt unique env, asserted private presence and verified local compiled URL"
    ],
    "generatedRouteRepair": {
      "beforeSha256": "edac6b3be106ad13a0ca5cc45ce14bcdd2de1045dee64f8226b2db90b33ff907",
      "parseDiagnostics": 118,
      "command": "NEXT_DIST_DIR=.next/dev pnpm exec next typegen",
      "afterSha256": "ed3a1a13c826369276cd9f16ece0d12c53281f3733654cf10f43d09f1d916cfa",
      "afterParseDiagnostics": 0,
      "handEdited": false,
      "cause": "Current unverified"
    },
    "temporaryTrackedConfiguration": "frontend/tsconfig.json retains two compiler-added window12h output includes; not identical to HEAD; not staged"
  },
  "retainedFailures": [
    "52 strict source lint3 warnings",
    "Previous full backend test TypeScript10GiB OOM134/pnpm1",
    "Previous full frontend specs24 diagnostics in six unowned paths",
    "55 unexpected formatting drift restored only owned wrapping after AST leaf/kind equivalence; cause unverified",
    "Application1730/1731 and1732/1733/1734 unapplied"
  ],
  "contractEvidence": {
    "at": "2026-10-04T03:51Z",
    "dtoChanges": false,
    "backend": "OpenAPI self-test/check PASS4107operations/4092Zod/4107exposure",
    "frontend": "vendor self-test6PASS/byte parity; Build self-test93PASS/390schemas/311operations freshness"
  },
  "limitations": [
    "Focused tests are source/model/DOM evidence, not PostgreSQL RBAC, locks or persistence",
    "No complete new signup/onboarding/module/project/Ticket/client browser proof",
    "58 is committed but current backend runner still55",
    "No new deployment/operations evidence",
    "No whole BT checkbox or D/I/T/R/B/L stage changed"
  ],
  "cleanup": {
    "createdSourceFiles": [],
    "deletedFiles": [],
    "retained": "all historical evidence/research/screenshots and three unknown untracked Windows cache DBs"
  }
}
```


## Approver liveness and project draft recovery — 2026-10-04

Classification: Current verified for the bounded source and gate results below; Current unverified for complete application/release behavior. Backend49 commits exactly five existing files at 3f0d96786bffe6e0c463ce4da755be8601539947; frontend50 commits exactly two existing files at 1ff45c1c0c49136da0aa7ab30ece4a511c6b6e04. No file was created or deleted. Reproducible behavioral failures precede both corrections, and independent reviewers inspected the frozen production and test changes.

Root repeats six backend suites/175 tests and the actual frontend Sheet/provisioning suite/13 tests successfully. Both changed-file and production TypeScript gates, exact-path lint/diff, OpenAPI freshness and generated/vendor checks pass. The wider frontend run remains failed:65 pass/six unchanged CUSTOM_STATE timestamp-fixture failures. No historical baseline execution is invented. Previous full test TypeScript OOM/diagnostics remain unpassed; the scoped checks do not replace them.

Member SHARE precedes Ticket UPDATE; the test records exact modes and observes the independent member-queue wait before writer release. Those modeled queues do not prove PostgreSQL blocking, continuous account/org/requester authority or cascade safety. The project guard preserves pending review/input and its dedicated success acknowledgement path; scope/unmount recovery and real browser persistence remain open. None of BT-27a037364398, BT-801e948e8a67, BT-2e4073320ccb or BT-3e9ebfaad21e closes. All522 checkbox/stage statuses remain unchanged (110 checked/412 open). Canonical payload SHA-256: `92047146b0a1531f14ae4ab5da10f401053d32dafb17d3f418c930ce8d93af8d` (UTF-8 JSON between the fences, excluding fence newlines).

```json
{
  "classification": "Current verified",
  "observationAt": "2026-10-04T03:52:19.240Z",
  "claim49": {
    "requirements": [
      "BT-27a037364398",
      "BT-801e948e8a67"
    ],
    "revision": "3f0d96786bffe6e0c463ce4da755be8601539947",
    "files": [
      {
        "path": "backend/src/modules/build/approvals/approvals.service.ts",
        "sha256": "256c0ae2b45215459971904ed7b8dd0002f4532923b8bb734dfe6f05f9287f16"
      },
      {
        "path": "backend/src/common/organization/organization-actor.ts",
        "sha256": "d1fc8402cc0a064c5e399327e990f7981e8ce6d982717634ffd1575ca2577f58"
      },
      {
        "path": "backend/src/modules/build/approvals/approvals.service.spec.ts",
        "sha256": "8ce9b9233ac5cd7ab7cc95f9a4daf6ac7a1889c9da34252418f2b67f3e495c71"
      },
      {
        "path": "backend/src/modules/build/approvals/__tests__/approval-lifecycle-concurrency.fixture.ts",
        "sha256": "c3c9e23a97d106d93bee1a950f64f16ff4e14bd3289cd3b26a26807ca7018097"
      },
      {
        "path": "backend/src/modules/build/approvals/__tests__/approval-task-artifact.spec.ts",
        "sha256": "373e8e1bc5bff30af295fcda1c4618331a03d0dc500d9c0eed41e714db6718f4"
      }
    ],
    "behavioralReds": [
      {
        "observer": "C",
        "cases": 2,
        "scope": "inactive canonical user/org public creation succeeds before correction"
      },
      {
        "observer": "C",
        "failed": 14,
        "skipped": 34,
        "scope": "non-task requester revocation/project archive during member wait"
      }
    ],
    "coordinatorFocused": {
      "suites": 6,
      "passed": 175,
      "failed": 0,
      "exitCode": 0
    },
    "exactLint": {
      "exitCode": 0,
      "files": 5
    },
    "diff": {
      "exitCode": 0
    },
    "changedPathTypeScript": {
      "exitCode": 0,
      "heapMiB": 8192,
      "config": "tsconfig.test.json",
      "rootFileCount": 5,
      "incremental": false
    },
    "productionTypeScript": {
      "command": "pnpm -C backend typecheck",
      "exitCode": 0,
      "heapMiB": 10240
    },
    "independentReview": {
      "production": "C and B CLEAR",
      "test": "B and root CLEAR",
      "frozen": true
    },
    "modelQueue": {
      "memberQueueIndependentOfGlobalTransactionTail": true,
      "writerFirstWaitSignal": true,
      "exactModes": [
        "Member SHARE",
        "Ticket UPDATE"
      ],
      "physicalPostgreSQL": false
    },
    "open": [
      "physical member/status/delete concurrency",
      "user/org/requester/grant continuity",
      "reassignment and decision liveness",
      "real application API and persistence",
      "complete RBAC and tenant boundary",
      "cache/events",
      "browser and mobile",
      "deployment and operations"
    ]
  },
  "claim50": {
    "requirements": [
      "BT-2e4073320ccb",
      "BT-3e9ebfaad21e"
    ],
    "revision": "1ff45c1c0c49136da0aa7ab30ece4a511c6b6e04",
    "files": [
      {
        "path": "frontend/features/build/project-create/project-create-wizard.tsx",
        "sha256": "f5bda7640efe152267c1583466fd41ec2c6c2a1906008c6d7658d163c9731670"
      },
      {
        "path": "frontend/features/build/project-create/project-create-dirty-guard.test.tsx",
        "sha256": "eae63b3b3ad3a6ba12f94bae9e724259ee09d8d7bd465637bbfd3d2d902f88dc"
      }
    ],
    "behavioralRed": {
      "observer": "C",
      "failed": 1,
      "passed": 5,
      "exitCode": 1,
      "scope": "actual Sheet and provisioning hook pending close resets draft"
    },
    "coordinatorFocused": {
      "suites": 1,
      "passed": 13,
      "failed": 0,
      "exitCode": 0
    },
    "widerFocused": {
      "suites": 6,
      "passed": 65,
      "failed": 6,
      "exitCode": 1,
      "failingFile": "frontend/hooks/api/build/__tests__/build-project-contract-drift.test.ts",
      "reason": "unchanged CUSTOM_STATE fixture omits required createdAt and updatedAt",
      "baselineExecuted": false,
      "decoderAndFixtureModified": false
    },
    "exactLint": {
      "exitCode": 0,
      "files": 2
    },
    "diff": {
      "exitCode": 0
    },
    "changedPathTypeScript": {
      "exitCode": 0,
      "heapMiB": 8192,
      "config": "tsconfig.specs.json",
      "rootFileCount": 2,
      "incremental": false
    },
    "productionTypeScript": {
      "command": "pnpm -C frontend type-check",
      "exitCode": 0,
      "includesOfficialRouteTypeGeneration": true,
      "heapMiB": 8192,
      "warning": "existing Edge Runtime deprecation"
    },
    "independentReview": {
      "productionAndTests": "A and root CLEAR",
      "frozen": true
    },
    "open": [
      "scope/unmount/owner-change recovery",
      "real create/failure/retry and duplicate submission",
      "persistence after refresh",
      "Project to Ticket first-use action",
      "permission and tenant proof",
      "browser and mobile",
      "deployment and operations"
    ]
  },
  "contracts": {
    "dtoAndResponseChanged": false,
    "newPermissions": false,
    "vendor": {
      "selfTests": 6,
      "exitCode": 0,
      "byteMatch": true
    },
    "generatedBuild": {
      "selfTests": 93,
      "exitCode": 0,
      "schemaCount": 390,
      "operationCount": 311,
      "fresh": true
    },
    "openapiSelfTest": {
      "exitCode": 0,
      "semantics": "line endings, component and operation changes plus additions/removals"
    },
    "openapiFreshness": {
      "exitCode": 0,
      "operations": 4107,
      "responseContracts": 4092,
      "exposureStamped": 4107
    }
  },
  "cleanup": {
    "newFiles": [],
    "deletedFiles": [],
    "newSourceComments": false,
    "liveTicketComments": false
  },
  "tracker": {
    "total": 522,
    "checked": 110,
    "open": 412,
    "stagesAdvanced": false
  },
  "historicalFailedGates": {
    "fullBackendTestTypeScript": "previous 10GiB OOM remains unpassed; no fresh successful full run",
    "fullFrontendSpecTypeScript": "previous24diagnostics/six unowned files remain unpassed"
  },
  "boundaries": {
    "realApi": false,
    "database": false,
    "browser": false,
    "mobile": false,
    "deployment": false,
    "operations": false
  }
}
```



## Task artifact PostgreSQL proof — 2026-10-04

Classification: Current verified for the exact frozen source gates and bounded scratch observations below. Current unverified for complete application, browser and release acceptance. The corrected third run passed89/89 checks, exit0, at backendc570327aebaad87030b58b4cafa0ab49ca3e186f. Root independently confirmed scratch database/sessions0 and unchanged application columns/approvals0 with streamline_app READ ONLY. Both failed earlier runs remain in the following historical checkpoint.

The external parent5e33d3ebb mixed six claimed paths with50 unrelated files; this coordinator preserved that commit and committed only the three residual proof corrections. No application migration or service/browser mutation occurred. Direct SQL fixture capture is not artifact-owner or service proof. Physical blocker observations, exact tenant receipts and all controlled SQLSTATE results are recorded below; observed23001 for RESTRICT and NOT ENFORCED CHECK recreation were confirmed after the earlier oracle failures. The coordinator preflight UUID/text query failure and its read-only retry are retained in this receipt without an invented SQLSTATE.

Canonical requirement coverage remains partial: BT-27a037364398 and BT-801e948e8a67 stay open. Current522-task statuses remain110 checked/412 open. Canonical payload SHA-256: `bcb743b8c238988b7ee53605d0d17389362484dec4d7e1e3a056542e21756758` (UTF-8 JSON between the fences, excluding fence newlines).

```json
{
  "classification": "Current verified",
  "requirements": [
    "BT-27a037364398",
    "BT-801e948e8a67"
  ],
  "backendRevision": "c570327aebaad87030b58b4cafa0ab49ca3e186f",
  "backendParent": "5e33d3ebb2b911941a8ed89e47e53b120dedbf7d",
  "parentBoundary": {
    "externallyCreatedMixedCommit": true,
    "totalFiles": 56,
    "claim48Files": 6,
    "unrelatedExcludedFiles": 50,
    "coordinatorOnlyCommittedThreeResidualCorrections": true
  },
  "run": {
    "scope": "task-artifact",
    "runId": "f8e47ebe465a33f58c6ef1f1",
    "database": "scratch_build_migration_f8e47ebe465a33f58c6ef1f1",
    "startedAt": "2026-10-04T03:04:55.055Z",
    "finishedAt": "2026-10-04T03:09:00.595Z",
    "exitCode": 0,
    "errorCode": null,
    "checks": 89,
    "passed": 89,
    "failed": 0
  },
  "sourceFiles": [
    {
      "path": "backend/src/scripts/approval-revision-migration-proof.mjs",
      "sha256": "c22503ca655233156589995c84cf71fcbce9b9bb3d69e5d629df00596c2d247e",
      "lines": 77
    },
    {
      "path": "backend/src/scripts/lib/approval-revision-proof-baseline.mjs",
      "sha256": "0db4e8e0c233c3755f8700f1df8a0f1d7ca78ac321bfd59d9d6724fef97d5543",
      "lines": 259
    },
    {
      "path": "backend/src/scripts/lib/approval-revision-proof-cases.mjs",
      "sha256": "f39279b84deb6914c236be1d7f305f305d860beed1e8c0ab67f8f024d106ead7",
      "lines": 286
    },
    {
      "path": "backend/src/scripts/lib/approval-artifact-proof-catalog.mjs",
      "sha256": "8d66bbb4503c65bd6e1a6c9ae19520313fcb9a042d0b2a940b3d921ca63fb8bd",
      "lines": 247
    },
    {
      "path": "backend/src/scripts/lib/approval-artifact-proof-cases.mjs",
      "sha256": "cda78f9df9f3eb453fe91c061bffd4341e479c7413a5e6f65826edbf3ebadf2c",
      "lines": 249
    },
    {
      "path": "backend/src/scripts/__tests__/approval-artifact-migration-proof.test.mjs",
      "sha256": "33864d866596a5cb84d13c8ce18dcce4c963249df42d49eec3e6611dc832cd34",
      "lines": 299
    }
  ],
  "preflightFailure": {
    "capturedAt": "2026-10-04T03:04:34.877Z",
    "message": "operator does not exist: text = uuid",
    "sqlstate": null,
    "readOnly": true,
    "applicationWrites": false,
    "source": "coordinator preflight query used an unnecessary UUID cast against text org_id; transaction rolled back and connection closed"
  },
  "preflight": {
    "observedAt": "2026-10-04T03:04:36.360Z",
    "role": "streamline_app",
    "read_only": "on",
    "server_version_num": "180004",
    "scratch_database_count": 0,
    "new_column_count": 0,
    "reserved_approval_count": 0,
    "applicationWrites": false
  },
  "observations": [
    {
      "stage": "plan",
      "database": "scratch_build_migration_f8e47ebe465a33f58c6ef1f1",
      "execute": true,
      "proofScope": "focused-ticket-and-approval-fragments-and-whole-1732-1733-1734",
      "wholeChainVerified": false,
      "applicationRuntimeVerified": false,
      "deployedRlsVerified": false,
      "sourceHashes": {
        "0000_light_vance_astro": "850dc745890a24e85d6b4a79e2c47b35e96219e8b906178ff2a1984a5e09eccd",
        "0374_tenant_guc_helper": "bf571f0a242a09b337f6d2180ab2a812e62211fda39cf48d899dfcb3eae0ac25",
        "0426_build_identity_pks": "e3eab6751fa38e790dac2e874b778b6552de85c1534096effcf15b2a21e8b917",
        "0432_build_schema": "83cd4bed901ae2cbe844fdd849ab0c0c9b12be309e06bf10b9f33ec7989f7439",
        "0648_build_actor_membership_expand": "f16995bafc4db9daa8c7e3f0ff3492cf6327f944825cc4e601230a8a5564d7da",
        "0668_fix_membership_fk_on_delete": "1e525a18ef3f6d580ea1b29c6ea32991a9a47eb07746b030a93ffca705e95fc2",
        "0770_set_null_fk_column_lists": "6f0d4cd80034c047b8d6f44292eac6c4b0b8796452e6efcda98d37c4b472da2d",
        "0917_build_actor_drop": "482c1e02a4a9c8b214b62187354320d593d22260e4c1f2cc42a52d856a6037d6",
        "0945_ar02_build_composite_fks": "8257bf2b642166abaf28f947b1ad463abe2f6e4a8bf06fd36a37f5118c70ccaa",
        "0948_ar02_drop_build_single_fks": "64f504824eb85a211af95feda0aeec4a2f5ea131a2b0a39842488ac809eb2b9b",
        "1732_approval_row_revision": "a4b1eb51194c7a0e81fcb6f6e238c48c5161dbeb848c2b6b3d05de9562707ef1",
        "rollback/1732_approval_row_revision.down": "976df5d24de43708e8856344d01a4c3f1f7a7d5569cab9033a397677c6ac5bd1",
        "0322_recon_phase_c_candidate_keys": "bd6fbfe53f3d7926ef28bf417afc77bdb20ff3cde99dc2487e13797095589268",
        "0416_tickets_soft_delete_and_version": "b639c215e1b58ad5f442b589108e188e72ed7c9c4d617050354bd223f5ec8709",
        "1373_tickets_version_trigger": "681c0a0cc32b72ece0d4e42439a30816e217f5a875fd602559ab3447963cc85a",
        "1733_approval_task_artifact": "4a00fa99d3aeaba44b111308063b5fcfd013f6c1dbd753c328e2abe171951e14",
        "1734_approval_task_pending_index": "34a1ab0934186c5c4c0a67e67d17fa79ba3f632bd3c0ad703e3eee42d007a10d",
        "rollback/1733_approval_task_artifact.down": "dcb64da39743705b828d268157dd24e9cffe85f07937459149033b0fd917c7d2",
        "rollback/1734_approval_task_pending_index.down": "b34fa003d474f1bf176b33ef0abda9c3e423052a7f74c55d070039a9b7d021f2"
      }
    },
    {
      "stage": "phase",
      "phase": "refusal-baseline",
      "fixtureCapture": "direct-sql",
      "artifactOwnerCaptureVerified": false,
      "wholeChainVerified": false,
      "sequenceAtomic": false
    },
    {
      "stage": "case",
      "caseId": "refusal-baseline-official-1732_approval_row_revision",
      "passed": true
    },
    {
      "stage": "case",
      "caseId": "refusal-baseline-replay-1732_approval_row_revision",
      "passed": true
    },
    {
      "stage": "case",
      "caseId": "refusal-baseline-official-1733_approval_task_artifact",
      "passed": true
    },
    {
      "stage": "case",
      "caseId": "refusal-baseline-legacy-five-null-preserved",
      "passed": true
    },
    {
      "stage": "case",
      "caseId": "refusal-baseline-replay-1733_approval_task_artifact",
      "passed": true
    },
    {
      "stage": "physical-migration-blocker",
      "officialChild": false,
      "blockerObserved": true,
      "holderExpired": false
    },
    {
      "stage": "case",
      "caseId": "raw-held-lock-timeout",
      "passed": true,
      "expectedSqlstate": "57014",
      "actualSqlstate": "57014"
    },
    {
      "stage": "case",
      "caseId": "raw-held-lock-preserves-prior",
      "passed": true
    },
    {
      "stage": "physical-migration-blocker",
      "officialChild": true,
      "blockerObserved": true,
      "holderExpired": false
    },
    {
      "stage": "case",
      "caseId": "official-held-lock-atomic-refusal",
      "passed": true
    },
    {
      "stage": "case",
      "caseId": "official-held-lock-preserves-prior",
      "passed": true
    },
    {
      "stage": "case",
      "caseId": "raw-duplicate-refusal",
      "passed": true,
      "expectedSqlstate": "23505",
      "actualSqlstate": "23505"
    },
    {
      "stage": "case",
      "caseId": "official-duplicate-atomic-refusal",
      "passed": true
    },
    {
      "stage": "case",
      "caseId": "duplicate-preserves-prior",
      "passed": true
    },
    {
      "stage": "refusal-phase-receipt",
      "kind": "duplicate",
      "data": {
        "digest": "12f4b86666455f984fbd7b95bdd6ef83",
        "rows": 4
      },
      "catalog": "198fa51d111e46f068d2e7eddf19f772",
      "ledgers": [
        1,
        1,
        0
      ]
    },
    {
      "stage": "measured-heap",
      "bytes": 2523136,
      "refusalThresholdBytes": 1048576
    },
    {
      "stage": "case",
      "caseId": "measured-heap-above-limit",
      "passed": true
    },
    {
      "stage": "case",
      "caseId": "raw-heap-refusal",
      "passed": true,
      "expectedSqlstate": "P0001",
      "actualSqlstate": "P0001",
      "expectedReason": "APPROVAL_ARTIFACT_INDEX_REQUIRES_ONLINE_PREPARATION",
      "actualReason": "APPROVAL_ARTIFACT_INDEX_REQUIRES_ONLINE_PREPARATION"
    },
    {
      "stage": "case",
      "caseId": "official-heap-atomic-refusal",
      "passed": true
    },
    {
      "stage": "case",
      "caseId": "heap-preserves-prior",
      "passed": true
    },
    {
      "stage": "refusal-phase-receipt",
      "kind": "heap",
      "data": {
        "digest": "6abce8e1f661071f0e9ae446ed9eb80b",
        "rows": 4002
      },
      "catalog": "198fa51d111e46f068d2e7eddf19f772",
      "ledgers": [
        1,
        1,
        0
      ]
    },
    {
      "stage": "owned-baseline-reset",
      "reason": "delete-does-not-shrink-measured-heap",
      "applicationDdl": false
    },
    {
      "stage": "phase",
      "phase": "small-success-baseline",
      "fixtureCapture": "direct-sql",
      "artifactOwnerCaptureVerified": false,
      "wholeChainVerified": false,
      "sequenceAtomic": false
    },
    {
      "stage": "case",
      "caseId": "small-success-baseline-official-1732_approval_row_revision",
      "passed": true
    },
    {
      "stage": "case",
      "caseId": "small-success-baseline-replay-1732_approval_row_revision",
      "passed": true
    },
    {
      "stage": "case",
      "caseId": "small-success-baseline-official-1733_approval_task_artifact",
      "passed": true
    },
    {
      "stage": "case",
      "caseId": "small-success-baseline-legacy-five-null-preserved",
      "passed": true
    },
    {
      "stage": "case",
      "caseId": "small-success-baseline-replay-1733_approval_task_artifact",
      "passed": true
    },
    {
      "stage": "case",
      "caseId": "official-whole-1734",
      "passed": true
    },
    {
      "stage": "case",
      "caseId": "official-1734-replay-singleton",
      "passed": true
    },
    {
      "stage": "case",
      "caseId": "catalog-refuses-weak-check",
      "passed": true
    },
    {
      "stage": "case",
      "caseId": "catalog-refuses-timestamp-precision",
      "passed": true
    },
    {
      "stage": "case",
      "caseId": "catalog-refuses-digest-collation",
      "passed": true
    },
    {
      "stage": "case",
      "caseId": "catalog-refuses-function-volatility",
      "passed": true
    },
    {
      "stage": "case",
      "caseId": "catalog-refuses-function-source",
      "passed": true
    },
    {
      "stage": "case",
      "caseId": "catalog-refuses-not-enforced",
      "passed": true
    },
    {
      "stage": "case",
      "caseId": "catalog-refuses-index-columns",
      "passed": true
    },
    {
      "stage": "case",
      "caseId": "catalog-refuses-index-null-semantics",
      "passed": true
    },
    {
      "stage": "case",
      "caseId": "binding-refuses-partial",
      "passed": true,
      "expectedSqlstate": "23514",
      "actualSqlstate": "23514"
    },
    {
      "stage": "case",
      "caseId": "binding-refuses-array",
      "passed": true,
      "expectedSqlstate": "23514",
      "actualSqlstate": "23514"
    },
    {
      "stage": "case",
      "caseId": "binding-refuses-json-null",
      "passed": true,
      "expectedSqlstate": "23514",
      "actualSqlstate": "23514"
    },
    {
      "stage": "case",
      "caseId": "binding-refuses-missing-shape",
      "passed": true,
      "expectedSqlstate": "23514",
      "actualSqlstate": "23514"
    },
    {
      "stage": "case",
      "caseId": "binding-refuses-identity",
      "passed": true,
      "expectedSqlstate": "23514",
      "actualSqlstate": "23514"
    },
    {
      "stage": "case",
      "caseId": "binding-refuses-version-zero",
      "passed": true,
      "expectedSqlstate": "23514",
      "actualSqlstate": "23514"
    },
    {
      "stage": "case",
      "caseId": "binding-refuses-snapshot-project",
      "passed": true,
      "expectedSqlstate": "23514",
      "actualSqlstate": "23514"
    },
    {
      "stage": "case",
      "caseId": "binding-refuses-snapshot-version",
      "passed": true,
      "expectedSqlstate": "23514",
      "actualSqlstate": "23514"
    },
    {
      "stage": "case",
      "caseId": "binding-refuses-snapshot-id",
      "passed": true,
      "expectedSqlstate": "23514",
      "actualSqlstate": "23514"
    },
    {
      "stage": "case",
      "caseId": "binding-refuses-non-task",
      "passed": true,
      "expectedSqlstate": "23514",
      "actualSqlstate": "23514"
    },
    {
      "stage": "case",
      "caseId": "binding-refuses-version-negative",
      "passed": true,
      "expectedSqlstate": "23514",
      "actualSqlstate": "23514"
    },
    {
      "stage": "case",
      "caseId": "binding-refuses-version-overflow",
      "passed": true,
      "expectedSqlstate": "22003",
      "actualSqlstate": "22003"
    },
    {
      "stage": "case",
      "caseId": "binding-refuses-digest",
      "passed": true,
      "expectedSqlstate": "23514",
      "actualSqlstate": "23514"
    },
    {
      "stage": "case",
      "caseId": "binding-refuses-size",
      "passed": true,
      "expectedSqlstate": "23514",
      "actualSqlstate": "23514"
    },
    {
      "stage": "case",
      "caseId": "binding-refuses-unicode-byte-size",
      "passed": true,
      "expectedSqlstate": "23514",
      "actualSqlstate": "23514"
    },
    {
      "stage": "case",
      "caseId": "binding-refuses-foreign-ticket",
      "passed": true,
      "expectedSqlstate": "23503",
      "actualSqlstate": "23503"
    },
    {
      "stage": "case",
      "caseId": "binding-refuses-missing-ticket",
      "passed": true,
      "expectedSqlstate": "23503",
      "actualSqlstate": "23503"
    },
    {
      "stage": "case",
      "caseId": "canonical-jsonb-byte-boundary",
      "passed": true
    },
    {
      "stage": "case",
      "caseId": "minimal-format-forgery-is-sql-allowed",
      "passed": true
    },
    {
      "stage": "case",
      "caseId": "same-org-wrong-project-is-sql-allowed",
      "passed": true
    },
    {
      "stage": "case",
      "caseId": "immutable-org_id",
      "passed": true,
      "expectedSqlstate": "23514",
      "actualSqlstate": "23514",
      "expectedReason": "APPROVAL_ARTIFACT_BINDING_IMMUTABLE",
      "actualReason": "APPROVAL_ARTIFACT_BINDING_IMMUTABLE"
    },
    {
      "stage": "case",
      "caseId": "immutable-project_id",
      "passed": true,
      "expectedSqlstate": "23514",
      "actualSqlstate": "23514",
      "expectedReason": "APPROVAL_ARTIFACT_BINDING_IMMUTABLE",
      "actualReason": "APPROVAL_ARTIFACT_BINDING_IMMUTABLE"
    },
    {
      "stage": "case",
      "caseId": "immutable-entity_type",
      "passed": true,
      "expectedSqlstate": "23514",
      "actualSqlstate": "23514",
      "expectedReason": "APPROVAL_ARTIFACT_BINDING_IMMUTABLE",
      "actualReason": "APPROVAL_ARTIFACT_BINDING_IMMUTABLE"
    },
    {
      "stage": "case",
      "caseId": "immutable-entity_id",
      "passed": true,
      "expectedSqlstate": "23514",
      "actualSqlstate": "23514",
      "expectedReason": "APPROVAL_ARTIFACT_BINDING_IMMUTABLE",
      "actualReason": "APPROVAL_ARTIFACT_BINDING_IMMUTABLE"
    },
    {
      "stage": "case",
      "caseId": "immutable-artifact_ticket_id",
      "passed": true,
      "expectedSqlstate": "23514",
      "actualSqlstate": "23514",
      "expectedReason": "APPROVAL_ARTIFACT_BINDING_IMMUTABLE",
      "actualReason": "APPROVAL_ARTIFACT_BINDING_IMMUTABLE"
    },
    {
      "stage": "case",
      "caseId": "immutable-artifact_version",
      "passed": true,
      "expectedSqlstate": "23514",
      "actualSqlstate": "23514",
      "expectedReason": "APPROVAL_ARTIFACT_BINDING_IMMUTABLE",
      "actualReason": "APPROVAL_ARTIFACT_BINDING_IMMUTABLE"
    },
    {
      "stage": "case",
      "caseId": "immutable-artifact_snapshot",
      "passed": true,
      "expectedSqlstate": "23514",
      "actualSqlstate": "23514",
      "expectedReason": "APPROVAL_ARTIFACT_BINDING_IMMUTABLE",
      "actualReason": "APPROVAL_ARTIFACT_BINDING_IMMUTABLE"
    },
    {
      "stage": "case",
      "caseId": "immutable-artifact_digest",
      "passed": true,
      "expectedSqlstate": "23514",
      "actualSqlstate": "23514",
      "expectedReason": "APPROVAL_ARTIFACT_BINDING_IMMUTABLE",
      "actualReason": "APPROVAL_ARTIFACT_BINDING_IMMUTABLE"
    },
    {
      "stage": "case",
      "caseId": "immutable-artifact_captured_at",
      "passed": true,
      "expectedSqlstate": "23514",
      "actualSqlstate": "23514",
      "expectedReason": "APPROVAL_ARTIFACT_BINDING_IMMUTABLE",
      "actualReason": "APPROVAL_ARTIFACT_BINDING_IMMUTABLE"
    },
    {
      "stage": "case",
      "caseId": "legacy-null-to-bound-refused",
      "passed": true,
      "expectedSqlstate": "23514",
      "actualSqlstate": "23514",
      "expectedReason": "APPROVAL_ARTIFACT_BINDING_IMMUTABLE",
      "actualReason": "APPROVAL_ARTIFACT_BINDING_IMMUTABLE"
    },
    {
      "stage": "case",
      "caseId": "status-assignee-mutable-binding-preserved",
      "passed": true
    },
    {
      "stage": "case",
      "caseId": "pending-unique-requested",
      "passed": true,
      "expectedSqlstate": "23505",
      "actualSqlstate": "23505"
    },
    {
      "stage": "case",
      "caseId": "pending-unique-pending",
      "passed": true,
      "expectedSqlstate": "23505",
      "actualSqlstate": "23505"
    },
    {
      "stage": "case",
      "caseId": "pending-unique-escalated",
      "passed": true,
      "expectedSqlstate": "23505",
      "actualSqlstate": "23505"
    },
    {
      "stage": "case",
      "caseId": "pending-unique-changes_requested",
      "passed": true,
      "expectedSqlstate": "23505",
      "actualSqlstate": "23505"
    },
    {
      "stage": "case",
      "caseId": "unique-control-0-{\"version\":4}",
      "passed": true
    },
    {
      "stage": "case",
      "caseId": "unique-control-1-{\"approver\":2}",
      "passed": true
    },
    {
      "stage": "case",
      "caseId": "unique-control-2-{\"status\":\"approved\"}",
      "passed": true
    },
    {
      "stage": "case",
      "caseId": "unique-control-3-{\"status\":\"rejected\"}",
      "passed": true
    },
    {
      "stage": "case",
      "caseId": "unique-control-4-{\"status\":\"cancelled\"}",
      "passed": true
    },
    {
      "stage": "case",
      "caseId": "unique-control-5-{\"deleted\":\"2026-10-04T00:00:00Z\"}",
      "passed": true
    },
    {
      "stage": "case",
      "caseId": "unique-control-6-{\"approver\":null}",
      "passed": true
    },
    {
      "stage": "case",
      "caseId": "unique-control-7-{\"approver\":null}",
      "passed": true
    },
    {
      "stage": "case",
      "caseId": "bound-ticket-hard-delete-refused",
      "passed": true,
      "expectedSqlstate": "23001",
      "actualSqlstate": "23001"
    },
    {
      "stage": "physical-insert-blocker",
      "blockerObserved": true,
      "holderExpired": false
    },
    {
      "stage": "case",
      "caseId": "physical-same-tuple-insert-one-winner",
      "passed": true
    },
    {
      "stage": "case",
      "caseId": "transactional-audit-failure",
      "passed": true,
      "expectedSqlstate": "23502",
      "actualSqlstate": "23502"
    },
    {
      "stage": "case",
      "caseId": "audit-and-binding-rolled-back",
      "passed": true
    },
    {
      "stage": "case",
      "caseId": "rollback-rollback/1733_approval_task_artifact.down",
      "passed": true,
      "expectedSqlstate": "P0001",
      "actualSqlstate": "P0001",
      "expectedReason": "APPROVAL_ARTIFACT_ROLLBACK_REQUIRES_REVIEW",
      "actualReason": "APPROVAL_ARTIFACT_ROLLBACK_REQUIRES_REVIEW"
    },
    {
      "stage": "case",
      "caseId": "rollback-rollback/1734_approval_task_pending_index.down",
      "passed": true,
      "expectedSqlstate": "P0001",
      "actualSqlstate": "P0001",
      "expectedReason": "APPROVAL_ARTIFACT_INDEX_ROLLBACK_REQUIRES_REVIEW",
      "actualReason": "APPROVAL_ARTIFACT_INDEX_ROLLBACK_REQUIRES_REVIEW"
    },
    {
      "stage": "case",
      "caseId": "rollback-catalog-data-ledgers-unchanged",
      "passed": true
    },
    {
      "stage": "case",
      "caseId": "foreign-tenant-write-zero",
      "passed": true
    },
    {
      "stage": "case",
      "caseId": "foreign-tenant-insert-denied",
      "passed": true,
      "expectedSqlstate": "42501",
      "actualSqlstate": "42501"
    },
    {
      "stage": "case",
      "caseId": "missing-tenant-denied",
      "passed": true,
      "expectedSqlstate": "42501",
      "actualSqlstate": "42501"
    },
    {
      "stage": "case",
      "caseId": "app-binding-trigger-disable-denied",
      "passed": true,
      "expectedSqlstate": "42501",
      "actualSqlstate": "42501"
    },
    {
      "stage": "case",
      "caseId": "exact-admin-row-identities",
      "passed": true
    },
    {
      "stage": "case",
      "caseId": "app-a-read-only-markers",
      "passed": true
    },
    {
      "stage": "read-only-tenant-receipt",
      "tenant": "a",
      "verified": true,
      "role": "streamline_app",
      "mode": "on",
      "markers": [
        {
          "id": 1,
          "org_id": "synthetic-approval-proof-org-a",
          "revision": "1",
          "artifact_ticket_id": null,
          "artifact_version": null,
          "artifact_digest": null,
          "snapshot_digest": null,
          "captured": null,
          "unbound": true
        },
        {
          "id": 3,
          "org_id": "synthetic-approval-proof-org-a",
          "revision": "2",
          "artifact_ticket_id": 1,
          "artifact_version": 1,
          "artifact_digest": "08e1cdbe2374bc5e943117aae5ebd6595e838c4d4dae3e8f57a477a7432addf5",
          "snapshot_digest": "055692316b365c9c8660f8eecbc25bcc",
          "captured": "2026-10-04 00:00:00.123",
          "unbound": false
        },
        {
          "id": 20,
          "org_id": "synthetic-approval-proof-org-a",
          "revision": "1",
          "artifact_ticket_id": 1,
          "artifact_version": 2,
          "artifact_digest": "85ab1468fec5ebbcabb352f6ca6b27a3355301deca5c893477e58c554917c2ba",
          "snapshot_digest": "5f03be12d4ef93b0a4b4af9bce4c080f",
          "captured": "2026-10-04 00:00:00.123",
          "unbound": false
        },
        {
          "id": 21,
          "org_id": "synthetic-approval-proof-org-a",
          "revision": "1",
          "artifact_ticket_id": 1,
          "artifact_version": 3,
          "artifact_digest": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
          "snapshot_digest": "84bc5505f96de5382703acf9d6718df6",
          "captured": "2026-10-04 00:00:00.123",
          "unbound": false
        },
        {
          "id": 22,
          "org_id": "synthetic-approval-proof-org-a",
          "revision": "1",
          "artifact_ticket_id": 4,
          "artifact_version": 1,
          "artifact_digest": "73b6941f38480f5579e061d39673a1f3e15b1176b2d78bedfb74c9c2348de201",
          "snapshot_digest": "c6b934ce2cdd23f04da0c4025b97ff86",
          "captured": "2026-10-04 00:00:00.123",
          "unbound": false
        },
        {
          "id": 23,
          "org_id": "synthetic-approval-proof-org-a",
          "revision": "1",
          "artifact_ticket_id": 1,
          "artifact_version": 1,
          "artifact_digest": "08e1cdbe2374bc5e943117aae5ebd6595e838c4d4dae3e8f57a477a7432addf5",
          "snapshot_digest": "055692316b365c9c8660f8eecbc25bcc",
          "captured": "2026-10-04 00:00:00.123",
          "unbound": false
        },
        {
          "id": 28,
          "org_id": "synthetic-approval-proof-org-a",
          "revision": "1",
          "artifact_ticket_id": 1,
          "artifact_version": 4,
          "artifact_digest": "d372978532e721a664f7324f20d486dc03aa6a1800c9d424ae407c2170dec10b",
          "snapshot_digest": "7785eb84e3f956bf4533b3a82ff11506",
          "captured": "2026-10-04 00:00:00.123",
          "unbound": false
        },
        {
          "id": 29,
          "org_id": "synthetic-approval-proof-org-a",
          "revision": "1",
          "artifact_ticket_id": 1,
          "artifact_version": 1,
          "artifact_digest": "08e1cdbe2374bc5e943117aae5ebd6595e838c4d4dae3e8f57a477a7432addf5",
          "snapshot_digest": "055692316b365c9c8660f8eecbc25bcc",
          "captured": "2026-10-04 00:00:00.123",
          "unbound": false
        },
        {
          "id": 30,
          "org_id": "synthetic-approval-proof-org-a",
          "revision": "1",
          "artifact_ticket_id": 1,
          "artifact_version": 1,
          "artifact_digest": "08e1cdbe2374bc5e943117aae5ebd6595e838c4d4dae3e8f57a477a7432addf5",
          "snapshot_digest": "055692316b365c9c8660f8eecbc25bcc",
          "captured": "2026-10-04 00:00:00.123",
          "unbound": false
        },
        {
          "id": 31,
          "org_id": "synthetic-approval-proof-org-a",
          "revision": "1",
          "artifact_ticket_id": 1,
          "artifact_version": 1,
          "artifact_digest": "08e1cdbe2374bc5e943117aae5ebd6595e838c4d4dae3e8f57a477a7432addf5",
          "snapshot_digest": "055692316b365c9c8660f8eecbc25bcc",
          "captured": "2026-10-04 00:00:00.123",
          "unbound": false
        },
        {
          "id": 32,
          "org_id": "synthetic-approval-proof-org-a",
          "revision": "1",
          "artifact_ticket_id": 1,
          "artifact_version": 1,
          "artifact_digest": "08e1cdbe2374bc5e943117aae5ebd6595e838c4d4dae3e8f57a477a7432addf5",
          "snapshot_digest": "055692316b365c9c8660f8eecbc25bcc",
          "captured": "2026-10-04 00:00:00.123",
          "unbound": false
        },
        {
          "id": 33,
          "org_id": "synthetic-approval-proof-org-a",
          "revision": "1",
          "artifact_ticket_id": 1,
          "artifact_version": 1,
          "artifact_digest": "08e1cdbe2374bc5e943117aae5ebd6595e838c4d4dae3e8f57a477a7432addf5",
          "snapshot_digest": "055692316b365c9c8660f8eecbc25bcc",
          "captured": "2026-10-04 00:00:00.123",
          "unbound": false
        },
        {
          "id": 34,
          "org_id": "synthetic-approval-proof-org-a",
          "revision": "1",
          "artifact_ticket_id": 1,
          "artifact_version": 1,
          "artifact_digest": "08e1cdbe2374bc5e943117aae5ebd6595e838c4d4dae3e8f57a477a7432addf5",
          "snapshot_digest": "055692316b365c9c8660f8eecbc25bcc",
          "captured": "2026-10-04 00:00:00.123",
          "unbound": false
        },
        {
          "id": 35,
          "org_id": "synthetic-approval-proof-org-a",
          "revision": "1",
          "artifact_ticket_id": 1,
          "artifact_version": 1,
          "artifact_digest": "08e1cdbe2374bc5e943117aae5ebd6595e838c4d4dae3e8f57a477a7432addf5",
          "snapshot_digest": "055692316b365c9c8660f8eecbc25bcc",
          "captured": "2026-10-04 00:00:00.123",
          "unbound": false
        },
        {
          "id": 36,
          "org_id": "synthetic-approval-proof-org-a",
          "revision": "1",
          "artifact_ticket_id": 3,
          "artifact_version": 1,
          "artifact_digest": "d3cd16d2e3c968bef5a2f31d1a234f86be48df5e8874db6105f47e842a6b9201",
          "snapshot_digest": "4e43e028c8ecbd4328ca79114444ccff",
          "captured": "2026-10-04 00:00:00.123",
          "unbound": false
        }
      ]
    },
    {
      "stage": "case",
      "caseId": "app-b-read-only-markers",
      "passed": true
    },
    {
      "stage": "read-only-tenant-receipt",
      "tenant": "b",
      "verified": true,
      "role": "streamline_app",
      "mode": "on",
      "markers": [
        {
          "id": 2,
          "org_id": "synthetic-approval-proof-org-b",
          "revision": "1",
          "artifact_ticket_id": null,
          "artifact_version": null,
          "artifact_digest": null,
          "snapshot_digest": null,
          "captured": null,
          "unbound": true
        }
      ]
    },
    {
      "stage": "admin-select-receipt",
      "data": {
        "digest": "55ee7a51cc0fee2c25c93f74b8aac575",
        "rows": 16
      },
      "catalog": "34b205dfac735b9973cd10a3152cbad5",
      "ledgers": [
        1,
        1,
        1
      ],
      "sqlOnly": true,
      "deployedRlsVerified": false,
      "applicationRuntimeVerified": false,
      "wholeChainVerified": false
    },
    {
      "stage": "case",
      "caseId": "final-exact-catalog",
      "passed": true
    },
    {
      "stage": "results",
      "checks": 89,
      "failed": 0,
      "wholeChainVerified": false,
      "applicationRuntimeVerified": false
    },
    {
      "stage": "cleanup",
      "droppedCurrentRunDatabase": true
    }
  ],
  "independentCleanup": {
    "observedAt": "2026-10-04T03:11:03.769Z",
    "role": "streamline_app",
    "read_only": "on",
    "server_version_num": "180004",
    "scratch_database_count": 0,
    "scratch_session_count": 0,
    "new_column_count": 0,
    "reserved_approval_count": 0,
    "applicationWrites": false
  },
  "focusedTests": {
    "command": "node --test src/scripts/__tests__/approval-revision-migration-proof.test.mjs src/scripts/__tests__/approval-artifact-migration-proof.test.mjs src/scripts/__tests__/organization-setup-migration-proof.test.mjs src/scripts/__tests__/portal-migration-proof.test.mjs",
    "exitCode": 0,
    "tests": 99,
    "passed": 99,
    "failed": 0,
    "skipped": 0
  },
  "gates": {
    "exactSixPathLint": 0,
    "exactThreePathDiff": 0,
    "syntax": "six exact files previously passed at the same frozen hashes",
    "productionTypecheck": {
      "command": "pnpm -C backend typecheck",
      "exitCode": 0,
      "observedAt": "2026-10-04T02:02:38.420Z",
      "wallSeconds": 9.3764294,
      "typescriptSourceUnchanged": true,
      "scope": "production TypeScript; operational MJS requires separate focused/syntax/lint checks"
    },
    "independentReviews": "B final source/corrected catalog/commit boundary; C tests and inverse operational corrections CLEAR"
  },
  "scopeLimits": {
    "wholeChainVerified": false,
    "applicationRuntimeVerified": false,
    "deployedRlsVerified": false,
    "artifactOwnerCaptureVerified": false,
    "serviceRbacTenantCacheEventVerified": false,
    "browserMobileVerified": false,
    "deploymentOperationsVerified": false,
    "applicationMigrationsApplied": false,
    "broadRequirementClosed": false
  },
  "remaining": [
    "Approver liveness and requester/permission races",
    "All seven non-task artifact owners",
    "Real service, authorization, PAT, tenant, cache and event proof",
    "Application migration readiness and target application",
    "Matching synthetic browser and mobile proof",
    "Deployment and operations"
  ],
  "tracker": {
    "total": 522,
    "checked": 110,
    "open": 412,
    "checkboxOrStageChanges": 0
  },
  "cleanup": {
    "createdSourceFiles": [
      "backend/src/scripts/lib/approval-artifact-proof-catalog.mjs",
      "backend/src/scripts/lib/approval-artifact-proof-cases.mjs",
      "backend/src/scripts/__tests__/approval-artifact-migration-proof.test.mjs"
    ],
    "deletedFiles": []
  }
}
```

## Task artifact scratch proof checkpoint — 2026-10-04

Classification: Current verified for the exact source checks and bounded scratch observations below; Current unverified for application, browser and release acceptance. Claim48 supports BT-27a037364398 and BT-801e948e8a67 without closing either. The third corrected plan is ready, but has not executed. Source47 remains unchanged and application1732/1733/1734 remains unapplied.

### Failed runs and corrections

- First owned scratch run terminates with23514 after9 passing migration/replay/physical-lock checks. Guarded cleanup and independent application-role READ ONLY observations find no remaining owned database or sessions. A pure synthetic READ ONLY expression proves that the driver serializes a pre-serialized JSONB parameter into a string; text-first parsing yields an object. An installed-driver regression fails before the one-line `::text::jsonb` correction.
- Second owned scratch run completes89 checks:87 pass and2 fail. The named NOT ENFORCED CHECK mutation returns false; no SQLSTATE for that internal failure was exposed. The hard-delete oracle expects23503 but observes23001. Both failures are retained. Independent READ ONLY cleanup again finds no owned database or sessions.
- The corrected named operation reads only the exact admin-only reference CHECK expression and recreates the same CHECK as NOT ENFORCED inside the existing forced-rollback transaction. PostgreSQL limits the ALTER CONSTRAINT attribute form to foreign keys; see [PostgreSQL18 ALTER TABLE](https://www.postgresql.org/docs/18/sql-altertable.html). NOT ENFORCED can also change validation state; no direct system-catalog edit or claim of isolated enforcement is made. The delete oracle now requires exact23001; foreign/missing insert controls still require23503. These are distinct [PostgreSQL error codes](https://www.postgresql.org/docs/18/errcodes-appendix.html).
- C captures the named-operation RED before correction. Final99 focused checks pass; grouping the existing tests retains all earlier assertions. Exact six-file lint, syntax, whitespace and no-comment checks pass. B/C independently verify frozen hashes and the inverse deltas; coordinator reviews the tests. Earlier truthy-manifest/inherited-key/shape regressions and review-led catalog refinements retain their actual chronology.

The second run positively observes physical migration and insert blockers before release with expired-holder false; a2523136-byte heap; binding, UTF-8, immutable identity, uniqueness, audit-transaction rollback, rollback-script refusals and tenant denials; exact READ ONLY markers for15 tenant-A rows and1 tenant-B row. These are direct SQL fixtures, not canonical service capture, HTTP authorization, deployed RLS, cache/event, browser or mobile proof. The remaining liveness inventory recommends membership SHARE before Ticket to avoid a removal lock inversion; it is not an edit reservation. Full eight-owner approvals, application migration/readiness, complete role/PAT/tenant/cache/event matrices, matching frontend and deployment/operations remain open. Full test TypeScript and migration-gate failures recorded under source47 are unchanged.

### Sanitized scratch checkpoint receipt

One sanitized JSON payload is retained in this existing audit document; SHA-256 `ba22dd4cd29d322937ceee842d59d565fea3e4c84a27312ee2708f72e7df8916`. The failed-run events are retained with their original observed results. No credentials, OTPs, links, raw driver diagnostics, extra Markdown or historical evidence are added or removed.

```json
{
  "package": 48,
  "task": "BT-27a037364398",
  "supports": "BT-801e948e8a67",
  "claimRevision": "9d5542d7a40d16325e06b578cc5ab9ffa571145d",
  "parentBackendRevision": "ed55a897d8668f5adfd99136e3e3b05891285254",
  "currentSourceClassification": "Current verified for focused gates and independent source review",
  "applicationClassification": "Current unverified; no application writes or DDL",
  "frozenSources": [
    {
      "path": "backend/src/scripts/approval-revision-migration-proof.mjs",
      "sha256": "c22503ca655233156589995c84cf71fcbce9b9bb3d69e5d629df00596c2d247e",
      "lines": 77
    },
    {
      "path": "backend/src/scripts/lib/approval-revision-proof-baseline.mjs",
      "sha256": "0db4e8e0c233c3755f8700f1df8a0f1d7ca78ac321bfd59d9d6724fef97d5543",
      "lines": 259
    },
    {
      "path": "backend/src/scripts/lib/approval-revision-proof-cases.mjs",
      "sha256": "f39279b84deb6914c236be1d7f305f305d860beed1e8c0ab67f8f024d106ead7",
      "lines": 286
    },
    {
      "path": "backend/src/scripts/lib/approval-artifact-proof-catalog.mjs",
      "sha256": "8d66bbb4503c65bd6e1a6c9ae19520313fcb9a042d0b2a940b3d921ca63fb8bd",
      "lines": 247
    },
    {
      "path": "backend/src/scripts/lib/approval-artifact-proof-cases.mjs",
      "sha256": "cda78f9df9f3eb453fe91c061bffd4341e479c7413a5e6f65826edbf3ebadf2c",
      "lines": 249
    },
    {
      "path": "backend/src/scripts/__tests__/approval-artifact-migration-proof.test.mjs",
      "sha256": "33864d866596a5cb84d13c8ce18dcce4c963249df42d49eec3e6611dc832cd34",
      "lines": 299
    }
  ],
  "gates": {
    "focusedChecks": 99,
    "focusedPassed": 99,
    "eslintExit": 0,
    "syntax": [
      {
        "path": "backend/src/scripts/approval-revision-migration-proof.mjs",
        "exit": 0
      },
      {
        "path": "backend/src/scripts/lib/approval-revision-proof-baseline.mjs",
        "exit": 0
      },
      {
        "path": "backend/src/scripts/lib/approval-revision-proof-cases.mjs",
        "exit": 0
      },
      {
        "path": "backend/src/scripts/lib/approval-artifact-proof-catalog.mjs",
        "exit": 0
      },
      {
        "path": "backend/src/scripts/lib/approval-artifact-proof-cases.mjs",
        "exit": 0
      },
      {
        "path": "backend/src/scripts/__tests__/approval-artifact-migration-proof.test.mjs",
        "exit": 0
      }
    ],
    "diffExit": 0,
    "sourceComments": 0,
    "productionTypecheck": {
      "command": "pnpm -C backend typecheck",
      "exit": 0,
      "observedAt": "2026-10-04T02:02:38.420Z",
      "mjsTypechecked": false
    }
  },
  "failedRuns": [
    {
      "database": "scratch_build_migration_0b0d2a1acf93e471db19c583",
      "startedAt": "2026-10-04T02:25:32.415Z",
      "finishedAt": "2026-10-04T02:26:47.479Z",
      "exit": 1,
      "events": [
        {
          "stage": "plan",
          "database": "scratch_build_migration_0b0d2a1acf93e471db19c583",
          "execute": true,
          "proofScope": "focused-ticket-and-approval-fragments-and-whole-1732-1733-1734",
          "wholeChainVerified": false,
          "applicationRuntimeVerified": false,
          "deployedRlsVerified": false,
          "sourceHashes": {
            "0000_light_vance_astro": "850dc745890a24e85d6b4a79e2c47b35e96219e8b906178ff2a1984a5e09eccd",
            "0374_tenant_guc_helper": "bf571f0a242a09b337f6d2180ab2a812e62211fda39cf48d899dfcb3eae0ac25",
            "0426_build_identity_pks": "e3eab6751fa38e790dac2e874b778b6552de85c1534096effcf15b2a21e8b917",
            "0432_build_schema": "83cd4bed901ae2cbe844fdd849ab0c0c9b12be309e06bf10b9f33ec7989f7439",
            "0648_build_actor_membership_expand": "f16995bafc4db9daa8c7e3f0ff3492cf6327f944825cc4e601230a8a5564d7da",
            "0668_fix_membership_fk_on_delete": "1e525a18ef3f6d580ea1b29c6ea32991a9a47eb07746b030a93ffca705e95fc2",
            "0770_set_null_fk_column_lists": "6f0d4cd80034c047b8d6f44292eac6c4b0b8796452e6efcda98d37c4b472da2d",
            "0917_build_actor_drop": "482c1e02a4a9c8b214b62187354320d593d22260e4c1f2cc42a52d856a6037d6",
            "0945_ar02_build_composite_fks": "8257bf2b642166abaf28f947b1ad463abe2f6e4a8bf06fd36a37f5118c70ccaa",
            "0948_ar02_drop_build_single_fks": "64f504824eb85a211af95feda0aeec4a2f5ea131a2b0a39842488ac809eb2b9b",
            "1732_approval_row_revision": "a4b1eb51194c7a0e81fcb6f6e238c48c5161dbeb848c2b6b3d05de9562707ef1",
            "rollback/1732_approval_row_revision.down": "976df5d24de43708e8856344d01a4c3f1f7a7d5569cab9033a397677c6ac5bd1",
            "0322_recon_phase_c_candidate_keys": "bd6fbfe53f3d7926ef28bf417afc77bdb20ff3cde99dc2487e13797095589268",
            "0416_tickets_soft_delete_and_version": "b639c215e1b58ad5f442b589108e188e72ed7c9c4d617050354bd223f5ec8709",
            "1373_tickets_version_trigger": "681c0a0cc32b72ece0d4e42439a30816e217f5a875fd602559ab3447963cc85a",
            "1733_approval_task_artifact": "4a00fa99d3aeaba44b111308063b5fcfd013f6c1dbd753c328e2abe171951e14",
            "1734_approval_task_pending_index": "34a1ab0934186c5c4c0a67e67d17fa79ba3f632bd3c0ad703e3eee42d007a10d",
            "rollback/1733_approval_task_artifact.down": "dcb64da39743705b828d268157dd24e9cffe85f07937459149033b0fd917c7d2",
            "rollback/1734_approval_task_pending_index.down": "b34fa003d474f1bf176b33ef0abda9c3e423052a7f74c55d070039a9b7d021f2"
          }
        },
        {
          "stage": "phase",
          "phase": "refusal-baseline",
          "fixtureCapture": "direct-sql",
          "artifactOwnerCaptureVerified": false,
          "wholeChainVerified": false,
          "sequenceAtomic": false
        },
        {
          "stage": "case",
          "caseId": "refusal-baseline-official-1732_approval_row_revision",
          "passed": true
        },
        {
          "stage": "case",
          "caseId": "refusal-baseline-replay-1732_approval_row_revision",
          "passed": true
        },
        {
          "stage": "case",
          "caseId": "refusal-baseline-official-1733_approval_task_artifact",
          "passed": true
        },
        {
          "stage": "case",
          "caseId": "refusal-baseline-legacy-five-null-preserved",
          "passed": true
        },
        {
          "stage": "case",
          "caseId": "refusal-baseline-replay-1733_approval_task_artifact",
          "passed": true
        },
        {
          "stage": "physical-migration-blocker",
          "officialChild": false,
          "blockerObserved": true,
          "holderExpired": false
        },
        {
          "stage": "case",
          "caseId": "raw-held-lock-timeout",
          "passed": true,
          "expectedSqlstate": "57014",
          "actualSqlstate": "57014"
        },
        {
          "stage": "case",
          "caseId": "raw-held-lock-preserves-prior",
          "passed": true
        },
        {
          "stage": "physical-migration-blocker",
          "officialChild": true,
          "blockerObserved": true,
          "holderExpired": false
        },
        {
          "stage": "case",
          "caseId": "official-held-lock-atomic-refusal",
          "passed": true
        },
        {
          "stage": "case",
          "caseId": "official-held-lock-preserves-prior",
          "passed": true
        },
        {
          "stage": "refused-or-failed",
          "failure": "23514",
          "cleanupVerified": true,
          "manualInspectionRequired": false
        }
      ],
      "sourceHashes": {
        "backend/src/scripts/approval-revision-migration-proof.mjs": "c22503ca655233156589995c84cf71fcbce9b9bb3d69e5d629df00596c2d247e",
        "backend/src/scripts/lib/approval-revision-proof-baseline.mjs": "0db4e8e0c233c3755f8700f1df8a0f1d7ca78ac321bfd59d9d6724fef97d5543",
        "backend/src/scripts/lib/approval-revision-proof-cases.mjs": "f39279b84deb6914c236be1d7f305f305d860beed1e8c0ab67f8f024d106ead7",
        "backend/src/scripts/lib/approval-artifact-proof-catalog.mjs": "fe9d102163ae4b5591c95e8aac02c3e61a0e5fc04c3d8ac3acaac98ab9f0e2a8",
        "backend/src/scripts/lib/approval-artifact-proof-cases.mjs": "9129859a0a279e31b2bc5dfb504f191de18c136609bc6e1ba392265ce4b6f1e7",
        "backend/src/scripts/__tests__/approval-artifact-migration-proof.test.mjs": "50edf21cf4e1c28fbff0f9ee209a1a696921b844829c0749f73c730dc4a455c8"
      },
      "independentReadOnlyCleanup": {
        "role": "streamline_app",
        "read_only": "on",
        "server_version_num": "180004",
        "scratch_database_count": 0,
        "scratch_session_count": 0,
        "new_column_count": 0,
        "reserved_approval_count": 0,
        "inferred_jsonb_type": "string",
        "explicit_text_jsonb_type": "object",
        "database": "scratch_build_migration_0b0d2a1acf93e471db19c583",
        "syntheticLiteralOnly": true,
        "applicationWrites": false,
        "observedAt": "2026-10-04T02:30:36.503Z"
      }
    },
    {
      "database": "scratch_build_migration_c531da14f7a30ad2e1c40a11",
      "startedAt": "2026-10-04T02:34:25.314Z",
      "finishedAt": "2026-10-04T02:38:26.225Z",
      "exit": 1,
      "events": [
        {
          "stage": "plan",
          "database": "scratch_build_migration_c531da14f7a30ad2e1c40a11",
          "execute": true,
          "proofScope": "focused-ticket-and-approval-fragments-and-whole-1732-1733-1734",
          "wholeChainVerified": false,
          "applicationRuntimeVerified": false,
          "deployedRlsVerified": false,
          "sourceHashes": {
            "0000_light_vance_astro": "850dc745890a24e85d6b4a79e2c47b35e96219e8b906178ff2a1984a5e09eccd",
            "0374_tenant_guc_helper": "bf571f0a242a09b337f6d2180ab2a812e62211fda39cf48d899dfcb3eae0ac25",
            "0426_build_identity_pks": "e3eab6751fa38e790dac2e874b778b6552de85c1534096effcf15b2a21e8b917",
            "0432_build_schema": "83cd4bed901ae2cbe844fdd849ab0c0c9b12be309e06bf10b9f33ec7989f7439",
            "0648_build_actor_membership_expand": "f16995bafc4db9daa8c7e3f0ff3492cf6327f944825cc4e601230a8a5564d7da",
            "0668_fix_membership_fk_on_delete": "1e525a18ef3f6d580ea1b29c6ea32991a9a47eb07746b030a93ffca705e95fc2",
            "0770_set_null_fk_column_lists": "6f0d4cd80034c047b8d6f44292eac6c4b0b8796452e6efcda98d37c4b472da2d",
            "0917_build_actor_drop": "482c1e02a4a9c8b214b62187354320d593d22260e4c1f2cc42a52d856a6037d6",
            "0945_ar02_build_composite_fks": "8257bf2b642166abaf28f947b1ad463abe2f6e4a8bf06fd36a37f5118c70ccaa",
            "0948_ar02_drop_build_single_fks": "64f504824eb85a211af95feda0aeec4a2f5ea131a2b0a39842488ac809eb2b9b",
            "1732_approval_row_revision": "a4b1eb51194c7a0e81fcb6f6e238c48c5161dbeb848c2b6b3d05de9562707ef1",
            "rollback/1732_approval_row_revision.down": "976df5d24de43708e8856344d01a4c3f1f7a7d5569cab9033a397677c6ac5bd1",
            "0322_recon_phase_c_candidate_keys": "bd6fbfe53f3d7926ef28bf417afc77bdb20ff3cde99dc2487e13797095589268",
            "0416_tickets_soft_delete_and_version": "b639c215e1b58ad5f442b589108e188e72ed7c9c4d617050354bd223f5ec8709",
            "1373_tickets_version_trigger": "681c0a0cc32b72ece0d4e42439a30816e217f5a875fd602559ab3447963cc85a",
            "1733_approval_task_artifact": "4a00fa99d3aeaba44b111308063b5fcfd013f6c1dbd753c328e2abe171951e14",
            "1734_approval_task_pending_index": "34a1ab0934186c5c4c0a67e67d17fa79ba3f632bd3c0ad703e3eee42d007a10d",
            "rollback/1733_approval_task_artifact.down": "dcb64da39743705b828d268157dd24e9cffe85f07937459149033b0fd917c7d2",
            "rollback/1734_approval_task_pending_index.down": "b34fa003d474f1bf176b33ef0abda9c3e423052a7f74c55d070039a9b7d021f2"
          }
        },
        {
          "stage": "phase",
          "phase": "refusal-baseline",
          "fixtureCapture": "direct-sql",
          "artifactOwnerCaptureVerified": false,
          "wholeChainVerified": false,
          "sequenceAtomic": false
        },
        {
          "stage": "case",
          "caseId": "refusal-baseline-official-1732_approval_row_revision",
          "passed": true
        },
        {
          "stage": "case",
          "caseId": "refusal-baseline-replay-1732_approval_row_revision",
          "passed": true
        },
        {
          "stage": "case",
          "caseId": "refusal-baseline-official-1733_approval_task_artifact",
          "passed": true
        },
        {
          "stage": "case",
          "caseId": "refusal-baseline-legacy-five-null-preserved",
          "passed": true
        },
        {
          "stage": "case",
          "caseId": "refusal-baseline-replay-1733_approval_task_artifact",
          "passed": true
        },
        {
          "stage": "physical-migration-blocker",
          "officialChild": false,
          "blockerObserved": true,
          "holderExpired": false
        },
        {
          "stage": "case",
          "caseId": "raw-held-lock-timeout",
          "passed": true,
          "expectedSqlstate": "57014",
          "actualSqlstate": "57014"
        },
        {
          "stage": "case",
          "caseId": "raw-held-lock-preserves-prior",
          "passed": true
        },
        {
          "stage": "physical-migration-blocker",
          "officialChild": true,
          "blockerObserved": true,
          "holderExpired": false
        },
        {
          "stage": "case",
          "caseId": "official-held-lock-atomic-refusal",
          "passed": true
        },
        {
          "stage": "case",
          "caseId": "official-held-lock-preserves-prior",
          "passed": true
        },
        {
          "stage": "case",
          "caseId": "raw-duplicate-refusal",
          "passed": true,
          "expectedSqlstate": "23505",
          "actualSqlstate": "23505"
        },
        {
          "stage": "case",
          "caseId": "official-duplicate-atomic-refusal",
          "passed": true
        },
        {
          "stage": "case",
          "caseId": "duplicate-preserves-prior",
          "passed": true
        },
        {
          "stage": "refusal-phase-receipt",
          "kind": "duplicate",
          "data": {
            "digest": "8e3cb841d86406701df39ca5f52369ca",
            "rows": 4
          },
          "catalog": "973e8514aaaa40b5a2162e0df28247c1",
          "ledgers": [
            1,
            1,
            0
          ]
        },
        {
          "stage": "measured-heap",
          "bytes": 2523136,
          "refusalThresholdBytes": 1048576
        },
        {
          "stage": "case",
          "caseId": "measured-heap-above-limit",
          "passed": true
        },
        {
          "stage": "case",
          "caseId": "raw-heap-refusal",
          "passed": true,
          "expectedSqlstate": "P0001",
          "actualSqlstate": "P0001",
          "expectedReason": "APPROVAL_ARTIFACT_INDEX_REQUIRES_ONLINE_PREPARATION",
          "actualReason": "APPROVAL_ARTIFACT_INDEX_REQUIRES_ONLINE_PREPARATION"
        },
        {
          "stage": "case",
          "caseId": "official-heap-atomic-refusal",
          "passed": true
        },
        {
          "stage": "case",
          "caseId": "heap-preserves-prior",
          "passed": true
        },
        {
          "stage": "refusal-phase-receipt",
          "kind": "heap",
          "data": {
            "digest": "c4a8d69553b78189e3df1ba139e82227",
            "rows": 4002
          },
          "catalog": "973e8514aaaa40b5a2162e0df28247c1",
          "ledgers": [
            1,
            1,
            0
          ]
        },
        {
          "stage": "owned-baseline-reset",
          "reason": "delete-does-not-shrink-measured-heap",
          "applicationDdl": false
        },
        {
          "stage": "phase",
          "phase": "small-success-baseline",
          "fixtureCapture": "direct-sql",
          "artifactOwnerCaptureVerified": false,
          "wholeChainVerified": false,
          "sequenceAtomic": false
        },
        {
          "stage": "case",
          "caseId": "small-success-baseline-official-1732_approval_row_revision",
          "passed": true
        },
        {
          "stage": "case",
          "caseId": "small-success-baseline-replay-1732_approval_row_revision",
          "passed": true
        },
        {
          "stage": "case",
          "caseId": "small-success-baseline-official-1733_approval_task_artifact",
          "passed": true
        },
        {
          "stage": "case",
          "caseId": "small-success-baseline-legacy-five-null-preserved",
          "passed": true
        },
        {
          "stage": "case",
          "caseId": "small-success-baseline-replay-1733_approval_task_artifact",
          "passed": true
        },
        {
          "stage": "case",
          "caseId": "official-whole-1734",
          "passed": true
        },
        {
          "stage": "case",
          "caseId": "official-1734-replay-singleton",
          "passed": true
        },
        {
          "stage": "case",
          "caseId": "catalog-refuses-weak-check",
          "passed": true
        },
        {
          "stage": "case",
          "caseId": "catalog-refuses-timestamp-precision",
          "passed": true
        },
        {
          "stage": "case",
          "caseId": "catalog-refuses-digest-collation",
          "passed": true
        },
        {
          "stage": "case",
          "caseId": "catalog-refuses-function-volatility",
          "passed": true
        },
        {
          "stage": "case",
          "caseId": "catalog-refuses-function-source",
          "passed": true
        },
        {
          "stage": "case",
          "caseId": "catalog-refuses-not-enforced",
          "passed": false,
          "failure": "PROOF_ASSERTION_FAILED"
        },
        {
          "stage": "case",
          "caseId": "catalog-refuses-index-columns",
          "passed": true
        },
        {
          "stage": "case",
          "caseId": "catalog-refuses-index-null-semantics",
          "passed": true
        },
        {
          "stage": "case",
          "caseId": "binding-refuses-partial",
          "passed": true,
          "expectedSqlstate": "23514",
          "actualSqlstate": "23514"
        },
        {
          "stage": "case",
          "caseId": "binding-refuses-array",
          "passed": true,
          "expectedSqlstate": "23514",
          "actualSqlstate": "23514"
        },
        {
          "stage": "case",
          "caseId": "binding-refuses-json-null",
          "passed": true,
          "expectedSqlstate": "23514",
          "actualSqlstate": "23514"
        },
        {
          "stage": "case",
          "caseId": "binding-refuses-missing-shape",
          "passed": true,
          "expectedSqlstate": "23514",
          "actualSqlstate": "23514"
        },
        {
          "stage": "case",
          "caseId": "binding-refuses-identity",
          "passed": true,
          "expectedSqlstate": "23514",
          "actualSqlstate": "23514"
        },
        {
          "stage": "case",
          "caseId": "binding-refuses-version-zero",
          "passed": true,
          "expectedSqlstate": "23514",
          "actualSqlstate": "23514"
        },
        {
          "stage": "case",
          "caseId": "binding-refuses-snapshot-project",
          "passed": true,
          "expectedSqlstate": "23514",
          "actualSqlstate": "23514"
        },
        {
          "stage": "case",
          "caseId": "binding-refuses-snapshot-version",
          "passed": true,
          "expectedSqlstate": "23514",
          "actualSqlstate": "23514"
        },
        {
          "stage": "case",
          "caseId": "binding-refuses-snapshot-id",
          "passed": true,
          "expectedSqlstate": "23514",
          "actualSqlstate": "23514"
        },
        {
          "stage": "case",
          "caseId": "binding-refuses-non-task",
          "passed": true,
          "expectedSqlstate": "23514",
          "actualSqlstate": "23514"
        },
        {
          "stage": "case",
          "caseId": "binding-refuses-version-negative",
          "passed": true,
          "expectedSqlstate": "23514",
          "actualSqlstate": "23514"
        },
        {
          "stage": "case",
          "caseId": "binding-refuses-version-overflow",
          "passed": true,
          "expectedSqlstate": "22003",
          "actualSqlstate": "22003"
        },
        {
          "stage": "case",
          "caseId": "binding-refuses-digest",
          "passed": true,
          "expectedSqlstate": "23514",
          "actualSqlstate": "23514"
        },
        {
          "stage": "case",
          "caseId": "binding-refuses-size",
          "passed": true,
          "expectedSqlstate": "23514",
          "actualSqlstate": "23514"
        },
        {
          "stage": "case",
          "caseId": "binding-refuses-unicode-byte-size",
          "passed": true,
          "expectedSqlstate": "23514",
          "actualSqlstate": "23514"
        },
        {
          "stage": "case",
          "caseId": "binding-refuses-foreign-ticket",
          "passed": true,
          "expectedSqlstate": "23503",
          "actualSqlstate": "23503"
        },
        {
          "stage": "case",
          "caseId": "binding-refuses-missing-ticket",
          "passed": true,
          "expectedSqlstate": "23503",
          "actualSqlstate": "23503"
        },
        {
          "stage": "case",
          "caseId": "canonical-jsonb-byte-boundary",
          "passed": true
        },
        {
          "stage": "case",
          "caseId": "minimal-format-forgery-is-sql-allowed",
          "passed": true
        },
        {
          "stage": "case",
          "caseId": "same-org-wrong-project-is-sql-allowed",
          "passed": true
        },
        {
          "stage": "case",
          "caseId": "immutable-org_id",
          "passed": true,
          "expectedSqlstate": "23514",
          "actualSqlstate": "23514",
          "expectedReason": "APPROVAL_ARTIFACT_BINDING_IMMUTABLE",
          "actualReason": "APPROVAL_ARTIFACT_BINDING_IMMUTABLE"
        },
        {
          "stage": "case",
          "caseId": "immutable-project_id",
          "passed": true,
          "expectedSqlstate": "23514",
          "actualSqlstate": "23514",
          "expectedReason": "APPROVAL_ARTIFACT_BINDING_IMMUTABLE",
          "actualReason": "APPROVAL_ARTIFACT_BINDING_IMMUTABLE"
        },
        {
          "stage": "case",
          "caseId": "immutable-entity_type",
          "passed": true,
          "expectedSqlstate": "23514",
          "actualSqlstate": "23514",
          "expectedReason": "APPROVAL_ARTIFACT_BINDING_IMMUTABLE",
          "actualReason": "APPROVAL_ARTIFACT_BINDING_IMMUTABLE"
        },
        {
          "stage": "case",
          "caseId": "immutable-entity_id",
          "passed": true,
          "expectedSqlstate": "23514",
          "actualSqlstate": "23514",
          "expectedReason": "APPROVAL_ARTIFACT_BINDING_IMMUTABLE",
          "actualReason": "APPROVAL_ARTIFACT_BINDING_IMMUTABLE"
        },
        {
          "stage": "case",
          "caseId": "immutable-artifact_ticket_id",
          "passed": true,
          "expectedSqlstate": "23514",
          "actualSqlstate": "23514",
          "expectedReason": "APPROVAL_ARTIFACT_BINDING_IMMUTABLE",
          "actualReason": "APPROVAL_ARTIFACT_BINDING_IMMUTABLE"
        },
        {
          "stage": "case",
          "caseId": "immutable-artifact_version",
          "passed": true,
          "expectedSqlstate": "23514",
          "actualSqlstate": "23514",
          "expectedReason": "APPROVAL_ARTIFACT_BINDING_IMMUTABLE",
          "actualReason": "APPROVAL_ARTIFACT_BINDING_IMMUTABLE"
        },
        {
          "stage": "case",
          "caseId": "immutable-artifact_snapshot",
          "passed": true,
          "expectedSqlstate": "23514",
          "actualSqlstate": "23514",
          "expectedReason": "APPROVAL_ARTIFACT_BINDING_IMMUTABLE",
          "actualReason": "APPROVAL_ARTIFACT_BINDING_IMMUTABLE"
        },
        {
          "stage": "case",
          "caseId": "immutable-artifact_digest",
          "passed": true,
          "expectedSqlstate": "23514",
          "actualSqlstate": "23514",
          "expectedReason": "APPROVAL_ARTIFACT_BINDING_IMMUTABLE",
          "actualReason": "APPROVAL_ARTIFACT_BINDING_IMMUTABLE"
        },
        {
          "stage": "case",
          "caseId": "immutable-artifact_captured_at",
          "passed": true,
          "expectedSqlstate": "23514",
          "actualSqlstate": "23514",
          "expectedReason": "APPROVAL_ARTIFACT_BINDING_IMMUTABLE",
          "actualReason": "APPROVAL_ARTIFACT_BINDING_IMMUTABLE"
        },
        {
          "stage": "case",
          "caseId": "legacy-null-to-bound-refused",
          "passed": true,
          "expectedSqlstate": "23514",
          "actualSqlstate": "23514",
          "expectedReason": "APPROVAL_ARTIFACT_BINDING_IMMUTABLE",
          "actualReason": "APPROVAL_ARTIFACT_BINDING_IMMUTABLE"
        },
        {
          "stage": "case",
          "caseId": "status-assignee-mutable-binding-preserved",
          "passed": true
        },
        {
          "stage": "case",
          "caseId": "pending-unique-requested",
          "passed": true,
          "expectedSqlstate": "23505",
          "actualSqlstate": "23505"
        },
        {
          "stage": "case",
          "caseId": "pending-unique-pending",
          "passed": true,
          "expectedSqlstate": "23505",
          "actualSqlstate": "23505"
        },
        {
          "stage": "case",
          "caseId": "pending-unique-escalated",
          "passed": true,
          "expectedSqlstate": "23505",
          "actualSqlstate": "23505"
        },
        {
          "stage": "case",
          "caseId": "pending-unique-changes_requested",
          "passed": true,
          "expectedSqlstate": "23505",
          "actualSqlstate": "23505"
        },
        {
          "stage": "case",
          "caseId": "unique-control-0-{\"version\":4}",
          "passed": true
        },
        {
          "stage": "case",
          "caseId": "unique-control-1-{\"approver\":2}",
          "passed": true
        },
        {
          "stage": "case",
          "caseId": "unique-control-2-{\"status\":\"approved\"}",
          "passed": true
        },
        {
          "stage": "case",
          "caseId": "unique-control-3-{\"status\":\"rejected\"}",
          "passed": true
        },
        {
          "stage": "case",
          "caseId": "unique-control-4-{\"status\":\"cancelled\"}",
          "passed": true
        },
        {
          "stage": "case",
          "caseId": "unique-control-5-{\"deleted\":\"2026-10-04T00:00:00Z\"}",
          "passed": true
        },
        {
          "stage": "case",
          "caseId": "unique-control-6-{\"approver\":null}",
          "passed": true
        },
        {
          "stage": "case",
          "caseId": "unique-control-7-{\"approver\":null}",
          "passed": true
        },
        {
          "stage": "case",
          "caseId": "bound-ticket-hard-delete-refused",
          "passed": false,
          "expectedSqlstate": "23503",
          "actualSqlstate": "23001"
        },
        {
          "stage": "physical-insert-blocker",
          "blockerObserved": true,
          "holderExpired": false
        },
        {
          "stage": "case",
          "caseId": "physical-same-tuple-insert-one-winner",
          "passed": true
        },
        {
          "stage": "case",
          "caseId": "transactional-audit-failure",
          "passed": true,
          "expectedSqlstate": "23502",
          "actualSqlstate": "23502"
        },
        {
          "stage": "case",
          "caseId": "audit-and-binding-rolled-back",
          "passed": true
        },
        {
          "stage": "case",
          "caseId": "rollback-rollback/1733_approval_task_artifact.down",
          "passed": true,
          "expectedSqlstate": "P0001",
          "actualSqlstate": "P0001",
          "expectedReason": "APPROVAL_ARTIFACT_ROLLBACK_REQUIRES_REVIEW",
          "actualReason": "APPROVAL_ARTIFACT_ROLLBACK_REQUIRES_REVIEW"
        },
        {
          "stage": "case",
          "caseId": "rollback-rollback/1734_approval_task_pending_index.down",
          "passed": true,
          "expectedSqlstate": "P0001",
          "actualSqlstate": "P0001",
          "expectedReason": "APPROVAL_ARTIFACT_INDEX_ROLLBACK_REQUIRES_REVIEW",
          "actualReason": "APPROVAL_ARTIFACT_INDEX_ROLLBACK_REQUIRES_REVIEW"
        },
        {
          "stage": "case",
          "caseId": "rollback-catalog-data-ledgers-unchanged",
          "passed": true
        },
        {
          "stage": "case",
          "caseId": "foreign-tenant-write-zero",
          "passed": true
        },
        {
          "stage": "case",
          "caseId": "foreign-tenant-insert-denied",
          "passed": true,
          "expectedSqlstate": "42501",
          "actualSqlstate": "42501"
        },
        {
          "stage": "case",
          "caseId": "missing-tenant-denied",
          "passed": true,
          "expectedSqlstate": "42501",
          "actualSqlstate": "42501"
        },
        {
          "stage": "case",
          "caseId": "app-binding-trigger-disable-denied",
          "passed": true,
          "expectedSqlstate": "42501",
          "actualSqlstate": "42501"
        },
        {
          "stage": "case",
          "caseId": "exact-admin-row-identities",
          "passed": true
        },
        {
          "stage": "case",
          "caseId": "app-a-read-only-markers",
          "passed": true
        },
        {
          "stage": "read-only-tenant-receipt",
          "tenant": "a",
          "verified": true,
          "role": "streamline_app",
          "mode": "on",
          "markers": [
            {
              "id": 1,
              "org_id": "synthetic-approval-proof-org-a",
              "revision": "1",
              "artifact_ticket_id": null,
              "artifact_version": null,
              "artifact_digest": null,
              "snapshot_digest": null,
              "captured": null,
              "unbound": true
            },
            {
              "id": 3,
              "org_id": "synthetic-approval-proof-org-a",
              "revision": "2",
              "artifact_ticket_id": 1,
              "artifact_version": 1,
              "artifact_digest": "08e1cdbe2374bc5e943117aae5ebd6595e838c4d4dae3e8f57a477a7432addf5",
              "snapshot_digest": "055692316b365c9c8660f8eecbc25bcc",
              "captured": "2026-10-04 00:00:00.123",
              "unbound": false
            },
            {
              "id": 20,
              "org_id": "synthetic-approval-proof-org-a",
              "revision": "1",
              "artifact_ticket_id": 1,
              "artifact_version": 2,
              "artifact_digest": "85ab1468fec5ebbcabb352f6ca6b27a3355301deca5c893477e58c554917c2ba",
              "snapshot_digest": "5f03be12d4ef93b0a4b4af9bce4c080f",
              "captured": "2026-10-04 00:00:00.123",
              "unbound": false
            },
            {
              "id": 21,
              "org_id": "synthetic-approval-proof-org-a",
              "revision": "1",
              "artifact_ticket_id": 1,
              "artifact_version": 3,
              "artifact_digest": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
              "snapshot_digest": "84bc5505f96de5382703acf9d6718df6",
              "captured": "2026-10-04 00:00:00.123",
              "unbound": false
            },
            {
              "id": 22,
              "org_id": "synthetic-approval-proof-org-a",
              "revision": "1",
              "artifact_ticket_id": 4,
              "artifact_version": 1,
              "artifact_digest": "73b6941f38480f5579e061d39673a1f3e15b1176b2d78bedfb74c9c2348de201",
              "snapshot_digest": "c6b934ce2cdd23f04da0c4025b97ff86",
              "captured": "2026-10-04 00:00:00.123",
              "unbound": false
            },
            {
              "id": 23,
              "org_id": "synthetic-approval-proof-org-a",
              "revision": "1",
              "artifact_ticket_id": 1,
              "artifact_version": 1,
              "artifact_digest": "08e1cdbe2374bc5e943117aae5ebd6595e838c4d4dae3e8f57a477a7432addf5",
              "snapshot_digest": "055692316b365c9c8660f8eecbc25bcc",
              "captured": "2026-10-04 00:00:00.123",
              "unbound": false
            },
            {
              "id": 28,
              "org_id": "synthetic-approval-proof-org-a",
              "revision": "1",
              "artifact_ticket_id": 1,
              "artifact_version": 4,
              "artifact_digest": "d372978532e721a664f7324f20d486dc03aa6a1800c9d424ae407c2170dec10b",
              "snapshot_digest": "7785eb84e3f956bf4533b3a82ff11506",
              "captured": "2026-10-04 00:00:00.123",
              "unbound": false
            },
            {
              "id": 29,
              "org_id": "synthetic-approval-proof-org-a",
              "revision": "1",
              "artifact_ticket_id": 1,
              "artifact_version": 1,
              "artifact_digest": "08e1cdbe2374bc5e943117aae5ebd6595e838c4d4dae3e8f57a477a7432addf5",
              "snapshot_digest": "055692316b365c9c8660f8eecbc25bcc",
              "captured": "2026-10-04 00:00:00.123",
              "unbound": false
            },
            {
              "id": 30,
              "org_id": "synthetic-approval-proof-org-a",
              "revision": "1",
              "artifact_ticket_id": 1,
              "artifact_version": 1,
              "artifact_digest": "08e1cdbe2374bc5e943117aae5ebd6595e838c4d4dae3e8f57a477a7432addf5",
              "snapshot_digest": "055692316b365c9c8660f8eecbc25bcc",
              "captured": "2026-10-04 00:00:00.123",
              "unbound": false
            },
            {
              "id": 31,
              "org_id": "synthetic-approval-proof-org-a",
              "revision": "1",
              "artifact_ticket_id": 1,
              "artifact_version": 1,
              "artifact_digest": "08e1cdbe2374bc5e943117aae5ebd6595e838c4d4dae3e8f57a477a7432addf5",
              "snapshot_digest": "055692316b365c9c8660f8eecbc25bcc",
              "captured": "2026-10-04 00:00:00.123",
              "unbound": false
            },
            {
              "id": 32,
              "org_id": "synthetic-approval-proof-org-a",
              "revision": "1",
              "artifact_ticket_id": 1,
              "artifact_version": 1,
              "artifact_digest": "08e1cdbe2374bc5e943117aae5ebd6595e838c4d4dae3e8f57a477a7432addf5",
              "snapshot_digest": "055692316b365c9c8660f8eecbc25bcc",
              "captured": "2026-10-04 00:00:00.123",
              "unbound": false
            },
            {
              "id": 33,
              "org_id": "synthetic-approval-proof-org-a",
              "revision": "1",
              "artifact_ticket_id": 1,
              "artifact_version": 1,
              "artifact_digest": "08e1cdbe2374bc5e943117aae5ebd6595e838c4d4dae3e8f57a477a7432addf5",
              "snapshot_digest": "055692316b365c9c8660f8eecbc25bcc",
              "captured": "2026-10-04 00:00:00.123",
              "unbound": false
            },
            {
              "id": 34,
              "org_id": "synthetic-approval-proof-org-a",
              "revision": "1",
              "artifact_ticket_id": 1,
              "artifact_version": 1,
              "artifact_digest": "08e1cdbe2374bc5e943117aae5ebd6595e838c4d4dae3e8f57a477a7432addf5",
              "snapshot_digest": "055692316b365c9c8660f8eecbc25bcc",
              "captured": "2026-10-04 00:00:00.123",
              "unbound": false
            },
            {
              "id": 35,
              "org_id": "synthetic-approval-proof-org-a",
              "revision": "1",
              "artifact_ticket_id": 1,
              "artifact_version": 1,
              "artifact_digest": "08e1cdbe2374bc5e943117aae5ebd6595e838c4d4dae3e8f57a477a7432addf5",
              "snapshot_digest": "055692316b365c9c8660f8eecbc25bcc",
              "captured": "2026-10-04 00:00:00.123",
              "unbound": false
            },
            {
              "id": 36,
              "org_id": "synthetic-approval-proof-org-a",
              "revision": "1",
              "artifact_ticket_id": 3,
              "artifact_version": 1,
              "artifact_digest": "d3cd16d2e3c968bef5a2f31d1a234f86be48df5e8874db6105f47e842a6b9201",
              "snapshot_digest": "4e43e028c8ecbd4328ca79114444ccff",
              "captured": "2026-10-04 00:00:00.123",
              "unbound": false
            }
          ]
        },
        {
          "stage": "case",
          "caseId": "app-b-read-only-markers",
          "passed": true
        },
        {
          "stage": "read-only-tenant-receipt",
          "tenant": "b",
          "verified": true,
          "role": "streamline_app",
          "mode": "on",
          "markers": [
            {
              "id": 2,
              "org_id": "synthetic-approval-proof-org-b",
              "revision": "1",
              "artifact_ticket_id": null,
              "artifact_version": null,
              "artifact_digest": null,
              "snapshot_digest": null,
              "captured": null,
              "unbound": true
            }
          ]
        },
        {
          "stage": "admin-select-receipt",
          "data": {
            "digest": "11f51626c8127dc5db6e9dd2932b8604",
            "rows": 16
          },
          "catalog": "3b4a37f8abd88dcc28e791267632837a",
          "ledgers": [
            1,
            1,
            1
          ],
          "sqlOnly": true,
          "deployedRlsVerified": false,
          "applicationRuntimeVerified": false,
          "wholeChainVerified": false
        },
        {
          "stage": "case",
          "caseId": "final-exact-catalog",
          "passed": true
        },
        {
          "stage": "results",
          "checks": 89,
          "failed": 2,
          "wholeChainVerified": false,
          "applicationRuntimeVerified": false
        },
        {
          "stage": "cleanup",
          "droppedCurrentRunDatabase": true
        }
      ],
      "sourceHashes": {
        "backend/src/scripts/approval-revision-migration-proof.mjs": "c22503ca655233156589995c84cf71fcbce9b9bb3d69e5d629df00596c2d247e",
        "backend/src/scripts/lib/approval-revision-proof-baseline.mjs": "0db4e8e0c233c3755f8700f1df8a0f1d7ca78ac321bfd59d9d6724fef97d5543",
        "backend/src/scripts/lib/approval-revision-proof-cases.mjs": "f39279b84deb6914c236be1d7f305f305d860beed1e8c0ab67f8f024d106ead7",
        "backend/src/scripts/lib/approval-artifact-proof-catalog.mjs": "62c68b2d324a4b53e9e3caf0907f91af8e4618e4c742d969d0542c08d55b2853",
        "backend/src/scripts/lib/approval-artifact-proof-cases.mjs": "9129859a0a279e31b2bc5dfb504f191de18c136609bc6e1ba392265ce4b6f1e7",
        "backend/src/scripts/__tests__/approval-artifact-migration-proof.test.mjs": "5a44666b9dad1eadeecc056856edfc47985070f4586b817cc592fe3240199882"
      },
      "independentReadOnlyCleanup": {
        "role": "streamline_app",
        "read_only": "on",
        "scratch_database_count": 0,
        "scratch_session_count": 0,
        "database": "scratch_build_migration_c531da14f7a30ad2e1c40a11",
        "observedAt": "2026-10-04T02:39:07.325Z"
      }
    }
  ],
  "thirdPlan": {
    "database": "scratch_build_migration_f8e47ebe465a33f58c6ef1f1",
    "exit": 0,
    "execute": false,
    "sqlPinsUnchanged": true,
    "started": false
  },
  "limitations": {
    "applicationRuntimeVerified": false,
    "deployedRlsVerified": false,
    "wholeChainVerified": false,
    "browserVerified": false,
    "mobileVerified": false,
    "deploymentVerified": false,
    "operationsVerified": false,
    "fullTaskStagesClosed": false,
    "todoCheckboxChanged": false
  },
  "counts": {
    "total": 522,
    "checked": 110,
    "open": 412
  }
}
```

## Ticket scalar approval artifact source — 2026-10-04

Selected requirement: BT-27a037364398; supporting BT-801e948e8a67. [Exclusive claim47](../implementation/WORK-CLAIMS.md#bt-27a037364398--ticket-scalar-artifact-binding-47) was committed at210bb1e88; migration runner correction at7e727dd61. Source is committed at backend `ed55a897d` (28 changed paths) and frontend `a4bc33699` (12 changed paths). Classification: Current verified for the exact source, focused gates, independent reviews and read-only observation below; Current unverified for full application/RBAC/persistence/browser/release behavior. No broad task or D/I/T/R/B/L stage advances.

### Adopted behavior and review corrections

- New task requests strictly require expectedArtifactVersion. The server captures14 bounded Ticket scalar fields under the canonical Ticket lock, refuses more than131072 UTF-8 bytes of PostgreSQL JSONB text without truncation, and hashes that same canonical text. Approval row revision stays separate from Ticket artifact version. Seven other entity families keep their existing unbound behavior; their immutable-artifact acceptance remains open.
- GET detail alone exposes current/stale snapshot receipts after current canonical Ticket authorization; restricted/unavailable/unbound contains state only. Lists, mutation responses, counts and requested events remain metadata-only. Legacy unbound tasks can be read/cancelled/deleted, but cannot be decided. Private stored-binding validation checks schema/identity/version/hash; no client snapshot or authority is accepted.
- Decision locks Ticket then approval, rechecks current approval authority/revision/immutable binding and current Ticket access after both waits, and compares the current Ticket version before CAS/critical audit. Creation checks the request key before work and rechecks request authority/project write policy after its Ticket-lock wait. Approver ACTIVE resolution after that wait is separately open; no recipient membership lock was added.
- UI captures an explicit selected version and retains it across background refresh;409 retains input and requires explicit reselection/review. Latest authorized state/digest/version fences captured content and submission, including fresh200 restricted/unavailable responses. Mutation metadata cannot hydrate GET detail. Reuse existing components, neutral selected styling and SanitizedHtml; captured descriptions use a bounded semantic HTML allowlist removing SVG/CSS/media resource constructs while retaining safe formatting/explicit links.
- Meaningful initial REDs: assigned task decision without canonical Ticket read1; fresh200 content/selected-version UI11; later approval-lock scope revocation1; creation project archive/request-key loss2; actual shared sanitizer SVG/CSS regression1. Each was reproduced before its domain correction. These are model/jsdom evidence, not physical PostgreSQL or browser proof.

### Gates, contracts and failed checks

Final backend C gates:11 suites/192 tests, exact12 source and13 test lint, diff checks. Coordinator final frontend run:11 suites/203 tests; exact11 lint/diff pass. Both final scoped TypeScript configurations (backend32/frontend29 includes,8GB) and both production TypeScript gates pass. Initial owned literal/generated-union typing errors were repaired; the default4GB scoped backend attempt exhausted heap before the8GB pass. C independently reviews production/SQL/generated/UI; A independently reviews the final UI, including the sanitizer and named-handler fixes; coordinator reviews backend test preservation/integration and verifies all44 frozen file hashes and44 outer/47 backend unrelated dirty-file hashes. No authored source comment or live Ticket comment was added.

Official generators alone produced OpenAPI SHA `54cfc6e2bc1a7ba5a8f30b055aeffa7ba814038500637da40bab0bbe6fc60a82`:4107 operations/exposure stamps,4092 Zod contracts,0 unconvertible findings. Only POST `/build/{projectId}/approvals` requestBody and GET `/build/{projectId}/approvals/{approvalId}` response change. Task version is required in its strict branch; other7 branches forbid it. Mandatory headers/keys/bodies remain authoritative. OpenAPI self-test and source freshness,6 vendor self-tests plus byte parity,93 Build self-tests plus fresh390-schema/311-operation generation checks pass. No generated file was edited by hand.

Full gate failures remain explicit: fresh backend test TypeScript10GB exhausts heap (child134/pnpm1); fresh frontend full specs fail24 diagnostics in six unowned Calendar/Chat/Wiki/KB/Mail paths. The initial controller-E2E invocation used the unit config and found no tests; the corrected official test:e2e command is refused by the disposable-database guard before0 tests. No guard or baseline is widened. Existing React act warning at approvals.ts123 and Edge Runtime type-generation warning remain; no clean-console or browser claim. Migration discipline36/rollback9 self-tests pass; real discipline initially includes1734 CONCURRENTLY, then reports15 existing findings after correction; real rollback reports13 existing findings, with no1733/1734 finding. Unchanged guarded revision/organization/portal proof tests pass86; that rerun executes no PostgreSQL artifact proof.

Exact commands: `pnpm -C backend exec jest --runInBand --runTestsByPath` with the eleven claimed specs excluding the fixture/controller E2E; `pnpm -C frontend exec jest --runInBand --runTestsByPath` with the eleven approval/form/hook suites. Exact claimed ESLint paths; `node --max-old-space-size=8192 ./node_modules/typescript/bin/tsc --noEmit -p .scratch/tsconfig-approval-43.json` in each package; `pnpm -C backend typecheck` and `pnpm -C backend typecheck:test`; `pnpm -C frontend type-check` and `pnpm -C frontend type-check:specs`; `pnpm -C backend openapi:generate` and `pnpm -C backend openapi:check`; `pnpm -C frontend generate:build-contracts`, `pnpm -C frontend check:build-contracts` and `pnpm -C frontend check:contract-vendor`, with the named self-tests. Official controller command: `pnpm -C backend test:e2e --runInBand --runTestsByPath src/modules/build/approvals/approvals.controller.e2e-spec.ts`.

### SQL and runtime boundary

Draft1733 adds five nullable binding fields, all-or-none/identity/version/size/digest-format checks, tenant Ticket FK and immutable identity/binding trigger. SQL does not prove actual content hash provenance, all14 scalar validation, current Ticket project/read authority or approver liveness; canonical API owners enforce their own source boundaries. Draft1734 creates two regular indexes transactionally under5s SHARE lock/statement limits and refuses a measured heap above1048576 bytes with APPROVAL_ARTIFACT_INDEX_REQUIRES_ONLINE_PREPARATION. Conditional large-target online preparation is a separately reviewed operator package. Both down scripts refuse destructive rollback with exact controlled reasons; rollback/recovery remains open. Earlier concurrent construction is explicitly superseded because the standard migrator wraps transactions.

Application-role READ ONLY observation below proves revision and all five artifact columns absent and0 approvals in reserved project54. No application approval write/DDL, artifact scratch execution, browser/mobile or deployed operation occurs in47. Application1732/1733/1734 and Portal1730/1731 remain unapplied. Matching local frontend1002 authorization remains pending; deployed-API frontend1000 is read-only and the prior runner cannot prove47. Earlier proof45 SQL cases remain separate. Planned follow-up: reviewed opt-in guarded1733/1734 scratch proof, actual service/role/PAT/tenant/recipient-liveness/physical lock/cache/event proof, queue/sheet/filter/history/mobile acceptance, seven other artifact owners and deployment/operations.

### Sanitized source and gate receipt

The following JSON is retained once in this existing audit file. SHA-256 of its exact JSON payload: `d58f53d8f52a2e4d3774ea3c6d97b2c03dba8fb2a53406be33a921ecec3907f2`. Source hashes describe working bytes at final freeze, not physical runtime proof.

```json
{
  "package": 47,
  "task": "BT-27a037364398",
  "supports": "BT-801e948e8a67",
  "classification": "Current verified for bounded source and named gates; Current unverified for complete runtime and release",
  "backendRevision": "ed55a897d8668f5adfd99136e3e3b05891285254",
  "frontendRevision": "a4bc33699345f912c449d2406115f8a09b309e6b",
  "sourceHashes": {
    "backend/src/db/schema/build/approvals.ts": "a7210594e4c9c2984a7e487b502165140575de139f867e00ac001d1a483bca98",
    "backend/src/modules/build/core/tickets/projects-tickets-detail.service.ts": "8dfdeee6383f0ee6caaad2002b9cc5744a45b3d40808017cd135ce15f6b88545",
    "backend/src/modules/build/core/dto/ticket.schemas.ts": "0e6f8b88c2a35ca2f15b779fcc16ca8e1ff20978454e3ba264e6fbeb5f2b7087",
    "backend/src/modules/build/core/projects.module.ts": "26dc0a50dd2d96a8b54291e13aed4941bf14b851e56c41a91139f736088bcfab",
    "backend/src/modules/build/approvals/build-approvals.module.ts": "7d401b1f4e9c29053e268ace4e6d17844f73f46f8d3770c73d1ddb188b2cc033",
    "backend/src/modules/build/approvals/approvals.service.ts": "6590a7248b4ecc2accf6eef3ba4e63cb9c0c1eb13bfa98d2bd6a483686143bd3",
    "backend/src/modules/build/approvals/approval-lookup.ts": "d879b83cab13f76c3e0f12319bf1a305a3f06b538175155706b5d79353fb217f",
    "backend/src/modules/build/approvals/approvals-read.service.ts": "6242c4a1a5cecb79a40c418b78ecb2ee215ae62c2621f4bfd8e9db1ce2bcdc88",
    "backend/src/modules/build/approvals/core/approval-commands.service.ts": "71aaefb0accffdabe29c411bc646b50bd4c9762c28c317d992874434c2e07c33",
    "backend/src/modules/build/approvals/approvals.controller.ts": "bbb582eb75f3292d8eaa5e0ccd9e926445f007725c52cf0fa97d88986828589b",
    "backend/src/modules/build/approvals/dto/approvals.schemas.ts": "e329f53efbf9a3898d152886a109191700f21402998b1838e8dda90749b03bec",
    "backend/src/modules/build/approvals/dto/approvals-response.schemas.ts": "4fdb6e9b01f3b873ecf0bbcbfef1f228062280956598195796446d10644c1b4e",
    "backend/src/modules/build/approvals/__tests__/approval-task-artifact.spec.ts": "233d1dd3e6cd8b70fbe9807d4bb194b87462b814af65e81158a2a9b5f64586c7",
    "backend/src/modules/build/core/tickets/projects-tickets-detail-revocation.spec.ts": "32a2b333d1b57fff87090f69d09737d4f9a63d1f14cdc35157e25b781bf3ce08",
    "backend/src/modules/build/approvals/__tests__/approval-lifecycle-concurrency.fixture.ts": "ad3e34627beddac5b30b868577be4c5faab7bc70fe40492e2ecb3a1c00eb603e",
    "backend/src/modules/build/approvals/__tests__/approval-lifecycle-concurrency.spec.ts": "d22e305777eb67ef401e7678bed32ff6edc2e04fd860bdaf2cc5658b713ac591",
    "backend/src/modules/build/approvals/__tests__/approval-lifecycle-schema.spec.ts": "65cd4f825a459afae8ca8a6e4262c24cca0299cb9ac17a7af6deb35265ba4a8b",
    "backend/src/modules/build/approvals/__tests__/approval-detail-access.spec.ts": "a8f0307cd2f717fed25304ee56d4f610f1875068b1e8c008b8a55cbc2b75808a",
    "backend/src/modules/build/approvals/approvals.service.spec.ts": "9559c62f158f5e5e00d2dba8cf3a1ca898ac7650dec0deb6e1b5f37f37b7458f",
    "backend/src/modules/build/approvals/approvals-by-id-project-access.spec.ts": "cae5067b10950a4583d20daaa9eb78a5514847768c90bfbc086e6fc6b9425745",
    "backend/src/modules/build/approvals/approvals.controller.e2e-spec.ts": "9c12a31d89a9847664a3a4a992d6e36855b471cc95b821f7b30c9bcff14af63d",
    "backend/src/modules/build/approvals/approvals-read-tenant-isolation.spec.ts": "396bb55e0d6462af44b9e8e6186bf1e2d6263c91900e3edee1b92add3ff98e76",
    "backend/src/modules/build/approvals/build-approval-requested-emit.spec.ts": "a9d70c1d4a8ed1007a062d6e9e977b07e5b171fa83b0d016469a488aa4d0af3e",
    "backend/src/modules/build/approvals/approvals-approver-filter.spec.ts": "aa01480dc836018662f7bd09681d23ce4638a0a1954f82267df05ba7fa1c8dba",
    "backend/src/modules/build/approvals/build-inbox-count.spec.ts": "dc5f678c32ebd6b1d61012c43d2b2878002b2fd8c4cf136eaa2bc246aba9b238",
    "backend/migrations/1733_approval_task_artifact.sql": "4a00fa99d3aeaba44b111308063b5fcfd013f6c1dbd753c328e2abe171951e14",
    "backend/migrations/rollback/1733_approval_task_artifact.down.sql": "dcb64da39743705b828d268157dd24e9cffe85f07937459149033b0fd917c7d2",
    "backend/migrations/1734_approval_task_pending_index.sql": "34a1ab0934186c5c4c0a67e67d17fa79ba3f632bd3c0ad703e3eee42d007a10d",
    "backend/migrations/rollback/1734_approval_task_pending_index.down.sql": "b34fa003d474f1bf176b33ef0abda9c3e423052a7f74c55d070039a9b7d021f2",
    "backend/migrations/meta/_journal.json": "3a96eb0934a3475c42c6d50270df5fd61949e2b93dd43fedcdeebdcdbb0bea05",
    "backend/openapi.json": "54cfc6e2bc1a7ba5a8f30b055aeffa7ba814038500637da40bab0bbe6fc60a82",
    "frontend/types/projects/approvals.ts": "ca9b428a71c57e80dfb60602a005e15e55f1a05d331f2eb700db0a54f3bf15e0",
    "frontend/hooks/api/build/approvals.ts": "d3f90f34c4f37a5818027a4b0df449df4e3cab28d9690c90c2ea98fb46231570",
    "frontend/hooks/api/build/approvals-schema.ts": "c9f317788f83652d00031b20d2fa0a14ecb8c76990fe02aa0f7e6b3f80f5a9db",
    "frontend/features/build/approvals/request-approval-sheet.tsx": "0c644f053aada7fc50f2bd02d36b7a63424d52c66937658a055fced845b479a3",
    "frontend/features/build/approvals/decide-dialog.tsx": "f63ab58c8bf96543d5f6e323c2e264e61973612649ba652a3265060f6b48a1e5",
    "frontend/features/build/approvals/project-approvals-page.tsx": "31e70e811804093036119fab63a5849776e49f478173473bded80efca4b49030",
    "frontend/features/build/approvals/request-approval-sheet.test.tsx": "83276d3131eb2682859380ef8a3d1adc7321b515858d4d6ef70cbc4352b04943",
    "frontend/features/build/approvals/decide-dialog.pending-close.test.tsx": "cf81073e36b206e61378ba31629775ba10f3cffd611e6568a27d2be221e57013",
    "frontend/features/build/approvals/__tests__/approval-decision-conflict.spec.tsx": "711ffb19ef04d243205d476f3a5e541d3577ba99d05631a571e213f9104dc27b",
    "frontend/hooks/api/build/__tests__/approval-revision-mutations.spec.tsx": "0482e0e4a07e7e4d62bb09ee0e047a12ac14a6f57b7cc4458100bbee7df5b77d",
    "frontend/features/build/approvals/__tests__/approval-ticket-artifact-request.spec.tsx": "bb59a2a8e33f8350cb007c4f7e99e8df193a2f71a8b6959d5db846f3f0461a74",
    "frontend/contracts/openapi.json": "54cfc6e2bc1a7ba5a8f30b055aeffa7ba814038500637da40bab0bbe6fc60a82",
    "frontend/contracts/build-contracts.generated.ts": "0b986f732c34fedad9b9ca214bca2628651c0d081ec44dc580a36df6dec5a8fc"
  },
  "focused": {
    "backend": {
      "suites": 11,
      "tests": 192
    },
    "frontend": {
      "suites": 11,
      "tests": 203
    }
  },
  "passedGates": [
    "exact backend12 source and13 test lint",
    "exact frontend11 lint",
    "scoped backend32 paths8GB",
    "scoped frontend29 paths8GB",
    "backend production TypeScript",
    "frontend production TypeScript",
    "official OpenAPI source freshness4107operations4092Zod",
    "byte vendor6 selftests",
    "Build freshness390schemas311operations93 selftests",
    "migration discipline36 selftests",
    "rollback9 selftests",
    "unchanged guarded proof86 safety tests",
    "independent frozen backend/frontend/SQL/generated/test reviews",
    "exact-file staged diff checks",
    "zero added authored source comments"
  ],
  "failedGates": [
    {
      "gate": "initial scoped backend TypeScript",
      "reason": "owned test literal widening; repaired before final8GB pass"
    },
    {
      "gate": "default4GB scoped backend TypeScript",
      "reason": "heap exhaustion; final8GB scoped check passed"
    },
    {
      "gate": "initial scoped frontend TypeScript",
      "reason": "owned generated-union expected-body typing; repaired before final pass"
    },
    {
      "gate": "full backend test TypeScript10GB",
      "reason": "heap exhaustion; child134/pnpm1"
    },
    {
      "gate": "full frontend test TypeScript",
      "reason": "24 diagnostics across six unowned Calendar/Chat/Wiki/KB/Mail paths; tsc2/pnpm1"
    },
    {
      "gate": "migration discipline",
      "reason": "15 existing findings; no1733/1734 finding after compatibility correction"
    },
    {
      "gate": "migration rollback",
      "reason": "13 existing findings; no1733/1734 finding"
    },
    {
      "gate": "unit Jest invocation of controller E2E",
      "reason": "wrong config excludes E2E; no tests found; no proof"
    },
    {
      "gate": "official controller E2E",
      "reason": "disposable-database guard refused before0 tests; no bypass"
    }
  ],
  "warnings": [
    "unchanged React act warning at frontend/hooks/api/build/approvals.ts123",
    "frontend route type generation emits existing Edge Runtime deprecation warning"
  ],
  "readOnlyApplicationReceipt": {
    "role": "streamline_app",
    "read_only": "on",
    "new_column_count": 0,
    "reserved_approval_count": 0,
    "observedAt": "2026-10-04T01:22:00.906Z"
  },
  "applicationWrites": false,
  "applicationMigrationsApplied": false,
  "browserVerified": false,
  "mobileVerified": false,
  "fullStagesAdvanced": false,
  "tracker": {
    "total": 522,
    "checked": 110,
    "open": 412
  },
  "remaining": [
    "actual1733/1734 scratch proof",
    "application1732/1733/1734 readiness/application",
    "real service/role/PAT/tenant/currentgrant/recipient-liveness/physical locking/cache/outbox proofs",
    "matching frontend1002 authorization remains pending",
    "full approval sheet/filter/history/mobile acceptance",
    "seven other immutable artifact owners",
    "large-target online index operator preparation",
    "deployment and operations"
  ]
}
```


## Exact approval notification navigation — 2026-10-04

Selected requirements: BT-27a037364398 and BT-801e948e8a67. [Disjoint navigation46 reservation](../implementation/WORK-CLAIMS.md#bt-27a037364398--bt-801e948e8a67--exact-approval-navigation-prerequisite-46), outer `21fdbc51e`, assigns six existing frontend files to B and two backend files to coordinator; C independently reviews both. Backend source is committed at `f5a8532ce`, frontend at `177e48cf3`. All ownership is released after these exact commits. No API, schema, permission key, query key, component, route page, migration or helper is duplicated.

- Genuine backendRED:16 of19 projection/link cases fail before the correction, including actual task/release approval projection pointing at Ticket900 or a queue instead of approval9. Final four suites75 tests pass; canonical strict project/approval int32 params are reused. The producer now passes actual row.id while retaining related Ticket identity as context. Its authorized reader, cursor and response fields stay owned by their existing services.
- Genuine frontendREDs: one outside-loaded-queue record-selection failure, three Unified navigation failures and one fabricated direct-entry queue-revision failure. Coordinator final14 suites158 tests pass. Direct `/build/approvals?projectId=<id>&approvalId=<id>` selects existing fresh authorized detail independently of loaded queue/filter/error state. Single positive int32 URL values are required; incomplete, duplicate, malformed or overflowing selection issues no detail request. Global Build approval cards use exact record identity; other module safe-target behavior remains covered.
- Queue opening uses push with scroll false; close removes approvalId through replace with scroll false and retains all other query parameters/cursor/page. Back/Forward and refresh reconstruct URL selection at the source-test boundary. Existing Dialog owns pending-close/Escape; list keyboard is disabled during review. Radix focus return chooses the connected Decide origin or existing search. Direct entry uses the fresh displayed revision without inventing an earlier queue revision. Existing409 input preservation, explicit Review latest and current-owner fences are retained. This package uses the existing dialog; the complete immutable-artifact decision Sheet remains separate.
- Exact eight-path lint/diff, backend and frontend changed-file TypeScript, and both production TypeScript commands pass. A first backend command invocation accidentally forwarded literal `--` and refused withTS5023 before compilation; corrected canonical `pnpm run typecheck` passes. Frontend `pnpm run type-check` uses official Next route type generation and passes. Full repository test TypeScript is not rerun for this bounded change: the earlier backend10GB exhaustion/frontend23 unowned diagnostics remain failed gates. Focused tests emit an act warning at the unchanged approval hook; console silence is not claimed.
- Existing generated contracts remain authoritative and unchanged; no response contract is changed here. No owned file exceeds500 lines or newly crosses300. C independently verifies all eight frozen hashes and preserved meaningful negatives. Coordinator verifies all44 outer/47 backend unrelated working-byte hashes are unchanged, including the user-modified tracker generator.

| Verification stage for bounded46 | Classification | Exact evidence or remaining gap |
|---|---|---|
| Source implemented | Current verified | Backend `f5a8532ce`; frontend `177e48cf3`; eight exact retained files |
| Focused tests passed | Current verified |75 backend/158 frontend tests after genuine REDs |
| Production typecheck passed | Current verified | Backend `pnpm run typecheck`; frontend `pnpm run type-check`; both scoped gates also pass |
| Database verified | Current unverified | Earlier33 scratch SQL cases prove the revision prerequisite, not this application read/navigation flow; application1732 is absent |
| Role/tenant verified | Current unverified | Source/model controls retained; current matching HTTP/application-role/object matrix still required |
| Browser verified | Current unverified | Matching frontend1002 remains pending following earlier automatic approval rejection of frontend API changes; no route rendering substitutes for actions/refresh/history |
| Deployment verified | Current unverified | Application1732/source parity and deployed policies not verified |
| Operations verified | Current unverified | Durable cache/events, revocation, jobs and recovery not verified |

Remaining scope: immutable artifact snapshot/version/current-version decision fence; all eight artifact owners; complete queue filters/requester/due/version projections, decision Sheet, inline Build Inbox approval action, full mobile/modifier-click/keyboard/browser history and return behavior, matching HTTP authorization/persistence and cache/event/deployment/operational proof. projectId provides selected-record context here; it does not add a server project filter to the organization queue. No full BT checkbox or D/I/T/R/B/L stage is advanced.

## Approval revision PostgreSQL replay — 2026-10-04

Selected requirement: BT-27a037364398; supporting BT-801e948e8a67. [Proof44 and correction45 ownership](../implementation/WORK-CLAIMS.md#bt-27a037364398--focused-postgresql-revision-replay-44) is disjoint from application implementation. Backend proof tool `a5ae00f77` adds four bounded repeatable verification files, reuses the unchanged IAM target guard/SQL client and official pending-migration runner, and pins original source fragments plus whole1732. Coordinator reran86 approval/organization/portal safety tests and exact four-path ESLint/diff; C and coordinator independently verified all four hashes before execution. Model tests cannot prove PostgreSQL behavior.

Current verified chronology:

1. Nonconnecting plan accepted only the derived current-run database. Execution began at `2026-10-03T23:35:32.486Z` against `scratch_build_migration_e34bee016e71af9de8f82340`. Four actual checks passed: focused prerequisites, revision absent before upgrade, real lock-timeout SQLSTATE55P03 and no migration ledger after that timeout. Whole1732 ran through the official fixed-tag runner, but the post-application catalog oracle refused with `PROOF_APPROVAL_CATALOG_INVALID`; exit1. The guard independently closed owned clients, verified current-run database identity/zero sessions and dropped only that database: cleanupVerified true, manualInspectionRequired false. This is a failed real gate, not a passed migration proof.
2. A second guarded diagnostic used `scratch_build_migration_499642ded8e36f923ddc7c1e` and preserved the same refusal. Its READ ONLY catalog observation showed bigint revision, NOT NULL, default1, validated one-column inclusive safe-integer CHECK, BEFORE/ROW/UPDATE trigger19, enabledO, no predicate/arguments, invoker function and exact pinned function body. Stored and pinned bodies are200 characters; direct source equality is true, while the previous SQL-btrim versus JavaScript-trim comparison is false. The diagnostic transaction observed read_only on. Cleanup again verified true. No migration SQL or guard is changed to accommodate this result.
3. [Correction45](../implementation/WORK-CLAIMS.md#bt-27a037364398--exact-postgresql-catalog-oracle-correction-45), committed backend `15eee78d9`, changes only the existing baseline oracle and its focused test: raw pinned dollar-body comparison. A recorded genuine RED1 then GREEN86; root reran86 and exact lint/diff, and C independently reviewed both hashes. Baseline SHA `703f7e210f449d5d90892d0ee66216d6061c2cddab119814eb11a8554a78d046` (204 lines); test `5480a98cb05945a038b302a67f157da84625d0be1ce972ec1f68be07528d76bc` (299 lines). Driver/cases/shared guards/SQL/source pins remain unchanged. No normalization, weakened CHECK or skipped assertion.
4. Corrected real execution on `scratch_build_migration_dd524fa92564bb29dc5e9c49` began `2026-10-03T23:50:12.773Z`, finished `2026-10-03T23:51:49.151Z`, exit0. All33 case oracles passed. Final privileged SELECT receipt:9 rows,1 exact migration ledger row, data digest `269ceb0a352fdcdfe0bc3828efd75863`, catalog digest `c23637780a536ea027c7a4c263ca4eb6`. Separate app-tenant-a/b cases explicitly set READ ONLY and require role `streamline_app`, mode on, exact tenant and exact unique ID-to-revision/cardinality maps. Guard verified zero remaining sessions/current-run OID-owner identity before dropping only this database. SQL CAS only; fixture RLS, not deployed policy or service authorization. Canonical sanitized observation-object SHA `d1c7b33059aaa5d8407c827eae97b3fd407527277556d89f090aac4b6db08627`.

### Sanitized PostgreSQL execution receipt

```json
{
  "sourceRevision": "15eee78d9",
  "runDatabase": "scratch_build_migration_dd524fa92564bb29dc5e9c49",
  "startedAt": "2026-10-03T23:50:12.773Z",
  "finishedAt": "2026-10-03T23:51:49.151Z",
  "cases": [
    {
      "stage": "case",
      "caseId": "focused-prerequisites",
      "passed": true
    },
    {
      "stage": "case",
      "caseId": "revision-absent-before-upgrade",
      "passed": true
    },
    {
      "stage": "case",
      "caseId": "migration-lock-timeout",
      "passed": true,
      "expectedSqlstate": "55P03",
      "actualSqlstate": "55P03"
    },
    {
      "stage": "case",
      "caseId": "failed-lock-no-ledger",
      "passed": true
    },
    {
      "stage": "case",
      "caseId": "official-whole-1732",
      "passed": true
    },
    {
      "stage": "case",
      "caseId": "constant-default-upgrade",
      "passed": true
    },
    {
      "stage": "case",
      "caseId": "validated-revision-catalog",
      "passed": true
    },
    {
      "stage": "case",
      "caseId": "official-ledger-replay",
      "passed": true
    },
    {
      "stage": "case",
      "caseId": "raw-rerun-refused",
      "passed": true,
      "expectedSqlstate": "42701",
      "actualSqlstate": "42701"
    },
    {
      "stage": "case",
      "caseId": "down-refused",
      "passed": true,
      "expectedSqlstate": "P0001",
      "actualSqlstate": "P0001",
      "expectedReason": "APPROVAL_REVISION_ROLLBACK_REQUIRES_REVIEW",
      "actualReason": "APPROVAL_REVISION_ROLLBACK_REQUIRES_REVIEW"
    },
    {
      "stage": "case",
      "caseId": "refused-ddl-unchanged",
      "passed": true
    },
    {
      "stage": "case",
      "caseId": "new-row-default-one",
      "passed": true
    },
    {
      "stage": "case",
      "caseId": "direct-writer-overrides-input-revision",
      "passed": true
    },
    {
      "stage": "case",
      "caseId": "reassignment-advances-revision",
      "passed": true
    },
    {
      "stage": "case",
      "caseId": "column-restricted-fk-delete-advances-revision",
      "passed": true
    },
    {
      "stage": "case",
      "caseId": "range-0",
      "passed": true,
      "expectedSqlstate": "23514",
      "actualSqlstate": "23514"
    },
    {
      "stage": "case",
      "caseId": "range--1",
      "passed": true,
      "expectedSqlstate": "23514",
      "actualSqlstate": "23514"
    },
    {
      "stage": "case",
      "caseId": "range-9007199254740992",
      "passed": true,
      "expectedSqlstate": "23514",
      "actualSqlstate": "23514"
    },
    {
      "stage": "case",
      "caseId": "range-null",
      "passed": true,
      "expectedSqlstate": "23502",
      "actualSqlstate": "23502"
    },
    {
      "stage": "case",
      "caseId": "exhaustion-refused",
      "passed": true,
      "expectedSqlstate": "23514",
      "actualSqlstate": "23514",
      "expectedReason": "APPROVAL_REVISION_EXHAUSTED",
      "actualReason": "APPROVAL_REVISION_EXHAUSTED"
    },
    {
      "stage": "case",
      "caseId": "exhaustion-unchanged",
      "passed": true
    },
    {
      "stage": "case",
      "caseId": "opposing-same-revision-one-winner",
      "passed": true
    },
    {
      "stage": "case",
      "caseId": "delayed-reassign-stale-decision-refused",
      "passed": true
    },
    {
      "stage": "case",
      "caseId": "delayed-cancel-stale-decision-refused",
      "passed": true
    },
    {
      "stage": "case",
      "caseId": "delayed-delete-stale-decision-refused",
      "passed": true
    },
    {
      "stage": "case",
      "caseId": "transactional-audit-failure",
      "passed": true,
      "expectedSqlstate": "23502",
      "actualSqlstate": "23502"
    },
    {
      "stage": "case",
      "caseId": "row-revision-and-audit-rolled-back",
      "passed": true
    },
    {
      "stage": "case",
      "caseId": "app-tenant-a-read-only",
      "passed": true
    },
    {
      "stage": "case",
      "caseId": "app-tenant-b-read-only",
      "passed": true
    },
    {
      "stage": "case",
      "caseId": "foreign-tenant-write-zero",
      "passed": true
    },
    {
      "stage": "case",
      "caseId": "foreign-tenant-insert-denied",
      "passed": true,
      "expectedSqlstate": "42501",
      "actualSqlstate": "42501"
    },
    {
      "stage": "case",
      "caseId": "missing-tenant-denied",
      "passed": true,
      "expectedSqlstate": "42501",
      "actualSqlstate": "42501"
    },
    {
      "stage": "case",
      "caseId": "app-trigger-disable-denied",
      "passed": true,
      "expectedSqlstate": "42501",
      "actualSqlstate": "42501"
    }
  ],
  "adminReceipt": {
    "stage": "admin-select-receipt",
    "rows": 9,
    "digest": "269ceb0a352fdcdfe0bc3828efd75863",
    "catalogDigest": "c23637780a536ea027c7a4c263ca4eb6",
    "ledgerRows": 1,
    "sqlCasOnly": true,
    "deployedRlsVerified": false
  },
  "cleanup": {
    "stage": "cleanup",
    "droppedCurrentRunDatabase": true
  },
  "wholeChainVerified": false,
  "applicationRuntimeVerified": false,
  "deployedRlsVerified": false
}
```

Repeatable commands: `node --test src/scripts/__tests__/approval-revision-migration-proof.test.mjs src/scripts/__tests__/organization-setup-migration-proof.test.mjs src/scripts/__tests__/portal-migration-proof.test.mjs`; exact proof-path ESLint and diff checks. Runtime invoked `node src/scripts/approval-revision-migration-proof.mjs --run-id=dd524fa92564bb29dc5e9c49 --approve-database=scratch_build_migration_dd524fa92564bb29dc5e9c49 --execute` with backend.env supplied only in the child environment. Each repeat must use a fresh run ID and approve only that derived database; no credential, IAM token or connection URL is stored in evidence.

Current unverified: full historical migration chain; real application service/controller/RBAC, cache/event delivery, browser/mobile, deployment and operations. The33 passing SQL cases are bounded PostgreSQL evidence, not HTTP authorization or immutable-artifact approval proof. RLS and parent tables in this proof are declared fixtures rather than deployed policy evidence. Independent application-role READ ONLY receipts at `2026-10-03T23:44:23.615Z` and after the successful run at `2026-10-04T00:02:10.026Z` observed role streamline_app, mode on, revision absent and0 approvals in reserved project54. The second receipt additionally restricted the catalog check to the exact three owned scratch names and observed0 remaining databases. Application1732 remains unapplied; no application approval writes, live Ticket comments or secret-bearing evidence were created. Both failed runs and their cleanup remain part of the chronology. The full BT task and its D/I/T/R/B/L stages remain open.

## Approval row revision source correction — 2026-10-04

Selected requirement: BT-27a037364398; supporting BT-801e948e8a67. [Exact disjoint ownership and full acceptance](../implementation/WORK-CLAIMS.md#bt-27a037364398--approval-row-revision-and-atomic-commands-43) was reserved at outer `61fa949c5`, starting backend `d2863e8d8`; backend source is committed at `43074abf8`. Classification: Current verified for bounded source/focused gates and catalog observations; Current unverified for runtime, browser and deployment. No full task stage or checkbox closes.

- Backend genuine RED: concurrent public approve/reject commands both fulfilled at expectedRevision1; expected exactly one. Final fake-adapter row still had revision1. One focused test failed before production changes; this is source-level behavior, not database race proof.
- Frontend genuine RED: public delete-hook command with `{approvalId:7, expectedRevision:3}` interpolated the object into the URL and sent no body. One focused test failed before production changes; runtime and browser behavior remain unverified.
- Existing baseline flaws: unconditional lifecycle writes; terminal decisions accepted by general management update; best-effort mutation audits; assigned approver can decide without project membership but cannot read the current detail GET. Approval request creation does not bind an immutable artifact. The correction must preserve canonical permission keys, route exposure, explicit module access and object-level policy.
- Application migration readiness: READ ONLY with the reserved tenant context sees integer id/project_id, text org_id, no revision column, and0 approvals in reserved project54. No application DDL or approval mutation was executed.1732 adds a separate bigint row revision exposed as a positive safe JSON integer; a database trigger advances every update. This is not an artifact version. [Corrected proof45](#approval-revision-postgresql-replay--2026-10-04) subsequently verifies focused scratch PostgreSQL trigger/CAS/rollback and33 case oracles. Actual application migration, service/API authorization/persistence and deployed policies remain Current unverified.
- Static migration evidence: discipline self-tests36, rollback self-tests9 and immutability self-tests19 pass. Real discipline still fails15 existing entries; real rollback still fails13 existing entries. Neither result names1732; no baseline is widened. Real immutability passes, and every earlier journal entry compares unchanged after the single1732 append. Static absence of a new finding is not a passed full gate or migration replay.
- Final backend evidence: coordinator 15 suites/207 tests pass, including opposing decisions, critical-audit rollback, assigned detail access, permission/terminal/revision refusals and 12 public mutation foreign-tenant/wrong-project/missing/deleted-record negatives. Exact 22-path lint/diff and scoped/production TypeScript pass. Independent source/SQL/journal/generated-contract review is clear. Three existing Inbox factories only add required `revision: 1`. Controller E2E was refused by the disposable-database guard before zero tests; mocks cannot substitute for that gate.
- Official artifact: both OpenAPI files have SHA `8ba8a4d13ca5be105d2381e4acb95db88c11442a735f14d097cec719082b4318`. Freshness passes at 4107 operations/4092 Zod contracts/4107 exposure stamps; Build freshness passes at 311 operations/390 schemas and byte vendor passes. The resolved inventory retains 410 mandatory-key operations, 1550 required bodies and 12 multipart contracts. Eight changed operations are approval-owned. No generator or generated artifact was edited by hand.
- Frontend source at `4773c5685`: coordinator nine suites/83 tests, exact lint/diff, scoped and production TypeScript pass; independent 22-file/final-delta review is clear. Displayed fresh revision survives background reads;409 retains choice/reason and blocks resubmit until explicit Review latest. Decisions accept pending/escalated/changes_requested, reject requested; requested management remains available. Project decisions require actual assigned membership or management, bulk controls require management, and successful bulk rows alone clear after current-owner acknowledgements. Hook inputs/types derive from official contracts; no new unused-underscore escapes or comments. Two initial unknown-ReactNode diagnostics were fixed and rechecked.
- Broad gate limits at this package: full backend test TypeScript again exhausts10GB (child134, pnpm1). Full frontend spec TypeScript fails with23 diagnostics in six unowned Calendar/Chat/Wiki/KB/Mail test paths, with no43 diagnostic. Preserve failures and unrelated hashes; scoped/production success does not imply a full test gate passed. This is not browser or persistence proof.
- Existing FK clarification: READ ONLY deployed catalog shows validated `fk_project_approvals_approver_actor` uses `ON DELETE SET NULL (approver_membership_id)`. The older unrestricted composite definition in historical0668 is an intermediate baseline, not a reproduced current defect;0770 supplies the later correction. [Focused proof44/45](#approval-revision-postgresql-replay--2026-10-04) preserves this distinction and verifies its column-restricted FK action advances revision. Full historical migration-chain and application runtime evidence remain Current unverified.
- Full remaining scope: all eight owners must supply bounded authorized immutable artifact snapshots/current-version checks; existing approvals remain unbound. Registered lifecycle events, cache/event delivery, canonical decision Sheet and Inbox integration, filters, requester/due/status/version projections, URL/history/mobile behavior, role/tenant, real persistence, browser, deployment and operations require separate matching evidence. Do not enqueue an unregistered changed event into a publisher that retries unknown types.

Status: Current unverified historical findings; Planned remediation

## Problem Statement

Planning a fix is not evidence that a historical browser failure is resolved. Pack observations also change over time: PM-001 first described no CTA, then Owner verification showed CTAs existed with failed persistence/loader. Preserve chronology and current uncertainty.

## Solution

Retain source evidence, map findings to canonical interfaces, and close only on current actor-specific persisted behavior. Refer to [research traceability](./research-traceability.md) for all source IDs and screenshots.

## User Stories

1. As an owner, I want an invitation to yield real access, so that collaborators start without support.
2. As a client, I want a successful grant to open my project, so that success messages are trustworthy.
3. As a Member, I want assigned projects visible, so that a blank list does not resemble data loss.
4. As an administrator, I want revocation to stop reads and jobs, so that stale grants do not leak data.
5. As a tester, I want the exact actor/environment/version, so that a screenshot cannot hide an incomplete lifecycle.

## Implementation Decisions

| Finding | Historical evidence | Planned seam | Closure evidence |
|---|---|---|---|
| BUG-001 / PM-011 | cold invite acceptance intermittently blank | invitation acceptance + onboarding destination resolver | cold session, wrong-email/expired/revoked/retry, actual membership and landing |
| BUG-002 / PM-002 | org invite without intended Build access | atomic membership + module standing activation | accepted module member can create ordinary work in assigned project |
| BUG-003 | tester project membership gate | canonical project access | assigned vs unrelated project positive/negative; consistent discovery |
| BUG-004 | Member client access no CTA/denial | capability projection and access request | safe human explanation; no inappropriate grant management |
| BUG-005 / PM-001 | false-success client invite without grant/entry; see [source audit](./client-portal-activation-gap.md) | `ARCH-17-CLIENT-PORTAL-ACCESS` activation command, invitation, publication gate, and outbox | persisted grant/invitation, usable guest entry, published client-visible artifact, no false toast |
| BUG-006 | Grant Access project loader failure | scoped project queries | authorized projects list loads; empty/denied/network states differ |
| BUG-007 | contested/scrubbed observation in CI log | original evidence review before attribution | reproduce exact original condition; do not invent a fix from identifier |
| UX-022/023 | membership discovery and productive role mismatch | scoped projects + ticket commands | correct count/list; Member create/update; deny elsewhere |
| UX-024–032 | cycle/release/filter/program/triage/report/portal/form depth gaps | corresponding domain/query interfaces | filled lifecycle and negative cases, recorded in source-linked acceptance |
| RBAC/cache/DB deployment gaps | source design cannot prove target runtime | AuthContext + ScopedRead + project access + client policy | runtime-role DB isolation, cache revocation, job/export/file/AI negatives |

Do not expand a historical severity into a new release blocker without attribution. Do not call RBAC broken because a UI preset is restricted. Compare current catalog, intended role and observed behavior; findings remain verification work until reproduced.

## Current source findings (2026-10-03)

| Finding | Current source evidence | Required correction | Closure evidence |
|---|---|---|---|
| BLD-INVITE-DELIVERY-01 | Before backend `9046fc768`, `bulkInvite` ignored `queued: false` for suppressed recipients or no provider; the source now returns queue outcome, records `DELIVERY_FAILED`, and marks setup partial | Prove the persisted invitation, failure event, and owner-visible recipient state agree; close the separate manual resend and worker-failure paths | Focused source checks passed at `9046fc768`; target database event and outbox rows, owner status after refresh, recovered delivery, and a real recipient link remain open |
| BLD-INVITE-ATOMIC-02 | The earlier source concern was incorrect: `DRIZZLE` is tenant aware and redirects the injected email outbox database to the ambient invitation transaction. The focused `invitation-outbox-transaction.spec.ts` exercises the real services and proxy with a transactional fake: four commit/rollback cases pass for pending, failed, and suppressed email rows. | Preserve this shared transaction behavior and verify it against the target database and a concurrent worker; explicit executor plumbing is not justified by current source evidence. | A real database rollback leaves neither invitation nor email row, and a concurrent worker cannot dispatch before commit; retry and first-link checks remain separate under BLD-INVITE-REPLAY-03 |
| BLD-INVITE-REPLAY-03 | The earlier replay claim omitted the outer outbox consumer transaction. The publisher wraps the setup consumer in one tenant transaction, the invite runs in a nested savepoint, and the inbox has a unique producer-event/consumer fence. Source therefore indicates a pre-commit crash rolls back invite, email, and inbox together; post-commit replay sees `COMPLETED` and skips. | Preserve the transactional inbox fence. Do not add a setup correlation schema solely to fix this unproven duplicate-send claim. | Target database crash tests before commit and after commit/before publisher acknowledgment show one invitation, one token hash, one email row, and a completed inbox fence; intentional manual resend remains separate |
| BLD-INVITE-STATUS-PROVENANCE-05 | Before backend `e1001a934`, setup status matched an organization invitation by recipient email, so an older pending invitation could mask the current attempt. The source now writes event-scoped receipts and reads only the exact outbox/inbox event and invitation ID. | Apply and verify migration `1728`, tenant RLS/FKs, legacy null, replay, rollback, and owner/member refresh on a disposable target database and browser; see the [onboarding source gap](./onboarding-current-state-gap.md#setup-invitation-outcome-provenance). | Backend `e1001a934` passes production typecheck, 104 setup tests, 38 migration-integrity tests, and scoped lint; database application and deployed behavior remain open. |
| BLD-ONBOARDING-PLAN-01 | Before backend `9fd0b94d2`, `OrgSetupService.completeSetup` enabled selected modules without the normal plan lock; source now reads a fresh tier inside setup and rejects locked choices before provision | Align preview and server error states; prove target database rollback and coordinate concurrent subscription transitions if needed | Five focused suites/109 tests, production typecheck, and lint pass at `9fd0b94d2`; target database, preview/browser, and subscription race proof remain open |
| BLD-INVITE-RESEND-04 | Before backend `9dc80badb`, manual resend rotated the token and returned success without separating email queue refusal. The backend now reports `deliveryQueued` and a controlled reason from the idempotent response while persisting the queue outcome; later worker failure is still a separate state. | Reconcile later worker outcomes with the invitation record and prove target database/recipient behavior | Backend `9dc80badb`, OpenAPI `d6bf011f5`, frontend response contracts `a48b731cb`/`306b0a636`, and owner presentation `1f608bc96` pass focused source/contract/UI checks; worker failure, provider retry, browser, and actual mail remain open |
| BLD-MODULE-REVOKE-01 | Before backend `f3d962afe`, direct standing removal left group, personal, or delegated permission active; source now writes a per-user deny and filters historical structural admin denials | Prove the override and cache/session revocation at runtime; preserve Org Owner/Admin access and verify regrant through every authorized path | Focused source checks passed at `f3d962afe` and direct/transfer regrant at `876b6f1e1`; target database, cache revocation, live session, job/export/file/AI, and role negatives remain open |
| BLD-MODULE-REGRANT-02 | Before backend `876b6f1e1`, direct RBAC role assignment and accepted ownership transfer could grant positive standing while an earlier per-user deny remained; those paths now clear the deny through the Access-owned writer in the same transaction | Define consistent reactivation for other positive group-grant paths and prove the committed state at runtime | Seven suites/84 tests, production typecheck, and scoped lint pass; existing revoked member regains only intended module access after target database, audit/version/cache, browser, and negative-role proof |
| BLD-MIGRATION-CHAIN-01 | Historical migration `0965_ar02_canonical_tenant_fks_3.sql` adds a composite foreign key to `invitations(org_id,id)`, while a source search of earlier SQL found only the `id` primary key and no composite unique prerequisite. The new `1728` index runs later and cannot repair a cold migration chain. | Follow the [migration chain gap](./migration-chain-gap.md): add a safe, reviewed prerequisite before `0965` without rewriting an applied migration; prove cold and upgrade paths. | Disposable database applies the complete journal from empty state and an upgraded snapshot; catalog shows the intended composite key/FK, rollback is rehearsed, and no deployed checksum is invalidated. |

These findings are source-level and remain Current unverified as deployed behavior until the named runtime evidence is collected.

## Intake processing reconciliation — 2026-10-03

`BLD-INTAKE-TRANSITION-08` is a source and bounded runtime correction under `ARCH-04-REQUEST-CONVERGENCE`, supporting BLD-011 and BLD-035. The previous `IntakeService.updateIntake` read pending state before its transaction. Competing decisions could both create a Ticket or overwrite the processed state. Its focused regression first produced two successful accepts where only one should succeed.

Backend `53a369619` moves the independent Intake owner from `execution/workspace.service.ts` to `execution/intake.service.ts`, with direct DI/import consumers and no forwarding facade. It locks the exact organization/project/request row in the tenant transaction, checks the locked state, and creates the canonical Ticket plus the pending-qualified request transition atomically. A missing result or failed write rolls back; processed requests retain the existing 409 contract. Publication runs after the owned transaction commits or through the ambient transaction's after-commit hooks; missing ambient hooks fail rather than publish early. List/create contracts, permissions and the canonical ticket creation interface remain unchanged. The unused controller schema import was removed without changing its response decorators.

Five focused suites passed 98 tests, including concurrent decisions, current locked state, tenant/project misses, creator/request rollback and ambient commit/rollback behavior. Independent review passed. Production TypeScript and scoped test TypeScript passed; the latter includes every changed spec and both RBAC scenario/adaptor imports, not the entire repository test suite. Exact eleven-path ESLint passed with zero warnings. Module-registration self-tests passed 13 cases and the real gate found all 260 modules reachable. `workspace.service.ts` shrank from 589 to 440 lines and the new owner is 136 lines; the unchanged file-size rules now report 38 existing violations instead of 39. The repository-wide size and other previously reported release gates remain open.

The coordinator restarted only the verified local synthetic runner at that revision. The normal synthetic owner session created Intake 2 and 3 through the real API in Flow02 project 54, then exercised competing commands. Before the races, a separate application-role read found both PENDING with null links and zero matching Tickets. The [saved request outcomes and persisted markers](evidence/2026-10-03-intake-transition.json) contain no authentication credentials.

| Real API action | Observed result | Persisted result |
|---|---|---|
| Two concurrent accepts for Intake 2 | 409 and 200 | One accepted request linked to Ticket 359, number 3; exactly one matching live Ticket. |
| Concurrent decline and accept for Intake 3 | Decline 200; accept 409 | Request declined with its submitted reason and no link; zero matching Tickets. |
| Repeat Intake 2 acceptance | 409 | Existing link remains Ticket 359; no additional Ticket. |
| Read accepted Intake collection | 200 with one matching row | Collection agrees with stored accepted state. |
| Read creation activity | One `created` row for Ticket 359 | No live ticket comment was posted. |

An independent fresh IAM read at 10:22:10 UTC used `streamline_app`, verified no superuser/BYPASSRLS, enforced read-only mode and selected REPEATABLE READ. It rechecked the exact synthetic organization, active owner and project before querying. All six stored-state checks passed: accepted and declined decisions, exact accepted link, one matching accepted Ticket, zero declined-title Tickets and one creation activity. This separately confirms the saved persistence markers; it does not establish browser behavior or every possible concurrent ordering.

These observations use real application guards and PostgreSQL; request concurrency is an observed schedule, not exhaustive controlled interleaving proof. Database failure injection, deployed effects/workers, cache/browser refresh and the full role/tenant matrix remain Current unverified. The generic duplicate transition still accepts a same-organization ticket ID without canonical target record authorization, and its existing numeric schema is not positive/integer constrained. That requires a separately claimed correction and tests for hidden/foreign/deleted targets and the allowed cross-project policy. This slice does not claim complete Intake, Feedbucket mapping, conversion-to-project or duplicate-link acceptance.

### Duplicate target authorization

Backend `0fdf32a3e` closes the source-level unchecked duplicate-target path: while the pending Intake row is locked, the command uses canonical `assertTicketReadAccess` for the same actor, organization, project and target. No target read, transition or Ticket visibility policy is duplicated. The positive int32 boundary additionally requires a target for duplicate commands; malformed processed requests can now fail validation before the processed-state conflict, an intentional invalid-input change.

Focused Intake checks passed 121 tests across six suites, including the real canonical guard's tenant/project/deletion/scope predicates, accessible same-project positive, no mutation after denied targets and processed/CAS behavior. Production and changed-spec TypeScript and scoped lint passed; independent source review was clear. The regenerated OpenAPI contract is backend `8d5e583ee`. New target-link HTTP/DB, target visibility/deletion races and browser proof remain open. Earlier accept/decline runtime results above do not verify this new duplicate-target branch. See the [runner evidence](evidence/2026-10-03-build-browser-runner.md#reviewed-assignment-authority-and-intake-target-changes) for the full-test TypeScript heap failure and pending frontend numeric-bound reconciliation.

The [duplicate-target runtime artifact](evidence/2026-10-03-intake-duplicate-runtime.json) now records eight actual endpoint checks against backend `8d5e583ee`. Synthetic request 4 was created in project 54. Missing ID, zero, fraction and overflow returned 400; a positive but absent ticket ID returned 404. A READ ONLY query confirmed request 4 stayed pending with no link. Linking accessible ticket 359 returned 200, repeat processing returned 409, and a fresh list returned the same duplicate/link. A separate agent's application-role READ ONLY transaction confirmed the exact request, live same-project ticket, zero tickets with the new Intake title and absence of the missing target within this tenant. No new Ticket was created by the duplicate command. The regenerated frontend schemas at outer `f5a57e8ec` parsed the real create/update/list payloads and rejected the three invalid numeric identifiers. Foreign/hidden/deleted targets, controlled interleavings, broader roles, browser and deployment remain open; the original requirement is not closed by this one-owner proof.

## Build Inbox module boundary — 2026-10-03

The user's reported category mismatch reproduced in the browser: Build displayed CRM, HRMS, Billing and other module categories. The underlying list already constrained `sourceModule=build`; the mark-all control incorrectly invoked global read-all. Thus the collection scope and mutation scope disagreed.

Outer `6ab361475` and backend `231a94829` correct this boundary. The shared category definition drives the Build menu and URL parser. Build binds a mandatory source route; global Inbox/bell retain the original command. The server updates exact tenant/recipient/source live unread rows without advancing the global recipient watermark. Client rollback changes only affected read flags, preserving concurrent foreign-module reads, current metadata, new/removed rows and aggregate counts. A 404 from an older backend shows the existing error toast and cannot fall back to global read-all. These are source-implemented findings, not full requirement closure.

| Evidence dimension | Result and limit |
|---|---|
| Focused source checks | Frontend 22 suites/205 tests; backend notification 5 suites/37 tests. Initial category/scope, delayed rollback race and visible failure regressions failed before their repairs. Independent final review clear. |
| Static gates | Exact frontend 12-path lint, backend notification lint, changed-spec TypeScript and both production TypeScript gates pass. Full frontend test TypeScript fails in unchanged Calendar/Chat/Wiki/Mail tests; full backend test TypeScript previously exhausted its 10 GB heap. Neither full test gate is claimed passed. |
| Contracts | Official backend OpenAPI generation; vendored and freshly generated frontend contracts at `9e9b178f7` match hash `ba9ab6ad26c439e53aeaa41935976a24fe06dd7f5767bb72a2456821e18e29d1`. Generated Build TypeScript syntax is unchanged apart from that hash; generator formatting explains the large textual diff. |
| Browser, Current verified | Build menu has All types, Projects & tickets and Approvals; selecting each category updates the corresponding `type` URL and selected label. Global Inbox still has All modules. At 390×844, the existing full-pane preview returns through Back to inbox with the category preserved; Approvals shows the filtered empty state. The observed console error list was empty. No user notification was mutated through this deployed-backend frontend. |
| Real API/database, Current verified | [Sanitized runtime artifact](evidence/2026-10-03-build-inbox-runtime.json): genuine synthetic session, local runner, application-role READ ONLY tenant checks. Fixture 307 is Build; 306 is organization. Build read-all returned 200; immediate counts were global 1/Build 0; only 307's stored read flag changed and no watermark was created. Global read-all returned 200, immediate counts 0/0, and persisted watermark 307 makes both records effectively read while 306's physical flag remains false. |
| Retry/denial, Current verified | Missing authentication 401, missing/wrong fixture capability 403, client-supplied authority 400 and absent reserved ticket 404; database remained unchanged after those denials. Fixture retries return the same ID without resetting its read state. These are fixture/owner results, not the full production role/tenant matrix. |
| Current unverified | Full recipient/tenant denials, browser mutation, complete event fanout/durability, and deployment/operations. The current browser frontend uses the deployed backend; local runner evidence is separate. Approval for a separate local verification frontend remains pending. |

The separate runner guard revision `33b2dd463` permits only reviewed global/Build scoped read-all PATCH paths after the existing reserved actor/organization checks. Fixture claim `BLD-INBOX-NOTIFICATION-FIXTURE-13` supplies bounded local test data through canonical notification creation; it does not prove real Build event fanout or modify production notification delivery.

Runner fixture commit `e238696bc` passed five focused suites/259 tests, exact lint and changed-spec/production TypeScript with independent review. Backend `1aee0d53a` moves notification cache invalidation/publication after commit; rollback and commit-failure tests prove no premature side effects. The author passed eight suites/89 tests; the later import-only test relocation passed its eight-suite/80-test selection plus the final scoped TypeScript gate. The relocation and hashes are in the [cleanup manifest](cleanup-manifest.md#notification-focused-test-placement--2026-10-03). Production TypeScript passed before the import-only relocation. The runner restarted with these frozen production files; an initial launch omitted documented NODE_PATH and failed before listening, then the corrected launch bound only 127.0.0.1:1001. No migration was applied.

The real SSE probe found another issue: count changes arrive as a default message containing a nested MessageEvent. The initial observer required a named event and therefore missed that frame; inspecting the actual frame corrected the observation. Source tracing confirms the global JSON response interceptor causes the nesting, and the frontend loses a notification's nested payload. BLD-NOTIFICATION-STREAM-WIRE-18 owns the canonical fix and real wire regression; it is Planned until independently checked and retested. Feedbucket submission notices also use the legacy feedbucket/SYSTEM classification, so future-notice correction is separately claimed under BLD-FEEDBUCKET-NOTICE-16. Historical ambiguous notices are retained; no broad filter or speculative backfill hides the distinction.

The SSE correction is now Current verified for the recorded source and local runtime scope. Backend `f1eecf42f` preserves native Nest SSE frames while retaining ordinary JSON envelopes. Three real wire regressions failed before the repair; four suites/52 tests, exact lint/diff, production TypeScript, final changed-spec TypeScript and independent review pass. Before restart, genuine synthetic notification 308 reproduced a default message with its notification nested and missing at the frontend's expected level. After restart into runner PID 20336, notification 309 arrives as a named notification frame with top-level payload; a following scoped read-all produces a named count_changed frame. Reusing the consumed stream token returns 401. Fresh counts progress 1 → 2 → 0; independent read-only persistence confirms Build records 307–309 read, organization 306's physical flag unchanged, and the prior global watermark still 307. This verifies actual notification framing and local command effects, not browser consumption or cross-tenant delivery.

Responsive read-only checks additionally passed at 375, 768 and 1280 widths. Escape dismisses the category menu and returns focus to its combobox; 768/1280 showed no horizontal overflow and no console errors were observed. The viewport was restored. Browser screenshots were captured in tool output; no saved screenshot path is asserted. Separate local frontend mutation approval remains pending.

Independent review blocks Feedbucket notice acceptance until a real registered recipient visibility policy checks current module/scope/project access. The intent/classification slice has five suites/35 tests plus a repaired schema-inferred test fixture, but that does not prove authorization. BLD-FEEDBUCKET-RECIPIENT-VISIBILITY-19 addresses pre-materialization access; queued delivery, stored history/counts and caller-token ceilings remain separate required integration work.

### Notification domain and replay source reconciliation — 2026-10-03

These are source-implemented slices with focused verification, not closure of BLD-009, BLD-014 or BLD-025. No original broad checkbox was marked complete.

| Slice / revision | Current verified source evidence | Current unverified acceptance |
|---|---|---|
| Atomic Feedbucket notice and recipient visibility, backend `7dff538d9` | New `build.feedback.received` intents share the submission transaction, preserve real submission identity, use Build/PROJECTS classification and register the owning Feedbucket read policy. That policy checks current membership, Feedbucket availability/scope, live submission/widget and, only for project-bound widgets, Build availability/project reach. Seven suites/118 tests and final integration two suites/59 tests passed; exact lint/diff and two independent source reviews passed. | Synthetic organization has Feedbucket disabled; no addon was enabled to manufacture success. Real notice production, stored historical text/count authorization, later provider authorization, browser and deployment remain open. Historical ambiguous notices were retained. |
| Canonical ticket assignment, backend `8c801eb4c` | Ordinary, template and feedback creation use the canonical transactional intent seam. Active internal recipients are read in a batch; self/invalid recipients are omitted; metadata carries trusted project identity. Returned ticket numbers are sorted before matching draft/activity/assignee state. Thirteen suites/146 tests and two independent reviews passed. | Real multi-recipient assignment and tenant/role/browser matrices remain open. Existing feedback null-actor watcher assertion and automation publication ordering are separate unresolved behavior. |
| Explicit intent replay, backend `0c90ca9f3` | The versioned identity binds canonical tenant/event/entity/recipient/chunk identity, explicit-versus-implicit caller semantics and optional priority/channel overrides. Writer and relay share strict encoding/decoding; internal metadata is not delivered. Six suites/57 tests include actual service replay after simulated post-materialization failure, 501 recipients, tamper negatives and legacy controls. Independent review clear. | Runtime replay, actual concurrent worker leases/crash recovery and rollout remain open. Implicit-window late replay and old unmarked rows retain their documented residual. Empty-channel coverage proves argument preservation; real routing may retain IN_APP. Existing relay handling of `failedRecipients` can mark an intent processed despite recipient failure and must be repaired separately. Consumer-before-producer deployment is required. |
| Build availability in live notification context, backend `85e62a08c` | Canonical module availability is checked before ticket/release/approval context even for an owner. Disabled, plan-locked and user-denied states have focused negatives. Six suites/105 tests, exact lint/diff and independent review passed. | Membership/cache latency, stored history/counts, actual module revocation/reenablement and full runtime/tenant/browser proof remain open. |

The test selections above overlap; do not add them as unique coverage. Combined changed-spec TypeScript and production TypeScript passed with all four production slices frozen. Runner test files were excluded from that changed-spec pass while their test-only extension was being edited. A second integrated gate includes them after the fixture review correction. Full test TypeScript is not claimed passed. These slices do not modify public API/schema contracts; generated contract checks remain separately dated.

Read-only application-role prerequisites for the reserved synthetic organization found status-change defaults LOW/IN_APP, no tenant event/policy override and no notification preference/digest row. Its baseline contains five processed intents and one historical DONE email queue row. This snapshot is neither actual new dispatch proof nor proof that external workers are isolated. The reviewed local fixture will require capability, live synthetic owner, current module/ticket access, fixed payload/recipient and no digest, and will never rewrite queue leases or states. Manual replay of a validated processed row will not be described as worker crash proof.

Canonical dispatch/replay now has bounded Current verified runtime evidence in the existing [sanitized artifact](evidence/2026-10-03-build-inbox-runtime.json), observation `canonical-notification-dispatch-replay`. Backend `693d332d0` closes the explicit-channel digest preference race, with nine suites/74 tests and independent coordinator/agent review; runner `702bd1d3c` adds the guarded fixture, five suites/305 tests and exact lint. Combined changed-spec and production TypeScript pass. A freeze check caught unrelated formatting of the runner after the author's hash snapshot; both coordinator and independent agent compared its parsed syntax against the prior revision plus the two intended dispatch additions and found no semantic difference. Fresh lint passed; the formatting was retained.

Reviewed runner PID17416 returned health200 and a genuine synthetic session200. Real fixture denials were401/403/400/404/409; alternate GET returned404 rather than the internal guard's focused403, and no denied operation changed notification state. Enqueue returned200/PENDING and persisted outbox492; after commit, notification310 and linked IN_APP delivery555 appeared, with LOW priority and no internal replay metadata in the notification. The fresh Build projection contains310 and only Build rows; its unread count is1. A manual canonical persisted-row replay after a real minute-bucket rollover returned200 without creating another intent, delivery or notification. Scoped read-all followed by another replay retains310's read flag, count0 and global watermark307; organization notification306's physical read flag remainsfalse. No email queue or digest rows were added. Delivery proof uses the actual composite notification FK, not an assumed fixture marker in delivery metadata.

This is owner-only fixture evidence, not worker lease/crash, full recipient/tenant, live preference-race, browser mutation or deployment proof. Existing `failedRecipients` handling remains open. Stored owner policies25 were edited only after this runner boot and are excluded from its evidence. The full file-size gates remain failed (38 source files over500;511 over300 versus baseline413), after their65/16 self-tests passed; no baseline or exception was widened.

The initial BT-801e948e8a67 acceptance audit recorded the following source gaps; later33/34/35/37/39 source handoffs address lifecycle controls, preview states and selected-read ownership, while their full runtime/browser proof remains open: no Build resolved/snoozed controls; notification approval does not open the exact-version domain decision sheet and the current decision command lacks a version/status compare-and-swap; ticket preview errors/denials can become misleading missing-record states; selection/history/return and narrow-desktop auto-selection need follow-up. Claim26 addresses only malformed ticket-link decoding and stale selection across project filters. Shared link fallback safety, the other UI behaviors and their browser proof remain open. Flat/unified stored notification reads, AI raw notification tools and live SSE payload visibility require separate authority enforcement; a producer visibility check does not authorize historical reads.

### Inbox independent review corrections — 2026-10-03

Claim26 source is committed at outer `2b256d30a`. Its exact six files are the existing shared ticket formatter/parser and test, Inbox ticket-link parser and test, and Inbox list and type-filter test. Malformed percent escapes no longer throw; project/comment/numeric ticket IDs must be positive int32 values; changing or removing the project filter clears stale bulk selection while same-project paging/refresh retains it. Independent review caught a first-draft compatibility regression: real backend provisioning emits project keys such as `WEB-123`, so both shared and Inbox parsers must retain `WEB-123-29`, legacy URLs and comment targets. The shared parser was repaired instead of adding another key grammar. Initial regression RED was 30 failures/19 passes; producer compatibility RED was 11 failures/53 passes. Final focused selection passed 13 suites/199 tests, six-file lint/diff, root scoped TypeScript and production `pnpm -C frontend type-check`; independent agent and root source reviews passed. These are Current verified source/gate results, not new browser or persistence proof.

The fresh full frontend `pnpm -C frontend type-check:specs` gate failed in six unmodified Calendar, Chat, Wiki, KB and Mail test files: recurrence shape, nullable textarea ref, missing conversation pagination props, KB hook arity and numeric Mail identity fixtures. No changed Inbox/shared-parser path was reported. An earlier scoped invocation omitted `types/next-auth.d.ts`, producing 12 Session augmentation diagnostics; the corrected scoped program included the repository declaration files and passed. Neither failure is hidden or reported as a full pass.

Claim25 policy review found two agent-identity mismatches before consumer integration: Feedbucket own/team ownership and an assigned-approval exception used accountable issuer membership where canonical list/inbox boundaries use acting membership. Three focused negatives reproduced this, and both owners now use acting membership for those assignment branches while retaining accountable issuer validation and canonical project/token scope resolution. Final owner-policy tests passed 10 suites/156 tests and exact seven-file lint/diff; independent re-review is clear. Current HTTP routes reject agent tokens, so this is proven shared-policy consistency, not a claim of an observed HTTP exploit. Consumer wiring, actual SQL execution, current membership-cache latency, full role/tenant proof and deployment remain Current unverified. Claim27 separately owns flat/unified list/count propagation and unsafe raw-response cache removal.

The same review found a pre-existing Feedbucket detail gap: `FeedbucketController.getSubmission` delegates to `findOne(orgId, id)` without the own/team or live-parent scope enforced by the collection route. Preserve this as an open authorization finding; fixing a notification projection does not repair the owning detail endpoint. No related endpoint, permission, migration or historical record was changed in these slices.

### Stored notification authorization runtime — 2026-10-03

Current verified, bounded scope: owner policies are committed at backend `8db4f6dd6` and read consumers at `e0f3de0fb`. Independent consumer review matched all 33 frozen files; policy tests passed 10 suites/156 tests and consumer tests 26 suites/249 tests. Combined changed-spec TypeScript, production TypeScript, exact lint/diff, backend OpenAPI freshness and frontend contract/vendor checks passed. The full test-TypeScript and repository standards failures documented above remain open.

The reviewed synthetic runner was restarted from a clean detached checkout of `e0f3de0fb`, sharing installed dependencies but excluding unrelated working edits. PID24992 listened on 127.0.0.1:1001 after its application-role preflight. Real owner reads returned only Build rows under `sourceModule=build`, and both Build and organization history globally. Cursor pages retained their sentinel/terminal behavior. Two temporary personal tokens demonstrated authorization before pagination: the restricted `build:access:view` token received an empty Build page and the unrelated organization row306 as the complete global one-row page; the permitted `build:view` plus `build:tickets:view` token received the Build rows.

The guarded enqueue command durably created intent495, notification311 and IN_APP delivery558 for reserved ticket358/project54. With notification311 unread, actual flat and unified reads/counts returned one for the owner/permitted token and zero for the restricted token, with valid response contracts and no degraded source. Missing authentication returned401, client-supplied organization query returned400, and the restricted ticket endpoint returned403. These are genuine statuses, not500. Independent application-role READ ONLY queries confirmed the exact recipient, live notification, PROCESSED intent, DELIVERED row and unchanged watermark307. Scoped Build read-all then returned200 and count0; notification311 became read while organization306's physical read flag and watermark307 stayed unchanged. Both temporary token revocations returned204 and subsequent token requests401; a final independent read confirmed both revoked. All observations and harness corrections are in the [runtime artifact](evidence/2026-10-03-build-inbox-runtime.json), observation `stored-notification-read-authorization`.

Current unverified: nonowner and cross-tenant matrices, object/assignment revocation races, real owner query budgets, cache-freshness ceiling, stream/AI consumer authorization, matching browser/mobile flow, deployment and operations. Local workers/providers were disabled; remote worker behavior and crash/lease recovery were not exercised. Synthetic evidence records remain; no customer data, live ticket comment or historical evidence was deleted. No broad BT stage closes from this bounded runtime matrix.

### AI notification read adoption — 2026-10-03

Current verified source/gate result at backend `52cd31533`: `getMyInbox`, `getMyNotificationCount` and `summarizeMyDay` now use the exported canonical NotificationsReadService with the unchanged actual caller. Missing principal or caller/actor organization/user mismatch rejects before notification reads or any daily-digest branch. AiModule imports the existing NotificationsModule without a duplicate reader/registry provider. Inbox output retains its eleven fields and nullability, with 30 rows, title240/message1200 character caps and an over-2048-character link omitted as null. Canonical ID ordering, effective-read watermark, retention and snooze rules replace the former independent raw queries.

The new actual-tool/reader/registry regression and existing DI test failed17/passed4 before the three production changes; final four suites/40 tests passed. Exact seven-file lint/diff, independent review, scoped TypeScript and production TypeScript pass. An initial scoped-TypeScript invocation omitted `src/@types/express.d.ts` and reported one `rbacScope` augmentation error; including the repository declarations produced zero diagnostics. Fixtures simulate database filtering; they are not PostgreSQL or AI-provider proof. Runtime24992 still loads `e0f3de0fb`, before this AI commit. Actual AI execution, provider token usage, physical query costs, complete role/tenant/browser and deployment remain Current unverified. No provider was invoked.

### Notification hints and bounded hydration query — 2026-10-03

Current verified source/gate result at backend `efcb68681`: notification SSE egress projects only `{type: "notification", notification: {id}}`; count events cannot carry an accidental notification payload. Recipient filtering, heartbeat and one-use tokens retain their existing behavior. The canonical authenticated notification list accepts 1–100 unique positive safe-integer IDs as canonical decimal CSV, bounded to 1699 decoded characters; bigint IDs above int32 remain valid. The same DTO array validator rejects invalid direct-reader input before SQL, and the ID predicate composes with current tenant/recipient/domain access before sentinel LIMIT. Counts remain independent of hydration IDs.

Three focused suites/58 tests, exact six-file lint/diff, independent frozen-hash review and scoped/production TypeScript pass. Initial focused RED had10 failures/28 passes, with seven additional failing direct-reader bound cases before implementation. On this revision, `pnpm -C backend typecheck:test` again exhausted its configured 10GB heap and exited134; the full test gate did not pass. Runtime proof for this new source is pending. Frontend30 remains in progress. Deployment requires matching client/server release or server ID-query support → hydrated client → ID-only egress; neither client-first nor server-first alone is compatible with the older counterpart. No private-content fallback is allowed.

### Stored notification cross-tenant isolation — 2026-10-03

Current verified, bounded runtime at `e0f3de0fb`: normal local captured-mail OTP and magic-link flows created the second reserved organization `a3ee7aa5-3005-4c3b-a4c5-db16151d0a29`, owner membership140, with setup notification312. Global flat/unified reads returned312 and unread count1; Build reads/counts returned empty/0. All corrected responses matched canonical contracts and unified reads were not degraded. The second tenant's request for first-tenant project54/ticket358 returned404, and client-supplied `orgId` returned400.

Build-scoped read-all returned200; refresh and independent application-role READ ONLY queries confirmed organization312 remained unread, no second-tenant watermark appeared, and original tenant rows306–311/watermark307 were unchanged. Under the second tenant's RLS context, the first tenant's six recorded notification rows were invisible. The first tenant's positive global read still returned306–311 and excluded312. The [existing runtime artifact](evidence/2026-10-03-build-inbox-runtime.json), observation `stored-notification-cross-tenant-isolation`, records the actual statuses, persisted synthetic setup, exact scope, harness corrections and limitations. The second tenant has no Build records; this does not prove nonowner, own/team, project-revocation, browser/mobile, AI28, stream29 or deployment/operations behavior. Synthetic evidence is retained and secrets were excluded.

### Notification hint runtime and hydration — 2026-10-03

Current verified bounded runtime: runner8804 loads detached `efcb68681`. Actual synthetic dispatch for project54/ticket357 produced outbox497, notification313 and delivery561. The owner stream emitted exactly `{type:"notification",notification:{id:313}}`; its count event had only `{type:"count_changed"}`. Both synthetic owner streams received heartbeat events and the second tenant received no notification event. Hydration of313 returned one authorized unread record for the owner, and empty lists for the other tenant and restricted `build:access:view` PAT. Duplicate and unsafe IDs returned400, a safe bigint ID above int32 returned200/empty, absent authentication and a consumed stream token returned401, and the restricted ticket read returned403. These are real HTTP results with canonical contracts, not mocked browser calls.

Independent application-role READ ONLY queries confirmed unread313 and PROCESSED497 before the read command. Build-scoped read-all returned200, subsequent UNREAD hydration omitted313, and persisted313 was read while organization306 and watermark307 remained unchanged. Delivery561 was IN_APP/DELIVERED. The temporary PAT was revoked204, subsequently denied401 and persisted revoked; both stream readers were closed. Exact requests and limits are in the17th [runtime observation](evidence/2026-10-03-build-inbox-runtime.json), `id-only-stream-and-authorized-hydration`; independent artifact review by `scoped_activation_dispatch` is clear for the recorded scope. LOW synthetic fixture notices do not prove visible frontend toasts. Browser/mobile, project-revocation timing, query budgets, worker recovery and deployment remain Current unverified.

Generated contracts at backend `6b2b285cd` and frontend `0b4b52427` contain only the optional notification ID query and regenerated source hash. Independent review, six vendor and93 Build generator self-tests, vendor/freshness checks and backend OpenAPI freshness pass (4106 operations,4091 contracts). Initial isolated generation lacked environment inputs and failed before generation; rerunning the official entry with the existing backend environment file succeeded without copying secrets or editing generated output. The OpenAPI CSV representation does not encode all transform/refinement rules; runtime Zod remains authoritative for safe integers, count and uniqueness.

### Notification hydration and target source closure — 2026-10-03

Current verified source/gates: frontend `6191ee3d2` consumes ID-only hints, discards private fields in legacy frames, parses the real token response envelope, and obtains toast content through a fresh canonical authenticated UNREAD request. Exact organization/user/session and committed identity fence the request, response, toast and View action. The existing API client and response contract remain authoritative; the bounded queue batches100 IDs, caps pending/held/running and seen sets at1000, allows one in-flight request and three transient attempts before reconnect recovery. It never substitutes cached notification text.

Independent review exposed two subscriber-grace defects. Actual-hook RED tests reproduced lost pending/in-flight hints and a disconnected stream whose retry fired with no subscribers. The repaired108-test snapshot resumes accepted hints through a fresh read, discards inactive response content, preserves session cancellation and retry budgets, and reconnects only without a live connection or future retry. Eight focused suites/108 tests, exact13-path lint/diff, matching-hash independent review and final scoped/production TypeScript pass. The earlier token-cooldown race hypothesis was disproved against the frozen implementation; no unsupported fix was made. The full frontend test TypeScript gate remains failed in six unrelated Calendar/Chat/Wiki/KB/Mail files; no changed notification path failed.

Current verified source/gates: frontend `94135bc10` hardens the existing shared deep-link normalizer used by Build Inbox, global Inbox, bell and toast. Opaque/non-HTTP schemes, malformed HTTP URLs, raw control/backslash characters and protocol-relative outputs fall back to `/inbox`. Legacy Build mappings, valid HTTP(S)-to-internal-path handling, other-module paths, queries and existing fragment dropping remain compatible. Meaningful RED24/49 became six focused suites/145 tests passing; exact two-path lint/diff, independent hash review, scoped TypeScript and the production gate covering this frozen revision pass. These overlapping suite totals must not be added as unique coverage.

Browser toast/click/refresh/back/mobile, the complete nonowner/object-revocation matrix, deployment compatibility and operations remain Current unverified. No full BT stage or checkbox advances from these source slices. No source comments, route, permission key, caller-specific sanitizer or duplicate API client was added.

### Canonical notification triage reads — 2026-10-03

Current verified source/gates at backend `f2ec6c210`: flat notification reads accept `SNOOZED` and share the existing Active/Later/Done predicate owner with unified Inbox. Active is unarchived and not future-snoozed; Later is unarchived with a future deadline; Done is archived regardless of snooze. SNOOZED plus unreadOnly intersects Later with effective unread state. Existing section overrides, PINNED behavior, active unread badge, watermark, bounded cursor/ID hydration and tenant/current-domain visibility remain compatible. The primary reader shrinks from300 to291 lines without baseline changes or a new production abstraction.

Meaningful RED8/30 preceded implementation; final four suites/38 tests, exact eight-path lint/diff, coordinator independent frozen-hash review and scoped/production TypeScript pass. The new focused contract test drives the real owner registry and project-family authorization algorithm through a bounded simulated SQL adapter; it is not PostgreSQL, cost or full owner-family proof. The backend full-test TypeScript gate remains the separately recorded10GB heap failure. Persisted snooze/archive transitions, explicit unsnooze, command validation/concurrency, matching browser/mobile and deployment/operations require subsequent claims and evidence. The reviewed runner must admit lifecycle writes before they can be exercised; a verification-boundary403 is not product authorization evidence.

Official generated artifacts are committed at backend `e9a281d31` and outer `d9e1a33ce`, with vendor SHA256 `0da95f9b7ea876191c34611190da47137463611c0beab79396f9ef423f530478`. Independent artifact review, six vendor/93 Build self-tests and both freshness checks pass; the only semantic OpenAPI delta is the new section enum member. Replacement runner25784 loads reviewed `f2ec6c210` with healthy `/health` and `/health/ready`. Observation18, `triage-query-contract-read-smoke`, records active Build IDs313/311/310/309/308/307, empty Later/Done, unsupported-section400 and absent-auth401. Application-role READ ONLY inspection confirms all six Build rows have null archive/snooze fields, are read, and organization306 remains unread. No notification mutation occurred; empty Later/Done and the second tenant's empty Later result do not prove successful lifecycle transitions or positive cross-tenant Later isolation. Initial pre-listening connection failures and the nonexistent `/health/live`404 are recorded as harness corrections.

### Synthetic Member invitation and unassigned Build denial — 2026-10-03

Current verified, bounded runtime evidence at reviewed backend `f2ec6c210`, runner25784: the reserved Flow02 owner invited the existing synthetic isolation account as Org Member without moduleAccess. Actual create201, validate200 and local captured OTP200 responses match their canonical contracts; acceptance without the OTP returns400. Acceptance with it returns200 and persists invitation `8ec14496-c3c8-4e7b-9289-a0aaca97b75d` as ACCEPTED, membership141 as ACTIVE/MEMBER, and one consumed code. The issued join magic link verifies200 once and401 on reuse. The same create Idempotency-Key replays201 with the same invitation; accepting the consumed invitation returns404. Independent application-role READ ONLY inspection confirms exactly one membership, zero invited module assignments, zero module overrides and zero Build role assignments.

The new Member's genuine session exchange returns200; project54 returns403/FORBIDDEN before module assignment. Canonical Build and global notification cursor reads return200/empty, which proves response shape only, not positive visibility. The [existing sanitized artifact](evidence/2026-10-03-build-inbox-runtime.json), observation19 `synthetic-member-invite-and-unassigned-module-denial`, records the exact reserved IDs, persistence and denials; independent agent review found no exposed credentials and confirmed the bounded claim. Tokens, OTPs and join capabilities remain in memory.

At observation19, positive entry after explicit Build assignment, own-notification visibility, linked object scope, transition races, client grants, browser/mobile onboarding and deployment/operations remained Current unverified. This runner predates claim33 lifecycle commands and claim35's expanded synthetic boundary; neither is proven by these flows. No full BT stage or checklist item closes.

### Synthetic Build Member assignment and preserved object scope — 2026-10-04

Current verified, bounded runtime evidence: observation20 in the [existing artifact](evidence/2026-10-03-build-inbox-runtime.json), still at backend `f2ec6c210` and runner25784. The synthetic owner selected canonical Build Member group2068 and assigned membership141 through the real module-access endpoint; it returned201 with the canonical success contract. After normal session renewal, the Member's permission read returns200 with `build:view`, without `build:access:manage`, and all organization/module owner/admin flags false. The canonical Build project collection returns200 with an empty authorized cursor page. Private project54 and Ticket358 remain403 with `PROJECTS_FORBIDDEN_PROJECT` and `PROJECTS_FORBIDDEN_TICKET`; self-escalation to Build Admin2051 returns403/FORBIDDEN. The other tenant's owner receives404/`PROJECTS_NOT_FOUND` for project54.

Independent application-role READ ONLY inspection after the denied escalation confirms ACTIVE Org Member141, structural organization Member role2048, exactly one Build role2068, an enabled Build override and canonical `module_access.member_added` audit930 naming the owner and group2068. Permissions version13 was observed without a captured before-value, so its increment and complete cache/event fanout are not asserted. An early final-state assertion incorrectly counted the organization role as a Build role; inspecting `module_key` corrected the assertion without another product write. Held credentials initially returned401; the cause was not independently proven, and renewed normal sessions supply the authority results above.

Independent agent review confirmed observation19 is unchanged and20 contains no credentials or unsupported closure claims. Empty collections prove module entry and response shape, not positive project/Ticket/notification visibility. Client activation, complete role/tenant and authority-transition matrices, browser/mobile, deployment and operations remain Current unverified. The research sequence has bounded invite acceptance and module-assignment evidence; client-grant activation remains the next separate activation gate. No full BT stage advances.

### Personal notification triage source and cache handoff — 2026-10-04

Current verified at source/test level: backend claim33 `1c673c5bd` implements current live recipient authority and exact-row locking for archive, unarchive, future Snooze and explicit bodyless Unsnooze in the existing lifecycle owner. The exact partition timestamp is preserved as PostgreSQL text rather than rounded through a JavaScript Date. Strict HTTP bodies reject authority fields; strict command-entry and post-lock Snooze validation reject malformed direct calls and expired new commands. Completed canonical keyed retries can replay after the deadline. Repeated unchanged commands preserve state and omit duplicate cache/count publication. Fourteen pure NotificationsService forwards were removed after caller inventory; the controller injects the actual lifecycle owner. This changes personal attention only, not a Ticket status or approval decision.

Meaningful regressions include a microsecond partition-key404 and malformed direct Snooze action-string dispatch before repair. Final nine suites/140 tests, exact15-path lint/diff, independent matching-hash review, combined scoped33+35 TypeScript and backend production TypeScript pass. Backend full test TypeScript session45618 again exhausted10GB: pnpm exited1 with the child ELIFECYCLE exit134, so the full gate is failed. The fixture's unused exports and unasserted wrappers were removed to keep its existing domain boundary at300 lines; source-size limits and baselines were not changed.

Frontend claim34 `6e200b0e3` uses field-owned optimistic operations and captured invocation identity/input. Same-field ABA, cross-session response fencing, query cancellation during a Build-to-global scope change, refreshed-list preservation and server-authoritative counts have focused negative/positive coverage. Resolve/Restore/Snooze/Unsnooze hooks reuse canonical contracts, keys and command permissions. Final nine suites/76 tests, exact17-path lint/diff, independent review, scoped TypeScript and production TypeScript pass. The scoped gate first found a flatMap union inference error; the existing union generic resolved it and the reviewer verified that exact delta. Fresh full frontend spec TypeScript failed in six unrelated Calendar/Chat/Wiki/KB/Mail paths, with no claim34 diagnostics; it is not passed.

Runner claim35 `94d32b547` admits only the exact five personal PATCH actions after its existing synthetic actor/organization and target checks. Fresh two suites/192 tests, exact lint/diff, coordinator review and integrated scoped TypeScript pass. Its guard still refuses unrelated mutations; a guard403 is harness evidence, not product authorization. Existing formatting drift was shown syntax-equivalent to the prior source plus the precise allowance. New33/35 are committed but were not loaded for observation20; runtime, browser and mobile acceptance are separate. Publication remains nondurable after-commit work; complete membership/account/organization transition races, durable recovery, broader CAS/audit and operations remain open. Claim37 independently owns the actual UI and fresh selected-record read; no broad I/T/R/B/L stage or task checkbox is completed by this handoff.

### Real personal triage persistence and recipient effects — 2026-10-04

Current verified, bounded API/database/event evidence: [observation21](evidence/2026-10-03-build-inbox-runtime.json), reviewed runner6156 at backend `94d32b547` including lifecycle `1c673c5bd`. All four actual personal commands returned200 with canonical acknowledgement. READ ONLY inspection proves notification313's exact `created_at` remains `2026-10-03 16:53:20.348809+00`, including its submillisecond partition key. Resolve persists archive and moves it into Done; repeated Resolve preserves the archive timestamp. Keyed Restore accepts `{}` and an absent-body retry. Future Snooze persists its deadline and enters Later; archive while snoozed takes Done precedence; Restore before expiry returns Later; explicit bodyless Unsnooze clears the deadline and returns Active. Final Active/Later/Done reads match their canonical response contracts and persisted state.

The same Snooze key with a different valid body returns422. After its deadline and subsequent Unsnooze, the completed keyed retry returns200 without restoring the expired deadline; the same deadline as a new keyed command returns400. Absent login returns401, a same-tenant nonrecipient and existing other-tenant target return404, an above-int32 safe missing ID returns404, and a forged authority body or new past Snooze returns400. No denial was500. The other tenant still reads its own recorded notification312 through the authorized canonical API. Final READ ONLY comparison confirms the other six observed Flow02 rows and watermark307 are unchanged; it does not assert unobserved columns or the other tenant's full database row are unchanged.

Three authenticated streams admitted the owner, same-tenant Member and other-tenant owner. Six changed states produced six owner-only `count_changed` events containing only `type`; the other two streams received zero events during this bounded observation. Repeats, conflict and completed-key replay add no observed effects; all streams were closed. Target313 was already read: global1 and Build0 unread counts remain canonical and unchanged, so a numeric unread badge transition is not proven. Actual physical cache deletion, automatic expiry events, durable publication/audit, controlled concurrent revocation/rollback and the complete current-principal matrix remain Current unverified. Browser/mobile mutations and deployment/operations remain open. Independent artifact review verified prior20 observations unchanged and no credentials or unsupported full-stage claims.

### Canonical optional request contracts and remaining UI review — 2026-10-04

Current verified at source/test level: independent artifact review rejected candidate SHA `8c36bd46f0be015ac2e3827f0fcc320b5e10d547f73442b52ed8f555625d42fa` despite passing byte freshness. It falsely required optional retry keys and absent accepted bodies. Canonical source repair38 at backend `120545d96` carries actual handler/class idempotency optionality and synchronous Zod undefined acceptance. Required headers, strict schemas and required JSON/multipart inputs remain authoritative; bodyless metadata cannot suppress required validation. Unrepresentable/async absence probes produce an explicit unconvertible finding. Stale required/optional/inline header entries are reconciled once in the existing owner.

Real DiscoveryModule/scanner RED8 and builder RED3 preceded the repair; final six suites/88 tests, exact five-path lint/diff, independent review and root scoped/production TypeScript pass. Root's scoped gate first found two unsupported Swagger extension property assertions; the author replaced only those assertions, passed30 owned tests and refroze. The reviewer reconstructed the previous hash from those exact two changes. Official generation from reviewed120545d96 now reports4107 operations,4107 exposure stamps,4092 Zod contracts and zero unconvertible findings. Canonical artifact SHA `1e8635e76e00a9c863db00de88fe655242b2e7a4b59054694b77ec29f3578153` is committed at backend `6d12d99ec` and frontend `8411d5aa0`. Backend and frontend freshness, byte vendor,6 vendor self-tests and93 Build-contract self-tests pass. Independent full semantic review accounts for35 recursive changes across26 routes plus the optional-header component:13 optional keys match actual decorators;10 duplicate mandatory headers are deduplicated while408 mandatory operations remain required; only strict default-empty bodies become optional. All12 multipart contracts and1549 other required bodies are preserved. Generated frontend TypeScript changes only the canonical hash. Prior and rejected artifacts remain preserved in ignored scratch.

Exact independent artifact inventory versus preserved0da95 (source repair changes published metadata; unrelated runtime controllers are not changed):

| Method | Path | Verified artifact change |
| --- | --- | --- |
| POST | `/build/{projectId}/updates` | Optional retry key; body unchanged |
| POST | `/timesheets/entries` | Optional retry key; body unchanged |
| POST | `/timesheets/entries/{entryId}/void` | Optional retry key; body unchanged |
| POST | `/timesheets/entries/from-attendance` | Optional retry key; body unchanged |
| POST | `/timesheets/exceptions/run-detection` | Optional retry key; body unchanged |
| POST | `/timesheets/timer/{timerId}/convert` | Optional retry key; body unchanged |
| POST | `/timesheets/timer/{timerId}/discard` | Optional retry key; body unchanged |
| POST | `/timesheets/timer/{timerId}/stop` | Optional retry key; body unchanged |
| POST | `/timesheets/timer/start` | Optional retry key; body unchanged |
| POST | `/hr/attendance/break` | Deduplicate required retry header |
| POST | `/hr/attendance/check-in` | Deduplicate required retry header |
| POST | `/hr/attendance/check-out` | Deduplicate required retry header |
| POST | `/me/attendance/break` | Deduplicate required retry header |
| POST | `/me/attendance/check-in` | Deduplicate required retry header |
| POST | `/me/attendance/check-out` | Deduplicate required retry header |
| POST | `/hr/expenses/email-report` | Deduplicate required retry header |
| POST | `/hr/expenses/export/jobs` | Deduplicate required retry header |
| POST | `/hr/export/jobs` | Deduplicate required retry header |
| POST | `/payroll/runs/export/jobs` | Deduplicate required retry header |
| DELETE | `/hr/documents/{documentId}/kb-link` | Publish actual strict default-empty body as optional |
| POST | `/inventory/packages/{packageId}/close` | Publish actual strict default-empty body as optional |
| POST | `/inventory/shipments/{shipmentId}/ship` | Publish actual strict default-empty body as optional |
| PATCH | `/notifications/{notificationId}/archive` | Optional key and strict empty body; archive command metadata |
| PATCH | `/notifications/{notificationId}/unarchive` | Optional key and strict empty body; restore command metadata |
| PATCH | `/notifications/{notificationId}/snooze` | Optional key; required snoozedUntil body preserved |
| PATCH | `/notifications/{notificationId}/unsnooze` | Sole new authenticated universal operation; safe-int ID, optional key/strict empty body, canonical ACK/errors |


UI37 initially passed212 focused tests but independent reviews found mobile loading/error hiding Back and inherited desktop Escape immediately reopening automatic selection. The three claimed navigation files were repaired through meaningful RED3, then22 suites/215 tests and exact lint/diff. Further standards review found new interactive static icons against FE-107 and accent-sensitive primary tab colors against the accepted neutral selected-tab behavior. Those bounded corrections are independently reviewed: neutral foreground/background tokens preserve selected tabs across accent themes; new interactive controls use installed canonical animated icons. A final Resolve-only repair passed14 focused tests, with the other19 claimed paths unchanged. Root scoped TypeScript then found two real integration errors: unsupported LoadingState compact and an options object passed to get where the API accepts an AbortSignal. Simply dropping expectedIdentity would weaken dispatch fencing; the author is adapting the existing request/response seam and real argument-shape coverage inside the same claim. The final four-path repair now uses supported LoadingState list/rows3 and the existing request GET/native signal/expectedIdentity plus canonical parseApiResponse seam. Meaningful request-shape/cancellation/malformed-response RED3 preceded repair; author8 suites/82 tests and coordinator22 suites/216 tests pass. Exact18 TS/TSX lint/diff, all20 matching hashes, independent precise-delta review, scoped TypeScript and production TypeScript pass at frontend `71efa13b4`. Fresh full frontend spec TypeScript session18049 failed only in the same six unowned Calendar/Chat/Wiki/KB/Mail paths, with no claim37 diagnostic; the full gate is failed. Matching browser/mobile and full approval detail acceptance remain open; source/test counts do not close the broad task.

### Build Inbox triage source handoff — 2026-10-04

Current verified at source/test level: frontend `71efa13b4` commits exactly20 claim37 paths. The global NotificationCardActions is promoted into the shared layer with its global callbacks, Snooze presets and defaults retained; the [cleanup manifest](cleanup-manifest.md#shared-notification-action-promotion--2026-10-04) records the removed path, both byte-format hashes, migrated content, updated imports and independent review. New Build Active/Later/Done tabs use accent-independent neutral selected styling. Row actions are siblings of activation, and the selected preview has shared personal triage controls. Resolve archives the notice; these controls do not mutate linked tickets or decide approvals.

Selected detail stores an ID and performs a new bounded Build-only read through the existing query owner, native cancellation, captured expectedIdentity and canonical response contract. Prior-owner or denied/missing content is redacted; 503 uses retry. Read ACK preserves a permitted preview, and triage dismisses only after a current-owner success. Mobile loading/error retains Back; explicit Escape does not reopen automatic selection. Focus/reconnect and the existing fallback policy remain authoritative; the nearest loaded Snooze expiry invalidates the list but does not prove unseen-record or durable expiry delivery.

Focused current proof: coordinator22 suites/216 tests, author8 suites/82 tests for final request/parser repair, exact18 TS/TSX lint with zero warnings, tracked diff check, root scoped `tsc --noEmit -p .scratch/tsconfig-notification-triage-ui.json`, production `pnpm -C frontend type-check`, and independent20-path/precise-delta review all pass. All TS/TSX source/test paths respect the current300-line package limit; UI-KIT is an existing Markdown registry. Fresh `pnpm -C frontend type-check:specs` fails in six unowned paths (two Calendar tests, Chat message-input-format, Wiki kb-conversation-list, KB children error policy and Mail action cache); no claim37 error remains. Prior backend full test TypeScript OOM and full release size gates remain failed.

Repeatable focused command from repository root (the exact22-suite stable run above):

```powershell
$buildInboxVerificationTests = @(
  "features/build/inbox/inbox-page.test.tsx",
  "features/build/inbox/inbox-list-type-filter.test.tsx",
  "features/build/inbox/inbox-notification-item.test.tsx",
  "features/build/inbox/use-inbox-url-state.test.ts",
  "features/build/inbox/inbox-filter-bar.test.tsx",
  "components/shared/notification-card-actions.test.tsx",
  "features/build/inbox/inbox-triage.test.tsx",
  "hooks/api/notifications-inbox-selection.test.ts",
  "features/build/inbox/inbox-offline-and-chat-gap.test.tsx",
  "features/build/inbox/inbox-list-denied.test.tsx",
  "features/build/inbox/inbox-list-shortcut-help.test.tsx",
  "features/build/inbox/inbox-keyboard-nav.test.ts",
  "features/build/inbox/inbox-bulk-toolbar.test.tsx",
  "features/notifications/notification-card-copy.test.ts",
  "features/notifications/notification-bell.test.tsx",
  "features/notifications/notification-bell-unified.test.tsx",
  "features/notifications/unified-inbox/inbox-shell.test.tsx",
  "features/notifications/unified-inbox/inbox-offline.test.tsx",
  "hooks/api/notifications-inbox-unified-sync.test.ts",
  "hooks/api/notifications-inbox-lifecycle.test.ts",
  "hooks/api/notifications-mark-all-scope.test.ts",
  "hooks/api/notifications-inbox-queries.test.ts"
)
pnpm -C frontend exec jest --runInBand --runTestsByPath @buildInboxVerificationTests
```

Current unverified: matching local desktop/mobile actions, physical cache deletion, unseen Snooze expiry, positive personal Member notification/unread transitions, full current authority/revocation races, immutable approval detail and deployment/operations. Read-only source inventory confirms both existing synthetic notification fixtures target only the acting owner and reject recipient overrides; ticket assignment requires project membership. Assigned approvals can support a no-project-reach notice only with the required approval permission, but their producer needs shared outbox dispatch disabled by this runner. Admin emit and cron dispatch are forbidden, while activation dispatch admits only the exact setup event. No unscoped dispatcher or arbitrary-recipient fixture is used as a shortcut. Existing Member/tenant denials and read target313 are bounded evidence, not a positive unread transition. These prerequisites need their own reviewed scope; no full BT stage or checkbox advances.

### Selected-read Query ownership gate — 2026-10-04

Current verified gate finding: after source37 commit71efa13b4 and bounded tests/type/review, coordinator rechecked FE-16. Official `pnpm -C frontend check:effect-fetches:self-test` passes25 self-tests; the real `check:effect-fetches` fails exactly `hooks/api/notifications-inbox.ts:51` for an API call in a fetch effect. This is a package-owned standards defect, not an unrelated baseline failure. Prior216 tests, scoped/production TypeScript and precise-delta reviews remain valid for the paths/scopes they tested, and they did not verify this gate. Claim39 reserves the existing query/factory source and three existing tests with disjoint ownership. It requires meaningful RED and Query-owned state/freshness/cancellation with actual identity/response contracts, compatible global/list data shapes and no duplicate helper/key/API owner. The standards gate, full task and browser/deployment acceptance remain open; no checkbox advances.


Current verified correction: frontend `1e0ac5bab` contains exactly the two existing query/factory sources and three existing tests of claim39; no new tracked file, schema, API, helper or source comment. A serializable per-mount lease receipt uses the existing notification-list prefix and scoped QueryClient, settles exact cancellation before enabling the current owner, combines native Query/owner abort signals, binds canonical expectedIdentity and parses the existing list contract. Query owns focus/reconnect/fallback/invalidation. Old cache, same-account reauthentication, stale completion/error and delayed Retry cannot expose a prior title or target. Ordinary global/list shapes remain compatible. Independent reviewer client_activation_design matched all five SHA256 values and cleared the complete delta.

Verification: meaningful initial RED10 with28 positive controls and later stale-title Retry RED1 preceded GREEN39. Coordinator ran the three owned suites (39 tests), exact five-file ESLint with zero warnings, diff, ignored exact-file spec TypeScript and official production `pnpm -C frontend type-check`: all pass. Effect self-tests25 plus8383-file scan and abort-signal self-tests19 plus1270 blocks/549 files pass. Compatibility run is11 suites/125 tests passed with1 suite/1 test failed at `lib/query-scope-isolation.test.tsx:133`. An independently verified Jest mapper loading byte-for-byte pre39 platform-core/base snapshots from HEAD reproduces the identical failure with8 other tests passing. The unchanged provider chooses LOADING_SCOPE and remounts during loading without initialScope; this is recorded as a failed compatibility gate, not a passed package or inferred baseline success.

Additional failed gates: response-contract self-tests13 pass but the real scan reports nine unresolved URL expressions in `notifications-inbox-actions.ts` and two in `notifications-inbox.ts`; claim40 owns the existing route expressions without expanding an allowlist or changing endpoints. Query-scope self-tests20 pass but the real scan fails the unowned inline key in `hooks/api/kb/pages.ts`; no baseline change. Full frontend spec gate remains failed in six previously recorded unowned paths; full backend spec TypeScript remains failed by10GB exhaustion. The freeze/gate receipt is retained in ignored `frontend/.scratch/notification-selected-query-freeze-20261004.json`; root confirms44 outer and47 backend unrelated changed-file hashes are preserved.

Current unverified: no new real API, database, browser/mobile, deployment or operations result was produced by39. Matching local frontend approval remains pending and the reviewed runner is stopped. Numeric unread, positive Member/object visibility, full current authority/tenant/revocation, physical cache/durable events/expiry and exact-version approvals remain open. BT-801e948e8a67 retains D proven and I/T/R/B partial/open, L open; no task checkbox advances.


Current verified route-expression correction40: frontendde5c50b2e preserves every notification URL/method/body/config/ACK and scoped/global branch, replacing only ten row URL concatenations with templates and one conditional path argument with two explicit contracted calls. Root independently reviewed both matching SHA256 values. Seven focused suites/79 tests, exact two-file lint/diff, scoped/production TypeScript and the unchanged contract scanner pass after meaningful real-gate RED. The final gate parses2531/3058 calls with527 unparsed (baseline533) and four pre-existing unresolved sites in three files; its13 self-tests pass. No allowlist/baseline/schema/key/API/helper/comment/newfile change. Query-scope KB, baseline provider compatibility, full spec and release-size failures remain recorded. No new API/database/browser/deployment proof, full BT stage or task checkbox is claimed.


### Explicit expired person module-assignment source correction — 2026-10-04

Current verified source: backendd2863e8d8 changes exactly two existing person assignment services and three existing tests under claim41. The existing unconditional org/membership/role unique key plus DO NOTHING allowed an expired requested assignment to survive a successful explicit add. Eight genuine REDs reproduce past/boundary/conflict-time expiry through actual public addMember/addGroupMember commands. Conditional conflict handling now clears only expiresAt when the exact stored tuple expires by database clock_timestamp(), including expiry during the conflict wait; existing UUID/assigner/reason/createdAt and live NULL/future expiries survive. The six-role structure, complete role/PAT/owner ceilings, tenant predicates, replacement, module deny restoration and canonical audit/version/cache owners remain unchanged.

The initial duplicate-positive assumption is disproved by canonical policy: duplicate group IDs already return400 before writes. Tests preserve this negative and no deduplication or policy relaxation is implemented. Existing one-batch coverage retains value/count behavior while removing its obsolete private DO NOTHING assertion. No new tracked file, controller, API, schema, DTO, permission key, helper, migration, code comment or live Ticket comment. The two source files stay299/218 lines; focused spec/fixture stay255/241 and the pre-existing large compatibility spec shrinks666→664.

Coordinator verification:11 focused/compatibility suites181 tests, exact five-file ESLint zero warnings/diff, scoped test TypeScript and official production `pnpm -C backend typecheck` pass. The focused set includes83 authority/renewal tests, seeded role rank/security/preservation/audit, flat revocation/write-gates, tenant group writes, grant-sampling and batch ceilings. Author10/168 and test-owner3/117 sets overlap and are not summed. Independent reviewer module_grants_resume and coordinator matched all five frozen SHA256 values and cleared the full source/test delta. Official backend freshness self-test/check passes4107 operations/4092 Zod/4107 exposure stamps; frontend vendor6 self-tests/check and generated Build93 self-tests/fresh310 hook-called operations pass at unchanged SHA1e8635e76e00a9c863db00de88fe655242b2e7a4b59054694b77ec29f3578153. No generated artifact needed regeneration or hand editing.

Current unverified: the fixture interprets compiled SQL and models assignment/grant/journal/rollback state; it proves no live PostgreSQL unique-index readiness, lock wait, effective Access, permission-version change, physical cache/event or persistence result. No API/database/browser/mobile/deployment/operations call was performed for41. Root preserves44 outer and47 backend unrelated changed-file hashes. Standing and invitation expiry writers remain excluded follow-ups; this two-command correction cannot close ARC-01 or all BLD-MODULE-REGRANT-02 clauses. Full backend test TypeScript remains failed by its recorded10GB exhaustion and was not rerun; full frontend spec, unowned KB/provider and release size gates remain open/failed. No full D/I/T/R/B/L stage or task checkbox advances.

Reproduce focused root command:

```powershell
pnpm -C backend exec jest --runInBand --runTestsByPath src/modules/module-access/__tests__/module-assignment-authority.spec.ts src/modules/module-access/__tests__/module-access-groups-rank.spec.ts src/modules/module-access/__tests__/module-access-groups-security.spec.ts src/modules/module-access/__tests__/module-access-preservation.spec.ts src/modules/module-access/__tests__/module-access-new-capabilities.spec.ts src/modules/module-access/__tests__/module-access-audit.spec.ts src/modules/module-access/__tests__/flat-member-revocation.spec.ts src/modules/module-access/__tests__/flat-member-write-gates.spec.ts src/modules/module-access/module-access-group-members-tenant-isolation.spec.ts src/modules/rbac/__tests__/role-assignment-grant-sampling.spec.ts src/modules/rbac/__tests__/role-assignment-batch.spec.ts
```

## Testing Decisions

For every closure record: frontend/backend/worker revisions; environment and synthetic tenants; actor/principal and exact role/grant; initial state; action; persisted DB/API result; console/network; audit/outbox/job/cache evidence; unauthorized/cross-tenant negative; responsive path. Existing focused tests support closure but cannot substitute browser/persistence/deployment evidence.

Gate sequence: invite acceptance → module assignment → client grant. Then membership discovery/Member contribution → filters/current cycle → release/program links → usable triage/forms/reports. Advanced whiteboard/ops breadth stays Deferred.

## Out of Scope

Claiming any bug fixed by documentation or running destructive production tests. Missing target-environment proof stays open.

## Further Notes

Detailed authorization risks remain separately documented in [RBAC review](../governance/rbac/README.md). Evidence cleanup removes duplicate copies only, never the sole report supporting an open finding.

## Delivery checklist

Track completion in the [requirement ledger](../implementation/REQUIREMENT-LEDGER.md) and [work claims](../implementation/WORK-CLAIMS.md). An unchecked item stays open until evidence is recorded on the current branch.

- [x] Preserve the historical BUG/PM/UX chronology and map each named finding to a planned seam and closure evidence in [Implementation Decisions](#implementation-decisions) and [research traceability](./research-traceability.md#adopted-decisions-and-bug-hooks).
- [x] Record the enqueue-time delivery correction at backend `9046fc768` and focused 8-suite/170-test evidence; replay, manual resend, worker failure, and runtime closure stay open.
- [x] Correct BLD-INVITE-ATOMIC-02 after tracing the tenant-aware database proxy and passing four focused commit/rollback service tests; target database and worker concurrency proof remain open.
- [x] Correct the BLD-INVITE-REPLAY-03 source hypothesis after tracing the outer consumer transaction, nested savepoint, and unique inbox completion fence; target database crash proof remains open.
- [x] Trace PM-001 from internal invite through grant, guest acceptance, and external reads in the [client portal activation source audit](./client-portal-activation-gap.md); deployed behavior remains unverified.
- [x] Record the setup plan-eligibility source gap and backend `9fd0b94d2` correction with five suites/109 focused tests, typecheck, and lint; target plan/browser proof remains open.
- [x] Record the revocation source correction at backend `f3d962afe` with 343 module-access tests plus focused access/snapshot checks; group-grant and runtime proof stay open.
- [x] Record the direct role and accepted ownership-transfer regrant correction at backend `876b6f1e1` with 7 suites/84 focused tests, typecheck, and lint; group-grant and runtime proof stay open.
- [x] Record backend `9dc80badb` manual resend queue-truth source slice: 31 focused and 44 related tests, typecheck, and lint pass; owner status, worker, and target database proof remain open.
- [x] Publish the resend queue-outcome OpenAPI at backend `d6bf011f5` and validate the frontend contract at `a48b731cb` with two suites/eight tests, scoped lint, and vendor diff checks; delivery proof remains open.
- [x] Require an exact resend response at frontend `306b0a636` and present queue acceptance, provider/suppression failure, and confirmed join-link recovery at `1f608bc96`; focused contract/UI tests and scoped lint pass, browser and worker proof remain open.
- [x] Add event-scoped setup recipient receipts at backend `e1001a934` with a journalled, reversible migration and same-org references; 104 setup tests, 38 migration-integrity tests, production typecheck, and lint pass. Database and browser proof remain open.
- [x] Reproduce each open high-priority finding on a named current frontend/backend/worker revision, actor, tenant, and initial state; keep contested BUG-007 unattributed until its original condition is reviewed.
- [x] Verify invite acceptance, Build standing, and client grant activation in that order with actual membership/grant rows, usable entry, retry, and wrong-identity/project negatives.
- [ ] Close BLD-INVITE-DELIVERY-01, BLD-INVITE-ATOMIC-02, BLD-INVITE-REPLAY-03, BLD-INVITE-RESEND-04, BLD-INVITE-STATUS-PROVENANCE-05, BLD-MODULE-REVOKE-01, and BLD-MODULE-REGRANT-02 with exact source corrections or disproval, focused negatives, persisted event/access state, cache behavior, and owner/member browser paths.
- [x] Resolve BLD-MIGRATION-CHAIN-01 before claiming cold database reliability; verify the `0965` prerequisite against a disposable database and preserve migration history.
- [ ] Attach network/console, audit/outbox/cache, target DB, responsive, and unauthorized-role evidence before marking an individual bug closed.

### Invitation acceptance automatically activates Build Member standing — 2026-10-04

Claim42 (cd0cd105a), supporting BT-cdb5efcb8a3a and BT-b62ed948b0cd, adds observation22 to the existing [sanitized runtime artifact](evidence/2026-10-03-build-inbox-runtime.json). Reviewed local runner15000 at isolated backend120545d96 used synthetic-only writes and local captured mail, with providers/workers disabled, and is now stopped. Current main backendd2863e8d8 separately passes13 existing invitation/auth suites and152 tests; this older runtime does not prove source41 expiry renewal. No application files, generated artifacts, migrations or code comments changed.

Current verified: one fresh reserved Member invitation with explicit Build MEMBER standing returned201; completed key replay retained its ID and a valid changed request returned422. The invalid ADMIN enum probe correctly returned400 and is distinct from that conflict. Canonical pinned Zod response schemas parsed the owned invitation/join/OTP/accept/magic/session/identity/Access/empty-Build responses. Missing OTP returned400; wrong OTP returned401 and persisted attempts1 with zero user/membership/grant/accepted-event/magic/session side effects. Correct OTP returned200; the stored invitation attributes acceptance to ACTIVE, nonowner MEMBER142. READ ONLY streamline_app proof finds structural Member2048 and Build Member2068 only, one ACCEPTED event, one accepted-seat receipt (delta0, billed count3), used OTP11/attempts2, used org-bound magic receipt and one live returned session. Replays return invitation404 and magic401 without duplicate records or assignment identities. Audit933 correlates the module grant; permissions version13→15 matches fresh Access.

Fresh /me and /me/access identify the actual human Member142, Build enabled/build:view=all, no organization-management permission, and stable repeat reads; /build returns200/empty. No project membership or module ownership is created. Private project54 returns real403, while its owner control returns200. Other synthetic owner receives404 for that same positive project and omits the exact invitation in its normal200 list. Member invitation management read/write returns real403. A valid session proof targeting the other reserved organization returns product403; a fresh nonce targeting the invited organization returns200. Other-tenant READ ONLY RLS hides the exact invitation, intent and assignment rows.

Current verified catalog: app is non-superuser/non-BYPASSRLS and cannot inherit table ownership; required indexes are ready/valid and FKs/checks validated. Invitations support tenant/public-token lookup with tenant-only writes; invitation_module_access and role_assignments have tenant RLS. OTP/magic/session tables intentionally use global identity/capability boundaries; exact joined locators do not prove tenant RLS for them. OTP DELETE is present beyond1611 explicit SELECT/INSERT/UPDATE grants. IMA has separate organization/invitation FKs, not a same-org composite FK. Current pending-invitation index follows0667 status=PENDING, while Drizzle declares accepted_at IS NULL; record this existing drift for its owning future package. No schema change belongs to42.

Current unverified: matching desktop/mobile (frontend1002 approval pending;1000 uses deployed API), portal1730/1731/client grant activation, OrgAdmin/multi-module/existing-user and authority/disable/concurrency cases, rollback after OTP consumption, physical cache/worker/provider/crash recovery and deployment/operations. Auxiliary nonempty invitation/owner-project JSON controls were checked by status/envelope/identity, not raw backend z.date parsing. The other owner has no visible project, so a new Member read of a positive foreign project remains unproven. Whole BT tasks and every broad stage remain partial/open;110 checked/412 open. Independent sanitized-artifact/source review is CLEAR at snapshot6ad13f906287cb808d546a47c609afec504b9c18c38b3d257a83797842c1c03b; earlier21 observations and all top-level metadata are preserved. Review does not repeat the database/API/browser run.

### OPS production probes — 2026-10-04

Read-only SQL via IAM (iam-run.mjs) and authenticated GET HTTP probes using a minted backend JWT (AUTH_SIGNING_KEYS Ed25519, sub=userId=3a99283a-40be-4758-953b-458548e064fa, orgId=871a5fd2-df81-4e79-a097-9910d6640a01, role=ORG_ADMIN, sessionId=4b075d60-e518-40f0-90c5-4001e9573644) against deployed https://api.streamlineos.in. Deployed backend revision52421c5f3fef (from /health/version). Frontend https://www.streamlineos.in HTTP200 via Vercel (X-Vercel-Cache: MISS, Server: Vercel). Health/ready: database683ms (up), cache5ms (up), queue4ms (up), providers skipped (none declared). Bogus unauthenticated route /this-bogus-route-xyz returned404; frontend /this-bogus-route-xyz returned404 — control probes confirm probing is not vacuous.

Outbox: 691 DELIVERED/ACTIVE oldest 2026-09-12T05:22Z, 0 PENDING, 1 DEAD (realtime.token-revocation, 2026-09-21T07:58Z). Dead-letter is isolated and does not repeat. Inbox consumer totals (COMPLETED): build:ticket-status-changed116/max_ver4, chat:message-fanout54/max_ver60, organization:setup-completed38/max_ver1791127898417, billing:revenue-event22/max_ver1, expenses:submitted3/max_ver1, surveys:survey-response-submitted1/max_ver1789712988299, build:blocker-created1/max_ver1. SKIPPED: build:ticket-status-changed327, build:release-published2, build:blocker-created1. Zero stalled IN_FLIGHT rows older than 10 minutes. DEFECT: two consumers carry epoch-scale aggregate_version values that predate migration-1398: organization:setup-completed has 38 rows with max_ver=1791127898417 and surveys:survey-response-submitted has 1 row with max_ver=1789712988299; any future event for those consumers with a normal ordinal version will fall below the watermark and be considered already-processed.

Migration ledger: 1090 rows in drizzle.__drizzle_migrations, latest_hash=ffbe1ba8d42a9481089f434eab5dba5af7253f62f432ac8cae9ee10018f50079. Journal has 1078 entries, last idx=1205, last tag=1905_build_import_adapters. File 1905_build_import_adapters.sql is the sole unapplied migration (present in backend/migrations/ and pending/). Build scan evidence (pg_stat_all_tables, schemaname in build/build_events): tickets seq_scan=14776 idx_scan=76676 last_idx_scan=2026-10-04T12:34Z; project_members idx_scan=74202 last_idx_scan=2026-10-04T09:55Z; cycles idx_scan=1281 last_idx_scan=2026-10-03T13:49Z (confirming cycles is live as sprint replacement); project_approvals seq_scan=16342 idx_scan=24098. Organizations: 51 total, 50 onboarded, 30 active projects (status=ACTIVE). org_permission_versions table absent (NULL from to_regclass).

CRITICAL DEFECT (BLD-BUILD-PROJECT-500): GET /build/:projectId and all sub-routes return HTTP500 for all tested paths: /build/6 (500, correlationId 301ed8fc-06a0-4871-91d4-22318e7cc931), /build/6/tickets (500), /build/6/members (500), /build/6/approvals (500), /build/6/milestones (500), /build/6/cycles (500), /build/6/risks (500), /build/6/releases (500), /build/6/epics (500), /build/6/reports/velocity (500), /build/6/reports/burnup (500); 11 of 19 project-scoped probes return 500, the rest 404 (unregistered routes). Org-level routes work: GET /build (project list) 200, GET /org/members 200 — confirming auth and the plain-select path are functional; the Drizzle relational query API (db.query.projects.findFirst) inside the tenant-aware proxy is the candidate failure point. This matches the previously-observed HTTP500 noted in BT-be12f9c005dd source. SECURITY DEFECT: GET /build/9 (a project from a different org) returns 500 (correlationId ba60dbf8-dbe1-42ff-a249-b2a541d1f139) instead of 404; the crash precedes the tenant isolation check so isolation posture cannot be confirmed. Sprint tombstone confirmed: GET /build/6/sprints returns410 Gone ("Sprints are frozen. Use /build/:projectId/cycles"). Routes returning 404 (unregistered or intentionally removed): goals, inbox, roadmap, portfolios, workstreams, module-access, auth/session-exchange.

Compatibility removal evidence (BT-eb6f8a7ac452): sprint_id column absent from build.tickets (information_schema.columns sprint_id_exists=false); build.sprints=NULL (dropped); build.bugs=NULL (dropped); build.bug_work_item_map: table present, 0 rows; build.pm_workspaces=NULL (dropped). No compatibility path is reachable; exit condition satisfied.

### BT-23db4a25ef53 — high-priority finding reproduction — 2026-10-05

Frontend HEAD `41a274f1d` · Backend HEAD `c8594f28f9` · replay2 PostgreSQL local DB.

| ID | Severity | Actor | Tenant | Initial state | Method | Result | Evidence |
|---|---|---|---|---|---|---|---|
| BLD-BUILD-PROJECT-500 | Critical | org admin, human session | production org `871a5fd2` | all project-scoped routes returning 500 at deployed `52421c5f3fef` | code-path trace + SQL probe + spec | DOES NOT REPRODUCE at backend HEAD | `f4a9e9e0c` fixes SQLSTATE 42702: `memberRole: relationship.memberRole` → `sql\`${relationship.memberRole}\`` in `project-access.ts:137`; `9cd440824` fixes SQLSTATE 42703: CRM join `bp.id` → `bp.party_id`; `project-access-projection.spec.ts` 4/4 passing; SQL probe on replay2 confirms `SELECT role FROM build.project_members JOIN public.organization_members …` still raises 42702 without qualification, proving the fix is load-bearing |
| BLD-BUILD-PROJECT-500 (cross-tenant 500→404) | Critical (security) | org admin | foreign org | cross-tenant request returning 500 instead of 404 | code-path trace | DOES NOT REPRODUCE at backend HEAD | Same fixes above; `resolveProjectAccess` can now execute past the query, so NotFoundException is reachable on a missing/foreign project |
| BUG-007 | — | — | — | contested/scrubbed CI log observation | original evidence review | CONTESTED PENDING REVIEW | Per task: do not attribute; original condition not reviewed; status withheld until independent review of the exact CI artifact |
| BLD-INVITE-DELIVERY-01 | High | org owner, setup flow | any | `bulkInvite` suppressed/no-provider path | code-path trace | CANNOT REPRODUCE LOCALLY | Source fix at `9046fc768` present in HEAD; target DB event/outbox rows, owner status after refresh, and recovered delivery require a running app |
| BLD-INVITE-ATOMIC-02 | High | org owner | any | concurrent invite + outbox transaction | code-path trace | CANNOT REPRODUCE LOCALLY | Source confirmed correct (tenant-aware Drizzle proxy shares transaction); DB crash/concurrency proof requires a running app |
| BLD-INVITE-REPLAY-03 | High | outbox consumer | any | post-commit replay | code-path trace | CANNOT REPRODUCE LOCALLY | Source inbox fence confirmed correct; DB crash-before-ack proof requires a running app |
| BLD-INVITE-STATUS-PROVENANCE-05 | High | org owner | any | multiple invitations same recipient | code-path trace + SQL | CANNOT REPRODUCE LOCALLY | Source fix at `e1001a934` in HEAD; replay2 has `organization_setup_invitation_receipts` table; deployed behavior open |
| BLD-ONBOARDING-PLAN-01 | High | org setup actor | any | setup module selection without plan lock | code-path trace | CANNOT REPRODUCE LOCALLY | Source fix at `9fd0b94d2` in HEAD; DB/browser proof requires running app |
| BLD-INVITE-RESEND-04 | High | org admin | any | manual resend without delivery outcome | code-path trace | CANNOT REPRODUCE LOCALLY | Source fixes at `9dc80badb` `d6bf011f5` `a48b731cb` `306b0a636` `1f608bc96` in HEAD; worker/provider/browser proof requires running app |
| BLD-MODULE-REVOKE-01 | High | module admin/owner | any | revoke standing while role grants active | code-path trace + SQL | CANNOT REPRODUCE LOCALLY | Source fix at `f3d962afe` in HEAD; `user_module_access` table with tenant RLS policy exists on replay2; cache/session/runtime proof requires running app |
| BLD-MODULE-REGRANT-02 | High | authorized regranter | any | regrant while per-user deny active | code-path trace | CANNOT REPRODUCE LOCALLY | Source fix at `876b6f1e1` in HEAD; `writeUserModuleAccessOverride(enabled=true)` clears deny in same transaction; target DB/cache/browser proof requires running app |
| BLD-MIGRATION-CHAIN-01 | High | cold DB replay | — | empty database → complete journal from `0000` | SQL on replay2 | CANNOT REPRODUCE LOCALLY (chain failure) | Prerequisite migration `0941a_invitations_org_id_unique_prerequisite` is in the journal before `0965`; replay2 has `uniq_invitations_org_id_setup_receipts` on `(org_id, id)` and FK `fk_invitation_events_invitation_id_org` both valid; cold-empty-DB disposable proof requires a separate empty database |
| BUG-001/PM-011 | High | invite recipient | any | cold invite acceptance, intermittent blank | no running app | CANNOT REPRODUCE LOCALLY | Requires cold browser session, OTP/magic-link, onboarding destination resolver; invitation acceptance corrections across multiple commits are in HEAD |
| BUG-002/PM-002 | High | invited member | any | org invite → Build standing | no running app | CANNOT REPRODUCE LOCALLY | Source corrections at `9046fc768` `876b6f1e1` `f3d962afe` in HEAD; module standing runtime proof absent |
| BUG-003 | High | tester | any | project membership scope | SQL on replay2 | CANNOT REPRODUCE LOCALLY | RLS tenant isolation confirmed on replay2 (scoped to org_id); assigned vs unrelated project positive/negative requires a running app with a seeded membership |
| BUG-004 | Medium | org member | any | client access page CTA | no running app | CANNOT REPRODUCE LOCALLY | UI/browser required |
| BUG-005/PM-001 | High | org admin | any | grant client access → false success | no running app | CANNOT REPRODUCE LOCALLY | Portal module in excluded paths; `ARCH-17-CLIENT-PORTAL-ACCESS` canonical activation command not yet deployed; source audit in `client-portal-activation-gap.md` |
| BUG-006 | Medium | org admin | any | grant access project picker | no running app | CANNOT REPRODUCE LOCALLY | UI/browser required |

BLD-BUILD-PROJECT-500 is the only finding that reproduces (at production revision `52421c5f3fef`) and DOES NOT REPRODUCE at HEAD (`c8594f28f9`). Both root causes are fixed and the regression spec passes. All other findings are source-corrected or runtime-only; no new fix was written because the source corrections are already in HEAD. BUG-007 remains contested pending original-condition review.

Per-ID state: BT-47a503e85f08 BLOCKED — HTTP500 on all project routes prevents revision parity verification beyond /health/version; BT-be12f9c005dd BLOCKED — HTTP500 confirmed still present at deployed revision52421c5f3fef; BT-07d9bb61b606 IMPLEMENTED_PENDING_BROWSER — database scan counts, deployed revision, cache/queue/worker health (0 stalled IN_FLIGHT) all recorded; browser proof open; BT-b5eef5ed02df IMPLEMENTED_PENDING_BROWSER — queue lag=0 PENDING, 1 DEAD-letter, inbox COMPLETED rows recorded; browser proof open; BT-8559cdc0ef76 IMPLEMENTED_PENDING_BROWSER — migration count (1090), cache/worker health, sprint tombstone (410) recorded; rollback browser path open; BT-09e0fa99b83e IMPLEMENTED_PENDING_BROWSER — performance budgets require real browser; BT-c594de9962ba BLOCKED — cross-tenant probe returns 500 not 404; tenant isolation posture unconfirmed; BT-7db744643124 IMPLEMENTED_PENDING_BROWSER — DB/outbox/worker evidence above; browser funnel open; BT-2a10d30fcbee BLOCKED — HTTP500 prevents all screen/route/component runtime evidence; BT-eb6f8a7ac452 COMPLETED_WITHOUT_BROWSER_REQUIREMENT — all compat tables/columns confirmed removed or empty.
