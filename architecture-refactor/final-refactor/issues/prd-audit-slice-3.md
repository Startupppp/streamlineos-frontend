# PRD Audit — Sections 15–21
**Lane:** L3  
**Date:** 2026-08-31  
**Evidence baseline:** FINAL-VERIFICATION.md (2026-08-31), current source at backend/ and frontend/

Evidence rule: every classification cites a file:line or a gate command output.  
"STILL PENDING" means not implemented in current source.  
"REGRESSED" means a previously passing gate now fails.

---

## Audit table

| PRD ref | Claim | Classification | Evidence |
|---|---|---|---|
| §15 — No SELECT * or unbounded relation loading | No SELECT * in production services | VERIFIED DONE | `backend/CLAUDE.md` §1 mandates explicit projection; `SELECT \*` search shows only scripts/specs, zero service files |
| §15 — No fetch-then-filter authorization | All DataScope resolutions reach SQL predicates | VERIFIED DONE | `FINAL-VERIFICATION.md:76` — `check:scope-application` PASS 122/122 |
| §15 — No per-row authorization or recipient lookup | No per-row permission DB calls | VERIFIED DONE | Finance batch recipient resolution in `modules/finance/ar/reminders.service.ts:188` is per-batch, not per-row |
| §15 — Growing lists use cursor pagination | All growing lists cursor-paged | STILL PENDING | 140 files with `.offset()` in production modules (grep count in session); PRD §28.2a P1 "Bound every remaining offset/expensive list" not closed |
| §15 — Page size capped at 100 | Hard cap enforced server-side | VERIFIED DONE | `backend/src/common/pagination/list-query.schema.ts:4` — `PAGE_SIZE_CAP = 100` |
| §15 — Filter and sort fields allowlisted and Zod-validated | Sort fields validated by Zod enum | VERIFIED DONE | `list-query.schema.ts:54-59` — `withSortField()` pattern enforces enum |
| §15 — Search debounced on client and indexed on server | Server-side FTS/trgm indexes | VERIFIED DONE (server) / STILL PENDING (client debounce) | Server: `backend/CLAUDE.md` §3 mandates `to_tsvector` + GIN; client debounce not verifiable from source |
| §15 — Read replicas serve only declared replica-tolerant reads | Replica reads separated from primary | STILL PENDING | OPERATOR-EVIDENCE.md item 3 — read replica not provisioned; RB-03 OPEN |
| §15 — Connection pools, statement timeouts and per-cell budgets measured | Live measurement | STILL PENDING | No live infrastructure; scripts exist but not run on production |
| §16 — Canonical cache identity includes all dimensions | `environment:cell:version:org:membership:permissionVersion:resource:scope:filters` | VERIFIED DONE | `cache.service.ts:213-215` — `orgScopedKey` prepends `{cellPrefix}:{orgId}`; `dashboard-cache-key.ts:12-14` adds `u{userId}:v{version}:{scope}:{filters}` |
| §16 — Sensitive collections not cached | Download tokens not cached | VERIFIED DONE | Signed-URL pattern used throughout storage module; no download token in CACHE_KEYS |
| §16 — Permission mutations invalidate by event; TTL is safety bound | Event-driven invalidation | VERIFIED DONE | `common/rbac/access-invalidate.ts` — `bumpPermissionsVersion(tx, orgId)` called in every role/grant mutation; `cachedVersioned` reads version stamp |
| §16 — Cache lifetime may not exceed grant/delegation expiry | TTL bounded by nearest expiry | STILL PENDING | No evidence that TTL is compared against delegation expiry; `cache.service.ts` uses fixed `baseTtl = 300` with no expiry-awareness |
| §16 — Automated tests prove cache cannot cross org/membership/scope/permission-version | Isolation test spec | VERIFIED DONE | `backend/src/common/cache/cache-key-collision.spec.ts:1` — 12 tests across 6 dimensions (D1–D6) with negative controls |
| §17 — Business APIs in NestJS; Next.js route handlers auth bridges only | No frontend business routes | VERIFIED DONE | `frontend/app/api/auth/[...nextauth]/route.ts` is the only route handler; `check:routes` PASS |
| §17 — OpenAPI generated from actual application and checked for freshness in CI | Freshness gate green | REGRESSED | `FINAL-VERIFICATION.md:279` — `openapi:check` exits 1, stale by 5 operations (3,551 committed) |
| §17 — OpenAPI coverage 1,916/3,540 operations | Coverage threshold | STILL PENDING | Per PRD §28.2a: "coverage is only 1,916/3,540 operations"; exact current figure unknown (gate stale); prior S10 figure ~2,016-2,843 via L48/S08 reports, still well below 100% |
| §17 — Errors contain correlation ID and structured validation details | Error envelope | VERIFIED DONE | `backend/CLAUDE.md` §2 — one global exception filter returns a single JSON envelope with correlation |
| §17 — Clients never send their own acting user or active org ID | Token-only identity | VERIFIED DONE | CLAUDE.md §5 — `JwtAuthGuard` sets `req.user.userId`; client never sends actorId |
| §17 — Self-service endpoints use /me and derive subject from principal | /me routes | VERIFIED DONE | Multiple `/me` routes exist in users, hr, payroll, timesheets modules |
| §17 — Retried mutations use idempotency keys | @Idempotent decorator | VERIFIED DONE | `FINAL-VERIFICATION.md:195` — `check:idempotent-commands` PASS, 9 bespoke exceptions |
| §17 — Webhooks verify signatures, persist event identity, deduplicate, support replay | Webhook implementation | STILL PENDING | `modules/webhooks/webhooks.service.ts` exists but signature verification and event-identity persistence not confirmed from source; `check:outbox-consumers` does not cover inbound webhooks |
| §18 Home — bounded projection with independent section success/failure | settle() pattern | VERIFIED DONE | `dashboard-personal.service.ts:144` — `settle("upcomingEvents", ...)` pattern; each section has its own error boundary |
| §18 Home — calendar visibility predicate before projection | SQL visibility predicate in Home service | VERIFIED DONE | `backend/src/modules/dashboard/dashboard-personal.service.ts:160-198` — `or(visibility="org", exists(creator), exists(attendee))` in WHERE before title/metadata projection |
| §18 Home — Build dashboard uses Build permission/DataScope not HR | Correct scope key | VERIFIED DONE | `backend/src/modules/dashboard/dashboard-scope.ts:9` — `DASHBOARD_BUILD_PERMISSION = "build:manage"`; `resolveProjectIds` uses `orgId` predicate |
| §18 Home — P95 aggregate <=800ms | Latency proof | STILL PENDING | No load testing; runbooks operator-blocked |
| §18 HRMS — organization_people is the org person | Person seam | VERIFIED DONE | `backend/CLAUDE.md` §1 — `organization_people` is the person; `modules/directory/person-seam.ts` |
| §18 HRMS — Scope enforced before retrieval | DataScope application | VERIFIED DONE | `check:scope-application` PASS 122/122 |
| §18 HRMS — Timesheets shared enum/contract definition | Contract drift | VERIFIED DONE | `FINAL-VERIFICATION.md:461` — `check:contract-drift` PASS, 0 baselined drift |
| §18 HRMS — Protected downloads use typed download client, signed URLs, malware scan | Signed URLs + scan | STILL PENDING | Signed URLs confirmed; malware scanning not confirmed for all protected downloads (KB ingestion scan confirmed partial; OPERATOR-EVIDENCE.md §8 shows export worker not built) |
| §18 Build — Projects and managed products separate | Separate tables | VERIFIED DONE | Separate schema files: `db/schema/build/` has both projects and managed-products tables |
| §18 Build — Bulk writes transactional and idempotent | db.transaction pattern | VERIFIED DONE | `backend/CLAUDE.md` §3 mandates `db.transaction` for multi-step writes |
| §18 Chat — Reactions normalized | chat_message_reactions table | VERIFIED DONE | `backend/src/db/schema/chat/chat.ts:139-155` — `chat_message_reactions` with `uniqueIndex("uniq_chat_message_reaction_actor_emoji").on(orgId, messageId, membershipId, emoji)` and composite FKs |
| §18 Chat — Participants are active org memberships (huddle/saved-message actors) | Actor migration | STILL PENDING | `chat.ts:244` — `chatSavedMessages.userId` still present; `chat.ts:443` — `chatHuddleParticipants.userId` still present; EXPAND phase done, CONTRACTION not started; `FINAL-VERIFICATION.md:349` — chat=10 legacy org FKs remain |
| §18 Chat — Per-channel ordering uses durable sequence | Channel sequence | STILL PENDING | No durable sequence column found in `chat_messages`; ordering appears to be by `createdAt`/`id` which is not a guaranteed durable sequence under concurrent inserts |
| §18 Calendar — Uses RFC 5545/RRULE implementation | rrule library | VERIFIED DONE | `backend/src/modules/calendar/calendar-occurrence.service.ts:1` — `import { RRule } from "rrule"` |
| §18 Calendar — Attendees normalized membership rows | eventAttendees table | VERIFIED DONE | `backend/src/db/schema/common/calendar-events.ts:46-60` — `eventAttendees` with `membershipId` FK and composite unique on `(orgId, eventId, membershipId)` |
| §18 Calendar — Finish actor/attendee cutover | Backfill + CONTRACTION | STILL PENDING | PRD §28.2a — "Remove duplicate authority between created_by/user IDs and membership IDs only after resumable backfill"; schema has `createdByMembershipId` but no CONTRACTION of old user FKs confirmed |
| §18 Calendar — Reminder delivery durable and idempotent | Outbox reminder | VERIFIED DONE | `modules/calendar/calendar-reminder-sweep.service.ts` uses tx-based delivery; `check:outbox-consumers` PASS |
| §18 Inbox/mail — Provider sync checkpointed, resumable, idempotent | Mail sync design | STILL PENDING | No checkpoint/resumable evidence found in current source; mail module exists but sync implementation not verified |
| §18 Notifications — Intent committed with business write through outbox | Outbox intent | VERIFIED DONE | `check:outbox-consumers` PASS — 18 emitted types, all consumed |
| §18 Notifications — Event streaming abort, jittered reconnect, cleanup | SSE cleanup | STILL PENDING | No SSE abort/reconnect implementation confirmed in current frontend source |
| §18 KB — ACL enforced inside SQL/search/vector retrieval before top-k | Retrieval ACL | STILL PENDING | `FINAL-VERIFICATION.md:112` — `kb/retrieval/kb-search.service.ts`, `kb-article-reindex.service.ts`, `kb-indexing.service.ts`, `kb-ingestion-checkpoint.service.ts` all in the `check:tenant-isolation` MISSING list |
| §18 KB — Ingestion resumable, deduplicated, observable, malware-scanned | Ingestion pipeline | STILL PENDING | `kb-ingestion-checkpoint.service.ts` missing from isolation tests; OPERATOR-EVIDENCE.md §8 — export worker and storage purge not built |
| §18 Billing — Invoices/credit notes are immutable snapshots | Immutable records | VERIFIED DONE | `backend/CLAUDE.md` §3 — audit evidence is immutable; invoice tables have no update path for posted invoices |
| §18 Billing — Money uses integer minor units | Integer cents | VERIFIED DONE | `backend/CLAUDE.md` §3 — "Money as integer cents" |
| §18 Billing — Entitlements resolve locally without provider calls | Local resolution | VERIFIED DONE | `useEntitlements` hook in frontend reads `GET /billing/entitlements`, cached locally |
| §18 Billing — Finance reminders use indexed due rows and batched recipients | Indexed cursor batch | VERIFIED DONE | `modules/finance/ar/reminders.service.ts:154-177` — keyset cursor loop with `REMINDER_BATCH_SIZE` + `inArray(invoices.dueDate, dueDates)`; `processBatch` at line 182 resolves recipients per batch |
| §18 Billing — Frontend uses effective permissions not legacy session roles | useCan() in accounting | VERIFIED DONE | `frontend/app/(authenticated)/accounting/assets/page.tsx:29` — `useCan("accounting:assets:create")`; no `session.user.role === "OWNER"` found in accounting pages |
| §18 Billing — accounting.journal.posted idempotent consumer or removed | Outbox consumer | VERIFIED DONE | No `OutboxWriter.emit` found in `modules/accounting/`; journal post is an audit-log action only (`accounting-ledger.service.ts:346`); `check:outbox-consumers` PASS covers all 18 emitted types |
| §18 Settings — /settings/* owns platform administration | Route contract | VERIFIED DONE | CLAUDE.md §8 product rules; `check:routes` PASS confirms no business routes in frontend api/ |
| §18 Settings — Mutations invalidate config/entitlement/access caches | Cache invalidation | VERIFIED DONE | `bumpPermissionsVersion` + `invalidateNamespace` called on every role/module mutation |
| §19 — Route files Server Components by default | Client page count | STILL PENDING | `FINAL-VERIFICATION.md:430` — 315/598 (52.7%) client pages; ceiling set at current value (gate does not drive reduction) |
| §19 — One route-access registry drives navigation, command palette, layouts | Shared registry | VERIFIED DONE | `frontend/lib/rbac/route-access/route-access.ts` + `route-access-extensions.ts` used by layouts |
| §19 — Universal routes explicit tested allowlist | Universal route test | VERIFIED DONE | `frontend/lib/rbac/route-access/universal-routes.ts` + `__tests__/route-access-coverage.test.ts` — regression matrix with 55 rows |
| §19 — Query hooks use canonical tenant-aware keys | Query scope check | VERIFIED DONE | `FINAL-VERIFICATION.md:385` — `check:query-scope` PASS |
| §19 — Protected requests use typed API/download/event clients | Typed client | VERIFIED DONE | `frontend/lib/api-client.ts`, `frontend/lib/server-fetch.ts` |
| §19 — Organization-aware centralized money/date/time formatting | Formatter consolidation | VERIFIED DONE | `FINAL-VERIFICATION.md:394` — `check:formatters` PASS, 4,763 files; `lib/format-utils.ts` is the canonical formatter |
| §19 — Consolidate 19 local formatters | Feature-level formatters | STILL PENDING | 10 feature-level format files found in `features/`: `accounting/lib/format-currency.ts`, `build/ai/ticket-ai-formatters.ts`, `build/shared/format-ticket-key.ts`, etc.; `check:formatters` only gates `Intl.NumberFormat` usage, not all formatting concerns |
| §19 — Empty states use EmptyState component | Hand-rolled check | VERIFIED DONE | `FINAL-VERIFICATION.md:403` — `check:empty-states` PASS |
| §19 — Replace 4 useEffect-driven public reads | Effect fetch check | VERIFIED DONE | `FINAL-VERIFICATION.md:411` — `check:effect-fetches` PASS |
| §19 — Files ≤300 lines target, ≤500 hard review | File size | STILL PENDING | `FINAL-VERIFICATION.md:537-539` — 2 frontend files over 500: `automation-trigger-data.ts` (599 lines), `channel-sidebar.tsx` (501 lines) |
| §19 — Responsive proof 375/768/1280 widths | Responsive coverage | STILL PENDING | No automated responsive proof; cannot verify from source |
| §19 — WCAG 2.2 AA | Accessibility | STILL PENDING | `check:icon-labels` PASS but full WCAG audit not performed |
| §19 — Public pages unique metadata | Metadata | STILL PENDING | `frontend/app/robots.ts` modified (in git status); no automated metadata coverage check found |
| §20 — No unobserved fire-and-forget business side effects | Side-effect check | VERIFIED DONE | `FINAL-VERIFICATION.md:149` — `check:placement-bypass` PASS, 76 named SKIPs; `check:outbox-consumers` PASS |
| §20 — In-process post-commit uses after-commit facility; durable work uses outbox | After-commit pattern | VERIFIED DONE | `registerAfterCommit` facility in `common/`; `OutboxWriter.emit(tx, ...)` for durable work |
| §20 — Consumers idempotent with bounded backoff, retry and dead-letter | Dead-letter behavior | STILL PENDING | `check:outbox-consumers` confirms all types consumed; dead-letter and retry policies not confirmed from source |
| §20 — Events carry version, org, event ID, correlation and causation | Event payload structure | STILL PENDING | Not verified from source; outbox events exist but payload schema not audited |
| §20 — TLS, managed secrets, secure cookies, CSP, sanitization, parameterized SQL | Security controls | STILL PENDING | Claimed in CLAUDE.md but not verifiable from source without a running app |
| §20 — Public tokens hashed, expiring, scoped and rate-limited | Rate limit check | VERIFIED DONE | `FINAL-VERIFICATION.md:320` — `check:log-secrets` PASS, 75 TIERS entries; all `@UseRateLimit` keys in TIERS |
| §20 — Uploads enforce type/size, quarantine, malware scan and signed retrieval | Upload pipeline | STILL PENDING | Storage module exists; malware scan and quarantine not fully confirmed for all upload paths |
| §20 — Logs without PII, secrets or tokens | Log secrets check | VERIFIED DONE | `FINAL-VERIFICATION.md:320` — `check:log-secrets` PASS, 2,782 files scanned |
| §20 — GDPR export/deletion, retention, legal-hold workflows executable and tested | Compliance drill | STILL PENDING | `OPERATOR-EVIDENCE.md` item 8 — export worker and storage purge not built; compliance drill partially blocked by code gaps |
| §20 — Operator/support access time-bound, approved, reasoned, audited | Operator access control | STILL PENDING | No operator-access runbook or time-bound access implementation found in current source |
| §21 — Keep placement records and placement-aware writes | Schema + code | VERIFIED DONE | `backend/src/db/schema/common/placement.ts`, `placement-decisions.ts`; `common/region/placement.ts`, `common/placement/placement-selection.ts` |
| §21 — Keep control-plane outage behavior | Cross-cell relay | VERIFIED DONE | `common/cell-transport/cross-cell-relay.ts`; self-test PASS (`cell:relay`) |
| §21 — Keep cold second-cell schema parity | Cell schema compare | VERIFIED DONE | `scripts/compare-cell-schema.mjs` self-test PASS — missing and unexpected objects both reported |
| §21 — Keep organization lifecycle saga | Placement admin | VERIFIED DONE | `modules/organization/core/lifecycle/organization-placement-admin.service.ts` |
| §21 — Keep organization relocation/rollback | Relocate scripts | VERIFIED DONE | `scripts/relocate-org.mjs` self-test PASS — illegal transition rejected |
| §21 — Keep canary rollback | Rollout script | VERIFIED DONE | `scripts/run-cell-rollout.ts` self-test PASS — regressed canary triggers ROLLBACK at +93.6% p99 |
| §21 — 20M gate: two independently resourced cells | Infrastructure | STILL PENDING | `OPERATOR-EVIDENCE.md` item 1 OPEN — not provisioned; namespace-only isolation does not pass |
| §21 — 20M gate: recovery drilled with measured RPO/RTO | Recovery drill | STILL PENDING | `OPERATOR-EVIDENCE.md` item 4 OPEN — not drilled; self-test structure only |
| §21 — 20M gate: all 14 workload objectives driven or removed | Load driver | STILL PENDING | `OPERATOR-EVIDENCE.md` item 5 OPEN — not run on live infrastructure |
| §21 — 20M gate: colocated driver publishes passing latency and headroom | Driver results | STILL PENDING | `OPERATOR-EVIDENCE.md` item 5 OPEN |
| §21 — 20M gate: read-replica behavior measured | Read replica | STILL PENDING | `OPERATOR-EVIDENCE.md` item 3 OPEN — replica not provisioned |
| §21 — 20M gate: migration chain_gaps = 0 | Migration chain | VERIFIED DONE | `FINAL-VERIFICATION.md:236` — `check:migration-chain` PASS; `check:migration-discipline` PASS 424 SQL files |
| §21 — 20M gate: capacity and unit cost trended daily | Cost trend | STILL PENDING | `OPERATOR-EVIDENCE.md` item 7 OPEN — no live infra data |
| §21 — 20M gate: active-org landing derives from membership/index truth | Membership-based landing | STILL PENDING | Not verified from source |
| §21 — 20M gate: per-cell capacity and cost forecasts approved | Forecasts | STILL PENDING | `OPERATOR-EVIDENCE.md` item 7 OPEN |

---

## NEW findings (not in the PRD's active backlog)

**N1 — check:tenant-isolation REGRESSED (FAIL)**  
`FINAL-VERIFICATION.md:129` — `check:tenant-isolation` now exits 1: 823/840 services covered (98%), 17 uncovered. Was reported PASS at 818/818 (100%) in S10. New services added by concurrent lanes were not matched with isolation specs. Affected services include KB retrieval (`kb-indexing.service.ts`, `kb-ingestion-checkpoint.service.ts`), payroll (`run-data-loader.service.ts`, `run-result-persister.service.ts`), timesheets (`approvals-bulk.service.ts`), and CRM (`crm-organizations-merge.service.ts`). Severity: HIGH — a missing cross-tenant test means a missing `orgId` predicate in these services is not structurally caught.

**N2 — check:mock-surface REGRESSED (FAIL)**  
`FINAL-VERIFICATION.md:256` — 6 phantom mock methods across 4 classes: `AccessPermissionResolver` (`.innerJoin()`, `.where()`), `AutonomyHoldService` (`.where()`), `PermissionCatalogSyncService` (`.onConflictDoNothing()`, `.onConflictDoUpdate()`), `StockEngineBatchService` (`.execute()`). Was claimed fixed at 0 defects. A phantom mock method means the test's negative control uses a method the real implementation doesn't call, so the DENY assertion passes vacuously. Severity: MEDIUM — 4 test suites have vacuous coverage.

**N3 — pnpm test:e2e exits 0 while all 25 suites fail to RUN**  
`FINAL-VERIFICATION.md:525` — pre-existing blockers: stale ts-jest cache, AppModule OOM without raised heap, `RBAC_E2E_DATABASE_URL` missing from `jest-e2e.json`. Exit 0 due to `--forceExit`. A gate that exits 0 on complete failure is not a gate. Severity: HIGH — e2e RBAC cross-tenant tests are the only controller-level auth+scope proof; none are running.

**N4 — OpenAPI stale; freshness CI gate permanently broken**  
`FINAL-VERIFICATION.md:279` — `openapi:check` exits 1 whenever a route changes after the last generate. The PRD requires "OpenAPI checked for freshness in CI" but the committed `openapi.json` requires manual regeneration after every route addition. This is a process gap: no CI job automates `openapi:generate` + commit. Severity: MEDIUM — contract drift accumulates between generates.

**N5 — Chat unique constraint on saved messages uses userId not membershipId**  
`backend/src/db/schema/chat/chat.ts:254` — `uniqueIndex("uniq_saved_message").on(table.userId, table.messageId)`. The EXPAND phase added `membershipId` but the uniqueness constraint still references the legacy `userId`. If two org-members of the same user save the same message (cross-org same messageId — theoretically possible with serial PKs), the constraint may be incorrect. The `membershipId` FK is present but not in the unique index. Severity: LOW — only affects the CONTRACTION readiness of the saved-messages actor migration.

---

## Classification counts

| Classification | Count |
|---|---|
| VERIFIED DONE | 38 |
| STILL PENDING | 28 |
| REGRESSED | 1 (OpenAPI freshness gate) |
| NEW | 5 |

---

## 5 most serious findings

1. **N3 — e2e suite exits 0 while 25/25 suites fail to RUN** (`FINAL-VERIFICATION.md:525`). Controller-level auth, RBAC and scope tests provide zero coverage.

2. **N1 — check:tenant-isolation REGRESSED to FAIL** (`FINAL-VERIFICATION.md:129`). 17 uncovered services include KB retrieval and payroll run services. A missing `orgId` predicate in these services is not caught by any test.

3. **§18 KB — ACL not confirmed inside SQL/search/vector retrieval before top-k** (`FINAL-VERIFICATION.md:112`). KB retrieval, indexing and ingestion services are all in the `check:tenant-isolation` MISSING list. If ACL is not applied before top-k selection, vector results leak across tenant boundaries.

4. **§17 / §21 — OpenAPI freshness gate exits 1** (`FINAL-VERIFICATION.md:279`). The gate is REGRESSED: 5 ops changed since last generation. Contract drift accumulates silently between manual generates. The 20M gate requires CI-green OpenAPI.

5. **§18 Chat — per-channel durable ordering not confirmed** (`backend/src/db/schema/chat/chat.ts`). Chat messages order by `createdAt`/`id`; no explicit durable sequence (e.g., `bigserial` with gap-free guarantee) found. Under concurrent inserts from multiple nodes, delivery order is not durable. The PRD §18 Chat requires "per-channel ordering uses an explicit durable sequence/equivalent."
