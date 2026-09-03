# Ticket 02 — Schema and executable-key minimization — audit at head

**Audited:** 2026-09-03 · READ-ONLY wave · no source file was modified.
**Backend head:** `2f37e1bb035006e5c03680497298ad62031e79d6` (`release/code-10-10-v2`)
**Frontend head:** `7469d27895add587f9427e7c50c457f56e0048bf` (`release/code-10-10-v2`)
**Prior report for this ticket:** none. All evidence below was reconstructed from scratch.
**Databases used:** `scratch_head_1010` (journal head, 944 tables — owner + `streamline_app`),
`scratch_perf_seed` (1,729 MB, 945 tables, 8 orgs, 166 k-row largest table) for `EXPLAIN (ANALYZE, BUFFERS)`.

---

## 1. What I read, with numbers

### 1.1 Database catalog (`scratch_head_1010`, measured, not inferred)

| Dimension | Count |
|---|---|
| tables (`public`, `relkind='r'`) | **944** |
| columns | **12,580** |
| primary keys | **944** (0 tables without a PK) |
| foreign keys | **2,892** |
| unique constraints/indexes | **869** |
| check constraints | **305** |
| exclusion constraints | **5** |
| indexes (total) | **4,390** |
| GIN indexes | 44 |
| partial indexes whose predicate names a lifecycle column | **214** |
| tables carrying `org_id` / `organization_id` / `tenant_id` | **905** |
| tables with RLS enabled | **899** / 943 · **983** policies |
| `jsonb` columns | **456** across **345** tables |

### 1.2 Declaration side

| Dimension | Count |
|---|---|
| Drizzle schema files (`src/db/schema/**`) | **348** |
| `pgTable(` declarations across `src/` | **826** in **288** files |
| tables parsed by my census | **811** · **9,924** columns |
| migrations on disk | **677** `.sql` (959 files incl. `rollback/`, `pending/`) |
| declared tables / declared constraints+indexes (per `check:declaration-constraint-drift`) | **873** / **4,948** |
| live indexes / live constraints seen by that gate | **4,323** / **5,494** |

### 1.3 Executable-key registries

| Registry | Size | Source |
|---|---|---|
| OpenAPI paths / operations / operationIds | **2,700** / **3,642** / **3,642** | `openapi.json` |
| operations with a JSON **request** schema | **1,385** (38.0 %) | measured |
| operations with a 2xx JSON **response** schema | **20** (0.55 %) | measured |
| `components.schemas` | **6** | measured |
| permission catalog | **704** keys (gate) / **675** parsed by my regex over 36 files | `src/modules/rbac/permissions/**` |
| `@RequirePermission` usages / unique keys | **3,138** / **633** (24 pass a constant, not a literal) | `check:permission-keys` |
| frontend `PermissionKey` union | **704** keys | `check:permission-catalog` |
| module manifest modules | **22** | `module-manifest.json` |
| permission *prefixes* (what `moduleOf()` returns) | **35** | measured |
| event/command contract registry | **3,656** operations classified · **102** published · **23** webhook events | `check:contract-registry` |
| cache namespaces | **75** read / **76** bump · **131** `CACHE_KEYS` factories · 187 write shapes / 475 invalidate sites | `check:cache-invalidation`, `check:namespace-coverage` |
| env vars read (`process.env.X`) | **65** distinct | measured |
| frontend query-key catalog | **18** domain files, **926** factory entries | `lib/query-keys/*.ts` |
| frontend `useGatedQuery` call sites | **240** (229 read hooks classified: 225 GATED, 4 OFF-CONTRACT) | `check:command-catalog` |
| frontend routes (`page.tsx`) | **600** | measured |
| translation catalog | **0** — no `next-intl` / `react-i18next` / `useTranslations` anywhere | measured |

### 1.4 Code corpora walked by my own censuses

* backend non-schema files: **5,591** (`.ts/.tsx/.mjs/.js/.json/.sql`, 33.9 MB of text)
* frontend files: **5,452** (30.9 MB of text)
* migration files: **959**

### 1.5 Gates executed for this ticket (all exit codes recorded)

`check:tenant-indexes` 0 · `check:lifecycle-predicates` 0 · `check:restrict-fks` 0 ·
`check:conflict-targets` 0 · `check:relation-keys` 0 · `check:relation-hydration` 0 ·
`check:permission-keys` 0 · `check:namespace-coverage` 0 · `check:feature-flag-governance` 0 ·
`check:drop-column-safety` 0 · `check:migration-discipline` 0 · `check:unbounded-reads` 0 ·
`check:idempotent-commands` 0 · `check:declaration-column-drift` 0 · `check:declaration-constraint-drift` 0 ·
`check:referential-action-drift` 0 · `check:set-null-column-lists` 0 · `check:cache-invalidation` 0 ·
`check:unjoined-table-refs` 0 · `check:contract-registry` 0 · `check:tenant-relationships` 0 ·
`check:module-lifecycle` 0 · FE `check:query-scope` 0 · `check:query-signal` 0 ·
`check:permission-catalog` 0 · `check:command-catalog` 0 · `check:response-contracts` 0 · `check:contract-drift` 0.

**Every gate relevant to this ticket is green.** That is precisely why the ticket's real deliverable —
the inventory and the classification — is the thing that is missing; the gates below are ratchets
over grandfathered populations, not clean bills of health, and they say so themselves.

---

## 2. Per-criterion assessment

### PRD-C050 — PK strategy, tenant-scoped uniqueness, FK indexes, named constraints, referential actions, checks, money units, timestamps, audit columns — **PARTIALLY MET**

Walked in the order the criterion names them.

**a. Primary-key strategy.** 944/944 tables have a PK; 0 heap tables without one.
Shape: 876 single-column, 67 two-column, 1 three-column. Single-column PK types:
`integer` 632, `text` 142, `uuid` 54, `bigint` 48. Consistent and deliberate. **MET.**

**b. Tenant-scoped uniqueness.** 905 tables carry a tenant column. **167 non-PK unique
indexes on tenant tables do not include the tenant column.** I triaged all 167 by hand:
the great majority key on a parent id that is itself tenant-scoped (`book_id`, `run_id`,
`ticket_id`, `journal_id`, `article_id`) or on a globally-unique token/hash/external id —
both correct. Three were genuinely suspicious and I chased each to the source:

| Constraint | Verdict |
|---|---|
| `uq_payment_provider_accounts_provider UNIQUE(provider_id)` and the two `(provider_id, environment)` siblings | **FALSE ALARM.** `paymentProviders.id` is a `serial` on a *per-org* row, so `provider_id` is already org-distinct. `src/db/schema/billing/payment-providers.ts:53,76,95`. Correct as written. |
| `idx_api_keys_key_prefix UNIQUE(key_prefix)` | **REAL — finding F1 below.** |
| `affiliates_user_id_unique UNIQUE(user_id)` | **REAL — finding F2 below.** |

`uniq_subprocessor_subscribers_email UNIQUE(email)` is global with a nullable
`organization_id`; org A subscribing an address blocks org B and reveals its existence
via a 23505. Low blast radius (a subprocessor-change mailing list) — P2, noted not filed.

**c. FK indexes.** Census (counting a partial index as coverage, which is correct because
an RI probe only fires on non-NULL values):
**1,042 of 2,892 FKs (36 %) have no index whose leading columns match the FK column set.**
Parent-table concentration: `users` **333** (151 NO ACTION, 141 SET NULL, 41 CASCADE),
`inv_product_variants` 34, `organization_members` 19, `org_units` 17, `inv_locations` 16.

I measured the cost on `scratch_perf_seed`:

```
-- users <- inv_stock_transactions.created_by (166,800 rows, NO index)
Seq Scan on inv_stock_transactions  Buffers: shared read=3404   Execution Time: 45.575 ms

-- users <- attendance.user_id (10,008 rows, only (org_id,user_id,date) exists)
Index Scan using idx_attendance_org_user_date  Buffers: shared hit=8 read=5   Execution Time: 0.652 ms
```

The second plan matters: PG 18's index skip-scan covers a *non-leading* FK column, so the
naive "no leading index = seq scan" claim is wrong here and I am not making it. The first plan
is the real shape — 45.6 ms and 3,404 buffers for **one** of 333 probes. **NOT MET** as a
dimension, mitigated to P2 by the fact that there is **no production user hard-delete path**
(`grep` for `delete(users)` returns only `*.e2e-spec.ts` and `src/scripts/verify-membership-revocation.ts:457`).

**d. Named constraints.** Postgres-default names: 145/2,892 FKs (5.0 %), 55/869 uniques (6.3 %),
6/305 checks (2.0 %), 928/944 PKs (`_pkey`, conventional). A further 1,131 FKs (39 %) carry
Drizzle's derived `_<col>_<parent>_id_fk` name — machine-generated but deterministic and stable
across regeneration. ~206 constraints carry a name that conveys nothing. **PARTIALLY MET.**

**e. Referential actions.** `check:referential-action-drift` exits 0 — but only because
**15 declaration-vs-catalog divergences are baselined**, and the gate prints them:

* `DESTRUCTIVE project_members.fk_project_members_member_actor` — declared RESTRICT, live CASCADE
* `DESTRUCTIVE ticket_assignees.fk_ticket_assignees_member_actor` — declared RESTRICT, live CASCADE
* `BLOCKING payroll_run_employees.fk_payroll_run_employees_org_worker` — declared SET NULL, live RESTRICT
* 11 PERMISSIVE (declared RESTRICT/NO ACTION, live SET NULL) on `tickets`, `role_assignments`,
  `ticket_activity_log`, `ticket_comment_mentions`, `user_permission_grants`, `project_approvals`

Removing a membership silently destroys its `project_members` and `ticket_assignees` rows while
the Drizzle declaration promises they survive. **NOT MET** — see finding F7.

`check:set-null-column-lists` is clean: 564 declared SET NULL FKs, 276 requiring a column list,
**0 unreachable**; 805 catalog SET NULL constraints all match. `check:restrict-fks` clean over
346 schema files.

**f. Checks.** 305 check constraints over 944 tables — 0 duplicate check expressions on the
same table. Thin (0.32 per table) but nothing wrong is provable from the count alone.

**g. Money units.** Money-named columns are overwhelmingly `numeric`: `numeric(18,4)` 99,
`numeric(15,2)` 66, `numeric(5,2)` 14, plus 40 `bigint` and 87 `integer` minor-unit columns.
**13 `float4`/`float8` columns exist in the whole database**, and only two of them are
money-ish: `cell_capacity_measurements.per_org_cost` and `noisy_neighbour_reviews.share_ratio`
(both control-plane telemetry, not billed amounts). The rest are scores/probabilities/confidences,
where float is correct. **MET**, with F10 filed at P2.

Currency *units*: `legal_entities.functional_currency` is declared and **read by nothing**
(§PRD-C058) — the multi-currency seam exists in the schema and is inert in code.

**h. Timestamps.** **1,804 `timestamp without time zone` vs 470 `timestamp with time zone`.**
The default Drizzle `timestamp("created_at")` (no `withTimezone`) is used repo-wide, including
on `created_at`/`updated_at`/`posted_at`/`expires_at`/`locked_at` for accounting periods, payroll,
AI credit reservations and agent tokens. This is the schema half of the failure this repo has
already shipped once (a leave persisted a day early because nothing pinned `TZ`). **NOT MET** —
finding F9.

**i. Audit columns.** Over the 905 tenant tables: `created_at` on **773** (85 %),
`updated_at` on **493** (54 %), a `created_by*` column on **198** (22 %). 132 tenant tables carry
no `created_at` at all. **PARTIALLY MET.**

---

### PRD-C051 — normalized lifecycle/relationship tables; no actionable JSON arrays or polymorphic authority; no EAV outside an approved seam — **PARTIALLY MET**

**Actionable JSON/array authority columns — the full population is 9**, found by scanning all
456 jsonb columns and all array columns for authority-shaped names:

| Column | Type | Read as authority? | Class |
|---|---|---|---|
| `hr_position_transitions.allowed_roles` | jsonb | **YES** — `positions-workflow-utils.ts:107-112` gates a position state transition on `t.allowedRoles.includes(role)` | **REFACTOR** → `hr_position_transition_roles` |
| `workflow_transitions.allowed_roles` | jsonb | **YES** — `projects-tickets-workflow-utils.ts:148-154` gates a ticket transition | **REFACTOR** → a join table |
| `sign_templates.restricted_to_roles` | jsonb | **NO — inert.** Written, duplicated, returned; never a predicate anywhere in BE or FE | **REMOVE or enforce** — finding F4 |
| `sign_templates.restricted_to_teams` | jsonb | same | same |
| `api_keys.scopes`, `agent_tokens.scopes`, `user_api_tokens.scopes` | `text[]` | YES, but a token scope array is the conventional and correct shape | **KEEP** |
| `relationship_participants.roles`, `inv_audit_export_jobs.scope_warehouse_ids` | `text[]`/jsonb | descriptive / job-scoped, not an authorization decision | **KEEP** |

Two live authority arrays (`allowed_roles` × 2) is a small, precisely-bounded violation — but it
*is* a violation of the clause as written.

**Polymorphic relationships.** 61 tables carry a `*_type` + `*_id` discriminator pair. 47 of
those 61 are `notifications_*` monthly partitions of one table, so the distinct shape count is
**~24**. None of them is an *authority* relationship: they are audit (`audit_logs`,
`hr_audit_logs`, `inv_audit_events`), event (`hr_event_stream`, `notification_outbox`),
attachment (`kb_page_links`, `calendar_events`, `chat_channels`) or accounting-source
(`gl_journals.source_type/source_id`, `journal_entries`, `crm_commission_earnings`) pointers.
Polymorphic *authority* — the thing the clause forbids — is **absent**. **MET.**

**EAV.** Three tables: `custom_field_definitions`, `hr_employment_custom_field_values`,
`support_ticket_custom_field_values`. Each has a tenant-scoped uniqueness key
(`uniq_hr_ecfv_employment_field`, `uniq_support_ticket_custom_field_values_ticket_field`). This
is exactly the "approved custom-field seam" the criterion permits. No other EAV pattern found.
**MET.**

---

### PRD-C052 — soft-delete/archive policy and every active read's predicate; partial indexes — **PARTIALLY MET**

Lifecycle column census: `deleted_at` **109** tables, `archived_at` **65**, `is_archived` 2,
`is_deleted` 1, `removed_at` 1. (`status` appears on 313 tables but is a domain enum, not a
lifecycle flag, on most of them.)

`check:lifecycle-predicates` measured over **788 tables / 81 with a lifecycle column /
1,716 read sites across 3,306 files**:

* predicate in the statement: **769**
* predicate built elsewhere in the same file: **250**
* **dormant column** (a lifecycle column no code path ever writes): **111**
* **primary-read candidates (no predicate): 74** — at a baseline of 75
* **join candidates (no predicate): 335** — at a baseline of 335
* 177 reads of a global identity/tenant-root table are excluded by design

So **409 reads carry no lifecycle predicate and the gate passes because they are grandfathered.**
"Every active read" is not satisfied by a ratchet.

I hand-triaged the largest cluster to avoid filing noise. **24 of the 74 primary-read candidates
are `chatChannelMembers` reads.** Its lifecycle column is `archivedAt`
(`src/db/schema/chat/chat-channel-tables.ts:69`), written at
`chat-channel-members-implementation.ts:300` and cleared at `:315` — a *per-member "archive this
conversation"* flag. Member removal is a hard `DELETE` (`:170`, `:272`). Every one of those 24
reads is a membership-**existence** check where archived must not matter, and the one read where
it does matter applies it correctly (`chat-channel-list.service.ts:230`, and
`chat-reply-reminders.service.ts:187`). **The chat cluster is a false positive of the gate, and
head is correct here.**

**Partial indexes.** 214 partial indexes name a lifecycle column — a real, deliberate investment.
But **26 tables carry `deleted_at` with no partial index on it**, of which in scope:
`hr_accommodation_requests`, `hr_collective_agreements`, `hr_contracts`, `hr_data_requests`,
`hr_forms`, `hr_labor_cases`, `hr_legal_holds`, `hr_positions`, `hr_reorg_scenarios`,
`hr_union_memberships`, `hr_webhook_subscriptions`, `hr_work_authorizations`, `kb_sources`,
`organizations`, `portal_memberships`, `users`, `workers`. (`contacts`, `leads`, `crm_*` are
out of scope.)

**Verdict: PARTIALLY MET.** Policy and machinery exist and are well built; 409 grandfathered
reads and 111 dormant lifecycle columns are outstanding, and 17 in-scope tables lack the
partial index the access pattern implies.

---

### PRD-C057 — inventory and classify every in-scope column, constraint, index, JSONB key and executable-key registry as KEEP / REFACTOR / REMOVE with owner and failure prevented — **NOT MET**

**No inventory artifact exists at head.** `reports/02-inventory/` is an empty directory. A
repo-wide search for an inventory/classification document turned up nothing but source files
named `inventory`. Nothing in either repo assigns KEEP/REFACTOR/REMOVE, an owner, or a
"concrete failure prevented" to a column, constraint, index, JSONB key or registry entry.

What *does* exist is the raw material — which is why this criterion is reconstructible rather
than blocked. Below is the registry-level classification the criterion asks for, produced from
the censuses in §1. It is a starting inventory, not the finished artifact.

| Registry | Size | Class | Reason / concrete failure prevented |
|---|---|---|---|
| Routes (`openapi.json` operations) | 3,642 | **KEEP** | `check:operation-ids`, `check:route-duplicates`, `check:contract-registry` all green; 3,656 operations classified, 102 published carry a version + named consumer |
| Permission catalog | 704 (675 parsed) | **REFACTOR** | 43 keys bound to no route; 11 with zero backend reach; 3 parallel payroll families — findings F3, F5 |
| Module manifest | 22 modules | **REFACTOR** | 13 of 35 permission prefixes have no owning module: `self, payments, ai, reports, ownership, integrations, branch, storage, onboarding, dashboard, tasks, sales, audit-log`. `moduleOf()` returns a string the entitlement catalog does not know |
| Event / command catalog | 3,656 classified · 23 webhooks | **KEEP** | `check:contract-registry` green; unknown event keys rejected at the relay (`notification-outbox-relay.service.ts:85`) |
| Cache namespaces | 75 read / 76 bump / 131 factories | **REFACTOR** | 1 dead bump (`chat:unread` — invalidated, never read); 4 unresolved module-local factories |
| Query-key factories (FE) | 926 entries, 18 files, 1 base | **KEEP with a gap** | one typed, domain-owned catalog with a contract test; only 6 factories carry the permission dimension — finding F12 |
| Configuration / env vars | 65 distinct `process.env.*` | **KEEP** | validated through `env.validation.ts`; no census found an unread one |
| Feature flags | `feature_flags` table | **REFACTOR** | `rollout_percentage` and `org_overrides` are declared and read by nothing — the rollout mechanism does not exist (F8) |
| Translations | **0** | **N/A** | there is no i18n catalog in this codebase; the clause has no target |
| Columns | 9,924 declared / 12,580 live | **REFACTOR** | 90 with zero reach (F8); 111 dormant lifecycle columns |
| Constraints | 5,010 (f/u/c/p/x) | **REFACTOR** | 9 duplicate FK pairs (F6), 15 baselined referential-action divergences (F7), ~206 opaque names |
| Indexes | 4,390 | **KEEP** | 0 true exact duplicates; 12 prefix-overlaps that must NOT be dropped (§PRD-C059) |
| JSONB keys | 456 columns / 345 tables | **KEEP** | only 4 raw `->>` predicates exist repo-wide; 3 of 4 are correct — see PRD-C058 |

---

### PRD-C058 — remove unused columns and JSONB properties only after proving zero reads/writes across every consumer; frequently filtered JSONB must be normalized or indexed — **PARTIALLY MET**

**JSONB half — largely MET.** Across `src/modules/**` there are exactly **4** raw
`jsonb ->> 'key'` SQL predicates:

| Site | Indexed? |
|---|---|
| `module-access.service.ts:309` — `audit_logs.metadata->>'moduleKey'` | **YES** — `idx_audit_logs_org_module_created ON (org_id, ((metadata ->> 'moduleKey')), created_at DESC)`. Head gets this exactly right. |
| `calendar-sync-status.service.ts:97` — `calendar_provider_sync_queue.payload->>'userId'` | No, but the query is already narrowed by `org_id + event_id + operation` and takes `limit 1`. Acceptable. |
| `survey-live-participant.service.ts:90` and `:114` — `survey_response_sessions.metadata->>'liveSessionId'` | **NO index** — finding F11 |

So the "opaque payload silently filtered" anti-pattern occurs on **one** column out of 456.

**Column half — NOT MET (nothing has been removed, and nothing has been proven).**
`check:drop-column-safety` (677 migrations, 126 dropped columns, 349 schema files) proves only
that a *dropped* column is not still declared. It does not identify an unused one.

I ran the reachability census the criterion describes. Corpus: **9,924 declared columns** parsed
from **348 schema files / 811 tables**, matched on **both** the Drizzle camelCase property and the
snake_case SQL name against **5,591 backend non-schema files (33.9 MB)**, **5,452 frontend files
(30.9 MB)** and **`openapi.json`**.

**Result: 90 columns have zero token reach anywhere outside their own schema declaration.**
Grouped, with my classification:

| Table | Columns | Class | Failure the removal (or the wiring-up) prevents |
|---|---|---|---|
| `legal_entities` | 12 — `functional_currency`, `cin`, `llpin`, `udyam_number`, `pt_registration_number`, `lwf_code`, `registered_address`, `data_residency_region`, `invoice_prefix`, `invoice_fy_reset`, `invoice_series`, `parent_legal_entity_id` | **REFACTOR** | a declared multi-currency + Indian-statutory + invoice-numbering seam that no code reads. Either it is dead weight, or every one of these is a compliance field the app silently ignores |
| `accounts` | 4 — `refresh_token`, `id_token`, `session_state`, `token_type` | **REMOVE** | dead OAuth credential material at rest with no consumer — a breach-surface with zero benefit |
| `feature_flags` | 2 — `rollout_percentage`, `org_overrides` | **REFACTOR** | `check:feature-flag-governance` passes on owner/removal-date columns while the actual rollout mechanism is inert. A flag set to 10 % rolls out to 100 % |
| `permissions` | 1 — `risk_class` | **REMOVE** | a risk classification on the permission catalog that no gate, guard or UI consults |
| `modules_catalog` | 1 — `is_paid_only` | **REFACTOR** | paid-only module gating is not enforced by the column that declares it |
| `payroll_runs` / `payroll_periods` | `input_snapshot_hash`, `calendar_snapshot`, `cutoff_at` | **REFACTOR** | `input_snapshot_hash` is an idempotency/version field per PRD-C063's own language — it is declared and never computed, so the replay guard it implies does not exist |
| `notification_consents` | 2 — `granted_at`, `withdrawn_at` | **REFACTOR** | consent timestamps recorded nowhere; a GDPR claim with no evidence trail |
| `sign_envelopes` / `sign_recipients` / `sign_documents` / `sign_fields` / `sign_bulk_send_jobs` / `sign_audit_events` | 10 — incl. `correction_required_at`, `correction_reason`, `bounced_at`, `delegated_to_recipient_id`, `conversion_error`, `geolocation_json` | **REFACTOR** | e-sign lifecycle states that are stored and never surfaced — a bounced recipient looks identical to a pending one |
| `payment_provider_accounts` / `payment_webhook_events` / `billing_*` / `coupons` / `referrals` / `dunning_attempts` / `app_installations` / `marketplace_apps` | 14 | **REMOVE** (mostly) | unreferenced billing metadata |
| remaining 41 across 41 tables | 1 each | mixed | see the raw census; includes `email_suppressions.suppressed_at`, `org_modules.enabled_at`, `chat_huddle_participants.is_camera_off`, `tenant_ai_credits.last_reset_at`, `timesheets.timer_session_id` |

I verified the six highest-stakes by direct grep: `risk_class`, `is_paid_only`,
`rollout_percentage`, `org_overrides`, `input_snapshot_hash`, `functional_currency` — **all
return 0 files in both repos** outside the schema file, in both naming conventions.

**Honest limits of this census.** It proves zero *token* reach through Drizzle property names and
snake_case SQL names in backend code, frontend code and `openapi.json`. It does **not** discharge
the criterion's full burden: it cannot see a column reached only via `select *` / row spread, and
it did not walk external contracts, warehouse exports or a search/vector ingestion pipeline
outside these two repos. Every entry above is a **candidate requiring one more proof step**, not
a cleared removal.

---

### PRD-C059 — detect redundant/overlapping FKs, uniques, checks and indexes from declarations, `pg_catalog`, `EXPLAIN (ANALYZE, BUFFERS)` and workload statistics; statistics alone never justify deletion — **MET for detection, and head's restraint is correct**

Ran all five detectors against `scratch_head_1010`:

| Detector | Result |
|---|---|
| exact duplicate indexes (same table, key, predicate, **and access method**) | **0.** The single candidate — `idx_inv_variants_barcode` vs `idx_inv_variants_barcode_trgm` — is btree vs `gin (barcode gin_trgm_ops)`. Not a duplicate. Migration `0999_s08_drop_redundant_indexes.sql` already removed the real ones |
| duplicate **check** constraints (same table, same expression) | **0** |
| duplicate **unique** constraints | 0 beyond the FK pairs below |
| duplicate **foreign keys** (same table, same columns, same parent) | **9** — finding F6 |
| **prefix-overlapping** indexes (A's columns a strict leading prefix of B's, same AM) | **12** |

The 12 prefix overlaps are: `calendar_events`, `chat_channel_members` ×3, `contacts` ×2,
`hr_people`, `inv_locations`, `inv_stock_levels` ×2, `inv_stock_transactions`,
`organization_people`. **All 12 must be classified KEEP.** This repository has already measured
what happens when a narrow `(org_id)` index is dropped under a wider one: seven measured
regressions, visible only under tenant skew. That is exactly the failure the criterion's own
sentence — *"Statistics alone never justify deletion; preserve every constraint/index required
for tenant isolation"* — is written to prevent, and head currently complies by keeping them.

**`EXPLAIN (ANALYZE, BUFFERS)` evidence taken** (on `scratch_perf_seed`, 1,729 MB, 4 application
tenants at 89.93 / 9.00 / 0.90 / 0.18 %):

```
-- unindexed FK probe, 166,800-row child
EXPLAIN (ANALYZE, BUFFERS) SELECT 1 FROM ONLY inv_stock_transactions x
  WHERE x.created_by = 'no-such-user' FOR KEY SHARE OF x;
  Seq Scan  Buffers: shared read=3404   Execution Time: 45.575 ms

-- non-leading FK column served by skip scan, 10,008-row child
EXPLAIN (ANALYZE, BUFFERS) SELECT 1 FROM ONLY attendance x
  WHERE x.user_id = 'no-such-user' FOR KEY SHARE OF x;
  Index Scan using idx_attendance_org_user_date  Buffers: shared hit=8 read=5  Execution Time: 0.652 ms

-- composite tenant FK, correctly covered by a PARTIAL index
EXPLAIN (ANALYZE, BUFFERS) SELECT 1 FROM ONLY inv_stock_transactions x
  WHERE x.created_by_membership_id = 999999 AND x.org_id = '…0001' FOR KEY SHARE OF x;
  Index Scan using idx_inv_stock_txn_cre_mbr  Buffers: shared hit=2  Execution Time: 0.146 ms
```

The middle plan is why I revised my own first FK census downward from 1,197 to 1,042 and why I do
not claim a seq scan for every uncovered FK.

**Workload/index statistics: NOT MEASURED.** `pg_stat_user_indexes.idx_scan` on
`scratch_perf_seed` reflects only the seeding writes and my own probes, not production traffic.
Measuring it needs `pg_stat_statements` and index-scan counters from a real workload over a
representative window — not available on this laptop and not synthesizable. **This does not
weaken any conclusion above**, because the criterion forbids using statistics to justify deletion
anyway; statistics could only ever add a KEEP.

---

### PRD-C061 — remove dead/duplicate code keys and aliases from every catalog only after static and runtime proof; unknown dynamic string keys rejected at their seam — **PARTIALLY MET**

**Seam rejection — MET.** Unknown keys are rejected, not tolerated, at every seam I could find:

* `rbac.service.ts:120` — `Unknown permission key: …` (BadRequest)
* `role-permission.service.ts:176` — same, on bulk role writes
* `common/rbac/grantability.ts:130` — `Unknown permission key(s): …`
* `api-tokens/user/dto/user-api-tokens.schemas.ts:15` — Zod refinement, `"Unknown permission key"`
* `access-permission.resolver.ts:247` — an uncatalogued grant is **omitted** from the resolved map
* `notification-outbox-relay.service.ts:85` — `event key is not in the catalog: …` (throws)
* `PermissionGuard.canActivate` (`src/modules/access/permission.guard.ts:25-32,41-47`) —
  **fails closed**: no key ⇒ 403 unless `@Public`; any error during authorization ⇒ 403.

**Dead keys — NOT MET.** Census over **675 catalog keys** from 36 files against
`openapi.json` + 5,904 backend files + 5,449 frontend files:

* **0 keys with zero reach anywhere** — good.
* **43 keys are bound to no route in `openapi.json`.**
* **11 of those have `be=false`** — present only in the two vendored catalogs and the frontend
  `PermissionKey` union, referenced by no route decorator and no gating call site:
  `hr:bank-details:view`, `hr:payroll:publish`, `hr:payroll:export`, `hr:loans:view`,
  `accounting:receivables:manage`, `accounting:receivables:approve`, `reports:create`,
  `settings:onboarding:manage`, `feedbucket:submissions:assign`, plus two CRM keys (out of scope).

`hr:bank-details:view` is described in the catalog as *"View unmasked employee bank account
details (sensitive)"* and is enforced on nothing. Grep confirms it appears only at
`streamlineos-backend/src/modules/rbac/permissions/hr-enterprise.permissions.ts:243`,
`streamlineos-frontend/frontend/lib/rbac/permissions/hr.ts:252` and the union at
`permission-key-extended.ts:213`.

**Runtime registration/caller proof: NOT MEASURED.** The criterion requires runtime proof, not
only static. That needs a booted backend with per-route guard telemetry over a representative
request set. Not runnable under this wave's budget — see §5.

**Other catalogs.** `check:namespace-coverage` reports **1 dead cache bump**
(`chat:unread` — invalidated by code, read by no `cachedVersioned*`) and 4 module-local factories
it cannot resolve (`ACCT_STATEMENTS_NS`, `ADMIN_POSTS_CACHE_NAMESPACE`,
`CACHE_KEYS.hrEmployeesListNamespace`, `PA_LIST_NAMESPACE`). The command catalog is fully
classified (30 SELF / 16 IN-SERVICE / 15 PUBLIC / 13 OFF-CLIENT, 0 unclassified).

---

### PRD-C062 — one typed, domain-owned factory per key family; no ad-hoc literals, parallel aliases or global dumping grounds; tenant/subject/scope/filter/sort/cursor/version/permission dimensions retained — **PARTIALLY MET**

**One typed factory per family — MET on the frontend, VIOLATED on permissions.**

*Frontend query keys:* one catalog (`lib/query-keys/`, 18 domain files, 926 entries) over one
base (`lib/query-keys/base.ts` = `["streamlineos"]`), with `key-factory-contract.test.ts` parsing
every declared factory with the TypeScript compiler and asserting it resolves and that its
parameters reach the key. `check:query-scope` (5,360 files, exit 0) bans inline `queryKey: [...]`
literals, `new QueryClient()` outside three sanctioned factories, and `queryKeyHashFn` outside
three sanctioned files. This is a genuinely well-built single catalog. **KEEP.**

*Permissions:* **three parallel families cover the same payroll surface.**

| Family | Keys | Route-bound | `moduleOf()` ⇒ entitlement module |
|---|---|---|---|
| `payroll:*` | 26 | all 26 | **`payroll`** (planGated: true) |
| `hr:payroll:*` | 8 | 5 (10 route bindings) | **`hr`** (planGated: true) |
| `hr:payrolls:*` (plural) | 2 | **0** | `hr` |

`moduleOf()` is `permissionKey.slice(0, indexOf(":"))` (`src/modules/access/access-policy.ts:81`),
and `module-manifest.json` lists `hr` and `payroll` as two separate plan-gated modules with empty
`administersNamespaces`. So the same payroll workflow is entitlement-gated under two different
purchasable modules — finding F3.

**Dimensions in keys.**

* **Tenant + subject: MET, and elegantly.** The org and user are not in the key array; they are
  folded into the hash by `scopedQueryKeyHashFn(authenticatedScope(orgId, userId))`
  (`lib/query-scope.ts:28-39`), applied on both the client `QueryProvider` and the server prefetch
  client, with a `key={scope}` remount as the second half of the guard. The file's own comment
  documents the exact bug this fixed (a dehydrated prefetch written under a hash nothing computes).
  One org's rows cannot be read under another's scope.
* **Filters / sort / cursor: MET** — factories take a `params?: Record<string, unknown>` tail and
  the contract test asserts parameters reach the key.
* **Permission / version: NOT MET.** The scope hash is `authenticated:<orgId>:<userId>` — it does
  **not** include an access version. Only **1 of 18 factory files** (`human-resources.ts`, ~6
  factories) threads `accessVersion` into the key. Against **240 `useGatedQuery` call sites**.
  Finding F12.

---

### PRD-C063 — remove unused request/response/DTO/Zod fields across backend, OpenAPI, frontend hooks/forms and persisted events as ONE contract change; never remove server-controlled tenant/actor, idempotency/version, authorization, audit or published-consumer fields without a migration path — **NOT MET, and NOT MEASURABLE at head**

The surface: **830 files containing `z.object(`**, **2,853 `z.object(` occurrences**,
**166 `dto/` directories**, **3,642 operations**.

The blocker is arithmetic, and I measured it directly from `openapi.json`:

| | count | share |
|---|---|---|
| operations | 3,642 | — |
| with a JSON **request** schema | 1,385 | 38.0 % |
| with any 2xx response declared | 3,641 | 99.97 % |
| **with a 2xx JSON response schema** | **20** | **0.55 %** |
| `components.schemas` | **6** | — |

**The response half of the contract does not exist.** Removing a response field from a backend
DTO cannot be detected as a contract change, cannot be diffed by
`check:contract-breaking-change`, and reaches the frontend only as an unchecked cast. The
frontend's own gate agrees and says so: `check:response-contracts` reports **2,665 seam calls,
84 carrying a contract (3.2 %), 2,581 unparsed against a baseline of 2,594**, and prints
*"97.8 % of the seam is still an unchecked cast. This gate freezes that debt; it does not retire
it."*

The protective half of the criterion **is** honoured where a contract exists:
`check:contract-registry` confirms all 102 published operations carry a version or dated
deprecation window, a named consumer, an idempotency/replay rule and a parameter baseline; and
23 outbound webhook event names are catalogued and versioned.

**Verdict: NOT MET.** No unused DTO/Zod field removal has been performed as one contract change,
and with 0.55 % response-schema coverage it cannot be performed safely until the response
contract is populated. This is ticket 04's territory as much as 02's.

---

## 3. Findings

| # | Sev | File:line | Summary | Failure scenario | Proposed fix |
|---|---|---|---|---|---|
| **F1** | **P1** | `src/db/schema/common/auth-session-security.ts:35` (+ `src/modules/settings/settings.helpers.ts:40`, `settings.service.ts:112-124`) | Deployment-global `UNIQUE(key_prefix)` over a 4,096-value keyspace | `generateApiKey()` builds `rawKey = "streamlineos_" + 64 hex` and `keyPrefix = rawKey.slice(0,16)`. `"streamlineos_"` is 13 chars, so the prefix carries **3 hex characters = 4,096 distinct values**, and `idx_api_keys_key_prefix` is UNIQUE across every organization. `createApiKey` has no `onConflict` and no retry. With N keys deployment-wide, a new key collides with probability N/4096: ~2.4 % at 100 keys, ~24 % at 1,000, certain at 4,096. Org B's key creation 500s because org A holds that prefix. | Slice a prefix that includes real entropy (e.g. `rawKey.slice(0, 13 + 12)`), or scope the index `UNIQUE(org_id, key_prefix)`, or retry on 23505. Note `err.code === "23505"` is dead under Drizzle — SQLSTATE lives on `.cause` |
| **F2** | **P1** | `src/db/schema/billing/billing.ts` (`affiliates`, migration `0000_light_vance_astro.sql:9899`) + `src/modules/billing/core/affiliate.service.ts:33-45` | Global `UNIQUE(user_id)` on a table whose service pre-checks a different key | `register()` checks for an existing row on `(orgId, userMembershipId)`, finds none, then inserts. The DB constraint is `affiliates_user_id_unique UNIQUE(user_id)` — **global**. A user already an affiliate in org A who registers in org B: pre-check passes, insert raises 23503/23505, nothing catches it, the route 500s. Cross-tenant coupling with no diagnostic. | Change the constraint to `UNIQUE(org_id, user_id)` in a migration, and align the service pre-check with it |
| **F3** | **P1** | `src/modules/access/access-policy.ts:81` + `module-manifest.json` + `src/modules/rbac/permissions/**` | Payroll authority split across two plan-gated entitlement modules | `moduleOf()` returns everything before the first `:`. `hr:payroll:approve|generate|lock|reopen|view` (10 route bindings) resolves to module **`hr`**; the 26 `payroll:*` keys resolve to module **`payroll`**. Both are `planGated: true` with empty `administersNamespaces`. An org that buys Payroll but not HR gets `ModuleDisabledException("hr")` — a 402 whose upgrade prompt names the wrong product — on payroll approve/lock/reopen, while the rest of payroll works | Migrate the 8 `hr:payroll:*` keys onto the `payroll:*` family with a deprecation alias, or declare `payroll` in `hr`'s `administersNamespaces` if the split is intentional |
| **F4** | **P1** | `src/db/schema/e-sign/templates.ts:18` + `src/modules/e-sign/sign-templates.service.ts:38-39,96-97,103-111` | `restrictedToRoles` / `restrictedToTeams` are an inert authority gate | Both are accepted by the create DTO (`e-sign.schemas.ts:181`), stored, copied on `duplicate()` and returned by `list()`/`get()`. **They are never a predicate.** `list(orgId)` returns every org template; `get()` returns any org template; `instantiate()` never consults them. Grep over 5,449 frontend files returns **zero** references, so the client does not enforce them either. An admin restricts a legal template to the Legal role; every user holding `sign:templates:read` still lists and instantiates it | Either filter `list`/`get`/`instantiate` on the caller's roles/teams, or drop both columns and the DTO fields as one contract change |
| **F5** | **P1** | `src/modules/rbac/permissions/hr-enterprise.permissions.ts:243` (+10 more) | 43 catalog permission keys bound to no route; 11 with zero backend reach | The catalog advertises authority that nothing enforces. `hr:bank-details:view` — *"View unmasked employee bank account details (sensitive)"* — appears only in the two catalogs and the FE union. Also `hr:payroll:publish`, `hr:payroll:export`, `hr:loans:view`, `hr:payrolls:read`, `hr:payrolls:manage`, `accounting:receivables:manage`, `accounting:receivables:approve`, `reports:create`, `settings:onboarding:manage`, `feedbucket:submissions:assign`. An operator grants `hr:bank-details:view`, believes access is now controlled, and the actual bank-details route is governed by some other key or none | Delete the dead keys, or bind each to the route it names. Add a gate assertion that every catalog key appears in `openapi.json` or in a named allowlist with a reason |
| **F6** | **P2** | `migrations/0000_light_vance_astro.sql` (`fin_reimbursement_batches`, `fin_expense_policies`, `exit_checklists`, `feedback_cycle_responses`, `invitation_events`, `workflow_variables`, `workflow_versions`) | 9 duplicated foreign keys — same table, same columns, same parent | e.g. `fin_reimbursement_batches` carries both `fin_reimbursement_batches_approved_by_users_id_fk` and `fin_reimbursement_batches_approved_by_fkey`. Every INSERT/UPDATE pays two identical RI checks and every parent DELETE probes the child twice — pure duplicated write cost, and two constraint names that can drift apart in a later migration | Drop one of each pair in a migration; keep the explicitly-named one |
| **F7** | **P2** | reported by `check:referential-action-drift` (baselined, printed on every run) | 15 declaration-vs-catalog referential-action divergences, 2 destructive | `project_members.fk_project_members_member_actor` and `ticket_assignees.fk_ticket_assignees_member_actor` are declared RESTRICT and live CASCADE: **removing a membership silently destroys its project-member and ticket-assignee rows** while the Drizzle declaration promises the delete is refused. `payroll_run_employees.fk_payroll_run_employees_org_worker` is the inverse (declared SET NULL, live RESTRICT), so a worker delete 23503s where the declaration says it succeeds | Reconcile each: change the declaration to match reality where reality is correct, or ship a migration where it is not. A baselined DESTRUCTIVE divergence should not survive a release |
| **F8** | **P2** | 90 sites; verified individually: `src/db/schema/common/auth.ts` (`permissions.risk_class`), `src/db/schema/common/modules.ts` (`modules_catalog.is_paid_only`), `src/db/schema/common/feature-flags.ts` (`rollout_percentage`, `org_overrides`), `src/db/schema/payroll/runs.ts` (`input_snapshot_hash`), `src/db/schema/common/legal-entities.ts` (12 cols) | 90 of 9,924 declared columns have zero reach in 5,591 BE + 5,452 FE files + `openapi.json` | Each is a promise the schema makes and the code does not keep. `feature_flags.rollout_percentage` set to 10 % rolls out to 100 %. `modules_catalog.is_paid_only` does not gate anything. `permissions.risk_class` is consulted by no guard. `payroll_runs.input_snapshot_hash` is an idempotency field that is never computed, so the replay guard it implies does not exist. `accounts.refresh_token`/`id_token`/`session_state` are dead OAuth credentials at rest | Produce the PRD-C057 inventory with these 90 pre-classified, then per entry either wire it up or drop it. Do **not** bulk-drop: `select *` reachability was not tested |
| **F9** | **P2** | repo-wide; the default `timestamp("x")` in every `src/db/schema/**` file | 1,804 `timestamp without time zone` vs 470 `timestamptz` | `timestamp without time zone` with `defaultNow()` stores the session's local wall clock. This repo has already shipped this failure once (a leave persisted a day early; a cron dropped a day) and the mitigation was to pin `TZ` in CI — a process control over a schema defect. Any host, container or replica running outside UTC writes a different instant for the same event, and `accounting_periods.closed_at`/`locked_at`, `payroll` timestamps and `agent_tokens.expires_at` are all in this set | Migrate to `timestamptz` module by module, starting with the audit, accounting-period and token-expiry columns where the wrong instant is a correctness bug rather than a display bug |
| **F10** | **P2** | `src/db/schema/common/cell-capacity.ts` (`cell_capacity_measurements.per_org_cost`), `noisy_neighbour_reviews.share_ratio` | Two cost/ratio values in `double precision` | Per-org cost accumulated in binary floating point drifts; a capacity/cost report that sums thousands of measurements will not reconcile against the same figures computed in `numeric`. Control-plane only, not customer-billed — hence P2, not P0 | `numeric(18,6)` for `per_org_cost`; `share_ratio` is arguably fine as a ratio but should be documented as such |
| **F11** | **P2** | `src/modules/surveys/survey-live-participant.service.ts:82-92` and `:109-114` | Two reads with no `org_id` predicate, no `LIMIT`, and an unindexed JSONB predicate | `getQuestionResults` joins `survey_answers → survey_response_sessions` filtering only on `questionId` and `metadata->>'liveSessionId'`; `getParticipantCount` filters only on the JSONB key. Neither names `org_id`, and `survey_response_sessions` has **no expression index on `metadata->>'liveSessionId'`** (its indexes are `(org_id,survey_id,submitted_at)`, `(collector_id)`, `(org_id,id)`). Every poll of a live-survey results screen seq-scans the table, and the row count grows with total responses across the org. Tenancy itself is backstopped by RLS (both tables have `relrowsecurity=t` with a policy), so this is defence-in-depth plus an unbounded read — **but it becomes a cross-tenant read the moment either query runs on a connection without `app.organization_id` set** | Add `eq(surveyResponseSessions.orgId, orgId)` to both, thread `orgId` through the callers, add `CREATE INDEX … ON survey_response_sessions (org_id, ((metadata->>'liveSessionId')))`, and bound `getQuestionResults` with a cursor |
| **F12** | **P2** | `frontend/lib/query-scope.ts:32` + `frontend/hooks/api/gated-query.ts:40-45` | The cache scope carries org + user but not a permission version | `authenticatedScope()` is `authenticated:<orgId>:<userId>`, and the `QueryProvider` remounts on that string. A permission change does not alter it. `useGatedQuery` sets `enabled: access.allowed`, so on revocation the query stops refetching but `query.data` keeps returning the rows already cached; only `access` tells the consumer why. Exactly **1 of 18** factory files (`lib/query-keys/human-resources.ts`, ~6 factories) threads `accessVersion` into the key, against **240 `useGatedQuery` call sites**. A user whose HR access is revoked mid-session keeps seeing the last-fetched employee list on any surface that renders `data` without checking `access` | Add `access.version` to `authenticatedScope()` so the whole cache is re-keyed on a permission change — one edit that covers all 926 factories, rather than threading `accessVersion` through each |
| **F13** | **P2** | `src/db/schema/**` — 1,042 FK sites | 36 % of foreign keys have no supporting index; `users` accounts for 333 | Measured: one unindexed RI probe on a 166,800-row child costs **3,404 buffers / 45.6 ms** (plan in §PRD-C059). A user hard-delete would run 333 such probes under an exclusive lock. There is **no production user-delete path today** (`delete(users)` appears only in e2e specs and `src/scripts/verify-membership-revocation.ts:457`), which is why this is P2 — but a GDPR erasure job is exactly the thing ticket 35 is about to add | Index the FK columns on the highest-row-count children before any erasure path ships. `check:tenant-indexes` does **not** cover this — it checks leading-tenant-column presence only, and passes 840/840 |

**Also observed, not filed as findings** (each is a coverage note, not a defect):

* `check:module-lifecycle` passes over **11 tables** (timesheets only) out of 944.
* 4 of the 11 timesheets tables carry `org_id ON DELETE SET NULL` — an org purge orphans rows
  rather than removing them; under RLS they become invisible but persist (retention, not leak).
* `check:relation-hydration`: **186 unprojected relation hydrations** at a ratchet of 186, plus
  **72 base-table credential candidates** reported-not-enforced.
* `check:unbounded-reads`: 3 actionable unbounded reads remain against a target of 0.
* `check:declaration-constraint-drift`: **1,187 live-but-undeclared** constraints/indexes and
  **446 name drifts** — ~22 % of the live index population is not described by the Drizzle
  declaration, so the declaration is not the source of truth for index policy.
* 6 tenant-carrying tables have RLS disabled — all six are control-plane
  (`organization_placement`, `organization_relocations`, `organization_reservations`,
  `organization_lifecycle_sagas`, `placement_decisions`, `noisy_neighbour_reviews`). Consistent
  with a platform plane; not a finding.
* 13 permission prefixes have no owning module in `module-manifest.json`:
  `self, payments, ai, reports, ownership, integrations, branch, storage, onboarding, dashboard,
  tasks, sales, audit-log`. `isPlanGatedModule()` returns false for all of them, so they are
  simply never module-gated — intentional for `self:`, worth a decision for `payments:` (9 keys).

---

## 4. What head already gets right

1. **PK discipline is complete.** 944/944 tables have a primary key. No heap without one.
2. **Tenant indexing is complete and enforced.** `check:tenant-indexes`: 840 tenant tables,
   840 with a leading tenant index, across 347 schema files. Zero exceptions.
3. **RLS is the real tenant boundary.** 899/943 tables, 983 policies, and the six exclusions are
   control-plane by design. This is what makes several missing in-code `org_id` predicates a
   defence-in-depth gap rather than a live leak.
4. **`check:tenant-relationships` is clean on the merits**: 214 single-column tenant FKs,
   **0 actionable** after CRM/inventory scope exclusions.
5. **SET NULL column lists are fully reconciled**: 564 declared SET NULL FKs, 276 requiring a
   column list, **0 unreachable**; 805 catalog constraints all match the declaration.
6. **`ON CONFLICT` arbiters are inferable**: 362 calls scanned, 159 with an explicit target,
   158 resolved, 13 targeting a partial index, 1 unresolved and that one is a negative test fixture.
7. **The prefix-index restraint is correct and deliberate.** 12 prefix-overlapping index pairs
   exist and have not been dropped — the exact restraint PRD-C059's own sentence demands, and the
   exact mistake this repo already measured seven regressions from.
8. **No true duplicate indexes and no duplicate check constraints** survive
   `0999_s08_drop_redundant_indexes.sql`. The one apparent duplicate is btree-vs-GIN.
9. **The one JSONB property that is frequently filtered is indexed**:
   `idx_audit_logs_org_module_created ON audit_logs (org_id, ((metadata->>'moduleKey')), created_at DESC)`
   is precisely what PRD-C058 asks for, and only 4 raw `->>` predicates exist repo-wide.
10. **Polymorphic authority is absent.** All ~24 distinct `*_type`/`*_id` pairs are audit, event,
    attachment or accounting-source pointers — none makes an authorization decision.
11. **EAV is confined to an approved custom-field seam**, each table tenant-scoped-unique.
12. **Unknown dynamic keys are rejected at six named seams**, and `PermissionGuard` fails closed
    both on a missing key and on any error during authorization.
13. **The frontend has exactly one typed, domain-owned query-key catalog** — 926 entries, 18
    domain files, one base, a compiler-driven contract test, and a gate that bans inline literals,
    stray `QueryClient`s and stray hash functions.
14. **Tenant and subject are in the cache key by construction**, via a hash function shared
    verbatim between the client and the server prefetch, with a `key={scope}` remount as the
    second half — and the module documents the exact dead-prefetch bug that design fixed.
15. **`check:unjoined-table-refs`** is clean over 3,146 files and 5,437 queries: every referenced
    table is in its query's FROM/JOIN.
16. **Migration discipline holds**: 677 files, 0 new violations, journal monotonicity, duplicate
    idx and duplicate numeric prefix all enforced.
17. **The chat lifecycle cluster is correct**, not the defect the gate's candidate list suggests —
    24 `chatChannelMembers` reads correctly ignore a per-member archive flag on existence checks
    while the two reads that must honour it do.
18. **The published-contract half of PRD-C063 is honoured**: 102 published operations all carry a
    version or dated deprecation window, a named consumer, an idempotency/replay rule and a
    parameter baseline; 23 webhook events catalogued and versioned.

---

## 5. Blocked on infrastructure

| What | Why it could not be measured here | What would measure it |
|---|---|---|
| **Workload / index statistics** (PRD-C059) | `pg_stat_user_indexes.idx_scan` on `scratch_perf_seed` reflects only seeding writes and my own probes. No production traffic exists locally | `pg_stat_statements` + `pg_stat_user_indexes` snapshots from a production or staging replica over a representative window. Note the criterion forbids using statistics to justify deletion, so this can only ever add KEEPs |
| **Runtime registration/caller proof for keys** (PRD-C061) | The criterion demands runtime proof, not only static reach. That needs a booted backend with per-route guard telemetry over a request set that exercises all 3,642 operations | Boot both servers, enable a `PermissionGuard` counter keyed by `permissionKey`, drive the full seeded e2e suite, and diff observed keys against the 704-key catalog |
| **Removal of any dead column / DTO field** (PRD-C058, C063) | Read-only wave; and PRD-C063 requires the removal be one contract change across BE + OpenAPI + FE, which 0.55 % response-schema coverage makes undetectable | Populate 2xx response schemas first (ticket 04), then run the removal with `check:contract-breaking-change` as the arbiter |
| **`select *` / row-spread reachability** for the 90 dead columns | My census matches identifiers; a column reached only through `SELECT *` or `...row` has no identifier to match | A ts-morph pass that resolves the inferred row type of every Drizzle `select()`/`findMany()` and records which fields are consumed downstream |
| **E2E / performance confirmation of F1, F2, F3, F4** | Cannot run `npm run build`, `typecheck` or a bare `jest` under a 15-core / 24 GB laptop shared by ~26 agents | Targeted seeded e2e: (F1) create 200 API keys in one org and assert 0 conflicts; (F2) register the same user as an affiliate in two orgs and assert 409 not 500; (F3) enable `payroll` without `hr` and assert payroll approve/lock/reopen return 200; (F4) restrict a template to a role the caller lacks and assert it is absent from `list()` |
| **`check:alert-ack`** | Needs a real `ALERT_WEBHOOK_URL` and a human acknowledgement | Out of scope for this ticket; noted only because it is the one gate in the repo that still cannot run |

---

## 6. Reproduction

```bash
BE=/Users/tarunchintakunta/Personal/streamline/streamlineos-backend
FE=/Users/tarunchintakunta/Personal/streamline/streamlineos-frontend/frontend
PG='postgresql://tarunchintakunta@localhost:5432/scratch_head_1010'
PS='postgresql://tarunchintakunta@localhost:5432/scratch_perf_seed'

# catalog census
psql "$PG" -tAc "select contype, count(*) from pg_constraint con
  join pg_class c on c.oid=con.conrelid join pg_namespace n on n.oid=c.relnamespace
  where n.nspname='public' group by 1 order by 1"

# FK index coverage (partial indexes counted as coverage)
#   -> TOTAL 2892 / UNCOVERED 1042   (query in §PRD-C050c)

# declaration drift, all four, against the head DB
cd $BE && COLUMN_DRIFT_GATE_DATABASE_URL="$PG" npm run -s check:declaration-column-drift
         CONSTRAINT_DRIFT_GATE_DATABASE_URL="$PG" npm run -s check:declaration-constraint-drift
         REFERENTIAL_ACTION_GATE_DATABASE_URL="$PG" npm run -s check:referential-action-drift
         SET_NULL_GATE_DATABASE_URL="$PG" npm run -s check:set-null-column-lists

# lifecycle candidates, full list
cd $BE && node src/scripts/check-lifecycle-predicates.mjs --list

# OpenAPI contract coverage  -> 3642 ops / 1385 request schemas / 20 response schemas / 6 components
cd $BE && node -e "const o=require('./openapi.json');…"   # full script in §PRD-C063

# column reachability census  -> 9924 columns, 90 with zero reach
node /private/tmp/claude-501/…/scratchpad/col-reach2.mjs

# permission key reachability   -> 675 keys, 43 route-unbound, 11 with zero BE reach
node /private/tmp/claude-501/…/scratchpad/permkeys2.mjs
```

The two census scripts live in this session's scratchpad
(`/private/tmp/claude-501/-Users-tarunchintakunta-Personal-streamline/2c7d1c33-300a-4a77-82f6-04ae8f24aa3a/scratchpad/`)
and were written as tool inputs, not as deliverables. They are the only files this audit created
besides this report; **no source file in either repository was modified.**

---

## 7. Verdict

**PARTIALLY MET — 0 of 9 criteria fully met, 6 partially met, 2 not met, 1 not measurable here.**

| Criterion | Status |
|---|---|
| PRD-C050 | partially-met — 6 of 9 dimensions clean; FK indexes, referential actions and timestamps are not |
| PRD-C051 | partially-met — polymorphic authority and EAV clean; 2 live JSON authority arrays + 1 inert one |
| PRD-C052 | partially-met — policy and 214 partial indexes exist; 409 grandfathered reads, 111 dormant columns, 17 in-scope tables without the partial index |
| PRD-C057 | **not-met** — no inventory artifact exists; `reports/02-inventory/` is empty |
| PRD-C058 | partially-met — JSONB half essentially clean; 90 zero-reach columns identified but nothing proven-and-removed |
| PRD-C059 | **met** for detection, and head's restraint on the 12 prefix overlaps is correct; workload statistics NOT MEASURED |
| PRD-C061 | partially-met — seam rejection fully met at 6 seams; 43 route-unbound keys and 11 dead ones remain; runtime proof NOT MEASURED |
| PRD-C062 | partially-met — one exemplary FE catalog and a correct tenant/subject hash; 3 parallel payroll families and a missing permission dimension |
| PRD-C063 | **not-met / not-measurable** — 20 of 3,642 operations carry a response schema, so "one contract change" has no arbiter |

The single highest-leverage next action is **PRD-C057's inventory**, because five of the other
eight criteria are gated on it: C058, C059, C061, C062 and C063 all say "only after proving…",
and there is presently no artifact in which that proof can be recorded.
