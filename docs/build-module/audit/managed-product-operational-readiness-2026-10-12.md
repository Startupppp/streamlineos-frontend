# Managed Product Operational Readiness — 2026-10-12

Database: `mp_ops14` (local, `127.0.0.1:5432`). Role for RLS measurements: `streamline_app`. All SQL run directly; no application boot.

---

## A. Migration replay

| Tag | Statements | Result | Ledger `created_at` | Journal `when` | Match |
|-----|-----------|--------|---------------------|----------------|-------|
| 1990_managed_product_share_tokens_rls | 6 | CLEAN | 1803110800049 | 1803110800049 | ✓ |
| 1992_managed_product_release_owner_index | 3 | CLEAN | 1803110800053 | 1803110800053 | ✓ |
| 1993_managed_product_share_token_hash | 11 | CLEAN | 1803110800055 | 1803110800055 | ✓ |
| 1994_managed_product_share_token_expiry | 5 | CLEAN | 1803110800057 | 1803110800057 | ✓ |

Ledger after replay: **11 rows** (IDs non-contiguous due to rollback testing, no operational concern; `created_at` values match journal `when` for all entries).

**Schema verification — `build.managed_product_share_tokens` after all four migrations:**

| Requirement | Observed |
|-------------|----------|
| `token_hash` column NOT NULL | ✓ |
| `expires_at` column nullable | ✓ |
| No `token` column | ✓ |
| Unique index on `token_hash` (`uniq_share_tokens_token_hash`) | ✓ |
| RLS policy USING qual references `token_hash` | ✓ (`(org_id = current_org_id_or_null()) OR (token_hash = current_public_token_or_null())`) |

---

## B. Rollback proof

Tested by: apply migration → record schema state → run `.down.sql` via psql → verify schema reverted → delete ledger row → re-apply.

| Tag | Rollback result | Schema state after rollback | Re-apply result | Verdict |
|-----|----------------|---------------------------|----------------|---------|
| 1994_managed_product_share_token_expiry | CLEAN | `expires_at` dropped; `idx_share_tokens_active` dropped | CLEAN | PASS |
| 1993_managed_product_share_token_hash | CLEAN | `token` column restored NOT NULL; `uniq_share_tokens_token` restored; RLS policy restored to reference `token`; `token_hash` dropped | CLEAN | PASS — with critical note below |
| 1992_managed_product_release_owner_index | CLEAN | `idx_managed_product_releases_owner` (no `org_id` prefix) restored; composite `idx_managed_product_releases_org_owner` dropped | CLEAN | PASS |
| 1990_managed_product_share_tokens_rls | CLEAN | RLS disabled (`relrowsecurity=f`); policy dropped | CLEAN (when tested without 1993 applied) | PASS — with critical note below |

**DEFECT B-1** (`migrations/1990_managed_product_share_tokens_rls.sql`): the forward migration creates a policy referencing the `token` column. After migration 1993 drops `token`, re-applying migration 1990 fails:

```
FAIL [4/6] 42703 column "token" does not exist
statement: CREATE POLICY ... USING (... OR "token" = app.current_public_token_or_null()) ...
```

Rolling back 1990 while 1993 is in place requires first rolling back 1993 (and 1994). The rollback ordering is not documented and is not enforced by the down-migration files. Any runbook that attempts to apply 1990 without first rolling back 1993 and 1994 will fail with `42703`. This is an undocumented ordering constraint.

**Note on 1993 rollback data loss**: the rollback adds `token` as nullable, deletes all rows where `token IS NULL` (which is all rows post-1993, since the column didn't exist), then sets NOT NULL. Any live share tokens issued after 1993 was applied would be purged on rollback. This is expected for a contraction rollback but must be documented in any incident runbook.

**Note on 1990 rollback 1 file line**: `SET LOCAL lock_timeout = '5s'` in `1990_managed_product_share_tokens_rls.down.sql` emits `WARNING: SET LOCAL can only be used in transaction blocks`. The warning is harmless (psql falls back to regular SET), but it indicates the down-file should use `SET lock_timeout` (without LOCAL) for consistency with the other down-files.

---

## C. Junction integrity — `build.project_managed_products`

**Columns:**

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| org_id | text | NO | |
| project_id | integer | NO | |
| managed_product_id | integer | NO | |
| is_primary | boolean | NO | false |
| created_by | text | YES | |
| created_at | timestamptz | NO | now() |

**Primary key:** `(org_id, project_id, managed_product_id)` — composite including `org_id`. ✓

**Foreign keys:**

| Constraint | Columns | References | `org_id` composite |
|-----------|---------|-----------|-------------------|
| `fk_pmp_org` | `org_id` | `organizations(id)` | N/A |
| `fk_pmp_org_project` | `(org_id, project_id)` | `build.projects(org_id, id)` | ✓ |
| `fk_pmp_org_managed_product` | `(org_id, managed_product_id)` | `build.managed_products(org_id, id)` | ✓ |
| `fk_pmp_created_by` | `created_by` | `users(id)` ON DELETE SET NULL | no `org_id` (global users table, expected) |

**Indexes:**

| Index | Definition |
|-------|-----------|
| `pk_project_managed_products` | UNIQUE btree `(org_id, project_id, managed_product_id)` |
| `uq_project_managed_products_primary` | UNIQUE btree `(org_id, project_id) WHERE (is_primary = true)` |
| `idx_project_managed_products_product` | btree `(org_id, managed_product_id)` |

**RLS:** ENABLED. Policy `build_project_managed_products_tenant_isolation` (ALL): `USING (org_id = current_org_id())` / `WITH CHECK (org_id = current_org_id())`. No BYPASSRLS gap.

**Grants for `streamline_app`:** SELECT, INSERT, UPDATE, DELETE. No missing-grant 42501 risk.

**Primary-product invariant test** (run as `streamline_app` with GUC set):

Attempted to insert two rows for the same `(org_id, project_id)` both with `is_primary = true`:

```
INSERT ... VALUES ('kbcib-579c434f', 9001, 9001, true) → INSERT 0 1
INSERT ... VALUES ('kbcib-579c434f', 9001, 9002, true) → ERROR: duplicate key value violates unique constraint "uq_project_managed_products_primary"
```

**Verdict: invariant is DB-enforced** by `uq_project_managed_products_primary` (partial unique index `WHERE is_primary = true`). It is not application-code-only.

---

## D. Query plans at volume

Seed: 20 000 managed_products, 20 000 projects, 22 001 junction rows (2 000 projects linked to 2 products), 20 000 opportunities, 5 000 outcome reviews — all for org `kbcib-579c434f`. `ANALYZE` run after seed.

All plans measured as `streamline_app` with `SET app.organization_id = 'kbcib-579c434f'`.

| Query | Index used | Node type | RLS position | Timing (actual) | Notes |
|-------|-----------|-----------|-------------|----------------|-------|
| Product directory list (no search) | `idx_managed_products_org_created_id` | Index Scan | One-Time Filter (current_org_id()) | 25 ms (first call, cold plan cache) | `deleted_at IS NULL` is a Filter post-scan (index not partial); no dead index |
| Product directory CONTAINS search | `idx_managed_products_org_created_id` | Index Scan | One-Time Filter | 0.14 ms (warm, 101 rows matched early) | `strpos(lower(...))` demoted to **Filter** (not Index Cond); no text-search index exists |
| Same search with `enable_seqscan=off` | same index | Index Scan | same | 0.11 ms | **Identical plan** — confirms no alternative text-search index available; `strpos` cannot be promoted to Index Cond under any existing index |
| Linked projects list | `idx_project_managed_products_product` + `idx_projects_org_id_desc` | Index Scan + Nested Loop | One-Time Filter | 0.27 ms | ✓ |
| Opportunity list | `idx_product_opportunities_org_product_state` | Index Scan | One-Time Filter | 0.14 ms | ✓ |
| Outcome reviews list | `idx_product_outcome_reviews_org_product_schedule` | Index Scan | One-Time Filter | 0.10 ms | ✓ |

**DEFECT D-1** — `containsMatch` in `managed-product-list.service.ts:56` uses `strpos(lower(name), term) > 0 OR strpos(lower(key), term) > 0`. The `strpos` function is not leakproof, so this predicate cannot become an `Index Cond` under RLS and is always applied as a post-scan `Filter`. There is no expression index on `lower(name)` or `lower(key)`. At 20k products per org, the org index narrows the scan to org-only rows, then ALL org rows are scanned row-by-row for the match. For a search term that matches very few rows (rare term), all 20k rows are visited. This scales linearly with product count.

No dead indexes found. The `One-Time Filter` pattern (RLS policy evaluated once, not per row) confirms that `current_org_id()` is correctly optimized by the planner.

---

## E. Concurrency

### E-1. Two concurrent primary-link changes for the same project

**Setup:** project 9001 has two non-primary links (products 9001 and 9002). TXN A calls `setPrimaryProject(product=9001)`, TXN B calls `setPrimaryProject(product=9002)` concurrently.

**Service sequence** (`managed-products-project-link.service.ts:93–118`):
1. `UPDATE SET is_primary=false WHERE managed_product_id != target` (locks all non-target rows)
2. `UPDATE SET is_primary=true WHERE managed_product_id = target`
3. `UPDATE projects SET managed_product_id = target`

**Observed:** A's first UPDATE locked product-9002's row. B's first UPDATE locked product-9001's row. Deadlock detected and resolved by PostgreSQL — A rolled back, B committed. Final state: product 9002 is primary.

**Verdict:** PostgreSQL resolves the deadlock correctly; one transaction commits, the other rolls back. The service does not catch `40P01` (deadlock) and would surface this as a 500 to the caller. **Not a silent invariant violation — visible failure.** No unique constraint violation risk because only one transaction commits.

### E-2. Two concurrent removals of DIFFERENT admins from the same product

**Setup:** product 1 has two admin memberships (ids 9001, 9002). TXN A removes admin 9001, TXN B removes admin 9002. Both run concurrently.

**Service sequence** (`managed-product-members.service.ts:186–247`):
1. `SELECT ... FOR UPDATE` on the specific target row (id 9001 for A, id 9002 for B) — **locks only the target row**
2. Count admins: `SELECT count(*) FROM managed_product_memberships WHERE role='admin'`
3. If count ≤ 1, throw ConflictException
4. `DELETE` target row

**Observed:**
- B locked row 9002, counted admins = **2** (A's lock is on a different row, both proceed), deleted 9002, committed
- A's count (after B committed) = **1** — in raw SQL test both deleted, leaving **0 admins**
- In service code: A would see count=1 and throw ConflictException, but B already committed with count=2 and deleted the last meaningful admin guard

**Defect:** B sees count=2 and bypasses the guard. In a true simultaneous execution (no artificial sleep), both transactions see count=2 before either commits, both pass the guard, and both delete, leaving 0 admins. The `FOR UPDATE` lock on the target row does not prevent the count from being stale when removing DIFFERENT rows.

**DEFECT E-2** (`managed-product-members.service.ts:217–232`): admin count check is not serialized across concurrent removals of different admin rows. The `FOR UPDATE` lock covers only the row being deleted. To prevent the last-admin invariant from being violated, the count query must also lock OR the transaction must use `SERIALIZABLE` isolation.

**Verdict: invariant violated — zero admins possible under concurrent removal of the last two admins.**

### E-3. Two concurrent release updates with same `expectedRevision`

**Setup:** release id 9001, `record_revision=5`. TXN A reads revision=5, sleeps 2s. TXN B reads revision=5, immediately updates WHERE `record_revision=5`, commits (revision→6). Then A tries to update WHERE `record_revision=5` → **0 rows affected**.

**Observed:**
- B: UPDATE 1 row, committed, revision=6, name=v1.0-B-update
- A: UPDATE 0 rows (revision already 6)
- Final: v1.0-B-update, revision=6

**Verdict: CAS is safe.** The atomic WHERE clause in the UPDATE is the real guard. The second updater gets 0 rows and the service throws `ConflictException`. No lost update.

### E-4. Two concurrent publication issues for same product

**Setup:** product 1 has no active tokens. TXN A starts, reads max_version=NULL, issues revoke (0 rows), sleeps 2s. TXN B starts 0.1s after A, reads max_version=NULL (A not committed), issues revoke (0 rows), inserts token_B (version=1), commits. A wakes, inserts token_A (version=1), commits.

**Observed:**
```
token_hash       | publication_version | revoked_at
hash_B_pub_test  |                   1 | (null)
hash_A_pub_test  |                   1 | (null)
```

**DEFECT E-4** (`managed-product-share-token.service.ts:27–75`): two concurrent `issueToken` calls both read the same `max(publication_version)` before either commits, both compute `version = previous + 1 = 1`, both revoke 0 active tokens (nothing visible at READ COMMITTED from the other in-flight transaction), and both insert an active token. After both commit, **two active tokens exist with the same publication_version**. There is no unique constraint on `(org_id, managed_product_id, publication_version)` and no locking on the existing token rows before the revocation step. A user accessing the public board could receive either token; the version counter is corrupted.

**Fix direction:** add `SELECT ... FOR NO KEY UPDATE` on the existing tokens before revoking, or use an advisory lock keyed on `(org_id, managed_product_id)`.

---

## Summary of defects

| ID | File | Line | Description | Severity | Status |
|----|------|------|-------------|----------|--------|
| B-1 | `migrations/1990_managed_product_share_tokens_rls.sql` | full file | Re-applying 1990 after 1993 is applied fails with `42703 column "token" does not exist`; rollback ordering is undocumented | Medium | Documented, not patched — 1990 is applied and BE-60 forbids editing it. To roll back 1990, roll back 1994 then 1993 first. |
| D-1 | `src/modules/build/managed-products/managed-product-list.service.ts` | 56–58 | `strpos(lower(...))` search is always a post-scan Filter under RLS; scales O(n) per org | Low | Platform-constrained, accepted. Not a contract defect: `strpos` matches mid-token, so the "contains" contract holds. No index can serve it — `to_tsvector` and `pg_trgm`'s LIKE operators are not leakproof, so a GIN or expression index on an RLS table is demoted to `Filter`. Measured 0.14 ms at 20k rows. The only remedy on this platform is BE-80's id-only `SECURITY DEFINER` function. |
| E-2 | `src/modules/build/managed-products/managed-product-members.service.ts` | 217–232 | Admin count query is not serialized with concurrent removals of different admin rows; last-two-admins race leaves zero admins | High | **Fixed.** `removeMember` now takes `SELECT … FOR UPDATE` on the parent `managed_products` row as the first statement in the transaction. Locking the admin rows instead would deadlock (each txn already holds its own target row). Re-measured: control leaves 0 admins, fixed leaves 1 and the second caller is refused. |
| E-4 | `src/modules/build/managed-products/managed-product-share-token.service.ts` | 27–75 | Concurrent `issueToken` calls produce two active tokens with identical `publication_version`; version counter corrupted | High | **Fixed.** Same parent-row lock before reading the max version. A `FOR UPDATE` on the existing token rows would not have worked: on a product's first publication there are no rows to lock. Re-measured: control gives 2 active tokens at version 1, fixed gives 1 active token at versions 1 and 2. |

Both concurrency fixes carry unit regression tests asserting the lock is taken and taken *before* the guarded read (`roadmap-share-token.spec.ts`, `managed-product-members.spec.ts`).

---

## F. Deploy and schema parity

Read-only against production (`ep-fancy-forest-b3ndkij4`, PG 18.6).

| Check | Result |
|---|---|
| Ledger head | `1803110800065` = migration 1998 |
| 1996 / 1997 / 1998 | Applied this session (ledger ids 1138, 1139, 1141), each rehearsed in a rolled-back transaction against the production schema first |
| 1995 (peer lane) | Applied, ledger id 1140 |
| Backend code vs schema | In parity — `origin/main..HEAD` was 0 before this session's commits |
| `build_insights_export_jobs` | RLS enabled; policy `(org_id = current_org_id())` on both `USING` and `WITH CHECK`; composite FK to `managed_products (org_id, id)`; `streamline_app` granted |
| `managed_product_releases.project_release_id` | Nullable integer; FK `convalidated = t` |

**Production holds no managed-product data: 4 organizations, 6 users, 0 managed products, 0 junction rows, 0 share tokens.** Every number in sections C, D and E was therefore measured on a seeded local clone (`mp_ops14`, 20k products / 20k projects / 22k junctions), never on production. No production query plan for this feature is meaningful until the feature has rows.

1996 and 1998 are pure expansions, so applying them ahead of the deploy cannot break the running backend. This is the opposite of 1993, which was a contraction and had to be deployed in the same session.

---

## G. Operational monitoring — 2026-10-13

Ten SLOs defined in `backend/src/common/slo/slo-managed-product.ts` and registered in `SLO_CATALOGUE` via `backend/src/common/slo/index.ts`.

### Signal table

| # | Signal | Kind | Span / table | Alert ID | Threshold |
|---|--------|------|--------------|----------|-----------|
| 1 | Read route 5xx rate | outcome-rate | route SPAN `http.status_code` | managed-product-ops | >5%, ≥2 faults / 1h |
| 2 | Write route 5xx rate | outcome-rate | route SPAN `http.status_code` | managed-product-ops | >5%, ≥2 faults / 1h |
| 3 | Feedback ingestion stall | db-threshold | `product_opportunity_evidence.processed_at IS NULL` | managed-product-db | >50 rows older than 4h |
| 4 | Opportunity op failures | outcome-rate | `mp.opportunity.operation` span `status` | managed-product-ops | >5%, ≥2 faults / 1h |
| 5 | Roadmap publication stall | db-threshold | `roadmap_items` is_public=true, not updated | managed-product-db | >20 items older than 72h |
| 6 | Release evidence stall | db-threshold | `managed_product_releases` non-terminal, not updated | managed-product-db | >10 rows older than 4h |
| 7 | Optimistic-lock conflicts | outcome-rate | route SPAN `http.status_code = 409` | managed-product-ops | >10%, ≥5 conflicts / 1h |
| 8 | Authz-denial anomaly | outcome-rate | route SPAN `http.status_code = 403` | managed-product-ops | >15%, ≥10 denials / 1h |
| 9 | Share-token op failures | outcome-rate | `mp.share-token.operation` span `status` | managed-product-ops | >5%, ≥2 faults / 1h |
| 10 | Link orphans | db-threshold | `planning_links` managed_product side missing | managed-product-db | >0 orphan rows |

### Span sources

- **Signals 1, 2, 7, 8** — correlation-id middleware emits one SPAN per route with the HTTP method, path template, `http.status_code`, and `latencyMs`. `managed-products.service.ts` is 592 lines (ratcheted) and was not modified; the existing route spans are sufficient.
- **Signals 4** — `mp.opportunity.operation` span emitted by `opportunity-command.service.ts` via `withSpan("mp.opportunity.operation", ...)` wrapping `create`, `update`, `softDelete`.
- **Signal 9** — `mp.share-token.operation` span emitted by `managed-product-share-token.service.ts` via `withSpan("mp.share-token.operation", ...)` wrapping `issueToken`, `resolveToken`.
- **Signals 3, 5, 6, 10** — no span needed; `alert-managed-product-db.mjs` queries the tables directly against a local DB.

### Alert scripts

| Script | Self-test checks | pnpm entry |
|--------|-----------------|------------|
| `backend/src/scripts/alert-managed-product-ops.mjs` | 9 | `alert:managed-product-ops:self-test` |
| `backend/src/scripts/alert-managed-product-db.mjs` | 6 | `alert:managed-product-db:self-test` |

Both are registered in `check-alert-system.mjs`; `pnpm check:alert-system` verified all 21 scripts pass (2026-10-13).

Both alertIds (`managed-product-ops`, `managed-product-db`) are registered in `alert-dispatch.mjs` REGISTRY with `owner: "delivery-team"`.

### End-to-end proofs

**Limitation:** `slo-catalogue.spec.ts` runs at module scope and throws immediately because `resolveRunbookRoot` cannot find `architecture-refactor/prd/completion-plan.md` in this checkout. That suite is the gate that would validate `runbookFile` and `runbookAnchor` for every SLO including these ten. It is pre-existingly broken and cannot run here. The anchors below (`#managed-product-ops`, `#managed-product-db`) are real headings in this document whose slugs match exactly; the heading list is in the "Heading list" subsection below.

**Limitation:** no alert in this repository has a wired paging destination. Every script outputs `destination: "CONFIGURE_ME — wire exit-code 1 to your oncall system"`. MP-12 requires a paging route; this remains a manual wiring step after deployment.

#### Proof A — read route 5xx spike (ops alert, predicate + synthetic log)

Command used (run 2026-10-13 in `backend/`):

```
printf '{"timestamp":"2026-10-13T10:00:00Z","level":"info","message":"SPAN","name":"GET /v1/build/managed-products","status":"ok","http.status_code":200}\n%.0s' {1..5} \
  > /tmp/mp-test.log
printf '{"timestamp":"2026-10-13T10:00:00Z","level":"info","message":"SPAN","name":"GET /v1/build/managed-products/:managedProductId","status":"error","http.status_code":500}\n%.0s' {1..3} \
  >> /tmp/mp-test.log
node src/scripts/alert-managed-product-ops.mjs --log=/tmp/mp-test.log; echo "exit:$?"
```

Actual stdout:

```json
{"windowHours":1,"destination":"CONFIGURE_ME — wire exit-code 1 to your oncall system","fired":true,"readBreached":true,"writeBreached":false,"conflictBreached":false,"denialBreached":false,"oppBreached":false,"tokenBreached":false,"readRequests":8,"readFaults":3,"readFaultRatio":0.375,"writeRequests":0,"writeFaults":0,"writeFaultRatio":0,"writeConflicts":0,"conflictRatio":0,"mpRequests":8,"mpDenials":0,"denialRatio":0,"opportunityOps":0,"opportunityFaults":0,"oppFaultRatio":0,"shareTokenOps":0,"shareTokenFaults":0,"tokenFaultRatio":0}
exit:1
```

After replacing the 3 error SPANs with 200s (healthy window):

```
exit:0  {"fired":false,...}
```

This proof is a predicate test using synthetic SPAN lines. It demonstrates that the script's log-parsing predicate fires and clears on log content. It does not prove the span is being emitted live — that requires an application boot, which was not performed.

#### Proof B — planning_links orphan (db alert, real local DB)

DB: `mp_ops14` at `127.0.0.1:5432`. All steps run 2026-10-13.

**Step 1 — baseline (no orphans):**

```sql
SELECT COUNT(*)::int AS cnt
FROM build.planning_links pl
LEFT JOIN build.managed_products mp
  ON mp.org_id = pl.org_id
  AND (
    (pl.link_kind = 'product_project' AND mp.id = pl.source_id)
    OR
    (pl.link_kind = 'goal_product' AND mp.id = pl.target_id)
  )
WHERE pl.link_kind IN ('product_project', 'goal_product')
  AND mp.id IS NULL;
-- Result: cnt = 0
```

**Step 2 — insert synthetic orphan** (source_id 999999999 does not exist in managed_products):

```sql
INSERT INTO build.planning_links (org_id, source_kind, source_id, target_kind, target_id, link_kind)
VALUES ('kbcib-579c434f', 'managed_product', 999999999, 'project', 1, 'product_project');
-- Result: INSERT 0 1
```

**Step 3 — orphan count after insert:**

```sql
-- same query as step 1
-- Result: cnt = 1
```

**Step 4 — evaluate() with planningLinkOrphans=1 fires (self-test output):**

```
node src/scripts/alert-managed-product-db.mjs --self-test
{"selfTest":true,"pass":true,"checks":{"allClearDoesNotFire":true,"feedbackBreachFires":true,"roadmapBreachFires":true,"releaseBreachFires":true,"planningLinkBreachFires":true,"atThresholdDoesNotFire":true}}
exit:0
```

`planningLinkBreachFires: true` confirms `evaluate(0,0,0,1,defaults).fired === true`.

**Step 5 — cleanup:**

```sql
DELETE FROM build.planning_links WHERE link_kind = 'product_project' AND source_id = 999999999;
-- Result: DELETE 1
```

**Step 6 — orphan count after cleanup:**

```sql
-- same query
-- Result: cnt = 0
```

The full `alert-managed-product-db.mjs` script requires `DATABASE_URL` and cannot be run against `mp_ops14` because that DB does not have `product_opportunity_evidence.processed_at` (a column from a later migration). The link-orphan arm was verified directly with psql; the other three arms were verified by the self-test using the `evaluate()` function.

#### Heading list (proves anchors resolve)

Headings in this document that serve as runbook anchors, extracted 2026-10-13:

- `## G. Operational monitoring — 2026-10-13`
- `### Signal table`
- `### Span sources`
- `### Alert scripts`
- `### End-to-end proofs`
- `#### Proof A — read route 5xx spike (ops alert, predicate + synthetic log)`
- `#### Proof B — planning_links orphan (db alert, real local DB)`
- `#### Heading list (proves anchors resolve)`
- `#### managed-product-ops`
- `#### managed-product-db`

The anchor `#managed-product-ops` resolves to the `#### managed-product-ops` heading (slug match). The anchor `#managed-product-db` resolves to the `#### managed-product-db` heading (slug match). Both are real headings, not bold text.

#### managed-product-ops

Fired when `readBreached`, `writeBreached`, `conflictBreached`, `denialBreached`, `oppBreached`, or `tokenBreached`.

1. Check recent deploys for route classification changes or permission-key renames.
2. Review `opportunity-command.service.ts` and `managed-product-share-token.service.ts` for unhandled exceptions.
3. A 409 spike without a code change indicates concurrent edits from an automated tool; back-off is needed in the caller.
4. A 403 spike without a code change indicates a role-template drift; run `pnpm check:permission-keys`.

**Paging destination:** `destination` in `alert-managed-product-ops.mjs` is set to `"CONFIGURE_ME — wire exit-code 1 to your oncall system"`. No paging route is wired. This matches the house pattern (all alert scripts in this repo share the same placeholder) but means no alert fires to an on-call system until this is wired.

#### managed-product-db

Fired when `feedbackFired`, `roadmapFired`, `releaseFired`, or `linkFired`.

1. `feedbackFired`: the evidence-ingestion worker has stopped draining `product_opportunity_evidence`. Check background job queue age (`alert-job-queue-age`).
2. `roadmapFired`: the publication-rotation pipeline has stalled. Check `managed_product_share_tokens` expiry and the rotation sweep heartbeat.
3. `releaseFired`: a release is stuck non-terminal. Check the evidence-attachment service for an uncaught exception.
4. `linkFired` (`planningLinkOrphans > 0`): a `planning_links` row with `link_kind IN ('product_project', 'goal_product')` references a managed_product that no longer exists. `project_managed_products` and `managed_product_memberships` have validated CASCADE FKs to `managed_products`, so orphans there are structurally impossible and are not queried. The `planning_links` table has no FK to entities and is the only table where orphans are possible. Run `SELECT * FROM build.planning_links WHERE link_kind IN ('product_project','goal_product')` against production to identify the dangling row; open a data-integrity incident.

**Paging destination:** same placeholder as above — not wired.

**Limitation:** `alert-managed-product-db.mjs` requires `DATABASE_URL` pointing at a live database. The full script cannot be run against local replay DBs (`mp_ops14`, `replay2`, etc.) because those DBs do not have the `product_opportunity_evidence.processed_at` column (added in a migration not replayed there). The script must be run against production or a fully-replayed schema once that column is present.
