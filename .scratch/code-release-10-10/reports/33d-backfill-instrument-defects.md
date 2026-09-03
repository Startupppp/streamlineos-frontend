# 33d — the backfill instruments were defective, and 1047 would have failed the deploy

Sixth pass on ticket 33, box 7. Predecessors: `33-uploads.md`, `33b-storage-url-contract.md`,
`33c-stored-public-url-audit.md`.

**Box 7 remains OPEN.** Nothing in this pass changes that, and nothing in this pass could: the question
"what does production store" needs a production database read or a bucket listing, and this session may do
neither. What this pass changes is that the three instruments which will eventually answer it — the
migration, the script and the runbook — were each wrong in a way that would have produced a confident
wrong answer.

Databases measured, all local, all `scratch_*`; the shared remote was never connected to and no R2 bucket
was ever contacted.

---

## 1. Both instruments wrote an unreachable key

`StorageService.publicUrlFor` (deleted; recovered from `git show bafd606f:src/modules/storage/storage.service.ts`)
built its URL as:

```ts
const publicBase = override ?? this.config.NEXT_PUBLIC_R2_PUBLIC_URL;
return publicBase ? `${publicBase}/${key}` : key;
```

No trailing slash is stripped from `publicBase`, and `env.validation.ts` accepts one (`optionalUrl` is
`z.string().url()`, which is happy with `https://host/`). So any deployment whose base ended in `/` minted
`<base>//<key>`.

Both the script and migration `1047` took everything after the **first** slash, so such a value was rewritten
to `/<key>` — a leading slash that no object key in this codebase ever carries (`sanitizeFolder` /
`sanitizeFileName` cannot produce one). That is worse than the leak it was fixing: the row then points at an
object that does not exist, and `1047`'s down file is a deliberate no-op, so it is not reversible.

Measured on the fixture, row D:

| | before | after |
|---|---|---|
| stored | `https://pub-<32 hex>.r2.dev//kb/9f5-b.pdf` | |
| 1047, pre-fix | | `/kb/9f5-b.pdf` |
| script, pre-fix | | `/kb/9f5-b.pdf` |
| both, post-fix | | `kb/9f5-b.pdf` |

Fixed in backend commit `998d386d` (`regexp_replace(tail, '^/+', '')` in `__t33_object_key`; a new `tailToKey`
helper in the script).

## 2. 1047 called a constraint-held whole URL "EMBEDDED"

`1047` refuses to assign a column that participates in a primary key, unique constraint or foreign key, or
that is generated or identity. That refusal is **correct**: rewriting `…q1%20report.pdf` and `…q1 report.pdf`
onto one key inside a unique constraint would raise `23505` and abort the whole deploy.

The bug was the label. Such a row was counted in `rows_with_an_EMBEDDED_public_url_remaining` and announced by
a WARNING reading *"EMBEDDED inside a larger value (rich text, jsonb or an array)"*. It is not inside anything.
An operator triaging that line goes looking for an `<img src>` that does not exist, and the row — a bare, whole,
leaked URL — is never dealt with.

This is a live shape. Listing every p/u/f-constrained `text`/`varchar`/`bpchar` column in the head schema gives
**1,855**, of which 38 are URL-ish, and one is exactly this:

```
src/db/schema/hr/termination-relational-records.ts:61   legacyUrl: text("legacy_url").notNull(),
                                       :72-76   unique("uniq_termination_supporting_documents_url")
                                                  .on(organizationId, terminationId, legacyUrl)
```

Fixed in `998d386d`: a third catalog aggregate counts that class on its own, the per-table NOTICE is now
`held=… rewritten=… CONSTRAINT-HELD=… EMBEDDED-REMAINING=…`, the summary gained `rows_CONSTRAINT_HELD=`, and
the class gets its own WARNING naming the tables and the actual remediation (the script does assign such
columns).

Fixture, `public.uniq_urls`:

```
pre-fix    held=1 rewritten=0 EMBEDDED-REMAINING=1
post-fix   held=1 rewritten=0 CONSTRAINT-HELD=1 EMBEDDED-REMAINING=0
```

## 3. 1047 as journalled would have aborted and rolled back the deploy

`1047` aborts on any table it reads through a row-level security policy it does not bypass, rather than
reporting a clean pass over rows it never saw. That is the right behaviour and it is the single thing this
ticket most cares about. What nobody had checked is whether the abort is **reachable** on this schema.

It is. At head, measured on `scratch_perf_seed`:

```
RLS enabled: 981 tables      FORCE ROW LEVEL SECURITY: 1 table
             public.external_effect_ledger   (migrations/0474_external_effect_ledger.sql:27)
```

`FORCE` makes the table's own **owner** subject to the policy. So a migration role that merely owns the
database is filtered, `row_security_active()` returns true, and `1047` raises.

Reproduced on `scratch_t33f_force`, whose objects are owned by a `NOSUPERUSER NOBYPASSRLS` role:

```
row_security_active(external_effect_ledger) -> t
ERROR: 1047 aborted: 1 table(s) are read through a row-level security policy this role does not
       bypass … public.external_effect_ledger
exit 3, transaction rolled back, kb_sources still holding every leaked URL
```

The pre-fix message ended *"Re-run as the database owner."* — precisely wrong for the only case that reaches
it. It now names BYPASSRLS, names the table and the migration that set FORCE, and carries the probe.

**The pre-flight probe, to be run as the migration role before deploying.** Empty result means `1047` will
proceed; non-empty means it will fail the deploy:

```sql
SELECT n.nspname, c.relname
FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE c.relkind = 'r' AND c.relrowsecurity AND row_security_active(c.oid);
```

Two things deliberately **not** done. The abort was not downgraded to a warning: that would put "nothing to
do" and "cannot see it" back on the same line of output, which is the failure mode this whole ticket exists to
prevent. And `FORCE` is not toggled off around the scan: a migration that disables a security control and
depends on its own rollback to restore it is a worse defect than the one it repairs.

## 4. What was verified rather than assumed

**The set of public bases is complete.** Earlier passes carried "a base this run was never told about" as an
open worry. Against the historical minting code: `publicUrlFor` used `override ?? NEXT_PUBLIC_R2_PUBLIC_URL`,
and the only callers that ever passed an override were `kb-media.service.ts` and `kb-sources.service.ts`, both
with `R2_KB_PUBLIC_URL`. `BASE_ENV_VARS` names exactly those two. The per-region
`REGION_<KEY>_R2_PUBLIC_URL` / `_R2_KB_PUBLIC_URL` read at `region.config.ts:244-249` are **not** a third
source: `RegionStorageConfig.publicUrl` and `.kbPublicUrl` have zero consumers anywhere in `src/`. The
custom-domain gap (SQL cannot read an env var, so `1047` matches only the intrinsic `pub-<32 hex>.r2.dev`
shape) is the only remaining one and was already stated.

## 5. Read paths: the four "fixed" columns are still served verbatim

An audit of every `*_url` column in the Drizzle schema (74 enumerated, 47 object-storage-shaped, 52 read sites
followed) found **21 handlers** that return a stored object pointer with no presign and no expiry. Seven were
verified against source by hand, including all four columns box 7 names as fixed:

| site | column |
|---|---|
| `kb/wiki/kb-sources.service.ts:51` | `kb_sources.file_url` |
| `payroll/payout/publishing.service.ts:69` | `payslip_publications.pdf_url` |
| `feedbucket/feedbucket-submissions.service.ts:85` (and `:41`, a negative projection) | `feedbucket_submissions.screenshot_url` |
| `hr/recruitment/recruitment-candidate-vault.service.ts:35-45` | `candidate_documents_vault.file_url` + `s3_key` |
| `agent-access/agent-access.service.ts:93 -> :157` | `ticket_attachments.file_url` |
| `cron/cron-recruitment.service.ts:74 -> :148` | `candidate_offers.offer_letter_url`, emailed externally |
| `feedbucket/feedbucket-ai.service.ts:368-369` | `screenshot_url`, persisted into ticket HTML |

**Why this matters more than it looks.** The stated reason to make the buckets private was "somebody may have
copied a URL". The real reason is that these endpoints keep handing the pointer out. Before the backfill they
hand out a permanent public URL; after it they hand out the bare object key — and while the bucket is public,
a key plus the public base **is** the permanent URL. So the backfill alone does not close these surfaces, it
only changes the shape of what is served. It also means the discipline box 4 claims (authorization rechecked
immediately before minting a *short-lived* URL) is bypassed for these columns entirely: what they return never
expires, so it outlives revocation, offboarding and org switch.

Registered as **R-3** on the ticket. All eight owning modules are other agents' territory; reported, not fixed.

Two collateral-damage risks from running `1047`, both the same shape as the email-logo hazard:
`candidate_offers.offer_letter_url` is client-supplied and emailed to an external candidate (rewriting it to a
key breaks their link, and an email client cannot use a presigned URL); and `feedbucket-ai` copies
`screenshot_url` into `<img src>` inside persisted ticket HTML, which before `1047` manufactures fresh
**embedded** leaks — the one class neither instrument will ever rewrite.

## 6. Fixed in territory

`storage-vault.controller.ts` ended `return { ...doc, signedUrl }`. The fifth pass made it presign instead of
falling back to the stored `file_url`, but the value it replaced still went back to the caller in the spread,
along with the raw `s3_key`. No assertion on `signedUrl` can see that. The response is now an explicit
`VaultDownloadResponse` carrying neither column (backend `856f7fa3`). Safe as a contract change: grep over the
whole frontend package finds no source reference to the route or to `signedUrl`, only the generated
`contracts/openapi.json`.

Bite-proved in a `git archive HEAD src` copy under the scratchpad, never in the shared tree. Restoring the
spread turns the new test red with the received body showing
`"fileUrl":"https://pub-…r2.dev/org-1/candidate-vault/passport.pdf"` and `"s3Key":"…"` — **while the other
four tests still pass**, which is exactly why the presign fix read as complete.

## 7. Commands run

| command | exit | number |
|---|---|---|
| `pnpm check:public-object-urls` | 0 | 3,591 files · 9 references, 9 declared · 0 upload-result `url` fields |
| `pnpm check:public-object-urls:self-test` | 0 | — |
| `pnpm check:migration-discipline` | 0 | — |
| `pnpm check:migration-rollback` | 0 | 671 scanned |
| `pnpm check:route-classification` | 0 | ALL ROUTES CLASSIFIED |
| `pnpm check:spec-typecheck` | 0 | — |
| `pnpm typecheck` (8 GB, via `heavy.sh`) | 0 | — |
| `jest --runInBand --testPathPattern="src/modules/storage"` | 0 | 19 suites / 210 tests |
| `jest … --testPathPattern="storage-vault"` | 0 | 5 tests (1 new) |
| the same spec against the isolated pre-fix controller | **1** | 1 failed / 4 passed — the bite |
| `1047` on `scratch_t33f_mig` (adversarial fixture), pass 1 | 0 | scanned 7 · held 9 · rewritten 7 · CONSTRAINT-HELD 1 · EMBEDDED 1 |
| `1047` on `scratch_t33f_mig`, pass 2 | 0 | rewritten **0** — idempotent |
| `1047` on `scratch_t33f_head` (clone of the 668/671 schema) | 0 | **1,026 tables, 0 rewritten, 1 s** |
| `1047` on `scratch_t33f_force` as NOSUPERUSER NOBYPASSRLS owner | **3** | aborted, rolled back, 0 rewritten |
| script dry run on `scratch_t33f_proof` | 3 | held 8 · embedded 3 · unverifiable 0; full before/after `diff` empty |
| script dry run `--base <custom>` | 3 | held 9 — the custom-domain row only appears with `--base` |
| script `--apply --base` | 3 | rewritten 9 |
| script `--apply --base`, second run | 3 | rewritten **0** — idempotent |

Fixture: 12 rows across 4 schemas covering plain / `%20` / query+fragment / double-slash / external-customer /
already-a-key / NULL / unique-constrained / no-PK / composite-PK / `<img src>` in HTML / jsonb / `text[]` /
custom-domain / FORCE-RLS.

`scratch_perf_seed`, `scratch_t33e_head`, `scratch_boot_*` and `scratch_t33c_gap` were read but not written;
the working databases (`scratch_t33f_*`) and the role `t33_owner` are this pass's own.

## 8. What is still not known, and cannot be from here

The production number. Every database available to this session is seeded or synthetic, and the tables that
ever held a minted public URL are empty in all of them — a fact `33c` already established and this pass does
not improve on. Box 7 stays open.

The operator runbook, with the new pre-flight step first, is on the ticket under box 7, sixth pass, (9).
