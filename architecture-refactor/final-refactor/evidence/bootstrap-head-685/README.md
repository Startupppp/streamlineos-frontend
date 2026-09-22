# bootstrap-head-685 — migration and bootstrap evidence at journal head 685

Retained for **PRD-C056** ("Retain release SHA, commands, database identity, journal hash/count,
catalog diff, sanitized logs and artifact hashes for the current-head bootstrap and migration
evidence") and re-proving **PRD-C055** ("two independent clean bootstraps and an interrupted-then-
resumed bootstrap … must match exactly") at the current head rather than a former one.

`manifest.json` is the machine-readable form of everything below. This file is the narrative.

## Why this bundle exists, and what went wrong with the last one

`../bootstrap-head-637/` is the same evidence at journal head **637**. The journal then moved to
**685** — 48 further migrations — and nothing failed. `check:evidence-seal` stayed green the whole
time, correctly: a seal proves the retained bytes did not change. It cannot notice that what those
bytes *describe* is no longer head. So the criterion's own words — "for the **current-head**
bootstrap" — quietly stopped being true, and the only way anyone would have found out is by reading
two numbers in two different files and comparing them by hand.

The gate added with this bundle, `check:bootstrap-evidence`, is exactly that comparison, automated.
It recomputes the live chain on every run and fails when no retained bundle describes it. Run
against the tree before this bundle existed it printed:

```
retained bundles: bootstrap-head-637
stale bootstrap-head-637 — 31 clause(s) do not hold
FAIL — no retained bundle describes the current migration chain.
  journal entries: bundle 637 != live 685
  journal head tag: bundle 0991_calendar_event_local_version != live 1061_push_endpoint_cross_tenant_claim
  chain digest: bundle c2f7f626… != live e441c268…
```

## Release identity

| | |
|---|---|
| backend | `streamlineos-backend` @ `b40e5377d5bfee97ef93783239c36a66fc5d979a` (`refs/heads/release/v2-closeout`) |
| frontend | `streamlineos-frontend` @ `f71698306832f623aad1596845cfcf61f578854b` (`refs/heads/release/v2-closeout`) |

**The SHA is provenance, not the invariant.** Nine sibling agents commit to this branch
continuously; a gate keyed to the commit id would be red on every unrelated commit while saying
nothing about the database. What determines the catalog a bootstrap reaches is the migration chain,
so that is what `check:bootstrap-evidence` compares against.

Both working trees carried uncommitted wave-1 work at capture. None of it touched `migrations/`,
and that is measured rather than asserted: the 637 bundle's own `chainDigest`
(`c2f7f6264fa839d859a20f4985af063becf6dd26fe30c7f6b3b9d5f4cdded6d4`) and `hashSetDigest`
(`6651dc090097f64517b45295c34e02218c7b1d640aefd1b98c0aa263ce1bde9b`) were recomputed from the tree
at capture over its first 637 entries and reproduced exactly, which proves entries `0000`–`0991`
are byte-identical to 2026-09-02.

## Journal hash and count

| | |
|---|---|
| journalled entries | **685** |
| first / head tag | `0000_light_vance_astro` / `1061_push_endpoint_cross_tenant_claim` |
| head `when` | `1803000010136` |
| `_journal.json` sha256 | `6e97e44ceb8f86d18548948bab084349148020254c41c3e0015f46e3d9d16b8e` |
| `_chain.sha256.json` sha256 | `4cc2f7c3c5cc8a33c424d7ab80189cdb22decfc61232bd6daa8ce81e035a5516` |
| chain digest | `e441c2687b99cdfee5a4257d75185041a8f1df74af647c5e87f5857ff7504da4` |
| hash-set digest | `78d8216316669566292ac2534d1618be0dd683ffefb0495fa528bdcc5eea016d` |
| per-file hashes | `journal-685-file-hashes.txt` (685 rows, `idx  when  tag  sha256`) |

Recipes, unchanged from the 637 bundle and revalidated against it:

```
chainDigest   = sha256( join('\n', ['<tag>:<sha256 of <tag>.sql>' in journal order]) )   # no trailing newline
hashSetDigest = sha256( join('\n', sorted(unique(sha256 of each <tag>.sql))) )           # no trailing newline
```

A variant with a trailing newline gives `398a662ae5d752177ea5cc6d5ff7b3137bb394e71de34243fa6bc666c65ee6e8`
over the same 685 files. That number circulates in this release's ticket-03 triage; it is the same
chain under a different recipe and is **not** the repository's canonical digest. Recorded here so the
two are never mistaken for a mismatch.

### Three .sql files on disk are not in the journal

`migrations/` holds **688** `.sql` files against **685** journal entries:

- `1062_mail_metadata_unread_count_index`
- `1063_invoice_item_immutability_trigger`
- `1064_revenue_events_currency`

`db:migrate` never applies a file with no journal entry, so **this bundle does not cover their DDL**.
They belong to sibling tickets in the same fix wave, and `migrations/meta/_journal.json` is a
serialized lane owned by the release orchestrator. `check:migration-discipline` and
`check:migration-chain` both name all three; the red chain log is retained at
`logs/11-verify-migration-chain-RED.log` rather than omitted, because a bundle that keeps only its
green logs is a press release. This is a known pending condition of the wave, not a finding here.

**When those three are journalled the chain moves to 688 and this bundle stops describing head.**
`check:bootstrap-evidence` will fail at that moment. That is the intended behaviour: recapture (see
below), do not edit the numbers.

## Database identity

PostgreSQL **18.4 (Homebrew)** on `aarch64-apple-darwin25.4.0`, `127.0.0.1:5432`, connecting role
`tarunchintakunta`. No connection string is recorded anywhere in this bundle, by rule.

| database | oid | shape | tables before → after | ledger rows | watermark | orgs | size |
|---|---:|---|---|---:|---:|---:|---:|
| `scratch_t03w1_a` | 8651459 | clean bootstrap #1 | 0 → 1027 | 685 | 1803000010136 | 0 | 106 MB |
| `scratch_t03w1_b` | 8651460 | clean bootstrap #2, independent | 0 → 1027 | 685 | 1803000010136 | 0 | 106 MB |
| `scratch_t03w1_ir` | 8651461 | SIGKILL ×3 at 150/400/600, then resumed | 0 → 1027 | 685 | 1803000010136 | 0 | 106 MB |

1027 counts every non-system relation including `drizzle.__drizzle_migrations`; the 944 figure quoted
elsewhere in this release counts `pg_tables` in `public` only. All three targets hold **0
organizations** — no seed data, no probe residue.

## Commands

Run from the backend repository root, `DATABASE_URL` exported per target:

```
DATABASE_URL=<a>  node src/scripts/db-bootstrap.mjs
DATABASE_URL=<b>  node src/scripts/db-bootstrap.mjs
node src/scripts/bootstrap-interrupt-resume.mjs --url=<ir> --kill-at=150,400,600 \
     --json=interrupt-resume-invariants.json
node src/scripts/compare-bootstraps.mjs --a=<a> --b=<b>
node src/scripts/compare-bootstraps.mjs --a=<a> --b=<ir>
DATABASE_URL=<target> node src/scripts/check-migration-ledger.mjs      # a, b, ir
node src/scripts/check-migration-immutability.mjs
node src/scripts/check-migration-rollback.mjs
DATABASE_URL=<a>  node src/scripts/verify-migration-chain.mjs          # exit 1, see above
```

`check-bootstrap-evidence` asserts that every recorded command names a script that still exists, so
a renamed or deleted script fails this bundle instead of leaving an unrunnable recipe behind.

## Catalog diff

Both comparisons are `compare-bootstraps.mjs`, which compares each object's **definition** —
`pg_get_constraintdef`, `indexdef`, policy cmd/roles/qual/with_check, function identity arguments and
body digest, `pg_get_triggerdef` — not just its name.

| category | clean #1 | clean #2 | interrupted/resumed |
|---|---:|---:|---:|
| tables | 1027 | 1027 | 1027 |
| columns | 13536 | 13536 | 13536 |
| constraints | 14026 | 14026 | 14026 |
| indexes | 4767 | 4767 | 4767 |
| policies | 983 | 983 | 983 |
| functions | 470 | 470 | 470 |
| triggers | 169 | 169 | 169 |
| extensions | 5 | 5 | 5 |
| enums | 2325 | 2325 | 2325 |
| RLS state | 983 | 983 | 983 |
| sequences | 771 | 771 | 771 |
| views | 0 | 0 | 0 |
| migration ledger | 685 | 685 | 685 |

`RESULT: SCHEMAS IDENTICAL  differences=0` on both, exit 0 on both
(`logs/04-catalog-parity-a-vs-b.log`, `logs/05-catalog-parity-a-vs-ir.log`).

The interrupted run's own invariants — that the ledger never runs ahead of the DDL, that no backend
is left attached, and that the in-flight migration left nothing behind — are in
`interrupt-resume-invariants.json` and `logs/03-…`: **3 interruptions, 0 invariant failures**, resume
reached `85 ok + 600 skip = 685 / 685`, and the idempotency re-run was `0 ok + 685 skip`.

## Sanitized logs

Eleven logs under `logs/`. No redaction was applied and none was needed: every producing script
identifies its target by host/port/database/role and never prints a connection string, so the bytes
on disk are already free of credentials. That is not taken on trust —
`check-bootstrap-evidence` re-scans every retained log on every run and fails the bundle if one
carries a connection string, a credential, a hosted-Postgres hostname or a TLS-mode parameter. The
hashes below were taken **after** sanitization was confirmed, so the seal covers the sanitized bytes.

## Artifact hashes

`artifact-hashes.json` seals every file in this directory tree with sha256 over the exact bytes on
disk. Two independent gates read it:

- `pnpm check:evidence-seal` — verifies each hash, fails on a changed file, a missing file, or an
  unsealed file appearing beside sealed ones.
- `node src/scripts/check-bootstrap-evidence.mjs` — asserts no file in the tree is outside the seal,
  so evidence cannot be added after sealing.

## Recapture

Required whenever the migration chain moves. Do **not** hand-edit the digests.

1. `createdb` three fresh scratch databases.
2. Re-run the two clean bootstraps and the interrupt/resume run above.
3. Re-run both `compare-bootstraps.mjs` comparisons; both must be `differences=0`.
4. Copy this directory to `bootstrap-head-<new n>/`, replace the logs, and update
   `manifest.json`'s `journalAtProofCapture`, `releaseIdentity` and `databaseIdentity`.
5. Reseal: sha256 of every file into `artifact-hashes.json`.
6. `node src/scripts/check-bootstrap-evidence.mjs` must exit 0 and `pnpm check:evidence-seal` must
   stay at exit 0.

Keeping the superseded bundle is fine — the gate passes when **any** retained bundle describes the
live chain, and names the stale ones without failing on them.
