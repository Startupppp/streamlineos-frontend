# 03 — Tenant relationships, indexes and RLS verified against a fully bootstrapped target

**What to build:** Tenant-relationship verification last ran against the older fully-bootstrapped database; the current attempt was taken against a target observed mid-bootstrap and is not release evidence. Re-run relationship, index and RLS verification against a target that has completed the full chain, so each tenant relationship is proven to have one canonical composite organization-scoped key with a supporting index and a policy.

**Blocked by:** 02 — a partially bootstrapped target produces findings that are artifacts of the missing tail, not real.

**Status:** closed against `scratch_t03`, a private copy of `scratch_boot_a` carried from 637 to head (646/646, `REACHED_HEAD`). The three findings that were blocked on migrations are resolved by `0994`/`0995`/`0996`, which a concurrent session authored at 17:44 — after the previous report was written — and which **nobody had applied or verified until this pass**. All three are now proven against a live catalog, including a before/after of the demonstrated cross-tenant read. One honesty hole in `db:verify-rls` (it printed EXPOSURE and exited 0) is closed. One residue remains in ticket 08's territory.

- [x] Tenant-relationship verification reports zero actionable findings against a fully bootstrapped current-head target.
      `check:tenant-relationships` against `scratch_t03` — **before (ledger 637/646): exit 1, 4 actionable**; **after (ledger 646/646): exit 0, 0 actionable**. Total single-column FKs 236 → 232. The scope buckets are unchanged and were not touched: **CRM 95, Inventory 136, platform-global 1** both before and after. `0995` drops the four single-column constraints and moves each referential action onto the composite `(org_id, child_id) → (org_id, id)` twin; verified in `pg_constraint` that all four composites exist and are `convalidated = true`, that all four single-column constraints are gone, and that both `ON DELETE SET NULL` constraints carry an explicit column list naming only a **nullable** column (`invoice_id`, `bill_id`) — so a parent delete clears the pointer instead of raising `23502`.
- [x] Tenant-index coverage is complete, with every declared tenant relationship backed by an index.
      `check:tenant-indexes --db` against `scratch_t03` — **before: exit 1, 985 of 988**; **after: exit 0, 988 of 988**. `0996` adds the three: `communication_backfill_issues (org_id, created_at DESC)`, `subprocessor_subscribers (organization_id, created_at DESC)`, `support_ticket_tags (org_id, ticket_id)`. These are the same three the previous pass measured at 516 buffers (seq scan, 47,500 rows removed by the RLS filter) versus 6 buffers.
      PARTIAL (declaration mode, ticket 08's territory — not a live gap): `pnpm check:tenant-indexes` with no `--db` is **exit 1 at 821 of 828**, up from the 823/828 the last pass saw. All **7** — `crm_sla_breach_log`, `org_custom_domains`, `release_tickets`, `ticket_label_mappings`, `ticket_related_links`, `webhook_deliveries`, `work_item_relations` — were confirmed by direct `pg_index` lookup to carry a leading `uniq_<table>_org_id (org_id, id)` in the catalog. The Drizzle tables just never declare it. Two are new since the last pass (`crm_sla_breach_log`, `org_custom_domains`), both from schema edits in commit `a3bf8470`. The fix is one `uniqueIndex(...).on(t.orgId, t.id)` per table in `src/db/schema/**`, which this session may not edit.
- [x] Every tenant-scoped table has an RLS policy. A table carrying `org_id` that grants the application role DML with no policy is readable org-wide, and that exposure is invisible until the migration is applied.
      **Decision: add the policies, despite Inventory being out of release scope.** A demonstrated cross-tenant read is a security defect, not a scope question; scope decides *who fixes it*, never *whether it is exposed*. `0994` enables RLS and adds `tenant_isolation` on all 16. `db:verify-rls` against `scratch_t03` — **before: coverage 966 of 988, 16 exposed**; **after: coverage 982 of 988, `EXCLUDED: INVENTORY: 0`, no EXPOSURE block, 16/16 behavioural checks PASS, exit 0**. Independently from `pg_catalog`, exactly **6** org-bearing tables now have no policy and all 6 are the registered platform-global control-plane set (`noisy_neighbour_reviews`, `organization_lifecycle_sagas`, `organization_placement`, `organization_relocations`, `organization_reservations`, `placement_decisions`). The exploit was re-run as `streamline_app` (`rolbypassrls=false`) inside rolled-back transactions: with RLS disabled in-transaction (the exact pre-`0994` shape — all 16 had `relrowsecurity = false`) it returns **2 rows, `org_probe_A,org_probe_B`**, and **2 rows with no GUC at all**; at head it returns **1 row, own org only**, and raises `42501` with no GUC. Blast radius of enabling RLS on out-of-scope tables is zero: all 16 table names and their camelCase symbols have **0** references anywhere under `src/modules/`.
- [x] Zero Drizzle-declared columns are absent from the live catalog — `db.select()` renders every declared column, so one missing column turns every full-table read into a `42703`.
      Re-verified, not inherited — schema files changed at 17:44 and 17:55 after the last check. Enumerated at runtime through `getTableConfig` over the `src/db/schema` barrel: **872 declared tables, 10,588 declared columns; 0 missing tables, 0 missing columns** against `scratch_t03` at head. Identical to the previous pass, so the schema churn introduced no undeclared column.
- [x] Benchmark and verify as the application role with tenant context set, never as the database owner; without the GUC the queries fail `42501` rather than returning rows.
      `APP_DB_SCHEMA=public db:bootstrap-role` against `scratch_t03` → exit 0, `superuser=false createdb=false createrole=false bypassrls=false login=true`, **943/943 tables granted**, "can create objects in: (none)". Every probe in this pass ran under `SET LOCAL ROLE streamline_app` with `SET LOCAL app.organization_id`, inside a transaction that was rolled back; `scratch_t03` is left with 0 organizations, 0 users, 0 rows in both probed tables.
- [x] `db:generate` still fails closed while snapshots are stale.
      Carried from the previous pass and not re-run this session — recorded there as `guard-db-generate.mjs` exit 1 and `check:db-generate-guard` exit 0, 5/5.

## Gates run this pass

Target for every DB-backed gate: `scratch_t03` (a private `TEMPLATE` copy of `scratch_boot_a`). No remote `DATABASE_URL`, no `cornerstone_*` database, no `.env` edit.

| gate | before | after |
|---|---|---|
| `check:tenant-relationships` | exit 1 — 4 actionable | **exit 0 — 0 actionable** |
| `check:tenant-indexes --db` | exit 1 — 985/988 | **exit 0 — 988/988** |
| `db:verify-rls` | exit 0 — 966/988, 16 exposed | **exit 0 — 982/988, 0 exposed, 16/16 PASS** |
| `check:tenant-indexes` (declaration) | — | exit 1 — 821/828 (7 declaration-only, ticket 08) |
| `check:migration-discipline` | — | exit 0 |
| `check:migration-chain` | — | exit 0 — watermark 1803000010096 |
| `check:restrict-fks` | — | exit 0 — 345 schema files |
| `check:migration-rollback` | — | exit 0 — 646 scanned |
| `check:migration-ledger` | — | exit 0 — 646/646, 0 pending |
| backend `typecheck` (via mutex) | — | exit 0 — 0 errors |

- `db-bootstrap.mjs` against `scratch_t03` → exit 0, `RESULT: REACHED_HEAD 646/646`; exactly 9 pending applied (`0992`–`1000`), no hash drift on the 637 already there.
- Rollback round trip proven live on a throwaway copy: `0996`/`0995`/`0994` down (16 inv_* back to RLS off, 4 single-column FKs restored, 3 indexes dropped), then up again (16/16 RLS on, 0 single-column FKs, 3/3 indexes) with both DB gates back to exit 0. Copy dropped.
- `db:verify-rls` bite proof: with RLS disabled on one `inv_*` table the gate is now **exit 1** (`RESULT: 1 CHECK(S) FAILED`) where it previously printed the same EXPOSURE block and exited 0; restored, it is exit 0.

## Journal note

The brief's "journal `idx` must equal position in the array" is not what this repo enforces, and the journal does not satisfy it: 646 entries, last `idx` 777, **316** entries where `idx !== position`, pre-existing throughout. `check-migration-discipline.mjs` enforces `when` strictly increasing and `idx` **unique**; both hold, and the gate is exit 0. Nothing was renumbered.
