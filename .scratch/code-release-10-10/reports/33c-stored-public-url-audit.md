# 33c — What is actually STORED: auditing the persisted URLs, not the code that mints them

**Ticket:** 33, box 7 — *"No upload path mints a permanent public URL. Verify existing stored URLs,
not just the code that creates new ones — a backfill is part of this ticket if any remain."*

**Verdict: box 7 STAYS OPEN.** The code half is clean and I re-verified it. The stored-data half
**cannot be answered from any database this session may touch**, and saying otherwise would be the
fourth falsification of this ticket. What I did instead was make the two instruments that will
answer it actually capable of answering it, and close one live serving path that handed back a
stored permanent URL.

Everything below is PROVEN unless marked INFERRED.

---

## 1. The headline: the scratch databases contain no URLs at all

I ran a catalog-driven scan for `https?://` across **every** `text`, `varchar`, `bpchar`, `json`,
`jsonb`, `xml`, `text[]` and `varchar[]` column of every ordinary table in every non-system schema,
on eight scratch databases. Not a name-based scan — every URL-capable column, whatever it is called.

| database | journal position | columns scanned | columns with ANY non-null value | **columns containing `https?://`** | errors |
|---|---|---|---|---|---|
| `scratch_perf_seed` | 665 / 671 | 5,996 | 451 | **0** | 0 |
| `scratch_t23_http` | 667 / 671 | 6,002 | 493 | **0** | 0 |
| `scratch_t41_gates` | 668 / 671 | 6,002 | 33 | **0** | 0 |
| `scratch_t29` | schema only | 5,997 | 16 | **0** | 0 |
| `scratch_boot_a` / `_c` / `_d` | 645 / 671 | 5,991 | 16 | **0** | 0 |
| `scratch_t44c_bucket` | fixture | 6 | 4 | **0** | 0 |

`scratch_perf_seed` scan: **4.5 seconds, exit 0**.

**The scan is not broken — it is bite-proved.** On a purpose-built fixture (`scratch_t33b_bite`) it
found all four planted shapes: a plain `text` column, a URL inside a `jsonb` blob, a URL inside an
`<img src>` in an HTML body, and a URL inside a `text[]`.

### What this does and does not establish

It establishes that **no scratch database can answer the question**, because none of them contains
a single URL of any kind — not ours, not a customer's website, nothing. Only 451 of 5,996 columns
in the largest seed hold any value at all. And every table that ever held a minted public URL is
**empty** in it:

```
public.kb_sources                0 rows
build.feedbucket_attachments     0 rows
build.feedbucket_submissions     0 rows
public.payslip_publications      0 rows
public.chat_attachments          0 rows
```

A seeded database answers questions about the seeder. **It cannot answer "what did production write
before the minting was deleted".** Reporting "0 found, box closed" off this scan would be exactly the
mistake this ticket has already made three times. The production number is **UNKNOWN and remains
UNKNOWN**; the only instrument that can produce it is a run against the real database.

Coverage note, stated rather than hidden: `scratch_perf_seed` is at **665 of 671** journal entries
and does **not** have `kb_page_attachments` (created by `1042`). `scratch_t41_gates` is at 668/671
and does have it — it was in the 6,002-column scan above, and it is empty.

---

## 2. The minting paths — every place a stored object gets an address

Enumeration method: `check:public-object-urls` (which polices every reference to a public base) plus
a concept-driven sweep of both repos across upload responses, download/preview endpoints, email
bodies, notification payloads, exports, outbound webhooks, PDF renders, avatar/logo serving, KB and
chat attachments, e-sign documents, rich-text editors and the `@Public()` surface.

### (a) Presigned and expiring — the normal path
`StorageService.getFileUrl` is the **only** presigner in the repo (`@aws-sdk/s3-request-presigner`,
default `expiresIn = 3600`, schema-capped at 60–86,400s). Everything that returns an address to a
client goes through it: `/storage/download`, chat attachments (3600s), e-sign preview / final PDF /
certificate, payroll payout batches, HR onboarding / exit / performance documents (300s), the
`@Public()` KB attachment endpoint (3600s, token-gated), multipart part URLs (short TTL).

### (b) Permanent public — exactly one, and it is not tenant data
`src/modules/email/branding.ts:45-49` — `getEmailLogoUrl()` builds
`${NEXT_PUBLIC_R2_PUBLIC_URL}/${EMAIL_LOGO_PATH ?? "email-assets/logo-v2.png"}`, rendered as an
`<img src>` in every email (`templates/base.ts:39`). **Verified by reading it, not taken on report:**
no organisation id, no uploaded key and no tenant value reaches it. An email client cannot present a
presigned URL, so this is a legitimate exception — but it has an operator consequence nobody had
recorded, see §5.

### (c) Application route — served by our own authenticated API
`/storage/image`, `/storage/download?attachment=1`, and the frontend's `/api/media/image?key=…`
(`frontend/lib/utils.ts:37`). These stream bytes; no address leaves the system.

### (d) Bare object key — what is persisted
Every upload result now returns a key, not a URL, and every writer persists the key:
`kb_sources.file_url`, `feedbucket_attachments.file_url`,
`feedbucket_submissions.screenshot_url`, `payslip_publications.pdf_url`, `chat_attachments.file_url`,
`organizations.logo` / `.favicon`, `users.image`, and the ~30 `*_file_key` columns.

**Gate re-run at head this session:** `pnpm check:public-object-urls` → **exit 0** (3,584 files,
9 public-base references, all 9 declared, **0** upload-result `url` fields);
`pnpm check:public-object-urls:self-test` → **exit 0**. I read all five declared files myself rather
than trusting the allowlist reasons.

### What this method MISSES — stated, not glossed
1. **Addresses assembled at runtime from tenant-authored templates.** `hr_document_templates.content_json`,
   `sign_settings.branding_json`, notification templates: the template is data in the database, and no
   source scan can see it.
2. **The frontend still allows permanent public R2 URLs to render.** `frontend/next.config.ts:66`
   (`img-src … https://*.r2.dev`) and `:140` (`remotePatterns` `**.r2.dev`), plus `proxy.ts:38,50`.
   `NEXT_PUBLIC_R2_PUBLIC_URL` is referenced **nowhere** in frontend source — only these wildcards keep
   a legacy stored public URL renderable. Cross-territory; see §5.
3. **Dynamic column access.** `storage-key-catalog.ts` and the GDPR export fetchers move address
   columns by `Object.entries` / spread without ever naming them; a name-based grep is structurally
   blind to those.
4. **JSONB contents.** I could infer from writer call sites which JSONB columns *can* carry an
   address; only a data query proves which *do*. That is §1's job, and §1 had no data to work on.
5. The gate scans `src/` only — not `migrations/`, `scripts/`, `test/`, or the frontend.

---

## 3. The instruments were not capable of answering the question. Both are now.

### 3.1 `scripts/backfill-public-object-urls.mjs` found 1 of 6 planted leaks — and exited 0

The ticket names this line as the evidence that would close box 7:

> `DRY RUN — ROWS HOLDING A PUBLIC URL: 0 across 0 column(s); ROWS REWRITTEN: 0; UNVERIFIABLE COLUMNS: 0`, with **exit 0**

**That line was not sound.** Bite-proved on `scratch_t33c_gap`, a fixture holding six leaked object
URLs in the shapes this codebase actually produces:

```
public.kb_sources.file_url: 1 row(s) hold a public URL
DRY RUN — ROWS HOLDING A PUBLIC URL: 1 across 1 column(s); ROWS REWRITTEN: 0; UNVERIFIABLE COLUMNS: 0
EXIT=0
```

**One of six**, `UNVERIFIABLE COLUMNS: 0`, exit 0. The five it missed:

| miss | cause |
|---|---|
| URL inside `kb_pages.content` (jsonb) | scan covered only `text`/`varchar`/`bpchar` |
| URL inside `hr_documents.metadata` (jsonb) | same |
| URL inside `gallery.image_urls` (`text[]`) | same |
| `<img src>` inside a rich-text `text` body | `LIKE '<base>/%'` requires the value to *start* with the base |
| URL under a second base | `R2_KB_PUBLIC_URL` is unset in this repo's `.env`; the script errors only when **all** bases are missing, never when one is |

Measured on a database at head: **501 of 5,996 URL-capable columns (479 jsonb + 22 `text[]`) were
outside the scan entirely** — 8.4% of the surface, and the 8.4% where an address hides inside a blob.

**Fixed** (commit `c80dadc5`):
- `json`/`jsonb`/`xml`/`text[]`/`varchar[]` are now scanned.
- A contained-but-not-whole occurrence is a separate **EMBEDDED** finding, counted per column and
  **never rewritten** — replacing an `<img src>` with a bare key breaks the render, and which JSON
  path is an object address is not knowable from the catalog. It exits **3**.
- The whole-value test is now a regex anchored at both ends, so a rich-text body that merely *starts*
  with a URL is no longer eligible for wholesale replacement by a key.
- Missing base env vars are announced; R2's intrinsic `https://pub-<32 hex>.r2.dev/` host shape is
  matched with or without them.

Re-run on an identical fresh fixture (`scratch_t33d_fixed`): **5 of 6 from env alone, exit 3**; all 6
with `--base` for the custom domain. `--apply` rewrote 2 to their object keys (`%20` → space,
`?query`/`#fragment` stripped), left the external customer URL untouched, and a second `--apply`
rewrote **0**.

**Exit codes now: 0 clean · 1 config error · 2 a column this role could not read (RLS) · 3 a public
URL survives embedded.** The old warning still governs: **exit 2 means "not visible to this role",
never "nothing found".**

### 3.2 The backfill is now a migration, so it stops being an owed operator action

`migrations/1047_t33_backfill_public_object_urls.sql` (+ journal entry idx 803, when
1803000010122, + `migrations/rollback/1047_….down.sql`), commit `e4f46d1a`.

The ticket has carried *"run the backfill against the real database — **NOT RUN** by any agent, on
any database, ever"* as an owed step. An operator action that has to be remembered is one that gets
skipped. 1047 runs it at deploy instead, catalog-driven over every text column of every table.

- Rewrites a value that **is**, in its entirety, `https://pub-<32 hex>.r2.dev/<key>` back to the key,
  percent-escapes decoded, `?query`/`#fragment` stripped. Skips columns participating in a primary
  key, unique constraint or foreign key, and generated/identity columns.
- **Aborts with an exception** naming any table it reads through an RLS policy it does not bypass,
  rather than reporting a clean pass over rows it never saw.
- Counts and announces EMBEDDED occurrences (`RAISE NOTICE` / `RAISE WARNING`) without rewriting them.
- Idempotent, and a no-op costing nothing where there is nothing to fix.

**Documented gaps, in the file's own header:** SQL cannot read `NEXT_PUBLIC_R2_PUBLIC_URL`, so a
public base served from a **custom domain** is not matched — the script with `--base` remains the
instrument there. And it does not make any object unreachable.

**Proofs.**
- `scratch_t33c_gap`: pass 1 → `held=5 rewritten=1 EMBEDDED-REMAINING=4`, exit 0. Pass 2 after adding
  a `%20` key, an `http://` + `?x=1#frag` key, a bare base with no key, and a non-`pub-<hex>` r2.dev
  host → rewrote 2 more, **left the pass-1 row untouched** (idempotent), decoded `%20` to a space,
  stripped the query and fragment, and did not touch the other two or the external customer URL.
- `scratch_t33e_head` — a `pg_dump --schema-only` of the 668/671 schema, **1,027 tables**, real column
  types, partitions and RLS: **exit 0, 1,026 tables scanned, 0 rewritten, 0.69 s**. This is what
  proves it is safe to put in the deploy path.

The **down file is a deliberate no-op with a header saying why**: reversing it would re-mint
permanent public URLs for tenant-private objects — the original defect, restored by a script whose
name says "rollback" — and it could not be done correctly anyway, because 1047 cannot tell a value it
rewrote from a value that was already a key. Restore from a backup instead.

---

## 4. One live path was still handing back a stored permanent URL

`src/modules/storage/storage-vault.controller.ts` (`POST /hr/recruitment/candidates/:id/vault/:docId/url`):

```ts
let signedUrl = doc.fileUrl;                       // the RAW STORED VALUE
if (doc.s3Key && this.storage.isConfigured()) {
  try { signedUrl = await this.storage.getFileUrl(...) }
  catch { signedUrl = doc.fileUrl; }               // and again on any failure
}
return { ...doc, signedUrl };
```

`check:public-object-urls` is correctly green over this — it **mints** nothing. But on a presigning
failure, an unconfigured store, or an empty `s3_key`, it returns
`candidate_documents_vault.file_url` to the client **under the name `signedUrl`**. Where that legacy
value is a permanent public URL, the endpoint serves exactly what box 7 is about. This is the shape
the box's own wording warns about: auditing the code that creates new URLs is not the same as
auditing what is already stored, and it is not the same as auditing what is *served* either.

**Fixed** (commit `e6f4c62a`): a legacy stored URL is parsed back to its key with the existing
`getFileKeyFromUrl` and **that** is presigned; when no key can be recovered or presigning fails,
`signedUrl` is `null`. The declared return type already allowed `null` and the endpoint has **no
caller in the frontend**, so nothing changes shape.

`storage-vault-signed-url.spec.ts` (4 tests) uses the **real** URL parser rather than a stub, because
a stub returning its input would pass while the controller handed the public URL straight back.
**Bite-proved: 3 of its 4 tests turn red against the pre-fix controller**, green after.

**Residue I did not change:** the handler still returns `{ ...doc }`, so `file_url` and `s3_key` go
to the client on every call. Narrowing that is a response-contract change against a `VaultDocument`
interface the frontend declares by cast, not by validation, so it is reported rather than done.

---

## 5. Operator actions — what code cannot do

Already on the register and **unchanged**:

- **R-2 — remove public access from the buckets named by `R2_BUCKET_NAME` and `R2_KB_BUCKET_NAME`**
  in the Cloudflare console. No code substitutes for it. Until it is done, every object already at a
  public r2.dev address stays fetchable by anyone who copied one, whatever the columns say.
- **R-2b — a bucket-side listing diffed against `kb_page_attachments.file_key`**, for objects orphaned
  by KB trash purge *before* commit `0edadaa0`. Historical cleanup only; the ongoing leak is fixed.

**R-1 changes status.** It is no longer "an operator must remember to run a script": migration 1047
performs it at the next deploy. It has still **NOT run against production** — that is a fact, not a
claim of completion — but it no longer depends on anyone remembering. What remains operator-side for
R-1 is only the *verification pass* and the custom-domain case:
`node scripts/backfill-public-object-urls.mjs --url <owner DSN> [--base <custom public domain>]`,
run **as the database owner**, reading the exit code: **0** clean · **2** not visible to this role ·
**3** a public URL survives embedded in a value no backfill may rewrite.

**NEW — two operator hazards nobody had recorded:**

1. **Making `R2_BUCKET_NAME` private breaks the logo in every outbound email.**
   `getEmailLogoUrl()` builds its `<img src>` against `NEXT_PUBLIC_R2_PUBLIC_URL`, which is the public
   base of that same bucket, and an email client cannot present a presigned URL. Executing R-2 without
   first moving `email-assets/logo-v2.png` to a separate public asset bucket or a CDN silently breaks
   branding on every email the platform sends. **This must be sequenced before R-2, not discovered
   after it.** Owner: infrastructure operator, jointly with whoever owns `src/modules/email`.
2. **`src/scripts/setup-r2-buckets.ts:79` calls `ensurePublicReadCors` on both buckets** and prints
   guidance telling the operator to *enable* public access on the KB bucket. Re-running the setup
   script after R-2 re-applies public-read CORS. CORS is not itself public access, so this does not
   undo R-2 on its own — but the script's printed instructions contradict R-2 and should be corrected
   when R-2 is executed.

**Cross-territory, not fixed here:**

- **Frontend (`frontend/next.config.ts:66,140`, `frontend/proxy.ts:38,50`)** still allowlists
  `https://*.r2.dev` in CSP `img-src` and in `next/image` `remotePatterns`. Nothing in frontend source
  reads `NEXT_PUBLIC_R2_PUBLIC_URL`; these wildcards are the only thing that keeps a legacy stored
  permanent public URL rendering. Once R-2 lands they become dead allowance that hides remaining
  leaks instead of surfacing them as broken images. Removing them would make any surviving leak
  visible immediately.
- **`idempotency_records.response_body`** caches whole response bodies, so any endpoint that returns a
  presigned URL under an `Idempotency-Key` caches an *expiring* URL and can replay it after expiry.
  Not a permanent-public leak; a correctness bug for the idempotency owner. INFERRED from the schema
  and the replay path; not reproduced.
- **`src/modules/support/core/support-ticket-membership-projection.spec.ts`** (untracked, another
  agent's in-flight file) is the sole reason `check:spec-typecheck` is red — 2 `TS2345` errors on
  `ListTicketsQuery`. It was **exit 0** earlier in this same session, before that file appeared.

---

## 6. Can the box close? No — and here is the exact residue

**Code side: clean, and cleaner than it was.** The gate is green, one live serving path that returned
a stored permanent URL is fixed and bite-proved, the backfill is now a journalled migration, and the
verification script now sees the 8.4% of columns it was blind to.

**Data side: UNKNOWN, and honestly unknowable from here.** Every database this session may touch
holds zero URLs of any kind. No count of production leakage exists, and none can be produced without
connecting to the real database, which this session must not do.

**Therefore box 7 stays open.** The closing evidence is unchanged in form but now sound in substance:

1. A confirmation run of `scripts/backfill-public-object-urls.mjs` as the **database owner** ending in
   `ROWS HOLDING A PUBLIC URL: 0 …; ROWS WITH AN EMBEDDED PUBLIC URL: 0 …; UNVERIFIABLE COLUMNS: 0`
   with **exit 0**. All three zeros are required. Exit 2 closes nothing; exit 3 closes nothing.
2. The deploy log line from 1047: `1047 SUMMARY … rows_rewritten=n …`, so the number that had leaked
   is on the record.
3. An unauthenticated `curl -I` of a previously-public object URL returning **401/403** where it
   previously returned 200 — the only proof the objects themselves are unreachable.

**Owner: infrastructure operator.** **Blocker: INFRA** — credentials and a console this effort does
not hold and must not use. Deadline unchanged: R-1/R-2 **2026-09-08, before cutover**; R-2b 2026-09-30.
Add the email-logo sequencing (§5, item 1) as a prerequisite of R-2.

---

## 7. Commands run, exit codes, numbers

| command | exit | number |
|---|---|---|
| `pnpm typecheck` (after the TS change) | **0** | 0 `error TS` |
| `pnpm check:spec-typecheck` | **0** before, **2** after another agent's untracked spec appeared | 2 errors, both in `support/core/support-ticket-membership-projection.spec.ts`; **0 in mine** |
| `pnpm check:migration-rollback` | **0** | 671 migrations scanned, all type-name checks passed |
| `pnpm check:migration-discipline` | **0** | — |
| `pnpm check:migration-ledger` | **0** | 671 journal entries, no orphan/duplicate/unreachable |
| `pnpm check:public-object-urls` | **0** | 3,584 files · 9 references, 9 declared · 0 upload-result `url` fields |
| `pnpm check:public-object-urls:self-test` | **0** | all checks true |
| `jest --runInBand --testPathPattern="src/modules/storage"` | **0** | 19 suites / **209** tests |
| `jest --runInBand --testPathPattern="storage-vault-signed-url"` | **0** | 4/4; **bite: 3 of 4 red** against the pre-fix controller (exit 1) |
| URL scan, `scratch_perf_seed` | **0** | 5,996 columns · 451 non-null · **0** with `https?://` · 0 errors · 4.5 s |
| 1047 on `scratch_t33e_head` (1,027 tables) | **0** | 1,026 tables scanned · 0 rewritten · 0.69 s |
| old backfill on `scratch_t33c_gap` | **0** | **1 of 6** planted leaks found |
| fixed backfill on `scratch_t33d_fixed` | **3** | **5 of 6** from env alone; 6 of 6 with `--base`; `--apply` rewrote 2, second `--apply` rewrote 0 |

Databases used: `scratch_perf_seed`, `scratch_t23_http`, `scratch_t41_gates`, `scratch_t29`,
`scratch_boot_a/c/d`, `scratch_t44c_bucket` (read-only); `scratch_t33b_bite`, `scratch_t33c_gap`,
`scratch_t33d_fixed`, `scratch_t33e_head` (created by me). **No R2 bucket was contacted. `DATABASE_URL`
was never used, and no cited-evidence database was written to or dropped.**

## 8. Files changed

```
BE migrations/1047_t33_backfill_public_object_urls.sql               (new)
BE migrations/rollback/1047_t33_backfill_public_object_urls.down.sql (new)
BE migrations/meta/_journal.json                                     (idx 803, when 1803000010122)
BE scripts/backfill-public-object-urls.mjs
BE src/modules/storage/storage-vault.controller.ts
BE src/modules/storage/storage-vault-signed-url.spec.ts              (new)
```

Commits (backend repo): `e4f46d1a`, `c80dadc5`, `e6f4c62a`.
