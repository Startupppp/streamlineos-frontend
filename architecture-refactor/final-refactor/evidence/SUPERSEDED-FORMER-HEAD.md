# SUPERSEDED — the files listed here prove the FORMER head, not the current one

Written 2026-09-02 by the code-release-10-10 ticket-04 recorder.

**Do not cite any file in the table below as current-head proof.** Each of them was produced against
a **634-entry** migration journal, on a different database estate, with a parity comparator that has
since been shown to be defective.

Current-head evidence lives in
**[`bootstrap-head-637/`](bootstrap-head-637/README.md)** — journal head 637,
`0991_calendar_event_local_version`.

---

## The superseded set

Every file in this directory listed in the former `artifact-hashes.json` (`fileCount: 13`), plus
that hash file itself:

| file | what it claims | why it is not current |
|---|---|---|
| `s02-bootstrap-parity.md` | clean bootstraps + interrupt/resume + catalog parity | 634-entry journal; parity taken with the name-only comparator |
| `s02-tenant-integrity.md` | tenant-relationship and catalog reconciliation, "0 actionable" | 634-entry journal; the gate that produced "0 actionable" could not see accounting/billing tables |
| `parity-boot-b-vs-c.log`, `parity-boot-b-vs-c-v2.log` | `differences=0` | name-only comparison — see "The comparator" below |
| `replay-boot-b-partial.log`, `…-v2.log` | interrupted replay | 634-entry journal, and a different interrupt method |
| `replay-boot-b-resume.log`, `…-v2.log` | resumed replay | 634-entry journal |
| `replay-scratch-boot-c.log`, `…-v2.log` | clean replay | 634-entry journal |
| `apply-0000-b2.log`, `apply-0000-b2-v2.log`, `apply-0000-c2.log` | single-migration application | 634-entry journal |
| `artifact-hashes.json` | sha256 of the 13 files above | covers only the superseded set; it says nothing about `bootstrap-head-637/` |

`40-observability/`, `41-openapi/`, `42-production-ops/` and `perf-budget-manifest.md` are **not**
part of this superseded set. They cover unrelated subject matter and are untouched by this notice.

## Three numbers are in circulation. Only one is right, and it has already moved again.

| source | says the journal has | status |
|---|---|---|
| the superseded evidence above | **634** entries | stale |
| `PRD-10-10-CODE-RELEASE-TODO.md` (several places) | **635** entries | stale |
| measured when the current-head proofs were captured | **637** entries | what `bootstrap-head-637/` proves |
| measured when this notice was written | **639** entries | `0992` and `0993` were journalled by concurrent lanes afterwards, and **nothing has proven them yet** |

## Why "differences=0" in the superseded logs did not mean what it looks like

`compare-bootstraps.mjs` — the tool that produced `parity-boot-b-vs-c*.log` and the parity section of
`s02-bootstrap-parity.md` — keyed **nine of its ten categories on the object's name alone**. Under
that version, two databases compared **equal** when they differed by:

- an index of the same name on a different column (`CREATE INDEX ix ON t(a)` vs `ON t(b)`)
- a changed `CHECK` or `FOREIGN KEY` body
- a rewritten policy `USING` / `WITH CHECK` clause
- a rewritten function body, a retargeted trigger, a reordered enum
- a table with RLS **enabled** versus one with RLS **enabled and FORCED**

It also had no sequence, view or migration-ledger category at all, and its exit code was being set by
an unrelated module's prerequisite check — a clean parity exited **2**.

Both defects were fixed in ticket 02, and the repaired comparator is bite-proven: two probe databases
carrying one deliberate difference per class produce `differences=15`, exit 1
(`bootstrap-head-637/logs/13-comparator-negative-control.log`).

**So the superseded `differences=0` results are not evidence of catalog equality.** They are evidence
that the two catalogs contained objects with the same *names*. Re-deriving the real answer would mean
re-running the fixed comparator against those databases, which no longer exist in that state.

## Two tenant gates in the superseded set were green because they could not see

`s02-tenant-integrity.md`'s "zero actionable tenant relationships", and the PRD's "tenant indexes:
745/745", were produced by gates with blind spots that ticket 03 measured and repaired:

| gate | said | true value after repair | blind spot |
|---|---|---|---|
| `check:tenant-relationships` (catalog) | 0 actionable | **4 actionable** | `credit_notes`, `vendor_credits`, `enterprise_quotes` sat in `CRM_TABLE_NAMES`, so accounting and billing tables were skipped in both modes |
| `check:tenant-relationships` (static) | 0 violations | **16 violations** | `.references((): AnyPgColumn => …)` — 12 declarations the regex never matched |
| `check:tenant-indexes` (declarations) | 745/745 clean | **823/828** | matched `pgTable(` only; all 83 Build tables declared `build.table(...)` were invisible |
| `check:tenant-indexes --db` | did not exist | **985/988** | there was no catalog mode |

A fourth: `check-tenant-relationships`'s mid-bootstrap guard read `drizzle.__replay`, which only
`replay-chain-cold.mjs` writes, so against any `db:bootstrap`-built database the query errored, a
`.catch` swallowed it, and the guard was inert.

## RESOLVED 2026-09-02 by ticket 04b — the former `artifact-hashes.json` no longer verified

> **Resolution.** `artifact-hashes.json` has been **re-sealed** over the current bytes and now
> verifies **match=13 mismatch=0 missing=0 of 13**. Nothing was overwritten silently: the previous
> seal's `generatedAt`, `note` and all 13 recorded digests are copied verbatim into a `previousSeal`
> block inside the replacement file, and every hash state for every affected file — sealed,
> pre-banner, post-banner, post-redaction — is set out in
> [`REDACTION-AND-RESEAL-LEDGER.md`](REDACTION-AND-RESEAL-LEDGER.md). The finding as the ticket-04
> recorder wrote it is left below, unedited, as the record of what was found.

The recorder re-hashed all 13 files it covers. **11 of 13 match. Both narrative documents do not.**

    $ node -e "<recompute sha256 of every file in artifact-hashes.json>"
    MATCH    apply-0000-b2-v2.log            MATCH    replay-boot-b-resume-v2.log
    MATCH    apply-0000-b2.log               MATCH    replay-boot-b-resume.log
    MATCH    apply-0000-c2.log               MATCH    replay-scratch-boot-c-v2.log
    MATCH    parity-boot-b-vs-c-v2.log       MATCH    replay-scratch-boot-c.log
    MATCH    parity-boot-b-vs-c.log
    MATCH    replay-boot-b-partial-v2.log    MISMATCH s02-bootstrap-parity.md
    MATCH    replay-boot-b-partial.log       MISMATCH s02-tenant-integrity.md

    match=11 mismatch=2 missing=0 of 13

`s02-bootstrap-parity.md` and `s02-tenant-integrity.md` were **edited after their hashes were
sealed, and the hash file was never updated**. Their integrity seal was already broken before this
notice was written. The raw logs are intact.

### Hash ledger for the two documents

The recorder then prepended a superseded banner to each — nothing below the banner was altered — so
that a reader who opens the file directly cannot mistake it for current-head proof. All three states
are recorded so the edit is itself auditable:

| file | recorded in `artifact-hashes.json` | actual on disk **before** the banner | actual on disk **after** the banner |
|---|---|---|---|
| `s02-bootstrap-parity.md` | `a6e9b72647e856775232f2b0e4e1c45dcc0274489d2c11c7a99b50e9b05c1b4d` | `adb0d5dc5e42c0b21c7f3baee9baa18acb35fe89cd3c9c7cdffc90cbd304910a` | `2e49745b16054ce136ee84472f4a73c311c7ab9135683d0ddc3bbd5efaf7a300` |
| `s02-tenant-integrity.md` | `0403ee05d49c9434cce0b3a69ab347eff8b8e222f1fca6d70927ddd4548a68af` | `bcb9714f8aed67daa3531a3801e43b4ad3efa7f0d8798bdc807aa72314f713c4` | `87555306baa4c33506665bb18c6a96bbcb03695787cdb27da01affd35bc93013` |

The recorder did **not** update `artifact-hashes.json` itself: that file is the former head's own
seal, and rewriting it would erase the evidence that it had stopped verifying. The eleven `.log`
files were left byte-identical and still match it.

## RESOLVED 2026-09-02 by ticket 04b — these superseded artifacts contained connection URIs

> **Resolution: option 1 was taken — scrub and re-hash.** Nothing was deleted. Ten lines across the
> three files named below had their real infrastructure identifiers replaced with the placeholders
> `<neon-host>`, `<db-role>`, `<db-control-plane>` and `<db-cell>`; scratch database names were kept
> so each line still reads as evidence of which database was which. No count, result, command flag
> or exit code was altered. A sweep of the whole `evidence/` tree afterwards finds **zero** remaining
> matches for a remote endpoint. The pre-scrub and post-scrub hashes, the exact lines changed, the
> convention and the reasoning are in
> [`REDACTION-AND-RESEAL-LEDGER.md`](REDACTION-AND-RESEAL-LEDGER.md). The finding as the ticket-04
> recorder wrote it is left below, unedited, as the record of what was found.

The release rule is that **no connection string appears in any retained artifact**. The former
`artifact-hashes.json` states a weaker rule it applied instead: *"Connection strings in bootstrap logs
are redacted to `postgresql://user:***@host` before hashing."* Password-redacted is not removed.

These files still disclose a **real remote endpoint host, the role `neondb_owner`, and the database
names `neondb` and `cell2`**:

| file | lines |
|---|---|
| `parity-boot-b-vs-c.log` | 2, 3, 8, 9 |
| `parity-boot-b-vs-c-v2.log` | 2, 3, 298, 299 |
| `s02-bootstrap-parity.md` | 4 (bare host), 72 (full URI) |

Shape, with the host masked here: `postgresql://<role>:***@<endpoint-host>/<db>?sslmode=require&channel_binding=require`

**The recorder did not rewrite them.** They are hashed evidence, and silently editing hashed evidence
destroys the chain of custody that makes it evidence. This is raised for an owner to decide between
two honest options:

1. **Scrub and re-hash**, recording the pre-scrub hashes and the reason in `artifact-hashes.json` so
   the edit is itself auditable; or
2. **Delete the superseded set outright** — `bootstrap-head-637/` replaces everything it proves, at a
   later head, with a comparator that works.

Either way the disclosure should not simply be left in the repository. Note that credentials are not
exposed; the endpoint identity is.

## What replaces this

[`bootstrap-head-637/README.md`](bootstrap-head-637/README.md) — release SHAs, every command,
database identity and oids, dataset shape, journal hash and count, the full catalog diff, literal
pass/fail/skip counts, an explicit list of gates that did **not** run, and its own
`artifact-hashes.json`. Read its four caveats (C1–C4) before citing any pass in it.
