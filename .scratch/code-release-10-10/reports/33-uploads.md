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
