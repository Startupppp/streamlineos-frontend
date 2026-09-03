# Schema and Key Inventory — Ticket 07

Produced by S2 on 2026-09-02. Covers `backend/src/db/schema/**` (346 files) and the key registries visible from static analysis. All counts are from grep/find on the live tree; no DB connection used.

---

## 1. Primary Key Strategy

| Strategy | Count | Verdict |
|---|---|---|
| `serial()` (implicit sequence) | 580 | REFACTOR |
| UUID via `$defaultFn(() => crypto.randomUUID())` or `text().primaryKey()` | ~130 | KEEP |
| `generatedAlwaysAsIdentity()` (correct policy) | ~67 | KEEP |

**Failure prevented by fixing `serial`:** `serial` creates a separate Postgres sequence with no ownership declaration in `pg_depend`. When a table is dropped and recreated, the sequence may not follow. `generatedAlwaysAsIdentity` is owned by the column and drops with it. This is low-urgency since existing tables work, but every new table must use identity or UUID.

**Owner:** S2 (schema) — changes require coordinated migrations. No schema file changes made this session; this is a forward-looking rule.

---

## 2. Timestamps — Timezone Correctness

| Type | Without `withTimezone: true` | With `withTimezone: true` |
|---|---|---|
| `created_at` | 683 | 61 |
| `deleted_at` | 68 | 13 |
| `archived_at` | 9 | 8 |
| `updated_at` | (similar to `created_at`) | — |

**Verdict:** REFACTOR. Without `withTimezone: true`, Drizzle maps the column to Postgres `timestamp without time zone`. At DST transitions, comparisons between client-supplied `timestamptz` values and stored `timestamp` values produce unexpected results. For a multi-tenant SaaS with global users this is a correctness concern.

**Failure prevented:** Off-by-one-hour comparisons on soft-delete predicates (`deleted_at < now()`) at DST crossings. Timezone-naive timestamps are also harder to reason about in audit logs.

**Scope of fix:** 683+ columns across all schema folders. Each change generates a `ALTER COLUMN ... TYPE timestamptz` migration. S1 must apply these. Not changed this session to avoid a 683-migration wave without S1 coordination.

---

## 3. Money Storage

| Module | Type used | Verdict |
|---|---|---|
| `billing/` | `integer` (cents) | KEEP |
| `common/ai-usage.ts` | `integer` (milli-credits) | KEEP |
| `accounting/**`, `payroll/**` | `decimal(18,4)` | KEEP (justified) |
| `build/core.ts` (`budget`) | `decimal(15,2)` | REFACTOR |
| `build/members.ts` (`hourly_rate`) | `decimal(10,2)` | REFACTOR |
| `crm/contacts.ts` (`investmentValue`) | `decimal(15,2)` | REFACTOR |
| `crm/campaigns.ts` (`spend`, `budget*`) | `decimal(15,2)` | REFACTOR |
| `crm/leads.ts` (`potentialValue`, `investmentInterest`) | `decimal(15,2)` | REFACTOR |
| `crm/analytics.ts` (`revenue`, `value`) | `decimal(15,2)` | REFACTOR |

**Accounting/payroll exception:** Multi-currency double-entry bookkeeping requires fractional sub-cent precision (e.g., exchange rates at 8 decimal places, GST at 2). Forcing to integer cents would lose precision for exchange-rate-derived amounts. `decimal(18,4)` is the correct choice for these modules.

**All other modules:** Should use `bigint` integer minor units (cents). A generated virtual column can expose the decimal representation for display: `value: decimal(...).generatedAlwaysAs(sql\`value_minor::numeric / 100\`)` — this pattern already exists in `crm/deals.ts` (`value_minor` + generated `value`).

**Failure prevented:** Floating-point `NUMERIC`/`decimal` in Postgres is exact but slower than integer arithmetic. More importantly, inconsistent types make cross-module aggregation error-prone.

---

## 4. Tenant-Scoped Uniqueness

**Bare `.unique()` on tenant-owned columns:** Only 4 instances found:
- `blog/blog.ts:28` — `email.unique()` (blog subscriber, global uniqueness is correct)
- `hr/hiring-candidates.ts:73` — `trackingToken.unique()` (token is globally unique by design)
- `hr/hiring-pipeline.ts:75` — `acceptanceToken.unique()` (same)
- `timesheets/settings.ts:43` — chain `.unique()` (settings singleton per org — should be `uniqueIndex(orgId)`)

**Verdict:** KEEP for token columns (global uniqueness by design). REFACTOR `timesheets/settings.ts` unique to be an explicit named composite.

**Column-level uniques with explicit names:** All significant tenant-scoped business keys use `uniqueIndex("name").on(table.orgId, table.col)` — this is correct. No cross-tenant DoS risk found on business-key uniqueness.

**Failure prevented:** A bare global unique on a per-org field lets one tenant block another org from creating the same code/slug (cross-tenant DoS + info leak).

---

## 5. Soft-Delete Partial Indexes

**Tables with `deleted_at`:** 81

**Tables with at least one partial index on `deleted_at IS NULL`:** 63 (after S2 additions)

**Tables added this session:** `contacts`, `crmOrganizations` in `crm/contacts.ts` (2 indexes added, 2 replaced with partial versions).

**Tables still missing partial indexes (significant ones):**

| Table | File | Notes |
|---|---|---|
| `hr_people` | `hr/core-people.ts` | High-read; no partial index |
| `hr_employments` | `hr/core-people.ts` | High-read; no partial index |
| `crm_leads` | `crm/leads.ts` | No partial index |
| `crm_products` | `crm/products.ts` | No partial index |
| `crm_campaigns` | `crm/campaigns.ts` | No partial index |
| `hr_cases` | `hr/cases.ts` | No partial index |
| `party_contacts` | `party/party-contacts.ts` | No partial index |

**Verdict:** REFACTOR. Each missing partial index means the planner must scan deleted rows, wasting buffer reads under RLS. Not changed this session to limit migration scope; S1 should batch these.

**Failure prevented:** Full table scans on heavily-deleted tables cause O(total) reads instead of O(active). Under RLS with a minority-org test, this difference is measurable.

---

## 6. Foreign Key Indexes

**All FKs observed in schema files have corresponding indexes** (either an `index(...)` or a composite unique that covers the FK column). No bare FK without index found in the scanned files.

**Named FKs:** The hierarchy, directory, and RBAC schemas all use explicit `foreignKey({ name: "fk_..." })` declarations. Some older tables (accounting, CRM) use inline `.references()` which generate Drizzle-assigned names. This is acceptable.

**Referential actions:** 
- `cascade` on org-level tables (correct — org delete cascades to all child rows)
- `set null` on optional links (correct)
- `restrict` on archive-locked references (correct — prevents archiving a parent with active children)

---

## 7. Soft-Delete Predicates in Services — Fixed This Session

Five service reads on `org_units` were missing the `isNull(deletedAt)` or `eq(orgId)` predicate:

| Service | Function | Missing predicate | Fixed |
|---|---|---|---|
| `hr/directory/org-structure.service.ts` | `getTeam` | `isNull(orgUnits.deletedAt)` | YES |
| `hr/workflows/hr-workflow-approver.service.ts` | `resolveApprovers` (dept_head case) | `eq(orgUnits.orgId, orgId)`, `isNull(orgUnits.deletedAt)` | YES |
| `hr/workflows/hr-workflow-instances.service.ts` | `buildApproverCache` | `eq(orgUnits.orgId, orgId)`, `isNull(orgUnits.deletedAt)` | YES |
| `hr/lifecycle/hr-dashboard-reports.service.ts` | `buildTimeToFill` | `eq(orgUnits.orgId, orgId)`, `isNull(orgUnits.deletedAt)` | YES |
| `hr/templates/hr-template-render.service.ts` | `buildContext` (dept name) | `isNull(orgUnits.deletedAt)` | YES |

Tests written proving archived-row-excluded behavior:
- `hr/directory/__tests__/soft-delete-predicates.spec.ts` — 2 passing
- `hr/workflows/__tests__/soft-delete-predicates.spec.ts` — 2 passing
- `hr/lifecycle/__tests__/soft-delete-predicates.spec.ts` — 1 passing

**Not fixed this session (acceptable patterns):**
- `finance/reports/finance-report-export-worker.service.ts:347` — label lookup for historical dept names in a CSV export. Intentionally includes archived depts for historical report accuracy. No orgId filter is a style gap but not a security hole (IDs derived from org-scoped ledger queries).

---

## 8. JSONB Keys — Frequently Filtered Properties

| Table | Column | Filtered keys | Verdict |
|---|---|---|---|
| `org_units.metadata` | `jsonb` | `address`, `city`, `state`, `email`, `locationType` | KEEP (JSONB for extensible location data; not queried directly) |
| `crm_contacts.tags` | `jsonb<string[]>` | `tags` array membership queries | REFACTOR — move to a join table `contact_tags(contact_id, tag)` for indexable lookups |
| `deals.custom_data` | `jsonb` | varies | KEEP (user-defined, behind custom-field engine) |
| `hr_employments` custom JSONB | varies | varies | KEEP (behind approved custom-field seam) |

---

## 9. Permission Catalog

**Backend catalog files:** `modules/rbac/permissions/` — one file per module, barrel at `index.ts`. This is the correct structure.

**Key count:** ~631 keys per prior audit. No drift detected this session.

**Route classification:** 3,518 handlers — 202 public, 3,175 permissioned, 94 universal, 47 in-service, 0 undeclared (per prior S8 validation gate).

**Verdict:** KEEP as-is. The structure is correct.

---

## 10. Module Registry

`common/rbac/module-vocabulary.ts` — `namespacesForModule`, `administeringModuleOf` are the authoritative lookups. No standalone `permissions.constants.ts` exists.

**Verdict:** KEEP.

---

## 11. Cache Keys

`common/cache/cache-keys.ts` — `CACHE_KEYS` factory is already tenant-safe (per MEMORY.md: "CACHE_KEYS is already tenant-safe"). No cross-tenant cache key collisions found.

**Verdict:** KEEP.

---

## 12. Environment Variables

Config validated at boot via `@nestjs/config` `validationSchema`. All required vars are `.required()`.

**Verdict:** KEEP.

---

## 13. Feature Flags

`common/feature-flags.ts` — `key: text("key").notNull().unique()`. The unique is globally correct (feature flag keys are global platform keys, not per-org). Active flags are checked per org via the `featureFlagOverrides` join table.

**Verdict:** KEEP.

---

## Summary of Verdicts

| Category | KEEP | REFACTOR | REMOVE | Fixed This Session |
|---|---|---|---|---|
| Primary key strategy (serial) | 0 | 580 tables | 0 | 0 |
| Timestamp timezone | 0 | 683+ columns | 0 | 0 |
| Money as decimal | accounting/payroll | build, crm (non-deals) | 0 | 0 |
| Tenant uniqueness | most | 1 (timesheets settings) | 0 | 0 |
| Partial soft-delete indexes | 63 tables | 18 tables | 0 | 2 new indexes |
| Service soft-delete predicates | — | — | — | 5 fixes |
| Permission catalog | yes | — | — | — |
| Cache keys | yes | — | — | — |
| Module registry | yes | — | — | — |

Ticket 08 (execute removals) is BLOCKED on ticket 03. REMOVE verdict is empty because no schema object has been proven unreferenced — empty tables are unseeded features, not dead code.
