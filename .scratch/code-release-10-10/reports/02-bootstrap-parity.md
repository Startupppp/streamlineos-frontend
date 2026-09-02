# S1 / ticket 02 — current-head clean-bootstrap parity at the full journal

Every number below came from a command I ran and read the output of. No git command was run;
the SHA was read out of `.git/refs/heads/main` with `cat`. No connection string appears in this
file or in any tool output it quotes. No migration `.sql` was touched — the newest file under
`migrations/` still has ticket 01's 16:24 mtime, and all 637 hashes are unchanged.

## Release identity

| | |
|---|---|
| branch (`.git/HEAD`) | `refs/heads/main` |
| SHA (`.git/refs/heads/main`) | `6795e0377cebae7955e352f41d231f991a17670c` |
| working tree | carries this release's **uncommitted** changes (tickets 01–NN); the SHA alone does not describe what was built |
| journal entries | **637** (`0000_light_vance_astro` … `0991_calendar_event_local_version`) |
| journal head `when` | `1803000010087` |
| `_journal.json` sha256 | `23ee3f5a9dc1b05f1a1567ef070e025ed536a9ab0106405a979484f3848002f7` |
| chain digest (sha256 over `tag:sha256(file)` for all 637, in journal order) | `c2f7f6264fa839d859a20f4985af063becf6dd26fe30c7f6b3b9d5f4cdded6d4` |
| journal hash-set digest | `6651dc090097f64517b45295c34e02218c7b1d640aefd1b98c0aa263ce1bde9b` |

Server: PostgreSQL 18.4 (Homebrew) on `127.0.0.1:5432`. All three bootstraps ran as
`tarunchintakunta` — a superuser with **no per-role `search_path`**, unlike `neondb_owner`, which
still carries `search_path="$user", public, build_events, app` cluster-wide from migration `0431`.
That role choice is deliberate: it is what makes the run a test of ticket 01's fix rather than of
the environment.

## Targets

| database | oid | tables | ledger rows | ledger hash-set digest | analysed |
|---|---|---|---|---|---|
| `scratch_boot_b` | 3983708 | 1027 | 637 | `6651dc09…de9b` | 1027/1027 |
| `scratch_boot_c` | 3983709 | 1027 | 637 | `6651dc09…de9b` | 1027/1027 |
| `scratch_boot_d` | 3983710 | 1027 | 637 | `6651dc09…de9b` | 1027/1027 |

All three ledger hash-sets equal the journal's, so what is recorded as applied is byte-for-byte the
637 files on disk right now. (1027 counts `drizzle.__drizzle_migrations`; the catalog comparison
excludes the `drizzle` schema and therefore reports 1026.) `scratch_boot_a` was **not** written to —
it belongs to ticket 03; it was only read, once, for the informational fourth comparison below.

Each database was dropped and recreated empty immediately before use and confirmed at 0 tables.

## Commands

From `/Users/tarunchintakunta/Personal/streamline/streamlineos-backend`, with
`DATABASE_URL` / `DIRECT_DATABASE_URL` overridden per target so `.env` is never used:

    node src/scripts/db-bootstrap.mjs                              # clean build ×2, resume ×1, idempotency ×3
    node src/scripts/compare-bootstraps.mjs --a=<x> --b=<y>        # b:c, b:d, c:d, b:a
    node src/scripts/verify-migration-chain.mjs [--self-test]
    node src/scripts/check-migration-ledger.mjs                    # ×3 targets
    node src/scripts/check-migration-discipline.mjs
    node src/scripts/check-migration-rollback.mjs
    node src/scripts/seed-scratch-e2e.mjs --self-test              # + one live refusal
    node src/scripts/reset-scratch-db.mjs --self-test              # + one live refusal, one live accept
    psql … -c "VACUUM ANALYZE;"                                    # ×3 targets

## 1. Two independent clean bootstraps — PASS

| | `scratch_boot_b` | `scratch_boot_c` |
|---|---|---|
| tables before | 0 | 0 |
| result | `REACHED_HEAD 637/637` | `REACHED_HEAD 637/637` |
| exit code | 0 | 0 |
| OK / SKIP / FAIL / retries | 637 / 0 / 0 / 0 | 637 / 0 / 0 / 0 |
| wall clock | 13s | 12s |
| re-run (idempotency) | 0 OK / **637 SKIP** / exit 0 | 0 OK / **637 SKIP** / exit 0 |

Twelve seconds is not a typo: the chain is quick against loopback Postgres. The seventeen minutes
in `replay-chain-cold.mjs`'s header was network round-trips to Neon, not work.

## 2. Interrupted mid-chain and resumed — PASS

Interrupted for real, not simulated. A watcher polled the log and sent `SIGKILL` to the bootstrap
process the moment it had committed 346 migrations; `kill -0` afterwards confirms the process was
gone. The kill point was chosen so that `0628` (journal position 350) and `0652` (position 370) —
the pair that historically exposed the ordering defect — fall in the **resumed** half.

    SIGKILL sent at OK_count=346  last_line=OK    [0624_inventory_sku_uniqueness_restored]
    killed=1   process_alive_after=no

State immediately after the kill, with entry 347 `0625_relocation_copy_progress` in flight:

    ledger rows                                     346      (== OK lines printed)
    tables                                          977
    backends still attached to scratch_boot_d       0
    organization_relocations exists                 true
    columns added by 0625 present                   0 of 4   (same query on the finished build: 4 of 4)

So the in-flight migration left nothing behind — ticket 01's `sql.begin` per migration holds under a
hard kill, and "applied" and "recorded" moved together. Resume, same command, no flags:

    exit=0  elapsed=5s  OK=291  SKIP=346  FAIL=0
    OK    [0628_communication_actor_normalization]
    OK    [0652_repair_chat_reaction_backfill]
    RESULT: REACHED_HEAD 637/637

346 + 291 = 637. A third run is 0 OK / 637 SKIP / exit 0.

## 3. Catalog parity — PASS, 0 differences on every pair

`VACUUM ANALYZE` was run on all three targets **before** any of these counts. Every pair, exit 0:

| category | b vs c | b vs d | c vs d | count |
|---|---|---|---|---|
| tables | PASS | PASS | PASS | 1026 |
| columns | PASS | PASS | PASS | 13525 |
| constraints | PASS | PASS | PASS | 13989 |
| indexes | PASS | PASS | PASS | 5067 |
| policies | PASS | PASS | PASS | 966 |
| functions | PASS | PASS | PASS | 457 |
| triggers | PASS | PASS | PASS | 163 |
| extensions | PASS | PASS | PASS | 5 |
| enums | PASS | PASS | PASS | 2441 |
| rlsState | PASS | PASS | PASS | 966 |
| sequences | PASS | PASS | PASS | 770 |
| views | PASS | PASS | PASS | 0 |
| migrationLedger | PASS | PASS | PASS | 637 |

    RESULT: SCHEMAS IDENTICAL  differences=0     (×3)

Informational fourth: `scratch_boot_b` vs `scratch_boot_a` — ticket 01's cold build, produced ~45
minutes earlier in a different session — is also `differences=0`. Read-only; nothing was written to
`scratch_boot_a`. Four independent cold builds, one catalog.

Physical size differs slightly (b/c 109 MB, d 106 MB). That is page layout, not catalog, and it is
what the comparison is designed to see past.

## 4. The scratch refusal fires — PASS

    seed-scratch-e2e.mjs --self-test                                   4/4 pass, exit 0
    SCRATCH_DATABASE_URL=<a database named "postgres">                 exit 1
      seed-scratch-e2e: refusing to seed database "postgres" — SCRATCH_DATABASE_URL
      must name a scratch database (its name must contain "scratch")

    reset-scratch-db.mjs --self-test                                   8/8 pass, exit 0
    SCRATCH_URL=<a database named "postgres">                          exit 2
      reset-scratch-db: refusing to reset database "postgres" — SCRATCH_URL must name
      a scratch database (its name must contain "scratch"). This script drops every schema in it.
    the refused database afterwards: public schema still present       true
    accepted path against a real scratch database                      exit 0, 2 tables → 0, 5 extensions

## Defects found and fixed

### D1 (P1) — `compare-bootstraps.mjs` exit code was not a function of its own result

The parity gate imported `diff` from `compare-cell-schema.mjs`. That module calls `main()` at top
level, so importing it **ran the entire cell-schema comparison**, which then set
`process.exitCode = 2` for a missing `APP_DATABASE_URL`. Measured on this machine before the fix:

    PREREQUISITE MISSING: APP_DATABASE_URL (the non-BYPASSRLS app role) is required.
    …
    RESULT: SCHEMAS IDENTICAL  differences=0
    exit=2

A clean parity reported failure. Any CI job keying on the exit code of this gate was reading another
script's prerequisite check. Fixed by making the comparator self-contained (its own six-line `diff`)
and ending with an explicit `process.exit(differences === 0 ? 0 : 1)`.

### D2 (P1) — the comparison compared names, not definitions

Nine of the ten categories keyed on the object's **name** alone. Two chains that produce
`CREATE INDEX ix ON t(a)` and `CREATE INDEX ix ON t(b)` were reported identical; so were a changed
constraint body, a changed policy `USING`/`WITH CHECK`, a rewritten function, a retargeted trigger,
a reordered enum, and an RLS table that is enabled versus enabled-and-**forced**. "Catalogs match
exactly" could not be claimed from it.

Each category now carries the definition — `pg_get_constraintdef` (plus deferrability and validity),
`indexdef`, policy `cmd`/`permissive`/`roles`/`qual`/`with_check`, function identity arguments,
result type, language, volatility, `SECURITY DEFINER` and body digest, `pg_get_triggerdef` plus
enabled state, extension version and schema, enum sort order, `relrowsecurity` **and**
`relforcerowsecurity`, and column default / identity / generated / collation. Sequences and views
were added, and the migration ledger (row count and watermark) is now a compared category.

Proven to fail, not just to pass. Two probe databases seeded with one deliberate difference per
class produced `differences=15`, exit 1, every category flagged — including the same-name index the
old version passed:

    FAIL  indexes    A=2  B=2  missing-in-B=1 extra-in-B=1
        MISSING IN B  public.probe_same_name :: CREATE INDEX probe_same_name ON public.probe USING btree (a)
        ONLY IN B     public.probe_same_name :: CREATE INDEX probe_same_name ON public.probe USING btree (b)

Both probe databases were dropped afterwards.

### D3 (P1) — `reset-scratch-db.mjs` guarded a `DROP SCHEMA … CASCADE` with a two-name denylist

It refused exactly `neondb` and `cell2` and let every other name through, then dropped `public`,
`app`, `build`, `build_events` and `drizzle` from it. A mistyped or copy-pasted URL — a cell, a
staging database, a colleague's branch — would have been emptied without a word. Replaced with the
same allowlist `seed-scratch-e2e.mjs` already uses (the name must contain `scratch`), with an
8-case `--self-test`. It also no longer prints the URL at all, only `host:port/database`.

### D4 (P2) — `verify-migration-chain.mjs` check (f) could not run locally, and said nothing

Two problems, one symptom. `ssl: "require"` was hardcoded, so against a local server with SSL off
the connection threw; and the `catch` returned `null`, which the checker treats as "no database
reachable — skip". The result was a check that silently did not run and reported `PASS`. Ticket 01
verified (f) by hand for exactly this reason.

TLS is now resolved from the URL: an explicit `sslmode` always wins, and with none, loopback
(`localhost`, `127.0.0.1`, `::1`, unix socket) gets no TLS while **everything else still defaults to
`require`** — the remote guarantee is unchanged, and eight self-test cases pin that, including
`ep-….neon.tech` → `require`. The three outcomes are now distinct and printed:

    RAN   (f) applied watermark — max created_at=1803000010087            (local scratch_boot_b, exit 0)
    SKIP  (f) applied watermark — DATABASE_URL is set but unreadable: …   (sslmode=require forced on a plaintext server)
    SKIP  (f) applied watermark — no DATABASE_URL, nothing to read        (the CI shape, exit 0)

The pass/fail contract is deliberately unchanged — an unreachable database still skips rather than
fails, because CI runners legitimately cannot reach one — but it can no longer be mistaken for a
clean run. And (f) now demonstrably fails against a real database: a throwaway scratch database
seeded with `created_at = 9999999999999` produced

    FAIL  migration chain has 1 issue(s):
      (f) WATERMARK AHEAD OF JOURNAL  applied max created_at=9999999999999 … exceeds the newest
      journal entry when=1803000010087 …
    exit=1

Self-test went from 10/10 to **18/18**.

## Neighbouring gates, exit codes read

| gate | result |
|---|---|
| `verify-migration-chain.mjs --self-test` | exit 0, 18 passed / 0 failed |
| `verify-migration-chain.mjs` (no DB, CI shape) | exit 0, `PASS  migration chain verified` |
| `verify-migration-chain.mjs` (local `scratch_boot_b`) | exit 0, check (f) **ran**, watermark 1803000010087 |
| `check-migration-ledger.mjs` ×3 targets | exit 0 each — "637 applied row(s) against 637 journal entr(ies) … 0 pending … no orphan, duplicate or unreachable" |
| `check-migration-discipline.mjs` | exit 0 |
| `check-migration-rollback.mjs` | exit 0, "637 migrations scanned … all rollback type-name checks passed" |
| `compare-bootstraps.mjs --self-test` | exit 0, 6/6 |
| `reset-scratch-db.mjs --self-test` | exit 0, 8/8 |
| `seed-scratch-e2e.mjs --self-test` | exit 0, 4/4 |

## Not mine — pre-existing, verified against a baseline

- **`npx eslint` on the three files I changed reports 67 `no-undef` errors for `console` and
  `process`.** The flat config declares no Node globals for `src/scripts/**/*.mjs`. Baseline: two
  scripts I did not touch (`replay-chain-cold.mjs`, `db-bootstrap.mjs`) report 13 of the same. This
  is a config gap across every script in the folder, not a regression — but it does mean the
  backend lint gate can never be green while these files exist.
- **`check-file-sizes.mjs` exits 1** on `gdpr-subject-erasure.service.ts` (619 lines) and
  `storage.service.ts` (521). Neither is in my territory; none of my files appear in its output.

## Files changed

- `/Users/tarunchintakunta/Personal/streamline/streamlineos-backend/src/scripts/compare-bootstraps.mjs` (D1, D2)
- `/Users/tarunchintakunta/Personal/streamline/streamlineos-backend/src/scripts/reset-scratch-db.mjs` (D3)
- `/Users/tarunchintakunta/Personal/streamline/streamlineos-backend/src/scripts/verify-migration-chain.mjs` (D4)
- `/Users/tarunchintakunta/Personal/streamline/streamlineos-frontend/.scratch/code-release-10-10/issues/02-current-head-bootstrap-parity.md` (six ticks + evidence)

`db-bootstrap.mjs` was **not** modified — ticket 01's `sql.begin` and per-connection `search_path`
are exactly as it left them (mtime 16:24/16:49, unchanged), and this ticket's evidence is a test of
that code, not of a further edit. `tsconfig.json` has no `allowJs`, so none of these `.mjs` files
reach `tsc --noEmit`; I ran `node --check` on each instead, all clean.

## Handoff

- `scratch_boot_b`, `scratch_boot_c`, `scratch_boot_d` are all at head (637, catalog-identical,
  vacuumed, analysed, **no seed data**). Any of them is a clean parity baseline.
- `scratch_boot_a` was left exactly as ticket 03 has it.
- `scratch_cmp_x`, `scratch_cmp_y`, `scratch_reset_probe`, `scratch_wm_probe` were created for the
  negative controls and dropped. Nothing of mine is left on the server beyond b/c/d.
- Logs for every run above: `…/scratchpad/t02/` (`boot-*.log`, `compare-*.log`, `refusal-*.log`,
  `negative-control.log`, `vmc-*.log`, `ledger-*.log`).
- Nothing in this session touched the configured `DATABASE_URL`.
