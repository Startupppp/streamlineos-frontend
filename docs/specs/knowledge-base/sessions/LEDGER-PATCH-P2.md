# LEDGER-PATCH-P2 — KB real-row predicate proof

Date: 2026-09-27  
Author: lane P2 (Sonnet 4.6)  
Database: `replay2` on `127.0.0.1:5432`  
Connection user throughout: `streamline_app` (rolsuper=false, rolbypassrls=false)  
Verified with `SELECT current_user` at the top of every session block below.

---

## 1. Seed inventory

Seed script: `D:/localstack/seed-p2.sql`  
All human-readable fixture names are prefixed `[p2]`.

| Table | Rows inserted |
|---|---|
| `organizations` | 2 (`p2-org-a`, `p2-org-b`) |
| `users` | 6 (owner, viewer, outside per org) |
| `organization_members` | 4 (owner + viewer per org; outside users are NOT members) |
| `kb_spaces` | 4 (incl + excl per org) |
| `kb_space_members` | 2 (viewer added to incl-space of each org only) |
| `build.projects` | 4 (incl + excl per org) |
| `build.project_members` | 2 (viewer added to incl-project of each org only) |
| `kb_pages` | 23 (18 in org-a, 5 in org-b) |
| `kb_page_grants` | 1 (viewer given `view` on the granted private page) |
| `kb_article_chunks` | 4 (2 chunks × 2 orgs, both on their org's standalone-org page) |

### Org-a pages in detail (18 rows, ids 1–18)

| id | title | visibility | space_id | project_id | notes |
|---|---|---|---|---|---|
| 1 | [p2] A standalone private | private | — | — | no container |
| 2 | [p2] A standalone org | org | — | — | no container |
| 3 | [p2] A standalone public | public | — | — | no container |
| 4 | [p2] A space-incl private | private | 1 | — | space viewer IS member of |
| 5 | [p2] A space-incl org | org | 1 | — | space viewer IS member of |
| 6 | [p2] A space-incl public | public | 1 | — | space viewer IS member of |
| 7 | [p2] A space-excl private | private | 2 | — | space viewer is NOT member of |
| 8 | [p2] A space-excl org | org | 2 | — | space viewer is NOT member of |
| 9 | [p2] A space-excl public | public | 2 | — | space viewer is NOT member of |
| 10 | [p2] A proj-incl private | private | — | 135 | project viewer IS member of |
| 11 | [p2] A proj-incl org | org | — | 135 | project viewer IS member of |
| 12 | [p2] A proj-incl public | public | — | 135 | project viewer IS member of |
| 13 | [p2] A proj-excl private | private | — | 136 | project viewer is NOT member of |
| 14 | [p2] A proj-excl org | org | — | 136 | project viewer is NOT member of |
| 15 | [p2] A proj-excl public | public | — | 136 | project viewer is NOT member of |
| 16 | [p2] A authored-by-viewer private | private | — | — | created_by_membership_id=69 |
| 17 | [p2] A owned-by-viewer private | private | — | — | owner_membership_id=69 |
| 18 | [p2] A granted-to-viewer private | private | — | — | kb_page_grants row for mbr 69 |

Viewer identity: `user_id='p2-u-a-viewer'`, `membership_id=69`.  
Accessible spaces: `[1]` (incl only). Accessible projects: `[135]` (incl only).

### Org-b pages (5 rows, ids 19–23)

Minimal set: standalone private/org/public + space-incl org + proj-incl org.

### kb_article_chunks (4 rows)

Two chunks each on `id=2` (org-a standalone-org) and `id=20` (org-b standalone-org).  
Content: short English sentences. Embedding: 1536-dim zero vector (sufficient to prove index reachability).

---

## 2. Predicate comparison — old vs new

### The defect

`buildIndexedBranch` in `backend/src/modules/kb/core/authorization/knowledge-page-scope.ts`  
previously had two container-membership clauses with **no visibility restriction**:

**OLD (defective)** — space clause at what was line ~116:
```sql
(space_id IS NOT NULL AND space_id = ANY(ARRAY[1]::int[]))
```

**OLD (defective)** — project clause at what was line ~122:
```sql
(project_id IS NOT NULL AND project_id = ANY(ARRAY[135]::int[]))
```

**NEW (current, lines 116–125):**
```sql
(visibility IN ('org', 'public') AND space_id IS NOT NULL AND space_id = ANY(ARRAY[1]::int[]))
(visibility IN ('org', 'public') AND project_id IS NOT NULL AND project_id = ANY(ARRAY[135]::int[]))
```

### Proof executed as `streamline_app` with GUC `app.organization_id='p2-org-a'`

**OLD predicate result (10 rows):**
```
 id |               title               | visibility | space_id | project_id
----+-----------------------------------+------------+----------+------------
  2 | [p2] A standalone org             | org        |          |
  3 | [p2] A standalone public          | public     |          |
  4 | [p2] A space-incl private         | private    |        1 |
  5 | [p2] A space-incl org             | org        |        1 |
  6 | [p2] A space-incl public          | public     |        1 |
 10 | [p2] A proj-incl private          | private    |          |        135
 11 | [p2] A proj-incl org              | org        |          |        135
 12 | [p2] A proj-incl public           | public     |          |        135
 16 | [p2] A authored-by-viewer private | private    |          |
 17 | [p2] A owned-by-viewer private    | private    |          |
```

**NEW predicate result (8 rows):**
```
 id |               title               | visibility | space_id | project_id
----+-----------------------------------+------------+----------+------------
  2 | [p2] A standalone org             | org        |          |
  3 | [p2] A standalone public          | public     |          |
  5 | [p2] A space-incl org             | org        |        1 |
  6 | [p2] A space-incl public          | public     |        1 |
 11 | [p2] A proj-incl org              | org        |          |        135
 12 | [p2] A proj-incl public           | public     |          |        135
 16 | [p2] A authored-by-viewer private | private    |          |
 17 | [p2] A owned-by-viewer private    | private    |          |
```

### Leaked page ids: OLD returns these, NEW does not

```
 id |           title           | visibility | space_id | project_id
----+---------------------------+------------+----------+------------
  4 | [p2] A space-incl private | private    |        1 |
 10 | [p2] A proj-incl private  | private    |          |        135
```

**Two leaks:** id 4 (private page in a space the viewer is a member of) and id 10 (private page in a project the viewer is a member of). These are the concrete rows that the fixed visibility guard suppresses.

### Positive controls — pages the NEW predicate must still return

```
 id |               title               | visibility |        reason
----+-----------------------------------+------------+----------------------
  2 | [p2] A standalone org             | org        | other
  3 | [p2] A standalone public          | public     | other
  5 | [p2] A space-incl org             | org        | space-member org/pub
  6 | [p2] A space-incl public          | public     | space-member org/pub
 11 | [p2] A proj-incl org              | org        | proj-member org/pub
 12 | [p2] A proj-incl public           | public     | proj-member org/pub
 16 | [p2] A authored-by-viewer private | private    | authored
 17 | [p2] A owned-by-viewer private    | private    | owned
```

All 8 expected pages present. The `authored` and `owned` private pages remain visible despite the visibility guard change (those arms do not carry a visibility restriction in the code, and correctly so).

### Grant branch positive control — granted private page

```
 id |              title               | visibility
----+----------------------------------+------------
 18 | [p2] A granted-to-viewer private | private
```

Page 18 (private, no other entitlement) is visible via `kb_page_grants` with `membership_id=69`, `access='view'`, `revoked_at IS NULL`. This is the `grantBranch` path which is evaluated separately in `buildVisiblePageScope` and is unaffected by the indexed-branch fix.

**The fix bites exactly as intended: two private-page leaks suppressed, eight expected pages still visible, one granted page visible via the separate grant branch.**

---

## 3. Tenant isolation proof

All queries below run as `streamline_app`.

### 3a. Isolation with GUC = org-a

```sql
SET app.organization_id = 'p2-org-a';
SELECT count(*) FROM kb_pages;              -- 18  (all org-a pages)
SELECT count(*) FROM kb_pages WHERE org_id = 'p2-org-b';  -- 0
```

Org-a pages: **18**. Org-b pages visible under org-a GUC: **0**.

### 3b. Control: switch to org-b

```sql
SET app.organization_id = 'p2-org-b';
SELECT count(*) FROM kb_pages WHERE org_id = 'p2-org-b';  -- 5
SELECT count(*) FROM kb_pages WHERE org_id = 'p2-org-a';  -- 0
```

Org-b pages under org-b GUC: **5**. Org-a pages invisible: **0**. Isolation is symmetric.

### 3c. Fail-closed with GUC absent

`kb_pages` uses `current_org_id_or_null()` in its RLS policy (this OR-ed against a public-token arm is the page-specific policy shape visible in SESSION-08). When the GUC is absent, `current_org_id_or_null()` returns NULL, so `org_id = NULL` is false for every row, and the public-token arm is also NULL-false. Result: **0 rows returned, no error raised.**

`kb_article_chunks`, `kb_page_grants`, and `kb_spaces` use `current_org_id()` (which raises 42501 directly when the GUC is absent). Query result with no GUC:

```
ERROR:  no tenant context: app.organization_id is not set for this transaction
CONTEXT:  PL/pgSQL function current_org_id() line 7 at RAISE
```

Direct call confirms this:
```sql
RESET app.organization_id;
SELECT app.current_org_id();
-- ERROR:  no tenant context: app.organization_id is not set for this transaction
--   ERRCODE = '42501'
```

### 3d. Distinguishing 42501 from missing GRANT vs missing policy

**Missing GRANT** (table exists, `streamline_app` has SELECT revoked):

```sql
-- As streamline_app, GUC set:
SELECT count(*) FROM p2_no_grant_test;
-- ERROR:  permission denied for table p2_no_grant_test
```

The error fires immediately before any row scan. This is PostgreSQL's object-level permission check at query parse/plan time, not RLS evaluation.

**RLS enabled, no policy** (table exists, `streamline_app` has SELECT, RLS ON, no USING clause):

```sql
SELECT count(*) FROM p2_no_policy_test;  -- 0 rows, no error
```

PostgreSQL's default-deny-all behavior: with RLS enabled and no matching policy, all rows are filtered silently. This is indistinguishable from "the table is empty" by row count alone.

**Summary of `42501` signatures:**

| Scenario | Observed behavior |
|---|---|
| Missing SELECT grant | Hard `ERROR: permission denied for table …` before scan |
| RLS enabled, no policy | 0 rows, no error |
| GUC absent, `current_org_id()` table | `ERROR: no tenant context` (42501 propagates from USING clause) |
| GUC absent, `current_org_id_or_null()` table | 0 rows, no error (NULL-comparison false on all rows) |
| GUC set correctly | Normal rows per policy |

The `current_org_id()` variant propagates the exception through the RLS USING clause evaluation in PostgreSQL 18. The `_or_null` variant silently fails closed. Both are "closed" but the distinction matters when diagnosing: a silent zero-row result from `kb_pages` with no GUC is not the same failure mode as a hard error from `kb_article_chunks` with no GUC.

---

## 4. EXPLAIN (ANALYZE, BUFFERS) plans

Measured as `streamline_app` with `app.organization_id='p2-org-a'` on PostgreSQL 18.0.  
**Cardinality at measurement: 18 kb_pages (org-a), 23 total, 4 kb_article_chunks, 1 kb_page_grant.**  
These row counts are 50–100 000× smaller than the production-scale SESSION-08 measurement. The plans below prove index reachability and predicate correctness; they do not characterize behavior at scale. The SESSION-08 measurement at 50,000 pages / 100,000 grants (against production Aurora, rolled back) remains the authority on scale behavior.

### 4a. Page collection (full indexed-branch predicate, 18-row table)

```
Sort  (cost=5.30..5.30 rows=1 width=76) (actual time=0.132..0.133 rows=8.00 loops=1)
  Sort Key: id
  Sort Method: quicksort  Memory: 25kB
  Buffers: shared hit=4
  ->  Seq Scan on kb_pages  (cost=0.00..5.29 rows=1 width=76) (actual time=0.041..0.073 rows=8.00 loops=1)
        Filter: ((deleted_at IS NULL) AND (org_id = 'p2-org-a'::text) AND
          (((visibility = ANY ('{org,public}'::text[])) AND (project_id IS NULL)
            AND ((space_id IS NULL) OR (space_id = ANY ('{1}'::integer[]))))
           OR (created_by_id = 'p2-u-a-viewer'::text)
           OR (owner_membership_id = 69)
           OR (created_by_membership_id = 69)
           OR ((visibility = ANY ('{org,public}'::text[])) AND (space_id IS NOT NULL)
               AND (space_id = ANY ('{1}'::integer[])))
           OR ((visibility = ANY ('{org,public}'::text[])) AND (project_id IS NOT NULL)
               AND (project_id = ANY ('{135}'::integer[]))))
          AND ((org_id = current_org_id_or_null())
               OR (public_token_hash = current_public_token_or_null())))
        Rows Removed by Filter: 15
        Buffers: shared hit=1
Planning:
  Buffers: shared hit=109
Planning Time: 2.629 ms
Execution Time: 0.182 ms
```

- **Buffers: 1 data page** (shared hit). Seq Scan is correct at 23 rows; the planner would use `idx_kb_pages_org_updated` or `idx_kb_pages_org_deleted` at scale.
- The RLS policy is inlined into the filter as `current_org_id_or_null()` — confirms this table uses the `_or_null` variant.
- The `OR` across 6 visibility/container branches is the known plan limitation documented in SESSION-08; at this cardinality it has no cost impact.

### 4b. Full-text search (fts @@ tsquery)

```
Sort  (cost=5.17..5.17 rows=1 width=36) (actual time=0.154..0.155 rows=0.00 loops=1)
  Sort Key: id
  Sort Method: quicksort  Memory: 25kB
  Buffers: shared hit=1
  ->  Seq Scan on kb_pages  (cost=0.00..5.16 rows=1 width=36) (actual time=0.144..0.144 rows=0.00 loops=1)
        Filter: ((deleted_at IS NULL) AND (org_id = 'p2-org-a'::text)
          AND ((org_id = current_org_id_or_null())
               OR (public_token_hash = current_public_token_or_null()))
          AND (fts @@ '''quick'' | ''brown'''::tsquery))
        Rows Removed by Filter: 23
        Buffers: shared hit=1
Planning:
  Buffers: shared hit=30
Planning Time: 680.169 ms
Execution Time: 0.200 ms
```

- **0 rows returned.** The seeded pages have fixture titles ("standalone", "space-incl", etc.) with no "quick" or "brown" text, so a real FTS match is correct.
- **GIN index `idx_kb_pages_fts` is NOT used.** Seq Scan despite the index existing. This confirms the documented behavior (MEMORY: "RLS defeats GIN/trigram indexes"): the RLS policy qual contains `current_org_id_or_null()`, which is not leakproof, and a non-leakproof function in the filter prevents index-only access via GIN.
- 680 ms planning time is a one-time cold-start cost for the `to_tsquery` parse; execution is sub-ms.

### 4c. kb_article_chunks semi-join (retrieval path)

```
Result  (cost=0.40..13.72 rows=1 width=44) (actual time=0.115..0.130 rows=2.00 loops=1)
  One-Time Filter: (current_org_id() = 'p2-org-a'::text)
  Buffers: shared hit=4
  ->  Nested Loop  (cost=0.40..13.72 rows=1 width=44) (actual time=0.081..0.096 rows=2.00 loops=1)
        Join Filter: (c.page_id = p.id)
        Buffers: shared hit=4
        ->  Index Scan using uniq_kb_article_chunks_org_id on kb_article_chunks c
              (cost=0.14..8.16 rows=1 width=44) (actual time=0.042..0.044 rows=2.00 loops=1)
              Index Cond: (org_id = 'p2-org-a'::text)
              Index Searches: 1
              Buffers: shared hit=2
        ->  Seq Scan on kb_pages p  (cost=0.00..5.29 rows=1 width=4)
              (actual time=0.020..0.020 rows=1.00 loops=2)
              Filter: ((deleted_at IS NULL) AND (org_id = 'p2-org-a'::text)
                AND (... indexed-branch predicate ...)
                AND ((org_id = current_org_id_or_null())
                     OR (public_token_hash = current_public_token_or_null())))
              Rows Removed by Filter: 1
              Buffers: shared hit=2
Planning:
  Buffers: shared hit=51
Planning Time: 2.028 ms
Execution Time: 0.221 ms
```

- **2 rows returned** (both chunks on the org-a standalone-org page, which is visible to the viewer).
- **4 buffers total** (2 for chunks index scan, 2 for pages seq scan in nested loop).
- `One-Time Filter: (current_org_id() = 'p2-org-a'::text)` — the planner evaluates `current_org_id()` once and folds it as a constant. This confirms `kb_article_chunks` uses `current_org_id()` (the raising variant). The planners sees the GUC value is constant for the query and inlines it.
- Index `uniq_kb_article_chunks_org_id` serves the chunks scan by org. At scale the HNSW index (`idx_kb_chunks_embedding_hnsw`) would serve the ANN vector search path; at 4 rows, the planner uses the btree.

### 4d. Page-grants lookup (grant branch EXISTS)

```
Result  (cost=5.54..13.59 rows=1 width=68) (actual time=0.227..0.229 rows=1.00 loops=1)
  One-Time Filter: (current_org_id() = 'p2-org-a'::text)
  Buffers: shared hit=3
  ->  Merge Semi Join  (cost=5.54..13.59 rows=1 width=68) (actual time=0.213..0.214 rows=1.00 loops=1)
        Merge Cond: (p.id = g.page_id)
        Buffers: shared hit=3
        ->  Sort  (cost=5.15..5.15 rows=1 width=68) (actual time=0.099..0.101 rows=18.00 loops=1)
              Sort Key: p.id
              Sort Method: quicksort  Memory: 25kB
              Buffers: shared hit=1
              ->  Seq Scan on kb_pages p  (cost=0.00..5.14 rows=1 width=68)
                    (actual time=0.033..0.076 rows=18.00 loops=1)
                    Filter: ((deleted_at IS NULL) AND (org_id = 'p2-org-a'::text)
                      AND ((org_id = current_org_id_or_null())
                           OR (public_token_hash = current_public_token_or_null())))
                    Rows Removed by Filter: 5
                    Buffers: shared hit=1
        ->  Index Scan using idx_kb_page_grants_org_page_live on kb_page_grants g
              (cost=0.14..8.17 rows=1 width=4) (actual time=0.102..0.103 rows=1.00 loops=1)
              Index Cond: (org_id = 'p2-org-a'::text)
              Filter: ((membership_id = 69) AND (access = ANY ('{view,comment,edit,manage}'::text[])))
              Index Searches: 1
              Buffers: shared hit=2
Planning:
  Buffers: shared hit=13
Planning Time: 1.077 ms
Execution Time: 0.310 ms
```

- **1 row returned** (the granted private page, id 18). Correct.
- **3 buffers total** (1 for pages seq scan, 2 for grants index scan).
- Index `idx_kb_page_grants_org_page_live` serves the grant scan. At 1 grant row this is trivial; the index behavior at 100,000 grants is the scale-proven measurement in SESSION-08 (207 buffers for 50-row page, 50 index searches).
- The `One-Time Filter: (current_org_id() = 'p2-org-a'::text)` confirms `kb_page_grants` also uses the raising variant.
- This query isolates the grant branch alone. The SESSION-08 measurement showed that OR-ing this EXISTS into the main predicate degrades to a hashed SubPlan (Seq Scan on all grants); the architectural fix is to evaluate the branches separately and UNION the results.

---

## 5. Ledger boxes this closes

**SESSION-08 open item:** "a third item is open but honestly recorded as unproven rather than wrong: the EXPLAIN captured on 2026-09-25 shows both queries reaching `idx_kb_page_grants_org_page_live` with the RLS policy degenerating to a One-Time Filter — but `kb_page_grants` held 0 rows."

This session does not supersede the SESSION-08 scale measurement (50k/100k rows on Aurora) — that remains authoritative for scale behavior. What this session adds that SESSION-08 did not have:

1. **The container-membership leaks were never executed against real rows.** The defect was described and the fix was described, but no row-level proof existed that pages 4 and 10 (private pages inside a viewer-accessible space/project) appeared in the old predicate and not the new one. That proof is now in Section 2 above.

2. **The positive controls were never executed.** It was asserted that authored/owned private pages and org/public container pages would remain visible under the new predicate. Section 2 proves all 8 expected pages remain present.

3. **The grant branch was never proven with an actual grant row.** The SESSION-08 EXPLAIN was taken against 0 `kb_page_grants` rows. This session has 1 grant row, and Section 2 shows the granted page appears. Section 4d shows the index serving the grant scan at cardinality=1.

4. **The fail-closed distinction** (missing grant vs missing policy vs GUC-absent) was described in the memory ledger as a note but never demonstrated with actual error output. Section 3d provides the three distinct error signatures.

**Open item that this session does NOT close:** the OR-branch plan degradation at scale (38ms vs 0.3ms at 100k grants in SESSION-08). That is an architectural decision about whether to UNION the grant and indexed branches; it is out of scope for this predicate-proof session.
