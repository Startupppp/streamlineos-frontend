# Ticket 21 — Tenant-private upload lifecycle (PRD-C103)

**Status:** audited at `release/code-10-10-v2` backend HEAD `70fbf9e9`. One security defect found and
fixed; eight of nine criteria evidenced as satisfied in code. Every gate cited below was executed and
its reach independently measured.

---

## The criterion, split into nine testable parts

| # | Part | Verdict |
|---|---|---|
| 1 | ONE upload interface, no module bypass | **SATISFIED in code, WEAKLY GATED** |
| 2 | Declared size AND magic-byte MIME | **SATISFIED, with a bounded caveat** |
| 3 | Name sanitization | **SATISFIED** |
| 4 | Org-scoped object keys | **DEFECT FOUND AND FIXED** |
| 5 | Idempotent multipart completion | **SATISFIED, now gate-evidenced** |
| 6 | Malware quarantine | **SATISFIED, fail-open for untracked keys** |
| 7 | Authorization recheck before minting a download URL | **SATISFIED at the generic seam; 12 of 15 minting sites are outside my territory and unverified by me** |
| 8 | Async transforms with bounded jobs | **SATISFIED — genuinely bounded on both axes** |
| 9 | Cleanup on cancel/failure/replacement/GDPR, no orphans, no public URLs | **SATISFIED in code; the object-side half is operator evidence** |

---

### (4) Org-scoped object keys — **DEFECT FOUND AND FIXED**

This is the finding of the ticket.

`StoragePlacement.objectKey` (`src/modules/storage/storage-placement.ts:143-151`) mints:

```ts
const rawKey = `${orgId}/${folder}/${randomUUID()}-${sanitizeFileName(fileName)}`;
return placement.keyPrefix ? `${placement.keyPrefix}/${rawKey}` : rawKey;
```

The region key prefix is written **ahead of the organisation**. `keyPrefix` is operator-set, read from
`<REGION>_R2_KEY_PREFIX` falling back to a flat `R2_KEY_PREFIX` (`src/common/region/region.config.ts:250`).

`parseStorageKey` (`src/modules/storage/storage-key.ts:50-69`) read the organisation from **segment one
only**. Under any region with a prefix set, it therefore returned the prefix as the folder root and the
owner as unknown. Measured against the real function before the fix:

```
key = "eu/<ORG_B>/documents/abc-file.pdf"   caller = ORG_A
parsed                = {"ownerOrgId":null,"folderRoot":"eu"}
isForeignOrgKey       = false
isSensitiveStorageKey = false
```

Both guards built on it degrade to "allow" **simultaneously**:

- `isForeignOrgKey` is false, so `assertKeyReadable` (`src/modules/storage/storage.controller.ts:344-350`)
  does not refuse the foreign key; and
- the folder root is `"eu"`, not `"documents"`, so it is not in `SENSITIVE_FOLDER_ROOTS` and the
  unresolved-sensitive-key denial at `storage.controller.ts:358-360` does not fire either.

`resolveFileOwner` is the only remaining layer, and it cannot save this: its lookups
(`storage.controller.ts:377-395`) carry **no `orgId` predicate** and rely on RLS, so another tenant's row
is invisible rather than mismatched — it returns `null`, which routes to the sensitive-folder fallback
that has just been defeated. Net effect: **a signed download URL for another tenant's HR document.**

The hole is configuration-conditional and invisible on an unprefixed deployment, which is precisely why
it needed a spec rather than a deployment check.

**Fix:** `src/modules/storage/storage-key.ts:69-88` — a region-prefixed branch that reads the
organisation from segment two and the folder root from segment three, including the
`ORG_NAMESPACED_KEY_FOLDERS` (`kb-media`, `kb-sources`) shape behind a prefix.

**Pinned by:** `src/modules/storage/storage-key-region-prefix.spec.ts` (new, 9 tests, exit 0). It asserts
both directions and, critically, that a legacy `uploads/<uuid>-report.pdf` key is **not** misread as
prefixed — `UUID_PATTERN` is anchored, so a file name that merely begins with a uuid cannot match.

Newly minted keys are otherwise correctly org-scoped: `<orgId>/<folder>/<uuid>-<sanitized>`.

---

### (1) ONE upload interface — satisfied in code, weakly gated

No module reaches the object store directly. `PutObjectCommand` / `CreateMultipartUpload` /
`UploadPartCommand` / `S3Client` appear outside `src/modules/storage/**` in exactly one place —
`src/scripts/setup-r2-buckets.ts`, an operator provisioning script, not a request path. Every
application upload goes through `StorageService`.

The seam is genuinely single, but the **gate that claims to police it covers 0.25% of handlers** — see
the reach table below.

### (2) Declared size AND magic bytes — satisfied, with a bounded caveat

`storage.controller.ts:116` caps at the interceptor (`limits.fileSize`), `:131` re-checks
`file.size > MAX_UPLOAD_SIZE` (10 MB) after the fact, `:132` applies the `ALLOWED_UPLOAD_TYPES`
allowlist, and `:134` calls `validateMagicBytes(file.buffer, file.mimetype)`. Both the declared size and
the byte signature are checked, not just the client content type. `validateMagicBytes` is applied at 8
call sites across storage, KB, feedbucket and e-sign, all importing the one implementation.

**Caveat:** `file-signatures.ts:50` — `if (!signatures) return true;`. An unknown MIME passes
unconditionally. This is **not currently exploitable on the generic upload route**, because the
`ALLOWED_UPLOAD_TYPES` allowlist at `storage.controller.ts:77-87` lists nine types and every one has a
`FILE_SIGNATURES` entry or an explicit branch. The fallback is a latent trap, not a live hole: it becomes
exploitable the moment any caller adds an allowlist entry without a signature. The multipart path checks
only the first bytes of part one (`storage-multipart.controller.ts:288`), which is the correct shape.

### (3) Name sanitization — satisfied

`sanitizeFileName` (`storage-key.ts` ~:110) takes the basename after splitting on both separators,
restricts to `[a-zA-Z0-9.-]`, collapses `..` runs, strips leading/trailing dots and dashes, caps at 120
chars, and falls back to `"file"`. `sanitizeFolder` keeps a client-chosen folder to a single segment —
letting a slash through would let the caller choose where in the tenant prefix the object lands, and the
folder root is what the sensitive-folder gate reads. Path traversal is closed at both.

### (5) Idempotent multipart completion — satisfied, now gate-evidenced

`storage-multipart.controller.ts:133-201`: completion is keyed on `uploadId` and returns
`replayed: outcome === "already-completed"`. The de-duplication does **not** rest on a dead SQLSTATE
branch (see below) but on an `ON CONFLICT` against `uq_notification_deliveries_idempotency` /
the multipart record — verified in the live catalog as a **full**, not partial, unique index, so the
arbiter is inferable and no 42P10 is possible.

`pnpm check:conflict-targets` (exit 0) is the direct evidence: **362 `onConflictDo*` calls scanned, 159
with an explicit target, 158 resolved to physical columns, 13 targeting a PARTIAL index.** It reports two
open 42P10 defects, and **neither is in my territory** — `src/modules/billing/core/versioned-catalog.service.ts:182`
and `src/modules/hr/time/rosters.service.ts:41`. Storage, notifications, push and email are clean.

**Dead `err.code === "23505"` branches in my territory: ZERO.** Drizzle wraps driver errors and puts
SQLSTATE on `.cause`, so any such branch would never fire. Grepping `src/modules/{storage,notifications,
email,push,gdpr}` and `src/common/media` returns no hits. 28 sites of that shape exist repo-wide — in
`inventory` (3), `hr` (3), `crm` (2), `billing` (2), `e-sign` (1) and 4 under `src/` outside modules.
**Cross-territory finding, reported not fixed.**

### (6) Malware quarantine — satisfied, fail-open for untracked keys

`file-quarantine.service.ts` implements a real state machine: `begin` → `pending_scan`, then
`markClean` / `markInfected` / `markError`, with `softDelete`, `listForSweep` and an idempotency-key
lookup. Quota accounting counts only `clean` rows (`:237`, `:254`). `assertKeyReadable` consults
`isKeyBlocked` before minting any URL.

**Caveat:** `isKeyBlocked` (`:211-226`) returns `false` when no quarantine row exists — fail-open for
untracked keys. That is layered behind the sensitive-folder denial, so it is defensible for the legacy
shape, but it means an object with no quarantine record is served unscanned.

### (7) Authorization recheck before minting a short-lived URL — the classic hole

`StorageService.getFileUrl` (`storage.service.ts:223-231`) is a bare minting primitive: it takes
`(orgId, key, expiresIn)` and performs **no authorization of its own**. Safety therefore rests entirely
on every caller rechecking immediately before the call. **There are 15 minting sites across 9 modules.**

In my territory the recheck is present and immediate:

- `storage.controller.ts:289` → `assertKeyReadable(fileKey, u, …)` then `:305` mint. Correct order.
- `storage.controller.ts:325` → same shape for the `image` route.
- `storage-vault.controller.ts`, `storage-kb.controller.ts` — permission-gated routes.

`assertKeyReadable` is a genuine object-level check, not just a prefix compare: foreign-org refusal,
owner resolution across 7 tables, a `requiresDedicatedAccess` denial that pushes protected types (HR
documents, payslips, candidate vault) to their own permission-scoped endpoints, a fail-closed default for
unresolved sensitive keys, and a quarantine block. Cross-tenant misses return `NotFoundException`, not
403, per CLAUDE.md §4.

**The remaining 12 minting sites are outside my territory and I did not verify them**:
`chat-attachments.service.ts`, `support-kb-engagement.service.ts`, four HR controllers
(`onboarding-views`, `hr-onboarding-docs-admin`, `exit`, `documents`), `payout-batches.service.ts`, and
three e-sign services (`sign-documents`, `sign-public`, `sign-finalization`). `sign-public.service.ts` is
the one I would look at first — it mints from a public envelope path. **Routed to the orchestrator.**

**Cross-territory performance finding:** `resolveFileOwner` (`storage.controller.ts:377-395`) runs
**seven concurrent leading-wildcard `ilike('%<key>%')` queries on every download**, against `documents`,
`onboardingDocuments`, `expenses`, `reimbursements`, `handbookVersions`, `payslipPublications` and
`candidateDocumentsVault`. CLAUDE.md §3 bans leading-wildcard `ILIKE` outright. This is a seven-way
full-table scan in the authorization path of every file read, and it cannot be cached away because it is
the authorization decision. It is in my territory but the fix is a schema change (a keyed
`storage_object_owners` projection), which is larger than this ticket and would collide with the
ticket-34 backfill. **Reported, not attempted.**

### (8) Bounded jobs — satisfied, genuinely bounded

`media-transform.runner.ts:22-23`: `MAX_CONCURRENT = 2`, `MAX_QUEUED = 32`. Bounded on **both** axes —
concurrency and depth. `hasCapacity()` is checked at `storage.controller.ts:143` **before** the scan and
the quota read, and refuses with 503 rather than queueing unboundedly. `submit` returns false when full
and logs. `drain` runs on shutdown so in-flight transforms settle. The runner is deliberately in-process
and documents that a restart loses queued transforms.

### (9) Cleanup — satisfied in code; the object half is operator evidence

Real machinery on all four paths: `deleteFileIfPresent` (tolerates an already-absent object, so a failed
upload / rejected transform / aborted multipart cannot fail on cleanup); `storage-purge.service.ts`
`purgeOrgPrefix`; **`storage-pending-purge.service.ts`** with `listForRetry` / `markConfirmed` /
`markFailed` — a durable deletion ledger, which is the actual anti-orphan mechanism; and
`gdpr-storage-purge.service.ts` with `buildManifest`, `purgeFromManifest`, `hasActiveLegalHold` and
`recordErasureAudit`.

`bucketOverride` is threaded through `uploadFile` / `deleteFile` / `deleteFileIfPresent` symmetrically,
with a comment explaining why: S3 answers a delete of an absent key with success, so an asymmetric
override cannot surface as an error and the orphan would be invisible.

**No public URLs:** `publicUrlFor` was deleted in ticket 33; `getFileKeyFromUrl` only parses a stored
legacy URL back to a key and never appends. `check:public-object-urls` exit 0 with 0 upload-result URL
fields — but see the reach caveat: that gate's enforceable scope today is **zero sites**.

---

## Measured gate reach — every gate I cite

The brief warned that a passing gate is not proof here. Each number below was reproduced with an
independent walk.

| Gate | Exit | Gate's own number | Independent count | Governed set | Verdict |
|---|---|---|---|---|---|
| `check:public-object-urls` | 0 | 3,649 files; 9 public-base refs | 12 raw grep → 9 after string/comment stripping ✓ | **9/9 allowlisted → 0 enforceable sites** | **VACUOUS** |
| `check:multipart-contracts` | 0 | "scanned 550 controller files" | 9 interceptor handlers (exact match) | **9 of 3,644 handlers = 0.25%** | **VACUOUS** |
| `check:retention-coverage` | 0 | 14 high-growth tables, 0 uncovered | 944 tables; 930 sub-threshold | **14 of 944 = 1.5%** | **VACUOUS** |
| `check:log-secrets` | 0 | 3,645 files, 1,000 log lines | 1,000 log lines; **492 (49%) multi-line and invisible** | 18 guarded names | **NARROW** |
| `check:conflict-targets` | 0 | 362 onConflict calls, 158 resolved | — | **158 of 159 explicit targets** | **REAL** |
| `check:tenant-isolation` | 0 | 931/931 services (100%) | — | static existence only, not execution | **NARROW (self-declared)** |
| `check:authz-deny` | 0 | 924/3,235 gated handlers | — | **29%**, ratchet 2,441 | **NARROW (honest)** |

Detail on the three vacuous ones:

- **`check:multipart-contracts` never prints the number that matters.** It says "every handler with a file
  interceptor carries `@MultipartAction`" but not how many have one: **nine**. Worse, **the real upload
  surface is presigned, not interceptor-based** — `storage-multipart.controller.ts` exposes
  `initiate`/`complete`/`abort` and mints per-part presigned URLs with no interceptor anywhere, so this
  gate covers **zero** of the multipart path it is named after. It also passes when the interceptor is
  declared at **class** level (the parser resets its decorator block at every `class` line), when
  multipart is read raw via `@Req()` + busboy, and when `FileInterceptor` is imported under an alias.
- **`check:public-object-urls` catches only a direct dot-notation reference to one of four literal
  identifiers.** `process.env["NEXT_PUBLIC_R2_PUBLIC_URL"]`, a one-hop helper
  (`const base = await this.regions.publicBaseFor(orgId)`), and a hand-built
  `` `https://${bucket}.${accountId}.r2.dev/${key}` `` all pass. All 9 detected sites are allowlisted, so
  its enforceable scope is zero. One allowlist entry (`setup-r2-buckets.ts`) is dead — it excuses 0 sites.
- **`check:retention-coverage` reads a live database, not the schema** — `DATABASE_URL` from `.env`, i.e.
  the shared Neon dev branch as `neondb_owner`, and only considers tables ≥ 1 MB. **917 live tables have
  no retention decision and are invisible to it.** 83 storage/upload/attachment/notification tables that
  exist in `src/db/schema` were never considered, including `storage_pending_purge`, `chat_attachments`,
  `candidate_documents_vault`, `sign_documents` and every `*_export_jobs` table. `webhook_deliveries` has
  a matrix entry and **does not exist in the database at all**. Table size there is a function of seed
  data, not production growth, so the gate can only fail if the seed happens to push an undecided table
  over 1 MB.

Four of these gates carry an explicit anti-vacuity floor, and all four floors pass. **None of them
measures the governed set** — which is the empty thing. The single highest-value fix is one line per
gate: print the governed count, not just the corpus size.

---

## Where code correctness ends and operator action begins

**Code side — closed by this ticket:**
- key minting, parsing and both guards built on it, including the region-prefixed shape;
- size + magic-byte validation, name and folder sanitization;
- multipart idempotency, with the arbiter proven inferable by `check:conflict-targets`;
- quarantine state machine and the pre-mint authorization recheck at the generic seam;
- bounded transforms; the deletion ledger and the GDPR manifest/legal-hold path.

**Operator side — I cannot evidence any of this from code:**
- **whether `R2_KEY_PREFIX` is set in any deployed region.** My fix makes the code correct either way,
  but which branch is live is a deployment fact. If it *is* set, this was an exploitable cross-tenant
  read in production and the fix is urgent rather than defensive.
- the private-bucket cutover and the legacy-key backfill (ticket 34). Until the backfill lands, legacy
  `<folder>/…` keys with no organisation still exist; they are defended by the sensitive-folder
  fallback, which is a **compensating control, not a guarantee** — a legacy key in a *non*-sensitive
  folder whose owner row RLS hides resolves to `null` and is served.
- that the bucket has no public read policy and no CORS `*`. `setup-r2-buckets.ts` contains an
  `ensurePublicReadCors` function; whether it was ever run against the live bucket is deployed evidence.
- retention/detach actually executing on schedule. `check:retention-coverage` reads table sizes on a dev
  branch and proves nothing about production.

---

## Commands run

| Command | Exit | Number produced |
|---|---|---|
| `pnpm check:public-object-urls` | 0 | 3,649 files, 9 refs, 9 allowlisted |
| `pnpm check:multipart-contracts` | 0 | 550 controllers, 9 governed handlers |
| `pnpm check:retention-coverage` | 0 | 14 of 944 tables |
| `pnpm check:log-secrets` | 0 | 3,645 files, 1,000 log lines |
| `pnpm check:conflict-targets` | 0 | 362 calls, 158 resolved, 2 ratcheted defects (neither mine) |
| `pnpm check:tenant-isolation` | 0 | 931/931 |
| `pnpm check:authz-deny` | 0 | 924/3,235 (29%) |
| `pnpm typecheck` | 0 | 0 errors |
| `pnpm check:spec-typecheck` | 0 | passed |
| `jest --testPathPattern="modules/(storage\|notifications\|email\|push\|gdpr)/"` | 0 | 95 suites, 875 tests |
| `jest --testPathPattern="storage-key-region-prefix"` | 0 | 9 tests |
| `jest --testPathPattern="security/upload-controls"` | 0 | 15 tests |

**`test/security/upload-controls.spec.ts` is GREEN, not red.** The brief said it was failing because
`uploadToKey` moved to the service; commit `4b91903e` ("test(security): drive four security specs
instead of matching source text") already converted it from source-text matching to driving the real
code. I did not edit it.

## Files changed

- `src/modules/storage/storage-key.ts` — region-prefixed key parsing (the defect fix)
- `src/modules/storage/storage-key-region-prefix.spec.ts` — new, 9 tests

## Cross-territory findings (not fixed)

1. **12 of 15 signed-URL minting sites are outside my territory and unverified** — chat, support, 4 HR
   controllers, payroll, 3 e-sign services. `sign-public.service.ts` mints from a public envelope path
   and should be looked at first.
2. **28 dead `err.code === "23505"` branches repo-wide** — inventory 3, hr 3, crm 2, billing 2, e-sign 1,
   4 under `src/`. Each is a de-duplication that has never once fired.
3. **Two open 42P10 defects** from `check:conflict-targets`: `billing/core/versioned-catalog.service.ts:182`
   and `hr/time/rosters.service.ts:41` (the latter needs a migration, not just a predicate).
4. **`resolveFileOwner`'s seven leading-wildcard ILIKEs** on every download — mine, but the fix is a
   schema projection that would collide with ticket 34.
