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

- [ ] Verify complete mention semantics and tenant isolation through the SQL function, with bounded candidate counts and exact/prefix/substring cases; record the intended matching contract explicitly
- [ ] Journal/apply/verify the function before the dependent code deploys; measure the actual plan under the application role before claiming index-served performance

**RLS reasoning (why a SECURITY DEFINER function, not a direct GIN query):**

`users` has no `org_id` column and no RLS policy, so the GIN trigram indexes `idx_users_email_trgm` and `idx_users_name_trgm` (created by migration 0007) are reachable on that table without RLS interference. However, the mention query joins through `organization_members`, which has an `org_id` RLS policy. The `textlike` operator behind ILIKE is non-leakproof; under the `organization_members` security barrier the planner cannot evaluate the ILIKE before the security qual and skips the GIN index on `users`, falling back to a sequential scan. This is the same finding documented in migration 0275 for `business_parties`.

`ALTER FUNCTION … LEAKPROOF` is impossible on Neon (BE-80). A SECURITY DEFINER function (`app.search_mention_user_ids`) is the established escape: inside SECURITY DEFINER the BYPASSRLS owner role applies, no security barrier exists, and both GIN indexes are reachable. Org scope comes from `app.current_org_id()` (the per-connection GUC, not a parameter), so the function fails closed 42501 with no tenant context. It returns ids only. The caller's Drizzle query still applies `eq(organizationMembers.orgId, input.orgId)` as defense-in-depth.

**Migration ordering:**

Migration 1377 (`app.search_mention_user_ids`) must be applied **before** the updated `processCommentMentions` code ships. The code calls `app.search_mention_user_ids` at runtime; if the function does not exist the call raises `42883` (function not found) and 500s in production. Railway deploys on every push, so the migration must precede the push that ships the code change.

- [ ] Mention resolution no longer uses a leading-wildcard match
  — `backend/src/modules/build/core/projects-activity.service.ts`: `processCommentMentions` now calls `app.search_mention_user_ids(${tokens})` via `this.db.execute(sql\`...\`)` and uses `inArray(users.id, candidateIds)` for the org-scoped detail fetch; `ilike` and `or` imports removed.
- [ ] The supporting index exists, is journalled, and has a rollback authored
  — `idx_users_email_trgm` and `idx_users_name_trgm` already exist from migration 0007 and are retained. Migration 1377 (`backend/migrations/1377_mention_search_index.sql`) creates only the SECURITY DEFINER function; rollback is `backend/migrations/rollback/1377_mention_search_index.down.sql`. Journal entry required: `{ "idx": 1121, "tag": "1377_mention_search_index" }`.
- [ ] The migration is applied before the reading code can deploy
  — noted above; 1377 must precede the push that ships `processCommentMentions`.
- [ ] Mentioning a person by partial name or email still resolves to the same person
  — the function uses `ILIKE '%' || tok || '%'` on `users.email` and `users.name` (same columns, same pattern). `matchMentionedUsers` then applies the same exact-match logic as before.
- [ ] Resolution stays scoped to the organisation
  — `app.current_org_id()` in the function enforces org scope; the caller additionally applies `eq(organizationMembers.orgId, input.orgId)`.
