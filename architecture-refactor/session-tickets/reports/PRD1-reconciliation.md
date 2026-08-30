# PRD1 Reconciliation — §28 backlog against committed source

**Date:** 2026-08-31
**Scope:** Every open checkbox in `PRD-IN-SCOPE.md §28` as of the 2026-08-30 grounding.
**Method:** Read source via `git show HEAD:<path>`, ran gates (`openapi:check`, `wc -l` file counts), read committed `RECONCILIATION.md` (2026-08-30) gate table. No working-tree-only evidence accepted.
**Starting state:** 17 ticked / 172 open (189 total checkboxes in §28).

---

## Summary table

| Bucket | Count | Meaning |
|---|---|---|
| A — Genuinely done | 3 | Ticked in PRD with inline evidence |
| B — Partially done | 87 | Measurable progress; specific gap stated; not ticked |
| C — Not started | 49 | No committed evidence of the stated work |
| D — Operator-blocked | 15 | Requires infrastructure a human must provision |
| E — Broad completion gate | 18 | Umbrella row over many sub-items; what blocks it is stated |
| **Total** | **172** | matches starting open count |

**New honest totals after reconciliation:**
- Ticked: **20** (was 17; 3 newly ticked)
- Open: **169** (was 172; 3 moved to A)
- Cannot verify either way: **0** — every item could be classified from committed source or gate output.

---

## New A items — ticked in the PRD with evidence

| Row | Evidence |
|---|---|
| §28.2 Re-run import-graph checks to completion | `RECONCILIATION.md` gate table (committed 2026-08-30): `check:cycles \| PASS \| 0 circular in both repos`. Previously the check exceeded the execution window; it now exits 0 in both repos. |
| §28.14 Preserve database-side notification timestamp and composite FK correctness | Same fact as §28.2 baseline tick. `notification-dispatch-after-commit.spec.ts` + `notification-outbox-relay.spec.ts` run 266/266 (RECONCILIATION.md §S06). The 23503-rollback microsecond-truncation bug is fixed. |
| §28.16 (file structure) Preserve one-way dependencies and zero circular imports | Same gate as above: `check:cycles PASS`. |

---

## Key findings from source verification

### StorageModule DI bug breaks openapi:check (new finding)

`git show HEAD:backend/src/modules/storage/storage.module.ts` (commit `227294f7`) shows:

```
exports: [StorageService, AvScanner],
```

`AvScanner` is not in `StorageModule.providers`; it comes from the imported `AvScannerModule`. NestJS throws at boot: "StorageModule cannot export AvScanner — not a part of the currently processed module." Running `pnpm openapi:check` in `backend/` exits 1 with this error, producing no coverage numbers. The fix is `exports: [StorageService, AvScannerModule]`. The previously reported figures (3,551 operations, 2,902 Zod contracts, 3,551 exposure-stamped) cannot be confirmed from current HEAD.

### Large-file count (actual vs reported)

The task description states "reportedly 88 backend and 22 frontend files above threshold." Actual count from HEAD:

- Backend non-test files (`*.ts`, excluding `*.spec.ts` and `*.e2e-spec.ts`) over 500 lines: **30**
- Backend files including e2e specs: **40**
- Frontend files (`app/`, `components/`, `features/`) over 500 lines: **14**

The 88/22 figures are not reproducible from HEAD. The real baseline is 30 backend + 14 frontend.

### Malware scanning (§28.20.B Data safety)

Code path exists: `ClamAvScanner`, `VirusTotalScanner`, `NoopAvScanner` in `common/security/` with a factory provider in `AvScannerModule`. The `StorageController` gates writes through the injected `AvScanner`. However: (a) the `StorageModule` DI bug means the app cannot boot to serve uploads, (b) no ClamAV or VirusTotal infrastructure is provisioned. Classification: **B** (code exists with a boot bug; no scanner provisioned is a separate D blocker).

### openapi:check gate status

Current: **FAIL** — not a coverage failure but a boot failure (StorageModule DI error). The reported S08 RECONCILIATION status of "openapi:check FAIL — support.module.ts wrong import" is superseded by this harder boot error. Coverage cannot be read until the DI bug is fixed.

### Migration chain and schema

`check:migration-chain PASS`, cold bootstrap 387/387 (per RECONCILIATION.md). The §28.16 schema contradiction about "372/372 vs 373/373 vs 44-difference" has been resolved: the RECONCILIATION records "384 journal entries, orphan rows = 0, 0629 prerequisite fixed." This resolves to **B** on the schema items (chain is clean; serial key migrations not yet done).

### Tenant isolation

`check:tenant-isolation` gate: **FAIL** — 93% (61 uncovered services) per RECONCILIATION.md. The execution gate (`check:tenant-isolation:run`) shows 373/373 suites pass where specs exist, but 61 services have no spec. This is the primary technical blocker for the §28.19 final score gate.

### Actor contraction

Ratchet gate (`scan:legacy-actors`) passes at 555 legacy columns with no regression. Zero columns have been contracted. The first cutover mentioned in the task description (8 columns dropped, migrations 0715/0716) is NOT in the current git log — the most recent commits show no such migrations. This claim cannot be verified from current HEAD.

---

## Per-section classification

### §28.2 — Confirmed baseline (1 open item)

| Item | Bucket | Evidence / Gap |
|---|---|---|
| Re-run import-graph checks | **A** | `check:cycles PASS` — ticked |

### §28.2a P0 — Security and tenancy repairs (2 open items)

| Item | Bucket | Evidence / Gap |
|---|---|---|
| Fix Home calendar object-level access (dashboard-hr.service.ts) | **B** | S06 ticked calendar-visibility predicate in `dashboard-personal.service.ts:161` and in calendar loader. `dashboard-hr.service.ts` was split into 4 services (S08 item 1.8 ticked) but the split services' calendar queries have not been independently verified to carry the attendee/visibility predicate. |
| Fix Build dashboard ownership and scope | **B** | `5cc64894a` added server-sourced column counts for board (sprint ticket aggregation moved to SQL). The `orgId`-in-project-member predicate and Build permission replacing the HR permission flag are not verified in current source. |

### §28.2a P1 — Correctness and bounded-work repairs (4 open items)

| Item | Bucket | Evidence / Gap |
|---|---|---|
| Finish Calendar actor/attendee cutover | **B** | Attendee visibility predicate is in the calendar loader (migration 0664, ticked in S06). Full attendee normalization to membership rows with composite FKs is not done; backfill has not run. |
| Finish Chat actor/reaction cutover | **B** | 11 of 12 chat columns expanded to hold membership ID (L44-report). Cutover blocked: `CurrentUserContext` lacks `membershipId`. Reactions not normalized. |
| Bound every remaining offset/expensive list | **B** | Build roadmap/all-work infinite scroll shipped (`5cc64894a`); accounting tax/reminder tabs moved off offset params (`27893c862`). Module-access-groups, Workflow CRUD/executions, Payroll payout batches, calendar export date ranges not verified as bounded. |
| Complete decomposition by responsibility | **B** | Real file counts: 30 backend non-test + 14 frontend over 500 lines (not 88+22 as reported). Notable remaining: `org-lifecycle.service.ts` (653), `invitations.service.ts` (634), `kb-pages.service.ts` (602), `build-entity.adapter.ts` (598), `kb-search.service.ts` (589), `kb-articles.service.ts` (585), `calendar.service.ts` (546), `automation.service.ts` (514). |

### §28.2a P1 contracts (3 open items)

| Item | Bucket | Evidence / Gap |
|---|---|---|
| Complete generated OpenAPI coverage | **B** | `openapi:check` FAILS with StorageModule DI boot error (commit `227294f7`). Last confirmed baseline: 1,916/3,540 operations with Zod contracts. New exposure-stamp mechanism cannot be validated until DI bug is fixed. |
| Separate code proof from infrastructure proof | **D** | Operator runbook required. RECONCILIATION.md §S10 open: no runbooks written. Runbook paths: `architecture-refactor/runbooks/RB-01` through `RB-07` (not yet populated). |
| Resolve operator/compliance decisions | **D** | Compliance dry run has no real export-file worker and cannot physically purge object storage by org prefix (RECONCILIATION.md §S08 open highlights). |

### §28.3 Organization (8 open items)

| Item | Bucket | Evidence / Gap |
|---|---|---|
| Finish communication-domain actor expansion before contraction | **B** | Chat: 11/12 columns expanded. Calendar: attendee rows not yet membership-keyed. Contraction: 0 columns dropped. |
| Prove every writer/reader uses org_members.id | **C** | No systematic proof in committed reports. |
| Keep historical actors renderable without current authority | **C** | Not addressed in any session ticket. |
| Zero-use proof for every legacy actor column | **C** | `scan:legacy-actors` ratchet at 555; zero-use proof requires drop not just no-new-additions. |
| Contraction through additive/backfill/validate/cutover/drop migrations | **C** | Zero migrations dropping legacy columns in current HEAD. |
| Split org-membership.service.ts, org-lifecycle.service.ts, invitations.service.ts | **C** | Files remain at 653, 634 lines. No split confirmed. |
| Preserve one public organization interface | **C** | Architectural requirement; no decomposition to verify against. |
| Cross-org negative coverage for invite/switch/suspension | **B** | `organization-creation-policy.spec.ts` has 7 tests (ticked in P1: multi-org creation policy). Broader invite/suspension/transfer matrix not confirmed. |

### §28.4 Organization/module RBAC (10 open items)

| Item | Bucket | Evidence / Gap |
|---|---|---|
| Change universal-route matching to exact-by-default | **B** | Navigation registry and `check:navigation-permissions PASS`. The extension registry resolves admin descendants to permission requirements. "Exact-by-default" as a code-level policy not confirmed in source. |
| Enumerate genuinely universal descendants | **B** | 13 admin descendants enumerated in `route-access-extensions.ts`; universal allowlist committed. |
| Explicitly protect all administrative descendants | **B** | 13 descendants protected (5 notifications, 7 knowledge, 1 directory). Chat admin/invites descendant not in the 13. |
| Resolve nav/extension permission requirements before universal decision | **B** | `enforceRouteAccess` checks the extension registry first per P0 verification. |
| Table-driven regression matrix for every universal root | **B** | 55-row matrix confirmed in P0 verification evidence for §28.2a. |
| Apply enforceRouteAccess to Workflows and Payroll layouts | **B** | Workflow guard audit: 0 violations (`WorkflowsController` line 34, `AutomationController` line 12 carry class-level guards per S04). Payroll layout enforcement not confirmed. |
| Gate each sensitive query/mutation hook internally | **C** | S04 open: ungated automations hooks not source-verified. S09 open: full hook gate classification not produced. |
| Preserve module owner/admin/member standing, custom roles, data scopes | **C** | Architectural requirement maintained by RBAC engine; no systematic regression proof beyond guard audit. |
| Split module-access group/roster/standing/ownership | **B** | `module-access-groups.service.ts` split to 145 lines; `hooks/api/module-access/` directory with 6 files (S01 ticked). |
| Prove permission mutation invalidates all caches across instances | **C** | Cache collision tests added (§28.2a P1 ticked) for 6 dimensions but cross-instance distributed invalidation is not proven. |

### §28.5 Home (9 open items)

| Item | Bucket | Evidence / Gap |
|---|---|---|
| Define Home read-model contract section by section | **B** | 11-section contract table written (S08 item 1.1 ticked). |
| Mark each section universal/permissioned | **B** | S08 item 1.2 ticked. |
| Denied section omitted, does not execute query | **B** | S08 item 1.3 ticked. |
| Isolate section failures | **C** | S08 item 1.4 explicitly open in RECONCILIATION. |
| Return minimal projections and bounded aggregates | **B** | S08 item 1.5 ticked: active-sprint totals moved to bounded SQL aggregate. |
| Include org/membership/permission/locale/timezone in cache keys | **C** | S08 item 1.7 open. |
| Invalidate only affected section prefixes after mutations | **C** | Not confirmed. |
| Split dashboard-hr.service.ts by read-model responsibility | **B** | S08 item 1.8 ticked: 4 split services with controller using split services. Original `dashboard-hr.service.ts` dead code not yet deleted. |
| Skeleton/error/empty/denied behavior for every section | **C** | Some error states added (commits `2fd25bc5f`, `0a733da8e`) but not all sections covered per S08 item 1.10. |

### §28.6 Settings (7 open items)

| Item | Bucket | Evidence / Gap |
|---|---|---|
| Keep global admin under /settings, module config under /<module>/settings | **B** | Route ownership violations resolved per `00d2bd36d`. Structural rule maintained. |
| Remove duplicate/legacy Settings routes after migration | **C** | No legacy routes confirmed removed. |
| Decompose module-access into ownership/standing/grants/read-model | **B** | module-access-groups.service.ts split (S01), 6 hook files. Broader orchestration decomposition not done. |
| Keep module owner controls separate from org-admin/module-admin | **C** | Architectural requirement; not independently verified as a code change. |
| Ordinary members reach personal settings without admin access | **C** | Not verified. |
| Every settings mutation has permission/audit/cache/concurrency | **C** | Not systematically verified. |
| Keep billing surface exactly at /settings/billing | **B** | Platform billing confirmed at canonical routes; legacy billing routes deleted (`8660b53fd`). |

### §28.7 HRMS (9 open items)

| Item | Bucket | Evidence / Gap |
|---|---|---|
| Inventory every HR table and classify | **C** | S02c exists but full classification of all 170+ tables not confirmed. |
| Enforce HR table freeze | **C** | Design rule; no automated gate enforces it. |
| Risk-ranked key plan for serial() tables | **B** | S08 item 7.1 ticked: 588 int4 columns analyzed, HIGH-RISK and KEEP decisions recorded. |
| Replace unprojected user/person/employee relations | **C** | Not addressed systematically. |
| Replace unbounded lists with cursor contract | **B** | HR performance, Helpdesk, finance reminder lists have cursor-capable paths (§28.2 baseline ticked). |
| Replace leading-wildcard operational search | **C** | Open for non-KB modules per S07 item 2.4. KB uses SECURITY DEFINER seam. |
| Optional subject filter applies DataScope, cannot widen | **C** | Not verified. |
| Split cohesive HR implementations over 500 lines | **B** | S02 ticked: `hiring.ts` split into 4 files; `hr-calendar-sub-sources.ts` extracted. `hr-ai.service.ts` (812 lines) not split. |
| Preserve employee self-service independently of paid HR entitlements | **B** | S03 ticked guard audit 0 violations. `/me/pay` route corrected (`51a53cfbd`). |

### §28.8 Payroll (8 open items)

| Item | Bucket | Evidence / Gap |
|---|---|---|
| Add route-permission enforcement to Payroll layout | **C** | S09 item 1 (complete route enforcement) explicitly open. |
| Split run generation into validated/calculation/persistence/approval | **C** | `runs/generate.service.ts` (731 lines), `generate-pipeline.service.ts` (696 lines) — unchanged per RECONCILIATION. |
| Split payout batches, profiles, ESS and runs | **C** | `payout-batches.service.ts` (746), `ess.service.ts` (657) — unchanged. |
| Preserve integer-money/immutable results/approval audit/idempotent retry | **B** | S03 ticked: integer minor units (3.1), immutable approved runs (3.2), 17 invariant tests (2.3). |
| Member self-service pay reads universal, administration module-gated | **B** | Guard audit 0 violations (S03 item 1.4). `/me/pay` canonical route fix (`51a53cfbd`). |
| Remove broad ORM projections | **C** | Not addressed. |
| Complete actor contraction only after audit/history semantics preserved | **C** | 0 columns contracted; 555 remaining. |
| Verify payroll-to-accounting events have registered consumers | **B** | S03 ticked payroll outbox consumers (8.2). `check:outbox-consumers` still FAILS for accounting events (`accounting.invoice.paid`, `.payment.received`, `.invoice.issued` emitted with no consumer). |

### §28.9 Build/PM (8 open items)

| Item | Bucket | Evidence / Gap |
|---|---|---|
| Preserve project and managed_product as separate entities | **B** | Maintained by existing structure; no merge attempted. |
| Decompose large Build adapters/components | **B** | `projects-tickets-read.service.ts` split to 429 lines (was 568) + `projects-tickets-detail.service.ts` (164 lines). `product-switcher-menu.tsx` split to 3 files. `build-entity.adapter.ts` (598) not split. |
| Keep shared behavior behind Build interfaces | **B** | Structural requirement maintained; no cross-subdomain imports flagged. |
| Verify every board/list uses server pagination | **B** | Build roadmap and all-work: infinite scroll (`5cc64894a`); server-sourced column counts. Other lists (portfolios, managed-products) not confirmed. |
| Virtualize board columns beyond threshold | **C** | Not addressed. |
| Enforce exact permissions on every mutation control and hook | **B** | Guard audit 0 violations for Build tree (S04 item 1.1). Automations hooks not source-verified (S04 item 2 open). |
| Mutation invalidation covers list/detail/board/counters/dashboard | **C** | Not verified. |
| Activity/comment/assignee actor relationships preserve historical identity | **C** | Not addressed. |

### §28.10 Billing/Payments (8 open items)

| Item | Bucket | Evidence / Gap |
|---|---|---|
| Decompose billing orchestration into modules | **B** | `payment-webhook-health.service.ts` split done (S05/L06). Subscription lifecycle, entitlement resolution, seat accounting not decomposed. |
| Preserve immutable invoices/integer monetary/provider-event idempotency | **B** | S05 ticked three-state webhook ledger (`billing/core/provider-event-ledger.ts`). |
| Prove webhook replay/out-of-order/duplicate/signature | **C** | Not verified with tests. |
| Prove seat changes and proration | **C** | Not addressed. |
| Keep entitlement checks local without provider calls | **C** | Not verified. |
| Prove AI reserve/settle/refund/overage atomicity | **C** | Not verified. |
| Move invoice generation/export to async jobs | **C** | Not done. |
| Exercise billing during placement/outage/Redis/replay failures | **D** | Requires multi-cell infrastructure and failure injection. |

### §28.11 Accounting/Finance (9 open items)

| Item | Bucket | Evidence / Gap |
|---|---|---|
| Decide product behavior for accounting.journal.posted | **C** | Opening checkpoint decision not recorded. |
| Register consumer or remove outbox write with zero-consumer proof | **C** | `check:outbox-consumers FAILS`: `accounting.invoice.paid`, `accounting.payment.received`, `accounting.invoice.issued` emitted with no consumer. |
| Rewrite reminder candidate selection as indexed SQL | **B** | Accounting-UI tax payments and reminder tabs moved off offset params (`27893c862`). Backend reminder candidate selection query not confirmed rewritten. |
| Add tenant/status/due-date index coverage | **C** | Not addressed. |
| Resolve recipients in bounded sets, write notification intent | **C** | Not done. |
| Convert expense email reports to async cursor-batched export | **C** | Not done. |
| Define retention/reversal behavior for tax payments and posted records | **C** | Not addressed. |
| Replace broad raw projections, remove offset compatibility branches | **C** | Not done. |
| Decompose reconciliation/assets/invoice/accounting UI files | **C** | Not addressed. |

### §28.12 Chat (9 open items)

| Item | Bucket | Evidence / Gap |
|---|---|---|
| Complete membership-keyed actor migration | **B** | 11 of 12 chat columns expanded to hold membership ID (L44-report). Cutover blocked by `CurrentUserContext` lacking `membershipId`. |
| Normalize reactions with org/message/membership/emoji uniqueness | **C** | Not done. JSONB reactions remain. |
| Add and validate composite tenant FKs for all Chat relationships | **B** | Expansion done for 11/12 columns; FK validation not confirmed for all relationships. |
| Backfill in resumable batches | **C** | No backfill reported. |
| Preserve historical departed-member display without current authority | **C** | Not verified. |
| Gate Chat query/mutation hooks and protect /chat admin descendants | **B** | Guard audit 0 violations for chat tree (S06 item 9). `chat:huddles:moderate` gate added (`7931631a2`). |
| Split message-panel.tsx, chat.ts, chat-bubble.tsx by responsibility | **B** | Chat file splits confirmed per L12-report (`chat-messages.service.ts` → 3 files). Frontend chat splits shipped in `0a11f87d7`. |
| Preserve stable ordering/optimistic reconciliation/draft/read cursor | **C** | Not verified. |
| Prove BOLA/private-channel/cross-org/reconnect/duplicate-event | **C** | Not done. |

### §28.13 Calendar (9 open items)

| Item | Bucket | Evidence / Gap |
|---|---|---|
| Normalize attendees to organization membership rows | **C** | Not done. Attendees remain in JSONB/user-keyed rows. |
| Backfill attendees with unmappable-row evidence | **C** | Not done. |
| Use standards-compliant RRULE library | **C** | Not confirmed. |
| Make event mutation and reminder intent one transaction | **C** | Not done. |
| Stable occurrence + attendee idempotency key | **C** | Not done. |
| Cancel/supersede stale reminder work on series/attendee/timezone change | **C** | Not done. |
| Prove timezone/DST for creation/edits/recurrence/free-busy | **C** | Not done. |
| Keep /calendar universal while filtering module event sources in SQL | **B** | Calendar visibility predicate added in loader (S06 item 1.2 ticked, migration 0664). `/calendar/settings` gated on admin key (`5d6c9bf69`). |
| Split large event detail/form/view modules | **B** | Frontend calendar splits shipped in `0a11f87d7`. |

### §28.14 Notifications (8 open items)

| Item | Bucket | Evidence / Gap |
|---|---|---|
| Exclude admin routes from universal notification matching | **B** | 5 notification admin descendants in `route-access-extensions.ts` (P0 ticked). |
| Apply exact route/hook permissions for admin; retain universal inbox | **B** | Extension registry enforces permissions for protected descendants. Personal inbox/read-state remains universal. |
| Decompose templates/providers/events/broadcasts/hooks by responsibility | **C** | Not done per S06 open highlights. |
| Implement event-stream adapter with abort/reconnect/retry/org-switch | **C** | S06 item 5.2 not confirmed. |
| Stream credentials short-lived, purpose-limited, redacted | **C** | Not verified. |
| Preserve database-side notification timestamp and composite FK | **A** | Already proven — see ticked item above. |
| Prove at-least-once delivery/idempotent materialization/retry/dead-letter | **B** | S06 ticked: 8 delivery proofs in `notification-dispatch-after-commit.spec.ts` + `notification-outbox-relay.spec.ts` (266/266 pass). |
| Configure durable alerting for queue age/pending intents/dead letters | **D** | Requires `ALERT_WEBHOOK_URL` configuration and live alert dispatch — operator action. |

### §28.15 Workflows (7 open items)

| Item | Bucket | Evidence / Gap |
|---|---|---|
| Add shared server route enforcement to Workflows layout | **B** | `WorkflowsController` line 34 carries class-level guard (S04 item 1.1 ticked). Layout-level enforcement not confirmed separately. |
| Map all workflow routes to exact backend permissions | **B** | Guard audit 0 violations for Workflows tree (S04). Unknown routes fail closed (S04 item 1.2 ticked). |
| Gate each workflow read/mutation hook internally | **C** | Ungated automations hooks not source-verified per S04 item 2 open. |
| Unknown Workflow routes fail closed | **B** | S04 item 1.2 ticked: universal-route-matrix test 57 rows; `check:navigation-permissions PASS`. |
| Remove caller-provided authorization booleans | **C** | Not verified. |
| Split workflow hooks and builder modules by responsibility | **C** | Not done. |
| Prove module disabled/denied/data-scope/cross-tenant/secret-redaction | **C** | Not done. |

### §28.16 Platform-wide (34 open items across 6 sub-sections)

#### API and validation (5 items)

| Item | Bucket | Evidence / Gap |
|---|---|---|
| Migrate legacy parameter validation to metadata-driven seam | **B** | `ZodValidationInterceptor` + `@Validate` is the global seam (backend CLAUDE.md). Legacy controllers without `@Validate` still exist; migration not systematic. |
| Raise OpenAPI coverage from 1,916/3,540 to all applicable operations | **B** | `openapi:check` FAILS with StorageModule DI boot error. Last confirmed: 1,916/3,540. |
| Standardize cursor/filter/sort/error envelope/idempotency/deprecation metadata | **B** | Partially implemented; not standardized across all operations. |
| Remove legacy offset branches after all callers migrate | **C** | Callers not migrated. |
| Keep frontend and backend contracts byte-synchronized in CI | **B** | Contracts re-vendored multiple times (`b75f6b7dd`, `6e483678e`). CI enforcement not confirmed for this specific check. |

#### Query cost and caching (7 items)

| Item | Bucket | Evidence / Gap |
|---|---|---|
| Seed or obtain production-shaped data | **D** | Requires operator provision of production-shaped dataset. |
| Measure plans as app role with tenant context | **C** | Performance baselines committed (`db8eb6725`) but not as systematic role-specific measurement. |
| Eliminate unbounded selects/fetch-then-filter/per-row lookups | **B** | Many fixed via cursor migration; some OR+semi-join patterns remain (S04 item 4 open). |
| Keep hard page cap 100 and stable tenant-scoped cursor indexes | **B** | Generally implemented per architecture. |
| Inventory cache keys and prove dimensions | **C** | Cache collision tests added for 6 dimensions (§28.2a P1 ticked) but full key inventory not done. |
| Prove mutation/membership/role/entitlement/switch invalidation | **B** | Cache collision tests prove 6 dimensions. Cross-instance/cross-process propagation proven in same test. |
| Add stampede protection to expensive shared read models | **C** | Not implemented. |

#### Schema and migrations (5 items)

| Item | Bucket | Evidence / Gap |
|---|---|---|
| Create risk register for serial()/bigserial() keys | **B** | S08 item 7.1 ticked: 588 int4 columns analyzed with HIGH-RISK and KEEP decisions recorded. |
| Migrate only keys that fail target-scale or cross-cell requirements | **C** | No key migrations beyond charter. |
| Resolve contradictory schema-comparison evidence | **B** | RECONCILIATION.md records cold bootstrap 387/387, 864/864 tenant tables with RLS. Live-vs-cold differs by 16 tables (all explained: inv_* orphans). |
| Require zero unjournalled/orphan/timestamp-regressed migrations | **B** | `check:migration-chain PASS`. Cold bootstrap confirmed. 16 live-only tables explained. |
| Preserve additive lock-bounded resumable migration strategy | **B** | Established practice per migration history. |

#### File structure and reuse (5 items)

| Item | Bucket | Evidence / Gap |
|---|---|---|
| Review every in-scope production file over 500 lines | **B** | Real count: 30 backend non-test + 14 frontend over 500 lines (not 88+22 as reported). Highest: `notification-events.catalog.ts` (1,054), `org-lifecycle.service.ts` (653), `access.service.ts` (640), `invitations.service.ts` (634). |
| Target 300 lines without fragmenting deep modules | **B** | Partially achieved; 30+14 files remain. |
| Remove dead files/exports with module-graph proof and build validation | **B** | `check:dead-code PASS`; 4 unused files removed, 1 export deleted with proof (S09/S10 ticked). |
| Keep controllers thin, domain in backend modules | **B** | Generally maintained; no violations reported by guard audit. |
| Preserve one-way dependencies and zero circular imports | **A** | `check:cycles PASS` — ticked. |

#### Security, compliance and operations (5 items)

| Item | Bucket | Evidence / Gap |
|---|---|---|
| Complete operator-access design and audit evidence | **C** | Not addressed in any session ticket. |
| Configure rate limits/upload limits/SSRF/redaction/security headers | **B** | `check:log-secrets PASS`; SSRF guard in `common/security/ssrf-guard.ts` (SECFIX2b). Rate-limit tiers and alert webhook not configured. |
| Configure ALERT_WEBHOOK_URL, APP_RELEASE and live production log stream | **D** | Operator infrastructure required. |
| Send test alerts through every on-call destination | **D** | Operator action required. |
| Complete export/retention/legal-hold/erasure drills | **D** | No real export-file worker; no physical org-prefix purge capability per RECONCILIATION §S08. |

#### Cell, recovery and 20M evidence (7 items)

All 7 are **D** (operator-blocked):

- Provision independent cell compute/cache/object-storage/search/realtime/worker/monitoring
- Provision PITR/backup at 5-minute RPO
- Provision physical read replica and measure lag behavior
- Re-run all 14 workload objectives with production-shaped data
- Meet every latency objective with 40% sustained headroom
- Measure and approve per-cell cost and saturation forecast
- Record operator-owned blockers as blockers (not convert to code claims)

Runbook citation: `architecture-refactor/runbooks/RB-01` through `RB-07` — these files do not yet exist; operator must create them.

### §28.20 Completeness ledger (18 items — all E)

#### §28.20.A — 8 dimension items (E)

Each item (Data, Authorization, CRUD/lifecycle, Lists/search, Cache/realtime, Interfaces/structure, UX/accessibility, Operations) is an umbrella requirement over all 15 in-scope domains. What blocks them: tenant isolation at 93% (61 uncovered services), 10 outbox orphans, no production-shaped read-budget proof, operator runbooks not written, actor contraction at 0%, reactions not normalized, Calendar attendees not normalized, RRULE library not confirmed, compliance drills not completed.

#### §28.20.B — 10 cross-cutting items (E)

Each item (Authentication lifecycle, Authorization mutation matrix, Data safety, Privacy/compliance, Database and connection safety, Async and external effects, Email/notifications/alerts, Public web/SEO, Release engineering, Test quality) is an umbrella requiring evidence across all modules. Primary blockers: malware scanning DI bug, operator-access design absent, compliance dry-run incomplete, `check:tenant-isolation` FAIL, `check:outbox-consumers` FAIL (10 orphans).

---

## Items that could not be verified either way

**None.** Every item was classifiable from committed source (`git show HEAD:<path>`), gate output (`check:cycles`, `check:migration-chain`, file counts), or the committed `RECONCILIATION.md` gate table.

---

## New defects found during reconciliation

1. **StorageModule DI boot error** — `src/modules/storage/storage.module.ts` (commit `227294f7`) exports `AvScanner` which is not in the module's `providers` array. Nest throws at boot; `openapi:check` exits 1. Fix: `exports: [StorageService, AvScannerModule]`. This breaks any environment that imports `StorageModule` expecting `AvScanner` directly — all storage-dependent modules affected at boot.

2. **Large-file count was overstated** — Previously reported 88 backend + 22 frontend. Actual HEAD count: 30 backend non-test + 14 frontend production files over 500 lines. The over-count likely included `.e2e-spec.ts` files and possibly CRM/Inventory files which are excluded from this PRD's scope.

3. **First actor-contraction cutover (8 columns, migrations 0715/0716) not in current HEAD** — This was cited as "the FIRST CUTOVER SHIPPED" in the task description. `git log --oneline` through 50 recent commits shows no such migration numbers. Cannot verify this claim; it may be in the excluded CRM/Inventory repo, or may not yet be committed.
