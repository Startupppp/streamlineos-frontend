# RB-10 — Export, erasure, retention and legal-hold drill evidence

Ticket 35 (`code-release-10-10-v2/issues/35-compliance-privacy-drills.md`), criteria
**PRD-C186**, **PRD-C187**, **PRD-C188**.

This bundle has **three capture generations**, and all three are kept. Generation 1
(`runs/01`-`runs/22`) is the original survey; generation 2 (`runs/23`-`runs/29`) re-runs the
retention and legal-hold halves after the two defects that made them meaningless were fixed;
generation 3 (`runs/30`-`runs/41`) re-runs both drills plus their supporting gates at the
close-out head and adds the gate that verifies the word **redacted**. Nothing from an earlier
generation was edited or deleted — a superseded run is evidence of what the gate used to say.

| | Generation 1 | Generation 2 (retention + legal hold) | Generation 3 (re-run at head + redaction gate) |
|---|---|---|---|
| Backend commit | `45f8a2e99494483526e357e27f18c76961ebf266` (`release/code-10-10-v2`) | `dcd5a20717dc6d5a6eb2ff40aa54ae58abe2bc8a` (`release/v2-closeout`) | `299cd1009` (`release/v2-closeout`) |
| Frontend/root commit | `7469d27895add587f9427e7c50c457f56e0048bf` (`release/code-10-10-v2`) | `0a24e2940a078ead5d771b651bac953984757c4c` (`release/v2-closeout`) | `7633c38b947a57b285403e70fd340e1c149b5fe6` (`release/v2-closeout`) |
| Captured | 2026-09-03 | 2026-09-04 | 2026-09-04 |
| Database under test | **local** `scratch_head_1010` (REACHED_HEAD 677/677, 944 tables, 900 RLS policies) | **local** `scratch_gates_head` (946 tables, 900 RLS policies) | **local** `scratch_gates_head` (945 tables, 900 RLS policies) |
| App role used | **local** `streamline_app` (`bypassrls=false`) | **local** `neondb_owner` (catalogue reads and one rolled-back tenant transaction) | **local** `neondb_owner`, and `streamline_app` for `runs/36` because the owner has `BYPASSRLS` |
| Captured by | automated agent run; **no human has signed anything in this bundle** | automated agent run; **no human has signed anything in this bundle** | automated agent run; **no human has signed anything in this bundle** |

**One honest note on generation 3's provenance.** Backend head advanced from `299cd1009` to
`8f319495c` while this bundle was being written. `git diff --stat 299cd1009..8f319495c` is three
files, all under `src/modules/notifications/`, and `git diff --name-only` over `src/scripts`,
`src/modules/gdpr`, `src/modules/hr/governance` and `src/modules/cron` between those two commits is
**empty** — no code any drill here exercises changed. The runs are labelled with the commit they
were actually captured at rather than with the newer one.

## What this bundle is, and what it is not

Every file under `runs/` is the **verbatim stdout+stderr of a command that was really executed**,
each terminated by its real `EXIT_CODE`. Nothing here is transcribed, summarised or reconstructed.

This bundle **does not** satisfy PRD-C186's or PRD-C187's *deployed* wording. Both criteria say
"**deployed**" ("Run **deployed** export … drills", "Prove **deployed** object/search/vector/cache/
downstream deletion plus backup aging and restore-time deletion"). There is no deployed
environment on this machine: no R2/S3 bucket, no provisioned Redis for the app, no PITR, no
backup system. The drills below were run against a **local** database and a local Postgres-resident
search and vector index. Where a store could only be reached from a deployed environment, this
bundle says so and stops. It does not simulate one.

## Redaction posture

- Every subject in every run is **synthetic**, created by `compliance:drill` itself or by the
  controlled experiment in `runs/15`/`runs/16`. Every address is on the reserved `.invalid` TLD
  (`drill+<hex>@compliance-synthetic.invalid`). **No real person's data appears in this bundle.**
- Generation 2's subjects are `user-100@scratch-seed.test` and `user-101@scratch-seed.test`, rows
  a local seeding script created in `scratch_gates_head`. `.test` is reserved by RFC 2606 in the
  same way `.invalid` is; neither can resolve. The connection string in `runs/23`-`runs/29` is
  `postgres://neondb_owner@localhost:5432/scratch_gates_head` — a local role with **no password**,
  echoed deliberately so the run is reproducible. `runs/23`-`runs/29` were scanned before sealing
  for `password`, `neon.tech`, `upstash`, `npg_`, `AKIA`, `sk-`, `Bearer` and `secret_key`: **zero
  matches**, and the only e-mail addresses present are the two synthetic subjects above.
- Connection strings were passed through the environment and are not echoed by any script; the
  bundle was scanned before sealing for the local scratch password, the remote Neon host, the
  Upstash host and AWS-style key prefixes. **Zero matches.** The only occurrences of the words
  "secret" / "key" are *variable names* a drill prints when telling the operator what is missing
  (`R2_SECRET_ACCESS_KEY`, `R2_ACCESS_KEY_ID`).
- **Every sentence above used to be checked by nobody.** Generations 1 and 2 asserted their own
  redaction in prose and in the `redaction` field of each seal manifest, and nothing re-ran that
  scan as the tree grew — so the sentence described a scan of a smaller bundle than the one it
  was sealing. Generation 3 replaces the assertion with a gate; see the next section.

## Redaction, verified rather than asserted (PRD-C188)

`check-evidence-redaction.mjs` (backend, `src/scripts/`) is generation 3's answer to the word
**redacted** in PRD-C188. `check:evidence-seal` proves *hashed*; until this gate existed nothing
proved *redacted*.

- **Corpus derived from the seals, not hand-written.** Every `artifact-hashes.json` under
  `architecture-refactor/final-refactor/evidence/` contributes the seal itself, every file it
  names, **and every regular file sitting directly in its directory**. That last clause is the one
  that matters: without it a leak could be parked in an unsealed file inside a sealed directory and
  the scanner would never open it. The corpus grows with the bundle and cannot be narrowed from
  the command line.
- **Fourteen patterns, each with its own controls.** AWS/Google/GitHub/Slack/Stripe/OpenAI key
  shapes, Neon and Upstash and RDS host names, JWTs, `Bearer` and `Basic` headers, private-key
  blocks, connection strings carrying a password, and any e-mail address that is *not* on a
  reserved TLD. Every pattern must match a positive control and must not match a negative one; a
  pattern that fails either makes the whole run **exit 2 (INCONCLUSIVE)**, because a scanner whose
  regex silently matches nothing is the vacuity trap this release keeps hitting.
- **Floors, not raisable from argv.** Below `MIN_SEALS`, `MIN_FILES_SCANNED` or
  `MIN_BYTES_SCANNED` the run is exit 2. "I scanned four files and found nothing" is not a pass.
- **`***` and `<neon-host>` are the redaction, not a leak.** A URL password segment that is a
  placeholder is exempt; a real one is not. Reserved-TLD addresses (`.invalid`, `.test`,
  `.example`) are exempt; a resolvable one is not.
- **The two deliberate fixtures are pinned individually, by hash.** `ai-redaction-probe.mjs`/`.txt`
  contain a fabricated API key as the CONTROL input that proves the product's redactor replaces it.
  Each is pinned in `DECLARED_SYNTHETIC` by file, pattern and the **sha256 of the matched text** —
  never the literal, which would put a credential-shaped string into the repository that is being
  guarded — and a pinned entry that stops matching **fails the gate**, so the list cannot rot into
  a blanket exemption.

```bash
cd streamlineos-backend && node src/scripts/check-evidence-redaction.mjs             # exit 0 = redacted
cd streamlineos-backend && node src/scripts/check-evidence-redaction.mjs --self-test # controls + bite proofs
```

`runs/39` is the self-test, `runs/40` the 13-test regression spec
(`src/scripts/evidence-redaction-gate.spec.ts`), and `runs/41` the bite proof: two defects — the
weakened-assertion shape (`return true ||` in front of the e-mail exemption) and the narrowed-corpus
shape (drop the unsealed-siblings clause) — are put into the shipped gate one at a time, the spec
goes red on each, and the file is restored byte-identically and goes green again.

## Hashing (PRD-C188)

`ops:evidence:capture` **does** implement SHA-256 hashing, but it **cannot be reused here**:
`src/scripts/production-ops-evidence.mjs:48` fixes its runbook set to `RB-01 … RB-08`, so `RB-10`
is rejected as `unsupported runbook`, and its schema additionally demands
`evidenceKind: "deployed-operator-attested"`, `live: true`, a non-local `https` target and a named
operator with an approval timestamp. Reusing it for RB-10 would mean **fabricating a deployed
attestation and a human approval**. It was therefore not used.

The hashing mechanism that *does* cover this tree is the one `check:evidence-seal` verifies:
an `artifact-hashes.json` seal per directory, SHA-256 over the exact bytes on disk. This bundle
carries three seals (`./`, `runs/`, `probes/`). `check:evidence-seal` rejects a changed file, a
deleted file **and** an unsealed file appearing in a sealed directory, so the seal cannot be
defeated by adding to it.

```bash
cd streamlineos-backend && npm run check:evidence-seal      # exit 0 = every seal holds
```

Baseline before this bundle existed: `runs/12-check-evidence-seal-before.txt` — 2 seals,
41/41 sealed files match, exit 0. `runs/22-check-evidence-seal-after.txt` records an intermediate
generation and its own header says so.

**Seal counts move as the evidence tree grows, and this line has been wrong before.** At the time
generation 1 was written it claimed "5 seals, 68/68"; by the time it was read that was already
stale in both directions. The count is therefore not restated here as a fact to be trusted — run
the gate:

```bash
cd streamlineos-backend && npm run check:evidence-seal   # exit 0 = every seal holds
```

At generation 2 (`dcd5a2071`) it reported **6 seals · 80/80 sealed files match · 0 broken, exit 0**.
By generation 3 that was already **7 seals · 95/95** before this generation's eleven files were
added, which is the third time this line has gone stale and the reason it is written as history
rather than as a current fact. Run the gate.

## Commands actually run

| # | Command | Exit | Result |
|---|---|---|---|
| 01 | `compliance:drill -- --execute` | 0 | PASS — 7/7 required audit actions; committed the synthetic subject the rest of the chain uses |
| 02 | `drill:export <subject>` | 0 | PASS — incl. cross-tenant isolation: 0 rows under a foreign-org GUC, 1 row under the correct GUC |
| 03 | `drill:legal-hold <subject> <org>` | 0 | **PASS 9/9 that proved nothing — F-11, now FIXED; see 27.** Every assertion read the drill's own INSERT |
| 04 | `drill:erasure <subject>` (dry-run) | **1** | **FAIL — F-1.** Aborts on `audit_logs`; 219 tables abandoned |
| 05 | `check:retention-coverage` | 0 | **Vacuous pass — F-3, now FIXED; see 23.** `highGrowthTables: 0`; nothing measured |
| 05b | `check:retention-coverage --threshold-mb=0.001` | 0 | **Still 0 tables — F-3.** Proves the integer-division bug |
| 06 | `check:retention-coverage:self-test` | 0 | PASS — 22/22 matrix checks |
| 07 | `drill:erasure:self-test` | 0 | PASS — FK topological ordering |
| 08 | `drill-export.mjs --self-test` | 0 | PASS — vacuity guard bites |
| 09 | `drill-legal-hold.mjs --self-test` | 0 | PASS — hold contract bites |
| 10 | `drill-storage-purge.mjs --self-test` | 0 | PASS — 4/4 storage assertions bite |
| 11 | `purge:user <subject>` (dry-run) | **1** | **FAIL — F-2.** NOT-NULL violation before a single row is deleted |
| 12 | `check:evidence-seal` | 0 | PASS — pre-existing 41/41 baseline |
| 13 | `compliance-drill-e2e.mjs --self-test` | 0 | PASS — 8 assertion bite proofs |
| 14 | `compliance-drill-e2e.mjs --subject … --org …` | 0 | **PASS 13/13 but vacuous — F-4.** Erasure phase self-skipped |
| 15 | `drill:erasure` — control A (0 audit rows) | 0 | PASS — 0 residual rows |
| 16 | `drill:erasure` — control B (1 audit row) | **1** | **FAIL** — isolates the trigger as the single cause of F-1 |
| 17 | `psql -f probes/search-vector-deletion-probe.sql` | 0 | PASS — search + vector deletion proven **through the indexes** |
| 18 | `check:audit-log-privileges` | 0 | PASS — `updateRevoked`, `deleteRevoked`, `triggerPresent` all true |
| 19 | `check:audit-log-privileges:self-test` | 0 | PASS — verifier distinguishes safe/unsafe/wrong-role |
| 20 | `jest audit-log-immutability.spec.ts` | 0 | PASS — 9 tests |
| 21 | `jest` 5 focused GDPR suites | 0 | PASS — 85 tests |
| 22 | `check:evidence-seal` (after sealing this bundle) | 0 | PASS — see note below |

### Generation 2 — retention and legal hold re-run after the fixes (2026-09-04, `dcd5a2071`)

| # | Command | Exit | Result |
|---|---|---|---|
| 23 | `check:retention-coverage` | **1** | **The gate now measures.** 41 tables cleared 1 MB; 17 COVERED, 2 KEEP-FOREVER, **22 UNCOVERED**. Generation 1 saw `highGrowthTables: 0` on the same shape of database. The exit 1 is a real finding — F-12 — not a broken gate |
| 24 | `check:retention-coverage:self-test` | 0 | PASS — 26 checks (22 matrix + 4 that pin the divisor and the corpus floors) |
| 25 | `jest retention-coverage-gate.db.spec.ts` | 0 | PASS — 9 tests against the live catalogue: the integer divisor loses tables the numeric one keeps; a threshold no table clears is exit 2, not 0; `template1` is exit 2; an absent `DATABASE_URL` is exit 2 with empty stdout |
| 26 | `drill:legal-hold --self-test` | 0 | PASS — 8/8 production symbols resolve on their real classes. The old self-test asserted `holdCheck({hrActive:true}).erasureBlocked === true`, its own identity function |
| 27 | `drill:legal-hold user-100@scratch-seed.test <org>` | 0 | **PASS 15/15 across 9 production paths** and three phases (control / held / released). Every verdict is a real service method's answer; nothing committed |
| 28 | bite proof — reintroduce `/ 1048576` in place | **1**, then 0 | The self-test goes red (`sizeDivisorIsNumericNotInteger: false`) and 2 of 9 db-spec tests fail; restoring the file returns both to 0. `git diff` empty before and after |
| 29 | bite proof — delete the hold gate in `RetentionService.processRequest` | **1** | The drill drops to **FAIL (11 passed, 4 failed)**. The generation-1 drill would have stayed green at 9/9, because none of its assertions ran product code. `git diff` empty after restore |

### Generation 3 — both drills re-run at the close-out head, and the redaction gate (2026-09-04, `299cd1009`)

| # | Command | Exit | Result |
|---|---|---|---|
| 30 | `check:retention-coverage` | **1** | **The gate measures, and the gap grew.** 45 tables cleared 1 MB; 18 COVERED, 2 KEEP-FOREVER, **25 UNCOVERED**. Generation 2 saw 41/17/2/**22** at `dcd5a2071`; `kb_pages` moved to COVERED (ticket 16) and four more tables crossed 1 MB. Exit 1 is finding **F-12**, not a broken gate |
| 31 | `check:retention-coverage:self-test` | 0 | PASS — 26 checks, including the four that pin the numeric divisor and the corpus floors |
| 32 | `drill:legal-hold --self-test` | 0 | PASS — 8/8 production symbols still resolve on their real classes |
| 33 | `drill:legal-hold user-100@scratch-seed.test <org>` | 0 | **PASS 15/15 across 9 production paths** and three phases (control / held / released). Every verdict is a real service method's answer; the whole run is one rolled-back tenant transaction |
| 34 | `drill:erasure:self-test` | 0 | PASS — FK topological ordering |
| 35 | `drill-export.mjs --self-test` | 0 | PASS — vacuity guard bites |
| 36 | `check:audit-log-privileges` (app role) | 0 | PASS — `updateRevoked`, `deleteRevoked`, `triggerPresent` all true. Under the **owner** role the same gate is exit **2**, not 0, because `BYPASSRLS` would report a boundary the service does not have |
| 37 | `check:audit-log-privileges:self-test` | 0 | PASS — the verifier distinguishes safe/unsafe/wrong-role |
| 39 | `check-evidence-redaction.mjs --self-test` | 0 | PASS — 18 checks: pattern controls, five bite proofs, three negative proofs, corpus and floor assertions |
| 40 | `jest evidence-redaction-gate.spec.ts` | 0 | PASS — 13 tests, including one that scans the **real** evidence tree and one for each anti-vacuity floor |
| 41 | bite proof — two defects put into the shipped redaction gate | **1**, **1**, then 0 | Widening the e-mail exemption reds 2 of 13; narrowing the corpus reds a different 2 of 13; the restored file is byte-identical (`shasum` printed before and after) and green |

**`runs/38` is deliberately absent.** It was reserved for a run of `check-evidence-redaction.mjs`
over this bundle, and there is no honest way to seal one: the gate reads the seal manifests
themselves, so writing its transcript into the bundle changes the bytes the transcript reports on.
The gate is run live instead — the command is in the section above — and `runs/39`/`runs/40` carry
the parts that are stable under sealing.

`runs/18` closes a standing RB-10 §6 note. The runbook records
*"FINDING P1: the enabled append-only trigger is absent"*; at this head the verifier reports
`triggerPresent: true` against the app role. The trigger is present — **and it is the direct cause
of finding F-1.**

## Criterion outcomes

- **PRD-C186** — the *local* halves ran and are recorded above: export, cross-tenant and
  repeat-request (idempotency-keyed at `gdpr-export.service.ts:34-57`) pass; erasure **fails**
  (F-1). The legal-hold half is now carried by `runs/27`, not by `runs/03` — `runs/03`'s "PASS 9/9"
  was vacuous (F-11) and must not be counted here. Correction/rectification and portability are covered by repository specs
  (`runs/21`), not by a drill. The **deployed** run, the transfer/residency drill and the actual
  export *file* download remain blocked on an environment that does not exist here.
- **PRD-C187** — see `C187-downstream-store-trace.md`. Search and vector are **DELETION PROVEN**
  locally through their indexes. Object store, cache and downstream are traced with `file:line`
  and classified honestly. Backup aging and restore-time deletion are **not provable here at all**.
- **PRD-C188** — **all three of the criterion's requirements are met, and the words matter.**

  *Run retention drills.* `runs/30` at `299cd1009`: 945 tables in the catalogue, 45 clear the 1 MB
  threshold, every one of them classified — 18 COVERED, 2 KEEP-FOREVER, 25 UNCOVERED. The drill
  ran and it measured. Its exit code is **1**, and that 1 is the drill working: 25 high-growth
  tables have no retention decision (**F-12**, open). Generation 1's `runs/05` exited **0** having
  classified zero tables, and `runs/05b` proved no `--threshold-mb` could rescue it. The honest
  reading of a red retention drill is "the product has a retention gap", not "the drill failed" —
  and F-12 is explicit that it **must not** be closed by writing 25 matrix rows to turn the gate
  green, because a KEEP-FOREVER with no owner is the allowlist-instead-of-a-fix this release
  rejects. `runs/28` proves this drill goes red when the integer divisor is put back.

  *Run legal-hold drills.* `runs/33` at `299cd1009`: PASS 15/15 across **nine production methods**
  (`RetentionService.processRequest`, `.sweepStrandedDeleteRequests`,
  `GdprSubjectErasureService.eraseSubject`, `GdprStoragePurgeService.buildManifest`,
  `LegalHoldsService.create`/`.release`, `isUnderLegalHold`, `subjectsUnderLegalHold`) in three
  phases. The control phase is what makes the held phase mean anything: an *unheld* delete request
  must run to `completed`, or "blocked" would also be the answer from a product that erases nothing
  for anybody. `runs/29` proves this drill goes red when one hold gate is deleted; generation 1's
  `runs/03` would have stayed at 9/9 green through the same deletion.

  *Store a redacted, hashed evidence bundle.* **Hashed** — `check:evidence-seal`, exit 0, and it
  rejects a changed file, a deleted file and an unsealed file appearing in a sealed directory.
  **Redacted** — this was the half nothing checked. Generations 1 and 2 asserted their own
  redaction in prose. Generation 3 adds `check-evidence-redaction.mjs`, whose corpus is derived
  from the seals, whose fourteen patterns each carry a positive and a negative control, whose
  floors are not reachable from argv, and whose two fixture exemptions are pinned by sha256 and
  fail when stale. `runs/40` is its 13-test spec; `runs/41` is the bite proof that both a weakened
  assertion and a narrowed corpus turn it red.

  **What is still open here, stated plainly:** F-12 (25 tables needing a named retention decision)
  and F-13 (five real researcher e-mail addresses in an **unsealed** `pnpm audit` dump elsewhere in
  the evidence tree). Neither is a defect in the drills or in this bundle's redaction; both are
  recorded in `FINDINGS.md` with an owner-shaped description rather than quietly fixed.

## Findings

`FINDINGS.md` — 12 defects (3×P1, 9×P2) with `file:line`, every one reproduced by a command in `runs/`.

- **P1** F-1 `drill:erasure` aborts on `audit_logs` and abandons 219 tables · F-2 `purge:user` cannot purge any org owner · F-7 the subject's e-mail address survives erasure for up to 13 months
- **P2** F-3 retention gate measures zero tables and passes — **FIXED at `dcd5a2071`** · F-4 e2e drill passes without erasing · F-5 storage purge has no durable manifest · F-6 failed deletes never retried · F-8 directory caches not invalidated · F-9 analytics/provider mirrors have no subject path · F-10 `compliance:drill` prints two false statements into evidence · F-11 the legal-hold drill asserted only against its own `INSERT` — **FIXED at `dcd5a2071`** · F-12 **25** high-growth tables have no retention decision at `299cd1009` — **OPEN**, surfaced by fixing F-3 · F-13 five real researcher e-mail addresses sit in an unsealed `pnpm audit` dump under `42-production-ops/edge-security/commands/` — **OPEN**, surfaced by building the redaction gate

### Two findings this bundle records against its own generation 1

F-3 and F-11 are defects in the *drills*, not in the product: two commands in the table above
reported green while measuring nothing. They are kept in `FINDINGS.md` with their original
evidence because a bundle that quietly deletes its own false green is worth less than one that
shows the correction.
