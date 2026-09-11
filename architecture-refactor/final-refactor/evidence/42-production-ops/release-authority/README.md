# Release-authority apparatus — v2 ticket 36

Ticket 36 (PRD-C016, PRD-C190 – PRD-C195) asks for the record that closes the release. Almost
every one of its seven criteria is a **record to be authored**, not code to be written, and before
this directory existed none of those records existed: `architecture-refactor/decisions/` held only
the S05 decision template, and `42-production-ops/` held only its README.

This directory holds the apparatus. **It grants no authority, records no approval, and claims no
drill it did not run.**

| | |
|---|---|
| Written | **2026-09-03** |
| Frontend / root commit | `7469d27895add587f9427e7c50c457f56e0048bf` (`release/code-10-10-v2`) |
| Backend commit | `2f37e1bb035006e5c03680497298ad62031e79d6` (`release/code-10-10-v2`) |
| Ticket | 36 — Production release authority |
| Signatures anywhere in it | **zero, deliberately** |

---

## What is here

| File | Answers | Criteria |
|---|---|---|
| [`DEFERRED-CHECKBOX-LEDGER.md`](DEFERRED-CHECKBOX-LEDGER.md) | All 195 criteria, each with its owning ticket and a status class — **CODE** (closable on this machine), **DEPLOYED** (needs a real environment), **HUMAN** (needs a named signature) — with the criterion's own wording quoted for every non-CODE call. | **PRD-C191** |
| [`C190-C194-MEASUREMENT-DEFINITION.md`](C190-C194-MEASUREMENT-DEFINITION.md) | What *"green at the deployed commit"* and *"no unresolved P0/P1"* are actually measured by: the closed 70-gate list, the exact command, the exit-code contract, the finding register and a proposed severity rubric. | **PRD-C190**, **PRD-C194** |
| [`../../../../decisions/RELEASE-AUTHORITY-TEMPLATE.md`](../../../../decisions/RELEASE-AUTHORITY-TEMPLATE.md) | The reusable record: commit pair, environment, evidence index, approvals, residual risks, findings, grant. Serves both PRD-C161 (code-level) and PRD-C195 (production). | **PRD-C195**, PRD-C161 |
| [`../../../../decisions/release-authority-2026-09-03-UNSIGNED.md`](../../../../decisions/release-authority-2026-09-03-UNSIGNED.md) | The instance, every measurable field filled, every signature blank. | **PRD-C193**, **PRD-C195**, **PRD-C016** |

The two record files live under `architecture-refactor/decisions/` because that is where
PRD-C182 and the S05 template point, and because a decision record is not evidence — it is the
thing evidence is presented *to*.

## What is deliberately not here

**No `.json` file.** `production-ops-evidence.mjs verify` treats every `.json` under
`42-production-ops/` (except `*.input.json`) as an evidence manifest. A stray JSON file here would
be parsed as a manifest and fail as a malformed one, adding noise to the reason
`pnpm -C backend ops:evidence:check` is red. That gate must stay red for its real reason — no
deployed evidence has been collected — so everything in this directory is Markdown, and this
directory contributes **zero** manifest candidates.

## This evidence tree moved while the record was being written

Two measurements of `ops:evidence:check`, nine minutes apart, at the same commits:

| `pnpm -C backend ops:evidence:check` | Exit | Output |
|---|---:|---|
| 16:23 UTC | **1** | *"no evidence manifests found … deployed evidence has not been collected"* — the directory held only its README |
| **16:35 UTC** | **1** | **10 manifest candidates found, all 10 rejected as malformed, 0 PASS lines, all 8 runbooks still missing passing deployed evidence** |

Nothing regressed. Tickets 32–35 landed their local drill output into `RB-01/` … `RB-10/`,
`edge-security/`, `deploy-safety/`, `provider-drills/`, `break-glass/` and `observability-c173/`
in between, and ten of those files are `.json`. The gate now reads them and rejects each with the
same list of reasons, every one of which is a property of a *deployed* run that a local run cannot
have:

> unsupported runbook undefined; evidenceKind must be `deployed-operator-attested`; evidence must
> declare `live=true` and synthetic must not be true; environment.name is absent or not
> deployment-like; environment.region is required; environment.cell is required; environment.target
> must be a non-local https endpoint; release.sha must be a git SHA; release.topologySha256 must be
> SHA-256; dataset.shape is required; dataset.activeOrganizations must be positive; **named
> operator is required**; operator.approvedAt must be an ISO timestamp; execution.command is
> required; execution.exitCode must be 0; execution timestamps are invalid; at least one hashed
> artifact is required

That is the gate working exactly as intended: a local self-test or dry run cannot be laundered
into deployed evidence, no matter how much of it accumulates. **0 of 8 runbooks pass, in both
measurements.**

A third gate told the same story from the other side. `check:evidence-seal` read **exit 0, exit 0,
then exit 1** across the same fifteen minutes, ending with **2 broken seals** —
`RB-10-privacy-compliance/probes/` and `/runs/` each gained a file *after* their seal was written.
That is not tampering and it is not a regression; it is a ticket still working. It is also exactly
what a seal is for.

**The lesson for the record itself:** an evidence tree written by many concurrent agents is not
stable at a wall-clock time. A release-authority record must be re-stamped against a clean commit
pair, not against the moment someone happened to look — and every seal must be re-verified at that
pair, not at authoring time. This is recorded here rather than smoothed over, because a record that
cites only its most convenient reading is the failure mode the whole apparatus exists to prevent.

---

## Commands actually run by ticket 36

Every row is a command that really ran, at the commits above, with its real exit code. Nothing
else is claimed. The full 70-gate list, the builds, the typechecks and the suites were **not** run
by this ticket; they are the orchestrator's and ticket 31's, and are reported here as not run,
never as passing.

| # | Command | Exit | Headline result |
|---:|---|---:|---|
| 1 | `node scripts/check-prd-traceability.mjs` (frontend) | **0** | 195 manifest rows · 195 ticket criteria · 0 checked / 195 unchecked · every criterion quoted verbatim with exactly one owner |
| 2 | `node src/scripts/production-ops-evidence.mjs verify` (backend), 16:23 UTC | **1** | *"no evidence manifests found … deployed evidence has not been collected"* — **0 of 8 runbooks** |
| 2b | same command, 16:35 UTC | **1** | **10** manifest candidates, **10** rejected as malformed, **0** PASS, **0 of 8 runbooks** — see above |
| 3 | `node src/scripts/production-ops-evidence.mjs --self-test` | **0** | `validDeployedShapePasses`, `alteredArtifactBlocked`, `selfTestClaimBlocked` all true — the gate bites |
| 4 | `pnpm check:s05-artifact-contract` | **0** | the approval template carries all six functions and all three evidence-index columns |
| 5 | `pnpm check:evidence-seal`, three readings 16:23 / 16:35 / 16:38 UTC | **0 → 0 → 1** | 2 seals·41 files → 5 seals·68 files → **5 seals · 68/68 sealed files match · 2 BROKEN**. The break is not a tampered artifact: `RB-10-privacy-compliance/probes/` and `/runs/` each gained files *after* their seal was written (`ai-redaction-probe.mjs`, `pd-column-scan.sql`, `22-ai-redaction-probe.txt`). Ticket 35 is mid-write; it must re-seal. Nothing in `release-authority/` is sealed, and nothing here caused it. |
| 6 | `pnpm check:gate-wiring` | **0** | **100 gates**, 91 able to FAIL the job, 0 registered non-blocking, 161 run steps / 15 jobs / 7 workflow files, 9 deliberate exceptions |
| 7 | `pnpm check:baseline-integrity` | **1** | **RED** — `check-envelope-consistency.mjs :: MAX_HOPS = 8` unregistered, a net raise of 8 against 0 registered |
| 8 | `pnpm check:alert-ack` | **2** | `PREREQUISITE MISSING: ALERT_WEBHOOK_URL is not set` — and the gate's own instruction: *"Enter the nonce shown in your alert channel to confirm a human received it."* |
| 9 | `pnpm check:alert-ack:self-test` | **0** | 7 detector cases pass, including the undelivered branch and a stale acknowledgement |
| 10 | `DATABASE_URL=…/scratch_head_1010 node src/scripts/compliance-drill.mjs` (dry run) | **0** | 7 of 7 steps · **7 of 7 required audit rows** · erasure correctly refused under legal hold · transaction rolled back |
| 11 | `git rev-parse HEAD` / `git status --porcelain` in both repos | 0 | SHAs above; **neither working tree clean** — frontend 40 → 68 porcelain entries in nine minutes, backend 21 |
| 12 | `psql` against `scratch_head_1010` and `scratch_cold_1010` | 0 | head ledger **677** rows · cold replay **677** rows · **944** tables each · **899** RLS-enabled tables · **900** policies · `streamline_app.rolbypassrls = false` |
| 13 | `node -e` over `migrations/meta/_journal.json` | 0 | **677** journal entries, **677** `.sql` files |
| 14 | `grep -c 'DECISION REQUIRED' DATA-CATALOGUE.md` | 0 | **36 rows** carrying **53** `DECISION REQUIRED` cells across 99 table rows |

Command 8 is worth reading twice. It is a **deployed** criterion (PRD-C174) refusing to pretend,
and it was run precisely so this record could report its blocked state as a measurement rather
than as an assumption. Its sibling self-test passes, which is exactly the distinction that matters:
the detector works; the thing it detects has not happened.

---

## The three findings ticket 36 surfaced

Not owned by ticket 36, recorded because a release-authority record that omits them is not a
record.

1. **`check:baseline-integrity` is red at this commit** (exit 1). One gate constant,
   `check-envelope-consistency.mjs :: MAX_HOPS = 8`, is unregistered — a net raise of 8 against
   0 registered baselines for that file. PRD-C190's gate list contains this gate, so the code-level
   gate is not green at this commit even setting the deployed question aside. Owner: ticket 30.

2. **No clean commit pair exists.** PRD-C016 requires *"one clean frontend/backend commit pair"*.
   Both working trees are dirty and the frontend's porcelain count moved from 40 to 68 in nine
   minutes while this record was being written. Any measurement taken against this tree describes
   neither recorded SHA. Owner: orchestrator.

3. **PRD-C188 is misfiled as deferred.** It is the one criterion in the entire deferred section
   whose own wording — *"Run retention/legal-hold drills and store a redacted, hashed evidence
   bundle"* — names neither a deployed environment nor a human. It ran here, exit 0, 7 of 7 audit
   rows. Its deployed twins, PRD-C186 and PRD-C187, both say *"deployed"* explicitly; C188 does
   not. Either it should move to the immediate set, or its wording should say what C186 and C187's
   say. Owner: whoever maintains the PRD.

The drill that closed finding 3 also reported three gaps of its own, honestly, and they are carried
into the unsigned record's finding table rather than dropped: no export worker produces a file, the
`object_storage` purge adapter returns FAILED *"not yet implemented"*, and the `database_rows`
adapter marks `PURGED` without physically deleting rows.

---

## The honesty rule this directory is built on

Ticket 36's criteria mix three kinds of thing, and the whole value of this apparatus is refusing
to blur them:

- **Runnable here** — run it, capture the real output, record the real exit code. Fourteen commands
  above.
- **Needs a deployed environment** — say so plainly. **There is no deployed production environment
  on this machine.** Do not simulate one and present the simulation as the criterion being met.
- **Needs a named human decision** — author the complete record with every field filled except the
  signature, so a person has only to review and sign.

**Fabricating a compliance record, an approval, or an evidence manifest for a drill that was not
run is the worst outcome available here — far worse than reporting a criterion as blocked.** A
record claiming a signature nobody gave is a forged record. Nothing in this directory carries one,
and nothing in it may be edited to carry one by automation.
