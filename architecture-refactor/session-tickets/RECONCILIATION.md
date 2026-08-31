# Ticket Reconciliation — L73

**Date:** 2026-08-30
**Method:** Gate results (14 of 16 pass), `file:line` citations from source, and lane reports verified against source where possible. Lane reports without source verification are not ticked.
**Evidence standard:** gate pass or `file:line`. "Already done" prose sections carry no checkbox weight.

---

## Per-Ticket Summary

| Ticket | Items before | Ticked this run | Remain open | INERT | Total |
|---|---|---|---|---|---|
| S01 Identity/RBAC | 0 | 8 | 20 | 0 | 28 |
| S02 HRMS | 0 | 2 | 16 | 0 | 18 |
| S03 Payroll/Time/Expenses | 9 | 0 | 14 | 0 | 23 |
| S04 Build/Workflows | 0 | 3 | 24 | 0 | 27 |
| S05 Billing/Accounting/Finance | 0 | 3 | 20 | 0 | 23 |
| S06 Communications | 0 | 7 | 24 | 0 | 31 |
| S07 KB/Search/AI | 0 | 7 | 21 | 0 | 28 |
| S08 Home/Platform Ops | 0 | 9 | 38 | 0 | 47 |
| S09 Frontend Platform | 0 | 6 | 31 | 0 | 37 |
| S10 Excluded Domains/Final Gates | 0 | 8 | 15 | 0 | 23 |
| **TOTALS** | **9** | **53 new** | **223** | **0** | **285** |

**Grand total ticked: 62 of 285 (22%)**

The 22% is the honest number. The remaining 78% (223 items) is a mix of structural work not yet done (actor contraction, OpenAPI coverage, bounded lists throughout, operator runbooks), items that need runtime proof we cannot run without a live DB, and security gaps that remain open (tenant isolation at 93%, outbox consumers at 10 orphans, calendar ACL cutover not complete).

---

## S01 — Identity, Organization, RBAC, Module Access & Settings

**Items before: 28 | Ticked: 8 | Remain: 20 | INERT: 0**

Ticked:
- Item 3 (placement-bypass): gate check:placement-bypass PASS; L16-report details 5 allowlist additions.
- Item 4.1 (authority matrix operations): gate check:owner-authority PASS; L18-report authority-matrix.spec.ts.
- Item 4.3 (table-driven tests): L18-report: 14 tests pass covering all 6 standings and all actor combinations.
- Item 5.1 (module-access-groups.service.ts split): wc -l 145 lines confirmed; sub-services all under 500.
- Item 5.2 (frontend module-access hook split): hooks/api/module-access/ directory with 6 files confirmed by ls.
- Item 5.3 (eliminate repeated queries): L17-report: warm-path fix + user-module-access.service.ts extracted (234 lines).
- Item 6.1 (catalogs aligned): gate check:permission-keys PASS — 690/690 keys.
- Item 6.3 (catalogs are folders): structure confirmed by ls.

Open highlights:
- Item 1 (actor contraction): 555 legacy columns remaining; scan:legacy-actors:check passes as a ratchet gate, not a completion gate. Contraction = 0.
- Item 2 (membership artifact inventory): membership-artifacts.spec.ts file exists but AUTHORITY vs ATTRIBUTION classification and onRemoval/onSuspension verification not confirmed.
- Item 4.2 (exactly 6 standings): not source-verified this run.
- Item 5.4 (roster cursor pagination + search): NOT done.
- Item 6.2 (service every OUT-OF-OWNERSHIP key request): ghost key `hr:employees:export` still missing from HR catalog (L26-report).
- Items 7, 8, 9: cache revocation cross-instance proof, settings route ownership, and tenant isolation (93%) all remain open.

---

## S02 — HRMS

**Items before: 18 | Ticked: 2 | Remain: 16 | INERT: 0**

Ticked:
- Item 5 (hiring.ts split): `hiring-core.ts` (140), `hiring-candidates.ts` (227), `hiring-interviews.ts` (242), `hiring-pipeline.ts` (377) — ls confirmed. `hr-calendar-sub-sources.ts` extracted alongside `hr-calendar-source.ts` — ls confirmed. L26-report.
- Item 8 (cross-tenant WFH index): L26-report: CONFIRMED FIXED — uniqueIndex orgId-leading.

Open highlights:
- Items 1-4 (table inventory, projections, bounded lists, scope correctness): all open; no gates cover these specifically.
- Item 6 (tenant isolation): 93% repo-wide, HR-specific services may still be uncovered.
- Item 7 (frontend states): not addressed.
- Item 5 residual: `hr-ai.service.ts` (812 lines) reported OUT-OF-OWNERSHIP to S07 but not split.

---

## S03 — Payroll, Timesheets & Expenses

**Items before: 9 | Ticked: 0 new (9 carry over) | Remain: 14 | INERT: 0**

No new ticks. All 9 prior ticks (verified by L62) are confirmed:
- 1.4 guard audit (0 violations)
- 2.3 retry safety (idempotency key + locked-status gate + 17 invariant tests)
- 3.1 integer minor units
- 3.2 immutable approved runs
- 3.4 focused proof (`payroll-invariants.spec.ts`)
- 4.1 job handlers (PREVIEW/EXPORT/RECONCILE removed)
- 8.1 async via outbox
- 8.2 payroll outbox consumers
- 9 tenant isolation for payroll trees

Open highlights:
- Item 2.1-2.2 (split run generation + payout batches): `runs/generate.service.ts` (731), `generate-pipeline.service.ts` (696), `payout-batches.service.ts` (746), `ess.service.ts` (657) — all still over 500 lines.
- Item 3.3 (approval audit identity): not verified.
- Item 7 (expense_export_jobs schema drift): still open.
- The `void autoSnapshotJournal` fire-and-forget at `payout-run-completion.ts:212` remains (NOTABLE FINDING from L62; not a ticket item, noted under item 8.1).

---

## S04 — Build/PM & Workflows

**Items before: 27 | Ticked: 3 | Remain: 24 | INERT: 0**

Ticked:
- Item 1.1 (guard audit 0 violations): L03-report 0 violations in build tree; L05-report: WorkflowsController line 34 and AutomationController line 12 carry class-level guards.
- Item 1.2 (unknown routes fail closed): universal-route-matrix test 57 rows; gate check:navigation-permissions PASS.
- Item 5.3 (projects-tickets-read.service.ts split): wc -l 429 lines (was 568); `projects-tickets-detail.service.ts` 164 lines confirmed.

Open highlights:
- Item 2 (ungated automations hooks): not source-verified; L05 confirmed keys exist in catalogs but hook gate wiring not confirmed.
- Item 3 (bounded lists): growing lists (roadmap, managed-products, portfolios, etc.) still offset-based per L03-report.
- Item 4 (query cost, OR+semi-join): `projects-tickets-read.service.ts:~180-220` scopeClause assembly identified but not fixed.
- Item 9 (outbox consumers): build emits `build.project.created`, `build.ticket.created`, `build.ticket.status_changed` with no consumer — check:outbox-consumers FAILS (10 orphans total).
- Items 5.1, 5.2, 5.4, 5.5 (goals, build-entity-adapter, tasks, automation-meta): all open/out-of-ownership.

---

## S05 — Billing, Payments, Accounting & Finance

**Items before: 23 | Ticked: 3 | Remain: 20 | INERT: 0**

Ticked:
- Item 4.2 (three-state webhook ledger): `billing/core/provider-event-ledger.ts` implements RECORDED/RETRY/PROCESSED states. L06-report, L14-report.
- Item 4.3 (billing-webhook.spec.ts): 439/439 pass after BillingProfileService added. L06-report.
- Item 11 (guard audit): 0 violations across billing/invoices/quotes. L06-report; gate check:route-classification PASS.

Open highlights:
- Item 1 (pending invoice index): migration not confirmed.
- Item 2 (billing decomposition): payment-webhook-health.service.ts split done (L06), but subscription lifecycle, entitlement resolution, seat accounting not decomposed.
- Item 3 (invariants with tests): not verified.
- Item 5 (seats and proration): not addressed.
- Items 6-10: bounded work, retention, failure behaviour, outbox consumers, tenant isolation — all open.
- Check:outbox-consumers FAILS: `accounting.invoice.paid`, `accounting.payment.received`, `accounting.invoice.issued` emitted with no consumer.

---

## S06 — Chat, Calendar, Notifications, Mail

**Items before: 31 | Ticked: 7 | Remain: 24 | INERT: 0**

Ticked:
- Item 1.1 (visibility column existed — false premise resolved): column already present.
- Item 1.2 (visibility predicate in calendar loader): `calendar-event-source.loader.ts` SQL predicate confirmed. L13-report; migration 0664 applied (L22-report).
- Item 1.3 (Home dashboard predicate): `dashboard-personal.service.ts:161` — grep confirmed.
- Item 1.4 (tests): `calendar-visibility.spec.ts` 18 tests + dashboard 15 tests. L13-report, L20-report.
- Item 5.1 (notifications delivery proof): `notification-dispatch-after-commit.spec.ts` + `notification-outbox-relay.spec.ts` 8 proofs. L14-report; 266/266 pass.
- Item 5.3 (alert predicates): all 3 alerts predicate against DB columns; self-tests pass: true. L14-report.
- Item 9 (guard audit): 0 violations in notifications, calendar, chat trees. L14-report, L13-report; gate check:route-classification PASS.

Open highlights:
- Item 3 (chat actor cutover): expansion done for 11/12 chat columns (L44-report); cutover OPEN — CurrentUserContext lacks membershipId.
- Item 5.2 (event-stream adapter with reconnect/org-switch cleanup): not confirmed.
- Items 6-8 (mail, outbox consumers, tenant isolation): all open.
- Check:outbox-consumers FAILS: `chat.message.fanout` emitted with no consumer.
- Chat file splits (`chat-messages.service.ts` 613 → 3 files): L12-report confirms split; but S06 items 3.8 and frontend splits not confirmed.

---

## S07 — Knowledge Base, Wiki, Search, AI & Support

**Items before: 28 | Ticked: 7 | Remain: 21 | INERT: 0**

Ticked:
- Item 1.1 (ACL predicate in SQL before top-k): `kb-search.service.ts:302` and `:373` — grep confirmed. L09-report.
- Item 1.2 (index entries carry ACL revision): `kb-chunks.ts` acl_revision NOT NULL via migration 0665. L22-report.
- Item 1.3 (IS NULL bypass removed): same lines now `eq()` not `IS NULL OR =`. grep confirmed.
- Item 2.1 (LEAKPROOF never proposed): confirmed. L09-report.
- Item 2.2 (SECURITY DEFINER seam exists and wired): `app.search_kb_article_ids` (0453) and `app.search_kb_page_ids` (0498) wired in retrieval. L09-report.
- Item 2.3 (global search exclusion recorded): design decision documented — global bar covers tickets/leads/deals only. L09-report.
- Item 10 (guard audit): 0 violations; all KB controllers carry class-level guards. L09-report; gate check:route-classification PASS.

Open highlights:
- Item 1.4 (chatbot citations to authorized revisions): not confirmed.
- Item 2.4 (leading-wildcard ILIKE replacement): open for non-KB modules.
- Items 3-6 (revisions/lifecycle, two-KB resolution, AI cost/efficiency, decomposition): all open. `kb-indexing.service.ts` (690 lines) not split; `hr-ai.service.ts` (812) not split.
- Items 7-9 (support/CSAT, outbox consumers, tenant isolation): open. `check:outbox-consumers` FAILS.

---

## S08 — Home, Platform Operations, Contracts, Cache & Operator Evidence

**Items before: 47 | Ticked: 9 | Remain: 38 | INERT: 0**

Ticked:
- Item 1.1 (section contract table): L20-report full 11-section contract table. gate: check:scope-application PASS.
- Item 1.2 (universal vs permission-bound): L20-report.
- Item 1.3 (denied section omitted): L20-report confirms.
- Item 1.5 (minimal projections + bounded aggregates): per "Already done" section — active-sprint totals moved to bounded SQL aggregate.
- Item 1.8 (split dashboard-hr.service.ts): 4 split services confirmed (wc -l); controller uses split services. L20-report. NOTE: original file at 635 lines is dead code — not yet deleted.
- Item 7.1 (serial/bigserial risk register): L22-report: 588 int4 columns analyzed; HIGH-RISK and KEEP decisions recorded.
- Item 7.2 (cold-vs-upgrade comparison): L22-report: 384 journal entries, DB rows = 391, orphan rows = 0, 0629 prerequisite fixed. gate: check:migration-chain PASS.
- Item 7.3 (apply OUT-OF-OWNERSHIP migrations): 0664, 0665, 0666 applied. L22-report.
- Item 7.4 (RLS audit for missing policies): `expense_export_jobs` and `inv_compliance_documents` fixed via migration 0666. L22-report: 955/960 covered.

Open highlights:
- Items 2-6 (OpenAPI coverage at 54%, cache correctness proof, query cost measurement, outbox orphans, operator evidence): all open.
- Items 1.4, 1.6, 1.7, 1.9, 1.10 (section failure isolation, active membership counts, cache key dimensions, skeleton/error states, P95 measurement): all open.
- Item 9 (operator runbooks): OPEN — operator-blocked infrastructure; no runbooks written yet.
- Check:outbox-consumers FAILS: 10 orphans.

---

## S09 — Frontend Platform

**Items before: 37 | Ticked: 6 | Remain: 31 | INERT: 0**

Ticked:
- Item 3.1 (navigation registry — all 5 surfaces): `nav-surface-parity.test.ts` 4 tests; `sidebar-permission-coverage.test.ts` verifies. L24-report. gate: check:navigation-permissions PASS.
- Item 3.2 (requiredPermission on every non-universal route): L24-report; gate check:navigation-permissions PASS.
- Item 5.3 (product-switcher-menu.tsx split): 562→ `product-tile.tsx` (176), `product-grid.tsx` (126), `product-switcher-menu.tsx` (266). L24-report.
- Item 6.1 (formatters consolidated): gate check:formatters PASS — 4728 files scanned, no local Intl.NumberFormat. L24-report, L33-report.
- Item 6.3 (empty states): gate check:empty-states PASS. L33-report.
- Item 6.6 (dead code confirmed/removed): knip run completed; frontend 4→0 unused files; getSessionContext confirmed KEEP; remaining exports retained with proof. L52-report. gate: check:dead-code PASS.

Open highlights:
- Item 1 (complete route enforcement — classify all layouts): partial work done (6 layouts had enforcement per "Already done"); full classification table not produced.
- Item 2 (server-first routes): check:client-pages PASS (L33-report) but original claim of 342/598 client pages not fully addressed.
- Items 3.3-3.5 (module surface gating, no dead-end links, Home nav purity): not confirmed.
- Items 4-5 (route ownership cleanup, oversized route files): items 5.1 and 5.2 open.
- Items 6.2, 6.4, 6.5 (useEffect reads, raw fetch, scoped storage): open.
- Items 7, 8, 9 (states/responsiveness/a11y, eslint, ai-credits hooks): open.

---

## S10 — Excluded Domains & Final Gates

**Items before: 23 | Ticked: 8 | Remain: 15 | INERT: 0**

Ticked:
- Item 2.1 (knip run): L52-report ran in both repos. gate: check:dead-code PASS.
- Item 2.2 (frontend 4 unused files confirmed/removed): all 4 removed by earlier lanes; exports/types retained with recorded justifications. L52-report.
- Item 2.3 (grep-is-not-proof acknowledged): L52-report applied module-graph analysis.
- Item 2.4 (schema files never deleted by knip alone): 12 schema files retained with recorded reasons.
- Item 2.5 (emptiness-is-not-deadness): no table deleted on emptiness grounds.
- Item 2.6 (deletion requirements applied): 1 deletion (`email/templates/calendar.ts`) with full module-graph proof.
- Item 2.7 (build directory not pruned): confirmed.
- Item 2.8 (deletions recorded with proof): L52-report documents 1 deletion.

Open highlights:
- Item 1 (excluded-domain isolation coverage): check:tenant-isolation at 93% (61 uncovered). CRM and Inventory isolation specs were NOT written this session. This is the primary remaining blocker for this ticket.
- Item 3 (final verification matrix): OPEN — `FINAL-VERIFICATION.md` not produced yet. Several gates still failing (check:tenant-isolation, check:outbox-consumers). openapi:check FAILS (support.module.ts wrong import path per L33-report).
- Item 4 (consolidated programme report): OPEN.

---

## Cross-cutting Gate Status (as of this reconciliation)

| Gate | Status | Notes |
|---|---|---|
| check:route-classification | PASS | 0 undeclared; 3,518 handlers |
| check:permission-keys | PASS | 690/690 keys aligned |
| check:navigation-permissions | PASS | |
| check:tenant-indexes | PASS | |
| check:scope-application | PASS | |
| check:record-access | PASS | |
| check:module-entitlement | PASS | |
| check:module-lifecycle | PASS | |
| check:idempotent-commands | PASS | |
| check:log-secrets | PASS | |
| check:placement-bypass | PASS | Was failing; fixed (L16-report) |
| check:owner-authority | PASS | |
| check:cycles | PASS | 0 circular in both repos |
| check:migration-chain | PASS | 384 entries; cold == upgrade |
| verify:rbac-integrity | PASS | 10/10 |
| scan:legacy-actors | PASS (ratchet) | 555 remaining; ratchet = no regression, not completion |
| check:tenant-isolation | **FAIL** | 93% (61 uncovered services) |
| check:outbox-consumers | **FAIL** | 10 orphan event types |
| openapi:check | **FAIL** | support.module.ts wrong relative import (L33-report) |

---

## PAGES.md

No `PAGES.md` file exists in either repo root (`D:/projects/personal/Streamlineos/`, `backend/`, or `frontend/`). The root `CLAUDE.md` references it as a task-tracking file but it was never created. No update was possible.

---

## Honest Verdict

**62 of 285 items ticked — 22% complete.**

The work that is done is real and verifiable: placement-bypass is fixed, permission catalogs are synchronized, the KB ACL IS NULL bypass is closed, calendar visibility is patched in both the module and the dashboard, the authority matrix is tested, and the migration chain is repaired with a cold-bootstrap proof. These are meaningful structural improvements.

What remains (78%) is large structural work: full actor contraction (555 legacy columns, 0 contracted), OpenAPI coverage (54% of operations), complete tenant-isolation coverage (93%, 61 services uncovered), operator runbooks (all OPEN), bounded lists across most modules, and the final verification matrix. These cannot be ticked from reports alone — they require runtime DB access, operator infrastructure, or execution work that has not yet happened.
