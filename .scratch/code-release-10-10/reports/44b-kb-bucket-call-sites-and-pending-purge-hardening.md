# 44b — the KB bucket reaches the call sites, and the sweep stops confirming guesses

Repo: `streamlineos-backend`. Follows report 44, which added `bucketOverride` to every
`StorageService` read and delete but left every caller passing nothing.

Territory: `src/modules/cron/cron-storage-sweep.service.ts`, `src/modules/kb/**`, and —
by the orchestrator's explicit grant for the item-E residual only —
`src/modules/storage/storage-pending-purge.service.ts` and its isolation spec.

Commits (all `streamlineos-backend`, on the current branch):

| SHA | What |
|---|---|
| `2bb472d7` | the source fix (see the attribution note at the end — this commit is not mine) |
| `85aa516c` | the four `KbPageTreeService` spec constructions (same note) |
| `28a3e2bf` | the deliberate non-change comment in `kb-attachment-indexing.service.ts` |
| `b10e4c04` | the two new bucket-symmetry proof specs |
| `9…` (`test(cron): make the unresolvable-purpose retry test bite`) | one assertion, so that test bites too |

---

## 1. The sweep — fixed first, because it is the one that destroys the evidence

`cron-storage-sweep.service.ts` drained `storage_pending_purge` with
`deleteFileIfPresent(orgId, row.storageKey)` and then `markConfirmed(row.id)`. An
S3-compatible delete of an absent key returns **success**, so a `kb:page:purge` row was
confirmed on the strength of a delete that addressed the DEFAULT bucket while the object
sat untouched in the KB one — and the row that was the last pointer to it was gone.

### What was done, and why not a column

The report offered two shapes: carry a `bucket` column on the row, or derive it from
`purpose`. I took `purpose`, for three reasons:

1. A column needs a migration plus edits in `src/db/schema/**`,
   `storage-pending-purge.service.ts` (to select it) and the two producers I do not own
   (`organization-purge-adapters.ts`, `sign-documents.service.ts`).
2. **A column is not retroactive.** Existing rows would be NULL, so every `kb:page:purge`
   row already in the table would still be deleted from the wrong bucket. Deriving from
   `purpose` fixes the backlog as well as new rows.
3. It is fully inside cron + kb.

The resolution is an explicit total map, not a `startsWith("kb:")` test, and it is
**fail-closed**:

```ts
const PURGE_BUCKET_BY_PURPOSE: ReadonlyMap<string, PurgeBucketKind> = new Map([
  ["org-purge", "default"],
  ["e-sign:document:delete", "default"],
  [KB_PAGE_ATTACHMENT_PURGE_PURPOSE, "kb"],
]);
```

A purpose not in the map issues **no delete**, calls **neither** mark, counts into a new
`pendingPurgeSkipped` field and logs an error every sweep. It is deliberately not
`markFailed`: that spends one of the ten attempts, and a row that exhausts them drops out
of `listForRetry` forever — the unrecoverable orphan the table exists to prevent. The row
stays `pending` and stays visible.

`KB_PAGE_ATTACHMENT_PURGE_PURPOSE` is imported from kb rather than retyped. `cron` already
imports `KbPageTreeService` and `KbModule`, and `pnpm check:cycles` is still clean.

`cron-storage-sweep.service.ts:156` (`deleteFile` for quarantine records) is untouched and
correct — quarantine objects are written by `POST /storage/upload` with no override.

## 2. The four KB call sites — three fixed, one deliberately not

| Site | Object written by | Verdict |
|---|---|---|
| `kb-sources.service.ts:182` `deleteFile` | `kb-sources.service.ts:126`, **KB bucket** | fixed |
| `kb-page-attachment-purge.ts:81` `deleteFileIfPresent` | `kb-media.service.ts:128`, **KB bucket** | fixed |
| `kb-content-adapter.ts:62` `getFileStream` | `kb-sources.service.ts:126`, **KB bucket** | fixed |
| `kb-attachment-indexing.service.ts:131` `getFileStream` | `POST /storage/upload`, **default bucket** | **not changed — see below** |

- `kb-sources.service.spec.ts` had `R2_KB_BUCKET_NAME: ""`, which makes the override
  resolve to `undefined` and fall through to the default bucket, so the assertion would
  have passed against a service that dropped the override entirely. It is now `"kb-files"`
  and the third argument is asserted.
- `PageAttachmentObjectStore.deleteFileIfPresent` was widened, and
  `attemptPageAttachmentPurge` takes `kbBucket: string | undefined` as a **required**
  parameter. Required, not optional: `undefined` is a legitimate value (a single-bucket
  deployment) but it must be passed deliberately, not forgotten. `KbPageTreeService` now
  injects `APP_CONFIG` and threads it at all three sites (`hardDelete`, `emptyTrash`,
  `purgeExpired`). Four spec files construct that service positionally and were updated.
- `KbSourceAdapter` now injects `APP_CONFIG`.

### Why `kb-attachment-indexing.service.ts:131` is NOT a fourth fix

Report 44 item D lists it beside `kb-content-adapter.ts:62` as "the same asymmetry on
READS". **It is not.** That method reads `kb_article_attachments`, and I traced the
producer:

- `support-kb-engagement.service.ts:133 createAttachment` inserts a client-supplied
  `input.fileKey` (`POST /support/kb/articles/:articleId/attachments`,
  `createKbAttachmentSchema`).
- The client obtains that key from `POST /storage/upload`
  (`storage.controller.ts:110`), which calls `uploadFile` with **no bucket override**.
- Every other reader of that column agrees: `storage-kb.controller.ts:77` and
  `support-kb-engagement.service.ts:196` both `getFileUrl` with no override.

So that read is already symmetric with its upload, and threading `R2_KB_BUCKET_NAME` into
it would 404 the read wherever the two buckets differ. `kbSources`/`kbPageAttachments` are
KB-bucket tables; `kbArticleAttachments` is not. The file carries one comment saying so,
and the new spec has a **control test** that fails if someone "completes" the change.

## 3. The `orgId` residual (report 44 item E) — done

`markConfirmed(id)` / `markFailed(id, reason)` updated by primary key alone, held only by
the tenant-scoped read that produced the id and by RLS. Both now take `orgId` first and
bind `eq(storagePendingPurge.orgId, orgId)` alongside the id — a third guard, and the only
one that survives a call made outside a tenant transaction or by a role with `BYPASSRLS`.
The cron sweep passes the org it is already iterating.

**Why I did it despite "do NOT edit `src/modules/storage/**`":** that prohibition is
justified in the brief as "that half is already done and committed", and this residual is
the one thing explicitly *not* done; the orchestrator granted it in the same message
("you now own BOTH sides"). Blast radius is two method signatures, two cron call sites and
two spec call sites, on a file that was clean in the working tree. I strengthened rather
than weakened the cited evidence spec: the two destructive-mark tests keep every existing
assertion and gain `expect(boundOrgs(update)).toEqual([ORG_A])`.

## 4. Proof — never by reasoning about S3

Two new spec files, 9 tests. Neither reasons about S3 semantics, because that is exactly
what hid this: every command is captured off `S3Client.prototype.send`, the **upload is
performed by the real service that owns it** (`KbSourcesService.createFile`,
`KbMediaService.upload`), and the delete's or read's `Bucket` is compared against the
`Bucket` that upload actually addressed.

- `src/modules/kb/kb-object-bucket-symmetry.spec.ts` (5) — source delete, source read,
  page-attachment purge, `KbPageTreeService.hardDelete` end to end, plus the
  article-attachment **control**.
- `src/modules/cron/cron-storage-sweep-bucket-symmetry.spec.ts` (4) — a `kb:page:purge`
  row deleted from the bucket `KbMediaService` uploaded into and then confirmed with the
  org; an `org-purge` row on the default bucket; an unknown purpose issuing no delete and
  confirming nothing; and the same row still retryable after two sweeps.

### Commands, exit codes, numbers

| Command | Exit | Result |
|---|---|---|
| `jest --runInBand --testPathPattern="(cron-storage\|kb-page\|kb-sources\|kb-softdelete\|kb-object-bucket\|storage-pending-purge\|storage-bucket-override\|kb-content\|kb-attachment\|kb-ingestion\|kb-retrieval\|kb-s10)"` | 0 | **43 suites / 43, 282 tests / 282** |
| `pnpm typecheck` | 0 | clean |
| `pnpm check:spec-typecheck` | 0 | spec-inclusive typecheck passed |
| `pnpm check:cycles` | 0 | 5,576 files, **no circular dependency** |
| `pnpm check:route-classification` | 0 | 0 undeclared |
| `pnpm check:tenant-isolation` | 0 | every enumerated service mapped |
| `pnpm check:tenant-isolation:run` | **1** | 450 / 451 suites, 1858 / 1859 tests — **the one failure is not mine**, see below |

`check:tenant-isolation:run` fails on
`src/modules/surveys/survey-logic-tenant-isolation.spec.ts` with
`TypeError: this.db.select is not a function` at `survey-logic.service.ts:48` — a db stub
missing `select`, from commit `6b854108` in the surveys lane. Nothing in my change is in
that file's import graph.

### Hermetic bite, both directions

`git archive HEAD src test evals package.json tsconfig*.json` into a temp dir with
`node_modules` symlinked.

- **Control** (unmodified HEAD copy): **9 passed / 9**, exit 0.
- **Defect planted in the sandbox only** — the six fixed source files replaced with their
  `619f0957` (pre-fix) versions: **8 failed / 1 passed of 9**. Representative failures:
  `Expected: "kb-files" / Received: "default-files"` on four different commands;
  `markConfirmed` `Expected: "org-1", "pp-org" / Received: "pp-org"`; and the unknown
  purpose producing
  `[{"bucket": "default-files", "command": "DeleteObjectCommand", "key": "org-1/vault/secret.bin"}]`
  where zero deletes were expected.
- The single pass under the defect is the article-attachment control, which asserts
  behaviour that is deliberately unchanged — correct.
- Working tree re-verified clean throughout
  (`git status --short -- src/modules/cron src/modules/kb src/modules/storage` empty after
  planting); sandbox deleted.

No R2 bucket was contacted. All storage proof is unit-level.

---

## Cross-territory — a fourth wrong-bucket delete I could not fix

### `organization-purge-adapters.ts` deletes KB objects from the default bucket, and *verifies* it

`src/modules/organization/core/lifecycle/organization-purge-adapters.ts:206`

```ts
await storage.deleteFile(orgId, key);
...
if (typeof storage.fileExists === "function" && await storage.fileExists(orgId, key))
  throw new Error("object remains after delete verification");
```

Both calls omit the bucket. The keys come from `collectOrgFileKeys`, driven by
`enumerateFileKeyColumns` (`storage/storage-key-catalog.ts:20`), whose predicate is
`a.attname LIKE '%\_key'` over every application schema — which **includes
`kb_sources.file_key` and `kb_page_attachments.file_key`**, the two KB-bucket columns.

So for a KB key the org purge deletes from the default bucket (vacuous success), then
confirms the object is absent *from the default bucket*, and reports
`All N object-storage key(s) deleted and verified absent`. The verification step makes it
read more trustworthy than the sweep did, not less.

**This is the case `purpose` provably cannot fix.** Those rows are all written with
`purpose: "org-purge"`, one purpose spanning keys from ~every table, so my map has to
resolve them to the default bucket — correct for the overwhelming majority and wrong for
the KB ones. A key-shape heuristic (`.../kb-media/...`) would be wrong in both directions
and, like everything else here, silently. **The durable fix is the nullable `bucket`
column on `storage_pending_purge`, written by each producer at the moment it knows** —
and `collectOrgFileKeys` would need to return the bucket alongside each key, which means
teaching `storage-key-catalog.ts` which columns are KB columns. That spans
`src/modules/organization/**`, `src/modules/storage/**` and a migration. It needs an owner.

### Smaller notes

- `common/region/region.config.ts:24,237` defines a per-region `kbBucket`, and
  `StoragePlacementResolver` never reads it — the KB bucket is resolved only from the flat
  `AppConfig`. In a region registry deployment a re-homed org's KB objects would go to the
  primary KB bucket. Storage territory.
- `requireBucket` is `override || placement.bucketName`, so an **empty string** override
  silently means "default". That is why this is latent here (`R2_KB_BUCKET_NAME` is empty
  in `.env`) and why `kb-sources.service.spec.ts`'s `""` made its assertion vacuous.

## Attribution note — two of my commits were made by another agent

At ~08:06 a concurrent Cursor agent in the same working tree swept my uncommitted source
edits into `2bb472d7` and `85aa516c`, under its own messages, bundled with unrelated
e-sign and BOLA work, followed by a merge commit `7ba91e37`. Nothing was lost — I verified
every one of the seven files is byte-identical at HEAD to what I wrote
(`git diff HEAD --quiet -- <file>` for each) — but the fix and its rationale are not
attributable from those commit messages. Recording it here because report 44 already noted
this directory being rewritten wholesale by another lane; the working tree is shared and
so is the index.

## Not run

Backend e2e, seeded e2e, lint, anything frontend, and any live R2 or database access. No
ticket in `issues/` covers this work, so I ticked no boxes and edited no ticket file —
ticket 33 is the storage-lifecycle ticket and belongs to another lane.
