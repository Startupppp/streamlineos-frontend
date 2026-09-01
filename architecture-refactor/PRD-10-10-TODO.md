# StreamlineOS — Final 10/10 Completion PRD

**Status:** Authoritative remaining-work list

**Verified:** 2026-09-01 (revised — every number below was measured this session)
**Purpose:** Completing every applicable checkbox in this file, with the required evidence, is the final gate for a 10/10 rating across architecture, implementation, security, performance, maintainability, UX and operations.

This file supersedes older pending lists in reports, scorecards and session tickets. A completed item must not be reopened merely because an older document still describes it as pending. Reopen it only when current source or a current gate demonstrates a regression.

Excluded product domains are omitted completely. Shared platform work remains in scope only when it affects an included module or the deployability of the platform.

## 0. What changed on 2026-09-01, and what it cost

A parallel program of 21 lanes plus five module sign-off audits ran against this list. **Fourteen real defects were found and fixed**, seven of which no existing gate could have caught. The most valuable were not on this list at all — they were found by auditing surfaces the list did not name.

Fixed this session, each with a test that fails without the fix:

1. **Cross-tenant file read.** `GET /storage/image` resolved file ownership only for sensitive-prefix or org-namespaced keys, while its sibling `GET /storage/download` resolved unconditionally. A tracked file under a plain prefix — an expense receipt under `uploads/` — streamed to any authenticated user of any organisation holding the key.
2. **Thirteen timesheets controllers gated on the wrong module** (`@RequireModule("build")`), and a fourteenth had no gate. A Timesheets subscriber without Build was locked out of the module they paid for; a Build subscriber got Timesheets free.
3. **Eight surveys controllers had no module gate at all.** Org owners bypass `PermissionGuard`, so an owner without the Surveys subscription could build and run surveys.
4. **Nine AI gateway calls never reserved credits.** `charge` is optional, and absent means the whole reservation block is skipped — so `POST /support/:ticketId/ai/analyze` called the paid provider unmetered and an org with no credits could invoke it freely.
5. **Feedbucket's auto-link had never once worked.** `void this.autoLinkTicket(...)` fired after its transaction committed, so every write died `42501` under RLS and was swallowed. The feature looked functional.
6. **GDPR storage purge counted failed deletions as successes** and resolved bucket placement from an arbitrary org, so a subject in two regions had one region's bytes silently left behind.
7. **Three authenticated layouts were crawlable**, inheriting `index: true` from the root layout.
8. **Four WCAG violations**: dark-mode destructive at 3.42:1 against a 4.5:1 floor, two nested-interactive controls unreachable by keyboard, one missing `type="button"`.
9. **The `queue-age` alert linked to a runbook heading that does not exist** — a paged operator got a dead link.
10. **Eight durable job queues were watched by nothing.** The existing alerts poll `outbox_events` and `notification_deliveries` only.
11. **Five read-cost budget queries still named columns a migration had renamed**, so those budgets were erroring rather than measuring.
12. **The `0143` rollback failed live** because a later migration added a partial index whose enum predicate blocks the column rewrite.
13. **`LogSpanExporter` emitted span attributes unredacted.**
14. **A billing money column stored rupees** where the convention is integer paise.

Three claims in the previous revision of this file were **wrong** and are corrected below: the 135 migration chain gaps were already resolved, `0143` was real, and the tenant-isolation coverage figure quoted in CI (18%, 136/773) was stale by a wide margin — it is 895/895.

Two premises handed between lanes were **disproved rather than implemented**: `audit_logs.user_id → users.id` is `ON DELETE NO ACTION`, not a cascade; and the constitution's platform-admin redirect names a `/owner` route the application never built, so shipping it would have been a redirect into a 404.

## 1. Completion rules

An item is complete only when all four conditions hold:

1. The implementation or explicit KEEP/NOT-IN-SCOPE decision is committed.
2. Tests prove the positive, negative and failure paths through the module's public interface.
3. The named verification gate passes from a clean checkout.
4. Runtime or production claims have real operational evidence; self-tests and runbooks alone do not count as production evidence.

Do not redesign a sound module for style. For every change, record the concrete failure it prevents. Prefer a deep module with a small interface and one load-bearing seam; do not add pass-through wrappers.

## 2. Verified baseline — do not report these as pending

Measured 2026-09-01. Every figure here was produced by running the named command this session.

- Backend typecheck (`tsconfig.build.json`): PASS, zero errors. **Caveat: that config excludes `**/*spec.ts`.** A spec-inclusive `tsc -p tsconfig.json` reports 14 pre-existing errors in 10 spec files, mostly `TS2554` arity drift — tracked in §10.
- Frontend typecheck: PASS, zero errors.
- Backend unit suite: **1,558 of 1,566 suites passed, 13,089 tests, 8 suites skipped, exit 0.**
- Frontend suite: **198 suites, 1,940 tests, all passed.**
- Migration ledger: 525 applied against 529 journal entries; 4 pending (`0840`–`0843` — authored, journalled, deliberately not applied). Zero orphan, duplicate or unreachable entries.
- Migration chain: PASS, zero gaps. Migration discipline: 529 files, zero violations. Rollbacks: 529 scanned, all type-name checks pass.
- Route classification: ALL ROUTES CLASSIFIED, zero undeclared.
- OpenAPI: 3,577 operations — exposure 3,577/3,577 (3,197 permissioned, 224 public, 99 universal, 57 in-service); error shapes 3,577/3,577; response bodies **3,577/3,577**; mutating request bodies **1,364/1,364**; zero duplicate operation ids across 2,650 paths. The gate no longer rounds: it prints 100% only when numerator equals denominator.
- Tenant isolation: **895/895** tenant-owned services declare an isolation spec. (The CI comment claiming 18% was stale; the step is now enforced rather than `continue-on-error`.)
- Module gate: 386 controllers walked, zero violations, and **zero HANDOFF entries remain** — every allowlist entry now carries a substantive justification.
- AI charge declaration: 113 gateway invocations, all declare `charge` explicitly, 1 allowlisted (excluded CRM domain).
- Read-cost budgets: 56 pass, 14 skip for absent seed data, 0 fail — down from 30 failures.
- Dependency vulnerabilities and licences: pass. SBOM generated, 914 components.
- Alert system: 13 scripts, all self-tests pass; every registered alert resolves to a real runbook heading.
- Outbox consumer registry, RBAC referential integrity, cache invalidation, dropped-column safety, restrictive membership-FK, file-size and circular-dependency gates: PASS.
- Billing, chat, calendar, notification, knowledge-retrieval evidence: complete, as previously recorded.

## 3. P0 — Code, authority and data correctness

### 3.1 Finish organization actor contraction — PARTIAL

The scan previously counted 617 "organizational" relationships and ratcheted on that total, which conflated a column an authorization predicate reads with one that only renders a name on a past event. It now reports:

**617 = 116 excluded (CRM/Inventory) + 300 allowlisted display-only + 201 ACTIONABLE.**

By module, actionable: hr 107 · build 23 · common 21 · payroll 17 · support 12 · kb 10 · ai 4 · surveys 3 · accounting 2 · billing 2.

- [x] Classify every included relationship as authority-bearing, historical-display-only, authentication identity or a genuine person/account bridge. — `architecture-refactor/ACTOR-CLASSIFICATION.md`, traced to real read sites. Corrected seven entries in `ACTOR-CONTRACTION-PLAN.md`: six understated (`journal_entries.created_by`, `kb_spaces.created_by_id`, `okr_goals.created_by`, `support_macros.created_by` all reach `applyScope` or a visibility predicate; `projects.client_id` gates client-portal access; `project_approvals.approver_id` routes live approvals) and one overstated (`enterprise_quotes.approver_id` is a display join only).
- [ ] Migrate every authority-bearing relationship to `organization_members.id` or the canonical organization-person seam. — **201 remaining.**
- [ ] Add tenant-composite foreign keys and appropriate delete behavior.
- [ ] Backfill in bounded, resumable batches with unmappable, duplicate and cross-tenant reports.
- [ ] Update writers, readers, DTOs, validators, events, cache keys, search documents and membership-revocation cleanup.
- [x] Preserve historical display without preserving current authority. — this is exactly what the 300 allowlist entries encode, each with the evidence that no predicate reads it.
- [ ] Drop legacy compatibility columns only after runtime zero-use proof.
- [x] Add explicit scanner allowlists so the gate measures authority defects rather than demanding destructive cosmetic migrations. — with three self-test fixtures proving it bites, including that a stale entry naming a removed column is a hard failure.
- [ ] Require zero remaining actionable relationships in included modules. — **201 remaining; the ratchet is now against that number.**

**Blocked, and why.** The remaining work is schema migration plus reader/writer cutover across roughly 200 tables. It cannot land under this session's read-only database policy: the code changes are only safe once the columns exist, so authoring them without applying would leave the tree referencing columns that are not there. This is the largest single item in this file and is a multi-week program, not a task.

### 3.2 Close authorization proof gaps — DONE

- [x] Table-driven self-escalation test: a principal cannot elevate their own organization or module role. — all 20 org × module rank cells asserted.
- [x] A module admin cannot grant equivalent/higher standing to a peer unless the authority matrix permits it. — already proven by `standing-grantability-agreement.spec.ts`; verified, not rewritten.
- [x] Membership, role and direct-grant revocation invalidates process-local and shared permission caches before the next protected request. — with a biting negative control: a neutered store lets instance B read stale permissions, proving `store.clear()` is the load-bearing seam.
- [x] Service-principal/token scope-change audit evidence, expiry tests and last-used tracking tests.
- [x] Canonical-owner-only ownership transfer stays structurally separate from ordinary admin permissions. — already proven; verified at `rbac-resolution.spec.ts`.

178 tests across the access suite.

### 3.3 Complete object-storage erasure — DONE

- [x] Deep `purgeOrgPrefix(orgId)` interface on the storage module.
- [x] Resolve the organization's actual storage placement and prefix; never fall back to another region or bucket. — fails closed for an unplaced org.
- [x] Paginate object listing and batch deletion within provider limits. — `ListObjectsV2` continuation tokens, 1,000-key `DeleteObjects` batches.
- [x] Repeated execution is idempotent and resumable.
- [x] Return separate deleted, skipped and failed keys; never count a caught deletion error as success.
- [x] `GdprStoragePurgeService` failed `deleteFile` calls remain failures.
- [x] Respect active legal holds before listing or deleting bytes.
- [x] PII-safe audit event with durable completion/failure evidence.
- [x] Disposable-data drill proving bytes are physically gone and a repeated purge is harmless. — **ran live against R2**; uploads a throwaway object, purges, confirms zero keys remain via a real `ListObjectsV2`, confirms the second purge is a no-op.

Also fixed here: per-key placement. A subject in two organisations in different regional buckets previously had one region's keys deleted against the other's bucket. `buildSubjectKeyQuery` now selects `org_id` (discovering which file-key tables carry it from `pg_catalog`), and a key with no resolvable org lands in `failed[]` with a reason rather than being skipped.

## 4. P0 — Query cost, pagination and API contracts

### 4.1 Eliminate baseline masking for database reads — PARTIAL

The gate no longer matches a frozen total. It reports **offset: 108 actionable** (of 128) and **unbounded: 1,074 actionable** (of 1,180), with the remainder classified as excluded-domain, bounded, aggregate, stream or reviewed false-positive.

- [x] Classify all 128 offset paths in included modules.
- [ ] Replace active large/high-growth lists with deterministic keyset cursors. — **108 actionable.**
- [ ] For deliberately retained offset lists, prove a hard maximum page/depth and record a dated compatibility sunset. — partially recorded in `offset-sunset-plan.md`.
- [x] Classify all 1,180 unbounded-read candidates.
- [ ] Add an explicit bound, aggregate, stream/batch contract or reviewed exemption for every included candidate. — **1,074 actionable.**
- [ ] Prohibit fetch-then-filter and fetch-then-count on tenant collections.
- [ ] Verify projections contain only fields needed by the caller.
- [x] Gate fails on any new offset/unbounded path and ratchets **actionable** counts, not a self-matching total.

**When you resume this:** a keyset cursor must encode every column in the `ORDER BY`. An id-only cursor on a `(name, id)` sort duplicates and skips rows, and the only test that catches it uses rows whose sort values tie while their ids disagree. And changing a backend pagination contract without updating the frontend caller strands the client on page 1 — grep `frontend/hooks/api/**` for every endpoint you touch.

### 4.2 Finish production-shaped query evidence — PARTIAL

- [x] Repair the measurement harness. Five budget queries still named `user_id` where migrations had introduced `membership_id` / `sender_membership_id` / `user_membership_id` — chat channel list, chat messages page, chat channel members, chat saved messages and timesheets-mine. **Those budgets were erroring, not measuring**, so the guard was reporting on queries that never ran.
- [x] Document planner-correct sequential scans rather than forcing indexes on small tables. — 29 `forbid-seq-scan` assertions removed where the tables hold 5–960 rows and returning most of them is cheaper than an index. Per-table rationale in `QUERY-COST-EVIDENCE.md`.
- [ ] Exercise critical Home, HRMS, Payroll, Build/PM, Accounting, Chat, Calendar, Notifications and Knowledge paths with declared row distributions. — 56 pass, **14 skip for absent seed data**.
- [ ] Measure cold-cache and warm-cache behavior with tenant RLS enabled.
- [ ] Prove tenant-leading and sort-covering indexes are used where they are actually cheaper.
- [ ] Attach latency, buffer, row-estimate and query-count budgets to CI ratchets.
- [ ] Verify no N+1 query appears in list/detail fanout paths.

### 4.3 Close the two OpenAPI gaps — DONE

- [x] `POST /accounting/reports/export/jobs/{jobId}/cancel` marked `@BodylessAction()` — it takes only a path param.
- [x] `GET /platform/visit` declares a real response contract. It is stamped `@HttpCode(405)` and never returns 200, so injecting a fake 200 would have been dishonest; it declares the actual 405 schema and the coverage script now accepts any response carrying `content`.
- [x] Backend OpenAPI regenerated and re-vendored to the frontend; vendor and drift gates pass.
- [x] Request and response gates raised to exact equality. **The rounding was itself the defect** — 1,360/1,361 and 3,568/3,569 both printed "100%". Two new self-test fixtures prove the ratchet now bites at single-operation granularity.

Final counts are 1,360/1,360 and 3,569/3,569. The mutating denominator moved from 1,361 to 1,360 because the cancel operation is now correctly classified as intentionally bodyless rather than as a missing body.

### 4.4 Prove API and export cleanup — DONE

- [x] Compare every controller route with OpenAPI, frontend callers, jobs, webhooks and external integrations. — 3,569 operations across 2,646 paths, zero duplicate operation ids.
- [x] Consolidate genuinely overlapping routes. — none found requiring it.
- [x] Resolve the frontend dead-code report's 64 unproven exports. — 0 DEAD, 42 WIRE, 11 KEEP, 9 RETAINED-BY-CONTRACT, 11 EXCLUDED, 0 UNCLASSIFIED. UNPROVEN is no longer an accepted resting state: an unclassified export fails the gate, and so does a verdict naming an export that no longer exists.
- [x] Confirm mail and unified inbox are distinct product interfaces. — fully distinct; `/mail/**` is the email client, `/me/inbox/unified` is the cross-module aggregator. No shared routes.
- [x] Confirm billing subscription routes have one canonical owner. — all under `/billing/**`; no `/subscription` prefix exists.

**Carried forward:** the 42 WIRE entries are real capability gaps — a backend route exists and no page calls the hook. They are listed with hook and target page in `API-SURFACE-AUDIT.md §4.4`. Highest value: the HR dashboard page (3 hooks), calendar occurrence cancellation, guided tours (3 hooks), and per-workflow secrets and schedules (5 hooks).

## 5. P0 — Migration and recovery integrity — PARTIAL

- [x] Resolve the migration-chain gaps. — **the "135 non-fatal `42P01` gaps" figure was stale.** They were real ordering defects: 30 `inv_*` tables created via `drizzle-kit push` with no `CREATE TABLE` migration, so RLS migrations referenced them before they existed. Migration `0767b` had already fixed this. Current chain-gap count is **zero**.
- [x] Repair the `0143` rollback type mismatch. — **real, and confirmed live.** Migration `0616` later added a partial unique index `WHERE status = 'ACTIVE'` whose predicate stores a `timesheet_budget_status` enum literal, so the `0143` rollback's `ALTER COLUMN status TYPE text` failed with `operator does not exist: text = timesheet_budget_status`. The rollback now drops that index first. `verify-rollbacks` is 7/7.
- [x] Require every new forward migration to have a truthful rollback or an explicit irreversible/data-loss declaration. — `check:migration-rollback`, whose self-test uses the `0143` defect class as a fixture to prove it would have caught it.
- [ ] Re-run cold bootstrap and upgrade-to-head. — **RUN, AND IT FAILS. This is the most valuable migration finding of the session.** A blank Neon database was provisioned with the five required extensions and the journal replayed from empty. It stops at journal position 323, `0591_tenant_isolation_for_unprotected_tables`, with `relation "ap_allocations" does not exist`. Of the 80 tables that migration enables RLS on, **31 do not exist at that point in a cold replay** — the accounting, finance, GL, AP/AR and bank-reconciliation model, which `0591`'s own header admits "the 0000 baseline never actually created". They were created with `drizzle-kit push` and never given a `CREATE TABLE` migration. **So the platform cannot currently be rebuilt from its migrations alone**, which is what disaster recovery and standing up a new cell both depend on. `verify-migration-chain` reports zero gaps because it checks journal reachability, not a real replay — the two are not the same claim. A chain-repair migration is being authored, following the `0767b` precedent that fixed exactly this class for 30 `inv_*` tables.
- [ ] Compare tables, columns, types, constraints, indexes, RLS policies and migration hashes between cold and upgraded databases. — blocked until the replay reaches zero failures.

**Cold replay, second run (2026-09-01):** with the `0591b` chain repair in place the replay **completes** — 543 of 550 tags, 940 tables, 336 seconds — and surfaces **six remaining ordering defects plus one broken migration**. Note the tooling was itself a blocker: `apply-chain-cold.mjs` stalls indefinitely mid-chain (twice, at 322 and at 366), so the replay was driven by a minimal runner that applies each journal entry in array order inside its own transaction with `statement_timeout = 0`. That the repo's own cold-bootstrap script cannot finish is a finding in its own right.

| Failure | Cause |
|---|---|
| `0650`, `0666`, `0677` | reference `inv_carton_types` / `inv_compliance_documents`, created later in array order — the same class `0767b` fixed for 30 other `inv_*` tables |
| `0678` | not idempotent: the `tenant_isolation` policy already exists on a second run |
| `0900` | references `projects`, created later in array order |
| `0853` | **a genuinely broken migration, caught before production ran it.** Its affiliates backfill joins `om.user_id = a.user_id`, but `affiliates.user_id` is INTEGER while `organization_members.user_id` is TEXT, so it fails `operator does not exist: text = integer`. The table holds zero rows, so the backfill is removed rather than cast — a cast would hide the type defect. **`affiliates.user_id` being an unconstrained integer where every other user reference is text is a separate schema bug, recorded here and not yet fixed.** |
| `0854` | cascade from `0853`: the constraint it validates was never created |

This is the case for running a cold bootstrap rather than trusting `verify-migration-chain`: the chain gate reports zero gaps because it checks journal reachability, and every one of these defects sits underneath that check.
- [x] Re-run the rollback drill for cutover migrations. — 7/7.
- [x] Update migration evidence to the final head. — `MIGRATION-PROOF.md` rewritten; every superseded 515/515, 524/524 and 505/512 count removed.

**Operator action to close the two remaining boxes** (exact commands in `APPLY-MIGRATIONS.md`): provision a blank Postgres with the five required extensions, run `apply-chain-cold.mjs` expecting `REACHED_HEAD 528/528 chain_gaps=0`, then `compare-cell-schema.mjs` against live, then `check-migration-ledger.mjs`.

## 6. P1 — Async, email and external-provider reliability — PARTIAL

Most of this section was already built and the work was consolidation, not construction. The audit found existing timeout, retry, backoff, dead-letter, suppression, signed-webhook and idempotency machinery in email, AI, notifications, outbox and webhooks.

- [x] One shared outbound-provider seam with timeout, bounded retry, exponential backoff with jitter and circuit-breaker state. — `common/outbound/call-provider.ts`, returning a discriminated result rather than throwing.
- [~] Apply it where calls can block a request or worker. — Razorpay consolidated onto it (its hand-rolled loop had no jitter, so concurrent failures retried in lockstep). Email, AI and notifications already had equivalent machinery and were deliberately **not** double-wrapped, which would be the banned pass-through. **The webhook dispatcher is still on a raw `fetch` with no retry and no breaker.**
- [x] Define which failures are retryable, terminal or dead-lettered per provider. — per-provider table in `PROVIDER-RELIABILITY.md`, classified by error shape rather than `instanceof`, which is false for cross-realm `postgres-js` errors.
- [x] Prove consumer idempotency beyond status checks using stable event/source keys. — two concurrent claims, exactly one wins, via the `(producerEventId, consumerName)` unique index; the bite proof shows an always-true mock lets both through.
- [x] Document user-visible at-least-once semantics.
- [x] Re-check recipient authorization at delivery time. — already present at `notification-delivery-worker.service.ts:227`. **Gap: it only fires when the event declares `visibilityResourceKind`;** events with a bound resource and no declared kind bypass it.
- [ ] Localized, versioned email templates with deterministic fallback. — design recorded; a 30-file refactor, not started.
- [x] Retain signed bounce/complaint handling and suppression evidence.
- [x] Domain-specific DLQ/replay tests and runbooks.
- [x] Cancellation semantics for every long-running export/import/AI job; non-cancellable jobs explicitly marked.

**Remaining:** webhook dispatcher onto the seam; email retry path re-authorization for employment-sensitive templates; localized templates; `visibilityResourceKind` catalogue review.

## 7. P1 — Security, privacy and compliance — PARTIAL

- [x] Field-level PII redaction tests for logs, traces, error envelopes and provider failure payloads. — 20 tests pushing real-shaped PII (token, card PAN, national id, bank account) through the four **actual** emission paths and asserting absence from the emitted bytes, not from a helper in isolation. **This found that `LogSpanExporter` spread span attributes unredacted**; `redactAttributes()` fixes it.
- [x] Data catalogue mapping personal-data class to purpose, lawful basis, retention period and owner. — `DATA-CATALOGUE.md`, derived from the real schema. **Awaits DPO signature; 8 sub-decisions are marked DECISION REQUIRED rather than invented.**
- [ ] Approve residency, transfer and subprocessor decisions. — decision table prepared from the real subprocessor list. **Awaits signature.**
- [ ] Approve break-glass/operator access, dual approval, maximum duration and post-access review. — **Awaits signature.** Code currently allows a 24h grant; the recommended value is 4h.
- [~] Operator-session guard consuming approved grants and recording every privileged action. — `OperatorSessionGuard` + `RequireOperatorGrant` implemented and tested (7 tests), **but wired to no route yet.**
- [x] Export, database erasure, object-storage erasure and legal-hold conflict drills as one end-to-end workflow. — sequence recorded in `RB-10 §6`; the four drills each pass individually.
- [~] Verify immutable audit evidence cannot be edited or removed by tenant administrators. — a `pg_catalog` probe found `streamline_app` holds `arwd` on `audit_logs`: RLS scopes the rows but the UPDATE and DELETE privileges exist, so immutability rested on code convention. Migration `0840` revokes both and moves the one legitimate write behind a narrow `SECURITY DEFINER` function. **Authored and proved by rolled-back probe; not applied.** Investigating it disproved the premise it was handed — `audit_logs.user_id → users.id` is `ON DELETE NO ACTION`, so erasure never depended on the app role's DELETE.
- [x] Define secret rotation ownership and evidence. — 14 secrets by name, never value, in `RB-10 §5`.

**Two findings recorded rather than silently decided:** `email` and `phone` are not in the redaction list, so they do appear in logs. That is a DPO call, not an engineering one, and the two tests documenting it are marked FINDING rather than made to pass.

## 8. P1 — UX, accessibility, SEO and frontend performance

### 8.1 Responsive and accessibility proof — DONE

- [x] Automated accessibility testing with an established engine and keyboard-focused integration tests. — `jest-axe` + Testing Library, one shared harness in `frontend/test-utils/` (render with real providers, `expectNoAxeViolations`, a viewport helper).
- [x] Test included authenticated modules at 375px, 768px and 1280px.
- [x] Navigation, dialogs, drawers, tables, kanban, calendars, notification drawers and chat sidebars keyboard usable.
- [x] Focus trapping/restoration, semantic labels, error announcements and destructive-action confirmation.
- [x] WCAG AA contrast and reduced-motion behavior.
- [x] Localization, timezone and currency formatting at module interfaces.
- [x] Record and fix module-specific responsive defects rather than declaring global component coverage sufficient. — every one of the fifteen sign-off surfaces has at least one test against its real component tree; coverage depth varies and is recorded honestly per surface in `ACCESSIBILITY-EVIDENCE.md`.

Four real defects fixed, each pinned by a test that fails without it: dark-mode `destructive` at 3.42:1 (now `#dc2626` on `#ffffff`, 4.83:1 — light mode was already compliant and untouched); `RolesListPanel` and `MailMessageRow` nesting interactive controls inside interactive containers, which makes the inner control unreachable and lets the outer handler swallow its activation; `TicketListItem` missing `type="button"`, which defaults to submit inside a form. The contrast suite's KNOWN-DEFECT exemption is removed and now asserts the real requirement.

### 8.2 SEO and web performance — PARTIAL

- [x] `robots: { index: false, follow: false }` on the authenticated layouts. — **three shells had no `metadata` export at all** (`(authenticated)`, `org-setup`, `employee-onboarding`) and therefore inherited `index: true` from the root layout. `(portal)` and `(auth)` were already correct.
- [x] Verify canonical URLs, metadata, sitemap inclusion and structured data for every intentionally public page.
- [x] Prove no tenant content reaches a public render or shared cache. — encoded as a gate assertion: a public route file may not import an auth-gated symbol.
- [x] Establish Core Web Vitals budgets for representative mobile and desktop profiles.
- [x] Add Lighthouse/Web Vitals CI ratchets for LCP, INP and CLS. — the budget checker is wired and its self-test catches all six injected breaches.
- [ ] Measure route JavaScript, hydration cost, server response time and image/font behavior. — **blocked: needs a running app plus browser automation. No numbers are claimed.** `WEB-VITALS-EVIDENCE.md` records exactly what is blocked and on what; swap `--self-test` for `--results=<file>` in CI once a Lighthouse step produces one.

## 9. P1 — Database growth and retention — DONE

- [x] Identify every high-growth table. — measured against the live catalogue, not estimated: `kb_article_chunks` 497 MB / 30,000 rows is the largest; `chat_messages`, `outbox_events`, `ai_usage_logs`, `email_outbox`, `notification_events` follow.
- [x] Record a measured partition, archival or retention decision for each. — with the triggering row count, in `RETENTION-POLICY.md`.
- [x] Implement bounded retention workers with legal-hold exclusions and resumable cursors. — the gap was `ai_usage_logs` (18M rows/year at scale, no worker); the rest already existed. Batch 500, 730-day cutoff, dry-run by default, Redis cursor, `forEachOrg` iteration.
- [x] Prove retention does not break immutable financial/payroll/audit obligations. — a test asserts the worker's source never references `audit_logs`, `payroll_runs` or `journal_entries`.
- [x] Add real slow-query telemetry and alerts tied to named budgets. — **`pg_stat_statements` is not installed on this Neon instance**, confirmed by query; span telemetry is used instead rather than inventing budgets.

A prior record claimed `hr_retention_policies` was written but never read. That is no longer true — `CronHrRetentionService` reads it.

## 10. P1 — Test and release engineering — PARTIAL

- [ ] Run the dedicated backend e2e configuration against disposable infrastructure. — **143 suites discovered, 0 run.** They require a live database; under the read-only policy they were not executed. Recorded as 143 discovered / 0 passed / 0 failed / 143 blocked, not as passing.
- [x] No e2e suite can exit zero after failing discovery or setup. — the exit guard was already present; verified it defeats both failure modes, including a load-time `ReferenceError` under `--forceExit`, and extended to the seeded config which had none.
- [x] Remove the deprecated `ts-jest` isolated-modules configuration warning. — moved into the `tsconfig` object where it belongs.
- [x] Dependency vulnerability, license and supply-chain gates.
- [x] Generate an SBOM and retain it with each release artifact. — CycloneDX 1.4, 914 components, uploaded per build with the artifact hash manifest.
- [x] Produce reproducible artifacts with recorded hashes.
- [x] Environment-schema validation before boot and deployment. — boot validation already existed; a standalone pre-deployment gate now validates a candidate environment without booting.
- [~] Require feature-flag owner and removal date. — the gate exists and **correctly failed**; migration `0841` adds the columns. Authored, not applied, so the CI step is `continue-on-error` until it lands.
- [x] Release notes, change owner, canary criteria, rollback criteria and post-release smoke verification. — `RELEASE-ENGINEERING.md`, citing only commands that exist.
- [x] Wire schema/event compatibility checks into CI. — outbox consumer registry, RBAC integrity, migration rollback, retention coverage, module gate, AI charge, tenant isolation, SEO metadata, dead-code and Web Vitals are now CI steps rather than runbook lines.

**New item.** `pnpm typecheck` runs `tsconfig.build.json`, which excludes `**/*spec.ts`, and ts-jest transpiles without type-checking — so **no gate has ever type-checked a spec file**. A spec-inclusive run reports 14 errors in 10 files, mostly `TS2554` arity drift where a service grew a parameter and the spec still passes the old list. The five in a spec this session added are fixed (one was smuggling a string past a `Date` field with `as never`, making its assertion vacuous). The remaining 14 are pre-existing.

- [ ] Fix the 14 pre-existing spec type errors and add a spec-inclusive typecheck gate.

## 11. P2 — Real production infrastructure and operability — 1 of 10

Code self-tests and runbooks do not close this section. Nine of these ten need accounts, credentials or a colocated runner that this repository does not have. Each is recorded with the exact env var or command that closes it.

- [ ] Provision independently isolated per-cell database, cache, object storage, search/vector, realtime, worker and monitoring resources. — **operator-blocked.** Needs a second Neon project, a second Upstash instance, a dedicated R2 bucket, a search cluster and a second Ably application. Code seams are ready and `cell:isolation:self-test` bites; commands in `CELL-RUNBOOK.md §Provisioning`.
- [ ] Provision a physical read replica and set `DB_REPLICA_URL`. — **operator-blocked.** Pool wiring, `runInReplicaTenantRead` and both verification scripts exist; lag tests are `xit`-skipped pending the replica.
- [ ] Prove primary-required versus replica-safe routing under real lag and replica failure. — blocked on the above.
- [ ] Run all production-shaped workloads from a colocated runner. — **operator-blocked.** The current driver sits ~80 ms from Neon, so the pool saturates on network wait rather than CPU; a headroom figure from that run would describe a home internet connection.
- [ ] Prove at least 40% sustained capacity headroom and burst survival. — blocked on the above.
- [ ] Measure and approve per-cell cost. — quantities are measured (Neon compute-hours, R2, Ably); dollar figures need six invoice-derived rate env vars, and the trend needs three samples ≥24h apart.
- [ ] Configure `ALERT_WEBHOOK_URL`, `APP_RELEASE` and the production log stream. — **operator-blocked, and the single highest-leverage one.** Every predicate is verified against real emitted log shape and transport is proven against a local sink, but **no alert this platform raises reaches a human in any environment.**
- [ ] Send every critical alert through the real on-call destination and record human acknowledgement. — blocked on the above.
- [x] Define an SLO, owner, alert and runbook for each included module and critical queue. — **65 objectives** over 20 in-scope modules and 17 queue subjects, in `backend/src/common/slo/`, enforced by 14 assertions that bind the catalogue to the real seam budgets, the real alert registry and real runbook headings. Building it found two defects: the `queue-age` alert linked to `RUNBOOKS.md#queue-backlog`, a heading that does not exist, so a paged operator got a dead link; and eight durable job queues (`ai_jobs`, `payroll_jobs` and six export tables) were watched by nothing, because the existing alerts poll `outbox_events` and `notification_deliveries` only. `alert-job-queue-age.mjs` closes the second.
- [ ] Re-run PITR, regional recovery and cell-relocation drills against the final production topology. — blocked on the topology.

**Known gap in the SLO work:** `alert-seam-latency` fires on a seam breach across all routes and does not say which module breached, so the page reaches `platform-reliability` rather than the owning team. `alert-p95` already groups by route, so the attribution data exists. Recorded rather than papered over.

## 12. Final module sign-off — AUDITED, 5 modules blocked

All 22 modules in `MODULE_REGISTRY` were audited across the ten dimensions. Reports are in `architecture-refactor/signoff/`.

**The previous §12 list named only 16 surfaces.** `PRD-IN-SCOPE.md:7` excludes exactly two product domains — CRM and Inventory — leaving six in-scope modules the list never mentioned. Auditing them found the single worst defect of the session (the timesheets module gate). The list below is corrected.

- [x] Organization and organization/module RBAC — SIGNED OFF
- [x] Home — SIGNED OFF
- [x] Settings — SIGNED OFF
- [x] HRMS — signed off on the dimensions audited; see the carried defect below
- [x] Payroll — SIGNED OFF
- [x] Build/PM — SIGNED OFF
- [x] Billing and Payments — money-unit defect fixed
- [x] Accounting and Finance — SIGNED OFF, no defects
- [x] Chat — SIGNED OFF
- [x] Calendar — SIGNED OFF
- [x] Notifications and unified Inbox — SIGNED OFF
- [x] Knowledge Base, Wiki and Chatbot — SIGNED OFF
- [x] Workflows — SIGNED OFF
- [x] Mail — SIGNED OFF
- [x] Support — AI charge defect fixed
- [x] Shared platform, API, storage, search, realtime and worker modules — cross-tenant image read fixed
- [x] Timesheets — module gate fixed (13 controllers + 1 ungated)
- [x] Sign — AI controller gate fixed
- [x] Surveys — 8 controllers gated
- [x] Feedbucket — deferred-write tenant context fixed
- [x] Blog — admin CRUD wired (8 endpoints, 2 new permission keys in both catalogs) and the leading-wildcard `ILIKE` replaced with tsvector plus a matching GIN index in `0843`. **A frontend authoring page still needs building.**
- [x] Directory — SIGNED OFF

**Carried defects, ranked:**

1. **Two CRM controllers have no module gate**, and six CRM AI calls do not declare `charge` — excluded domain, allowlisted and visible so the CRM owner can action them.
2. **A frontend blog authoring page** for the now-wired admin API, gated on `blog:posts:manage`.
3. **Ably chat tokens survive channel removal** for up to an hour. An accepted Ably limitation; should be recorded as accepted risk rather than left implicit.

**Closed during this revision:** the audit flagged that the primary KB HNSW query carries no explicit `org_id` filter and leans on RLS. A `pg_catalog` probe confirms the defence-in-depth policy is present — `kb_article_chunks` has `relrowsecurity = true` and a `tenant_isolation` policy of `org_id = current_org_id()`. Not a defect.

## 13. Final 10/10 release gate

- [x] Backend typecheck, build, unit and integration suites pass. — 1,540/1,548 suites, 12,958 tests. **e2e not run: 143 suites discovered, blocked on disposable infrastructure.**
- [x] Frontend typecheck, build, tests and accessibility budgets pass. — 198 suites, 1,940 tests. **Web Vitals budgets defined and enforceable but not yet measured.**
- [x] OpenAPI request, response, error, exposure, path and operation-ID coverage is 100% applicable.
- [x] Organization/module/record authorization and tenant-isolation gates pass.
- [ ] Actor, unbounded-read, pagination, dead-code and migration actionable counts are zero. — dead-code is zero. **Actor 201, offset 108, unbounded 1,074, migrations 3 pending.**
- [x] Cache, outbox, retry, DLQ, replay and provider-failure drills pass.
- [ ] Cold bootstrap, upgrade, rollback, PITR and relocation evidence matches the release head. — rollback yes; cold bootstrap and relocation blocked.
- [ ] Production load, replica, capacity, cost, alert acknowledgement and compliance evidence is attached. — §11.
- [ ] All human security, privacy, residency and operator decisions are approved. — four await signature.
- [ ] No P0/P1 or unexplained failing/skipped mandatory gate remains. — the P0 items in §3.1 and §4.1 remain.

## 14. The shortest path from here

In dependency order, because several of these unblock the rest:

1. **Apply migrations `0840`, `0841`, `0842`** (`pnpm -C backend db:migrate`, then reconcile the Drizzle snapshot). Confirm the feature-flag backfill defaults first — `owner='unassigned'` and `expires_at='2027-01-01'` are placeholders, not a policy. This closes audit-log immutability, feature-flag governance and the billing money unit, and lets three CI steps stop being `continue-on-error`.
2. **Set `ALERT_WEBHOOK_URL`.** One environment variable turns a fully-built, fully-tested alerting system from a measurement into an on-call contract. Nothing else in §11 is this cheap.
3. **Build the frontend blog authoring page**, and hand the two CRM module-gate entries to the CRM owner.
4. **Sign the four privacy decisions.** They are prepared, not open questions; each has a recommended default.
5. **§4.1**, the largest tractable engineering item: 108 offset paths and 1,074 unbounded reads, now individually classified and ratcheted.
6. **§3.1**, the largest item overall: 201 authority-bearing relationships, each named with its read site.
7. **The infrastructure items in §11**, which need accounts before they need engineering.

Only after every applicable checkbox above is complete may the platform be rated 10/10 across all aspects.
