# What PRD-C190 and PRD-C194 are measured by

Two of ticket 36's seven criteria are written in a way that cannot be adjudicated as written:

> **PRD-C190** — Immediate code-level gate remains green at the deployed commit.
>
> **PRD-C194** — No unresolved production/compliance P0/P1 finding remains.

"Green" and "no unresolved finding" are verdicts, not measurements. Neither criterion names the
gate list, the command, the register or the severity rubric, so two honest readers can reach
opposite conclusions from the same repository. This file fixes both to something executable, so
that when a deployed commit exists the answer is produced by a command rather than by an opinion.

**This file defines the measurement. It does not perform it, and it does not claim either
criterion is met.** Both are DEPLOYED-class in the ledger: there is no deployed environment on
this machine, so there is no deployed commit for C190 to be green at, and no deployed drill has
run to produce a finding for C194 to be clear of.

| | |
|---|---|
| Written | **2026-09-03** |
| Frontend/root commit | `7469d27895add587f9427e7c50c457f56e0048bf` (`release/code-10-10-v2`) |
| Backend commit | `2f37e1bb035006e5c03680497298ad62031e79d6` (`release/code-10-10-v2`) |
| Ticket | 36 — Production release authority |

---

# Part 1 — PRD-C190

## 1.1 What "the immediate code-level gate" is

PRD-C190 does not define it. Two other criteria do, and they are the authority:

> **PRD-C020** — At the same commit run backend build/typecheck, spec typecheck, frontend
> typecheck, OpenAPI freshness, cycle, file-size, dead-code, tenant-isolation, RLS, permission,
> cache, outbox, idempotency, migration, vulnerability, license and SBOM gates.
>
> **PRD-C158** — Backend/frontend builds, typechecks, focused tests, disposable E2E and
> architecture gates pass at one commit.

C020 names **seventeen families plus SBOM**. C158 adds **focused tests** and **disposable E2E**.
PRD-C156 folds in every other unchecked immediate criterion, and PRD-C159 adds the bootstrap
proof. The gate list below is those families resolved to the scripts that actually exist at this
commit. Every script name was verified present in `package.json` on 2026-09-03; none is aspirational.

## 1.2 The gate list

`BE` = `pnpm -C backend`. `FE` = `pnpm -C frontend`.

### A. Builds, typechecks and tests — PRD-C020 + PRD-C158

| # | Family (C020/C158 wording) | Command |
|---:|---|---|
| 1 | backend build | `BE build` |
| 2 | backend typecheck | `BE typecheck` |
| 3 | spec typecheck | `BE check:spec-typecheck:self-test && BE check:spec-typecheck` |
| 4 | spec typecheck (test tree) | `BE check:test-typecheck:self-test && BE check:test-typecheck` |
| 5 | frontend build | `FE build` |
| 6 | frontend typecheck | `FE type-check` |
| 7 | frontend spec typecheck | `FE check:test-typecheck:self-test && FE check:test-typecheck` |
| 8 | focused tests — backend | `BE test` |
| 9 | focused tests — frontend | `FE test` |
| 10 | disposable-database E2E | `BE test:e2e:seeded` |

### B. Contract and OpenAPI freshness — PRD-C020 "OpenAPI freshness"

| # | Gate | Command |
|---:|---|---|
| 11 | OpenAPI document is current | `BE openapi:check:self-test && BE openapi:check` |
| 12 | exposure / request / response coverage | `BE check:openapi-coverage:self-test && BE check:openapi-coverage` |
| 13 | path parameters declared | `BE check:openapi-path-params:self-test && BE check:openapi-path-params` |
| 14 | operation IDs unique | `BE check:operation-ids:self-test && BE check:operation-ids` |
| 15 | published operations registered/versioned | `BE check:contract-registry:self-test && BE check:contract-registry` |
| 16 | no breaking change to a published operation | `BE check:contract-breaking-change:self-test && BE check:contract-breaking-change` |
| 17 | vendored frontend copy is not stale | `FE check:contract-vendor:self-test && FE check:contract-vendor` |
| 18 | frontend types have not drifted | `FE check:contract-drift:self-test && FE check:contract-drift` |

### C. Cycle — PRD-C020 "cycle"

| # | Gate | Command |
|---:|---|---|
| 19 | backend import cycles | `BE check:cycles` |
| 20 | frontend import cycles | `FE check:cycles` |
| 21 | Nest DI cycles and token erasure | `BE check:module-di:self-test && BE check:module-di` |

### D. File size — PRD-C020 "file-size"

| # | Gate | Command |
|---:|---|---|
| 22 | backend hard 500 | `BE check:file-sizes:self-test && BE check:file-sizes` |
| 23 | backend over-300 ratchet | `BE check:over-300:self-test && BE check:over-300` |
| 24 | frontend hard 500 | `FE check:file-sizes:self-test && FE check:file-sizes` |
| 25 | frontend over-300 ratchet | `FE check:over-300:self-test && FE check:over-300` |

### E. Dead code — PRD-C020 "dead-code"

| # | Gate | Command |
|---:|---|---|
| 26 | backend | `BE check:dead-code:self-test && BE check:dead-code` |
| 27 | frontend | `FE check:dead-code:self-test && FE check:dead-code` |

### F. Tenant isolation and RLS — PRD-C020 "tenant-isolation, RLS"

| # | Gate | Command | Prerequisite |
|---:|---|---|---|
| 28 | isolation declaration coverage (static) | `BE check:tenant-isolation:self-test && BE check:tenant-isolation` | — |
| 29 | isolation suites actually execute | `BE check:tenant-isolation:run` | — |
| 30 | tenant indexes | `BE check:tenant-indexes:self-test && BE check:tenant-indexes` | — |
| 31 | tenant relationships vs live catalog | `BE check:tenant-relationships` | a database **at journal head** |
| 32 | **RLS behaviour** | `BE db:verify-rls` | `DATABASE_URL`; probes with a non-owner role |
| 33 | retention coverage | `BE check:retention-coverage:self-test && BE check:retention-coverage` | — |

Gate 32 is the only script in either repository that answers PRD-C020's word "RLS" behaviourally.
It creates probe roles and probe tables, so it must be pointed at a disposable database, never at
the shared remote. **A note the record must carry forward:** `external_effect_ledger` is the one
FORCE-RLS table in the schema, so a probe running as the database *owner* is itself filtered and
will read zero rows. Benchmarking or probing RLS as the owner is what PRD-C079 forbids
("Benchmark under the application role with tenant context and RLS, never only as the database
owner"), and it is the same trap.

### G. Permission — PRD-C020 "permission"

| # | Gate | Command |
|---:|---|---|
| 34 | backend permission-key catalog | `BE check:permission-keys:self-test && BE check:permission-keys` |
| 35 | navigation gates name the route's key | `BE check:navigation-permissions:self-test && BE check:navigation-permissions` |
| 36 | DataScope reaches a predicate | `BE check:scope-application:self-test && BE check:scope-application` |
| 37 | record access | `BE check:record-access:self-test && BE check:record-access` |
| 38 | controllers gate on their own module | `BE check:module-gate:self-test && BE check:module-gate` |
| 39 | frontend catalog agrees with backend | `FE check:permission-catalog:self-test && FE check:permission-catalog` |
| 40 | frontend gate bindings | `FE check:permission-binding:self-test && FE check:permission-binding` |
| 41 | gated-read hooks carry a valid contract | `FE check:gated-reads:self-test && FE check:gated-reads` |
| 42 | mutation hooks carry the right key | `FE check:command-catalog:self-test && FE check:command-catalog` |

### H. Cache — PRD-C020 "cache"

| # | Gate | Command |
|---:|---|---|
| 43 | writes and invalidations agree | `BE check:cache-invalidation:self-test && BE check:cache-invalidation` |
| 44 | cache key shapes | `BE check:cache-key-shapes:self-test && BE check:cache-key-shapes` |
| 45 | every namespace has a reader and a bumper | `BE check:namespace-coverage:self-test && BE check:namespace-coverage` |
| 46 | frontend query-key scope | `FE check:query-scope:self-test && FE check:query-scope` |

### I. Outbox and idempotency — PRD-C020 "outbox, idempotency"

| # | Gate | Command |
|---:|---|---|
| 47 | outbox consumer registry | `BE check:outbox-consumers:self-test && BE check:outbox-consumers` |
| 48 | retryable commands are fenced | `BE check:idempotent-commands:self-test && BE check:idempotent-commands` |
| 49 | deferred work is not fired and forgotten | `BE check:fire-and-forget:self-test && BE check:fire-and-forget` |
| 50 | `ON CONFLICT` targets are inferable | `BE check:conflict-targets:self-test && BE check:conflict-targets` |

### J. Migration — PRD-C020 "migration" + PRD-C159

| # | Gate | Command | Prerequisite |
|---:|---|---|---|
| 51 | authoring discipline | `BE check:migration-discipline:self-test && BE check:migration-discipline` | — |
| 52 | chain integrity | `BE check:migration-chain:self-test && BE check:migration-chain` | — |
| 53 | rollbacks are truthful | `BE check:migration-rollback:self-test && BE check:migration-rollback` | — |
| 54 | dropped columns not still declared | `BE check:drop-column-safety:self-test && BE check:drop-column-safety` | — |
| 55 | `db:generate` cannot run on a stale snapshot | `BE check:db-generate-guard:self-test && BE check:db-generate-guard` | — |
| 56 | ledger vs journal | `BE check:migration-ledger` | a live database |
| 57 | **two clean bootstraps + interrupt/resume + catalog parity** | `BE migration:proof` | a disposable database |

Gate 57 is what PRD-C159 asks for and is the most expensive item in the list. It is also the one
most often reported from a former head: the journal has been at 634, 635, 637, 639, 666, 672 and
**677 entries** during this release, and an evidence bundle is only as current as its journal count.
Measured 2026-09-03: **`migrations/meta/_journal.json` holds 677 entries and there are 677 `.sql`
files.**

### K. Supply chain — PRD-C020 "vulnerability, license and SBOM"

| # | Gate | Command | Prerequisite |
|---:|---|---|---|
| 58 | vulnerabilities | `BE check:vulnerabilities:self-test && BE check:vulnerabilities` | network |
| 59 | licences | `BE check:licenses:self-test && BE check:licenses` | network |
| 60 | SBOM | `BE sbom:generate:self-test && BE sbom:generate` | — |

### L. Gate integrity — PRD-C104 and PRD-C011

These are not in C020's list, and they are the reason the list can be trusted at all. A gate that
cannot fail is worse than an absent one: it reports green over unread code.

| # | Gate | Command |
|---:|---|---|
| 61 | every `check:*` is wired to a step that can fail the job | `BE check:gate-wiring:self-test && BE check:gate-wiring` |
| 62 | same, frontend | `FE check:gate-wiring:self-test && FE check:gate-wiring` |
| 63 | no gate's own baseline moved in the unsafe direction | `BE check:baseline-integrity:self-test && BE check:baseline-integrity` |
| 64 | tests that run can fail | `BE check:vacuous-assertions:self-test && BE check:vacuous-assertions` |
| 65 | transaction doubles run their callback | `BE check:transaction-callbacks:self-test && BE check:transaction-callbacks` |
| 66 | gated handlers have a deny test | `BE check:authz-deny:self-test && BE check:authz-deny` |
| 67 | skipped tests are declared, not hidden | `BE check:test-suppressions:self-test && BE check:test-suppressions` |
| 68 | frontend test integrity | `FE check:test-integrity:self-test && FE check:test-integrity` |
| 69 | PRD traceability manifest is fail-closed | `FE check:prd-traceability:self-test && FE check:prd-traceability` |
| 70 | evidence seals still hash-match | `BE check:evidence-seal:self-test && BE check:evidence-seal` |

**Gate 61's own output is the completeness proof for this whole list.** Measured 2026-09-03:

```
check-gate-wiring: 100 gates, 91 of them able to FAIL the job (0 registered non-blocking),
all invoked by a run: step of a reachable job (161 run steps across 15 jobs in 7 workflow
files, all 7 reachable, 9 deliberate exceptions).
```

If a gate exists in `package.json` and is not in the list above, gate 61 either accounts for it
as one of the 9 registered exceptions or fails. That is what makes the list closed rather than
a matter of taste. The 9 exceptions, each carrying a measured reason in
`src/scripts/check-gate-wiring.mjs`, are eight live-database `verify:*` / `db:check-*` gates and
`check:alert-ack` — whose live half is *deliberately* unrunnable in CI because it needs a nonce a
human typed back from the alert channel.

## 1.3 The exact command

There is no single "run every gate" script in either repository, and inventing one here would
create a second, drifting definition of the gate list. The command below runs the list above in
order through the harness ticket 30 built for exactly this purpose.

```sh
# Run from the workspace root that contains both checkouts.
# run-gate.mjs is the release harness (PRD-C015). It preserves the three-way exit contract:
#   0 = the rule was checked and holds
#   1 = the rule was checked and is VIOLATED  -> a real finding, fails the run
#   2 = the rule COULD NOT be checked         -> INCONCLUSIVE, prerequisite absent
# Exit 2 is a passing step with a visible warning. It is NOT a pass of the rule.
BE="pnpm -C streamlineos-backend"
FE="pnpm -C streamlineos-frontend/frontend"

$BE exec node src/scripts/run-gate.mjs \
  check:gate-wiring:self-test check:gate-wiring \
  --prerequisite "a sibling frontend checkout is absent"
# ... repeated for each numbered gate above, in order, stopping at the first exit 1.
```

Three rules govern how the result is read. They come from PRD-C016 — *"interrupted, skipped and
prerequisite-blocked gates never count as passing"* — and they are the whole point of the harness:

1. **Exit 2 is not a pass.** A gate that could not run because its database, network or webhook
   was absent proves nothing about the rule. It is recorded as INCONCLUSIVE with the named
   prerequisite, never rolled into a pass count.
2. **A `:self-test` is not the gate.** It proves the detector bites against a planted defect. It
   never reads the repository or the database. Both halves must run, in that order.
3. **An interrupted run is not a run.** A gate killed by a timeout, an OOM or a laptop-budget
   cap is recorded as interrupted. Note the specific trap here: the backend typecheck needs an
   8 GB heap, and a `tsc` that crashes greps as "0 errors" — a false pass.

## 1.4 The state of the gate list at this commit

Measured 2026-09-03 at the SHAs above, and recorded so the record is not silent about what is
already known to be red. This is not a full run — the orchestrator owns builds, typechecks and
suites — it is the cheap subset ticket 36 ran itself.

| Gate | Exit | Result |
|---|---:|---|
| `FE check:prd-traceability` (69) | **0** | 195 rows, 195 ticket criteria, 0 checked / 195 unchecked, one owner each |
| `BE check:gate-wiring` (61) | **0** | 100 gates, 91 able to fail, 9 registered exceptions |
| `BE check:evidence-seal` (70) | **0 → 1** | Read three times in 15 minutes: 2 seals/41 files (exit 0) → 5 seals/68 files (exit 0) → **5 seals · 68/68 match · 2 BROKEN** (exit 1). Both breaks are files added to `RB-10-privacy-compliance/probes/` and `/runs/` *after* their seal was written, by a ticket still working. Not tampering, and not caused by anything in `release-authority/`, which is unsealed. |
| `BE check:baseline-integrity` (63) | **1** | **RED.** `check-envelope-consistency.mjs :: MAX_HOPS = 8` is unregistered — a net raise of 8 against 0 registered |
| `BE check:s05-artifact-contract` | **0** | the approval template carries all six functions and all three evidence-index columns |

**PRD-C190 cannot be green today for a reason that has nothing to do with any of these gates:
there is no deployed commit.** It also cannot be green for a second, nearer reason — at the time
of writing neither working tree is clean, so the "one clean frontend/backend commit pair" PRD-C016
requires does not exist. Measured: frontend **30 tracked files modified, 26 untracked**; backend
**15 tracked files modified, 5 untracked**.

---

# Part 2 — PRD-C194

> **PRD-C194** — No unresolved production/compliance P0/P1 finding remains.

## 2.1 Which findings are in scope

C194 is the deployed twin of PRD-C160 (*"No unresolved code-level P0/P1 finding remains"*). The
word that separates them is **production/compliance**. In scope for C194 is a finding whose
subject is:

- **production** — a defect observed in, or a property of, a deployed environment: the cell
  topology, TLS, edge, replica, PITR, backups, alerting, rollout, capacity or cost;
- **compliance** — a privacy, retention, legal-hold, residency, subprocessor, operator-access or
  data-subject-rights defect.

A finding in application code that a local gate or suite can reproduce belongs to PRD-C160 and
ticket 31, not here. The two must not be merged: doing so lets a code finding be closed by a
deployed drill, or a deployed finding be closed by a passing unit test.

## 2.2 The registers

| Register | Path | Scope |
|---|---|---|
| Code-release register, reports 00–19 | `.scratch/code-release-10-10/reports/findings-register.md` | historical, mixed |
| Code-release register, reports 20–43 | `.scratch/code-release-10-10/reports/findings-register-20-43.md` | historical, mixed; 258 numbered findings |
| v2 ticket reports | `.scratch/code-release-10-10-v2/reports/*.md` | current wave, per ticket |
| **Deployed evidence manifests** | `architecture-refactor/final-refactor/evidence/42-production-ops/RB-*/` | **the only register that can hold a C194 finding** |

Both historical registers open with the same warning, and it is the reason a raw grep of them is
not a measurement:

> Every FIXED / OPEN / PARTIAL / BLOCKED verdict in this register is a claim about the moment its
> source report was written, not about head.

So a C194 finding is not "a row in a register". It is **an assertion that failed in a captured
deployed-evidence manifest, or a finding filed against a deployed environment and not yet
dispositioned.** That definition is executable, because the manifest schema already carries the
assertion results.

## 2.3 The exact command

```sh
pnpm -C streamlineos-backend ops:evidence:check
```

This is the measurement, and it is not a proxy for one. `production-ops-evidence.mjs verify`:

- walks `architecture-refactor/final-refactor/evidence/42-production-ops/` for manifests
  (`*.json`, excluding `*.input.json`);
- re-hashes every referenced artifact and fails on a byte or SHA-256 mismatch;
- fails any artifact containing self-test, dry-run, mock, fixture, fake or simulation wording;
- fails any artifact that looks like it holds an unredacted credential;
- requires **every** required assertion for each runbook to be `result: "pass"`, linked to a real
  artifact, with an ISO `observedAt`;
- requires a passing bundle for **all of RB-01 through RB-08**, and fails naming each one missing.

**A C194 finding is any assertion this command reports as not passing, plus any finding filed
against a deployed environment that has not been closed or formally dispositioned under
PRD-C189.** "No unresolved production/compliance P0/P1 finding remains" is therefore true when,
and only when, this command exits 0 and the disposition list is empty.

## 2.4 Severity

Neither the PRD nor the manifest schema defines P0/P1, so the register is not self-adjudicating.
The rubric below is proposed for the release authority to adopt; until it is adopted, C194 has no
severity boundary and cannot be closed on severity grounds.

| Severity | Production | Compliance |
|---|---|---|
| **P0** | Cross-cell or cross-tenant data reachable; data loss beyond the declared RPO; no restore path; an alert path that pages nobody. | Personal data processed with no lawful basis; erasure or export that reports success while leaving data; an unapproved cross-border transfer. |
| **P1** | SLO or 40% headroom unmet at declared load; replica lag or fallback unproven; PITR configured but never restored; a kill switch or canary abort that does not abort. | Retention or legal-hold not enforced; break-glass access without dual control or audit; a subprocessor in use without an approved decision record. |
| P2 and below | Eligible to become an accepted residual risk **only** with a named owner and a dated review, recorded in the release-authority record. | Same. |

## 2.5 The state at this commit

Measured twice, nine minutes apart, at the same commits — the evidence tree is being written by
concurrent agents, so both readings are recorded rather than the more convenient one.

```
$ pnpm -C streamlineos-backend ops:evidence:check            # 2026-09-03 16:23 UTC
Error: no evidence manifests found under
  architecture-refactor/final-refactor/evidence/42-production-ops;
  deployed evidence has not been collected
exit 1
```

```
$ pnpm -C streamlineos-backend ops:evidence:check            # 2026-09-03 16:35 UTC
PRODUCTION OPS EVIDENCE GATE FAILED
  10 manifest candidates found, 10 rejected as malformed, 0 PASS
  - missing passing deployed evidence for RB-01 … RB-08   (all eight)
exit 1
```

Between the two readings, tickets 32–35 landed local drill output under `RB-01/` … `RB-10/`,
`edge-security/`, `deploy-safety/`, `provider-drills/`, `break-glass/` and `observability-c173/`.
Ten of those files are `.json`, so the gate now reads them — and rejects every one. Each rejection
lists the same reasons, and every reason is a property of a *deployed* run that a local run
cannot have: `evidenceKind must be deployed-operator-attested`, `evidence must declare live=true
and synthetic must not be true`, `environment.target must be a non-local https endpoint`,
`release.topologySha256 must be SHA-256`, **`named operator is required`**.

```
$ pnpm -C streamlineos-backend ops:evidence:self-test
{"selfTest":true,"pass":true,"checks":{"validDeployedShapePasses":true,
 "alteredArtifactBlocked":true,"selfTestClaimBlocked":true}}
exit 0
```

The results belong together. The gate **bites** — its self-test proves it accepts a valid deployed
shape, blocks an altered artifact, and blocks a self-test masquerading as evidence — and against
the real tree it reports **0 of 8 runbooks passing**, in both readings. Accumulating local drill
output does not move that number, and it is not supposed to.

**So the production/compliance P0/P1 register is empty, and it is empty for the wrong reason.**
Not because the deployed drills ran and found nothing, but because none of them has run. An empty
register is not a clear register. PRD-C194 is therefore **open, and unmeasurable**, until RB-01
through RB-08 have been executed against a real environment.

That distinction is the single most important sentence in this file. A reader who sees "0
findings" and concludes "C194 is satisfied" has inverted it.
