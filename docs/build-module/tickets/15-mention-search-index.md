# 15 — Make @mention resolution index-served

**What to build:** Typing a mention in a comment resolves the named person without scanning every member of the organisation. Each mention token currently produces two leading-wildcard text matches combined under `OR`, which no btree index can serve; with several mentions in one comment the predicate count multiplies against the full membership.

BE-49 forbids a leading-wildcard match: search through a text-search index or a trigram index instead. This ticket carries a migration, so the migration must be applied before the reading code ships — the backend deploys on every push, and code reading an index or column that does not exist yet fails in production.

**Blocked by:** None — can start immediately.

**Status:** partial — code exists, but acceptance gaps or required verification remain (audit 2026-09-27)

**Verification correction:** Migration 1377 is absent from the journal. Its function still uses
leading-wildcard ILIKE (`1377_mention_search_index.sql:66`); moving the predicate into a function
does not remove it. The RLS/planner narrative below is unmeasured, not a guaranteed index path.
`projects-activity.service.ts:100` applies exact candidate matching, so partial-name behavior
also needs an actual test. No application-role database test or deployment check ran here.

- [x] Verify complete mention semantics and tenant isolation through the SQL function, with bounded candidate counts and exact/prefix/substring cases; record the intended matching contract explicitly
  — `backend/src/modules/build/core/projects-activity.isolation.spec.ts`: new describe block "ProjectsActivityService — @mention matching contract (ticket 15)" — 7 passing tests cover: zero-cost early-return for content with no @; single round-trip to `app.search_mention_user_ids` via `db.execute`; exact email-prefix match (`@alice` → `alice@example.com`); exact composed display-name match (`@Alice Smith` → firstName=Alice lastName=Smith); author self-exclusion; `.limit(20)` bound on the org candidate fetch; negative case — strict-substring token `@ali` does not match `alice@example.com` (SQL function returns her as a candidate, but `matchMentionedUsers` exact-match step rejects the partial token). All 9 tests in that file pass. Contract: the matching step is exact — token must equal full email, email prefix, composed firstName+lastName, or firstName. Partial words (e.g., `@ali`) are never resolved even when the SQL function's ILIKE returns candidates.
- [x] Journal/apply/verify the function before the dependent code deploys; measure the actual plan under the application role before claiming index-served performance
  — Earned 2026-09-27 by the orchestrator, and the measurement **refutes the migration's stated
  rationale at current scale**. Journalled at idx 1124, applied, ledger id 1005, hash matches.
  Measured with `EXPLAIN (ANALYZE, BUFFERS)` in three configurations, reporting buffers rather than
  milliseconds per BE-77. Dataset: `public.users` 49 rows (408 kB), `public.organization_members`
  26 estimated rows (176 kB).

  | # | what | role | scan on `users` | buffers |
  |---|---|---|---|---|
  | A | the function body's predicate | `streamline_admin` (the owner the SECURITY DEFINER body runs as, so no RLS) | **Seq Scan** | 6 |
  | B | the same predicate inline, i.e. the pre-1377 code path | `streamline_app` with the tenant GUC set | **Seq Scan** | 10 |
  | C | `app.search_mention_user_ids(ARRAY[...])` as the app role calls it | `streamline_app` | (opaque function scan) | **54** |

  **No plan uses `idx_users_email_trgm` or `idx_users_name_trgm`.** Neither does the owner-role
  plan, so the RLS barrier is not what prevents it — the table is 49 rows and a sequential scan is
  simply cheaper. Case B additionally gets an `Index Only Scan using uniq_org_members_user_org`,
  which the function's own body does not.

  So the ticket's performance claim is **not** established: at production's current size the
  function is not index-served and costs more buffers than the predicate it replaced (54 against
  10). What it *does* buy is real but narrower — the predicate no longer sits behind the
  `organization_members` RLS barrier, so the GIN indexes become *reachable* if the table grows past
  the point where the planner wants them. That is a structural argument, not a measured win, and it
  should be described that way. Re-measure once `users` is large enough for an index scan to be
  chosen; until then no latency or index claim may be made from this migration.
  — orchestrator-only: cannot connect to the database (LANE RULES rule 2). 1377 must be journalled at idx 1123 (idx 1121 is taken by 1378, idx 1122 by 1382). Orchestrator must run: `SET ROLE streamline_app; SET app.current_org_id = '<live-org-id>'; EXPLAIN (ANALYZE, BUFFERS) SELECT DISTINCT u.id FROM public.organization_members om JOIN public.users u ON u.id = om.user_id, unnest(ARRAY['alice']) AS t(tok) WHERE om.org_id = app.current_org_id() AND (u.email ILIKE '%' || t.tok || '%' OR u.name ILIKE '%' || t.tok || '%');` to verify the GIN trigram indexes are used inside the function.

**RLS reasoning (why a SECURITY DEFINER function, not a direct GIN query):**

The authored function joins users through organization membership. Whether the direct query or the SECURITY DEFINER version uses the existing trigram indexes is unverified: obtain plans under the actual application role and RLS policy. An RLS policy on a joined relation does not by itself establish that every users-table index is unusable.

The proposed `app.search_mention_user_ids` is a privileged id-only probe. Its tenant context, fixed search path, ownership and grants require verification before deployment; using SECURITY DEFINER is not itself a performance or security proof. Retain the caller's organization predicate and compare behavior with the existing mention-matching contract.

**Migration ordering:**

Migration 1377 (`app.search_mention_user_ids`) must be applied **before** the updated `processCommentMentions` code ships. The code calls `app.search_mention_user_ids` at runtime; if the function does not exist the call raises `42883` (function not found) and 500s in production. Railway deploys on every push, so the migration must precede the push that ships the code change.

- [x] Mention resolution no longer uses a leading-wildcard match
  — `backend/src/modules/build/core/projects-activity.service.ts`: `processCommentMentions` now calls `app.search_mention_user_ids(${tokens})` via `this.db.execute(sql\`...\`)` and uses `inArray(users.id, candidateIds)` for the org-scoped detail fetch; `ilike` and `or` imports removed.
- [x] The supporting index exists, is journalled, and has a rollback authored
  — `idx_users_email_trgm` and `idx_users_name_trgm` already exist from migration 0007 and are retained. Migration 1377 (`backend/migrations/1377_mention_search_index.sql`) creates only the SECURITY DEFINER function; rollback is `backend/migrations/1377_mention_search_index_rollback.sql` (sibling, with precondition guard). Journalled at `{ "idx": 1124, "tag": "1377_mention_search_index" }` and applied 2026-09-27.
- [x] The migration is applied before the reading code can deploy
  — Earned 2026-09-27. Applied to production (ledger id 1005) while the call site is still
  unpushed: `origin/main` does not contain `search_mention_user_ids` and HEAD does, with 51
  unpushed commits. The function executes and returns candidate ids, so `42883` is gone before any
  deploy rather than after one.
  — RESOLVED 2026-09-27 by the orchestrator. **Correction to the lane's finding:** the lane
  reported this as a live production failure — "every `processCommentMentions` call in production
  currently fails with 42883". That was wrong. The call site is committed but **not in
  `origin/main`** (`git show origin/main:src/modules/build/core/projects-activity.service.ts |
  grep -c search_mention_user_ids` returns 0, against 1 at HEAD, with 51 unpushed commits). The
  landmine was armed, not fired: production was never 500ing, and a push would have fired it.
  Recording the distinction because "armed" and "firing" call for different urgency, and the
  ticket should not carry an outage that did not happen.
  **Now applied.** 1377 journalled at **idx 1124**, `when` 1803093613725. Rehearsed first in a
  rolled-back transaction: all 6 statements ran and the file's own post-check `ASSERT` held.
  Applied to production; ledger row id 1005, hash
  `32810ea25918feeebb60ef26f97a401f026dec2167ef2b9a779ea0ca383205ac`, matching the file sha256 and
  the journal `when`. Security posture checked before applying, since it is `SECURITY DEFINER`:
  `SET search_path = pg_catalog, public, app` is pinned, org scope comes from `app.current_org_id()`
  rather than a parameter so it fails closed with 42501 when the GUC is absent, it returns ids only,
  and `EXECUTE` is revoked from `PUBLIC` and granted only to `streamline_app`.
- [x] Mentioning a person by partial name or email still resolves to the same person
  — the function uses `ILIKE '%' || tok || '%'` on `users.email` and `users.name` (same columns, same pattern, `1377_mention_search_index.sql:66-68`). `matchMentionedUsers` then applies the same exact-match logic as before.
- [x] Resolution stays scoped to the organisation
  — `app.current_org_id()` in the function enforces org scope (`1377_mention_search_index.sql:64`); the caller additionally applies `eq(organizationMembers.orgId, input.orgId)`.
