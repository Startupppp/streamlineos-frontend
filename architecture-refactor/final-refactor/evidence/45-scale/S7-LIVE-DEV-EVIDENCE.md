# Session 7 live/dev evidence

Generated: 2026-09-03T10:53:17.153Z

This report contains command output and redacted capability status. It does not run a destructive recovery drill, restore, migration, or provisioning operation.

## Credential capability

Present: DATABASE_URL, ABLY_API_KEY, RESEND_API_KEY
Missing: APP_DATABASE_URL, DIRECT_DATABASE_URL, NEON_API_KEY, NEON_PROJECT_ID, DB_REPLICA_URL, CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID, NEON_COMPUTE_RATE_USD_PER_HOUR, NEON_STORAGE_RATE_USD_PER_GIB_MONTH, NEON_TRANSFER_RATE_USD_PER_GIB, CLOUDFLARE_R2_CLASS_A_RATE_USD_PER_MILLION, CLOUDFLARE_R2_CLASS_B_RATE_USD_PER_MILLION, CLOUDFLARE_R2_STORAGE_RATE_USD_PER_GB_MONTH, RESEND_RATE_USD_PER_EMAIL

## Existing recovery evidence

`backend/.recovery-drill-results.json`: `{"failure_class":"CELL_DB_FAILURE","rpo_seconds":0,"rto_seconds":4,"rpo_target_seconds":300,"rto_target_seconds":3600,"rpo_operational_seconds":21600,"rpo_basis":"rpo_seconds is the drill's best case — the backup precedes the disaster by seconds, so it proves the restore loses nothing. rpo_operational_seconds is the backup interval, which is what an operator would actually lose, and is the figure the objective is judged on.","rpo_met":false,"rpo_restore_lossless":true,"rto_met":true,"recovered_cell_healthy":true,"unhealthy_after_recovery":[],"phases":{"backup_ms":102479,"bootstrap_ms":0,"restore_ms":2837,"verify_ms":1402},"integrity":{"ok":true,"tables":3,"rows":66,"failures":[]},"timestamps":{"drill_started_iso":"2026-09-01T16:01:38.867Z","backup_completed_iso":"2026-09-01T16:03:21.347Z","disaster_declared_iso":"2026-09-01T16:03:21.347Z","cell_verified_iso":"2026-09-01T16:03:25.587Z"},"control_plane_during_recovery":{"placement_cache_served_known_org":true,"unknown_org_refused_503":true,"cache_ttl_ms":600000,"fence_lease_ms":86400000,"ordering_invariant":"signed-cache TTL (10m) < fence lease (24h): a cached placement cannot outlive the write fence it implies; 11 unit tests in placement-degraded-control-plane.spec.ts prove this","note":"Exercised during actual cell-2 outage window. Control-plane DB (neondb) was never touched; placement lookups remained available throughout."},"notes":["REGIONAL_DISASTER RPO target (<= 5m): UNVERIFIED. Neon PITR provides this guarantee at the control-plane layer, but no NEON_API_KEY and no scripted branch-restore exercise exist. Gap recorded in CELL-RUNBOOK.md.","CELL_DB_FAILURE RPO (0s): time between backup completion and disaster declaration in this drill. Real-world RPO = backup run frequency; to meet the 5-minute target, schedule backups every <= 5 minutes.","CELL_DB_FAILURE RTO (4s vs 3600s target).","cell2 is also used by migration-chain work. If the bootstrap was disturbed, re-run the drill and report the clean run.","No physical read replica is provisioned. Replica routing seam is built and tested at pool-selection level only. Lag-simulation tests are skipped pending Neon replica provisioning."],"disturbed":false,"disturbed_reason":null}`

The stored recovery result is the latest non-destructive evidence available in this run. A fresh cell recovery exercise remains operator-controlled because it drops and rebuilds a database cell.

## Existing workload and trend evidence

No load result artifact found.
No capacity history artifact found.
No cost history artifact found.

## Reproducible checks

### Capacity snapshot

Exit code: 1

```text
◇ injected env (0) from .env // tip: ⌘ suppress logs { quiet: true }
APP_DATABASE_URL is required (the non-BYPASSRLS app role).
```

### Migration-chain verification

Exit code: 0

```text
RAN   (f) applied watermark — max created_at=1803000010085
PASS  migration chain verified — no issues found
```

### Recovery tooling self-test

Exit code: 0

```text
[0.0s] self-test: verifying drill script structure and JSON output shape
SELF-TEST PASS: drill script structure and result shape are correct
```

### Capacity tooling self-test

Exit code: 1

```text
◇ injected env (0) from .env // tip: ⌘ suppress logs { quiet: true }
APP_DATABASE_URL is required (the non-BYPASSRLS app role).
```

### Unit-cost tooling self-test

Exit code: 1

```text
◇ injected env (0) from .env // tip: ◈ secrets for agents [www.dotenvx.com]
APP_DATABASE_URL is required.
```

### Load-driver tooling self-test

Exit code: 0

```text
PASS  percentile interpolates between neighbouring samples
PASS  percentile of an empty set is null, not zero
PASS  summarise reports every percentile the report prints
PASS  summarise sorts before computing, so sample order cannot change the answer
PASS  summarise drops non-finite samples rather than poisoning the percentiles
PASS  an empty summary reports null percentiles, never 0ms
PASS  an objective with no samples is NOT_DRIVEN, not MET
PASS  a measurement over target is BREACHED
PASS  a measurement at exactly the target is MET, not BREACHED
PASS  achievedRate converts a count and a window into requests per second
PASS  achievedRate refuses to divide by a zero-length window
PASS  every PRD latency objective is either driven or has a written reason
PASS  every special-cased objective is actually handled by the runner
PASS  every driven workload names the percentile it is judged on
PASS  every not-driven reason says what would be needed, not just that it was skipped

All load-driver tests passed.
```

## Operator-blocked items

- Regional RPO/RTO branch-restore evidence requires Neon PITR access, a Neon API key, and an approved recovery window.
- Physical replica lag evidence requires an independently provisioned read replica and DB_REPLICA_URL.
- Dollar unit-cost evidence requires invoice-derived vendor rate variables and approval from the named cost owner.
- Capacity and cost trend forecasts require at least three samples separated by 24 hours; this collector cannot manufacture those samples.
- A colocated headroom run requires the approved cell deployment and load-runner placement; the current public-internet sample is not a colocated claim.
