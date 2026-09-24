# KB migration runbook — 1168 … 1176

## Current state: nine applied, **1174 deliberately rolled back and pending again**

1174 was applied, then rolled back the same day once the scale of the code cutover was
measured. The rollback restored all eight tables with their policies and grants, and its
ledger row (id 938, `created_at` 1803000010661) was deleted in the same transaction, so
`--tag=1174_kb_articles_cutover_contract --dry-run` reports *would apply (17 stmts)* again.

Verified after the restore: all eight tables readable as `streamline_app` with the tenant
GUC set, **`42501` without it** — so RLS is armed, not merely present. `kb_article_chunks`
124, `kb_events` 32, `kb_pages` 20, all five inbound foreign keys re-attached, the share
token and its hash untouched.

⚠ **`check:migration-ledger` now exits 1**, reporting *1 entry below the watermark that will
NEVER apply: 1174*. 1176's `when` (…10681) sits above 1174's (…10661), which is the trap
that stranded 1154–1157. **It is wrong here.** `run-pending-migrations.mjs` says so in its
own source — *"the watermark filter was a silent data-loss bug … the watermark is now
reported for context and decides nothing"* — and a dry-run confirms 1174 would apply. The
gate models watermark semantics the runner abandoned. It goes green when 1174 is re-applied.

Re-apply 1174 only when nothing deployed reads `kb_articles`. See the code-cutover section
below.

## Applied 2026-09-24 — all nine, verified

`1168 · 1169 · 1170 · 1171 · 1172 · 1172a · 1173 · 1174 · 1175 · 1176` are applied to
production Aurora over the IAM wrapper. `check:migration-ledger` reports **938 rows against
933 journal entries, watermark 1803000010681, 0 pending**, and every one of the ten on-disk
sha256 hashes matches its `drizzle.__drizzle_migrations` row. The 5 orphan rows (909–913)
are pre-existing and hold nothing.

What the database actually held, measured before applying — this is what made the cutover
cheap and what the original plan could not have known:

| Table | Rows before 1174 |
|---|---|
| `kb_articles` | **0** |
| `kb_article_feedback` · `_restrictions` · `_tags` · `_versions` · `_translations` · `_attachments` · `_comments` | **0** each |
| `kb_article_chunks` (kept) | 124 — 93 page-anchored, 31 pre-existing orphans, 0 article-anchored |
| `kb_events` (kept) | 32 |

So 1174 dropped eight empty tables. **No row was lost.** The parity gate in step 2 below
passed vacuously for the same reason — with no source rows, an empty mismatch list proves
nothing about the backfill logic, and it should not be quoted as if it did.

### The 1174 rollback was unrunnable, and is now fixed and proven

As shipped it recreated **one** of the eight tables it dropped and omitted
`uniq_kb_articles_org_id UNIQUE (org_id, id)` from the `CREATE TABLE`. Its very next
statement adds a foreign key referencing `kb_articles (org_id, id)`, so it would have failed
with *there is no unique constraint matching given keys for referenced table* at statement 4
of 7 — after both enum types were already created, leaving a half-restored schema. It also
restored no RLS policy and no grant, which would have made each recreated table either a
silent cross-tenant hole or a `42501`.

`check:migration-rollback` passed it. That gate checks type names and, in its own words,
"never executes a rollback". It names `pnpm drill:rollback` as the thing that does —
**and no such script exists in `package.json`.** Nothing in this repo executes a rollback.

Rewritten to recreate all eight tables with every unique constraint, index, foreign key,
RLS policy, grant and sequence grant, re-attach all five foreign keys 1174 stripped from
tables it kept, and end with a `DO` block that raises unless every table, policy and grant
is in place. **Proved against production inside a transaction that was then rolled back**:
43 statements executed, 8 tables created, 8 `tenant_isolation` policies, 8 grants, 5 foreign
keys re-attached, both enums recreated, and `fk_kb_article_versions_org_article` genuinely
bites with `23503` when probed with a real `org_id` (so the org-level FK could not mask it).
`present_after` was empty — production was not modified. 11/11.

Because all eight tables were empty when 1174 ran, **for this database a structural restore
is a complete restore.** The file's own header keeps the general warning, which still holds
anywhere the tables hold rows.

### ⚠ The outstanding half of the cutover is code, not schema

`kb_articles` is restored and 1174 is pending again, so nothing is broken right now. What
remains is moving the code. **47 non-spec files carry 750 references** — `kbArticles` 522,
`kbArticleAttachments` 79, `kbArticleTags` 33, `kbArticleVersions` 27, `kbArticleFeedback`
24, `kbArticleRestrictions` 22, `kbArticleComments` 22, `kbArticleTranslations` 21.
`kbCategories` is **not** affected: 1174 leaves `kb_categories` alone and `kb_pages.category_id`
already points at it.

**1174's preflight did not and could not catch this.** It checks article→page parity only,
which is exactly the wrong question at zero rows. The precondition that mattered — *no
deployed code still reads the table* — is not expressible in SQL, so it belongs in a deploy
gate, not a `DO` block. Do not add a parity check and believe the problem is covered.

### 1174 was rewritten: four tables are renamed, not dropped

The first revision dropped all eight tables. That was wrong, and the reason only surfaced
when the code cutover was scoped: **four of the eight had no page-side destination.** There
is no `kb_page_tags`, no `kb_page_translations`, no `kb_page_feedback` and no
`kb_page_restrictions` anywhere in the schema or in any migration. Dropping them would have
deleted four shipped features rather than moving them.

Editing 1174 was permitted because it is **unapplied** — its ledger row was deleted during
the rollback, so BE-60 does not seal it. `check:migration-immutability` agrees.

| dropped by 1174 | destination | how |
|---|---|---|
| `kb_articles` | `kb_pages` | dropped; 1173 backfilled it |
| `kb_article_versions` | `kb_page_versions` | dropped; equivalent exists |
| `kb_article_comments` | `kb_page_comments` | dropped; equivalent is column-for-column identical |
| `kb_article_attachments` | `kb_page_attachments` | dropped; equivalent exists |
| `kb_article_tags` | `kb_page_tags` | **renamed** |
| `kb_article_translations` | `kb_page_translations` | **renamed** |
| `kb_article_feedback` | `kb_page_feedback` | **renamed** |
| `kb_article_restrictions` | `kb_page_restrictions` | **renamed** |

A rename carries the table's OID, so its RLS policy and its grants travel with it. The
migration asserts that rather than assuming it, and fails if any renamed table arrives
without its tenant fence.

Three other changes ride along because the page side was missing pieces the article side had:

- `kb_page_versions` gains `excerpt`.
- `kb_page_attachments` gains `file_url`.
- `kb_article_chunks.attachment_id` **widens from `integer` to `bigint`**, because
  `kb_page_attachments.id` is a bigint identity column and an integer column cannot carry
  that foreign key. The chunks table keeps its name and its now-unreferenced `article_id`.

**The preflight refuses to run if `kb_article_versions`, `kb_article_comments` or
`kb_article_attachments` holds a row.** Those three are dropped without a row-copy. Writing
an untested copy would be worse than failing loudly — `kb_article_comments` has a
self-referential `parent_id` whose ids would need remapping. All three are empty in
production, so the drop is provably lossless there and only there.

### The round trip is proven, not assumed

`prove-1174-roundtrip.mjs` runs the migration forward and the rollback backward inside one
transaction against production, asserts both end states, then rolls the transaction back and
re-checks that production is untouched. **17/17 on the first run.** It proves: the forward
migration executes end to end; all four renamed tables exist with `page_id`, a foreign key
into `kb_pages`, RLS, a policy and the `streamline_app` grant; all eight article tables are
gone; both enums are dropped; `attachment_id` is `bigint`; then the rollback restores all
eight with their fences, narrows `attachment_id` back, restores both enums and re-attaches
all five inbound foreign keys.

### Sequencing — apply the migration BEFORE pushing the code

The renames create `kb_page_tags` and friends. New code reads those tables, so it cannot
ship first. Old code reads `kb_articles`, so the migration cannot ship first either. There is
no ordering with zero window, because the user chose rename-in-place over a copy-then-drop
expand/contract pair.

Railway deploys every backend push automatically, so **pushing the code is deploying it**.
The order is therefore: apply 1174 to production, then push. The window is the minutes
between the two, during which the `/kb/articles` routes raise `42P01`. Those routes serve
zero rows today, so the window costs nothing real — but do not invert the order, because the
inverse window breaks the wiki, which has 20 live pages.

### 1168 needed a fix before it would apply

Its preflight looked for a constraint named `uniq_org_members_org_id`. Production carries
that unique on `organization_members (org_id, id)` under the name
`uniq_org_members_org_id_key`, so the guard raised on a constraint that was present the
whole time. The foreign key itself references columns, never the name, so only the guard was
wrong. It now resolves by column set via `pg_constraint.conkey`, which is name-independent
and survives the same drift anywhere else. `kb_categories` was checked the same way before
1172a and carries `uniq_kb_categories_org_id`.

The general rule, which this is the third instance of: **a guessed identifier reads as a
missing object.** Resolve against `pg_get_constraintdef` before concluding anything is absent.

### 1175 is journalled now

The entry went in at the held-open `idx` 1059 with `when` 1803000010671, between 1174's and
1176's, so `when` stays strictly increasing in `idx` order. The one non-increasing pair in
the journal (`0271a_waitlist_admission` → `0619_chain_creates_what_production_has`) is the
pre-existing known-red below.

---

Everything below is the original pre-application runbook, kept because it explains *why*
each migration is shaped the way it is.

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

**Proved 2026-09-24, 12/12 checks.** Done at the database under `SET LOCAL ROLE
streamline_app` — connecting as `streamline_admin` carries BYPASSRLS and would have hidden
the very failure being tested. The one row holding a `public_token` backfilled to a hash
matching `encode(digest(public_token,'sha256'),'hex')`; the rebuilt policy compares
`public_token_hash`; setting the GUC to the correct hash returned the row, setting it to a
wrong hash returned nothing and saw zero rows org-wide, and **the old plaintext token no
longer resolves** — which is the assertion that shows the policy actually moved rather than
merely gaining an arm.

1171 turned out to be a repair, not a risk. `getPublicPage` already hashed the token before
setting the GUC and already filtered on `publicTokenHash`, and that code was committed to
`HEAD` and shipped by Railway — so share reads were raising `42703` in production until this
migration landed. The runbook's "hold the deploy" advice was written for the opposite order
and no longer applied.

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

## 1172a / 1173 / 1174 — the `kb_articles` cutover

**1174 drops `kb_articles`. That is irreversible and PITR gives you one day.**

Do not run these back to back. The whole design puts a human checkpoint between them.

### Why there is a `1172a`

The first version of this cutover was **lossy and could not detect it.** `kb_articles`
carries eleven columns `kb_pages` did not have — `slug`, `excerpt`, `category_id`,
`views`, `helpful_count`, `not_helpful_count`, `seo_title`, `seo_description`,
`review_interval_days`, `published_at`, `archived_at`. The backfill had nowhere to put
them, and the parity query compared **row counts**, so it would have reported a clean
match while every one of those values was discarded. 1174 would then have dropped the
source table.

Losing `slug` alone breaks every existing help-centre URL. The three counters are all the
engagement history there is.

`1172a` adds those columns first. The parity query now compares **values, not counts**,
and 1174's preflight does the same.

The `a` suffix sorts it between 1172 and 1173, which is the whole point — it must land
before the backfill that fills the columns it creates. A `1173a` would have sorted *after*
1173 and run the backfill into columns that did not yet exist.

### Step 0 — add the columns (additive, reversible)

```bash
node D:/agent-work/mig-iam.mjs src/scripts/run-pending-migrations.mjs --tag=1172a_kb_pages_article_columns --dry-run
node D:/agent-work/mig-iam.mjs src/scripts/run-pending-migrations.mjs --tag=1172a_kb_pages_article_columns
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

## 1176 — revoke dormant share tokens (journalled, idx 1060, applied)

Applied, and it revoked nothing: production holds exactly one `public_token` and that page
is public, so zero rows qualified. It is a one-time cleanup with nothing to clean, and the
deployed `setVisibility` fix is what stops new dormant tokens forming. Its value here is the
ledger row, not an effect.

Ships with the `setVisibility` fix. Apply it in the same deploy.

`setVisibility` used to mint a public token when a page became public and then never clear
it when the page left public. The read path also checks `visibility = 'public'`, so an
unshared link stopped resolving — but the token stayed in the row, and the mint path only
issues a new one when the stored token is NULL. So unsharing and re-sharing handed back
**the same URL**, and a link the owner believed they had revoked came back to life.

The code fix clears both columns on any move away from `public`. This migration does the
same once for rows unshared before the fix, which the code alone cannot reach.

```bash
node D:/agent-work/mig-iam.mjs src/scripts/run-pending-migrations.mjs --tag=1176_kb_pages_revoke_dormant_share_tokens --dry-run
node D:/agent-work/mig-iam.mjs src/scripts/run-pending-migrations.mjs --tag=1176_kb_pages_revoke_dormant_share_tokens
```

Safe to run before the code deploys: every row it touches has `visibility <> 'public'`, so
no link that resolves today resolves any differently afterwards.

Soft-deleted pages are skipped on purpose — a page in the trash keeps its token so that
restoring it restores the same share link.

**The rollback cannot undo it.** Those tokens were random secrets with no second copy;
restoring them would restore the resurrection hole. Re-share the page to mint a new one.

---

## 1175 — `ai_jobs` expired-lease index (journalled idx 1059, applied)

Live as `idx_ai_jobs_expired_lease ON public.ai_jobs (locked_at) WHERE status = 'RUNNING'`.
The paragraph below describing it as withheld is kept for the reasoning, not the status.

Supports the lease-recovery query added to `AiJobsService.reclaimExpiredLeases`. Without it,
every worker tick sequentially scans `ai_jobs`.

Partial on purpose — `WHERE status = 'RUNNING'` — because only a small fraction of rows are ever
RUNNING, and that is the only slice the reclaim reads.

**Deliberately absent from `_journal.json`.** It is additive and reversible, so journalling it is
safe whenever you want it; the entry was withheld only so nothing new reaches production without
you choosing it. To enable:

```json
{ "idx": 1059, "version": "7", "when": 1803000010671, "tag": "1175_ai_jobs_expired_lease_index", "breakpoints": true }
```

`idx` 1059 is held open for this entry — 1176 deliberately took 1060 — and its `when` sits
between 1174's and 1176's, so adding it keeps `when` increasing in `idx` order. If you
decide never to apply 1175, leave the gap. BE-59 forbids renumbering to close one.

Then apply as usual:

```bash
node D:/agent-work/mig-iam.mjs src/scripts/run-pending-migrations.mjs --tag=1175_ai_jobs_expired_lease_index --dry-run
node D:/agent-work/mig-iam.mjs src/scripts/run-pending-migrations.mjs --tag=1175_ai_jobs_expired_lease_index
```

The reclaim works without it — just slower. Nothing breaks if you never apply it.
