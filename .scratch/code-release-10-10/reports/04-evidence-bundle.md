# S1 / ticket 04 — the current-head evidence bundle

Recorder ticket. I edited no source, script, migration or schema. No git command was run; both SHAs
were read with `cat .git/refs/heads/main`. Every number below is either quoted from a retained log or
was produced by a command I ran and read.

## What was built

    architecture-refactor/final-refactor/evidence/
    ├── SUPERSEDED-FORMER-HEAD.md          (new — marks the 634-entry set)
    └── bootstrap-head-637/                (new — 28 files, 314,720 bytes)
        ├── README.md                      the record, caveats first
        ├── manifest.json                  the same facts, machine-readable
        ├── artifact-hashes.json           self-verifies 28/28, mismatches=0
        ├── journal-637-file-hashes.txt    sha256 of each of the 637 .sql, journal order
        ├── rls-no-policy-2026-09-02.txt   live pg_catalog RLS coverage, re-measured
        └── logs/01–24                     the sanitized runs, in the order they happened

All five ticket boxes are ticked with per-box evidence in
`.scratch/code-release-10-10/issues/04-bootstrap-evidence-bundle.md`.

## Independent verification I ran, rather than trusting the source reports

- **Both journal digests reproduce exactly.** Recomputing over the 637 `.sql` files gives chain
  digest `c2f7f626…ded6d4` and hash-set digest `6651dc09…1bde9b` — ticket 02's values byte for byte.
  The recipe is published in the bundle so a reviewer can repeat it.
- **All OK/SKIP/FAIL counts re-derived by line-counting the logs**, not copied: 637/0/0 · 637/0/0 ·
  346/0/0 (killed) · 291/346/0 · 0/637/0 ×3. 346 + 291 = 637 checked.
- **Database identity re-read from `pg_database`**: oids `b` 3983708, `c` 3983709, `d` 3983710 match
  ticket 02.
- **The 22 no-policy tables re-measured from `pg_catalog`**: 988 org-bearing / 966 RLS-with-policy /
  22 none = 16 `inv_*` + 6 justified platform-global. Reproduces report 03 exactly.
- **Sanitization actively checked**, not trusted: the full credential grep over every retained file
  before and after copying, with each surviving hit read individually.

## P1/P2 findings — new, from doing this ticket

- **P1 — the journal moved to 639 mid-session and nothing has proven it.**
  `0992_set_null_referential_actions_repair` (mtime 17:18:20) and
  `0993_coupons_tenant_scoped_code_unique` (17:21:28) were journalled by concurrent lanes *after*
  ticket 02's bootstraps finished (17:02–17:14). Journal file sha is now
  `47f752d6…b3b61e6e8`, chain digest `0174f6c9…1cfe0e91`. Head-637 parity is not head-639 parity;
  a fresh pair of clean bootstraps is needed before the release can claim current-head parity again.
  The PRD's "635" is stale in the *other* direction. **Recorded in the bundle; deliberately not
  "fixed" elsewhere in the PRD — lines 19, 65, 66 and 79 still say 635 and belong to other tickets.**
- **P2 — the former `evidence/artifact-hashes.json` no longer verifies.** Re-hashing its 13 files:
  **match=11, mismatch=2.** `s02-bootstrap-parity.md` and `s02-tenant-integrity.md` were edited after
  their hashes were sealed and the hash file was never updated. The 11 raw logs are intact. I
  recorded all three hash states (sealed / pre-banner / post-banner) rather than rewriting the seal.
- **P2 — the superseded artifacts disclose a real remote endpoint.** `parity-boot-b-vs-c.log` (2, 3,
  8, 9), `parity-boot-b-vs-c-v2.log` (2, 3, 298, 299) and `s02-bootstrap-parity.md` (4, 72) contain
  password-redacted but otherwise complete connection URIs naming a real Neon endpoint host, the role
  `neondb_owner` and the databases `neondb` / `cell2`. The old hash file states a weaker rule than
  the release rule: *"redacted to `postgresql://user:***@host` before hashing"*. **I did not rewrite
  them** — they are hashed evidence and silently editing it destroys the chain of custody. Two honest
  options are written up in `SUPERSEDED-FORMER-HEAD.md`: scrub and re-hash with the pre-scrub hashes
  recorded, or delete the superseded set outright. **Needs an owner.**
- **P2 — the scratch estate has drifted since capture.** `scratch_boot_c` is now at **639** ledger
  rows with **1** organization; `scratch_boot_d` carries **2** organizations and grew 106 → 156 MB.
  Re-running the parity comparison today will not reproduce the recorded numbers. `scratch_boot_a`
  and `scratch_boot_b` are unchanged (637, 0 orgs). The logs are the evidence; the databases are not.

## Caveats carried into the bundle as prominently as the passes

README leads with four caveats before any result: **C1** the comparator compared object *names*
until the fix that shipped with this evidence, so no earlier parity claim — including the whole
634-entry set — meant what it appeared to; **C2** four tenant gates were green because they could not
see (0→4 actionable, 0→16 violations, 745/745→823/828, and a mid-bootstrap guard that was inert);
**C3** 22 org-bearing tables with no RLS policy, 16 of them a live exposure with a demonstrated
cross-tenant read on `inv_customer_shelf_life_rules`, state as of my writing with ticket 08 not
landed; **C4** `scratch_boot_a`'s ACLs were changed by ticket 03's `db:bootstrap-role`, so a future
ACL-aware comparison will see a delta that is not a bootstrap difference.

The bundle also carries an explicit **"Gates that did NOT run, and are not passing"** table:
`verify-migration-chain` check (f) under forced TLS printed `SKIP` while the gate still exited 0
(recorded as SKIP, with the warning that a green gate does not mean (f) ran); full builds, full
typechecks, full Jest, complete E2E, head-639 parity and any ACL comparison are all recorded as
not run.

## Files changed

- `architecture-refactor/final-refactor/evidence/bootstrap-head-637/**` (new, 28 files)
- `architecture-refactor/final-refactor/evidence/SUPERSEDED-FORMER-HEAD.md` (new)
- `architecture-refactor/final-refactor/evidence/s02-bootstrap-parity.md` (superseded banner prepended; nothing below it altered)
- `architecture-refactor/final-refactor/evidence/s02-tenant-integrity.md` (same)
- `architecture-refactor/PRD-10-10-CODE-RELEASE-TODO.md` (lines 76–77 of the verification snapshot only)
- `.scratch/code-release-10-10/issues/04-bootstrap-evidence-bundle.md` (five ticks + evidence)

`evidence/artifact-hashes.json` was deliberately **not** touched, so its broken seal stays visible.

## Other agents' territory

- PRD lines 19, 65, 66 and 79 still say the journal has **635** entries and still cite the 634-entry
  evidence as the tenant-relationship and tenant-index baseline. Those are ticket 03/07/08 claims;
  I flagged them rather than editing them.
- Nothing in this session touched the configured `DATABASE_URL`, any migration, any script or any
  schema file.
