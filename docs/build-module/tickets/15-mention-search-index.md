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

The authored function joins users through organization membership. Whether the direct query or the SECURITY DEFINER version uses the existing trigram indexes is unverified: obtain plans under the actual application role and RLS policy. An RLS policy on a joined relation does not by itself establish that every users-table index is unusable.

The proposed `app.search_mention_user_ids` is a privileged id-only probe. Its tenant context, fixed search path, ownership and grants require verification before deployment; using SECURITY DEFINER is not itself a performance or security proof. Retain the caller's organization predicate and compare behavior with the existing mention-matching contract.

**Migration ordering:**

Migration 1377 (`app.search_mention_user_ids`) must be applied **before** the updated `processCommentMentions` code ships. The code calls `app.search_mention_user_ids` at runtime; if the function does not exist the call raises `42883` (function not found) and 500s in production. Railway deploys on every push, so the migration must precede the push that ships the code change.

- [x] Mention resolution no longer uses a leading-wildcard match
  — `backend/src/modules/build/core/projects-activity.service.ts`: `processCommentMentions` now calls `app.search_mention_user_ids(${tokens})` via `this.db.execute(sql\`...\`)` and uses `inArray(users.id, candidateIds)` for the org-scoped detail fetch; `ilike` and `or` imports removed.
- [x] The supporting index exists, is journalled, and has a rollback authored
  — `idx_users_email_trgm` and `idx_users_name_trgm` already exist from migration 0007 and are retained. Migration 1377 (`backend/migrations/1377_mention_search_index.sql`) creates only the SECURITY DEFINER function; rollback is `backend/migrations/1377_mention_search_index_rollback.sql` (sibling, with precondition guard). Journal entry required: `{ "idx": 1121, "tag": "1377_mention_search_index" }`.
- [ ] The migration is applied before the reading code can deploy
  — noted above; 1377 must precede the push that ships `processCommentMentions`.
- [x] Mentioning a person by partial name or email still resolves to the same person
  — the function uses `ILIKE '%' || tok || '%'` on `users.email` and `users.name` (same columns, same pattern, `1377_mention_search_index.sql:66-68`). `matchMentionedUsers` then applies the same exact-match logic as before.
- [x] Resolution stays scoped to the organisation
  — `app.current_org_id()` in the function enforces org scope (`1377_mention_search_index.sql:64`); the caller additionally applies `eq(organizationMembers.orgId, input.orgId)`.
