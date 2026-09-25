# LEDGER-PATCH-L5 — S10 Reviews · S11 Trash · S12 Templates · S13 Import & Export

Lane L5. 23 open boxes. Do not edit `REQUIREMENT-LEDGER.md` from here; this file is the patch.

Baseline: `bb274d5f9` (root), backend repo separate.

---

## Cross-slice finding A — the purge FK (re-derived and verified)

The prior L5 instance died mid-sentence on "verifying the purge FK myself". Re-derived from scratch.

**What it is: Drizzle/DDL drift on five composite FKs to `kb_pages`, all in the destructive path.**

The TypeScript schema declares these five composite FKs with **no `onDelete` clause at all**, which in
Drizzle and in Postgres means `NO ACTION`:

| TS declaration | migration DDL actually applied |
|---|---|
| `backend/src/db/schema/kb/governance.ts:49` `fk_kb_page_reviews_org_page` | `ON DELETE CASCADE` |
| `backend/src/db/schema/kb/pages.ts:140` `fk_kb_page_favorites_org_page` | `ON DELETE CASCADE` |
| `backend/src/db/schema/kb/pages.ts:161` `fk_kb_page_visits_org_page` | `ON DELETE CASCADE` |
| `backend/src/db/schema/kb/pages.ts:185` `fk_kb_page_links_org_source` | `ON DELETE CASCADE` |
| `backend/src/db/schema/kb/pages.ts:186` `fk_kb_page_links_org_target` | `ON DELETE CASCADE` |

Every other child FK of `kb_pages` **does** carry `.onDelete("cascade")` in TS and matches the DB:
`attachments.ts:40`, `page-feedback.ts:34`, `page-grants.ts:63`, `page-collab.ts:37` (versions),
`page-collab.ts:60` (comments), `restrictions.ts:35`, `tags.ts:42`, `translations.ts:36`,
`governance.ts:113` (export jobs).

**DDL provenance (read, both files):** the constraints are created `ON DELETE CASCADE` in
`backend/migrations/0577_tenant_fks_public_b.sql:2436` and again in
`backend/migrations/0636_kb_source_review_tenant_constraints.sql:4`. No migration anywhere
`DROP CONSTRAINT`s any of the five — confirmed by scanning every `migrations/*.sql`. So the live
database is uniformly `CASCADE`.

**Why this matters, and why the first reading was wrong.** Reading `governance.ts:49` alone tells you a
`kb_page_reviews` row *blocks* a page delete with `23503`, which would make
`KbPageTrashService.hardDelete` blow up after it had already irreversibly destroyed visits, favourites
and links. That is what the pre-delete store design at `kb-page-trash.service.ts:134` looks like it is
defending against. It is not: the DB cascades, so there is **no 23503 and no outage**. The three
pre-delete stores `visits` / `favorites` / `source_links` are redundant with the database's own cascade.

The real severity is the inverse, and it is a genuine correctness gap:

- `kb_page_reviews` rows are **silently cascade-deleted** when a page is purged. Review history is
  destroyed with **no ledger store**, **no audit entry**, and **no dependency-impact warning**.
  `KB_PURGE_STORES` (`backend/src/db/schema/kb/purge-ledger.ts:14`) is exactly
  `["visits","favorites","source_links","page_rows","blobs"]` — reviews is not among them.
- The drift makes the schema actively misleading about what purge destroys, in the one code path where
  being wrong is unrecoverable.

**Verdict: DEFECT (schema drift, non-breaking to fix).** Adding `.onDelete("cascade")` to those five TS
declarations is a pure no-op against the live database — it makes the TS match the DDL that is already
applied. It requires **no migration**. Recorded against S11 box 5 below.

**Not fixed by me / DECISION-REQUIRED:** whether `kb_page_reviews` should be a sixth
`KB_PURGE_STORES` entry with its own ledger row and audit line, rather than an invisible cascade. That
is a product call about whether review history is a first-class purge subject (see S11 box 5).

---

## Cross-slice finding B — orchestrator's `@Idempotent` routing: RESOLVED by prior instance

The four bulk/destructive KB commands now all carry `@Idempotent`, and — critically — the frontend
stable-key half landed **with** them, which is what the orchestrator required:

| route | decorator | frontend stable key |
|---|---|---|
| `POST /kb/page-reviews/bulk-decide` | `kb-page-reviews.controller.ts:79` | `frontend/hooks/api/kb/page-reviews.ts:155` |
| `POST /kb/pages/trash/restore` | `kb-pages.controller.ts:149` | `frontend/hooks/api/kb/pages.ts:303` |
| `DELETE /kb/pages/trash/purge` | `kb-pages.controller.ts:162` | `frontend/hooks/api/kb/pages.ts:349` |
| `DELETE /kb/pages/trash/empty` | `kb-pages.controller.ts:299` | `frontend/hooks/api/kb/pages.ts:568` |

Each hook uses `useIdempotentOperation()` + `operation.configFor({...})` + `operation.settle()`, so the
key is stable across retries of one logical attempt rather than freshly minted per request by
`frontend/lib/api-client.ts`. Pinned by `backend/src/modules/kb/wiki/kb-bulk-command-idempotency.spec.ts`,
which asserts all six command names are distinct and pairs them with a negative control (two read routes
must carry no command name) so the assertions cannot pass vacuously.

**Residual, newly found by me:** `DELETE /kb/pages/:pageId/permanent`
(`kb-pages.controller.ts:307`, `KbPagesController.hardDeletePage` → `KbPageTrashService.hardDelete`) is
a **fifth irreversible destructive route and carries no `@Idempotent`**. It was not in the orchestrator's
list. It is single-record rather than bulk, which is presumably why it was missed, but it destroys a
whole subtree (`hardDelete` collects `collectSubtreeIds` at `kb-page-trash.service.ts:81`) and is not
reversible. Flagged, not fixed: adding `@Idempotent` there is a breaking change for any caller that
sends no header, and per the orchestrator's own rule the decorator must land together with a stable
key in the calling hook. No frontend hook currently calls that route, so the pairing cannot be
completed in this lane without first deciding whether the route is meant to be reachable at all.

---

## S11 — Trash

### `- [ ] Table + mobile cards; search; deleted-by/date/space filters; cursor`

**DEFECT** — two of the four named filters are unreachable or absent.

Present and verified: `DataTable` at `frontend/features/wiki/components/trash-page.tsx:242` with a
`mobileCard` renderer at `:261`; search input at `:217`; `spaceId` read from the URL at `:49`; keyset
cursor wired `mode: "cursor"` at `:253`, `onNext` consuming `data?.pagination.nextCursor` at `:258`.
The backend keyset is real — `backend/src/modules/kb/wiki/kb-page-trash.service.ts:355` orders
`desc(deletedAt), desc(id)` and selects `limit + 1`, closing over `buildCursorPage` at `:359`.

Gaps:
1. **deleted-by filter is built but unreachable.** The backend accepts `deletedByMembershipId`
   (`backend/src/modules/kb/wiki/dto/kb-pages.schemas.ts:126`) and applies it
   (`kb-page-trash.service.ts:340`). `deletedByMembershipId` appears **nowhere** in
   `frontend/features/` — no hook sends it, no control sets it. This is the lane-wide
   "registered is not reachable" trap: complete backend, zero frontend writers.
2. **date filter does not exist on either side.** `trashPagesQuerySchema`
   (`dto/kb-pages.schemas.ts:120-128`) declares only `cursor`, `limit`, `q`, `spaceId`,
   `deletedByMembershipId`. There is no `deletedAfter`/`deletedBefore` bound anywhere, so a deleted-date
   filter cannot be expressed at all.

### `- [ ] Remove the silent 100-row cap and card-only layout`

**SATISFIED** — `trashPagesQuerySchema.limit` is `pageSizeField(50, PAGE_SIZE_CAP)`
(`dto/kb-pages.schemas.ts:123`), a declared page size against the shared cap rather than a silent
truncation, and the read is a true keyset page (`kb-page-trash.service.ts:355-362`), not a capped
`LIMIT 100`. Card-only layout is gone: `DataTable` is the primary surface (`trash-page.tsx:242`) with
cards demoted to the `mobileCard` breakpoint renderer (`:261`).

### `- [ ] Selected restore/purge; dependency impact; empty trash; retention permission split; legal/hold explanation`

**DEFECT** — four of five present; the legal/hold explanation does not exist.

Present: row selection at `trash-page.tsx:79` feeding `selectedIds`; bulk restore and purge via
`frontend/hooks/api/kb/pages.ts:301` and `:347`; dependency impact via `useKbTrashPurgeImpact`
(`trash-page.tsx:83`) against `POST /kb/pages/trash/purge-impact`
(`backend/src/modules/kb/wiki/kb-pages.controller.ts:174`), which returns
`{ pageCount, descendantCount }` computed over the real subtree (`kb-page-trash.service.ts:373-400`);
empty trash at `kb-pages.controller.ts:298`.

Retention permission split is genuine — three distinct keys, verified at their call sites:
`kb:pages:update` for restore (`frontend/hooks/api/kb/pages.ts:304`), `kb:pages:purge` for purge
(`trash-page.tsx:65` and `pages.ts:350`), `kb:settings:manage` for the retention threshold
(`frontend/hooks/api/kb/settings.ts:19,30`, rendered by `trash-retention-section.tsx:68`).

Gap: **legal/hold explanation is absent.** `legal.hold` / `legalHold` / `legal_hold` return **zero**
matches across `backend/src/modules/kb/` and `backend/src/db/schema/kb/`. There is no hold concept, no
hold column, and no copy explaining why a page cannot be purged. `trash-retention-section.tsx:80`
explains only the time threshold, which is retention, not legal hold.

### `- [ ] Restore repairs tree/search/index links idempotently`

**SATISFIED** — `KbPageTreeService.restore`
(`backend/src/modules/kb/wiki/kb-page-tree.service.ts:230`):
- **tree**: re-parents an orphan when the original parent is still deleted (`parentPageId = null` at
  `:249`, applied at `:265-270`), so a restored child never points at a trashed parent.
- **subtree**: clears `deletedAt`/`deletedById` across the whole collected subtree at `:252-263`, not
  just the named page.
- **search/index**: re-emits indexing events through `OutboxWriter.emitMany` at `:281`, filtered to
  pages with real `contentText` at `:284`, so the index is rebuilt after restore rather than left stale.
- **idempotent**: the whole body is one `db.transaction` (`:240`); a second call finds `deletedAt` null
  and throws `ConflictException("Page is not in trash")` at `:238` rather than re-applying, and the bulk
  path surfaces that as a per-row `"conflict"` result rather than an error (`BulkPageResult`,
  `kb-page-trash.service.ts:54`).

### `- [ ] Resumable multi-store purge ledger: rows, versions, comments, grants, blobs, chunks/vectors, caches, public/CDN, analytics ids, notifications, connector projections`

**DEFECT — found, fixed in part, and one half escalated.** The box names **twelve** stores.
`KB_PURGE_STORES` (`backend/src/db/schema/kb/purge-ledger.ts:14`) declares **five**: `visits`,
`favorites`, `source_links`, `page_rows`, `blobs`.

**(a) Two of the five were opened but never closed — FIXED.** Cross-checked L8's report and confirmed
it, though **L8 named the wrong file**: the defect is in `kb-page-trash.service.ts`, not
`kb-page-attachment-purge.ts` (which is only 196 lines and contains no such call). `hardDelete` opens
the ledger at `:85` and correctly closes `page_rows` at `:107` and `blobs` at `:120`. `emptyTrash`
(opens at `:202`) and `purgeExpired` (opens at `:255`) opened all five and closed only the three
pre-delete stores via `executePreDeleteStores` (`:134`) — leaving **two permanently-pending ledger rows
per page** on every batch either path processes. Because `oldestIncompleteLedgerEntry`
(`kb-multi-store-purge.ts:131`) is the SLA metric over `status = 'pending'`, the retention sweep
poisoned its own health signal on every run, and `areAllStoresComplete` (`:65`) could never return true
for any page purged by either path.

- Failing test first: `backend/src/modules/kb/wiki/kb-purge-ledger-completion.spec.ts` (new) —
  **RED at 5 failed / 2 passed**, the two passes being the ledger-open assertion and the deliberate
  negative control, so the five failures were not vacuous.
- Fix: `kb-page-trash.service.ts` — `markStoreComplete(..., "page_rows")` after the row delete and
  `markStoreComplete(..., "blobs")` after `attemptPageAttachmentPurge`, in both `emptyTrash` and
  `purgeExpired`, matching `hardDelete`'s existing `.catch(() => undefined)` shape so ledger
  bookkeeping can never fail the purge itself.
- **GREEN at 7/7.** No regressions: `kb-five-store-purge`, `kb-purge-drain-resumable`,
  `kb-purge-ledger-multistore`, `kb-page-trash`, `kb-bulk-command-idempotency` → **65 passed**.
- Why the existing suite missed it: `kb-purge-ledger-multistore.spec.ts:252` tests resumability only
  through `executePreDeleteStores`, which covers exactly the three stores that were already correct.

**(b) Coverage of the remaining seven stores.**
- `versions`, `comments`, `grants` — handled, but by **database cascade**, not by the ledger:
  `page-collab.ts:37`, `page-collab.ts:60`, `page-grants.ts:63`. Also cascading and unledgered:
  attachments (`attachments.ts:40`), feedback (`page-feedback.ts:34`), restrictions
  (`restrictions.ts:35`), tags (`tags.ts:42`), translations (`translations.ts:36`), export jobs
  (`governance.ts:113`), and **reviews** (`governance.ts:49` — see cross-slice finding A).
- `chunks/vectors` — handled **outside** the ledger by `KbIngestionDeleteConsumer`, observed emitting
  "KB chunks purged for deleted content" during the spec run. Not a ledger store, so an interrupted
  chunk purge is not resumable through this mechanism.
- `caches`, `public/CDN`, `analytics ids`, `notifications`, `connector projections` — **no ledger store
  and no cascade found**. I could not locate any purge step for these in the trash path.

So the ledger is resumable for 5 of 12 named stores, 3 of which are redundant with the database's own
cascade. The requirement as written is not met.

**DECISION-REQUIRED (carried up):** should the cascading children — above all `kb_page_reviews`, whose
history is destroyed silently with no audit line and no dependency-impact warning — become first-class
ledger stores, or is DB cascade accepted as sufficient for them? Adding a store is cheap
(`KB_PURGE_STORES` plus the `chk_kb_purge_ledger_store` CHECK constraint, which needs a migration);
deciding what a purge must be *able to prove* it deleted is the product call. This governs whether this
box can ever be closed as written.

### `- [ ] Purge interruption/resumption test`

**SATISFIED** — `backend/src/modules/kb/wiki/kb-purge-ledger-multistore.spec.ts:252`,
`describe("resumability — interrupted purge resumes from the right store")`, with `:253` "skips a store
already marked completed and runs the pending store" and `:279` "re-running after all stores complete
calls no store purges" — a positive and a negative, so it is not vacuous.
`kb-purge-drain-resumable.spec.ts:84-112` additionally proves the batch loop drains past the batch cap
rather than stopping, and carries its own explicit `BITE:` control at `:112`.

Recorded caveat: this spec was structurally sound yet still could not see defect (a) above, because it
drives only `executePreDeleteStores`. With (a) fixed, the resumption guarantee it asserts now actually
holds for all five stores rather than three.

---

## S10 — Reviews

### `- [ ] Drop persisted `expired` status; derive overdue as `pending && dueAt < now` (migration + index + contract tests)`

**SATISFIED** — all four parts verified.
- **Migration**: `backend/migrations/1170_kb_page_reviews_derive_overdue.sql`, headed
  `-- @data-loss the 'expired' status is collapsed into 'pending'; overdue is derived at read time`,
  collapsing `WHERE "status" = 'expired'` at `:15` and then constraining the column with
  `CHECK ("status" IN ('pending', 'approved', 'rejected')) NOT VALID` at `:20`, so `expired` can no
  longer be written.
- **Derivation**: `backend/src/modules/kb/wiki/kb-page-reviews-query.service.ts:242` —
  `row.status === "pending" && row.dueAt !== null && row.dueAt < now`, exactly the specified rule; the
  `status=overdue` *filter* is likewise derived rather than stored, at `:119-121`
  (`lt(kbPageReviews.dueAt, now)` on top of pending).
- **Index**: `idx_kb_page_reviews_org_status_due` on `(orgId, status, dueAt)`
  (`backend/src/db/schema/kb/governance.ts:44`) — org-led composite matching the derived predicate's
  filter order, per BE-44.
- **Contract**: the response enum is narrowed to `["pending","approved","rejected"]` with `isOverdue`
  carried as a separate derived boolean (`dto/kb-wiki-response.schemas.ts:73-74`), so `expired` is
  unrepresentable on the wire.

### `- [ ] Search; URL filters for status/type/reviewer/due/space; sortable due date; cursor`

**SATISFIED** — every named filter is reachable end to end, which I checked in both directions.

Backend `listPageReviewsQuerySchema` (`backend/src/modules/kb/wiki/dto/kb-page-reviews.schemas.ts:4-17`)
declares `q`, `status`, `type`, `reviewer`, `dueFrom`, `dueTo`, `spaceId`, `sortDir`, `cursor`, `limit`,
all under `.strict()`. Frontend reads each from the URL in
`frontend/features/wiki/components/reviews-page.tsx`: `status` `:148`, `type` `:149`, `sortDir` `:150`,
`q` `:151`, `spaceId` `:152`, `reviewer` `:153`, `dueFrom` `:154`, `dueTo` `:155`.

Sortable due date: `sortState` at `:279-283` bound to the `DataTable` at `:468`, toggled through the URL
at `:213`. Cursor: `cursorState.goNext(pagination?.nextCursor)` at `:272`, against a real keyset in the
service (`kb-page-reviews-query.service.ts:187-199` `keysetBeforeId`/`keysetAfterId`, ordered at `:236`,
with an explicit `NULL_DUE_SENTINEL` so null due dates sort deterministically rather than falling out of
the page).

Search was added by the prior L5 instance and is pinned by
`backend/src/modules/kb/wiki/kb-page-reviews-search.spec.ts:64`, which carries three separate
anti-vacuity controls: `:82` ("omits the full-text predicate when q is absent, so the search test above
is not vacuous"), `:91` (no leading wildcard, so the index can still serve it — BE-49), and `:100`
(punctuation-only `q` is dropped rather than sent as an empty tsquery).

### `- [ ] Page trust context; optional approval note; required rejection reason`

**DEFECT — found and FIXED.** Two of three were already correct; page trust context was missing.

Already correct, verified in the schemas:
- **optional approval note**: `approveReviewSchema` `note: z.string().max(2000).optional()`
  (`dto/kb-page-reviews.schemas.ts:45`), and the bulk `approved` arm likewise optional at `:24`.
- **required rejection reason**: `rejectReviewSchema` `note: z.string().min(1).max(2000)`
  (`:52`) — `.min(1)` so an empty string is rejected, not just an absent key — and the bulk `rejected`
  arm carries the same `.min(1)` at `:28`. The discriminated union on `decision`
  (`:20`) is what makes the note required only on the reject arm.

**The defect**: the reviews list projected **only** `pageTitle` from `kb_pages`
(`kb-page-reviews-query.service.ts:211`) and the response contract exposed only `pageTitle`
(`dto/kb-wiki-response.schemas.ts:87`). `kbPages.trustState` — the `unverified` / `verified` /
`verification_expired` column that says whether the page under review is stale — was never surfaced.
A reviewer approving from the queue could not see that the page they were approving had already failed
verification. `pageTrustState` returned zero matches across `frontend/hooks/api/kb/`.

- Failing test first: `backend/src/modules/kb/wiki/kb-page-reviews-trust-context.spec.ts` (new).
  **Honest note on the RED**: my first run failed 3/5 partly for a confounded reason — the fixture
  passed ISO strings where `wireDate()` is `z.date()` (`backend/src/common/openapi/wire-types.ts:22`),
  so the dates were also invalid. The defect itself is not in doubt and does not rest on that run: it
  rests on the two greps and the two source reads above, where `pageTrustState`/`trustState` is simply
  absent from the projection and from the contract. After correcting the fixture the suite is **GREEN
  at 5/5**, including a negative (`"rejects a trust state outside the page enum"`) and an explicit
  vacuity control (`"still rejects a payload missing pageTitle"`).
- Fix, landed across all four contract layers together so no layer silently strips the field
  (`z.object()` strips unknown keys on decode):
  - `backend/src/modules/kb/wiki/dto/kb-wiki-response.schemas.ts:87` — `pageTrustState` as a nullable
    enum, not a bare string, so it cannot drift from the page column.
  - `backend/src/modules/kb/wiki/kb-page-reviews-query.service.ts:61` (type) and `:212` (projection,
    `pageTrustState: kbPages.trustState`).
  - `frontend/hooks/api/kb/kb-reviews-schema.ts:20` and `frontend/hooks/api/kb/page-reviews.ts:19`.
  - Rendered in **both** surfaces of `frontend/features/wiki/components/reviews-page.tsx` — the mobile
    card at `:136` and the table's title column at `:303` — reusing the existing
    `TrustBadge` from `kb-collection-badges.tsx:31` rather than adding a second badge implementation.
- Verification: frontend `tsc --noEmit` clean for all touched files; `reviews-page.test.tsx` +
  `reviews-page-filters.test.tsx` **18 passed**; backend reviews + idempotency + purge specs
  **24 passed**.

### `- [ ] Bulk decide: max 100, per-row results, partial success, retry-safe, idempotent`

**SATISFIED** — all five properties verified in source.
- **max 100**: `.max(100)` on `ids` in both arms of the discriminated union
  (`dto/kb-page-reviews.schemas.ts:22` and `:27`), with `.min(1)` so an empty batch is rejected too.
- **per-row results**: returns `{ results: BulkDecideResultItem[] }`
  (`kb-page-reviews.service.ts:283`), each item `{ id, outcome }` with outcome constrained to
  `"succeeded" | "denied" | "conflict" | "notFound"` (`dto/kb-wiki-response.schemas.ts:97-100`).
- **partial success**: the loop at `kb-page-reviews.service.ts:313` pushes an outcome per id and
  `continue`s rather than throwing — one unreachable or already-decided row cannot abort the batch.
- **retry-safe**: a row already decided comes back `conflict` rather than being decided twice, because
  the current status is read into `visibleMap` (`:310`) before any write.
- **idempotent**: `@Idempotent("kb.page-review.bulk-decide")`
  (`kb-page-reviews.controller.ts:79`) paired with a stable client key at
  `frontend/hooks/api/kb/page-reviews.ts:155` — see cross-slice finding B.

### `- [ ] Mobile cards; assignment notifications`

**SATISFIED**.
- **Mobile cards**: `mobileCard={ReviewMobileCard}` on the `DataTable`
  (`frontend/features/wiki/components/reviews-page.tsx:469`), the card itself at `:126-140`.
- **Assignment notifications**: `backend/src/modules/kb/wiki/kb-page-reviews.service.ts:145-155` emits
  `knowledge.page.review_requested` via `NotificationDispatchService` to `targetUserIds:
  [review.reviewerId]` when a review is created with a reviewer. Correctly guarded by
  `review.reviewerId && review.reviewerId !== user.userId` at `:145`, so assigning yourself does not
  notify you. Two further dispatches cover the decision events at `:205` and `:265`.

### `- [ ] List and decision both use page visibility; review metadata cannot reveal a hidden page`

**SATISFIED** — the predicate is applied on every path, which is the point of the box.
- **List**: `visiblePagePredicate(user, "view")` at `kb-page-reviews-query.service.ts:108`, applied in
  the join to `kb_pages` so an invisible page's reviews never enter the result set. Because the join is
  the filter, the *metadata* (title, reviewer, due date) is never projected for a hidden page — the row
  does not exist in the query output at all, rather than being fetched and then redacted.
- **Single decision**: `assertPageAccess(user, pageId, "view")` at
  `kb-page-reviews.service.ts:74` and `:103`.
- **Bulk decision**: `visiblePagePredicate` at `:284`, applied inside the `innerJoin` at `:295-302`
  together with `isNull(kbPages.deletedAt)`. Ids that fail the join are absent from `visibleMap` and
  come back as `outcome: "notFound"` (`:315`) — a cross-tenant or hidden-page id is therefore
  indistinguishable from a non-existent one, which satisfies BE-91 (404-equivalent, never a 403 that
  would confirm the row exists).

---

## S12 — Templates

Investigated by a delegated agent; the load-bearing claim (the `1217` usage columns) I re-verified
myself end to end, because the known context said those columns had **zero** consumers.

### `- [ ] URL `tab`, `q`, category/use-case filters; preview; expected output`

**SATISFIED** — `frontend/features/wiki/components/templates-page.tsx`: `tab` at `:77`
(`resolveTab`, values `["starters","saved"]`), `q` at `:79` (debounced into the saved-template query),
`category` at `:78` via `parseEnum(..., CATEGORY_FILTER_VALUES, ALL_CATEGORIES)`. Preview is
`template-preview-dialog.tsx` mounted at `templates-page.tsx:327-334`. Expected output is a real
declared field, `StarterTemplate.expectedOutput` (`starter-templates.ts:27`), rendered at
`template-preview-dialog.tsx:48`.

Note on scope: category and use-case are the same axis here — starter templates carry a `category`
field and there is no separate `use_case` column — so the box's "category/use-case filters" is served by
one control rather than two. Recording as satisfied rather than as a decision, since inventing a second
taxonomy would not serve the requirement.

### `- [ ] Saved templates: use count, last used, owner, cursor, create/edit/delete for managers`

**SATISFIED** — and this is the box where migration `1217_kb_page_templates_usage` finally acquired
consumers. I verified the full chain personally, because "applied in production with zero consumers" is
exactly the shape that reads as done and is not:
- **writer**: `backend/src/modules/kb/wiki/kb-pages.service.ts:172-176` —
  `useCount: sql`${kbPageTemplates.useCount} + 1`` and `lastUsedAt: new Date()`, incremented in the
  page-create path and scoped by both `id` and `orgId`.
- **projection**: `backend/src/modules/kb/wiki/kb-page-templates.service.ts:31-32`.
- **response contract**: `backend/src/modules/kb/wiki/dto/kb-wiki-response.schemas.ts:114-115`.
- **frontend contract**: `frontend/hooks/api/kb/kb-templates-schema.ts:12-13`.
- **render**: `frontend/features/wiki/components/template-cards.tsx:86-90` — "N uses · Last used X".
- Pinned by `backend/src/modules/kb/wiki/kb-page-template-usage.spec.ts:74-95` (left by the prior L5
  instance).

Owner at `template-cards.tsx:80-84`; cursor pagination via `useInfiniteQuery`
(`frontend/hooks/api/kb/page-templates.ts:57-83`) with an `InfiniteScrollSentinel` at
`templates-page.tsx:317-322`; create/edit/delete all gated on `kb:templates:manage`
(`page-templates.ts:87`, `template-cards.tsx:110-115` and `:117-128`).

### `- [ ] Starter use does not require template-manage permission`

**SATISFIED** — `handleUseStarter` (`templates-page.tsx:173-203`) calls `createPage.mutate(...)`, which
is `useCreateKbPage`, gated only on `kb:pages:create` (`frontend/hooks/api/kb/pages.ts:423`). The
starter card's "Use" button is rendered unconditionally, with no `canDelete`/`kb:templates:manage`
guard anywhere in that path.

### `- [ ] Using a template goes through the same page-create command and returns an editable page`

**SATISFIED** — both `handleUseTemplate` (`templates-page.tsx:154-171`) and `handleUseStarter`
(`:173-203`) call the **same** `useCreateKbPage` hook rather than a parallel creation route, and both
navigate to `pageHref(page.id)` — the editable page — on success. Saved templates pass `{ templateId }`
(which is what triggers the `useCount` increment above), starters pass `{ title }` plus a content
update.

### `- [ ] No marketplace, ratings, or near-duplicate generation`

**SATISFIED** (negative requirement) — no marketplace surface, no ratings field, and no similarity or
duplicate-detection logic found in any template file. Template search is a plain name `ILIKE`
(`backend/src/modules/kb/wiki/kb-page-templates.service.ts:53`) with no scoring.

---

## S13 — Import & Export

### `- [ ] Separately gated import/export tabs`

**DEFECT — found and FIXED.** `frontend/features/wiki/components/import-page.tsx:195` early-returned an
"Access denied" `EmptyState` for the **entire** page whenever `!canImport`. A user holding
`kb:pages:export` but not `kb:pages:import` could not reach the Export tab at all — the tabs were
jointly gated on the import key. The data layer was already correct
(`frontend/hooks/api/kb/import-export.ts:130` checks `kb:pages:export` independently), which is what
made the gap invisible: the permission existed and was enforced, but the surface behind it was
unreachable.

- Failing test first: `frontend/features/wiki/components/import-page-gating.test.tsx` (new) —
  **RED at 3 failed / 3 passed**, with a deliberate both-permissions control as the first case so the
  denial assertions cannot pass vacuously.
- Fix (`import-page.tsx`): added `canExport`; the page now denies only when the user holds **neither**
  key; each `TabsTrigger` is rendered only for the permission it needs; and a `tab` URL param the user
  cannot use falls back to one they can, so a stale link does not land on a dead tab.
- **GREEN at 6/6**, and the pre-existing `import-page.test.tsx` still passes unchanged — **10 passed**
  across both suites. Frontend `tsc --noEmit` clean.

### `- [ ] Format/size validation and help; title, target space/parent, default visibility, duplicate policy`

**DEFECT** — present: title (`import-page.tsx:268-280`, paste mode), target space (`:304-321`), default
visibility (`:322-334`), duplicate policy (`:335-346`). Missing:
1. **Target parent is unreachable.** The backend accepts `parentPageId` per item
   (`backend/src/modules/kb/wiki/kb-import-export.service.ts:216`) but no frontend control sets it and
   `parentPageId` is never sent from `import-page.tsx:159-165`. Same "registered is not reachable"
   shape as the S11 deleted-by filter.
2. **No size validation with a user-visible error.** `import-pending-list.tsx:44-45` displays a size
   label but nothing rejects an oversized file. The 100-item cap is applied silently via
   `slice(0, 100)` at `import-page.tsx:87` — items past 100 vanish with no message.

### `- [ ] Dry-run summary; progress; per-item errors; retry; cancel before processing`

**DEFECT** — none of the five are implemented. `handleImport` (`import-page.tsx:157-185`) commits
directly on click: no dry-run or confirmation step, no progress indicator beyond
`importMutation.isPending` disabling the button, no retry, and no cancel once in flight. Per-item errors
are the sharpest gap — the backend *does* build an `errorReport` containing `failedTitles`, but the
frontend only surfaces aggregate counts in a toast and never fetches or renders the per-item list, so
the data exists and is discarded at the last hop.

### `- [ ] Cursor job histories; expiring download indicator; audit event`

**DEFECT** — two of three satisfied.
- **Cursor job histories: SATISFIED.** `useKbImportJobs` / `useKbExportJobs`
  (`frontend/hooks/api/kb/import-export.ts:106-150`) are `useInfiniteQuery` over real cursor-page
  contracts (`:84`, `:88`) with `getNextPageParam: (last) => last.pagination.nextCursor ?? undefined`
  (`:118`, `:141`). I checked this specifically against the known array-vs-envelope hazard — a bare
  `z.array(...)` declared against a `{items, nextCursor}` envelope, which returns HTTP 200 with a
  CONTRACT_VIOLATION that the parity gate cannot see. **The hazard is not present here**: both
  histories declare the envelope, not an array.
- **Audit event: SATISFIED.** `kb-import-export.service.ts:87-94` (export) and `:362-367` (import).
- **Expiring download indicator: DEFECT.** `exportPage` writes the job with `status: "completed"` and
  never sets `expiresAt` (`kb-import-export.service.ts:74-84`); export returns content inline in the
  response (`export-page.ts:24-35`) rather than producing a stored artifact, and `JobRow`
  (`export-jobs-card.tsx:17-29`) renders only format, status and age. There is no expiring download to
  indicate.

**DECISION-REQUIRED on this one:** the expiry indicator is unbuildable as written until someone decides
whether export should produce a **stored, expiring artifact** at all, or remain an inline response. The
box presumes the former; the implementation chose the latter. That is a product/architecture call, not
a bug to patch — and it must be made before this box can be closed either way.

### `- [ ] Uploads scanned; jobs idempotent; partial import reports created/skipped/failed and resumes without duplicates`

**DEFECT** — two of four satisfied.
- **Jobs idempotent: SATISFIED** — `@Idempotent("kb:pages.import")`
  (`backend/src/modules/kb/wiki/kb-import-export.controller.ts:43`).
- **Partial import reporting: SATISFIED** — `{ succeeded, failed, duplicates, total }` returned at
  `kb-import-export.service.ts:369`.
- **Uploads scanned: DEFECT** — files are read client-side via `FileReader` and posted as plain text.
  There is no server-side MIME validation, no content scanning and no size enforcement in
  `importPages`. Nothing in the path corresponds to "scanned".
- **Resumes without duplicates: DEFECT**, and this is the substantive one. Deduplication only applies to
  items carrying an `externalId` + `externalSource` pair (`kb-import-export.service.ts:246-305`).
  Plain markdown/HTML items — which is exactly what the UI sends — have no `externalId`, so the
  `withoutRef` branch relies on `onConflictDoNothing()` against a constraint that does not exist for
  plain pages. A retried import therefore re-inserts every plain item, producing duplicates. Combined
  with the absent cancel/retry controls above, a user's natural response to a slow import (reload and
  retry) is the exact action that duplicates their content.

### `- [ ] Remove client slicing of job history and any synchronous parsing/indexing on the request connection`

**DEFECT** — half done.
- **Client slicing removed: SATISFIED** — both histories paginate server-side by cursor (see the box
  above); no `slice()` is applied to fetched job lists.
- **Synchronous parsing on the request connection: DEFECT** —
  `kb-import-export.service.ts:129-369` parses and inserts every item inline in the HTTP handler and
  only then writes the job row as `status: "completed"`. There is no queue and no async job; a 100-item
  import holds a pooled connection for the whole parse-and-insert run. This is the BE-84 / request-txn
  concurrency hazard: with `DB_POOL_MAX` bounding concurrent requests, a few large imports can starve
  the pool. Indexing itself is correctly deferred (`OutboxWriter.emit` inside the transaction); it is
  the parsing and insertion that are not.

---

## Verdict tally — 23 of 23 boxes carry a verdict

| Slice | SATISFIED | DEFECT | of which fixed here |
|---|---|---|---|
| S10 Reviews | 5 | 1 | 1 (page trust context) |
| S11 Trash | 3 | 3 | 1 in part (ledger completion) |
| S12 Templates | 5 | 0 | — |
| S13 Import & Export | 0 | 6 | 1 (separate tab gating) |
| **Total** | **13** | **10** | **3** |

Two boxes additionally carry an explicit **DECISION-REQUIRED** that blocks closure as written: S11
box 5 (which stores purge must be able to *prove* it deleted) and S13 box 4 (whether export produces a
stored expiring artifact at all).

### Changes landed by this lane

Backend (`D:/projects/personal/Streamlineos/backend`):
- `src/modules/kb/wiki/kb-page-trash.service.ts` — close `page_rows` and `blobs` in the purge ledger in
  `emptyTrash` and `purgeExpired`.
- `src/db/schema/kb/governance.ts`, `src/db/schema/kb/pages.ts` — five FK declarations aligned to the
  applied DDL with `.onDelete("cascade")`. **No migration: this is a pure TS-to-DDL correction against
  constraints that are already `ON DELETE CASCADE` in production.**
- `src/modules/kb/wiki/kb-page-reviews-query.service.ts`,
  `src/modules/kb/wiki/dto/kb-wiki-response.schemas.ts` — `pageTrustState` on the reviews list.
- New specs: `kb-purge-ledger-completion.spec.ts`, `kb-page-reviews-trust-context.spec.ts`.

Frontend:
- `hooks/api/kb/kb-reviews-schema.ts`, `hooks/api/kb/page-reviews.ts`,
  `features/wiki/components/reviews-page.tsx` — `pageTrustState` through the contract and rendered via
  the existing `TrustBadge`.
- `features/wiki/components/import-page.tsx` — separate import/export gating.
- New spec: `features/wiki/components/import-page-gating.test.tsx`.

No migration authored, none applied, `_journal.json` untouched. No git state command run.

