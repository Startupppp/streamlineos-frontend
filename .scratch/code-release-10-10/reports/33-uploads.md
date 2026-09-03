# S8 / ticket 33 — one tenant-private upload interface

## Boxes closed (6 of 8), with proof

| Box | Proof |
|---|---|
| Size + magic-byte MIME validated, names sanitized, keys org-scoped | `nice -n 10 npx jest src/modules/storage --maxWorkers=2` → **14 suites / 158 tests pass** |
| Multipart completion idempotent | 3 new tests in `storage-multipart.controller.spec.ts` (replay, `NoSuchUpload`-with-object, unknown upload id) |
| Quarantine before reachability | Row now opens at multipart **initiate**; `/storage/image` calls `isKeyBlocked` for the first time — new test "404s an image render for a quarantine-blocked key" |
| Authz rechecked before minting | `assertKeyReadable` on the same request as `getFileUrl`/`getFileStream`; `pnpm -s check:route-classification` → **ALL ROUTES CLASSIFIED, 3602 handlers, 0 undeclared** |
| Cancellation / failed transform / retention clean row **and** object | `npx jest src/modules/storage src/modules/cron/__tests__/cron-hr-retention*.spec.ts` → pass |
| Cross-tenant keys rejected at the seam | 2 new tests; `<otherOrg>/uploads/x.pdf` previously streamed out of the caller's own bucket |

Backend typecheck: `nice -n 10 node --max-old-space-size=8192 ./node_modules/typescript/bin/tsc --noEmit -p tsconfig.json` → **exit 0, 0 errors, whole tree** (run unpiped, exit code read). The transient `UploadResult.url` / `isSensitiveKey` errors another session reported were the middle of this refactor and are gone.
Downstream suites: `nice -n 10 npx jest src/modules/storage src/modules/kb src/modules/feedbucket src/modules/payroll src/modules/chat src/modules/cron src/common/security src/common/media src/common/observability src/degradation src/common/openapi --maxWorkers=2` → **315 suites / 2476 tests pass, 0 failures**. `storage-onboarding.controller.spec.ts` (the one reported failing on a CDN URL) passes — its expectations now assert the key, which is the point of the change.
Log-secrets gate: `nice -n 10 pnpm -s check:log-secrets` → **OK**, 3498 files scanned, redactor parity check clean.

## Boxes NOT closed

- **Async bounded transforms** — preview/thumbnail is now detached + 30 s-deadlined + self-cleaning; there is no transcoding path in the repo; **image compression is still inline** on the request thread (now deadline-bounded, which is new). Deferring it requires choosing the object key before the compressor picks the output format, which moves the stored key's extension and the quota accounting. Deliberately not attempted here.
- **No permanent public URL** — the code half is done and pinned; the backfill script is written and proven end-to-end on `scratch_boot_c`. **BLOCKED** on two operator actions: (1) running the dry run + `--apply` against the real database (the only one with production rows is the shared remote `DATABASE_URL`, which this effort may not touch); (2) making the R2 bucket private in the Cloudflare console — until that happens every already-leaked URL still resolves. This is the same gate the un-run chat backfill is waiting on.

## Ticket 31's referral — filenames in log messages (done)

Eight call sites baked a tenant's filename into the log **message**, where the key-based redactor cannot reach it. All eight moved the filename into the meta object and kept the diagnostic text in the message: `src/common/security/av-scan.ts:61`, `virustotal-av-scanner.ts:43,98`, `clamd-av-scanner.ts:37,75,80`, `src/common/media/media-compression.service.ts:151,183`.

I then swept my own paths for the same shape and found six more, interpolating **object keys** (which embed the org id and the sanitized filename): `storage-multipart.service.ts` ×2, `storage.controller.ts` ×1 (a line I had just written), `cron-storage-sweep.service.ts` ×3. All moved to meta.

Proof, not assertion: `src/modules/storage/storage-log-redaction.spec.ts` (new, 3 tests, pass) runs the real `redact()` over the exact structure the Nest logger adapter builds — `{ context, params: [{ filename }] }` — and shows the name is withheld, that a bare `filename` key is withheld, and that the same name inside a message string is **not**. The third case is the failure mode, pinned so it cannot come back. Note the adapter files an extra object argument under `meta.params`, and `params` is in `SENSITIVE_EXACT`, so the whole carrier is withheld — which is why the diagnostic text stayed in the message rather than moving with it.

No presigned URL is logged anywhere in the seam (`getSignedUrl` results are returned, never logged) — checked by grep over every logger call in `modules/storage` and `common/security`.

## P0/P1 defects found

1. **P0 — cross-tenant read through `/storage/download` and `/storage/image`.** Keys are `<orgId>/<folder>/…`, but neither endpoint checked the org segment. `resolveFileOwner` only consulted 7 tables; a key in none of them and not under a "sensitive" prefix passed straight to `getFileStream(callerOrg, key)`, which reads **any** key in the bucket. Any authenticated user could read another tenant's uploads by key. Fixed.
2. **P0 — the sensitive-key gate had been dead for as long as keys have been org-scoped.** `isSensitiveKey` matched prefixes like `payroll/` against the *whole* key, which now starts with the org id, so it returned false for every real key. Same for `orgFromNamespacedKey` (`kb-media/<org>` never matches `<org>/kb-media/<org>`). Both replaced by `parseStorageKey`, which handles both key shapes.
3. **P0 — `/storage/image` never consulted the quarantine.** An infected or unscanned object was unreachable via `/storage/download` and served happily by `/storage/image`. Fixed.
4. **P0 — HR retention orphaned every object it retired.** `CronHrRetentionService.sweepDocuments` deleted or redacted `documents` / `onboarding_documents` rows without ever deleting the object, and redaction overwrote the only copy of the key, so the blob became unreachable *and* undeletable. Fixed (keys collected, objects deleted after the sweep's transactions commit, orphans counted and logged).
5. **P1 — permanent public URLs persisted in four places**: `kb_sources.file_url`, `feedbucket_attachments.file_url`, `feedbucket_submissions.screenshot_url`/`recording_url`, `payslip_publications.pdf_url` (payslips!). All now store the key.
6. **P1 — multipart had no size or type verification at all.** `initiate` took no declared size; `complete` wrote a quarantine row with `fileSizeBytes: 0` and `application/octet-stream`, so multipart uploads were invisible to the quota and never sniffed. Now: declared size + quota at initiate, HeadObject + 32-byte ranged magic-byte check at complete, mismatch deletes object and row.
7. **P1 — region `keyPrefix` inconsistency.** `compressAndPreGenerateKey` returned an unprefixed key while `uploadToKey` prefixed it on write, so in any region deployment with a `keyPrefix` the object was stored where no read path looks. `objectKey()` is now the single key builder and `uploadToKey` writes the key verbatim.
8. **NOTE (not fixed, by design)** — `getEmailLogoUrl` (`src/modules/email/branding.ts:45`) still builds a public URL from `NEXT_PUBLIC_R2_PUBLIC_URL` for a static email logo asset. Email clients cannot use signed URLs; this is not an upload path and no tenant data flows through it.

## Files changed (all absolute, under `/Users/tarunchintakunta/Personal/streamline/streamlineos-backend`)

Storage seam (my territory):
- `src/modules/storage/storage-key.ts` **(new)** — key parsing, ownership, sensitivity, name/folder sanitization
- `src/modules/storage/storage-tenant-private.spec.ts` **(new)** — 13 tests pinning the invariants
- `src/modules/storage/storage.service.ts` — public-URL minting deleted; `deleteFileIfPresent`, `describeObject`, `readObjectPrefix` added; single `objectKey` builder
- `src/modules/storage/storage.controller.ts` — `assertKeyReadable` gate, quarantine on image, bounded transforms with cleanup
- `src/modules/storage/storage-multipart.controller.ts` — rewritten lifecycle
- `src/modules/storage/storage-multipart.service.ts` — retry-tolerant `complete` returning a `CompletionOutcome`
- `src/modules/storage/file-quarantine.service.ts` — `recordMeasuredObject`
- `src/modules/storage/dto/storage-multipart.schemas.ts` — declared `sizeBytes`
- `src/modules/storage/storage-onboarding.controller.ts`, `storage-multipart.controller.spec.ts`, `storage-onboarding.controller.spec.ts`
- `src/modules/storage/storage-log-redaction.spec.ts` **(new)** — 3 tests proving the redaction claim
- `src/degradation/object-storage.spec.ts`
- `scripts/backfill-public-object-urls.mjs` **(new)**

Call sites that persisted a public URL (outside the storage folder, reported here rather than left broken):
- `src/modules/kb/wiki/kb-media.service.ts` + `kb-media.service.spec.ts`
- `src/modules/kb/wiki/kb-sources.service.ts`
- `src/modules/feedbucket/feedbucket-public.controller.ts`
- `src/modules/feedbucket/feedbucket-ai.service.ts` + `tests/feedbucket-ai.service.spec.ts` — vision now reads the screenshot **from the object store by key**; it was fetching the stored public URL and would have silently stopped analysing screenshots once the column became a key
- `src/modules/payroll/payout/payslip-bulk-publisher.service.ts`
- `src/modules/cron/cron-hr-retention.service.ts` + `__tests__/cron-hr-retention.service.spec.ts` + `__tests__/cron-hr-retention-tenant-isolation.spec.ts`

Log-message fixes referred to me by ticket 31 (message text only, no behaviour change):
- `src/common/security/av-scan.ts`, `src/common/security/virustotal-av-scanner.ts`, `src/common/security/clamd-av-scanner.ts`
- `src/common/media/media-compression.service.ts`
- `src/modules/cron/cron-storage-sweep.service.ts`

## Other agents' territory

- `src/modules/gdpr/gdpr-storage-purge.service.ts` already deletes objects and verifies with `fileExists` — **not touched**, ticket 18 owns it. Its erasure leg of box 6 is satisfied as-is.
- `src/modules/cron/__tests__/cron-mail-retention.spec.ts` was red mid-session (expected 500, received 50000) while another session was editing `cron-mail-retention.service.ts`; it is **green again** in my final run. Nothing for me to do.
- Typecheck errors that appeared mid-session in `modules/organization/core/*` and `modules/support/core/support-ticket-erasure.ts` are also gone. Final tree is exit 0.

## Wire-contract note for the orchestrator

`/storage/upload` and `/kb/media` still return a field named `url`, but it now holds the **object key**, not a URL. The frontend already handles this: `frontend/lib/utils.ts::resolveImageUrl` routes a non-`http` value through `/storage/image?key=`, and `frontend/features/chat/chat-helpers.ts` does the same. No frontend change was needed, but a frontend surface that renders one of these values with a bare `<img src>` instead of `resolveImageUrl` would now show a broken image — worth a grep on the FE side.

## Database used

`scratch_boot_c` only. Bootstrapped cold from empty: `RESULT: REACHED_HEAD 637/637`, 943 public tables. Seeded with 4 `kb_sources` rows to exercise the backfill. The shared remote `DATABASE_URL` was never connected to.


---

# Second pass — 2026-09-02 (session 2)

The first pass left two boxes open. Both are addressed below; one closes, one is
**PARTIAL** and cannot close from code.

## Box 1 — bounded async transforms: CLOSED

### The previous note was wrong on a load-bearing fact

It said "there is no transcoding path in the repo." There is:
`MediaCompressionService.transcodeVideo` shells out to ffmpeg/libx264, and it is
reached from `feedbucket-public.controller.ts` for widget **screen recordings up
to 100 MB** on a `@Public()`, unauthenticated endpoint.

Worse, it was not bounded in the way the first pass believed. `withDeadline`
races a promise against a timer; when the timer wins the promise is abandoned
and **ffmpeg keeps encoding at full tilt with nobody left to notice**. An
abandoned transcode is not a bounded transcode.

### What changed

**Bounds (`src/common/media/media-compression.service.ts`)**
- `transcodeToMp4` holds the command handle and `SIGKILL`s it on a 60 s deadline.
- `-threads 2`, so one transcode cannot take every core.
- Inputs over 64 MB are refused for transcode and stored as-is.
- `sharp(buffer, { limitInputPixels: 50_000_000 })` in both this file and
  `kb-media.service.ts`: the byte cap bounds what arrives, this bounds what the
  decoder may allocate from it.

**Off the request thread (`src/modules/storage/media-transform.runner.ts`, new)**

Three bounds make it a job runner rather than a leak — concurrency 2, queue
depth 32 with submission **refused** past it, and a 60 s per-job deadline with a
`compensate` hook and `drain()` on shutdown. It is in-process on purpose: there
is no queue broker in this repo and inventing a durable one here would stand a
second, unwatched execution substrate beside the outbox. The consequence is
stated in the file rather than hidden — a restart loses queued transforms, which
is why every job's failure path deletes the **object before the row**, leaving
the recoverable direction (a row the storage sweep already reconciles) rather
than a reachable half-written object.

**The key/extension problem the first pass called blocking**

It said deferring compression "needs the object key to be chosen before the
compressor decides the output format". True, and separable:
`MediaCompressionService.planOutput` decides the output format from the header
bytes without encoding anything, so `StorageService.planUpload` settles the key
on the request thread and `StorageService.compressToKey` encodes later. When a
transform declines or fails, the measured type is written onto the quarantine row
by `recordMeasuredObject` — every read serves the type the object store holds,
not the one the key spells, so the key's extension is decorative in that case.
`getMimeType(key)` is only a fallback for an object with no stored Content-Type.

Three call sites now defer: `/storage/upload`, `/onboarding/documents`, and the
feedbucket widget submit (both screenshot and recording).

### P0/P1 found in this pass

**P1 — every image upload minted a permanent orphan.** `deriveThumbnail` wrote
`${key}-thumb.webp` on every image upload. Grepped both repos: **nothing reads
it**, and it is named in no database column — so GDPR erasure
(`gdpr-storage-purge.service.ts`, which deletes the keys in its manifest) and HR
retention could never delete it. Only a whole-org prefix purge would. A
write-only preview that survives erasure of its own parent is a defect, not a
feature; it is deleted, along with the now-unused `generateThumbnail`. Box 6's
"no orphan" claim was not true while it existed.

**P1 — unauthenticated CPU amplification.** See the transcode note above.

**Dead code removed.** `StorageService.uploadCompressed` had no callers left
after the feedbucket change.

## Box 2 — no permanent public URL: PARTIAL

### What I could prove, and did

**No code path mints one — now a gate, not an assertion.**
`pnpm check:public-object-urls` (+ `:self-test`), registered in `package.json`,
follows the repo's existing gate idiom. Two rules: any source file referencing a
public object-storage base (`NEXT_PUBLIC_R2_PUBLIC_URL`, `R2_KB_PUBLIC_URL`,
`publicUrl`, `kbPublicUrl`) must be on `MINT_ALLOWLIST` with a written reason;
and no upload-result type may declare a `url` member.

Real run: **3,526 files, 9 references, all 9 declared, 0 upload-result `url`
fields, exit 0.** The five declared files and why they are not mints are in the
allowlist, including `email/branding.ts` (a static operator-configured brand
asset an email client cannot fetch with a signed URL) and
`storage.service.ts::getFileKeyFromUrl` (strips the base, never appends).

It bites. A temporary file in `src/modules/storage/` minting `` `${base}/${key}` ``
plus a `ThingUploadResult { url }` failed it with both findings named
(exit 1); deleting the file returned exit 0. Its comment-and-string stripper
deliberately **keeps** the interior of `${…}` in a template literal — blanking a
whole template literal is precisely what would make this gate blind to the only
shape it exists to catch, and the first version of the gate had that bug (its
self-test caught it).

**Authorization is re-checked at mint time.** `assertKeyReadable` runs on the
same request as `getFileUrl`/`getFileStream` on both `/storage/download` and
`/storage/image`, in the order foreign-org key → owner resolution → quarantine.
`/storage/download` caps `expiresIn` at 86,400 s; the e-sign and vault paths use
900 s. Verified unchanged from the first pass.

### The backfill had a defect, and it was the exact one this box is about

The script's docstring claimed it "refuses to apply as a role that RLS would
filter, because a policy the role does not bypass turns 'nothing to do' and
'cannot see it' into the same output". **The code did not do that.** It counted
first (`countMatches`) and checked RLS afterwards, so under a non-`BYPASSRLS`
role an RLS table's count came back 0, `matches === 0` dropped the finding before
the warning could print, and the run exited **0**.

Reproduced on a purpose-built scratch database:

| role | `public.chat_attachments.file_url` | exit |
|---|---|---|
| owner (bypasses RLS) | `2 row(s) hold a public URL` | 0 |
| app role (RLS active) | **line absent entirely** | 0 |

An operator running as the app role would have concluded those two leaked rows
did not exist. Fixed: `row_security_active()` decides per table, such a column is
listed as UNVERIFIABLE and **never counted**, and the process exits **2**.

Two more corrections to the same script:
- **Schemas are discovered** from `pg_namespace` instead of the hard-coded
  `public/build/build_events`. A `reporting` schema added to the fixture was
  found only after this change — the hard-coded list would have missed it
  silently, which is the same class of bug as the RLS one.
- **A table with no single-column primary key is rewritten**, by re-reading the
  first page of still-matching rows and updating by `ctid` with the old value
  re-asserted in the `WHERE`. It was previously reported `SKIPPED` and left
  leaked.
- The summary now prints
  `ROWS HOLDING A PUBLIC URL: n across m column(s); ROWS REWRITTEN: r; UNVERIFIABLE COLUMNS: u`.

### Proof, on a local scratch database only

`scratch_t33_backfill`, created and dropped in this session. The shared remote
`DATABASE_URL` was never connected to and no connection string or credential
appears in this report. Fixture: 12 rows across 4 schemas — 9 leaked URLs, 1
external customer URL, 1 value that is already a key, 1 RLS-enabled table, 1
table with no primary key, 1 with a composite primary key.

| run | result | exit |
|---|---|---|
| owner, dry run | `ROWS HOLDING A PUBLIC URL: 9 across 7 column(s); UNVERIFIABLE COLUMNS: 0` | 0 |
| app role, dry run | `7 across 6 column(s); UNVERIFIABLE COLUMNS: 3` + the remedy named | **2** |
| owner, `--apply` | `ROWS REWRITTEN: 9` | 0 |
| owner, `--apply` again | `ROWS HOLDING A PUBLIC URL: 0` | 0 |

Row-level verification after apply: `%20` decoded to a space; the external
customer URL untouched; the already-a-key row untouched; the no-PK and
composite-PK rows rewritten; `chat_attachments.file_url` came out **equal to
`file_key`**, which means an owner-role run of the catalog script subsumes
`backfill-chat-attachment-file-url.mjs` — that second script is only needed when
running as the app role.

### What remains, precisely

1. **Operator, database.** Run `node scripts/backfill-public-object-urls.mjs`
   as the **database owner** against the real database — dry run first (it prints
   the exact remaining number, and exits 2 if anything was unreadable), then
   `--apply`. Not doable here: the only database with production rows is the
   shared remote `DATABASE_URL`.
2. **Operator, object-storage console — THIS IS WHAT KEEPS THE BOX OPEN.** In
   the **Cloudflare R2 console, remove public access from the bucket named by
   `R2_BUCKET_NAME`, and from the KB bucket `R2_KB_BUCKET_NAME`** (disable the
   `r2.dev` public development URL / remove the public bucket policy). Rewriting
   a database column does not invalidate a URL somebody already copied; every
   object already at a public address stays fetchable until that policy changes.
   **No code change substitutes for this**, which is why the box is marked
   PARTIAL rather than closed.

## Ticket 31's referral, re-audited

The first pass reported all eight sites fixed. One was still live:
`media-compression.service.ts` logged ``Video transcode for "${fileName}"
produced no size saving`` — the tenant filename in the **message string**, where
the key-based redactor cannot reach it. `pnpm check:log-secrets` passes at 3,526
files because it reads structured fields and cannot see inside an interpolated
message.

Moved to a structured field, and pinned so it cannot come back:
`storage-log-redaction.spec.ts` now source-scans nine files (the three AV
scanners, media compression, the storage upload and onboarding controllers, the
transform runner, the multipart service, the storage sweep) for a logger message
template interpolating `fileName|filename|originalname|storageKey|fileKey|objectKey`,
with a bite test and a false-positive test (`${String(err)}` is a diagnostic
about the failure, not about the tenant's file, and stays). 14 tests pass.
Bite proven against the real file: reinstating the transcode line turned the scan
red, restoring it green.

## A regression I caused and fixed

`sharp.concurrency(2)` at module load in `media-compression.service.ts` broke
`kb-media.service.spec.ts` at **import** time — that spec stubs
`jest.mock("sharp", () => ({ __esModule: true, default: jest.fn() }))`, the stub
has no `concurrency`, and `kb-media.service.ts` reaches this file through
`StorageService`. (`sharp` 0.35.3 does expose `concurrency` as a function in
plain Node; the failure was the mock, not the version.) The call is removed
rather than guarded: a top-level call into a native binding makes every importer
depend on that binding being real. How many transforms may decode at once is
`MediaTransformRunner`'s ceiling instead, which bounds ffmpeg and sharp together
and is testable without a native binding.

## Gates and suites — every one run and read

| Gate | Command | Result |
|---|---|---|
| Backend types | `heavy.sh 2 -- pnpm -C .../streamlineos-backend typecheck` | **exit 0, 0 errors** at the point the storage work landed. A later run showed **1 error**, `src/common/tenant/tenant-context.interceptor.ts(89,53): Cannot find name 'TENANT_REQUEST_DEADLINE_MS'` — a file I never opened, modified by another session mid-edit. Not mine. |
| Spec types | `heavy.sh 2 -- env NODE_OPTIONS=--max-old-space-size=8192 pnpm -s check:spec-typecheck` | **before: 5 errors** (2 `modules/storage`, 2 feedbucket specs I had broken by adding a constructor arg, 1 gdpr). **after: 3 errors, all `modules/payroll/filings/__tests__`, none mine.** 0 under `modules/storage`, `common/media`, `common/security`, `modules/feedbucket`. (The coordinator's "23 errors, 18 under storage" was a mid-edit snapshot I never observed.) |
| Suites | `heavy.sh 2 -- jest --runInBand --testPathPattern="storage\|feedbucket\|media-compression\|kb-media\|cron-hr-retention\|gdpr"` | **exit 0 — 48 suites / 538 passed, 2 skipped, 0 failures** |
| kb-media (ticket 29's) | `heavy.sh 2 -- jest --runInBand --testPathPattern="kb-media"` | **exit 0 — 27/27**, loads again |
| Multipart contracts | `pnpm -s check:multipart-contracts` | exit 0, 546 controller files, OK |
| Multipart self-test | `pnpm -s check:multipart-contracts:self-test` | exit 0, SELF-TEST PASSED (8 checks) |
| Public object URLs (new) | `pnpm -s check:public-object-urls` | exit 0, 3,526 files, 9 declared references, 0 `url` fields |
| Public object URLs self-test (new) | `pnpm -s check:public-object-urls:self-test` | exit 0, 14/14 |
| Log secrets | `pnpm -s check:log-secrets` | exit 0, OK |
| Route classification | `pnpm -s check:route-classification` | exit 0, ALL ROUTES CLASSIFIED |
| Fire-and-forget | `pnpm -s check:fire-and-forget` | exit 0, 1,831 files, 0 violations |
| Module DI | `pnpm -s check:module-di` | exit 0, 216 modules, 0 violations |
| Module registration | `pnpm -s check:module-registration` | exit 0 |
| Kebab case | `pnpm -s check:kebab-case` | exit 0, 6,237 entries |
| Import cycles | `pnpm -s check:cycles` | exit 0, 5,458 files, no circular dependency |
| File sizes | `pnpm -s check:file-sizes` | `storage.service.ts` 520 → **509** (still over 500, pre-existing). `feedbucket-public.controller.ts` 495 → 560 under my first edit; extracted `feedbucket-media-transforms.ts` and it is back to **499**. `storage.controller.ts` 460 → **437**. |

## Files changed this pass

New:
- `src/modules/storage/media-transform.runner.ts`
- `src/modules/storage/media-transform.runner.spec.ts`
- `src/modules/feedbucket/feedbucket-media-transforms.ts`
- `src/scripts/check-public-object-urls.mjs`

Storage seam:
- `src/modules/storage/storage.service.ts` (`planUpload` + `compressToKey` replace `compressAndPreGenerateKey`; `uploadCompressed` deleted)
- `src/modules/storage/storage.controller.ts` (deferred transform, thumbnail removed, `retractUpload`)
- `src/modules/storage/storage-onboarding.controller.ts`
- `src/modules/storage/storage.module.ts`
- specs: `storage-av-gate`, `storage-prd9-gaps`, `storage-tenant-private`, `storage.controller`, `storage-onboarding.controller`, `storage-image-delivery`, `storage-image-cross-tenant`, `storage-log-redaction`

Upload/attachment seams in other modules, touched only where they call storage:
- `src/modules/feedbucket/feedbucket-public.controller.ts` — screenshot and recording planned, transcode deferred
- `src/modules/feedbucket/tests/feedbucket-auto-link-deferred.spec.ts`, `tests/feedbucket-public-ai-assist.spec.ts` — constructor arity I changed
- `src/modules/kb/wiki/kb-media.service.ts` — `limitInputPixels` on the sharp decode (+ its spec's assertion)
- `src/common/media/media-compression.service.ts` — `planOutput`, ffmpeg kill/threads/input cap, log message fix
- `src/degradation/object-storage.spec.ts`

Scripts:
- `scripts/backfill-public-object-urls.mjs`
- `package.json` (two `check:public-object-urls*` entries)

## Still open, in other territories

- **`feedbucket-public.controller.ts` interpolates the raw screenshot KEY into an
  `<img src="…">`** in the ticket HTML it generates. The key is not a URL, so the
  image is broken. Fixing it needs a decision about which read path generated
  ticket content should use — there is no public one. Reported, not changed.
- **`chat.schemas.ts` still requires both `fileUrl` and `fileKey`** on a message
  attachment and they now carry the same value. `fileUrl` should go (chat's
  territory).
- **`/onboarding/documents` returns `{ url }` holding a key.** Same field-name
  confusion 33b removed from `/storage/upload`; renaming it needs the matching
  frontend change. The new gate does not catch it because the return type is
  inline rather than a named `*UploadResult`.
- **`BE/openapi.json` still advertises `x-authorized-in-service: resolveFileOwner`**
  for `/storage/download` and `/storage/image`; the controller declares
  `assertKeyReadable`. Regenerating needs a Nest boot against the shared remote
  database.
- `src/common/tenant/tenant-context.interceptor.ts` and
  `src/modules/payroll/filings/__tests__/filings-list-pagination.spec.ts` are red
  in the shared tree from other sessions' in-flight edits.

---

# 33c — the write-ahead purge log nobody read (2026-09-03)

## 1. What was wrong

`storage_pending_purge` is the table that records "this object was ours to delete". Two services open rows on
it, and both do so **before** attempting the delete, on purpose — `organization-purge-adapters.ts` says why in
its own comment:

> The pending row must exist before its object is deleted, or a crash between the two loses the only record
> that the object was ever ours to remove.

That is the correct design. It was only half built. Searched across `src/`, `test/`, `scripts/` and
`migrations/`: **zero** reads of the table. No `SELECT`, no `.from(storagePendingPurge)`, no consumer of any
kind. Two writers, no reader.

The consequence is not a missing nicety. `attempt_count`, `status='failed'` and `failed_reason` are all written
and none is ever acted on, so:

- every object whose delete failed during an **organisation purge** stayed in the bucket forever, and
- every object whose delete failed during an **e-sign document deletion** did too,

with the row that named them sitting in a table nothing looked at. Ticket 33 box 6 claims cancellation, failed
transforms and GDPR/retention deletion "each clean both the database row and the object, with no orphan". On the
failure path — the only path this table exists for — that was not true.

## 2. The fix

- `src/modules/storage/storage-pending-purge.service.ts` (new) — data access: `listForRetry` (status `pending`
  or `failed`, `attempt_count` below a ceiling of 10, oldest first), `markConfirmed`, `markFailed`.
- `CronStorageSweepService.drainPendingPurge` — runs per organisation inside the existing `forEachOrg` tenant
  transaction, so the reads reach the pool with the org GUC set rather than dying `42501`.

Two invariants it holds deliberately:

- **The object is deleted before the row is confirmed**, never the other way round. Confirming first would
  discard the only pointer while the object survived — the same ordering the rest of this ticket relies on.
- **`deleteFileIfPresent`, not `deleteFile`.** An object already gone means the purge succeeded; retrying it
  forever is what would keep the row alive and the counter climbing.

A failing row keeps its reason and an incremented attempt count and is retried next sweep, up to the ceiling,
after which it stays as evidence rather than being retried indefinitely.

Also corrected: `uniq_storage_pending_purge_org_key` is `CREATE UNIQUE INDEX` in migration `0741` and in the
live catalog, but was declared `index()` rather than `uniqueIndex()` in `src/db/schema/common/storage-pending-purge.ts`.
Both writers use `onConflictDoUpdate({ target: [orgId, storageKey] })`, which requires that uniqueness — so the
declaration disagreed with the catalog on a property two call sites depend on.

## 3. Proof

`pnpm exec jest --runInBand --testPathPattern="cron-storage-sweep"` → **exit 0, 12 tests, 5 new**:
retries and confirms every pending row · scans every active organisation · records the reason and keeps the row
when the delete fails · never confirms before the object is gone (ordering asserted explicitly) · carries on
sweeping when the scan itself fails.

**Bite-proved, not asserted.** Removing the single `await this.drainPendingPurge(orgId, result)` call turns
**4 of the 5** red. The fifth ("carries on when the scan fails") asserts a non-effect and passes vacuously
without the drain — stated rather than counted as a bite.

Wider: `jest --testPathPattern="src/modules/storage|cron-storage-sweep|migration-integrity|audit"` → **exit 0,
35 suites / 355 tests**. Backend `typecheck` → **exit 0**.

## 4. How this meets the KB orphan from the other side

The coordinator flagged box 6 as falsely ticked because `kb-page-tree.service.ts::emptyTrash`/`::purgeExpired`
cascade `kb_page_attachments` rows away without deleting their R2 objects. That is `src/modules/kb`, not this
territory. It was fixed by another agent during this session — commit `0edadaa0`, verified here: it adds
`kb-page-attachment-purge.ts` and wires `recordPageAttachmentPurge` → `delete(kbPages)` →
`attemptPageAttachmentPurge` into **both** paths, in that order. `jest --testPathPattern="kb-page-attachment-purge|kb-page-tree-attachment-purge"`
→ **exit 0, 2 suites / 12 tests**.

That fix writes into `storage_pending_purge` with purpose `kb:page:purge`, and its docstring says the rows are
*"read back by the storage sweep"*. **That sentence was false until the drain existed.** The producer and the
consumer were written independently, in two territories, and the leak closes only because both landed.

## 5. Still owed, and not closed by anything here

Box 7's two operator actions are unchanged and neither can be done from code:

1. `node scripts/backfill-public-object-urls.mjs --url <owner DSN> --apply`, as the **database owner** against
   the production database — **NOT RUN**, on any database, by anyone.
2. Removing public access from the R2 buckets named by `R2_BUCKET_NAME` **and** `R2_KB_BUCKET_NAME` in the
   Cloudflare console — **NOT DONE**. Until it is, every object already at a public r2.dev address stays
   fetchable by anyone who copied one, whatever the database columns now say. There is no code substitute.

`pnpm check:public-object-urls` → **exit 0** (9 declared references, 0 upload-result `url` fields) and
`:self-test` → **exit 0**, re-run this session. The code half has not regressed; the infrastructure half is owed.

Exit codes on the backfill, repeated because it is the most misreadable thing in the runbook: **exit 2 means
"not visible to this role", never "nothing found."** Only exit 0 **with** `UNVERIFIABLE COLUMNS: 0` is evidence
of a clean database.

## 6. Not done

- The drain retries; it does not **discover**. An object orphaned before its producer was fixed leaves no row,
  so nothing in the database can find it. Recovering those still needs a bucket-side listing diffed against the
  key columns — an operator action, recorded as owed, not performed.
- No e2e or seeded run against a live R2 endpoint. Every proof here is unit-level plus catalog inspection.
