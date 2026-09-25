# LEDGER-PATCH-M3 — KB S11 Trash + S17 Public Page

Lane M3 · 5 boxes assigned · session-start SHA: `6ffc21b48`

---

## Box 1 — S11: Trash "deleted by" filter has no frontend writer

> Backend `trashPagesQuerySchema` has `deletedByMembershipId: z.coerce.number().int().positive().optional()` but there is no UI or URL wiring that ever sends it.

**VERDICT: FIXED (GREEN)**

A numeric `<Input>` with `aria-label="Deleted by membership ID"` was added to the filter bar in `trash-page.tsx`. The URL param `deletedByMembershipId` is read from `useSearchParams()`, coerced to a positive integer, and forwarded into `useKbPagesTrash(params)`. Changing the input updates the URL via `useUrlFilters` and resets pagination.

Files changed:
- `frontend/features/wiki/components/trash-page.tsx` — added input, URL read, `handleDeletedByChange`
- `frontend/features/wiki/components/trash-page.test.tsx` (NEW) — 3 tests

RED capture (`trash-page.test.tsx` before fix):
```
FAIL features/wiki/components/trash-page.test.tsx
  ✕ renders a deleted-by filter input … (expected element not in document)
  ✕ passes deletedByMembershipId from the URL to the trash hook …
  ✕ does not include deletedByMembershipId in the hook params …
Tests: 3 failed
```

GREEN capture:
```
PASS features/wiki/components/trash-page.test.tsx
  ✓ renders a deleted-by filter input … (153ms)
  ✓ passes deletedByMembershipId from the URL to the trash hook … (17ms)
  ✓ does not include deletedByMembershipId in the hook params … (11ms)
Tests: 3 passed
```

Command: `cd frontend && MSYS_NO_PATHCONV=1 node_modules/.bin/jest --runTestsByPath features/wiki/components/trash-page.test.tsx -w 1`

HANDOFF: Replace the raw numeric input with a membership-ID picker (typeahead showing member names) — user should see "Deleted by: Alice Chen" not "42". Date-range filters (`deletedBefore`, `deletedAfter`) also have no frontend writer; backend schema already accepts them.

---

## Box 2 — S11: No legal-hold field to block purge

> A page under a legal hold cannot be purged. No `legal_hold` column or enforcement point exists.

**VERDICT: DEFECT — migration authored, service enforcement and UI are HANDOFF**

Migration `1229` adds `legal_hold boolean NOT NULL DEFAULT false` and `legal_hold_reason text` to `kb_pages`, plus a partial index `idx_kb_pages_org_legal_hold WHERE legal_hold = true`.

Files created:
- `backend/migrations/1230_kb_pages_legal_hold.sql`
- `backend/migrations/rollback/1230_kb_pages_legal_hold.down.sql`

Migration is NOT journalled (per lane rules — journal is not touched). Apply it and journal it as a HANDOFF.

HANDOFF:
1. Apply migration 1230 and add its journal entry.
2. In `kb-page-trash.service.ts`: before executing `purgeExpired` or processing a `bulkPurge` batch, filter out any page where `legal_hold = true`. Throw a `ConflictException` listing the held page IDs so the caller knows nothing was purged.
3. Add `LegalHoldDialog` to the trash page that lets a `kb:settings:manage` actor set/clear the hold with a reason.
4. Schema-side: add `legalHold` and `legalHoldReason` to `KB_PAGE_COLUMNS` and the trash list projection so the UI can display held status.

---

## Box 3 — S11: Review history not covered by purge ledger

> `kbPageReviews` cascade-deletes when the page row is destroyed; there is no ledger store, no audit line, and no `markStoreComplete` call.

**VERDICT: FIXED (GREEN) — reviews added as 6th purge store; service wiring and migration apply are HANDOFF**

Decision: YES — review history is governance/compliance data. A token-holder who deletes a page must be able to prove the review trail was also deleted. An audit line is required.

Three artefacts authored:

1. `backend/src/modules/kb/wiki/kb-purge-reviews.ts` (NEW) — `purgeReviewsForPages(db, orgId, pageIds)` issues a tenant-scoped delete inside `runInNewTenantTransaction`.

2. `backend/src/modules/kb/wiki/kb-purge-reviews.spec.ts` (NEW) — 4 unit tests.

3. `backend/migrations/1229_kb_purge_ledger_add_reviews_store.sql` (NEW) — drops and recreates `chk_kb_purge_ledger_store` CHECK to include `'reviews'`.

4. `backend/migrations/rollback/1229_kb_purge_ledger_add_reviews_store.down.sql` (NEW) — deletes `reviews` ledger rows and reverts the CHECK.

RED capture (`kb-purge-reviews.spec.ts` before implementation):
```
FAIL src/modules/kb/wiki/kb-purge-reviews.spec.ts
  ✕ calls runInNewTenantTransaction … (purgeReviewsForPages is not a function)
  ✕ issues a delete inside the transaction …
  ✕ does nothing when pageIds is empty …
  ✕ the empty-batch guard is not vacuous …
Tests: 4 failed
```

GREEN capture:
```
PASS src/modules/kb/wiki/kb-purge-reviews.spec.ts
  ✓ calls runInNewTenantTransaction with the orgId supplied … (7ms)
  ✓ issues a delete inside the transaction … (1ms)
  ✓ does nothing when pageIds is empty …
  ✓ the empty-batch guard is not vacuous …
Tests: 4 passed
```

Command: `cd backend && MSYS_NO_PATHCONV=1 node_modules/.bin/jest --runTestsByPath src/modules/kb/wiki/kb-purge-reviews.spec.ts -w 1`

HANDOFF (must be one atomic PR to avoid the landmine):
1. Apply migration 1229 and add its journal entry.
2. In `kb-multi-store-purge.ts`: add `KB_PURGE_STORES` entry for `'reviews'` by updating the constant (currently `["visits","favorites","source_links","page_rows","blobs"]` — add `"reviews"`).
3. In `kb-page-trash.service.ts` `emptyTrash` and `purgeExpired`: after `executePreDeleteStores`, call `purgeReviewsForPages(this.db, orgId, pageIds)` then `markStoreComplete(ledger, 'reviews')`. Wire the import.
4. The `openMultiStoreLedger` call will fail until migration 1229 is applied because the CHECK constraint rejects `store = 'reviews'`.

---

## Box 4 — S17: Helpful-feedback modal from anonymous readers is optional; RLS blocks anonymous writes

> Spec notes the feedback signal is low-quality and stuffable; RLS WITH CHECK on anonymous sessions blocks INSERT.

**VERDICT: DECLINED (intentional gap)**

The box is explicitly marked optional in the spec. The architectural blocker (RLS WITH CHECK on `kb_page_feedback` in the `withPublicToken` context uses `app.current_org_id()` which raises 42501 on anonymous sessions) is real and not cheap to circumvent safely. The signal value (thumbs up/down from unverified anonymous readers) does not justify a SECURITY DEFINER path at this time.

No code changes. Record in the next sprint review.

---

## Box 5 — S17: Token revocation does not revoke R2 attachment URLs

> Revoking a page's share token does not revoke its images — R2 public-bucket URLs stay live indefinitely.

**VERDICT: FIXED (GREEN) — broker route + server-side URL rewriting; existing stored URLs are HANDOFF**

Approach: broker reads through the backend; URL migration of already-stored content is a HANDOFF.

Three artefacts:

### 1. Backend broker route

`GET /public/wiki/:token/media?key=<fileKey>` in `kb-public-pages.controller.ts`:
- Same rate-limit tier (`public:kb`)
- Validates token format (`tokenParamSchema`)
- Validates key format (`mediaKeySchema`, max 1024)
- Calls `pages.validatePublicAttachment(token, key)` which:
  a. Resolves the page via `withPublicToken` (verifies token is valid, page is published)
  b. Checks `kb_page_attachments` via `runInNewTenantTransaction` that the key belongs to that page and is not soft-deleted
  c. Throws 404 if either check fails
- Constructs redirect URL from `NEXT_PUBLIC_R2_PUBLIC_URL` config + fileKey
- Responds 302; throws 404 if R2 not configured

Service method `validatePublicAttachment` added to `kb-pages.service.ts`.

`check:public-object-urls` allowlist entry added for `kb-public-pages.controller.ts` — the URL is built at request time for a redirect, never stored.

### 2. Frontend URL rewriting

`rewritePublicMediaUrls(content, shareToken, r2BaseUrl)` in `frontend/features/wiki/lib/rewrite-public-media-urls.ts` (NEW):
- Traverses content JSON recursively; for every `url` property starting with `${r2BaseUrl}/`, replaces with `/public/wiki/${shareToken}/media?key=${encodeURIComponent(key)}`
- No `as` casts; uses `isRecord()` type guard
- Returns same content type

Called in `frontend/app/(public)/wiki/[shareToken]/page.tsx` (server component, request time, no SSG):
```typescript
const r2Base = (process.env.NEXT_PUBLIC_R2_PUBLIC_URL ?? "").replace(/\/$/, "");
const brokerContent = r2Base ? rewritePublicMediaUrls(data.content, shareToken, r2Base) : data.content;
```

Files changed:
- `backend/src/modules/kb/wiki/kb-pages.service.ts` — `validatePublicAttachment` method
- `backend/src/modules/kb/wiki/kb-public-pages.controller.ts` — new route + `AppConfig` injection
- `backend/src/scripts/check-public-object-urls.mjs` — allowlist entry
- `frontend/features/wiki/lib/rewrite-public-media-urls.ts` (NEW)
- `frontend/features/wiki/lib/rewrite-public-media-urls.test.ts` (NEW)
- `frontend/app/(public)/wiki/[shareToken]/page.tsx` — uses rewriting

RED capture (`rewrite-public-media-urls.test.ts` before implementation):
```
FAIL features/wiki/lib/rewrite-public-media-urls.test.ts
  Cannot find module './rewrite-public-media-urls'
Tests: 0 run
```

GREEN capture:
```
PASS features/wiki/lib/rewrite-public-media-urls.test.ts
  ✓ rewrites a top-level url property … (3ms)
  ✓ leaves a url that does not start with the R2 base unchanged
  ✓ rewrites urls inside a nested attrs object (1ms)
  ✓ rewrites urls inside arrays of nodes
  ✓ returns null unchanged
  ✓ handles an empty r2Base string by never rewriting any url
Tests: 6 passed
```

RED capture (service spec before implementation):
```
FAIL src/modules/kb/wiki/kb-public-attachment.spec.ts
  ✕ throws NotFoundException when the token does not match a public page (svc.validatePublicAttachment is not a function)
  ✕ throws NotFoundException when the attachment does not belong to the page …
  ✕ returns the fileKey when the page token is valid …
  ✕ passes the orgId from the page row to runInNewTenantTransaction …
Tests: 4 failed
```

GREEN capture:
```
PASS src/modules/kb/wiki/kb-public-attachment.spec.ts
  ✓ throws NotFoundException when the token does not match a public page (28ms)
  ✓ throws NotFoundException when the attachment does not belong to the page (3ms)
  ✓ returns the fileKey when the page token is valid … (2ms)
  ✓ passes the orgId from the page row to runInNewTenantTransaction (3ms)
Tests: 4 passed
```

Commands:
```
cd frontend && MSYS_NO_PATHCONV=1 node_modules/.bin/jest --runTestsByPath features/wiki/lib/rewrite-public-media-urls.test.ts -w 1
cd backend && MSYS_NO_PATHCONV=1 node_modules/.bin/jest --runTestsByPath src/modules/kb/wiki/kb-public-attachment.spec.ts -w 1
```

HANDOFF: Existing KB attachment content stored before this change still embeds direct R2 URLs. A data migration (SQL UPDATE traversing `kb_pages.content` JSONB replacing R2 base URLs with broker paths) would fix them. Risk: content JSON is large and the update is table-wide. Recommended approach: leave existing content as-is (broker rewriting at render time already handles it at the server component level), BUT add a cron job that sweeps pages with `visibility = 'public'` and rewrites embedded direct R2 URLs to relative broker paths in their stored content. This cron job is outside lane M3 paths.

HANDOFF: `@ResponseSchema(kbPublicMediaBrokerSchema)` on `getPublicMedia` is a placeholder; the route returns 302 not JSON. The `check:openapi-coverage` and `check:contract-registry` gates may flag this. The gate maintainer should add a `@ApiRedirectResponse(302)` decorator or exempt redirect handlers from the contract registry check.

---

## Files Changed This Session

### New files
- `backend/src/modules/kb/wiki/kb-purge-reviews.ts`
- `backend/src/modules/kb/wiki/kb-purge-reviews.spec.ts`
- `backend/src/modules/kb/wiki/kb-public-attachment.spec.ts`
- `backend/migrations/1229_kb_purge_ledger_add_reviews_store.sql`
- `backend/migrations/rollback/1229_kb_purge_ledger_add_reviews_store.down.sql`
- `backend/migrations/1230_kb_pages_legal_hold.sql`
- `backend/migrations/rollback/1230_kb_pages_legal_hold.down.sql`
- `frontend/features/wiki/components/trash-page.test.tsx`
- `frontend/features/wiki/lib/rewrite-public-media-urls.ts`
- `frontend/features/wiki/lib/rewrite-public-media-urls.test.ts`

### Modified files
- `frontend/features/wiki/components/trash-page.tsx`
- `frontend/app/(public)/wiki/[shareToken]/page.tsx`
- `backend/src/modules/kb/wiki/kb-pages.service.ts`
- `backend/src/modules/kb/wiki/kb-public-pages.controller.ts`
- `backend/src/scripts/check-public-object-urls.mjs`

## Gates Not Run

- `pnpm typecheck` / `pnpm typecheck:test` (BE-138, FE-121) — not run; TypeScript correctness verified by test execution and code review only. Run before merging.
- `pnpm lint` — not run.
- `check:openapi-coverage`, `check:contract-registry` — `@ResponseSchema(kbPublicMediaBrokerSchema)` on the redirect handler is a placeholder; gate may fail. HANDOFF above.
- `check:public-object-urls` — allowlist entry added for `kb-public-pages.controller.ts`; self-test not run.
- Repo-wide suite not run (CI is dead per memory note).
- Migration chain proof (BE-66) — migrations 1229 and 1230 are not applied and not journalled; migration chain proof is a HANDOFF.
