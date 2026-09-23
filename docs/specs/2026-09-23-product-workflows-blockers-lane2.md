# Lane 2 blockers — Feedbucket server-side filtering + bulk actions

Scope: `backend/src/modules/feedbucket/**`, `frontend/features/build/feedbucket/**`,
`frontend/hooks/api/feedbucket/**`, `frontend/types/feedbucket.ts`,
`frontend/lib/query-keys/growth-and-sign.ts`.

Each item below stopped work inside that scope. Nothing here was guessed at in code.

---

## B1 — The `duplicate` filter is not buildable without a migration

**Question.** Should `feedbucket_submissions` gain a duplicate relationship
(`duplicate_of_submission_id` / `merged_into_submission_id`), and if so, is a duplicate a
soft link (both rows stay listable) or a merge (the loser leaves the default list)?

**Why it blocks.** There is no column to filter on.

- `backend/src/db/schema/build/feedback.ts` — `feedbucketSubmissions` has no duplicate,
  merge or parent column. Editing schema implies a migration, which this lane is forbidden
  to author.
- `backend/src/modules/feedbucket/feedbucket-list-filters.spec.ts:106-111` is a **deliberate
  regression spec**: `listSubmissionsQuerySchema` must 400 on a `duplicate` param precisely
  because the column does not exist. It was left untouched and still passes.
- A migration cannot be proven here: BE-66 requires replay on an empty database and no
  non-production Postgres is reachable in this environment.

**Options.**
1. Defer. Keep the 400 and the spec that pins it. *(what this lane did)*
2. Add `duplicate_of_submission_id integer NULL REFERENCES build.feedbucket_submissions(id)`
   plus a partial index led by `org_id`, in a lane that can replay the migration. The filter
   is then `IS NOT NULL` / `IS NULL`, the same tri-state shape as `linked`.
3. Model duplicates as a link table (BE-43 prefers this for a many-to-many), which costs a
   join on every list read.

---

## B2 — Submission retention: soft delete leaves the media behind

**Question.** When a submission is deleted — singly or in bulk — should its screenshot and
recording objects be purged from storage immediately, on a retention sweep, or never?

**Why it blocks.** The two existing delete paths already disagree, and the new bulk delete
had to pick one without a rule to follow.

- `feedbucket-submissions.service.ts` `softDelete` sets `deletedAt` and touches **no**
  storage object. The row's `screenshotKey` and its `feedbucket_attachments` rows survive.
- `feedbucket-submissions.service.ts` `deleteMedia` (the explicit "delete the screenshot"
  action) *does* purge: it hard-deletes the attachment rows and calls
  `storage.deleteFileIfPresent` for every key, after commit.
- No cron sweep references feedbucket: `grep -rl feedbucket backend/src/modules/cron/`
  returns nothing. So nothing ever reclaims the bytes of a soft-deleted submission.

**What this lane shipped.** Bulk delete mirrors `softDelete` exactly — `deleted_at` only, no
storage call. That is the conservative choice (it is reversible and cannot orphan a live
object), but it is a choice, not a decision.

**Options.**
1. Keep parity with `softDelete`; add a retention sweep later that purges media for
   submissions soft-deleted more than N days ago. Needs N.
2. Purge media on delete, matching `deleteMedia`. Makes a soft delete irreversible in
   substance while pretending to be reversible.
3. Purge only on a future hard-delete/DPDP erasure path (BE-52). Needs that path to exist.

---

## B3 — Offset pagination is still served, for a page outside this lane's allowlist

**Question.** Who cuts `features/build/managed-products/product-feedback-page.tsx` over to the
cursor walk, and may the offset branch of `GET /feedbucket/submissions` then be deleted?

**Why it blocks.** The endpoint could not become keyset-only without breaking a file this lane
may not edit.

- `frontend/features/build/managed-products/product-feedback-page.tsx:136-197` calls
  `useFeedbucketSubmissions({ managedProductId, page, limit })` and feeds
  `data?.total ?? 0` into `DataTable` `pagination={{ mode: "server", … }}`. That directory is
  not in this lane's allowlist.
- Deleting `total` from the response contract would have made that file fail
  `pnpm type-check`; leaving `total` present but always absent at runtime would have silently
  removed its pager — the regression shape recorded in
  `pagination-cutover-without-the-client-is-a-regression`.

**What this lane shipped.** A request carrying `cursor` is pure keyset: the response is
`{ data, pagination: { limit, hasMore, nextCursor } }` with **no** `total`, `page` or
`totalPages`, and no `COUNT(*)` is issued (BE-25). A request with no `cursor` additionally
carries a real `count(*)`-derived `page` / `total` / `totalPages`, which is what the
managed-products page still uses. The Build inbox uses the cursor walk exclusively.

**Options.**
1. A follow-up lane cuts `product-feedback-page.tsx` to `useCursorPagination` +
   `DataTable mode: "cursor"`, then the offset branch and the three optional response fields
   are deleted. *(recommended)*
2. Keep both modes permanently and document the offset branch as the "product rollup" read.
3. Give managed-products its own endpoint, duplicating the predicate — which BLD-03-013
   explicitly forbids.

---

## B4 — "Select all matching these filters" is not implemented

**Question.** Should a bulk action be able to target *every* row matching the current filters
(potentially thousands) rather than only the rows selected on the loaded page?

**Why it blocks.** BLD-06-027 caps a bulk at a record count, and the copied precedent
(`build-ticket-bulk-mutation.ts:35-37`, `.max(100)` plus a runtime guard) caps at 100 ids.
A predicate-targeted bulk has no such ceiling and would need a different mechanism — a
background job with progress, or a chunked cursor walk — plus a different idempotency story,
because one key cannot fence an operation whose target set changes between chunks.

**What this lane shipped.** Selection is per loaded page and labelled as such: the toolbar
reads "*N* selected on this page", and over 100 every control disables with the ceiling
stated. The request carries both the ids **and** the live filters, so the server intersects
them — an id that no longer matches the filters is reported `skipped`, never mutated.

**Options.**
1. Leave it at 100 per page. *(what this lane did)*
2. Add an explicit "apply to all N matching" affordance backed by a job queue and a progress
   surface. Needs a decision on N's upper bound and on what the user sees while it runs.

---

## B5 — Billing / plan gating of bulk actions

**Question.** Is a bulk mutation metered, plan-gated, or rate-limited differently from N
single mutations?

**Why it blocks.** `@RequireModule("feedbucket")` gates the controller, and nothing in the
module consults credits or a plan for a non-AI write. `POST /feedbucket/submissions/bulk`
was therefore shipped with no `@UseRateLimit` tier and no billing check, matching
`ProjectsTicketsController.bulkUpdate`. If bulk is meant to be a paid capability, or to carry
a tighter rate limit than the single-row PATCH it replaces, that has to be decided before it
is advertised.

**Options.**
1. Treat it as N writes, unmetered. *(what this lane did, matching the ticket precedent)*
2. Add a `TIERS` entry and `@UseRateLimit` (BE-35) sized to the 100-row ceiling.
3. Plan-gate it, which needs a `MODULE_CATALOG` decision this lane must not make.

---

## B6 — No index exactly matches the new keyset ORDER BY

**Question.** Should `build.feedbucket_submissions` gain
`(org_id, created_at DESC, id DESC) WHERE deleted_at IS NULL`?

**Why it blocks.** The keyset walk orders by `created_at DESC, id DESC` — the tie-breaker is
required, because a widget burst writes many rows in the same second and a cursor on
`created_at` alone skips or repeats at every page boundary. The three existing indexes
(`backend/src/db/schema/build/feedback.ts:177-179`) are
`(org_id, widget_id, status, created_at)`, `(org_id, status, created_at)` and
`(org_id, assignee_membership_id)`. None carries `id`, so the row-value comparison can use a
leading prefix but the final ordering is not index-ordered.

Adding the index is a migration, and BE-66 cannot be satisfied here (B1's reasoning). It was
not authored. This is a performance item, not a correctness one: the page is already bounded
at `limit + 1` rows and every read carries an explicit `org_id` predicate, so a missing index
costs a sort, not a wrong answer.

**Options.**
1. Measure first, in buffers and as `streamline_app` with the tenant GUC set (BE-76, BE-77),
   before adding a fourth index to a table that already has three. *(recommended)*
2. Add the index in a lane that can replay it.
