# Ticket 21 — Tenant-private upload lifecycle (PRD-C103) — audit at current head

**Backend head:** `66f09164f` (`release/code-10-10-v2`) — 16 commits after the prior audit's `70fbf9e9`
**Frontend head:** `ab6a77a69` (`release/code-10-10-v2`)
**Prior report:** `.scratch/code-release-10-10-v2/reports/21-tenant-private-uploads.md`
**Verdict:** **partially-met.** The generic storage seam is genuinely well built. The criterion is not
met because the seam is bypassed by every product module that owns attachments, because the malware
step has no viable production configuration, and because object cleanup exists on 3 of ~30 tables.

---

## 0. What the prior audit closed, and what I did with it

I re-verified every claim in the prior report at head. Summary:

| Prior claim | Status at head | Evidence |
|---|---|---|
| Region-prefix key-parse fix landed | **HOLDS** | `4cf35131e`; `storage-key.ts:82-88` present; `storage-key-region-prefix.spec.ts` green |
| One upload interface, no module reaches S3 directly | **HOLDS** | `PutObjectCommand`/`CreateMultipartUpload`/`S3Client` outside `modules/storage/**` only in `src/scripts/setup-r2-buckets.ts` |
| Size + magic bytes on the generic route | **HOLDS** | `storage.controller.ts:131-135`; `validateMagicBytes` now at **9** sites (was 8) |
| Name/folder sanitization | **HOLDS** | `storage-key.ts:114-139`; `sanitizeFolder` called at exactly 1 site |
| Multipart idempotency, arbiter inferable | **HOLDS, IMPROVED** | `check:conflict-targets` exit 0, **363 calls, 161 explicit targets, 160 resolved, 0 ratcheted** — the two 42P10 defects it reported are **now fixed** |
| Bounded transforms | **HOLDS, better than reported** | `media-transform.runner.ts:22-24` — **three** bounds: `MAX_CONCURRENT=2`, `MAX_QUEUED=32`, `JOB_TIMEOUT_MS=60_000` |
| 28 dead `err.code === "23505"` branches repo-wide | **IMPROVED** | now **15**: crm 7, hr 5, inventory 2, 1 in a check script |
| `test/security/upload-controls.spec.ts` green | **HOLDS** | 15 tests, exit 0 |
| Three vacuous gates | **HOLDS, one is worse** | see §6 |
| **12 of 15 minting sites unverified** | **I VERIFIED ALL 12** | §3 — this is the bulk of my work |
| `resolveFileOwner`'s 7 leading-wildcard ILIKEs | **HOLDS, now measured** | `EXPLAIN` shows Seq Scan; **no index exists on any of the 7 URL columns** |

The prior audit's open item — the 12 unverified minting sites — was the right thing to worry about.
Auditing them produced the ticket's most serious findings, plus a whole dimension the prior report
never opened: **the malware-scanning step itself.**

---

## 1. Corpus read — with numbers

### Backend

| Thing | Count | How measured |
|---|---|---|
| `src/**/*.ts` | **5,768** | `find src -name '*.ts'` |
| controllers | **550** | `find src -name '*.controller.ts'` |
| HTTP handlers | **3,648** | `grep -E '^\s*@(Get\|Post\|Put\|Patch\|Delete)\('` over controllers |
| spec files | **2,004** | `find src test -name '*.spec.ts'` |
| **storage module files** | **43** (21 specs + 22 impl), **8,137 LOC** | `find src/modules/storage -type f` |
| **storage module routes** | **14** across 6 controllers | storage 3, multipart 3, quarantine 5, onboarding 1, kb 1, vault 1 |
| **signed-URL minting sites** | **15** | 14 `getFileUrl` callers + 1 presigned-part site (`storage-multipart.service.ts:103`) |
| **upload entry points** | **16** `uploadFile`/`uploadToKey` callers + **8** files carrying a file interceptor |
| **object-deletion call sites** | **22** | `deleteFile`/`deleteFileIfPresent`/`purgeOrgPrefix` |
| **durable purge-ledger enqueue sites** | **3** | e-sign document delete, kb page attachments, org purge |
| `validateMagicBytes` call sites | **9** | |
| `AvScanner` injection sites | **3** | `storage.controller`, `storage-onboarding.controller`, `kb-media.service` |
| `quarantine.begin` sites | **3** | `storage.controller:176`, `storage-multipart.controller:107,171` |
| `isKeyBlocked` request-path sites | **1** | `storage.controller.ts:362` (plus the cron sweep) |
| `isForeignOrgKey` sites | **2** | `storage.controller.ts:349` (read), `storage-multipart.controller.ts:244` (write) |
| specs outside `modules/storage/` naming `assertKeyReadable`/`isForeignOrgKey` | **0** | nothing pins key authorization in any product module |

### Live catalog (`scratch_head_1010`, 944 tables, journal head)

- **40 columns** across ~30 tables hold an object key or file URL
  (`file_key`, `storage_key`, `file_url`, `s3_key`, `current_file_key`, `original_file_key`,
  `final_pdf_file_key`, `certificate_file_key`, `image_file_key`, `pdf_storage_key`,
  `attachment_file_key`, `csv_file_key`, `error_report_file_key`, `document_key`).
- **RLS enabled on 14/14** storage-bearing tables I checked (`relrowsecurity = t`, `force = f`).
- `pg_trgm` **is** installed — so a trigram index is available for §Finding 11 if the projection fix is deferred.

### Frontend

- **31** non-`node_modules` files touch the storage/upload surface.
- Load-bearing: `app/api/media/image/route.ts` (the media bridge), `hooks/common/use-file-url.ts`,
  `hooks/api/use-upload-file.ts`, `lib/utils.ts` (`isStorageObjectKey`/`storageObjectUrl`/`resolveImageUrl`),
  `components/storage/file-upload.tsx`, `features/chat/use-message-composer.ts`.

### Commands run

| Command | Exit | Number produced |
|---|---|---|
| `pnpm check:public-object-urls` | 0 | 3,664 files, 9 public-base refs, all 9 declared, 0 upload-result URL fields |
| `pnpm check:multipart-contracts` | 0 | 550 controllers scanned; **9** governed handlers |
| `pnpm check:tenant-isolation` | 0 | 932/932 services with a *declared* test (static, self-admitted) |
| `pnpm check:conflict-targets` | 0 | 363 calls, 161 explicit, 160 resolved, 14 partial, **0 ratcheted** |
| `check-retention-coverage.mjs` vs `scratch_head_1010` | 0 | **2 tables considered** (1 covered, 1 uncovered) of 944 |
| `jest --testPathPattern="modules/storage/"` | 0 | **21 suites, 226 tests, all pass** |
| `jest --testPathPattern="security/upload-controls"` | 0 | 15 tests pass |
| `EXPLAIN (ANALYZE, BUFFERS)` on the `resolveFileOwner` ILIKE | — | **Seq Scan**, no index candidate |
| catalog queries for RLS / key columns / indexes | — | see above |

**Not run** (laptop budget, per brief): `pnpm build`, `typecheck`, the full jest suite, any seeded e2e.

---

## 2. Criterion PRD-C103, split into its ten named obligations

> Enforce one tenant-private upload interface for attachments and documents: validate declared size
> and magic-byte MIME, sanitize names, use organization-scoped object keys, idempotent multipart
> completion, malware quarantine, authorization recheck before short-lived download URLs and
> asynchronous compression/preview/transcoding with bounded jobs. Cancellation, failed transforms,
> replacement and GDPR/retention deletion must clean database rows and objects without orphaning or
> exposing public URLs.

| # | Obligation | Verdict | One-line reason |
|---|---|---|---|
| 1 | ONE tenant-private upload interface | **partially-met** | The *write* seam is single. The *read* seam is not: 12 of 15 minting sites reimplement authorization and none of them calls it. |
| 2 | Validate declared size AND magic-byte MIME | **partially-met** | Enforced on 9 of 16 upload entry points. The 5 key-ingestion routes never see bytes at all, so nothing is validated (Findings 1, 5, 9). |
| 3 | Sanitize names | **met** | `sanitizeFileName` applied at both key-minting sites; multipart folder is regex-bound. |
| 4 | Organization-scoped object keys | **met for minted keys; not-met for accepted keys** | `objectKey` is correct and the region-prefix parse fix holds. But 5 routes accept a key from the client and mint against it with no org check (Findings 1, 5, 9). |
| 5 | Idempotent multipart completion | **met** | `storage-multipart.controller.ts:146-201`, arbiter proven inferable, 0 ratcheted 42P10. |
| 6 | Malware quarantine | **not-met** | Registration on 3 of 16 upload paths; enforcement on 1 of 15 read paths; **no viable production scanner** (Findings 2, 3, 6). |
| 7 | Authorization recheck before a short-lived URL | **not-met** | 3 of 15 sites recheck the key. The other 12 authorize the *row* and then trust the row's key, which the client wrote (Findings 1, 3, 4, 5). |
| 8 | Async transforms with bounded jobs | **met** | Three bounds, back-pressure surfaced as 503 before the scan. |
| 9 | Cleanup on cancel / failure / replacement / GDPR — no orphans | **partially-met** | Excellent on the 3 paths that use the ledger; absent on ~27 other object-bearing tables (Findings 7, 8, 15). |
| 10 | No public URLs | **met in code, at risk in config** | `publicUrlFor` is gone; `check:public-object-urls` exit 0. But `img-src` still allows `*.r2.dev` and `resolveImageUrl` returns absolute stored URLs verbatim (Finding 13). |

---

## 3. The 12 unverified minting sites — the deliverable the prior audit left open

`StorageService.getFileUrl` (`storage.service.ts:223-233`) is a **bare minting primitive**: it takes
`(orgId, key, expiresIn)`, resolves the *org's* bucket, and signs a GET for whatever key it is handed.
It performs **no** authorization. `orgId` selects the bucket; it does **not** constrain the key.
Safety therefore rests entirely on the caller.

| # | Site | Row authorized? | **Key** authorized? | Quarantine consulted? | Verdict |
|---|---|---|---|---|---|
| 1 | `storage.controller.ts:305` | — | **yes** (`assertKeyReadable`) | yes | **KEEP** |
| 2 | `storage.controller.ts:327` (image) | — | **yes** | yes | **KEEP** |
| 3 | `storage-kb.controller.ts:95` | yes | no | no | REFACTOR |
| 4 | `storage-vault.controller.ts:104` | yes (`hr:documents:manage` + org) | **no** — `doc.s3Key` verbatim, client-written | no | **REFACTOR — Finding 5** |
| 5 | `chat-attachments.service.ts:42` | yes (membership + 2 org predicates) | **no** — `row.fileKey`, client-written, `z.string()` | no | **REFACTOR — Finding 1** |
| 6 | `support-kb-engagement.service.ts:196` | yes (org + article) | **no** — `row.fileKey`, client-written | no | REFACTOR |
| 7 | `hr/lifecycle/exit.controller.ts:184` | yes (perm + scope) | **no** — `getFileKeyFromUrl(record.fileUrl)`, `https://` escape hatch | no | REFACTOR — Finding 9 |
| 8 | `hr/lifecycle/hr-onboarding-docs-admin.controller.ts:134` | yes | **no** — same | no | REFACTOR — Finding 9 |
| 9 | `hr/lifecycle/onboarding-views.controller.ts:91` | yes (`self:onboarding-docs`, scope `own`) | **no** — same | no | REFACTOR — Finding 9 |
| 10 | `hr/performance/documents.controller.ts:121` | yes | **no** — same | no | REFACTOR — Finding 9 |
| 11 | `payroll/payout/payout-batches.service.ts:178` | yes (org + batch) | no (key is server-minted, so benign today) | no | KEEP with note |
| 12 | `e-sign/sign-documents.service.ts:152` | yes (`mustGetVisibleEnvelope` scope) | no (server-minted) | no | KEEP with note |
| 13 | `e-sign/sign-finalization.service.ts:290` | yes (scope) | no (server-minted) | no | KEEP with note |
| 14 | `e-sign/sign-finalization.service.ts:306` | yes (scope) | no (server-minted) | no | KEEP with note |
| 15 | `e-sign/sign-public.service.ts:178` | **partially** — token only, **no authentication factor** | no | no | **REFACTOR — Finding 4** |

**Counts: key authorized at 2/15. Quarantine consulted at 2/15. `isForeignOrgKey` reached at 1/15 read paths.**

The controller's own comment states the rule the other 13 sites break — `storage.controller.ts:338-340`:

> *"The key is refused for naming a foreign organisation before anything is looked up, because **a key
> the client chose is an input, not a fact**."*

Five of those 13 accept exactly such an input.

`sign-public.service.ts:178` was the site the prior audit flagged to look at first. It was right, but
for a different reason than expected — see Finding 4.

---

## 4. Findings

| # | Sev | File:line | Failure scenario | Fix |
|---|---|---|---|---|
| 1 | **P0** | `src/modules/chat/dto/chat.schemas.ts:54` → `src/modules/chat/chat-attachments.service.ts:42` | Cross-tenant / cross-permission object read from an unauthorized key | Validate the key and call `assertKeyReadable` |
| 2 | **P0** | `src/common/security/virustotal-av-scanner.ts:57` (+ `storage.controller.ts:154`) | Tenant-private document bytes leave the tenant to virustotal.com; the scan cannot finish inside the request budget | Move the scan out of the request transaction; drop the VT full-file upload |
| 3 | **P1** | `src/modules/storage/storage.service.ts:223` | Quarantined/infected object still served by 13 module routes | Fold the guard into the primitive |
| 4 | **P1** | `src/modules/e-sign/sign-public.service.ts:171-178` | Access-code / OTP factor does not gate document download | Require `recipient.authenticatedAt` |
| 5 | **P1** | `src/modules/hr/recruitment/dto/candidate-records.schemas.ts:81` → `storage-vault.controller.ts:98-104` | Client-chosen `s3Key` minted verbatim for the ID-document vault | Constrain the key; recheck before minting |
| 6 | **P1** | `src/modules/hr/recruitment/recruitment-candidate-vault.service.ts:75` | `avResult` is write-only — the vault has no scanner | Wire the vault into `FileQuarantineService` |
| 7 | **P1** | `src/modules/hr/recruitment/recruitment-candidate-vault.service.ts:101,116` | GDPR delete leaves Aadhaar/PAN/passport scans in the bucket forever | Read `s3Key`, enqueue `storagePendingPurge` |
| 8 | **P1** | `src/modules/support/core/support-kb-engagement.service.ts:171` | Delete reads `fileKey` and discards it — guaranteed orphan | Enqueue the returned key |
| 9 | **P1** | `hr/performance/dto/documents.schemas.ts:22`; `hr/lifecycle/dto/hr-lifecycle.schemas.ts:14,144` | `^https://` escape hatch defeats the folder allowlist on 4 HR file routes | Drop the https branch |
| 10 | **P1** | `src/modules/storage/storage.controller.ts:154` (+ `recruitment-candidate-ai.service.ts:289`) | Provider call inside the request's DB transaction, `idle_in_transaction_session_timeout = 60 s` | Scan after commit, or `@NoTenantTransaction` |
| 11 | **P2** | `src/modules/storage/storage.controller.ts:380-392` | 7 unindexed leading-wildcard ILIKEs per download; the cross-org branch is dead under RLS | Keyed `storage_object_owners` projection |
| 12 | **P2** | `frontend/app/api/media/image/route.ts:64` + `storage.controller.ts:329` | 24 h cached tenant image served with no re-authorization | Drop `immutable`, shorten `max-age`, add `Vary` |
| 13 | **P2** | `frontend/proxy.ts:50` + `frontend/lib/utils.ts:65` | Public R2 hosts still permitted in `img-src`; absolute stored URLs returned verbatim | Remove the two r2 hosts once the backfill lands |
| 14 | **P2** | `frontend/hooks/common/use-file-url.ts:12,77` | Stored attacker URL containing `/uploads/` opened via `window.open` without `noopener` | Add `noopener`; drop the `/uploads/` heuristic |
| 15 | **P2** | `src/modules/e-sign/sign-public.service.ts:339-345` | Unauthenticated public upload: no magic bytes, no quarantine row, no quota, replacement orphans | Route through the storage seam |
| 16 | **P2** | `src/modules/cron/cron-hr-retention.service.ts:277-283` | A transient storage failure is counted as an orphan and never retried | Enqueue `storagePendingPurge` before deleting |
| 17 | **P2** | `frontend/hooks/api/use-upload-file.ts:28-29` | Client's `file.type`/`file.size` recorded instead of the server's measured values | Return `data.mimeType` / `data.size` |
| 18 | **P2** | `src/modules/chat/chat-channel-members-implementation.ts:475-488` | Join omits `chatAttachments.orgId`; only RLS separates tenants | Add the predicate |
| 19 | **P2** | `src/common/security/av-scan.ts:13-19,114-163` | Documented quarantine-staging contract is not implemented; 75 lines of dead signed-token code tested by 14 assertions | Delete or implement |
| 20 | **P2** | `src/modules/storage/file-signatures.ts:50` | Unknown MIME passes unconditionally — latent, not live | Fail closed |
| 21 | **P2** | `src/modules/storage/file-quarantine.service.ts:211-226` | `isKeyBlocked` fails open for untracked keys | Fail closed once the backfill lands |
| 22 | **P2** | `src/modules/hr/recruitment/recruitment-candidate-ai.service.ts:277-282` | PDF/DOCX resume decoded as UTF-8; no magic-byte check | Extract text properly; validate signature |

### Finding 1 — P0 — a chat attachment's object key is an unauthenticated client input

```ts
// src/modules/chat/dto/chat.schemas.ts:49-59
attachments: z.array(z.object({
  fileName: z.string(),
  fileUrl:  z.string(),
  fileKey:  z.string(),      // <-- no .min, no .max, no shape, no org prefix
  fileSize: z.number(),
  mimeType: z.string(),
})).optional(),
```

```ts
// src/modules/chat/chat-attachments.service.ts:23-43
await this.members.assertChannelMembership(channelId, userId, orgId);   // authorizes the ROW
const rows = await this.db.select({ fileKey: chatAttachments.fileKey })  // ...and then trusts
  .from(chatAttachments)                                                 //    the row's key
  .innerJoin(chatMessages, eq(chatAttachments.messageId, chatMessages.id))
  .where(and(eq(chatAttachments.id, attachmentId), eq(chatAttachments.orgId, orgId), ...))
  .limit(1);
const url = await this.storage.getFileUrl(orgId, row.fileKey, 3600);     // 1-hour signed GET
```

The row lookup is textbook — two `orgId` predicates, a channel predicate, `limit 1`. It authorizes
the **row**. The row's `fileKey` was written by whoever posted the message
(`chat-messages.service.ts:184`, `fileKey: a.fileKey`).

**Complete intra-tenant chain, no guessing required:**

1. `listChannelFiles` (`chat-channel-members-implementation.ts:469`) returns `fileKey` to every member
   of a channel. HR posts `payslip-oct.pdf` in `#hr-announcements`; employee E's client receives
   `<org>/documents/<uuid>-payslip-oct.pdf`.
2. E is later removed from the channel, or the message is deleted.
3. E opens a channel they own and posts a message with
   `attachments:[{ fileName:"x", fileUrl:"", fileKey:"<org>/documents/<uuid>-payslip-oct.pdf",
   fileSize:1, mimeType:"application/pdf" }]`.
4. `GET /chat/channels/<own>/attachments/<id>` — membership passes (own channel), `orgId` passes
   (own org) — a 3,600-second signed URL for the payslip is returned.

E holds only `chat:messages:read`/`write`. The generic route would have refused the same key:
`documents` is in `SENSITIVE_FOLDER_ROOTS` and `requiresDedicatedAccess` returns 403 for
`HR_DOCUMENT`. **The chat route serves what the storage route is written to refuse.**

**Cross-tenant escalation:** substituting `<ORG_B>/documents/<uuid>-…` mints against ORG_A's
placement. When ORG_A and ORG_B share a region — the default, single-region deployment — the bucket
is the same and the presigned GET returns ORG_B's bytes. Key secrecy (a random UUID) is the only
thing in the way, and key secrecy is not an authorization control: keys cross org boundaries through
support tickets, shared envelopes and logs.

**Fix:** in `getSignedUrl`, before minting —
`if (!this.storage.isValidFileKey(row.fileKey) || isForeignOrgKey(row.fileKey, orgId)) throw new NotFoundException(...)`
— and tighten the DTO to `z.string().min(1).max(1024).regex(/^[a-zA-Z0-9][a-zA-Z0-9/_.-]*$/)`.
The durable fix is Finding 3.

### Finding 2 — P0 — the malware step exfiltrates the file, and cannot finish

`storage.controller.ts:154` awaits `this.avScanner.scan(file.buffer, …)` inside the request handler.
There are exactly three implementations, selected by `AV_SCANNER` (`av-scanner.module.ts:14-26`):

- **unset → `NoopAvScanner`.** In production it returns `{status:"error"}`
  (`av-scan.ts:60-63`), and `storage.controller.ts:157-158` turns that into
  `503 Malware scan unavailable — upload rejected`. Fail-closed by design; every upload 503s.
  `AV_SCANNER` appears in neither `.env` nor `.env.example`.
- **`virustotal` → `VirusTotalScanner`.** `scan` hashes the buffer, asks VT for a report, and on a
  miss **uploads the entire file body to `https://www.virustotal.com/api/v3/files`**
  (`virustotal-av-scanner.ts:81-88`). Every unique tenant document — offer letters, payslips,
  resignation letters, candidate ID scans — is a miss by definition. Files submitted to VirusTotal
  are retained and, on the public tier, downloadable by other subscribers. This is a direct
  contradiction of "uploads remain private … through … scanning".
- **`clamav` → `ClamAvScanner`.** Local socket, `SCAN_TIMEOUT_MS = 30_000`.

**And the VirusTotal path cannot complete.** `TenantContextInterceptor` wraps every HTTP handler in a
tenant transaction and arms `createStreamAbortSignal(req, res, REQUEST_DEADLINE_MS)`
(`tenant-context.interceptor.ts:122`), where `REQUEST_DEADLINE_MS = admission.maxExecutionMs`, which
defaults to `statementTimeoutMs` = **30,000 ms** (`admission.config.ts:60-61`, `pool.config.ts:121`).
`VirusTotalScanner.scan` budgets **10 s** (report) **+ 60 s** (upload) **+ 6 × 15 s** (polling) ≈ **160 s**.
The request is aborted at 30 s; `idle_in_transaction_session_timeout` (60 s, `with-tenant.ts:23-26`)
kills the session shortly after. `POST /storage/upload` fails for every first-seen file.

`clamav` at 30 s ties the deadline exactly — any scan that uses its full budget loses the race.

**Net: there is no `AV_SCANNER` value at head under which uploads both succeed and stay private.**

**Fix:** move the scan off the request path. The machinery already exists — the quarantine row is
written before the object is reachable and `MediaTransformRunner` is a bounded async runner. Scan in
the runner, gate `markClean` on the result, and delete the VirusTotal full-file upload (hash lookup
only), or require ClamAV.

### Finding 3 — P1 — the guard is in the caller, not the primitive

`isKeyBlocked` is consulted on **1** request path (`storage.controller.ts:362`).
`isForeignOrgKey` on **2** (one read, one write). `getFileUrl` itself checks nothing.

**Failure:** an admin rejects a file via `POST /storage/quarantine/:id/reject` →
`markInfected` (`storage-quarantine.controller.ts:120`). `GET /storage/download` now 404s the key.
`GET /chat/channels/:c/attachments/:a` (and the HR, support, e-sign, payroll and vault routes) still
mints a signed URL for it. **The quarantine verdict is unenforceable outside the storage module.**

**Fix:** make the primitive safe. `getFileUrl(orgId, key, …)` should refuse a foreign-org key and a
blocked key itself, with an explicit `{ preauthorized: true }` opt-out for the two sites that have
already run `assertKeyReadable`. Then add `check:signed-url-authorization` asserting that every
`getFileUrl` caller either passes the opt-out or is in an allowlist with a stated reason.

### Finding 4 — P1 — the e-sign second factor does not gate the document

```ts
// src/modules/e-sign/sign-public.service.ts:171-179
async getDocumentPreview(token: string, documentId: number) {
  return this.withRecipientSession(token, async ({ recipient, envelope }) => {
    if (this.deriveState(recipient, envelope) !== "active" && recipient.status !== "completed") {
      throw new ForbiddenException("This document is not currently available.");
    }
    const doc = await this.db.query.signDocuments.findFirst({ ... });
    const url = await this.storage.getFileUrl(envelope.orgId, doc.currentFileKey, 900);
```

`deriveState` (`:86-96`) never reads `authenticatedAt`. Every other privileged action does:
`:278` requires `authenticatedAt`, `:310`/`:337`/`:393` require `consentAcceptedAt`.
`getDocumentPreview` requires neither.

**Failure:** an envelope is sent to a recipient with `authMethod: "access_code"` — chosen precisely
because an emailed link is not considered sufficient. Anyone who obtains the link (a forwarded email,
a shared inbox, a mail-scanner log) calls `GET /public/sign/:token/documents/:id/preview` and gets a
900-second signed URL for the contract **without ever entering the access code**. The route is
`@Public()`; only a rate limit stands in front of it.

**Fix:** add `if (!recipient.authenticatedAt) throw new ForbiddenException("Please complete authentication first")`
before the lookup, matching `:278`.

### Finding 5 — P1 — the candidate ID vault mints a client-chosen key

```ts
// src/modules/hr/recruitment/dto/candidate-records.schemas.ts:79-86
export const addVaultDocumentSchema = z.object({
  filename: z.string().min(1),
  s3Key:    z.string().min(1),      // any string
  fileUrl:  z.string().url(),       // any URL
  ...
```
```ts
// src/modules/storage/storage-vault.controller.ts:98-104
const key = doc.s3Key.trim().length > 0 ? doc.s3Key : this.storage.getFileKeyFromUrl(doc.fileUrl);
if (key.length > 0 && this.storage.isConfigured()) {
  signedUrl = await this.storage.getFileUrl(u.orgId, key, SIGNED_URL_EXPIRY_SECONDS);
```

`isValidFileKey` is not even called here. `candidate_documents_vault` is one of the four
`requiresDedicatedAccess` protected types (`storage.controller.ts:70`) — Aadhaar, PAN, passport.

**Failure:** a recruiter in ORG_A `POST`s a vault document with
`s3Key: "<ORG_B>/candidates/<uuid>-passport.pdf"`, then `POST :documentId/url`. The permission check
passes (their own org's row), the org predicate passes, and a 900-second signed URL for ORG_B's
passport scan is returned. `vault_access_logs` records it against ORG_A's candidate.

Upload validation on this path is also declaration-only: `recruitment-candidate-vault.service.ts:55-57`
accepts if **either** the declared MIME **or** the filename extension is allowed (`!mimeAllowed && !extAllowed`),
and `fileSize` is whatever the client says. No bytes ever reach the server.

### Finding 6 — P1 — `avResult` is a decorative column

`av_result` is set to `"PENDING"` at insert (`recruitment-candidate-vault.service.ts:75`) and echoed
in the download response (`storage-vault.controller.ts:117`). A repo-wide grep for
`avResult|av_result` outside `db/schema` returns **4 hits, all of them that write and that read**.
Nothing transitions it and nothing blocks on it. A recruiter sees `avResult: "PENDING"` next to a
working `signedUrl`, forever.

### Finding 7 — P1 — vault deletion deliberately drops the key

```ts
// src/modules/hr/recruitment/recruitment-candidate-vault.service.ts:95-125
const existing = await this.db.query.candidateDocumentsVault.findFirst({
  where: and(...),
  columns: { id: true, filename: true, documentType: true },   // s3Key deliberately excluded
});
...
await tx.delete(candidateDocumentsVault).where(and(...));       // no object delete, no ledger row
```

A candidate exercises erasure. The row goes; the passport scan stays in the bucket, unreferenced,
undiscoverable, outside every retention sweep (`candidate_documents_vault` is not in the 29-entry
retention matrix). `storagePendingPurge` exists for exactly this and is not used.

### Finding 8 — P1 — support KB deletion selects the key and throws it away

```ts
// src/modules/support/core/support-kb-engagement.service.ts:161-175
const [deleted] = await this.db.delete(kbArticleAttachments)
  .where(and(eq(...id), eq(...articleId), eq(...orgId)))
  .returning({ fileKey: kbArticleAttachments.fileKey });   // fetched...
if (!deleted) throw new NotFoundException("Attachment not found");
return { success: true };                                   // ...and discarded
```

Every support-article attachment deletion orphans its object. The `returning()` clause makes the
omission unambiguous — the key was retrieved for a purpose that was never written.
`createAttachment:142-143` likewise stores a client-supplied `fileKey` and `fileUrl` verbatim.

### Finding 9 — P1 — the `https://` escape hatch in three HR schemas

```ts
// src/modules/hr/performance/dto/documents.schemas.ts:20-24
.refine((value) =>
  /^https:\/\//i.test(value) ||
  /^(?:documents|hr-documents)\/[a-zA-Z0-9][a-zA-Z0-9/_.-]*$/.test(value),
  "Invalid stored document file reference")
```

Same shape at `hr-lifecycle.schemas.ts:14` (`resignations/`) and `:144` (`onboarding|onboarding-docs/`).
The folder allowlist is the intended control; the `^https://` alternative removes it. Any
`https://<NEXT_PUBLIC_R2_PUBLIC_URL>/<any key>` survives, and
`getFileKeyFromUrl` (`storage.service.ts:368-382`) strips the base and returns the key, which
`isValidFileKey` clears on syntax alone.

**Failure:** an employee holding only `self:onboarding-docs` `POST`s their own onboarding document
with `fileUrl: "https://<base>/<org>/payslips/<uuid>-payslip.pdf"`, then `GET /me/:docId/file`
(`onboarding-views.controller.ts:64-91`) — scope `own`, own row, permission satisfied — and receives
a 300-second signed URL for the payslip. `requiresDedicatedAccess` never runs on this path.

Note the folder branch also cannot match a correctly-minted key: real keys begin with the org id, not
`documents/`. The regex only admits legacy flat keys — so today the `https://` branch is the *only*
one a current client can use, which is why the hole is load-bearing rather than vestigial.

### Finding 10 — P1 — provider calls inside the request transaction

`TenantContextInterceptor.runInTenantTransaction` (`tenant-context.interceptor.ts:131-143`) opens a
transaction for every HTTP handler not marked `@NoTenantTransaction`. **No storage handler is marked.**
Inside that transaction, `storage.controller.ts:154` awaits an AV provider (up to ~160 s for VT) and
`recruitment-candidate-ai.service.ts:289` awaits an LLM gateway. `with-tenant.ts:23-26` sets
`idle_in_transaction_session_timeout = 60_000` local to the transaction, so a call exceeding 60 s
kills the connection mid-request.

The codebase already states the rule, at `cron-hr-retention.service.ts:262-267`:

> *"It runs after the sweep's transactions have committed, never inside one: an object delete is a
> network call, and holding a pooled connection open across it is how one storage outage stalls
> every tenant."*

The upload path does the thing that comment forbids, with a slower provider.

### Finding 11 — P2 — seven unindexed leading-wildcard scans in the authorization path

```ts
// src/modules/storage/storage.controller.ts:380-392
const like = `%${fileKey}%`;
await Promise.all([
  this.db.query.documents.findFirst({ where: ilike(documents.fileUrl, like) }),
  ... six more ...
]);
```

Measured on `scratch_head_1010`:

```
Limit  (cost=0.00..12.12 rows=1) (actual rows=0 loops=1)
  ->  Seq Scan on documents  (cost=0.00..12.12 rows=1)
        Filter: (file_url ~~* '%abc/documents/x.pdf%'::text)
```

`pg_indexes` shows **no index on any of the seven URL columns** (`documents.file_url`,
`onboarding_documents.file_url`, `expenses.receipt_url`, `reimbursements.receipt_url`,
`handbook_versions.document_url`, `payslip_publications.pdf_url`,
`candidate_documents_vault.file_url`). Seven sequential scans on every authorized file read, growing
with tenant size. CLAUDE.md §3 bans leading-wildcard `ILIKE`.

Two secondary defects in the same block:

- **No `orgId` predicate** on any of the seven. Under RLS a foreign row is *invisible*, not
  *mismatched* — so `if (fileOwner.orgId !== user.orgId)` at `:354` **can never be true**. It reads
  as a cross-tenant check and is dead. The only live defenses are `:349` and `:358`.
- `isValidFileKey` permits `_`, which is a single-character `LIKE` wildcard, so a caller can widen
  the match. Harmless today (it can only reach *more* denials), but it makes the guard nondeterministic.

The DB here is empty, so **the timing is NOT MEASURED**. What would measure it: seed
`documents`/`payslip_publications` to ~10⁵ rows in a scratch org and run
`EXPLAIN (ANALYZE, BUFFERS)` on all seven, comparing against a keyed
`storage_object_owners(org_id, storage_key)` projection.

### Findings 12-14 — P2 — the frontend delivery path

`frontend/app/api/media/image/route.ts` is otherwise a good bridge: `getServerAuth` (`:36`), the
per-user backend JWT forwarded so `assertKeyReadable` actually runs (`:45`), an inline-type allowlist
(`:13-19`), `nosniff` and `default-src 'none'; sandbox` (`:65-66`), key regex with a `..` refusal.
Three residues:

- **`:64` `Cache-Control: private, max-age=86400, immutable`** — and `storage.controller.ts:329` sets
  the same. The URL depends only on `key`, not on the viewer. `private` scopes to the browser, not to
  the app user, and `immutable` suppresses revalidation entirely. On a shared workstation, user B
  navigating to a URL from user A's history gets the bytes with **no request to the server**, for 24 h.
  A permission revocation likewise does not bite for 24 h.
- **`frontend/proxy.ts:50`** still lists `https://*.r2.cloudflarestorage.com` and `https://*.r2.dev`
  in `img-src`, and `frontend/lib/utils.ts:65` (`resolveImageUrl`) returns any `https?:|data:|blob:`
  string verbatim. Any legacy row still holding a public R2 URL renders straight from the bucket,
  bypassing the bridge and `assertKeyReadable`. The comment at `utils.ts:32-36` explains why the
  bridge exists; the CSP has not caught up.
- **`frontend/hooks/common/use-file-url.ts:12`** — `if (url.includes("/uploads/")) return true;`
  treats any string containing `/uploads/` as local and returns it unchanged to
  `window.open(url, "_blank")` at `:77` — **without `noopener`**, while `:47` has it. Combined with the
  unconstrained `fileUrl` inputs (`candidate-records.schemas.ts:82`, `support-tickets.schemas.ts:100,296,312,348`,
  `build/core/dto/ticket.schemas.ts:260`), a stored `https://evil.example/uploads/x` is opened from the
  app with a live `window.opener`. `img-src` blocks the image variant; nothing blocks `window.open`.

---

## 5. Classification of the surface

**KEEP — correct, do not touch.**
`storage-key.ts` (incl. the region-prefix fix), `storage-placement.ts:143-151`,
`storage.service.ts:199-233,255-270` (the `bucketOverride` symmetry comment is exactly right),
`storage-multipart.controller.ts` **in full** — `verifyStoredObject:254-299` re-measures the object,
re-checks quota against the *measured* length, re-checks MIME, sniffs magic bytes and discards on any
failure; `abort:204-239` clears both halves; `assertOwnKey:241-246` is the only write-path key check
in the repo. `media-transform.runner.ts`. `storage-pending-purge.service.ts` +
`cron-storage-sweep.service.ts:157-197`. `gdpr-storage-purge.service.ts`.
`e-sign/sign-documents.service.ts:156-213` — **the reference cleanup implementation**: ledger row
first, then object delete, then confirm, with a `failed` branch the cron retries. Every other
delete path in the repo should be measured against it.
`chat-attachments.controller.ts` (permission + `@Validate` + `@RequirePermission`).
`feedbucket-public.controller.ts:377-390` (public upload, fully validated).
`frontend/app/api/media/image/route.ts` apart from the cache header.

**REFACTOR.** The 5 key-ingestion routes (Findings 1, 5, 8, 9), the 13 minting sites that do not
recheck the key (Finding 3), the AV seam (Findings 2, 10), `resolveFileOwner` (Finding 11),
`sign-public.service.ts` preview + `adoptSignature` (Findings 4, 15),
`recruitment-candidate-vault.service.ts` (Findings 6, 7), the two cache headers (Finding 12).

**REMOVE.** `av-scan.ts:99-163` — `signDownloadToken`/`verifyDownloadToken` have **zero production
callers**; the only references are `av-scan.spec.ts` and `storage-prd9-gaps.spec.ts:334-351`, 14
assertions over code no route reaches. `av-scan.ts:68-87` `assertUploadAllowed` is likewise dead (the
live one is the private method on `StorageController`). `av-scan.ts:13-19` documents a quarantine
staging/promotion contract (`uploads/quarantine/<orgId>/<uuid>` → `uploads/<orgId>/<uuid>`) that
**does not exist** — `planUpload` writes straight to the permanent key. Delete the code and correct
the comment, or implement it; leaving both is how a reader concludes a control exists.

---

## 6. Gate reach — measured, not quoted

| Gate | Exit | Corpus it prints | Governed set | Reach |
|---|---|---|---|---|
| `check:public-object-urls` | 0 | 3,664 files | 9 refs, **all 9 declared** | **0 enforceable sites** |
| `check:multipart-contracts` | 0 | 550 controllers | **9** interceptor handlers | **9 / 3,648 = 0.25 %** |
| `check:retention-coverage` | 0 | reads a live DB, ≥ 1 MB only | **2 tables considered** of 944 | **0.2 %** |
| `check:tenant-isolation` | 0 | 932 services | static existence, self-admitted | not execution |
| `check:conflict-targets` | 0 | 363 calls | 160 of 161 explicit targets | **real** |

Two corrections to the prior audit's numbers:

- **`check:retention-coverage` is worse than reported, not better.** Against the local head DB it
  considered **two tables** — one covered, one uncovered (`payroll_journal_batch_lines`, 1 MB, 0 rows)
  — and exited 0. Its threshold is table *size*, which on a bootstrapped database is a function of
  seed data. Independently: the matrix in `check-retention-coverage.mjs` holds **29 entries**, of
  which **2** (`documents`, `gdpr_export_jobs`) name an object-key-bearing table, against the **~30**
  such tables in the catalog. **Object retention coverage is 2/30 = 7 %.**
- **`check:conflict-targets` improved.** The two 42P10 defects the prior audit routed to the
  orchestrator (`billing/core/versioned-catalog.service.ts:182`, `hr/time/rosters.service.ts:41`) are
  gone: 0 ratcheted, shrink-only.

**The gate that does not exist is the one this ticket needs.** Nothing anywhere asserts *"a stored
object key must be authorized before it is used to mint a URL"*. Confirmed by the corpus number in
§1: **zero** spec files outside `src/modules/storage/` reference `assertKeyReadable` or
`isForeignOrgKey`. The single highest-value addition is `check:signed-url-authorization`, walking
every `getFileUrl` caller and requiring a key check or an allowlist entry with a stated reason —
today it would report **13 of 15 ungoverned**, which is the honest number.

---

## 7. What head already gets right

Worth stating plainly, because the findings above are concentrated outside the storage module:

- **The write seam is genuinely single.** No product module touches S3. The only `S3Client` outside
  `modules/storage/**` is an operator provisioning script.
- **The generic upload route is the best code in the ticket.** Interceptor cap, post-hoc size
  re-check, MIME allowlist, magic bytes, capacity check *before* the scan and the quota read, org and
  user quotas, quarantine row written before the object exists, key settled synchronously while the
  transform runs off-thread, compensation on failure.
- **Multipart is complete.** Idempotent completion keyed on `uploadId` with `replayed`, the arbiter
  proven inferable, the quarantine row written before the first part can land (with a comment
  explaining precisely why), the assembled object re-measured and re-sniffed at completion, and both
  halves cleared on abort. `assertOwnKey` is the one write-path key check that exists.
- **Key minting and parsing are correct**, including the region-prefixed shape the prior audit fixed,
  and `UUID_PATTERN` is anchored so a legacy filename beginning with a UUID cannot be misread.
- **`storagePendingPurge` is the right anti-orphan mechanism** and `e-sign/sign-documents.service.ts`
  is a correct implementation of it. The problem is reach, not design.
- **The `bucketOverride` symmetry** across `uploadFile`/`deleteFile`/`deleteFileIfPresent`, with the
  comment explaining that S3 answers a delete of an absent key with success so the asymmetry would be
  invisible — this is the kind of reasoning the rest of the deletion surface needs.
- **No public URLs are minted.** `publicUrlFor` is gone; `getFileKeyFromUrl` only parses.
- **RLS is on all 14** storage-bearing tables checked in the live catalog.
- **21 storage suites / 226 tests green** at head, plus `test/security/upload-controls.spec.ts` (15).
- **The frontend media bridge is correctly designed** — same-origin, session-authenticated, forwards
  the user's JWT so the backend re-authorizes, allowlists inline types, sandboxes the response.

---

## 8. Blocked on infrastructure — NOT MEASURED

1. **Whether `R2_KEY_PREFIX` is set in any deployed region.** The prior fix makes the code correct
   either way; which branch is live is a deployment fact.
2. **Which `AV_SCANNER` value production runs.** Not in `.env` or `.env.example`. Finding 2's severity
   is `virustotal` → confidentiality leak; unset → every upload 503s; `clamav` → marginal. All three
   are read from code; none is observable here.
3. **Whether the bucket has a public read policy or CORS `*`.** `setup-r2-buckets.ts` contains
   `ensurePublicReadCors`; whether it ran is deployed evidence. Finding 13's `img-src` entries are
   only exploitable if it did.
4. **Real ILIKE cost at production row counts** (Finding 11). Plan shape and index absence are
   measured; timing is not. Named above.
5. **Whether legacy flat `<folder>/…` keys still exist in production rows.** Their existence decides
   whether Findings 9 and 21's compensating controls are load-bearing. A `SELECT count(*) … WHERE
   file_url NOT LIKE '%/%/%'` per table against production would settle it.
6. **E2E proof of the Finding 1 and 4 chains.** Both are read entirely from source with complete
   call paths; neither was executed. `test/security/` + a seeded local Postgres (two orgs, one chat
   channel, one HR document) would drive them in under a minute — that is the test this ticket should
   ship with the fix.
7. **Whether the retention/detach crons actually run on schedule.** `check:retention-coverage` reads
   table sizes and proves nothing about execution.
