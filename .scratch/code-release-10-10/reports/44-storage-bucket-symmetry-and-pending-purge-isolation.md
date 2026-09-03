# 44 — Storage bucket-override symmetry, and the missing pending-purge isolation negative

Repo: `streamlineos-backend`. Territory: `src/modules/storage/**` only.
Commits: `3621a9f6` (item 1), `d9457059` (item 2) — both in `streamlineos-backend`.

---

## Item 1 — every KB object delete addressed the wrong bucket

### The asymmetry

`StorageService.uploadFile` / `uploadFileStream` / `uploadToKey` each took a
`bucketOverride`. **No read or delete path did.** KB media and KB sources are uploaded
into `R2_KB_BUCKET_NAME` through that override
(`kb-media.service.ts:128`, `kb-sources.service.ts:126`) and deleted without it
(`kb-sources.service.ts:182`), so wherever that variable is set and differs from
`R2_BUCKET_NAME`, **every KB object delete targeted the default bucket.**

It cannot surface as an error: an S3-compatible delete of a key that does not exist
returns success. The caller is told the object is gone, the object survives in the KB
bucket, and the row that named it is already deleted — an orphan with no remaining
pointer.

### Severity, honestly

**Latent in this checkout, live in any deployment that separates the KB bucket.**
`R2_KB_BUCKET_NAME` is absent from `.env` here (declared but empty in `.env.example`),
so today the override resolves to `undefined` and `requireBucket` falls through to the
default bucket on both sides — they agree by accident. The variable is a first-class
part of the config surface (`config/env.validation.ts:161`,
`common/region/region.config.ts:237` `kbBucket`, `scripts/setup-r2-buckets.ts` creates
the bucket), so the moment it is set the divergence begins and is silent.

### Fix (in territory)

`src/modules/storage/storage.service.ts` — `bucketOverride?: string` added to
`deleteFile`, `deleteFileIfPresent`, `getFileUrl`, `fileExists`, `describeObject`,
`readObjectPrefix`, `getFileStream`. Purely additive optional trailing parameter; no
existing caller changes behaviour. `fileExists` also now routes through
`placement.requireBucket` instead of duplicating the null check inline (same exception,
same message).

### Proof

`src/modules/storage/storage-bucket-override-symmetry.spec.ts` (11 tests). It never
reasons about S3 semantics: every command is captured off `S3Client.prototype.send` and
the **delete's `Bucket` is compared to the `Bucket` the upload actually used**.

- After: `jest --runInBand --testPathPattern="storage-bucket-override-symmetry"`
  → **11 passed / 11**, exit 0.
- Before, **hermetically**: `git archive HEAD src test evals package.json tsconfig*.json`
  into a temp dir, `node_modules` symlinked, then `git show HEAD~1:.../storage.service.ts`
  written over the sandbox copy **only**. → **9 failed / 2 passed of 11**. The two that
  pass are the two no-override controls, which is correct. Representative failure:
  `Expected: "kb-files" / Received: "default-files"` on the DeleteObjectCommand bucket.
  Working tree verified untouched throughout (`git status --short -- src/modules/storage`
  empty); sandbox deleted afterwards.

---

## Item 2 — `pnpm check:tenant-isolation` was 929/930, exit 1

`src/modules/storage/storage-pending-purge.service.ts` landed with no cross-tenant
negative spec.

New: `src/modules/storage/storage-pending-purge-tenant-isolation.spec.ts` (8 tests).

**It is behavioural, not a spelling check.** The fake store returns *every* tenant's rows
when no tenant id reaches the predicate — which is what a database does — so dropping
`eq(storagePendingPurge.orgId, orgId)` leaks org B's storage key into org A's result.
Statements are rendered through the real `PgDialect` and their bound parameters inspected,
the house pattern already used by `cron-gdpr-export-retention-tenant-isolation.spec.ts`.

Why this table is a target: a row is the **only surviving pointer** to an object that must
be deleted, and the sweep that reads a row **deletes the object it names**. A leaked
predicate here does not merely disclose another tenant's keys, it destroys their bytes.

Covered: the bound org on the scan; only the caller's keys with both tenants present; the
same store read as org B (other direction); a foreign tenant's backlog answered with an
**empty list, not an error** — the 404-never-403 shape, nothing distinguishes "you have
none" from "that key is someone else's"; status/attempt predicates not standing in for the
tenant one; and the two destructive marks only ever receiving ids the tenant-scoped read
returned.

### The composite-key / NULL rule — does not apply here, and is now pinned

`migrations/0741_storage_pending_purge.sql`: `org_id text NOT NULL`, and **no FK to
`organizations` at all** — deliberate and documented in the migration (a cascade would
erase the purge record exactly when the org is purged, recreating the orphan the table
exists to prevent). RLS is `FOR ALL USING (org_id = app.current_org_id())`. So there is no
nullable tenant column inside a composite constraint here. The unique key
`(org_id, storage_key)` backs three upserts (org purge, e-sign, KB attachment purge) and
a NULL `org_id` would make those rows non-colliding and duplicate silently — the last test
asserts `orgId.notNull === true` so that stays shut.

### Proof

- Gate before: `pnpm check:tenant-isolation` → **exit 1**, `929 / 930`,
  `MISSING src/modules/storage/storage-pending-purge.service.ts`.
- Gate after: → **exit 0**, `930 / 930 (100%)`, zero MISSING.
- `pnpm check:tenant-isolation:self-test` → exit 0, `"pass": true`.
- `pnpm check:tenant-isolation:run` → **exit 0, 451 suites / 451, 1859 tests / 1859**.
- Bite, **hermetically, both directions**. `git archive HEAD src test evals
  package.json tsconfig*.json` into a temp dir + symlinked `node_modules`:
  - control (unmodified HEAD copy) → **8 passed / 8**, exit 0;
  - defect planted **in the sandbox only** (`eq(storagePendingPurge.orgId, orgId)` deleted
    from `listForRetry`) → **7 failed / 1 passed of 8**. The one pass is the NOT NULL
    schema assertion, which does not exercise a query — correct. Both `markConfirmed` and
    `markFailed` bit: `Expected length: 1 / Received length: 2`, i.e. org B's row id
    reached a destructive update.
  - working tree re-verified clean (`git status --short -- src/modules/storage
    src/modules/kb src/modules/cron` empty, org predicate still present at
    `storage-pending-purge.service.ts:37`), sandboxes deleted.

---

## Cross-territory — required changes I did not make

I own `src/modules/storage/**` only. Every one of these needs more than passing an
existing constant, so none were made.

### A. cron — the one that makes the leak permanent  · `src/modules/cron/**`

`cron-storage-sweep.service.ts:95`

```ts
await this.storage.deleteFileIfPresent(orgId, row.storageKey);
```

drains `storage_pending_purge`, whose rows include `purpose = "kb:page:purge"` — KB-bucket
keys. It then calls `markConfirmed(row.id)`, **deleting the write-ahead pointer after a
delete that addressed the default bucket.** This is the step that turns a recoverable
orphan into an unrecoverable one. The sweep has no way to know a row's bucket today: fix
by carrying the bucket on the row (add a nullable `bucket` column, written by the producer)
or by selecting the bucket from `purpose`. A `purpose`-keyed lookup is the smaller change:

```ts
const bucket = row.purpose.startsWith("kb:") ? this.config.R2_KB_BUCKET_NAME : undefined;
await this.storage.deleteFileIfPresent(orgId, row.storageKey, bucket);
```

`CronStorageSweepService` does not currently inject `APP_CONFIG`; it would need to.
`cron-storage-sweep.service.ts:156` (`deleteFile` for quarantine records) is fine —
quarantine objects are written without an override.

### B. kb — one-line call site, but it breaks an existing kb spec

`src/modules/kb/wiki/kb-sources.service.ts:182`

```ts
-        await this.storage.deleteFile(orgId, row.fileKey);
+        await this.storage.deleteFile(orgId, row.fileKey, this.config.R2_KB_BUCKET_NAME);
```

`this.config` is already injected and already used for the upload at line 126. But
`src/modules/kb/wiki/kb-sources.service.spec.ts:48` asserts
`toHaveBeenCalledWith("org-1", "kb-sources/org-1/doc.pdf")` and would fail on the added
argument, and `makeConfig()` there returns `R2_KB_BUCKET_NAME: ""`. The spec should be
changed to a non-empty bucket and assert the third argument — that is the whole point of
the fix, so it should be asserted, not appeased.

### C. kb — the attachment purge, through a narrowed interface

`src/modules/kb/wiki/kb-page-attachment-purge.ts:81` calls
`storage.deleteFileIfPresent(orgId, storageKey)` through
`PageAttachmentObjectStore`, a two-parameter structural interface. Needs the interface
widened to `deleteFileIfPresent(orgId, key, bucketOverride?)` and the bucket threaded from
`attemptPageAttachmentPurge`'s three call sites in
`src/modules/kb/wiki/kb-page-tree.service.ts` (234/247, 269/276, 308/317), which would
need `APP_CONFIG`.

### D. kb — two readers with the same asymmetry

Both read objects written into the KB bucket and would 404 against the default bucket:

- `src/modules/kb/retrieval/kb-attachment-indexing.service.ts:131` — `getFileStream(orgId, attachment.fileKey)`
- `src/modules/kb/retrieval/kb-content-adapter.ts:62` — `getFileStream(orgId, source.fileKey)`

Neither class injects `AppConfig` today. The storage-side parameter now exists; the
injection does not.

### E. storage-side residual I chose not to force

`StoragePendingPurgeService.markConfirmed(id)` / `markFailed(id, reason)` carry **no
`orgId`** — they update by primary key alone. Today two things hold them: the id can only
have come from the tenant-scoped `listForRetry`, and RLS bites because
`common/tenant/tenant-db.ts` proxies `this.db` onto the ambient tenant transaction opened
by `forEachOrg`. Called outside a tenant context, or by a role with `BYPASSRLS`, either
would update **any** tenant's row. Adding `orgId` as a required parameter is the correct
hardening, but it changes the signature the cron sweep calls, so it belongs to whoever
owns both files. The new spec is neutral to that change — it asserts which ids reach the
update, not the shape of the predicate — so hardening will not break it.

---

## Not run

Full backend e2e / seeded e2e, frontend anything, lint, and any live R2 or database
access. All storage proof here is unit-level; no bucket was contacted. Ticket 41's own
boxes are the orchestrator's — I ticked none of them.

## Note for the orchestrator

An earlier copy of this report and the S7 note appended to
`issues/14-cross-tenant-negative-tests.md` were written at ~07:49 and were **gone by
07:52** — every file under `reports/` carries an mtime of `Sep 3 07:51`, so the directory
was bulk-rewritten by another lane and both edits were lost. Rewritten and committed
immediately. Worth knowing that `.scratch/code-release-10-10/` is being restored wholesale
by someone.
