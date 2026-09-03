# 46 — The six red backend gates: two real defects, two unmet prerequisites, two residuals

**Scope.** The six backend gates ORCHESTRATION.md's "First full gate sweep at head" left red:
`check:lifecycle-predicates`, `check:module-lifecycle`, `check:audit-log-privileges`,
`db:verify-rls`, `check:vulnerabilities`, `check:licenses`.

**Headline.** Four now exit 0. **Two of the four were real defects, and neither was the one the
sweep predicted.** The two exit-2 gates turned out to be genuinely different from each other: one
was a pure prerequisite, the other was hiding a live privilege hole that only a live target could
see. Two gates stay red and are recorded below as accepted residuals with an owner and a deadline.

Every database measurement was taken on **`scratch_t41_gates`**, a local Postgres bootstrapped from
zero to journal head (**668/668** after this work; 667/667 before) with the non-owner
`streamline_app` role provisioned (`rolsuper=f rolbypassrls=f`). No shared database was touched, and
**no defect was ever planted in the working tree** — every bite proof ran against the scratch
database or a `git archive` copy.

---

## 0. Result table

| gate | before | after (no live DB) | after (live target at head) | verdict |
|---|---|---|---|---|
| `check:vulnerabilities` | **1** | **0** | — | real defect, fixed |
| `check:audit-log-privileges` | **2** | **2 → SKIP** (prerequisite named) | **0** | **real defect, fixed** |
| `db:verify-rls` | **1** | 2 (cannot determine) | **0** | **real defect, fixed** |
| `check:module-lifecycle` | **2** | **2 → SKIP** (prerequisite named) | **0** | unmet prerequisite only |
| `check:lifecycle-predicates` | **1** | **1** | — | real ratchet breach, **residual** |
| `check:licenses` | **1** | **1** | — | legal decision, **residual** |

`release-verify.mjs --allow-dirty --only=backend` over exactly these six, with the scratch target in
the environment: **`{"PASS":4,"FAIL":2}`**. With no database in the environment the two
database-backed gates are now classified **SKIP with a named prerequisite** instead of FAIL.

---

## 1. `check:audit-log-privileges` — exit 2 was hiding a real hole

The sweep guessed this was "probably a prerequisite". It was both: the *message* was a prerequisite,
and the *answer underneath it* was a failure.

Run against the scratch target at head, before any change:

```
{"role":"streamline_app","isAppRole":true,"updateRevoked":false,"deleteRevoked":false,"triggerPresent":true}
EXIT=1
```

**The application role could UPDATE and DELETE the immutable audit log.** Migrations `0840` and
`0928` revoke exactly those privileges. `src/scripts/db-bootstrap-app-role.mjs` then runs

```sql
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO streamline_app;
```

which hands every one of them back. The append-only trigger (`audit_logs_append_only`) was present
and still refused the mutation, so **nothing ever failed loudly** — which is why this survived. The
trigger is a second line; the privilege is the boundary the gate measures and the one that survives
a trigger being disabled.

**Fix** (`src/scripts/db-bootstrap-app-role.mjs`): an `IMMUTABLE_TABLES` table-driven re-revoke after
the blanket grant, plus an assertion in the verification block so the script cannot print
`RESULT: READY` over a mutable audit log.

```
OK    re-revoke UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER on public.audit_logs (append-only)
append-only public.audit_logs: update=revoked delete=revoked
```

**Bite proof, both directions, on the scratch database:**

| step | exit |
|---|---|
| after the fix | 0 |
| `GRANT UPDATE, DELETE ON public.audit_logs TO streamline_app` | **1** |
| re-run the fixed bootstrap | 0 |
| `--self-test` (pure verdict function) | 0 |

**This is an ordering defect, not a scratch artefact.** Any environment where the role is
provisioned *after* migrations run — which is the natural order for a new cell — gets the same
hole. Worth an operator check against every deployed cell: `SELECT
has_table_privilege('streamline_app','public.audit_logs','UPDATE');` must be `false`.

---

## 2. `db:verify-rls` — one real cross-tenant read hole, and a gate that could not tell drift from a defect

### 2.1 The hole

Against the scratch target at head: **coverage 982 of 989 tenant-scoped tables**, one
`IN-SCOPE MISSING`:

```
FAIL  RLS enabled on public.kb_page_attachments — in-scope tenant table has no RLS
```

`migrations/1042_t29_kb_page_attachments.sql` creates the table with the `(org_id, id)` anchor and a
composite FK — and **no `ENABLE ROW LEVEL SECURITY` and no policy at all**. The app role holds full
DML on every new table through `ALTER DEFAULT PRIVILEGES`, so the only thing between one tenant and
another tenant's attachment ledger — file names, storage keys, uploader ids — was the `org_id`
predicate the service happens to write. That is the application-layer check `CLAUDE.md` §5 calls
advisory.

**Measured, not inferred**, as `streamline_app` with the tenant GUC set, two orgs with one
attachment each:

| | without the policy | with the policy |
|---|---|---|
| tenant A `SELECT` | **both rows**, including org B's file name and storage key | 1 row |
| tenant A `UPDATE ... WHERE org_id='B'` | — | `UPDATE 0` |
| tenant A `INSERT` with `org_id='B'` | — | `ERROR: new row violates row-level security policy` |
| owner (`BYPASSRLS`) | 2 | 2 |

**Fix:** `migrations/1044_t41_kb_page_attachments_rls.sql`, journalled at `idx` 800 /
`when` 1803000010119 (unique, strictly increasing, above the 2027-02-19 watermark). The predicate
mirrors `kb_article_attachments` — the wiki twin the table was deliberately shaped after —
`app.current_org_id()` on both sides, **not** the `_or_null` variant `kb_pages` uses: a public
help-centre page is read with no tenant GUC via `public_token`, an attachment row never is, so a
NULL GUC must see nothing rather than everything.

Gate `1 → 0`, `IN-SCOPE MISSING 1 → 0`, coverage `982 → 983 of 989`. The remaining 6 are the
registered `PLATFORM-GLOBAL` set, each with a rationale in the script. `check:migration-discipline`,
`check:migration-chain` and `check:migration-ledger` all still exit 0.

### 2.2 The gate could not tell a stale target from a defect

The catalogue half of this gate compares the live `pg_catalog` against the declared schema, so it is
only evidence about a commit when the target is *at* that commit. **`check:tenant-relationships`
already shipped the counter-example** — 627 "violations" that were entirely a target sitting at 573
of 667 — and the clean direction is the same trap: a green sweep against a drifted target proves
nothing about tables that target has not created yet, and would be recorded as a PASS.

`src/scripts/db-verify-rls.mjs` now measures `drizzle.__drizzle_migrations` against the journal
before the catalogue section and answers **exit 2, "PREREQUISITE UNMET — cannot determine"** when
the target is behind head, printing every finding in full and labelling it a fact about *that*
database rather than about this commit. **Behavioural probes outrank drift**: they run on tables the
script creates, are valid on any target, and still exit 1.

**Bite-proved hermetically on `scratch_t41_gates`, all six branches:**

| branch | exit |
|---|---|
| at head, clean | **0** |
| at head, RLS dropped on `kb_page_attachments` | **1** |
| one ledger row deleted (667 of 668), hole present | **2** |
| one ledger row deleted, clean | **2** |
| `app.current_org_id()` stubbed to a constant **and** ledger drifted | **1** (3 behavioural FAILs) |
| everything restored | **0** |

The relevance is immediate: `check:migration-ledger` reports the default `.env` target at **635
applied of 668, 33 pending**. Every `db:verify-rls` catalogue finding recorded against that target
during this release was measured on a database 33 migrations behind head.

---

## 3. `check:module-lifecycle` — an unmet prerequisite, and nothing else

Run against the scratch target at head:

```
Gate 1: Tenant isolation   PASS  All 11 tables have tenant-predicated RLS policies
Gate 2: Cold migration     PASS  All 11 tables exist in pg_catalog with journaled migrations
Gate 3: Restore            PASS  All 11 tables pass restore check
Gate 4: Removal            PASS  All 11 tables have non-nullable org_id with FK
RESULT: ALL GATES PASSED  (timesheets, 11 tables)   EXIT=0
```

**No defect.** The gate was already exiting 2 and already printing `INCONCLUSIVE`; it was classified
FAIL only because `release-verify.mjs` matches a prerequisite *signature in the output*, deliberately
and correctly refusing to classify on a bare exit 2 alone. Its wording did not match. Both
database-backed gates now say `PREREQUISITE UNMET — cannot determine`, and the harness classifies
them `SKIP (2)`.

Noted, not fixed, outside this pass: `check:module-lifecycle` checks **one** module — `timesheets`,
11 tables — because `MODULE_ID` defaults to it. A green run is a statement about timesheets, not
about the release.

---

## 4. `check:vulnerabilities` — fixed

4 HIGH advisories, all `fast-uri`, all on one path: `. > @modelcontextprotocol/sdk > ajv > fast-uri`.

| advisory | range | patched |
|---|---|---|
| GHSA-5jgf-p345-68v8 host confusion, skipped IDN canonicalization | `>=4.0.1 <4.1.3` | `>=4.1.3` |
| GHSA-f65p-4m7j-42xc SSRF, malformed IPv6 normalization | `>=4.0.0 <4.1.3` | `>=4.1.3` |
| GHSA-fph4-wmhf-6fwf SSRF, repeated hostname percent-decoding | `>=4.0.0 <4.1.3` | `>=4.1.3` |
| GHSA-jqff-g426-hqxp host confusion, percent-encoded scheme normalization | `>=4.0.0 <4.1.3` | `>=4.1.3` |

**An upgrade is available and safe: 4.1.3 and 4.1.4 are both published.** It is transitive, but this
repository already moves it — `pnpm-workspace.yaml` carried three `fast-uri` overrides, all targeting
the 3.x line, which is how a package `ajv` declares as `^3.0.1` was resolving to `4.1.2`.

**The obvious fix does not work and this is worth writing down.** Adding
`fast-uri@>=4.0.0 <4.1.3: '>=4.1.3'` changes nothing: **pnpm matches an override selector against the
DECLARED range, not the resolved version**, and `^3.0.1` does not intersect `>=4.0.0`. Verified —
the override was added, `pnpm install` ran, `fast-uri` stayed at 4.1.2. The fix is to retarget the
three existing selectors to `>=4.1.3`.

Result: `4.1.2 → 4.1.4`, `pnpm audit --prod --audit-level=high` clean, gate `1 → 0`. Remaining: 3
moderate, below the gate's threshold. Functional smoke test, since this crosses ajv's declared major:
`ajv@8.20.0` compiles and evaluates a `$ref` schema against `fast-uri@4.1.4` (valid `true`, invalid
rejected), and `@modelcontextprotocol/sdk` imports cleanly.

---

## 5. RESIDUAL — `check:licenses`: the facts, for a human to decide

**Not fixed, and deliberately not allowlisted.** This is a legal question and adding the exception is
not an engineering call. Facts, all measured on this checkout:

1. **The package.** `@img/sharp-libvips-darwin-arm64@1.3.2`, `LGPL-3.0-or-later`. A prebuilt
   redistribution of upstream `lovell/sharp-libvips`; ships exactly `lib/libvips-cpp.8.18.3.dylib`
   plus a glib header. `sharp` itself is **Apache-2.0** — only the libvips payload is LGPL.
2. **Linkage: dynamic, confirmed on disk.** `otool -L` on
   `@img/sharp-darwin-arm64/lib/sharp-darwin-arm64-0.35.3.node` lists
   `@rpath/libvips-cpp.8.18.3.dylib`. It is loaded into the Node process, not forked.
3. **Not build-time-only. Runtime, on two live paths.** `sharp` is a direct production dependency
   (`^0.35.3`) used by `src/common/media/media-compression.service.ts` and
   `src/modules/kb/wiki/kb-media.service.ts`. The libvips package is a platform-gated
   `optionalDependency` (`os: darwin`, `cpu: arm64`), so a Linux deployment installs
   `@img/sharp-libvips-linux-*` instead — **the same licence, a different filename**. Allowlisting
   only the darwin-arm64 name would leave the deployed artefact unexamined.
4. **The existing allowlist has a rationale, and it does not cover this.** The one entry,
   `@ffmpeg-installer/ffmpeg` (LGPL-2.1), is justified as *"FFmpeg binary invoked via
   `child_process` (subprocess call, not library linking); LGPL copyleft does not extend to the
   calling application. Reviewed 2026-09-01."* **That argument is unavailable here** — libvips is
   linked into the process. The applicable argument is the different one: LGPL-3.0 §4/§5 permit
   dynamic linking against an *unmodified* library provided the combined work can be relinked, and
   this package is an unmodified upstream redistribution. Whether that is satisfied, and whether
   conveyance is triggered at all for a hosted service that ships no binary to users, is the
   decision.

**Disposition: ACCEPTED RESIDUAL.** Owner: **release owner + whoever signs off dependency licensing**
(no engineering owner exists for this). Deadline: **2026-09-10**, before cutover. Three outcomes are
available and all are cheap: (a) record a reviewed exception naming *every* `@img/sharp-libvips-*`
platform variant with the dynamic-linking rationale; (b) narrow the gate's `LGPL` pattern with a
written policy on dynamic linking; (c) drop `sharp` for a non-copyleft encoder. **Until one is
chosen this gate stays red, which is the correct state** — an unreviewed copyleft dependency in the
shipped artefact should not read as green.

---

## 6. RESIDUAL — `check:lifecycle-predicates`: a real ratchet breach, 2 of 4 sites out of reach

Exit 1. `78 primary reads` against a baseline of 75; `336 joins` against a baseline of 335.

The gate stores counts, not sites, so **which** entries are new is not recoverable from its output.
Recovered by running the gate hermetically at the commit that set the baselines (`b43cbba5`) via
`git archive b43cbba5 src` into a temp directory, and diffing both lists normalised to
`file::symbol` (line numbers move, so a raw diff shows 46 spurious "new" entries; there are 4).

**The four new sites, each opened and read:**

| # | site | added by | assessment |
|---|---|---|---|
| 1 | `src/modules/kb/wiki/kb-spaces.service.ts:216` `kbArticles` | `e30e245e` / `c0daca5b` | **must sweep deleted rows** |
| 2 | `src/modules/kb/wiki/kb-spaces.service.ts:220` `kbPages` | same | **must sweep deleted rows** |
| 3 | `src/modules/surveys/survey-tenant.ts:7` `surveyForms` | `6b854108` | tenancy assert, not a lifecycle read |
| 4 | `src/modules/chat/chat-channel-member-preview.ts:120` `users` (join) | `fd8d1c12` / `a85c0fe7` | display join onto global identity |

- **1 and 2** are inside `KbSpacesService.remove`: a space is soft-deleted, then every article and
  page in it is collected to emit `kb.content.delete` outbox events that purge embedding chunks.
  Adding `isNull(deletedAt)` would **leave the chunks of already-soft-deleted content orphaned in
  the search index** — it would create a bug. This is the same class as the three
  `gdpr-subject-erasure-authored-content.ts` entries already in the gate's `ACCEPTED` list
  ("erasure deliberately sweeps deleted rows").
- **3** is `assertSurveyInOrg`, a pure tenancy assertion added to answer 404 instead of 500 for a
  cross-tenant `surveyId`. The split is deliberate and visible in the code:
  `survey-assessment.service.ts:22` calls the assert, then `:34` does the lifecycle-filtered read
  with `isNull(surveyForms.archivedAt)`. Same class as the two survey entries already in `ACCEPTED`
  ("an archived survey must stay inspectable"). Adding the predicate would change behaviour at six
  call sites.
- **4** is `.leftJoin(users, eq(users.id, organizationMembers.userId))` to render a channel member's
  name. `users` is in the gate's own `GLOBAL_IDENTITY_TABLES` exemption precisely because *"a
  deactivated user must still resolve for auth, audit attribution and display"*, and the gate's own
  source names ``.leftJoin(users, …)`` as the archetype of a join that is "a different question with
  a different answer". The exemption is applied to primary reads and **not** to joins. Adding the
  predicate would blank the name of a deactivated member in the roster.

**Nothing here is a live correctness or tenancy defect.** All four are new instances of classes the
gate already documents as by-design.

**Why it is not closed.** Two of the four are in `src/modules/kb/**`, which has a dedicated owner
this round and which this pass is forbidden to edit. Fixing only the two in reach leaves 77 > 75, so
the gate stays red either way. **The baselines were not moved**, and no `ACCEPTED` entry was added,
because raising a ratchet is how a ratchet stops being one — and because writing a justification for
another territory's code is that territory's call, not this one's.

**Disposition: ACCEPTED RESIDUAL.** Owner: **the KB agent** for sites 1 and 2 (a one-line
`ACCEPTED` entry each, or a decision that the sweep should filter); **release owner** to arbitrate
sites 3 and 4. Deadline: **2026-09-10**.

**A gate deficiency found on the way, recommended but NOT applied.** The `ACCEPTED` ledger in
`check-lifecycle-predicates.mjs` is **inert** — it validates that each entry is still a candidate and
fails on a stale one, but it does not subtract from the count. So an accepted read occupies a slot in
the anonymous budget, and **fixing one silently frees that slot for a brand-new unjustified read**.
The ratchet leaks. The repair is to make `ACCEPTED` subtract, add the same ledger for the join class,
and lower both baselines by exactly today's accepted counts (75 → 68 with 7 named entries), so every
entry above the budget carries a written reason in source and dies when stale. That is a change to
the gate's contract and it should be made deliberately by whoever owns the ratchet, not folded into a
pass whose brief was "do not weaken a gate to make it pass".

---

## 7. Commands, verbatim

```bash
BE=/Users/tarunchintakunta/Personal/streamline/streamlineos-backend
O='postgres://neondb_owner@127.0.0.1:5432/scratch_t41_gates'
A='postgres://streamline_app@127.0.0.1:5432/scratch_t41_gates'

# the target: zero to head, then the non-owner role
createdb -O neondb_owner scratch_t41_gates
psql -d scratch_t41_gates -c 'CREATE EXTENSION IF NOT EXISTS vector; … btree_gin;'
DATABASE_URL=$O DIRECT_DATABASE_URL=$O PGSSLMODE=disable $HEAVY 2 -- node src/scripts/db-bootstrap.mjs
#   -> RESULT: REACHED_HEAD 667/667   (668/668 after migration 1044)
DATABASE_URL=$O DIRECT_DATABASE_URL=$O PGSSLMODE=disable node src/scripts/db-bootstrap-app-role.mjs
#   -> RESULT: READY   tables granted 1027/1027   bypassrls=false

APP_DATABASE_URL=$A PGSSLMODE=disable node src/scripts/verify-audit-log-privileges.mjs   # 1 -> 0
APP_DATABASE_URL=$A PGSSLMODE=disable node src/scripts/check-module-lifecycle.mjs        # 2 -> 0
DATABASE_URL=$O DIRECT_DATABASE_URL=$O PGSSLMODE=disable node src/scripts/db-verify-rls.mjs  # 1 -> 0
pnpm run check:vulnerabilities                                                            # 1 -> 0
pnpm run check:licenses                                                                   # 1 (residual)
node src/scripts/check-lifecycle-predicates.mjs --list                                    # 1 (residual)

# baseline recovery for the ratchet, hermetic
git archive b43cbba5 src | tar -x -C /tmp/lp-base && (cd /tmp/lp-base && node src/scripts/check-lifecycle-predicates.mjs --list)

# harness classification, with the scratch target in the environment
DATABASE_URL=$O DIRECT_DATABASE_URL=$O APP_DATABASE_URL=$A PGSSLMODE=disable \
  node release-verify.mjs --allow-dirty --only=backend --gate=… -> {"PASS":4,"FAIL":2}
```

## 8. Files changed

Backend repo (`streamlineos-backend`), four commits:

- `pnpm-workspace.yaml`, `pnpm-lock.yaml`
- `src/scripts/db-bootstrap-app-role.mjs`
- `src/scripts/verify-audit-log-privileges.mjs`
- `src/scripts/check-module-lifecycle.mjs`
- `src/scripts/db-verify-rls.mjs`
- `migrations/1044_t41_kb_page_attachments_rls.sql` (new), `migrations/meta/_journal.json`

## 9. What this pass did NOT do

- **Did not run** the backend `typecheck`, `build`, `check:spec-typecheck`, jest, or any frontend
  gate. Not run is not passing.
- **Did not** touch `src/modules/storage/**`, `src/modules/cron/**`, `src/modules/kb/**`,
  `src/modules/e-sign/**` or `test/perf/**` — all have dedicated owners. Migration 1044 protects a
  KB *table*; it edits no KB source.
- **Did not** connect to any database other than `scratch_t41_gates`, and did not read, write or
  print the shared `DATABASE_URL` target. `db:verify-rls` against the default `.env` target was
  therefore **not run** — its "before" exit 1 is quoted from ORCHESTRATION.md, not measured here.
- **Did not** add `@img/sharp-libvips-*` to the licence allowlist, move a lifecycle baseline, or add
  an `ACCEPTED` entry to any ratchet.
- **Did not** verify the audit-log privilege state of any deployed cell. §1 predicts the same hole
  wherever the app role was provisioned after migrations; that is an operator check, owed.

## 10. Cross-territory findings

1. **`src/modules/kb/wiki/kb-spaces.service.ts:216,220`** — two new `check:lifecycle-predicates`
   ratchet entries. Assessed as correct as written (§6); needs the KB owner's disposition.
2. **`src/modules/surveys/survey-tenant.ts:7`** and
   **`src/modules/chat/chat-channel-member-preview.ts:120`** — the other two ratchet entries.
3. **`db:verify-rls` writes to whatever `DATABASE_URL` points at** — it creates `rls_probe`,
   `rls_probe_nullable` and an `rls_probe_role`, and only then tears them down. In a default release
   sweep that is the shared remote Neon branch. Pre-existing, unchanged by this pass, and worth a
   deliberate decision rather than a discovery.
4. **`check:module-lifecycle` covers one module** (`timesheets`), by `MODULE_ID` default.
