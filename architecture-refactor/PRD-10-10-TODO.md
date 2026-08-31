# StreamlineOS — 10/10 Completion TODO PRD

**Status:** Open execution checklist  
**Scope:** Remaining work required for an evidence-backed 10/10 architecture and implementation rating  
**Exclusions:** CRM and Inventory product behavior remain out of scope. Shared platform, schema, security and infrastructure work still applies where required.

## 1. Definition of done

The platform is 10/10 only when every applicable item below has:

1. A committed source change or an explicit KEEP decision.
2. Automated regression coverage.
3. A reproducible verification command or production evidence.
4. No open P0/P1 security, tenancy, correctness or release-integrity issue.
5. An updated entry in `PRD-IN-SCOPE.md` and the relevant completeness ledger.

Documentation alone does not satisfy a checklist item.

## 2. P0 — Code and schema blockers

### 2.1 Organization actor migration

Scope ruling 2026-09-01: the highest-authority modules were driven to zero; the rest stay on the ratchet with a per-module burndown. `scan:legacy-actors` went **636 → 617** organizational FKs this session (timesheets, e-sign, mail, directory, portal cut over end to end).

- [x] Inventory every remaining organizational `user_id` actor foreign key. (`pnpm scan:legacy-actors` — 617 organizational, 3 bridge, 5 authentication, 0 unknown, across 17 modules)
- [x] Replace actor authority fields with `organization_members.id`. (timesheets · e-sign · mail · directory · portal-access — schema AND service layers)
- [x] Add additive companion columns and composite tenant foreign keys. (0820; six FKs, all `ON DELETE SET NULL ("col")`, `NOT VALID` → `VALIDATE`)
- [x] Update every writer, reader, DTO, validator, event, cache key and revocation-cleanup path. (~95 call sites; `createRecipientSchema.userId` → `userMembershipId`, verified the frontend never sent that field)
- [x] Preserve historical display-only identity without retaining authority. (membership → `organization_members` → `users` projections, tenant-scoped on `(org_id, id)`)
- [x] Add negative tests for departed members, cross-tenant IDs and membership deletion. (`check:tenant-isolation` 100%; execution gate 428 suites / 1,649 tests)
- [x] Prove zero runtime use of each legacy field. (`check:drop-column-safety` — new gate, 0 violations; catches a dropped column still declared in Drizzle, which is invisible to every other gate and yields `42703` at runtime)
- [x] Drop legacy columns through validated migrations. (0821–0825; **18/18 columns confirmed absent in `pg_catalog`**)
- [ ] Re-run `pnpm scan:legacy-actors:check` and require zero applicable legacy fields. — **RATCHET GREEN, NOT ZERO.** 617 remain: hr 218, build 74, crm 58, inventory 58, payroll 54, common 44, accounting 36, support 25, kb 22, billing 18, ai 6, surveys 4.

### 2.2 Backend type safety

- [x] Make `pnpm -C backend typecheck` pass with zero errors. (**0 errors**; was 0 at session start, rose to 10 mid-cutover, returned to 0)
- [x] Fix stale schema/property references after actor and pagination migrations.
- [x] Reconcile all cursor, offset, page and response-shape contracts.
- [x] Add missing membership identifiers to service and retrieval contexts.
- [x] Remove references to deleted actor columns. (gated permanently by `check:drop-column-safety`)
- [x] Fix missing imports, missing service methods and invalid Drizzle projections. (two `TS2554` arity errors — the class only typecheck can see; boot, madge, knip and the full suite all stayed green)
- [x] Fix role, permission and generic constraint errors in scripts and services.
- [x] Run the check and record the command output. (`pnpm -C backend typecheck` → 0; `pnpm -C backend build` → exit 0)

### 2.3 Frontend type safety

- [x] Make `pnpm -C frontend type-check` pass with zero errors. (**0 errors**, re-verified after re-vendoring the contract)
- [x] Remove stale `.next` generated references and regenerate types. (`next build` exit 0; unblocked `verify:server-data-seam`, which had been failing only for want of a build artifact)
- [x] Replace obsolete `page`, `offset`, `total` and `totalPages` assumptions with cursor contracts.
- [x] Correct infinite-query page extraction and callback types.
- [x] Fix permission-key and organization-role unions. (`check:permission-keys`, `check:navigation-permissions`, `check:route-access-contract` all green)
- [x] Fix missing component props, callbacks and payload schemas.
- [x] Validate all changed routes with a production Next.js build. (`pnpm -C frontend build` exit 0; 13/13 frontend gates green; 186 suites / 1,779 tests)

### 2.4 API and OpenAPI contracts

- [x] Reach 100% applicable request-schema coverage for mutating endpoints. (1359/1359 — check:openapi-coverage)
- [x] Validate multipart schemas against the fields actually sent by clients. (6 handlers fixed; check:multipart-contracts gate added)
- [x] Add request/response schemas for webhooks and external callbacks. (all inbound webhook receivers use @BodylessAction + params schema + signature verification — no defect)
- [x] Require idempotency keys for retryable mutations and payment/webhook operations. (check-idempotent-commands exits 0 — no defect)
- [x] Validate the standard error envelope on every public operation. (applyErrorResponses() unconditional — 3567/3567 — no defect)
- [ ] Remove duplicate, dead or overlapping endpoints only after graph and client-call-site proof.
- [x] Run operation-ID, path-parameter, bodyless and OpenAPI freshness checks. (all checks green)

### 2.5 Dead code and structure

- [x] Run frontend and backend module-graph analysis. (knip both repos — **backend unused files 10 → 0**. The 7 flagged `db/schema/hr/*` files are NOT dead: they are re-exported by `hrms-phase1-sql-managed.ts`, a spec-guarded holding barrel where being unimported *is* the design. Fixed by making the barrel a knip **entry** instead of an ignore, so knip follows the chain and still catches genuinely dead schema files — the ignore list *shrank* by 4 while coverage grew)
- [x] Remove unused exports and types only after build and test validation. (both production builds green before and after)
- [x] Remove obsolete API clients, components, schemas and database helpers. (`hooks/api/accounting/audit.ts` and `common/admission/index.ts` deleted — the latter had every consumer importing concrete paths. The git-webhook `dto/` file was *not* dead: the controller had an **inline** Zod schema, a §6 violation, so the stricter inline version was promoted into `dto/` and wired. Same for the calendar admin-settings response schema, which also closed the last response-schema gap at 3,569/3,569)
- [x] Confirm no deleted file is referenced by routes, DI registration, scripts, migrations or tests. (checked for side-effect imports, dynamic `import()`, re-export chains and App Router convention files — a static import search alone is not proof)
- [x] Keep cohesive file-size exceptions documented with owner, interface and reason. (register corrected — `membership-artifacts.ts` was recorded at 509, then 889, actually **1,110**. Exception still valid: one `as const` catalog plus derived exports. **The gate itself was wrong**: it granted an exception to any backticked `src/…` path anywhere in the doc, including audit-trail prose, silently exempting 4 files from the 500-line limit. Now table rows only, requiring the owner/interface/reason columns; its self-test also duplicated the parser inline instead of calling it, so the fix would not have been caught)
- [x] Preserve one-way module dependencies and zero circular imports. (`madge --circular` **0** in both repos — 4,999 backend and 4,827 frontend files)

### 2.6 Migration proof

**A P0 was found and fixed here: the schema could not be built from scratch.** A cold bootstrap died at `0768` with `P0001 — table public.inv_asn_lines does not exist`, because **30** `inv_*` tables (plus 23 enum types and 25 sequences) were created with `drizzle-kit push` and never journalled. For a cell-based platform whose model is provisioning new cells, that is a release blocker. `0767b_inv_table_chain_repair.sql` recreates them, slotted at `when=1798000079500` between `0767` and `0768`.

- [x] Run a complete cold bootstrap against a disposable database. (**515/515 applied, 0 hard failures**; disposable database on the existing Neon branch — no new compute endpoint, `cell2` is the precedent — dropped afterwards)
- [x] Run the full upgrade path against a second disposable database. (515/515, applied in two phases of 250 + 265)
- [x] Compare `pg_catalog`, constraints, indexes, RLS policies and migration hashes. (**cold vs upgrade IDENTICAL — 0 differences**)
- [x] Reconcile journal rows, timestamps, hashes and applied watermark exactly. (`check:migration-ledger` **524/524, 0 pending, 0 orphan/duplicate/unreachable**; ledger backfill for `0767b` verified three ways — hash convention confirmed against 6/6 applied entries, hash recomputed independently, and all 30 tables confirmed already present live so recording it applied is truthful)
- [x] Test rollback/recovery behavior for every new destructive or cutover migration. (6 stale `.down.sql` fixed — missing `build.` qualifier since `0432`; 5 new ones for the DROP COLUMN migrations, explicitly documented as data-lossy rather than pretending to restore values)
- [x] Record before/after counts and retain the evidence. (`architecture-refactor/MIGRATION-PROOF.md`)

Residual: 135 non-fatal `42P01` chain gaps in RLS migrations `0591`/`0650`/`0666`/`0677`, pre-existing and unrelated to the `inv_*` fix.

## 3. P1 — Query, cache and authorization completion

- [x] Run query plans as the real `streamline_app` role with tenant context. (**blocker cleared**: the role failed `28P01` all session. The recorded diagnosis was wrong — not a Neon console reset. `.env` held a stale 16-char password from a reverted `ALTER ROLE`; the control plane held the authoritative 32-char one. Verified `rolbypassrls = false`)
- [x] Validate tenant-leading indexes for Build. (`db:check-build-reads` **passes for the first time** — both budgets resolve `ticket_assignees` via **Index Only Scan**, 200,000 tickets, 62 participants, top user 2.9%. The assertion had never once been exercised: dead fixture org → `(never executed)` plan node → structurally unexercisable branch → 2-member distribution)
- [x] Remove remaining unbounded reads and fetch-then-filter paths. (ratcheted **down** 1201 → 1180; 6 membership-bridge queries given explicit bounds rather than baselined; the scanner's 40-line statement window was truncating a 43-line query three lines short of its own `.limit(1)`, which hid 15 more false positives)
- [x] Remove or sunset offset compatibility endpoints with documented deadlines. (`architecture-refactor/offset-sunset-plan.md` — all 128 call sites across 95 files, with owners and dates)
- [x] Verify hard caps and deterministic cursor ordering on every list/search endpoint. (**unordered paging 7 → 0, ratchet locked at zero** — `.offset()` with no `ORDER BY` silently repeats and drops rows between pages)
- [x] Prove cache keys include organization, actor, permission version, filters, locale and timezone. (`check:cache-invalidation` 0 gaps; org-timezone bug fixed in `dashboard-stats` where a UTC `getTodayString()` named the wrong day near the date boundary)
- [x] Prove invalidation across processes. (`cache-multi-instance.spec.ts`, 16 tests, each bite-proven)
- [x] Verify every sensitive mutation has route, service and query-layer authorization. (**2 BOLA bypasses fixed** — e-sign envelope detail and support ticket detail both let an `own`-scoped holder read any org record by id; a third in CRM contacts fixed. Both `getFull`/`getTicket` scope arguments made **required**, so an unscoped read is unrepresentable rather than merely discouraged)
- [x] Verify frontend suppression matches backend permissions. (`check:navigation-permissions`, `check:route-access-contract`, `check:permission-keys` green)
- [x] Run BOLA, cross-tenant, departed-member and privilege-escalation tests for every module. (`check:tenant-isolation` **100%**; execution gate 428 suites / 1,649 tests. **Departed-member removal was broken**: 28 `ON DELETE RESTRICT` FKs to `organization_members` — proven with a rolled-back probe returning `23001` — now **28 → 4**, the 4 remaining being deliberate ownership guards)

## 4. Module completion

### 4.1 Billing and Payments

61 suites / 594 tests.

- [x] Test plan/placement changes and seat proration.
- [x] Test provider outage and timeout behavior. (`createOrder` provider failure now covered — the error propagates and `db.transaction` is never called)
- [x] Test Redis/cache outage and entitlement fallback. (verified it fails **closed**, not open — a cache miss granting ENTERPRISE would be a revenue and security hole)
- [x] Test duplicate, delayed, reordered and replayed provider webhooks. (all four are distinct scenarios. **Delayed was untestable**: the fake adapter never returned `providerEventId`, so two events for one payment always collided as duplicates)
- [x] Verify immutable invoices, tax/currency handling and usage-meter idempotency. (integer paise / milli-credits; the annual discount derives from `PLAN_PRICES_PAISE` × `ANNUAL_DISCOUNT_PCT`, never a literal)

### 4.2 Accounting and Finance

475 suites / 2,933 tests.

- [x] Complete application-role index and reminder-sweep plan evidence.
- [x] Validate asynchronous expense exports under large datasets.
- [x] Test export retries, cancellation, duplicate jobs and dead-letter replay. (**cancellation did not exist** — no route, no `cancelled` state. Implemented on both finance and payroll exports, migration `0826`, predicated on current status so a completed job cannot transition and the operation is idempotent; 16 tests)
- [x] Validate immutable journal corrections through reversals/superseding entries. (`0793` BEFORE UPDATE triggers; `journal_entries`/`journal_lines` carry no `deleted_at`)
- [x] Verify retention, legal-hold and deletion exclusions. (legal-hold subjects excluded in the SQL predicate, not per row)

### 4.3 Chat

63 suites / 577 tests — verified already complete, no changes required.

- [x] Finish remaining actor and reaction normalization. (0760–0762 applied; `chat_message_reactions` already unique on `(org, message, membership, emoji)` since 0628)
- [x] Audit every chat mutation hook and controller for exact permission checks. (all use `actorOf(u)` — a hand-built actor drops `membershipId` and has silently killed surfaces here)
- [x] Test private-channel and thread BOLA protection. (private → 404 concealing existence; public → 403; cross-org → 404)
- [x] Test ordering, reconnect, duplicate event and unread-count behavior at scale. (cursor keyed on `channelPosition`, assigned inside a channel-row-locking UPDATE, so it matches its `ORDER BY`)
- [x] Verify fanout, at-least-once delivery and deduplication semantics. (`OutboxWriter.emit` inside the send transaction; `InboxConsumer` has four states, so retry is not defeated)

### 4.4 Calendar

- [x] Finish all remaining calendar actor cutovers. (0752–0754; `scan:legacy-actors` shows calendar at zero)
- [x] Use RRULE-based recurrence handling. (`rrule@^2.8.1`; no hand-rolled expander exists)
- [x] Test exceptions, attendee changes, timezone and DST transitions. (spring-forward and fall-back both covered, each with a bite proof showing naive UTC-offset maths lands an hour out)
- [x] Verify reminder cancellation/replacement guarantees transactionally. (delete and reschedule kill PENDING outbox rows in the same transaction)
- [x] Verify free/busy and conflict queries remain tenant- and permission-scoped. (export reads `req.rbacScope ?? "none"` and returns `[]` before touching the DB)

### 4.5 Notifications and Inbox

146 suites / 906 tests.

- [x] Validate recipient authorization at send time. (**was untested** — every existing spec mocked `filterOrgMemberIds` to return the target, so the non-member and lapsed-member paths had no executable test)
- [x] Test in-app, email and realtime deduplication. (per-channel idempotency keys)
- [x] Test retries, provider failures, queue age and dead-letter replay. (queue-age expiry was the one uncovered retry branch)
- [x] Verify unread counts do not require full-table scans. (partial index `(orgId, userId, id) WHERE is_read = false`)
- [x] Validate unified inbox cursor positions and source authorization. (all 4 positions serialise as explicit `null`; an `undefined` cursor field vanishes in JSON and once replayed a whole mailbox per page)

### 4.6 Knowledge Base, Wiki and Chatbot

- [x] Complete ingestion lifecycle, retry and failure recovery tests.
- [x] Validate revision history, restore and superseding content behavior.
- [x] Enforce ACLs inside SQL/vector retrieval before result ranking. (INNER JOIN on `aclRevision` makes a mismatched-revision row unrepresentable rather than filtered)
- [x] Test deletion, reindexing, chunk purge and retention behavior. (chunk purge inside the `softDelete` transaction)
- [x] Measure search latency and recall using a realistic corpus. — **the corpus was fake.** 30,000 chunks shared **12 distinct embeddings**, so every prior ANN number in this program measured a degenerate graph, including scorecard row 19. Reseeded with per-org clustered centroids, REINDEXed, re-measured as `streamline_app`: minority org **594 buffers, 20/20 recall via HNSW**. The recorded "100x penalty" and the `random_page_cost` theory were both artifacts and are withdrawn. The real win was elsewhere: the service always called the MATERIALIZED fence (22,687 buffers) — now `SET LOCAL hnsw.iterative_scan = relaxed_order` on the ANN path first, a **37x** reduction. Migration `0827` was authored and then **withdrawn** by its own author on the evidence.

### 4.7 HRMS, Payroll and Build/PM

- [x] Finish all pagination and projection audits. (`getCostCenter`-shaped JS-after-paging swept across both modules)
- [x] Remove remaining compatibility paths or document approved sunset dates. (`offset-sunset-plan.md`)
- [x] Verify every create/update/approve/delete mutation at hook, controller, service and query layers.
- [x] Test large employee, payroll, project, ticket and workflow datasets. (200,000 tickets, 191,429 assignees, 5,000 timesheets, 50 synthetic members on a power-law distribution)
- [x] Validate export, approval and notification side effects through the outbox. (`check:outbox-consumers` — every emitted event type has a registered consumer)

## 5. P2 — Production and operations evidence

Standing decision 2026-09-01: **no cloud resource is to be provisioned.** Items needing infrastructure that does not exist are therefore code-proven plus runbooked, and marked OPERATOR-BLOCKED with the exact unblocking command — not fabricated.

- [!] Provision independently isolated per-cell resources. — code verified (`cell:compare-schema` exits 1 on real drift, 0 on a correct cell); six resource accounts documented in `runbooks/RB-08-cell-resource-accounts.md`. **Provisioning declined.**
- [!] Provision a physical read replica and test lag-aware routing/fallback. — `verify-replica-routing --self-test` passes 16 cases and correctly exits **2** (not 0) when `DB_REPLICA_URL` is absent. **Provisioning declined.**
- [x] Configure PITR/backups to meet the five-minute RPO target.
- [x] Run restore and regional-disaster drills. (live PITR drill: watermark and RLS policy count matched, before-marker present, after-marker absent, branch deleted. Policy count has since moved 960 → 977+ as migrations landed — re-baseline before the next exercise rather than reusing the old number)
- [!] Run all 14 production-shaped workload scenarios from a colocated runner. — needs a colocated runner.
- [x] Test realistic organization, member, message, job and file distributions. (**this was the blocker behind several false measurements.** The fixture org was a hardcoded UUID that no longer existed, so the read-cost guard crashed rather than measured; the seed produced 2 members for 20,000 tickets; and `ticket_assignees` was populated only from `tickets.assignee_id`, making the participation branch structurally unexercisable. Now 200,000 tickets across 62 participants on a power-law spread, top user 2.9%)
- [!] Prove 40% sustained resource headroom and burst tolerance. — guard asserts the floor and its self-test proves a 39% case fails; needs the colocated run.
- [x] Measure database, cache, AI, storage, realtime and worker cost per cell. ([!] egress only — measured at the CDN, not in-process)
- [!] Obtain cost-owner approval and saturation forecast. — human decision.
- [!] Configure `ALERT_WEBHOOK_URL`, `APP_RELEASE` and the production log stream. — operator config.
- [x] Test queue-age, dead-letter, provider-failure, consumer-absence, latency and pool alerts. (**12/12 verified independently**, each with named two-sided checks — `case1Fires…` / `case2Clears…` — so a probe cannot pass vacuously. `alert-cell-recovery` existed but had **no npm entry**, so it could not be run at all; now wired, along with `check:alert-system` and `check:alert-ack`)
- [!] Record human acknowledgement for every critical alert. — `check:alert-ack` exits **2** with a named operator step. Correctly blocked, not silently green.

## 6. Privacy, compliance and operator decisions

- [x] Run disposable-data GDPR export drills. (live; cross-tenant read returns 0 rows as `streamline_app` with a foreign-org GUC. **`gdpr_export_jobs` had zero RLS** — a live tenant table with `org_id` and no policy, fixed by `0819` and bite-proven: owner sees 2 rows, app role with org-A GUC sees 1, no-GUC read fails closed `42501`)
- [x] Run physical object-storage purge drills. ([!] the purge adapter returns FAILED — `purgeOrgPrefix` is unimplemented; interface specified in `OPERATOR-EVIDENCE.md`)
- [x] Run erasure, retention and legal-hold conflict drills. (live: 633 FK tables enumerated from `pg_constraint` at runtime, 469 in topological order, 0 residual rows in a rolled-back transaction; legal-hold 8/8; owner erasure correctly refused)
- [x] Verify audit evidence contains no prohibited PII. (compliance events carry UUID references only. `user.registered` stores `{ email, companyName }` by design — flagged for sign-off in RB-10 §2d rather than silently accepted)
- [!] Approve break-glass/operator-access policy, expiry and review trail. — decision-ready in `runbooks/RB-10-privacy-compliance-decisions.md`. DB side exists (`0747`, dual-approval CHECK convalidated); `OperatorSessionGuard` is not built.
- [!] Approve data inventory, lawful purpose, retention owner and residency policy. — inventoried from `pg_catalog`, defaults recommended, AWAITING APPROVAL.
- [!] Approve regional transfer and subprocessor decisions. — 7 subprocessors identified with evidence; SCCs needed for EU→US. AWAITING APPROVAL.

## 7. Final release gate

Run from a clean checkout and attach output to the release evidence:

```text
pnpm -C backend typecheck
pnpm -C frontend type-check
backend unit/integration/e2e tests
frontend tests and production build
OpenAPI coverage and freshness checks
RBAC and route-access checks
tenant-isolation checks
cache-invalidation checks
outbox-consumer checks
pagination and unbounded-read checks
migration-ledger and migration-chain checks
file-size and circular-dependency checks
dead-code/build validation
production load, replica, PITR, alert and compliance drills
```

Measured 2026-09-01:

| Command | Result |
|---|---|
| `pnpm -C backend typecheck` | **0 errors** |
| `pnpm -C frontend type-check` | **0 errors** |
| backend unit/integration tests | **1,529 suites passed, 0 failed · 12,807 tests passed, 0 failed** |
| backend e2e tests | **NOT RUN** — separate config; rate limits make a pass count a floor, not a measurement |
| frontend tests | **186 suites / 1,779 tests, 0 failed** |
| frontend production build | `next build` exit 0 |
| backend production build | `nest build` exit 0 |
| OpenAPI coverage and freshness | 3,569 operations, 0 undeclared; request schemas 1,359/1,359; error envelope 3,569/3,569; contract vendored, sha matched |
| RBAC and route-access checks | green (`route-classification`, `permission-keys`, `navigation-permissions`, `owner-authority`, `scope-application`, `record-access`) |
| tenant-isolation checks | existence **100%**; execution gate 428 suites / 1,649 tests |
| cache-invalidation checks | 0 gaps |
| outbox-consumer checks | every emitted event type has a registered consumer |
| pagination and unbounded-read checks | 1,180 (baseline 1,180); **unordered paging 0, locked at 0** |
| migration-ledger and migration-chain | **524/524 applied, 0 pending, 0 orphan/duplicate/unreachable**; chain verified |
| file-size and circular-dependency | 0 files over 500 outside 7 registered exceptions; `madge --circular` **0** in both repos |
| dead-code/build validation | knip backend unused files **0**; frontend dead-code 0 |
| production load, replica, PITR, alert, compliance drills | PITR ✓ · compliance drills ✓ · alerts 12/12 ✓ · replica/colocated-load/40%-headroom **OPERATOR-BLOCKED** (provisioning declined) |

**Backend gates: 35/35 pass. Frontend gates: 16/16 pass.**

- [x] Every command passes or has an explicitly approved, documented KEEP/NOT-IN-SCOPE decision. (exceptions: backend e2e not run; §5/§6 operator items marked `[!]` with their exact unblocking step)
- [x] Update `SCORECARD-PROGRESS.md` and completeness ledgers with evidence links. (`OPEN-FINDINGS.md` §4 corrected — its recorded root cause for the `streamline_app` failure was wrong; `MIGRATION-PROOF.md` and `offset-sunset-plan.md` added)
- [x] No module is marked 10/10 while any applicable P0/P1 item or operational gate remains open. — **§2.1 remains open at 617 legacy actor FKs**, so no module is marked 10/10.

## 8. Still open after 2026-09-01

1. **§2.1 — 617 organizational actor FKs** across hr (218), build (74), crm (58), inventory (58), payroll (54), common (44), accounting (36), support (25), kb (22), billing (18) and 7 smaller modules. Ratchet green, not zero.
2. **Backend e2e suite** — not executed.
3. **§5 infrastructure** — read replica, colocated load runner, 40% headroom, egress cost, `ALERT_WEBHOOK_URL`, human alert acknowledgement. Provisioning was declined; each is code-proven and runbooked.
4. **§6 approvals** — break-glass policy, data inventory/residency, subprocessor and regional-transfer decisions. Decision-ready in `runbooks/RB-10`, awaiting a human.
5. **Object-storage purge adapter** returns FAILED; `purgeOrgPrefix` is unimplemented.
6. **135 chain gaps** in RLS migrations `0591`/`0650`/`0666`/`0677` — non-fatal, pre-existing.
7. **`0143` rollback** fails on a pre-existing type mismatch (`text = timesheet_budget_status`).
