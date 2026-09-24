# KB migration runbook — 1168 … 1175

You run these. This session has no IAM credential, so nothing here has been applied or
verified against a real database. Every migration below is **unverified until applied**.

`DATABASE_URL` in `backend/.env` points at **live production Aurora**. There is no
non-production Postgres in this environment. Treat every command as production.

Backup posture: PITR window is **1 day** and the cluster is **unencrypted**. Read the
cluster, not the instance, when you check it. That window is the whole safety net for
step 1174.

---

## Before anything

Run from `backend/`. All commands go through the IAM wrapper at `D:/agent-work/mig-iam.mjs`,
which mints an RDS auth token and spawns the real script with it. A bare
`pnpm db:migrate` dies `28P01`, which reads like a wrong password and is not one — the
runner never mints a token.

**Never run `pnpm db:migrate`.** It queues *every* journal entry in array order. The
production ledger is reconciled, not replayed: 47 rows against 921+ journal entries. Use
`--tag=` to build a one-entry queue, always.

Confirm the wrapper still works and see the pending/orphan counts:

```bash
node D:/agent-work/mig-iam.mjs src/scripts/check-migration-ledger.mjs
```

`pnpm check:migration-chain` cannot do this — it reads `.env` directly and dies `28P01`.

### Check the journal before you start

An unjournalled migration cannot run — `--tag=` builds its queue from
`migrations/meta/_journal.json`, so a missing entry is a hard interlock, not an oversight.

```bash
node -e "console.log(require('./migrations/meta/_journal.json').entries.slice(-8).map(e=>e.tag).join('\n'))"
```

If a tag below is absent from that list, it was withheld deliberately because the
migration was not yet safe to apply. Find out why before adding it.

### 1171 has an extra precondition

It hashes with `digest(text, text)`, which comes from `pgcrypto`. Its preflight raises if
the function is absent. Check before you start:

```sql
SELECT to_regprocedure('public.digest(text, text)');
```

`NULL` means `CREATE EXTENSION pgcrypto;` first, or 1171 aborts on statement 1.

---

## The four already written

Apply in order. For each: dry-run, read the statement list, then apply.

```bash
node D:/agent-work/mig-iam.mjs src/scripts/run-pending-migrations.mjs --tag=<TAG> --dry-run
node D:/agent-work/mig-iam.mjs src/scripts/run-pending-migrations.mjs --tag=<TAG>
```

| Order | Tag | What it does | Rollback |
|---|---|---|---|
| 1 | `1168_kb_page_grants` | Creates `kb_page_grants` | `DROP TABLE` — clean |
| 2 | `1169_kb_page_collection_indexes` | Adds collection indexes | drops the indexes |
| 3 | `1170_kb_page_reviews_derive_overdue` | Adds `chk_kb_page_reviews_status` | drops the constraint |
| 4 | `1171_kb_pages_public_token_hash` | Adds `public_token_hash`, backfills, **rebuilds the `tenant_isolation` RLS policy** | restores the plaintext policy, drops column + index |

Rollbacks live at `migrations/rollback/<TAG>.down.sql`. They are not wired to a command —
apply the file by hand if you need it.

### 1171 is a deploy gate, not an optional step

`setVisibility` and `getPublicPage` both read `public_token_hash`. Deploy that code before
this migration is applied and **every share operation raises `42703 undefined_column`**.
Either apply 1171 first, or hold the deploy.

1171 also rewrites the `tenant_isolation` policy on `kb_pages` so the public-token arm
compares the *hash* column against the `app.current_public_token_or_null()` GUC. The
reader now sets that GUC to a hash. Applying the column without the policy rebuild leaves
sharing broken in a second, independent way — the migration does both, so don't split it.

### After 1171, prove sharing actually works

Schema checks are not enough here; the failure mode is a policy mismatch, which a column
probe cannot see. Mint a share link through the app and fetch it anonymously. If the row
comes back, writer, reader, GUC and policy all agree.

---

## 1172 — `external_id` (import idempotency)

Additive and reversible. Adds `external_id` + `external_source` to `kb_pages` and a
**partial** unique index on `(org_id, external_source, external_id) WHERE external_id IS NOT NULL`.

The index must stay partial. A plain unique index collides across every existing row where
those columns are NULL, and that surfaces as a `23505` returned to the user as a 500.

```bash
node D:/agent-work/mig-iam.mjs src/scripts/run-pending-migrations.mjs --tag=1172_kb_pages_external_id --dry-run
node D:/agent-work/mig-iam.mjs src/scripts/run-pending-migrations.mjs --tag=1172_kb_pages_external_id
```

---

## 1173a / 1173 / 1174 — the `kb_articles` cutover

**1174 drops `kb_articles`. That is irreversible and PITR gives you one day.**

Do not run these back to back. The whole design puts a human checkpoint between them.

### Why there is a `1173a`

The first version of this cutover was **lossy and could not detect it.** `kb_articles`
carries eleven columns `kb_pages` did not have — `slug`, `excerpt`, `category_id`,
`views`, `helpful_count`, `not_helpful_count`, `seo_title`, `seo_description`,
`review_interval_days`, `published_at`, `archived_at`. The backfill had nowhere to put
them, and the parity query compared **row counts**, so it would have reported a clean
match while every one of those values was discarded. 1174 would then have dropped the
source table.

Losing `slug` alone breaks every existing help-centre URL. The three counters are all the
engagement history there is.

`1173a` adds those columns first. The parity query now compares **values, not counts**,
and 1174's preflight does the same.

### Step 0 — add the columns (additive, reversible)

```bash
node D:/agent-work/mig-iam.mjs src/scripts/run-pending-migrations.mjs --tag=1173a_kb_pages_article_columns --dry-run
node D:/agent-work/mig-iam.mjs src/scripts/run-pending-migrations.mjs --tag=1173a_kb_pages_article_columns
```

Note `slug` is a NEW column, distinct from the existing `public_slug`. They are different
namespaces: `public_slug` is the wiki share slug, `slug` is the help-centre URL. Its unique
index is partial and leads with `org_id` — a global unique on slug would let one tenant
squat every other tenant's URLs.

### Step 1 — expand and backfill (reversible)

```bash
node D:/agent-work/mig-iam.mjs src/scripts/run-pending-migrations.mjs --tag=1173_kb_articles_cutover_expand --dry-run
node D:/agent-work/mig-iam.mjs src/scripts/run-pending-migrations.mjs --tag=1173_kb_articles_cutover_expand
```

Copies every `kb_articles` row with no counterpart into `kb_pages`, setting
`source_article_id`. Deletes nothing. Guarded by `WHERE NOT EXISTS`, so it is safe to
re-run.

### Step 2 — prove parity yourself

Run `migrations/verify/1173_kb_articles_cutover_parity.sql` against production and read
the output. It compares per-column VALUES between each article and its migrated page, and
lists any article id with no corresponding page.

**Every org must show parity, the orphan list must be empty, and the per-column mismatch
list must be empty.** If any is not, stop. Fix the backfill and re-run 1173 — it is
idempotent. Do not proceed on a partial match.

A row-count match means nothing on its own. That was the original defect.

Leave a gap here. Days, not minutes: run the help centre on the migrated data and let real
traffic find what a count comparison can't.

### Step 3 — contract (irreversible)

```bash
node D:/agent-work/mig-iam.mjs src/scripts/run-pending-migrations.mjs --tag=1174_kb_articles_cutover_contract --dry-run
node D:/agent-work/mig-iam.mjs src/scripts/run-pending-migrations.mjs --tag=1174_kb_articles_cutover_contract
```

Take a manual snapshot first. The one-day PITR window is not a backup strategy for a
`DROP TABLE`.

1174 opens with a preflight that raises unless every non-deleted `kb_articles` row has a
matching `kb_pages` row **with matching column values**. That guard is a backstop for
step 2, not a replacement.

The rollback recreates the table **structure only**. Dropped rows do not come back from
SQL. Recovery means PITR.

---

## If something fails

- **`28P01`** — IAM token, not a rotated password. Re-mint by re-running the wrapper; check
  AWS credentials resolve. Worth knowing: a region parsed from the hostname with
  `.at(-3)` yields the literal `"rds"`, and the signer happily mints a token that fails
  exactly this way. The wrapper hardcodes `ap-south-1`, so it dodges this.
- **`relation "…" does not exist`** on a correct-looking statement — the runner's
  `search_path` is `"$user", public, build_events, app`. No `build`. Every KB migration
  here is `public.`-qualified, so this shouldn't bite, but that's the cause when it does.
- **Any failure** — the statement rolls back cleanly and the loop stops, so nothing after
  it runs. Fix and re-run the same `--tag=`; already-applied migrations are skipped by
  file hash.

## After all of them

```bash
node D:/agent-work/mig-iam.mjs src/scripts/check-migration-ledger.mjs
```

Then confirm each migration's on-disk sha256 matches its `drizzle.__drizzle_migrations`
row. A ledger row alone doesn't prove the right bytes ran.

---

## Known-red, deliberately

The journal has two `a`-suffixed entries (`0464a_gl_kernel` idx 717, `0271a_waitlist_admission`
idx 726) ordered before `1078` while carrying later `when` values. Correcting it means
renumbering applied migrations, which BE-59 and BE-60 forbid. The failing ordering test is
the accurate state of the world. Left alone on purpose — don't let anyone "fix" it.

---

## 1175 — `ai_jobs` expired-lease index (NOT journalled)

Supports the lease-recovery query added to `AiJobsService.reclaimExpiredLeases`. Without it,
every worker tick sequentially scans `ai_jobs`.

Partial on purpose — `WHERE status = 'RUNNING'` — because only a small fraction of rows are ever
RUNNING, and that is the only slice the reclaim reads.

**Deliberately absent from `_journal.json`.** It is additive and reversible, so journalling it is
safe whenever you want it; the entry was withheld only so nothing new reaches production without
you choosing it. To enable:

```json
{ "idx": 1056, "version": "7", "when": 1803000010671, "tag": "1175_ai_jobs_expired_lease_index", "breakpoints": true }
```

Then apply as usual:

```bash
node D:/agent-work/mig-iam.mjs src/scripts/run-pending-migrations.mjs --tag=1175_ai_jobs_expired_lease_index --dry-run
node D:/agent-work/mig-iam.mjs src/scripts/run-pending-migrations.mjs --tag=1175_ai_jobs_expired_lease_index
```

The reclaim works without it — just slower. Nothing breaks if you never apply it.
