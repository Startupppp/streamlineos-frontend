# 44c — the org purge stops deleting KB objects from the wrong bucket and calling it verified

Repo: `streamlineos-backend`. Closes the two items report 44b left as "needs an owner",
plus the broken surveys isolation spec.

Territory granted: `src/modules/organization/core/lifecycle/organization-purge-adapters.ts`,
`src/modules/storage/storage-key-catalog.ts`,
`src/db/schema/common/storage-pending-purge.ts`, a new migration, and
`src/modules/surveys/survey-logic-tenant-isolation.spec.ts`.

| SHA | What |
|---|---|
| `d152d73f` | Item 2 — the surveys isolation stub, repaired and made to bite |
| `0a2f4778` | migration 1045 + the `bucket` column on the schema |
| `9a0d9e74` | the source fix (catalog, adapter, worker, pending-purge service, sweep) |
| `eb59286d` | the two proof specs |
| `a87983e5` | APP_CONFIG in the second testing module that builds the purge worker |

All five are on the current branch and are interleaved with other lanes' commits; the
working tree and index are shared, so verify with `git show --stat <sha>`.

---

## 1. The defect — a wrong-bucket delete that verifies itself

`organization-purge-adapters.ts:206` called `deleteFile(orgId, key)` and then
`fileExists(orgId, key)`, **both with no bucket override**. Its keys come from
`enumerateFileKeyColumns`, whose `a.attname LIKE '%\_key'` predicate (plus the
`file_url` / `storage_url` / `document_url` name list) sweeps in three columns whose
objects were uploaded with `R2_KB_BUCKET_NAME` as the override:

| Column | Written by | Bucket |
|---|---|---|
| `public.kb_sources.file_key` | `kb-sources.service.ts:126` | KB |
| `public.kb_sources.file_url` | same insert — `fileUrl: result.key`, an object KEY, not a URL | KB |
| `public.kb_page_attachments.file_key` | `kb-media.service.ts:128` | KB |

For one of those keys the purge deleted from the DEFAULT bucket (an S3-compatible
delete of an absent key answers SUCCESS), then confirmed the object ABSENT from the
DEFAULT bucket (it was never there), and reported
`All N object-storage key(s) deleted and verified absent`. **The verification step is
what made it convincing.** The object survives in the KB bucket after an organisation
purge — a data-retention and privacy failure, not an orphan.

`kb_sources.file_url` is a **fourth** column report 44b did not name. It holds the same
value as `file_key` and is matched by `enumerateFileKeyColumns` under the URL name list,
so it was in the same sweep.

### Why `purpose` cannot fix it, confirmed

Report 44b's own fail-closed `purpose -> bucket` map is correct for the sweep and cannot
be correct here: the adapter writes **one** purpose, `"org-purge"`, over keys drawn from
every file-key column in the schema. Any single entry for it is wrong for one bucket or
the other. That is not an argument against the map; it is an argument that this purpose
is not resolvable from a purpose.

## 2. The fix — the bucket travels with the key

**`storage-key-catalog.ts`** names the three KB columns and tags every key
`collectOrgFileKeys` returns with its role (`"default" | "kb"`). The role is emitted as a
SQL literal from a closed union, not a bound parameter, so the UNION ALL keeps `$1` for
the org id and Postgres never has to infer a parameter type in a SELECT list — the
injection-safety spec at `subject-key-pagination.spec.ts:42` still holds unchanged.
`kb_article_attachments.file_key` is deliberately **absent** from the list, for the reason
44b gave: those objects come from `POST /storage/upload` with no override, so they really
are default-bucket rows.

**`organization-purge-adapters.ts`** passes the same override to the delete **and** to the
verification. Passing it to the delete alone would be worse than passing it to neither:
the object would be removed from the KB bucket and then looked for in the default one,
which answers "absent" for a reason unrelated to the delete. `StoragePort` is widened; the
new `PurgeStorage` makes `kbBucket` a **required** property even where its value is
`undefined` — `undefined` is a resolution (a single-bucket deployment, where
`requireBucket` falls back to the default bucket and the KB uploads went there too), and
it has to be passed deliberately because forgetting it is invisible.

**`storage_pending_purge.bucket`** (migration 1045) is the row recording what only the
producer still knows. It is a **role**, not a bucket name: names differ per region and per
deployment, and an unset `R2_KB_BUCKET_NAME` legitimately resolves `kb` back onto the
default bucket, so a name would be wrong the moment either changed.

**Nullable, and what NULL means.** Existing rows have no bucket recorded and no backfill
can know the answer — the row deliberately outlives the table its key came from (see the
comment in `0741_storage_pending_purge.sql`: no FK to `organizations`, on purpose), so by
the time anyone asks, the column the key came from is gone. A `NOT NULL DEFAULT 'default'`
would be a backfill that INVENTS the answer, and would invent it wrongly for exactly the
KB rows the column exists to fix. NULL is documented in the schema, in the service and in
the migration as *"no producer recorded one"*, explicitly **not** a synonym for `default`.
A CHECK keeps NULL the only unknown.

**The consumer fails closed on it.** `listForRetry` now selects the column and the sweep
prefers it over `purpose`. `"org-purge"` is **removed** from the purpose map: a row of that
purpose with no recorded bucket is unresolvable and is left `pending` and untouched — the
same treatment 44b gave an unknown purpose, and for the same reason (`markFailed` spends
one of ten attempts and an exhausted row leaves `listForRetry` forever). Legacy rows are
not stranded permanently: the adapter's registration upsert sets `bucket = excluded.bucket`,
so a re-run of the purge for that org heals them.

### The two edits outside the named territory, and why

The registry is a set of free functions with **no injector**, so its caller has to supply
what the port cannot answer.

1. `cron-org-purge-worker.service.ts` — injects `APP_CONFIG` (exactly as
   `cron-storage-sweep.service.ts` already does) and passes
   `{ port: this.storage, kbBucket: config.R2_KB_BUCKET_NAME }`. Without this the adapter
   cannot learn the KB bucket at all and the whole fix is inert.
2. `storage-pending-purge.service.ts` (one selected column) and
   `cron-storage-sweep.service.ts` (prefer it, fail closed on NULL). Without these the
   column is **write-only** and the retry path keeps the identical defect: a failed KB key
   from the purge would be retried against the default bucket, succeed vacuously and be
   confirmed away.

Three spec files that construct the affected services gained the provider or the field;
no assertion in any of them was removed or weakened.

## 3. Proof

Neither proof spec reasons about S3 semantics, because reasoning about them is what hid
this. A minimal object store is modelled off `S3Client.prototype.send` — PUT stores,
DELETE removes, HEAD 404s when absent — the KB object is written by the **real**
`KbMediaService`, and the assertion is that after the purge the bucket the upload actually
addressed no longer holds the key. The catalog's bucket tag is read out of the SQL the
catalog itself emitted, so dropping the tag makes the fake return `default`.

`src/modules/organization/core/lifecycle/organization-purge-bucket-symmetry.spec.ts` — 11 tests:
the column→role table with two controls, a **ratchet** pinning the role list to the set of
services that upload with `R2_KB_BUCKET_NAME` (a third one fails here rather than silently
inheriting `default`), the KB end-to-end, a default-bucket control, the role recorded on
the pending-purge row, and the survival case.

`cron-storage-sweep-bucket-symmetry.spec.ts` — 2 added: a NULL-bucket `org-purge` row is
unresolvable rather than `default`, and a `kb`-recorded one is deleted from the KB bucket.

### Commands, exit codes, numbers

| Command | Exit | Result |
|---|---|---|
| `pnpm typecheck` | 0 | clean |
| `pnpm check:spec-typecheck` | 0 | spec-inclusive typecheck passed |
| `pnpm check:migration-discipline` | 0 | 669 SQL files, **0 new violations** |
| `pnpm check:cycles` | 0 | no circular dependency |
| `pnpm check:type-assertions` | 0 | 0 forced-typing escapes |
| `pnpm check:db-call-count` | 0 | all N+1 patterns classified, no regressions |
| `pnpm check:tenant-isolation` | 0 | every enumerated service mapped |
| `pnpm check:tenant-isolation:run` | 0 | **451 / 451 suites, 1861 / 1861 tests** (was 450/451, 1858/1859) |
| `jest --testPathPattern="(organization-purge-bucket-symmetry\|cron-storage-sweep-bucket-symmetry)"` | 0 | 2 suites / 17 tests |
| `pnpm check:migration-rollback` | **1** | fails on **1044**, not mine — see "not mine" below |

### Migration 1045, verified against the live catalog

Applied to a scratch database `scratch_t44c_bucket` (fresh, `0741` applied verbatim, one
pre-existing `org-purge` row inserted first). **Verified against `pg_attribute` and
`pg_constraint`, not against the file:**

- `bucket` | `text` | `attnotnull = f`
- `storage_pending_purge_bucket_check` | `contype = c` | `convalidated = t` |
  `CHECK (bucket IS NULL OR bucket = ANY (ARRAY['default','kb']))`
- applied twice, exit 0 both times (idempotent)
- the pre-existing row still reads `bucket IS NULL` — no invented backfill
- `bucket = 'vault'` rejected by the CHECK; `bucket = 'kb'` accepted
- `rollback/1045_*.down.sql` removes both (0 columns, 0 constraints after) and the forward
  re-applies

Journal: `idx 801`, `when 1803000010120` — unique, strictly increasing, and above the
2027-02-19 applied watermark. `_journal.json` was committed whole.

### Hermetic bite, surgically rather than by reverting files

`git archive HEAD src test evals package.json tsconfig*.json jest-e2e.json` into a temp dir
with `node_modules` symlinked. Control: **17 / 17 pass**.

- Drop the bucket override from **the adapter's delete and its verification only**:
  `holds("kb-files", key)` expected `false`, received **`true`** — the object survives —
  and the adapter answers **CONFIRMED** where FAILED is expected. That is the reported
  defect reproduced exactly, including the false confirmation. 2 of 11 fail; the
  default-bucket control passes, correctly.
- Put `"org-purge"` back in the sweep's purpose map and ignore the row's column: the legacy
  row is deleted from `"default-files"` where zero deletes are expected, and a `kb`-recorded
  row is deleted from `"default-files"` instead of `"kb-files"`. 2 of 6 fail.
- A coarser bite (all four source files restored to their pre-fix versions) fails 11 of 17.

Working tree re-verified clean after each plant; sandboxes deleted. **No R2 bucket was
contacted. All storage proof is unit-level.**

## 4. Item 2 — the surveys isolation spec

`pnpm check:tenant-isolation:run` was 450/451 suites, 1858/1859 tests. The single failure
was `survey-logic-tenant-isolation.spec.ts`: `this.db.select is not a function`.

**Correction to report 44b's attribution.** The breaking commit is **`5cda9874`**
("stop an empty PATCH body raising 500 from the update builder"), not `6b854108`.
`SurveyLogicService.patch` now branches on `hasPatchValues(input)`: an all-optional body
that arrives empty reads the row back through `db.select()` instead of updating. The spec
passed `{}` and stubbed `db` with `update` alone.

Fixed by covering both branches — and **strengthened, not merely restored**. The original
cross-tenant patch test asserted only that `NotFoundException` was thrown, which an empty
result produces whether or not the org predicate is there. It now also asserts the tenant
value is bound into the statement's predicate, as the `list` test already did.

Proved hermetically that the repair bites and the minimal one would not have:

- control (fixed spec, service intact): **5 / 5 pass**
- `eq(surveyLogicRules.orgId, orgId)` removed from `list` and `patch`: **4 of 5 fail**; the
  survivor is the same-tenant control, which asserts no isolation
- the same defect against a **minimal** repair (a `select` stub bolted onto the HEAD spec
  with no predicate assertion): only the `list` test bites, **the patch test passes** —
  which is why the assertion was added rather than just the stub

## 5. Cross-territory findings I did not fix

### `region.config.ts` `kbBucket` — NOT mine, and it is storage's

`RegionStorageConfig.kbBucket` is parsed at `region.config.ts:237` and **read by nobody**:
`StoragePlacementResolver.toR2Config` maps `RegionStorageConfig` onto `R2Config`, which has
no KB field, so every KB call site — the eight existing ones and my new one — resolves the
KB bucket from the flat `AppConfig`. My change therefore introduces **no new asymmetry**:
the purge resolves it exactly as `KbMediaService` and `KbSourcesService` do, so upload and
delete agree in a region deployment as much as they ever did.

Fixing it properly means teaching `StoragePlacementResolver` to answer a per-role bucket
and routing all nine sites through it, which changes `requireBucket`'s contract. That is
storage territory. **One dependency worth flagging:** if it is fixed in the resolver alone
without routing the purge through it, the purge falls back out of symmetry — the region's
KB bucket would receive the upload and the flat one would receive the delete.

### Two producers still write a NULL bucket

`kb-page-attachment-purge.ts` (`kb:page:purge`) and `sign-documents.service.ts`
(`e-sign:document:delete`) do not set the new column. They are not broken — each has a
single producer and a single bucket, so their purpose resolves them totally, and the sweep's
map still covers them. Setting `bucket` at those two sites would make the row
self-describing and let the purpose map shrink to nothing. KB and e-sign territory.

### Ticket 33 box 6 — a third false count

`issues/33-tenant-private-upload-lifecycle.md` box 6 ("Cancellation, failed transforms,
replacement and GDPR/retention deletion each clean both the database row and the object,
with no orphan and no surviving public URL") is ticked with two documented false counts
already. This is a third: the organisation purge did not clean the object for any KB key,
and reported that it had. I did not edit that ticket — it is another lane's file and is
being actively annotated. The orchestrator should route the annotation.

### `check:migration-rollback` is red on 1044, not on mine

`1044_t41_kb_page_attachments_rls` has no `rollback/1044_*.down.sql` and no
`-- @irreversible` / `-- @data-loss` declaration, so the gate exits 1. It is a pure
`ENABLE ROW LEVEL SECURITY` + `CREATE POLICY`, which is trivially reversible — it needs a
two-statement down file. Mine (`1045`) has one and passes. Cron/KB territory (commit
`73edfbd5`).

## 6. Not run

Backend e2e, seeded e2e, lint, `check:migration-chain` (needs a live DB connection),
anything frontend, and any live R2 access. `scratch_t44c_bucket` is a purpose-built scratch
database created for this report and holds only `storage_pending_purge`; no
`cornerstone_*`, no `DATABASE_URL`, and none of the cited `scratch_boot_*` /
`scratch_perf_seed*` databases were touched.
