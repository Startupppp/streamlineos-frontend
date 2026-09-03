# Release authority — code-level architecture baseline

> **STATUS: DRAFT. NOT YET AUTHORITATIVE.** The commit fields are deliberately unfilled.
> This document becomes the release record only when ticket 41 has run to completion on a
> **quiesced tree**, at a single pair of commits, with `release-verify.mjs` producing an
> **AUTHORITATIVE** record (it refuses to produce one while either tree is dirty).

## 1. What this document claims — and what it does not

This commit pair is reported as the **code-level architecture baseline for the stated scope**,
and nothing stronger.

The following are **not** claims made here, and must never be attached to this record:

- ❌ "Bug-free." Not established, not establishable by this process, and contradicted by the
  open findings in §5.
- ❌ "Nothing can be improved." The register in §5 lists accepted residual risk by name.
- ❌ "Million-user proven." No load testing at that scale was performed. The performance work in
  this release measured **read cost in buffers and request statements against a seeded database**,
  which is a different claim entirely.
- ❌ "Production-verified." Every measurement in the evidence bundle comes from `scratch_*`
  databases and local builds. See §6.

What it *does* claim: at this commit pair, the gates listed in §3 were executed and produced the
recorded results; the P0/P1 findings in §4 were resolved; and the residual risks in §5 were
accepted with a named owner and a date.

## 2. Scope

**In scope:** the modules exercised by tickets 01–42 of this release across both repositories.

**Explicitly excluded, and excluded throughout:**
- **CRM** and **Inventory** — out of release scope by decision, not by oversight. Findings in
  those modules are recorded and named, never silently fixed or silently counted.
- **Public landing visuals and animations** (`app/(public)/**`, `features/marketing/**`) — frozen
  reference surfaces; unchanged by this release.
- **Platform billing** — never delegated, by construction.

Two repositories, two commits. `streamlineos-backend` and `streamlineos-frontend` are separate git
repositories and a change spanning both is not one SHA.

## 3. Evidence — filled at quiesce

| field | value |
|---|---|
| backend commit | _pending_ |
| frontend commit | _pending_ |
| date | _pending_ |
| `release-verify.mjs` record | _pending — must report `authoritative: true`_ |
| gate tally (PASS / FAIL / SKIP / CRASH) | _pending_ |
| disposable-database e2e runs | _pending, per module group, with database identity and dataset shape_ |

**A SKIP is not a PASS.** Every skipped gate must appear with its named prerequisite. Nine gates
genuinely cannot run in CI (they need a live database, network, or a human acknowledgement) and are
classified with that prerequisite rather than counted as passing.

**Read the tails, not the exit codes.** A crashed `tsc` greps as "0 errors" and reports a false
pass; the harness scans for crash signatures independently of exit status and a crash signature
outranks a 0.

## 4. P0 / P1 findings — box 3 is NOT yet satisfiable

Ticket 42 box 3 requires that no unresolved code-level P0 or P1 remains. **At the time of writing
it does not hold.** Open P1s, all under active work:

- ~30 `build` sub-routes 404 for any project in a PM workspace (route trees are not mirrors).
- Three e-sign routes returning another tenant's envelope as `[]` / 200 instead of 404.
- 88 routes answering `500 INTERNAL_ERROR` to a valid same-tenant request, untriaged.
- The storage write-ahead row confirmed and deleted after a delete that may have addressed the
  wrong bucket, converting a recoverable orphan into an unrecoverable one.

Resolved P1s this release, each verified rather than asserted: the cross-tenant announcement write
(a composite FK is not enforced when any column is NULL); the AI-credit first-purchase money race
(`FOR UPDATE` locks nothing when the row does not exist); the broken project list; the `/calendar`
62-day window; `GET /clients` 25P02; and 84 of 113 cross-tenant 404-contract violations, with all
113 accounted for.

## 5. Accepted residual risks — each needs an owner and a date

Ticket 41 box 7 requires that accepted lower-severity residuals carry **an owner and a deadline**.
The register lives in `reports/residual-risk-register.md`; it is part of this record by reference.

**Two must not be nodded through as "lower-severity":** until the R2 buckets are made private,
every object already at a public `r2.dev` address stays fetchable by anyone who ever copied one,
whatever the database columns say. That is a live exposure dated before cutover.

## 6. Deferred production and compliance evidence — stays deferred

These are **operator actions that cannot be performed from code**, and folding them into this
claim would make the claim false:

- Make the chat-attachment and KB R2 buckets private (`R2_BUCKET_NAME`, `R2_KB_BUCKET_NAME`).
- Rotate the leaked database credential.
- The support-channel `rotateInboundSecret` rotation owed after the hashing migration.
- The owner-DSN backfill `--apply`.
- A bucket listing to recover objects orphaned **before** the purge-drain fix — those left no row,
  so no backfill can find them.

## 7. How later additions must be recorded

After this record closes, the checklist is closed and the completion target cannot move. Anything
subsequent is recorded as exactly one of:

| kind | meaning |
|---|---|
| **REGRESSION** | worked at this baseline, broken after it |
| **NEW REQUIREMENT** | never in scope here |
| **NEWLY DISCOVERED RISK** | present at this baseline, unknown then |
| **PRODUCTION EVIDENCE** | observed in production, which this record never claimed to cover |

Each must name the affected commit, a reproduction, a severity, an owner, and **the concrete
failure it prevents**. "Improvement" and "polish" are not categories — an addition that cannot name
the failure it prevents does not belong in the record.
