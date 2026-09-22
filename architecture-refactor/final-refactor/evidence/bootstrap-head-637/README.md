# Bootstrap and migration evidence — journal head **637** (`0991_calendar_event_local_version`)

Captured 2026-09-02. Written by the ticket-04 recorder from the artifacts of tickets 01, 02 and 03.
Every number below was read out of a log file that is retained in this bundle, or re-measured by
the recorder against the catalog and shown here with the query that produced it.

**This bundle supersedes** `../s02-bootstrap-parity.md` and `../s02-tenant-integrity.md`, which
cover a **634-entry** journal and a different database estate. See
[`../SUPERSEDED-FORMER-HEAD.md`](../SUPERSEDED-FORMER-HEAD.md).

---

## Read this before you read the passes

This bundle contains a clean result. It is not a clean bill of health. Four things limit what it
proves, and they are stated first on purpose.

### C1 — The parity comparator was defective until the moment this evidence was taken

`compare-bootstraps.mjs` keyed nine of its ten categories on the **object's name alone**. Under that
version, two databases were reported identical when they held:

- `CREATE INDEX ix ON t(a)` versus `CREATE INDEX ix ON t(b)` — same name, different column
- a changed `CHECK`/`FOREIGN KEY` constraint body
- a rewritten policy `USING` / `WITH CHECK` clause
- a rewritten function body, a retargeted trigger, a reordered enum
- a table with RLS *enabled* versus one with RLS *enabled and FORCED*

Ticket 02 rewrote every category to carry the definition (`pg_get_constraintdef`, `indexdef`, policy
`cmd`/`permissive`/`roles`/`qual`/`with_check`, function identity args + volatility +
`SECURITY DEFINER` + body digest, `pg_get_triggerdef`, `relrowsecurity` **and**
`relforcerowsecurity`, column default/identity/generated/collation) and added sequences, views and
the migration ledger as compared categories. It is bite-proven: two probe databases with one
deliberate difference per class produce `differences=15`, exit 1 — retained as
[`logs/13-comparator-negative-control.log`](logs/13-comparator-negative-control.log), including the
same-name index the old version passed.

**Consequence for the record:** every parity claim made *before* that fix — including the entire
retained 634-entry evidence set — did not mean what it appeared to mean. The `differences=0` results
in this bundle are the first ones taken with a comparator that can see a definition change.

A second comparator defect (`D1`) is also retained. Before the fix, the gate imported a module that
ran `main()` at import time and set `process.exitCode = 2` for an unrelated missing env var, so a
clean parity exited **2**. Retained as
[`logs/14-comparator-defect-before-fix.log`](logs/14-comparator-defect-before-fix.log): read it and
you will see `RESULT: SCHEMAS IDENTICAL differences=0` next to `exit=2`. Any CI job keying on this
gate's exit code was reading another script's prerequisite check.

### C2 — Two tenant gates were green because they could not see

Reported by ticket 03, after repairing each gate:

| gate | reported before | true value after repair | what it could not see |
|---|---|---|---|
| `check:tenant-relationships` (catalog) | 0 actionable | **4 actionable** | `credit_notes`, `vendor_credits`, `enterprise_quotes` sat in `CRM_TABLE_NAMES`, so accounting/billing tables were skipped in both modes |
| `check:tenant-relationships` (static) | 0 violations | **16 violations** | `.references((): AnyPgColumn => …)` — 12 declarations the regex never matched |
| `check:tenant-indexes` (declarations) | 745/745 clean | **823/828** | matched `pgTable(` only, so all 83 Build tables declared `build.table(...)` were invisible |
| `check:tenant-indexes --db` | *did not exist* | **985/988** | there was no catalog mode at all |

A fourth: `check-tenant-relationships`'s mid-bootstrap guard read `drizzle.__replay`, a table only
`replay-chain-cold.mjs` writes. Every database built by `db:bootstrap` — including every target in
this bundle — records into `drizzle.__drizzle_migrations`, so the guard was **inert**: the query
errored, a `.catch` swallowed it, and `midBootstrap` came back `null`.

**Consequence:** the PRD's "tenant relationships: zero actionable" and "tenant indexes: 745/745"
lines describe gates that were not looking at the whole tree.

### C3 — 22 org-bearing tables have no RLS policy; a cross-tenant read was demonstrated

Re-measured by the recorder from `pg_catalog` while writing this bundle, not copied from a report.
Full output: [`rls-no-policy-2026-09-02.txt`](rls-no-policy-2026-09-02.txt).

    org-bearing tables                     988
    RLS enabled AND >= 1 policy            966
    no policy at all                        22   = 16 inv_* + 6 platform-global

The 6 platform-global ones (`noisy_neighbour_reviews`, `organization_lifecycle_sagas`,
`organization_placement`, `organization_relocations`, `organization_reservations`,
`placement_decisions`) are registered with written justifications: control-plane routing that
necessarily runs before a tenant exists.

The **16 `inv_*` tables are a live exposure**. Each grants `streamline_app` SELECT *and*
INSERT/UPDATE/DELETE with no policy. Ticket 03 demonstrated it rather than arguing it — as
`streamline_app` (`rolbypassrls = false`) with `app.organization_id = 'org_probe_A'`, inside a
rolled-back transaction:

    POLICY-BEARING access_versions            rows_visible = 1
    NO-POLICY inv_customer_shelf_life_rules   rows_visible = 2   org_probe_A/10 + org_probe_B/20

`db:verify-rls` reported these as `EXCLUDED: INVENTORY` and exited 0. An exclusion is a statement
about who fixes something, never about whether it is exposed.

**State as of this writing (2026-09-02, bundle capture):** ticket 08 is assigned to fix this and had
**not** landed at the time of the measurement above. The 22 is current, not historical.

### C4 — `scratch_boot_a`'s ACLs were changed after its cold build

Ticket 03 ran `db:bootstrap-role` against `scratch_boot_a`, which granted `streamline_app` DML on
`public` (943/943 tables) and ran `REVOKE CREATE ON SCHEMA public FROM PUBLIC`. No rows and no
schema objects changed, and the comparator does not read ACLs — which is exactly why this is written
down. **A future ACL-aware comparison of `scratch_boot_a` against `b`/`c`/`d` will see a delta, and
that delta is this, not a bootstrap difference.**

---

## Release identity

| | |
|---|---|
| frontend branch (`.git/HEAD`, `cat`) | `refs/heads/main` |
| frontend SHA at bundle capture (`cat .git/refs/heads/main`) | `e33873d6cccca8166fa5dad69aec3dd6679a0b3f` |
| frontend SHA recorded by ticket 02 at proof capture | `6795e0377cebae7955e352f41d231f991a17670c` |
| backend branch (`.git/HEAD`, `cat`) | `refs/heads/main` |
| backend SHA at bundle capture (`cat .git/refs/heads/main`) | `5ba6bbd7fabb8990d0462bafb10514209a7af90c` |

No git command was run to produce any line of this bundle. Both SHAs were read with `cat` out of
`.git/refs/heads/main`, as the ticket requires.

**What the SHA does not prove.** At capture time the working tree carried this release's
**uncommitted** work — tickets 01, 02 and 03 had all edited files that were not committed. The
proofs in this bundle were run against the *working tree*, not against either commit. A reviewer who
checks out `e33873d6` or `5ba6bbd7` will not necessarily get the code that produced these numbers.
The durable identity of what was proven is therefore the **journal digest set** below, not the SHA.

**The two SHAs differ because they were read at different moments.** Ticket 02 read
`6795e0377ce…` when it captured its proofs; the orchestrator committed between then and this
bundle's capture. This is recorded rather than reconciled: the recorder may not run git.

---

## What was proven: journal head 637

| | |
|---|---|
| journal entries at proof capture | **637** — `0000_light_vance_astro` … `0991_calendar_event_local_version` |
| head `when` | `1803000010087` |
| `.sql` files on disk backing those 637 | 637, zero orphans |
| chain digest (see recipe below) | `c2f7f6264fa839d859a20f4985af063becf6dd26fe30c7f6b3b9d5f4cdded6d4` |
| hash-set digest | `6651dc090097f64517b45295c34e02218c7b1d640aefd1b98c0aa263ce1bde9b` |
| `meta/_journal.json` sha256 **at proof capture** | `23ee3f5a9dc1b05f1a1567ef070e025ed536a9ab0106405a979484f3848002f7` |
| per-file sha256, all 637, in journal order | [`journal-637-file-hashes.txt`](journal-637-file-hashes.txt) |

The recorder **independently reproduced** the chain digest and the hash-set digest from the 637 files
on disk and they match ticket 02's values byte for byte. The recipe, so a later reviewer can repeat
it:

    chain digest    = sha256( join("\n", ["<tag>:<sha256 of <tag>.sql>" for each entry in journal order]) )
    hash-set digest = sha256( join("\n", sorted(unique(sha256 of each <tag>.sql))) )

Neither could be re-derived from the journal *file* hash, because the file has since changed (below).
The 637 `.sql` files themselves are unchanged — the newest mtime among them is
`2026-09-02T10:54:56Z`, before any of the runs in this bundle.

### The journal has since moved to 639. This bundle does not cover 0992 or 0993.

| | at proof capture | at bundle capture |
|---|---|---|
| entries | 637 | **639** |
| head tag | `0991_calendar_event_local_version` | `0993_coupons_tenant_scoped_code_unique` |
| head `when` | `1803000010087` | `1803000010089` |
| `meta/_journal.json` sha256 | `23ee3f5a…8002f7` | `47f752d65e0140bdcd08ce49622dd7938a09824aaf0a857ff41b97eb3b61e6e8` |
| chain digest | `c2f7f626…ded6d4` | `0174f6c9d24dba56bf0358d5f8c90c028edc9ceeebec68be817367fa1cfe0e91` |
| hash-set digest | `6651dc09…1bde9b` | `496d7288e487b9e99568f64174287cdd393a435ca85f1d971e7d1565b2f5f741` |

`0992_set_null_referential_actions_repair` (mtime 17:18:20) and
`0993_coupons_tenant_scoped_code_unique` (mtime 17:21:28) were journalled by concurrent lanes after
these bootstraps completed (17:02–17:14). **No bootstrap, parity comparison or ledger check in this
bundle includes them.** Head-637 parity is not head-639 parity; a fresh pair of clean bootstraps is
required to make the same claim at 639.

For the same reason, the **PRD's "635" and the retained evidence's "634" are both stale**, in
opposite directions from 637.

---

## Database identity

Server: PostgreSQL 18.4 (Homebrew), loopback `127.0.0.1:5432`. Nothing here touched the configured
`DATABASE_URL` in `streamlineos-backend/.env`, which points at a shared remote database.

All three bootstraps ran as the OS superuser role **`tarunchintakunta`**, which carries **no per-role
`search_path`**. That choice is load-bearing: the role `neondb_owner` carries
`search_path="$user", public, build_events, app` cluster-wide from migration `0431`, and until
ticket 01's fix the chain silently depended on it (152 unqualified `current_org_id()` references
across 7 migration files resolve only under that path). Bootstrapping as `tarunchintakunta` is what
makes these runs a test of the repository rather than of the environment.

| database | oid | role | tables | ledger rows | ledger watermark | ledger hash-set | orgs |
|---|---|---|---|---|---|---|---|
| `scratch_boot_b` | 3983708 | `tarunchintakunta` | 1027 | 637 | 1803000010087 | `6651dc09…de9b` | 0 |
| `scratch_boot_c` | 3983709 | `tarunchintakunta` | 1027 | 637 | 1803000010087 | `6651dc09…de9b` | 0 |
| `scratch_boot_d` | 3983710 | `tarunchintakunta` | 1027 | 637 | 1803000010087 | `6651dc09…de9b` | 0 |
| `scratch_boot_a` | 3795068 | `tarunchintakunta` | 1027 | 637 | 1803000010087 | — | 0 |

Each of `b`, `c`, `d` was dropped and recreated empty immediately before use, and confirmed at
**0 tables**. `scratch_boot_a` is ticket 01's earlier cold build, retained for the informational
fourth comparison; ticket 02 only read it. See C4 for its one ACL change.

**Every ledger hash-set equals the journal's**, so what each database records as applied is
byte-for-byte the 637 files on disk. (1027 counts `drizzle.__drizzle_migrations`; the catalog
comparison excludes the `drizzle` schema and so reports 1026.)

**Dataset shape: no seed data.** Zero organizations, zero users, no probe residue on any target at
capture. Every fixture ticket 03 created was rolled back. Physical size at capture: `b`/`c` 109 MB,
`d` 106 MB — page layout, not catalog, and precisely what a definition-level comparison sees past.

### The scratch estate has drifted since capture — re-running today will not reproduce these numbers

Re-measured by the recorder at bundle capture:

| database | ledger rows now | orgs now | size now | note |
|---|---|---|---|---|
| `scratch_boot_a` | 637 | 0 | 110 MB | unchanged |
| `scratch_boot_b` | 637 | 0 | 109 MB | unchanged |
| `scratch_boot_c` | **639** | **1** | 109 MB | a later lane applied 0992/0993 and seeded an org |
| `scratch_boot_d` | 637 | **2** | **156 MB** | a later lane seeded two orgs |

The databases are shared scratch resources, not frozen artifacts. **The logs in this bundle are the
evidence; the live databases are not.**

---

## Commands run

From `/Users/tarunchintakunta/Personal/streamline/streamlineos-backend`, with `DATABASE_URL` and
`DIRECT_DATABASE_URL` overridden per target in the environment so `.env` was never read for a
target. Connection strings are deliberately not reproduced here — see *Sanitization*.

    node src/scripts/db-bootstrap.mjs                          # clean x2, interrupted x1, resume x1, idempotency x3
    logs/05-interrupt-harness-scratch_boot_d.sh                # starts a bootstrap and SIGKILLs it at OK_count>=345
    node src/scripts/compare-bootstraps.mjs --a=<x> --b=<y>    # b:c, b:d, c:d, b:a
    node src/scripts/compare-bootstraps.mjs --self-test
    node src/scripts/verify-migration-chain.mjs [--self-test]
    node src/scripts/check-migration-ledger.mjs                # x3 targets
    node src/scripts/check-migration-discipline.mjs
    node src/scripts/check-migration-rollback.mjs
    node src/scripts/seed-scratch-e2e.mjs --self-test          # + one live refusal
    node src/scripts/reset-scratch-db.mjs --self-test          # + one live refusal, one live accept
    psql -c "VACUUM ANALYZE;"                                  # x3 targets, BEFORE any parity count

Recorder-run, for this bundle only (read-only):

    cat .git/refs/heads/main                                   # both repos — no git command was run
    shasum -a 256 migrations/meta/_journal.json
    node <digest script>                                       # reproduced the chain and hash-set digests
    psql -d scratch_boot_{a,b,c,d} -c "<pg_catalog counts>"    # ledger rows, tables, policies, orgs
    psql -d scratch_boot_a -c "<RLS coverage query>"           # -> rls-no-policy-2026-09-02.txt

---

## Results, recorded literally

`OK` / `SKIP` / `FAIL` counts below were produced by the recorder counting lines in the retained
logs (`grep -c '^OK  '` etc.), not copied from a summary.

### 1. Two independent clean bootstraps — **PASS**

| | `scratch_boot_b` | `scratch_boot_c` |
|---|---|---|
| tables before | 0 | 0 |
| result line | `REACHED_HEAD 637/637` | `REACHED_HEAD 637/637` |
| exit code | 0 | 0 |
| OK / SKIP / FAIL | **637 / 0 / 0** | **637 / 0 / 0** |
| retries | 0 | 0 |
| wall clock | 13s | 12s |
| log | [`logs/01`](logs/01-clean-bootstrap-scratch_boot_b.log) | [`logs/02`](logs/02-clean-bootstrap-scratch_boot_c.log) |

Re-run of each, unchanged command: **0 OK / 637 SKIP / 0 FAIL**, exit 0
([`logs/03`](logs/03-rerun-idempotent-scratch_boot_b.log),
[`logs/04`](logs/04-rerun-idempotent-scratch_boot_c.log)).

Twelve seconds is not a typo. The seventeen minutes quoted in `replay-chain-cold.mjs`'s header was
network round-trips to a remote database, not work.

### 2. Interrupted mid-chain and resumed — **PASS**

Interrupted for real, not simulated. A watcher polled the log and sent `SIGKILL` the moment 346
migrations had committed; `kill -0` afterwards confirms the process was gone. The kill point was
chosen so that `0628` (journal position 350) and `0652` (position 370) — the pair that historically
exposed the ordering defect — fall in the **resumed** half.

    SIGKILL sent at OK_count=346  last_line=OK    [0624_inventory_sku_uniqueness_restored]
    killed=1   process_alive_after=no

State immediately after the kill, with entry 347 `0625_relocation_copy_progress` in flight:

    ledger rows                                     346      (== OK lines printed)
    tables                                          977
    backends still attached to scratch_boot_d       0
    organization_relocations exists                 true
    columns added by 0625 present                   0 of 4   (on the finished build: 4 of 4)

The in-flight migration left **nothing** behind. That is ticket 01's per-migration `sql.begin`
holding under a hard kill: "applied" and "recorded" move together.

| phase | OK | SKIP | FAIL | result | exit | log |
|---|---|---|---|---|---|---|
| interrupted | **346** | 0 | 0 | *(none — killed)* | SIGKILL | [`logs/06`](logs/06-interrupted-bootstrap-scratch_boot_d.log) |
| resume, same command, no flags | **291** | **346** | 0 | `REACHED_HEAD 637/637` | 0 | [`logs/07`](logs/07-resumed-bootstrap-scratch_boot_d.log) |
| third run | 0 | **637** | 0 | `REACHED_HEAD 637/637` | 0 | [`logs/08`](logs/08-rerun-idempotent-scratch_boot_d.log) |

346 + 291 = 637. `OK [0628_communication_actor_normalization]` and
`OK [0652_repair_chat_reaction_backfill]` both appear in the resumed half, as designed.

### 3. Catalog parity — **PASS, `differences=0` on every pair**

`VACUUM ANALYZE` was run on all three targets **before** any of these counts. Exit 0 on all three.

| category | b:c | b:d | c:d | count |
|---|---|---|---|---|
| tables | PASS | PASS | PASS | 1026 |
| columns | PASS | PASS | PASS | 13525 |
| constraints | PASS | PASS | PASS | 13989 |
| indexes | PASS | PASS | PASS | 5067 |
| policies | PASS | PASS | PASS | 966 |
| functions | PASS | PASS | PASS | 457 |
| triggers | PASS | PASS | PASS | 163 |
| extensions | PASS | PASS | PASS | 5 |
| enums (labels) | PASS | PASS | PASS | 2441 |
| rlsState | PASS | PASS | PASS | 966 |
| sequences | PASS | PASS | PASS | 770 |
| views | PASS | PASS | PASS | 0 |
| migrationLedger | PASS | PASS | PASS | 637 |

    RESULT: SCHEMAS IDENTICAL  differences=0     (x3)

Logs: [`b:c`](logs/09-catalog-parity-b-vs-c.log) · [`b:d`](logs/10-catalog-parity-b-vs-d.log) ·
[`c:d`](logs/11-catalog-parity-c-vs-d.log).

**Informational fourth**, not part of the claim: `scratch_boot_b` vs `scratch_boot_a` — ticket 01's
cold build, produced ~45 minutes earlier in a different session — is also `differences=0`
([`logs/12`](logs/12-catalog-parity-b-vs-a-informational.log)). Four independent cold builds, one
catalog. Read-only; nothing was written to `scratch_boot_a` by ticket 02.

Read C1 before citing any of this. These are the first parity numbers taken with a comparator that
compares definitions.

### 4. Gates, exit codes read

| gate | ran? | result |
|---|---|---|
| `check-migration-ledger.mjs` — `scratch_boot_b` | ran | exit 0 — 637 applied vs 637 journal, watermark 1803000010087, 0 pending, no orphan/duplicate/unreachable ([log](logs/15-check-migration-ledger-b.log)) |
| `check-migration-ledger.mjs` — `scratch_boot_c` | ran | exit 0 — identical ([log](logs/16-check-migration-ledger-c.log)) |
| `check-migration-ledger.mjs` — `scratch_boot_d` | ran | exit 0 — identical ([log](logs/17-check-migration-ledger-d.log)) |
| `check-migration-discipline.mjs` | ran | exit 0 — 637 SQL files checked, 0 new violations ([log](logs/18-check-migration-discipline.log)) |
| `check-migration-rollback.mjs` | ran | exit 0 — 637 migrations scanned, all rollback type-name checks passed ([log](logs/19-check-migration-rollback.log)) |
| `verify-migration-chain.mjs --self-test` | ran | exit 0 — **18 passed / 0 failed** ([log](logs/20-verify-migration-chain-selftest.log)) |
| `verify-migration-chain.mjs` against `scratch_boot_b` | ran | exit 0 — check (f) `RAN`, watermark 1803000010087 ([log](logs/21-verify-migration-chain-local-b.log)) |
| `compare-bootstraps.mjs --self-test` | ran | exit 0, 6/6 |
| `reset-scratch-db.mjs --self-test` | ran | exit 0, 8/8 |
| `seed-scratch-e2e.mjs --self-test` | ran | exit 0, 4/4 |

**Gates that did NOT run, and are not passing:**

| gate | status | why |
|---|---|---|
| `verify-migration-chain.mjs` check (f) with `sslmode=require` forced on a plaintext server | **SKIP — did not run** | printed `SKIP (f) applied watermark — DATABASE_URL is set but unreadable` ([log](logs/22-verify-migration-chain-skip-shape.log)). The overall gate still exits 0 by design, because a CI runner legitimately cannot reach a database. **A green `verify-migration-chain` therefore does not by itself mean check (f) ran.** Read the `RAN`/`SKIP` line. |
| full backend build, full frontend build | **not run** | outside ticket scope; the PRD lists them as open final-integration gates |
| full backend / frontend typecheck | **not run in this bundle** | the orchestrator measured them at session start (backend exit 0; frontend 22 errors, all in the stale generated `.next/types/validator.ts`) |
| full Jest suites, complete disposable E2E | **not run** | outside ticket scope |
| head-**639** bootstrap parity (0992, 0993) | **not run** | those migrations were journalled after these runs completed |
| ACL comparison between targets | **not run** | the comparator does not read ACLs — see C4 |

Before ticket 02's fix, `verify-migration-chain`'s check (f) hardcoded `ssl: "require"` and its
`catch` returned `null`, which the checker treated as "no database reachable — skip". The result was
a check that silently did not run and reported `PASS`. Ticket 01 verified (f) by hand for exactly
that reason. The three outcomes are now distinct and printed.

### 5. The scratch-database refusal fires — **PASS**

    seed-scratch-e2e.mjs   against a database named "postgres"   exit 1   (logs/23)
    reset-scratch-db.mjs   against a database named "postgres"   exit 2   (logs/24)
      "...must name a scratch database (its name must contain \"scratch\").
       This script drops every schema in it."
    the refused database afterwards: public schema still present  true
    accepted path against a real scratch database: exit 0, 2 tables -> 0, 5 extensions

This matters because `reset-scratch-db.mjs` previously guarded a `DROP SCHEMA … CASCADE` with a
**two-name denylist** (`neondb`, `cell2`) and let every other name through. A mistyped or
copy-pasted URL — a cell, a staging database, a colleague's branch — would have been emptied without
a word.

---

## Defects found while producing this evidence

Recorded here because a reviewer needs to know that these gates were producing wrong answers, and
for how long.

| id | severity | gate | defect | state |
|---|---|---|---|---|
| D1 | P1 | `compare-bootstraps.mjs` | exit code was set by an imported module's unrelated prerequisite check; clean parity exited 2 | fixed (ticket 02) |
| D2 | P1 | `compare-bootstraps.mjs` | compared object **names**, not definitions — see C1 | fixed (ticket 02) |
| D3 | P1 | `reset-scratch-db.mjs` | `DROP SCHEMA … CASCADE` guarded by a two-name denylist | fixed (ticket 02) |
| D4 | P2 | `verify-migration-chain.mjs` | check (f) hardcoded `ssl:"require"`, `catch`→`null`, silently skipped and reported PASS | fixed (ticket 02) |
| F4 | P1 | `db-bootstrap.mjs` | cold bootstrap only replayed as the role `neondb_owner`; 152 unqualified `current_org_id()` refs across 7 files | fixed (ticket 01) |
| F5 | P1 | `db-bootstrap.mjs` | could not replay a migration using `ON COMMIT DROP`; migrations were not atomic | fixed (ticket 01) |
| F7 | P2 | migration `0990` | a silent no-op unless the `permissions` catalog is already synced by an API boot — **and it bumps `access_versions` anyway**, busting every cached permission resolution for the org while changing nothing | **open** — order dependency, boot the API once then run 0990 |
| F8 | P2 | `check:migration-rollback` | `0990`/`0991` had neither a `.down.sql` nor an `-- @irreversible`/`-- @data-loss` declaration | fixed (ticket 01) |
| — | P1 | schema | 4 single-column tenant FKs, 2 of them `ON DELETE CASCADE`, on `credit_notes` / `vendor_credits` / `credit_note_items` / `vendor_credit_items` — a delete in one org can reach a child row pinned to another | **open**, needs a migration |
| — | P1 | schema | 16 `inv_*` tables with `org_id`, full app-role DML, no policy — see C3 | **open**, ticket 08 |
| — | P2 | schema | 3 tables with no index leading on the tenant column (`communication_backfill_issues`, `subprocessor_subscribers`, `support_ticket_tags`); 516 → 6 buffers measured at 50k rows across 20 orgs | **open** |
| — | P2 | lint | `npx eslint` reports `no-undef` for `console`/`process` across `src/scripts/**/*.mjs` — the flat config declares no Node globals. Pre-existing across every script in the folder, but the backend lint gate cannot be green while these files exist | **open**, not a regression |

---

## Sanitization

**No connection string appears anywhere in this bundle.** Verified, not assumed. The recorder ran
this over every retained file before it was copied in and again after:

    grep -rnaEi 'postgres(ql)?://|scratchpw|neon\.tech|password|passwd|secret|api[_-]?key|token|sslmode|channel_binding|Bearer |sk-[A-Za-z0-9]|AKIA|-----BEGIN' .

Every surviving hit is benign and was read individually:

- migration **tag names** that contain the words token/secret (`0384_rls_public_token_read`,
  `0390_api_token_hardening`, `0459_chat_invite_token_at_rest`, `0269_mailbox_push_secret`,
  `0787_workflow_secrets_encrypt_rls`) — these are file names, printed by the bootstrap;
- `verify-migration-chain`'s self-test case **names** (`an explicit sslmode=require on loopback is
  honoured`) — no URL is printed, only the outcome;
- the dotenvx banner `◇ injected env (55) from .env` — a count, no values;
- the comparator's identity line `127.0.0.1:5432/scratch_boot_b as tarunchintakunta` — loopback
  `host:port/database as role`, **no scheme and no credentials**. This is the *database identity*
  the ticket requires be recorded, and it is deliberately kept.
- `logs/05-interrupt-harness-scratch_boot_d.sh` carries `export DATABASE_URL="<redacted-connection-string>"`
  — redacted at the time it was written, so the harness is retained without its target URL.

**Finding — the superseded artifacts in the parent directory are NOT clean by this rule.**
`s02-bootstrap-parity.md`, `parity-boot-b-vs-c.log` and `parity-boot-b-vs-c-v2.log` each contain
password-redacted but otherwise complete connection URIs naming a real remote endpoint, the role
`neondb_owner` and the databases `neondb` / `cell2`, e.g.
`postgresql://<role>:***@<endpoint-host>/<db>?sslmode=require&channel_binding=require`.
The recorder did **not** rewrite them: they are hashed evidence and rewriting them silently would
destroy the chain of custody. This is reported for an owner to decide. Details and exact locations
are in [`../SUPERSEDED-FORMER-HEAD.md`](../SUPERSEDED-FORMER-HEAD.md).

**Second finding — the former `../artifact-hashes.json` no longer verifies.** The recorder re-hashed
all 13 files it covers: **11 match, both narrative documents do not.**
`s02-bootstrap-parity.md` and `s02-tenant-integrity.md` were edited after their hashes were sealed
and the hash file was never updated, so that evidence set's integrity seal was already broken before
this bundle existed. The raw logs are intact. The recorder then prepended a superseded banner to
those two documents and recorded all three hash states — sealed, pre-banner, post-banner — in
[`../SUPERSEDED-FORMER-HEAD.md`](../SUPERSEDED-FORMER-HEAD.md). `../artifact-hashes.json` itself was
left untouched, because rewriting it would erase the evidence that it had stopped verifying.

---

## Contents and how to verify them

| file | what it is |
|---|---|
| `README.md` | this record |
| `manifest.json` | the same facts, machine-readable |
| `artifact-hashes.json` | sha256 of every other file in this directory |
| `journal-637-file-hashes.txt` | sha256 of each of the 637 `.sql` files, in journal order |
| `rls-no-policy-2026-09-02.txt` | live `pg_catalog` RLS coverage, re-measured for this bundle |
| `logs/01`–`logs/24` | the sanitized run logs, in the order the runs happened |

Recompute the bundle hashes:

    cd architecture-refactor/final-refactor/evidence/bootstrap-head-637
    find . -type f ! -name artifact-hashes.json | sort | xargs shasum -a 256

Re-derive the chain digest for the 637 files (needs the backend repo at these migration files):

    # per-file hashes are already listed in journal-637-file-hashes.txt;
    # chain digest = sha256 of "<tag>:<sha256>" lines joined by "\n", in journal order.
