# PRD Audit Slice 4 — Sections 22 through 28

**Date:** 2026-08-31  
**Reviewer:** Lane L4 (read-only; no source edits)  
**PRD grounded against:** frontend `60d27c879`, backend `32638f21`  
**Method:** Direct source inspection plus RECONCILIATION.md (2026-08-30, 62/285 items = 22% done)  
**Evidence standard:** file:line from source actually opened, or gate output named in RECONCILIATION.md

---

## Verification Table

| PRD ref | Claim | Classification | Evidence (file:line or gate) |
|---|---|---|---|
| §22 removal rules | Module-graph proof + build verification required before deleting code | VERIFIED DONE | `check:dead-code PASS` (RECONCILIATION S09); knip run in both repos; 1 file deleted with full module-graph proof |
| §23 backend typecheck | Pass in CI | VERIFIED DONE | RECONCILIATION gate table row: `tsc --noEmit PASS` |
| §23 frontend typecheck | Pass in CI | VERIFIED DONE | RECONCILIATION gate table row: `tsc --noEmit PASS` |
| §23 backend cycles | Zero in CI | VERIFIED DONE | RECONCILIATION gate: `check:cycles PASS 0 circular in both repos` |
| §23 frontend cycles | Zero in CI | VERIFIED DONE | RECONCILIATION gate: `check:cycles PASS 0 circular in both repos` |
| §23 permission catalog | 690 keys zero drift | VERIFIED DONE | RECONCILIATION gate: `check:permission-keys PASS 690/690`; S01 item 6.1 ticked |
| §23 DataScope application | 119/119 complete | VERIFIED DONE | RECONCILIATION gate: `check:scope-application PASS` |
| §23 tenant leading indexes | Zero missing | VERIFIED DONE | RECONCILIATION: 722 tables covered; gate passes |
| §23 frontend business routes | None | VERIFIED DONE | RECONCILIATION gate: `check:route-classification PASS 0 undeclared` |
| §23 query scope/module manifest | Pass in CI | VERIFIED DONE | RECONCILIATION gate: `check:navigation-permissions PASS` |
| §23 formatter check | Zero unjustified findings | VERIFIED DONE | RECONCILIATION gate: `check:formatters PASS` (L24/L33 reports) |
| §23 empty-state check | Zero or documented exceptions | VERIFIED DONE | RECONCILIATION gate: `check:empty-states PASS` (L33 report) |
| §23 dead code | Zero confirmed dead | VERIFIED DONE | RECONCILIATION: frontend 4 unused files → 0; gate `check:dead-code PASS` |
| §23 migration chain | 124 gaps → zero | VERIFIED DONE | RECONCILIATION gate: `check:migration-chain PASS`; 384 journal entries; cold bootstrap at 387/387 |
| §23 effect-fetch check | 4 findings → zero | STILL PENDING | RECONCILIATION S09: item 6.2 open; `useEffect`-driven public reads not confirmed addressed |
| §23 contract drift | Zero unapproved drift | STILL PENDING | RECONCILIATION S03: Timesheets drift (expense_export_jobs schema drift open); S06: chat CurrentUserContext lacks membershipId |
| §23 OpenAPI freshness | Green in CI | STILL PENDING | RECONCILIATION S08: 1916/3540 (54%) coverage; item 2 open |
| §23 recovery/headroom | Published passing evidence | STILL PENDING | All operator-blocked D01–D15; PRODUCTION-OPERATIONS-STATUS.md; no live cell resource |
| §24 delivery order | Procedural | NOT VERIFIABLE | Describes sequencing, not source state |
| §25 scorecard | 12 areas each 10/10 with evidence | STILL PENDING | RECONCILIATION: 22% done; no area has complete evidence |
| §26 final definition of done | All P0/P1 closed; full gates green | STILL PENDING | Multiple P1s open; operator-blocked D rows |
| §28.2 baseline — all 3533 handlers declared | Zero undeclared | VERIFIED DONE | RECONCILIATION gate: `check:route-classification PASS 0 undeclared` |
| §28.2 baseline — 690-key catalog aligned | Zero drift | VERIFIED DONE | `check:permission-keys PASS` |
| §28.2 baseline — 722 tenant tables indexed | Zero missing | VERIFIED DONE | Confirmed via gate |
| §28.2 baseline — zero import cycles | Both repos | VERIFIED DONE | `check:cycles PASS 0 circular` (RECONCILIATION gate table) |
| §28.2 baseline — notification FK precision | Fixed | VERIFIED DONE | RECONCILIATION S06: `notification-dispatch-after-commit.spec.ts` + `notification-outbox-relay.spec.ts` 266/266 pass |
| §28.2 baseline — expense outbox | Atomic commit + outbox | VERIFIED DONE | RECONCILIATION S03: item 8.1 ticked |
| §28.2a P0 — Home calendar object-level access | Visibility/attendee predicates in SQL before projection | VERIFIED DONE | `backend/src/modules/dashboard/dashboard-personal.service.ts:144-204`; visibility OR clause, creator check (`createdByMembershipId`), attendee EXISTS with `ACTIVE` status and `ne(status, "declined")`; spec: `dashboard-hr-events.spec.ts:65-223` |
| §28.2a P0 — Build dashboard scope | Replace HR permission with exact Build permission/DataScope | VERIFIED DONE | `backend/src/modules/dashboard/dashboard-scope.ts:9` (`DASHBOARD_BUILD_PERMISSION = "build:manage"`); `dashboard-project.service.ts:8,37` calls `resolveBuildDashboardScope`; `projectMembers` query at line 32 includes `eq(projectMembers.orgId, orgId)`; sprint aggregate is bounded SQL at lines 133-146 |
| §28.2a P0 — Tenant isolation 818/818 | Static + execution gates both pass | VERIFIED DONE | RECONCILIATION gate: `check:tenant-isolation 818/818 PASS`; 373 suites, 1436 tests |
| §28.2a P0 — Migration chain watermark | Cold bootstrap at 387/387 | VERIFIED DONE | RECONCILIATION gate: `check:migration-chain PASS`; 0629, 0666 prerequisite fixed |
| §28.2a P0 — Admin route descendants protected | 13 extensions, `enforceRouteAccess` checks extension registry first | VERIFIED DONE | `frontend/lib/rbac/route-access/enforce-route-access.ts:30-38`; extension registry checked before universal-route fallback; unknown→`/access-denied` |
| §28.2a P0 — Org membership revocation test | 36/36 pass | VERIFIED DONE | RECONCILIATION S01: already ticked; spec provides `OrgMembershipReadService` + Redis tombstone seam |
| §28.2a P1 — Calendar actor/attendee cutover | Remove JSONB attendees, membership-key actors, backfill | STILL PENDING | Schema is membership-keyed (`calendar-events.ts:21,50`); but RECONCILIATION S06:145: "cutover OPEN — CurrentUserContext lacks membershipId"; no backfill migration confirmed |
| §28.2a P1 — Chat actor/reaction cutover | Normalize reactions, migrate actors, backfill | STILL PENDING | Schema done: `db/schema/chat/chat.ts:139-155` (unique index on orgId/messageId/membershipId/emoji, composite FKs); RECONCILIATION S06:145: "11/12 columns migrated, cutover OPEN" |
| §28.2a P1 — Bound offset lists | Migrate module-access-groups, Workflow CRUD, Build compat paths, Payroll payout batches | STILL PENDING | RECONCILIATION S04:105: "roadmap, managed-products, portfolios still offset-based"; S01:49: "roster cursor pagination + search NOT done" |
| §28.2a P1 — Decomposition by responsibility | 88 backend + 22 frontend files over 500 | STILL PENDING | Current source: `access.service.ts` 640 lines, `automation.service.ts` 555 lines, `calendar.service.ts` 503 lines (all over hard limit without documented exception); RECONCILIATION S07:169: `hr-ai.service.ts` 812 lines, `kb-indexing.service.ts` now 405 (resolved) |
| §28.2a P1 — Finance async paths | `accounting.journal.posted` consumer; expense export job; reminder SQL | STILL PENDING | `accounting-ledger.service.ts:246,346,450` emits `accounting.journal.create/post/reverse`; `finance-posting.service.ts:278` emits same; grep for consumers: only 4 `.consumer.ts` files exist, none for accounting events |
| §28.2a P1 — OpenAPI coverage | 1916/3540 → all applicable ops | STILL PENDING | RECONCILIATION S08:190: "OpenAPI coverage at 54%, item 2 open" |
| §28.2a P1 — Infrastructure proof | Independent cells, PITR, replica, load/headroom, cost | STILL PENDING (operator-blocked) | D01–D15 in PRODUCTION-OPERATIONS-STATUS.md; no provisioned independent cell resources |
| §28.2a P1 — Compliance/erasure decisions | Export worker, storage purge, legal-hold drill | STILL PENDING (operator-blocked) | D02 and D07: code gaps exist (no export worker, no storage purge path); runbook stub only |
| §28.3 Organization — actor contraction | Zero legacy actor columns; cold/upgrade migrations agree | STILL PENDING | RECONCILIATION S01:46: "555 legacy columns remaining; scan:legacy-actors:check passes as ratchet gate, not completion gate. Contraction = 0" |
| §28.3 Organization — module service splits | Split org-membership, invitations, lifecycle services | STILL PENDING | RECONCILIATION S01:49: items 5.4 (roster cursor) and 2 (membership artifact classification) open |
| §28.4 RBAC — universal-route exact-by-default | Only routes with `subtree: true` get subtree matching | VERIFIED DONE | `frontend/lib/rbac/route-access/universal-routes.ts:152-160`: default is exact match; `subtree` flag controls prefix matching |
| §28.4 RBAC — admin descendants protected | Notification/KB/chat admin protected via extension registry | VERIFIED DONE | RECONCILIATION S01:35-36 items 1.2 ticked; `universal-route-matrix.test.ts` 57 rows; `route-access-extensions.ts` |
| §28.4 RBAC — Workflows layout `enforceRouteAccess` | Applied | VERIFIED DONE | `frontend/app/(authenticated)/workflows/layout.tsx:5`: `await enforceRouteAccess("/workflows")` |
| §28.4 RBAC — Payroll layout `enforceRouteAccess` | Applied | VERIFIED DONE | `frontend/app/(authenticated)/payroll/layout.tsx:7`: `await enforceRouteAccess("/payroll")` |
| §28.4 RBAC — Workflow hooks internally gated | Each hook disabled without exact permission | STILL PENDING | `frontend/app/(authenticated)/workflows/page.tsx:78-86`: `useWorkflows` and `useWorkflowAnalytics` called with no `enabled: useCan(...)` gate; the layout gate fires but hooks execute regardless of individual workflow permissions |
| §28.4 RBAC — Split module-access group/roster/standing | Decomposed interfaces | PARTIALLY DONE | RECONCILIATION S01:39: `module-access-groups.service.ts` split to 145 lines + 6-file hooks/api/module-access/ directory; roster cursor NOT done (item 5.4) |
| §28.5 Home — section failure isolation | One failed section does not fail whole Home | STILL PENDING | `dashboard-personal.service.ts:53-68` has `settle()` wrapper per source; but RECONCILIATION S08:191 item 1.4 open for all 11 sections |
| §28.6 Settings — canonical route ownership | One owner per setting; no module operational work in Settings | STILL PENDING | RECONCILIATION S01:51: settings route ownership open |
| §28.7 HRMS — projection pinning | Sensitive HR responses explicit-projection; bounded lists | STILL PENDING | RECONCILIATION S02:63-66: items 1-4 all open; no gates covering projections or bounded lists specifically |
| §28.8 Payroll — route/hook enforcement | Add exact internal gates; split run generation | PARTIALLY DONE | Layout `enforceRouteAccess` present; RECONCILIATION S03:87: run generation split done (generate-pipeline 250 lines, generate 212 lines); but S03:88: approval audit identity not verified; S03:90: `void postPaid` fire-and-forget at `payout-run-completion.ts:204-213` |
| §28.9 Build/PM — bounded board/list | Stable cursor, tenant-leading sort, no offset compat paths | STILL PENDING | RECONCILIATION S04:105: roadmap/managed-products/portfolios still offset-based |
| §28.10 Billing — orchestration decomposition | Subscription lifecycle, entitlement, seat, invoice modules | STILL PENDING | RECONCILIATION S05:122: "subscription lifecycle, entitlement resolution, seat accounting not decomposed"; seats/proration not addressed |
| §28.11 Accounting — journal.post consumer decision | Register idempotent consumer OR remove event | STILL PENDING | `accounting-ledger.service.ts:346` emits `accounting.journal.post`; `finance-posting.service.ts:278` emits same; zero consumers in backend (only 4 `.consumer.ts` files total: chat-fanout, expense-outbox, fin-reminder, hr-helpdesk); RECONCILIATION S05:127 confirms `accounting.invoice.paid/.received/issued` emitted with no consumer |
| §28.12 Chat — reactions normalized | `(orgId, messageId, membershipId, emoji)` uniqueness + composite FKs | VERIFIED DONE (schema) | `db/schema/chat/chat.ts:139-155`: `chat_message_reactions` with `uniqueIndex("uniq_chat_message_reaction_actor_emoji").on(orgId, messageId, membershipId, emoji)`, composite FKs to `chatMessages(orgId, id)` and `organizationMembers(orgId, id)`; service uses `onConflictDoNothing()` for idempotency at `chat-reactions.service.ts:113` |
| §28.12 Chat — actor migration complete | Membership-keyed, legacy fields contracted | STILL PENDING | RECONCILIATION S06:145: "expansion done for 11/12 chat columns; cutover OPEN" |
| §28.12 Chat — `chat.message.fanout` consumer | At-least-once delivery with consumer | STILL PENDING | RECONCILIATION S06:148: `chat.message.fanout` emitted with no consumer (10 orphan event types total) |
| §28.13 Calendar — attendees membership-keyed | Composite org/event/membership FK and uniqueness | VERIFIED DONE | `db/schema/common/calendar-events.ts:46-60`: `event_attendees` unique `(orgId, eventId, membershipId)`, FK to `organizationMembers(orgId, id)`, FK to `calendarEvents(orgId, id)` |
| §28.13 Calendar — event mutation + outbox | One transaction | STILL PENDING | RECONCILIATION S06: items 5.1 (notifications delivery) ticked but calendar outbox not explicitly confirmed |
| §28.14 Notifications — event-stream adapter | abort, jittered reconnect, retry ceiling, org-switch cleanup | STILL PENDING | RECONCILIATION S06:146: "event-stream adapter with reconnect/org-switch cleanup not confirmed" |
| §28.15 Workflows — layout and hook gates | Server route + internal hook permission gates | PARTIALLY DONE | Layout: `enforceRouteAccess("/workflows")` ✓; Hooks: workflows page `useWorkflows`/`useWorkflowAnalytics` at lines 78-86 lack `useCan` gate — STILL PENDING |
| §28.16 API validation | Metadata-driven validation seam; OpenAPI 3540 operations | STILL PENDING | RECONCILIATION S08:190: 54% coverage open |
| §28.16 Query cost | Production-shaped dataset needed; read-budget measurement | STILL PENDING (operator-blocked) | D15: requires seed script or sanitized snapshot |
| §28.16 Schema/migrations | Risk register for serial/bigserial keys; zero orphan migrations | PARTIALLY DONE | RECONCILIATION S08:184: serial/bigserial risk register done (L22-report: 588 int4 columns analyzed); migration chain PASS; but 5/960 RLS policies still missing (955/960) |
| §28.16 File structure | Every >500-line production file split or excepted | STILL PENDING | Current source: `access.service.ts` 640, `automation.service.ts` 555, `calendar.service.ts` 503 — no documented cohesive exception found |
| §28.16 Security | Public-token rate limits, upload limits, SSRF, operator access | STILL PENDING | RECONCILIATION: `check:route-classification PASS`; but operator access design, SSRF controls verification, alert webhook config all open |
| §28.16 Cell/recovery/20M | Independent cells, PITR, replica, load objectives, cost | STILL PENDING (operator-blocked) | D08–D14: all blocked; load driver self-tests 14/14 pass but from public internet not colocated |
| §28.17 Dependency order | Wave A–G execution plan | NOT VERIFIABLE | Describes implementation order, not source state |
| §28.18 final verification matrix | All 22 gate rows must have evidence | STILL PENDING | RECONCILIATION: only 14/16 gates pass; async/OpenAPI/recovery/load/cost/structure gates open |
| §28.19 final score gate | 13 modules each at 10/10 with evidence | STILL PENDING | 22% items complete; no module at 10/10 |
| §28.20 completeness ledger | Every item has source change + automated proof + operational evidence | STILL PENDING | 78% (223 items) unproved |

---

## NEW Findings

All items below were found while verifying PRD claims against current source. None appear as active findings in the PRD.

| # | Finding | Severity | Evidence |
|---|---|---|---|
| N1 | **`postPaid` fire-and-forget in payroll payout** — `deps.payrollPosting.postPaid(...)` is called with only a `.catch()` error-swallow at lines 204-213; no `registerAfterCommit`, no outbox. An accounting integration failure on payout completion is silently logged at `WARN` level, making it invisible to queue-age monitoring. | HIGH | `backend/src/modules/payroll/payout/lib/payout-run-completion.ts:204-213` |
| N2 | **10 orphan outbox event types — check:outbox-consumers FAILS** — The following events are emitted but have no registered consumer: `build.project.created`, `build.ticket.created`, `build.ticket.status_changed`, `accounting.journal.create`, `accounting.journal.post`, `accounting.journal.reverse`, `accounting.invoice.paid`, `accounting.payment.received`, `accounting.invoice.issued`, `chat.message.fanout`. Only 4 `.consumer.ts` files exist in the entire backend. | HIGH | `backend/src/modules/accounting/core/accounting-ledger.service.ts:246,346,450`; `backend/src/modules/accounting/posting/finance-posting.service.ts:278`; RECONCILIATION.md S08:193 |
| N3 | **`calendar_events` table uses `serial` PK** — contradicts PRD §14 "No new `serial` primary keys" and the risk-register requirement. Table also has simple `orgId FK -> organizations.id` without a composite `(orgId, id) -> (orgId, id)` pattern on the calendar_events → organization edge. | MEDIUM | `backend/src/db/schema/common/calendar-events.ts:6` (`serial("id").primaryKey()`); PRD §14 |
| N4 | **`access.service.ts` and `automation.service.ts` exceed 500-line hard limit without documented exception** — `access.service.ts` is 640 lines, `automation.service.ts` is 555 lines, `calendar.service.ts` is 503 lines. No cohesive-exception record found for any of these. PRD §7 ("500 hard review") and §28.16 require a named exception register with interface, reason and owner. | LOW | `backend/src/modules/access/access.service.ts` (640 lines); `backend/src/modules/automation/automation.service.ts` (555 lines); `backend/src/modules/calendar/calendar.service.ts` (503 lines) |
| N5 | **`hr:employees:export` permission key is absent from both catalogs** — The key appears in RECONCILIATION.md as a ghost key requiring catalog entry. Grep of `backend/src/modules/rbac/permissions/` and `frontend/lib/rbac/` returns zero results for `employees:export`. Any frontend `useCan("hr:employees:export")` call will always return false, and any backend `@RequirePermission("hr:employees:export")` will fail with an undeclared-key boot error. | MEDIUM | `backend/src/modules/rbac/permissions/hr-foundation.permissions.ts` (absent); `backend/src/modules/rbac/permissions/hr-workforce.permissions.ts` (absent); RECONCILIATION.md S01:50 |
| N6 | **Workflow page hooks fire without per-hook `useCan` gate** — The layout enforces route-level access, but `useWorkflows` and `useWorkflowAnalytics` in the workflows page are called unconditionally. Any member who reaches the route via a session + org (e.g., a link) fires both queries. PRD §28.15: "Gate each workflow read and mutation hook internally." | MEDIUM | `frontend/app/(authenticated)/workflows/page.tsx:78` (`useWorkflows({...})` — no `enabled: useCan(...)`) and `:85` (`useWorkflowAnalytics()` — no gate) |
| N7 | **`chat-messages.service.ts` split reported at 613 lines in RECONCILIATION (S06:149), but current source is 457 lines** — This means the split mentioned in L12-report has been applied. Marking as resolved but noting the RECONCILIATION description is stale for this specific file. | INFO | `backend/src/modules/chat/chat-messages.service.ts` (457 lines, measured) vs RECONCILIATION S06:149 (reported 613 pre-split) |

---

## Summary

| Classification | Count |
|---|---|
| VERIFIED DONE | 28 |
| STILL PENDING | 38 |
| PARTIALLY DONE | 4 |
| STILL PENDING (operator-blocked) | 6 |
| NOT VERIFIABLE | 2 |
| NEW findings | 7 |

**Overall completion: approximately 22% (62/285 items per RECONCILIATION.md). No module is at 10/10. The 5 most serious findings:**

1. **N2 / §28.11** — 10 orphan outbox event types including `accounting.journal.post`, `accounting.journal.create`, `accounting.invoice.paid` and `chat.message.fanout` with no registered consumers. Any process crash between emit and delivery produces silent data loss. `accounting-ledger.service.ts:246,346,450`; `finance-posting.service.ts:278`.

2. **N1 / §28.8** — `postPaid` accounting integration called as fire-and-forget with only a swallowed `.catch()` warning in the payroll payout completion path. A failed accounting integration is unobservable from queue monitoring. `payout-run-completion.ts:204-213`.

3. **§28.2a P1 / §28.3** — 555 legacy organization actor columns remain un-contracted. Chat actor cutover is open (11/12 columns migrated). Calendar cutover is open (CurrentUserContext lacks membershipId). Actor contraction = 0 as of RECONCILIATION.md 2026-08-30. Cross-cutting correctness risk.

4. **§28.2a P1 / §28.11** — Finance async paths: accounting journal events (`post`, `create`, `reverse`) are emitted via outbox but no consumer has been registered or product decision taken. The "decide product behavior or remove" checkpoint from §28.11 has not been executed.

5. **§28.4 / N6** — Workflow permission hooks (`useWorkflows`, `useWorkflowAnalytics`) fire without `useCan` gates. Route-level enforcement (layout) is present but hook-level enforcement is missing. An authenticated user with no workflow module access will still trigger both API calls.
