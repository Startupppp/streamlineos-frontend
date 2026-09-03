# Manifest intake — how RB-01..RB-08 evidence becomes a PRD-C175 manifest

**Written: 2026-09-03, for v2 ticket 34 / PRD-C175.** Companion to `README.md`, which stays the
normative description of the format. This file exists because the format was already complete and
the gap was elsewhere: nobody had written down how the evidence being deposited in this tree relates
to the manifest, or which parts of PRD-C175 are reachable without a deployed cell.

## There is exactly one manifest format, and it already exists

PRD-C175 asks for manifests carrying *identity, topology, SHA, operator, timestamps, exit code and
hashes*. All seven are already fields of `streamlineos.production-ops-evidence/v1`, defined and
enforced by `backend/src/scripts/production-ops-evidence.mjs`:

| PRD-C175 term | Manifest field | Enforced by |
|---|---|---|
| identity | `environment.name` / `.region` / `.cell` / `.target` | must be non-local, `https://`, and not match `local\|dev\|test\|ci\|mock\|fake` |
| topology | `release.topologySha256` | must be 64 hex characters |
| SHA | `release.sha` | must match `^[0-9a-f]{7,64}$` |
| operator | `operator.name` + `operator.approvedAt` | name must not be empty, `unknown` or `n/a`; ISO timestamp |
| timestamps | `execution.startedAt` / `.finishedAt`, `assertions[].observedAt`, `capturedAt` | ISO, and `finishedAt >= startedAt` |
| exit code | `execution.exitCode` | must be exactly `0` |
| hashes | `artifacts[].sha256` + `.bytes` | recomputed and compared on every `ops:evidence:check` |

**Do not invent a second format.** Anything that is not this format is not evidence for PRD-C175.

Measured 2026-09-03: `pnpm -C backend ops:evidence:self-test` exits 0 with
`{"pass":true,"checks":{"validDeployedShapePasses":true,"alteredArtifactBlocked":true,"selfTestClaimBlocked":true}}`.
The format and its tamper detection work. What is missing is deployed runs, not machinery.

## Current state: the gate fails, and that is correct

`pnpm -C backend ops:evidence:check` exits 1 with `missing passing deployed evidence` for all eight
runbooks. Per `README.md` this is the intended state and must not be waived.

## Pre-flight indexer

`manifest-readiness.mjs` (this directory) indexes what has been deposited, hashes it, and reports
which PRD-C175 fields are reachable. It never writes a manifest and cannot make the gate pass.

```
node architecture-refactor/final-refactor/evidence/42-production-ops/manifest-readiness.mjs
node architecture-refactor/final-refactor/evidence/42-production-ops/manifest-readiness.mjs --emit-skeleton RB-01
```

`--emit-skeleton` writes `RB-0N/operator-skeleton.input.json` with the artifact paths already present
pre-filled and every deployed-only or human-only field set to `null`. `null` is deliberate: the real
gate then rejects the skeleton field by field until a named operator fills it in. Verified
2026-09-03 — capturing an unfilled skeleton fails with `Error: artifact path is missing`.

## Two traps this tree has already fallen into

**1. A bare `.json` file anywhere under this root is parsed as a manifest and fails the gate.**
`collectJson()` recurses the whole tree and treats every `*.json` that is not `*.input.json` as a
manifest. It is not a filter on location or naming intent — a cost report, an API capture or a
webhook dump with a `.json` extension becomes a *failing manifest*. Each produces its own
`wrong or missing evidence format; unsupported runbook undefined; …` failure line.

This is happening now, and the count is growing as this wave writes. Measured 2026-09-03 it went
from six to seven within one session:

```
RB-04-recovery-drill/recovery-drill-dry-run.json
RB-06-live-alert-delivery/raw/08-drill-alert-ack-state.json
RB-06-live-alert-delivery/raw/09-GATE-PROBE-synthetic-NOT-A-HUMAN-ACK.json
RB-06-live-alert-delivery/raw/10-GATE-PROBE-synthetic-STALE-NOT-A-HUMAN-ACK.json
edge-security/commands/backend-pnpm-audit-all-severities.json
edge-security/commands/frontend-pnpm-audit-all-severities.json
edge-security/commands/frontend-pnpm-audit-prod.json
```

These belong to other authors and have not been touched. Renaming each to `.json.txt` costs
nothing and removes seven spurious failures from the gate's output — the gate currently fails for
the right reason (no deployed evidence) buried under seven wrong ones.

> **Rule for everyone writing into this tree: save structured output as `.txt`, `.jsonl`, or
> `.json.txt` — never a bare `.json`.** Only a real captured manifest, or an operator's
> `*.input.json`, may carry that extension.

**2. Local drill output can never be captured as deployed evidence.** Capture refuses any artifact
whose *text* matches `--self-test|--dry-run|mock|fixture|fake|simulat(e|ed|ion)`. Most of what is in
this tree today is self-test output and is therefore inadmissible by design. That is not a defect in
the evidence — a passing self-test is real proof that a drill can detect a failure — it is a
statement that a self-test is not proof of a deployed cell. Discover this before a deployed run, not
during one.

## Runbook index

As measured 2026-09-03 by `manifest-readiness.mjs`; re-run it for current numbers. "Admissible"
means the file would survive capture's wording and credential screens, *not* that it is deployed
evidence.

| Runbook | Directory | Files | Admissible | Manifest present |
|---|---|---|---|---|
| RB-01 | *(none)* | 0 | 0 | no |
| RB-02 | `RB-02-pitr-backup/` | 2 | 0 | no |
| RB-03 | `RB-03-read-replica/` | 1 | 0 | no |
| RB-04 | `RB-04-recovery-drill/` | 2 | 0 | no |
| RB-05 | `RB-05-production-load/` | 5 | 5 | no |
| RB-06 | `RB-06-live-alert-delivery/` | 10 | 9 | no |
| RB-07 | `RB-07-per-cell-cost/` | 7 | 7 | no |
| RB-08 | *(none)* | 0 | 0 | no |

Directories not attributable to RB-01..RB-08 — `RB-10-privacy-compliance/`, `deploy-safety/`,
`edge-security/`, `provider-drills/`, `break-glass/` — are indexed separately. They are evidence for
other criteria; the indexer matches a directory to a runbook only when its top-level name begins
with that runbook id, so an RB-0N bundle must live in a directory named for it.

## What is blocked, and on what

Per runbook, and for all eight:

- **Blocked on a deployed environment.** `environment.name/region/cell/target`, `release.sha`,
  `release.topologySha256`, `dataset.activeOrganizations`, and the `execution` timestamps and exit
  code of a command run *against that environment*. There is no deployed StreamlineOS environment on
  this machine; the backend's configured `DATABASE_URL` is a shared Neon branch, not a cell.
- **Blocked on a named human.** `operator.name` and `operator.approvedAt` are an attestation. No
  agent may supply them. RB-06's `human-acknowledgement` and RB-07's `operator-capacity-approval`
  are, by their own assertion ids, human acts.

Content hashes are the one PRD-C175 element fully computable here, and `manifest-readiness.mjs`
computes them.

## Operator procedure

1. Run the RB command against the intended deployed cell. Redact before saving.
2. Save the redacted output under `RB-0N/`, not as a bare `.json`.
3. `node …/manifest-readiness.mjs --emit-skeleton RB-0N`, then replace every `null` with an observed
   fact. Do not remove a field to make the gate quieter.
4. `pnpm -C backend ops:evidence:capture -- --metadata=RB-0N/<name>.input.json`.
5. `pnpm -C backend ops:evidence:check`.

Step 3 is where a human signs. If you cannot fill a field from something you observed, the correct
outcome is a failing gate, not a filled field.
