# 07 — Schema and code-key inventory: verdicts for ticket 08

Session S2 · 2026-09-02 · inventory-and-verdict only, **no source file was changed**.

BE = `/Users/tarunchintakunta/Personal/streamline/streamlineos-backend`
FE = `/Users/tarunchintakunta/Personal/streamline/streamlineos-frontend/frontend`

---

## 0. Scanner validation — read this before trusting any number below

The ticket requires validating the reference scanner against an independently confirmed
table before its output is used. Both traps it names were live, and one of them **fired**.

**Validation anchor: `inv_stock_levels` / `invStockLevels`.**
Confirmed independently first, by grep, before the scanner was written:
249 matching lines across 12+ named service files (`inv-warehouses.service.ts`,
`quality-holds.service.ts`, `so-core.service.ts`, `inv-replenishment.service.ts`, …) plus
18 raw-SQL name references. The scanner then reported it as
`symRuntime=261, symRuntimeFiles=23, nameRuntime=18` — consistent (the scanner counts
token occurrences, grep counts lines), and `referenced: true`. The scan classifies
**870 of 895** tables as referenced, i.e. it does not report everything as dead.

**Trap 1 fired — a whole declaration form was invisible.** The first scan found 812 tables.
It was wrong. `BE/src/db/schema/build/namespaces.ts` declares two Postgres schemas
(`pgSchema("build")`, `pgSchema("build_events")`) and **83 tables are declared as
`build.table("…")` / `buildEvents.table("…")`, not `pgTable("…")`.** A `pgTable(`-only
pattern silently omitted the entire Build module — `bugs`, `projects`, `test_cases`,
`feedbucket_submissions` and 79 more. It was caught only because a cross-check against
`pg_catalog` said the `bugs` table did not exist in the `public` schema. **Corrected total:
895 tables.** Any inventory ticket 08 regenerates must match both forms.

**Trap 2 fired — comment-prefixed columns were dropped.** The column splitter discarded any
entry preceded by a `//` comment, which silently removed **200 columns**, including every
`.primaryKey()` on a commented line. That produced a false "2 tables have no primary key"
finding (`notification_deliveries`, `notification_queue`) — both in fact have
`bigint().primaryKey().generatedAlwaysAsIdentity()`. After the fix: **0 tables lack a
primary key.** A verdict table built on the pre-fix scan would have proposed adding
primary keys that already exist.

**Trap 3 — "emptiness is not deadness" — confirmed and honoured.** The bootstrapped
database has 5 non-empty tables out of 1,026. Row counts were used for **nothing**. A
guard-script corpus was also separated from business code: `src/scripts/*.mjs` (notably
`check-hr-table-freeze.mjs`, whose own docstring says the SQL-managed tables' unimported
state "is by design, not a signal to delete them") was counting as a live reference and
concealing 21 tables. They are still KEEP — but for the documented reason, not a fake one.

**Sources of evidence.** Drizzle declarations parsed with a brace/paren-matching parser
(not line regex); live `pg_catalog` read read-only from `scratch_boot_c`, a full
637/637 bootstrap (1,026 tables, 5,067 indexes, 12,903 constraints). Registry inventories
were extracted by *executing* the catalogs (esbuild bundle → Node), not by regex, so
generated keys such as the `*:access:*` family are materialised rather than missed.

---

## 1. Inventory totals

### Database objects (Drizzle declarations + live `pg_catalog`)

| Object | Declared in Drizzle | Live in DB | Note |
|---|---:|---:|---|
| Tables | 895 | 1,026 | `public` 943 + `build` 80 + `build_events` 3 |
| Columns | 10,892 | 12,569 (public) | |
| Indexes | 3,815 decls | 5,067 | |
| Foreign keys | 1,469 inline + 949 composite | 2,847 | |
| Unique constraints / indexes | 730 + 412 | 878 | |
| Check constraints | 166 | 302 | |
| Primary keys | 895 | 1,026 | 0 tables without one |
| Enum types | 421 | 489 | |
| JSONB columns | 402 | 457 | |
| RLS-enabled tables | — | 882 / 943 public | 883 policies |

### Code-key registries

| Registry | Location | Entries |
|---|---|---:|
| BE permission catalog | `BE/src/modules/rbac/permissions/` | 698 |
| FE permission value catalog | `FE/lib/rbac/permissions/` (`PERMISSIONS`) | 485 |
| FE `PermissionKey` type union | `permission-key-{foundation,business,extended}.ts` | 696 |
| Module manifest | `BE/module-manifest.json` = `FE/lib/module-manifest.json` | 22 |
| BE HTTP routes | 544 controller files | 3,615 |
| OpenAPI operations | `BE/openapi.json` | 3,613 |
| API contract registry | `BE/contracts/api-contract-registry.json` | 3,625 |
| FE page routes | `FE/app/**/page.tsx` | 600 |
| FE query-key namespaces | `FE/lib/query-keys/` | 133 (1,069 leaf keys) |
| BE cache key builders | `BE/src/common/cache/cache-keys.ts` | 133 |
| BE cache invalidation matrix | `cache-invalidation-*.ts` | 139 |
| Outbox domain events | `BE/src/common/outbox/` | 23 emitted / 27 handled |
| Notification event catalog | `notification-events*.catalog.ts` | 132 |
| Workflow definitions | `workflow-registry.ts` | 5 |
| Queue subjects | `slo-queues.ts` | 18 |
| BE env schema | `BE/src/config/env.validation.ts` | 106 |
| FE env schema | `FE/lib/env.ts` | 8 |
| Org feature flags | `organizations.settings.features` JSONB | 6 |
| Translations | — | **no i18n system exists** |

---

## 2. Machine-readable verdict table

Columns: `ID | REGISTRY | ITEM | N | VERDICT | OWNER | FAILURE PREVENTED (KEEP) or DEFECT FIXED (REFACTOR/REMOVE) | EVIDENCE`.
Owner names are **areas**, not individuals — this repo has no CODEOWNERS mapping.
Rows marked `REMOVE` are safe to execute; rows marked `REFACTOR` need the named decision first.

| ID | REGISTRY | ITEM | N | VERDICT | OWNER | FAILURE PREVENTED / DEFECT FIXED | EVIDENCE |
|---|---|---|---:|---|---|---|---|
| S01 | schema | Tenant-anchor uniques `unique(org_id, id)` | 554 | **KEEP** | DB/Platform | Target of 880 composite FKs that pin a child to its parent's tenant. Dropping one lets a child row reference a parent in another org. Tenant isolation. | `analyze.mjs` tenantAnchorUniques |
| S02 | schema | RLS policies on public tables | 883 | **KEEP** | Security | Sole database-level defence against cross-tenant read when a query omits its org filter. Tenant isolation. | `pg_policies` |
| S03 | schema | `public` tables with `org_id` but **no RLS** | 16 | **REFACTOR** | Inventory + Security | Cross-tenant read on `inv_landed_cost_*`, `inv_putaway_task*`, `inv_inspection_plan*`, `inv_demand_forecasts`, `inv_grn_line_serials`, `inv_channel_*`, `inv_customer_shelf_life_rules`, `inv_audit_export_jobs`, `inv_ai_feedback`, `inv_allocation_overrides`, `inv_proposal_overrides`. All 16 are also undeclared in Drizzle (row S07) — same root cause. | `pg_class.relrowsecurity` |
| S04 | schema | Primary keys | 895 | **KEEP** | DB/Platform | Row identity, replication identity. Zero missing. | parser (post-fix) |
| S05 | schema | Check constraints | 166 decl / 302 live | **KEEP** | DB/Platform | Domain invariants (non-empty `btrim(...) <> ''`, status/amount ranges). No duplicates or subsumed pairs found. | `analyze.mjs` |
| S06 | schema | Drizzle tables never created in the DB (`hrms-phase1-sql-managed`) | 23 | **KEEP** | HR platform | Deliberate: managed by raw SQL in a pending migration root, kept out of the runtime barrel so Drizzle never emits DDL. Protected by `migration-integrity.spec.ts` and `check:hr-table-freeze`. **knip and any import scan report these as unused — being unimported IS the design.** | `FEROOT/CLAUDE.md` §10; `check-hr-table-freeze.mjs` |
| S07 | schema | Live tables **undeclared in Drizzle**, non-partition | 105 | **REFACTOR** | Accounting rewrite / CRM / Inventory / WMS | Migration-ahead-of-code drift: `gl_*` (14), `ap_*`/`ar_*` (9), `tax_*` (4), `bank_*` (4), `crm_commission_*` (6), `crm_call_*`/`crm_outbound_*`/`crm_report_*` (10), `customer_health_*`/`customer_lifecycle*` (5), `inv_*` WMS/landed-cost/ASN/dock/slotting (~35), `relationship_*` (3), `career_*`/`learning_paths` (4), others. Journalled migrations created them; **no service on this branch reads any of them.** Schema surface nobody can exercise, no RLS, no typed access. **Not dead** — this is the accounting/CRM/inventory rewrite landing in two steps. Verdict is *reconcile or schedule*, never blind drop. | `db-only-tables.txt`; `gl_accounts` has 0 refs in `BE/src` |
| S08 | schema | `notifications` partition children | 49 | **KEEP** | Notifications | Partitions of a partitioned parent. **Never named in code** — a name-based reference scan reports all 49 as dead. Dropping one silently loses a month of notifications. | `pg_inherits`, `relkind='p'` |
| S09 | schema | Tables with zero business-code references, protected by design | 21 | **KEEP** | HR platform | The `hrms-phase1` set plus `hr_employment_custom_field_values` and `managed_product_releases`. Referenced only by `check-hr-table-freeze.mjs`. See S06. | `refscan.mjs` guardOnly bucket |
| S10 | schema | `inv_barcodes` | 1 | **REFACTOR** | Inventory | Superseded storage design. The live `InvBarcodeService` resolves codes against `inv_products.barcode` / `inv_product_variants.barcode` / `sku` / lot / serial / location code — never this table. `inv_barcodes` is the *better* design (multi-barcode per product, `barcode_type` enum); the column design is the limited one. Decide which survives; do not drop by default. | `inv-barcode.service.ts:22-47`; 0 refs |
| S11 | schema | `platform_subscriptions` | 1 | **REFACTOR** | Billing | Parallel to the live `subscriptions` table (144 refs) that `PlanLimitsService` actually resolves entitlements from. Its sibling `platform_payments` IS live (`platform-analytics.service.ts:80`), so the pair is half-wired. Two subscription tables is a correctness hazard for revenue reporting. | 0 refs; `payment-providers.ts:15` comment |
| S12 | schema | `inv_reason_codes`, `inv_product_uom_conversions` | 2 | **REFACTOR** | Inventory | Zero business references. `inv_product_uom_conversions` has a `relations()` declaration and an FK to `inv_uom` (which IS live), so it is a designed-but-unwired feature, not litter. Unseeded feature — classify with the S07 batch. | `refscan.json` |
| S13 | schema | `hr_employment_custom_field_values` vs `hr_employments.custom_field_values` | 2 designs | **REFACTOR** | HR platform | Two live custom-field storage designs behind one `custom_field_definitions` registry: HR uses the JSONB column (`@>` / `?` filters, GIN `jsonb_path_ops` indexed — correct), Support uses the normalized table. The normalized **HR** table is written by nothing. Pick one shape per entity or the two diverge silently. | `hr-custom-fields.service.ts:240,257`; `support-custom-fields.service.ts` |
| S14 | schema | Exact-duplicate indexes | 47 | **REMOVE** | DB/Platform | Two identical indexes on the same columns: double write amplification, double bloat, double VACUUM cost, zero read benefit. Selection rule applied: a constraint-backing index is never dropped, and a UNIQUE is never dropped in favour of a non-unique. Full list §3.1. Executed by `0999`/`1003`; 35 measurable drops re-measured against four tenants in §4 — 28 confirmed free. | `pg_indexes`; EXPLAIN §4.2 |
| S15 | schema | Prefix-redundant indexes | 299 | **REMOVE** | DB/Platform | Index whose column list is a strict leading prefix of a wider index with the same access method and no `WHERE`; Postgres serves the narrow case from the wide index. 178 are covered by a UNIQUE index that cannot be dropped anyway. Full list §3.2. **Prefix containment proves reachability, not cost** — §4.3 measures six `(org_id)` drops that cost 6.5x-21.5x buffers on the majority tenant because the surviving wider index is physically larger than the heap. | `pg_indexes`; EXPLAIN §4.3 |
| S16 | schema | `ON DELETE CASCADE` FK → `organizations.id` with **no leading index** | 151 | **REFACTOR** | DB/Platform | `cron-org-purge-worker.service.ts:236` hard-deletes an organization inside one transaction. Each of these 151 child tables is then sequentially scanned while holding locks. This is a live production worker, not a hypothetical. Add the index; do not remove the FK. | `fk-no-index.json`; purge worker |
| S17 | schema | FK → `users.id` with no index (mostly `created_by`/`approved_by`) | 359 | **KEEP (defer)** | DB/Platform | Referential integrity — must not be removed. Indexing is low priority: no production path hard-deletes a `users` row (only scripts and e2e teardown). Revisit if user erasure ships. | `fk-no-index.json` |
| S18 | schema | Overlapping FK pairs (inline single-column + composite covering the same column to the same parent) | **172** (was 5) | **REFACTOR** | DB/Platform | Two constraints enforce the same reference: duplicate validation work and two locks per write. The composite (tenant-safe) one is the keeper. Re-derived at head: `0985`/`0986`/`0995` added composite tenant FKs beside the narrow ones without removing them, so the count grew from 5 to 172 (25 on non-empty tables). Measured in §4.4: 2,000 redundant FK trigger invocations per 1,000 inserts on `inv_stock_transactions`. | `pg_constraint` re-derived on `scratch_perf_seed`; EXPLAIN(ANALYZE) §4.4 |
| S19 | schema | JSONB columns | 402 decl / 457 live | **KEEP** | per module | Legitimate opaque payload for the majority. `metadata` alone appears on 91 tables. | parser |
| S20 | schema | JSONB properties **filtered in SQL but not indexed** | 5 | **REFACTOR** | Org / Surveys / Support / CRM | Only 2 jsonb-aware indexes exist in the whole database. Unindexed filtered paths: `org_units.metadata->>'address'` and `->>'email'` (ILIKE search), `survey_response_sessions.metadata->>'liveSessionId'` (equality WHERE, twice — this is a join key and belongs in a column), `support_ai_suggestions.payload->>'escalated'` (aggregate filter), `business_parties.social_profiles->>'twitter'` (projected, and named in `record-layout-catalog.ts:169` — a *documented* access path). Normalize `liveSessionId`; index the rest. | §5 |
| S21 | schema | JSONB properties correctly indexed | 2 | **KEEP** | Audit / HR | `idx_audit_logs_org_module_created` (expression index on `metadata->>'moduleKey'`, used by `module-access.service.ts:309`) and `idx_hr_employments_custom_field_values_gin` (`jsonb_path_ops`). These are the pattern the S20 rows should follow. | `pg_indexes` |
| S22 | schema | JSONB columns with no `$type<>` | 229 / 402 | **REFACTOR** | per module | Untyped `jsonb()` returns `unknown` at the use site, which is where `as any` gets introduced. Typing them is a compile-time gate, not a schema change. | parser |
| S23 | schema | Enum types with no column using them | 63 | **REMOVE** (50 conditional) | per module | 13 exist only in the DB and are declared nowhere — remove. The other 50 are declared in Drizzle for tables in the S07/S06 sets; they become removable only when S07 resolves. Cheap, but they distort every schema diff. | `pg_type` vs `pg_attribute` |
| S24 | schema | Drizzle-only enums `attendance_event_kind`, `attendance_event_source` | 2 | **KEEP** | HR platform | Belong to the S06 SQL-managed attendance tables that are not created in this bootstrap. | `enums-drizzle-only.txt` |

### Code-key registries

| ID | REGISTRY | ITEM | N | VERDICT | OWNER | FAILURE PREVENTED / DEFECT FIXED | EVIDENCE |
|---|---|---|---:|---|---|---|---|
| P01 | permissions | BE catalog keys enforced by a guard | 655 | **KEEP** | RBAC | Every one is the argument of a live `@RequirePermission` or a service-side gate. Removing one un-gates a route. 28 of them are built by template literal (`<module>:access:{view,manage}`) — **a grep-only inventory reports these as orphans and inflates the deletable set by 37 across both sides.** | `gated-keys-are-catalogued.spec.ts` |
| P02 | permissions | BE keys granted by a role template but never enforced | 26 | **REFACTOR** | RBAC | e.g. `reports:export`, `hr:payrolls:manage`, `hr:shifts:manage`. A role visibly grants an authority nothing checks — the UI implies a capability the API does not gate. Either wire the gate or retire the key. | `be-granted-not-enforced.txt` |
| P03 | permissions | BE keys neither enforced nor template-granted | 17 | **REMOVE** (after runtime check) | RBAC | `accounting:journal:post`, `accounting:receivables:approve`, `crm:deals:approve`, `hr:bank-details:view`, `hr:cases:confidential`, `hr:employees:delete`, `hr:payroll:publish`, … **Blocker before deletion:** `permission-catalog-sync.service.ts::classifyRetiredPermissions` only retires a key with no persisted grant in any tenant's DB. Run that classification against a real database first — a key granted in a customer's role must not vanish. | `be-neither-non-access.txt` |
| P04 | permissions | FE `PERMISSIONS` value catalog | 485 | **REMOVE** (consolidate) | Frontend RBAC | **It has no production consumer.** 31 files import from `@/lib/rbac/permissions`; 30 are `import type`. The only value import of `PERMISSIONS` is a test. The role editor fetches the catalog from the backend at `hooks/api/access.ts:87` (`GET /rbac/permissions`). Maintaining a 485-entry array that lags the backend by 213 keys is pure drift surface. Keep the `PermissionKey` union. | `hooks/api/access.ts:87` |
| P05 | permissions | FE `PermissionKey` type union | 696 | **KEEP** | Frontend RBAC | This is the real contract: it tracks the backend to within 2 keys and is what every `useCan` call is typed against. A key absent here cannot be written in TS. | `fe-union-keys.txt` |
| P06 | permissions | BE keys missing from the FE union | 2 | **REFACTOR** | Frontend RBAC | `feedbucket:access:manage`, `feedbucket:access:view` — cannot be referenced from the frontend at all. | `be-not-in-fe-union.txt` |
| P07 | permissions | FE-only phantom keys | 0 | — | — | Clean. A frontend-only key would fail `useCan` forever; there are none. | `fe-only.txt` (empty) |
| P08 | permissions | FE `ACCESS_MANAGED_MODULES` hardcoded array | 10 vs BE 14 | **REFACTOR** | Frontend RBAC | BE derives the list from `ladder: "delegable"` in `module-registry.ts`; FE hardcodes it and omits `feedbucket`, `workflows`, `blog`, `directory`. Consequence: 8 delegable access keys the frontend can never generate. The FE manifest already mirrors `ladder` correctly — the fix is derivation, not a longer literal. | `module-access.ts` both sides |
| P09 | permissions | Cross-repo catalog-sync guard tests | 4 files | **REFACTOR — P1** | Frontend RBAC | `catalog-sync.test.ts`, `authority-matrix.test.ts`, `owner-only-catalog-sync.test.ts`, `route-access-keys.test.ts` all resolve the backend at `<frontend-repo-root>/backend/…`, which **does not exist** in this sibling-repo layout. They fail or early-`return`. `catalog-sync.test.ts`'s own header says "It has been wrong twice… this is the guard against a third time" — this is the third time. `zz-probe3.test.ts` has the correct `backendRoot()` resolution to copy. | path resolution |
| P10 | modules | Module manifest, BE ↔ FE | 22 / 22 | **KEEP** | Platform | Byte-identical (md5 `30f5404240b43b55ca1d56fe18dff820`). Zero drift across all 12 fields. | md5 |
| P11 | modules | `check:module-manifest` gate | 1 | **REFACTOR — P1** | Frontend platform | The one gate that would catch BE↔FE manifest drift resolves the same non-existent `<frontend-root>/backend/` path, prints `rule-1 … SKIPPED` and exits 0 — and is not wired into any FE workflow. The manifests agree by hand, not by enforcement. | `check-module-manifest.mjs:7-15,404-411` |
| P12 | modules | Derived module-key lists | 6 lists | **REFACTOR** | Platform | One manifest, six derived lists that disagree: `feedbucket` is `planGated` and billable but absent from `ORG_MODULE_KEYS`, so org setup cannot enable it. `chat`/`kb` are enableable but not plan-gated. FE gates on `chat` (BE never enforces it); BE gates on `feedbucket` and `workflows` (FE never checks them) — a disabled module 403s instead of hiding. `workflows` is `planGated: false` yet `@RequireModule`d. | `module-vocabulary.ts`, `org.schemas.ts` |
| P13 | routes | BE routes | 3,615 | **KEEP** | per module | 0 duplicate `method+path` (guarded by `app-route-uniqueness.spec.ts`). Every path is a string literal — the extraction is complete. | `extract-routes.mjs` |
| P14 | routes | `openapi.json` vs decorators | 3,613 / 3,613 | **KEEP** | Platform | Exact match, 0 drift either direction. The PRD's "openapi is stale" assumption is false. | `openapi-drift.txt` (empty) |
| P15 | routes | OpenAPI operations with no `security` block | 3,544 / 3,613 | **REFACTOR** | Platform | `@ApiBearerAuth()` was applied to `/chat/**` only. The published spec implies 3,544 operations are anonymous. Documentation defect, not a runtime hole (global `JwtAuthGuard`). | `openapi-no-security-ops.txt` |
| P16 | routes | `@Public()` routes with no guard, no signature check, no rate limit | 36 | **REFACTOR — P1** | Security | Highest signal: `POST /support/inbound/{email,sms,whatsapp}/:orgId` accept unsigned inbound mail/SMS/WhatsApp keyed only on an org id in the path, and `PATCH /public/whiteboard-links/:token` is an unauthenticated **write**. Nothing to remove — add signature verification or rate limiting. | `backend-unauthenticated-routes.txt` |
| P17 | routes | Authenticated routes with no `@RequirePermission` | 160 | **KEEP** | RBAC | All 160 reconcile exactly against the contract registry as `universal` (100) + `in-service` (60). Deliberate, none accidental. | `contracts/api-contract-registry.json` |
| P18 | routes | Contract-registry entries with no route | 12 | **REMOVE** | Platform | `/product-management/workspaces*` (9), `/billing/razorpay` (3 within), `GET /whiteboards` — leftovers of the `product-management → build` and `whiteboards → build/whiteboards` renames. 0 routes are missing from the registry, so the fail-closed side is clean. | `contract-registry-drift.txt` |
| P19 | routes | FE page routes | 600 | **KEEP** | Frontend | 600 unique paths, 0 collisions. All 556 authenticated routes resolve to `permission` (528) or `universal` (28); **`unknown` = 0**, and the resolver fails closed to `/access-denied`. No unguarded surface. | `fe-entry.mjs` (production resolver) |
| P20 | routes | `UNIVERSAL_ROUTES` roots with no page on disk | 7 | **REMOVE** | Frontend RBAC | `/home`, `/announcements`, `/kb`, `/docs`, `/support/my`, `/referrals`, `/jobs`. They rotted undetected because the coverage tests phantom-check *extensions* and *descendants* but never *universal roots* — a universal entry pointing at nothing is a permanently-open hole waiting for a route to be created at that path. Keep `/access-denied` and `/access-suspended` (they exist, outside `(authenticated)`). | `universal-routes.ts` |
| P21 | routes | `PAGES.md` drift | 9 | **REFACTOR** | Frontend | 3 on disk and undocumented (`/blog/admin`, `/hr/dashboard`, `/inbox`); 6 documented and gone, of which 4 are intentional tombstones and `/projects`, `/projects/1`, `/waitlist` are rot. Its "Disk: 598" line is stale (600). | `pages-md-drift.txt` |
| P22 | query keys | FE query-key factory | 133 ns / 1,069 keys | **KEEP** | Frontend | Canonical, gated by `check:query-scope` in CI (`frontend.yml:47`), which fails the build on any inline `queryKey: [` outside `lib/query-keys/`. Re-running the gate's own regex over real source gives **0 violations**. Inline keys are a non-issue here. | `check-query-scope.mjs` |
| P23 | query keys | Off-registry satellite factories in `hooks/api/**` | 26 files | **REFACTOR** | Frontend | They build off `queryKeyBase` directly instead of registering. Three emit **sibling** prefixes of `["streamlineos","hr"]` — `hr-event-stream`, `hr-emergency`, `hr-accommodations` — so `invalidateQueries({queryKey: queryKeys.hr.all})` structurally cannot reach them. Stale HR data after a mutation. | agent scan |
| P24 | query keys | Divergent duplicate key space | 1 | **REFACTOR — P1** | Frontend | `queryKeys.hr.hrDisciplinary()` emits `[…,"hr","cases","disciplinary"]` while `hooks/api/hr/cases.ts:93` emits `[…,"hr","disciplinary"]`. Two key spaces for one dataset; invalidating either misses the other. 16 further prefixes are emitted from more than one file. | `human-resources.ts:318` vs `cases.ts:93` |
| P25 | query keys | Namespaces with zero references outside their factory | 9 | **REMOVE** | Frontend | `aiCrm`, `featureFlags`, `meetingsAi`, `platform`, `playbook`, `recurringInvoices`, `reports`, `salesAnalytics`, `supportAiSettings`. Zero in production *and* zero in tests. | agent scan |
| P26 | cache | BE `CACHE_KEYS` builders never called | 42 (21 referenced nowhere) | **REMOVE** | Backend platform | The live call sites pass string literals (`"org:members:list"`, `"invoices:list"`) instead of the builder. The matrix already documents one: `cache-invalidation-matrix.ts:135` — *"Factory never called in any service — this key family is dead code."* Two naming schemes for one cache is how the S-class stale-cache bugs below happen. | `cache-keys.ts` |
| P27 | cache | Cached-on-write with no reachable invalidation | 4 | **REFACTOR — P1** | HR / Inventory | (1) `hrHeadcountNamespace`: the read uses `cachedVersioned(...)` → counter `cache:namespace:hr:headcount:<org>:version`, the invalidator uses `invalidateNamespaceForOrg` → `cache:namespace:<org>:hr:headcount:version`. **Two different Redis counters** — HR headcount is stale after every hierarchy mutation. The guarding spec only asserts the mock was *called*, never the read site. (2)(3)(4) `invReorderReportPaged`, `invStockSummaryReport`, `invValuationReport` — the matrix claims invalidation "implicitly via inv:reorder parent", but `CacheService.invalidate` is `redis.del(exactKey)`; **there is no prefix mechanism, so no parent relationship exists.** Stale valuation/reorder/stock-summary after every stock movement. | `org-structure.service.ts:124`; `inv-reports.service.ts:102,151` |
| P28 | cache | `check:cache-invalidation` gate | 1 | **REFACTOR** | Backend platform | Covers only 10 tables and is **absent from `ci.yml`**, which wires ~27 other `check:*` gates. Same for `pnpm validate:env` and FE `check:module-manifest`. | `package.json:158`, `ci.yml` |
| P29 | cache | `CACHE_TTL` constants | 5 | **REFACTOR** | Backend platform | `VERY_LONG` = 1800s is **shorter** than `HOUR` = 3600s. A name that lies about ordering will be picked wrongly. Jitter is applied only on the `*ForOrg` paths. | `cache-keys.ts:250-256` |
| P30 | events | Outbox domain events | 23 emitted / 23 handled | **KEEP** | per module | Emitted-but-never-handled = 0. Healthy. | `extract-events.mjs` |
| P31 | events | Handled but never emitted | 3 | **REFACTOR** | Expenses / KB | `expense.submitted`, `expense.decided` — verify first: `expense-outbox-emitter.ts:43` emits a runtime variable `eventType`, so the consumers may be fed indirectly. `kb.content.delete` has no such escape hatch and no caller anywhere — that one is removable. | `expense-outbox.consumer.ts:42,157` |
| P32 | events | Notification catalog entries never wired | 40 | **REFACTOR** | Notifications | Whole subsystems declared and never emitted: payroll (5), recruitment (6), knowledge (5), sign (4), inventory (4), crm (4), security (2)… **Removal is user-visible:** all 132 are returned by `GET /notifications/admin/events` and render in the customer's notification-preferences table. Removing 40 rows changes a screen an admin has already configured. Wire or retire with a product decision. | `notification-catalog-orphans.txt` |
| P33 | events | Event keys produced but absent from the catalog | 12 | **REFACTOR — P1** | Build / Chat / CRM | `build.ticket.assigned`, `build.ticket.overdue`, `build.sprint.ending`, `chat.huddle.invite`, … Dispatch throws `BadRequestException: Unknown notification event` on the `/emit` path for these. A live gap, not cosmetic. | `event-catalog-drift.txt` |
| P34 | events | Customer webhook event names | 6 | **KEEP — published contract** | Integrations | `lead.created`, `lead.updated`, `deal.won`, `deal.lost`, `leave.approved`, `employee.hired` are dispatched to customer endpoints. The contract registry's `webhooks` block is `{}` and the subscription schema accepts freeform strings, so **renaming `deal.won` passes every check in the repo and silently breaks every subscriber.** Highest-risk gap in the event inventory. Do not touch; add a catalog. | `webhook.schemas.ts`; `deals.service.ts:384` |
| P35 | commands | Workflow `triggers` / `triggeredBy()` | 1 mechanism | **REFACTOR** | Workflows | `WorkflowRegistry.triggeredBy()` is called in the production relay hot loop (`workflow-outbox-relay.service.ts:94`) but **no registered definition sets `triggers`**, so it always returns `[]` and the inner loop never executes. Either the field is dead (remove it and the loop) or event-triggered workflows silently never fire. Resolve which — the two readings have opposite consequences. | `workflow.types.ts:56` |
| P36 | commands | Workflow node type `approval` | 1 | **REFACTOR** | Workflows | Declared in `WORKFLOW_NODE_TYPES`, accepted by the graph schema, no executor — a user can build and save a workflow containing it and it dies at run time with `UNIMPLEMENTED`. The other 9 have executors. | `workflow-node-executors.ts:130` |
| P37 | commands | Queue subjects | 18 | **KEEP** | Backend platform | Every entry's `sourceFile` resolves. 0 dead entries. No BullMQ — the queue is `outbox_events` drained by 67 `/cron/*` routes. | `queue-subjects.txt` |
| P38 | config | BE env schema | 106 | **KEEP** | Backend platform | 6 unconditionally required (boot dies without them), 4 more required in production, 3 defaulted, 97 optional. `.env.example` covers all 106, enforced by `env-coverage.spec.ts`. | `env.validation.ts` |
| P39 | config | BE declared-but-never-read env vars | 2 | **REMOVE** | Backend platform | `GOOGLE_GENERATIVE_AI_API_KEY` (notable: `AI_CHAT_PROVIDER` accepts `"google"`, so that provider has no credential path at all) and `RAZORPAY_KEY_ID` (its secret and webhook secret are both live). | grep across `BE/src` |
| P40 | config | BE env vars read but not declared | 7 | **REFACTOR** | Backend platform | `REDIS_COMMAND_TIMEOUT_MS`, `SHUTDOWN_SETTLING_DELAY_MS`, plus 5 read through `env[name]` indirection in `region.config.ts` (`CACHE_KEY_PREFIX`, `COMPLIANCE_ZONES`, `R2_KEY_PREFIX`, `SEARCH_API_KEY`, `TENANT_CLASSES`). Unvalidated boundary. The coverage spec cannot see them: `SOURCE_ROOTS` is only `["modules","common"]` and its regex is `process\.env\.NAME` literal-only. | `env-coverage.spec.ts:5` |
| P41 | config | FE env vars read but not declared | 11 | **REFACTOR — P1** | Frontend platform | 58% of the frontend's env surface is unvalidated, and **every `NEXT_PUBLIC_*` is in the unvalidated half** — those are inlined into the client bundle. Worse, `lib/env.ts` only throws in production and runs as a **side-effect import in `app/layout.tsx:6`**, so it fires on first root-layout render, not at build or boot. No FE `validate:env`, no test. | `lib/env.ts:39-41` |
| P42 | flags | Org feature flags | 6 | **REFACTOR** | AI / Settings | `aiSmartNotifications` and `aiWeeklyRecap` are **write-only**: an admin toggles them, the value persists, nothing on either side ever reads them — two dead knobs presented as working controls. All 6 default `true` and every consumer uses `flags?.X !== false`, so a query error reads as **fail-open**. All 6 live behind CRM settings even though `supportAi` gates Support. The registry is also duplicated verbatim in `settings.helpers.ts` and `org-features.service.ts`. | `settings.helpers.ts:16-33` |
| P43 | flags | `feature_flags` table | 1 table, 0 rows, 0 readers | **REMOVE** | Backend platform | A full LaunchDarkly-shaped registry (`type`, `rolloutPercentage`, `orgOverrides`, `owner`, `expiresAt`, 3 indexes, 2 relations), exported from the barrel, with **no service, controller, repository or read anywhere in `src`**. The `GET/PATCH /settings/feature-flags` endpoints named after it read `organizations.settings` instead. Its gate `check:feature-flag-governance` only regex-checks that `owner`/`expiresAt` are `.notNull()` — it passes green on a table with no rows and no readers, and never looks at the 6 flags that actually gate behaviour. **This is the one table where "empty" and "dead" genuinely coincide, and it is proven by reader absence, not by row count.** | `common/feature-flags.ts`; 0 refs |
| P44 | i18n | Translation system | 0 | **KEEP as-is (no action)** | Product | **There is no UI i18n system**: no `next-intl`/`i18next`/`react-intl`, no locale bundles, no `t()` call sites, `lang="en"` hardcoded at `app/layout.tsx:130`. User-facing strings are ~8,858 literal JSX attributes + 1,616 literal toast strings. "Unused translation keys" is therefore 0/N-A. `users.language` exists and is inert for the entire web UI. | package.json, grep |
| P45 | i18n | Email template locales | 4 locales / 68 templates | **REFACTOR** | Email | Only 2 of 68 templates declare `supportedLocales`; `_shared.ts:41` defaults the rest to `["en"]`, so **97% silently resolve to English** while the system presents itself as 4-locale. `AUTH_TEMPLATE_LOCALES` and `PAYSLIP_TEMPLATE_LOCALES` are two declarations of the same list. | `templates/_shared.ts:41` |
| P46 | i18n | `kb_article_translations`, `notification_templates.locale` | 2 | **KEEP** | KB / Notifications | Tenant-authored content and per-recipient template resolution — real features, English-seeded. Unrelated to UI i18n. | schema |

---

## 3. Executable removal lists

`table` is `schema.table`. Regenerate deterministically against any bootstrapped database with
the recipe in §7; do not hand-edit.

### 3.1 Exact-duplicate indexes — REMOVE (47)

Two indexes with an identical definition. Selection rules applied, in order: never drop a
constraint-backing index; never drop a `UNIQUE` in favour of a non-unique. Nine rows drop a
`UNIQUE` only because an equally-`UNIQUE` twin remains and enforces the same invariant.

```
table	drop	keep	definition
build.bugs	idx_bugs_org_assignee_membership	idx_bugs_assignee	USING btree (org_id, assignee_membership_id)
build.feedbucket_submissions	idx_feedbucket_submissions_org_assignee_membership	idx_feedbucket_submissions_assignee	USING btree (org_id, assignee_membership_id) WHERE (deleted_at IS NULL)
build.project_workspace_members	idx_project_workspace_members_org_membership	uniq_project_workspace_members_org_user	USING btree (org_id, membership_id)
build.projects	idx_projects_org_manager_membership	idx_projects_manager	USING btree (org_id, manager_membership_id)
public.affiliates	affiliates_code_idx	affiliates_referral_code_unique	USING btree (referral_code)
public.affiliates	affiliates_user_idx	affiliates_user_id_unique	USING btree (user_id)
public.billing_products	idx_billing_products_slug	billing_products_slug_key	USING btree (slug)
public.billing_profiles	billing_profiles_org_idx	billing_profiles_org_id_unique	USING btree (org_id)
public.blog_categories	idx_blog_categories_slug	blog_categories_slug_unique	USING btree (slug)
public.coupons	idx_coupons_code	coupons_code_unique	USING btree (code)
public.crm_import_rows	idx_crm_import_rows_import	uniq_crm_import_rows_line	USING btree (organization_id, crm_import_id, row_number)
public.custom_field_definitions	uniq_cfd_org_id	uniq_custom_field_definitions_org_id	USING btree (org_id, id)
public.data_quality_health_snapshots	idx_data_quality_health_snapshots_series	uniq_data_quality_health_snapshots_day	USING btree (organization_id, captured_on)
public.employee_salary_profiles	idx_employee_salary_profiles_org_user_effective	uniq_esp_org_user_effective_from	USING btree (org_id, user_id, effective_from)
public.feature_flags	uniq_feature_flags_key	feature_flags_key_unique	USING btree (key)
public.fin_payment_run_items	idx_fin_payment_run_items_org_run_status	idx_fin_payment_run_items_org_run	USING btree (org_id, run_id, status)
public.health_score_config	idx_health_score_config_org	health_score_config_org_id_unique	USING btree (org_id)
public.hr_case_notes	idx_s01_hr_a36b1c9397e2b19b	idx_hr_case_notes_org_author_membership	USING btree (org_id, author_membership_id)
public.hr_document_tags	idx_hr_document_tags_parent	uniq_hr_document_tags_parent_order	USING btree (organization_id, document_id, sort_order)
public.hr_employee_sensitive_disciplinary_records	idx_hr_sensitive_disciplinary_parent	uniq_hr_sensitive_disciplinary_parent_order	USING btree (organization_id, sensitive_fields_id, source_ordinal)
public.hr_employee_sensitive_grievance_records	idx_hr_sensitive_grievance_parent	uniq_hr_sensitive_grievance_parent_order	USING btree (organization_id, sensitive_fields_id, source_ordinal)
public.hr_insurance_claims	idx_s01_hr_c32c5f12eb6efc88	idx_hr_insurance_claims_org_decider_membership	USING btree (org_id, decided_by_membership_id)
public.hr_mood_checkins	idx_mood_checkins_org_user_membership	idx_hr_actor_e4f3eb227c726e23	USING btree (org_id, user_membership_id)
public.hr_workflow_delegations	idx_hr_wf_delegations_org_delegator_membership	idx_hr_actor_0635afa973c5d89d	USING btree (org_id, delegator_membership_id)
public.hr_workflow_delegations	idx_hr_wf_delegations_org_delegate_membership	idx_hr_actor_be01b0002e599354	USING btree (org_id, delegate_membership_id)
public.hr_workflow_step_actions	idx_hr_wf_actions_org_acted_by_membership	idx_hr_actor_3a5f544074767166	USING btree (org_id, acted_by_membership_id)
public.interview_booking_links	idx_booking_links_token	interview_booking_links_token_unique	USING btree (token)
public.inv_product_uom_conversions	uniq_inv_product_uom_conversions_org_product_uom	uniq_inv_product_uom_conversions_key	USING btree (org_id, product_id, uom_id)
public.inv_settings	idx_inv_settings_org	inv_settings_org_id_unique	USING btree (org_id)
public.inv_standard_costs	idx_inv_standard_costs_lookup	uniq_inv_standard_costs_variant_from	USING btree (org_id, product_variant_id, effective_from)
public.legal_entities	uniq_legal_entities_org_id	legal_entities_org_id_id_uniq	USING btree (org_id, id)
public.notification_preferences	idx_notification_preferences_org_membership	uniq_notification_preferences_org_membership	USING btree (org_id, membership_id)
public.notification_queue	idx_notification_queue_delivery	uniq_notification_queue_delivery	USING btree (delivery_id)
public.onboarding_task_dependencies	idx_onboarding_task_dependencies_task	uniq_onboarding_task_dependencies_order	USING btree (organization_id, onboarding_task_id, sort_order)
public.org_ai_credits	org_ai_credits_org_idx	org_ai_credits_org_id_unique	USING btree (org_id)
public.performance_reviews	idx_perf_reviews_org_reviewer_membership	idx_hr_actor_32a7dc662ee3633f	USING btree (org_id, reviewer_membership_id)
public.portal_invitations	uniq_portal_invitations_org_invitation	uniq_portal_invitations_org_id	USING btree (organization_id, portal_invitation_id)
public.principal_groups	uniq_principal_groups_org_id	principal_groups_org_id_id_uniq	USING btree (org_id, id)
public.project_client_grants	uniq_project_client_grants_org_grant	uniq_project_client_grants_org_id	USING btree (organization_id, project_client_grant_id)
public.recognitions	idx_recognitions_org_from_membership	idx_hr_actor_8c58a8f7caea6fd4	USING btree (org_id, from_membership_id)
public.recognitions	idx_recognitions_org_to_membership	idx_hr_actor_98ea9f04e21e3a5d	USING btree (org_id, to_membership_id)
public.support_agent_availability	idx_support_agent_avail_org_user_actor	uniq_support_agent_availability_org_membership	USING btree (org_id, user_membership_id)
public.termination_reasons	idx_termination_reasons_parent	uniq_termination_reasons_parent_order	USING btree (organization_id, termination_id, sort_order)
public.termination_supporting_documents	idx_termination_supporting_documents_parent	uniq_termination_supporting_documents_order	USING btree (organization_id, termination_id, sort_order)
public.users	idx_users_email	users_email_unique	USING btree (email)
public.web_lead_forms	web_lead_forms_token_idx	web_lead_forms_public_token_unique	USING btree (public_token)
public.worker_engagements	uniq_worker_engagements_org_engagement	uniq_worker_engagements_org_id	USING btree (organization_id, worker_engagement_id)```

### 3.2 Prefix-redundant indexes — REMOVE (299)

`drop` is a non-unique, non-partial btree whose column list is a strict leading prefix of
`coveredBy` on the same table with the same access method. No `UNIQUE` and no
constraint-backing index appears in this list.

```
table	drop	drop_cols	coveredBy	covering_cols
build.comment_drafts	idx_comment_drafts_org_member_membership	org_id,membership_id	uniq_comment_drafts_owner_ticket	org_id,membership_id,ticket_id
build.git_connections	idx_git_connections_org	org_id	uniq_git_connections_org_id	org_id,id
build.git_ticket_links	idx_git_ticket_links_ticket	ticket_id	uniq_git_ticket_links_ref	ticket_id,ref_type,external_id
build.modules	idx_modules_org	org_id	uniq_modules_org_id	org_id,id
build.okr_links	idx_okr_links_goal	goal_id	uniq_okr_links_goal_ticket	goal_id,ticket_id
build.pages	idx_pages_org	org_id	uniq_pages_org_id	org_id,id
build.pm_workspace_memberships	idx_pm_ws_members_org_ws	org_id,pm_workspace_id	idx_pm_workspace_memberships_org_ws_added	org_id,pm_workspace_id,added_at,organization_membership_id
build.project_approvals	idx_project_approvals_org_approver_membership	org_id,approver_membership_id	idx_project_approvals_approver_status	org_id,approver_membership_id,status
build.project_automations	idx_project_automations_org_id	org_id	uniq_project_automations_org_id	org_id,id
build.project_team_assignments	idx_project_team_assignments_org	org_id	uniq_project_team_assignments_org_id	org_id,id
build.project_team_assignments	idx_project_team_assignments_project	project_id	uniq_project_team_assignments_project_team	project_id,team_id
build.project_team_members	idx_project_team_members_org	org_id	idx_project_team_members_org_membership	org_id,membership_id
build.project_views	idx_project_views_org	org_id	idx_project_views_org_scope	org_id,scope
build.project_webhooks	idx_project_webhooks_org_id	org_id	uniq_project_webhooks_org_id	org_id,id
build.project_workspace_members	idx_project_workspace_members_org	org_id	idx_project_workspace_members_org_membership	org_id,membership_id
build.release_tickets	idx_release_tickets_release	release_id	uniq_release_tickets	release_id,ticket_id
build.ticket_assignees	idx_ticket_assignees_org_member_membership	org_id,membership_id	idx_ticket_assignees_org_user_ticket	org_id,membership_id,ticket_id
build.ticket_comment_mentions	idx_ticket_comment_mentions_comment	comment_id	uniq_ticket_comment_mentions_comment_user	comment_id,mentioned_user_id
build.ticket_comment_reactions	idx_comment_reactions_comment_id	comment_id	uq_comment_reaction_user_emoji	comment_id,membership_id,emoji
build.ticket_custom_field_values	idx_ticket_custom_field_values_ticket	ticket_id	uniq_ticket_custom_field_values	ticket_id,field_definition_id
build.tickets	idx_tickets_org_assignee_membership	org_id,assignee_membership_id	idx_tickets_org_assignee_status	org_id,assignee_membership_id,status
build.work_item_relations	idx_work_item_relations_item	work_item_id	uniq_work_item_relation	work_item_id,related_work_item_id
public.acc_asset_categories	idx_acc_asset_categories_org	org_id	idx_acc_asset_categories_name_id	org_id,name,id
public.acc_system_account_map	idx_acc_system_account_map_org	org_id	uniq_acc_system_account_map_org_id	org_id,id
public.acc_tax_payments	idx_acc_tax_payments_org_type	org_id,tax_type	uniq_acc_tax_payments_org_type_ref	org_id,tax_type,reference
public.accounting_dimension_values	idx_accounting_dim_values_org_dim	org_id,dimension_id	uniq_accounting_dim_values_org_dim_code	org_id,dimension_id,code
public.ai_credit_transactions	ai_credit_txns_org_idx	org_id	ai_credit_txns_org_created_idx	org_id,created_at
public.alumni_profiles	idx_alumni_org	org_id	uniq_alumni_profiles_org_id	org_id,id
public.announcement_reads	idx_announcement_reads_announcement	announcement_id	idx_announcement_reads_unique	announcement_id,user_id
public.ap_document_lines	idx_ap_document_lines_document	document_id	uniq_ap_document_lines_no	document_id,line_no
public.app_installations	app_installations_org_idx	org_id	app_installations_org_app_idx	org_id,app_id
public.ar_document_lines	idx_ar_document_lines_document	document_id	uniq_ar_document_lines_no	document_id,line_no
public.audit_logs	idx_audit_logs_org_id	org_id	idx_audit_logs_org_action	org_id,action
public.bank_statement_lines	idx_bank_statement_lines_statement	statement_id	idx_bank_statement_lines_date	statement_id,value_date
public.billing_plan_entitlements	idx_billing_plan_ent_plan	plan_id	uq_billing_plan_ent_plan_key_from	plan_id,feature_key,effective_from
public.billing_plans	idx_billing_plans_product	product_id	uq_billing_plans_product_slug	product_id,slug
public.billing_profiles	billing_profiles_org_idx	org_id	uniq_billing_profiles_org_id	org_id,id
public.biometric_devices	idx_biometric_devices_org	org_id	uniq_biometric_devices_org_id	org_id,id
public.blog_posts	idx_blog_posts_status	status	idx_blog_posts_status_published	status,published_at DESC NULLS LAST
public.broadcast_read_receipts	idx_broadcast_read_receipts_admin	org_id,broadcast_id	uniq_broadcast_read_receipts_org_membership_broadcast	org_id,broadcast_id,membership_id
public.calendar_event_exceptions	idx_cal_exc_org_event	org_id,event_id	uniq_cal_exc_org_event_occ	org_id,event_id,occurrence_start
public.calendar_source_preferences	idx_cal_src_pref_org_membership	org_id,membership_id	uniq_cal_src_pref_org_membership_key	org_id,membership_id,source_key
public.calibration_sessions	idx_calibration_sessions_org	org_id	idx_hr_actor_4f3228d35c7ad1e7	org_id,created_by_membership_id
public.candidate_documents_vault	idx_vault_org	org_id	idx_hr_actor_eb57cd9003c16d7d	org_id,uploaded_by_membership_id
public.candidate_messages	idx_candidate_messages_org	org_id	idx_hr_actor_01cff965db84045a	org_id,sent_by_membership_id
public.candidate_offers	idx_candidate_offers_org	org_id	idx_candidate_offers_org_status	org_id,offer_status
public.candidate_reference_checks	idx_reference_checks_org	org_id	idx_hr_actor_21686165fe2bb06d	org_id,created_by_membership_id
public.candidate_referrals	idx_referrals_org	org_id	idx_hr_actor_8015b8868774e242	org_id,referred_by_membership_id
public.candidate_resumes	idx_candidate_resumes_org	org_id	idx_candidate_resumes_org_candidate	org_id,candidate_id
public.candidate_sla_tracking	idx_sla_tracking_candidate	candidate_id	uniq_sla_tracking_candidate_stage	candidate_id,stage
public.candidate_sources	idx_candidate_sources_org	org_id	idx_hr_actor_3f6bed1c407f364a	org_id,created_by_membership_id
public.candidates	idx_candidates_org	org_id	idx_candidates_org_created	org_id,created_at
public.career_ladders	idx_career_ladders_org	org_id	uniq_career_ladders_org_id	org_id,id
public.chat_attachments	idx_chat_attachments_org	org_id	uniq_chat_attachments_org_id	org_id,id
public.chat_channel_invite_links	idx_chat_channel_invite_links_org	org_id	idx_chat_channel_invite_links_created_by_membership_id	org_id,created_by_membership_id
public.chat_channel_members	idx_chat_channel_members_membership_id	org_id,membership_id	idx_chat_channel_members_org_membership	org_id,membership_id,archived_at
public.chat_channel_members	idx_chat_channel_members_org	org_id	idx_chat_channel_members_membership_id	org_id,membership_id
public.chat_channels	idx_chat_channels_org	org_id	idx_chat_channels_created_by_membership_id	org_id,created_by_membership_id
public.chat_huddle_participants	idx_chat_huddle_participants_org	org_id	idx_chat_huddle_participants_membership_id	org_id,membership_id
public.chat_huddle_participants	idx_huddle_participants_huddle	huddle_id	uniq_huddle_participant	huddle_id,membership_id
public.chat_huddles	idx_chat_huddles_org	org_id	idx_chat_huddles_started_by_membership_id	org_id,started_by_membership_id
public.chat_message_reactions	idx_chat_message_reactions_message	org_id,message_id	uniq_chat_message_reaction_actor_emoji	org_id,message_id,membership_id,emoji
public.chat_messages	idx_chat_messages_org	org_id	idx_chat_messages_sender_membership_id	org_id,sender_membership_id
public.chat_pinned_messages	idx_chat_pinned_channel	channel_id	uniq_chat_pinned_msg	channel_id,message_id
public.chat_pinned_messages	idx_chat_pinned_messages_org	org_id	idx_chat_pinned_messages_pinned_by_membership_id	org_id,pinned_by_membership_id
public.chat_saved_messages	idx_chat_saved_messages_membership_id	org_id,membership_id	uniq_chat_saved_msg_membership	org_id,membership_id,message_id
public.chat_saved_messages	idx_chat_saved_messages_org	org_id	idx_chat_saved_messages_membership_id	org_id,membership_id
public.client_accounts	idx_client_accounts_org	org_id	idx_client_accounts_lead_party_id	org_id,lead_party_id
public.client_onboarding_items	idx_onboarding_items_org	org_id	idx_client_onboarding_items_client_party_id	org_id,client_party_id
public.client_onboarding_templates	idx_client_onboarding_templates_org	org_id	uniq_client_onboarding_templates_org_id	org_id,id
public.client_opportunities	idx_client_opps_org	org_id	idx_client_opportunities_client_party_id	org_id,client_party_id
public.contacts	idx_contacts_org	org_id	idx_contacts_name_email	org_id,name,email
public.coupon_redemptions	idx_coupon_redemptions_coupon	coupon_id	uq_coupon_redemptions_coupon_org	coupon_id,org_id
public.coupon_redemptions	idx_coupon_redemptions_org	org_id	idx_coupon_redemptions_org_membership	org_id,membership_id
public.coupons	idx_coupons_org	org_id	coupons_org_id_id_uniq	org_id,id
public.credit_note_items	idx_credit_note_items_org	org_id	idx_credit_note_items_org_cn	org_id,credit_note_id
public.crm_commission_accrual_parts	idx_crm_commission_accrual_parts_earning	org_id,earning_id	uniq_crm_commission_accrual_parts_slot	org_id,earning_id,part_index
public.crm_contact_channel_consent	idx_crm_consent_org_contact	org_id,contact_id	uniq_crm_consent_org_contact_channel	org_id,contact_id,channel
public.crm_contact_roles	idx_crm_contact_roles_org	org_id	idx_crm_contact_roles_contact_party_id	org_id,contact_party_id
public.crm_deal_competitors	idx_crm_deal_competitors_org	org_id	uniq_crm_deal_competitors_org_id	org_id,id
public.crm_deal_stakeholders	idx_crm_deal_stakeholders_deal	org_id,deal_id	uq_crm_deal_stakeholders_deal_contact	org_id,deal_id,contact_id
public.crm_email_templates	idx_crm_email_templates_org	org_id	uniq_crm_email_templates_org_id	org_id,id
public.crm_organizations	idx_crm_organizations_org	org_id	idx_crm_organizations_parent	org_id,parent_id
public.crm_pricebooks	idx_crm_pricebooks_org	org_id	uniq_crm_pricebooks_org_id	org_id,id
public.crm_quote_templates	idx_crm_quote_templates_org	org_id	uniq_crm_quote_templates_org_id	org_id,id
public.crm_sla_breach_log	idx_sla_breach_lead_idx	lead_id	crm_sla_breach_log_lead_policy_unique	lead_id,policy_id
public.crm_sla_breach_log	idx_sla_breach_org_idx	org_id	uniq_crm_sla_breach_log_org_id	org_id,id
public.crm_sla_policies	idx_crm_sla_org	org_id	uniq_crm_sla_policies_org_id	org_id,id
public.crm_suppression_hashes	idx_crm_suppression_org_channel	org_id,channel	uniq_crm_suppression_org_channel_hash	org_id,channel,address_hash
public.csat_surveys	idx_csat_surveys_org	org_id	idx_csat_surveys_client_party_id	org_id,client_party_id
public.custom_field_definitions	idx_cfd_org_entity	org_id,entity_type	idx_cfd_org_entity_project_active	org_id,entity_type,project_id,is_active
public.deal_activities	idx_deal_activities_org	org_id	idx_deal_activities_org_deal_created	org_id,deal_id,created_at
public.deal_meetings	idx_deal_meetings_org	org_id	uniq_deal_meetings_org_id	org_id,id
public.devices	idx_devices_user	user_id	uniq_devices_user_fingerprint	user_id,fingerprint
public.document_type_roles	idx_document_type_roles_org	org_id	uniq_document_type_roles_org_id	org_id,id
public.document_type_roles	idx_document_type_roles_type	document_type_id	uniq_document_type_roles_type_slug	document_type_id,role_slug
public.document_types	idx_doc_types_org	org_id	idx_doc_types_org_country	org_id,country_code
public.dunning_attempts	idx_dunning_attempts_org_sub_period	org_id,subscription_id,period_start	uniq_dunning_attempt_cycle_milestone	org_id,subscription_id,period_start,milestone
public.email_sequences	idx_email_sequences_org	org_id	idx_hr_actor_349c68a39a688fa3	org_id,created_by_membership_id
public.employee_salary_profile_components	idx_employee_salary_profile_components_org	org_id	uniq_employee_salary_profile_components_org_id	org_id,id
public.employee_salary_profile_components	idx_employee_salary_profile_components_profile	profile_id	uniq_esp_components_profile_component	profile_id,component_id
public.employee_shift_assignments	idx_shift_assignments_org	org_id	uniq_employee_shift_assignments_org_id	org_id,id
public.event_attendees	idx_event_attendees_org_event	org_id,event_id	event_attendees_event_membership_unique	org_id,event_id,membership_id
public.external_referrals	idx_external_referrals_org	org_id	uniq_external_referrals_org_id	org_id,id
public.fin_cash_flow_scenarios	idx_fin_cash_flow_scenarios_org	org_id	uniq_fin_cash_flow_scenarios_org_id	org_id,id
public.fin_expense_policies	idx_fin_expense_policies_org	org_id	uniq_fin_expense_policies_org_id	org_id,id
public.fin_payment_allocations	idx_fin_payment_allocations_org	org_id	uniq_fin_payment_allocations_org_id	org_id,id
public.fin_recurring_bill_templates	idx_fin_recurring_bill_templates_org	org_id	idx_fin_recurring_bill_templates_name_id	org_id,name,id
public.fin_recurring_invoice_templates	idx_fin_recurring_invoice_templates_org	org_id	idx_fin_recurring_invoice_templates_org_created_id	org_id,created_at DESC,id DESC
public.fin_recurring_journal_templates	idx_fin_recurring_journal_templates_org	org_id	idx_fin_recurring_journal_templates_name_id	org_id,name,id
public.fin_reminder_log	idx_fin_reminder_log_org_invoice	org_id,invoice_id	uniq_fin_reminder_log_org_inv_offset	org_id,invoice_id,offset_days
public.fin_reminder_policies	idx_fin_reminder_policies_org	org_id	uniq_fin_reminder_policies_org_id	org_id,id
public.fin_vendor_payment_allocations	idx_fin_vendor_payment_allocations_org	org_id	uniq_fin_vendor_payment_allocations_org_id	org_id,id
public.gl_journal_lines	idx_gl_journal_lines_journal	journal_id	uniq_gl_journal_lines_journal_line_no	journal_id,line_no
public.group_role_assignments	idx_group_role_assignments_org_group	org_id,principal_group_id	uniq_group_role_assignments_group_role	org_id,principal_group_id,role_id
public.handbook_versions	idx_handbook_org	org_id	idx_s01_hr_49fe208ec6c3c6bc	org_id,published_by_membership_id
public.headcount_requests	idx_headcount_requests_org	org_id	idx_hr_actor_4019dc4b4777c1c8	org_id,approved_by_membership_id
public.health_score_config	idx_health_score_config_org	org_id	uniq_health_score_config_org_id	org_id,id
public.hiring_flows	idx_hiring_flows_org	org_id	idx_hr_actor_8b89f970abb003f7	org_id,created_by_membership_id
public.hr_access_provisioning	idx_hr_acc_prov_org	org_id	idx_hr_acc_prov_status	org_id,status
public.hr_access_provisioning_templates	idx_hr_acc_prov_tmpl_org	org_id	uniq_hr_access_provisioning_templates_org_id	org_id,id
public.hr_access_requests	idx_hr_access_requests_org	org_id	uniq_hr_access_requests_org_id	org_id,id
public.hr_accommodation_requests	idx_hr_acc_req_org	org_id	idx_s01_hr_c67b5a94eebf54bf	org_id,reviewed_by_membership_id
public.hr_accommodation_tasks	idx_hr_acc_task_org	org_id	uniq_hr_accommodation_tasks_org_id	org_id,id
public.hr_audit_logs	idx_hr_audit_logs_org	org_id	idx_hr_audit_logs_org_action	org_id,action
public.hr_badges	idx_badges_org	org_id	uniq_badge_org_name	org_id,name
public.hr_benefit_enrollments	idx_hr_benefit_enrollments_org_plan	org_id,plan_id	uniq_hr_benefit_enrollments_org_plan_user	org_id,plan_id,user_id
public.hr_calibration_entries	idx_calibration_entries_cycle	cycle_id	uniq_calibration_cycle_employee	cycle_id,employee_id
public.hr_calibration_entries	idx_calibration_entries_org	org_id	uniq_hr_calibration_entries_org_id	org_id,id
public.hr_case_notes	idx_hr_case_notes_org	org_id	idx_hr_case_notes_org_author_membership	org_id,author_membership_id
public.hr_communities	idx_communities_org	org_id	idx_hr_actor_0dcb73ed54fc59f3	org_id,created_by_membership_id
public.hr_community_members	idx_community_members_community	community_id	uniq_community_member	community_id,user_id
public.hr_email_templates	idx_email_templates_org	org_id	idx_s01_hr_f69b80e736517097	org_id,created_by_membership_id
public.hr_emergency_events	idx_hr_emerg_ev_org	org_id	idx_hr_emerg_ev_status	org_id,status
public.hr_employee_sensitive_fields	idx_hr_sensitive_org	org_id	uniq_hr_employee_sensitive_fields_org_id	org_id,id
public.hr_employments	idx_hr_employments_org	org_id	idx_hr_employments_org_status	org_id,lifecycle_status
public.hr_event_stream	idx_hr_evstream_org	org_id	idx_hr_evstream_entity	org_id,entity_type,entity_id
public.hr_headcount_plans	idx_hr_headcount_plans_org	org_id	uniq_hr_headcount_plans_org_id	org_id,id
public.hr_helpdesk_routing	idx_hr_helpdesk_routing_org	org_id	uniq_helpdesk_routing_org_category	org_id,category
public.hr_job_levels	idx_hr_job_levels_org	org_id	uniq_hr_job_levels_org_id	org_id,id
public.hr_job_roles	idx_hr_job_roles_org	org_id	uniq_hr_job_roles_org_id	org_id,id
public.hr_leave_ledger	idx_hr_leave_ledger_org_user	org_id,user_id	idx_hr_leave_ledger_user_type_date	org_id,user_id,leave_type_id,effective_date
public.hr_mood_checkins	idx_hr_actor_e4f3eb227c726e23	org_id,user_membership_id	uniq_mood_org_membership_date	org_id,user_membership_id,date
public.hr_mood_checkins	idx_mood_checkins_org_user_membership	org_id,user_membership_id	uniq_mood_org_membership_date	org_id,user_membership_id,date
public.hr_people	idx_hr_people_org	org_id	uniq_hr_people_org_id	org_id,id
public.hr_poll_votes	idx_poll_votes_poll	poll_id	uniq_poll_vote_poll_user	poll_id,user_id
public.hr_position_statuses	idx_hr_position_statuses_org	org_id	uniq_hr_position_statuses_org_id	org_id,id
public.hr_positions	idx_hr_positions_org	org_id	idx_hr_positions_org_status	org_id,status
public.hr_probation_reviews	idx_hr_probation_reviews_org	org_id	idx_hr_probation_reviews_status	org_id,status
public.hr_retention_policies	idx_hr_retention_policies_org	org_id	uniq_hr_retention_policies_org_id	org_id,id
public.hr_role_skill_requirements	idx_role_skill_req_org	org_id	uniq_hr_role_skill_requirements_org_id	org_id,id
public.hr_simulations	idx_hr_sim_org	org_id	idx_hr_sim_type	org_id,type
public.hr_succession_plans	idx_succession_org	org_id	idx_hr_actor_1ed64ad625e21ca1	org_id,created_by_membership_id
public.hr_templates	idx_hr_templates_org_kind	org_id,kind	uniq_hr_templates_org_kind_name_ver	org_id,kind,name,version
public.hr_union_memberships	idx_hr_union_memberships_org	org_id	idx_hr_union_memberships_org_user	org_id,user_id
public.hr_wellness_checkins	idx_hr_wellness_org_user	org_id,user_id	uniq_hr_wellness_org_user_date	org_id,user_id,date
public.hr_workflow_instance_attachments	idx_hr_wf_inst_attachments_org	org_id	uniq_hr_wf_inst_attachments_org_id	org_id,id
public.incentives	idx_incentives_org	org_id	uniq_incentives_org_id	org_id,id
public.interview_questions	idx_interview_questions_org	org_id	idx_hr_actor_efa07ce389203eee	org_id,created_by_membership_id
public.interview_scorecards	idx_scorecards_interview	interview_id	uniq_scorecard_interview_interviewer	interview_id,interviewer_id
public.inv_carriers	idx_inv_carriers_org	org_id	uniq_inv_carriers_org_code	org_id,code
public.inv_categories	idx_inv_categories_org	org_id	uniq_inv_categories_org_id	org_id,id
public.inv_channel_pools	idx_inv_channel_pools_org_channel	org_id,channel_id	uniq_inv_channel_pools_grain	org_id,channel_id,product_variant_id,COALESCE(warehouse_id, 0)
public.inv_channel_stock_publications	idx_inv_pub_org_channel	org_id,channel_id	uniq_inv_pub_org_channel_variant	org_id,channel_id,product_variant_id
public.inv_dock_doors	idx_inv_dock_doors_org_warehouse	org_id,warehouse_id	uniq_inv_dock_doors_org_warehouse_code	org_id,warehouse_id,code
public.inv_landed_cost_allocations	idx_inv_landed_cost_allocations_org_voucher	org_id,voucher_id	uniq_inv_landed_cost_allocations_voucher_layer	org_id,voucher_id,valuation_layer_id
public.inv_locations	idx_inv_locations_org	org_id	uniq_inv_locations_org_id	org_id,id
public.inv_locations	idx_inv_locations_warehouse	warehouse_id	uniq_inv_locations_warehouse_code	warehouse_id,code
public.inv_lots	idx_inv_lots_org	org_id	idx_inv_lots_status	org_id,status
public.inv_product_uom_conversions	idx_inv_product_uom_conversions_product	org_id,product_id	uniq_inv_product_uom_conversions_key	org_id,product_id,uom_id
public.inv_reorder_rules	idx_inv_reorder_org	org_id	uniq_inv_reorder_org_variant_wh	org_id,product_variant_id,warehouse_id
public.inv_serial_numbers	idx_inv_serials_org	org_id	idx_inv_serials_status	org_id,status
public.inv_settings	idx_inv_settings_org	org_id	uniq_inv_settings_org_id	org_id,id
public.inv_stock_adjustments	idx_inv_adj_org	org_id	idx_inv_adj_org_ref	org_id,reference_number
public.inv_stock_levels	idx_inv_stock_org	org_id	uniq_inv_stock_levels_natural_key	org_id,product_variant_id,location_id,COALESCE(lot_id, 0),COALESCE(serial_id, 0)
public.inv_stock_transactions	idx_inv_txn_org_variant	org_id,product_variant_id	idx_inv_txn_org_variant_type_created	org_id,product_variant_id,transaction_type,created_at
public.inv_uom	idx_inv_uom_org	org_id	uniq_inv_uom_org_id	org_id,id
public.inv_user_warehouses	idx_inv_user_warehouses_org_user	org_id,user_id	uniq_inv_user_warehouses_key	org_id,user_id,warehouse_id
public.inv_valuation_consumptions	idx_inv_val_consumptions_org_txn	org_id,stock_transaction_id	uniq_inv_val_consumptions_txn_layer	org_id,stock_transaction_id,valuation_layer_id
public.inv_valuation_layers	idx_inv_val_layers_remaining	org_id,product_variant_id	idx_inv_val_layers_org_variant	org_id,product_variant_id,created_at
public.inv_vendors	idx_inv_vendors_org	org_id	idx_inv_vendors_client_party_id	org_id,client_party_id
public.inv_warehouses	idx_inv_warehouses_org	org_id	uniq_inv_warehouses_org_code	org_id,code
public.inv_webhooks	idx_inv_webhooks_org	org_id	uniq_inv_webhooks_org_id	org_id,id
public.job_board_postings	idx_job_board_postings_org	org_id	idx_hr_actor_331ec1da58ee61ae	org_id,created_by_membership_id
public.job_postings	idx_job_postings_org	org_id	idx_hr_actor_a459ad4717553e7b	org_id,posted_by_membership_id
public.job_recruiters	idx_job_recruiters_job	job_posting_id	uq_job_recruiters_job_user	job_posting_id,user_id
public.journal_entries	idx_je_org_source	org_id,source_type,source_id	uniq_je_idempotency	org_id,source_type,source_id,source_event
public.journal_entries	idx_je_org_status	org_id,status	idx_je_org_status_date	org_id,status,entry_date
public.kb_article_tags	idx_kb_article_tags_org_article	org_id,article_id	kb_article_tags_pkey	org_id,article_id,tag_id
public.kb_articles	idx_kb_articles_org_status	org_id,status	idx_kb_articles_org_status_views	org_id,status,views
public.kb_chat_conversations	idx_kb_chat_conversations_org_mbr	org_id,user_membership_id	idx_kb_chat_conversations_org_mbr_updated	org_id,user_membership_id,updated_at DESC,id DESC
public.kb_events	idx_kb_events_org_type	org_id,event_type	idx_kb_events_org_type_time	org_id,event_type,occurred_at
public.kb_page_templates	idx_kb_page_templates_org	org_id	uniq_kb_page_templates_org_id	org_id,id
public.kb_research_briefs	idx_kb_research_briefs_org	org_id	idx_kb_research_briefs_org_mbr	org_id,user_membership_id
public.kb_sources	idx_kb_sources_org	org_id	idx_kb_sources_org_space	org_id,space_id
public.kb_space_grants	idx_kb_space_grants_org_space	org_id,space_id	uniq_kb_space_grants	org_id,space_id,principal_type,principal_id,permission_key
public.kb_spaces	idx_kb_spaces_org	org_id	idx_kb_spaces_org_created_by_mbr	org_id,created_by_membership_id
public.lead_assignment_rules	idx_lead_assignment_rules_org	org_id	uniq_lead_assignment_rules_org_id	org_id,id
public.lead_import_batches	idx_lead_batches_org	org_id	uniq_lead_import_batches_org_id	org_id,id
public.lead_scoring_rules	idx_lead_scoring_rules_org	org_id	uniq_lead_scoring_rules_org_id	org_id,id
public.learning_paths	idx_learning_paths_org	org_id	uniq_learning_paths_org_id	org_id,id
public.leave_balances	idx_leave_balances_org_year	org_id,year	idx_leave_balances_org_year_type	org_id,year,leave_type_id,user_id
public.module_ownerships	idx_module_ownerships_org	org_id	uniq_module_ownerships_org_module	org_id,module_key
public.module_setup_checklist_items	idx_module_checklist_items_checklist	checklist_id	uq_module_checklist_items_checklist_key	checklist_id,item_key
public.notification_audit_logs	idx_notif_audit_notification	notification_id	idx_notification_audit_logs_parent	notification_id,notification_created_at
public.notification_consents	idx_notification_consents_org_membership	org_id,membership_id	uniq_notification_consents_current	org_id,membership_id,channel,destination
public.notification_deliveries	idx_notification_deliveries_notification	notification_id	idx_notification_deliveries_parent	notification_id,notification_created_at
public.notification_deliveries	idx_notification_deliveries_org_membership	org_id,membership_id	idx_notification_deliveries_membership_channel	org_id,membership_id,channel,created_at
public.notification_policy_defaults	idx_notification_policy_org_scope	org_id,scope_type	uq_notification_policy_scope	org_id,scope_type,scope_id
public.notification_preference_rules	idx_notification_pref_rule_lookup	org_id,membership_id,scope_type,scope_key	uniq_notification_pref_rule	org_id,membership_id,scope_type,scope_key,channel
public.notification_preference_rules	idx_notification_pref_rules_org_membership	org_id,membership_id	idx_notification_pref_rule_lookup	org_id,membership_id,scope_type,scope_key
public.notification_queue	idx_notification_queue_org	org_id	uniq_notification_queue_org_id	org_id,id
public.notification_templates	idx_notification_templates_org	org_id	uniq_notification_templates_org_id	org_id,id
public.offer_fulfillment_components	idx_offer_fulfillment_components_offer	org_id,crm_offer_id	uniq_offer_fulfillment_components_org_offer_sku	org_id,crm_offer_id,inv_sku_id
public.offer_letter_templates	idx_offer_letter_templates_org	org_id	idx_hr_actor_956ee6b0cd235e4f	org_id,created_by_membership_id
public.onboarding_documents	idx_onboarding_docs_org	org_id	idx_s01_hr_536bfdf6e3a1e902	org_id,reviewed_by_membership_id
public.onboarding_flow_sessions	idx_onb_flow_sessions_org_membership	org_id,membership_id	idx_onb_flow_sessions_org_membership_type	org_id,membership_id,type
public.onboarding_templates	idx_onboarding_templates_org	org_id	idx_s01_hr_596e0055c24ac88d	org_id,created_by_membership_id
public.one_on_one_meetings	idx_one_on_ones_org	org_id	uniq_one_on_one_meetings_org_id	org_id,id
public.org_ai_credits	org_ai_credits_org_idx	org_id	uniq_org_ai_credits_org_id	org_id,id
public.org_custom_domains	idx_org_custom_domains_org	org_id	uniq_org_custom_domains_org_id	org_id,id
public.org_entitlement_overrides	idx_org_ent_overrides_org_key	org_id,feature_key	uq_org_ent_overrides_org_key_from	org_id,feature_key,effective_from
public.org_modules	org_modules_org_idx	org_id	org_modules_unique_idx	org_id,module_key
public.org_unit_members	idx_org_unit_members_unit	org_unit_id	uniq_org_unit_members_unit_membership	org_unit_id,membership_id
public.org_units	idx_org_units_org_kind	org_id,kind	uniq_org_units_org_kind_code	org_id,kind,code
public.organization_allowed_email_domains	idx_org_allowed_domains_org	org_id	uniq_org_allowed_domains_org_domain	org_id,domain
public.organization_people	idx_org_people_org	organization_id	uniq_org_people_org_person	organization_id,organization_person_id
public.payment_providers	idx_payment_providers_org	org_id	uniq_payment_providers_org_id	org_id,id
public.payroll_accounting_mappings	idx_payroll_accounting_mappings_org	org_id	uniq_payroll_accounting_mappings_org_id	org_id,id
public.payroll_bank_batch_items	idx_payroll_bank_batch_items_org	org_id	uniq_payroll_bank_batch_items_org_id	org_id,id
public.payroll_inputs	idx_payroll_inputs_run	run_id	uniq_payroll_inputs_run_user	run_id,user_id
public.payroll_tax_windows	idx_payroll_tax_windows_org	org_id	uniq_payroll_tax_windows_org_id	org_id,id
public.payslip_templates	idx_payslip_templates_org	org_id	uniq_payslip_templates_org_id	org_id,id
public.pipeline_automations	idx_pipeline_automations_org	org_id	idx_hr_actor_50ad17a697e4b235	org_id,created_by_membership_id
public.playbook_entries	idx_playbook_entries_org	org_id	uniq_playbook_entries_org_id	org_id,id
public.principal_group_members	idx_principal_group_members_group	principal_group_id	uniq_principal_group_members_group_member	principal_group_id,organization_membership_id
public.principal_groups	idx_principal_groups_org	org_id	principal_groups_org_id_id_uniq	org_id,id
public.pulse_surveys	idx_surveys_org	org_id	idx_hr_actor_fe997934f8c669cb	org_id,created_by_membership_id
public.recognitions	idx_recognitions_org	org_id	idx_hr_actor_8c58a8f7caea6fd4	org_id,from_membership_id
public.recruiter_activity_log	idx_recruiter_activity_org	org_id	uniq_recruiter_activity_log_org_id	org_id,id
public.recruitment_vendors	idx_recruitment_vendors_org	org_id	idx_hr_actor_2b4ae5046354212b	org_id,created_by_membership_id
public.reimbursements	idx_reimbursements_org	org_id	idx_reimbursements_org_approved_actor	org_id,approved_by_membership_id
public.relationship_participants	idx_relationship_participants_state	organization_id,relationship_state_id	uniq_relationship_participants_identity	organization_id,relationship_state_id,identity
public.relationship_threads	idx_relationship_threads_state	organization_id,relationship_state_id	uniq_relationship_threads_thread	organization_id,relationship_state_id,thread_id
public.resignations	idx_resignations_org	org_id	idx_resignations_org_user_membership	org_id,user_membership_id
public.resource_grants	idx_resource_grants_resource	org_id,resource_type,resource_id	uniq_resource_grants_principal	org_id,resource_type,resource_id,principal_type,principal_id
public.revenue_events	revenue_events_org_idx	org_id	uniq_revenue_events_org_id	org_id,id
public.review_cycles	idx_review_cycles_org	org_id	idx_hr_actor_6ae81e8eecd6e612	org_id,created_by_membership_id
public.rich_documents	idx_rich_documents_org	org_id	idx_rich_documents_org_updated	org_id,updated_at
public.role_assignments	idx_role_assignments_org_membership	org_id,organization_membership_id	uniq_role_assignments_org_membership_role	org_id,organization_membership_id,role_id
public.role_permission_grants	idx_role_permission_grants_org_role	org_id,role_id	uniq_role_permission_grants_role_key	org_id,role_id,permission_key
public.roles	idx_roles_org_module	org_id,module_key	idx_roles_org_module_name_id	org_id,module_key,name,id
public.salary_loans	idx_loans_org	org_id	idx_salary_loans_org_user_actor	org_id,user_membership_id
public.salary_structure_templates	idx_salary_structure_templates_org	org_id	idx_salary_structure_templates_org_active	org_id,is_active
public.scheduled_reports	idx_scheduled_reports_org	org_id	uniq_scheduled_reports_org_id	org_id,id
public.scorecard_templates	idx_scorecard_templates_org	org_id	idx_hr_actor_920b32d217c60f43	org_id,created_by_membership_id
public.skill_assessments	idx_skill_assessments_org	org_id	idx_hr_actor_151ed356e6ac7b7b	org_id,created_by_membership_id
public.subscription_payments	idx_sub_payments_org	org_id	uniq_subscription_payments_org_id	org_id,id
public.subscriptions	idx_subscriptions_org	org_id	uniq_subscriptions_org_id	org_id,id
public.support_agent_skills	idx_support_agent_skills_org_user_actor	org_id,user_membership_id	uniq_support_agent_skills_org_membership_skill	org_id,user_membership_id,skill
public.support_business_hours	idx_support_business_hours_org	org_id	uniq_support_business_hours_org_id	org_id,id
public.support_channels	idx_support_channels_org_type	org_id,type	uniq_support_channels_org_type_name	org_id,type,name
public.support_csat_requests	idx_support_csat_requests_org	org_id	uniq_support_csat_requests_org_id	org_id,id
public.support_knowledge_gaps	idx_support_knowledge_gaps_org	org_id	idx_support_knowledge_gaps_org_status_created	org_id,status,created_at
public.support_macros	idx_support_macros_org	org_id	idx_support_macros_org_created_actor	org_id,created_by_membership_id
public.support_message_mentions	idx_support_message_mentions_message	message_id	uniq_support_message_mentions_message_membership	message_id,mentioned_user_membership_id
public.support_ticket_attachments	idx_support_ticket_attachments_org	org_id	uniq_support_ticket_attachments_org_id	org_id,id
public.support_ticket_embeddings	idx_support_ticket_embeddings_org	org_id	uniq_support_ticket_embeddings_org_id	org_id,id
public.survey_versions	idx_survey_versions_survey	survey_id	uq_survey_versions_survey_number	survey_id,version_number
public.talent_pool_members	idx_talent_pool_members_pool	pool_id	uq_talent_pool_members_pool_candidate	pool_id,candidate_id
public.talent_pools	idx_talent_pools_org	org_id	idx_hr_actor_c19d1de41b65926b	org_id,created_by_membership_id
public.tasks	idx_tasks_org	org_id	uniq_tasks_org_id	org_id,id
public.tax_gl_map	idx_tax_gl_map_book	book_id	uniq_tax_gl_map_book_role_component	book_id,gl_role,component
public.team_events	idx_team_events_org	org_id	idx_s01_hr_b8e8915b6ca9a901	org_id,organized_by_membership_id
public.terminations	idx_terminations_org	org_id	idx_s01_hr_12b5f6498309c431	org_id,final_reviewed_by_membership_id
public.territories	territories_org_id_idx	org_id	uniq_territories_org_id	org_id,id
public.territory_locations	idx_territory_locations_territory	territory_id	uniq_territory_locations_territory_kind_value	territory_id,kind,value
public.territory_reps	idx_territory_reps_org	org_id	uniq_territory_reps_org_id	org_id,id
public.territory_reps	idx_territory_reps_territory	territory_id	uniq_territory_reps_territory_person	territory_id,crm_person_id
public.timesheet_audit_events	idx_timesheet_audit_events_org_created	org_id,created_at DESC	idx_ts_audit_org_created_id	org_id,created_at DESC,id DESC
public.timesheet_exports	idx_timesheet_exports_org_created	org_id,created_at DESC	idx_ts_exports_org_created_id	org_id,created_at DESC,id DESC
public.timesheet_periods	idx_timesheet_periods_org_status	org_id,status	idx_ts_periods_org_status_submitted	org_id,status,submitted_at DESC,id DESC
public.timesheet_periods	idx_timesheet_periods_user_membership_start	org_id,user_membership_id,period_start	uniq_timesheet_periods_user_membership_range	org_id,user_membership_id,period_start,period_end
public.timesheet_rate_cards	idx_timesheet_rate_cards_org	org_id	uniq_timesheet_rate_cards_org_id	org_id,id
public.timesheets	idx_timesheets_org_status	org_id,status	idx_timesheets_org_status_date	org_id,status,date DESC
public.user_module_access	idx_user_module_access_org_membership	org_id,organization_membership_id	uniq_user_module_access_org_membership_module	org_id,organization_membership_id,module_key
public.user_permission_grants	idx_user_permission_grants_org_membership	org_id,organization_membership_id	uniq_user_permission_grants_membership_key	org_id,organization_membership_id,permission_key
public.user_tour_progress	idx_user_tour_progress_org_membership	org_id,membership_id	uq_user_tour_progress_org_membership_tour	org_id,membership_id,tour_key
public.vendor_credit_items	idx_vendor_credit_items_org	org_id	idx_vendor_credit_items_org_vc	org_id,vendor_credit_id
public.web_lead_forms	web_lead_forms_org_id_idx	org_id	uniq_web_lead_forms_org_id	org_id,id
public.webhook_endpoints	idx_webhook_endpoints_org	org_id	uniq_webhook_endpoints_org_id	org_id,id
public.worker_engagements	idx_worker_engagements_org	organization_id	idx_worker_engagements_org_starts	organization_id,starts_on
public.workers	idx_workers_org	organization_id	idx_workers_org_status	organization_id,status
public.workflow_audit_logs	idx_workflow_audit_logs_org	org_id	idx_workflow_audit_logs_org_created	org_id,created_at
public.workflow_execution_steps	idx_workflow_execution_steps_execution	execution_id	idx_workflow_execution_steps_execution_node	execution_id,node_id
public.workflow_executions	idx_workflow_executions_org	org_id	idx_workflow_executions_org_created	org_id,created_at
public.workflow_secrets	idx_workflow_secrets_org	org_id	uniq_workflow_secrets_org_id	org_id,id
public.workflow_versions	idx_workflow_versions_workflow	workflow_id	idx_workflow_versions_workflow_version	workflow_id,version
public.workflows	idx_workflows_org	org_id	idx_workflows_org_status	org_id,status```

### 3.3 `ON DELETE CASCADE` → `organizations.id` with no leading index — REFACTOR: add index (151)

Each row is a child table sequentially scanned by
`cron-org-purge-worker.service.ts:236` (`tx.delete(organizations)`), inside one transaction.
Add `CREATE INDEX CONCURRENTLY … ON <table> (<col>)` — do **not** remove the FK.

```
table	column
ai_action_proposals	org_id
billing_profiles	org_id
app_installations	org_id
org_ai_credits	org_id
ai_credit_transactions	org_id
ai_credit_reservations	org_id
affiliates	org_id
affiliate_commissions	referred_org_id
referrals	referrer_org_id
referrals	referred_org_id
revenue_events	org_id
enterprise_quotes	org_id
org_entitlement_overrides	org_id
subscription_items	org_id
dunning_attempts	org_id
billing_invoice_number_sequences	org_id
billing_invoice_snapshots	org_id
billing_invoice_line_snapshots	org_id
billing_credit_notes	org_id
billing_credit_note_lines	org_id
billing_proration_lines	org_id
provider_webhook_events	org_id
billing_seat_events	org_id
billing_usage_events	org_id
billing_usage_rollups	org_id
billing_usage_reservations	org_id
project_approvals	org_id
change_requests	org_id
feedbucket_widgets	org_id
feedbucket_submissions	org_id
feedbucket_attachments	org_id
project_forms	org_id
form_submissions	org_id
project_risks	org_id
project_decisions	org_id
project_incidents	org_id
incident_updates	org_id
project_meetings	org_id
meeting_attendees	org_id
meeting_action_items	org_id
meeting_standup_entries	org_id
pm_workspace_memberships	org_id
pm_workspaces	org_id
project_portfolios	org_id
project_programs	org_id
portfolio_projects	org_id
program_projects	org_id
project_teams	org_id
project_team_members	org_id
project_workspace_members	org_id
project_team_assignments	org_id
ticket_label_mappings	org_id
ticket_comment_reactions	org_id
ticket_related_links	org_id
tickets	org_id
work_item_relations	org_id
project_webhooks	org_id
webhook_deliveries	org_id
project_automations	org_id
release_tickets	org_id
workflow_transitions	org_id
org_modules	org_id
kb_space_grants	org_id
email_suppressions	org_id
notification_preference_rules	org_id
notification_consents	org_id
notification_consent_events	org_id
notification_digest_items	org_id
notification_digest_runs	org_id
broadcast_audience_targets	org_id
broadcast_read_receipts	org_id
notification_read_watermarks	org_id
outbox_events	organization_id
inbox_records	organization_id
external_effect_ledger	organization_id
resource_grants	org_id
workflow_runs	organization_id
workflow_steps	organization_id
activities	organization_id
activity_participants	organization_id
crm_people	org_id
crm_companies	org_id
crm_deals	org_id
crm_activities	org_id
crm_support_tickets	org_id
crm_monthly_metrics	org_id
crm_team_performance	org_id
autonomous_decisions	organization_id
autonomy_corrections	organization_id
autonomy_holds	organization_id
autonomy_shadow_scores	organization_id
autonomy_switches	organization_id
crm_campaigns	org_id
crm_connector_syncs	organization_id
crm_connector_records	organization_id
data_quality_resolutions	organization_id
data_quality_findings	organization_id
data_quality_health_snapshots	organization_id
commission_rules	org_id
incentive_config	org_id
task_sequences	org_id
deal_approval_rules	org_id
crm_imports	organization_id
crm_import_rows	organization_id
inbound_events	organization_id
issue_records	organization_id
issue_stage_transitions	organization_id
crm_mailbox_sync	organization_id
hr_mood_checkins	org_id
hr_badges	org_id
hr_badge_awards	org_id
hr_reward_points_ledger	org_id
hr_polls	org_id
hr_communities	org_id
hr_campaigns	org_id
hr_time_devices	org_id
hr_device_sync_logs	org_id
hr_device_employee_mappings	org_id
hr_payroll_variance_approvals	org_id
hr_arrears_adjustments	org_id
hr_payroll_compliance_tasks	org_id
hr_comp_cycles	org_id
hr_comp_recommendations	org_id
hr_comp_budget_pools	org_id
hr_equity_grants	org_id
hr_equity_vesting_events	org_id
hr_equity_exercises	org_id
hr_accommodation_requests	org_id
hr_accommodation_tasks	org_id
hr_emergency_events	org_id
hr_emergency_responses	org_id
hr_access_provisioning	org_id
hr_access_provisioning_templates	org_id
hr_simulations	org_id
hr_event_stream	org_id
party_identifiers	organization_id
party_roles	organization_id
party_merges	organization_id
party_duplicate_candidates	organization_id
subject_types	organization_id
subjects	organization_id
subject_party_links	organization_id
timesheet_audit_events	org_id
timesheet_budgets	org_id
timesheet_exceptions	org_id
timesheet_periods	org_id
timesheet_rate_cards	org_id
timesheet_rates	org_id
timesheet_settings_history	org_id
timesheet_settings	org_id
timer_sessions	org_id```

---

## 4. `EXPLAIN (ANALYZE, BUFFERS)` evidence — measured, on a seeded four-tenant database

**Superseded 2026-09-02.** The original §4 said only one representative plan had been taken and
that it was not statistically meaningful, because `scratch_boot_c` held 5 non-empty tables out of
1,026. That was correct then. `scratch_perf_seed` now exists — journal head, 1,699 MB, 88 non-empty
tables, four application tenants at 89.93 / 9.0 / 0.90 / 0.18 percent — so the plans have been taken.
The old paragraph is kept at the end of this section as the record of what the earlier verdict rested
on.

### 4.1 What was measured, and why in this shape

Ticket 08 has already executed the removal lists: `0999_s08_drop_redundant_indexes` (337 drops),
`1003_s08_residual_duplicate_keys` (15) and `1002_s08_payroll_read_path_indexes` (2) are journalled
and applied — **354 indexes**, and `scratch_perf_seed` holds 4,733 indexes where `scratch_boot_c`
held 5,067. So the question is no longer "may these be dropped" but **"did dropping them cost
anything on production-shaped, multi-tenant data"**, which is the same question with the answer
falsifiable.

Harness: `BE/test/perf/measure-index-redundancy.mjs`, candidate list
`BE/test/perf/index-redundancy-candidates.json` (all 354, with the definition each `DROP` removed,
recovered from `scratch_boot_c` at 637). Raw output:
`reports/07-index-redundancy/index-redundancy.{json,txt}`.

For each candidate, in one transaction that is rolled back:

1. `SET LOCAL ROLE streamline_app` — `rolsuper = false`, `rolbypassrls = false`, so the RLS
   predicate is in every plan. The runner refuses to start unless a no-GUC read fails, and it does
   (`no tenant context: app.organization_id is not set for this transaction`).
2. `EXPLAIN (ANALYZE, BUFFERS)` of an equality probe on the dropped index's key columns, and where
   the index has more than one key column an ordered-page probe on its leading columns, **once per
   tenant** — large, mid, small and tiny — with values sampled from that tenant.
3. `RESET ROLE`, recreate the dropped index, `SET LOCAL ROLE` back, and run the identical probes.

Same session, same cache, same statistics; the only difference is the index. Measuring one tenant
would have been worthless: with a single distinct `org_id` the tenant column has selectivity 1.0, so
an `org_id`-leading index discriminates nothing and reads as redundant by construction.
`reports/00-seeded-perf-database.md` §7b is the counter-example — the same query picks
`idx_inv_txn_org_created` for 6 buffers on the 0.18% tenant and walks the org-less
`idx_inv_txn_created` for 1,237 on the 89.9% tenant.

`--self-test` covers the definition parser, the buffer summation over a plan tree, the index-name
collection and the scratch-target guard: **13/13 pass**.

### 4.2 Result

```
354 candidates
  319  NO_QUERY             no tenant holds a row on that table on this seed — still structural-only
   22  CHOSEN_NO_GAIN       the planner picks the dropped index when it exists, and it saves nothing
    7  CONFIRMED_REDUNDANT  the planner declines the dropped index even when it exists
    6  REGRESSION           the planner picks it AND it more than halves buffers on some tenant
```

**28 of the 35 measurable drops are confirmed safe on real data.** Notable: `public.users
idx_users_email` versus `users_email_unique` — 6 buffers with or without, on all four tenants, and
the planner switches to whichever exists. `build.tickets idx_tickets_org_assignee_membership`,
`inv_stock_transactions idx_inv_txn_org_variant` (166,800 rows) and `event_attendees
idx_event_attendees_org_event` (139,020 rows) are all flat.

### 4.3 Six drops that a seeded database says were not free — for ticket 08

Every one is the same shape: a **narrow `(org_id)` index dropped in favour of a much wider index it
is a strict prefix of**. Prefix containment is a *reachability* property — the wider btree can
answer every predicate the narrow one could. It is not a *cost* property, because the wider index is
physically larger, and for a majority tenant the planner then prefers a sequential scan over
descending it. The effect appears **only on the large tenant** in five of the six cases; on the
minority tenants every one of them is flat. That is the mirror image of §7b in the infrastructure
report, and it is why one tenant is never enough.

| table | dropped | survivor named in `0999` | tenant | buffers now | with the index back |
|---|---|---|---|---|---|
| `contacts` (8,896) | `idx_contacts_org` | `idx_contacts_name_email` | large | **645** — Seq Scan | **30** |
| `inv_stock_levels` (13,344) | `idx_inv_stock_org` | `uniq_inv_stock_levels_natural_key` | large | **609** | **39** |
| `hr_people` (7,171) | `idx_hr_people_org` | `uniq_hr_people_org_id` | large | **306** | **24** |
| `chat_channel_members` (2,289) | `idx_chat_channel_members_org` | `idx_chat_channel_members_membership_id` | large | **108** | **12** |
| `organization_people` (501) | `idx_org_people_org` | `uniq_org_people_org_person` | large | **39** | **6** |
| `inv_locations` (223) | `idx_inv_locations_warehouse` | `uniq_inv_locations_warehouse_code` | mid | **18** | **4** |

The probe is `SELECT count(*) FROM <table> WHERE org_id = $1` — the pagination-total shape. It is not
synthetic: `modules/inventory/settings/settings.service.ts:137` is exactly
`select({ count: sql`count(*)::int` }).from(invStockLevels).where(eq(invStockLevels.orgId, orgId))`,
and `modules/party/party-legacy-seam.ts:444` is the same shape on `contacts`.

Sizes explain it. On `contacts` the heap is 1,720 kB (215 pages) and the surviving
`idx_contacts_name_email` is **1,968 kB** — larger than the table — so the planner reads the heap
instead, and CLAUDE.md §3's "no full-table scans" is violated on the majority tenant. The dropped
`(org_id)` index would have been ~72 kB.

**Verdict for ticket 08:** these six are a **REFACTOR, not a revert**. Restoring six single-column
`(org_id)` indexes gives back exactly what was measured. Where a narrower index than the survivor is
wanted without re-adding write amplification, `(org_id, id)` already exists on `contacts`,
`hr_people` and `chat_channel_members` (`uniq_*_org_id`) and is smaller than the wide survivor — the
planner declined it here for the 90% tenant on cost, which is a `default_statistics_target` /
`random_page_cost` question, not a schema one. Do **not** batch this with the other 348.

### 4.4 The `EXPLAIN` half is not applicable to FKs, uniques and checks — measured a different way

A plan never mentions a foreign key or a check constraint, so `EXPLAIN (ANALYZE, BUFFERS)` on a read
cannot evidence S18's overlapping-FK verdict. The instrument for that is `EXPLAIN (ANALYZE)` on a
**write**, which reports per-constraint trigger time and call counts.

**S18 has grown from 5 pairs to 172 at head.** Re-derived from `pg_constraint` on
`scratch_perf_seed`: 172 pairs where a single-column FK and a composite `(org_id, col)` FK point at
the same parent, **25 of them on non-empty tables**. Migrations `0985`/`0986`/`0995` added composite
tenant FKs beside pre-existing single-column ones without removing the narrow member, which is why
the number moved.

Measured, `INSERT … SELECT` of 1,000 rows into `inv_stock_transactions` as `streamline_app` with the
tenant GUC, rolled back:

```
A. as shipped                                   B. the two redundant single-column FKs removed
  inv_stock_transactions_org_id_…    calls=1000   inv_stock_transactions_org_id_…    calls=1000
  …_product_variant_id_…             calls=1000   ── gone ──
  …_location_id_inv_locations_id_fk  calls=1000   ── gone ──
  …_created_by_users_id_fk           calls=1000   …_created_by_users_id_fk           calls=1000
  fk_…_product_variant_id_org        calls=1000   fk_…_product_variant_id_org        calls=1000
  fk_…_location_id_org               calls=1000   fk_…_location_id_org               calls=1000
  fk_…_correction_of_org             calls=1000   fk_…_correction_of_org             calls=1000
  fk_inv_stock_txn_cre_mbr           calls=1000   fk_inv_stock_txn_cre_mbr           calls=1000
  8 triggers                                      6 triggers
```

**2,000 fewer trigger invocations per 1,000 inserts** — 2,000 fewer `SELECT 1 FROM <parent> … FOR KEY
SHARE` probes and row locks on the parent. The deterministic number is the call count; the wall clock
is not usable here and is reported as such — three paired runs gave 75.97 → 27.26 ms, 53.36 → 29.26 ms
and 33.21 → 33.52 ms, which is exactly the "wall clock lies on a warm cache" CLAUDE.md §7 warns about.
Trigger cost is not attributed to buffers by `EXPLAIN`, so buffers cannot score this and are not
claimed.

Dropping the narrow member is safe by construction: `org_id` is `NOT NULL`, the parent carries a
`UNIQUE (org_id, id)`, and both constraints are `MATCH SIMPLE`, so the composite enforces everything
the single-column one did and additionally pins the child to its parent's tenant.

### 4.5 What §3.1 and §3.2 rested on before this seed existed (kept for the record)

```
EXPLAIN (ANALYZE, BUFFERS) SELECT id FROM audit_logs WHERE org_id='x' ORDER BY created_at DESC LIMIT 20;

 Limit  (cost=0.12..8.14 rows=1) (actual time=0.004..0.004 rows=0.00 loops=1)
   Buffers: shared hit=2
   ->  Index Only Scan using idx_audit_logs_org_created_id on audit_logs
         Index Cond: (org_id = 'x'::text)
```

The planner chose the wider `idx_audit_logs_org_created_id` and not the narrow
`idx_audit_logs_org_id`, corroborating the containment claim on one case. It was explicitly not
presented as statistical evidence: `scratch_boot_c` held 5 non-empty tables and
`pg_stat_user_indexes.idx_scan` there measured the bootstrap. §3.1/§3.2 therefore rested on
structural index containment read from `pg_indexes`, which is deterministic and needs no data, and no
index was ever proposed for removal merely for being "unused". §4.3 is the case where that basis,
though sound for reachability, turned out to be insufficient for cost.

---

## 5. JSONB properties: normalize or index (ticket checkbox 4)

457 live JSONB columns; exactly **two** jsonb-aware indexes exist in the whole database.
Every other GIN index is trigram or tsvector on a plain text column.

| Column | How it is used | Indexed? | Verdict |
|---|---|---|---|
| `audit_logs.metadata->>'moduleKey'` | equality filter, `module-access.service.ts:309` | **yes** — `idx_audit_logs_org_module_created` (expression) | **KEEP** — this is the pattern |
| `hr_employments.custom_field_values` | `@>` and `?` filters, `hr-custom-fields.service.ts:257` | **yes** — GIN `jsonb_path_ops` | **KEEP** |
| `survey_response_sessions.metadata->>'liveSessionId'` | equality `WHERE`, twice (`survey-live-participant.service.ts:90,114`) | no | **REFACTOR — normalize.** This is a join key living in a payload; it belongs in a real column with an index and an FK |
| `org_units.metadata->>'address'` | `ILIKE` search filter (`org-hierarchy-locations.service.ts:86`) | no | **REFACTOR — normalize.** Address is a first-class org-unit field, not opaque payload |
| `org_units.metadata->>'email'` | `ILIKE` search filter (`org-hierarchy-branches.service.ts:125`) | no | **REFACTOR — normalize** |
| `support_ai_suggestions.payload->>'escalated'` | `count(*) filter (where …)` aggregate | no | **REFACTOR — index** (expression index) or promote to a boolean column |
| `business_parties.social_profiles->>'twitter'` | projected; named in `record-layout-catalog.ts:169` as a **documented access path** | no | **KEEP as JSONB, index if it becomes filterable.** A documented path — do not remove |
| remaining ~450 | stored and read whole | n/a | **KEEP** — legitimate payload |

Separately, **229 of 402** declared JSONB columns carry no `$type<>` (row S22). Untyped
`jsonb()` surfaces as `unknown` at the use site, which is exactly where the banned
`as any` gets introduced.

---

## 6. Not closable on this machine

- ~~**Real `EXPLAIN (ANALYZE, BUFFERS)` plans at representative volume.**~~ **CLOSED 2026-09-02.**
  `scratch_perf_seed` exists; 35 of the 354 executed drops were measured against four tenants and
  §4 carries the result. **319 remain structural-only** — their tables hold no rows on this seed, so
  no plan on them means anything, and the KEEP/REMOVE verdict for those still rests on §3's
  deterministic containment. That is a property of the seed's coverage, not of the method.
- **Deleting the 17 catalog-only permission keys (P03).** Blocked on running
  `classifyRetiredPermissions` against a database that holds real tenant role grants — a
  key granted in a customer's role must not be deleted. The classifier exists; the data does not.
- **Whether the 105 undeclared tables (S07) are pending merges or abandoned.** Resolving
  this requires branch comparison, and this session runs no git commands. It is stated as
  a *reconcile-or-schedule* verdict rather than guessed in either direction.

---

## 7. Regeneration recipe for ticket 08

Everything above is reproducible. Two things will silently break a re-run:

1. **Match both table declaration forms.** Discover `export const X = pgSchema("…")` first,
   then match `pgTable(` **and** `X.table(`. Matching only `pgTable(` loses 83 Build tables.
2. **Strip leading `//` and `/* */` comments from each column entry** before parsing
   `name: type(...)`. Not doing so drops 200 columns and fabricates missing primary keys.

Index removal lists regenerate from any bootstrapped database with:

```sql
SELECT schemaname, tablename, indexname, indexdef
FROM pg_indexes WHERE schemaname IN ('public','build','build_events');
SELECT c.relname, con.conname, con.contype
FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid
JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname IN ('public','build','build_events');
```

then, per table, group by the definition with the leading `CREATE [UNIQUE] INDEX <name> ON`
stripped (exact duplicates) and test strict column-prefix containment for same-access-method,
non-partial indexes (prefix-redundant), applying the two selection rules in §3.1.

Suggested execution order for ticket 08, cheapest and safest first:

0. **DONE.** S14 + S15 were executed as `0999`/`1003`/`1002` — 354 drops. **Before closing them,
   read §4.3: six of those drops are measured regressions on the majority tenant and need six
   `(org_id)` indexes restored.** S18 has grown to 172 pairs (§4.4).
1. ~~**S14 + S15** — 341 index drops.~~ Superseded by item 0.
2. **P18, P20, P25, P39, P43** — dead registry entries with zero readers
   (12 contract entries, 7 universal roots, 9 query namespaces, 2 env vars, 1 flags table).
3. **P27, P24, P33, P16** — the P1 correctness and security defects. These are fixes, not
   deletions, and they are the rows with a user-visible failure attached.
4. **P09, P11, P28, P41** — re-point the four cross-repo guard tests at the sibling backend
   path and wire the three orphaned `check:*` gates into CI. Until this lands, every
   catalog-drift number in this report is unenforced and will rot again.
5. **S16** — 151 `CREATE INDEX CONCURRENTLY`.
6. **S07 / S03** — the 105 undeclared tables and their 16 RLS gaps. Needs a product decision
   per module; do not batch with the mechanical work.

Deferred and explicitly not to be touched: **S01, S02, S06, S08, S09, S17, P05, P17, P34, P44.**

---

## 8. What must not be removed, and why

Recorded so a later sweep does not re-propose them:

- **554 `unique(org_id, id)` anchors and 883 RLS policies** — tenant isolation.
- **All 1,469 + 949 foreign keys** — referential integrity. S16/S17 add indexes; they remove
  nothing.
- **23 `hrms-phase1-sql-managed` tables + 21 guard-only tables** — unimported by design,
  asserted by `migration-integrity.spec.ts` and `check:hr-table-freeze`. knip reports them
  as unused; that is the design, not a finding.
- **49 `notifications` partition children** — never named in code by construction.
- **6 customer webhook event names** — a de-facto published contract with no tooling
  protecting it. Renaming one passes every gate and breaks every subscriber.
- **`business_parties.social_profiles->>'twitter'`** — a documented access path in
  `record-layout-catalog.ts`.
- **160 permission-free authenticated routes** — all reconcile as `universal`/`in-service`.
- **The 40 unwired notification catalog entries** are *not* on the remove list: they render in
  a customer-facing preferences screen, so retiring them is a product decision, not cleanup.

"May be useful later" appears as a justification nowhere in this report. Every KEEP above
names either a live consumer, a database invariant, a published contract, or a specific
test/gate that asserts the arrangement.
