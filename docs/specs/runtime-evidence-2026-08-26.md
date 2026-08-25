# c1–c9 runtime evidence — 2026-08-26

These values were captured from the configured Neon database using the
non-bypass `streamline_app` role. The report commands use the minimal
`ArchitectureEvidenceModule`, so unrelated product integrations do not affect
the evidence run.

## c6 article migration report

Command: `pnpm report:kb-article-migration`

```json
{"organizations":38,"totalArticles":1,"alreadyMigrated":0,"willMigrate":1,"failedOrganizations":0,"retirementReady":false}
```

The report is complete and failure-free, but the conversion backlog is not
empty. The conversion/intake PRD and code must therefore remain.

## c9 outbox report

Command: `pnpm report:outbox-events`

```json
{"organizations":38,"succeeded":38,"failed":0,"totalRows":31,"pending":6,"inFlight":0,"dead":0,"oldestEventAt":"2026-08-18 11:09:33.990946","distinctEventTypesAcrossTenants":21}
```

The report covers every active organization with no sweep failures. There are
six pending rows and no dead rows; partitioning remains threshold-deferred and
external provider deduplication remains an operational requirement.

