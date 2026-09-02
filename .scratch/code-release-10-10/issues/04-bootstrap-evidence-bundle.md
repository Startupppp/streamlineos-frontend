# 04 — Retain the bootstrap and migration evidence bundle

**What to build:** A durable, hashed evidence record for the current-head database work, so a later reviewer can tell what was proven, at which commit, against which database — and cannot mistake the older evidence for current.

**Blocked by:** 02, 03.

**Status:** done

**Bundle:** `architecture-refactor/final-refactor/evidence/bootstrap-head-637/`
**Superseded-evidence notice:** `architecture-refactor/final-refactor/evidence/SUPERSEDED-FORMER-HEAD.md`

- [x] The bundle records release SHA, every command run, database identity, dataset shape, journal hash and count, catalog diff and artifact hashes.
      Evidence: `bootstrap-head-637/README.md` + `manifest.json`. FE SHA `e33873d6cccca8166fa5dad69aec3dd6679a0b3f`, BE SHA `5ba6bbd7fabb8990d0462bafb10514209a7af90c`, both read with `cat .git/refs/heads/main` (no git command run); the SHA ticket 02 recorded at proof capture (`6795e0377ce…`) is also carried, and the uncommitted-working-tree caveat is stated. Journal head 637, `_journal.json` sha256 `23ee3f5a…8002f7`, chain digest `c2f7f626…ded6d4`, hash-set digest `6651dc09…1bde9b` — the recorder **independently reproduced both digests** from the 637 `.sql` files and they match ticket 02 byte for byte; the recipe is published. Per-file sha256 for all 637 in `journal-637-file-hashes.txt`. Database identity by oid (`b` 3983708, `c` 3983709, `d` 3983710, `a` 3795068), re-read from `pg_database`; dataset shape 0 orgs / 0 users / no residue. Catalog diff = 13 categories × 3 pairs, all `differences=0`. `artifact-hashes.json` covers 28 files / 314,720 bytes and self-verifies **28/28, mismatches=0**.

- [x] Sanitized logs only — no connection string appears in any retained artifact.
      Evidence: `grep -rnaEi 'postgres(ql)?://|scratchpw|neon\.tech|password|passwd|secret|api[_-]?key|token|sslmode|channel_binding|Bearer |sk-[A-Za-z0-9]|AKIA|-----BEGIN'` over the bundle before and after copying. Zero real hits; every surviving hit was read individually and is a migration **tag name** (`0390_api_token_hardening`), a self-test **case name**, the dotenvx `injected env (55)` banner, or the deliberate loopback identity line `127.0.0.1:5432/scratch_boot_b as tarunchintakunta` (no scheme, no credentials). `logs/05-interrupt-harness-scratch_boot_d.sh` carries `DATABASE_URL="<redacted-connection-string>"`, redacted when written.
      FINDING (not this bundle, needs an owner): the **superseded** artifacts in the parent directory are not clean by this rule. `parity-boot-b-vs-c.log` (lines 2, 3, 8, 9), `parity-boot-b-vs-c-v2.log` (2, 3, 298, 299) and `s02-bootstrap-parity.md` (4, 72) contain password-redacted but otherwise complete connection URIs naming a real remote endpoint host, the role `neondb_owner` and the databases `neondb` / `cell2`. Not rewritten — they are hashed evidence. Recorded in `SUPERSEDED-FORMER-HEAD.md` with two honest options (scrub and re-hash with the pre-scrub hashes recorded, or delete the superseded set).

- [x] Pass/fail/skip counts are recorded literally. A gate that did not run is reported as not run, never as passing.
      Evidence: every OK/SKIP/FAIL number was produced by the recorder counting lines in the retained log (`grep -c '^OK  '` etc.), not copied from a summary — clean b 637/0/0, clean c 637/0/0, re-runs 0/637/0 ×3, interrupted d 346/0/0 (killed, no RESULT line), resume 291/346/0, and 346+291=637 checked. The bundle carries an explicit **"Gates that did NOT run, and are not passing"** table: `verify-migration-chain` check (f) under forced TLS printed `SKIP` while the gate still exited 0 — recorded as SKIP with the warning that a green gate does not mean (f) ran; plus full builds, full typechecks, full Jest, complete E2E, head-639 parity and any ACL comparison, all recorded as not run.

- [x] The superseded evidence is explicitly marked as covering the former head, so it cannot be cited as current-head proof.
      Evidence: new `SUPERSEDED-FORMER-HEAD.md` names all 13 former-head artifacts in a table, states the 634 / 635 / 637 / 639 count history, and explains why the old `differences=0` did not mean catalog equality. A `⛔ SUPERSEDED — FORMER HEAD` banner was prepended to `s02-bootstrap-parity.md` and `s02-tenant-integrity.md` (nothing below it altered).
      FINDING while doing this: the former `artifact-hashes.json` **no longer verifies** — re-hashing all 13 gives **match=11, mismatch=2**; both narrative documents were edited after their hashes were sealed and the hash file was never updated. All three hash states (sealed / pre-banner / post-banner) are recorded in `SUPERSEDED-FORMER-HEAD.md`; `artifact-hashes.json` itself was left untouched so the broken seal stays visible.

- [x] The bundle is linked from the PRD's verification snapshot.
      Evidence: `architecture-refactor/PRD-10-10-CODE-RELEASE-TODO.md` line 76 is now a current-head bullet linking `final-refactor/evidence/bootstrap-head-637/README.md` with the literal counts and all four caveats; line 77 replaces the old bullet with `**SUPERSEDED — former head.**` linking `SUPERSEDED-FORMER-HEAD.md`. All four link targets confirmed to resolve on disk.

## Recorder findings the orchestrator needs

- **The journal moved from 637 to 639 during this session.** `0992_set_null_referential_actions_repair` (mtime 17:18:20) and `0993_coupons_tenant_scoped_code_unique` (17:21:28) were journalled by concurrent lanes *after* ticket 02's bootstraps finished (17:02–17:14). Nothing has proven them. The PRD's "635" is stale in the other direction. Recorded throughout the bundle; **not** fixed elsewhere in the PRD — lines 19, 65, 66 and 79 still say 635 and belong to other tickets.
- **The scratch estate has drifted since capture.** `scratch_boot_c` is now at **639** ledger rows with **1** organization; `scratch_boot_d` now carries **2** organizations and grew 106 → 156 MB. Re-running the parity comparison today will not reproduce the recorded numbers. `scratch_boot_a` and `scratch_boot_b` are unchanged at 637 / 0 orgs.
- **The 22 no-policy org-bearing tables were re-measured by the recorder, not copied.** 988 org-bearing / 966 RLS-with-policy / 22 none = 16 `inv_*` + 6 justified platform-global, on `scratch_boot_a` at bundle-writing time. Ticket 08 had not landed. Artifact: `bootstrap-head-637/rls-no-policy-2026-09-02.txt`.
