# RB-10 — Export, erasure, retention and legal-hold drill evidence

Ticket 35 (`code-release-10-10-v2/issues/35-compliance-privacy-drills.md`), criteria
**PRD-C186**, **PRD-C187**, **PRD-C188**.

| | |
|---|---|
| Backend commit | `45f8a2e99494483526e357e27f18c76961ebf266` (`release/code-10-10-v2`) |
| Frontend/root commit | `7469d27895add587f9427e7c50c457f56e0048bf` (`release/code-10-10-v2`) |
| Captured | 2026-09-03 |
| Database under test | **local** `scratch_head_1010` (REACHED_HEAD 677/677, 944 tables, 900 RLS policies) |
| App role used | **local** `streamline_app` (`bypassrls=false`) |
| Captured by | automated agent run; **no human has signed anything in this bundle** |

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
- Connection strings were passed through the environment and are not echoed by any script; the
  bundle was scanned before sealing for the local scratch password, the remote Neon host, the
  Upstash host and AWS-style key prefixes. **Zero matches.** The only occurrences of the words
  "secret" / "key" are *variable names* a drill prints when telling the operator what is missing
  (`R2_SECRET_ACCESS_KEY`, `R2_ACCESS_KEY_ID`).

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
41/41 sealed files match, exit 0. After sealing: **5 seals, 68/68 sealed files match, 0 broken,
exit 0** — the pre-existing 41 still hold, so this bundle disturbed nothing.
(`runs/22-check-evidence-seal-after.txt` was captured one generation earlier, before the final
re-seal that added it; its own header says so.)

## Commands actually run

| # | Command | Exit | Result |
|---|---|---|---|
| 01 | `compliance:drill -- --execute` | 0 | PASS — 7/7 required audit actions; committed the synthetic subject the rest of the chain uses |
| 02 | `drill:export <subject>` | 0 | PASS — incl. cross-tenant isolation: 0 rows under a foreign-org GUC, 1 row under the correct GUC |
| 03 | `drill:legal-hold <subject> <org>` | 0 | PASS 9/9 — hold blocks erasure, retention and org purge; release re-enables |
| 04 | `drill:erasure <subject>` (dry-run) | **1** | **FAIL — F-1.** Aborts on `audit_logs`; 219 tables abandoned |
| 05 | `check:retention-coverage` | 0 | **Vacuous pass — F-3.** `highGrowthTables: 0`; nothing measured |
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

`runs/18` closes a standing RB-10 §6 note. The runbook records
*"FINDING P1: the enabled append-only trigger is absent"*; at this head the verifier reports
`triggerPresent: true` against the app role. The trigger is present — **and it is the direct cause
of finding F-1.**

## Criterion outcomes

- **PRD-C186** — the *local* halves ran and are recorded above: export, legal-hold, cross-tenant
  and repeat-request (idempotency-keyed at `gdpr-export.service.ts:34-57`) all pass; erasure
  **fails** (F-1). Correction/rectification and portability are covered by repository specs
  (`runs/21`), not by a drill. The **deployed** run, the transfer/residency drill and the actual
  export *file* download remain blocked on an environment that does not exist here.
- **PRD-C187** — see `C187-downstream-store-trace.md`. Search and vector are **DELETION PROVEN**
  locally through their indexes. Object store, cache and downstream are traced with `file:line`
  and classified honestly. Backup aging and restore-time deletion are **not provable here at all**.
- **PRD-C188** — retention and legal-hold drills ran (03, 05, 05b, 06, 09, 14); this bundle *is*
  the redacted, hashed evidence. The retention **coverage gate itself is vacuous** (F-3), so the
  drill result must not be read as "retention is covered".

## Findings

`FINDINGS.md` — 10 defects (3×P1, 7×P2) with `file:line`, every one reproduced by a command in `runs/`.

- **P1** F-1 `drill:erasure` aborts on `audit_logs` and abandons 219 tables · F-2 `purge:user` cannot purge any org owner · F-7 the subject's e-mail address survives erasure for up to 13 months
- **P2** F-3 retention gate measures zero tables and passes · F-4 e2e drill passes without erasing · F-5 storage purge has no durable manifest · F-6 failed deletes never retried · F-8 directory caches not invalidated · F-9 analytics/provider mirrors have no subject path · F-10 `compliance:drill` prints two false statements into evidence
