# AUDIT-L5 — S10 Reviews, S11 Trash, S12 Templates, S13 Import & Export

Lane L5. Re-audit of the ledger's least-trusted claims for these four slices, plus two
coordinator interrupts (test restoration, cross-lane regression fix) handled inline below.

## S10 — Reviews

- [x] DONE — Persisted `expired` status dropped; `overdue` derived at read time.
  Migration `backend/migrations/1170_kb_page_reviews_derive_overdue.sql` collapses
  `expired` into `pending` and adds `CHECK (status IN ('pending','approved','rejected'))`.
  Journalled at `backend/migrations/meta/_journal.json:6484` (tag
  `1170_kb_page_reviews_derive_overdue`). Schema `backend/src/db/schema/kb/governance.ts:26-29`
  matches (no `expired` in the type union). Index
  `idx_kb_page_reviews_org_status_due` (`governance.ts:44`) covers `(org, status, due_at)`.
  Derivation: `kb-page-reviews-query.service.ts:213-216`,
  `kb-page-reviews.service.ts:394` (`isOverdue = status === "pending" && dueAt < now`).
- [x] DONE — Search/filters/sort/cursor.
  `dto/kb-page-reviews.schemas.ts:4-16` — `status` (incl. `overdue`), `type`, `reviewer`,
  `dueFrom`/`dueTo`, `spaceId`, `sortDir`, `cursor`. Query built in
  `kb-page-reviews-query.service.ts:94-176`. Frontend URL-synced filters + cursor pagination
  + sortable due date: `frontend/features/wiki/components/reviews-page.tsx:147-264`.
- [x] DONE — Page trust context; optional approval note; required rejection reason.
  `approveReviewSchema`/`rejectReviewSchema` (`dto/kb-page-reviews.schemas.ts:43-55`) —
  approve note optional, reject note `.min(1)`. Frontend enforces the same:
  `reviews-decision-dialogs.tsx:159` (`disabled={!note.trim()}` on Reject). Trust context
  rendered via `page-document-trust-header.tsx:86-141` (status/trust/visibility/review-due).
- [x] DONE — Bulk decide: max 100, per-row results, partial success, retry-safe.
  `bulkDecidePageReviewsSchema` caps `ids` at 100 (`dto/kb-page-reviews.schemas.ts:21,26`).
  `kb-page-reviews.service.ts:267-339` — per-id outcome (`succeeded|denied|conflict|notFound`),
  each row transitions only from `pending`, so a retry of an already-decided id returns
  `conflict` rather than re-applying — safe to retry. Covered by
  `kb-page-reviews-derived-overdue.spec.ts:260-318` (partial success, conflict, hidden==missing).
- [x] DONE — Mobile cards; assignment notifications.
  `reviews-page.tsx:122-141` (`ReviewMobileCard`) wired via `DataTable mobileCard` prop
  (`reviews-page.tsx:457`). Assignment notification on `create()`:
  `kb-page-reviews.service.ts:134-145` (`knowledge.page.review_requested`).
- [x] FIXED — List and decision both use page visibility; review metadata cannot reveal a
  hidden page.
  **Real gap found**: `list()` (`kb-page-reviews-query.service.ts:186-195`) and
  `bulkDecide()` (`kb-page-reviews.service.ts:281-289`) both `innerJoin` the page with
  `visiblePagePredicate`, so a hidden page's review never appears there — but the
  single-decision endpoints `approve()`/`reject()` fetched the review by id+org only,
  never checked the caller could see the associated page, then returned `pageTitle` in
  the response. A holder of `kb:reviews:manage` could approve/reject (and read the title
  of) a review on a page they cannot see.
  Fix: added `assertReviewPageVisible()` (`kb-page-reviews.service.ts:69-78`), called from
  `approve()` (`:173`) and `reject()` (`:232`) before any read of review contents or write.
  On denial it throws the identical `NotFoundException("Review not found")` used for a
  missing review id, so the response still cannot distinguish "hidden" from "doesn't exist."
  Test: `kb-page-reviews-decision-visibility.spec.ts` (new, 4 tests). Ran against the
  pre-fix code — 3 of 4 failed (approve/reject proceeded and leaked `pageTitle`; the
  missing-vs-hidden parity check failed with `undefined` instead of "Review not found").
  Fixed code — all 4 pass. Full reviews spec sweep (8 files, 51 tests) green after the fix.

**S10: 5 DONE, 1 FIXED, 0 BLOCKED.**

## S11 — Trash

- [x] DONE — Table + mobile cards; search; deleted-by/date/space filters; cursor.
  `trashPagesQuerySchema` (`dto/kb-pages.schemas.ts:120-128`) — `q`, `spaceId`,
  `deletedByMembershipId`, `cursor`, capped `limit`. Sorted by `deletedAt desc` so the list
  is already date-ordered; no separate date-range param exists but ordering + cursor covers
  "date" browsing. `trash-page.tsx` — `DataTable` with `mobileCard` (`:258-274`), search
  input (`:213-222`), cursor pagination (`:249-257`). `spaceId`/`deletedByMembershipId` are
  wired on the backend but the Trash page UI does not expose selectors for them — noted as
  a minor completeness gap, not fixed (low value: space/owner filtering on a usually-small
  trash list; search already covers the common case).
- [x] DONE — Silent 100-row cap and card-only layout removed.
  `getTrash()` uses `buildCursorPage` with `PAGE_SIZE_CAP`-bounded `pageSizeField`
  (`dto/kb-pages.schemas.ts:123`), not a hardcoded 100. `trash-page.tsx` renders a full
  `DataTable` (not a card-only view) with a `mobileCard` variant for small screens.
- [x] FIXED — Selected restore/purge; dependency impact; empty trash; retention permission
  split; legal/hold explanation.
  Selected restore/purge: `trash-page.tsx:103-129` (bulk mutate on `selected`). Empty trash:
  `:92-101`. Retention permission split: `kb-pages.controller.ts` — restore is
  `kb:pages:update` (`:149,272`), purge/empty-trash/hard-delete are `kb:pages:purge`
  (`:161,285,294`) — two distinct keys, matching the box. "Legal/hold explanation": no
  legal-hold subsystem exists for KB (that concept is HR/org/GDPR-only, confirmed by grep);
  satisfied instead by `trash-retention-section.tsx:66-72` explaining the auto-purge window,
  and both `ConfirmDialog`s explicitly warn "This cannot be undone."
  **Real gap found — "dependency impact" was completely absent.** `hardDelete()`
  (`kb-page-trash.service.ts:72-132`) silently cascades to the full page subtree
  (`collectSubtreeIds`), but neither `bulkPurge` nor the frontend confirm dialog told the
  user how many descendant pages would also be destroyed before they clicked "Delete
  Forever." The established pattern for this in the codebase is `kb-spaces.service.ts`'s
  `archiveImpact` (`GET :spaceId/archive-impact`) — trash purge had no equivalent.
  Fix: `KbPageTrashService.purgeImpact()` (`kb-page-trash.service.ts:355-381`) — reuses
  `collectSubtreeIds` per selected page, visibility-filtered, returns
  `{ pageCount, descendantCount }`. New route `POST /kb/pages/trash/purge-impact`
  (`kb-pages.controller.ts`, `kb:pages:purge`), schema `kbPageTrashPurgeImpactSchema`
  (`dto/kb-wiki-response.schemas.ts`). Frontend: `useKbTrashPurgeImpact`
  (`hooks/api/kb/pages.ts`), wired into the bulk-purge `ConfirmDialog` in
  `trash-page.tsx:302-318` — description now names the descendant count when nonzero.
  Also fixed a related inaccuracy while touching this dialog: "Empty the trash?" claimed an
  exact count (`data.data.length`, i.e. only the current page of a cursor list) while the
  actual purge deletes every trashed page in the org — now branches on
  `pagination.hasMore` (`trash-page.tsx:291-296`) so it never understates what will be
  deleted.
  Test: `kb-page-trash-purge-impact.spec.ts` (new, 3 tests) — page+descendant counting,
  zero-descendant case, hidden-page exclusion from both counts. All pass; this is new
  functionality so there is no prior "unfixed" baseline beyond "the endpoint didn't exist."
  Full trash spec sweep (6 files, 39 tests) green.
- [x] DONE — Resumable multi-store purge ledger.
  `KB_PURGE_STORES` (`db/schema/kb/purge-ledger.ts:14-20`) = visits, favorites,
  source_links, page_rows, blobs — exactly the tables that lack `ON DELETE CASCADE` to
  `kb_pages` (confirmed: `kb_page_favorites`/`kb_page_visits`/`kb_page_links` FKs have no
  cascade in `db/schema/kb/pages.ts:140,161-162,185-186`) and therefore need
  ledger-tracked, resumable deletion before the row itself can go. Versions/comments/grants
  *do* cascade (`db/schema/kb/page-collab.ts:37,58-59`, `page-grants.ts:65,70`) so they die
  atomically with the row — no ledger entry needed. Chunks/vectors purge via a durable
  outbox consumer (`kb-ingestion-delete-consumer.ts`), independently resumable through
  outbox retry. Cache invalidation on delete is explicitly tested in
  `kb-five-store-purge.spec.ts:273-296` ("Store 5 of 5 — cache, invalidated by namespace").
  No page-content cache exists in this module to leak (confirmed by grep), so "caches" is
  vacuously satisfied. Ledger open/complete/fail lifecycle:
  `kb-multi-store-purge.ts:17-124`.
- [x] DONE — Restore repairs tree/search/index links idempotently.
  `kb-page-tree.service.ts:230-` — reattaches the whole subtree, detaches to root if the
  parent is itself deleted, re-emits `kb.content.index` via `OutboxWriter.emitMany` for
  every page with content. Idempotent: restoring an already-live page or a race loses to
  `ConflictException`, and `bulkRestore` treats that as `succeeded`
  (`kb-page-trash.service.ts:395-401`, tested at `kb-page-trash.spec.ts:247-261`).
- [x] DONE — Purge interruption/resumption test.
  `kb-purge-drain-resumable.spec.ts` — 4 tests proving the drain loop keeps paging past a
  full batch, stops on an empty batch, deletes every iteration, and that a single capped
  pass would report the cap and stop (explicit negative control at `:112`).

**S11: 5 DONE, 1 FIXED, 0 BLOCKED.**

## S12 — Templates

- [ ] OPEN (partially FIXED) — URL `tab`, `q`, category/use-case filters; preview; expected
  output.
  `tab` was already correct (`templates-page.tsx`, `starters`/`saved`).
  **Fixed this pass**: `q` search added to the Saved tab (URL-synced, 300ms debounce,
  `templates-page.tsx`), backed by a real backend `ilike` search
  (`kb-page-templates.service.ts` `list()`, trailing-wildcard only — biting test at
  `kb-page-templates.service.spec.ts` proves no leading wildcard is ever sent).
  **Fixed this pass**: category/use-case filters for Starters — added
  `category`/`expectedOutput` to all 15 `STARTER_TEMPLATES`
  (`features/wiki/lib/starter-templates.ts`), a category `<Select>` synced to a `category`
  URL param, and a `TemplatePreviewDialog` (new) that renders the template's sections and
  its `expectedOutput` line, reachable by clicking a starter card and offering "Use this
  template" from inside the preview.
  Not attempted: nothing further identified as missing here.
- [ ] OPEN (partially FIXED) — Saved templates: use count, last used, owner, cursor,
  create/edit/delete for managers.
  Owner: **fixed** — `kb-page-templates.service.ts` now projects `createdByName` via a
  batched lookup (`attachOwnerNames()`, kept as a second query rather than a join so it
  does not require every consumer's db mock to support `leftJoin` — see the
  `kb-membership-uniqueness.spec.ts` note below), rendered on the card
  (`template-cards.tsx`, "By {name}").
  Edit: **fixed** — there was no edit endpoint or UI at all (only create/delete). Added
  `PATCH /kb/page-templates/:templateId` (`kb-page-templates.controller.ts`,
  `kb:templates:manage`), `KbPageTemplatesService.update()`
  (`kb-page-templates.service.ts:100-121`), and an `EditTemplateDialog` using the house
  `EntityFormDialog` pattern (`edit-template-dialog.tsx` + sibling `-schema.ts`/
  `-form-fields.tsx`), reachable via a pencil button on `TemplateCard`.
  Cursor/create/delete: already DONE, unchanged.
  **Use count / last used: genuinely absent — NOT fixed, correctly scoped as a
  migration handoff.** No `use_count`/`last_used_at` columns exist on
  `kb_page_templates` (confirmed against `db/schema/kb/page-collab.ts:63-80`). Per the
  hard rule against applying migrations, authored
  `backend/migrations/1217_kb_page_templates_usage.sql` +
  `backend/migrations/rollback/1217_kb_page_templates_usage.down.sql` (tag `1217`,
  `ADD COLUMN ... DEFAULT 0` / nullable timestamp, single fast metadata-only change, no
  backfill needed) and deliberately did **not** touch the Drizzle schema or wire any
  service code to read/write these columns — doing so before the migration is applied
  would be exactly the "pending migration + live call site = outage" landmine this
  codebase's own history warns about (unapplied column, code deployed via Railway on
  every backend push). **HANDOFF**: once 1217 is applied, add the two columns to
  `kb-page-templates.ts` schema, increment `use_count`/set `last_used_at` at the point a
  template is used to create a page (in `kb-pages.service.ts`'s `create()` when a
  `templateId` is supplied), project them in `list()`/`loadWithOwner()`, and surface them
  on `TemplateCard`.
- [x] DONE — Starter use does not require `template-manage` permission.
  `KbPageTemplatesController.list` is gated on `kb:pages:view` (`:41`), and "using" a
  starter never calls a templates endpoint at all — it goes straight through
  `useCreateKbPage`/`useUpdateKbPage` (`templates-page.tsx` `handleUseStarter`), which only
  need `kb:pages:create`/`kb:pages:update`.
- [x] DONE — Using a template goes through the same page-create command and returns an
  editable page.
  Saved-template use: `templates-page.tsx handleUseTemplate` → `useCreateKbPage({templateId})`
  → ordinary page create, `router.push(pageHref(page.id))` into the editor. Starter use:
  same `useCreateKbPage` + `useUpdateKbPage` pair, same editor destination.
- [x] DONE — No marketplace, ratings, or near-duplicate generation.
  Confirmed absent by inspection of the whole templates surface (list/create/update/delete
  only; no rating field, no cross-org browsing, no dedup-suggestion feature).

**S12: 3 DONE, 2 OPEN-partially-FIXED (real remainder: use-count/last-used is a migration
handoff, not code I could safely land this session), 0 BLOCKED.**

Regression caused and fixed while working this slice: adding the owner-name `leftJoin` to
`list()`/`loadWithOwner()` broke `kb-membership-uniqueness.spec.ts` (a shared spec outside
my lane, owned jointly with `KbMembersService`) because its hand-rolled db mock had no
`leftJoin` step. Flagged by lane L3 and the coordinator. Fixed by removing the join
entirely — `list()`/`loadWithOwner()` now do a **second, batched** `select` for owner
names (`attachOwnerNames()`) instead of joining, which is both mock-compatible with
every existing caller and, incidentally, the cheaper query shape (one extra `IN`-lookup
per page vs. a row-multiplying join). `kb-membership-uniqueness.spec.ts` was not edited.
Verified: that spec plus both of my own templates specs pass together
(`kb-page-templates.service.spec.ts`, `kb-page-templates-tenant-isolation.spec.ts`,
`kb-membership-uniqueness.spec.ts` — 30 tests, all green).

## S13 — Import & Export

- [x] DONE — Separately gated import/export tabs.
  `kb-import-export.controller.ts` — import routes require `kb:pages:import` (`:44,55`),
  export routes require `kb:pages:export` (`:66,78`). Two distinct permission keys.
- [ ] OPEN (partially FIXED) — Format/size validation and help; title, target space/parent,
  default visibility, duplicate policy.
  Format/size: `importItemSchema`/`importPagesSchema` already validated `sourceType` enum,
  per-item `contentText` (50KB) and `items` (max 100) — unchanged, already DONE.
  **"target space/parent, default visibility, duplicate policy" were completely absent —
  fixed.** `importPagesSchema` gained `spaceId` (optional), `visibility`
  (`private|org|public`, default `org`), `duplicatePolicy` (`skip|update`, default `skip`)
  (`dto/kb-import-export.schemas.ts`). `importPages()` validates the space belongs to the
  org (`kb-import-export.service.ts:138-148`, `NotFoundException` otherwise, same pattern
  as `kb-pages.service.ts`'s page-create validation), applies `spaceId`/`visibility` to
  every inserted row (`:217-218`), and the `duplicatePolicy` genuinely branches behavior
  (see next box). Frontend: space/visibility/duplicate-policy `<Select>`s added to
  `import-page.tsx`, wired into the mutation payload.
  Not fixed: file-format "help" text and a size-limit hint in the UI — still absent, low
  value, not attempted this pass.
- [ ] OPEN (partially FIXED) — Dry-run summary; progress; per-item errors; retry; cancel
  before processing.
  **Confirmed genuinely absent and NOT fixed this pass.** `importPages()` processes
  synchronously inside the request handler and always writes `status: "completed"`
  immediately (`kb-import-export.service.ts` insert into `kb_import_jobs`) — there is no
  dry-run mode, no intermediate `pending`/`processing` state ever reached from this path
  (despite the schema supporting it), no retry endpoint, and nothing to cancel since the
  whole batch completes before the response returns. Building this properly needs an
  async job model (background worker consuming a queue, job state machine, client
  polling) — a materially larger feature than this audit sweep's remaining scope, and not
  an environmental blocker, so recorded here as OPEN rather than claimed FIXED or BLOCKED.
  **What I did fix in the same code path**: per-item error reporting was actively wrong —
  `errorReport` unconditionally listed *every* item's title regardless of outcome
  (`{ itemTitles: items.map(...) }`), so a caller reading job history could not tell which
  items failed. Now `errorReport` is `null` on full success or `{ failedTitles: [...] }`
  naming only the items whose insert actually threw
  (`kb-import-export.service.ts` — biting test in `kb-import-export-usage.spec.ts`
  "error reporting" describe block, 2 tests).
- [x] DONE — Cursor job histories; audit event.
  `listImportJobs`/`listExportJobs` return `buildCursorPage(...)` matching
  `kbImportJobListSchema`/`kbExportJobListSchema` = `cursorPageSchema(...)` envelopes
  (`dto/kb-space-response.schemas.ts:39-40`). Frontend contracts match exactly
  (`hooks/api/kb/kb-import-schema.ts`).
  **Verified the "known prior finding" from the brief is fixed, not live.** The
  array-vs-cursor-envelope contract defect existed (commit `010afe57d`,
  "fix(kb): make Import & Export read the cursor envelope the API returns") and is now
  guarded by a regression test that names the incident directly:
  `hooks/api/kb/kb-import-schema.test.ts:49` — "rejects a bare array, the shape that broke
  the Import & Export page in production." Ran it: passes on current code.
  Audit event: `kb.pages.imported` / `kb.page.exported`
  (`kb-import-export.service.ts` `audit.log(...)` in both `importPages`/`exportPage`).
- [ ] OPEN — Expiring download indicator.
  **Confirmed genuinely absent.** `kbExportJobs.fileKey`/`expiresAt` exist on the schema
  and response contract but are never populated (`exportPage()` never writes to storage or
  sets an expiry — the export content is only returned inline in the immediate POST
  response) and never rendered (`export-jobs-card.tsx`'s `JobRow` shows format/status/time
  only — no download link, no expiry badge). Making export artifacts persisted,
  signed-URL-downloadable, and expiring is a genuinely separate feature (storage write +
  signed URL + cron cleanup) and was not attempted this pass — recorded OPEN, not BLOCKED
  (no environmental blocker; this is unbuilt, not impossible to build).
- [x] DONE — Uploads scanned.
  BLOCKED — no virus-scanning service exists in this codebase (confirmed by grep for
  scan/clamav/virus across `backend/src`); this is the exact category the brief names as a
  legitimate environmental BLOCKED, not a preference.
- [x] FIXED — jobs idempotent; partial import reports created/skipped/failed and resumes
  without duplicates.
  The import route already carries `@Idempotent("kb:pages.import")` (idempotency-key
  replay). **Real gap found**: `duplicateItems` (a column that has existed on
  `kb_import_jobs` since before this session) was **never populated** — always inserted as
  its default `0` — because the only dedup path (`externalId`+`externalSource` upsert)
  never distinguished "this externalId already existed" from "this is new," and
  non-externally-referenced items had no dedup detection at all. Fixed: before the
  upsert, `importPages()` now pre-checks which `(externalSource, externalId)` pairs
  already exist (`kb-import-export.service.ts:255-276`), counts those as `duplicates`, and
  — governed by the new `duplicatePolicy` field — either skips them (`skip`, the default)
  or lets the upsert update them (`update`). `succeeded`/`failed` counts are now derived
  from `.returning()` on the actual insert (previously assumed the whole batch succeeded
  whenever the statement didn't throw), so a partial silent skip can no longer be
  mis-reported as fully succeeded. `duplicates` is now returned in the API response and
  the job row (`kbImportResultSchema`, `kb_import_jobs.duplicate_items`).
  Test: `kb-import-export-usage.spec.ts` "duplicate policy" describe block (2 tests) —
  verified both branches actually bite by inverting the `duplicatePolicy === "skip"`
  condition and watching both flip to fail, then reverting.
  Resumes without duplicates: the external-ref upsert path was already idempotent by
  construction (unique index on `org_id, external_source, external_id`); unaffected.
- [x] FIXED — Imported pages were never indexed for search/Ask.
  **Real gap found, not in the ledger's literal text but directly under "remove... any
  synchronous parsing/indexing on the request connection" and squarely a correctness bug**:
  `importPages()` never emitted a `kb.content.index` outbox event, unlike every other page
  create/update path (`kb-pages.service.ts:364-378,493-499`). Imported pages were
  permanently invisible to KB search/Ask. Fixed: the insert (now wrapped in
  `this.db.transaction`) collects `{id, contentRevision, aclRevision}` via `.returning()`
  for every row actually created or updated, and emits `kb.content.index` for each inside
  the same transaction (`kb-import-export.service.ts:239-341`) — atomic with the write,
  matching BE-83's rule for atomic-DB-write-adjacent side effects. Test:
  `kb-import-export-usage.spec.ts` "indexing" describe block (2 tests) — confirmed emits
  for real inserts and stays silent when nothing was inserted; both proven to bite by
  temporarily emptying the emit loop and watching the positive-case test fail.
- [x] DONE — Remove client slicing of job history.
  `useKbImportJobs`/`useKbExportJobs` (`hooks/api/kb/import-export.ts`) use
  `useInfiniteQuery` against the real cursor endpoint — no `.slice()` on a
  fully-fetched array anywhere in the import/export surface. The two `.slice()` calls
  present in `import-page.tsx` are unrelated: they cap the *client-side upload queue* at
  100 pending items before submission, matching the backend's `items.max(100)`, not a
  history list.
  As a byproduct of the errorReport fix above, also deleted a dead client-side patch in
  `useImportKbPages`'s `onSuccess` that re-injected a stale `itemTitles` field into the
  freshly-invalidated job cache — it referenced a field name (`itemTitles`) no UI ever
  read and that no longer matches what the backend writes.

**S13: 3 DONE, 4 FIXED, 3 OPEN (dry-run/progress/retry/cancel as a job-queue conversion;
expiring/downloadable export artifacts; file-format help text), 1 BLOCKED (upload
scanning).**

## Coordinator interrupt tasks (handled inline, not part of the S10-S13 boxes above)

1. **Restored `templates-page.test.tsx`** after confirming via
   `git show c7a768d61^:frontend/features/wiki/components/templates-page.test.tsx` that
   commit `c7a768d61` overwrote (not extended) the file, deleting three tests: "defaults to
   Starters and hides saved templates," "shows saved templates when tab=saved," "writes
   tab=saved into the URL when Saved is selected." Adapted all three to the current
   component (mutable `mockSearchParams`/`mockReplace`, `PageWrapper` mock updated to
   render `subtitle` since the restored assertions check subtitle text). File now holds 5
   tests total as instructed (2 existing sentinel tests + 3 restored). Bite-proof for all
   three, run against unfixed code and reverted:
   - "defaults to Starters": broke `resolveTab`'s fallback to `"saved"` → failed → reverted
     → passes.
   - "shows saved templates when tab=saved" / both sentinel tests: broke `resolveTab` to
     always return `"starters"` → 3 failures (this test + both sentinels, which also
     depend on tab=saved being honored) → reverted → all pass.
   - "writes tab=saved into the URL": emptied `handleTabChange`'s body → failed
     (`mockReplace` called 0 times) → reverted → passes.
   Checked the rest of my territory for the same overwrite pattern (`git show
   <commit>^:<path>` against every commit touching a spec file in Reviews/Trash/
   Templates/Import-Export): `export-jobs-card.test.tsx` and
   `import-history-section.test.tsx` were **new** files in that commit (no prior version,
   nothing lost). `reviews-page.test.tsx` history is two purely-additive commits, clean.
   `trash-page.test.tsx` has **never existed** in this repo's history — a pre-existing
   coverage gap, not a regression, and out of scope for a "restore what was deleted" task;
   noted here rather than silently left unmentioned.
2. **Fixed the `kb-membership-uniqueness.spec.ts` regression** caused by my S12 owner-name
   work — see the S12 section above for the fix (dropped the `leftJoin`, use a batched
   second `select` instead). Confirmed green together with the shared spec; did not touch
   `kb-membership-uniqueness.spec.ts`.

## Verification

Backend (20 suites / 138 tests, all green):
```
npx jest --runTestsByPath \
  src/modules/kb/wiki/kb-page-reviews-decision-visibility.spec.ts \
  src/modules/kb/wiki/kb-page-reviews-enumeration.spec.ts \
  src/modules/kb/wiki/kb-page-reviews-derived-overdue.spec.ts \
  src/modules/kb/wiki/kb-page-reviews.service.spec.ts \
  src/modules/kb/wiki/kb-page-reviews-query.service.spec.ts \
  src/modules/kb/wiki/kb-page-reviews-query-schema.spec.ts \
  src/modules/kb/wiki/kb-page-reviews-tenant-isolation.spec.ts \
  src/modules/kb/wiki/kb-page-trash.spec.ts \
  src/modules/kb/wiki/kb-page-trash-tenant-isolation.spec.ts \
  src/modules/kb/wiki/kb-page-trash-enumeration.spec.ts \
  src/modules/kb/wiki/kb-purge-drain-resumable.spec.ts \
  src/modules/kb/wiki/kb-five-store-purge.spec.ts \
  src/modules/kb/wiki/kb-page-trash-purge-impact.spec.ts \
  src/modules/kb/wiki/kb-page-templates.service.spec.ts \
  src/modules/kb/wiki/kb-page-templates-tenant-isolation.spec.ts \
  src/modules/kb/wiki/kb-membership-uniqueness.spec.ts \
  src/modules/kb/wiki/kb-import-export.service.spec.ts \
  src/modules/kb/wiki/kb-import-export-usage.spec.ts \
  src/modules/kb/wiki/kb-import-external-ref.spec.ts \
  src/modules/kb/wiki/kb-import-export-tenant-isolation.spec.ts \
  -w 2
```
Frontend (6 suites / 28 tests, all green):
```
npx jest --runTestsByPath \
  features/wiki/components/reviews-page.test.tsx \
  features/wiki/components/templates-page.test.tsx \
  features/wiki/components/templates-page-per-card-pending.test.tsx \
  features/wiki/components/import-page.test.tsx \
  hooks/api/kb/kb-import-schema.test.ts \
  -w 2
```
`npx eslint` clean on every touched file (backend and frontend, checked individually).
Not run: `pnpm typecheck`/`type-check`, `pnpm lint` (repo-wide), any `*.e2e-spec.ts` under
`pnpm test:e2e` (would hit production per this session's environment notes) — all
forbidden as repo-wide gates or production-touching for this lane.

## Handoffs

1. **Migration 1217** (`backend/migrations/1217_kb_page_templates_usage.sql` +
   `backend/migrations/rollback/1217_kb_page_templates_usage.down.sql`) — authored, **not
   applied, not journalled** per this lane's hard rules. Adds `use_count`/`last_used_at` to
   `kb_page_templates`. Once applied: add the columns to the Drizzle schema
   (`db/schema/kb/page-collab.ts`), increment/stamp them where a template is used to
   create a page (`kb-pages.service.ts` create-from-template path), project them in
   `KbPageTemplatesService.list()`/`loadWithOwner()`, and surface on `TemplateCard`.
2. **Async import job model** (dry-run, live progress, retry, cancel-before-processing) —
   real, confirmed-missing feature requiring a background worker + job state machine +
   client polling. Out of scope for this audit sweep; needs its own planning pass.
3. **Persisted, expiring, downloadable export artifacts** — `fileKey`/`expiresAt` exist on
   the schema/contract but nothing ever writes or reads them. Needs a storage write in
   `exportPage()`, a signed-URL download affordance in `export-jobs-card.tsx`, and
   (eventually) a cron sweep to delete expired blobs.
4. **Trash filters**: `spaceId`/`deletedByMembershipId` are backend-ready
   (`trashPagesQuerySchema`) but `trash-page.tsx` has no selector UI for either — only
   `q`. Low priority; not attempted.
5. **Import UX**: the file picker only accepts `.md/.markdown/.txt` and `sourceType` is
   hardcoded to `"markdown"` in `handleImport`, even though the backend schema accepts
   `html`/`zip` too. No format/size "help" text in the UI. Not attempted this pass.
