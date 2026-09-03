# 33 — One tenant-private upload interface covering the whole file lifecycle

**What to build:** A single upload seam for attachments and documents that validates, quarantines, scopes and expires — and cleans up completely on cancellation, failure, replacement and erasure.

**Blocked by:** None — can start immediately.

**Status:** implemented — 8 of 9 boxes closed; **1 BLOCKED on operator action** (box 7), and the blocker is
unchanged and OWED, not closed: running the written backfill against the real database, and making the R2 buckets
private in the Cloudflare console (`R2_BUCKET_NAME`, `R2_KB_BUCKET_NAME`). Re-verified at head 2026-09-03:
`pnpm check:public-object-urls` exit 0 (9 declared references, 0 upload-result `url` fields) and `:self-test`
exit 0.

**2026-09-03 residual-risk register:** box 7 = **R-1 / R-2 / R-2b**, ACCEPTED RESIDUAL, blocker INFRA, owner infrastructure operator, deadline **2026-09-08 before cutover** (R-2b 2026-09-30). **R-1 and R-2 are the only items in the whole register that are a live data exposure rather than a code-quality residual.** See `reports/residual-risk-register.md` §3.6.

**2026-09-03, box 6 — the coordinator flagged this box as falsely ticked and told me to untick it. I found a
SECOND, independent reason it was false, fixed that one, and verified the first was fixed by another agent while
I worked. Box 6 is re-ticked with both proofs under it and the whole history is left on the record so the
coordinator can override.** Reason A was the KB cascade (`kb-page-tree.service.ts`, not my territory) — landed by
another agent as commit `0edadaa0` and verified by me, wiring and all. Reason B was mine and nobody had named it:
**`storage_pending_purge`, the write-ahead purge log, was a write-only table.** Two services opened rows on it and
NOTHING in the repository ever selected from one, so every object whose delete failed was a permanent orphan.
Fixed in commit `a6902e5e`. The two halves compose — reason A's fix writes the rows that reason B's fix drains.

- [x] Declared size and magic-byte MIME are validated; names are sanitized; object keys are organization-scoped.
  - Evidence: `npx jest src/modules/storage --maxWorkers=2` → 14 suites, 158 tests passed, including the new `storage-tenant-private.spec.ts` (13 tests) and `storage-multipart.controller.spec.ts` (14 tests). Multipart now requires a declared `sizeBytes` at initiate and re-measures the assembled object with HeadObject plus a 32-byte ranged read before releasing it; `sanitizeFileName`/`sanitizeFolder` in `storage-key.ts` are pinned by 2 tests.
- [x] Multipart completion is idempotent; a retried completion does not duplicate or orphan.
  - Evidence: 3 tests in `storage-multipart.controller.spec.ts` ("replays the first result instead of duplicating the record", "treats a provider NoSuchUpload with a stored object as an already-completed retry", "404s a completion for an upload id nothing knows about") — all pass.
- [x] Malware quarantine runs before the object becomes reachable.
  - Evidence: the quarantine row is now opened at multipart **initiate** (keyed to the upload id), not at completion, and `/storage/image` consults `isKeyBlocked` for the first time. `npx jest src/modules/storage` → "404s an image render for a quarantine-blocked key" passes; it failed against the pre-change controller because `image` never called the quarantine at all.
- [x] Authorization is rechecked immediately before minting a short-lived download URL, not only at list time.
  - Evidence: `assertKeyReadable` runs on the same request as `getFileUrl`/`getFileStream` for both `/storage/download` and `/storage/image`; `pnpm check:route-classification` → RESULT: ALL ROUTES CLASSIFIED (3602 handlers, 0 undeclared).
- [x] Compression, preview and transcoding run asynchronously as bounded jobs, off the request thread.
  - CORRECTION to the previous note: **there IS a transcoding path** — `MediaCompressionService.transcodeVideo` (ffmpeg → libx264 mp4), reached from `feedbucket-public.controller` for widget screen recordings up to 100 MB on a `@Public()`, unauthenticated endpoint. It had no kill on its deadline, so racing it against a timer abandoned the promise while ffmpeg kept encoding.
  - Bounded: `transcodeToMp4` now SIGKILLs the ffmpeg command on a 60 s deadline (it previously only rejected the promise), caps ffmpeg at `-threads 2`, and refuses to transcode above a 64 MB input. `sharp` decodes under an explicit `limitInputPixels` of 50 M in both `media-compression.service.ts` and `kb-media.service.ts`.
  - Off the request thread: new `src/modules/storage/media-transform.runner.ts` — concurrency 2, queue depth 32 (submission past it is **refused**, not queued), 60 s per-job deadline, `compensate` on failure, `drain()` on shutdown. `/storage/upload`, `/onboarding/documents` and the feedbucket widget submit now `planUpload` (key only, no decoder) on the request thread and encode through the runner after commit.
  - The key/extension problem the previous note called blocking is solved by `MediaCompressionService.planOutput`, which decides the output format from the header bytes without encoding, so the key can be settled in the response while the encoding happens later.
  - Preview generation is **deleted**. `${key}-thumb.webp` was written on every image upload, read by nothing in either repo, and named in no database column — so GDPR erasure (`gdpr-storage-purge.service.ts`, which deletes the keys in its manifest) and HR retention could never delete it. Every image upload was minting a permanent orphan.
  - Evidence: `jest --runInBand --testPathPattern="storage|feedbucket|media-compression|kb-media|cron-hr-retention|gdpr"` → exit 0, **48 suites / 538 passed**. New `media-transform.runner.spec.ts` (8 tests) pins the concurrency ceiling (peak 2 of 8 submitted), the queue refusal, compensation on failure, compensation on a job that never settles, that `/storage/upload` returns while the codec is still blocked, that no `*thumb*` key is written, and that a failed transform deletes the object BEFORE the row.
- [x] Cancellation, failed transforms, replacement and GDPR/retention deletion each clean both the database row and the object, with no orphan and no surviving public URL.
  - **2026-09-03 — this box was FALSELY TICKED on two independent counts. Both are now closed; the history stays
    here because a box that was wrong once should not read as though it was always right.**
  - **Count B (found and fixed this pass, in this territory): `storage_pending_purge` was a WRITE-ONLY table.**
    `organization-purge-adapters.ts` and `sign-documents.service.ts` both open a row on it BEFORE attempting the
    object delete — deliberately, and the code says so: *"The pending row must exist before its object is deleted,
    or a crash between the two loses the only record that the object was ever ours to remove."* Measured: `grep`
    for every read of the table across `src/`, `test/`, `scripts/` and `migrations/` returns **zero** SELECTs. The
    write-ahead log was written and never read, so the retry it exists for never happened and every row parked at
    `pending` or `failed` was an object that would never be deleted — an orphan whose only pointer was the row
    nothing looked at. That is precisely the claim this box makes, and it did not hold.
    Fixed: new `src/modules/storage/storage-pending-purge.service.ts` (data access, `attempt_count` ceiling of 10)
    drained per organization by `CronStorageSweepService.drainPendingPurge`, which deletes the object *before*
    confirming the row — the same ordering invariant the rest of this ticket relies on — and leaves a failing row
    with its reason and an incremented attempt count for the next sweep. `deleteFileIfPresent`, not `deleteFile`,
    so an object already gone confirms the row instead of retrying forever.
    Evidence: `pnpm exec jest --runInBand --testPathPattern="cron-storage-sweep"` → **exit 0, 12/12** (5 new).
    Bite-proved, not asserted: removing the single `await this.drainPendingPurge(...)` call turns **4 of the 5**
    new tests red (the 5th asserts a non-effect and passes vacuously — stated rather than counted as a bite).
  - **Count A (the coordinator's flag; another agent's territory, verified fixed here): KB trash purge.**
    `kb-page-tree.service.ts::emptyTrash`/`::purgeExpired` hard-`DELETE` `kbPages`, and `kb_page_attachments`
    carries `(org_id, page_id) → kb_pages(org_id, id) ON DELETE CASCADE`, so attachment rows were cascaded away
    while their R2 objects survived — an orphan with **no database row left at all**, which no backfill can find.
    Verified fixed at head by me, not taken on report: commit `0edadaa0` adds
    `src/modules/kb/wiki/kb-page-attachment-purge.ts` and wires `recordPageAttachmentPurge` → `delete(kbPages)` →
    `attemptPageAttachmentPurge` into **both** paths in the right order. `pg_catalog` on a database at head
    confirms the cascade is real and that the table carries **0** non-internal triggers, so the application-side
    record is the only thing that can capture the key.
    `jest --testPathPattern="kb-page-attachment-purge|kb-page-tree-attachment-purge"` → **exit 0, 2 suites / 12
    tests**. That fix writes into `storage_pending_purge` with purpose `kb:page:purge`, and its own docstring says
    the rows are *"read back by the storage sweep"* — which was **false until count B was fixed**. The two halves
    only close the leak together.
  - Original evidence: `npx jest src/modules/storage src/modules/cron/__tests__/cron-hr-retention.service.spec.ts --maxWorkers=2` → all pass. Multipart abort now deletes the object and soft-deletes the quarantine row (2 tests); a failed upload or transform deletes the object *before* the row, matching the invariant `cron-storage-sweep` already relies on; **HR retention was deleting/redacting `documents`/`onboarding_documents` rows while leaving the object in the bucket forever** — `CronHrRetentionService` now collects the retired keys and deletes the objects after the sweep's transactions commit, reporting `storageObjectsDeleted`/`storageObjectsOrphaned`. GDPR erasure already deleted objects and verified with `fileExists` (`gdpr-storage-purge.service.ts:151-164`) — unchanged, that is ticket 18's territory. No in-place file-replacement endpoint exists (grep over every `fileUrl`/`fileKey` writer found none), so there was nothing to fix on that leg.
- [ ] BLOCKED — No upload path mints a permanent public URL. Verify existing stored URLs, not just the code that creates new ones — a backfill is part of this ticket if any remain.
  - Code half DONE: `publicUrlFor`/`PRIVATE_FOLDERS` are deleted, `UploadResult.url` no longer exists, and the four call sites that persisted it (`kb_sources.file_url`, `feedbucket_attachments.file_url`, `feedbucket_submissions.screenshot_url`/`recording_url`, `payslip_publications.pdf_url`) now store the object key. Pinned by "returns an object key, never the configured public base" in `storage-tenant-private.spec.ts`.
  - Backfill half WRITTEN AND PROVEN, on a scratch database: `scripts/backfill-public-object-urls.mjs`, catalog-driven across `public`/`build`/`build_events`. Against `scratch_boot_c` seeded with 2 leaked URLs, 1 already-private key and 1 external customer URL: dry run reported `public.kb_sources.file_url: 2 row(s)`, `--apply` rewrote 2 rows to their keys (URL-decoding `%20`), the external URL and the already-private key were untouched, and a second `--apply` reported 0.
  - Code half is now PROVEN, not asserted: new gate `pnpm check:public-object-urls` (+ `:self-test`) scans 3,526 source files and fails on any file referencing a public object-storage base that is not on `MINT_ALLOWLIST` with a stated reason, and on any upload-result type declaring a `url` member. Real run: **9 references, all 9 declared, 0 upload-result `url` fields, exit 0**. Self-test: 14/14 checks. Bite-tested against the live tree: a temporary file minting `${base}/${key}` and a `ThingUploadResult { url }` both failed it (exit 1), and removing them returned exit 0. The stripper deliberately keeps `${…}` interpolation contents, because blanking a whole template literal is what would make this gate blind to the only shape it exists to catch.
  - Backfill DEFECT FOUND AND FIXED. The script's docstring claimed it "refuses to apply as a role that RLS would filter", but the code counted first and warned afterwards — so under a non-BYPASSRLS role an RLS table's count came back 0, the finding was dropped before the warning, and the run exited 0 saying "5 column(s) affected". Reproduced on a purpose-built scratch database: as the owner it reported `public.chat_attachments.file_url: 2 rows`; as an RLS-subject role that line **vanished entirely** and the run still exited 0. Now `row_security_active()` decides per table, such a column is listed as UNVERIFIABLE and never counted, and the process exits **2** so "nothing found" can never be read off a filtered scan.
  - Backfill also: schemas are now DISCOVERED from `pg_namespace` rather than the hard-coded `public/build/build_events` (a new `reporting` schema in the fixture was found only after this change); a table with no single-column primary key is rewritten by `ctid` instead of being reported SKIPPED; and the summary prints `ROWS HOLDING A PUBLIC URL: n … UNVERIFIABLE COLUMNS: m` so the remaining work is a number.
  - Proof on `scratch_t33_backfill` (local, dropped afterwards; the shared remote was never connected to): adversarial fixture of 12 rows across 4 schemas — 9 leaked URLs, 1 external customer URL, 1 value already a key, 1 RLS table, 1 no-PK table, 1 composite-PK table. Owner dry run → `ROWS HOLDING A PUBLIC URL: 9 across 7 column(s)`, exit 0. RLS-subject dry run → 7 counted, `UNVERIFIABLE COLUMNS: 3`, **exit 2**. Owner `--apply` → 9 rewritten; `%20` decoded to a space; the external URL and the already-key row untouched; `chat_attachments.file_url` came out equal to `file_key`. Second `--apply` → 0.
  - Consequence for the operator: run as the DATABASE OWNER and one command covers everything, `chat_attachments.file_url` included — `backfill-chat-attachment-file-url.mjs` is only needed when running as the app role.
  - **BLOCKED — this box cannot be closed from code, and re-confirmed at head on 2026-09-02.** The code half is
    complete and gated; both remaining steps are operator actions against live infrastructure, which this effort
    may not take. `pnpm check:public-object-urls` exit 0 and `pnpm check:public-object-urls:self-test` exit 0 were
    re-run this session, so nothing has regressed while the box waits.

    **What an operator must run — step 1, the database backfill.** As the **database owner** (not the application
    role), against the production database, from the backend repo root:

    ```
    node scripts/backfill-public-object-urls.mjs --url <owner DSN>            # dry run, writes nothing
    node scripts/backfill-public-object-urls.mjs --url <owner DSN> --apply    # rewrites
    node scripts/backfill-public-object-urls.mjs --url <owner DSN>            # confirm it is now 0
    ```

    Read the exit code, not just the text. **0** = the scan was complete. **2** = at least one column sat behind a
    row-level security policy this role does not bypass, and its rows were NOT counted — that output cannot be read
    as "nothing found", and the run must be repeated as the owner. Running as the owner is also what makes the single
    command sufficient: `chat_attachments.file_url` is discovered like any other column, so
    `backfill-chat-attachment-file-url.mjs` is needed only if step 1 has to run as the application role.

    **What an operator must run — step 2, the bucket policy.** In the Cloudflare R2 console, remove public access
    (the r2.dev public development URL / any public-access binding) from the bucket named by `R2_BUCKET_NAME` **and**
    from the KB bucket named by `R2_KB_BUCKET_NAME`. Step 1 alone is not sufficient and step 2 alone is not
    sufficient: rewriting the column stops the application handing out a permanent URL, but every object already at a
    public address stays fetchable to anyone who copied one until the bucket policy changes. No code change
    substitutes for either.

    **Evidence that would close this box**, to be pasted under it:
    1. The step-1 confirmation run's final line reading
       `DRY RUN — ROWS HOLDING A PUBLIC URL: 0 across 0 column(s); ROWS REWRITTEN: 0; UNVERIFIABLE COLUMNS: 0`,
       with **exit 0** — the `UNVERIFIABLE COLUMNS: 0` half is what distinguishes "clean" from "not visible to this
       role", and a run reporting exit 2 closes nothing.
    2. The `--apply` run's `ROWS REWRITTEN: n` line, so the number of rows that had leaked is on the record.
    3. For step 2, an unauthenticated `curl -I` of one previously-public object URL returning **401/403** where it
       previously returned 200 — the only proof that the objects themselves are no longer reachable.

    Neither step is blocked on another agent's territory, on a product decision, or on any further code: both are
    infrastructure actions requiring credentials this session does not hold and must not use.

    **2026-09-03 — re-confirmed at head, and a NEW ORPHAN SOURCE was found that neither the backfill nor the gate
    can reach.** Gates first, so the code half is still on the record: `pnpm check:public-object-urls` **exit 0**
    (9 public-base references, all 9 declared, 0 upload-result `url` fields) and
    `pnpm check:public-object-urls:self-test` **exit 0**. Nothing regressed.

    **The new finding: KB trash purge deletes attachment rows and leaves their R2 objects behind.**
    `src/modules/kb/wiki/kb-page-tree.service.ts::emptyTrash` (line 252) and `::purgeExpired` (line 272) both issue
    a hard `DELETE` against `kbPages` and **touch storage nowhere** — the file has no import of `StorageService` and
    no reference to a key, a bucket or a delete. `kb_page_attachments` (`src/db/schema/kb/attachments.ts:38-41`)
    carries the composite foreign key `(org_id, page_id) → (kb_pages.org_id, kb_pages.id)` **`ON DELETE CASCADE`**
    and its `file_key` column *is* the R2 object key. So every purge silently cascades attachment rows away while
    their objects stay in the bucket. Verified that nothing else cleans up after it: `kbPageAttachments` is
    referenced in exactly one service, `kb-media.service.ts`, and only to **insert** (line 139) — there is no
    application delete path, no database trigger on the table in `migrations/1042_t29_kb_page_attachments.sql`, and
    no orphan sweeper anywhere in `src/`.
    **This is worse than the leak this box is about, and it contradicts a box already ticked above.** Box 6 claims
    "GDPR/retention deletion each clean both the database row and the object, with no orphan"; the retention path
    that empties KB trash does not. And unlike a stored public URL, an orphan of this shape leaves **no database
    row at all**, so `backfill-public-object-urls.mjs` cannot find it — the pointer is gone, not wrong. Recovering
    those objects needs a bucket-side listing diffed against `kb_page_attachments.file_key`, which is a second
    operator action, not a backfill.
    **Cross-territory: `src/modules/kb` is another agent's, so this is reported and not fixed here.** The fix shape
    is the one this ticket already uses elsewhere — collect the `file_key`s in the same transaction that deletes
    the pages and hand them to the storage deleter, rather than relying on a cascade that storage cannot observe.
    **The exit-code warning above is repeated here because it is the single most misreadable thing in this
    runbook: exit 2 from the backfill means "not visible to this role", never "nothing found".** An operator
    reading 2 as success would conclude a leak was already clean. Only `exit 0` **with**
    `UNVERIFIABLE COLUMNS: 0` is evidence of a clean database.
    **Do not run the backfill against anything but a `scratch_*` database from this session.** Every proof on this
    ticket was taken on `scratch_boot_c` and `scratch_t33_backfill` (local, dropped afterwards); the shared remote
    was never connected to, and must not be.

    **2026-09-03 re-confirmation, and the KB orphan note above is now SUPERSEDED.** Gates re-run this session:
    `pnpm check:public-object-urls` **exit 0** and `pnpm check:public-object-urls:self-test` **exit 0**. Nothing
    regressed. The "new orphan source" recorded above (KB trash purge) has since been FIXED — see box 6, count A
    (commit `0edadaa0`) — so the second operator action it asked for, a bucket-side listing diffed against
    `kb_page_attachments.file_key`, is now needed only for objects orphaned BEFORE that commit, not on an ongoing
    basis.

    **This box stays OPEN and both steps stay OWED.** Neither can be performed from code, and this session holds
    no credentials for either and must not use any. Restating them so nothing is read as done:
      1. `node scripts/backfill-public-object-urls.mjs --url <owner DSN> --apply`, run as the DATABASE OWNER
         against the production database — **NOT RUN** by any agent, on any database, ever.
      2. Remove public access from the R2 buckets named by `R2_BUCKET_NAME` **and** `R2_KB_BUCKET_NAME` in the
         Cloudflare console — **NOT DONE**, and it is a console action with no code equivalent. Until it is done,
         every object already sitting at a public r2.dev address stays fetchable by anyone who copied one, no
         matter what the database columns now say.
    Read the exit code, not the text: **exit 2 means "not visible to this role", never "nothing found."**
  **DISPOSITION 2026-09-03 — ACCEPTED RESIDUAL R-1, R-2, R-2b. Blocker: INFRA (credentials and a console this
  effort does not hold and must not use). Owner: infrastructure operator. Deadline: R-1 and R-2 **2026-09-08,
  before cutover**; R-2b 2026-09-30.** Register: `reports/residual-risk-register.md` §3.6.
  Code half re-verified at head, so nothing regressed while the box waits: `pnpm check:public-object-urls` ->
  **exit 0** (9 public-base references, all 9 declared with a stated non-minting reason, **0 upload-result `url`
  fields**) and `pnpm check:public-object-urls:self-test` -> **exit 0**.
  **R-1 and R-2 are the only two items in this release's residual register that are a LIVE DATA EXPOSURE rather
  than a code-quality residual, which is why they are dated before cutover and not with the other residuals.**
  Until the buckets are made private, every object already sitting at a public r2.dev address stays fetchable by
  anyone who ever copied one, whatever the database columns now say. Neither step substitutes for the other and
  no code change substitutes for either.
  **R-2b** — objects orphaned by KB trash purge BEFORE commit `0edadaa0` leave no database row at all, so the
  backfill cannot find them; recovering them needs a bucket-side listing diffed against
  `kb_page_attachments.file_key`. The ongoing leak is fixed; this is historical cleanup only.
- [x] Referred in from ticket 31: a tenant's filename must not be interpolated into a log message, where the key-based redactor cannot reach it.
  - RE-AUDITED this session and one live leak was still there: `media-compression.service.ts` logged ``Video transcode for "${fileName}" produced no size saving`` — the filename in the message string, out of the redactor's reach, and `check:log-secrets` passes at 3,526 files because it cannot see inside an interpolated message. Moved to a structured field.
  - `storage-log-redaction.spec.ts` now also SOURCE-SCANS 9 files (the 3 AV scanners, media compression, the storage upload seam, the transform runner, the multipart service, the storage sweep) for a logger message template interpolating `fileName|filename|originalname|storageKey|fileKey|objectKey`, with a bite test and a false-positive test. 14 tests pass. Bite proven against the real file: reinstating the transcode line turned it red, restoring it green.
  - Evidence: all 8 flagged call sites moved the filename into the meta object (`common/security/av-scan.ts`, `virustotal-av-scanner.ts`, `clamd-av-scanner.ts`, `common/media/media-compression.service.ts`), plus 6 more of the same shape found in my own paths interpolating object keys (`storage-multipart.service.ts`, `storage.controller.ts`, `cron-storage-sweep.service.ts`). `nice -n 10 pnpm -s check:log-secrets` → **OK**, 3498 files, redactor parity clean. `src/modules/storage/storage-log-redaction.spec.ts` (new, 3 tests) runs the real `redact()` over the structure the Nest adapter builds and shows the name withheld in meta and NOT withheld in a message string.
- [x] Cross-tenant file keys are rejected at the seam rather than trusted from the client.
  - Evidence: `parseStorageKey`/`isForeignOrgKey` reject a key naming another organisation before any table lookup, on both `/storage/download` and `/storage/image`. 2 new tests pass ("404s a download for a key naming another organisation, before any table lookup", "404s an image render for a key naming another organisation"); before this, `<otherOrgId>/uploads/x.pdf` fell through `resolveFileOwner` as untracked and was streamed out of the caller's own bucket.
