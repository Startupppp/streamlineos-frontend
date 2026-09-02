# Ticket 04b — evidence hygiene: redaction + re-seal of the superseded evidence set

Both defects handed to me are closed. No evidence file was deleted, nothing in
`bootstrap-head-637/` was modified, and no git command was run.

## Headline numbers

| | before | after |
|---|---|---|
| files swept (whole `evidence/` tree) | 48 | 49 (+1: the audit ledger) |
| remote-endpoint matches (`neon.tech` / `.aws.neon` / `ep-*`) | **10** in 3 files | **0** |
| connection URIs with a real host | 9 | 0 |
| `evidence/artifact-hashes.json` verification | **match=11 mismatch=2 missing=0 of 13** (exit 1) | **match=13 mismatch=0 missing=0 of 13** (exit 0) |
| `bootstrap-head-637/artifact-hashes.json` | 28/28, mismatch=0 (exit 0) | **28/28, mismatch=0 (exit 0)** — re-confirmed, undisturbed |
| files redacted | — | **3** |
| files edited in total | — | **6** |

## Defect A — remote endpoints

Verified the locations myself rather than trusting the handed line numbers. The banner ticket 04
prepended had shifted `s02-bootstrap-parity.md` by 16 lines: the real lines were **20 and 87**, not
4 and 72. The other two files were where the ticket said.

Then swept the *whole* tree, not just the three files. `neon.tech`, `.aws.`, `ep-<id>` matched in
**exactly those three files and nowhere else** — the host was confined to the superseded set. The
subdirectories are clean: `41-openapi/OPENAPI-CI.md`'s three `postgres://` strings are
`localhost` / `127.0.0.1` CI placeholders, and `bootstrap-head-637/logs/20-*.log`'s `sslmode`
mentions are self-test **case names**, not URLs.

### Redaction convention

Uniform across every connection URI and bare-host line:

| real identifier | placeholder |
|---|---|
| the Neon endpoint hostname | `<neon-host>` |
| the role in the URI userinfo | `<db-role>` |
| the control-plane database | `<db-control-plane>` |
| the cell database | `<db-cell>` |
| `scratch_boot_a` / `_b` / `_c` | **kept unchanged** |

Scratch database names are kept deliberately: they are ephemeral throwaway fixtures, named openly
throughout this tree, the release runbooks and `bootstrap-head-637/`, and they are what carries the
"two *different* databases, and which was which" meaning the ticket asked me to preserve. A line now
reads `A: postgresql://<db-role>:***@<neon-host>/scratch_boot_b` vs
`B: …/scratch_boot_c` — still legible as evidence, naming no real host, role or remote database.
Loopback identity lines (`127.0.0.1:5432/scratch_boot_b as tarunchintakunta`) were left alone.

### Lines changed — 10, across 3 files

    parity-boot-b-vs-c.log      2, 3, 8, 9       host=4 role=4 control-plane-db=1 cell-db=1
    parity-boot-b-vs-c-v2.log   2, 3, 298, 299   host=4 role=4 control-plane-db=1 cell-db=1
    s02-bootstrap-parity.md     20, 87           host=2 role=1 control-plane-db=0 cell-db=0

`s02-tenant-integrity.md` needed **no** redaction — it holds no connection URI and no host. Its
mismatch was purely the banner. No count, result, command flag or exit code was altered anywhere.

**On "should this be edited at all":** these are already-sanitized copies (the password appears as
`***` because it was scrubbed at capture), so a further scrub is the same class of act that produced
them. Leaving a real endpoint host in a repository bound for `main` is itself the defect, and
`SUPERSEDED-FORMER-HEAD.md` had already put exactly this choice to an owner as option 1 (scrub and
re-hash, recording the pre-scrub hashes) versus option 2 (delete the set). **Option 1 was taken.**

## Defect B — the broken seal

Re-verified before touching anything: **match=11 mismatch=2 missing=0 of 13**, the two mismatches
being `s02-bootstrap-parity.md` and `s02-tenant-integrity.md`. Their on-disk digests matched
ticket 04's recorded "after banner" values **byte for byte**, which independently corroborates
ticket 04's ledger.

`evidence/artifact-hashes.json` was re-sealed over the current bytes and now verifies
**match=13 mismatch=0 missing=0 of 13, exit 0**.

The replacement seal also corrects a false statement in the old one. The old `note` claimed
*"Connection strings in bootstrap logs are redacted to `postgresql://user:***@host` before
hashing"*. No such transform was ever applied — the eleven `.log` digests match the raw bytes on
disk, which is only possible if they were taken over the files as written. The new `algorithm`
field says plainly: sha256 over the exact bytes, no transform.

## Auditability of the re-seal — nothing was silently overwritten

1. **New file `evidence/REDACTION-AND-RESEAL-LEDGER.md`** (168 lines) records, for every affected
   file: the digest recorded in the original seal, the digest actually on disk before ticket 04's
   banner, after the banner, after my redaction, and current; the convention; the exact lines
   changed; who changed them and why; and four copy-pasteable commands a distrustful reader can run.
   It also states what the re-seal does **not** fix — see "Residuals" below.
2. **The replacement `artifact-hashes.json` carries a `previousSeal` block** holding the old
   `generatedAt`, the old (wrong) `note`, `fileCount`, the sha256 of the replaced file itself, and
   **all 13 original digests verbatim**. The file is self-contained: no history and no second file
   is needed to see what the previous seal claimed.
3. **A `reseal` block** records the reason, the pre-reseal verification result (11/2/0 of 13), the
   **9 digests carried forward completely unchanged**, the **4 that moved**, and the sha256 of both
   the ledger and `SUPERSEDED-FORMER-HEAD.md` — so tampering with the audit record itself is
   detectable from the seal.
4. **The 9 untouched logs carry identical digests in `previousSeal.hashes` and `hashes`.** That is
   the check that this re-seal did not quietly rewrite anything it was not meant to, and it is
   machine-checkable in one line (command 2 in the ledger).
5. **Both `s02-*.md` banners got a second paragraph** recording the redaction and re-seal. This was
   required, not cosmetic: ticket 04's banner asserts *"Nothing below it was altered"*, which
   stopped being true of `s02-bootstrap-parity.md` the moment I redacted lines 20 and 87. Leaving a
   now-false statement standing inside evidence would be a worse defect than the edit.
6. **`SUPERSEDED-FORMER-HEAD.md`'s two `## Open finding` headings became
   `## RESOLVED 2026-09-02 by ticket 04b`**, each with a quoted resolution paragraph inserted under
   it. **Both finding bodies are left word for word.** Nothing ticket 04 wrote about what it found
   was edited, softened or removed.

Seal scope was deliberately left at the same 13 files so that `match=13` is directly comparable with
the `match=11 mismatch=2` measured before. The ledger and the notice are anchored by digest in the
`attestation`/`reseal` block instead of being folded into `hashes`.

## Verification actually run (commands whose output I read)

    node verify-seal.mjs evidence/artifact-hashes.json                  # before: match=11 mismatch=2 missing=0 of 13, exit 1
    node verify-seal.mjs evidence/bootstrap-head-637/artifact-hashes.json  # before: match=28 mismatch=0 missing=0 of 28, exit 0
    node verify-seal.mjs evidence/artifact-hashes.json                  # after:  match=13 mismatch=0 missing=0 of 13, exit 0
    node verify-seal.mjs evidence/bootstrap-head-637/artifact-hashes.json  # after:  match=28 mismatch=0 missing=0 of 28, exit 0
    <ledger + notice digests vs the seal's anchors>                     # MATCH, MATCH
    python3 -c "json.load(...)"                                         # replacement seal is valid JSON, 6511 bytes

`bootstrap-head-637/` is byte-for-byte untouched: all 28 digests still match, and no file under it
was opened for writing at any point.

## Final sweep — remaining matches

**Remote-endpoint patterns across all 49 files: `0`.**
(`neon.tech`, `.aws.neon`, `ep-<id>-<id>-<id>`, `amazonaws.com`, `.rds.`, `.supabase.`,
`.render.com` — zero hits.)

Three residual classes, all inspected individually, none an endpoint:

| what | where | why it is not a disclosure |
|---|---|---|
| the literal string `postgresql://user:***@host` — 3 hits | `artifact-hashes.json:53`, `REDACTION-AND-RESEAL-LEDGER.md:20`, `SUPERSEDED-FORMER-HEAD.md:138` | all three are the **same quotation** of the old seal's wrong `note`. `host` is the literal word, a placeholder. Quoting the rule that was applied is the point. |
| `postgres://…@localhost` / `@127.0.0.1` — 3 hits | `41-openapi/OPENAPI-CI.md:19,164,165` | documented CI placeholders for a non-reachable database. Loopback, no infrastructure. |
| the *grep pattern* `neon\.tech` inside a regex — 2 hits | `bootstrap-head-637/README.md:412`, `manifest.json:243` | ticket 04's own sanitization method, written down. A pattern, not a value. Also inside the sealed bundle I must not modify. |

### One residual I did NOT redact, deliberately

The database names `neondb` and `cell2` appear as **prose words** in sentences — 4 hits in
`s02-bootstrap-parity.md`, 4 in `s02-tenant-integrity.md`, 2 each in `bootstrap-head-637/README.md`
and `manifest.json`, plus the notices. Example: *"a side-effect cell comparison (neondb vs cell2) at
import time"*. These are not endpoints, they carry the technical narrative, and
`bootstrap-head-637/` — freshly sealed and out of bounds — names them the same way throughout.
Redacting them in the superseded files alone would break the parallel between the two documents
while removing nothing reachable. **This is a judgement call, recorded in the ledger so it can be
overturned rather than discovered.** If the owner wants prose db names gone too, it has to be done
across both bundles at once, which means re-sealing `bootstrap-head-637/` — a decision above my
ticket.

## Files changed (6)

| file | change |
|---|---|
| `…/evidence/parity-boot-b-vs-c.log` | 4 lines redacted |
| `…/evidence/parity-boot-b-vs-c-v2.log` | 4 lines redacted |
| `…/evidence/s02-bootstrap-parity.md` | 2 lines redacted + banner amendment |
| `…/evidence/s02-tenant-integrity.md` | banner amendment only (no redaction needed) |
| `…/evidence/SUPERSEDED-FORMER-HEAD.md` | 2 headings → RESOLVED + 2 resolution paragraphs; bodies untouched |
| `…/evidence/artifact-hashes.json` | re-sealed, with `previousSeal` + `reseal` audit blocks |

New: `…/evidence/REDACTION-AND-RESEAL-LEDGER.md`, and this report.
All paths are under
`/Users/tarunchintakunta/Personal/streamline/streamlineos-frontend/architecture-refactor/final-refactor/evidence/`.

## Notes for the orchestrator

- **No CI gate reads this seal.** `.github/workflows/backend.yml:151` runs
  `pnpm artifact:record-hashes`, which hashes `backend/dist` into `backend/artifact-hashes.json` —
  an unrelated file. `record-artifact-hashes.mjs` has **no verify mode at all**; it can only write.
  Nothing anywhere re-checks either evidence seal automatically, so both seals are honour-system
  documents. Adding a `check:evidence-seal` gate would make them real. Not my ticket; flagged.
- **Other agents' territory, not edited:** ticket 04's own report
  (`.scratch/code-release-10-10/reports/04-evidence-bundle.md`) and issue file still describe both
  defects as open P2s and say *"`evidence/artifact-hashes.json` was deliberately not touched, so its
  broken seal stays visible."* That is now stale. It is ticket 04's file; I left it alone.
- **Still open from ticket 04, untouched by me:** the journal has moved to **639** and head-637
  parity is not head-639 parity; PRD lines 19, 65, 66, 79 still say 635.
- **The (1) → (2) edit remains unexplained.** Between the original sealing and ticket 04's arrival,
  both `s02-*.md` files were edited by someone with no audit record and the seal was not updated.
  This re-seal makes that gap *visible* in the ledger; it does not close it. If provenance on those
  two documents matters, that is the thread to pull.
