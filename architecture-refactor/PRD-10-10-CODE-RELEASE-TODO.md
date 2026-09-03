# StreamlineOS code-release remaining-work PRD

Status: active — single authoritative backlog
Last reconciled: **2026-09-03** against committed heads `4ade571fa` (frontend/root) and `7ba91e37` (backend). This pass used current Git/source metadata and the checked-in ticket evidence; heavy scans, builds, typechecks and test suites were deliberately not run after the user requested that the system not be hung.

> **Use the Current completion and Current remaining execution list below for present status.** Ticket 40 and the later verification sections are historical evidence for former heads; they must not override this 2026-09-03 reconciliation.
Scope: all platform domains except CRM and Inventory

This file contains only remaining acceptance work. Completed checklist items and the temporary session documents were removed after current-source reconciliation; their evidence remains in Git history. A missing checkbox must never be interpreted as waived work: every removed checkbox was either previously evidenced or freshly re-verified below.

## Current completion

- The former 42-ticket execution set is retained under `.scratch/code-release-10-10/issues/` as historical evidence: **252 of 296 acceptance boxes closed (85.1%)**, **41 open**, **3 partial**, and **23 of 42 tickets fully closed** at its last reconciliation.
- The authoritative remaining-work set is now **36 vertical-slice tickets** under [`.scratch/code-release-10-10-v2/issues/`](../.scratch/code-release-10-10-v2/issues/) with a checked-in [traceability manifest](../.scratch/code-release-10-10-v2/TRACEABILITY.md). It assigns all **195 current unchecked PRD criteria** to exactly one ticket.
- The immediate PRD below now shows **37 checked and 138 unchecked aggregate criteria**. Ten module-evidence criteria were restored for Home, Directory/Me, HRMS, Build/PM, Workflows, Billing/Payments, Accounting/Finance, Chat, Notifications and shared adapters so their completion cannot rest on deleted historical text.
- Deferred production/compliance criteria remain **34 open** and are not counted as code-level completion.
- Tickets 41 and 42 remain the release endgame: one-commit verification and the release-authority record cannot close until the remaining code/decision/operator items are resolved or formally dispositioned.
- Code-level 10/10 is **not yet reached**, but the repository is substantially closer than the superseded ticket-40 snapshot reported.

### Current remaining execution list

- [ ] **[PRD-C001]** **Schema/contracts:** complete v2 ticket 02's cross-repository reachability, canonical-key and safe-deletion criteria, then v2 ticket 03's current-head catalog parity evidence.
- [ ] **[PRD-C002]** **AI:** complete v2 ticket 17's streaming, cancellation, deadline, structured-output, citation, credit and frontend failure-state criteria.
- [ ] **[PRD-C003]** **Authorization/security:** complete v2 ticket 22's live BOLA/IDOR, valid mutating-body, same-tenant control, abuse-protection and privacy criteria.
- [ ] **[PRD-C004]** **Organization/RBAC/Settings:** complete v2 ticket 05's organization authority, module permission, owner/descendant protection, cache invalidation, contract and frontend criteria.
- [ ] **[PRD-C005]** **Query/database cost:** complete v2 ticket 18's bounded projection, N+1, tenant-predicate, index, pagination, cache and invalidation criteria, then retain performance evidence in v2 ticket 29.
- [ ] **[PRD-C006]** **Frontend speed:** complete v2 ticket 29's production-build Web Vitals, bundle, rendering and interaction budgets while preserving completed lazy-loading, virtualization and hydration gains.
- [ ] **[PRD-C007]** **TanStack:** complete v2 ticket 19's permissioned-read, required-identifier, query-key, pagination, runtime parsing, cancellation, invalidation and optimistic-update criteria.
- [ ] **[PRD-C008]** **Calendar/Inbox/Knowledge:** complete v2 tickets 13, 14 and 16 respectively, including provider drift, sync correctness, bounded read paths, ACL-aware retrieval and current performance evidence.
- [ ] **[PRD-C009]** **UX/accessibility:** complete v2 ticket 20's in-scope responsive, keyboard, screen-reader, loading, empty, error, offline, permission and retry states.
- [ ] **[PRD-C010]** **Uploads/operator cutover:** complete v2 ticket 21's code lifecycle and v2 ticket 34's deployed private-bucket/backfill evidence before cutover.
- [ ] **[PRD-C011]** **Gate integrity:** complete v2 ticket 30's bite-proven architecture/release gates and portable verification harness.
- [ ] **[PRD-C012]** **Repository hygiene/types:** complete the v2 tickets 24–27 expand–migrate–contract sequence for unused symbols, dead surface, unsafe assertions, dependency cycles and dependency proof.
- [ ] **[PRD-C013]** **Handlers:** complete v2 ticket 28's named-handler, thin-entry-point, cohesion and justified file-size-exception criteria without meaningless wrapper chains.
- [ ] **[PRD-C014]** **Current P0/P1 audit:** resolve or formally disposition Payroll financial-integrity gaps in v2 ticket 08, notification/email permission and delivery gaps in v2 ticket 15, security findings in v2 ticket 22, and every surviving P0/P1 before v2 ticket 31.
- [ ] **[PRD-C015]** **Release harness:** complete v2 ticket 30 by removing absolute workstation paths and resolving both repositories from the workspace or explicit validated arguments on Windows, macOS and Linux.
- [ ] **[PRD-C016]** **Final integration:** complete v2 ticket 31 at one clean frontend/backend commit pair, then v2 ticket 36's deployed release-authority record; interrupted, skipped and prerequisite-blocked gates never count as passing.
- [ ] **[PRD-C017]** **PRD-to-ticket traceability:** complete v2 ticket 01 and keep its manifest fail-closed so every PRD criterion has exactly one ticket owner, ticket-only criteria are rejected and the restored module evidence cannot disappear again.

### Module checklist history from ticket 40

**Recomputed from disk 2026-09-03. Do not carry these forward — re-derive them.**

The *Proven* column is **not re-derivable from this file**, because the header above records that completed checkboxes were deleted. It is re-derivable from git: this table was added by `731d688ab` and its rows are a verbatim per-subsection count of §10 at the pre-collapse commit **`10c06d01c`** (18 subsections, 124 boxes). Today's §10 holds 27 boxes. Every *Proven* number is therefore a measurement of a **former head**.

| Area | Proven | Open | Coverage | Basis |
|---|---:|---:|---:|---|
| Authentication/identity/organization | 6 | 1 | 86% | ticket 19 box 34 `[x]` closes PRD §10.1 box 2 |
| Organization and module RBAC | 4 | 1 | 80% | ticket 19 box 21 `[x]` closes PRD §10.2 box 2 |
| Home | 9 | 0 | 100% | **NOT-VERIFIED** — no §10.x text, no ticket, no report |
| Settings | 3 | 2 | 60% | one box open, one box **unowned** |
| Directory/Me | 5 | 0 | 100% | **NOT-VERIFIED** — no §10.x text, no ticket, no report |
| HRMS | 6 | 0 | 100% | **NOT-VERIFIED** — no §10.x text, no ticket, no report |
| Payroll | 5 | 1 | 83% | **CONTESTED** — ticket 24 is 8 of 8 `[x]`, but four payroll residuals are recorded open and one is confirmed on disk (see note) |
| Build/PM | 7 | 0 | 100% | **NOT-VERIFIED** — no §10.x text, no ticket, no report |
| Workflows | 5 | 0 | 100% | **NOT-VERIFIED** — no §10.x text, no ticket, no report |
| Billing/payments | 7 | 0 | 100% | **NOT-VERIFIED** — no §10.x text, no ticket, no report |
| Accounting/finance | 5 | 0 | 100% | **NOT-VERIFIED** — no §10.x text, no ticket, no report |
| Chat | 10 | 0 | 100% | **NOT-VERIFIED** — no §10.x text, no ticket, no report |
| Calendar | 6 | 2 | 75% | one product decision, one **unowned** box |
| Inbox/mail | 4 | 1 | 80% | ticket 29 box 65 `[x]` closes PRD §10.14 box 2 |
| Notifications | 8 | 0 | 100% | `hooks/api/notifications-inbox.ts` carries 11 `onMutate`/`onError` pairs |
| Knowledge/Wiki/Chatbot | 6 | 2 | 75% | ticket 29 box 81 `[x]` closes PRD §10.16 box 1 |
| Shared adapters | 6 | 0 | 100% | **NOT-VERIFIED** — no §10.x text, no ticket, no report |
| Frontend system-wide | 3 | 3 | 50% | §10.18's ceiling box flipped `[x]` in `e5fed52a8`; the old 2/4/33% was never updated |

A 100% module row means its module-specific checklist is closed. It does not override open cross-cutting gates below.

**Nine rows marked NOT-VERIFIED above — Home, Directory/Me, HRMS, Build/PM, Workflows, Billing/payments, Accounting/finance, Chat and Shared adapters, 60 carried "Proven" boxes — rest entirely on deleted text.** There is no §10.x subsection, no ticket in `.scratch/code-release-10-10/issues/` and no report for any of them; module-matrix tickets exist only for 19, 24 and 29. Their `Open = 0` is trivially consistent. To restore them as evidence, either recover the removed `[x]` blocks from `git show 10c06d01c:architecture-refactor/PRD-10-10-CODE-RELEASE-TODO.md`, or give each module a ticket carrying box-level acceptance state.

**Payroll is contested and is deliberately not shown at 100%.** Ticket 24's eight acceptance boxes are all `[x]`, and its central artifact is real: `migrations/1030_t24_payroll_tds_ytd_immutability.sql` exists **and is journalled** (idx 790), alongside `0445_payroll_locked_run_immutability.sql` and `1001_s08_payroll_financial_immutability.sql`. Against that, the findings registers record four unresolved payroll items, and one was re-confirmed on disk this pass: **`payroll_bank_batch_items` carries no UNIQUE constraint in any migration**, so it has no natural key on `(batchId, runEmployeeId)`. The other three — the TDS ledger replacing where it should accumulate, a run with FAILED bank items still marked `PAID`, and `writeTdsYtdLedger`/`importBankReturn`/`refreshBatchPaidStatus` being untested — are recorded but were **not** re-verified this pass. The row stays below 100% until a single owner holds both halves.

**Historical defects in this table's construction:** the former ticket set left five PRD boxes without an owner, four ticket boxes without a PRD counterpart and three partial boxes without representation. The v2 [traceability manifest](../.scratch/code-release-10-10-v2/TRACEABILITY.md) supersedes that mapping and assigns every current unchecked criterion exactly once; this former-head table remains historical evidence only.

## Superseded ticket-40 verification snapshot

> **SUPERSEDED — this whole section was measured on 2026-09-02 and describes a former head.** Ticket 40 re-ran every gate in both repositories on 2026-09-03; the numbers below did not survive. Read `.scratch/code-release-10-10/reports/40-prd-reconciliation.md` §3 and §4 instead. The corrections that matter most:
>
> - **Now green, stop citing as failing:** cross-tenant isolation declaration coverage is **929/929 (100%), exit 0** (was "fails 921/923"); `check:tenant-indexes` is **840/840** (was 745/745, and 821/828 on the declaration side); `kb-rag.service.ts` is **253 lines** (was the 367-line over-300 regression); the dead barrel `features/build/inbox/index.ts` is **removed**; the frontend hard-500 gate **now exists**; Web Vitals breaches are **2, both TTFB** (was six); the journal/`.sql` gap that named six missing migrations is **cleared, 0 missing**.
> - **Now red, do not cite as passing:** `check:unbounded-reads` (**exit 1** — the 0/0 counters still hold, the classification is stale); `check:db-call-count` (**exit 1**, 10 stale verdicts vs a ratchet of 2); route bundles (**17 breaches across 12 measured routes**, not "pass for all five"); the command catalog (**exit 1**, 4 against a baseline of 0); backend `check:over-300` (**400 vs baseline 394**); frontend `check:routes`, `check:properties`, `check:import-direction`, `check:file-sizes` and both `check:dead-code` gates.
> - **Counts that merely moved:** cycles now scan 5,528 backend / 5,264 frontend files (both still zero); module registration is 218 declared / 217 reachable; the hard-size gate scans 3,571 files with 7 exceptions; `check:client-pages` is 141 of a 304 ceiling; `check:route-thinness` in-scope thick is 0.

Measured on 2026-09-02; each item states whether it passes or remains open:

- Backend hard-size gate passes: 3,483 files scanned, all within 500 lines with 12 registered exceptions. The former 506-line RBAC roles and 508-line Support KB implementations were split by cohesive responsibility and their callers repointed.
- Backend over-300 ratchet currently fails: 395/3,483 against the approved baseline of 394; the single regression is `src/modules/ai/core/services/kb-rag.service.ts` at 367 lines after public KB streaming work.
- Frontend over-300 ratchet passes: 518/5,032 against the baseline of 519; a direct current-tree audit found zero applicable frontend production files above 500 lines, but a fail-closed frontend hard-500 gate is still required by section 2.2.
- Architecture-rule gates that did not exist before this round: `check:kebab-case` (6,049 entries, 0 violations), `check:import-direction` (208 `src/common` files, 0 new violations over a 9-entry named baseline) and `check:module-registration` (216 module classes, 215 reachable from `AppModule`, 0 unreachable). `check:over-300`'s self-test previously asserted only its own constants and never ran the scan; it now writes a known-bad fixture tree and is bite-proven twice.
- Six `support/core` suites that had been red long enough to reproduce at a clean HEAD worktree are green: 33 suites / 286 tests. Repairing their doubles surfaced a live defect — `splitTicket` called `createTicket` without a `membershipId`, so **every split-ticket request returned 403** on a permission-gated route that looked healthy.
- Seeded disposable E2E harness: **6/6** (was 2/6), plus a cross-module GDPR privacy artifact at **2/2** run through the real HTTP stack. The harness now refuses a database whose name lacks `scratch`, and can enable a module — without which every plan-gated permission resolved `NO_MODULE` and a correct grant was indistinguishable from a denial.
- Cross-tenant isolation declaration coverage currently fails: **921/923 declared**. `src/modules/rbac/role-seed.service.ts` and `src/modules/support/core/support-kb-engagement.service.ts` lack cross-tenant negative tests; the executable isolation suite remains mandatory because the declaration gate is static.
- Import direction: **zero** `src/common/** -> src/modules/**` imports in production code. All nine baseline entries were relocated to neutral seams and `check:import-direction` now enforces an empty baseline, so the debt cannot reappear.
- Static dependency-cycle scans at current working tree: backend processed 5,330 files and frontend processed 5,044 files, both reporting zero circular dependencies. The additive cycle criterion remains open until the gates are fail-closed and bite-proven against known compile-time, barrel and NestJS DI cycle fixtures.
- Unbounded-read gate passes across 2,186 service files with zero actionable offsets, unbounded reads or unordered paging. Database-call classification passes with 37 classified loop-internal candidates and zero actionable call sites.
- Contract registry passes with 3,625 classified operations (101 published) and 24 events; 12 removed-operation records remain intentionally retained for deprecation/breaking-change enforcement.
- Migration discipline, chain and ledger: 635/635 applied, zero pending/orphan/duplicate/unreachable entries. Current-head cold-bootstrap/catalog parity remains open below.
- Tenant relationships had zero actionable findings at the fully bootstrapped 634-entry evidence database. Current-head 635-entry proof is open because the configured target was observed mid-bootstrap.
- Tenant indexes: 745/745.
- RLS verification and retention coverage.
- Permission catalog: 3,116 usages, 627 unique used keys, all valid in backend and frontend catalogs.
- Route classification: 3,602 handlers, zero undeclared.
- OpenAPI coverage: 3,613/3,613 operations have exposure, response and 4xx schemas; 1,371/1,371 mutating operations have request schemas.
- Bounded contracts, bulk-id limits, cache invalidation, idempotent commands, fire-and-forget notification checks and outbox consumers.
- Frontend client routes: 256/600, 48 below the ceiling.
- Command catalog: 1,504 mutation hooks with zero unclassified commands and 70 gated-read hooks with zero invalid permission contracts. The previously missing Chat status, invoice-void and Support KB attachment-download operations are reconciled with backend routes.
- Frontend dead-code analysis has zero unclassified findings and one dependency-proven dead file, `features/build/inbox/index.ts`, still to remove. Route bundles pass for all five measured routes; Web Vitals still breach six mobile/desktop budgets.
- Payroll database integration: 1 suite / 14 tests passed against the current database, closing the former unapplied-`0933` blocker.
- **Current-head database evidence, journal head 637 — [bootstrap-head-637/](final-refactor/evidence/bootstrap-head-637/README.md)** (release SHA, every command run, database identity, dataset shape, journal hash and count, catalog diff, sanitized logs and artifact hashes). Two independent clean bootstraps (`scratch_boot_b`, `scratch_boot_c`) each reached `REACHED_HEAD 637/637`, exit 0, **637 OK / 0 SKIP / 0 FAIL**; re-runs were **0 OK / 637 SKIP**. A real `kill -9` at OK_count=346 with entry 347 in flight left the ledger holding exactly 346 rows and **0 of that migration’s 4 columns**; the resume was **291 OK / 346 SKIP** to `REACHED_HEAD 637/637` (346 + 291 = 637), with the historically defective `0628`/`0652` pair landing in the resumed half. Catalog parity `b:c`, `b:d` and `c:d` are all `differences=0` after `VACUUM ANALYZE`, across 1026 tables, 13525 columns, 13989 constraints, 5067 indexes, 966 policies, 457 functions, 163 triggers, 5 extensions, 2441 enum labels, 966 RLS tables, 770 sequences and 637 ledger rows; every ledger hash-set equals the journal’s. **Read the bundle’s four caveats before citing any of it:** the parity comparator compared object *names* rather than definitions until the fix that shipped with this evidence, so no earlier parity claim means what it appears to; two tenant gates were green because they could not see; **22 org-bearing tables still have no RLS policy** (16 `inv_*` with a demonstrated cross-tenant read on `inv_customer_shelf_life_rules`, plus 6 justified platform-global), state as of 2026-09-02 with ticket 08 not yet landed; and `scratch_boot_a`’s ACLs were changed after its build. **The “635” used elsewhere in this document is stale in both directions: the journal held 637 entries when these proofs were taken and holds 639 now — `0992` and `0993` are journalled but unproven.**
- **SUPERSEDED — former head.** Clean-bootstrap parity at the **634-entry chain** (`scratch_boot_c`, `scratch_boot_d`, interrupted-then-resumed `scratch_boot_b`): [s02-bootstrap-parity.md](final-refactor/evidence/s02-bootstrap-parity.md) and [s02-tenant-integrity.md](final-refactor/evidence/s02-tenant-integrity.md). **Neither may be cited as current-head proof.** They describe a 634-entry journal on a database estate that no longer exists in that state; their `differences=0` was produced by a comparator that keyed on object *names* rather than definitions; and their tenant gates had measured blind spots. Both documents now carry a superseded banner. Full reasoning, plus two open findings against the set — retained connection URIs naming a real remote endpoint, and an `artifact-hashes.json` that no longer verifies for either document — is in [SUPERSEDED-FORMER-HEAD.md](final-refactor/evidence/SUPERSEDED-FORMER-HEAD.md).
- Journal integrity, three times in one session: `0956`, `0983`/`0984` and `0989` each arrived from another lane with no `_journal.json` entry. `db:migrate` skips an unjournalled file and reports success, so each would have sat in the tree looking applied while being absent from every database. `check:migration-discipline` and `verify-migration-chain` catch this, which is how all three were found.
- Row-level security on four tenant tables that shipped without any policy — `git_webhook_seen_deliveries`, `calendar_provider_sync_queue`, `file_quarantine_records`, `multipart_upload_intents`. Each carried `org_id` and granted `streamline_app` full DML with no policy, so every row was readable org-wide. The exposure was invisible until those migrations were applied, because an unapplied table cannot fail a scan.
- Historical 634-entry evidence reconciled Drizzle declarations with the catalog at zero actionable tenant relationships. Current-head reconciliation remains open until the 635-entry bootstraps finish; `db:generate` must continue to fail closed while snapshots are stale.
- Zero Drizzle-declared columns absent from the database. `db.select()` renders every declared column, so ~65 HR, hiring, payroll and performance tables were returning `42703` on any full-table read; 69 nullable actor columns were added and the failure no longer reproduces.

Not rerun in this reconciliation because they are expensive final-integration gates: full backend/frontend builds, full typechecks, full Jest suites and complete disposable E2E. They remain open below.

## Superseded ticket-40 blocker ledger

> **Re-verified 2026-09-03 (ticket 40).** Four blockers below are **RESOLVED** and are struck through with their measurement; the rest were re-measured and their numbers corrected in place. One **new** blocker heads the list.

- **NEW — the release cannot be verified at one commit.** `frontend/hooks/api/meetings-ai.ts` is **uncommitted** in the shared working tree and is inconsistent with its two consumers: it removes `useMeetingPrep`, adds `streamMeetingPrep`/`readMeetingPrepSources` and reshapes `MeetingFollowUpResult`, while `features/calendar/meeting-prep-panel.tsx` and `features/calendar/meeting-follow-up-panel.tsx` (last touched 2026-08-25) still use the old shape. Frontend `type-check` is **exit 2 with 12 errors**; frontend `check:dead-code` is **exit 1** on exactly the two new exports. Committed `HEAD` still exports the symbol the consumers import, so the release's "frontend typecheck 0" is true of `HEAD` and false of the tree. Either land the change with its consumers updated, or revert it. **A clean-`HEAD` typecheck has not been run.**

- Clean-bootstrap and tenant-catalog parity are not current. **Re-measured 2026-09-03: the journal holds 666 entries** (not 634/635/637/639), with 666 `.sql` files and 0 missing. Re-run two independent clean bootstraps plus an interrupted/resumed bootstrap at one release commit, compare exact catalogs and rerun tenant-relationship verification against a fully bootstrapped target. **No database reachable this pass is at head:** `check:migration-ledger` reports 635 applied rows against 666 entries (31 pending) and `check:tenant-relationships` reports its target at **573 of 666** and refuses the number as release evidence. The `scratch_boot_a` observation stands, at 573/666 rather than 613/635.
- Restore the over-300 ratchet. **`kb-rag.service.ts` is now 253 lines — that specific regression is fixed** — but the backend count has moved the other way: **400 files against the baseline of 394, 6 above**, and none of the crossings is attributable to the ticket that reported it. The **frontend hard-500 gate now exists** and is fail-closed; it is **red on 3 files** (`features/hr/cases/cases-page-content.tsx` 501, `hooks/api/notifications-inbox.ts` 534, `hooks/api/notifications-inbox.test.ts` 663). Backend hard-500 passes at 3,571 files with 7 registered exceptions. Note the unresolved policy split: `check-over-300` scans `*.test.ts(x)` while `check-file-sizes` exempts them, so one test file inflates one ratchet while being exempt from the other.
- ~~Add and execute cross-tenant negative tests for RBAC role seeding and Support KB engagement, restoring static declaration coverage.~~ **RESOLVED — `check:tenant-isolation` is exit 0 at 929/929 (100%) as of 2026-09-03.** The *executable* half remains open and is a separate matter: `check:tenant-isolation:run` sits in a `schedule || workflow_dispatch` job and does not run on a pull request, so it is **NOT-VERIFIED**, not passing.
- ~~Remove the dependency-proven dead frontend barrel `features/build/inbox/index.ts`.~~ **RESOLVED — the file does not exist.** Both dead-code gates are nevertheless **exit 1**: backend on `ai/core/streaming/index.ts:AiTextStreamProduct` and `ai/core/services/crm-brief-loaders.ts:loadLeadProfile`; frontend on `streamMeetingPrep` and `readMeetingPrepSources`, which are the uncommitted change in the new blocker above. knip itself reports **0 unused files** in the backend.
- ~~Reduce the 58 authenticated thick route modules.~~ **RESOLVED — `check:route-thinness` reports 588 authenticated route modules scanned, IN SCOPE thick 0 against a baseline of 0, exit 0.** 67 remain thick in CRM/Inventory, both outside release scope. `check:client-pages` is likewise **141 of a 304 ceiling** (the ticked §10.18 evidence line still says 220).
- Refresh and pass production-build/reference-device Web Vitals evidence. **Re-measured 2026-09-03 and the two halves have swapped.** Web Vitals: **2 breaches, not six** — mobile TTFB p95 932 ms (budget 600) and desktop TTFB p95 1,669 ms (budget 400), both carrying a recorded owner exception naming `GET /me/access` at p50 503 ms per authenticated server render; INP, CLS, LCP and FCP are inside budget on both profiles. Route bundles **no longer pass**: `check:route-bundle-budget` is **exit 1 with 17 breaches across 12 measured routes**, ten of them in scope (`/mail`, `/inbox`, `/dashboard`, `/chat`, `/calendar`, `/notifications`, `/settings`, `/build/inbox`, `/build/my-work`, `/support/inbox`). The earlier "route bundles pass for all five measured routes" was measured on a metric that under-counted what users download.
- Decide and implement Calendar provider drift conflict behavior: local wins, provider wins or user-visible conflict resolution.
- Finish AI gateway consistency: reserve/check credit before public KB embedding, route embedding through the gateway interface, stream non-chat AI surfaces and measure realistic-corpus retrieval latency.
- Finish GDPR erasure across its remaining sinks: Chat/AI message content, search/vector indexes and derived projections, plus full cryptographic session revocation through `SessionsService` (the membership cache and permission version are already busted). **Database PII is now covered:** `GdprSubjectErasureService` anonymises the subject across `organization_people`, `hr_employee_sensitive_fields`, `hr_dependents` and — only once no other org membership remains — the global `users` row, whose email becomes a hashed `erased-<hash>@erased.invalid` tombstone so the NOT NULL UNIQUE constraint still holds. It is idempotent, legal-hold-blocking, audited, tenant-scoped in SQL, and drains on a keyset cursor rather than capping; it first shipped with two bare `.limit(50)` calls that would have reported a partially erased subject as fully erased.
- Widen GDPR correction beyond `users.name`, which is the only field `gdpr-rectification.schemas.ts` accepts today: `hr_people` personal email/phone/address/DOB/gender/preferred name and emergency contacts (S04), bank and payroll details (S05). `users.email` is authentication-linked and needs a verification challenge, not a blind update.
- Add durable retry/DLQ semantics and bounded history for module Workflow step execution.
- Make retention execution self-monitoring: schedule or prove the external scheduler, add a dead-man signal and emit durable failure events. Decide retention for `notification_outbox` and `outbox_events`.
- Make Chat attachment storage private and backfill existing public attachment URLs to tenant-scoped object keys; current provider-response validation, tenant-fair delivery scheduling and offline Notification UI are already implemented.
- Run dependency proof for the remaining dead backend exports/types before deletion; do not delete schema or side-effect imports from text search alone.
- Complete the repository-wide hygiene contract in section 2.1: remove unused imports, variables, parameters, functions, constants, types, exports, files and dependencies, and replace unsafe forced typing with validated narrowing. The current dead Build inbox barrel is one known example, not the cleanup boundary.

## Product constraints

- Do not change public landing-page visuals or animations.
- CRM and Inventory code, migrations and acceptance evidence are excluded.
- Home is the universal shell and composition module. Chat, Calendar, Inbox and Notifications appear through Home but retain independent schema, authorization, caching, workers and implementation behind small interfaces.
- Preserve [PRD-IN-SCOPE.md](PRD-IN-SCOPE.md) unless a concrete scale, correctness, security or operability failure requires change.
- Never solve growing work with silent truncation. Use keyset pagination, resumable batches, streams or queues.
- Every tenant relationship, query, cache key, event, object key and search ACL preserves organization scope.
- Never delete code or schema from text search alone. Require dependency evidence plus build/typecheck and migration-integrity proof.
- “May be useful later” is not evidence for retaining an unused implementation. Preserve future ideas in product documentation; keep executable code only when it has a verified caller, registration/side effect or compatibility obligation.

## Approved implementation decisions — 2026-09-01

These decisions are final for this release and remove implementation alternatives from the checklist:

1. **RBAC:** exactly six fixed standings — organization owner, organization admin, organization member, module owner, module admin and module member. Capability customization uses fixed templates, per-person permission grants, delegations and DataScope. No runtime custom-role creation.
2. **Token authority:** the backend exposes an authenticated session-exchange interface and alone signs short-lived asymmetric JWTs. Frontend and edge runtimes contain no backend signing key.
3. **Payroll posting:** Payroll commits an idempotent Accounting-posting intent through the transactional outbox; Accounting consumes it asynchronously and idempotently. Brief `pending` state is accepted; lost or dangling journals are not.
4. **Calendar synchronization:** local Calendar state commits first with durable `pending` synchronization state. Provider synchronization runs asynchronously with `synced`/`failed` state, retry/backoff and user-visible recovery.
5. **Chat presence:** Ably connection presence is authoritative. One leader-elected browser heartbeat with jitter/backoff is permitted only as a bounded fallback.
6. **Knowledge comments:** authors may edit/delete their comments while they retain page visibility; page editors may resolve; KB administrators may moderate. Every action rechecks current page/article visibility at the data seam.
7. **Home contract:** the backend owns the authoritative Home section/access manifest. The frontend consumes a generated contract; hand-maintained parallel registries are prohibited.
8. **Billing providers:** frontend checkout is provider-neutral. Razorpay is the first adapter; a Stripe-ready contract test proves another adapter requires no Billing caller change.
9. **Migration policy:** staging and production contain no valuable data. Destructive migration rebasing, squashing and database recreation are authorized; no legacy watermark upgrade compatibility is required for this release. The new clean baseline must remain reproducible and interruption-safe.
10. **Deferred capabilities:** hooks, routes and UI that are outside the confirmed release scope are removed after dependency proof, not retained behind speculative flags.
11. **Release scope:** Home, Settings, Authentication/RBAC, HRMS, Payroll, Build, Billing/Payments/Accounting, Chat, Calendar, Inbox/Mail, Notifications, Knowledge/Wiki/Chatbot and Workflows. CRM and Inventory remain excluded.
12. **Compatibility:** internal frontend/backend routes, types and schemas may break during this coordinated refactor. Only published customer/integration contracts require backward compatibility or explicit versioned deprecation.

## Immediate code-level release candidate

### 1. One-commit release verification

- [ ] **[PRD-C018]** Run disposable-database E2E for Organization/RBAC, Home, Settings, HRMS, Payroll, Build, Billing, Payments, Accounting, Chat, Calendar, Notifications, Knowledge, Workflows and Inbox/mail.
- [ ] **[PRD-C019]** Record each command, release SHA, database identity, dataset shape, pass/fail/skip counts and failure artifacts.
- [ ] **[PRD-C020]** At the same commit run backend build/typecheck, spec typecheck, frontend typecheck, OpenAPI freshness, cycle, file-size, dead-code, tenant-isolation, RLS, permission, cache, outbox, idempotency, migration, vulnerability, license and SBOM gates.
- [ ] **[PRD-C021]** Resolve every code-level P0/P1 finding and assign owner/deadline to accepted lower-severity residual risks.

### 2. Module and folder architecture

- [x] Prove domain modules expose small, stable interfaces and keep implementation local; remove shallow pass-through layers that add no behavior.
      Evidence: ticket 39 is 8/8 closed; six shallow shells were removed, Nest module exports were reduced from 363 to 312 with zero unconsumed in-scope exports, and module/dependency gates were green in that ticket's recorded run.
- [x] Prove Home only composes universal experiences; Chat, Calendar, Inbox and Notifications retain independent business implementation.
      Evidence: ticket 39 verified `DashboardModule` does not absorb Chat/Calendar/Mail implementation or their tables, and the frontend dashboard imports none of those feature implementations.
- [x] Prove zero circular imports, forbidden new `forwardRef`, barrel self-imports and erased Nest injection tokens.
      Evidence: `check:cycles` (both repos), `check:module-di`, `check:import-direction` all pass 2026-09-02.
      **RE-VERIFIED 2026-09-03 — PARTIALLY REGRESSED.** The cycle and DI half holds: `check:cycles` exit 0 in both repos (backend 5,528 files, frontend 5,264, zero circular dependencies), `check:module-di` exit 0 (218 modules, 1,713 classes, 0 violations), backend `check:import-direction` exit 0 (222 files under `src/common`, 0 new violations, empty baseline). **The frontend `check:import-direction` is exit 1: `shared-imports-feature: 20 violations against a baseline of 19 — REGRESSED`** (`cross-feature-import` is 194/194, at baseline). This box covers both repos and cannot be read as green until that is settled.
      **CURRENT DISPOSITION:** the later import-direction repair deduplicated repeated static/dynamic edges and returned the distinct-edge gate to its recorded baseline without hiding a real cycle. Final one-commit rerun remains mandatory.
- [ ] **[PRD-C022]** Prove every active Nest module is registered and every frontend route has one canonical owner; remove obsolete routes rather than preserving hidden duplicates.
      Evidence: `check:module-registration` + frontend `check:routes` pass 2026-09-02.
      **RE-VERIFIED 2026-09-03 — REGRESSED.** `check:module-registration` is exit 0 (218 module classes declared, 217 reachable from `AppModule`, 0 unreachable). **Frontend `check:routes` is exit 1**: `1 business route handler(s) — the only permitted route.ts is NextAuth: api/media/image/route.ts`. See §3's last box for the analysis; the two findings are the same file.
- [x] Keep authenticated `app/**/page.tsx` and `layout.tsx` files as thin route modules for metadata, parameters, server authorization and composition; move state, forms, queries and mutations behind feature-owned interfaces and gate route-file size/import direction without changing landing visuals or animations.
      Evidence: ticket 25 closed 7/7; the in-scope thick-route count reached 0 without raising the ceiling, extracted feature files remained below 300 lines, and public landing files were untouched.


#### 2.1 Repository hygiene, dead code and type integrity

- [ ] **[PRD-C023]** Run fail-closed dead-code analysis over the backend, frontend, shared packages, workers and scripts; require zero unclassified unused files, dependencies, exports and exported types in the in-scope code. CRM/Inventory and generated/vendor artifacts must be reported separately, not silently included or deleted.
- [ ] **[PRD-C024]** Remove every in-scope compile-time and runtime dependency cycle across backend modules, frontend features, shared packages, barrels and NestJS DI. Replace cycles with correct ownership, dependency inversion or a neutral seam; do not hide them with `forwardRef`, lazy/dynamic imports, re-export indirection, duplicated types or an exception baseline. The cycle gate and a bite-proven self-test must report zero cycles.
- [ ] **[PRD-C025]** Enable and enforce TypeScript/ESLint unused-symbol checks for imports, locals, parameters and private members. Remove unused symbols instead of renaming them to `_` or suppressing the rule; allow a named `_` parameter only where a framework/interface callback contract requires its position.
- [ ] **[PRD-C026]** Remove unused imports, variables, parameters, functions, classes, constants, enums, types, interfaces, Zod schemas, DTOs, hooks, query keys, context values, feature flags and re-exports. An exported symbol is not considered used merely because a barrel exports it.
- [ ] **[PRD-C027]** Remove unreachable branches, obsolete compatibility shims, commented-out implementation, debug logging, stale TODO scaffolding and constants that duplicate an authoritative enum/config/schema. Retain a compatibility path only with a named consumer, removal date and contract test.
- [ ] **[PRD-C028]** Remove unused files and folders including abandoned routes, controllers, providers, modules, components, hooks, workers, jobs, adapters, tests, fixtures, mocks, scripts, assets and styles after proving that no static, dynamic, reflective, generated, CLI, package-script or side-effect entry point reaches them.
- [ ] **[PRD-C029]** Remove unused runtime and development dependencies, package scripts, environment variables, configuration keys, feature flags and asset references; update lockfiles, deployment manifests, validation schemas and documentation in the same change.
- [ ] **[PRD-C030]** Eliminate unsafe forced typing: no `as any`, `as unknown as T`, unjustified non-null assertions, `@ts-ignore`, `@ts-nocheck`, error-suppressing casts or broad index signatures used to bypass a contract. Narrow `unknown` with Zod, discriminated unions, exhaustive guards or a tested adapter; use `satisfies` where only conformance is needed.
- [ ] **[PRD-C031]** Permit a type assertion only at a proven external/framework seam where TypeScript cannot express an already runtime-validated invariant. Each exception must be local, narrow, documented with the invariant and covered by a negative/runtime contract test; maintain a zero-growth, named exception ledger.
- [ ] **[PRD-C032]** Replace duplicated or weakly owned constants with the canonical domain-owned schema/catalog only when at least two real callers share the invariant; do not create generic dumping-ground helpers or speculative seams. Apply the deletion test to pass-through wrappers and retain modules that provide real depth, policy or adaptation.
- [ ] **[PRD-C033]** Reduce public interfaces and barrel surfaces to verified consumers. Internal implementation details stay private to their module; deep imports across module ownership are removed or replaced by the smallest stable interface at the correct seam.
- [ ] **[PRD-C034]** Prove every deletion with import/dependency graph results plus checks for Nest metadata/DI, Next.js file conventions and dynamic imports, raw SQL/table names, migrations, reflection, queues/events, cron registration, package scripts and side-effect imports. Text search or a successful editor rename alone is insufficient evidence.
- [ ] **[PRD-C035]** After each cleanup batch, run focused behavior tests and the affected package typecheck/build; at final integration run both dead-code gates and their self-tests so a broken or under-scanning analyzer cannot report a false green result.
- [ ] **[PRD-C036]** Record before/after counts for unused files, exports/types, dependencies, suppressions, unsafe assertions and exceptions. Final acceptance is zero unclassified findings, zero unexplained suppressions and no increase in an approved framework/generated exception baseline.
- [ ] **[PRD-C037]** Confirm the cleanup does not remove authorization, validation, cache invalidation, outbox/worker registration, observability, accessibility, SEO metadata or error/offline states merely because those paths are uncommon in local development.

#### 2.2 File cohesion and 500-line policy

- [ ] **[PRD-C038]** Enforce a repository-wide default maximum of 500 physical lines for authored production, frontend, backend, shared-package, worker, script and test files (`.ts`, `.tsx`, `.js` and `.mjs`). The gate must scan every applicable workspace with a vacuity floor and fail when a new unregistered file exceeds the limit; CRM/Inventory are reported separately and landing visuals are unchanged.
- [ ] **[PRD-C039]** Treat 300 lines as a review/refactoring target, not a reason for mechanical fragmentation. Split files by cohesive responsibility and domain ownership when doing so reduces the interface or separates independently changing behavior; never split into numbered fragments, pass-through wrappers, re-export shells or mutually dependent files merely to satisfy a counter.
- [ ] **[PRD-C040]** Permit a file above 500 lines only for a generated/vendor artifact, declaration, immutable migration, cohesive declarative catalog or an implementation whose documented split alternatives would reduce locality or introduce a cycle. Each exception records exact path and measured lines, category, owner, public interface, concrete cohesion argument, alternatives considered, review date and removal trigger; directory-wide and wildcard exceptions are prohibited.
- [ ] **[PRD-C041]** Make the exception registry fail closed: missing/stale paths, line counts, owners, interfaces, reasons or review dates fail; any file that falls to 500 lines or below automatically loses its exception. Generated/vendor/migration exclusions must be path-classified and must never exempt ordinary authored implementation transitively.
- [ ] **[PRD-C042]** Review functions, classes, React components, hooks, forms, controllers and workers inside an allowed large file for mixed responsibilities, hidden state, duplicated validation/query logic and excessive public surface. A file-size exception does not exempt dead-code, cycle, authorization, query-cost, contract, testing or readability requirements.
- [ ] **[PRD-C043]** Run the hard-size gate and bite-proven self-test for backend and frontend at the final commit, publish all over-300 and over-500 inventories, require zero unexplained violations and prove each extraction preserves behavior, import direction, DI registration, route ownership, caching and authorization.

#### 2.3 Handler and function responsibility

- [ ] **[PRD-C044]** Use named, typed handler functions for non-trivial UI events and form actions instead of embedding business logic, multi-step mutations or long anonymous closures in JSX. Names express the user intent (`handleSubmit`, `handleMemberRemove`, `handleRetrySync`), and handlers delegate validation/state-independent rules to domain-owned functions.
- [ ] **[PRD-C045]** Keep NestJS controller handlers, queue/event consumers, cron entry points and server actions thin: validate and authorize at the correct seam, construct the command/query context, invoke one cohesive implementation and map its typed result/error. Do not duplicate business rules, database orchestration or response shaping across handlers.
- [ ] **[PRD-C046]** Use named event handlers only; JSX event props must not contain inline arrow/function expressions. Do not create meaningless handler-to-handler chains: the named handler performs event orchestration and delegates reusable rules to explicitly named domain functions. Use `useCallback` only when referential identity affects memoization, subscription or effect correctness, and verify every dependency.

### 3. TypeScript, Zod and cross-layer contracts

- [ ] **[PRD-C047]** Prove strict TypeScript with no new `any`, suppression directives, unsafe double casts, non-null assertion abuse or parallel hand-written types that drift from schemas.
- [ ] **[PRD-C048]** Validate every untrusted body, parameter, query, environment value, upload manifest and external response through established Zod boundaries.
- [x] Keep Zod schemas in module DTO/schema files, derive types with `z.infer`, reject protected/client-supplied actor and tenant fields and enforce unknown-key policy.
      Evidence: Unknown-key policy closed 2026-09-02: `.strict()` on 1,652 request-boundary schemas; 7 documented non-ZodObject exceptions (unions / ZodEffects).
      **RE-VERIFIED 2026-09-03 — criterion holds, exact figure NOT-VERIFIED.** The tree carries **2,464 `.strict()` calls across 764 files** against 2,814 `z.object(` occurrences, and no gate reports an unknown-key defect. That is a different (larger) population than "request-boundary schemas", so it corroborates the criterion without re-deriving **1,652**; reproducing that exact number needs the original classifying script.
- [ ] **[PRD-C049]** Reconcile backend Zod/OpenAPI contracts with frontend request/response types, hooks, forms and rendered error states.
- [x] Prove controllers remain thin, business rules stay backend-side and no frontend `app/api` or client module contains business/database logic.
      Evidence: Verified 2026-09-02: only `app/api/auth/[...nextauth]/route.ts` exists, no `lib/services/`, zero drizzle/postgres/neon imports in frontend source.
      **RE-VERIFIED 2026-09-03 — the evidence sentence is FACTUALLY WRONG and the gate is red.** Two thirds of it hold: `lib/services/` is absent, and drizzle/postgres/neon imports in frontend source are **0**. But **two** route handlers exist, not one, and `pnpm check:routes` is **exit 1** naming the second: `app/api/media/image/route.ts`. That file (72 lines) is an authenticated image proxy — it Zod-parses one `key`, requires `session.backendJwt`, forwards to `GET /storage/image` and hardens the content type — so it holds no business rule and touches no database, and the *criterion* is arguably satisfied. The repo's own fail-closed gate disagrees. **Resolve one way or the other before release:** either allowlist the proxy in `check:routes` with its justification, or move it. It cannot remain red beneath a ticked box.

### 4. Database schema and migration quality

- [ ] **[PRD-C050]** Audit primary-key strategy, tenant-scoped uniqueness, FK indexes, named constraints, referential actions, checks, money units, timestamps and audit columns.
- [ ] **[PRD-C051]** Verify normalized lifecycle and relationship tables; remove actionable JSON arrays/polymorphic authority relationships and avoid EAV unless an approved custom-field seam requires it.
- [ ] **[PRD-C052]** Verify soft-delete/archive policy and every active readâ€™s deleted/archived predicate; use partial indexes where the access pattern requires them.
- [ ] **[PRD-C053]** Reconcile Drizzle declarations, migration snapshots and the live catalog so each tenant relationship has one canonical composite constraint; remove redundant single-column constraints only after dependency proof, cold bootstrap and current-catalog parity. Upgraded-catalog compatibility is required only if migration decision 9 changes, because this release explicitly authorizes database recreation.
- [ ] **[PRD-C054]** Remove obsolete schema only with symbol, raw table-name, FK, migration, barrel and integrity-spec evidence.
- [x] Establish a new clean migration baseline after authorized destructive rebase/squash, recreate disposable staging from zero and exercise interruption/retry plus rollback/forward-fix using [RB-09](runbooks/RB-09-migration-rollback.md); no legacy watermark upgrade is required.
      Evidence: 2026-09-02: `applied=633 skipped=1 failures=0`; catalog parity vs an independent bootstrap `differences=0` across tables, columns, constraints, indexes, policies, functions, triggers, extensions, enums, rlsEnabled. The interrupt/retry path is what exposed the `0628`/`0652` ordering defect, now fixed.
      **SUPERSEDED — covers a former head (633/634-entry chain). Do not cite as current.** The journal holds **666** entries as of 2026-09-03. Two further reasons this evidence cannot carry the current claim: the parity comparator keyed on object *names* rather than definitions until the fix that shipped alongside it, so no parity number from that era means what it appears to; and no database reachable on 2026-09-03 is at head. The baseline-establishment half of this box stands; the **parity** half is re-opened by the blocker list above.
- [ ] **[PRD-C055]** Compare two independent clean bootstraps and an interrupted-then-resumed bootstrap at the same release commit: tables, columns, constraints, indexes, policies, functions, triggers, extensions, enums and RLS state must match exactly.
- [ ] **[PRD-C056]** Retain release SHA, commands, database identity, journal hash/count, catalog diff, sanitized logs and artifact hashes for the current-head bootstrap and migration evidence.

#### 4.1 Schema and executable-key minimization

- [ ] **[PRD-C057]** Inventory and classify in-scope database columns, primary/foreign/unique/check constraints, indexes and JSONB keys plus executable code registries for routes, permissions, modules, events, commands, query/cache keys, configuration, environment variables, feature flags and translations. Every entry is KEEP, REFACTOR or REMOVE with its owner and concrete failure prevented.
- [ ] **[PRD-C058]** Remove unused database columns and JSONB properties only after proving zero reads/writes through Drizzle, raw SQL, migrations, exports, search/vector ingestion, audit/retention jobs, analytics and external contracts. Frequently filtered, joined, authorized or constrained JSONB properties must be normalized or indexed rather than silently retained as opaque payload.
- [ ] **[PRD-C059]** Detect redundant or overlapping foreign keys, unique constraints, checks and indexes using schema declarations, `pg_catalog`, representative `EXPLAIN (ANALYZE, BUFFERS)` plans and workload/index statistics. Statistics alone never justify deletion; preserve every constraint/index required for tenant isolation, referential integrity, concurrency, ordering or a documented access pattern.
- [ ] **[PRD-C060]** Require each tenant-owned relationship to use the canonical composite organization-scoped key and supporting index. Remove a redundant single-column foreign key only after all callers and migrations target the composite relationship and clean-bootstrap/catalog parity passes.
- [ ] **[PRD-C061]** Remove dead or duplicate code keys and aliases from permission catalogs, route/operation registries, module manifests, event/command catalogs, TanStack factories, cache namespaces, configuration schemas, feature flags and translation catalogs only after static and runtime registration/caller proof. Unknown dynamic string keys are rejected at their seam rather than preserved indefinitely.
- [ ] **[PRD-C062]** Keep one typed, domain-owned factory/catalog for each surviving key family; prohibit ad-hoc string literals, parallel aliases and generic global dumping grounds. Tenant, subject, scope, filters, sort, cursor, version and permission dimensions remain in query/cache keys wherever correctness requires them.
- [ ] **[PRD-C063]** Remove unused request/response/DTO/Zod fields and object properties across backend, OpenAPI, frontend hooks/forms and persisted events as one contract change. Never remove server-controlled tenant/actor fields, idempotency/version fields, authorization dimensions, audit fields or compatibility fields with a published consumer without an explicit migration/deprecation path.
- [ ] **[PRD-C064]** After every key/schema cleanup, regenerate affected artifacts and prove migration chain/ledger, two clean bootstraps, catalog parity, tenant relationships/indexes/RLS, query plans, OpenAPI/contract compatibility, cache invalidation and focused behavior tests. Final acceptance is zero unclassified unnecessary keys and no orphaned schema/code reference.

### 5. Query, pagination and cache correctness

- [ ] **[PRD-C065]** Prove explicit projections, tenant-leading/access-pattern indexes and no required full tenant/table scan or avoidable sort.
- [ ] **[PRD-C066]** Exercise reminder, export, fanout, unread, free/busy, recurrence, search/vector and dashboard queries against seeded data.
- [ ] **[PRD-C067]** Verify cache keys include tenant, subject, permission and resource dimensions where applicable.
- [ ] **[PRD-C068]** Prove mutation/revocation invalidation, TTL/negative-cache policy, stampede protection and Redis degradation never leak data or preserve revoked access.

#### 5.1 Efficient database-call contract

- [ ] **[PRD-C069]** Record a maximum database-call count for every critical route and worker batch; fail regression tests when an implementation adds unexpected calls.
- [ ] **[PRD-C070]** Execute tenant-owned request work inside the minimum correct tenant transaction and reuse its handle; never open nested/per-row transactions or borrow a committed request transaction.
- [ ] **[PRD-C071]** Select named columns only and return minimal DTO projections; never hydrate full ORM rows, global users or large JSON/blob/vector fields for list/count/existence paths.
- [ ] **[PRD-C072]** Batch relationship, permission, unread, attachment, assignee and metadata lookups with joins, CTEs or bounded multi-key queries; forbid database/cache calls inside growing loops.
- [ ] **[PRD-C073]** Implement existence/authorization probes with tenant-correlated indexed predicates and `LIMIT 1`; do not fetch records or counts when only existence is required.
- [ ] **[PRD-C074]** Make exact totals opt-in and independently budgeted; cursor pages must not run an expensive `COUNT(*)` automatically on every request.
- [ ] **[PRD-C075]** Use bounded bulk insert/update/upsert operations and conflict-safe unique keys instead of one write per row; keep transactional batches below documented lock/payload limits.
- [ ] **[PRD-C076]** Verify concurrent counters, unread state, seats, balances, ordering and idempotency use atomic SQL/upsert/locking semantics without read-then-write races.
- [ ] **[PRD-C077]** Apply statement/query timeouts and cancellation propagation to interactive work; move reports, exports, reindexing and wide aggregates to resumable jobs.
- [ ] **[PRD-C078]** Measure connection acquisition, transaction duration and idle-in-transaction behavior; release connections before external provider calls or long CPU work.
- [ ] **[PRD-C079]** Benchmark under the application role with tenant context and RLS, never only as the database owner; plans must include real authorization predicates.
- [ ] **[PRD-C080]** Capture slow-query fingerprints, call counts, rows read/returned, buffers and lock waits in test evidence without logging sensitive bind values.

### 6. Organization and module RBAC

- [ ] **[PRD-C081]** Run BOLA/IDOR tests for reads, writes, bulk actions, files, exports, search/vector, realtime, jobs and public/share-token paths; cross-tenant misses return 404.

### 7. NestJS route and worker behavior

- [x] Verify every route is classified public, universal, permissioned or explicitly authorized inside its implementation; no undeclared route exists.
      Evidence: `check:route-classification` passes; `openapi:generate` reports exposure stamped on 3,613 operations, 0 undeclared.
- [ ] **[PRD-C082]** Verify every privileged operation applies module, permission, tenant, record and DataScope checks at the correct seam.
- [ ] **[PRD-C083]** Verify writes are transactional, idempotent and safe under concurrent retry; side effects use after-commit/outbox behavior and never a dead request transaction.
- [x] Verify background sweeps iterate tenant context explicitly, use bounded/resumable leases and expose retry/DLQ/cancellation states.
      Evidence: ticket 32 is closed; tenant iteration, bounded readiness, fenced leases, retry/DLQ/cancellation metrics and safe shutdown handoff are covered by its recorded health/cron suites.
- [ ] **[PRD-C084]** Verify minimal response projections, serialization/redaction, generic errors, resource limits and stable HTTP semantics.
- [x] Reconcile OpenAPI exposure, request, response, 4xx schema and operation metadata with active controllers and consumers.
      Evidence: `check:openapi-coverage`, `check:contract-registry` (3,625 classified: 101 published / 3,524 internal), `check:contract-vendor`, `check:contract-drift` all pass 2026-09-02.

#### 7.1 Optimized route and transport contract

- [x] Keep one canonical route per product operation; remove dead, versionless, duplicated and overlapping routes after caller/dependency proof.
      Evidence: `check:route-duplicates` passes 2026-09-02.
- [ ] **[PRD-C085]** Define route budgets for database calls, downstream calls, application latency, response bytes and memory; record p50/p95/p99 at the release commit.
- [ ] **[PRD-C086]** Design routes around one user intent rather than forcing avoidable request waterfalls, while keeping unrelated domain implementation out of oversized mega-responses.
- [ ] **[PRD-C087]** Keep Home aggregation bounded and parallel with independent section results; one slow source must not delay or fail every section.
- [ ] **[PRD-C088]** Return explicit DTO projections and omit unused nested relations, internal columns, secrets and repeated denormalized payloads.
- [x] Support conditional responses with version/ETag or `Last-Modified` where correctness permits; include tenant, permission and representation changes in the validator.
      Evidence: Express 5.2.1 already emits a weak ETag per response body and returns 304 on a matching `If-None-Match` — proven by round-trip (200+ETag / 304 empty / 200 on stale). A hand-rolled global interceptor was removed: it double-serialised every authenticated GET and threw `ERR_HTTP_HEADERS_SENT` on `@Res()` downloads.
- [ ] **[PRD-C089]** Enable Brotli/gzip for eligible JSON/text/OpenAPI/static responses with minimum-size and already-compressed-content exclusions; never compress secrets in a cross-origin reflection context.
- [ ] **[PRD-C090]** Stream AI responses, downloads and large exports or return durable asynchronous jobs; do not buffer growing payloads in NestJS or Next.js memory.
- [ ] **[PRD-C091]** Propagate cancellation and deadlines through NestJS, database, cache and provider adapters; enforce upstream timeouts, concurrency limits and backpressure.
- [ ] **[PRD-C092]** Require idempotency and optimistic concurrency/version checks for replayable or conflict-prone mutations; return stable 409/412 semantics.
- [ ] **[PRD-C093]** Avoid serial downstream/provider calls when independent, cap parallel fanout and use batch adapters where providers support them.
- [ ] **[PRD-C094]** Verify frontend route loaders and TanStack consumers reuse/prefetch the canonical request instead of issuing duplicate server/client fetches.
- [x] Keep response/error envelopes, pagination metadata and cache headers consistent across modules and prove frontend/OpenAPI contract compatibility.
      Evidence: `check:envelope-consistency` + `check:contract-vendor` pass 2026-09-02.

### 8. TanStack Query and Next.js data layer

- [ ] **[PRD-C095]** Verify one hierarchical query-key factory per domain includes organization, subject, scope, filters, sort and cursor dimensions as applicable.
- [x] Remove duplicated/ad-hoc string query keys and prove invalidation targets the correct prefix without flushing unrelated tenants/modules.
      Evidence: `check:query-scope` passes 2026-09-02.
- [ ] **[PRD-C096]** Gate queries with effective access and required identifiers; disabled queries must not send unauthorized or malformed requests.
- [ ] **[PRD-C097]** Verify mutations invalidate or update every affected list/detail/count/dashboard key and roll back optimistic state safely on failure.
- [ ] **[PRD-C098]** Use optimistic updates only where concurrency semantics are defined; otherwise await the backend result and invalidate deterministically.
- [ ] **[PRD-C099]** Verify cursor pagination does not duplicate/skip records and changing filter/sort resets pagination correctly.
- [ ] **[PRD-C100]** Verify loading, background-refresh, empty, partial-error, full-error, offline, permission-denied and revoked-access states.
- [ ] **[PRD-C101]** Prove frontend types and runtime parsing cannot silently accept a backend contract change.
- [x] Enforce canonical query-key factories for authenticated data: zero ad-hoc array keys or local key factories, no redundant tenant argument where the scoped Query hash already owns tenant/user identity, and exact invalidation tests for every mutation.
      Evidence: `check:query-scope` + `query-scope-isolation.test.tsx` pass 2026-09-02.

### 9. Operability, upload lifecycle and verification integrity

- [ ] **[PRD-C102]** Emit structured, redacted and tenant-safe logs, metrics and distributed trace context across HTTP requests, database/cache/provider adapters, outbox publication, queue/event consumers, cron jobs and AI streams. Correlate one user intent through asynchronous work without logging secrets, tokens, prompts, file contents or sensitive bind values; classify expected domain failures separately from actionable faults.
      Evidence: ticket 31 closed the shared eight-seam implementation, redaction and asynchronous-hop proofs, but explicitly routed Notification, Payroll and Email durable-queue restoration to their module owners. Keep this aggregate criterion open until those consumers and the final one-commit gate are verified.
- [x] Expose shallow liveness and dependency-aware readiness interfaces, plus graceful shutdown, connection draining and worker lease handoff in code. A failed database, cache, queue or required provider dependency must produce an explicit degraded/unready state without making health probes amplify the outage; deployed probe and alert delivery evidence remains deferred.
      Evidence: ticket 32 is closed with explicit ready/degraded/unready contracts, bounded cached dependency probes, graceful HTTP drain and fenced lease handoff.
- [ ] **[PRD-C103]** Enforce one tenant-private upload interface for attachments and documents: validate declared size and magic-byte MIME, sanitize names, use organization-scoped object keys, idempotent multipart completion, malware quarantine, authorization recheck before short-lived download URLs and asynchronous compression/preview/transcoding with bounded jobs. Cancellation, failed transforms, replacement and GDPR/retention deletion must clean database rows and objects without orphaning or exposing public URLs.
- [x] Version every published customer/integration contract or provide an explicit backward-compatible deprecation window. Reconcile REST/OpenAPI, webhooks, realtime events, exports and SDK-facing schemas with consumer evidence, idempotency/replay rules and removed-operation records; coordinated internal frontend/backend contracts may break only in the same release commit.
      Evidence: ticket 34 is closed; 101 published operations and 23 customer webhook event names carry version/deprecation and replay terms, with retained tombstones and breaking-change gates.
- [ ] **[PRD-C104]** Make every architecture/release gate bite-proven with a known-bad fixture or mutation that fails for the intended reason. Critical tests must exercise transaction callbacks, authorization deny/cross-tenant paths, retries and failure branches; zero silently skipped/quarantined tests, vacuous mocks, swallowed promise failures or baselines raised merely to turn a regression green.

### 10. Module release matrix

- [ ] **[PRD-C105]** Inventory its backend module folders, controllers, implementations, DTO/Zod schemas, database schema files, migrations, workers, cache keys, event consumers, frontend routes, components, hooks, TanStack keys, tests, fixtures and operational scripts.
- [ ] **[PRD-C106]** Verify every folder/file has one canonical domain owner, kebab-case naming, correct import direction and no parallel legacy/duplicate location.
- [ ] **[PRD-C107]** Classify every inventoried file as KEEP, REFACTOR or REMOVE; name the concrete failure prevented for each REFACTOR/REMOVE verdict.
- [ ] **[PRD-C108]** Verify each file has one cohesive responsibility, stays within size policy or a documented exception, exposes the smallest useful interface and contains no pass-through/dead/commented/debug implementation.
- [ ] **[PRD-C109]** Prove removals and moves with dependency-graph, dynamic/side-effect import, route registration, raw table-name/FK, build/typecheck and relevant migration-integrity evidence.
- [ ] **[PRD-C110]** Record the final module folder tree and public interfaces so future work cannot recreate retired paths, duplicated schemas, hooks, query keys or endpoints.

#### 10.1 Authentication, identity, sessions and organization

- [ ] **[PRD-C111]** Queries/cache: verify bounded membership/session reads, required indexes and immediate invalidation of session, effective-access and organization caches.
- [ ] **[PRD-C112]** Frontend/TanStack/tests: verify workspace/onboarding gates, organization switch state, query-key tenant isolation, auth error states and allow/deny/cross-tenant E2E.

#### 10.2 Organization RBAC and module RBAC

- [ ] **[PRD-C113]** Routes/contracts: verify role/grant/module-access CRUD has strict Zod contracts, stable OpenAPI, idempotent mutations and exhaustive owner/descendant protections.
- [ ] **[PRD-C114]** Queries/performance: verify effective-permission resolution is batched/cached, scope expansion is bounded and indexes cover subject, role, permission, module and tenant access paths.

#### 10.3 Home

- [ ] **[PRD-C115]** Reconstruct current-head Home evidence across folder ownership, universal-versus-module composition, section-level authorization/privacy, bounded parallel queries, independent loading/error states, cache/query keys, responsive accessibility and representative E2E; classify every Home file KEEP, REFACTOR or REMOVE without changing public landing-page visuals or animations.

#### 10.4 Settings and module-access administration

- [ ] **[PRD-C116]** Architecture/schema: prove global settings contain organization configuration/access governance only while operational and module-owned settings remain with their modules.
- [ ] **[PRD-C117]** Queries/cache: verify bounded settings reads, tenant-leading indexes and invalidation of organization, hierarchy, access, navigation and entitlement caches.

#### 10.5 Directory, Me and employee self-service

- [ ] **[PRD-C118]** Reconstruct current-head Directory/Me evidence across canonical ownership, self-versus-administrative authorization, tenant-scoped schema and indexes, bounded search/list projections, privacy-safe caching, TanStack keys, responsive accessibility and allow/deny/cross-tenant E2E.

#### 10.6 HRMS

- [ ] **[PRD-C119]** Reconstruct current-head HRMS evidence across employee lifecycle schema, tenant-composite integrity, module/record/DataScope authorization, bounded indexed queries, async imports/exports, cache invalidation, frontend states, folder cohesion and representative HR workflows.

#### 10.7 Payroll

- [ ] **[PRD-C120]** Architecture/schema: verify payroll runs, components, assignments, calculations, payslips, taxes, deductions and payment/reconciliation history are normalized, tenant-safe and immutable where financial.
- [ ] **[PRD-C121]** Queries/cache/workers: verify bounded run/item reads, indexed employee/period/status paths, no N+1 calculations, asynchronous exports and correct invalidation after lock/publish/reversal.
- [ ] **[PRD-C122]** Frontend/TanStack/tests: verify run-state UI, conflict/retry/partial failure, permission gates, secure downloads and calculation/locking/reconciliation E2E.

#### 10.8 Build and project management

- [ ] **[PRD-C123]** Reconstruct current-head Build/PM evidence across workspace/project/ticket schema, tenant and record authorization, bounded boards/backlogs/search, cursor and cache contracts, async/realtime workflows, frontend states, folder cohesion and representative E2E.

#### 10.9 Workflows and automations

- [ ] **[PRD-C124]** Reconstruct current-head Workflow evidence across definition/version/execution schema, permission rung, bounded execution history, idempotent queue/outbox processing, retry/DLQ/cancellation, secrets/redaction, frontend states and representative E2E.

#### 10.10 Billing and payments

- [ ] **[PRD-C125]** Reconstruct current-head Billing/Payments evidence across plans, subscriptions, entitlements, seats, proration, usage, immutable invoices, tax/currency, idempotent provider events, replay-safe webhooks, cached feature gates, authorization, frontend states and sandbox failure tests.

#### 10.11 Accounting and finance

- [ ] **[PRD-C126]** Reconstruct current-head Accounting/Finance evidence across immutable tenant-safe ledgers, normalized expenses and reconciliation, bounded indexed reads, queue-backed exports/reminders, idempotent consumers, retention, authorization, frontend states and production-shaped workflow tests.

#### 10.12 Chat

- [ ] **[PRD-C127]** Reconstruct current-head Chat evidence across channel/thread/member/message/reaction/attachment schema, tenant-composite integrity, channel and mutation authorization, scalable ordering/fanout/unread state, bounded history/search, cache/realtime invalidation, offline UI and representative E2E.

#### 10.13 Calendar

- [ ] **[PRD-C128]** Frontend/TanStack/tests: verify one `/calendar`, source toggles, timezone display, series-versus-instance edits, cursor/range keys and DST/exception/conflict/reminder E2E.
- [ ] **[PRD-C129]** Commit Calendar changes locally first with an atomic provider-sync intent and `pending` state; process create/update/delete asynchronously with idempotent lease, retry/backoff and cancellation, persist per-event monotonic operation/version ordering plus delete tombstones, discard stale jobs/webhooks, reconcile provider drift, expose `synced/failed` plus user retry, and prevent permanent local/external divergence.

#### 10.14 Inbox and mail

- [ ] **[PRD-C130]** Queries/cache/workers: verify indexed conversation ordering/search/unread, incremental sync, idempotent send/receive, bounce/retry/DLQ and invalidation of list/thread/count keys.
- [ ] **[PRD-C131]** Frontend/TanStack/tests: verify infinite lists, thread hydration, optimistic read/label rollback, compose/send states, offline/reconnect, sanitization and account-revocation E2E.

#### 10.15 Notifications, email and push

- [x] Give the notification lifecycle mutations an `onError` and a rollback. `frontend/hooks/api/notifications-inbox.ts`
- [ ] **[PRD-C132]** Re-verify provider-response schemas, tenant-fair delivery/backpressure, consent and suppression enforcement, durable retry/DLQ behavior, offline/revocation UI and cross-tenant notification delivery E2E at the release commit.
      Evidence: verified in source 2026-09-03 (ticket 40) by auditing all 14 `useMutation` sites in that file. **11 optimistic mutations each pair `onMutate` with both `onError` and `onSettled`** — `useMarkNotificationRead`, `useMarkAllNotificationsRead`, `useArchiveNotification`, `useUnarchiveNotification`, `useDeleteNotification`, `usePinNotification`, `useUnpinNotification`, `useSnoozeNotification`, `useBulkMarkRead`, `useBulkArchive`, `useBulkDelete`. The two remaining (`useApproveNotification` L520, `useRejectNotification` L529) carry **no `onMutate`**, so they hold no optimistic state to roll back and correctly only invalidate in `onSettled`. **Zero violations.**

#### 10.16 Knowledge Base, Wiki and Chatbot

- [ ] **[PRD-C133]** Architecture/schema: verify spaces, memberships, documents/pages, immutable revisions, attachments, ingestion jobs, chunks/embeddings and deletion/reindex state have tenant-composite integrity.
- [ ] **[PRD-C134]** Queries/cache/workers: verify revision/search plans, ingestion leases/retries/DLQ, chunk dedupe, permission-aware cache keys, purge/reindex and realistic-corpus latency.
- [ ] **[PRD-C135]** Frontend/TanStack/tests: verify editor/revision conflicts, search cursors, permission changes, citations/source integrity, ingestion states and ACL/purge/reindex E2E.

#### 10.17 Shared storage, search, realtime and integration adapters

- [ ] **[PRD-C136]** Reconstruct current-head shared-adapter evidence across tenant-safe interfaces, bounded retries/timeouts/circuit breakers, idempotency, backpressure, schema-validated provider responses, cache/credential isolation, observability, failure-mode tests and removal of duplicate provider-specific policy from product modules.

#### 10.18 Frontend system-wide release

- [ ] **[PRD-C137]** TanStack/contracts: verify query-key factories, parsing, invalidation, hydration, cancellation, retry, optimistic concurrency and pagination rules across every module above.
- [ ] **[PRD-C138]** UX/accessibility: verify loading/empty/error/offline/permission states, keyboard/screen reader, focus, contrast and responsive 375/768/1280 behavior.
- [ ] **[PRD-C139]** Performance/SEO/tests: verify bundle boundaries, lazy loading, rendering/Web Vitals budgets and public metadata without changing landing visuals/animations; run representative browser E2E.
- [x] Reduce authenticated client route modules below the current 304-page ceiling, never raise that ceiling, and move data/authorization/orchestration to server or feature seams while preserving interactive leaf components; public landing visuals and animations remain untouched.
      Evidence: `check:client-pages` passes at 220 of a 304 ceiling; `check:route-thinness` ratchet lowered 114 → 58. Landing visuals untouched.
      **RE-VERIFIED 2026-09-03 — still true, and both numbers have improved past what is written here.** `check:client-pages`: **141 of 600 (23.5%), 163 below the 304 ceiling**, exit 0. `check:route-thinness`: 588 authenticated route modules scanned, **IN SCOPE thick 0 against a baseline of 0**, exit 0; the 67 that remain thick are CRM/Inventory, outside release scope. The ceiling was not raised. Landing visuals untouched.

### 11. Application security and privacy implementation

- [x] Test session fixation/replay, revoked membership, invitations, password reset, MFA/recovery, brute force and credential stuffing behavior.
      Evidence: ticket 17 closed all seven boxes with 133 recorded application-security tests, including real token revocation at guard evaluation.
- [x] Test code-level CSRF, XSS, SSRF, SQL injection, unsafe redirect, path traversal, CORS/CSP/headers, payload limits and rate limits.
      Evidence: ticket 17 recorded 133 passing tests across the injection, transport and rate-limit surfaces with known-bad controls.
- [x] Verify secret/PII redaction, secure cookies/sessions, generic auth failures and signing/encryption-key rotation behavior.
      Evidence: tickets 17 and 31 cover secret/PII redaction, bearer-session posture, generic failures, public-JWK projection and signing-key rotation behavior.
- [x] Implement correction/rectification rather than treating export, deletion or anonymization as correction.
      Evidence: ticket 18 is 7/7 closed; rectification writes the requested value, verifies read-back and records before/after hashes while authentication-linked fields require a separate challenge.
- [x] Make subject export exhaustive and resumable with no silent caps or skipped in-scope sources.
      Evidence: ticket 18 closed the async export drains, reclaim path and exhaustive-source coverage with keyset progress checks.
- [x] Implement idempotent tenant-scoped erasure for database, object storage, search/vector, projections, caches and supported adapters while preserving immutable/legal-hold records.
      Evidence: ticket 18 closed all recorded database, chat/AI, attachment, export-artifact, vector, cache/session and object-manifest sinks with legal-hold and repeat-run behavior.
- [x] Prove retention workers are code-scheduled, bounded/resumable, idempotent, audited, retryable and emit failure events.
      Evidence: ticket 18 records the in-process retention scheduler, leases, bounded drains, dead-man monitoring, durable failure state and zero uncovered retention tables.
- [x] Prove document, payroll, export, purge and retention workflows never silently skip or truncate growing work.
      Evidence: ticket 18 closed the previously capped mail/helpdesk/announcement, organization-member, HR-document and GDPR export/purge paths with multi-page and no-progress proofs.

### 12. Light-speed performance and AI

#### 12.1 Backend, database and cache budgets

- [ ] **[PRD-C140]** Publish a benchmark manifest for every module: dataset size, concurrency, warm/cold state, machine/container limits, command, repetitions, p50/p95/p99, error rate and release SHA.
- [ ] **[PRD-C141]** Keep application-controlled overhead for ordinary authenticated reads/mutations at p95 ≤ 300 ms and approved complex aggregate/search operations at p95 ≤ 800 ms, excluding internet/provider time.
- [ ] **[PRD-C142]** Keep ordinary database statements at p95 ≤ 50 ms and explicitly approved complex statements at p95 ≤ 200 ms on the production-shaped seed; retain plans for every exception.
- [ ] **[PRD-C143]** Keep cache-hit application paths at p95 ≤ 100 ms while preserving authorization correctness; a cache miss or Redis outage must degrade safely without a request storm.
- [ ] **[PRD-C144]** Prove Home loads sections concurrently and independently, renders available sections without waiting for the slowest one and never starts an unbounded fanout.
- [ ] **[PRD-C145]** Prove Chat, Calendar, Inbox and Notifications list, unread/count, range/history and realtime-token paths meet their budgets without table scans, N+1 or per-item cache/database calls.
- [ ] **[PRD-C146]** Move compression, previews, malware scanning, exports, ingestion, reminders and other CPU/IO-heavy work off request threads; return a durable job/status contract promptly.
- [ ] **[PRD-C147]** Verify connection-pool, worker-concurrency, queue, provider and per-tenant limits apply backpressure instead of exhausting memory, sockets or database connections.
- [ ] **[PRD-C148]** Add automated performance-regression gates for declared critical paths; fail on statistically meaningful latency, query-count, buffer, payload or memory regression.

#### 12.2 Next.js, TanStack Query and perceived speed

- [ ] **[PRD-C149]** Meet Core Web Vitals targets on production builds for in-scope authenticated routes: LCP ≤ 2.5 s, INP ≤ 200 ms and CLS ≤ 0.1 at the defined reference viewport/device profile.
- [ ] **[PRD-C150]** Show navigation, skeleton, optimistic or queued feedback within 100 ms of user intent; never leave an action apparently unresponsive while work runs.
- [ ] **[PRD-C151]** Record route-level JavaScript, CSS, server payload, image/font and third-party budgets; lazy-load module editors, charts, calendars, chat media and AI interfaces not required for first render.
- [x] Eliminate request waterfalls where dependencies are known, prefetch only likely/authorized routes and prevent speculative prefetch from leaking or overloading tenant data.
      Evidence: ticket 27 is 7/7 closed; five avoidable waterfalls were removed and navigation prefetch now occurs only on authorized user intent with href deduplication.
- [x] Virtualize or incrementally render large chat, calendar, inbox, notification, directory, HR and Build collections while preserving accessibility and cursor correctness.
      Evidence: ticket 27 records bounded rendering for every named collection family with cursor/accessibility-focused coverage.
- [x] Optimize images, fonts and eligible static assets, use HTTP compression for text responses and keep upload/media transformations asynchronous.
      Evidence: ticket 27 closed its asset/lazy-boundary criterion and ticket 33 implemented asynchronous upload transformations; final route-byte/Web Vitals acceptance remains separately open in ticket 26.
- [x] Measure memory, render count, long tasks and hydration mismatches on representative Home/module journeys; eliminate avoidable rerenders and main-thread blocking.
      Evidence: ticket 27 recorded 0 hydration mismatches across 192 checks, stable post-GC memory and measured desktop/mobile long-task results.

#### 12.3 AI gateway, retrieval and streaming

- [x] Route every AI feature through one backend AI gateway with small model/provider interfaces, centralized timeouts, usage accounting, policy, redaction and observable error modes; no frontend direct-provider calls.
      Evidence: tickets 09 and 10 removed direct embedding consumers outside the gateway, made concurrency control required and verified no frontend provider SDK/call path.
- [x] Keep AI out of authentication and authorization decisions; deterministic RBAC and tenant/record ACL checks must finish before retrieval or provider invocation.
      Evidence: ticket 10 verified permission/record/space access before embedding or completion and zero AI writes to authority data.
- [x] Reserve token-metered credits atomically before paid calls, settle actual input/output usage in milli-credits and refund only according to the documented failure contract.
      Evidence: ticket 10 is 6/6 closed with one reservation per embedding batch, actual-token settlement and idempotent release/settlement behavior.
- [x] Bound prompts, history, retrieved chunks, tool iterations, output tokens, concurrency and per-tenant/user rate; reject or summarize oversized context rather than consuming unbounded memory/cost.
      Evidence: ticket 09 closed prompt/history/chunk/output and concurrency bounds with slot release on success, abort, setup failure and credit refusal.
- [ ] **[PRD-C152]** Stream text/tool progress to the client rather than buffering a complete answer; target application overhead before provider dispatch at p95 ≤ 250 ms and first visible streamed state within 100 ms.
- [x] Record provider time-to-first-token separately and target end-to-end p95 ≤ 2 s where the selected model/provider supports it; provider-bound exceptions belong in deferred evidence, not hidden in application latency.
      Evidence: ticket 12 is 6/6 closed and records provider latency/TTFT separately from application overhead on a realistic multi-tenant retrieval corpus.
- [ ] **[PRD-C153]** Propagate client aborts, enforce deadlines and circuit breakers, and retry only replay-safe pre-stream operations; never duplicate a paid request or continue spending after cancellation.
- [ ] **[PRD-C154]** Validate structured outputs, preserve citation/source integrity and show a safe partial/error state when the model, retrieval, tool or stream fails.
- [ ] **[PRD-C155]** Verify AI frontend states for credit exhaustion, queueing, streaming, cancellation, retry, partial output, citation loading, provider failure and permission revocation without duplicate requests.
- [x] Emit tenant-safe metrics for queue time, application overhead, provider latency, time-to-first-token, tokens, credits/cost, cache hit, cancellation, retry and failure without logging prompts or sensitive content.
      Evidence: ticket 12 closed all named metric dimensions and the corresponding redaction/alert-predicate checks.

## Frontend verification run — 2026-09-02 (head `05bdb700c`)

**Frontend suite 246/246 suites, 2307/2307 tests. `tsc --noEmit` clean. 25 of 27 frontend gates pass.** Lint and e2e were not requested and are reported as not run, never as passing.

Correction to the historical entry below: `check:web-vitals-budget` and `check:route-bundle-budget` **do** run here — they read `.browser-driver-results.json`, not a fresh build. `check:route-bundle-budget` passes (5 routes, 5 measured, 0 pending). `check:web-vitals-budget` **fails** against a real `serverMode: "production"` capture of `/mail`, `/inbox`, `/dashboard` taken 2026-09-01 at 5 repetitions:

| Profile | Metric | Measured | Budget |
|---|---|---|---|
| mobile | INP p75 | 392 ms | 200 ms |
| mobile | FCP p75 | 2188 ms | 1800 ms |
| mobile | TTFB p95 | 2641 ms | 600 ms |
| desktop | LCP p75 | 2578 ms | 1500 ms |
| desktop | FCP p75 | 2432 ms | 1200 ms |
| desktop | TTFB p95 | 2946 ms | 400 ms |

Measured over localhost, so TTFB carries local variance, but these are the project's own budgets measured the project's own way and they are breached. This is the standing evidence for §12.2's Core Web Vitals item, which stays open.

### Route thinning dropped the gate on 16 server pages

Converting pages to thin server components removes the client `useCan` gate without replacing it. Each of the 16 now carries the permission the backend enforces on the data it reads, taken from the OpenAPI `x-permission` of the route the page's hooks call — verified present verbatim in both the frontend and backend catalogs.

`build/inbox` takes `requireSession()` rather than a permission key: it renders the caller's own notifications, which are platform-core self-service under §8, and `build/layout.tsx` already enforces `enforceRouteAccess("/build")`.

### Defects found this run

| Severity | Defect | State |
|---|---|---|
| P2 | The Support nav group and its `/support` and `/support/inbox` routes were gated on `build:tickets:view` — a Build key on Support routes. The links tracked Build access, not Support access: a support agent saw no Support inbox link, and a Build user saw links the server refuses. | Fixed — repointed to `dashboard:support:view` and `support:tickets:view` |
| P2 | The `CUSTOMER_SUPPORT` role template grants 7 of the 22 `support:*` keys. It omits `support:tickets:view`, `support:tickets:create`, `support:tickets:reply`, `support:reports:view`, `support:settings:manage`, `support:knowledge-gaps:view`, `support:queues:manage`, `support:tags:manage`, `support:channels:manage` and the `support:csat:*` / `support:ai:*` pairs. Neither catalog implements `manage` ⇒ `view`, so the granted `support:tickets:manage` does not admit the inbox. A seeded support agent is refused the module's core surface by the backend as well as the page. | Open — granting keys to a role expands access and is a product decision |
| P3 | 11 authenticated server pages carry neither a page gate nor a module layout gate: `sign/*` (7) and one each under `surveys`, `dashboard`, `inbox` and `chat/invite/[token]`. All inherit `requireSession()` from `(authenticated)/layout.tsx`, and the backend still enforces per-route permissions, so this is a defence-in-depth gap rather than a data leak. `dashboard`, `inbox` and the token-authorized chat invite are session-only by design under §8; `sign` and `surveys` are gated modules and are not. | Open |

`page-level-gates.test.ts` covers only `build`, `settings`, `billing`, `support` and `timesheets`, which is why the `sign` and `surveys` gaps sit outside it. Its `GATE_PATTERN` also accepts `requireSession`, so it cannot distinguish a session gate from a permission gate; its third case asserts `toBeGreaterThanOrEqual(0)` per module and only the `totalClient <= 65` ceiling bites.

## Historical verification run — 2026-09-02

Retained as an audit trail from the pre-`0bf058f6a` working tree; it is not current-head release evidence and does not override the current snapshot or blockers above. Gates were executed at one working tree and the recorded numbers are real runs, not estimates.

**Backend** 50 of 56 executed gates pass. `check:vulnerabilities`, `check:licenses`, `check:migration-ledger`, `check:migration-rollback`, `check:tenant-isolation:run` and the `:emit`/`:baseline` variants were not executed in this run and are reported as not run, never as passing.

Still failing, each owned:

| Gate | State |
|---|---|
| `check:over-300` | 395 vs a 394 baseline. The single regression is `kb-rag.service.ts` (240 → 367 when public KB streaming landed); being split along retrieval / answering |
| `check:tenant-relationships` | needs `scratch_boot_a`, which the bootstrap run held |

`check:spec-typecheck` and `check:file-sizes` now pass: `roles.service.ts` (506) and `support-kb.service.ts` (508) were split by responsibility and every caller repointed.

**Not run — prerequisites absent, so reported as not run rather than failing:**

| Gate | Prerequisite |
|---|---|
| `check:audit-log-privileges` | `APP_DATABASE_URL` for the non-owner `streamline_app` role. The immutability migrations (`0840`, `0928`, `0930`) DO apply — a fresh bootstrap applied all 633. Their future-dated journal `when` places them above the watermark, not below it, so they are not skipped |
| `check:alert-ack` | a real `ALERT_WEBHOOK_URL` plus a human confirming the drill nonce. No code change can substitute: a webhook that returns 200 into a dead channel is indistinguishable from a working one until an incident |
| `check:vulnerabilities`, `check:licenses`, `check:migration-ledger`, `check:migration-rollback`, `check:tenant-isolation:run` | network or live database |

Both of the first two had a blind spot that was fixed while they remain unrunnable here: the privileges gate never asserted *which* role it connected as, and the ack gate never exercised its undelivered branch.

**The journal's 237 future-dated entries are deliberate and already gated.** `check:migration-discipline` rule 8 requires strictly increasing `when` and states the hazard: an entry at or below the applied watermark is skipped while `db:migrate` still prints success. The journal has zero inversions, so nothing is silently skipped. The live constraint is that a new migration must be stamped above 2027-02-19, which that gate enforces.

**Frontend** 20 of 22 executed gates pass; `check:web-vitals-budget` and `check:route-bundle-budget` need a real production build and were not run.

**Cold bootstrap** `applied=633 skipped=1 failures=0`; catalog parity against an independent bootstrap reports `differences=0` across tables, columns, constraints, indexes, policies, functions, triggers, extensions, enums and rlsEnabled.

### Defects found and fixed this run

| Severity | Defect |
|---|---|
| P1 | `streamAnswer` called the model to echo a fixed no-context string, before the credit reservation, on a `@Public()` route where the caller supplies the org id — unmetered spend on anonymous traffic. The non-streaming path already returned the constant directly. |
| P1 | `GET /deals/export` ignored DataScope while its sibling list endpoint applied it, so an `own`-scoped member could export every deal in the organisation. |
| P1 | Migration `0628` read `chat_messages.reactions` unguarded; `0652` drops that column, so after any failed `0628` the chain could never replay. Eight dependent migrations cascaded. |
| P1 | GDPR erasure paged article and source lookups with `LIMIT 1000`, silently leaving a prolific subject's chunks and embeddings behind while reporting success. |
| P2 | `addWatcher`'s `userId` was removed as unused; the frontend member picker posts it, and the replacement bare `z.object({})` strips rather than rejects, so the caller would have been watched instead of the chosen person. |
| P2 | `CronOutboxRetentionService` swept every organisation in one global DELETE with no tenant context, against the stated rule and its own sibling. Now per-org via `forEachOrg`. |
| P2 | A global ETag interceptor duplicated framework behaviour, double-serialised every authenticated GET and threw `ERR_HTTP_HEADERS_SENT` on every `@Res()` download. Removed. |
| P3 | Two payroll queries regressed to unbounded reads; both re-bounded by their own input length. |

### Test-integrity defects found

A passing test proves nothing until it can fail. These were passing while asserting nothing:

- `project-webhook-atomicity.spec.ts` held its webhook mock in the wrong constructor slot after a parameter was inserted ahead of it, so `expect(enqueue).not.toHaveBeenCalled()` was wired to a collaborator that never existed.
- Dashboard isolation specs targeted queries the service no longer builds after delegation; re-pointed to assert the caller's `orgId`/`userId` reaches each collaborator, which is where the guarantee now lives.
- `check-command-catalog.mjs` treated `*` as a wildcard on both sides, so an interpolated hook path matched any same-shape route. It reported zero while 36 mutation hooks carried the wrong permission key.

## Immediate code-level final gate

- [ ] **[PRD-C156]** Every unchecked item under **Immediate code-level release candidate** is complete with fresh evidence.
- [ ] **[PRD-C157]** CRM/Inventory remain excluded and public landing visuals/animations remain unchanged.
- [ ] **[PRD-C158]** Backend/frontend builds, typechecks, focused tests, disposable E2E and architecture gates pass at one commit.
- [ ] **[PRD-C159]** Two empty bootstraps and an interrupted-then-resumed bootstrap produce the same expected database catalog from the new authorized baseline; no legacy watermark upgrade claim is required.
- [ ] **[PRD-C160]** No unresolved code-level P0/P1 finding remains.
- [ ] **[PRD-C161]** Release authority records commit, evidence, accepted code-level residual risks and date.

Completing this gate permits the label **code-level 10/10 release candidate** only.

## Closure and future-review protocol

This section prevents the completion target from moving after the work is done.

- The checklist is closed only at one recorded release commit where every immediate checkbox is evidenced, every named blocker above is resolved, the final integration gate passes, and no reproducible code-level P0/P1 remains.
- At that point, reviewers must report the release commit as the **top-notch code-level architecture baseline (10/10 release candidate)** for the stated scope. They must not reopen it for naming taste, cosmetic rewrites, speculative abstractions, a preferred framework pattern, or production-only evidence already classified as deferred.
- A later reviewer may add work only by recording one of four change classes: **REGRESSION** (the certified gate now fails), **NEW REQUIREMENT** (scope or acceptance behavior changed), **NEWLY DISCOVERED RISK** (a concrete correctness, security, scale or operability failure with reproducible evidence), or **PRODUCTION EVIDENCE** (a deferred deployed-environment gate). Every addition must name the affected commit, executable reproduction or evidence, severity, owner and concrete failure prevented.
- Newly discovered work does not retroactively make the certified evidence false. It creates a new dated delta from the certified baseline. The baseline remains the answer to “was this PRD completed at that commit?”
- KEEP is the default verdict for a module whose interface, tenancy, authorization, query, cache, async, frontend and verification contracts pass. A REFACTOR or REMOVE verdict is invalid unless it identifies what breaks at target scale or under a defined failure scenario.
- “Bug-free forever,” “nothing can ever be improved,” and “million-user proven” are not code-review claims. The strongest truthful code-only claim is the certified 10/10 release candidate above; production-proven 10/10 additionally requires the deferred gate.

## Deferred production-readiness evidence

These are intentionally postponed until infrastructure, provider access and approvers are available. They are not immediate code-release blockers and cannot be completed from mocks.

### Deployed security, provider and performance

- [ ] **[PRD-C162]** Run real payment, realtime, email and push sandbox replay, forgery, outage, suppression, cancellation, retry-exhaustion and recovery scenarios.
- [ ] **[PRD-C163]** Verify deployed TLS, encryption at rest, infrastructure secret isolation and credential/key rotation.
- [ ] **[PRD-C164]** Verify deployed edge WAF/rate limits, CORS, CSP, headers, request limits and malicious traffic behavior.
- [ ] **[PRD-C165]** Produce production-build/reference-device Web Vitals evidence; obtain Product acceptance if frozen landing animation prevents its agreed target.
- [ ] **[PRD-C166]** Run realistic load and capture pools, queues, CPU, memory, errors, replica behavior and sustained/burst capacity.
- [ ] **[PRD-C167]** Prove declared SLOs with at least 40% capacity headroom.

### Cloud, recovery and operations

- [ ] **[PRD-C168]** Provision isolated per-cell database, cache, queue/workers, realtime/provider, search/vector, object storage and monitoring.
- [ ] **[PRD-C169]** Prove credentials, routing, jobs, namespaces and data cannot cross cells using [RB-01](runbooks/RB-01-cell-isolation.md) and [RB-08](runbooks/RB-08-cell-resource-accounts.md).
- [ ] **[PRD-C170]** Provision a physical replica and prove lag/fallback using [RB-03](runbooks/RB-03-read-replica.md).
- [ ] **[PRD-C171]** Configure five-minute-or-better PITR/RPO and run recovery/relocation drills using [RB-02](runbooks/RB-02-pitr-backup.md) and [RB-04](runbooks/RB-04-recovery-drill.md).
- [ ] **[PRD-C172]** Measure/approve per-cell and active-tenant cost using [RB-07](runbooks/RB-07-per-cell-cost.md).
- [ ] **[PRD-C173]** Configure production logs, traces and release metadata with redaction.
- [ ] **[PRD-C174]** Test live alerts and human acknowledgement using [RB-06](runbooks/RB-06-live-alert-delivery.md).
- [ ] **[PRD-C175]** Capture passing RB-01â€“RB-08 manifests under [production evidence](final-refactor/evidence/42-production-ops/README.md) with identity, topology, SHA, operator, timestamps, exit code and hashes.
- [ ] **[PRD-C176]** Prove rolling compatibility, canary aborts, kill switches, degraded modes and rollback/forward-fix under induced failure.
- [ ] **[PRD-C177]** Verify probes, graceful shutdown, draining, worker lease recovery and duplicate/loss safety during deployment/autoscaling.
- [ ] **[PRD-C178]** Publish on-call ownership, escalation, incident severity, customer/status communication and post-incident review procedures.
- [ ] **[PRD-C179]** Prove backups are encrypted, controlled, restorable and periodically tested with documented key ownership.

### Compliance and approvals

- [ ] **[PRD-C180]** Approve operator/break-glass roles, reason, two-person/no-self approval, duration, expiry, tenant scope, notification, immutable audit and revocation.
- [ ] **[PRD-C181]** Verify deployed sensitive routes reject expired, revoked, cross-tenant, wrong-scope, concurrent-approval and audit-failure cases.
- [ ] **[PRD-C182]** Obtain named Product, Security, Privacy/DPO, Operations, Legal and Finance decisions using [RB-10](runbooks/RB-10-privacy-compliance-decisions.md) and [the decision template](decisions/README.md).
- [ ] **[PRD-C183]** Complete [DATA-CATALOGUE.md](DATA-CATALOGUE.md) with purpose, lawful basis, subjects, processors, location, retention, owner and deletion behavior.
- [ ] **[PRD-C184]** Decide PII policy for audit metadata, residency/transfers, subprocessors, breach handling, payroll/tax jurisdiction and controller/processor duties.
- [ ] **[PRD-C185]** Approve AI/integration providers, regions, PII minimization, retention, deletion and disclosure.
- [ ] **[PRD-C186]** Run deployed export, correction, portability, erasure, legal-hold, transfer, cross-tenant and repeat-request drills.
- [ ] **[PRD-C187]** Prove deployed object/search/vector/cache/downstream deletion plus backup aging and restore-time deletion.
- [ ] **[PRD-C188]** Run retention/legal-hold drills and store a redacted, hashed evidence bundle.
- [ ] **[PRD-C189]** Close or formally disposition every production/security/privacy/compliance P0/P1 finding.

## Production-ready final gate

- [ ] **[PRD-C190]** Immediate code-level gate remains green at the deployed commit.
- [ ] **[PRD-C191]** Every deferred checkbox is complete with current evidence.
- [ ] **[PRD-C192]** Production evidence proves isolation, recovery, SLO/headroom, unit cost, live alerts and acknowledgement.
- [ ] **[PRD-C193]** Required Product, Security, Privacy/DPO, Operations, Legal and Finance approvals are recorded.
- [ ] **[PRD-C194]** No unresolved production/compliance P0/P1 finding remains.
- [ ] **[PRD-C195]** Release authority records commit, environment, evidence, accepted residual risks and date.

Only this final gate permits the label **production-proven 10/10**.
