# c1–c9 runtime evidence — 2026-08-26

These values were captured from the configured Neon database using the
non-bypass `streamline_app` role. The report commands use the minimal
`ArchitectureEvidenceModule`, so unrelated product integrations do not affect
the evidence run.

## c1/c2 tenant-safe read-only report

Command: `node --env-file=.env -r ts-node/register src/scripts/report-kb-calendar-runtime-evidence.ts`

```json
{"organizations":38,"succeeded":38,"failed":0,"readOnly":true,"c1":{"embeddingProviderConfigured":true,"totalPages":1,"eligiblePages":1,"indexCandidatePages":1,"contentlessEligiblePages":0,"indexedEligiblePages":0,"eligibleWithoutChunk":1,"chunkAclMismatches":0,"orphanChunks":0},"c2":{"preferenceRows":0,"preferenceScopes":0,"disabledRows":0,"enabledRows":0,"unknownSourceKeys":0,"invalidOwnerRows":0}}
```

The sweep is tenant-scoped, read-only, and failure-free. Embeddings are
configured, and c1 still has one text-bearing index candidate without a
`page_body` chunk; the guarded backfill and seeded end-to-end parity proof
remain open. c2 has no persisted preference rows and no integrity violations;
this verifies database safety, not live HTTP controller behavior.

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
{"organizations":38,"succeeded":38,"failed":0,"totalRows":31,"pending":6,"inFlight":0,"dead":0,"oldestPendingAt":"2026-08-25 12:59:23.680386","oldestEventAt":"2026-08-18 11:09:33.990946","distinctEventTypesAcrossTenants":21}
```

The report covers every active organization with no sweep failures. There are
six pending rows and no dead rows; partitioning remains threshold-deferred and
external provider deduplication remains an operational requirement. The new
external-effect ledger is committed in code, but migration `0474` has not been
deployed, so no live ledger counts are claimed.
