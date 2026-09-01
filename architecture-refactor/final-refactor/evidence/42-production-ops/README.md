# Production-operations deployed evidence gate

This directory is the only accepted repository-side root for S04 production-operations evidence. It starts empty on purpose: a local guard self-test, a dry run, a fixture, or a developer laptop result is not deployed proof.

`pnpm -C backend ops:evidence:check` fails until every RB-01 through RB-08 has a captured bundle. That failure is the intended current state; it must not be waived by committing generated example output.

## Capture a real run

1. Run the relevant RB command against the intended deployed cell. Redact credentials and personal data before saving its output below this directory. Do not edit the saved output after capture.
2. Create a `*.input.json` metadata file alongside the redacted artifact. It is deliberately ignored by the verifier, so it cannot be mistaken for a captured result.
3. Run `pnpm -C backend ops:evidence:capture -- --metadata=RB-01/<run>.input.json`. The command hashes the artifacts and writes a non-`.input.json` manifest. It refuses local/test/mock environments, `--self-test`, `--dry-run`, non-zero exits, missing required RB assertions, paths outside this directory, symlinks, and likely unredacted credentials.
4. Run `pnpm -C backend ops:evidence:check`. It re-hashes every captured artifact and requires one passing bundle for every RB-01 through RB-08.

The gate establishes traceability and tamper detection. It does not itself establish facts about a cloud account; that remains the named operator's attestation, supported by the linked provider/API/command artifacts.

## Metadata contract

The input must have this shape; `artifacts` are paths relative to this directory. Replace all example values with observed facts. Do not commit this example as JSON.

```json
{
  "runbook": "RB-01",
  "evidenceKind": "deployed-operator-attested",
  "live": true,
  "environment": {
    "name": "staging",
    "region": "us-east-1",
    "cell": "cell-us-01",
    "target": "https://staging.example.com"
  },
  "release": {
    "sha": "actual deployed git SHA",
    "topologySha256": "sha256 of the deployed topology export"
  },
  "dataset": {
    "shape": "observed sanitized production-shaped dataset description",
    "activeOrganizations": 20000
  },
  "operator": {
    "name": "named operator",
    "approvedAt": "2026-09-01T00:00:00.000Z"
  },
  "execution": {
    "command": "the exact non-dry-run command actually executed",
    "exitCode": 0,
    "startedAt": "2026-09-01T00:00:00.000Z",
    "finishedAt": "2026-09-01T00:10:00.000Z"
  },
  "artifacts": [{ "path": "RB-01/actual-redacted-output.txt" }],
  "assertions": [
    {
      "id": "independent-resource-identity",
      "result": "pass",
      "artifact": "RB-01/actual-redacted-output.txt",
      "observedAt": "2026-09-01T00:10:00.000Z"
    },
    {
      "id": "cross-cell-credential-boundary",
      "result": "pass",
      "artifact": "RB-01/actual-redacted-output.txt",
      "observedAt": "2026-09-01T00:10:00.000Z"
    }
  ]
}
```

Required assertion IDs are enforced by the script and correspond to each runbook's production-only conditions:

| Runbook | Required assertions |
| --- | --- |
| RB-01 | `independent-resource-identity`, `cross-cell-credential-boundary` |
| RB-02 | `pitr-retention`, `restore-rpo` |
| RB-03 | `physical-replica`, `measured-replica-lag`, `primary-fallback` |
| RB-04 | `cell-recovery-rto-rpo`, `regional-recovery`, `organization-relocation` |
| RB-05 | `production-shaped-load`, `tenant-isolation-under-load`, `headroom-40-percent` |
| RB-06 | `live-alert-delivery`, `human-acknowledgement`, `release-observability` |
| RB-07 | `invoice-derived-cell-cost`, `seven-day-cost-trend`, `operator-capacity-approval` |
| RB-08 | `separate-resource-accounts`, `per-cell-credentials`, `separate-worker-deployment` |

Run `pnpm -C backend ops:evidence:self-test` to verify only the gate logic. Its temporary data is deleted and can never satisfy `ops:evidence:check`.
